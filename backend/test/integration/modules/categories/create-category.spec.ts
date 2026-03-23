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
  async createForUser(uid: string, input: CreateCategoryInput): Promise<CategorySummary | null> {
    if (uid !== userId) return null;
    if (input.budgetId !== "bud-1" || input.categoryGroupId !== "grp-1") return null;
    return {
      id: "cat-new",
      userId: uid,
      budgetId: input.budgetId,
      categoryGroupId: input.categoryGroupId,
      parentCategoryId: input.parentCategoryId ?? null,
      kind: input.kind ?? "expense",
      name: input.name,
      sortOrder: input.sortOrder ?? 0,
      isActive: true
    };
  },
  async updateForUser(): Promise<CategorySummary | null> {
    return null;
  }
};

const app = await createTestApp({ JWT_SECRET: "test-secret" }, { categoriesRepository: fakeCategoriesRepository });

describe("POST /api/v1/categories", () => {
  afterAll(async () => {
    await app.close();
  });

  it("returns 404 when group/budget mismatch for user", async () => {
    const token = app.jwt.sign({ sub: userId });
    await request(app.server)
      .post("/api/v1/categories")
      .set("authorization", `Bearer ${token}`)
      .send({
        budgetId: "bud-x",
        categoryGroupId: "grp-1",
        name: "Rent"
      })
      .expect(404);
  });

  it("creates a category with 201", async () => {
    const token = app.jwt.sign({ sub: userId });
    const res = await request(app.server)
      .post("/api/v1/categories")
      .set("authorization", `Bearer ${token}`)
      .send({
        budgetId: "bud-1",
        categoryGroupId: "grp-1",
        name: "Rent",
        kind: "expense"
      })
      .expect(201);

    expect(res.body).toMatchObject({
      id: "cat-new",
      name: "Rent",
      budgetId: "bud-1",
      categoryGroupId: "grp-1"
    });
  });
});
