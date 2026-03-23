import { runInUserDbContext } from "../../../shared/db/userContext";
import { goalAcceptsManualContributions } from "../domain/addGoalContribution";
import {
  type AddGoalContributionInput,
  type AddGoalContributionResult,
  type CreateGoalInput,
  type CreateGoalResult,
  type GoalContributionSummary,
  type GoalStatus,
  type GoalSummary,
  type GoalType,
  type GoalsRepository
} from "../application/goals";

function mapGoalRow(row: {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  type: GoalType;
  status: GoalStatus;
  currency: string;
  target_amount_minor: bigint;
  current_amount_minor: bigint;
  target_date: Date | null;
  started_at: Date | null;
  completed_at: Date | null;
  linked_account_id: string | null;
  linked_category_id: string | null;
}): GoalSummary {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description,
    type: row.type,
    status: row.status,
    currency: row.currency,
    targetAmountMinor: row.target_amount_minor.toString(),
    currentAmountMinor: row.current_amount_minor.toString(),
    targetDate: row.target_date?.toISOString().slice(0, 10) ?? null,
    startedAt: row.started_at?.toISOString().slice(0, 10) ?? null,
    completedAt: row.completed_at?.toISOString().slice(0, 10) ?? null,
    linkedAccountId: row.linked_account_id,
    linkedCategoryId: row.linked_category_id
  };
}

function mapContributionRow(row: {
  id: string;
  user_id: string;
  goal_id: string;
  amount_minor: bigint;
  contribution_date: Date;
  source: GoalContributionSummary["source"];
  account_id: string | null;
  transaction_id: string | null;
}): GoalContributionSummary {
  return {
    id: row.id,
    userId: row.user_id,
    goalId: row.goal_id,
    amountMinor: row.amount_minor.toString(),
    contributionDate: row.contribution_date.toISOString().slice(0, 10),
    source: row.source,
    accountId: row.account_id,
    transactionId: row.transaction_id
  };
}

export class PrismaGoalsRepository implements GoalsRepository {
  async createGoal(userId: string, input: CreateGoalInput): Promise<CreateGoalResult> {
    let targetMinor: bigint;
    try {
      targetMinor = BigInt(input.targetAmountMinor);
    } catch {
      return { ok: false, error: "invalid_input" };
    }
    if (targetMinor <= 0n) {
      return { ok: false, error: "invalid_input" };
    }

    return runInUserDbContext(userId, async (tx) => {
      if (input.linkedAccountId) {
        const a = await tx.$queryRaw<Array<{ id: string }>>`
          select id from app.financial_accounts
          where id = ${input.linkedAccountId}::uuid and user_id = ${userId}
          limit 1
        `;
        if (!a[0]) return { ok: false, error: "linked_account_not_found" };
      }
      if (input.linkedCategoryId) {
        const c = await tx.$queryRaw<Array<{ id: string }>>`
          select id from app.categories
          where id = ${input.linkedCategoryId}::uuid and user_id = ${userId}
          limit 1
        `;
        if (!c[0]) return { ok: false, error: "linked_category_not_found" };
      }

      const rows = await tx.$queryRaw<
        Array<{
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          type: GoalType;
          status: GoalStatus;
          currency: string;
          target_amount_minor: bigint;
          current_amount_minor: bigint;
          target_date: Date | null;
          started_at: Date | null;
          completed_at: Date | null;
          linked_account_id: string | null;
          linked_category_id: string | null;
        }>
      >`
        insert into app.goals (
          user_id,
          name,
          description,
          type,
          status,
          currency,
          target_amount_minor,
          current_amount_minor,
          target_date,
          started_at,
          linked_account_id,
          linked_category_id,
          notes
        )
        values (
          ${userId},
          ${input.name},
          ${input.description ?? null},
          ${input.type}::app.goal_type,
          'active'::app.goal_status,
          ${input.currency ?? "CAD"},
          ${targetMinor},
          0,
          ${input.targetDate ?? null}::date,
          ${input.startedAt ?? null}::date,
          ${input.linkedAccountId ?? null}::uuid,
          ${input.linkedCategoryId ?? null}::uuid,
          ${input.notes ?? null}
        )
        returning
          id,
          user_id,
          name,
          description,
          type,
          status,
          currency,
          target_amount_minor,
          current_amount_minor,
          target_date,
          started_at,
          completed_at,
          linked_account_id,
          linked_category_id
      `;

      const row = rows[0];
      if (!row) return { ok: false, error: "invalid_input" };
      return { ok: true, goal: mapGoalRow(row) };
    });
  }

