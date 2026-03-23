import { runInUserDbContext } from "../../../shared/db/userContext";
import {
  type BankImportRepository,
  type ConnectionSyncInput,
  type ConnectionSyncSummary,
  type ImportTransactionLine,
  type IngestImportedResult
} from "../application/imports";
import { parsePositiveMinorAmount } from "../domain/importLineValidation";

export class PrismaBankImportRepository implements BankImportRepository {
  async recordSyncAttempt(
    userId: string,
    connectionId: string,
    input: ConnectionSyncInput
  ): Promise<ConnectionSyncSummary | null> {
    return runInUserDbContext(userId, async (tx) => {
      const success = input.success === true;
      const errCode = input.errorCode ?? null;
      const errMsg = input.errorMessage ?? null;

      const rows = await tx.$queryRaw<
        Array<{
          id: string;
          user_id: string;
          last_attempt_at: Date | null;
          last_successful_sync_at: Date | null;
          error_code: string | null;
          error_message: string | null;
        }>
      >`
        update app.connections
        set
          last_attempt_at = now(),
          last_successful_sync_at = case
            when ${success} then now()
            else last_successful_sync_at
          end,
          error_code = case
            when ${success} then null
            else coalesce(${errCode}, error_code)
          end,
          error_message = case
            when ${success} then null
            else coalesce(${errMsg}, error_message)
          end,
          updated_at = now()
        where id = ${connectionId}::uuid
          and user_id = ${userId}
          and deleted_at is null
        returning id, user_id, last_attempt_at, last_successful_sync_at, error_code, error_message
      `;

      const r = rows[0];
      if (!r) return null;
      return mapConnectionRow(r);
    });
  }

  async ingestForConnection(
    userId: string,
    connectionId: string,
    lines: ImportTransactionLine[]
  ): Promise<IngestImportedResult | null> {
    return runInUserDbContext(userId, async (tx) => {
      const connRows = await tx.$queryRaw<Array<{ id: string }>>`
        select id from app.connections
        where id = ${connectionId}::uuid
          and user_id = ${userId}
          and deleted_at is null
        limit 1
      `;
      if (!connRows[0]) return null;

      let insertedCount = 0;
      let skippedCount = 0;

      for (const line of lines) {
        const amount = parsePositiveMinorAmount(line.amountMinor);
        if (amount === null) {
          throw new Error("Invalid amount_minor in import line");
        }

        const acctRows = await tx.$queryRaw<
          Array<{ id: string; currency: string; connection_id: string | null }>
        >`
          select id, currency, connection_id
          from app.financial_accounts
          where id = ${line.accountId}::uuid
            and user_id = ${userId}
            and deleted_at is null
          limit 1
        `;
        const acct = acctRows[0];
        if (!acct || acct.connection_id !== connectionId) {
          throw new Error("Account not linked to this connection for import");
        }

        if (line.categoryId) {
          const catOk = await tx.$queryRaw<Array<{ id: string }>>`
            select id from app.categories
            where id = ${line.categoryId}::uuid
              and user_id = ${userId}
              and deleted_at is null
            limit 1
          `;
          if (!catOk[0]) {
            throw new Error("Invalid category for import line");
          }
        }

        const ins = await tx.$queryRaw<Array<{ id: string }>>`
          insert into app.transactions (
            user_id,
            budget_id,
            account_id,
            category_id,
            type,
            status,
            source,
            description,
            currency,
            amount_minor,
            transaction_date,
            external_ref
          )
          select
            ${userId},
            null,
            ${line.accountId}::uuid,
            ${line.categoryId ?? null}::uuid,
            ${line.type}::app.transaction_type,
            'posted',
            'imported',
            ${line.description},
            ${acct.currency},
            ${amount},
            ${line.transactionDate}::date,
            ${line.externalRef}
          where not exists (
            select 1
            from app.transactions t
            where t.account_id = ${line.accountId}::uuid
              and t.external_ref = ${line.externalRef}
              and t.user_id = ${userId}
              and t.deleted_at is null
          )
          returning id
        `;

        if (ins[0]) {
          insertedCount += 1;
        } else {
          skippedCount += 1;
        }
      }

      return { insertedCount, skippedCount };
    });
  }
}

function mapConnectionRow(r: {
  id: string;
  user_id: string;
  last_attempt_at: Date | null;
  last_successful_sync_at: Date | null;
  error_code: string | null;
  error_message: string | null;
}): ConnectionSyncSummary {
  return {
    id: r.id,
    userId: r.user_id,
    lastAttemptAt: r.last_attempt_at ? r.last_attempt_at.toISOString() : null,
    lastSuccessfulSyncAt: r.last_successful_sync_at
      ? r.last_successful_sync_at.toISOString()
      : null,
    errorCode: r.error_code,
    errorMessage: r.error_message
  };
}
