# ResolveSignal AI

ResolveSignal AI is a customer feedback operations platform that turns reviews, complaints, support messages, and other signals into structured analysis and controlled response drafts.

This repository contains the completed Phase 0 foundation and a substantial mock implementation of Phase 1. It is fully demonstrable without an OpenAI API key: every AI action goes through a deterministic `MockProvider`, is validated with shared Zod contracts, and is persisted in PostgreSQL.

## Included in this pass

- pnpm workspace monorepo
- React, Vite, TypeScript, React Router, TanStack Query, React Hook Form, CSS Modules
- Feature-Sliced Design frontend baseline
- NestJS REST API and Swagger/OpenAPI
- PostgreSQL and Prisma schema/migration/seed
- shared TypeScript/Zod contracts used by web and API
- Dashboard, Feedback List, Create Feedback, Feedback Details
- Russian-first public demo UI with presentation-layer dictionaries for enum labels
- Russian deterministic seed feedback, AI summaries, detected problems, and suggested replies
- unified Russian UX terminology: `FeedbackItem` is presented as «обращение», and AI surfaces consistently use `AI-анализ` / `AI-демо`
- deterministic analysis and suggested reply generation
- reply editing, approval, and rejection
- feedback status updates, search, and filters
- loading, empty, and error states
- responsive sidebar, table-to-card behavior, and form layouts
- accessible custom Select and Checkbox adapted to ResolveSignal tokens
- lint, typecheck, unit/integration tests, build scripts, and CI baseline

Not included: OpenAI API calls, production prompts, Structured Outputs against a real model, agent/tool calling, cases, Telegram, background jobs, API keys, webhooks, auth, RBAC, multi-tenancy, billing, queues, or microservices.

## Requirements

- Node.js 24+
- pnpm 11+
- Docker with Docker Compose (recommended local PostgreSQL path)

## Local setup

```bash
cp .env.example .env
pnpm install
pnpm db:start
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Open:

- Web: http://localhost:5173
- API health: http://localhost:4000/health
- Swagger: http://localhost:4000/api/docs

The seeded critical demo is available at:

```text
http://localhost:5173/feedback/33333333-3333-4333-8333-333333333333
```

The seed command resets the three V1 demo tables before inserting deterministic demo data. Use it only against a local/development database.

## Root commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start web and API together |
| `pnpm dev:web` | Start only Vite |
| `pnpm dev:api` | Start only NestJS |
| `pnpm db:start` | Start PostgreSQL through Docker Compose |
| `pnpm db:stop` | Stop local containers |
| `pnpm db:generate` | Generate Prisma Client |
| `pnpm db:migrate` | Apply committed migrations |
| `pnpm db:migrate:dev` | Create/apply a development migration |
| `pnpm db:seed` | Reset and insert deterministic demo data |
| `pnpm lint` | Run ESLint across the workspace |
| `pnpm typecheck` | Typecheck contracts, API, and web |
| `pnpm test` | Run all Vitest suites |
| `pnpm build` | Build contracts, API, and web |

## Repository map

```text
resolve-signal-ai/
├── apps/
│   ├── api/                 # NestJS modular backend
│   └── web/                 # React/Vite FSD frontend
├── packages/
│   └── contracts/           # shared Zod schemas and inferred types
├── prisma/                  # schema, migration, deterministic seed
├── docs/                    # approved source-of-truth documents
├── .github/workflows/ci.yml
├── docker-compose.yml
├── pnpm-workspace.yaml
└── package.json
```

## API surface

```text
GET    /health
GET    /api/v1/dashboard/summary
POST   /api/v1/feedback
GET    /api/v1/feedback
GET    /api/v1/feedback/:id
POST   /api/v1/feedback/:id/analyze
POST   /api/v1/feedback/:id/replies
PATCH  /api/v1/feedback/:id/status
PATCH  /api/v1/replies/:id
GET    /api/docs
```

## Architecture notes

- The browser never receives AI or database credentials.
- Both applications import enums and request/response validation from `@resolve-signal/contracts`.
- Internal API, TypeScript, Zod, enum, and database values remain English; Russian labels live only in the web presentation layer.
- Application services depend on `LLMProvider` and `FeedbackRepository` ports.
- `MockProvider` is the only AI adapter registered in this pass.
- Provider inputs are explicit data-minimized contexts; analysis does not receive customer references, reply history, status history, or unrelated metadata.
- Prisma is isolated in `PrismaFeedbackRepository`; controllers do not contain database logic.
- Mock output is parsed through `FeedbackAnalysisSchema` before persistence.
- UUID route parameters and all request bodies/queries are validated before persistence access.
- FSD layers remain pragmatic: only meaningful entities/features/widgets received their own slices.

Current checkpoint details are tracked in `docs/CURRENT_STATUS.md`.

## Before real OpenAI integration

Review these areas first:

1. `packages/contracts/src/index.ts` — the structured analysis and reply contracts.
2. `apps/api/src/modules/ai/ports/llm-provider.ts` — the provider boundary.
3. `apps/api/src/modules/ai/infrastructure/mock.provider.ts` — deterministic reference behavior.
4. `apps/api/src/modules/feedback/application/feedback.service.ts` — orchestration and failure semantics.
5. `apps/api/src/modules/feedback/infrastructure/prisma-feedback.repository.ts` — persistence and usage metadata.
6. `prisma/schema.prisma` — history, token usage, prompt version, and relation constraints.
7. `apps/web/src/widgets/feedback-analysis/` and `suggested-replies/` — processing, retry, and result UX.
8. environment validation and data-minimization/logging policy before adding any provider secret.
