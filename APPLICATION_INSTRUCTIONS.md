This document contains recommended companion file drafts aligned with the existing `AGENTS.md` and the database model / RLS decisions for this project.

---

# 1. APPLICATION_INSTRUCTIONS.md

## Purpose

This file defines how the database is expected to behave from a business and data integrity perspective.

It exists to help contributors and AI coding agents preserve:

* user ownership boundaries
* budgeting semantics
* financial correctness
* row-level security
* extensibility of the finance domain model

This project is not only a transaction tracker. It combines:

* ledger-style account and transaction tracking
* YNAB-style monthly budgeting and category funding
* planning concepts such as targets, goals, and projections

Any database or repository implementation must preserve both models.

---

## Database Design Goals

The schema must support:

* multi-account personal finance tracking
* on-budget vs tracking accounts
* user-defined category groups and categories
* month-based budgeting
* category targets and funding rules
* assignment and reassignment of money
* transactions, splits, and transfers
* recurring transactions
* statement and bill support
* assets, liabilities, and net worth
* future sync providers and bank connections
* PostgreSQL row-level security

---

## Core Concepts

### User

A user owns all protected business data.

Every business row that should be protected by Row Level Security must include `user_id`.

### Budget

A budget is the planning workspace for a user.

A user may have a default budget initially, but the schema should support multiple budgets in the future.

### Category Group

A category group is a container for categories.

Examples:

* Bills
* Needs
* Wants
* Savings
* Travel
* Business
* any custom group created by the user

### Category

A category belongs to one budget and one category group.

Examples:

* Rent
* Utilities
* Groceries
* Insurance
* Fitness
* Travel
* Emergency Fund

The system must support both:

* default system categories
* custom user-created categories

### Budget Month

A budget month represents planning state for a specific month such as `2026-03`.

It tracks high-level month totals such as:

* ready to assign
* total assigned
* total activity
* total available
* leftover from previous month

### Category Month

A category month represents one category’s state inside one budget month.

It must support:

* assigned
* activity
* available
* carryover from previous month
* underfunded amount
* target status
* snoozed state

### Financial Account

A financial account represents a checking account, savings account, credit card, loan, investment, wallet, or cash account.

### On-Budget Account

An account with `is_on_budget = true` contributes to the budgeting pool and affects Ready to Assign.

### Tracking Account

An account with `is_on_budget = false` is visible for monitoring and net worth but does not contribute to Ready to Assign.

---

## Ownership and Security Rules

### Non-negotiable rule

Every user-owned business table must include `user_id`.

This applies to at least:

* budgets
* category_groups
* categories
* budget_months
* category_months
* category_targets
* budget_assignment_events
* financial_accounts
* transactions
* transaction_splits
* transfer_links
* recurring_rules
* credit_card_statements
* goals
* goal_contributions
* assets
* liabilities
* net_worth_snapshots

### RLS requirement

PostgreSQL Row Level Security must be enabled on all user-owned business tables.

Policies must ensure that users can only access rows where:

`user_id = current_setting('app.current_user_id', true)::uuid`

### Application responsibility

The backend must also validate ownership and relationship consistency before writes.

Examples:

* the account used in a transaction must belong to the same user as the transaction row
* the category used in a transaction must belong to the same user as the transaction row
* the category group and category must belong to the same budget and same user

Never rely only on frontend filtering for access control.

---

## Money Rules

### Minor units only

All monetary values must be stored in the database using integer minor units.

Examples:

* `100` = $1.00
* `12590` = $125.90

Use `BIGINT` for persisted money amounts.

Do not use floating point columns for currency.

### API contract

API payloads may expose decimal values for frontend convenience, but all conversion between decimal display values and integer minor units must be handled explicitly in the backend mapping layer.

---

## Budgeting Behavior Rules

### Category groups and categories

The system must support:

* seeded default groups and categories
* user-created groups
* user-created categories
* sort ordering
* active/inactive state
* visual attributes such as icon and color

### Category month behavior

Conceptually:

`available = carryover_from_previous + assigned - activity + inbound_moves - outbound_moves`

Whether this is recalculated on read or materialized in a table, the resulting behavior must stay equivalent.

### Budget month behavior

A budget month must support:

* ready_to_assign
* total_assigned
* total_activity
* total_available
* leftover_from_previous

### Month rollover

When a new month is opened:

* category available amounts may roll forward
* assigned resets for the new month
* activity is month-specific
* targets are evaluated for the new month

### Targets

The system must support target types such as:

* monthly funding target
* target amount by date
* maintain balance target
* custom target behavior

