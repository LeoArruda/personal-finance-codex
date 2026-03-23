import fastifyJwt from "@fastify/jwt";
import fp from "fastify-plugin";
import { type FastifyReply, type FastifyRequest } from "fastify";
import { type Env } from "../../../app/env";

export type AuthenticatedUserContext = {
  userId: string;
  email?: string;
};

export function extractUserIdFromJwtPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const maybeSub = (payload as { sub?: unknown }).sub;
  return typeof maybeSub === "string" && maybeSub.length > 0 ? maybeSub : null;
}

declare module "fastify" {
  interface FastifyRequest {
    userContext?: AuthenticatedUserContext;
  }

  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export const authHookPlugin = fp<{ env: Env }>(async (app, opts) => {
  await app.register(fastifyJwt, {
    secret: opts.env.JWT_SECRET ?? "dev-insecure-secret"
  });

  app.decorate("authenticate", async (request, reply) => {
    try {
      const payload = await request.jwtVerify<Record<string, unknown>>();
      const userId = extractUserIdFromJwtPayload(payload);

      if (!userId) {
        reply.code(401).send({ message: "Unauthorized" });
        return;
      }

      request.userContext = {
        userId,
        email: typeof payload.email === "string" ? payload.email : undefined
      };
    } catch {
      reply.code(401).send({ message: "Unauthorized" });
    }
  });
});

