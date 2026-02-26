# Dashboard Stats — Design Doc
**Date:** 2026-02-26

## Goal
Add per-section stat strips to the home dashboard. Each strip lives below its corresponding app tile, showing key numbers at a glance. The existing 3-stat header and tile navigation remain unchanged.

## Layout
Option B: tiles stay clean as navigation; a separate stat strip (read-only card) sits directly below each tile in the same grid column.

```
┌───────────┐  ┌───────────┐
│ 📋        │  │ 📦        │
│  Orders   │  │ Inventory │
└───────────┘  └───────────┘
[stat strip]   [stat strip]

┌───────────┐  ┌───────────┐
│ 🛒        │  │           │
│ Materials │  │  (empty)  │
└───────────┘  └───────────┘
[stat strip]

┌─────────────────────────┐
│ 📅 Pickup Scheduler     │
└─────────────────────────┘
[stat strip — full width]
```

Quote Calculator has no stat strip (it's a tool, not a data source).

## Stat Strips Per Section

### Orders
- Pending count
- Building count
- Ready count
- $ owed (sum of price where payment = 'unpaid' and status != 'completed')

Data source: `orders` table, filter `status != 'completed'`

### Inventory
- Total items in stock (sum of qty)
- Total value (sum of qty × price)

Data source: `inventory` table

### Materials
- Pickets count
- 2×2s count
- 2×4s count
- Numbers turn red if qty is low (threshold: pickets < 10, twobytwo/twobyfour < 5)

Data source: `stock` table (3 rows)

### Scheduler
- Pickups today
- Pickups this week
- Next pickup date (formatted as "Mon Mar 2")

Data source: `schedule_bookings` filtered by date range

## Visual Style
- Stat strips: white background, warm-gray border, border-radius 10px, padding 10px 14px
- Layout: flex row, gap between items
- Numbers: DM Mono, ~18px, navy color
- Labels: DM Sans, 10px, text-muted
- Low stock numbers: red color
- Positioned immediately below their tile with a small top margin (~6px)

## Data Loading
All stat data is fetched in a single `loadHomeStats()` call using `Promise.all`, parallel with existing queries. No new page-load penalty.

## What Stays the Same
- Top 3-stat header (Active Orders, Ready to Sell, Pickups Today)
- All 5 app tiles (styling, click behavior, badges)
- All other pages and functionality
