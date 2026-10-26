"""API кабінету мами: /api/mp/* (через сайт: svitmozhlyvostei.com/api/mp/*).

Кожен запит до особистих даних фільтрується за user_id з сесії — чужого запису не отримати навіть за його id.
Тексти помилок — українською; інтерфейс сайту показує їх як є.
"""
import json
import re
import secrets
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field
from pymongo import ReturnDocument

from .host import db

from . import ai, mail
from .auth import (current_user, end_all_sessions, end_session, hash_password, ip_of, key_hash, limit, norm_email,
                   check_password, require_csrf, start_session, verify_password)
from .content import (AI_INTENTS, CATEGORIES, CHANNELS, EXERCISES, EXERCISE_SLUGS, MOOD_KEYS, MOODS,
                      REFERRAL_CATEGORIES, REFERRAL_CATEGORY_KEYS, REFERRAL_STATUSES)
from .store import (AI_CONSENT_VERSION, AI_FEEDBACK, CARDS, CHECKINS, CONSENTS, EVENTS, EXERCISES as EX_COLL,
                    PRIVACY_VERSION, REFERRALS, RESETS, RESOURCES, SESSIONS, SETTINGS, STEPS, USERS, audit, count,
                    get_settings, new_id, now)

router = APIRouter(prefix="/mp", dependencies=[Depends(require_csrf)])
KYIV = ZoneInfo("Europe/Kyiv")
SITE = "https://svitmozhlyvostei.com"


def kyiv_today() -> str:
    return datetime.now(KYIV).strftime("%Y-%m-%d")


def lang_of(v: Optional[str]) -> str:
    return "en" if v == "en" else "uk"


def public_user(u: Dict[str, Any]) -> Dict[str, Any]:
    c = u.get("consents") or {}
    ai_c = c.get("ai") or {}
    return {"name": u.get("name", ""), "email": u.get("email", ""), "lang": u.get("lang", "uk"),
            "created_at": u.get("created_at"), "privacy_version": (c.get("privacy") or {}).get("version"),
            "needs_privacy": (c.get("privacy") or {}).get("version") != PRIVACY_VERSION,
            "ai_consent": bool(ai_c.get("at")) and not ai_c.get("revoked_at")}


async def log_consent(user_id: str, kind: str, given: bool, version: str) -> None:
    await db[CONSENTS].insert_one({"id": new_id(), "user_id": user_id, "type": kind, "given": given,
                                   "version": version, "at": now()})


# ───────────── відкрите: налаштування для екрана, ресурси, зведені показники ─────────────

@router.get("/config")
async def config():
    s = await get_settings()
    published = await db[RESOURCES].count_documents({"status": "published"})
    return {"real_data": s["real_data"], "registration_open": s["registration_open"],
            "ai_available": bool(s["ai_enabled"]) and published >= ai.MIN_RESOURCES,
            "sla_days": s["sla_days"], "crisis_lines": s["crisis_lines"], "operator": s["operator"],
            "privacy_email": s["privacy_email"], "privacy_version": PRIVACY_VERSION, "ai_consent_version": AI_CONSENT_VERSION,
            "moods": MOODS, "exercises": EXERCISES, "categories": CATEGORIES, "referral_categories": REFERRAL_CATEGORIES,
            "referral_statuses": REFERRAL_STATUSES,
            "ai_intents": [{"key": k, "uk": v["uk"], "en": v["en"]} for k, v in AI_INTENTS.items()]}


@router.get("/resources")
async def resources():
    rows = await db[RESOURCES].find({"status": "published"}, {"_id": 0, "status": 0, "created_at": 0}).sort("order", 1).to_list(200)
    return rows


@router.get("/impact")
async def impact():
    """Публічні лічильники — лише від порогу учасниць (за замовчуванням 10), без людей і мікрогруп (ТЗ F-10)."""
    s = await get_settings()
    participants = await db[USERS].count_documents({"consents.privacy.at": {"$ne": None}})
    if participants < int(s.get("impact_threshold") or 10):
        return {"hidden": True, "threshold": int(s.get("impact_threshold") or 10)}
    totals: Dict[str, int] = {}
    async for e in db[EVENTS].find({}, {"_id": 0, "type": 1, "count": 1}):
        totals[e["type"]] = totals.get(e["type"], 0) + int(e.get("count") or 0)
    keys = ["checkin", "exercise_done", "step_created", "step_done", "referral", "ai_suggest"]
    return {"hidden": False, "participants": participants, "totals": {k: totals.get(k, 0) for k in keys},
            "since": "2026-10-26", "updated_at": now()}


