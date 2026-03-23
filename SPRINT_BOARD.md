# Sprint-Ready Board (Backend First, TDD)

This board operationalizes `BACKLOG.md` into sprint-friendly stories and execution slices.

Scope principles:
- Backend-first delivery
- TDD-first implementation
- Security and invariants are non-negotiable
- Every story is independently testable and demonstrable

---

## Story Template (Use for all tickets)

- **ID:** `BE-XX`
- **Title:** short action-oriented title
- **User Story:** `As a <role>, I want <capability>, so that <outcome>.`
- **Dependencies:** list of required completed stories
- **Implementation Notes:** layering and constraints
- **Test Files:** exact files to add/update
- **Acceptance Criteria:** concrete behavior outcomes
- **Definition of Done:** checklist

---

## Global Definition of Done (Applies to Every Story)

A story is Done only when:
- Integration tests are written first and passing.
- Unit/domain tests are added where business logic exists.
- Route/controller remains thin, delegating to application use-case.
- Repository calls are user-scoped and RLS-safe.
- Money handling uses minor units only.
- No cross-user access path is possible.
- Lints/build/tests pass.
- Behavior is documented in `BACKLOG.md`/this board if scope changed.

---

## Sprint 1 - Foundation + Auth/Users

## BE-01 App/Test Harness Baseline
### Status: DONE
- **User Story:** As a developer, I want a stable app/test harness so that every feature can be delivered with reliable integration tests.
- **Dependencies:** none
- **Implementation Notes:** keep app composition in `app`, no feature logic in bootstrap.
- **Test Files:**
  - `backend/test/integration/app/health.spec.ts`
  - `backend/test/helpers/createTestApp.ts`
  - `backend/test/helpers/testDb.ts`
- **Acceptance Criteria:**
  - `GET /health` returns 200 and `{ ok: true }`.
  - Test helper spins app and isolates DB data per test.
  - Build and test commands run in CI mode.

## BE-02 Auth Guard + Request Context
### Status: DONE
- **User Story:** As an API owner, I want token validation and request user context so that user-scoped access is enforced.
- **Dependencies:** BE-01
- **Test Files:**
  - `backend/test/integration/app/auth-guard.spec.ts`
  - `backend/test/integration/app/request-context.spec.ts`
  - `backend/test/unit/modules/auth/presentation/authHook.spec.ts`
- **Acceptance Criteria:**
  - Missing/invalid token -> `401`.
  - Valid token -> request has user id.
  - DB operations execute in context of `app.current_user_id`.

## BE-03 Users /me Read
### Status: DONE
- **User Story:** As an authenticated user, I want to fetch my profile so that I can confirm account details.
- **Dependencies:** BE-02
- **Test Files:**
  - `backend/test/integration/modules/users/get-current-user.spec.ts`
- **Acceptance Criteria:**
  - `GET /api/v1/users/me` returns caller profile only.
  - No other user data can be reached.

## BE-04 Users /me Update
### Status: DONE
- **User Story:** As an authenticated user, I want to update profile settings so that my workspace uses my preferences.
- **Dependencies:** BE-03
- **Test Files:**
  - `backend/test/integration/modules/users/update-current-user.spec.ts`
  - `backend/test/unit/modules/users/application/updateCurrentUser.spec.ts`
- **Acceptance Criteria:**
  - `PATCH /api/v1/users/me` updates only allowed fields.
  - Invalid payload returns validation error.
  - `updated_at` changes.

---

## Sprint 2 - Budgets + Categories

## BE-05 Budgets List/Create
### Status: DONE
- **User Story:** As a user, I want to create and list budgets so that I can organize financial planning contexts.
- **Dependencies:** BE-04
- **Test Files:**
  - `backend/test/integration/modules/budgets/list-budgets.spec.ts`
  - `backend/test/integration/modules/budgets/create-budget.spec.ts`
- **Acceptance Criteria:**
  - User sees only own budgets.
  - New budget gets caller `user_id`.

## BE-06 Budgets Update/Set Default
### Status: DONE
- **User Story:** As a user, I want to set a default budget so that the app has a predictable active workspace.
- **Dependencies:** BE-05
- **Test Files:**
  - `backend/test/integration/modules/budgets/update-budget.spec.ts`
  - `backend/test/integration/modules/budgets/set-default-budget.spec.ts`
  - `backend/test/unit/modules/budgets/application/setDefaultBudget.spec.ts`
- **Acceptance Criteria:**
  - Exactly one default budget per user.
  - Cross-user budget changes are denied.

