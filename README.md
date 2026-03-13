# RMK Crafted — Business Dashboard

> Custom business management suite for a solo cedar planter box business in Oceanside, CA.
> Built for internal use only. Sold via Facebook Marketplace, pickup only.

**Live dashboard →** https://kjakupak93.github.io/rmk-crafted/
**Customer scheduler →** https://kjakupak93.github.io/rmk-crafted/schedule.html

---

## What This Is

A single-page web app that manages every part of the RMK Crafted workflow:

- **Quote Calculator** — price any planter box instantly and generate a Facebook message
- **Order & Inventory Tracker** — manage active orders, ready-to-sell stock, and sales history
- **Material Cost Tracker** — track cedar stock levels and Lowes purchases
- **Pickup Scheduler** — manage availability, view upcoming pickups, sync with customer bookings

All data is stored in Supabase (cloud) so it works across any device. The dashboard is PIN-protected. Customers only ever see `schedule.html`.

---

## The Four Modules

### 1 — Quote Calculator

Calculates selling price and material cost for any planter box.

**Planter Styles**
- `Standard` — Classic horizontal cedar picket build
- `Vertical Style` — Deeper planters using 2×2s and 2×4s

**How to use:**
1. Select a style
2. Enter Length × Width × Height (inches)
3. If a standard size match is found, a green banner appears — tap **Use This Size**
4. Enter number of pickets (or let it auto-calculate)
5. Tap **Calculate Quote**

**Results include:** Selling price · Material cost · Profit · Margin %

A pre-written **Facebook message** is generated at the bottom — tap **Copy** and paste directly into a customer conversation.

---

### 2 — Order & Inventory Tracker

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

**Adding or editing an order** — fields include: Customer Name · Contact · Items (size, style, qty, price) · Payment · Status · Pickup Date · Pickup Time · Notes

> Setting a **Pickup Date + Time** automatically creates a booking on the Pickup Scheduler calendar. Updating it later updates the calendar too.

**Ready-to-Sell Inventory tab** — finished boxes not tied to a specific order. Use +/− to adjust quantity as items sell.

**Sales History tab** — auto-populated when an order is completed. Shows running totals for total revenue, cash, and Venmo.

---

### 3 — Material Cost Tracker

**Stock Levels tab** — current on-hand quantities for each material:
- Cedar Pickets (6ft) — Standard style
- 2×2 Lumber (8ft) — Vertical style frames
- 2×4 Lumber (8ft) — Vertical style bases

Stock color coding: 🔴 Low · 🟠 Medium · 🟢 Good

Use +/− buttons to adjust as you build or receive materials.

**Build Cost Estimator** — enter dimensions and style to see material requirements and estimated cost. Good for cross-checking pricing.

**Lowes Purchase Log tab** — log every materials run. Records date, item, quantity, and cost. Tracks total materials spend over time.

> Note: Logging a purchase does **not** auto-update stock levels. Update the Stock Levels tab manually.

---

### 4 — Pickup Scheduler

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

**Upcoming Pickups tab** — chronological list of all upcoming pickups. Today's pickups are highlighted. Shows counts for today / this week / total.

**Facebook Share Message tab** — pre-written message with your scheduler link. Copy and paste into Facebook to invite a customer to book their time.

> Always use the **per-order booking link** (from the 🔗 button on the order card) rather than the generic schedule URL — it links the booking directly to the right order.

---

## Customer-Facing Scheduler (`schedule.html`)

Customers never see the dashboard. They only see this page, accessed via a direct link:

```
https://kjakupak93.github.io/rmk-crafted/schedule.html?order=ORDER_ID
```

The `?order=` parameter links their booking to a specific order. Always share via the 🔗 **Share booking link** button on the order card — it generates the correct URL automatically.

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
| Quote a customer | Quote Calculator → enter dimensions → Calculate → copy Facebook message |
| Add a new order | Orders → Active tab → + New Order |
| Mark an order ready | Edit order → Status: Ready for Pickup → Save |
| Complete an order | Tap ✅ on order card |
| Send a booking link | Tap 🔗 Share booking link on order card → paste into Facebook |
| Add your own pickup time | Edit order → fill Pickup Date + Time → Save |
| Add open availability | Scheduler → Calendar → click day → + Add Slot |
| Log a materials purchase | Material Tracker → Lowes Purchase Log → + Log Purchase |
| Update stock levels | Material Tracker → Stock Levels → +/− buttons |
| View sales revenue | Orders → Sales History tab |

---

## Tech Stack

| Layer | Tool |
|---|---|
| Hosting | GitHub Pages (free) |
| Database | Supabase (cloud Postgres) |
| Frontend | Vanilla HTML/CSS/JS — single file per page |
| Dev tooling | Claude Code + Claude in Chrome |

**Files:**
- `index.html` — entire dashboard (PIN-protected)
- `schedule.html` — public customer booking page
- `manifest.json` — PWA manifest (enables "Add to Home Screen" on mobile)
- `icon.png` — 1024×1024 app icon
- `CLAUDE.md` — project memory for Claude Code sessions
- `.mcp.json` — local Claude Code config (in `.gitignore`, never committed)

**Database tables:**

| Table | Contents |
|---|---|
| `orders` | All orders — includes `pickup_date`, `pickup_time`, `customer_booked` |
| `inventory` | Ready-to-sell inventory |
| `sales` | Completed sales history |
| `purchases` | Lowes purchase log |
| `stock` | Material stock levels |
| `schedule_slots` | Open availability slots |
| `schedule_bookings` | Confirmed bookings, linked to orders via `order_id` |
| `availability_windows` | Recurring availability settings |

---

## Security Notes

- The dashboard is protected by a PIN gate (set in `index.html` — search for `const PIN`)
- The Supabase publishable/anon key in the source code is intentional and safe — it's designed for public-facing browser apps
- `.mcp.json` is in `.gitignore` to prevent GitHub PAT tokens from being committed
- No authentication system is needed — this is a solo-use internal tool

---

*RMK Crafted · Oceanside, CA · Cedar planter boxes · Cash or Venmo @RMKCrafted*
