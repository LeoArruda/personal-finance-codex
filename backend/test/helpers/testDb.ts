import { Prisma, type PrismaClient } from "@prisma/client";
import { prisma } from "../../src/prisma/prismaClient";

const ROLLBACK_SENTINEL = "__TEST_TX_ROLLBACK__";

export function isDbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL || process.env.DIRECT_URL);
}

export function getTestDbClient(): PrismaClient {
  return prisma;
}

export async function withRollback<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  let result: T | undefined;

  try {
    await prisma.$transaction(async (tx) => {
      result = await fn(tx);
      // Force rollback so each test can keep DB state isolated.
      throw new Error(ROLLBACK_SENTINEL);
    });
  } catch (err) {
    if (err instanceof Error && err.message === ROLLBACK_SENTINEL) {
      return result as T;
    }
    throw err;
  }

  throw new Error("withRollback reached unexpected completion");
}

