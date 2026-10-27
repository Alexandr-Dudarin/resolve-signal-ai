# Защищённое демо ResolveSignal AI: режим code и инфраструктура

**Обновление 27.10.2026:** этот документ описывает прежний `DEMO_ACCESS_MODE=code`.
Для passwordless guest mode действует [новая инструкция](PASSWORDLESS_PUBLIC_DEMO.md):
публичные GET намеренно открыты, собственные записи защищены guest cookie. Текущий
`render.yaml` выбирает guest; код доступа требуется только при возврате в code mode.

Дата исходного документа: 21.10.2026. Основа: `258f506e4900292f34ee6d3cfc94a81cc89bf685`.
Этот документ — инструкция для владельца проекта **после review и локальной приёмки**.
В implementation-pass сервисы не создавались, deployment/PR/push не выполнялись,
платные OpenAI-вызовы не выполнялись. Облачный smoke test ещё обязателен.

## Границы и схема доступа

Одно общее демонстрационное пространство для всех, кому автор лично передал код.
Все участники видят обращения, ответы и изменения друг друга. Нельзя вводить
реальные персональные, клиентские или конфиденциальные данные. Это не tenant isolation,
не RBAC и не полноценная пользовательская авторизация. UI сообщает об этом до входа
и внутри приложения. Начальные пять обращений синтетические, без фиктивных AI-результатов:
анализ и генерация выполняются отдельно выбранным серверным провайдером.

Браузер → HTTPS Vercel `/api/*` → HTTPS Render `/api/*` → выделенная Neon DB / OpenAI.
В браузере `VITE_API_URL` пустой: запросы идут на собственный origin. Vercel external rewrite
сохраняет браузерный URL. Backend выдаёт host-only `__Host-resolve_demo` cookie:
HttpOnly, Secure (production), SameSite=Lax, Path=/, без Domain. При ответе через Vercel
cookie принадлежит origin frontend; браузеру не нужны third-party cookies к Render.
В cookie только случайный ID, время окончания и HMAC-SHA256 подпись.
Подпись проверяется сервером вместе с наличием сессии в ограниченном хранилище процесса.
Сессия по умолчанию 12 часов, logout отзывает её сразу; старую cookie нельзя воспроизвести.
Перезапуск Render отзывает все сессии. Максимум 1000 активных сессий, просроченные удаляются.
Код сравнивается через constant-time сравнение SHA256-дайджестов.

Глобальный Nest guard закрывает все контроллеры данных и AI, включая runtime status,
GET/HEAD, POST и PATCH. Без авторизации прямой вызов Render тоже получает 401.
Исключения: `/health`, GET/POST `/api/v1/demo/session`, POST `/api/v1/demo/session/logout`.
Preflight OPTIONS не возвращает данные. Swagger HTML/JSON отсутствует при включённом gate
и в production. Все API-ответы `Cache-Control: no-store`, включая ошибки.
Не нужно передавать в proxy второй секрет: безопасность прямого backend обеспечивается тем же guard.

Для всех unsafe-запросов gated API, включая login/logout, нужен точный `Origin=CORS_ORIGIN`
и `Content-Type: application/json`. Origin отсутствует или отличается → 403; неверный
Content-Type → 415. Это CSRF-защита, **не** замена проверки кода/cookie: HTTP-клиент может
подделать Origin, но это не создаёт авторизацию. Body ограничен 32 KiB. Содержимое ошибок
SDK/Prisma не выводится клиенту или в bootstrap-логи. Не включайте логирование кодов,
cookie, Authorization, connection strings, request bodies либо исходных exception objects.

## Single-instance ограничения и стоимость

Render должен запускать **один процесс / один экземпляр**. Login limiter и non-AI mutation
limiter находятся в памяти; при рестарте сбрасываются. Rolling deploy может временно иметь
старый и новый процесс: возможен повторный вход и независимые лимиты записей.
Не увеличивать число instances без отдельной переработки session store / abuse limiter.
Это ограничение не относится к PostgreSQL AI-квотам: они сохраняются при рестарте и атомарны.

Пределы из env: login IP 5 / global 30 за фиксированное 15-минутное UTC окно;
все авторизованные mutations IP 30 / global 60 за минуту; создание 100 за UTC день.
В `render.yaml` установлены более консервативные 20 изменений/IP/мин и 50 новых обращений/день.
Неуспешные/невалидные действия тоже могут расходовать лимит, успешный login тоже считается.
HTTP 429 содержит `DEMO_RATE_LIMIT_EXCEEDED`, scope и retryAfterSeconds, а также Retry-After.
Отклонённая операция не вызывает application service. Logout не расходует mutation quota.

