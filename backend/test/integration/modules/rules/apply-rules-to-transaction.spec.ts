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

const rules: RuleCandidate[] = [
  { id: "r1", priority: 5, payeeContains: "coffee", categoryId: "cat-1" },
  { id: "r2", priority: 10, payeeContains: "whole foods", categoryId: "cat-2" }
];

let lastCategorySet: { txId: string; categoryId: string } | null = null;

const fakeRulesRepository: TransactionCategorizationRulesRepository = {
  async listRules(uid: string) {
    return uid === userId ? [...rules] : [];
  },
  async createRule(): Promise<CategorizationRuleSummary | null> {
    return null;
  },
  async getTransactionDescriptionAndCategory(uid: string, transactionId: string) {
    if (uid !== userId || transactionId !== "tx-1") return null;
    return { description: "Whole Foods Market #12", categoryId: null };
  },
  async setTransactionCategory(uid: string, transactionId: string, categoryId: string) {
    if (uid !== userId) return false;
    lastCategorySet = { txId: transactionId, categoryId };
    return true;
  }
};

const app = await createTestApp(
  { JWT_SECRET: "test-secret" },
  { transactionCategorizationRulesRepository: fakeRulesRepository }
);

describe("POST /api/v1/transactions/:transactionId/apply-categorization-rules", () => {
  afterAll(async () => {
    await app.close();
  });

  it("applies higher-priority matching rule (idempotent category set)", async () => {
    lastCategorySet = null;
    const token = app.jwt.sign({ sub: userId });
    const res = await request(app.server)
      .post("/api/v1/transactions/tx-1/apply-categorization-rules")
      .set("authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body).toEqual({
      categoryId: "cat-2",
      appliedRuleId: "r2"
    });
    expect(lastCategorySet).toEqual({ txId: "tx-1", categoryId: "cat-2" });
  });

  it("returns 404 when no rule matches", async () => {
    const repo: TransactionCategorizationRulesRepository = {
      async listRules() {
        return [];
      },
      async createRule(): Promise<CategorizationRuleSummary | null> {
        return null;
      },
      async getTransactionDescriptionAndCategory() {
        return { description: "Unknown merchant", categoryId: null };
      },
      async setTransactionCategory() {
        return true;
      }
    };
    const localApp = await createTestApp(
      { JWT_SECRET: "test-secret" },
      { transactionCategorizationRulesRepository: repo }
    );
    const token = localApp.jwt.sign({ sub: userId });
    await request(localApp.server)
      .post("/api/v1/transactions/tx-1/apply-categorization-rules")
      .set("authorization", `Bearer ${token}`)
      .expect(404);
    await localApp.close();
  });
});
