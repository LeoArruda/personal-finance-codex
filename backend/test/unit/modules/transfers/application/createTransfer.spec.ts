import { describe, expect, it, vi } from "vitest";
import {
  createTransfer,
  type TransfersRepository
} from "../../../../../src/modules/transfers/application/transfers";

describe("createTransfer", () => {
  it("returns validation error when accounts are the same", async () => {
    const repository: TransfersRepository = {
      createTransfer: vi.fn(),
      listByUser: vi.fn()
    };

    const result = await createTransfer(repository, "user-1", {
      sourceAccountId: "acc-1",
      destinationAccountId: "acc-1",
      amountMinor: "1000",
      transferDate: "2026-03-01"
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("differ");
    }
    expect(repository.createTransfer).not.toHaveBeenCalled();
  });

  it("returns validation error when amount is not positive", async () => {
    const repository: TransfersRepository = {
      createTransfer: vi.fn(),
      listByUser: vi.fn()
    };

    const result = await createTransfer(repository, "user-1", {
      sourceAccountId: "acc-a",
      destinationAccountId: "acc-b",
      amountMinor: "0",
      transferDate: "2026-03-01"
    });

    expect(result.ok).toBe(false);
    expect(repository.createTransfer).not.toHaveBeenCalled();
  });

  it("delegates to repository when input is valid", async () => {
    const repository: TransfersRepository = {
      createTransfer: vi.fn().mockResolvedValue({
        id: "link-1",
        userId: "user-1",
        sourceTransactionId: "tx-out",
        destinationTransactionId: "tx-in",
        sourceAccountId: "acc-a",
        destinationAccountId: "acc-b",
        amountMinor: "5000",
        feeAmountMinor: "0",
        transferDate: "2026-03-01"
      }),
      listByUser: vi.fn()
    };

    const result = await createTransfer(repository, "user-1", {
      sourceAccountId: "acc-a",
      destinationAccountId: "acc-b",
      amountMinor: "5000",
      transferDate: "2026-03-01"
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.transfer.id).toBe("link-1");
    }
    expect(repository.createTransfer).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({
        sourceAccountId: "acc-a",
        destinationAccountId: "acc-b",
        amountMinor: "5000"
      })
    );
  });
});
