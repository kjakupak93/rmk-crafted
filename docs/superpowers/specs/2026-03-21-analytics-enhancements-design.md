# Analytics Enhancements — Design Spec

**Date:** 2026-03-21
**Status:** Approved

## Problem

The analytics page has three gaps:
1. The P&L summary cards are hardcoded to "this month" and do not update when the date range filter changes.
2. The "Revenue by Month" chart shows revenue only — material costs and profit are buried in a separate "Profit Overview" chart.
3. The date range filter only offers "This Year", "Last 12M", and "All Time" — no short-term options.

## Requirements

- Add 4 new date range filter buttons: This Month, Last Month, Last 3M, Last 6M.
- P&L summary cards (Revenue, Material Spend, Est. Net Profit) must reflect the selected range. Card labels update to match the selected period.
- Merge "Revenue by Month" and "Profit Overview" into a single full-width "Revenue vs. Spend" chart.
- For single-month ranges (This Month, Last Month), the chart buckets data by week instead of by month.
- All other charts (Best Sellers, Margin Trend, Margin by Size) are unchanged in behavior but must be updated to use the new bucket format (see JS Changes below).

## Date Range Filters

**New button order (left to right):**
This Month · Last Month · Last 3M · Last 6M · This Year · Last 12M · All Time

**Range keys** (new ones added to `analyticsRange`):
- `'month'` — current calendar month: `sale_date >= YYYY-MM-01` AND `sale_date <= today`
- `'lastmonth'` — previous full calendar month: `sale_date >= first day of last month` AND `sale_date <= last day of last month`
- `'3m'` — rolling 3 calendar months: same bounded-loop approach as `'12m'`, generating 3 monthly keys ending at the current month
- `'6m'` — rolling 6 calendar months: same bounded-loop approach as `'12m'`, generating 6 monthly keys ending at the current month

**Default range** remains `'year'` (This Year).

## Bucketing Logic — `getAnalyticsBuckets()`

`getAnalyticsMonths()` is **renamed** to `getAnalyticsBuckets()`. It returns `{ key: string, label: string }[]`.

**For multi-month ranges** (`'3m'`, `'6m'`, `'year'`, `'12m'`, `'all'`):
- `key` is `"YYYY-MM"` (e.g. `"2026-03"`)
- `label` is `"Mar '26"`
- Same generation logic as today (bounded loop for `'3m'`/`'6m'`/`'year'`/`'12m'`; dynamic from data for `'all'`)

**For single-month ranges** (`'month'`, `'lastmonth'`):
- Determine the month's first and last day (e.g. 2026-03-01 to 2026-03-31)
- Generate weekly buckets: iterate from the month's first day to its last day, advancing by 7 days per bucket. Each bucket starts on the first day of the week (Monday), but the bucket is clipped to the month boundary for display purposes.
- `key`: the ISO date of the bucket's start day (clamped to the first day of the month for the first bucket), formatted as `"YYYY-MM-DD"` (e.g. `"2026-03-03"`)
- `label`: `"Mar 3"` (short month name + day of the bucket start)
- A sale or purchase record belongs to a bucket if its date falls on or after the bucket's start day AND before the next bucket's start day (or the end of the month for the last bucket). Records outside the month's date range are excluded entirely.

**Callers of the old `getAnalyticsMonths()` that used `months` as a string array** must be updated to extract keys: `const keys = buckets.map(b => b.key)`. This applies to:
- The Best Sellers chart filter (`months.includes(key)` → `keys.includes(key)`)
- The Margin Trend and Margin by Size x-axis labels (use `buckets.map(b => b.label)` for labels, `buckets.map(b => b.key)` for data matching)

## P&L Summary Cards

**DOM:** Add IDs to the three label elements (`.lbl` divs inside each `.summary-card`):
- `id="pnl-revenue-lbl"` on the "This Month Revenue" label
- `id="pnl-cost-lbl"` on the "Material Spend" label
- `id="pnl-profit-lbl"` on the "Est. Net Profit" label

**Behavior:** Move P&L calculation from `loadAnalytics()` into `renderAnalyticsCharts()` so it reruns on every range change.

**P&L values:** Sum revenue/cost across all records within the current range's date bounds (not just the bucket keys — use inclusive date range filtering for accuracy).

**Label text per range:**

| Range | Revenue label | Cost label | Profit label |
|---|---|---|---|
| `'month'` | This Month Revenue | Material Spend | Est. Net Profit |
| `'lastmonth'` | Last Month Revenue | Material Spend | Est. Net Profit |
| `'3m'` | 3-Month Revenue | Material Spend | Est. Net Profit |
| `'6m'` | 6-Month Revenue | Material Spend | Est. Net Profit |
| `'year'` | This Year Revenue | Material Spend | Est. Net Profit |
| `'12m'` | 12-Month Revenue | Material Spend | Est. Net Profit |
| `'all'` | All-Time Revenue | Material Spend | Est. Net Profit |

## Merged Chart: "Revenue vs. Spend"

**Replaces:** The two side-by-side chart cards ("Revenue by Month" and "Profit Overview").

**New card:** Full-width (`chart-card--full`), title "Revenue vs. Spend", canvas `id="chart-revenue-spend"`.

**Datasets:**
- Green bars (`#3A7D5C`) — Revenue
- Orange bars (`#D4782A`) — Material Cost
- Navy line (`#1E4D6B`, dark mode: `#7BADC8`) — Profit (revenue − cost)

**Legend:** Bottom, font size 11.

**Chart.js variable:** `chartRevenue` and `chartProfit` module-level vars are replaced by `chartRevenueSpend`. Both are destroyed on re-render.

## HTML Changes

**Range toggle:** Add 4 new buttons before the existing "This Year" button:
```html
<button id="range-btn-month" onclick="setAnalyticsRange('month',this)">This Month</button>
<button id="range-btn-lastmonth" onclick="setAnalyticsRange('lastmonth',this)">Last Month</button>
<button id="range-btn-3m" onclick="setAnalyticsRange('3m',this)">Last 3M</button>
<button id="range-btn-6m" onclick="setAnalyticsRange('6m',this)">Last 6M</button>
```

**P&L label IDs:** Add `id` attributes to the three `.lbl` elements (see P&L section above).

**Charts grid:** Remove the `chart-card` divs for "Revenue by Month" (canvas `chart-revenue`) and "Profit Overview" (canvas `chart-profit`). Add one new full-width card with canvas `chart-revenue-spend` as the first item in the grid.

## JS Changes Summary

| Symbol | Change |
|---|---|
| `chartRevenue`, `chartProfit` | Replaced by `chartRevenueSpend` |
| `getAnalyticsMonths()` | Renamed to `getAnalyticsBuckets()`, returns `{key, label}[]` |
| `loadAnalytics()` | Remove P&L card update block; no other changes |
| `renderAnalyticsCharts()` | Add P&L update here; use `getAnalyticsBuckets()` for all charts; replace `chartRevenue`+`chartProfit` render with single `chartRevenueSpend` render; update Best Sellers / Margin charts to use `keys` extracted from buckets |
| `setAnalyticsRange()` | No change |

## Schema Note

`sales.venmo_fee` exists (added in a prior migration). The `loadAnalytics()` select does not need to fetch it — it is out of scope for this feature.

## Dark Mode

The new chart uses existing color variables. `chartRevenueSpend` is destroyed and recreated on every `renderAnalyticsCharts()` call, matching the existing pattern.

## Out of Scope

- Venmo fee in analytics.
- Changes to Best Sellers, Margin Trend, or Margin by Size chart designs (only bucket key extraction is updated).
- Export or download of chart data.
