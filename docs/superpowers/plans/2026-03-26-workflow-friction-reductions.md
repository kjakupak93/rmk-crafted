# Workflow Friction Reductions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Four targeted UX improvements that reduce workflow friction: clarify the Skip button label, auto-navigate to Quotes after saving a quote, add a "+ New Order" shortcut on Home, and carry cut-list size into quote→order conversion.

**Architecture:** All changes are in `index.html` (vanilla JS/HTML, no build step). Tests live in `tests/` (smoke, Playwright) and `tests/e2e/` (E2E, Playwright). Docs updated in `README.md` and `CLAUDE.md`.

**Tech Stack:** Vanilla JS, HTML, Supabase, Playwright for testing, GitHub Pages for deploy.

---

## Files Modified

| File | What changes |
|---|---|
| `index.html` | 4 targeted edits (button label, saveQuote nav, home button, convertQuoteToOrder size) |
| `tests/e2e/orders.spec.ts` | Update skip-button selector to match new label text |
| `tests/e2e/cutlist-quotes.spec.ts` | Add 2 new tests: auto-nav to quotes, size carry-through |
| `tests/home.spec.ts` | Add smoke test for "+ New Order" button on home |
| `README.md` | Update Quotes tab description and Home section |
| `CLAUDE.md` | Update `openOrderModal` non-obvious detail about prefill.size |

---

## Task 1: Relabel the Skip button

**Files:**
- Modify: `index.html` line 2263

- [ ] **Step 1: Edit the button label**

  In `index.html` at line 2263, change:
  ```html
  <button class="modal-btn-cancel" style="width:100%" onclick="finishCompleteOrder('unpaid')">Skip — not paid yet</button>
  ```
  to:
  ```html
  <button class="modal-btn-cancel" style="width:100%" onclick="finishCompleteOrder('unpaid')">Skip — stays in Active until paid</button>
  ```

- [ ] **Step 2: Update the E2E test selector**

  In `tests/e2e/orders.spec.ts` line 176, the selector uses `:has-text("Skip")` — this is a partial match and will still work. Update the test title and comment to reflect the new label so docs stay in sync:

  Change line 167:
  ```typescript
  test('Skip — not paid yet closes payment modal and order stays in Active', async ({ page }) => {
  ```
  to:
  ```typescript
  test('Skip — stays in Active until paid closes payment modal and order stays in Active', async ({ page }) => {
  ```

  The `page.click('#completePaymentModal button:has-text("Skip")')` selector at line 176 continues to match since `:has-text` does partial matching — no functional change needed there.

- [ ] **Step 3: Verify tests pass locally**

  ```bash
  npx playwright test tests/e2e/orders.spec.ts --project=e2e
  ```
  Expected: all tests in the file pass (specifically the Skip test).

- [ ] **Step 4: Commit**

  ```bash
  git add index.html tests/e2e/orders.spec.ts
  git commit -m "fix: clarify skip payment button label in complete order modal"
  ```

---

## Task 2: Auto-navigate to Quotes tab after saveQuote()

**Files:**
- Modify: `index.html` — `saveQuote()` function (~line 4803)
- Modify: `tests/e2e/cutlist-quotes.spec.ts` — add 1 new test

- [ ] **Step 1: Write the failing E2E test**

  Add this test to `tests/e2e/cutlist-quotes.spec.ts`, before the closing of the file (after the last test):

  ```typescript
  test('saving a quote auto-navigates to the Quotes tab', async ({ page }) => {
    const quoteName = `${TAG} AutoNav`;
    const cutListName = `${TAG} CL AutoNav`;
    await goToCutList(page);
    await addPartRowAndRun(page, cutListName);
    await expect(page.locator('#cl-quote-btn')).not.toBeDisabled({ timeout: 5000 });
    await page.click('#cl-quote-btn');
    await page.waitForSelector('#createQuoteModal.open');
    await page.fill('#cqName', quoteName);
    await page.click('button:has-text("Create Quote")');

    // After saving, should auto-navigate to Orders > Quotes tab
    await expect(page.locator('#page-orders')).toHaveClass(/active/, { timeout: 5000 });
    await expect(page.locator('#otab-quotes')).toHaveClass(/active/, { timeout: 5000 });
    await expect(page.locator('#otab-quotes tr').filter({ hasText: quoteName })).toBeVisible({ timeout: 10000 });
  });
  ```

