import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createTestApp } from "../../../helpers/createTestApp";
import {
  type CategoriesRepository,
  type CategorySummary,
  type CreateCategoryInput,
  type UpdateCategoryInput
} from "../../../../src/modules/categories/application/categories";

const userId = "user-1";

const fakeCategoriesRepository: CategoriesRepository = {
  async createForUser(): Promise<CategorySummary | null> {
    return null;
  },
  async updateForUser(
    uid: string,
    categoryId: string,
    input: UpdateCategoryInput
  ): Promise<CategorySummary | null> {
    if (uid !== userId || categoryId !== "cat-1") return null;
    return {
      id: categoryId,
      userId: uid,
      budgetId: "bud-1",
      categoryGroupId: "grp-1",
      parentCategoryId: null,
      kind: "expense",
      name: input.name ?? "Old",
      sortOrder: input.sortOrder ?? 0,
      isActive: input.isActive ?? true
    };
  }
};

const app = await createTestApp({ JWT_SECRET: "test-secret" }, { categoriesRepository: fakeCategoriesRepository });

describe("PATCH /api/v1/categories/:categoryId", () => {
  afterAll(async () => {
    await app.close();
  });

  it("returns 404 for another user category", async () => {
    const token = app.jwt.sign({ sub: "user-2" });
    await request(app.server)
      .patch("/api/v1/categories/cat-1")
      .set("authorization", `Bearer ${token}`)
      .send({ name: "Hacked" })
      .expect(404);
  });

  it("updates category for owner", async () => {
    const token = app.jwt.sign({ sub: userId });
    const res = await request(app.server)
      .patch("/api/v1/categories/cat-1")
      .set("authorization", `Bearer ${token}`)
      .send({ name: "Groceries", isActive: false })
      .expect(200);

    expect(res.body).toMatchObject({
      id: "cat-1",
      name: "Groceries",
      isActive: false
    });
  });
});
