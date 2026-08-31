# ResolveSignal AI — WORK_HANDOFF v1.0

**Purpose:** instructions for a Work/Codex implementation pass.  
**Date:** 2026-08-30

---

## 1. Read before changing code

Treat these files as the source of truth, in this order:

1. `ResolveSignal_AI_Blueprint_v1.3.md`
2. `ResolveSignal_AI_Technical_Spec_v1.0.md`
3. `ResolveSignal_AI_DESIGN_SPEC_v1.0.md`
4. supplied visual reference screenshot(s)
5. supplied reusable UI source files (`CustomSelect`, `CustomCheckbox`, scrollbar styles)

If documents conflict:
- technical/product behavior follows the Technical Spec;
- architecture follows the Blueprint;
- visual behavior follows DESIGN_SPEC;
- screenshots are directional only.

Do not silently change architectural decisions. If a deviation is necessary to make the project work, document it in the final implementation report.

---

## 2. Goal of this autonomous pass

Implement:

### Phase 0 — complete
- pnpm monorepo;
- `apps/web`;
- `apps/api`;
- `packages/contracts`;
- React + Vite + TypeScript;
- FSD frontend baseline;
- NestJS backend;
- PostgreSQL + Prisma;
- Docker Compose;
- shared Zod contracts;
- lint/typecheck/test scripts;
- env validation;
- CI baseline;
- Swagger/OpenAPI;
- application shell;
- deterministic seed/demo data;
- `MockProvider` AI boundary.

### Phase 1 — scaffold/substantial mock implementation
Build the standalone UI and API/data flow far enough that the product can be explored without a real LLM key:

- Dashboard;
- Feedback List;
- Create Feedback;
- Feedback Details;
- mock AI Analysis;
- mock Suggested Replies;
- filters;
- loading/empty/error states;
- responsive baseline;
- reusable Select/Checkbox adapted to ResolveSignal;
- database persistence for V1 domain entities/endpoints.

The mock provider should return deterministic typed data so tests are stable.

---

## 3. Explicit stop boundary

Do NOT implement during this pass:

- real OpenAI API calls;
- production prompts;
- final Structured Output/OpenAI schema integration;
- AI agent tool/function calling;
- Agent Policy;
- Telegram integration;
- background job system;
- API keys;
- inbound/outbound webhooks;
- auth;
- RBAC;
- multi-tenancy;
- billing;
- microservices;
- Redis/RabbitMQ/Kafka/Kubernetes.

Create clean extension points for these only where the Blueprint explicitly requires them.

---

## 4. Architecture constraints

### Monorepo
Use a pnpm workspace.

### Frontend
Use FSD naturally:
- `app`
- `pages`
- `widgets`
- `features`
- `entities`
- `shared`

Do not over-slice trivial components.

### Backend
Use NestJS modules with application/domain/infrastructure/API separation where it provides real value.

Do not call backend structure “FSD”.

### Shared contracts
Do not duplicate API/analysis enums/types independently in web and api.
Use `packages/contracts`.

### AI
All AI behavior in this pass must go through `LLMProvider` / `MockProvider`.
Do not couple use cases to OpenAI SDK.

### Integrations
Do not add real external integration implementations yet.

---

## 5. Design constraints

Implement the `Hybrid Intelligence` design direction from DESIGN_SPEC.

Key requirement:
- light production SaaS UI;
- distinct but restrained AI Analysis treatment;
- no neon-everywhere styling.

Use design tokens from DESIGN_SPEC as a starting baseline.

The Feedback Details page should be the strongest demo page.

---

## 6. Reusable UI migration

Use the supplied source components as behavioral references, not as copy-paste final design.

### Select
Preserve:
- keyboard behavior;
- option groups;
- disabled items;
- touch/pen handling;
- dropdown alignment/width;
- scroll behavior.

Change:
- name to `Select` if consistent with project exports;
- remove `admin/public` variants;
- replace legacy CSS variables with ResolveSignal tokens;
- English default copy;
- remove stale class references;
- shared scrollbar treatment;
- add/retain meaningful tests.

### Checkbox
Preserve:
- native input;
- controlled API;
- description;
- disabled/required;
- focus-visible;
- reduced motion.

Change:
- name to `Checkbox` if consistent;
- remove `admin/public`;
- ResolveSignal tokens;
- remove stale/unused class/variables;
- add/retain tests.

Do not rewrite these components from scratch unless a concrete technical problem requires it.

---

## 7. Data/demo requirements

Seed at least:

### Positive
5 stars, product/service positive.

### Medium
3 stars, delivery delay.

### Critical
1 star:
“Money was charged twice and support has not responded for three days.”

The critical item should have deterministic mock analysis:

- sentiment: negative
- severity: critical
- category: payment
- summary describing duplicate payment and no support response
- detected problems:
  - duplicate payment
  - support unavailable/non-responsive

Provide one or more realistic suggested replies.

---

## 8. Required developer experience

At repository root, documented commands should make it easy to:

- install dependencies;
- start PostgreSQL;
- run migrations;
- seed database;
- run web;
- run API;
- run lint;
- run typecheck;
- run tests;
- run build.

Prefer useful root scripts instead of forcing repeated deep `cd` navigation.

No secrets committed.

Provide `.env.example`.

---

## 9. Quality gates before declaring the pass done

Must pass:

- install succeeds;
- lint succeeds;
- TypeScript typecheck succeeds;
- unit/integration tests succeed;
- production build succeeds;
- local DB startup documented;
- migrations succeed;
- seed succeeds;
- frontend starts;
- backend starts;
- health endpoint works;
- Swagger opens;
- mock dashboard/feedback flow works;
- Select keyboard behavior works;
- Checkbox remains accessible;
- no OpenAI secret required for this pass.

Run and report these checks. Do not merely claim them.

---

## 10. Git/change discipline

- Prefer coherent commits/changes by concern.
- Do not make unrelated cosmetic refactors.
- Do not reformat untouched files unnecessarily.
- Do not add dependencies without a concrete use.
- Avoid giant catch-all utility modules.
- Keep provider/integration boundaries explicit.
- Do not introduce abstractions that exist only for hypothetical future scale.

---

## 11. Final implementation report

At the end, provide:

1. What was implemented.
2. Exact repository structure.
3. Important architectural decisions made.
4. Any deviation from Blueprint/TZ/Design Spec and why.
5. Commands run and results.
6. Tests added and results.
7. Known issues / intentionally deferred work.
8. Recommended next step.
9. A concise list of files/areas that should be reviewed before real OpenAI integration.

The next human/assistant review checkpoint is **before adding OpenAIProvider and production LLM behavior**.
