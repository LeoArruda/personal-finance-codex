export type ConnectionSyncInput = {
  success?: boolean;
  errorCode?: string | null;
  errorMessage?: string | null;
};

export type ConnectionSyncSummary = {
  id: string;
  userId: string;
  lastAttemptAt: string | null;
  lastSuccessfulSyncAt: string | null;
  errorCode: string | null;
  errorMessage: string | null;
};

/** One provider line mapped to our ledger (non-transfer only for v1 import). */
export type ImportTransactionLine = {
  accountId: string;
  externalRef: string;
  amountMinor: string;
  transactionDate: string;
  description: string;
  type: "income" | "expense";
  categoryId?: string;
};

export type IngestImportedResult = {
  insertedCount: number;
  skippedCount: number;
};

export interface BankImportRepository {
  recordSyncAttempt(
    userId: string,
    connectionId: string,
    input: ConnectionSyncInput
  ): Promise<ConnectionSyncSummary | null>;
  ingestForConnection(
    userId: string,
    connectionId: string,
    lines: ImportTransactionLine[]
  ): Promise<IngestImportedResult | null>;
}

export async function syncConnection(
  repository: BankImportRepository,
  userId: string,
  connectionId: string,
  input: ConnectionSyncInput
): Promise<ConnectionSyncSummary | null> {
  return repository.recordSyncAttempt(userId, connectionId, input);
}

export async function ingestImportedTransactions(
  repository: BankImportRepository,
  userId: string,
  connectionId: string,
  lines: ImportTransactionLine[]
): Promise<IngestImportedResult | null> {
  return repository.ingestForConnection(userId, connectionId, lines);
}
