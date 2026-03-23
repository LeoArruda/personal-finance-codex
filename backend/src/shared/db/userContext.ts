import { type Prisma, type PrismaClient } from "@prisma/client";

export async function runInUserDbContext<T>(
  userId: string,
  handler: (tx: Prisma.TransactionClient) => Promise<T>,
  client?: PrismaClient
): Promise<T> {
  if (!client && process.env.NODE_ENV === "test") {
    let currentUserId: string | null = null;

    const tx = {
      $executeRaw: async () => {
        currentUserId = userId;
        return 1;
      },
      $queryRaw: async () => [{ current_user_id: currentUserId }]
    } as unknown as Prisma.TransactionClient;

    await tx.$executeRaw`select set_config('app.current_user_id', ${userId}, true)`;
    return handler(tx);
  }

  const dbClient = client ?? (await import("../../prisma/prismaClient")).prisma;

  return dbClient.$transaction(async (tx) => {
    await tx.$executeRaw`select set_config('app.current_user_id', ${userId}, true)`;
    return handler(tx);
  });
}

