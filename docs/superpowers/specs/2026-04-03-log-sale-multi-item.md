# Spec: Log a Sale — Multi-Item Upgrade

**Date:** 2026-04-03
**Status:** Approved

## Goal

Bring the Log a Sale modal to feature parity with the Create Order modal for item entry: multi-item rows with product, product options, qty, and price per item; editable add-on pricing; and auto-summed sale price with manual override.

## What Changes

### 1. Shared Item-Row & Addon Functions (Architecture)

The following functions currently hardcode their container IDs. Add an optional parameter to each so both modals can share the same logic. All existing callers remain unchanged (defaults preserve current behavior).

| Function | New optional param | Default |
|---|---|---|
| `addOrderItem(size, style, qty, price)` | `containerId` | `'oItemsContainer'` |
| `getOrderItems()` | `containerId` | `'oItemsContainer'` |
| `renderOrderAddons(savedIds, savedPrices)` | `listId` | `'orderAddonList'` |
| `addOrderAddon()` | `listId, selectId, priceId` | order modal IDs |
| `getAddonTotalFromOrder()` | `listId` | `'orderAddonList'` |
| `onAddonSelectChange()` | `selectId, priceId` | order modal IDs |

### 2. Sale Modal HTML

**Remove:** `#sSize` (text input), `#sQty` (number input), `#sProduct` (select) — all three replaced by item rows.

**New layout:**
```
Row: [ Buyer Name ]           [ Date Sold ]
     [ Items container #sItemsContainer               ]
       (same row structure as order modal:
        size · product dropdown · product options · qty · price)
     [ + Add Item ]                       Total: $0
     [ Add-ons: #sAddonSelect + #sAddonPrice + Add btn ]
       [ addon rows in #sAddonList ]
Row: [ Sale Price ($) #sPrice ]  [ Payment #sPayment ]
     [ Venmo Fee — shown only when Venmo ]
     [ Notes ]
```

The `#sItemsContainer` and `#sAddonList` use the **exact same DOM structure** as the order modal, so the refactored shared functions work without extra wiring.

**Auto-sum:** Whenever any item row's qty or price changes, recalculate `sum(qty × price) + addon total` and write it into `#sPrice`. The user can still manually override `#sPrice` after the auto-sum fires.

**New IDs needed:**
- `#sItemsContainer` — item rows container
- `#sAddonSelect` — addon dropdown (populated from `ADDONS`)
- `#sAddonPrice` — addon price input
- `#sAddonList` — rendered addon rows

### 3. Database

Add one column to the `sales` table:

```sql
ALTER TABLE sales ADD COLUMN items JSONB;
```

Shape: `{ rows: [{size, style, options, qty, price}, ...] }`

No RLS changes needed (existing authenticated policy covers new column).

### 4. `saveSale()` Changes

- Read items via `getItemRows('sItemsContainer')` instead of `#sSize`/`#sQty`/`#sProduct`
- Validate: at least one item with a size required (replace current size+price check)
- Persist `items: { rows: itemRows }` to new `sales.items` column
- Keep `size`, `style`, `qty` columns populated from **first item** for backwards compat
- Read addons from `#sAddonList` (same pattern as order modal) — store as `[{id, label, price}]`
- `price` field: read from `#sPrice` (user's value, whether auto-summed or manually overridden)

### 5. `openSaleModal()` Changes

- Call `addItemRow('sItemsContainer')` instead of resetting static fields
- Call `renderOrderAddons(null, null, 'sAddonList')` for the addon list
- Populate `#sAddonSelect` via existing `populateProductSelects()` pattern (reuse addon population)
- When editing an existing sale: populate item rows from `sale.items.rows` if present, else fall back to creating one row from `sale.size`/`sale.style`/`sale.qty`/`sale.price`

### 6. Sales History Display

No schema change to display logic required for most views. Where the history card shows size/qty, continue reading `sale.size` / `sale.qty` (first-item fallback is always written). If a future task wants to show all items in history, `sale.items.rows` is available.

## What Does NOT Change

- Payment options (cash / venmo) — unchanged
- Venmo fee logic — unchanged
- Add-ons base data source (`ADDONS` array) — unchanged
- `sales` table RLS policies — unchanged
- Sales history read queries — unchanged (backwards compat via first-item columns)
- No Contact / FB Handle field (buyer name only)
- No Status field (sales are always completed)
- No Pickup Date/Time fields

## Success Criteria

1. Can log a sale with 2+ items of different products/sizes in a single entry
2. Product options (e.g. stain) appear per item row and are saved to `items.rows[n].options`
3. Sale Price auto-fills from item row totals + addon total; user can override
4. Add-ons use dropdown + editable price, saved as `[{id, label, price}]`
5. Existing single-item sales still display correctly in history
6. Order modal behavior is completely unchanged
