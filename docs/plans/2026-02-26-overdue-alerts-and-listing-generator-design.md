# Overdue Order Alerts + Facebook Marketplace Listing Generator — Design Doc
**Date:** 2026-02-26

---

## Feature 1: Overdue Order Alerts

### Definition
An order is overdue when:
- `status !== 'completed'` (active order)
- `pickup_date` is set (not null/empty)
- `pickup_date < todayKey()` (date has passed)

### Changes

#### Order Card
- New CSS class `s-overdue` on `.order-card` — red left border (uses `var(--red)`)
- A red `Overdue` badge rendered alongside the existing status badge in `orderCardHTML()`
- Badge uses existing `.badge` class with inline red styling (no new badge class needed)

#### Home Dashboard — Orders Stat Strip
- 5th item added to `#strip-orders`: `#ss-overdue` with label "Overdue"
- Value is red (`strip-val low` class) when overdue count > 0, navy otherwise
- `loadHomeStats()` extended: orders query already fetches all active orders; add overdue count computation using `pickup_date < todayKey()`

### Data
No new Supabase queries needed. `loadHomeStats()` already fetches `orders` with `status`. Just needs `pickup_date` added to the select.

---

## Feature 2: Facebook Marketplace Listing Generator

### Listing Format
```
🪵 Cedar Planter Box — {size}"

Handcrafted cedar planter box, perfect for your garden or patio!

📐 Size: {L}" L × {W}" W × {H}" H
💵 Price: ${price}
🌿 Material: Natural cedar — durable & weather-resistant

Payment: Cash or Venmo (@RMKCrafted)
Pickup only — Oceanside, CA

Message me to claim yours! 🌿
```

For Vertical style, replace the material line with:
`🌿 Material: Cedar + 2×2 & 2×4 frame — extra deep & sturdy`

### Modal
Single reusable `#listingModal`:
- Header: "Facebook Marketplace Listing"
- Styled text box (monospace, pre-wrap) with `id="listingText"`
- "Copy listing" button (`id="listingCopyBtn"`) — same copy/copied pattern as `#qCopyBtn`
- Close button

### Entry Points

#### From Inventory cards
- A `📣 List` icon button added to each `inv-card` in `loadInventory()`
- Calls `openListingModal(size, style, price)` with the item's data
- Size format from inventory is already `"L×W×H"` — parse into L/W/H for the listing body

#### From Quote results (`#qResults`)
- A `📣 Post to Marketplace` button below "📋 Create Order from This Quote"
- Calls `openListingModal(size, style, price)` using `dimL`/`dimW`/`dimH` values and `getQuotePrice()`
- Same dimension guard as `createOrderFromQuote()`

### New JS Functions
- `openListingModal(size, style, price)` — generates listing text, sets `#listingText`, opens modal
- `copyListing()` — copies `#listingText` content, toggles button to "✓ Copied!"

### Size Parsing
Inventory sizes are stored as `"36×16×16"` (using `×`). Parse with:
```js
const [l, w, h] = size.split('×');
```

---

## What Stays the Same
- All existing order, inventory, and quote functionality
- Modal infrastructure
- All Supabase queries (orders query just adds `pickup_date` to the select)
