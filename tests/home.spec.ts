import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

test.beforeEach(async ({ page }) => {
  await login(page);
  await page.waitForLoadState('networkidle');
});

test('KPI summary cards render on home page', async ({ page }) => {
  await expect(page.locator('.kpi-grid .kpi-card').first()).toBeVisible();
});

test('5 nav items are present in sidebar', async ({ page }) => {
  // Sidebar has home, orders, materials, scheduler, analytics (+ sign out = 6 total .sb-item)
  await expect(page.locator('.sb-item[id]')).toHaveCount(5);
});

test('+ New Order shortcut button opens the order modal', async ({ page }) => {
  const btn = page.locator('.sb-new-order');
  await expect(btn).toBeVisible();
  await btn.click();
  await expect(page.locator('#orderModal')).toHaveClass(/open/, { timeout: 5000 });
});
