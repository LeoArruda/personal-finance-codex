import fp from "fastify-plugin";
import { z } from "zod";
import {
  getCurrentUser,
  type UsersRepository,
  updateCurrentUser
} from "../application/getCurrentUser";
import { PrismaUsersRepository } from "../infrastructure/prismaUsersRepository";

export const usersRoutesPlugin = fp<{ usersRepository?: UsersRepository }>(async (app, opts) => {
  const repository = opts.usersRepository ?? new PrismaUsersRepository();
  const updateCurrentUserBodySchema = z.object({
    fullName: z.string().min(1).max(120).optional(),
    locale: z.string().min(2).max(16).optional(),
    timezone: z.string().min(3).max(64).optional()
  });

  app.get(
    "/api/v1/users/me",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      if (!request.userContext) {
        return reply.code(401).send({ message: "Unauthorized" });
      }

      const user = await getCurrentUser(repository, request.userContext.userId);
      if (!user) {
        return reply.code(404).send({ message: "User not found" });
      }

      return user;
    }
  );

  app.patch(
    "/api/v1/users/me",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      if (!request.userContext) {
        return reply.code(401).send({ message: "Unauthorized" });
      }

      const parsed = updateCurrentUserBodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ message: "Invalid request payload" });
      }

      const updated = await updateCurrentUser(
        repository,
        request.userContext.userId,
        parsed.data
      );

      if (!updated) {
        return reply.code(404).send({ message: "User not found" });
      }

      return updated;
    }
  );
});

