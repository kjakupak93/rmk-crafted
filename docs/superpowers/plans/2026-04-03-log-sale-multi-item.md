# Log a Sale — Multi-Item Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the Log a Sale modal to support multi-item rows with product options and editable add-on pricing, matching the Create Order modal's capabilities.

**Architecture:** Refactor the existing item-row and addon helper functions to accept optional container/list IDs (defaulting to order modal IDs so zero order modal breakage), then wire the sale modal to use those same shared functions. Add a `sales.items` JSONB column for multi-item storage.

**Tech Stack:** Vanilla JS, HTML, Supabase (PostgreSQL via MCP), single `index.html` file.

---

## Task 1: DB Migration — Add `items` column to `sales`

**Files:**
- Supabase: run migration via MCP tool

- [ ] **Step 1: Run the migration**

Using the Supabase MCP tool, execute:
```sql
ALTER TABLE sales ADD COLUMN items JSONB;
```

- [ ] **Step 2: Verify the column exists**

```sql
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'sales' AND column_name = 'items';
```
Expected: one row — `items | jsonb`

- [ ] **Step 3: Commit**

```bash
git commit --allow-empty -m "feat: add items JSONB column to sales table (Supabase migration)"
```

---

## Task 2: Refactor Shared Item-Row Functions

**Files:**
- Modify: `index.html` — functions `addOrderItem` (~line 4101), `getOrderItems` (~line 4191), `removeOrderItem` (~line 4164), `updateRemoveButtons` (~line 4172), `updateOrderTotal` (~line 4179)

These functions currently hardcode `oItemsContainer`. We add container awareness so the sale modal can reuse them.

- [ ] **Step 1: Add `updateSaleTotal` function**

Insert this new function immediately after `updateOrderTotal` (~line 4188):

```javascript
function updateSaleTotal() {
  const rows = document.querySelectorAll('#sItemsContainer .order-item-row');
  let total = 0;
  rows.forEach(row => {
    const qty = parseInt(row.querySelector('.item-qty').value) || 1;
    const price = parseFloat(row.querySelector('.item-price').value) || 0;
    total += qty * price;
  });
  total += getAddonTotalFromOrder('sAddonList');
  const totalEl = document.getElementById('sItemsTotal');
  if (totalEl) totalEl.textContent = '$' + total.toFixed(0);
  const priceEl = document.getElementById('sPrice');
  if (priceEl) priceEl.value = total > 0 ? total.toFixed(0) : '';
}
```

- [ ] **Step 2: Add `onSaleItemProductChange` function**

Insert immediately after `onOrderItemProductChange` (~line 4163):

```javascript
function onSaleItemProductChange(selectEl) {
  const row = selectEl.closest('.order-item-row');
  const optsDiv = row ? row.querySelector('.item-options') : null;
  renderProductOptionSelects(selectEl.value, {}, optsDiv);
  updateSaleTotal();
}
```

- [ ] **Step 3: Refactor `addOrderItem` to accept `containerId`**

Replace the existing `addOrderItem` function (~lines 4101-4156) with:

```javascript
function addOrderItem(size='', style='Standard', qty=1, price='', savedOptions=null, containerId='oItemsContainer') {
  const isSale = containerId === 'sItemsContainer';
  const totalFn = isSale ? 'updateSaleTotal()' : 'updateOrderTotal()';
  const container = document.getElementById(containerId);
  const row = document.createElement('div');
  row.className = 'order-item-row';
  const controls = document.createElement('div');
  controls.className = 'item-controls';
  const sizeInp = document.createElement('input');
  sizeInp.className = 'form-control item-size';
  sizeInp.type = 'text';
  sizeInp.placeholder = '36x16x16';
  sizeInp.value = size;
  sizeInp.setAttribute('oninput', totalFn);
  const prodSel = document.createElement('select');
  prodSel.className = 'form-control item-product';
  PRODUCT_TYPES.forEach(s => {
    const o = document.createElement('option');
    o.value = s;
    o.textContent = s;
    if (s === style) o.selected = true;
    prodSel.appendChild(o);
  });
  prodSel.setAttribute('onchange', isSale ? 'onSaleItemProductChange(this)' : 'onOrderItemProductChange(this)');
  const qtyInp = document.createElement('input');
  qtyInp.className = 'form-control item-qty';
  qtyInp.type = 'number';
  qtyInp.min = '1';
  qtyInp.value = qty;
  qtyInp.placeholder = '1';
  qtyInp.setAttribute('oninput', totalFn);
  const priceInp = document.createElement('input');
  priceInp.className = 'form-control item-price';
  priceInp.type = 'number';
  priceInp.min = '0';
  priceInp.value = price;
  priceInp.placeholder = '$';
  priceInp.setAttribute('oninput', totalFn);
  const delBtn = document.createElement('button');
  delBtn.type = 'button';
  delBtn.className = 'icon-btn';
  delBtn.setAttribute('onclick', 'removeOrderItem(this)');
  delBtn.title = 'Remove item';
  delBtn.textContent = 'X';
  controls.appendChild(sizeInp);
  controls.appendChild(prodSel);
  controls.appendChild(qtyInp);
  controls.appendChild(priceInp);
  controls.appendChild(delBtn);
  const optsDiv = document.createElement('div');
  optsDiv.className = 'item-options';
  row.appendChild(controls);
  row.appendChild(optsDiv);
  container.appendChild(row);
  renderProductOptionSelects(style, savedOptions || {}, optsDiv);
  updateRemoveButtons(containerId);
  if (isSale) updateSaleTotal(); else updateOrderTotal();
}
```

- [ ] **Step 4: Refactor `getOrderItems` to accept `containerId`**

Replace the existing `getOrderItems` function (~lines 4191-4204) with:

```javascript
function getOrderItems(containerId='oItemsContainer') {
  const rows = document.querySelectorAll('#' + containerId + ' .order-item-row');
  return Array.from(rows).map(row => {
    const item = {
      size: row.querySelector('.item-size').value.trim(),
      style: row.querySelector('.item-product').value,
      qty: parseInt(row.querySelector('.item-qty').value) || 1,
      price: parseFloat(row.querySelector('.item-price').value) || 0
    };
    const opts = readProductOptionSelects(row.querySelector('.item-options'));
    if (opts) item.options = opts;
    return item;
  });
}
```

- [ ] **Step 5: Refactor `removeOrderItem` to detect its own container**

Replace `removeOrderItem` (~lines 4164-4170) with:

```javascript
function removeOrderItem(btn) {
  const container = btn.closest('.order-items');
  if (!container || container.children.length <= 1) return;
  btn.closest('.order-item-row').remove();
  updateRemoveButtons(container.id);
  if (container.id === 'sItemsContainer') updateSaleTotal(); else updateOrderTotal();
}
```

- [ ] **Step 6: Refactor `updateRemoveButtons` to accept `containerId`**

Replace `updateRemoveButtons` (~lines 4172-4177) with:

```javascript
function updateRemoveButtons(containerId='oItemsContainer') {
  const rows = document.querySelectorAll('#' + containerId + ' .order-item-row');
  rows.forEach(row => {
    row.querySelector('.icon-btn').style.visibility = rows.length > 1 ? '' : 'hidden';
  });
}
```

- [ ] **Step 7: Verify order modal still works**

Open the app in a browser, navigate to Orders, open New Order. Confirm:
- Items rows add/remove correctly
- Product dropdown and options work
- Running total updates on qty/price change

- [ ] **Step 8: Commit**

```bash
git add index.html
git commit -m "refactor: make item-row functions container-aware for sale modal reuse"
```

---

## Task 3: Refactor Shared Addon Functions

**Files:**
- Modify: `index.html` — functions `populateAddonSelect` (~line 2404), `appendOrderAddonRow` (~line 2412), `renderOrderAddons` (~line 2470), `addOrderAddon` (~line 2452), `onAddonSelectChange` (~line 2440), `getAddonTotalFromOrder` (~line 3634)

