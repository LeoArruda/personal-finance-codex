import { type Prisma } from "@prisma/client";
import { runInUserDbContext } from "../../../shared/db/userContext";
import {
  type BudgetMonthSummary,
  type BudgetMonthsRepository,
  type CategoryMonthSummary,
  monthDateRange,
  previousMonthKey
} from "../application/budgetMonths";

function mapCategoryRow(row: {
  category_id: string;
  assigned_minor: bigint;
  activity_minor: bigint;
  available_minor: bigint;
  carryover_from_previous_minor: bigint;
}): CategoryMonthSummary {
  return {
    categoryId: row.category_id,
    assignedMinor: row.assigned_minor.toString(),
    activityMinor: row.activity_minor.toString(),
    availableMinor: row.available_minor.toString(),
    carryoverFromPreviousMinor: row.carryover_from_previous_minor.toString()
  };
}

export class PrismaBudgetMonthsRepository implements BudgetMonthsRepository {
  async assertBudgetOwnedByUser(userId: string, budgetId: string): Promise<boolean> {
    return runInUserDbContext(userId, async (tx) => {
      const rows = await tx.$queryRaw<Array<{ id: string }>>`
        select id from app.budgets
        where id = ${budgetId}::uuid and user_id = ${userId}
        limit 1
      `;
      return rows.length > 0;
    });
  }

  async getMonthSummary(
    userId: string,
    budgetId: string,
    monthKey: string
  ): Promise<BudgetMonthSummary | null> {
    return runInUserDbContext(userId, async (tx) =>
      this.getMonthSummaryWithinTx(tx, userId, budgetId, monthKey)
    );
  }

  async ensureMonthOpen(
    userId: string,
    budgetId: string,
    monthKey: string
  ): Promise<BudgetMonthSummary | null> {
    return runInUserDbContext(userId, async (tx) => {
      const budgetRows = await tx.$queryRaw<Array<{ id: string }>>`
        select id from app.budgets
        where id = ${budgetId}::uuid and user_id = ${userId}
        limit 1
      `;
      if (budgetRows.length === 0) return null;

      const existing = await tx.$queryRaw<Array<{ id: string }>>`
        select id from app.budget_months
        where user_id = ${userId}
          and budget_id = ${budgetId}::uuid
          and month_key = ${monthKey}
        limit 1
      `;

      if (existing[0]) {
        return this.getMonthSummaryWithinTx(tx, userId, budgetId, monthKey);
      }

      const prevKey = previousMonthKey(monthKey);
      const prevRows = await tx.$queryRaw<Array<{ ready_to_assign_minor: bigint }>>`
        select ready_to_assign_minor
        from app.budget_months
        where user_id = ${userId}
          and budget_id = ${budgetId}::uuid
          and month_key = ${prevKey}
        limit 1
      `;
      const prevRta = prevRows[0]?.ready_to_assign_minor ?? 0n;

      const { monthStart, monthEnd } = monthDateRange(monthKey);

      const insertedBm = await tx.$queryRaw<Array<{
        id: string;
        user_id: string;
        budget_id: string;
        month_key: string;
        month_start: Date;
        month_end: Date;
        ready_to_assign_minor: bigint;
        leftover_from_previous_minor: bigint;
        total_assigned_minor: bigint;
        total_activity_minor: bigint;
        total_available_minor: bigint;
      }>>`
        insert into app.budget_months (
          user_id, budget_id, month_key, month_start, month_end,
          ready_to_assign_minor, leftover_from_previous_minor,
          total_assigned_minor, total_activity_minor, total_available_minor
        )
        values (
          ${userId},
          ${budgetId}::uuid,
          ${monthKey},
          ${monthStart}::date,
          ${monthEnd}::date,
          ${prevRta},
          ${prevRta},
          0,
          0,
          0
        )
        returning
          id, user_id, budget_id, month_key, month_start, month_end,
          ready_to_assign_minor, leftover_from_previous_minor,
          total_assigned_minor, total_activity_minor, total_available_minor
      `;

      const bm = insertedBm[0];
      if (!bm) return null;

      const categoryRows = await tx.$queryRaw<Array<{ id: string }>>`
        select id
        from app.categories
        where user_id = ${userId}
          and budget_id = ${budgetId}::uuid
          and deleted_at is null
          and is_active = true
        order by sort_order asc, name asc
      `;

      for (const cat of categoryRows) {
        const prevAvailRows = await tx.$queryRaw<Array<{ available_minor: bigint }>>`
          select cm.available_minor
          from app.category_months cm
          inner join app.budget_months bm on bm.id = cm.budget_month_id
          where cm.user_id = ${userId}
            and cm.category_id = ${cat.id}
            and bm.budget_id = ${budgetId}::uuid
            and bm.month_key = ${prevKey}
          limit 1
        `;
        const carry = prevAvailRows[0]?.available_minor ?? 0n;

        await tx.$executeRaw`
          insert into app.category_months (
            user_id, budget_month_id, category_id,
            assigned_minor, activity_minor, available_minor, carryover_from_previous_minor
          )
          values (
            ${userId},
            ${bm.id},
            ${cat.id},
            0,
            0,
            ${carry},
            ${carry}
          )
        `;
      }

      await tx.$executeRaw`
        update app.budget_months
        set
          total_available_minor = coalesce(
            (select sum(available_minor) from app.category_months where budget_month_id = ${bm.id}),
            0
          ),
          updated_at = now()
        where id = ${bm.id}
          and user_id = ${userId}
      `;

      return this.getMonthSummaryWithinTx(tx, userId, budgetId, monthKey);
    });
  }

