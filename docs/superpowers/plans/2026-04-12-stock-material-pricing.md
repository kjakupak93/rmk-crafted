# Stock Material Pricing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-stock cost-per-board pricing stored globally in Supabase so the cut list margin bar always uses the latest user-set material prices.

**Architecture:** A new `settings` row (`key = 'stock_costs'`) stores a JSON object mapping stock name → cost per board. A module-level `STOCK_COSTS` object is loaded at auth/init time alongside addons and product settings. The pencil-edit form and the "Add new stock" form each get a `$/ea` input. `renderClMarginBar()` drops the hardcoded regex + `UNIT_COSTS` approach and uses `STOCK_COSTS` instead. `removeStockType` cleans up its cost entry. Rename in `saveStockEdit` transfers the cost to the new name key.

**Tech Stack:** Vanilla JS, Supabase REST (settings table upsert), Playwright E2E (TypeScript)

---

## Files Modified

- `index.html` — all JS and HTML changes (CSS, HTML form, JS functions)
- `tests/e2e/helpers/cleanup.ts` — extend `SettingsSnapshot` + helpers to include `stock_costs`
- `tests/e2e/materials.spec.ts` — new E2E test for cost edit, persistence, and margin bar

---

### Task 1: Add `STOCK_COSTS` global + `loadStockCosts` + `saveStockCosts`

**Files:**
- Modify: `index.html` — after line 2477 (`const PICKET_PRICE_PER_UNIT = 10;`)

- [ ] **Step 1: Insert new variable and functions after `PICKET_PRICE_PER_UNIT` line**

Find this line in `index.html`:
```js
const PICKET_PRICE_PER_UNIT = 10;
```

Add directly after it:
```js
const STOCK_COSTS_DEFAULTS = {'Cedar Picket 6ft':3.66,'Pine 2×2 8ft':3.23,'Douglas Fir 2×4 8ft':4.17};
let STOCK_COSTS = {...STOCK_COSTS_DEFAULTS};

async function loadStockCosts() {
  const { data: row } = await sb.from('settings').select('value').eq('key','stock_costs').single();
  if (row) {
    try { STOCK_COSTS = JSON.parse(row.value); } catch(e) { STOCK_COSTS = {...STOCK_COSTS_DEFAULTS}; }
  } else {
    STOCK_COSTS = {...STOCK_COSTS_DEFAULTS};
    await saveStockCosts();
  }
}

async function saveStockCosts() {
  const { error } = await sb.from('settings').upsert({ key: 'stock_costs', value: JSON.stringify(STOCK_COSTS) }, { onConflict: 'key' });
  if (error) showToast('Failed to save stock costs', 'error');
}
```

- [ ] **Step 2: Verify no syntax error by searching for the block**

Open `index.html` and confirm the block appears correctly after `const PICKET_PRICE_PER_UNIT = 10;`.

---

### Task 2: Wire `loadStockCosts` into app init

**Files:**
- Modify: `index.html` — line 2386

- [ ] **Step 1: Add `loadStockCosts()` to the settings `Promise.all`**

Find this exact line:
```js
    await Promise.all([loadAddonSettings(), loadProductSettings(), loadProductOptions()]);
```

Replace with:
```js
    await Promise.all([loadAddonSettings(), loadProductSettings(), loadProductOptions(), loadStockCosts()]);
```

---

### Task 3: Add `$/ea` input to HTML form + update `addStockType`

**Files:**
- Modify: `index.html` — HTML form around line 1785, `addStockType` function around line 5135

- [ ] **Step 1: Add `$/ea` input to the "Add new stock" HTML form**

Find this exact block in the HTML:
```html
            <div class="input-group" style="margin-bottom:0;flex:0 0 74px">
              <label>Height (in)</label>
              <input class="std-input" type="number" id="cl-new-stock-hgt" value="" min="0.25" step="0.25" placeholder="opt.">
            </div>
            <button class="btn-secondary" onclick="addStockType()" style="flex-shrink:0">+ Add</button>
```

