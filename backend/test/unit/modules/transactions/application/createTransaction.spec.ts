import { describe, expect, it, vi } from "vitest";
import {
  createTransaction,
  type TransactionsRepository
} from "../../../../../src/modules/transactions/application/transactions";

describe("createTransaction", () => {
  it("returns null when account is not owned by user", async () => {
    const repository: TransactionsRepository = {
      assertAccountOwnedByUser: vi.fn().mockResolvedValue(false),
      assertCategoryOwnedByUser: vi.fn(),
      listByUser: vi.fn(),
      createForUser: vi.fn(),
      updateForUser: vi.fn()
    };

    const result = await createTransaction(repository, "user-1", {
      accountId: "acc-1",
      type: "expense",
      description: "Coffee",
      amountMinor: "-350",
      transactionDate: "2026-03-01"
    });

    expect(result).toBeNull();
    expect(repository.createForUser).not.toHaveBeenCalled();
  });

  it("returns null when category is not owned by user", async () => {
    const repository: TransactionsRepository = {
      assertAccountOwnedByUser: vi.fn().mockResolvedValue(true),
      assertCategoryOwnedByUser: vi.fn().mockResolvedValue(false),
      listByUser: vi.fn(),
      createForUser: vi.fn(),
      updateForUser: vi.fn()
    };

    const result = await createTransaction(repository, "user-1", {
      accountId: "acc-1",
      categoryId: "cat-1",
      type: "expense",
      description: "Coffee",
      amountMinor: "-350",
      transactionDate: "2026-03-01"
    });

    expect(result).toBeNull();
    expect(repository.createForUser).not.toHaveBeenCalled();
  });

  it("creates transaction when references belong to user", async () => {
    const repository: TransactionsRepository = {
      assertAccountOwnedByUser: vi.fn().mockResolvedValue(true),
      assertCategoryOwnedByUser: vi.fn().mockResolvedValue(true),
      listByUser: vi.fn(),
      createForUser: vi.fn().mockResolvedValue({
        id: "tx-1",
        userId: "user-1",
        accountId: "acc-1",
        categoryId: "cat-1",
        type: "expense",
        status: "posted",
        description: "Coffee",
        amountMinor: "-350",
        transactionDate: "2026-03-01"
      }),
      updateForUser: vi.fn()
    };

    const result = await createTransaction(repository, "user-1", {
      accountId: "acc-1",
      categoryId: "cat-1",
      type: "expense",
      description: "Coffee",
      amountMinor: "-350",
      transactionDate: "2026-03-01"
    });

    expect(repository.createForUser).toHaveBeenCalled();
    expect(result?.id).toBe("tx-1");
  });
});
