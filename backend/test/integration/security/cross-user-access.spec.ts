import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createTestApp } from "../../helpers/createTestApp";
import {
  type CategoriesRepository,
  type CategorySummary,
  type UpdateCategoryInput
} from "../../../src/modules/categories/application/categories";

/**
 * API-layer ownership: another user's token must not mutate resources keyed to user-1.
 */
const fakeCategoriesRepository: CategoriesRepository = {
  async createForUser() {
    return null;
  },
  async updateForUser(uid: string, categoryId: string, _input: UpdateCategoryInput) {
    if (uid !== "user-1" || categoryId !== "cat-owned-by-user-1") return null;
    return {
      id: categoryId,
      userId: "user-1",
      budgetId: "b1",
      categoryGroupId: "g1",
      parentCategoryId: null,
      kind: "expense" as const,
      name: "OK",
      sortOrder: 0,
      isActive: true
    } satisfies CategorySummary;
  }
};

const app = await createTestApp({ JWT_SECRET: "test-secret" }, { categoriesRepository: fakeCategoriesRepository });

describe("cross-user API access", () => {
  afterAll(async () => {
    await app.close();
  });

  it("returns 404 when user-2 attempts to PATCH user-1 category", async () => {
    const token = app.jwt.sign({ sub: "user-2" });
    await request(app.server)
      .patch("/api/v1/categories/cat-owned-by-user-1")
      .set("authorization", `Bearer ${token}`)
      .send({ name: "stolen" })
      .expect(404);
  });
});
