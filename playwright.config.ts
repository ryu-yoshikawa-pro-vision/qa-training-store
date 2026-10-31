import { defineConfig, devices } from "@playwright/test";

const localBaseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:8081";
const deployedBaseUrl = process.env.DEPLOYED_BASE_URL;
const usePrebuiltDist = process.env.PLAYWRIGHT_USE_PREBUILT_DIST === "true";
const usesDeployedTarget = deployedBaseUrl !== undefined && deployedBaseUrl.trim() !== "";
const skipWebServer = process.env.PLAYWRIGHT_SKIP_WEB_SERVER === "true";
const chromiumExecutable = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?.trim();
const chromiumLaunchOptions = chromiumExecutable
  ? { launchOptions: { executablePath: chromiumExecutable } }
  : {};
const webServerCommand = usePrebuiltDist
  ? "pnpm exec tsx scripts/serve-web-dist.ts"
  : "pnpm run build:web && pnpm exec tsx scripts/serve-web-dist.ts";

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
  ...(usesDeployedTarget || skipWebServer
    ? {}
    : {
        webServer: {
          command: webServerCommand,
          url: localBaseUrl,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
      }),
  projects: [
    {
      name: "chromium",
      testMatch: [
        /phase1-required\.spec\.ts/,
        /accessibility\.spec\.ts/,
        /reset-boundary\.spec\.ts/,
        /ui-ux-improvements\.spec\.ts/,
        /ai-assisted-qa-course\.spec\.ts/,
      ],
      use: { ...devices["Desktop Chrome"], ...chromiumLaunchOptions },
    },
    {
      name: "mobile-chromium",
      testMatch: [/phase1-required\.spec\.ts/, /mobile-boundary\.spec\.ts/],
      use: { ...devices["Pixel 7"], ...chromiumLaunchOptions },
    },
    {
      name: "cross-role-chromium",
      testMatch: /cross-role-lifecycle\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], ...chromiumLaunchOptions },
    },
    {
      name: "deployed-smoke",
      testMatch: /smoke\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        ...chromiumLaunchOptions,
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
        ...chromiumLaunchOptions,
        viewport: { width: 1440, height: 1000 },
        deviceScaleFactor: 1,
      },
    },
    {
      name: "ui-review-tablet",
      testMatch: /ui-review\.spec\.ts$/,
      use: {
        ...devices["Desktop Chrome"],
        ...chromiumLaunchOptions,
        viewport: { width: 1024, height: 900 },
        deviceScaleFactor: 1,
      },
    },
    {
      name: "ui-review-mobile",
      testMatch: /ui-review\.spec\.ts$/,
      use: {
        ...devices["Pixel 7"],
        ...chromiumLaunchOptions,
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 1,
      },
    },
    {
      name: "ui-review-small-mobile",
      testMatch: /ui-review\.spec\.ts$/,
      use: {
        ...devices["Desktop Chrome"],
        ...chromiumLaunchOptions,
        viewport: { width: 320, height: 700 },
        deviceScaleFactor: 1,
      },
    },
  ],
});
