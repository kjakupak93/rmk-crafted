import { Page } from '@playwright/test';

/**
 * Navigates to the app and ensures the user is authenticated.
 *
 * For e2e tests: the browser context starts with a pre-authenticated session
 * (via storageState from global-setup.ts), so the gate is usually already hidden.
 *
 * For smoke tests: no storageState is set, so we sign in with email/password.
 */
export async function login(page: Page): Promise<void> {
  await page.goto('/');
  const gate = page.locator('#pin-gate');
  const gateVisible = await gate.isVisible().catch(() => false);
  if (gateVisible) {
    await page.fill('#auth-email', process.env.TEST_EMAIL!);
    await page.fill('#auth-password', process.env.TEST_PASSWORD!);
    await page.press('#auth-password', 'Enter');
    await gate.waitFor({ state: 'hidden', timeout: 15000 });
  }
}
