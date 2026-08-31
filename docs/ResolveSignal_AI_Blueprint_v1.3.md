# ResolveSignal AI — Project Blueprint v1.3

**Status:** Approved baseline before implementation  
**Date:** 2026-08-30  
**Purpose:** single source of truth for development and handoff to another ChatGPT Work chat.  
**Open decisions:** none required before Phase 0.

**Companion source-of-truth documents:**
- `ResolveSignal_AI_Technical_Spec_v1.0.md` — concrete product/engineering requirements and acceptance criteria.
- `ResolveSignal_AI_DESIGN_SPEC_v1.0.md` — Hybrid Intelligence UI/design system and reusable UI migration rules.
- `ResolveSignal_AI_WORK_HANDOFF_v1.0.md` — bounded instructions for the first Work/Codex implementation pass.


**Documentation rule:** Markdown is the working source of truth for project context and handoff between chats. Do not regenerate/update the DOCX version during normal iterations unless explicitly needed later.

**Final working product name (2026-08-30):** `ResolveSignal AI`.

Naming rationale:
- `Signal` reflects the normalized input flowing into the platform: reviews, complaints, support messages, forms, tickets, and other customer feedback.
- `Resolve` reflects the product's action layer: classify, prioritize, draft replies, create cases, notify managers, update statuses, and orchestrate agent actions.
- The name does not lock the product to public reviews only, which supports the reusable `FeedbackItem` architecture.
- A web/product/developer-name check on 2026-08-30 found no obvious standalone SaaS/AI product using the exact `ResolveSignal AI` name. Matches for `resolveSignal` were primarily generic code/API identifiers rather than product brands.
- This is a practical naming check for the portfolio/product project, not a formal trademark clearance.

Preferred repository slug: `resolve-signal-ai`.


---

## 1. Product idea

ResolveSignal AI is a reusable platform for processing customer feedback with an LLM and an AI agent. It must be useful as a standalone web application and also as an integration-ready engine for other products.

The system receives a feedback item, analyzes it, classifies sentiment/severity/category, extracts problems and summary, generates suggested replies, and can run a bounded AI-agent workflow that performs approved actions such as creating a CRM case, changing status, or notifying a manager.

The product is intentionally broader than a “review manager”: the core domain entity is **FeedbackItem**, so future sources can include reviews, complaints, support messages, website forms, tickets, Telegram messages, and other customer feedback.

### Three operating modes

1. **Standalone App** — a complete dashboard where a user can manually create and process feedback.
2. **API Integration** — external sites/CRMs/services can submit feedback through a versioned REST API or webhook.
3. **Agent Automation** — the AI agent automatically analyzes new feedback and executes only the tools allowed by policy.

---

## 1.1 Final product identity

**Product name:** ResolveSignal AI  
**Repository slug:** `resolve-signal-ai`  
**Visual direction:** Hybrid Intelligence

**Short positioning:**  
An AI-powered customer feedback operations platform that turns incoming feedback signals into structured analysis, suggested responses, cases, notifications, and controlled agent actions.

**Core product modes:** Standalone App → API Integration → Agent Automation.

## 2. Product goals

- Build a real reusable tool, not a one-off portfolio demo.
- Demonstrate React/TypeScript frontend engineering, backend architecture, PostgreSQL, REST API, LLM integration, structured outputs, tool calling, agent workflows, external integrations, tests, CI, and deployment.
- Keep the core independent from a single LLM provider, notification channel, CRM, or source of feedback.
- Make the project visually understandable in 30–60 seconds through a public standalone demo.
- Preserve clear seams for future SaaS evolution without prematurely building SaaS complexity.


### Approved dashboard visual direction — Hybrid Intelligence

The dashboard uses the **Hybrid Intelligence** direction:

- Primary product UI: light, restrained, professional B2B/SaaS visual language.
- Neutral backgrounds, spacious layout, clear hierarchy, restrained typography, clean data tables/cards.
- AI/Agent-specific areas may use a more expressive treatment (for example indigo/violet/electric-blue accents or subtly tinted/darker panels) so AI activity is visually distinct from ordinary CRUD/data UI.
- Status colors (`critical`, `high`, `positive`, etc.) are used deliberately and sparingly rather than coloring the whole interface.
- The product should feel like production software first and an AI product second — avoid cliché “neon AI startup” styling.
- The `Feedback details` screen and `Agent Activity` timeline are the main visual demo surfaces.



