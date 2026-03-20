import { test, expect, Page } from '@playwright/test';
import { login } from '../helpers/auth';
import { cleanupTestData } from './helpers/cleanup';

test.describe.configure({ mode: 'serial' });

const TAG = `[TEST] ${Date.now()}`;

async function goToMaterials(page: Page) {
  await login(page);
  await page.click('.app-tile--mats');
  await page.waitForSelector('#page-materials.active');
}

async function addPurchase(page: Page, storeName: string): Promise<void> {
  await page.click('button:has-text("Purchases")');
  await page.waitForSelector('#mtab-purchases.active');
  await page.click('button:has-text("+ Log Purchase")');
  await page.waitForSelector('#purchaseModal.open');
  await page.fill('#pStore', storeName);
  await page.fill('#pPickets', '5');
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

test.afterAll(async () => {
  await cleanupTestData(['purchases', 'cut_lists']);
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
