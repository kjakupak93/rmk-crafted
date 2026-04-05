# Analytics Global Product Filter — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a global product filter pill row to the Analytics tab that filters all 7 charts and all 5 KPI cards simultaneously.

**Architecture:** Single-file change to `index.html`. A new `analyticsProductFilter` global replaces `bestSellersProductFilter`. `loadAnalytics()` populates product pills dynamically from `PRODUCT_TYPES`. `renderAnalyticsCharts()` applies product filtering immediately after year filtering, producing a `filteredSales` array used by all downstream chart and KPI logic. When a product is selected, Material Spend uses estimated cost (via `estimateOrderCost()`) instead of actual purchase data.

**Tech Stack:** Vanilla JS, HTML, Chart.js v4, Supabase client (`sb`). All changes in `index.html`. Tests in `tests/e2e/analytics.spec.ts` (new file).

---

### Task 1: Add CSS and HTML skeleton for product toggle

**Files:**
- Modify: `index.html` (CSS block ~line 1181, HTML block ~line 1839)

- [ ] **Step 1: Add CSS for `.analytics-product-toggle`**

Find the existing CSS block for `.analytics-range-toggle` (around line 1179) and insert immediately after it:

```css
.analytics-product-toggle { display: flex; gap: 6px; margin-bottom: 24px; flex-wrap: wrap; }
.analytics-product-toggle button { padding: 8px 16px; border: 1px solid var(--border); border-radius: 20px; background: var(--bg-card); color: var(--text-muted); font-size: 13px; cursor: pointer; font-family: 'DM Sans', sans-serif; min-height: 36px; }
.analytics-product-toggle button.active { background: var(--ocean); color: white; border-color: var(--ocean); }
```

- [ ] **Step 2: Add HTML placeholder for product toggle**

Find the `.analytics-range-toggle` div in the HTML (inside `#page-analytics`, around line 1839):

```html
    <div class="analytics-range-toggle">
      <button id="range-btn-month" onclick="setAnalyticsRange('month',this)">This Month</button>
      ...
    </div>
```

Insert immediately after that closing `</div>`:

```html
    <div class="analytics-product-toggle" id="analytics-product-toggle">
      <!-- populated by loadAnalytics() -->
    </div>
```

- [ ] **Step 3: Remove the Best Sellers chart dropdown from HTML**

Find the Best Sellers chart card (inside `#page-analytics`):

```html
      <div class="chart-card chart-card--full">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
          <h3 style="margin:0">Best Sellers</h3>
          <select id="best-sellers-filter" onchange="setAnalyticsProductFilter(this.value)" style="font-size:12px;padding:4px 8px;border:1px solid var(--warm-gray);border-radius:8px;color:var(--text);font-family:'DM Sans',sans-serif;cursor:pointer"></select>
        </div>
        <canvas id="chart-sizes"></canvas>
      </div>
```

Replace with:

```html
      <div class="chart-card chart-card--full">
        <h3>Best Sellers</h3>
        <canvas id="chart-sizes"></canvas>
      </div>
```

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: add analytics product toggle HTML/CSS skeleton, remove best-sellers dropdown"
```

---

### Task 2: Add JS state and update `loadAnalytics()`

**Files:**
- Modify: `index.html` (~line 2962 for state variable, ~line 3047 for `loadAnalytics`)

- [ ] **Step 1: Replace `bestSellersProductFilter` state variable**

Find (around line 2962):
```js
let bestSellersProductFilter = 'all';
```

Replace with:
```js
let analyticsProductFilter = 'all';
```

- [ ] **Step 2: Add `setAnalyticsProductFilter()` function**

Find the existing `setAnalyticsProductFilter(filter)` function (one argument, single-line body) and replace it entirely with:

```js
function setAnalyticsProductFilter(val, btn) {
  analyticsProductFilter = val;
  document.querySelectorAll('.analytics-product-toggle button').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderAnalyticsCharts();
}
```

- [ ] **Step 3: Update `loadAnalytics()` to populate product pills**

Find the full `loadAnalytics()` function (line 3047). Replace the body (keep the Supabase fetch and `renderAnalyticsCharts()` call, replace the `best-sellers-filter` block):

```js
async function loadAnalytics() {
  const [sRes, pRes] = await Promise.all([
    sb.from('sales').select('price,sale_date,size,qty,style'),
    sb.from('purchases').select('total,purchase_date')
  ]);
  analyticsSales = sRes.data || [];
  analyticsPurchases = pRes.data || [];

  // Populate global product filter pills from PRODUCT_TYPES
  const toggle = document.getElementById('analytics-product-toggle');
  if (toggle) {
    while (toggle.firstChild) toggle.removeChild(toggle.firstChild);
    const makeBtn = (val, label) => {
      const b = document.createElement('button');
      b.textContent = label;
      if (analyticsProductFilter === val) b.classList.add('active');
      b.onclick = () => setAnalyticsProductFilter(val, b);
      toggle.appendChild(b);
    };
    makeBtn('all', 'All Products');
    PRODUCT_TYPES.forEach(p => makeBtn(p, p));
  }

  renderAnalyticsCharts();
}
```

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: add analyticsProductFilter state and populate product toggle pills in loadAnalytics"
```

