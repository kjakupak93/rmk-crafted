import { chromium, FullConfig } from '@playwright/test';
import { config } from 'dotenv';
import path from 'path';
config({ path: path.resolve(__dirname, '../.env') });

/**
 * Global setup: signs in once before the e2e suite and saves the browser
 * storage state (localStorage with Supabase session) to a file.
 * The e2e project reuses this state, so each test file starts already authenticated
 * without making parallel signInWithPassword calls to Supabase.
 */
async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use;
  const browser = await chromium.launch();
  const context = await browser.newContext({ serviceWorkers: 'block' });
  const page = await context.newPage();

  await page.goto(baseURL!);
  await page.waitForSelector('#auth-email', { timeout: 10000 });
  await page.fill('#auth-email', process.env.TEST_EMAIL!);
  await page.fill('#auth-password', process.env.TEST_PASSWORD!);
  await page.press('#auth-password', 'Enter');
  await page.locator('#pin-gate').waitFor({ state: 'hidden', timeout: 15000 });

  await context.storageState({ path: 'tests/.auth-state.json' });
  await browser.close();
}

export default globalSetup;
