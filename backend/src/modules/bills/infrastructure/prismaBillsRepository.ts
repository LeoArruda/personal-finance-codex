import { runInUserDbContext } from "../../../shared/db/userContext";
import { validateBillCanBePaid } from "../domain/payBill";
import {
  type BillStatus,
  type BillSummary,
  type BillsRepository,
  type CreateBillInput,
  type CreateBillResult,
  type PayBillInput,
  type PayBillResult
} from "../application/bills";
import { type TransactionSummary } from "../../transactions/application/transactions";

function mapBillRow(row: {
  id: string;
  user_id: string;
  from_account_id: string;
  category_id: string | null;
  statement_id: string | null;
  payee_name: string;
  amount_minor: bigint;
  currency: string;
  due_date: Date;
  status: BillStatus;
  paid_at: Date | null;
  paid_transaction_id: string | null;
  notes: string | null;
}): BillSummary {
  return {
    id: row.id,
    userId: row.user_id,
    fromAccountId: row.from_account_id,
    categoryId: row.category_id,
    statementId: row.statement_id,
    payeeName: row.payee_name,
    amountMinor: row.amount_minor.toString(),
    currency: row.currency,
    dueDate: row.due_date.toISOString().slice(0, 10),
    status: row.status,
    paidAt: row.paid_at?.toISOString() ?? null,
    paidTransactionId: row.paid_transaction_id,
    notes: row.notes
  };
}

function mapTxRow(row: {
  id: string;
  user_id: string;
  account_id: string;
  category_id: string | null;
  type: TransactionSummary["type"];
  status: TransactionSummary["status"];
  description: string;
  amount_minor: bigint;
  transaction_date: Date;
}): TransactionSummary {
  return {
    id: row.id,
    userId: row.user_id,
    accountId: row.account_id,
    categoryId: row.category_id,
    type: row.type,
    status: row.status,
    description: row.description,
    amountMinor: row.amount_minor.toString(),
    transactionDate: row.transaction_date.toISOString().slice(0, 10)
  };
}

export class PrismaBillsRepository implements BillsRepository {
  async createBill(userId: string, input: CreateBillInput): Promise<CreateBillResult> {
    let amountMinor: bigint;
    try {
      amountMinor = BigInt(input.amountMinor);
    } catch {
      return { ok: false, error: "invalid_input" };
    }
    if (amountMinor <= 0n) {
      return { ok: false, error: "invalid_input" };
    }

    return runInUserDbContext(userId, async (tx) => {
      const acctRows = await tx.$queryRaw<Array<{ id: string }>>`
        select id from app.financial_accounts
        where id = ${input.fromAccountId}::uuid and user_id = ${userId}
        limit 1
      `;
      if (!acctRows[0]) return { ok: false, error: "account_not_found" };

      if (input.categoryId) {
        const catRows = await tx.$queryRaw<Array<{ id: string }>>`
          select id from app.categories
          where id = ${input.categoryId}::uuid and user_id = ${userId}
          limit 1
        `;
        if (!catRows[0]) return { ok: false, error: "category_not_found" };
      }

      if (input.statementId) {
        const stmtRows = await tx.$queryRaw<Array<{ id: string }>>`
          select id from app.credit_card_statements
          where id = ${input.statementId}::uuid and user_id = ${userId}
          limit 1
        `;
        if (!stmtRows[0]) return { ok: false, error: "statement_not_found" };
      }

      const rows = await tx.$queryRaw<
        Array<{
          id: string;
          user_id: string;
          from_account_id: string;
          category_id: string | null;
          statement_id: string | null;
          payee_name: string;
          amount_minor: bigint;
          currency: string;
          due_date: Date;
          status: BillStatus;
          paid_at: Date | null;
          paid_transaction_id: string | null;
          notes: string | null;
        }>
      >`
        insert into app.bills (
          user_id,
          from_account_id,
          category_id,
          statement_id,
          payee_name,
          amount_minor,
          currency,
          due_date,
          status,
          notes
        )
        values (
          ${userId},
          ${input.fromAccountId}::uuid,
          ${input.categoryId ?? null}::uuid,
          ${input.statementId ?? null}::uuid,
          ${input.payeeName},
          ${amountMinor},
          ${input.currency ?? "CAD"},
          ${input.dueDate}::date,
          'pending'::app.bill_status,
          ${input.notes ?? null}
        )
        returning
          id,
          user_id,
          from_account_id,
          category_id,
          statement_id,
          payee_name,
          amount_minor,
          currency,
          due_date,
          status,
          paid_at,
          paid_transaction_id,
          notes
      `;

      const row = rows[0];
      if (!row) return { ok: false, error: "invalid_input" };
      return { ok: true, bill: mapBillRow(row) };
    });
  }

