import { describe, expect, it } from "vitest";
import { projectAdditionalAssignmentsFromRta } from "../../../../../src/modules/scenarios/domain/scenarioProjection";

describe("projectAdditionalAssignmentsFromRta", () => {
  const base = [
    {
      categoryId: "a",
      assignedMinor: 1000n,
      activityMinor: 0n,
      availableMinor: 1000n
    },
    {
      categoryId: "b",
      assignedMinor: 500n,
      activityMinor: 0n,
      availableMinor: 500n
    }
  ];

  it("reduces RTA and increases category assigned/available", () => {
    const r = projectAdditionalAssignmentsFromRta(300n, base, [{ categoryId: "a", amountMinor: 200n }]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.projectedReadyToAssignMinor).toBe(100n);
    const a = r.categoryMonths.find((c) => c.categoryId === "a");
    expect(a?.assignedMinor).toBe(1200n);
    expect(a?.availableMinor).toBe(1200n);
  });

  it("rejects when sum exceeds RTA", () => {
    const r = projectAdditionalAssignmentsFromRta(100n, base, [{ categoryId: "a", amountMinor: 200n }]);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBe("insufficient_ready_to_assign");
  });
});
