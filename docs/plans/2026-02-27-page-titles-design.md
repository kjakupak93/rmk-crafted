# Page Titles & Quote Message Fix — Design

**Date:** 2026-02-27

## Changes

### 1. Page Titles

Each sub-page (Quote Calculator, Orders, Inventory & Sales, Materials, Pickup Scheduler) gets an `<h2>` title at the top of its content area.

- Styled with `font-family: 'Playfair Display', serif`, `color: var(--navy)`, `font-size: 22px`
- Placed as the first child inside `.app-container` (or equivalent wrapper) on each page
- Home page (`page-home`) already has its own heading ("Welcome back 👋") — no change needed there

**Pages to update:**
| Page ID | Title |
|---|---|
| `page-quote` | Quote Calculator |
| `page-orders` | Orders |
| `page-inventory` | Inventory & Sales |
| `page-materials` | Materials |
| `page-scheduler` | Pickup Scheduler |

### 2. Quote Message Copy

In `calculateQuote()`, the first line of `qMsgText` changes from:

```
Hi! Here's your quote from RMK Crafted 🪵
```

to:

```
Hi! Here's your quote! 🪵
```
