"""«Мамин простір» — цифрова платформа самопідтримки для мам дітей з інвалідністю (ТЗ 23.10.2026, UNICEF Femtech).

Самостійний модуль: власні колекції mp_*, власні облікові записи мам, власні маршрути. Усе, що потрібно від
застосунку-господаря (база, ШІ, листи, вхід співробітників), — у host.py з самостійними типовими реалізаціями;
господар підставляє свої через configure() (CRM центру — backend/mamyn_crm.py).

    content.py     стани, вправи, категорії, кризовий блок, 10 чернеток ресурсів
    store.py       колекції, налаштування, журнал, знеособлені лічильники
    auth.py        облікові записи мам, сесії в cookie, ліміти спроб, захист від підробки запитів
    public_api.py  /api/mp/*        — кабінет мами (через сайт)
    admin_api.py   /api/mp-admin/*  — CRM: звернення, ресурси, налаштування, статистика, тести ШІ
    ai.py          навігатор за перевіреними ресурсами + 20 приймальних тестів
    mail.py        листи (відновлення пароля)
    host.py        що береться від господаря + типові самостійні реалізації
"""
from .admin_api import router as admin_router
from .public_api import router as public_router
from .host import configure
from .store import ensure_indexes, seed_resources

__all__ = ["admin_router", "public_router", "configure", "ensure_indexes", "seed_resources"]
