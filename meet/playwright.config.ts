import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  workers: 1,
  use: {
    baseURL: 'http://localhost:3000',
    browserName: 'chromium',
    permissions: ['camera', 'microphone'],
    launchOptions: { args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required'] },
    trace: 'retain-on-failure',
  },
  webServer: [
    { command: 'npm --prefix server run dev', url: 'http://localhost:5000/api/health', reuseExistingServer: !process.env.CI },
    { command: 'npx vite --host localhost --open false', url: 'http://localhost:3000', reuseExistingServer: !process.env.CI },
  ],
});