Существующие AI-квоты: 5/min/IP, 20/day/IP, 100/day global по умолчанию;
для демо предложены **3 / 10 / 30**. AI-анализ и генерация ответов — отдельные операции.
Неуспешный provider attempt после reservation расходует квоту. Mock не создаёт counters.
Семантика SQL reservation и `AI_USAGE_LIMIT_EXCEEDED` не менялась.
Это лимит числа операций, **не денежный бюджет**: токены/модель влияют на стоимость.
Отдельно настройте OpenAI project budget alerts/доступные ограничения расходов и следите за usage.
Дневные AI-квоты — дополнительная защита, не гарантия точной суммы расходов.
OpenAI key только на backend; `store:false`, `maxRetries:0`, Zod/Structured Outputs и
граница недоверенных JSON-данных остаются прежними. Нет автоматического fallback на Mock.

`TRUST_PROXY_HOPS=0` оставлен намеренно: X-Forwarded-For игнорируется. В облаке многие
посетители могут делить IP reverse proxy и общий IP-лимит. Это консервативное ограничение.
Не поднимать hops до проверки всей топологии Vercel → Render edge → Express **и прямого
пути к Render**: разное число hops способно сделать подмену XFF возможной.
Проверка topology — отдельный acceptance item, не обещание точного visitor IP.

## Список переменных (имена; реальные значения только вне Git)

| Где / этап | Публичные и несекретные имена | Секретные имена |
| --- | --- | --- |
| Vercel, configuration/build | `RENDER_API_ORIGIN`, `VITE_API_URL` | нет |
| Render, build | `NODE_VERSION`, `NODE_ENV` | не требуются для генерации Prisma Client/сборки |
| Render, runtime | `NODE_ENV`, `PORT`, `CORS_ORIGIN`, `AI_PROVIDER`, `OPENAI_MODEL`, `AI_USAGE_LIMITS_ENABLED`, `AI_LIMIT_PER_IP_MINUTE`, `AI_LIMIT_PER_IP_DAY`, `AI_LIMIT_GLOBAL_DAY`, `TRUST_PROXY_HOPS`, `DEMO_ACCESS_ENABLED`, `DEMO_SESSION_TTL_SECONDS`, `DEMO_LOGIN_PER_IP`, `DEMO_LOGIN_GLOBAL`, `DEMO_WRITE_PER_IP_MINUTE`, `DEMO_WRITE_GLOBAL_MINUTE`, `DEMO_CREATE_GLOBAL_DAY` | `DATABASE_URL`, `OPENAI_API_KEY`, `DEMO_ACCESS_CODE`, `DEMO_SESSION_SECRET` |
| Ручные DB-команды, только в shell оператора | `PUBLIC_DEMO_DB_HOST`, `PUBLIC_DEMO_DB_NAME`, `PUBLIC_DEMO_CONFIRM`, `PUBLIC_DEMO_ALLOW_LOCAL`, `NODE_ENV` | `DIRECT_URL` |
| Изолированные локальные/CI тесты | `AI_PROVIDER`, `DEMO_ACCESS_ENABLED`, `NODE_ENV`, `VITE_API_URL` | `DATABASE_URL`, `AI_USAGE_TEST_DATABASE_URL`, `PUBLIC_DEMO_TEST_DATABASE_URL` (только одноразовая тестовая БД) |

Render предоставляет PORT; default для локальной разработки 4000. Bind: `0.0.0.0`.
Приложение в production по умолчанию выбирает gate и OpenAI; явно задайте оба в dashboard.
Отсутствие секретов, disabled gate/quotas, Mock в production, HTTP origin или отсутствие
`sslmode=require&sslaccept=strict` у DATABASE_URL блокируют запуск.
`CORS_ORIGIN` — один точный HTTPS origin frontend, без пути и завершающего `/`.

Секреты генерировать **независимо** через `node:crypto.randomBytes` или password manager.
Код: минимум 16 случайных байт → 22 base64url символа; signing secret: минимум 32 байта → 43 символа.
Оба: только `A-Z a-z 0-9 _ -`, максимум 128 символов, минимум 12 разных символов, не совпадают.
Проверка формы не доказывает энтропию: не придумывайте код вручную. Не вставлять секреты в Git,
чат, скриншоты, командную строку CLI или `VITE_*`. Распространять код лично, не помещать в README/URL.

