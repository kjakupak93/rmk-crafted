import { test, expect, Page } from '@playwright/test';
import { login } from '../helpers/auth';
import { cleanupTestData } from './helpers/cleanup';

test.describe.configure({ mode: 'serial' });

const TAG = `[TEST] ${Date.now()}`;

async function goToCutList(page: Page) {
  await login(page);
  await page.click('.app-tile--mats');
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

test.afterAll(async () => {
  await cleanupTestData(['quotes', 'orders', 'cut_lists']);
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
  await page.click('#backBtn');
  await page.waitForSelector('#page-home.active');
  await page.click('.app-tile--orders');
  await page.waitForSelector('#page-orders.active');
}

test('saved quote appears in Quotes tab with margin badge', async ({ page }) => {
  const quoteName = `${TAG} Save Quote`;
  await createQuote(page, quoteName);

  await goToOrdersFromMaterials(page);
  await page.click('#orders-tabs button:has-text("Quotes")');
  await page.waitForLoadState('networkidle');

  const quoteRow = page.locator('#otab-quotes').locator('tr').filter({ hasText: quoteName });
  await expect(quoteRow).toBeVisible({ timeout: 10000 });
  await expect(quoteRow.locator('span').filter({ hasText: '%' })).toBeVisible();
});

test('convert quote pre-fills order modal and deletes quote on save', async ({ page }) => {
  const quoteName = `${TAG} Convert`;
  await createQuote(page, quoteName);

  await goToOrdersFromMaterials(page);
  await page.click('#orders-tabs button:has-text("Quotes")');
  await page.waitForLoadState('networkidle');

  const quoteRow = page.locator('#otab-quotes tr').filter({ hasText: quoteName });
  await quoteRow.locator('button:has-text("Convert")').click();
  await page.waitForSelector('#orderModal.open');

  const oName = await page.locator('#oName').inputValue();
  expect(oName).toBe(quoteName);

  // Fill required size field (saveOrder validates this)
  await page.locator('#oItemsContainer .item-size').first().fill('36×16×16');

  await page.click('button[onclick="saveOrder()"]');
  await expect(page.locator('#orderModal')).not.toHaveClass(/open/, { timeout: 10000 });
  await page.waitForLoadState('networkidle');

  await page.click('#orders-tabs button:has-text("Quotes")');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('#otab-quotes tr').filter({ hasText: quoteName })).toHaveCount(0);

  await page.click('#orders-tabs button:has-text("Active")');
  await expect(page.locator('#activeOrdersList .card-title', { hasText: quoteName })).toBeVisible({ timeout: 10000 });
});

test('delete quote removes it from Quotes tab', async ({ page }) => {
  const quoteName = `${TAG} Delete Quote`;
  await createQuote(page, quoteName);

  await goToOrdersFromMaterials(page);
  await page.click('#orders-tabs button:has-text("Quotes")');
  await page.waitForLoadState('networkidle');

  const quoteRow = page.locator('#otab-quotes tr').filter({ hasText: quoteName });
  await expect(quoteRow).toBeVisible({ timeout: 10000 });

  // deleteQuote uses native confirm() — accept it via dialog handler
  page.once('dialog', dialog => dialog.accept());
  await quoteRow.locator('button:has-text("Delete")').click();
  await page.waitForLoadState('networkidle');

  await expect(page.locator('#otab-quotes tr').filter({ hasText: quoteName })).toHaveCount(0);
});
