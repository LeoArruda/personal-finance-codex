import { describe, expect, it } from "vitest";
import {
  addCalendarDays,
  averageDailyMinor,
  computeAggregateRunwayDays,
  computeEnvelopeCoverage,
  computeTrailingWindow
} from "../../../../../src/modules/projections/domain/runwayCalculation";

describe("computeTrailingWindow", () => {
  it("returns 28 inclusive days for 4 weeks ending asOf", () => {
    const w = computeTrailingWindow("2025-03-18", 4);
    expect(w.calendarDayCount).toBe(28);
    expect(w.windowEnd).toBe("2025-03-18");
    expect(w.windowStart).toBe("2025-02-19");
  });

  it("clamps to at least 1 week when trailingWeeks is below 1 in domain (caller clamps too)", () => {
    const w = computeTrailingWindow("2025-03-18", 0);
    expect(w.calendarDayCount).toBe(7);
  });
});

describe("averageDailyMinor", () => {
  it("floors division", () => {
    expect(averageDailyMinor(100n, 30n)).toBe(3n);
  });

  it("returns zero when day count is zero", () => {
    expect(averageDailyMinor(100n, 0)).toBe(0n);
  });
});

describe("computeAggregateRunwayDays", () => {
  it("returns finite runway when balance and outflow are positive", () => {
    const r = computeAggregateRunwayDays(280_000n, 2_500n);
    expect(r.interpretation).toBe("finite");
    expect(r.runwayDays).toBe(112);
  });

  it("returns no_cash when balance is zero", () => {
    const r = computeAggregateRunwayDays(0n, 100n);
    expect(r.interpretation).toBe("no_cash_balance");
    expect(r.runwayDays).toBe(0);
  });

  it("returns no activity when average outflow is zero", () => {
    const r = computeAggregateRunwayDays(10_000n, 0n);
    expect(r.interpretation).toBe("no_recent_expense_activity");
    expect(r.runwayDays).toBeNull();
  });
});

describe("computeEnvelopeCoverage", () => {
  it("computes coverage end date from available and average spend", () => {
    const c = computeEnvelopeCoverage(14_000n, 35_000n, 28, "2025-03-18");
    expect(c.interpretation).toBe("finite");
    expect(c.averageDailySpendMinor).toBe(1250n);
    expect(c.runwayDays).toBe(11);
    expect(c.coverageUntilDate).toBe(addCalendarDays("2025-03-18", 11));
  });

  it("marks zero available", () => {
    const c = computeEnvelopeCoverage(0n, 10_000n, 10, "2025-03-10");
    expect(c.interpretation).toBe("zero_available");
    expect(c.runwayDays).toBe(0);
  });

  it("marks no category spend when trailing spend is zero", () => {
    const c = computeEnvelopeCoverage(5_000n, 0n, 28, "2025-03-18");
    expect(c.interpretation).toBe("no_category_spend_in_window");
    expect(c.runwayDays).toBeNull();
  });
});

describe("addCalendarDays", () => {
  it("adds days across month boundary", () => {
    expect(addCalendarDays("2025-02-28", 1)).toBe("2025-03-01");
  });
});
