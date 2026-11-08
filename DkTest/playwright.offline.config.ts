import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/offline-e2e',
  testMatch: '**/*.e2e.ts',
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  use: { baseURL: 'http://127.0.0.1:4175', viewport: { width: 393, height: 851 }, trace: 'retain-on-failure' },
});
