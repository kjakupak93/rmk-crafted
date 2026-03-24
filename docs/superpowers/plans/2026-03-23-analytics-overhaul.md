# Analytics Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the Analytics page from 3 KPI cards + 4 charts to a 5-KPI, 7-chart sectioned dashboard with product-level breakdowns and cumulative revenue.

**Architecture:** All changes are in `index.html` (CSS, HTML, JS all in one file). No new files, no schema changes. New data dimension: add `style` (product type) to the existing `sales` query. New charts use data already loaded in `analyticsSales` — no extra fetches. The best sellers filter sets `bestSellersProductFilter` and calls `renderAnalyticsCharts()` (full re-render, fast since it is in-memory). Filter dropdown is populated via DOM methods (not innerHTML) to avoid XSS with user-controlled product names.

**Tech Stack:** Vanilla JS, Chart.js v4, Supabase client (`sb`), Playwright (tests)

---

## File Map

| File | What Changes |
|---|---|
| `index.html` (CSS block) | 5-col KPI grid, `.analytics-section-header` class, mobile fix for 5th card |
| `index.html` (HTML block, `#page-analytics`) | Add 2 KPI cards, replace single `.analytics-grid` with 3 sectioned grids |
| `index.html` (JS block) | New module vars, `loadAnalytics` query, `renderAnalyticsCharts` additions, `setAnalyticsProductFilter` helper |
| `tests/analytics.spec.ts` | Append new tests to existing smoke test file |

---

### Task 1: CSS — 5-column KPI grid and section headers

**Files:**
- Modify: `index.html` (CSS section — find `.analytics-pnl` rule)
- Modify: `tests/analytics.spec.ts` (append — file already exists with login helper and beforeEach)

- [ ] **Step 1: Write the failing Playwright tests**

`tests/analytics.spec.ts` already exists with `import { login } from './helpers/auth'` and a `beforeEach` that calls `login(page)` then clicks `.app-tile[onclick*="analytics"]`. Append these new tests to the end of the file (do NOT wrap in a describe block — the existing tests are top-level):

```typescript
test('shows 5 KPI cards', async ({ page }) => {
  await expect(page.locator('#pnl-units')).toBeVisible();
  await expect(page.locator('#pnl-aov')).toBeVisible();
});

test('shows new chart canvases', async ({ page }) => {
  await expect(page.locator('#chart-cumulative')).toBeAttached();
  await expect(page.locator('#chart-units-by-product')).toBeAttached();
  await expect(page.locator('#chart-revenue-by-product')).toBeAttached();
});

test('shows best sellers product filter', async ({ page }) => {
  await expect(page.locator('#best-sellers-filter')).toBeVisible();
});

test('shows 3 section headers', async ({ page }) => {
  await expect(page.locator('.analytics-section-header')).toHaveCount(3);
});
```

- [ ] **Step 2: Run test to confirm new tests fail**

```bash
npx playwright test tests/analytics.spec.ts --project=chromium
```
Expected: the 4 new tests fail; the 5 existing tests still pass.

- [ ] **Step 3: Add CSS for section header and 5-column KPI grid**

In `index.html`, find the existing `.analytics-pnl` CSS rule (in the `/* ── Analytics page ── */` block). Replace it:

```css
/* REPLACE: */
.analytics-pnl { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 24px; }

/* WITH: */
.analytics-pnl { display: grid; grid-template-columns: repeat(5, 1fr); gap: 14px; margin-bottom: 24px; }
.analytics-section-header { font-size: 11px; text-transform: uppercase; letter-spacing: .06em; color: var(--text-muted); font-weight: 700; border-bottom: 1px solid var(--warm-gray); padding-bottom: 6px; margin: 20px 0 12px; }
```

In the `@media (max-width: 640px)` block, find the analytics-pnl rules and replace both lines — remove the old `:last-child:nth-child(odd)` rule entirely and replace with the nth-child(5) rule:

```css
/* REPLACE both lines: */
.analytics-pnl { grid-template-columns: 1fr 1fr; }
.analytics-pnl .summary-card:last-child:nth-child(odd) { grid-column: span 2; }

/* WITH (delete old rule, only keep these): */
.analytics-pnl { grid-template-columns: 1fr 1fr; }
.analytics-pnl .summary-card:nth-child(5) { grid-column: span 2; }
```

Verify the old `:last-child:nth-child(odd)` rule is gone — leaving both rules would cause the 5th card to span correctly but is redundant and confusing.

---

### Task 2: HTML — New KPI cards and 3-section page structure

**Files:**
- Modify: `index.html` (HTML section — `#page-analytics` div)

