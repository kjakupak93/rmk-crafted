import { test, expect, Page } from '@playwright/test';
import { login } from '../helpers/auth';
import { cleanupTestData } from './helpers/cleanup';

test.describe.configure({ mode: 'serial' });

const TAG = `[TEST] ${Date.now()}`;

async function goToInventoryTab(page: Page) {
  await login(page);
  await page.click('#sb-orders');
  await page.waitForSelector('#page-orders.active');
  await page.click('#orders-tabs button:has-text("Ready to Sell")');
  await page.waitForSelector('#otab-inventory', { state: 'visible' });
}

async function goToSalesTab(page: Page) {
  await login(page);
  await page.click('#sb-orders');
  await page.waitForSelector('#page-orders.active');
  await page.click('#orders-tabs button:has-text("Sales History")');
  await page.waitForSelector('#otab-sales', { state: 'visible' });
}

async function addInventoryItem(
  page: Page,
  opts: { size: string; price: string; qty: string; notes: string },
): Promise<void> {
  await page.click('button:has-text("+ Add Item")');
  await page.waitForSelector('#invModal.open');
  await page.fill('#iSize', opts.size);
  await page.fill('#iPrice', opts.price);
  await page.fill('#iQty', opts.qty);
  await page.fill('#iNotes', opts.notes);
  await page.click('button[onclick="saveInvItem()"]');
  // Filter by notes (contains TAG) not size — size is non-unique across runs
  await expect(page.locator('#invGrid .inv-card').filter({ hasText: opts.notes })).toBeVisible({ timeout: 10000 });
}

async function logSale(page: Page, opts: { name: string; size: string; price: string }): Promise<void> {
  await page.click('button:has-text("+ Log Sale")');
  await page.waitForSelector('#saleModal.open');
  await page.fill('#sName', opts.name);
  await page.fill('#sDate', new Date().toISOString().split('T')[0]);
  await page.fill('#sSize', opts.size);
  await page.fill('#sPrice', opts.price);
  await page.click('button[onclick="saveSale()"]');
  await expect(page.locator('#salesBody tr').filter({ hasText: opts.name })).toBeVisible({ timeout: 10000 });
}

test.beforeAll(async () => {
  await cleanupTestData(['sales', 'inventory']);
});

test.afterAll(async () => {
  await cleanupTestData(['sales', 'inventory']);
});

// ─── Inventory tests ─────────────────────────────────────────────────────────

test('add inventory item appears in Ready to Sell grid', async ({ page }) => {
  await goToInventoryTab(page);
  await addInventoryItem(page, { size: '36×16×16', price: '60', qty: '2', notes: `${TAG} Inv Add` });
  await expect(page.locator('#invGrid .inv-card .inv-size', { hasText: '36×16×16' })).toBeVisible();
});

test('adjust inventory qty increments and decrements the displayed count', async ({ page }) => {
  await goToInventoryTab(page);
  await addInventoryItem(page, { size: '48×16×16', price: '85', qty: '3', notes: `${TAG} Inv Qty` });

  const card = page.locator('#invGrid .inv-card').filter({ hasText: '48×16×16' }).filter({ hasText: `${TAG} Inv Qty` });

  // Click + once → expect 4
  await card.locator('button.qty-btn', { hasText: '+' }).click();
  await expect(card.locator('.qty-num')).toHaveText('4', { timeout: 10000 });

  // Click − twice → expect 2
  await card.locator('button.qty-btn', { hasText: '−' }).click();
  await expect(card.locator('.qty-num')).toHaveText('3', { timeout: 10000 });
  await card.locator('button.qty-btn', { hasText: '−' }).click();
  await expect(card.locator('.qty-num')).toHaveText('2', { timeout: 10000 });
});

test('delete inventory item removes it from the grid', async ({ page }) => {
  await goToInventoryTab(page);
  await addInventoryItem(page, { size: '48×24×16', price: '100', qty: '1', notes: `${TAG} Inv Del` });

  const card = page.locator('#invGrid .inv-card').filter({ hasText: `${TAG} Inv Del` });
  await card.locator('button.icon-btn:has-text("🗑️")').click();
  await page.waitForSelector('#confirmModal', { state: 'visible' });
  await page.click('#confirmOkBtn');

  await expect(page.locator('#invGrid .inv-card').filter({ hasText: `${TAG} Inv Del` })).toHaveCount(0, { timeout: 10000 });
});

