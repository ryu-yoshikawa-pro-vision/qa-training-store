import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { isNormativeSpecPath } from "./spec/build-spec";
import { collectNormativeSpecReferences } from "./spec/validate-spec";
import { validateTrainingWorkflow } from "./training/workflow-contract";

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

export function parseCsv(text: string, name = "workbook.csv"): string[][] {
  const source = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let fieldClosed = false;

  const finishRow = (): void => {
    row.push(field);
    rows.push(row);
    row = [];
    field = "";
    fieldClosed = false;
  };

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index] ?? "";
    if (inQuotes) {
      if (character === '"') {
        if (source[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
          fieldClosed = true;
        }
      } else {
        field += character;
      }
      continue;
    }

    if (fieldClosed) {
      if (character === ",") {
        row.push(field);
        field = "";
        fieldClosed = false;
      } else if (character === "\r" || character === "\n") {
        if (character === "\r" && source[index + 1] === "\n") index += 1;
        finishRow();
      } else {
        fail(`${name} contains characters after a closing quote`);
      }
      continue;
    }

    if (character === '"') {
      if (field.length !== 0) fail(`${name} contains a quote inside an unquoted field`);
      inQuotes = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\r" || character === "\n") {
      if (character === "\r" && source[index + 1] === "\n") index += 1;
      finishRow();
    } else {
      field += character;
    }
  }

  if (inQuotes) fail(`${name} contains an unterminated quoted field`);
  if (row.length > 0 || field.length > 0) finishRow();
  return rows.filter((candidate) => !(candidate.length === 1 && candidate[0] === ""));
}

type WorkbookTable = { name: string; headers: readonly string[]; rows: string[][] };

function cell(table: WorkbookTable, row: string[], column: string): string {
  const index = table.headers.indexOf(column);
  return index < 0 ? "" : (row[index] ?? "");
}

function splitIds(name: string, field: string, value: string): string[] {
  if (value === "") return [];
  const ids = value.split(";");
  if (ids.some((id) => id.trim() !== id || id.length === 0))
    fail(`${name} uses whitespace or an empty item in ${field}`);
  if (new Set(ids).size !== ids.length) fail(`${name} repeats an ID in ${field}`);
  const pattern = field === "br_ids" ? /^BR-[A-Z0-9]+-\d{3}$/ : /^AC-[A-Z0-9]+-\d{3}$/;
  if (ids.some((id) => !pattern.test(id))) fail(`${name} has an invalid ${field} value: ${value}`);
  return ids;
}

const WORKBOOK_ID_PATTERNS: Record<string, RegExp> = {
  target_id: /^TARGET-[A-Z0-9]+-\d{3}$/,
  risk_id: /^RISK-[A-Z0-9]+-\d{3}$/,
  test_case_id: /^TC-[A-Z0-9]+-\d{3}$/,
};

function assertWorkbookId(name: string, rowLabel: string, field: string, value: string): void {
  const pattern = WORKBOOK_ID_PATTERNS[field];
  if (pattern === undefined) return;
  if (value === "") fail(`${rowLabel} requires ${field}`);
  if (!pattern.test(value)) fail(`${name} has an invalid ${field}: ${value}`);
}

function assertRepositoryPath(rootDir: string, name: string, column: string, value: string): void {
  if (value === "") return;
  if (/^(?:[A-Za-z]:[\\/]|[\\/])/.test(value)) fail(`${name} has an absolute ${column}: ${value}`);
  const absolute = path.resolve(rootDir, value);
  const relative = path.relative(rootDir, absolute);
  if (relative.startsWith(`..${path.sep}`) || relative === "..")
    fail(`${name} has a path outside the repository: ${value}`);
  if (!fs.existsSync(absolute)) fail(`${name} has a non-existent ${column}: ${value}`);
}

