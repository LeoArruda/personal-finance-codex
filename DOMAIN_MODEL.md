## Purpose

This file explains the core domain concepts of the application in business language.

It is intentionally separate from SQL and Prisma details.

It should help contributors understand what the system means, not only how tables are shaped.

---

## Domain Overview

This application combines two major domains:

### 1. Financial Ledger Domain

Tracks:

* accounts
* transactions
* transfers
* recurring entries
* statements
* assets and liabilities

### 2. Budget Planning Domain

Tracks:

* category groups and categories
* ready to assign
* budget months
* category months
* targets
* money movement between categories

These domains are connected but not identical.

---

## Main Domain Concepts

### User

The owner of the financial workspace.

A user owns all accounts, categories, budgets, transactions, goals, and related data.

### Budget

The workspace where money is planned.

A budget is distinct from an account ledger.

A budget answers:

* how much money is available to allocate?
* how much is assigned to each category?
* how much remains available in each category this month?

### Category Group

A category group is a planning container.

Examples:

* Bills
* Needs
* Wants
* Savings
* Business
* Travel

### Category

A category is a specific spending, saving, or income bucket.

Examples:

* Rent
* Utilities
* Insurance
* Groceries
* Travel
* Emergency Fund

### Account

An account represents where money is stored, owed, or tracked.

Examples:

* checking account
* savings account
* cash wallet
* credit card
* loan
* investment account

### On-Budget Account

An account whose funds participate in budgeting.

### Tracking Account

An account tracked for visibility or net worth but excluded from budget allocation.

### Transaction

A real financial movement affecting an account.

Examples:

* grocery purchase
* salary deposit
* insurance payment
* transfer between checking and savings

### Transfer

A movement of money between two internal accounts.

A transfer is not normal spending.

### Recurring Rule

A rule that can generate future transactions.

### Budget Month

Represents the budgeting state for one month.

### Category Month

Represents one category’s assigned, activity, and available values in one month.

### Target

A rule describing how a category should be funded.

Examples:

* save $500 monthly
* reach $5,000 by a date
* maintain $1,000 balance

### Goal

A larger user objective such as emergency fund, home purchase, or education savings.

### Asset

Something owned that contributes to net worth.

### Liability

Something owed that reduces net worth.

---

## Core Behavioral Ideas

### Budgeting is not the same as tracking

Tracking answers:

* what happened?

Budgeting answers:

* what should the money do?

### Ready to Assign

Ready to Assign represents money available to allocate to categories.

Only on-budget accounts contribute to this amount.

### Category availability

Category availability is month-based and should reflect:

* carryover
* assignments
* activity
* money movement between categories

### Movement between categories

Moving money between categories does not change the total budget pool.

It only reallocates planned money.

### Transfers between accounts

A transfer changes where money lives, but not necessarily what it is budgeted for.

### Tracking accounts

Tracking accounts affect visibility and net worth, but not Ready to Assign.

---

## Example Domain Scenarios

### Scenario: Rent funding

The user assigns $2,300 to the Rent category in March.

Meaning:

* money is reserved for Rent
* Ready to Assign decreases
* Rent category available increases

### Scenario: Grocery spending

The user spends $80 from checking on groceries.

Meaning:

* checking account is affected
* groceries category activity reflects the spend
* groceries category available decreases

### Scenario: Move money between categories

The user moves $100 from Entertainment to Groceries.

Meaning:

* entertainment available decreases
* groceries available increases
* Ready to Assign stays unchanged

### Scenario: New month

April is opened after March.

Meaning:

* March state remains historical
* April gets its own planning state
* carryover is applied where appropriate
* targets are re-evaluated

### Scenario: Custom group and category

The user creates a group called `Pets` and a category called `Vet`.

Meaning:

* the system supports user-defined planning structure
* the user can budget and transact against it like any built-in category

---

## Domain Invariants

The following statements must always remain true:

1. All protected data belongs to one user.
2. A category belongs to one budget and one category group.
3. A category month belongs to one category and one budget month.
4. A transfer must have a clear source and destination.
5. Money values are stored in minor units.
6. On-budget accounts affect Ready to Assign.
7. Tracking accounts do not affect Ready to Assign.
8. Budget planning state must remain explainable through assignments, activity, and carryover.

---

## Domain Priorities

This project prioritizes:

* clarity of financial behavior
* explainable budgeting
* extensibility for future features
* correctness over premature optimization

---