# Margin Insights — Design Spec
**Date:** 2026-03-19
**Status:** Approved

---

## Overview

Surface profit margin data throughout the app so the business owner can quickly see how much they're making per order and which planter sizes are most profitable. No schema changes required — margin is computed on the fly from existing price and size data.

---

## Existing Behavior to Preserve

`_doCompleteOrder()` already computes margin and shows it in a success toast:
> `Order complete 🎉 · Est. profit $69 (63% margin)`

This toast already works for both pre-paid and unpaid orders. Feature 1 extends the *modal* for the unpaid-order path only; the toast behavior is kept as-is.

---

## Cost Estimation Helper

`estimateOrderCost(order)` takes a single object. It reads `order.items?.rows` first; if absent, falls back to `order.size` (string, e.g. `"36×16×16"`) and `order.price`. Returns `price * 0.37` when the size string is unparseable.

**For sales rows** (no `items`), call as: `estimateOrderCost({ size: sale.size, price: sale.price })`

**Detecting the 37% fallback:** `estimateOrderCost()` returns only a number, with no flag. To detect whether the fallback was used, check the size string at the call site: `const isFallback = !size?.match(/(\d+)[^\d]+(\d+)[^\d]+(\d+)/)`. When `isFallback` is true, prefix the displayed margin with `~`.

**Exception:** When `order.items?.rows?.length > 0`, the function uses the items-based path (never the 37% fallback), so `isFallback` must be set to `false` in that case regardless of `order.size`. Apply this check in Features 1 and 2. Feature 3 averages across rows — no `~` prefix needed there, just use the returned cost value as-is.

---

## Color Thresholds

Align with the existing `buildPricingMatrix()` thresholds (inline styles, not `.badge` class):
- **≥ 60%** → `var(--green)`
- **50–59%** → `var(--orange)`
- **< 50%** → `var(--red)`

---

## New Chart Globals

Add two chart variables alongside the existing `chartRevenue`, `chartProfit`, `chartSizes` declarations:
- `chartMarginTrend` — for the Margin Trend line chart
- `chartMarginBySize` — for the Margin by Size bar chart

Destroy and recreate these on each `renderAnalyticsCharts()` call, following the existing chart teardown pattern.

---

## Feature 1: Margin Summary in "Mark Complete" Modal (Unpaid Orders Only)

The `completePaymentModal` is shown only when `data.payment === 'unpaid'`. Inject a margin summary block into the modal DOM **inside `completeOrder()`**, after `_pendingCompleteOrderData` is set and before `openModal('completePaymentModal')` is called.

The block appears **above** the payment method buttons. Style it as a simple bordered summary box using `border: 1px solid var(--warm-gray); border-radius: 8px; padding: 12px; margin-bottom: 16px; background: var(--sand-pale)` to match existing summary card patterns.

The block shows:
```
Revenue:    $110
Est. Cost:  $40
Margin:     $70  (63%)
```

- Cost: `estimateOrderCost(_pendingCompleteOrderData)`
- Margin %: `Math.round(((price - cost) / price) * 100)`, or `0` if `price === 0`
- Margin % color-coded per thresholds above; prefix `~` when 37% fallback was used. Use the full two-part check: `const isFallback = !(data.items?.rows?.length > 0) && !data.size?.match(/(\d+)[^\d]+(\d+)[^\d]+(\d+)/)`
- Use `font-family: 'DM Mono', monospace` for the dollar/percentage values
- **Injection target:** inject into `document.querySelector('#completePaymentModal .modal')`. Insert the block before the first child `<div>` (the Cash/Venmo button row at `div:first-of-type`), using `modal.insertBefore(block, modal.querySelector('div'))`. This places the summary between the `<p>` subtitle and the payment buttons.
- **Idempotent injection:** give the block `id="complete-margin-summary"`. In `completeOrder()`, check `document.getElementById('complete-margin-summary')` — if it exists, update its `innerHTML`; otherwise create and insert it. This prevents stacking duplicate blocks across multiple completions in the same session.
- Pre-paid orders skip this modal entirely — no change needed for that path

---

## Feature 2: Margin Badge in Sales History

Each row in the Sales History tab (`otab-sales`) gets a margin % badge displayed **inside the price cell**, after the price value. The target function is `renderSalesTable()`, which iterates `allSales` (fetched with `select('*')` in `loadSales()` — `size` and `price` are available).

Example cell content: `$110 <span style="color:var(--green);font-size:0.8em;margin-left:6px">63%</span>`

- Use inline `style` for color (not `.badge` class, which is tied to payment status strings)
- Computed via `estimateOrderCost({ size: sale.size, price: sale.price })`
- Prefix `~` when 37% fallback was used
- Multi-planter size strings (e.g. `"36×16×16 + 48×24×16"`) will parse to 37% fallback — show as `~XX%` as-is

