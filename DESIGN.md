---
name: HEVEN.FUN
description: Premium dark digital gaming storefront — fast, trustworthy, bilingual.
colors:
  vault-void: "#161616"
  vault-surface: "#1f1f1f"
  vault-surface-high: "#2c2c2c"
  vault-border: "#2c2c2c"
  signal-ink: "#ececec"
  signal-ink-content: "#161616"
  ink-muted: "#a3a3a8"
  status-success: "#22c55e"
  status-warning: "#f59e0b"
  status-destructive: "#ef4444"
typography:
  display:
    fontFamily: "'Bebas Neue', 'Rubik', system-ui, sans-serif"
    fontSize: "clamp(3rem, 8vw, 4.5rem)"
    fontWeight: 900
    lineHeight: 1
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "'Rubik', system-ui, -apple-system, sans-serif"
    fontSize: "clamp(1.875rem, 4vw, 2.25rem)"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  title:
    fontFamily: "'Rubik', system-ui, -apple-system, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "normal"
  body:
    fontFamily: "'Rubik', system-ui, -apple-system, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  label:
    fontFamily: "'Rubik', system-ui, -apple-system, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.05em"
  mono:
    fontFamily: "ui-monospace, monospace"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
rounded:
  sm: "calc(0.75rem - 4px)"
  md: "calc(0.75rem - 2px)"
  lg: "0.75rem"
spacing:
  sm: "0.5rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2.5rem"
components:
  button-primary:
    backgroundColor: "{colors.signal-ink}"
    textColor: "{colors.signal-ink-content}"
    rounded: "{rounded.lg}"
    padding: "0.75rem 1.5rem"
  button-primary-hover:
    backgroundColor: "{colors.signal-ink}"
    textColor: "{colors.signal-ink-content}"
    rounded: "{rounded.lg}"
    padding: "0.75rem 1.5rem"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.signal-ink}"
    rounded: "{rounded.lg}"
    padding: "0.75rem 1.5rem"
  card-surface:
    backgroundColor: "{colors.vault-surface}"
    textColor: "{colors.signal-ink}"
    rounded: "{rounded.lg}"
    padding: "1rem"
---

# Design System: HEVEN.FUN

**Purpose:** Visual and component rules for the Trusted Vault — tokens, typography, elevation, do's/don'ts.

**Read this when:** building or polishing any UI. Pair with `PRODUCT.md`. Engineering gotchas that already bit (fonts, DaisyUI `--noise`, storefront scroll): `HANDOFF.md`.

## 1. Overview

**Creative North Star: "The Trusted Vault"**

HEVEN.FUN reads as a premium dark commerce vault: valuables (keys, subscriptions, gift cards) stored behind a confident, fast interface. Surfaces stay quiet and layered; signal color appears as a **rare** accent on actions that move money or trust. Density is efficient — shoppers see price, discount, and delivery proof before decoration.

The system rejects generic SaaS marketing: no cream backgrounds, no hero metric templates, no uppercase tracked eyebrows on every section, no identical icon-card grids. Bilingual AR/EN and RTL/LTR parity are layout constraints, not polish passes.

**Key Characteristics:**
- Near-black cool-charcoal void background with stepped slate surfaces (no purple tint)
- Bebas Neue condensed display over Rubik body (Vault default skin) at heavy weights for commerce headlines
- Teal/cyan (or skin primary) glow reserved for hover, CTA, and promotional emphasis — not wallpaper
- 12px corner radius as the default container language
- DaisyUI 5 on Tailwind CSS 4 (themes defined in `src/index.css`) for buttons, cards, navbar, drawer, forms, tables
- **Six user-selectable skins** (`src/lib/appearance.ts`), each with dark + light DaisyUI themes: Vault (default, Bebas Neue/Rubik), Aurora (Space Grotesk), Sunset (Fraunces), Abyss (Syne), Dim (Manrope), Coffee (Literata). Content is identical across skins; only the feel changes.
- CSS transitions for hover/focus; no page-wide motion choreography
- Custom DaisyUI themes MUST set `:root { --noise: 0 }` or menu `:active` flashes film grain (see `src/index.css` / HANDOFF)

## 2. Colors

A committed monochrome dark palette (Vault, the default skin): the near-black void is the brand; the signal is near-white ink, not a hue. Color arrives through product imagery, status semantics, and user-selected alternate skins.

