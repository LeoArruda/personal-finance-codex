import fp from "fastify-plugin";
import { z } from "zod";
import { type BudgetMonthsRepository } from "../../budgeting/application/budgetMonths";
import { PrismaBudgetMonthsRepository } from "../../budgeting/infrastructure/prismaBudgetMonthsRepository";
import { previewBudgetMonthScenario } from "../application/scenarios";

const previewBodySchema = z.object({
  budgetId: z.string().min(1),
  monthKey: z.string().regex(/^\d{4}-\d{2}$/),
  additionalAssignments: z.array(
    z.object({
      categoryId: z.string().min(1),
      amountMinor: z.string().regex(/^\d+$/)
    })
  )
});

export const scenariosRoutesPlugin = fp<{ budgetMonthsRepository?: BudgetMonthsRepository }>(
  async (app, opts) => {
    const budgetMonthsRepository =
      opts.budgetMonthsRepository ?? new PrismaBudgetMonthsRepository();

    app.post(
      "/api/v1/scenarios/budget-month/preview",
      { preHandler: [app.authenticate] },
      async (request, reply) => {
        if (!request.userContext) {
          return reply.code(401).send({ message: "Unauthorized" });
        }

        const parsed = previewBodySchema.safeParse(request.body);
        if (!parsed.success) {
          return reply.code(400).send({ message: "Invalid request payload" });
        }

        const outcome = await previewBudgetMonthScenario(
          budgetMonthsRepository,
          request.userContext.userId,
          parsed.data
        );

        if (!outcome.ok) {
          if (outcome.error === "not_found") {
            return reply.code(404).send({ message: "Budget month not found" });
          }
          if (outcome.error === "insufficient_ready_to_assign") {
            return reply.code(400).send({ message: "Insufficient Ready to Assign for scenario" });
          }
          if (outcome.error === "unknown_category") {
            return reply.code(400).send({ message: "Unknown category in this budget month" });
          }
          return reply.code(400).send({ message: "Invalid scenario input" });
        }

        return outcome.data;
      }
    );
  }
);
