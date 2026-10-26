"""Сховище «Мамин простір»: власні колекції mp_* (жодних спільних таблиць із CRM фонду — ТЗ 7.1), налаштування,
журнал дій без змісту, знеособлені денні лічильники."""
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from .host import db

from .content import CRISIS_LINES, SEED_RESOURCES

USERS = "mp_users"
SESSIONS = "mp_sessions"
CONSENTS = "mp_consents"            # історія згод: тип, версія тексту, коли дано / відкликано
CHECKINS = "mp_checkins"
EXERCISES = "mp_exercise_sessions"
STEPS = "mp_steps"
CARDS = "mp_cards"                  # приватні картки з вправ («Карта підтримки», «Що додає ресурсу»)
REFERRALS = "mp_referrals"
RESOURCES = "mp_resources"
EVENTS = "mp_events"                # знеособлені лічильники {day, type, count} — без людей, IP, тексту
AUDIT = "mp_audit"                  # хто що зробив (тип дії й об'єкта), без змісту
SETTINGS = "mp_settings"
RATE = "mp_rate"
RESETS = "mp_password_resets"
AI_FEEDBACK = "mp_ai_feedback"
AI_TESTS = "mp_ai_tests"

PRIVACY_VERSION = "2026-10-26"      # версія тексту умов пілоту; нова версія — повторна згода
AI_CONSENT_VERSION = "2026-10-26"

DEFAULTS: Dict[str, Any] = {
    "real_data": False,             # справжні дані — лише після юридичної перевірки (рішення Ірини 26.10)
    "registration_open": True,
    "ai_enabled": False,            # вмикається після 20 тестів і перевірки психологом
    "specialist_user_id": "",       # хто отримує звернення (користувач CRM)
    "reviewer_name": "",            # рецензент матеріалів за замовчуванням
    "sla_days": 5,
    "sender_email": "",             # адреса центру для листів (має бути підтверджена в SendPulse)
    "sender_name": "Мамин простір · Світ можливостей",
    "operator": "ТОВ «Інтегріо»",
    "privacy_email": "",
    "crisis_lines": CRISIS_LINES,
    "impact_threshold": 10,         # публічні лічильники — лише від 10 учасниць
}


def now() -> datetime:
    return datetime.now(timezone.utc)


def new_id() -> str:
    return str(uuid.uuid4())


def today_iso() -> str:
    return now().strftime("%Y-%m-%d")


async def get_settings() -> Dict[str, Any]:
    doc = await db[SETTINGS].find_one({"_id": "main"}) or {}
    doc.pop("_id", None)
    return {**DEFAULTS, **doc}


async def count(event: str, n: int = 1) -> None:
    """Знеособлений лічильник за день: лише тип події, без людини й змісту (ТЗ F-10)."""
    await db[EVENTS].update_one({"day": today_iso(), "type": event}, {"$inc": {"count": n}}, upsert=True)


async def audit(actor: str, action: str, object_type: str, object_id: Optional[str] = None) -> None:
    await db[AUDIT].insert_one({"id": new_id(), "actor": actor, "action": action, "object_type": object_type,
                                "object_id": object_id, "at": now()})


async def ensure_indexes() -> None:
    await db[USERS].create_index("id", unique=True)
    await db[USERS].create_index("email", unique=True)
    await db[SESSIONS].create_index("key", unique=True)
    await db[SESSIONS].create_index("expires_at", expireAfterSeconds=0)
    await db[CHECKINS].create_index([("user_id", 1), ("day", -1)], unique=True)
    await db[STEPS].create_index([("user_id", 1), ("created_at", -1)])
    await db[CARDS].create_index([("user_id", 1), ("kind", 1)])
    await db[EXERCISES].create_index([("user_id", 1), ("completed_at", -1)])
    await db[REFERRALS].create_index([("user_id", 1), ("created_at", -1)])
    await db[REFERRALS].create_index([("status", 1), ("created_at", -1)])
    await db[CONSENTS].create_index([("user_id", 1), ("at", -1)])
    await db[EVENTS].create_index([("day", 1), ("type", 1)], unique=True)
    await db[RATE].create_index("expires_at", expireAfterSeconds=0)
    await db[RESETS].create_index("expires_at", expireAfterSeconds=0)
    await db[RESOURCES].create_index("id", unique=True)


async def seed_resources() -> int:
    """10 чернеток із пакета ТЗ — один раз. Статус «чернетка»: публікує лише рецензент (ТЗ F-07)."""
    # старт іде в кожному воркері: спершу атомарно зайняти відмітку, інакше чернетки ляжуть двічі
    mark = await db[SETTINGS].update_one({"_id": "seed_resources"}, {"$setOnInsert": {"at": now()}}, upsert=True)
    if mark.upserted_id is None or await db[RESOURCES].count_documents({}, limit=1):
        return 0
    docs = []
    for i, (cat, t_uk, x_uk, t_en, x_en) in enumerate(SEED_RESOURCES):
        docs.append({"id": new_id(), "category": cat, "title": {"uk": t_uk, "en": t_en}, "text": {"uk": x_uk, "en": x_en},
                     "source": "Редакція «Мамин простір»", "author": "Редакція «Мамин простір»", "reviewer": "", "reviewed_at": None,
                     "status": "draft", "order": i, "created_at": now(), "updated_at": now()})
    await db[RESOURCES].insert_many(docs)
    return len(docs)
