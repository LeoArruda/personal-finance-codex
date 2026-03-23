import { runInUserDbContext } from "../../../shared/db/userContext";
import {
  type CreateTransferInput,
  type ListTransfersFilters,
  type TransferLinkSummary,
  type TransfersRepository
} from "../application/transfers";

export class PrismaTransfersRepository implements TransfersRepository {
  async createTransfer(userId: string, input: CreateTransferInput): Promise<TransferLinkSummary | null> {
    return runInUserDbContext(userId, async (tx) => {
      const accounts = await tx.$queryRaw<Array<{ id: string; currency: string }>>`
        select id, currency
        from app.financial_accounts
        where user_id = ${userId}
          and id in (${input.sourceAccountId}::uuid, ${input.destinationAccountId}::uuid)
      `;

      if (accounts.length !== 2) return null;

      const sourceRow = accounts.find((a) => a.id === input.sourceAccountId);
      const destRow = accounts.find((a) => a.id === input.destinationAccountId);
      if (!sourceRow || !destRow || sourceRow.currency !== destRow.currency) return null;

      const currency = sourceRow.currency;
      const amount = BigInt(input.amountMinor);
      const fee = BigInt(input.feeAmountMinor ?? "0");
      const sourceOut = -(amount + fee);
      const description = input.description?.trim() || "Transfer";

      const sourceRows = await tx.$queryRaw<Array<{ id: string }>>`
        insert into app.transactions (
          user_id, budget_id, account_id, category_id, type, status, source, description, currency, amount_minor, transaction_date
        )
        values (
          ${userId},
          null,
          ${input.sourceAccountId},
          null,
          'transfer'::app.transaction_type,
          'posted',
          'manual',
          ${description},
          ${currency},
          ${sourceOut},
          ${input.transferDate}::date
        )
        returning id
      `;
      const sourceTxId = sourceRows[0]?.id;
      if (!sourceTxId) return null;

      const destRows = await tx.$queryRaw<Array<{ id: string }>>`
        insert into app.transactions (
          user_id, budget_id, account_id, category_id, type, status, source, description, currency, amount_minor, transaction_date
        )
        values (
          ${userId},
          null,
          ${input.destinationAccountId},
          null,
          'transfer'::app.transaction_type,
          'posted',
          'manual',
          ${description},
          ${currency},
          ${amount},
          ${input.transferDate}::date
        )
        returning id
      `;
      const destTxId = destRows[0]?.id;
      if (!destTxId) return null;

      const linkRows = await tx.$queryRaw<Array<{
        id: string;
        user_id: string;
        source_transaction_id: string;
        destination_transaction_id: string;
        source_account_id: string;
        destination_account_id: string;
        amount_minor: bigint;
        fee_amount_minor: bigint;
        transfer_date: Date;
      }>>`
        insert into app.transfer_links (
          user_id,
          source_transaction_id,
          destination_transaction_id,
          source_account_id,
          destination_account_id,
          amount_minor,
          fee_amount_minor,
          transfer_date
        )
        values (
          ${userId},
          ${sourceTxId},
          ${destTxId},
          ${input.sourceAccountId},
          ${input.destinationAccountId},
          ${amount},
          ${fee},
          ${input.transferDate}::date
        )
        returning
          id,
          user_id,
          source_transaction_id,
          destination_transaction_id,
          source_account_id,
          destination_account_id,
          amount_minor,
          fee_amount_minor,
          transfer_date
      `;

      const link = linkRows[0];
      if (!link) return null;

      return {
        id: link.id,
        userId: link.user_id,
        sourceTransactionId: link.source_transaction_id,
        destinationTransactionId: link.destination_transaction_id,
        sourceAccountId: link.source_account_id,
        destinationAccountId: link.destination_account_id,
        amountMinor: link.amount_minor.toString(),
        feeAmountMinor: link.fee_amount_minor.toString(),
        transferDate: link.transfer_date.toISOString().slice(0, 10)
      };
    });
  }

  async listByUser(userId: string, filters: ListTransfersFilters): Promise<TransferLinkSummary[]> {
    return runInUserDbContext(userId, async (tx) => {
      const rows = await tx.$queryRaw<Array<{
        id: string;
        user_id: string;
        source_transaction_id: string;
        destination_transaction_id: string;
        source_account_id: string;
        destination_account_id: string;
        amount_minor: bigint;
        fee_amount_minor: bigint;
        transfer_date: Date;
      }>>`
        select
          id,
          user_id,
          source_transaction_id,
          destination_transaction_id,
          source_account_id,
          destination_account_id,
          amount_minor,
          fee_amount_minor,
          transfer_date
        from app.transfer_links
        where user_id = ${userId}
          and (${filters.accountId ?? null}::uuid is null
            or source_account_id = ${filters.accountId ?? null}::uuid
            or destination_account_id = ${filters.accountId ?? null}::uuid)
          and (${filters.fromDate ?? null}::date is null or transfer_date >= ${filters.fromDate ?? null}::date)
          and (${filters.toDate ?? null}::date is null or transfer_date <= ${filters.toDate ?? null}::date)
        order by transfer_date desc, created_at desc
      `;

      return rows.map((row) => ({
        id: row.id,
        userId: row.user_id,
        sourceTransactionId: row.source_transaction_id,
        destinationTransactionId: row.destination_transaction_id,
        sourceAccountId: row.source_account_id,
        destinationAccountId: row.destination_account_id,
        amountMinor: row.amount_minor.toString(),
        feeAmountMinor: row.fee_amount_minor.toString(),
        transferDate: row.transfer_date.toISOString().slice(0, 10)
      }));
    });
  }
}
