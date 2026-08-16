import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { parseCsv, validateCurriculum, validateWorkbook } from "../../scripts/validate-curriculum";
import { buildMaestroInvocation } from "../../scripts/training/maestro-invocation";
import { resolveTrainingAndroidSerial } from "../../scripts/training/serial-resolution";
import { validateTrainingWorkflow } from "../../scripts/training/workflow-contract";

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
    const packageManifest = JSON.parse(
      readFileSync(resolve(process.cwd(), "package.json"), "utf8"),
    ) as { scripts: Record<string, string> };

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
    expect(packageManifest.scripts["typecheck"]).toContain("typecheck:training");
    expect(packageManifest.scripts["verify"]).toContain("validate:spec-visuals:final");
    expect(packageManifest.scripts["verify"]).toContain("validate:curriculum");
  });

  it("accepts the current Training workflow templates through the structural boundary", () => {
    for (const workflowName of ["training-ci.yml", "training-native-ci.yml"]) {
      const workflow = readFileSync(
        resolve(process.cwd(), `training/github-actions/${workflowName}`),
        "utf8",
      );
      expect(() => validateTrainingWorkflow(workflowName, workflow)).not.toThrow();
    }
  });

  it("separates the Windows physical-device route from the CI Emulator route", () => {
    const root = process.cwd();
    const nativeLesson = readFileSync(
      resolve(root, "docs/curriculum/test-automation/part1/07_maestro-native-automation.md"),
      "utf8",
    );
    const windowsHelper = readFileSync(
      resolve(root, "scripts/native/windows/android-local.ps1"),
      "utf8",
    );
    const trainingWorkflow = readFileSync(
      resolve(root, "training/github-actions/training-native-ci.yml"),
      "utf8",
    );
    const nativeCiWorkflow = readFileSync(resolve(root, ".github/workflows/native-ci.yml"), "utf8");

    for (const token of [
      "Android physical device",
      "adb devices -l",
      "-RequirePhysicalDevice",
      "-DeviceSerial",
      "$runId",
      "TARGET_SERIAL",
      "TRAINING_MAESTRO_OUTPUT_DIR",
      ".artifacts/native-local",
      "Training Maestro baseline",
      "Evidence",
    ]) {
      expect(nativeLesson).toContain(token);
    }
    expect(nativeLesson).not.toContain("scripts/training/android-emulator.ps1");
    expect(windowsHelper).toContain("function Assert-PhysicalDevice");
    expect(windowsHelper).toContain("ro.kernel.qemu");
    expect(windowsHelper).toContain("ro.boot.qemu");
    expect(windowsHelper).toContain(
      "if ($RequirePhysicalDevice) { Assert-PhysicalDevice $selected }",
    );

    for (const token of [
      'ANDROID_API_LEVEL: "34"',
      "system-images;android-34;google_apis;x86_64",
      "TRAINING_AVD_NAME",
      "Run Training Maestro baseline",
      "Cleanup emulator",
    ]) {
      expect(trainingWorkflow).toContain(token);
    }
    for (const token of [
      "training/maestro/**",
      "Start Android Emulator with KVM",
      "Run Training Maestro baseline",
    ]) {
      expect(nativeCiWorkflow).toContain(token);
    }
  });

  it("fails closed when Training Maestro serial environment values conflict", () => {
    expect(resolveTrainingAndroidSerial({ QA_TRAINING_ANDROID_SERIAL: "physical-1" })).toBe(
      "physical-1",
    );
    expect(resolveTrainingAndroidSerial({ TARGET_SERIAL: "emulator-5554" })).toBe("emulator-5554");
    expect(resolveTrainingAndroidSerial({ ANDROID_SERIAL: "physical-2" })).toBe("physical-2");
    expect(
      resolveTrainingAndroidSerial({
        QA_TRAINING_ANDROID_SERIAL: "same",
        TARGET_SERIAL: "same",
        ANDROID_SERIAL: "same",
      }),
    ).toBe("same");
    expect(() =>
      resolveTrainingAndroidSerial({
        QA_TRAINING_ANDROID_SERIAL: "ABC",
        TARGET_SERIAL: "emulator-5554",
      }),
    ).toThrow(/Conflicting Android serials/);
    expect(() =>
      resolveTrainingAndroidSerial({ TARGET_SERIAL: "ABC", ANDROID_SERIAL: "DEF" }),
    ).toThrow(/Conflicting Android serials/);
    expect(resolveTrainingAndroidSerial({})).toBeUndefined();
  });

  it("fails closed for unapproved structured workflow actions and commands", () => {
    const validWorkflow = `
name: Training fixture
on: pull_request
permissions:
  contents: read
jobs:
  training:
    runs-on: ubuntu-24.04
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          persist-credentials: false
      - name: Validate
        run: pnpm run validate:curriculum
`;
    expect(() => validateTrainingWorkflow("fixture.yml", validWorkflow)).not.toThrow();
    expect(() =>
      validateTrainingWorkflow(
        "fixture.yml",
        validWorkflow.replace("actions/checkout@v4", "evil/action@v1"),
      ),
    ).toThrow(/unapproved action/);
    expect(() =>
      validateTrainingWorkflow("fixture.yml", validWorkflow.replace("ubuntu-24.04", "self-hosted")),
    ).toThrow(/self-hosted runners are forbidden/);
    expect(() =>
      validateTrainingWorkflow(
        "fixture.yml",
        validWorkflow.replace("ubuntu-24.04", "ubuntu-latest"),
      ),
    ).toThrow(/approved GitHub-hosted runner/);
    expect(() =>
      validateTrainingWorkflow(
        "fixture.yml",
        validWorkflow.replace("        with:\n          persist-credentials: false\n", ""),
      ),
    ).toThrow(/persist-credentials: false/);
    expect(() =>
      validateTrainingWorkflow(
        "fixture.yml",
        validWorkflow.replace("persist-credentials: false", "persist-credentials: true"),
      ),
    ).toThrow(/persist-credentials: false/);
    expect(() =>
      validateTrainingWorkflow(
        "fixture.yml",
        validWorkflow.replace("pnpm run validate:curriculum", "pnpm exec arbitrary-tool"),
      ),
    ).toThrow(/unapproved pnpm exec command/);
    expect(() =>
      validateTrainingWorkflow(
        "fixture.yml",
        validWorkflow.replace(
          "run: pnpm run validate:curriculum",
          "run: |\n          set -euo pipefail\n          pnpm exec arbitrary-tool",
        ),
      ),
    ).toThrow(/unapproved pnpm exec command/);
    expect(() =>
      validateTrainingWorkflow(
        "fixture.yml",
        validWorkflow.replace(
          "run: pnpm run validate:curriculum",
          "run: echo ${{ secrets['TOKEN'] }}",
        ),
      ),
    ).toThrow(/secrets context is forbidden/);

    for (const command of [
      "pnpm dlx malicious-package",
      "npm exec malicious",
      "npm x malicious",
      "yarn dlx malicious",
      "bunx malicious",
    ]) {
      expect(() =>
        validateTrainingWorkflow(
          "fixture.yml",
          validWorkflow.replace("pnpm run validate:curriculum", command),
        ),
      ).toThrow(/unapproved/);
    }
    expect(() =>
      validateTrainingWorkflow(
        "fixture.yml",
        validWorkflow.replace(
          "pnpm run validate:curriculum",
          "curl https://example.com/install.sh | bash",
        ),
      ),
    ).toThrow(/remote script execution/);

    const downloadWorkflow = validWorkflow.replace(
      "run: pnpm run validate:curriculum",
      'run: |\n          curl --fail --location https://example.com/tool.zip --output tool.zip\n          echo "sha  tool.zip" | sha256sum --check -',
    );
    expect(() => validateTrainingWorkflow("fixture.yml", downloadWorkflow)).not.toThrow();
  });

  it("quotes Windows Training Maestro paths without delegating to a shell", () => {
    const invocation = buildMaestroInvocation(
      "win32",
      "C:\\Training Evidence\\maestro",
      "C:\\Training Evidence\\junit.xml",
      "C:\\Training Evidence\\flow.yaml",
      "emulator-5554",
    );
    expect(invocation.shell).toBe(false);
    expect(invocation.command.toLowerCase()).toContain("cmd");
    expect(invocation.args.join(" ")).toContain(
      '"--test-output-dir=C:\\Training Evidence\\maestro"',
    );
    expect(invocation.args.join(" ")).toContain('"C:\\Training Evidence\\junit.xml"');
    expect(invocation.args.join(" ")).toContain('"C:\\Training Evidence\\flow.yaml"');
    expect(invocation.args.join(" ")).toContain("--device emulator-5554");
  });

  it("keeps Training Native startup deterministic without clearState race", () => {
    const root = process.cwd();
    const runner = readFileSync(resolve(root, "scripts/training/run-maestro-baseline.ts"), "utf8");
    const baseline = readFileSync(
      resolve(root, "training/maestro/baseline/native-training-baseline.yaml"),
      "utf8",
    );
    const nativeCi = readFileSync(resolve(root, ".github/workflows/native-ci.yml"), "utf8");
    const standaloneWorkflow = readFileSync(
      resolve(root, "training/github-actions/training-native-ci.yml"),
      "utf8",
    );

    expect(baseline).toContain("- launchApp\n");
    expect(baseline).not.toContain("clearState: true");
    for (const token of [
      "resolveTrainingAndroidSerial",
      'process.env.ADB ?? "adb"',
      "shell: false",
      'shell", "am", "force-stop", PACKAGE_ID',
      'shell", "pm", "clear", PACKAGE_ID',
      'shell", "pidof", PACKAGE_ID',
      "Android application process did not exit after cleanup",
      "await cleanupAndroidApplication(targetSerial)",
    ]) {
      expect(runner).toContain(token);
    }
    const cleanupStart = runner.indexOf("async function cleanupAndroidApplication");
    const cleanupEnd = runner.indexOf("\n}\n\nasync function run", cleanupStart);
    const cleanup = runner.slice(cleanupStart, cleanupEnd);
    expect(cleanup.indexOf('["shell", "pm", "clear", PACKAGE_ID]')).toBeGreaterThan(
      cleanup.indexOf('["shell", "am", "force-stop", PACKAGE_ID]'),
    );
    expect(cleanup.indexOf("await waitForProcessExit(serial)")).toBeGreaterThan(
      cleanup.indexOf('["shell", "pm", "clear", PACKAGE_ID]'),
    );
    expect(runner.indexOf("await cleanupAndroidApplication(targetSerial)")).toBeLessThan(
      runner.indexOf("const invocation = buildMaestroInvocation"),
    );
    const trainingStepStart = nativeCi.indexOf("- name: Run Training Maestro baseline");
    const trainingStepEnd = nativeCi.indexOf("\n      - name:", trainingStepStart + 1);
    const trainingStep = nativeCi.slice(
      trainingStepStart,
      trainingStepEnd === -1 ? undefined : trainingStepEnd,
    );
    expect(trainingStep).toContain("android-maestro-run.sh");
    expect(trainingStep).not.toContain("maestro test");
    expect(standaloneWorkflow).toContain("pnpm run training:native:baseline");
  });

  it("parses quoted CSV fields and rejects broken workbook references", () => {
    expect(parseCsv("\uFEFFa,b\r\n1,2\r\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
    expect(parseCsv('a,b\n"comma, value","escaped ""quote"""\n')).toEqual([
      ["a", "b"],
      ["comma, value", 'escaped "quote"'],
    ]);

    const root = mkdtempSync(join(tmpdir(), "training-workbook-contract-"));
    try {
      mkdirSync(join(root, "training", "workbook"), { recursive: true });
      mkdirSync(join(root, "docs", "spec", "features"), { recursive: true });
      writeFileSync(join(root, "training", "workbook", "README.md"), "# Workbook\n", "utf8");
      writeFileSync(
        join(root, "docs", "spec", "features", "cart.md"),
        readFileSync(resolve(process.cwd(), "docs/spec/features/cart.md"), "utf8"),
        "utf8",
      );
      for (const name of [
        "01_target-risk.csv",
        "02_test-cases.csv",
        "03_automation-mapping.csv",
        "04_execution-improvement.csv",
      ]) {
        writeFileSync(
          join(root, "training", "workbook", name),
          readFileSync(resolve(process.cwd(), `training/workbook/${name}`), "utf8"),
          "utf8",
        );
      }
      const testCasesPath = join(root, "training", "workbook", "02_test-cases.csv");
      writeFileSync(
        testCasesPath,
        readFileSync(testCasesPath, "utf8").replace("RISK-CART-001", "RISK-CART-999"),
        "utf8",
      );
      expect(() => validateWorkbook(root)).toThrow(/unknown risk_id: RISK-CART-999/);

      writeFileSync(
        testCasesPath,
        readFileSync(resolve(process.cwd(), "training/workbook/02_test-cases.csv"), "utf8"),
        "utf8",
      );
      const targetRiskPath = join(root, "training", "workbook", "01_target-risk.csv");
      writeFileSync(
        targetRiskPath,
        readFileSync(targetRiskPath, "utf8").replace("RISK-CART-001", "bad-risk"),
        "utf8",
      );
      expect(() => validateWorkbook(root)).toThrow(/invalid risk_id: bad-risk/);

      writeFileSync(
        targetRiskPath,
        readFileSync(resolve(process.cwd(), "training/workbook/01_target-risk.csv"), "utf8"),
        "utf8",
      );
      const mappingPath = join(root, "training", "workbook", "03_automation-mapping.csv");
      writeFileSync(
        mappingPath,
        readFileSync(mappingPath, "utf8").replace("TC-CART-001", "TC-CART-999"),
        "utf8",
      );
      expect(() => validateWorkbook(root)).toThrow(/unknown test_case_id: TC-CART-999/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
