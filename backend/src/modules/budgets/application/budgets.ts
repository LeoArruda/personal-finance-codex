export type BudgetSummary = {
  id: string;
  userId: string;
  name: string;
  currency: string;
  isDefault: boolean;
  status: "active" | "archived";
};

export type CreateBudgetInput = {
  name: string;
  currency?: string;
  isDefault?: boolean;
};

export type UpdateBudgetInput = {
  name?: string;
  currency?: string;
  status?: "active" | "archived";
};

export interface BudgetsRepository {
  listByUser(userId: string): Promise<BudgetSummary[]>;
  createForUser(userId: string, input: CreateBudgetInput): Promise<BudgetSummary>;
  updateForUser(
    userId: string,
    budgetId: string,
    input: UpdateBudgetInput
  ): Promise<BudgetSummary | null>;
  setDefaultForUser(userId: string, budgetId: string): Promise<BudgetSummary | null>;
}

export async function listBudgets(
  repository: BudgetsRepository,
  userId: string
): Promise<BudgetSummary[]> {
  return repository.listByUser(userId);
}

export async function createBudget(
  repository: BudgetsRepository,
  userId: string,
  input: CreateBudgetInput
): Promise<BudgetSummary> {
  return repository.createForUser(userId, input);
}

export async function updateBudget(
  repository: BudgetsRepository,
  userId: string,
  budgetId: string,
  input: UpdateBudgetInput
): Promise<BudgetSummary | null> {
  return repository.updateForUser(userId, budgetId, input);
}

export async function setDefaultBudget(
  repository: BudgetsRepository,
  userId: string,
  budgetId: string
): Promise<BudgetSummary | null> {
  return repository.setDefaultForUser(userId, budgetId);
}

