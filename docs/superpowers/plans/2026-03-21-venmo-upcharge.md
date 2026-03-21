# Venmo Upcharge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a per-order Venmo fee field that appears inline when Venmo is selected, persists to the database, and flows through to the sales log.

**Architecture:** All changes are in `index.html` (single-file app). Two DB columns are added first, then the UI, then the JS logic in four focused edits: HTML, payment change handler, order open/edit functions, and save/complete functions.

**Tech Stack:** Vanilla JS, HTML, Supabase (PostgreSQL via JS client `sb`), localStorage

---

## File Structure

| File | Changes |
|------|---------|
| `index.html:2173` | Add `#oVenmoFeeWrap` span after `#oPayment` select |
| `index.html:3522–3543` | `openOrderModal()` — hide/clear fee wrap on open |
| `index.html:3552–3590` | `editOrder()` — hide then conditionally show fee wrap |
| `index.html:3551` | Add new JS helper functions after `convertQuoteToOrder` closing brace |
| `index.html:~3592–3607` | `saveOrder()` — compute venmoFee, save to localStorage, add to payload |
| `index.html:3620` | `saveOrder()` auto-complete sales insert — add venmo_fee |
| `index.html:3772–3778` | `_doCompleteOrder()` — add venmo_fee to sales insert |
| `index.html:4079–4090` | `saveSale()` — add venmo_fee:0 to insert path only |
| Supabase | Migrate `orders` and `sales` tables |

---

## Task 1: Add DB columns

**Files:**
- Supabase SQL console (no file change)

- [ ] **Step 1: Run migration for `orders` table**

In Supabase SQL Editor, run:
```sql
ALTER TABLE orders ADD COLUMN IF NOT EXISTS venmo_fee NUMERIC DEFAULT 0;
```
Expected: Success, no error.

- [ ] **Step 2: Run migration for `sales` table**

```sql
ALTER TABLE sales ADD COLUMN IF NOT EXISTS venmo_fee NUMERIC DEFAULT 0;
```
Expected: Success, no error.

- [ ] **Step 3: Verify columns exist**

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name IN ('orders','sales') AND column_name = 'venmo_fee';
```
Expected: 2 rows, both `numeric`, default `0`.

- [ ] **Step 4: Commit**

```bash
git commit --allow-empty -m "chore: add venmo_fee columns to orders and sales (Supabase migration applied)"
```

---

## Task 2: Add HTML for fee input

**Files:**
- Modify: `index.html:2173`

The current line 2173 is:
```html
    <div class="form-group" style="max-width:180px"><label>Payment</label><select class="form-control" id="oPayment"><option value="unpaid">Not collected</option><option value="cash">Cash</option><option value="venmo">Venmo</option></select></div>
```

- [ ] **Step 1: Add the fee wrapper span after `#oPayment`**

Replace line 2173 with:
```html
    <div class="form-group" style="max-width:180px"><label>Payment</label><select class="form-control" id="oPayment" onchange="onPaymentChange(this.value)"><option value="unpaid">Not collected</option><option value="cash">Cash</option><option value="venmo">Venmo</option></select><span id="oVenmoFeeWrap" style="display:none;align-items:center;gap:4px;margin-top:6px;"><span style="font-size:0.85em;color:var(--text-muted)">+$</span><input class="form-control" type="number" id="oVenmoFee" min="0" step="0.01" style="width:70px" placeholder="0" onchange="onVenmoFeeChange(this.value)"><span style="font-size:0.85em;color:var(--text-muted)">fee</span></span></div>
```

Key changes:
- Added `onchange="onPaymentChange(this.value)"` to `#oPayment`
- Added `#oVenmoFeeWrap` span (hidden by default with `display:none`)
- `#oVenmoFee` is `type="number"`, `min="0"`, `step="0.01"`, width 70px
- `onchange="onVenmoFeeChange(this.value)"` saves to localStorage

- [ ] **Step 2: Visually verify in browser**

Open the app. Go to Orders → New Order. The payment dropdown should look identical to before (no visible change). No fee field visible yet.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add Venmo fee input HTML to order modal (hidden by default)"
```

---

## Task 3: Add payment change handler and fee helpers

**Files:**
- Modify: `index.html` — add new JS functions near the other order modal helpers (after `openOrderModal`, around line 3544)

- [ ] **Step 1: Add `onPaymentChange`, `onVenmoFeeChange`, and `_getVenmoFeeDefault` helper functions**

Insert after the closing `}` of `convertQuoteToOrder` (after line 3550):

```js
function _getVenmoFeeDefault() {
  const stored = localStorage.getItem('rmk_venmo_fee');
  return stored !== null ? parseFloat(stored) || 0 : 3;
}

function onVenmoFeeChange(val) {
  const n = parseFloat(val);
  if (!isNaN(n) && n >= 0) localStorage.setItem('rmk_venmo_fee', n);
}

