# E2E Smoke Tests Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up Playwright and implement 16 smoke tests covering auth, navigation, and key UI across all 6 pages of the RMK Crafted dashboard.

**Architecture:** One spec file per page under `rmk-crafted/tests/`, a shared `login()` helper, and a `playwright.config.ts` that auto-starts the local server. Tests navigate and observe only — no form submissions, no Supabase writes.

**Tech Stack:** `@playwright/test`, Chromium, Python HTTP server (`python3 -m http.server 8080`), real Supabase DB (read-only for smoke tests)

**Spec:** `docs/superpowers/specs/2026-03-19-e2e-smoke-tests-design.md`

---

## Chunk 1: Project Setup

**Files:**
- Create: `rmk-crafted/package.json`
- Create: `rmk-crafted/playwright.config.ts`
- Create: `rmk-crafted/tests/helpers/auth.ts`

---

### Task 1: Create `package.json`

- [ ] **Step 1: Create `rmk-crafted/package.json`**

```json
{
  "name": "rmk-crafted",
  "version": "1.0.0",
  "devDependencies": {
    "@playwright/test": "^1.42.0"
  },
  "scripts": {
    "test": "playwright test",
    "test:ui": "playwright test --ui",
    "test:headed": "playwright test --headed"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run from `rmk-crafted/`:
```bash
npm install
```
Expected: `node_modules/` created, `package-lock.json` created, no errors.

- [ ] **Step 3: Install Playwright browsers**

```bash
npx playwright install chromium
```
Expected: Chromium browser downloaded, no errors.

---

### Task 2: Create `playwright.config.ts`

- [ ] **Step 1: Create `rmk-crafted/playwright.config.ts`**

```typescript
import { defineConfig } from '@playwright/test';
import path from 'path';

