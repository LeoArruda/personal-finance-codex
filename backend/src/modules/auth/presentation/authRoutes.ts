import fp from "fastify-plugin";
import { runInUserDbContext } from "../../../shared/db/userContext";

export const authRoutesPlugin = fp(async (app) => {
  app.get(
    "/api/v1/auth/me",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      if (!request.userContext) {
        return reply.code(401).send({ message: "Unauthorized" });
      }

      return {
        userId: request.userContext.userId,
        email: request.userContext.email ?? null
      };
    }
  );

  app.get(
    "/api/v1/auth/context",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      if (!request.userContext) {
        return reply.code(401).send({ message: "Unauthorized" });
      }

      const userId = request.userContext.userId;
      const dbUserId = await runInUserDbContext(userId, async (tx) => {
        const rows = await tx.$queryRaw<Array<{ current_user_id: string | null }>>`
          select current_setting('app.current_user_id', true) as current_user_id
        `;
        return rows[0]?.current_user_id ?? null;
      });

      return { userId, dbUserId };
    }
  );
});

