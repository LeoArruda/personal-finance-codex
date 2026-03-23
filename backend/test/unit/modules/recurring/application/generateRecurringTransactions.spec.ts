import { describe, expect, it } from "vitest";
import {
  addRecurrenceUtc,
  computeNextScheduledRunUtc,
  resolveInitialNextRunUtc
} from "../../../../../src/modules/recurring/domain/generateRecurringTransactions";

describe("addRecurrenceUtc", () => {
  it("adds days for daily", () => {
    const from = new Date(Date.UTC(2026, 0, 10, 12, 0, 0));
    const next = addRecurrenceUtc(from, "daily", 2);
    expect(next.toISOString()).toBe(new Date(Date.UTC(2026, 0, 12, 12, 0, 0)).toISOString());
  });

  it("adds weeks for weekly", () => {
    const from = new Date(Date.UTC(2026, 0, 5, 0, 0, 0));
    const next = addRecurrenceUtc(from, "weekly", 1);
    expect(next.toISOString()).toBe(new Date(Date.UTC(2026, 0, 12, 0, 0, 0)).toISOString());
  });

  it("adds months for monthly", () => {
    const from = new Date(Date.UTC(2026, 0, 15, 0, 0, 0));
    const next = addRecurrenceUtc(from, "monthly", 1);
    expect(next.getUTCMonth()).toBe(1);
    expect(next.getUTCDate()).toBe(15);
  });

  it("adds three months per step for quarterly", () => {
    const from = new Date(Date.UTC(2026, 0, 1, 0, 0, 0));
    const next = addRecurrenceUtc(from, "quarterly", 1);
    expect(next.getUTCMonth()).toBe(3);
  });

  it("adds years for yearly", () => {
    const from = new Date(Date.UTC(2026, 6, 1, 0, 0, 0));
    const next = addRecurrenceUtc(from, "yearly", 1);
    expect(next.getUTCFullYear()).toBe(2027);
  });

  it("treats custom like daily", () => {
    const from = new Date(Date.UTC(2026, 0, 1, 0, 0, 0));
    expect(addRecurrenceUtc(from, "custom", 3).getUTCDate()).toBe(4);
  });
});

describe("computeNextScheduledRunUtc", () => {
  it("returns null when next run is after endsAt", () => {
    const from = new Date(Date.UTC(2026, 0, 1, 0, 0, 0));
    const ends = new Date(Date.UTC(2026, 0, 1, 12, 0, 0));
    expect(
      computeNextScheduledRunUtc({
        fromUtc: from,
        frequency: "daily",
        interval: 1,
        endsAtUtc: ends
      })
    ).toBeNull();
  });

  it("returns next when within endsAt", () => {
    const from = new Date(Date.UTC(2026, 0, 1, 0, 0, 0));
    const ends = new Date(Date.UTC(2026, 11, 31, 23, 59, 59));
    const n = computeNextScheduledRunUtc({
      fromUtc: from,
      frequency: "daily",
      interval: 1,
      endsAtUtc: ends
    });
    expect(n?.toISOString()).toBe(new Date(Date.UTC(2026, 0, 2, 0, 0, 0)).toISOString());
  });
});

describe("resolveInitialNextRunUtc", () => {
  it("uses startsAt when it is not before now", () => {
    const starts = new Date(Date.UTC(2026, 5, 1, 10, 0, 0));
    const now = new Date(Date.UTC(2026, 4, 1, 0, 0, 0));
    const r = resolveInitialNextRunUtc({
      startsAtUtc: starts,
      nowUtc: now,
      frequency: "monthly",
      interval: 1,
      endsAtUtc: null
    });
    expect(r?.toISOString()).toBe(starts.toISOString());
  });

  it("advances from past startsAt until on or after now", () => {
    const starts = new Date(Date.UTC(2026, 0, 1, 0, 0, 0));
    const now = new Date(Date.UTC(2026, 0, 15, 0, 0, 0));
    const r = resolveInitialNextRunUtc({
      startsAtUtc: starts,
      nowUtc: now,
      frequency: "weekly",
      interval: 1,
      endsAtUtc: null
    });
    expect(r?.toISOString()).toBe(new Date(Date.UTC(2026, 0, 15, 0, 0, 0)).toISOString());
  });
});
