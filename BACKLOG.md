# Backend Execution Backlog (TDD + API First)

This backlog defines the implementation order, exact endpoint scope, test files, and acceptance criteria for the backend.

It follows:
- Modular monolith layering (`domain`, `application`, `infrastructure`, `presentation`)
- Backend-first TDD
- Module delivery sequence:
  1. `auth` -> `users`
  2. `budgets` -> `categories`
  3. `accounts`
  4. `transactions` (simple, then splits)
  5. `transfers`
  6. `budgeting` (`assign`, `move`, `open-month`)
  7. `recurring`
  8. `credit_card_statements` + `bills`
  9. `goals` / `reports`

---

## Global Rules (Apply to Every Backlog Item)

- Start each feature with failing integration tests (Supertest + Vitest), then implement.
- Keep controllers/routes thin; use use-case classes/functions in `application`.
- Repositories in `infrastructure` must scope by authenticated user and run inside DB context with `app.current_user_id`.
- Use DB transactions for multi-row financial operations.
- Never expose raw Prisma models from repositories to upper layers.
- Money is always minor units (`bigint` in DB; convert only at API boundary if needed).

---

## Phase 0 - Foundation (App, Testing, Error, Context)

### Modules
- `app`, `shared`, cross-cutting auth context plumbing

### Endpoints
- `GET /health` (already present; keep as baseline health check)

### Test Files
- `backend/test/integration/app/health.spec.ts`
- `backend/test/integration/app/auth-guard.spec.ts`
- `backend/test/integration/app/request-context.spec.ts`
- `backend/test/helpers/createTestApp.ts`
- `backend/test/helpers/testDb.ts`

### Acceptance Criteria
- App boots in test mode and production mode.
- Protected route returns `401` when no token.
- Valid token populates request user context.
- DB execution path sets `app.current_user_id` for user-scoped queries.
- Test helpers support transaction rollback/isolated test data.

---

## Phase 1 - Auth -> Users

## 1.1 Auth Module

### Endpoints
- `GET /api/v1/auth/me` (token introspection and minimal identity)

### Test Files
- `backend/test/integration/modules/auth/get-me.spec.ts`
- `backend/test/unit/modules/auth/application/verifyAccessToken.spec.ts`
- `backend/test/unit/modules/auth/presentation/authHook.spec.ts`

### Acceptance Criteria
- Valid Supabase token returns user id/email claims.
- Invalid/expired token returns `401`.
- Auth hook rejects missing bearer token on protected routes.
- No DB mutation occurs in auth verification path.

## 1.2 Users Module

### Endpoints
- `GET /api/v1/users/me`
- `PATCH /api/v1/users/me` (allowed: `full_name`, `locale`, `timezone`)

### Test Files
- `backend/test/integration/modules/users/get-current-user.spec.ts`
- `backend/test/integration/modules/users/update-current-user.spec.ts`
- `backend/test/unit/modules/users/application/updateCurrentUser.spec.ts`

### Acceptance Criteria
- Caller only reads/updates own profile.
- Validation rejects invalid locale/timezone payload.
- `updated_at` changes on successful profile update.

---

## Phase 2 - Budgets -> Categories

## 2.1 Budgets Module

### Endpoints
- `GET /api/v1/budgets`
- `POST /api/v1/budgets`
- `GET /api/v1/budgets/:budgetId`
- `PATCH /api/v1/budgets/:budgetId`
- `POST /api/v1/budgets/:budgetId/set-default`

### Test Files
- `backend/test/integration/modules/budgets/list-budgets.spec.ts`
- `backend/test/integration/modules/budgets/create-budget.spec.ts`
- `backend/test/integration/modules/budgets/update-budget.spec.ts`
- `backend/test/integration/modules/budgets/set-default-budget.spec.ts`
- `backend/test/unit/modules/budgets/application/setDefaultBudget.spec.ts`

### Acceptance Criteria
- User only sees own budgets.
- New budget created with caller `user_id`.
- Exactly one default budget per user after `set-default`.
- Cross-user budget access returns `404` or `403` (consistent policy).

## 2.2 Categories Module (Includes Category Groups)

### Endpoints
- `GET /api/v1/budgets/:budgetId/category-groups`
- `POST /api/v1/budgets/:budgetId/category-groups`
- `PATCH /api/v1/budgets/:budgetId/category-groups/:groupId`
- `GET /api/v1/budgets/:budgetId/categories`
- `POST /api/v1/budgets/:budgetId/categories`
- `PATCH /api/v1/budgets/:budgetId/categories/:categoryId`

### Test Files
- `backend/test/integration/modules/categories/list-category-groups.spec.ts`
- `backend/test/integration/modules/categories/create-category-group.spec.ts`
- `backend/test/integration/modules/categories/create-category.spec.ts`
- `backend/test/integration/modules/categories/update-category.spec.ts`
- `backend/test/unit/modules/categories/application/createCategory.spec.ts`

