# Comprehensive E2E Tests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 18 new end-to-end tests covering full user workflows (orders, quotes, materials, scheduler) plus a GitHub Actions workflow that runs both smoke and e2e suites on every push to `main`.

**Architecture:** Two-tier Playwright setup — existing smoke tests stay untouched in `tests/`, new e2e tests live in `tests/e2e/`. All data-writing tests tag records with `[TEST-{timestamp}]` and clean up via Supabase REST API in `afterAll`. The GitHub Action runs smoke first (fail fast), then e2e.

**Tech Stack:** Playwright (already installed), Chromium, TypeScript, Supabase REST API (fetch + anon key), GitHub Actions.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `playwright.config.ts` | Modify | Add two named projects (smoke + e2e); remove root-level `testDir` |
| `tests/e2e/helpers/cleanup.ts` | Create | Delete `[TEST]%`-prefixed rows from Supabase tables via REST API |
| `tests/e2e/orders.spec.ts` | Create | 5 tests: create, edit, advance status, complete, delete order |
| `tests/e2e/cutlist-quotes.spec.ts` | Create | 5 tests: run cut list, quote modal, save quote, convert, delete |
| `tests/e2e/materials.spec.ts` | Create | 5 tests: add/delete purchase, run cut list, save/load/delete cut list |
| `tests/e2e/scheduler.spec.ts` | Create | 3 tests: add slot, book pickup, add availability window |
| `.github/workflows/e2e.yml` | Create | CI: checkout → install → smoke → e2e → upload report on failure |

---

### Task 1: Update `playwright.config.ts`

**Files:**
- Modify: `playwright.config.ts`

**Context:** The current config has a single unnamed `chromium` project with `testDir: './tests'` at the root level. We need to rename it `smoke`, add an `e2e` project, and remove the root-level `testDir` so each project controls its own test directory. The `webServer` config and all other root-level keys stay unchanged.

- [ ] **Step 1: Read the current config**

```bash
cat /Users/kjakupak/Documents/CodeProjects/rmk-crafted/playwright.config.ts
```

- [ ] **Step 2: Replace the projects section**

Replace the entire `projects` array (and remove the root-level `testDir` if present) with:

```ts
projects: [
  {
    name: 'smoke',
    testDir: './tests',
    testIgnore: ['**/e2e/**'],
    use: { ...devices['Desktop Chrome'] },
  },
  {
    name: 'e2e',
    testDir: './tests/e2e',
    timeout: 60000,
    use: {
      ...devices['Desktop Chrome'],
      actionTimeout: 30000,
      navigationTimeout: 30000,
    },
  },
],
```

If the current config has `testDir: './tests'` as a root key (not inside a project), remove that line — each project now has its own `testDir`.

- [ ] **Step 3: Verify both projects resolve**

```bash
cd /Users/kjakupak/Documents/CodeProjects/rmk-crafted && npx playwright test --list --project=smoke 2>&1 | head -5
npx playwright test --list --project=e2e 2>&1 | head -5
```

Expected: `smoke` lists the existing 22 tests; `e2e` lists 0 tests (no files yet — this is correct).

- [ ] **Step 4: Run existing smoke tests to confirm no regression**

```bash
npx playwright test --project=smoke
```

Expected: 22 passed.

- [ ] **Step 5: Commit**

```bash
git add playwright.config.ts
git commit -m "chore: add smoke and e2e playwright project config"
```

---

### Task 2: Create `tests/e2e/helpers/cleanup.ts`

**Files:**
- Create: `tests/e2e/helpers/cleanup.ts`

**Context:** The Supabase project URL is `https://mfsejmfmyuvhuclzuitc.supabase.co` and the anon key is already public in `index.html`. This helper uses the Supabase REST API (PostgREST) to delete rows tagged with the `[TEST]` prefix. RLS policies are open anon on all relevant tables — no service role key needed.

PostgREST filter syntax: `DELETE /rest/v1/{table}?{column}=like.[TEST]%` deletes all rows where `column` starts with `[TEST]`.

**Column used per table:**
| Table | Tag column |
|---|---|
| `orders` | `name` |
| `sales` | `name` |
| `quotes` | `name` |
| `purchases` | `store` |
| `cut_lists` | `name` |
| `schedule_slots` | `notes` |
| `schedule_bookings` | `name` |

`availability_windows` has no natural tag column — the scheduler tests store the created ID and pass it to `cleanupById()` instead.

- [ ] **Step 1: Create the directory**

```bash
mkdir -p /Users/kjakupak/Documents/CodeProjects/rmk-crafted/tests/e2e/helpers
```

- [ ] **Step 2: Write `cleanup.ts`**

