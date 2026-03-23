import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createTestApp } from "../../../helpers/createTestApp";
import { type AccountsRepository } from "../../../../src/modules/accounts/application/accounts";

const fakeAccountsRepository: AccountsRepository = {
  async listByUser(userId: string) {
    if (userId === "user-1") {
      return [
        {
          id: "acc-1",
          userId: "user-1",
          name: "Checking",
          kind: "checking",
          status: "active",
          currency: "CAD",
          isOnBudget: true
        }
      ];
    }
    if (userId === "user-2") {
      return [
        {
          id: "acc-2",
          userId: "user-2",
          name: "Brokerage",
          kind: "investment",
          status: "active",
          currency: "USD",
          isOnBudget: false
        }
      ];
    }
    return [];
  },
  async createForUser() {
    throw new Error("not implemented in list-accounts test");
  },
  async updateForUser() {
    throw new Error("not implemented in list-accounts test");
  }
};

const app = await createTestApp(
  { JWT_SECRET: "test-secret" },
  { accountsRepository: fakeAccountsRepository }
);

describe("GET /api/v1/accounts", () => {
  afterAll(async () => {
    await app.close();
  });

  it("returns 401 when missing token", async () => {
    await request(app.server).get("/api/v1/accounts").expect(401);
  });

  it("returns caller accounts only for user-1", async () => {
    const token = app.jwt.sign({ sub: "user-1" });
    const response = await request(app.server)
      .get("/api/v1/accounts")
      .set("authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body).toEqual([
      {
        id: "acc-1",
        userId: "user-1",
        name: "Checking",
        kind: "checking",
        status: "active",
        currency: "CAD",
        isOnBudget: true
      }
    ]);
  });

  it("returns caller accounts only for user-2", async () => {
    const token = app.jwt.sign({ sub: "user-2" });
    const response = await request(app.server)
      .get("/api/v1/accounts")
      .set("authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body).toEqual([
      {
        id: "acc-2",
        userId: "user-2",
        name: "Brokerage",
        kind: "investment",
        status: "active",
        currency: "USD",
        isOnBudget: false
      }
    ]);
  });
});
