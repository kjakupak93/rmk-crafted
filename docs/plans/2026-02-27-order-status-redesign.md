# Order Status Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add "Completed" as a selectable status, rename "Ready" to "Ready for Pickup", and move orders to the Completed tab only when both status=completed AND payment=cash/venmo — auto-creating a sales record on that transition.

**Architecture:** All changes in `index.html`. Tab split logic changes in `loadOrders()` and `loadHomeStats()`. Sales record auto-creation triggered from both `saveOrder()` (via pre-save state comparison using `currentEditOrder`) and `completeOrder()`. No DB schema changes needed.

**Tech Stack:** Vanilla HTML/CSS/JS, single `index.html`, no build step, Supabase JS client (`sb`).

---

### Task 1: HTML — status dropdown and filter buttons

**Files:**
- Modify: `index.html` (lines ~1048–1053 filter buttons, line ~1248 status select)

**Step 1: Update the status select in the order modal**

Find (line ~1248):
```html
<select class="form-control" id="oStatus"><option value="pending">Pending</option><option value="building">Building</option><option value="ready">Ready</option></select>
```

Replace with:
```html
<select class="form-control" id="oStatus"><option value="pending">Pending</option><option value="building">Building</option><option value="ready">Ready for Pickup</option><option value="completed">Completed</option></select>
```

**Step 2: Update the filter buttons**

Find (line ~1050–1052):
```html
<button class="filter-btn" onclick="filterOrders('pending',this)">Pending</button>
<button class="filter-btn" onclick="filterOrders('building',this)">Building</button>
<button class="filter-btn" onclick="filterOrders('ready',this)">Ready</button>
```

Replace with:
```html
<button class="filter-btn" onclick="filterOrders('pending',this)">Pending</button>
<button class="filter-btn" onclick="filterOrders('building',this)">Building</button>
<button class="filter-btn" onclick="filterOrders('ready',this)">Ready for Pickup</button>
```

**Commit:**
```bash
git add index.html
git commit -m "feat: add Completed status option and rename Ready to Ready for Pickup"
```

---

### Task 2: JS — tab split logic in loadOrders and loadHomeStats

**Files:**
- Modify: `index.html` (lines ~1588, ~1841–1855)

**Context:** Currently both functions split on `status !== 'completed'` / `status === 'completed'`. New rule: completed tab = `status === 'completed' && payment !== 'unpaid'`.

**Step 1: Update `loadHomeStats()`**

Find (line ~1588):
```js
const activeOrders = (ordRes.data||[]).filter(o => o.status !== 'completed');
```

Replace with:
```js
const activeOrders = (ordRes.data||[]).filter(o => !(o.status === 'completed' && o.payment !== 'unpaid'));
```

**Step 2: Update `loadOrders()`**

Find (lines ~1844–1845):
```js
const active = (data||[]).filter(o=>o.status!=='completed');
const completed = (data||[]).filter(o=>o.status==='completed');
```

Replace with:
```js
const active = (data||[]).filter(o=>!(o.status==='completed'&&o.payment!=='unpaid'));
const completed = (data||[]).filter(o=>o.status==='completed'&&o.payment!=='unpaid');
```

**Commit:**
```bash
git add index.html
git commit -m "feat: update active/completed tab split to require both completed status and payment"
```

---

### Task 3: JS — orderCardHTML labels, ✅ button, and completeOrder

**Files:**
- Modify: `index.html` (lines ~1858–1940)

**Step 1: Update label map in `orderCardHTML()`**

Find (line ~1860):
```js
const bl={pending:'Pending',building:'Building',ready:'Ready',completed:'Complete'}[o.status]||o.status;
```

Replace with:
```js
const bl={pending:'Pending',building:'Building',ready:'Ready for Pickup',completed:'Completed'}[o.status]||o.status;
```

**Step 2: Update ✅ button visibility condition**

Find (line ~1878):
```js
${o.status!=='completed'?`<button class="icon-btn" title="Complete" onclick="completeOrder('${o.id}')">✅</button>`:''}
```

Replace with:
```js
${!(o.status==='completed'&&o.payment!=='unpaid')?`<button class="icon-btn" title="Complete" onclick="completeOrder('${o.id}')">✅</button>`:''}
```

**Step 3: Update `completeOrder()`**

Find (lines ~1933–1939):
```js
async function completeOrder(id) {
  const {data}=await sb.from('orders').select('*').eq('id',id).single();
  if (!data) return;
  await sb.from('sales').insert({name:data.name,size:data.size,style:data.style,price:data.price,payment:data.payment==='unpaid'?'cash':data.payment,sale_date:new Date().toISOString().split('T')[0],notes:data.notes});
  await sb.from('orders').update({status:'completed'}).eq('id',id);
  showToast('Order completed & moved to sales! 🎉','success');
  loadOrders(); loadHomeStats();
```

Replace with:
```js
async function completeOrder(id) {
  const {data}=await sb.from('orders').select('*').eq('id',id).single();
  if (!data) return;
  await sb.from('orders').update({status:'completed'}).eq('id',id);
  if (data.payment!=='unpaid') {
    await sb.from('sales').insert({name:data.name,size:data.size,style:data.style,price:data.price,payment:data.payment,sale_date:new Date().toISOString().split('T')[0],notes:data.notes});
    showToast('Order completed & moved to sales! 🎉','success');
  } else {
    showToast('Marked as completed — set payment to move to Completed tab.','success');
  }
  loadOrders(); loadHomeStats();
```

**Commit:**
```bash
git add index.html
git commit -m "feat: update order card labels and complete button for new status logic"
```

---

### Task 4: JS — currentEditOrder state + saveOrder transition detection

**Files:**
- Modify: `index.html` (lines ~1483–1485 module vars, ~1885–1930 openOrderModal/editOrder/saveOrder)

**Step 1: Add module-level variable**

Find the line (near ~1483) where module-level vars are declared (near `let currentPage = 'home';`):
```js
let currentPage = 'home';
```

Add after it:
```js
let currentEditOrder = null;
```

**Step 2: Reset in `openOrderModal()`**

Find the start of `openOrderModal()`. Add `currentEditOrder = null;` as the first line of the function body.

**Step 3: Set in `editOrder()`**

Find inside `editOrder(id)` where `data` is fetched and used. After the line `const {data} = await sb.from('orders').select('*').eq('id',id).single();` (and any null check), add:
```js
currentEditOrder = data;
```

**Step 4: Add transition detection in `saveOrder()`**

Find `saveOrder()`. After the successful save (after `if (error) {...return;}` check), add this block before `showToast(...)`:

```js
const isNowCompletedPaid = payload.status==='completed' && payload.payment!=='unpaid';
const wasCompletedPaid = currentEditOrder && currentEditOrder.status==='completed' && currentEditOrder.payment!=='unpaid';
if (isNowCompletedPaid && !wasCompletedPaid) {
  const saleId = id || (insertData && insertData[0] && insertData[0].id);
  const src = id ? payload : {...payload};
  await sb.from('sales').insert({name:src.name,size:src.size||'',style:src.style||'Standard',price:src.price||0,payment:src.payment,sale_date:new Date().toISOString().split('T')[0],notes:src.notes||''});
}
```

Note: you will need to read the exact structure of `saveOrder()` first to find the right insertion point and variable names. The key is: after a successful upsert, check if the order just became completed+paid for the first time.

**Commit:**
```bash
git add index.html
git commit -m "feat: auto-create sales record when order transitions to completed+paid via edit modal"
```
