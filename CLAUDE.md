# RMK Crafted — Business Dashboard

## Project Overview
Single-page web app (`index.html`) — all-in-one business dashboard for RMK Crafted, a solo woodworking business in Oceanside, CA selling cedar planter boxes via Facebook Marketplace (pickup only, Cash or Venmo @RMKCrafted).

## Tech Stack
- Vanilla HTML/CSS/JavaScript — single `index.html`, no build step, no framework
- Supabase (PostgreSQL) backend, client variable `sb`
- Hosted on GitHub Pages — commit and push to `main`, auto-deploys in ~60s
- Fonts: Playfair Display, DM Mono, DM Sans (Google Fonts)
- Charts: Chart.js v4 (CDN)

## File Structure
- `index.html` — CSS first, then HTML, then JS (all in one file)
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

## App Structure
Multi-page navigation — pages shown/hidden via CSS classes, no URL routing. Pages load data when navigated to (not all at startup).

### Pages
- **Home** (`page-home`) — KPI cards, low-stock alert, activity feed, tile nav grid
- **Quote Calculator** (`page-quote`) — Price estimator based on picket count
- **Orders** (`page-orders`) — 3 tabs: Active → Ready to Sell → Sales History
- **Materials** (`page-materials`) — Stock levels + Lowes purchase log
- **Scheduler** (`page-scheduler`) — Calendar, upcoming pickups, share message
- **Analytics** (`page-analytics`) — P&L cards + revenue/profit/best-seller charts

### Non-Obvious Details
- `page-inventory` was removed — inventory lives in Orders page as the middle tab (`otab-inventory`)
- Best Sellers chart ranks by **units sold** (count), not revenue
- `estimateOrderCost()` falls back to **37% of price** for unknown sizes
- `saveBooking()` — when editing a booking that has a linked `order_id`, also syncs `orders.pickup_date` and `orders.pickup_time`
- Recent Activity feed shows booking *creation* time, not pickup date (avoids future timestamps showing as "just now")

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

### Pin-Gate (auth screen)
Pin-gate uses `sessionStorage.rmk_auth`. Never put both `display:none` and `display:flex` in the same inline style — the last one wins and breaks show/hide.
