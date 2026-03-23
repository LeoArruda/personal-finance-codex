import { describe, expect, it, vi } from "vitest";
import {
  addGoalContribution,
  type GoalContributionSummary,
  type GoalSummary,
  type GoalsRepository
} from "../../../../../src/modules/goals/application/goals";

const baseGoal: GoalSummary = {
  id: "goal-1",
  userId: "user-1",
  name: "Trip",
  description: null,
  type: "vacation",
  status: "active",
  currency: "CAD",
  targetAmountMinor: "500000",
  currentAmountMinor: "1000",
  targetDate: null,
  startedAt: null,
  completedAt: null,
  linkedAccountId: null,
  linkedCategoryId: null
};

const sampleContribution: GoalContributionSummary = {
  id: "contrib-1",
  userId: "user-1",
  goalId: "goal-1",
  amountMinor: "2500",
  contributionDate: "2026-03-01",
  source: "manual",
  accountId: null,
  transactionId: null
};

describe("addGoalContribution (application)", () => {
  it("returns invalid_amount without calling the repository when amount is not positive", async () => {
    const addContribution = vi.fn<GoalsRepository["addContribution"]>();
    const repository: GoalsRepository = {
      async createGoal() {
        throw new Error("unexpected createGoal");
      },
      addContribution
    };

    const outcome = await addGoalContribution(repository, "user-1", "goal-1", {
      amountMinor: "0",
      contributionDate: "2026-03-01"
    });

    expect(outcome).toEqual({ ok: false, error: "invalid_amount" });
    expect(addContribution).not.toHaveBeenCalled();
  });

  it("delegates to the repository with a normalized positive amount string", async () => {
    const addContribution = vi.fn<GoalsRepository["addContribution"]>().mockResolvedValue({
      ok: true,
      contribution: sampleContribution,
      goal: baseGoal
    });

    const repository: GoalsRepository = {
      async createGoal() {
        throw new Error("unexpected createGoal");
      },
      addContribution
    };

    const outcome = await addGoalContribution(repository, "user-1", "goal-1", {
      amountMinor: "002500",
      contributionDate: "2026-03-01",
      notes: "top-up"
    });

    expect(outcome.ok).toBe(true);
    expect(addContribution).toHaveBeenCalledWith("user-1", "goal-1", {
      amountMinor: "2500",
      contributionDate: "2026-03-01",
      notes: "top-up"
    });
  });
});
