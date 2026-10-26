"""Самостійний запуск API «Мамин простір» / Standalone API.

    pip install -r requirements.txt
    cp .env.example .env   # заповнити, потім експортувати змінні
    uvicorn standalone.app:app --port 8001     # з кореня репозиторію

Кабінет мами — /api/mp/*, екрани команди — /api/mp-admin/* (заголовок Authorization: Bearer $MP_ADMIN_TOKEN).
Cookie сесії має прапор Secure: у браузері працює через HTTPS або на localhost.
"""
import pathlib
import sys
from contextlib import asynccontextmanager

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "backend"))

from fastapi import FastAPI  # noqa: E402

from mamyn import admin_router, ensure_indexes, public_router, seed_resources  # noqa: E402


@asynccontextmanager
async def lifespan(_app: FastAPI):
    await ensure_indexes()
    await seed_resources()
    yield


app = FastAPI(title="Мамин простір", lifespan=lifespan)
app.include_router(public_router, prefix="/api")
app.include_router(admin_router, prefix="/api")
