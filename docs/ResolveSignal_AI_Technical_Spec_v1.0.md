# ResolveSignal AI — Technical Specification v1.0

**Status:** Approved pre-development specification  
**Date:** 2026-08-30  
**Product:** ResolveSignal AI  
**Repository:** `resolve-signal-ai`  
**Primary source of architecture context:** `ResolveSignal_AI_Blueprint_v1.3.md`  
**Design source of truth:** `ResolveSignal_AI_DESIGN_SPEC_v1.0.md`

---

## 1. Purpose

ResolveSignal AI is a reusable AI-powered customer feedback operations platform.

The product must:

1. Work as a complete standalone web application.
2. Analyze manually created customer feedback with an LLM.
3. Normalize input into the common domain entity `FeedbackItem`.
4. Produce structured AI analysis and suggested replies.
5. Persist feedback, analyses, replies, cases, and later agent activity in PostgreSQL.
6. Be designed so external projects can later submit feedback through a versioned REST API and webhooks.
7. Evolve into a bounded AI-agent system that can execute approved tools such as creating CRM cases, updating statuses, and notifying a manager.

The product is not limited to public reviews. Future inputs may include complaints, support requests, website forms, tickets, Telegram messages, and CRM feedback.

---

## 2. Product modes

### 2.1 Standalone App

A user can operate ResolveSignal AI entirely through its own dashboard:

- create feedback manually;
- browse and filter feedback;
- open a feedback details page;
- run analysis;
- view sentiment, severity, category, summary, and detected problems;
- generate suggested replies;
- approve/reject/edit suggested replies;
- later inspect agent activity and CRM cases.

Standalone mode must be sufficient for a public portfolio demo.

### 2.2 API Integration

External projects will later be able to submit feedback using:

- versioned REST API;
- API keys;
- inbound webhooks.

### 2.3 Agent Automation

A bounded agent will later:

- analyze new feedback;
- choose from an explicit allow-list of tools;
- create internal CRM cases;
- update feedback status;
- notify a manager;
- write an auditable agent execution history.

The LLM never receives direct arbitrary access to the database, Telegram, or external systems.

---

## 3. Approved technology stack

### Repository
- pnpm workspace monorepo

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
- TypeScript
- NestJS
- REST API
- Swagger / OpenAPI

### Database
- PostgreSQL
- Prisma ORM

### Shared contracts
- TypeScript + Zod package under `packages/contracts`

### AI
- OpenAI Responses API
- Structured Outputs for typed analysis
- Tool / function calling for agent workflows
- `LLMProvider` abstraction
- `OpenAIProvider`
- `MockProvider`

### Integrations
- Telegram Bot API as first notification adapter
- Internal CRM as first CRM implementation
- generic REST/webhook integration later

### Testing
- Vitest
- React Testing Library
- backend integration tests
- Supertest where appropriate
- Playwright
- AI eval dataset

### Infrastructure
- Docker Compose for local PostgreSQL
- GitHub Actions CI
- environment validation

---

## 4. Repository structure

```text
resolve-signal-ai/
├── apps/
│   ├── web/
│   └── api/
├── packages/
│   └── contracts/
├── prisma/
├── docs/
├── docker-compose.yml
├── pnpm-workspace.yaml
├── package.json
└── README.md
```

`apps/web` and `apps/api` are separate applications in one Git repository. `packages/contracts` contains shared schemas/types used by both applications.

---

## 5. Frontend architecture — FSD

Target structure:

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
│   ├── create-case/
│   └── run-agent/
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

Rules:

- `shared` must not import from higher FSD layers.
- `entities` represent domain concepts, not pages.
- `features` represent user actions/use cases.
- `widgets` compose multiple entities/features into meaningful blocks.
- `pages` assemble route-level screens.
- Avoid excessive nesting and slices that contain only one trivial file.

---

## 6. Backend architecture

Target structure:

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

Principle:

```text
Controller
    ↓
Application service/use case
    ↓
Domain
    ↓
Port/interface
    ↓
Infrastructure adapter
```

Do not treat the backend as FSD.

---

## 7. Core domain model

### 7.1 FeedbackItem

Minimum conceptual fields:

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

`rating` is optional because not every feedback source has stars.

