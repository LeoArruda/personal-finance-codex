import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createTestApp } from "../../../helpers/createTestApp";
import {
  type TransactionSummary,
  type TransactionsRepository
} from "../../../../src/modules/transactions/application/transactions";

const created: TransactionSummary[] = [];

const fakeTransactionsRepository: TransactionsRepository = {
  async assertAccountOwnedByUser(userId: string, accountId: string) {
    return userId === "user-1" && accountId === "acc-1";
  },
  async assertCategoryOwnedByUser(userId: string, categoryId: string) {
    return userId === "user-1" && categoryId === "cat-1";
  },
  async listByUser() {
    return created;
  },
  async createForUser(userId, input) {
    const tx: TransactionSummary = {
      id: `tx-${created.length + 1}`,
      userId,
      accountId: input.accountId,
      categoryId: input.categoryId ?? null,
      type: input.type,
      status: "posted",
      description: input.description,
      amountMinor: input.amountMinor,
      transactionDate: input.transactionDate
    };
    created.push(tx);
    return tx;
  },
  async updateForUser() {
    throw new Error("not implemented in create-transaction test");
  }
};

const app = await createTestApp(
  { JWT_SECRET: "test-secret" },
  { transactionsRepository: fakeTransactionsRepository }
);

describe("POST /api/v1/transactions", () => {
  afterAll(async () => {
    await app.close();
  });

  it("returns 401 when missing token", async () => {
    await request(app.server)
      .post("/api/v1/transactions")
      .send({
        accountId: "acc-1",
        type: "expense",
        description: "Coffee",
        amountMinor: "-350",
        transactionDate: "2026-03-01"
      })
      .expect(401);
  });

  it("returns 400 for invalid payload", async () => {
    const token = app.jwt.sign({ sub: "user-1" });
    await request(app.server)
      .post("/api/v1/transactions")
      .set("authorization", `Bearer ${token}`)
      .send({ description: "" })
      .expect(400);
  });

  it("returns 404 when account/category are not owned by user", async () => {
    const token = app.jwt.sign({ sub: "user-1" });
    await request(app.server)
      .post("/api/v1/transactions")
      .set("authorization", `Bearer ${token}`)
      .send({
        accountId: "acc-2",
        categoryId: "cat-2",
        type: "expense",
        description: "Coffee",
        amountMinor: "-350",
        transactionDate: "2026-03-01"
      })
      .expect(404);
  });

  it("creates transaction for owned references", async () => {
    const token = app.jwt.sign({ sub: "user-1" });
    const response = await request(app.server)
      .post("/api/v1/transactions")
      .set("authorization", `Bearer ${token}`)
      .send({
        accountId: "acc-1",
        categoryId: "cat-1",
        type: "expense",
        description: "Coffee",
        amountMinor: "-350",
        transactionDate: "2026-03-01"
      })
      .expect(201);

    expect(response.body).toEqual({
      id: "tx-1",
      userId: "user-1",
      accountId: "acc-1",
      categoryId: "cat-1",
      type: "expense",
      status: "posted",
      description: "Coffee",
      amountMinor: "-350",
      transactionDate: "2026-03-01"
    });
  });
});
