import { describe, expect, it } from "vitest";
import {
  nextReadyToAssignAfterAssign,
  validateAssignFromReadyToAssign
} from "../../../src/modules/budgeting/domain/readyToAssign";

describe("Ready to Assign invariants", () => {
  it("assign reduces RTA by the same amount", () => {
    const rta = 5000n;
    const amt = 1200n;
    expect(validateAssignFromReadyToAssign(rta, amt)).toEqual({ ok: true });
    expect(nextReadyToAssignAfterAssign(rta, amt)).toBe(3800n);
  });

  it("rejects assign larger than RTA", () => {
    expect(validateAssignFromReadyToAssign(100n, 200n)).toEqual({
      ok: false,
      reason: "insufficient_ready_to_assign"
    });
  });
});
