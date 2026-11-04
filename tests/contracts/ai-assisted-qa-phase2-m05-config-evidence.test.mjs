import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const config = read("playwright.ai-assisted-qa.config.ts");
const settings = read("scripts/training/ai-assisted-qa-playwright-settings.ts");
const runEvidence = read("scripts/training/ai-assisted-qa-run-evidence.mjs");
const lesson = read("docs/curriculum/ai-assisted-qa/modules/M05/README.md");
const exercise = read("training/ai-assisted-qa-course/exercises/M05/exercise.md");
const submission = read("training/ai-assisted-qa-course/exercises/M05/submission-template.md");
const devcontainer = JSON.parse(read(".devcontainer/devcontainer.json"));
const packageJson = JSON.parse(read("package.json"));

describe("M05-05：専用Config、ポート、証拠の入口を照合する", () => {
  it("学習専用テストはloopback 8082で、8081/6080の転送先とは区別する", () => {
    expect(settings).toContain('"http://127.0.0.1:8082"');
    expect(settings).toContain('parsedUrl.port !== "8082"');
    expect(settings).toContain('parsedUrl.protocol !== "http:"');
    expect(settings).toContain("LOOPBACK_HOSTS.has");
    expect(settings).toContain('parsedUrl.username !== ""');
    expect(settings).toContain('parsedUrl.password !== ""');
    expect(devcontainer.forwardPorts).toContain(8081);
    expect(devcontainer.forwardPorts).toContain(6080);
    expect(devcontainer.forwardPorts).not.toContain(8082);
    expect(lesson).toContain("8082番ポート");
    expect(exercise).toContain("8081");
    expect(exercise).toContain("6080");
  });

  it("指定testDirと専用reporter/trace/出力先は同じConfigから解決する", () => {
    expect(config).toContain("testDir: settings.testDir");
    expect(config).toContain('testMatch: /.*\\.spec\\.ts$/');
    expect(config).toContain(
      'const outputRoot = process.env.AI_QA_OUTPUT_ROOT ?? "output/training/ai-assisted-qa"',
    );
    expect(config).toContain(
      '["json", { outputFile: path.join(outputRoot, "playwright-result.json") }]',
    );
    expect(config).toContain(
      '["html", { open: "never", outputFolder: path.join(outputRoot, "report") }]',
    );
    expect(config).toContain('trace: "retain-on-failure"');
    expect(config).toContain('screenshot: "only-on-failure"');
    expect(config).toContain('name: "ai-assisted-qa-chromium"');
    expect(config).toContain('process.env.PLAYWRIGHT_TEST_ROOT');
    expect(config).toContain('"verify-distribution"');
    expect(packageJson.scripts["training:ai-assisted-qa:test"]).toContain(
      "--config=playwright.ai-assisted-qa.config.ts",
    );
  });

  it("P05の直接実行と正式course:run receiptは異なる対象specと証拠を持つ", () => {
    expect(packageJson.scripts["course:run"]).toContain("ai-assisted-qa-course.mjs run");
    expect(runEvidence).toContain('M05: new Set(["product-link.spec.ts"])');
    expect(runEvidence).toContain('"spec-snapshot.ts"');
    expect(runEvidence).toContain('"run-evidence.json"');
    expect(runEvidence).toContain("spec_sha256:");
    expect(runEvidence).toContain("source_sha:");
    expect(runEvidence).toContain("spec_unchanged_during_run:");
    expect(runEvidence).toContain("PLAYWRIGHT_TEST_ROOT: moduleRoot");
    expect(runEvidence).toContain("AI_QA_OUTPUT_ROOT: runDirectory");
    expect(exercise).toContain("P05の新規spec名を`course:run`へ渡すと拒否されます");
    expect(exercise).toContain("PLAYWRIGHT_TEST_ROOT=workspace/M05");
    expect(exercise).toContain('AI_QA_OUTPUT_ROOT="$p05_output"');
    expect(exercise).toContain("直接実行");
    expect(exercise).toContain("run-evidence.json");
    expect(submission).toContain("直接実行（正式な`course:run` receiptではない）");
  });
});
