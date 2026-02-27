# Multi-Item Orders Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow a single order to contain multiple line items (different sizes and/or quantities) for the same customer.

**Architecture:** Add an `items` JSONB column to the `orders` table. The order modal gets a dynamic line-items UI replacing the static Size/Style/Price fields. The order's top-level `price` and `size` fields stay populated (derived from items) so all existing stats, overdue logic, and the sales log remain unchanged.

**Tech Stack:** Vanilla HTML/CSS/JS, Supabase JS client (`sb`), single `index.html` file.

---

### Task 1: Add `items` column in Supabase + add CSS for item rows

**Files:**
- Supabase SQL editor (one-time migration)
- Modify: `index.html` — CSS block around line 766 (after `.form-row`)

**Step 1: Run migration in Supabase SQL Editor**

In your Supabase dashboard → SQL Editor, run:
```sql
ALTER TABLE orders ADD COLUMN items JSONB;
```

**Step 2: Add CSS for item rows**

Find this line (around line 766):
```css
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
```

Insert immediately after it:
```css
.order-items { display:flex; flex-direction:column; gap:6px; margin-bottom:4px; }
.order-item-row { display:flex; gap:6px; align-items:center; }
.order-item-row .item-size { flex:2; min-width:0; }
.order-item-row .item-style { flex:1; min-width:0; }
.order-item-row .item-qty { flex:0 0 54px; }
.order-item-row .item-price { flex:0 0 72px; }
.order-items-total { text-align:right; font-size:13px; color:var(--text-muted); padding:2px 0 6px; }
.order-items-total strong { color:var(--navy); font-family:'DM Mono',monospace; }
```

**Step 3: Verify**

Grep for `.order-item-row` — should appear in the CSS block.

**Step 4: Commit**
```bash
git add index.html
git commit -m "feat: add CSS for multi-item order rows"
```

---

### Task 2: Replace order modal HTML with line-items section

**Files:**
- Modify: `index.html` — `#orderModal` HTML (lines 1227–1234)

**Step 1: Replace the Size/Style and Price/Payment rows**

Find this exact block (lines 1227–1234):
```html
    <div class="form-row">
      <div class="form-group"><label>Size (e.g. 48×16×16)</label><input class="form-control" type="text" id="oSize" placeholder="48×16×16"></div>
      <div class="form-group"><label>Style</label><select class="form-control" id="oStyle"><option>Standard</option><option>Vertical</option></select></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Price ($)</label><input class="form-control" type="number" id="oPrice" placeholder="85"></div>
      <div class="form-group"><label>Payment</label><select class="form-control" id="oPayment"><option value="unpaid">Not collected</option><option value="cash">Cash</option><option value="venmo">Venmo</option></select></div>
    </div>
```

Replace with:
```html
    <div class="form-group">
      <label>Items <span style="font-size:11px;color:var(--text-muted);font-weight:400">(Size · Style · Qty · Price)</span></label>
      <div id="oItemsContainer" class="order-items"></div>
      <button type="button" class="btn-secondary" style="font-size:12px;padding:5px 10px;margin-top:2px" onclick="addOrderItem()">+ Add Item</button>
      <div class="order-items-total">Total: <strong id="oItemsTotal">$0</strong></div>
    </div>
    <div class="form-group"><label>Payment</label><select class="form-control" id="oPayment"><option value="unpaid">Not collected</option><option value="cash">Cash</option><option value="venmo">Venmo</option></select></div>
```

**Step 2: Verify**

- Grep for `id="oItemsContainer"` — should appear once
- Grep for `id="oItemsTotal"` — should appear once
- Grep for `id="oSize"` — should return NO results (removed)
- Grep for `id="oPrice"` — should return NO results (removed)

**Step 3: Commit**
```bash
git add index.html
git commit -m "feat: replace order modal size/price fields with line-items section"
```

---

### Task 3: Add JS helper functions for line items

**Files:**
- Modify: `index.html` — insert before `function filterOrders` (line 1980)

**Step 1: Insert the four helper functions**

Find:
```js
function filterOrders(f,btn) {
```