```typescript
// tests/e2e/helpers/cleanup.ts

const SUPABASE_URL = 'https://mfsejmfmyuvhuclzuitc.supabase.co';
const ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mc2VqbWZteXV2aHVjbHp1aXRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwNTgzODksImV4cCI6MjA4NzYzNDM4OX0.Ve8dY-CvGqCMSWfifd6HvrDvmrJo4J00auhos8aezpY';

const HEADERS = {
  apikey: ANON_KEY,
  Authorization: `Bearer ${ANON_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=minimal',
};

/** Maps table name → column used for [TEST]% pattern matching */
const TAG_COLUMN: Record<string, string> = {
  orders: 'name',
  sales: 'name',
  quotes: 'name',
  purchases: 'store',
  cut_lists: 'name',
  schedule_slots: 'notes',
  schedule_bookings: 'name',
};

/**
 * Delete all rows where the tag column starts with '[TEST]'.
 * Sweeps orphaned rows from prior crashed runs in addition to the current run.
 */
export async function cleanupTestData(tables: string[]): Promise<void> {
  for (const table of tables) {
    const col = TAG_COLUMN[table];
    if (!col) {
      console.warn(`cleanup: no tag column configured for table "${table}" — skipping`);
      continue;
    }
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/${table}?${col}=like.%5BTEST%5D%25`,
      { method: 'DELETE', headers: HEADERS },
    );
    if (!res.ok) {
      const text = await res.text();
      console.warn(`cleanup: DELETE from ${table} failed — ${res.status} ${text}`);
    }
  }
}

/**
 * Delete a specific row by ID. Used for tables without a tag column
 * (e.g. availability_windows, schedule_slots by ID).
 */
export async function cleanupById(table: string, id: string): Promise<void> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`,
    { method: 'DELETE', headers: HEADERS },
  );
  if (!res.ok) {
    const text = await res.text();
    console.warn(`cleanup: DELETE ${table}/${id} failed — ${res.status} ${text}`);
  }
}
```

**Note on URL encoding:** `[TEST]%` is URL-encoded as `%5BTEST%5D%25` in the filter parameter.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/kjakupak/Documents/CodeProjects/rmk-crafted && npx tsc --noEmit tests/e2e/helpers/cleanup.ts 2>&1 || echo "If tsc not found, skip - Playwright will compile at runtime"
```

Expected: no errors (or "tsc not found" is acceptable — Playwright uses its own TS compilation).

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/helpers/cleanup.ts
git commit -m "test: add Supabase cleanup helper for e2e test data"
```

---

### Task 3: Create `tests/e2e/orders.spec.ts`

**Files:**
- Create: `tests/e2e/orders.spec.ts`

**Context:**
- Navigate to Orders page via tile: `await page.click('.app-tile--orders')`
- Active orders list: `#activeOrdersList` contains `.order-card` elements
- Each order card has `.card-title` for customer name, `.icon-btn` buttons with emoji text
- Order modal: `#orderModal`, fields: `#oName`, `#oPayment`, `.item-size`, `.item-style`, `.item-qty`, `.item-price`, `#oNotes`
- Save button inside modal: `button[onclick="saveOrder()"]` — button text is "Save Order"; do NOT use `button:has-text("Save")` as that will not match
- Complete payment modal: `#completePaymentModal`, has `button:has-text("Cash")`
- Margin summary block ID: `#complete-margin-summary`
- All deletions use native `confirm()` — set `page.on('dialog', d => d.accept())` before the delete action
- `advanceOrderStatus`: pending → building (button text "→ Building"), building → ready (button text "→ Ready")
- Inventory tab panel: `#otab-inventory`
- Sales History tab panel: `#otab-sales`, body: `#salesBody`
- Cleanup tables: `orders`, `sales`

- [ ] **Step 1: Write `tests/e2e/orders.spec.ts`**

