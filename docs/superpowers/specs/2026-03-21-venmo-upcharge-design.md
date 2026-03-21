# Venmo Upcharge Feature — Design Spec

**Date:** 2026-03-21
**Status:** Approved

## Problem

Venmo transactions incur fees paid by the seller. When customers pay via Venmo, the seller wants to collect a small upcharge to offset those fees. Currently there is no way to record or apply a Venmo fee in the order flow.

## Requirements

- When "Venmo" is selected as the payment method in the Order modal, a fee input appears inline.
- The fee is a fixed dollar amount, editable per order.
- The last-used fee amount is remembered across sessions (localStorage).
- The fee is stored as a separate field in the database — not rolled into `price`.
- The fee is also preserved in the sales log when an order completes.

## UI — Order Modal

**Location:** The existing Payment form group (contains `#oPayment` select).

**Behavior:**
- Default state: fee input is hidden.
- On `change` of `#oPayment` to `"venmo"`: show a `+$__ fee` numeric input (`#oVenmoFee`) inline next to the select.
- Pre-fill `#oVenmoFee` from `localStorage` key `rmk_venmo_fee` (default: `3` if not set).
- On blur/change of `#oVenmoFee`: save new value to `localStorage.rmk_venmo_fee`.
- On `change` of `#oPayment` away from `"venmo"`: hide and clear `#oVenmoFee`.

The planter price + add-ons total is unaffected. The fee is a separate tracked amount.

## Database

### `orders` table
Add column: `venmo_fee NUMERIC DEFAULT 0`

- Set to the fee amount when payment is Venmo.
- Set to `0` (or omitted, falling back to default) for Cash/Unpaid orders.

### `sales` table
Add column: `venmo_fee NUMERIC DEFAULT 0`

- Populated from the order's `venmo_fee` when an order is marked complete and a sale record is inserted.
- Also populated when logging a manual sale (sales modal) — same Venmo-triggered inline input pattern applied there if desired, or default `0` for now.

## Data Flow

1. User opens Order modal, selects Venmo → fee input appears, pre-filled.
2. User edits fee if needed → saved to localStorage.
3. User saves order → `saveOrder()` reads `#oVenmoFee` value (or `0` if hidden), includes `venmo_fee` in Supabase payload.
4. Order completes (via "Complete Order" modal or status change) → existing sale insert picks up `venmo_fee` from order data.
5. Manual sale log (`saveSale()`) → `venmo_fee` defaults to `0` (no UI change needed for v1).

## Profit Calculations

No changes. `price` remains the planter revenue. `venmo_fee` is additive income tracked separately. Margin/cost estimation functions are unaffected.

## Out of Scope

- Venmo fee on bookings or quick-book modals (these don't store sales directly).
- Displaying fee totals in analytics (future).
- Manual sale modal Venmo fee input (default `0` for v1).
