import { pickMatchingRule, type RuleCandidate } from "../domain/ruleMatch";

export type CategorizationRuleSummary = {
  id: string;
  userId: string;
  priority: number;
  payeeContains: string;
  categoryId: string;
};

export type CreateCategorizationRuleInput = {
  priority?: number;
  payeeContains: string;
  categoryId: string;
};

export type ApplyRulesResult =
  | { ok: true; categoryId: string; ruleId: string }
  | { ok: false; error: "transaction_not_found" | "no_match" | "category_mismatch" };

export interface TransactionCategorizationRulesRepository {
  listRules(userId: string): Promise<RuleCandidate[]>;
  createRule(userId: string, input: CreateCategorizationRuleInput): Promise<CategorizationRuleSummary | null>;
  getTransactionDescriptionAndCategory(
    userId: string,
    transactionId: string
  ): Promise<{ description: string; categoryId: string | null } | null>;
  setTransactionCategory(
    userId: string,
    transactionId: string,
    categoryId: string
  ): Promise<boolean>;
}

export async function createCategorizationRule(
  repository: TransactionCategorizationRulesRepository,
  userId: string,
  input: CreateCategorizationRuleInput
): Promise<CategorizationRuleSummary | null> {
  return repository.createRule(userId, input);
}

export async function listCategorizationRules(
  repository: TransactionCategorizationRulesRepository,
  userId: string
): Promise<CategorizationRuleSummary[]> {
  const rows = await repository.listRules(userId);
  return rows.map((r) => ({
    id: r.id,
    userId,
    priority: r.priority,
    payeeContains: r.payeeContains,
    categoryId: r.categoryId
  }));
}

export async function applyCategorizationRulesToTransaction(
  repository: TransactionCategorizationRulesRepository,
  userId: string,
  transactionId: string
): Promise<ApplyRulesResult> {
  const tx = await repository.getTransactionDescriptionAndCategory(userId, transactionId);
  if (!tx) {
    return { ok: false, error: "transaction_not_found" };
  }

  const rules = await repository.listRules(userId);
  const matched = pickMatchingRule(tx.description, rules);
  if (!matched) {
    return { ok: false, error: "no_match" };
  }

  const updated = await repository.setTransactionCategory(
    userId,
    transactionId,
    matched.categoryId
  );
  if (!updated) {
    return { ok: false, error: "category_mismatch" };
  }

  return { ok: true, categoryId: matched.categoryId, ruleId: matched.id };
}
