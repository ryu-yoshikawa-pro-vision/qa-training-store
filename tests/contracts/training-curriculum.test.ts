import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { parseCsv, validateCurriculum, validateWorkbook } from "../../scripts/validate-curriculum";
import { buildMaestroInvocation } from "../../scripts/training/maestro-invocation";
import { resolveTrainingAndroidSerial } from "../../scripts/training/serial-resolution";
import {
  TRAINING_WEB_CI_EXERCISE_COMMAND,
  validateTrainingWorkflow,
} from "../../scripts/training/workflow-contract";

const require = createRequire(import.meta.url);
const tsxCli = require.resolve("tsx/cli");

describe("Training curriculum contracts", () => {
  it("keeps the required curriculum and Training entrypoints connected", () => {
    const summary = validateCurriculum(process.cwd());

    expect(summary.documents).toBe(22);
    expect(summary.workbookFiles).toBe(4);
    expect(summary.trainingProjects).toEqual(["training-chromium", "training-mobile-chromium"]);
  });

  it("exposes the self-study contract in every canonical lesson", () => {
    const lessons = [
      ["P1-01", "part1/01_test-automation-foundations.md"],
      ["P1-02", "part1/02_scenario-shop-analysis.md"],
      ["P1-03", "part1/03_test-design-and-automation-selection.md"],
      ["P1-04", "part1/04_playwright-foundations.md"],
      ["P1-05", "part1/05_playwright-e2e-practice.md"],
      ["P1-06", "part1/06_execution-and-failure-analysis.md"],
      ["P1-07", "part1/07_maestro-native-automation.md"],
      ["P1-08", "part1/08_test-management-and-maintainability.md"],
      ["P1-09", "part1/09_part1-capstone.md"],
      ["P2-01", "part2/01_software-development-process.md"],
      ["P2-02", "part2/02_git-version-control.md"],
      ["P2-03", "part2/03_github-pull-request-review.md"],
      ["P2-04", "part2/04_ci-github-actions.md"],
      ["P2-05", "part2/05_playwright-ci.md"],
      ["P2-06", "part2/06_native-ci-maestro.md"],
      ["P2-07", "part2/07_ci-cd-quality-gates.md"],
      ["P2-08", "part2/08_integration-design-capstone.md"],
    ] as const;
    const requiredLabels = [
      "Input",
      "Activity",
      "Observation",
      "Output",
      "Self-check",
      "Completion",
      "Recovery",
      "Handoff",
    ];
    for (const [, relativePath] of lessons) {
      const lesson = readFileSync(
        resolve(process.cwd(), "docs/curriculum/test-automation", relativePath),
        "utf8",
      );
      expect(lesson).toContain("## このLessonのInput / Output");
      for (const label of requiredLabels) expect(lesson).toContain(`| ${label} |`);
    }
  });

  it("keeps the learner-facing contracts for risk, diagnostics, maintenance, and GitHub", () => {
    const root = process.cwd();
    const readLesson = (relativePath: string) =>
      readFileSync(resolve(root, "docs/curriculum/test-automation", relativePath), "utf8");
    const riskLesson = readLesson("part1/02_scenario-shop-analysis.md");
    const designLesson = readLesson("part1/03_test-design-and-automation-selection.md");
    const foundationsLesson = readLesson("part1/04_playwright-foundations.md");
    const practiceLesson = readLesson("part1/05_playwright-e2e-practice.md");
    const failureLesson = readLesson("part1/06_execution-and-failure-analysis.md");
    const maintenanceLesson = readLesson("part1/08_test-management-and-maintainability.md");
    const githubLesson = readLesson("part2/03_github-pull-request-review.md");
    const actionsLesson = readLesson("part2/04_ci-github-actions.md");
    const playwrightCiLesson = readLesson("part2/05_playwright-ci.md");
    const capstoneLesson = readLesson("part2/08_integration-design-capstone.md");

    expect(riskLesson).toContain("Riskは「何かが起きるかもしれない」という不確実さ");
    for (const term of ["Impact", "Likelihood", "Priority", "購入上限を超えたCartが成立する"]) {
      expect(riskLesson).toContain(term);
    }
    expect(riskLesson).toContain("機械的に掛け合わせて答えを出すことが目的ではなく");
    expect(riskLesson).toContain("判断理由は分析メモまたはSelf-checkへ残す");
    expect(riskLesson).not.toContain(
      "Risk行には`impact`、`likelihood`、`priority`とそれぞれの判断理由を残す",
    );
    expect(designLesson).toContain("Impact、Likelihood、Priorityは、Caseを作るときの判断材料です");
    expect(designLesson).toContain("02_test-cases.csv");
    expect(designLesson).toContain("03_automation-mapping.csv");
    expect(designLesson).toContain("04_execution-improvement.csv");

    expect(foundationsLesson).toContain("このLessonで読む範囲");
    expect(foundationsLesson).toContain("TC-PRODUCT-001");
    expect(foundationsLesson).toContain("このLessonだけで始められる導入Case");
    expect(foundationsLesson).toContain("Common CompletionのCaseへ流用しません");
    expect(foundationsLesson).toContain("test(...)");
    expect(foundationsLesson).toContain("Scenario Resetの呼び出し");
    expect(foundationsLesson).toContain("page.evaluate");
    expect(foundationsLesson).toContain("この段階では、上記の構文を一語ずつ説明できなくても");

    expect(practiceLesson).toContain("配布sampleとして扱い");
    expect(practiceLesson).toContain("TC-CART-001");
    expect(practiceLesson).toContain("`TC-CART-101`");
    expect(practiceLesson).toContain("`TC-CART-102`");
    expect(practiceLesson).toContain("--project training-mobile-chromium");
    expect(practiceLesson).toContain("--run-context mobile-exercise");
    expect(practiceLesson).not.toContain("配布sampleのIDを使う場合でも");

    for (const term of [
      "通常Exerciseで使う固定入口",
      "--suite exercise",
      "--run-context diagnostic-initial",
      "--run-context diagnostic-repaired",
      "BLOCKED",
      "Error Message",
      "Screenshot",
      "Video",
      "Trace",
      "HTML Report",
      "別Receipt・別Evidence",
    ]) {
      expect(failureLesson).toContain(term);
    }
    expect(failureLesson).toContain(
      "Receiptの内部Schemaや全引数を理解することは学習目標ではありません",
    );
    expect(failureLesson).toContain("<handoff-root>/code/training/playwright/exercises/");
    expect(failureLesson).toContain("Runnerが読むローカルのコード実行root");
    expect(failureLesson).toContain("Canonical Helperは受講者成果物ではない");
    expect(failureLesson).not.toContain(
      "reset-scenario.ts（P1-5と同じCanonical Helperを必ず置く）",
    );

    expect(maintenanceLesson).toContain("決定的なC10演習");
    expect(maintenanceLesson).toContain("c10-improved");
    expect(maintenanceLesson).toContain("c10-before");
    expect(maintenanceLesson).toContain("01_target-risk.csv");
    expect(maintenanceLesson).toContain("<handoff-root>/code/training/playwright/exercises/");
    expect(maintenanceLesson).toContain("reset-scenario.ts");
    expect(maintenanceLesson).toContain("新しい製品Riskを追加する理由にはしません");
    expect(maintenanceLesson).toContain("Improvement Target");
    expect(maintenanceLesson).not.toContain("RISK-CART-103");
    expect(maintenanceLesson).toContain("e2e/web/fixtures.ts");
    const maintenanceExercise = readFileSync(
      resolve(root, "training/playwright/maintenance-exercises/c10-locator-maintenance.spec.ts"),
      "utf8",
    );
    const repeatedLocator = 'page.getByRole("heading", { name: "すべての商品" })';
    expect(maintenanceExercise.split(repeatedLocator).length - 1).toBe(2);
    expect(maintenanceExercise).toContain("repeats the same Locator");
    expect(maintenanceExercise).not.toContain("const productsHeading");

    for (const term of [
      "git remote -v",
      "git branch --show-current",
      "git push -u <writable-remote> <branch>",
      "Base",
      "Compare / Head",
      "Files changed",
      "Checks",
      "Review",
      "New pull request",
      "Submit review",
    ]) {
      expect(githubLesson).toContain(term);
    }
    expect(githubLesson).toContain("`Reason:`");
    expect(actionsLesson).toContain(
      "Localで実行していたTest CommandとCI Stepを対応付けて説明できる",
    );
    expect(actionsLesson).toContain("main／scheduleはProduction比較の参考情報");
    for (const term of [
      "環境配布カード",
      "Training Copy URL:",
      "Writable remote:",
      "Actions enabled:",
    ]) {
      expect(actionsLesson).toContain(term);
    }
    for (const term of [
      "Localの`handoff-root/`",
      "CI Runner上の`.`",
      "GitHub Actions Artifact",
      "自動的に昇格しない",
      "training-web-<run_id>-<run_attempt>",
      "Artifact: <Artifact name>",
      "output/training/playwright",
      "PR → Checks → `Scenario Shop Training Web` → Run Summary → Artifacts",
    ]) {
      expect(playwrightCiLesson).toContain(term);
    }
    expect(capstoneLesson).toContain("共通シナリオ:");
    expect(capstoneLesson).toContain("これはCommonの必須条件ではない");
    expect(capstoneLesson).toContain("最終成果物の照合");
    expect(capstoneLesson).toContain("Training Copy上のRun、Check、Artifact");
    expect(capstoneLesson).toContain("handoff-root/self-check/P2-08.md");
    expect(capstoneLesson).not.toContain(
      "WebはBuildして公開し、NativeはAndroidでBuild + Runtime E2E、iOSでBuild-onlyの保証を設計する必要がある。",
    );
  });

  it("keeps the distributed starter as an uncompleted scaffold", () => {
    const starterPath = resolve(
      process.cwd(),
      "training/playwright/exercises/training-exercise-starter.spec.ts",
    );
    const source = readFileSync(starterPath, "utf8");
    expect(source).toContain('import { test } from "@playwright/test";');
    expect(source).not.toMatch(/\bexpect\s*\(/);
    expect(source).toContain('resetScenario(page, "default")');
    expect(() => validateCurriculum(process.cwd())).not.toThrow();
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

  it("keeps canonical diagnostic workbook rows learner-owned", () => {
    const rows = parseCsv(
      readFileSync(
        resolve(process.cwd(), "training/workbook/04_execution-improvement.csv"),
        "utf8",
      ),
    );
    const headers = rows[0] ?? [];
    const contextIndex = headers.indexOf("run_context");
    const resultIndex = headers.indexOf("result");
    const diagnosticIndexes = [
      headers.indexOf("evidence"),
      headers.indexOf("failure_category"),
      headers.indexOf("cause"),
      headers.indexOf("action"),
      headers.indexOf("improvement"),
    ];
    const diagnosticRows = rows
      .slice(1)
      .filter((row) => row[contextIndex]?.startsWith("Training Web diagnostic"));

    expect(diagnosticRows).toHaveLength(2);
    for (const row of diagnosticRows) {
      expect(row[resultIndex]).toBe("Not run");
      for (const index of diagnosticIndexes) expect(row[index]?.trim()).toBe("");
    }
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
    const trainingWorkflowReadme = readFileSync(
      resolve(process.cwd(), "training/github-actions/README.md"),
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
    expect(trainingWorkflow).toContain(TRAINING_WEB_CI_EXERCISE_COMMAND);
    expect(trainingWorkflow).not.toContain("run: pnpm run training:web:exercise\n");
    expect(trainingWorkflow).toContain("pnpm run training:web:exercise:with-receipt");
    expect(trainingWorkflow).toContain("pnpm run training:web:check-expected-failure");
    expect(trainingWorkflowReadme).toContain("training-web-<run_id>-<run_attempt>");
    expect(trainingWorkflowReadme).toContain("output/training/playwright");
    expect(trainingWorkflowReadme).toContain("receipts");
    expect(trainingWorkflowReadme).toContain("evidence");
    expect(trainingWorkflow).not.toContain("pnpm run training:web:expected-failure");
    expect(trainingWorkflow).not.toContain("e2e/web/");
    const baselineStep = trainingWorkflow.indexOf("run: pnpm run training:web:baseline");
    const exerciseStep = trainingWorkflow.indexOf(`run: ${TRAINING_WEB_CI_EXERCISE_COMMAND}`);
    expect(exerciseStep).toBeGreaterThan(baselineStep);
    expect(trainingWorkflow).toContain("if: github.event_name == 'pull_request'");
    expect(phaseOneWorkflow).toContain(
      "PLAYWRIGHT_BASE_URL: ${{ matrix.name == 'training-web-baseline' && 'http://127.0.0.1:8082'",
    );
    expect(packageManifest.scripts["typecheck"]).toContain("typecheck:training");
    expect(packageManifest.scripts["verify"]).toContain("validate:spec-visuals:final");
    expect(packageManifest.scripts["verify"]).toContain("validate:curriculum");
  });

  it("keeps the Training Web exercise pull_request condition on its own step", () => {
    const trainingWorkflow = readFileSync(
      resolve(process.cwd(), "training/github-actions/training-ci.yml"),
      "utf8",
    );
    const exerciseCondition =
      "        if: github.event_name == 'pull_request'\n        run: pnpm run training:web:exercise:with-receipt -- --suite exercise --project training-chromium --root . --run-context ci-exercise";
    const exerciseWithoutCondition = trainingWorkflow.replace(
      exerciseCondition,
      "        run: pnpm run training:web:exercise:with-receipt -- --suite exercise --project training-chromium --root . --run-context ci-exercise",
    );
    expect(() => validateTrainingWorkflow("training-ci.yml", trainingWorkflow)).not.toThrow();
    expect(() => validateTrainingWorkflow("training-ci.yml", exerciseWithoutCondition)).toThrow(
      /exercise step must set/,
    );

    const movedCondition = exerciseWithoutCondition.replace(
      "        if: github.event_name != 'workflow_dispatch' || inputs.mode == 'baseline'\n        run: pnpm run training:web:baseline",
      "        if: github.event_name == 'pull_request'\n        run: pnpm run training:web:baseline",
    );
    expect(() => validateTrainingWorkflow("training-ci.yml", movedCondition)).toThrow(
      /exercise step must set/,
    );
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
      "-RequirePhysicalDevice",
      "-DeviceSerial",
      "$runId",
      "TARGET_SERIAL",
      "TRAINING_MAESTRO_OUTPUT_DIR",
      ".artifacts/native-local",
      "pnpm run training:native:baseline",
      "pnpm run training:native:exercise",
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
    const runner = readFileSync(resolve(root, "scripts/training/maestro-runner.ts"), "utf8");
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
    const cleanupEnd = runner.indexOf("\n}\n\nexport async function runMaestro", cleanupStart);
    const cleanup = runner.slice(cleanupStart, cleanupEnd);
    const forceStopCommand = 'runAdb(serial, ["shell", "am", "force-stop", PACKAGE_ID])';
    const firstForceStop = cleanup.indexOf(forceStopCommand);
    const clearCommand = cleanup.indexOf('["shell", "pm", "clear", PACKAGE_ID]');
    const clearSuccess = cleanup.indexOf(
      "clearResult.status !== 0 || !/Success/i.test(clearOutput)",
    );
    const secondForceStop = cleanup.indexOf(forceStopCommand, firstForceStop + 1);
    expect(cleanup.indexOf("assertDeviceReady(serial)")).toBeLessThan(firstForceStop);
    expect(clearCommand).toBeGreaterThan(firstForceStop);
    expect(clearSuccess).toBeGreaterThan(clearCommand);
    expect(secondForceStop).toBeGreaterThan(clearSuccess);
    expect(cleanup.indexOf("await waitForProcessExit(serial)")).toBeGreaterThan(secondForceStop);
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

  it("keeps the Native Training workflow opt-in and separates baseline from exercise evidence", () => {
    const workflow = readFileSync(
      resolve(process.cwd(), "training/github-actions/training-native-ci.yml"),
      "utf8",
    );
    const pullRequestBlock = workflow.match(
      /  pull_request:\r?\n([\s\S]*?)  workflow_dispatch:/,
    )?.[1];
    expect(pullRequestBlock).toBe(
      [
        "    paths:",
        '      - "training/maestro/**"',
        '      - "scripts/training/run-maestro-baseline.ts"',
        '      - "scripts/training/run-maestro-exercise.ts"',
        '      - "scripts/training/maestro-runner.ts"',
        '      - "scripts/training/maestro-invocation.ts"',
        '      - "scripts/training/serial-resolution.ts"',
        '      - ".github/workflows/training-native-ci.yml"',
        "",
      ].join("\n"),
    );
    expect(workflow).toContain("name: Training Android Maestro\n");
    expect(workflow).not.toContain("Training Android Maestro baseline");
    expect(workflow).not.toContain("inputs:");
    expect(workflow).not.toContain("inputs.");
    expect(workflow).not.toContain('"package.json"');
    expect(workflow).not.toContain('"docs/**"');

    const baselineStep = workflow.indexOf("run: pnpm run training:native:baseline");
    const exerciseStep = workflow.indexOf("run: pnpm run training:native:exercise");
    expect(baselineStep).toBeGreaterThan(-1);
    expect(exerciseStep).toBeGreaterThan(baselineStep);
    expect(workflow).toContain("TRAINING_MAESTRO_OUTPUT_DIR: output/training/maestro/baseline");
    expect(workflow).toContain("TRAINING_MAESTRO_OUTPUT_DIR: output/training/maestro/exercise");
    expect(workflow).toContain("if: always()");
    expect(workflow).toContain('cp -R output/training/maestro "$evidence/maestro"');
  });

  it("keeps the Native exercise entry on the canonical execution graph", () => {
    const root = process.cwd();
    const exercise = readFileSync(
      resolve(root, "training/maestro/exercises/native-training-exercise.yaml"),
      "utf8",
    );
    const nativeLesson = readFileSync(
      resolve(root, "docs/curriculum/test-automation/part1/07_maestro-native-automation.md"),
      "utf8",
    );

    expect(exercise).toContain("- runFlow: ../baseline/native-training-baseline.yaml");
    expect(nativeLesson).toContain(
      "Native learner exerciseのcanonical entryは `training/maestro/exercises/native-training-exercise.yaml`",
    );
    expect(nativeLesson).toContain("unreferenced sibling YAML");
    expect(nativeLesson).toContain("1 runId = 1 baseline → exercise → Evidence attempt");
    expect(nativeLesson).toContain("training-native-exercise.xml");
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
      const mappingSource = readFileSync(mappingPath, "utf8");
      for (const decision of ["Automate", "Later", "Do not automate"]) {
        writeFileSync(
          mappingPath,
          mappingSource.replace("TC-CART-001,Automate", `TC-CART-001,${decision}`),
          "utf8",
        );
        expect(() => validateWorkbook(root)).not.toThrow();
      }
      for (const decision of ["Yes", "No"]) {
        writeFileSync(
          mappingPath,
          mappingSource.replace("TC-CART-001,Automate", `TC-CART-001,${decision}`),
          "utf8",
        );
        expect(() => validateWorkbook(root)).toThrow(/invalid automation_decision/);
      }
      writeFileSync(mappingPath, mappingSource, "utf8");
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

  it("enforces execution context and result state contracts without requiring runtime evidence files", () => {
    const root = mkdtempSync(join(tmpdir(), "training-execution-contract-"));
    const repositoryRoot = process.cwd();
    try {
      mkdirSync(join(root, "training", "workbook"), { recursive: true });
      mkdirSync(join(root, "docs", "spec", "features"), { recursive: true });
      writeFileSync(join(root, "training", "workbook", "README.md"), "# Workbook\n", "utf8");
      writeFileSync(
        join(root, "docs", "spec", "features", "cart.md"),
        readFileSync(resolve(repositoryRoot, "docs/spec/features/cart.md"), "utf8"),
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
          readFileSync(resolve(repositoryRoot, `training/workbook/${name}`), "utf8"),
          "utf8",
        );
      }

      const executionPath = join(root, "training", "workbook", "04_execution-improvement.csv");
      const source = readFileSync(executionPath, "utf8");
      expect(() => validateWorkbook(root)).not.toThrow();

      writeFileSync(
        executionPath,
        source.replace("TC-CART-002,Training Web exercise", "TC-CART-001,Training Web rerun"),
        "utf8",
      );
      expect(() => validateWorkbook(root)).not.toThrow();

      writeFileSync(
        executionPath,
        source.replace("TC-CART-001,Training Web exercise,Not run", "TC-CART-001,,Not run"),
        "utf8",
      );
      expect(() => validateWorkbook(root)).toThrow(/non-empty run_context/);

      writeFileSync(
        executionPath,
        source.replace("TC-CART-002,Training Web exercise", "TC-CART-001, Training Web exercise "),
        "utf8",
      );
      expect(() => validateWorkbook(root)).toThrow(/repeats test_case_id and run_context/);

      writeFileSync(
        executionPath,
        source.replace(
          "TC-CART-001,Training Web exercise,Not run",
          "TC-CART-001,Training Web exercise,Pending",
        ),
        "utf8",
      );
      expect(() => validateWorkbook(root)).toThrow(/invalid result: Pending/);

      writeFileSync(
        executionPath,
        source.replace(
          "TC-CART-001,Training Web exercise,Not run,,,,,",
          "TC-CART-001,Training Web exercise,Not run,planned evidence,,,,",
        ),
        "utf8",
      );
      expect(() => validateWorkbook(root)).toThrow(/evidence blank when result is Not run/);

      writeFileSync(
        executionPath,
        source.replace(
          "TC-CART-001,Training Web exercise,Not run,,,,,",
          "TC-CART-001,Training Web exercise,Pass,github-actions-artifact/training-web,,,,",
        ),
        "utf8",
      );
      expect(() => validateWorkbook(root)).not.toThrow();

      for (const evidence of [
        "github-actions-artifact/training-web",
        "https://github.com/example/repo/actions/runs/123",
        "http://example.com/report",
        "Run 123 / diagnostic initial",
        "output/training/playwright/report",
        "output/training/playwright/missing-report",
        "Trace:https://github.com/example/repository/actions/runs/123",
        "Trace:http://example.com/report",
        "Trace: https://github.com/example/repository/actions/runs/123",
        "Trace: https://github.com/example/repo/actions/runs/123",
        "Trace:https://github.com/example/repo/actions/runs/123",
        "Trace: github-actions-artifact/training-web",
        "Trace:github-actions-artifact/training-web",
        "Trace: output/training/playwright/report",
        "Trace:output/training/playwright/report",
        "Trace: Run 123 / diagnostic initial",
        "Trace:Run 123 / diagnostic initial",
      ]) {
        writeFileSync(
          executionPath,
          source.replace(
            "TC-CART-001,Training Web exercise,Not run,,,,,",
            `TC-CART-001,Training Web exercise,Pass,${evidence},,,,`,
          ),
          "utf8",
        );
        expect(() => validateWorkbook(root)).not.toThrow();
      }

      for (const evidence of [
        "/home/user/report.zip",
        "\\\\absolute\\\\windows\\\\path",
        "C:\\Users\\user\\report.zip",
        "C:/Users/user/report.zip",
        "C:Users\\user\\report.zip",
        "file:///C:/Users/user/report.zip",
        "file:///home/user/report.zip",
        "../outside/report.zip",
        "..\\outside\\report.zip",
        "Trace: C:\\Users\\user\\report.zip",
        "Trace: C:Users\\user\\report.zip",
        "Trace: \\\\server\\share\\report.zip",
        "Trace:C:\\Users\\user\\trace.zip",
        "Trace:C:Users\\user\\trace.zip",
        "Trace:file:///home/user/trace.zip",
        "Trace:../outside/report.zip",
        "Trace:..\\outside\\report.zip",
        "Trace:\\\\server\\share\\report.zip",
        "Trace: /home/user/report.zip",
        "Trace: file:///home/user/report.zip",
        "Trace: ../outside/report.zip",
        "Trace: ..\\outside\\report.zip",
        "Trace:https:../outside/report.zip",
        "Trace:http:..\\outside\\report.zip",
        "Trace:https:C:trace.zip",
        "Trace:[../outside/report.zip]",
        "Trace:[/home/user/trace.zip]",
        "Trace:[\\\\server\\share\\trace.zip]",
        "Trace:[C:Users\\user\\trace.zip]",
        "Trace:`../outside/report.zip`",
        "Trace:`/home/user/trace.zip`",
        "Trace:`\\\\server\\share\\trace.zip`",
        "Trace:`C:Users\\user\\trace.zip`",
        "Trace-../outside/report.zip",
        "Evidence[/home/user/trace.zip",
      ]) {
        writeFileSync(
          executionPath,
          source.replace(
            "TC-CART-001,Training Web exercise,Not run,,,,,",
            `TC-CART-001,Training Web exercise,Pass,${evidence},,,,`,
          ),
          "utf8",
        );
        expect(() => validateWorkbook(root)).toThrow();
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
