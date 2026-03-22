# Analytics Enhancements — Design Spec

**Date:** 2026-03-21
**Status:** Approved

## Problem

The analytics page has three gaps:
1. The P&L summary cards are hardcoded to "this month" and do not update when the date range filter changes.
2. The "Revenue by Month" chart shows revenue only — material costs and profit are buried in a separate "Profit Overview" chart.
3. The date range filter only offers "This Year", "Last 12M", and "All Time" — no short-term options like This Month or Last Month.

## Requirements

- Add 4 new date range filter buttons: This Month, Last Month, Last 3M, Last 6M.
- P&L summary cards (Revenue, Material Spend, Est. Net Profit) must reflect the selected range. Card labels must update to match the selected period.
- Merge "Revenue by Month" and "Profit Overview" into a single full-width "Revenue vs. Spend" chart.
- For single-month ranges (This Month, Last Month), the chart buckets data by **week** instead of by month.
- All other charts (Best Sellers, Margin Trend, Margin by Size) are unchanged.

## Date Range Filters

**New button order (left to right):**
This Month · Last Month · Last 3M · Last 6M · This Year · Last 12M · All Time

**New range keys** (added to `analyticsRange`):
- `'month'` — current calendar month (Jan 1–today for current month)
- `'lastmonth'` — previous full calendar month
- `'3m'` — rolling 3 months (today back 3 months)
- `'6m'` — rolling 6 months (today back 6 months)

**Default range** remains `'year'` (This Year).

## Bucketing Logic

`getAnalyticsMonths()` is replaced by a more general `getAnalyticsBuckets()` that returns an array of bucket descriptors:

```js
// Each bucket:
{ key: string, label: string }
```

**Monthly buckets** (all ranges except `'month'` and `'lastmonth'`): same as today — `key` is `"YYYY-MM"`, label is `"Jan '26"`.

**Weekly buckets** (`'month'` and `'lastmonth'`): 4–5 buckets. Each bucket covers Mon–Sun (or partial week at start/end of month). `key` is `"YYYY-Www"` (ISO week), label is `"Mar 3"` (start date of week).

Revenue and cost aggregation maps use the `key` from each bucket. Sales records are matched by computing their bucket key from `sale_date`. Purchase records matched by `purchase_date`.

## P&L Summary Cards

Cards currently show hardcoded "this month" data from `loadAnalytics()`. After this change:

- The P&L calculation is moved out of `loadAnalytics()` into `renderAnalyticsCharts()`, so it reruns on every range change.
- Card labels update to describe the selected period:
  - `'month'` → "This Month Revenue" / "Material Spend" / "Est. Net Profit"
  - `'lastmonth'` → "Last Month Revenue" / "Material Spend" / "Est. Net Profit"
  - `'3m'` → "3-Month Revenue" / "Material Spend" / "Est. Net Profit"
  - `'6m'` → "6-Month Revenue" / "Material Spend" / "Est. Net Profit"
  - `'year'` → "This Year Revenue" / "Material Spend" / "Est. Net Profit"
  - `'12m'` → "12-Month Revenue" / "Material Spend" / "Est. Net Profit"
  - `'all'` → "All-Time Revenue" / "Material Spend" / "Est. Net Profit"
- P&L values are summed across all buckets in the current range.

## Merged Chart: "Revenue vs. Spend"

**Replaces:** The two side-by-side chart cards ("Revenue by Month" and "Profit Overview").

**New card:** Full-width (`chart-card--full`), title "Revenue vs. Spend", canvas `id="chart-revenue-spend"`.

**Datasets:**
- Green bars (`#3A7D5C`) — Revenue
- Orange bars (`#D4782A`) — Material Cost
- Navy line (`#1E4D6B`, dark mode: `#7BADC8`) — Profit (revenue − cost)

**Legend:** Bottom, font size 11.

**Chart.js variables:** `chartRevenue` and `chartProfit` are replaced by a single `chartRevenueSpend`. Both old canvases are removed from the HTML.

## HTML Changes

**Range toggle** (`#page-analytics`): Add 4 new buttons before "This Year":
```html
<button id="range-btn-month" onclick="setAnalyticsRange('month',this)">This Month</button>
<button id="range-btn-lastmonth" onclick="setAnalyticsRange('lastmonth',this)">Last Month</button>
<button id="range-btn-3m" onclick="setAnalyticsRange('3m',this)">Last 3M</button>
<button id="range-btn-6m" onclick="setAnalyticsRange('6m',this)">Last 6M</button>
```

**Charts grid:** Remove the two existing `chart-card` divs for "Revenue by Month" and "Profit Overview". Add one new full-width card:
```html
<div class="chart-card chart-card--full">
  <h3>Revenue vs. Spend</h3>
  <canvas id="chart-revenue-spend"></canvas>
</div>
```

## JS Changes Summary

| Function | Change |
|---|---|
| `analyticsRange` init | stays `'year'` |
| `chartRevenue`, `chartProfit` vars | replaced by `chartRevenueSpend` |
| `loadAnalytics()` | remove P&L card update; add `select('price,sale_date,size,qty,venmo_fee')` (for future use, no change to existing logic) |
| `getAnalyticsMonths()` | renamed to `getAnalyticsBuckets()`, returns `{key, label}[]`, handles weekly buckets |
| `renderAnalyticsCharts()` | update P&L cards here instead; use buckets from `getAnalyticsBuckets()`; replace two chart renders with one `chartRevenueSpend` render |
| `setAnalyticsRange()` | no change needed |

## Dark Mode

The new chart uses existing color variables. `chartRevenueSpend` must be destroyed/recreated on re-render (same pattern as existing charts).

## Out of Scope

- Venmo fee in analytics (tracked in `sales.venmo_fee` but not surfaced here yet).
- Any changes to Best Sellers, Margin Trend, or Margin by Size charts.
- Export or download of chart data.
