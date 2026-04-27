import { test, expect, Page } from '@playwright/test';
import { login } from '../helpers/auth';
import { cleanupTestData, snapshotSettings, restoreSettings } from './helpers/cleanup';

test.describe.configure({ mode: 'serial' });

const TAG = `[TEST] ${Date.now()}`;

async function goToCutList(page: Page) {
  await login(page);
  await page.click('#sb-materials');
  await page.waitForSelector('#page-materials.active');
  await page.click('button:has-text("Cut List")');
  await page.waitForSelector('#mtab-cutlist.active');
}

async function addPartRowAndRun(page: Page, cutListName: string) {
  await page.fill('#cl-name', cutListName);
  await page.click('button:has-text("+ Add Part")');
  const lastRow = page.locator('#cl-rows tr:last-child');
  await lastRow.locator('[id^="cl-qty-"]').fill('2');
  await lastRow.locator('[id^="cl-len-"]').fill('36');
  // Select first option (Cedar Picket 6ft / Picket 6') which is always index 0
  await lastRow.locator('[id^="cl-mat-"]').selectOption({ index: 0 });
  await page.locator('#mtab-cutlist button:has-text("Calculate")').click();
  await expect(page.locator('#cl-results')).toBeVisible({ timeout: 10000 });
}

async function createQuote(page: Page, quoteName: string): Promise<void> {
  const cutListName = `${TAG} CL for ${quoteName}`;
  await goToCutList(page);
  await addPartRowAndRun(page, cutListName);
  await expect(page.locator('#cl-quote-btn')).not.toBeDisabled({ timeout: 5000 });
  await page.click('#cl-quote-btn');
  await page.waitForSelector('#createQuoteModal.open');
  await page.fill('#cqName', quoteName);
  await page.click('button:has-text("Create Quote")');
  await expect(page.locator('#createQuoteModal')).not.toHaveClass(/open/, { timeout: 5000 });
}

let settingsSnapshot: { addons: string; products: string } = { addons: '', products: '' };

test.beforeAll(async () => {
  await cleanupTestData(['quotes', 'orders', 'cut_lists']);
  settingsSnapshot = await snapshotSettings();
});

test.afterAll(async () => {
  await cleanupTestData(['quotes', 'orders', 'cut_lists']);
  await restoreSettings(settingsSnapshot);
});

test('Quote button becomes enabled after running cut list', async ({ page }) => {
  await goToCutList(page);
  await expect(page.locator('#cl-quote-btn')).toBeDisabled();
  await addPartRowAndRun(page, `${TAG} Button Test`);
  await expect(page.locator('#cl-quote-btn')).not.toBeDisabled({ timeout: 5000 });
});

test('Quote modal pre-fills price and notes from cut list', async ({ page }) => {
  const cutListName = `${TAG} Prefill Test`;
  await goToCutList(page);
  await addPartRowAndRun(page, cutListName);
  await expect(page.locator('#cl-quote-btn')).not.toBeDisabled({ timeout: 5000 });

  await page.click('#cl-quote-btn');
  await page.waitForSelector('#createQuoteModal.open');

  const price = await page.locator('#cqPrice').inputValue();
  expect(Number(price)).toBeGreaterThan(0);

  const notes = await page.locator('#cqNotes').inputValue();
  expect(notes).toBe(cutListName);
});

async function goToOrdersFromMaterials(page: Page) {
  await login(page);
  await page.click('#sb-orders');
  await page.waitForSelector('#page-orders.active');
}

test('saved quote appears in Quotes tab with margin badge', async ({ page }) => {
  const quoteName = `${TAG} Save Quote`;
  await createQuote(page, quoteName);

  await goToOrdersFromMaterials(page);
  await page.click('#orders-tabs button:has-text("Quotes")');
  await page.waitForSelector('#otab-quotes', { state: 'visible' });

  const quoteRow = page.locator('#otab-quotes').locator('tr').filter({ hasText: quoteName });
  await expect(quoteRow).toBeVisible({ timeout: 10000 });
  await expect(quoteRow.locator('span').filter({ hasText: '%' })).toBeVisible();
});

test('convert quote pre-fills order modal and deletes quote on save', async ({ page }) => {
  const quoteName = `${TAG} Convert`;
  await createQuote(page, quoteName);

  await goToOrdersFromMaterials(page);
  await page.click('#orders-tabs button:has-text("Quotes")');
  await page.waitForSelector('#otab-quotes', { state: 'visible' });

  const quoteRow = page.locator('#otab-quotes tr').filter({ hasText: quoteName });
  await quoteRow.locator('button[title="Convert to Order"]').click();
  await page.waitForSelector('#orderModal.open');

  const oName = await page.locator('#oName').inputValue();
  expect(oName).toBe(quoteName);

  // Fill required size field (saveOrder validates this)
  await page.locator('#oItemsContainer .item-size').first().fill('36×16×16');

  await page.click('button[onclick="saveOrder()"]');
  await expect(page.locator('#orderModal')).not.toHaveClass(/open/, { timeout: 10000 });

  await page.click('#orders-tabs button:has-text("Quotes")');
  await page.waitForSelector('#otab-quotes', { state: 'visible' });
  await expect(page.locator('#otab-quotes tr').filter({ hasText: quoteName })).toHaveCount(0);

  await page.click('#orders-tabs button:has-text("Active")');
  await expect(page.locator('#activeOrdersList .card-title', { hasText: quoteName })).toBeVisible({ timeout: 10000 });
});

