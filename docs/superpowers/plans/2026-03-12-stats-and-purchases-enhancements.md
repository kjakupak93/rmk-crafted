# Stats & Purchases Enhancements Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add stat cards to the Ready to Sell tab, and add stat cards + time filter tabs + edit (pencil) icon to the Purchases tab.

**Architecture:** All changes are in the single `index.html` file. HTML stat elements and filter tabs are added inline; JS functions `loadInventory()` and `loadPurchases()` are refactored to compute stats and support filtering/editing. No new files, no schema changes.

**Tech Stack:** Vanilla HTML/CSS/JS, Supabase JS client (`sb`). No build step — open `index.html` in a browser (or via GitHub Pages) to test.

**Spec:** `docs/superpowers/specs/2026-03-12-stats-and-purchases-enhancements-design.md`

---

## Chunk 1: Ready to Sell — stat strip HTML + JS

### Task 1: Add stat strip HTML to the Ready to Sell tab

**Files:**
- Modify: `index.html:1526-1532` (the `#otab-inventory` tab panel)

- [ ] **Step 1: Add the stat strip HTML**

In `index.html`, locate `#otab-inventory` (around line 1526). It currently reads:

```html
<div class="tab-panel" id="otab-inventory">
  <div class="section-header">
    <h2>Ready to Sell</h2>
    <button class="btn-primary" onclick="openInvModal()">+ Add Item</button>
  </div>
  <div class="inv-grid" id="invGrid"></div>
</div>
```

Replace with:

```html
<div class="tab-panel" id="otab-inventory">
  <div class="section-header">
    <h2>Ready to Sell</h2>
    <button class="btn-primary" onclick="openInvModal()">+ Add Item</button>
  </div>
  <div class="summary-grid" style="grid-template-columns:repeat(2,1fr);margin-bottom:16px">
    <div class="summary-card c-green"><div class="val" id="inv-stat-count">0</div><div class="lbl">Items in Stock</div></div>
    <div class="summary-card c-blue"><div class="val" id="inv-stat-value">$0</div><div class="lbl">Inventory Value</div></div>
  </div>
  <div class="inv-grid" id="invGrid"></div>
</div>
```

- [ ] **Step 2: Verify HTML renders correctly in browser**

Open `index.html`, navigate to Orders → Ready to Sell tab. You should see two placeholder stat cards ("0" / "$0") above the inventory grid. The cards should be side by side, green left / blue right.

---

### Task 2: Wire stat computation into `loadInventory()`

**Files:**
- Modify: `index.html:2953-2974` (the `loadInventory` function)

- [ ] **Step 1: Refactor `loadInventory()` to compute and write stats**

Locate `loadInventory()` (around line 2953). Current code:

```js
async function loadInventory() {
  const {data,error}=await sb.from('inventory').select('*').order('created_at',{ascending:false});
  if (error) {showToast('Error loading inventory','error');return;}
  const grid=document.getElementById('invGrid');
  if (!data||!data.length) {grid.innerHTML=emptyState('📦','No ready-to-sell items yet.');return;}
  grid.innerHTML=data.map(item=>` ... `).join('');
}
```

Replace with:

```js
async function loadInventory() {
  const {data,error}=await sb.from('inventory').select('*').order('created_at',{ascending:false});
  if (error) {showToast('Error loading inventory','error');return;}
  const grid=document.getElementById('invGrid');
  // Compute stats from full dataset (before early return)
  const totalQty=(data||[]).reduce((s,i)=>s+(i.qty||0),0);
  const totalVal=(data||[]).reduce((s,i)=>s+((i.price||0)*(i.qty||0)),0);
  document.getElementById('inv-stat-count').textContent=totalQty;
  document.getElementById('inv-stat-value').textContent='$'+totalVal.toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:0});
  if (!data||!data.length) {grid.innerHTML=emptyState('📦','No ready-to-sell items yet.');return;}
  grid.innerHTML=data.map(item=>`<div class="inv-card">
    <div><div class="inv-size">${item.size}"</div><div class="inv-style">${item.style}</div></div>
    <div class="inv-price">$${item.price}</div>
    <div class="qty-ctrl">
      <button class="qty-btn" onclick="adjustInvQty('${item.id}',${item.qty},-1)">−</button>
      <span class="qty-num">${item.qty}</span>
      <button class="qty-btn" onclick="adjustInvQty('${item.id}',${item.qty},1)">+</button>
    </div>
    <div style="font-size:11px;color:var(--text-muted)">in stock</div>
    ${item.add_ons&&item.add_ons.length?`<div style="font-size:11px;color:var(--ocean)">✨ ${item.add_ons.map(id=>{const a=ADDONS.find(x=>x.id===id);return a?a.label:id;}).join(' · ')}</div>`:''}
    ${item.notes?`<div style="font-size:12px;color:var(--text-muted)">${item.notes}</div>`:''}
    <div style="display:flex;gap:6px;margin-top:4px">
      <button class="icon-btn" style="flex:1;width:auto;padding:5px 8px;font-size:11px" data-size="${item.size}" data-style="${item.style||'Standard'}" data-price="${item.price}" onclick="openListingModal(this.dataset.size,this.dataset.style,this.dataset.price)">📣 List</button>
      <button class="icon-btn" onclick="deleteInvItem('${item.id}')">🗑️</button>
    </div>
  </div>`).join('');
}
```

