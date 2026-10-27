# ResolveSignal AI — текущий статус

Обновлено: 27.10.2026. Implementation-pass: `feat/passwordless-public-demo`.
Baseline main: `ae542fc388dd3564cff2e7b011d11a9ac9a1bed2`.
Предыдущий public-demo-readiness принят и объединён владельцем; baseline QA: 194 теста.

| Область | Статус |
| --- | --- |
| Phase 0 / Phase 1 / русская локализация | Сохранены |
| OpenAI / PostgreSQL AI quotas / XSS / prompt boundaries | Сохранены; добавлены token/time bounds |
| Вход по коду | Сохранён как `DEMO_ACCESS_MODE=code` |
| Passwordless guest mode | Реализован, ожидает review/локальной приёмки |
| Владение guest records / защита пяти примеров | Серверные проверки, PostgreSQL metadata |
| Ограничение накопления | TTL + atomic row/session caps + per-record AI attempts |
| Миграции | Одна additive migration; исторические SQL не изменены |
| lint / typecheck / build | PASS |
| Tests в Work | 236 PASS / 9 SKIP / 0 FAIL; DB tests требуют локальной PostgreSQL |
| HTTP proxy smoke | PASS с in-memory test doubles, не настоящей БД |
| Настоящий PostgreSQL startup / browser QA | Не подтверждены в этой среде; обязательны при приёмке |
| Cloud changes / deployment / live calls | Не выполнялись |
| Agent V2 / Telegram / V3 | Не начаты |

Основные инструкции: `PASSWORDLESS_PUBLIC_DEMO.md`, результаты: `PASSWORDLESS_VALIDATION.md`.
Текущий Render config выбирает guest, но требует enabled controls и реальный OpenAI.
Один API instance; hard AI/storage caps находятся в PostgreSQL. Публичное чтение означает,
что все новые demo данные должны быть вымышленными. Старые данные в Neon не изменялись.

Следующий шаг: review патчей в основном чате, применение на указанном baseline,
изолированная локальная PostgreSQL/браузерная приёмка. Публикация — отдельное решение владельца.
