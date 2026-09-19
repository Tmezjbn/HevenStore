---
name: audit-round
description: Structured audit/cleanup pass over this codebase — find and fix verified bugs, remove proven dead code, harden weak spots. Use whenever the user asks for an audit round, code review, cleanup, "find issues", dead-code removal, or a best-practices sweep of this project. Also triggers on numbered rounds ("round 3") and security/perf/a11y deep dives.
---

# Audit round — verified findings only

## Read first

`HANDOFF.md` (invariants are non-negotiable) + `AGENTS.md`. Skim `scripts/check-*.mjs` (`npm test` runs them all) to know what's already covered — don't re-litigate covered invariants; extend them instead.

## Method

1. **Breadth before depth.** Map the scope (src/, supabase/functions/, migrations, scripts/, configs), then verify each candidate finding in the actual code before touching anything. A report names a symptom — trace the real flow end to end first.
2. **Fix root causes, not call sites.** One guard in the shared function beats one per caller; patching only the reported path leaves siblings broken.
3. **Dead code = proven dead.** Grep imports/usages AND check live-DB-facing surfaces before deleting: storage object paths, `site_settings` keys, RPC names, notification types — strings the DB or edge functions reference aren't dead even if `src/` doesn't import them. Can't prove zero refs? Flag it, don't delete it.
4. **No speculative fixes.** Looks-wrong-but-unproven goes in the report, not the diff.
5. **High-risk areas need owner sign-off first:** checkout, auth, fulfillment, roles, RLS policies. Flag, propose, wait.

## Hard rules (every edit)

- Invariants must not weaken: server-side checkout authority, role guards, RLS, sold-goods immutability, frozen order fields.
- Bilingual `t()` + RTL parity on anything user-facing you touch.
- DB changes → `db-migration` skill conventions; write the file, owner applies via `npm run db:push`.
- Prefer deletion over addition; no new dependencies; shortest correct diff.
- No changelog entries unless the user asks. Local commits only — never push.

## Report format — feeds the next round

- **FIXED** — file:line, what was broken, what you did (one line each)
- **FLAGGED** — verified issue needing an owner decision + why
- **SUSPECTED** — unproven concerns worth a deeper look next round

## Verify

`npm run typecheck ; npm run lint ; npm test ; npm run build` — all green before committing. If you add an invariant, extend or add a `scripts/check-*.mjs` (no frameworks, runnable checks only). Commit per logical chunk.
