# Margin Insights — Design Spec
**Date:** 2026-03-19
**Status:** Approved

---

## Overview

Surface profit margin data throughout the app so the business owner can quickly see how much they're making per order and which planter sizes are most profitable. No schema changes required — margin is computed on the fly from existing price and size data using `estimateOrderCost()`.

---

## Feature 1: Per-Order Margin in "Mark Complete" Modal

When the user taps "Mark Complete" on an active order, the confirmation modal (which already shows a payment prompt) is extended to include a margin summary:

- **Revenue**: the order's sale price
- **Est. Cost**: computed via existing `estimateOrderCost(size, price)`
- **Margin**: `revenue - cost`, displayed as both dollar amount and percentage

Example display:
```
Revenue:   $110.00
Est. Cost:  $40.26
Margin:    $69.74  (63%)
```

The margin percentage is color-coded:
- ≥ 50% → green (`--green`)
- 30–49% → orange (`--orange`)
- < 30% → red (`--red`)

---

## Feature 2: Margin Badge in Sales History

Each row in the Sales History tab (Orders page, `otab-sales`) gets a small inline margin badge showing the margin % for that sale.

- Badge uses the same green/yellow/red color thresholds as above
- Computed on the fly from each sale's `price` and `size` fields using `estimateOrderCost()`
- No additional DB queries needed — data is already loaded when the tab renders

---

## Feature 3: Margin Trend Line Chart (Analytics)

A new line chart added to the Analytics page showing **average margin % by month** over the last 6 months.

- Reuses existing Chart.js setup and monthly bucketing logic from the revenue/profit charts
- X-axis: months (last 6, consistent with other charts)
- Y-axis: margin % (0–100)
- Data source: `sales` table — each sale's margin computed from `price` + `estimateOrderCost(size, price)`
- Positioned above the Margin by Size chart

---

## Feature 4: Margin by Size Bar Chart (Analytics)

A new bar chart below the Margin Trend chart ranking all planter sizes by **average margin %**.

- Each bar: size label (e.g. `48×24×16`) + avg margin %
- Secondary label on each bar: avg profit in dollars (e.g. `$69 avg`)
- Sizes with fewer than 2 sales shown with muted/semi-transparent style to indicate low sample size
- Same green/yellow/red color coding per bar
- Data source: `sales` table, grouped by `size`

---

## Implementation Notes

- `estimateOrderCost(size, price)` already exists and handles both known sizes (hardcoded picket counts × `UNIT_COSTS`) and unknown sizes (37% of price fallback)
- No new Supabase tables or columns needed
- No RLS changes needed
- All margin computation is client-side

---

## Success Criteria

1. "Mark Complete" modal shows revenue, est. cost, and margin ($ and %) with correct color coding
2. Sales History rows display a margin % badge with correct color coding
3. Analytics page shows a Margin Trend line chart (6-month avg margin %)
4. Analytics page shows a Margin by Size bar chart (ranked by avg margin %, muted for <2 sales)
5. All features work correctly in dark mode
6. No regressions to existing Analytics charts, Orders tabs, or order completion flow
