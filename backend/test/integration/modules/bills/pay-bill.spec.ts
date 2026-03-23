import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createTestApp } from "../../../helpers/createTestApp";
import {
  type BillSummary,
  type BillsRepository,
  type CreateBillResult,
  type PayBillInput,
  type PayBillResult
} from "../../../../src/modules/bills/application/bills";
import { type TransactionSummary } from "../../../../src/modules/transactions/application/transactions";

const userId = "user-1";

let billState: BillSummary = {
  id: "bill-pay-1",
  userId,
  fromAccountId: "acc-1",
  categoryId: "cat-1",
  statementId: null,
  payeeName: "Water",
  amountMinor: "4500",
  currency: "CAD",
  dueDate: "2026-08-05",
  status: "pending",
  paidAt: null,
  paidTransactionId: null,
  notes: null
};

const fakeBillsRepository: BillsRepository = {
  async createBill(): Promise<CreateBillResult> {
    return { ok: false, error: "account_not_found" };
  },
  async payBill(uid: string, billId: string, input: PayBillInput): Promise<PayBillResult> {
    if (uid !== userId || billId !== billState.id) {
      return { ok: false, error: "bill_not_found" };
    }
    if (billState.status !== "pending") {
      return { ok: false, error: "not_payable" };
    }

    const txDate = input.transactionDate ?? billState.dueDate;
    const tx: TransactionSummary = {
      id: "tx-bill-1",
      userId: uid,
      accountId: billState.fromAccountId,
      categoryId: billState.categoryId,
      type: "bill_payment",
      status: "posted",
      description: `Bill payment: ${billState.payeeName}`,
      amountMinor: `-${billState.amountMinor}`,
      transactionDate: txDate
    };

    billState = {
      ...billState,
      status: "paid",
      paidAt: new Date(Date.UTC(2026, 7, 5, 15, 0, 0)).toISOString(),
      paidTransactionId: tx.id
    };

    return { ok: true, bill: { ...billState }, transaction: tx };
  }
};

const app = await createTestApp(
  { JWT_SECRET: "test-secret" },
  { billsRepository: fakeBillsRepository }
);

describe("POST /api/v1/bills/:billId/pay", () => {
  afterAll(async () => {
    await app.close();
  });

  it("returns 401 when missing token", async () => {
    await request(app.server).post("/api/v1/bills/bill-pay-1/pay").send({}).expect(401);
  });

  it("returns 404 for unknown bill", async () => {
    const token = app.jwt.sign({ sub: userId });
    await request(app.server)
      .post("/api/v1/bills/unknown/pay")
      .set("authorization", `Bearer ${token}`)
      .send({})
      .expect(404);
  });

  it("pays bill and returns bill + transaction", async () => {
    billState = {
      ...billState,
      status: "pending",
      paidAt: null,
      paidTransactionId: null
    };
    const token = app.jwt.sign({ sub: userId });
    const response = await request(app.server)
      .post("/api/v1/bills/bill-pay-1/pay")
      .set("authorization", `Bearer ${token}`)
      .send({ transactionDate: "2026-08-06" })
      .expect(200);

    expect(response.body.bill).toMatchObject({
      id: "bill-pay-1",
      status: "paid",
      paidTransactionId: "tx-bill-1"
    });
    expect(response.body.transaction).toMatchObject({
      type: "bill_payment",
      amountMinor: "-4500",
      transactionDate: "2026-08-06"
    });
  });

  it("returns 409 when bill is not payable", async () => {
    billState = { ...billState, status: "paid" };
    const token = app.jwt.sign({ sub: userId });
    await request(app.server)
      .post("/api/v1/bills/bill-pay-1/pay")
      .set("authorization", `Bearer ${token}`)
      .send({})
      .expect(409);
  });
});