function onPaymentChange(val) {
  const wrap = document.getElementById('oVenmoFeeWrap');
  if (val === 'venmo') {
    wrap.style.display = 'flex';
    const fee = currentEditOrder ? (currentEditOrder.venmo_fee ?? _getVenmoFeeDefault()) : _getVenmoFeeDefault();
    document.getElementById('oVenmoFee').value = fee;
  } else {
    wrap.style.display = 'none';
  }
}
```

Note: `onPaymentChange` uses `currentEditOrder.venmo_fee` when in edit mode. For existing orders that predate this feature, `venmo_fee` will be `0` (the DB default) — which is the correct stored value and will display as `0`.

- [ ] **Step 2: Verify in browser — new order**

Open New Order modal → change Payment to Venmo. A "+$ [input] fee" row should appear below the select, pre-filled with `3` (or your saved preference). Change payment back to Cash — the fee input should hide.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add Venmo fee show/hide and localStorage helpers"
```

---

## Task 4: Wire fee wrap into `openOrderModal` and `editOrder`

**Files:**
- Modify: `index.html:3522–3543` (`openOrderModal`)
- Modify: `index.html:3552–3590` (`editOrder`)

- [ ] **Step 1: Update `openOrderModal` to hide the fee wrap on every open**

In `openOrderModal` (line 3522), after the line `document.getElementById('oPayment').value='unpaid';` (line 3528), add:
```js
  document.getElementById('oVenmoFeeWrap').style.display = 'none';
  document.getElementById('oVenmoFee').value = '';
```

- [ ] **Step 2: Update `editOrder` to hide then conditionally show fee wrap**

In `editOrder` (line 3552), after the line `document.getElementById('oPayment').value=data.payment||'unpaid';` (line 3560), add:
```js
  document.getElementById('oVenmoFeeWrap').style.display = 'none';
  if ((data.payment||'unpaid') === 'venmo') {
    document.getElementById('oVenmoFeeWrap').style.display = 'flex';
    document.getElementById('oVenmoFee').value = data.venmo_fee ?? 0;
  }
```

- [ ] **Step 3: Verify in browser — edit a Venmo order**

Create a test order with payment = Venmo and save it. Re-open the order for editing. The fee field should appear with the stored value. Open a Cash order — no fee field.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: show/hide Venmo fee on order modal open and edit"
```

---

## Task 5: Update `saveOrder` to persist `venmo_fee`

**Files:**
- Modify: `index.html:3592–3621` (`saveOrder`)

- [ ] **Step 1: Add venmo_fee computation and localStorage save at top of `saveOrder`**

At the top of `saveOrder()`, after the `addonPrices` block (after line 3602), add:
```js
  const venmoFee = document.getElementById('oPayment').value === 'venmo'
    ? (parseFloat(document.getElementById('oVenmoFee').value) || 0)
    : 0;
  if (document.getElementById('oPayment').value === 'venmo') {
    localStorage.setItem('rmk_venmo_fee', venmoFee);
  }
```

- [ ] **Step 2: Add `venmo_fee` to the `payload` object literal**

The current `payload` on line 3607 ends with `notes:document.getElementById('oNotes').value}`. Add `venmo_fee:venmoFee` to this object:

```js
  const payload={name:document.getElementById('oName').value,contact:document.getElementById('oContact').value,size:itemRows[0].size,style:itemRows[0].style,price:total,items:items,payment:document.getElementById('oPayment').value,status:document.getElementById('oStatus').value,pickup_date:document.getElementById('oPickup').value||null,pickup_time:document.getElementById('oPickupTime').value||null,notes:document.getElementById('oNotes').value,venmo_fee:venmoFee};
```

- [ ] **Step 3: Add `venmo_fee` to the auto-complete sales insert**

Line 3620 is the `sales` insert inside the `isNowCompletedPaid` block. Add `venmo_fee:payload.venmo_fee` to it:

```js
    await sb.from('sales').insert({name:payload.name,size:saleSizeStr,style:payload.style||'Standard',price:payload.price||0,qty:saleQty,payment:payload.payment,sale_date:new Date().toISOString().split('T')[0],notes:payload.notes||'',venmo_fee:payload.venmo_fee||0});
```

- [ ] **Step 4: Verify — save a Venmo order and check Supabase**

In the app: create a new order, set payment = Venmo, set fee to `5`, save. In Supabase → Table Editor → `orders`, confirm the row has `venmo_fee = 5`.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat: persist venmo_fee in saveOrder payload and auto-complete sales insert"
```

---

## Task 6: Update `_doCompleteOrder` to pass `venmo_fee` to sales

**Files:**
- Modify: `index.html:3772–3778` (`_doCompleteOrder`)

- [ ] **Step 1: Add `venmo_fee` to the sales insert in `_doCompleteOrder`**

Line 3778 is the `sales` insert inside `_doCompleteOrder`. Add `venmo_fee: data.venmo_fee || 0`:

