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

28 tests. Fast, read-only — no data writes to Supabase. Runs in parallel.

| File | What it checks |
|---|---|
| `auth.spec.ts` | PIN gate: wrong PIN shows error, correct PIN dismisses gate |
| `home.spec.ts` | KPI cards present, nav tiles visible, dark mode toggle, + New Order shortcut opens order modal |
| `orders.spec.ts` | Orders page tabs, New Order modal, Quotes tab visibility, Sales History margin badges |
| `materials.spec.ts` | Stock counts load, tab switching (all 5 tabs), Cut List quote button starts disabled, Products tab renders, Add-ons tab renders |
| `scheduler.spec.ts` | Calendar renders, tab switching |
| `analytics.spec.ts` | P&L cards, charts, range toggle |

---

## E2E Suite (`tests/e2e/*.spec.ts`)

59 tests. Writes real data to the production Supabase instance and cleans up after each suite. All specs run serially (`test.describe.configure({ mode: 'serial' })`).

| File | Tests | Coverage |
|---|---|---|
| `orders.spec.ts` | 11 | Create, edit, advance status (pending→building→ready), complete unpaid (Cash + Venmo), skip payment, prepaid bypass, delete, filter, add-on saved on order, multi-item, mark all paid (Cash + Venmo) |
| `cutlist-quotes.spec.ts` | 9 | Quote button enables after run, modal pre-fill, save quote, auto-nav to Quotes tab after save, convert to order, size carried from cut list name, delete, product saved with cut list, product grouping in saved list |
| `materials.spec.ts` | 15 | Add/edit/delete purchase, run cut list, save cut list, re-save updates existing record, load + delete cut list, stock +/− buttons, add product, rename product, delete product, product persists across reload, add/delete add-on, new add-on appears in order modal dropdown |
| `scheduler.spec.ts` | 10 | Add/edit/delete slot, book/edit/delete pickup, quick book, booking edit syncs order pickup time, add/delete availability window |
| `inventory-sales.spec.ts` | 8 | Add inventory, adjust qty (+/−), qty → 0 removes item, delete inventory, log/edit/delete sale, sale with add-on shows label+price in history |
| `visual-coverage.spec.ts` | 4 | Cut list board diagram, calendar dot states, order status badge colours (all four states), quote margin badge |

### Authentication

Each e2e test calls `login(page)` (from `tests/helpers/auth.ts`) which enters the PIN and waits for the PIN gate to be dismissed. After login, each test navigates to its target page via the home tile grid.

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

No secrets are needed — the Supabase anon key and PIN are already in `index.html` (public repo, anon-access app).

---

## Helpers

| File | Purpose |
|---|---|
| `tests/helpers/auth.ts` | `login(page)` — enters PIN and waits for gate to dismiss |
| `tests/e2e/helpers/cleanup.ts` | `cleanupTestData(tables)` — deletes `[TEST]%` rows via Supabase REST API; `cleanupById(table, id)` — deletes a specific row by ID |
