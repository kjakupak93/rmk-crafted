import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

test.beforeEach(async ({ page }) => {
  await login(page);
  await page.click('.app-tile--mats');
  // Wait for stock data to load from Supabase (initial value is '—')
  await expect(page.locator('#sq-pickets')).not.toHaveText('—', { timeout: 10000 });
});

test('stock counts load from Supabase', async ({ page }) => {
  await expect(page.locator('#sq-pickets')).not.toHaveText('—');
  await expect(page.locator('#sq-twobytwo')).not.toHaveText('—');
  await expect(page.locator('#sq-twobyfour')).not.toHaveText('—');
});

test('all 5 materials tabs switch the active panel', async ({ page }) => {
  const tabs = page.locator('#page-materials .tab-btn');

  // Switch to Purchases (index 1)
  await tabs.nth(1).click();
  await expect(page.locator('#mtab-purchases')).toHaveClass(/active/);
  await expect(page.locator('#mtab-stock')).not.toHaveClass(/active/);

  // Switch to Cut List (index 2)
  await tabs.nth(2).click();
  await expect(page.locator('#mtab-cutlist')).toHaveClass(/active/);

  // Switch to Products (index 3)
  await tabs.nth(3).click();
  await expect(page.locator('#mtab-products')).toHaveClass(/active/);

  // Switch to Add-ons (index 4)
  await tabs.nth(4).click();
  await expect(page.locator('#mtab-addons')).toHaveClass(/active/);

  // Switch back to Stock (index 0)
  await tabs.nth(0).click();
  await expect(page.locator('#mtab-stock')).toHaveClass(/active/);
});

test('Cut List quote button starts disabled', async ({ page }) => {
  // Navigate to the Cut List tab (index 2)
  const tabs = page.locator('#page-materials .tab-btn');
  await tabs.nth(2).click();
  await expect(page.locator('#mtab-cutlist')).toHaveClass(/active/);
  // Quote button should be disabled until runCutList() is called
  await expect(page.locator('#cl-quote-btn')).toBeDisabled();
});

test('Products tab renders product list with at least one product', async ({ page }) => {
  const tabs = page.locator('#page-materials .tab-btn');
  await tabs.nth(3).click();
  await expect(page.locator('#mtab-products')).toHaveClass(/active/);
  await expect(page.locator('#products-list div').first()).toBeVisible();
});

test('Add-ons tab renders add-ons list', async ({ page }) => {
  const tabs = page.locator('#page-materials .tab-btn');
  await tabs.nth(4).click();
  await expect(page.locator('#mtab-addons')).toHaveClass(/active/);
  await expect(page.locator('#addons-list')).toBeVisible();
});
