import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

test.beforeEach(async ({ page }) => {
  await login(page);
  await page.click('.app-tile--orders');
  await page.waitForLoadState('networkidle');
});

test('orders page loads with active orders section', async ({ page }) => {
  await expect(page.locator('#otab-active')).toBeVisible();
});

test('all 3 order tabs switch the active panel', async ({ page }) => {
  const tabs = page.locator('#orders-tabs .tab-btn');

  // Switch to Ready to Sell (index 1)
  await tabs.nth(1).click();
  await expect(page.locator('#otab-inventory')).toHaveClass(/active/);
  await expect(page.locator('#otab-active')).not.toHaveClass(/active/);

  // Switch to Sales History (index 2)
  await tabs.nth(2).click();
  await expect(page.locator('#otab-sales')).toHaveClass(/active/);
  await expect(page.locator('#otab-inventory')).not.toHaveClass(/active/);

  // Switch back to Active (index 0)
  await tabs.nth(0).click();
  await expect(page.locator('#otab-active')).toHaveClass(/active/);
});

test('New Order button opens the order modal', async ({ page }) => {
  await page.click('button[onclick="openOrderModal()"]');
  await expect(page.locator('#orderModal')).toHaveClass(/open/);
});

test('Quotes tab is present on Orders page', async ({ page }) => {
  await expect(page.locator('#orders-tabs button:has-text("Quotes")')).toBeVisible();
});

test('clicking Quotes tab shows the quotes panel', async ({ page }) => {
  await page.click('#orders-tabs button:has-text("Quotes")');
  await expect(page.locator('#otab-quotes')).toHaveClass(/active/);
});

test('sales history price cells show a margin badge', async ({ page }) => {
  const tabs = page.locator('#orders-tabs .tab-btn');
  await tabs.nth(2).click();
  // Wait for the sales data to populate the table
  await page.waitForSelector('#salesBody tr td', { timeout: 10000 });

  const rows = page.locator('#salesBody tr');
  // Require at least one row — this test needs real sales data in the DB
  await expect(rows).not.toHaveCount(0);
  // Price cell is the 6th column (index 5); should contain a % span
  const priceCell = rows.first().locator('td').nth(5);
  await expect(priceCell.locator('span')).toContainText('%');
});
