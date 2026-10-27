# Passwordless Public Demo / Guest Access

Дата: 27.10.2026. Baseline main: `ae542fc388dd3564cff2e7b011d11a9ac9a1bed2`.
Ветка implementation-pass: `feat/passwordless-public-demo`.
Этот документ задаёт гостевой режим; он имеет приоритет над описанием доступа по коду
в документах предыдущего public-demo-readiness. Публикация требует отдельного решения владельца.

## Режимы и границы доступа

- `DEMO_ACCESS_ENABLED=true`, `DEMO_ACCESS_MODE=guest`: публичное чтение Dashboard,
  списка, деталей и безопасного AI runtime status. Нет регистрации, пароля или формы кода.
- `DEMO_ACCESS_ENABLED=true`, `DEMO_ACCESS_MODE=code`: сохранён прежний вход по коду.
  Без авторизации application GET/POST/PATCH закрыты. Пять примеров могут редактировать
  доверенные участники с кодом, как и до этого этапа.
- `DEMO_ACCESS_ENABLED=false`: только локальная разработка, только при mode=code.
  Guest mode отказывает с false даже вне production. Production никогда не разрешает false.
- Production требует настоящий OpenAI, включённые PostgreSQL AI-квоты, HTTPS origin,
  строгий PostgreSQL TLS и случайный signing secret. Автоматического fallback на mock нет.

Гость может читать общие вымышленные данные. Создание, AI-анализ, генерация, редактирование,
approve/reject ответа и смена статуса разрешены только для обращения, принадлежащего
активному гостевому сеансу. Проверка ответа идёт через его настоящий feedbackId в БД,
не через присланные клиентом поля. Все старые записи без guest metadata доступны гостям
только для чтения. Это включает пять синтетических ID `90000000-...-000001` — `...000005`.
Ни чужая запись, ни общий пример не расходуют AI quota при запрещённой операции.
Они не становятся собственностью посетителя по знанию UUID, IP, HTTP-заголовка или кода из UI.

Это демонстрационный workspace с публичными данными, не приватный кабинет и не tenant isolation.
Не вводить реальные персональные, клиентские или конфиденциальные данные. Изменения своего
обращения видны другим посетителям. Из UI можно перейти к созданию собственной копии примера;
копия создаётся только после подтверждения формы, без изменения исходной записи.

## Гостевая сессия и same-origin proxy

GET `/api/v1/demo/session` сообщает `mode: guest`; анонимный просмотр не создаёт сессию
и не записывает cookie. До получения режима отображается только нейтральное «Открываем демо…»;
форма/карточка входа не вспыхивает даже при cold start. При первом сохранении формы frontend вызывает POST
`/api/v1/demo/session/guest` с JSON и затем проверяет, что браузер сохранил cookie.
Внутри вкладки старт объединяется в один запрос; ошибки не повторяются автоматически.
Cookie не попадает в localStorage/sessionStorage, body, URL или публичные DTO.

Production cookie: `__Host-resolve_guest`, 32 случайных байта в base64url, `Secure`,
`HttpOnly`, `SameSite=Lax`, `Path=/`, без Domain. Local: `resolve_guest`, без Secure.
В PostgreSQL сохраняется только HMAC-SHA256 verifier с отдельным server secret,
срок окончания и дата создания. Raw cookie в БД нет. Секрет не передаётся браузеру.
Сессия переживает рестарт Render; server-side logout удаляет verifier и запрещает replay.
Истечение срока проверяет сервер. Смена `DEMO_SESSION_SECRET` делает прежние cookie недействительными.

Обычный срок — 12 часов, без sliding renewal. После logout/истечения/удаления cookie
прежние обращения остаются общедоступными для чтения до конца хранения; восстановить
права без исходного действующего cookie нельзя. Следующее создание начнёт новый сеанс.
Кнопка «Завершить сеанс» именно завершает права редактирования, а не удаляет обращения.
Одновременно начатые первые сеансы в разных вкладках могут конкурировать за cookie;
для приёмки сначала создайте одно обращение, затем открывайте дополнительные вкладки.

Vercel `/api/*` → Render сохранён. Все браузерные запросы same-origin, `VITE_API_URL`
пустой; `credentials: include`, `Cache-Control: no-store`. Vercel config/build/SPA rewrite
не менялись. Прямой Render GET публичных demo данных теперь намеренно даёт 200.
Прямой POST/PATCH требует действующий guest cookie, точный Origin/JSON и владение записью.

