"""Що модуль бере від застосунку-господаря — в одному місці.

За замовчуванням усе самостійне (модуль запускається окремо, див. standalone/app.py у відкритому репозиторії):
  база      — MongoDB з MONGO_URL / DB_NAME (Motor);
  паролі    — passlib pbkdf2_sha256, 600 000 повторів;
  адреса    — X-Real-IP лише від довіреного проксі (TRUSTED_PROXIES), інакше адреса з'єднання;
  ШІ        — Anthropic Messages API (ANTHROPIC_API_KEY, MP_AI_MODEL);
  листи     — SMTP (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD);
  команда   — вхід за токеном MP_ADMIN_TOKEN (усі права розділу).
Застосунок-господар (CRM центру) підставляє свої реалізації через configure(...) під час старту.
"""
import asyncio
import ipaddress
import os
import smtplib
from email.message import EmailMessage
from types import SimpleNamespace
from typing import Any, Awaitable, Callable, Dict, List, Optional, Sequence

from fastapi import HTTPException, Request
from passlib.context import CryptContext

_state: Dict[str, Any] = {}


# ───────────── база ─────────────

class _Db:
    """Ледачий доступ до бази: db["mp_users"] працює й тоді, коли модуль імпортовано раніше за configure()."""

    def _real(self):
        if "db" not in _state:
            from motor.motor_asyncio import AsyncIOMotorClient
            url = os.environ.get("MONGO_URL", "mongodb://127.0.0.1:27017")
            _state["db"] = AsyncIOMotorClient(url)[os.environ.get("DB_NAME", "mamyn_prostir")]
        return _state["db"]

    def __getitem__(self, name: str):
        return self._real()[name]


db = _Db()


# ───────────── типові реалізації ─────────────

_pwd = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto",
                    pbkdf2_sha256__default_rounds=600_000, pbkdf2_sha256__min_rounds=600_000)
_TRUSTED = [ipaddress.ip_network(x.strip()) for x in os.environ.get("TRUSTED_PROXIES", "127.0.0.1/32").split(",") if x.strip()]


def _client_ip(request: Request) -> str:
    peer = request.client.host if request.client else ""
    try:
        trusted = any(ipaddress.ip_address(peer) in n for n in _TRUSTED)
    except ValueError:
        trusted = False
    return (request.headers.get("x-real-ip") or peer) if trusted else (peer or "unknown")


async def _complete_ai(system: str, user: str, purpose: str) -> str:
    key = os.environ.get("ANTHROPIC_API_KEY")
    if not key:
        raise RuntimeError("ШІ не налаштовано (ANTHROPIC_API_KEY)")
    import httpx
    async with httpx.AsyncClient(timeout=60) as c:
        r = await c.post("https://api.anthropic.com/v1/messages",
                         headers={"x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json"},
                         json={"model": os.environ.get("MP_AI_MODEL", "claude-haiku-5-5"), "max_tokens": 600,
                               "system": system, "messages": [{"role": "user", "content": user}]})
        r.raise_for_status()
        return "".join(b.get("text", "") for b in r.json().get("content", []) if b.get("type") == "text")


async def _send_mail(to: str, subject: str, html: str, from_email: str, from_name: str) -> bool:
    host = os.environ.get("SMTP_HOST")
    if not host:
        return False

    def go() -> None:
        m = EmailMessage()
        m["From"], m["To"], m["Subject"] = f"{from_name} <{from_email}>", to, subject
        m.set_content("HTML email")
        m.add_alternative(html, subtype="html")
        with smtplib.SMTP(host, int(os.environ.get("SMTP_PORT", "587")), timeout=20) as s:
            s.starttls()
            if os.environ.get("SMTP_USER"):
                s.login(os.environ["SMTP_USER"], os.environ.get("SMTP_PASSWORD", ""))
            s.send_message(m)
    try:
        await asyncio.to_thread(go)
        return True
    except Exception:  # noqa: BLE001 — лист не критичний; без адреси й тексту в журналі
        return False


async def _staff_user(authorization: Optional[str]):
    token = os.environ.get("MP_ADMIN_TOKEN")
    got = (authorization or "").removeprefix("Bearer ").strip()
    import secrets as _s
    if not token or not got or not _s.compare_digest(got, token):
        raise HTTPException(401, "Потрібен вхід команди")
    return SimpleNamespace(id="admin", username="admin")


async def _staff_can(user, keys: Sequence[str]) -> bool:
    return getattr(user, "id", None) == "admin"


async def _staff_list() -> List[Dict[str, str]]:
    return [{"id": "admin", "name": "Адміністратор"}]


_impl: Dict[str, Any] = {"pwd": _pwd, "client_ip": _client_ip, "complete_ai": _complete_ai, "send_mail": _send_mail,
                         "staff_user": _staff_user, "staff_can": _staff_can, "staff_list": _staff_list}


def configure(*, database=None, pwd=None, client_ip: Optional[Callable[[Request], str]] = None,
              complete_ai: Optional[Callable[[str, str, str], Awaitable[str]]] = None,
              send_mail: Optional[Callable[..., Awaitable[bool]]] = None,
              staff_user: Optional[Callable[[Optional[str]], Awaitable[Any]]] = None,
              staff_can: Optional[Callable[[Any, Sequence[str]], Awaitable[bool]]] = None,
              staff_list: Optional[Callable[[], Awaitable[List[Dict[str, str]]]]] = None) -> None:
    """Підставити реалізації господаря. Не передане — лишається типовим."""
    if database is not None:
        _state["db"] = database
    for k, v in (("pwd", pwd), ("client_ip", client_ip), ("complete_ai", complete_ai), ("send_mail", send_mail),
                 ("staff_user", staff_user), ("staff_can", staff_can), ("staff_list", staff_list)):
        if v is not None:
            _impl[k] = v


# ───────────── те, чим користуються інші файли модуля ─────────────

def pwd() -> CryptContext:
    return _impl["pwd"]


def client_ip(request: Request) -> str:
    return _impl["client_ip"](request)


async def complete_ai(system: str, user: str, purpose: str) -> str:
    return await _impl["complete_ai"](system, user, purpose)


async def send_mail(to: str, subject: str, html: str, from_email: str, from_name: str) -> bool:
    return await _impl["send_mail"](to, subject, html, from_email, from_name)


async def staff_user(authorization: Optional[str]):
    return await _impl["staff_user"](authorization)


async def staff_can(user, keys: Sequence[str]) -> bool:
    return await _impl["staff_can"](user, keys)


async def staff_list() -> List[Dict[str, str]]:
    return await _impl["staff_list"]()
