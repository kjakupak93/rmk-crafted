# Style Management Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the Quote Calculator page, move style management to a new Materials Styles tab, add a style field to cut list save, and organize saved cut lists by style.

**Architecture:** Single `index.html` file — HTML, CSS, and JS all in one file. Changes touch the HTML structure (remove page-quote, add Styles tab), CSS (remove dead rules), and JS (remove quote-calc functions, add style management functions, update cut list save/load/display). Supabase `cut_lists` table gets a `style` column via SQL migration.

**XSS note:** All innerHTML assignments in this plan use the existing `esc()` utility (defined in index.html), which HTML-encodes untrusted strings. This is the established safe pattern throughout the codebase.

**Tech Stack:** Vanilla JS, HTML/CSS, Supabase (PostgreSQL), Playwright (tests)

**Spec:** `docs/superpowers/specs/2026-03-22-style-management-redesign.md`

---

## File Map

| File | Changes |
|---|---|
| `index.html` | Remove page-quote HTML+JS+CSS, add Styles tab HTML, add style dropdown to cut list, add style management functions, update populateStyleSelects, update saveCutList/loadCutList/loadSavedCutLists, update showMaterialsTab, update goTo, fix stock tab label |
| `tests/quote.spec.ts` | **Delete** |
| `tests/home.spec.ts` | Update tile count 5 to 4 |
| `tests/materials.spec.ts` | Update tab count test (3 to 4 tabs), add Styles tab smoke test |
| `tests/e2e/materials.spec.ts` | Add Styles tab E2E tests (add/rename/delete style, last-style guard) |
| `tests/e2e/cutlist-quotes.spec.ts` | Add cut list style E2E tests (save with style, new style from dropdown) |
| `tests/README.md` | Update test counts |
| `CLAUDE.md` | Update Materials tabs, cut_lists schema, style management description |

---

## Task 1: DB migration — add style column to cut_lists

**Files:**
- No file change — run SQL directly in Supabase

- [ ] **Step 1: Run migration via Supabase MCP**

SQL to run:
  ALTER TABLE cut_lists ADD COLUMN style text;

Use the mcp__claude_ai_Supabase__execute_sql tool with project ref mfsejmfmyuvhuclzuitc.

- [ ] **Step 2: Verify column exists**

SQL to run:
  SELECT column_name, data_type, is_nullable
  FROM information_schema.columns
  WHERE table_name = 'cut_lists' AND column_name = 'style';

Expected: one row, data_type = text, is_nullable = YES.

---

## Task 2: Remove page-quote HTML

**Files:**
- Modify: `index.html:1582` (nav tile), `1661-1754` (page-quote div)

- [ ] **Step 1: Delete the Quote Calculator nav tile**

In index.html around line 1582, delete this line:
  <div class="app-tile app-tile--quote" onclick="goTo('quote')">Quote Calculator</div>

- [ ] **Step 2: Delete the page-quote div**

Delete the entire block from line 1661 to 1754:
  opening tag: <div class="page" id="page-quote">
  closing tag: </div>  (line 1754)

- [ ] **Step 3: Delete the styleSettingsModal HTML**

Delete lines 2432-2444 (the style settings modal, which is no longer reachable after its trigger functions are removed):
  <!-- Style Settings modal -->
  <div class="modal-overlay" id="styleSettingsModal">
    ...
  </div>

- [ ] **Step 4: Verify by searching for remnants**

Run: grep -n "page-quote\|app-tile--quote\|goTo.*quote\|styleSettingsModal" index.html
Expected: zero matches.

- [ ] **Step 5: Commit**

  git add index.html
  git commit -m "feat: remove quote calculator page HTML and style settings modal"

---

## Task 3: Remove quote-calc and style-modal JS functions

**Files:**
- Modify: `index.html` (JS section)