  async addContribution(
    userId: string,
    goalId: string,
    input: AddGoalContributionInput
  ): Promise<AddGoalContributionResult> {
    let amount: bigint;
    try {
      amount = BigInt(input.amountMinor);
    } catch {
      return { ok: false, error: "invalid_amount" };
    }
    if (amount <= 0n) {
      return { ok: false, error: "invalid_amount" };
    }

    return runInUserDbContext(userId, async (tx) => {
      const goalRows = await tx.$queryRaw<
        Array<{
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          type: GoalType;
          status: GoalStatus;
          currency: string;
          target_amount_minor: bigint;
          current_amount_minor: bigint;
          target_date: Date | null;
          started_at: Date | null;
          completed_at: Date | null;
          linked_account_id: string | null;
          linked_category_id: string | null;
          deleted_at: Date | null;
        }>
      >`
        select
          id,
          user_id,
          name,
          description,
          type,
          status,
          currency,
          target_amount_minor,
          current_amount_minor,
          target_date,
          started_at,
          completed_at,
          linked_account_id,
          linked_category_id,
          deleted_at
        from app.goals
        where id = ${goalId}::uuid
          and user_id = ${userId}
        limit 1
        for update
      `;

      const g = goalRows[0];
      if (!g || g.deleted_at !== null) {
        return { ok: false, error: "goal_not_found" };
      }
      if (!goalAcceptsManualContributions(g.status)) {
        return { ok: false, error: "goal_not_active" };
      }

      if (input.accountId) {
        const acct = await tx.$queryRaw<Array<{ id: string }>>`
          select id from app.financial_accounts
          where id = ${input.accountId}::uuid and user_id = ${userId}
          limit 1
        `;
        if (!acct[0]) return { ok: false, error: "account_not_found" };
      }

      if (input.transactionId) {
        const txRows = await tx.$queryRaw<Array<{ id: string; account_id: string }>>`
          select id, account_id from app.transactions
          where id = ${input.transactionId}::uuid and user_id = ${userId}
          limit 1
        `;
        const t = txRows[0];
        if (!t) return { ok: false, error: "transaction_not_found" };
        if (input.accountId && t.account_id !== input.accountId) {
          return { ok: false, error: "transaction_account_mismatch" };
        }
      }

      const contribRows = await tx.$queryRaw<
        Array<{
          id: string;
          user_id: string;
          goal_id: string;
          amount_minor: bigint;
          contribution_date: Date;
          source: GoalContributionSummary["source"];
          account_id: string | null;
          transaction_id: string | null;
        }>
      >`
        insert into app.goal_contributions (
          user_id,
          goal_id,
          account_id,
          transaction_id,
          amount_minor,
          contribution_date,
          source,
          notes
        )
        values (
          ${userId},
          ${goalId}::uuid,
          ${input.accountId ?? null}::uuid,
          ${input.transactionId ?? null}::uuid,
          ${amount},
          ${input.contributionDate}::date,
          'manual'::app.goal_contribution_source,
          ${input.notes ?? null}
        )
        returning id, user_id, goal_id, amount_minor, contribution_date, source, account_id, transaction_id
      `;

      const cRow = contribRows[0];
      if (!cRow) {
        return { ok: false, error: "invalid_amount" };
      }

      const updatedGoals = await tx.$queryRaw<
        Array<{
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          type: GoalType;
          status: GoalStatus;
          currency: string;
          target_amount_minor: bigint;
          current_amount_minor: bigint;
          target_date: Date | null;
          started_at: Date | null;
          completed_at: Date | null;
          linked_account_id: string | null;
          linked_category_id: string | null;
        }>
      >`
        update app.goals
        set
          current_amount_minor = current_amount_minor + ${amount},
          updated_at = now()
        where id = ${goalId}::uuid
          and user_id = ${userId}
        returning
          id,
          user_id,
          name,
          description,
          type,
          status,
          currency,
          target_amount_minor,
          current_amount_minor,
          target_date,
          started_at,
          completed_at,
          linked_account_id,
          linked_category_id
      `;

      const ug = updatedGoals[0];
      if (!ug) {
        return { ok: false, error: "goal_not_found" };
      }

      return {
        ok: true,
        contribution: mapContributionRow(cRow),
        goal: mapGoalRow(ug)
      };
    });
  }
}
