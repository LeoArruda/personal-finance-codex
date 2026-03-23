/**
 * Pure UTC scheduling helpers for recurring rules (next run after a completed occurrence).
 */

export type RecurrenceFrequency =
  | "daily"
  | "weekly"
  | "monthly"
  | "quarterly"
  | "yearly"
  | "custom";

/** Advance one scheduling step from `fromUtc` (exclusive of the “current” fire time — use the last fired `next_run_at`). */
export function addRecurrenceUtc(
  fromUtc: Date,
  frequency: RecurrenceFrequency,
  interval: number
): Date {
  const step = Math.max(1, interval);
  const d = new Date(fromUtc.getTime());
  switch (frequency) {
    case "daily":
    case "custom":
      d.setUTCDate(d.getUTCDate() + step);
      return d;
    case "weekly":
      d.setUTCDate(d.getUTCDate() + 7 * step);
      return d;
    case "monthly":
      d.setUTCMonth(d.getUTCMonth() + step);
      return d;
    case "quarterly":
      d.setUTCMonth(d.getUTCMonth() + 3 * step);
      return d;
    case "yearly":
      d.setUTCFullYear(d.getUTCFullYear() + step);
      return d;
    default: {
      const _exhaustive: never = frequency;
      return _exhaustive;
    }
  }
}

/**
 * Next run instant after `fromUtc`, or `null` if it would pass `endsAtUtc`.
 */
export function computeNextScheduledRunUtc(params: {
  fromUtc: Date;
  frequency: RecurrenceFrequency;
  interval: number;
  endsAtUtc: Date | null;
}): Date | null {
  const next = addRecurrenceUtc(params.fromUtc, params.frequency, params.interval);
  if (params.endsAtUtc !== null && next.getTime() > params.endsAtUtc.getTime()) {
    return null;
  }
  return next;
}

/**
 * First `next_run_at` when creating a rule: on or after `nowUtc`, respecting `endsAtUtc`.
 */
export function resolveInitialNextRunUtc(params: {
  startsAtUtc: Date;
  nowUtc: Date;
  frequency: RecurrenceFrequency;
  interval: number;
  endsAtUtc: Date | null;
}): Date | null {
  const interval = Math.max(1, params.interval);
  let candidate = new Date(params.startsAtUtc.getTime());

  if (candidate.getTime() >= params.nowUtc.getTime()) {
    if (params.endsAtUtc !== null && candidate.getTime() > params.endsAtUtc.getTime()) {
      return null;
    }
    return candidate;
  }

  let guard = 0;
  while (candidate.getTime() < params.nowUtc.getTime() && guard < 2000) {
    const n = addRecurrenceUtc(candidate, params.frequency, interval);
    if (n.getTime() <= candidate.getTime()) {
      break;
    }
    candidate = n;
    guard += 1;
  }

  if (params.endsAtUtc !== null && candidate.getTime() > params.endsAtUtc.getTime()) {
    return null;
  }
  return candidate;
}
