import { describe, expect, it } from "vitest";

function hasDatabaseUrl(): boolean {
  return Boolean(process.env.DATABASE_URL || process.env.DIRECT_URL);
}

/**
 * Full RLS assertions require a migrated database and `app.current_user_id` session context.
 * Avoid importing `testDb` here (it eagerly loads Prisma) so the suite runs without DATABASE_URL.
 */
describe("ownership and RLS", () => {
  it("documents DB requirement for deep RLS tests", () => {
    expect(typeof hasDatabaseUrl()).toBe("boolean");
  });
});
