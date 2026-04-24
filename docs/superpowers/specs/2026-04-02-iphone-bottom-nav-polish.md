# Spec: iPhone Bottom Nav Polish

**Date:** 2026-04-02
**Status:** Approved

## Problem

The bottom navigation bar on iPhone has small touch targets, tiny labels, and a weak active state (color-only). The nav items feel flat and hard to tap confidently.

## Solution

Wrap each icon in a rounded tap-zone container. The active item gets a visible gold-tinted background on that container. Labels and icons get a small size bump.

## Changes

### HTML (`index.html` — bottom-nav section, ~line 5751)

Each `bn-item` button gains a `.bn-icon-wrap` span around the icon:

**Before:**
```html
<button class="bn-item active" id="bn-home" onclick="goTo('home')">
  <span class="bn-ico">&#x229E;</span>
  <span class="bn-lbl">Home</span>
</button>
```

**After:**
```html
<button class="bn-item active" id="bn-home" onclick="goTo('home')">
  <span class="bn-icon-wrap"><span class="bn-ico">&#x229E;</span></span>
  <span class="bn-lbl">Home</span>
</button>
```

Apply to all 5 nav items: `bn-home`, `bn-orders`, `bn-materials`, `bn-scheduler`, `bn-analytics`.

### CSS (`index.html` — bottom nav styles, ~line 228)

**Add `.bn-icon-wrap`:**
```css
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
```

**Update existing rules:**
```css
/* bn-item: taller, larger tap zone */
.bn-item {
  min-height: 60px;  /* was 50px */
  padding: 6px 4px 6px;  /* was 6px 4px 4px */
}

/* bn-ico: slightly larger */
.bn-ico {
  font-size: 20px;  /* was 18px */
}

/* bn-lbl: slightly larger, bolder */
.bn-lbl {
  font-size: 10px;   /* was 9px */
  font-weight: 600;  /* was 500 */
}
```

**Update mobile page padding** (inside `@media (max-width: 640px)`):
```css
/* was 85px — bumped to clear taller nav + home indicator */
.page         { padding-bottom: 100px; }
#page-home    { padding-bottom: 100px; }
#page-analytics { padding-bottom: 100px; }
```

## What stays the same

- `padding-bottom: env(safe-area-inset-bottom, 0px)` on `.bottom-nav` — already correct, no change
- Nav only shows at `≤640px` — no change to breakpoints
- `active` class toggling in `goTo()` — no change to JS
- All 5 nav items and their icons/labels — only wrapper added

## Acceptance criteria

- Tapping any nav item feels confident — 40px-wide icon zone is clearly tappable
- Active item shows gold tinted background on the icon container
- Labels are readable at 10px
- Content on all pages is not hidden behind the nav bar (100px bottom padding)
- No visual regression on desktop or iPad
