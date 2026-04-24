# iPhone Bottom Nav Polish — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish the iPhone bottom navigation bar with rounded icon tap zones, a gold active background, larger icons/labels, and corrected page bottom padding.

**Architecture:** Pure CSS + minimal HTML change inside the single `index.html` file. Add a `.bn-icon-wrap` span around each nav icon, add/update the relevant CSS rules, and bump mobile page bottom-padding from 85px to 100px.

**Tech Stack:** Vanilla HTML/CSS inside `index.html`. No build step. No JS changes.

---

### Task 1: Add `.bn-icon-wrap` CSS rules

**Files:**
- Modify: `index.html` (CSS section, around line 228 — the `/* ===== BOTTOM NAV (mobile only) =====*/` block)

- [ ] **Step 1: Locate the bottom nav CSS block**

In `index.html` find the comment `/* ===== BOTTOM NAV (mobile only) ===== */` (around line 228). The block currently ends after `.bn-lbl { ... }`.

- [ ] **Step 2: Update `.bn-item`, `.bn-ico`, `.bn-lbl` and add `.bn-icon-wrap` rules**

Replace the existing `.bn-item`, `.bn-ico`, and `.bn-lbl` rules and add the two new `.bn-icon-wrap` rules so the block reads:

```css
/* ===== BOTTOM NAV (mobile only) ===== */
.bottom-nav {
  display: none;
  flex-direction: row;
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
  padding: 6px 4px 6px;
  background: none;
  border: none;
  cursor: pointer;
  font-family: 'DM Sans', sans-serif;
  color: var(--text-dim);
  transition: color 0.15s;
  min-height: 60px;
}
.bn-item:hover { color: var(--ocean-light); }
.bn-item.active { color: var(--sand); }
.bn-icon-wrap {
  width: 40px;
  height: 32px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}
.bn-item.active .bn-icon-wrap {
  background: rgba(201, 165, 90, 0.18);
}
.bn-ico { font-size: 20px; line-height: 1; }
.bn-lbl { font-size: 10px; font-weight: 600; letter-spacing: 0.3px; }
```

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add bn-icon-wrap tap zone with gold active background"
```

---

### Task 2: Update mobile page bottom-padding

**Files:**
- Modify: `index.html` (inside `@media (max-width: 640px)` block, around line 1116–1121)

- [ ] **Step 1: Find the three padding-bottom rules inside the 640px media query**

Search for `padding-bottom: 85px` — there are three rules in the `@media (max-width: 640px)` block:

```css
  .page { padding-bottom: 85px; }
  #page-home { padding-bottom: 85px; }
  #page-analytics { padding-bottom: 85px; }
```

- [ ] **Step 2: Change all three from 85px to 100px**

```css
  .page { padding-bottom: 100px; }
  #page-home { padding-bottom: 100px; }
  #page-analytics { padding-bottom: 100px; }
```

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "fix: bump mobile page padding-bottom to 100px for taller bottom nav"
```

---

### Task 3: Wrap icons in `.bn-icon-wrap` HTML

**Files:**
- Modify: `index.html` (bottom-nav HTML, around line 5751)

- [ ] **Step 1: Find the bottom-nav HTML**

Near the end of `index.html`, find the `<nav class="bottom-nav" id="bottom-nav">` block. It currently looks like:

```html
<nav class="bottom-nav" id="bottom-nav">
  <button class="bn-item active" id="bn-home"      onclick="goTo('home')"      ><span class="bn-ico">&#x229E;</span><span class="bn-lbl">Home</span></button>
  <button class="bn-item"        id="bn-orders"    onclick="goTo('orders')"    ><span class="bn-ico">&#x1F4CB;</span><span class="bn-lbl">Orders</span></button>
  <button class="bn-item"        id="bn-materials" onclick="goTo('materials')" ><span class="bn-ico">&#x1FA9A;</span><span class="bn-lbl">Materials</span></button>
  <button class="bn-item"        id="bn-scheduler" onclick="goTo('scheduler')" ><span class="bn-ico">&#x1F4C5;</span><span class="bn-lbl">Scheduler</span></button>
  <button class="bn-item"        id="bn-analytics" onclick="goTo('analytics')" ><span class="bn-ico">&#x1F4CA;</span><span class="bn-lbl">Analytics</span></button>
</nav>
```

- [ ] **Step 2: Replace the entire bottom-nav block**

Wrap each `bn-ico` span in a `<span class="bn-icon-wrap">`:

```html
<nav class="bottom-nav" id="bottom-nav">
  <button class="bn-item active" id="bn-home"      onclick="goTo('home')"      ><span class="bn-icon-wrap"><span class="bn-ico">&#x229E;</span></span><span class="bn-lbl">Home</span></button>
  <button class="bn-item"        id="bn-orders"    onclick="goTo('orders')"    ><span class="bn-icon-wrap"><span class="bn-ico">&#x1F4CB;</span></span><span class="bn-lbl">Orders</span></button>
  <button class="bn-item"        id="bn-materials" onclick="goTo('materials')" ><span class="bn-icon-wrap"><span class="bn-ico">&#x1FA9A;</span></span><span class="bn-lbl">Materials</span></button>
  <button class="bn-item"        id="bn-scheduler" onclick="goTo('scheduler')" ><span class="bn-icon-wrap"><span class="bn-ico">&#x1F4C5;</span></span><span class="bn-lbl">Scheduler</span></button>
  <button class="bn-item"        id="bn-analytics" onclick="goTo('analytics')" ><span class="bn-icon-wrap"><span class="bn-ico">&#x1F4CA;</span></span><span class="bn-lbl">Analytics</span></button>
</nav>
```

- [ ] **Step 3: Verify visually in browser at ≤640px viewport**

Open `index.html` in Chrome DevTools with iPhone viewport (e.g. iPhone 14, 390px wide). Confirm:
- Bottom nav shows 5 items
- Active item (Home by default) has a soft gold tinted rounded background behind the icon
- Labels are visible and slightly larger than before
- No content is clipped behind the nav bar on any page

- [ ] **Step 4: Verify no desktop regression**

Switch DevTools to desktop viewport (≥1025px). Confirm:
- Bottom nav is not visible
- Sidebar is visible and unaffected

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat: wrap bottom nav icons in bn-icon-wrap tap zones"
```

---

### Task 4: Push and confirm deploy

- [ ] **Step 1: Push to main**

```bash
git push origin main
```

- [ ] **Step 2: Confirm GitHub Pages deployment**

Wait ~60 seconds, then open `https://kjakupak.github.io/rmk-crafted/` (or the deployed URL) on a real iPhone or in mobile emulation. Confirm:
- Gold tinted background appears on the active nav icon
- All 5 labels are readable
- Content on Orders, Materials, Scheduler, Analytics pages is not hidden behind the nav
