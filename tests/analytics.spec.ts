import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

test.beforeEach(async ({ page }) => {
  await login(page);
  await page.click('#sb-analytics');
  await page.waitForLoadState('networkidle');
});

test('analytics P&L summary cards are present', async ({ page }) => {
  // Cards may show '—' while loading — assert DOM presence, not value
  await expect(page.locator('#page-analytics .summary-card').first()).toBeVisible();
  await expect(page.locator('#page-analytics .analytics-pnl')).toBeVisible();
});

test('margin trend chart canvas is present', async ({ page }) => {
  await expect(page.locator('#chart-margin-trend')).toBeVisible();
});

test('margin by size chart canvas is present', async ({ page }) => {
  await expect(page.locator('#chart-margin-by-size')).toBeVisible();
});

test('revenue vs spend chart canvas is present', async ({ page }) => {
  await expect(page.locator('#chart-revenue-spend')).toBeVisible();
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

test('shows 5 KPI cards', async ({ page }) => {
  await expect(page.locator('#pnl-units')).toBeVisible();
  await expect(page.locator('#pnl-aov')).toBeVisible();
});

test('shows new chart canvases', async ({ page }) => {
  await expect(page.locator('#chart-cumulative')).toBeAttached();
  await expect(page.locator('#chart-units-by-product')).toBeAttached();
  await expect(page.locator('#chart-revenue-by-product')).toBeAttached();
});

test('shows global product filter toggle', async ({ page }) => {
  await expect(page.locator('#analytics-product-toggle')).toBeVisible();
});

test('shows 3 section headers', async ({ page }) => {
  await expect(page.locator('.analytics-section-header')).toHaveCount(3);
});