Origin не является доказательством личности: произвольный HTTP-клиент может подделать его
и получить свой анонимный сеанс. Он всё равно не получает права на чужие записи и не
обходит глобальные PostgreSQL AI-квоты или жёсткие ограничения объёма хранения.
`TRUST_PROXY_HOPS=0` не доверяет raw X-Forwarded-For; IP посетителей за Render может быть общим.
Не повышать hops без отдельной проверки всей proxy topology и прямого пути к Render.

## Ограничения стоимости, нагрузки и хранения

Значения в `render.yaml`:

| Переменная | Значение | Смысл |
| --- | ---: | --- |
| `AI_LIMIT_PER_IP_MINUTE` | 3 | AI attempts / peer IP / UTC минута |
| `AI_LIMIT_PER_IP_DAY` | 10 | AI attempts / peer IP / UTC день |
| `AI_LIMIT_GLOBAL_DAY` | 30 | AI attempts суммарно / UTC день, PostgreSQL |
| `OPENAI_MAX_OUTPUT_TOKENS` | 2000 | Максимум выходных токенов одного вызова, включая невидимые токены |
| `OPENAI_TIMEOUT_MS` | 30000 | Тайм-аут SDK, без автоматических повторов |
| `DEMO_READ_PER_IP_MINUTE` / `DEMO_READ_GLOBAL_MINUTE` | 120 / 600 | Application/session GET/HEAD и все unsafe attempts до cookie/DB lookup |
| `DEMO_GUEST_SESSION_PER_IP` / `DEMO_GUEST_SESSION_GLOBAL` | 20 / 100 | Запросы старта гостевого сеанса / 15 минут |
| `DEMO_WRITE_PER_IP_MINUTE` / `DEMO_WRITE_GLOBAL_MINUTE` | 20 / 60 | Unsafe requests, включая guest session routes |
| `DEMO_CREATE_GLOBAL_DAY` | 50 | Создания обращений / UTC день |
| `DEMO_GUEST_MAX_SESSIONS` | 1000 | Жёсткий предел активных guest session rows, PostgreSQL |
| `DEMO_GUEST_MAX_RECORDS` | 500 | Жёсткий предел всех гостевых обращений, PostgreSQL |
| `DEMO_GUEST_RECORDS_PER_SESSION` | 5 | Максимум обращений одного сеанса, PostgreSQL |
| `DEMO_GUEST_RETENTION_HOURS` | 24 | Срок видимости и редактирования гостевой записи |
| `DEMO_GUEST_AI_OPERATIONS_PER_RECORD` | 20 | Предел AI attempts на одну запись, PostgreSQL |

API defaults отличаются от Render у трёх прежних лимитов: AI 5/20/100, writes/IP 30,
creation/day 100. Deployment задаёт более консервативные значения явно.
Output tokens валидируются в диапазоне 256–4096, timeout 1000–60000 мс; это server env.
Модель не заменялась, prompt versions/правила, Structured Outputs/Zod, `store:false`,
минимизация контекста и `maxRetries:0` сохранены. При timeout/ошибке/неполном выводе
нет fallback, скрытого повтора или ложного успешного результата. Расход уже начатого вызова
возможен; quota reservation не возвращается.

Глобальная PostgreSQL AI quota проверяется перед каждой попыткой вызова, включая auto-analysis
перед генерацией ответа (это два вызова). IP quotas — дополнительный барьер, не защита бюджета.
Перезапуск/новые cookie/смена IP не сбрасывают глобальный дневной счётчик.
Лимиты количества вызовов и токенов не равны точному денежному бюджету: цена зависит от модели,
входного контекста и тарифа. OpenAI project usage/alerts контролируются владельцем отдельно.
Один настойчивый посетитель способен исчерпать общую квоту; это ожидаемый предел открытого демо.

Пределы чтений, старта сеанса, обычных writes и creations/day остаются in-memory для одного
Render instance. Они сбрасываются при рестарте. Оставить один процесс/экземпляр; не включать
автомасштабирование. Durable AI/storage/session caps не зависят от этих in-memory counters.
Health исключён из read limiter; новые неаннотированные контроллеры в guest mode закрыты.

Хранение ограничено без cron/jobs/Redis. При следующем guest creation транзакция:
1. Берёт transaction-scoped PostgreSQL advisory lock для общего admission limit.
2. Проверяет активный session verifier.
3. Удаляет только истёкшие записи с **непустым guest owner**, созданные этим новым маршрутом.
4. Проверяет global/per-owner count и вставляет новую запись с серверным owner/expiry.

