import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const REQUIRED_CURRICULUM_FILES = [
  "docs/curriculum/test-automation/README.md",
  "docs/curriculum/test-automation/00_learning-design.md",
  "docs/curriculum/test-automation/01_spreadsheet-test-design.md",
  "docs/curriculum/test-automation/02_competency-rubric.md",
  "docs/curriculum/test-automation/03_instructor-reference.md",
  ...Array.from({ length: 9 }, (_, index) => {
    const names = [
      "test-automation-foundations",
      "scenario-shop-analysis",
      "test-design-and-automation-selection",
      "playwright-foundations",
      "playwright-e2e-practice",
      "execution-and-failure-analysis",
      "maestro-native-automation",
      "test-management-and-maintainability",
      "part1-capstone",
    ];
    return `docs/curriculum/test-automation/part1/${String(index + 1).padStart(2, "0")}_${names[index]}.md`;
  }),
  ...Array.from({ length: 8 }, (_, index) => {
    const names = [
      "software-development-process",
      "git-version-control",
      "github-pull-request-review",
      "ci-github-actions",
      "playwright-ci",
      "native-ci-maestro",
      "ci-cd-quality-gates",
      "integration-design-capstone",
    ];
    return `docs/curriculum/test-automation/part2/${String(index + 1).padStart(2, "0")}_${names[index]}.md`;
  }),
] as const;

const WORKBOOK_HEADERS: Record<string, readonly string[]> = {
  "01_target-risk.csv": [
    "target_id",
    "spec_ref",
    "br_ids",
    "ac_ids",
    "risk_id",
    "risk_description",
    "impact",
    "likelihood",
    "priority",
  ],
  "02_test-cases.csv": [
    "test_case_id",
    "risk_id",
    "spec_ref",
    "br_ids",
    "ac_ids",
    "test_condition",
    "precondition",
    "expected_result",
    "design_technique",
  ],
  "03_automation-mapping.csv": [
    "test_case_id",
    "automation_decision",
    "test_layer",
    "tool",
    "implementation_path",
    "execution_timing",
    "reason",
  ],
  "04_execution-improvement.csv": [
    "test_case_id",
    "run_context",
    "result",
    "evidence",
    "failure_category",
    "cause",
    "action",
    "improvement",
  ],
};

export type CurriculumSummary = {
  documents: number;
  workbookFiles: number;
  trainingProjects: string[];
};

function fail(message: string): never {
  throw new Error(`Curriculum validation failed: ${message}`);
}

function read(rootDir: string, relativePath: string): string {
  const absolutePath = path.join(rootDir, relativePath);
  if (!fs.existsSync(absolutePath)) fail(`missing required file: ${relativePath}`);
  return fs.readFileSync(absolutePath, "utf8");
}

