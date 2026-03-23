export type DashboardBillSlice = {
  id: string;
  payeeName: string;
  amountMinor: string;
  currency: string;
  dueDate: string;
  status: string;
};

export type DashboardGoalSlice = {
  id: string;
  name: string;
  type: string;
  status: string;
  targetAmountMinor: string;
  currentAmountMinor: string;
  currency: string;
};

export type DashboardSpendingSlice = {
  categoryId: string | null;
  categoryName: string;
  totalSpentMinor: string;
};

export type DashboardBudgetMonthSlice = {
  monthKey: string;
  readyToAssignMinor: string;
  totalAssignedMinor: string;
  totalActivityMinor: string;
  totalAvailableMinor: string;
};

export type DashboardSummary = {
  monthKey: string;
  budgetId: string | null;
  budgetCurrency: string | null;
  budgetMonth: DashboardBudgetMonthSlice | null;
  upcomingBills: DashboardBillSlice[];
  activeGoals: DashboardGoalSlice[];
  topSpendingCategories: DashboardSpendingSlice[];
};

export interface DashboardRepository {
  getSummary(userId: string, monthKey: string): Promise<DashboardSummary>;
}

export async function getDashboardSummary(
  repository: DashboardRepository,
  userId: string,
  monthKey: string
): Promise<DashboardSummary> {
  return repository.getSummary(userId, monthKey);
}
