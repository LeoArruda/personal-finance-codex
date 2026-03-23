import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createTestApp } from "../../../helpers/createTestApp";
import {
  type CategoryGroupSummary,
  type CategoryGroupsRepository
} from "../../../../src/modules/categories/application/categoryGroups";

const userId = "user-1";

const fakeCategoryGroupsRepository: CategoryGroupsRepository = {
  async listByBudget(uid: string, budgetId: string): Promise<CategoryGroupSummary[]> {
    if (uid !== userId || budgetId !== "bud-1") return [];
    return [
      {
        id: "grp-1",
        userId,
        budgetId: "bud-1",
        name: "Bills",
        description: null,
        sortOrder: 0,
        isActive: true
      },
      {
        id: "grp-2",
        userId,
        budgetId: "bud-1",
        name: "Wants",
        description: "Fun",
        sortOrder: 1,
        isActive: true
      }
    ];
  },
  async createForBudget(): Promise<CategoryGroupSummary | null> {
    return null;
  }
};

const app = await createTestApp(
  { JWT_SECRET: "test-secret" },
  { categoryGroupsRepository: fakeCategoryGroupsRepository }
);

describe("GET /api/v1/budgets/:budgetId/category-groups", () => {
  afterAll(async () => {
    await app.close();
  });

  it("returns 401 without token", async () => {
    await request(app.server).get("/api/v1/budgets/bud-1/category-groups").expect(401);
  });

  it("returns groups sorted deterministically for the caller budget", async () => {
    const token = app.jwt.sign({ sub: userId });
    const res = await request(app.server)
      .get("/api/v1/budgets/bud-1/category-groups")
      .set("authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body).toHaveLength(2);
    expect(res.body[0].name).toBe("Bills");
    expect(res.body[1].name).toBe("Wants");
  });
});