- [ ] **Step 2: Verify stats update in browser**

Reload and navigate to Orders → Ready to Sell. Confirm:
- Stats show real counts (e.g. "12" items, "$940" value) based on your actual inventory data
- Adding or removing an item via +/− or delete updates the stats after each action
- If inventory is empty, stats show "0" and "$0" (not blank)

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add Items in Stock and Inventory Value stats to Ready to Sell tab"
```

---

## Chunk 2: Purchases — stat cards HTML + JS refactor

### Task 3: Add purchases stat cards HTML

**Files:**
- Modify: `index.html:1632-1641` (the `#mtab-purchases` tab panel)

- [ ] **Step 1: Add stat cards and filter tabs HTML**

Locate `#mtab-purchases` (around line 1632). It currently reads:

```html
<div class="tab-panel" id="mtab-purchases">
  <div class="section-header">
    <h2>Lowes Purchase Log</h2>
    <div style="display:flex;gap:8px">
      <button class="btn-secondary" onclick="downloadPurchaseCSV()">↓ CSV</button>
      <button class="btn-primary" onclick="openPurchaseModal()">+ Log Purchase</button>
    </div>
  </div>
  <div id="purchaseList"></div>
</div>
```

Replace with:

```html
<div class="tab-panel" id="mtab-purchases">
  <div class="summary-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:16px">
    <div class="summary-card c-sand"><div class="val" id="pur-stat-total">$0</div><div class="lbl">Total Spent</div></div>
    <div class="summary-card"><div class="val" id="pur-stat-trips">0</div><div class="lbl">Trips to Lowes</div></div>
    <div class="summary-card c-blue"><div class="val" id="pur-stat-avg">$0</div><div class="lbl">Avg per Trip</div></div>
  </div>
  <div class="section-header">
    <h2>Lowes Purchase Log</h2>
    <div style="display:flex;gap:8px">
      <button class="btn-secondary" onclick="downloadPurchaseCSV()">↓ CSV</button>
      <button class="btn-primary" onclick="openPurchaseModal()">+ Log Purchase</button>
    </div>
  </div>
  <div class="sales-filter-tabs">
    <button class="sales-filter-btn" onclick="setPurchasesFilter('month',this)">This Month</button>
    <button class="sales-filter-btn" onclick="setPurchasesFilter('lastmonth',this)">Last Month</button>
    <button class="sales-filter-btn active" onclick="setPurchasesFilter('all',this)">All Time</button>
  </div>
  <div id="purchaseList"></div>
</div>
```

- [ ] **Step 2: Verify HTML structure in browser**

Open Orders → Materials → Purchases tab. You should see three placeholder stat cards ("$0", "0", "$0") above the section header, and three filter tabs (This Month / Last Month / All Time) above the list. Filter buttons are clickable but do nothing yet (JS not wired).

---

### Task 4: Refactor `loadPurchases()` with stats + filter support

**Files:**
- Modify: `index.html:3188-3204` (loadPurchases and related JS)

- [ ] **Step 1: Add module-level variables for purchases (near `allSales`/`salesFilter` at line ~3016)**

Locate the block around line 3016:
```js
let allSales = [];
let salesFilter = 'all';
```

Add immediately after it:
```js
let allPurchases = [];
let purchasesFilter = 'all';
```

