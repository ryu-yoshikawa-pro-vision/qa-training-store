import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { checkCompletion } from "../../scripts/training/check-completion";
import { restoreDiagnosticExercise } from "../../scripts/training/restore-diagnostic-exercise";

const SOURCE_SHA = "a".repeat(40);
const SUBMISSION_SHA = "b".repeat(40);
const EXECUTION_SHA = "c".repeat(40);
const CI_SHA = "d".repeat(40);
const CI_SOURCE_SHA = "e".repeat(40);
const CI_SUBMISSION_SHA = "f".repeat(40);
const CI_EXECUTION_SHA = "1".repeat(40);

const CASES = [
  {
    caseId: "TC-CART-101",
    targetId: "TARGET-CART-101",
    riskId: "RISK-CART-101",
    implementationPath: "training/playwright/exercises/cart-101.spec.ts",
  },
  {
    caseId: "TC-CART-102",
    targetId: "TARGET-CART-102",
    riskId: "RISK-CART-102",
    implementationPath: "training/playwright/exercises/cart-102.spec.ts",
  },
] as const;

type ReceiptContext =
  | "local-exercise"
  | "c10-before"
  | "diagnostic-initial"
  | "diagnostic-repaired"
  | "learner-failure"
  | "learner-repaired"
  | "c10-improved"
  | "ci-exercise"
  | "mobile-exercise";

type FixtureOptions = {
  mode?: "common" | "part2";
  codeStyle?: "valid" | "starter";
  contexts?: ReceiptContext[];
  omitCases?: boolean;
  missingEvidence?: boolean;
  mismatchedCase?: boolean;
  omitCaseIds?: boolean;
  sharedDiagnosticEvidence?: boolean;
  invalidReceipt?: boolean;
  blocked?: boolean;
  diagnosticSameDigest?: boolean;
  mobile?: "learner" | "baseline" | "none";
};

function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

function csv(rows: string[][]): string {
  return `${rows.map((row) => row.map(csvCell).join(",")).join("\n")}\n`;
}

function writeText(root: string, relativePath: string, value: string): void {
  const target = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, value, "utf8");
}

function learnerCode(caseId: string, style: "valid" | "starter"): string {
  return `import { ${style === "valid" ? "expect, " : ""}test } from "@playwright/test";
import { resetScenario } from "../../support/reset-scenario";

test("${caseId} learner cart case", async ({ page }) => {
  await resetScenario(page, "default");
  await page.getByRole("heading", { name: "商品一覧" }).first().waitFor();
${style === "valid" ? '  await expect(page.getByRole("heading", { name: "商品一覧" }).first()).toBeVisible();\n' : ""}});
`;
}

