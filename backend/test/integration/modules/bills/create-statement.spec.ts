import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createTestApp } from "../../../helpers/createTestApp";
import {
  type CreateCreditCardStatementInput,
  type CreditCardStatementSummary,
  type CreditCardStatementsRepository,
  type MarkPaidRepositoryResult
} from "../../../../src/modules/bills/application/creditCardStatements";

const userId = "user-1";

const baseStatement: CreditCardStatementSummary = {
  id: "stmt-1",
  userId,
  accountId: "acc-1",
  referenceYear: 2026,
  referenceMonth: 3,
  label: null,
  periodStart: "2026-03-01",
  periodEnd: "2026-03-31",
  closingDate: "2026-03-31",
  dueDate: "2026-04-25",
  openingBalanceMinor: "0",
  purchasesTotalMinor: "10000",
  paymentsTotalMinor: "0",
  adjustmentsTotalMinor: "0",
  interestTotalMinor: "0",
  feesTotalMinor: "0",
  closingBalanceMinor: "10000",
  minimumDueMinor: "2500",
  isClosed: false,
  isPaid: false,
  paidAt: null
};

const fakeStatementsRepository: CreditCardStatementsRepository = {
  async createStatement(uid: string, input: CreateCreditCardStatementInput) {
    if (uid !== userId) return { ok: false, error: "account_not_found" };
    if (input.accountId !== "acc-1") return { ok: false, error: "account_not_found" };
    if (input.referenceYear === 2025 && input.referenceMonth === 1) {
      return { ok: false, error: "duplicate_period" };
    }
    return {
      ok: true,
      statement: {
        ...baseStatement,
        accountId: input.accountId,
        referenceYear: input.referenceYear,
        referenceMonth: input.referenceMonth,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        closingDate: input.closingDate,
        dueDate: input.dueDate,
        label: input.label ?? null,
        minimumDueMinor: input.minimumDueMinor ?? null
      }
    };
  },
  async markPaid(): Promise<MarkPaidRepositoryResult> {
    return { status: "not_found" };
  }
};

const app = await createTestApp(
  { JWT_SECRET: "test-secret" },
  { creditCardStatementsRepository: fakeStatementsRepository }
);

describe("POST /api/v1/credit-card-statements", () => {
  afterAll(async () => {
    await app.close();
  });

  it("returns 401 when missing token", async () => {
    await request(app.server)
      .post("/api/v1/credit-card-statements")
      .send({
        accountId: "acc-1",
        referenceYear: 2026,
        referenceMonth: 4,
        periodStart: "2026-04-01",
        periodEnd: "2026-04-30",
        closingDate: "2026-04-30",
        dueDate: "2026-05-20"
      })
      .expect(401);
  });

  it("returns 400 for invalid payload", async () => {
    const token = app.jwt.sign({ sub: userId });
    await request(app.server)
      .post("/api/v1/credit-card-statements")
      .set("authorization", `Bearer ${token}`)
      .send({ accountId: "acc-1" })
      .expect(400);
  });

  it("returns 404 when account is not owned", async () => {
    const token = app.jwt.sign({ sub: userId });
    await request(app.server)
      .post("/api/v1/credit-card-statements")
      .set("authorization", `Bearer ${token}`)
      .send({
        accountId: "other-acc",
        referenceYear: 2026,
        referenceMonth: 4,
        periodStart: "2026-04-01",
        periodEnd: "2026-04-30",
        closingDate: "2026-04-30",
        dueDate: "2026-05-20"
      })
      .expect(404);
  });

  it("returns 409 when statement period already exists", async () => {
    const token = app.jwt.sign({ sub: userId });
    await request(app.server)
      .post("/api/v1/credit-card-statements")
      .set("authorization", `Bearer ${token}`)
      .send({
        accountId: "acc-1",
        referenceYear: 2025,
        referenceMonth: 1,
        periodStart: "2025-01-01",
        periodEnd: "2025-01-31",
        closingDate: "2025-01-31",
        dueDate: "2025-02-20"
      })
      .expect(409);
  });

  it("creates statement with 201", async () => {
    const token = app.jwt.sign({ sub: userId });
    const response = await request(app.server)
      .post("/api/v1/credit-card-statements")
      .set("authorization", `Bearer ${token}`)
      .send({
        accountId: "acc-1",
        referenceYear: 2026,
        referenceMonth: 4,
        periodStart: "2026-04-01",
        periodEnd: "2026-04-30",
        closingDate: "2026-04-30",
        dueDate: "2026-05-20",
        minimumDueMinor: "500"
      })
      .expect(201);

    expect(response.body).toMatchObject({
      id: "stmt-1",
      accountId: "acc-1",
      referenceYear: 2026,
      referenceMonth: 4,
      isPaid: false,
      paidAt: null,
      minimumDueMinor: "500"
    });
  });
});
