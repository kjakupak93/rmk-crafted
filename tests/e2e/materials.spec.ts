import { test, expect, Page } from '@playwright/test';
import { login } from '../helpers/auth';
import { cleanupTestData, snapshotStock, restoreStock } from './helpers/cleanup';

test.describe.configure({ mode: 'serial' });

const TAG = `[TEST] ${Date.now()}`;

async function goToMaterials(page: Page) {
  await login(page);
  await page.click('.app-tile--mats');
  await page.waitForSelector('#page-materials.active');
}

async function goToProducts(page: Page) {
  await goToMaterials(page);
  await page.click('button:has-text("Products")');
  await page.waitForSelector('#mtab-products.active');
}

async function addPurchase(page: Page, storeName: string): Promise<void> {
  await page.click('button:has-text("Purchases")');
  await page.waitForSelector('#mtab-purchases.active');
  await page.click('button:has-text("+ Log Purchase")');
  await page.waitForSelector('#purchaseModal.open');
  await page.fill('#pStore', storeName);
  // First material row qty (new dropdown-based UI)
  await page.locator('#pMaterialRows .purch-mat-row input[type="number"]').first().fill('5');
  await page.click('#purchSaveBtn');
  await expect(page.locator('#purchaseBody tr').filter({ hasText: storeName })).toBeVisible({ timeout: 10000 });
}

async function addPartAndRunCutList(page: Page, cutListName: string): Promise<void> {
  await page.click('button:has-text("Cut List")');
  await page.waitForSelector('#mtab-cutlist.active');
  await page.fill('#cl-name', cutListName);
  await page.click('button:has-text("+ Add Part")');
  const lastRow = page.locator('#cl-rows tr:last-child');
  await lastRow.locator('[id^="cl-qty-"]').fill('3');
  await lastRow.locator('[id^="cl-len-"]').fill('48');
  await lastRow.locator('[id^="cl-mat-"]').selectOption({ index: 0 });
  await page.click('#mtab-cutlist button:has-text("Calculate")');
  await expect(page.locator('#cl-results')).toBeVisible({ timeout: 10000 });
}

async function confirmDelete(page: Page): Promise<void> {
  // App uses custom confirm modal
  const confirmModal = page.locator('#confirmModal');
  await expect(confirmModal).toBeVisible({ timeout: 5000 });
  await page.click('#confirmOkBtn');
}

let stockSnapshot: { type: string; qty: number }[] = [];

test.beforeAll(async () => {
  await cleanupTestData(['purchases', 'cut_lists']);
  stockSnapshot = await snapshotStock();
});

test.afterAll(async () => {
  await cleanupTestData(['purchases', 'cut_lists']);
  await restoreStock(stockSnapshot);
});

test('add purchase appears in Purchases log', async ({ page }) => {
  await goToMaterials(page);
  const storeName = `${TAG} Store`;
  await addPurchase(page, storeName);
  await expect(page.locator('#purchaseBody tr').filter({ hasText: storeName })).toBeVisible();
});

test('delete purchase removes it from the log', async ({ page }) => {
  await goToMaterials(page);
  const storeName = `${TAG} Del Store`;
  await addPurchase(page, storeName);

  const row = page.locator('#purchaseBody tr').filter({ hasText: storeName });
  await row.locator('button:has-text("🗑️")').click();
  await confirmDelete(page);

  await expect(page.locator('#purchaseBody tr').filter({ hasText: storeName })).toHaveCount(0, { timeout: 10000 });
});

test('running cut list renders board diagram', async ({ page }) => {
  await goToMaterials(page);
  await addPartAndRunCutList(page, `${TAG} Diagram`);
  const barCount = await page.locator('.picket-bar').count();
  expect(barCount).toBeGreaterThan(0);
});

test('save cut list appears in saved list table', async ({ page }) => {
  await goToMaterials(page);
  const cutListName = `${TAG} Saved CL`;
  await addPartAndRunCutList(page, cutListName);
  await page.click('button[onclick="saveCutList()"]');
  await expect(page.locator('#cl-saved-list').locator('tr').filter({ hasText: cutListName })).toBeVisible({ timeout: 10000 });
});

