# Order Status Redesign — Design

**Date:** 2026-02-27

## Summary

Update order statuses to Pending / Building / Ready for Pickup / Completed. Move orders to the Completed tab only when both `status=completed` AND `payment=cash/venmo`. Auto-create a sales record on that transition.

## Status Labels

| DB value | Display label | Notes |
|---|---|---|
| `pending` | Pending | Unchanged |
| `building` | Building | Unchanged |
| `ready` | Ready for Pickup | Display only — DB value stays `ready` |
| `completed` | Completed | Now an option in the edit form dropdown |

## Tab Split Logic

**New rule** (was just `status === 'completed'`):
- **Active**: `!(status === 'completed' && payment !== 'unpaid')`
- **Completed**: `status === 'completed' && payment !== 'unpaid'`

An order with status=completed but payment=unpaid stays in the active tab.

## Sales Record Auto-Creation

Created when an order first transitions into `completed + paid` state:

1. **✅ button (`completeOrder`)**: sets `status=completed`. If `payment !== 'unpaid'` → create sales record. If `payment === 'unpaid'` → set status only.
2. **Edit modal (`saveOrder`)**: compare pre-save state. If old state was NOT `(completed + paid)` and new state IS `(completed + paid)` → create sales record. Store pre-edit order in `let currentEditOrder = null` (set in `editOrder()`).

## ✅ Button Visibility

Show when order is NOT already `(completed + paid)`:
```js
!(o.status === 'completed' && o.payment !== 'unpaid')
```

## Changes Required

### HTML
1. `oStatus` select: add `<option value="completed">Completed</option>`, change "Ready" text to "Ready for Pickup"
2. Filter buttons: "Ready" → "Ready for Pickup"
3. Summary card label `os-ready`: keep "Ready" (space constraint)

### JS
1. `let currentEditOrder = null;` — new module-level variable
2. `editOrder()` — set `currentEditOrder = data` after fetching
3. `openOrderModal()` — reset `currentEditOrder = null`
4. `loadOrders()` — update active/completed split to new rule; update `os-ready` label if desired
5. `loadHomeStats()` — update `activeOrders` filter to new rule
6. `orderCardHTML()` — update label map (`ready` → "Ready for Pickup"), badge condition for ✅ button
7. `saveOrder()` — after successful save, detect completed+paid transition → create sales record
8. `completeOrder()` — set status=completed, create sales record only if payment≠unpaid

### CSS
No new classes needed — `s-ready`, `badge-ready` still apply to `ready` status. Optionally add `s-completed` card border style (currently no left border for completed cards).
