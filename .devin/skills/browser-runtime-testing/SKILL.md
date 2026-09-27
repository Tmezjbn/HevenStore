---
name: browser-runtime-testing
description: Live browser verification guidance for this Vite/React storefront, including stale HMR CSS diagnosis, DOM instrumentation for transient UI, and recording-ready assertions. Use when testing runtime UI behavior, animations, theme/language transitions, or dev-server regressions.
---

# Browser runtime testing

## Dev-server freshness

- Do not trust `Ctrl+R` alone after checking out a branch or while Vite HMR has been active. Compare the source rule with the injected Tailwind `<style data-vite-dev-id="...src/index.css">`.
- If the endpoint contains a selector but the injected style does not, restart `npm run dev`, hard reload, then retest. Report stale-server behavior separately from product behavior.

## Transient animation/DOM assertions

- Install a read-only `MutationObserver` before clicking. Track element insertion/removal, `performance.now()`, `getComputedStyle()`, `getAnimations()`, `document.elementFromPoint()`, and relevant `data-*` attributes.
- For background cleanup, measure the actual opaque shell (for example `.min-h-screen`) as well as `body`; this app normally leaves `body` transparent and paints the shell.

## Browser evidence

- Record UI clicks at 60fps when animation timing matters.
- Prefer UI clicks for behavior. Use browser-console/CDP only for read-only probes, computed styles, and logs.
- The repo rule prefers isolated Brave when available. If no Brave binary exists, document the limitation and use the available isolated browser.

## Devin secrets needed

- `HEVEN_SUPABASE_URL`
- `HEVEN_SUPABASE_ANON_KEY`
