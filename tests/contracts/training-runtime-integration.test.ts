import crypto from "node:crypto";
import { execFileSync, spawn, type ChildProcessByStdio } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import type { Readable } from "node:stream";
import { describe, expect, it } from "vitest";
import { checkCompletion } from "../../scripts/training/check-completion";
import { materializeTrainingHandoff } from "../../scripts/training/materialize-training-handoff";
import { restoreDiagnosticExercise } from "../../scripts/training/restore-diagnostic-exercise";
import {
  runPlaywrightWithReceipt,
  type ExecutionReceipt,
} from "../../scripts/training/run-playwright-with-receipt";

const RUN_RUNTIME_CONTRACT = process.env.RUN_TRAINING_RUNTIME_CONTRACT === "1";
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

function digest(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function learnerSpec(caseId: string, variableAssertion: boolean): string {
  const assertion = variableAssertion
    ? `  const productsHeading = productsHeadingFor(page);\n  await expect(productsHeading).toBeVisible();`
    : `  await expect(productsHeadingFor(page)).toBeVisible();`;
  return `import { expect, test } from "@playwright/test";
import { resetScenario } from "../support/reset-scenario";
import { productsHeadingFor } from "../support/learner-helper";

test("${caseId} learner cart check", async ({ page }) => {
  await resetScenario(page, "default");
  await page.goto("/products");
${assertion}
});
`;
}

function createHandoff(root: string): void {
  for (const directory of ["workbook", "code", "evidence", "receipts", "self-check"])
    fs.mkdirSync(path.join(root, directory), { recursive: true });
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
        "open the product list",
        "default scenario is reset",
        "the product list is visible",
        "equivalence partitioning",
      ]),
      [
        "TC-CART-001",
        CASES[0].riskId,
        "docs/spec/features/cart.md",
        "BR-CART-001",
        "AC-CART-001",
        "add four more units to an existing cart item",
        "default scenario is reset",
        "the cart quantity is five",
        "boundary analysis",
      ],
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
      [
        "TC-CART-001",
        "Later",
        "Web E2E",
        "Playwright",
        "",
        "Diagnostic",
        "provided diagnostic target",
      ],
    ]),
  );
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
      ...CASES.flatMap((entry) => [
        [entry.caseId, "local-exercise", "Not run", "", "", "", "", ""],
        [entry.caseId, "c10-before", "Not run", "", "", "", "", ""],
      ]),
      ["TC-CART-001", "diagnostic-initial", "Not run", "", "", "", "", ""],
      ["TC-CART-001", "diagnostic-repaired", "Not run", "", "", "", "", ""],
      ["TC-CART-101", "c10-improved", "Not run", "", "", "", "", ""],
    ]),
  );
  for (const entry of CASES)
    writeText(root, `code/${entry.implementationPath}`, learnerSpec(entry.caseId, false));
  writeText(
    root,
    "code/training/playwright/support/learner-helper.ts",
    `import type { Page, Locator } from "@playwright/test";\n\nexport function productsHeadingFor(page: Page): Locator {\n  return page.getByRole("heading", { name: "すべての商品" }).first();\n}\n`,
  );
  for (const lessonId of ["P1-01", "P1-02", "P1-03", "P1-04", "P1-05", "P1-06", "P1-08", "P1-09"])
    writeText(root, `self-check/${lessonId}.md`, `${lessonId} self-check\n`);
}

