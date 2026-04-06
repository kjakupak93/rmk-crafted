# Add-on Analytics + Docs Update Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an "Add-ons" analytics section with two charts (popularity and revenue), and update README.md and CLAUDE.md to reflect recent changes.

**Architecture:** All changes are in `index.html` (query, chart vars, HTML section, render logic), `README.md`, and `CLAUDE.md`. The addon data comes from `sales.add_ons` (already a JSONB `[{id, label, price}]` array per row). Aggregation happens client-side in `renderAnalyticsCharts`, same as all other charts. Both new charts respect the existing year/range/product filters.

**Tech Stack:** Vanilla JS, Chart.js v4, Supabase, Playwright for e2e tests.

---

### Task 1: Update loadAnalytics query to fetch add_ons

**Files:**
- Modify: `index.html` — `loadAnalytics` function (~line 3051)

- [ ] **Step 1: Update the sales select to include add_ons**

Find this line in `loadAnalytics`:
```js
sb.from('sales').select('price,sale_date,size,qty,style'),
```
Change to:
```js
sb.from('sales').select('price,sale_date,size,qty,style,add_ons'),
```

- [ ] **Step 2: Verify in browser**

Navigate to Analytics page. Open DevTools → Network → find the `sales` Supabase request and confirm `add_ons` is now included in the response columns.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: fetch add_ons in analytics sales query"
```

---

### Task 2: Add chart variables for addon charts

**Files:**
- Modify: `index.html` — chart variable declarations (~line 2961)

- [ ] **Step 1: Add two new chart variables**

Find:
```js
let chartRevenueSpend = null, chartSizes = null;
let chartMarginTrend = null, chartMarginBySize = null;
let chartCumulative = null, chartUnitsByProduct = null, chartRevenueByProduct = null;
```
Change to:
```js
let chartRevenueSpend = null, chartSizes = null;
let chartMarginTrend = null, chartMarginBySize = null;
let chartCumulative = null, chartUnitsByProduct = null, chartRevenueByProduct = null;
let chartAddonPopularity = null, chartAddonRevenue = null;
```

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "feat: declare chartAddonPopularity and chartAddonRevenue variables"
```

---

### Task 3: Add Add-ons HTML section to the analytics page

**Files:**
- Modify: `index.html` — `#page-analytics` div (~line 1891)

- [ ] **Step 1: Add the Add-ons section after the closing Margins div**

Find this closing tag sequence in `#page-analytics`:
```html
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

  </div>
</div>
```

Replace with:
```html
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

    <!-- Add-ons -->
    <div class="analytics-section-header">Add-ons</div>
    <div class="analytics-grid">
      <div class="chart-card">
        <h3>Add-on Popularity</h3>
        <canvas id="chart-addon-popularity"></canvas>
      </div>
      <div class="chart-card">
        <h3>Add-on Revenue</h3>
        <canvas id="chart-addon-revenue"></canvas>
      </div>
    </div>

  </div>
</div>
```

- [ ] **Step 2: Verify section appears in browser**

