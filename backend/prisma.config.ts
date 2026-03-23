import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // Use the direct connection for DDL and introspection.
    // (Supabase poolers often block/limit DDL and session-level settings.)
    url: env("DIRECT_URL")
  }
});

