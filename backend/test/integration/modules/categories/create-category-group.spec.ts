import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createTestApp } from "../../../helpers/createTestApp";
import {
  type CategoryGroupSummary,
  type CategoryGroupsRepository,
  type CreateCategoryGroupInput
} from "../../../../src/modules/categories/application/categoryGroups";

const userId = "user-1";

const fakeCategoryGroupsRepository: CategoryGroupsRepository = {
  async listByBudget() {
    return [];
  },
  async createForBudget(
    uid: string,
    budgetId: string,
    input: CreateCategoryGroupInput
  ): Promise<CategoryGroupSummary | null> {
    if (uid !== userId || budgetId !== "bud-1") return null;
    return {
      id: "grp-new",
      userId: uid,
      budgetId,
      name: input.name,
      description: input.description ?? null,
      sortOrder: input.sortOrder ?? 0,
      isActive: true
    };
  }
};

const app = await createTestApp(
  { JWT_SECRET: "test-secret" },
  { categoryGroupsRepository: fakeCategoryGroupsRepository }
);

describe("POST /api/v1/budgets/:budgetId/category-groups", () => {
  afterAll(async () => {
    await app.close();
  });

  it("returns 404 when budget not owned", async () => {
    const token = app.jwt.sign({ sub: userId });
    await request(app.server)
      .post("/api/v1/budgets/wrong-budget/category-groups")
      .set("authorization", `Bearer ${token}`)
      .send({ name: "X" })
      .expect(404);
  });

  it("creates a category group with 201", async () => {
    const token = app.jwt.sign({ sub: userId });
    const res = await request(app.server)
      .post("/api/v1/budgets/bud-1/category-groups")
      .set("authorization", `Bearer ${token}`)
      .send({ name: "Savings", sortOrder: 3 })
      .expect(201);

    expect(res.body).toMatchObject({
      id: "grp-new",
      name: "Savings",
      sortOrder: 3,
      budgetId: "bud-1"
    });
  });
});
