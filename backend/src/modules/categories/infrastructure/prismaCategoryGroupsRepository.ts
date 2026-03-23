import { runInUserDbContext } from "../../../shared/db/userContext";
import {
  type CategoryGroupSummary,
  type CategoryGroupsRepository,
  type CreateCategoryGroupInput
} from "../application/categoryGroups";

export class PrismaCategoryGroupsRepository implements CategoryGroupsRepository {
  async listByBudget(userId: string, budgetId: string): Promise<CategoryGroupSummary[]> {
    return runInUserDbContext(userId, async (tx) => {
      const owned = await tx.$queryRaw<Array<{ id: string }>>`
        select id from app.budgets where id = ${budgetId}::uuid and user_id = ${userId} limit 1
      `;
      if (!owned[0]) return [];

      const rows = await tx.$queryRaw<
        Array<{
          id: string;
          user_id: string;
          budget_id: string;
          name: string;
          description: string | null;
          sort_order: number;
          is_active: boolean;
        }>
      >`
        select id, user_id, budget_id, name, description, sort_order, is_active
        from app.category_groups
        where user_id = ${userId}
          and budget_id = ${budgetId}::uuid
          and deleted_at is null
        order by sort_order asc, name asc
      `;

      return rows.map((r) => ({
        id: r.id,
        userId: r.user_id,
        budgetId: r.budget_id,
        name: r.name,
        description: r.description,
        sortOrder: r.sort_order,
        isActive: r.is_active
      }));
    });
  }

  async createForBudget(
    userId: string,
    budgetId: string,
    input: CreateCategoryGroupInput
  ): Promise<CategoryGroupSummary | null> {
    return runInUserDbContext(userId, async (tx) => {
      const owned = await tx.$queryRaw<Array<{ id: string }>>`
        select id from app.budgets where id = ${budgetId}::uuid and user_id = ${userId} limit 1
      `;
      if (!owned[0]) return null;

      const sortOrder = input.sortOrder ?? 0;

      const rows = await tx.$queryRaw<
        Array<{
          id: string;
          user_id: string;
          budget_id: string;
          name: string;
          description: string | null;
          sort_order: number;
          is_active: boolean;
        }>
      >`
        insert into app.category_groups (user_id, budget_id, name, description, sort_order, is_active)
        values (
          ${userId},
          ${budgetId}::uuid,
          ${input.name},
          ${input.description ?? null},
          ${sortOrder},
          true
        )
        returning id, user_id, budget_id, name, description, sort_order, is_active
      `;

      const r = rows[0];
      if (!r) return null;
      return {
        id: r.id,
        userId: r.user_id,
        budgetId: r.budget_id,
        name: r.name,
        description: r.description,
        sortOrder: r.sort_order,
        isActive: r.is_active
      };
    });
  }
}
