import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createTestApp } from "../../../helpers/createTestApp";
import {
  type CreateRecurringRuleInput,
  type RecurringRuleSummary,
  type RecurringRulesRepository,
  type RunDueRecurringRulesResult
} from "../../../../src/modules/recurring/application/recurringRules";

const userId = "user-1";

const sampleRule: RecurringRuleSummary = {
  id: "rule-1",
  userId,
  accountId: "acc-1",
  categoryId: "cat-1",
  merchantId: null,
  name: "Rent",
  descriptionTemplate: null,
  type: "expense",
  status: "active",
  frequency: "monthly",
  interval: 1,
  amountMinor: "-120000",
  currency: "CAD",
  startsAt: new Date(Date.UTC(2026, 0, 1, 0, 0, 0)).toISOString(),
  endsAt: null,
  nextRunAt: new Date(Date.UTC(2026, 0, 1, 0, 0, 0)).toISOString(),
  lastRunAt: null,
  dayOfMonth: null,
  dayOfWeek: null,
  monthOfYear: null,
  autoCreate: true,
  autoPost: false,
  createDaysAhead: 0
};

const fakeRecurringRulesRepository: RecurringRulesRepository = {
  async createRule(uid: string, input: CreateRecurringRuleInput, _nowUtc: Date) {
    if (uid !== userId) return null;
    if (input.accountId !== "acc-1") return null;
    if (input.categoryId && input.categoryId !== "cat-1") return null;
    return {
      ...sampleRule,
      name: input.name,
      accountId: input.accountId,
      categoryId: input.categoryId ?? null,
      type: input.type,
      frequency: input.frequency,
      amountMinor: input.amountMinor,
      startsAt: new Date(input.startsAt).toISOString()
    };
  },
  async runDueRules(): Promise<RunDueRecurringRulesResult> {
    return { createdTransactions: [], processedRuleIds: [] };
  }
};

const app = await createTestApp(
  { JWT_SECRET: "test-secret" },
  { recurringRulesRepository: fakeRecurringRulesRepository }
);

describe("POST /api/v1/recurring-rules", () => {
  afterAll(async () => {
    await app.close();
  });

  it("returns 401 when missing token", async () => {
    await request(app.server)
      .post("/api/v1/recurring-rules")
      .send({
        name: "Test",
        accountId: "acc-1",
        type: "expense",
        frequency: "monthly",
        amountMinor: "-100",
        startsAt: new Date(Date.UTC(2026, 6, 1)).toISOString()
      })
      .expect(401);
  });

  it("returns 400 for invalid payload", async () => {
    const token = app.jwt.sign({ sub: userId });
    await request(app.server)
      .post("/api/v1/recurring-rules")
      .set("authorization", `Bearer ${token}`)
      .send({ name: "" })
      .expect(400);
  });

  it("returns 404 when repository rejects ownership or references", async () => {
    const token = app.jwt.sign({ sub: userId });
    await request(app.server)
      .post("/api/v1/recurring-rules")
      .set("authorization", `Bearer ${token}`)
      .send({
        name: "Bad",
        accountId: "wrong-account",
        type: "expense",
        frequency: "daily",
        amountMinor: "-50",
        startsAt: new Date(Date.UTC(2026, 6, 1)).toISOString()
      })
      .expect(404);
  });

  it("creates a recurring rule with 201", async () => {
    const token = app.jwt.sign({ sub: userId });
    const startsAt = new Date(Date.UTC(2026, 8, 1, 12, 0, 0)).toISOString();
    const response = await request(app.server)
      .post("/api/v1/recurring-rules")
      .set("authorization", `Bearer ${token}`)
      .send({
        name: "Utilities",
        accountId: "acc-1",
        categoryId: "cat-1",
        type: "expense",
        frequency: "monthly",
        interval: 1,
        amountMinor: "-7500",
        startsAt
      })
      .expect(201);

    expect(response.body).toMatchObject({
      id: "rule-1",
      userId,
      accountId: "acc-1",
      categoryId: "cat-1",
      name: "Utilities",
      type: "expense",
      frequency: "monthly",
      amountMinor: "-7500",
      status: "active"
    });
    expect(response.body.startsAt).toBe(startsAt);
  });
});
