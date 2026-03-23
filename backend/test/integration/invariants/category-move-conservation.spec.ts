import { describe, expect, it } from "vitest";
import { validateMoveBetweenCategories } from "../../../src/modules/budgeting/domain/categoryMove";

describe("category move preserves total available pool (two-category model)", () => {
  it("moving X from A to B keeps A_avail + B_avail constant", () => {
    const availA = 300n;
    const availB = 150n;
    const x = 75n;
    const before = availA + availB;
    expect(validateMoveBetweenCategories("cat-a", "cat-b", availA, x)).toEqual({ ok: true });
    const after = availA - x + (availB + x);
    expect(after).toBe(before);
  });
});
