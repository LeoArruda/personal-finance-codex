import fp from "fastify-plugin";
import { z } from "zod";
import {
  createRecurringRule,
  runDueRecurringRules,
  type RecurringRulesRepository
} from "../application/recurringRules";
import { PrismaRecurringRulesRepository } from "../infrastructure/prismaRecurringRulesRepository";

const transactionTypeSchema = z.enum([
  "income",
  "expense",
  "transfer",
  "adjustment",
  "bill_payment",
  "refund"
]);

const recurrenceFrequencySchema = z.enum([
  "daily",
  "weekly",
  "monthly",
  "quarterly",
  "yearly",
  "custom"
]);

const createRecurringRuleBodySchema = z.object({
  name: z.string().min(1).max(200),
  accountId: z.string().min(1),
  categoryId: z.string().min(1).optional(),
  merchantId: z.string().min(1).optional(),
  descriptionTemplate: z.string().max(500).optional(),
  type: transactionTypeSchema,
  frequency: recurrenceFrequencySchema,
  interval: z.number().int().positive().optional(),
  amountMinor: z.string().regex(/^-?\d+$/),
  currency: z.string().length(3).optional(),
  startsAt: z.string().min(1),
  endsAt: z.string().min(1).optional(),
  dayOfMonth: z.number().int().min(1).max(31).optional(),
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  monthOfYear: z.number().int().min(1).max(12).optional(),
  autoCreate: z.boolean().optional(),
  autoPost: z.boolean().optional(),
  createDaysAhead: z.number().int().min(0).optional(),
  notes: z.string().max(2000).optional()
});

const runDueBodySchema = z.object({
  asOf: z.string().min(1).optional()
});

export const recurringRoutesPlugin = fp<{ recurringRulesRepository?: RecurringRulesRepository }>(
  async (app, opts) => {
    const repository = opts.recurringRulesRepository ?? new PrismaRecurringRulesRepository();

    app.post(
      "/api/v1/recurring-rules",
      { preHandler: [app.authenticate] },
      async (request, reply) => {
        if (!request.userContext) {
          return reply.code(401).send({ message: "Unauthorized" });
        }

        const parsed = createRecurringRuleBodySchema.safeParse(request.body);
        if (!parsed.success) {
          return reply.code(400).send({ message: "Invalid request payload" });
        }

        const created = await createRecurringRule(
          repository,
          request.userContext.userId,
          parsed.data
        );
        if (!created) {
          return reply
            .code(404)
            .send({ message: "Account, category, or merchant not found, or rule cannot be scheduled" });
        }
        return reply.code(201).send(created);
      }
    );

    app.post(
      "/api/v1/recurring-rules/run-due",
      { preHandler: [app.authenticate] },
      async (request, reply) => {
        if (!request.userContext) {
          return reply.code(401).send({ message: "Unauthorized" });
        }

        const parsed = runDueBodySchema.safeParse(request.body ?? {});
        if (!parsed.success) {
          return reply.code(400).send({ message: "Invalid request payload" });
        }

        const asOf = parsed.data.asOf ? new Date(parsed.data.asOf) : new Date();
        if (Number.isNaN(asOf.getTime())) {
          return reply.code(400).send({ message: "Invalid asOf datetime" });
        }

        const result = await runDueRecurringRules(repository, request.userContext.userId, asOf);
        return result;
      }
    );
  }
);
