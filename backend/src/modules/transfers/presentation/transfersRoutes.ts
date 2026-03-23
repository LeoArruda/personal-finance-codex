import fp from "fastify-plugin";
import { z } from "zod";
import { createTransfer, listTransfers, type TransfersRepository } from "../application/transfers";
import { PrismaTransfersRepository } from "../infrastructure/prismaTransfersRepository";

const createTransferBodySchema = z.object({
  sourceAccountId: z.string().min(1),
  destinationAccountId: z.string().min(1),
  amountMinor: z.string().regex(/^\d+$/),
  feeAmountMinor: z.string().regex(/^\d+$/).optional(),
  transferDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().min(1).max(500).optional()
});

const listTransfersQuerySchema = z.object({
  accountId: z.string().min(1).optional(),
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
});

export const transfersRoutesPlugin = fp<{ transfersRepository?: TransfersRepository }>(
  async (app, opts) => {
    const repository = opts.transfersRepository ?? new PrismaTransfersRepository();

    app.get("/api/v1/transfers", { preHandler: [app.authenticate] }, async (request, reply) => {
      if (!request.userContext) {
        return reply.code(401).send({ message: "Unauthorized" });
      }

      const parsed = listTransfersQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.code(400).send({ message: "Invalid query params" });
      }

      return listTransfers(repository, request.userContext.userId, parsed.data);
    });

    app.post("/api/v1/transfers", { preHandler: [app.authenticate] }, async (request, reply) => {
      if (!request.userContext) {
        return reply.code(401).send({ message: "Unauthorized" });
      }

      const parsed = createTransferBodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ message: "Invalid request payload" });
      }

      const result = await createTransfer(repository, request.userContext.userId, parsed.data);
      if (!result.ok) {
        const isInvariant =
          result.message.includes("must differ") ||
          result.message.includes("positive") ||
          result.message.includes("Invalid");
        return reply
          .code(isInvariant ? 400 : 404)
          .send({ message: result.message });
      }

      return reply.code(201).send(result.transfer);
    });
  }
);
