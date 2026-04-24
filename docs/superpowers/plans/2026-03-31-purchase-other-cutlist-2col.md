# Purchase "Other" Material + Cut List 2-Column Layout — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an "Other" option to the purchase modal material dropdown, and reorganise the Cut List tab into a 2-column desktop layout (left: stock materials + saved lists; right: new cut list + results).

**Architecture:** All changes are isolated edits to `index.html` — CSS additions, HTML restructuring, and two small JS changes. No new DB columns, no new files, no JS refactoring beyond the purchase save loop.

**Tech Stack:** Vanilla JS, CSS Grid, Supabase JS client (`sb`)

---

### Task 1: Add "Other" to PURCH_MAT_PRICES and addPurchaseMaterialRow

**Files:**
- Modify: `index.html` — line 5249 (`PURCH_MAT_PRICES`), lines 5259–5264 (`addPurchaseMaterialRow` options array)

- [ ] **Step 1: Read current state**

Read `index.html` lines 5249–5264 to confirm the exact current code:

```
const PURCH_MAT_PRICES={pickets:3.66,twobytwo:3.23,twobyfour:4.17};

function addPurchaseMaterialRow(matType,qty,price) {
  matType=matType||'pickets'; qty=qty||''; price=price!=null?price:'';
  ...
  [['pickets','Cedar Pickets'],['twobytwo','2×2s'],['twobyfour','2×4s']].forEach(function(pair){
```

- [ ] **Step 2: Add `other: 0` to PURCH_MAT_PRICES**

Change line 5249 from:
```
const PURCH_MAT_PRICES={pickets:3.66,twobytwo:3.23,twobyfour:4.17};
```
To:
```
const PURCH_MAT_PRICES={pickets:3.66,twobytwo:3.23,twobyfour:4.17,other:0};
```

This ensures that when the user selects "Other", the `change` event (`priceIn.value=PURCH_MAT_PRICES[sel.value]||''`) sets the price field to empty (0 resolves to falsy for `||''`), prompting manual entry.

- [ ] **Step 3: Add 'Other' option to the dropdown array**

Find the options array in `addPurchaseMaterialRow` (~line 5259):
```
  [['pickets','Cedar Pickets'],['twobytwo','2×2s'],['twobyfour','2×4s']].forEach(function(pair){
```

Change it to:
```
  [['pickets','Cedar Pickets'],['twobytwo','2×2s'],['twobyfour','2×4s'],['other','Other']].forEach(function(pair){
```

- [ ] **Step 4: Manual verification**

