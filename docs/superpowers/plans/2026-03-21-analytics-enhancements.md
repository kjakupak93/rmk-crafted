# Analytics Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 7 date range filter buttons (including This Month / Last Month / Last 3M / Last 6M), make P&L summary cards respect the selected range, and merge the two separate revenue/profit charts into one "Revenue vs. Spend" chart with weekly bucketing for single-month views.

**Architecture:** All changes are in `index.html`. Four self-contained edits: (1) HTML structure, (2) module-level variable cleanup, (3) new bucketing helpers, (4) updated `renderAnalyticsCharts()` that replaces the old two-chart render with one combined chart and moves P&L card updates here.

**Tech Stack:** Vanilla JS, Chart.js v4, HTML

---

## File Structure

| Location | Change |
|---|---|
| `index.html:2115–2119` | Add 4 new range-toggle buttons; existing 3 stay |
| `index.html:2100–2113` | Add `id` to three P&L `.lbl` elements |
| `index.html:2121–2141` | Replace two chart cards with one merged full-width card |
| `index.html:2516` | Replace `chartRevenue`, `chartProfit` vars with `chartRevenueSpend` |
| `index.html:2638–2661` | Replace `getAnalyticsMonths()` with `getAnalyticsBuckets()` + add `getAnalyticsDateBounds()` |
| `index.html:2617–2628` | Remove P&L update from `loadAnalytics()` |
| `index.html:2663–2730` | Rewrite `renderAnalyticsCharts()` top section (buckets, P&L, merged chart) |

---

## Task 1: HTML — buttons, label IDs, merged chart card

**Files:**
- Modify: `index.html:2100–2141`

**Context:** The analytics page HTML has three sections to update: the P&L label divs, the range-toggle button list, and the charts grid. All changes are purely structural — no JS yet.

- [ ] **Step 1: Add IDs to the three P&L label `.lbl` elements**

Find the three `.lbl` divs inside `#page-analytics .analytics-pnl` (around lines 2103, 2107, 2111). They currently read:
```html
<div class="lbl">This Month Revenue</div>
<div class="lbl">Material Spend</div>
<div class="lbl">Est. Net Profit</div>
```

Add IDs:
```html
<div class="lbl" id="pnl-revenue-lbl">This Month Revenue</div>
<div class="lbl" id="pnl-cost-lbl">Material Spend</div>
<div class="lbl" id="pnl-profit-lbl">Est. Net Profit</div>
```

- [ ] **Step 2: Add 4 new range-toggle buttons before "This Year"**

Find the range-toggle div (lines 2115–2119). Currently:
```html
<div class="analytics-range-toggle">
  <button id="range-btn-year" class="active" onclick="setAnalyticsRange('year',this)">This Year</button>
  <button id="range-btn-12m" onclick="setAnalyticsRange('12m',this)">Last 12M</button>
  <button id="range-btn-all" onclick="setAnalyticsRange('all',this)">All Time</button>
</div>
```

Replace with:
```html
<div class="analytics-range-toggle">
  <button id="range-btn-month" onclick="setAnalyticsRange('month',this)">This Month</button>
  <button id="range-btn-lastmonth" onclick="setAnalyticsRange('lastmonth',this)">Last Month</button>
  <button id="range-btn-3m" onclick="setAnalyticsRange('3m',this)">Last 3M</button>
  <button id="range-btn-6m" onclick="setAnalyticsRange('6m',this)">Last 6M</button>
  <button id="range-btn-year" class="active" onclick="setAnalyticsRange('year',this)">This Year</button>
  <button id="range-btn-12m" onclick="setAnalyticsRange('12m',this)">Last 12M</button>
  <button id="range-btn-all" onclick="setAnalyticsRange('all',this)">All Time</button>
</div>
```

- [ ] **Step 3: Replace the two chart cards with one merged full-width card**