---

### Task 3: Apply product filter in `renderAnalyticsCharts()`

**Files:**
- Modify: `index.html` (`renderAnalyticsCharts()` function, lines ~3163–3441)

This is the core change. All references to `analyticsSalesFiltered` in the function body are replaced with `filteredSales` (a product-filtered subset). Material Spend and the Revenue vs. Spend cost bars switch to estimated cost when a product is active.

- [ ] **Step 1: Add `filteredSales` immediately after the year filter**

Find lines 3170–3172 (year filter at start of `renderAnalyticsCharts()`):

```js
const yrStr = analyticsYear ? String(analyticsYear) : null;
const analyticsSalesFiltered = yrStr ? analyticsSales.filter(s => s.sale_date && s.sale_date.startsWith(yrStr)) : analyticsSales;
const analyticsPurchasesFiltered = yrStr ? analyticsPurchases.filter(p => p.purchase_date && p.purchase_date.startsWith(yrStr)) : analyticsPurchases;
```

Insert one line immediately after those three lines:

```js
const filteredSales = analyticsProductFilter === 'all'
  ? analyticsSalesFiltered
  : analyticsSalesFiltered.filter(s => s.style === analyticsProductFilter);
```

- [ ] **Step 2: Update `pnlRev` and `pnlCost` to use `filteredSales`**

Find the KPI cost/revenue computation (around line 3182–3184):

```js
const pnlRev = analyticsSalesFiltered.filter(s => inBounds(s.sale_date)).reduce((sum,s) => sum+(s.price||0), 0);
const pnlCost = analyticsPurchasesFiltered.filter(p => inBounds(p.purchase_date)).reduce((sum,p) => sum+(p.total||0), 0);
```

Replace with:

```js
const pnlRev = filteredSales.filter(s => inBounds(s.sale_date)).reduce((sum,s) => sum+(s.price||0), 0);
const pnlCost = analyticsProductFilter !== 'all'
  ? filteredSales.filter(s => inBounds(s.sale_date)).reduce((sum,s) => sum + estimateOrderCost(s), 0)
  : analyticsPurchasesFiltered.filter(p => inBounds(p.purchase_date)).reduce((sum,p) => sum+(p.total||0), 0);
```

- [ ] **Step 3: Update `salesInRange` to use `filteredSales`**

Find (around line 3202):

```js
const salesInRange = analyticsSalesFiltered.filter(s => inBounds(s.sale_date));
```

Replace with:

```js
const salesInRange = filteredSales.filter(s => inBounds(s.sale_date));
```

- [ ] **Step 4: Update KPI revenue label to include product prefix**

Find the lines that set label text content (around line 3200–3203):

```js
document.getElementById('pnl-revenue-lbl').textContent = pnlLabels[0];
document.getElementById('pnl-cost-lbl').textContent = pnlLabels[1];
document.getElementById('pnl-profit-lbl').textContent = pnlLabels[2];
```

Replace with:

```js
const productPrefix = analyticsProductFilter !== 'all' ? `${analyticsProductFilter} \u2014 ` : '';
document.getElementById('pnl-revenue-lbl').textContent = productPrefix + pnlLabels[0];
document.getElementById('pnl-cost-lbl').textContent = pnlLabels[1];
document.getElementById('pnl-profit-lbl').textContent = pnlLabels[2];
```

- [ ] **Step 5: Update revenue bucket aggregation to use `filteredSales`**

Find the loop that fills `revenueByBucket` (around line 3215). Replace `analyticsSalesFiltered` with `filteredSales`:

```js
filteredSales.forEach(s => {
  if (!s.sale_date) return;
  const k = getBucketKey(s.sale_date);
  if (k) revenueByBucket[k] = (revenueByBucket[k]||0) + (s.price||0);
});
```

- [ ] **Step 6: Update cost bucket aggregation to use estimated cost when product is filtered**

Find the block that fills `costByBucket` from purchases (around line 3225):

```js
analyticsPurchasesFiltered.forEach(p => {
  if (!p.purchase_date) return;
  const k = getBucketKey(p.purchase_date);
  if (k) costByBucket[k] = (costByBucket[k]||0) + (p.total||0);
});
```

Replace with:

```js
if (analyticsProductFilter !== 'all') {
  filteredSales.forEach(s => {
    if (!s.sale_date) return;
    const k = getBucketKey(s.sale_date);
    if (k) costByBucket[k] = (costByBucket[k]||0) + estimateOrderCost(s);
  });
} else {
  analyticsPurchasesFiltered.forEach(p => {
    if (!p.purchase_date) return;
    const k = getBucketKey(p.purchase_date);
    if (k) costByBucket[k] = (costByBucket[k]||0) + (p.total||0);
  });
}
```