Navigate to Analytics page and scroll to bottom. You should see an "Add-ons" section header and two empty chart card placeholders.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add Add-ons section HTML to analytics page"
```

---

### Task 4: Render addon charts in renderAnalyticsCharts

**Files:**
- Modify: `index.html` — `renderAnalyticsCharts` function, end of function (~after chartMarginBySize block)

- [ ] **Step 1: Add addon aggregation and chart rendering**

Find the end of `renderAnalyticsCharts` — specifically the last chart block which ends with `chartMarginBySize = new Chart(...)`. After that closing `});` and before the closing `}` of `renderAnalyticsCharts`, add:

```js
  // ── Add-on Popularity & Revenue ──
  const addonCount = {}, addonRev = {};
  filteredSales.forEach(s => {
    if (s.sale_date) {
      const k = isWeekly ? getBucketKey(s.sale_date) : s.sale_date.slice(0, 7);
      if (keys.length && !keys.includes(k)) return;
    }
    if (!Array.isArray(s.add_ons)) return;
    s.add_ons.forEach(a => {
      const lbl = a.label || a.id || 'Unknown';
      addonCount[lbl] = (addonCount[lbl] || 0) + 1;
      addonRev[lbl] = (addonRev[lbl] || 0) + (a.price || 0);
    });
  });

  const addonPopEntries = Object.entries(addonCount).sort((a, b) => b[1] - a[1]);
  const addonRevEntries = Object.entries(addonRev).sort((a, b) => b[1] - a[1]);

  if (chartAddonPopularity) chartAddonPopularity.destroy();
  chartAddonPopularity = new Chart(document.getElementById('chart-addon-popularity'), {
    type: 'bar',
    data: {
      labels: addonPopEntries.map(e => e[0]),
      datasets: [{ label: 'Times Used', data: addonPopEntries.map(e => e[1]), backgroundColor: '#4A86A8', borderRadius: 4 }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.x} order${ctx.parsed.x !== 1 ? 's' : ''}` } } },
      scales: {
        x: { ticks: { color: tickColor, precision: 0 }, grid: { color: gridColor } },
        y: { ticks: { color: tickColor }, grid: { color: gridColor } }
      }
    }
  });

  if (chartAddonRevenue) chartAddonRevenue.destroy();
  chartAddonRevenue = new Chart(document.getElementById('chart-addon-revenue'), {
    type: 'bar',
    data: {
      labels: addonRevEntries.map(e => e[0]),
      datasets: [{ label: 'Revenue', data: addonRevEntries.map(e => e[1]), backgroundColor: '#C9A55A', borderRadius: 4 }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` $${ctx.parsed.x.toFixed(0)}` } } },
      scales: {
        x: { ticks: { color: tickColor, callback: v => '$' + v }, grid: { color: gridColor } },
        y: { ticks: { color: tickColor }, grid: { color: gridColor } }
      }
    }
  });
```

- [ ] **Step 2: Verify charts render**

Navigate to Analytics. Scroll to the Add-ons section. If you have sales with add-ons, bars should appear. If there are no add-on sales in the current range, the charts will be empty (correct behavior — Chart.js renders empty axes).

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: render Add-on Popularity and Add-on Revenue charts in analytics"
```

---

### Task 5: Add e2e tests for addon charts

**Files:**
- Modify: `tests/e2e/analytics.spec.ts`

- [ ] **Step 1: Add tests for addon section visibility**

Append a new describe block at the end of `analytics.spec.ts`:

```ts
test.describe('Analytics add-on charts', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.locator('#sb-analytics, #bn-analytics').first().click();
    await expect(page.locator('#page-analytics')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#analytics-product-toggle button')).not.toHaveCount(0, { timeout: 10000 });
  });

  test('add-ons section header is present', async ({ page }) => {
    const headers = page.locator('.analytics-section-header');
    const texts = await headers.allTextContents();
    expect(texts).toContain('Add-ons');
  });

  test('add-on popularity canvas is present', async ({ page }) => {
    await expect(page.locator('#chart-addon-popularity')).toBeVisible();
  });

  test('add-on revenue canvas is present', async ({ page }) => {
    await expect(page.locator('#chart-addon-revenue')).toBeVisible();
  });
});
```

- [ ] **Step 2: Run the new tests**

```bash
npx playwright test tests/e2e/analytics.spec.ts --project=e2e
```

Expected: all tests in the file pass (8 existing + 3 new = 11 total).

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/analytics.spec.ts
git commit -m "test: add e2e tests for add-on analytics charts"
```

---

### Task 6: Update README.md

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update the Analytics section charts list**

Find in `README.md`:
```markdown
**Charts:**
- **Revenue by Month** — bar chart of total sales revenue per month
- **Profit Overview** — grouped bars (revenue + material cost) with a profit trend line overlay
- **Best Sellers** — horizontal bar chart of top 10 planter sizes ranked by **units sold**
```

Replace with:
```markdown
**Charts:**
- **Revenue vs. Spend** — grouped bars (revenue + material cost) with a profit trend line overlay
- **Cumulative Revenue** — running revenue total over the selected period
- **Units by Product / Revenue by Product** — breakdown of volume and revenue across product types
- **Best Sellers** — horizontal bar chart of top 10 planter sizes ranked by **units sold**
- **Margin Trend / Margin by Size** — estimated margin over time and per size
- **Add-on Popularity** — horizontal bar chart showing how many times each add-on appeared in sales
- **Add-on Revenue** — horizontal bar chart of total revenue generated per add-on
```

- [ ] **Step 2: Update the Cut List "Saved Cut Lists" description**

Find in `README.md`:
```markdown
**Saved Cut Lists** (left column on desktop) — grouped by product, showing Name, Last Modified, Notes. Load or delete any saved list. Re-saving a loaded list updates it in-place (no duplicates).
```

Replace with:
```markdown
**Saved Cut Lists** (left column on desktop) — grouped by product, showing Name, Last Modified, Notes. Load, duplicate, or delete any saved list. **Copy** loads all values into the editor as a new unsaved cut list with " (copy)" appended to the name — rename it and save to create a new record without overwriting the original. Re-saving a loaded list updates it in-place (no duplicates).
```

- [ ] **Step 3: Update the Common Tasks table**

Find in the Common Tasks table:
```markdown
| Load a saved cut list | Materials → Cut List tab → Saved Cut Lists (top right on desktop) → Load |
```

Replace with:
```markdown
| Load a saved cut list | Materials → Cut List tab → Saved Cut Lists (top right on desktop) → Load |
| Duplicate a saved cut list | Materials → Cut List tab → Saved Cut Lists → Copy → rename → Save |
```

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: update README analytics section and cut list duplicate entry"
```

---

### Task 7: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add _settingsReady pattern note**

In the `### Non-Obvious Details` section of `CLAUDE.md`, add after the existing `window._setProductOptions` entry:

```
- `loadOrders()` awaits `window._settingsReady` before rendering — ensures `ADDONS` is loaded from Supabase before `orderCardHTML` tries to resolve addon labels. Same pattern used in `addNewAddon`, `deleteAddon`, `addProduct`.
```

- [ ] **Step 2: Add duplicateCutList note**

In the same Non-Obvious Details section, find the `saveCutList()` entry and add after it:

```
- `duplicateCutList(id)` — calls `loadCutList(id)`, appends " (copy)" to the name field, then deletes `nameEl.dataset.savedId`. Result: all fields pre-populated, but Save will INSERT a new record instead of updating the original.
```

- [ ] **Step 3: Update analytics section in CLAUDE.md**

Find in the Pages table:
```
- **Analytics** (`page-analytics`) — P&L cards + revenue/profit/best-seller charts
```

Replace with:
```
- **Analytics** (`page-analytics`) — P&L cards + revenue/profit/best-seller charts + add-on popularity/revenue charts
```

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md with _settingsReady pattern and duplicateCutList"
```

---

### Task 8: Update test counts in README and tests/README.md

**Files:**
- Modify: `README.md`, `tests/README.md`

- [ ] **Step 1: Update e2e test count in README.md**

Find:
```markdown
| E2E | `npx playwright test --project=e2e` | 72 | Full workflows with real Supabase reads/writes |
```

Replace with:
```markdown
| E2E | `npx playwright test --project=e2e` | 75 | Full workflows with real Supabase reads/writes |
```

- [ ] **Step 2: Update tests/README.md analytics row**

In `tests/README.md`, find the analytics row in the E2E coverage table:
```markdown
| `analytics.spec.ts` | Product filter pills render, active state, KPI label update, best-sellers dropdown removal |
```

Replace with:
```markdown
| `analytics.spec.ts` | Product filter pills render, active state, KPI label update, best-sellers dropdown removal, add-on section present, addon chart canvases visible |
```

- [ ] **Step 3: Commit**

```bash
git add README.md tests/README.md
git commit -m "docs: update e2e test count to 75 and analytics coverage description"
```

---

### Task 9: Push to GitHub

- [ ] **Step 1: Push all commits**

```bash
git push origin main
```

Expected: all commits pushed, GitHub Pages deploys in ~60s.
