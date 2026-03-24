import type {
  ApplyAutoAssignInput,
  AutoAssignResult,
  BudgetAutoAssignOption,
  BudgetCategory,
  BudgetCategoryGroupSummary,
  BudgetMonthKey,
  BudgetMonthPayload,
  UpdateAssignedAmountInput
} from "../types/budget.types";

type BudgetMonthStore = Record<string, BudgetMonthPayload>;

function formatCurrencyFromMinor(amountMinor: string): string {
  const amount = Number(amountMinor) / 100;
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

function cloneMonthPayload(payload: BudgetMonthPayload): BudgetMonthPayload {
  return structuredClone(payload);
}

function monthStoreKey(budgetId: string, monthKey: BudgetMonthKey): string {
  return `${budgetId}:${monthKey}`;
}

function sumMinor(values: string[]): string {
  return values.reduce((total, value) => total + BigInt(value), 0n).toString();
}

function recalculateGroup(group: BudgetCategoryGroupSummary): BudgetCategoryGroupSummary {
  const assignedMinor = sumMinor(group.categories.map((category) => category.assignedMinor));
  const activityMinor = sumMinor(group.categories.map((category) => category.activityMinor));
  const availableMinor = sumMinor(group.categories.map((category) => category.availableMinor));

  return {
    ...group,
    assignedMinor,
    activityMinor,
    availableMinor,
    displayAssigned: formatCurrencyFromMinor(assignedMinor),
    displayActivity: formatCurrencyFromMinor(activityMinor),
    displayAvailable: formatCurrencyFromMinor(availableMinor)
  };
}

function recalculateSummary(month: BudgetMonthPayload): BudgetMonthPayload {
  const categoryGroups = month.categoryGroups.map(recalculateGroup);
  const totalAssignedMinor = sumMinor(categoryGroups.map((group) => group.assignedMinor));
  const totalActivityMinor = sumMinor(categoryGroups.map((group) => group.activityMinor));
  const totalAvailableMinor = sumMinor(categoryGroups.map((group) => group.availableMinor));

  return {
    ...month,
    categoryGroups,
    summary: {
      ...month.summary,
      totalAssignedMinor,
      totalActivityMinor,
      totalAvailableMinor,
      displayTotalAssigned: formatCurrencyFromMinor(totalAssignedMinor),
      displayTotalActivity: formatCurrencyFromMinor(totalActivityMinor),
      displayTotalAvailable: formatCurrencyFromMinor(totalAvailableMinor)
    }
  };
}

function updateCategoryAmount(
  category: BudgetCategory,
  assignedMinor: string
): BudgetCategory {
  return {
    ...category,
    assignedMinor,
    availableMinor: assignedMinor,
    displayAssigned: formatCurrencyFromMinor(assignedMinor),
    displayAvailable: formatCurrencyFromMinor(assignedMinor)
  };
}

function getAutoAssignPreset(
  strategy: ApplyAutoAssignInput["strategy"]
): BudgetAutoAssignOption {
  const presets: Record<ApplyAutoAssignInput["strategy"], { label: string; amountMinor: string }> = {
    assigned_last_month: { label: "Assigned Last Month", amountMinor: "230000" },
    spent_last_month: { label: "Spent Last Month", amountMinor: "219500" },
    average_assigned: { label: "Average Assigned", amountMinor: "225000" },
    average_spent: { label: "Average Spent", amountMinor: "214000" },
    reset_available: { label: "Reset Available Amount", amountMinor: "0" },
    reset_assigned: { label: "Reset Assigned Amount", amountMinor: "0" }
  };

  const preset = presets[strategy];

  return {
    strategy,
    label: preset.label,
    amountMinor: preset.amountMinor,
    displayAmount: formatCurrencyFromMinor(preset.amountMinor)
  };
}

const mockMonthStore: BudgetMonthStore = {
  "budget-1:2026-03": {
    summary: {
      budgetId: "budget-1",
      monthKey: "2026-03",
      readyToAssignMinor: "772000",
      totalAssignedMinor: "278000",
      totalActivityMinor: "0",
      totalAvailableMinor: "278000",
      displayReadyToAssign: "$7,720.00",
      displayTotalAssigned: "$2,780.00",
      displayTotalActivity: "$0.00",
      displayTotalAvailable: "$2,780.00"
    },
    accountGroups: [
      {
        id: "cash",
        title: "Cash",
        displayBalance: "$10,500.00",
        accounts: [
          {
            id: "rbc-checking",
            name: "RBC Checking",
            kind: "checking",
            balanceMinor: "500000",
            displayBalance: "$5,000.00",
            currency: "CAD",
            isOnBudget: true
          },
          {
            id: "rbc-savings",
            name: "RBC Savings",
            kind: "savings",
            balanceMinor: "550000",
            displayBalance: "$5,500.00",
            currency: "CAD",
            isOnBudget: true
          }
        ]
      },
      {
        id: "tracking",
        title: "Tracking",
        displayBalance: "$23,000.00",
        accounts: [
          {
            id: "future-investments",
            name: "Future Investments",
            kind: "investment",
            balanceMinor: "2300000",
            displayBalance: "$23,000.00",
            currency: "CAD",
            isOnBudget: false
          }
        ]
      }
    ],
    categoryGroups: [
      {
        id: "bills",
        name: "Bills",
        assignedMinor: "278000",
        activityMinor: "0",
        availableMinor: "278000",
        displayAssigned: "$2,780.00",
        displayActivity: "$0.00",
        displayAvailable: "$2,780.00",
        categories: [
          {
            id: "rent",
            groupId: "bills",
            name: "Rent",
            icon: "🏠",
            assignedMinor: "230000",
            activityMinor: "0",
            availableMinor: "230000",
            displayAssigned: "$2,300.00",
            displayActivity: "$0.00",
            displayAvailable: "$2,300.00",
            isSelected: true
          },
          {
            id: "utilities",
            groupId: "bills",
            name: "Utilities",
            icon: "⚡",
            assignedMinor: "20000",
            activityMinor: "0",
            availableMinor: "20000",
            displayAssigned: "$200.00",
            displayActivity: "$0.00",
            displayAvailable: "$200.00"
          },
          {
            id: "insurance",
            groupId: "bills",
            name: "Insurance",
            icon: "📄",
            assignedMinor: "28000",
            activityMinor: "0",
            availableMinor: "28000",
            displayAssigned: "$280.00",
            displayActivity: "$0.00",
            displayAvailable: "$280.00"
          }
        ]
      },
      {
        id: "needs",
        name: "Needs",
        assignedMinor: "0",
        activityMinor: "0",
        availableMinor: "0",
        displayAssigned: "$0.00",
        displayActivity: "$0.00",
        displayAvailable: "$0.00",
        categories: [
          {
            id: "groceries",
            groupId: "needs",
            name: "Groceries",
            icon: "🛒",
            assignedMinor: "0",
            activityMinor: "0",
            availableMinor: "0",
            displayAssigned: "$0.00",
            displayActivity: "$0.00",
            displayAvailable: "$0.00"
          },
          {
            id: "transportation",
            groupId: "needs",
            name: "Transportation",
            icon: "🛞",
            assignedMinor: "0",
            activityMinor: "0",
            availableMinor: "0",
            displayAssigned: "$0.00",
            displayActivity: "$0.00",
            displayAvailable: "$0.00"
          }
        ]
      }
    ],
    inspector: {
      selectedCategoryId: "rent",
      metrics: [
        { label: "Cash Left Over From Last Month", value: "$0.00" },
        { label: "Assigned This Month", value: "+$2,300.00" },
        { label: "Cash Spending", value: "$0.00" },
        { label: "Credit Spending", value: "$0.00" }
      ]
    }
  }
};

async function resolveMonthPayload(
  budgetId: string,
  monthKey: BudgetMonthKey
): Promise<BudgetMonthPayload> {
  const payload = mockMonthStore[monthStoreKey(budgetId, monthKey)];

  if (!payload) {
    throw new Error(`Budget month ${budgetId}/${monthKey} is not available in the mock adapter.`);
  }

  return cloneMonthPayload(payload);
}

export async function getBudgetMonth(
  budgetId: string,
  monthKey: BudgetMonthKey
): Promise<BudgetMonthPayload> {
  return resolveMonthPayload(budgetId, monthKey);
}

export async function updateAssignedAmount(
  input: UpdateAssignedAmountInput
): Promise<BudgetMonthPayload> {
  const current = await resolveMonthPayload(input.budgetId, input.monthKey);

  const next = recalculateSummary({
    ...current,
    categoryGroups: current.categoryGroups.map((group) => ({
      ...group,
      categories: group.categories.map((category) =>
        category.id === input.categoryId
          ? updateCategoryAmount(category, input.assignedMinor)
          : category
      )
    }))
  });

  mockMonthStore[monthStoreKey(input.budgetId, input.monthKey)] = cloneMonthPayload(next);

  return cloneMonthPayload(next);
}

export async function applyAutoAssign(
  input: ApplyAutoAssignInput
): Promise<AutoAssignResult> {
  const current = await resolveMonthPayload(input.budgetId, input.monthKey);
  const appliedOption = getAutoAssignPreset(input.strategy);

  const next = input.categoryId
    ? recalculateSummary({
        ...current,
        categoryGroups: current.categoryGroups.map((group) => ({
          ...group,
          categories: group.categories.map((category) =>
            category.id === input.categoryId
              ? updateCategoryAmount(category, appliedOption.amountMinor)
              : category
          )
        }))
      })
    : current;

  mockMonthStore[monthStoreKey(input.budgetId, input.monthKey)] = cloneMonthPayload(next);

  return {
    month: cloneMonthPayload(next),
    appliedOptions: [appliedOption]
  };
}
