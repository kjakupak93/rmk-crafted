# Analytics Page Overhaul — Design Spec
**Date:** 2026-03-23
**Status:** Approved

## Overview

Expand the existing Analytics page (`page-analytics` in `index.html`) from 3 KPI cards + 4 charts into a richer single-scrollable dashboard with section headers, 5 KPI cards, and 3 new charts. All changes are additive — no existing charts are removed.

## Data Changes

`loadAnalytics()` currently queries:
- `sales`: `price, sale_date, size, qty`
- `purchases`: `total, purchase_date`

Add `style` to the sales query so product-type charts are possible:
```js
sb.from('sales').select('price,sale_date,size,qty,style')
```

No schema changes required — `style` already exists on the `sales` table.

## KPI Cards

Expand from 3 cards to 5. Add to the `.analytics-pnl` grid (change from `repeat(3,1fr)` to `repeat(5,1fr)` on desktop; mobile stays 2-column with last card spanning full width if odd):

| Card | Color | Value |
|---|---|---|
| Revenue | green | sum of `price` in range |
| Material Spend | orange | sum of `total` in range |
| Est. Net Profit | blue | revenue − spend |
| Units Sold | sand (`c-sand`) | count of sales rows in range |
| Avg Order Value | ocean (`c-blue`) | revenue ÷ units sold |

All 5 cards respect the selected time range.

## Page Structure

The `.analytics-grid` is replaced with three labeled sections, each with its own sub-grid of chart cards.

```
[ 5 KPI Cards ]

[ Range Toggle ]

── Sales Performance ──────────────────
[ Revenue vs. Spend ] [ Cumulative Revenue ]

── Products ───────────────────────────
[ Units by Product ] [ Revenue by Product ]
[ Best Sellers by Size  (product filter) ]

── Margins ────────────────────────────
[ Margin Trend ] [ Margin by Size ]
```

Section headers use a small uppercase label style matching the existing `chart-card h3` aesthetic.

## Charts

### Existing (kept, reorganized)
- **Revenue vs. Spend** — bar + profit line combo (unchanged)
- **Best Sellers by Size** — horizontal bar, top 10 sizes — add a `<select>` dropdown above it to filter by product type (All / Standard / Vertical / Tiered / Dog Bowl). Filtering rerenders the chart without re-fetching data.
- **Margin Trend** — avg margin % line over time (unchanged)
- **Margin by Size** — avg margin % bar by size, all-time (unchanged)

### New Charts

**Cumulative Revenue** (`chart-cumulative`)
- Type: `line`
- Data: running sum of revenue across time buckets in the selected range
- Color: `--navy` / `--ocean-light` in dark mode
- Respects the selected range; resets accumulator per render

**Units by Product** (`chart-units-by-product`)
- Type: `bar`, `indexAxis: 'y'`
- Data: count of sales rows grouped by `style`, filtered to selected range
- Labels: product names (Standard, Vertical, Tiered, Dog Bowl), sorted descending by count
- Color: `--sand`

**Revenue by Product** (`chart-revenue-by-product`)
- Type: `bar`, `indexAxis: 'y'`
- Data: sum of `price` grouped by `style`, filtered to selected range
- Labels: same product names, sorted descending by revenue
- Color: `--ocean`
- Y-axis tick format: `$` prefix

## Layout / CSS

- `.analytics-pnl`: change to `grid-template-columns: repeat(5, 1fr)` on desktop
- Mobile (`≤640px`): keep `1fr 1fr`, last card spans 2 cols if odd count (now 5 cards → last card spans full width)
- Add `.analytics-section-header` class: `font-size:11px; text-transform:uppercase; letter-spacing:.06em; color:var(--text-muted); font-weight:700; border-bottom:1px solid var(--warm-gray); padding-bottom:6px; margin:8px 0 0;`
- Charts in Products section are half-width (2-column grid), except Best Sellers which is full-width
- Margin section charts are half-width (2-column grid)

## JavaScript

### Module-level additions
```js
let chartCumulative = null;
let chartUnitsByProduct = null;
let chartRevenueByProduct = null;
let bestSellersProductFilter = 'all'; // tracks current filter selection
```

### `loadAnalytics()` change
Add `style` to the sales select.

### `renderAnalyticsCharts()` additions
- Compute `unitsInRange` (count) and `avgOrderValue` (revenue / units) for KPI cards
- Render cumulative revenue: iterate buckets accumulating `revByBucket` values
- Render units-by-product: group `analyticsSales` by `style`, filter by range bounds
- Render revenue-by-product: same grouping, sum `price` instead of count
- Best Sellers filter: new `renderBestSellersChart(filter)` helper called from both `renderAnalyticsCharts()` and the filter dropdown's `onchange`

### Best Sellers filter
Add `<select id="best-sellers-filter">` above `chart-sizes` canvas. `onchange` calls `renderBestSellersChart(this.value)`. The filter uses the already-loaded `analyticsSales` — no re-fetch.

## Dark Mode
New charts follow existing patterns: `tickColor`, `gridColor`, `legendColor` variables already computed in `renderAnalyticsCharts()`. No new dark mode CSS needed.

## Mobile
All new charts are responsive (`responsive: true` on Chart.js options). The 2-column grid for Products and Margins sections collapses to 1 column on mobile (existing `@media (max-width:640px) .analytics-grid { grid-template-columns:1fr }` pattern extended to new sections).

## Out of Scope
- Payment method split chart (not selected)
- Avg order value trend line (not selected)
- Any new Supabase tables or schema changes
- E2E tests (analytics page has no CRUD operations; visual-coverage.spec.ts may need snapshot updates if it screenshots analytics)
