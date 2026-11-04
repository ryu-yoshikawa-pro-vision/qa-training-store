import { afterEach, describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const exercise = fs.readFileSync(
  path.join(process.cwd(), "training/ai-assisted-qa-course/exercises/M05/exercise.md"),
  "utf8",
);
const runSection = exercise
  .split("### P05の新規specを専用Configで実行する")[1]
  ?.split("### 固定Skillと本人の判断")[0];
const fence = String.fromCharCode(96).repeat(3);
const bashFence = new RegExp(fence + "bash\\n([\\s\\S]*?)\\n" + fence, "g");
const directRun = Array.from((runSection ?? "").matchAll(bashFence), (match) => match[1])[0];

const tempDirectories = [];
afterEach(() => {
  for (const directory of tempDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "course-m05-p05-direct-"));
  tempDirectories.push(root);
  const specPath = path.join(root, "workspace/M05/p05-cart-locator.spec.ts");
  fs.mkdirSync(path.dirname(specPath), { recursive: true });
  fs.writeFileSync(specPath, "/* learner-authored placeholder for command testing only */\n");
  const binDir = path.join(root, "bin");
  fs.mkdirSync(binDir);
  const report = (file, actual, expected = "passed", reportRoot = path.join(root, "workspace/M05")) =>
    JSON.stringify({
      config: { rootDir: reportRoot },
      suites: [
        {
          specs: [
            {
              file,
              title: "M05 P05: 2明細の数量と削除操作対象を識別する",
              tests: [{ expectedStatus: expected, results: [{ status: actual }] }],
            },
          ],
        },
      ],
    });
  const reports = {
    pass: report("p05-cart-locator.spec.ts", "passed"),
    empty: JSON.stringify({ suites: [] }),
    wrongSpec: report("product-link.spec.ts", "passed"),
    skipped: report("p05-cart-locator.spec.ts", "skipped"),
    wrongExpectation: report("p05-cart-locator.spec.ts", "failed", "failed"),
    wrongRoot: report("p05-cart-locator.spec.ts", "passed", "passed", root),
  };
  const stub = [
    "#!/bin/sh",
    'printf "%s\\n" "$*" > "$AI_QA_OUTPUT_ROOT/args.txt"',
    'printf "%s\\n" "$PLAYWRIGHT_TEST_ROOT" > "$AI_QA_OUTPUT_ROOT/test-root.txt"',
    'case "$P05_TEST_MODE" in',
    "  no-report) ;;",
    `  empty) printf '%s\\n' '${reports.empty}' > "$AI_QA_OUTPUT_ROOT/playwright-result.json" ;;`,
    `  wrong-spec) printf '%s\\n' '${reports.wrongSpec}' > "$AI_QA_OUTPUT_ROOT/playwright-result.json" ;;`,
    `  wrong-root) printf '%s\\n' '${reports.wrongRoot}' > "$AI_QA_OUTPUT_ROOT/playwright-result.json" ;;`,
    `  skipped) printf '%s\\n' '${reports.skipped}' > "$AI_QA_OUTPUT_ROOT/playwright-result.json" ;;`,
    `  wrong-expectation) printf '%s\\n' '${reports.wrongExpectation}' > "$AI_QA_OUTPUT_ROOT/playwright-result.json" ;;`,
    `  *) printf '%s\\n' '${reports.pass}' > "$AI_QA_OUTPUT_ROOT/playwright-result.json" ;;`,
    "esac",
    'if [ "$P05_TEST_MODE" = "mutate" ]; then',
    "  printf '\\n// changed during execution\\n' >> workspace/M05/p05-cart-locator.spec.ts",
    "fi",
    'echo "stubbed pnpm: no browser run"',
    'if [ "$P05_TEST_MODE" = "fail" ]; then exit 9; fi',
    "exit 0",
  ].join("\n");
  fs.writeFileSync(path.join(binDir, "pnpm"), stub + "\n", { mode: 0o755 });
  return { root, specPath, binDir };
}

function run(fixtureRoot, binDir, mode = "pass") {
  return spawnSync("bash", ["-c", directRun], {
    cwd: fixtureRoot,
    env: {
      ...process.env,
      PATH: binDir + path.delimiter + process.env.PATH,
      P05_TEST_MODE: mode,
    },
    encoding: "utf8",
    timeout: 10_000,
  });
}

describe("M05 P05の直接Playwright実行コマンド（隔離stub検証）", () => {
  const linuxIt = process.platform === "linux" ? it : it.skip;

  it("教材が専用Config・対象spec・実行前snapshotを明示する", () => {
    expect(directRun).toContain("p05-cart-locator.spec.ts");
    expect(directRun).toContain("spec-snapshot.ts");
    expect(directRun).toContain("PLAYWRIGHT_TEST_ROOT=workspace/M05");
    expect(directRun).toContain("AI_QA_OUTPUT_ROOT=");
    expect(directRun).toContain("--config=playwright.ai-assisted-qa.config.ts");
    expect(directRun).toContain("--project=ai-assisted-qa-chromium");
  });

  linuxIt("成功時のログ・JSON report・spec snapshotが独立した出力先に残る", () => {
    const data = fixture();
    const result = run(data.root, data.binDir);
    expect(result.status, result.stderr + result.stdout).toBe(0);
    const evidenceDir = path.join(data.root, "workspace/M05/evidence");
    const entries = fs.readdirSync(evidenceDir);
    expect(entries).toHaveLength(1);
    const outputRoot = path.join(evidenceDir, entries[0]);
    expect(entries[0]).toMatch(/^p05-direct-/);
    expect(fs.readFileSync(path.join(outputRoot, "spec-snapshot.ts"))).toEqual(
      fs.readFileSync(data.specPath),
    );
    expect(fs.readFileSync(path.join(outputRoot, "playwright-result.json"), "utf8")).toContain(
      "suites",
    );
    expect(fs.readFileSync(path.join(outputRoot, "console.log"), "utf8")).toContain(
      "no browser run",
    );
    expect(fs.readFileSync(path.join(outputRoot, "args.txt"), "utf8")).toContain(
      "exec playwright test p05-cart-locator.spec.ts",
    );
    expect(fs.readFileSync(path.join(outputRoot, "test-root.txt"), "utf8").trim()).toBe(
      "workspace/M05",
    );
    expect(result.stdout).toContain("exit_code=0");
    expect(result.stdout).toContain("spec_sha256=");
  });

  linuxIt("実行中にspecが変更された場合は失敗として扱う", () => {
    const data = fixture();
    const result = run(data.root, data.binDir, "mutate");
    expect(result.status).not.toBe(0);
    expect(result.stdout).toContain("実行中にspecが変更されました");
  });

  linuxIt("report不在とPlaywright非0終了を成功にしない", () => {
    const data = fixture();
    const missingReport = run(data.root, data.binDir, "no-report");
    expect(missingReport.status).not.toBe(0);
    expect(missingReport.stdout).toContain("Playwright JSON reportがありません");

    const failedPlaywright = run(data.root, data.binDir, "fail");
    expect(failedPlaywright.status).not.toBe(0);
    expect(failedPlaywright.stdout).toContain("exit_code=9");
  });

  linuxIt("JSON reportの対象testなし・別spec・rootDir違い・skip・期待失敗を拒否する", () => {
    const data = fixture();
    for (const mode of ["empty", "wrong-spec", "wrong-root", "skipped", "wrong-expectation"]) {
      const result = run(data.root, data.binDir, mode);
      expect(result.status, `mode=${mode} ${result.stderr}`).not.toBe(0);
    }
  });

  linuxIt("specのsymlinkを拒否する", () => {
    const data = fixture();
    const target = path.join(data.root, "original-spec.ts");
    fs.renameSync(data.specPath, target);
    fs.symlinkSync(target, data.specPath);
    const result = run(data.root, data.binDir);
    expect(result.status).not.toBe(0);
    expect(result.stdout).toContain("またはsymlinkです");
  });
});
