# Quote Calculator: Modifiable Picket Pricing & Stock Visibility Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the per-picket selling price configurable globally (saved in Supabase) and editable per-quote, and show current material stock levels inside the quote calculator.

**Architecture:** All changes live in the single `index.html` file. A new `settings` Supabase table stores the global picket price. A new `loadQuotePageData()` function fetches settings + stock in parallel on quote page navigation, pre-fills `#qPPP`, and renders the stock strip. The Materials page gets a new UI control to edit and save the global default.

**Tech Stack:** Vanilla HTML/CSS/JS · Supabase JS v2 (`sb` client) · No build step

---

## Chunk 1: Supabase setup + JS foundation

### Task 1: Create `settings` table in Supabase

This is a manual step in the Supabase dashboard — no code to write.

**Files:** None (Supabase dashboard only)

- [ ] **Step 1: Open Supabase SQL editor**

  Go to your Supabase project → SQL Editor → New query.

- [ ] **Step 2: Run this SQL**

  ```sql
  create table settings (
    key   text primary key,
    value text not null
  );

  -- Open anon read/write (consistent with other tables in this tool)
  alter table settings enable row level security;
  create policy "anon all" on settings for all to anon using (true) with check (true);

  -- Seed the default picket price
  insert into settings (key, value) values ('picket_price', '10');
  ```

- [ ] **Step 3: Verify**

  Run `select * from settings;` — should return one row: `key=picket_price, value=10`.

---

### Task 2: Add `defaultPicketPrice` global and `loadQuotePageData()`

**Files:**
- Modify: `rmk-crafted/index.html` (JS section)
  - Near other globals (around line 2242 where `UNIT_COSTS` is declared)
  - Near `goTo()` at line 2521

- [ ] **Step 1: Add the global variable**

  Find this line (~2242):
  ```js
  const UNIT_COSTS = {pickets:3.66, twobytwo:3.23, twobyfour:4.17};
  ```

  Add this line immediately after it:
  ```js
  let defaultPicketPrice = 10;
  ```

- [ ] **Step 2: Add `renderQuoteStockStrip()` and `loadQuotePageData()` functions**

  Find this block (~2530):
  ```js
  if (page==='materials') { loadStock(); }
  ```

  Add both functions somewhere nearby in the JS (e.g., right before `goTo()`).

  `renderQuoteStockStrip()` renders the stock badges in the quote calculator. It is defined here (before `loadQuotePageData()` which calls it) to avoid a `ReferenceError` during testing:

  ```js
  function renderQuoteStockStrip(stock) {
    const strip = document.getElementById('quoteStockStrip');
    if (!strip) return;
    const items = [
      { key: 'pickets',   label: 'Cedar Pickets' },
      { key: 'twobytwo',  label: '2×2 Lumber' },
      { key: 'twobyfour', label: '2×4 Lumber' }
    ];
    strip.innerHTML = items.map(({ key, label }) => {
      const qty = stock[key] ?? '—';
      const cls = typeof qty === 'number' ? (qty <= 5 ? 'low' : qty <= 15 ? 'medium' : 'good') : '';
      return `<div class="quote-stock-badge">
        <span class="qsb-label">${label}</span>
        <span class="qsb-qty ${cls}">${qty}</span>
      </div>`;
    }).join('');
  }
  ```

  `loadQuotePageData()` fetches settings and stock in parallel. The stock fetch here is a lightweight, quote-page-only query — it does NOT interact with `stockData` or the Materials page DOM (which `loadStock()` manages separately). Both fetches are independent:

  ```js
  async function loadQuotePageData() {
    const [settingsRes, stockRes] = await Promise.all([
      sb.from('settings').select('*'),
      sb.from('stock').select('*')
    ]);

    // Update default picket price (falls back to 10 if row missing or value is NaN)
    const priceSetting = (settingsRes.data || []).find(r => r.key === 'picket_price');
    if (priceSetting) defaultPicketPrice = parseFloat(priceSetting.value) || 10;

    // Pre-fill #qPPP with the global default
    const qppp = document.getElementById('qPPP');
    if (qppp) qppp.value = defaultPicketPrice;

    // Sync helper text span
    const helper = document.getElementById('qHelperPPP');
    if (helper) helper.textContent = '$' + defaultPicketPrice;

    // Render stock strip (quote-only, independent of stockData global)
    const stock = {};
    (stockRes.data || []).forEach(r => { stock[r.material] = r.qty || 0; });
    renderQuoteStockStrip(stock);
  }
  ```

