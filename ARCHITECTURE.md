# 2. ARCHITECTURE.md

## Purpose

This file explains the intended architecture of the application at a system and module level.

It complements `AGENTS.md` by making the target system shape more explicit for contributors and AI coding tools.

---

## High-Level Architecture

The system is a modular monolith.

### Frontend

* Vue 3
* Vite
* TypeScript
* Vue Router
* Pinia for limited client/global state
* TanStack Query for server state
* TailwindCSS
* Naive UI or PrimeVue

### Backend

* Node.js
* Fastify
* TypeScript
* Prisma
* PostgreSQL

### Testing

* Vitest
* Supertest
* Vue Test Utils
* Playwright

---

## Architectural Style

### Backend style

The backend follows a modular monolith with layered architecture.

Each module should be organized into:

* domain
* application
* infrastructure
* presentation

### Frontend style

The frontend follows a feature-based module structure.

Pages compose UI and delegate behavior to feature modules, composables, services, and API clients.

---

## Backend Layer Responsibilities

### Domain

Contains:

* domain entities
* value objects when useful
* business rules
* domain validation
* domain errors
* pure calculations

Must not contain:

* Prisma code
* HTTP concerns
* Fastify concerns
* framework-specific dependencies unless truly unavoidable

### Application

Contains use cases.

Responsibilities:

* orchestrate business workflows
* call repositories and domain logic
* enforce use-case level rules
* coordinate transactions when needed

Examples:

* create transaction
* create transfer
* assign money to category
* move money between categories
* generate recurring entries
* open budget month

### Infrastructure

Contains:

* Prisma repositories
* DB mappers
* SQL / persistence details
* integrations with external providers

Infrastructure must not become the place where business rules live.

### Presentation

Contains:

* Fastify routes
* controllers / handlers
* request validation schemas
* auth hooks
* response serialization

Controllers must stay thin.

---

## Recommended Backend Modules

At minimum:

* auth
* users
* budgets
* accounts
* categories
* transactions
* recurring
* bills
* cashflow
* projections
* portfolio
* reports

Recommended addition:

* budgeting

The `budgeting` module should own:

* budget month logic
* category month logic
* ready to assign logic
* money movement between categories
* target evaluation logic
* month rollover behavior

This is important because budgeting behavior is distinct from plain transaction tracking.

---

## Recommended Frontend Modules

At minimum:

* auth
* dashboard
* budgets
* accounts
* categories
* transactions
* recurring
* bills
* cashflow
* projections
* portfolio
* reports

---

## Directory Intent

### Backend

```text
backend/
  src/
    app/
    modules/
    shared/
    prisma/
    server.ts
```

### Frontend

```text
frontend/
  src/
    app/
    modules/
    shared/
    pages/
```

---

## Shared Backend Conventions

### Repositories

Repositories should return domain-friendly shapes or DTOs that the application layer can use safely.

Do not leak raw Prisma models broadly across the application.

### Mapping

Keep database mapping responsibilities in infrastructure.

### Validation

Validate at system boundaries using Zod or Valibot.

### Transactions

Use DB transactions for workflows that must succeed atomically.

Examples:

* create paired transfer transactions
* apply a budget assignment event and materialize month state
* pay a bill and update related records

---

## Shared Frontend Conventions

### Page components

Page components should:

* compose layout
* coordinate feature widgets
* remain thin

### Composables

Use composables for:

* derived feature state
* server interaction wrappers
* reusable UI/business helpers at the client layer

### Pinia

Use Pinia only for:

* auth/session state
* user preferences
* global UI state when necessary

Do not use Pinia as a replacement for server-state caching.

### TanStack Query

Use for:

* data fetching
* caching
* mutation lifecycle
* optimistic UI only when warranted

---

## Cross-Cutting Requirements

### Security

All request input is untrusted.

The system must be designed with:

* strong validation
* least privilege
* safe defaults
* database ownership enforcement
* RLS-aware persistence

### Data integrity

All business state transitions should be explicit.

Do not hide financial mutations in unrelated helpers.

### Observability

Prefer code paths that are easy to test, inspect, and reason about.

### Documentation

Any new major module or cross-cutting pattern should be documented.

---

## Decision Guidelines

When uncertain:

* prefer explicit over implicit
* prefer small modules over large generic abstractions
* prefer use cases over fat controllers
* prefer additive changes over redesigns
* prefer auditability over cleverness

---