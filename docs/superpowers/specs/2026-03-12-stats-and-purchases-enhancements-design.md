# Stats & Purchases Enhancements — Design Spec

**Date:** 2026-03-12
**Status:** Approved

---

## Overview

Four enhancements across two pages:

1. **Ready to Sell tab** — add a 2-stat accent strip above the inventory grid
2. **Purchases tab** — add 3-card all-time stats above the section header
3. **Purchases tab** — add time filter tabs (This Month / Last Month / All Time)
4. **Purchases tab** — add a pencil edit icon per row

---

## 1. Ready to Sell — 2-Stat Accent Strip

### Stats shown
- **Items in Stock** — sum of all `qty` values across inventory rows (green: `color: var(--green)`)
- **Inventory Value** — sum of `price × qty` for all inventory rows (ocean: `color: var(--ocean)`)

### Layout
Two side-by-side `summary-card` elements inside a `summary-grid` wrapper with an inline `grid-template-columns: repeat(2, 1fr)` override (the default is 4-col; must be overridden):

```html
<div class="summary-grid" style="grid-template-columns:repeat(2,1fr); margin-bottom:16px">
  <div class="summary-card c-green">
    <div class="val" id="inv-stat-count">0</div>
    <div class="lbl">Items in Stock</div>
  </div>
  <div class="summary-card c-blue">
    <div class="val" id="inv-stat-value">$0</div>
    <div class="lbl">Inventory Value</div>
  </div>
</div>
```

Placed inside `#otab-inventory` **between the `.section-header` and `#invGrid`** (stats are inline with the content, not an overview header).

### Data source
Computed from the same `data` array fetched in `loadInventory()`. No additional Supabase query.

### Implementation notes
- The existing early return `if (!data||!data.length) { grid.innerHTML=emptyState(...); return; }` must be restructured: compute and write stats **before** the early return so empty state shows `0` / `$0` rather than stale values.
- Stats written to `#inv-stat-count` and `#inv-stat-value`.
- No `allInventory` caching layer is introduced; `loadInventory()` re-fetches on every tab activation (same as current behavior).

---

## 2. Purchases — 3-Card All-Time Stats

### Stats shown
- **Total Spent** (`$X,XXX`) — sum of all `total` values (sand: `c-sand` class)
- **Trips to Lowes** (`N`) — count of all purchase rows (no color accent)
- **Avg per Trip** (`$XXX`) — Total Spent ÷ Trips, or `$0` when no trips (ocean: `c-blue` class)

### Layout
3-card `summary-grid` with inline `grid-template-columns: repeat(3, 1fr)` override, placed **above the `.section-header`** (acts as an overview header for the whole tab, not inline with the list):

```html
<div class="summary-grid" style="grid-template-columns:repeat(3,1fr); margin-bottom:16px">
  <div class="summary-card c-sand"><div class="val" id="pur-stat-total">$0</div><div class="lbl">Total Spent</div></div>
  <div class="summary-card"><div class="val" id="pur-stat-trips">0</div><div class="lbl">Trips to Lowes</div></div>
  <div class="summary-card c-blue"><div class="val" id="pur-stat-avg">$0</div><div class="lbl">Avg per Trip</div></div>
</div>
```

Note: the stats live above the section header by design — they are tab-level summary info, not tied to the filtered list below.

### Data source
Always computed from the **full unfiltered `allPurchases` array** — stats do not change when the filter changes.

### Implementation notes
- The existing early return `if (!data||!data.length)` must be restructured similarly to Section 1: write stats before the early return (showing `$0`, `0`, `$0` when empty).

---

## 3. Purchases — Time Filter Tabs

### Filter options
- **This Month** — `purchase_date` in the current calendar month
- **Last Month** — `purchase_date` in the previous calendar month
- **All Time** — no filter (default active state on load)

### Behavior
- Filter tabs render below the section header, above the purchase list
- Filtering affects only the rendered list; stats always show all-time totals
- Active filter tracked in module-level `let purchasesFilter = 'all'` (mirrors `salesFilter` pattern)
- `setPurchasesFilter(filter, btn)` updates the variable, toggles `.active` on buttons, and calls `renderPurchaseList()` — no re-fetch
- Filter state persists across tab re-entries because `purchasesFilter` is module-level and `loadPurchases()` re-applies the current filter when it re-renders

### Refactored function structure

```
loadPurchases()
  → fetch all from Supabase → save to allPurchases[]
  → compute stats from allPurchases (always all-time)
  → write stats to DOM
  → call renderPurchaseList()

renderPurchaseList()
  → filter allPurchases by purchasesFilter
  → render list HTML to #purchaseList
```

### HTML
```html
<div class="sales-filter-tabs">
  <button class="sales-filter-btn" onclick="setPurchasesFilter('month',this)">This Month</button>
  <button class="sales-filter-btn" onclick="setPurchasesFilter('lastmonth',this)">Last Month</button>
  <button class="sales-filter-btn active" onclick="setPurchasesFilter('all',this)">All Time</button>
</div>
```

Reuses existing `.sales-filter-tabs` / `.sales-filter-btn` CSS classes (already defined).

---

## 4. Purchases — Edit (Pencil) Icon

### Behavior
- Each purchase row gets a `✏️` icon button alongside the existing `🗑️` button
- Clicking opens the existing `purchaseModal` pre-populated with all fields from that row
- In edit mode the modal `<h2>` reads "Edit Purchase" and the save button reads "Update"
- Saving performs an update: `sb.from('purchases').update({...}).eq('id', id)`
- After save: `loadPurchases()` is called (re-fetch + re-render); `loadStock()` is **not** called (editing a log record does not re-adjust material quantities)
- Toast: "Purchase updated!"

### Edit state
Use a module-level JS variable `let editingPurchaseId = null` (same pattern as `editingSaleId` used in the sales flow — no hidden input needed).

### HTML changes required in purchase modal
The modal `<h2>` and save button currently have no IDs. As part of this change, add them:
- `<h2>` → `<h2 id="purchModalTitle">Log Lowes Run</h2>`
- save button → add `id="purchSaveBtn"` to the existing save button

### `openPurchaseModal(item)` changes
```js
function openPurchaseModal(item = null) {
  editingPurchaseId = item ? item.id : null;
  document.getElementById('purchModalTitle').textContent = item ? 'Edit Purchase' : 'Log Lowes Run';
  document.getElementById('purchSaveBtn').textContent = item ? 'Update' : 'Save';
  // Edit mode: populate all fields from item values
  // Add mode: set pDate to today, clear pPickets/p22/p24/pNotes,
  //   leave pPP/p22p/p24p at their HTML default values (3.66, 3.23, 4.17)
  //   (same behavior as current openPurchaseModal())
  ...
}
```

### `savePurchase()` changes
```js
async function savePurchase() {
  ...
  if (editingPurchaseId) {
    const {error} = await sb.from('purchases').update(payload).eq('id', editingPurchaseId);
    if (error) { showToast('Error saving','error'); return; }
    showToast('Purchase updated!','success');
    editingPurchaseId = null;
    closeModal('purchaseModal'); loadPurchases(); // no loadStock()
  } else {
    // existing insert + loadStock() path unchanged
  }
}
```

---

## Files Changed

- `index.html` only — HTML stat elements, filter tabs, JS logic changes
- No new files, no schema changes
