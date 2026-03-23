import { parsePositiveContributionMinor } from "../domain/addGoalContribution";

export type GoalType =
  | "emergency_fund"
  | "vacation"
  | "vehicle"
  | "home"
  | "retirement"
  | "education"
  | "custom";

export type GoalStatus = "active" | "paused" | "completed" | "cancelled";

export type GoalSummary = {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  type: GoalType;
  status: GoalStatus;
  currency: string;
  targetAmountMinor: string;
  currentAmountMinor: string;
  targetDate: string | null;
  startedAt: string | null;
  completedAt: string | null;
  linkedAccountId: string | null;
  linkedCategoryId: string | null;
};

export type CreateGoalInput = {
  name: string;
  description?: string;
  type: GoalType;
  targetAmountMinor: string;
  currency?: string;
  targetDate?: string;
  startedAt?: string;
  linkedAccountId?: string;
  linkedCategoryId?: string;
  notes?: string;
};

export type CreateGoalResult =
  | { ok: true; goal: GoalSummary }
  | { ok: false; error: "invalid_input" | "linked_account_not_found" | "linked_category_not_found" };

export type GoalContributionSummary = {
  id: string;
  userId: string;
  goalId: string;
  amountMinor: string;
  contributionDate: string;
  source: "manual" | "automatic" | "transaction_match";
  accountId: string | null;
  transactionId: string | null;
};

export type AddGoalContributionInput = {
  amountMinor: string;
  contributionDate: string;
  accountId?: string;
  transactionId?: string;
  notes?: string;
};

export type AddGoalContributionResult =
  | { ok: true; contribution: GoalContributionSummary; goal: GoalSummary }
  | {
      ok: false;
      error:
        | "goal_not_found"
        | "goal_not_active"
        | "invalid_amount"
        | "account_not_found"
        | "transaction_not_found"
        | "transaction_account_mismatch";
    };

export interface GoalsRepository {
  createGoal(userId: string, input: CreateGoalInput): Promise<CreateGoalResult>;
  addContribution(
    userId: string,
    goalId: string,
    input: AddGoalContributionInput
  ): Promise<AddGoalContributionResult>;
}

export async function createGoal(
  repository: GoalsRepository,
  userId: string,
  input: CreateGoalInput
): Promise<CreateGoalResult> {
  return repository.createGoal(userId, input);
}

export async function addGoalContribution(
  repository: GoalsRepository,
  userId: string,
  goalId: string,
  input: AddGoalContributionInput
): Promise<AddGoalContributionResult> {
  const amount = parsePositiveContributionMinor(input.amountMinor);
  if (amount === null) {
    return { ok: false, error: "invalid_amount" };
  }
  return repository.addContribution(userId, goalId, {
    ...input,
    amountMinor: amount.toString()
  });
}