function createC10Handoff(root: string): void {
  for (const directory of ["workbook", "code", "evidence", "receipts", "self-check"])
    fs.mkdirSync(path.join(root, directory), { recursive: true });
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
      [
        "TARGET-CART-001",
        "docs/spec/features/cart.md",
        "BR-CART-001",
        "AC-CART-001",
        "RISK-CART-001",
        "購入上限を超える数量がCartに成立すると購入金額と在庫が壊れる",
        "Medium",
        "Medium",
        "Medium",
      ],
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
      [
        "TC-CART-101",
        "RISK-CART-001",
        "docs/spec/features/cart.md",
        "BR-CART-001",
        "AC-CART-001",
        "商品一覧見出しを確認する",
        "default ScenarioをResetする",
        "見出しが表示され商品という文言を含む",
        "保守性;同値分割",
      ],
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
      [
        "TC-CART-101",
        "Automate",
        "Web E2E",
        "Playwright",
        "training/playwright/exercises/c10-cart-101.spec.ts",
        "Local",
        "同じLocatorの変更箇所を減らす改善を確認する",
      ],
    ]),
  );
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
      ["TC-CART-101", "c10-before", "Not run", "", "", "", "", ""],
      ["TC-CART-101", "c10-improved", "Not run", "", "", "", "", ""],
    ]),
  );
  const learnerSpecPath = path.join(
    root,
    "code/training/playwright/exercises/c10-cart-101.spec.ts",
  );
  fs.mkdirSync(path.dirname(learnerSpecPath), { recursive: true });
  fs.copyFileSync(
    path.resolve("training/playwright/maintenance-exercises/c10-locator-maintenance.spec.ts"),
    learnerSpecPath,
  );
  for (const lessonId of ["P1-01", "P1-02", "P1-03", "P1-04", "P1-05", "P1-06", "P1-08", "P1-09"])
    writeText(root, `self-check/${lessonId}.md`, `${lessonId} self-check\n`);
}

function updateExecutionTable(
  root: string,
  results: {
    caseId: string;
    context: string;
    result: "Pass" | "Fail";
    evidence: string;
    failureCategory?: string;
    cause?: string;
    action?: string;
    improvement?: string;
  }[],
): void {
  const rows = [
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
    ...results.map((entry) => [
      entry.caseId,
      entry.context,
      entry.result,
      entry.evidence,
      entry.failureCategory ?? "",
      entry.cause ?? "",
      entry.action ?? "",
      entry.improvement ?? "",
    ]),
  ];
  writeText(root, "workbook/04_execution-improvement.csv", csv(rows));
}

function receiptAt(receiptPath: string): ExecutionReceipt {
  return JSON.parse(fs.readFileSync(receiptPath, "utf8")) as ExecutionReceipt;
}

function caseIn(receipt: ExecutionReceipt, caseId: string) {
  const executionCase = receipt.cases.find((entry) => entry.case_id === caseId);
  expect(executionCase).toBeDefined();
  return executionCase!;
}

function runReceipt(
  root: string,
  options: Parameters<typeof runPlaywrightWithReceipt>[0],
  expectedExitCode: number,
): ExecutionReceipt {
  const result = runPlaywrightWithReceipt(options);
  const receipt = receiptAt(result.receiptPath);
  expect(result.exitCode).toBe(expectedExitCode);
  expect(receipt.kind).toBe("execution-receipt");
  expect(receipt.run.run_context).toBe(options.runContext);
  expect(receipt.run.command).toContain("training:web:exercise:with-receipt");
  expect(receipt.cases.length).toBeGreaterThan(0);
  for (const executionCase of receipt.cases) {
    expect(executionCase.retries.length).toBeGreaterThan(0);
    expect(executionCase.evidence.length).toBeGreaterThan(0);
  }
  expect(fs.readdirSync(path.join(root, "receipts"))).toContain(path.basename(result.receiptPath));
  return receipt;
}