### Assignment events

Budget changes must be stored as explicit events.

Examples:

* assign money to category
* move money from one category to another
* auto-assign underfunded categories
* reset category assignments

This supports:

* auditability
* recent moves
* undo/redo design
* explainability of month state

---

## Account and Transaction Rules

### Account types

At minimum support:

* checking
* savings
* credit_card
* investment
* cash
* loan
* digital_wallet
* other

### Starting balance behavior

The system must support opening balances as system-generated transactions when useful.

Examples include concepts such as:

* Starting Balance
* Inflow: Ready to Assign
* Category not needed

### Transaction types

At minimum support:

* income
* expense
* transfer
* adjustment
* bill_payment
* refund

### Splits

One transaction may be split across multiple categories.

### Transfers

A transfer between two internal accounts must be represented by:

* a source transaction
* a destination transaction
* a transfer link between them

Do not model transfers as a single unlinked loose row.

### Cleared status

Transactions may be cleared or uncleared.

### Credit card statement support

Transactions may optionally belong to a statement period.

---

## Recurring Rules

Recurring rules must support:

* recurring income
* recurring expense
* recurring transfer
* frequency and interval
* next run date
* auto-create
* auto-post
* optional account/category/merchant references

Recurring rules may generate transactions, but generated transactions remain first-class persisted rows.

---

## Goals, Assets, and Liabilities

### Goals

Goals must support:

* target amount
* current amount
* target date
* optional linked account
* optional linked category
* contributions over time

### Assets

Assets must support:

* manual valuation
* acquisition information
* optional quantity
* inclusion in net worth

### Liabilities

Liabilities must support:

* current balance
* optional original amount
* optional interest rate
* optional due structure
* inclusion in net worth

### Net worth snapshots

The system should support periodic net worth snapshots.

---

## Critical Use Cases

### Create a custom category group

Example:

* user creates `Pets`

Expected behavior:

* insert into `category_groups`
* row includes correct `user_id`
* row belongs to the user’s budget
* row is protected by RLS

### Create a category inside a custom group

Example:

* group: `Pets`
* category: `Vet`

Expected behavior:

* insert into `categories`
* linked to the correct `category_group_id`
* linked to the correct `budget_id`
* linked to the correct `user_id`

### Assign money to a category

Example:

* assign $500 to Rent in March 2026

Expected behavior:

* create `budget_assignment_event`
* update or recalculate `category_month.assigned_minor`
* update or recalculate `category_month.available_minor`
* reduce `budget_month.ready_to_assign_minor`

### Move money between categories

Example:

* move $100 from Entertainment to Groceries

Expected behavior:

* event stored in `budget_assignment_events`
* source category availability decreases
* destination category availability increases
* ready to assign stays unchanged

### Record a spending transaction

Example:

* $80 grocery purchase from checking

Expected behavior:

* create transaction row
* transaction affects account state
* transaction affects category month activity and available state

### Record a transfer

Example:

* move $500 from checking to savings

Expected behavior:

* create source transaction
* create destination transaction
* create transfer link

### Open a new month

Example:

* create April 2026 after March 2026 exists

Expected behavior:

* create new `budget_month`
* create or materialize `category_months`
* apply carryover
* recalculate target state

---

## Invariants

The following must always remain true:

1. A user must never access another user’s rows.
2. Every protected row must belong to exactly one user.
3. A category must belong to the same budget and user as its category group.
4. A category month must belong to the same user as its category and budget month.
5. A transaction account and transaction category must belong to the same user.
6. Transfer source and destination accounts must belong to the same user.
7. Money values must be stored in minor units.
8. Ready to Assign only includes on-budget accounts.
9. Tracking accounts do not affect Ready to Assign.
10. Budget assignment history must remain auditable.

---

## Database Change Rules

When changing the schema:

* preserve `user_id` on protected tables
* preserve RLS policies
* preserve ownership consistency through foreign keys and validation
* prefer additive migrations over destructive redesigns
* document behavior changes in this file
* update indexes if new query patterns justify them

Do not simplify the schema in ways that weaken:

* security
* transfer correctness
* budget semantics
* auditability

---

## Guidance for AI Coding Agents

When generating database-related code:

* assume the app is multi-tenant by user ownership
* always scope reads and writes by authenticated user
* never intentionally bypass RLS
* preserve budgeting as a first-class domain
* do not collapse category groups and categories into one table
* do not store currency as float
* do not implement transfers as single unlinked rows
* favor explicit ownership and explicit relations over shortcuts

---