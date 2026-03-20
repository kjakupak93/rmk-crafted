# Comprehensive E2E Tests — Design Spec
**Date:** 2026-03-19
**Status:** Approved

---

## Overview

Add a comprehensive end-to-end test suite covering full user workflows across all major app features. The existing smoke tests (22 tests, ~15s) remain untouched. A new `tests/e2e/` directory adds 18 deeper tests that write real data to the production Supabase instance and clean up after themselves. A GitHub Actions workflow runs both suites on every push to `main`.

---

## Architecture

Two-tier test structure:

- **Smoke suite** (`tests/*.spec.ts`) — existing, unchanged. Navigation presence, UI state, no data writes. Fast (~15s).
- **E2E suite** (`tests/e2e/*.spec.ts`) — new. Full user workflows with data reads and writes. Slower (~2–3 minutes).

Both suites use Playwright + Chromium, the same Python HTTP server on port 8080, and the same `login()` auth helper. The e2e suite uses a longer default timeout (30s vs 10s for smoke).

---

## File Structure

```
tests/
├── helpers/
│   └── auth.ts                        ← existing, unchanged
├── auth.spec.ts                       ← existing smoke tests, unchanged
├── home.spec.ts                       ← existing
├── quote.spec.ts                      ← existing
├── orders.spec.ts                     ← existing
├── materials.spec.ts                  ← existing
├── scheduler.spec.ts                  ← existing
├── analytics.spec.ts                  ← existing
└── e2e/
    ├── helpers/
    │   └── cleanup.ts                 ← deletes [TEST]-prefixed rows from Supabase
    ├── orders.spec.ts                 ← full order lifecycle (5 tests)
    ├── cutlist-quotes.spec.ts         ← cut list → quote → convert flow (5 tests)
    ├── materials.spec.ts              ← purchase log + cut list save/load/delete (5 tests)
    └── scheduler.spec.ts              ← availability + booking flow (3 tests)

.github/workflows/
├── claude.yml                         ← existing, unchanged
├── claude-code-review.yml             ← existing, unchanged
└── e2e.yml                            ← new: runs smoke + e2e on push to main
```

---

## Playwright Configuration

`playwright.config.ts` is updated from a single unnamed `chromium` project to two named projects. The root-level `testDir` is removed (each project specifies its own). The existing `webServer` config and all other root-level settings remain unchanged.

```ts
projects: [
  {
    name: 'smoke',
    testDir: './tests',
    testIgnore: '**/e2e/**',
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
]
```

**Note:** `actionTimeout` and `navigationTimeout` are `use`-level browser context options. `timeout` (the hard per-test ceiling) is a project-level key — set as `timeout: 60000` directly on the project object, not inside `use`. The existing smoke tests already pass without a longer timeout, so no change is needed there.

Run independently with:
- `npx playwright test --project=smoke`
- `npx playwright test --project=e2e`

---

## Authentication Pattern in E2E Tests

`login()` (from `tests/helpers/auth.ts`) navigates to `/`, enters PIN 1234, and waits for `#pin-gate` to be hidden. It does **not** navigate to any app page — it only dismisses the pin gate and lands on the home page.

Each e2e test (or `beforeEach`) must navigate to the target page after calling `login()`. For example:

```ts
beforeEach(async ({ page }) => {
  await login(page);
  await page.click('.app-tile--orders');
  await page.waitForSelector('#page-orders.active');
});
```

---

## Data Hygiene

All test data is tagged with a shared prefix `[TEST]` plus a suite-level timestamp frozen at the start of each spec file:

```ts
const TAG = `[TEST-${Date.now()}]`;
// Used as: `${TAG} John Doe`, `${TAG} Cut List`
```

**Why this prefix pattern:**
- Easy to distinguish test rows from real data
- Cleanup targets `[TEST]%` via `.like()` — catches orphaned rows from crashed prior runs, not just the current timestamp
- Never touches real data

**`tests/e2e/helpers/cleanup.ts`** exports a single `cleanupTestData(tables: string[])` async function. It calls the Supabase REST API directly (fetch + anon key from the config constants) using the same anon key already in `index.html`. RLS policies are open anon on all relevant tables, so no service role key is needed.

**Partial failure / `beforeAll` crash:** If a test crashes after writing a row, `afterAll` still runs in Playwright (unless `beforeAll` itself throws, in which case Playwright skips the suite including `afterAll`). To guard against `beforeAll` crashes leaving orphaned rows, cleanup targets the broad `[TEST]%` prefix rather than a specific timestamp — so orphaned rows from any prior crashed run are also deleted on the next successful run.

Tables cleaned up per suite:

| Suite | Tables |
|---|---|
| `e2e/orders.spec.ts` | `orders`, `sales` |
| `e2e/cutlist-quotes.spec.ts` | `quotes`, `orders`, `cut_lists` |
| `e2e/materials.spec.ts` | `purchases`, `cut_lists` |
| `e2e/scheduler.spec.ts` | `schedule_slots`, `schedule_bookings`, `availability_windows` |

Each spec file calls `cleanupTestData(tables)` in `afterAll`.

**`quotes` table note:** The `quotes` table was added as part of the "Quotes from Cut List" feature and is not yet listed in `CLAUDE.md`'s database inventory. Schema: `id uuid, name text, price numeric, cut_list_id uuid, cut_list_name text, picket_count integer, notes text, created_at timestamptz`. Cleanup uses `.like('name', '[TEST]%')`.

---

## E2E Test Coverage

### `e2e/orders.spec.ts` — 5 tests

