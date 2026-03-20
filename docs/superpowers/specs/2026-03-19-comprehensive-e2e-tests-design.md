# Comprehensive E2E Tests — Design Spec
**Date:** 2026-03-19
**Status:** Approved

---

## Overview

Add a comprehensive end-to-end test suite covering full user workflows across all major app features. The existing smoke tests (22 tests, ~10s) remain untouched. A new `tests/e2e/` directory adds 18 deeper tests that write real data to the production Supabase instance and clean up after themselves. A GitHub Actions workflow runs both suites on every push to `main`.

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
│   └── auth.ts                    ← existing, unchanged
├── auth.spec.ts                   ← existing smoke tests, unchanged
├── home.spec.ts                   ← existing
├── quote.spec.ts                  ← existing
├── orders.spec.ts                 ← existing
├── materials.spec.ts              ← existing
├── scheduler.spec.ts              ← existing
├── analytics.spec.ts              ← existing
└── e2e/
    ├── helpers/
    │   └── cleanup.ts             ← deletes [TEST]-prefixed rows from Supabase
    ├── orders.spec.ts             ← full order lifecycle (5 tests)
    ├── quotes.spec.ts             ← cut list → quote → convert flow (5 tests)
    ├── materials.spec.ts          ← purchase log + cut list save/load/delete (5 tests)
    └── scheduler.spec.ts          ← availability + booking flow (3 tests)

.github/workflows/
├── claude.yml                     ← existing, unchanged
├── claude-code-review.yml         ← existing, unchanged
└── e2e.yml                        ← new: runs smoke + e2e on push to main
```

---

## Playwright Configuration

`playwright.config.ts` gains a second project entry alongside the existing smoke project:

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
    use: { ...devices['Desktop Chrome'] },
    timeout: 30000,
  },
]
```

Existing `webServer` config (Python HTTP server on port 8080) is shared by both projects, unchanged.

Run independently with:
- `npx playwright test --project=smoke`
- `npx playwright test --project=e2e`

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

**`tests/e2e/helpers/cleanup.ts`** exports a single `cleanupTestData()` async function. It calls the Supabase REST API directly using the same anon key already in `index.html`. RLS policies are open anon on all tables, so no service role key is needed.

Tables cleaned up per suite:

| Suite | Tables |
|---|---|
| `e2e/orders.spec.ts` | `orders`, `sales` |
| `e2e/quotes.spec.ts` | `quotes`, `orders` |
| `e2e/materials.spec.ts` | `purchases`, `cut_lists` |
| `e2e/scheduler.spec.ts` | `schedule_slots`, `schedule_bookings`, `availability_windows` |

Each spec file calls `cleanupTestData(tables)` in `afterAll`.

---

## E2E Test Coverage

### `e2e/orders.spec.ts` — 5 tests

All tests use `beforeAll` to login once (the auth helper navigates to Orders page). Each test creates its own tagged order and cleans up in `afterAll`.

1. **Create order** — Fill order modal (tagged name, Standard style, price), save → tagged order appears in Active tab
2. **Edit order** — Create order, click edit, change the name, save → updated name appears in Active tab
3. **Move to Ready to Sell** — Create order, click "Mark Ready", confirm → order disappears from Active, appears in Inventory tab
4. **Complete unpaid order** — Create order (payment: unpaid), click complete, payment modal appears with Revenue/Est. Cost/Margin block → click Cash → order disappears from Active, appears in Sales History tab
5. **Delete order** — Create order, click delete, confirm dialog → order no longer in Active tab list

### `e2e/quotes.spec.ts` — 5 tests

1. **Quote button enables after run** — Navigate to Cut List tab, add a picket part row (qty: 2, len: 36), click Calculate → `#cl-quote-btn` is no longer disabled
2. **Quote modal pre-fill** — After running cut list, click + Quote → modal is visible, `#cqPrice` has a value > 0, `#cqNotes` matches cut list name
3. **Save quote** — Fill and save quote modal with tagged name → navigate to Orders → Quotes tab → tagged quote appears with a margin badge (contains `%`)
4. **Convert quote to order** — Create a quote, click Convert → order modal opens with pre-filled name and price → save order → quote no longer in Quotes tab, tagged order appears in Active tab
5. **Delete quote** — Create a quote, click Delete, confirm → quote no longer in Quotes tab

### `e2e/materials.spec.ts` — 5 tests

1. **Add purchase** — Navigate to Purchases tab, click Add Purchase, fill tagged store/item/cost, save → appears in Purchases log
2. **Delete purchase** — Create a purchase, click delete, confirm → no longer in Purchases log
3. **Run cut list** — Navigate to Cut List tab, add two part rows (qty/len/stock type), click Calculate → at least one board bar renders in the diagram (`.picket-bar` count > 0)
4. **Save and find cut list** — Add parts, run, type a tagged name into `#cl-name`, click Save → tagged name appears in the saved cut lists table
5. **Load and delete cut list** — Save a cut list, click Load on it → `#cl-name` value matches tagged name; click Delete on it → no longer in saved list table

### `e2e/scheduler.spec.ts` — 3 tests

1. **Add availability window** — Click Add Availability, fill day/time range, save → text appears in the Share & Book tab message
2. **Add calendar slot** — Click a calendar day, fill slot details, save → slot visible on calendar
3. **Book a pickup** — Add a slot, click Book, fill customer name (tagged) + time → booking appears in Upcoming tab

---

## GitHub Actions Workflow

New file: `.github/workflows/e2e.yml`

**Trigger:** `push` to `main` branch

**Job steps:**
1. `actions/checkout@v4`
2. `actions/setup-node@v4` with Node 20
3. `npm ci`
4. `npx playwright install chromium`
5. Run smoke suite: `npx playwright test --project=smoke`
6. Run e2e suite: `npx playwright test --project=e2e`
7. On failure: upload Playwright HTML report as artifact (retained 7 days) via `actions/upload-artifact@v4`

**No secrets required** — Supabase anon key and PIN are already in `index.html` (public repo, public-facing app).

**Estimated runtime:** smoke ~15s, e2e ~2–3 minutes, total ~3 minutes per push.

---

## Success Criteria

1. `npx playwright test --project=smoke` runs all 22 existing tests and passes
2. `npx playwright test --project=e2e` runs all 18 new tests and passes
3. All e2e tests clean up their test data — no `[TEST]` rows remain in Supabase after the suite completes
4. The GitHub Action runs automatically on push to `main`, runs both suites in sequence, and uploads an HTML report on failure
5. No changes to existing smoke test files or the two existing GitHub workflows
6. A failed e2e test does not block the smoke suite (smoke runs first and always completes)
