import { describe, expect, it } from "vitest";
import { extractUserIdFromJwtPayload } from "../../../../../src/modules/auth/presentation/authHook";

describe("extractUserIdFromJwtPayload", () => {
  it("returns user id when payload has a valid sub", () => {
    expect(extractUserIdFromJwtPayload({ sub: "user-123" })).toBe("user-123");
  });

  it("returns null when payload has no sub", () => {
    expect(extractUserIdFromJwtPayload({ email: "x@y.z" })).toBeNull();
  });

  it("returns null when payload is not an object", () => {
    expect(extractUserIdFromJwtPayload("invalid")).toBeNull();
  });
});