## Последовательная публикация (выполняет владелец после приёмки)

1. Принять diff и проверки по `PUBLIC_DEMO_VALIDATION.md`. Зафиксировать принятый HEAD.
   Публикация ветки/PR/merge — отдельное решение вне этого implementation-pass.
2. Создать отдельный Neon project/database для демо в подходящем регионе. Имя БД должно
   включать `demo` (например, `resolve_signal_demo`), только lowercase буквы/цифры/underscore.
   Не использовать существующую локальную/боевую БД, не выгружать туда её данные.
3. Скопировать в защищённые env две URL: pooled для runtime `DATABASE_URL`, direct для
   ручного `DIRECT_URL`. Prisma в проекте **6.19.3**, не Prisma 7 adapter.
   Для обоих обязательны `sslmode=require&sslaccept=strict`; поддерживается `channel_binding=require`.
   Для малого API разумен `connection_limit=3` и `connect_timeout=30`.
   Direct endpoint без `-pooler` нужен нашему guard миграций/инициализатора даже если облачный
   pooler способен выполнять migration. Схема `public`, не переопределять host/options.
   Проверьте hostname и database name независимо по Neon console. Не отключать TLS при ошибке.
4. В отдельном shell задать DIRECT_URL, точные PUBLIC_DEMO_DB_HOST / PUBLIC_DEMO_DB_NAME,
   NODE_ENV=production, PUBLIC_DEMO_CONFIRM=migrate-public-demo. Выполнить из корня:
   `pnpm db:demo:migrate`. Команда проверяет allowlist и запускает установленный
   `prisma migrate deploy` с DATABASE_URL, заменённым на проверенный DIRECT_URL **только в дочернем процессе**.
   Нет fallback к обычной DATABASE_URL. Нет reset, db push, изменения checksums или destructive seed.
   При checksum mismatch остановиться; исторические SQL не редактировать.
5. В этом же shell изменить только PUBLIC_DEMO_CONFIRM на init-public-demo и выполнить
   `pnpm db:demo:init`. Первое выполнение вставит 5 синтетических обращений; повторное — 0.
   Используется createMany/skipDuplicates, без update/delete, без AI-запросов. История ответов,
   edits и counters сохраняются. Завершить shell / удалить временные секретные env.
6. Создать Render Web Service с **корнем репозитория**, не `apps/api`. Использовать `render.yaml`
   как конфигурацию для проверки, а не разрешение автоматически provision сервис.
   Node 24.19.0, pnpm 11.19.0 из packageManager, один instance, Free для начала.
   Build: `corepack pnpm install --frozen-lockfile --prod=false && corepack pnpm contracts:build && corepack pnpm --filter @resolve-signal/api build`.
   Postinstall генерирует Prisma Client, БД при сборке не требуется.
   Start: `node apps/api/dist/main.js`; health `/health`; auto-deploy выключен.
   Никаких migration/seed в build/start/predeploy hooks. Заполнить все runtime env.
7. Выбрать стабильный frontend origin в Vercel; указать именно его в Render CORS_ORIGIN.
   Создать Vercel project с корнем репозитория, Node 24.x. `vercel.ts` задаёт install/build/output:
   install с devDependencies (`--prod=false`), сначала contracts, потом web, output `apps/web/dist`.
   Установить RENDER_API_ORIGIN в **фактический** HTTPS `*.onrender.com` origin созданного API,
   без `/` в конце. Конфигурация откажет при отсутствии/ошибке; фиктивного fallback нет.
   `VITE_API_URL` оставить незаданным/пустым. В Vite это build-time значение; смена требует rebuild.
   API rewrite расположен до SPA fallback; `/feedback/new` и `/feedback/:id` открываются напрямую.
   Не класть OpenAI, DB или demo secrets в Vercel frontend env.
8. После публикации выполнить smoke ниже. До успешной проверки браузерной cookie/proxy и прямого
   Render-доступа не распространять ссылку/код. Preview URL не равен production origin:
   не расширять CORS до wildcard; для preview нужен отдельный изолированный контур либо
   проводить приёмку через один согласованный origin. На Preview не подключать production demo DB случайно.
9. Передать рекрутеру URL и код разными сообщениями/лично. Сообщить об общих вымышленных данных.

## Облачный smoke после отдельного разрешения на deployment