```typescript
// tests/e2e/orders.spec.ts
import { test, expect, Page } from '@playwright/test';
import { login } from '../helpers/auth';
import { cleanupTestData } from './helpers/cleanup';

const TAG = `[TEST-${Date.now()}]`;

async function goToOrders(page: Page) {
  await login(page);
  await page.click('.app-tile--orders');
  await page.waitForSelector('#page-orders.active');
}

async function createOrder(page: Page, name: string, payment = 'unpaid'): Promise<void> {
  await page.click('button:has-text("+ New Order")');
  await page.waitForSelector('#orderModal.open');
  await page.fill('#oName', name);
  await page.locator('.item-size').fill('36×16×16');
  await page.locator('.item-price').fill('60');
  await page.selectOption('#oPayment', payment);
  await page.click('button[onclick="saveOrder()"]');
  await expect(page.locator('#activeOrdersList .card-title', { hasText: name })).toBeVisible({ timeout: 10000 });
}

test.afterAll(async () => {
  await cleanupTestData(['orders', 'sales']);
});

test('create order appears in Active tab', async ({ page }) => {
  await goToOrders(page);
  const name = `${TAG} Create`;
  await createOrder(page, name);
  await expect(page.locator('#activeOrdersList .card-title', { hasText: name })).toBeVisible();
});

test('edit order updates the name', async ({ page }) => {
  await goToOrders(page);
  const name = `${TAG} Edit`;
  const updatedName = `${TAG} Edit Updated`;
  await createOrder(page, name);

  const card = page.locator('.order-card').filter({ hasText: name });
  await card.locator('button:has-text("✏️")').click();
  await page.waitForSelector('#orderModal.open');
  await page.fill('#oName', updatedName);
  await page.click('button[onclick="saveOrder()"]');
  await expect(page.locator('#activeOrdersList .card-title', { hasText: updatedName })).toBeVisible({ timeout: 10000 });
});

test('advance order to Ready moves it to Inventory tab', async ({ page }) => {
  await goToOrders(page);
  const name = `${TAG} Advance`;
  await createOrder(page, name);

  const card = () => page.locator('.order-card').filter({ hasText: name });

  // pending → building
  await card().locator('button:has-text("→ Building")').click();
  await page.waitForLoadState('networkidle');

  // building → ready
  await card().locator('button:has-text("→ Ready")').click();
  await page.waitForLoadState('networkidle');

  // Should no longer be in Active tab
  await expect(page.locator('#activeOrdersList .card-title', { hasText: name })).toHaveCount(0);

  // Should appear in Inventory tab
  await page.click('#orders-tabs button:has-text("Ready to Sell")');
  await expect(page.locator('#otab-inventory').locator('text=' + name)).toBeVisible({ timeout: 10000 });
});

test('complete unpaid order shows margin and moves to Sales History', async ({ page }) => {
  await goToOrders(page);
  const name = `${TAG} Complete`;
  await createOrder(page, name, 'unpaid');

  const card = page.locator('.order-card').filter({ hasText: name });
  await card.locator('button:has-text("✅")').click();

  // Payment modal opens
  await page.waitForSelector('#completePaymentModal.open');
  // Margin summary block should be present
  await expect(page.locator('#complete-margin-summary')).toBeVisible();
  // Verify it contains the margin keywords
  await expect(page.locator('#complete-margin-summary')).toContainText('Revenue');
  await expect(page.locator('#complete-margin-summary')).toContainText('Margin');

  // Click Cash to complete
  await page.click('button:has-text("Cash")');
  await page.waitForLoadState('networkidle');

  // Order should be gone from Active tab
  await expect(page.locator('#activeOrdersList .card-title', { hasText: name })).toHaveCount(0);

  // Should appear in Sales History tab
  await page.click('#orders-tabs button:has-text("Sales History")');
  await expect(page.locator('#salesBody tr').filter({ hasText: name })).toBeVisible({ timeout: 10000 });
});

test('delete order removes it from Active tab', async ({ page }) => {
  await goToOrders(page);
  const name = `${TAG} Delete`;
  await createOrder(page, name);

  const card = page.locator('.order-card').filter({ hasText: name });
  page.on('dialog', d => d.accept());
  await card.locator('button:has-text("🗑️")').click();
  await page.waitForLoadState('networkidle');

  await expect(page.locator('#activeOrdersList .card-title', { hasText: name })).toHaveCount(0);
});
```

- [ ] **Step 2: Run the orders e2e tests**

```bash
cd /Users/kjakupak/Documents/CodeProjects/rmk-crafted && npx playwright test --project=e2e tests/e2e/orders.spec.ts --headed
```

Expected: 5 passed. If any test fails, read the error and fix the selector or logic before proceeding.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/orders.spec.ts
git commit -m "test(e2e): add order lifecycle tests"
```

---

### Task 4: Create `tests/e2e/cutlist-quotes.spec.ts`

**Files:**
- Create: `tests/e2e/cutlist-quotes.spec.ts`

**Context:**
- Navigate to Materials via `.app-tile--mats`, then click Cut List tab: `button:has-text("Cut List")`
- Cut list name input: `#cl-name`
- Add Part button: `button:has-text("+ Add Part")`
- Part row inputs (find in the last `tr` of `#cl-rows`): `[id^="cl-qty-"]`, `[id^="cl-len-"]`, `[id^="cl-mat-"]`
- Run button: `button[onclick="runCutList()"]` or `button:has-text("Calculate")`
- Quote button: `#cl-quote-btn` (starts disabled)
- Quote modal: `#createQuoteModal`, fields: `#cqName`, `#cqPrice`, `#cqNotes`
- Create Quote save button: `button:has-text("Create Quote")`
- Navigate to Orders for Quotes tab verification
- Quotes tab: `#orders-tabs button:has-text("Quotes")`
- Quotes table panel: `#otab-quotes`
- Convert button in quotes table: `button:has-text("Convert")` inside the row
- Order modal after convert: `#orderModal`, `#oName` should be pre-filled
- Cleanup tables: `quotes`, `orders`, `cut_lists`

