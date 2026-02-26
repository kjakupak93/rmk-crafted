# Dashboard Stats Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add per-section stat strips below each app tile on the home dashboard, showing live data from Orders, Inventory, Materials, and Scheduler.

**Architecture:** This is a single `index.html` file with no build step. All changes are in one file: new CSS classes in the `<style>` block, new HTML stat strip elements in the home page section, and extended `loadHomeStats()` JS to fetch and render the new data. No new files needed.

**Tech Stack:** Vanilla HTML/CSS/JS, Supabase JS client (`sb`), no build tooling.

---

### Task 1: Add stat strip CSS styles

**Files:**
- Modify: `index.html` — inside `<style>` block, after line ~199 (`/* ===== SHARED APP STYLES ===== */`)

**Step 1: Add the CSS**

Find this comment in the `<style>` block:
```css
/* ===== SHARED APP STYLES ===== */
```

Insert the following CSS block immediately before that comment:

```css
/* ===== HOME STAT STRIPS ===== */
.stat-strip {
  background: white;
  border: 2px solid var(--warm-gray);
  border-radius: 10px;
  padding: 10px 14px;
  display: flex;
  gap: 0;
  margin-top: 6px;
  flex-wrap: wrap;
}
.strip-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  min-width: 60px;
  padding: 4px 8px;
  border-right: 1px solid var(--warm-gray);
}
.strip-item:last-child { border-right: none; }
.strip-val {
  font-family: 'DM Mono', monospace;
  font-size: 18px;
  font-weight: 500;
  color: var(--navy);
  line-height: 1.1;
}
.strip-val.low { color: var(--red); }
.strip-val.money { color: var(--green); }
.strip-val.warn { color: var(--orange); }
.strip-lbl {
  font-size: 10px;
  color: var(--text-muted);
  margin-top: 2px;
  text-align: center;
  white-space: nowrap;
}
```

**Step 2: Verify visually**

Open `index.html` in a browser. The home screen should look identical — the new CSS classes aren't used yet.

**Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add stat strip CSS for home dashboard"
```

---

### Task 2: Add stat strip HTML to the home page

**Files:**
- Modify: `index.html` — inside `#page-home`, the `.app-grid` div (lines ~821–849)

**Context:** The `.app-grid` is a 2-column CSS grid. We need to wrap each tile + its strip in a container `div` so the strip stays paired with its tile in the grid. The Scheduler tile spans 2 columns and also gets a strip.

**Step 1: Replace the `.app-grid` contents**

Find this exact block (lines 821–849):

```html
    <div class="app-grid">
      <div class="app-tile" onclick="goTo('quote')">
        <span class="tile-icon">🪵</span>
        <div class="tile-name">Quote Calculator</div>
        <div class="tile-desc">Price any size planter instantly</div>
      </div>
      <div class="app-tile" onclick="goTo('orders')">
        <span class="tile-icon">📋</span>
        <div class="tile-name">Orders</div>
        <div class="tile-desc">Track active & completed orders</div>
        <span class="tile-badge" id="tile-orders-badge" style="display:none"></span>
      </div>
      <div class="app-tile" onclick="goTo('inventory')">
        <span class="tile-icon">📦</span>
        <div class="tile-name">Inventory</div>
        <div class="tile-desc">Ready-to-sell planters & sales history</div>
      </div>
      <div class="app-tile" onclick="goTo('materials')">
        <span class="tile-icon">🛒</span>
        <div class="tile-name">Materials</div>
        <div class="tile-desc">Wood stock & Lowes purchases</div>
      </div>
      <div class="app-tile" onclick="goTo('scheduler')" style="grid-column: span 2;">
        <span class="tile-icon">📅</span>
        <div class="tile-name">Pickup Scheduler</div>
        <div class="tile-desc">Calendar, bookings & availability</div>
        <span class="tile-badge" id="tile-pickups-badge" style="display:none"></span>
      </div>
    </div>
```

Replace with:

```html
    <div class="app-grid">
      <div>
        <div class="app-tile" onclick="goTo('quote')">
          <span class="tile-icon">🪵</span>
          <div class="tile-name">Quote Calculator</div>
          <div class="tile-desc">Price any size planter instantly</div>
        </div>
      </div>
      <div>
        <div class="app-tile" onclick="goTo('orders')">
          <span class="tile-icon">📋</span>
          <div class="tile-name">Orders</div>
          <div class="tile-desc">Track active & completed orders</div>
          <span class="tile-badge" id="tile-orders-badge" style="display:none"></span>
        </div>
        <div class="stat-strip" id="strip-orders">
          <div class="strip-item"><div class="strip-val" id="ss-pending">—</div><div class="strip-lbl">Pending</div></div>
          <div class="strip-item"><div class="strip-val" id="ss-building">—</div><div class="strip-lbl">Building</div></div>
          <div class="strip-item"><div class="strip-val" id="ss-ready-ord">—</div><div class="strip-lbl">Ready</div></div>
          <div class="strip-item"><div class="strip-val money" id="ss-owed">—</div><div class="strip-lbl">Owed</div></div>
        </div>
      </div>
      <div>
        <div class="app-tile" onclick="goTo('inventory')">
          <span class="tile-icon">📦</span>
          <div class="tile-name">Inventory</div>
          <div class="tile-desc">Ready-to-sell planters & sales history</div>
        </div>
        <div class="stat-strip" id="strip-inventory">
          <div class="strip-item"><div class="strip-val" id="ss-stock">—</div><div class="strip-lbl">In Stock</div></div>
          <div class="strip-item"><div class="strip-val money" id="ss-inv-value">—</div><div class="strip-lbl">Value</div></div>
        </div>
      </div>
      <div>
        <div class="app-tile" onclick="goTo('materials')">
          <span class="tile-icon">🛒</span>
          <div class="tile-name">Materials</div>
          <div class="tile-desc">Wood stock & Lowes purchases</div>
        </div>
        <div class="stat-strip" id="strip-materials">
          <div class="strip-item"><div class="strip-val" id="ss-pickets">—</div><div class="strip-lbl">Pickets</div></div>
          <div class="strip-item"><div class="strip-val" id="ss-twobytwo">—</div><div class="strip-lbl">2×2s</div></div>
          <div class="strip-item"><div class="strip-val" id="ss-twobyfour">—</div><div class="strip-lbl">2×4s</div></div>
        </div>
      </div>
      <div style="grid-column: span 2;">
        <div class="app-tile" onclick="goTo('scheduler')">
          <span class="tile-icon">📅</span>
          <div class="tile-name">Pickup Scheduler</div>
          <div class="tile-desc">Calendar, bookings & availability</div>
          <span class="tile-badge" id="tile-pickups-badge" style="display:none"></span>
        </div>
        <div class="stat-strip" id="strip-scheduler">
          <div class="strip-item"><div class="strip-val" id="ss-today">—</div><div class="strip-lbl">Today</div></div>
          <div class="strip-item"><div class="strip-val" id="ss-week">—</div><div class="strip-lbl">This Week</div></div>
          <div class="strip-item" style="flex:2; align-items:flex-start"><div class="strip-val" id="ss-next" style="font-size:14px">—</div><div class="strip-lbl">Next Pickup</div></div>
        </div>
      </div>
    </div>
```

**Step 2: Verify in browser**

Open `index.html`. You should see:
- Quote tile: no strip (just the tile, no strip below it)
- Orders tile: strip below with 4 `—` placeholders (Pending, Building, Ready, Owed)
- Inventory tile: strip below with 2 `—` placeholders (In Stock, Value)
- Materials tile: strip below with 3 `—` placeholders (Pickets, 2×2s, 2×4s)
- Scheduler tile (full width): strip below with 3 `—` placeholders (Today, This Week, Next Pickup)

**Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add stat strip HTML to home dashboard tiles"
```

---

### Task 3: Extend loadHomeStats() to fetch and render strip data

**Files:**
- Modify: `index.html` — `loadHomeStats()` function (lines ~1426–1442)

**Step 1: Replace the function**

Find the existing `loadHomeStats()` function:

```js
async function loadHomeStats() {
  try {
    const [ordRes, invRes, bookRes] = await Promise.all([
      sb.from('orders').select('id,status'),
      sb.from('inventory').select('qty'),
      sb.from('schedule_bookings').select('booking_date').eq('booking_date', todayKey())
    ]);
    const active = (ordRes.data||[]).filter(o => o.status !== 'completed').length;
    const ready = (invRes.data||[]).reduce((s,i) => s+(i.qty||0), 0);
    const pickups = (bookRes.data||[]).length;
    document.getElementById('hs-active').textContent = active;
    document.getElementById('hs-ready').textContent = ready;
    document.getElementById('hs-pickups').textContent = pickups;
    if (active > 0) { document.getElementById('tile-orders-badge').textContent = active; document.getElementById('tile-orders-badge').style.display=''; }
    if (pickups > 0) { document.getElementById('tile-pickups-badge').textContent = pickups+' today'; document.getElementById('tile-pickups-badge').style.display=''; }
  } catch(e) { console.error(e); }
}
```

Replace with:

```js
async function loadHomeStats() {
  try {
    // Compute date range for "this week" (today through 6 days out)
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const weekEndKey = dateKey(weekEnd);

    const [ordRes, invRes, stockRes, bookTodayRes, bookWeekRes, bookFutureRes] = await Promise.all([
      sb.from('orders').select('id,status,price,payment'),
      sb.from('inventory').select('qty,price'),
      sb.from('stock').select('material,qty'),
      sb.from('schedule_bookings').select('booking_date').eq('booking_date', todayKey()),
      sb.from('schedule_bookings').select('booking_date').gte('booking_date', todayKey()).lte('booking_date', weekEndKey),
      sb.from('schedule_bookings').select('booking_date').gt('booking_date', todayKey()).order('booking_date', { ascending: true }).limit(1)
    ]);

    // ── Top 3 stats (unchanged) ──
    const activeOrders = (ordRes.data||[]).filter(o => o.status !== 'completed');
    const active = activeOrders.length;
    const ready = (invRes.data||[]).reduce((s,i) => s+(i.qty||0), 0);
    const pickups = (bookTodayRes.data||[]).length;
    document.getElementById('hs-active').textContent = active;
    document.getElementById('hs-ready').textContent = ready;
    document.getElementById('hs-pickups').textContent = pickups;
    if (active > 0) { document.getElementById('tile-orders-badge').textContent = active; document.getElementById('tile-orders-badge').style.display=''; }
    if (pickups > 0) { document.getElementById('tile-pickups-badge').textContent = pickups+' today'; document.getElementById('tile-pickups-badge').style.display=''; }

    // ── Orders strip ──
    const pending = activeOrders.filter(o => o.status === 'pending').length;
    const building = activeOrders.filter(o => o.status === 'building').length;
    const readyOrd = activeOrders.filter(o => o.status === 'ready').length;
    const owed = activeOrders.filter(o => o.payment === 'unpaid').reduce((s,o) => s+(parseFloat(o.price)||0), 0);
    document.getElementById('ss-pending').textContent = pending;
    document.getElementById('ss-building').textContent = building;
    document.getElementById('ss-ready-ord').textContent = readyOrd;
    document.getElementById('ss-owed').textContent = '$'+owed.toFixed(0);

    // ── Inventory strip ──
    const invItems = invRes.data||[];
    const totalStock = invItems.reduce((s,i) => s+(i.qty||0), 0);
    const totalValue = invItems.reduce((s,i) => s+((i.qty||0)*(parseFloat(i.price)||0)), 0);
    document.getElementById('ss-stock').textContent = totalStock;
    document.getElementById('ss-inv-value').textContent = '$'+totalValue.toFixed(0);

    // ── Materials strip ──
    const stockMap = {};
    (stockRes.data||[]).forEach(r => { stockMap[r.material] = r.qty||0; });
    const pickets = stockMap['pickets']||0;
    const twobytwo = stockMap['twobytwo']||0;
    const twobyfour = stockMap['twobyfour']||0;
    const elP = document.getElementById('ss-pickets');
    const el22 = document.getElementById('ss-twobytwo');
    const el24 = document.getElementById('ss-twobyfour');
    elP.textContent = pickets;
    el22.textContent = twobytwo;
    el24.textContent = twobyfour;
    elP.className = 'strip-val' + (pickets < 10 ? ' low' : '');
    el22.className = 'strip-val' + (twobytwo < 5 ? ' low' : '');
    el24.className = 'strip-val' + (twobyfour < 5 ? ' low' : '');

    // ── Scheduler strip ──
    const weekPickups = (bookWeekRes.data||[]).length;
    const nextBooking = (bookFutureRes.data||[])[0];
    let nextLabel = 'None';
    if (nextBooking) {
      const d = new Date(nextBooking.booking_date + 'T00:00:00');
      nextLabel = d.toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' });
    }
    document.getElementById('ss-today').textContent = pickups;
    document.getElementById('ss-week').textContent = weekPickups;
    document.getElementById('ss-next').textContent = nextLabel;

  } catch(e) { console.error(e); }
}
```

**Step 2: Test in browser**

Open `index.html`. On the home screen, verify:
- Orders strip shows real counts per status and dollar amount owed
- Inventory strip shows total in-stock count and total value
- Materials strip shows stock counts; any value below threshold is red
- Scheduler strip shows today's pickup count, week count, and next pickup date
- Top 3 stats still work as before

**Step 3: Commit**

```bash
git add index.html
git commit -m "feat: load and render per-section stats on home dashboard"
```

---

## Done

All three tasks complete. The home dashboard now shows live stat strips below the Orders, Inventory, Materials, and Scheduler tiles, loaded in a single parallel `Promise.all` call alongside the existing top stats.