function pageHtml(): string {
  return `<!doctype html>
<html lang="ja">
  <body>
    <h1>すべての商品</h1>
    <p role="status"></p>
    <label>数量<select aria-label="数量">
      <option value="1">1</option><option value="2">2</option><option value="3">3</option>
      <option value="4">4</option><option value="5">5</option>
    </select></label>
    <button type="button" data-add>カートに追加</button>
    <script>
      window.__TEST_API__ = {
        reset: async ({ scenario }) => {
          localStorage.clear();
          localStorage.setItem("scenario", scenario);
        },
        getMetadata: () => ({ scenario: localStorage.getItem("scenario") || "default" }),
      };
      const quantity = () => document.querySelector('[aria-label="数量"]');
      const status = () => document.querySelector('[role="status"]');
      document.addEventListener("DOMContentLoaded", () => {
        const select = quantity();
        const current = Number(localStorage.getItem("cartQuantity") || "0");
        if (select) select.value = current > 0 ? String(current) : "1";
        document.querySelector('[data-add]')?.addEventListener("click", () => {
          const amount = Number(select?.value || "1");
          localStorage.setItem("cartQuantity", String(currentQuantity() + amount));
          if (status()) status().textContent = "カートへ追加しました";
        });
      });
      function currentQuantity() {
        return Number(localStorage.getItem("cartQuantity") || "0");
      }
    </script>
  </body>
</html>
`;
}

type FixtureServerProcess = ChildProcessByStdio<null, Readable, Readable>;

async function startFixtureServer(): Promise<{
  serverProcess: FixtureServerProcess;
  baseUrl: string;
}> {
  const script = `
const { createServer } = require("node:http");
const html = ${JSON.stringify(pageHtml())};
const server = createServer((_request, response) => {
  response.writeHead(200, { "content-type": "text/html; charset=utf-8", connection: "close" });
  response.end(html);
});
server.listen(0, "127.0.0.1", () => {
  process.stdout.write(JSON.stringify({ port: server.address().port }) + "\\n");
});
`;
  const serverProcess = spawn(process.execPath, ["-e", script], {
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stdout = "";
  let stderr = "";
  serverProcess.stdout.setEncoding("utf8");
  serverProcess.stderr.setEncoding("utf8");
  return await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      serverProcess.kill();
      reject(new Error(`Fixture server did not start: ${stderr || stdout}`));
    }, 10_000);
    const finish = (callback: () => void) => {
      clearTimeout(timer);
      serverProcess.stdout.removeAllListeners("data");
      serverProcess.removeAllListeners("error");
      serverProcess.removeAllListeners("exit");
      callback();
    };
    serverProcess.stdout.on("data", (chunk: string) => {
      stdout += chunk;
      const line = stdout.split(/\r?\n/)[0] ?? "";
      try {
        const value = JSON.parse(line) as { port?: number };
        if (!value.port) throw new Error("missing port");
        finish(() => resolve({ serverProcess, baseUrl: `http://127.0.0.1:${value.port}` }));
      } catch {
        // Wait until the child emits a complete startup line.
      }
    });
    serverProcess.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });
    serverProcess.once("error", (error) => finish(() => reject(error)));
    serverProcess.once("exit", (code, signal) =>
      finish(() =>
        reject(new Error(`Fixture server exited before startup: ${code ?? signal}: ${stderr}`)),
      ),
    );
  });
}

async function closeFixtureServer(serverProcess: FixtureServerProcess): Promise<void> {
  if (serverProcess.exitCode !== null || serverProcess.signalCode !== null) return;
  await new Promise<void>((resolve) => {
    serverProcess.once("exit", () => resolve());
    serverProcess.kill();
  });
}

