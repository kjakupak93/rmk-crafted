# Margin Insights Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface per-order and per-size profit margin data in the "Mark Complete" modal, Sales History tab, and Analytics page.

**Architecture:** All changes are client-side in `index.html`. A shared `marginColor(pct)` helper enforces consistent color thresholds. Features 1 & 2 consume `estimateOrderCost()` where it already runs; Features 3 & 4 add two new Chart.js charts to `renderAnalyticsCharts()`. No schema changes.

**Tech Stack:** Vanilla JS, Chart.js v4 (CDN), Supabase (read-only for this feature), Playwright for smoke tests.

**Spec:** `docs/superpowers/specs/2026-03-19-margin-insights-design.md`

**Security note:** All values injected into the DOM (price, cost, margin %) are numbers derived from Supabase numeric columns or arithmetic. Cast with `Number()` or `Math.round()` before rendering to guarantee no string injection.

---

## File Map

| File | Changes |
|------|---------|
| `index.html` (~line 2283) | Add `chartMarginTrend`, `chartMarginBySize` to chart globals |
| `index.html` (~line 3338) | Add `marginColor(pct)` helper after `estimateOrderCost` |
| `index.html` (~line 3370) | Inject margin summary block in `completeOrder()` |
| `index.html` (~line 3650) | Add margin badge to price cell in `renderSalesTable()` |
| `index.html` (~line 2529) | Add Margin Trend chart logic to end of `renderAnalyticsCharts()` |
| `index.html` (~line 1938) | Add two new canvas cards to `#page-analytics .analytics-grid` |
| `tests/analytics.spec.ts` | Add canvas presence tests |
| `tests/orders.spec.ts` | Add margin badge presence test |

---

## Task 1: Add `marginColor` helper and chart globals

**Files:**
- Modify: `index.html:2283`
- Modify: `index.html:3338`

- [ ] **Step 1: Add chart globals**

Find line 2283:
```js
let chartRevenue = null, chartProfit = null, chartSizes = null;
```
Change to:
```js
let chartRevenue = null, chartProfit = null, chartSizes = null;
let chartMarginTrend = null, chartMarginBySize = null;
```

- [ ] **Step 2: Add `marginColor` helper after `estimateOrderCost`**

After the closing `}` of `estimateOrderCost` (~line 3338), insert:
```js
function marginColor(pct) {
  return pct >= 60 ? 'var(--green)' : pct >= 50 ? 'var(--orange)' : 'var(--red)';
}
```

- [ ] **Step 3: Commit**
```bash
git add index.html
git commit -m "feat: add marginColor helper and chart globals for margin insights"
```

---

## Task 2: Feature 1 — Margin summary in "Mark Complete" modal

**Files:**
- Modify: `index.html:3366-3375` (`completeOrder` function)

The `completePaymentModal` HTML (~lines 2200-2212) structure:
```
.modal-overlay#completePaymentModal
  .modal
    h2 "Collect Payment"
    p  "How was this order paid?"
    div (Cash/Venmo buttons)   <-- insert before this div
    div (Skip button)
```

- [ ] **Step 1: Update `completeOrder()` to inject margin block**

Find the unpaid branch in `completeOrder(id)` (~line 3369):
```js
if (data.payment==='unpaid') {
  _pendingCompleteOrderData = data;
  openModal('completePaymentModal');
}
```

