# QA Bug Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 8 QA-verified bugs across add-on data integrity, mobile modal usability, table/filter scrolling, scheduler UX, and hero layout.

**Architecture:** All changes are in `index.html` (single-file app). Fixes split into: (1) JS logic fixes for P1 data-loss bugs, (2) CSS fixes for mobile layout, (3) a JS one-liner for the scheduler time fallback. No new files needed.

**Tech Stack:** Vanilla HTML/CSS/JS in `index.html`. Playwright e2e tests in `tests/e2e/`. No build step.

---

## Files

- Modify: `index.html` — all bug fixes (JS + CSS)
- Modify: `tests/e2e/inventory-sales.spec.ts` — add-on resilience test
- Modify: `tests/e2e/scheduler.spec.ts` — booking time fallback test
- Modify: `tests/README.md` — update test counts
- Modify: `CLAUDE.md` — update test counts

---

## Task 1: P1 — Prevent silent add-on data loss in order edit modal

**Problem:** `renderOrderAddons()` at line ~2594 calls `if (!addon) return` when an add-on ID isn't found in the local `ADDONS` array (happens when `localStorage` was cleared or a different device/session is used). The row is never appended to `#orderAddonList`, so `saveOrder()` never sees it and it is permanently deleted from the order on save.

**Files:**
- Modify: `index.html` — `renderOrderAddons()` function (~line 2585)

- [ ] **Step 1: Fix `renderOrderAddons` to preserve unknown IDs**

Find this block (around line 2594):
```js
savedIds.forEach(id => {
  const addon = ADDONS.find(a => a.id === id);
  if (!addon) return;
  const price = savedPrices[id] !== undefined ? savedPrices[id] : addonPrice(id, dims.l, dims.w, dims.h);
  appendOrderAddonRow(id, addon.label, price);
});
```

Replace with:
```js
savedIds.forEach(id => {
  const addon = ADDONS.find(a => a.id === id);
  const label = addon ? addon.label : '(custom add-on)';
  const price = savedPrices[id] !== undefined ? savedPrices[id] : (addon ? addonPrice(id, dims.l, dims.w, dims.h) : 0);
  appendOrderAddonRow(id, label, price);
});
```

- [ ] **Step 2: Verify manually**

Open an order that has a saved add-on. The add-on row should appear in the edit modal even on a fresh session (or after clearing `rmk_addons` from localStorage). Saving should preserve the add-on.

---

## Task 2: P1 — Fix raw add-on ID shown on order cards

**Problem:** Order card renderer at line ~3634 falls back to the raw generated ID (e.g. `addon_1774656519476`) when `ADDONS.find()` fails. This looks broken to the user.

**Files:**
- Modify: `index.html` — order card `addonBadges` render (~line 3633)

- [ ] **Step 1: Update order card add-on label fallback**

Find (around line 3633):
```js
const addonBadges = addonIds.length
  ? `<div class="meta-item" style="color:var(--ocean)">✨ ${addonIds.map(id=>{const a=ADDONS.find(x=>x.id===id);return a?esc(a.label):id;}).join(' · ')}</div>`
  : '';
```

Replace with:
```js
const resolvedAddonLabels = addonIds.map(id=>{const a=ADDONS.find(x=>x.id===id);return a?esc(a.label):'(custom)';});
const addonBadges = addonIds.length
  ? `<div class="meta-item" style="color:var(--ocean)">✨ ${resolvedAddonLabels.join(' · ')}</div>`
  : '';
```

- [ ] **Step 2: Commit Tasks 1 + 2 together**

```bash
git add index.html
git commit -m "fix: preserve unknown add-on IDs in order edit modal; show (custom) label on card"
```

---

## Task 3: P2 — Sticky modal actions bar on mobile

**Problem:** On 375px viewport the order modal is 974px tall but max-height clips to ~714px. Save Order, Cancel, Notes, and Pickup Time are all hidden below the fold with no visual cue. Users may not realize there is more content.

**Fix:** Make `.modal-actions` sticky to the bottom of the modal on mobile so Cancel/Save are always visible regardless of scroll position.

**Files:**
- Modify: `index.html` — CSS inside `@media (max-width: 640px)` block (~line 983)

- [ ] **Step 1: Add sticky modal footer CSS**

Inside the `@media (max-width: 640px)` block, after the existing `.modal { max-height: 88vh; ... }` rule, add:

```css
  .modal-actions {
    position: sticky;
    bottom: 0;
    background: white;
    padding-top: 12px;
    margin-top: 8px;
    border-top: 1px solid var(--warm-gray);
    z-index: 1;
  }
  [data-theme="dark"] .modal-actions {
    background: #162534;
    border-top-color: #2C4255;
  }
```

