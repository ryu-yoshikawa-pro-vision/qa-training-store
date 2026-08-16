import { defineConfig, devices } from "@playwright/test";

const defaultTrainingBaseUrl = "http://127.0.0.1:8082";
const configuredBaseUrl = process.env.PLAYWRIGHT_BASE_URL?.trim();
const trainingBaseUrl = configuredBaseUrl || defaultTrainingBaseUrl;

if (!configuredBaseUrl) {
  process.env.PLAYWRIGHT_BASE_URL = trainingBaseUrl;
}

const parsedTrainingUrl = new URL(trainingBaseUrl);
if (parsedTrainingUrl.port === "8081" || parsedTrainingUrl.port === "8083") {
  throw new Error(
    `Training Playwright must use this worktree's dedicated runtime port, not ${parsedTrainingUrl.port}.`,
  );
}

const webServerCommand =
  process.env.PLAYWRIGHT_USE_PREBUILT_DIST === "true"
    ? "pnpm exec tsx scripts/serve-web-dist.ts"
    : "pnpm run build:web && pnpm exec tsx scripts/serve-web-dist.ts";

export default defineConfig({
  testDir: "./training/playwright",
  fullyParallel: false,
  timeout: 90_000,
  expect: {
    timeout: 7_500,
  },
  retries: process.env.CI ? 2 : 0,
  outputDir: "output/training/playwright/test-results",
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "output/training/playwright/report" }],
  ],
  use: {
    baseURL: trainingBaseUrl,
    navigationTimeout: 45_000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command: webServerCommand,
    url: trainingBaseUrl,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: "training-chromium",
      testMatch: /.*\.spec\.ts$/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "training-mobile-chromium",
      testMatch: /.*\.spec\.ts$/,
      use: { ...devices["Pixel 7"] },
    },
  ],
});
