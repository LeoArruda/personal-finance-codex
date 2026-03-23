import { describe, expect, it, vi } from "vitest";
import {
  applyTransactionSplits,
  type TransactionSplitsRepository,
  validateSplitTotal
} from "../../../../../src/modules/transactions/application/transactionSplits";

describe("validateSplitTotal", () => {
  it("returns true when split total equals transaction amount", () => {
    expect(
      validateSplitTotal("-1000", [
        { categoryId: "cat-1", amountMinor: "-300" },
        { categoryId: "cat-2", amountMinor: "-700" }
      ])
    ).toBe(true);
  });

  it("returns false when split total differs from transaction amount", () => {
    expect(
      validateSplitTotal("-1000", [
        { categoryId: "cat-1", amountMinor: "-300" },
        { categoryId: "cat-2", amountMinor: "-600" }
      ])
    ).toBe(false);
  });
});

describe("applyTransactionSplits", () => {
  it("returns null when transaction not found", async () => {
    const repository: TransactionSplitsRepository = {
      getTransactionAmountMinor: vi.fn().mockResolvedValue(null),
      assertCategoriesOwnedByUser: vi.fn(),
      replaceForTransaction: vi.fn()
    };

    const result = await applyTransactionSplits(repository, "user-1", "tx-1", [
      { categoryId: "cat-1", amountMinor: "-1000" }
    ]);

    expect(result).toBeNull();
    expect(repository.replaceForTransaction).not.toHaveBeenCalled();
  });

  it("returns null when categories are cross-user", async () => {
    const repository: TransactionSplitsRepository = {
      getTransactionAmountMinor: vi.fn().mockResolvedValue("-1000"),
      assertCategoriesOwnedByUser: vi.fn().mockResolvedValue(false),
      replaceForTransaction: vi.fn()
    };

    const result = await applyTransactionSplits(repository, "user-1", "tx-1", [
      { categoryId: "cat-1", amountMinor: "-1000" }
    ]);

    expect(result).toBeNull();
    expect(repository.replaceForTransaction).not.toHaveBeenCalled();
  });

  it("returns null when split total is invalid", async () => {
    const repository: TransactionSplitsRepository = {
      getTransactionAmountMinor: vi.fn().mockResolvedValue("-1000"),
      assertCategoriesOwnedByUser: vi.fn().mockResolvedValue(true),
      replaceForTransaction: vi.fn()
    };

    const result = await applyTransactionSplits(repository, "user-1", "tx-1", [
      { categoryId: "cat-1", amountMinor: "-900" }
    ]);

    expect(result).toBeNull();
    expect(repository.replaceForTransaction).not.toHaveBeenCalled();
  });
});
