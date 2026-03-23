import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createTestApp } from "../../../helpers/createTestApp";
import {
  type TransferLinkSummary,
  type TransfersRepository
} from "../../../../src/modules/transfers/application/transfers";

let atomicCallCount = 0;

const fakeTransfersRepository: TransfersRepository = {
  async createTransfer(userId, input) {
    if (userId !== "user-1") return null;
    if (input.sourceAccountId === "acc-other-user") return null;
    if (input.sourceAccountId === input.destinationAccountId) return null;

    atomicCallCount += 1;
    const summary: TransferLinkSummary = {
      id: "link-1",
      userId,
      sourceTransactionId: "tx-out-1",
      destinationTransactionId: "tx-in-1",
      sourceAccountId: input.sourceAccountId,
      destinationAccountId: input.destinationAccountId,
      amountMinor: input.amountMinor,
      feeAmountMinor: input.feeAmountMinor ?? "0",
      transferDate: input.transferDate
    };
    return summary;
  },
  async listByUser() {
    return [];
  }
};

const app = await createTestApp(
  { JWT_SECRET: "test-secret" },
  { transfersRepository: fakeTransfersRepository }
);

describe("POST /api/v1/transfers", () => {
  afterAll(async () => {
    await app.close();
  });

  it("returns 401 when missing token", async () => {
    await request(app.server)
      .post("/api/v1/transfers")
      .send({
        sourceAccountId: "acc-src",
        destinationAccountId: "acc-dst",
        amountMinor: "1000",
        transferDate: "2026-03-01"
      })
      .expect(401);
  });

  it("returns 400 for invalid payload", async () => {
    const token = app.jwt.sign({ sub: "user-1" });
    await request(app.server)
      .post("/api/v1/transfers")
      .set("authorization", `Bearer ${token}`)
      .send({
        sourceAccountId: "acc-src",
        destinationAccountId: "acc-dst",
        amountMinor: "-1",
        transferDate: "2026-03-01"
      })
      .expect(400);
  });

  it("returns 400 when source and destination are the same", async () => {
    const token = app.jwt.sign({ sub: "user-1" });
    const response = await request(app.server)
      .post("/api/v1/transfers")
      .set("authorization", `Bearer ${token}`)
      .send({
        sourceAccountId: "acc-x",
        destinationAccountId: "acc-x",
        amountMinor: "1000",
        transferDate: "2026-03-01"
      })
      .expect(400);

    expect(response.body.message).toContain("differ");
  });

  it("returns 404 when accounts are not usable for caller", async () => {
    const token = app.jwt.sign({ sub: "user-1" });
    await request(app.server)
      .post("/api/v1/transfers")
      .set("authorization", `Bearer ${token}`)
      .send({
        sourceAccountId: "acc-other-user",
        destinationAccountId: "acc-dst",
        amountMinor: "1000",
        transferDate: "2026-03-01"
      })
      .expect(404);
  });

  it("creates paired transfer link atomically (single repository call)", async () => {
    const before = atomicCallCount;
    const token = app.jwt.sign({ sub: "user-1" });
    const response = await request(app.server)
      .post("/api/v1/transfers")
      .set("authorization", `Bearer ${token}`)
      .send({
        sourceAccountId: "acc-src",
        destinationAccountId: "acc-dst",
        amountMinor: "2500",
        feeAmountMinor: "100",
        transferDate: "2026-03-10",
        description: "Move cash"
      })
      .expect(201);

    expect(atomicCallCount).toBe(before + 1);
    expect(response.body).toMatchObject({
      id: "link-1",
      userId: "user-1",
      sourceTransactionId: "tx-out-1",
      destinationTransactionId: "tx-in-1",
      sourceAccountId: "acc-src",
      destinationAccountId: "acc-dst",
      amountMinor: "2500",
      feeAmountMinor: "100",
      transferDate: "2026-03-10"
    });
  });
});
