import { parsePositiveMinorUnits } from "../domain/readyToAssign";
import { type MoveMoneyInput, type MoveMoneyRepositoryResult } from "./moveMoney";
import { type CategoryMonthSummary } from "./budgetMonths";

export type AssignMoneyInput = {
  categoryId: string;
  amountMinor: string;
  notes?: string;
};

export type AssignMoneyResult = {
  eventId: string;
  readyToAssignMinor: string;
  totalAssignedMinor: string;
  totalAvailableMinor: string;
  categoryMonth: CategoryMonthSummary;
};

export type AssignMoneyRepositoryResult =
  | { status: "ok"; data: AssignMoneyResult }
  | { status: "not_found" }
  | { status: "insufficient_ready_to_assign" };

export interface BudgetAssignmentsRepository {
  assignMoneyFromReadyToAssign(
    userId: string,
    budgetId: string,
    monthKey: string,
    input: AssignMoneyInput
  ): Promise<AssignMoneyRepositoryResult>;
  moveMoneyBetweenCategories(
    userId: string,
    budgetId: string,
    monthKey: string,
    input: MoveMoneyInput
  ): Promise<MoveMoneyRepositoryResult>;
}

export type AssignMoneyOutcome =
  | { ok: true; data: AssignMoneyResult }
  | { ok: false; error: "invalid_amount" | "not_found" | "insufficient_ready_to_assign" };

export async function assignMoneyToCategory(
  repository: BudgetAssignmentsRepository,
  userId: string,
  budgetId: string,
  monthKey: string,
  input: AssignMoneyInput
): Promise<AssignMoneyOutcome> {
  const amount = parsePositiveMinorUnits(input.amountMinor);
  if (amount === null) {
    return { ok: false, error: "invalid_amount" };
  }

  const result = await repository.assignMoneyFromReadyToAssign(userId, budgetId, monthKey, {
    ...input,
    amountMinor: amount.toString()
  });

  if (result.status === "not_found") {
    return { ok: false, error: "not_found" };
  }
  if (result.status === "insufficient_ready_to_assign") {
    return { ok: false, error: "insufficient_ready_to_assign" };
  }

  return { ok: true, data: result.data };
}
