import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "tests/browser",
  timeout: 45000,
  expect: { timeout: 15000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.CHEMDEX_TEST_URL ?? "http://127.0.0.1:4173",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: { args: ["--enable-unsafe-swiftshader"] },
      },
    },
    ...(process.platform === "win32"
      ? [
          {
            name: "edge",
            use: {
              ...devices["Desktop Edge"],
              channel: "msedge",
              launchOptions: { args: ["--enable-unsafe-swiftshader"] },
            },
          },
        ]
      : []),
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  webServer: process.env.CHEMDEX_TEST_URL
    ? undefined
    : {
        command: "node scripts/preview.mjs",
        url: "http://127.0.0.1:4173",
        reuseExistingServer: true,
      },
});
