import { runInUserDbContext } from "../../../shared/db/userContext";
import {
  type CashflowReport,
  type NetWorthReport,
  type ReportsRepository,
  type SpendingByCategoryReport
} from "../application/reports";

export class PrismaReportsRepository implements ReportsRepository {
  async getNetWorthSeries(userId: string, fromMonth: string, toMonth: string): Promise<NetWorthReport> {
    return runInUserDbContext(userId, async (tx) => {
      const rows = await tx.$queryRaw<
        Array<{
          month: string;
          total_assets_minor: bigint;
          total_liabilities_minor: bigint;
          net_worth_minor: bigint;
          currency: string;
        }>
      >`
        select distinct on (to_char(snapshot_date, 'YYYY-MM'))
          to_char(snapshot_date, 'YYYY-MM') as month,
          total_assets_minor,
          total_liabilities_minor,
          net_worth_minor,
          currency
        from app.net_worth_snapshots
        where user_id = ${userId}
          and to_char(snapshot_date, 'YYYY-MM') >= ${fromMonth}
          and to_char(snapshot_date, 'YYYY-MM') <= ${toMonth}
        order by to_char(snapshot_date, 'YYYY-MM'), snapshot_date desc
      `;

      return {
        from: fromMonth,
        to: toMonth,
        points: rows.map((r) => ({
          month: r.month,
          totalAssetsMinor: r.total_assets_minor.toString(),
          totalLiabilitiesMinor: r.total_liabilities_minor.toString(),
          netWorthMinor: r.net_worth_minor.toString(),
          currency: r.currency
        }))
      };
    });
  }

  async getCashflowSeries(userId: string, fromMonth: string, toMonth: string): Promise<CashflowReport> {
    return runInUserDbContext(userId, async (tx) => {
      const rows = await tx.$queryRaw<
        Array<{
          month_key: string;
          total_inflows_minor: bigint;
          total_outflows_minor: bigint;
        }>
      >`
        select
          s.month_key,
          sum(s.inflows_minor)::bigint as total_inflows_minor,
          sum(s.outflows_minor)::bigint as total_outflows_minor
        from app.monthly_account_snapshots s
        inner join app.financial_accounts a
          on a.id = s.account_id
          and a.user_id = s.user_id
        where s.user_id = ${userId}
          and s.month_key >= ${fromMonth}
          and s.month_key <= ${toMonth}
          and a.deleted_at is null
          and a.include_in_cash_flow = true
        group by s.month_key
        order by s.month_key
      `;

      return {
        from: fromMonth,
        to: toMonth,
        points: rows.map((r) => {
          const net = r.total_inflows_minor - r.total_outflows_minor;
          return {
            month: r.month_key,
            totalInflowsMinor: r.total_inflows_minor.toString(),
            totalOutflowsMinor: r.total_outflows_minor.toString(),
            netCashflowMinor: net.toString()
          };
        })
      };
    });
  }

  async getSpendingByCategory(
    userId: string,
    fromMonth: string,
    toMonth: string
  ): Promise<SpendingByCategoryReport> {
    return runInUserDbContext(userId, async (tx) => {
      const rows = await tx.$queryRaw<
        Array<{
          category_id: string | null;
          category_name: string;
          total_spent_minor: bigint;
        }>
      >`
        select
          t.category_id,
          coalesce(c.name, 'Uncategorized') as category_name,
          sum(abs(t.amount_minor))::bigint as total_spent_minor
        from app.transactions t
        inner join app.financial_accounts a
          on a.id = t.account_id
          and a.user_id = t.user_id
        left join app.categories c
          on c.id = t.category_id
          and c.user_id = t.user_id
        where t.user_id = ${userId}
          and t.type = 'expense'::app.transaction_type
          and t.status = 'posted'::app.transaction_status
          and t.deleted_at is null
          and t.is_hidden = false
          and a.deleted_at is null
          and a.is_visible = true
          and to_char(t.transaction_date, 'YYYY-MM') >= ${fromMonth}
          and to_char(t.transaction_date, 'YYYY-MM') <= ${toMonth}
        group by t.category_id, coalesce(c.name, 'Uncategorized')
        order by total_spent_minor desc
      `;

      const currencyRows = await tx.$queryRaw<Array<{ currency: string }>>`
        select currency
        from app.financial_accounts
        where user_id = ${userId}
          and deleted_at is null
        limit 1
      `;
      const currency = currencyRows[0]?.currency ?? "CAD";

      return {
        from: fromMonth,
        to: toMonth,
        currency,
        byCategory: rows.map((r) => ({
          categoryId: r.category_id,
          categoryName: r.category_name,
          totalSpentMinor: r.total_spent_minor.toString()
        }))
      };
    });
  }
}
