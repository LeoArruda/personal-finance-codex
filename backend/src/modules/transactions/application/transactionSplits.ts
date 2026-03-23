export type TransactionSplitInput = {
  categoryId?: string | null;
  amountMinor: string;
  description?: string;
  sortOrder?: number;
};

export type TransactionSplitSummary = {
  id: string;
  userId: string;
  transactionId: string;
  categoryId: string | null;
  amountMinor: string;
  description: string | null;
  sortOrder: number;
};

export interface TransactionSplitsRepository {
  getTransactionAmountMinor(userId: string, transactionId: string): Promise<string | null>;
  assertCategoriesOwnedByUser(userId: string, categoryIds: string[]): Promise<boolean>;
  replaceForTransaction(
    userId: string,
    transactionId: string,
    splits: TransactionSplitInput[]
  ): Promise<TransactionSplitSummary[] | null>;
}

export function validateSplitTotal(transactionAmountMinor: string, splits: TransactionSplitInput[]): boolean {
  const total = splits.reduce((acc, split) => acc + BigInt(split.amountMinor), BigInt(0));
  return total === BigInt(transactionAmountMinor);
}

export async function applyTransactionSplits(
  repository: TransactionSplitsRepository,
  userId: string,
  transactionId: string,
  splits: TransactionSplitInput[]
): Promise<TransactionSplitSummary[] | null> {
  const transactionAmountMinor = await repository.getTransactionAmountMinor(userId, transactionId);
  if (transactionAmountMinor === null) return null;

  const categoryIds = splits
    .map((split) => split.categoryId)
    .filter((id): id is string => typeof id === "string" && id.length > 0);

  const categoriesOwned = await repository.assertCategoriesOwnedByUser(userId, categoryIds);
  if (!categoriesOwned) return null;

  if (!validateSplitTotal(transactionAmountMinor, splits)) return null;

  return repository.replaceForTransaction(userId, transactionId, splits);
}
