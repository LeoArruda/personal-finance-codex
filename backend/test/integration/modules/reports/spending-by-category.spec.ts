import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createTestApp } from "../../../helpers/createTestApp";
import {
  type CashflowReport,
  type NetWorthReport,
  type ReportsRepository,
  type SpendingByCategoryReport
} from "../../../../src/modules/reports/application/reports";

const userId = "user-1";

/** Fixture-aligned expense rollup (posted expenses, visible accounts) */
const fixtureSpendingByCategory = [
  { categoryId: "cat-groceries", categoryName: "Groceries", totalSpentMinor: "45000" },
  { categoryId: "cat-utilities", categoryName: "Utilities", totalSpentMinor: "12000" },
  { categoryId: null, categoryName: "Uncategorized", totalSpentMinor: "3500" }
];

const fakeReportsRepository: ReportsRepository = {
  async getNetWorthSeries(_uid: string, fromMonth: string, toMonth: string): Promise<NetWorthReport> {
    return { from: fromMonth, to: toMonth, points: [] };
  },
  async getCashflowSeries(_uid: string, fromMonth: string, toMonth: string): Promise<CashflowReport> {
    return { from: fromMonth, to: toMonth, points: [] };
  },
  async getSpendingByCategory(
    uid: string,
    fromMonth: string,
    toMonth: string
  ): Promise<SpendingByCategoryReport> {
    if (uid !== userId) {
      return { from: fromMonth, to: toMonth, currency: "CAD", byCategory: [] };
    }
    return {
      from: fromMonth,
      to: toMonth,
      currency: "CAD",
      byCategory: fixtureSpendingByCategory
    };
  }
};

const app = await createTestApp({ JWT_SECRET: "test-secret" }, { reportsRepository: fakeReportsRepository });

describe("GET /api/v1/reports/spending-by-category", () => {
  afterAll(async () => {
    await app.close();
  });

  it("returns 401 when missing token", async () => {
    await request(app.server)
      .get("/api/v1/reports/spending-by-category?from=2026-01&to=2026-01")
      .expect(401);
  });

  it("returns 400 when range is invalid", async () => {
    const token = app.jwt.sign({ sub: userId });
    await request(app.server)
      .get("/api/v1/reports/spending-by-category?from=2026-02&to=2026-01")
      .set("authorization", `Bearer ${token}`)
      .expect(400);
  });

  it("returns spending totals by category reconciled with fixture transaction rollups", async () => {
    const token = app.jwt.sign({ sub: userId });
    const response = await request(app.server)
      .get("/api/v1/reports/spending-by-category?from=2026-01&to=2026-01")
      .set("authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body).toMatchObject({
      from: "2026-01",
      to: "2026-01",
      currency: "CAD",
      byCategory: fixtureSpendingByCategory
    });

    const sum = fixtureSpendingByCategory.reduce((acc, row) => acc + BigInt(row.totalSpentMinor), 0n);
    const responseSum = response.body.byCategory.reduce(
      (acc: bigint, row: { totalSpentMinor: string }) => acc + BigInt(row.totalSpentMinor),
      0n
    );
    expect(responseSum).toBe(sum);
  });
});
