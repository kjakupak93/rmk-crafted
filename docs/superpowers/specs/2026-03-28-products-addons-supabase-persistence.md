# Products & Add-ons: Supabase Persistence + Rename Cascades

**Date:** 2026-03-28
**Status:** Approved

## Problem

Products (`PRODUCT_TYPES`) and Add-ons (`ADDONS`) are stored in `localStorage`. This means:
- Data is lost when the browser clears storage or a different browser/device is used
- Renaming a product or add-on label only updates future references — historical records in Supabase retain the old name

## Goals

1. Persist Products and Add-ons in Supabase so they survive across sessions and devices
2. When a product name is renamed, cascade-update all existing records that reference that name
3. When an add-on label is renamed, cascade-update all historical sales records that snapshot the label

## Storage

Use the existing `settings` table (columns: `key text PRIMARY KEY`, `value text`). Two new rows:

| key | value |
|-----|-------|
| `products` | `'["Standard","Vertical","Tiered","Dog Bowl"]'` |
| `addons` | `'[{"id":"sealant","label":"Sealant","base":20,"scales":true},...]'` |

This follows the existing pattern (`picket_price` is already stored here). No schema changes needed.

## Loading

`loadProductSettings()` and `loadAddonSettings()` become async and read from Supabase:

```js
const { data } = await sb.from('settings').select('value').eq('key', 'products').single();
```

**Migration on first load:** If the `products` or `addons` row doesn't exist yet, seed from `localStorage` if present (carrying over any customizations), else fall back to hardcoded defaults. Save to Supabase, then remove from `localStorage`.

Both loads are called during app init alongside existing data fetches (`loadOrders`, etc.). Since they're async, the rest of the app must await them before rendering product/addon-dependent UI.

## Saving

All current `localStorage.setItem('rmk_products', ...)` and `localStorage.setItem('rmk_addons', ...)` calls are replaced with:

```js
await sb.from('settings').upsert({ key: 'products', value: JSON.stringify(PRODUCT_TYPES) }, { onConflict: 'key' });
await sb.from('settings').upsert({ key: 'addons', value: JSON.stringify(ADDONS) }, { onConflict: 'key' });
```

## Cascade: Product Rename

When `saveProductRename(idx)` commits a new name, after saving to `settings`, run four updates in parallel:

```js
await Promise.all([
  sb.from('orders').update({ style: newName }).eq('style', oldName),
  sb.from('sales').update({ style: newName }).eq('style', oldName),
  sb.from('inventory').update({ style: newName }).eq('style', oldName),
  sb.from('cut_lists').update({ style: newName }).eq('style', oldName),
]);
```

Tables with a `style` column that stores product names: `orders`, `sales`, `inventory`, `cut_lists`. The `quotes` table has no `style` column and is unaffected.

## Cascade: Add-on Label Rename

Add-on `id` values are stable identifiers (e.g. `'sealant'`) — they never change. Only `label` is a display name.

Tables that store add-on IDs (not labels): `orders.items.add_ons`, `inventory.add_ons`. These resolve labels at runtime from the in-memory `ADDONS` array, so no DB update needed — they automatically show the new label after `ADDONS` is updated.

`sales.add_ons` stores `{id, label, price}` objects with the label snapshotted at sale time. On rename, update retroactively:

```js
// When saveAddonField(idx, 'label', newLabel) is called:
const addonId = ADDONS[idx].id;
const { data: allSales } = await sb.from('sales').select('id, add_ons').not('add_ons', 'is', null);
const affected = allSales.filter(s => s.add_ons.some(a => a.id === addonId));
await Promise.all(affected.map(s =>
  sb.from('sales').update({
    add_ons: s.add_ons.map(a => a.id === addonId ? { ...a, label: newLabel } : a)
  }).eq('id', s.id)
));
```

No RPC needed — dataset is small for a solo business.

## Add-on `base` / `scales` Changes

These only affect the in-memory `ADDONS` config (used for price suggestions). No cascade — historical sales already have prices locked in.

## Add-on Delete

Deleting an add-on removes it from `ADDONS` and saves to `settings`. Past `sales.add_ons` entries retain the snapshotted `{id, label, price}` and continue to display correctly. Orders/inventory with the deleted ID will show `(custom add-on)` as before — acceptable.

## Product Delete

Unchanged from current behavior: `deleteProduct()` already nulls `cut_lists.style` for affected cut lists. No additional cascade needed since the product name is gone entirely.

## Initialization Order

Both settings reads require an authenticated Supabase session. They must fire **after** `onAuthStateChange` confirms a session (inside the `SIGNED_IN` branch of `initAuth`), not at raw page load.

```
initAuth() → onAuthStateChange SIGNED_IN
  → await Promise.all([loadProductSettings(), loadAddonSettings()])
  → then render product/addon-dependent UI (dropdowns, tabs, order modal)
  → other page loads as normal (loadOrders, loadHomeStats, etc.)
```

`loadAddonSettings()` currently calls `populateAddonSelect()`, `renderOrderAddons()`, `renderInvAddons()`, `renderSaleAddons()` after loading — this stays the same, just async.

## What Does NOT Change

- Add-on `id` values — never mutated
- The `ADDONS` and `PRODUCT_TYPES` in-memory arrays — same structure, same usage everywhere
- All UI rendering code — unchanged
- RLS policies — `settings` table already requires `authenticated` role; no changes needed
