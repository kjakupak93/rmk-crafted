# Dark Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign `index.html` with a permanent dark theme and persistent left sidebar navigation, replacing the light cream theme and home-screen tile grid navigation.

**Architecture:** CSS variable system is promoted from `[data-theme="dark"]` overrides to the `:root` definition directly. A flex-row `.app-layout` wrapper contains a fixed sidebar and scrollable main content area. On mobile (<=640px) the sidebar is hidden and a fixed bottom tab bar appears instead. All JavaScript, Supabase queries, modals, and page logic remain 100% unchanged except for three small `goTo()`/`goHome()` patches.

**Tech Stack:** Vanilla HTML/CSS/JS, single `index.html` file, no build step. Open in browser to test locally.

---

## File Map

| File | Change |
|---|---|
| `index.html` | CSS vars, layout HTML, sidebar, bottom nav, header, home page, card styles, JS patches |
| `manifest.json` | `theme_color` update only |

---

### Task 1: Promote dark CSS variables to `:root`

**Files:**
- Modify: `index.html` (`:root` block, lines ~22-39)

The current `:root` holds light-mode values. The existing `[data-theme="dark"]` block (lines ~1192-1310) has the correct dark values. This task replaces `:root` values with the dark ones and deletes all `[data-theme="dark"]` rules.

- [ ] **Step 1: Replace the `:root` block**

Find the existing `:root` block (starts at line 22, ends at line 39 with `}`). Replace it entirely with:

```css
:root {
  /* Backgrounds */
  --bg-deep:     #0d1822;
  --bg-page:     #111c28;
  --bg-card:     #162534;
  --bg-elevated: #1e3347;
  --bg-input:    #0d1822;

  /* Brand accents */
  --sand:        #c9a55a;
  --sand-light:  #e8d5a3;
  --sand-pale:   #1e2a1a;
  --ocean:       #4a86a8;
  --ocean-light: #7badc8;

  /* Status */
  --green:       #3a8c5c;
  --green-light: #5ba07a;
  --red:         #c0392b;
  --orange:      #d4782a;

  /* Text */
  --text:        #d8eef8;
  --text-muted:  #7badc8;
  --text-dim:    #4a6a80;

  /* Borders */
  --border:      #1e3347;
  --border-dim:  #182a3a;

  /* Legacy aliases kept for existing class compatibility */
  --cream:       #111c28;
  --warm-white:  #162534;
  --warm-gray:   #1e3347;
  --navy:        #7badc8;
  --navy-dark:   #9fcde0;
}
```

- [ ] **Step 2: Delete the entire `[data-theme="dark"]` block**

Find the comment `/* ===== DARK MODE ===== */` and delete everything from that line through the closing `}` of the last `[data-theme="dark"]` rule. This block ends just before `/* ===== DARK MODE TOGGLE ===== */`.

- [ ] **Step 3: Delete the dark toggle CSS**

Find and delete:

```
/* ===== DARK MODE TOGGLE ===== */
#dark-toggle { ... }
#dark-toggle:hover { ... }
```

- [ ] **Step 4: Update `body` base styles**

Find the `body { background: var(--cream); ... }` rule. Change `background: var(--cream)` to `background: var(--bg-page)`.

- [ ] **Step 5: Verify in browser**

Open `index.html` directly in a browser. The page should now be dark (near-black background). It will look broken layout-wise — that is expected, layout comes in Task 3.

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "style: promote dark CSS vars to root, remove dark mode toggle"
```

---

### Task 2: Remove old header + conn-bar HTML and dark toggle button

**Files:**
- Modify: `index.html` (HTML body, around line 1465)

- [ ] **Step 1: Delete the `.app-header` element**

Find and delete the entire `<header class="app-header">...</header>` block. It contains: logo img, `.header-brand` div (with `h1` and `p#header-subtitle`), `#backBtn` button, and `#dark-toggle` button.

- [ ] **Step 2: Delete the `.conn-bar` element**

Find and delete:
```html
<div class="conn-bar">
  <div class="conn-dot" id="connDot"></div>
  <span class="conn-text" id="connText">Connecting to database...</span>
</div>
```

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "style: remove old header, conn-bar, and dark toggle HTML"
```

---

### Task 3: Add layout wrapper, sidebar, and new main header

**Files:**
- Modify: `index.html` (`<style>` block and HTML body)

- [ ] **Step 1: Add CSS for layout, sidebar, main header, and conn pill**

In the `<style>` block, find the `/* ===== PAGES ===== */` comment. Insert the following CSS block immediately before it:

```css
/* ===== APP LAYOUT ===== */
.app-layout {
  display: flex;
  min-height: 100vh;
}

