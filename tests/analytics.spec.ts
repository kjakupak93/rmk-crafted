import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

test.beforeEach(async ({ page }) => {
  await login(page);
  await page.locator('.app-tile[onclick*="analytics"]').click();
  await page.waitForLoadState('networkidle');
});

test('analytics P&L summary cards are present', async ({ page }) => {
  // Cards may show '—' while loading — assert DOM presence, not value
  await expect(page.locator('#page-analytics .summary-card').first()).toBeVisible();
  await expect(page.locator('#page-analytics .analytics-pnl')).toBeVisible();
});

test('range filter buttons toggle active class', async ({ page }) => {
  // 'This Year' is active by default
  await expect(page.locator('#range-btn-year')).toHaveClass(/active/);

  // Click Last 12M
  await page.click('#range-btn-12m');
  await expect(page.locator('#range-btn-12m')).toHaveClass(/active/);
  await expect(page.locator('#range-btn-year')).not.toHaveClass(/active/);

  // Click All Time
  await page.click('#range-btn-all');
  await expect(page.locator('#range-btn-all')).toHaveClass(/active/);
  await expect(page.locator('#range-btn-12m')).not.toHaveClass(/active/);
});
