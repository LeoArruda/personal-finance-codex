import fp from "fastify-plugin";
import { z } from "zod";
import {
  createAccount,
  listAccounts,
  type AccountsRepository,
  updateAccount
} from "../application/accounts";
import { PrismaAccountsRepository } from "../infrastructure/prismaAccountsRepository";

const accountKindSchema = z.enum([
  "checking",
  "savings",
  "credit_card",
  "cash",
  "investment",
  "loan",
  "digital_wallet",
  "prepaid_card",
  "other"
]);

const createAccountBodySchema = z.object({
  name: z.string().min(1).max(120),
  kind: accountKindSchema,
  currency: z.string().length(3).optional(),
  isOnBudget: z.boolean().optional()
});

const updateAccountBodySchema = z.object({
  name: z.string().min(1).max(120).optional(),
  kind: accountKindSchema.optional(),
  currency: z.string().length(3).optional(),
  isOnBudget: z.boolean().optional(),
  status: z.enum(["active", "archived"]).optional()
});

export const accountsRoutesPlugin = fp<{ accountsRepository?: AccountsRepository }>(
  async (app, opts) => {
    const repository = opts.accountsRepository ?? new PrismaAccountsRepository();

    app.get("/api/v1/accounts", { preHandler: [app.authenticate] }, async (request, reply) => {
      if (!request.userContext) {
        return reply.code(401).send({ message: "Unauthorized" });
      }
      return listAccounts(repository, request.userContext.userId);
    });

    app.post("/api/v1/accounts", { preHandler: [app.authenticate] }, async (request, reply) => {
      if (!request.userContext) {
        return reply.code(401).send({ message: "Unauthorized" });
      }

      const parsed = createAccountBodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ message: "Invalid request payload" });
      }

      const created = await createAccount(repository, request.userContext.userId, parsed.data);
      return reply.code(201).send(created);
    });

    app.patch(
      "/api/v1/accounts/:accountId",
      { preHandler: [app.authenticate] },
      async (request, reply) => {
        if (!request.userContext) {
          return reply.code(401).send({ message: "Unauthorized" });
        }

        const params = request.params as { accountId?: string };
        if (!params.accountId) {
          return reply.code(400).send({ message: "Invalid account id" });
        }

        const parsed = updateAccountBodySchema.safeParse(request.body);
        if (!parsed.success) {
          return reply.code(400).send({ message: "Invalid request payload" });
        }

        const updated = await updateAccount(
          repository,
          request.userContext.userId,
          params.accountId,
          parsed.data
        );
        if (!updated) {
          return reply.code(404).send({ message: "Account not found" });
        }
        return updated;
      }
    );
  }
);
