export type TransferLinkSummary = {
  id: string;
  userId: string;
  sourceTransactionId: string;
  destinationTransactionId: string;
  sourceAccountId: string;
  destinationAccountId: string;
  amountMinor: string;
  feeAmountMinor: string;
  transferDate: string;
};

export type CreateTransferInput = {
  sourceAccountId: string;
  destinationAccountId: string;
  amountMinor: string;
  feeAmountMinor?: string;
  transferDate: string;
  description?: string;
};

export type ListTransfersFilters = {
  accountId?: string;
  fromDate?: string;
  toDate?: string;
};

export interface TransfersRepository {
  createTransfer(userId: string, input: CreateTransferInput): Promise<TransferLinkSummary | null>;
  listByUser(userId: string, filters: ListTransfersFilters): Promise<TransferLinkSummary[]>;
}

export function validateCreateTransferInput(input: CreateTransferInput): string | null {
  if (input.sourceAccountId === input.destinationAccountId) {
    return "Source and destination accounts must differ";
  }
  try {
    const amount = BigInt(input.amountMinor);
    if (amount <= 0n) return "Amount must be a positive integer (minor units)";
  } catch {
    return "Invalid amount";
  }
  try {
    const fee = BigInt(input.feeAmountMinor ?? "0");
    if (fee < 0n) return "Fee cannot be negative";
  } catch {
    return "Invalid fee";
  }
  return null;
}

export async function createTransfer(
  repository: TransfersRepository,
  userId: string,
  input: CreateTransferInput
): Promise<{ ok: true; transfer: TransferLinkSummary } | { ok: false; message: string }> {
  const validationError = validateCreateTransferInput(input);
  if (validationError) {
    return { ok: false, message: validationError };
  }

  const created = await repository.createTransfer(userId, input);
  if (!created) {
    return { ok: false, message: "Accounts not found or currency mismatch" };
  }
  return { ok: true, transfer: created };
}

export async function listTransfers(
  repository: TransfersRepository,
  userId: string,
  filters: ListTransfersFilters
): Promise<TransferLinkSummary[]> {
  return repository.listByUser(userId, filters);
}