### Approved reusable UI migration

Existing custom UI components from another user-owned project are approved as behavioral starting points for ResolveSignal AI:

- `CustomSelect` → adapt into `shared/ui/Select`
- `CustomCheckbox` → adapt into `shared/ui/Checkbox`
- custom thin scrollbar treatment → extract into shared ResolveSignal scrollbar tokens/utility

Rules:
- reuse proven behavior, not old project branding;
- remove `admin/public` theme branching;
- replace legacy variables with ResolveSignal `--rs-*` design tokens;
- preserve accessibility, keyboard, touch, focus-visible, and reduced-motion behavior;
- clean stale references during migration;
- V1 demo UI defaults to English; do not add i18n yet.

The supplied select already supports keyboard navigation, grouped/disabled options, touch/pen handling, outside close, and scroll-to-option behavior. The supplied checkbox uses a native checkbox input with accessible labeling/description support. These are worth preserving rather than rewriting from zero.

### Non-goals for initial development

Do **not** add at the beginning: OAuth, complex RBAC, multi-tenancy, billing, microservices, Kafka, RabbitMQ, Kubernetes, many LLM providers, many external CRMs, or many marketplace integrations.

---

## 3. Architecture principles

1. **Modular monolith first.** One repository and one deployable product split into clean modules; no microservices unless scale later requires them.
2. **Frontend uses FSD.** Feature-Sliced Design is used where it naturally fits: entities, user features, widgets, pages, shared infrastructure.
3. **Backend does not imitate FSD.** Backend uses NestJS modules with application/domain/infrastructure/API boundaries.
4. **Provider abstractions only at real change points.** Abstract LLM, notification, CRM/action provider, feedback sources, public API/webhook boundaries.
5. **No direct provider SDK calls scattered through business logic.** OpenAI, Telegram, etc. live behind adapters/providers.
6. **Structured AI output must be validated.** Use Zod schemas and Structured Outputs instead of fragile free-form JSON parsing.
7. **Agent is bounded.** The LLM never receives arbitrary DB/API access; only an explicit allow-list of tools.
8. **Policy sits between model decision and real side effect.** High-risk future actions can require human approval.
9. **Idempotency and auditability matter.** Repeated events must not create duplicate cases/notifications, and agent actions must be recorded.
10. **Build vertically.** Each phase should finish in a demonstrable state before the next phase begins.

---

## 4. Technology stack

### Repository / tooling

- pnpm workspaces monorepo
- TypeScript across frontend/backend/shared contracts
- Git + GitHub
- GitHub Actions CI
- Docker Compose for local PostgreSQL

### Frontend

- React
- Vite
- TypeScript
- Feature-Sliced Design (FSD)
- React Router
- TanStack Query
- React Hook Form
- Zod
- CSS Modules

### Backend

- Node.js
- NestJS
- TypeScript
- REST API
- Swagger / OpenAPI

### Database

- PostgreSQL
- Prisma ORM

### AI

- OpenAI Responses API as first implementation
- LLMProvider abstraction
- OpenAIProvider
- MockProvider for tests/local deterministic flows
- Structured Outputs
- Zod validation
- Function/tool calling for Agent phase
- prompt_version + model/provider usage logging

### Integrations

- Telegram Bot API as first notification adapter
- Internal CRM Cases as first CRM implementation
- REST API + inbound/outbound webhooks

### Testing

- Vitest
- React Testing Library
- backend unit/integration tests
- Supertest
- Playwright
- AI eval dataset for classification quality

---

## 5. Why a monorepo

A monorepo means that the frontend, backend, and shared packages live in **one Git repository**, while remaining separate applications/packages.

Instead of:

```text
ai-feedback-web/       ← separate repository
ai-feedback-api/       ← separate repository
ai-feedback-contracts/ ← separate repository
```

we use:

```text
ai-feedback-manager/
├── apps/web
├── apps/api
└── packages/contracts
```

This is useful here because the frontend and backend are one product and must share types/contracts. A single change can update the API contract, backend implementation, and frontend consumer in one branch/PR. It also gives one installation entry point, one CI pipeline, and one README.

**Important:** monorepo does not mean “everything is mixed together”. `apps/web` and `apps/api` are still separate applications with their own boundaries.

---

## 6. Repository structure

