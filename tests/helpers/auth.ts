import { Page } from '@playwright/test';

/**
 * Logs into the app by entering PIN 1234.
 *
 * IMPORTANT: The app IIFE always shows #pin-gate on every page load
 * regardless of sessionStorage. Every test must call login() via UI —
 * pre-seeding sessionStorage will NOT bypass the gate.
 */
export async function login(page: Page): Promise<void> {
  await page.goto('/');
  await page.fill('#pin-input', '1234');
  await page.press('#pin-input', 'Enter');
  // Use waitFor({state:'hidden'}) not expect().not.toBeVisible() —
  // the gate uses inline style.display='none', and waitFor has a built-in timeout.
  await page.locator('#pin-gate').waitFor({ state: 'hidden' });
}
