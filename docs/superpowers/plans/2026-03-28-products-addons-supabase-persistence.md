# Products & Add-ons: Supabase Persistence + Rename Cascades — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move Products and Add-ons from localStorage to Supabase `settings` table, and cascade renames to all affected records.

**Architecture:** The existing `settings` table (key/value) gets two new rows — `products` and `addons`. `loadAddonSettings()` and `loadProductSettings()` become async Supabase reads called after auth is confirmed. Rename operations additionally UPDATE all tables that store the old name/label.

**Tech Stack:** Vanilla JS, Supabase JS client (`sb`), single `index.html` file.

---

## Files

- Modify: `index.html` — all changes are in this single file

### Key line references (current state):
- `loadAddonSettings()` — line 2484
- `saveAddons()` — line 2498
- `saveAddonField()` — line 2501
- `addNewAddon()` — line 2506
- `deleteAddon()` — line 2511
- `loadProductSettings()` — line 2642
- `addProduct()` — line 2673
- `saveProductRename()` — line 2698
- `deleteProduct()` — line 2729
- `initAuth` IIFE — line 2389
- INIT section — line 5614

---

## Task 1: Convert `loadAddonSettings` to async Supabase read with localStorage migration

**Files:** Modify `index.html`

- [ ] **Step 1: Replace `loadAddonSettings` with async version**

Find and replace the entire function (lines 2484–2497):

```js
// OLD:
function loadAddonSettings() {
  try {
    const saved = localStorage.getItem('rmk_addons');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) ADDONS = parsed;
      else localStorage.removeItem('rmk_addons'); // clear corrupt data
    }
  } catch(e) { localStorage.removeItem('rmk_addons'); }
  populateAddonSelect();
  renderOrderAddons();
  renderInvAddons();
  renderSaleAddons();
}
```

Replace with:

```js
async function loadAddonSettings() {
  const { data: row } = await sb.from('settings').select('value').eq('key', 'addons').single();
  if (row) {
    try {
      const parsed = JSON.parse(row.value);
      if (Array.isArray(parsed) && parsed.length > 0) ADDONS = parsed;
    } catch(e) { /* ignore corrupt */ }
  } else {
    // First load: migrate from localStorage if present, else keep defaults
    const lsVal = localStorage.getItem('rmk_addons');
    if (lsVal) {
      try {
        const parsed = JSON.parse(lsVal);
        if (Array.isArray(parsed) && parsed.length > 0) ADDONS = parsed;
      } catch(e) { /* ignore */ }
    }
    await sb.from('settings').upsert({ key: 'addons', value: JSON.stringify(ADDONS) }, { onConflict: 'key' });
    localStorage.removeItem('rmk_addons');
  }
  populateAddonSelect();
  renderOrderAddons();
  renderInvAddons();
  renderSaleAddons();
}
```

- [ ] **Step 2: Replace `saveAddons` to write to Supabase**

Find and replace `saveAddons()` (lines 2498–2500):

```js
// OLD:
function saveAddons() {
  localStorage.setItem('rmk_addons', JSON.stringify(ADDONS));
}
```

Replace with:

```js
async function saveAddons() {
  await sb.from('settings').upsert({ key: 'addons', value: JSON.stringify(ADDONS) }, { onConflict: 'key' });
}
```

- [ ] **Step 3: Make `saveAddonField`, `addNewAddon`, `deleteAddon` await saveAddons**

`saveAddons` is now async. Update callers:

```js
// OLD:
function saveAddonField(idx, key, value) {
  if (!ADDONS[idx]) return;
  ADDONS[idx][key] = value;
  saveAddons();
}
function addNewAddon() {
  ADDONS.push({id:'addon_'+Date.now(), label:'New Add-on', base:0, scales:false});
  saveAddons();
  renderAddonsTab();
}
function deleteAddon(idx) {
  ADDONS.splice(idx, 1);
  saveAddons();
  renderAddonsTab();
}
```

Replace with:

```js
async function saveAddonField(idx, key, value) {
  if (!ADDONS[idx]) return;
  ADDONS[idx][key] = value;
  await saveAddons();
}
async function addNewAddon() {
  ADDONS.push({id:'addon_'+Date.now(), label:'New Add-on', base:0, scales:false});
  await saveAddons();
  renderAddonsTab();
}
async function deleteAddon(idx) {
  ADDONS.splice(idx, 1);
  await saveAddons();
  renderAddonsTab();
}
```

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: migrate loadAddonSettings/saveAddons to Supabase settings table"
```

---

## Task 2: Add cascade update to `saveAddonField` when label changes

When `saveAddonField` is called with `key === 'label'`, update the label in all `sales.add_ons` JSONB entries that reference the same add-on `id`.

**Files:** Modify `index.html`

- [ ] **Step 1: Update `saveAddonField` to cascade on label rename**

Replace the `saveAddonField` function written in Task 1 with:

```js
async function saveAddonField(idx, key, value) {
  if (!ADDONS[idx]) return;
  const oldLabel = ADDONS[idx].label;
  const addonId = ADDONS[idx].id;
  ADDONS[idx][key] = value;
  await saveAddons();
  // Cascade: if label changed, update historical sales records
  if (key === 'label' && value !== oldLabel) {
    const { data: allSales } = await sb.from('sales').select('id, add_ons').not('add_ons', 'is', null);
    if (allSales) {
      const affected = allSales.filter(s => Array.isArray(s.add_ons) && s.add_ons.some(a => a.id === addonId));
      await Promise.all(affected.map(s =>
        sb.from('sales').update({
          add_ons: s.add_ons.map(a => a.id === addonId ? { ...a, label: value } : a)
        }).eq('id', s.id)
      ));
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "feat: cascade add-on label rename to historical sales records"
```

---

## Task 3: Convert `loadProductSettings` to async Supabase read with localStorage migration

**Files:** Modify `index.html`

- [ ] **Step 1: Replace `loadProductSettings` with async version**

Find and replace the entire function (lines 2642–2651):

```js
// OLD:
function loadProductSettings() {
  try {
    const saved = localStorage.getItem('rmk_products');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) PRODUCT_TYPES = parsed;
      else localStorage.removeItem('rmk_products');
    }
  } catch(e) { localStorage.removeItem('rmk_products'); }
}
```

Replace with:

```js
async function loadProductSettings() {
  const { data: row } = await sb.from('settings').select('value').eq('key', 'products').single();
  if (row) {
    try {
      const parsed = JSON.parse(row.value);
      if (Array.isArray(parsed) && parsed.length > 0) PRODUCT_TYPES = parsed;
    } catch(e) { /* ignore corrupt */ }
  } else {
    // First load: migrate from localStorage if present, else keep defaults
    const lsVal = localStorage.getItem('rmk_products');
    if (lsVal) {
      try {
        const parsed = JSON.parse(lsVal);
        if (Array.isArray(parsed) && parsed.length > 0) PRODUCT_TYPES = parsed;
      } catch(e) { /* ignore */ }
    }
    await sb.from('settings').upsert({ key: 'products', value: JSON.stringify(PRODUCT_TYPES) }, { onConflict: 'key' });
    localStorage.removeItem('rmk_products');
  }
}
```

- [ ] **Step 2: Update `addProduct` to upsert to Supabase**

Find and replace the `localStorage.setItem` line in `addProduct` (currently line 2681):

```js
// OLD:
  localStorage.setItem('rmk_products', JSON.stringify(PRODUCT_TYPES));
```

Replace with (note: `addProduct` must become async):

```js
// Find addProduct function and make it async:
async function addProduct(name) {
  const trimmed = name.trim();
  if (!trimmed) return false;
  if (PRODUCT_TYPES.some(s => s.toLowerCase() === trimmed.toLowerCase())) {
    showToast('A product with that name already exists', 'error');
    return false;
  }
  PRODUCT_TYPES.push(trimmed);
  await sb.from('settings').upsert({ key: 'products', value: JSON.stringify(PRODUCT_TYPES) }, { onConflict: 'key' });
  populateProductSelects();
  return true;
}
```

- [ ] **Step 3: Update `deleteProduct` to upsert to Supabase**

In `deleteProduct` (async function, line 2729), replace the `localStorage.setItem` line:

```js
// OLD:
  localStorage.setItem('rmk_products', JSON.stringify(PRODUCT_TYPES));
```

Replace with:

```js
  await sb.from('settings').upsert({ key: 'products', value: JSON.stringify(PRODUCT_TYPES) }, { onConflict: 'key' });
```

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: migrate loadProductSettings/addProduct/deleteProduct to Supabase settings table"
```

---

## Task 4: Add cascade update to `saveProductRename`

When a product is renamed, update `style` on all four affected tables. Also switch from localStorage to Supabase.

**Files:** Modify `index.html`

- [ ] **Step 1: Replace `saveProductRename` with async cascade version**

Find and replace `saveProductRename` (lines 2698–2714):

```js
// OLD:
function saveProductRename(idx) {
  const inp = document.getElementById('prod-rename-inp');
  if (!inp) return;
  const trimmed = inp.value.trim();
  const oldName = PRODUCT_TYPES[idx];
  if (!trimmed) return;
  if (trimmed.toLowerCase() === oldName.toLowerCase()) { cancelProductRename(); return; }
  if (PRODUCT_TYPES.some((s, i) => i !== idx && s.toLowerCase() === trimmed.toLowerCase())) {
    showToast('A product with that name already exists', 'error');
    return;
  }
  PRODUCT_TYPES[idx] = trimmed;
  localStorage.setItem('rmk_products', JSON.stringify(PRODUCT_TYPES));
  populateProductSelects();
  _editingProductIdx = null;
  renderProductsTab();
  showToast('Product renamed!');
}
```

Replace with:

```js
async function saveProductRename(idx) {
  const inp = document.getElementById('prod-rename-inp');
  if (!inp) return;
  const trimmed = inp.value.trim();
  const oldName = PRODUCT_TYPES[idx];
  if (!trimmed) return;
  if (trimmed.toLowerCase() === oldName.toLowerCase()) { cancelProductRename(); return; }
  if (PRODUCT_TYPES.some((s, i) => i !== idx && s.toLowerCase() === trimmed.toLowerCase())) {
    showToast('A product with that name already exists', 'error');
    return;
  }
  PRODUCT_TYPES[idx] = trimmed;
  await sb.from('settings').upsert({ key: 'products', value: JSON.stringify(PRODUCT_TYPES) }, { onConflict: 'key' });
  // Cascade: update all records that reference the old product name
  await Promise.all([
    sb.from('orders').update({ style: trimmed }).eq('style', oldName),
    sb.from('sales').update({ style: trimmed }).eq('style', oldName),
    sb.from('inventory').update({ style: trimmed }).eq('style', oldName),
    sb.from('cut_lists').update({ style: trimmed }).eq('style', oldName),
  ]);
  populateProductSelects();
  _editingProductIdx = null;
  renderProductsTab();
  showToast('Product renamed!');
}
```

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "feat: cascade product rename to orders/sales/inventory/cut_lists"
```

---

## Task 5: Wire async settings loading into the auth flow

`loadAddonSettings()` and `loadProductSettings()` now require an authenticated session. Move their invocation out of the synchronous INIT block and into the auth handler so they run after sign-in is confirmed.

**Files:** Modify `index.html`

- [ ] **Step 1: Update `initAuth` to await settings after session is confirmed**

Find the `initAuth` IIFE (line 2389). Replace it with:

```js
(function initAuth() {
  function showGate() {
    document.getElementById('pin-gate').style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }
  function hideGate() {
    document.getElementById('pin-gate').style.display = 'none';
    document.body.style.overflow = '';
  }

  let _settingsLoaded = false;
  async function loadSettings() {
    if (_settingsLoaded) return;
    _settingsLoaded = true;
    await Promise.all([loadAddonSettings(), loadProductSettings()]);
    populateProductSelects();
  }

  sb.auth.getSession().then(({ data: { session } }) => {
    if (session) { hideGate(); loadSettings(); }
  });

  sb.auth.onAuthStateChange((event, session) => {
    if (session) {
      hideGate();
      loadSettings();
    } else {
      showGate();
      _settingsLoaded = false;
    }
  });
})();
```

- [ ] **Step 2: Remove the old synchronous calls from the INIT section**

Find the INIT section near the bottom of the file (line 5614). Remove the three lines:

```js
// REMOVE these three lines:
loadAddonSettings();
loadProductSettings();
populateProductSelects();
```

The INIT section should now look like:

```js
// ===== INIT =====
buildStdTable();
setHomeGreeting();
// Apply saved dark mode preference
if (localStorage.getItem('rmk_theme') === 'dark') applyDarkMode(true);
checkConnection();
```

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: load Products/Add-ons from Supabase after auth, remove localStorage init"
```

---

## Task 6: Smoke test and verify

- [ ] **Step 1: Open the app in a browser and sign in**

Navigate to the live GitHub Pages URL (or open `index.html` locally with the Supabase credentials available). Sign in with the usual credentials.

Expected: Products and Add-ons load correctly in dropdowns (Materials → Products tab, Materials → Add-ons tab, order modal).

- [ ] **Step 2: Check Supabase `settings` table has been seeded**

Open Supabase dashboard → Table Editor → `settings`. Verify rows exist:
- `key='products'`, value is a JSON array of product names
- `key='addons'`, value is a JSON array of addon objects

- [ ] **Step 3: Rename a product and verify cascade**

1. Go to Materials → Products tab
2. Rename "Standard" → "Classic"
3. Check Orders page — any order with style "Standard" should now show "Classic"
4. Check Sales History — any sale with style "Standard" should now show "Classic"
5. Check Supabase: `settings` row for `products` updated, `orders`/`sales`/`inventory`/`cut_lists` rows updated

- [ ] **Step 4: Rename an add-on label and verify cascade**

1. Go to Materials → Add-ons tab
2. Change "Fabric Liner" → "Felt Liner" (click away to trigger onblur)
3. Check Sales History — any sale that had "Fabric Liner" add-on should now show "Felt Liner"
4. Check order modal add-on dropdown — should show "Felt Liner"

- [ ] **Step 5: Add a new product and verify it persists after page reload**

1. Add a new product "Raised Bed"
2. Hard-reload the page and sign in
3. Verify "Raised Bed" still appears in product dropdowns

- [ ] **Step 6: Run e2e test suite to catch regressions**

```bash
npx playwright test --project=e2e
```

Expected: All tests pass. Pay attention to `materials.spec.ts` (covers add/rename/delete product, add/delete add-on).

- [ ] **Step 7: Commit if any minor fixes were needed, then push**

```bash
git push origin main
```

Expected: GitHub Pages deploys in ~60s.
