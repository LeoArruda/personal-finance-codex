import { describe, expect, it } from "vitest";
import { validateMarkStatementPaid } from "../../../../../src/modules/bills/application/markStatementPaid";

describe("validateMarkStatementPaid", () => {
  it("allows when not paid and not deleted", () => {
    expect(validateMarkStatementPaid({ isPaid: false, deletedAt: null })).toEqual({ ok: true });
  });

  it("rejects when already paid", () => {
    expect(validateMarkStatementPaid({ isPaid: true, deletedAt: null })).toEqual({
      ok: false,
      reason: "already_paid"
    });
  });

  it("rejects when soft-deleted", () => {
    expect(
      validateMarkStatementPaid({ isPaid: false, deletedAt: "2026-01-01T00:00:00.000Z" })
    ).toEqual({
      ok: false,
      reason: "soft_deleted"
    });
  });
});
