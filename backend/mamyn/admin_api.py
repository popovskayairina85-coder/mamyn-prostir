"""CRM → «Мамин простір»: звернення, ресурси з рецензуванням, налаштування, знеособлена статистика, тести ШІ.

Права (довідник розділів): mamyn.view — огляд і статистика; mamyn.referrals — фахівець бачить лише адресовані йому
звернення; mamyn.update — налаштування, ресурси, усі звернення. Приватні щоденники, кроки й картки мам звідси не
видно взагалі — таких точок немає (ТЗ, ролі).
"""
from datetime import timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from . import ai, host
from .host import db
from .content import CATEGORY_KEYS, REFERRAL_STATUS_KEYS
from .store import (AI_FEEDBACK, AUDIT, EVENTS, REFERRALS, RESOURCES, SETTINGS, USERS, DEFAULTS, audit, get_settings, new_id,
                    now)

router = APIRouter(prefix="/mp-admin")


async def need(authorization: Optional[str], *keys: str):
    user = await host.staff_user(authorization)
    if not await host.staff_can(user, keys):
        raise HTTPException(403, "Немає доступу до розділу «Мамин простір»")
    return user


async def is_manager(user) -> bool:
    return await host.staff_can(user, ["mamyn.update"])


# ───────────── огляд ─────────────

@router.get("/overview")
async def overview(authorization: Optional[str] = Header(default=None)):
    await need(authorization, "mamyn.view", "mamyn.referrals", "mamyn.update")
    since = now() - timedelta(days=7)
    users = await db[USERS].count_documents({})
    active = await db[USERS].count_documents({"last_login": {"$gte": since}})
    ai_consent = await db[USERS].count_documents({"consents.ai.at": {"$ne": None}, "consents.ai.revoked_at": None})
    refs = {s: await db[REFERRALS].count_documents({"status": s}) for s in REFERRAL_STATUS_KEYS}
    res = {s: await db[RESOURCES].count_documents({"status": s}) for s in ("draft", "reviewed", "published")}
    totals: Dict[str, int] = {}
    async for e in db[EVENTS].find({}, {"_id": 0, "type": 1, "count": 1}):
        totals[e["type"]] = totals.get(e["type"], 0) + int(e.get("count") or 0)
    fb = {k: await db[AI_FEEDBACK].count_documents({"kind": k}) for k in ("useless", "unsafe")}
    tests = await ai.last_tests()
    s = await get_settings()
    return {"users": users, "active_7d": active, "ai_consent": ai_consent, "referrals": refs, "resources": res,
            "totals": totals, "ai_feedback": fb, "settings": {k: s[k] for k in ("real_data", "registration_open", "ai_enabled")},
            "ai_tests": tests and {k: tests[k] for k in ("at", "passed", "total", "by")}}


@router.get("/daily")
async def daily(days: int = 30, authorization: Optional[str] = Header(default=None)):
    await need(authorization, "mamyn.view", "mamyn.update")
    days = max(1, min(days, 120))
    start = (now() - timedelta(days=days)).strftime("%Y-%m-%d")
    return await db[EVENTS].find({"day": {"$gte": start}}, {"_id": 0}).sort("day", 1).to_list(5000)


# ───────────── учасниці ─────────────
# Хто зареєстрований і з якими згодами — лише керівнику розділу (mamyn.update), кожен перегляд іде в журнал.
# Щоденників, нотаток, кроків і карток тут немає й не буде (ТЗ, ролі: адміністратор — мінімум необхідного).

@router.get("/users")
async def users(q: str = "", authorization: Optional[str] = Header(default=None)):
    user = await need(authorization, "mamyn.update")
    import re as _re
    flt: Dict[str, Any] = {}
    if q.strip():
        rx = {"$regex": _re.escape(q.strip()), "$options": "i"}
        flt = {"$or": [{"email": rx}, {"name": rx}]}
    rows = await db[USERS].find(flt, {"_id": 0, "id": 1, "email": 1, "name": 1, "lang": 1, "created_at": 1, "last_login": 1,
                                      "consents": 1}).sort("created_at", -1).to_list(1000)
    out = []
    for u in rows:
        c = u.pop("consents", None) or {}
        a = c.get("ai") or {}
        u["ai_consent"] = bool(a.get("at")) and not a.get("revoked_at")
        u["privacy_version"] = (c.get("privacy") or {}).get("version")
        u["referrals"] = await db[REFERRALS].count_documents({"user_id": u["id"]})
        out.append(u)
    await audit(user.id, "view", "users")
    return {"items": out, "total": await db[USERS].count_documents({})}


class DeleteUserIn(BaseModel):
    confirm: str = ""
    reason: str = Field(default="", max_length=200)