test('decrementing qty to zero prompts removal and removes the item', async ({ page }) => {
  await goToInventoryTab(page);
  await addInventoryItem(page, { size: '36×12×16', price: '55', qty: '1', notes: `${TAG} Inv Zero` });

  const card = page.locator('#invGrid .inv-card').filter({ hasText: `${TAG} Inv Zero` });
  await card.locator('button.qty-btn', { hasText: '−' }).click();

  // Custom confirm modal — not native browser dialog
  await page.waitForSelector('#confirmModal', { state: 'visible' });
  await page.click('#confirmOkBtn');

  await expect(page.locator('#invGrid .inv-card').filter({ hasText: `${TAG} Inv Zero` })).toHaveCount(0, { timeout: 10000 });
});

// ─── Sales tests ─────────────────────────────────────────────────────────────

test('log a sale manually appears in Sales History', async ({ page }) => {
  await goToSalesTab(page);
  await logSale(page, { name: `${TAG} Sale`, size: '36×16×16', price: '60' });
  await expect(page.locator('#salesBody tr').filter({ hasText: `${TAG} Sale` })).toBeVisible();
});

test('edit a sale updates the buyer name', async ({ page }) => {
  await goToSalesTab(page);
  const name = `${TAG} EditSale`;
  await logSale(page, { name, size: '48×16×16', price: '85' });

  const row = page.locator('#salesBody tr').filter({ hasText: name });
  await row.locator('button:has-text("✏️")').click();
  await page.waitForSelector('#saleModal.open');
  await expect(page.locator('#saleModalTitle')).toContainText('Edit', { timeout: 5000 });

  await page.fill('#sName', `${name} Updated`);
  await page.click('button[onclick="saveSale()"]');

  await expect(page.locator('#salesBody tr').filter({ hasText: `${name} Updated` })).toBeVisible({ timeout: 10000 });
});

test('delete a sale removes it from the table', async ({ page }) => {
  await goToSalesTab(page);
  const name = `${TAG} DelSale`;
  await logSale(page, { name, size: '36×16×16', price: '60' });

  const row = page.locator('#salesBody tr').filter({ hasText: name });
  // deleteSale uses native confirm() — accept the dialog
  page.once('dialog', dialog => dialog.accept());
  await row.locator('button:has-text("🗑️")').click();

  await expect(page.locator('#salesBody tr').filter({ hasText: name })).toHaveCount(0, { timeout: 10000 });
});

test('log a sale with an add-on shows add-on label and price in sales history', async ({ page }) => {
  await goToSalesTab(page);
  const name = `${TAG} SaleAddon`;
  await page.click('button:has-text("+ Log Sale")');
  await page.waitForSelector('#saleModal.open');
  await page.fill('#sName', name);
  await page.fill('#sDate', new Date().toISOString().split('T')[0]);
  await page.fill('#sSize', '36×16×16');
  await page.fill('#sPrice', '80');
  // Click the first available add-on pill (hidden checkbox inside)
  await page.click('#saleAddonList .addon-pill:first-of-type');
  await page.click('button[onclick="saveSale()"]');
  const row = page.locator('#salesBody tr').filter({ hasText: name });
  await expect(row).toBeVisible({ timeout: 10000 });
  // Add-on label renders inside the size cell (td index 1)
  await expect(row.locator('td').nth(1)).toContainText('✨');
});

test('add-on row preserved in edit modal when ADDONS not in localStorage', async ({ page }) => {
  await goToSalesTab(page);
  // First log a sale with an add-on so we have a record to edit
  const name = `${TAG} AddonResilience`;
  await page.click('button:has-text("+ Log Sale")');
  await page.waitForSelector('#saleModal.open');
  await page.fill('#sName', name);
  await page.fill('#sDate', new Date().toISOString().split('T')[0]);
  await page.fill('#sSize', '36×16×16');
  await page.fill('#sPrice', '80');
  await page.click('#saleAddonList .addon-pill:first-of-type');
  await page.click('button[onclick="saveSale()"]');
  await expect(page.locator('#salesBody tr').filter({ hasText: name })).toBeVisible({ timeout: 10000 });

  // Clear ADDONS from localStorage to simulate a fresh session
  await page.evaluate(() => localStorage.removeItem('rmk_addons'));

  // Edit the sale — the add-on row must still be present (not silently dropped)
  const row = page.locator('#salesBody tr').filter({ hasText: name });
  await row.locator('button:has-text("✏️")').click();
  await page.waitForSelector('#saleModal.open');
  // Add-on checkbox area should not be empty
  await expect(page.locator('#saleAddonList')).not.toBeEmpty();
});