Remove these functions (line ranges approximate — verify before deleting):
- selectStyle (3175-3178)
- getQuotePrice (3243-3259)
- getQuoteBasePrice (3260-3270)
- getQuoteMatCost (3272-3278)
- updateQCalc (3280-3285)
- addonScaleFactor (3288-3291)
- addonPrice (3292-3297)
- getSelectedAddonIds (3298-3300)
- getAddonTotalFromGrid (3324-3330)
- STYLE_META constant (3406-3411)
- renderStyleButtons (3412-3423)
- populateStyleSelects (3425-3433) — will be rewritten in Task 5
- openStyleSettings (3434-3442)
- removeStyleRow (3443-3446)
- addStyleRow (3447-3458)
- saveStyleSettings (3459-3469)
- updateQuoteAddonPrices (3470-3488)
- calculateQuote (3498-3552)
- copyQuoteMsg (3554-3560)
- openListingFromQuote (3562-3570)
- createOrderFromQuote (3572-3595)
- resetQuote (3597-3604)

Also make these targeted edits:
- Remove: let currentStyle = 'Standard'; (line 2596)
- In goTo() line 3040, remove: if (page==='quote') { loadQuotePageData(); }
- In goTo() line 3034 names map, remove: quote:'Quote Calculator',
- In syncAddonChipLabels() line 3333, change:
    ['quoteAddonGrid','orderAddonGrid','invAddonGrid'].forEach(...)
  to:
    ['orderAddonGrid','invAddonGrid'].forEach(...)
- In saveAddonSettings() at line 3401, remove the line:
    updateQuoteAddonPrices();
  (Keep the surrounding lines: syncAddonChipLabels() on line 3400 and updateOrderAddonPrices() on line 3402.)

- [ ] **Step 1: Remove all functions listed above**

- [ ] **Step 2: Make the targeted edits (currentStyle, goTo, syncAddonChipLabels, saveAddonSettings)**

- [ ] **Step 3: Verify no references remain**

Run: grep -n "calculateQuote\|getQuotePrice\|renderStyleButtons\|openStyleSettings\|saveStyleSettings\|currentStyle\|selectStyle\|loadQuotePageData\|quoteAddonGrid\|updateQuoteAddonPrices" index.html
Expected: zero matches.

- [ ] **Step 4: Commit**

  git add index.html
  git commit -m "feat: remove quote calculator JS functions and dead style modal code"

---

## Task 4: Remove dead CSS and fix stale label

**Files:**
- Modify: `index.html` (CSS section ~515-530, stock tab ~1882)

- [ ] **Step 1: Remove these CSS rules (only used by removed quote page style toggle)**

  .style-toggle { ... }
  .style-btn { ... }  (and media query variants)
  .style-btn.active { ... }
  .style-btn .sname { ... }
  .style-btn .sdesc { ... }

- [ ] **Step 2: Update stock tab label at line 1882**

Change: "Sets the default $ per picket in the Quote Calculator."
To:    "Sets the default $ per picket for pricing."

- [ ] **Step 3: Commit**

  git add index.html
  git commit -m "feat: remove dead quote page CSS and update stale stock label"

---

## Task 5: Add Styles tab HTML to Materials page

**Files:**
- Modify: `index.html:1833-1837` (tab bar), after mtab-cutlist closing tag

- [ ] **Step 1: Add the Styles tab button to the tab bar**

The current tab bar (lines 1833-1837) has 3 buttons. Add the 4th button — keep the first 3 exactly as-is:

  <div class="tabs">
    <button class="tab-btn active" onclick="showMaterialsTab('stock',this)">📦 Stock</button>
    <button class="tab-btn" onclick="showMaterialsTab('purchases',this)">🛒 Purchases</button>
    <button class="tab-btn" onclick="showMaterialsTab('cutlist',this)">🪵 Cut List</button>
    <button class="tab-btn" onclick="showMaterialsTab('styles',this)">🎨 Styles</button>
  </div>

- [ ] **Step 2: Add the mtab-styles tab panel after mtab-cutlist closing tag (around line 2013)**

Insert:
  <!-- Styles tab -->
  <div class="tab-panel" id="mtab-styles">
    <h2 style="font-family:'Playfair Display',serif; font-size:22px; color:var(--navy); font-weight:700; margin:0 0 20px;">Planter Styles</h2>
    <div id="styles-list" style="margin-bottom:20px"></div>
    <button class="btn-primary" onclick="promptAddStyle()">+ Add Style</button>
  </div>

- [ ] **Step 3: Add cl-style dropdown to cut list save area**

