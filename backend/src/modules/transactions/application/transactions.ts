export type TransactionType =
  | "income"
  | "expense"
  | "transfer"
  | "adjustment"
  | "bill_payment"
  | "refund";

export type TransactionStatus = "pending" | "posted" | "scheduled" | "voided";

export type TransactionSummary = {
  id: string;
  userId: string;
  accountId: string;
  categoryId: string | null;
  type: TransactionType;
  status: TransactionStatus;
  description: string;
  amountMinor: string;
  transactionDate: string;
};

export type ListTransactionsFilters = {
  accountId?: string;
  categoryId?: string;
  type?: TransactionType;
  fromDate?: string;
  toDate?: string;
};

export type CreateTransactionInput = {
  accountId: string;
  categoryId?: string;
  type: TransactionType;
  description: string;
  amountMinor: string;
  transactionDate: string;
};

export type UpdateTransactionInput = {
  categoryId?: string | null;
  type?: TransactionType;
  status?: TransactionStatus;
  description?: string;
  amountMinor?: string;
  transactionDate?: string;
};

export interface TransactionsRepository {
  assertAccountOwnedByUser(userId: string, accountId: string): Promise<boolean>;
  assertCategoryOwnedByUser(userId: string, categoryId: string): Promise<boolean>;
  listByUser(userId: string, filters: ListTransactionsFilters): Promise<TransactionSummary[]>;
  createForUser(userId: string, input: CreateTransactionInput): Promise<TransactionSummary>;
  updateForUser(
    userId: string,
    transactionId: string,
    input: UpdateTransactionInput
  ): Promise<TransactionSummary | null>;
}

export async function listTransactions(
  repository: TransactionsRepository,
  userId: string,
  filters: ListTransactionsFilters
): Promise<TransactionSummary[]> {
  return repository.listByUser(userId, filters);
}

export async function createTransaction(
  repository: TransactionsRepository,
  userId: string,
  input: CreateTransactionInput
): Promise<TransactionSummary | null> {
  const accountOwned = await repository.assertAccountOwnedByUser(userId, input.accountId);
  if (!accountOwned) return null;

  if (input.categoryId) {
    const categoryOwned = await repository.assertCategoryOwnedByUser(userId, input.categoryId);
    if (!categoryOwned) return null;
  }

  return repository.createForUser(userId, input);
}

export async function updateTransaction(
  repository: TransactionsRepository,
  userId: string,
  transactionId: string,
  input: UpdateTransactionInput
): Promise<TransactionSummary | null> {
  if (input.categoryId) {
    const categoryOwned = await repository.assertCategoryOwnedByUser(userId, input.categoryId);
    if (!categoryOwned) return null;
  }

  return repository.updateForUser(userId, transactionId, input);
}
