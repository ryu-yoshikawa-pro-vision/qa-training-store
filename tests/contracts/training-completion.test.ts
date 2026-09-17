import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { checkCompletion } from "../../scripts/training/check-completion";

const SOURCE_SHA = "a".repeat(40);
const SUBMISSION_SHA = "b".repeat(40);
const EXECUTION_SHA = "c".repeat(40);
const CI_SHA = "d".repeat(40);

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
  | "diagnostic-initial"
  | "diagnostic-repaired"
  | "c10-improved"
  | "ci-exercise";

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

function writeExecutionReceipt(
  root: string,
  context: ReceiptContext,
  options: FixtureOptions,
): void {
  const isInitial = context === "diagnostic-initial";
  const isCi = context === "ci-exercise";
  const isDiagnostic = context === "diagnostic-initial" || context === "diagnostic-repaired";
  const cases = options.omitCases
    ? []
    : CASES.map((entry) => {
        const source = fs.readFileSync(path.join(root, "code", entry.implementationPath), "utf8");
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
        const status = isInitial ? "failed" : "passed";
        return {
          case_id: caseId,
          title: `${caseId ?? "learner"} fixture result`,
          track: "web",
          status,
          result: status,
          code_digest: digest(source),
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
    command: `pnpm run training:web:exercise:with-receipt -- --suite ${isDiagnostic ? "diagnostic" : "exercise"} --project training-chromium --root ${root} --run-context ${context}`,
    exit_code: isInitial ? 1 : 0,
    started_at: "2026-09-17T00:00:00.000Z",
    finished_at: "2026-09-17T00:00:01.000Z",
    environment: {
      platform: "win32",
      runtime: "Playwright Training",
      browser: "training-chromium",
      execution: isCi ? "ci" : "local",
    },
    run_context: context,
    project: "training-chromium",
    part1_distribution_sha: SOURCE_SHA,
    training_copy_source_sha: SOURCE_SHA,
    submission_sha: SUBMISSION_SHA,
    execution_sha: EXECUTION_SHA,
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
      ? { environment_status: "blocked", blocked_reason: "Training Copy is unavailable" }
      : {}),
  };
  const receipt = {
    schema_version: options.invalidReceipt ? 2 : 1,
    kind: "execution-receipt",
    generated_at: "2026-09-17T00:00:01.000Z",
    run,
    cases,
  };
  writeText(
    root,
    `receipts/execution-receipt-${context}.json`,
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
    "diagnostic-initial",
    "diagnostic-repaired",
    "c10-improved",
  ];
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
          context === "diagnostic-initial" ? "Fail" : "Pass",
          context === "ci-exercise"
            ? `evidence/ci-exercise-${entry.caseId}.md`
            : `evidence/${context}-${entry.caseId}.md`,
          context === "diagnostic-initial" || context === "c10-improved" ? "Assertion" : "",
          context === "diagnostic-initial" || context === "c10-improved" ? "fixture mismatch" : "",
          context === "diagnostic-initial" || context === "c10-improved"
            ? "inspect and repair"
            : "",
          context === "diagnostic-initial" || context === "c10-improved"
            ? "record repaired run"
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
      "Branch: training/learner\nCommit: bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb\nDiff: training/playwright/exercises/cart-101.spec.ts\nPull Request: https://github.com/example/training/pull/1\nReview: self-review completed\n",
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
  for (const context of contexts) writeExecutionReceipt(root, context, options);
  return root;
}

function removeFixture(root: string): void {
  fs.rmSync(root, { recursive: true, force: true });
}

function updateReceipt(
  root: string,
  context: ReceiptContext,
  update: (receipt: { run: Record<string, unknown>; cases: Record<string, unknown>[] }) => void,
): void {
  const receiptPath = path.join(root, "receipts", `execution-receipt-${context}.json`);
  const receipt = JSON.parse(fs.readFileSync(receiptPath, "utf8")) as {
    run: Record<string, unknown>;
    cases: Record<string, unknown>[];
  };
  update(receipt);
  fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
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
      expect(result.receipt.execution_receipt_refs).toHaveLength(4);
      expect(result.receipt.semantic_understanding).toBe("NOT_EVALUATED");
      expect(result.receipt.part1_distribution_sha).toBe(SOURCE_SHA);
      expect(result.receipt.submission_sha).toBe(SUBMISSION_SHA);
      expect(result.receipt.execution_sha).toBe(EXECUTION_SHA);
      expect(result.receipt.machine_checked_competencies).toEqual(["C07", "C09", "C10"]);
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
      contexts: ["local-exercise", "diagnostic-initial", "diagnostic-repaired", "c10-improved"],
    });
    try {
      expect(checkCompletion(root, "common").status).toBe("PASS");
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
      expect(result.receipt.training_copy_source_sha).toBe(SOURCE_SHA);
      expect(result.receipt.execution_sha).toBe(EXECUTION_SHA);
      expect(result.receipt.evidence_refs).toContain("evidence/ci.md");
      expect(result.receipt.machine_checked_competencies).toEqual([
        "C07",
        "C09",
        "C10",
        "C11",
        "C12",
      ]);
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
