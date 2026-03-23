import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createTestApp } from "../../../helpers/createTestApp";
import {
  type TransactionSplitSummary,
  type TransactionSplitsRepository
} from "../../../../src/modules/transactions/application/transactionSplits";

const stored = new Map<string, TransactionSplitSummary[]>();

const fakeRepository: TransactionSplitsRepository = {
  async getTransactionAmountMinor(userId: string, transactionId: string) {
    if (userId === "user-1" && transactionId === "tx-1") return "-1000";
    return null;
  },
  async assertCategoriesOwnedByUser(userId: string, categoryIds: string[]) {
    if (userId !== "user-1") return false;
    return !categoryIds.includes("cat-x");
  },
  async replaceForTransaction(userId: string, transactionId: string, splits) {
    if (userId !== "user-1" || transactionId !== "tx-1") return null;
    const created = splits.map((split, idx) => ({
      id: `split-${idx + 1}`,
      userId,
      transactionId,
      categoryId: split.categoryId ?? null,
      amountMinor: split.amountMinor,
      description: split.description ?? null,
      sortOrder: split.sortOrder ?? idx
    }));
    stored.set(transactionId, created);
    return created;
  }
};

const app = await createTestApp(
  { JWT_SECRET: "test-secret" },
  { transactionSplitsRepository: fakeRepository }
);

describe("POST /api/v1/transactions/:transactionId/splits", () => {
  afterAll(async () => {
    await app.close();
  });

  it("returns 401 when missing token", async () => {
    await request(app.server)
      .post("/api/v1/transactions/tx-1/splits")
      .send({ splits: [{ categoryId: "cat-1", amountMinor: "-1000" }] })
      .expect(401);
  });

  it("returns 400 for invalid payload", async () => {
    const token = app.jwt.sign({ sub: "user-1" });
    await request(app.server)
      .post("/api/v1/transactions/tx-1/splits")
      .set("authorization", `Bearer ${token}`)
      .send({ splits: [] })
      .expect(400);
  });

  it("returns 404 for cross-user category in split", async () => {
    const token = app.jwt.sign({ sub: "user-1" });
    await request(app.server)
      .post("/api/v1/transactions/tx-1/splits")
      .set("authorization", `Bearer ${token}`)
      .send({ splits: [{ categoryId: "cat-x", amountMinor: "-1000" }] })
      .expect(404);
  });

  it("returns 404 when split total does not match transaction", async () => {
    const token = app.jwt.sign({ sub: "user-1" });
    await request(app.server)
      .post("/api/v1/transactions/tx-1/splits")
      .set("authorization", `Bearer ${token}`)
      .send({
        splits: [
          { categoryId: "cat-1", amountMinor: "-400" },
          { categoryId: "cat-2", amountMinor: "-500" }
        ]
      })
      .expect(404);
  });

  it("creates splits when references and total are valid", async () => {
    const token = app.jwt.sign({ sub: "user-1" });
    const response = await request(app.server)
      .post("/api/v1/transactions/tx-1/splits")
      .set("authorization", `Bearer ${token}`)
      .send({
        splits: [
          { categoryId: "cat-1", amountMinor: "-300", description: "A" },
          { categoryId: "cat-2", amountMinor: "-700", description: "B" }
        ]
      })
      .expect(201);

    expect(response.body).toHaveLength(2);
    expect(response.body[0]).toMatchObject({
      userId: "user-1",
      transactionId: "tx-1",
      categoryId: "cat-1",
      amountMinor: "-300"
    });
    expect(stored.get("tx-1")?.length).toBe(2);
  });
});
