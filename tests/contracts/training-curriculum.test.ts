import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { parseCsv, validateCurriculum, validateWorkbook } from "../../scripts/validate-curriculum";
import { buildMaestroInvocation } from "../../scripts/training/maestro-invocation";
import { resolveTrainingAndroidSerial } from "../../scripts/training/serial-resolution";
import { validateTrainingWorkflow } from "../../scripts/training/workflow-contract";

const require = createRequire(import.meta.url);
const tsxCli = require.resolve("tsx/cli");

describe("Training curriculum contracts", () => {
  it("keeps the required curriculum and Training entrypoints connected", () => {
    const summary = validateCurriculum(process.cwd());

    expect(summary.documents).toBe(22);
    expect(summary.workbookFiles).toBe(4);
    expect(summary.trainingProjects).toEqual(["training-chromium", "training-mobile-chromium"]);
  });

  it("keeps the Common competency and Native specialization contract", () => {
    const rubric = readFileSync(
      resolve(process.cwd(), "docs/curriculum/test-automation/02_competency-rubric.md"),
      "utf8",
    );

    expect(rubric).toContain("Part 1 Common: C01〜C07 + C09〜C10");
    expect(rubric).toContain("Part 2 / Final Common: C01〜C07 + C09〜C12");
    expect(rubric).toContain("C08: Native specialization / Common non-required");
    expect(rubric).toContain(
      "C08 Minimum Evidence: learner-authored Native exercise diff + successful Maestro execution artifact",
    );
    expect(rubric).toContain("Baseline / stock PASSだけではC08 completionにならない");
    expect(rubric).toContain("C12 Common Level 2: bounded Web CI");
  });

  it("keeps the Native specialization branch and rejoin routes", () => {
    const readme = readFileSync(
      resolve(process.cwd(), "docs/curriculum/test-automation/README.md"),
      "utf8",
    );

    expect(readme).toContain("Part 1 Common: P1-6 → P1-8 → P1-9");
    expect(readme).toContain("Part 1 Native: P1-6 → P1-7 → P1-8 → P1-9");
    expect(readme).toContain("Part 2 Common: P2-5 → P2-7 → P2-8");
    expect(readme).toContain("Part 2 Native: P2-5 → P2-6 → P2-7 → P2-8");
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

  it("pins Training Native CI to setup-java v5.7.0 and rejects the v4 SHA", () => {
    const workflowPath = resolve(process.cwd(), "training/github-actions/training-native-ci.yml");
    const workflow = readFileSync(workflowPath, "utf8");
    const v5Action = "actions/setup-java@b6effb05e454b25005698d916606bdc6ffcbf961 # v5.7.0";
    const v4Action = "actions/setup-java@cf277c60eb25467037889841efdb72551f06f6c3";

    expect(workflow).toContain(v5Action);
    expect(workflow).not.toContain(v4Action);
    expect(() => validateTrainingWorkflow("training-native-ci.yml", workflow)).not.toThrow();
    expect(() =>
      validateTrainingWorkflow("training-native-ci.yml", workflow.replace(v5Action, v4Action)),
    ).toThrow(/unapproved action/);
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
    const pinnedCheckoutAction = "actions/checkout@11d5960a326750d5838078e36cf38b85af677262";
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
        uses: ${pinnedCheckoutAction}
        with:
          persist-credentials: false
      - name: Validate
        run: pnpm run validate:curriculum
`;
    expect(() => validateTrainingWorkflow("fixture.yml", validWorkflow)).not.toThrow();
    expect(() =>
      validateTrainingWorkflow(
        "fixture.yml",
        validWorkflow.replace(pinnedCheckoutAction, "evil/action@v1"),
      ),
    ).toThrow(/unapproved action/);
    expect(() =>
      validateTrainingWorkflow(
        "fixture.yml",
        validWorkflow.replace(pinnedCheckoutAction, "actions/checkout@v4"),
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

  it("archives every source workflow before installing the Training workflows", () => {
    const repositoryRoot = process.cwd();
    const sourceRoot = mkdtempSync(join(tmpdir(), "training-copy-workflow-source-"));
    const targetParent = mkdtempSync(join(tmpdir(), "training-copy-workflow-target-"));
    const targetRoot = join(targetParent, "copy");
    const sourceWorkflows = new Map([
      ["ci.yml", "name: source-ci\n"],
      ["native-ci.yml", "name: source-native-ci\n"],
      ["native-ios-ci.yml", "name: source-native-ios-ci\n"],
      ["cross-browser-smoke.yml", "name: source-cross-browser-smoke\n"],
      ["additional-source.yaml", "name: source-additional\n"],
    ]);

    try {
      writeFileSync(join(sourceRoot, ".gitattributes"), "* text=auto eol=lf\n", "utf8");
      mkdirSync(join(sourceRoot, ".github", "workflows"), { recursive: true });
      mkdirSync(join(sourceRoot, "training", "github-actions"), { recursive: true });
      for (const [workflowName, contents] of sourceWorkflows) {
        writeFileSync(join(sourceRoot, ".github", "workflows", workflowName), contents, "utf8");
      }
      for (const workflowName of ["training-ci.yml", "training-native-ci.yml"]) {
        writeFileSync(
          join(sourceRoot, "training", "github-actions", workflowName),
          readFileSync(resolve(repositoryRoot, `training/github-actions/${workflowName}`), "utf8"),
          "utf8",
        );
      }

      execFileSync("git", ["init", "--quiet"], { cwd: sourceRoot, stdio: "pipe" });
      execFileSync("git", ["config", "user.name", "Training Copy Contract"], {
        cwd: sourceRoot,
        stdio: "pipe",
      });
      execFileSync("git", ["config", "user.email", "training-copy-contract@example.test"], {
        cwd: sourceRoot,
        stdio: "pipe",
      });
      execFileSync("git", ["add", "--all"], { cwd: sourceRoot, stdio: "pipe" });
      execFileSync("git", ["commit", "--quiet", "--message", "training copy fixture"], {
        cwd: sourceRoot,
        stdio: "pipe",
      });
      const sourceSha = execFileSync("git", ["rev-parse", "HEAD"], {
        cwd: sourceRoot,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      }).trim();

      execFileSync(
        process.execPath,
        [
          tsxCli,
          resolve(repositoryRoot, "scripts/training/prepare-training-copy.ts"),
          "--source-sha",
          sourceSha,
          "--target",
          targetRoot,
        ],
        { cwd: sourceRoot, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
      );

      const activeWorkflowDirectory = join(targetRoot, ".github", "workflows");
      const archiveDirectory = join(targetRoot, ".github", "training-copy-source-workflows");
      const activeWorkflows = readdirSync(activeWorkflowDirectory)
        .filter((name) => name.endsWith(".yml") || name.endsWith(".yaml"))
        .sort();
      const archivedWorkflows = readdirSync(archiveDirectory)
        .filter((name) => name.endsWith(".yml") || name.endsWith(".yaml"))
        .sort();

      expect(activeWorkflows).toEqual(["training-ci.yml", "training-native-ci.yml"]);
      expect(archivedWorkflows).toEqual([...sourceWorkflows.keys()].sort());
      for (const [workflowName, contents] of sourceWorkflows) {
        expect(readFileSync(join(archiveDirectory, workflowName), "utf8")).toBe(contents);
      }

      const validationOutput = execFileSync(
        process.execPath,
        [
          tsxCli,
          resolve(repositoryRoot, "scripts/training/validate-training-copy.ts"),
          "--root",
          targetRoot,
        ],
        { cwd: targetRoot, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
      );
      expect(validationOutput).toContain(`Training Copy validation passed for ${sourceSha}`);
    } finally {
      rmSync(targetParent, { recursive: true, force: true });
      rmSync(sourceRoot, { recursive: true, force: true });
    }
  }, 30_000);

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
