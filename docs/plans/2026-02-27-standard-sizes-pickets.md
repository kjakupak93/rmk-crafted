# Standard Sizes Picket Counts Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add real-world picket counts to 8 STANDARD_SIZES entries and update the two places that display/use those counts to prefer the hardcoded value over the formula.

**Architecture:** Add an optional `pickets` field to 8 entries in the `STANDARD_SIZES` array. Update `buildStdTable()` to use `s.pickets || estPickets(...)` and update `useStdSize()` to look up the matched size and use its `pickets` if present. `estPickets()` is unchanged — it still handles custom dimensions.

**Tech Stack:** Vanilla HTML/CSS/JS, single `index.html`, no build step.

---

### Task 1: Add `pickets` field to STANDARD_SIZES entries

**Files:**
- Modify: `index.html` (lines ~1477–1481, the STANDARD_SIZES array)

**Current array (lines ~1477–1481):**
```js
const STANDARD_SIZES = [
  {l:16,w:16,h:16,price:30},{l:36,w:12,h:16,price:55},{l:36,w:16,h:16,price:60},
  {l:36,w:16,h:27,price:70},{l:36,w:24,h:16,price:100},{l:48,w:12,h:16,price:75},
  {l:48,w:12,h:27,price:80},{l:48,w:16,h:16,price:85},{l:48,w:16,h:27,price:90},
  {l:48,w:24,h:16,price:110}
];
```

**Replace with:**
```js
const STANDARD_SIZES = [
  {l:16,w:16,h:16,price:30},{l:36,w:12,h:16,price:55},{l:36,w:16,h:16,price:60,pickets:6},
  {l:36,w:16,h:27,price:70,pickets:7},{l:36,w:24,h:16,price:100,pickets:10},{l:48,w:12,h:16,price:75,pickets:7},
  {l:48,w:12,h:27,price:80,pickets:7},{l:48,w:16,h:16,price:85,pickets:8},{l:48,w:16,h:27,price:90,pickets:9},
  {l:48,w:24,h:16,price:110,pickets:11}
];
```

Note: `16×16×16` and `36×12×16` intentionally have no `pickets` field — they stay formula-driven.

**Commit:**
```bash
git add index.html
git commit -m "feat: add real picket counts to STANDARD_SIZES entries"
```

---

### Task 2: Update buildStdTable() and useStdSize()

**Files:**
- Modify: `index.html` (lines ~1664–1715, `buildStdTable` and `useStdSize` functions)

**Step 1: Update buildStdTable()**

Find (line ~1667):
```js
const est = estPickets(s.l,s.w,s.h);
```

Replace with:
```js
const est = s.pickets || estPickets(s.l,s.w,s.h);
```

**Step 2: Update useStdSize()**

The function signature is `function useStdSize(l,w,h,price)`.

Find the line that pre-fills the picket count (line ~1688):
```js
document.getElementById('qPickets').value=estPickets(l,w,h);
```

Replace with:
```js
const _s=STANDARD_SIZES.find(s=>s.l===l&&s.w===w&&s.h===h);
document.getElementById('qPickets').value=(_s&&_s.pickets)?_s.pickets:estPickets(l,w,h);
```

Also check `onDimChange()` (line ~1708) — it has a similar line:
```js
if (!document.getElementById('qPickets').value) document.getElementById('qPickets').value = estPickets(l,w,h);
```
This one should stay using `estPickets` — it handles custom dimension input, not a standard size click.

**Commit:**
```bash
git add index.html
git commit -m "feat: use hardcoded picket counts in standard sizes table and size selector"
```
