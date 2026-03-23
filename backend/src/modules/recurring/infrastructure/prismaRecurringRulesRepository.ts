import { runInUserDbContext } from "../../../shared/db/userContext";
import {
  computeNextScheduledRunUtc,
  resolveInitialNextRunUtc,
  type RecurrenceFrequency
} from "../domain/generateRecurringTransactions";
import {
  type CreateRecurringRuleInput,
  type RecurringRuleStatus,
  type RecurringRuleSummary,
  type RecurringRulesRepository,
  type RunDueRecurringRulesResult
} from "../application/recurringRules";
import { type TransactionSummary } from "../../transactions/application/transactions";

function mapRuleRow(row: {
  id: string;
  user_id: string;
  account_id: string | null;
  category_id: string | null;
  merchant_id: string | null;
  name: string;
  description_template: string | null;
  type: TransactionSummary["type"];
  status: RecurringRuleStatus;
  frequency: RecurrenceFrequency;
  interval: number;
  amount_minor: bigint;
  currency: string;
  starts_at: Date;
  ends_at: Date | null;
  next_run_at: Date | null;
  last_run_at: Date | null;
  day_of_month: number | null;
  day_of_week: number | null;
  month_of_year: number | null;
  auto_create: boolean;
  auto_post: boolean;
  create_days_ahead: number;
}): RecurringRuleSummary {
  return {
    id: row.id,
    userId: row.user_id,
    accountId: row.account_id,
    categoryId: row.category_id,
    merchantId: row.merchant_id,
    name: row.name,
    descriptionTemplate: row.description_template,
    type: row.type,
    status: row.status,
    frequency: row.frequency,
    interval: row.interval,
    amountMinor: row.amount_minor.toString(),
    currency: row.currency,
    startsAt: row.starts_at.toISOString(),
    endsAt: row.ends_at?.toISOString() ?? null,
    nextRunAt: row.next_run_at?.toISOString() ?? null,
    lastRunAt: row.last_run_at?.toISOString() ?? null,
    dayOfMonth: row.day_of_month,
    dayOfWeek: row.day_of_week,
    monthOfYear: row.month_of_year,
    autoCreate: row.auto_create,
    autoPost: row.auto_post,
    createDaysAhead: row.create_days_ahead
  };
}

function mapTxRow(row: {
  id: string;
  user_id: string;
  account_id: string;
  category_id: string | null;
  type: TransactionSummary["type"];
  status: TransactionSummary["status"];
  description: string;
  amount_minor: bigint;
  transaction_date: Date;
}): TransactionSummary {
  return {
    id: row.id,
    userId: row.user_id,
    accountId: row.account_id,
    categoryId: row.category_id,
    type: row.type,
    status: row.status,
    description: row.description,
    amountMinor: row.amount_minor.toString(),
    transactionDate: row.transaction_date.toISOString().slice(0, 10)
  };
}

export class PrismaRecurringRulesRepository implements RecurringRulesRepository {
  async createRule(
    userId: string,
    input: CreateRecurringRuleInput,
    nowUtc: Date
  ): Promise<RecurringRuleSummary | null> {
    let amountMinor: bigint;
    try {
      amountMinor = BigInt(input.amountMinor);
    } catch {
      return null;
    }

    const startsAtUtc = new Date(input.startsAt);
    if (Number.isNaN(startsAtUtc.getTime())) {
      return null;
    }
    const endsAtUtc = input.endsAt ? new Date(input.endsAt) : null;
    if (input.endsAt && endsAtUtc && Number.isNaN(endsAtUtc.getTime())) {
      return null;
    }

    const interval = input.interval ?? 1;
    const nextRunUtc = resolveInitialNextRunUtc({
      startsAtUtc,
      nowUtc,
      frequency: input.frequency,
      interval,
      endsAtUtc
    });
    if (nextRunUtc === null) {
      return null;
    }

    return runInUserDbContext(userId, async (tx) => {
      const acctRows = await tx.$queryRaw<Array<{ id: string }>>`
        select id from app.financial_accounts
        where id = ${input.accountId}::uuid and user_id = ${userId}
        limit 1
      `;
      if (!acctRows[0]) return null;

      if (input.categoryId) {
        const catRows = await tx.$queryRaw<Array<{ id: string }>>`
          select id from app.categories
          where id = ${input.categoryId}::uuid and user_id = ${userId}
          limit 1
        `;
        if (!catRows[0]) return null;
      }

      if (input.merchantId) {
        const mRows = await tx.$queryRaw<Array<{ id: string }>>`
          select id from app.merchants
          where id = ${input.merchantId}::uuid and user_id = ${userId}
          limit 1
        `;
        if (!mRows[0]) return null;
      }

      const rows = await tx.$queryRaw<Array<{
        id: string;
        user_id: string;
        account_id: string | null;
        category_id: string | null;
        merchant_id: string | null;
        name: string;
        description_template: string | null;
        type: TransactionSummary["type"];
        status: RecurringRuleStatus;
        frequency: RecurrenceFrequency;
        interval: number;
        amount_minor: bigint;
        currency: string;
        starts_at: Date;
        ends_at: Date | null;
        next_run_at: Date | null;
        last_run_at: Date | null;
        day_of_month: number | null;
        day_of_week: number | null;
        month_of_year: number | null;
        auto_create: boolean;
        auto_post: boolean;
        create_days_ahead: number;
      }>>`
        insert into app.recurring_rules (
          user_id,
          account_id,
          category_id,
          merchant_id,
          name,
          description_template,
          type,
          status,
          frequency,
          interval,
          amount_minor,
          currency,
          starts_at,
          ends_at,
          next_run_at,
          last_run_at,
          day_of_month,
          day_of_week,
          month_of_year,
          auto_create,
          auto_post,
          create_days_ahead,
          notes
        )
        values (
          ${userId},
          ${input.accountId}::uuid,
          ${input.categoryId ?? null}::uuid,
          ${input.merchantId ?? null}::uuid,
          ${input.name},
          ${input.descriptionTemplate ?? null},
          ${input.type}::app.transaction_type,
          'active'::app.recurring_rule_status,
          ${input.frequency}::app.recurrence_frequency,
          ${interval},
          ${amountMinor},
          ${input.currency ?? "CAD"},
          ${startsAtUtc.toISOString()}::timestamptz,
          ${endsAtUtc ? endsAtUtc.toISOString() : null}::timestamptz,
          ${nextRunUtc.toISOString()}::timestamptz,
          null,
          ${input.dayOfMonth ?? null},
          ${input.dayOfWeek ?? null},
          ${input.monthOfYear ?? null},
          ${input.autoCreate ?? true},
          ${input.autoPost ?? false},
          ${input.createDaysAhead ?? 0},
          ${input.notes ?? null}
        )
        returning
          id,
          user_id,
          account_id,
          category_id,
          merchant_id,
          name,
          description_template,
          type,
          status,
          frequency,
          interval,
          amount_minor,
          currency,
          starts_at,
          ends_at,
          next_run_at,
          last_run_at,
          day_of_month,
          day_of_week,
          month_of_year,
          auto_create,
          auto_post,
          create_days_ahead
      `;

      const row = rows[0];
      if (!row) return null;
      return mapRuleRow(row);
    });
  }

