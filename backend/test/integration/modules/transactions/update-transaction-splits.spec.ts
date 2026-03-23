import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createTestApp } from "../../../helpers/createTestApp";
import {
  type TransactionSplitInput,
  type TransactionSplitSummary,
  type TransactionSplitsRepository
} from "../../../../src/modules/transactions/application/transactionSplits";

const stored = new Map<string, TransactionSplitSummary[]>([
  [
    "tx-1",
    [
      {
        id: "split-1",
        userId: "user-1",
        transactionId: "tx-1",
        categoryId: "cat-1",
        amountMinor: "-1000",
        description: null,
        sortOrder: 0
      }
    ]
  ]
]);

function cloneCurrent(transactionId: string): TransactionSplitSummary[] {
  return (stored.get(transactionId) ?? []).map((split) => ({ ...split }));
}

const fakeRepository: TransactionSplitsRepository = {
  async getTransactionAmountMinor(userId: string, transactionId: string) {
    if (userId === "user-1" && transactionId === "tx-1") return "-1000";
    return null;
  },
  async assertCategoriesOwnedByUser(userId: string, categoryIds: string[]) {
    if (userId !== "user-1") return false;
    return !categoryIds.includes("cat-x");
  },
  async replaceForTransaction(userId: string, transactionId: string, splits: TransactionSplitInput[]) {
    if (userId !== "user-1" || transactionId !== "tx-1") return null;

    const snapshot = cloneCurrent(transactionId);
    try {
      if (splits.some((split) => split.description === "force-failure")) {
        throw new Error("simulated failure in middle of replace");
      }

      const next = splits.map((split, idx) => ({
        id: `split-${idx + 1}`,
        userId,
        transactionId,
        categoryId: split.categoryId ?? null,
        amountMinor: split.amountMinor,
        description: split.description ?? null,
        sortOrder: split.sortOrder ?? idx
      }));
      stored.set(transactionId, next);
      return next;
    } catch {
      stored.set(transactionId, snapshot);
      return null;
    }
  }
};

const app = await createTestApp(
  { JWT_SECRET: "test-secret" },
  { transactionSplitsRepository: fakeRepository }
);

describe("PUT /api/v1/transactions/:transactionId/splits", () => {
  afterAll(async () => {
    await app.close();
  });

  it("returns 404 for unknown transaction", async () => {
    const token = app.jwt.sign({ sub: "user-1" });
    await request(app.server)
      .put("/api/v1/transactions/tx-999/splits")
      .set("authorization", `Bearer ${token}`)
      .send({ splits: [{ categoryId: "cat-1", amountMinor: "-1000" }] })
      .expect(404);
  });

  it("replaces transaction splits successfully", async () => {
    const token = app.jwt.sign({ sub: "user-1" });
    const response = await request(app.server)
      .put("/api/v1/transactions/tx-1/splits")
      .set("authorization", `Bearer ${token}`)
      .send({
        splits: [
          { categoryId: "cat-1", amountMinor: "-400" },
          { categoryId: "cat-2", amountMinor: "-600" }
        ]
      })
      .expect(200);

    expect(response.body).toHaveLength(2);
    expect(stored.get("tx-1")?.map((s) => s.amountMinor)).toEqual(["-400", "-600"]);
  });

  it("keeps previous splits when replace fails (atomic behavior)", async () => {
    const token = app.jwt.sign({ sub: "user-1" });
    const before = cloneCurrent("tx-1");

    await request(app.server)
      .put("/api/v1/transactions/tx-1/splits")
      .set("authorization", `Bearer ${token}`)
      .send({
        splits: [
          { categoryId: "cat-1", amountMinor: "-400", description: "force-failure" },
          { categoryId: "cat-2", amountMinor: "-600" }
        ]
      })
      .expect(404);

    expect(cloneCurrent("tx-1")).toEqual(before);
  });
});
