import { runInUserDbContext } from "../../../shared/db/userContext";
import { validateMarkStatementPaid } from "../application/markStatementPaid";
import {
  type CreateCreditCardStatementInput,
  type CreateCreditCardStatementResult,
  type CreditCardStatementSummary,
  type CreditCardStatementsRepository,
  type MarkPaidRepositoryResult
} from "../application/creditCardStatements";

function parseMinor(s: string | undefined, defaultVal: bigint): bigint {
  if (s === undefined || s === "") return defaultVal;
  try {
    return BigInt(s);
  } catch {
    return defaultVal;
  }
}

function mapStatementRow(row: {
  id: string;
  user_id: string;
  account_id: string;
  reference_year: number;
  reference_month: number;
  label: string | null;
  period_start: Date;
  period_end: Date;
  closing_date: Date;
  due_date: Date;
  opening_balance_minor: bigint;
  purchases_total_minor: bigint;
  payments_total_minor: bigint;
  adjustments_total_minor: bigint;
  interest_total_minor: bigint;
  fees_total_minor: bigint;
  closing_balance_minor: bigint;
  minimum_due_minor: bigint | null;
  is_closed: boolean;
  is_paid: boolean;
  paid_at: Date | null;
}): CreditCardStatementSummary {
  return {
    id: row.id,
    userId: row.user_id,
    accountId: row.account_id,
    referenceYear: row.reference_year,
    referenceMonth: row.reference_month,
    label: row.label,
    periodStart: row.period_start.toISOString().slice(0, 10),
    periodEnd: row.period_end.toISOString().slice(0, 10),
    closingDate: row.closing_date.toISOString().slice(0, 10),
    dueDate: row.due_date.toISOString().slice(0, 10),
    openingBalanceMinor: row.opening_balance_minor.toString(),
    purchasesTotalMinor: row.purchases_total_minor.toString(),
    paymentsTotalMinor: row.payments_total_minor.toString(),
    adjustmentsTotalMinor: row.adjustments_total_minor.toString(),
    interestTotalMinor: row.interest_total_minor.toString(),
    feesTotalMinor: row.fees_total_minor.toString(),
    closingBalanceMinor: row.closing_balance_minor.toString(),
    minimumDueMinor: row.minimum_due_minor?.toString() ?? null,
    isClosed: row.is_closed,
    isPaid: row.is_paid,
    paidAt: row.paid_at?.toISOString() ?? null
  };
}