## BE-07 Category Groups CRUD (Minimal)
### Status: DONE
- **User Story:** As a user, I want to manage category groups so that I can structure budget intent.
- **Dependencies:** BE-05
- **Test Files:**
  - `backend/test/integration/modules/categories/list-category-groups.spec.ts`
  - `backend/test/integration/modules/categories/create-category-group.spec.ts`
- **Acceptance Criteria:**
  - Group belongs to user and budget.
  - Sorted list is deterministic.

## BE-08 Categories CRUD (Minimal)
### Status: DONE
- **User Story:** As a user, I want to manage categories so that I can assign and track money by purpose.
- **Dependencies:** BE-07
- **Test Files:**
  - `backend/test/integration/modules/categories/create-category.spec.ts`
  - `backend/test/integration/modules/categories/update-category.spec.ts`
  - `backend/test/unit/modules/categories/application/createCategory.spec.ts`
- **Acceptance Criteria:**
  - Category cannot be created under another user's group/budget.
  - Active/inactive and sort_order persist correctly.

---

## Sprint 3 - Accounts + Transactions (Simple + Splits)

## BE-09 Accounts CRUD (Minimal + Archive)
### Status: DONE
- **User Story:** As a user, I want to manage financial accounts so that ledger flows have valid sources/destinations.
- **Dependencies:** BE-06
- **Test Files:**
  - `backend/test/integration/modules/accounts/list-accounts.spec.ts`
  - `backend/test/integration/modules/accounts/create-account.spec.ts`
  - `backend/test/integration/modules/accounts/update-account.spec.ts`
  - `backend/test/unit/modules/accounts/application/createAccount.spec.ts`
- **Acceptance Criteria:**
  - Accounts are fully user-scoped.
  - On-budget/tracking flag is stored and retrievable.
  - Archive does not erase history.

## BE-10 Transactions CRUD (Simple)
### Status: DONE
- **User Story:** As a user, I want to create/list/update transactions so that account activity is recorded accurately.
- **Dependencies:** BE-09, BE-08
- **Test Files:**
  - `backend/test/integration/modules/transactions/create-transaction.spec.ts`
  - `backend/test/integration/modules/transactions/list-transactions.spec.ts`
  - `backend/test/integration/modules/transactions/update-transaction.spec.ts`
  - `backend/test/unit/modules/transactions/application/createTransaction.spec.ts`
- **Acceptance Criteria:**
  - Transaction references must belong to same user.
  - Filters (date/account/category/type) work.
  - Cross-user access impossible.

## BE-11 Transaction Splits
### Status: DONE
- **User Story:** As a user, I want split transactions so that one payment can map to multiple categories.
- **Dependencies:** BE-10
- **Test Files:**
  - `backend/test/integration/modules/transactions/create-transaction-splits.spec.ts`
  - `backend/test/integration/modules/transactions/update-transaction-splits.spec.ts`
  - `backend/test/unit/modules/transactions/application/applyTransactionSplits.spec.ts`
- **Acceptance Criteria:**
  - Split rows are user-consistent with parent transaction.
  - Split updates are atomic.
  - Split totals follow defined business rule.

---

## Sprint 4 - Transfers + Budgeting Core

## BE-12 Transfers (Paired Transactions + Link)
### Status: DONE
- **User Story:** As a user, I want account transfers so that money location changes are explicit and auditable.
- **Dependencies:** BE-10
- **Test Files:**
  - `backend/test/integration/modules/transactions/create-transfer.spec.ts`
  - `backend/test/integration/modules/transactions/list-transfers.spec.ts`
  - `backend/test/unit/modules/transactions/application/createTransfer.spec.ts`
- **Acceptance Criteria:**
  - Source + destination transactions + transfer link created atomically.
  - Accounts differ and belong to same user.
  - Transfer invariants enforced.

## BE-13 Budget Month Read + Open Month
### Status: DONE
- **User Story:** As a user, I want to open/read budget months so that monthly planning states are explicit.
- **Dependencies:** BE-08
- **Test Files:**
  - `backend/test/integration/modules/budgeting/open-month.spec.ts`
  - `backend/test/integration/modules/budgeting/month-summary.spec.ts`
- **Acceptance Criteria:**
  - Open month initializes expected state.
  - Carryover behavior is applied.

