import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 120_000,
  expect: { timeout: 15_000 },
  workers: process.env.CI ? 1 : undefined,
  use: { baseURL: 'http://127.0.0.1:5173', channel: process.env.CI ? undefined : 'chrome', screenshot: 'only-on-failure',
    actionTimeout: 20_000, trace: 'retain-on-failure' },
  webServer: { command: 'npm run dev -- --host 127.0.0.1 --port 5173', url: 'http://127.0.0.1:5173', reuseExistingServer: !process.env.CI },
});
