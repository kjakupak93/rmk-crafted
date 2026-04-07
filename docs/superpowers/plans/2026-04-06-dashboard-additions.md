# Dashboard Additions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Quick Actions bar, a Today's Focus card, and a Best Seller card to the home page dashboard.

**Architecture:** All changes are in the single `index.html` file. CSS is inserted before the mobile media query (so mobile overrides apply correctly). HTML is added inside `#page-home`. JS populates the two new cards inside/alongside `loadHomeStats()`.

**Tech Stack:** Vanilla HTML/CSS/JS, Supabase JS client (`sb`), Playwright for smoke tests.

---

## File Map

- **Modify:** `index.html`
  - CSS block: add `.quick-actions`, `.qa-btn`, `.focus-card`, `.focus-item`, `.bs-*` classes before the `/* ── Trend badges` comment (~line 1017)
  - Mobile CSS block: add mobile overrides inside `@media (max-width: 640px)`
  - HTML: add Quick Actions bar inside `#page-home` before `.home-top`
  - HTML: add new `.home-bottom` row with `#focus-card` and `#bs-card` after existing `.home-bottom`
  - JS: expand the orders `select` in `loadHomeStats()` to include `customer_name, pickup_time`
  - JS: add Focus card population code inside `loadHomeStats()`
  - JS: add `loadBestSeller()` function after `loadHomeStats()`
  - JS: call `loadBestSeller()` wherever `loadHomeStats()` is called
- **Modify:** `tests/home.spec.ts` — add smoke tests for the 3 new elements

---

## Task 1: CSS — new component styles

**Files:**
- Modify: `index.html` (CSS section, before `/* ── Trend badges on KPI cards ── */`)

- [ ] **Step 1: Add base CSS for all three new components**