Insert immediately before it:
```js
function addOrderItem(size='', style='Standard', qty=1, price='') {
  const container = document.getElementById('oItemsContainer');
  const row = document.createElement('div');
  row.className = 'order-item-row';
  row.innerHTML = `
    <input class="form-control item-size" type="text" placeholder="36×16×16" value="${size}" style="flex:2;min-width:0" oninput="updateOrderTotal()">
    <select class="form-control item-style" style="flex:1;min-width:0" onchange="updateOrderTotal()">
      <option${style==='Standard'?' selected':''}>Standard</option>
      <option${style==='Vertical'?' selected':''}>Vertical</option>
    </select>
    <input class="form-control item-qty" type="number" min="1" value="${qty}" placeholder="1" style="flex:0 0 54px" oninput="updateOrderTotal()">
    <input class="form-control item-price" type="number" min="0" value="${price}" placeholder="$" style="flex:0 0 72px" oninput="updateOrderTotal()">
    <button type="button" class="icon-btn" onclick="removeOrderItem(this)" title="Remove item">🗑️</button>`;
  container.appendChild(row);
  updateRemoveButtons();
  updateOrderTotal();
}

function removeOrderItem(btn) {
  const container = document.getElementById('oItemsContainer');
  if (container.children.length <= 1) return;
  btn.closest('.order-item-row').remove();
  updateRemoveButtons();
  updateOrderTotal();
}

function updateRemoveButtons() {
  const rows = document.querySelectorAll('#oItemsContainer .order-item-row');
  rows.forEach(row => {
    row.querySelector('.icon-btn').style.visibility = rows.length > 1 ? '' : 'hidden';
  });
}

function updateOrderTotal() {
  const rows = document.querySelectorAll('#oItemsContainer .order-item-row');
  let total = 0;
  rows.forEach(row => {
    const qty = parseInt(row.querySelector('.item-qty').value) || 1;
    const price = parseFloat(row.querySelector('.item-price').value) || 0;
    total += qty * price;
  });
  document.getElementById('oItemsTotal').textContent = '$' + total.toFixed(0);
}

function getOrderItems() {
  const rows = document.querySelectorAll('#oItemsContainer .order-item-row');
  return Array.from(rows).map(row => ({
    size: row.querySelector('.item-size').value.trim(),
    style: row.querySelector('.item-style').value,
    qty: parseInt(row.querySelector('.item-qty').value) || 1,
    price: parseFloat(row.querySelector('.item-price').value) || 0
  }));
}

```

**Step 2: Verify**

- Grep for `function addOrderItem` — should appear once
- Grep for `function getOrderItems` — should appear once

**Step 3: Commit**
```bash
git add index.html
git commit -m "feat: add addOrderItem, removeOrderItem, updateOrderTotal, getOrderItems helpers"
```

---

### Task 4: Update openOrderModal, editOrder, saveOrder, createOrderFromQuote

**Files:**
- Modify: `index.html` — four JS functions (lines ~1875–1912 and ~1795–1812)

**Step 1: Replace `openOrderModal`**

Find:
```js
function openOrderModal() {
  document.getElementById('orderModalTitle').textContent='New Order';
  document.getElementById('editOrderId').value='';
  ['oName','oContact','oSize','oNotes'].forEach(f=>document.getElementById(f).value='');
  document.getElementById('oPrice').value='';
  document.getElementById('oPickup').value='';
  document.getElementById('oStyle').value='Standard';
  document.getElementById('oPayment').value='unpaid';
  document.getElementById('oStatus').value='pending';
  document.getElementById('orderModal').classList.add('open');
}
```

Replace with:
```js
function openOrderModal() {
  document.getElementById('orderModalTitle').textContent='New Order';
  document.getElementById('editOrderId').value='';
  ['oName','oContact','oNotes'].forEach(f=>document.getElementById(f).value='');
  document.getElementById('oPickup').value='';
  document.getElementById('oPayment').value='unpaid';
  document.getElementById('oStatus').value='pending';
  document.getElementById('oItemsContainer').innerHTML='';
  addOrderItem();
  document.getElementById('orderModal').classList.add('open');
}
```

**Step 2: Replace `editOrder`**

