import fp from "fastify-plugin";
import { z } from "zod";
import {
  createCreditCardStatement,
  markCreditCardStatementPaid,
  type CreditCardStatementsRepository
} from "../application/creditCardStatements";
import { createBill, payBill, type BillsRepository } from "../application/bills";
import { PrismaCreditCardStatementsRepository } from "../infrastructure/prismaCreditCardStatementsRepository";
import { PrismaBillsRepository } from "../infrastructure/prismaBillsRepository";

const createStatementBodySchema = z.object({
  accountId: z.string().min(1),
  referenceYear: z.number().int().min(1900).max(2100),
  referenceMonth: z.number().int().min(1).max(12),
  label: z.string().max(200).optional(),
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  closingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  openingBalanceMinor: z.string().regex(/^-?\d+$/).optional(),
  purchasesTotalMinor: z.string().regex(/^-?\d+$/).optional(),
  paymentsTotalMinor: z.string().regex(/^-?\d+$/).optional(),
  adjustmentsTotalMinor: z.string().regex(/^-?\d+$/).optional(),
  interestTotalMinor: z.string().regex(/^-?\d+$/).optional(),
  feesTotalMinor: z.string().regex(/^-?\d+$/).optional(),
  closingBalanceMinor: z.string().regex(/^-?\d+$/).optional(),
  minimumDueMinor: z.string().regex(/^-?\d+$/).optional(),
  notes: z.string().max(2000).optional()
});

const statementIdParamSchema = z.object({
  statementId: z.string().min(1)
});

const createBillBodySchema = z.object({
  fromAccountId: z.string().min(1),
  categoryId: z.string().min(1).optional(),
  statementId: z.string().min(1).optional(),
  payeeName: z.string().min(1).max(200),
  amountMinor: z.string().regex(/^\d+$/),
  currency: z.string().length(3).optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().max(2000).optional()
});

const payBillBodySchema = z.object({
  transactionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
});

const billIdParamSchema = z.object({
  billId: z.string().min(1)
});

export type BillsRoutesOpts = {
  creditCardStatementsRepository?: CreditCardStatementsRepository;
  billsRepository?: BillsRepository;
};

export const billsRoutesPlugin = fp<BillsRoutesOpts>(async (app, opts) => {
  const statementsRepository =
    opts.creditCardStatementsRepository ?? new PrismaCreditCardStatementsRepository();
  const billsRepository = opts.billsRepository ?? new PrismaBillsRepository();

    app.post(
      "/api/v1/credit-card-statements",
      { preHandler: [app.authenticate] },
      async (request, reply) => {
        if (!request.userContext) {
          return reply.code(401).send({ message: "Unauthorized" });
        }

        const parsed = createStatementBodySchema.safeParse(request.body);
        if (!parsed.success) {
          return reply.code(400).send({ message: "Invalid request payload" });
        }

        const result = await createCreditCardStatement(
          statementsRepository,
          request.userContext.userId,
          parsed.data
        );

        if (!result.ok) {
          if (result.error === "account_not_found") {
            return reply.code(404).send({ message: "Account not found" });
          }
          if (result.error === "duplicate_period") {
            return reply.code(409).send({ message: "Statement already exists for this account and period" });
          }
          return reply.code(400).send({ message: "Invalid statement amounts" });
        }

        return reply.code(201).send(result.statement);
      }
    );

    app.post(
      "/api/v1/credit-card-statements/:statementId/mark-paid",
      { preHandler: [app.authenticate] },
      async (request, reply) => {
        if (!request.userContext) {
          return reply.code(401).send({ message: "Unauthorized" });
        }

        const paramsParsed = statementIdParamSchema.safeParse(request.params);
        if (!paramsParsed.success) {
          return reply.code(400).send({ message: "Invalid statement id" });
        }

        const outcome = await markCreditCardStatementPaid(
          statementsRepository,
          request.userContext.userId,
          paramsParsed.data.statementId
        );

        if (!outcome.ok) {
          if (outcome.error === "already_paid") {
            return reply.code(409).send({ message: "Statement is already marked paid" });
          }
          return reply.code(404).send({ message: "Statement not found" });
        }

        return outcome.statement;
      }
    );

    app.post(
      "/api/v1/bills",
      { preHandler: [app.authenticate] },
      async (request, reply) => {
        if (!request.userContext) {
          return reply.code(401).send({ message: "Unauthorized" });
        }

        const parsed = createBillBodySchema.safeParse(request.body);
        if (!parsed.success) {
          return reply.code(400).send({ message: "Invalid request payload" });
        }

        const result = await createBill(billsRepository, request.userContext.userId, parsed.data);
        if (!result.ok) {
          if (result.error === "account_not_found") {
            return reply.code(404).send({ message: "Payment account not found" });
          }
          if (result.error === "category_not_found") {
            return reply.code(404).send({ message: "Category not found" });
          }
          if (result.error === "statement_not_found") {
            return reply.code(404).send({ message: "Statement not found" });
          }
          return reply.code(400).send({ message: "Invalid bill data" });
        }

        return reply.code(201).send(result.bill);
      }
    );

    app.post(
      "/api/v1/bills/:billId/pay",
      { preHandler: [app.authenticate] },
      async (request, reply) => {
        if (!request.userContext) {
          return reply.code(401).send({ message: "Unauthorized" });
        }

        const paramsParsed = billIdParamSchema.safeParse(request.params);
        if (!paramsParsed.success) {
          return reply.code(400).send({ message: "Invalid bill id" });
        }

        const bodyParsed = payBillBodySchema.safeParse(request.body ?? {});
        if (!bodyParsed.success) {
          return reply.code(400).send({ message: "Invalid request payload" });
        }

        const outcome = await payBill(
          billsRepository,
          request.userContext.userId,
          paramsParsed.data.billId,
          bodyParsed.data
        );

        if (!outcome.ok) {
          if (outcome.error === "bill_not_found") {
            return reply.code(404).send({ message: "Bill not found" });
          }
          if (outcome.error === "not_payable") {
            return reply.code(409).send({ message: "Bill cannot be paid in its current state" });
          }
          return reply.code(400).send({ message: "Could not record payment" });
        }

        return {
          bill: outcome.bill,
          transaction: outcome.transaction
        };
      }
    );
});
