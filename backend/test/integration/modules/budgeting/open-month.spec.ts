import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createTestApp } from "../../../helpers/createTestApp";
import {
  monthDateRange,
  previousMonthKey,
  type BudgetMonthSummary,
  type BudgetMonthsRepository
} from "../../../../src/modules/budgeting/application/budgetMonths";

const summaries = new Map<string, BudgetMonthSummary>();

function compositeKey(budgetId: string, monthKey: string) {
  return `${budgetId}|${monthKey}`;
}

const fakeBudgetMonthsRepository: BudgetMonthsRepository = {
  async assertBudgetOwnedByUser(userId: string, budgetId: string) {
    return userId === "user-1" && budgetId === "budget-1";
  },
  async getMonthSummary(userId: string, budgetId: string, monthKey: string) {
    if (userId !== "user-1" || budgetId !== "budget-1") return null;
    return summaries.get(compositeKey(budgetId, monthKey)) ?? null;
  },
  async ensureMonthOpen(userId: string, budgetId: string, monthKey: string) {
    if (userId !== "user-1" || budgetId !== "budget-1") return null;
    const k = compositeKey(budgetId, monthKey);
    const existing = summaries.get(k);
    if (existing) return existing;

    const prevKey = previousMonthKey(monthKey);
    const prev = summaries.get(compositeKey(budgetId, prevKey));
    const rta = prev?.readyToAssignMinor ?? "0";

    const categoryIds = ["cat-1", "cat-2"];
    const categoryMonths = categoryIds.map((categoryId) => {
      const prevCm = prev?.categoryMonths.find((c) => c.categoryId === categoryId);
      const carry = prevCm?.availableMinor ?? "0";
      return {
        categoryId,
        assignedMinor: "0",
        activityMinor: "0",
        availableMinor: carry,
        carryoverFromPreviousMinor: carry
      };
    });
    const totalAvail = categoryMonths
      .reduce((acc, c) => acc + BigInt(c.availableMinor), 0n)
      .toString();

    const { monthStart, monthEnd } = monthDateRange(monthKey);
    const summary: BudgetMonthSummary = {
      id: `bm-${monthKey}`,
      userId,
      budgetId,
      monthKey,
      monthStart,
      monthEnd,
      readyToAssignMinor: rta,
      leftoverFromPreviousMinor: rta,
      totalAssignedMinor: "0",
      totalActivityMinor: "0",
      totalAvailableMinor: totalAvail,
      categoryMonths
    };
    summaries.set(k, summary);
    return summary;
  }
};

const app = await createTestApp(
  { JWT_SECRET: "test-secret" },
  { budgetMonthsRepository: fakeBudgetMonthsRepository }
);

describe("POST /api/v1/budgets/:budgetId/months/open", () => {
  afterAll(async () => {
    await app.close();
  });

  it("returns 401 when missing token", async () => {
    await request(app.server)
      .post("/api/v1/budgets/budget-1/months/open")
      .send({ monthKey: "2026-03" })
      .expect(401);
  });

  it("returns 400 for invalid month key", async () => {
    const token = app.jwt.sign({ sub: "user-1" });
    await request(app.server)
      .post("/api/v1/budgets/budget-1/months/open")
      .set("authorization", `Bearer ${token}`)
      .send({ monthKey: "2026-13" })
      .expect(400);
  });

  it("returns 404 when budget is not owned", async () => {
    const token = app.jwt.sign({ sub: "user-1" });
    await request(app.server)
      .post("/api/v1/budgets/budget-2/months/open")
      .set("authorization", `Bearer ${token}`)
      .send({ monthKey: "2026-03" })
      .expect(404);
  });

  it("opens a month with expected initial state", async () => {
    summaries.clear();
    const token = app.jwt.sign({ sub: "user-1" });
    const response = await request(app.server)
      .post("/api/v1/budgets/budget-1/months/open")
      .set("authorization", `Bearer ${token}`)
      .send({ monthKey: "2026-01" })
      .expect(201);

    expect(response.body).toMatchObject({
      id: "bm-2026-01",
      budgetId: "budget-1",
      monthKey: "2026-01",
      readyToAssignMinor: "0",
      leftoverFromPreviousMinor: "0",
      totalAssignedMinor: "0",
      totalActivityMinor: "0",
      totalAvailableMinor: "0",
      categoryMonths: [
        expect.objectContaining({
          categoryId: "cat-1",
          availableMinor: "0",
          carryoverFromPreviousMinor: "0"
        }),
        expect.objectContaining({
          categoryId: "cat-2",
          availableMinor: "0",
          carryoverFromPreviousMinor: "0"
        })
      ]
    });
    expect(response.body.monthStart).toBe(monthDateRange("2026-01").monthStart);
    expect(response.body.monthEnd).toBe(monthDateRange("2026-01").monthEnd);
  });

  it("is idempotent when opening the same month again", async () => {
    summaries.clear();
    const token = app.jwt.sign({ sub: "user-1" });
    const first = await request(app.server)
      .post("/api/v1/budgets/budget-1/months/open")
      .set("authorization", `Bearer ${token}`)
      .send({ monthKey: "2026-04" })
      .expect(201);

    const second = await request(app.server)
      .post("/api/v1/budgets/budget-1/months/open")
      .set("authorization", `Bearer ${token}`)
      .send({ monthKey: "2026-04" })
      .expect(201);

    expect(second.body).toEqual(first.body);
  });

  it("applies carryover from previous month RTA and category availability", async () => {
    summaries.clear();
    const febKey = "2026-02";
    const { monthStart: febStart, monthEnd: febEnd } = monthDateRange(febKey);
    summaries.set(compositeKey("budget-1", febKey), {
      id: "bm-2026-02",
      userId: "user-1",
      budgetId: "budget-1",
      monthKey: febKey,
      monthStart: febStart,
      monthEnd: febEnd,
      readyToAssignMinor: "5000",
      leftoverFromPreviousMinor: "0",
      totalAssignedMinor: "0",
      totalActivityMinor: "0",
      totalAvailableMinor: "2000",
      categoryMonths: [
        {
          categoryId: "cat-1",
          assignedMinor: "0",
          activityMinor: "0",
          availableMinor: "2000",
          carryoverFromPreviousMinor: "0"
        },
        {
          categoryId: "cat-2",
          assignedMinor: "0",
          activityMinor: "0",
          availableMinor: "0",
          carryoverFromPreviousMinor: "0"
        }
      ]
    });

    const token = app.jwt.sign({ sub: "user-1" });
    const response = await request(app.server)
      .post("/api/v1/budgets/budget-1/months/open")
      .set("authorization", `Bearer ${token}`)
      .send({ monthKey: "2026-03" })
      .expect(201);

    expect(response.body.readyToAssignMinor).toBe("5000");
    expect(response.body.leftoverFromPreviousMinor).toBe("5000");
    expect(response.body.totalAvailableMinor).toBe("2000");

    const cat1 = response.body.categoryMonths.find((c: { categoryId: string }) => c.categoryId === "cat-1");
    expect(cat1).toMatchObject({
      availableMinor: "2000",
      carryoverFromPreviousMinor: "2000"
    });
  });
});