## BE-14 Assign Money to Category
### Status: DONE
- **User Story:** As a user, I want to assign money to categories so that my month reflects intentional plans.
- **Dependencies:** BE-13
- **Test Files:**
  - `backend/test/integration/modules/budgeting/assign-money.spec.ts`
  - `backend/test/unit/modules/budgeting/domain/readyToAssign.spec.ts`
- **Acceptance Criteria:**
  - Assignment writes event and updates month/category values.
  - `ready_to_assign` decreases accordingly.

## BE-15 Move Money Between Categories
### Status: DONE
- **User Story:** As a user, I want to move budgeted money between categories so that priorities can change without changing totals.
- **Dependencies:** BE-14
- **Test Files:**
  - `backend/test/integration/modules/budgeting/move-money.spec.ts`
  - `backend/test/unit/modules/budgeting/domain/categoryMove.spec.ts`
- **Acceptance Criteria:**
  - Source decreases, destination increases.
  - Total budget pool remains unchanged.

---

## Sprint 5 - Recurring + Statements/Bills

## BE-16 Recurring Rules CRUD + Run Due
### Status: DONE
- **User Story:** As a user, I want recurring rules so that predictable transactions are generated consistently.
- **Dependencies:** BE-10
- **Test Files:**
  - `backend/test/integration/modules/recurring/create-rule.spec.ts`
  - `backend/test/integration/modules/recurring/run-due-rules.spec.ts`
  - `backend/test/unit/modules/recurring/application/generateRecurringTransactions.spec.ts`
- **Acceptance Criteria:**
  - Rules validate ownership on optional references.
  - Running due rules creates correct transactions and updates `next_run_at`.

## BE-17 Credit Card Statements
### Status: DONE
- **User Story:** As a user, I want statement period tracking so that credit card lifecycle is explicit.
- **Dependencies:** BE-10, BE-09
- **Test Files:**
  - `backend/test/integration/modules/bills/create-statement.spec.ts`
  - `backend/test/integration/modules/bills/mark-statement-paid.spec.ts`
  - `backend/test/unit/modules/bills/application/markStatementPaid.spec.ts`
- **Acceptance Criteria:**
  - Statement/account ownership enforced.
  - Mark-paid behavior is atomic and consistent.

## BE-18 Bills (If Separate from Statements)
### Status: DONE
- **User Story:** As a user, I want bill records and payment action so that obligations are visible and payable.
- **Dependencies:** BE-17
- **Test Files:**
  - `backend/test/integration/modules/bills/create-bill.spec.ts`
  - `backend/test/integration/modules/bills/pay-bill.spec.ts`
  - `backend/test/unit/modules/bills/application/payBill.spec.ts`
- **Acceptance Criteria:**
  - Bill payment results in valid financial records.
  - State transitions are explicit and traceable.

---

## Sprint 6 - Goals + Reports

## BE-19 Goals + Contributions
### Status: DONE
- **User Story:** As a user, I want goals and contributions so that progress toward financial objectives is measurable.
- **Dependencies:** BE-10, BE-09, BE-08
- **Test Files:**
  - `backend/test/integration/modules/goals/create-goal.spec.ts`
  - `backend/test/integration/modules/goals/add-goal-contribution.spec.ts`
  - `backend/test/unit/modules/goals/application/addGoalContribution.spec.ts`
- **Acceptance Criteria:**
  - Goal and contribution ownership constraints enforced.
  - Optional linked refs remain same-user consistent.

## BE-20 Reports (Net Worth, Cashflow, Spending by Category)
### Status: DONE
- **User Story:** As a user, I want reporting endpoints so that I can understand trends and make decisions.
- **Dependencies:** BE-19 and prior transactional data stories
- **Test Files:**
  - `backend/test/integration/modules/reports/net-worth.spec.ts`
  - `backend/test/integration/modules/reports/cashflow.spec.ts`
  - `backend/test/integration/modules/reports/spending-by-category.spec.ts`
- **Acceptance Criteria:**
  - Reports are read-only and user-scoped.
  - Report values reconcile with fixture transactions/snapshots.

---

## Recommended product + engineering order (post core ledger)

Use this sequence to manage risk before building dashboard/planning layers:

1. **Foundation gate:** Finish open category and guardrail work (**BE-07**, **BE-08**, **BE-G1**, **BE-G2**). Tracked as **BE-21** below.
2. **Dashboard read model:** **BE-22** composes existing modules (no new money mutations).
3. **Automation vs import (pick one first):** **BE-24** (rules) *or* **BE-25** (bank import)—limit WIP to one pipeline per release; second follows.
4. **Scenario engine:** **BE-23** ephemeral budget what-if (no phantom ledger posts).
5. **Differentiators:** **BE-26** (runway / safe-to-spend) and **BE-27** (goal impact calculator)—can follow **BE-22** or run after **BE-23** depending on team capacity.

