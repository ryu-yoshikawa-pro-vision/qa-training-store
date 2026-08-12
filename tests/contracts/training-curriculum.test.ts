import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { validateCurriculum } from "../../scripts/validate-curriculum";

describe("Training curriculum contracts", () => {
  it("keeps the required curriculum and Training entrypoints connected", () => {
    const summary = validateCurriculum(process.cwd());

    expect(summary.documents).toBe(22);
    expect(summary.workbookFiles).toBe(4);
    expect(summary.trainingProjects).toEqual(["training-chromium", "training-mobile-chromium"]);
  });

  it("keeps Training and Formal test roots separate", () => {
    const trainingConfig = readFileSync(
      resolve(process.cwd(), "playwright.training.config.ts"),
      "utf8",
    );
    const trainingWorkflow = readFileSync(
      resolve(process.cwd(), "training/github-actions/training-ci.yml"),
      "utf8",
    );
    const phaseOneWorkflow = readFileSync(
      resolve(process.cwd(), ".github/workflows/ci.yml"),
      "utf8",
    );
    const trainingNativeWorkflow = readFileSync(
      resolve(process.cwd(), "training/github-actions/training-native-ci.yml"),
      "utf8",
    );
    const trainingNativeRunner = readFileSync(
      resolve(process.cwd(), "scripts/training/run-maestro-baseline.ts"),
      "utf8",
    );
    const androidHelper = readFileSync(
      resolve(process.cwd(), "scripts/training/android-emulator.ps1"),
      "utf8",
    );

    expect(trainingConfig).toContain('testDir: "./training/playwright"');
    expect(trainingConfig).toContain("http://127.0.0.1:8082");
    expect(trainingConfig).toContain("not ${parsedTrainingUrl.port}");
    expect(trainingConfig).toContain('name: "training-chromium"');
    expect(trainingConfig).toContain('name: "training-mobile-chromium"');
    expect(trainingWorkflow).toContain("PLAYWRIGHT_BASE_URL: http://127.0.0.1:8082");
    expect(trainingWorkflow).toContain('PLAYWRIGHT_USE_PREBUILT_DIST: "true"');
    expect(trainingWorkflow).toContain("pnpm run training:web:baseline");
    expect(trainingWorkflow).toContain("pnpm run training:web:expected-failure");
    expect(trainingWorkflow).not.toContain("e2e/web/");
    expect(phaseOneWorkflow).toContain(
      "PLAYWRIGHT_BASE_URL: ${{ matrix.name == 'training-web-baseline' && 'http://127.0.0.1:8082'",
    );
    expect(trainingNativeWorkflow).toContain("TARGET_SERIALS");
    expect(trainingNativeWorkflow).toContain('"${#TARGET_SERIALS[@]}" -ne 1');
    expect(trainingNativeWorkflow).toContain('test -x "$EMULATOR"');
    expect(trainingNativeWorkflow).toContain('test -x "$AVDMANAGER"');
    expect(trainingNativeWorkflow).toContain("service check package");
    expect(trainingNativeWorkflow).toContain("ro.build.version.sdk");
    expect(trainingNativeWorkflow).toContain("ro.product.cpu.abi");
    expect(trainingNativeWorkflow).toContain("maestro/bin/maestro");
    expect(trainingNativeWorkflow).toContain("--version");
    expect(trainingNativeRunner).toContain('"--device"');
    expect(trainingNativeRunner).toContain("TARGET_SERIAL");
    expect(trainingNativeRunner).toContain("timeout: 300_000");
    expect(trainingNativeRunner).toContain('"maestro.bat"');
    expect(trainingNativeRunner).toContain('shell: process.platform === "win32"');
    expect(androidHelper).toContain("service check package");
    expect(androidHelper).toContain("ro.build.version.sdk");
    expect(androidHelper).toContain("ro.product.cpu.abi");
  });
});
