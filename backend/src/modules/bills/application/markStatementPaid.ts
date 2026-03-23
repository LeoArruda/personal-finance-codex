/**
 * Pure preconditions for marking a credit card statement as paid (DB still enforces atomically).
 */

export type MarkStatementPaidValidation =
  | { ok: true }
  | { ok: false; reason: "already_paid" | "soft_deleted" };

export function validateMarkStatementPaid(state: {
  isPaid: boolean;
  deletedAt: string | null;
}): MarkStatementPaidValidation {
  if (state.deletedAt !== null) {
    return { ok: false, reason: "soft_deleted" };
  }
  if (state.isPaid) {
    return { ok: false, reason: "already_paid" };
  }
  return { ok: true };
}
