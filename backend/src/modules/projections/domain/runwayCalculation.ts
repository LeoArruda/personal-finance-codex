/**
 * Pure helpers for cash runway and envelope coverage (minor units as bigint).
 * All dates are ISO calendar dates (YYYY-MM-DD), interpreted in UTC.
 */

export type TrailingWindow = {
  windowStart: string;
  windowEnd: string;
  calendarDayCount: number;
};

/** Inclusive trailing window: exactly `trailingWeeks * 7` calendar days ending on `asOfDate`. */
export function computeTrailingWindow(asOfDate: string, trailingWeeks: number): TrailingWindow {
  const weeks = Math.max(1, trailingWeeks);
  const calendarDayCount = weeks * 7;
  const end = new Date(`${asOfDate}T12:00:00.000Z`);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (calendarDayCount - 1));
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return {
    windowStart: iso(start),
    windowEnd: iso(end),
    calendarDayCount
  };
}

export function addCalendarDays(isoDate: string, wholeDays: number): string {
  const d = new Date(`${isoDate}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + wholeDays);
  return d.toISOString().slice(0, 10);
}

/** Integer average daily outflow (floored); zero if no calendar days. */
export function averageDailyMinor(totalMinor: bigint, calendarDayCount: number): bigint {
  if (calendarDayCount <= 0) return 0n;
  return totalMinor / BigInt(calendarDayCount);
}

export type RunwayDaysResult = {
  runwayDays: number | null;
  interpretation: "finite" | "no_cash_balance" | "no_recent_expense_activity";
};

/**
 * How many full days aggregate cash would last at `averageDailyOutflowMinor` burn rate.
 * `null` runway when burn is zero (no recent expense activity).
 */
export function computeAggregateRunwayDays(
  totalCashLikeBalanceMinor: bigint,
  averageDailyOutflowMinor: bigint
): RunwayDaysResult {
  if (totalCashLikeBalanceMinor <= 0n) {
    return { runwayDays: 0, interpretation: "no_cash_balance" };
  }
  if (averageDailyOutflowMinor <= 0n) {
    return { runwayDays: null, interpretation: "no_recent_expense_activity" };
  }
  const days = totalCashLikeBalanceMinor / averageDailyOutflowMinor;
  const n = Number(days);
  return {
    runwayDays: Number.isSafeInteger(n) ? n : Number.MAX_SAFE_INTEGER,
    interpretation: "finite"
  };
}

export type EnvelopeCoverageResult = {
  averageDailySpendMinor: bigint;
  runwayDays: number | null;
  coverageUntilDate: string | null;
  interpretation: "finite" | "no_category_spend_in_window" | "zero_available";
};

export function computeEnvelopeCoverage(
  availableMinor: bigint,
  trailingCategorySpendMinor: bigint,
  calendarDayCount: number,
  asOfDate: string
): EnvelopeCoverageResult {
  if (availableMinor <= 0n) {
    return {
      averageDailySpendMinor: averageDailyMinor(trailingCategorySpendMinor, calendarDayCount),
      runwayDays: 0,
      coverageUntilDate: asOfDate,
      interpretation: "zero_available"
    };
  }
  const avgDaily = averageDailyMinor(trailingCategorySpendMinor, calendarDayCount);
  if (avgDaily <= 0n) {
    return {
      averageDailySpendMinor: 0n,
      runwayDays: null,
      coverageUntilDate: null,
      interpretation: "no_category_spend_in_window"
    };
  }
  const days = availableMinor / avgDaily;
  const n = Number(days);
  const runwayDays = Number.isSafeInteger(n) ? n : Number.MAX_SAFE_INTEGER;
  return {
    averageDailySpendMinor: avgDaily,
    runwayDays,
    coverageUntilDate: addCalendarDays(asOfDate, runwayDays),
    interpretation: "finite"
  };
}