```js
    await sb.from('sales').insert({name:data.name,size:compSizeStr,style:data.style,price:data.price,qty:compQty,payment:payment,sale_date:new Date().toISOString().split('T')[0],notes:data.notes,venmo_fee:data.venmo_fee||0});
```

- [ ] **Step 2: Verify — complete a Venmo order using the Complete button**

Create an order with payment = Venmo, fee = `4`. Press the ✅ Complete button. In Supabase → `sales`, confirm the new row has `venmo_fee = 4`.

- [ ] **Step 3: Verify — complete an unpaid order, collect via Venmo**

Create an order with payment = unpaid. Press ✅ Complete → modal appears. Click "📱 Venmo". In Supabase → `sales`, confirm `venmo_fee = 0` (fee was not set at order time — correct behavior).

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: include venmo_fee in _doCompleteOrder sales insert"
```

---

## Task 7: Update `saveSale` insert path to include `venmo_fee`

**Files:**
- Modify: `index.html:4079–4091` (`saveSale`)

The spec requires:
- **Insert path** (new manual sale): `venmo_fee: 0`
- **Update path** (edit): do NOT include `venmo_fee` — Supabase partial update preserves existing value

- [ ] **Step 1: Add `venmo_fee:0` to the insert payload in `saveSale`**

The `saveSale` payload on line 4080 is used for both insert and update. Since we want `venmo_fee` only on insert, we split the logic:

Replace the current `saveSale` body with:
```js
async function saveSale() {
  const payload={name:document.getElementById('sName').value,size:document.getElementById('sSize').value,style:document.getElementById('sStyle').value,price:parseFloat(document.getElementById('sPrice').value)||0,qty:parseInt(document.getElementById('sQty').value)||1,payment:document.getElementById('sPayment').value,sale_date:document.getElementById('sDate').value,notes:document.getElementById('sNotes').value};
  if (!payload.size||!payload.price) {showToast('Size and price required','error');return;}
  if (editingSaleId) {
    const {error}=await sb.from('sales').update(payload).eq('id',editingSaleId);
    if (error) {showToast('Error saving','error');return;}
    showToast('Sale updated!','success');
  } else {
    const {error}=await sb.from('sales').insert({...payload,venmo_fee:0});
    if (error) {showToast('Error saving','error');return;}
    showToast('Sale logged!','success');
  }
  closeModal('saleModal'); loadSales();
}
```

Key: `venmo_fee:0` only on the insert branch. The update branch omits it so Supabase leaves the column untouched.

- [ ] **Step 2: Verify — log a new manual sale and check Supabase**

Go to Orders → Sales History → Log Sale. Fill in and save. In Supabase → `sales`, confirm `venmo_fee = 0`.

- [ ] **Step 3: Verify — edit an existing sale with venmo_fee set**

Find a sale that came from a Venmo order (venmo_fee > 0 in Supabase). Click edit, change the notes, save. In Supabase, confirm `venmo_fee` is still the original value (not overwritten to 0).

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: add venmo_fee:0 to manual sale insert; preserve on edit via partial update"
```

---

## Task 8: End-to-end smoke test and push

- [ ] **Step 1: Full flow — new order → Venmo → complete via saveOrder**

1. New Order → Payment = Venmo → fee shows as `3` (default)
2. Change fee to `7` → localStorage should update
3. Close modal, reopen new order → Payment = Venmo → fee should show `7` (from localStorage)
4. Set status = Completed → save. Check `orders.venmo_fee = 7`, `sales.venmo_fee = 7`.

- [ ] **Step 2: Full flow — order → complete via ✅ button**

1. Create order, Payment = Venmo, fee = `5`, status = Pending → save.
2. Press ✅ Complete. Order already has payment set → goes straight to complete.
3. Check `sales.venmo_fee = 5`.

- [ ] **Step 3: Full flow — unpaid order → collect Venmo payment**

1. Create order, Payment = unpaid → save.
2. Press ✅ Complete → modal → click 📱 Venmo.
3. Check `sales.venmo_fee = 0` (correct — fee was not captured at order time).

- [ ] **Step 4: Edit existing Venmo order**

1. Open a saved Venmo order in edit mode.
2. Fee field should show the stored value.
3. Change fee → save. Confirm `orders.venmo_fee` updated in Supabase.

- [ ] **Step 5: Switch payment type in modal**

1. New order → select Venmo → fee appears.
2. Switch to Cash → fee hides.
3. Switch back to Venmo → fee re-appears with localStorage default.

- [ ] **Step 6: Push to GitHub and verify deploy**

```bash
git push origin main
```

Wait ~60 seconds. Open the live site and repeat step 1 to confirm production works.

- [ ] **Step 7: Commit (if any final tweaks)**

```bash
git add index.html
git commit -m "fix: [description of any last tweaks]"
git push origin main
```
