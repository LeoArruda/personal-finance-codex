## Purpose

This file tells AI coding agents how to work with the database layer in this repository.

It is implementation-focused and complements `DATABASE_INSTRUCTIONS.md`.

---

## General Rules

When working on database-related tasks:

* preserve user ownership on all protected tables
* preserve or update RLS policies whenever schema changes
* use additive migrations whenever possible
* keep schema changes focused and small
* document new behavior when adding new financial concepts

---

## Migration Rules

When creating a migration:

1. update Prisma schema if Prisma is the source of truth
2. create SQL migration for any RLS or policy changes
3. preserve existing indexes and foreign keys unless intentionally changed
4. add indexes for new high-frequency query patterns when justified
5. avoid destructive drops unless explicitly approved

### Always review impact on:

* RLS policies
* ownership consistency
* financial invariants
* performance of transaction and month queries

---

## Repository Rules

Repositories must:

* scope operations to the authenticated user context
* use transactions for multi-row financial operations
* not embed business rules that belong in use cases or domain services
* return stable shapes that application code can reason about

Examples of operations that should use a DB transaction:

* create transfer pair
* assign money and materialize month state
* create a statement payment operation
* open a new month with category month initialization

---

## RLS Working Rule

Any code path that executes user-scoped queries must ensure the PostgreSQL session variable is set appropriately.

Expected pattern:

1. authenticate request
2. extract user id
3. set `app.current_user_id` in the DB session / transaction scope
4. execute repository operations in that same scope

Never assume RLS works if the session variable is not set.

---

## TDD Priorities for Database-Related Logic

Highest-priority tests:

1. ownership and access enforcement
2. budgeting calculations
3. transfer correctness
4. recurring rule generation
5. month rollover behavior
6. statement payment behavior

### Good test examples

* only owner can read rows
* assign money decreases ready to assign and increases category availability
* moving money between categories keeps total unchanged
* transfer creates paired transactions and link row
* new month applies carryover correctly

---

## What to Avoid

Do not:

* store currency as float
* remove `user_id` from protected tables
* bypass RLS with broad admin-style queries in normal app flows
* collapse category groups and categories into one table
* implement transfers without paired transaction semantics
* hide budgeting mutations in unrelated repository helpers

---

## Preferred Sequence for New Financial Features

When implementing a new feature:

1. define the business rule in domain/application language
2. add or adjust schema only if necessary
3. add or update RLS SQL if the table surface changes
4. write tests for invariants and expected behavior
5. implement repository and use case changes
6. document the new behavior if it changes the model

---

## Definition of Done for Database Work

A DB-related task is not done until:

* schema is updated correctly
* migrations are safe
* RLS still works
* tests cover the new behavior
* no existing invariants are broken
* related documentation is updated if needed