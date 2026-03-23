import fp from "fastify-plugin";
import { z } from "zod";
import {
  getCashflowReport,
  getNetWorthReport,
  getSpendingByCategoryReport,
  type ReportsRepository
} from "../application/reports";
import { PrismaReportsRepository } from "../infrastructure/prismaReportsRepository";

const monthKeySchema = z.string().regex(/^\d{4}-\d{2}$/, "Expected YYYY-MM");

const reportRangeQuerySchema = z
  .object({
    from: monthKeySchema,
    to: monthKeySchema
  })
  .refine((q) => q.from <= q.to, { message: "from must be on or before to" });

export const reportsRoutesPlugin = fp<{ reportsRepository?: ReportsRepository }>(async (app, opts) => {
  const repository = opts.reportsRepository ?? new PrismaReportsRepository();

  app.get(
    "/api/v1/reports/net-worth",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      if (!request.userContext) {
        return reply.code(401).send({ message: "Unauthorized" });
      }

      const parsed = reportRangeQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.code(400).send({ message: "Invalid query params" });
      }

      const report = await getNetWorthReport(
        repository,
        request.userContext.userId,
        parsed.data.from,
        parsed.data.to
      );
      return report;
    }
  );

  app.get(
    "/api/v1/reports/cashflow",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      if (!request.userContext) {
        return reply.code(401).send({ message: "Unauthorized" });
      }

      const parsed = reportRangeQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.code(400).send({ message: "Invalid query params" });
      }

      const report = await getCashflowReport(
        repository,
        request.userContext.userId,
        parsed.data.from,
        parsed.data.to
      );
      return report;
    }
  );

  app.get(
    "/api/v1/reports/spending-by-category",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      if (!request.userContext) {
        return reply.code(401).send({ message: "Unauthorized" });
      }

      const parsed = reportRangeQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.code(400).send({ message: "Invalid query params" });
      }

      const report = await getSpendingByCategoryReport(
        repository,
        request.userContext.userId,
        parsed.data.from,
        parsed.data.to
      );
      return report;
    }
  );
});