test('stock picket +/- buttons update the displayed count', async ({ page }) => {
  await goToMaterials(page);
  // Stock tab is the default tab — read current count
  const before = parseInt(await page.locator('#sd-pickets').innerText(), 10);

  await page.click('button[onclick="adjustStock(\'pickets\',1)"]');
  await expect(page.locator('#sd-pickets')).toHaveText(String(before + 1), { timeout: 10000 });

  await page.click('button[onclick="adjustStock(\'pickets\',-1)"]');
  await expect(page.locator('#sd-pickets')).toHaveText(String(before), { timeout: 10000 });
});

test('edit purchase updates the store name', async ({ page }) => {
  await goToMaterials(page);
  const storeName = `${TAG} Edit Store`;
  await addPurchase(page, storeName);

  const row = page.locator('#purchaseBody tr').filter({ hasText: storeName });
  await row.locator('button:has-text("✏️")').click();
  await page.waitForSelector('#purchaseModal.open');
  await expect(page.locator('#purchModalTitle')).toContainText('Edit', { timeout: 5000 });

  await page.fill('#pStore', `${storeName} Updated`);
  await page.click('#purchSaveBtn');

  await expect(page.locator('#purchaseBody tr').filter({ hasText: `${storeName} Updated` })).toBeVisible({ timeout: 10000 });
  await expect(page.locator('#purchaseBody tr').filter({ hasText: storeName }).filter({ hasNotText: 'Updated' })).toHaveCount(0);
});

test('re-saving a loaded cut list updates the existing record (not a new insert)', async ({ page }) => {
  await goToMaterials(page);
  const originalName = `${TAG} UpdateCL`;
  const renamedName = `${TAG} UpdateCL Renamed`;

  await addPartAndRunCutList(page, originalName);
  await page.click('button[onclick="saveCutList()"]');
  await expect(page.locator('#cl-saved-list tr').filter({ hasText: originalName })).toBeVisible({ timeout: 10000 });

  // Load it — sets savedId so next save will UPDATE
  const savedRow = page.locator('#cl-saved-list tr').filter({ hasText: originalName });
  await savedRow.locator('button:has-text("Load")').click();
  await expect(page.locator('#cl-name')).toHaveValue(originalName, { timeout: 5000 });

  // Rename and save — should UPDATE, not INSERT a second row
  await page.fill('#cl-name', renamedName);
  await page.click('button[onclick="saveCutList()"]');

  // Exactly one entry with the new name; old name gone
  await expect(page.locator('#cl-saved-list tr').filter({ hasText: renamedName })).toHaveCount(1, { timeout: 10000 });
  await expect(page.locator('#cl-saved-list tr').filter({ hasText: originalName }).filter({ hasNotText: 'Renamed' })).toHaveCount(0);
});

test('load cut list restores name; delete removes it from saved list', async ({ page }) => {
  await goToMaterials(page);
  const cutListName = `${TAG} Load CL`;
  await addPartAndRunCutList(page, cutListName);
  await page.click('button[onclick="saveCutList()"]');
  await expect(page.locator('#cl-saved-list tr').filter({ hasText: cutListName })).toBeVisible({ timeout: 10000 });

  await page.fill('#cl-name', '');

  const savedRow = page.locator('#cl-saved-list tr').filter({ hasText: cutListName });
  await savedRow.locator('button:has-text("Load")').click();
  await expect(page.locator('#cl-name')).toHaveValue(cutListName, { timeout: 5000 });
  // Wait for saved list to finish re-rendering before interacting with it
  await expect(page.locator('#cl-saved-list tr').filter({ hasText: cutListName })).toBeVisible({ timeout: 5000 });

  // deleteCutList uses native browser confirm() — accept the dialog
  page.once('dialog', dialog => dialog.accept());
  await savedRow.locator('button[title="Delete"]').click();
  await expect(page.locator('#cl-saved-list tr').filter({ hasText: cutListName })).toHaveCount(0, { timeout: 10000 });
});

test('add product from Products tab appears in list', async ({ page }) => {
  const productName = `${TAG} TestStyle`;
  await goToProducts(page);
  await page.click('#mtab-products button:has-text("+ Add Product")');
  await page.fill('#prod-add-inp', productName);
  await page.press('#prod-add-inp', 'Enter');
  await expect(page.locator('#products-list').getByText(productName)).toBeVisible({ timeout: 5000 });
});

