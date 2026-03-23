import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createTestApp } from "../../../helpers/createTestApp";
import {
  type CashRunwaySourceData,
  type ProjectionsRepository
} from "../../../../src/modules/projections/application/projections";

const userId = "user-1";

const fakeProjectionsRepository: ProjectionsRepository = {
  async getCashRunwaySourceData(uid, params) {
    if (uid !== userId) {
      const empty: CashRunwaySourceData = {
        accounts: [],
        trailingExpenseTotalMinor: "0",
        expenseTotalsByCategoryId: {},
        categoryEnvelopes: [],
        budgetId: null,
        primaryCurrency: null
      };
      return empty;
    }
    return {
      accounts: [
        {
          accountId: "acc-1",
          name: "Checking",
          kind: "checking",
          currency: "CAD",
          balanceMinor: "280000"
        }
      ],
      trailingExpenseTotalMinor: "70000",
      expenseTotalsByCategoryId: { "cat-grocery": "35000" },
      categoryEnvelopes: [
        {
          categoryId: "cat-grocery",
          categoryName: "Groceries",
          availableMinor: "14000"
        }
      ],
      budgetId: "budget-1",
      primaryCurrency: "CAD"
    };
  }
};

const app = await createTestApp(
  { JWT_SECRET: "test-secret" },
  { projectionsRepository: fakeProjectionsRepository }
);

describe("GET /api/v1/projections/cash-runway", () => {
  afterAll(async () => {
    await app.close();
  });

  it("returns 401 without auth", async () => {
    await request(app.server).get("/api/v1/projections/cash-runway").expect(401);
  });

  it("returns 400 for invalid month query", async () => {
    const token = app.jwt.sign({ sub: userId });
    await request(app.server)
      .get("/api/v1/projections/cash-runway")
      .query({ month: "2025-13" })
      .set("authorization", `Bearer ${token}`)
      .expect(400);
  });

  it("returns read-only projection with assumptions and aggregates", async () => {
    const token = app.jwt.sign({ sub: userId });
    const res = await request(app.server)
      .get("/api/v1/projections/cash-runway")
      .query({ month: "2025-03", asOf: "2025-03-18", trailingWeeks: 4 })
      .set("authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.assumptions).toMatchObject({
      trailingWeeks: 4,
      asOfDate: "2025-03-18",
      envelopeMonthKey: "2025-03",
      primaryCurrency: "CAD",
      calendarDayCount: 28
    });
    expect(res.body.aggregate).toMatchObject({
      totalCashLikeBalanceMinor: "280000",
      trailingExpenseTotalMinor: "70000",
      averageDailyOutflowMinor: "2500",
      runwayInterpretation: "finite"
    });
    expect(res.body.aggregate.runwayDays).toBe(112);
    expect(res.body.cashAccounts).toHaveLength(1);
    expect(res.body.envelopeCoverage).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          categoryId: "cat-grocery",
          categoryName: "Groceries",
          availableMinor: "14000",
          interpretation: "finite"
        })
      ])
    );
  });
});
