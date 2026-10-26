# Мамин простір · Mamyn prostir

Цифрова платформа самопідтримки для повнолітніх мам та інших жінок, які доглядають дітей з інвалідністю чи
особливостями розвитку: щоденник стану, короткі вправи, власні кроки, перевірені ресурси, звернення до фахівця
і ШІ-навігатор, що працює лише за перевіреними матеріалами. Не ставить діагнозів і не замінює допомоги фахівця.

A digital self-support platform for adult mothers and other women caring for children with disabilities or
developmental differences: mood diary, short exercises, personal steps, verified resources, a way to reach a
specialist, and an AI navigator that only points to reviewed materials. It does not diagnose and does not replace
professional care.

Живий пілот / live pilot: https://svitmozhlyvostei.com/mamyn-prostir · розробник / developer: ТОВ «Інтегріо».

## Стан / Status

Пілотна версія (жовтень 2026). Перевірено на синтетичних даних; тестування з добровольчими учасницями —
за протоколом у `docs/`. ШІ-навігатор вимкнено, доки психолог не перевірить ресурси й протокол тестів.

Pilot (October 2026). Verified on synthetic data; volunteer testing follows the protocol in `docs/`. The AI navigator
stays off until a psychologist reviews the resources and the test protocol.

## Структура / Layout

| Шлях / Path | Що це / What |
| --- | --- |
| `backend/mamyn/` | FastAPI-модуль: облікові записи мам, сесії, щоденник, вправи, кроки, звернення, ресурси, ШІ, статистика |
| `site/src/` | Next.js (App Router): лендінг і кабінет `/mamyn-prostir/*`, українська й англійська |
| `crm-admin/pages/Mamyn/` | React-екрани для команди: учасниці, звернення, ресурси з рецензуванням, налаштування, тести ШІ |
| `docs/` | Безпека ШІ, приватність, протокол тестування |

## Принципи даних / Data principles

- Власні колекції `mp_*`; жодного доступу до інших даних застосунку-господаря.
- Дані дитини не збираються. Нотатки, кроки й картки бачить лише сама мама; фахівець бачить тільки звернення.
- Згоди окремі й версійовані: повноліття, умови користування, ШІ (необов'язкова, відкликається).
- Вивантаження (JSON) і повне видалення — самостійно, у профілі.
- Публічна статистика — лише зведені лічильники без людей, від порогу учасниць (за замовчуванням 10).
- Сесія — випадковий ключ у HttpOnly-cookie, у базі лише його SHA-256; паролі — PBKDF2-SHA256 600 000.
- Зміни приймаються лише з заголовком `X-MP: 1` (захист від підробки запитів між сайтами).

## Запуск / Running

Самостійно / standalone (потрібна MongoDB):

```bash
pip install -r requirements.txt
cp .env.example .env        # заповнити й експортувати змінні
uvicorn standalone.app:app --port 8001
```

Усе, що модуль бере ззовні, зібрано в `backend/mamyn/host.py` — з типовими самостійними реалізаціями:

| Що | Типово (змінні оточення) |
| --- | --- |
| База | MongoDB через Motor: `MONGO_URL`, `DB_NAME` |
| Паролі | passlib PBKDF2-SHA256, 600 000 повторів |
| Адреса відвідувача | `X-Real-IP` лише від довірених проксі `TRUSTED_PROXIES` |
| ШІ-навігатор | Anthropic Messages API: `ANTHROPIC_API_KEY`, `MP_AI_MODEL` (будь-який інший постачальник — своєю функцією) |
| Листи | SMTP: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` |
| Вхід команди | `Authorization: Bearer $MP_ADMIN_TOKEN` (усі права розділу) |

Вбудувати у свій застосунок / embed: викликати `mamyn.configure(database=…, complete_ai=…, send_mail=…,
staff_user=…, staff_can=…, staff_list=…)` своїми реалізаціями й підключити `public_router` та `admin_router`
з префіксом `/api`. Пілот центру «Світ можливостей» підключає модуль саме так — до своєї бази, ШІ-шлюзу з обліком
витрат, розсилок і прав співробітників.

Сайт (`site/src`) — сторінки й компоненти для Next.js App Router; API викликається з того самого домену
(`/api/mp/*`), щоб cookie сесії лишалась на домені сайту — напр. через проксі в nginx. Екрани команди
(`crm-admin/`) — React-компоненти на shadcn/ui; їх легко перенести в будь-яку адмінку.

## Ліцензія / License

GPL-2.0-or-later — див. `LICENSE`. Логотип центру й ілюстрація героя не входять у репозиторій і не ліцензуються.
