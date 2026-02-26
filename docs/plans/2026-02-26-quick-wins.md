# Quick Wins Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement three quality-of-life improvements: a styled confirm modal replacing all native browser confirms, a "Create Order" button in the quote results, and a bulk "Mark all paid" action on the orders page.

**Architecture:** All changes are in the single `index.html` file. No new files needed. Each feature is independent and can be implemented and committed separately. No build step — edit and verify in browser.

**Tech Stack:** Vanilla HTML/CSS/JS, Supabase JS client (`sb`), existing modal infrastructure (`.modal-overlay`, `closeModal(id)`).

---

### Task 1: Add styled confirm modal HTML + JS helper

**Files:**
- Modify: `index.html` lines 1401–1402 (after last modal `#windowModal`, before `<script>` tag)
- Modify: `index.html` around line 1490 (after `closeModal` helper, before `fmtTime`)

**Step 1: Add the confirm modal HTML**

Find this exact line (line 1401–1402):
```html
</div>

<script>
```

Insert the following between `</div>` and `<script>`:

```html

<!-- Confirm modal -->
<div class="modal-overlay" id="confirmModal">
  <div class="modal" style="max-width:380px;text-align:center;">
    <div style="font-size:36px;margin-bottom:8px">⚠️</div>
    <p id="confirmMsg" style="font-size:15px;color:var(--text);margin-bottom:24px;line-height:1.5"></p>
    <div class="modal-actions">
      <button class="modal-btn-cancel" onclick="closeModal('confirmModal')">Cancel</button>
      <button id="confirmOkBtn" class="modal-btn-primary" style="background:var(--red)">Delete</button>
    </div>
  </div>
</div>

<!-- Mark paid modal -->
<div class="modal-overlay" id="markPaidModal">
  <div class="modal" style="max-width:340px;text-align:center;">
    <h2 style="margin-bottom:6px">Mark All Unpaid as Paid</h2>
    <p style="font-size:13px;color:var(--text-muted);margin-bottom:20px">Choose payment method for all unpaid active orders.</p>
    <div style="display:flex;gap:10px">
      <button class="modal-btn-primary" style="flex:1" onclick="markAllPaid('cash')">💵 Cash</button>
      <button class="modal-btn-primary" style="flex:1;background:var(--ocean)" onclick="markAllPaid('venmo')">📱 Venmo</button>
    </div>
    <div style="margin-top:10px">
      <button class="modal-btn-cancel" style="width:100%" onclick="closeModal('markPaidModal')">Cancel</button>
    </div>
  </div>
</div>
```

**Step 2: Add the `showConfirm` JS helper**

Find this exact line (around line 1490):
```js
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
```

Insert immediately after it:

```js
function showConfirm(message, onConfirm, okLabel='Delete') {
  document.getElementById('confirmMsg').textContent = message;
  const btn = document.getElementById('confirmOkBtn');
  btn.textContent = okLabel;
  btn.onclick = () => { closeModal('confirmModal'); onConfirm(); };
  document.getElementById('confirmModal').classList.add('open');
}
```

**Step 3: Verify in browser**

Open `index.html`. Confirm:
- `#confirmModal` exists in the DOM (inspect element)
- `#markPaidModal` exists in the DOM
- `showConfirm` is defined (type it in the browser console — should not say "not defined")
- Nothing on screen has changed visually

**Step 4: Commit**

```bash
git add index.html
git commit -m "feat: add confirm modal HTML and showConfirm() helper"
```

---

### Task 2: Replace all native `confirm()` calls with `showConfirm()`

**Files:**
- Modify: `index.html` — 8 async delete/adjust functions

**Context:** There are 8 places in the file that use native `window.confirm()`. Each needs to be converted to use `showConfirm()`. The pattern changes from a synchronous guard to an async callback — the code that runs after confirmation moves into the `onConfirm` callback.

**Step 1: Replace `deleteOrder`**

Find (around line 1819):
```js
async function deleteOrder(id) {
  if (!confirm('Delete this order?')) return;
  await sb.from('orders').delete().eq('id',id);
  showToast('Order deleted');
  loadOrders(); loadHomeStats();
}
```

Replace with:
```js
async function deleteOrder(id) {
  showConfirm('Delete this order?', async () => {
    await sb.from('orders').delete().eq('id',id);
    showToast('Order deleted');
    loadOrders(); loadHomeStats();
  });
}
```

**Step 2: Replace `deleteInvItem`**

Find (around line 1878):
```js
async function deleteInvItem(id) {
  if (!confirm('Remove this item?')) return;
  await sb.from('inventory').delete().eq('id',id);
  showToast('Removed'); loadInventory(); loadHomeStats();
}
```

