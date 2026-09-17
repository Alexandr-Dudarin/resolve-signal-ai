# Security pass: результаты проверки, 2026-09-17

Ветка: `feat/ai-security-controls`. Baseline: `f563599`.
Только security/cost-control этап; push, PR, merge и следующий продуктовый этап не выполнялись.

## Выполненные проверки

| Команда | Результат |
| --- | --- |
| `pnpm install --frozen-lockfile` | PASS; Prisma Client сгенерирован |
| `pnpm exec prisma validate` | PASS |
| `pnpm lint` | PASS |
| `pnpm typecheck` | PASS: contracts, API, web |
| `pnpm test` | 104 PASS, 2 SKIP; 26 файлов PASS, 1 SKIP |
| `pnpm build` | PASS: contracts, API, web |
| `git diff --check` | PASS |
| Сравнение исторических migrations с baseline | Нет изменений |

Для Prisma validation передан только несекретный локальный DATABASE_URL через
окружение команды. `DOTENV_CONFIG_PATH=/dev/null` исключал загрузку настоящего `.env`.
В свежем clone настоящий `.env` отсутствует. Реальные API keys не читались,
OpenAI calls не выполнялись, TLS verification не отключалась.

Build имеет неблокирующие предупреждения: аннотации комментариев в установленной
Zod и frontend JS chunk 503.86 kB (gzip 158.90 kB). Code-splitting не включён в scope этого pass.

## Tests

| Package | PASS | SKIP |
| --- | ---: | ---: |
| contracts | 7 | 0 |
| API | 59 | 2 |
| web | 38 | 0 |
| Всего | 104 | 2 |

Добавлены или дополнены:

```text
packages/contracts/src/index.test.ts
apps/api/src/app/env.test.ts
apps/api/src/common/http/client-ip.test.ts
apps/api/src/common/security/feedback-text.test.ts
apps/api/src/modules/ai-usage/application/ai-usage-limiter.test.ts
apps/api/src/modules/ai-usage/api/ai-usage.e2e.test.ts
apps/api/src/modules/ai-usage/infrastructure/prisma-ai-usage.repository.integration.test.ts
apps/api/src/modules/ai/infrastructure/openai.provider.test.ts
apps/api/src/modules/feedback/application/feedback.service.test.ts
apps/api/src/modules/feedback/api/feedback.e2e.test.ts
apps/web/src/shared/api/api-client.test.ts
apps/web/src/shared/lib/ai-usage-limit.test.ts
apps/web/src/features/analyze-feedback/AnalyzeFeedbackButton.test.tsx
apps/web/src/features/generate-reply/GenerateRepliesButton.test.tsx
apps/web/src/features/create-feedback/CreateFeedbackForm.test.tsx
apps/web/src/pages/feedback-details/FeedbackDetailsPage.test.tsx
```

HTTP-тесты реально запускают Nest с подменёнными dependencies: проверяют health,
создание/чтение, 400, 429, header, IP identity, Swagger UI и OpenAPI JSON.
Это не заменяет запуск приложения против PostgreSQL.
UI-тесты проверяют реальные React-компоненты, отсутствие script/img DOM-узлов,
сохранение обращения при 429 и запрет автоматических retries даже при retry-defaults клиента.
OpenAI SDK подменён; проверены JSON data/instructions boundary, schema и `maxRetries: 0`.

## Ограничение: SQL concurrency ещё нужно подтвердить

В Work-контейнере нет Docker/PostgreSQL service. Получены отдельные временные
PostgreSQL 17.10 binaries, но запуск остановлен правами управляемой среды:
`runuser: cannot set groups: Operation not permitted` (смена владельца также недоступна).
Ограничение не обходилось, PostgreSQL не запускался.

Поэтому новая migration здесь **не применялась к работающей БД**, seed не запускался,
а два PostgreSQL-backed integration tests **SKIPPED, не PASS**.
Нельзя считать атомарность SQL экспериментально подтверждённой этим локальным прогоном.

Тесты готовы и автоматически включены в существующий CI с PostgreSQL через
`AI_USAGE_TEST_DATABASE_URL`. CI удалённо не запускался, так как push/PR запрещены handoff.
Инструкция для отдельной локальной тестовой БД и ожидаемые результаты — в
[AI_SECURITY.md](AI_SECURITY.md#автотесты-и-изолированная-тестовая-бд).
До приёмки нужно получить PASS обоих DB-тестов на PostgreSQL пользователя или CI.

## Migration и архитектура

Новая additive migration: `20260917120000_ai_usage_counters`.
Исторические SQL, включая дополнительный LF в init, сохранены byte-for-byte.
SHA-256 init:
`140a0f841318d8a84761aa50c5ed1d2225b3caa0b468cbd0e78cec3ffcd50bae`.

Архитектура не менялась: отдельный application limiter, repository port и Prisma
adapter; SQL не попал в FeedbackService, quota algorithm — в controller.
Shared enums и DB values остаются английскими, UX messages — русскими.

Уточнения реализации относительно baseline:

- OpenAI SDK automatic retries отключены для точного соответствия quota/attempt;
- prompt versions повышены до v2 в новых результатах, без backfill metadata;
- добавлены `sanitize-html`, `entities` и типы sanitizer — для реальной plain-text normalization;
- SQL integration tests требуют отдельный явный test URL, чтобы обычный `pnpm test`
  случайно не очистил counters пользовательской demo/live БД.

Функциональных отступлений от handoff нет. Ограничение проверки PostgreSQL описано выше.
Rate limits не являются billing, prompt hardening не даёт абсолютной защиты от injection.
Фоновой retention counters, auth, tenant/API-key quotas и Agent tools пока нет.

## Перед приёмкой

1. Применить три security patches к чистой ветке от `f563599`.
2. Проверить diff и новую migration; не нормализовать исторические SQL.
3. Запустить DB-тесты на отдельной PostgreSQL БД по инструкции.
4. Выполнить [manual QA](AI_SECURITY.md#manual-qa): mock/XSS бесплатно,
   live/quota/prompt-проверки выполняет пользователь и они могут быть платными.
5. После review принять security pass отдельно; автоматически к Agent/Telegram/V3 не переходить.
