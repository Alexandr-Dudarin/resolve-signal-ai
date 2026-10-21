# Приёмка public-demo-readiness

Дата: 21.10.2026. Baseline: `258f506e4900292f34ee6d3cfc94a81cc89bf685`.
Ветка: `feat/public-demo-readiness`. Финальные commit IDs и checksum ZIP — в отчёте поставки.
Это повторная реализация по исходному handoff; старые коммиты `e0c940a` не восстановлены.

## Верификация основы и ограничения среды

156 файлов приложенного source ZIP побайтно совпали с Git baseline; нет extras/missing.
Node 24.19.0, pnpm 11.19.0 через Corepack (первый install в среде был с 11.25.0,
затем frozen install и финальные команды выполнены с закреплённым 11.19.0).
Prisma Client 6.19.3. Runtime dependencies не обновлялись; добавлен только root `@types/node`
версии 24.13.3, уже присутствовавшей в lockfile, для проверки operations scripts.

PostgreSQL, initdb, pg_ctl, psql и Docker в Work-среде отсутствуют.
Не использовались удалённая Neon или личная БД. Никаких платных OpenAI-запросов.
Реальный compiled bootstrap запускался с локальной недоступной БД: ожидаемый отказ,
без вывода connection string. Это **не успешный DB-backed startup**.

## Команды и проверки

- `pnpm install --frozen-lockfile`: PASS, Prisma Client generated.
- `pnpm exec prisma validate`: PASS с синтаксически валидной локальной test URL, без подключения.
- `pnpm lint`: PASS.
- `pnpm typecheck`: PASS, включая `tsconfig.ops.json`.
- `pnpm test`: **191 PASS / 3 SKIP / 0 FAIL**: contracts 7; API 100 + 2 SKIP; web 55; operations 29 + 1 SKIP.
- `pnpm build`: PASS, `apps/api/dist/main.js`, `apps/web/dist/index.html` существуют.
- `git diff --check`: PASS.
- Guarded DB CLI без подтверждения: `init`/`migrate` отказали до доступа к БД, как требуется.
- Реальные миграции/seed/initializer на PostgreSQL: НЕ ВЫПОЛНЕНЫ здесь, инструкции ниже.
- HTTP smoke: compiled AppModule с DB/service stubs + работающий Vite loopback proxy:
  health 200; unauthorized direct/proxy GET 401; SPA direct `/feedback/new` 200;
  proxy login 200 + forwarded HttpOnly cookie/no-store; authorized data 200;
  logout 200; old-cookie replay на прямом API 401; Swagger JSON 404.
- Облачные Vercel/Render/Neon и browser cookie acceptance: НЕ ВЫПОЛНЕНЫ, без deployment.

Production build предупреждает о PURE-аннотациях в существующей Zod dependency и основном
JS chunk ~510 kB (gzip ~161 kB). Ошибок сборки нет; code splitting не входит в pass.
Тесты используют test fixtures и stubs, не валидируют работоспособность настоящего OpenAI key/model.

Новые проверки: full-AppModule unauthorized GET/POST/PATCH (включая runtime status/AI),
поддельные forwarding headers, refresh, cookie tampering/duplication/expiry/replay/logout,
production cookie attributes, restart revocation, exact Origin/JSON, login brute force,
mutation/create caps, body limit, error redaction, сохранение AI 429/Retry-After,
production fail-closed env, frontend gate/cache/expiry/errors, API URL/proxy configuration,
DB allowlist/confirmation, запрет destructive seed и insert-only initializer.

Три PostgreSQL-теста требуют отдельной БД: существующие два SQL atomicity/concurrency
и новый initializer idempotency/preservation (данные, edits, analyses, generations, replies, counters).
CI настроен на одноразовую service DB и запускает все три; удалённый CI в этом pass не запускался.

## Исторические миграции (SHA-256, без изменений)

| Путь | SHA-256 |
| --- | --- |
| `prisma/migrations/20260830150000_init/migration.sql` | `140a0f841318d8a84761aa50c5ed1d2225b3caa0b468cbd0e78cec3ffcd50bae` |
| `prisma/migrations/20260915155912_reply_generation_history/migration.sql` | `33a6790d5390d1ec2011f5bfda2ec672c375ce631f8a778d166699df88294651` |
| `prisma/migrations/20260917120000_ai_usage_counters/migration.sql` | `0e060585b13f8ec2ce72a3b615dc44b789805716ee505ef24d0a732294ca85cc` |

Новых миграций нет; `schema.prisma` тоже не меняется. Дополнительный LF init migration сохранён.
Никогда не применять migrate reset / нормализацию исторических SQL ради mismatch.

## Применение патчей в PowerShell

Распаковать ZIP в отдельный каталог. Перед `git am` текущая ветка должна быть чистой и
точно на baseline; если есть локальные правки/другой HEAD — остановиться и принести вывод
в основной чат. Не делать reset/stash/force автоматически.