- [ ] **Step 2: Add `setPurchasesFilter()` function (immediately after `setSalesFilter()` at line ~3024)**

Locate `setSalesFilter` (around line 3019) and add `setPurchasesFilter` right after it:

```js
function setPurchasesFilter(period, btn) {
  purchasesFilter = period;
  document.querySelectorAll('.sales-filter-btn').forEach(b=>b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderPurchaseList();
}
```

**Note:** `querySelectorAll('.sales-filter-btn')` selects ALL filter buttons on the page. Since the sales filter tabs and the purchases filter tabs use the same CSS class, this correctly clears both sets when toggling — which is fine because only one tab (sales or purchases) is visible at a time.

- [ ] **Step 3: Replace `loadPurchases()` with refactored version**

Locate `loadPurchases()` (around line 3188) and replace the entire function with:

```js
async function loadPurchases() {
  const {data}=await sb.from('purchases').select('*').order('purchase_date',{ascending:false});
  allPurchases=data||[];
  // Compute all-time stats (never filtered)
  const totalSpent=allPurchases.reduce((s,p)=>s+(p.total||0),0);
  const trips=allPurchases.length;
  const avg=trips>0?totalSpent/trips:0;
  document.getElementById('pur-stat-total').textContent='$'+totalSpent.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
  document.getElementById('pur-stat-trips').textContent=trips;
  document.getElementById('pur-stat-avg').textContent='$'+avg.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
  renderPurchaseList();
}

function renderPurchaseList() {
  const list=document.getElementById('purchaseList');
  const now=new Date();
  const filtered=allPurchases.filter(p=>{
    if (purchasesFilter==='all') return true;
    if (!p.purchase_date) return false;
    const d=new Date(p.purchase_date+'T00:00:00');
    if (purchasesFilter==='month') return d.getFullYear()===now.getFullYear()&&d.getMonth()===now.getMonth();
    if (purchasesFilter==='lastmonth') {
      const lm=new Date(now.getFullYear(),now.getMonth()-1,1);
      return d.getFullYear()===lm.getFullYear()&&d.getMonth()===lm.getMonth();
    }
    return true;
  });
  if (!filtered.length) {list.innerHTML=emptyState('🛒','No purchases in this period.');return;}
  list.innerHTML=filtered.map(p=>{
    const parts=[];
    if (p.pickets) parts.push(p.pickets+' pickets');
    if (p.twobytwo) parts.push(p.twobytwo+' 2×2s');
    if (p.twobyfour) parts.push(p.twobyfour+' 2×4s');
    return `<div style="background:var(--card-bg, white);border:2px solid var(--warm-gray);border-radius:12px;padding:14px 16px;display:flex;align-items:center;gap:12px;margin-bottom:10px">
      <span style="font-size:18px">🛒</span>
      <div style="flex:1"><div style="font-size:14px;font-weight:500">${p.store||'Lowes'} — ${p.purchase_date||''}</div><div style="font-size:12px;color:var(--text-muted);font-family:'DM Mono',monospace">${parts.join(' · ')}${p.notes?' · '+p.notes:''}</div></div>
      <div style="font-family:'DM Mono',monospace;font-size:17px;font-weight:500;color:var(--navy)">$${(p.total||0).toFixed(2)}</div>
      <button class="icon-btn" onclick="editPurchase(${JSON.stringify(p).replace(/"/g,'&quot;')})">✏️</button>
      <button class="icon-btn" onclick="deletePurchase('${p.id}')">🗑️</button>
    </div>`;
  }).join('');
}
```

- [ ] **Step 4: Verify stats and filter in browser**