Replace with:
```js
if (data.payment==='unpaid') {
  _pendingCompleteOrderData = data;
  // Compute margin (all values are numeric — safe for DOM insertion)
  const _cost = estimateOrderCost(data);
  const _profit = data.price - _cost;
  const _mp = data.price > 0 ? Math.round((_profit / data.price) * 100) : 0;
  const _isFallback = !(data.items?.rows?.length > 0) && !data.size?.match(/(\d+)[^\d]+(\d+)[^\d]+(\d+)/);
  const _mpStr = (_isFallback ? '~' : '') + _mp + '%';
  const _modal = document.querySelector('#completePaymentModal .modal');
  // Idempotent: reuse existing block if modal was opened before
  let _block = document.getElementById('complete-margin-summary');
  if (!_block) {
    _block = document.createElement('div');
    _block.id = 'complete-margin-summary';
    _modal.insertBefore(_block, _modal.querySelector('div'));
  }
  _block.style.cssText = 'border:1px solid var(--warm-gray);border-radius:8px;padding:12px;margin-bottom:16px;background:var(--sand-pale);text-align:left';
  // Use textContent for all user-derived values to prevent injection
  function _row(label, value, color) {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;justify-content:space-between;margin-bottom:4px';
    const lbl = document.createElement('span');
    lbl.style.cssText = 'color:var(--text-muted);font-size:13px';
    lbl.textContent = label;
    const val = document.createElement('span');
    val.style.cssText = "font-family:'DM Mono',monospace;font-size:13px" + (color ? ';font-weight:600;color:' + color : '');
    val.textContent = value;
    row.appendChild(lbl);
    row.appendChild(val);
    return row;
  }
  _block.textContent = '';
  _block.appendChild(_row('Revenue', '$' + Number(data.price)));
  _block.appendChild(_row('Est. Cost', '$' + Math.round(_cost)));
  _block.appendChild(_row('Margin', '$' + Math.round(_profit) + '  (' + _mpStr + ')', marginColor(_mp)));
  openModal('completePaymentModal');
}
```

- [ ] **Step 2: Verify manually**

Open the app locally, go to Orders, find an unpaid order, click Mark Complete. The modal should show Revenue / Est. Cost / Margin above the payment buttons, with margin % color-coded.

- [ ] **Step 3: Commit**
```bash
git add index.html
git commit -m "feat: show margin summary in mark-complete modal for unpaid orders"
```

---

## Task 3: Feature 2 — Margin badge in Sales History

**Files:**
- Modify: `index.html:3644-3657` (`renderSalesTable` price cell)
- Modify: `tests/orders.spec.ts`

- [ ] **Step 1: Write failing Playwright test**

Add to `tests/orders.spec.ts`:
```ts
test('sales history price cells show a margin badge', async ({ page }) => {
  const tabs = page.locator('#orders-tabs .tab-btn');
  await tabs.nth(2).click();
  // Wait for the sales data to populate the table
  await page.waitForSelector('#salesBody tr td', { timeout: 10000 });

  const rows = page.locator('#salesBody tr');
  // Require at least one row — this test needs real sales data in the DB
  await expect(rows).not.toHaveCount(0);
  // Price cell is the 6th column (index 5); should contain a % span
  const priceCell = rows.first().locator('td').nth(5);
  await expect(priceCell.locator('span')).toContainText('%');
});
```

- [ ] **Step 2: Run test to confirm it fails**
```bash
npx playwright test tests/orders.spec.ts --grep "margin badge" --reporter=line
```
Expected: FAIL (no `%` span in price cell yet)

- [ ] **Step 3: Update price cell in `renderSalesTable()`**

Find line ~3650 inside the `.map(s => ...)` template literal in `renderSalesTable()`:
```js
    <td style="font-family:'DM Mono',monospace;color:var(--green);font-weight:500">$${s.price}</td>
```

Replace with:
```js
    <td style="font-family:'DM Mono',monospace;color:var(--green);font-weight:500">${(()=>{const _c=estimateOrderCost({size:s.size,price:s.price});const _p=s.price>0?Math.round(((s.price-_c)/s.price)*100):0;const _f=!s.size?.match(/(\d+)[^\d]+(\d+)[^\d]+(\d+)/);return '$'+Number(s.price)+' <span style="color:'+marginColor(_p)+';font-size:0.8em;margin-left:4px">'+(_f?'~':'')+_p+'%</span>';})()}</td>
```

Note: string concatenation (not template literals) is used for the inner span to avoid nested backtick escaping. Values are `Number()` and `Math.round()` results — numeric, no injection risk.

- [ ] **Step 4: Run test to confirm it passes**
```bash
npx playwright test tests/orders.spec.ts --grep "margin badge" --reporter=line
```
Expected: PASS

- [ ] **Step 5: Run full orders test suite**
```bash
npx playwright test tests/orders.spec.ts --reporter=line
```
Expected: all PASS

- [ ] **Step 6: Commit**
```bash
git add index.html tests/orders.spec.ts
git commit -m "feat: add margin % badge to sales history price cells"
```

---

## Task 4: Feature 3 — Margin Trend line chart