In mtab-cutlist, after the Name input group (after line 1976, before the Parts section), insert:
  <div class="input-group" style="margin-bottom:14px">
    <label>Style</label>
    <select class="std-input" id="cl-style" onfocus="this.dataset.prev=this.value" onchange="onClStyleChange(this)">
      <option value="">-- No style --</option>
    </select>
  </div>

- [ ] **Step 4: Commit**

  git add index.html
  git commit -m "feat: add Styles tab and cl-style dropdown HTML"

---

## Task 6: Implement style management JS functions

**Files:**
- Modify: `index.html` (JS section — insert after loadStyleSettings around line 2590)

Add these functions in order. All innerHTML usage here is XSS-safe: all dynamic values pass through esc() before insertion.

- [ ] **Step 1: Rewrite populateStyleSelects()**

Replace the old populateStyleSelects (deleted in Task 3) with:

  function populateStyleSelects(selectedVal) {
    const styleOpts = PRODUCT_STYLES.map(s => '<option value="' + esc(s) + '">' + esc(s) + '</option>').join('');
    ['iStyle', 'sStyle'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.innerHTML = styleOpts;
      if (selectedVal && PRODUCT_STYLES.includes(selectedVal)) el.value = selectedVal;
    });
    const clStyleEl = document.getElementById('cl-style');
    if (clStyleEl) {
      const prev = clStyleEl.value;
      clStyleEl.innerHTML = '<option value="">-- No style --</option>' + styleOpts + '<option value="__new__">New style...</option>';
      if (prev && prev !== '__new__' && PRODUCT_STYLES.includes(prev)) {
        clStyleEl.value = prev;
      } else {
        clStyleEl.value = '';
      }
    }
  }

- [ ] **Step 2: Add addStyle(name)**

  function addStyle(name) {
    const trimmed = name.trim();
    if (!trimmed) return false;
    if (PRODUCT_STYLES.some(s => s.toLowerCase() === trimmed.toLowerCase())) {
      showToast('A style with that name already exists', 'error');
      return false;
    }
    PRODUCT_STYLES.push(trimmed);
    localStorage.setItem('rmk_styles', JSON.stringify(PRODUCT_STYLES));
    populateStyleSelects();
    return true;
  }

- [ ] **Step 3: Add promptAddStyle()**

  function promptAddStyle() {
    const name = prompt('Style name:');
    if (!name || !name.trim()) return;
    if (addStyle(name)) {
      renderStylesTab();
      showToast('Style added!');
    }
  }

- [ ] **Step 4: Add renameStyle(oldName)**

  function renameStyle(oldName) {
    const newName = prompt('New name:', oldName);
    if (!newName || !newName.trim()) return;
    const trimmed = newName.trim();
    if (trimmed.toLowerCase() === oldName.toLowerCase()) return;
    if (PRODUCT_STYLES.some(s => s.toLowerCase() === trimmed.toLowerCase())) {
      showToast('A style with that name already exists', 'error');
      return;
    }
    const idx = PRODUCT_STYLES.indexOf(oldName);
    if (idx === -1) return;
    PRODUCT_STYLES[idx] = trimmed;
    localStorage.setItem('rmk_styles', JSON.stringify(PRODUCT_STYLES));
    populateStyleSelects();
    renderStylesTab();
    showToast('Style renamed!');
  }

- [ ] **Step 5: Add deleteStyle(name)**

  async function deleteStyle(name) {
    if (PRODUCT_STYLES.length <= 1) {
      showToast('At least one style is required', 'error');
      return;
    }
    const { data: affected } = await sb.from('cut_lists').select('id').eq('style', name);
    const count = affected ? affected.length : 0;
    const msg = count > 0
      ? count + ' cut list(s) use this style. They\'ll be moved to Uncategorized. Delete style "' + name + '"?'
      : 'Delete style "' + name + '"?';
    if (!confirm(msg)) return;
    if (count > 0) {
      await sb.from('cut_lists').update({ style: null }).eq('style', name);
    }
    PRODUCT_STYLES = PRODUCT_STYLES.filter(s => s !== name);
    localStorage.setItem('rmk_styles', JSON.stringify(PRODUCT_STYLES));
    populateStyleSelects();
    renderStylesTab();
    showToast('Style deleted');
  }

- [ ] **Step 6: Add renderStylesTab()**

