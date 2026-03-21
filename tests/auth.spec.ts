import { test, expect } from '@playwright/test';

test('wrong PIN shows error and clears input', async ({ page }) => {
  await page.goto('/');
  await page.fill('#pin-input', '9999');
  await page.press('#pin-input', 'Enter');
  await expect(page.locator('#pin-error')).toBeVisible();
  await expect(page.locator('#pin-input')).toHaveValue('');
});

test('correct PIN dismisses gate and shows home page', async ({ page }) => {
  await page.goto('/');
  await page.fill('#pin-input', '9518');
  await page.press('#pin-input', 'Enter');
  await page.locator('#pin-gate').waitFor({ state: 'hidden' });
  await expect(page.locator('#page-home')).toBeVisible();
});
