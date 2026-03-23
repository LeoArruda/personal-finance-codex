import { describe, expect, it, vi } from "vitest";
import {
  createAccount,
  type AccountsRepository
} from "../../../../../src/modules/accounts/application/accounts";

describe("createAccount", () => {
  it("delegates creation with caller user id and input", async () => {
    const repository: AccountsRepository = {
      listByUser: vi.fn(),
      createForUser: vi.fn().mockResolvedValue({
        id: "acc-1",
        userId: "user-1",
        name: "Checking",
        kind: "checking",
        status: "active",
        currency: "CAD",
        isOnBudget: true
      }),
      updateForUser: vi.fn()
    };

    const result = await createAccount(repository, "user-1", {
      name: "Checking",
      kind: "checking",
      isOnBudget: true
    });

    expect(repository.createForUser).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({ name: "Checking", kind: "checking", isOnBudget: true })
    );
    expect(result.status).toBe("active");
  });
});
