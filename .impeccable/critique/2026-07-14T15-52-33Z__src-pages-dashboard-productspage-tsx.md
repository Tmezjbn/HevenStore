---
target: Products / ProductsPage
total_score: 21
p0_count: 0
p1_count: 3
timestamp: 2026-07-14T15-52-33Z
slug: src-pages-dashboard-productspage-tsx
---
# Critique: Products (`ProductsPage.tsx`)

Method: dual-agent (A: 291629da-6898-4f76-8235-c5aeee108242 · B: b0e70afd-2c09-4c7a-b933-357787a09b34)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Mute mutate feedback; no list load-error path (Orders has it) |
| 2 | Match System / Real World | 3 | Active·no stock is clear commerce; star/eye need title-hunt |
| 3 | User Control and Freedom | 2 | No in-search clear-X; hide/feature one-click, no undo |
| 4 | Consistency and Standards | 2 | Behind Orders (filters, clear, error, mobile cards); not `table-zebra` |
| 5 | Error Prevention | 2 | Delete confirms; hide/unfeature do not; trash beside Edit |
| 6 | Recognition Rather Than Recall | 2 | Icon-only secondary actions; no status/stock filter chips |
| 7 | Flexibility and Efficiency | 1 | Search only — no sort/filters/bulk |
| 8 | Aesthetic and Minimalist Design | 3 | Restrained list; column gap + missing thumbs add noise |
| 9 | Error Recovery | 2 | Search empty recovers; fetch failure can look like empty catalog |
| 10 | Help and Documentation | 2 | Titles on icons; no OOS triage guidance |
| **Total** | | **21/40** | **Acceptable** |

## Anti-Patterns Verdict

**LLM assessment:** Partial. Not marketing AI slop — competent DaisyUI vault admin. Fails category fluency vs Orders: generic table chrome, icon action scaffold, missing-thumb holes, wide Status→Actions void.

**Deterministic scan:** CLI exit 2 — **13×** `design-system-font-size` (10px×12, 11px×1) on ProductsPage (advisory, mostly modal denseness). Browser overlay: cramped-padding on table wrapper; shell-level single-font / gradient-text / bounce / stripes → mostly false positives for this page.

**Visual overlays:** Injection OK on `/dashboard/products`. Live-server :8400 stopped. Overlay labels: cramped padding, layout-transition.

## Overall Impression

Clean ops list with one sharp commerce signal (**Active · no stock**). Biggest gap: triage power (filters) + safe actions + bilingual product identity — not more decoration.

## What's Working

1. **Active · no stock** + warning stock copy — commerce clarity done right  
2. Restrained IA: count · Add · search · table — Rare Signal on Add  
3. Icon actions have bilingual `aria-label` / `title`

## Priority Issues

### [P1] Icon action cluster: Star · Edit · Eye · Trash
- **Why:** Hide/feature one-click, no undo; trash beside Edit → misclick risk  
- **Fix:** Overflow menu for secondary; confirm hide; keep Edit labeled  
- **Suggested command:** `$impeccable harden` / `$impeccable clarify`

### [P1] List always shows `product.name`, never `name_ar`
- **Why:** AR admin scans English catalog identity — bilingual-by-default broken  
- **Fix:** Locale-aware title (`name_ar` when lang=ar)  
- **Suggested command:** `$impeccable harden`

### [P1] No triage filters (status / stock / featured)
- **Why:** Can't answer “live but OOS?” without eyeballing every row  
- **Fix:** Chip filters like Orders density  
- **Suggested command:** `$impeccable layout` / `$impeccable distill` (filters, not more chrome)

### [P2] Missing thumbnail = layout hole
- **Why:** GTA5 shifts name; looks unfinished  
- **Fix:** Fixed avatar slot + placeholder  
- **Suggested command:** `$impeccable polish`

### [P2] List chrome behind Orders
- **Why:** No clear-X, loadError+retry, mobile cards, `table-zebra`  
- **Fix:** Align with Orders patterns  
- **Suggested command:** `$impeccable polish`

## Persona Red Flags

**Alex:** No bulk/sort/filters/shortcuts; every edit = mega-modal.  
**Sam:** Icon-only Star/Eye/Trash; muted header contrast; trash next to Edit.  
**Nour:** Product column ignores `name_ar`; AR chrome + EN catalog identity.

## Minor Observations

- DESIGN wants `table-zebra`; page uses plain `table`  
- Featured star `warning` hue competes with OOS warning  
- Duplicate “Products” headings (layout + page)  
- Hardcoded `$` price format  

## Questions to Consider

1. If the job is triage live inventory, why is the only filter text search while **Active · no stock** must be hunted row-by-row?  
2. Should Hide/Delete share a row with Edit, or teach that visibility/destruction are peer to editing?  
3. When Nour switches to AR, should the Product column still show `fortnie` / `gta52`?
