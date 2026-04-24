# Add-on Pill Toggles + Completed Order Calendar Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Null out pickup date/time when an order is completed so it never appears on the calendar, and replace bare checkboxes in the Sale and Inventory modals with sleek pill toggles.

**Architecture:** Both changes are isolated edits to `index.html`. The calendar fix is a one-line addition to `_doCompleteOrder`. The pill redesign replaces `_renderAddonCheckboxes` and adds two CSS classes; all upstream callers and downstream save functions remain untouched.

**Tech Stack:** Vanilla JS, CSS custom properties, Supabase JS client (`sb`)

---

### Task 1: Clear pickup date/time on order completion

**Files:**
- Modify: `index.html` — `_doCompleteOrder` function (~line 3995)

- [ ] **Step 1: Locate the function**

Open `index.html`. Find `async function _doCompleteOrder(data, payment)` (~line 3995). The first line is:

```
await sb.from('orders').update({status:'completed'}).eq('id',data.id);
```

- [ ] **Step 2: Add the pickup-clear update**

Replace that first await line with two sequential updates so the function opens like this:

```
async function _doCompleteOrder(data, payment) {
  await sb.from('orders').update({status:'completed'}).eq('id',data.id);
  await sb.from('orders').update({pickup_date:null, pickup_time:null}).eq('id',data.id);
  if (payment!=='unpaid') {
```

- [ ] **Step 3: Manual verification**

1. Open the app in a browser
2. Create a test order with a future pickup date
3. Complete the order (click the checkmark button)
4. Navigate to Scheduler — the order must not appear in Upcoming Pickups or on the calendar
5. In Supabase dashboard, check the orders table — pickup_date and pickup_time should be null for that row

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "fix: null pickup_date and pickup_time when order is completed"
```

---

### Task 2: Add CSS for pill toggle components

**Files:**
- Modify: `index.html` — ADD-ONS CSS block (~line 1295)

- [ ] **Step 1: Locate the add-ons CSS block**

Find this exact text in the style block:

```
/* ===== ADD-ONS ===== */
.addon-row { display:flex; align-items:center; gap:10px; padding:7px 0; border-bottom:1px solid var(--warm-gray); }
.addon-row:last-child { border-bottom:none; }
```

- [ ] **Step 2: Append pill classes after the existing addon-row rules**

The block should become:

```
/* ===== ADD-ONS ===== */
.addon-row { display:flex; align-items:center; gap:10px; padding:7px 0; border-bottom:1px solid var(--warm-gray); }
.addon-row:last-child { border-bottom:none; }
.addon-pills { display:flex; flex-wrap:wrap; gap:8px; margin-top:4px; }
.addon-pill { display:inline-flex; align-items:center; padding:6px 14px; border-radius:20px; border:1px solid var(--warm-gray); background:var(--bg-elevated); color:var(--text-muted); font-size:13px; font-weight:500; cursor:pointer; user-select:none; transition:background 0.15s,color 0.15s,border-color 0.15s; }
.addon-pill:hover { border-color:var(--ocean); color:var(--text); }
.addon-pill.addon-selected { background:var(--navy); color:#fff; border-color:var(--navy); }
.addon-pill input[type="checkbox"] { display:none; }
```

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "style: add addon-pills and addon-pill CSS classes"
```

---

### Task 3: Replace _renderAddonCheckboxes with pill renderer

**Files:**
- Modify: `index.html` — `_renderAddonCheckboxes` function (~line 2461)

- [ ] **Step 1: Locate the function**

Find this block (~lines 2461-2471):

```
function _renderAddonCheckboxes(container, savedIds) {
  savedIds = (savedIds || []).map(a => typeof a === 'string' ? a : a.id);
  if (!ADDONS.length) { container.innerHTML = '<p style="font-size:13px;color:var(--text-muted)">No add-ons configured.</p>'; return; }
  container.innerHTML = ADDONS.map(a =>
    '<div class="addon-row">' +
      '<input type="checkbox" data-id="' + esc(a.id) + '"' + (savedIds.includes(a.id) ? ' checked' : '') +
        ' style="width:16px;height:16px;flex-shrink:0;cursor:pointer">' +
      '<span style="font-size:13px;font-weight:500">' + esc(a.label) + '</span>' +
    '</div>'
  ).join('');
}
```

- [ ] **Step 2: Replace the function body**

Replace the entire function with the pill version. Each pill is a label element containing a hidden checkbox. The onclick handler toggles the addon-selected class and keeps the checkbox checked state in sync — this means saveSale() and saveInvItem() (which query input[type="checkbox"]:checked) continue working without any changes. All user values go through esc() for XSS safety.

```
function _renderAddonCheckboxes(container, savedIds) {
  savedIds = (savedIds || []).map(a => typeof a === 'string' ? a : a.id);
  if (!ADDONS.length) { container.innerHTML = '<p style="font-size:13px;color:var(--text-muted)">No add-ons configured.</p>'; return; }
  container.className = 'addon-pills';
  container.innerHTML = ADDONS.map(a => {
    const sel = savedIds.includes(a.id);
    return '<label class="addon-pill' + (sel ? ' addon-selected' : '') + '" onclick="this.classList.toggle(\'addon-selected\');this.querySelector(\'input\').checked=this.classList.contains(\'addon-selected\')">' +
      '<input type="checkbox" data-id="' + esc(a.id) + '"' + (sel ? ' checked' : '') + '>' +
      esc(a.label) +
    '</label>';
  }).join('');
}
```

- [ ] **Step 3: Manual verification**

1. Open the app, go to Orders > Sales History, click + Log Sale
   - Add-ons section shows pills instead of checkboxes
   - Clicking a pill turns it navy (selected state)
   - Clicking again deselects it
2. Open Orders > Ready to Sell, click + Add Item
   - Same pill behaviour
3. Save a sale with one add-on selected — verify it appears in the sales history table
4. Edit that sale — the previously selected pill should be pre-selected (navy) on re-open

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: replace addon checkboxes with pill toggles in sale and inventory modals"
```

---

### Task 4: Push and confirm deployment

- [ ] **Step 1: Push to main**

```bash
git push origin main
```

- [ ] **Step 2: Confirm GitHub Pages deployment**

Wait ~60 seconds, then open the live URL and verify:
- Completing an order removes it from the Scheduler calendar and Upcoming Pickups
- Sale modal and Inventory modal show pill-style add-ons
