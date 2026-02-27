# Overdue Alerts + Listing Generator Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add overdue order detection with visual alerts on cards and the home dashboard, plus a Facebook Marketplace listing generator accessible from inventory cards and the quote calculator.

**Architecture:** All changes in `index.html`. Overdue logic is purely client-side using the already-fetched orders data (just needs `pickup_date` added to the select). The listing modal is a single reusable modal populated dynamically. No new Supabase tables or queries needed beyond the minor field addition.

**Tech Stack:** Vanilla HTML/CSS/JS, Supabase JS client (`sb`), existing modal infrastructure.

---

### Task 1: Add overdue CSS + update order card HTML

**Files:**
- Modify: `index.html` — CSS block around line 401–403 (order card status border rules)
- Modify: `index.html` — `orderCardHTML()` function around line 1811

**Step 1: Add overdue CSS**

Find these three lines in the `<style>` block (around line 401–403):
```css
.order-card.s-pending { border-left: 4px solid var(--orange); }
.order-card.s-building { border-left: 4px solid var(--ocean); }
.order-card.s-ready { border-left: 4px solid var(--green); }
```

Insert immediately after them:
```css
.order-card.s-overdue { border-left: 4px solid var(--red); }
```

**Step 2: Update `orderCardHTML()` to detect and display overdue state**

Find the full `orderCardHTML` function (around line 1811):
```js
function orderCardHTML(o) {
  const bc={pending:'badge-pending',building:'badge-building',ready:'badge-ready',completed:'badge-completed'}[o.status]||'';
  const bl={pending:'Pending',building:'Building',ready:'Ready',completed:'Complete'}[o.status]||o.status;
  const pc={cash:'badge-cash',venmo:'badge-venmo',unpaid:'badge-unpaid'}[o.payment]||'badge-unpaid';
  const pl={cash:'Cash',venmo:'Venmo',unpaid:'Unpaid'}[o.payment]||'';
  const pickup=o.pickup_date?`📅 ${o.pickup_date}`:'';
  return `<div class="order-card s-${o.status}">
    <div class="card-top">
      <div><div class="card-title">${o.name}</div><div class="card-subtitle">${o.size||''}" — ${o.style||'Standard'}${o.contact?' · '+o.contact:''}</div></div>
      <div class="card-actions">
        <span class="badge ${bc}">${bl}</span>
        <button class="icon-btn" title="Edit" onclick="editOrder('${o.id}')">✏️</button>
        ${o.status!=='completed'?`<button class="icon-btn" title="Complete" onclick="completeOrder('${o.id}')">✅</button>`:''}
        <button class="icon-btn" title="Delete" onclick="deleteOrder('${o.id}')">🗑️</button>
      </div>
    </div>
    <div class="card-meta">
      <div class="meta-item"><strong>$${o.price||0}</strong></div>
      <div class="meta-item"><span class="badge ${pc}">${pl}</span></div>
      ${pickup?`<div class="meta-item">${pickup}</div>`:''}
      ${o.notes?`<div class="meta-item">📝 ${o.notes}</div>`:''}
    </div>
  </div>`;
}
```

Replace with:
```js
function orderCardHTML(o) {
  const bc={pending:'badge-pending',building:'badge-building',ready:'badge-ready',completed:'badge-completed'}[o.status]||'';
  const bl={pending:'Pending',building:'Building',ready:'Ready',completed:'Complete'}[o.status]||o.status;
  const pc={cash:'badge-cash',venmo:'badge-venmo',unpaid:'badge-unpaid'}[o.payment]||'badge-unpaid';
  const pl={cash:'Cash',venmo:'Venmo',unpaid:'Unpaid'}[o.payment]||'';
  const pickup=o.pickup_date?`📅 ${o.pickup_date}`:'';
  const isOverdue = o.status!=='completed' && o.pickup_date && o.pickup_date < todayKey();
  const overdueClass = isOverdue ? ' s-overdue' : '';
  const overdueBadge = isOverdue ? `<span class="badge" style="background:#fde8e8;color:var(--red)">Overdue</span>` : '';
  return `<div class="order-card s-${o.status}${overdueClass}">
    <div class="card-top">
      <div><div class="card-title">${o.name}</div><div class="card-subtitle">${o.size||''}" — ${o.style||'Standard'}${o.contact?' · '+o.contact:''}</div></div>
      <div class="card-actions">
        ${overdueBadge}
        <span class="badge ${bc}">${bl}</span>
        <button class="icon-btn" title="Edit" onclick="editOrder('${o.id}')">✏️</button>
        ${o.status!=='completed'?`<button class="icon-btn" title="Complete" onclick="completeOrder('${o.id}')">✅</button>`:''}
        <button class="icon-btn" title="Delete" onclick="deleteOrder('${o.id}')">🗑️</button>
      </div>
    </div>
    <div class="card-meta">
      <div class="meta-item"><strong>$${o.price||0}</strong></div>
      <div class="meta-item"><span class="badge ${pc}">${pl}</span></div>
      ${pickup?`<div class="meta-item">${pickup}</div>`:''}
      ${o.notes?`<div class="meta-item">📝 ${o.notes}</div>`:''}
    </div>
  </div>`;
}
```

