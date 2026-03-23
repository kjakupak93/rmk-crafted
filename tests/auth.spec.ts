import { test, expect } from '@playwright/test';

test('wrong credentials show error', async ({ page }) => {
  await page.goto('/');
  await page.fill('#auth-email', 'wrong@example.com');
  await page.fill('#auth-password', 'wrongpassword');
  await page.press('#auth-password', 'Enter');
  await expect(page.locator('#auth-error')).toBeVisible({ timeout: 8000 });
});

test('correct credentials dismiss gate and show home page', async ({ page }) => {
  await page.goto('/');
  await page.fill('#auth-email', 'kristen@rmkcrafted.com');
  await page.fill('#auth-password', 'REDACTED_PASSWORD');
  await page.press('#auth-password', 'Enter');
  await page.locator('#pin-gate').waitFor({ state: 'hidden', timeout: 15000 });
  await expect(page.locator('#page-home')).toBeVisible();
});
