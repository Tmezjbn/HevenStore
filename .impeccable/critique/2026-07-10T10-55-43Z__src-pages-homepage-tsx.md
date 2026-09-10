---
target: website homepage
total_score: 20
p0_count: 2
p1_count: 2
timestamp: 2026-07-10T10-55-43Z
slug: src-pages-homepage-tsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Active Home ok; scroll silently kills logo/search; add-to-cart has no homepage confirmation |
| 2 | Match System / Real World | 2 | Slogan-as-hero, not shopper language; empty `(0)` stars feel fake |
| 3 | User Control and Freedom | 3 | Lang/theme/cart/explore exist; hero itself is a dead end |
| 4 | Consistency and Standards | 2 | Aurora gradient vs vault teal; Featured uppercase vs Products; AR footer still EN slogan |
| 5 | Error Prevention | 2 | Thin catalog + no delivery/payment trust before cart |
| 6 | Recognition Rather Than Recall | 2 | Brand + search vanish on scroll; generic category icons |
| 7 | Flexibility and Efficiency | 3 | Search + Explore + category links + card ATC when stock exists |
| 8 | Aesthetic and Minimalist Design | 1 | Shouty 9xl + gradient + clone category cards; commerce starved |
| 9 | Error Recovery | 2 | Empty states exist; shopper vs admin messaging blurs |
| 10 | Help and Documentation | 1 | No delivery/support/trust near path; About buried in drawer |
| **Total** | | **20/40** | **Acceptable — significant improvements needed** |

## Anti-Patterns Verdict

**LLM assessment**: Yes — a design-literate shopper would clock this as AI-adjacent within one viewport. Tells: purple→pink gradient headline on a “Trusted Vault” surface; Welcome eyebrow + slogan-as-H1 with zero hero CTA; identical icon-card category grid (exact PRODUCT anti-ref); display at `text-7xl`→`lg:text-9xl` (No-Shout ceiling ~4.5rem). Dark charcoal + Inter alone don’t save it — composition reads “generated dark SaaS landing,” not a keys boutique.

**Deterministic scan**: CLI `detect.mjs` on `HomePage.tsx` / `Navbar.tsx` / `ProductCard.tsx` exited **0** with **zero** static findings (TSX class strings don’t expose theme CSS). Live browser overlay disagreed and caught runtime tells the CLI missed: **gradient text** (`background-clip` + Tailwind `bg-clip-text`), **bounce/elastic easing**, **layout property animation** (`transition: width` ×3 — matches scroll-collapse of logo/search), **repeating-gradient stripes**. Overlay and LLM agree on gradient text as the loudest anti-pattern; layout-width transitions corroborate the scroll-hide chrome issue.

**Visual overlays**: Injected successfully on the live homepage; yellow markers/banner were visible in the browser tab during Assessment B (live server stopped after capture).

## Overall Impression

Vault bones are real — cool void, framed hero, bilingual plumbing, price-forward product cards — but the first viewport spends its budget on a slogan mood board. Biggest opportunity: turn the hero into a commerce start (one CTA + quieter type + trust) and stop letting skin demos (Aurora gradient) paint the money page.

## What's Working

1. **Vault bones** — Near-black void + framed hero + Inter weight hierarchy can read premium when skin stays vault/teal.
2. **Bilingual plumbing** — AR copy, RTL nav flip, category/product AR names work on the primary path.
3. **Commerce card pattern** — `ProductCard` keeps price + ATC visible; featured correctly omits when empty.

## Priority Issues

### [P0] Hero has no CTA
- **What**: Full-viewport hero is eyebrow + slogan + blurb only.
- **Why it matters**: First-timers cannot start browse→buy without inventing the next step.
- **Fix**: One primary Explore Store / Shop keys + optional secondary search focus; ≤ one display line; solid ink or teal, no gradient.
- **Suggested command**: `$impeccable layout` / `$impeccable clarify`

### [P0] Display + skin break Trusted Vault
- **What**: `text-7xl`→`lg:text-9xl` + Aurora `background-clip` gradient on `h1` (detector confirmed gradient text live).
- **Why it matters**: No-Shout + “no gradient text” + Rare Signal all fail; purple/pink reads AI, not vault.
- **Fix**: Cap display at DESIGN clamp max `4.5rem`; solid `text-base-content` / rare teal word; keep storefront on vault skin by default.
- **Suggested command**: `$impeccable typeset` / `$impeccable quieter`

### [P1] Identical category icon-card grid
- **What**: Six equal `card` tiles with shared grid-icon fallback.
- **Why it matters**: Exact PRODUCT anti-ref; zero hierarchy for browse.
- **Fix**: Asymmetric browse (featured category + compact list/chips), real art, or 3–4 max with one emphasized.
- **Suggested command**: `$impeccable distill` / `$impeccable layout`

### [P1] Zero trust/reassurance on homepage
- **What**: No delivery speed, payment safety, or support near the purchase path.
- **Why it matters**: Digital keys = high scam anxiety; slogan doesn’t buy trust.
- **Fix**: One quiet trust strip under hero or above products (delivery · payment · support) — not metric cards.
- **Suggested command**: `$impeccable harden` / `$impeccable clarify`

### [P2] Scroll strips brand + search
- **What**: Navbar hides `BrandLogo` and search when scrolled (detector: width layout transitions).
- **Why it matters**: Mobile/first-timers lose recognition and the fastest find path mid-browse.
- **Fix**: Keep logo always; collapse search to icon that reopens field, don’t delete it.
- **Suggested command**: `$impeccable adapt` / `$impeccable polish`

## Persona Red Flags

**Jordan (First-Timer)**: Hero dead end; “Welcome” + slogan don’t explain what to buy; empty stars / thin catalog undercuts legitimacy; must discover Explore Store unaided.

**Casey (Mobile Shopper)**: Chrome-heavy; scroll hides search; hamburger always present beside horizontal links = duplicate IA; category grid will crush on narrow width.

**Riley (Edge Cases)**: Logged-in → CTA section omitted with no alternate end; Reveal starts opacity 0 (blank risk if IO fails); admin-flavored empty states can leak to shoppers.

**Layla (AR gamer — project)**: RTL nav works, but footer tagline stays EN slogan; no Arabic trust copy (delivery/payment); gradient on Arabic display feels skin-demo; no “keys/subs safe here” signal before ATC.

## Minor Observations

- Featured heading forced `uppercase` while Products isn’t.
- `hover-3d` empty `<div>` stacks on Join CTA — decorative junk.
- Desktop hamburger redundant beside Home/Explore.
- Single-product grid looks abandoned, not curated.
- PRODUCT.md still says “purple accent”; DESIGN.md says teal — docs fight the live system.
- Detector bounce easing / repeating-gradient: likely theme or daisyUI chrome — verify before treating as homepage-owned.

## Questions to Consider

1. If the hero can’t hold a single Shop CTA, is this a storefront or a mood board?
2. Would removing the category grid and linking straight into `/games` convert better than six clone cards?
3. Why is Aurora allowed to paint the money page when the North Star is a teal vault?
4. What one sentence would make Layla trust a key enough to add to cart — and where does it live today?
5. If brand and search disappear on scroll, what exactly is the sticky nav protecting?
