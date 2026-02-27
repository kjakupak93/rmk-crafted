# Multi-Item Orders Design Doc
**Date:** 2026-02-27

---

## Goal

Allow a single order to contain multiple line items — either multiple quantities of the same planter or different sizes for the same customer.

---

## Schema Change

Add one column to the `orders` table:

```sql
ALTER TABLE orders ADD COLUMN items JSONB;
```

Each element of `items` is an object:
```json
{ "size": "36×16×16", "style": "Standard", "qty": 2, "price": 60 }
```

- `price` per item = the unit price
- The order's top-level `price` = sum of (item.qty × item.price) across all items
- The order's `size` = first item's size (backward compat for existing orders)
- Existing orders without `items` display using existing `size`/`style`/`price` fields

---

## Order Form Changes

The current `#oSize`, `#oStyle`, `#oPrice` fields are replaced with a dynamic line items section inside `#orderModal`.

### Line item row (HTML template)
Each row contains:
- Size: `<input type="text" placeholder="e.g. 36×16×16">`
- Style: `<select>` with Standard / Vertical options
- Qty: `<input type="number" min="1" value="1">`
- Price: `<input type="number" placeholder="0">`
- Remove button: `🗑️` (hidden when only one row remains)

### Interactions
- `+ Add Item` button appends a new row
- Remove button deletes a row (disabled/hidden when only 1 row)
- A **Total** line below all rows auto-updates on any input change
- Minimum 1 row always present

### On save
- `items` = array of `{size, style, qty, price}` from all rows
- `price` (order total) = sum of qty × price per row
- `size` = first row's size value
- `style` = first row's style value (for backward compat)
- Validation: every row must have a non-empty size

### On edit (existing order)
- If `o.items` is present: populate rows from items array
- If `o.items` is null/absent: populate one row from `o.size`, `o.style`, `o.price`, qty=1

---

## Order Card Display

`orderCardHTML()` updated:

- If `o.items` present and length > 0: render each item as `{qty}× {size}" — {style}` on separate lines in the subtitle
- If `o.items` absent: fall back to current `${o.size}" — ${o.style}` display

---

## Quote → Order Flow

`createOrderFromQuote()` pre-fills one line item row using the quote's dimensions, style, and price.

---

## What Stays the Same

- All stats queries use `price` (the total) — no changes needed
- `loadOrders()`, `loadHomeStats()`, overdue detection — all unchanged
- Payment, status, pickup date, notes — all per-order, unchanged
