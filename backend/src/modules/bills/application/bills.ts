import { type TransactionSummary } from "../../transactions/application/transactions";

export type BillStatus = "pending" | "paid" | "cancelled";

export type BillSummary = {
  id: string;
  userId: string;
  fromAccountId: string;
  categoryId: string | null;
  statementId: string | null;
  payeeName: string;
  amountMinor: string;
  currency: string;
  dueDate: string;
  status: BillStatus;
  paidAt: string | null;
  paidTransactionId: string | null;
  notes: string | null;
};

export type CreateBillInput = {
  fromAccountId: string;
  categoryId?: string;
  statementId?: string;
  payeeName: string;
  amountMinor: string;
  currency?: string;
  dueDate: string;
  notes?: string;
};

export type PayBillInput = {
  transactionDate?: string;
};

export type PayBillResult =
  | { ok: true; bill: BillSummary; transaction: TransactionSummary }
  | {
      ok: false;
      error: "bill_not_found" | "not_payable" | "invalid_amount";
    };

export type CreateBillResult =
  | { ok: true; bill: BillSummary }
  | { ok: false; error: "account_not_found" | "category_not_found" | "statement_not_found" | "invalid_input" };

export interface BillsRepository {
  createBill(userId: string, input: CreateBillInput): Promise<CreateBillResult>;
  payBill(userId: string, billId: string, input: PayBillInput): Promise<PayBillResult>;
}

export async function createBill(
  repository: BillsRepository,
  userId: string,
  input: CreateBillInput
): Promise<CreateBillResult> {
  return repository.createBill(userId, input);
}

export async function payBill(
  repository: BillsRepository,
  userId: string,
  billId: string,
  input: PayBillInput = {}
): Promise<PayBillResult> {
  return repository.payBill(userId, billId, input);
}
