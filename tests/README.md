# Tests

Two-tier Playwright test suite for the RMK Crafted dashboard. Both suites use Chromium and a local Python HTTP server on port 8080.

---

## Running Tests

```bash
# Smoke suite only (~10s)
npx playwright test --project=smoke

# E2E suite only (~15s locally, ~2-3 min in CI)
npx playwright test --project=e2e

# Both suites
npx playwright test
```

The server starts automatically. On CI, `reuseExistingServer` is disabled so a fresh server is always launched.

---

## Smoke Suite (`tests/*.spec.ts`)

30 tests. Fast, read-only — no data writes to Supabase. Runs in parallel.

| File | What it checks |
|---|---|
| `auth.spec.ts` | Auth gate: wrong credentials show error, correct email/password dismisses gate |
| `home.spec.ts` | KPI cards present, sidebar nav items count, + New Order shortcut opens order modal |
| `orders.spec.ts` | Orders page tabs, New Order modal, Quotes tab visibility, Sales History margin badges |
| `materials.spec.ts` | Tab switching (all 4 tabs), Cut List quote button starts disabled, Products tab renders, Add-ons tab renders |
| `scheduler.spec.ts` | Calendar renders, tab switching |
| `analytics.spec.ts` | P&L cards, charts, range toggle |

---

## E2E Suite (`tests/e2e/*.spec.ts`)

77 tests. Writes real data to the production Supabase instance and cleans up after each suite. All specs run serially (`test.describe.configure({ mode: 'serial' })`).

| File | Tests | Coverage |
|---|---|---|
| `orders.spec.ts` | 16 | Create, edit, advance status (pending→building→ready), complete unpaid (Cash + Venmo), skip payment, prepaid bypass, delete, filter, add-on saved on order, multi-item, mark all paid (Cash + Venmo), product option on card, option restored on edit, option flows to sales history |
| `cutlist-quotes.spec.ts` | 9 | Quote button enables after run, modal pre-fill, save quote, auto-nav to Quotes tab after save, convert to order, size carried from cut list name, delete, product saved with cut list, product grouping in saved list |
| `materials.spec.ts` | 19 | Add/edit/delete purchase, run cut list, save cut list, re-save updates existing record, load + delete cut list, add product, rename product, delete product, product persists across reload, add/delete add-on, new add-on appears in order modal dropdown, options panel toggle, add option to product, option dropdown in order modal, custom stock type persists globally after Clear, custom stock type survives page reload and appears in cut row dropdown |
| `scheduler.spec.ts` | 11 | Add/edit/delete slot, book/edit/delete pickup, quick book, booking edit syncs order pickup time, add/delete availability window, booking shows — when time not set |
| `inventory-sales.spec.ts` | 9 | Add inventory, adjust qty (+/−), qty → 0 removes item, delete inventory, log/edit/delete sale, sale with add-on shows label+price in history, add-on resilience (localStorage cleared) |
| `visual-coverage.spec.ts` | 4 | Cut list board diagram, calendar dot states, order status badge colours (all four states), quote margin badge |
| `analytics.spec.ts` | 9 | Product filter pills render, active state, KPI label update, best-sellers dropdown removal, add-on section present, addon chart canvases visible |

### Authentication

Each e2e test calls `login(page)` (from `tests/helpers/auth.ts`). For the e2e suite, a global setup (`tests/global-setup.ts`) signs in once with `TEST_EMAIL`/`TEST_PASSWORD` and saves Supabase session storage state — each test file starts pre-authenticated. For the smoke suite, `login()` signs in with email/password directly if the gate is visible. After login, each test navigates to its target page via the home tile grid.

### Data Hygiene

All test rows are tagged with a `[TEST] {timestamp}` prefix (e.g. `[TEST] 1742481234567 Jane Doe`). The cleanup helper in `tests/e2e/helpers/cleanup.ts` deletes all rows matching `[TEST]%` from the relevant tables after each suite.

**Why `[TEST]%` and not a specific timestamp:** cleanup catches orphaned rows from any prior crashed run, not just the current session.

Tables cleaned up per suite:

| Suite | Tables |
|---|---|
| `orders.spec.ts` | `orders`, `sales` |
| `cutlist-quotes.spec.ts` | `quotes`, `orders`, `cut_lists` |
| `materials.spec.ts` | `purchases`, `cut_lists` |
| `scheduler.spec.ts` | `schedule_slots`, `schedule_bookings`, `orders`, `activity_log`, `availability_windows` (by ID) |

`availability_windows` has no tag column — those rows are cleaned up by ID diff (record IDs before/after each test).

---

## CI

Both suites run on every push to `main` via `.github/workflows/e2e.yml`. Smoke runs first, then e2e. If either fails, the Playwright HTML report is uploaded as an artifact (retained 7 days).

The Supabase anon key is already in `index.html`. `TEST_EMAIL` and `TEST_PASSWORD` must be set as GitHub Actions secrets for the sign-in flow.

---

## Helpers

| File | Purpose |
|---|---|
| `tests/helpers/auth.ts` | `login(page)` — enters PIN and waits for gate to dismiss |
| `tests/e2e/helpers/cleanup.ts` | `cleanupTestData(tables)` — deletes `[TEST]%` rows via Supabase REST API; `cleanupById(table, id)` — deletes a specific row by ID; `snapshotSettings / resetSettings / restoreSettings` — snapshot/reset/restore `addons`, `products`, `product_options` settings rows; `snapshotStock / restoreStock` — snapshot/restore stock qtys; `snapshotUnpaidOrders / restoreOrderPayments` — snapshot/restore unpaid order payment state |
