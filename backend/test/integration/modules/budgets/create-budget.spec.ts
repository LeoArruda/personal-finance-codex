import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createTestApp } from "../../../helpers/createTestApp";
import {
  type BudgetSummary,
  type BudgetsRepository
} from "../../../../src/modules/budgets/application/budgets";

const createdBudgets: BudgetSummary[] = [];

const fakeBudgetsRepository: BudgetsRepository = {
  async listByUser(userId: string) {
    return createdBudgets.filter((budget) => budget.userId === userId);
  },
  async createForUser(userId, input) {
    const created: BudgetSummary = {
      id: `budget-${createdBudgets.length + 1}`,
      userId,
      name: input.name,
      currency: input.currency ?? "CAD",
      isDefault: input.isDefault ?? false,
      status: "active"
    };

    createdBudgets.push(created);
    return created;
  },
  async updateForUser() {
    throw new Error("not implemented in create-budget test");
  },
  async setDefaultForUser() {
    throw new Error("not implemented in create-budget test");
  }
};

const app = await createTestApp(
  { JWT_SECRET: "test-secret" },
  { budgetsRepository: fakeBudgetsRepository }
);

describe("POST /api/v1/budgets", () => {
  afterAll(async () => {
    await app.close();
  });

  it("returns 401 when missing token", async () => {
    await request(app.server)
      .post("/api/v1/budgets")
      .send({ name: "New Budget" })
      .expect(401);
  });

  it("returns 400 for invalid payload", async () => {
    const token = app.jwt.sign({ sub: "user-1" });
    await request(app.server)
      .post("/api/v1/budgets")
      .set("authorization", `Bearer ${token}`)
      .send({ name: "" })
      .expect(400);
  });

  it("creates a budget with caller user id", async () => {
    const token = app.jwt.sign({ sub: "user-1" });
    const response = await request(app.server)
      .post("/api/v1/budgets")
      .set("authorization", `Bearer ${token}`)
      .send({
        name: "Travel Budget",
        currency: "USD",
        isDefault: false
      })
      .expect(201);

    expect(response.body).toEqual({
      id: "budget-1",
      userId: "user-1",
      name: "Travel Budget",
      currency: "USD",
      isDefault: false,
      status: "active"
    });
  });
});