Find `<div class="analytics-grid">` (line 2121). It currently starts with:
```html
<div class="analytics-grid">
  <div class="chart-card">
    <h3>Revenue by Month</h3>
    <canvas id="chart-revenue"></canvas>
  </div>
  <div class="chart-card">
    <h3>Profit Overview</h3>
    <canvas id="chart-profit"></canvas>
  </div>
```

Replace those two cards with one:
```html
<div class="analytics-grid">
  <div class="chart-card chart-card--full">
    <h3>Revenue vs. Spend</h3>
    <canvas id="chart-revenue-spend"></canvas>
  </div>
```

The remaining cards (Best Sellers, Margin Trend, Margin by Size) are untouched.

- [ ] **Step 4: Verify the HTML renders without JS errors**

Open the app, navigate to Analytics. You should see 7 filter buttons, and the charts grid should show "Revenue vs. Spend" (canvas will be blank — JS not updated yet), Best Sellers, Margin Trend, Margin by Size. No JS console errors.

- [ ] **Step 5: Commit**

```bash
git add index.html && git commit -m "feat: analytics HTML — 7 range buttons, P&L label IDs, merged chart card"
```

---

## Task 2: Update module-level chart variables

**Files:**
- Modify: `index.html:2516`

**Context:** The JS section has `let chartRevenue = null, chartProfit = null, chartSizes = null;` at line 2516. Replace the two with one.

- [ ] **Step 1: Replace `chartRevenue` and `chartProfit` with `chartRevenueSpend`**

Find line 2516:
```js
let chartRevenue = null, chartProfit = null, chartSizes = null;
```

Replace with:
```js
let chartRevenueSpend = null, chartSizes = null;
```

- [ ] **Step 2: Verify no parse errors**

