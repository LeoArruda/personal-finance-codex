import { runInUserDbContext } from "../../../shared/db/userContext";
import {
  type AccountSummary,
  type AccountsRepository,
  type CreateAccountInput,
  type UpdateAccountInput
} from "../application/accounts";

export class PrismaAccountsRepository implements AccountsRepository {
  async listByUser(userId: string): Promise<AccountSummary[]> {
    return runInUserDbContext(userId, async (tx) => {
      const rows = await tx.$queryRaw<Array<{
        id: string;
        user_id: string;
        name: string;
        kind: AccountSummary["kind"];
        status: AccountSummary["status"];
        currency: string;
        is_on_budget: boolean;
      }>>`
        select id, user_id, name, kind, status, currency, is_on_budget
        from app.financial_accounts
        where user_id = ${userId}
        order by created_at asc
      `;

      return rows.map((row) => ({
        id: row.id,
        userId: row.user_id,
        name: row.name,
        kind: row.kind,
        status: row.status,
        currency: row.currency,
        isOnBudget: row.is_on_budget
      }));
    });
  }

  async createForUser(userId: string, input: CreateAccountInput): Promise<AccountSummary> {
    return runInUserDbContext(userId, async (tx) => {
      const rows = await tx.$queryRaw<Array<{
        id: string;
        user_id: string;
        name: string;
        kind: AccountSummary["kind"];
        status: AccountSummary["status"];
        currency: string;
        is_on_budget: boolean;
      }>>`
        insert into app.financial_accounts (
          user_id, name, kind, status, currency, opening_balance_minor, current_balance_minor, is_on_budget
        )
        values (
          ${userId},
          ${input.name},
          ${input.kind}::app.account_kind,
          'active',
          ${input.currency ?? "CAD"},
          0,
          0,
          ${input.isOnBudget ?? true}
        )
        returning id, user_id, name, kind, status, currency, is_on_budget
      `;

      const created = rows[0];
      return {
        id: created.id,
        userId: created.user_id,
        name: created.name,
        kind: created.kind,
        status: created.status,
        currency: created.currency,
        isOnBudget: created.is_on_budget
      };
    });
  }

  async updateForUser(
    userId: string,
    accountId: string,
    input: UpdateAccountInput
  ): Promise<AccountSummary | null> {
    return runInUserDbContext(userId, async (tx) => {
      const rows = await tx.$queryRaw<Array<{
        id: string;
        user_id: string;
        name: string;
        kind: AccountSummary["kind"];
        status: AccountSummary["status"];
        currency: string;
        is_on_budget: boolean;
      }>>`
        update app.financial_accounts
        set
          name = coalesce(${input.name ?? null}, name),
          kind = coalesce(${input.kind ?? null}::app.account_kind, kind),
          currency = coalesce(${input.currency ?? null}, currency),
          is_on_budget = coalesce(${input.isOnBudget ?? null}, is_on_budget),
          status = coalesce(${input.status ?? null}::app.account_status, status),
          updated_at = now()
        where id = ${accountId}
          and user_id = ${userId}
        returning id, user_id, name, kind, status, currency, is_on_budget
      `;

      const updated = rows[0];
      if (!updated) return null;
      return {
        id: updated.id,
        userId: updated.user_id,
        name: updated.name,
        kind: updated.kind,
        status: updated.status,
        currency: updated.currency,
        isOnBudget: updated.is_on_budget
      };
    });
  }
}
