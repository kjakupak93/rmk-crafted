# RMK Crafted — Business Dashboard

## Project Overview
A single-page web app (`index.html`) that serves as an all-in-one business dashboard for RMK Crafted, a woodworking business based in Oceanside, CA that builds and sells cedar planter boxes.

## Tech Stack
- **Frontend**: Vanilla HTML/CSS/JavaScript — single `index.html` file, no build step, no framework
- **Database**: Supabase (PostgreSQL)
- **Hosting**: GitHub Pages
- **Fonts**: Google Fonts — Playfair Display, DM Mono, DM Sans

## Supabase Config
- **Project URL**: `https://mfsejmfmyuvhuclzuitc.supabase.co`
- **Anon Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mc2VqbWZteXV2aHVjbHp1aXRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwNTgzODksImV4cCI6MjA4NzYzNDM4OX0.Ve8dY-CvGqCMSWfifd6HvrDvmrJo4J00auhos8aezpY`
- **Client**: Loaded via CDN `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2`
- **Client variable**: `sb`

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
The app is a single HTML file with a multi-page navigation system (no URL routing — pages are shown/hidden via CSS classes).

### Pages
- **Home** (`page-home`) — Dashboard with summary stats and tile navigation
- **Quote Calculator** (`page-quote`) — Price estimator based on picket count
- **Orders** (`page-orders`) — Active and completed order tracking
- **Inventory** (`page-inventory`) — Ready-to-sell stock + sales history
- **Materials** (`page-materials`) — Wood stock levels + Lowes purchase log
- **Scheduler** (`page-scheduler`) — Calendar, upcoming pickups, share message

### Navigation
- `goTo('pagename')` — navigate to a page (also triggers data load)
- `goHome()` — return to home screen
- Pages load their data when navigated to (not all at startup)

## Business Context
- **Owner**: runs RMK Crafted solo out of Oceanside, CA
- **Product**: Cedar planter boxes — Standard style (pickets only) and Vertical style (deeper/bigger, uses 2×2s and 2×4s for support)
- **Sales channel**: Facebook Marketplace, pickup only
- **Payment**: Cash or Venmo (@RMKCrafted business account)
- **Materials**: Cedar pickets from Lowes ($3.38 base + 8.25% tax = $3.66 each), 2×2s ($2.98 base = $3.23 each), 2×4s ($3.85 base = $4.17 each)
- **Pricing formula**: ~$10 per picket used (e.g. 10 pickets = ~$100)

## Standard Planter Sizes & Prices
| Size (L×W×H) | Price |
|---|---|
| 16×16×16" | $30 |
| 36×12×16" | $55 |
| 36×16×16" | $60 |
| 36×16×27" | $70 |
| 36×24×16" | $100 |
| 48×12×16" | $75 |
| 48×12×27" | $80 |
| 48×16×16" | $85 |
| 48×16×27" | $90 |
| 48×24×16" | $110 |

## Color Palette (CSS Variables)
```css
--navy: #1E4D6B        /* primary dark — headers, buttons */
--navy-dark: #163A52   /* darker navy */
--ocean: #4A86A8       /* accent blue — borders, hover */
--ocean-light: #7BADC8 /* lighter blue */
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
Colors are derived from the RMK Crafted logo (navy wave, ocean blue text, sandy gold saw blade).

## Key JavaScript Patterns

### Supabase queries
```js
// Fetch
const { data, error } = await sb.from('orders').select('*').order('created_at', { ascending: false });

// Insert
const { error } = await sb.from('orders').insert({ name: 'Jane', size: '48×16×16', price: 85 });

// Update
await sb.from('orders').update({ status: 'building' }).eq('id', id);

// Delete
await sb.from('orders').delete().eq('id', id);
```

### Toast notifications
```js
showToast('Message here');           // neutral
showToast('Saved!', 'success');      // green
showToast('Error occurred', 'error'); // red
```

### Modal open/close
```js
document.getElementById('modalId').classList.add('open');
closeModal('modalId');
```

### Page navigation
```js
goTo('orders');    // navigate and load data
goHome();          // back to dashboard
```

## Deployment
- **Repo**: GitHub (public repo, free GitHub Pages)
- **Live URL**: `https://[username].github.io/rmk-crafted`
- **Deploy process**: commit and push to `main` → GitHub Pages auto-deploys in ~60 seconds
- **No build step** — edit `index.html` directly and push

## Future Development Ideas
- Add Supabase Auth so the app requires login
- Split into multiple files / proper project structure as complexity grows
- Add photo uploads for completed planters (Supabase Storage)
- Customer-facing order status page
- Revenue charts and analytics
- Automated Facebook Marketplace message drafting
- Mobile PWA support (service worker, offline mode)
- Email/text notifications when a pickup is approaching