export default defineConfig({
  testDir: './tests',
  use: {
    baseURL: 'http://localhost:8080',
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
  webServer: {
    command: 'python3 -m http.server 8080',
    url: 'http://localhost:8080',
    reuseExistingServer: true,
    cwd: __dirname, // resolves to rmk-crafted/ regardless of where `playwright test` is invoked from
  },
});
```

- [ ] **Step 2: Verify config is valid**

```bash
npx playwright test --list
```
Expected: "No tests found" or empty list (no errors about config).

---

### Task 3: Create auth helper

- [ ] **Step 1: Create `rmk-crafted/tests/helpers/auth.ts`**

```typescript
import { Page } from '@playwright/test';

/**
 * Logs into the app by entering PIN 1234.
 *
 * IMPORTANT: The app IIFE always shows #pin-gate on every page load
 * regardless of sessionStorage. Every test must call login() via UI —
 * pre-seeding sessionStorage will NOT bypass the gate.
 */
export async function login(page: Page): Promise<void> {
  await page.goto('/');
  await page.fill('#pin-input', '1234');
  await page.press('#pin-input', 'Enter');
  // Use waitFor({state:'hidden'}) not expect().not.toBeVisible() —
  // the gate uses inline style.display='none', and waitFor has a built-in timeout.
  await page.locator('#pin-gate').waitFor({ state: 'hidden' });
}
```

- [ ] **Step 2: Commit setup**

```bash
cd rmk-crafted
git add package.json package-lock.json playwright.config.ts tests/helpers/auth.ts
git commit -m "chore: add Playwright setup and auth helper"
```

---

## Chunk 2: Auth & Home Tests

**Files:**
- Create: `rmk-crafted/tests/auth.spec.ts`
- Create: `rmk-crafted/tests/home.spec.ts`

---

### Task 4: Auth tests

- [ ] **Step 1: Create `rmk-crafted/tests/auth.spec.ts`**

```typescript
import { test, expect } from '@playwright/test';

test('wrong PIN shows error and clears input', async ({ page }) => {
  await page.goto('/');
  await page.fill('#pin-input', '9999');
  await page.press('#pin-input', 'Enter');
  await expect(page.locator('#pin-error')).toBeVisible();
  await expect(page.locator('#pin-input')).toHaveValue('');
});

test('correct PIN dismisses gate and shows home page', async ({ page }) => {
  await page.goto('/');
  await page.fill('#pin-input', '1234');
  await page.press('#pin-input', 'Enter');
  await page.locator('#pin-gate').waitFor({ state: 'hidden' });
  await expect(page.locator('#page-home')).toBeVisible();
});
```

- [ ] **Step 2: Run auth tests**

```bash
npx playwright test auth.spec.ts --reporter=line
```
Expected: 2 passed.

---

### Task 5: Home tests

- [ ] **Step 1: Create `rmk-crafted/tests/home.spec.ts`**

```typescript
import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

test.beforeEach(async ({ page }) => {
  await login(page);
  await page.waitForLoadState('networkidle');
});

test('KPI summary cards render on home page', async ({ page }) => {
  await expect(page.locator('.home-kpi-row .summary-card').first()).toBeVisible();
});

test('5 nav tiles are present', async ({ page }) => {
  await expect(page.locator('.app-tile')).toHaveCount(5);
});

test('dark mode toggle sets and clears data-theme on <html>', async ({ page }) => {
  // Clear any persisted theme from previous runs, then reload
  // NOTE: reload re-triggers the IIFE which shows #pin-gate again, so login() is required after
  await page.evaluate(() => localStorage.removeItem('rmk_theme'));
  await page.reload();
  await login(page); // required — IIFE always shows gate on every page load

  // First click — enable dark mode
  await page.click('#dark-toggle');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  // Second click — disable dark mode
  // applyDarkMode(false) sets dataset.theme = '' (empty string, NOT removes attribute)
  await page.click('#dark-toggle');
  await expect(page.locator('html')).toHaveAttribute('data-theme', '');
});
```

- [ ] **Step 2: Run home tests**

```bash
npx playwright test home.spec.ts --reporter=line
```
Expected: 3 passed.

- [ ] **Step 3: Commit**

```bash
git add tests/auth.spec.ts tests/home.spec.ts
git commit -m "test: add auth and home smoke tests"
```

---

## Chunk 3: Quote & Orders Tests

**Files:**
- Create: `rmk-crafted/tests/quote.spec.ts`
- Create: `rmk-crafted/tests/orders.spec.ts`

---

### Task 6: Quote tests

- [ ] **Step 1: Create `rmk-crafted/tests/quote.spec.ts`**

```typescript
import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

test.beforeEach(async ({ page }) => {
  await login(page);
  // Navigate to quote page via the Quote tile
  await page.click('.app-tile--quote');
  await page.waitForLoadState('networkidle');
});

test('quote page becomes active on navigation', async ({ page }) => {
  await expect(page.locator('#page-quote')).toHaveClass(/active/);
});

test('style selector and calculate produce output', async ({ page }) => {
  // Click the first style button (Standard) — it may already be active
  await page.locator('.style-btn').first().click();
  await expect(page.locator('.style-btn').first()).toHaveClass(/active/);

  // Fill required fields — calculateQuote() returns early with a toast if any are empty
  await page.fill('#dimL', '72');
  await page.fill('#dimW', '24');
  await page.fill('#dimH', '16');
  await page.fill('#qPickets', '10');

  await page.click('.calc-btn');

  // #qResults gets class 'show' on successful calculation
  await expect(page.locator('#qResults')).toHaveClass(/show/);
});
```

- [ ] **Step 2: Run quote tests**

```bash
npx playwright test quote.spec.ts --reporter=line
```
Expected: 2 passed.

---

### Task 7: Orders tests

- [ ] **Step 1: Create `rmk-crafted/tests/orders.spec.ts`**

```typescript
import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

test.beforeEach(async ({ page }) => {
  await login(page);
  await page.click('.app-tile--orders');
  await page.waitForLoadState('networkidle');
});

test('orders page loads with active orders section', async ({ page }) => {
  await expect(page.locator('#otab-active')).toBeVisible();
});

test('all 3 order tabs switch the active panel', async ({ page }) => {
  // Switch to Ready to Sell
  await page.click('button[onclick*="showOrderTab(\'inventory\')"]');
  await expect(page.locator('#otab-inventory')).toHaveClass(/active/);
  await expect(page.locator('#otab-active')).not.toHaveClass(/active/);

  // Switch to Sales History
  await page.click('button[onclick*="showOrderTab(\'sales\')"]');
  await expect(page.locator('#otab-sales')).toHaveClass(/active/);
  await expect(page.locator('#otab-inventory')).not.toHaveClass(/active/);

  // Switch back to Active
  await page.click('button[onclick*="showOrderTab(\'active\')"]');
  await expect(page.locator('#otab-active')).toHaveClass(/active/);
});

test('New Order button opens the order modal', async ({ page }) => {
  await page.click('button[onclick="openOrderModal()"]');
  await expect(page.locator('#orderModal')).toHaveClass(/open/);
});
```

- [ ] **Step 2: Run orders tests**

```bash
npx playwright test orders.spec.ts --reporter=line
```
Expected: 3 passed.

- [ ] **Step 3: Commit**

```bash
git add tests/quote.spec.ts tests/orders.spec.ts
git commit -m "test: add quote and orders smoke tests"
```

---

## Chunk 4: Materials, Scheduler & Analytics Tests

**Files:**
- Create: `rmk-crafted/tests/materials.spec.ts`
- Create: `rmk-crafted/tests/scheduler.spec.ts`
- Create: `rmk-crafted/tests/analytics.spec.ts`

---

### Task 8: Materials tests

- [ ] **Step 1: Create `rmk-crafted/tests/materials.spec.ts`**

```typescript
import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

test.beforeEach(async ({ page }) => {
  await login(page);
  await page.click('.app-tile--mats');
  // Wait for stock data to load from Supabase (initial value is '—')
  await expect(page.locator('#sq-pickets')).not.toHaveText('—', { timeout: 10000 });
});

test('stock counts load from Supabase', async ({ page }) => {
  await expect(page.locator('#sq-pickets')).not.toHaveText('—');
  await expect(page.locator('#sq-twobytwo')).not.toHaveText('—');
  await expect(page.locator('#sq-twobyfour')).not.toHaveText('—');
});

test('all 3 materials tabs switch the active panel', async ({ page }) => {
  // Switch to Purchases
  await page.click('button[onclick*="showMaterialsTab(\'purchases\')"]');
  await expect(page.locator('#mtab-purchases')).toHaveClass(/active/);
  await expect(page.locator('#mtab-stock')).not.toHaveClass(/active/);

  // Switch to Cut List
  await page.click('button[onclick*="showMaterialsTab(\'cutlist\')"]');
  await expect(page.locator('#mtab-cutlist')).toHaveClass(/active/);

  // Switch back to Stock
  await page.click('button[onclick*="showMaterialsTab(\'stock\')"]');
  await expect(page.locator('#mtab-stock')).toHaveClass(/active/);
});
```

- [ ] **Step 2: Run materials tests**

```bash
npx playwright test materials.spec.ts --reporter=line
```
Expected: 2 passed. Note: if Supabase is unreachable these tests will timeout — this is intentional (real DB dependency).

---

### Task 9: Scheduler tests

- [ ] **Step 1: Create `rmk-crafted/tests/scheduler.spec.ts`**

```typescript
import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

test.beforeEach(async ({ page }) => {
  await login(page);
  await page.click('.app-tile--sched');
  // Wait for calendar label to populate (rendered by renderCalendar())
  await expect(page.locator('#calLabel')).not.toBeEmpty({ timeout: 10000 });
});

test('calendar renders with month and year heading', async ({ page }) => {
  const label = await page.locator('#calLabel').textContent();
  expect(label).toBeTruthy();
  expect(label!.length).toBeGreaterThan(0);
});

test('all 3 scheduler tabs switch the active panel', async ({ page }) => {
  // Switch to Upcoming
  await page.click('button[onclick*="showSchedTab(\'upcoming\')"]');
  await expect(page.locator('#stab-upcoming')).toHaveClass(/active/);
  await expect(page.locator('#stab-calendar')).not.toHaveClass(/active/);

  // Switch to Share & Book
  await page.click('button[onclick*="showSchedTab(\'share\')"]');
  await expect(page.locator('#stab-share')).toHaveClass(/active/);

  // Switch back to Calendar
  await page.click('button[onclick*="showSchedTab(\'calendar\')"]');
  await expect(page.locator('#stab-calendar')).toHaveClass(/active/);
});
```

- [ ] **Step 2: Run scheduler tests**

```bash
npx playwright test scheduler.spec.ts --reporter=line
```
Expected: 2 passed.

---

### Task 10: Analytics tests

- [ ] **Step 1: Create `rmk-crafted/tests/analytics.spec.ts`**

```typescript
import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

test.beforeEach(async ({ page }) => {
  await login(page);
  await page.locator('.app-tile[onclick*="analytics"]').click();
  await page.waitForLoadState('networkidle');
});

test('analytics P&L summary cards are present', async ({ page }) => {
  // Cards may show '—' while loading — assert DOM presence, not value
  await expect(page.locator('#page-analytics .summary-card').first()).toBeVisible();
  await expect(page.locator('#page-analytics .analytics-pnl')).toBeVisible();
});

test('range filter buttons toggle active class', async ({ page }) => {
  // 'This Year' is active by default
  await expect(page.locator('#range-btn-year')).toHaveClass(/active/);

  // Click Last 12M
  await page.click('#range-btn-12m');
  await expect(page.locator('#range-btn-12m')).toHaveClass(/active/);
  await expect(page.locator('#range-btn-year')).not.toHaveClass(/active/);

  // Click All Time
  await page.click('#range-btn-all');
  await expect(page.locator('#range-btn-all')).toHaveClass(/active/);
  await expect(page.locator('#range-btn-12m')).not.toHaveClass(/active/);
});
```

- [ ] **Step 2: Run analytics tests**

```bash
npx playwright test analytics.spec.ts --reporter=line
```
Expected: 2 passed.

- [ ] **Step 3: Run full suite**

```bash
npx playwright test --reporter=line
```
Expected: 16 passed, 0 failed.

- [ ] **Step 4: Commit**

```bash
git add tests/materials.spec.ts tests/scheduler.spec.ts tests/analytics.spec.ts
git commit -m "test: add materials, scheduler, and analytics smoke tests"
```

---

## Reference

**Running tests:**
```bash
# All tests
npx playwright test

# Single file
npx playwright test orders.spec.ts

# With UI (debug mode)
npx playwright test --ui

# Headed (see browser)
npx playwright test --headed
```

**If a test fails due to Supabase timeout:** check that the app can reach Supabase by opening http://localhost:8080 and verifying data loads on the Materials page.

**If port 8080 is in use:** `reuseExistingServer: true` in `playwright.config.ts` means Playwright will use the existing server rather than fail.
