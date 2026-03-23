export type CategoryGroupSummary = {
  id: string;
  userId: string;
  budgetId: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
};

export type CreateCategoryGroupInput = {
  name: string;
  description?: string;
  sortOrder?: number;
};

export interface CategoryGroupsRepository {
  listByBudget(userId: string, budgetId: string): Promise<CategoryGroupSummary[]>;
  createForBudget(
    userId: string,
    budgetId: string,
    input: CreateCategoryGroupInput
  ): Promise<CategoryGroupSummary | null>;
}

export async function listCategoryGroups(
  repository: CategoryGroupsRepository,
  userId: string,
  budgetId: string
): Promise<CategoryGroupSummary[]> {
  return repository.listByBudget(userId, budgetId);
}

export async function createCategoryGroup(
  repository: CategoryGroupsRepository,
  userId: string,
  budgetId: string,
  input: CreateCategoryGroupInput
): Promise<CategoryGroupSummary | null> {
  return repository.createForBudget(userId, budgetId, input);
}
