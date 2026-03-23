export type CreditCardStatementSummary = {
  id: string;
  userId: string;
  accountId: string;
  referenceYear: number;
  referenceMonth: number;
  label: string | null;
  periodStart: string;
  periodEnd: string;
  closingDate: string;
  dueDate: string;
  openingBalanceMinor: string;
  purchasesTotalMinor: string;
  paymentsTotalMinor: string;
  adjustmentsTotalMinor: string;
  interestTotalMinor: string;
  feesTotalMinor: string;
  closingBalanceMinor: string;
  minimumDueMinor: string | null;
  isClosed: boolean;
  isPaid: boolean;
  paidAt: string | null;
};

export type CreateCreditCardStatementInput = {
  accountId: string;
  referenceYear: number;
  referenceMonth: number;
  label?: string;
  periodStart: string;
  periodEnd: string;
  closingDate: string;
  dueDate: string;
  openingBalanceMinor?: string;
  purchasesTotalMinor?: string;
  paymentsTotalMinor?: string;
  adjustmentsTotalMinor?: string;
  interestTotalMinor?: string;
  feesTotalMinor?: string;
  closingBalanceMinor?: string;
  minimumDueMinor?: string;
  notes?: string;
};

export type CreateCreditCardStatementResult =
  | { ok: true; statement: CreditCardStatementSummary }
  | { ok: false; error: "account_not_found" | "duplicate_period" | "invalid_input" };

export type MarkStatementPaidResult =
  | { ok: true; statement: CreditCardStatementSummary }
  | { ok: false; error: "not_found" | "already_paid" | "soft_deleted" };

export type MarkPaidRepositoryResult =
  | { status: "ok"; statement: CreditCardStatementSummary }
  | { status: "not_found" }
  | { status: "already_paid" }
  | { status: "soft_deleted" };

export interface CreditCardStatementsRepository {
  createStatement(
    userId: string,
    input: CreateCreditCardStatementInput
  ): Promise<CreateCreditCardStatementResult>;
  markPaid(userId: string, statementId: string): Promise<MarkPaidRepositoryResult>;
}

export async function createCreditCardStatement(
  repository: CreditCardStatementsRepository,
  userId: string,
  input: CreateCreditCardStatementInput
): Promise<CreateCreditCardStatementResult> {
  return repository.createStatement(userId, input);
}

export async function markCreditCardStatementPaid(
  repository: CreditCardStatementsRepository,
  userId: string,
  statementId: string
): Promise<MarkStatementPaidResult> {
  const r = await repository.markPaid(userId, statementId);
  if (r.status === "ok") {
    return { ok: true, statement: r.statement };
  }
  if (r.status === "not_found") {
    return { ok: false, error: "not_found" };
  }
  if (r.status === "already_paid") {
    return { ok: false, error: "already_paid" };
  }
  return { ok: false, error: "soft_deleted" };
}