1. Open the app → Materials → click **+ Log Purchase**
2. The material dropdown should show four options: Cedar Pickets, 2×2s, 2×4s, **Other**
3. Select "Other" — the price field should clear (show placeholder `$/ea`)
4. Switch back to Cedar Pickets — price should auto-fill to `3.66`

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat: add Other option to purchase material dropdown"
```

---

### Task 2: Skip "other" rows in savePurchase stock sync

**Files:**
- Modify: `index.html` — lines 5306–5322 (`savePurchase` function)

- [ ] **Step 1: Read current savePurchase loop**

Read `index.html` lines 5306–5322. The current loop is:

```
async function savePurchase() {
  let pickets=0,pp=3.66,t22=0,t22p=3.23,t24=0,t24p=4.17;
  document.querySelectorAll('.purch-mat-row').forEach(function(row){
    const sel=row.querySelector('select');
    const inputs=row.querySelectorAll('input');
    const qty=parseInt(inputs[0].value)||0;
    const price=parseFloat(inputs[1].value)||0;
    if (sel.value==='pickets'){pickets=qty;pp=price;}
    else if (sel.value==='twobytwo'){t22=qty;t22p=price;}
    else if (sel.value==='twobyfour'){t24=qty;t24p=price;}
  });
```

- [ ] **Step 2: Verify no change needed**

The loop already has an implicit `else` — rows with `sel.value==='other'` don't match any branch, so they are silently skipped. `pickets`, `t22`, `t24` remain 0 for those rows. **No code change is needed in the loop itself.**

Confirm the validation guard on ~line 5321:
```
  if (!pickets&&!t22&&!t24&&!total) {showToast('Enter materials or a total amount','error');return;}
```

When only "Other" rows exist, `pickets=0`, `t22=0`, `t24=0` — but `total` (calculated from `calcTotal = qty×price`) will be non-zero, so the guard passes correctly. **No change needed.**

- [ ] **Step 3: Manual verification**

1. Open the app → Materials → **+ Log Purchase**
2. Add a row: select "Other", qty=2, price=8.50
3. Click **Save** — should succeed with toast "Purchase logged!"
4. The purchase should appear in the purchases list showing the correct total ($17.00)
5. Check Supabase `purchases` table: `pickets=0`, `twobytwo=0`, `twobyfour=0`, `total=17`
6. Check Supabase `stock` table: no changes (rows should be unchanged)

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "test: verify Other purchase skips stock sync (no code change needed)"
```

Note: if verification in Step 3 fails and the guard blocks saving, the fix is to change the guard to also check `calcTotal`:
```
  if (!pickets&&!t22&&!t24&&!total&&!calcTotal) {showToast('Enter materials or a total amount','error');return;}
```

---

### Task 3: Add CSS for cut list 2-column grid

**Files:**
- Modify: `index.html` — CSS block, after the existing `.build-calc` rules (~line 791)

- [ ] **Step 1: Find insertion point**

Read `index.html` lines 791–793:
```
.build-calc { background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 18px; margin-bottom: 24px; }
.build-calc h3 { font-family: 'Playfair Display', serif; font-size: 17px; color: var(--ocean-light); margin-bottom: 4px; }
.build-calc p { font-size: 13px; color: var(--text-muted); margin-bottom: 14px; }
```

- [ ] **Step 2: Add grid CSS after the .build-calc block**

Insert the following two rules immediately after line 793 (after the `.build-calc p` rule):

```css
#cl-columns { display:grid; grid-template-columns:1fr 1fr; gap:20px; align-items:start; }
#cl-col-left > div:last-child { margin-top:0; }
@media (max-width:1024px) { #cl-columns { grid-template-columns:1fr; } }
```

`#cl-col-left > div:last-child` targets the saved cut lists wrapper (which has `margin-top:24px`) and resets it to 0 inside the column, since the `gap:20px` on `#cl-columns` already provides the spacing.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "style: add cl-columns 2-column grid CSS for cut list tab"
```

---

### Task 4: Restructure cut list tab HTML into 2 columns

**Files:**
- Modify: `index.html` — lines 1601–1686 (`#mtab-cutlist` tab panel content)

- [ ] **Step 1: Read current HTML structure**

Read `index.html` lines 1601–1686. The current structure inside `#mtab-cutlist` is:

```
<div class="tab-panel" id="mtab-cutlist">
  <h2 ...>Cut List Calculator</h2>
  <p ...>subtitle</p>

  <!-- Stock Materials -->
  <div class="build-calc" style="margin-bottom:16px">   ← line 1606
    ...
  </div>                                                 ← line 1634

  <!-- New Cut List -->
  <div class="build-calc" id="cut-list-calc">           ← line 1636
    ...
    <div id="cl-results" style="display:none">          ← line 1671
      ...
    </div>
  </div>                                                 ← line 1675

  <!-- Saved Cut Lists -->
  <div style="margin-top:24px">                         ← line 1678
    ...
  </div>                                                 ← line 1685
</div>
```

- [ ] **Step 2: Wrap sections in column divs**

Replace the content from line 1606 to line 1685 (everything after the `<p>` subtitle and before the closing `</div>` of `#mtab-cutlist`) with the new column structure below.

The h2 and p subtitle (lines 1602–1603) stay outside the columns — only the three section divs move inside.

New structure:

```html
      <div id="cl-columns">
        <div id="cl-col-left">
          <!-- Stock Materials (unchanged) -->
          <div class="build-calc" style="margin-bottom:16px">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;flex-wrap:wrap;gap:8px">
              <h3 style="margin:0">Stock Materials</h3>
              <div class="input-group" style="margin-bottom:0;width:148px">
                <label style="font-size:11px">Blade kerf (in)</label>
                <input class="std-input" type="number" id="cl-kerf" value="0.11" min="0" step="0.01" placeholder="0.11">
              </div>
            </div>
            <div class="cl-stock-list-wrap" id="cl-stock-list-wrap"><div id="cl-stock-list"></div></div>
            <div style="display:flex;gap:8px;align-items:flex-end;margin-top:8px;flex-wrap:wrap">
              <div class="input-group" style="margin-bottom:0;flex:1;min-width:120px">
                <label>Name</label>
                <input class="std-input" type="text" id="cl-new-stock-name" placeholder="e.g. Cedar Picket 8ft">
              </div>
              <div class="input-group" style="margin-bottom:0;flex:0 0 74px">
                <label>Length (in)</label>
                <input class="std-input" type="number" id="cl-new-stock-len" value="96" min="1" step="0.25">
              </div>
              <div class="input-group" style="margin-bottom:0;flex:0 0 74px">
                <label>Width (in)</label>
                <input class="std-input" type="number" id="cl-new-stock-wid" value="" min="0.25" step="0.25" placeholder="opt.">
              </div>
              <div class="input-group" style="margin-bottom:0;flex:0 0 74px">
                <label>Height (in)</label>
                <input class="std-input" type="number" id="cl-new-stock-hgt" value="" min="0.25" step="0.25" placeholder="opt.">
              </div>
              <button class="btn-secondary" onclick="addStockType()" style="flex-shrink:0">+ Add</button>
            </div>
          </div>

          <!-- Saved Cut Lists (unchanged except margin-top removed — handled by CSS) -->
          <div style="margin-top:24px">
            <div class="section-header" style="margin-bottom:12px">
              <h3 style="margin:0;font-family:'Playfair Display',serif;font-size:17px;color:var(--navy)">Saved Cut Lists</h3>
            </div>
            <div id="cl-saved-list">
              <p style="font-size:13px;color:var(--text-muted)">No saved cut lists yet.</p>
            </div>
          </div>
        </div>

        <div id="cl-col-right">
          <!-- New Cut List (unchanged) -->
          <div class="build-calc" id="cut-list-calc">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:12px;flex-wrap:wrap">
              <h3 style="margin:0">New Cut List</h3>
              <button class="btn-secondary" onclick="clearCutList()" style="font-size:12px;padding:5px 10px">Clear</button>
            </div>
            <div class="input-group" style="margin-bottom:14px">
              <label>Cut list name</label>
              <input class="std-input" type="text" id="cl-name" placeholder="e.g. 36×16×16 Standard">
            </div>
            <div class="input-group" style="margin-bottom:14px">
              <label>Product</label>
              <select class="std-input" id="cl-product" onfocus="this.dataset.prev=this.value" onchange="onClProductChange(this)">
                <option value="">— No product —</option>
              </select>
              <div id="cl-product-options" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px"></div>
            </div>
            <div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:8px">Parts</div>
            <div class="table-wrap" style="margin-bottom:10px">
              <table class="data-table">
                <thead><tr><th style="width:32px">#</th><th>Description</th><th style="width:90px">Qty</th><th style="width:130px">Length"</th><th style="width:120px">Width"</th><th>Material</th><th style="width:32px"></th></tr></thead>
                <tbody id="cl-rows"></tbody>
              </table>
            </div>
            <div class="input-group" style="margin-bottom:12px">
              <label>Notes</label>
              <textarea class="std-input" id="cl-notes" rows="2" placeholder="Optional notes about this cut list…" style="resize:vertical;min-height:48px;font-size:14px"></textarea>
            </div>
            <div style="display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap">
              <button class="btn-secondary" onclick="addCutRow()">+ Add Part</button>
              <button class="btn-primary" onclick="runCutList()">Calculate</button>
              <button class="btn-primary" onclick="saveCutList()" style="background:var(--green)">💾 Save</button>
              <button id="cl-quote-btn" class="btn btn-secondary" onclick="openCreateQuoteModal()" disabled title="Run Calculate first">+ Quote</button>
            </div>
            <div id="cl-results" style="display:none">
              <div id="cl-diagram"></div>
              <div id="cl-parts-table" style="margin-top:20px"></div>
            </div>
          </div>
        </div>
      </div>
```

- [ ] **Step 3: Manual verification**

1. Open the app → Materials → Cut List tab (desktop width ≥1025px)
   - Left column: Stock Materials section on top, Saved Cut Lists below
   - Right column: New Cut List form (name, product, parts table, notes, buttons)
2. Run a calculate — the results (board diagram + parts table) appear in the right column below the buttons
3. Resize browser to ≤1024px — columns stack: stock materials on top, then saved lists, then new cut list, then results
4. Confirm all IDs still work: add a cut row, save a cut list, load a saved cut list — all JS should function identically

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: restructure cut list tab into 2-column desktop layout"
```

---

### Task 5: Push and confirm deployment

- [ ] **Step 1: Push to main**

```bash
git push origin main
```

- [ ] **Step 2: Confirm GitHub Pages deployment (~60s)**

Open the live URL and verify:
- Purchase modal shows "Other" as a 4th material option
- Cut List tab shows 2-column layout on desktop
- Cut List tab stacks to single column on mobile
