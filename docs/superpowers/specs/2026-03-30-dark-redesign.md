# RMK Crafted — Dark Redesign Spec
**Date:** 2026-03-30
**Status:** Approved

## Overview

Redesign `index.html` with a permanent dark theme and persistent left sidebar navigation. No functional changes — all JS, Supabase queries, modals, tabs, and page logic remain identical. Pure CSS/HTML structural changes only.

## Decisions

| Decision | Choice |
|---|---|
| Theme | Dark mode permanent — no toggle |
| Desktop nav | Fixed 210px left sidebar |
| Mobile nav | Bottom tab bar (≤640px), sidebar hidden |
| Dark mode approach | Promote existing `[data-theme="dark"]` vars to `:root`, delete all dark overrides |
| Home dashboard layout | 2×2 KPI grid + activity feed (side by side), bottom row: Active Orders pills + Next Pickups |
| Right panel widget | Active Orders by status (Pending / Building / Ready pill counters) |

---

## 1. Color System

Merge the existing dark mode CSS variables directly into `:root`. Delete all `[data-theme="dark"]` rules and the dark toggle button + `toggleDarkMode()` function.

```css
:root {
  /* Backgrounds — layered depth */
  --bg-deep:    #0d1822;   /* sidebar, deepest surfaces */
  --bg-page:    #111c28;   /* main page background */
  --bg-card:    #162534;   /* cards, panels */
  --bg-elevated:#1e3347;   /* active nav item, hover states */
  --bg-input:   #0d1822;   /* form inputs */

  /* Brand accents — unchanged */
  --sand:        #c9a55a;
  --sand-light:  #e8d5a3;
  --ocean:       #4a86a8;
  --ocean-light: #7badc8;

  /* Status colors */
  --green:  #3a8c5c;
  --orange: #d4782a;
  --red:    #c0392b;

  /* Text */
  --text:       #d8eef8;
  --text-muted: #7badc8;
  --text-dim:   #4a6a80;

  /* Borders */
  --border:     #1e3347;
  --border-dim: #182a3a;

  /* Legacy aliases (keep for JS compatibility) */
  --cream:      #111c28;   /* was page bg in light mode */
  --warm-gray:  #1e3347;   /* was card borders */
  --navy:       #7badc8;   /* was primary dark */
  --navy-dark:  #9fcde0;
}
```

**Body:** `background: var(--bg-page); color: var(--text);`

---

## 2. Layout Structure

### Current
```
<header class="app-header">        ← sticky top bar
<div class="conn-bar">             ← connection status row
<div class="page active" id="page-home">
```

### New
```
<div class="app-layout">           ← flex row, full viewport height
  <nav class="sidebar">            ← fixed 210px left
  <div class="app-main">           ← flex: 1, flex-column
    <header class="main-header">   ← page title + conn pill
    <div class="page active" id="page-home">
```

`body` gets `overflow: hidden` removed; `app-layout` handles scrolling.

---

## 3. Sidebar (`<nav class="sidebar">`)

**Structure:**
```html
<nav class="sidebar">
  <div class="sb-brand">           ← logo icon + "RMK Crafted" + "WORKSHOP"
  <nav class="sb-nav">             ← 5 nav items
  <button class="sb-new-order">    ← "+ New Order" (calls openOrderModal())
  <div class="sb-footer">          ← Sign Out item
</nav>
```

**Nav items** (in order): Dashboard (`⊞`), Orders (`📋`), Materials (`🪚`), Scheduler (`📅`), Analytics (`📊`)

Each item: `onclick="goTo('page-id')"` — same `goTo()` function, no changes to JS.

**Active state:** `background: var(--bg-elevated); color: var(--sand-light);` + icon gets `color: var(--sand)`.

**CSS:**
```css
.sidebar {
  width: 210px;
  background: var(--bg-deep);
  border-right: 1px solid var(--border-dim);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  height: 100vh;
  position: sticky;
  top: 0;
  overflow-y: auto;
}
```

---

## 4. Main Header

Replaces `.app-header` + `.conn-bar`. Single slim bar:

```html
<header class="main-header">
  <h1 class="main-title" id="main-page-title">Workshop Dashboard</h1>
  <div class="conn-pill">
    <div class="conn-dot"></div>
    <span class="conn-text">Connected</span>
  </div>
</header>
```

`goTo()` updates `#main-page-title` text to match the active page name.

**Remove:** `.app-header`, `.conn-bar`, `#dark-toggle`, `.header-back-btn`, `.header-logo`, `.header-brand`.

---

## 5. Mobile — Bottom Tab Bar (≤640px)

At ≤640px:
- `.sidebar` → `display: none`
- `.bottom-nav` → `display: flex` (fixed bottom)

```html
<nav class="bottom-nav">
  <button class="bn-item active" onclick="goTo('home')">
    <span class="bn-icon">⊞</span>
    <span class="bn-label">Home</span>
  </button>
  <!-- Orders, Materials, Scheduler, Analytics -->
</nav>
```

```css
.bottom-nav {
  display: none;
  position: fixed;
  bottom: 0; left: 0; right: 0;
  background: var(--bg-deep);
  border-top: 1px solid var(--border-dim);
  padding-bottom: env(safe-area-inset-bottom, 0px);
  z-index: 200;
}
@media (max-width: 640px) {
  .sidebar { display: none; }
  .bottom-nav { display: flex; }
  .app-main { margin-left: 0; }
}
```

"New Order" on mobile: compact `+` icon button added to `.main-header` right side, visible only on mobile.

Page content gets `padding-bottom: 70px` on mobile to clear the tab bar.