- [ ] **Step 3: Wire `loadQuotePageData()` into `goTo()`**

  Find (line ~2530):
  ```js
  if (page==='materials') { loadStock(); }
  ```

  Add this line immediately after it:
  ```js
  if (page==='quote') { loadQuotePageData(); }
  ```

- [ ] **Step 4: Manually verify in browser**

  Navigate to the Quote Calculator page. Open DevTools console — confirm `loadQuotePageData` is called (no errors). The `#qPPP` field should still show `10` (since the DB default is 10).

---

## Chunk 2: Quote calculator UI changes

### Task 3: Add stock strip HTML to quote calculator

**Files:**
- Modify: `rmk-crafted/index.html` (HTML section, quote page ~line 1506)

- [ ] **Step 1: Add CSS for the stock strip**

  Find the `.stock-qty.good` CSS rule (line ~666):
  ```css
  .stock-qty.good { color: var(--green); }
  ```

  Add these new rules immediately after. New classes are used (not `.stock-qty`) because `.stock-qty` has `font-size:26px` which is too large for the compact badge layout:
  ```css
  .quote-stock-strip { display:flex; gap:10px; margin-bottom:16px; flex-wrap:wrap; }
  .quote-stock-badge { display:flex; align-items:center; gap:6px; background:white; border:1px solid var(--warm-gray); border-radius:8px; padding:6px 12px; font-family:'DM Mono',monospace; font-size:13px; }
  .quote-stock-badge .qsb-label { color:var(--text-muted); font-size:12px; }
  .quote-stock-badge .qsb-qty { font-weight:600; }
  .quote-stock-badge .qsb-qty.low    { color: var(--red); }
  .quote-stock-badge .qsb-qty.medium { color: var(--orange); }
  .quote-stock-badge .qsb-qty.good   { color: var(--green); }
  ```

- [ ] **Step 2: Add stock strip placeholder HTML**

  Find this line in `#page-quote` (~line 1506):
  ```html
      <div class="section-label">Materials</div>
  ```

  Insert the stock strip div immediately before it:
  ```html
      <div class="quote-stock-strip" id="quoteStockStrip"></div>
      <div class="section-label">Materials</div>
  ```

  Note: `renderQuoteStockStrip()` was already added in Task 2 — no JS function to add here.

- [ ] **Step 3: Verify in browser**

  Navigate to Quote Calculator. The stock strip should appear above "Materials" showing 3 badges with the correct quantities and colors matching the Materials → Stock page.

---

### Task 4: Update helper text and wire `updateQCalc()`

**Files:**
- Modify: `rmk-crafted/index.html` (HTML ~line 1509, JS ~line 2777)

- [ ] **Step 1: Update the stale helper text**

  Find (line ~1509):
  ```html
      <p>Price = pickets × $10. Material cost = pickets × $3.66.</p>
  ```

  Replace with:
  ```html
      <p>Price = pickets × <span id="qHelperPPP">$10</span>. Material cost = pickets × $3.66.</p>
  ```

- [ ] **Step 2: Wire `updateQCalc()` to sync helper text and recalculate**

  The `loadQuotePageData()` function (added in Task 2) already syncs `#qHelperPPP` on page navigation. Now also handle the case where the user edits `#qPPP` mid-quote. Replace the no-op `updateQCalc()` (~line 2777) with:
  ```js
  function updateQCalc() {
    const ppp = parseFloat(document.getElementById('qPPP').value) || 10;
    const helper = document.getElementById('qHelperPPP');
    if (helper) helper.textContent = '$' + ppp;
    calculateQuote();
  }
  ```

  This replaces the current no-op `updateQCalc()` at line ~2777.

