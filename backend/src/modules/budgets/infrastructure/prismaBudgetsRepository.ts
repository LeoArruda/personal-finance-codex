import { runInUserDbContext } from "../../../shared/db/userContext";
import {
  type BudgetSummary,
  type BudgetsRepository,
  type CreateBudgetInput,
  type UpdateBudgetInput
} from "../application/budgets";

export class PrismaBudgetsRepository implements BudgetsRepository {
  async listByUser(userId: string): Promise<BudgetSummary[]> {
    return runInUserDbContext(userId, async (tx) => {
      const rows = await tx.$queryRaw<Array<{
        id: string;
        user_id: string;
        name: string;
        currency: string;
        is_default: boolean;
        status: "active" | "archived";
      }>>`
        select id, user_id, name, currency, is_default, status
        from app.budgets
        where user_id = ${userId}
        order by created_at asc
      `;

      return rows.map((row) => ({
        id: row.id,
        userId: row.user_id,
        name: row.name,
        currency: row.currency,
        isDefault: row.is_default,
        status: row.status
      }));
    });
  }

  async createForUser(userId: string, input: CreateBudgetInput): Promise<BudgetSummary> {
    return runInUserDbContext(userId, async (tx) => {
      const rows = await tx.$queryRaw<Array<{
        id: string;
        user_id: string;
        name: string;
        currency: string;
        is_default: boolean;
        status: "active" | "archived";
      }>>`
        insert into app.budgets (user_id, name, currency, is_default, status)
        values (
          ${userId},
          ${input.name},
          ${input.currency ?? "CAD"},
          ${input.isDefault ?? false},
          'active'
        )
        returning id, user_id, name, currency, is_default, status
      `;

      const created = rows[0];
      return {
        id: created.id,
        userId: created.user_id,
        name: created.name,
        currency: created.currency,
        isDefault: created.is_default,
        status: created.status
      };
    });
  }

  async updateForUser(
    userId: string,
    budgetId: string,
    input: UpdateBudgetInput
  ): Promise<BudgetSummary | null> {
    return runInUserDbContext(userId, async (tx) => {
      const rows = await tx.$queryRaw<Array<{
        id: string;
        user_id: string;
        name: string;
        currency: string;
        is_default: boolean;
        status: "active" | "archived";
      }>>`
        update app.budgets
        set
          name = coalesce(${input.name ?? null}, name),
          currency = coalesce(${input.currency ?? null}, currency),
          status = coalesce(${input.status ?? null}::app.budget_status, status),
          updated_at = now()
        where id = ${budgetId}
          and user_id = ${userId}
        returning id, user_id, name, currency, is_default, status
      `;

      const updated = rows[0];
      if (!updated) return null;

      return {
        id: updated.id,
        userId: updated.user_id,
        name: updated.name,
        currency: updated.currency,
        isDefault: updated.is_default,
        status: updated.status
      };
    });
  }

  async setDefaultForUser(userId: string, budgetId: string): Promise<BudgetSummary | null> {
    return runInUserDbContext(userId, async (tx) => {
      await tx.$executeRaw`
        update app.budgets
        set is_default = false, updated_at = now()
        where user_id = ${userId}
      `;

      const rows = await tx.$queryRaw<Array<{
        id: string;
        user_id: string;
        name: string;
        currency: string;
        is_default: boolean;
        status: "active" | "archived";
      }>>`
        update app.budgets
        set is_default = true, updated_at = now()
        where id = ${budgetId}
          and user_id = ${userId}
        returning id, user_id, name, currency, is_default, status
      `;

      const updated = rows[0];
      if (!updated) return null;

      return {
        id: updated.id,
        userId: updated.user_id,
        name: updated.name,
        currency: updated.currency,
        isDefault: updated.is_default,
        status: updated.status
      };
    });
  }
}

