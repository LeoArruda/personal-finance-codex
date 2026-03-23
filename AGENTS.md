# AGENTS.md

## Purpose

This file defines how contributors and AI coding agents should build, modify, and reason about this project.

It is the practical execution guide for day-to-day implementation. It complements `ARCHITECTURE.md`, which defines the target system shape.

This file is intentionally opinionated. It prioritizes correctness, clarity, maintainability, and explicit business behavior.

When making changes, treat this file as the default operating contract.

---

## Companion Documents

Use this file together with:

- `ARCHITECTURE.md` → system structure, module boundaries, frontend and backend architecture
- `APPLICATION_INSTRUCTIONS.md` → application behavior, business workflows, invariants
- `DATABASE_TASKING_GUIDE.md` → database change process and migration expectations
- `DOMAIN_MODEL.md` → domain concepts, terminology, and business meaning

If one of these files exists and is relevant to the task, it must be respected.

---

## Core Principles

### 1. Clarity over cleverness

- Prefer explicit, readable solutions.
- Avoid unnecessary abstractions.
- Make business and financial behavior easy to reason about.
- Choose the implementation a teammate can safely extend later.

### 2. Correctness over speed

This is a financial system.

- Never trade correctness for convenience.
- Every money movement must be explainable.
- Every state change should be understandable from the code.

### 3. Explicit over implicit

- No hidden side effects.
- No magic state mutations.
- No vague “helper” functions that quietly change financial state.
- Prefer intent-driven actions and use cases.

### 4. Single responsibility

- Each module owns a clear business area.
- Each component, composable, function, and use case should have a narrow purpose.
- Avoid oversized files that mix concerns.

### 5. Maintainability over premature abstraction

- Extract only when the destination is clearly better.
- Duplication inside one feature is often preferable to a bad shared abstraction.
- Do not create patterns that the project does not actually need yet.

### 6. Test-first mindset where practical

- Write tests before implementation when possible.
- At minimum, write or update tests when behavior changes meaningfully.
- Tests should describe business behavior and protect invariants.

---

## General Rules for AI Coding Agents

When implementing or modifying code:

1. Read nearby files first.
2. Follow `ARCHITECTURE.md` and existing project patterns.
3. Match existing naming, structure, and conventions.
4. Make the smallest change that fully solves the task.
5. Keep responsibilities narrow.
6. Prefer explicit business actions over generic update flows.
7. Add types for non-trivial shapes.
8. Do not introduce new dependencies casually.
9. Do not move feature-specific code into `shared` unless it is truly reusable across modules.
10. Leave the codebase cleaner than you found it.

When unsure:

- prefer explicit over clever
- prefer domain clarity over abstraction
- prefer correctness over performance
- prefer auditability over convenience
- prefer additive changes over redesigns

---

## Repository Shape

```text
frontend/
  src/
    app/
    modules/
    shared/
    pages/

backend/
  src/
    app/
    modules/
    shared/
    prisma/
```

Use this shape consistently.

---

## Tech Stack Assumptions

### Frontend

- Vue 3
- Vite
- TypeScript
- Vue Router
- TailwindCSS
- Pinia
- TanStack Query

### Backend

- Node.js
- Fastify
- TypeScript
- Prisma

### Database

- PostgreSQL
- Row Level Security for user-owned data

### Validation

- Zod or Valibot

### Testing

- Vitest
- Vue Test Utils
- Playwright
- Supertest

Do not casually substitute core stack choices unless the project is explicitly changing direction.

---

## Frontend Rules

### Frontend architecture

Follow the feature-based frontend architecture defined in `ARCHITECTURE.md`.

- `app/` = global setup and application-wide concerns
- `pages/` = thin route composition
- `modules/` = feature ownership
- `shared/` = generic, broadly reusable building blocks only

### `frontend/src/app`

Use for application-wide setup only.

Examples:

- router
- query client
- pinia setup
- layouts
- global styles
- design tokens
- bootstrapping

Do not place feature-specific logic here.

### `frontend/src/pages`

Pages should stay thin.

Pages may:

- read route params
- call feature composables
- wire layout regions
- compose feature widgets

Pages must not become the place where large UI logic, formatting logic, query logic, or reusable behavior lives.

### `frontend/src/modules`

This is the default place for feature code.

A feature module may contain:

- components
- composables
- services
- query wrappers
- mutation wrappers
- stores for feature UI state
- types
- validators
- selectors
- utils
- subareas like `sidebar/` or `inspector/`

Keep code close to the feature that uses it.

### `frontend/src/shared`

Only generic and broadly reusable code belongs here.

Examples:

- base UI primitives
- generic utilities
- shared formatters
- shared composables
- common types

Do not use `shared` as a dumping ground.

---

## Frontend State Rules

### TanStack Query

TanStack Query is the default home for server state.

Use it for:

- data fetching
- caching
- background refresh
- mutation lifecycle
- query invalidation
- optimistic updates when justified