Find the comment `/* ── Trend badges on KPI cards ── */` in `index.html` (it's the first line of the analytics/trend styles section, before the mobile media query). Insert the following block immediately before it:

```css
/* ── Quick Actions bar ── */
.quick-actions { display: flex; gap: 8px; margin-bottom: 16px; }
.qa-btn { flex: 1; padding: 10px 8px; border-radius: 8px; font-size: 12px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 6px; white-space: nowrap; border: none; cursor: pointer; font-family: 'DM Sans', sans-serif; }
.qa-btn-primary { background: var(--ocean); color: #fff; }
.qa-btn-secondary { background: var(--bg-card); color: var(--text-muted); border: 1px solid var(--border); }
.qa-btn-secondary:hover { background: var(--bg-elevated); }

/* ── Today's Focus card ── */
.focus-card { background: var(--bg-card); border: 1.5px solid var(--ocean); border-radius: 12px; padding: 14px 16px; }
.focus-items { display: flex; flex-direction: column; gap: 6px; }
.focus-item { display: flex; align-items: center; gap: 10px; background: var(--bg-elevated); border-radius: 8px; padding: 8px 10px; }
.focus-ico { font-size: 14px; flex-shrink: 0; }
.focus-body { flex: 1; min-width: 0; }
.focus-title { font-size: 12px; font-weight: 600; color: var(--text); }
.focus-sub { font-size: 10px; color: var(--text-dim); }
.focus-badge { font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 10px; flex-shrink: 0; }
.focus-badge-red    { background: rgba(192,57,43,0.18); color: #e05a4a; }
.focus-badge-orange { background: rgba(212,120,42,0.18); color: var(--orange); }
.focus-badge-green  { background: rgba(58,125,92,0.18); color: #5ab38a; }
.focus-clear { font-size: 12px; color: var(--text-dim); text-align: center; padding: 12px 0; }

/* ── Best Seller card ── */
.bs-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 10px; }
.bs-size { font-size: 22px; font-weight: 700; font-family: 'Playfair Display', serif; color: var(--text); line-height: 1.1; }
.bs-product { font-size: 11px; color: var(--text-dim); margin-top: 3px; }
.bs-crown { font-size: 22px; opacity: 0.55; }
.bs-divider { border: none; border-top: 1px solid var(--border-dim); margin: 10px 0; }
.bs-stats { display: flex; }
.bs-stat { flex: 1; text-align: center; }
.bs-stat + .bs-stat { border-left: 1px solid var(--border-dim); }
.bs-stat-val { font-size: 16px; font-weight: 700; color: var(--sand); font-family: 'Playfair Display', serif; }
.bs-stat-lbl { font-size: 9px; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.5px; }
.bs-empty { font-size: 12px; color: var(--text-dim); text-align: center; padding: 20px 0; }

```

- [ ] **Step 2: Add mobile overrides inside the `@media (max-width: 640px)` block**

Inside the `@media (max-width: 640px)` block (find the line `.form-row { grid-template-columns: 1fr; }` and insert immediately after it):

```css
  .quick-actions { flex-wrap: wrap; }
  .qa-btn { flex: 1 1 calc(50% - 4px); min-height: 44px; }
  .home-new-row { grid-template-columns: 1fr; }
```

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add CSS for Quick Actions, Today's Focus, and Best Seller cards"
```

---

## Task 2: HTML — add the three new elements inside `#page-home`

**Files:**
- Modify: `index.html` (HTML section, inside `#page-home`)

- [ ] **Step 1: Add the Quick Actions bar**

Find this line in `#page-home` (it is the opening of the top section):
```html
  <div class="home-top">
```

Insert the following immediately before it:

```html
  <!-- Quick Actions -->
  <div class="quick-actions">
    <button class="qa-btn qa-btn-primary" onclick="goTo('orders');openOrderModal()">＋ New Order</button>
    <button class="qa-btn qa-btn-secondary" onclick="openSaleModal()">🧾 Log Sale</button>
    <button class="qa-btn qa-btn-secondary" onclick="openPurchaseModal()">🛒 Log Purchase</button>
    <button class="qa-btn qa-btn-secondary" onclick="goTo('scheduler')">📅 Schedule</button>
  </div>
```

- [ ] **Step 2: Add the new bottom row with Today's Focus and Best Seller**

Find the closing tag of `home-bottom` (the line after the Next Pickups panel):
```html
  </div>
</div>
```
That last `</div>` closes `#page-home`. Insert a new row immediately before it (after the closing `</div>` of `.home-bottom`):

```html

  <!-- New row: Today's Focus + Best Seller -->
  <div class="home-bottom home-new-row" style="margin-top:12px">

    <!-- Today's Focus -->
    <div class="focus-card">
      <div class="home-card-head">
        <div class="home-card-title">🎯 Today's Focus</div>
      </div>
      <div class="focus-items">
        <div class="focus-item" id="focus-overdue" style="display:none">
          <div class="focus-ico">⚠️</div>
          <div class="focus-body">
            <div class="focus-title">Overdue pickups</div>
            <div class="focus-sub" id="focus-overdue-sub"></div>
          </div>
          <div class="focus-badge focus-badge-red" id="focus-overdue-count"></div>
        </div>
        <div class="focus-item" id="focus-today" style="display:none">
          <div class="focus-ico">📅</div>
          <div class="focus-body">
            <div class="focus-title">Pickups today</div>
            <div class="focus-sub" id="focus-today-sub"></div>
          </div>
          <div class="focus-badge focus-badge-orange" id="focus-today-count"></div>
        </div>
        <div class="focus-item" id="focus-ready" style="display:none">
          <div class="focus-ico">📦</div>
          <div class="focus-body">
            <div class="focus-title">Ready for pickup</div>
            <div class="focus-sub" id="focus-ready-sub"></div>
          </div>
          <div class="focus-badge focus-badge-green" id="focus-ready-count"></div>
        </div>
        <div class="focus-clear" id="focus-clear" style="display:none">All clear ✓</div>
      </div>
    </div>

    <!-- Best Seller -->
    <div class="home-panel">
      <div class="home-card-head">
        <div class="home-card-title" style="color:var(--sand)">🏆 Best Seller This Month</div>
      </div>
      <div id="bs-content" style="display:none">
        <div class="bs-header">
          <div>
            <div class="bs-size" id="bs-size"></div>
            <div class="bs-product" id="bs-product"></div>
          </div>
          <div class="bs-crown">🏆</div>
        </div>
        <hr class="bs-divider">
        <div class="bs-stats">
          <div class="bs-stat">
            <div class="bs-stat-val" id="bs-units"></div>
            <div class="bs-stat-lbl">Units</div>
          </div>
          <div class="bs-stat">
            <div class="bs-stat-val" id="bs-revenue"></div>
            <div class="bs-stat-lbl">Revenue</div>
          </div>
          <div class="bs-stat">
            <div class="bs-stat-val" id="bs-avg"></div>
            <div class="bs-stat-lbl">Avg</div>
          </div>
        </div>
      </div>
      <div class="bs-empty" id="bs-empty" style="display:none">No sales yet this month</div>
    </div>

  </div>
```

- [ ] **Step 3: Verify HTML structure visually**

Open `index.html` in a browser (or the live GitHub Pages URL after pushing). Confirm:
- Quick Actions bar appears at the top of the dashboard with 4 buttons
- A new row appears at the bottom with two cards side by side
- Cards are empty/hidden (no data yet — JS not wired up)
- Layout doesn't break at mobile width (≤640px) — both cards stack vertically

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: add Quick Actions bar and new dashboard row HTML"
```

---

## Task 3: JS — Today's Focus (wire up `loadHomeStats`)

**Files:**
- Modify: `index.html` (JS section, `loadHomeStats` function ~line 3630)

- [ ] **Step 1: Expand the orders select to include `customer_name` and `pickup_time`**

Find this line inside `loadHomeStats()`:
```js
      sb.from('orders').select('id,status,price,payment,pickup_date'),
```

Replace it with:
```js
      sb.from('orders').select('id,status,price,payment,pickup_date,pickup_time,customer_name'),
```

- [ ] **Step 2: Add Focus card population after the existing orders strip block**

Find this block near the end of the orders strip section in `loadHomeStats()`:
```js
    const footEl = document.getElementById('home-orders-foot');
    if (footEl) {
      const orderTotal = (pending || 0) + (building || 0) + (readyOrd || 0);
      footEl.textContent = orderTotal + ' total' + (overdue ? ' \u00b7 ' + overdue + ' overdue' : '');
    }
```

Insert the following immediately after that closing `}`:

```js

    // ── Today's Focus card ──
    const todayStr = todayKey();
    const overdueOrders = activeOrders.filter(o => o.pickup_date && o.pickup_date < todayStr && o.status !== 'completed');
    const todayPickups  = activeOrders.filter(o => o.pickup_date === todayStr && o.status !== 'completed');
    const readyOrders   = activeOrders.filter(o => o.status === 'ready');

    const focusOverdueEl = document.getElementById('focus-overdue');
    const focusTodayEl   = document.getElementById('focus-today');
    const focusReadyEl   = document.getElementById('focus-ready');
    const focusClearEl   = document.getElementById('focus-clear');

    if (focusOverdueEl) {
      const show = overdueOrders.length > 0;
      focusOverdueEl.style.display = show ? '' : 'none';
      if (show) {
        document.getElementById('focus-overdue-count').textContent = overdueOrders.length;
        document.getElementById('focus-overdue-sub').textContent = overdueOrders.length + ' order' + (overdueOrders.length > 1 ? 's' : '') + ' past pickup date';
      }
    }
    if (focusTodayEl) {
      const show = todayPickups.length > 0;
      focusTodayEl.style.display = show ? '' : 'none';
      if (show) {
        const first = todayPickups[0];
        const timePart = first.pickup_time ? ' · ' + first.pickup_time.slice(0, 5) : '';
        document.getElementById('focus-today-count').textContent = todayPickups.length;
        document.getElementById('focus-today-sub').textContent = (first.customer_name || 'Order #' + first.id) + timePart + (todayPickups.length > 1 ? ' +' + (todayPickups.length - 1) + ' more' : '');
      }
    }
    if (focusReadyEl) {
      const show = readyOrders.length > 0;
      focusReadyEl.style.display = show ? '' : 'none';
      if (show) {
        document.getElementById('focus-ready-count').textContent = readyOrders.length;
        document.getElementById('focus-ready-sub').textContent = readyOrders.length + ' order' + (readyOrders.length > 1 ? 's' : '') + ' waiting';
      }
    }
    if (focusClearEl) {
      focusClearEl.style.display = (overdueOrders.length + todayPickups.length + readyOrders.length === 0) ? '' : 'none';
    }
