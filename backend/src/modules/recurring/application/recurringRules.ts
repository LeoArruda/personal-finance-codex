import { type RecurrenceFrequency } from "../domain/generateRecurringTransactions";
import { type TransactionSummary } from "../../transactions/application/transactions";

export type RecurringRuleStatus = "active" | "paused" | "ended" | "cancelled";

export type RecurringRuleSummary = {
  id: string;
  userId: string;
  accountId: string | null;
  categoryId: string | null;
  merchantId: string | null;
  name: string;
  descriptionTemplate: string | null;
  type: TransactionSummary["type"];
  status: RecurringRuleStatus;
  frequency: RecurrenceFrequency;
  interval: number;
  amountMinor: string;
  currency: string;
  startsAt: string;
  endsAt: string | null;
  nextRunAt: string | null;
  lastRunAt: string | null;
  dayOfMonth: number | null;
  dayOfWeek: number | null;
  monthOfYear: number | null;
  autoCreate: boolean;
  autoPost: boolean;
  createDaysAhead: number;
};

export type CreateRecurringRuleInput = {
  name: string;
  accountId: string;
  categoryId?: string;
  merchantId?: string;
  descriptionTemplate?: string;
  type: TransactionSummary["type"];
  frequency: RecurrenceFrequency;
  interval?: number;
  amountMinor: string;
  currency?: string;
  startsAt: string;
  endsAt?: string;
  dayOfMonth?: number;
  dayOfWeek?: number;
  monthOfYear?: number;
  autoCreate?: boolean;
  autoPost?: boolean;
  createDaysAhead?: number;
  notes?: string;
};

export type RunDueRecurringRulesResult = {
  createdTransactions: TransactionSummary[];
  processedRuleIds: string[];
};

export interface RecurringRulesRepository {
  createRule(
    userId: string,
    input: CreateRecurringRuleInput,
    nowUtc: Date
  ): Promise<RecurringRuleSummary | null>;
  runDueRules(userId: string, asOfUtc: Date): Promise<RunDueRecurringRulesResult>;
}

export async function createRecurringRule(
  repository: RecurringRulesRepository,
  userId: string,
  input: CreateRecurringRuleInput,
  nowUtc: Date = new Date()
): Promise<RecurringRuleSummary | null> {
  return repository.createRule(userId, input, nowUtc);
}

export async function runDueRecurringRules(
  repository: RecurringRulesRepository,
  userId: string,
  asOfUtc: Date = new Date()
): Promise<RunDueRecurringRulesResult> {
  return repository.runDueRules(userId, asOfUtc);
}