---

## Feature 3: Margin Trend Line Chart (Analytics)

A new line chart added to the Analytics page showing **average margin % by month**.

- **Respects the existing range toggle** — uses the same `getAnalyticsMonths()` output and applies the same month label formatting (`toLocaleDateString(...)`) as the existing revenue/profit charts
- Chart variable: `chartMarginTrend`
- X-axis: month labels (same as other charts)
- Y-axis: margin % (0–100), ticks suffixed with `%`
- For each month: average `(price - estimateOrderCost({size, price})) / price * 100` across all `analyticsSales` rows whose `sale_date` falls in that month. `qty` does not affect margin % (cost and revenue scale linearly), so average per row, not per unit.
- **Months with zero sales:** plot `null` (not `0`) so Chart.js renders a gap in the line rather than a misleading zero dip. Set `spanGaps: false` on the dataset.
- **Null `sale_date` rows:** skip any `analyticsSales` row where `sale_date` is null.
- **Month bucketing:** use `sale_date.slice(0, 7)` as the key (produces `YYYY-MM`), matching the format of entries in the `months` array from `getAnalyticsMonths()`.
- Data source: existing `analyticsSales` array
- Positioned above the Margin by Size chart in Analytics, below the existing charts
- Chart type: `line` with dataset properties: `tension: 0.3, pointRadius: 3, fill: false` (no existing line chart reference in the codebase — construct from these values)
- Canvas ID: `chart-margin-trend` — add a new `.chart-card.chart-card--full` div with this canvas after the existing Best Sellers card in `#page-analytics .analytics-grid`

---

## Feature 4: Margin by Size Bar Chart (Analytics)

A new bar chart below the Margin Trend chart ranking planter sizes by **average margin %**.

- Chart variable: `chartMarginBySize`
- Data source: `analyticsSales` — **all-time data** (not range-filtered), so that sizes have enough samples to be meaningful. Use the full `analyticsSales` array before any month filtering.
- Group rows by `size` string; compute average margin % per group
- Sorted **descending** (highest margin at left)
- Each bar color-coded per thresholds above
- Sizes with **fewer than 2 all-time sales** rendered at `50%` opacity (`backgroundColor` with `rgba` or via `alpha`)
- Multi-planter size strings (e.g. `"36×16×16 + 48×24×16"`) are **skipped** — filter out any `size` value that contains `+` before grouping
- Tooltip shows: `Avg margin: XX% · Avg profit: $YY · N sales` where avg profit = `average of (price - cost) per row` (per-row difference, then averaged — consistent with `buildPricingMatrix()`). Average per row, not per unit (do not multiply by `qty`).
- **Tooltip implementation:** store metadata in two parallel arrays (`avgProfitArr`, `countArr`) indexed by bar position. Use `plugins.tooltip.callbacks.label` with the Chart.js v4 signature `(context) => ...`, accessing metadata as `avgProfitArr[context.dataIndex]` and `countArr[context.dataIndex]`.
- No inline bar labels (avoids requiring `chartjs-plugin-datalabels`)
- Canvas ID: `chart-margin-by-size` — add a new `.chart-card.chart-card--full` div with this canvas after the Margin Trend card in `#page-analytics .analytics-grid`
- **Note:** cost here comes from `estimateOrderCost` (picket-based estimate), not from Lowes purchase receipts. This differs from the Profit Overview chart which uses `analyticsPurchases`. The margin numbers will differ from the purchase-based profit view — this is expected and intentional for this feature.

---

## Implementation Notes

- No new Supabase tables, columns, or RLS changes needed
- All margin computation is client-side
- No new CDN dependencies needed
- `loadAnalytics()` already fetches `price`, `size`, `qty`, `sale_date` — sufficient for Features 3 and 4
- `loadSales()` fetches `select('*')` — sufficient for Feature 2

---

## Success Criteria

1. `completePaymentModal` shows a bordered margin summary block (Revenue / Est. Cost / Margin) above the payment buttons, injected in `completeOrder()` after setting `_pendingCompleteOrderData`
2. Pre-paid order completion is unaffected (no modal, existing toast unchanged)
3. Sales History rows show an inline margin % badge inside the price cell with correct color coding; multi-planter rows show `~XX%`
4. Analytics page shows a Margin Trend line chart that updates when the range toggle changes, using consistent month label formatting
5. Analytics page shows a Margin by Size bar chart sorted descending by avg margin % (all-time data), multi-planter rows excluded, low-sample sizes at 50% opacity, tooltip shows avg profit $
6. Color thresholds (≥60% green, 50–59% orange, <50% red) and `~` prefix for estimated values are consistent across all four features
7. All features work correctly in dark mode
8. No regressions to existing Analytics charts, Orders tabs, or order completion flow
