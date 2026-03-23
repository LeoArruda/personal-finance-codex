import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createTestApp } from "../../../helpers/createTestApp";
import {
  type DashboardRepository,
  type DashboardSummary
} from "../../../../src/modules/dashboard/application/dashboard";

const userId = "user-1";

const fixtureSummary: DashboardSummary = {
  monthKey: "2026-03",
  budgetId: "bud-1",
  budgetCurrency: "CAD",
  budgetMonth: {
    monthKey: "2026-03",
    readyToAssignMinor: "50000",
    totalAssignedMinor: "200000",
    totalActivityMinor: "120000",
    totalAvailableMinor: "90000"
  },
  upcomingBills: [
    {
      id: "bill-1",
      payeeName: "Electric",
      amountMinor: "9900",
      currency: "CAD",
      dueDate: "2026-03-20",
      status: "pending"
    }
  ],
  activeGoals: [
    {
      id: "goal-1",
      name: "Emergency",
      type: "emergency_fund",
      status: "active",
      targetAmountMinor: "1000000",
      currentAmountMinor: "250000",
      currency: "CAD"
    }
  ],
  topSpendingCategories: [
    { categoryId: "c1", categoryName: "Groceries", totalSpentMinor: "45000" }
  ]
};

const fakeDashboardRepository: DashboardRepository = {
  async getSummary(uid: string, monthKey: string): Promise<DashboardSummary> {
    if (uid !== userId) {
      return {
        monthKey,
        budgetId: null,
        budgetCurrency: null,
        budgetMonth: null,
        upcomingBills: [],
        activeGoals: [],
        topSpendingCategories: []
      };
    }
    return { ...fixtureSummary, monthKey };
  }
};

const app = await createTestApp({ JWT_SECRET: "test-secret" }, { dashboardRepository: fakeDashboardRepository });

describe("GET /api/v1/dashboard/summary", () => {
  afterAll(async () => {
    await app.close();
  });

  it("returns 401 without token", async () => {
    await request(app.server).get("/api/v1/dashboard/summary").expect(401);
  });

  it("returns 400 for invalid month query", async () => {
    const token = app.jwt.sign({ sub: userId });
    await request(app.server)
      .get("/api/v1/dashboard/summary?month=bad")
      .set("authorization", `Bearer ${token}`)
      .expect(400);
  });

  it("returns composed read-only summary for the caller", async () => {
    const token = app.jwt.sign({ sub: userId });
    const res = await request(app.server)
      .get("/api/v1/dashboard/summary?month=2026-03")
      .set("authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body).toEqual(fixtureSummary);
  });

  it("returns empty slices for a different user", async () => {
    const token = app.jwt.sign({ sub: "user-2" });
    const res = await request(app.server)
      .get("/api/v1/dashboard/summary?month=2026-03")
      .set("authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.upcomingBills).toEqual([]);
    expect(res.body.activeGoals).toEqual([]);
  });
});
