import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createTestApp } from "../../../helpers/createTestApp";
import {
  monthDateRange,
  type BudgetMonthSummary,
  type BudgetMonthsRepository
} from "../../../../src/modules/budgeting/application/budgetMonths";

const monthKey = "2026-05";
const { monthStart, monthEnd } = monthDateRange(monthKey);

const sampleSummary: BudgetMonthSummary = {
  id: "bm-2026-05",
  userId: "user-1",
  budgetId: "budget-1",
  monthKey,
  monthStart,
  monthEnd,
  readyToAssignMinor: "1200",
  leftoverFromPreviousMinor: "0",
  totalAssignedMinor: "800",
  totalActivityMinor: "-200",
  totalAvailableMinor: "5000",
  categoryMonths: [
    {
      categoryId: "cat-a",
      assignedMinor: "800",
      activityMinor: "-200",
      availableMinor: "5000",
      carryoverFromPreviousMinor: "4400"
    }
  ]
};

const fakeBudgetMonthsRepository: BudgetMonthsRepository = {
  async assertBudgetOwnedByUser(userId: string, budgetId: string) {
    return userId === "user-1" && budgetId === "budget-1";
  },
  async getMonthSummary(userId: string, budgetId: string, mk: string) {
    if (userId !== "user-1" || budgetId !== "budget-1" || mk !== monthKey) {
      return null;
    }
    return sampleSummary;
  },
  async ensureMonthOpen() {
    throw new Error("not used in month-summary test");
  }
};

const app = await createTestApp(
  { JWT_SECRET: "test-secret" },
  { budgetMonthsRepository: fakeBudgetMonthsRepository }
);

describe("GET /api/v1/budgets/:budgetId/months/:monthKey", () => {
  afterAll(async () => {
    await app.close();
  });

  it("returns 401 when missing token", async () => {
    await request(app.server).get(`/api/v1/budgets/budget-1/months/${monthKey}`).expect(401);
  });

  it("returns 400 for invalid month key", async () => {
    const token = app.jwt.sign({ sub: "user-1" });
    await request(app.server)
      .get("/api/v1/budgets/budget-1/months/bad")
      .set("authorization", `Bearer ${token}`)
      .expect(400);
  });

  it("returns 404 when month is not found", async () => {
    const token = app.jwt.sign({ sub: "user-1" });
    await request(app.server)
      .get("/api/v1/budgets/budget-1/months/2099-01")
      .set("authorization", `Bearer ${token}`)
      .expect(404);
  });

  it("returns month summary for owned budget", async () => {
    const token = app.jwt.sign({ sub: "user-1" });
    const response = await request(app.server)
      .get(`/api/v1/budgets/budget-1/months/${monthKey}`)
      .set("authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body).toEqual(sampleSummary);
  });
});
