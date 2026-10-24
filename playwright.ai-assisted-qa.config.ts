import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { defineConfig, devices } from "@playwright/test";
import { resolveAiAssistedQaPlaywrightSettings } from "./scripts/training/ai-assisted-qa-playwright-settings";

const repositoryRoot = process.cwd();
const syncedShopPath = path.join(repositoryRoot, "course", "shop");
const syncedDistributionManifest = path.join(
  repositoryRoot,
  ".course",
  "distribution-manifest.json",
);
const hasCourseMetadata = fs.existsSync(path.dirname(syncedDistributionManifest));
const hasSyncedShop = fs.existsSync(syncedShopPath);
const useSyncedCourse = hasCourseMetadata || hasSyncedShop;
if (useSyncedCourse) {
  execFileSync(
    process.execPath,
    [
      path.join(repositoryRoot, "scripts/training/ai-assisted-qa-course.mjs"),
      "verify-distribution",
    ],
    { cwd: repositoryRoot, stdio: "inherit" },
  );
  process.env.PLAYWRIGHT_USE_PREBUILT_DIST = "true";
  process.env.WEB_SERVER_DIST_ROOT = syncedShopPath;
  process.env.WEB_SERVER_PORT = "8082";
} else if (process.env.PLAYWRIGHT_USE_PREBUILT_DIST === "true") {
  throw new Error(
    `事前ビルド済みScenario Shopを要求しましたが、同期manifestがありません: ${syncedDistributionManifest}`,
  );
}
const settings = resolveAiAssistedQaPlaywrightSettings(repositoryRoot, {
  baseUrl: process.env.PLAYWRIGHT_BASE_URL,
  testRoot: process.env.PLAYWRIGHT_TEST_ROOT,
});
if (!fs.existsSync(settings.testDir) || !fs.statSync(settings.testDir).isDirectory()) {
  throw new Error(
    `新課程のテスト対象がありません: ${path.relative(repositoryRoot, settings.testDir)}。先に指定したM05、M06、M07、M08またはM10をロードしてください。`,
  );
}

const allowedTestRoot = path.resolve(
  repositoryRoot,
  settings.testArea === "workspace"
    ? "workspace"
    : "training/ai-assisted-qa-course/assessment/playwright",
);
const realAllowedTestRoot = fs.realpathSync(allowedTestRoot);
const realTestDir = fs.realpathSync(settings.testDir);
const realRelative = path.relative(realAllowedTestRoot, realTestDir);
if (
  realRelative === ".." ||
  realRelative.startsWith(`..${path.sep}`) ||
  path.isAbsolute(realRelative)
) {
  throw new Error("新課程Playwrightのテスト対象がsymlink経由で許可領域外を指しています");
}

process.env.PLAYWRIGHT_BASE_URL = settings.baseUrl;
const skipWebServer = process.env.PLAYWRIGHT_SKIP_WEB_SERVER === "true";
const outputRoot = process.env.AI_QA_OUTPUT_ROOT ?? "output/training/ai-assisted-qa";
const chromiumExecutable = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?.trim();
const webServerCommand =
  process.env.PLAYWRIGHT_USE_PREBUILT_DIST === "true"
    ? "pnpm exec tsx scripts/serve-web-dist.ts"
    : "pnpm run build:web && pnpm exec tsx scripts/serve-web-dist.ts";

export default defineConfig({
  testDir: settings.testDir,
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 7_500 },
  retries: process.env.CI ? 2 : 0,
  outputDir: path.join(outputRoot, "test-results"),
  reporter: [["list"], ["html", { open: "never", outputFolder: path.join(outputRoot, "report") }]],
  use: {
    baseURL: settings.baseUrl,
    ...(chromiumExecutable ? { launchOptions: { executablePath: chromiumExecutable } } : {}),
    navigationTimeout: 45_000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  ...(skipWebServer
    ? {}
    : {
        webServer: {
          command: webServerCommand,
          url: settings.baseUrl,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
      }),
  projects: [
    {
      name: "ai-assisted-qa-chromium",
      testMatch: /.*\.spec\.ts$/,
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