Replace with:
```js
async function deleteInvItem(id) {
  showConfirm('Remove this inventory item?', async () => {
    await sb.from('inventory').delete().eq('id',id);
    showToast('Removed'); loadInventory(); loadHomeStats();
  });
}
```

**Step 3: Replace the `adjustInvQty` confirm (qty=0 branch)**

Find (around line 1870):
```js
async function adjustInvQty(id, currentQty, delta) {
  const newQty=Math.max(0,currentQty+delta);
  if (newQty===0 && !confirm('Quantity is 0. Remove item?')) return;
  if (newQty===0) { await sb.from('inventory').delete().eq('id',id); }
  else { await sb.from('inventory').update({qty:newQty}).eq('id',id); }
  loadInventory(); loadHomeStats();
}
```

Replace with:
```js
async function adjustInvQty(id, currentQty, delta) {
  const newQty=Math.max(0,currentQty+delta);
  if (newQty===0) {
    showConfirm('Quantity is 0. Remove this item?', async () => {
      await sb.from('inventory').delete().eq('id',id);
      loadInventory(); loadHomeStats();
    }, 'Remove');
    return;
  }
  await sb.from('inventory').update({qty:newQty}).eq('id',id);
  loadInventory(); loadHomeStats();
}
```

**Step 4: Replace `deleteSale`**

Find (around line 1921):
```js
async function deleteSale(id) {
  if (!confirm('Delete this sale record?')) return;
  await sb.from('sales').delete().eq('id',id);
  showToast('Deleted'); loadSales();
}
```

Replace with:
```js
async function deleteSale(id) {
  showConfirm('Delete this sale record?', async () => {
    await sb.from('sales').delete().eq('id',id);
    showToast('Deleted'); loadSales();
  });
}
```

**Step 5: Replace `deletePurchase`**

Find (around line 2025):
```js
async function deletePurchase(id) {
  if (!confirm('Delete this purchase?')) return;
  await sb.from('purchases').delete().eq('id',id);
  showToast('Deleted'); loadPurchases(); loadStock();
}
```

Replace with:
```js
async function deletePurchase(id) {
  showConfirm('Delete this purchase record?', async () => {
    await sb.from('purchases').delete().eq('id',id);
    showToast('Deleted'); loadPurchases(); loadStock();
  });
}
```

**Step 6: Replace `deleteSlot`**

Find (around line 2114):
```js
async function deleteSlot(id) {
  if (!confirm('Remove this slot?')) return;
  await sb.from('schedule_slots').delete().eq('id',id);
  showToast('Slot removed'); loadDayDetail(); renderCalendar();
}
```

Replace with:
```js
async function deleteSlot(id) {
  showConfirm('Remove this time slot?', async () => {
    await sb.from('schedule_slots').delete().eq('id',id);
    showToast('Slot removed'); loadDayDetail(); renderCalendar();
  }, 'Remove');
}
```

**Step 7: Replace `deleteBooking`**

Find (around line 2120):
```js
async function deleteBooking(id) {
  if (!confirm('Remove this booking?')) return;
  await sb.from('schedule_bookings').delete().eq('id',id);
  showToast('Booking removed'); loadDayDetail(); renderCalendar(); loadUpcoming();
}
```

Replace with:
```js
async function deleteBooking(id) {
  showConfirm('Remove this booking?', async () => {
    await sb.from('schedule_bookings').delete().eq('id',id);
    showToast('Booking removed'); loadDayDetail(); renderCalendar(); loadUpcoming();
  }, 'Remove');
}
```

**Step 8: Replace `deleteWindow`**

Find (around line 2219):
```js
async function deleteWindow(id) {
  if (!confirm('Remove this window?')) return;
  await sb.from('availability_windows').delete().eq('id',id);
  showToast('Removed'); loadWindows();
}
```

Replace with:
```js
async function deleteWindow(id) {
  showConfirm('Remove this availability window?', async () => {
    await sb.from('availability_windows').delete().eq('id',id);
    showToast('Removed'); loadWindows();
  }, 'Remove');
}
```

**Step 9: Verify — grep for remaining native confirms**

Run:
```bash
grep -n "confirm(" index.html
```

Expected output: **zero lines** containing `confirm(`. If any remain, fix them.

**Step 10: Verify in browser**

