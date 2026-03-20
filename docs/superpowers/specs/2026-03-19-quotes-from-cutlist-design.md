# Quotes from Cut List — Design Spec
**Date:** 2026-03-19
**Status:** Approved

---

## Overview

Add a lightweight quoting workflow: a cut list can be converted into a quote (capturing price and picket count), quotes live in a new Quotes tab on the Orders page, and any quote can be promoted to a full order. This provides accurate picket-based margin calculation (no formula guessing) since the cut list packing algorithm knows exactly how many boards are used.

---

## Database

### New `quotes` table

```sql
create table quotes (
  id uuid primary key default gen_random_uuid(),
  name text,                    -- customer name (optional)
  price numeric not null,
  cut_list_id uuid,             -- FK to cut_lists.id (nullable — cut list may be deleted later)
  cut_list_name text,           -- snapshot of cut list name at quote creation time
  picket_count integer,         -- board count from packing result for the Picket stock type
  notes text,
  created_at timestamptz default now()
);
```

**RLS:** Enable RLS + open anon policies (SELECT/INSERT/UPDATE/DELETE), matching the `cut_lists` pattern.

---

## Feature 1: "Create Quote" Button on Cut List

A **"+ Quote"** button is added to the cut list action bar (alongside "Add Part", "Calculate", "Save"). It is **disabled** until `runCutList()` has been called and the diagram is rendered. It becomes enabled after a successful `runCutList()` call.

**Detecting picket count from run results:**

After `runCutList()` runs, the board counts per stock type are available as local `bins.length` per stock type inside the existing `clStockTypes.forEach` loop (~line 4052).

**Implementation:** Reset `clLastRunBoardCounts = {}` immediately before the `clStockTypes.forEach(...)` loop (not after). Then, inside that loop, after the early-return guard (`if (!rawPieces || !rawPieces.length) return;`) and after `const bins = runCutListBins(...)`, add:

```js
clLastRunBoardCounts[stock.id] = bins.length;
```

Stock types with no cuts assigned are skipped by the early-return and will be absent from `clLastRunBoardCounts`. When the picket stock type is absent (no picket cuts in this run), `clLastRunBoardCounts[picketStockId]` is `undefined` — treat this the same as `null` (store `picket_count: null` in the quote).

**Identifying the picket stock:** The picket stock is identified as the stock type whose `shortName` or `name` contains `'Picket'` (case-insensitive). If no such stock type exists, `picket_count` is stored as `null`.

**On "Quote" button click — open a small modal** (`createQuoteModal`):

- **Customer name** — optional text input, placeholder "Customer name (optional)"
- **Price** — number input, pre-filled with `picketCount × PICKET_PRICE_PER_UNIT` where `PICKET_PRICE_PER_UNIT = 10` (the ~$10/picket business rule). Editable.
- **Notes** — text input, pre-filled with the cut list name (`document.getElementById('cl-name').value`). Editable.
- **"Create Quote"** button — inserts into `quotes` table
- **Cancel** button

On save:
1. Insert `{ name, price, cut_list_id, cut_list_name, picket_count, notes }` into `quotes`
2. `cut_list_id` = the current loaded cut list's saved ID (`cl-name.dataset.savedId` if set, else `null`)
3. `cut_list_name` = current value of `#cl-name` input
4. `picket_count` = `clLastRunBoardCounts[picketStockId]` or `null`
5. Show toast: "Quote created!"
6. Close modal

---

## Feature 2: Quotes Tab on Orders Page

A 4th tab button added to `#orders-tabs`:
```html
<button class="tab-btn" onclick="showOrderTab('quotes',this)">💬 Quotes</button>
```

And a corresponding panel `#otab-quotes`.

**Tab loads data** when navigated to (lazy load, matching existing tab pattern): calls `loadQuotes()`. This is wired by adding `if (tab==='quotes') loadQuotes();` inside the existing `showOrderTab(tab, btn)` function body, alongside the existing `if (tab==='inventory')` and `if (tab==='sales')` guards.

