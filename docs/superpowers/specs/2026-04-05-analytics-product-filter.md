# Analytics Global Product Filter

**Date:** 2026-04-05
**Status:** Approved

## Problem

The Analytics tab has a product filter but it only applies to the Best Sellers chart. All other charts and all five KPI cards always show data for all products. There is no way to see a per-product P&L view.

## Solution

Add a global product filter pill row to the Analytics tab. Selecting a product filters all 7 charts and all 5 KPI cards to show only sales for that product.

## Filter Bar Layout

Three pill rows stacked vertically above the charts:

1. Year toggle — existing (2026 / 2025 / All Years)
2. Range toggle — existing (This Month / Last Month / Last 3M / Last 6M / Full Year / Last 12M / All Time)
3. **Product toggle — new** (All Products / Standard Planter / Vertical Planter / Tiered Planter / Dog Bowl Stand)

Product pills are populated dynamically from `PRODUCT_TYPES` at `loadAnalytics()` time, so adding/renaming products in the Products tab is automatically reflected. Active state uses the same ocean-blue style as the range toggle.

## State

Replace `bestSellersProductFilter` (string, scoped to Best Sellers chart) with:

```js
let analyticsProductFilter = 'all'; // 'all' | any PRODUCT_TYPES value
```

New setter follows the same pattern as year/range:

```js
function setAnalyticsProductFilter(val, btn) {
  analyticsProductFilter = val;
  document.querySelectorAll('.analytics-product-toggle button')
    .forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderAnalyticsCharts();
}
```

## Data Filtering

In `renderAnalyticsCharts()`, filter `analyticsSales` early:

```js
const filteredSales = analyticsProductFilter === 'all'
  ? analyticsSales
  : analyticsSales.filter(s => s.style === analyticsProductFilter);
```

All downstream chart and KPI logic uses `filteredSales` instead of `analyticsSales` directly.

### Material Spend handling

Purchases are not tagged to a product. When a product filter is active, Material Spend switches from actual purchase totals to **estimated cost** (sum of `estimateOrderCost()` across `filteredSales`). When `analyticsProductFilter === 'all'`, actual purchase data is used as today.

This keeps the P&L coherent for a per-product view without showing misleading shop-wide spend.

## KPI Card Labels

When a product is selected, prepend the product name to the revenue label:

- Default: `"This Month Revenue"` / `"Full Year Revenue"` / etc.
- Filtered: `"Standard Planter — This Month Revenue"` / `"Standard Planter — Full Year Revenue"` / etc.

Material Spend, Net Profit, Units Sold, and Avg Order Value labels stay the same (they implicitly reflect the filter since the values change).

## Chart Changes

All 7 charts use `filteredSales`:

| Chart | Change |
|---|---|
| Revenue vs. Spend | Uses filteredSales for revenue bars; cost bar uses estimated cost when filtered |
| Cumulative Revenue | Uses filteredSales |
| Units by Product | Uses filteredSales (when all products selected shows breakdown; when one selected shows single bar) |
| Revenue by Product | Same as above |
| Best Sellers | Uses filteredSales; removes the per-chart product dropdown (now redundant) |
| Margin Trend | Uses filteredSales |
| Margin by Size | Uses filteredSales |

## Removed

- The `<select id="best-sellers-filter">` dropdown inside the Best Sellers chart card header is removed.
- `bestSellersProductFilter` global variable is removed.
- The existing `setAnalyticsProductFilter(filter)` one-arg function is replaced by the two-arg version above.

## HTML Addition

Below the `.analytics-range-toggle` div, add:

```html
<div class="analytics-product-toggle">
  <!-- populated dynamically in loadAnalytics() -->
</div>
```

CSS mirrors the range toggle:

```css
.analytics-product-toggle {
  display: flex;
  gap: 6px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}
.analytics-product-toggle button {
  /* same base style as range toggle buttons */
}
.analytics-product-toggle button.active {
  background: var(--ocean);
  color: white;
}
```

## Out of Scope

- Multi-select (selecting multiple products simultaneously)
- Filtering purchases by product (purchases have no product tag in the DB)
- Any changes to other tabs
