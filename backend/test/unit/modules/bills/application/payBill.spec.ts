import { describe, expect, it } from "vitest";
import { validateBillCanBePaid } from "../../../../../src/modules/bills/domain/payBill";

describe("validateBillCanBePaid", () => {
  it("allows pending non-deleted bills", () => {
    expect(validateBillCanBePaid({ status: "pending", deletedAt: null })).toEqual({ ok: true });
  });

  it("rejects paid bills", () => {
    expect(validateBillCanBePaid({ status: "paid", deletedAt: null })).toEqual({
      ok: false,
      reason: "not_pending"
    });
  });

  it("rejects cancelled bills", () => {
    expect(validateBillCanBePaid({ status: "cancelled", deletedAt: null })).toEqual({
      ok: false,
      reason: "not_pending"
    });
  });

  it("rejects soft-deleted bills", () => {
    expect(
      validateBillCanBePaid({ status: "pending", deletedAt: "2026-01-01T00:00:00.000Z" })
    ).toEqual({
      ok: false,
      reason: "soft_deleted"
    });
  });
});