---

## Sprint 7 - Foundation gate, dashboard, automation/import, what-if

## BE-21 Foundation gate — categories CRUD + guardrail suites
### Status: DONE
- **User Story:** As a product team, I want category modeling and automated security/invariant suites completed so that expansion work rests on verified baselines.
- **Dependencies:** none (this story **coordinates completion** of **BE-07**, **BE-08**, **BE-G1**, and **BE-G2** listed below).
- **Implementation Notes:** Reconcile board status with repo reality; do not bypass RLS; complete **BE-07**, **BE-08**, **BE-G1**, and **BE-G2** per Global Definition of Done. This story is **complete only when all four are Done** (or explicitly deferred with documented rationale).
- **Test Files:** (inherit from bundled stories)
  - `backend/test/integration/modules/categories/list-category-groups.spec.ts`
  - `backend/test/integration/modules/categories/create-category-group.spec.ts`
  - `backend/test/integration/modules/categories/create-category.spec.ts`
  - `backend/test/integration/modules/categories/update-category.spec.ts`
  - `backend/test/unit/modules/categories/application/createCategory.spec.ts`
  - `backend/test/integration/security/ownership-rls.spec.ts`
  - `backend/test/integration/security/cross-user-access.spec.ts`
  - `backend/test/integration/invariants/money-conservation.spec.ts`
  - `backend/test/integration/invariants/ready-to-assign.spec.ts`
  - `backend/test/integration/invariants/category-move-conservation.spec.ts`
- **Acceptance Criteria:**
  - Category groups and categories APIs behave per **BE-07** / **BE-08** acceptance criteria.
  - **BE-G1** and **BE-G2** suites exist, run in CI, and block regressions per Release Rule.
  - Board statuses updated to match merged behavior.

## BE-22 Dashboard summary (read-only composition)
### Status: DONE
- **User Story:** As a user, I want a dashboard summary so that I can see budget health, upcoming obligations, and progress in one place.
- **Dependencies:** BE-21 (categories + guardrails green), BE-14, BE-18, BE-19, BE-20
- **Implementation Notes:** Thin presentation layer calling existing use-cases/repositories; **no writes**; money in minor units; optional caching later via snapshots. Document JSON contract (RTA slice, bills due window, goal progress, small report slices).
- **Test Files:**
  - `backend/test/integration/modules/dashboard/dashboard-summary.spec.ts`
  - `backend/test/unit/modules/dashboard/application/composeDashboardSummary.spec.ts` (if non-trivial composition rules)
- **Acceptance Criteria:**
  - `GET /api/v1/dashboard/summary` (or agreed resource) returns **only** caller-owned aggregates.
  - Response composes budgeting + bills + goals + reports without cross-user leakage.
  - Missing optional data (e.g. no goals) degrades gracefully with empty sections.

## BE-23 Budget scenario sandbox v1 (ephemeral what-if)
### Status: DONE
- **User Story:** As a user, I want to simulate assignment changes for a month so that I can compare plans without altering my real budget.
- **Dependencies:** BE-21, BE-14, BE-15, BE-13
- **Implementation Notes:** Scenarios stored **separately from actuals** or computed ephemerally; **no** insert into `transactions` for simulation; projection must reuse RTA/category conservation rules in **domain** (test-first). Version 1 may be single-month and in-memory + optional persisted scenario name.
- **Test Files:**
  - `backend/test/integration/modules/scenarios/project-budget-scenario.spec.ts`
  - `backend/test/unit/modules/scenarios/domain/scenarioProjection.spec.ts`
- **Acceptance Criteria:**
  - Applying a scenario delta returns projected category available / RTA consistent with domain invariants.
  - Live budget month rows are unchanged unless user explicitly applies (out of scope for v1 if only ephemeral).
  - User cannot reference another user’s categories or months.

## BE-24 Transaction categorization rules (automation path)
### Status: DONE
- **User Story:** As a user, I want rules that categorize new transactions so that maintenance scales with account activity.
- **Dependencies:** BE-21, BE-10
- **Implementation Notes:** Rule match order deterministic; audit which rule fired; validate account/category ownership; idempotent application per transaction; prefer **this** or **BE-25** first—not both in the same sprint without explicit capacity.
- **Test Files:**
  - `backend/test/integration/modules/rules/create-categorization-rule.spec.ts`
  - `backend/test/integration/modules/rules/apply-rules-to-transaction.spec.ts`
  - `backend/test/unit/modules/rules/domain/ruleMatch.spec.ts`