# ───────────── реєстрація, вхід, пароль ─────────────

class RegisterIn(BaseModel):
    email: str = Field(max_length=254)
    password: str = Field(max_length=200)
    name: str = Field(default="", max_length=60)
    lang: str = "uk"
    adult: bool = False
    privacy: bool = False
    ai: bool = False


@router.post("/register")
async def register(body: RegisterIn, request: Request, response: Response):
    s = await get_settings()
    if not s["registration_open"]:
        raise HTTPException(403, "Реєстрацію тимчасово закрито")
    if not body.adult:
        raise HTTPException(422, "Сервіс лише для повнолітніх (18+)")
    if not body.privacy:
        raise HTTPException(422, "Без згоди з умовами користування обліковий запис не створити")
    await limit(f"reg:{ip_of(request)}", 5, 3600, "Забагато реєстрацій з цієї адреси. Спробуйте за годину")
    email = norm_email(body.email)
    check_password(body.password)
    if await db[USERS].find_one({"email": email}, {"_id": 1}):
        raise HTTPException(409, "Обліковий запис з цією поштою вже є. Увійдіть або відновіть пароль")
    uid = new_id()
    at = now()
    consents: Dict[str, Any] = {"privacy": {"version": PRIVACY_VERSION, "at": at}, "adult": {"at": at}}
    if body.ai:
        consents["ai"] = {"version": AI_CONSENT_VERSION, "at": at, "revoked_at": None}
    name = re.sub(r"\s+", " ", body.name).strip()[:60]
    await db[USERS].insert_one({"id": uid, "email": email, "password_hash": await hash_password(body.password),
                                "name": name, "lang": lang_of(body.lang), "consents": consents, "created_at": at,
                                "last_login": at, "fails": 0})
    await log_consent(uid, "privacy", True, PRIVACY_VERSION)
    await log_consent(uid, "adult", True, PRIVACY_VERSION)
    if body.ai:
        await log_consent(uid, "ai", True, AI_CONSENT_VERSION)
    await start_session(response, uid)
    await count("signup")
    await audit(uid, "register", "user", uid)
    u = await db[USERS].find_one({"id": uid}, {"_id": 0, "password_hash": 0})
    return public_user(u)


class LoginIn(BaseModel):
    email: str = Field(max_length=254)
    password: str = Field(max_length=200)


@router.post("/login")
async def login(body: LoginIn, request: Request, response: Response):
    ip = ip_of(request)
    await limit(f"login-ip:{ip}", 30, 900, "Забагато спроб входу. Спробуйте за 15 хвилин")
    email = (body.email or "").strip().lower()
    await limit(f"login:{key_hash(email)}", 10, 900, "Забагато спроб входу. Спробуйте за 15 хвилин або відновіть пароль")
    u = await db[USERS].find_one({"email": email}, {"_id": 0})
    if not await verify_password(body.password or "", (u or {}).get("password_hash")):
        raise HTTPException(401, "Невірна пошта або пароль")
    await db[USERS].update_one({"id": u["id"]}, {"$set": {"last_login": now()}})
    await start_session(response, u["id"])
    await count("login")
    u.pop("password_hash", None)
    return public_user(u)


@router.post("/logout")
async def logout(request: Request, response: Response):
    await end_session(request, response)
    return {"ok": True}


class ForgotIn(BaseModel):
    email: str = Field(max_length=254)
    lang: str = "uk"


