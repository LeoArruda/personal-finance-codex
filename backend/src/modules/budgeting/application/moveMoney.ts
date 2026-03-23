import { parsePositiveMinorUnits } from "../domain/readyToAssign";
import { type CategoryMonthSummary } from "./budgetMonths";

export type MoveMoneyInput = {
  fromCategoryId: string;
  toCategoryId: string;
  amountMinor: string;
  notes?: string;
};

export type MoveMoneyResult = {
  eventId: string;
  readyToAssignMinor: string;
  totalAssignedMinor: string;
  totalAvailableMinor: string;
  sourceCategoryMonth: CategoryMonthSummary;
  destinationCategoryMonth: CategoryMonthSummary;
};

export type MoveMoneyRepositoryResult =
  | { status: "ok"; data: MoveMoneyResult }
  | { status: "not_found" }
  | { status: "insufficient_source_available" }
  | { status: "same_category" };

export interface MoveMoneyRepository {
  moveMoneyBetweenCategories(
    userId: string,
    budgetId: string,
    monthKey: string,
    input: MoveMoneyInput
  ): Promise<MoveMoneyRepositoryResult>;
}

export type MoveMoneyOutcome =
  | { ok: true; data: MoveMoneyResult }
  | {
      ok: false;
      error:
        | "invalid_amount"
        | "not_found"
        | "insufficient_source_available"
        | "same_category";
    };

export async function moveMoneyBetweenCategories(
  repository: MoveMoneyRepository,
  userId: string,
  budgetId: string,
  monthKey: string,
  input: MoveMoneyInput
): Promise<MoveMoneyOutcome> {
  const amount = parsePositiveMinorUnits(input.amountMinor);
  if (amount === null) {
    return { ok: false, error: "invalid_amount" };
  }

  if (input.fromCategoryId === input.toCategoryId) {
    return { ok: false, error: "same_category" };
  }

  const result = await repository.moveMoneyBetweenCategories(userId, budgetId, monthKey, {
    ...input,
    amountMinor: amount.toString()
  });

  if (result.status === "not_found") {
    return { ok: false, error: "not_found" };
  }
  if (result.status === "insufficient_source_available") {
    return { ok: false, error: "insufficient_source_available" };
  }
  if (result.status === "same_category") {
    return { ok: false, error: "same_category" };
  }

  return { ok: true, data: result.data };
}
