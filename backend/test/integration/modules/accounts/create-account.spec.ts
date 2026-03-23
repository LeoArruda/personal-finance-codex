import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createTestApp } from "../../../helpers/createTestApp";
import {
  type AccountsRepository,
  type AccountSummary
} from "../../../../src/modules/accounts/application/accounts";

const createdAccounts: AccountSummary[] = [];

const fakeAccountsRepository: AccountsRepository = {
  async listByUser(userId: string) {
    return createdAccounts.filter((a) => a.userId === userId);
  },
  async createForUser(userId, input) {
    const created: AccountSummary = {
      id: `acc-${createdAccounts.length + 1}`,
      userId,
      name: input.name,
      kind: input.kind,
      status: "active",
      currency: input.currency ?? "CAD",
      isOnBudget: input.isOnBudget ?? true
    };
    createdAccounts.push(created);
    return created;
  },
  async updateForUser() {
    throw new Error("not implemented in create-account test");
  }
};

const app = await createTestApp(
  { JWT_SECRET: "test-secret" },
  { accountsRepository: fakeAccountsRepository }
);

describe("POST /api/v1/accounts", () => {
  afterAll(async () => {
    await app.close();
  });

  it("returns 401 when missing token", async () => {
    await request(app.server)
      .post("/api/v1/accounts")
      .send({ name: "Checking", kind: "checking" })
      .expect(401);
  });

  it("returns 400 for invalid payload", async () => {
    const token = app.jwt.sign({ sub: "user-1" });
    await request(app.server)
      .post("/api/v1/accounts")
      .set("authorization", `Bearer ${token}`)
      .send({ name: "", kind: "checking" })
      .expect(400);
  });

  it("creates account scoped to caller and stores on-budget flag", async () => {
    const token = app.jwt.sign({ sub: "user-1" });
    const response = await request(app.server)
      .post("/api/v1/accounts")
      .set("authorization", `Bearer ${token}`)
      .send({
        name: "Wallet",
        kind: "cash",
        currency: "USD",
        isOnBudget: false
      })
      .expect(201);

    expect(response.body).toEqual({
      id: "acc-1",
      userId: "user-1",
      name: "Wallet",
      kind: "cash",
      status: "active",
      currency: "USD",
      isOnBudget: false
    });
  });
});