All dynamic content here passes through esc() — safe for innerHTML.

  function renderStylesTab() {
    const container = document.getElementById('styles-list');
    if (!container) return;
    if (!PRODUCT_STYLES.length) {
      container.textContent = 'No styles yet.';
      return;
    }
    container.innerHTML = PRODUCT_STYLES.map(s =>
      '<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--warm-gray)">' +
        '<span style="flex:1;font-size:15px;font-weight:600;color:var(--navy)">' + esc(s) + '</span>' +
        '<button class="btn-secondary" style="font-size:12px;padding:4px 10px" onclick="renameStyle(\'' + esc(s).replace(/'/g,"&#39;") + '\')">Rename</button>' +
        '<button class="icon-btn" style="color:var(--red)" onclick="deleteStyle(\'' + esc(s).replace(/'/g,"&#39;") + '\')" title="Delete">🗑</button>' +
      '</div>'
    ).join('');
  }

- [ ] **Step 7: Update showMaterialsTab() to call renderStylesTab() for styles tab**

Find showMaterialsTab (line 4933). Change from:
  function showMaterialsTab(tab, btn) {
    ...
    if (tab==='purchases') loadPurchases();
    if (tab==='cutlist') loadSavedCutLists();
  }

To:
  function showMaterialsTab(tab, btn) {
    ...
    if (tab==='purchases') loadPurchases();
    if (tab==='cutlist') loadSavedCutLists();
    if (tab==='styles') renderStylesTab();
  }

- [ ] **Step 8: Verify loadStyleSettings() calls populateStyleSelects() at startup**

Check lines 2581-2590. If the last line of loadStyleSettings() does not call populateStyleSelects(), add it so cl-style is populated on page load.

- [ ] **Step 9: Commit**

  git add index.html
  git commit -m "feat: add style management functions (renderStylesTab, addStyle, renameStyle, deleteStyle)"

---

## Task 7: Handle "New style" selection in cl-style dropdown

**Files:**
- Modify: `index.html` (JS section)

- [ ] **Step 1: Add onClStyleChange() to JS**

  function onClStyleChange(sel) {
    if (sel.value !== '__new__') return;
    const prev = sel.dataset.prev || '';
    const name = prompt('New style name:');
    if (!name || !name.trim()) {
      sel.value = prev;
      return;
    }
    if (!addStyle(name)) {
      sel.value = prev;
      return;
    }
    renderStylesTab();
    sel.value = name.trim();
    showToast('Style added!');
  }

(The onfocus="this.dataset.prev=this.value" and onchange="onClStyleChange(this)" were already added to the HTML in Task 5.)

- [ ] **Step 2: Commit**

  git add index.html
  git commit -m "feat: handle new style creation from cut list style dropdown"

---

## Task 8: Update saveCutList() and loadCutList() for style field

**Files:**
- Modify: `index.html:4848-4922`

- [ ] **Step 1: Update saveCutList()**

After reading `cl-notes` (line 4854), add:
  const styleVal = document.getElementById('cl-style').value;
  const style = (styleVal && styleVal !== '__new__') ? styleVal : null;

In the UPDATE call (line 4862), add style to the payload:
  .update({ name, kerf, cuts, stock_types, notes, style, updated_at: new Date().toISOString() })

In the INSERT call (line 4864), add style to the payload:
  .insert({ name, picket_len, kerf, cuts, stock_types, notes, style })

- [ ] **Step 2: Update loadCutList()**

After `document.getElementById('cl-notes').value = cl.notes || '';` (line 4912), add:
  const clStyleEl = document.getElementById('cl-style');
  if (clStyleEl) {
    const storedStyle = cl.style || '';
    clStyleEl.value = (storedStyle && PRODUCT_STYLES.includes(storedStyle)) ? storedStyle : '';
  }

- [ ] **Step 3: Commit**

  git add index.html
  git commit -m "feat: include style in cut list save/load"

---

## Task 9: Update loadSavedCutLists() to group by style

**Files:**
- Modify: `index.html:4871-4901`

All innerHTML usage below uses esc() on all dynamic values — XSS safe.

- [ ] **Step 1: Replace loadSavedCutLists() function body**

The new function body:

  async function loadSavedCutLists() {
    const { data } = await sb.from('cut_lists').select('*').order('updated_at', { ascending: false });
    allCutLists = data || [];
    const container = document.getElementById('cl-saved-list');
    if (!data || !data.length) {
      container.innerHTML = '<p style="font-size:13px;color:var(--text-muted)">No saved cut lists yet.</p>';
      return;
    }

    const groups = {};
    PRODUCT_STYLES.forEach(s => { groups[s] = []; });
    groups['__uncategorized__'] = [];
    data.forEach(cl => {
      const key = (cl.style && PRODUCT_STYLES.includes(cl.style)) ? cl.style : '__uncategorized__';
      groups[key].push(cl);
    });

    function renderRows(items) {
      return items.map(cl => {
        const modified = new Date(cl.updated_at || cl.created_at);
        const dateStr = modified.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        return '<tr>' +
          '<td style="font-weight:600;color:var(--navy)">' + esc(cl.name) + '</td>' +
          '<td style="font-family:\'DM Mono\',monospace;font-size:12px;white-space:nowrap">' + dateStr + '</td>' +
          '<td style="color:var(--text-muted);font-size:12px">' + (esc(cl.notes) || '—') + '</td>' +
          '<td style="white-space:nowrap"><div style="display:flex;gap:6px;justify-content:flex-end">' +
            '<button class="btn-secondary" style="font-size:12px;padding:4px 10px" onclick="loadCutList(\'' + cl.id + '\')">Load</button>' +
            '<button class="icon-btn" style="color:var(--red)" onclick="deleteCutList(\'' + cl.id + '\')" title="Delete">🗑</button>' +
          '</div></td>' +
        '</tr>';
      }).join('');
    }

    function renderGroup(label, items) {
      if (!items.length) return '';
      const thStyle = 'font-family:\'DM Sans\',sans-serif;font-size:12px;letter-spacing:0;font-weight:600';
      return '<div style="margin-bottom:20px">' +
        '<div class="section-label" style="margin-bottom:8px">' + esc(label) +
          ' <span style="font-weight:400;color:var(--text-muted)">(' + items.length + ')</span></div>' +
        '<div class="table-wrap"><table class="data-table"><thead><tr>' +
          '<th style="' + thStyle + '">Name</th>' +
          '<th style="' + thStyle + ';width:140px;white-space:nowrap">Last Modified</th>' +
          '<th style="' + thStyle + '">Notes</th>' +
          '<th style="width:100px"></th>' +
        '</tr></thead><tbody>' + renderRows(items) + '</tbody></table></div></div>';
    }

    let html = PRODUCT_STYLES.map(s => renderGroup(s, groups[s])).join('');
    html += renderGroup('Uncategorized', groups['__uncategorized__']);
    container.innerHTML = html;
  }

- [ ] **Step 2: Commit**

  git add index.html
  git commit -m "feat: group saved cut lists by style in loadSavedCutLists"

---

## Task 10: Delete tests/quote.spec.ts and update smoke tests

**Files:**
- Delete: `tests/quote.spec.ts`
- Modify: `tests/home.spec.ts`
- Modify: `tests/materials.spec.ts`

- [ ] **Step 1: Delete tests/quote.spec.ts**

  git rm tests/quote.spec.ts

- [ ] **Step 2: Update tests/home.spec.ts tile count from 5 to 4**

Change:
  test('5 nav tiles are present', async ({ page }) => {
    await expect(page.locator('.app-tile')).toHaveCount(5);
  });

To:
  test('4 nav tiles are present', async ({ page }) => {
    await expect(page.locator('.app-tile')).toHaveCount(4);
  });

- [ ] **Step 3: Update tests/materials.spec.ts — fix tab count and add Styles tab test**

Change the test name from 'all 3 materials tabs...' to 'all 4 materials tabs...' and add index 3 (Styles) check:

  test('all 4 materials tabs switch the active panel', async ({ page }) => {
    const tabs = page.locator('#page-materials .tab-btn');

    await tabs.nth(1).click();
    await expect(page.locator('#mtab-purchases')).toHaveClass(/active/);
    await expect(page.locator('#mtab-stock')).not.toHaveClass(/active/);

    await tabs.nth(2).click();
    await expect(page.locator('#mtab-cutlist')).toHaveClass(/active/);

    await tabs.nth(3).click();
    await expect(page.locator('#mtab-styles')).toHaveClass(/active/);

    await tabs.nth(0).click();
    await expect(page.locator('#mtab-stock')).toHaveClass(/active/);
  });

Add a new test:

  test('Styles tab renders style list with at least one style', async ({ page }) => {
    const tabs = page.locator('#page-materials .tab-btn');
    await tabs.nth(3).click();
    await expect(page.locator('#mtab-styles')).toHaveClass(/active/);
    await expect(page.locator('#styles-list div').first()).toBeVisible();
  });

- [ ] **Step 4: Run smoke suite**

  npx playwright test --project=smoke

Expected: all pass (4 tiles, 4 tabs, Styles tab visible).

- [ ] **Step 5: Commit**

  git add tests/home.spec.ts tests/materials.spec.ts
  git commit -m "test: update smoke tests for removed quote page and new styles tab"

---

## Task 11: Add E2E tests for Styles tab

**Files:**
- Modify: `tests/e2e/materials.spec.ts`

- [ ] **Step 1: Add goToStyles helper**

After the existing goToMaterials helper add:

  async function goToStyles(page: Page) {
    await goToMaterials(page);
    await page.click('button:has-text("Styles")');
    await page.waitForSelector('#mtab-styles.active');
  }

- [ ] **Step 2: Add test — add style appears in list**

  test('add style from Styles tab appears in list', async ({ page }) => {
    const styleName = `${TAG} TestStyle`;
    await goToStyles(page);
    page.once('dialog', d => d.accept(styleName));
    await page.click('#mtab-styles button:has-text("+ Add Style")');
    await expect(page.locator('#styles-list').getByText(styleName)).toBeVisible({ timeout: 5000 });
  });

- [ ] **Step 3: Add test — rename style updates name**

  test('rename style from Styles tab updates name in list', async ({ page }) => {
    const original = `${TAG} RenameMe`;
    const renamed = `${TAG} Renamed`;
    await goToStyles(page);
    page.once('dialog', d => d.accept(original));
    await page.click('#mtab-styles button:has-text("+ Add Style")');
    await expect(page.locator('#styles-list').getByText(original)).toBeVisible({ timeout: 5000 });
    const row = page.locator('#styles-list div').filter({ hasText: original });
    page.once('dialog', d => d.accept(renamed));
    await row.locator('button:has-text("Rename")').click();
    await expect(page.locator('#styles-list').getByText(renamed)).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#styles-list').getByText(original)).toHaveCount(0);
  });

- [ ] **Step 4: Add test — delete style removes it**

  test('delete style with no cut lists removes it from list', async ({ page }) => {
    const styleName = `${TAG} DeleteMe`;
    await goToStyles(page);
    page.once('dialog', d => d.accept(styleName));
    await page.click('#mtab-styles button:has-text("+ Add Style")');
    await expect(page.locator('#styles-list').getByText(styleName)).toBeVisible({ timeout: 5000 });
    const row = page.locator('#styles-list div').filter({ hasText: styleName });
    page.once('dialog', d => d.accept());
    await row.locator('.icon-btn').click();
    await expect(page.locator('#styles-list').getByText(styleName)).toHaveCount(0);
  });

- [ ] **Step 5: Add test — last style cannot be deleted**

  test('deleting the last remaining style shows error and keeps it', async ({ page }) => {
    await goToStyles(page);
    const rows = page.locator('#styles-list div[style*="border-bottom"]');
    const count = await rows.count();
    if (count !== 1) { test.skip(); return; }
    await rows.first().locator('.icon-btn').click();
    await expect(page.locator('.toast, [class*="toast"]')).toContainText('required', { timeout: 5000 });
    await expect(rows).toHaveCount(1);
  });

- [ ] **Step 6: Run new tests**

  npx playwright test --project=e2e tests/e2e/materials.spec.ts

Expected: all pass.

- [ ] **Step 7: Commit**

  git add tests/e2e/materials.spec.ts
  git commit -m "test: add E2E tests for Styles tab (add/rename/delete/last-style guard)"

---

## Task 12: Add E2E tests for cut list style field

**Files:**
- Modify: `tests/e2e/cutlist-quotes.spec.ts`

- [ ] **Step 1: Add test — save cut list with style groups it correctly**

  test('save cut list with a style groups it under that style in saved list', async ({ page }) => {
    const cutListName = `${TAG} Styled CL`;
    await goToCutList(page);
    await addPartRowAndRun(page, cutListName);
    await page.selectOption('#cl-style', 'Standard');
    await page.locator('#mtab-cutlist button:has-text("Save")').click();
    await expect(page.locator('#cl-saved-list')).toContainText('Standard', { timeout: 10000 });
    await expect(page.locator('#cl-saved-list')).toContainText(cutListName);
  });

- [ ] **Step 2: Add test — new style from cut list dropdown**

  test('creating new style from cut list dropdown adds it and selects it', async ({ page }) => {
    const newStyleName = `${TAG} NewStyle`;
    await goToCutList(page);
    page.once('dialog', d => d.accept(newStyleName));
    await page.selectOption('#cl-style', '__new__');
    await expect(page.locator('#cl-style')).toHaveValue(newStyleName, { timeout: 5000 });
  });

- [ ] **Step 3: Run full E2E suite to confirm no regressions**

  npx playwright test --project=e2e

Expected: all pass.

- [ ] **Step 4: Commit**

  git add tests/e2e/cutlist-quotes.spec.ts
  git commit -m "test: add E2E tests for cut list style field and new-style creation"

---

## Task 13: Update documentation

**Files:**
- Modify: `CLAUDE.md`, `README.md`, `tests/README.md`

- [ ] **Step 1: Update CLAUDE.md**

Pages section — remove the Quote Calculator (page-quote) bullet.

Materials page entry — update to show 4 tabs:
  Stock levels + Lowes purchase log + Cut List Calculator tab + Styles tab

Database Tables section — update cut_lists row to include style column:
  columns: id, name, kerf, cuts (JSONB), stock_types (JSONB), notes, style (text nullable), created_at, updated_at

Non-Obvious Details — remove references to renderStyleButtons, openStyleSettings, saveStyleSettings, currentStyle, selectStyle. Add:
  Style management lives in Materials Styles tab. addStyle(), renameStyle(), deleteStyle() are the functions. populateStyleSelects() refreshes all style dropdowns (iStyle, sStyle, cl-style) app-wide.
  Saved cut lists are grouped by style in loadSavedCutLists(). cl.style = null renders in Uncategorized group.

Remove the "Manage styles button on the quote page" reference; replace with "Styles tab on the Materials page."

- [ ] **Step 2: Update README.md**

Search README.md for any mention of "Quote Calculator" and remove or update those references.

- [ ] **Step 3: Update tests/README.md**

Smoke Suite table: remove quote.spec.ts row. Update total count (22 minus ~2 quote tests = ~20, plus ~2 new materials tests = ~22).

E2E Suite table: update cutlist-quotes.spec.ts count from 5 to 7. Update materials.spec.ts count from 8 to 12.

- [ ] **Step 4: Commit**

  git add CLAUDE.md README.md tests/README.md
  git commit -m "docs: update CLAUDE.md, README, and tests/README for style management redesign"

---

## Task 14: Final verification

- [ ] **Step 1: Run full test suite**

  npx playwright test

Expected: all tests pass.

- [ ] **Step 2: Verify no dead code remains**

  grep -n "page-quote\|app-tile--quote\|calculateQuote\|renderStyleButtons\|openStyleSettings\|saveStyleSettings\|currentStyle\b\|selectStyle\b\|STYLE_META\|quoteAddonGrid\|loadQuotePageData" index.html

Expected: zero matches.

- [ ] **Step 3: Manual smoke check**

Run local server: python3 -m http.server 8080
Log in and verify:
- Home page has 4 tiles (no Quote Calculator)
- Materials Styles tab shows style list with Rename and Delete buttons
- Cut List tab has style dropdown with existing styles and "New style..." option
- Saving a cut list with a style groups it under that style in the saved list
- Creating a new style from the cut list dropdown works and selects the new style

- [ ] **Step 4: Push to GitHub**

  git push origin main

Wait ~60s for GitHub Pages deploy. Spot-check the live site.
