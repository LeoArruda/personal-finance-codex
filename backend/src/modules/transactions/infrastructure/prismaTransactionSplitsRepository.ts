import { runInUserDbContext } from "../../../shared/db/userContext";
import {
  type TransactionSplitInput,
  type TransactionSplitSummary,
  type TransactionSplitsRepository
} from "../application/transactionSplits";

export class PrismaTransactionSplitsRepository implements TransactionSplitsRepository {
  async getTransactionAmountMinor(userId: string, transactionId: string): Promise<string | null> {
    return runInUserDbContext(userId, async (tx) => {
      const rows = await tx.$queryRaw<Array<{ amount_minor: bigint }>>`
        select amount_minor
        from app.transactions
        where id = ${transactionId}
          and user_id = ${userId}
        limit 1
      `;
      const row = rows[0];
      return row ? row.amount_minor.toString() : null;
    });
  }

  async assertCategoriesOwnedByUser(userId: string, categoryIds: string[]): Promise<boolean> {
    if (categoryIds.length === 0) return true;
    return runInUserDbContext(userId, async (tx) => {
      const rows = await tx.$queryRaw<Array<{ id: string }>>`
        select id
        from app.categories
        where user_id = ${userId}
          and id = any(${categoryIds}::uuid[])
      `;
      return rows.length === categoryIds.length;
    });
  }

  async replaceForTransaction(
    userId: string,
    transactionId: string,
    splits: TransactionSplitInput[]
  ): Promise<TransactionSplitSummary[] | null> {
    return runInUserDbContext(userId, async (tx) => {
      const transactionRows = await tx.$queryRaw<Array<{ id: string }>>`
        select id
        from app.transactions
        where id = ${transactionId}
          and user_id = ${userId}
        limit 1
      `;
      if (transactionRows.length === 0) return null;

      await tx.$executeRaw`
        delete from app.transaction_splits
        where transaction_id = ${transactionId}
          and user_id = ${userId}
      `;

      const inserted: TransactionSplitSummary[] = [];
      for (let index = 0; index < splits.length; index += 1) {
        const split = splits[index];
        const rows = await tx.$queryRaw<Array<{
          id: string;
          user_id: string;
          transaction_id: string;
          category_id: string | null;
          amount_minor: bigint;
          description: string | null;
          sort_order: number;
        }>>`
          insert into app.transaction_splits (
            user_id, transaction_id, category_id, amount_minor, description, sort_order
          )
          values (
            ${userId},
            ${transactionId},
            ${split.categoryId ?? null},
            ${BigInt(split.amountMinor)},
            ${split.description ?? null},
            ${split.sortOrder ?? index}
          )
          returning id, user_id, transaction_id, category_id, amount_minor, description, sort_order
        `;
        const row = rows[0];
        inserted.push({
          id: row.id,
          userId: row.user_id,
          transactionId: row.transaction_id,
          categoryId: row.category_id,
          amountMinor: row.amount_minor.toString(),
          description: row.description,
          sortOrder: row.sort_order
        });
      }
      return inserted;
    });
  }
}
