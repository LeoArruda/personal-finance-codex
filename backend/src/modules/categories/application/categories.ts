export type CategoryKind = "income" | "expense" | "transfer" | "system";

export type CategorySummary = {
  id: string;
  userId: string;
  budgetId: string;
  categoryGroupId: string;
  parentCategoryId: string | null;
  kind: CategoryKind;
  name: string;
  sortOrder: number;
  isActive: boolean;
};

export type CreateCategoryInput = {
  budgetId: string;
  categoryGroupId: string;
  name: string;
  kind?: CategoryKind;
  parentCategoryId?: string;
  sortOrder?: number;
};

export type UpdateCategoryInput = {
  name?: string;
  isActive?: boolean;
  sortOrder?: number;
};

export interface CategoriesRepository {
  createForUser(userId: string, input: CreateCategoryInput): Promise<CategorySummary | null>;
  updateForUser(
    userId: string,
    categoryId: string,
    input: UpdateCategoryInput
  ): Promise<CategorySummary | null>;
}

export async function createCategory(
  repository: CategoriesRepository,
  userId: string,
  input: CreateCategoryInput
): Promise<CategorySummary | null> {
  return repository.createForUser(userId, input);
}

export async function updateCategory(
  repository: CategoriesRepository,
  userId: string,
  categoryId: string,
  input: UpdateCategoryInput
): Promise<CategorySummary | null> {
  return repository.updateForUser(userId, categoryId, input);
}
