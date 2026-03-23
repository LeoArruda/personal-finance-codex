import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createTestApp } from "../../../helpers/createTestApp";
import {
  type AccountsRepository,
  type AccountSummary
} from "../../../../src/modules/accounts/application/accounts";

const accounts = new Map<string, AccountSummary>([
  [
    "acc-1",
    {
      id: "acc-1",
      userId: "user-1",
      name: "Checking",
      kind: "checking",
      status: "active",
      currency: "CAD",
      isOnBudget: true
    }
  ],
  [
    "acc-2",
    {
      id: "acc-2",
      userId: "user-2",
      name: "Family Savings",
      kind: "savings",
      status: "active",
      currency: "USD",
      isOnBudget: true
    }
  ]
]);

const fakeAccountsRepository: AccountsRepository = {
  async listByUser(userId) {
    return [...accounts.values()].filter((a) => a.userId === userId);
  },
  async createForUser() {
    throw new Error("not implemented in update-account test");
  },
  async updateForUser(userId, accountId, input) {
    const current = accounts.get(accountId);
    if (!current || current.userId !== userId) return null;

    const updated: AccountSummary = {
      ...current,
      name: input.name ?? current.name,
      kind: input.kind ?? current.kind,
      status: input.status ?? current.status,
      currency: input.currency ?? current.currency,
      isOnBudget: input.isOnBudget ?? current.isOnBudget
    };
    accounts.set(accountId, updated);
    return updated;
  }
};

const app = await createTestApp(
  { JWT_SECRET: "test-secret" },
  { accountsRepository: fakeAccountsRepository }
);

describe("PATCH /api/v1/accounts/:accountId", () => {
  afterAll(async () => {
    await app.close();
  });

  it("returns 401 when missing token", async () => {
    await request(app.server).patch("/api/v1/accounts/acc-1").send({ name: "Updated" }).expect(401);
  });

  it("returns 400 for invalid payload", async () => {
    const token = app.jwt.sign({ sub: "user-1" });
    await request(app.server)
      .patch("/api/v1/accounts/acc-1")
      .set("authorization", `Bearer ${token}`)
      .send({ name: "" })
      .expect(400);
  });

  it("returns 404 for cross-user update attempts", async () => {
    const token = app.jwt.sign({ sub: "user-1" });
    await request(app.server)
      .patch("/api/v1/accounts/acc-2")
      .set("authorization", `Bearer ${token}`)
      .send({ status: "archived" })
      .expect(404);
  });

  it("updates account and allows archive status", async () => {
    const token = app.jwt.sign({ sub: "user-1" });
    const response = await request(app.server)
      .patch("/api/v1/accounts/acc-1")
      .set("authorization", `Bearer ${token}`)
      .send({ name: "Main Checking", status: "archived", isOnBudget: false })
      .expect(200);

    expect(response.body).toEqual({
      id: "acc-1",
      userId: "user-1",
      name: "Main Checking",
      kind: "checking",
      status: "archived",
      currency: "CAD",
      isOnBudget: false
    });
  });
});