@router.post("/password/forgot")
async def forgot(body: ForgotIn, request: Request):
    await limit(f"forgot:{ip_of(request)}", 5, 3600, "Забагато запитів. Спробуйте за годину")
    email = (body.email or "").strip().lower()
    u = await db[USERS].find_one({"email": email}, {"_id": 0, "id": 1, "lang": 1})
    if u:
        token = secrets.token_urlsafe(32)
        await db[RESETS].insert_one({"key": key_hash(token), "user_id": u["id"], "expires_at": now() + timedelta(hours=1)})
        en = lang_of(body.lang) == "en"
        link = f"{SITE}{'/en' if en else ''}/mamyn-prostir/start?reset={token}"
        await mail.send(email, "Mamyn prostir: new password" if en else "Мамин простір: новий пароль",
                        ["Someone asked to reset the password for “Mamyn prostir”. If it was you, open the link within an hour."
                         if en else "Хтось попросив змінити пароль у «Маминому просторі». Якщо це ви — відкрийте посилання протягом години.",
                         "If it wasn't you, just ignore this email." if en else "Якщо це були не ви — просто проігноруйте лист."],
                        link, "Set a new password" if en else "Задати новий пароль")
    # однакова відповідь — щоб за нею не можна було перевірити, чи є така пошта
    return {"ok": True}


class ResetIn(BaseModel):
    token: str = Field(max_length=200)
    password: str = Field(max_length=200)


@router.post("/password/reset")
async def reset(body: ResetIn, request: Request, response: Response):
    await limit(f"reset:{ip_of(request)}", 10, 3600, "Забагато спроб. Спробуйте за годину")
    check_password(body.password)
    doc = await db[RESETS].find_one_and_delete({"key": key_hash(body.token or "")})
    if not doc or doc["expires_at"].replace(tzinfo=now().tzinfo) < now():
        raise HTTPException(400, "Посилання застаріло. Попросіть нове")
    await db[USERS].update_one({"id": doc["user_id"]}, {"$set": {"password_hash": await hash_password(body.password)}})
    await end_all_sessions(doc["user_id"])
    await start_session(response, doc["user_id"])
    await audit(doc["user_id"], "password_reset", "user", doc["user_id"])
    return {"ok": True}


# ───────────── профіль і згоди ─────────────

@router.get("/me")
async def me(request: Request):
    return public_user(await current_user(request))


class MeIn(BaseModel):
    name: Optional[str] = Field(default=None, max_length=60)
    lang: Optional[str] = None


@router.patch("/me")
async def update_me(body: MeIn, request: Request):
    u = await current_user(request)
    upd: Dict[str, Any] = {}
    if body.name is not None:
        upd["name"] = re.sub(r"\s+", " ", body.name).strip()[:60]
    if body.lang is not None:
        upd["lang"] = lang_of(body.lang)
    if upd:
        await db[USERS].update_one({"id": u["id"]}, {"$set": upd})
    return public_user({**u, **upd})


class ConsentIn(BaseModel):
    privacy: Optional[bool] = None
    ai: Optional[bool] = None


@router.post("/consents")
async def consents(body: ConsentIn, request: Request):
    u = await current_user(request)
    upd: Dict[str, Any] = {}
    if body.privacy:
        upd["consents.privacy"] = {"version": PRIVACY_VERSION, "at": now()}
        await log_consent(u["id"], "privacy", True, PRIVACY_VERSION)
    if body.ai is not None:
        upd["consents.ai"] = ({"version": AI_CONSENT_VERSION, "at": now(), "revoked_at": None} if body.ai
                              else {**((u.get("consents") or {}).get("ai") or {}), "revoked_at": now()})
        await log_consent(u["id"], "ai", bool(body.ai), AI_CONSENT_VERSION)
    if upd:
        await db[USERS].update_one({"id": u["id"]}, {"$set": upd})
    return public_user(await current_user(request))


async def member(request: Request) -> Dict[str, Any]:
    """Користувачка з чинною згодою на умови (інакше особисті розділи закриті)."""
    u = await current_user(request)
    if ((u.get("consents") or {}).get("privacy") or {}).get("version") != PRIVACY_VERSION:
        raise HTTPException(428, "Підтвердьте оновлені умови користування")
    return u


# ───────────── щоденник стану ─────────────

@router.get("/checkins")
async def list_checkins(request: Request):
    u = await member(request)
    return await db[CHECKINS].find({"user_id": u["id"]}, {"_id": 0, "user_id": 0}).sort("day", -1).to_list(90)


