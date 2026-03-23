import fp from "fastify-plugin";
import { z } from "zod";
import { addGoalContribution, createGoal, type GoalsRepository } from "../application/goals";
import { PrismaGoalsRepository } from "../infrastructure/prismaGoalsRepository";

const goalTypeSchema = z.enum([
  "emergency_fund",
  "vacation",
  "vehicle",
  "home",
  "retirement",
  "education",
  "custom"
]);

const positiveMinorString = z
  .string()
  .regex(/^\d+$/)
  .refine((s) => {
    try {
      return BigInt(s) > 0n;
    } catch {
      return false;
    }
  }, "Must be a positive integer in minor units");

const createGoalBodySchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  type: goalTypeSchema,
  targetAmountMinor: positiveMinorString,
  currency: z.string().length(3).optional(),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  startedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  linkedAccountId: z.string().min(1).optional(),
  linkedCategoryId: z.string().min(1).optional(),
  notes: z.string().max(2000).optional()
});

const addContributionBodySchema = z.object({
  amountMinor: positiveMinorString,
  contributionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  accountId: z.string().min(1).optional(),
  transactionId: z.string().min(1).optional(),
  notes: z.string().max(2000).optional()
});

const goalIdParamSchema = z.object({
  goalId: z.string().min(1)
});

export const goalsRoutesPlugin = fp<{ goalsRepository?: GoalsRepository }>(async (app, opts) => {
  const repository = opts.goalsRepository ?? new PrismaGoalsRepository();

  app.post(
    "/api/v1/goals",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      if (!request.userContext) {
        return reply.code(401).send({ message: "Unauthorized" });
      }

      const parsed = createGoalBodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ message: "Invalid request payload" });
      }

      const result = await createGoal(repository, request.userContext.userId, parsed.data);
      if (!result.ok) {
        if (result.error === "linked_account_not_found") {
          return reply.code(404).send({ message: "Linked account not found" });
        }
        if (result.error === "linked_category_not_found") {
          return reply.code(404).send({ message: "Linked category not found" });
        }
        return reply.code(400).send({ message: "Invalid goal data" });
      }

      return reply.code(201).send(result.goal);
    }
  );

  app.post(
    "/api/v1/goals/:goalId/contributions",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      if (!request.userContext) {
        return reply.code(401).send({ message: "Unauthorized" });
      }

      const paramsParsed = goalIdParamSchema.safeParse(request.params);
      if (!paramsParsed.success) {
        return reply.code(400).send({ message: "Invalid goal id" });
      }

      const bodyParsed = addContributionBodySchema.safeParse(request.body);
      if (!bodyParsed.success) {
        return reply.code(400).send({ message: "Invalid request payload" });
      }

      const outcome = await addGoalContribution(
        repository,
        request.userContext.userId,
        paramsParsed.data.goalId,
        bodyParsed.data
      );

      if (!outcome.ok) {
        if (outcome.error === "goal_not_found") {
          return reply.code(404).send({ message: "Goal not found" });
        }
        if (outcome.error === "goal_not_active") {
          return reply.code(409).send({ message: "Goal does not accept contributions in its current state" });
        }
        if (outcome.error === "invalid_amount") {
          return reply.code(400).send({ message: "Invalid contribution amount" });
        }
        if (outcome.error === "account_not_found") {
          return reply.code(404).send({ message: "Account not found" });
        }
        if (outcome.error === "transaction_not_found") {
          return reply.code(404).send({ message: "Transaction not found" });
        }
        if (outcome.error === "transaction_account_mismatch") {
          return reply.code(400).send({ message: "Transaction and account do not match" });
        }
        return reply.code(400).send({ message: "Could not add contribution" });
      }

      return reply.code(201).send({
        contribution: outcome.contribution,
        goal: outcome.goal
      });
    }
  );
});