Examples of server state:

- budget month payload
- account lists
- category lists
- reports
- projections
- summary cards
- recommendations

Do not duplicate fetched API data into Pinia by default.

### Pinia

Pinia is for limited client-side application state and feature UI orchestration.

Use Pinia for:

- auth and session state
- user preferences
- layout preferences
- selected row or entity
- expanded groups
- active filters
- current inline edit target
- sidebar collapsed state
- popover open state

Pinia must not become the default store for fetched API payloads.

### Local component state

Use local component state for short-lived concerns.

Examples:

- hover state
- temporary input buffer
- focus state
- one-off animation toggles

---

## Frontend UI Rules

### Primary product surfaces

Primary product surfaces should be implemented as custom UI.

Examples:

- budgeting grid
- account register
- projections workspace
- report comparison surfaces
- contextual inspector panels

Build these from:

- custom Vue components
- TailwindCSS
- shared tokens
- small reusable primitives

Avoid generic admin/dashboard-looking implementations for these areas.

### Headless interaction primitives

Use low-level or headless primitives when interaction complexity justifies them.

Examples:

- popovers
- menus
- tabs
- dialogs
- overlays
- tooltips
- keyboard navigation helpers

These should support the product UI, not define its visual identity.

### Styling

The interface should favor:

- calm and dense productivity-oriented layouts
- soft surface contrast
- subtle borders
- restrained shadows
- strong hierarchy through spacing and typography
- accessible hover and focus states

Avoid noisy visual systems and inconsistent one-off styling.

### Design tokens

Use app-level tokens for:

- colors
- spacing
- border radii
- shadows
- typography
- semantic states
- layout widths where useful

Do not hardcode one-off values repeatedly when a token should exist.

---

## Frontend Component Rules

- Keep components focused.
- Prefer composition over giant all-purpose components.
- Lift state only when it is truly shared.
- Use typed props and emits for non-trivial components.
- Keep presentational components mostly stateless where practical.
- Keep formatting logic out of templates once it grows beyond trivial display work.

### Recommended composition pattern

Prefer this shape:

- page composes feature widgets
- feature widgets compose smaller feature components
- shared primitives support both

---

## Frontend Composable Rules

Use composables for:

- feature query wrappers
- derived feature behavior
- reusable interaction patterns
- input handling abstractions
- keyboard helpers
- client-side orchestration that improves clarity

Do not create composables that merely hide a few lines of code without improving structure.

Prefer clear names such as:

- `useBudgetMonthQuery`
- `useBudgetMutations`
- `useCurrencyInput`
- `useBudgetSelection`

---

## Budgets Module Guidance

The budgets module is a model example of how frontend features should be structured.

Recommended shape:

```text
frontend/src/modules/budgets/
  components/
  inspector/
  sidebar/
  composables/
  services/
  stores/
  types/
  utils/
```

### Budgets page responsibilities

The route page should:

- read the month route param
- render the app shell
- compose sidebar, header, toolbar, table, and inspector
- remain intentionally thin

### Budgets UI state in Pinia

Good examples:

- selected category or group
- expanded group IDs
- active chip filter
- current editing category ID
- assign popover tab/open state

### Budgets server state in TanStack Query

Good examples:

- month payload
- category values
- summary cards
- recommendations
- mutation wrappers for assigning money and auto-assign actions

### Budgets UI implementation guidance

The budgeting workspace should feel like a desktop productivity surface.

Prioritize:

- row density and alignment
- inline editing
- contextual inspector behavior
- subtle visual feedback
- keyboard-friendly interactions
- optimistic UI when appropriate

Do not force the budget table into a generic data-table abstraction if it harms fidelity or interaction quality.

---

## Backend Rules

### Backend architecture

Follow the layered modular monolith structure from `ARCHITECTURE.md`.

Each module should prefer these layers:

- domain
- application
- infrastructure
- presentation

### Domain

Contains:

- entities
- value objects when helpful
- domain rules
- invariants
- domain-specific validation
- calculations
- domain errors

Must not contain:

- Prisma code
- Fastify code
- HTTP concerns
- transport concerns
- persistence implementation details

The domain layer should stay pure.

### Application

Contains:

- use cases
- workflow orchestration
- transaction coordination
- sequencing of business processes

Prefer intent-driven use cases such as:

- `assignMoneyToCategory`
- `moveMoneyBetweenCategories`
- `recordTransaction`
- `applyAutoAssignStrategy`
- `openBudgetMonth`
- `performMonthRollover`

### Infrastructure

Contains:

- Prisma repositories
- persistence mappers
- SQL details
- external provider integrations

Infrastructure must not quietly accumulate business rules.

### Presentation

Contains:

- Fastify routes
- schemas
- handlers or controllers
- request validation
- auth hooks
- response mapping

Controllers and handlers must stay thin.

---

## Financial and Data Integrity Rules

### Multi-tenancy by user

