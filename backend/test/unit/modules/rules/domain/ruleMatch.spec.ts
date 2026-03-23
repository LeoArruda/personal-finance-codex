import { describe, expect, it } from "vitest";
import { pickMatchingRule } from "../../../../../src/modules/rules/domain/ruleMatch";

describe("pickMatchingRule", () => {
  it("picks higher priority rule when both match", () => {
    const rules = [
      { id: "a", priority: 1, payeeContains: "foo", categoryId: "c1" },
      { id: "b", priority: 10, payeeContains: "foo", categoryId: "c2" }
    ];
    const m = pickMatchingRule("FOO BAR", rules);
    expect(m?.categoryId).toBe("c2");
    expect(m?.id).toBe("b");
  });

  it("returns null when no substring match", () => {
    expect(pickMatchingRule("nothing", [{ id: "x", priority: 1, payeeContains: "zzz", categoryId: "c" }])).toBeNull();
  });
});
