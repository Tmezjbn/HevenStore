# Agent Context

**Purpose:** Short always-on pointer for AI agents. Details live in the linked docs — keep this file lean.

**Read this when:** starting any task in this repo.

## Read order

1. **`HANDOFF.md`** — MUST before bugs or any checkout / auth / fulfillment / roles / RLS / support work. Invariants, verify commands, gotchas, open items.
2. **`PRODUCT.md` + `DESIGN.md`** — before any UI work (Trusted Vault, bilingual AR/EN + RTL parity).
3. **`OPS.md`** — before deploy/launch/ops (alerts, uptime, PITR, live checklist).
4. **`POLAR_SETUP.md`** — before Polar sandbox/prod wiring.
5. **`README.md`** — stack map, scripts, env overview.

`.impeccable/design.json` is a tool sidecar for live mode; do not treat it as source of truth over DESIGN.md.

## Verify (PowerShell: `;` not `&&`)

```powershell
npm run typecheck
npm run lint
npm test
npm run build
```

- `npm test` runs every `scripts/check-*.mjs` via `scripts/run-checks.mjs` (**80** checks; all MUST pass).
- After checkout/auth/fulfillment edits, also run `node scripts/check-checkout-authority.mjs`.

## Owner internal log

After shipping **user-visible** storefront/dashboard behavior (not docs-only / pure refactor), append an entry — see `.cursor/rules/owner-changelog.mdc`.

## Style

Use `/ponytail ultra` always. Engineering ladder: `.cursor/rules/ponytail.mdc`. Do not invent features. Prefer linking to HANDOFF over duplicating invariants here.

---

**Last verified:** 2026-07-24  
**How to update this doc:** Keep it short. Change read-order or verify commands only when they change in the repo; put substance in HANDOFF / OPS / DESIGN.
