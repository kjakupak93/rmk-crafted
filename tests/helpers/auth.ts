import { Page } from '@playwright/test';

export async function login(page: Page): Promise<void> {
  await page.goto('/');
  // If already authenticated (session cookie present), gate may already be hidden
  const gate = page.locator('#pin-gate');
  const gateVisible = await gate.isVisible().catch(() => false);
  if (gateVisible) {
    await page.fill('#auth-email', 'ryan@rmkcrafted.com');
    await page.fill('#auth-password', 'RMK_ChangeMe_2026!');
    await page.press('#auth-password', 'Enter');
    await gate.waitFor({ state: 'hidden', timeout: 15000 });
  }
}