```text
ai-feedback-manager/
├── apps/
│   ├── web/
│   │   └── src/
│   └── api/
│       └── src/
├── packages/
│   └── contracts/
├── prisma/
├── docs/
├── tests/
│   └── evals/
├── docker-compose.yml
├── pnpm-workspace.yaml
├── package.json
└── README.md
```

### packages/contracts

Shared contracts contain Zod schemas and types that are legitimately shared between applications, for example `FeedbackAnalysisSchema`, public API request/response schemas, enums, and DTO-safe types. Do not turn it into a dumping ground for arbitrary helpers.

---

## 7. Frontend structure — FSD

```text
apps/web/src/
├── app/
│   ├── providers/
│   ├── router/
│   ├── styles/
│   └── App.tsx
├── pages/
│   ├── dashboard/
│   ├── feedback-list/
│   ├── feedback-details/
│   ├── feedback-create/
│   ├── cases/
│   └── agent-runs/
├── widgets/
│   ├── app-sidebar/
│   ├── dashboard-stats/
│   ├── feedback-table/
│   ├── feedback-analysis/
│   ├── suggested-replies/
│   └── agent-activity/
├── features/
│   ├── create-feedback/
│   ├── analyze-feedback/
│   ├── generate-reply/
│   ├── change-feedback-status/
│   ├── run-agent/
│   └── create-case/
├── entities/
│   ├── feedback/
│   ├── analysis/
│   ├── reply/
│   ├── case/
│   └── agent-run/
└── shared/
    ├── api/
    ├── ui/
    ├── lib/
    ├── config/
    └── types/
```

### FSD working rule

- `entities` = reusable domain representation/UI for a business entity.
- `features` = a user action that changes or triggers behavior.
- `widgets` = meaningful larger interface blocks assembled from entities/features.
- `pages` = route-level screen composition.
- `shared` = domain-agnostic UI, API base client, generic utilities, configuration.
- `app` = application composition, router, global providers/styles.

Do not create a slice/layer merely to satisfy FSD terminology. Keep code at the highest appropriate layer and move it down only when reuse/semantics justify it.

---

## 8. Backend structure

```text
apps/api/src/
├── app/
├── common/
│   ├── errors/
│   ├── guards/
│   ├── logging/
│   └── validation/
├── modules/
│   ├── feedback/
│   │   ├── application/
│   │   ├── domain/
│   │   ├── infrastructure/
│   │   └── api/
│   ├── ai/
│   │   ├── application/
│   │   ├── ports/
│   │   └── infrastructure/
│   │       └── openai/
│   ├── replies/
│   ├── cases/
│   ├── agent/
│   └── integrations/
│       ├── notifications/
│       └── crm/
└── main.ts
```

Typical flow:

```text
Controller → Application Service → Domain → Port/Interface → Infrastructure Adapter
```

The business/application layer must not depend directly on OpenAI SDK, Telegram SDK/API details, or a future external CRM SDK.

---

## 9. Core domain model

### FeedbackItem

Conceptual fields:

```ts
type FeedbackItem = {
  id: string;
  source: FeedbackSource;
  externalId?: string;
  rating?: number;
  text: string;
  authorName?: string;
  customerRef?: string;
  status: FeedbackStatus;
  createdAt: Date;
  updatedAt: Date;
};
```

`rating` is optional so non-review feedback can be processed.

### Initial classifications

**Sentiment**
- positive
- neutral
- negative
- mixed

**Severity**
- low
- medium
- high
- critical

**Category (V1)**
- product
- service
- delivery
- payment
- refund
- support
- account
- other

Categories may become configurable later; do not build a category-management subsystem in V1.

### FeedbackAnalysis output

```ts
{
  sentiment: "negative",
  severity: "critical",
  category: "payment",
  summary: "Customer reports a duplicate charge and no response from support.",
  problems: ["duplicate payment", "support did not respond"]
}
```

---

## 10. Database model

### feedback_items

- id
- source
- external_id
- rating
- text
- author_name
- customer_ref
- status
- created_at
- updated_at

### feedback_analyses

- id
- feedback_id
- sentiment
- severity
- category
- summary
- problems JSONB
- provider
- model
- prompt_version
- input_tokens
- output_tokens
- created_at

### suggested_replies

- id
- feedback_id
- analysis_id
- tone
- text
- status: draft / approved / rejected
- created_at

### cases

- id
- feedback_id
- title
- description
- priority
- status
- created_at
- updated_at

