import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

test.beforeEach(async ({ page }) => {
  await login(page);
  await page.click('.app-tile--quote');
  await page.waitForLoadState('networkidle');
});

test('quote page becomes active on navigation', async ({ page }) => {
  await expect(page.locator('#page-quote')).toHaveClass(/active/);
});

test('style selector and calculate produce output', async ({ page }) => {
  // Click the first style button (Standard) — it may already be active
  await page.locator('.style-btn').first().click();
  await expect(page.locator('.style-btn').first()).toHaveClass(/active/);

  // Fill required fields — calculateQuote() returns early with a toast if any are empty
  await page.fill('#dimL', '72');
  await page.fill('#dimW', '24');
  await page.fill('#dimH', '16');
  await page.fill('#qPickets', '10');

  await page.click('.calc-btn');

  // #qResults gets class 'show' on successful calculation
  await expect(page.locator('#qResults')).toHaveClass(/show/);
});
