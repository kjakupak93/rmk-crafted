# Spec: Per-Stock Material Pricing

**Date:** 2026-04-12  
**Status:** Approved

## Problem

The cut list margin bar uses a hardcoded `UNIT_COSTS` constant and regex name-matching to assign costs to stock materials. This means:
- Material prices can't be updated without editing code
- Custom stock types added by the user contribute $0 to the cost calculation
- There is no UI to set or change material costs

## Goal

Allow the user to set a cost-per-board for each stock material in the cut list. Costs are stored globally in Supabase so updating a price is reflected in all future cut list runs immediately.

## Out of Scope

- Global persistence of the stock type list itself (names, dimensions) — stock types remain session-local / per-cut-list
- Changes to the Lowes purchase log or its pricing
- Suggested price logic (still `picketCount × $10`)

---

## Data

### Supabase `settings` table

New row:
- `key`: `stock_costs`
- `value`: JSON object mapping stock name → cost per board (number)

Example value:
```json
{"Cedar Picket 6ft": 3.66, "Pine 2×2 8ft": 3.23, "Douglas Fir 2×4 8ft": 4.17}
```

No schema changes required — the `settings` table already stores arbitrary JSON values.

---

## JavaScript

### New module-level variable

```js
let STOCK_COSTS = {}; // { [stockName]: costPerBoard }
```

### `loadStockCosts()` — new function

- Reads `settings` row where `key = 'stock_costs'`
- Parses JSON value into `STOCK_COSTS`
- If row doesn't exist: seeds defaults `{"Cedar Picket 6ft": 3.66, "Pine 2×2 8ft": 3.23, "Douglas Fir 2×4 8ft": 4.17}`, upserts to settings, sets `STOCK_COSTS`
- Called at app init alongside `loadAddonSettings()`, `loadProductSettings()`, `loadProductOptions()`

### `saveStockCosts()` — new function

- Upserts `settings` row `key = 'stock_costs'` with current `STOCK_COSTS` JSON
- Called after any add/edit that changes a cost

### `editStockType(id)` — modified

- Add `$/ea` input (`cl-sedit-cost-{id}`) pre-filled with `STOCK_COSTS[stock.name] || ''`

### `saveStockEdit(id)` — modified

- Read cost from `cl-sedit-cost-{id}` input
- If stock was renamed: delete `STOCK_COSTS[oldName]`, set `STOCK_COSTS[newName] = cost`
- If name unchanged: set `STOCK_COSTS[name] = cost`
- Call `saveStockCosts()`

### `addStockType()` — modified

- Add `$/ea` input (`cl-new-stock-cost`) to the add form
- After push to `clStockTypes`: set `STOCK_COSTS[name] = cost` (0 if blank), call `saveStockCosts()`

### `removeStockType(id)` — modified

- Delete `STOCK_COSTS[stock.name]` entry and call `saveStockCosts()` on removal

### `renderClMarginBar()` — modified

- Replace current regex + `UNIT_COSTS` logic with:
  ```js
  const cost = clStockTypes.reduce((sum, s) => {
    return sum + (clLastRunBoardCounts[s.id] || 0) * (STOCK_COSTS[s.name] || 0);
  }, 0);
  ```
- Remove references to `UNIT_COSTS` in this function (keep `UNIT_COSTS` elsewhere — it's still used by `estimateOrderCost`, `renderStandardSizesTable`, and quote cost calculations)

---

## UI

### Edit form (pencil)

Add a `$/ea` input after the Height dim input in `editStockType()`:

```
[Name ____________] [L ___] × [W ___] × [H ___] [$ ___] [Save] [✕]
```

- Input class: `cl-stock-dim` (same narrow style)
- Type: number, min 0, step 0.01, placeholder `$/ea`
- Pre-filled with `STOCK_COSTS[stock.name] || ''`

### Add form

Add a `$/ea` input to the "Add new stock" row in HTML:

```
[Name ___________] [L ___] [W ___] [H ___] [$ ___] [+ Add]
```

- `id="cl-new-stock-cost"`, class `std-input`, type number, min 0, step 0.01, placeholder `$/ea` (optional)
- Same flex sizing as the other dim inputs (`flex: 0 0 74px`)
- Clear on successful add

### iOS mobile

Add `#cl-new-stock-cost` to the `@media (max-width: 640px)` iOS font-size fix block (must be ≥16px to prevent zoom):
```css
.cl-stock-dim, #cl-margin-price, #cl-new-stock-cost { font-size: 16px !important; }
```

The inline-built cost input in `editStockType()` uses `.cl-stock-dim` class, so it's already covered.

---

## Initialization

`loadStockCosts()` must complete before the cut list tab is used, but it does not block page load. It should be called in the same async init block as the other settings loaders.

The `UNIT_COSTS` constant remains unchanged — it is still referenced by `estimateOrderCost()`, `renderStandardSizesTable()`, and the quote cost display. Only `renderClMarginBar()` switches to `STOCK_COSTS`.

---

## Behavior Notes

- Renaming a stock removes its old cost entry and writes a new one. The user does not need to re-enter the cost after a rename — `saveStockEdit()` carries the value through.
- If a stock has no cost set (e.g. a newly added custom stock with blank `$/ea`), it contributes $0 to the margin bar calculation. The margin bar still renders; cost will just be lower than reality until the user sets it.
- Clearing and reloading the cut list resets `clStockTypes` to defaults but `STOCK_COSTS` remains loaded from Supabase — the default stocks' costs are always available.
- The `cut_lists.stock_types` JSONB column does not need to store cost — costs are always read from the global `STOCK_COSTS` at render time.
