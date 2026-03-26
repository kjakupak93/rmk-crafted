import { defineConfig, devices } from '@playwright/test';
import { config } from 'dotenv';
config(); // load .env into process.env

export default defineConfig({
  globalSetup: './tests/global-setup.ts',
  workers: 2,
  use: {
    baseURL: 'http://localhost:8080',
  },
  projects: [
    {
      name: 'smoke',
      testDir: './tests',
      testIgnore: ['**/e2e/**'],
      use: {
        ...devices['Desktop Chrome'],
        // Block SW registration — skipWaiting+controllerchange triggers a page reload
        // that races with login(), causing intermittent pin-gate timeout failures in CI
        serviceWorkers: 'block',
      },
    },
    {
      name: 'e2e',
      testDir: './tests/e2e',
      timeout: 60000,
      use: {
        ...devices['Desktop Chrome'],
        actionTimeout: 30000,
        navigationTimeout: 30000,
        serviceWorkers: 'block',
        // Reuse the authenticated session saved by global-setup.ts
        storageState: 'tests/.auth-state.json',
      },
    },
  ],
  webServer: {
    command: 'python3 -m http.server 8080',
    url: 'http://localhost:8080',
    reuseExistingServer: !process.env.CI,
    cwd: __dirname,
  },
});