**Step 3: Verify**

Grep to confirm `.order-card.s-overdue` exists in the CSS and `isOverdue` exists in `orderCardHTML`.

**Step 4: Commit**
```bash
git add index.html
git commit -m "feat: add overdue CSS and badge to order cards"
```

---

### Task 2: Add overdue count to home dashboard orders strip

**Files:**
- Modify: `index.html` — `#strip-orders` HTML (line ~874–879)
- Modify: `index.html` — `loadHomeStats()` function (line ~1545–1546 orders query, line ~1565–1578 orders strip section)

**Step 1: Add `pickup_date` to the orders query in `loadHomeStats()`**

Find this line inside `loadHomeStats()`:
```js
      sb.from('orders').select('id,status,price,payment'),
```

Replace with:
```js
      sb.from('orders').select('id,status,price,payment,pickup_date'),
```

**Step 2: Add overdue count computation in `loadHomeStats()`**

Find this block in `loadHomeStats()`:
```js
    const owed = activeOrders.filter(o => o.payment === 'unpaid').reduce((s,o) => s+(parseFloat(o.price)||0), 0);
    document.getElementById('ss-pending').textContent = pending;
    document.getElementById('ss-building').textContent = building;
    document.getElementById('ss-ready-ord').textContent = readyOrd;
    document.getElementById('ss-owed').textContent = '$'+owed.toFixed(0);
```

Replace with:
```js
    const owed = activeOrders.filter(o => o.payment === 'unpaid').reduce((s,o) => s+(parseFloat(o.price)||0), 0);
    const overdue = activeOrders.filter(o => o.pickup_date && o.pickup_date < todayKey()).length;
    document.getElementById('ss-pending').textContent = pending;
    document.getElementById('ss-building').textContent = building;
    document.getElementById('ss-ready-ord').textContent = readyOrd;
    document.getElementById('ss-owed').textContent = '$'+owed.toFixed(0);
    const elOD = document.getElementById('ss-overdue');
    elOD.textContent = overdue;
    elOD.className = 'strip-val' + (overdue > 0 ? ' low' : '');
```

**Step 3: Add `#ss-overdue` to the orders stat strip HTML**

Find this exact block (line ~874–879):
```html
        <div class="stat-strip" id="strip-orders">
          <div class="strip-item"><div class="strip-val" id="ss-pending">—</div><div class="strip-lbl">Pending</div></div>
          <div class="strip-item"><div class="strip-val" id="ss-building">—</div><div class="strip-lbl">Building</div></div>
          <div class="strip-item"><div class="strip-val" id="ss-ready-ord">—</div><div class="strip-lbl">Ready</div></div>
          <div class="strip-item"><div class="strip-val money" id="ss-owed">—</div><div class="strip-lbl">Owed</div></div>
        </div>
```

Replace with:
```html
        <div class="stat-strip" id="strip-orders">
          <div class="strip-item"><div class="strip-val" id="ss-pending">—</div><div class="strip-lbl">Pending</div></div>
          <div class="strip-item"><div class="strip-val" id="ss-building">—</div><div class="strip-lbl">Building</div></div>
          <div class="strip-item"><div class="strip-val" id="ss-ready-ord">—</div><div class="strip-lbl">Ready</div></div>
          <div class="strip-item"><div class="strip-val money" id="ss-owed">—</div><div class="strip-lbl">Owed</div></div>
          <div class="strip-item"><div class="strip-val" id="ss-overdue">—</div><div class="strip-lbl">Overdue</div></div>
        </div>
```

**Step 4: Verify**

- Grep for `ss-overdue` — should appear twice (HTML and JS)
- Grep for `pickup_date` in the orders select — should be present

**Step 5: Commit**
```bash
git add index.html
git commit -m "feat: add overdue count to home dashboard orders strip"
```

---

### Task 3: Add listing modal HTML

**Files:**
- Modify: `index.html` — between `#markPaidModal` closing `</div>` (line 1432) and `<script>` (line 1434)

**Step 1: Insert the listing modal**

Find this exact sequence (lines 1432–1434):
```html
</div>

<script>
```

Insert between the `</div>` and `<script>`:

```html

<!-- Listing modal -->
<div class="modal-overlay" id="listingModal">
  <div class="modal" style="max-width:480px">
    <h2 style="margin-bottom:4px">Facebook Marketplace Listing</h2>
    <p style="font-size:12px;color:var(--text-muted);margin-bottom:14px">Copy and paste into your Facebook Marketplace listing.</p>
    <div class="quote-out" style="margin-bottom:12px">
      <div class="quote-text" id="listingText"></div>
    </div>
    <div style="display:flex;gap:8px">
      <button class="copy-btn" id="listingCopyBtn" onclick="copyListing()" style="flex:1;padding:10px;font-size:13px">Copy listing</button>
      <button class="modal-btn-cancel" onclick="closeModal('listingModal')">Close</button>
    </div>
  </div>
</div>
```

**Step 2: Verify**

Grep for `id="listingModal"` and `id="listingText"` — both should exist.