**Files:**
- Modify: `index.html:1938-1940` (add canvas card after Best Sellers)
- Modify: `index.html:2529` (add chart logic at end of `renderAnalyticsCharts`)
- Modify: `tests/analytics.spec.ts`

- [ ] **Step 1: Write failing Playwright test**

Add to `tests/analytics.spec.ts`:
```ts
test('margin trend chart canvas is present', async ({ page }) => {
  await expect(page.locator('#chart-margin-trend')).toBeVisible();
});
```

- [ ] **Step 2: Run test to confirm it fails**
```bash
npx playwright test tests/analytics.spec.ts --grep "margin trend" --reporter=line
```
Expected: FAIL

- [ ] **Step 3: Add canvas HTML after Best Sellers card**

Find lines ~1936-1940:
```html
      <div class="chart-card chart-card--full">
        <h3>Best Sellers</h3>
        <canvas id="chart-sizes"></canvas>
      </div>
    </div>
```

Change to:
```html
      <div class="chart-card chart-card--full">
        <h3>Best Sellers</h3>
        <canvas id="chart-sizes"></canvas>
      </div>
      <div class="chart-card chart-card--full">
        <h3>Margin Trend</h3>
        <canvas id="chart-margin-trend"></canvas>
      </div>
    </div>
```

- [ ] **Step 4: Add chart logic at the end of `renderAnalyticsCharts()`**

Find the closing `}` of `renderAnalyticsCharts()` (~line 2529, just after `chartSizes` is created). Insert before that `}`:

```js
  // ── Margin Trend (average margin % per month, respects range toggle) ──
  const _mrgSum = {}, _mrgCnt = {};
  analyticsSales.forEach(s => {
    if (!s.sale_date || !s.price) return;
    const key = s.sale_date.slice(0, 7);
    const cost = estimateOrderCost({ size: s.size, price: s.price });
    _mrgSum[key] = (_mrgSum[key] || 0) + ((s.price - cost) / s.price * 100);
    _mrgCnt[key] = (_mrgCnt[key] || 0) + 1;
  });
  const marginTrendData = months.map(m => _mrgCnt[m] ? Math.round(_mrgSum[m] / _mrgCnt[m]) : null);

  if (chartMarginTrend) chartMarginTrend.destroy();
  chartMarginTrend = new Chart(document.getElementById('chart-margin-trend'), {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Avg Margin %',
        data: marginTrendData,
        borderColor: '#C9A55A',
        backgroundColor: 'transparent',
        tension: 0.3,
        pointRadius: 3,
        fill: false,
        spanGaps: false
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: { min: 0, max: 100, ticks: { callback: v => v + '%', color: tickColor }, grid: { color: gridColor } },
        x: { ticks: { color: tickColor }, grid: { color: gridColor } }
      }
    }
  });
```

- [ ] **Step 5: Run test to confirm it passes**
```bash
npx playwright test tests/analytics.spec.ts --grep "margin trend" --reporter=line
```
Expected: PASS

- [ ] **Step 6: Run full analytics test suite**
```bash
npx playwright test tests/analytics.spec.ts --reporter=line
```
Expected: all PASS

- [ ] **Step 7: Commit**
```bash
git add index.html tests/analytics.spec.ts
git commit -m "feat: add margin trend line chart to analytics"
```

---

## Task 5: Feature 4 — Margin by Size bar chart

**Files:**
- Modify: `index.html` (add canvas card after Margin Trend)
- Modify: `index.html` (add chart logic after Margin Trend block in `renderAnalyticsCharts`)
- Modify: `tests/analytics.spec.ts`

- [ ] **Step 1: Write failing Playwright test**

Add to `tests/analytics.spec.ts`:
```ts
test('margin by size chart canvas is present', async ({ page }) => {
  await expect(page.locator('#chart-margin-by-size')).toBeVisible();
});
```

- [ ] **Step 2: Run test to confirm it fails**
```bash
npx playwright test tests/analytics.spec.ts --grep "margin by size" --reporter=line
```
Expected: FAIL

- [ ] **Step 3: Add canvas HTML after Margin Trend card**

Find the Margin Trend card added in Task 4:
```html
      <div class="chart-card chart-card--full">
        <h3>Margin Trend</h3>
        <canvas id="chart-margin-trend"></canvas>
      </div>
    </div>
```

