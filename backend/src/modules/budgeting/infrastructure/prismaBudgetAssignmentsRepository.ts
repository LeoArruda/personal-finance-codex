import { runInUserDbContext } from "../../../shared/db/userContext";
import {
  type AssignMoneyInput,
  type AssignMoneyRepositoryResult,
  type AssignMoneyResult,
  type BudgetAssignmentsRepository
} from "../application/assignMoney";
import {
  type MoveMoneyInput,
  type MoveMoneyRepositoryResult,
  type MoveMoneyResult
} from "../application/moveMoney";
import { type CategoryMonthSummary } from "../application/budgetMonths";

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

export class PrismaBudgetAssignmentsRepository implements BudgetAssignmentsRepository {
  async assignMoneyFromReadyToAssign(
    userId: string,
    budgetId: string,
    monthKey: string,
    input: AssignMoneyInput
  ): Promise<AssignMoneyRepositoryResult> {
    return runInUserDbContext(userId, async (tx) => {
      const amount = BigInt(input.amountMinor);
      if (amount <= 0n) {
        return { status: "not_found" };
      }

      const bmRows = await tx.$queryRaw<Array<{
        id: string;
        ready_to_assign_minor: bigint;
        total_assigned_minor: bigint;
      }>>`
        select id, ready_to_assign_minor, total_assigned_minor
        from app.budget_months
        where user_id = ${userId}
          and budget_id = ${budgetId}::uuid
          and month_key = ${monthKey}
        limit 1
      `;
      const bm = bmRows[0];
      if (!bm) {
        return { status: "not_found" };
      }

      const catRows = await tx.$queryRaw<Array<{ id: string }>>`
        select id
        from app.categories
        where id = ${input.categoryId}::uuid
          and user_id = ${userId}
          and budget_id = ${budgetId}::uuid
          and deleted_at is null
          and is_active = true
        limit 1
      `;
      if (!catRows[0]) {
        return { status: "not_found" };
      }

      const cmExists = await tx.$queryRaw<Array<{ id: string }>>`
        select id
        from app.category_months
        where user_id = ${userId}
          and budget_month_id = ${bm.id}
          and category_id = ${input.categoryId}::uuid
        limit 1
      `;
      if (!cmExists[0]) {
        return { status: "not_found" };
      }

      if (amount > bm.ready_to_assign_minor) {
        return { status: "insufficient_ready_to_assign" };
      }

      const eventRows = await tx.$queryRaw<Array<{ id: string }>>`
        insert into app.budget_assignment_events (
          user_id,
          budget_id,
          budget_month_id,
          category_id,
          source_category_id,
          event_type,
          amount_minor,
          notes,
          created_by_user_id
        )
        values (
          ${userId},
          ${budgetId}::uuid,
          ${bm.id},
          ${input.categoryId}::uuid,
          null,
          'assign'::app.budget_assignment_event_type,
          ${amount},
          ${input.notes ?? null},
          ${userId}
        )
        returning id
      `;
      const eventId = eventRows[0]?.id;
      if (!eventId) {
        return { status: "not_found" };
      }

      const updatedCm = await tx.$queryRaw<Array<{
        category_id: string;
        assigned_minor: bigint;
        activity_minor: bigint;
        available_minor: bigint;
        carryover_from_previous_minor: bigint;
      }>>`
        update app.category_months
        set
          assigned_minor = assigned_minor + ${amount},
          available_minor = available_minor + ${amount},
          updated_at = now()
        where user_id = ${userId}
          and budget_month_id = ${bm.id}
          and category_id = ${input.categoryId}::uuid
        returning
          category_id,
          assigned_minor,
          activity_minor,
          available_minor,
          carryover_from_previous_minor
      `;
      const cmRow = updatedCm[0];
      if (!cmRow) {
        return { status: "not_found" };
      }

      await tx.$executeRaw`
        update app.budget_months
        set
          ready_to_assign_minor = ready_to_assign_minor - ${amount},
          total_assigned_minor = total_assigned_minor + ${amount},
          total_available_minor = coalesce(
            (
              select sum(available_minor)
              from app.category_months
              where budget_month_id = ${bm.id}
                and user_id = ${userId}
            ),
            0
          ),
          updated_at = now()
        where id = ${bm.id}
          and user_id = ${userId}
      `;

      const bmAfter = await tx.$queryRaw<Array<{
        ready_to_assign_minor: bigint;
        total_assigned_minor: bigint;
        total_available_minor: bigint;
      }>>`
        select ready_to_assign_minor, total_assigned_minor, total_available_minor
        from app.budget_months
        where id = ${bm.id}
          and user_id = ${userId}
        limit 1
      `;
      const totals = bmAfter[0];
      if (!totals) {
        return { status: "not_found" };
      }

      const data: AssignMoneyResult = {
        eventId,
        readyToAssignMinor: totals.ready_to_assign_minor.toString(),
        totalAssignedMinor: totals.total_assigned_minor.toString(),
        totalAvailableMinor: totals.total_available_minor.toString(),
        categoryMonth: mapCategoryRow(cmRow)
      };

      return { status: "ok", data };
    });
  }