---

## 6. Home Dashboard Layout

Replaces the existing tile grid + stat strip layout. New layout within `#page-home`:

```
┌─────────────────────────────────┐
│  [2×2 KPI grid]  [Activity Feed] │  ← grid: 1fr 1fr
├──────────────┬──────────────────┤
│ Active Orders│  Next Pickups    │  ← grid: 1fr 1fr
└──────────────┴──────────────────┘
```

**KPI cards** — each has a colored icon box + label + value + sub-text. Icons: 💰 gold bg, 📈 blue bg, 📦 green bg, ⏳ orange bg. Values: This Month Revenue (gold), YTD Sales (text), Ready to Sell (green), Amount Owed (blue).

**Activity feed** — compact rows: 22×22px icon box + title + description (truncated) + timestamp. 4 items visible. "FULL LOG →" link in header.

**Active Orders panel** — 3 pill-style counters side by side: Pending (orange), Building (blue), Ready (green). Count pulled from live order data same as today. Footer line: "N total · N overdue".

**Next Pickups panel** — unchanged logic, restyled rows: `time · name`. Tomorrow's items shown in muted italic.

The existing home-screen app tile grid (`app-grid`, `app-tile`) is **removed** — navigation is now the sidebar/bottom bar exclusively.

---

## 7. Card & Surface Styling

All white-background surfaces → `var(--bg-card)` with `border: 1px solid var(--border)`.

| Element | Before | After |
|---|---|---|
| `.card` | `background: white; border: 2px solid var(--warm-gray)` | `background: var(--bg-card); border: 1px solid var(--border)` |
| `.order-card` | same | same |
| `.summary-card` | same | same |
| `.data-table th` | `background: var(--navy)` | `background: var(--bg-deep)` |
| `.data-table tr:hover td` | `background: var(--cream)` | `background: var(--bg-elevated)` |
| `.tabs` | `background: white; border-bottom: 2px solid var(--warm-gray)` | `background: var(--bg-deep); border-bottom: 1px solid var(--border-dim)` |
| `.tab-btn.active` | `border-bottom-color: var(--sand)` | unchanged |
| `.modal` | `background: white` | `background: var(--bg-card); border: 1px solid var(--border)` |
| `.form-control` | `background: white` | `background: var(--bg-input); color: var(--text); border-color: var(--border)` |
| `.btn-primary` | `background: var(--navy)` | `background: var(--ocean); color: white` |
| `.btn-secondary` | `background: white` | `background: var(--bg-card); border-color: var(--ocean); color: var(--ocean-light)` |

Padding reduction: cards from `18px 20px` → `12px 14px`. Order cards from `16px 18px` → `11px 13px`.

---

## 8. Status Badges

Keep the existing dark-mode badge styles (already correct) — just make them the only definition:

```css
.badge-pending  { background: rgba(212,120,42,0.2);  color: #e09050; border: 1px solid rgba(212,120,42,0.3); }
.badge-building { background: rgba(74,134,168,0.2);  color: #7badc8; border: 1px solid rgba(74,134,168,0.3); }
.badge-ready    { background: rgba(58,140,92,0.2);   color: #5ec48a; border: 1px solid rgba(58,140,92,0.3); }
.badge-completed{ background: rgba(255,255,255,0.07);color: #7badc8; border: 1px solid rgba(255,255,255,0.12); }
.badge-overdue  { background: rgba(192,57,43,0.2);   color: #f07070; border: 1px solid rgba(192,57,43,0.3); }
.badge-cash     { background: rgba(58,140,92,0.2);   color: #5ec48a; border: 1px solid rgba(58,140,92,0.3); }
.badge-venmo    { background: rgba(74,134,168,0.2);  color: #7badc8; border: 1px solid rgba(74,134,168,0.3); }
.badge-unpaid   { background: rgba(192,57,43,0.2);   color: #f07070; border: 1px solid rgba(192,57,43,0.3); }
```

---

## 9. `goTo()` / `goHome()` Function Updates

The existing `goTo(page)` function needs three small updates:

1. Update `#main-page-title` text based on the page navigated to.
2. Update `.sb-item.active` and `.bn-item.active` classes to match the active page.
3. Remove the two lines that manipulate `backBtn` (`classList.add('visible')` in `goTo`, `classList.remove('visible')` in `goHome`).

The `#backBtn` HTML element and `goHome()` function are removed — with a persistent sidebar the user can always click "Dashboard" to return home. The `goHome()` function currently calls `goTo('home')` so its removal is safe.

---

## 10. Responsive Breakpoints

Keep existing breakpoints. Adjustments:

| Breakpoint | Change |
|---|---|
| `≤640px` (mobile) | Sidebar hidden, bottom nav shown, `app-main` margin-left: 0, content padding-bottom: 70px |
| `641px–1024px` (tablet) | Sidebar visible but narrower: 170px. Labels visible. |
| `≥1025px` (desktop) | Sidebar 210px, full labels |

---

## 11. What Does NOT Change

- All JavaScript functions (100% unchanged)
- All Supabase queries
- All modal HTML and logic
- All tab panel HTML and switching logic
- All page content within each page (orders list, cut list, scheduler calendar, analytics charts)
- PWA manifest, service worker, fonts
- `schedule.html` (public booking page — untouched)
- Playwright test suite (tests run against live URL, not local styles)

---

## 12. Files Changed

| File | Change |
|---|---|
| `index.html` | CSS variables, layout HTML, sidebar + bottom nav, home page layout, card styles |
| `manifest.json` | Update `theme_color` from `#1E4D6B` to `#0d1822` |

No new files created.
