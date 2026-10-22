import fs from "node:fs";
import path from "node:path";
import { defineConfig, devices } from "@playwright/test";
import { resolveAiAssistedQaPlaywrightSettings } from "./scripts/training/ai-assisted-qa-playwright-settings";

const repositoryRoot = process.cwd();
const settings = resolveAiAssistedQaPlaywrightSettings(repositoryRoot, {
  baseUrl: process.env.PLAYWRIGHT_BASE_URL,
  testRoot: process.env.PLAYWRIGHT_TEST_ROOT,
});
if (!fs.existsSync(settings.testDir) || !fs.statSync(settings.testDir).isDirectory()) {
  throw new Error(
    `新課程のテスト対象がありません: ${path.relative(repositoryRoot, settings.testDir)}。先に指定したM06またはM07をロードしてください。`,
  );
}

const workspaceRoot = path.resolve(repositoryRoot, "workspace");
const realWorkspaceRoot = fs.realpathSync(workspaceRoot);
const realTestDir = fs.realpathSync(settings.testDir);
const realRelative = path.relative(realWorkspaceRoot, realTestDir);
if (
  realRelative === ".." ||
  realRelative.startsWith(`..${path.sep}`) ||
  path.isAbsolute(realRelative)
) {
  throw new Error("新課程Playwrightのテスト対象がsymlink経由でworkspace外を指しています");
}

process.env.PLAYWRIGHT_BASE_URL = settings.baseUrl;
const skipWebServer = process.env.PLAYWRIGHT_SKIP_WEB_SERVER === "true";
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
  outputDir: "output/training/ai-assisted-qa/test-results",
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "output/training/ai-assisted-qa/report" }],
  ],
  use: {
    baseURL: settings.baseUrl,
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