export function validateWorkbook(rootDir: string): number {
  const workbookRoot = path.join(rootDir, "training", "workbook");
  if (!fs.existsSync(path.join(workbookRoot, "README.md")))
    fail("training/workbook/README.md is missing");

  const tables: WorkbookTable[] = Object.entries(WORKBOOK_HEADERS).map(([name, headers]) => {
    const rows = parseCsv(read(rootDir, `training/workbook/${name}`), name);
    if (rows.length < 2) fail(`${name} must contain a small traceable sample row`);
    const header = rows[0] ?? [];
    if (header.length !== headers.length || header.some((value, index) => value !== headers[index]))
      fail(`${name} header does not match the canonical schema`);
    for (const [rowIndex, row] of rows.slice(1).entries()) {
      if (row.length !== headers.length)
        fail(`${name} row ${rowIndex + 2} has ${row.length} columns; expected ${headers.length}`);
    }
    return { name, headers, rows: rows.slice(1) };
  });

  const specReferences = collectNormativeSpecReferences(rootDir);
  const riskIds = new Set<string>();
  const testCaseIds = new Set<string>();
  const targetIds = new Set<string>();
  const unique = (set: Set<string>, value: string, name: string, field: string): void => {
    if (set.has(value)) fail(`${name} repeats ${field}: ${value}`);
    set.add(value);
  };

  for (const table of tables) {
    for (const [rowIndex, row] of table.rows.entries()) {
      const rowLabel = `${table.name} row ${rowIndex + 2}`;
      for (const [field, pattern] of [
        ["br_ids", /^BR-[A-Z0-9]+-\d{3}$/],
        ["ac_ids", /^AC-[A-Z0-9]+-\d{3}$/],
      ] as const) {
        const value = cell(table, row, field);
        const ids = splitIds(table.name, field, value);
        if (ids.some((id) => !pattern.test(id)))
          fail(`${rowLabel} has an invalid ${field}: ${value}`);
      }

      const specRef = cell(table, row, "spec_ref");
      if (
        (table.name === "01_target-risk.csv" || table.name === "02_test-cases.csv") &&
        specRef === ""
      ) {
        fail(`${rowLabel} requires spec_ref`);
      }
      if (specRef !== "") {
        if (!isNormativeSpecPath(specRef) || !fs.existsSync(path.join(rootDir, specRef)))
          fail(`${rowLabel} has an invalid normative spec_ref: ${specRef}`);
        if (!specReferences.has(specRef)) fail(`${rowLabel} has an unparsed spec_ref: ${specRef}`);
        for (const [field, ids] of [
          ["br_ids", splitIds(table.name, "br_ids", cell(table, row, "br_ids"))],
          ["ac_ids", splitIds(table.name, "ac_ids", cell(table, row, "ac_ids"))],
        ] as const) {
          const references = specReferences.get(specRef);
          if (references === undefined) fail(`${rowLabel} has an unparsed spec_ref: ${specRef}`);
          const known = field === "br_ids" ? references.brIds : references.acIds;
          for (const id of ids)
            if (!known.has(id)) fail(`${rowLabel} references unknown ${id} in ${specRef}`);
        }
      }

      if (table.name === "01_target-risk.csv") {
        const targetId = cell(table, row, "target_id");
        const riskId = cell(table, row, "risk_id");
        assertWorkbookId(table.name, rowLabel, "target_id", targetId);
        assertWorkbookId(table.name, rowLabel, "risk_id", riskId);
        unique(targetIds, targetId, table.name, "target_id");
        unique(riskIds, riskId, table.name, "risk_id");
      }
      if (table.name === "02_test-cases.csv") {
        const testCaseId = cell(table, row, "test_case_id");
        const riskId = cell(table, row, "risk_id");
        assertWorkbookId(table.name, rowLabel, "test_case_id", testCaseId);
        assertWorkbookId(table.name, rowLabel, "risk_id", riskId);
        if (!riskIds.has(riskId)) fail(`${rowLabel} references unknown risk_id: ${riskId}`);
        unique(testCaseIds, testCaseId, table.name, "test_case_id");
      }
      if (table.name === "03_automation-mapping.csv") {
        const testCaseId = cell(table, row, "test_case_id");
        assertWorkbookId(table.name, rowLabel, "test_case_id", testCaseId);
        if (!testCaseIds.has(testCaseId))
          fail(`${rowLabel} references unknown test_case_id: ${testCaseId}`);
        assertRepositoryPath(
          rootDir,
          rowLabel,
          "implementation_path",
          cell(table, row, "implementation_path"),
        );
      }
      if (table.name === "04_execution-improvement.csv") {
        const testCaseId = cell(table, row, "test_case_id");
        const result = cell(table, row, "result").trim().toLowerCase();
        assertWorkbookId(table.name, rowLabel, "test_case_id", testCaseId);
        if (result === "") fail(`${rowLabel} requires result`);
        if (!testCaseIds.has(testCaseId))
          fail(`${rowLabel} references unknown test_case_id: ${testCaseId}`);
        const evidence = cell(table, row, "evidence");
        if (result === "not run" && evidence !== "")
          fail(`${rowLabel} must leave evidence blank when result is Not run`);
        if (
          (result === "pass" || result === "not run") &&
          cell(table, row, "failure_category") !== ""
        )
          fail(`${rowLabel} must leave failure_category blank for ${result}`);
        assertRepositoryPath(rootDir, rowLabel, "evidence", evidence);
      }
    }
  }
  return tables.length;
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
    "scripts/training/workflow-contract.ts",
    "scripts/training/maestro-invocation.ts",
    "scripts/training/android-emulator.ps1",
    "tsconfig.training.json",
  ]) {
    if (!fs.existsSync(path.join(rootDir, requiredPath)))
      fail(`missing Training asset: ${requiredPath}`);
  }
  const nativeFlow = read(rootDir, "training/maestro/baseline/native-training-baseline.yaml");
  assertContains(nativeFlow, "com.ryuyoshikawa.scenarioshop", "Training Maestro baseline");
  assertContains(nativeFlow, "scenario-shop://test-control/reset", "Training Maestro baseline");
  const androidHelper = read(rootDir, "scripts/training/android-emulator.ps1");
  assertContains(androidHelper, "service check package", "Android Training helper");
  assertContains(androidHelper, "ro.build.version.sdk", "Android Training helper");
  assertContains(androidHelper, "ro.product.cpu.abi", "Android Training helper");
  for (const required of [
    "ANDROID_SDK_ROOT",
    "ANDROID_HOME",
    "cmdline-tools directory was not found",
    "sdkmanager.bat was not found",
    "scenario-shop-training-api34",
    "emu avd name",
    "Training emulator AVD must be",
    "No connected emulator for serial",
  ])
    assertContains(androidHelper, required, "Android Training helper");

  const maestroRunner = read(rootDir, "scripts/training/run-maestro-baseline.ts");
  for (const required of [
    "TRAINING_MAESTRO_OUTPUT_DIR",
    "native-training-baseline.yaml",
    "300_000",
    "import { buildMaestroInvocation }",
    "main();",
  ])
    assertContains(maestroRunner, required, "Training Maestro runner");
  const maestroInvocation = read(rootDir, "scripts/training/maestro-invocation.ts");
  for (const required of ['"--device"', "--test-output-dir="])
    assertContains(maestroInvocation, required, "Training Maestro invocation");

  const expectedFailureRunner = read(rootDir, "scripts/training/run-expected-failure.ts");
  for (const required of ["rmSync(evidenceRoot", '".zip"', '".png"', '".webm"', '".html"'])
    assertContains(expectedFailureRunner, required, "Training expected-failure runner");

  const nativeLesson = read(
    rootDir,
    "docs/curriculum/test-automation/part1/07_maestro-native-automation.md",
  );
  for (const required of [
    "$env:ANDROID_SDK_ROOT",
    "$env:ANDROID_HOME",
    "$cmdlineToolsRoot",
    "Get-ChildItem -LiteralPath $cmdlineToolsRoot",
    "sdkmanager.bat was not found",
    "Android build failed.",
    "Training Maestro baseline failed.",
    "finally",
    "-Action Stop",
  ])
    assertContains(nativeLesson, required, "Native automation lesson");

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
    try {
      validateTrainingWorkflow(name, workflow);
    } catch (error) {
      fail(error instanceof Error ? error.message : String(error));
    }
    assertContains(workflow, "if: always()", name);
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
  const mobileExerciseScript = scripts["training:web:mobile:exercise"];
  if (
    mobileExerciseScript !==
    "playwright test training/playwright/exercises --config=playwright.training.config.ts --project=training-mobile-chromium"
  ) {
    fail(
      "training:web:mobile:exercise must run training/playwright/exercises with training-mobile-chromium",
    );
  }
  for (const scriptName of [
    "validate:curriculum",
    "typecheck:training",
    "training:web:baseline",
    "training:web:mobile",
    "training:web:mobile:exercise",
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