Change to:
```html
      <div class="chart-card chart-card--full">
        <h3>Margin Trend</h3>
        <canvas id="chart-margin-trend"></canvas>
      </div>
      <div class="chart-card chart-card--full">
        <h3>Margin by Size</h3>
        <canvas id="chart-margin-by-size"></canvas>
      </div>
    </div>
```

- [ ] **Step 4: Add chart logic after the Margin Trend block**

Immediately after the `chartMarginTrend = new Chart(...)` block added in Task 4 (still inside `renderAnalyticsCharts()`), insert:

```js
  // ── Margin by Size (all-time data, multi-planter rows excluded) ──
  const _szMrgSum = {}, _szMrgCnt = {}, _szProfSum = {};
  analyticsSales.forEach(s => {
    if (!s.size || s.size.includes('+') || !s.price) return;
    const cost = estimateOrderCost({ size: s.size, price: s.price });
    const mp = (s.price - cost) / s.price * 100;
    _szMrgSum[s.size] = (_szMrgSum[s.size] || 0) + mp;
    _szMrgCnt[s.size] = (_szMrgCnt[s.size] || 0) + 1;
    _szProfSum[s.size] = (_szProfSum[s.size] || 0) + (s.price - cost);
  });
  const _szEntries = Object.entries(_szMrgSum)
    .map(([size, sum]) => ({
      size,
      avgMargin: Math.round(sum / _szMrgCnt[size]),
      avgProfit: Math.round(_szProfSum[size] / _szMrgCnt[size]),
      count: _szMrgCnt[size]
    }))
    .sort((a, b) => b.avgMargin - a.avgMargin);

  const _szAvgMarginArr = _szEntries.map(e => e.avgMargin);
  const _szAvgProfitArr = _szEntries.map(e => e.avgProfit);
  const _szCountArr = _szEntries.map(e => e.count);
  // Solid hex colors with optional opacity suffix for low-sample bars
  const _szColors = _szEntries.map(e => {
    const base = e.avgMargin >= 60 ? '#3A7D5C' : e.avgMargin >= 50 ? '#D4782A' : '#C0392B';
    return e.count < 2 ? base + '80' : base + 'FF';
  });

  if (chartMarginBySize) chartMarginBySize.destroy();
  chartMarginBySize = new Chart(document.getElementById('chart-margin-by-size'), {
    type: 'bar',
    data: {
      labels: _szEntries.map(e => e.size),
      datasets: [{
        label: 'Avg Margin %',
        data: _szAvgMarginArr,
        backgroundColor: _szColors,
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => {
              const i = context.dataIndex;
              return 'Avg margin: ' + _szAvgMarginArr[i] + '% · Avg profit: $' + _szAvgProfitArr[i] + ' · ' + _szCountArr[i] + ' sale' + (_szCountArr[i] !== 1 ? 's' : '');
            }
          }
        }
      },
      scales: {
        y: { min: 0, max: 100, ticks: { callback: v => v + '%', color: tickColor }, grid: { color: gridColor }, beginAtZero: true },
        x: { ticks: { color: tickColor }, grid: { color: gridColor } }
      }
    }
  });
```

- [ ] **Step 5: Run test to confirm it passes**
```bash
npx playwright test tests/analytics.spec.ts --grep "margin by size" --reporter=line
```
Expected: PASS

- [ ] **Step 6: Run full test suite**
```bash
npx playwright test --reporter=line
```
Expected: all PASS

- [ ] **Step 7: Commit**
```bash
git add index.html tests/analytics.spec.ts
git commit -m "feat: add margin by size bar chart to analytics"
```

---

## Task 6: Deploy and verify

- [ ] **Step 1: Push to GitHub**
```bash
git push origin main
```

- [ ] **Step 2: Wait ~60s, then verify in browser (GitHub Pages)**

Checklist:
1. Orders → Sales History: price cells show `$110 63%` style badges, color-coded
2. Orders → Active: Mark Complete on unpaid order → Revenue/Est. Cost/Margin shown above payment buttons
3. Orders → pre-paid order completion → existing toast still shows, no modal change
4. Analytics → Margin Trend chart visible; updates on range toggle change
5. Analytics → Margin by Size chart visible; hover a bar to see tooltip with avg profit
6. Dark mode toggle — all new elements are readable
7. Mobile: no overflow on Sales History row price cells
