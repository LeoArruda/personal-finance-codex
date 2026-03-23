import fp from "fastify-plugin";
import { z } from "zod";
import { getCashRunwayProjection, type ProjectionsRepository } from "../application/projections";
import { PrismaProjectionsRepository } from "../infrastructure/prismaProjectionsRepository";

const monthKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}$/)
  .refine((s) => {
    const m = Number(s.slice(5, 7));
    return m >= 1 && m <= 12;
  }, "Invalid month key");
const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const cashRunwayQuerySchema = z.object({
  month: monthKeySchema.optional(),
  asOf: isoDateSchema.optional(),
  trailingWeeks: z.coerce.number().int().min(1).max(52).optional()
});

function currentMonthKeyUtc(): string {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export const projectionsRoutesPlugin = fp<{ projectionsRepository?: ProjectionsRepository }>(
  async (app, opts) => {
    const repository = opts.projectionsRepository ?? new PrismaProjectionsRepository();

    app.get(
      "/api/v1/projections/cash-runway",
      { preHandler: [app.authenticate] },
      async (request, reply) => {
        if (!request.userContext) {
          return reply.code(401).send({ message: "Unauthorized" });
        }

        const parsed = cashRunwayQuerySchema.safeParse(request.query);
        if (!parsed.success) {
          return reply.code(400).send({ message: "Invalid query params" });
        }

        const monthKey = parsed.data.month ?? currentMonthKeyUtc();
        const asOfDate = parsed.data.asOf ?? todayUtc();
        const trailingWeeks = parsed.data.trailingWeeks ?? 4;

        const projection = await getCashRunwayProjection(repository, request.userContext.userId, {
          trailingWeeks,
          monthKey,
          asOfDate
        });

        return projection;
      }
    );
  }
);
