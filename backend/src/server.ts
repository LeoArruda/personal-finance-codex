import "dotenv/config";
import { createApp } from "./app/createApp";
import { loadEnv } from "./app/env";

async function main() {
  const env = loadEnv();
  const app = await createApp(env);

  const port = Number(env.PORT ?? "3000");
  const host = "0.0.0.0";

  await app.listen({ port, host });
}

main().catch((err) => {
  // Fastify logger may be not ready if env parsing fails.
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