Replace with:
```html
            <div class="input-group" style="margin-bottom:0;flex:0 0 74px">
              <label>Height (in)</label>
              <input class="std-input" type="number" id="cl-new-stock-hgt" value="" min="0.25" step="0.25" placeholder="opt.">
            </div>
            <div class="input-group" style="margin-bottom:0;flex:0 0 74px">
              <label>$/ea</label>
              <input class="std-input" type="number" id="cl-new-stock-cost" value="" min="0" step="0.01" placeholder="opt.">
            </div>
            <button class="btn-secondary" onclick="addStockType()" style="flex-shrink:0">+ Add</button>
```

- [ ] **Step 2: Update `addStockType` to read cost and save to `STOCK_COSTS`**

Find this exact function:
```js
function addStockType() {
  const nameEl = document.getElementById('cl-new-stock-name');
  const lenEl = document.getElementById('cl-new-stock-len');
  const widEl = document.getElementById('cl-new-stock-wid');
  const hgtEl = document.getElementById('cl-new-stock-hgt');
  const name = (nameEl.value || '').trim();
  const len = parseFloat(lenEl.value) || 0;
  const width = parseFloat(widEl.value) || null;
  const height = hgtEl ? (parseFloat(hgtEl.value) || null) : null;
  if (!name) { showToast('Enter a material name', 'error'); return; }
  if (len <= 0) { showToast('Enter a valid length', 'error'); return; }
  clStockTypes.push({ id: 'st-' + (++clStockIdCounter), name, len, width, height });
  nameEl.value = '';
  lenEl.value = '96';
  widEl.value = '';
  if (hgtEl) hgtEl.value = '';
  renderStockTypes();
}
```

Replace with:
```js
function addStockType() {
  const nameEl = document.getElementById('cl-new-stock-name');
  const lenEl = document.getElementById('cl-new-stock-len');
  const widEl = document.getElementById('cl-new-stock-wid');
  const hgtEl = document.getElementById('cl-new-stock-hgt');
  const costEl = document.getElementById('cl-new-stock-cost');
  const name = (nameEl.value || '').trim();
  const len = parseFloat(lenEl.value) || 0;
  const width = parseFloat(widEl.value) || null;
  const height = hgtEl ? (parseFloat(hgtEl.value) || null) : null;
  const costRaw = costEl?.value;
  const cost = (costRaw !== '' && costRaw != null) ? (parseFloat(costRaw) || 0) : 0;
  if (!name) { showToast('Enter a material name', 'error'); return; }
  if (len <= 0) { showToast('Enter a valid length', 'error'); return; }
  clStockTypes.push({ id: 'st-' + (++clStockIdCounter), name, len, width, height });
  STOCK_COSTS[name] = cost;
  saveStockCosts();
  nameEl.value = '';
  lenEl.value = '96';
  widEl.value = '';
  if (hgtEl) hgtEl.value = '';
  if (costEl) costEl.value = '';
  renderStockTypes();
}
```

---

### Task 4: Update `editStockType`, `saveStockEdit`, `removeStockType`

**Files:**
- Modify: `index.html` — functions starting around lines 5106, 5124, 5154

- [ ] **Step 1: Add cost input to `editStockType`**

Find this exact line inside `editStockType`:
```js
    '<input class="cl-stock-dim" id="cl-sedit-hgt-' + id + '" type="number" value="' + (stock.height || '') + '" min="0.25" step="0.25" title="Height (in)" placeholder="H">' +
    '<button class="btn-secondary" style="font-size:12px;padding:3px 10px;flex-shrink:0" onclick="saveStockEdit(\'' + id + '\')">Save</button>' +
```

Replace with:
```js
    '<input class="cl-stock-dim" id="cl-sedit-hgt-' + id + '" type="number" value="' + (stock.height || '') + '" min="0.25" step="0.25" title="Height (in)" placeholder="H">' +
    '<input class="cl-stock-dim" id="cl-sedit-cost-' + id + '" type="number" value="' + (STOCK_COSTS[stock.name] != null ? STOCK_COSTS[stock.name] : '') + '" min="0" step="0.01" title="Cost per board ($)" placeholder="$/ea">' +
    '<button class="btn-secondary" style="font-size:12px;padding:3px 10px;flex-shrink:0" onclick="saveStockEdit(\'' + id + '\')">Save</button>' +
```

- [ ] **Step 2: Update `saveStockEdit` to read cost and handle rename**

