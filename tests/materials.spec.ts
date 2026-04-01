import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

test.beforeEach(async ({ page }) => {
  await login(page);
  await page.click('#sb-materials');
  await page.waitForSelector('#page-materials.active');
});

test('all 4 materials tabs switch the active panel', async ({ page }) => {
  const tabs = page.locator('#page-materials .tab-btn');

  // Purchases is active by default (index 0)
  await expect(page.locator('#mtab-purchases')).toHaveClass(/active/);

  // Switch to Cut List (index 1)
  await tabs.nth(1).click();
  await expect(page.locator('#mtab-cutlist')).toHaveClass(/active/);

  // Switch to Products (index 2)
  await tabs.nth(2).click();
  await expect(page.locator('#mtab-products')).toHaveClass(/active/);

  // Switch to Add-ons (index 3)
  await tabs.nth(3).click();
  await expect(page.locator('#mtab-addons')).toHaveClass(/active/);

  // Switch back to Purchases (index 0)
  await tabs.nth(0).click();
  await expect(page.locator('#mtab-purchases')).toHaveClass(/active/);
});

test('Cut List quote button starts disabled', async ({ page }) => {
  // Navigate to the Cut List tab (index 1)
  const tabs = page.locator('#page-materials .tab-btn');
  await tabs.nth(1).click();
  await expect(page.locator('#mtab-cutlist')).toHaveClass(/active/);
  // Quote button should be disabled until runCutList() is called
  await expect(page.locator('#cl-quote-btn')).toBeDisabled();
});

test('Products tab renders product list with at least one product', async ({ page }) => {
  const tabs = page.locator('#page-materials .tab-btn');
  await tabs.nth(2).click();
  await expect(page.locator('#mtab-products')).toHaveClass(/active/);
  await expect(page.locator('#products-list div').first()).toBeVisible();
});

test('Add-ons tab renders add-ons list', async ({ page }) => {
  const tabs = page.locator('#page-materials .tab-btn');
  await tabs.nth(3).click();
  await expect(page.locator('#mtab-addons')).toHaveClass(/active/);
  await expect(page.locator('#addons-list')).toBeVisible();
});