### 7.2 Analysis

Structured output:

- `sentiment`: `positive | neutral | negative | mixed`
- `severity`: `low | medium | high | critical`
- `category`: initial enum
- `summary`
- `problems[]`
- model/provider metadata
- token usage where available
- prompt version
- timestamps

Initial categories:

- product
- service
- delivery
- payment
- refund
- support
- account
- other

Categories may become configurable later; do not build that configuration system in V1.

### 7.3 SuggestedReply

Fields/behavior:

- belongs to feedback and analysis;
- contains generated text;
- optional tone;
- status: `draft | approved | rejected`;
- may be edited by the user.

### 7.4 Case

Internal CRM case:

- feedback reference;
- title;
- description;
- priority;
- status;
- timestamps.

### 7.5 AgentRun / AgentAction

Required from V2:

- agent run trigger/status/timestamps;
- provider/model;
- individual action/tool;
- input/output JSON;
- status;
- execution duration;
- audit history.

---

## 8. Provider boundaries

### 8.1 LLMProvider

Business logic must not call OpenAI SDK directly outside the OpenAI adapter.

Conceptual API:

```ts
interface LLMProvider {
  analyzeFeedback(input: AnalyzeFeedbackInput): Promise<FeedbackAnalysis>;
  generateReplies(input: GenerateRepliesInput): Promise<GeneratedReply[]>;
}
```

Agent-specific capabilities may be added behind a separate orchestration boundary when V2 starts.

Initial providers:

- `MockProvider` — deterministic development/testing.
- `OpenAIProvider` — production LLM integration.

### 8.2 Notification provider

Agent uses a logical action such as `notifyManager()`, not Telegram SDK calls.

Initial implementations:

- mock
- Telegram

Future possibilities:
- email
- Slack
- webhook

### 8.3 CRM provider

Initial:
- internal CRM (`cases` table)
- mock

Future:
- webhook CRM
- HubSpot/Bitrix/custom adapter only if a real need appears.

---

## 9. Agent model

Initial allowed tools:

- `getFeedback`
- `getCustomerHistory`
- `analyzeFeedback`
- `generateReply`
- `createCase`
- `updateFeedbackStatus`
- `notifyManager`

Architecture:

```text
LLM decision
    ↓
Agent orchestration
    ↓
Agent Policy
    ↓
Approved tool
    ↓
Real application code
```

Rules:

- no arbitrary database access;
- no arbitrary HTTP requests;
- all tools are explicitly registered;
- tool calls are logged;
- potentially consequential tools may require human approval;
- future operations such as refunds must never become automatic merely because the model requests them.

---

## 10. Database baseline

Initial tables:

### `feedback_items`
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

### `feedback_analyses`
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

### `suggested_replies`
- id
- feedback_id
- analysis_id
- tone
- text
- status
- created_at
- updated_at

### `cases`
- id
- feedback_id
- title
- description
- priority
- status
- created_at
- updated_at

V2:
- `agent_runs`
- `agent_actions`

Schema can evolve, but changes must preserve the domain boundaries above.

---

## 11. API baseline

Use versioned routes from the beginning.

### V1

```text
POST   /api/v1/feedback
GET    /api/v1/feedback
GET    /api/v1/feedback/:id
POST   /api/v1/feedback/:id/analyze
POST   /api/v1/feedback/:id/replies
PATCH  /api/v1/feedback/:id/status
GET    /api/v1/dashboard/summary
GET    /health
```

Swagger/OpenAPI:
- exposed under `/api/docs` or another clearly documented route.

### V2

```text
POST /api/v1/feedback/:id/agent-runs
GET  /api/v1/agent-runs
GET  /api/v1/agent-runs/:id
GET  /api/v1/cases
GET  /api/v1/cases/:id
```

### V3

- public API keys
- inbound webhooks
- integration management
- outbound webhooks

---

## 12. User interface / routes

### `/`
Dashboard:
- total feedback;
- negative feedback;
- critical feedback;
- awaiting review;
- recent feedback;
- sentiment/severity overview;
- clear links into feedback.

### `/feedback`
- searchable/filterable table/list;
- status filter;
- severity filter;
- category filter;
- source filter;
- pagination or a simple scalable list pattern.