- [ ] **Step 1: Refactor `populateAddonSelect` to accept `selectId`**

Replace the function (~lines 2404-2411) with:

```javascript
function populateAddonSelect(selectId='oAddonSelect') {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  const prev = sel.value;
  sel.innerHTML = '<option value="">— Select add-on —</option>' +
    ADDONS.map(a => '<option value="' + esc(a.id) + '">' + esc(a.label) + '</option>').join('');
  if (prev && ADDONS.some(a => a.id === prev)) sel.value = prev;
}
```

Note: `sel.innerHTML` here is safe — content is constructed from `esc()`-escaped values, not raw user input.

- [ ] **Step 2: Refactor `appendOrderAddonRow` to accept `listId` and `totalFn`**

Replace the function (~lines 2412-2439) with:

```javascript
function appendOrderAddonRow(id, label, price, listId='orderAddonList', totalFn=updateOrderTotal) {
  const container = document.getElementById(listId);
  if (!container) return;
  const row = document.createElement('div');
  row.className = 'addon-row';
  row.dataset.id = id;
  const nameSpan = document.createElement('span');
  nameSpan.style.cssText = 'flex:1;font-size:13px;font-weight:500';
  nameSpan.textContent = label;
  const priceInput = document.createElement('input');
  priceInput.type = 'number';
  priceInput.min = '0';
  priceInput.value = price;
  priceInput.className = 'form-control';
  priceInput.style.cssText = "width:80px;font-family:'DM Mono',monospace;font-size:13px;text-align:right";
  priceInput.addEventListener('input', totalFn);
  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'icon-btn';
  removeBtn.style.color = 'var(--red)';
  removeBtn.title = 'Remove';
  removeBtn.textContent = 'x';
  removeBtn.addEventListener('click', () => { row.remove(); totalFn(); });
  row.appendChild(nameSpan);
  row.appendChild(priceInput);
  row.appendChild(removeBtn);
  container.appendChild(row);
}
```

- [ ] **Step 3: Refactor `onAddonSelectChange` to accept params**

Replace the function (~lines 2440-2451) with:

```javascript
function onAddonSelectChange(selectId='oAddonSelect', priceId='oAddonPrice', containerId='oItemsContainer') {
  const sel = document.getElementById(selectId);
  const priceIn = document.getElementById(priceId);
  if (!sel || !priceIn) return;
  const id = sel.value;
  if (!id) { priceIn.value = ''; return; }
  const addon = ADDONS.find(a => a.id === id);
  if (!addon) { priceIn.value = ''; return; }
  const firstSizeEl = document.querySelector('#' + containerId + ' .order-item-row .item-size');
  const dims = firstSizeEl ? parseSizeDims(firstSizeEl.value) : {l:16,w:16,h:16};
  priceIn.value = addonPrice(addon.id, dims.l, dims.w, dims.h);
}
```

- [ ] **Step 4: Update the order modal addon select onchange attribute**

In the order modal HTML (~line 1901), change:
```
onchange="onAddonSelectChange()"
```
to:
```
onchange="onAddonSelectChange('oAddonSelect','oAddonPrice','oItemsContainer')"
```

- [ ] **Step 5: Refactor `addOrderAddon` to accept params**

Replace the function (~lines 2452-2469) with:

```javascript
function addOrderAddon(listId='orderAddonList', selectId='oAddonSelect', priceId='oAddonPrice', containerId='oItemsContainer') {
  const sel = document.getElementById(selectId);
  const priceIn = document.getElementById(priceId);
  const id = sel ? sel.value : '';
  if (!id) return;
  const addon = ADDONS.find(a => a.id === id);
  if (!addon) return;
  if (document.querySelector('#' + listId + ' [data-id="' + id + '"]')) {
    showToast('Already added', 'error'); return;
  }
  const firstSizeEl = document.querySelector('#' + containerId + ' .order-item-row .item-size');
  const dims = firstSizeEl ? parseSizeDims(firstSizeEl.value) : {l:16,w:16,h:16};
  const price = priceIn && priceIn.value !== '' ? (parseFloat(priceIn.value) || 0) : addonPrice(addon.id, dims.l, dims.w, dims.h);
  const totalFn = listId === 'sAddonList' ? updateSaleTotal : updateOrderTotal;
  appendOrderAddonRow(id, addon.label, price, listId, totalFn);
  sel.value = '';
  if (priceIn) priceIn.value = '';
  if (listId === 'sAddonList') updateSaleTotal(); else updateOrderTotal();
}
```