Find this exact function:
```js
function saveStockEdit(id) {
  const stock = clStockTypes.find(s => s.id === id);
  if (!stock) return;
  const name = (document.getElementById('cl-sedit-name-' + id)?.value || '').trim() || stock.name;
  const len = parseFloat(document.getElementById('cl-sedit-len-' + id)?.value) || stock.len;
  const width = parseFloat(document.getElementById('cl-sedit-wid-' + id)?.value) || null;
  const height = parseFloat(document.getElementById('cl-sedit-hgt-' + id)?.value) || null;
  stock.name = name; stock.len = len; stock.width = width; stock.height = height;
  renderStockTypes();
}
```

Replace with:
```js
function saveStockEdit(id) {
  const stock = clStockTypes.find(s => s.id === id);
  if (!stock) return;
  const oldName = stock.name;
  const name = (document.getElementById('cl-sedit-name-' + id)?.value || '').trim() || stock.name;
  const len = parseFloat(document.getElementById('cl-sedit-len-' + id)?.value) || stock.len;
  const width = parseFloat(document.getElementById('cl-sedit-wid-' + id)?.value) || null;
  const height = parseFloat(document.getElementById('cl-sedit-hgt-' + id)?.value) || null;
  const costRaw = document.getElementById('cl-sedit-cost-' + id)?.value;
  const cost = (costRaw !== '' && costRaw != null) ? (parseFloat(costRaw) || 0) : 0;
  stock.name = name; stock.len = len; stock.width = width; stock.height = height;
  if (name !== oldName) delete STOCK_COSTS[oldName];
  STOCK_COSTS[name] = cost;
  saveStockCosts();
  renderStockTypes();
}
```

- [ ] **Step 3: Update `removeStockType` to clean up cost entry**

Find this exact function:
```js
function removeStockType(id) {
  clStockTypes = clStockTypes.filter(s => s.id !== id);
  renderStockTypes();
}
```

Replace with:
```js
function removeStockType(id) {
  const stock = clStockTypes.find(s => s.id === id);
  if (stock) { delete STOCK_COSTS[stock.name]; saveStockCosts(); }
  clStockTypes = clStockTypes.filter(s => s.id !== id);
  renderStockTypes();
}
```

---

### Task 5: Update `renderClMarginBar` to use `STOCK_COSTS`

**Files:**
- Modify: `index.html` — `renderClMarginBar` function starting at line 5448

- [ ] **Step 1: Replace regex cost calculation with `STOCK_COSTS` reduce**

Find these exact lines inside `renderClMarginBar`:
```js
  const picketStock    = clStockTypes.find(s => /picket/i.test(s.shortName || s.name));
  const twobytwoStock  = clStockTypes.find(s => /2.?x.?2|twobytwo/i.test(s.shortName || s.name));
  const twobyfourStock = clStockTypes.find(s => /2.?x.?4|twobyfour/i.test(s.shortName || s.name));
  const picketCount    = picketStock    ? (clLastRunBoardCounts[picketStock.id]    ?? 0) : 0;
  const twobytwoCount  = twobytwoStock  ? (clLastRunBoardCounts[twobytwoStock.id]  ?? 0) : 0;
  const twobyfourCount = twobyfourStock ? (clLastRunBoardCounts[twobyfourStock.id] ?? 0) : 0;
  const cost           = (picketCount * UNIT_COSTS.pickets)
                       + (twobytwoCount * UNIT_COSTS.twobytwo)
                       + (twobyfourCount * UNIT_COSTS.twobyfour);
  const suggestedPrice = picketCount * PICKET_PRICE_PER_UNIT;
```

Replace with:
```js
  const picketStock    = clStockTypes.find(s => /picket/i.test(s.shortName || s.name));
  const picketCount    = picketStock ? (clLastRunBoardCounts[picketStock.id] ?? 0) : 0;
  const cost           = clStockTypes.reduce((sum, s) => {
    return sum + (clLastRunBoardCounts[s.id] || 0) * (STOCK_COSTS[s.name] || 0);
  }, 0);
  const suggestedPrice = picketCount * PICKET_PRICE_PER_UNIT;
```

Note: `picketStock` / `picketCount` remain because `suggestedPrice` still uses `picketCount × PICKET_PRICE_PER_UNIT`. `UNIT_COSTS` is intentionally not removed — it is still used by `estimateOrderCost`, `renderStandardSizesTable`, and quote cost display.