All colors live as DaisyUI theme variables in `src/index.css` (`@plugin "daisyui/theme"` blocks — one dark + one light theme per skin). Components use semantic roles (`primary`, `base-100/200/300`, `base-content`), never raw hex.

### Vault dark (`heven`, default)
- **Primary / Signal Ink** (#ececec on #161616 content): CTA fill, active nav, focus rings, discount badges. High-contrast monochrome — the "signal" is brightness, not hue.
- **Vault Void** (#161616, `base-100`): Page background, hero base.
- **Vault Surface** (#1f1f1f, `base-200`): Cards, nav backdrop, inputs at rest.
- **Vault Surface High** (#2c2c2c, `base-300`): Elevated panels and default 1px borders.
- **Ink Muted** (#a3a3a8, `accent`): Secondary copy, metadata.
- **Status:** success #22c55e · warning #f59e0b · error #ef4444.

### Vault light (`heven-light`)
Cool slate-tinted daylight (OKLCH, chroma toward charcoal-blue — never cream); primary flips to near-black ink on off-white.

### Alternate skins
Aurora (indigo #818cf8), Sunset (rose #fb7185), Abyss (acid lime on deep teal), Dim (muted lime on slate), Coffee (warm amber) — each defines its own dark + light theme with the same semantic roles. Owner can also override `primary`/`accent` via brand palettes (`src/lib/brandPalettes.ts` + `oklch.ts`).

### Named Rules
**The Rare Signal Rule.** Primary fill or glow on ≤15% of any viewport. If everything glows, nothing is urgent.

## 3. Typography

**Display Font (Vault default):** Bebas Neue (Rubik/system-ui fallback) via `--font-display`  
**Body Font (Vault default):** Rubik (system-ui fallback) via `--font-sans`  
**Mono:** system monospace stack for codes, order numbers, technical strings

Other skins swap the pair (see `index.html` async font loads + `src/index.css` per-theme overrides): Aurora = Space Grotesk, Sunset = Fraunces, Abyss = Syne, Dim = Manrope, Coffee = Literata. Only the Vault fonts are render-blocking.

**Character:** Tight, confident grotesque — heavy weights sell deals; regular weight carries explanations.

### Hierarchy
- **Display** (900, clamp(3rem, 8vw, 4.5rem), 1.0, -0.03em): Hero headlines only. Max one per viewport.
- **Headline** (700, clamp(1.875rem, 4vw, 2.25rem), 1.2): Section titles, product names in detail views.
- **Title** (600, 1.125rem, 1.3): Card titles, nav items, form section headers.
- **Body** (400, 1rem, 1.6): Descriptions, checkout copy. Cap at 65–75ch in prose blocks.
- **Label** (600, 0.75rem, 0.05em tracking): Badges, table headers, filter chips — uppercase only when the label is truly metadata.

### Named Rules
**The No-Shout Rule.** Display clamp max stays at 4.5rem (~72px). Larger reads as discount spam, not premium.

## 4. Elevation

Hybrid system: surfaces are flat at rest; a primary-tinted glow and slight translateY appear on hover for interactive cards and primary buttons. Depth also comes from tonal steps (`base-100` → `base-200` → `base-300`), not stacked drop shadows.

### Shadow Vocabulary
- **Card lift** (`0 4px 24px rgba(0,0,0,0.6)`): Sticky nav when scrolled — structural, not decorative.
- **Signal glow** (`0 0 20px` at ~30% of the theme `primary`): Primary button hover, promo card emphasis. Built with `color-mix(in oklch, var(--color-primary) …, transparent)` so it follows every skin.
- **Signal glow large** (`0 0 40px` at ~40% primary): Hero promo badge only — one per screen.

### Named Rules
**The Glow-On-Response Rule.** Glow appears on hover, focus, or active promotion — never as the default resting state for every card.

## 5. Components

**Layer:** [DaisyUI 5](https://daisyui.com/) on Tailwind CSS 4, themes defined with `@plugin "daisyui/theme"` blocks in `src/index.css` (no `tailwind.config.js`). `data-theme` set on `<html>` by the appearance store (`src/stores/appearanceStore.ts`, with View Transition swaps). Brand tokens map to Daisy roles: `primary` = Signal Ink (per skin), `accent` = muted secondary, `base-100` = Vault Void, `base-200`/`base-300` = stepped surfaces.

Commerce-tactile: buttons feel pressable; cards feel selectable; nav stays out of the way until scroll.

### Buttons (`btn`)
- **Primary:** `btn btn-primary` — theme primary fill with `primary-content` semibold label
- **Secondary / outline:** `btn btn-outline`, `btn btn-ghost` — border tint on hover, no ghost-card shadow pairing
- **Sizes:** `btn-sm` for card CTAs, default for hero/checkout

### Badges & chips (`badge`)
- **Promo / discount:** the shared `DiscountBadge` (`.product-discount-badge` — primary fill, `BadgePercent` icon, settle-in animation)
- **Trust metadata:** small badges with icon — not uppercase eyebrows on every section

### Cards (`card`)
- **Surface:** `card bg-base-200` or `bg-base-300`; `border border-base-300` or `border-primary/30` for promo emphasis
- **Radius:** Daisy default (~12px) — no 24px+ card rounding
- **Hover:** `hover:border-primary/40` tint; avoid border + wide blur shadow on same element
- **Signature:** `ProductCard` in `src/components/ui/ProductCard.tsx`
- Product aura / Hover 3D / card-body FX: managed from Products (`ProductEffectsDialog` / editor `card_fx`) — see `HANDOFF.md`

### Inputs / forms
- **Fields:** `input input-bordered`, `select select-bordered`, `textarea textarea-bordered`
- **Focus:** theme `primary` ring via DaisyUI
- **Auth / checkout:** `form-control` + `label` pattern

### Navigation
- **Public:** `navbar` sticky + `drawer` mobile menu (`Navbar.tsx`)
- **Dashboard:** `drawer lg:drawer-open` sidebar (`DashboardLayout.tsx`)
- **Active route:** `text-primary` or `btn-active` on sidebar links

### Data surfaces
- **Tables:** `table table-zebra` in admin orders/products
- **Stats:** `stat` blocks on dashboard home
- **Modals:** always the shared `Modal` (`src/components/ui/Modal.tsx`) — accessible dialog with focus trap, Escape, and scroll lock. Don't hand-roll DaisyUI modals.

### Shared UI (`src/components/ui/`)
Bespoke components only (legacy shadcn/Radix tree purged; `scripts/check-cleanup.mjs` pins the allowlist). Core set includes: `ProductCard`, `ProductMedia` (+ `InViewVideo`), `ProductVideoPlayer` (Plyr), `Modal`, `DiscountBadge`, `BrandLogo`, `UserAvatar`, `AvatarUploader`, `BadgeIcon`, `ProfileBadgeStrip`, `Reveal`, `RouteLoadingScreen`, `BackToTop`, `ScrollToTop`, `ElectricBorder` / `AuraFrame`. Update the cleanup check when adding a shared ui component.

## 6. Do's and Don'ts

### Do:
- **Do** keep the void background dominant and step surfaces for hierarchy.
- **Do** show trust signals (instant delivery, secure payment, support) near CTAs on commerce pages.
- **Do** test AR and EN copy at the same visual weight — RTL layout mirrors spacing, not just `dir`.
- **Do** use glow and motion on the element the user is about to click.
- **Do** respect `prefers-reduced-motion` — crossfade or instant state change instead of translateY choreography.
- **Do** keep framer-motion off the eager storefront chunk (lazy the motion hosts — see HANDOFF).

### Don't:
- **Don't** use generic SaaS patterns from PRODUCT.md: cream/sand backgrounds, hero metric templates, uppercase tracked eyebrows on every section, identical icon-card grids.
- **Don't** use gradient text (`background-clip: text`) for headlines — solid `text-base-content` or `text-primary` only.
- **Don't** pair 1px border with wide soft drop shadow on the same element — pick border OR shadow.
- **Don't** exceed 12–16px radius on cards; full-pill is for buttons and tags only.
- **Don't** load decorative motion that delays price or checkout visibility.
- **Don't** use dim gray (sub-AA opacity like `/40`) for body copy on Vault Void — contrast fails the read test; reserve low opacity for true hints.

---

**Last verified:** 2026-07-24  
**How to update this doc:** When tokens/skins/shared UI rules change in `src/index.css` or `src/components/ui/`, update the matching section here. Engineering incidents go in HANDOFF gotchas, not as aspirational design wishes.