- [ ] **Step 3: Verify real-time updates**

  In the browser: enter picket count, then change `#qPPP` — the quoted price should update immediately without pressing "Calculate Quote →". The helper text `$X` should update to match.

---

## Chunk 3: Materials page — global price editor

### Task 5: Add "Selling Price per Picket" field to Materials page

**Files:**
- Modify: `rmk-crafted/index.html` (HTML ~line 1692, JS — new function)

- [ ] **Step 1: Add HTML for the price editor**

  Find the closing `</div>` of the `.stock-grid` on the Materials stock tab (line ~1692):
  ```html
      </div>

      <div class="summary-bar">
  ```

  Insert the price editor between the stock grid and summary bar:
  ```html
      </div>

      <div style="margin:16px 0; padding:14px 16px; background:white; border:1px solid var(--warm-gray); border-radius:10px; display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
        <label style="font-size:13px; font-weight:600; color:var(--text); white-space:nowrap;">Selling Price per Picket</label>
        <input class="std-input" type="number" id="matPicketPrice" min="0" step="0.5" placeholder="10" style="width:90px; margin:0;">
        <button class="btn-primary" style="padding:8px 16px; font-size:13px;" onclick="savePicketPrice()">Save</button>
        <span style="font-size:12px; color:var(--text-muted);">Sets the default $ per picket in the Quote Calculator.</span>
      </div>

      <div class="summary-bar">
  ```

- [ ] **Step 2: Pre-fill `#matPicketPrice` when Materials page loads**

  The Materials page loads via `loadStock()` (called from `goTo('materials')`). At the end of `loadStock()` (after line ~3651), add:

  ```js
  // Pre-fill the selling price field from settings
  const { data: sData } = await sb.from('settings').select('value').eq('key','picket_price').single();
  const matField = document.getElementById('matPicketPrice');
  if (matField && sData) matField.value = parseFloat(sData.value) || 10;
  ```

  Note: `loadStock()` is already `async`, so `await` works here.

- [ ] **Step 3: Add `savePicketPrice()` JS function**

  Add near `loadQuotePageData()`:

  ```js
  async function savePicketPrice() {
    const val = parseFloat(document.getElementById('matPicketPrice').value);
    if (!val || val <= 0) { showToast('Enter a valid price', 'error'); return; }
    const { error } = await sb.from('settings').upsert({ key: 'picket_price', value: String(val) }, { onConflict: 'key' });
    if (error) { showToast('Error saving price', 'error'); return; }
    defaultPicketPrice = val;
    showToast('Saved', 'success');
  }
  ```

- [ ] **Step 4: Verify end-to-end**

  1. Go to Materials page → change "Selling Price per Picket" to `12` → click Save → toast shows "Saved".
  2. Go to Quote Calculator → `#qPPP` shows `12`.
  3. In Supabase Table Editor, confirm `settings` row has `value = '12'`.
  4. Reload the page, go back to Quote Calculator → `#qPPP` should still show `12` (loaded fresh from DB).

---

## Final Verification Checklist

- [ ] `settings` table exists with `picket_price` row
- [ ] Materials page shows "Selling Price per Picket" field, pre-filled from DB, saves via upsert
- [ ] Saving on Materials page updates `defaultPicketPrice` in memory — no reload needed before quoting
- [ ] Navigating to Quote Calculator pre-fills `#qPPP` with the global default
- [ ] Editing `#qPPP` in the quote calculator recalculates price in real time
- [ ] Helper text "Price = pickets × $X" updates when `#qPPP` changes
- [ ] Stock strip shows all 3 materials with correct counts and color coding (≤5 red, 6–15 orange, >15 green)
- [ ] Stock strip values match the Materials → Stock page
