import { describe, expect, it } from "vitest";
import { parsePositiveMinorAmount } from "../../../../../src/modules/imports/domain/importLineValidation";

describe("parsePositiveMinorAmount", () => {
  it("parses zero and positive integers", () => {
    expect(parsePositiveMinorAmount("0")).toBe(0n);
    expect(parsePositiveMinorAmount("1")).toBe(1n);
    expect(parsePositiveMinorAmount("999999")).toBe(999999n);
  });

  it("rejects signed, decimals, and non-numeric strings", () => {
    expect(parsePositiveMinorAmount("-1")).toBeNull();
    expect(parsePositiveMinorAmount("12.5")).toBeNull();
    expect(parsePositiveMinorAmount("")).toBeNull();
    expect(parsePositiveMinorAmount("abc")).toBeNull();
  });
});