- [ ] **Step 6: Update the order modal Add addon button onclick**

In the order modal HTML (~line 1903), change:
```
onclick="addOrderAddon()"
```
to:
```
onclick="addOrderAddon('orderAddonList','oAddonSelect','oAddonPrice','oItemsContainer')"
```

- [ ] **Step 7: Refactor `getAddonTotalFromOrder` to accept `listId`**

Replace the function (~lines 3634-3641) with:

```javascript
function getAddonTotalFromOrder(listId='orderAddonList') {
  let total = 0;
  document.querySelectorAll('#' + listId + ' .addon-row').forEach(row => {
    const priceIn = row.querySelector('input[type="number"]');
    total += parseFloat(priceIn?.value) || 0;
  });
  return total;
}
```

- [ ] **Step 8: Refactor `renderOrderAddons` to accept `listId` and `containerId`**

Replace the function (~lines 2470-2485) with:

```javascript
function renderOrderAddons(savedIds, savedPrices, listId='orderAddonList', containerId='oItemsContainer') {
  savedIds = savedIds || [];
  savedPrices = savedPrices || {};
  const selectId = listId === 'sAddonList' ? 'sAddonSelect' : 'oAddonSelect';
  populateAddonSelect(selectId);
  const container = document.getElementById(listId);
  if (!container) return;
  container.innerHTML = '';
  const firstSizeEl = document.querySelector('#' + containerId + ' .order-item-row .item-size');
  const dims = firstSizeEl ? parseSizeDims(firstSizeEl.value) : {l:16,w:16,h:16};
  const totalFn = listId === 'sAddonList' ? updateSaleTotal : updateOrderTotal;
  savedIds.forEach(id => {
    const addon = ADDONS.find(a => a.id === id);
    const label = addon ? addon.label : '(custom add-on)';
    const price = savedPrices[id] !== undefined ? savedPrices[id] : (addon ? addonPrice(id, dims.l, dims.w, dims.h) : 0);
    appendOrderAddonRow(id, label, price, listId, totalFn);
  });
}
```

- [ ] **Step 9: Verify order modal add-ons still work**

Open the app, open New Order, add an add-on via the dropdown. Confirm:
- Price auto-populates on select
- Add button adds the addon row with editable price
- Remove button works
- Total updates

- [ ] **Step 10: Commit**

```bash
git add index.html
git commit -m "refactor: make addon functions container-aware for sale modal reuse"
```

---

## Task 4: Update Sale Modal HTML

**Files:**
- Modify: `index.html` — the `#saleModal` div (~lines 1950-1977)

- [ ] **Step 1: Replace the sale modal HTML**

Replace the entire `<div class="modal-overlay" id="saleModal">...</div>` block (~lines 1950-1977) with:

```html
<div class="modal-overlay" id="saleModal">
  <div class="modal">
    <h2 id="saleModalTitle">Log a Sale</h2>
    <div class="form-row">
      <div class="form-group"><label>Buyer Name</label><input class="form-control" type="text" id="sName" placeholder="Jane Smith"></div>
      <div class="form-group"><label>Date Sold</label><input class="form-control" type="date" id="sDate"></div>
    </div>
    <div class="form-group">
      <label>Items <span style="font-size:11px;color:var(--text-muted);font-weight:400">(Size · Style · Qty · Price)</span></label>
      <div id="sItemsContainer" class="order-items"></div>
      <button type="button" class="btn-secondary" style="font-size:12px;padding:5px 10px;margin-top:2px" onclick="addOrderItem('','Standard',1,'',null,'sItemsContainer')">+ Add Item</button>
      <div class="order-items-total">Total: <strong id="sItemsTotal">$0</strong></div>
    </div>
    <div class="form-group">
      <label>Add-ons <span style="font-size:11px;color:var(--text-muted);font-weight:400">(optional)</span></label>
      <div style="display:flex;gap:6px;align-items:center">
        <select class="form-control" id="sAddonSelect" style="flex:1" onchange="onAddonSelectChange('sAddonSelect','sAddonPrice','sItemsContainer')"><option value="">— Select add-on —</option></select>
        <input type="number" class="form-control" id="sAddonPrice" min="0" step="0.01" placeholder="$" style="width:72px;font-family:'DM Mono',monospace;font-size:13px;text-align:right;flex-shrink:0">
        <button type="button" class="btn-secondary" style="padding:6px 12px;white-space:nowrap;flex-shrink:0" onclick="addOrderAddon('sAddonList','sAddonSelect','sAddonPrice','sItemsContainer')">+ Add</button>
      </div>
      <div id="sAddonList" style="margin-top:6px"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Sale Price ($)</label><input class="form-control" type="number" id="sPrice" placeholder="85"></div>
      <div class="form-group"><label>Payment</label><select class="form-control" id="sPayment" onchange="document.getElementById('sVenmoFeeWrap').style.display=this.value==='venmo'?'block':'none'"><option value="cash">Cash</option><option value="venmo">Venmo</option></select></div>
    </div>
    <div class="form-group" id="sVenmoFeeWrap" style="display:none"><label>Venmo Fee ($)</label><input class="form-control" type="number" id="sVenmoFee" placeholder="0" min="0" step="0.01"></div>
    <div class="form-group"><label>Notes</label><input class="form-control" type="text" id="sNotes" placeholder="Optional"></div>
    <div class="modal-actions">
      <button class="modal-btn-cancel" onclick="closeModal('saleModal')">Cancel</button>
      <button class="modal-btn-primary" onclick="saveSale()">Log Sale</button>
    </div>
  </div>
</div>
```

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "feat: replace sale modal static fields with multi-item rows and addon picker"
```

---

## Task 5: Update `openSaleModal`, `editSale`, and `saveSale`

**Files:**
- Modify: `index.html` — functions `openSaleModal` (~line 4376), `editSale` (~line 4391), `saveSale` (~line 4412)

- [ ] **Step 1: Replace `openSaleModal`**

Replace the function (~lines 4376-4389) with:

```javascript
function openSaleModal() {
  editingSaleId = null;
  document.getElementById('saleModalTitle').textContent = 'Log a Sale';
  document.getElementById('sDate').value = new Date().toISOString().split('T')[0];
  ['sName','sNotes','sPrice'].forEach(f => document.getElementById(f).value = '');
  document.getElementById('sPayment').value = 'cash';
  document.getElementById('sVenmoFee').value = '';
  document.getElementById('sVenmoFeeWrap').style.display = 'none';
  document.getElementById('sItemsContainer').innerHTML = '';
  document.getElementById('sItemsTotal').textContent = '$0';
  addOrderItem('', 'Standard', 1, '', null, 'sItemsContainer');
  renderOrderAddons([], {}, 'sAddonList', 'sItemsContainer');
  openModal('saleModal');
}
```

- [ ] **Step 2: Replace `editSale`**

Replace the function (~lines 4391-4410) with:

```javascript
function editSale(id) {
  const s = allSales.find(x => x.id === id);
  if (!s) return;
  editingSaleId = id;
  document.getElementById('saleModalTitle').textContent = 'Edit Sale';
  document.getElementById('sName').value = s.name || '';
  document.getElementById('sDate').value = s.sale_date || '';
  document.getElementById('sPrice').value = s.price || '';
  document.getElementById('sPayment').value = s.payment || 'cash';
  const _svf = s.venmo_fee || 0;
  document.getElementById('sVenmoFeeWrap').style.display = s.payment === 'venmo' ? 'block' : 'none';
  document.getElementById('sVenmoFee').value = _svf > 0 ? _svf : '';
  document.getElementById('sNotes').value = s.notes || '';
  document.getElementById('sItemsContainer').innerHTML = '';
  document.getElementById('sItemsTotal').textContent = '$0';
  if (s.items && s.items.rows && s.items.rows.length) {
    s.items.rows.forEach(row => addOrderItem(row.size, row.style, row.qty, row.price, row.options || null, 'sItemsContainer'));
  } else {
    addOrderItem(s.size || '', s.style || 'Standard', s.qty || 1, s.price || '', null, 'sItemsContainer');
  }
  const savedIds = (s.add_ons || []).map(a => a.id);
  const savedPrices = {};
  (s.add_ons || []).forEach(a => { if (a.price !== undefined) savedPrices[a.id] = a.price; });
  renderOrderAddons(savedIds, savedPrices, 'sAddonList', 'sItemsContainer');
  openModal('saleModal');
}
```

- [ ] **Step 3: Replace `saveSale`**

Replace the function (~lines 4412-4427) with:

```javascript
async function saveSale() {
  const _spmt = document.getElementById('sPayment').value;
  const itemRows = getOrderItems('sItemsContainer');
  if (!itemRows.length || !itemRows[0].size) { showToast('At least one item with a size is required', 'error'); return; }
  const saleAddons = [];
  document.querySelectorAll('#sAddonList .addon-row').forEach(row => {
    const id = row.dataset.id;
    const addon = ADDONS.find(a => a.id === id);
    const priceIn = row.querySelector('input[type="number"]');
    if (addon) saleAddons.push({ id: addon.id, label: addon.label, price: parseFloat(priceIn?.value) || 0 });
  });
  const payload = {
    name: document.getElementById('sName').value,
    size: itemRows[0].size,
    style: itemRows[0].style,
    qty: itemRows[0].qty,
    items: { rows: itemRows },
    price: parseFloat(document.getElementById('sPrice').value) || 0,
    payment: _spmt,
    venmo_fee: _spmt === 'venmo' ? (parseFloat(document.getElementById('sVenmoFee').value) || 0) : 0,
    sale_date: document.getElementById('sDate').value,
    notes: document.getElementById('sNotes').value,
    add_ons: saleAddons.length ? saleAddons : null,
    product_options: itemRows[0].options || null
  };
  if (!payload.price) { showToast('Price required', 'error'); return; }
  if (editingSaleId) {
    const { error } = await sb.from('sales').update(payload).eq('id', editingSaleId);
    if (error) { showToast('Error saving', 'error'); return; }
    showToast('Sale updated!', 'success');
  } else {
    const { error } = await sb.from('sales').insert(payload);
    if (error) { showToast('Error saving', 'error'); return; }
    showToast('Sale logged!', 'success');
  }
  closeModal('saleModal'); loadSales();
}
```

- [ ] **Step 4: Verify full flow**

Open the app and test:
1. Click "Log a Sale" — modal opens with one blank item row and addon picker
2. Fill in buyer name, set item size to `48x16x16`, product `Standard`, qty `1`, price `85` — Sale Price auto-fills to `85`
3. Click `+ Add Item` — add a second row with size `36x16x16`, qty `1`, price `60` — Sale Price updates to `145`
4. Add an add-on — Sale Price includes it
5. Override Sale Price to `150` manually — value stays
6. Set payment to Cash, click Log Sale — toast "Sale logged!"
7. Check Sales History — new entry shows correctly
8. Click edit on that sale — modal reopens with both item rows
9. Open New Order — confirm order modal is completely unchanged

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat: upgrade Log a Sale to multi-item rows with product options and editable add-ons"
```

---

## Task 6: Push and Verify Deployment

- [ ] **Step 1: Push to GitHub**

```bash
git push origin main
```

- [ ] **Step 2: Verify on live site**

Open the GitHub Pages URL. Confirm Log a Sale works end-to-end on the deployed version.