Удаление каскадно очищает связанные analyses/generations/replies только этой записи.
Все старые строки имеют NULL metadata и не подходят под очистку. SQL CHECK дополнительно
запрещает guest metadata на пяти фиксированных demo ID. Никакого backfill, reset, upsert
старых обращений или изменения AI counters здесь нет.
Просроченные guest rows скрыты в списке/Dashboard/details и запрещены для изменений сразу;
физическое удаление происходит при следующем создании. В период без новых созданий
они могут храниться дольше TTL, но их количество не превышает cap. То же для expired sessions:
они не работают, физически очищаются при следующем старте сеанса.

Atomic per-record AI reservations ограничивают накопление дочерней истории даже без live AI
в локальном mock-режиме. Неуспешные попытки, включая отказ общей AI-квоты, тоже расходуют
per-record allowance; его задача — дополнительный жёсткий предел. При 500 × 20 — максимум
10 000 AI attempts на одновременно хранимые guest rows, максимум три ответа на generation.
Прежняя история обычных/code-записей и AI counter retention не чистятся этим этапом.

429 сохраняет `AI_USAGE_LIMIT_EXCEEDED`/Retry-After; новые ограничения используют
`DEMO_RATE_LIMIT_EXCEEDED` с отдельными scopes и Retry-After. Запрет чужого редактирования —
403 `{code: "DEMO_READ_ONLY"}`; нет cookie/истекла сессия — 401; malformed JSON — 400;
body >32 KiB — 413; не JSON — 415. Технические ошибки редактируются до безопасного сообщения.

## Additive migration и существующая Neon

Новая migration: `prisma/migrations/20261027120000_passwordless_guest_access/migration.sql`.
Она добавляет к `feedback_items` nullable `guest_owner_key`, `guest_expires_at`, счётчик
`guest_ai_operations` с default 0, два индекса и CHECK согласованности. Создаёт небольшую
таблицу `demo_guest_sessions` с индексом expiry. Существующие бизнес-поля не обновляет.
Все исторические SQL сохраняются побайтно, включая дополнительный LF у init migration.

Порядок после локальной приёмки и отдельного решения о публикации:

1. Проверить baseline/diff, backup policy и точную выделенную Neon DB по console.
2. В отдельном shell задать существующий безопасный `DIRECT_URL` с
   `sslmode=require&sslaccept=strict`, точные `PUBLIC_DEMO_DB_HOST` / `PUBLIC_DEMO_DB_NAME`,
   `NODE_ENV=production`, `PUBLIC_DEMO_CONFIRM=migrate-public-demo`.
3. Выполнить `pnpm db:demo:migrate` один раз; затем проверить migration status через
   установленный Prisma CLI с той же direct URL. Это ручное действие владельца, не build/start hook.
4. Только затем запускать новую API-версию. Старый код совместим с additive schema.
   Guest API до применения migration корректно откажет, а не перейдёт на незащищённый режим.
5. Сохранить существующие OpenAI key, DATABASE_URL, origin и server secret. Установить
   `DEMO_ACCESS_MODE=guest`, `DEMO_ACCESS_ENABLED=true`; код доступа больше не требуется.
6. Vercel env/proxy сохранить. Облачный smoke провести отдельно до распространения URL.

**В implementation-pass ни одна команда не направлялась в Neon.** Не запускать `db:seed`,
`migrate reset`, `db push`, ручное исправление `_prisma_migrations` или массовое удаление.
Повторный initializer не нужен, если пять примеров уже есть. Исторические checksums не менять.
DDL получает обычные PostgreSQL locks; применять вне активной демонстрации.

Для возврата к защищённому режиму установить `DEMO_ACCESS_MODE=code`, оставить controls=true,
задать случайный `DEMO_ACCESS_CODE`, перезапустить API и обновить frontend-сеанс. Это обратимый
переключатель конфигурации, без rollback/drop migration и без удаления demo данных.
Не откатывать публичный API к ungated development.

## Локальный QA (PowerShell, из корня репозитория)

Начать с чистой ветки на baseline. Применить только патчи этого pass через `git am` по порядку.
После ошибки Git не продолжать и не делать reset; сверить tree hash с отчётом поставки.
Node 24+, pnpm 11.19.0. Docker Desktop должен работать. БД ниже одноразовая, только loopback:

```powershell
docker run --name resolve-signal-guest-qa -e POSTGRES_DB=resolve_signal_demo_test -e POSTGRES_USER=resolve_test -e POSTGRES_PASSWORD=resolve_test -p 127.0.0.1:5545:5432 -d postgres:17-alpine
docker exec resolve-signal-guest-qa pg_isready -U resolve_test -d resolve_signal_demo_test
```

