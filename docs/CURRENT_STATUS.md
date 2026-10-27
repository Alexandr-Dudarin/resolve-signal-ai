# ResolveSignal AI — текущий статус

Обновлено: 21.10.2026. Текущий implementation-pass: `feat/public-demo-readiness`, baseline `258f506`.

| Область | Статус |
| --- | --- |
| Phase 0 / Phase 1 / русская локализация | Реализованы |
| Реальный OpenAI provider | Реализован ранее; сохраняется без изменения контрактов вызова |
| AI limits / PostgreSQL counters / XSS / prompt boundaries | Приняты на baseline; сохранены |
| Защищённый общий demo workspace | Реализован; один API instance, код доступа и временная cookie-сессия |
| Vercel / Render / Neon configuration | Подготовлена для review и отдельного deployment |
| Публичная публикация / облачный smoke | НЕ ВЫПОЛНЕНЫ |
| PostgreSQL integration tests в текущей Work-среде | SKIP: нет PostgreSQL/Docker; обязательны локально/в CI |
| Agent V2 / Telegram / multi-tenancy | НЕ НАЧАТЫ |

Полная инструкция — `PUBLIC_DEMO_DEPLOYMENT.md`; сценарии приёмки и результаты —
`PUBLIC_DEMO_VALIDATION.md`. Этот pass повторно реализован после утраты временного архива;
его новые коммиты не выдаются за старый HEAD `e0c940a`.

Follow-up перед длительной эксплуатацией: retention/cleanup истёкших `ai_usage_counters`,
контроль роста demo данных, проверка реальной proxy topology, облачный smoke и мониторинг расходов.
Нет нового фонового job или infrastructure dependency. Стоп после review artifacts: не deploy и не V2.
