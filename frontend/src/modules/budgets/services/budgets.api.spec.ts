import { describe, expect, it } from "vitest";
import {
  applyAutoAssign,
  getBudgetMonth,
  updateAssignedAmount
} from "./budgets.api";

describe("budgets.api", () => {
  it("returns a typed month payload for an available budget month", async () => {
    const month = await getBudgetMonth("budget-1", "2026-03");

    expect(month.summary.budgetId).toBe("budget-1");
    expect(month.summary.monthKey).toBe("2026-03");
    expect(month.accountGroups).toHaveLength(2);
    expect(month.categoryGroups[0]?.categories[0]?.id).toBe("rent");
  });

  it("updates assigned amount and recalculates category, group, and month totals", async () => {
    const updatedMonth = await updateAssignedAmount({
      budgetId: "budget-1",
      monthKey: "2026-03",
      categoryId: "rent",
      assignedMinor: "240000"
    });

    const billsGroup = updatedMonth.categoryGroups.find((group) => group.id === "bills");
    const rentCategory = billsGroup?.categories.find((category) => category.id === "rent");

    expect(rentCategory?.assignedMinor).toBe("240000");
    expect(rentCategory?.availableMinor).toBe("240000");
    expect(rentCategory?.displayAssigned).toBe("$2,400.00");
    expect(billsGroup?.assignedMinor).toBe("288000");
    expect(updatedMonth.summary.totalAssignedMinor).toBe("288000");
    expect(updatedMonth.summary.displayTotalAssigned).toBe("$2,880.00");
  });

  it("applies auto-assign to a targeted category and returns the applied option", async () => {
    const result = await applyAutoAssign({
      budgetId: "budget-1",
      monthKey: "2026-03",
      categoryId: "rent",
      strategy: "average_assigned"
    });

    const rentCategory = result.month.categoryGroups
      .flatMap((group) => group.categories)
      .find((category) => category.id === "rent");

    expect(result.appliedOptions).toEqual([
      {
        strategy: "average_assigned",
        label: "Average Assigned",
        amountMinor: "225000",
        displayAmount: "$2,250.00"
      }
    ]);
    expect(rentCategory?.assignedMinor).toBe("225000");
    expect(rentCategory?.displayAssigned).toBe("$2,250.00");
  });
});
