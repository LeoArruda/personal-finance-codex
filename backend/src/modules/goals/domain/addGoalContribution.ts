export type GoalStatusForContribution = "active" | "paused" | "completed" | "cancelled";

export function parsePositiveContributionMinor(amountMinor: string): bigint | null {
  if (!/^\d+$/.test(amountMinor)) return null;
  const n = BigInt(amountMinor);
  if (n <= 0n) return null;
  return n;
}

/**
 * Manual contributions are only accepted while the goal is actively tracked.
 */
export function goalAcceptsManualContributions(status: GoalStatusForContribution): boolean {
  return status === "active";
}
