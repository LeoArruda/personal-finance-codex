import fp from "fastify-plugin";
import { z } from "zod";
import { getDashboardSummary, type DashboardRepository } from "../application/dashboard";
import { PrismaDashboardRepository } from "../infrastructure/prismaDashboardRepository";

const monthKeySchema = z.string().regex(/^\d{4}-\d{2}$/);

const dashboardQuerySchema = z.object({
  month: monthKeySchema.optional()
});

function currentMonthKeyUtc(): string {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export const dashboardRoutesPlugin = fp<{ dashboardRepository?: DashboardRepository }>(
  async (app, opts) => {
    const repository = opts.dashboardRepository ?? new PrismaDashboardRepository();

    app.get(
      "/api/v1/dashboard/summary",
      { preHandler: [app.authenticate] },
      async (request, reply) => {
        if (!request.userContext) {
          return reply.code(401).send({ message: "Unauthorized" });
        }

        const parsed = dashboardQuerySchema.safeParse(request.query);
        if (!parsed.success) {
          return reply.code(400).send({ message: "Invalid query params" });
        }

        const monthKey = parsed.data.month ?? currentMonthKeyUtc();
        const summary = await getDashboardSummary(
          repository,
          request.userContext.userId,
          monthKey
        );
        return summary;
      }
    );
  }
);