Open the app. The page should still load (old render code referencing `chartRevenue`/`chartProfit` will throw at runtime when analytics is visited — that's expected and will be fixed in Task 4).

- [ ] **Step 3: Commit**

```bash
git add index.html && git commit -m "refactor: replace chartRevenue/chartProfit vars with chartRevenueSpend"
```

---

## Task 3: Add `getAnalyticsBuckets()` and `getAnalyticsDateBounds()`

**Files:**
- Modify: `index.html:2638–2661` (replace `getAnalyticsMonths`)

**Context:** `getAnalyticsMonths()` returns a `string[]` of `"YYYY-MM"` keys. Replace it with two new functions:
- `getAnalyticsBuckets()` — returns `{key, label}[]` for the current range
- `getAnalyticsDateBounds()` — returns `{start, end}` date strings for P&L filtering

- [ ] **Step 1: Replace `getAnalyticsMonths()` with two new functions**

Find and replace the entire `getAnalyticsMonths` function (lines 2638–2661) with:

```js
function getAnalyticsBuckets() {
  const now = new Date();
  function mKey(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; }
  function mLabel(d) { return d.toLocaleDateString('en-US', {month:'short', year:'2-digit'}); }

  if (analyticsRange === 'month' || analyticsRange === 'lastmonth') {
    const base = analyticsRange === 'month'
      ? new Date(now.getFullYear(), now.getMonth(), 1)
      : new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDay = new Date(base.getFullYear(), base.getMonth() + 1, 0);
    const buckets = [];
    let cur = new Date(base);
    while (cur <= lastDay) {
      const key = `${cur.getFullYear()}-${String(cur.getMonth()+1).padStart(2,'0')}-${String(cur.getDate()).padStart(2,'0')}`;
      const label = cur.toLocaleDateString('en-US', {month:'short', day:'numeric'});
      buckets.push({ key, label });
      cur = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 7);
    }
    return buckets;
  }
  if (analyticsRange === 'year') {
    const r = [];
    for (let m = 0; m <= now.getMonth(); m++) { const d = new Date(now.getFullYear(), m, 1); r.push({key:mKey(d),label:mLabel(d)}); }
    return r;
  }
  const steps = analyticsRange === '3m' ? 2 : analyticsRange === '6m' ? 5 : 11;
  if (analyticsRange === '3m' || analyticsRange === '6m' || analyticsRange === '12m') {
    const r = [];
    for (let i = steps; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); r.push({key:mKey(d),label:mLabel(d)}); }
    return r;
  }
  // 'all'
  const keys = new Set();
  [...analyticsSales, ...analyticsPurchases].forEach(r => { const d = r.sale_date || r.purchase_date; if (d) keys.add(d.slice(0,7)); });
  return [...keys].sort().map(k => { const [y,mo] = k.split('-'); return {key:k, label:new Date(+y,+mo-1,1).toLocaleDateString('en-US',{month:'short',year:'2-digit'})}; });
}

function getAnalyticsDateBounds() {
  const now = new Date();
  const pad = n => String(n).padStart(2,'0');
  const fmt = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const today = fmt(now);
  if (analyticsRange === 'month') {
    return { start: `${now.getFullYear()}-${pad(now.getMonth()+1)}-01`, end: today };
  }
  if (analyticsRange === 'lastmonth') {
    const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const last = new Date(now.getFullYear(), now.getMonth(), 0);
    return { start: fmt(first), end: fmt(last) };
  }
  if (analyticsRange === '3m') {
    return { start: fmt(new Date(now.getFullYear(), now.getMonth() - 2, 1)), end: today };
  }
  if (analyticsRange === '6m') {
    return { start: fmt(new Date(now.getFullYear(), now.getMonth() - 5, 1)), end: today };
  }
  if (analyticsRange === 'year') {
    return { start: `${now.getFullYear()}-01-01`, end: today };
  }
  if (analyticsRange === '12m') {
    return { start: fmt(new Date(now.getFullYear(), now.getMonth() - 11, 1)), end: today };
  }
  return { start: null, end: null }; // 'all'
}
```

- [ ] **Step 2: Verify no parse errors**

Open the app DevTools console, navigate to Analytics. You'll see a render error (expected — old render code still uses `chartRevenue`). Confirm `getAnalyticsBuckets` and `getAnalyticsDateBounds` are defined by running them in the console:
```js
getAnalyticsBuckets()       // should return array of {key, label} objects
getAnalyticsDateBounds()    // should return {start, end} strings
```

- [ ] **Step 3: Commit**

```bash
git add index.html && git commit -m "feat: add getAnalyticsBuckets() and getAnalyticsDateBounds() for range-aware analytics"
```

---

## Task 4: Update `loadAnalytics()` and `renderAnalyticsCharts()`

**Files:**
- Modify: `index.html:2617–2730`

**Context:** This is the core wiring task. Two things to do:
1. Remove the P&L block from `loadAnalytics()` — it will move to `renderAnalyticsCharts()`
2. Rewrite the top of `renderAnalyticsCharts()` to: update P&L cards, use `getAnalyticsBuckets()`, build the merged chart, and update remaining charts to use bucket keys

---

**Step A: Remove P&L block from `loadAnalytics()`**

- [ ] **Step 1: Strip the P&L update out of `loadAnalytics()`**

Find `loadAnalytics()` (around line 2610). The current body is:
```js
async function loadAnalytics() {
  const [sRes, pRes] = await Promise.all([
    sb.from('sales').select('price,sale_date,size,qty'),
    sb.from('purchases').select('total,purchase_date')
  ]);
  analyticsSales = sRes.data || [];
  analyticsPurchases = pRes.data || [];
  // ── P&L summary cards (current calendar month) ──
  const _now = new Date();
  const _curKey = `${_now.getFullYear()}-${String(_now.getMonth()+1).padStart(2,'0')}`;
  const _pnlRev = analyticsSales.filter(s => s.sale_date?.slice(0,7) === _curKey).reduce((sum,s) => sum+(s.price||0), 0);
  const _pnlCost = analyticsPurchases.filter(p => p.purchase_date?.slice(0,7) === _curKey).reduce((sum,p) => sum+(p.total||0), 0);
  const _pnlNet = _pnlRev - _pnlCost;
  document.getElementById('pnl-revenue').textContent = '$'+Math.round(_pnlRev);
  document.getElementById('pnl-cost').textContent = '$'+Math.round(_pnlCost);
  const _pnlEl = document.getElementById('pnl-profit');
  _pnlEl.textContent = (_pnlNet >= 0 ? '$' : '-$') + Math.abs(Math.round(_pnlNet));
  _pnlEl.style.color = _pnlNet >= 0 ? 'var(--green)' : 'var(--red)';
  renderAnalyticsCharts();
}
```

Replace with (remove the P&L block, keep the data fetch and `renderAnalyticsCharts()` call):
```js
async function loadAnalytics() {
  const [sRes, pRes] = await Promise.all([
    sb.from('sales').select('price,sale_date,size,qty'),
    sb.from('purchases').select('total,purchase_date')
  ]);
  analyticsSales = sRes.data || [];
  analyticsPurchases = pRes.data || [];
  renderAnalyticsCharts();
}
```

---

**Step B: Rewrite `renderAnalyticsCharts()`**

- [ ] **Step 2: Replace the top section of `renderAnalyticsCharts()` (buckets, P&L, merged chart)**

Find the `renderAnalyticsCharts()` function (around line 2663). Replace it entirely with the following. The existing Best Sellers, Margin Trend, and Margin by Size chart code is preserved — only their `months`/`labels` references are updated to use `keys`/`bucketLabels` from the new buckets.

```js
function renderAnalyticsCharts() {
  const dark = document.documentElement.dataset.theme === 'dark';
  const tickColor = dark ? '#6B8A99' : '#666';
  const gridColor = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const legendColor = dark ? '#6B8A99' : '#666';

  const buckets = getAnalyticsBuckets();
  const keys = buckets.map(b => b.key);
  const bucketLabels = buckets.map(b => b.label);
  const isWeekly = analyticsRange === 'month' || analyticsRange === 'lastmonth';

  // ── P&L summary cards ──
  const bounds = getAnalyticsDateBounds();
  const inBounds = date => !date ? false : (!bounds.start || date >= bounds.start) && (!bounds.end || date <= bounds.end);
  const pnlRev = analyticsSales.filter(s => inBounds(s.sale_date)).reduce((sum,s) => sum+(s.price||0), 0);
  const pnlCost = analyticsPurchases.filter(p => inBounds(p.purchase_date)).reduce((sum,p) => sum+(p.total||0), 0);
  const pnlNet = pnlRev - pnlCost;
  document.getElementById('pnl-revenue').textContent = '$'+Math.round(pnlRev);
  document.getElementById('pnl-cost').textContent = '$'+Math.round(pnlCost);
  const pnlEl = document.getElementById('pnl-profit');
  pnlEl.textContent = (pnlNet >= 0 ? '$' : '-$') + Math.abs(Math.round(pnlNet));
  pnlEl.style.color = pnlNet >= 0 ? 'var(--green)' : 'var(--red)';
  const pnlLabels = {
    month: ['This Month Revenue','Material Spend','Est. Net Profit'],
    lastmonth: ['Last Month Revenue','Material Spend','Est. Net Profit'],
    '3m': ['3-Month Revenue','Material Spend','Est. Net Profit'],
    '6m': ['6-Month Revenue','Material Spend','Est. Net Profit'],
    year: ['This Year Revenue','Material Spend','Est. Net Profit'],
    '12m': ['12-Month Revenue','Material Spend','Est. Net Profit'],
    all: ['All-Time Revenue','Material Spend','Est. Net Profit'],
  }[analyticsRange] || ['Revenue','Material Spend','Est. Net Profit'];
  document.getElementById('pnl-revenue-lbl').textContent = pnlLabels[0];
  document.getElementById('pnl-cost-lbl').textContent = pnlLabels[1];
  document.getElementById('pnl-profit-lbl').textContent = pnlLabels[2];

  // ── Bucket aggregation helper ──
  function getBucketKey(dateStr) {
    if (!dateStr) return null;
    if (!isWeekly) return dateStr.slice(0, 7);
    for (let i = 0; i < buckets.length; i++) {
      const next = i + 1 < buckets.length ? buckets[i+1].key : '9999-99-99';
      if (dateStr >= buckets[i].key && dateStr < next) return buckets[i].key;
    }
    return null;
  }

  const revByBucket = {}, costByBucket = {};
  analyticsSales.forEach(s => {
    if (!s.sale_date) return;
    const k = getBucketKey(s.sale_date);
    if (k) revByBucket[k] = (revByBucket[k]||0) + (s.price||0);
  });
  analyticsPurchases.forEach(p => {
    if (!p.purchase_date) return;
    const k = getBucketKey(p.purchase_date);
    if (k) costByBucket[k] = (costByBucket[k]||0) + (p.total||0);
  });

  const revenueData = keys.map(k => revByBucket[k]||0);
  const costData = keys.map(k => costByBucket[k]||0);
  const profitData = keys.map((_,i) => revenueData[i] - costData[i]);

  // ── Revenue vs. Spend (merged chart) ──
  if (chartRevenueSpend) chartRevenueSpend.destroy();
  chartRevenueSpend = new Chart(document.getElementById('chart-revenue-spend'), {
    type: 'bar',
    data: {
      labels: bucketLabels,
      datasets: [
        { label: 'Revenue', data: revenueData, backgroundColor: '#3A7D5C', borderRadius: 4 },
        { label: 'Material Cost', data: costData, backgroundColor: '#D4782A', borderRadius: 4 },
        { label: 'Profit', data: profitData, type: 'line', borderColor: dark ? '#7BADC8' : '#1E4D6B', backgroundColor: 'transparent', tension: 0.3, pointRadius: 3 }
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom', labels: { font: { size: 11 }, color: legendColor } } },
      scales: { y: { ticks: { callback: v => '$'+v, color: tickColor }, grid: { color: gridColor }, beginAtZero: true },
                x: { ticks: { color: tickColor }, grid: { color: gridColor } } }
    }
  });

  // ── Best Sellers (filter by range) ──
  const sizeCnt = {};
  analyticsSales.forEach(s => {
    if (!s.size) return;
    if (s.sale_date) {
      const k = isWeekly ? getBucketKey(s.sale_date) : s.sale_date.slice(0,7);
      if (keys.length && !keys.includes(k)) return;
    }
    sizeCnt[s.size] = (sizeCnt[s.size]||0) + 1;
  });
  const sorted = Object.entries(sizeCnt).sort((a,b) => b[1]-a[1]).slice(0,10);

  if (chartSizes) chartSizes.destroy();
  chartSizes = new Chart(document.getElementById('chart-sizes'), {
    type: 'bar',
    data: {
      labels: sorted.map(([size]) => size),
      datasets: [{ label:'Units Sold', data: sorted.map(([,cnt]) => cnt), backgroundColor:'#C9A55A', borderRadius:4 }]
    },
    options: {
      indexAxis: 'y', responsive: true,
      plugins: { legend: { display: false } },
      scales: { x: { ticks: { stepSize:1, color:tickColor }, grid:{color:gridColor}, beginAtZero:true },
                y: { ticks:{color:tickColor}, grid:{color:gridColor} } }
    }
  });

  // ── Margin Trend ──
  const _mrgSum = {}, _mrgCnt = {};
  analyticsSales.forEach(s => {
    if (!s.sale_date || !s.price) return;
    const k = isWeekly ? getBucketKey(s.sale_date) : s.sale_date.slice(0,7);
    if (!k || !keys.includes(k)) return;
    const cost = estimateOrderCost({ size: s.size, price: s.price });
    _mrgSum[k] = (_mrgSum[k]||0) + ((s.price - cost) / s.price * 100);
    _mrgCnt[k] = (_mrgCnt[k]||0) + 1;
  });
  const marginTrendData = keys.map(k => _mrgCnt[k] ? Math.round(_mrgSum[k] / _mrgCnt[k]) : null);

  if (chartMarginTrend) chartMarginTrend.destroy();
  chartMarginTrend = new Chart(document.getElementById('chart-margin-trend'), {
    type: 'line',
    data: {
      labels: bucketLabels,
      datasets: [{ label:'Avg Margin %', data:marginTrendData, borderColor:'#C9A55A', backgroundColor:'transparent', tension:0.3, pointRadius:3, fill:false, spanGaps:false }]
    },
    options: {
      responsive: true, plugins: { legend: { display: false } },
      scales: { y: { min:0, max:100, ticks:{callback:v=>v+'%',color:tickColor}, grid:{color:gridColor} },
                x: { ticks:{color:tickColor}, grid:{color:gridColor} } }
    }
  });

  // ── Margin by Size (all-time, unchanged) ──
  const _szMrgSum = {}, _szMrgCnt = {}, _szProfSum = {};
  analyticsSales.forEach(s => {
    if (!s.size || s.size.includes('+') || !s.price) return;
    const cost = estimateOrderCost({ size: s.size, price: s.price });
    const mp = (s.price - cost) / s.price * 100;
    _szMrgSum[s.size] = (_szMrgSum[s.size]||0) + mp;
    _szMrgCnt[s.size] = (_szMrgCnt[s.size]||0) + 1;
    _szProfSum[s.size] = (_szProfSum[s.size]||0) + (s.price - cost);
  });
```

**Important edit boundary:** Use the Edit tool with `old_string` starting at `function renderAnalyticsCharts() {` and ending at exactly:
```js
    _szProfSum[s.size] = (_szProfSum[s.size]||0) + (s.price - cost);
  });
```
(This is line ~2810 in the current file — the closing `});` of the `_szProfSum` forEach.)

The `new_string` is the full block above, ending at that same `_szProfSum` forEach close. **Do NOT include** the `_szEntries` block, the `chartMarginBySize` Chart.js call, or the final `}` that closes `renderAnalyticsCharts` — those lines (~2811–2860) are preserved exactly as-is and must not appear in either `old_string` or `new_string`.

- [ ] **Step 3: Verify in browser**

Navigate to Analytics. The page should:
- Show 7 filter buttons, with "This Year" active
- Show "Revenue vs. Spend" chart with Revenue (green) + Material Cost (orange) + Profit (navy line)
- P&L cards show correct "This Year Revenue" label and correct totals
- Click "This Month" → P&L cards update to "This Month Revenue", chart shows weekly buckets
- Click "Last Month" → shows previous month's weekly data
- Click "Last 3M" / "Last 6M" → shows rolling monthly bars
- Best Sellers and Margin Trend still work

- [ ] **Step 4: Commit**

```bash
git add index.html && git commit -m "feat: analytics — range-aware P&L cards, merged Revenue vs Spend chart, weekly buckets"
```

---

## Task 5: Smoke test and push

- [ ] **Step 1: Run tests**

```bash
npm test
```
Expected: all tests pass (analytics changes don't affect existing test scenarios).

- [ ] **Step 2: Manually verify each range**

Click through all 7 filters and confirm:
- "This Month" and "Last Month" → x-axis shows weekly date labels (e.g. "Mar 3", "Mar 10", ...)
- "Last 3M" → 3 monthly bars
- "Last 6M" → 6 monthly bars
- "This Year" → months Jan through current month
- "Last 12M" → 12 monthly bars
- "All Time" → all months with data
- P&L card labels update for each filter
- Dark mode still looks correct (if applicable)

- [ ] **Step 3: Push**

```bash
git push origin main
```

Expected: GitHub Pages deploys in ~60 seconds.
