import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createTestApp } from "../../../helpers/createTestApp";
import {
  type RecurringRulesRepository,
  type RunDueRecurringRulesResult
} from "../../../../src/modules/recurring/application/recurringRules";
import { type TransactionSummary } from "../../../../src/modules/transactions/application/transactions";

const userId = "user-1";

type DueRule = {
  id: string;
  nextRunAt: Date;
  amountMinor: string;
  accountId: string;
  autoPost: boolean;
};

let dueRules: DueRule[] = [];

const fakeRecurringRulesRepository: RecurringRulesRepository = {
  async createRule() {
    return null;
  },
  async runDueRules(uid: string, asOfUtc: Date): Promise<RunDueRecurringRulesResult> {
    if (uid !== userId) {
      return { createdTransactions: [], processedRuleIds: [] };
    }
    const created: TransactionSummary[] = [];
    const processed: string[] = [];
    const nextState: DueRule[] = [];

    for (const rule of dueRules) {
      if (rule.nextRunAt.getTime() <= asOfUtc.getTime()) {
        const txStatus: TransactionSummary["status"] = rule.autoPost ? "posted" : "scheduled";
        created.push({
          id: `tx-${rule.id}`,
          userId: uid,
          accountId: rule.accountId,
          categoryId: null,
          type: "expense",
          status: txStatus,
          description: "Recurring",
          amountMinor: rule.amountMinor,
          transactionDate: rule.nextRunAt.toISOString().slice(0, 10)
        });
        processed.push(rule.id);
        const nextRunAt = new Date(rule.nextRunAt.getTime());
        nextRunAt.setUTCDate(nextRunAt.getUTCDate() + 7);
        nextState.push({ ...rule, nextRunAt });
      } else {
        nextState.push(rule);
      }
    }

    dueRules = nextState;
    return { createdTransactions: created, processedRuleIds: processed };
  }
};

const app = await createTestApp(
  { JWT_SECRET: "test-secret" },
  { recurringRulesRepository: fakeRecurringRulesRepository }
);

describe("POST /api/v1/recurring-rules/run-due", () => {
  afterAll(async () => {
    await app.close();
  });

  it("returns 401 when missing token", async () => {
    await request(app.server).post("/api/v1/recurring-rules/run-due").send({}).expect(401);
  });

  it("returns empty result when nothing is due", async () => {
    dueRules = [];
    const token = app.jwt.sign({ sub: userId });
    const response = await request(app.server)
      .post("/api/v1/recurring-rules/run-due")
      .set("authorization", `Bearer ${token}`)
      .send({})
      .expect(200);

    expect(response.body).toEqual({
      createdTransactions: [],
      processedRuleIds: []
    });
  });

  it("runs due rules, returns transactions, and advances next run (fake state)", async () => {
    const firstRun = new Date(Date.UTC(2026, 2, 10, 8, 0, 0));
    dueRules = [
      {
        id: "r1",
        nextRunAt: new Date(firstRun.getTime()),
        amountMinor: "-2500",
        accountId: "acc-1",
        autoPost: true
      }
    ];

    const token = app.jwt.sign({ sub: userId });
    const asOf = new Date(Date.UTC(2026, 2, 10, 23, 0, 0)).toISOString();

    const response = await request(app.server)
      .post("/api/v1/recurring-rules/run-due")
      .set("authorization", `Bearer ${token}`)
      .send({ asOf })
      .expect(200);

    expect(response.body.processedRuleIds).toEqual(["r1"]);
    expect(response.body.createdTransactions).toHaveLength(1);
    expect(response.body.createdTransactions[0]).toMatchObject({
      id: "tx-r1",
      accountId: "acc-1",
      amountMinor: "-2500",
      status: "posted",
      transactionDate: "2026-03-10"
    });

    expect(dueRules[0]?.nextRunAt.toISOString()).toBe(
      new Date(Date.UTC(2026, 2, 17, 8, 0, 0)).toISOString()
    );
  });
});
