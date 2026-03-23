import fp from "fastify-plugin";
import { z } from "zod";
import { assignMoneyToCategory, type BudgetAssignmentsRepository } from "../application/assignMoney";
import { moveMoneyBetweenCategories } from "../application/moveMoney";
import { openBudgetMonth, type BudgetMonthsRepository } from "../application/budgetMonths";
import { PrismaBudgetAssignmentsRepository } from "../infrastructure/prismaBudgetAssignmentsRepository";
import { PrismaBudgetMonthsRepository } from "../infrastructure/prismaBudgetMonthsRepository";

const budgetIdParamSchema = z.object({
  budgetId: z.string().min(1)
});

const monthKeyParamSchema = z.object({
  budgetId: z.string().min(1),
  monthKey: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/)
});

const openMonthBodySchema = z.object({
  monthKey: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/)
});

const assignMoneyBodySchema = z.object({
  categoryId: z.string().min(1),
  amountMinor: z.string().regex(/^\d+$/),
  notes: z.string().max(2000).optional()
});

const moveMoneyBodySchema = z.object({
  fromCategoryId: z.string().min(1),
  toCategoryId: z.string().min(1),
  amountMinor: z.string().regex(/^\d+$/),
  notes: z.string().max(2000).optional()
});

export type BudgetingRoutesOpts = {
  budgetMonthsRepository?: BudgetMonthsRepository;
  budgetAssignmentsRepository?: BudgetAssignmentsRepository;
};

export const budgetingRoutesPlugin = fp<BudgetingRoutesOpts>(async (app, opts) => {
  const budgetMonthsRepository = opts.budgetMonthsRepository ?? new PrismaBudgetMonthsRepository();
  const budgetAssignmentsRepository =
    opts.budgetAssignmentsRepository ?? new PrismaBudgetAssignmentsRepository();

  app.post(
      "/api/v1/budgets/:budgetId/months/open",
      { preHandler: [app.authenticate] },
      async (request, reply) => {
        if (!request.userContext) {
          return reply.code(401).send({ message: "Unauthorized" });
        }

        const paramsParsed = budgetIdParamSchema.safeParse(request.params);
        if (!paramsParsed.success) {
          return reply.code(400).send({ message: "Invalid budget id" });
        }

        const bodyParsed = openMonthBodySchema.safeParse(request.body);
        if (!bodyParsed.success) {
          return reply.code(400).send({ message: "Invalid request payload" });
        }

        const summary = await openBudgetMonth(
          budgetMonthsRepository,
          request.userContext.userId,
          paramsParsed.data.budgetId,
          bodyParsed.data.monthKey
        );

        if (!summary) {
          return reply.code(404).send({ message: "Budget not found" });
        }

        return reply.code(201).send(summary);
      }
  );

  app.get(
      "/api/v1/budgets/:budgetId/months/:monthKey",
      { preHandler: [app.authenticate] },
      async (request, reply) => {
        if (!request.userContext) {
          return reply.code(401).send({ message: "Unauthorized" });
        }

        const paramsParsed = monthKeyParamSchema.safeParse(request.params);
        if (!paramsParsed.success) {
          return reply.code(400).send({ message: "Invalid route parameters" });
        }

        const owned = await budgetMonthsRepository.assertBudgetOwnedByUser(
          request.userContext.userId,
          paramsParsed.data.budgetId
        );
        if (!owned) {
          return reply.code(404).send({ message: "Budget not found" });
        }

        const summary = await budgetMonthsRepository.getMonthSummary(
          request.userContext.userId,
          paramsParsed.data.budgetId,
          paramsParsed.data.monthKey
        );

        if (!summary) {
          return reply.code(404).send({ message: "Budget month not found" });
        }

        return summary;
      }
  );

  app.post(
      "/api/v1/budgets/:budgetId/months/:monthKey/assign",
      { preHandler: [app.authenticate] },
      async (request, reply) => {
        if (!request.userContext) {
          return reply.code(401).send({ message: "Unauthorized" });
        }

        const paramsParsed = monthKeyParamSchema.safeParse(request.params);
        if (!paramsParsed.success) {
          return reply.code(400).send({ message: "Invalid route parameters" });
        }

        const bodyParsed = assignMoneyBodySchema.safeParse(request.body);
        if (!bodyParsed.success) {
          return reply.code(400).send({ message: "Invalid request payload" });
        }

        const owned = await budgetMonthsRepository.assertBudgetOwnedByUser(
          request.userContext.userId,
          paramsParsed.data.budgetId
        );
        if (!owned) {
          return reply.code(404).send({ message: "Budget not found" });
        }

        const outcome = await assignMoneyToCategory(
          budgetAssignmentsRepository,
          request.userContext.userId,
          paramsParsed.data.budgetId,
          paramsParsed.data.monthKey,
          bodyParsed.data
        );

        if (outcome.ok === false) {
          if (outcome.error === "invalid_amount") {
            return reply.code(400).send({ message: "Invalid amount" });
          }
          if (outcome.error === "insufficient_ready_to_assign") {
            return reply.code(400).send({ message: "Insufficient ready to assign" });
          }
          return reply.code(404).send({ message: "Budget month or category not found" });
        }

        return reply.send(outcome.data);
      }
  );

  app.post(
      "/api/v1/budgets/:budgetId/months/:monthKey/move",
      { preHandler: [app.authenticate] },
      async (request, reply) => {
        if (!request.userContext) {
          return reply.code(401).send({ message: "Unauthorized" });
        }

        const paramsParsed = monthKeyParamSchema.safeParse(request.params);
        if (!paramsParsed.success) {
          return reply.code(400).send({ message: "Invalid route parameters" });
        }

        const bodyParsed = moveMoneyBodySchema.safeParse(request.body);
        if (!bodyParsed.success) {
          return reply.code(400).send({ message: "Invalid request payload" });
        }

        const owned = await budgetMonthsRepository.assertBudgetOwnedByUser(
          request.userContext.userId,
          paramsParsed.data.budgetId
        );
        if (!owned) {
          return reply.code(404).send({ message: "Budget not found" });
        }

        const outcome = await moveMoneyBetweenCategories(
          budgetAssignmentsRepository,
          request.userContext.userId,
          paramsParsed.data.budgetId,
          paramsParsed.data.monthKey,
          bodyParsed.data
        );

        if (outcome.ok === false) {
          if (outcome.error === "invalid_amount") {
            return reply.code(400).send({ message: "Invalid amount" });
          }
          if (outcome.error === "same_category") {
            return reply.code(400).send({ message: "Source and destination category must differ" });
          }
          if (outcome.error === "insufficient_source_available") {
            return reply.code(400).send({ message: "Insufficient available in source category" });
          }
          return reply.code(404).send({ message: "Budget month or category not found" });
        }

        return reply.send(outcome.data);
      }
  );
});
