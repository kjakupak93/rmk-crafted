# RMK Crafted — Business Dashboard

> Custom business management suite for a solo cedar planter box business in Oceanside, CA.
> Built for internal use only. Sold via Facebook Marketplace, pickup only.

**Live dashboard →** https://kjakupak93.github.io/rmk-crafted/
**Customer scheduler →** https://kjakupak93.github.io/rmk-crafted/schedule.html

---

## What This Is

A single-page web app that manages every part of the RMK Crafted workflow:

- **Home Dashboard** — at-a-glance KPI cards (this month's revenue, YTD, ready-to-sell count, amount owed) with trend badges showing ▲/▼ % vs prior period, plus a tile grid linking to every section. The hero card contains a prominent gold **+ New Order** button for quick access without navigating away
- **Order & Inventory Tracker** — manage active orders, ready-to-sell stock, and sales history
- **Material Cost Tracker** — track cedar stock levels and Lowes purchases
- **Pickup Scheduler** — manage availability, view upcoming pickups, sync with customer bookings
- **Analytics** — P&L summary cards, revenue trends, profit overview, and best-selling sizes ranked by units sold
- **Cut List Calculator** — plan wood cuts, visualize board usage with rip-cut optimization, and save cut lists for reuse

All data is stored in Supabase (cloud) so it works across any device. The dashboard is PIN-protected. Customers only ever see `schedule.html`.

---

## The Five Modules

### 1 — Order & Inventory Tracker

**Active Orders tab** — all in-progress orders, each showing:

| Field | Description |
|---|---|
| Customer name | Who the order is for |
| Item details | Size, style, quantity |
| Price | Total order value |
| Payment status | Unpaid / Cash / Venmo |
| Pickup date & time | When they're coming |
| Status badge | Color-coded build stage |
| 📅 Self-booked | Customer scheduled their own pickup via the booking link |

**Order statuses:**

| Status | Color | Meaning |
|---|---|---|
| Pending | 🟠 Orange | Received, not started |
| Building | 🔵 Blue | Currently being built |
| Ready for Pickup | 🟢 Green | Built, waiting for customer |
| Completed | Gray | Picked up and paid |
| Overdue | 🔴 Red | Pickup date passed without completion |

**Order card buttons:**

| Button | Action |
|---|---|
| ✏️ Edit | Open order edit modal |
| ✅ Complete | Mark as done, log to sales history |
| 🗑️ Delete | Permanently remove (cannot undo) |
| 🔗 Share booking link | Copy a unique URL to send to the customer so they can self-schedule their pickup |

**Adding or editing an order** — fields include: Customer Name · Contact · Items (size, product, qty, price) · Add-ons (select from dropdown, price editable per order) · Payment · Status · Pickup Date · Pickup Time · Notes

> **Product-specific options** — if a product has options configured (e.g. Dog Bowl Stand has a Stain option with choices Natural Cedar / Dark Walnut), a dropdown appears inline below the item row as soon as that product is selected. The selected value is saved with the order, shown on the order card subtitle, and carried into the sales history record.

> Setting a **Pickup Date + Time** automatically creates a booking on the Pickup Scheduler calendar. Updating it later updates the calendar too.

**Ready-to-Sell Inventory tab** — finished boxes not tied to a specific order. Use +/− to adjust quantity as items sell.

**Sales History tab** — auto-populated when an order is completed, or logged manually via **+ Log Sale**. Shows running totals for total revenue, units, and average order value. Filter by **This Week · This Month · 2026 · 2025 · All Time**.

Each row shows the sale date, size (with any add-ons listed below as `✨ Sealant (+$20) · Casters (+$40)`), qty, product type, buyer name, price with margin %, payment method, and notes. Multi-item sales show each item stacked in the size cell (e.g. `3× 48×24×16` / `2× 16×16×16`) with a combined total qty. Tap ✏️ to edit or 🗑️ to delete any record.

**Log a Sale manually** — the sale modal includes: Buyer Name · Date · Items (multi-row: size, product, product options, qty, price — same system as Create Order) · Add-ons (dropdown + editable price, same as Create Order) · Sale Price (auto-sums from item rows, stays editable) · Payment (cash or Venmo + fee) · Notes. Completing an order automatically captures any add-ons from the order into the sales record. Editing a legacy single-item sale still works — the modal reconstructs a single item row from the stored flat fields.

**Quotes tab** — saved quotes generated from the Cut List Calculator. Each row shows the quote name, price, picket count, and estimated margin. Tap **Convert** to open the New Order modal pre-filled with the quote's details (name, price, notes, and size if the cut list name contains a dimension like `36×16×16`) — saving the order automatically deletes the quote. After creating a quote, the app navigates directly to the Quotes tab. Tap **Delete** to remove a quote without converting.

---

### 3 — Material Cost Tracker

**Stock Levels tab** — current on-hand quantities for each material:
- Cedar Pickets (6ft)
- 2×2 Lumber (8ft)
- 2×4 Lumber (8ft)

Stock color coding: 🔴 Low · 🟠 Medium · 🟢 Good

Use +/− buttons to adjust as you build or receive materials.

**Lowes Purchase Log tab** — log every materials run. Select a material from the dropdown (Cedar Pickets, 2×2s, 2×4s, or **Other** for miscellaneous items — auto-fills unit price for known materials, clears price for Other so you enter it manually), enter quantities, add notes and a total override. Records date, store, and cost. Tracks total materials spend over time. Filter by **Last Week · This Month · Last Month · 2026 · 2025 · All Time**.

> Note: Logging a purchase does **not** auto-update stock levels. Update the Stock Levels tab manually.

**Products tab** — manage planter product types (Standard, Vertical, Tiered, Dog Bowl, etc.).

| Action | How |
|---|---|
| Add product | **+ Add Product** → type name → Enter |
| Rename product | **Rename** button on row → type new name → Enter |
| Delete product | Trash button on row (blocked if it's the last product) |

Product names populate the product dropdown in all order and cut list forms. Renaming or deleting a product automatically cascades to all existing orders, sales, inventory, and cut list records.

**Product options** — each product can have one or more named option sets (e.g. a "Stain" option with choices "Natural Cedar, Dark Walnut"). Configure them by expanding the **Options** panel on any product row.

| Action | How |
|---|---|
| Open options panel | **Options ▾** button on the product row |
| Add an option | **+ Add Option** → enter Label and Choices (comma-separated) → **Add** |
| Edit an option | **Edit** button next to the option → update fields → **Save** |
| Delete an option | **Delete** button next to the option → confirm |

Once an option is saved, the matching dropdown(s) appear automatically in the **New/Edit Order modal** and in the **Cut List Calculator** whenever that product is selected.

**Add-ons tab** — manage optional add-ons (Sealant, Fabric Liner, Casters, etc.). Each add-on has a name, base price, and a **Scales** toggle that auto-adjusts price with planter size. Changes take effect immediately in the order modal dropdown. When creating an order, select add-ons from a dropdown with an editable per-order price.

| Action | How |
|---|---|
| Add add-on | **+ Add Add-on** → a new card appears |
| Rename | **Rename** button on the card → type new name → Enter or ✓ |
| Edit base price | Click the price field inline and type |
| Toggle Scales | Toggle switch on the card |
| Delete add-on | Trash button on the card |

---

### 4 — Analytics

View profitability at a glance, revenue trends, and best-selling planter sizes — all in one place.

**P&L Summary cards (top of page):**
- **This Month Revenue** — total sales logged this calendar month
- **Material Spend** — total Lowes purchases logged this calendar month
- **Est. Net Profit** — revenue minus material spend (green if positive, red if negative)

**Charts:**
- **Revenue vs. Spend** — grouped bars (revenue + material cost) with a profit trend line overlay
- **Cumulative Revenue** — running revenue total over the selected period
- **Units by Product / Revenue by Product** — breakdown of volume and revenue across product types
- **Best Sellers** — horizontal bar chart of top 10 planter sizes ranked by **units sold**
- **Margin Trend / Margin by Size** — estimated margin over time and per size
- **Add-on Popularity** — horizontal bar chart showing how many times each add-on appeared in sales
- **Add-on Revenue** — horizontal bar chart of total revenue generated per add-on

**Range toggle** at the top lets you switch between:
- **This Year** — January through the current month
- **Last 12 Months** — rolling 12-month window
- **All Time** — every month with recorded sales or purchase data

**KPI trend badges** — the "This Month" and "YTD Revenue" cards on the home dashboard show ▲/▼ % badges comparing to the prior month and prior year-to-date respectively.

**Profit popup on order completion** — tapping ✅ on any order now shows a toast with estimated profit and margin: "Order complete 🎉 · Est. profit $XX (YY% margin)"

**Venmo fee on completion** — when completing an unpaid order and selecting Venmo, the payment modal reveals a fee input pre-filled with the last-used fee (default $3). Enter the fee and tap **Confirm** — the fee is saved to the order and the sales record, and remembered for next time.

---

### 5 — Cut List Calculator

Plan material cuts before building. Enter parts, calculate board usage, and save cut lists for any planter size.

**How to use:**
1. Set stock materials (defaults: Cedar Picket 6ft, 2×2 8ft, 2×4 8ft — add custom materials once and they persist globally across all cut lists) and blade kerf
2. Add parts — Description, Qty, Length, Width (width optional — used for rip cuts), Material
3. Add optional Notes for the cut list
4. Tap **Calculate** to see the board diagram and margin estimate
5. Tap **💾 Save** to store for later

**Margin estimate bar** — after Calculate, a summary bar appears between the diagram and parts list:
- **Mat. Cost** — calculated from board counts × material unit costs (pickets $3.66, 2×2s $3.23, 2×4s $4.17 each, incl. tax)
- **Price** — editable field pre-filled with the $10/picket suggested price; change it to see how margin shifts
- **Margin %** — live-updates as you type; color-coded green (≥50%), orange (≥30%), red (<30%)

**Board diagram:**
- Each bar represents one physical board
- Colored segments = your parts, proportional to their length
- Rip cuts (narrower than the board) appear shorter in height — multiple rip cuts that fit across the board width are **batched together** (e.g. 3× 1.75" on a 5.5" board) to minimize board count
- Width scrap (unused board width) shown as a tan block above rip-cut segments with a dashed separator
- Individual pieces within a batch are separated by a white divider line
- Grey end block = length scrap remaining on that board

**Waste %** accounts for both length and width waste area.

**Product association** — select a product from the **Product** dropdown at the top of the cut list form. If that product has options configured (e.g. Stain), the option dropdown(s) appear immediately below. The selected product and options are saved with the cut list and restored when you load it.

**Saved Cut Lists** (left column on desktop) — grouped by product, showing Name, Last Modified, Notes. Load, duplicate, or delete any saved list. **Copy** loads all values into the editor as a new unsaved cut list with " (copy)" appended to the name — rename it and save to create a new record without overwriting the original. Re-saving a loaded list updates it in-place (no duplicates).

**Layout** — on desktop (≥1025px) the tab uses a 3-zone grid: Stock Materials and Saved Cut Lists sit side by side in the top row; the New Cut List form and results span the full width underneath. On tablet/mobile the sections stack vertically.

**Create Quote from Cut List:**
After running a cut list, tap **+ Quote** to open the quote modal. The price is pre-calculated from board counts and the notes field is pre-filled with the cut list name. Fill in a quote name, adjust price/notes as needed, and save. Saved quotes appear in the **Quotes tab** on the Orders page.

---

### 6 — Pickup Scheduler

**Calendar tab** — monthly view of all scheduling activity.

| Dot color | Meaning |
|---|---|
| 🟢 Green dot | Open slot you've created (customers can book) |
| 🟡 Gold dot | Confirmed booking on that day |

Click any day to see open slots and bookings side by side. Use ← → to navigate months.

To add open availability: select a day → **+ Add Slot** → enter start and end time.

**How bookings appear on the calendar:**
- Customer uses the 🔗 Share booking link you sent → self-books a time → calendar updates automatically
- You enter Pickup Date + Time on an order → calendar booking created automatically

**Editing a booking date** — tap ✏️ on any booking in the day detail view → the modal now includes a **Pickup Date** field you can change. Saving automatically syncs the new date and time back to the linked order.

**Upcoming Pickups tab** — chronological list of all upcoming pickups. Today's pickups are highlighted. Shows counts for today / this week / total.

**Facebook Share Message tab** — pre-written message with your scheduler link. Copy and paste into Facebook to invite a customer to book their time.

> Always use the **per-order booking link** (from the 🔗 button on the order card) rather than the generic schedule URL — it links the booking directly to the right order.

---

## Customer-Facing Scheduler (`schedule.html`)

Customers never see the dashboard. They only see this page, accessed via a direct link:

```
https://kjakupak93.github.io/rmk-crafted/schedule.html?token=BOOKING_TOKEN
```

The `?token=` parameter links their booking to a specific order via a UUID booking token. Always share via the 🔗 **Share booking link** button on the order card — it generates the correct URL automatically.

**What the customer sees:**
1. Calendar of available dates
2. Available time slots for the selected date
3. Name + contact form
4. Confirmation

**What happens after they book:**
- A booking is created in `schedule_bookings` linked to their order
- Their order gets the 📅 **Self-booked** badge on the dashboard
- That time slot is no longer available to other customers

---

## Status & Badge Quick Reference

| Badge / Indicator | Meaning |
|---|---|
| 📅 Self-booked | Customer scheduled their own pickup |
| 🟢 Connected to Supabase | Cloud sync is active (top bar) |
| 🔴 Overdue | Pickup date passed, order not completed |
| Green dot (calendar) | Open availability slot |
| Gold dot (calendar) | Confirmed booking |

---

## Common Tasks

| Task | How |
|---|---|
| Add a new order | Orders → Active tab → + New Order |
| Mark an order ready | Edit order → Status: Ready for Pickup → Save |
| Complete an order | Tap ✅ on order card — toast shows estimated profit & margin |
| Send a booking link | Tap 🔗 Share booking link on order card → paste into Facebook |
| Add your own pickup time | Edit order → fill Pickup Date + Time → Save |
| Change a pickup date | Scheduler → Calendar → click day → ✏️ on booking → change Pickup Date → Save |
| Add open availability | Scheduler → Calendar → click day → + Add Slot |
| Log a materials purchase | Material Tracker → Lowes Purchase Log → + Log Purchase |
| Update stock levels | Material Tracker → Stock Levels → +/− buttons |
| View sales revenue | Orders → Sales History tab (filter by year or period) |
| Log a sale manually | Orders → Sales History tab → + Log Sale |
| View revenue trends | Analytics tile on home → range toggle for time window |
| Add a product type | Materials → Products tab → + Add Product |
| Add options to a product | Materials → Products tab → Options ▾ on product row → + Add Option |
| Plan a build's cuts | Materials → Cut List tab → add parts → Calculate → Save |
| Load a saved cut list | Materials → Cut List tab → Saved Cut Lists (top right on desktop) → Load |
| Duplicate a saved cut list | Materials → Cut List tab → Saved Cut Lists → Copy → rename → Save |
| Save a quote from a cut list | Materials → Cut List tab → Calculate → + Quote → fill name → Save |
| Convert a quote to an order | Orders → Quotes tab → Convert → fill order details → Save |
| View saved quotes | Orders → Quotes tab |

---

## Tech Stack

| Layer | Tool |
|---|---|
| Hosting | GitHub Pages — auto-deploys on every push to `main` (~60s) |
| Database | Supabase (cloud Postgres + Row Level Security) |
| Auth | Supabase Auth (email/password), session-based |
| Frontend | Vanilla HTML/CSS/JS — no build step, no framework, single file per page |
| Charts | Chart.js v4 (CDN) |
| Fonts | Playfair Display · DM Mono · DM Sans — self-hosted WOFF2 in `fonts/` (no CDN dependency) |
| Testing | Playwright v1.42 — two-tier smoke + e2e suite |
| CI | GitHub Actions (`.github/workflows/e2e.yml`) — runs on every push to `main` |
| Dev tooling | Claude Code |

**Files:**
- `index.html` — entire dashboard (auth-protected; CSS → HTML → JS, all in one file)
- `schedule.html` — public customer booking page (no auth required)
- `fonts/` — self-hosted WOFF2 font files + `fonts.css`
- `manifest.json` — PWA manifest (enables "Add to Home Screen" on mobile)
- `sw.js` — service worker: caches app shell, auto-reloads on new deploy (`skipWaiting` + `controllerchange`)
- `icon.png` — 1024×1024 app icon
- `playwright.config.ts` — Playwright config (defines smoke and e2e projects, local Python HTTP server)
- `package.json` — dev dependencies: `@playwright/test`, `dotenv`
- `tests/` — Playwright test suite (see [`tests/README.md`](tests/README.md))
- `CLAUDE.md` — project memory for Claude Code sessions
- `.mcp.json` — local Claude Code MCP config (`.gitignore`'d, never committed)
- `.env` — local Supabase credentials used by the test suite (`.gitignore`'d, never committed)

**Database tables:**

| Table | Contents |
|---|---|
| `orders` | All orders — includes `pickup_date`, `pickup_time`, `customer_booked`, `items` (JSONB with rows, add-ons, prices) |
| `inventory` | Ready-to-sell inventory — includes `add_ons` (JSONB array of IDs) |
| `sales` | Completed sales history — includes `add_ons` (JSONB array of `{id, label, price}` objects), `product_options` (JSONB, nullable — mirrors first item's options), `items` (JSONB, nullable — `{rows: [{size, style, options, qty, price}]}` for multi-item sales; legacy rows use flat `size`/`style`/`qty` columns) |
| `purchases` | Lowes purchase log |
| `stock` | Material stock levels |
| `schedule_slots` | Open availability slots |
| `schedule_bookings` | Confirmed bookings, linked to orders via `order_id` |
| `availability_windows` | Recurring availability settings |
| `cut_lists` | Saved cut lists — name, kerf, cuts (JSONB), stock types (JSONB), notes, style (text nullable), `product_options` (JSONB nullable), updated_at |
| `quotes` | Quotes saved from the Cut List Calculator — name, price, picket count, linked cut list |
| `settings` | App configuration — rows for `addons` (JSON array), `products` (JSON array), `product_options` (JSON object keyed by product name), `stock_costs` (JSON object `{name: price}`), `cl_stock_types` (JSON array — globally persisted cut list stock materials) |

---

## Testing

The project has a two-tier Playwright test suite. See [`tests/README.md`](tests/README.md) for full details.

| Suite | Command | Tests | What it covers |
|---|---|---|---|
| Smoke | `npx playwright test --project=smoke` | 30 | UI presence, navigation, no data writes |
| E2E | `npx playwright test --project=e2e` | 77 | Full workflows with real Supabase reads/writes |

Both suites run automatically on every push to `main` via GitHub Actions (`.github/workflows/e2e.yml`).

---

## Security Notes

- **Authentication** — the dashboard uses Supabase Auth (email/password via `signInWithPassword`). The `#pin-gate` overlay appears immediately on load and is dismissed once `onAuthStateChange` confirms a valid session. Sessions persist across reloads; a Sign Out button in the header clears the session.
- **Row Level Security** — all business tables (`orders`, `sales`, `inventory`, etc.) require the `authenticated` role. Anon users have **no direct access** to the `orders` table. The public `schedule.html` booking page accesses orders exclusively through two SECURITY DEFINER RPC functions: `get_order_by_token(uuid)` (resolves an order by its booking token) and `book_order_pickup(uuid, date, text)` (writes the pickup date/time back to the order). Anon INSERT on `schedule_bookings` requires a valid `order_id` linked to an unbooked order. The `settings` table has no anon access.
- **Supabase anon key** — the anon key in source code is intentional and safe. It's designed for browser apps and only grants what RLS policies explicitly allow.
- **Secrets out of git** — `.mcp.json` (Claude Code MCP config with GitHub PAT) and `.env` (Supabase credentials for the test suite) are both in `.gitignore` and never committed.

---

*RMK Crafted · Oceanside, CA · Cedar planter boxes · Cash or Venmo @RMKCrafted*
