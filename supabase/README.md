# Supabase Scaffold (Starter)

This folder is prepared so you can run `supabase init` at the repo root and then add/adjust migrations.

## Initial database schema

The repository root contains `finance.sql`, which defines the app schema (including RLS + budgets/ledger domain tables).

After you run `supabase init`:

1. Create a first migration file (example: `supabase/migrations/0001_finance_schema.sql`)
2. Paste the contents of `finance.sql` into that migration file (or use your preferred workflow to load it).

Then run migrations using your Supabase CLI workflow.