@router.post("/users/{uid}/delete")
async def delete_user(uid: str, body: DeleteUserIn, authorization: Optional[str] = Header(default=None)):
    """Видалення за запитом самої мами (напр., листом): усе її в просторі, як кнопка «Видалити мій простір»."""
    user = await need(authorization, "mamyn.update")
    if body.confirm != "DELETE" or len(body.reason.strip()) < 5:
        raise HTTPException(422, "Підтвердьте видалення й вкажіть підставу (напр., «лист від 26.10»)")
    if not await db[USERS].find_one({"id": uid}, {"_id": 1}):
        raise HTTPException(404, "Учасницю не знайдено")
    from .store import CARDS, CHECKINS, CONSENTS, EXERCISES, RESETS, SESSIONS, STEPS
    for coll in (CHECKINS, STEPS, CARDS, EXERCISES, REFERRALS, CONSENTS, SESSIONS, RESETS):
        await db[coll].delete_many({"user_id": uid})
    await db[USERS].delete_one({"id": uid})
    await db[AUDIT].insert_one({"id": new_id(), "actor": user.id, "action": "delete_on_request", "object_type": "user",
                                "object_id": uid, "reason": body.reason.strip(), "at": now()})
    return {"ok": True}


# ───────────── налаштування ─────────────

SETTING_KEYS = set(DEFAULTS)


@router.get("/settings")
async def get_cfg(authorization: Optional[str] = Header(default=None)):
    await need(authorization, "mamyn.view", "mamyn.update")
    s = await get_settings()
    return {"settings": s, "staff": await host.staff_list()}


class CfgIn(BaseModel):
    values: Dict[str, Any]


@router.put("/settings")
async def put_cfg(body: CfgIn, authorization: Optional[str] = Header(default=None)):
    user = await need(authorization, "mamyn.update")
    vals = {k: v for k, v in body.values.items() if k in SETTING_KEYS}
    for k in ("real_data", "registration_open", "ai_enabled"):
        if k in vals:
            vals[k] = bool(vals[k])
    for k in ("sla_days", "impact_threshold"):
        if k in vals:
            try:
                vals[k] = max(1, min(int(vals[k]), 60 if k == "sla_days" else 1000))
            except (TypeError, ValueError):
                raise HTTPException(422, "Число вказано невірно")
    if "crisis_lines" in vals:
        lines = vals["crisis_lines"] if isinstance(vals["crisis_lines"], list) else []
        vals["crisis_lines"] = [{"number": str(x.get("number", "")).strip()[:20], "uk": str(x.get("uk", "")).strip()[:120],
                                 "en": str(x.get("en", "")).strip()[:120]} for x in lines if isinstance(x, dict) and x.get("number")][:6]
        if not vals["crisis_lines"]:
            raise HTTPException(422, "Кризовий блок не може бути порожнім")
    for k in ("specialist_user_id", "reviewer_name", "sender_email", "sender_name", "operator", "privacy_email"):
        if k in vals:
            vals[k] = str(vals[k] or "").strip()[:200]
    if vals.get("ai_enabled"):
        t = await ai.last_tests()
        if not t or t["passed"] < t["total"]:
            raise HTTPException(409, "Спершу проженіть 20 тестів ШІ без жодної помилки (вкладка «ШІ»)")
    await db[SETTINGS].update_one({"_id": "main"}, {"$set": {**vals, "updated_at": now(), "updated_by": user.id}}, upsert=True)
    await audit(user.id, "settings", "settings")
    return await get_settings()


# ───────────── звернення ─────────────

def _ref_out(r: Dict[str, Any]) -> Dict[str, Any]:
    r.pop("_id", None)
    r.pop("user_id", None)      # ідентифікатор кабінету фахівцю не потрібен
    return r


@router.get("/referrals")
async def referrals(status: Optional[str] = None, authorization: Optional[str] = Header(default=None)):
    user = await need(authorization, "mamyn.referrals", "mamyn.update")
    q: Dict[str, Any] = {}
    if not await is_manager(user):
        q["assignee"] = user.id          # фахівець — лише адресовані йому
    if status in REFERRAL_STATUS_KEYS:
        q["status"] = status
    rows = await db[REFERRALS].find(q).sort("created_at", -1).to_list(500)
    return [_ref_out(r) for r in rows]


class RefPatch(BaseModel):
    status: Optional[str] = None
    reply_note: Optional[str] = Field(default=None, max_length=500)
    assignee: Optional[str] = None


@router.patch("/referrals/{rid}")
async def patch_referral(rid: str, body: RefPatch, authorization: Optional[str] = Header(default=None)):
    user = await need(authorization, "mamyn.referrals", "mamyn.update")
    manager = await is_manager(user)
    q: Dict[str, Any] = {"id": rid}
    if not manager:
        q["assignee"] = user.id
    upd: Dict[str, Any] = {"updated_at": now()}
    push: Dict[str, Any] = {}
    if body.status is not None:
        if body.status not in REFERRAL_STATUS_KEYS:
            raise HTTPException(422, "Невідомий статус")
        upd["status"] = body.status
        push = {"history": {"status": body.status, "at": now(), "by": user.id}}
    if body.reply_note is not None:
        upd["reply_note"] = body.reply_note.strip()   # видно мамі в «Мої звернення»
    if body.assignee is not None:
        if not manager:
            raise HTTPException(403, "Передати звернення може лише керівник розділу")
        upd["assignee"] = body.assignee
    res = await db[REFERRALS].update_one(q, {"$set": upd, **({"$push": push} if push else {})})
    if not res.matched_count:
        raise HTTPException(404, "Звернення не знайдено")
    await audit(user.id, "update", "referral", rid)
    return {"ok": True}


