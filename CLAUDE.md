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
| `sales` | Historical sales log — columns include `add_ons` (JSONB, array of `{id, label, price}` objects), `product_options` (JSONB, nullable, mirrors first order item's options e.g. `{stain: "Dark Walnut"}`), `items` (JSONB, nullable, `{rows: [{size, style, options, qty, price}]}` — written by the new multi-item Log a Sale modal; legacy rows use flat `size`/`style`/`qty` columns instead) |
| `purchases` | Lowes material purchase log |
| `stock` | Current material stock levels (3 rows: pickets, twobytwo, twobyfour) |
| `schedule_slots` | Open pickup time slots on the calendar |
| `schedule_bookings` | Booked customer pickups |
| `availability_windows` | Recurring availability windows for the share message |
| `cut_lists` | Saved cut lists — columns: `id`, `name`, `kerf`, `cuts` (JSONB), `stock_types` (JSONB), `notes`, `style` (text, nullable), `product_options` (JSONB, nullable), `created_at`, `updated_at` |
| `quotes` | Quotes generated from cut lists — columns: `id`, `name`, `price`, `cut_list_id`, `cut_list_name`, `picket_count`, `notes`, `created_at` |
| `settings` | App configuration key/value rows — keys: `addons` (JSON array), `products` (JSON array), `product_options` (JSON object) |

RLS is enabled on all tables. All business tables require `authenticated` role. Anon has **no direct SELECT or UPDATE on `orders`** — the `schedule.html` booking flow uses two SECURITY DEFINER RPC functions instead: `get_order_by_token(uuid)` (SELECT, returns one order row by token) and `book_order_pickup(uuid, date, text)` (UPDATE, writes pickup date/time). Anon EXECUTE is granted on both functions; anon has no direct table access. Anon INSERT on `schedule_bookings` requires a valid `order_id` linked to an unbooked order. The `settings` table has no anon access. The `orders` table has a `booking_token` UUID column (indexed) — `schedule.html` resolves orders by `?token=<uuid>` only (legacy `?order=<id>` parameter removed).

### Authentication
Dashboard uses Supabase Auth (email/password). The `#pin-gate` div is shown immediately on load and hidden by `sb.auth.onAuthStateChange()` once a session is confirmed. `signIn()` calls `sb.auth.signInWithPassword()`. Sign-out clears the session and re-shows the gate. The Supabase client `sb` is exposed on `window.sb` for use in Playwright `page.evaluate()` calls. `window.sb` is intentionally kept exposed (not gated to localhost) because the Playwright e2e suite runs against the live GitHub Pages URL and uses authenticated `window.sb` calls for test setup/teardown — restricting it to localhost would break CI.

## App Structure
Multi-page navigation — pages shown/hidden via CSS classes, no URL routing. Pages load data when navigated to (not all at startup).

### Pages
- **Home** (`page-home`) — KPI cards, low-stock alert, activity feed, tile nav grid
- **Orders** (`page-orders`) — 4 tabs: Active → Ready to Sell → Sales History → Quotes
- **Materials** (`page-materials`) — Lowes purchase log + Cut List Calculator tab + Products tab + Add-ons tab
- **Scheduler** (`page-scheduler`) — Calendar, upcoming pickups, share message
- **Analytics** (`page-analytics`) — P&L cards + revenue/profit/best-seller charts

### Non-Obvious Details
- `page-inventory` was removed — inventory lives in Orders page as the middle tab (`otab-inventory`)
- Best Sellers chart ranks by **units sold** (count), not revenue
- `estimateOrderCost()` falls back to **37% of price** for unknown sizes
- `saveBooking()` — when editing a booking that has a linked `order_id`, also syncs `orders.pickup_date` and `orders.pickup_time`
- Recent Activity feed shows booking *creation* time, not pickup date (avoids future timestamps showing as "just now")
- `_pendingQuoteId` — module-level var set when converting a quote to an order. `saveOrder()` clears it (and deletes the source quote) on both success and error paths to prevent leaks.
- `openOrderModal(order, prefill)` — optional second param lets `convertQuoteToOrder()` pre-populate the order modal from a quote without an existing order object. `prefill` accepts `{ name, notes, price, size }` — `size` pre-fills the first item row's size field and is extracted via regex from `quote.cut_list_name`.
- Product management lives in Materials → Products tab. `addProduct()`, `renameProduct(idx)`, `deleteProduct(idx)` are the management functions. `populateProductSelects()` refreshes all product dropdowns (`iProduct`, `cl-product`) app-wide. (`sProduct` was removed when Log a Sale was upgraded to multi-item rows.)
- Saved cut lists are grouped by product in `loadSavedCutLists()`. `cl.style = null` (DB column) renders in Uncategorized group.
- Add-on management lives in Materials → Add-ons tab. `ADDONS` array (`[{id, label, base, scales}, ...]`) stored in Supabase `settings` table (key `addons`), loaded via `loadAddonSettings()`. One-time migration from `localStorage` key `rmk_addons` on first load. `addNewAddon()`, `deleteAddon(idx)`, `saveAddonField(idx, key, value)` manage the list. `renderAddonsTab()` re-renders the inline-editable grid.
- Order modal add-ons and Log Sale add-ons: both use the shared `renderOrderAddons(savedIds, savedPrices, listId, containerId)` system — dropdown select + editable price input + Add button, rendered into their respective addon list containers (`#orderAddonList` / `#sAddonList`). Per-addon prices stored as `{id, label, price}` objects. `getAddonTotalFromOrder(listId)` and `appendOrderAddonRow(id, label, price, listId, totalFn)` accept an optional container/list ID (default `'orderAddonList'`). `addOrderAddon(listId, selectId, priceId, containerId)` and `onAddonSelectChange(selectId, priceId, containerId)` are similarly parameterized. Pickup Date + Pickup Time are on the same row in the order modal.
- Ready-to-Sell add-ons: still rendered as pill toggles via `_renderAddonCheckboxes(container, savedIds)` — each add-on is a `<label class="addon-pill">` backed by a hidden `<input type="checkbox">`. No per-sale price editing (uses base price).
- Shared item-row functions: `addOrderItem(size, style, qty, price, savedOptions, containerId='oItemsContainer')`, `getOrderItems(containerId)`, `removeOrderItem(btn)` (auto-detects container via `btn.closest('.order-items')`), `updateRemoveButtons(containerId)` all accept an optional `containerId` parameter. Both the order modal (`#oItemsContainer`) and Log a Sale modal (`#sItemsContainer`) use these same functions. `updateSaleTotal()` is the sale-modal counterpart to `updateOrderTotal()` — it also auto-fills `#sPrice` with the computed total. `onSaleItemProductChange(selectEl)` is the sale-modal counterpart to `onOrderItemProductChange(selectEl)`.
- Log a Sale modal (`#saleModal`): now has multi-item rows (`#sItemsContainer` with `class="order-items"`), addon picker (`#sAddonSelect`, `#sAddonPrice`, `#sAddonList`), running total (`#sItemsTotal`), and manual Sale Price field (`#sPrice`) that auto-fills from item totals. `openSaleModal()` initializes with one blank item row. `editSale(id)` populates from `sale.items.rows` if present, otherwise falls back to flat `size`/`style`/`qty` fields for legacy records. `saveSale()` writes `items: {rows}` plus first-item flat fields for backwards compat.
- `_doCompleteOrder`: sets `status:'completed'`, `pickup_date:null`, `pickup_time:null` in a single atomic Supabase update — prevents completed orders from appearing on the scheduler calendar.
- `completeOrder` Venmo path: clicking Venmo in `#completePaymentModal` calls `showCompleteVenmoFee()` which reveals `#completeVenmoFeeRow` (a fee input pre-filled via `_getVenmoFeeDefault()`) instead of immediately completing. Clicking Confirm calls `finishCompleteOrder('venmo')` which reads `#completeVenmoFee`, writes `venmo_fee` to both `orders` and the new `sales` row, and saves the value to localStorage for next time.
- `renderSalesTable()`: when a sale has `s.items.rows` (multi-item sale), the Size cell renders all rows stacked as `{qty}× {size}` and the Qty cell shows the total across all rows. Legacy flat-field records (`s.size`/`s.qty`) still render unchanged.
- Purchase modal: materials use a dynamic dropdown-based row system (`#pMaterialRows`). `addPurchaseMaterialRow(matType, qty, price)` adds a row; material dropdown auto-fills price from `PURCH_MAT_PRICES` (four options: Cedar Pickets, 2×2s, 2×4s, Other — `other:0` clears the price field for manual entry). `savePurchase` accumulates `otherTotal` for "Other" rows; they contribute to `total` but are not synced to any stock column. Total override field (`#pTotal`) always pre-fills from saved `item.total` when editing.

### Cut List Calculator (Materials → Cut List tab)
Key globals: `clStockTypes` (array), `CL_DEFAULT_STOCK`, `CL_COLORS`, `clRowId`

**Packing algorithm** (`runCutListBins`): first-fit-decreasing by length. Before running, rip-cut pieces (width < stock.width) are batched: `ripsPerBoard = Math.floor(stock.width / piece.width)` — groups of up to that many pieces are packed as a single length slot, reducing board count.

**Board diagram**: each bar = one board. Cuts are wrapped in column-flex containers — width scrap (unused board width) appears as a tan block above the piece; batched rip cuts show individual sub-pieces with white separator lines. `align-items:stretch` on `.picket-bar`.

**Save/load**: `saveCutList()` checks `cl-name.dataset.savedId` — if set (loaded from DB), does an UPDATE; otherwise INSERT. `loadCutList(idOrObj)` accepts an ID string (looks up from `allCutLists` module-level array) or a legacy object. `clearCutList()` deletes `savedId`. Saved lists shown as a table (Name / Last Modified / Notes) in the left column.

**2-column layout**: The cut list tab uses a CSS grid (`#cl-columns`) on desktop (≥1025px). `#cl-col-left` contains Stock Materials + Saved Cut Lists; `#cl-col-right` contains New Cut List (`#cut-list-calc`) including `#cl-results`. Collapses to single column at `≤1024px` via media query.

**XSS safety**: `loadSavedCutLists()` uses ID-only `onclick="loadCutList('${cl.id}')"` (not full JSON). `renderPurchaseList()` uses `onclick="editPurchase('${p.id}')"`. Both functions resolve the full object from the corresponding module-level array (`allCutLists`, `allPurchases`). The board diagram uses `textContent` (not innerHTML) for cut-piece labels.

**Stock short names**: `CL_DEFAULT_STOCK` entries have a `shortName` field used in dropdowns (e.g. `Picket 6'`); full `name` used in diagram headers.

**Quote button**: `#cl-quote-btn` is disabled by default; `runCutListBins()` enables it after a successful run. `openCreateQuoteModal()` pre-fills price from `clLastRunBoardCounts` and notes from `#cl-name`. `saveQuote()` inserts to the `quotes` table, then auto-navigates to Orders → Quotes tab via `goTo('orders')` + clicking `#orders-tabs .tab-btn[onclick*="quotes"]`. `convertQuoteToOrder(id)` opens the order modal pre-filled with quote data (including size extracted via regex from `cut_list_name`) and sets `_pendingQuoteId`; `saveOrder()` deletes the quote on completion.

## Business / Pricing
- **Pricing formula**: ~$10 per picket (e.g. 10 pickets → ~$100)
- **Material costs** (Lowes + 8.25% Oceanside tax), stored in `UNIT_COSTS`:
  - Pickets: $3.38 → **$3.66**
  - 2×2s: $2.98 → **$3.23**
  - 2×4s: $3.85 → **$4.17**
- **Planter products**: Dynamic — `PRODUCT_TYPES` string array stored in Supabase `settings` table (key `products`), loaded via `loadProductSettings()`. One-time migration from `localStorage` key `rmk_products` on first load. Defaults: Standard, Vertical, Tiered, Dog Bowl. Managed via the Products tab on the Materials page. All three material inputs (pickets, 2×2s, 2×4s) are always visible for any product; breakdown only renders rows for materials with qty > 0.
- **Product options**: `PRODUCT_OPTIONS` object (`{ [productName]: [{id, label, choices:[]}] }`) stored in Supabase `settings` table (key `product_options`), loaded via `loadProductOptions()`. Configured per-product in the Products tab options panel (`toggleProductOptions`, `saveOption`, `deleteOption`). Options cascade on product rename/delete. `renderProductOptionSelects(productName, savedOptions, containerEl)` renders inline selects in the order modal (`.item-options`) and cut list (`#cl-product-options`). `readProductOptionSelects(containerEl)` collects selections. `window._setProductOptions(v)` is an in-memory setter exposed for Playwright test injection (avoids needing to write to Supabase during tests).

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

### Responsive Layout
Three breakpoints are defined. Do not break any of them when adding new UI:
- `@media (max-width: 640px)` — mobile: single-column stacks, larger touch targets, iOS input zoom fix
- `@media (max-width: 820px)` and `@media (min-width: 641px) and (max-width: 1024px)` — tablet
- `@media (min-width: 1025px)` — desktop: max-width 1280px, 40px side padding, home 2-col layout, analytics 3-col chart grid, scheduler side-by-side calendar+detail

Always test UI changes for mobile overflow and iOS Safari compatibility. When fixing layout issues, use a thorough stacked/responsive approach rather than minimal tweaks.

**CSS cascade note:** The desktop `@media (min-width: 1025px)` block is placed **after** all base styles (including `#page-analytics` and `.analytics-grid`) to ensure correct override order. If you add base styles for these elements, keep them before that media query block.

### Dark Mode
This app supports dark mode. When adding new UI elements or pages, ensure they work with the dark mode theme. Check for contrast, badge colors, and analytics styling.

## Testing

Two-tier Playwright suite — see `tests/README.md` for full details.

- **Smoke** (`tests/*.spec.ts`) — 26 tests, read-only, runs in parallel. Covers page load, navigation, and UI presence for all pages.
- **E2E** (`tests/e2e/*.spec.ts`) — 66 tests, writes real data to Supabase, serial per file. Run with `npx playwright test --project=e2e`.

E2E coverage by file:

| File | Coverage |
|---|---|
| `orders.spec.ts` | Create/edit/delete order, advance status, complete (Cash + Venmo), skip, prepaid bypass, filter, add-on saved on order, multi-item, mark all paid (Cash + Venmo), product option on card, option restored on edit, option flows to sales history |
| `cutlist-quotes.spec.ts` | Quote button enable, modal pre-fill, save/convert/delete quote |
| `materials.spec.ts` | Purchase CRUD, cut list run/save/re-save UPDATE/load-delete, add/rename/delete product, add/delete add-on, new add-on syncs to order modal dropdown, product options panel toggle, add option to product, option dropdown in order modal |
| `scheduler.spec.ts` | Slot CRUD, booking CRUD, quick book, booking edit syncs `orders.pickup_time`, availability window add/delete |
| `inventory-sales.spec.ts` | Inventory add/qty-adjust/qty→0-removes/delete, sale log/edit/delete, sale with add-on shows label+price in history, add-on resilience (ADDONS cleared from localStorage) |
| `visual-coverage.spec.ts` | Cut list board diagram, calendar dot states, order status badge colours, quote margin badge |

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