Дождаться ready; после любой ошибки остановиться. В отдельном терминале:

```powershell
$env:NODE_ENV = 'test'
$env:AI_PROVIDER = 'mock'
$env:DEMO_ACCESS_ENABLED = 'false'
$env:DEMO_ACCESS_MODE = 'code'
$env:DATABASE_URL = 'postgresql://resolve_test:resolve_test@127.0.0.1:5545/resolve_signal_demo_test?schema=public'
$env:AI_USAGE_TEST_DATABASE_URL = $env:DATABASE_URL
$env:PUBLIC_DEMO_TEST_DATABASE_URL = $env:DATABASE_URL
$env:GUEST_TEST_DATABASE_URL = $env:DATABASE_URL
$env:VITE_API_URL = ''
corepack pnpm install --frozen-lockfile
corepack pnpm exec prisma validate
corepack pnpm db:migrate
corepack pnpm db:seed
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
```

Каждую команду выполнять по очереди, exit code должен быть 0. Интеграционные тесты
очищают свои namespaces/counters; разрешена только указанная отдельная локальная DB.
Ожидается отсутствие SKIP при всех трёх заданных test URLs. CI настроен так же.

Добавить пять synthetic examples через guarded initializer и переключить runtime в guest:

```powershell
$env:DIRECT_URL = $env:DATABASE_URL
$env:PUBLIC_DEMO_DB_HOST = '127.0.0.1'
$env:PUBLIC_DEMO_DB_NAME = 'resolve_signal_demo_test'
$env:PUBLIC_DEMO_ALLOW_LOCAL = 'true'
$env:PUBLIC_DEMO_CONFIRM = 'init-public-demo'
corepack pnpm db:demo:init
corepack pnpm db:demo:init
# Первый init: 5; повторный: 0. Не сбрасывать БД.
$env:NODE_ENV = 'development'
$env:DEMO_ACCESS_ENABLED = 'true'
$env:DEMO_ACCESS_MODE = 'guest'
$env:DEMO_SESSION_SECRET = node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('base64url'))"
$env:CORS_ORIGIN = 'http://localhost:5173'
corepack pnpm dev
```

Секрет генерируется локально, не выводится/не коммитится; .env не перезаписывать.
Браузер: `http://localhost:5173`. Новый профиль/инкогнито — второй независимый гость.

Проверить:

- Dashboard/прямые `/feedback/new` и `/feedback/:id` без формы кода; светлый responsive UI.
- Пять examples — read-only, копирование ведёт к заполненной форме без изменения оригинала.
- Первый submit создаёт cookie; собственное обращение проходит mock analyze/replies/edit/approve/status.
- Второй профиль видит данные, но не может менять первое обращение/ответ, в том числе через API.
- Reload/новая вкладка сохраняют владение. Перезапуск API сохраняет guest cookie и владение.
- Logout отзывает cookie; повторный запрос со старой cookie получает 401, чтение остаётся открытым.
- Без/с чужим Origin unsafe-запрос отклоняется; form-encoded →415, большой body →413,
  malformed JSON →400; raw XFF не меняет доверенный peer IP.
- HTML/script в обращениях/ответах показывается текстом; DOM не создаёт img/script из данных.
- Caps: уменьшить env в этом локальном контуре и перезапустить. Проверить 429 и понятные сообщения,
  сохранность записи при отказе, отсутствие automatic mutation retry.
- Для проверки возврата к code mode задать mode=code и отдельный случайный access code:
  anonymous GET →401, форма входа возвращается; guest-start endpoint →404.

`/health` →200; `/api/docs` и `/api/docs-json` →404 при включённых controls. После QA закрыть shell
с test env и остановить только `resolve-signal-guest-qa`. Live OpenAI smoke не входит в эти команды.

## Облачная приёмка после отдельного разрешения

Проверить реальный Vercel Set-Cookie/дальнейший Cookie, HTTPS Secure/host-only, SPA routes,
прямой Render GET=200 и отказ unauthorized/foreign writes, cold start, expiration, no-store.
После отдельного разрешения на расходы — один короткий live сценарий с фиктивным обращением:
provider=openai, модель из env, нет mock fallback, token/time caps не обрезают типичный ответ.
Реальные key/model permissions и качество ответа без платного запроса не подтверждаются.

Источники для новых механизмов: [OWASP sessions](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html),
[PostgreSQL transaction advisory locks](https://www.postgresql.org/docs/17/explicit-locking.html),
[Responses max_output_tokens](https://developers.openai.com/api/reference/typescript/resources/responses/methods/create).