  async moveMoneyBetweenCategories(
    userId: string,
    budgetId: string,
    monthKey: string,
    input: MoveMoneyInput
  ): Promise<MoveMoneyRepositoryResult> {
    return runInUserDbContext(userId, async (tx) => {
      const amount = BigInt(input.amountMinor);
      if (amount <= 0n) {
        return { status: "not_found" };
      }

      if (input.fromCategoryId === input.toCategoryId) {
        return { status: "same_category" };
      }

      const bmRows = await tx.$queryRaw<Array<{
        id: string;
        ready_to_assign_minor: bigint;
        total_assigned_minor: bigint;
      }>>`
        select id, ready_to_assign_minor, total_assigned_minor
        from app.budget_months
        where user_id = ${userId}
          and budget_id = ${budgetId}::uuid
          and month_key = ${monthKey}
        limit 1
      `;
      const bm = bmRows[0];
      if (!bm) {
        return { status: "not_found" };
      }

      for (const cid of [input.fromCategoryId, input.toCategoryId]) {
        const catRows = await tx.$queryRaw<Array<{ id: string }>>`
          select id
          from app.categories
          where id = ${cid}::uuid
            and user_id = ${userId}
            and budget_id = ${budgetId}::uuid
            and deleted_at is null
            and is_active = true
          limit 1
        `;
        if (!catRows[0]) {
          return { status: "not_found" };
        }
      }

      const srcCmRows = await tx.$queryRaw<Array<{ available_minor: bigint }>>`
        select available_minor
        from app.category_months
        where user_id = ${userId}
          and budget_month_id = ${bm.id}
          and category_id = ${input.fromCategoryId}::uuid
        limit 1
      `;
      const destCmExists = await tx.$queryRaw<Array<{ id: string }>>`
        select id
        from app.category_months
        where user_id = ${userId}
          and budget_month_id = ${bm.id}
          and category_id = ${input.toCategoryId}::uuid
        limit 1
      `;
      if (!srcCmRows[0] || !destCmExists[0]) {
        return { status: "not_found" };
      }

      if (amount > srcCmRows[0].available_minor) {
        return { status: "insufficient_source_available" };
      }

      const eventRows = await tx.$queryRaw<Array<{ id: string }>>`
        insert into app.budget_assignment_events (
          user_id,
          budget_id,
          budget_month_id,
          category_id,
          source_category_id,
          event_type,
          amount_minor,
          notes,
          created_by_user_id
        )
        values (
          ${userId},
          ${budgetId}::uuid,
          ${bm.id},
          ${input.toCategoryId}::uuid,
          ${input.fromCategoryId}::uuid,
          'move'::app.budget_assignment_event_type,
          ${amount},
          ${input.notes ?? null},
          ${userId}
        )
        returning id
      `;
      const eventId = eventRows[0]?.id;
      if (!eventId) {
        return { status: "not_found" };
      }

      const srcUpdated = await tx.$queryRaw<Array<{
        category_id: string;
        assigned_minor: bigint;
        activity_minor: bigint;
        available_minor: bigint;
        carryover_from_previous_minor: bigint;
      }>>`
        update app.category_months
        set
          assigned_minor = assigned_minor - ${amount},
          available_minor = available_minor - ${amount},
          updated_at = now()
        where user_id = ${userId}
          and budget_month_id = ${bm.id}
          and category_id = ${input.fromCategoryId}::uuid
        returning
          category_id,
          assigned_minor,
          activity_minor,
          available_minor,
          carryover_from_previous_minor
      `;
      const destUpdated = await tx.$queryRaw<Array<{
        category_id: string;
        assigned_minor: bigint;
        activity_minor: bigint;
        available_minor: bigint;
        carryover_from_previous_minor: bigint;
      }>>`
        update app.category_months
        set
          assigned_minor = assigned_minor + ${amount},
          available_minor = available_minor + ${amount},
          updated_at = now()
        where user_id = ${userId}
          and budget_month_id = ${bm.id}
          and category_id = ${input.toCategoryId}::uuid
        returning
          category_id,
          assigned_minor,
          activity_minor,
          available_minor,
          carryover_from_previous_minor
      `;

      const srcRow = srcUpdated[0];
      const destRow = destUpdated[0];
      if (!srcRow || !destRow) {
        return { status: "not_found" };
      }

      await tx.$executeRaw`
        update app.budget_months
        set
          total_available_minor = coalesce(
            (
              select sum(available_minor)
              from app.category_months
              where budget_month_id = ${bm.id}
                and user_id = ${userId}
            ),
            0
          ),
          updated_at = now()
        where id = ${bm.id}
          and user_id = ${userId}
      `;

      const bmAfter = await tx.$queryRaw<Array<{
        ready_to_assign_minor: bigint;
        total_assigned_minor: bigint;
        total_available_minor: bigint;
      }>>`
        select ready_to_assign_minor, total_assigned_minor, total_available_minor
        from app.budget_months
        where id = ${bm.id}
          and user_id = ${userId}
        limit 1
      `;
      const totals = bmAfter[0];
      if (!totals) {
        return { status: "not_found" };
      }

      const data: MoveMoneyResult = {
        eventId,
        readyToAssignMinor: totals.ready_to_assign_minor.toString(),
        totalAssignedMinor: totals.total_assigned_minor.toString(),
        totalAvailableMinor: totals.total_available_minor.toString(),
        sourceCategoryMonth: mapCategoryRow(srcRow),
        destinationCategoryMonth: mapCategoryRow(destRow)
      };

      return { status: "ok", data };
    });
  }
}