Navigate to Materials → Purchases tab. Confirm:
- Stats cards show real all-time totals
- Clicking "This Month" filters the list to the current month only; stats stay the same
- Clicking "Last Month" filters to previous month; stats stay the same
- Clicking "All Time" shows everything
- When a filter returns no rows, the empty state message reads "No purchases in this period."
- Stats show "$0.00", "0", "$0.00" when there are no purchases

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat: add all-time stat cards and time filter tabs to Purchases tab"
```

---

## Chunk 3: Purchases — edit (pencil) icon

### Task 5: Add IDs to purchase modal elements

**Files:**
- Modify: `index.html:1802` (purchase modal `<h2>`)
- Modify: `index.html:1825` (purchase modal save button)

- [ ] **Step 1: Add `id` to the modal `<h2>`**

Find line 1802:
```html
<h2>Log Lowes Run</h2>
```
Replace with:
```html
<h2 id="purchModalTitle">Log Lowes Run</h2>
```

- [ ] **Step 2: Add `id` to the save button**

Find line 1825:
```html
<button class="modal-btn-primary" onclick="savePurchase()">Save</button>
```
Replace with:
```html
<button class="modal-btn-primary" id="purchSaveBtn" onclick="savePurchase()">Save</button>
```

---

### Task 6: Add `editingPurchaseId` state and update `openPurchaseModal()`

**Files:**
- Modify: `index.html` JS section — near `editingSaleId` declaration (line ~3066) and `openPurchaseModal()` (line ~3206)

- [ ] **Step 1: Add `editingPurchaseId` module-level variable**

Find (around line 3066):
```js
let editingSaleId = null;
```
Add immediately after:
```js
let editingPurchaseId = null;
```

- [ ] **Step 2: Replace `openPurchaseModal()` to support edit mode**

Find `openPurchaseModal()` (around line 3206). Current code:
```js
function openPurchaseModal() {
  document.getElementById('pDate').value=new Date().toISOString().split('T')[0];
  ['pPickets','p22','p24','pNotes'].forEach(f=>document.getElementById(f).value='');
  document.getElementById('pStore').value='Lowes';
  updatePurchEst();
  openModal('purchaseModal');
}
```

Replace with:
```js
function openPurchaseModal(item=null) {
  editingPurchaseId=item?item.id:null;
  document.getElementById('purchModalTitle').textContent=item?'Edit Purchase':'Log Lowes Run';
  document.getElementById('purchSaveBtn').textContent=item?'Update':'Save';
  if (item) {
    document.getElementById('pDate').value=item.purchase_date||'';
    document.getElementById('pStore').value=item.store||'Lowes';
    document.getElementById('pPickets').value=item.pickets||'';
    document.getElementById('pPP').value=item.picket_price||3.66;
    document.getElementById('p22').value=item.twobytwo||'';
    document.getElementById('p22p').value=item.twobytwo_price||3.23;
    document.getElementById('p24').value=item.twobyfour||'';
    document.getElementById('p24p').value=item.twobyfour_price||4.17;
    document.getElementById('pNotes').value=item.notes||'';
  } else {
    document.getElementById('pDate').value=new Date().toISOString().split('T')[0];
    document.getElementById('pStore').value='Lowes';
    ['pPickets','p22','p24','pNotes'].forEach(f=>document.getElementById(f).value='');
    document.getElementById('pPP').value=3.66;
    document.getElementById('p22p').value=3.23;
    document.getElementById('p24p').value=4.17;
  }
  updatePurchEst();
  openModal('purchaseModal');
}
```

- [ ] **Step 3: Add `editPurchase()` helper function**

Add a new function immediately after `openPurchaseModal()`:

```js
function editPurchase(item) {
  openPurchaseModal(item);
}
```

---

### Task 7: Update `savePurchase()` to handle edit vs. insert

**Files:**
- Modify: `index.html:3221-3238` (the `savePurchase` function)

- [ ] **Step 1: Update `savePurchase()` to branch on `editingPurchaseId`**

Find `savePurchase()` (around line 3221). Current code:

```js
async function savePurchase() {
  const pickets=parseInt(document.getElementById('pPickets').value)||0;
  const pp=parseFloat(document.getElementById('pPP').value)||3.66;
  const t22=parseInt(document.getElementById('p22').value)||0;
  const t22p=parseFloat(document.getElementById('p22p').value)||3.23;
  const t24=parseInt(document.getElementById('p24').value)||0;
  const t24p=parseFloat(document.getElementById('p24p').value)||4.17;
  if (!pickets&&!t22&&!t24) {showToast('Enter at least one material','error');return;}
  const total=pickets*pp+t22*t22p+t24*t24p;
  const payload={purchase_date:document.getElementById('pDate').value,store:document.getElementById('pStore').value,pickets,picket_price:pp,twobytwo:t22,twobytwo_price:t22p,twobyfour:t24,twobyfour_price:t24p,total,notes:document.getElementById('pNotes').value};
  const {error}=await sb.from('purchases').insert(payload);
  if (error) {showToast('Error saving','error');return;}
  // Update stock
  await sb.from('stock').update({qty:Math.max(0,(stockData.pickets||0)+pickets)}).eq('material','pickets');
  await sb.from('stock').update({qty:Math.max(0,(stockData.twobytwo||0)+t22)}).eq('material','twobytwo');
  await sb.from('stock').update({qty:Math.max(0,(stockData.twobyfour||0)+t24)}).eq('material','twobyfour');
  showToast('Purchase logged & stock updated!','success');
  closeModal('purchaseModal'); loadStock(); loadPurchases();
}
```

Replace with:

```js
async function savePurchase() {
  const pickets=parseInt(document.getElementById('pPickets').value)||0;
  const pp=parseFloat(document.getElementById('pPP').value)||3.66;
  const t22=parseInt(document.getElementById('p22').value)||0;
  const t22p=parseFloat(document.getElementById('p22p').value)||3.23;
  const t24=parseInt(document.getElementById('p24').value)||0;
  const t24p=parseFloat(document.getElementById('p24p').value)||4.17;
  if (!pickets&&!t22&&!t24) {showToast('Enter at least one material','error');return;}
  const total=pickets*pp+t22*t22p+t24*t24p;
  const payload={purchase_date:document.getElementById('pDate').value,store:document.getElementById('pStore').value,pickets,picket_price:pp,twobytwo:t22,twobytwo_price:t22p,twobyfour:t24,twobyfour_price:t24p,total,notes:document.getElementById('pNotes').value};
  if (editingPurchaseId) {
    const {error}=await sb.from('purchases').update(payload).eq('id',editingPurchaseId);
    if (error) {showToast('Error saving','error');return;}
    showToast('Purchase updated!','success');
    editingPurchaseId=null;
    closeModal('purchaseModal'); loadPurchases();
  } else {
    const {error}=await sb.from('purchases').insert(payload);
    if (error) {showToast('Error saving','error');return;}
    // Update stock only on new purchases
    await sb.from('stock').update({qty:Math.max(0,(stockData.pickets||0)+pickets)}).eq('material','pickets');
    await sb.from('stock').update({qty:Math.max(0,(stockData.twobytwo||0)+t22)}).eq('material','twobytwo');
    await sb.from('stock').update({qty:Math.max(0,(stockData.twobyfour||0)+t24)}).eq('material','twobyfour');
    showToast('Purchase logged & stock updated!','success');
    closeModal('purchaseModal'); loadStock(); loadPurchases();
  }
}
```

- [ ] **Step 2: Verify edit flow end-to-end in browser**

Navigate to Materials → Purchases tab. Confirm:
- Each purchase row shows both ✏️ and 🗑️ buttons
- Clicking ✏️ opens the modal titled "Edit Purchase" with all fields pre-filled
- The save button reads "Update"
- Changing a field and clicking Update shows "Purchase updated!" toast and refreshes the list
- The record is updated in Supabase (verify by refreshing the page)
- Stats update after edit to reflect the new total
- Clicking "+ Log Purchase" still opens the modal titled "Log Lowes Run" with blank fields and the save button reads "Save" — original behavior intact
- Stock is NOT adjusted when editing (check the Stock tab to confirm no changes)

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add edit (pencil) icon to Purchases log"
```

---

## Chunk 4: Final verification and push

- [ ] **Step 1: Full smoke test**

Go through every modified surface:

1. **Ready to Sell tab**
   - Stats show correct item count and total value
   - Add an item → stats update
   - Remove an item → stats update
   - Empty inventory → stats show "0" / "$0"

2. **Purchases tab — stats**
   - All-time totals are correct
   - Stats do not change when switching filters

3. **Purchases tab — filter**
   - This Month / Last Month / All Time each filter the list correctly
   - Empty filter periods show "No purchases in this period."
   - Filter state persists if you switch to another tab and come back

4. **Purchases tab — edit**
   - Pencil icon pre-fills all fields correctly
   - Modal title and button label switch for edit vs. add mode
   - Update saves to Supabase without touching stock
   - Log Purchase still works normally (insert + stock update)

- [ ] **Step 2: Push to GitHub Pages**

```bash
git push origin main
```

Wait ~60 seconds, then verify at `https://kjakupak93.github.io/rmk-crafted`.
