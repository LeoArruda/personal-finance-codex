import {
  averageDailyMinor,
  computeAggregateRunwayDays,
  computeEnvelopeCoverage,
  computeTrailingWindow,
  type TrailingWindow
} from "../domain/runwayCalculation";

export type CashRunwayAccountRow = {
  accountId: string;
  name: string;
  kind: string;
  currency: string;
  balanceMinor: string;
};

export type CashRunwaySourceData = {
  accounts: CashRunwayAccountRow[];
  /** Sum of posted expense transactions in [windowStart, windowEnd]. */
  trailingExpenseTotalMinor: string;
  /** Posted expense totals in window keyed by category id. */
  expenseTotalsByCategoryId: Record<string, string>;
  /** Envelope rows for default budget + month (expense categories). */
  categoryEnvelopes: Array<{
    categoryId: string;
    categoryName: string;
    availableMinor: string;
  }>;
  budgetId: string | null;
  primaryCurrency: string | null;
};

export type CashRunwayProjection = {
  assumptions: {
    trailingWeeks: number;
    basis: string;
    windowStart: string;
    windowEnd: string;
    calendarDayCount: number;
    asOfDate: string;
    envelopeMonthKey: string;
    primaryCurrency: string | null;
  };
  aggregate: {
    totalCashLikeBalanceMinor: string;
    trailingExpenseTotalMinor: string;
    averageDailyOutflowMinor: string;
    runwayDays: number | null;
    runwayInterpretation: "finite" | "no_cash_balance" | "no_recent_expense_activity";
  };
  cashAccounts: CashRunwayAccountRow[];
  envelopeCoverage: Array<{
    categoryId: string;
    categoryName: string;
    availableMinor: string;
    trailingCategorySpendMinor: string;
    averageDailySpendMinor: string;
    runwayDays: number | null;
    coverageUntilDate: string | null;
    interpretation: "finite" | "no_category_spend_in_window" | "zero_available";
  }>;
};

export interface ProjectionsRepository {
  getCashRunwaySourceData(
    userId: string,
    params: {
      windowStart: string;
      windowEnd: string;
      monthKey: string;
    }
  ): Promise<CashRunwaySourceData>;
}

function parseBigint(s: string): bigint {
  try {
    return BigInt(s);
  } catch {
    return 0n;
  }
}

export function composeCashRunwayProjection(
  source: CashRunwaySourceData,
  trailingWeeks: number,
  monthKey: string,
  asOfDate: string,
  window: TrailingWindow
): CashRunwayProjection {
  const totalCash = source.accounts.reduce((acc, a) => {
    if (source.primaryCurrency && a.currency !== source.primaryCurrency) {
      return acc;
    }
    return acc + parseBigint(a.balanceMinor);
  }, 0n);

  const trailingTotal = parseBigint(source.trailingExpenseTotalMinor);
  const avgDailyOut = averageDailyMinor(trailingTotal, window.calendarDayCount);
  const runway = computeAggregateRunwayDays(totalCash, avgDailyOut);

  const envelopeCoverage = source.categoryEnvelopes.map((row) => {
    const spendKey = source.expenseTotalsByCategoryId[row.categoryId] ?? "0";
    const spend = parseBigint(spendKey);
    const available = parseBigint(row.availableMinor);
    const cov = computeEnvelopeCoverage(
      available,
      spend,
      window.calendarDayCount,
      asOfDate
    );
    return {
      categoryId: row.categoryId,
      categoryName: row.categoryName,
      availableMinor: row.availableMinor,
      trailingCategorySpendMinor: spend.toString(),
      averageDailySpendMinor: cov.averageDailySpendMinor.toString(),
      runwayDays: cov.runwayDays,
      coverageUntilDate: cov.coverageUntilDate,
      interpretation: cov.interpretation
    };
  });

  return {
    assumptions: {
      trailingWeeks,
      basis:
        "average_daily_outflow_from_posted_expense_transactions_and_envelope_available_from_budget_month",
      windowStart: window.windowStart,
      windowEnd: window.windowEnd,
      calendarDayCount: window.calendarDayCount,
      asOfDate,
      envelopeMonthKey: monthKey,
      primaryCurrency: source.primaryCurrency
    },
    aggregate: {
      totalCashLikeBalanceMinor: totalCash.toString(),
      trailingExpenseTotalMinor: trailingTotal.toString(),
      averageDailyOutflowMinor: avgDailyOut.toString(),
      runwayDays: runway.runwayDays,
      runwayInterpretation: runway.interpretation
    },
    cashAccounts: source.accounts,
    envelopeCoverage
  };
}

export async function getCashRunwayProjection(
  repository: ProjectionsRepository,
  userId: string,
  options: { trailingWeeks: number; monthKey: string; asOfDate: string }
): Promise<CashRunwayProjection> {
  const trailingWeeks = Math.min(52, Math.max(1, options.trailingWeeks));
  const window = computeTrailingWindow(options.asOfDate, trailingWeeks);
  const source = await repository.getCashRunwaySourceData(userId, {
    windowStart: window.windowStart,
    windowEnd: window.windowEnd,
    monthKey: options.monthKey
  });
  return composeCashRunwayProjection(
    source,
    trailingWeeks,
    options.monthKey,
    options.asOfDate,
    window
  );
}
