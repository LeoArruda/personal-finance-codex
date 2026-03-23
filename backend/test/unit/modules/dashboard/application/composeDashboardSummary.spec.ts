import { describe, expect, it, vi } from "vitest";
import {
  getDashboardSummary,
  type DashboardRepository
} from "../../../../../src/modules/dashboard/application/dashboard";

describe("getDashboardSummary", () => {
  it("delegates to repository with month key", async () => {
    const getSummary = vi.fn().mockResolvedValue({
      monthKey: "2026-01",
      budgetId: null,
      budgetCurrency: null,
      budgetMonth: null,
      upcomingBills: [],
      activeGoals: [],
      topSpendingCategories: []
    });
    const repository: DashboardRepository = { getSummary };
    const out = await getDashboardSummary(repository, "user-1", "2026-01");
    expect(getSummary).toHaveBeenCalledWith("user-1", "2026-01");
    expect(out.monthKey).toBe("2026-01");
  });
});
