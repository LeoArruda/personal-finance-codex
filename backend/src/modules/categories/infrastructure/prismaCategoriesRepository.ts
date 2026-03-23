import { runInUserDbContext } from "../../../shared/db/userContext";
import {
  type CategoriesRepository,
  type CategoryKind,
  type CategorySummary,
  type CreateCategoryInput,
  type UpdateCategoryInput
} from "../application/categories";

export class PrismaCategoriesRepository implements CategoriesRepository {
  async createForUser(userId: string, input: CreateCategoryInput): Promise<CategorySummary | null> {
    return runInUserDbContext(userId, async (tx) => {
      const budgetOk = await tx.$queryRaw<Array<{ id: string }>>`
        select id from app.budgets where id = ${input.budgetId}::uuid and user_id = ${userId} limit 1
      `;
      if (!budgetOk[0]) return null;

      const groupRows = await tx.$queryRaw<
        Array<{ id: string; budget_id: string }>
      >`
        select id, budget_id from app.category_groups
        where id = ${input.categoryGroupId}::uuid
          and user_id = ${userId}
          and deleted_at is null
        limit 1
      `;
      const grp = groupRows[0];
      if (!grp || grp.budget_id !== input.budgetId) return null;

      if (input.parentCategoryId) {
        const parentRows = await tx.$queryRaw<Array<{ id: string; budget_id: string }>>`
          select id, budget_id from app.categories
          where id = ${input.parentCategoryId}::uuid
            and user_id = ${userId}
            and deleted_at is null
          limit 1
        `;
        const p = parentRows[0];
        if (!p || p.budget_id !== input.budgetId) return null;
      }

      const kind = (input.kind ?? "expense") as CategoryKind;
      const sortOrder = input.sortOrder ?? 0;

      const rows = await tx.$queryRaw<
        Array<{
          id: string;
          user_id: string;
          budget_id: string;
          category_group_id: string;
          parent_category_id: string | null;
          kind: CategoryKind;
          name: string;
          sort_order: number;
          is_active: boolean;
        }>
      >`
        insert into app.categories (
          user_id,
          budget_id,
          category_group_id,
          parent_category_id,
          kind,
          name,
          sort_order,
          is_active
        )
        values (
          ${userId},
          ${input.budgetId}::uuid,
          ${input.categoryGroupId}::uuid,
          ${input.parentCategoryId ?? null}::uuid,
          ${kind}::app.category_kind,
          ${input.name},
          ${sortOrder},
          true
        )
        returning id, user_id, budget_id, category_group_id, parent_category_id, kind, name, sort_order, is_active
      `;

      const r = rows[0];
      if (!r) return null;
      return mapRow(r);
    });
  }

  async updateForUser(
    userId: string,
    categoryId: string,
    input: UpdateCategoryInput
  ): Promise<CategorySummary | null> {
    return runInUserDbContext(userId, async (tx) => {
      const rows = await tx.$queryRaw<
        Array<{
          id: string;
          user_id: string;
          budget_id: string;
          category_group_id: string;
          parent_category_id: string | null;
          kind: CategoryKind;
          name: string;
          sort_order: number;
          is_active: boolean;
        }>
      >`
        update app.categories
        set
          name = coalesce(${input.name ?? null}, name),
          is_active = coalesce(${input.isActive ?? null}, is_active),
          sort_order = coalesce(${input.sortOrder ?? null}, sort_order),
          updated_at = now()
        where id = ${categoryId}::uuid
          and user_id = ${userId}
          and deleted_at is null
        returning id, user_id, budget_id, category_group_id, parent_category_id, kind, name, sort_order, is_active
      `;

      const r = rows[0];
      return r ? mapRow(r) : null;
    });
  }
}

function mapRow(r: {
  id: string;
  user_id: string;
  budget_id: string;
  category_group_id: string;
  parent_category_id: string | null;
  kind: CategoryKind;
  name: string;
  sort_order: number;
  is_active: boolean;
}): CategorySummary {
  return {
    id: r.id,
    userId: r.user_id,
    budgetId: r.budget_id,
    categoryGroupId: r.category_group_id,
    parentCategoryId: r.parent_category_id,
    kind: r.kind,
    name: r.name,
    sortOrder: r.sort_order,
    isActive: r.is_active
  };
}