- [ ] **Step 1: Write `tests/e2e/cutlist-quotes.spec.ts`**

```typescript
// tests/e2e/cutlist-quotes.spec.ts
import { test, expect, Page } from '@playwright/test';
import { login } from '../helpers/auth';
import { cleanupTestData } from './helpers/cleanup';

const TAG = `[TEST-${Date.now()}]`;

async function goToCutList(page: Page) {
  await login(page);
  await page.click('.app-tile--mats');
  await page.waitForSelector('#page-materials.active');
  await page.click('button:has-text("Cut List")');
  await page.waitForSelector('#mtab-cutlist.active');
}

async function addPartRowAndRun(page: Page, cutListName: string) {
  await page.fill('#cl-name', cutListName);
  await page.click('button:has-text("+ Add Part")');
  const lastRow = page.locator('#cl-rows tr:last-child');
  await lastRow.locator('[id^="cl-qty-"]').fill('2');
  await lastRow.locator('[id^="cl-len-"]').fill('36');
  // Select Picket stock type (first option containing "Picket")
  const matSelect = lastRow.locator('[id^="cl-mat-"]');
  await matSelect.selectOption({ label: /Picket/i });
  await page.click('button:has-text("Calculate")');
  // Wait for results to render
  await expect(page.locator('#cl-results')).toBeVisible({ timeout: 10000 });
}

async function createQuote(page: Page, quoteName: string): Promise<void> {
  const cutListName = `${TAG} CL for ${quoteName}`;
  await goToCutList(page);
  await addPartRowAndRun(page, cutListName);
  await expect(page.locator('#cl-quote-btn')).not.toBeDisabled({ timeout: 5000 });
  await page.click('#cl-quote-btn');
  await page.waitForSelector('#createQuoteModal.open');
  await page.fill('#cqName', quoteName);
  await page.click('button:has-text("Create Quote")');
  await expect(page.locator('#createQuoteModal')).not.toHaveClass(/open/, { timeout: 5000 });
}

test.afterAll(async () => {
  await cleanupTestData(['quotes', 'orders', 'cut_lists']);
});

test('Quote button becomes enabled after running cut list', async ({ page }) => {
  await goToCutList(page);
  await expect(page.locator('#cl-quote-btn')).toBeDisabled();

  await addPartRowAndRun(page, `${TAG} Button Test`);

  await expect(page.locator('#cl-quote-btn')).not.toBeDisabled({ timeout: 5000 });
});

test('Quote modal pre-fills price and notes from cut list', async ({ page }) => {
  const cutListName = `${TAG} Prefill Test`;
  await goToCutList(page);
  await addPartRowAndRun(page, cutListName);
  await expect(page.locator('#cl-quote-btn')).not.toBeDisabled({ timeout: 5000 });

  await page.click('#cl-quote-btn');
  await page.waitForSelector('#createQuoteModal.open');

  // Price should be pre-filled with a value > 0
  const price = await page.locator('#cqPrice').inputValue();
  expect(Number(price)).toBeGreaterThan(0);

  // Notes should match the cut list name
  const notes = await page.locator('#cqNotes').inputValue();
  expect(notes).toBe(cutListName);
});

test('saved quote appears in Quotes tab with margin badge', async ({ page }) => {
  const quoteName = `${TAG} Save Quote`;
  await createQuote(page, quoteName);

  // Navigate to Orders → Quotes tab
  await page.click('.app-tile--orders');
  await page.waitForSelector('#page-orders.active');
  await page.click('#orders-tabs button:has-text("Quotes")');
  await page.waitForLoadState('networkidle');

  // Quote row should be visible
  const quoteRow = page.locator('#otab-quotes').locator('tr').filter({ hasText: quoteName });
  await expect(quoteRow).toBeVisible({ timeout: 10000 });

  // Margin badge should contain a '%'
  await expect(quoteRow.locator('span').filter({ hasText: '%' })).toBeVisible();
});

test('convert quote pre-fills order modal and deletes quote on save', async ({ page }) => {
  const quoteName = `${TAG} Convert`;
  await createQuote(page, quoteName);

  // Navigate to Orders → Quotes tab
  await page.click('.app-tile--orders');
  await page.waitForSelector('#page-orders.active');
  await page.click('#orders-tabs button:has-text("Quotes")');
  await page.waitForLoadState('networkidle');

  // Click Convert on the tagged quote row
  const quoteRow = page.locator('#otab-quotes tr').filter({ hasText: quoteName });
  await quoteRow.locator('button:has-text("Convert")').click();

  // Order modal should open with pre-filled name
  await page.waitForSelector('#orderModal.open');
  const oName = await page.locator('#oName').inputValue();
  expect(oName).toBe(quoteName);

  // Save the order
  await page.click('button[onclick="saveOrder()"]');
  await page.waitForLoadState('networkidle');

  // Quote should be gone from Quotes tab
  await page.click('#orders-tabs button:has-text("Quotes")');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('#otab-quotes tr').filter({ hasText: quoteName })).toHaveCount(0);

  // Order should appear in Active tab
  await page.click('#orders-tabs button:has-text("Active")');
  await expect(page.locator('#activeOrdersList .card-title', { hasText: quoteName })).toBeVisible({ timeout: 10000 });
});

test('delete quote removes it from Quotes tab', async ({ page }) => {
  const quoteName = `${TAG} Delete Quote`;
  await createQuote(page, quoteName);

  // Navigate to Orders → Quotes tab
  await page.click('.app-tile--orders');
  await page.waitForSelector('#page-orders.active');
  await page.click('#orders-tabs button:has-text("Quotes")');
  await page.waitForLoadState('networkidle');

  const quoteRow = page.locator('#otab-quotes tr').filter({ hasText: quoteName });
  await expect(quoteRow).toBeVisible({ timeout: 10000 });

  page.on('dialog', d => d.accept());
  await quoteRow.locator('button:has-text("Delete")').click();
  await page.waitForLoadState('networkidle');

  await expect(page.locator('#otab-quotes tr').filter({ hasText: quoteName })).toHaveCount(0);
});
```

