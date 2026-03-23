import { describe, expect, it } from "vitest";
import {
  nextReadyToAssignAfterAssign,
  parsePositiveMinorUnits,
  validateAssignFromReadyToAssign
} from "../../../../../src/modules/budgeting/domain/readyToAssign";

describe("parsePositiveMinorUnits", () => {
  it("parses positive integers", () => {
    expect(parsePositiveMinorUnits("1")).toBe(1n);
    expect(parsePositiveMinorUnits("100")).toBe(100n);
  });

  it("rejects zero, negative sign, decimals, empty", () => {
    expect(parsePositiveMinorUnits("0")).toBeNull();
    expect(parsePositiveMinorUnits("-1")).toBeNull();
    expect(parsePositiveMinorUnits("1.5")).toBeNull();
    expect(parsePositiveMinorUnits("")).toBeNull();
    expect(parsePositiveMinorUnits("abc")).toBeNull();
  });
});

describe("validateAssignFromReadyToAssign", () => {
  it("allows assign when amount is positive and within RTA", () => {
    expect(validateAssignFromReadyToAssign(500n, 500n)).toEqual({ ok: true });
    expect(validateAssignFromReadyToAssign(500n, 1n)).toEqual({ ok: true });
  });

  it("rejects non-positive amount", () => {
    expect(validateAssignFromReadyToAssign(100n, 0n)).toEqual({
      ok: false,
      reason: "non_positive_amount"
    });
    expect(validateAssignFromReadyToAssign(100n, -1n)).toEqual({
      ok: false,
      reason: "non_positive_amount"
    });
  });

  it("rejects when amount exceeds RTA", () => {
    expect(validateAssignFromReadyToAssign(100n, 101n)).toEqual({
      ok: false,
      reason: "insufficient_ready_to_assign"
    });
  });
});

describe("nextReadyToAssignAfterAssign", () => {
  it("subtracts assigned amount from RTA", () => {
    expect(nextReadyToAssignAfterAssign(1000n, 250n)).toBe(750n);
  });
});