---

### Task 6: Update cleanup helpers to include `stock_costs`

**Files:**
- Modify: `tests/e2e/helpers/cleanup.ts`

- [ ] **Step 1: Add `DEFAULT_STOCK_COSTS` constant**

Find this line:
```typescript
const DEFAULT_PRODUCTS = ['Standard', 'Vertical', 'Tiered', 'Dog Bowl'];
```

Add directly after it:
```typescript
const DEFAULT_STOCK_COSTS: Record<string, number> = {
  'Cedar Picket 6ft': 3.66,
  'Pine 2×2 8ft': 3.23,
  'Douglas Fir 2×4 8ft': 4.17,
};
```

- [ ] **Step 2: Extend `SettingsSnapshot` type**

Find:
```typescript
export type SettingsSnapshot = { addons: string; products: string; product_options: string };
```

Replace with:
```typescript
export type SettingsSnapshot = { addons: string; products: string; product_options: string; stock_costs: string };
```

- [ ] **Step 3: Update `snapshotSettings` to include `stock_costs`**

Find:
```typescript
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/settings?key=in.(addons,products,product_options)&select=key,value`,
    { headers: makeHeaders(token) },
  );
```

Replace with:
```typescript
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/settings?key=in.(addons,products,product_options,stock_costs)&select=key,value`,
    { headers: makeHeaders(token) },
  );
```

Then find:
```typescript
    if (k === 'products') return JSON.stringify(DEFAULT_PRODUCTS);
    return '{}';
```

Replace with:
```typescript
    if (k === 'products') return JSON.stringify(DEFAULT_PRODUCTS);
    if (k === 'stock_costs') return JSON.stringify(DEFAULT_STOCK_COSTS);
    return '{}';
```

Then find:
```typescript
  return { addons: get('addons'), products: get('products'), product_options: get('product_options') };
```

Replace with:
```typescript
  return { addons: get('addons'), products: get('products'), product_options: get('product_options'), stock_costs: get('stock_costs') };
```

- [ ] **Step 4: Update `resetSettings` to reset `stock_costs`**

Find the `for` loop body inside `resetSettings`:
```typescript
  for (const { key, value } of [
    { key: 'addons',          value: JSON.stringify(DEFAULT_ADDONS)   },
    { key: 'products',        value: JSON.stringify(DEFAULT_PRODUCTS) },
    { key: 'product_options', value: '{}'                             },
  ]) {
```

Replace with:
```typescript
  for (const { key, value } of [
    { key: 'addons',          value: JSON.stringify(DEFAULT_ADDONS)      },
    { key: 'products',        value: JSON.stringify(DEFAULT_PRODUCTS)    },
    { key: 'product_options', value: '{}'                                },
    { key: 'stock_costs',     value: JSON.stringify(DEFAULT_STOCK_COSTS) },
  ]) {
```

---

### Task 7: E2E test — cost edit, persistence, margin bar

**Files:**
- Modify: `tests/e2e/materials.spec.ts`

- [ ] **Step 1: Add a `goToCutList` helper near the top of the test file**

Find the existing `goToProducts` helper:
```typescript
async function goToProducts(page: Page) {
  await goToMaterials(page);
  await waitForSettings(page);
  await page.click('button:has-text("Products")');
  await page.waitForSelector('#mtab-products.active');
}
```

Add directly after it:
```typescript
async function goToCutList(page: Page) {
  await goToMaterials(page);
  await waitForSettings(page);
  await page.click('button:has-text("Cut List")');
  await page.waitForSelector('#mtab-cutlist.active');
}
```

- [ ] **Step 2: Add the test at the end of the test file**

