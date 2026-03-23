import { describe, expect, it } from "vitest";
import { validateMoveBetweenCategories } from "../../../../../src/modules/budgeting/domain/categoryMove";

describe("validateMoveBetweenCategories", () => {
  it("rejects same source and destination", () => {
    expect(
      validateMoveBetweenCategories("cat-a", "cat-a", 500n, 100n)
    ).toEqual({ ok: false, reason: "same_category" });
  });

  it("rejects non-positive amount", () => {
    expect(
      validateMoveBetweenCategories("cat-a", "cat-b", 500n, 0n)
    ).toEqual({ ok: false, reason: "non_positive_amount" });
  });

  it("rejects when amount exceeds source available", () => {
    expect(
      validateMoveBetweenCategories("cat-a", "cat-b", 100n, 101n)
    ).toEqual({ ok: false, reason: "insufficient_source_available" });
  });

  it("allows valid move", () => {
    expect(
      validateMoveBetweenCategories("cat-a", "cat-b", 500n, 500n)
    ).toEqual({ ok: true });
    expect(
      validateMoveBetweenCategories("cat-a", "cat-b", 500n, 1n)
    ).toEqual({ ok: true });
  });
});