`beforeEach`: call `login(page)`, then navigate to Orders via `.app-tile--orders` and wait for `#page-orders.active`. Each test creates its own tagged order. `afterAll` calls `cleanupTestData(['orders', 'sales'])`.

1. **Create order** — Click "New Order", fill tagged name + Standard style + size + price, save → tagged order row appears in Active tab
2. **Edit order** — Create order, click its edit button, change the name, save → updated name appears in Active tab
3. **Move to Ready to Sell** — Create order, click "Mark Ready" (or equivalent action button), confirm → order disappears from Active tab, appears in Inventory tab
4. **Complete unpaid order** — Create order with payment type "unpaid", click complete, `completePaymentModal` opens and contains Revenue/Est. Cost/Margin text block → click Cash button → order disappears from Active tab, appears in Sales History tab
5. **Delete order** — Create order, click its delete button, confirm dialog → order row no longer in Active tab

### `e2e/cutlist-quotes.spec.ts` — 5 tests

All tests start by navigating to Materials → Cut List tab. The cut list name input (`#cl-name`) is set to a tagged value before saving/quoting. `afterAll` calls `cleanupTestData(['quotes', 'orders', 'cut_lists'])`.

1. **Quote button enables after run** — Type a tagged name into `#cl-name`, add a picket part row (qty: 2, len: 36, stock type: Picket), click Calculate (`#cl-run`) → `#cl-quote-btn` becomes enabled (not disabled)
2. **Quote modal pre-fill** — After running the cut list (with a named cut list), click `#cl-quote-btn` → `#createQuoteModal` is visible, `#cqPrice` value is > 0, `#cqNotes` value equals the tagged name in `#cl-name`
3. **Save quote** — Run cut list, click + Quote, fill `#cqName` with tagged name, save → navigate to Orders → Quotes tab → row containing the tagged name appears with a `%` margin badge
4. **Convert quote to order** — Create a saved quote (via UI), navigate to Quotes tab, click Convert on the tagged quote row → `#orderModal` opens with `#oName` pre-filled → save order → tagged quote row no longer in Quotes tab, tagged order row appears in Active tab
5. **Delete quote** — Create a saved quote, navigate to Quotes tab, click Delete on the tagged row, confirm → row no longer in Quotes tab

### `e2e/materials.spec.ts` — 5 tests

`beforeEach`: `login(page)` + navigate to Materials via `.app-tile--mats`. `afterAll` calls `cleanupTestData(['purchases', 'cut_lists'])`.

1. **Add purchase** — Click Purchases tab, click Add Purchase, fill tagged store name + item + cost, save → row with tagged store name appears in Purchases log
2. **Delete purchase** — Add a purchase, click its delete button, confirm → row no longer in Purchases log
3. **Run cut list** — Click Cut List tab, add two part rows (different quantities and lengths, stock type: Picket), click Calculate → at least one `.picket-bar` element exists in the DOM
4. **Save cut list** — Add parts to cut list, run, type tagged name into `#cl-name`, click Save → row with tagged name appears in the saved cut lists table below
5. **Load and delete cut list** — Save a cut list, click Load on its row → `#cl-name` value matches the tagged name; click Delete on its row → row no longer in saved list table

### `e2e/scheduler.spec.ts` — 3 tests

`beforeEach`: `login(page)` + navigate to Scheduler via `.app-tile--sched`. `afterAll` calls `cleanupTestData(['schedule_slots', 'schedule_bookings', 'availability_windows'])`.

1. **Add availability window** — Click "Add Availability" (or equivalent), fill in a day and time range, save → content appears in the Share & Book tab message area
2. **Add calendar slot** — Click a non-past calendar day cell (`.cal-day:not(.past-day):not(.other-month)` — see selector note below), fill slot details in the resulting modal, save → slot indicator visible on that calendar day
3. **Book a pickup** — Add a slot, click Book on it, fill tagged customer name + select a time, save → row with tagged customer name appears in Upcoming tab

**Scheduler selector note:** Calendar day cells use class `.cal-day`. Non-clickable cells use `.past-day` (past dates) and `.other-month` (days outside the current month). The correct selector for a clickable day is `.cal-day:not(.past-day):not(.other-month)`.

---

## GitHub Actions Workflow

New file: `.github/workflows/e2e.yml`

**Trigger:** `push` to `main` branch

**Job steps:**
1. `actions/checkout@v4`
2. `actions/setup-node@v4` with Node 20
3. `npm ci`
4. `npx playwright install --with-deps chromium` — `--with-deps` installs OS-level browser dependencies required on Ubuntu runners (libgbm, etc.)
5. Run smoke suite: `npx playwright test --project=smoke`
6. Run e2e suite: `npx playwright test --project=e2e` (runs even if smoke passes, fails independently)
7. On failure (`if: failure()`): upload Playwright HTML report as artifact (retained 7 days) via `actions/upload-artifact@v4`

**No secrets required** — Supabase anon key and PIN are already in `index.html` (public repo, public-facing app).

**Estimated runtime:** smoke ~15s, e2e ~2–3 minutes, total ~3 minutes per push.

---

## Success Criteria

1. `npx playwright test --project=smoke` runs all 22 existing tests and passes
2. `npx playwright test --project=e2e` runs all 18 new tests and passes
3. All e2e tests clean up their test data in `afterAll` — the `[TEST]%` prefix ensures orphaned rows from crashed prior runs are also swept on the next successful run
4. The GitHub Action triggers on push to `main`, runs smoke then e2e in sequence, and uploads an HTML report artifact on failure
5. No changes to existing smoke test files or the two existing GitHub workflows
6. The smoke suite completes independently of e2e results — a failing e2e test does not retroactively affect the smoke run