- [ ] **Step 2: Run the cutlist-quotes e2e tests**

```bash
cd /Users/kjakupak/Documents/CodeProjects/rmk-crafted && npx playwright test --project=e2e tests/e2e/cutlist-quotes.spec.ts --headed
```

Expected: 5 passed.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/cutlist-quotes.spec.ts
git commit -m "test(e2e): add cut list to quote flow tests"
```

---

### Task 5: Create `tests/e2e/materials.spec.ts`

**Files:**
- Create: `tests/e2e/materials.spec.ts`

**Context:**
- Navigate to Materials via `.app-tile--mats`
- Purchases tab button: `button:has-text("Purchases")`
- Add Purchase button: `button:has-text("+ Log Purchase")` or `button[onclick="openPurchaseModal()"]`
- Purchase modal: `#purchaseModal`
- Store input: `#pStore`
- Pickets qty: `#pPickets`
- Save purchase: `button[onclick="savePurchase()"]` or `button:has-text("Save")`
- Purchase table body: `#purchaseBody` with `tr` rows
- Delete purchase: `button:has-text("🗑️")` inside row (uses `onclick="deletePurchase(id)"`)
- Cut List tab: `button:has-text("Cut List")`
- Board bars: `.picket-bar` elements in `#cl-diagram`
- Save cut list button: `button[onclick="saveCutList()"]` or `button:has-text("Save")`
- Saved list table: `#cl-saved-list` containing rows for each saved cut list
- Load button: `button:has-text("Load")` in row
- Delete cut list: `button[title="Delete"]` or `button:has-text("🗑")` in row
- Cleanup tables: `purchases`, `cut_lists`

- [ ] **Step 1: Write `tests/e2e/materials.spec.ts`**