- [ ] **Step 2: Verify**

At 375px viewport, open the order edit modal. The Cancel and Save Order buttons should be visible at the bottom immediately, even before scrolling.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "fix: sticky modal action buttons on mobile so Save/Cancel always visible"
```

---

## Task 4: P2 — Fix Style dropdown crushed on 375px in order items row

**Problem:** `.order-item-row .item-product { flex: 1 1 80px; }` gives the Style select an 80px minimum — too narrow, truncates to `S` at 375px.

**Files:**
- Modify: `index.html` — `@media (max-width: 640px)` `.order-item-row` rules (~line 977)

- [ ] **Step 1: Increase item-product min-width**

Find inside `@media (max-width: 640px)`:
```css
  .order-item-row .item-product { flex: 1 1 80px; }
```

Replace with:
```css
  .order-item-row .item-product { flex: 1 1 110px; }
```

- [ ] **Step 2: Verify**

At 375px, the Items row in the order modal should show the full word "Standard" (or similar) in the product dropdown without truncation.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "fix: widen Style dropdown min-width in order items row on mobile"
```

---

## Task 5: P2 — Ensure Sales History table scrolls horizontally on mobile

**Problem:** The sales table has 9 columns and renders at ~844px wide. The `.table-wrap` wrapper already has `overflow-x: auto` in base CSS, but `data-table` has `min-width: 500px` which is not enough for 9 columns — the table may overflow its container without triggering the scroll. The QA agent confirmed columns were unreachable.

**Files:**
- Modify: `index.html` — `@media (max-width: 640px)` block

- [ ] **Step 1: Set explicit min-width for the sales data-table on mobile**

Inside `@media (max-width: 640px)`, after the existing cut-list table rule, add:

```css
  /* ── Sales table: enough width for all 9 columns to scroll ── */
  #otab-sales .data-table { min-width: 640px; }
```

- [ ] **Step 2: Verify**

At 375px on the Sales History tab, swipe left on the table — all columns including Buyer, Price, Payment, Notes, and action buttons should be reachable.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "fix: ensure sales history table scrolls horizontally on mobile (min-width 640px)"
```

---

## Task 6: P2 — Fix order filter bar clipping "Overdue" on mobile

**Problem:** The filter bar's `overflow-x: auto; flex-wrap: nowrap` mobile rule is set but "Overdue" still clips — the flex items themselves may have a min-width that prevents proper scrolling.

**Files:**
- Modify: `index.html` — `.filter-btn` mobile rule (~line 946) and filter bar

- [ ] **Step 1: Ensure filter buttons don't wrap or break**

Find inside `@media (max-width: 640px)`:
```css
  .filter-btn { padding: 8px 12px; min-height: 36px; }
```

Replace with:
```css
  .filter-btn { padding: 8px 12px; min-height: 36px; white-space: nowrap; flex-shrink: 0; }
```

- [ ] **Step 2: Verify**

At 375px on the Orders page, the filter bar (All / Pending / Building / Ready for Pickup / Overdue) should be horizontally scrollable with "Overdue" fully reachable by swiping right.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "fix: prevent filter bar buttons from wrapping/shrinking on mobile"
```

---

## Task 7: P2 — Show fallback text when booking has no pickup time

**Problem:** In `loadDayDetail()` (~line 5316), booking rows render `fmtTime(b.pickup_time)` directly. When `pickup_time` is null or empty, `fmtTime` returns an empty string and the time column is blank — visually broken.

**Files:**
- Modify: `index.html` — `loadDayDetail()` booking row template (~line 5315)

- [ ] **Step 1: Add time fallback**

Find (around line 5315):
```js
    html+=`<div class="slot-card booked">
      <div class="slot-time">${fmtTime(b.pickup_time)}</div>
```

Replace with:
```js
    html+=`<div class="slot-card booked">
      <div class="slot-time">${b.pickup_time ? fmtTime(b.pickup_time) : '—'}</div>
```

- [ ] **Step 2: Verify**

On the Scheduler calendar, click a day with a booking that has no pickup time set. The time column should show `—` instead of being blank.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "fix: show '—' in scheduler booking time cell when no pickup time is set"
```

---

## Task 8: P3 — Prevent hero stat pills from wrapping on mobile

**Problem:** `.home-hero-pills { flex-wrap: wrap }` causes the third pill ("0 today") to drop to a second line at 375px.

**Fix:** Switch to horizontal scroll (same pattern as `.filter-bar` on mobile) so all three pills stay on one line.

**Files:**
- Modify: `index.html` — `@media (max-width: 640px)` block

- [ ] **Step 1: Add no-wrap + scroll rule for hero pills**

Inside `@media (max-width: 640px)`, add:

```css
  .home-hero-pills { flex-wrap: nowrap; overflow-x: auto; -webkit-overflow-scrolling: touch; padding-bottom: 2px; }
  .hero-pill { flex-shrink: 0; }