```powershell
$ErrorActionPreference = 'Stop'
# Выполнить из корня своего resolve-signal-ai.
$baseline = '258f506e4900292f34ee6d3cfc94a81cc89bf685'
$branch = git branch --show-current
if ($LASTEXITCODE -ne 0 -or $branch -ne 'feat/public-demo-readiness') { throw 'Нужна целевая ветка feat/public-demo-readiness' }
$head = git rev-parse HEAD
if ($LASTEXITCODE -ne 0 -or $head -ne $baseline) { throw 'HEAD не совпадает с baseline' }
$changes = git status --porcelain
if ($LASTEXITCODE -ne 0 -or $changes) { throw 'Working tree должен быть чистым' }
# Укажите фактический каталог четырёх распакованных patch-файлов.
$patchDir = (Resolve-Path 'C:\PATH\TO\EXTRACTED_PATCHES').Path
$patches = @(Get-ChildItem -LiteralPath $patchDir -Filter '*.patch' -File | Sort-Object Name)
if ($patches.Count -ne 4) { throw 'Ожидаются ровно 4 патча текущего pass' }
git am -- $patches.FullName
if ($LASTEXITCODE -ne 0) { throw 'git am остановлен; сохраните вывод и обратитесь в основной чат' }
git status --short
git log -4 --format=fuller
git rev-parse 'HEAD^{tree}'
```

Если применение остановилось, `git am --abort` отменяет текущую am-сессию; сначала разобрать
причину в основном чате. SHA после git am может отличаться: committer/date локальные.
Сравнить итоговый **tree hash** с отчётом поставки. Не переписывать author для маскировки AI-участия.

## Одноразовая локальная PostgreSQL-приёмка

Отдельный терминал, свободный порт 5544 и новый контейнер. Имя `resolve_signal_demo_test`
обязательно для нового integration test; не направлять test URL в обычную demo/live БД.
Тестовые credentials ниже относятся только к одноразовому loopback контейнеру.

```powershell
docker run --name resolve-signal-demo-acceptance -e POSTGRES_DB=resolve_signal_demo_test -e POSTGRES_USER=resolve_test -e POSTGRES_PASSWORD=resolve_test -p 127.0.0.1:5544:5432 -d postgres:17-alpine
# Дождаться готовности; при ошибке не продолжать.
docker exec resolve-signal-demo-acceptance pg_isready -U resolve_test -d resolve_signal_demo_test
$env:NODE_ENV = 'test'
$env:AI_PROVIDER = 'mock'
$env:DEMO_ACCESS_ENABLED = 'false'
$env:DATABASE_URL = 'postgresql://resolve_test:resolve_test@127.0.0.1:5544/resolve_signal_demo_test?schema=public'
$env:AI_USAGE_TEST_DATABASE_URL = $env:DATABASE_URL
$env:PUBLIC_DEMO_TEST_DATABASE_URL = $env:DATABASE_URL
$env:VITE_API_URL = ''
corepack pnpm install --frozen-lockfile
pnpm exec prisma validate
pnpm db:migrate
pnpm db:seed
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Каждая команда должна завершиться с exit 0; после ошибки остановиться. Ожидается отсутствие
SKIP при корректном подключении. Старые AI integration tests очищают counters целиком —
это ещё одна причина пользоваться только этим одноразовым контейнером.

Проверить реальные guarded commands в этой же одноразовой БД:

```powershell
$env:DIRECT_URL = $env:DATABASE_URL
$env:PUBLIC_DEMO_DB_HOST = '127.0.0.1'
$env:PUBLIC_DEMO_DB_NAME = 'resolve_signal_demo_test'
$env:PUBLIC_DEMO_ALLOW_LOCAL = 'true'
$env:PUBLIC_DEMO_CONFIRM = 'migrate-public-demo'
pnpm db:demo:migrate
$env:PUBLIC_DEMO_CONFIRM = 'init-public-demo'
pnpm db:demo:init
pnpm db:demo:init
```

Ожидается: migration success, первый init 5, повторный 0 (если integration test очистил свои
синтетические записи). Существующий local seed остаётся. После приёмки остановить только
этот контейнер командой `docker stop resolve-signal-demo-acceptance`; удалять его отдельно
по решению владельца. Закрыть тестовый shell, чтобы test URL не влияли на обычную разработку.

## Локальный gate UX и следующий review

В новом shell/локальном `.env` задать отдельные случайные code/secret по deployment guide,
NODE_ENV=development, DEMO_ACCESS_ENABLED=true, AI_PROVIDER=mock, CORS_ORIGIN=http://localhost:5173,
VITE_API_URL пустой, DATABASE_URL — одноразовый контейнер. Запустить `pnpm dev`.
Проверить login/loading/invalid/network/429, refresh и прямой URL, create/analyze/replies,
edit/approve/reject/status, logout/replay, mobile layout и shared-demo notice.
Открыть API напрямую без cookie — данные должны оставаться закрыты; Swagger 404.
Для production Secure cookie потребуется HTTPS cloud acceptance позднее.

Особенно внимательно review: `demo-access`, `configure-http.ts`, `env.ts`,
`DemoAccessGate.tsx` / API client / QueryProvider, DB guards/commands, `vercel.ts`, `render.yaml`.
Имеющиеся AI/provider/SQL quota files не менялись. Стоп после локальной приёмки и review;
решение о публикации и разрешение на live smoke — в основном чате, без перехода к Agent V2.
