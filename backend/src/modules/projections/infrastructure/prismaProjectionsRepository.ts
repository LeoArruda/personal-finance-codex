import { runInUserDbContext } from "../../../shared/db/userContext";
import {
  type CashRunwaySourceData,
  type ProjectionsRepository
} from "../application/projections";

export class PrismaProjectionsRepository implements ProjectionsRepository {
  async getCashRunwaySourceData(
    userId: string,
    params: {
      windowStart: string;
      windowEnd: string;
      monthKey: string;
    }
  ): Promise<CashRunwaySourceData> {
    return runInUserDbContext(userId, async (tx) => {
      const budgetRows = await tx.$queryRaw<Array<{ id: string; currency: string }>>`
        select id, currency
        from app.budgets
        where user_id = ${userId}
          and status = 'active'::app.budget_status
          and deleted_at is null
        order by is_default desc, created_at asc
        limit 1
      `;
      const budget = budgetRows[0];
      const budgetId = budget?.id ?? null;
      const primaryCurrency = budget?.currency ?? null;

      const accountRows = await tx.$queryRaw<
        Array<{
          id: string;
          name: string;
          kind: string;
          currency: string;
          bal: bigint;
        }>
      >`
        select
          id,
          name,
          kind::text as kind,
          currency,
          coalesce(available_balance_minor, current_balance_minor, 0)::bigint as bal
        from app.financial_accounts
        where user_id = ${userId}
          and deleted_at is null
          and status = 'active'::app.account_status
          and include_in_cash_flow = true
          and kind not in ('credit_card'::app.account_kind, 'loan'::app.account_kind)
        order by name asc
      `;

      const accounts = accountRows.map((r) => ({
        accountId: r.id,
        name: r.name,
        kind: r.kind,
        currency: r.currency,
        balanceMinor: r.bal.toString()
      }));

      const totalRow = await tx.$queryRaw<Array<{ total: bigint }>>`
        select coalesce(sum(amount_minor), 0)::bigint as total
        from app.transactions
        where user_id = ${userId}
          and deleted_at is null
          and status = 'posted'::app.transaction_status
          and type = 'expense'::app.transaction_type
          and transaction_date >= ${params.windowStart}::date
          and transaction_date <= ${params.windowEnd}::date
      `;
      const trailingExpenseTotalMinor = (totalRow[0]?.total ?? 0n).toString();

      const catSpendRows = await tx.$queryRaw<Array<{ category_id: string; total: bigint }>>`
        select category_id, coalesce(sum(amount_minor), 0)::bigint as total
        from app.transactions
        where user_id = ${userId}
          and deleted_at is null
          and status = 'posted'::app.transaction_status
          and type = 'expense'::app.transaction_type
          and category_id is not null
          and transaction_date >= ${params.windowStart}::date
          and transaction_date <= ${params.windowEnd}::date
        group by category_id
      `;

      const expenseTotalsByCategoryId: Record<string, string> = {};
      for (const row of catSpendRows) {
        expenseTotalsByCategoryId[row.category_id] = row.total.toString();
      }

      let categoryEnvelopes: CashRunwaySourceData["categoryEnvelopes"] = [];
      if (budgetId) {
        const envRows = await tx.$queryRaw<
          Array<{
            category_id: string;
            category_name: string;
            available_minor: bigint;
          }>
        >`
          select c.id as category_id, c.name as category_name, cm.available_minor
          from app.category_months cm
          inner join app.budget_months bm on bm.id = cm.budget_month_id
          inner join app.categories c on c.id = cm.category_id
          where cm.user_id = ${userId}
            and bm.budget_id = ${budgetId}::uuid
            and bm.month_key = ${params.monthKey}
            and c.deleted_at is null
            and c.kind = 'expense'::app.category_kind
          order by c.name asc
        `;
        categoryEnvelopes = envRows.map((r) => ({
          categoryId: r.category_id,
          categoryName: r.category_name,
          availableMinor: r.available_minor.toString()
        }));
      }

      return {
        accounts,
        trailingExpenseTotalMinor,
        expenseTotalsByCategoryId,
        categoryEnvelopes,
        budgetId,
        primaryCurrency
      };
    });
  }
}
