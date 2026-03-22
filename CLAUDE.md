# RMK Crafted — Business Dashboard

## Project Overview
Single-page web app (`index.html`) — all-in-one business dashboard for RMK Crafted, a solo woodworking business in Oceanside, CA selling cedar planter boxes via Facebook Marketplace (pickup only, Cash or Venmo @RMKCrafted).

## Tech Stack
- Frontend: HTML, JavaScript (vanilla) — single `index.html`, no build step, no framework
- Backend: Supabase (PostgreSQL + RLS policies), client variable `sb`
- Hosted on GitHub Pages — commit and push to `main`, auto-deploys in ~60s
- Fonts: Playfair Display, DM Mono, DM Sans — self-hosted in `fonts/` (no CDN dependency)
- Charts: Chart.js v4 (CDN)
- Always check that new Supabase tables have proper RLS policies and that schema columns match the app code before declaring a feature complete.

## File Structure
- `index.html` — CSS first, then HTML, then JS (all in one file)
- `schedule.html` — public customer booking page (no auth required)
- `fonts/` — self-hosted WOFF2 files + `fonts.css` (Playfair Display, DM Mono, DM Sans)
- `manifest.json` — PWA manifest
- `sw.js` — Service worker: caches app shell, auto-reloads on new deploy (`skipWaiting` + `controllerchange`)
- `icon.png` — 1024×1024 app icon (JPEG named .png)

## Supabase Config
- **Project URL**: `https://mfsejmfmyuvhuclzuitc.supabase.co`
- **Anon Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mc2VqbWZteXV2aHVjbHp1aXRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwNTgzODksImV4cCI6MjA4NzYzNDM4OX0.Ve8dY-CvGqCMSWfifd6HvrDvmrJo4J00auhos8aezpY`

## Database Tables
| Table | Purpose |
|---|---|
| `orders` | Active and completed customer orders |
| `inventory` | Ready-to-sell planters in stock |
| `sales` | Historical sales log |
| `purchases` | Lowes material purchase log |
| `stock` | Current material stock levels (3 rows: pickets, twobytwo, twobyfour) |
| `schedule_slots` | Open pickup time slots on the calendar |
| `schedule_bookings` | Booked customer pickups |
| `availability_windows` | Recurring availability windows for the share message |
| `cut_lists` | Saved cut lists — columns: `id`, `name`, `kerf`, `cuts` (JSONB), `stock_types` (JSONB), `notes`, `created_at`, `updated_at` |
| `quotes` | Quotes generated from cut lists — columns: `id`, `name`, `price`, `cut_list_id`, `cut_list_name`, `picket_count`, `notes`, `created_at` |

RLS is enabled on all tables. All business tables require `authenticated` role. Anon has SELECT + UPDATE on `orders` (for `schedule.html` booking flow) and INSERT on `schedule_bookings`. The `orders` table also has a `booking_token` UUID column (indexed) — `schedule.html` resolves orders by `?token=<uuid>`, not `?order=<id>`.

### Authentication
Dashboard uses Supabase Auth (email/password). The `#pin-gate` div is shown immediately on load and hidden by `sb.auth.onAuthStateChange()` once a session is confirmed. `signIn()` calls `sb.auth.signInWithPassword()`. Sign-out clears the session and re-shows the gate. The Supabase client `sb` is exposed on `window.sb` for use in Playwright `page.evaluate()` calls.

## App Structure
Multi-page navigation — pages shown/hidden via CSS classes, no URL routing. Pages load data when navigated to (not all at startup).

### Pages
- **Home** (`page-home`) — KPI cards, low-stock alert, activity feed, tile nav grid
- **Quote Calculator** (`page-quote`) — Price estimator based on picket count
- **Orders** (`page-orders`) — 4 tabs: Active → Ready to Sell → Sales History → Quotes
- **Materials** (`page-materials`) — Stock levels + Lowes purchase log + Cut List Calculator tab
- **Scheduler** (`page-scheduler`) — Calendar, upcoming pickups, share message
- **Analytics** (`page-analytics`) — P&L cards + revenue/profit/best-seller charts

### Non-Obvious Details
- `page-inventory` was removed — inventory lives in Orders page as the middle tab (`otab-inventory`)
- Best Sellers chart ranks by **units sold** (count), not revenue
- `estimateOrderCost()` falls back to **37% of price** for unknown sizes
- `saveBooking()` — when editing a booking that has a linked `order_id`, also syncs `orders.pickup_date` and `orders.pickup_time`
- Recent Activity feed shows booking *creation* time, not pickup date (avoids future timestamps showing as "just now")
- `_pendingQuoteId` — module-level var set when converting a quote to an order. `saveOrder()` clears it (and deletes the source quote) on both success and error paths to prevent leaks.
- `openOrderModal(order, prefill)` — optional second param lets `convertQuoteToOrder()` pre-populate the order modal from a quote without an existing order object

### Cut List Calculator (Materials → Cut List tab)
Key globals: `clStockTypes` (array), `CL_DEFAULT_STOCK`, `CL_COLORS`, `clRowId`

**Packing algorithm** (`runCutListBins`): first-fit-decreasing by length. Before running, rip-cut pieces (width < stock.width) are batched: `ripsPerBoard = Math.floor(stock.width / piece.width)` — groups of up to that many pieces are packed as a single length slot, reducing board count.

**Board diagram**: each bar = one board. Cuts are wrapped in column-flex containers — width scrap (unused board width) appears as a tan block above the piece; batched rip cuts show individual sub-pieces with white separator lines. `align-items:stretch` on `.picket-bar`.