### Acceptance Criteria
- Group/category belongs to same `budget_id` and `user_id`.
- Caller cannot create category under another user's group/budget.
- Sort order and active/inactive state persist and are retrievable.
- API returns deterministic ordering by `sort_order`.

---

## Phase 3 - Accounts

### Endpoints
- `GET /api/v1/accounts`
- `POST /api/v1/accounts`
- `GET /api/v1/accounts/:accountId`
- `PATCH /api/v1/accounts/:accountId`
- `POST /api/v1/accounts/:accountId/archive`

### Test Files
- `backend/test/integration/modules/accounts/list-accounts.spec.ts`
- `backend/test/integration/modules/accounts/create-account.spec.ts`
- `backend/test/integration/modules/accounts/update-account.spec.ts`
- `backend/test/unit/modules/accounts/application/createAccount.spec.ts`

### Acceptance Criteria
- Accounts are user-owned and isolated.
- `is_on_budget` accounts are distinguishable from tracking accounts.
- Currency and opening/current balances are stored in minor units.
- Archive operation does not delete financial history.

---

## Phase 4 - Transactions (Simple, Then Splits)

## 4.1 Simple Transactions

### Endpoints
- `GET /api/v1/transactions`
- `POST /api/v1/transactions`
- `GET /api/v1/transactions/:transactionId`
- `PATCH /api/v1/transactions/:transactionId`
- `DELETE /api/v1/transactions/:transactionId` (soft delete)

### Test Files
- `backend/test/integration/modules/transactions/create-transaction.spec.ts`
- `backend/test/integration/modules/transactions/list-transactions.spec.ts`
- `backend/test/integration/modules/transactions/update-transaction.spec.ts`
- `backend/test/unit/modules/transactions/application/createTransaction.spec.ts`

### Acceptance Criteria
- Transaction account/category (if present) belongs to same user.
- Date/type/status validation enforced.
- List endpoint supports filters (date range, account, category, type).
- No cross-user transaction visibility.

## 4.2 Split Transactions

### Endpoints
- `POST /api/v1/transactions/:transactionId/splits`
- `PATCH /api/v1/transactions/:transactionId/splits`
- `GET /api/v1/transactions/:transactionId/splits`

### Test Files
- `backend/test/integration/modules/transactions/create-transaction-splits.spec.ts`
- `backend/test/integration/modules/transactions/update-transaction-splits.spec.ts`
- `backend/test/unit/modules/transactions/application/applyTransactionSplits.spec.ts`

### Acceptance Criteria
- Split rows belong to same user as parent transaction.
- Split categories (if present) belong to same user.
- Split total and parent amount consistency is enforced by use-case rules.
- Entire split update is atomic.

---

## Phase 5 - Transfers

### Endpoints
- `POST /api/v1/transfers`
- `GET /api/v1/transfers`
- `GET /api/v1/transfers/:transferId`

### Test Files
- `backend/test/integration/modules/transactions/create-transfer.spec.ts`
- `backend/test/integration/modules/transactions/list-transfers.spec.ts`
- `backend/test/unit/modules/transactions/application/createTransfer.spec.ts`

### Acceptance Criteria
- Creates source transaction + destination transaction + `transfer_links` row in one DB transaction.
- Source and destination accounts are different and same-user.
- Linked transactions are `type='transfer'`.
- Money conservation across pair is validated by tests.

---

## Phase 6 - Budgeting Core (`assign`, `move`, `open-month`)

### Endpoints
- `GET /api/v1/budgets/:budgetId/months/:monthKey`
- `POST /api/v1/budgets/:budgetId/months/:monthKey/open`
- `POST /api/v1/budgets/:budgetId/months/:monthKey/assign`
- `POST /api/v1/budgets/:budgetId/months/:monthKey/move`
- `GET /api/v1/budgets/:budgetId/months/:monthKey/categories`

### Test Files
- `backend/test/integration/modules/budgeting/open-month.spec.ts`
- `backend/test/integration/modules/budgeting/assign-money.spec.ts`
- `backend/test/integration/modules/budgeting/move-money.spec.ts`
- `backend/test/integration/modules/budgeting/month-summary.spec.ts`
- `backend/test/unit/modules/budgeting/domain/readyToAssign.spec.ts`

### Acceptance Criteria
- Assign creates `budget_assignment_events` and updates month/category state.
- `assign` decreases `ready_to_assign`, increases category available.
- `move` changes source/destination availability and keeps total unchanged.
- Opening a new month applies carryover and initializes category-month state.
- Tracking accounts do not affect Ready to Assign.

---

## Phase 7 - Recurring