/* ===== SIDEBAR ===== */
.sidebar {
  width: 210px;
  background: var(--bg-deep);
  border-right: 1px solid var(--border-dim);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
  z-index: 200;
}
.sb-brand {
  padding: 16px 14px 14px;
  border-bottom: 1px solid var(--border-dim);
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}
.sb-logo {
  width: 32px; height: 32px;
  border-radius: 8px;
  background: linear-gradient(135deg, var(--sand) 0%, #9a7830 100%);
  display: flex; align-items: center; justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
}
.sb-brand-name { font-size: 13px; font-weight: 700; color: var(--sand-light); line-height: 1.2; }
.sb-brand-sub  { font-size: 9px; color: var(--text-dim); text-transform: uppercase; letter-spacing: 1.5px; }
.sb-nav {
  flex: 1;
  padding: 10px 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.sb-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 10px;
  border-radius: 8px;
  font-size: 13px;
  color: var(--text-dim);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  user-select: none;
  border: none;
  background: none;
  width: 100%;
  text-align: left;
  font-family: 'DM Sans', sans-serif;
}
.sb-item:hover { background: var(--bg-card); color: var(--ocean-light); }
.sb-item.active { background: var(--bg-elevated); color: var(--sand-light); }
.sb-item.active .sb-ico { color: var(--sand); }
.sb-ico { font-size: 15px; width: 20px; text-align: center; flex-shrink: 0; }
.sb-lbl { font-weight: 500; }
.sb-new-order {
  margin: 8px 10px 4px;
  padding: 10px 12px;
  background: linear-gradient(135deg, #1a5280, #133d60);
  border: 1px solid #2060a0;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  color: var(--ocean-light);
  cursor: pointer;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: filter 0.15s;
  font-family: 'DM Sans', sans-serif;
  flex-shrink: 0;
}
.sb-new-order:hover { filter: brightness(1.2); }
.sb-footer {
  padding: 8px;
  border-top: 1px solid var(--border-dim);
  flex-shrink: 0;
}

/* ===== MAIN AREA ===== */
.app-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

/* ===== MAIN HEADER ===== */
.main-header {
  background: var(--bg-deep);
  border-bottom: 1px solid var(--border-dim);
  padding: 0 20px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  position: sticky;
  top: 0;
  z-index: 100;
  flex-shrink: 0;
}
.main-title {
  font-family: 'Playfair Display', serif;
  font-size: 17px;
  font-weight: 700;
  color: var(--sand-light);
  white-space: nowrap;
}
.conn-pill {
  display: flex;
  align-items: center;
  gap: 5px;
  background: var(--bg-page);
  border: 1px solid var(--border-dim);
  border-radius: 6px;
  padding: 4px 10px;
  font-size: 10px;
  color: var(--text-dim);
  font-family: 'DM Mono', monospace;
  flex-shrink: 0;
}
.conn-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: #ccc;
  flex-shrink: 0;
}
.conn-dot.connected { background: var(--green); box-shadow: 0 0 0 2px rgba(58,140,92,0.25); }
.conn-dot.error { background: var(--red); }
.header-new-order-btn {
  display: none;
  background: var(--ocean);
  border: none;
  border-radius: 6px;
  color: white;
  width: 32px; height: 32px;
  font-size: 18px;
  cursor: pointer;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-family: 'DM Sans', sans-serif;
}

/* ===== BOTTOM NAV (mobile only) ===== */
.bottom-nav {
  display: none;
  position: fixed;
  bottom: 0; left: 0; right: 0;
  background: var(--bg-deep);
  border-top: 1px solid var(--border-dim);
  padding-bottom: env(safe-area-inset-bottom, 0px);
  z-index: 300;
}
.bn-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 6px 4px 4px;
  background: none;
  border: none;
  cursor: pointer;
  font-family: 'DM Sans', sans-serif;
  color: var(--text-dim);
  transition: color 0.15s;
  min-height: 50px;
}
.bn-item:hover { color: var(--ocean-light); }
.bn-item.active { color: var(--sand); }
.bn-ico { font-size: 18px; line-height: 1; }
.bn-lbl { font-size: 9px; font-weight: 500; letter-spacing: 0.3px; }
```

- [ ] **Step 2: Add the sidebar + main wrapper HTML**

Find the `<!-- TOAST -->` line in the HTML body. Just before it, insert:

```html
<!-- APP LAYOUT -->
<div class="app-layout">

