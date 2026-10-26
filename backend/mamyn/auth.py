"""Облікові записи «Мамин простір» — окремі від користувачів CRM.

Сесія: випадковий ключ у cookie mp_s (HttpOnly, Secure, SameSite=Lax, шлях /api/mp); у базі — лише його відбиток.
Cookie ставиться на домен сайту: запити йдуть через nginx сайту на svitmozhlyvostei.com/api/mp/ (CRM напряму їх не
приймає — обмеження в nginx/crm.conf). Захист від підробки запитів: кожна зміна вимагає заголовок X-MP: 1, якого
чужий сайт не може поставити без дозволу CORS (а його немає). Підбір пароля — ліміт спроб на адресу й на пошту.
"""
import asyncio
import hashlib
import re
import secrets
from datetime import timedelta
from typing import Any, Dict, Optional

from fastapi import HTTPException, Request, Response
from pymongo import ReturnDocument

from . import host
from .host import db

from .store import RATE, SESSIONS, USERS, now

COOKIE = "mp_s"
COOKIE_PATH = "/api/mp"
SESSION_DAYS = 30
EMAIL_RX = re.compile(r"^[^@\s]{1,64}@[^@\s]{1,190}\.[^@\s]{2,24}$")
_DUMMY: list = []


def key_hash(key: str) -> str:
    return hashlib.sha256(key.encode()).hexdigest()


def norm_email(email: str) -> str:
    e = (email or "").strip().lower()
    if not EMAIL_RX.match(e):
        raise HTTPException(422, "Перевірте адресу пошти")
    return e


def check_password(pw: str) -> str:
    if len(pw or "") < 8:
        raise HTTPException(422, "Пароль — щонайменше 8 символів")
    if len(pw) > 200:
        raise HTTPException(422, "Пароль задовгий")
    return pw


async def hash_password(pw: str) -> str:
    return await asyncio.to_thread(host.pwd().hash, pw)


async def verify_password(pw: str, stored: Optional[str]) -> bool:
    if not _DUMMY:
        _DUMMY.append(host.pwd().hash(secrets.token_urlsafe(16)))
    # хеш рахується й без акаунта — щоб за часом відповіді не було видно, чи існує пошта
    return await asyncio.to_thread(host.pwd().verify, pw, stored or _DUMMY[0]) and bool(stored)


def require_csrf(request: Request) -> None:
    if request.method not in ("GET", "HEAD", "OPTIONS") and request.headers.get("x-mp") != "1":
        raise HTTPException(403, "Запит відхилено")


async def limit(bucket: str, max_hits: int, window_s: int, detail: str) -> None:
    """Спільний для всіх воркерів ліміт: лічильник у базі з часом життя."""
    doc = await db[RATE].find_one_and_update(
        {"_id": bucket}, {"$inc": {"n": 1}, "$setOnInsert": {"expires_at": now() + timedelta(seconds=window_s)}},
        upsert=True, return_document=ReturnDocument.AFTER)
    if doc and doc.get("n", 0) > max_hits:
        raise HTTPException(429, detail)


def ip_of(request: Request) -> str:
    return host.client_ip(request)


async def start_session(response: Response, user_id: str) -> None:
    key = secrets.token_urlsafe(32)
    await db[SESSIONS].insert_one({"key": key_hash(key), "user_id": user_id, "created_at": now(),
                                   "expires_at": now() + timedelta(days=SESSION_DAYS)})
    response.set_cookie(COOKIE, key, max_age=SESSION_DAYS * 86400, path=COOKIE_PATH, httponly=True, secure=True, samesite="lax")


async def end_session(request: Request, response: Response) -> None:
    key = request.cookies.get(COOKIE)
    if key:
        await db[SESSIONS].delete_one({"key": key_hash(key)})
    response.delete_cookie(COOKIE, path=COOKIE_PATH, secure=True, httponly=True, samesite="lax")


async def end_all_sessions(user_id: str) -> None:
    await db[SESSIONS].delete_many({"user_id": user_id})


async def current_user(request: Request, required: bool = True) -> Optional[Dict[str, Any]]:
    key = request.cookies.get(COOKIE)
    if key:
        s = await db[SESSIONS].find_one({"key": key_hash(key)}, {"_id": 0, "user_id": 1, "expires_at": 1})
        if s and s["expires_at"].replace(tzinfo=now().tzinfo) > now():
            u = await db[USERS].find_one({"id": s["user_id"]}, {"_id": 0, "password_hash": 0})
            if u:
                return u
    if required:
        raise HTTPException(401, "Увійдіть, щоб продовжити")
    return None