export class PrismaCreditCardStatementsRepository implements CreditCardStatementsRepository {
  async createStatement(
    userId: string,
    input: CreateCreditCardStatementInput
  ): Promise<CreateCreditCardStatementResult> {
    const opening = parseMinor(input.openingBalanceMinor, 0n);
    const purchases = parseMinor(input.purchasesTotalMinor, 0n);
    const payments = parseMinor(input.paymentsTotalMinor, 0n);
    const adjustments = parseMinor(input.adjustmentsTotalMinor, 0n);
    const interest = parseMinor(input.interestTotalMinor, 0n);
    const fees = parseMinor(input.feesTotalMinor, 0n);
    const closing = parseMinor(input.closingBalanceMinor, 0n);
    let minimumDue: bigint | null = null;
    if (input.minimumDueMinor !== undefined && input.minimumDueMinor !== "") {
      try {
        minimumDue = BigInt(input.minimumDueMinor);
      } catch {
        return { ok: false, error: "invalid_input" };
      }
    }

    return runInUserDbContext(userId, async (tx) => {
      const acctRows = await tx.$queryRaw<Array<{ id: string }>>`
        select id from app.financial_accounts
        where id = ${input.accountId}::uuid and user_id = ${userId}
        limit 1
      `;
      if (!acctRows[0]) return { ok: false, error: "account_not_found" };

      const rows = await tx.$queryRaw<
        Array<{
          id: string;
          user_id: string;
          account_id: string;
          reference_year: number;
          reference_month: number;
          label: string | null;
          period_start: Date;
          period_end: Date;
          closing_date: Date;
          due_date: Date;
          opening_balance_minor: bigint;
          purchases_total_minor: bigint;
          payments_total_minor: bigint;
          adjustments_total_minor: bigint;
          interest_total_minor: bigint;
          fees_total_minor: bigint;
          closing_balance_minor: bigint;
          minimum_due_minor: bigint | null;
          is_closed: boolean;
          is_paid: boolean;
          paid_at: Date | null;
        }>
      >`
        insert into app.credit_card_statements (
          user_id,
          account_id,
          reference_year,
          reference_month,
          label,
          period_start,
          period_end,
          closing_date,
          due_date,
          opening_balance_minor,
          purchases_total_minor,
          payments_total_minor,
          adjustments_total_minor,
          interest_total_minor,
          fees_total_minor,
          closing_balance_minor,
          minimum_due_minor,
          notes
        )
        values (
          ${userId},
          ${input.accountId}::uuid,
          ${input.referenceYear},
          ${input.referenceMonth},
          ${input.label ?? null},
          ${input.periodStart}::date,
          ${input.periodEnd}::date,
          ${input.closingDate}::date,
          ${input.dueDate}::date,
          ${opening},
          ${purchases},
          ${payments},
          ${adjustments},
          ${interest},
          ${fees},
          ${closing},
          ${minimumDue},
          ${input.notes ?? null}
        )
        on conflict (account_id, reference_year, reference_month) do nothing
        returning
          id,
          user_id,
          account_id,
          reference_year,
          reference_month,
          label,
          period_start,
          period_end,
          closing_date,
          due_date,
          opening_balance_minor,
          purchases_total_minor,
          payments_total_minor,
          adjustments_total_minor,
          interest_total_minor,
          fees_total_minor,
          closing_balance_minor,
          minimum_due_minor,
          is_closed,
          is_paid,
          paid_at
      `;

      const row = rows[0];
      if (!row) return { ok: false, error: "duplicate_period" };
      return { ok: true, statement: mapStatementRow(row) };
    });
  }


  async markPaid(userId: string, statementId: string): Promise<MarkPaidRepositoryResult> {
    return runInUserDbContext(userId, async (tx) => {
      const updated = await tx.$queryRaw<
        Array<{
          id: string;
          user_id: string;
          account_id: string;
          reference_year: number;
          reference_month: number;
          label: string | null;
          period_start: Date;
          period_end: Date;
          closing_date: Date;
          due_date: Date;
          opening_balance_minor: bigint;
          purchases_total_minor: bigint;
          payments_total_minor: bigint;
          adjustments_total_minor: bigint;
          interest_total_minor: bigint;
          fees_total_minor: bigint;
          closing_balance_minor: bigint;
          minimum_due_minor: bigint | null;
          is_closed: boolean;
          is_paid: boolean;
          paid_at: Date | null;
        }>
      >`
        update app.credit_card_statements
        set
          is_paid = true,
          paid_at = now(),
          updated_at = now()
        where id = ${statementId}::uuid
          and user_id = ${userId}
          and deleted_at is null
          and is_paid = false
        returning
          id,
          user_id,
          account_id,
          reference_year,
          reference_month,
          label,
          period_start,
          period_end,
          closing_date,
          due_date,
          opening_balance_minor,
          purchases_total_minor,
          payments_total_minor,
          adjustments_total_minor,
          interest_total_minor,
          fees_total_minor,
          closing_balance_minor,
          minimum_due_minor,
          is_closed,
          is_paid,
          paid_at
      `;

      const u = updated[0];
      if (u) {
        return { status: "ok", statement: mapStatementRow(u) };
      }

      const probe = await tx.$queryRaw<
        Array<{
          is_paid: boolean;
          deleted_at: Date | null;
        }>
      >`
        select is_paid, deleted_at
        from app.credit_card_statements
        where id = ${statementId}::uuid
          and user_id = ${userId}
        limit 1
      `;

      const p = probe[0];
      if (!p) {
        return { status: "not_found" };
      }

      const v = validateMarkStatementPaid({
        isPaid: p.is_paid,
        deletedAt: p.deleted_at?.toISOString() ?? null
      });
      if (!v.ok) {
        return { status: v.reason === "already_paid" ? "already_paid" : "soft_deleted" };
      }

      return { status: "not_found" };
    });
  }
}
