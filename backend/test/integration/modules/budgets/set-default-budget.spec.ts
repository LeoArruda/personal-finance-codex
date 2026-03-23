import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createTestApp } from "../../../helpers/createTestApp";
import {
  type BudgetSummary,
  type BudgetsRepository
} from "../../../../src/modules/budgets/application/budgets";

const budgets = new Map<string, BudgetSummary>([
  [
    "budget-a",
    {
      id: "budget-a",
      userId: "user-1",
      name: "Personal",
      currency: "CAD",
      isDefault: true,
      status: "active"
    }
  ],
  [
    "budget-b",
    {
      id: "budget-b",
      userId: "user-1",
      name: "Travel",
      currency: "CAD",
      isDefault: false,
      status: "active"
    }
  ]
]);

const fakeBudgetsRepository: BudgetsRepository = {
  async listByUser(userId) {
    return [...budgets.values()].filter((budget) => budget.userId === userId);
  },
  async createForUser() {
    throw new Error("not implemented in set-default-budget test");
  },
  async updateForUser() {
    throw new Error("not implemented in set-default-budget test");
  },
  async setDefaultForUser(userId, budgetId) {
    const target = budgets.get(budgetId);
    if (!target || target.userId !== userId) return null;

    for (const [id, budget] of budgets.entries()) {
      if (budget.userId === userId) {
        budgets.set(id, { ...budget, isDefault: id === budgetId });
      }
    }

    return budgets.get(budgetId)!;
  }
};

const app = await createTestApp(
  { JWT_SECRET: "test-secret" },
  { budgetsRepository: fakeBudgetsRepository }
);

describe("POST /api/v1/budgets/:budgetId/set-default", () => {
  afterAll(async () => {
    await app.close();
  });

  it("returns 401 when missing token", async () => {
    await request(app.server).post("/api/v1/budgets/budget-b/set-default").expect(401);
  });

  it("sets exactly one default budget for the user", async () => {
    const token = app.jwt.sign({ sub: "user-1" });

    const response = await request(app.server)
      .post("/api/v1/budgets/budget-b/set-default")
      .set("authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body).toEqual({
      id: "budget-b",
      userId: "user-1",
      name: "Travel",
      currency: "CAD",
      isDefault: true,
      status: "active"
    });

    const list = await request(app.server)
      .get("/api/v1/budgets")
      .set("authorization", `Bearer ${token}`)
      .expect(200);

    const defaults = list.body.filter((budget: BudgetSummary) => budget.isDefault);
    expect(defaults).toHaveLength(1);
    expect(defaults[0].id).toBe("budget-b");
  });
});

