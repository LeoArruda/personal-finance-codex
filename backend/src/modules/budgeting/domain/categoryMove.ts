/**
 * Pure validation for moving budgeted amounts between categories in the same month.
 */

export type CategoryMoveValidationResult =
  | { ok: true }
  | {
      ok: false;
      reason: "same_category" | "non_positive_amount" | "insufficient_source_available";
    };

export function validateMoveBetweenCategories(
  sourceCategoryId: string,
  destinationCategoryId: string,
  sourceAvailableMinor: bigint,
  amountMinor: bigint
): CategoryMoveValidationResult {
  if (sourceCategoryId === destinationCategoryId) {
    return { ok: false, reason: "same_category" };
  }
  if (amountMinor <= 0n) {
    return { ok: false, reason: "non_positive_amount" };
  }
  if (amountMinor > sourceAvailableMinor) {
    return { ok: false, reason: "insufficient_source_available" };
  }
  return { ok: true };
}