Assume this is a multi-tenant system.

- Every protected row must include `user_id` or equivalent ownership.
- No cross-user access is allowed.
- Ownership must be enforced in the backend, not inferred from the client.

### Row-Level Security

- RLS should be enabled on all user-owned tables.
- Do not bypass RLS in normal flows.
- Any change that affects ownership or access control must preserve the RLS model.

### Money handling

- Store money as integer minor units.
- Use `BIGINT` where appropriate.
- Never use floats for financial storage or calculation.

### Financial mutations

- All money movement must be explicit and traceable.
- Prefer intent-driven actions over vague patch endpoints.
- Do not hide balance-affecting behavior in unrelated helpers.
- Use database transactions when a workflow must succeed atomically.

Examples:

- creating both sides of a transfer
- applying a budget assignment and updating materialized month state
- paying a bill and updating related records

### Transfers

Transfers must be explicit.

- Always create paired entries when the model requires it.
- Always link the two sides.
- Transfers change money location, not spending intent.

---

## Budgeting Domain Rules

This system is not just a ledger.

It must support budgeting as a first-class domain.

Important concepts include:

- category groups
- categories
- monthly budgeting
- targets
- assignment events
- ready-to-assign behavior
- month-based category availability
- month rollover behavior

Budgeting behavior must not be casually mixed into generic transaction code when a distinct budgeting use case or module is more appropriate.

---

## Validation Rules

### Backend validation

Validate all untrusted input at system boundaries.

Use validation for:

- request bodies
- route params
- query strings
- environment configuration
- external payloads when needed

### Frontend validation

Frontend validation should improve UX, not enforce security.

Use it for:

- form correctness
- inline feedback
- early error prevention
- client-side guardrails

Never rely on frontend validation alone for integrity or ownership enforcement.

---

## Naming Guidance

Prefer names that describe business intent and UI purpose.

Good:

- `BudgetMonthPage.vue`
- `BudgetCategoryRow.vue`
- `useBudgetMonthQuery.ts`
- `assignMoneyToCategory.ts`

Avoid vague names such as:

- `data.ts`
- `helpers.ts`
- `manager.ts`
- `misc.ts`
- `commonUtils.ts`

---

## Testing Rules

### What must be tested

High priority areas:

- ownership and RLS behavior
- budgeting calculations
- transfers
- recurring logic
- month rollover
- financial mutations
- query/mutation wrappers with important behavior
- interaction-heavy UI such as inline editing and popovers

### Test philosophy

- Test behavior, not implementation trivia.
- Prefer integration tests for financial flows.
- Protect invariants and business meaning.
- Add or update tests when behavior changes meaningfully.

### Critical invariants to protect

- users cannot access another user’s data
- money is conserved in transfers
- category movements do not change total budget
- ready-to-assign behaves correctly
- month rollover preserves intended state transitions

---

## Refactoring Guidance

When refactoring:

- preserve module boundaries
- avoid unrelated rewrites
- extract only when the result is clearly better
- prefer incremental cleanup over speculative redesign
- do not create shared abstractions prematurely

If duplication exists only inside one feature, duplication may be acceptable until a real shared pattern becomes clear.

---

## Security Rules

- All input is untrusted.
- Validate at boundaries.
- Enforce ownership in the backend.
- Use least privilege.
- Prefer safe defaults.
- Never rely only on frontend checks.

Any code that affects auth, ownership, or financial state deserves extra scrutiny.

---

## Documentation Rules

Documentation should be updated when:

- a major module is introduced
- a cross-cutting pattern changes
- a domain invariant changes
- a workflow changes in a way that future contributors need to understand

Prefer small, accurate documentation over stale documentation.

---

## Definition of Done

A task is complete only if:

- behavior is correct
- relevant tests exist and pass
- no critical invariants are broken
- security and ownership rules are preserved
- architecture boundaries remain intact
- documentation is updated when needed

---

## What to Avoid

- giant page components
- dumping feature code into `shared`
- putting fetched API payloads in Pinia by default
- hidden business logic inside infrastructure or UI helpers
- generic dashboard widgets for core product surfaces
- vague function names
- silent failures
- magic state mutations
- over-abstraction too early
- mixing transport, persistence, and domain rules together

---

## Preferred Delivery Style for AI Agents

When producing code:

- keep files focused
- use explicit TypeScript types
- include only necessary comments
- avoid placeholder abstractions unless they are immediately useful
- preserve readability
- favor stable structure over cleverness

If a request conflicts with these rules, prefer these rules unless the project maintainers explicitly change the contract.

---

## Relationship to ARCHITECTURE.md

`ARCHITECTURE.md` defines the target architecture.

`AGENTS.md` defines how contributors and AI coding agents should act inside that architecture.

If there is a conflict, prefer:

1. correctness
2. maintainability
3. explicit module boundaries
4. the structure and intent defined in `ARCHITECTURE.md`
