# Cut List Margin Display Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After hitting Calculate on the cut list, show material cost, an editable price field (pre-filled with $10/picket suggested price), and a live-updating margin % badge.

**Architecture:** Add a `#cl-margin-bar` div inside `#cl-results` (between the diagram and parts table). `runCutList()` populates it after computing board counts. A small `updateClMargin()` function recalculates the margin badge live when the price input changes.

**Tech Stack:** Vanilla JS, single `index.html`

---

### Task 1: Add margin bar HTML slot inside `#cl-results`

**Files:**
- Modify: `index.html` (HTML section, ~line 1837)

- [ ] **Step 1: Locate the `#cl-results` div**

Around line 1837:
```html
<div id="cl-results" style="display:none">
  <div id="cl-diagram"></div>
  <div id="cl-parts-table" style="margin-top:20px"></div>
</div>
```

- [ ] **Step 2: Add the `#cl-margin-bar` div between diagram and parts table**

Replace the `#cl-results` block with:
```html
<div id="cl-results" style="display:none">
  <div id="cl-diagram"></div>
  <div id="cl-margin-bar" style="margin-top:16px"></div>
  <div id="cl-parts-table" style="margin-top:20px"></div>
</div>
```

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add #cl-margin-bar slot to cut list results"
```

---

### Task 2: Populate the margin bar after Calculate

**Files:**
- Modify: `index.html` (JS section, `runCutList()` function, ~line 5418)

All values interpolated into innerHTML below are computed numbers only (no user strings) — XSS is not a concern.

- [ ] **Step 1: Locate the end of the diagram-rendering loop in `runCutList()`**

After the `clStockTypes.forEach(...)` loop closes (~line 5416) and just before the `_quoteBtn` enable line (~line 5418), insert a call to `renderClMarginBar()`.

Add the call:
```js
  renderClMarginBar();
```

- [ ] **Step 2: Add `renderClMarginBar()` and `updateClMargin()` immediately after `runCutList()` closes (~line 5444)**

```js
function renderClMarginBar() {
  const picketStock    = clStockTypes.find(s => /picket/i.test(s.shortName || s.name));
  const twobytwoStock  = clStockTypes.find(s => /2.?x.?2|twobytwo/i.test(s.shortName || s.name));
  const twobyfourStock = clStockTypes.find(s => /2.?x.?4|twobyfour/i.test(s.shortName || s.name));
  const picketCount    = picketStock    ? (clLastRunBoardCounts[picketStock.id]    ?? 0) : 0;
  const twobytwoCount  = twobytwoStock  ? (clLastRunBoardCounts[twobytwoStock.id]  ?? 0) : 0;
  const twobyfourCount = twobyfourStock ? (clLastRunBoardCounts[twobyfourStock.id] ?? 0) : 0;
  const cost           = (picketCount * UNIT_COSTS.pickets)
                       + (twobytwoCount * UNIT_COSTS.twobytwo)
                       + (twobyfourCount * UNIT_COSTS.twobyfour);
  const suggestedPrice = picketCount * PICKET_PRICE_PER_UNIT;

  // All interpolated values are numbers — no XSS risk
  const bar = document.getElementById('cl-margin-bar');
  bar.innerHTML = `
    <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;padding:12px 14px;background:var(--bg-elevated,#f0ebe3);border-radius:8px;border:1px solid var(--warm-gray)">
      <div style="display:flex;flex-direction:column;gap:2px">
        <span style="font-size:10px;text-transform:uppercase;letter-spacing:0.7px;color:var(--text-muted);font-weight:600">Mat. Cost</span>
        <span style="font-size:15px;font-weight:700;font-family:'DM Mono',monospace;color:var(--text)">$${cost.toFixed(2)}</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:2px">
        <span style="font-size:10px;text-transform:uppercase;letter-spacing:0.7px;color:var(--text-muted);font-weight:600">Price</span>
        <div style="display:flex;align-items:center;gap:4px">
          <span style="font-size:15px;font-weight:700;font-family:'DM Mono',monospace;color:var(--text)">$</span>
          <input id="cl-margin-price" type="number" min="0" step="1"
            value="${suggestedPrice}"
            oninput="updateClMargin(${cost.toFixed(4)})"
            style="width:72px;padding:2px 6px;border:1px solid var(--warm-gray);border-radius:4px;font-size:15px;font-weight:700;font-family:'DM Mono',monospace;background:transparent;color:var(--text)">
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:2px">
        <span style="font-size:10px;text-transform:uppercase;letter-spacing:0.7px;color:var(--text-muted);font-weight:600">Margin</span>
        <span id="cl-margin-pct" style="font-size:15px;font-weight:700;font-family:'DM Mono',monospace"></span>
      </div>
    </div>`;
  updateClMargin(cost);
}

function updateClMargin(cost) {
  const priceEl = document.getElementById('cl-margin-price');
  const pctEl   = document.getElementById('cl-margin-pct');
  if (!priceEl || !pctEl) return;
  const price = parseFloat(priceEl.value) || 0;
  if (price <= 0) { pctEl.textContent = '—'; pctEl.style.color = 'var(--text-muted)'; return; }
  const margin = Math.round((price - cost) / price * 100);
  pctEl.textContent = margin + '%';
  pctEl.style.color = margin >= 50 ? 'var(--green)' : margin >= 30 ? 'var(--orange)' : 'var(--red)';
}
```

- [ ] **Step 3: Verify the math manually**

For 6 pickets, 0 others:
- Cost = 6 x 3.66 = $21.96
- Suggested price = 6 x $10 = $60
- Margin = (60 - 21.96) / 60 x 100 = 63% (green) 

- [ ] **Step 4: Open the app in a browser, navigate to Materials > Cut List, add a few rows, and hit Calculate**

Expected:
- Margin bar appears between the board diagram and parts list
- Shows Mat. Cost / Price input (pre-filled) / Margin %
- Editing the price input updates the margin % live
- Margin color: green >= 50%, orange >= 30%, red < 30%

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat: show mat cost, editable price, and live margin pct on cut list calculate"
```

---

### Task 3: Mobile styling check

**Files:**
- Modify: `index.html` (CSS section, `@media (max-width: 640px)` block)

- [ ] **Step 1: Add iOS font-size fix for the price input**

Find the `@media (max-width: 640px)` block. Add inside it:

```css
#cl-margin-price { font-size: 16px !important; }
```

This prevents iOS Safari from auto-zooming on focus (project rule: all inputs must be >= 16px on mobile).

- [ ] **Step 2: Verify on narrow viewport**

The margin bar uses `flex-wrap:wrap` so the three items (cost / price / margin) stack to two rows on small screens without overflow.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "fix: iOS font-size fix for cl-margin-price input"
```