### `/feedback/new`
- manual creation;
- text required;
- optional rating;
- optional author/customer reference;
- validation.

### `/feedback/:id`
Primary portfolio/demo screen:
- original feedback;
- analysis;
- detected problems;
- suggested replies;
- status;
- later Agent Activity timeline.

### `/cases`
V2 internal CRM overview.

### `/agent-runs`
V2 activity/audit view.

---

## 13. Reusable UI components from an existing project

The uploaded `CustomSelect` and `CustomCheckbox` are approved as behavioral starting points.

Do **not** copy their old project theming unchanged.

Move/adapt them into:

```text
apps/web/src/shared/ui/select/
apps/web/src/shared/ui/checkbox/
```

Recommended public names:
- `Select`
- `Checkbox`

Retain useful behavior from the source components:

### Select
- keyboard navigation;
- `Home` / `End`;
- `Enter` / `Space`;
- `Escape`;
- selected/highlighted state;
- disabled options;
- group labels;
- touch/pen movement threshold;
- close on outside interaction;
- scroll selected option into view;
- dropdown alignment/width options.

### Checkbox
- native checkbox input;
- controlled checked state;
- label and optional description;
- disabled/required support;
- accessible labels/descriptions;
- focus-visible;
- reduced-motion behavior;
- small/medium sizes if useful.

Required adaptation:
- remove old `admin/public` theme split;
- use ResolveSignal design tokens;
- remove stale/unused class/variable references;
- update default UI copy to English for V1 demo;
- write/retain component tests for keyboard and interaction behavior.

Scrollbar:
- extract the reusable scrollbar styling from the select stylesheet into a shared global/utility definition controlled by ResolveSignal design tokens;
- use consistently on dropdowns, tables/panels with overflow, and activity logs where appropriate;
- do not over-style native page scrolling if it hurts accessibility/usability.

---

## 14. V1 — LLM MVP scope

V1 is complete when the standalone application works end to end.

### Required

#### Foundation
- monorepo initialized;
- frontend/backend/contracts packages;
- PostgreSQL;
- Prisma migrations;
- Docker Compose;
- env validation;
- lint/typecheck/test scripts;
- CI baseline.

#### Frontend
- FSD baseline;
- application shell/sidebar;
- Dashboard;
- Feedback list;
- Create Feedback;
- Feedback details;
- Analysis UI;
- Suggested Replies UI;
- shared `Select` and `Checkbox`;
- responsive desktop/tablet/mobile baseline;
- empty/loading/error states.

#### Backend
- Feedback CRUD/use cases required by V1;
- validation;
- dashboard summary;
- analysis/reply endpoints;
- Swagger.

#### AI
- `MockProvider`;
- `OpenAIProvider`;
- Structured Outputs;
- Zod validation of model result;
- sentiment/severity/category/problems/summary;
- suggested replies;
- token/provider/model/prompt metadata where available;
- failure handling.

#### Data
- persistence in PostgreSQL;
- deterministic seed/demo data.

#### Quality
- meaningful unit/integration tests;
- basic Playwright critical path;
- no API secrets on frontend;
- sensible rate/size validation for AI inputs.

### V1 explicitly excludes
- agent tool calling;
- Telegram;
- background worker;
- API keys;
- inbound webhooks;
- multi-tenancy;
- auth/RBAC;
- billing.

---

## 15. V2 — AI Agent scope

Required:

- agent runner/orchestration;
- OpenAI tool/function calling;
- agent policy;
- tool registry;
- agent runs/actions persistence;
- internal CRM cases;
- Telegram notification adapter;
- background processing;
- retry rules;
- idempotency;
- agent activity UI;
- auditable failure states.

V2 Definition of Done:
- a critical feedback item can trigger a controlled workflow;
- the workflow is visible in UI;
- each tool invocation is persisted;
- retry does not silently duplicate side effects;
- provider/integration failure is observable;
- no unapproved consequential action can execute.

---

## 16. V3 — Integration Platform scope

Required:

- public versioned API for external clients;
- API keys;
- inbound webhook endpoint(s);
- integration adapter boundary;
- outbound webhook capability;
- external source metadata;
- integration documentation/examples.

V3 must not require rewriting the core feedback/AI domain.

---

## 17. V4 — Polish

