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

test('Quick Actions bar renders 4 buttons', async ({ page }) => {
  const btns = page.locator('.quick-actions .qa-btn');
  await expect(btns).toHaveCount(4);
});

test('Quick Actions New Order button opens order modal', async ({ page }) => {
  await page.locator('.quick-actions .qa-btn-primary').click();
  await expect(page.locator('#orderModal')).toHaveClass(/open/, { timeout: 5000 });
});

test("Today's Focus card is present on home page", async ({ page }) => {
  await expect(page.locator('.focus-card')).toBeVisible();
});

test('Best Seller card is present on home page', async ({ page }) => {
  await expect(page.locator('text=🏆 Best Seller This Month')).toBeVisible();
});