class CheckinIn(BaseModel):
    mood: str
    note: str = Field(default="", max_length=500)
    day: Optional[str] = None


@router.put("/checkins")
async def save_checkin(body: CheckinIn, request: Request):
    u = await member(request)
    if body.mood not in MOOD_KEYS:
        raise HTTPException(422, "Оберіть стан зі списку")
    day = body.day or kyiv_today()
    try:
        d = datetime.strptime(day, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(422, "Невірна дата")
    today = datetime.now(KYIV).date()
    if d > today or (today - d).days > 7:
        raise HTTPException(422, "Відмітку можна поставити чи змінити за останні 7 днів")
    res = await db[CHECKINS].update_one({"user_id": u["id"], "day": day},
                                        {"$set": {"mood": body.mood, "note": body.note.strip()[:500], "updated_at": now()},
                                         "$setOnInsert": {"id": new_id(), "created_at": now()}}, upsert=True)
    if res.upserted_id is not None:
        await count("checkin")
    return {"ok": True, "day": day}


# ───────────── вправи й приватні картки ─────────────

@router.get("/exercises/done")
async def exercises_done(request: Request):
    u = await member(request)
    out: Dict[str, int] = {}
    async for e in db[EX_COLL].find({"user_id": u["id"]}, {"_id": 0, "slug": 1}):
        out[e["slug"]] = out.get(e["slug"], 0) + 1
    return out


class ExerciseIn(BaseModel):
    slug: str


@router.post("/exercise-sessions")
async def exercise_done(body: ExerciseIn, request: Request):
    u = await member(request)
    if body.slug not in EXERCISE_SLUGS:
        raise HTTPException(422, "Немає такої вправи")
    # лише факт завершення — вибрані відповіді не зберігаються (ТЗ 5.2)
    await db[EX_COLL].insert_one({"id": new_id(), "user_id": u["id"], "slug": body.slug, "completed_at": now()})
    await count("exercise_done")
    return {"ok": True}


CARD_KINDS = {"support_map", "resource_list", "hard_day"}


@router.get("/cards")
async def cards(request: Request):
    u = await member(request)
    return await db[CARDS].find({"user_id": u["id"]}, {"_id": 0, "user_id": 0}).to_list(10)


class CardIn(BaseModel):
    items: List[str] = Field(default_factory=list, max_length=10)


@router.put("/cards/{kind}")
async def save_card(kind: str, body: CardIn, request: Request):
    u = await member(request)
    if kind not in CARD_KINDS:
        raise HTTPException(404, "Немає такої картки")
    items = [str(x).strip()[:160] for x in body.items if str(x).strip()][:10]
    await db[CARDS].update_one({"user_id": u["id"], "kind": kind}, {"$set": {"items": items, "updated_at": now()}}, upsert=True)
    return {"ok": True}


@router.delete("/cards/{kind}")
async def delete_card(kind: str, request: Request):
    u = await member(request)
    await db[CARDS].delete_one({"user_id": u["id"], "kind": kind})
    return {"ok": True}


# ───────────── мої кроки ─────────────

STEP_STATUSES = {"planned", "done", "cancelled"}


@router.get("/steps")
async def list_steps(request: Request):
    u = await member(request)
    return await db[STEPS].find({"user_id": u["id"]}, {"_id": 0, "user_id": 0}).sort("created_at", -1).to_list(200)


class StepIn(BaseModel):
    title: str = Field(max_length=120)
    due_day: Optional[str] = None


def check_day(v: Optional[str]) -> Optional[str]:
    if not v:
        return None
    try:
        datetime.strptime(v, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(422, "Невірна дата")
    return v


@router.post("/steps")
async def add_step(body: StepIn, request: Request):
    u = await member(request)
    title = body.title.strip()
    if len(title) < 3:
        raise HTTPException(422, "Назва кроку — від 3 символів")
    if await db[STEPS].count_documents({"user_id": u["id"]}) >= 200:
        raise HTTPException(422, "Забагато кроків — видаліть завершені")
    doc = {"id": new_id(), "user_id": u["id"], "title": title, "due_day": check_day(body.due_day),
           "status": "planned", "created_at": now(), "updated_at": now()}
    await db[STEPS].insert_one(dict(doc))
    await count("step_created")
    doc.pop("user_id")
    return doc


class StepPatch(BaseModel):
    title: Optional[str] = Field(default=None, max_length=120)
    due_day: Optional[str] = None
    status: Optional[str] = None


@router.patch("/steps/{sid}")
async def patch_step(sid: str, body: StepPatch, request: Request):
    u = await member(request)
    upd: Dict[str, Any] = {"updated_at": now()}
    if body.title is not None:
        if len(body.title.strip()) < 3:
            raise HTTPException(422, "Назва кроку — від 3 символів")
        upd["title"] = body.title.strip()
    if body.due_day is not None:
        upd["due_day"] = check_day(body.due_day)
    if body.status is not None:
        if body.status not in STEP_STATUSES:
            raise HTTPException(422, "Невідомий стан")
        upd["status"] = body.status
    old = await db[STEPS].find_one_and_update({"id": sid, "user_id": u["id"]}, {"$set": upd})
    if not old:
        raise HTTPException(404, "Крок не знайдено")
    if body.status == "done" and old.get("status") != "done":
        await count("step_done")
    return {"ok": True}


@router.delete("/steps/{sid}")
async def delete_step(sid: str, request: Request):
    u = await member(request)
    res = await db[STEPS].delete_one({"id": sid, "user_id": u["id"]})
    if not res.deleted_count:
        raise HTTPException(404, "Крок не знайдено")
    return {"ok": True}


# ───────────── звернення до фахівця ─────────────

class ReferralIn(BaseModel):
    category: str
    channel: str
    contact: str = Field(max_length=150)
    preferred_time: str = Field(default="", max_length=80)
    share_contact: bool = False


def check_contact(channel: str, contact: str) -> str:
    c = contact.strip()
    if channel == "email":
        return norm_email(c)
    digits = re.sub(r"[^\d+]", "", c)
    if channel in ("phone", "viber") and not re.fullmatch(r"\+?\d{9,15}", digits):
        raise HTTPException(422, "Перевірте номер телефону")
    if channel == "telegram" and not re.fullmatch(r"@?[A-Za-z0-9_]{4,32}|\+?\d{9,15}", c):
        raise HTTPException(422, "Вкажіть нік у Telegram (@нік) або номер")
    return c


@router.post("/referrals")
async def add_referral(body: ReferralIn, request: Request):
    u = await member(request)
    if body.category not in REFERRAL_CATEGORY_KEYS:
        raise HTTPException(422, "Оберіть тему звернення")
    if body.channel not in CHANNELS:
        raise HTTPException(422, "Оберіть спосіб зв'язку")
    if not body.share_contact:
        raise HTTPException(422, "Потрібна окрема згода на використання контакту фахівцем")
    await limit(f"ref:{u['id']}", 5, 86400, "На сьогодні звернень достатньо. Фахівець відповість на попередні")
    s = await get_settings()
    # номер — атомарним лічильником: count+1 повторюється після видалень
    seq = await db[SETTINGS].find_one_and_update({"_id": "referral_seq"}, {"$inc": {"n": 1}}, upsert=True,
                                               return_document=ReturnDocument.AFTER)
    doc = {"id": new_id(), "number": seq["n"], "user_id": u["id"],
           "name": u.get("name") or "", "category": body.category, "channel": body.channel,
           "contact": check_contact(body.channel, body.contact), "preferred_time": body.preferred_time.strip()[:80],
           "contact_consent_at": now(), "status": "new", "assignee": s.get("specialist_user_id") or "",
           "history": [{"status": "new", "at": now()}], "created_at": now(), "updated_at": now()}
    await db[REFERRALS].insert_one(dict(doc))
    await count("referral")
    await audit(u["id"], "create", "referral", doc["id"])
    return {"ok": True, "id": doc["id"], "sla_days": s["sla_days"]}


@router.get("/referrals")
async def my_referrals(request: Request):
    u = await member(request)
    return await db[REFERRALS].find({"user_id": u["id"]}, {"_id": 0, "id": 1, "number": 1, "category": 1, "channel": 1,
                                                          "status": 1, "created_at": 1, "updated_at": 1,
                                                          "reply_note": 1}).sort("created_at", -1).to_list(50)


# ───────────── ШІ-навігатор ─────────────

class AiIn(BaseModel):
    intent: str
    lang: str = "uk"


@router.post("/ai/suggest")
async def ai_suggest(body: AiIn, request: Request):
    u = await member(request)
    if not ai.has_consent(u):
        raise HTTPException(403, "Для ШІ-навігатора потрібна окрема згода (Мій профіль)")
    await limit(f"ai:{u['id']}", 1, 30, "Невелика пауза між запитами — 30 секунд")
    await limit(f"ai-day:{u['id']}", 30, 86400, "На сьогодні запитів до навігатора достатньо")
    try:
        out = await ai.suggest(body.intent, lang_of(body.lang))
    except ValueError:
        raise HTTPException(422, "Оберіть один із запропонованих запитів")
    except ai.AiUnavailable:
        raise HTTPException(503, "Навігатор зараз вимкнено. Скористайтеся розділом «Ресурси для мами»")
    except Exception:  # noqa: BLE001 — збій постачальника: без тексту запиту в журналі
        raise HTTPException(503, "Навігатор тимчасово недоступний. Скористайтеся розділом «Ресурси для мами»")
    await count("ai_suggest")
    return {"answer": out["answer"], "sources": out["sources"], "warning": out["warning"], "safe": out["safe"]}


class FeedbackIn(BaseModel):
    kind: str
    intent: str = ""


@router.post("/ai/feedback")
async def ai_feedback(body: FeedbackIn, request: Request):
    await member(request)
    if body.kind not in ("useless", "unsafe"):
        raise HTTPException(422, "Невідомий сигнал")
    # без людини й тексту відповіді — лише сигнал, тема й час (ТЗ 6.2)
    await db[AI_FEEDBACK].insert_one({"id": new_id(), "kind": body.kind, "intent": body.intent if body.intent in AI_INTENTS else "",
                                      "at": now()})
    await count(f"ai_{body.kind}")
    return {"ok": True}


# ───────────── мої дані: вивантаження й видалення ─────────────

@router.get("/export")
async def export(request: Request):
    u = await current_user(request)
    uid = u["id"]
    strip = {"_id": 0, "user_id": 0}
    out = {"exported_at": now().isoformat(), "service": "Мамин простір", "operator": (await get_settings())["operator"],
           "profile": public_user(u),
           "consents": await db[CONSENTS].find({"user_id": uid}, strip).to_list(200),
           "checkins": await db[CHECKINS].find({"user_id": uid}, strip).to_list(1000),
           "steps": await db[STEPS].find({"user_id": uid}, strip).to_list(500),
           "cards": await db[CARDS].find({"user_id": uid}, strip).to_list(20),
           "exercises": await db[EX_COLL].find({"user_id": uid}, strip).to_list(1000),
           "referrals": await db[REFERRALS].find({"user_id": uid}, {**strip, "assignee": 0}).to_list(100)}
    await audit(uid, "export", "user", uid)
    body = json.dumps(out, ensure_ascii=False, default=str, indent=2)
    return Response(body, media_type="application/json",
                    headers={"Content-Disposition": 'attachment; filename="mamyn-prostir-my-data.json"'})


class EraseIn(BaseModel):
    confirm: str = ""


@router.post("/me/delete")
async def delete_me(body: EraseIn, request: Request, response: Response):
    u = await current_user(request)
    if body.confirm != "DELETE":
        raise HTTPException(422, "Підтвердьте видалення")
    uid = u["id"]
    for coll in (CHECKINS, STEPS, CARDS, EX_COLL, REFERRALS, CONSENTS, SESSIONS, RESETS):
        await db[coll].delete_many({"user_id": uid})
    await db[USERS].delete_one({"id": uid})
    await audit(uid, "delete_account", "user", uid)   # лише факт і знеособлений id, без пошти й змісту
    await count("account_deleted")
    response.delete_cookie("mp_s", path="/api/mp", secure=True, httponly=True, samesite="lax")
    return {"ok": True}
