# Material Cost Update Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Update all material unit costs in `index.html` to reflect actual Lowes prices with 8.25% Oceanside sales tax applied.

**Architecture:** Nine targeted string replacements in a single file — one JS constant, five HTML text nodes, three input default values. No logic changes.

**Tech Stack:** Vanilla HTML/CSS/JS, single `index.html`, no build step.

---

### Task 1: Update UNIT_COSTS constant and all cost references

**Files:**
- Modify: `index.html`

**New values (base price × 1.0825, rounded to cents):**
- Pickets: $3.38 → **$3.66**
- 2×2: $2.98 → **$3.23**
- 2×4: $3.85 → **$4.17**

**Step 1: Update the JS constant**

Find (line ~1482):
```js
const UNIT_COSTS = {pickets:3.65, twobytwo:4.50, twobyfour:5.50};
```

Replace with:
```js
const UNIT_COSTS = {pickets:3.66, twobytwo:3.23, twobyfour:4.17};
```

**Step 2: Update quote page description text**

Find (line ~978):
```html
<p>Price = pickets × $10. Material cost = pickets × $3.65.</p>
```

Replace with:
```html
<p>Price = pickets × $10. Material cost = pickets × $3.66.</p>
```

**Step 3: Update stock card — pickets**

Find (line ~1110):
```html
<div class="stock-meta">on hand · $3.65 each</div>
```

Replace with:
```html
<div class="stock-meta">on hand · $3.66 each</div>
```

**Step 4: Update stock card — 2×2**

Find (line ~1121):
```html
<div class="stock-meta">on hand · $4.50 each</div>
```

Replace with:
```html
<div class="stock-meta">on hand · $3.23 each</div>
```

**Step 5: Update stock card — 2×4**

Find (line ~1132):
```html
<div class="stock-meta">on hand · $5.50 each</div>
```

Replace with:
```html
<div class="stock-meta">on hand · $4.17 each</div>
```

**Step 6: Update purchase modal picket price default**

Find (line ~1314):
```html
<input class="form-control" type="number" id="pPP" value="3.65" step="0.01" oninput="updatePurchEst()">
```

Replace `value="3.65"` with `value="3.66"`.

**Step 7: Update vertical style 2×2 cost input default**

In the quote calculator's vertical style section, find the 2×2 cost input (id `q22c`). It has a default/placeholder value of `4.50`. Update to `3.23`.

**Step 8: Update vertical style 2×4 cost input default**

In the quote calculator's vertical style section, find the 2×4 cost input (id `q24c`). It has a default/placeholder value of `5.50`. Update to `4.17`.

**Step 9: Commit**

```bash
git add index.html
git commit -m "fix: update material unit costs to actual Lowes prices + 8.25% tax"
```