<!-- SIDEBAR -->
<nav class="sidebar" id="sidebar">
  <div class="sb-brand">
    <div class="sb-logo">&#x1FAB5;</div>
    <div>
      <div class="sb-brand-name">RMK Crafted</div>
      <div class="sb-brand-sub">Workshop</div>
    </div>
  </div>
  <div class="sb-nav">
    <button class="sb-item active" id="sb-home"      onclick="goTo('home')"      ><span class="sb-ico">&#x229E;</span><span class="sb-lbl">Dashboard</span></button>
    <button class="sb-item"        id="sb-orders"    onclick="goTo('orders')"    ><span class="sb-ico">&#x1F4CB;</span><span class="sb-lbl">Orders</span></button>
    <button class="sb-item"        id="sb-materials" onclick="goTo('materials')" ><span class="sb-ico">&#x1FA9A;</span><span class="sb-lbl">Materials</span></button>
    <button class="sb-item"        id="sb-scheduler" onclick="goTo('scheduler')" ><span class="sb-ico">&#x1F4C5;</span><span class="sb-lbl">Scheduler</span></button>
    <button class="sb-item"        id="sb-analytics" onclick="goTo('analytics')" ><span class="sb-ico">&#x1F4CA;</span><span class="sb-lbl">Analytics</span></button>
  </div>
  <button class="sb-new-order" onclick="goTo('orders');openOrderModal()">&#xFF0B; New Order</button>
  <div class="sb-footer">
    <button class="sb-item" onclick="sb.auth.signOut().then(()=>location.reload())"><span class="sb-ico">&#x1F513;</span><span class="sb-lbl">Sign Out</span></button>
  </div>
</nav>

<!-- MAIN -->
<div class="app-main">
```

- [ ] **Step 3: Add the new main header HTML**

Directly after the `<div class="app-main">` line you just added, insert:

```html
<!-- MAIN HEADER -->
<header class="main-header">
  <div class="main-title" id="main-page-title">Workshop Dashboard</div>
  <div style="display:flex;align-items:center;gap:8px;">
    <button class="header-new-order-btn" onclick="goTo('orders');openOrderModal()" title="New Order">&#xFF0B;</button>
    <div class="conn-pill">
      <div class="conn-dot" id="connDot"></div>
      <span id="connText">Connecting...</span>
    </div>
  </div>
</header>
```

- [ ] **Step 4: Close the app-layout wrapper**

Find the very end of the HTML body, just before `</body>`. Add:

```html
</div><!-- /app-main -->
</div><!-- /app-layout -->

<!-- BOTTOM NAV -->
<nav class="bottom-nav" id="bottom-nav">
  <button class="bn-item active" id="bn-home"      onclick="goTo('home')"      ><span class="bn-ico">&#x229E;</span><span class="bn-lbl">Home</span></button>
  <button class="bn-item"        id="bn-orders"    onclick="goTo('orders')"    ><span class="bn-ico">&#x1F4CB;</span><span class="bn-lbl">Orders</span></button>
  <button class="bn-item"        id="bn-materials" onclick="goTo('materials')" ><span class="bn-ico">&#x1FA9A;</span><span class="bn-lbl">Materials</span></button>
  <button class="bn-item"        id="bn-scheduler" onclick="goTo('scheduler')" ><span class="bn-ico">&#x1F4C5;</span><span class="bn-lbl">Scheduler</span></button>
  <button class="bn-item"        id="bn-analytics" onclick="goTo('analytics')" ><span class="bn-ico">&#x1F4CA;</span><span class="bn-lbl">Analytics</span></button>
</nav>
```

- [ ] **Step 5: Verify in browser**

Open `index.html`. You should see a dark sidebar on the left with nav items, and "Workshop Dashboard" in the header. The sidebar nav items are not yet functional (JS patched in Task 7).

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "feat: add sidebar nav, main header, and bottom-nav HTML + CSS"
```

---

### Task 4: Responsive CSS — tablet sidebar + mobile bottom nav

**Files:**
- Modify: `index.html` (`<style>` block, responsive media query sections)

- [ ] **Step 1: Update the existing `@media (max-width: 640px)` block**

Find the existing `@media (max-width: 640px)` block. Add these rules inside it:

```css
  .sidebar { display: none; }
  .bottom-nav { display: flex; }
  .header-new-order-btn { display: flex; }
  .page { padding-bottom: 70px; }
  #page-home { padding-bottom: 70px; }
  #page-analytics { padding-bottom: 70px; }
  .main-header { padding: 0 16px; }
```

- [ ] **Step 2: Update the tablet media query block (641px–1024px)**

Find the existing `@media (min-width: 641px) and (max-width: 1024px)` block. Add inside it:

```css
  .sidebar { width: 170px; }
  .sb-lbl { font-size: 12px; }
```

- [ ] **Step 3: Update the desktop media query (>=1025px)**

Find the existing `@media (min-width: 1025px)` block. Add inside it:

```css
  .main-header { padding: 0 28px; }
  #page-home { padding: 28px 28px 60px; }
  #page-analytics { padding: 28px 28px 60px; }
  .app-container { padding: 28px 28px 60px; }
```

Remove any `.app-header { padding: ... }` or `.conn-bar { padding: ... }` lines from this block (they reference deleted elements).

- [ ] **Step 4: Remove old `.app-header` and `.conn-bar` CSS**

In the main `<style>` block (not inside media queries), find and delete all CSS rules for:
`.app-header`, `.app-header::after`, `.header-logo`, `.header-brand`, `.header-back-btn`, `.header-back-btn:hover`, `.header-back-btn.visible`

The new `.conn-dot` and `.conn-text` rules were added in Task 3 CSS. Delete the old `.conn-bar`, `.conn-dot`, `.conn-dot.connected`, `.conn-dot.error`, `.conn-text` rules from the old header section (keep the new ones added in Task 3).