describe.skipIf(!RUN_RUNTIME_CONTRACT)("実Playwright Training経路", () => {
  it(
    "creates Receipt from the real Reporter and completes after C09 repair and C10 improvement",
    { timeout: 180_000 },
    async () => {
      fs.mkdirSync(path.join(process.cwd(), "output"), { recursive: true });
      const fixtureParent = fs.mkdtempSync(path.join(process.cwd(), "output", "training-runtime-"));
      const handoffRoot = path.join(fixtureParent, "handoff");
      const diagnosticRoot = path.join(fixtureParent, "diagnostic-copy");
      const previousBaseUrl = process.env.PLAYWRIGHT_BASE_URL;
      const previousUsePrebuilt = process.env.PLAYWRIGHT_USE_PREBUILT_DIST;
      const previousSkipWebServer = process.env.PLAYWRIGHT_SKIP_WEB_SERVER;
      const previousCi = process.env.CI;
      const externalBaseUrl = process.env.TRAINING_RUNTIME_BASE_URL?.trim();
      let serverProcess: FixtureServerProcess | undefined;
      try {
        createHandoff(handoffRoot);
        const runtimeRoot = path.join(fixtureParent, "runtime-code");
        fs.mkdirSync(path.join(runtimeRoot, "support"), { recursive: true });
        fs.copyFileSync(
          path.resolve("training/playwright/support/reset-scenario.ts"),
          path.join(runtimeRoot, "support/reset-scenario.ts"),
        );
        fs.copyFileSync(
          path.join(handoffRoot, "code/training/playwright/support/learner-helper.ts"),
          path.join(runtimeRoot, "support/learner-helper.ts"),
        );
        for (const entry of CASES) {
          const runtimeSpecPath = path.join(
            runtimeRoot,
            "exercises",
            path.basename(entry.implementationPath),
          );
          fs.mkdirSync(path.dirname(runtimeSpecPath), { recursive: true });
          fs.copyFileSync(
            path.join(handoffRoot, "code", entry.implementationPath),
            runtimeSpecPath,
          );
        }
        expect(
          fs.existsSync(
            path.join(handoffRoot, "code/training/playwright/support/reset-scenario.ts"),
          ),
        ).toBe(false);
        fs.mkdirSync(path.join(diagnosticRoot, "support"), { recursive: true });
        fs.copyFileSync(
          path.resolve("training/playwright/support/reset-scenario.ts"),
          path.join(diagnosticRoot, "support/reset-scenario.ts"),
        );
        restoreDiagnosticExercise(
          path.join(diagnosticRoot, "diagnostic-exercises/diagnostic-cart.spec.ts"),
          false,
        );

        if (externalBaseUrl) {
          process.env.PLAYWRIGHT_BASE_URL = externalBaseUrl;
          delete process.env.PLAYWRIGHT_SKIP_WEB_SERVER;
        } else {
          const started = await startFixtureServer();
          serverProcess = started.serverProcess;
          process.env.PLAYWRIGHT_BASE_URL = started.baseUrl;
          process.env.PLAYWRIGHT_SKIP_WEB_SERVER = "true";
        }
        process.env.PLAYWRIGHT_USE_PREBUILT_DIST = "true";
        delete process.env.CI;

        const commonOptions = {
          project: "training-chromium",
          rootOption: handoffRoot,
          testRootOption: runtimeRoot,
        } as const;
        const localReceipt = runReceipt(
          handoffRoot,
          { suite: "exercise", runContext: "local-exercise", ...commonOptions },
          0,
        );
        expect(localReceipt.cases).toHaveLength(2);
        const localResults = localReceipt.cases.map((executionCase) => ({
          caseId: executionCase.case_id!,
          context: "local-exercise",
          result: "Pass" as const,
          evidence: executionCase.evidence[0]!,
        }));
        const beforeReceipt = runReceipt(
          handoffRoot,
          { suite: "exercise", runContext: "c10-before", ...commonOptions },
          0,
        );
        const beforeResults = beforeReceipt.cases.map((executionCase) => ({
          caseId: executionCase.case_id!,
          context: "c10-before",
          result: "Pass" as const,
          evidence: executionCase.evidence[0]!,
        }));

        const diagnosticInitial = runReceipt(
          handoffRoot,
          {
            suite: "diagnostic",
            runContext: "diagnostic-initial",
            ...commonOptions,
            testRootOption: diagnosticRoot,
          },
          1,
        );
        const initialCase = caseIn(diagnosticInitial, "TC-CART-001");
        expect(initialCase.status).toBe("failed");
        expect(initialCase.implementation_path).toBe(
          "training/playwright/diagnostic-exercises/diagnostic-cart.spec.ts",
        );

        const diagnosticPath = path.join(
          diagnosticRoot,
          "diagnostic-exercises/diagnostic-cart.spec.ts",
        );
        const repairedSource = fs
          .readFileSync(diagnosticPath, "utf8")
          .replace('toHaveValue("1")', 'toHaveValue("5")');
        fs.writeFileSync(diagnosticPath, repairedSource, "utf8");
        const diagnosticRepaired = runReceipt(
          handoffRoot,
          {
            suite: "diagnostic",
            runContext: "diagnostic-repaired",
            ...commonOptions,
            testRootOption: diagnosticRoot,
          },
          0,
        );
        const repairedCase = caseIn(diagnosticRepaired, "TC-CART-001");
        expect(repairedCase.status).toBe("passed");
        expect(repairedCase.implementation_path).toBe(initialCase.implementation_path);
        expect(repairedCase.code_digest).not.toBe(initialCase.code_digest);
        expect(repairedCase.evidence).not.toEqual(expect.arrayContaining(initialCase.evidence));

        const learnerPath = path.join(handoffRoot, "code", CASES[0].implementationPath);
        const beforeImprovement = fs.readFileSync(learnerPath, "utf8");
        const improvedSource = learnerSpec(CASES[0].caseId, true);
        fs.writeFileSync(learnerPath, improvedSource, "utf8");
        fs.writeFileSync(
          path.join(runtimeRoot, "exercises", path.basename(CASES[0].implementationPath)),
          improvedSource,
          "utf8",
        );
        expect(fs.readFileSync(learnerPath, "utf8")).not.toBe(beforeImprovement);
        const improvedReceipt = runReceipt(
          handoffRoot,
          { suite: "exercise", runContext: "c10-improved", ...commonOptions },
          0,
        );
        const improvedCase = caseIn(improvedReceipt, CASES[0].caseId);
        expect(improvedCase.status).toBe("passed");
        expect(improvedCase.code_digest).not.toBe(
          caseIn(beforeReceipt, CASES[0].caseId).code_digest,
        );

        const mobileReceipt = runReceipt(
          handoffRoot,
          {
            suite: "exercise",
            runContext: "mobile-exercise",
            ...commonOptions,
            project: "training-mobile-chromium",
          },
          0,
        );
        expect(mobileReceipt.cases).toHaveLength(2);

        updateExecutionTable(handoffRoot, [
          ...localResults,
          ...beforeResults,
          {
            caseId: "TC-CART-001",
            context: "diagnostic-initial",
            result: "Fail",
            evidence: initialCase.evidence[0]!,
            failureCategory: "Assertion",
            cause: "期待値が実際のカート数量と一致していない",
            action: "FailureのExpected／Actualを確認した",
          },
          {
            caseId: "TC-CART-001",
            context: "diagnostic-repaired",
            result: "Pass",
            evidence: repairedCase.evidence[0]!,
          },
          {
            caseId: "TC-CART-101",
            context: "c10-improved",
            result: "Pass",
            evidence: improvedCase.evidence[0]!,
            failureCategory: "Maintainability",
            cause: "Locator式が長く、同じ対象の修正箇所が増える",
            action: "対象Locatorを変数へ切り出した",
            improvement: `Assertionの対象を一箇所で変更できるようにした; Improvement Target: ${CASES[0].implementationPath}; Before Digest: ${digest(beforeImprovement)}; After Digest: ${digest(improvedSource)}`,
          },
        ]);

        const completion = checkCompletion(handoffRoot, "common");
        expect(completion.status).toBe("PASS");
        expect(completion.receipt.checked_case_ids).toEqual(["TC-CART-101", "TC-CART-102"]);
        expect(completion.receipt.checked_outputs.c09_diagnostic).toBe(true);
        expect(completion.receipt.checked_outputs.c10_improvement).toBe(true);

        const trainingCopyParent = path.join(fixtureParent, "training-copy");
        const trainingCopy = path.join(trainingCopyParent, "copy");
        const sourceSha = execFileSync("git", ["rev-parse", "HEAD"], {
          encoding: "utf8",
        }).trim();
        const sourceHarness = fs.readFileSync(
          path.resolve("training/playwright/support/reset-scenario.ts"),
          "utf8",
        );
        const materialized = materializeTrainingHandoff({
          root: handoffRoot,
          target: trainingCopy,
          sourceSha,
        });
        expect(materialized.files).toEqual(
          expect.arrayContaining([
            CASES[0].implementationPath,
            CASES[1].implementationPath,
            "training/playwright/support/learner-helper.ts",
          ]),
        );
        expect(
          fs.readFileSync(
            path.join(trainingCopy, "training/playwright/support/reset-scenario.ts"),
            "utf8",
          ),
        ).toBe(sourceHarness);
        expect(
          fs.readFileSync(
            path.join(trainingCopy, "training/playwright/support/learner-helper.ts"),
            "utf8",
          ),
        ).toContain("productsHeadingFor");
        expect(
          fs.readFileSync(
            path.join(trainingCopy, "training/workbook/03_automation-mapping.csv"),
            "utf8",
          ),
        ).toContain(CASES[0].implementationPath);
      } finally {
        if (serverProcess) await closeFixtureServer(serverProcess);
        if (previousBaseUrl === undefined) delete process.env.PLAYWRIGHT_BASE_URL;
        else process.env.PLAYWRIGHT_BASE_URL = previousBaseUrl;
        if (previousUsePrebuilt === undefined) delete process.env.PLAYWRIGHT_USE_PREBUILT_DIST;
        else process.env.PLAYWRIGHT_USE_PREBUILT_DIST = previousUsePrebuilt;
        if (previousSkipWebServer === undefined) delete process.env.PLAYWRIGHT_SKIP_WEB_SERVER;
        else process.env.PLAYWRIGHT_SKIP_WEB_SERVER = previousSkipWebServer;
        if (previousCi === undefined) delete process.env.CI;
        else process.env.CI = previousCi;
        fs.rmSync(fixtureParent, { recursive: true, force: true });
      }
    },
  );

  it(
    "executes the distributed deterministic C10 maintenance exercise before and after its learner change",
    { timeout: 180_000 },
    async () => {
      fs.mkdirSync(path.join(process.cwd(), "output"), { recursive: true });
      const fixtureParent = fs.mkdtempSync(path.join(process.cwd(), "output", "training-c10-"));
      const handoffRoot = path.join(fixtureParent, "handoff");
      const exerciseRoot = path.join(fixtureParent, "exercise-copy");
      const exercisePath = path.join(exerciseRoot, "exercises", "c10-cart-101.spec.ts");
      const previousBaseUrl = process.env.PLAYWRIGHT_BASE_URL;
      const previousUsePrebuilt = process.env.PLAYWRIGHT_USE_PREBUILT_DIST;
      const previousSkipWebServer = process.env.PLAYWRIGHT_SKIP_WEB_SERVER;
      const previousCi = process.env.CI;
      const externalBaseUrl = process.env.TRAINING_RUNTIME_BASE_URL?.trim();
      let serverProcess: FixtureServerProcess | undefined;
      try {
        createC10Handoff(handoffRoot);
        fs.mkdirSync(path.join(exerciseRoot, "support"), { recursive: true });
        fs.mkdirSync(path.dirname(exercisePath), { recursive: true });
        fs.copyFileSync(
          path.resolve("training/playwright/maintenance-exercises/c10-locator-maintenance.spec.ts"),
          exercisePath,
        );
        fs.copyFileSync(
          path.resolve("training/playwright/support/reset-scenario.ts"),
          path.join(exerciseRoot, "support/reset-scenario.ts"),
        );

        if (externalBaseUrl) {
          process.env.PLAYWRIGHT_BASE_URL = externalBaseUrl;
          delete process.env.PLAYWRIGHT_SKIP_WEB_SERVER;
        } else {
          const started = await startFixtureServer();
          serverProcess = started.serverProcess;
          process.env.PLAYWRIGHT_BASE_URL = started.baseUrl;
          process.env.PLAYWRIGHT_SKIP_WEB_SERVER = "true";
        }
        process.env.PLAYWRIGHT_USE_PREBUILT_DIST = "true";
        delete process.env.CI;

        const options = {
          project: "training-chromium",
          rootOption: handoffRoot,
          testRootOption: exerciseRoot,
        } as const;
        const before = runReceipt(
          handoffRoot,
          { suite: "exercise", runContext: "c10-before", ...options },
          0,
        );
        const beforeCase = caseIn(before, "TC-CART-101");
        expect(beforeCase.status).toBe("passed");
        expect(beforeCase.implementation_path).toBe(
          "training/playwright/exercises/c10-cart-101.spec.ts",
        );

        const beforeSource = fs.readFileSync(exercisePath, "utf8");
        const afterSource = beforeSource.replace(
          '  await expect(page.getByRole("heading", { name: "すべての商品" })).toBeVisible();\n  await expect(page.getByRole("heading", { name: "すべての商品" })).toContainText("商品");',
          '  const productsHeading = page.getByRole("heading", { name: "すべての商品" });\n  await expect(productsHeading).toBeVisible();\n  await expect(productsHeading).toContainText("商品");',
        );
        expect(afterSource).not.toBe(beforeSource);
        fs.writeFileSync(exercisePath, afterSource, "utf8");

        const after = runReceipt(
          handoffRoot,
          { suite: "exercise", runContext: "c10-improved", ...options },
          0,
        );
        const afterCase = caseIn(after, "TC-CART-101");
        expect(afterCase.status).toBe("passed");
        expect(afterCase.implementation_path).toBe(beforeCase.implementation_path);
        expect(afterCase.code_digest).not.toBe(beforeCase.code_digest);
        expect(afterCase.evidence).not.toEqual(expect.arrayContaining(beforeCase.evidence));

        fs.copyFileSync(
          exercisePath,
          path.join(handoffRoot, "code/training/playwright/exercises/c10-cart-101.spec.ts"),
        );
        writeText(
          handoffRoot,
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
            ["TC-CART-101", "c10-before", "Pass", beforeCase.evidence[0]!, "", "", "", ""],
            [
              "TC-CART-101",
              "c10-improved",
              "Pass",
              afterCase.evidence[0]!,
              "Maintainability",
              "同じLocator式が複数Assertionに重複していた",
              "Locatorを変数へ抽出した",
              `Improvement Target: training/playwright/exercises/c10-cart-101.spec.ts; Before Digest: ${digest(beforeSource)}; After Digest: ${digest(afterSource)}`,
            ],
          ]),
        );
        const completion = checkCompletion(handoffRoot, "common");
        expect(completion.receipt.checked_outputs.c10_improvement).toBe(true);
        expect(completion.receipt.machine_checked_competencies).toContain("C10");
      } finally {
        if (serverProcess) await closeFixtureServer(serverProcess);
        if (previousBaseUrl === undefined) delete process.env.PLAYWRIGHT_BASE_URL;
        else process.env.PLAYWRIGHT_BASE_URL = previousBaseUrl;
        if (previousUsePrebuilt === undefined) delete process.env.PLAYWRIGHT_USE_PREBUILT_DIST;
        else process.env.PLAYWRIGHT_USE_PREBUILT_DIST = previousUsePrebuilt;
        if (previousSkipWebServer === undefined) delete process.env.PLAYWRIGHT_SKIP_WEB_SERVER;
        else process.env.PLAYWRIGHT_SKIP_WEB_SERVER = previousSkipWebServer;
        if (previousCi === undefined) delete process.env.CI;
        else process.env.CI = previousCi;
        fs.rmSync(fixtureParent, { recursive: true, force: true });
      }
    },
  );
});
