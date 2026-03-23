import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createTestApp } from "../../../helpers/createTestApp";
import {
  type CreateCreditCardStatementResult,
  type CreditCardStatementSummary,
  type CreditCardStatementsRepository,
  type MarkPaidRepositoryResult
} from "../../../../src/modules/bills/application/creditCardStatements";

const userId = "user-1";

let stmt: CreditCardStatementSummary = {
  id: "stmt-pay-1",
  userId,
  accountId: "acc-1",
  referenceYear: 2026,
  referenceMonth: 5,
  label: null,
  periodStart: "2026-05-01",
  periodEnd: "2026-05-31",
  closingDate: "2026-05-31",
  dueDate: "2026-06-20",
  openingBalanceMinor: "0",
  purchasesTotalMinor: "0",
  paymentsTotalMinor: "0",
  adjustmentsTotalMinor: "0",
  interestTotalMinor: "0",
  feesTotalMinor: "0",
  closingBalanceMinor: "0",
  minimumDueMinor: null,
  isClosed: false,
  isPaid: false,
  paidAt: null
};

const fakeStatementsRepository: CreditCardStatementsRepository = {
  async createStatement(): Promise<CreateCreditCardStatementResult> {
    return { ok: false, error: "account_not_found" };
  },
  async markPaid(uid: string, statementId: string): Promise<MarkPaidRepositoryResult> {
    if (uid !== userId) return { status: "not_found" };
    if (statementId !== stmt.id) return { status: "not_found" };
    if (stmt.isPaid) return { status: "already_paid" };

    const paidAt = new Date(Date.UTC(2026, 5, 1, 12, 0, 0)).toISOString();
    stmt = {
      ...stmt,
      isPaid: true,
      paidAt
    };
    return { status: "ok", statement: { ...stmt } };
  }
};

const app = await createTestApp(
  { JWT_SECRET: "test-secret" },
  { creditCardStatementsRepository: fakeStatementsRepository }
);

describe("POST /api/v1/credit-card-statements/:statementId/mark-paid", () => {
  afterAll(async () => {
    await app.close();
  });

  it("returns 401 when missing token", async () => {
    await request(app.server)
      .post("/api/v1/credit-card-statements/stmt-pay-1/mark-paid")
      .send({})
      .expect(401);
  });

  it("returns 404 for unknown statement", async () => {
    const token = app.jwt.sign({ sub: userId });
    await request(app.server)
      .post("/api/v1/credit-card-statements/missing/mark-paid")
      .set("authorization", `Bearer ${token}`)
      .send({})
      .expect(404);
  });

  it("marks statement paid and returns updated summary", async () => {
    stmt = {
      ...stmt,
      isPaid: false,
      paidAt: null
    };
    const token = app.jwt.sign({ sub: userId });
    const response = await request(app.server)
      .post("/api/v1/credit-card-statements/stmt-pay-1/mark-paid")
      .set("authorization", `Bearer ${token}`)
      .send({})
      .expect(200);

    expect(response.body.isPaid).toBe(true);
    expect(response.body.paidAt).toBeTruthy();
    expect(response.body.id).toBe("stmt-pay-1");
  });

  it("returns 409 when already paid", async () => {
    stmt = { ...stmt, isPaid: true, paidAt: "2026-06-01T12:00:00.000Z" };
    const token = app.jwt.sign({ sub: userId });
    await request(app.server)
      .post("/api/v1/credit-card-statements/stmt-pay-1/mark-paid")
      .set("authorization", `Bearer ${token}`)
      .send({})
      .expect(409);
  });
});
