import { runInUserDbContext } from "../../../shared/db/userContext";
import {
  type DashboardBillSlice,
  type DashboardBudgetMonthSlice,
  type DashboardGoalSlice,
  type DashboardRepository,
  type DashboardSpendingSlice,
  type DashboardSummary
} from "../application/dashboard";

export class PrismaDashboardRepository implements DashboardRepository {
  async getSummary(userId: string, monthKey: string): Promise<DashboardSummary> {
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

      let budgetMonth: DashboardBudgetMonthSlice | null = null;
      if (budget) {
        const bmRows = await tx.$queryRaw<
          Array<{
            month_key: string;
            ready_to_assign_minor: bigint;
            total_assigned_minor: bigint;
            total_activity_minor: bigint;
            total_available_minor: bigint;
          }>
        >`
          select month_key, ready_to_assign_minor, total_assigned_minor, total_activity_minor, total_available_minor
          from app.budget_months
          where user_id = ${userId}
            and budget_id = ${budget.id}::uuid
            and month_key = ${monthKey}
          limit 1
        `;
        const bm = bmRows[0];
        if (bm) {
          budgetMonth = {
            monthKey: bm.month_key,
            readyToAssignMinor: bm.ready_to_assign_minor.toString(),
            totalAssignedMinor: bm.total_assigned_minor.toString(),
            totalActivityMinor: bm.total_activity_minor.toString(),
            totalAvailableMinor: bm.total_available_minor.toString()
          };
        }
      }

      const billRows = await tx.$queryRaw<
        Array<{
          id: string;
          payee_name: string;
          amount_minor: bigint;
          currency: string;
          due_date: Date;
          status: string;
        }>
      >`
        select id, payee_name, amount_minor, currency, due_date, status::text as status
        from app.bills
        where user_id = ${userId}
          and status = 'pending'::app.bill_status
          and deleted_at is null
          and due_date >= current_date
          and due_date <= current_date + interval '14 days'
        order by due_date asc
        limit 20
      `;

      const upcomingBills: DashboardBillSlice[] = billRows.map((b) => ({
        id: b.id,
        payeeName: b.payee_name,
        amountMinor: b.amount_minor.toString(),
        currency: b.currency,
        dueDate: b.due_date.toISOString().slice(0, 10),
        status: b.status
      }));

      const goalRows = await tx.$queryRaw<
        Array<{
          id: string;
          name: string;
          type: string;
          status: string;
          target_amount_minor: bigint;
          current_amount_minor: bigint;
          currency: string;
        }>
      >`
        select id, name, type::text as type, status::text as status,
          target_amount_minor, current_amount_minor, currency
        from app.goals
        where user_id = ${userId}
          and deleted_at is null
          and status = 'active'::app.goal_status
        order by priority desc, created_at asc
        limit 5
      `;

      const activeGoals: DashboardGoalSlice[] = goalRows.map((g) => ({
        id: g.id,
        name: g.name,
        type: g.type,
        status: g.status,
        targetAmountMinor: g.target_amount_minor.toString(),
        currentAmountMinor: g.current_amount_minor.toString(),
        currency: g.currency
      }));

      const spendRows = await tx.$queryRaw<
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
          on a.id = t.account_id and a.user_id = t.user_id
        left join app.categories c
          on c.id = t.category_id and c.user_id = t.user_id
        where t.user_id = ${userId}
          and t.type = 'expense'::app.transaction_type
          and t.status = 'posted'::app.transaction_status
          and t.deleted_at is null
          and t.is_hidden = false
          and a.deleted_at is null
          and a.is_visible = true
          and to_char(t.transaction_date, 'YYYY-MM') = ${monthKey}
        group by t.category_id, coalesce(c.name, 'Uncategorized')
        order by total_spent_minor desc
        limit 5
      `;

      const topSpendingCategories: DashboardSpendingSlice[] = spendRows.map((r) => ({
        categoryId: r.category_id,
        categoryName: r.category_name,
        totalSpentMinor: r.total_spent_minor.toString()
      }));

      return {
        monthKey,
        budgetId: budget?.id ?? null,
        budgetCurrency: budget?.currency ?? null,
        budgetMonth,
        upcomingBills,
        activeGoals,
        topSpendingCategories
      };
    });
  }
}
