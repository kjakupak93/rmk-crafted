import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
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
