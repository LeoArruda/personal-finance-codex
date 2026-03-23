import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createTestApp } from "../../../helpers/createTestApp";
import {
  type CreateGoalInput,
  type CreateGoalResult,
  type GoalsRepository
} from "../../../../src/modules/goals/application/goals";

const userId = "user-1";

const fakeGoalsRepository: GoalsRepository = {
  async createGoal(uid: string, input: CreateGoalInput): Promise<CreateGoalResult> {
    if (uid !== userId) {
      return { ok: false, error: "invalid_input" };
    }
    if (input.linkedAccountId && input.linkedAccountId !== "acc-1") {
      return { ok: false, error: "linked_account_not_found" };
    }
    if (input.linkedCategoryId && input.linkedCategoryId !== "cat-1") {
      return { ok: false, error: "linked_category_not_found" };
    }
    return {
      ok: true,
      goal: {
        id: "goal-1",
        userId: uid,
        name: input.name,
        description: input.description ?? null,
        type: input.type,
        status: "active",
        currency: input.currency ?? "CAD",
        targetAmountMinor: input.targetAmountMinor,
        currentAmountMinor: "0",
        targetDate: input.targetDate ?? null,
        startedAt: input.startedAt ?? null,
        completedAt: null,
        linkedAccountId: input.linkedAccountId ?? null,
        linkedCategoryId: input.linkedCategoryId ?? null
      }
    };
  },
  async addContribution() {
    return { ok: false, error: "goal_not_found" };
  }
};

const app = await createTestApp({ JWT_SECRET: "test-secret" }, { goalsRepository: fakeGoalsRepository });

describe("POST /api/v1/goals", () => {
  afterAll(async () => {
    await app.close();
  });

  it("returns 401 when missing token", async () => {
    await request(app.server)
      .post("/api/v1/goals")
      .send({
        name: "Rainy day",
        type: "emergency_fund",
        targetAmountMinor: "100000"
      })
      .expect(401);
  });

  it("returns 400 for invalid payload", async () => {
    const token = app.jwt.sign({ sub: userId });
    await request(app.server)
      .post("/api/v1/goals")
      .set("authorization", `Bearer ${token}`)
      .send({ name: "", type: "custom", targetAmountMinor: "100" })
      .expect(400);
  });

  it("returns 404 when linked account is not found for this user", async () => {
    const token = app.jwt.sign({ sub: userId });
    await request(app.server)
      .post("/api/v1/goals")
      .set("authorization", `Bearer ${token}`)
      .send({
        name: "Home",
        type: "home",
        targetAmountMinor: "250000",
        linkedAccountId: "wrong-account"
      })
      .expect(404);
  });

  it("returns 404 when linked category is not found for this user", async () => {
    const token = app.jwt.sign({ sub: userId });
    await request(app.server)
      .post("/api/v1/goals")
      .set("authorization", `Bearer ${token}`)
      .send({
        name: "Education",
        type: "education",
        targetAmountMinor: "50000",
        linkedCategoryId: "wrong-cat"
      })
      .expect(404);
  });

  it("creates a goal with 201", async () => {
    const token = app.jwt.sign({ sub: userId });
    const response = await request(app.server)
      .post("/api/v1/goals")
      .set("authorization", `Bearer ${token}`)
      .send({
        name: "Vacation 2026",
        description: "Beach",
        type: "vacation",
        targetAmountMinor: "120000",
        currency: "CAD",
        targetDate: "2026-12-31",
        linkedAccountId: "acc-1",
        linkedCategoryId: "cat-1"
      })
      .expect(201);

    expect(response.body).toMatchObject({
      id: "goal-1",
      name: "Vacation 2026",
      type: "vacation",
      status: "active",
      targetAmountMinor: "120000",
      currentAmountMinor: "0",
      linkedAccountId: "acc-1",
      linkedCategoryId: "cat-1"
    });
  });
});