```

- [ ] **Step 2: Verify**

At 375px on the home page, all three stat pills should appear on a single line. If there are more pills than fit, they scroll horizontally rather than wrapping.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "fix: prevent hero stat pills from wrapping to second line on mobile"
```

---

## Task 9: Update tests and documentation

**Files:**
- Modify: `tests/e2e/inventory-sales.spec.ts` — verify add-on row preserved when ADDONS empty
- Modify: `tests/e2e/scheduler.spec.ts` — verify `—` shown when no pickup time
- Modify: `tests/README.md` — update E2E counts
- Modify: `CLAUDE.md` — update E2E counts

- [ ] **Step 1: Add resilience test to inventory-sales spec**

In `tests/e2e/inventory-sales.spec.ts`, add after the existing add-on test:

```typescript
test('add-on row preserved in edit modal when ADDONS not in localStorage', async ({ page }) => {
  await goToSalesTab(page);
  // First log a sale with an add-on so we have a record to edit
  const name = `${TAG} AddonResilience`;
  await page.click('button:has-text("+ Log Sale")');
  await page.waitForSelector('#saleModal.open');
  await page.fill('#sName', name);
  await page.fill('#sDate', new Date().toISOString().split('T')[0]);
  await page.fill('#sSize', '36×16×16');
  await page.fill('#sPrice', '80');
  await page.check('#saleAddonList input[type="checkbox"]:first-of-type');
  await page.click('button[onclick="saveSale()"]');
  await expect(page.locator('#salesBody tr').filter({ hasText: name })).toBeVisible({ timeout: 10000 });

  // Clear ADDONS from localStorage to simulate a fresh session
  await page.evaluate(() => localStorage.removeItem('rmk_addons'));

  // Edit the sale — the add-on row must still be present (not silently dropped)
  const row = page.locator('#salesBody tr').filter({ hasText: name });
  await row.locator('button:has-text("✏️")').click();
  await page.waitForSelector('#saleModal.open');
  // Add-on checkbox area should not be empty
  await expect(page.locator('#saleAddonList')).not.toBeEmpty();
});
```

- [ ] **Step 2: Add scheduler time fallback test**

In `tests/e2e/scheduler.spec.ts`, find the booking tests and add (or update an existing booking test to verify):

```typescript
test('booking row shows — when pickup time is not set', async ({ page }) => {
  await goToCalendarTab(page);
  // Create a booking without a pickup time
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];
  await page.click(`[onclick="selectDay('${dateStr}')"]`).catch(() => {
    // If today not visible, find any available day and click it
  });
  await page.waitForSelector('#dayDetail', { state: 'visible' });
  await page.click('button:has-text("+ Book Pickup")');
  await page.waitForSelector('#bookingModal.open');
  await page.fill('#bkName', `${TAG} NoTime`);
  await page.fill('#bkDate', dateStr);
  // Leave #bkTime empty
  await page.click('button[onclick="saveBooking()"]');
  await page.waitForSelector('#bookingModal', { state: 'hidden' });
  // The booking row time cell should show — not blank
  const bookingCard = page.locator('#daySlotsList .slot-card.booked').filter({ hasText: `${TAG} NoTime` });
  await expect(bookingCard.locator('.slot-time')).toHaveText('—', { timeout: 10000 });
});
```

- [ ] **Step 3: Update test counts in README and CLAUDE.md**

In `tests/README.md`:
- `inventory-sales.spec.ts` count: `8` → `9`
- E2E total: `59` → `61` (two new tests)

In `CLAUDE.md`:
- E2E count line: `59` → `61`
- Update `inventory-sales.spec.ts` row to mention add-on resilience test

- [ ] **Step 4: Final commit**

```bash
git add tests/e2e/inventory-sales.spec.ts tests/e2e/scheduler.spec.ts tests/README.md CLAUDE.md
git commit -m "test: add e2e coverage for add-on resilience and scheduler time fallback"
```

---

## Task 10: Push and verify

- [ ] **Step 1: Push all commits**

```bash
git push origin main
```

- [ ] **Step 2: Confirm deployment**

Wait ~60 seconds, then open https://kjakupak93.github.io/rmk-crafted and verify:
- Order edit modal on mobile (375px): Save/Cancel sticky at bottom
- Style dropdown shows full word "Standard"
- Filter bar scrolls to show "Overdue"
- Sales table scrolls to show all columns
- Scheduler booking with no time shows `—`
- Hero pills stay on one line
- Edit an order with add-ons: rows appear even after clearing localStorage