### agent_runs

- id
- feedback_id
- trigger
- status
- provider
- model
- started_at
- finished_at

### agent_actions

- id
- agent_run_id
- tool
- input JSONB
- output JSONB
- status
- duration_ms
- created_at

The exact Prisma schema can evolve during implementation, but the semantic entities above are baseline.

---

## 11. LLM architecture

### LLMProvider

Business code must depend on a provider interface, not the OpenAI SDK directly.

Conceptual interface:

```ts
interface LLMProvider {
  analyzeFeedback(input: AnalyzeFeedbackInput): Promise<FeedbackAnalysis>;
  generateReplies(input: GenerateRepliesInput): Promise<GeneratedReply[]>;
}
```

Agent-specific execution may live in a separate `AgentModelProvider`/orchestration interface if implementation shows that combining it with `LLMProvider` makes the contract too broad. Prefer Interface Segregation over a “god provider”.

Initial implementations:

- `OpenAIProvider`
- `MockProvider`

Possible future implementations:

- AnthropicProvider
- GeminiProvider
- LocalProvider

### AI output rules

- Validate all model outputs against Zod schemas.
- Use structured schema-constrained output for analysis.
- Version prompts (`prompt_version`).
- Persist model/provider and usage metadata.
- Keep API keys backend-only.
- Avoid sending unnecessary personal data to the LLM.

---

## 12. AI Agent architecture

The agent is not “LLM with unlimited access”. It is a controlled workflow.

```text
Feedback → Agent Runner → LLM Decision → Policy Check → Allowed Tool → Result → Audit Log
```

### Initial tool allow-list

- `getFeedback`
- `getCustomerHistory`
- `analyzeFeedback`
- `generateReply`
- `createCase`
- `updateFeedbackStatus`
- `notifyManager`

### Policy rules

- Tools expose narrow validated arguments.
- The model never gets raw database credentials or arbitrary SQL access.
- Side effects are idempotent where needed.
- Every tool call is recorded in `agent_actions`.
- Low-risk actions may execute automatically.
- Future high-risk tools (example: issuing a refund) must support `requiresHumanApproval = true` and must not auto-execute merely because the LLM requested them.

---

## 13. Providers and integrations

### Feedback sources

Initial:
- Manual Dashboard input
- REST API
- generic inbound webhook (V3)

Possible later:
- Google Reviews
- Yandex
- Shopify
- WooCommerce
- Telegram
- custom CRM/support system

All sources are normalized into `FeedbackItem` before entering core logic.

### NotificationProvider

Initial:
- TelegramNotificationProvider
- MockNotificationProvider

Future:
- EmailNotificationProvider
- SlackNotificationProvider
- WebhookNotificationProvider

The agent calls a semantic action such as `notifyManager()`, not Telegram-specific code.

### CRMProvider / case actions

Initial:
- InternalCRMProvider backed by the `cases` table
- MockCRMProvider

Future:
- WebhookCRMProvider
- HubSpot/Bitrix/custom adapters only if a real integration is required.

---

## 14. Public REST API

Use versioned routes from the start.

### V1 endpoints

```text
POST   /api/v1/feedback
GET    /api/v1/feedback
GET    /api/v1/feedback/:id
POST   /api/v1/feedback/:id/analyze
POST   /api/v1/feedback/:id/replies
PATCH  /api/v1/feedback/:id/status
GET    /api/v1/dashboard/summary
```

### Agent endpoints (V2)

```text
POST /api/v1/feedback/:id/agent-runs
GET  /api/v1/agent-runs
GET  /api/v1/agent-runs/:id
GET  /api/v1/cases
GET  /api/v1/cases/:id
```

### Integration endpoints/capabilities (V3)

```text
POST /api/v1/webhooks/feedback
POST /api/v1/integrations
GET  /api/v1/integrations
```

V3 also introduces API keys and outbound webhooks as needed.

Expose Swagger/OpenAPI documentation at a documented API docs route (target: `/api/docs`).

---

## 15. Standalone UI and demo experience

The project must be completely usable without integrating another application.

### Dashboard

Show at a glance:
- feedback count
- negative count
- critical count
- awaiting-review count
- recent feedback
- severity/category/source indicators

### Feedback list

Support search and filters by status, severity, category, and source.

### Feedback details

