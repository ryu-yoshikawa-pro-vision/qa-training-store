import { defineConfig, devices } from "@playwright/test";

const localBaseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:8081";
const deployedBaseUrl = process.env.DEPLOYED_BASE_URL;
const usesDeployedTarget = deployedBaseUrl !== undefined && deployedBaseUrl.trim() !== "";

export default defineConfig({
  testDir: "./e2e/web",
  fullyParallel: false,
  timeout: 90_000,
  expect: {
    timeout: 7_500,
  },
  retries: process.env.CI ? 2 : 0,
  outputDir: "output/playwright/test-results",
  reporter: [["list"], ["html", { open: "never", outputFolder: "output/playwright/report" }]],
  use: {
    baseURL: localBaseUrl,
    navigationTimeout: 45_000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  ...(usesDeployedTarget
    ? {}
    : {
        webServer: {
          command: "pnpm run prepare:font-assets && pnpm exec expo start --web --port 8081",
          url: localBaseUrl,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
      }),
  projects: [
    {
      name: "chromium",
      testMatch: [/phase1-required\.spec\.ts/, /accessibility\.spec\.ts/],
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-chromium",
      testMatch: [/phase1-required\.spec\.ts/, /mobile-boundary\.spec\.ts/],
      use: { ...devices["Pixel 7"] },
    },
    {
      name: "cross-role-chromium",
      testMatch: /cross-role-lifecycle\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "deployed-smoke",
      testMatch: /smoke\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        baseURL: usesDeployedTarget ? (deployedBaseUrl ?? localBaseUrl) : localBaseUrl,
      },
    },
    {
      name: "firefox-smoke",
      testMatch: /smoke\.spec\.ts/,
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit-smoke",
      testMatch: /smoke\.spec\.ts/,
      use: { ...devices["Desktop Safari"] },
    },
    {
      name: "ui-review-desktop",
      testMatch: /ui-review\.spec\.ts$/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1000 },
        deviceScaleFactor: 1,
      },
    },
    {
      name: "ui-review-tablet",
      testMatch: /ui-review\.spec\.ts$/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1024, height: 900 },
        deviceScaleFactor: 1,
      },
    },
    {
      name: "ui-review-mobile",
      testMatch: /ui-review\.spec\.ts$/,
      use: {
        ...devices["Pixel 7"],
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 1,
      },
    },
  ],
});
