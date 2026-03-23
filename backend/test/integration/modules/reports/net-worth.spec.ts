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

/** Fixture-aligned series: latest snapshot per month reconciles to stored totals */
const fixtureNetWorthPoints = [
  {
    month: "2026-01",
    totalAssetsMinor: "250000",
    totalLiabilitiesMinor: "80000",
    netWorthMinor: "170000",
    currency: "CAD"
  },
  {
    month: "2026-02",
    totalAssetsMinor: "255000",
    totalLiabilitiesMinor: "77500",
    netWorthMinor: "177500",
    currency: "CAD"
  },
  {
    month: "2026-03",
    totalAssetsMinor: "260000",
    totalLiabilitiesMinor: "75000",
    netWorthMinor: "185000",
    currency: "CAD"
  }
];

const fakeReportsRepository: ReportsRepository = {
  async getNetWorthSeries(uid: string, fromMonth: string, toMonth: string): Promise<NetWorthReport> {
    if (uid !== userId) {
      return { from: fromMonth, to: toMonth, points: [] };
    }
    const points = fixtureNetWorthPoints.filter((p) => p.month >= fromMonth && p.month <= toMonth);
    return { from: fromMonth, to: toMonth, points };
  },
  async getCashflowSeries(_uid: string, fromMonth: string, toMonth: string): Promise<CashflowReport> {
    return { from: fromMonth, to: toMonth, points: [] };
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

describe("GET /api/v1/reports/net-worth", () => {
  afterAll(async () => {
    await app.close();
  });

  it("returns 401 when missing token", async () => {
    await request(app.server).get("/api/v1/reports/net-worth?from=2026-01&to=2026-03").expect(401);
  });

  it("returns 400 for invalid month format", async () => {
    const token = app.jwt.sign({ sub: userId });
    await request(app.server)
      .get("/api/v1/reports/net-worth?from=2026-1&to=2026-03")
      .set("authorization", `Bearer ${token}`)
      .expect(400);
  });

  it("returns 400 when from is after to", async () => {
    const token = app.jwt.sign({ sub: userId });
    await request(app.server)
      .get("/api/v1/reports/net-worth?from=2026-04&to=2026-01")
      .set("authorization", `Bearer ${token}`)
      .expect(400);
  });

  it("returns user-scoped net worth points that reconcile with fixture snapshot totals", async () => {
    const token = app.jwt.sign({ sub: userId });
    const response = await request(app.server)
      .get("/api/v1/reports/net-worth?from=2026-01&to=2026-03")
      .set("authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body).toEqual({
      from: "2026-01",
      to: "2026-03",
      points: fixtureNetWorthPoints
    });

    const feb = response.body.points.find((p: { month: string }) => p.month === "2026-02");
    expect(BigInt(feb.netWorthMinor)).toBe(
      BigInt(feb.totalAssetsMinor) - BigInt(feb.totalLiabilitiesMinor)
    );
  });

  it("returns empty points for another user (no cross-user data)", async () => {
    const token = app.jwt.sign({ sub: "user-2" });
    const response = await request(app.server)
      .get("/api/v1/reports/net-worth?from=2026-01&to=2026-03")
      .set("authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body.points).toEqual([]);
  });
});
