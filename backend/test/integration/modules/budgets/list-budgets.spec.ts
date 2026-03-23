import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createTestApp } from "../../../helpers/createTestApp";
import { type BudgetsRepository } from "../../../../src/modules/budgets/application/budgets";

const fakeBudgetsRepository: BudgetsRepository = {
  async listByUser(userId: string) {
    if (userId === "user-1") {
      return [
        {
          id: "budget-1",
          userId: "user-1",
          name: "Personal",
          currency: "CAD",
          isDefault: true,
          status: "active"
        }
      ];
    }

    if (userId === "user-2") {
      return [
        {
          id: "budget-2",
          userId: "user-2",
          name: "Family",
          currency: "USD",
          isDefault: false,
          status: "active"
        }
      ];
    }

    return [];
  },
  async createForUser() {
    throw new Error("not implemented in list-budgets test");
  },
  async updateForUser() {
    throw new Error("not implemented in list-budgets test");
  },
  async setDefaultForUser() {
    throw new Error("not implemented in list-budgets test");
  }
};

const app = await createTestApp(
  { JWT_SECRET: "test-secret" },
  { budgetsRepository: fakeBudgetsRepository }
);

describe("GET /api/v1/budgets", () => {
  afterAll(async () => {
    await app.close();
  });

  it("returns 401 when missing token", async () => {
    await request(app.server).get("/api/v1/budgets").expect(401);
  });

  it("returns only caller budgets for user-1", async () => {
    const token = app.jwt.sign({ sub: "user-1" });
    const response = await request(app.server)
      .get("/api/v1/budgets")
      .set("authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body).toEqual([
      {
        id: "budget-1",
        userId: "user-1",
        name: "Personal",
        currency: "CAD",
        isDefault: true,
        status: "active"
      }
    ]);
  });

  it("returns only caller budgets for user-2", async () => {
    const token = app.jwt.sign({ sub: "user-2" });
    const response = await request(app.server)
      .get("/api/v1/budgets")
      .set("authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body).toEqual([
      {
        id: "budget-2",
        userId: "user-2",
        name: "Family",
        currency: "USD",
        isDefault: false,
        status: "active"
      }
    ]);
  });
});

