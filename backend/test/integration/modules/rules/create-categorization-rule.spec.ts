import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createTestApp } from "../../../helpers/createTestApp";
import {
  type CreateCategorizationRuleInput,
  type CategorizationRuleSummary,
  type TransactionCategorizationRulesRepository
} from "../../../../src/modules/rules/application/rules";
import { type RuleCandidate } from "../../../../src/modules/rules/domain/ruleMatch";

const userId = "user-1";

let rulesStore: RuleCandidate[] = [];

const fakeRulesRepository: TransactionCategorizationRulesRepository = {
  async listRules(uid: string): Promise<RuleCandidate[]> {
    if (uid !== userId) return [];
    return [...rulesStore];
  },
  async createRule(uid: string, input: CreateCategorizationRuleInput): Promise<CategorizationRuleSummary | null> {
    if (uid !== userId || input.categoryId !== "cat-1") return null;
    const r: RuleCandidate = {
      id: `rule-${rulesStore.length + 1}`,
      priority: input.priority ?? 0,
      payeeContains: input.payeeContains,
      categoryId: input.categoryId
    };
    rulesStore.push(r);
    return {
      id: r.id,
      userId: uid,
      priority: r.priority,
      payeeContains: r.payeeContains,
      categoryId: r.categoryId
    };
  },
  async getTransactionDescriptionAndCategory() {
    return null;
  },
  async setTransactionCategory() {
    return false;
  }
};

const app = await createTestApp(
  { JWT_SECRET: "test-secret" },
  { transactionCategorizationRulesRepository: fakeRulesRepository }
);

describe("POST /api/v1/transaction-categorization-rules", () => {
  afterAll(async () => {
    await app.close();
  });

  it("returns 404 when category not valid for user", async () => {
    const token = app.jwt.sign({ sub: userId });
    await request(app.server)
      .post("/api/v1/transaction-categorization-rules")
      .set("authorization", `Bearer ${token}`)
      .send({ payeeContains: "Starbucks", categoryId: "wrong" })
      .expect(404);
  });

  it("creates a rule with 201", async () => {
    rulesStore = [];
    const token = app.jwt.sign({ sub: userId });
    const res = await request(app.server)
      .post("/api/v1/transaction-categorization-rules")
      .set("authorization", `Bearer ${token}`)
      .send({ payeeContains: "Starbucks", categoryId: "cat-1", priority: 10 })
      .expect(201);

    expect(res.body).toMatchObject({
      payeeContains: "Starbucks",
      categoryId: "cat-1",
      priority: 10
    });
  });
});
