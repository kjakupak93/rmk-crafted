# Dashboard Additions Spec
**Date:** 2026-04-06  
**Status:** Approved

## Overview

Add three new UI elements to the home page dashboard of `index.html`:

1. **Quick Actions bar** — one-tap shortcuts to the most common actions
2. **Today's Focus card** — action-oriented summary of what needs attention now
3. **Best Seller card** — top-selling size/product this month by units sold

## Layout (Option A — approved)

```
[Quick Actions bar — full width]
[KPI Grid 2×2]  [Recent Activity]    ← existing
[Active Orders] [Next Pickups]       ← existing
[Today's Focus] [Best Seller]        ← new
```

On mobile (≤640px): all rows collapse to single column as per existing breakpoints. The new bottom row follows the same pattern — stacked vertically.

---

## Feature 1: Quick Actions Bar

### Appearance
A horizontal flex row of 4 buttons, full width, placed at the top of `#page-home` above the KPI grid. Uses the existing `--bg-card` / `--border` card surface — no new background container needed.

### Buttons (left to right)
| Button | Style | Action |
|---|---|---|
| ＋ New Order | Primary (`--ocean` fill, white text) | `openOrderModal()` |
| 🧾 Log Sale | Secondary (`--bg-card`, `--text-muted`, border) | `openSaleModal()` |
| 🛒 Log Purchase | Secondary | `openPurchaseModal()` |
| 📅 Schedule | Secondary | `goTo('scheduler')` |

### CSS
- New class `.quick-actions` — `display: flex; gap: 8px; margin-bottom: 16px`
- New class `.qa-btn` — `flex: 1; padding: 10px 8px; border-radius: 8px; font-size: 12px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 6px; white-space: nowrap; border: none; cursor: pointer`
- `.qa-btn-primary` — `background: var(--ocean); color: #fff`
- `.qa-btn-secondary` — `background: var(--bg-card); color: var(--text-muted); border: 1px solid var(--border)`
- Mobile (≤640px): buttons wrap to 2×2 grid using `flex-wrap: wrap` — each button `flex: 1 1 calc(50% - 4px)` so two fit per row. Min-height 44px for iOS touch targets.

### No new JS needed — all onClick handlers already exist.

---

## Feature 2: Today's Focus Card

### Appearance
A `--bg-card` card with a `1.5px solid var(--ocean)` border (distinct from standard `--border` cards) to make it stand out as action-oriented. Placed in the left column of the new bottom row.

### Data sources (all from existing `loadHomeStats()` fetch)
| Item | Data | Badge color |
|---|---|---|
| Overdue pickups | `orders` where `pickup_date < today` and `status != 'completed'` | Red |
| Pickups today | `orders` where `pickup_date == today` and `status != 'completed'` — shows first name + time | Orange |
| Ready for pickup | `orders` where `status == 'ready'` | Green |

Each item renders as a row inside the card: icon + title + subtitle + count badge. If a row's count is 0 it is hidden (not rendered). If all three are zero, show a single "All clear ✓" message in `--text-dim`.

### New element IDs
- `#focus-overdue` — the overdue row (hidden when count = 0)
- `#focus-overdue-count` — badge
- `#focus-today` — today's pickups row (hidden when count = 0)
- `#focus-today-sub` — subtitle text (first customer name + time)
- `#focus-today-count` — badge
- `#focus-ready` — ready orders row (hidden when count = 0)
- `#focus-ready-count` — badge
- `#focus-clear` — "All clear" message (hidden unless all three = 0)

### JS changes
Populate inside `loadHomeStats()` after existing order stats are computed. Reuses data already fetched (no new Supabase query).

---

## Feature 3: Best Seller Card

### Appearance
A standard `--bg-card` card (matching existing panels) with a `--sand` accent on the label and stats. Placed in the right column of the new bottom row.

### Layout inside card
- **Header:** label "🏆 Best Seller This Month" in `--sand` + trophy emoji right-aligned
- **Body:** Large size string (e.g. "48×24×16"") in Playfair Display + smaller product type below in `--text-dim`
- **Divider:** `1px solid var(--border-dim)`
- **Stats row:** three equal columns — Units sold | Revenue | Avg price — values in `--sand`, labels in `--text-dim`

### Data source
Query `sales` table for current month. Group by `size` field, count rows per size, pick the one with the highest count. For multi-item sales (`items.rows` present), use the first row's `size`. Revenue = sum of `price` for that size's sales. Avg = revenue / units.

If no sales this month, show "No sales yet this month" in `--text-dim`.

### New element IDs
- `#bs-size` — the size string
- `#bs-product` — product type (from `style` column, or "Standard" fallback)
- `#bs-units` — units count
- `#bs-revenue` — revenue total
- `#bs-avg` — average price
- `#bs-empty` — empty-state message
- `#bs-content` — wrapper shown when data exists (hidden when empty)

### JS
New async function `loadBestSeller()` called from `loadHomeStats()` in parallel with existing fetches (add to `Promise.all`). Fetches `sales` for current month: `.select('price, size, style, items, sale_date').gte('sale_date', firstOfMonth).lte('sale_date', todayStr)`.

---

## Files Changed

- `index.html` — CSS additions (before mobile media query), HTML additions inside `#page-home`, JS additions inside `loadHomeStats()`

## Not in scope
- Clicking a focus item does not navigate anywhere (no drill-down)
- Best Seller does not support changing the time range
- No new Supabase tables or columns needed
