# Passwordless guest pass: результаты и границы проверки

Дата: 27.10.2026. Ветка `feat/passwordless-public-demo`, baseline
`ae542fc388dd3564cff2e7b011d11a9ac9a1bed2` подтверждён через GitHub и локальный clone.
Проверялся исходный код именно этого baseline, предыдущие ZIP/ветки не использовались.

## Реально выполнено

Среда Work: Node 24.22.1, pnpm 11.19.0, Prisma Client/CLI 6.19.3.
Production Node pin в Render 24.19.0 сохранён. Новых зависимостей нет; lockfile не изменён.

| Команда / проверка | Результат |
| --- | --- |
| `corepack pnpm install --frozen-lockfile` | PASS, Prisma Client generated |
| `corepack pnpm exec prisma validate` | PASS |
| `prisma migrate diff --from-schema-datamodel <baseline> --to-schema-datamodel prisma/schema.prisma --script` | PASS: только три новых столбца, таблица sessions и индексы; CHECK описан вручную в новой migration |
| `corepack pnpm lint` | PASS |
| `corepack pnpm typecheck` | PASS |
| `corepack pnpm test` | 236 PASS / 9 SKIP / 0 FAIL |
| `corepack pnpm build` | PASS: API и web |
| `git diff --check` | PASS после удаления лишнего завершающего LF только из изменённого CSS |
| Исторические SQL | Побайтно равны baseline, три SHA-256 ниже |
| Compiled API + built Vite preview HTTP smoke | PASS с in-memory persistence/quota test doubles, без настоящей БД |
| Новая migration на PostgreSQL / настоящий DB-backed startup | BLOCKED: локальной PostgreSQL нет |
| Browser smoke | BLOCKED: Chromium отсутствует, установка браузера вернула повреждённый/пустой архив |
| Live OpenAI / Vercel / Render / Neon / remote CI | НЕ ЗАПУСКАЛИСЬ |

Суммарно 36 passed test files и 3 skipped files (39). По пакетам:

- Contracts: 7 PASS.
- API: 132 PASS / 8 SKIP.
- Web: 67 PASS.
- Operations: 30 PASS / 1 SKIP.

Baseline содержит 194 теста; после pass 245: добавлен 51 тест, существующие сохранены.
Три прежних DB-теста и шесть новых требуют настоящую PostgreSQL.

## Что проверяют новые тесты

- Production guest mode без access code, но с обязательными controls/secret/live provider/AI quotas/TLS.
- Anonymous Dashboard/list/details/runtime, отсутствие session allocation при просмотре.
- Default-deny для новых неаннотированных endpoints и прямых unauthorized mutations.
- Cookie format/HttpOnly/Secure/host-only, keyed verifier, secret rotation, logout/replay,
  malformed/duplicate token, storage failure, expiry, отсутствие verifier в JSON.
- Все пять synthetic examples: запрет status/analyze/replies до quota/provider.
- Другой гость: запрет edit/approve/status/AI, parent ownership для reply, mass-assignment rejection.
- Owner workflow: create → analysis → replies → edit → approve/reject → status.
- Origin, JSON Content-Type, body size, malformed JSON, UUID validation, XFF spoofing.
- Pre-auth limiter ограничивает поддельные cookie до lookup в PostgreSQL.
- Plain-text XSS rendering, read-only controls, ссылка на собственную копию.
- Guest/read/global limits и 429/Retry-After; прежний PostgreSQL AI contract сохранён.
- Lazy session start, blocked cookies, expiry/logout без возврата к password form, no automatic retry.
- OpenAI SDK requests сохраняют `store:false`/`maxRetries:0` и получают output token/time bounds.
- Запрет destructive seed для guest mode.

Шесть новых PostgreSQL integration tests (пока SKIP в Work) проверяют:

1. Session persistence после пересоздания сервиса, cookie attributes и revoke.
2. Atomic global/per-owner admission при восьми конкурентных созданиях.
3. Atomic per-record AI cap при 12 конкурентных attempts; чужие/legacy rows не меняются.
4. TTL cleanup только tagged guest rows и их children; старые записи сохранены побайтно по полям.
5. Atomic session cap, expiration pruning, запрет создания от revoked session.
6. CHECK согласованности metadata и запрет tagging каждого из пяти demo IDs.

Они включаются через `GUEST_TEST_DATABASE_URL` и требуют disposable local
`resolve_signal_demo_test`. CI обновлён, но удалённый CI не запускался: push запрещён.
Инструкция полного локального прогона — `PASSWORDLESS_PUBLIC_DEMO.md`.

## HTTP smoke и реальные ограничения среды

Реально запущены compiled Nest AppModule на localhost:4000 и built Vite preview на 5173.
Проверены health 200, прямой public GET 200, unauthorized POST 401, Swagger JSON 404,
proxy POST guest-session с forwarded HttpOnly cookie, create/read own permissions,
anonymous read-only, example mutation 403, proxy logout, direct old-cookie replay 401,
прямой SPA `/feedback/new` 200. Серверы после проверки остановлены.
Это проверка настоящего HTTP/proxy/bootstrap wiring с подменёнными repositories, не PostgreSQL smoke.

`pnpm db:migrate` реально запускалась только на loopback test URL: exit 1, P1001 (нет сервера).
`node apps/api/dist/main.js` с той же локальной БД: exit 1 с безопасным общим startup сообщением,
без утечки DSN/секрета. Это не успешный DB-backed запуск. Docker/Postgres binaries отсутствуют;
попытка apt update завершилась отказом системных прав, установка не выполнялась.
Schema diff/validate не доказывают выполнение SQL CHECK/advisory locks на настоящей PostgreSQL.

Playwright установлен, Chromium — нет. Запуск браузера остановлен на отсутствующем executable;
попытка стандартной установки браузера завершилась ошибкой ZIP. Скриншотов/визуального PASS нет.
React DOM user-flow tests прошли; ручная проверка браузера и реального cookie/proxy остаётся QA gate.

Build предупреждает о PURE annotations существующей Zod dependency и chunk >500 kB.
Это предупреждения, exit code 0; code splitting вне текущего этапа.

## Исторические миграции сохранены

| Migration | SHA-256 |
| --- | --- |
| `20260830150000_init/migration.sql` | `140a0f841318d8a84761aa50c5ed1d2225b3caa0b468cbd0e78cec3ffcd50bae` |
| `20260915155912_reply_generation_history/migration.sql` | `33a6790d5390d1ec2011f5bfda2ec672c375ce631f8a778d166699df88294651` |
| `20260917120000_ai_usage_counters/migration.sql` | `0e060585b13f8ec2ce72a3b615dc44b789805716ee505ef24d0a732294ca85cc` |

Дополнительный LF init migration сохранён. На Windows перед миграциями сверить `Get-FileHash`
с этими значениями; при несовпадении остановиться, не применять reset/ручную смену checksum.
Новая migration `20261027120000_passwordless_guest_access` additive; существующие записи не backfill'ятся.

## Что остаётся на приёмку

- Все 9 DB integration tests без SKIP; применение migration к одноразовой локальной БД.
- Настоящий API startup, initializer 5/0, два браузерных профиля, reload/restart/logout.
- Review default caps/TTL, режима общего чтения и отсутствия восстановления гостевых прав без cookie.
- После отдельного разрешения — cloud smoke Vercel/Render/Neon и короткий платный OpenAI smoke.
- Retention прежних AI usage counters отдельно, без изменения текущего reservation SQL.

Никаких push, PR, merge, deployment, облачных изменений, платных запросов, Agent V2/Telegram/V3.
