# Spec: Purchase Modal "Other" Material + Cut List 2-Column Layout

**Date:** 2026-03-31

---

## 1. Purchase Modal — "Other" Material Option

### Problem
The purchase modal only supports three materials (Cedar Pickets, 2×2s, 2×4s). Any miscellaneous supply run (sandpaper, screws, stain, etc.) has no material type to select.

### Design

**Dropdown change** (`addPurchaseMaterialRow`):
Add a 4th option to the material select:
```
['other', 'Other']
```
This goes at the end of the existing `[['pickets','Cedar Pickets'],['twobytwo','2×2s'],['twobyfour','2×4s']]` array.

**`PURCH_MAT_PRICES` change:**
Add `other: 0` so the `change` event handler (`priceIn.value = PURCH_MAT_PRICES[sel.value] || ''`) clears the price field on selection (shows empty placeholder, prompting manual entry) rather than leaving a stale value.

**`savePurchase()` change:**
The current function collects only known material types into named variables (`pickets`, `pp`, `t22`, `t22p`, `t24`, `t24p`) and syncs them to the `purchases` table columns. "Other" rows contribute to the total cost but do not map to any stock column. The loop that builds the payload must skip `other` rows for the stock columns. No new DB column is needed — "Other" purchases are captured in `total` only.

The existing validation guard `if (!pickets && !t22 && !t24 && !total)` must also pass when only "Other" rows exist. Since `total` will be non-zero (qty × price), the guard already works — no change needed there.

**Edit/re-open purchase:**
When `editPurchase` re-opens a saved purchase, it calls `addPurchaseMaterialRow('pickets', ...)` etc. for rows with qty > 0. "Other" purchases have `pickets=0`, `twobytwo=0`, `twobyfour=0` — so they won't be restored on edit. This is acceptable: the total override field (`#pTotal`) preserves the dollar amount, and "Other" is inherently a misc line item with no qty to restore. No change needed to `editPurchase`.

---

## 2. Cut List Tab — 2-Column Layout

### Problem
The cut list tab is a long single-column scroll. Stock Materials, New Cut List config, and Saved Cut Lists all stack vertically, requiring lots of scrolling to move between the builder and saved lists.

### Design

**HTML restructure** inside `#mtab-cutlist`, below the title/subtitle:

Wrap all four sections in a two-column grid container:

```html
<div id="cl-columns">
  <!-- Left column -->
  <div id="cl-col-left">
    <!-- Stock Materials (.build-calc, margin-bottom:16px) -->
    <!-- Saved Cut Lists (margin-top:24px section) -->
  </div>
  <!-- Right column -->
  <div id="cl-col-right">
    <!-- New Cut List (.build-calc#cut-list-calc) -->
  </div>
</div>
```

The `#cl-results` div stays inside `#cut-list-calc` (right column) — it already appears below the action buttons after Calculate runs.

**CSS:**

```css
#cl-columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  align-items: start;
}
@media (max-width: 1024px) {
  #cl-columns { grid-template-columns: 1fr; }
}
```

`align-items: start` prevents the columns from stretching to equal height (both should grow with their content independently).

**Saved Cut Lists margin:**
The saved cut lists section currently has `margin-top: 24px`. Inside the left column, this top margin is replaced by the column gap — set `margin-top: 0` on the saved cut lists wrapper when inside `#cl-col-left`.

**Mobile behaviour (<1025px):**
Single column. Left column (stock + saved lists) stacks above right column (builder + results). This matches the current reading order.

### No JS changes
All JS references (`getElementById`, `querySelector`) use stable IDs (`cl-stock-list`, `cut-list-calc`, `cl-results`, `cl-saved-list`, etc.) — moving them in the DOM does not affect JS behaviour.

---

## Files Changed
- `index.html` — `PURCH_MAT_PRICES`, `addPurchaseMaterialRow`, `savePurchase`, cut list tab HTML, CSS
