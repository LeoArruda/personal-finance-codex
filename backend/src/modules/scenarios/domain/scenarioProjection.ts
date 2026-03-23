/**
 * Ephemeral projection: hypothetical assignments drawn only from Ready to Assign.
 * Does not mutate persisted budget_months / category_months.
 */

export type CategoryMonthBaseline = {
  categoryId: string;
  assignedMinor: bigint;
  activityMinor: bigint;
  availableMinor: bigint;
};

export type AdditionalAssignment = {
  categoryId: string;
  amountMinor: bigint;
};

export type ScenarioProjectionResult =
  | {
      ok: true;
      projectedReadyToAssignMinor: bigint;
      categoryMonths: Array<{
        categoryId: string;
        assignedMinor: bigint;
        activityMinor: bigint;
        availableMinor: bigint;
      }>;
    }
  | {
      ok: false;
      error: "non_positive_amount" | "unknown_category" | "insufficient_ready_to_assign";
    };

export function projectAdditionalAssignmentsFromRta(
  readyToAssignMinor: bigint,
  categoryBaselines: CategoryMonthBaseline[],
  additional: AdditionalAssignment[]
): ScenarioProjectionResult {
  const byId = new Map(categoryBaselines.map((c) => [c.categoryId, { ...c }]));
  let rta = readyToAssignMinor;

  for (const a of additional) {
    if (a.amountMinor <= 0n) {
      return { ok: false, error: "non_positive_amount" };
    }
    const row = byId.get(a.categoryId);
    if (!row) {
      return { ok: false, error: "unknown_category" };
    }
    if (a.amountMinor > rta) {
      return { ok: false, error: "insufficient_ready_to_assign" };
    }
    rta -= a.amountMinor;
    row.assignedMinor += a.amountMinor;
    row.availableMinor += a.amountMinor;
  }

  return {
    ok: true,
    projectedReadyToAssignMinor: rta,
    categoryMonths: Array.from(byId.values()).map((c) => ({
      categoryId: c.categoryId,
      assignedMinor: c.assignedMinor,
      activityMinor: c.activityMinor,
      availableMinor: c.availableMinor
    }))
  };
}