- [ ] **Step 1: Add Units Sold and Avg Order Value KPI cards**

Find the `.analytics-pnl` div in the HTML (3 `.summary-card` divs). After the `pnl-profit` card, add:

```html
<div class="summary-card c-sand">
  <div class="val" id="pnl-units">—</div>
  <div class="lbl">Units Sold</div>
</div>
<div class="summary-card c-blue">
  <div class="val" id="pnl-aov">—</div>
  <div class="lbl">Avg Order Value</div>
</div>
```

Note: No `-lbl` IDs on these two cards — the labels are static and never updated by JS.

- [ ] **Step 2: Replace the single `.analytics-grid` with 3 sectioned grids**

Find the entire `.analytics-grid` div (4 children, all `chart-card--full`). Replace the whole block with:

```html
<!-- Sales Performance -->
<div class="analytics-section-header">Sales Performance</div>
<div class="analytics-grid">
  <div class="chart-card">
    <h3>Revenue vs. Spend</h3>
    <canvas id="chart-revenue-spend"></canvas>
  </div>
  <div class="chart-card">
    <h3>Cumulative Revenue</h3>
    <canvas id="chart-cumulative"></canvas>
  </div>
</div>

<!-- Products -->
<div class="analytics-section-header">Products</div>
<div class="analytics-grid">
  <div class="chart-card">
    <h3>Units by Product</h3>
    <canvas id="chart-units-by-product"></canvas>
  </div>
  <div class="chart-card">
    <h3>Revenue by Product</h3>
    <canvas id="chart-revenue-by-product"></canvas>
  </div>
  <div class="chart-card chart-card--full">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
      <h3 style="margin:0">Best Sellers</h3>
      <select id="best-sellers-filter" onchange="setAnalyticsProductFilter(this.value)" style="font-size:12px;padding:4px 8px;border:1px solid var(--warm-gray);border-radius:8px;background:white;color:var(--text);font-family:'DM Sans',sans-serif;cursor:pointer"></select>
    </div>
    <canvas id="chart-sizes"></canvas>
  </div>
</div>

<!-- Margins -->
<div class="analytics-section-header">Margins</div>
<div class="analytics-grid">
  <div class="chart-card">
    <h3>Margin Trend</h3>
    <canvas id="chart-margin-trend"></canvas>
  </div>
  <div class="chart-card">
    <h3>Margin by Size</h3>
    <canvas id="chart-margin-by-size"></canvas>
  </div>
</div>
```

Note: Revenue vs Spend and the Margin charts lose `chart-card--full` — they are now half-width in their respective 2-column grids. Best Sellers keeps `chart-card--full`.

- [ ] **Step 3: Run the Playwright test**

```bash
npx playwright test tests/analytics.spec.ts --project=chromium
```
Expected: "shows 5 KPI cards", "shows new chart canvases", "shows best sellers product filter", "shows section headers" all pass.

---

### Task 3: JS — New module-level variables and filter helper

**Files:**
- Modify: `index.html` (JS section — find `let analyticsRange = 'year'` block)

- [ ] **Step 1: Add new chart variables and filter state**

Find:
```js
let analyticsRange = 'year';
let chartRevenueSpend = null, chartSizes = null;
let chartMarginTrend = null, chartMarginBySize = null;
let analyticsSales = [], analyticsPurchases = [];
```

Replace with:
```js
let analyticsRange = 'year';
let chartRevenueSpend = null, chartSizes = null;
let chartMarginTrend = null, chartMarginBySize = null;
let chartCumulative = null, chartUnitsByProduct = null, chartRevenueByProduct = null;
let analyticsSales = [], analyticsPurchases = [];
let bestSellersProductFilter = 'all';
```

- [ ] **Step 2: Add `setAnalyticsProductFilter` function**

Find `function setAnalyticsRange(range, btn) {`. Add a new function directly after its closing `}`:

```js
function setAnalyticsProductFilter(filter) {
  bestSellersProductFilter = filter;
  renderAnalyticsCharts();
}
```

- [ ] **Step 3: Commit the HTML/CSS/vars foundation**

```bash
git add index.html tests/analytics.spec.ts
git commit -m "feat: analytics page — 5 KPI cards, 3 sectioned grids, new chart canvases"
```

