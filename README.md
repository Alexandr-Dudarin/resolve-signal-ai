# ResolveSignal AI

ResolveSignal AI — рабочий цикл обработки обращений: исходный текст, структурированный
AI-анализ, варианты ответа, редактирование и решение оператора. Основной язык интерфейса — русский.
Внутренние API/DB enums остаются английскими, русские названия находятся в presentation dictionaries.

Реализованы Phase 0, Phase 1, настоящий OpenAI provider и AI security controls.
Текущий pass `passwordless-public-demo` добавляет публичный просмотр без регистрации,
гостевые cookie-сессии в PostgreSQL, владение тестовыми обращениями и ограничение хранения.
Существующий вход по коду сохранён как отдельный режим.
**Облачная публикация ещё не выполнена и требует отдельной приёмки.**

## Возможности и границы

- React/Vite/TypeScript, FSD, React Router, TanStack Query, React Hook Form, CSS Modules.
- NestJS REST, общие Zod/TypeScript contracts, PostgreSQL/Prisma, pnpm monorepo.
- Обзор, список/фильтры, создание и детали обращения; анализ, generation history,
  редактирование/approve/reject ответа, смена статуса; loading/empty/error/responsive states.
- `AI_PROVIDER=mock` — детерминированный локальный режим без OpenAI key.
  `AI_PROVIDER=openai` — Responses API + Structured Outputs/Zod, серверные ключ и модель,
  `store:false`, `maxRetries:0`, без fallback на Mock.
- PostgreSQL-атомарные AI-квоты, plain-text XSS normalization, недоверенные данные отдельно от instructions.
- Guest/code demo: общий workspace, HttpOnly cookie, logout/revocation, CSRF Origin validation,
  rate limits, ограничения body, cache clearing и понятные сообщения на русском.

Не реализованы Agent/tool calling, Telegram, Cases/V2, webhooks/V3, billing, full auth/RBAC,
multi-tenancy, queues и background jobs. Guest mode разрешает изменения только своих временных
записей; чтение общее. Доступ по коду сохраняет прежний совместный workspace.

## Локальный запуск

Node 24+, **pnpm 11.19.0** (packageManager), Docker Compose для локального PostgreSQL.

```bash
cp .env.example .env
corepack pnpm install --frozen-lockfile
pnpm db:start
pnpm db:migrate
pnpm db:seed
pnpm dev
```

`db:seed` удаляет локальные demo данные/counters: применять только к своей локальной dev DB.
Теперь он отказывает для production, включённого gate и non-local database host.
Он никогда не запускается при production build/start. Для выделенного публичного demo —
только отдельные guarded `db:demo:migrate` и `db:demo:init` после review.

Web http://localhost:5173; health http://localhost:4000/health;
Swagger http://localhost:4000/api/docs доступен только в ungated development.
`VITE_API_URL` пустой, Vite проксирует `/api` на localhost:4000. Если локальный PORT меняется,
согласованно изменить dev proxy. Критический локальный seed:
`/feedback/33333333-3333-4333-8333-333333333333`.

Для локальной проверки passwordless guest mode см. `docs/PASSWORDLESS_PUBLIC_DEMO.md`.
Для прежнего режима mode=code включить DEMO_ACCESS_ENABLED и задать два независимо
сгенерированных секрета согласно `.env.example`. Для live локально добавить серверные
OPENAI_API_KEY и OPENAI_MODEL, выбрать AI_PROVIDER=openai; это отдельное платное действие.
Ни тесты, ни demo initializer не обращаются в OpenAI.

## Команды

| Команда | Назначение |
| --- | --- |
| `pnpm dev`, `pnpm dev:api`, `pnpm dev:web` | Запуск разработки |
| `pnpm db:generate` | Генерация Prisma Client, также postinstall |
| `pnpm db:migrate` | Применение существующих migrations к DATABASE_URL; обычно локально |
| `pnpm db:migrate:dev` | Создание новой migration только в development |
| `pnpm db:seed` | Разрушительный локальный reset/demo seed |
| `pnpm db:demo:migrate`, `pnpm db:demo:init` | Явные guarded команды выделенной demo DB |
| `pnpm exec prisma validate` | Проверка Prisma schema |
| `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` | Все проверки workspace и operations scripts |
| `pnpm test:ops` | Deployment/DB guard/initializer tests |

## Структура и архитектура

- `apps/web`: app/pages/widgets/features/shared (FSD), presentation labels, API client.
- `apps/api`: modular NestJS, `demo-access` global guard, feedback/replies/AI/AI-usage modules.
- `packages/contracts`: shared schemas/types, включая session и 429 contracts.
- `prisma`: schema, неизменённые исторические SQL, local seed и insert-only public initializer.
- `deployment`, `vercel.ts`, `render.yaml`: конфигурация будущей публикации.
- `docs`, `.github/workflows/ci.yml`: архитектура, безопасность, приёмка и CI.

Application services зависят от `LLMProvider` / `FeedbackRepository`; controllers валидируют
вход, Prisma изолирована в repositories. Provider получает минимальный контекст.
Ключи AI/DB не передаются браузеру. Стандартные GET/POST/PATCH `/api/v1/...` сохранены;
добавлены GET/POST `/api/v1/demo/session` и POST `/api/v1/demo/session/logout`.

## Документы

- [Passwordless guest mode: лимиты, migration, локальный QA](docs/PASSWORDLESS_PUBLIC_DEMO.md)
- [Результаты проверок guest pass](docs/PASSWORDLESS_VALIDATION.md)
- [Актуальный checkpoint](docs/CURRENT_STATUS.md)
- [Публикация и эксплуатация Vercel / Render / Neon](docs/PUBLIC_DEMO_DEPLOYMENT.md)
- [Локальная приёмка и ограничения проверок](docs/PUBLIC_DEMO_VALIDATION.md)
- [AI security](docs/AI_SECURITY.md), [предыдущая security acceptance](docs/AI_SECURITY_VALIDATION.md)

Первоначальные Blueprint/Technical Spec/DESIGN_SPEC в `docs` сохранены. Последующие
утверждённые handoff расширяют Phase 1: реальные LLM и public-demo access допустимы,
перехода к Agent V2 нет. CSS, light Hybrid Intelligence и внутренние enums сохранены.
