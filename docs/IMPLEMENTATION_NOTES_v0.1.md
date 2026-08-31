# ResolveSignal AI — Implementation Notes v0.1

## Scope checkpoint

This checkpoint intentionally stops before real LLM integration. Phase 0 is implemented, while Phase 1 is implemented as a persistent deterministic mock flow.

## Decisions

- `LLMProvider` and `FeedbackRepository` are explicit backend ports because they are real change points.
- No placeholder `OpenAIProvider` or OpenAI SDK was added; the next pass should implement the adapter only after reviewing the current contract.
- Prisma tables are limited to V1 entities (`feedback_items`, `feedback_analyses`, `suggested_replies`). Cases and agent audit tables remain Phase 2.
- The dashboard uses useful metrics and distribution bars rather than decorative charts.
- Agent Activity is not simulated in V1. The strongest dark Hybrid Intelligence treatment is used for AI Analysis, while the rest of the product remains light.
- Feedback list filtering by analysis currently matches any persisted analysis history; the UI displays the latest analysis. If repeated real-model analyses become common, the query should be revised to filter by the latest analysis only.
- The dashboard summary aggregates all feedback records in application memory. This is clear and adequate for the initial demo, but should become database aggregation before high-volume use.
- Reply update (`PATCH /api/v1/replies/:id`) was added because the approved V1 interface requires edit/approve/reject behavior.
- `LLMProvider` receives explicit minimized analysis/reply contexts instead of the full persisted feedback aggregate.
- Invalid UUID route parameters are rejected before Prisma access, and blank optional input strings normalize to missing values.
- Create and automatic analysis use distinct failure semantics: a successfully persisted feedback item is never reported as not created merely because analysis fails afterward.
- Written DESIGN_SPEC priority is reflected in a light product/data sidebar; deep navy remains reserved for high-value AI surfaces.
- Russian is the primary public demo language. Typed presentation dictionaries map unchanged English enum/database values to Russian labels without adding an i18n dependency.
- Seed feedback and deterministic `MockProvider` natural-language output are Russian; provider/API identifiers and stored enum values remain English.
- The primary Russian UX term for `FeedbackItem` is «обращение». «Отзыв» remains only where it describes a real source type or natural customer-facing reply copy, not the application entity.
- AI terminology is consistently presented as `AI-анализ` and `AI-демо`; the interface does not alternate between `AI` and `ИИ`.

## Intentional deferrals

- OpenAI SDK, Responses API, production prompts, model-specific Structured Outputs
- tool calling, agent policy, cases, agent history, Telegram
- background processing, retries, idempotent external side effects
- API credentials, webhooks, auth, RBAC, tenancy, billing
- Playwright browser suite and AI eval dataset (broader Phase 4 quality work)
- deployment and production infrastructure