```

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: wire Today's Focus card in loadHomeStats"
```

---

## Task 4: JS — Best Seller card (`loadBestSeller`)

**Files:**
- Modify: `index.html` (JS section, after `loadHomeStats` function)

- [ ] **Step 1: Add the `loadBestSeller` function**

Find the comment immediately after `loadHomeStats`:
```js
// ===== RECENT ACTIVITY FEED =====
```

Insert the following immediately before it:

```js
// ===== BEST SELLER CARD =====
async function loadBestSeller() {
  const contentEl = document.getElementById('bs-content');
  const emptyEl   = document.getElementById('bs-empty');
  if (!contentEl || !emptyEl) return;
  try {
    const nowY = today.getFullYear();
    const nowM = today.getMonth();
    const firstOfMonth = nowY + '-' + String(nowM + 1).padStart(2, '0') + '-01';
    const todayStr = todayKey();
    const { data } = await sb
      .from('sales')
      .select('price, size, style, items, sale_date')
      .gte('sale_date', firstOfMonth)
      .lte('sale_date', todayStr);

    if (!data || !data.length) {
      contentEl.style.display = 'none';
      emptyEl.style.display = '';
      return;
    }

    // Tally by size (use items.rows[0].size for multi-item sales, else flat size)
    const tally = {};
    data.forEach(s => {
      const sz = (s.items && s.items.rows && s.items.rows[0]) ? s.items.rows[0].size : s.size;
      if (!sz) return;
      if (!tally[sz]) tally[sz] = { units: 0, revenue: 0, style: s.style || 'Standard' };
      tally[sz].units++;
      tally[sz].revenue += parseFloat(s.price) || 0;
    });

    const topSize = Object.entries(tally).sort((a, b) => b[1].units - a[1].units)[0];
    if (!topSize) {
      contentEl.style.display = 'none';
      emptyEl.style.display = '';
      return;
    }

    const [size, stats] = topSize;
    document.getElementById('bs-size').textContent = size;
    document.getElementById('bs-product').textContent = stats.style || 'Standard';
    document.getElementById('bs-units').textContent = stats.units;
    document.getElementById('bs-revenue').textContent = '$' + stats.revenue.toFixed(0);
    document.getElementById('bs-avg').textContent = '$' + (stats.revenue / stats.units).toFixed(0);
    contentEl.style.display = '';
    emptyEl.style.display = 'none';
  } catch(e) { console.error(e); }
}

```

