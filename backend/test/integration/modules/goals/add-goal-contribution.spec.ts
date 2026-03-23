import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createTestApp } from "../../../helpers/createTestApp";
import {
  type AddGoalContributionInput,
  type AddGoalContributionResult,
  type CreateGoalResult,
  type GoalContributionSummary,
  type GoalSummary,
  type GoalsRepository
} from "../../../../src/modules/goals/application/goals";

const userId = "user-1";

const baseGoal: GoalSummary = {
  id: "goal-1",
  userId,
  name: "Savings",
  description: null,
  type: "custom",
  status: "active",
  currency: "CAD",
  targetAmountMinor: "100000",
  currentAmountMinor: "0",
  targetDate: null,
  startedAt: null,
  completedAt: null,
  linkedAccountId: null,
  linkedCategoryId: null
};

let currentAmountMinor = "0";
let contributionSeq = 0;

const fakeGoalsRepository: GoalsRepository = {
  async createGoal(): Promise<CreateGoalResult> {
    return { ok: false, error: "invalid_input" };
  },
  async addContribution(
    uid: string,
    goalId: string,
    input: AddGoalContributionInput
  ): Promise<AddGoalContributionResult> {
    if (uid !== userId) {
      return { ok: false, error: "goal_not_found" };
    }
    if (goalId === "00000000-0000-0000-0000-00000000dead") {
      return { ok: false, error: "goal_not_found" };
    }
    if (goalId === "00000000-0000-0000-0000-00000000beef") {
      return { ok: false, error: "goal_not_active" };
    }
    if (input.accountId && input.accountId !== "acc-1" && input.accountId !== "acc-2") {
      return { ok: false, error: "account_not_found" };
    }
    if (input.transactionId) {
      const transactionAccount: Record<string, string> = {
        "tx-1": "acc-1",
        "tx-2": "acc-2"
      };
      const accountForTx = transactionAccount[input.transactionId];
      if (!accountForTx) {
        return { ok: false, error: "transaction_not_found" };
      }
      if (input.accountId && input.accountId !== accountForTx) {
        return { ok: false, error: "transaction_account_mismatch" };
      }
    }
    if (goalId !== "goal-1") {
      return { ok: false, error: "goal_not_found" };
    }

    const delta = BigInt(input.amountMinor);
    currentAmountMinor = (BigInt(currentAmountMinor) + delta).toString();
    contributionSeq += 1;

    const contribution: GoalContributionSummary = {
      id: `contrib-${contributionSeq}`,
      userId: uid,
      goalId: "goal-1",
      amountMinor: input.amountMinor,
      contributionDate: input.contributionDate,
      source: "manual",
      accountId: input.accountId ?? null,
      transactionId: input.transactionId ?? null
    };

    return {
      ok: true,
      contribution,
      goal: {
        ...baseGoal,
        currentAmountMinor
      }
    };
  }
};

const app = await createTestApp({ JWT_SECRET: "test-secret" }, { goalsRepository: fakeGoalsRepository });

describe("POST /api/v1/goals/:goalId/contributions", () => {
  afterAll(async () => {
    await app.close();
  });

  it("returns 401 when missing token", async () => {
    await request(app.server)
      .post("/api/v1/goals/goal-1/contributions")
      .send({ amountMinor: "1000", contributionDate: "2026-03-15" })
      .expect(401);
  });

  it("returns 400 for invalid payload", async () => {
    const token = app.jwt.sign({ sub: userId });
    await request(app.server)
      .post("/api/v1/goals/goal-1/contributions")
      .set("authorization", `Bearer ${token}`)
      .send({ amountMinor: "0", contributionDate: "2026-03-15" })
      .expect(400);
  });

  it("returns 404 when goal is not found", async () => {
    const token = app.jwt.sign({ sub: userId });
    await request(app.server)
      .post("/api/v1/goals/00000000-0000-0000-0000-00000000dead/contributions")
      .set("authorization", `Bearer ${token}`)
      .send({ amountMinor: "500", contributionDate: "2026-03-15" })
      .expect(404);
  });

  it("returns 409 when goal does not accept contributions", async () => {
    const token = app.jwt.sign({ sub: userId });
    await request(app.server)
      .post("/api/v1/goals/00000000-0000-0000-0000-00000000beef/contributions")
      .set("authorization", `Bearer ${token}`)
      .send({ amountMinor: "500", contributionDate: "2026-03-15" })
      .expect(409);
  });

  it("returns 404 when account is not found", async () => {
    const token = app.jwt.sign({ sub: userId });
    await request(app.server)
      .post("/api/v1/goals/goal-1/contributions")
      .set("authorization", `Bearer ${token}`)
      .send({
        amountMinor: "100",
        contributionDate: "2026-03-15",
        accountId: "wrong-acc"
      })
      .expect(404);
  });

  it("returns 404 when transaction is not found", async () => {
    const token = app.jwt.sign({ sub: userId });
    await request(app.server)
      .post("/api/v1/goals/goal-1/contributions")
      .set("authorization", `Bearer ${token}`)
      .send({
        amountMinor: "100",
        contributionDate: "2026-03-15",
        transactionId: "wrong-tx"
      })
      .expect(404);
  });

  it("returns 400 when transaction and account do not match", async () => {
    const token = app.jwt.sign({ sub: userId });
    await request(app.server)
      .post("/api/v1/goals/goal-1/contributions")
      .set("authorization", `Bearer ${token}`)
      .send({
        amountMinor: "100",
        contributionDate: "2026-03-15",
        transactionId: "tx-1",
        accountId: "acc-2"
      })
      .expect(400);
  });

  it("adds a contribution with 201", async () => {
    const token = app.jwt.sign({ sub: userId });
    const response = await request(app.server)
      .post("/api/v1/goals/goal-1/contributions")
      .set("authorization", `Bearer ${token}`)
      .send({
        amountMinor: "7500",
        contributionDate: "2026-03-18",
        accountId: "acc-1",
        transactionId: "tx-1",
        notes: "Payday"
      })
      .expect(201);

    expect(response.body).toMatchObject({
      contribution: {
        amountMinor: "7500",
        contributionDate: "2026-03-18",
        source: "manual",
        accountId: "acc-1",
        transactionId: "tx-1"
      },
      goal: {
        id: "goal-1",
        currentAmountMinor: "7500"
      }
    });
  });
});
