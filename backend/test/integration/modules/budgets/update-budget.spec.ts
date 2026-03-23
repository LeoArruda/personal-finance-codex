import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createTestApp } from "../../../helpers/createTestApp";
import {
  type BudgetSummary,
  type BudgetsRepository
} from "../../../../src/modules/budgets/application/budgets";

const budgets = new Map<string, BudgetSummary>([
  [
    "budget-1",
    {
      id: "budget-1",
      userId: "user-1",
      name: "Personal",
      currency: "CAD",
      isDefault: true,
      status: "active"
    }
  ],
  [
    "budget-2",
    {
      id: "budget-2",
      userId: "user-2",
      name: "Family",
      currency: "USD",
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
    throw new Error("not implemented in update-budget test");
  },
  async updateForUser(userId, budgetId, input) {
    const current = budgets.get(budgetId);
    if (!current || current.userId !== userId) return null;

    const updated: BudgetSummary = {
      ...current,
      name: input.name ?? current.name,
      currency: input.currency ?? current.currency,
      status: input.status ?? current.status
    };
    budgets.set(budgetId, updated);
    return updated;
  },
  async setDefaultForUser() {
    throw new Error("not implemented in update-budget test");
  }
};

const app = await createTestApp(
  { JWT_SECRET: "test-secret" },
  { budgetsRepository: fakeBudgetsRepository }
);

describe("PATCH /api/v1/budgets/:budgetId", () => {
  afterAll(async () => {
    await app.close();
  });

  it("returns 401 when missing token", async () => {
    await request(app.server).patch("/api/v1/budgets/budget-1").send({ name: "Updated" }).expect(401);
  });

  it("returns 400 for invalid payload", async () => {
    const token = app.jwt.sign({ sub: "user-1" });
    await request(app.server)
      .patch("/api/v1/budgets/budget-1")
      .set("authorization", `Bearer ${token}`)
      .send({ name: "" })
      .expect(400);
  });

  it("returns 404 for cross-user budget updates", async () => {
    const token = app.jwt.sign({ sub: "user-1" });
    await request(app.server)
      .patch("/api/v1/budgets/budget-2")
      .set("authorization", `Bearer ${token}`)
      .send({ name: "Should Fail" })
      .expect(404);
  });

  it("updates budget fields for owner", async () => {
    const token = app.jwt.sign({ sub: "user-1" });
    const response = await request(app.server)
      .patch("/api/v1/budgets/budget-1")
      .set("authorization", `Bearer ${token}`)
      .send({ name: "Personal Updated", currency: "USD", status: "archived" })
      .expect(200);

    expect(response.body).toEqual({
      id: "budget-1",
      userId: "user-1",
      name: "Personal Updated",
      currency: "USD",
      isDefault: true,
      status: "archived"
    });
  });
});

