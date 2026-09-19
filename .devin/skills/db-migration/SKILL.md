---
name: db-migration
description: Write and apply Supabase migrations for this repo — idempotent, drift-proof, history-recorded. Use whenever creating/editing anything under supabase/migrations/, changing tables/columns/policies/functions/triggers/RLS, or when a task needs a schema or RPC change. Also use when the live DB errors on a migration apply (duplicate policy, return-type mismatch) — the recovery procedure is here.
---

# DB migrations — write once, apply clean

Migrations live in `supabase/migrations/YYYYMMDDHHMMSS_name.sql`. The live DB may already contain manually-applied objects (history drifted once before) — write every file so it converges the schema, never assuming a clean slate.

## Read first

`HANDOFF.md` — invariants (server-authority checkout, role guards, RLS, sold-goods locks) must not weaken.

## Writing rules

- **Always self-guard creates.** `DROP POLICY IF EXISTS "<name>" ON <table>;` immediately before `CREATE POLICY` — including the *same* name you're creating, not just the old names being replaced. Same for `DROP TRIGGER IF EXISTS <name> ON <table>;` before `CREATE TRIGGER`. If the object already exists live, a plain CREATE errors and stops the apply.
- **`IF NOT EXISTS`** on `CREATE TABLE`, `CREATE INDEX`, `CREATE UNIQUE INDEX`, `ALTER TABLE ... ADD COLUMN`, `CREATE SEQUENCE`. Constraints: drop-then-add (`DROP CONSTRAINT IF EXISTS` or a `DO $$` block scanning `pg_constraint`) — `ADD CONSTRAINT` has no IF NOT EXISTS.
- **Functions:** `CREATE OR REPLACE FUNCTION` works only when the return type is unchanged. If the new version returns a different type/shape (e.g. new `RETURNS TABLE` columns), add `DROP FUNCTION IF EXISTS <name>(<arg types>);` first — but check dependents: a function referenced by live policies/triggers can't be dropped (Postgres will error). Prefer keeping the signature stable.
- **`SECURITY DEFINER` functions must self-check** the caller inside the body (`auth.uid()` null-check + role check, `SET search_path = public`) — definer functions bypass RLS, so the check is the only guard. Add `REVOKE ALL ... FROM PUBLIC; GRANT EXECUTE ... TO authenticated/service_role;` explicitly.
- **Data seeds:** `INSERT ... ON CONFLICT DO NOTHING` or `WHERE NOT EXISTS` — never bare inserts.
- **Multi-event triggers can't have `REFERENCING` transition tables** — Postgres forbids it (error 0A000). Split into one trigger per event; share a function that branches on `TG_OP`.
- **Bilingual columns**: any user-facing text column comes in `_en`/`_ar` pairs — match the existing pattern.

## Before writing — check live state

The read-only Supabase MCP can run SELECTs. When replacing functions/policies, confirm what exists:

```sql
SELECT p.proname, pg_get_function_identity_arguments(p.oid), pg_get_function_result(p.oid)
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='the_function';
```

If MCP is unavailable, write extra-defensively (drops for every plausible name variant).

## Applying — never paste in SQL Editor without recording history

`npm run db:push` applies only files missing from `supabase_migrations.schema_migrations` and records them automatically. Creds come from gitignored `.env` (`SUPABASE_DB_PASSWORD`) + `.devin/mcp_config.local.json` (access token). If that fails, fall back to SQL Editor **and append** `insert into supabase_migrations.schema_migrations(version,name) values('<ts>','<name>') on conflict do nothing;` — a skipped history row is how the 49-file drift happened.

If an apply errors, it stops at that statement — fix the cause, don't force re-run of the whole file blindly; the guards make re-running safe.

## Verify after apply

Spot-check the objects landed: new columns/tables exist (`information_schema`), triggers present (`pg_trigger`), the history row recorded (`schema_migrations`). Then `npm run typecheck ; npm run lint ; npm test ; npm run build`.
