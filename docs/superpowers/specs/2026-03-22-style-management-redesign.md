# Style Management Redesign — Spec

**Date:** 2026-03-22
**Status:** Approved

## Summary

Remove the Quote Calculator page entirely. Move style management to a new Styles tab on the Materials page. Add a style field to the cut list save flow. Organize saved cut lists by style.

---

## 1. Removals

### `page-quote` (Quote Calculator page)
- Delete the `page-quote` div and all its HTML.
- Remove the "Quote Calculator" nav tile from the Home page grid.
- Remove the `page-quote` case from `showPage()`.
- Remove all quote-calc-only JS functions:
  - `calculateQuote()`, `getQuotePrice()`, `getQuoteBasePrice()`, `getQuoteMatCost()`, `updateQCalc()`
  - `copyQuoteMsg()`, `openListingFromQuote()`, `createOrderFromQuote()`, `resetQuote()`
  - Add-on helpers: `addonScaleFactor()`, `addonPrice()`, `getSelectedAddonIds()`, `getAddonTotalFromGrid()`
- Remove `renderStyleButtons()` — style display moves to the new Styles tab.
- Remove `openStyleSettings()`, `removeStyleRow()`, `addStyleRow()`, `saveStyleSettings()` — replaced by the Styles tab UI.

### Kept
- `PRODUCT_STYLES`, `loadStyleSettings()`, `populateStyleSelects()` — these feed inventory/sales dropdowns and the new cut list style field. Keep as-is.

---

## 2. Materials Page — New Styles Tab

### Tab bar
`Stock | Purchases | Cut List | Styles`

New tab button: `<button onclick="showMaterialsTab('mtab-styles', this)">Styles</button>`

### Styles tab content (`#mtab-styles`)
- Renders a list of all current `PRODUCT_STYLES` entries.
- Each row: style name + **Rename** button + **Delete** button.
- **Rename**: prompts for a new name, updates `PRODUCT_STYLES`, saves to localStorage, re-renders.
- **Delete**:
  - If no cut lists use this style: delete immediately.
  - If any cut lists use this style: show confirmation warning — "X cut list(s) use this style. They'll be moved to Uncategorized." — then set `style = null` on those rows in Supabase before deleting from `PRODUCT_STYLES`.
- **Add Style** button at bottom: prompts for a name, adds to `PRODUCT_STYLES`, saves to localStorage, re-renders the tab and all style dropdowns app-wide.
- No reordering.

### Style management functions (new)
- `renderStylesTab()` — renders the styles list in `#mtab-styles`.
- `addStyle(name)` — adds to `PRODUCT_STYLES`, persists, refreshes all style dropdowns.
- `renameStyle(oldName, newName)` — updates `PRODUCT_STYLES`, persists, re-renders.
- `deleteStyle(name)` — checks cut list usage, warns if needed, nullifies DB rows, removes from `PRODUCT_STYLES`, refreshes.

---

## 3. Cut List Tab — Style Field

### Save area changes
Add a style `<select>` inline below the Name field (`#cl-style`):
- Options: blank/empty ("— No style —"), then each style in `PRODUCT_STYLES`, then "New style…" at the bottom.
- Selecting "New style…" prompts for a name:
  - Calls `addStyle(name)` — adds to `PRODUCT_STYLES`, saves to localStorage, refreshes all style dropdowns app-wide.
  - Selects the new style in `#cl-style`.
- Style field is optional. Leaving it blank saves as Uncategorized (null in DB).

### saveCutList() changes
- Read `#cl-style` value; include as `style` in INSERT/UPDATE payload.

### loadCutList() changes
- Restore `#cl-style` selection from loaded cut list data.

---

## 4. Saved Cut Lists — Grouped by Style

### Layout
Replace the flat table with grouped sections:
- One collapsible `<details>` (or always-expanded section) per style, header = style name + count badge.
- **Uncategorized** group at the bottom for null/empty style.
- Groups with zero cut lists are hidden.
- Within each group: same columns as today — Name / Last Modified / Notes — with Load and Delete buttons.

### loadSavedCutLists() changes
- Fetch `style` column alongside existing columns.
- Group results client-side by style value.
- Render grouped sections.

---

## 5. Database Schema

```sql
ALTER TABLE cut_lists ADD COLUMN style text;
```

- Existing rows remain null (display as Uncategorized).
- No RLS changes needed (existing policies cover new column).

---

## 6. Tests

### E2E — `tests/e2e/cutlist-quotes.spec.ts`
Add:
- Save cut list with a style → verify it appears under the correct style group in saved list.
- Create new style from cut list save dropdown → verify it appears in the style dropdown and is selected.

### E2E — `tests/e2e/materials.spec.ts`
Add:
- Add style from Styles tab → appears in list.
- Rename style from Styles tab → name updates in list and dropdowns.
- Delete style with no cut lists → removed.
- Delete style assigned to a cut list → triggers warning, cut list moves to Uncategorized.

Update:
- Any tests that navigate to `page-quote` or test style management from the quote calc page → redirect to Materials → Styles tab.

### Smoke tests (`tests/*.spec.ts`)
- Update nav tile count (one fewer tile on Home page).
- Add: Materials → Styles tab renders style list.

---

## 7. Documentation Updates

- **`CLAUDE.md`**: Update Materials page section (4 tabs); remove Quote Calculator page references; update `cut_lists` table schema to include `style` column; update style management description.
- **`README.md`**: Remove/update any reference to the Quote Calculator page.
- **`tests/README.md`**: Update E2E and smoke test counts.
