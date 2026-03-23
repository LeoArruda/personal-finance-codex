import { describe, expect, it } from "vitest";
import {
  composeCashRunwayProjection,
  type CashRunwaySourceData
} from "../../../../../src/modules/projections/application/projections";
import { computeTrailingWindow } from "../../../../../src/modules/projections/domain/runwayCalculation";

describe("composeCashRunwayProjection", () => {
  const source: CashRunwaySourceData = {
    accounts: [
      {
        accountId: "a1",
        name: "Checking",
        kind: "checking",
        currency: "CAD",
        balanceMinor: "200000"
      },
      {
        accountId: "a2",
        name: "Savings",
        kind: "savings",
        currency: "USD",
        balanceMinor: "80000"
      }
    ],
    trailingExpenseTotalMinor: "70000",
    expenseTotalsByCategoryId: { "cat-1": "35000" },
    categoryEnvelopes: [
      { categoryId: "cat-1", categoryName: "Groceries", availableMinor: "14000" }
    ],
    budgetId: "b1",
    primaryCurrency: "CAD"
  };

  it("sums only accounts matching primary currency for aggregate balance", () => {
    const win = computeTrailingWindow("2025-03-18", 4);
    const p = composeCashRunwayProjection(source, 4, "2025-03", "2025-03-18", win);
    expect(p.aggregate.totalCashLikeBalanceMinor).toBe("200000");
    expect(p.cashAccounts).toHaveLength(2);
  });

  it("includes explicit assumption metadata", () => {
    const win = computeTrailingWindow("2025-03-18", 4);
    const p = composeCashRunwayProjection(source, 4, "2025-03", "2025-03-18", win);
    expect(p.assumptions.trailingWeeks).toBe(4);
    expect(p.assumptions.envelopeMonthKey).toBe("2025-03");
    expect(p.assumptions.windowStart).toBe(win.windowStart);
    expect(p.assumptions.primaryCurrency).toBe("CAD");
    expect(p.assumptions.basis).toContain("posted_expense");
  });
});