```typescript
// tests/e2e/materials.spec.ts
import { test, expect, Page } from '@playwright/test';
import { login } from '../helpers/auth';
import { cleanupTestData } from './helpers/cleanup';

const TAG = `[TEST-${Date.now()}]`;

async function goToMaterials(page: Page) {
  await login(page);
  await page.click('.app-tile--mats');
  await page.waitForSelector('#page-materials.active');
}

async function addPurchase(page: Page, storeName: string): Promise<void> {
  await page.click('button:has-text("Purchases")');
  await page.waitForSelector('#mtab-purchases.active');
  await page.click('button:has-text("+ Log Purchase")');
  await page.waitForSelector('#purchaseModal.open');
  await page.fill('#pStore', storeName);
  await page.fill('#pPickets', '5');
  await page.click('#purchSaveBtn');
  await expect(page.locator('#purchaseBody tr').filter({ hasText: storeName })).toBeVisible({ timeout: 10000 });
}

async function addPartAndRunCutList(page: Page, cutListName: string): Promise<void> {
  await page.click('button:has-text("Cut List")');
  await page.waitForSelector('#mtab-cutlist.active');
  await page.fill('#cl-name', cutListName);
  await page.click('button:has-text("+ Add Part")');
  const lastRow = page.locator('#cl-rows tr:last-child');
  await lastRow.locator('[id^="cl-qty-"]').fill('3');
  await lastRow.locator('[id^="cl-len-"]').fill('48');
  await lastRow.locator('[id^="cl-mat-"]').selectOption({ label: /Picket/i });
  await page.click('button:has-text("Calculate")');
  await expect(page.locator('#cl-results')).toBeVisible({ timeout: 10000 });
}

test.afterAll(async () => {
  await cleanupTestData(['purchases', 'cut_lists']);
});

test('add purchase appears in Purchases log', async ({ page }) => {
  await goToMaterials(page);
  const storeName = `${TAG} Store`;
  await addPurchase(page, storeName);
  await expect(page.locator('#purchaseBody tr').filter({ hasText: storeName })).toBeVisible();
});

test('delete purchase removes it from the log', async ({ page }) => {
  await goToMaterials(page);
  const storeName = `${TAG} Del Store`;
  await addPurchase(page, storeName);

  const row = page.locator('#purchaseBody tr').filter({ hasText: storeName });
  page.on('dialog', d => d.accept());
  await row.locator('button:has-text("🗑️")').click();
  await page.waitForLoadState('networkidle');

  await expect(page.locator('#purchaseBody tr').filter({ hasText: storeName })).toHaveCount(0);
});

test('running cut list renders board diagram', async ({ page }) => {
  await goToMaterials(page);
  await addPartAndRunCutList(page, `${TAG} Diagram`);

  // At least one board bar should render
  const barCount = await page.locator('.picket-bar').count();
  expect(barCount).toBeGreaterThan(0);
});

test('save cut list appears in saved list table', async ({ page }) => {
  await goToMaterials(page);
  const cutListName = `${TAG} Saved CL`;
  await addPartAndRunCutList(page, cutListName);

  await page.click('button[onclick="saveCutList()"]');
  await page.waitForLoadState('networkidle');

  // Named row should appear in the saved list section
  await expect(page.locator('#cl-saved-list').locator('tr').filter({ hasText: cutListName })).toBeVisible({ timeout: 10000 });
});

test('load cut list restores name; delete removes it from saved list', async ({ page }) => {
  await goToMaterials(page);
  const cutListName = `${TAG} Load CL`;
  await addPartAndRunCutList(page, cutListName);
  await page.click('button[onclick="saveCutList()"]');
  await page.waitForLoadState('networkidle');

  // Clear the cut list name to confirm load restores it
  await page.fill('#cl-name', '');

  const savedRow = page.locator('#cl-saved-list tr').filter({ hasText: cutListName });
  await savedRow.locator('button:has-text("Load")').click();
  await page.waitForLoadState('networkidle');

  // Name input should be restored
  await expect(page.locator('#cl-name')).toHaveValue(cutListName);

  // Now delete it
  page.on('dialog', d => d.accept());
  await savedRow.locator('button[title="Delete"]').click();
  await page.waitForLoadState('networkidle');

  await expect(page.locator('#cl-saved-list tr').filter({ hasText: cutListName })).toHaveCount(0);
});
```

- [ ] **Step 2: Run the materials e2e tests**

```bash
cd /Users/kjakupak/Documents/CodeProjects/rmk-crafted && npx playwright test --project=e2e tests/e2e/materials.spec.ts --headed
```

Expected: 5 passed.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/materials.spec.ts
git commit -m "test(e2e): add materials purchase and cut list tests"
```

---

### Task 6: Create `tests/e2e/scheduler.spec.ts`

**Files:**
- Create: `tests/e2e/scheduler.spec.ts`

**Context:**
- Navigate to Scheduler via `.app-tile--sched`
- Calendar tab: `button:has-text("Calendar")` (default tab)
- Calendar label (month/year): `#calLabel`
- Calendar day cells: `.cal-day` — clickable cells exclude `.past-day` and `.other-month`
- Correct selector for a clickable day: `.cal-day:not(.past-day):not(.other-month)`
- After clicking a day, `#dayDetail` appears with:
  - `+ Add Open Slot` button: `button:has-text("+ Add Open Slot")`
  - `+ Book Pickup` button: `button:has-text("+ Book Pickup")`
