import { type FastifyInstance } from "fastify";
import { createApp, type AppDependencies } from "../../src/app/createApp";
import { type Env } from "../../src/app/env";

const TEST_ENV: Env = {
  NODE_ENV: "test",
  PORT: "0",
  DATABASE_URL: "postgresql://test/test"
};

export async function createTestApp(
  overrides: Partial<Env> = {},
  deps: AppDependencies = {}
): Promise<FastifyInstance> {
  const app = await createApp({ ...TEST_ENV, ...overrides }, deps);
  await app.ready();
  return app;
}

