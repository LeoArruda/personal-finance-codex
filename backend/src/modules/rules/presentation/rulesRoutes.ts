import fp from "fastify-plugin";
import { z } from "zod";
import {
  applyCategorizationRulesToTransaction,
  createCategorizationRule,
  listCategorizationRules,
  type TransactionCategorizationRulesRepository
} from "../application/rules";
import { PrismaTransactionCategorizationRulesRepository } from "../infrastructure/prismaTransactionCategorizationRulesRepository";

const createRuleBodySchema = z.object({
  priority: z.number().int().optional(),
  payeeContains: z.string().min(1).max(200),
  categoryId: z.string().min(1)
});

const transactionIdParams = z.object({
  transactionId: z.string().min(1)
});

export const rulesRoutesPlugin = fp<{
  transactionCategorizationRulesRepository?: TransactionCategorizationRulesRepository;
}>(async (app, opts) => {
  const repository =
    opts.transactionCategorizationRulesRepository ??
    new PrismaTransactionCategorizationRulesRepository();

  app.get(
    "/api/v1/transaction-categorization-rules",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      if (!request.userContext) {
        return reply.code(401).send({ message: "Unauthorized" });
      }
      const rules = await listCategorizationRules(repository, request.userContext.userId);
      return rules;
    }
  );

  app.post(
    "/api/v1/transaction-categorization-rules",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      if (!request.userContext) {
        return reply.code(401).send({ message: "Unauthorized" });
      }
      const parsed = createRuleBodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ message: "Invalid request payload" });
      }
      const created = await createCategorizationRule(
        repository,
        request.userContext.userId,
        parsed.data
      );
      if (!created) {
        return reply.code(404).send({ message: "Category not found or rule invalid" });
      }
      return reply.code(201).send(created);
    }
  );

  app.post(
    "/api/v1/transactions/:transactionId/apply-categorization-rules",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      if (!request.userContext) {
        return reply.code(401).send({ message: "Unauthorized" });
      }
      const paramsParsed = transactionIdParams.safeParse(request.params);
      if (!paramsParsed.success) {
        return reply.code(400).send({ message: "Invalid transaction id" });
      }
      const outcome = await applyCategorizationRulesToTransaction(
        repository,
        request.userContext.userId,
        paramsParsed.data.transactionId
      );
      if (!outcome.ok) {
        if (outcome.error === "transaction_not_found") {
          return reply.code(404).send({ message: "Transaction not found" });
        }
        if (outcome.error === "no_match") {
          return reply.code(404).send({ message: "No matching categorization rule" });
        }
        return reply.code(400).send({ message: "Could not apply categorization rule" });
      }
      return {
        categoryId: outcome.categoryId,
        appliedRuleId: outcome.ruleId
      };
    }
  );
});