Add before the final closing brace of the file (or at the end, after the last `test()` block):
```typescript
test('stock cost editable, persists, and drives margin bar', async ({ page }) => {
  await goToCutList(page);

  // Find the Cedar Picket 6ft row, open edit
  const picketRow = page.locator('#cl-stock-list .cl-stock-row').filter({ hasText: 'Cedar Picket 6ft' });
  await picketRow.locator('button[title="Edit"]').click();

  // Verify cost input is pre-filled with default 3.66
  const costInput = page.locator('[id^="cl-sedit-cost-"]');
  await expect(costInput).toHaveValue('3.66');

  // Change cost to 4.00 and save
  await costInput.fill('4');
  await picketRow.locator('button:has-text("Save")').click();
  await expect(page.locator('#cl-stock-list .cl-stock-row').filter({ hasText: 'Cedar Picket 6ft' })).toBeVisible();

  // Reload page to verify persistence
  await page.reload();
  await waitForSettings(page);
  await page.click('button:has-text("Cut List")');
  await page.waitForSelector('#mtab-cutlist.active');

  const picketRowAfterReload = page.locator('#cl-stock-list .cl-stock-row').filter({ hasText: 'Cedar Picket 6ft' });
  await picketRowAfterReload.locator('button[title="Edit"]').click();
  const costInputAfterReload = page.locator('[id^="cl-sedit-cost-"]');
  await expect(costInputAfterReload).toHaveValue('4');
  // Cancel the edit
  await picketRowAfterReload.locator('button.cl-stock-remove').click();

  // Run a cut list with one 36" piece on pickets → 1 board × $4.00 = $4.00 mat cost
  await page.fill('#cl-name', `${TAG} Cost Test`);
  await page.click('button:has-text("+ Add Part")');
  const lastRow = page.locator('#cl-rows tr:last-child');
  await lastRow.locator('[id^="cl-qty-"]').fill('1');
  await lastRow.locator('[id^="cl-len-"]').fill('36');
  await lastRow.locator('[id^="cl-mat-"]').selectOption({ label: 'Picket 6\'' });
  await page.click('#mtab-cutlist button:has-text("Calculate")');
  await expect(page.locator('#cl-results')).toBeVisible({ timeout: 10000 });

  // Margin bar mat cost should be $4.00 (1 board × $4.00)
  const matCostCol = page.locator('#cl-margin-bar').locator('div').filter({ hasText: /Mat\. Cost/ }).first();
  await expect(matCostCol).toContainText('$4.00');
});
```

Note: `afterAll` in this file calls `restoreSettings(settingsSnapshot)`, which (after Task 6) includes `stock_costs`. This restores the picket cost to 3.66 automatically after the test run.

---

### Task 8: Commit

- [ ] **Step 1: Stage and commit all changes**

```bash
git add index.html tests/e2e/helpers/cleanup.ts tests/e2e/materials.spec.ts
git commit -m "feat: per-stock material pricing stored globally in Supabase"
```

- [ ] **Step 2: Push and wait for GitHub Pages deploy (~60s)**

```bash
git push origin main
```

- [ ] **Step 3: Run E2E tests to verify**

```bash
npx playwright test tests/e2e/materials.spec.ts --project=e2e
```

Expected: all existing tests pass + new `stock cost editable, persists, and drives margin bar` test passes.

---

## Self-Review

**Spec coverage check:**
- ✅ `stock_costs` settings row with JSON map — Task 1
- ✅ `loadStockCosts` + `saveStockCosts` — Task 1
- ✅ Seeded with 3 defaults on first load — Task 1 (`loadStockCosts` upserts defaults if no row)
- ✅ Wired into app init — Task 2
- ✅ `$/ea` input in "Add new stock" form — Task 3
- ✅ `addStockType` saves cost — Task 3
- ✅ Cost input in pencil-edit form, pre-filled — Task 4
- ✅ `saveStockEdit` handles cost + rename correctly — Task 4
- ✅ `removeStockType` cleans up cost — Task 4
- ✅ `renderClMarginBar` uses `STOCK_COSTS` reduce — Task 5
- ✅ `UNIT_COSTS` preserved for `estimateOrderCost` etc. — Task 5 note
- ✅ iOS font-size: `.std-input` covers `#cl-new-stock-cost`; `.cl-stock-dim` covers edit input — no extra CSS needed
- ✅ Cleanup helpers extended for `stock_costs` — Task 6
- ✅ E2E test: cost pre-fill, persistence, margin bar value — Task 7

**Placeholder scan:** None found.

**Type consistency:** `STOCK_COSTS` referenced in Tasks 1, 3, 4, 5 — consistently a `Record<string, number>`. `saveStockCosts` defined in Task 1, called in Tasks 3, 4. `SettingsSnapshot.stock_costs` added in Task 6, consistent with `snapshotSettings` return + `resetSettings` usage.
