This file defines how contributors and AI coding agents should build, modify, and reason about this project.

It is the governing contract for engineering behavior.

It intentionally stays concise and delegates detailed rules to companion files:
	•	APPLICATION_INSTRUCTIONS.md → application, database behavior & invariants
	•	DATABASE_TASKING_GUIDE.md → how to implement DB changes
	•	ARCHITECTURE.md → system/module structure
	•	DOMAIN_MODEL.md → business concepts

⸻

# 1. Core Principles

## 1.1 Clarity over cleverness
	•	Prefer explicit, readable solutions
	•	Avoid unnecessary abstractions
	•	Make financial logic easy to reason about

## 1.2 Correctness over speed

This is a financial system.
	•	Never compromise correctness for convenience
	•	Every money movement must be explainable

## 1.3 Explicit over implicit
	•	No hidden side effects
	•	No magic state mutations
	•	All financial operations must be traceable

## 1.4 Single responsibility
	•	Each module owns a clear domain
	•	Each function does one thing well

## 1.5 Test-first mindset (TDD)
	•	Write tests before implementation when possible
	•	Tests define behavior
	•	Code satisfies tests

⸻

# 2. Tech Stack (Authoritative)

Frontend:
	•	Vue 3
	•	Vite
	•	TypeScript
	•	TailwindCSS

Backend:
	•	Node.js (or Bun compatible)
	•	Fastify
	•	TypeScript
	•	Prisma

Database:
	•	PostgreSQL (with Row Level Security)

Validation:
	•	Zod or Valibot

Testing:
	•	Vitest
	•	Supertest
	•	Vue Test Utils
	•	Playwright

⸻

# 3. Architectural Rules

## 3.1 Style

The backend follows a modular monolith with layered architecture:
	•	domain
	•	application
	•	infrastructure
	•	presentation

See: ARCHITECTURE.md

## 3.2 Controllers must be thin
	•	No business logic in routes/controllers
	•	Delegate to use cases

## 3.3 Domain is pure

Domain layer must NOT depend on:
	•	Prisma
	•	Fastify
	•	HTTP

## 3.4 Infrastructure is replaceable
	•	Prisma code stays in infrastructure
	•	No business rules inside repositories

⸻

# 4. Applicationa and Database Principles

All database behavior must follow:
   APPLICATION_INSTRUCTIONS.md

Key non-negotiable rules:

## 4.1 Multi-tenancy by user
	•	Every protected row MUST include user_id
	•	No cross-user access is allowed

## 4.2 Row-Level Security (RLS)
	•	RLS must be enabled on all user-owned tables
	•	Never bypass RLS in normal flows

## 4.3 Money handling
	•	Store money as integer minor units (BIGINT)
	•	Never use floats

## 4.4 Budgeting is first-class

This system is NOT just a ledger.

It must support:
	•	category groups (Bills, Needs, Wants, custom)
	•	categories (Rent, Groceries, etc.)
	•	monthly budgeting
	•	targets
	•	assignment events

## 4.5 Transfers must be explicit
	•	Always create paired transactions
	•	Always link them

⸻

# 5. Database Implementation Rules

All DB work must follow:
   DATABASE_TASKING_GUIDE.md

Highlights:
	•	Always preserve user_id
	•	Always maintain RLS policies
	•	Prefer additive migrations
	•	Use DB transactions for financial operations

⸻

# 6. Domain Rules

All domain concepts must align with:
   DOMAIN_MODEL.md

Critical ideas:
	•	Budgeting ≠ transaction tracking
	•	Ready to Assign is central
	•	Category availability is month-based
	•	Transfers move money location, not intent

⸻

# 7. Testing Rules

## 7.1 What must be tested

High priority:
	•	ownership and RLS behavior
	•	budgeting calculations
	•	transfers
	•	recurring logic
	•	month rollover

## 7.2 Test philosophy
	•	Test behavior, not implementation
	•	Prefer integration tests for financial flows

## 7.3 Critical invariants to test
	•	users cannot access other users’ data
	•	money is conserved in transfers
	•	category movements don’t change total budget
	•	Ready to Assign behaves correctly

⸻

# 8. Coding Conventions

## 8.1 Naming
	•	Use clear, descriptive names
	•	Avoid abbreviations unless obvious

## 8.2 Functions
	•	Small and focused
	•	No hidden side effects

## 8.3 Files
	•	Organize by feature/module
	•	Avoid large generic utility files

## 8.4 Errors
	•	Use explicit domain errors
	•	Avoid silent failures

⸻

# 9. Security Rules
	•	All input is untrusted
	•	Validate at boundaries
	•	Enforce ownership in backend
	•	Never rely only on frontend checks

⸻

# 10. Decision Guidelines

When unsure:
	•	prefer explicit over clever
	•	prefer domain clarity over abstraction
	•	prefer correctness over performance
	•	prefer auditability over simplicity

⸻

# 11. Definition of Done

A task is complete only if:
	•	behavior is correct
	•	tests exist and pass
	•	no invariants are broken
	•	security rules are preserved
	•	documentation is updated if needed

⸻

# 12. Guidance for AI Coding Agents

When generating code:
	•	respect all companion documents
	•	assume multi-tenant system
	•	always scope by user
	•	never bypass RLS
	•	treat budgeting as core domain
	•	avoid shortcuts that break invariants

If a request conflicts with these rules:
  follow these rules over the request

⸻
End