**Save/load**: `saveCutList()` checks `cl-name.dataset.savedId` — if set (loaded from DB), does an UPDATE; otherwise INSERT. `loadCutList(idOrObj)` accepts an ID string (looks up from `allCutLists` module-level array) or a legacy object. `clearCutList()` deletes `savedId`. Saved lists shown as a table (Name / Last Modified / Notes) at the bottom of the page.

**XSS safety**: `loadSavedCutLists()` uses ID-only `onclick="loadCutList('${cl.id}')"` (not full JSON). `renderPurchaseList()` uses `onclick="editPurchase('${p.id}')"`. Both functions resolve the full object from the corresponding module-level array (`allCutLists`, `allPurchases`). The board diagram uses `textContent` (not innerHTML) for cut-piece labels.

**Stock short names**: `CL_DEFAULT_STOCK` entries have a `shortName` field used in dropdowns (e.g. `Picket 6'`); full `name` used in diagram headers.

**Quote button**: `#cl-quote-btn` is disabled by default; `runCutListBins()` enables it after a successful run. `openCreateQuoteModal()` pre-fills price from `clLastRunBoardCounts` and notes from `#cl-name`. `saveQuote()` inserts to the `quotes` table. `convertQuoteToOrder(id)` opens the order modal pre-filled with quote data and sets `_pendingQuoteId`; `saveOrder()` deletes the quote on completion.

## Business / Pricing
- **Pricing formula**: ~$10 per picket (e.g. 10 pickets → ~$100)
- **Material costs** (Lowes + 8.25% Oceanside tax), stored in `UNIT_COSTS`:
  - Pickets: $3.38 → **$3.66**
  - 2×2s: $2.98 → **$3.23**
  - 2×4s: $3.85 → **$4.17**
- **Planter styles**: Standard (pickets only) and Vertical (deeper, uses 2×2s + 2×4s for support)

## Standard Planter Sizes & Prices
Stored in `STANDARD_SIZES`. 8 sizes have hardcoded `pickets`; 16×16×16 and 36×12×16 use formula fallback.

| Size (L×W×H) | Price | Pickets |
|---|---|---|
| 16×16×16" | $30 | 4 |
| 36×12×16" | $55 | 6 |
| 36×16×16" | $60 | 6 |
| 36×16×27" | $70 | 7 |
| 36×24×16" | $100 | 10 |
| 48×12×16" | $75 | 7 |
| 48×12×27" | $80 | 7 |
| 48×16×16" | $85 | 8 |
| 48×16×27" | $90 | 9 |
| 48×24×16" | $110 | 11 |

## UI Guidelines

### Mobile & Cross-Browser
Always test UI changes for mobile overflow and iOS Safari compatibility. When fixing layout issues, use a thorough stacked/responsive approach rather than minimal tweaks.

### Dark Mode
This app supports dark mode. When adding new UI elements or pages, ensure they work with the dark mode theme. Check for contrast, badge colors, and analytics styling.

## Testing

Two-tier Playwright suite — see `tests/README.md` for full details.

- **Smoke** (`tests/*.spec.ts`) — 22 tests, read-only, runs in parallel. Covers page load, navigation, and UI presence for all pages.
- **E2E** (`tests/e2e/*.spec.ts`) — 42 tests, writes real data to Supabase, serial per file. Run with `npx playwright test --project=e2e`.

E2E coverage by file:

| File | Coverage |
|---|---|
| `orders.spec.ts` | Create/edit/delete order, advance status, complete (Cash + Venmo), skip, prepaid bypass, filter, multi-item, mark all paid (Cash + Venmo) |
| `cutlist-quotes.spec.ts` | Quote button enable, modal pre-fill, save/convert/delete quote |
| `materials.spec.ts` | Purchase CRUD, cut list run/save/re-save UPDATE/load-delete, stock +/− |
| `scheduler.spec.ts` | Slot CRUD, booking CRUD, quick book, booking edit syncs `orders.pickup_time`, availability window add/delete |
| `inventory-sales.spec.ts` | Inventory add/qty-adjust/qty→0-removes/delete, sale log/edit/delete |

**When adding new features:** add E2E tests for any new CRUD operations or non-obvious side effects. Update the counts in `tests/README.md` and `README.md`.

## Workflow

### Deployment
After completing changes, push to GitHub and confirm deployment. Always update relevant documentation files when features change.

## Color Palette (CSS Variables)
```css
--navy: #1E4D6B        /* primary dark — headers, buttons */
--navy-dark: #163A52
--ocean: #4A86A8       /* accent blue — borders, hover */
--ocean-light: #7BADC8
--sand: #C9A55A        /* gold accent — logo, highlights */
--sand-light: #E8D5A3
--sand-pale: #F5EDD8
--cream: #FAF8F4       /* page background */
--warm-gray: #E5DDD0   /* card borders, dividers */
--text: #1A2E3A        /* primary text */
--text-muted: #6B8A99  /* secondary text */
--green: #3A7D5C       /* profit, positive, ready status */
--orange: #D4782A      /* pending status, warnings */
--red: #C0392B         /* errors, delete */
```

## Known Bugs / Patterns

### iOS Ghost Click (modal immediately closing)
iOS Safari fires a synthetic `click` ~300ms after `touchend`. If a modal opens on `click`, that ghost click can hit the overlay and close it immediately.

**Fix pattern:**
```js
modal._justOpened = true;
setTimeout(() => delete modal._justOpened, 350);
// In overlay close handler:
if (!o._justOpened) closeModal(...);
```
Applied to `openAddonSettings()`. Overlay handler near bottom of JS.

### Auth Gate (`#pin-gate`)
The gate HTML is above the main `<script>` block, so `sb` is not yet defined when the gate appears. Auth logic (`getSession`, `onAuthStateChange`, `signIn`) is inside `initAuth()` which runs inside the main `<script>` block after `sb` is created.
