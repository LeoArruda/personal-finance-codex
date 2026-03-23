import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createTestApp } from "../../../helpers/createTestApp";
import { type TransfersRepository } from "../../../../src/modules/transfers/application/transfers";

const linksForUser1 = [
  {
    id: "link-1",
    userId: "user-1",
    sourceTransactionId: "tx-a",
    destinationTransactionId: "tx-b",
    sourceAccountId: "acc-checking",
    destinationAccountId: "acc-savings",
    amountMinor: "5000",
    feeAmountMinor: "0",
    transferDate: "2026-03-01"
  },
  {
    id: "link-2",
    userId: "user-1",
    sourceTransactionId: "tx-c",
    destinationTransactionId: "tx-d",
    sourceAccountId: "acc-savings",
    destinationAccountId: "acc-brokerage",
    amountMinor: "10000",
    feeAmountMinor: "0",
    transferDate: "2026-03-15"
  }
];

const fakeTransfersRepository: TransfersRepository = {
  async createTransfer() {
    return null;
  },
  async listByUser(userId, filters) {
    if (userId !== "user-1") return [];
    return linksForUser1.filter((link) => {
      if (filters.accountId && link.sourceAccountId !== filters.accountId && link.destinationAccountId !== filters.accountId) {
        return false;
      }
      if (filters.fromDate && link.transferDate < filters.fromDate) return false;
      if (filters.toDate && link.transferDate > filters.toDate) return false;
      return true;
    });
  }
};

const app = await createTestApp(
  { JWT_SECRET: "test-secret" },
  { transfersRepository: fakeTransfersRepository }
);

describe("GET /api/v1/transfers", () => {
  afterAll(async () => {
    await app.close();
  });

  it("returns 401 when missing token", async () => {
    await request(app.server).get("/api/v1/transfers").expect(401);
  });

  it("returns only caller transfers", async () => {
    const token = app.jwt.sign({ sub: "user-1" });
    const response = await request(app.server)
      .get("/api/v1/transfers")
      .set("authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body).toHaveLength(2);
    expect(response.body.every((t: { userId: string }) => t.userId === "user-1")).toBe(true);
  });

  it("filters by account and date range", async () => {
    const token = app.jwt.sign({ sub: "user-1" });
    const response = await request(app.server)
      .get("/api/v1/transfers")
      .query({
        accountId: "acc-savings",
        fromDate: "2026-03-01",
        toDate: "2026-03-10"
      })
      .set("authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body).toEqual([
      expect.objectContaining({
        id: "link-1",
        sourceAccountId: "acc-checking",
        destinationAccountId: "acc-savings"
      })
    ]);
  });
});