Note: After this commit, navigating to the Analytics page will log Chart.js errors for `chart-cumulative`, `chart-units-by-product`, and `chart-revenue-by-product` (canvases exist in DOM but chart render code hasn't been added yet). This is expected and resolves after Task 7.

---

### Task 4: Update `loadAnalytics()` — fetch style and populate filter dropdown

**Files:**
- Modify: `index.html` (JS — `loadAnalytics` function)

- [ ] **Step 1: Add `style` to the sales query**

Find `async function loadAnalytics()`. Change:
```js
sb.from('sales').select('price,sale_date,size,qty'),
```
To:
```js
sb.from('sales').select('price,sale_date,size,qty,style'),
```

- [ ] **Step 2: Populate the filter dropdown using DOM methods**

After `analyticsPurchases = pRes.data || [];`, add:

```js
// Populate best sellers product filter from PRODUCT_TYPES
const filterSel = document.getElementById('best-sellers-filter');
if (filterSel) {
  filterSel.textContent = ''; // clear existing options
  const allOpt = document.createElement('option');
  allOpt.value = 'all';
  allOpt.textContent = 'All Products';
  filterSel.appendChild(allOpt);
  PRODUCT_TYPES.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p;
    opt.textContent = p;
    if (bestSellersProductFilter === p) opt.selected = true;
    filterSel.appendChild(opt);
  });
}
```

- [ ] **Step 3: Verify no console errors**

Open browser dev tools, navigate to Analytics. Console should be clean. The filter dropdown should show "All Products" + the 4 default product types.

---

### Task 5: Render Units Sold and Avg Order Value KPI cards

**Files:**
- Modify: `index.html` (JS — `renderAnalyticsCharts`, P&L summary section)

- [ ] **Step 1: Add units and AOV computation after the P&L label block**

Find this line inside `renderAnalyticsCharts()`:
```js
document.getElementById('pnl-profit-lbl').textContent = pnlLabels[2];
```

After it, add:
```js
const salesInRange = analyticsSales.filter(s => inBounds(s.sale_date));
const unitsInRange = salesInRange.reduce((sum, s) => sum + (s.qty || 1), 0);
const avgOrderValue = salesInRange.length > 0 ? Math.round(pnlRev / salesInRange.length) : 0;
document.getElementById('pnl-units').textContent = unitsInRange;
document.getElementById('pnl-aov').textContent = '$' + avgOrderValue;
```

Note: `unitsInRange` sums `qty` (not row count) since a single sale row can represent multiple planters. `avgOrderValue` divides by transaction count (`salesInRange.length`), not unit count, since price is per transaction. The HTML labels are static — no JS label update needed for these two cards. The other three cards update their labels via `pnlLabels` as before.

- [ ] **Step 2: Verify KPI cards show values**

Navigate to Analytics in browser. All 5 KPI cards show numeric values.

---

### Task 6: Add Cumulative Revenue chart

**Files:**
- Modify: `index.html` (JS — `renderAnalyticsCharts`, after Revenue vs Spend chart)

- [ ] **Step 1: Add cumulative revenue chart after the Revenue vs Spend block**

Find the closing `});` of the `chartRevenueSpend = new Chart(...)` call. After it, add:

```js
// ── Cumulative Revenue ──
if (chartCumulative) chartCumulative.destroy();
let cumSum = 0;
const cumulativeData = keys.map(k => { cumSum += revByBucket[k] || 0; return cumSum; });
chartCumulative = new Chart(document.getElementById('chart-cumulative'), {
  type: 'line',
  data: {
    labels: bucketLabels,
    datasets: [{
      label: 'Cumulative Revenue',
      data: cumulativeData,
      borderColor: dark ? '#7BADC8' : '#1E4D6B',
      backgroundColor: dark ? 'rgba(123,173,200,0.08)' : 'rgba(30,77,107,0.08)',
      tension: 0.3,
      pointRadius: 3,
      fill: true
    }]
  },
  options: {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      y: { ticks: { callback: v => '$'+v, color: tickColor }, grid: { color: gridColor }, beginAtZero: true },
      x: { ticks: { color: tickColor }, grid: { color: gridColor } }
    }
  }
});
```

- [ ] **Step 2: Verify chart renders**

Navigate to Analytics. "Cumulative Revenue" chart card should show a rising line.

---

### Task 7: Add Units by Product and Revenue by Product charts

**Files:**
- Modify: `index.html` (JS — `renderAnalyticsCharts`, after Best Sellers chart)

- [ ] **Step 1: Add product aggregation block after the Best Sellers chart**

Find the closing `});` of `chartSizes = new Chart(...)`. After it, add:

```js
// ── Units by Product & Revenue by Product ──
const productUnits = {}, productRevenue = {};
analyticsSales.forEach(s => {
  if (!inBounds(s.sale_date)) return;
  const prod = s.style || 'Standard';
  productUnits[prod] = (productUnits[prod] || 0) + (s.qty || 1);
  productRevenue[prod] = (productRevenue[prod] || 0) + (s.price || 0);
});

const prodUnitEntries = Object.entries(productUnits).sort((a, b) => b[1] - a[1]);
if (chartUnitsByProduct) chartUnitsByProduct.destroy();
chartUnitsByProduct = new Chart(document.getElementById('chart-units-by-product'), {
  type: 'bar',
  data: {
    labels: prodUnitEntries.map(([p]) => p),
    datasets: [{ label: 'Units Sold', data: prodUnitEntries.map(([, n]) => n), backgroundColor: '#C9A55A', borderRadius: 4 }]
  },
  options: {
    indexAxis: 'y', responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { stepSize: 1, color: tickColor }, grid: { color: gridColor }, beginAtZero: true },
      y: { ticks: { color: tickColor }, grid: { color: gridColor } }
    }
  }
});

const prodRevEntries = Object.entries(productRevenue).sort((a, b) => b[1] - a[1]);
if (chartRevenueByProduct) chartRevenueByProduct.destroy();
chartRevenueByProduct = new Chart(document.getElementById('chart-revenue-by-product'), {
  type: 'bar',
  data: {
    labels: prodRevEntries.map(([p]) => p),
    datasets: [{ label: 'Revenue', data: prodRevEntries.map(([, v]) => v), backgroundColor: '#4A86A8', borderRadius: 4 }]
  },
  options: {
    indexAxis: 'y', responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { callback: v => '$' + v, color: tickColor }, grid: { color: gridColor }, beginAtZero: true },
      y: { ticks: { color: tickColor }, grid: { color: gridColor } }
    }
  }
});
```

- [ ] **Step 2: Verify both charts render**

Navigate to Analytics. Products section should show two horizontal bar charts.

---

### Task 8: Wire the Best Sellers product filter

**Files:**
- Modify: `index.html` (JS — Best Sellers aggregation block inside `renderAnalyticsCharts`)

- [ ] **Step 1: Add product filter to Best Sellers aggregation**

Inside `renderAnalyticsCharts()`, find the Best Sellers forEach:

```js
analyticsSales.forEach(s => {
  if (!s.size) return;
  if (s.sale_date) {
```

Add the product filter check after `if (!s.size) return;`:

```js
if (bestSellersProductFilter !== 'all' && (s.style || 'Standard') !== bestSellersProductFilter) return;
```

Important: the Best Sellers chart uses `keys.includes(k)` (bucket-based) for its range guard — not `inBounds()` like the other charts. Do NOT change this guard. The two mechanisms are intentionally different: `inBounds` uses date bounds, `keys.includes` uses the bucket keys array. Both achieve range filtering; changing one to match the other would break the "all-time" bucket behavior for Best Sellers.

- [ ] **Step 2: Verify filter works**

Navigate to Analytics. Change the filter dropdown in the Best Sellers chart. Chart should update to show only sizes matching the selected product type.

- [ ] **Step 3: Run the full Playwright test suite**

```bash
npx playwright test tests/analytics.spec.ts --project=chromium
```
Expected: all 4 tests pass.

- [ ] **Step 4: Run smoke tests to confirm nothing broke**

```bash
npx playwright test --project=chromium
```
Expected: all existing smoke tests pass.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat: analytics — cumulative revenue, product charts, best sellers filter"
```

---

### Task 9: Dark mode for new elements

**Files:**
- Modify: `index.html` (CSS — dark mode block near `[data-theme="dark"] .chart-card`)

- [ ] **Step 1: Add dark mode rules**

Find the dark mode analytics block:
```css
[data-theme="dark"] .analytics-range-toggle button.active { ... }
```

Add after it:
```css
[data-theme="dark"] .analytics-section-header { border-color: #2C4255; }
[data-theme="dark"] #best-sellers-filter { background: #162534; border-color: #2C4255; color: var(--text-muted); }
```

- [ ] **Step 2: Verify dark mode**

Toggle dark mode. Section headers and the filter select should adapt.

- [ ] **Step 3: Final commit and push**

```bash
git add index.html
git commit -m "feat: dark mode — analytics section headers and product filter select"
git push origin main
```

- [ ] **Step 4: Verify deployment (~60 seconds)**

Open the live GitHub Pages URL. Navigate to Analytics. Confirm all 5 KPI cards, all 7 charts, and the product filter all work correctly.

- [ ] **Step 5: Update smoke test count in README files**

This plan adds 4 new tests to `tests/analytics.spec.ts`. Update the smoke test count from **23 → 27** in both `tests/README.md` and `README.md` (search for "23 tests" in each file).
