import fp from "fastify-plugin";
import { z } from "zod";
import {
  ingestImportedTransactions,
  syncConnection,
  type BankImportRepository
} from "../application/imports";
import { PrismaBankImportRepository } from "../infrastructure/prismaBankImportRepository";

const connectionIdParams = z.object({
  connectionId: z.string().min(1)
});

const syncBodySchema = z.object({
  success: z.boolean().optional(),
  errorCode: z.string().max(100).nullable().optional(),
  errorMessage: z.string().max(2000).nullable().optional()
});

const importLineSchema = z.object({
  accountId: z.string().min(1),
  externalRef: z.string().min(1).max(512),
  amountMinor: z.string().min(1).max(32),
  transactionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().min(1).max(2000),
  type: z.enum(["income", "expense"]),
  categoryId: z.string().min(1).optional()
});

const importBodySchema = z.object({
  transactions: z.array(importLineSchema).min(1).max(500)
});

export const importsRoutesPlugin = fp<{
  bankImportRepository?: BankImportRepository;
}>(async (app, opts) => {
  const repo = opts.bankImportRepository ?? new PrismaBankImportRepository();

  app.post(
    "/api/v1/imports/connections/:connectionId/sync",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      if (!request.userContext) {
        return reply.code(401).send({ message: "Unauthorized" });
      }
      const paramsParsed = connectionIdParams.safeParse(request.params);
      if (!paramsParsed.success) {
        return reply.code(400).send({ message: "Invalid connection id" });
      }
      const bodyParsed = syncBodySchema.safeParse(request.body ?? {});
      if (!bodyParsed.success) {
        return reply.code(400).send({ message: "Invalid request payload" });
      }

      const updated = await syncConnection(
        repo,
        request.userContext.userId,
        paramsParsed.data.connectionId,
        {
          success: bodyParsed.data.success,
          errorCode: bodyParsed.data.errorCode,
          errorMessage: bodyParsed.data.errorMessage
        }
      );

      if (!updated) {
        return reply.code(404).send({ message: "Connection not found" });
      }

      return reply.code(200).send(updated);
    }
  );

  app.post(
    "/api/v1/imports/connections/:connectionId/transactions",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      if (!request.userContext) {
        return reply.code(401).send({ message: "Unauthorized" });
      }
      const paramsParsed = connectionIdParams.safeParse(request.params);
      if (!paramsParsed.success) {
        return reply.code(400).send({ message: "Invalid connection id" });
      }
      const bodyParsed = importBodySchema.safeParse(request.body);
      if (!bodyParsed.success) {
        return reply.code(400).send({ message: "Invalid request payload" });
      }

      try {
        const result = await ingestImportedTransactions(
          repo,
          request.userContext.userId,
          paramsParsed.data.connectionId,
          bodyParsed.data.transactions
        );
        if (!result) {
          return reply.code(404).send({ message: "Connection not found" });
        }
        return reply.code(201).send(result);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Import failed";
        return reply.code(400).send({ message });
      }
    }
  );
});