**`loadQuotes()`** fetches all rows from `quotes` ordered by `created_at desc`, stores in `allQuotes`, calls `renderQuotesTable()`.

**`renderQuotesTable()`** renders a table inside `#otab-quotes`:

| Date | Customer | Price | Est. Margin | Cut List | Notes | Actions |
|---|---|---|---|---|---|---|
| `created_at` (date only) | `name` or `—` | `$price` | margin badge | `cut_list_name` or `—` | `notes` | Convert / Delete |

**Est. Margin calculation:**
- If `picket_count` is set: `cost = picket_count × UNIT_COSTS.pickets`, `margin = Math.round(((price - cost) / price) * 100)`
- If `picket_count` is null: `cost = price * 0.37` fallback, show `~XX%`
- Color-coded using `marginColor(pct)` (green ≥60%, orange ≥50%, red <50%)

**Actions:**
- **Convert** button → `convertQuoteToOrder(id)`
- **Delete** button → confirm dialog → delete from `quotes`, reload table

---

## Feature 3: Convert Quote to Order

`convertQuoteToOrder(id)`:
1. Find the quote in `allQuotes`
2. Call `openOrderModal()` (existing function)
3. Pre-fill the modal:
   - `#oName` ← `quote.name` (if set)
   - `#oNotes` ← `quote.notes` (if set)
   - First item row price ← `quote.price`
4. Store `quote.id` in the module-level variable `_pendingQuoteId`
5. The `_pendingQuoteId` cleanup is handled inside `saveOrder()` directly: immediately after the `if (error) { showToast(...); return; }` guard (the early-exit on Supabase insert/update error), add a block that checks `if (_pendingQuoteId)` — if set, delete the quote from `quotes`, clear `_pendingQuoteId`, and the existing `showToast('Order added!', 'success')` already handles user feedback (no additional toast needed). Place this block before `closeModal('orderModal')`.

**Pre-filling the order modal:** `openOrderModal()` currently resets all fields. A new optional parameter `openOrderModal(prefill)` is added where `prefill = { name, notes, price }`. If provided, after the existing reset logic:
- Set `document.getElementById('oName').value = prefill.name || ''`
- Set `document.getElementById('oNotes').value = prefill.notes || ''`
- Set the first item row price by changing the bare `addOrderItem()` call (which adds the first empty row) to `addOrderItem('', 'Standard', 1, prefill.price || 0)` — `addOrderItem` accepts `(size, style, qty, price)` as arguments

The existing call sites (`onclick="openOrderModal()"`) pass no argument, so `prefill` is `undefined` and behavior is unchanged.

---

## Module-Level Variables Added

```js
let clLastRunBoardCounts = {};   // { [stockId]: boardCount } — set after each runCutList()
let allQuotes = [];               // loaded by loadQuotes()
let _pendingQuoteId = null;       // set when converting a quote, cleared after saveOrder()
```

---

## Implementation Notes

- No changes to `orders` table schema
- No changes to `cut_lists` table schema
- `UNIT_COSTS.pickets` ($3.66) already defined — use for margin calc in Quotes tab
- `marginColor(pct)` already defined — reuse
- The `+ Quote` button is disabled (grayed) before `runCutList()` is called; enabled after
- Dark mode: all new modal and table elements use existing CSS variables
- The `createQuoteModal` follows the same modal pattern as other modals in the app

---

## Success Criteria

1. "Quote" button is disabled until cut list is run; enabled after
2. Clicking "Quote" opens modal pre-filled with suggested price and cut list name as notes
3. Saving quote inserts into `quotes` table with correct `picket_count`, `cut_list_id`, `cut_list_name`
4. Quotes tab appears on Orders page and loads quotes lazily
5. Quotes table shows date, name, price, margin badge (color-coded, `~` if picket_count null), cut list name, notes, actions
6. Delete removes the quote with a confirm dialog
7. Convert opens the order modal pre-filled with name, notes, price; saving the order deletes the quote
8. Dark mode works for all new UI
9. No regressions to existing Orders tabs, cut list, or order save flow
