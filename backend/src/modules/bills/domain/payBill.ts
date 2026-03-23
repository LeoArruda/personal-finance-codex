export type PayBillValidation =
  | { ok: true }
  | { ok: false; reason: "not_pending" | "soft_deleted" };

export function validateBillCanBePaid(state: {
  status: "pending" | "paid" | "cancelled";
  deletedAt: string | null;
}): PayBillValidation {
  if (state.deletedAt !== null) {
    return { ok: false, reason: "soft_deleted" };
  }
  if (state.status !== "pending") {
    return { ok: false, reason: "not_pending" };
  }
  return { ok: true };
}