# ───────────── ресурси ─────────────

class ResIn(BaseModel):
    category: str
    title: Dict[str, str]
    text: Dict[str, str]
    source: str = Field(default="", max_length=200)
    author: str = Field(default="", max_length=120)
    link: str = Field(default="", max_length=300)
    order: int = 0


def _clean_res(b: ResIn) -> Dict[str, Any]:
    if b.category not in CATEGORY_KEYS:
        raise HTTPException(422, "Оберіть категорію")
    title = {k: str(b.title.get(k, "")).strip()[:160] for k in ("uk", "en")}
    text = {k: str(b.text.get(k, "")).strip()[:4000] for k in ("uk", "en")}
    if len(title["uk"]) < 3 or len(text["uk"]) < 20:
        raise HTTPException(422, "Потрібні назва й текст українською")
    link = b.link.strip()
    if link and not link.startswith("https://"):
        raise HTTPException(422, "Посилання — лише https://")
    return {"category": b.category, "title": title, "text": text, "source": b.source.strip(), "author": b.author.strip(),
            "link": link, "order": b.order}


@router.get("/resources")
async def list_res(authorization: Optional[str] = Header(default=None)):
    await need(authorization, "mamyn.view", "mamyn.update")
    return await db[RESOURCES].find({}, {"_id": 0}).sort("order", 1).to_list(500)


@router.post("/resources")
async def add_res(body: ResIn, authorization: Optional[str] = Header(default=None)):
    user = await need(authorization, "mamyn.update")
    doc = {"id": new_id(), **_clean_res(body), "reviewer": "", "reviewed_at": None, "status": "draft",
           "created_at": now(), "updated_at": now()}
    await db[RESOURCES].insert_one(dict(doc))
    await audit(user.id, "create", "resource", doc["id"])
    doc.pop("_id", None)
    return doc


@router.put("/resources/{rid}")
async def put_res(rid: str, body: ResIn, authorization: Optional[str] = Header(default=None)):
    user = await need(authorization, "mamyn.update")
    # будь-яка зміна тексту знімає перевірку: опубліковане має бути саме тим, що перевірив рецензент
    res = await db[RESOURCES].update_one({"id": rid}, {"$set": {**_clean_res(body), "status": "draft", "reviewer": "",
                                                               "reviewed_at": None, "updated_at": now()}})
    if not res.matched_count:
        raise HTTPException(404, "Матеріал не знайдено")
    await audit(user.id, "update", "resource", rid)
    return {"ok": True}


class ReviewIn(BaseModel):
    action: str                      # review | publish | unpublish
    reviewer: str = Field(default="", max_length=120)


@router.post("/resources/{rid}/status")
async def res_status(rid: str, body: ReviewIn, authorization: Optional[str] = Header(default=None)):
    user = await need(authorization, "mamyn.update")
    r = await db[RESOURCES].find_one({"id": rid}, {"_id": 0})
    if not r:
        raise HTTPException(404, "Матеріал не знайдено")
    if body.action == "review":
        reviewer = body.reviewer.strip() or (await get_settings()).get("reviewer_name", "")
        if not reviewer:
            raise HTTPException(422, "Вкажіть рецензента (або задайте його в Налаштуваннях)")
        upd = {"status": "reviewed", "reviewer": reviewer, "reviewed_at": now()}
    elif body.action == "publish":
        if not r.get("reviewed_at"):
            raise HTTPException(409, "Опублікувати можна лише перевірений рецензентом матеріал")
        upd = {"status": "published", "published_at": now()}
    elif body.action == "unpublish":
        upd = {"status": "reviewed" if r.get("reviewed_at") else "draft"}
    else:
        raise HTTPException(422, "Невідома дія")
    await db[RESOURCES].update_one({"id": rid}, {"$set": {**upd, "updated_at": now()}})
    await audit(user.id, body.action, "resource", rid)
    return {"ok": True}


@router.delete("/resources/{rid}")
async def del_res(rid: str, authorization: Optional[str] = Header(default=None)):
    user = await need(authorization, "mamyn.update")
    res = await db[RESOURCES].delete_one({"id": rid, "status": {"$ne": "published"}})
    if not res.deleted_count:
        raise HTTPException(409, "Опублікований матеріал спершу зніміть з публікації")
    await audit(user.id, "delete", "resource", rid)
    return {"ok": True}


# ───────────── тести ШІ ─────────────

@router.get("/ai/tests")
async def get_tests(authorization: Optional[str] = Header(default=None)):
    await need(authorization, "mamyn.view", "mamyn.update")
    return await ai.last_tests() or {}


@router.post("/ai/tests")
async def post_tests(authorization: Optional[str] = Header(default=None)):
    user = await need(authorization, "mamyn.update")
    return await ai.run_tests(getattr(user, "username", None) or user.id)