- **Acceptance Criteria:**
  - Creating/updating/listing rules is user-scoped.
  - Applying rules updates only matching user’s transactions; invalid references return explicit errors.
  - No rule bypasses RLS.

## BE-25 Bank import & sync (connections path)
### Status: DONE
- **User Story:** As a user, I want to import transactions from linked institutions so that my ledger stays current with less typing.
- **Dependencies:** BE-21, BE-09, BE-02
- **Implementation Notes:** Use existing `connections` / account external ref shapes where possible; **idempotent** ingest (`external_ref` or provider id); reconcile duplicates; spike provider + secrets handling; prefer **BE-24** or **this** first per Recommended order #3.
- **Test Files:**
  - `backend/test/integration/modules/imports/sync-connection.spec.ts`
  - `backend/test/integration/modules/imports/ingest-transactions-idempotent.spec.ts`
- **Acceptance Criteria:**
  - Imported rows always carry `user_id`; repeated sync does not double-count the same provider transaction.
  - Failed partial batches leave no inconsistent paired transfer state.
  - RLS enforced on all new read/write paths.

## BE-26 Cash runway & envelope coverage (read-only projections)
### Status: DONE
- **User Story:** As a user, I want runway and safe-to-spend style projections so that I can see how long funds last under recent spending patterns.
- **Dependencies:** BE-22 (recommended), BE-10, BE-13, BE-14
- **Implementation Notes:** Read-only endpoints; document assumptions (e.g. trailing N-week average); optional link to scenario **BE-23** later; minor units only.
- **Test Files:**
  - `backend/test/integration/modules/projections/cash-runway.spec.ts`
  - `backend/test/unit/modules/projections/domain/runwayCalculation.spec.ts`
  - `backend/test/unit/modules/projections/application/composeCashRunwayProjection.spec.ts`
- **Acceptance Criteria:**
  - Projections use only the authenticated user’s accounts and budget months.
  - Outputs include explicit assumption metadata (period, basis).
  - No writes.

## BE-27 Goal impact & funding calculator (what-if)
### Status: READY
- **User Story:** As a user, I want to model contribution changes against a goal so that I can see effects on target date or required monthly amount.
- **Dependencies:** BE-19
- **Implementation Notes:** Pure domain calculator + optional thin route; inputs as minor units; does not mutate `goals` unless separate “apply” story is added later.
- **Test Files:**
  - `backend/test/integration/modules/goals/goal-impact-calculator.spec.ts`
  - `backend/test/unit/modules/goals/domain/goalImpact.spec.ts`
- **Acceptance Criteria:**
  - Calculator returns consistent math for documented inputs (lump sum vs monthly).
  - Invalid inputs rejected without side effects.
  - User cannot load another user’s goal by id.

---

## Always-On Guardrail Stories (Run Across All Sprints)

## BE-G1 Ownership and RLS Regression Suite
### Status: DONE
- **Test Files:**
  - `backend/test/integration/security/ownership-rls.spec.ts`
  - `backend/test/integration/security/cross-user-access.spec.ts`
- **Acceptance Criteria:**
  - No story can merge if cross-user leakage is detected.

## BE-G2 Financial Invariants Regression Suite
### Status: DONE
- **Test Files:**
  - `backend/test/integration/invariants/money-conservation.spec.ts`
  - `backend/test/integration/invariants/ready-to-assign.spec.ts`
  - `backend/test/integration/invariants/category-move-conservation.spec.ts`
- **Acceptance Criteria:**
  - Transfers conserve money.
  - Category move preserves total budget pool.
  - Ready to Assign semantics remain correct.

---

## Suggested Ticket States

Use these states in project tracking:
- `Backlog`
- `Ready`
- `In Progress`
- `In Review`
- `Blocked`
- `Done`

---

## Sprint Planning Cadence

- **Sprint Planning Input:** pick stories only from one adjacent phase to reduce context switching.
- **WIP Rule:** max 2 stories in progress concurrently.
- **Release Rule:** no release with failing guardrail suites (`BE-G1`, `BE-G2`).

---

## Handoff Checklist Per Story

- API contract (request/response examples) documented.
- Endpoint added to route registration.
- Use-case wired from presentation -> application -> infrastructure.
- Tests green locally and in CI.
- Known limitations listed in story notes.

