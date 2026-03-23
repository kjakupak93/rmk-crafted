# Style Management Redesign — Spec

**Date:** 2026-03-22
**Status:** Approved

## Summary

Remove the Quote Calculator page entirely. Move style management to a new Styles tab on the Materials page. Add a style field to the cut list save flow. Organize saved cut lists by style.

---

## 1. Removals

### `page-quote` (Quote Calculator page)
- Delete the `page-quote` div and all its HTML.
- Remove the "Quote Calculator" nav tile from the Home page grid (and its `.app-tile--quote` CSS class references).
- Remove the `page-quote` case from `showPage()`.
- Remove all quote-calc-only JS functions:
  - `calculateQuote()`, `getQuotePrice()`, `getQuoteBasePrice()`, `getQuoteMatCost()`, `updateQCalc()`
  - `copyQuoteMsg()`, `openListingFromQuote()`, `createOrderFromQuote()`, `resetQuote()`
  - `updateQuoteAddonPrices()` — reads DOM elements only present in `page-quote`
  - Add-on helpers: `addonScaleFactor()`, `addonPrice()`, `getSelectedAddonIds()`, `getAddonTotalFromGrid()`
- Remove `renderStyleButtons()` — style display moves to the new Styles tab.
- Remove `openStyleSettings()`, `removeStyleRow()`, `addStyleRow()`, `saveStyleSettings()` — replaced by the Styles tab UI.
- Remove `currentStyle` global variable and `selectStyle()` function — both are only used by `renderStyleButtons()` and the quote page style toggle.

### Cleanup (dead code after removal)
- Remove `STYLE_META` constant and the `'quoteAddonGrid'` entry from `syncAddonChipLabels()`'s grid list — these reference DOM elements that no longer exist.
- Remove `.style-toggle`, `.style-btn`, `.style-btn.active`, `.sdesc`, `.sname` CSS rules — only used by the removed quote page style toggle.
- Delete `tests/quote.spec.ts` entirely — it tests `page-quote` navigation which no longer exists.

### Kept
- `PRODUCT_STYLES`, `loadStyleSettings()`, `populateStyleSelects()` — these feed inventory/sales dropdowns and the new cut list style field. Keep as-is, but update `populateStyleSelects()` to also refresh `#cl-style` (see Section 3).

---

## 2. Materials Page — New Styles Tab

### Tab bar
`Stock | Purchases | Cut List | Styles`

New tab button: `<button onclick="showMaterialsTab('styles', this)">Styles</button>`

Note: `showMaterialsTab()` prefixes `mtab-` internally, so pass `'styles'` (not `'mtab-styles'`). Add a `if (tab === 'styles') renderStylesTab();` call inside `showMaterialsTab()`.

### Styles tab content (`#mtab-styles`)
- Renders a list of all current `PRODUCT_STYLES` entries.
- Each row: style name + **Rename** button + **Delete** button.
- **Rename**: prompts for a new name.
  - If prompt is cancelled or returns empty string: abort, do nothing.
  - If new name already exists in `PRODUCT_STYLES` (case-insensitive): show error toast "A style with that name already exists" and abort.
  - Otherwise: update `PRODUCT_STYLES`, save to localStorage, call `populateStyleSelects()` to refresh all dropdowns app-wide, re-render the Styles tab.
- **Delete**:
  - If `PRODUCT_STYLES` has only one style: show error toast "At least one style is required" and abort.
  - If any cut lists use this style: show confirmation — "X cut list(s) use this style. They'll be moved to Uncategorized." — then `UPDATE cut_lists SET style = null WHERE style = name` before removing from `PRODUCT_STYLES`.
  - If no cut lists use this style: delete immediately.
  - After deletion: save to localStorage, call `populateStyleSelects()`, re-render the Styles tab.
- **Add Style** button at bottom: prompts for a name.
  - If cancelled or empty: abort.
  - If name already exists (case-insensitive): show error toast and abort.
  - Otherwise: call `addStyle(name)`.
  - No minimum style count constraint on adding.