Find:
```js
async function editOrder(id) {
  const {data} = await sb.from('orders').select('*').eq('id',id).single();
  if (!data) return;
  document.getElementById('orderModalTitle').textContent='Edit Order';
  document.getElementById('editOrderId').value=id;
  document.getElementById('oName').value=data.name||'';
  document.getElementById('oContact').value=data.contact||'';
  document.getElementById('oSize').value=data.size||'';
  document.getElementById('oStyle').value=data.style||'Standard';
  document.getElementById('oPrice').value=data.price||'';
  document.getElementById('oPayment').value=data.payment||'unpaid';
  document.getElementById('oStatus').value=data.status||'pending';
  document.getElementById('oPickup').value=data.pickup_date||'';
  document.getElementById('oNotes').value=data.notes||'';
  document.getElementById('orderModal').classList.add('open');
}
```

Replace with:
```js
async function editOrder(id) {
  const {data} = await sb.from('orders').select('*').eq('id',id).single();
  if (!data) return;
  document.getElementById('orderModalTitle').textContent='Edit Order';
  document.getElementById('editOrderId').value=id;
  document.getElementById('oName').value=data.name||'';
  document.getElementById('oContact').value=data.contact||'';
  document.getElementById('oPayment').value=data.payment||'unpaid';
  document.getElementById('oStatus').value=data.status||'pending';
  document.getElementById('oPickup').value=data.pickup_date||'';
  document.getElementById('oNotes').value=data.notes||'';
  document.getElementById('oItemsContainer').innerHTML='';
  const items = data.items && data.items.length ? data.items : [{size:data.size||'',style:data.style||'Standard',qty:1,price:data.price||0}];
  items.forEach(item => addOrderItem(item.size, item.style||'Standard', item.qty||1, item.price||0));
  document.getElementById('orderModal').classList.add('open');
}
```

**Step 3: Replace `saveOrder`**

Find:
```js
async function saveOrder() {
  const id=document.getElementById('editOrderId').value;
  const payload={name:document.getElementById('oName').value,contact:document.getElementById('oContact').value,size:document.getElementById('oSize').value,style:document.getElementById('oStyle').value,price:parseFloat(document.getElementById('oPrice').value)||0,payment:document.getElementById('oPayment').value,status:document.getElementById('oStatus').value,pickup_date:document.getElementById('oPickup').value||null,notes:document.getElementById('oNotes').value};
  if (!payload.name||!payload.size) {showToast('Name and size required','error');return;}
  const {error}=id ? await sb.from('orders').update(payload).eq('id',id) : await sb.from('orders').insert(payload);
  if (error) {showToast('Error saving order','error');console.error(error);return;}
  showToast(id?'Order updated!':'Order added!','success');
  closeModal('orderModal'); loadOrders(); loadHomeStats();
}
```

Replace with:
```js
async function saveOrder() {
  const id=document.getElementById('editOrderId').value;
  const items=getOrderItems();
  if (!document.getElementById('oName').value) {showToast('Customer name required','error');return;}
  if (!items.length||!items[0].size) {showToast('At least one item with a size is required','error');return;}
  const total=items.reduce((s,i)=>s+(i.qty*i.price),0);
  const payload={name:document.getElementById('oName').value,contact:document.getElementById('oContact').value,size:items[0].size,style:items[0].style,price:total,items:items,payment:document.getElementById('oPayment').value,status:document.getElementById('oStatus').value,pickup_date:document.getElementById('oPickup').value||null,notes:document.getElementById('oNotes').value};
  const {error}=id ? await sb.from('orders').update(payload).eq('id',id) : await sb.from('orders').insert(payload);
  if (error) {showToast('Error saving order','error');console.error(error);return;}
  showToast(id?'Order updated!':'Order added!','success');
  closeModal('orderModal'); loadOrders(); loadHomeStats();
}
```

**Step 4: Replace `createOrderFromQuote`**

