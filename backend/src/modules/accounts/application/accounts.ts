export type AccountKind =
  | "checking"
  | "savings"
  | "credit_card"
  | "cash"
  | "investment"
  | "loan"
  | "digital_wallet"
  | "prepaid_card"
  | "other";

export type AccountStatus = "active" | "archived" | "closed";

export type AccountSummary = {
  id: string;
  userId: string;
  name: string;
  kind: AccountKind;
  status: AccountStatus;
  currency: string;
  isOnBudget: boolean;
};

export type CreateAccountInput = {
  name: string;
  kind: AccountKind;
  currency?: string;
  isOnBudget?: boolean;
};

export type UpdateAccountInput = {
  name?: string;
  kind?: AccountKind;
  currency?: string;
  isOnBudget?: boolean;
  status?: "active" | "archived";
};

export interface AccountsRepository {
  listByUser(userId: string): Promise<AccountSummary[]>;
  createForUser(userId: string, input: CreateAccountInput): Promise<AccountSummary>;
  updateForUser(
    userId: string,
    accountId: string,
    input: UpdateAccountInput
  ): Promise<AccountSummary | null>;
}

export async function listAccounts(
  repository: AccountsRepository,
  userId: string
): Promise<AccountSummary[]> {
  return repository.listByUser(userId);
}

export async function createAccount(
  repository: AccountsRepository,
  userId: string,
  input: CreateAccountInput
): Promise<AccountSummary> {
  return repository.createForUser(userId, input);
}

export async function updateAccount(
  repository: AccountsRepository,
  userId: string,
  accountId: string,
  input: UpdateAccountInput
): Promise<AccountSummary | null> {
  return repository.updateForUser(userId, accountId, input);
}
