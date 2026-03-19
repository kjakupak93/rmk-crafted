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