  private async getMonthSummaryWithinTx(
    tx: Prisma.TransactionClient,
    userId: string,
    budgetId: string,
    monthKey: string
  ): Promise<BudgetMonthSummary | null> {
    const bmRows = await tx.$queryRaw<Array<{
      id: string;
      user_id: string;
      budget_id: string;
      month_key: string;
      month_start: Date;
      month_end: Date;
      ready_to_assign_minor: bigint;
      leftover_from_previous_minor: bigint;
      total_assigned_minor: bigint;
      total_activity_minor: bigint;
      total_available_minor: bigint;
    }>>`
      select
        id, user_id, budget_id, month_key, month_start, month_end,
        ready_to_assign_minor, leftover_from_previous_minor,
        total_assigned_minor, total_activity_minor, total_available_minor
      from app.budget_months
      where user_id = ${userId}
        and budget_id = ${budgetId}::uuid
        and month_key = ${monthKey}
      limit 1
    `;

    const bm = bmRows[0];
    if (!bm) return null;

    const cmRows = await tx.$queryRaw<Array<{
      category_id: string;
      assigned_minor: bigint;
      activity_minor: bigint;
      available_minor: bigint;
      carryover_from_previous_minor: bigint;
    }>>`
      select category_id, assigned_minor, activity_minor, available_minor, carryover_from_previous_minor
      from app.category_months
      where budget_month_id = ${bm.id}
        and user_id = ${userId}
      order by category_id asc
    `;

    return {
      id: bm.id,
      userId: bm.user_id,
      budgetId: bm.budget_id,
      monthKey: bm.month_key,
      monthStart: bm.month_start.toISOString().slice(0, 10),
      monthEnd: bm.month_end.toISOString().slice(0, 10),
      readyToAssignMinor: bm.ready_to_assign_minor.toString(),
      leftoverFromPreviousMinor: bm.leftover_from_previous_minor.toString(),
      totalAssignedMinor: bm.total_assigned_minor.toString(),
      totalActivityMinor: bm.total_activity_minor.toString(),
      totalAvailableMinor: bm.total_available_minor.toString(),
      categoryMonths: cmRows.map(mapCategoryRow)
    };
  }
}
