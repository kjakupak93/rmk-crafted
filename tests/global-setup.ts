import { chromium, FullConfig } from '@playwright/test';

/**
 * Global setup: signs in once before the e2e suite and saves the browser
 * storage state (localStorage with Supabase session) to a file.
 * The e2e project reuses this state, so each test file starts already authenticated
 * without making parallel signInWithPassword calls to Supabase.
 */
async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use;
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto(baseURL!);
  await page.waitForSelector('#auth-email', { timeout: 10000 });
  await page.fill('#auth-email', 'kristen@rmkcrafted.com');
  await page.fill('#auth-password', 'REDACTED_PASSWORD');
  await page.press('#auth-password', 'Enter');
  await page.locator('#pin-gate').waitFor({ state: 'hidden', timeout: 15000 });

  await page.context().storageState({ path: 'tests/.auth-state.json' });
  await browser.close();
}

export default globalSetup;
