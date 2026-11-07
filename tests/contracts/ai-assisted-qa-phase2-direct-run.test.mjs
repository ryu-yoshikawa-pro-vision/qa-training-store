import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runAiAssistedQaSpecCli } from "../../scripts/training/ai-assisted-qa-run-evidence.mjs";

const roots = [];
const initialExitCode = process.exitCode;
const sourceSha = "a".repeat(40);
const args = ["M05", "p05-cart-locator.spec.ts", "--label", "main"];

afterEach(() => {
  for (const root of roots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
  process.exitCode = initialExitCode;
});

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "course-m05-p05-"));
  roots.push(root);
  const moduleRoot = path.join(root, "workspace", "M05");
  fs.mkdirSync(moduleRoot, { recursive: true });
  const specPath = path.join(moduleRoot, "p05-cart-locator.spec.ts");
  fs.writeFileSync(
    specPath,
    'import { test } from "@playwright/test";\ntest("M05 P05", async () => {});\n',
  );
  return { root, moduleRoot, specPath };
}

function simulatedRun(data, mode = "pass") {
  const invoked = [];
  const spawn = (launcher, commandArgs, options) => {
    invoked.push({ launcher, commandArgs, options });
    if (mode !== "no-report") {
      const report = {
        config: {
          rootDir: mode === "wrong-root" ? data.root : data.moduleRoot,
        },
        suites: [
          {
            specs: [
              {
                file: mode === "wrong-spec" ? "product-link.spec.ts" : "p05-cart-locator.spec.ts",
                title: "M05 P05",
                tests:
                  mode === "empty"
                    ? []
                    : [
                        {
                          projectName: "ai-assisted-qa-chromium",
                          expectedStatus: mode === "expected-failure" ? "failed" : "passed",
                          status: mode === "skipped" ? "skipped" : "expected",
                          results: [
                            {
                              status: mode === "skipped" ? "skipped" : "passed",
                              attachments: [],
                            },
                          ],
                        },
                      ],
              },
            ],
          },
        ],
      };
      fs.writeFileSync(
        path.join(options.env.AI_QA_OUTPUT_ROOT, "playwright-result.json"),
        JSON.stringify(report),
      );
    }
    if (mode === "mutate") {
      fs.appendFileSync(data.specPath, "// changed during the run\n");
    }
    return { status: mode === "nonzero" ? 9 : 0, stdout: "", stderr: "" };
  };
  const result = runAiAssistedQaSpecCli(args, { root: data.root, sourceSha, spawn });
  return { result, invoked };
}

describe("M05 P05の正式course:run証拠（隔離Playwright stub検証）", () => {
  it("教材の正規入口と固定spec、専用Configを使用する", () => {
    const exercise = fs.readFileSync(
      path.resolve("training/ai-assisted-qa-course/exercises/M05/exercise.md"),
      "utf8",
    );
    expect(exercise).toContain("pnpm course:run M05 p05-cart-locator.spec.ts --label main");
    const { result, invoked } = simulatedRun(fixture());
    expect(invoked).toHaveLength(1);
    expect(invoked[0].commandArgs).toContain("p05-cart-locator.spec.ts");
    expect(invoked[0].commandArgs).toContain("--config=playwright.ai-assisted-qa.config.ts");
    expect(invoked[0].commandArgs).toContain("--project=ai-assisted-qa-chromium");
    expect(result.receipt.project).toBe("ai-assisted-qa-chromium");
  });

  it("正常終了時にRun ID・receipt・snapshot・reportを同じRun directoryへ保存する", () => {
    const data = fixture();
    const { result, invoked } = simulatedRun(data);
    expect(result.receipt.outcome).toBe("passed");
    expect(result.receipt.exit_code).toBe(0);
    expect(result.receipt.source_sha).toBe(sourceSha);
    expect(result.receipt.spec_unchanged_during_run).toBe(true);
    expect(result.receipt.tests).toHaveLength(1);
    const dir = path.dirname(result.receiptPath);
    expect(path.basename(dir)).toBe(result.receipt.run_id);
    expect(dir).toContain(path.join("workspace", "M05", "evidence", "runs"));
    expect(fs.readFileSync(path.join(dir, "spec-snapshot.ts"))).toEqual(
      fs.readFileSync(data.specPath),
    );
    expect(fs.readFileSync(path.join(dir, "playwright-result.json"), "utf8")).toContain("suites");
    expect(JSON.parse(fs.readFileSync(result.receiptPath, "utf8"))).toEqual(result.receipt);
    expect(result.receipt.report_sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(result.receipt.spec_sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(invoked[0].options.env.PLAYWRIGHT_TEST_ROOT).toBe(data.moduleRoot);
    expect(invoked[0].options.env.AI_QA_OUTPUT_ROOT).toBe(dir);
  });

  it("実行中のspec改変はPlaywrightがPASSでも正式Runを不採用にする", () => {
    const { result } = simulatedRun(fixture(), "mutate");
    expect(result.receipt.exit_code).toBe(0);
    expect(result.receipt.spec_unchanged_during_run).toBe(false);
    expect(result.receipt.outcome).toBe("ungradable");
    expect(process.exitCode).toBe(1);
  });

  it("report欠落・テスト0件・Playwright非0終了を成功にしない", () => {
    for (const mode of ["no-report", "empty", "nonzero"]) {
      const { result } = simulatedRun(fixture(), mode);
      expect(result.receipt.outcome, mode).not.toBe("passed");
      expect(process.exitCode, mode).toBe(1);
    }
  });

  it("別spec・別root・skip・期待失敗が混入したreportを拒否する", () => {
    for (const mode of ["wrong-spec", "wrong-root", "skipped", "expected-failure"]) {
      expect(() => simulatedRun(fixture(), mode), mode).toThrow();
    }
  });

  it("specがsymlinkの場合はPlaywrightを起動しない", () => {
    const data = fixture();
    const target = path.join(data.root, "original-spec.ts");
    fs.renameSync(data.specPath, target);
    fs.symlinkSync(target, data.specPath);
    let invoked = false;
    expect(() =>
      runAiAssistedQaSpecCli(args, {
        root: data.root,
        sourceSha,
        spawn: () => {
          invoked = true;
          return { status: 0 };
        },
      }),
    ).toThrow(/regular file/);
    expect(invoked).toBe(false);
  });
});
