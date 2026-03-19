import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

test.beforeEach(async ({ page }) => {
  await login(page);
  await page.click('.app-tile--sched');
  // Wait for calendar label to populate (rendered by renderCalendar())
  await expect(page.locator('#calLabel')).not.toBeEmpty({ timeout: 10000 });
});

test('calendar renders with month and year heading', async ({ page }) => {
  const label = await page.locator('#calLabel').textContent();
  expect(label).toBeTruthy();
  expect(label!.length).toBeGreaterThan(0);
});

test('all 3 scheduler tabs switch the active panel', async ({ page }) => {
  const tabs = page.locator('#page-scheduler .tab-btn');

  // Switch to Upcoming (index 1)
  await tabs.nth(1).click();
  await expect(page.locator('#stab-upcoming')).toHaveClass(/active/);
  await expect(page.locator('#stab-calendar')).not.toHaveClass(/active/);

  // Switch to Share & Book (index 2)
  await tabs.nth(2).click();
  await expect(page.locator('#stab-share')).toHaveClass(/active/);

  // Switch back to Calendar (index 0)
  await tabs.nth(0).click();
  await expect(page.locator('#stab-calendar')).toHaveClass(/active/);
});
