# Spec: Add-on Pill Toggles + Completed Order Calendar Fix

**Date:** 2026-03-31

---

## 1. Calendar Fix — Completed Orders

### Problem
When an order is marked complete, `_doCompleteOrder` only sets `status: 'completed'`. It does not clear `pickup_date` or `pickup_time`. The calendar and upcoming pickups widget filter out completed orders in their queries, but the data is cleaner if the fields are nulled out at completion time.

### Fix
In `_doCompleteOrder`, after updating `status: 'completed'`, immediately null out pickup fields:

```js
await sb.from('orders').update({ pickup_date: null, pickup_time: null }).eq('id', data.id);
```

This is data-level correctness: a completed order has no pending pickup, so it should not have a pickup date. Ensures no calendar widget or query can ever display it.

---

## 2. Add-on Pill Toggles (Sale Modal + Inventory Modal)

### Problem
Both modals use `_renderAddonCheckboxes`, which renders bare HTML checkboxes with a label. The look is utilitarian and inconsistent with the dashboard's dark, polished aesthetic.

### Design
Replace the `.addon-row` bare-checkbox rows with flex-wrap pill buttons.

**Visual states:**
- **Unselected:** `--bg-elevated` background, `1px solid var(--warm-gray)` border, `var(--text-muted)` text
- **Selected:** `var(--navy)` background, `white` text, `var(--navy)` border

**Interaction:**
- Clicking a pill toggles the `addon-selected` CSS class on the pill element
- A hidden `input[type="checkbox"]` inside each pill stays in sync so existing `saveSale()` and `saveInvItem()` JS (which query checked checkboxes) continues to work without modification

**Layout:** `display: flex; flex-wrap: wrap; gap: 8px`

### CSS additions
New classes `.addon-pills` and `.addon-pill` added to the add-ons CSS block.

### JS change
`_renderAddonCheckboxes` rebuilt to render pills with hidden checkboxes. All user-derived values (addon id, label) go through `esc()` for XSS safety. Pill `onclick` toggles `addon-selected` class and syncs the hidden checkbox `checked` state.

### Scope
- Only `_renderAddonCheckboxes` is changed — both `renderInvAddons` and `renderSaleAddons` call it
- `.addon-row` CSS left in place (still used by Order modal)
- No changes to `saveSale()`, `saveInvItem()`, or any other JS

---

## Files Changed
- `index.html` — CSS block, `_renderAddonCheckboxes` function, `_doCompleteOrder` function