Open `index.html`, navigate to Orders. Click the 🗑️ delete button on an order. You should see the styled navy/white modal (not the browser's native confirm dialog). Click Cancel — nothing should be deleted. Click Delete — order should be deleted.

**Step 11: Commit**

```bash
git add index.html
git commit -m "feat: replace native confirm() dialogs with styled confirm modal"
```

---

### Task 3: Create order from quote button

**Files:**
- Modify: `index.html` — `#qResults` section (around line 1005) and JS section (after `resetQuote`, around line 1721)

**Step 1: Add the button to the quote results HTML**

Find this exact block (around line 1005–1006):
```html
      <button style="width:100%;padding:12px;background:transparent;color:var(--text-muted);border:2px solid var(--warm-gray);border-radius:10px;font-size:14px;cursor:pointer;margin-top:4px" onclick="resetQuote()">← New quote</button>
    </div>
  </div>
```

Replace with:
```html
      <button style="width:100%;padding:12px;background:transparent;color:var(--text-muted);border:2px solid var(--warm-gray);border-radius:10px;font-size:14px;cursor:pointer;margin-top:4px" onclick="resetQuote()">← New quote</button>
      <button class="btn-primary" style="width:100%;padding:13px;margin-top:8px;font-size:15px;justify-content:center" onclick="createOrderFromQuote()">📋 Create Order from This Quote</button>
    </div>
  </div>
```

**Step 2: Add the `createOrderFromQuote` JS function**

Find this exact function (around line 1716):
```js
function resetQuote() {
```

Insert the following immediately before `resetQuote()`:

```js
function createOrderFromQuote() {
  const l = document.getElementById('dimL').value;
  const w = document.getElementById('dimW').value;
  const h = document.getElementById('dimH').value;
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

**Step 3: Verify in browser**

Open `index.html`, go to Quote Calculator. Enter dimensions (e.g. 36, 16, 16), enter picket count (e.g. 6), click "Calculate Quote →". In the results section, click "📋 Create Order from This Quote". The order modal should open with:
- Size pre-filled as `36×16×16`
- Style pre-filled as `Standard` (or `Vertical` if selected)
- Price pre-filled with the calculated amount
- Name, contact, notes blank

**Step 4: Commit**

```bash
git add index.html
git commit -m "feat: add create order from quote button"
```

---

### Task 4: Mark all paid button and bulk update

**Files:**
- Modify: `index.html` — orders page section header (around line 1024–1027) and `loadOrders()` + new functions in JS

**Step 1: Add the button to the orders page HTML**

Find this exact block (around line 1024–1027):
```html
      <div class="section-header">
        <h2>Active Orders</h2>
        <button class="btn-primary" onclick="openOrderModal()">+ New Order</button>
      </div>
```

Replace with:
```html
      <div class="section-header">
        <h2>Active Orders</h2>
        <div style="display:flex;gap:8px;align-items:center">
          <button id="markPaidBtn" class="btn-secondary" style="display:none" onclick="openMarkPaidModal()">Mark all paid</button>
          <button class="btn-primary" onclick="openOrderModal()">+ New Order</button>
        </div>
      </div>
```

**Step 2: Update `loadOrders()` to show/hide the button**

Find this line inside `loadOrders()` (around line 1739):
```js
  document.getElementById('os-value').textContent='$'+active.reduce((s,o)=>s+(o.price||0),0).toFixed(0);
```

Insert immediately after it:
```js
  const unpaidCount = active.filter(o => o.payment === 'unpaid').length;
  document.getElementById('markPaidBtn').style.display = unpaidCount > 0 ? '' : 'none';
```

**Step 3: Add `openMarkPaidModal` and `markAllPaid` JS functions**

Find this function (around line 1826):
```js
function filterOrders(f,btn) {
```

Insert immediately before it:

```js
function openMarkPaidModal() {
  document.getElementById('markPaidModal').classList.add('open');
}

async function markAllPaid(method) {
  closeModal('markPaidModal');
  const { error } = await sb.from('orders')
    .update({ payment: method })
    .eq('payment', 'unpaid')
    .neq('status', 'completed');
  if (error) { showToast('Error updating orders', 'error'); return; }
  showToast(`All unpaid orders marked as ${method}!`, 'success');
  loadOrders(); loadHomeStats();
}

```

**Step 4: Verify in browser**

Open `index.html`, go to Orders. If there are unpaid orders, a "Mark all paid" button should appear next to "New Order". Click it — the `#markPaidModal` should open with Cash and Venmo buttons. Click one — all unpaid active orders should update and the toast should show. The button should disappear after (since no more unpaid orders). Verify the button does NOT appear if all orders are already paid.

**Step 5: Commit**

```bash
git add index.html
git commit -m "feat: add mark all paid bulk action to orders page"
```

---

## Done

All three quick wins complete:
- Styled confirm modal replaces all 8 native `confirm()` calls
- "Create Order from Quote" button pre-fills the order modal from calculator results
- "Mark all paid" bulk action appears on orders page when unpaid orders exist