function assertContains(text: string, token: string, context: string): void {
  if (!text.includes(token)) fail(`${context} is missing: ${token}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parsePackageScripts(text: string): Record<string, string> {
  const value: unknown = JSON.parse(text);
  if (!isRecord(value)) fail("package.json must be an object");
  const scripts = value.scripts;
  if (!isRecord(scripts)) fail("package.json scripts must be an object");
  const result: Record<string, string> = {};
  for (const [name, command] of Object.entries(scripts)) {
    if (typeof command !== "string") fail("package.json scripts must contain only string commands");
    result[name] = command;
  }
  return result;
}

function validateCurriculumLinks(rootDir: string): void {
  for (const relativePath of REQUIRED_CURRICULUM_FILES) {
    const text = read(rootDir, relativePath);
    const links = [...text.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)].map((match) => match[1] ?? "");
    for (const link of links) {
      if (/^(?:https?:|mailto:)/i.test(link)) continue;
      const [target] = link.split("#", 1);
      if (!target) continue;
      const absoluteTarget = path.resolve(rootDir, path.dirname(relativePath), target);
      if (!fs.existsSync(absoluteTarget)) fail(`${relativePath} links to missing target: ${link}`);
    }
  }
}

function validateWorkbook(rootDir: string): number {
  const workbookRoot = path.join(rootDir, "training", "workbook");
  const readCsv = (name: string): string[] => {
    const text = read(rootDir, `training/workbook/${name}`);
    const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
    const expected = WORKBOOK_HEADERS[name];
    if (!expected) fail(`unknown workbook contract: ${name}`);
    if ((lines[0] ?? "").split(",").join("|") !== expected.join("|")) {
      fail(`${name} header does not match the canonical schema`);
    }
    return lines;
  };

  for (const [name, headers] of Object.entries(WORKBOOK_HEADERS)) {
    const lines = readCsv(name);
    if (lines.length < 2) fail(`${name} must contain a small traceable sample row`);
    const headerIndex = new Map(headers.map((header, index) => [header, index]));
    for (const line of lines.slice(1)) {
      const cells = line.split(",");
      for (const idField of ["br_ids", "ac_ids"]) {
        const index = headerIndex.get(idField);
        if (index === undefined) continue;
        const value = cells[index] ?? "";
        if (!value) continue;
        const ids = value.split(";");
        if (ids.some((id) => id.trim() !== id))
          fail(`${name} uses whitespace around a multiple-ID field`);
        if (new Set(ids).size !== ids.length) fail(`${name} repeats an ID in ${idField}`);
        const pattern = idField === "br_ids" ? /^BR-[A-Z0-9]+-\d{3}$/ : /^AC-[A-Z0-9]+-\d{3}$/;
        if (ids.some((id) => !pattern.test(id)))
          fail(`${name} has an invalid ${idField} value: ${value}`);
      }
      const specIndex = headerIndex.get("spec_ref");
      if (specIndex !== undefined) {
        const specRef = cells[specIndex] ?? "";
        if (!specRef.startsWith("docs/spec/") || !fs.existsSync(path.join(rootDir, specRef))) {
          fail(`${name} has an invalid spec_ref: ${specRef}`);
        }
      }
    }
  }
  if (!fs.existsSync(path.join(workbookRoot, "README.md")))
    fail("training/workbook/README.md is missing");
  return Object.keys(WORKBOOK_HEADERS).length;
}

function validateTrainingAssets(rootDir: string): string[] {
  const config = read(rootDir, "playwright.training.config.ts");
  assertContains(config, 'testDir: "./training/playwright"', "Training Playwright config");
  for (const project of ["training-chromium", "training-mobile-chromium"]) {
    assertContains(config, `name: "${project}"`, "Training Playwright config");
  }
  for (const requiredPath of [
    "training/playwright/baseline",
    "training/playwright/exercises",
    "training/playwright/failure-exercises",
    "training/maestro/baseline",
    "training/maestro/exercises",
    "training/maestro/failure-exercises",
    "training/github-actions/training-ci.yml",
    "training/github-actions/training-native-ci.yml",
    "scripts/training/prepare-training-copy.ts",
    "scripts/training/validate-training-copy.ts",
    "scripts/training/android-emulator.ps1",
    "tsconfig.training.json",
  ]) {
    if (!fs.existsSync(path.join(rootDir, requiredPath)))
      fail(`missing Training asset: ${requiredPath}`);
  }
  const nativeFlow = read(rootDir, "training/maestro/baseline/native-training-baseline.yaml");
  assertContains(nativeFlow, "com.ryuyoshikawa.scenarioshop", "Training Maestro baseline");
  assertContains(nativeFlow, "scenario-shop://test-control/reset", "Training Maestro baseline");
  const nativeRunner = read(rootDir, "scripts/training/run-maestro-baseline.ts");
  assertContains(nativeRunner, '"--device"', "Training Maestro runner");
  assertContains(nativeRunner, "TARGET_SERIAL", "Training Maestro runner");
  assertContains(nativeRunner, "timeout: 300_000", "Training Maestro runner");
  assertContains(nativeRunner, '"maestro.bat"', "Training Maestro runner Windows command");
  assertContains(
    nativeRunner,
    'shell: process.platform === "win32"',
    "Training Maestro runner Windows shell",
  );
  const androidHelper = read(rootDir, "scripts/training/android-emulator.ps1");
  assertContains(androidHelper, "service check package", "Android Training helper");
  assertContains(androidHelper, "ro.build.version.sdk", "Android Training helper");
  assertContains(androidHelper, "ro.product.cpu.abi", "Android Training helper");

  const webWorkflow = read(rootDir, "training/github-actions/training-ci.yml");
  const nativeWorkflow = read(rootDir, "training/github-actions/training-native-ci.yml");
  assertContains(
    webWorkflow,
    "PLAYWRIGHT_BASE_URL: http://127.0.0.1:8082",
    "Training Web Workflow",
  );
  assertContains(webWorkflow, 'PLAYWRIGHT_USE_PREBUILT_DIST: "true"', "Training Web Workflow");
  for (const [name, workflow] of [
    ["training-ci.yml", webWorkflow],
    ["training-native-ci.yml", nativeWorkflow],
  ] as const) {
    assertContains(workflow, "permissions:\n  contents: read", name);
    assertContains(workflow, "persist-credentials: false", name);
    assertContains(workflow, "if: always()", name);
    for (const forbidden of [
      "contents: write",
      "id-token: write",
      "secrets.",
      "environment:",
      "self-hosted",
      "cloudflare",
      "wrangler",
    ]) {
      if (workflow.includes(forbidden))
        fail(`${name} contains forbidden Trust Boundary token: ${forbidden}`);
    }
  }
  for (const required of [
    "runs-on: ubuntu-24.04",
    'java-version: "17"',
    'ANDROID_API_LEVEL: "34"',
    "google_apis",
    "x86_64",
    "KVM",
    "sys.boot_completed",
    "service check package",
    "ro.build.version.sdk",
    "ro.product.cpu.abi",
    'MAESTRO_VERSION: "2.8.0"',
    "maestro/bin/maestro",
    "--version",
    "timeout",
    "adb devices",
    "TARGET_SERIALS",
    '"${#TARGET_SERIALS[@]}" -ne 1',
    'test -x "$EMULATOR"',
    'test -x "$AVDMANAGER"',
    "-avd",
  ])
    assertContains(nativeWorkflow, required, "Training Android Workflow");
  return ["training-chromium", "training-mobile-chromium"];
}

export function validateCurriculum(rootDir = process.cwd()): CurriculumSummary {
  for (const relativePath of REQUIRED_CURRICULUM_FILES) read(rootDir, relativePath);
  const rubric = read(rootDir, "docs/curriculum/test-automation/02_competency-rubric.md");
  const instructor = read(rootDir, "docs/curriculum/test-automation/03_instructor-reference.md");
  for (const competency of Array.from(
    { length: 12 },
    (_, index) => `C${String(index + 1).padStart(2, "0")}`,
  )) {
    assertContains(rubric, competency, "Competency Rubric");
  }
  for (const level of ["Level 0", "Level 1", "Level 2", "Level 3"])
    assertContains(rubric, level, "Competency Rubric");
  for (const contract of [
    "Expected Contract",
    "Alternative Design",
    "Anti-pattern",
    "Public Reference",
  ])
    assertContains(instructor, contract, "Instructor Reference");
  validateCurriculumLinks(rootDir);
  const workbookFiles = validateWorkbook(rootDir);
  const trainingProjects = validateTrainingAssets(rootDir);

  const scripts = parsePackageScripts(read(rootDir, "package.json"));
  for (const scriptName of [
    "validate:curriculum",
    "typecheck:training",
    "training:web:baseline",
    "training:web:mobile",
    "training:web:expected-failure",
    "training:web:check-expected-failure",
    "training:native:baseline",
    "training:copy:prepare",
    "training:copy:validate",
  ]) {
    if (!scripts[scriptName]) fail(`package script is missing: ${scriptName}`);
  }
  const tsconfigTraining = read(rootDir, "tsconfig.training.json");
  assertContains(tsconfigTraining, "playwright.training.config.ts", "Training TypeScript config");
  assertContains(tsconfigTraining, "training/**/*.ts", "Training TypeScript config");
  const phaseOneWorkflow = read(rootDir, ".github/workflows/ci.yml");
  assertContains(phaseOneWorkflow, "pnpm run validate:curriculum", "Phase 1 CI");
  assertContains(phaseOneWorkflow, "pnpm run training:web:baseline", "Phase 1 CI");
  assertContains(
    phaseOneWorkflow,
    "PLAYWRIGHT_BASE_URL: ${{ matrix.name == 'training-web-baseline' && 'http://127.0.0.1:8082'",
    "Phase 1 Training Web runtime",
  );
  assertContains(
    read(rootDir, ".github/workflows/native-ci.yml"),
    "training/maestro/**",
    "Native change detection",
  );
  assertContains(
    read(rootDir, ".github/workflows/native-ci.yml"),
    "training/maestro/baseline/native-training-baseline.yaml",
    "Native Training baseline",
  );

  return { documents: REQUIRED_CURRICULUM_FILES.length, workbookFiles, trainingProjects };
}

function isMainModule(): boolean {
  return (
    process.argv[1] !== undefined &&
    pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
  );
}

if (isMainModule()) {
  const summary = validateCurriculum();
  console.log(
    `Curriculum validation passed: ${summary.documents} required documents, ${summary.workbookFiles} workbook files, ${summary.trainingProjects.join(" / ")}.`,
  );
}
