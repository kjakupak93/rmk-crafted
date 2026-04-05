import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';

test.describe.configure({ mode: 'serial' });

const TAG = `[TEST] ${Date.now()}`;

test.describe('Analytics product filter', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.locator('#sb-analytics, #bn-analytics').first().click();
    await expect(page.locator('#page-analytics')).toBeVisible({ timeout: 10000 });
    // Wait for product toggle to be populated (requires settings load + loadAnalytics)
    await expect(page.locator('#analytics-product-toggle button')).not.toHaveCount(0, { timeout: 10000 });
  });

  test('product toggle renders All Products plus each product type', async ({ page }) => {
    const toggle = page.locator('#analytics-product-toggle');
    await expect(toggle.locator('button:has-text("All Products")')).toBeVisible();
    const pills = toggle.locator('button');
    // All Products + at least one product = at least 2
    const count = await pills.count();
    expect(count).toBeGreaterThan(1);
  });

  test('All Products pill is active by default', async ({ page }) => {
    const allBtn = page.locator('#analytics-product-toggle button:has-text("All Products")');
    await expect(allBtn).toHaveClass(/active/);
  });

  test('clicking a product pill makes it active and deactivates All Products', async ({ page }) => {
    const toggle = page.locator('#analytics-product-toggle');
    const firstProduct = toggle.locator('button').nth(1);
    await firstProduct.click();

    await expect(firstProduct).toHaveClass(/active/);
    await expect(toggle.locator('button:has-text("All Products")')).not.toHaveClass(/active/);
  });

  test('KPI revenue label includes product name when product is selected', async ({ page }) => {
    const toggle = page.locator('#analytics-product-toggle');
    const firstProduct = toggle.locator('button').nth(1);
    const productName = (await firstProduct.textContent() || '').trim();
    await firstProduct.click();

    await expect(page.locator('#pnl-revenue-lbl')).toContainText(productName);
  });

  test('clicking All Products restores label without product prefix', async ({ page }) => {
    const toggle = page.locator('#analytics-product-toggle');
    await toggle.locator('button').nth(1).click();
    await toggle.locator('button:has-text("All Products")').click();

    await expect(page.locator('#pnl-revenue-lbl')).not.toContainText('\u2014');
  });

  test('best sellers chart dropdown is removed', async ({ page }) => {
    await expect(page.locator('#best-sellers-filter')).toHaveCount(0);
  });
});
