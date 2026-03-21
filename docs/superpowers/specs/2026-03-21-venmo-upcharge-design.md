# Venmo Upcharge Feature — Design Spec

**Date:** 2026-03-21
**Status:** Approved

## Problem

Venmo transactions incur fees paid by the seller. When customers pay via Venmo, the seller wants to collect a small upcharge to offset those fees.

## Requirements

- When "Venmo" is selected as the payment method in the Order modal, a fee input appears inline.
- The fee is a fixed dollar amount, editable per order.
- The last-used fee amount is remembered across sessions (localStorage).
- The fee is stored as a separate field in the database — not rolled into `price`.
- The fee is also preserved in the sales log when an order completes.

## UI — Order Modal

**HTML structure:** Add a wrapper span (`#oVenmoFeeWrap`) inside the Payment `form-group` div, after `#oPayment`. It contains a "+$" prefix, `#oVenmoFee` numeric input, and "fee" suffix. Hidden by default (`display:none`).

**Behavior — `openOrderModal()` (new order path):**
- Unconditionally hide `#oVenmoFeeWrap` and clear `#oVenmoFee`.
- No conditional check for pre-set payment — `openOrderModal()` always resets payment to `"unpaid"`, so Venmo is never pre-set on new orders.

**Behavior — `editOrder(id)` (edit path):**
- Unconditionally hide `#oVenmoFeeWrap` before populating fields.
- After setting `oPayment.value = data.payment`: if `data.payment === "venmo"`, show `#oVenmoFeeWrap` and set `#oVenmoFee.value = data.venmo_fee` (use the stored value as-is, even if `0` — do not fall back to localStorage for existing orders).

**Behavior — `#oPayment` change handler:**
- On change to `"venmo"`: show `#oVenmoFeeWrap`.
  - If in edit mode (`currentEditOrder !== null`): pre-fill `#oVenmoFee` with `currentEditOrder.venmo_fee`.
  - Otherwise (new order): pre-fill from `localStorage.rmk_venmo_fee` → `3` (hardcoded fallback).
- On change away from `"venmo"`: hide `#oVenmoFeeWrap`. Do NOT clear localStorage.

**Saving to localStorage:**
- On the `change` event of `#oVenmoFee`.
- Also at the top of `saveOrder()` before building the payload (read current input value if fee wrapper is visible).

**Reading the fee:**
```js
const venmoFee = document.getElementById('oPayment').value === 'venmo'
  ? (parseFloat(document.getElementById('oVenmoFee').value) || 0)
  : 0;
```
Treat empty, non-numeric, or negative as `0`.

**Input constraints:** `type="number"`, `min="0"`, `step="0.01"`.

The planter price + add-ons total is unaffected. The fee is a separate tracked amount.

## Database

### `orders` table
```sql
ALTER TABLE orders ADD COLUMN IF NOT EXISTS venmo_fee NUMERIC DEFAULT 0;
```

### `sales` table
```sql
ALTER TABLE sales ADD COLUMN IF NOT EXISTS venmo_fee NUMERIC DEFAULT 0;
```

After migration, `select('*')` on either table returns `venmo_fee` automatically.

## Data Flow

### `saveOrder()`
1. Compute `venmoFee` (see Reading the fee above).
2. Also save to `localStorage` at this point (belt-and-suspenders with the `change` event).
3. `venmo_fee: venmoFee` must be included **in the main `payload` object literal** — alongside `price`, `payment`, `status`, etc. Do not add it as a separate mutation after the fact.
4. The `orders` upsert uses this payload directly.
5. If auto-completing inline (the `isNowCompletedPaid` block), the `sales` insert is built from `payload` fields — `venmo_fee: payload.venmo_fee` is included there.
6. The `schedule_bookings` row uses `amount: payload.price` (planter price only). `venmo_fee` is NOT stored in `schedule_bookings`.

### `completeOrder` / `_doCompleteOrder` / `finishCompleteOrder`
- `completeOrder(id)` fetches with `select('*')` → `venmo_fee` is on the returned `data` object after migration.
- `_doCompleteOrder(data, payment)` inserts to `sales` — include `venmo_fee: data.venmo_fee || 0` in the insert payload.
- `finishCompleteOrder(method)` mutates `data.payment` in place then passes `data` to `_doCompleteOrder`. No re-fetch needed. No fee input on the Collect Payment modal — fee was captured at order-save time and persisted to the database.

### `editSale` / `saveSale`
- `venmo_fee` is **not** a form input in the sale modal and must not appear in the `saveSale` update payload.
- Excluding it from the payload causes Supabase to leave the column untouched on update — the stored value is preserved as-is. This is the correct behavior.
- For a new manual sale insert: `venmo_fee: 0`.

## Complete Order Modal — Fee Display

Out of scope for v1.

## Profit Calculations

No changes. `price` remains the planter revenue. `venmo_fee` is additive income tracked separately.

## Out of Scope

- Venmo fee on bookings or quick-book modals.
- `markAllPaid('venmo')` — updates `payment` field only, no sale inserts, no `venmo_fee` risk.
- `schedule_bookings.amount` — stores planter price only, unchanged.
- Analytics fee totals (future).
- Manual sale modal fee input — edits preserve stored value via Supabase partial update.
- Fee display in "Complete Order" summary modal.
