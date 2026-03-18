# Quote Calculator: Modifiable Picket Pricing & Material Stock Visibility

**Date:** 2026-03-17
**Status:** Approved

---

## Overview

Two enhancements to the quote calculator in the RMK Crafted dashboard:

1. **Modifiable picket pricing** — a global default per-picket selling price stored in Supabase, editable from the Materials page, with a per-quote override field in the calculator.
2. **Material stock visibility** — show current raw material stock levels (cedar pickets, 2×2s, 2×4s) inside the quote calculator so the user knows if they have enough on hand.

---

## 1. Data Layer

### New Supabase Table: `settings`

| Column | Type | Notes |
|--------|------|-------|
| `key`  | text | Primary key (e.g., `'picket_price'`) |
| `value` | text | Stored as text, parsed as needed |

**Initial row:** `{ key: 'picket_price', value: '10' }`

**RLS policy:** Open anon read/write (consistent with other tables in this single-user tool).

### JS variable

On quote page navigation, load `settings` from Supabase and store the picket price in a module-level variable `defaultPicketPrice` (number). Falls back to `10` if the row is missing.

---

## 2. Global Default Editing (Materials Page)

**Location:** Materials page, stock section, near the cedar pickets card.

**UI:** A small labeled number input — "Selling Price per Picket" — pre-filled with the current `picket_price` value from `settings`. Alongside it, a **Save** button.

**Behavior:**
- On save: `upsert` to `settings` table with `key = 'picket_price'`, `value = input.value`.
- Show a brief success toast ("Saved") on success, error toast on failure.
- Update the in-memory `defaultPicketPrice` variable so a subsequent quote on the same session uses the new value without a page reload.

---

## 3. Quote Calculator Changes

### 3a. Per-Picket Price Field

**Existing element:** `#qPPP` already exists in the HTML with a hardcoded `value="10"`. No new input field is needed.

**Work required:**
1. On quote page navigation (via `goTo('quote')`), set `#qPPP.value = defaultPicketPrice` instead of relying on the static HTML default.
2. The existing price formula already reads from `#qPPP` — no formula change needed.
3. Update or remove the static helper text near the input (currently reads "Price = pickets × $10. Material cost = pickets × $3.66.") so it doesn't become stale when the price is changed. Either make it dynamic or remove the hardcoded `$10` reference.
4. Wire `updateQCalc()` (currently a no-op) to call `calculateQuote()` so that editing `#qPPP` recalculates the price in real time.

The material cost per picket (`$3.66`) remains unchanged — it reflects actual Lowes cost and is not user-facing pricing.

### 3b. Material Stock Strip

**Location:** Below the style/dimensions area, above the picket input, inside the quote calculator card.

**UI:** A compact read-only row showing all 3 material stock counts with color-coded badges using the same thresholds as the Materials page:

| Material | Red (low) | Orange (medium) | Green (good) |
|----------|-----------|-----------------|--------------|
| Cedar Pickets | ≤ 5 | 6–15 | > 15 |
| 2×2 Lumber | ≤ 5 | 6–15 | > 15 |
| 2×4 Lumber | ≤ 5 | 6–15 | > 15 |

**Data source:** Loaded from the existing `stock` Supabase table when the quote page is navigated to. Add a `if (page === 'quote') { loadQuotePageData(); }` branch to `goTo()`, where `loadQuotePageData()` fetches both `settings` (for `defaultPicketPrice`) and `stock` (for the strip) in parallel.

**No interaction** — display only.

---

## 4. Files Changed

- `rmk-crafted/index.html` — all changes (single-file app)

### Supabase

- Create `settings` table with one initial row

---

## 5. Out of Scope

- Modifying the material cost per picket (`$3.66`) — this is a Lowes cost, not a selling price
- Inventory (finished boxes) integration — not part of this spec
- Pricing for 2×2/2×4 lumber markup (the 2.5× factor) — separate concern

---

## 6. Success Criteria

- [ ] `settings` table exists in Supabase with `picket_price` row
- [ ] Materials page shows editable "Selling Price per Picket" field that saves to Supabase
- [ ] Saving a new global price updates subsequent quotes in the same session without reload
- [ ] Quote calculator loads the global default into the per-picket price field on navigation
- [ ] Editing `#qPPP` in the calculator triggers `calculateQuote()` and updates the price in real time (requires `updateQCalc()` to be wired up)
- [ ] Stock strip shows current cedar picket, 2×2, and 2×4 quantities with correct color coding
- [ ] Stock strip data matches what the Materials page shows
