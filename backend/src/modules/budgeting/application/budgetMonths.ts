export type CategoryMonthSummary = {
  categoryId: string;
  assignedMinor: string;
  activityMinor: string;
  availableMinor: string;
  carryoverFromPreviousMinor: string;
};

export type BudgetMonthSummary = {
  id: string;
  userId: string;
  budgetId: string;
  monthKey: string;
  monthStart: string;
  monthEnd: string;
  readyToAssignMinor: string;
  leftoverFromPreviousMinor: string;
  totalAssignedMinor: string;
  totalActivityMinor: string;
  totalAvailableMinor: string;
  categoryMonths: CategoryMonthSummary[];
};

export interface BudgetMonthsRepository {
  assertBudgetOwnedByUser(userId: string, budgetId: string): Promise<boolean>;
  ensureMonthOpen(userId: string, budgetId: string, monthKey: string): Promise<BudgetMonthSummary | null>;
  getMonthSummary(userId: string, budgetId: string, monthKey: string): Promise<BudgetMonthSummary | null>;
}

export function previousMonthKey(monthKey: string): string {
  const [ys, ms] = monthKey.split("-");
  let y = Number(ys);
  let m = Number(ms);
  if (m === 1) {
    y -= 1;
    m = 12;
  } else {
    m -= 1;
  }
  return `${y}-${String(m).padStart(2, "0")}`;
}

export function monthDateRange(monthKey: string): { monthStart: string; monthEnd: string } {
  const [ys, ms] = monthKey.split("-");
  const y = Number(ys);
  const m = Number(ms);
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 0));
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { monthStart: iso(start), monthEnd: iso(end) };
}

export async function openBudgetMonth(
  repository: BudgetMonthsRepository,
  userId: string,
  budgetId: string,
  monthKey: string
): Promise<BudgetMonthSummary | null> {
  const owned = await repository.assertBudgetOwnedByUser(userId, budgetId);
  if (!owned) return null;
  return repository.ensureMonthOpen(userId, budgetId, monthKey);
}