- [ ] **Step 7: Replace all remaining `analyticsSalesFiltered` references with `filteredSales`**

Search the rest of `renderAnalyticsCharts()` for any remaining `analyticsSalesFiltered` usage (cumulative chart, units by product, revenue by product, margin trend, margin by size). Replace each with `filteredSales`.

Also find the `bestSellersProductFilter` reference (line ~3287):

```js
if (bestSellersProductFilter !== 'all' && (s.style || 'Standard') !== bestSellersProductFilter) return;
```

Remove this line entirely — the Best Sellers chart now uses `filteredSales` which is already product-filtered.

- [ ] **Step 8: Commit**

```bash
git add index.html
git commit -m "feat: apply analyticsProductFilter to all charts and KPI cards in renderAnalyticsCharts"
```

---

### Task 4: Write E2E tests for the product filter

**Files:**
- Create: `tests/e2e/analytics.spec.ts`

- [ ] **Step 1: Check the helpers import path**

Run:
```bash
grep -rn "export.*signIn\|export.*TAG" tests/
```

Note the exact file path and export names. The import in the test file below uses `'../helpers'` — adjust if the actual path differs.

- [ ] **Step 2: Create the test file**

```typescript
import { test, expect } from '@playwright/test';
import { signIn, TAG } from '../helpers';

test.describe('Analytics product filter', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await signIn(page);
    await page.click('#bn-analytics, #sb-analytics');
    await expect(page.locator('#page-analytics')).toBeVisible({ timeout: 10000 });
    // Wait for product toggle to be populated (requires settings load + loadAnalytics)
    await expect(page.locator('#analytics-product-toggle button')).not.toHaveCount(0, { timeout: 10000 });
  });

  test('product toggle renders All Products plus each product type', async ({ page }) => {
    const toggle = page.locator('#analytics-product-toggle');
    await expect(toggle.locator('button:has-text("All Products")')).toBeVisible();
    const pills = toggle.locator('button');
    // All Products + at least one product = at least 2
    const count = await pills.count();
    expect(count).toBeGreaterThan(1);
  });

  test('All Products pill is active by default', async ({ page }) => {
    const allBtn = page.locator('#analytics-product-toggle button:has-text("All Products")');
    await expect(allBtn).toHaveClass(/active/);
  });

  test('clicking a product pill makes it active and deactivates All Products', async ({ page }) => {
    const toggle = page.locator('#analytics-product-toggle');
    const firstProduct = toggle.locator('button').nth(1);
    await firstProduct.click();

    await expect(firstProduct).toHaveClass(/active/);
    await expect(toggle.locator('button:has-text("All Products")')).not.toHaveClass(/active/);
  });

  test('KPI revenue label includes product name when product is selected', async ({ page }) => {
    const toggle = page.locator('#analytics-product-toggle');
    const firstProduct = toggle.locator('button').nth(1);
    const productName = (await firstProduct.textContent() || '').trim();
    await firstProduct.click();

    await expect(page.locator('#pnl-revenue-lbl')).toContainText(productName);
  });

  test('clicking All Products restores label without product prefix', async ({ page }) => {
    const toggle = page.locator('#analytics-product-toggle');
    await toggle.locator('button').nth(1).click();
    await toggle.locator('button:has-text("All Products")').click();

    await expect(page.locator('#pnl-revenue-lbl')).not.toContainText('\u2014');
  });

  test('best sellers chart dropdown is removed', async ({ page }) => {
    await expect(page.locator('#best-sellers-filter')).toHaveCount(0);
  });
});
```

- [ ] **Step 3: Run the new tests locally**

```bash
npx playwright test --project=e2e tests/e2e/analytics.spec.ts --workers=1
```

Expected: all 6 tests pass. If the `signIn` import path is wrong, fix it. If tests time out waiting for pills, verify `loadAnalytics()` is calling `renderAnalyticsCharts()` after populating the toggle.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/analytics.spec.ts
git commit -m "test: add e2e tests for analytics global product filter"
```

---

### Task 5: Push and update documentation

- [ ] **Step 1: Push to main**

```bash
git push origin main
```

- [ ] **Step 2: Watch CI**

```bash
gh run watch
```

Expected: E2E Tests workflow passes. Total passing tests increases by 6 (from 66 to 72).

- [ ] **Step 3: Update test counts in README.md and tests/README.md**

In `README.md`, find the line mentioning the e2e test count and update the number to 72.

In `tests/README.md`, update the count and add a row to the coverage table:

```markdown
| `analytics.spec.ts` | Product filter pills render, active state, KPI label update, dropdown removal |
```

- [ ] **Step 4: Final commit**

```bash
git add README.md tests/README.md
git commit -m "docs: update e2e test count to 72, add analytics.spec.ts to coverage table"
git push origin main
```
