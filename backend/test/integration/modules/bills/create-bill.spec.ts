import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createTestApp } from "../../../helpers/createTestApp";
import {
  type BillSummary,
  type BillsRepository,
  type CreateBillInput,
  type CreateBillResult,
  type PayBillResult
} from "../../../../src/modules/bills/application/bills";

const userId = "user-1";

const sampleBill: BillSummary = {
  id: "bill-1",
  userId,
  fromAccountId: "acc-1",
  categoryId: null,
  statementId: null,
  payeeName: "Power Co",
  amountMinor: "12500",
  currency: "CAD",
  dueDate: "2026-04-15",
  status: "pending",
  paidAt: null,
  paidTransactionId: null,
  notes: null
};

const fakeBillsRepository: BillsRepository = {
  async createBill(uid: string, input: CreateBillInput): Promise<CreateBillResult> {
    if (uid !== userId) return { ok: false, error: "account_not_found" };
    if (input.fromAccountId !== "acc-1") return { ok: false, error: "account_not_found" };
    if (input.categoryId && input.categoryId !== "cat-1") {
      return { ok: false, error: "category_not_found" };
    }
    return {
      ok: true,
      bill: {
        ...sampleBill,
        fromAccountId: input.fromAccountId,
        payeeName: input.payeeName,
        amountMinor: input.amountMinor,
        dueDate: input.dueDate,
        categoryId: input.categoryId ?? null,
        statementId: input.statementId ?? null
      }
    };
  },
  async payBill(): Promise<PayBillResult> {
    return { ok: false, error: "bill_not_found" };
  }
};

const app = await createTestApp(
  { JWT_SECRET: "test-secret" },
  { billsRepository: fakeBillsRepository }
);

describe("POST /api/v1/bills", () => {
  afterAll(async () => {
    await app.close();
  });

  it("returns 401 when missing token", async () => {
    await request(app.server)
      .post("/api/v1/bills")
      .send({
        fromAccountId: "acc-1",
        payeeName: "X",
        amountMinor: "100",
        dueDate: "2026-05-01"
      })
      .expect(401);
  });

  it("returns 400 for invalid payload", async () => {
    const token = app.jwt.sign({ sub: userId });
    await request(app.server)
      .post("/api/v1/bills")
      .set("authorization", `Bearer ${token}`)
      .send({ payeeName: "x" })
      .expect(400);
  });

  it("returns 404 when payment account is not found", async () => {
    const token = app.jwt.sign({ sub: userId });
    await request(app.server)
      .post("/api/v1/bills")
      .set("authorization", `Bearer ${token}`)
      .send({
        fromAccountId: "wrong",
        payeeName: "Rent",
        amountMinor: "50000",
        dueDate: "2026-06-01"
      })
      .expect(404);
  });

  it("creates a bill with 201", async () => {
    const token = app.jwt.sign({ sub: userId });
    const response = await request(app.server)
      .post("/api/v1/bills")
      .set("authorization", `Bearer ${token}`)
      .send({
        fromAccountId: "acc-1",
        categoryId: "cat-1",
        payeeName: "Internet",
        amountMinor: "7999",
        dueDate: "2026-07-10"
      })
      .expect(201);

    expect(response.body).toMatchObject({
      id: "bill-1",
      fromAccountId: "acc-1",
      categoryId: "cat-1",
      payeeName: "Internet",
      amountMinor: "7999",
      status: "pending",
      paidTransactionId: null
    });
  });
});