test('rename product from Products tab updates name in list', async ({ page }) => {
  const original = `${TAG} RenameMe`;
  const renamed = `${TAG} Renamed`;
  await goToProducts(page);
  // Add product using inline input
  await page.click('#mtab-products button:has-text("+ Add Product")');
  await page.fill('#prod-add-inp', original);
  await page.press('#prod-add-inp', 'Enter');
  await expect(page.locator('#products-list').getByText(original)).toBeVisible({ timeout: 5000 });
  // Rename using inline input
  const row = page.locator('#products-list div').filter({ hasText: original });
  await row.locator('button:has-text("Rename")').click();
  await page.fill('#prod-rename-inp', renamed);
  await page.press('#prod-rename-inp', 'Enter');
  await expect(page.locator('#products-list').getByText(renamed)).toBeVisible({ timeout: 5000 });
  await expect(page.locator('#products-list').getByText(original)).toHaveCount(0);
});

test('delete product with no cut lists removes it from list', async ({ page }) => {
  const productName = `${TAG} DeleteMe`;
  await goToProducts(page);
  // Add product using inline input
  await page.click('#mtab-products button:has-text("+ Add Product")');
  await page.fill('#prod-add-inp', productName);
  await page.press('#prod-add-inp', 'Enter');
  await expect(page.locator('#products-list').getByText(productName)).toBeVisible({ timeout: 5000 });
  // Delete (still uses confirm() dialog)
  const row = page.locator('#products-list div').filter({ hasText: productName });
  page.once('dialog', d => d.accept());
  await row.locator('.icon-btn').click();
  await expect(page.locator('#products-list').getByText(productName)).toHaveCount(0);
});

test('deleting the last remaining product shows error and keeps it', async ({ page }) => {
  await goToProducts(page);
  const rows = page.locator('#products-list div[style*="border-bottom"]');
  const count = await rows.count();
  if (count !== 1) { test.skip(); return; }
  await rows.first().locator('.icon-btn').click();
  await expect(page.locator('.toast, [class*="toast"]')).toContainText('required', { timeout: 5000 });
  await expect(rows).toHaveCount(1);
});

async function goToAddons(page: Page) {
  await goToMaterials(page);
  await page.click('button:has-text("Add-ons")');
  await page.waitForSelector('#mtab-addons.active');
}

test('add new add-on from Add-ons tab appears in list', async ({ page }) => {
  await goToAddons(page);
  const beforeCount = await page.locator('#addons-list > div').count();
  await page.click('#mtab-addons button:has-text("+ Add Add-on")');
  await expect(page.locator('#addons-list > div')).toHaveCount(beforeCount + 1, { timeout: 5000 });
});

test('delete add-on removes it from the list', async ({ page }) => {
  await goToAddons(page);
  // Add one first so we have a safe target to delete
  await page.click('#mtab-addons button:has-text("+ Add Add-on")');
  const rows = page.locator('#addons-list > div');
  const countAfterAdd = await rows.count();
  await expect(rows).toHaveCount(countAfterAdd);
  // Delete the last row
  await rows.last().locator('button[title="Delete"]').click();
  await expect(rows).toHaveCount(countAfterAdd - 1, { timeout: 5000 });
});

test('new add-on appears in order modal add-on dropdown', async ({ page }) => {
  await goToAddons(page);
  // Record how many add-ons exist before adding one
  const beforeCount = await page.locator('#addons-list > div').count();
  await page.click('#mtab-addons button:has-text("+ Add Add-on")');
  await expect(page.locator('#addons-list > div')).toHaveCount(beforeCount + 1, { timeout: 5000 });

  // Navigate home (reloads app — localStorage persists so new add-on is loaded)
  // then go to Orders and open the new order modal
  await login(page);
  await page.click('.app-tile--orders');
  await page.waitForSelector('#page-orders.active');
  await page.click('button:has-text("+ New Order")');
  await page.waitForSelector('#orderModal.open');
  // options = 1 blank "— Select add-on —" + (beforeCount + 1) addons
  await expect(page.locator('#oAddonSelect option')).toHaveCount(beforeCount + 2, { timeout: 5000 });
  await page.click('button.modal-btn-cancel');
  // No Supabase cleanup needed — add-ons are localStorage only (reset per browser context)
});