This is the primary portfolio/demo screen. It should show:
- original feedback
- AI sentiment/severity/category
- summary
- detected problems
- suggested replies
- related CRM case
- complete Agent Activity timeline

Example Agent Activity:

```text
✓ Feedback received
✓ AI analysis completed
✓ Reply generated
✓ Case #103 created
✓ Manager notified in Telegram
✓ Feedback marked URGENT
```

### Demo mode

Add a safe demo scenario that can be triggered from the standalone product. Example feedback:

> “Мне дважды списали деньги, поддержка не отвечает третий день.”

The user should visually observe steps such as analyzing → classifying critical/payment → generating reply → creating case → notifying manager → completion.

Demo mode must not require integration with an external store/CRM and should be able to use deterministic/mock integrations where appropriate to avoid uncontrolled side effects.

---

## 16. Background processing

Do not introduce Redis/RabbitMQ in the initial version. Use durable state in PostgreSQL for agent run lifecycle and a simple worker/processor suitable for the initial deployment model.

Target lifecycle:

```text
pending → processing → completed / failed
```

Add retry behavior and idempotency in V2. If scale later requires a dedicated queue, replace the infrastructure implementation without changing core domain behavior.

---

## 17. Security and privacy baseline

- OpenAI/Telegram/API secrets are backend-only environment variables.
- Validate environment variables on startup.
- Validate every inbound REST/webhook payload.
- Limit feedback text length and other potentially abusive payload sizes.
- Add rate limiting before exposing public endpoints.
- Do not log secrets.
- Avoid unnecessary personal data in LLM prompts.
- Treat model output as untrusted until schema validation passes.
- Bound agent tools and validate tool arguments.
- Keep an audit trail for agent actions.
- Introduce webhook signature verification when inbound webhooks are exposed.
- Use API keys for external integration in V3.

---

## 18. Testing and AI evals

### Standard tests

- unit tests for domain/application logic
- frontend component/feature tests where valuable
- backend integration/API tests
- Playwright end-to-end critical flows

### AI eval dataset

Create a small versioned dataset of 20–30 manually labeled feedback examples, e.g.:

```json
{
  "text": "Списали деньги дважды",
  "expected": {
    "sentiment": "negative",
    "severity": "critical",
    "category": "payment"
  }
}
```

Use evals to compare prompt/model changes rather than relying only on subjective manual checks. Track metrics such as category, severity, and sentiment accuracy where meaningful.

Tests should default to `MockProvider` unless the test explicitly targets real-provider integration/evals.

---

## 19. Development roadmap

### Phase 0 — Foundation

Scope:
- pnpm monorepo/workspaces
- React + Vite + TypeScript app
- FSD baseline
- NestJS API
- PostgreSQL + Prisma
- shared contracts
- Docker Compose
- lint/typecheck/test baseline
- CI baseline
- environment validation

**Definition of Done:** web and API run locally; DB connection/migration works; shared contract is imported by both apps; CI executes baseline checks; README has local startup instructions.

### Phase 1 — LLM MVP

Scope:
- Dashboard
- Feedback create/list/details
- Feedback CRUD needed by UI
- OpenAIProvider
- MockProvider
- structured analysis output
- sentiment/severity/category/problems/summary
- suggested replies
- persistence of analyses/replies
- model/provider/token/prompt-version metadata
- useful loading/error/empty states
- demo seed data
- relevant tests

**Definition of Done:** a user can open the standalone app, enter feedback, run AI analysis, see validated structured results, generate a reply, reload the page and retain history. The product can be demonstrated without any external integration.

### Phase 2 — AI Agent

Scope:
- Agent runner/orchestration
- function/tool calling
- bounded tool registry
- Agent Policy
- Internal CRM Cases
- TelegramNotificationProvider + mock
- background processing
- retry/idempotency
- agent_runs/agent_actions
- Agent Activity UI
- agent tests

**Definition of Done:** a critical feedback item can trigger an audited agent run that chooses/executes allowed tools, creates an internal case, updates status, and produces a Telegram or mock notification without duplicate side effects on retry.

### Phase 3 — Integration Platform

Scope:
- stable external `/api/v1` integration contract
- API keys
- inbound webhook
- generic source adapter
- outbound webhook capability if justified
- integration management surface only as needed
- Swagger/OpenAPI documentation
- integration examples

**Definition of Done:** another project can submit feedback using documented credentials/contract and receive/observe processing without importing internal code from this repository.