- [ ] **Step 2: Run test to confirm it fails**

  ```bash
  npx playwright test tests/e2e/cutlist-quotes.spec.ts --project=e2e -g "auto-navigates"
  ```
  Expected: FAIL — page stays on Materials after save.

- [ ] **Step 3: Implement the auto-navigation in saveQuote()**

  In `index.html`, find `saveQuote()` (~line 4801). The current ending is:
  ```js
  showToast('Quote created!', 'success');
  closeModal('createQuoteModal');
  ```

  Change to:
  ```js
  showToast('Quote created!', 'success');
  closeModal('createQuoteModal');
  goTo('orders');
  document.querySelector('#orders-tabs .tab-btn[onclick*="quotes"]')?.click();
  ```

- [ ] **Step 4: Run the new test to confirm it passes**

  ```bash
  npx playwright test tests/e2e/cutlist-quotes.spec.ts --project=e2e -g "auto-navigates"
  ```
  Expected: PASS.

- [ ] **Step 5: Run the full cutlist-quotes suite to confirm no regressions**

  ```bash
  npx playwright test tests/e2e/cutlist-quotes.spec.ts --project=e2e
  ```
  Expected: all tests pass.

- [ ] **Step 6: Commit**

  ```bash
  git add index.html tests/e2e/cutlist-quotes.spec.ts
  git commit -m "feat: auto-navigate to Quotes tab after saving a quote"
  ```

---

## Task 3: "+ New Order" shortcut button on Home page

**Files:**
- Modify: `index.html` — `#page-home` HTML, after the `home-hero` div (~line 1462)
- Modify: `tests/home.spec.ts` — add 1 smoke test

- [ ] **Step 1: Write the failing smoke test**

  Add to `tests/home.spec.ts` (after the last test):
  ```typescript
  test('+ New Order shortcut button opens the order modal', async ({ page }) => {
    await expect(page.locator('button:has-text("+ New Order")').first()).toBeVisible();
    await page.locator('button:has-text("+ New Order")').first().click();
    await expect(page.locator('#orderModal')).toHaveClass(/open/, { timeout: 5000 });
  });
  ```

- [ ] **Step 2: Run test to confirm it fails**

  ```bash
  npx playwright test tests/home.spec.ts --project=smoke
  ```
  Expected: FAIL — button not found.