- На чистом браузере открыть `/feedback/new`: только экран входа, без dashboard flash.
- Через frontend `/api/v1/feedback` и напрямую Render `/api/v1/feedback` без cookie: 401.
  То же для POST/PATCH; XFF/X-Forwarded-Host не дают доступ. `/health`: 200, Swagger: 404.
- Неверный код: generic 401, после лимита: 429/Retry-After. Отсутствующий/чужой Origin при
  login/logout и unsafe data requests: 403. Non-JSON: 415, слишком большое body: 413.
- Войти через frontend. DevTools → Network: запросы только на frontend `/api/...`;
  Set-Cookie имеет `__Host-`, Secure, HttpOnly, SameSite=Lax, Path=/, без Domain. Cookie не в localStorage.
  Проверить request Cookie на следующем GET, отсутствие кэширования сессионных/API ответов.
- Reload, новая вкладка, прямой URL деталей: сессия сохраняется. Logout: старый cookie replay
  получает 401. Истечение срока/перезапуск API требует повторного входа.
- При разрешённом владельцем **платном** smoke убедиться в `provider=openai`, модели из env,
  создать вымышленное обращение, анализ, ответ, редактирование, approve/reject, status.
  Анализ/ответ — два отдельных live вызова. Проверить существующую семантику 429 и отсутствие retry.
- Проверить логирование: нет codes/cookies/DB URLs/SDK payloads. Проверить banner shared workspace.
- Проверить `TRUST_PROXY_HOPS=0` и то, какой серверный peer IP попадает в counters, включая прямой
  путь Render. Если общий лимит блокирует второго посетителя, это ожидаемое conservative поведение.

## Эксплуатация, откат, rotation и диагностика

Free может засыпать и долго просыпаться; экран входа показывает ошибку и кнопку повтора,
не делает автоматических login attempts. Сетевые ошибки при холодном старте не означают неверный код.
Upgrade Free → Starter меняет тариф существующего сервиса; код и Neon остаются теми же.
Сохранить single instance и env, перепроверить cookie/health после рестарта; автоматическое
масштабирование не включать. Точные тарифы и актуальные ограничения проверять в dashboard.

401: проверить срок cookie, HTTPS, Domain/Path, Origin, факт рестарта, совпадение среды;
ошибка login не сообщает существование отдельных пользователей. 403: сверить exact CORS_ORIGIN
и реальный Origin браузера; не принимать Host/XFF за Origin. 429: смотреть code/scope/Retry-After.
Не снимать gate или квоты ради демонстрации. Ошибка DB: проверить dedicated hostname/name,
direct vs pooled endpoint и TLS; не делать migrate reset. Bootstrap ошибки намеренно редактированы.

Rotation кода и signing secret: создать два новых независимых значения, обновить Render env,
перезапустить API, проверить отказ старой cookie и вход новым кодом. Все активные сессии теряются.
Rotation OpenAI key: выпустить новый серверный ключ, обновить Render, проверить отдельно
с разрешения владельца, отозвать старый. При утечке кода/ключа сначала прекратить доступ/отозвать секрет.
Не заменять backend только frontend-заглушкой: прямой API должен оставаться закрытым.

Откат: вернуться к последнему **принятому gated HEAD** для API/frontend, согласованно сохранить
origin/env. Если такого релиза ещё нет — остановить демо, а не откатывать публичный API на открытый baseline.
Этот pass не меняет schema, DB rollback не требуется. Не восстанавливать старый DB dump поверх
актуальных пользовательских демонстраций и counters; recovery обсуждать отдельно.

Maintenance follow-up: retention для истёкших `ai_usage_counters` и периодическая очистка
синтетических demo данных по отдельно принятой политике. В pass нет jobs/cron/Redis/Agent V2.

## Проверенные первичные источники

- [Vercel programmatic configuration](https://vercel.com/docs/project-configuration/vercel-ts)
- [Vercel external rewrites](https://vercel.com/docs/routing/rewrites)
- [Render monorepo](https://render.com/docs/monorepo-support), [Blueprint](https://render.com/docs/blueprint-spec), [Node version](https://render.com/docs/node-version)
- [Prisma 6 PostgreSQL / TLS](https://www.prisma.io/docs/orm/v6/overview/databases/postgresql)
- [Neon Prisma guide](https://neon.com/docs/guides/prisma)

Документы поставщиков проверены 21.10.2026. Конфигурация покрыта локальными тестами;
это не утверждение о состоявшемся облачном deployment.
