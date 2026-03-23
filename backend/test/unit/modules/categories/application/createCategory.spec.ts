import { describe, expect, it, vi } from "vitest";
import { createCategory, type CategoriesRepository } from "../../../../../src/modules/categories/application/categories";

describe("createCategory (application)", () => {
  it("delegates to repository", async () => {
    const createForUser = vi.fn().mockResolvedValue({
      id: "c1",
      userId: "u1",
      budgetId: "b1",
      categoryGroupId: "g1",
      parentCategoryId: null,
      kind: "expense" as const,
      name: "X",
      sortOrder: 0,
      isActive: true
    });
    const repository: CategoriesRepository = {
      createForUser,
      updateForUser: vi.fn()
    };
    const out = await createCategory(repository, "u1", {
      budgetId: "b1",
      categoryGroupId: "g1",
      name: "X"
    });
    expect(createForUser).toHaveBeenCalledWith("u1", {
      budgetId: "b1",
      categoryGroupId: "g1",
      name: "X"
    });
    expect(out?.name).toBe("X");
  });
});