- Slot modal: `#slotModal`, fields: `#slotStart`, `#slotEnd`, `#slotNotes`
- Slot save button: `#slotModalSaveBtn`
- Booking modal: `#bookingModal`, fields: `#bkName`, `#bkContact`, `#bkDate`, `#bkTime`, `#bkAmount`, `#bkPayment`
- Booking save button: `#bookingModalSaveBtn`
- Upcoming tab: `button:has-text("Upcoming")`, panel: `#stab-upcoming`, list: `#upcomingList`
- Share & Book tab: `button:has-text("Share & Book")`
- Share message area: `#shareMsgBox`
- **Add availability window:** button text is `+ Add Window` (onclick="openWindowModal()"); modal ID: `#windowModal`; fields: `#wDays` (select), `#wStart` (time), `#wEnd` (time); save button: `button:has-text("Save Window")`
- `availability_windows` has no tag column — cleanup uses before/after ID comparison (see test 3 code)
- `schedule_slots` and `schedule_bookings` are cleaned up via `cleanupTestData` using `notes` and `name` respectively

- [ ] **Step 1: Write `tests/e2e/scheduler.spec.ts`**

```typescript
// tests/e2e/scheduler.spec.ts
import { test, expect, Page } from '@playwright/test';
import { login } from '../helpers/auth';
import { cleanupTestData, cleanupById } from './helpers/cleanup';

const TAG = `[TEST-${Date.now()}]`;

// IDs of availability_windows rows created during the suite — cleaned up by ID since no tag column
const createdAvailabilityIds: string[] = [];

const SUPABASE_URL = 'https://mfsejmfmyuvhuclzuitc.supabase.co';
const ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mc2VqbWZteXV2aHVjbHp1aXRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwNTgzODksImV4cCI6MjA4NzYzNDM4OX0.Ve8dY-CvGqCMSWfifd6HvrDvmrJo4J00auhos8aezpY';

async function goToScheduler(page: Page) {
  await login(page);
  await page.click('.app-tile--sched');
  await page.waitForSelector('#page-scheduler.active');
  await page.waitForSelector('#calLabel:not(:empty)', { timeout: 10000 });
}

async function clickFirstAvailableDay(page: Page): Promise<void> {
  const days = page.locator('.cal-day:not(.past-day):not(.other-month)');
  await days.first().click();
  await page.waitForSelector('#dayDetail', { state: 'visible', timeout: 5000 });
}

test.afterAll(async () => {
  await cleanupTestData(['schedule_slots', 'schedule_bookings']);
  for (const id of createdAvailabilityIds) {
    await cleanupById('availability_windows', id);
  }
});

test('add calendar slot is visible on calendar day', async ({ page }) => {
  await goToScheduler(page);
  await clickFirstAvailableDay(page);

  await page.click('button:has-text("+ Add Open Slot")');
  await page.waitForSelector('#slotModal.open');

  // Tag the slot via notes
  await page.fill('#slotNotes', `${TAG} Slot`);
  await page.fill('#slotStart', '10:00');
  await page.fill('#slotEnd', '12:00');
  await page.click('#slotModalSaveBtn');
  await page.waitForLoadState('networkidle');

  // Day detail should now show the slot (slot list renders under #daySlotsList)
  await expect(page.locator('#daySlotsList')).toContainText('10:00', { timeout: 10000 });
});

test('book a pickup appears in Upcoming tab', async ({ page }) => {
  await goToScheduler(page);
  await clickFirstAvailableDay(page);

  await page.click('button:has-text("+ Book Pickup")');
  await page.waitForSelector('#bookingModal.open');

  const bookingName = `${TAG} Booking`;
  await page.fill('#bkName', bookingName);
  await page.fill('#bkTime', '11:00');
  await page.fill('#bkAmount', '85');
  await page.selectOption('#bkPayment', 'cash');
  await page.click('#bookingModalSaveBtn');
  await page.waitForLoadState('networkidle');

  // Navigate to Upcoming tab
  await page.click('button:has-text("Upcoming")');
  await page.waitForSelector('#stab-upcoming.active');

  await expect(page.locator('#upcomingList').locator('text=' + bookingName)).toBeVisible({ timeout: 10000 });
});

test('add availability window updates Share & Book message', async ({ page }) => {
  await goToScheduler(page);

  // Navigate to Share & Book tab — button is "+ Add Window" (onclick="openWindowModal()")
  await page.click('button:has-text("Share & Book")');
  await page.waitForSelector('#stab-share.active');

  // Record how many rows exist BEFORE adding, so we can identify the new row by ID
  const beforeCount = await page.evaluate(async (url, key) => {
    const r = await fetch(`${url}/rest/v1/availability_windows?select=id`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    const data = await r.json();
    return (data as { id: string }[]).map(row => row.id);
  }, SUPABASE_URL, ANON_KEY) as string[];

  // Open the Add Window modal
  await page.click('button:has-text("+ Add Window")');
  await page.waitForSelector('#windowModal.open');

  // Fill modal fields: wDays (select), wStart, wEnd
  await page.selectOption('#wDays', { index: 1 }); // pick any day (Weekdays, Saturdays, etc.)
  await page.fill('#wStart', '09:00');
  await page.fill('#wEnd', '17:00');
  await page.click('button:has-text("Save Window")');
  await expect(page.locator('#windowModal')).not.toHaveClass(/open/, { timeout: 5000 });
  await page.waitForLoadState('networkidle');

  // Find the newly created row ID (any ID that wasn't in beforeCount)
  const afterIds = await page.evaluate(async (url, key) => {
    const r = await fetch(`${url}/rest/v1/availability_windows?select=id`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    const data = await r.json();
    return (data as { id: string }[]).map(row => row.id);
  }, SUPABASE_URL, ANON_KEY) as string[];

  const newIds = afterIds.filter(id => !beforeCount.includes(id));
  createdAvailabilityIds.push(...newIds);

  // Share message box should have content after adding a window
  await expect(page.locator('#shareMsgBox')).not.toBeEmpty({ timeout: 10000 });
});
```

