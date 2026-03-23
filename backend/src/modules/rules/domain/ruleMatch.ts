export type RuleCandidate = {
  id: string;
  priority: number;
  payeeContains: string;
  categoryId: string;
};

/**
 * Deterministic: higher priority first, then stable id order.
 */
export function pickMatchingRule(description: string, rules: RuleCandidate[]): RuleCandidate | null {
  const d = description.toLowerCase();
  const sorted = [...rules].sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return a.id.localeCompare(b.id);
  });
  for (const r of sorted) {
    const needle = r.payeeContains.toLowerCase();
    if (needle.length > 0 && d.includes(needle)) {
      return r;
    }
  }
  return null;
}