### Style management functions (new)
- `renderStylesTab()` — renders the styles list in `#mtab-styles`.
- `addStyle(name)` — validates name (non-empty, no duplicate), adds to `PRODUCT_STYLES`, persists to localStorage, calls `populateStyleSelects()`.
- `renameStyle(oldName, newName)` — validates (see above), updates `PRODUCT_STYLES`, persists, calls `populateStyleSelects()`, re-renders tab.
- `deleteStyle(name)` — validates (last-style guard, cut list usage check), nullifies DB rows if needed, removes from `PRODUCT_STYLES`, persists, calls `populateStyleSelects()`.

---

## 3. Cut List Tab — Style Field

### Save area changes
Add a style `<select>` with id `#cl-style` inline below the Name field:
- Options: blank/empty `""` ("— No style —"), then each style in `PRODUCT_STYLES`, then `"__new__"` ("New style…") at the bottom.
- Selecting "New style…" prompts for a name:
  - If cancelled or empty: revert `#cl-style` to its previous selection, do nothing.
  - If name already exists (case-insensitive): show error toast, revert `#cl-style` to previous selection.
  - Otherwise: call `addStyle(name)` (which calls `populateStyleSelects()`, refreshing `#cl-style`), then set `#cl-style` value to the new style name.
- Style field is optional — blank saves as `null` (Uncategorized).

### `populateStyleSelects()` update
Add `'cl-style'` to the list of select IDs it populates, appending the "New style…" option (`value="__new__"`) after the style options. (Note: "— No style —" blank option must also be included as the first option for `cl-style` but not for `iStyle`/`sStyle` which are required.)

### `saveCutList()` changes
- Read `#cl-style` value. If `""` or `"__new__"`, save `style: null`. Otherwise save the string value.
- Include `style` in both INSERT and UPDATE payloads.
- On UPDATE: if `#cl-style` is blank, save `style: null` — this clears the style on existing records.

### `loadCutList()` changes
- After restoring the cut list data, set `#cl-style` value to the loaded `style` value.
- If the stored style is not present in `PRODUCT_STYLES` (e.g., it was deleted after the cut list was saved): leave `#cl-style` at the blank "— No style —" option.

---

## 4. Saved Cut Lists — Grouped by Style

### Layout
Replace the flat table with grouped sections:
- One section per style, header = style name + count badge (e.g., "Standard (3)").
- **Uncategorized** group at the bottom for null/empty style.
- Groups with zero cut lists are hidden entirely.
- Within each group: same columns as today — Name / Last Modified / Notes — with Load and Delete buttons.
- Groups can be collapsible `<details>` elements (open by default) or always-expanded sections — either is acceptable.

### `loadSavedCutLists()` changes
- Fetch `style` column alongside existing columns.
- Group results client-side by style value.
- Render grouped sections as described above.

---

## 5. Database Schema

```sql
ALTER TABLE cut_lists ADD COLUMN style text;
```

- Existing rows remain null (display as Uncategorized).
- No RLS changes needed (existing policies cover new column).

---

## 6. Tests

### Delete
- `tests/quote.spec.ts` — delete entirely (tests `page-quote` which no longer exists).

### Smoke tests (`tests/*.spec.ts`)
- Update Home page nav tile count (one fewer tile).
- Add: Materials → Styles tab is accessible and renders style list.

### E2E — `tests/e2e/cutlist-quotes.spec.ts`
Add:
- Save cut list with a style → verify it appears under the correct style group in saved list.
- Create new style from cut list save dropdown → verify it appears in the style dropdown and is selected.

### E2E — `tests/e2e/materials.spec.ts`
Add:
- Add style from Styles tab → appears in list.
- Rename style from Styles tab → name updates in list.
- Delete style with no cut lists → removed.
- Delete last style → error toast shown, style not removed.

Update:
- Any tests that navigate to `page-quote` or test style management from the quote calc page → redirect to Materials → Styles tab.

---

## 7. Documentation Updates

- **Stock tab label**: Update the `$ per picket` helper text (currently says "Sets the default $ per picket in the Quote Calculator") to remove the Quote Calculator reference — e.g., "Sets the default $ per picket for pricing."
- **`CLAUDE.md`**: Update Materials page section (4 tabs: Stock, Purchases, Cut List, Styles); remove Quote Calculator page references; update `cut_lists` table schema to include `style text` column; update style management description.
- **`README.md`**: Remove/update any reference to the Quote Calculator page.
- **`tests/README.md`**: Update E2E and smoke test counts.