### Endpoints
- `GET /api/v1/recurring-rules`
- `POST /api/v1/recurring-rules`
- `PATCH /api/v1/recurring-rules/:ruleId`
- `POST /api/v1/recurring-rules/:ruleId/run-now`
- `POST /api/v1/recurring-rules/run-due` (internal/cron)

### Test Files
- `backend/test/integration/modules/recurring/create-rule.spec.ts`
- `backend/test/integration/modules/recurring/run-due-rules.spec.ts`
- `backend/test/unit/modules/recurring/application/generateRecurringTransactions.spec.ts`

### Acceptance Criteria
- Recurring rule validates references (account/category/merchant) ownership.
- Due rules create transactions with correct dates/amounts/types.
- Generated transactions remain normal first-class rows.
- `next_run_at` updates correctly per frequency/interval.

---

## Phase 8 - Credit Card Statements + Bills

## 8.1 Credit Card Statements

### Endpoints
- `GET /api/v1/credit-card-statements`
- `POST /api/v1/credit-card-statements`
- `GET /api/v1/credit-card-statements/:statementId`
- `POST /api/v1/credit-card-statements/:statementId/mark-paid`

### Test Files
- `backend/test/integration/modules/bills/create-statement.spec.ts`
- `backend/test/integration/modules/bills/mark-statement-paid.spec.ts`
- `backend/test/unit/modules/bills/application/markStatementPaid.spec.ts`

### Acceptance Criteria
- Statement account belongs to caller.
- Mark-paid flow is atomic and consistent with linked transactions.
- Due/period validations are enforced.

## 8.2 Bills (if kept separate from statements)

### Endpoints
- `GET /api/v1/bills`
- `POST /api/v1/bills`
- `PATCH /api/v1/bills/:billId`
- `POST /api/v1/bills/:billId/pay`

### Test Files
- `backend/test/integration/modules/bills/create-bill.spec.ts`
- `backend/test/integration/modules/bills/pay-bill.spec.ts`

### Acceptance Criteria
- Bill payment creates appropriate transaction(s).
- Bill lifecycle state transitions are explicit and auditable.

---

## Phase 9 - Goals / Reports

## 9.1 Goals

### Endpoints
- `GET /api/v1/goals`
- `POST /api/v1/goals`
- `PATCH /api/v1/goals/:goalId`
- `POST /api/v1/goals/:goalId/contributions`
- `GET /api/v1/goals/:goalId/contributions`

### Test Files
- `backend/test/integration/modules/goals/create-goal.spec.ts`
- `backend/test/integration/modules/goals/add-goal-contribution.spec.ts`
- `backend/test/unit/modules/goals/application/addGoalContribution.spec.ts`

### Acceptance Criteria
- Goal and contributions are user-scoped.
- Optional linked account/category references must belong to same user.
- Contribution from transaction (if provided) matches same user and account consistency rules.

## 9.2 Reports

### Endpoints
- `GET /api/v1/reports/net-worth?from=YYYY-MM&to=YYYY-MM`
- `GET /api/v1/reports/cashflow?from=YYYY-MM&to=YYYY-MM`
- `GET /api/v1/reports/spending-by-category?from=YYYY-MM&to=YYYY-MM`

### Test Files
- `backend/test/integration/modules/reports/net-worth.spec.ts`
- `backend/test/integration/modules/reports/cashflow.spec.ts`
- `backend/test/integration/modules/reports/spending-by-category.spec.ts`

### Acceptance Criteria
- Report queries are user-scoped and performant for expected ranges.
- Results reconcile with source transactions/snapshots in fixtures.
- No hidden mutation in report endpoints (read-only).

---

## Cross-Phase Security and Invariant Test Suite

These run continuously as guardrails while implementing phases:

### Test Files
- `backend/test/integration/security/ownership-rls.spec.ts`
- `backend/test/integration/security/cross-user-access.spec.ts`
- `backend/test/integration/invariants/money-conservation.spec.ts`
- `backend/test/integration/invariants/ready-to-assign.spec.ts`
- `backend/test/integration/invariants/category-move-conservation.spec.ts`

### Acceptance Criteria
- User cannot read/write another user's protected rows.
- Transfers conserve money and remain paired.
- Category movement does not change total budget pool.
- Ready to Assign reflects only on-budget account contributions.

---

## Suggested Milestones

1. **M1:** Phase 0 + Phase 1 complete, all security baseline tests green.
2. **M2:** Phase 2 + Phase 3 complete, user can configure planning structure and accounts.
3. **M3:** Phase 4 + Phase 5 complete, full ledger and transfer flows working.
4. **M4:** Phase 6 complete, core budgeting behavior operational.
5. **M5:** Phase 7 + Phase 8 complete, recurring and statement/bill flows.
6. **M6:** Phase 9 complete, goals and report read models.

