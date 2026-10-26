"""Листи «Мамин простір» (відновлення пароля) — з адреси з налаштувань модуля; доставка — через host.send_mail."""
import html
import logging
from typing import Optional

from . import host
from .store import get_settings

log = logging.getLogger("mamyn.mail")


async def send(to: str, subject: str, lines: list, link: Optional[str] = None, link_text: str = "") -> bool:
    s = await get_settings()
    if not s.get("sender_email"):
        log.warning("mamyn mail: не задано адресу відправника (Налаштування)")
        return False
    body = "".join(f"<p>{html.escape(x)}</p>" for x in lines)
    if link:
        body += f'<p><a href="{html.escape(link)}">{html.escape(link_text or link)}</a></p>'
    body = f'<div style="font-family:Arial,sans-serif;font-size:15px;color:#241a33;max-width:520px">{body}</div>'
    ok = await host.send_mail(to, subject, body, s["sender_email"], s.get("sender_name") or "Мамин простір")
    if not ok:
        log.warning("mamyn mail: лист не прийнято")   # без адреси одержувачки й тексту
    return ok
