import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp } from "../../../helpers/createTestApp";
import { type BankImportRepository } from "../../../../src/modules/imports/application/imports";

const userId = "user-1";
const connectionId = "conn-1";

const importedKeys = new Set<string>();

const fakeBankImportRepository: BankImportRepository = {
  async recordSyncAttempt() {
    return null;
  },
  async ingestForConnection(uid: string, connId: string, lines) {
    if (uid !== userId || connId !== connectionId) return null;
    let insertedCount = 0;
    let skippedCount = 0;
    for (const line of lines) {
      const key = `${line.accountId}:${line.externalRef}`;
      if (importedKeys.has(key)) {
        skippedCount += 1;
      } else {
        importedKeys.add(key);
        insertedCount += 1;
      }
    }
    return { insertedCount, skippedCount };
  }
};

const app = await createTestApp({ JWT_SECRET: "test-secret" }, { bankImportRepository: fakeBankImportRepository });

const samplePayload = {
  transactions: [
    {
      accountId: "acc-1",
      externalRef: "plaid-tx-1",
      amountMinor: "1099",
      transactionDate: "2025-03-01",
      description: "Coffee",
      type: "expense" as const
    },
    {
      accountId: "acc-1",
      externalRef: "plaid-tx-2",
      amountMinor: "2500",
      transactionDate: "2025-03-02",
      description: "Paycheck",
      type: "income" as const
    }
  ]
};

describe("POST /api/v1/imports/connections/:connectionId/transactions", () => {
  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    importedKeys.clear();
  });

  it("returns 401 without auth", async () => {
    await request(app.server)
      .post(`/api/v1/imports/connections/${connectionId}/transactions`)
      .send(samplePayload)
      .expect(401);
  });

  it("returns 404 when connection is not found for user", async () => {
    const token = app.jwt.sign({ sub: userId });
    await request(app.server)
      .post("/api/v1/imports/connections/wrong-id/transactions")
      .set("authorization", `Bearer ${token}`)
      .send(samplePayload)
      .expect(404);
  });

  it("inserts new provider lines on first ingest", async () => {
    const token = app.jwt.sign({ sub: userId });
    const res = await request(app.server)
      .post(`/api/v1/imports/connections/${connectionId}/transactions`)
      .set("authorization", `Bearer ${token}`)
      .send(samplePayload)
      .expect(201);

    expect(res.body).toEqual({ insertedCount: 2, skippedCount: 0 });
  });

  it("skips duplicate external_ref per account on second ingest (idempotent)", async () => {
    const token = app.jwt.sign({ sub: userId });
    await request(app.server)
      .post(`/api/v1/imports/connections/${connectionId}/transactions`)
      .set("authorization", `Bearer ${token}`)
      .send(samplePayload)
      .expect(201);

    const res = await request(app.server)
      .post(`/api/v1/imports/connections/${connectionId}/transactions`)
      .set("authorization", `Bearer ${token}`)
      .send(samplePayload)
      .expect(201);

    expect(res.body).toEqual({ insertedCount: 0, skippedCount: 2 });
  });
});