  async payBill(userId: string, billId: string, input: PayBillInput): Promise<PayBillResult> {
    return runInUserDbContext(userId, async (tx) => {
      const billRows = await tx.$queryRaw<
        Array<{
          id: string;
          user_id: string;
          from_account_id: string;
          category_id: string | null;
          statement_id: string | null;
          payee_name: string;
          amount_minor: bigint;
          currency: string;
          due_date: Date;
          status: BillStatus;
          paid_at: Date | null;
          paid_transaction_id: string | null;
          notes: string | null;
          deleted_at: Date | null;
        }>
      >`
        select
          id,
          user_id,
          from_account_id,
          category_id,
          statement_id,
          payee_name,
          amount_minor,
          currency,
          due_date,
          status,
          paid_at,
          paid_transaction_id,
          notes,
          deleted_at
        from app.bills
        where id = ${billId}::uuid
          and user_id = ${userId}
        limit 1
        for update
      `;

      const bill = billRows[0];
      if (!bill) {
        return { ok: false, error: "bill_not_found" };
      }

      const v = validateBillCanBePaid({
        status: bill.status,
        deletedAt: bill.deleted_at?.toISOString() ?? null
      });
      if (!v.ok) {
        return { ok: false, error: "not_payable" };
      }

      const txDate = input.transactionDate ?? bill.due_date.toISOString().slice(0, 10);
      const amountOut = -bill.amount_minor;
      const description = `Bill payment: ${bill.payee_name}`;

      const acctRows = await tx.$queryRaw<Array<{ currency: string }>>`
        select currency
        from app.financial_accounts
        where id = ${bill.from_account_id}
          and user_id = ${userId}
        limit 1
      `;
      const currency = acctRows[0]?.currency ?? bill.currency;

      const insertedTx = await tx.$queryRaw<
        Array<{
          id: string;
          user_id: string;
          account_id: string;
          category_id: string | null;
          type: TransactionSummary["type"];
          status: TransactionSummary["status"];
          description: string;
          amount_minor: bigint;
          transaction_date: Date;
        }>
      >`
        insert into app.transactions (
          user_id,
          budget_id,
          account_id,
          category_id,
          statement_id,
          type,
          status,
          source,
          description,
          currency,
          amount_minor,
          transaction_date,
          posted_at
        )
        values (
          ${userId},
          null,
          ${bill.from_account_id}::uuid,
          ${bill.category_id}::uuid,
          ${bill.statement_id}::uuid,
          'bill_payment'::app.transaction_type,
          'posted'::app.transaction_status,
          'manual'::app.transaction_source,
          ${description},
          ${currency},
          ${amountOut},
          ${txDate}::date,
          now()
        )
        returning id, user_id, account_id, category_id, type, status, description, amount_minor, transaction_date
      `;

      const tRow = insertedTx[0];
      if (!tRow) {
        return { ok: false, error: "invalid_amount" };
      }

      const updatedBill = await tx.$queryRaw<
        Array<{
          id: string;
          user_id: string;
          from_account_id: string;
          category_id: string | null;
          statement_id: string | null;
          payee_name: string;
          amount_minor: bigint;
          currency: string;
          due_date: Date;
          status: BillStatus;
          paid_at: Date | null;
          paid_transaction_id: string | null;
          notes: string | null;
        }>
      >`
        update app.bills
        set
          status = 'paid'::app.bill_status,
          paid_at = now(),
          paid_transaction_id = ${tRow.id}::uuid,
          updated_at = now()
        where id = ${billId}::uuid
          and user_id = ${userId}
          and status = 'pending'::app.bill_status
          and deleted_at is null
        returning
          id,
          user_id,
          from_account_id,
          category_id,
          statement_id,
          payee_name,
          amount_minor,
          currency,
          due_date,
          status,
          paid_at,
          paid_transaction_id,
          notes
      `;

      const b = updatedBill[0];
      if (!b) {
        return { ok: false, error: "not_payable" };
      }

      return {
        ok: true,
        bill: mapBillRow(b),
        transaction: mapTxRow(tRow)
      };
    });
  }
}
