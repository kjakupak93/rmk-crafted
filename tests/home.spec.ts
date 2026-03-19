import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

test.beforeEach(async ({ page }) => {
  await login(page);
  await page.waitForLoadState('networkidle');
});

test('KPI summary cards render on home page', async ({ page }) => {
  await expect(page.locator('.home-kpi-row .summary-card').first()).toBeVisible();
});

test('5 nav tiles are present', async ({ page }) => {
  await expect(page.locator('.app-tile')).toHaveCount(5);
});

test('dark mode toggle sets and clears data-theme on <html>', async ({ page }) => {
  // Clear any persisted theme from previous runs, then reload
  // NOTE: reload re-triggers the IIFE which shows #pin-gate again, so login() is required after
  await page.evaluate(() => localStorage.removeItem('rmk_theme'));
  await page.reload();
  await login(page); // required — IIFE always shows gate on every page load

  // First click — enable dark mode
  await page.click('#dark-toggle');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  // Second click — disable dark mode
  // applyDarkMode(false) sets dataset.theme = '' (empty string, NOT removes attribute)
  await page.click('#dark-toggle');
  await expect(page.locator('html')).toHaveAttribute('data-theme', '');
});
