import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createTestApp } from "../../../helpers/createTestApp";
import { type TransactionsRepository } from "../../../../src/modules/transactions/application/transactions";

const fakeTransactionsRepository: TransactionsRepository = {
  async assertAccountOwnedByUser() {
    return true;
  },
  async assertCategoryOwnedByUser() {
    return true;
  },
  async listByUser(userId, filters) {
    const all = [
      {
        id: "tx-1",
        userId: "user-1",
        accountId: "acc-1",
        categoryId: "cat-1",
        type: "expense" as const,
        status: "posted" as const,
        description: "Coffee",
        amountMinor: "-350",
        transactionDate: "2026-03-01"
      },
      {
        id: "tx-2",
        userId: "user-1",
        accountId: "acc-2",
        categoryId: "cat-2",
        type: "income" as const,
        status: "posted" as const,
        description: "Salary",
        amountMinor: "250000",
        transactionDate: "2026-03-05"
      },
      {
        id: "tx-3",
        userId: "user-2",
        accountId: "acc-9",
        categoryId: "cat-9",
        type: "expense" as const,
        status: "posted" as const,
        description: "Other user tx",
        amountMinor: "-1000",
        transactionDate: "2026-03-02"
      }
    ].filter((t) => t.userId === userId);

    return all.filter((t) => {
      if (filters.accountId && t.accountId !== filters.accountId) return false;
      if (filters.categoryId && t.categoryId !== filters.categoryId) return false;
      if (filters.type && t.type !== filters.type) return false;
      if (filters.fromDate && t.transactionDate < filters.fromDate) return false;
      if (filters.toDate && t.transactionDate > filters.toDate) return false;
      return true;
    });
  },
  async createForUser() {
    throw new Error("not implemented in list-transactions test");
  },
  async updateForUser() {
    throw new Error("not implemented in list-transactions test");
  }
};

const app = await createTestApp(
  { JWT_SECRET: "test-secret" },
  { transactionsRepository: fakeTransactionsRepository }
);

describe("GET /api/v1/transactions", () => {
  afterAll(async () => {
    await app.close();
  });

  it("returns 401 when missing token", async () => {
    await request(app.server).get("/api/v1/transactions").expect(401);
  });

  it("returns user-scoped transactions only", async () => {
    const token = app.jwt.sign({ sub: "user-1" });
    const response = await request(app.server)
      .get("/api/v1/transactions")
      .set("authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body).toHaveLength(2);
    expect(response.body.every((t: { userId: string }) => t.userId === "user-1")).toBe(true);
  });

  it("applies filters account/category/type/date", async () => {
    const token = app.jwt.sign({ sub: "user-1" });
    const response = await request(app.server)
      .get("/api/v1/transactions")
      .query({
        accountId: "acc-1",
        categoryId: "cat-1",
        type: "expense",
        fromDate: "2026-03-01",
        toDate: "2026-03-02"
      })
      .set("authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body).toEqual([
      expect.objectContaining({
        id: "tx-1",
        accountId: "acc-1",
        categoryId: "cat-1",
        type: "expense",
        transactionDate: "2026-03-01"
      })
    ]);
  });
});