test('delete quote removes it from Quotes tab', async ({ page }) => {
  const quoteName = `${TAG} Delete Quote`;
  await createQuote(page, quoteName);

  await goToOrdersFromMaterials(page);
  await page.click('#orders-tabs button:has-text("Quotes")');
  await page.waitForSelector('#otab-quotes', { state: 'visible' });

  const quoteRow = page.locator('#otab-quotes tr').filter({ hasText: quoteName });
  await expect(quoteRow).toBeVisible({ timeout: 10000 });

  await quoteRow.locator('button[title="Delete"]').click();
  await page.waitForSelector('#confirmModal', { state: 'visible' });
  await page.click('#confirmOkBtn');

  await expect(page.locator('#otab-quotes tr').filter({ hasText: quoteName })).toHaveCount(0);
});

test('save cut list with a style groups it under that style in saved list', async ({ page }) => {
  const cutListName = `${TAG} Styled CL`;
  await goToCutList(page);
  await addPartRowAndRun(page, cutListName);
  // Select the first real style (index 1 — index 0 is the blank "— No product —" option)
  await page.locator('#cl-product').selectOption({ index: 1 });
  const selectedProduct = await page.locator('#cl-product').inputValue();
  await page.locator('#mtab-cutlist button:has-text("Save")').click();
  await expect(page.locator('#cl-saved-list')).toContainText(selectedProduct, { timeout: 10000 });
  await expect(page.locator('#cl-saved-list')).toContainText(cutListName);
});

test('saving a quote auto-navigates to the Quotes tab', async ({ page }) => {
  const quoteName = `${TAG} AutoNav`;
  const cutListName = `${TAG} CL AutoNav`;
  await goToCutList(page);
  await addPartRowAndRun(page, cutListName);
  await expect(page.locator('#cl-quote-btn')).not.toBeDisabled({ timeout: 5000 });
  await page.click('#cl-quote-btn');
  await page.waitForSelector('#createQuoteModal.open');
  await page.fill('#cqName', quoteName);
  await page.click('button:has-text("Create Quote")');

  // After saving, should auto-navigate to Orders > Quotes tab
  await expect(page.locator('#page-orders')).toHaveClass(/active/, { timeout: 5000 });
  await expect(page.locator('#otab-quotes')).toHaveClass(/active/, { timeout: 5000 });
  await expect(page.locator('#otab-quotes tr').filter({ hasText: quoteName })).toBeVisible({ timeout: 10000 });
});

test('convert quote carries size from cut list name into order modal', async ({ page }) => {
  const size = '36×16×16';
  const cutListName = `${TAG} ${size} Standard`;
  const quoteName = `${TAG} Size Carry`;

  await goToCutList(page);
  await addPartRowAndRun(page, cutListName);
  await expect(page.locator('#cl-quote-btn')).not.toBeDisabled({ timeout: 5000 });
  await page.click('#cl-quote-btn');
  await page.waitForSelector('#createQuoteModal.open');
  await page.fill('#cqName', quoteName);
  await page.click('button:has-text("Create Quote")');

  // Auto-nav from Task 2 brings us to Orders > Quotes tab
  await expect(page.locator('#page-orders')).toHaveClass(/active/, { timeout: 5000 });
  await expect(page.locator('#otab-quotes')).toHaveClass(/active/, { timeout: 5000 });
  const quoteRow = page.locator('#otab-quotes tr').filter({ hasText: quoteName });
  await expect(quoteRow).toBeVisible({ timeout: 10000 });

  await quoteRow.locator('button[title="Convert to Order"]').click();
  await page.waitForSelector('#orderModal.open');

  // Size field should be pre-filled from the cut list name
  const sizeVal = await page.locator('#oItemsContainer .item-size').first().inputValue();
  expect(sizeVal).toBe(size);
});

test('creating new style from cut list dropdown adds it and selects it', async ({ page }) => {
  const newProductName = `${TAG} NewStyle`;
  await goToCutList(page);
  await page.selectOption('#cl-product', '__new__');
  // Inline input appears below the dropdown (no prompt, no navigation)
  await page.fill('#cl-new-prod-inp', newProductName);
  await page.press('#cl-new-prod-inp', 'Enter');
  await expect(page.locator('#cl-product')).toHaveValue(newProductName, { timeout: 5000 });
});
