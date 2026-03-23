import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createTestApp } from "../../../helpers/createTestApp";
import {
  type TransactionSummary,
  type TransactionsRepository
} from "../../../../src/modules/transactions/application/transactions";

const transactions = new Map<string, TransactionSummary>([
  [
    "tx-1",
    {
      id: "tx-1",
      userId: "user-1",
      accountId: "acc-1",
      categoryId: "cat-1",
      type: "expense",
      status: "posted",
      description: "Coffee",
      amountMinor: "-350",
      transactionDate: "2026-03-01"
    }
  ],
  [
    "tx-2",
    {
      id: "tx-2",
      userId: "user-2",
      accountId: "acc-2",
      categoryId: "cat-2",
      type: "expense",
      status: "posted",
      description: "Dinner",
      amountMinor: "-1200",
      transactionDate: "2026-03-01"
    }
  ]
]);

const fakeTransactionsRepository: TransactionsRepository = {
  async assertAccountOwnedByUser() {
    return true;
  },
  async assertCategoryOwnedByUser(userId: string, categoryId: string) {
    return !(userId === "user-1" && categoryId === "cat-2");
  },
  async listByUser() {
    return [...transactions.values()];
  },
  async createForUser() {
    throw new Error("not implemented in update-transaction test");
  },
  async updateForUser(userId, transactionId, input) {
    const current = transactions.get(transactionId);
    if (!current || current.userId !== userId) return null;
    const updated: TransactionSummary = {
      ...current,
      categoryId: input.categoryId !== undefined ? input.categoryId : current.categoryId,
      type: input.type ?? current.type,
      status: input.status ?? current.status,
      description: input.description ?? current.description,
      amountMinor: input.amountMinor ?? current.amountMinor,
      transactionDate: input.transactionDate ?? current.transactionDate
    };
    transactions.set(transactionId, updated);
    return updated;
  }
};

const app = await createTestApp(
  { JWT_SECRET: "test-secret" },
  { transactionsRepository: fakeTransactionsRepository }
);

describe("PATCH /api/v1/transactions/:transactionId", () => {
  afterAll(async () => {
    await app.close();
  });

  it("returns 401 when missing token", async () => {
    await request(app.server).patch("/api/v1/transactions/tx-1").send({ description: "x" }).expect(401);
  });

  it("returns 400 for invalid payload", async () => {
    const token = app.jwt.sign({ sub: "user-1" });
    await request(app.server)
      .patch("/api/v1/transactions/tx-1")
      .set("authorization", `Bearer ${token}`)
      .send({ amountMinor: "abc" })
      .expect(400);
  });

  it("returns 404 when category does not belong to caller", async () => {
    const token = app.jwt.sign({ sub: "user-1" });
    await request(app.server)
      .patch("/api/v1/transactions/tx-1")
      .set("authorization", `Bearer ${token}`)
      .send({ categoryId: "cat-2" })
      .expect(404);
  });

  it("returns 404 for cross-user transaction updates", async () => {
    const token = app.jwt.sign({ sub: "user-1" });
    await request(app.server)
      .patch("/api/v1/transactions/tx-2")
      .set("authorization", `Bearer ${token}`)
      .send({ description: "Should fail" })
      .expect(404);
  });

  it("updates transaction fields for owner", async () => {
    const token = app.jwt.sign({ sub: "user-1" });
    const response = await request(app.server)
      .patch("/api/v1/transactions/tx-1")
      .set("authorization", `Bearer ${token}`)
      .send({ description: "Coffee beans", amountMinor: "-1290", type: "expense" })
      .expect(200);

    expect(response.body).toMatchObject({
      id: "tx-1",
      userId: "user-1",
      description: "Coffee beans",
      amountMinor: "-1290",
      type: "expense"
    });
  });
});
