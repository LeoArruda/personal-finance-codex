/**
 * Pure helpers for Ready to Assign checks when assigning from the unallocated pool.
 */

export type AssignValidationResult =
  | { ok: true }
  | { ok: false; reason: "non_positive_amount" | "insufficient_ready_to_assign" };

export function parsePositiveMinorUnits(amountMinor: string): bigint | null {
  if (!/^\d+$/.test(amountMinor)) return null;
  const n = BigInt(amountMinor);
  if (n <= 0n) return null;
  return n;
}

export function validateAssignFromReadyToAssign(
  readyToAssignMinor: bigint,
  amountMinor: bigint
): AssignValidationResult {
  if (amountMinor <= 0n) return { ok: false, reason: "non_positive_amount" };
  if (amountMinor > readyToAssignMinor) {
    return { ok: false, reason: "insufficient_ready_to_assign" };
  }
  return { ok: true };
}

export function nextReadyToAssignAfterAssign(
  readyToAssignMinor: bigint,
  amountMinor: bigint
): bigint {
  return readyToAssignMinor - amountMinor;
}