Update `.tabs` sticky top offset:
```css
.tabs {
  top: 52px; /* height of .main-header */
}
```
(Previously it was `calc(62px + env(safe-area-inset-top, 0px))`.)

- [ ] **Step 5: Verify responsive behavior**

Open `index.html`. Use DevTools to toggle mobile view (<=640px). Sidebar disappears and bottom nav appears. At tablet width (768px) sidebar is narrower. No horizontal overflow.

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "style: responsive layout — mobile bottom nav, tablet sidebar width"
```

---

### Task 5: Restyle all cards, tables, inputs, buttons, and modals

**Files:**
- Modify: `index.html` (`<style>` block)

- [ ] **Step 1: Update `.card` and `.order-card`**

Find:
```css
.card {
  background: white;
  border: 2px solid var(--warm-gray);
  border-radius: 12px;
  padding: 18px 20px;
}
.card:hover { border-color: var(--ocean-light); }
```
Replace with:
```css
.card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 12px 14px;
}
.card:hover { border-color: var(--ocean); }
```

Find:
```css
.order-card {
  background: white;
  border: 2px solid var(--warm-gray);
  border-radius: 12px;
  padding: 16px 18px;
```
Replace `background: white` with `background: var(--bg-card)`, `border: 2px solid var(--warm-gray)` with `border: 1px solid var(--border)`, `border-radius: 12px` with `border-radius: 8px`, `padding: 16px 18px` with `padding: 11px 13px`.

Find `.order-card:hover { border-color: var(--ocean-light); }` — change `var(--ocean-light)` to `var(--ocean)`.

- [ ] **Step 2: Update `.summary-card`**

Find `.summary-card { background: white; border: 2px solid var(--warm-gray); border-radius: 12px; padding: 14px; }`.
Replace: `background: var(--bg-card); border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px;`

- [ ] **Step 3: Update `.stat-card`, `.inv-card`, `.table-wrap`**

For each of these, replace `background: white; border: 2px solid var(--warm-gray);` with `background: var(--bg-card); border: 1px solid var(--border);`.

- [ ] **Step 4: Update `.data-table`**

Find `.data-table th { background: var(--navy);` — replace `var(--navy)` with `var(--bg-deep)`.

Find `.data-table tr:hover td { background: var(--cream); }` — replace `var(--cream)` with `var(--bg-elevated)`.

Find `.data-table td { padding: 11px 14px; border-bottom: 1px solid var(--warm-gray);` — change border to `var(--border-dim)`.

- [ ] **Step 5: Update `.tabs`**

Find `.tabs { background: white; border-bottom: 2px solid var(--warm-gray);` — replace with `background: var(--bg-deep); border-bottom: 1px solid var(--border-dim);`.

- [ ] **Step 6: Update buttons**

Find `.btn-primary { ... background: var(--navy);` — replace `var(--navy)` with `var(--ocean)`.
Find `.btn-primary:hover { background: var(--ocean); }` — replace with `background: var(--ocean-light);`.

Find `.btn-secondary { ... background: white; color: var(--navy); border: 2px solid var(--ocean);` — replace with `background: var(--bg-card); color: var(--ocean-light); border: 1px solid var(--ocean);`.
Find `.btn-secondary:hover { background: var(--cream); }` — replace `var(--cream)` with `var(--bg-elevated)`.

- [ ] **Step 7: Update form inputs**

Find `.form-control { ... }`, `.std-input { ... }`, `.dim-input { ... }`. For each, set `background: var(--bg-input); color: var(--text); border-color: var(--border);`. Remove any `background: white` or `background: var(--warm-white)` values.

- [ ] **Step 8: Update modals**

Find the `.modal { background: white` rule — replace `background: white` with `background: var(--bg-card)`.
Change any `border: 2px solid var(--warm-gray)` inside modal rules to `border: 1px solid var(--border)`.
Find `.modal-overlay { background: rgba(0,0,0,0.5)` — update to `rgba(0,0,0,0.7)`.

- [ ] **Step 9: Update misc surfaces**

Find `.filter-btn { ... background: white;` — replace with `background: var(--bg-card)`.
Find `.filter-btn.active { ... background: var(--navy);` — replace `var(--navy)` with `var(--ocean)`.
Find `.icon-btn { ... background: white;` — replace with `background: var(--bg-card)`.
Find `.icon-btn:hover { ... background: var(--cream);` — replace with `background: var(--bg-elevated)`.

Do a Find-in-file for any remaining `background: white` or `background:#fff` in the `<style>` block and replace card/surface instances with `var(--bg-card)`.

- [ ] **Step 10: Verify**

Navigate to Orders, Materials, Scheduler, Analytics. All cards dark. Modals open dark. Tables have dark header rows.

- [ ] **Step 11: Commit**

```bash
git add index.html
git commit -m "style: restyle all cards, tables, inputs, buttons, modals to dark theme"
```

---

### Task 6: Replace home page layout

**Files:**
- Modify: `index.html` (home page HTML and CSS)

The current home page has: `.home-hero`, `.home-kpi-row`, `#home-activity`, `.app-grid` tiles. Replace with: 2x2 KPI grid + activity feed (side by side), then Active Orders pills + Next Pickups (bottom row). All KPI element IDs (`kpi-month-rev`, `kpi-ytd-rev`, `kpi-inv-count`, `kpi-owed`, `kpi-month-trend`, `kpi-ytd-trend`, `ss-pending`, `ss-building`, `ss-ready-ord`, `home-activity`) are preserved so `loadHomeStats()` and `loadRecentActivity()` work without JS changes.

- [ ] **Step 1: Add home page CSS**

In the `<style>` block, find `/* ===== HOME SCREEN ===== */` and replace the entire home screen CSS section (everything until the next `/* ===== */` section comment) with:

```css
/* ===== HOME SCREEN ===== */
#page-home {
  padding: 20px 20px 60px;
  max-width: 1280px;
  margin: 0 auto;
}
.home-top {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 10px;
}
.home-bottom {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.kpi-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.kpi-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px 12px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.kpi-ico {
  width: 34px; height: 34px;
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  font-size: 15px;
  flex-shrink: 0;
}
.kpi-ico-gold   { background: rgba(201,165,90,0.12); }
.kpi-ico-blue   { background: rgba(74,134,168,0.12); }
.kpi-ico-green  { background: rgba(58,140,92,0.12); }
.kpi-ico-orange { background: rgba(212,120,42,0.12); }
.kpi-body { min-width: 0; }
.kpi-lbl  { font-size: 9px; text-transform: uppercase; letter-spacing: 1.1px; color: var(--text-dim); }
.kpi-val  {
  font-family: 'Playfair Display', serif;
  font-size: 19px; font-weight: 700;
  line-height: 1.2;
  display: flex; align-items: baseline; gap: 5px;
  flex-wrap: wrap;
}
.kpi-sub  { font-size: 10px; color: var(--text-dim); }
.kpi-val-gold    { color: var(--sand); }
.kpi-val-blue    { color: var(--ocean-light); }
.kpi-val-green   { color: var(--green); }
.kpi-val-dimtext { color: var(--text); }
.trend-badge { font-size: 9px; padding: 1px 5px; border-radius: 4px; font-weight: 600; white-space: nowrap; }
.trend-up   { background: rgba(58,140,92,0.2);   color: var(--green); }
.trend-down { background: rgba(192,57,43,0.2);   color: var(--red); }
.trend-flat { background: rgba(74,134,168,0.15); color: var(--text-dim); }
.home-activity-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px 12px;
}
.home-card-head {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 8px;
}
.home-card-title { font-size: 12px; font-weight: 700; color: var(--ocean-light); }
.home-card-link  { font-size: 10px; color: var(--ocean); text-transform: uppercase; letter-spacing: 0.5px; cursor: pointer; }
.activity-item {
  display: flex; gap: 8px; align-items: center;
  padding: 5px 0; border-bottom: 1px solid var(--border-dim);
}
.activity-item:last-child { border-bottom: none; }
.activity-icon {
  width: 22px; height: 22px; border-radius: 5px;
  background: var(--bg-elevated); display: flex; align-items: center;
  justify-content: center; font-size: 11px; flex-shrink: 0;
}
.activity-text  { flex: 1; min-width: 0; }
.activity-text > div:first-child { font-size: 11.5px; font-weight: 600; color: #c8dce8; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.activity-sub   { font-size: 10px; color: var(--text-dim); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.activity-time  { font-size: 10px; color: var(--text-dim); white-space: nowrap; flex-shrink: 0; }
.home-panel {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px 12px;
}
.order-pills { display: flex; gap: 6px; margin-bottom: 4px; }
.order-pill {
  flex: 1; background: var(--bg-elevated);
  border-radius: 6px; padding: 8px 6px; text-align: center;
}
.order-pill-val {
  font-family: 'Playfair Display', serif;
  font-size: 20px; font-weight: 700; line-height: 1.1;
}
.order-pill-lbl { font-size: 9px; text-transform: uppercase; letter-spacing: 0.8px; color: var(--text-dim); margin-top: 2px; }
.pill-orange { color: var(--orange); }
.pill-blue   { color: var(--ocean); }
.pill-green  { color: var(--green); }
.panel-foot  { font-size: 10px; color: var(--text-dim); }
.pickup-row {
  display: flex; gap: 8px; align-items: center;
  padding: 4px 0; border-bottom: 1px solid var(--border-dim);
  font-size: 11.5px;
}
.pickup-row:last-child { border-bottom: none; }
.pickup-time { color: var(--ocean); font-family: 'DM Mono', monospace; font-size: 11px; min-width: 38px; flex-shrink: 0; }
.pickup-name { color: var(--ocean-light); flex: 1; }
.pickup-name.tomorrow { color: var(--text-dim); font-style: italic; }
@media (max-width: 640px) {
  .home-top    { grid-template-columns: 1fr; }
  .home-bottom { grid-template-columns: 1fr; }
  .kpi-grid    { grid-template-columns: 1fr 1fr; }
}
@media (min-width: 641px) and (max-width: 820px) {
  .home-top    { grid-template-columns: 1fr; }
  .home-bottom { grid-template-columns: 1fr 1fr; }
}
```

- [ ] **Step 2: Replace the home page HTML**

Find the entire `<div class="page active" id="page-home">...</div>` block and replace with:

```html
<!-- ===== HOME PAGE ===== -->
<div class="page active" id="page-home">
  <div class="home-top">
    <!-- 2x2 KPI Grid -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-ico kpi-ico-gold">&#x1F4B0;</div>
        <div class="kpi-body">
          <div class="kpi-lbl">This Month</div>
          <div class="kpi-val">
            <span class="kpi-val-gold" id="kpi-month-rev">&#x2014;</span>
            <span class="trend-badge" id="kpi-month-trend"></span>
          </div>
          <div class="kpi-sub">vs last month</div>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-ico kpi-ico-blue">&#x1F4C8;</div>
        <div class="kpi-body">
          <div class="kpi-lbl">YTD Sales</div>
          <div class="kpi-val">
            <span class="kpi-val-dimtext" id="kpi-ytd-rev">&#x2014;</span>
            <span class="trend-badge" id="kpi-ytd-trend"></span>
          </div>
          <div class="kpi-sub">Since Jan 1</div>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-ico kpi-ico-green">&#x1F4E6;</div>
        <div class="kpi-body">
          <div class="kpi-lbl">Ready to Sell</div>
          <div class="kpi-val kpi-val-green" id="kpi-inv-count">&#x2014;</div>
          <div class="kpi-sub">In inventory</div>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-ico kpi-ico-orange">&#x23F3;</div>
        <div class="kpi-body">
          <div class="kpi-lbl">Amount Owed</div>
          <div class="kpi-val kpi-val-blue" id="kpi-owed">&#x2014;</div>
          <div class="kpi-sub">Unpaid orders</div>
        </div>
      </div>
    </div>

    <!-- Activity Feed -->
    <div class="home-activity-card">
      <div class="home-card-head">
        <div class="home-card-title">&#x23F1; Recent Activity</div>
        <div class="home-card-link" onclick="goTo('orders')">FULL LOG &#x2192;</div>
      </div>
      <div id="home-activity"></div>
    </div>
  </div>

  <div class="home-bottom">
    <!-- Active Orders -->
    <div class="home-panel">
      <div class="home-card-head">
        <div class="home-card-title">&#x1F4CB; Active Orders</div>
        <div class="home-card-link" onclick="goTo('orders')">VIEW ALL &#x2192;</div>
      </div>
      <div class="order-pills">
        <div class="order-pill">
          <div class="order-pill-val pill-orange" id="ss-pending">&#x2014;</div>
          <div class="order-pill-lbl">Pending</div>
        </div>
        <div class="order-pill">
          <div class="order-pill-val pill-blue" id="ss-building">&#x2014;</div>
          <div class="order-pill-lbl">Building</div>
        </div>
        <div class="order-pill">
          <div class="order-pill-val pill-green" id="ss-ready-ord">&#x2014;</div>
          <div class="order-pill-lbl">Ready</div>
        </div>
      </div>
      <div class="panel-foot" id="home-orders-foot"></div>
    </div>

    <!-- Next Pickups -->
    <div class="home-panel">
      <div class="home-card-head">
        <div class="home-card-title">&#x1F4C5; Next Pickups</div>
        <div class="home-card-link" onclick="goTo('scheduler')">SCHEDULE &#x2192;</div>
      </div>
      <div id="home-pickups-list"><div style="font-size:11px;color:var(--text-dim);">Loading...</div></div>
    </div>
  </div>
</div>
```

- [ ] **Step 3: Verify home page layout**

Open `index.html`. The home page should show 2x2 KPI grid, activity feed, Active Orders pills, and Next Pickups panel. Values will show em-dashes until connected to Supabase.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: replace home page with 2x2 KPI grid, activity feed, and bottom panels"
```

---

### Task 7: JS patches — goTo, goHome, sidebar active state, Next Pickups loader

**Files:**
- Modify: `index.html` (JS section)

- [ ] **Step 1: Patch `goTo()`**

Find `function goTo(page) {`. Replace the entire function with:

```javascript
function goTo(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const el = document.getElementById('page-'+page);
  if (el) el.classList.add('active');
  currentPage = page;
  window.scrollTo(0,0);

  // Update header title
  const titles = {
    home: 'Workshop Dashboard',
    orders: 'Orders',
    materials: 'Materials',
    scheduler: 'Scheduler',
    analytics: 'Analytics'
  };
  const titleEl = document.getElementById('main-page-title');
  if (titleEl) titleEl.textContent = titles[page] || page;

  // Update sidebar + bottom nav active state
  ['home','orders','materials','scheduler','analytics'].forEach(p => {
    const sbEl = document.getElementById('sb-'+p);
    const bnEl = document.getElementById('bn-'+p);
    if (sbEl) sbEl.classList.toggle('active', p === page);
    if (bnEl) bnEl.classList.toggle('active', p === page);
  });

  if (page==='home')      { setHomeGreeting(); loadHomeStats(); loadRecentActivity(); loadHomePickups(); }
  if (page==='orders')    { loadOrders(); }
  if (page==='materials') { loadPurchases(); }
  if (page==='scheduler') { renderCalendar(); loadWindows(); }
  if (page==='analytics') { loadAnalytics(); }
}
```

- [ ] **Step 2: Patch `goHome()`**

Find `function goHome() {`. Replace the entire function body with a single delegation:

```javascript
function goHome() {
  goTo('home');
}
```

- [ ] **Step 3: Patch `setHomeGreeting()`**

Find `function setHomeGreeting() {`. The function currently sets text on `home-greeting` and `home-date` elements that no longer exist. Replace the function body with an empty body:

```javascript
function setHomeGreeting() {
  // greeting display removed in redesign
}
```

- [ ] **Step 4: Update initial page load call**

Find the lines inside `onAuthStateChange` (or equivalent init block) that manually load the home page on first login — they call `loadHomeStats()` and `loadRecentActivity()` directly. Add `loadHomePickups();` immediately after those calls so the pickups panel populates on first render.

- [ ] **Step 5: Add `loadHomePickups()` function**

Find the comment `// ===== HOME STATS =====` in the JS. Immediately before it, add the following function. It follows the same pattern as the existing `loadRecentActivity()` — uses `esc()` for XSS-safe rendering and builds HTML using string templates before assigning to the container element's content property:

```javascript
// ===== HOME PICKUPS PANEL =====
async function loadHomePickups() {
  const listEl = document.getElementById('home-pickups-list');
  if (!listEl) return;
  try {
    const todayStr = todayKey();
    const { data } = await sb
      .from('orders')
      .select('id, customer_name, pickup_date, pickup_time')
      .gte('pickup_date', todayStr)
      .not('pickup_date', 'is', null)
      .order('pickup_date', { ascending: true })
      .order('pickup_time', { ascending: true })
      .limit(4);

    if (!data || !data.length) {
      listEl.textContent = '';
      const msg = document.createElement('div');
      msg.style.cssText = 'font-size:11px;color:var(--text-dim)';
      msg.textContent = 'No upcoming pickups';
      listEl.appendChild(msg);
      return;
    }

    const todayDate = new Date(todayStr + 'T00:00:00');
    const rows = data.map(o => {
      const pDate = new Date(o.pickup_date + 'T00:00:00');
      const isToday    = o.pickup_date === todayStr;
      const isTomorrow = (pDate - todayDate) === 86400000;
      const timeLabel  = o.pickup_time
        ? o.pickup_time.slice(0, 5)
        : (isToday ? 'Today' : isTomorrow ? 'Tmrw' : o.pickup_date.slice(5));
      const nameClass = isToday ? 'pickup-name' : 'pickup-name tomorrow';
      const name = esc(o.customer_name || 'Order #' + o.id);
      return `<div class="pickup-row"><span class="pickup-time">${esc(timeLabel)}</span><span class="${nameClass}">${name}</span></div>`;
    }).join('');
    listEl.innerHTML = rows;
  } catch(e) {
    console.error(e);
    listEl.textContent = '—';
  }
}
```

- [ ] **Step 6: Update `loadHomeStats()` to set the orders footer**

Find the section inside `loadHomeStats()` that sets `hp-active`, `hp-owed`, `hp-pickups` values. After that block, add:

```javascript
    const footEl = document.getElementById('home-orders-foot');
    if (footEl) {
      const orderTotal = (pending || 0) + (building || 0) + (ready || 0);
      footEl.textContent = orderTotal + ' total' + (overdue ? ' \u00b7 ' + overdue + ' overdue' : '');
    }
```

Note: `pending`, `building`, `ready`, `overdue` variables are already computed earlier in `loadHomeStats()`. Verify their names match by reading that function before inserting.

- [ ] **Step 7: Verify JS functionality**

Open `index.html`, log in. Confirm:
- Home page KPI values load from DB
- Activity feed appears
- Active Orders pill counts appear
- Next Pickups panel shows upcoming orders
- Clicking each sidebar item navigates the page and updates the header title
- Active sidebar item highlighted correctly
- On mobile: bottom nav items navigate and highlight correctly

- [ ] **Step 8: Commit**

```bash
git add index.html
git commit -m "feat: patch goTo/goHome, add loadHomePickups, wire sidebar and bottom-nav active state"
```

---

### Task 8: Clean up orphaned CSS and update manifest

**Files:**
- Modify: `index.html`, `manifest.json`

- [ ] **Step 1: Update manifest.json**

Open `manifest.json`. Find `"theme_color": "#1E4D6B"`. Replace with `"theme_color": "#0d1822"`.

- [ ] **Step 2: Delete orphaned home page CSS classes**

In the `<style>` block, find and delete the CSS rules for these classes (they were only used by old home page elements now removed):

- `.home-greeting`, `.home-greeting h2`, `.home-greeting p`
- `.home-stats`, `.home-stat`, `.home-stat .val`, `.home-stat .lbl`
- `.app-grid`, `.app-tile`, `.app-tile::before`, `.app-tile:hover`, `.app-tile:hover::before`, `.tile-icon`, `.tile-name`, `.tile-desc`, `.tile-badge`
- `.stat-strip`, `.strip-item`, `.strip-item:last-child`, `.strip-val`, `.strip-lbl`
- `.home-kpi-row`
- `.home-hero`, `.home-hero-left`, `.home-hero-cta`, `.home-hero-greeting`, `.home-hero-date`, `.home-hero-pills`, `.home-hero::before`, `.home-hero::after`
- `.btn-new-order`, `.btn-new-order:hover`, `.btn-new-order:active`
- `.tile-span-full`, `.home-main-col`, `.home-side-col`
- `.hero-pill`, `.hp-orange`, `.hp-green`, `.hp-ocean`
- `.tile-head`, `.tile-tag`, `.tile-mini-stats`, `.tms-chip`, `.tms-val`

Also remove references to these classes from all media query blocks.

- [ ] **Step 3: Final background:white sweep**

Do a Find-in-file for `background: white` and `background:#fff`. Verify each remaining instance is intentional (e.g., inside a print media query or explicit white element). Replace any remaining card/surface instances with `var(--bg-card)`.

- [ ] **Step 4: Commit**

```bash
git add index.html manifest.json
git commit -m "chore: remove orphaned CSS, update manifest theme_color to dark"
```

---

### Task 9: Full verification pass

- [ ] **Step 1: Check all pages visually**

Open `index.html` and log in. Navigate to each page:
- **Dashboard**: 2x2 KPI cards populated, activity feed shows, Active Orders pills show counts, Next Pickups shows upcoming orders with times
- **Orders**: Dark cards with colored left border, dark filter buttons, modals open dark, tabs work
- **Materials**: Dark table header row, purchase rows readable, cut list runs correctly
- **Scheduler**: Calendar renders with dark day cells, pickup cards dark
- **Analytics**: Chart cards dark, P&L summary cards readable

- [ ] **Step 2: Check mobile (<=640px)**

DevTools mobile view. Verify:
- Sidebar is hidden
- Bottom tab bar is fixed at bottom, clears the home bar
- Page content does not sit behind the tab bar
- Each tab navigates and highlights the active icon
- Plus button appears in header, opens New Order modal

- [ ] **Step 3: Check tablet (641-1024px)**

Resize to ~768px. Sidebar visible at 170px. Content does not overflow.

- [ ] **Step 4: Check modals**

Open New Order modal, Edit Purchase modal, and the Add-on settings modal. All should have dark backgrounds and readable inputs.

- [ ] **Step 5: Check auth flow**

Sign out. Sign-in gate appears. Sign back in. Lands on Dashboard with sidebar item "Dashboard" active.

- [ ] **Step 6: Final commit**

```bash
git add index.html manifest.json
git commit -m "chore: full verification pass — dark redesign complete"
```

---

## Self-Review

**Spec coverage:**
- [x] Color system promoted to `:root` — Task 1
- [x] Dark toggle removed — Tasks 1 & 2
- [x] Layout structure (app-layout, sidebar, app-main) — Task 3
- [x] Sidebar HTML + CSS — Task 3
- [x] Main header (replaces app-header + conn-bar) — Task 3
- [x] Mobile bottom tab bar — Task 4
- [x] Responsive breakpoints — Task 4
- [x] Card/surface restyling — Task 5
- [x] Home page 2x2 KPI layout — Task 6
- [x] Activity feed restyled — Task 6
- [x] Active Orders pills panel — Tasks 6 & 7
- [x] Next Pickups panel + loadHomePickups() — Tasks 6 & 7
- [x] goTo() / goHome() patches + backBtn removal — Task 7
- [x] setHomeGreeting() stub (deleted elements) — Task 7
- [x] manifest.json theme_color — Task 8
- [x] Orphaned CSS cleanup — Task 8

**IDs preserved for existing JS:** `kpi-month-rev`, `kpi-ytd-rev`, `kpi-inv-count`, `kpi-owed`, `kpi-month-trend`, `kpi-ytd-trend`, `ss-pending`, `ss-building`, `ss-ready-ord`, `home-activity`, `connDot`, `connText`
