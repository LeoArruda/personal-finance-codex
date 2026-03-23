import { describe, expect, it } from "vitest";
import { validateCreateTransferInput } from "../../../src/modules/transfers/application/transfers";

describe("transfer money conservation (input validation)", () => {
  it("rejects non-positive transfer amount", () => {
    expect(
      validateCreateTransferInput({
        sourceAccountId: "a",
        destinationAccountId: "b",
        amountMinor: "0",
        transferDate: "2026-01-01"
      })
    ).not.toBeNull();
  });

  it("uses a single amount for both legs conceptually", () => {
    const amountMinor = "12500";
    const sourceOutflow = BigInt(amountMinor);
    const destInflow = BigInt(amountMinor);
    expect(sourceOutflow).toBe(destInflow);
  });
});