- [ ] **Step 3: Add the button to the Home page HTML**

  In `index.html`, find the `home-hero` closing `</div>` (~line 1462). Insert the button immediately after it:
  ```html
  </div>
  <div style="text-align:center;margin:0 0 16px">
    <button class="btn-primary" style="font-size:15px;padding:11px 32px" onclick="goTo('orders');openOrderModal()">+ New Order</button>
  </div>
  ```

  Note: `goTo('orders')` navigates to the Orders page synchronously (shows the page, hides others). `openOrderModal()` opens the modal immediately after — no async dependency, so the sequence is safe inline.
  ```

- [ ] **Step 4: Run the smoke test to confirm it passes**

  ```bash
  npx playwright test tests/home.spec.ts --project=smoke
  ```
  Expected: all tests pass including the new one.

- [ ] **Step 5: Commit**

  ```bash
  git add index.html tests/home.spec.ts
  git commit -m "feat: add New Order shortcut button to Home page"
  ```

---

## Task 4: Carry cut-list size into quote→order conversion

**Files:**
- Modify: `index.html` — `convertQuoteToOrder()` (~line 3601) and `openOrderModal()` prefill block (~line 3588)
- Modify: `tests/e2e/cutlist-quotes.spec.ts` — add 1 new test

- [ ] **Step 1: Write the failing E2E test**

  Add to `tests/e2e/cutlist-quotes.spec.ts`:
  ```typescript
  test('convert quote carries size from cut list name into order modal', async ({ page }) => {
    // Cut list name contains a size pattern — should carry through to the order modal
    const size = '36×16×16';
    const cutListName = `${TAG} ${size} Standard`;
    const quoteName = `${TAG} Size Carry`;

    await goToCutList(page);
    await addPartRowAndRun(page, cutListName);
    await expect(page.locator('#cl-quote-btn')).not.toBeDisabled({ timeout: 5000 });
    await page.click('#cl-quote-btn');
    await page.waitForSelector('#createQuoteModal.open');
    await page.fill('#cqName', quoteName);
    await page.click('button:has-text("Create Quote")');

    // Auto-nav from Task 2 brings us to Orders > Quotes tab
    await expect(page.locator('#page-orders')).toHaveClass(/active/, { timeout: 5000 });
    await expect(page.locator('#otab-quotes')).toHaveClass(/active/, { timeout: 5000 });
    const quoteRow = page.locator('#otab-quotes tr').filter({ hasText: quoteName });
    await expect(quoteRow).toBeVisible({ timeout: 10000 });

    await quoteRow.locator('button:has-text("Convert")').click();
    await page.waitForSelector('#orderModal.open');

    // Size field should be pre-filled from the cut list name
    const sizeVal = await page.locator('#oItemsContainer .item-size').first().inputValue();
    expect(sizeVal).toBe(size);
  });
  ```

- [ ] **Step 2: Run test to confirm it fails**

  ```bash
  npx playwright test tests/e2e/cutlist-quotes.spec.ts --project=e2e -g "carries size"
  ```
  Expected: FAIL — size field is empty.

- [ ] **Step 3: Update convertQuoteToOrder() to extract size**

  In `index.html`, find `convertQuoteToOrder()` at ~line 3601:
  ```js
  function convertQuoteToOrder(id) {
    const quote = allQuotes.find(q => q.id === id);
    if (!quote) return;
    _pendingQuoteId = quote.id;
    openOrderModal(null, { name: quote.name || '', notes: quote.notes || '', price: quote.price });
  }
  ```

  Replace with:
  ```js
  function convertQuoteToOrder(id) {
    const quote = allQuotes.find(q => q.id === id);
    if (!quote) return;
    _pendingQuoteId = quote.id;
    const sizeMatch = (quote.cut_list_name || '').match(/\d+[×x]\d+[×x]\d+/i);
    const size = sizeMatch ? sizeMatch[0].replace(/x/gi, '×') : '';
    openOrderModal(null, { name: quote.name || '', notes: quote.notes || '', price: quote.price, size });
  }
  ```

- [ ] **Step 4: Update openOrderModal() prefill block to pass size to addOrderItem()**

  In `index.html`, find the prefill block in `openOrderModal()` at ~line 3588:
  ```js
  if (prefill) {
    addOrderItem('', 'Standard', 1, prefill.price || 0);
  } else {
    addOrderItem();
  }
  ```

  Change `''` to `prefill.size || ''`:
  ```js
  if (prefill) {
    addOrderItem(prefill.size || '', 'Standard', 1, prefill.price || 0);
  } else {
    addOrderItem();
  }
  ```

- [ ] **Step 5: Run the new test to confirm it passes**

  ```bash
  npx playwright test tests/e2e/cutlist-quotes.spec.ts --project=e2e -g "carries size"
  ```
  Expected: PASS.

- [ ] **Step 6: Run the full cutlist-quotes suite for regressions**

  The existing `convert quote pre-fills order modal` test at line 107 fills size manually:
  ```typescript
  await page.locator('#oItemsContainer .item-size').first().fill('36×16×16');
  ```
  That cut list name is `${TAG} CL for ${quoteName}` — no size pattern, so size will be `''` and the field stays blank. The test fills it manually, so it still passes.

  ```bash
  npx playwright test tests/e2e/cutlist-quotes.spec.ts --project=e2e
  ```
  Expected: all tests pass.

- [ ] **Step 7: Commit**

  ```bash
  git add index.html tests/e2e/cutlist-quotes.spec.ts
  git commit -m "feat: carry cut-list size into quote-to-order conversion"
  ```

---

## Task 5: Update documentation

**Files:**
- Modify: `README.md`
- Modify: `CLAUDE.md`
- Modify: `tests/README.md`

- [ ] **Step 1: Update README.md**

  In the **Quotes tab** description under "Order & Inventory Tracker", update the sentence about Convert:

  Find:
  > Tap **Convert** to open the New Order modal pre-filled with the quote's details — saving the order automatically deletes the quote.

  Replace with:
  > Tap **Convert** to open the New Order modal pre-filled with the quote's details (name, price, notes, and size if the cut list name contains a dimension like `36×16×16`) — saving the order automatically deletes the quote. After creating a quote, the app navigates directly to the Quotes tab.

  Also add "+ New Order" to the Home Dashboard bullet:

  Find:
  > - **Home Dashboard** — at-a-glance KPI cards (this month's revenue, YTD, ready-to-sell count, amount owed) with trend badges showing ▲/▼ % vs prior period, plus a tile grid linking to every section

  Replace with:
  > - **Home Dashboard** — at-a-glance KPI cards (this month's revenue, YTD, ready-to-sell count, amount owed) with trend badges showing ▲/▼ % vs prior period, plus a tile grid linking to every section and a **+ New Order** shortcut button

- [ ] **Step 2: Update CLAUDE.md non-obvious details**

  In `CLAUDE.md`, find the `openOrderModal` non-obvious detail:
  > `openOrderModal(order, prefill)` — optional second param lets `convertQuoteToOrder()` pre-populate the order modal from a quote without an existing order object

  Replace with:
  > `openOrderModal(order, prefill)` — optional second param lets `convertQuoteToOrder()` pre-populate the order modal from a quote without an existing order object. `prefill` accepts `{ name, notes, price, size }` — `size` pre-fills the first item row's size field and is extracted via regex from `quote.cut_list_name`.

  Also update the `saveQuote()` description (currently not in CLAUDE.md's non-obvious list — add it):
  > `saveQuote()` — inserts to the `quotes` table, then auto-navigates to Orders → Quotes tab via `goTo('orders')` + clicking the Quotes tab button.

- [ ] **Step 3: Update tests/README.md counts**

  In `tests/README.md`, the smoke suite count says "27 tests". It becomes 28 (+ New Order button test in home.spec.ts).

  The E2E cutlist-quotes count says "7" tests. It becomes 9 (+ auto-nav test, + size carry test).

  Update the counts and the coverage description for each:

  Smoke table row for `home.spec.ts`:
  - Before: `KPI cards present, nav tiles visible, dark mode toggle`
  - After: `KPI cards present, nav tiles visible, dark mode toggle, + New Order shortcut opens order modal`

  E2E table row for `cutlist-quotes.spec.ts`:
  - Before: `7 | Quote button enables after run, modal pre-fill, save quote, convert to order, delete, product saved with cut list, product grouping in saved list`
  - After: `9 | Quote button enables after run, modal pre-fill, save quote, auto-nav to Quotes tab after save, convert to order, size carried from cut list name, delete, product saved with cut list, product grouping in saved list`

  **Note on counts:** The `tests/README.md` says "54 tests" for E2E but the actual current count is **56** (verified via `npx playwright test --list`). Update top-level counts to: Smoke "27 tests" → "28 tests", E2E "56 tests" → "58 tests".

- [ ] **Step 4: Commit**

  ```bash
  git add README.md CLAUDE.md tests/README.md
  git commit -m "docs: update README and CLAUDE.md for workflow friction improvements"
  ```

---

## Task 6: Full test run and push

- [ ] **Step 1: Run full smoke suite**

  ```bash
  npx playwright test --project=smoke
  ```
  Expected: 28 passed, 0 failed.

- [ ] **Step 2: Run full E2E suite**

  ```bash
  npx playwright test --project=e2e
  ```
  Expected: 58 passed, 0 failed.

- [ ] **Step 3: Push to GitHub**

  ```bash
  git push origin main
  ```
  Expected: CI passes. GitHub Pages deploys in ~60s.
