import fp from "fastify-plugin";
import { z } from "zod";
import {
  createBudget,
  listBudgets,
  setDefaultBudget,
  type BudgetsRepository,
  updateBudget
} from "../application/budgets";
import { PrismaBudgetsRepository } from "../infrastructure/prismaBudgetsRepository";

const createBudgetBodySchema = z.object({
  name: z.string().min(1).max(120),
  currency: z.string().min(3).max(3).optional(),
  isDefault: z.boolean().optional()
});

const updateBudgetBodySchema = z.object({
  name: z.string().min(1).max(120).optional(),
  currency: z.string().min(3).max(3).optional(),
  status: z.enum(["active", "archived"]).optional()
});

export const budgetsRoutesPlugin = fp<{ budgetsRepository?: BudgetsRepository }>(
  async (app, opts) => {
    const repository = opts.budgetsRepository ?? new PrismaBudgetsRepository();

    app.get(
      "/api/v1/budgets",
      { preHandler: [app.authenticate] },
      async (request, reply) => {
        if (!request.userContext) {
          return reply.code(401).send({ message: "Unauthorized" });
        }

        return listBudgets(repository, request.userContext.userId);
      }
    );

    app.post(
      "/api/v1/budgets",
      { preHandler: [app.authenticate] },
      async (request, reply) => {
        if (!request.userContext) {
          return reply.code(401).send({ message: "Unauthorized" });
        }

        const parsed = createBudgetBodySchema.safeParse(request.body);
        if (!parsed.success) {
          return reply.code(400).send({ message: "Invalid request payload" });
        }

        const created = await createBudget(
          repository,
          request.userContext.userId,
          parsed.data
        );
        return reply.code(201).send(created);
      }
    );

    app.patch(
      "/api/v1/budgets/:budgetId",
      { preHandler: [app.authenticate] },
      async (request, reply) => {
        if (!request.userContext) {
          return reply.code(401).send({ message: "Unauthorized" });
        }

        const params = request.params as { budgetId?: string };
        if (!params.budgetId) {
          return reply.code(400).send({ message: "Invalid budget id" });
        }

        const parsed = updateBudgetBodySchema.safeParse(request.body);
        if (!parsed.success) {
          return reply.code(400).send({ message: "Invalid request payload" });
        }

        const updated = await updateBudget(
          repository,
          request.userContext.userId,
          params.budgetId,
          parsed.data
        );

        if (!updated) {
          return reply.code(404).send({ message: "Budget not found" });
        }

        return updated;
      }
    );

    app.post(
      "/api/v1/budgets/:budgetId/set-default",
      { preHandler: [app.authenticate] },
      async (request, reply) => {
        if (!request.userContext) {
          return reply.code(401).send({ message: "Unauthorized" });
        }

        const params = request.params as { budgetId?: string };
        if (!params.budgetId) {
          return reply.code(400).send({ message: "Invalid budget id" });
        }

        const updated = await setDefaultBudget(
          repository,
          request.userContext.userId,
          params.budgetId
        );

        if (!updated) {
          return reply.code(404).send({ message: "Budget not found" });
        }

        return updated;
      }
    );
  }
);