- [ ] **Step 2: Call `loadBestSeller()` wherever `loadHomeStats()` is called**

There are two call sites. Find and update each:

**Call site 1** — initial page load (around line 3049):
```js
    loadHomeStats();
    loadRecentActivity();
    loadHomePickups();
```
Add `loadBestSeller();` on a new line after `loadHomeStats();`:
```js
    loadHomeStats();
    loadBestSeller();
    loadRecentActivity();
    loadHomePickups();
```

**Call site 2** — page navigation (inside the `if (page==='home')` branch, around line 3568):
```js
  if (page==='home')      { setHomeGreeting(); loadHomeStats(); loadRecentActivity(); loadHomePickups(); }
```
Replace with:
```js
  if (page==='home')      { setHomeGreeting(); loadHomeStats(); loadBestSeller(); loadRecentActivity(); loadHomePickups(); }
```

- [ ] **Step 3: Verify in browser**

Navigate to the dashboard. Confirm:
- Best Seller card shows the top-selling size for the current month (or "No sales yet this month" if none)
- Today's Focus shows the correct items — check against actual order data
- All three focus rows hide correctly when count is 0; "All clear ✓" appears when all are 0
- Quick Actions buttons all work: New Order opens modal, Log Sale opens sale modal, Log Purchase opens purchase modal, Schedule navigates to scheduler

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: add loadBestSeller and call alongside loadHomeStats"
```

---

## Task 5: Smoke tests

**Files:**
- Modify: `tests/home.spec.ts`

- [ ] **Step 1: Add smoke tests for the three new elements**

Open `tests/home.spec.ts` and append these tests:

```ts
test('Quick Actions bar renders 4 buttons', async ({ page }) => {
  const btns = page.locator('.quick-actions .qa-btn');
  await expect(btns).toHaveCount(4);
});

test('Quick Actions New Order button opens order modal', async ({ page }) => {
  await page.locator('.quick-actions .qa-btn-primary').click();
  await expect(page.locator('#orderModal')).toHaveClass(/open/, { timeout: 5000 });
});

test("Today's Focus card is present on home page", async ({ page }) => {
  await expect(page.locator('.focus-card')).toBeVisible();
});

test('Best Seller card is present on home page', async ({ page }) => {
  await expect(page.locator('#bs-content, #bs-empty')).toBeVisible();
});
```

- [ ] **Step 2: Run the smoke tests**

```bash
npx playwright test tests/home.spec.ts --project=smoke
```

Expected: all tests pass (including the 3 pre-existing ones).

- [ ] **Step 3: Commit**

```bash
git add tests/home.spec.ts
git commit -m "test: add smoke tests for Quick Actions, Today's Focus, Best Seller"
```

---

## Task 6: Push and verify deploy

- [ ] **Step 1: Push to GitHub**

```bash
git push origin main
```

- [ ] **Step 2: Verify deployment**

Wait ~60 seconds, then open the live GitHub Pages URL. Confirm all three new elements appear and function correctly on both desktop and mobile.

- [ ] **Step 3: Update test counts in docs**

In `tests/README.md` and `README.md`, update the smoke test count from 26 to 30.

```bash
git add tests/README.md README.md
git commit -m "docs: update smoke test count to 30 after dashboard additions"
```