**Note on test 3 (availability window):** The test records existing row IDs before adding a window, then diffs against IDs after saving to identify the newly created row — this avoids the risk of accidentally deleting a row from a prior run. `#wDays` is a select whose first option (index 1) selects any non-empty day group. Cleanup uses `cleanupById` for these rows since `availability_windows` has no tag column.

- [ ] **Step 2: Run the scheduler e2e tests**

```bash
cd /Users/kjakupak/Documents/CodeProjects/rmk-crafted && npx playwright test --project=e2e tests/e2e/scheduler.spec.ts --headed
```

Expected: 3 passed. The availability window test may need selector adjustments based on step 2 findings.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/scheduler.spec.ts
git commit -m "test(e2e): add scheduler slot and booking tests"
```

---

### Task 7: Create GitHub Actions Workflow

**Files:**
- Create: `.github/workflows/e2e.yml`

**Context:**
- Trigger: push to `main` only
- Python 3 is pre-installed on GitHub's `ubuntu-latest` runners
- `npm ci` installs Playwright (already in `package.json`)
- `npx playwright install --with-deps chromium` — `--with-deps` installs OS-level browser dependencies (libgbm, etc.) required on Ubuntu; without it, Chromium launches fail with missing shared library errors
- Smoke runs first; e2e runs second regardless (uses `if: always()` so e2e still runs even if smoke fails, but both must pass for green)
- HTML report uploaded on failure so you can download and inspect failing tests
- No secrets needed — Supabase anon key and PIN are already in `index.html` (public repo)

- [ ] **Step 1: Verify no existing e2e workflow**

```bash
ls /Users/kjakupak/Documents/CodeProjects/rmk-crafted/.github/workflows/
```

Expected: only `claude.yml` and `claude-code-review.yml`. No `e2e.yml` yet.

- [ ] **Step 2: Write `.github/workflows/e2e.yml`**

```yaml
name: E2E Tests

on:
  push:
    branches:
      - main

jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 15

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium

      - name: Run smoke tests
        run: npx playwright test --project=smoke

      - name: Run e2e tests
        run: npx playwright test --project=e2e

      - name: Upload test report
        uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7
```

- [ ] **Step 3: Verify the workflow file is valid YAML**

```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/e2e.yml'))" && echo "Valid YAML"
```

Expected: `Valid YAML`

- [ ] **Step 4: Run both test suites locally one final time**

```bash
cd /Users/kjakupak/Documents/CodeProjects/rmk-crafted && npx playwright test --project=smoke && npx playwright test --project=e2e
```

Expected: 22 smoke + 18 e2e = 40 tests total, all passed.

- [ ] **Step 5: Commit and push**

```bash
git add .github/workflows/e2e.yml tests/e2e/
git commit -m "ci: add GitHub Actions e2e workflow running on push to main"
git push origin main
```

- [ ] **Step 6: Verify the workflow appears in GitHub Actions**

After pushing, check GitHub Actions tab on the repo. The `E2E Tests` workflow should appear and start running. Wait for it to complete and confirm both jobs pass.

---

## Success Criteria Checklist

- [ ] `npx playwright test --project=smoke` — 22 tests pass
- [ ] `npx playwright test --project=e2e` — 18 tests pass
- [ ] `npx playwright test --project=smoke && npx playwright test --project=e2e` — all 40 pass locally
- [ ] GitHub Actions `E2E Tests` workflow appears and passes on push to `main`
- [ ] Workflow uploads HTML report artifact on failure
- [ ] No `[TEST]` rows remain in Supabase after test suite completes
- [ ] Existing smoke test files are unchanged
- [ ] Existing GitHub workflows (`claude.yml`, `claude-code-review.yml`) are unchanged
