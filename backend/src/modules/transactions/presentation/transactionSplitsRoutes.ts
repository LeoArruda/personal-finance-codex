import fp from "fastify-plugin";
import { z } from "zod";
import {
  applyTransactionSplits,
  type TransactionSplitsRepository
} from "../application/transactionSplits";
import { PrismaTransactionSplitsRepository } from "../infrastructure/prismaTransactionSplitsRepository";

const splitInputSchema = z.object({
  categoryId: z.string().min(1).nullable().optional(),
  amountMinor: z.string().regex(/^-?\d+$/),
  description: z.string().max(500).optional(),
  sortOrder: z.number().int().optional()
});

const bodySchema = z.object({
  splits: z.array(splitInputSchema).min(1)
});

export const transactionSplitsRoutesPlugin = fp<{
  transactionSplitsRepository?: TransactionSplitsRepository;
}>(async (app, opts) => {
  const repository = opts.transactionSplitsRepository ?? new PrismaTransactionSplitsRepository();

  app.post(
    "/api/v1/transactions/:transactionId/splits",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      if (!request.userContext) {
        return reply.code(401).send({ message: "Unauthorized" });
      }

      const params = request.params as { transactionId?: string };
      if (!params.transactionId) {
        return reply.code(400).send({ message: "Invalid transaction id" });
      }

      const parsed = bodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ message: "Invalid request payload" });
      }

      const result = await applyTransactionSplits(
        repository,
        request.userContext.userId,
        params.transactionId,
        parsed.data.splits
      );
      if (result === null) {
        return reply.code(404).send({ message: "Transaction/category not found or invalid split total" });
      }

      return reply.code(201).send(result);
    }
  );

  app.put(
    "/api/v1/transactions/:transactionId/splits",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      if (!request.userContext) {
        return reply.code(401).send({ message: "Unauthorized" });
      }

      const params = request.params as { transactionId?: string };
      if (!params.transactionId) {
        return reply.code(400).send({ message: "Invalid transaction id" });
      }

      const parsed = bodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ message: "Invalid request payload" });
      }

      const result = await applyTransactionSplits(
        repository,
        request.userContext.userId,
        params.transactionId,
        parsed.data.splits
      );
      if (result === null) {
        return reply.code(404).send({ message: "Transaction/category not found or invalid split total" });
      }
      return result;
    }
  );
});