function digest(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function c10ImprovementRecord(
  caseId: string,
  implementationPath: string,
  style: "valid" | "starter",
): string {
  return `Improvement Target: ${implementationPath}; Problem: repeated maintenance concern; Why: the same change would need multiple edits; Action: make the smallest maintainable improvement; Improvement: rerun passed`;
}

function writeExecutionReceipt(
  root: string,
  context: ReceiptContext,
  options: FixtureOptions,
  project = "training-chromium",
): void {
  const isInitial = context === "diagnostic-initial";
  const isNaturalFailure = context === "learner-failure";
  const isCi = context === "ci-exercise";
  const isDiagnostic = context === "diagnostic-initial" || context === "diagnostic-repaired";
  const receiptTimes: Record<ReceiptContext, [string, string]> = {
    "local-exercise": ["2026-09-17T00:00:00.000Z", "2026-09-17T00:00:01.000Z"],
    "c10-before": ["2026-09-17T00:00:01.000Z", "2026-09-17T00:00:02.000Z"],
    "diagnostic-initial": ["2026-09-17T00:00:02.000Z", "2026-09-17T00:00:03.000Z"],
    "diagnostic-repaired": ["2026-09-17T00:00:04.000Z", "2026-09-17T00:00:05.000Z"],
    "learner-failure": ["2026-09-17T00:00:02.000Z", "2026-09-17T00:00:03.000Z"],
    "learner-repaired": ["2026-09-17T00:00:04.000Z", "2026-09-17T00:00:05.000Z"],
    "c10-improved": ["2026-09-17T00:00:06.000Z", "2026-09-17T00:00:07.000Z"],
    "ci-exercise": ["2026-09-17T00:00:08.000Z", "2026-09-17T00:00:09.000Z"],
    "mobile-exercise": ["2026-09-17T00:00:10.000Z", "2026-09-17T00:00:11.000Z"],
  };
  const [startedAt, finishedAt] = receiptTimes[context];
  const isMobileBaseline = context === "mobile-exercise" && options.mobile === "baseline";
  const receiptCases = isMobileBaseline
    ? CASES.map((entry, index) => ({
        ...entry,
        caseId: index === 0 ? "TC-CART-001" : "TC-CART-002",
        implementationPath: "training/playwright/baseline/training-baseline.spec.ts",
      }))
    : CASES;
  const cases = options.omitCases
    ? []
    : receiptCases.map((entry) => {
        const sourcePath = path.join(root, "code", entry.implementationPath);
        const source = fs.existsSync(sourcePath)
          ? fs.readFileSync(sourcePath, "utf8")
          : `provided baseline for ${entry.caseId}`;
        const evidence = options.missingEvidence
          ? []
          : [
              ...(isCi ? ["evidence/ci.md"] : []),
              ...(options.sharedDiagnosticEvidence && context.startsWith("diagnostic")
                ? ["evidence/diagnostic-shared.md"]
                : [`evidence/${context}-${entry.caseId}.md`]),
            ];
        const caseId = options.mismatchedCase
          ? "TC-CART-999"
          : options.omitCaseIds
            ? null
            : entry.caseId;
        const status = isInitial || isNaturalFailure ? "failed" : "passed";
        return {
          case_id: caseId,
          title: `${caseId ?? "learner"} fixture result`,
          track: "web",
          status,
          result: status,
          code_digest:
            isDiagnostic && !options.diagnosticSameDigest
              ? digest(`${source}\n${context}`)
              : digest(source),
          implementation_path: entry.implementationPath,
          evidence,
          retries: [
            {
              retry_index: 0,
              status,
              duration_ms: 25,
              ...(isInitial ? { error: "expected diagnostic mismatch" } : {}),
              evidence,
            },
          ],
        };
      });
  const run: Record<string, unknown> = {
    producer: "training:web:exercise:with-receipt",
    command: `pnpm run training:web:exercise:with-receipt -- --suite ${isDiagnostic ? "diagnostic" : "exercise"} --project ${project} --root ${root} --run-context ${context}`,
    exit_code: isInitial || isNaturalFailure ? 1 : 0,
    started_at: startedAt,
    finished_at: finishedAt,
    environment: {
      platform: "win32",
      runtime: "Playwright Training",
      browser: project,
      execution: isCi ? "ci" : "local",
    },
    run_context: context,
    project,
    part1_distribution_sha: SOURCE_SHA,
    training_copy_source_sha: isCi ? CI_SOURCE_SHA : SOURCE_SHA,
    submission_sha: isCi ? CI_SUBMISSION_SHA : SUBMISSION_SHA,
    execution_sha: isCi ? CI_EXECUTION_SHA : EXECUTION_SHA,
    ...(isCi
      ? {
          ci_sha: CI_SHA,
          ci: {
            github_run_id: "12345",
            github_run_attempt: "1",
            github_sha: CI_SHA,
            repository: "training/example",
            workflow: "Scenario Shop Training Web",
            job: "training-web",
            artifact_name: "training-web-12345-1",
          },
        }
      : {}),
    ...(options.blocked
      ? {
          blocked: true,
          environment_status: "blocked",
          blocked_reason: "Training Copy is unavailable",
        }
      : {}),
  };
  const receipt = {
    schema_version: options.invalidReceipt ? 2 : 1,
    kind: "execution-receipt",
    generated_at: finishedAt,
    run,
    cases,
  };
  writeText(
    root,
    `receipts/execution-receipt-${context}.json`,
    `${JSON.stringify(receipt, null, 2)}\n`,
  );
}

function writeProvidedC10Receipt(
  root: string,
  context: "c10-before" | "c10-improved",
  implementationPath: string,
  codeDigest: string,
  evidence: string,
): void {
  const start = context === "c10-before" ? "2026-09-17T00:00:01.000Z" : "2026-09-17T00:00:06.000Z";
  const finish = context === "c10-before" ? "2026-09-17T00:00:02.000Z" : "2026-09-17T00:00:07.000Z";
  const receipt = {
    schema_version: 1,
    kind: "execution-receipt",
    generated_at: finish,
    run: {
      producer: "training:web:exercise:with-receipt",
      command: `pnpm run training:web:exercise:with-receipt -- --suite exercise --project training-chromium --root ${root} --run-context ${context}`,
      exit_code: 0,
      started_at: start,
      finished_at: finish,
      environment: {
        platform: "win32",
        runtime: "Playwright Training",
        browser: "training-chromium",
        execution: "local",
      },
      run_context: context,
      project: "training-chromium",
    },
    cases: [
      {
        case_id: "TC-CART-900",
        title: "TC-CART-900 provided C10 maintenance exercise",
        track: "web",
        status: "passed",
        result: "passed",
        code_digest: codeDigest,
        code_digests: { [implementationPath]: codeDigest },
        implementation_path: implementationPath,
        evidence: [evidence],
        retries: [{ retry_index: 0, status: "passed", duration_ms: 25, evidence: [evidence] }],
      },
    ],
  };
  writeText(
    root,
    `receipts/execution-receipt-${context}-provided.json`,
    `${JSON.stringify(receipt, null, 2)}\n`,
  );
}

function createHandoff(options: FixtureOptions = {}): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "training-completion-contract-"));
  for (const directory of ["workbook", "code", "evidence", "receipts", "self-check"]) {
    fs.mkdirSync(path.join(root, directory), { recursive: true });
  }
  writeText(
    root,
    "workbook/01_target-risk.csv",
    csv([
      [
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
      ...CASES.map((entry) => [
        entry.targetId,
        "docs/spec/features/cart.md",
        "BR-CART-001",
        "AC-CART-001",
        entry.riskId,
        "cart state can be lost",
        "High",
        "Medium",
        "High",
      ]),
    ]),
  );
  writeText(
    root,
    "workbook/02_test-cases.csv",
    csv([
      [
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
      ...CASES.map((entry) => [
        entry.caseId,
        entry.riskId,
        "docs/spec/features/cart.md",
        "BR-CART-001",
        "AC-CART-001",
        "add a product to the cart",
        "default scenario is reset",
        "the cart shows the selected product",
        "equivalence partitioning",
      ]),
    ]),
  );
  writeText(
    root,
    "workbook/03_automation-mapping.csv",
    csv([
      [
        "test_case_id",
        "automation_decision",
        "test_layer",
        "tool",
        "implementation_path",
        "execution_timing",
        "reason",
      ],
      ...CASES.map((entry) => [
        entry.caseId,
        "Automate",
        "Web E2E",
        "Playwright",
        entry.implementationPath,
        "PR",
        "repeatable cart risk",
      ]),
    ]),
  );
  const contexts = options.contexts ?? [
    "local-exercise",
    "c10-before",
    "diagnostic-initial",
    "diagnostic-repaired",
    "c10-improved",
  ];
  const mobileMode = options.mobile ?? (options.contexts?.length === 0 ? "none" : "learner");
  writeText(
    root,
    "workbook/04_execution-improvement.csv",
    csv([
      [
        "test_case_id",
        "run_context",
        "result",
        "evidence",
        "failure_category",
        "cause",
        "action",
        "improvement",
      ],
      ...CASES.flatMap((entry) =>
        contexts.map((context) => [
          entry.caseId,
          context,
          context === "diagnostic-initial" || context === "learner-failure" ? "Fail" : "Pass",
          context === "ci-exercise"
            ? `evidence/ci-exercise-${entry.caseId}.md`
            : `evidence/${context}-${entry.caseId}.md`,
          context === "diagnostic-initial" ||
          context === "learner-failure" ||
          context === "c10-improved"
            ? "Assertion"
            : "",
          context === "diagnostic-initial" ||
          context === "learner-failure" ||
          context === "c10-improved"
            ? "fixture mismatch"
            : "",
          context === "diagnostic-initial" ||
          context === "learner-failure" ||
          context === "c10-improved"
            ? "inspect and repair"
            : "",
          context === "diagnostic-initial" ||
          context === "learner-failure" ||
          context === "c10-improved"
            ? context === "c10-improved"
              ? c10ImprovementRecord(
                  entry.caseId,
                  entry.implementationPath,
                  options.codeStyle ?? "valid",
                )
              : "record repaired run"
            : "",
        ]),
      ),
    ]),
  );
  for (const entry of CASES) {
    writeText(
      root,
      `code/${entry.implementationPath}`,
      learnerCode(entry.caseId, options.codeStyle ?? "valid"),
    );
    for (const context of contexts) {
      const evidencePath =
        context === "ci-exercise"
          ? `evidence/ci-exercise-${entry.caseId}.md`
          : options.sharedDiagnosticEvidence && context.startsWith("diagnostic")
            ? "evidence/diagnostic-shared.md"
            : `evidence/${context}-${entry.caseId}.md`;
      writeText(root, evidencePath, `Evidence for ${entry.caseId} / ${context}\n`);
    }
  }
  if (mobileMode !== "none") {
    const mobileCaseIds =
      mobileMode === "baseline"
        ? ["TC-CART-001", "TC-CART-002"]
        : CASES.map((entry) => entry.caseId);
    for (const caseId of mobileCaseIds)
      writeText(
        root,
        `evidence/mobile-exercise-${caseId}.md`,
        `Evidence for ${caseId} / mobile-exercise\n`,
      );
  }
  if (options.contexts?.includes("ci-exercise")) {
    writeText(
      root,
      "evidence/ci.md",
      "Run ID: 12345\nRun attempt: 1\nCheck: Scenario Shop Training Web / training-web\nArtifact: training-web-12345-1\n",
    );
    for (const entry of CASES)
      writeText(
        root,
        `evidence/ci-exercise-${entry.caseId}.md`,
        `Run ID: 12345\nRun attempt: 1\nCheck: Scenario Shop Training Web / training-web\nArtifact: training-web-12345-1\nResult: success\nCase: ${entry.caseId}\n`,
      );
  }
  if (options.sharedDiagnosticEvidence)
    writeText(root, "evidence/diagnostic-shared.md", "shared diagnostic evidence\n");
  if (options.mode === "part2")
    writeText(
      root,
      "evidence/change-management.md",
      "Branch: training/learner\nCommit: bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb\nDiff: training/playwright/exercises/cart-101.spec.ts\nPull Request: https://github.com/example/training/pull/1\nReview: self-review completed\nReason: keep the learner Case traceable to the reviewed change\n",
    );
  const selfChecks = [
    "P1-01",
    "P1-02",
    "P1-03",
    "P1-04",
    "P1-05",
    "P1-06",
    "P1-08",
    "P1-09",
    ...(options.mode === "part2"
      ? ["P2-01", "P2-02", "P2-03", "P2-04", "P2-05", "P2-07", "P2-08"]
      : []),
  ];
  for (const lessonId of selfChecks)
    writeText(root, `self-check/${lessonId}.md`, `${lessonId} self-check\n`);
  for (const context of contexts) {
    if (context === "c10-improved") {
      for (const entry of CASES) {
        writeText(
          root,
          `code/${entry.implementationPath}`,
          `${learnerCode(entry.caseId, options.codeStyle ?? "valid")}\n// C10 minimal maintainability improvement\n`,
        );
      }
    }
    writeExecutionReceipt(root, context, options);
  }
  if (mobileMode !== "none")
    writeExecutionReceipt(
      root,
      "mobile-exercise",
      { ...options, mobile: mobileMode },
      "training-mobile-chromium",
    );
  return root;
}

function removeFixture(root: string): void {
  fs.rmSync(root, { recursive: true, force: true });
}

function updateReceipt(
  root: string,
  context: ReceiptContext,
  update: (receipt: {
    generated_at?: string;
    run: Record<string, unknown>;
    cases: Record<string, unknown>[];
  }) => void,
): void {
  const receiptPath = path.join(root, "receipts", `execution-receipt-${context}.json`);
  const receipt = JSON.parse(fs.readFileSync(receiptPath, "utf8")) as {
    generated_at?: string;
    run: Record<string, unknown>;
    cases: Record<string, unknown>[];
  };
  update(receipt);
  fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
}

function receiptAt(receiptPath: string): {
  generated_at?: string;
  run: Record<string, unknown>;
  cases: Record<string, unknown>[];
} {
  return JSON.parse(fs.readFileSync(receiptPath, "utf8")) as {
    generated_at?: string;
    run: Record<string, unknown>;
    cases: Record<string, unknown>[];
  };
}

type ExecutionRowChanges = Partial<
  Record<"result" | "evidence" | "failure_category" | "cause" | "action" | "improvement", string>
>;

function updateExecutionRow(
  root: string,
  caseId: string,
  context: string,
  changes: ExecutionRowChanges,
): void {
  const workbookPath = path.join(root, "workbook", "04_execution-improvement.csv");
  const lines = fs.readFileSync(workbookPath, "utf8").trimEnd().split(/\r?\n/);
  const headers = lines[0]?.split(",") ?? [];
  const rowIndex = lines.findIndex((line) => line.startsWith(`${caseId},${context},`));
  if (rowIndex < 0) throw new Error(`Execution row not found: ${caseId}/${context}`);
  const cells = lines[rowIndex]?.split(",") ?? [];
  for (const [field, value] of Object.entries(changes)) {
    const column = headers.indexOf(field);
    if (column < 0) throw new Error(`Execution field not found: ${field}`);
    cells[column] = value ?? "";
  }
  lines[rowIndex] = cells.map((value) => csvCell(value)).join(",");
  fs.writeFileSync(workbookPath, `${lines.join("\n")}\n`, "utf8");
}

function removeExecutionRow(root: string, caseId: string, context: string): void {
  const workbookPath = path.join(root, "workbook", "04_execution-improvement.csv");
  const lines = fs.readFileSync(workbookPath, "utf8").trimEnd().split(/\r?\n/);
  const rowIndex = lines.findIndex((line) => line.startsWith(`${caseId},${context},`));
  if (rowIndex < 0) throw new Error(`Execution row not found: ${caseId}/${context}`);
  lines.splice(rowIndex, 1);
  fs.writeFileSync(workbookPath, `${lines.join("\n")}\n`, "utf8");
}

function addEmptyLearnerCase(root: string): void {
  const rows = {
    target: [
      "TARGET-CART-103",
      "docs/spec/features/cart.md",
      "BR-CART-001",
      "AC-CART-001",
      "RISK-CART-103",
      "cart state can be lost",
      "High",
      "Medium",
      "High",
    ],
    testCase: [
      "TC-CART-103",
      "RISK-CART-103",
      "docs/spec/features/cart.md",
      "BR-CART-001",
      "AC-CART-001",
      "add a product",
      "default scenario",
      "product is in cart",
      "equivalence partitioning",
    ],
    mapping: ["TC-CART-103", "Automate", "Web E2E", "Playwright", "", "PR", "new learner case"],
  };
  fs.appendFileSync(
    path.join(root, "workbook", "01_target-risk.csv"),
    `${csv([rows.target])}`,
    "utf8",
  );
  fs.appendFileSync(
    path.join(root, "workbook", "02_test-cases.csv"),
    `${csv([rows.testCase])}`,
    "utf8",
  );
  fs.appendFileSync(
    path.join(root, "workbook", "03_automation-mapping.csv"),
    `${csv([rows.mapping])}`,
    "utf8",
  );
}

function addUnitLearnerCase(root: string): void {
  fs.appendFileSync(
    path.join(root, "workbook", "01_target-risk.csv"),
    csv([
      [
        "TARGET-CART-103",
        "docs/spec/features/cart.md",
        "BR-CART-001",
        "AC-CART-001",
        "RISK-CART-103",
        "cart quantity calculation can be wrong",
        "High",
        "Medium",
        "High",
      ],
    ]),
    "utf8",
  );
  fs.appendFileSync(
    path.join(root, "workbook", "02_test-cases.csv"),
    csv([
      [
        "TC-CART-103",
        "RISK-CART-103",
        "docs/spec/features/cart.md",
        "BR-CART-001",
        "AC-CART-001",
        "calculate the quantity upper bound",
        "domain input is normalized",
        "the quantity rule returns the expected limit",
        "boundary value analysis",
      ],
    ]),
    "utf8",
  );
  fs.appendFileSync(
    path.join(root, "workbook", "03_automation-mapping.csv"),
    csv([["TC-CART-103", "Automate", "Unit", "Vitest", "", "PR", "domain rule is deterministic"]]),
    "utf8",
  );
}

function addProvidedProductCase(root: string, implementationPath = ""): void {
  fs.appendFileSync(
    path.join(root, "workbook", "01_target-risk.csv"),
    csv([
      [
        "TARGET-PRODUCT-001",
        "docs/spec/features/product.md",
        "BR-PRODUCT-001",
        "AC-PRODUCT-001",
        "RISK-PRODUCT-001",
        "product details can be unclear",
        "Medium",
        "Low",
        "Medium",
      ],
    ]),
    "utf8",
  );
  fs.appendFileSync(
    path.join(root, "workbook", "02_test-cases.csv"),
    csv([
      [
        "TC-PRODUCT-001",
        "RISK-PRODUCT-001",
        "docs/spec/features/product.md",
        "BR-PRODUCT-001",
        "AC-PRODUCT-001",
        "open the seeded basic shirt",
        "default scenario is reset",
        "ベーシックTシャツ is shown as the heading",
        "equivalence partitioning",
      ],
    ]),
    "utf8",
  );
  fs.appendFileSync(
    path.join(root, "workbook", "03_automation-mapping.csv"),
    csv([
      [
        "TC-PRODUCT-001",
        "Automate",
        "Web E2E",
        "Playwright",
        implementationPath,
        "PR",
        "provided intro case",
      ],
    ]),
    "utf8",
  );
}

function removeCaseFromFixture(root: string, caseId: string, targetId: string): void {
  for (const [filename, prefix] of [
    ["01_target-risk.csv", targetId],
    ["02_test-cases.csv", caseId],
    ["03_automation-mapping.csv", caseId],
    ["04_execution-improvement.csv", caseId],
  ] as const) {
    const file = path.join(root, "workbook", filename);
    const lines = fs.readFileSync(file, "utf8").trimEnd().split(/\r?\n/);
    fs.writeFileSync(
      file,
      `${lines.filter((line, index) => index === 0 || !line.startsWith(`${prefix},`)).join("\n")}\n`,
      "utf8",
    );
  }
  for (const entry of fs.readdirSync(path.join(root, "receipts"))) {
    if (!entry.endsWith(".json")) continue;
    const receiptPath = path.join(root, "receipts", entry);
    const receipt = JSON.parse(fs.readFileSync(receiptPath, "utf8")) as {
      cases: Record<string, unknown>[];
    };
    receipt.cases = receipt.cases.filter((executionCase) => executionCase.case_id !== caseId);
    fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
  }
  fs.rmSync(path.join(root, "code", "training/playwright/exercises/cart-102.spec.ts"), {
    force: true,
  });
  for (const entry of fs.readdirSync(path.join(root, "evidence"))) {
    if (entry.includes(caseId)) fs.rmSync(path.join(root, "evidence", entry), { force: true });
  }
}

function removeCaseFromReceipt(root: string, context: ReceiptContext, caseId: string): void {
  updateReceipt(root, context, (receipt) => {
    receipt.cases = receipt.cases.filter((executionCase) => executionCase.case_id !== caseId);
  });
}

function refreshReceiptDigests(root: string): void {
  for (const entry of fs.readdirSync(path.join(root, "receipts"))) {
    if (!entry.endsWith(".json")) continue;
    const receiptPath = path.join(root, "receipts", entry);
    const receipt = JSON.parse(fs.readFileSync(receiptPath, "utf8")) as {
      cases: Record<string, unknown>[];
    };
    for (const executionCase of receipt.cases) {
      const implementationPath = executionCase.implementation_path;
      if (typeof implementationPath !== "string") continue;
      const sourcePath = path.join(root, "code", implementationPath);
      executionCase.code_digest = digest(fs.readFileSync(sourcePath, "utf8"));
    }
    fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
  }
}

describe("受講者向け修了確認契約", () => {
  it("passes a multi-case Common handoff and writes Completion Receipt outside receipts/", () => {
    const root = createHandoff();
    try {
      const result = checkCompletion(root, "common");
      expect(result.status).toBe("PASS");
      expect(result.receipt.status).toBe("PASS");
      expect(result.receipt.exit_code).toBe(0);
      expect(result.receipt.checked_case_ids).toEqual(["TC-CART-101", "TC-CART-102"]);
      expect(result.receipt.execution_receipt_refs).toHaveLength(6);
      expect(result.receipt.semantic_understanding).toBe("NOT_EVALUATED");
      expect(result.receipt.part1_distribution_sha).toBe(SOURCE_SHA);
      expect(result.receipt.submission_sha).toBe(SUBMISSION_SHA);
      expect(result.receipt.execution_sha).toBe(EXECUTION_SHA);
      expect(result.receipt.checked_competencies).toEqual(["C07", "C09", "C10"]);
      expect("machine_checked_competencies" in result.receipt).toBe(false);
      expect("checks" in result.receipt).toBe(false);
      expect(fs.existsSync(path.join(root, "completion-receipt.json"))).toBe(true);
      expect(fs.existsSync(path.join(root, "receipts", "completion-receipt.json"))).toBe(false);
    } finally {
      removeFixture(root);
    }
  });

  it("uses the existing implementation_path mapping when a Receipt has no case_id", () => {
    const root = createHandoff({ omitCaseIds: true });
    try {
      expect(checkCompletion(root, "common").status).toBe("PASS");
    } finally {
      removeFixture(root);
    }
  });

  it("does not require Playwright work for a non-UI Automate Case", () => {
    const root = createHandoff();
    try {
      addUnitLearnerCase(root);
      const result = checkCompletion(root, "common");
      expect(result.status).toBe("PASS");
      expect(result.receipt.checked_case_ids).toContain("TC-CART-103");
      expect(result.receipt.checked_outputs.learner_code).toBe(true);
      expect(result.receipt.checked_outputs.c07_web_projects).toBe(true);
    } finally {
      removeFixture(root);
    }
  });

  it("does not count the provided TC-PRODUCT-001 intro as a learner Case", () => {
    const root = createHandoff();
    try {
      removeCaseFromFixture(root, "TC-CART-102", "TARGET-CART-102");
      addProvidedProductCase(root);
      const result = checkCompletion(root, "common");
      expect(result.status).toBe("PASS");
      expect(result.receipt.checked_case_ids).toEqual(["TC-CART-101"]);
      expect(result.receipt.reasons.join("\n")).not.toContain("at least two learner-owned");
    } finally {
      removeFixture(root);
    }
  });

  it("requires TC-CART-101 itself to be a learner-owned Web E2E Playwright Case", () => {
    const root = createHandoff();
    try {
      const mappingPath = path.join(root, "workbook", "03_automation-mapping.csv");
      fs.writeFileSync(
        mappingPath,
        fs
          .readFileSync(mappingPath, "utf8")
          .replace(
            "TC-CART-101,Automate,Web E2E,Playwright,training/playwright/exercises/cart-101.spec.ts",
            "TC-CART-101,Automate,Unit,Vitest,",
          ),
        "utf8",
      );
      const result = checkCompletion(root, "common");
      expect(result.status).not.toBe("PASS");
      expect(result.receipt.reasons.join("\n")).toContain(
        "TC-CART-101 must itself be an Automate/Web E2E/Playwright learner-owned Case",
      );
    } finally {
      removeFixture(root);
    }
  });

  it("rejects unknown Workbook test_layer and tool values", () => {
    const root = createHandoff();
    try {
      const mappingPath = path.join(root, "workbook", "03_automation-mapping.csv");
      fs.writeFileSync(
        mappingPath,
        fs
          .readFileSync(mappingPath, "utf8")
          .replace(
            "TC-CART-102,Automate,Web E2E,Playwright,",
            "TC-CART-102,Automate,Web Browser,Playright,",
          ),
        "utf8",
      );
      const result = checkCompletion(root, "common");
      expect(result.status).toBe("FAIL");
      expect(result.receipt.reasons.join("\n")).toContain("Invalid test_layer for TC-CART-102");
      expect(result.receipt.reasons.join("\n")).toContain("Invalid tool for TC-CART-102");
    } finally {
      removeFixture(root);
    }
  });

  it.each(["expect(1).toBe(1);", 'expect("x").toEqual("x");'])(
    "rejects a meaningless literal assertion: %s",
    (assertion) => {
      const root = createHandoff();
      try {
        const implementationPath = path.join(root, "code", CASES[0].implementationPath);
        const source = fs.readFileSync(implementationPath, "utf8");
        fs.writeFileSync(
          implementationPath,
          source.replace(
            '  await expect(page.getByRole("heading", { name: "商品一覧" }).first()).toBeVisible();\n',
            `  ${assertion}\n`,
          ),
          "utf8",
        );
        refreshReceiptDigests(root);
        for (const context of ["diagnostic-initial", "diagnostic-repaired"] as const) {
          updateReceipt(root, context, (receipt) => {
            for (const executionCase of receipt.cases) {
              const implementationPath = executionCase.implementation_path;
              if (typeof implementationPath === "string")
                executionCase.code_digest = digest(
                  `${fs.readFileSync(path.join(root, "code", implementationPath), "utf8")}\n${context}`,
                );
            }
          });
        }
        const result = checkCompletion(root, "common");
        expect(result.status).not.toBe("PASS");
        expect(result.receipt.reasons.join("\n")).toContain("meaningless literal Assertion");
      } finally {
        removeFixture(root);
      }
    },
  );

  it("accepts an assertion against a runtime value", () => {
    const root = createHandoff();
    try {
      const implementationPath = path.join(root, "code", CASES[0].implementationPath);
      const source = fs.readFileSync(implementationPath, "utf8");
      fs.writeFileSync(
        implementationPath,
        source.replace(
          '  await expect(page.getByRole("heading", { name: "商品一覧" }).first()).toBeVisible();\n',
          '  expect(await page.getByRole("heading", { name: "商品一覧" }).first().textContent()).toBe("商品一覧");\n',
        ),
        "utf8",
      );
      updateReceipt(root, "c10-improved", (receipt) => {
        for (const executionCase of receipt.cases) {
          const implementationPath = executionCase.implementation_path;
          if (typeof implementationPath === "string")
            executionCase.code_digest = digest(
              fs.readFileSync(path.join(root, "code", implementationPath), "utf8"),
            );
        }
      });
      updateReceipt(root, "mobile-exercise", (receipt) => {
        for (const executionCase of receipt.cases) {
          const implementationPath = executionCase.implementation_path;
          if (typeof implementationPath === "string")
            executionCase.code_digest = digest(
              fs.readFileSync(path.join(root, "code", implementationPath), "utf8"),
            );
        }
      });
      for (const context of ["diagnostic-initial", "diagnostic-repaired"] as const) {
        updateReceipt(root, context, (receipt) => {
          for (const executionCase of receipt.cases) {
            const implementationPath = executionCase.implementation_path;
            if (typeof implementationPath === "string")
              executionCase.code_digest = digest(
                `${fs.readFileSync(path.join(root, "code", implementationPath), "utf8")}\n${context}`,
              );
          }
        });
      }
      const result = checkCompletion(root, "common");
      expect(result.status).toBe("PASS");
      expect(result.receipt.reasons).toEqual([]);
      expect(result.receipt.reasons.join("\n")).not.toContain("meaningless literal Assertion");
    } finally {
      removeFixture(root);
    }
  });

  it("restores the diagnostic exercise only inside an explicit external root", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "diagnostic-restore-contract-"));
    try {
      expect(() =>
        restoreDiagnosticExercise(
          process.cwd(),
          path.join(process.cwd(), "output", "diagnostic-contract.spec.ts"),
          false,
        ),
      ).toThrow("outside the canonical repository");
      expect(() =>
        restoreDiagnosticExercise(root, path.join(root, "..", "outside.spec.ts"), false),
      ).toThrow("inside --root");

      const target = path.join(root, "diagnostic-exercises", "diagnostic-cart.spec.ts");
      expect(restoreDiagnosticExercise(root, target, false)).toBe(target);
      expect(fs.readFileSync(target, "utf8")).toContain("TC-CART-001 diagnostic exercise");
      expect(() => restoreDiagnosticExercise(root, target, false)).toThrow("pass --force");
      expect(restoreDiagnosticExercise(root, target, true)).toBe(target);
    } finally {
      removeFixture(root);
    }
  });

  it("rejects using TC-PRODUCT-001 as a formal learner implementation", () => {
    const root = createHandoff();
    try {
      addProvidedProductCase(root, CASES[0].implementationPath);
      const result = checkCompletion(root, "common");
      expect(result.status).toBe("FAIL");
      expect(result.receipt.reasons.join("\n")).toContain("Provided Training Case");
    } finally {
      removeFixture(root);
    }
  });

  it("does not complete a handoff that includes the provided Canonical Helper", () => {
    const root = createHandoff();
    try {
      writeText(root, "code/training/playwright/support/reset-scenario.ts", "export {}\n");
      const result = checkCompletion(root, "common");
      expect(result.status).toBe("FAIL");
      expect(result.receipt.reasons.join("\n")).toContain("must not be learner-owned code");
    } finally {
      removeFixture(root);
    }
  });

  it("requires both Desktop and learner-owned Mobile Web executions for C07", () => {
    const root = createHandoff({ mobile: "none" });
    try {
      const result = checkCompletion(root, "common");
      expect(result.status).not.toBe("PASS");
      expect(result.receipt.checked_outputs.c07_web_projects).toBe(false);
      expect(result.receipt.reasons.join("\n")).toContain("training-mobile-chromium");
    } finally {
      removeFixture(root);
    }
  });

  it("does not count Mobile baseline cases as learner-owned C07 executions", () => {
    const root = createHandoff({ mobile: "baseline" });
    try {
      const result = checkCompletion(root, "common");
      expect(result.status).not.toBe("PASS");
      expect(result.receipt.checked_outputs.c07_web_projects).toBe(false);
      expect(result.receipt.reasons.join("\n")).toContain("training-mobile-chromium");
    } finally {
      removeFixture(root);
    }
  });

  it("accepts one successful Mobile Web execution for multiple Playwright learner Cases", () => {
    const root = createHandoff();
    try {
      removeCaseFromReceipt(root, "mobile-exercise", CASES[1].caseId);
      const result = checkCompletion(root, "common");
      expect(result.status).toBe("PASS");
      expect(result.receipt.checked_outputs.c07_web_projects).toBe(true);
    } finally {
      removeFixture(root);
    }
  });

  it("requires Reset and Assertion inside the matching Case when Cases share one spec", () => {
    const root = createHandoff();
    try {
      const sharedPath = "training/playwright/exercises/shared.spec.ts";
      const sharedSource = `import { expect, test } from "@playwright/test";
import { resetScenario } from "../../support/reset-scenario";

test("TC-CART-101 shared Case", async ({ page }) => {
  await resetScenario(page, "default");
  await expect(page.getByRole("heading", { name: "商品一覧" }).first()).toBeVisible();
});

test("TC-CART-102 shared Case", async ({ page }) => {
  await page.goto("/products");
});
`;
      const mappingPath = path.join(root, "workbook/03_automation-mapping.csv");
      fs.writeFileSync(
        mappingPath,
        fs
          .readFileSync(mappingPath, "utf8")
          .replaceAll(CASES[0].implementationPath, sharedPath)
          .replaceAll(CASES[1].implementationPath, sharedPath),
        "utf8",
      );
      writeText(root, `code/${sharedPath}`, sharedSource);
      for (const receiptFile of fs.readdirSync(path.join(root, "receipts"))) {
        if (!receiptFile.endsWith(".json")) continue;
        const receiptPath = path.join(root, "receipts", receiptFile);
        const receipt = JSON.parse(fs.readFileSync(receiptPath, "utf8")) as {
          cases: Record<string, unknown>[];
        };
        for (const executionCase of receipt.cases) {
          if (
            executionCase.case_id === CASES[0].caseId ||
            executionCase.case_id === CASES[1].caseId
          )
            executionCase.implementation_path = sharedPath;
        }
        fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
      }
      refreshReceiptDigests(root);
      const result = checkCompletion(root, "common");
      expect(result.receipt.checked_outputs.learner_code).toBe(false);
      expect(result.receipt.reasons.join("\n")).toContain(
        "TC-CART-102 learner code has no explicit resetScenario call",
      );
    } finally {
      removeFixture(root);
    }
  });

  it("binds execution-improvement rows to the matching Receipt result and Evidence", () => {
    const root = createHandoff();
    try {
      const workbookPath = path.join(root, "workbook", "04_execution-improvement.csv");
      const workbook = fs
        .readFileSync(workbookPath, "utf8")
        .replace(`${CASES[0].caseId},local-exercise,Pass`, `${CASES[0].caseId},local-exercise,Fail`)
        .replace(
          `evidence/local-exercise-${CASES[1].caseId}.md`,
          "evidence/unlinked-local-exercise.md",
        );
      fs.writeFileSync(workbookPath, workbook, "utf8");
      writeText(root, "evidence/unlinked-local-exercise.md", "unrelated evidence\n");

      expect(checkCompletion(root, "common").status).toBe("FAIL");
    } finally {
      removeFixture(root);
    }
  });

  it("rejects a hand-written or non-formal Receipt command", () => {
    const root = createHandoff();
    try {
      updateReceipt(root, "local-exercise", (receipt) => {
        receipt.run.command = "echo tests completed";
      });
      expect(checkCompletion(root, "common").status).toBe("FAIL");
    } finally {
      removeFixture(root);
    }
  });

  it.each([
    ["starter only", { codeStyle: "starter" as const }],
    ["suite result has no learner cases", { omitCases: true }],
    ["evidence is missing", { missingEvidence: true }],
    ["receipt belongs to another case", { mismatchedCase: true }],
    ["required execution is NOT_RUN", { contexts: ["local-exercise" as const], omitCases: false }],
  ])("does not PASS when %s", (_label, options) => {
    const root = createHandoff(options);
    if (_label === "required execution is NOT_RUN") {
      const receiptPath = path.join(root, "receipts", "execution-receipt-local-exercise.json");
      const receipt = JSON.parse(fs.readFileSync(receiptPath, "utf8")) as {
        run: Record<string, unknown>;
        cases: Record<string, unknown>[];
      };
      receipt.run.exit_code = null;
      receipt.cases.forEach((entry) => {
        entry.status = "skipped";
        entry.result = "skipped";
      });
      fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
    }
    try {
      const result = checkCompletion(root, "common");
      expect(result.status).not.toBe("PASS");
      expect(result.receipt.exit_code).not.toBe(0);
      if (_label === "receipt belongs to another case") expect(result.status).toBe("FAIL");
    } finally {
      removeFixture(root);
    }
  });

  it("accepts diagnostic initial Failure only with a separate repaired Pass and Evidence", () => {
    const root = createHandoff({
      contexts: [
        "local-exercise",
        "c10-before",
        "diagnostic-initial",
        "diagnostic-repaired",
        "c10-improved",
      ],
    });
    try {
      expect(checkCompletion(root, "common").status).toBe("PASS");
    } finally {
      removeFixture(root);
    }
  });

  it("applies the same Workbook Failure analysis contract to a natural learner Failure", () => {
    const root = createHandoff({ contexts: ["learner-failure", "learner-repaired"] });
    try {
      const result = checkCompletion(root, "common");
      expect(result.receipt.checked_outputs.c09_diagnostic).toBe(true);
      expect(result.receipt.reasons.join("\n")).not.toContain("C09 requires");

      for (const entry of CASES)
        updateExecutionRow(root, entry.caseId, "learner-failure", { cause: "" });
      const incomplete = checkCompletion(root, "common");
      expect(incomplete.receipt.checked_outputs.c09_diagnostic).toBe(false);
    } finally {
      removeFixture(root);
    }
  });

  it.each(["failure_category", "cause", "action"] as const)(
    "requires %s in every selected C09 initial Workbook row",
    (field) => {
      const root = createHandoff();
      try {
        for (const entry of CASES)
          updateExecutionRow(root, entry.caseId, "diagnostic-initial", { [field]: "" });
        const result = checkCompletion(root, "common");
        expect(result.status).not.toBe("PASS");
        expect(result.receipt.checked_outputs.c09_diagnostic).toBe(false);
      } finally {
        removeFixture(root);
      }
    },
  );

  it.each(["initial Workbook row", "repaired Workbook row"] as const)(
    "requires the selected C09 %s",
    (missing) => {
      const root = createHandoff();
      try {
        for (const entry of CASES)
          removeExecutionRow(
            root,
            entry.caseId,
            missing === "initial Workbook row" ? "diagnostic-initial" : "diagnostic-repaired",
          );
        const result = checkCompletion(root, "common");
        expect(result.status).not.toBe("PASS");
        expect(result.receipt.checked_outputs.c09_diagnostic).toBe(false);
      } finally {
        removeFixture(root);
      }
    },
  );

  it("requires C09 Workbook Evidence to point to the selected initial Receipt", () => {
    const root = createHandoff();
    try {
      for (const entry of CASES)
        updateExecutionRow(root, entry.caseId, "diagnostic-initial", {
          evidence: `evidence/local-exercise-${entry.caseId}.md`,
        });
      const result = checkCompletion(root, "common");
      expect(result.status).not.toBe("PASS");
      expect(result.receipt.checked_outputs.c09_diagnostic).toBe(false);
    } finally {
      removeFixture(root);
    }
  });

  it("requires diagnostic initial and repaired Receipts to have different code_digest values", () => {
    const root = createHandoff({ diagnosticSameDigest: true });
    try {
      const result = checkCompletion(root, "common");
      expect(result.status).not.toBe("PASS");
      expect(result.receipt.checked_outputs.c09_diagnostic).toBe(false);
      expect(result.receipt.reasons.join("\n")).toContain("different code_digest");
    } finally {
      removeFixture(root);
    }
  });

  it("requires a later diagnostic Receipt", () => {
    const root = createHandoff();
    try {
      const initial = receiptAt(
        path.join(root, "receipts", "execution-receipt-diagnostic-initial.json"),
      );
      updateReceipt(root, "diagnostic-repaired", (receipt) => {
        if (initial.generated_at !== undefined) receipt.generated_at = initial.generated_at;
        receipt.run.started_at = initial.run.started_at;
        receipt.run.finished_at = initial.run.finished_at;
        receipt.cases.forEach((executionCase, index) => {
          executionCase.code_digest = initial.cases[index]?.code_digest ?? null;
        });
      });
      const result = checkCompletion(root, "common");
      expect(result.status).not.toBe("PASS");
      expect(result.receipt.checked_outputs.c09_diagnostic).toBe(false);
      expect(result.receipt.reasons.join("\n")).toContain("must be later than initial");
    } finally {
      removeFixture(root);
    }
  });

  it.each([
    ["diagnostic repaired run is missing", ["diagnostic-initial" as const]],
    [
      "initial and repaired Evidence is overwritten",
      ["diagnostic-initial" as const, "diagnostic-repaired" as const],
      true,
    ],
  ])("does not PASS when %s", (_label, contexts, shared = false) => {
    const root = createHandoff({ contexts, sharedDiagnosticEvidence: shared });
    try {
      expect(checkCompletion(root, "common").status).not.toBe("PASS");
    } finally {
      removeFixture(root);
    }
  });

  it("requires CI references for Part 2 but keeps source, submission, and CI SHA fields separate", () => {
    const root = createHandoff({
      mode: "part2",
      contexts: [
        "local-exercise",
        "c10-before",
        "diagnostic-initial",
        "diagnostic-repaired",
        "c10-improved",
        "ci-exercise",
      ],
    });
    try {
      const result = checkCompletion(root, "part2");

      expect(result.status).toBe("PASS");
      expect(result.receipt.required_competencies).toContain("C12");
      expect(result.receipt.ci_sha).toBe(CI_SHA);
      expect(result.receipt.training_copy_source_sha).toBe(CI_SOURCE_SHA);
      expect(result.receipt.submission_sha).toBe(CI_SUBMISSION_SHA);
      expect(result.receipt.execution_sha).toBe(CI_EXECUTION_SHA);
      expect(result.receipt.evidence_refs).toContain("evidence/ci.md");
      expect(result.receipt.checked_competencies).toEqual(["C07", "C09", "C10", "C11", "C12"]);
    } finally {
      removeFixture(root);
    }
  });

  it("rejects CI metadata when ci_sha and github_sha are not the same evaluated revision", () => {
    const root = createHandoff({ mode: "part2", contexts: ["ci-exercise"] });
    try {
      updateReceipt(root, "ci-exercise", (receipt) => {
        receipt.run.ci_sha = "e".repeat(40);
      });
      expect(checkCompletion(root, "part2").status).toBe("FAIL");
    } finally {
      removeFixture(root);
    }
  });

  it("requires the Artifact name to match GitHub Run ID and attempt", () => {
    const root = createHandoff({ mode: "part2", contexts: ["ci-exercise"] });
    try {
      updateReceipt(root, "ci-exercise", (receipt) => {
        const ci = receipt.run.ci as Record<string, unknown>;
        ci.artifact_name = "artifact-url-only";
      });
      const result = checkCompletion(root, "part2");
      expect(result.status).toBe("FAIL");
      expect(result.receipt.reasons.join("\n")).toContain("artifact_name must match");
    } finally {
      removeFixture(root);
    }
  });

  it("does not use CI Evidence from a different Receipt", () => {
    const root = createHandoff({
      mode: "part2",
      contexts: [
        "local-exercise",
        "diagnostic-initial",
        "diagnostic-repaired",
        "c10-improved",
        "ci-exercise",
      ],
    });
    try {
      updateReceipt(root, "ci-exercise", (receipt) => {
        const ci = receipt.run.ci as Record<string, unknown>;
        ci.github_run_id = "99999";
      });
      writeText(
        root,
        "evidence/unrelated-ci.md",
        "Run ID: 12345\nRun attempt: 1\nCheck: Scenario Shop Training Web / training-web\nArtifact: training-web-12345-1\nResult: success\nCase: TC-CART-101\n",
      );
      expect(checkCompletion(root, "part2").status).not.toBe("PASS");
    } finally {
      removeFixture(root);
    }
  });

  it("classifies an explicitly unavailable environment as BLOCKED", () => {
    const root = createHandoff({ blocked: true });
    try {
      const result = checkCompletion(root, "common");
      expect(result.status).toBe("BLOCKED");
      expect(result.receipt.blocked_reason).toContain("blocked");
    } finally {
      removeFixture(root);
    }
  });

  it("classifies a blocked run with zero cases as BLOCKED before case-level NOT_RUN", () => {
    const root = createHandoff({ contexts: ["local-exercise"], omitCases: true, blocked: true });
    try {
      const result = checkCompletion(root, "common");
      expect(result.status).toBe("BLOCKED");
      expect(result.receipt.blocked_reason).toContain("blocked");
    } finally {
      removeFixture(root);
    }
  });

  it("classifies an available run with zero cases as NOT_RUN", () => {
    const root = createHandoff({ contexts: ["local-exercise"], omitCases: true });
    try {
      expect(checkCompletion(root, "common").status).toBe("NOT_RUN");
    } finally {
      removeFixture(root);
    }
  });

  it("does not let an older blocked Receipt override a newer available Receipt", () => {
    const root = createHandoff();
    try {
      const history = receiptAt(
        path.join(root, "receipts", "execution-receipt-local-exercise.json"),
      );
      history.generated_at = "2025-09-17T00:00:01.000Z";
      history.run.started_at = "2025-09-17T00:00:00.000Z";
      history.run.finished_at = "2025-09-17T00:00:01.000Z";
      history.run.blocked = true;
      history.run.environment_status = "blocked";
      history.run.blocked_reason = "historical environment outage";
      writeText(
        root,
        "receipts/execution-receipt-local-exercise-history.json",
        `${JSON.stringify(history, null, 2)}\n`,
      );
      expect(checkCompletion(root, "common").status).toBe("PASS");
    } finally {
      removeFixture(root);
    }
  });

  it.each([
    [
      "absolute implementation path",
      (root: string) => {
        const file = path.join(root, "workbook", "03_automation-mapping.csv");
        const value = fs
          .readFileSync(file, "utf8")
          .replace(CASES[0].implementationPath, "C:\\outside\\learner.spec.ts");
        fs.writeFileSync(file, value, "utf8");
      },
    ],
    ["invalid Receipt schema", (_root: string) => undefined],
  ])("classifies %s as non-PASS", (_label, mutate) => {
    const root = createHandoff(_label === "invalid Receipt schema" ? { invalidReceipt: true } : {});
    try {
      mutate(root);
      expect(checkCompletion(root, "common").status).toBe("FAIL");
    } finally {
      removeFixture(root);
    }
  });

  it("rejects Completion Receipt self-reference", () => {
    const root = createHandoff();
    try {
      const first = checkCompletion(root, "common");
      fs.copyFileSync(first.receiptPath, path.join(root, "receipts", "completion-receipt.json"));
      expect(checkCompletion(root, "common").status).toBe("FAIL");
    } finally {
      removeFixture(root);
    }
  });

  it("rejects a handoff directory symlink that escapes the root when the host permits symlinks", () => {
    const root = createHandoff();
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), "training-completion-outside-"));
    try {
      fs.rmSync(path.join(root, "evidence"), { recursive: true, force: true });
      try {
        fs.symlinkSync(outside, path.join(root, "evidence"), "junction");
      } catch {
        return;
      }
      expect(checkCompletion(root, "common").status).toBe("FAIL");
    } finally {
      removeFixture(root);
      removeFixture(outside);
    }
  });

  it("does not count a starter or baseline path as learner-owned code", () => {
    const root = createHandoff();
    try {
      const mappingPath = path.join(root, "workbook", "03_automation-mapping.csv");
      const mapping = fs
        .readFileSync(mappingPath, "utf8")
        .replace(
          CASES[0].implementationPath,
          "training/playwright/baseline/training-baseline.spec.ts",
        );
      fs.writeFileSync(mappingPath, mapping, "utf8");
      writeText(
        root,
        "code/training/playwright/baseline/training-baseline.spec.ts",
        learnerCode(CASES[0].caseId, "valid"),
      );
      refreshReceiptDigests(root);
      expect(checkCompletion(root, "common").status).toBe("FAIL");
    } finally {
      removeFixture(root);
    }
  });

  it("keeps a newly added Automate Case with an empty implementation_path in the learner set", () => {
    const root = createHandoff();
    try {
      addEmptyLearnerCase(root);
      const result = checkCompletion(root, "common");
      expect(result.status).toBe("INCOMPLETE");
      expect(result.receipt.checked_case_ids).toContain("TC-CART-103");
      expect(result.receipt.reasons.join("\n")).toContain(
        "TC-CART-103 learner Case has no implementation_path",
      );
    } finally {
      removeFixture(root);
    }
  });

  it("permits canonical sample and non-automated rows to keep an empty implementation_path", () => {
    const root = createHandoff({ contexts: [] });
    try {
      const casesPath = path.join(root, "workbook", "02_test-cases.csv");
      const mappingPath = path.join(root, "workbook", "03_automation-mapping.csv");
      const cases = fs
        .readFileSync(casesPath, "utf8")
        .replaceAll("TC-CART-101", "TC-CART-001")
        .replaceAll("TC-CART-102", "TC-CART-002");
      const mapping = fs
        .readFileSync(mappingPath, "utf8")
        .replace(
          "TC-CART-101,Automate,Web E2E,Playwright,training/playwright/exercises/cart-101.spec.ts",
          "TC-CART-001,Automate,Web E2E,Playwright,",
        )
        .replace(
          "TC-CART-102,Automate,Web E2E,Playwright,training/playwright/exercises/cart-102.spec.ts",
          "TC-CART-002,Automate,Web E2E,Playwright,",
        );
      fs.writeFileSync(casesPath, cases, "utf8");
      fs.writeFileSync(mappingPath, mapping, "utf8");
      const result = checkCompletion(root, "common");
      expect(result.receipt.reasons.join("\n")).not.toContain(
        "TC-CART-001 learner Case has no implementation_path",
      );
      expect(result.receipt.reasons.join("\n")).not.toContain(
        "TC-CART-002 learner Case has no implementation_path",
      );

      const laterRoot = createHandoff({ contexts: [] });
      try {
        const laterMappingPath = path.join(laterRoot, "workbook", "03_automation-mapping.csv");
        const laterMapping = fs
          .readFileSync(laterMappingPath, "utf8")
          .replace(
            "TC-CART-101,Automate,Web E2E,Playwright,training/playwright/exercises/cart-101.spec.ts",
            "TC-CART-101,Later,Web E2E,Playwright,,",
          );
        fs.writeFileSync(laterMappingPath, laterMapping, "utf8");
        const laterResult = checkCompletion(laterRoot, "common");
        expect(laterResult.receipt.reasons.join("\n")).not.toContain(
          "TC-CART-101 learner Case has no implementation_path",
        );
      } finally {
        removeFixture(laterRoot);
      }
    } finally {
      removeFixture(root);
    }
  });

  it("rejects a distributed canonical sample ID when a learner implementation path is assigned", () => {
    const root = createHandoff({ contexts: [] });
    try {
      const casesPath = path.join(root, "workbook", "02_test-cases.csv");
      const cases = fs
        .readFileSync(casesPath, "utf8")
        .replace("TC-CART-101,RISK-CART-101", "TC-CART-001,RISK-CART-101")
        .replace("TC-CART-102,RISK-CART-102", "TC-CART-002,RISK-CART-102");
      fs.writeFileSync(casesPath, cases, "utf8");
      const mappingPath = path.join(root, "workbook", "03_automation-mapping.csv");
      const mapping = fs
        .readFileSync(mappingPath, "utf8")
        .replace(
          "TC-CART-101,Automate,Web E2E,Playwright,training/playwright/exercises/cart-101.spec.ts",
          "TC-CART-001,Automate,Web E2E,Playwright,training/playwright/exercises/cart-101.spec.ts",
        )
        .replace(
          "TC-CART-102,Automate,Web E2E,Playwright,training/playwright/exercises/cart-102.spec.ts",
          "TC-CART-002,Automate,Web E2E,Playwright,training/playwright/exercises/cart-102.spec.ts",
        );
      fs.writeFileSync(mappingPath, mapping, "utf8");

      const result = checkCompletion(root, "common");
      expect(result.status).toBe("FAIL");
      expect(result.receipt.reasons.join("\n")).toContain(
        "Canonical sample Case must keep implementation_path empty",
      );
    } finally {
      removeFixture(root);
    }
  });

  it("does not satisfy C07 with reset or Assertion text in comments and strings", () => {
    const root = createHandoff();
    try {
      for (const entry of CASES) {
        writeText(
          root,
          `code/${entry.implementationPath}`,
          `import { test } from "@playwright/test";\n\nconst text = "resetScenario(page); expect(true)";\n// resetScenario(page); expect(page);\ntest("${entry.caseId} learner cart case", async ({ page }) => {\n  await page.goto("/products");\n});\n`,
        );
      }
      refreshReceiptDigests(root);
      const result = checkCompletion(root, "common");
      expect(result.status).not.toBe("PASS");
      expect(result.receipt.reasons.join("\n")).toContain("has no explicit resetScenario call");
    } finally {
      removeFixture(root);
    }
  });

  it("does not accept a duplicate mapping row", () => {
    const root = createHandoff();
    try {
      const mappingPath = path.join(root, "workbook", "03_automation-mapping.csv");
      const lines = fs.readFileSync(mappingPath, "utf8").trimEnd().split("\n");
      fs.writeFileSync(mappingPath, `${lines.join("\n")}\n${lines[1]}\n`, "utf8");
      expect(checkCompletion(root, "common").status).toBe("FAIL");
    } finally {
      removeFixture(root);
    }
  });

  it("selects the newest valid run while retaining an older failed Receipt", () => {
    const root = createHandoff();
    try {
      const currentPath = path.join(root, "receipts", "execution-receipt-local-exercise.json");
      const oldPath = path.join(root, "receipts", "execution-receipt-local-exercise-old.json");
      const oldReceipt = JSON.parse(fs.readFileSync(currentPath, "utf8")) as {
        run: Record<string, unknown>;
        cases: Record<string, unknown>[];
      };
      oldReceipt.run.started_at = "2025-09-17T00:00:00.000Z";
      oldReceipt.run.finished_at = "2025-09-17T00:00:01.000Z";
      oldReceipt.run.exit_code = 1;
      oldReceipt.cases.forEach((entry) => {
        entry.status = "failed";
        entry.result = "failed";
      });
      fs.writeFileSync(oldPath, `${JSON.stringify(oldReceipt, null, 2)}\n`, "utf8");
      expect(checkCompletion(root, "common").status).toBe("PASS");
    } finally {
      removeFixture(root);
    }
  });

  it("requires C10 to contain an actual improvement record and a clean rerun", () => {
    const root = createHandoff({
      contexts: ["local-exercise", "diagnostic-initial", "diagnostic-repaired"],
    });
    try {
      const result = checkCompletion(root, "common");
      expect(result.status).toBe("INCOMPLETE");
      expect(result.receipt.reasons.join("\n")).toContain("C10 requires");
      expect(result.receipt.checked_competencies).not.toContain("C10");
    } finally {
      removeFixture(root);
    }
  });

  it("requires a valid before Receipt for C10", () => {
    const root = createHandoff({
      contexts: ["local-exercise", "diagnostic-initial", "diagnostic-repaired", "c10-improved"],
    });
    try {
      const result = checkCompletion(root, "common");
      expect(result.status).not.toBe("PASS");
      expect(result.receipt.checked_outputs.c10_improvement).toBe(false);
      expect(result.receipt.reasons.join("\n")).toContain(
        "C10 improvement before Receipt is missing",
      );
    } finally {
      removeFixture(root);
    }
  });

  it("requires the learner-owned TC-CART-101 vertical Case", () => {
    const root = createHandoff();
    try {
      for (const relativePath of [
        "workbook/02_test-cases.csv",
        "workbook/03_automation-mapping.csv",
        "workbook/04_execution-improvement.csv",
      ]) {
        const file = path.join(root, relativePath);
        fs.writeFileSync(
          file,
          fs.readFileSync(file, "utf8").replaceAll("TC-CART-101", "TC-CART-103"),
          "utf8",
        );
      }
      for (const entry of fs.readdirSync(path.join(root, "receipts"))) {
        if (!entry.endsWith(".json")) continue;
        const file = path.join(root, "receipts", entry);
        const receipt = fs
          .readFileSync(file, "utf8")
          .replaceAll('"case_id": "TC-CART-101"', '"case_id": "TC-CART-103"');
        fs.writeFileSync(file, receipt, "utf8");
      }
      const result = checkCompletion(root, "common");
      expect(result.status).not.toBe("PASS");
      expect(result.receipt.reasons.join("\n")).toContain(
        "TC-CART-101 must itself be an Automate/Web E2E/Playwright learner-owned Case",
      );
    } finally {
      removeFixture(root);
    }
  });

  it("does not accept a C10 improvement record when the code digest is unchanged", () => {
    const root = createHandoff();
    try {
      const localReceipt = receiptAt(
        path.join(root, "receipts", "execution-receipt-local-exercise.json"),
      );
      const originalSources = CASES.map((entry) => learnerCode(entry.caseId, "valid"));
      CASES.forEach((entry, index) =>
        writeText(root, `code/${entry.implementationPath}`, originalSources[index] ?? ""),
      );
      updateReceipt(root, "c10-improved", (receipt) => {
        receipt.cases.forEach((executionCase, index) => {
          executionCase.code_digest = localReceipt.cases[index]?.code_digest ?? null;
        });
      });
      const result = checkCompletion(root, "common");
      expect(result.status).not.toBe("PASS");
      expect(result.receipt.checked_outputs.c10_improvement).toBe(false);
    } finally {
      removeFixture(root);
    }
  });

  it("accepts a C10 improvement made only in learner-owned helper code", () => {
    const root = createHandoff();
    try {
      const helperPath = "training/playwright/support/cart-helper.ts";
      const beforeHelper = "export const productsHeading = 'old';\n";
      const afterHelper = "export const productsHeading = 'new';\n";
      writeText(root, `code/${helperPath}`, afterHelper);
      const beforeSource = learnerCode(CASES[0].caseId, "valid");
      updateReceipt(root, "c10-before", (receipt) => {
        const executionCase = receipt.cases.find((entry) => entry.case_id === CASES[0].caseId);
        if (!executionCase) throw new Error("C10 before case is missing");
        executionCase.code_digests = { [helperPath]: digest(beforeHelper) };
      });
      updateReceipt(root, "c10-improved", (receipt) => {
        const executionCase = receipt.cases.find((entry) => entry.case_id === CASES[0].caseId);
        if (!executionCase) throw new Error("C10 case is missing");
        executionCase.code_digest = digest(
          `${beforeSource}\n// C10 minimal maintainability improvement\n`,
        );
        executionCase.code_digests = { [helperPath]: digest(afterHelper) };
      });
      updateExecutionRow(root, CASES[0].caseId, "c10-improved", {
        improvement: `Improvement Target: ${helperPath}; Problem: repeated Locator maintenance; Why: changes would be duplicated; Action: centralize the helper; Improvement: rerun passed`,
      });
      const result = checkCompletion(root, "common");
      expect(result.status).toBe("PASS");
      expect(result.receipt.checked_outputs.c10_improvement).toBe(true);
    } finally {
      removeFixture(root);
    }
  });

  it("accepts the provided deterministic C10 exercise under its reserved Case ID", () => {
    const root = createHandoff({
      contexts: ["local-exercise", "diagnostic-initial", "diagnostic-repaired"],
    });
    const implementationPath = "training/playwright/exercises/c10-provided.spec.ts";
    const beforeSource = `import { expect, test } from "@playwright/test";\nimport { resetScenario } from "../support/reset-scenario";\n\ntest("TC-CART-900 provided C10 exercise", async ({ page }) => {\n  await resetScenario(page, "default");\n  await expect(page.getByRole("heading", { name: "すべての商品" })).toBeVisible();\n});\n`;
    const afterSource = `${beforeSource}\n// learner-owned maintenance improvement\n`;
    try {
      writeText(root, `code/${implementationPath}`, afterSource);
      writeText(root, "evidence/c10-provided-before.md", "provided C10 before evidence\n");
      writeText(root, "evidence/c10-provided-improved.md", "provided C10 improved evidence\n");
      fs.appendFileSync(
        path.join(root, "workbook", "04_execution-improvement.csv"),
        csv([
          ["TC-CART-900", "c10-before", "Pass", "evidence/c10-provided-before.md", "", "", "", ""],
          [
            "TC-CART-900",
            "c10-improved",
            "Pass",
            "evidence/c10-provided-improved.md",
            "Maintainability",
            "repeated Locator",
            "centralize the Locator",
            `Improvement Target: ${implementationPath}; Problem: repeated Locator; Why: maintenance changes would be duplicated; Action: centralize the Locator; Improvement: rerun passed`,
          ],
        ]),
        "utf8",
      );
      writeText(root, `code/${implementationPath}`, beforeSource);
      writeProvidedC10Receipt(
        root,
        "c10-before",
        implementationPath,
        digest(beforeSource),
        "evidence/c10-provided-before.md",
      );
      writeText(root, `code/${implementationPath}`, afterSource);
      writeProvidedC10Receipt(
        root,
        "c10-improved",
        implementationPath,
        digest(afterSource),
        "evidence/c10-provided-improved.md",
      );
      const result = checkCompletion(root, "common");
      expect(result.status).toBe("PASS");
      expect(result.receipt.checked_outputs.c10_improvement).toBe(true);
    } finally {
      removeFixture(root);
    }
  });

  it("does not accept a C10 improvement Receipt that is older than its before Receipt", () => {
    const root = createHandoff();
    try {
      updateReceipt(root, "c10-improved", (receipt) => {
        receipt.generated_at = "2025-09-17T00:00:01.000Z";
        receipt.run.started_at = "2025-09-17T00:00:00.000Z";
        receipt.run.finished_at = "2025-09-17T00:00:01.000Z";
      });
      const result = checkCompletion(root, "common");
      expect(result.status).not.toBe("PASS");
      expect(result.receipt.checked_outputs.c10_improvement).toBe(false);
    } finally {
      removeFixture(root);
    }
  });

  it("does not accept a C10 improvement that reuses before Evidence", () => {
    const root = createHandoff();
    try {
      updateReceipt(root, "c10-improved", (receipt) => {
        receipt.cases.forEach((executionCase) => {
          executionCase.evidence = [`evidence/c10-before-${String(executionCase.case_id)}.md`];
        });
      });
      for (const entry of CASES)
        updateExecutionRow(root, entry.caseId, "c10-improved", {
          evidence: `evidence/c10-before-${entry.caseId}.md`,
        });
      const result = checkCompletion(root, "common");
      expect(result.receipt.checked_outputs.c10_improvement).toBe(false);
      expect(result.receipt.reasons.join("\n")).toContain("before and improved share Evidence");
    } finally {
      removeFixture(root);
    }
  });

  it.each(["case_id", "implementation_path"] as const)(
    "does not accept a C10 Receipt that tracks a different %s",
    (field) => {
      const root = createHandoff();
      try {
        updateReceipt(root, "c10-improved", (receipt) => {
          receipt.cases.forEach((executionCase) => {
            if (field === "case_id") executionCase.case_id = "TC-CART-999";
            else executionCase.implementation_path = "training/playwright/exercises/other.spec.ts";
          });
        });
        const result = checkCompletion(root, "common");
        expect(result.status).not.toBe("PASS");
        expect(result.receipt.checked_outputs.c10_improvement).toBe(false);
      } finally {
        removeFixture(root);
      }
    },
  );

  it("does not treat a retry Failure followed by Pass as a clean C10 rerun", () => {
    const root = createHandoff();
    try {
      updateReceipt(root, "c10-improved", (receipt) => {
        for (const executionCase of receipt.cases) {
          executionCase.retries = [
            { retry_index: 0, status: "failed", duration_ms: 10, evidence: executionCase.evidence },
            { retry_index: 1, status: "passed", duration_ms: 10, evidence: executionCase.evidence },
          ];
        }
      });
      expect(checkCompletion(root, "common").status).toBe("INCOMPLETE");
    } finally {
      removeFixture(root);
    }
  });

  it("requires C11 change-management fields and human CI Evidence for Part 2", () => {
    const root = createHandoff({
      mode: "part2",
      contexts: ["local-exercise", "diagnostic-initial", "diagnostic-repaired", "c10-improved"],
    });
    try {
      expect(checkCompletion(root, "part2").status).toBe("INCOMPLETE");
      fs.rmSync(path.join(root, "evidence", "change-management.md"));
      const withoutC11 = checkCompletion(root, "part2");
      expect(withoutC11.receipt.reasons.join("\n")).toContain("C11");
    } finally {
      removeFixture(root);
    }
  });

  it("requires Reason in the C11 change-management record", () => {
    const root = createHandoff({ mode: "part2", contexts: ["local-exercise"] });
    try {
      const evidencePath = path.join(root, "evidence/change-management.md");
      fs.writeFileSync(
        evidencePath,
        fs.readFileSync(evidencePath, "utf8").replace(/\nReason:.*\n?$/, "\n"),
        "utf8",
      );
      const result = checkCompletion(root, "part2");
      expect(result.receipt.checked_outputs.c11_change_management).toBe(false);
      expect(result.receipt.reasons.join("\n")).toContain("Reason");
    } finally {
      removeFixture(root);
    }
  });

  it("does not accept machine-generated CI metadata as human Evidence", () => {
    const root = createHandoff({
      mode: "part2",
      contexts: [
        "local-exercise",
        "diagnostic-initial",
        "diagnostic-repaired",
        "c10-improved",
        "ci-exercise",
      ],
    });
    try {
      for (const entry of CASES)
        writeText(
          root,
          `evidence/ci-exercise-${entry.caseId}.md`,
          `Generated by Training Receipt producer; machine metadata only.\nRun ID: 12345\nRun attempt: 1\nCheck: Scenario Shop Training Web / training-web\nArtifact: training-web-12345-1\nResult: success\nCase: ${entry.caseId}\n`,
        );
      expect(checkCompletion(root, "part2").status).toBe("INCOMPLETE");
    } finally {
      removeFixture(root);
    }
  });

  it("stops safely on an Evidence symlink cycle when the host permits symlinks", () => {
    const root = createHandoff();
    try {
      try {
        fs.symlinkSync(
          path.join(root, "evidence"),
          path.join(root, "evidence", "cycle"),
          "junction",
        );
      } catch {
        return;
      }
      expect(checkCompletion(root, "common").status).toBe("FAIL");
    } finally {
      removeFixture(root);
    }
  });
});
