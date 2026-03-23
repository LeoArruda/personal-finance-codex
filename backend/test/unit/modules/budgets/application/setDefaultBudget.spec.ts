import { describe, expect, it, vi } from "vitest";
import {
  setDefaultBudget,
  type BudgetsRepository
} from "../../../../../src/modules/budgets/application/budgets";

describe("setDefaultBudget", () => {
  it("delegates set-default to repository with user and budget ids", async () => {
    const repository: BudgetsRepository = {
      listByUser: vi.fn(),
      createForUser: vi.fn(),
      updateForUser: vi.fn(),
      setDefaultForUser: vi.fn().mockResolvedValue({
        id: "budget-b",
        userId: "user-1",
        name: "Travel",
        currency: "CAD",
        isDefault: true,
        status: "active"
      })
    };

    const result = await setDefaultBudget(repository, "user-1", "budget-b");

    expect(repository.setDefaultForUser).toHaveBeenCalledWith("user-1", "budget-b");
    expect(result?.id).toBe("budget-b");
    expect(result?.isDefault).toBe(true);
  });
});