### Phase 4 — Polish

Scope:
- Playwright coverage for critical demo flows
- AI eval workflow
- responsive dashboard
- accessibility/basic UX audit
- refined loading/empty/error states
- one-click demo scenario
- architecture diagram
- polished README and screenshots
- deploy
- CI hardening

**Definition of Done:** public demo + repository are understandable to a recruiter/developer without verbal explanation; setup docs reproduce local development; core flows are tested and visually polished.

---

## 20. MVP boundary

The **MVP is Phase 0 + Phase 1**, not the full agent platform.

MVP includes:
- standalone dashboard
- manual feedback entry
- feedback list/details
- persisted feedback
- OpenAI LLM analysis
- MockProvider
- structured and validated sentiment/severity/category/problems/summary
- suggested replies
- persisted analysis/reply history
- basic usage metadata
- basic tests
- demo data

MVP does **not** require:
- agent automation
- Telegram notification
- CRM cases
- external API keys/webhook integrations
- multi-user auth/billing

This boundary prevents the project from becoming blocked by the Agent phase and gives us a finished useful product early.

---

## 21. Estimated active development time

Current planning estimate for joint active work:

- Foundation + strong V1 LLM MVP: approximately **18–28 hours**
- V2 AI Agent: additional **20–32 hours**
- V3 Integration Platform: additional **12–20 hours**
- Total for the planned reusable product before optional future SaaS expansion: approximately **50–80 active hours**

These are planning ranges, not commitments; actual time depends on integration/debugging behavior and design refinement.

---

## 22. Working rules during implementation

1. Do not start future-phase infrastructure before the current phase requires it.
2. Each meaningful phase ends with working tests/build and a demonstrable user flow.
3. Prefer small clear provider interfaces over giant generalized abstractions.
4. Keep domain logic independent from UI, OpenAI SDK, Telegram, and Prisma details where practical.
5. FSD is a tool, not a folder-count target; no artificial slices.
6. New integration behavior should enter through adapters/providers rather than branch-heavy hardcoding in core services.
7. Public API contracts are versioned and validated.
8. Any side-effecting agent tool must define validation, error behavior, idempotency expectations, and audit logging.
9. Real external calls are mocked in ordinary tests; real-provider tests are explicit.
10. Update this blueprint whenever a significant architectural decision is accepted. Do not let chat history become the only source of truth.

---

## 23. Handoff guide for a new ChatGPT Work chat

When starting a new chat, attach this document and instruct the new chat to treat it as the **approved baseline**.

Recommended handoff prompt:

> We are developing ResolveSignal AI. Read the attached Blueprint v1.0 first and treat all sections marked approved/baseline as current project decisions. Do not redesign the architecture unless a concrete implementation problem justifies a change. First state the current phase, what is already completed in the repository, and the next smallest verifiable step. Preserve the phase boundaries, provider architecture, FSD frontend, modular NestJS backend, and anti-overengineering rules from the document.

Also attach the latest repository/archive/diff or current source tree if the new chat needs to continue implementation rather than only discuss architecture.

---

## 24. Open decisions before Phase 0 implementation

Only two product-level decisions remain intentionally open:

1. **Final product/repository name.** Working name: `ResolveSignal AI` / `ai-feedback-manager`.
2. **Dashboard visual direction.** Choose a consistent visual system before UI implementation; exact micro-details can evolve later.

Once these are chosen, publish Blueprint v1.1 and begin Phase 0.

---

## 25. Decision log — v1.0

Approved baseline includes:

- reusable AI feedback platform rather than isolated demo
- Standalone App → API Integration → Agent Automation model
- core `FeedbackItem` domain
- React + Vite + TypeScript frontend
- FSD on frontend only
- NestJS modular backend
- pnpm monorepo
- PostgreSQL + Prisma
- shared Zod contracts
- OpenAI Responses API behind `LLMProvider`
- `MockProvider`
- Structured Outputs + Zod validation
- bounded tool-calling agent + Agent Policy
- Telegram as first notification integration
- Internal CRM Cases as first CRM implementation
- versioned `/api/v1` REST API + Swagger/OpenAPI
- PostgreSQL-backed initial agent processing state, no queue infrastructure prematurely
- agent execution/action audit history
- AI eval dataset
- security/privacy baseline
- phased roadmap with explicit MVP boundary and intentional exclusion of premature SaaS/microservice complexity
