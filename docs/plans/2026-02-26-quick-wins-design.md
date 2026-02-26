# Quick Wins Design Doc
**Date:** 2026-02-26

## Features
Three independent quality-of-life improvements to index.html:
1. Create order from quote
2. Styled confirm modal (replaces all native `confirm()` calls)
3. Mark all orders as paid (bulk action)

---

## Feature 1: Create Order From Quote

### Trigger
After `calculateQuote()` runs and `#qResults` is visible, a "Create Order →" button appears below the existing "← New quote" button in the results section.

### Behavior
- Calls a new `createOrderFromQuote()` function
- Pre-fills the order modal fields:
  - `#oSize` → formatted as `"L×W×H"` from `dimL`, `dimW`, `dimH` inputs
  - `#oStyle` → `currentStyle` (Standard or Vertical)
  - `#oPrice` → result of `getQuotePrice()`
  - `#oStatus` → defaults to "pending"
  - `#oPayment` → defaults to "unpaid"
  - Name, contact, pickup date, notes → left blank
- Opens `#orderModal` (reuses existing `openOrderModal` infrastructure)
- No page navigation; user saves order as normal

### HTML change
Add button after "← New quote" button inside `#qResults`:
```html
<button onclick="createOrderFromQuote()" class="btn-primary" style="width:100%;margin-top:8px">
  Create Order →
</button>
```

---

## Feature 2: Styled Confirm Modal

### Replaces
All native `window.confirm()` calls across the app:
- `deleteOrder(id)`
- `deleteInvItem(id)`
- `adjustInvQty` (qty === 0 branch)
- `deleteSale(id)`
- `deletePurchase(id)`
- `deleteSlot(id)`
- `deleteBooking(id)`
- `deleteWindow(id)`

### New HTML element
A single reusable modal `#confirmModal` added to the modals section:
```html
<div class="modal-overlay" id="confirmModal">
  <div class="modal" style="max-width:380px">
    <div style="font-size:32px;text-align:center;margin-bottom:8px">⚠️</div>
    <h2 id="confirmMsg" style="text-align:center;font-size:16px;font-weight:500;margin-bottom:20px"></h2>
    <div class="modal-actions">
      <button class="modal-btn-cancel" onclick="closeModal('confirmModal')">Cancel</button>
      <button id="confirmOkBtn" class="modal-btn-primary" style="background:var(--red)">Delete</button>
    </div>
  </div>
</div>
```

### New JS function
```js
function showConfirm(message, onConfirm, okLabel='Delete') {
  document.getElementById('confirmMsg').textContent = message;
  const btn = document.getElementById('confirmOkBtn');
  btn.textContent = okLabel;
  btn.onclick = () => { closeModal('confirmModal'); onConfirm(); };
  document.getElementById('confirmModal').classList.add('open');
}
```

### Conversion pattern
Before: `if (!confirm('Delete this order?')) return;`
After: `showConfirm('Delete this order?', () => { /* rest of delete logic */ });`

Each delete function body moves into the callback of `showConfirm`.

---

## Feature 3: Mark All as Paid

### Trigger
On the Orders page, a "Mark all paid" button appears in the section header when there are active orders with `payment === 'unpaid'`. Button is hidden when no unpaid orders exist.

### Behavior
- Uses `showConfirm` with a custom ok label and a payment method choice
- Actually: opens a small dedicated `#markPaidModal` with two buttons: "Cash" and "Venmo"
- On selection, bulk-updates all active orders where `payment = 'unpaid'` using Supabase `update().eq('payment','unpaid').neq('status','completed')`
- Shows success toast, refreshes `loadOrders()` and `loadHomeStats()`

### HTML changes
1. Add `id="markPaidBtn"` button in the orders page section header (hidden by default)
2. Add `#markPaidModal` to the modals section with Cash / Venmo choice buttons

### JS changes
- In `loadOrders()`: show/hide `#markPaidBtn` based on unpaid count
- New `openMarkPaidModal()` function
- New `async markAllPaid(method)` function that does the bulk update

---

## What Stays the Same
- All existing order, inventory, sale, purchase, and scheduler functionality
- Modal open/close infrastructure (`closeModal`, `.modal-overlay.open`)
- All Supabase query patterns
