import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { validateCourseWorkflow } from "../../scripts/training/ai-assisted-qa-github-run-evidence.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const manifest = JSON.parse(
  fs.readFileSync(path.join(root, "training/course-sync/manifest.json"), "utf8"),
);

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function distributed(sourcePath, targetPath) {
  return manifest.local_files.some(
    (entry) => entry.source_path === sourcePath && entry.target_path === targetPath,
  );
}

function resetImportPath(targetPath, sourceText) {
  const match = sourceText.match(/from "(\.{1,2}\/[^"]+reset-scenario)"/);
  expect(match, targetPath + ": reset helper import is missing").not.toBeNull();
  return path.posix.normalize(path.posix.join(path.posix.dirname(targetPath), match[1]));
}

describe("M10-01 spec and dependency closure", () => {
  it("resolves the M07 learner root and the independently loaded M10 public fallback", () => {
    const m07Spec = "workspace/M07/repaired-assertion.spec.ts";
    const m10Spec = "workspace/M10/public-sample/handoff-smoke.spec.ts";
    const fallbackSource = "workspace/M07/public-sample/handoff-smoke.spec.ts";
    const helper = "training/playwright/support/reset-scenario";

    expect(distributed(m07Spec, "course/exercises/M07/repaired-assertion.spec.ts")).toBe(true);
    expect(distributed(fallbackSource, "course/modules/M10/inputs/public-sample-spec.ts")).toBe(
      true,
    );
    expect(
      manifest.load_files.some(
        (entry) =>
          entry.module_id === "M10" &&
          entry.source_path === "course/modules/M10/inputs/public-sample-spec.ts" &&
          entry.target_path === m10Spec &&
          entry.kind === "exercise-code",
      ),
    ).toBe(true);

    const m07Text = read(m07Spec);
    const sampleText = read(fallbackSource);
    expect(resetImportPath(m07Spec, m07Text)).toBe(helper);
    expect(resetImportPath(m10Spec, sampleText)).toBe(helper);
    expect(sampleText).toContain('resetScenario(page, "default")');
    expect(m07Text).toContain('resetScenario(page, "default")');
    expect(m07Text).toContain("TODO:");
    expect(sampleText).not.toContain("TODO:");
    expect(distributed(helper + ".ts", helper + ".ts")).toBe(true);

    for (const needed of [
      "package.json",
      "pnpm-lock.yaml",
      "playwright.ai-assisted-qa.config.ts",
      "scripts/serve-web-dist.ts",
      "scripts/training/ai-assisted-qa-course.mjs",
      "scripts/training/ai-assisted-qa-course-core.mjs",
    ]) {
      expect(distributed(needed, needed), needed + " was not distributed").toBe(true);
    }
  });

  it("stages only the repaired M07 spec, not ignored learner secrets or traces", () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "m10-stage-"));
    const spec = "workspace/M07/repaired-assertion.spec.ts";
    const helper = "training/playwright/support/reset-scenario.ts";
    const git = (...args) => execFileSync("git", args, { cwd, encoding: "utf8" }).trim();

    try {
      for (const dir of ["workspace/M07", "training/playwright/support", "output"]) {
        fs.mkdirSync(path.join(cwd, dir), { recursive: true });
      }
      const templates = "training/ai-assisted-qa-course/templates";
      for (const [source, target] of [
        ["learner-repo.gitignore", ".gitignore"],
        ["workspace.gitignore", "workspace/.gitignore"],
      ]) {
        fs.copyFileSync(path.join(root, templates, source), path.join(cwd, target));
      }
      fs.writeFileSync(path.join(cwd, helper), "export const safe = true;\n");
      fs.writeFileSync(path.join(cwd, spec), "export const repaired = true;\n");
      fs.writeFileSync(path.join(cwd, ".env"), "DUMMY=not-a-secret\n");
      fs.writeFileSync(path.join(cwd, "output/trace.zip"), "synthetic trace");
      git("init", "-q");
      git("add", "--", ".gitignore", "workspace/.gitignore", helper);
      git(
        "-c",
        "user.name=Fixture",
        "-c",
        "user.email=fixture@example.invalid",
        "commit",
        "-qm",
        "baseline with reviewed helper",
      );

      expect(git("check-ignore", "-v", "--", spec)).toContain("workspace/M07");
      expect(git("check-ignore", "-v", "--", ".env")).toContain(".env");
      expect(git("check-ignore", "-v", "--", "output/trace.zip")).toContain("output/");
      git("add", "-f", "--", spec);
      expect(git("diff", "--cached", "--name-only")).toBe(spec);
      expect(git("diff", "--cached", "--check")).toBe("");
      expect(git("status", "--short", "--untracked-files=all")).not.toContain(".env");
      expect(git("status", "--short", "--untracked-files=all")).not.toContain("trace.zip");
    } finally {
      fs.rmSync(cwd, { recursive: true, force: true });
    }
  });

  it("validates separate M07 and M10 test roots against the same pinned workflow contract", () => {
    const template = read(
      "training/ai-assisted-qa-course/templates/phase3/course-e2e.workflow.yml.disabled",
    );
    const workflowPath = ".github/workflows/course-e2e.yml";
    const learner = {
      test_file: "workspace/M07/repaired-assertion.spec.ts",
      test_root: "workspace/M07",
    };
    const fallback = {
      test_file: "workspace/M10/public-sample/handoff-smoke.spec.ts",
      test_root: "workspace/M10/public-sample",
    };
    const learnerRoot = "PLAYWRIGHT_TEST_ROOT: workspace/M07";
    const fallbackRoot = "PLAYWRIGHT_TEST_ROOT: workspace/M10/public-sample";
    const sample = template
      .replace(learner.test_file, fallback.test_file)
      .replace(learnerRoot, fallbackRoot);
    expect(validateCourseWorkflow(template, workflowPath, learner).check_name).toBe("course-e2e");
    expect(validateCourseWorkflow(sample, workflowPath, fallback).check_name).toBe("course-e2e");
    expect(() => validateCourseWorkflow(template, workflowPath, fallback)).toThrow();
    expect(() => validateCourseWorkflow(sample, workflowPath, learner)).toThrow();
  });

  it("keeps the disabled M10 fallback on verified pinned Shop bytes", () => {
    const sample = read(
      "training/ai-assisted-qa-course/inputs/M10/public-sample-workflow.yml.disabled",
    );
    expect(sample).toContain("permissions:\\n  contents: read");
    expect(sample).toContain("test -s course/shop/index.html");
    expect(sample).toContain("test -s .course/distribution-manifest.json");
    expect(sample).toContain("node scripts/training/ai-assisted-qa-course.mjs verify-distribution");
    expect(sample).toContain('PLAYWRIGHT_USE_PREBUILT_DIST: "true"');
    expect(sample).toContain("PLAYWRIGHT_TEST_ROOT: workspace/M10/public-sample");
    expect(sample).not.toContain("pnpm run build:web");
    expect(sample).not.toContain("pull_request_target:");
    expect(sample.indexOf("verify-distribution")).toBeLessThan(
      sample.indexOf("pnpm exec playwright install --with-deps chromium"),
    );
  });

  it("requires reviewed paths and explicit activation without leaking learner files", () => {
    const ignore = read("training/ai-assisted-qa-course/templates/workspace.gitignore");
    const learnerIgnore = read("training/ai-assisted-qa-course/templates/learner-repo.gitignore");
    const textbook = read("docs/curriculum/ai-assisted-qa/modules/M10/README.md");
    const exercise = read("training/ai-assisted-qa-course/exercises/M10/exercise.md");
    const workflow = read(
      "training/ai-assisted-qa-course/templates/phase3/course-e2e.workflow.yml.disabled",
    );

    expect(ignore).toContain("/M07/");
    expect(ignore).toContain("/M10/ci-run-evidence.json");
    for (const excluded of [".env", "output/", "test-results/"]) {
      expect(learnerIgnore).toContain(excluded);
    }
    expect(textbook).toContain("git add -f -- workspace/M07/repaired-assertion.spec.ts");
    expect(textbook).toContain("git diff --cached --name-only");
    expect(textbook).toContain("pnpm course:load M10");
    expect(textbook).toContain("配布元の完全SHA");
    expect(textbook).toContain("BLOCKED");
    expect(textbook).toContain("不要になった専用workflowの自動起動");
    expect(exercise).toContain("現在の起動条件は");
    expect(exercise).toContain("workflow_dispatch");
    expect(workflow).toContain("  pull_request:");
    expect(workflow).not.toContain("pull_request_target:");
    expect(workflow).not.toContain("pnpm run build:web");
  });

  it("documents first failures, follow-on artifacts and evidence-backed AI reporting", () => {
    const lesson = read("docs/curriculum/ai-assisted-qa/modules/M10/README.md");
    const exercise = read("training/ai-assisted-qa-course/exercises/M10/exercise.md");
    const submission = read("training/ai-assisted-qa-course/exercises/M10/submission-template.md");
    for (const kind of [
      "Install失敗",
      "配布検証失敗",
      "Shop Serve失敗",
      "Browser導入失敗",
      "Assertion期待不一致",
      "Artifact保存失敗",
      "旧SHAの成功Run",
    ]) {
      expect(exercise).toContain(kind);
      expect(submission).toContain(kind);
    }
    for (const condition of [
      "M10-02 有効化前・後片付けの確認",
      "M10-04 原因分類と再実行判断",
      "M10-05 AI提案の採否と最終報告",
      "Run ID/attempt",
      "PLAYWRIGHT",
    ]) {
      const text = lesson + exercise + submission;
      expect(text.toUpperCase()).toContain(condition.toUpperCase());
    }
    expect(lesson).toContain("if-no-files-found: error");
    expect(lesson).toContain("同じRunでInstallとArtifact uploadの両方がFAIL");
    expect(submission).toContain("残るリスク・未確認事項");
    expect(submission).toContain("成功への読み替え禁止");
  });

  it("separates staged OpenCode hints from final M10 assessment", () => {
    const m09 = read("docs/curriculum/ai-assisted-qa/modules/M09/README.md");
    const m10 = read("docs/curriculum/ai-assisted-qa/modules/M10/README.md");
    const exercise = read("training/ai-assisted-qa-course/exercises/M10/exercise.md");
    expect(m09).toContain("解答を示さず");
    expect(m09).toContain("合成A〜F");
    expect(m09).toContain("21回（3×7）");
    expect(m09).toContain("2回");
    expect(m10).toContain("第1段階");
    expect(m10).toContain("第2段階");
    expect(m10).toContain("第3段階");
    expect(m10).toContain("独立したM10正式評価");
    expect(m10).toContain("pnpm course:assess M10 --model provider/model-id");
    expect(m10).toContain("Tokenや非公開履歴をAIモデルへ送信せず");
    expect(exercise).toContain("API tokenはAIへ送信しません");
  });
});
