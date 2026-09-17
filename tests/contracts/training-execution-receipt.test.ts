import {
  buildExecutionReceipt,
  parseJsonReport,
  runPlaywrightWithReceipt,
} from "../../scripts/training/run-playwright-with-receipt";

describe("Execution Receipt contract", () => {
  it("keeps run exit_code separate from case and Retry status", () => {
    const receipt = buildExecutionReceipt({
      command: "pnpm run training:web:exercise:with-receipt",
      exitCode: 1,
      startedAt: "2026-09-17T00:00:00.000Z",
      finishedAt: "2026-09-17T00:00:01.000Z",
      environment: {
        platform: "win32",
        runtime: "Playwright Training",
        browser: "training-chromium",
        execution: "local",
      },
      runContext: "diagnostic-initial",
      project: "training-chromium",
      cases: [
        {
          case_id: "TC-CART-101",
          title: "TC-CART-101 diagnostic case",
          track: "web",
          status: "failed",
          result: "failed",
          code_digest: "e".repeat(64),
          implementation_path: "training/playwright/exercises/cart-101.spec.ts",
          evidence: ["evidence/diagnostic-initial.md"],
          retries: [
            {
              retry_index: 0,
              status: "failed",
              duration_ms: 42,
              error: "expected mismatch",
              evidence: ["evidence/diagnostic-initial.md"],
            },
          ],
        },
      ],
      trainingCopySourceSha: "a".repeat(40),
      submissionSha: "b".repeat(40),
      executionSha: "c".repeat(40),
      ciSha: "d".repeat(40),
    });

    const executionCase = receipt.cases[0];
    expect(receipt.run.exit_code).toBe(1);
    expect(executionCase).toBeDefined();
    expect(executionCase?.status).toBe("failed");
    expect(executionCase?.retries[0]?.status).toBe("failed");
    expect("exit_code" in (executionCase ?? {})).toBe(false);
    expect("exit_code" in (executionCase?.retries[0] ?? {})).toBe(false);
    expect(receipt.run.training_copy_source_sha).not.toBe(receipt.run.execution_sha);
    expect(receipt.run.submission_sha).not.toBe(receipt.run.ci_sha);
  });

  it("rejects a project outside the existing Training Playwright projects", () => {
    expect(() =>
      runPlaywrightWithReceipt({
        suite: "exercise",
        project: "chromium",
        rootOption: ".",
        runContext: "invalid",
      }),
    ).toThrow(/Unsupported Training Playwright project/);
  });

  it("resolves a Case ID from an existing Playwright annotation", () => {
    const specs = parseJsonReport(
      JSON.stringify({
        suites: [
          {
            file: "training/playwright/exercises/cart-101.spec.ts",
            specs: [
              {
                title: "learner cart case",
                tests: [
                  {
                    annotations: [{ type: "case_id", description: "TC-CART-101" }],
                    results: [{ status: "passed", duration: 12, attachments: [] }],
                  },
                ],
              },
            ],
          },
        ],
      }),
    );

    expect(specs[0]?.caseId).toBe("TC-CART-101");
  });
});
