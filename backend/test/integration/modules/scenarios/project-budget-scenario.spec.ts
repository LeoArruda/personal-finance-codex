import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createTestApp } from "../../../helpers/createTestApp";
import { type BudgetMonthSummary, type BudgetMonthsRepository } from "../../../../src/modules/budgeting/application/budgetMonths";

const userId = "user-1";

const monthFixture: BudgetMonthSummary = {
  id: "bm-1",
  userId,
  budgetId: "bud-1",
  monthKey: "2026-03",
  monthStart: "2026-03-01",
  monthEnd: "2026-03-31",
  readyToAssignMinor: "10000",
  leftoverFromPreviousMinor: "0",
  totalAssignedMinor: "50000",
  totalActivityMinor: "20000",
  totalAvailableMinor: "40000",
  categoryMonths: [
    {
      categoryId: "cat-a",
      assignedMinor: "30000",
      activityMinor: "10000",
      availableMinor: "25000",
      carryoverFromPreviousMinor: "5000"
    },
    {
      categoryId: "cat-b",
      assignedMinor: "20000",
      activityMinor: "10000",
      availableMinor: "15000",
      carryoverFromPreviousMinor: "5000"
    }
  ]
};

const fakeBudgetMonthsRepository: BudgetMonthsRepository = {
  async assertBudgetOwnedByUser() {
    return true;
  },
  async ensureMonthOpen() {
    return null;
  },
  async getMonthSummary(uid: string, budgetId: string, monthKey: string) {
    if (uid !== userId || budgetId !== "bud-1" || monthKey !== "2026-03") return null;
    return monthFixture;
  }
};

const app = await createTestApp(
  { JWT_SECRET: "test-secret" },
  { budgetMonthsRepository: fakeBudgetMonthsRepository }
);

describe("POST /api/v1/scenarios/budget-month/preview", () => {
  afterAll(async () => {
    await app.close();
  });

  it("returns 401 without token", async () => {
    await request(app.server)
      .post("/api/v1/scenarios/budget-month/preview")
      .send({
        budgetId: "bud-1",
        monthKey: "2026-03",
        additionalAssignments: []
      })
      .expect(401);
  });

  it("returns 404 when budget month missing", async () => {
    const token = app.jwt.sign({ sub: userId });
    await request(app.server)
      .post("/api/v1/scenarios/budget-month/preview")
      .set("authorization", `Bearer ${token}`)
      .send({
        budgetId: "bud-1",
        monthKey: "2099-01",
        additionalAssignments: [{ categoryId: "cat-a", amountMinor: "1000" }]
      })
      .expect(404);
  });

  it("projects additional assignments without persisting (fixture RTA decreases)", async () => {
    const token = app.jwt.sign({ sub: userId });
    const res = await request(app.server)
      .post("/api/v1/scenarios/budget-month/preview")
      .set("authorization", `Bearer ${token}`)
      .send({
        budgetId: "bud-1",
        monthKey: "2026-03",
        additionalAssignments: [{ categoryId: "cat-a", amountMinor: "4000" }]
      })
      .expect(200);

    expect(res.body.projectedReadyToAssignMinor).toBe("6000");
    const catA = res.body.categoryMonths.find((c: { categoryId: string }) => c.categoryId === "cat-a");
    expect(catA.assignedMinor).toBe("34000");
    expect(catA.availableMinor).toBe("29000");
  });

  it("returns 400 when assignments exceed RTA", async () => {
    const token = app.jwt.sign({ sub: userId });
    await request(app.server)
      .post("/api/v1/scenarios/budget-month/preview")
      .set("authorization", `Bearer ${token}`)
      .send({
        budgetId: "bud-1",
        monthKey: "2026-03",
        additionalAssignments: [{ categoryId: "cat-a", amountMinor: "999999" }]
      })
      .expect(400);
  });
});