  async runDueRules(userId: string, asOfUtc: Date): Promise<RunDueRecurringRulesResult> {
    return runInUserDbContext(userId, async (tx) => {
      const rules = await tx.$queryRaw<
        Array<{
          id: string;
          account_id: string;
          category_id: string | null;
          merchant_id: string | null;
          name: string;
          description_template: string | null;
          type: TransactionSummary["type"];
          frequency: RecurrenceFrequency;
          interval: number;
          amount_minor: bigint;
          currency: string;
          next_run_at: Date;
          ends_at: Date | null;
          auto_post: boolean;
        }>
      >`
        select
          id,
          account_id,
          category_id,
          merchant_id,
          name,
          description_template,
          type,
          frequency,
          interval,
          amount_minor,
          currency,
          next_run_at,
          ends_at,
          auto_post
        from app.recurring_rules
        where user_id = ${userId}
          and status = 'active'::app.recurring_rule_status
          and deleted_at is null
          and next_run_at is not null
          and next_run_at <= ${asOfUtc.toISOString()}::timestamptz
          and account_id is not null
        order by next_run_at asc
        for update
      `;

      const createdTransactions: TransactionSummary[] = [];
      const processedRuleIds: string[] = [];

      for (const rule of rules) {
        const firedAt = rule.next_run_at;
        const transactionDate = firedAt.toISOString().slice(0, 10);
        const description = rule.description_template ?? rule.name;
        const txStatus: TransactionSummary["status"] = rule.auto_post ? "posted" : "scheduled";

        const acctRows = await tx.$queryRaw<Array<{ currency: string }>>`
          select currency
          from app.financial_accounts
          where id = ${rule.account_id}
            and user_id = ${userId}
          limit 1
        `;
        const currency = acctRows[0]?.currency ?? rule.currency;

        const inserted = await tx.$queryRaw<
          Array<{
            id: string;
            user_id: string;
            account_id: string;
            category_id: string | null;
            type: TransactionSummary["type"];
            status: TransactionSummary["status"];
            description: string;
            amount_minor: bigint;
            transaction_date: Date;
          }>
        >`
          insert into app.transactions (
            user_id,
            budget_id,
            account_id,
            category_id,
            merchant_id,
            recurring_rule_id,
            type,
            status,
            source,
            description,
            currency,
            amount_minor,
            transaction_date,
            posted_at
          )
          values (
            ${userId},
            null,
            ${rule.account_id}::uuid,
            ${rule.category_id}::uuid,
            ${rule.merchant_id}::uuid,
            ${rule.id}::uuid,
            ${rule.type}::app.transaction_type,
            ${txStatus}::app.transaction_status,
            'system_generated'::app.transaction_source,
            ${description},
            ${currency},
            ${rule.amount_minor},
            ${transactionDate}::date,
            case when ${rule.auto_post} then now() else null end
          )
          returning id, user_id, account_id, category_id, type, status, description, amount_minor, transaction_date
        `;

        const txRow = inserted[0];
        if (!txRow) {
          continue;
        }
        createdTransactions.push(mapTxRow(txRow));
        processedRuleIds.push(rule.id);

        const nextRun = computeNextScheduledRunUtc({
          fromUtc: firedAt,
          frequency: rule.frequency,
          interval: rule.interval,
          endsAtUtc: rule.ends_at
        });

        if (nextRun === null) {
          await tx.$executeRaw`
            update app.recurring_rules
            set
              last_run_at = ${firedAt.toISOString()}::timestamptz,
              next_run_at = null,
              status = 'ended'::app.recurring_rule_status,
              updated_at = now()
            where id = ${rule.id}::uuid
              and user_id = ${userId}
          `;
        } else {
          await tx.$executeRaw`
            update app.recurring_rules
            set
              last_run_at = ${firedAt.toISOString()}::timestamptz,
              next_run_at = ${nextRun.toISOString()}::timestamptz,
              updated_at = now()
            where id = ${rule.id}::uuid
              and user_id = ${userId}
          `;
        }
      }

      return { createdTransactions, processedRuleIds };
    });
  }
}