- broader Playwright coverage;
- eval dataset and repeatable AI evaluation;
- accessibility review;
- refined responsive behavior;
- demo scenario;
- architecture diagram;
- screenshots;
- production deployment;
- polished README;
- portfolio explanation.

---

## 18. Demo scenario

A visitor should understand the project in 30–60 seconds.

Seed at least three examples:

1. Positive:
   - 5 stars
   - positive/product or service
2. Medium:
   - 3 stars
   - delivery delay
3. Critical:
   - 1 star
   - duplicate payment + support not responding

The critical example is the primary demonstration case.

In V1:
- user sees structured analysis and suggested reply.

In V2:
- user additionally sees:
  - analysis completed;
  - reply generated;
  - CRM case created;
  - manager notification;
  - status updated;
  - full Agent Activity history.

---

## 19. UI language

V1 product UI and demo data should be **English by default** to make the public portfolio demo broadly understandable.

Do not build i18n in V1.

Russian localization can be added later if the product becomes useful for Russian-speaking clients.

Code, identifiers, API contracts, commits, and technical documentation should use English technical naming.

---

## 20. Security/privacy baseline

- OpenAI/API secrets are backend-only.
- Validate environment variables at startup.
- Validate all public API input.
- Limit feedback text length.
- Do not log secrets.
- Avoid sending unnecessary personal fields to the LLM.
- Keep LLM payload minimal.
- Prefer explicit provider settings that minimize unnecessary retention where supported.
- Never execute model-generated arbitrary code, SQL, URLs, or commands.
- Agent tools remain allow-listed.

---

## 21. AI evaluation

Create a small labeled dataset in a later V1/V4 step, e.g.:

```text
tests/evals/feedback-dataset.json
```

Examples specify expected:
- sentiment;
- severity;
- category.

Use it to compare prompt/model changes. Do not treat a single manual prompt test as sufficient evidence of quality.

---

## 22. Anti-overengineering rules

Do not add without a demonstrated need:

- microservices;
- Kafka;
- RabbitMQ;
- Kubernetes;
- complex plugin framework;
- many LLM providers;
- many CRM integrations;
- OAuth;
- complex RBAC;
- multi-tenancy;
- SaaS billing;
- event sourcing.

Abstract only real change points:
- feedback source;
- LLM provider;
- notification provider;
- CRM/action tools;
- public API;
- webhooks.

---

## 23. Implementation roadmap

### Phase 0 — Foundation
- monorepo
- React/Vite/TS
- NestJS
- PostgreSQL/Prisma
- contracts
- lint/typecheck/tests
- Docker
- CI
- application shell
- MockProvider boundary

### Phase 1 — LLM MVP
- feedback screens
- persistence
- analysis
- suggested replies
- OpenAIProvider
- Structured Outputs
- demo data

### Phase 2 — AI Agent
- tools
- policy
- internal CRM
- Telegram
- agent history
- retry/idempotency
- background processing

### Phase 3 — Integration Platform
- external API security
- API keys
- webhooks
- adapters

### Phase 4 — Polish
- evals
- broader E2E
- accessibility
- demo mode
- docs/deploy/portfolio

---

## 24. Work delegation boundary

For the first Work/Codex implementation pass, implement:

- all Phase 0;
- substantial frontend/backend scaffold of Phase 1;
- complete UI on deterministic mock/seed data;
- `MockProvider`;
- database entities/endpoints necessary for V1 scaffold.

Do **not** implement in that first autonomous pass:

- real OpenAI integration;
- final AI prompts;
- agent/tool calling;
- Telegram;
- background jobs;
- API keys/webhooks;
- SaaS/auth complexity.

Those are deliberate review checkpoints.

---

## 25. Acceptance gates before moving forward

Before real OpenAI integration begins:

- repository builds cleanly;
- lint/typecheck/tests pass;
- DB can be started locally with documented commands;
- migrations/seed run;
- web and API start from documented commands;
- V1 pages render with mock/seed data;
- FSD boundaries are sane;
- API/docs exists;
- shared contracts are actually shared rather than duplicated;
- no accidental provider coupling;
- reusable Select/Checkbox match the ResolveSignal design system;
- no large architectural deviations from the blueprint without documentation.
