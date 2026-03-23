import { parsePositiveMinorUnits } from "../../budgeting/domain/readyToAssign";
import { type BudgetMonthsRepository } from "../../budgeting/application/budgetMonths";
import { projectAdditionalAssignmentsFromRta } from "../domain/scenarioProjection";

export type PreviewScenarioInput = {
  budgetId: string;
  monthKey: string;
  additionalAssignments: Array<{ categoryId: string; amountMinor: string }>;
};

export type PreviewScenarioSuccess = {
  budgetId: string;
  monthKey: string;
  projectedReadyToAssignMinor: string;
  categoryMonths: Array<{
    categoryId: string;
    assignedMinor: string;
    activityMinor: string;
    availableMinor: string;
  }>;
};

export type PreviewScenarioOutcome =
  | { ok: true; data: PreviewScenarioSuccess }
  | {
      ok: false;
      error:
        | "not_found"
        | "invalid_amount"
        | "non_positive_amount"
        | "unknown_category"
        | "insufficient_ready_to_assign";
    };

export async function previewBudgetMonthScenario(
  budgetMonthsRepository: BudgetMonthsRepository,
  userId: string,
  input: PreviewScenarioInput
): Promise<PreviewScenarioOutcome> {
  const additional: Array<{ categoryId: string; amountMinor: bigint }> = [];
  for (const a of input.additionalAssignments) {
    const amt = parsePositiveMinorUnits(a.amountMinor);
    if (amt === null) {
      return { ok: false, error: "invalid_amount" };
    }
    additional.push({ categoryId: a.categoryId, amountMinor: amt });
  }

  const month = await budgetMonthsRepository.getMonthSummary(userId, input.budgetId, input.monthKey);
  if (!month) {
    return { ok: false, error: "not_found" };
  }

  const ready = BigInt(month.readyToAssignMinor);
  const baselines = month.categoryMonths.map((c) => ({
    categoryId: c.categoryId,
    assignedMinor: BigInt(c.assignedMinor),
    activityMinor: BigInt(c.activityMinor),
    availableMinor: BigInt(c.availableMinor)
  }));

  const projected = projectAdditionalAssignmentsFromRta(ready, baselines, additional);
  if (!projected.ok) {
    return { ok: false, error: projected.error };
  }

  return {
    ok: true,
    data: {
      budgetId: input.budgetId,
      monthKey: input.monthKey,
      projectedReadyToAssignMinor: projected.projectedReadyToAssignMinor.toString(),
      categoryMonths: projected.categoryMonths.map((c) => ({
        categoryId: c.categoryId,
        assignedMinor: c.assignedMinor.toString(),
        activityMinor: c.activityMinor.toString(),
        availableMinor: c.availableMinor.toString()
      }))
    }
  };
}
