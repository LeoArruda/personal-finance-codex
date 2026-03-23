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

/** Fixture-aligned monthly aggregates from monthly_account_snapshots (inflows / outflows) */
const fixtureCashflowPoints = [
  {
    month: "2026-01",
    totalInflowsMinor: "900000",
    totalOutflowsMinor: "720000",
    netCashflowMinor: "180000"
  },
  {
    month: "2026-02",
    totalInflowsMinor: "905000",
    totalOutflowsMinor: "710000",
    netCashflowMinor: "195000"
  }
];

const fakeReportsRepository: ReportsRepository = {
  async getNetWorthSeries(_uid: string, fromMonth: string, toMonth: string): Promise<NetWorthReport> {
    return { from: fromMonth, to: toMonth, points: [] };
  },
  async getCashflowSeries(uid: string, fromMonth: string, toMonth: string): Promise<CashflowReport> {
    if (uid !== userId) {
      return { from: fromMonth, to: toMonth, points: [] };
    }
    const points = fixtureCashflowPoints.filter((p) => p.month >= fromMonth && p.month <= toMonth);
    return { from: fromMonth, to: toMonth, points };
  },
  async getSpendingByCategory(
    _uid: string,
    fromMonth: string,
    toMonth: string
  ): Promise<SpendingByCategoryReport> {
    return { from: fromMonth, to: toMonth, currency: "CAD", byCategory: [] };
  }
};

const app = await createTestApp({ JWT_SECRET: "test-secret" }, { reportsRepository: fakeReportsRepository });

describe("GET /api/v1/reports/cashflow", () => {
  afterAll(async () => {
    await app.close();
  });

  it("returns 401 when missing token", async () => {
    await request(app.server).get("/api/v1/reports/cashflow?from=2026-01&to=2026-02").expect(401);
  });

  it("returns 400 for invalid query", async () => {
    const token = app.jwt.sign({ sub: userId });
    await request(app.server)
      .get("/api/v1/reports/cashflow?from=2026-01&to=bad")
      .set("authorization", `Bearer ${token}`)
      .expect(400);
  });

  it("returns cashflow points reconciled with fixture inflow/outflow totals", async () => {
    const token = app.jwt.sign({ sub: userId });
    const response = await request(app.server)
      .get("/api/v1/reports/cashflow?from=2026-01&to=2026-02")
      .set("authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body).toEqual({
      from: "2026-01",
      to: "2026-02",
      points: fixtureCashflowPoints
    });

    for (const p of response.body.points) {
      expect(BigInt(p.netCashflowMinor)).toBe(
        BigInt(p.totalInflowsMinor) - BigInt(p.totalOutflowsMinor)
      );
    }
  });
});
