import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.string().optional(),
  PORT: z.string().optional(),

  // Supabase (used later for auth/JWT verification and for wiring local development)
  SUPABASE_URL: z.string().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  JWT_SECRET: z.string().optional(),

  // PostgreSQL
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().optional()
});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(): Env {
  const parsed = EnvSchema.parse(process.env);
  return parsed;
}

