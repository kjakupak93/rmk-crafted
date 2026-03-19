# E2E Smoke Tests — Design Spec
**Date:** 2026-03-19
**App:** RMK Crafted Business Dashboard (`index.html`)
**Tool:** Playwright

---

## Goals

Add a Playwright smoke test suite that verifies the app's 6 pages load correctly, navigation works, and key UI elements are present. Tests run against the real Supabase database. No data is written during smoke tests, so no cleanup is needed.

---

## Constraints

- Real Supabase database (no mocking)
- Smoke tests only — navigate and observe, no form submissions
- No data written to Supabase, so no teardown needed
- App served locally at `http://localhost:8080`

---

## File Structure

```
rmk-crafted/
  tests/
    helpers/
      auth.ts          ← shared login() helper
    auth.spec.ts
    home.spec.ts
    quote.spec.ts
    orders.spec.ts
    materials.spec.ts
    scheduler.spec.ts
    analytics.spec.ts
  playwright.config.ts
  package.json         ← new file
```

---

## Setup

### `package.json`
New file at `rmk-crafted/package.json` with `@playwright/test` as a devDependency and a `test` script (`playwright test`).

### `playwright.config.ts`
- `baseURL`: `http://localhost:8080`
- `webServer`: auto-starts `python3 -m http.server 8080` in `rmk-crafted/`, with `reuseExistingServer: true` so it tolerates an already-running server
- Single browser: Chromium
- `testDir`: `./tests`

### `tests/helpers/auth.ts`
Exports a `login(page)` function that:
1. Navigates to `/`
2. Fills `#pin-input` with `1234`
3. Presses Enter
4. Awaits `page.locator('#pin-gate').waitFor({ state: 'hidden' })` — do NOT use a bare `expect(...).not.toBeVisible()` as it has no built-in wait and will be flaky

**Important:** The app's IIFE unconditionally shows `#pin-gate` on every page load regardless of `sessionStorage`. Tests must always go through UI PIN entry via `login(page)` — pre-seeding sessionStorage will NOT bypass the gate.

### Async data loading
Pages fetch from Supabase when navigated to. After calling `goTo()` via UI click, tests must wait for data to appear before asserting. Use `waitForLoadState('networkidle')` after each navigation, or wait for a specific sentinel element to be visible.

---

## Test Files & Cases

### `auth.spec.ts` (2 tests)
- Wrong PIN (`9999`) → `#pin-error` becomes visible, `#pin-input` is empty
- Correct PIN (`1234`) → `#pin-gate` hidden (`display: none`), `#page-home` is visible

### `home.spec.ts` (3 tests)
- KPI cards render: at least one `.home-kpi-row .summary-card` is visible
- Nav tiles present: 5 `.app-tile` elements exist in the DOM
- Dark mode toggle: `beforeEach` must call `page.evaluate(() => localStorage.removeItem('rmk_theme'))` and reload to ensure a known light-mode starting state. Clicking `#dark-toggle` sets `data-theme="dark"` on the `<html>` element — assert `page.locator('html').toHaveAttribute('data-theme', 'dark')` (NOT `body`). Clicking again sets `data-theme=""` (empty string — attribute remains, value clears). Assert `page.locator('html').toHaveAttribute('data-theme', '')` after second click.

### `quote.spec.ts` (2 tests)
- Page loads: `#page-quote` becomes active after clicking the Quote `.app-tile`
- Style selector: clicking a `.style-btn` applies `.active` class to it; fill `#dimL`, `#dimW`, `#dimH` with valid integers (e.g. 72, 60, 36) and `#qPickets` with a number (e.g. 10) before clicking `.calc-btn`; assert `#qResults` has class `show`

### `orders.spec.ts` (3 tests)
- Page loads: orders list/table is present after `networkidle`
- All 3 tabs (Active, Ready to Sell, Sales History) switch the active `.tab-panel` when clicked
- Clicking "New Order" opens the modal: `#orderModal` has class `.open`

### `materials.spec.ts` (2 tests)
- Page loads: `.stock-qty` elements (`#sq-pickets`, `#sq-twobytwo`, `#sq-twobyfour`) have non-dash text content after `networkidle` (initial value is `—`, replaced by a number once Supabase returns)
- All 3 tabs (Stock, Purchases, Cut List) switch the active `.tab-panel` when clicked

### `scheduler.spec.ts` (2 tests)
- Calendar renders: `#calLabel` has non-empty text content (e.g. "March 2026")
- All 3 tabs (Calendar, Upcoming, Share & Book) switch the active `.tab-panel` when clicked

### `analytics.spec.ts` (2 tests)
- P&L cards visible: at least one `.summary-card` in the analytics section is in the DOM (cards may show `—` while loading — DOM presence is sufficient)
- Range filter: `.analytics-range-toggle button` elements toggle `.active` class on click; clicking a button makes it active and removes active from others

---

## Total: 16 tests

---

## Running Tests

```bash
# Install
npm install

# Run all smoke tests (auto-starts server)
npx playwright test

# Run one page's tests
npx playwright test orders

# Run with UI
npx playwright test --ui
```

---

## Notes

- PIN is hardcoded as `1234` in the app source. Tests depend on this value.
- `reuseExistingServer: true` means if port 8080 is already in use, Playwright uses it rather than failing.
- Smoke tests do not submit any forms or write to Supabase, so no teardown is needed.
- If Supabase is unreachable, tests asserting on loaded data (KPI cards, orders list) will reflect that — intentional, surfaces real connectivity issues.
- Modal IDs use camelCase in the DOM (e.g. `#orderModal`, not `#order-modal`).
