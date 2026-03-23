export type BudgetAmount = string;
export type BudgetMonthKey = `${number}-${number}${number}`;

export type BudgetCategoryFilter =
  | "all"
  | "underfunded"
  | "overfunded"
  | "money_available"
  | "snoozed";

export type BudgetSelectionType = "group" | "category" | "summary" | null;
export type BudgetEditingField = "assigned" | "available" | "target" | null;
export type AssignPopoverTab = "auto" | "manual";

export interface BudgetAccount {
  id: string;
  name: string;
  kind: string;
  balanceMinor: BudgetAmount;
  displayBalance: string;
  currency: string;
  isOnBudget: boolean;
}

export interface BudgetAccountGroup {
  id: string;
  title: string;
  displayBalance: string;
  accounts: BudgetAccount[];
}

export interface BudgetCategory {
  id: string;
  groupId: string;
  name: string;
  icon: string | null;
  assignedMinor: BudgetAmount;
  activityMinor: BudgetAmount;
  availableMinor: BudgetAmount;
  displayAssigned: string;
  displayActivity: string;
  displayAvailable: string;
  isSelected?: boolean;
}

export interface BudgetCategoryGroupSummary {
  id: string;
  name: string;
  assignedMinor: BudgetAmount;
  activityMinor: BudgetAmount;
  availableMinor: BudgetAmount;
  displayAssigned: string;
  displayActivity: string;
  displayAvailable: string;
  categories: BudgetCategory[];
}

export interface BudgetMonthSummary {
  budgetId: string;
  monthKey: BudgetMonthKey;
  readyToAssignMinor: BudgetAmount;
  totalAssignedMinor: BudgetAmount;
  totalActivityMinor: BudgetAmount;
  totalAvailableMinor: BudgetAmount;
  displayReadyToAssign: string;
  displayTotalAssigned: string;
  displayTotalActivity: string;
  displayTotalAvailable: string;
}

export interface BudgetInspectorMetric {
  label: string;
  value: string;
}

export interface BudgetMonthPayload {
  summary: BudgetMonthSummary;
  accountGroups: BudgetAccountGroup[];
  categoryGroups: BudgetCategoryGroupSummary[];
  inspector: {
    selectedCategoryId: string | null;
    metrics: BudgetInspectorMetric[];
  };
}

export interface UpdateAssignedAmountInput {
  budgetId: string;
  monthKey: BudgetMonthKey;
  categoryId: string;
  assignedMinor: BudgetAmount;
}

export type AutoAssignStrategy =
  | "assigned_last_month"
  | "spent_last_month"
  | "average_assigned"
  | "average_spent"
  | "reset_available";

export interface ApplyAutoAssignInput {
  budgetId: string;
  monthKey: BudgetMonthKey;
  categoryId?: string;
  strategy: AutoAssignStrategy;
}

export interface BudgetAutoAssignOption {
  strategy: AutoAssignStrategy;
  label: string;
  amountMinor: BudgetAmount;
  displayAmount: string;
}

export interface AutoAssignResult {
  month: BudgetMonthPayload;
  appliedOptions: BudgetAutoAssignOption[];
}