Find:
```js
function createOrderFromQuote() {
  const l = document.getElementById('dimL').value;
  const w = document.getElementById('dimW').value;
  const h = document.getElementById('dimH').value;
  if (!l || !w || !h) { showToast('Please calculate a quote first', 'error'); return; }
  const size = `${l}×${w}×${h}`;
  const price = getQuotePrice();
  document.getElementById('orderModalTitle').textContent = 'New Order';
  document.getElementById('editOrderId').value = '';
  ['oName','oContact','oNotes'].forEach(f => document.getElementById(f).value = '');
  document.getElementById('oPickup').value = '';
  document.getElementById('oSize').value = size;
  document.getElementById('oStyle').value = currentStyle;
  document.getElementById('oPrice').value = price;
  document.getElementById('oPayment').value = 'unpaid';
  document.getElementById('oStatus').value = 'pending';
  document.getElementById('orderModal').classList.add('open');
}
```

Replace with:
```js
function createOrderFromQuote() {
  const l = document.getElementById('dimL').value;
  const w = document.getElementById('dimW').value;
  const h = document.getElementById('dimH').value;
  if (!l || !w || !h) { showToast('Please calculate a quote first', 'error'); return; }
  const size = `${l}×${w}×${h}`;
  const price = getQuotePrice();
  document.getElementById('orderModalTitle').textContent = 'New Order';
  document.getElementById('editOrderId').value = '';
  ['oName','oContact','oNotes'].forEach(f => document.getElementById(f).value = '');
  document.getElementById('oPickup').value = '';
  document.getElementById('oPayment').value = 'unpaid';
  document.getElementById('oStatus').value = 'pending';
  document.getElementById('oItemsContainer').innerHTML = '';
  addOrderItem(size, currentStyle, 1, price);
  document.getElementById('orderModal').classList.add('open');
}
```

**Step 5: Verify**

- Grep for `oSize` — should return NO results (all references removed)
- Grep for `oPrice` — should return NO results
- Grep for `getOrderItems` — should appear in `saveOrder` and the helper function definition

**Step 6: Commit**
```bash
git add index.html
git commit -m "feat: update order modal functions for multi-item support"
```

---

### Task 5: Update orderCardHTML for multi-item display

**Files:**
- Modify: `index.html` — `orderCardHTML()` function (lines ~1846–1873)

**Step 1: Replace `orderCardHTML`**

Find:
```js
function orderCardHTML(o) {
  const bc={pending:'badge-pending',building:'badge-building',ready:'badge-ready',completed:'badge-completed'}[o.status]||'';
  const bl={pending:'Pending',building:'Building',ready:'Ready',completed:'Complete'}[o.status]||o.status;
  const pc={cash:'badge-cash',venmo:'badge-venmo',unpaid:'badge-unpaid'}[o.payment]||'badge-unpaid';
  const pl={cash:'Cash',venmo:'Venmo',unpaid:'Unpaid'}[o.payment]||'';
  const pickup=o.pickup_date?`📅 ${o.pickup_date}`:'';
  const isOverdue = o.status!=='completed' && o.pickup_date && o.pickup_date < todayKey();
  const overdueClass = isOverdue ? ' s-overdue' : '';
  const overdueBadge = isOverdue ? `<span class="badge badge-overdue">Overdue</span>` : '';
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
  const overdueBadge = isOverdue ? `<span class="badge badge-overdue">Overdue</span>` : '';
  const itemLines = o.items && o.items.length
    ? o.items.map(i=>`${i.qty>1?i.qty+'× ':''}${i.size||''}" — ${i.style||'Standard'}`)
    : [`${o.size||''}" — ${o.style||'Standard'}`];
  const hasMultiple = itemLines.length > 1;
  const subtitle = itemLines.join('<br>') + (o.contact?(hasMultiple?'<br>':'·')+o.contact:'');
  return `<div class="order-card s-${o.status}${overdueClass}">
    <div class="card-top">
      <div><div class="card-title">${o.name}</div><div class="card-subtitle">${subtitle}</div></div>
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

**Step 2: Verify**

- Grep for `itemLines` — should appear in `orderCardHTML`
- Grep for `o.items` — should appear in `orderCardHTML` and `editOrder`

**Step 3: Commit**
```bash
git add index.html
git commit -m "feat: update order card to display multi-item orders"
```

---

## Done

All five tasks complete:
- `items` JSONB column added to `orders` table
- Order modal has a dynamic line-items UI with Add/Remove rows and auto-computed total
- Existing single-item orders display and edit correctly (backward compatible)
- Multi-item orders show each item on its own line on the card
- Quote → Order flow pre-fills one item row from the calculator