**Step 3: Commit**
```bash
git add index.html
git commit -m "feat: add listing modal HTML"
```

---

### Task 4: Add listing generator JS + inventory button + quote button

**Files:**
- Modify: `index.html` — add `openListingModal()` and `copyListing()` functions (after `markAllPaid`)
- Modify: `index.html` — `loadInventory()` function (add 📣 button to each inv-card)
- Modify: `index.html` — `#qResults` HTML (add 📣 Post to Marketplace button)

**Step 1: Add `openListingModal` and `copyListing` JS functions**

Find this function (around line 1907):
```js
function filterOrders(f,btn) {
```

Insert immediately before it:

```js
function openListingModal(size, style, price) {
  const parts = size.split('×');
  const l = parts[0]||'?', w = parts[1]||'?', h = parts[2]||'?';
  const matLine = style==='Vertical'
    ? '🌿 Material: Cedar + 2×2 & 2×4 frame — extra deep & sturdy'
    : '🌿 Material: Natural cedar — durable & weather-resistant';
  const text = `🪵 Cedar Planter Box — ${size}"

Handcrafted cedar planter box, perfect for your garden or patio!

📐 Size: ${l}" L × ${w}" W × ${h}" H
💵 Price: $${price}
${matLine}

Payment: Cash or Venmo (@RMKCrafted)
Pickup only — Oceanside, CA

Message me to claim yours! 🌿`;
  document.getElementById('listingText').textContent = text;
  const btn = document.getElementById('listingCopyBtn');
  btn.textContent = 'Copy listing';
  btn.classList.remove('copied');
  document.getElementById('listingModal').classList.add('open');
}

function copyListing() {
  navigator.clipboard.writeText(document.getElementById('listingText').textContent).then(() => {
    const btn = document.getElementById('listingCopyBtn');
    btn.textContent = '✓ Copied!';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = 'Copy listing'; btn.classList.remove('copied'); }, 2000);
  });
}

```

**Step 2: Add 📣 List button to each inventory card**

Find this exact block inside `loadInventory()`:
```js
    <button class="icon-btn" onclick="deleteInvItem('${item.id}')">🗑️</button>
  </div>`).join('');
```

Replace with:
```js
    <div style="display:flex;gap:6px;margin-top:4px">
      <button class="icon-btn" style="flex:1;width:auto;padding:5px 8px;font-size:11px" onclick="openListingModal('${item.size}','${item.style||'Standard'}',${item.price})">📣 List</button>
      <button class="icon-btn" onclick="deleteInvItem('${item.id}')">🗑️</button>
    </div>
  </div>`).join('');
```

**Step 3: Add 📣 Post to Marketplace button in quote results**

Find this exact block (around line 1005–1007):
```html
      <button style="width:100%;padding:12px;background:transparent;color:var(--text-muted);border:2px solid var(--warm-gray);border-radius:10px;font-size:14px;cursor:pointer;margin-top:4px" onclick="resetQuote()">← New quote</button>
      <button class="btn-primary" style="width:100%;padding:13px;margin-top:8px;font-size:15px;justify-content:center" onclick="createOrderFromQuote()">📋 Create Order from This Quote</button>
    </div>
```

Replace with:
```html
      <button style="width:100%;padding:12px;background:transparent;color:var(--text-muted);border:2px solid var(--warm-gray);border-radius:10px;font-size:14px;cursor:pointer;margin-top:4px" onclick="resetQuote()">← New quote</button>
      <button class="btn-primary" style="width:100%;padding:13px;margin-top:8px;font-size:15px;justify-content:center" onclick="createOrderFromQuote()">📋 Create Order from This Quote</button>
      <button class="btn-secondary" style="width:100%;padding:13px;margin-top:8px;font-size:15px;justify-content:center" onclick="openListingFromQuote()">📣 Post to Marketplace</button>
    </div>
```

**Step 4: Add `openListingFromQuote` function**

Find this function:
```js
function createOrderFromQuote() {
```

Insert immediately before it:

```js
function openListingFromQuote() {
  const l = document.getElementById('dimL').value;
  const w = document.getElementById('dimW').value;
  const h = document.getElementById('dimH').value;
  if (!l || !w || !h) { showToast('Please calculate a quote first', 'error'); return; }
  const size = `${l}×${w}×${h}`;
  const price = getQuotePrice();
  openListingModal(size, currentStyle, price);
}

```

**Step 5: Verify**

- Grep for `openListingModal` — should appear in the JS function definition, in `loadInventory()` template, and in `openListingFromQuote()`
- Grep for `openListingFromQuote` — should appear in the HTML button and JS function
- Grep for `copyListing` — should appear in the modal HTML and JS function

**Step 6: Commit**
```bash
git add index.html
git commit -m "feat: add marketplace listing generator with inventory and quote entry points"
```

---

## Done

All four tasks complete:
- Overdue orders show a red "Overdue" badge and red left border on their cards
- Home dashboard Orders strip shows an "Overdue" count that turns red when > 0
- A single `#listingModal` generates formatted Facebook Marketplace listings
- Listings are accessible from every inventory card (📣 List button) and from quote results (📣 Post to Marketplace)
