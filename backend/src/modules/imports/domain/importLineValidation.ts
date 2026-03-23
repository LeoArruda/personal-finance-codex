/**
 * Validates a non-negative integer minor-units string for import payloads.
 * Returns null if invalid (empty, negative, non-integer, too large).
 */
export function parsePositiveMinorAmount(amountMinor: string): bigint | null {
  if (!/^\d+$/.test(amountMinor)) {
    return null;
  }
  try {
    const v = BigInt(amountMinor);
    if (v < 0n) {
      return null;
    }
    return v;
  } catch {
    return null;
  }
}
