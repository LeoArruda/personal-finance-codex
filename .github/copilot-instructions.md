# Copilot Instructions (Bootstrap)

This repository uses `AGENTS.md` as the primary source of truth for coding conventions, architectural rules, and security invariants.

## Key files
- `AGENTS.md`  (core principles, tech stack, domain and DB rules, test requirements)
- `APPLICATION_INSTRUCTIONS.md` (application/database behavior and invariants)
- `DATABASE_TASKING_GUIDE.md` (database migration practices)
- `ARCHITECTURE.md` (module structure)
- `DOMAIN_MODEL.md` (domain concepts)

## Agent behavior
- Always enforce multi-tenancy by `user_id` and RLS.
- Never bypass `RLS` in normal flows.
- Prefer explicit, low-risk changes to financial flows.
- Tests come first (TDD-style) for behavior changes.

## Helpful commands
- `npm install` / `pnpm install` / `bun install`
- `npm test` / `pnpm test` / `bun test`
- `npm run test:ci` etc depending on scripts in `package.json`

## When in doubt
- Follow `AGENTS.md` and companion docs exactly.
- Ask for engineering cleanup tasks as separate tickets if scope grows.
