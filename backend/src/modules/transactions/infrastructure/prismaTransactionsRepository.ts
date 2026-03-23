import { runInUserDbContext } from "../../../shared/db/userContext";
import {
  type CreateTransactionInput,
  type ListTransactionsFilters,
  type TransactionSummary,
  type TransactionsRepository,
  type UpdateTransactionInput
} from "../application/transactions";

export class PrismaTransactionsRepository implements TransactionsRepository {
  async assertAccountOwnedByUser(userId: string, accountId: string): Promise<boolean> {
    return runInUserDbContext(userId, async (tx) => {
      const rows = await tx.$queryRaw<Array<{ id: string }>>`
        select id from app.financial_accounts
        where id = ${accountId} and user_id = ${userId}
        limit 1
      `;
      return rows.length > 0;
    });
  }

  async assertCategoryOwnedByUser(userId: string, categoryId: string): Promise<boolean> {
    return runInUserDbContext(userId, async (tx) => {
      const rows = await tx.$queryRaw<Array<{ id: string }>>`
        select id from app.categories
        where id = ${categoryId} and user_id = ${userId}
        limit 1
      `;
      return rows.length > 0;
    });
  }

  async listByUser(userId: string, filters: ListTransactionsFilters): Promise<TransactionSummary[]> {
    return runInUserDbContext(userId, async (tx) => {
      const rows = await tx.$queryRaw<Array<{
        id: string;
        user_id: string;
        account_id: string;
        category_id: string | null;
        type: TransactionSummary["type"];
        status: TransactionSummary["status"];
        description: string;
        amount_minor: bigint;
        transaction_date: Date;
      }>>`
        select id, user_id, account_id, category_id, type, status, description, amount_minor, transaction_date
        from app.transactions
        where user_id = ${userId}
          and (${filters.accountId ?? null}::uuid is null or account_id = ${filters.accountId ?? null}::uuid)
          and (${filters.categoryId ?? null}::uuid is null or category_id = ${filters.categoryId ?? null}::uuid)
          and (${filters.type ?? null}::app.transaction_type is null or type = ${filters.type ?? null}::app.transaction_type)
          and (${filters.fromDate ?? null}::date is null or transaction_date >= ${filters.fromDate ?? null}::date)
          and (${filters.toDate ?? null}::date is null or transaction_date <= ${filters.toDate ?? null}::date)
        order by transaction_date desc, created_at desc
      `;

      return rows.map((row) => ({
        id: row.id,
        userId: row.user_id,
        accountId: row.account_id,
        categoryId: row.category_id,
        type: row.type,
        status: row.status,
        description: row.description,
        amountMinor: row.amount_minor.toString(),
        transactionDate: row.transaction_date.toISOString().slice(0, 10)
      }));
    });
  }

  async createForUser(userId: string, input: CreateTransactionInput): Promise<TransactionSummary> {
    return runInUserDbContext(userId, async (tx) => {
      const accountRows = await tx.$queryRaw<Array<{ currency: string }>>`
        select currency
        from app.financial_accounts
        where id = ${input.accountId}
          and user_id = ${userId}
        limit 1
      `;
      const account = accountRows[0];

      const rows = await tx.$queryRaw<Array<{
        id: string;
        user_id: string;
        account_id: string;
        category_id: string | null;
        type: TransactionSummary["type"];
        status: TransactionSummary["status"];
        description: string;
        amount_minor: bigint;
        transaction_date: Date;
      }>>`
        insert into app.transactions (
          user_id, budget_id, account_id, category_id, type, status, source, description, currency, amount_minor, transaction_date
        )
        values (
          ${userId},
          null,
          ${input.accountId},
          ${input.categoryId ?? null},
          ${input.type}::app.transaction_type,
          'posted',
          'manual',
          ${input.description},
          ${account?.currency ?? "CAD"},
          ${BigInt(input.amountMinor)},
          ${input.transactionDate}::date
        )
        returning id, user_id, account_id, category_id, type, status, description, amount_minor, transaction_date
      `;

      const created = rows[0];
      return {
        id: created.id,
        userId: created.user_id,
        accountId: created.account_id,
        categoryId: created.category_id,
        type: created.type,
        status: created.status,
        description: created.description,
        amountMinor: created.amount_minor.toString(),
        transactionDate: created.transaction_date.toISOString().slice(0, 10)
      };
    });
  }

  async updateForUser(
    userId: string,
    transactionId: string,
    input: UpdateTransactionInput
  ): Promise<TransactionSummary | null> {
    return runInUserDbContext(userId, async (tx) => {
      const rows = await tx.$queryRaw<Array<{
        id: string;
        user_id: string;
        account_id: string;
        category_id: string | null;
        type: TransactionSummary["type"];
        status: TransactionSummary["status"];
        description: string;
        amount_minor: bigint;
        transaction_date: Date;
      }>>`
        update app.transactions
        set
          category_id = case
            when ${input.categoryId === null}::boolean then null
            else coalesce(${input.categoryId ?? null}::uuid, category_id)
          end,
          type = coalesce(${input.type ?? null}::app.transaction_type, type),
          status = coalesce(${input.status ?? null}::app.transaction_status, status),
          description = coalesce(${input.description ?? null}, description),
          amount_minor = coalesce(${input.amountMinor ? BigInt(input.amountMinor) : null}, amount_minor),
          transaction_date = coalesce(${input.transactionDate ?? null}::date, transaction_date),
          updated_at = now()
        where id = ${transactionId}
          and user_id = ${userId}
        returning id, user_id, account_id, category_id, type, status, description, amount_minor, transaction_date
      `;

      const updated = rows[0];
      if (!updated) return null;
      return {
        id: updated.id,
        userId: updated.user_id,
        accountId: updated.account_id,
        categoryId: updated.category_id,
        type: updated.type,
        status: updated.status,
        description: updated.description,
        amountMinor: updated.amount_minor.toString(),
        transactionDate: updated.transaction_date.toISOString().slice(0, 10)
      };
    });
  }
}
