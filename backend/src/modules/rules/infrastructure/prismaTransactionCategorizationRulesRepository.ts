import { runInUserDbContext } from "../../../shared/db/userContext";
import {
  type CreateCategorizationRuleInput,
  type CategorizationRuleSummary,
  type TransactionCategorizationRulesRepository
} from "../application/rules";
import { type RuleCandidate } from "../domain/ruleMatch";

export class PrismaTransactionCategorizationRulesRepository
  implements TransactionCategorizationRulesRepository
{
  async listRules(userId: string): Promise<RuleCandidate[]> {
    return runInUserDbContext(userId, async (tx) => {
      const rows = await tx.$queryRaw<
        Array<{
          id: string;
          priority: number;
          payee_contains: string;
          category_id: string;
        }>
      >`
        select id, priority, payee_contains, category_id
        from app.transaction_categorization_rules
        where user_id = ${userId}
        order by priority desc, created_at asc
      `;
      return rows.map((r) => ({
        id: r.id,
        priority: r.priority,
        payeeContains: r.payee_contains,
        categoryId: r.category_id
      }));
    });
  }

  async createRule(
    userId: string,
    input: CreateCategorizationRuleInput
  ): Promise<CategorizationRuleSummary | null> {
    return runInUserDbContext(userId, async (tx) => {
      const priority = input.priority ?? 0;
      const rows = await tx.$queryRaw<
        Array<{
          id: string;
          user_id: string;
          priority: number;
          payee_contains: string;
          category_id: string;
        }>
      >`
        insert into app.transaction_categorization_rules (user_id, priority, payee_contains, category_id)
        values (
          ${userId},
          ${priority},
          ${input.payeeContains.trim()},
          ${input.categoryId}::uuid
        )
        returning id, user_id, priority, payee_contains, category_id
      `;
      const r = rows[0];
      if (!r) return null;
      return {
        id: r.id,
        userId: r.user_id,
        priority: r.priority,
        payeeContains: r.payee_contains,
        categoryId: r.category_id
      };
    });
  }

  async getTransactionDescriptionAndCategory(
    userId: string,
    transactionId: string
  ): Promise<{ description: string; categoryId: string | null } | null> {
    return runInUserDbContext(userId, async (tx) => {
      const rows = await tx.$queryRaw<
        Array<{ description: string; category_id: string | null }>
      >`
        select description, category_id
        from app.transactions
        where id = ${transactionId}::uuid
          and user_id = ${userId}
          and deleted_at is null
        limit 1
      `;
      const r = rows[0];
      if (!r) return null;
      return { description: r.description, categoryId: r.category_id };
    });
  }

  async setTransactionCategory(
    userId: string,
    transactionId: string,
    categoryId: string
  ): Promise<boolean> {
    return runInUserDbContext(userId, async (tx) => {
      const rows = await tx.$queryRaw<Array<{ id: string }>>`
        update app.transactions t
        set
          category_id = ${categoryId}::uuid,
          updated_at = now()
        from app.categories c
        where t.id = ${transactionId}::uuid
          and t.user_id = ${userId}
          and c.id = ${categoryId}::uuid
          and c.user_id = ${userId}
          and c.deleted_at is null
        returning t.id
      `;
      return Boolean(rows[0]);
    });
  }
}
