import fp from "fastify-plugin";
import { z } from "zod";
import {
  createTransaction,
  listTransactions,
  type TransactionsRepository,
  updateTransaction
} from "../application/transactions";
import { PrismaTransactionsRepository } from "../infrastructure/prismaTransactionsRepository";

const transactionTypeSchema = z.enum([
  "income",
  "expense",
  "transfer",
  "adjustment",
  "bill_payment",
  "refund"
]);

const transactionStatusSchema = z.enum(["pending", "posted", "scheduled", "voided"]);

const createTransactionBodySchema = z.object({
  accountId: z.string().min(1),
  categoryId: z.string().min(1).optional(),
  type: transactionTypeSchema,
  description: z.string().min(1).max(500),
  amountMinor: z.string().regex(/^-?\d+$/),
  transactionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
});

const updateTransactionBodySchema = z.object({
  categoryId: z.string().min(1).nullable().optional(),
  type: transactionTypeSchema.optional(),
  status: transactionStatusSchema.optional(),
  description: z.string().min(1).max(500).optional(),
  amountMinor: z.string().regex(/^-?\d+$/).optional(),
  transactionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
});

const listTransactionsQuerySchema = z.object({
  accountId: z.string().min(1).optional(),
  categoryId: z.string().min(1).optional(),
  type: transactionTypeSchema.optional(),
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
});

export const transactionsRoutesPlugin = fp<{ transactionsRepository?: TransactionsRepository }>(
  async (app, opts) => {
    const repository = opts.transactionsRepository ?? new PrismaTransactionsRepository();

    app.get("/api/v1/transactions", { preHandler: [app.authenticate] }, async (request, reply) => {
      if (!request.userContext) {
        return reply.code(401).send({ message: "Unauthorized" });
      }

      const queryParsed = listTransactionsQuerySchema.safeParse(request.query);
      if (!queryParsed.success) {
        return reply.code(400).send({ message: "Invalid query params" });
      }

      return listTransactions(repository, request.userContext.userId, queryParsed.data);
    });

    app.post(
      "/api/v1/transactions",
      { preHandler: [app.authenticate] },
      async (request, reply) => {
        if (!request.userContext) {
          return reply.code(401).send({ message: "Unauthorized" });
        }

        const parsed = createTransactionBodySchema.safeParse(request.body);
        if (!parsed.success) {
          return reply.code(400).send({ message: "Invalid request payload" });
        }

        const created = await createTransaction(repository, request.userContext.userId, parsed.data);
        if (!created) {
          return reply.code(404).send({ message: "Account/category not found" });
        }
        return reply.code(201).send(created);
      }
    );

    app.patch(
      "/api/v1/transactions/:transactionId",
      { preHandler: [app.authenticate] },
      async (request, reply) => {
        if (!request.userContext) {
          return reply.code(401).send({ message: "Unauthorized" });
        }

        const params = request.params as { transactionId?: string };
        if (!params.transactionId) {
          return reply.code(400).send({ message: "Invalid transaction id" });
        }

        const parsed = updateTransactionBodySchema.safeParse(request.body);
        if (!parsed.success) {
          return reply.code(400).send({ message: "Invalid request payload" });
        }

        const updated = await updateTransaction(
          repository,
          request.userContext.userId,
          params.transactionId,
          parsed.data
        );
        if (!updated) {
          return reply.code(404).send({ message: "Transaction/category not found" });
        }
        return updated;
      }
    );
  }
);
