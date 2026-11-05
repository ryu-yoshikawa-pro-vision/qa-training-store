import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const reviewPath = "workspace/M08/review-candidate.md";
const earlierPath = "workspace/M08/first-change.md";

function git(cwd, ...args) {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trimEnd();
}

function commit(cwd, message) {
  git(
    cwd,
    "-c",
    "user.name=Phase3 Fixture",
    "-c",
    "user.email=phase3@example.invalid",
    "-c",
    "commit.gpgsign=false",
    "commit",
    "-qm",
    message,
  );
  return git(cwd, "rev-parse", "HEAD");
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

describe("M08-03 PR comparison and evidence contract", () => {
  it("separates the second commit from the complete base/head change set", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "m08-pr-contract-"));
    try {
      fs.mkdirSync(path.join(dir, "workspace/M08"), { recursive: true });
      git(dir, "init", "-q", "--initial-branch=main");
      fs.writeFileSync(path.join(dir, reviewPath), "# Review\n");
      git(dir, "add", "--", reviewPath);
      const baseSha = commit(dir, "base");
      git(dir, "switch", "-q", "-c", "practice/m08-review");
      fs.writeFileSync(path.join(dir, earlierPath), "first local change\n");
      git(dir, "add", "--", earlierPath);
      const parentSha = commit(dir, "first change");
      fs.writeFileSync(path.join(dir, reviewPath), "# Review\nCase: TRAINING-M08-CASE\n");
      git(dir, "add", "--", reviewPath);
      const headSha = commit(dir, "second change");

      expect(git(dir, "rev-parse", "HEAD^")).toBe(parentSha);
      expect(git(dir, "diff", "--name-only", "HEAD^", "HEAD")).toBe(reviewPath);
      expect(git(dir, "show", "--format=", "--name-only", "HEAD")).toBe(reviewPath);
      const prFiles = git(dir, "diff", "--name-only", "main...HEAD").split("\n").sort();
      expect(prFiles).toEqual([earlierPath, reviewPath]);
      expect(git(dir, "merge-base", "main", "HEAD")).toBe(baseSha);
      expect(headSha).toMatch(/^[0-9a-f]{40}$/);

      // Synthetic API response, not an actual GitHub PR or completed Run.
      const apiSample = {
        number: 17,
        base: { ref: "main", sha: baseSha },
        head: { ref: "practice/m08-review", sha: headSha },
      };
      const draftEvidence = {
        case_id: "TRAINING-M08-CASE",
        comparison: { from: parentSha, to: headSha, files: [reviewPath] },
        spec_path: null,
        run_id: null,
        test_status: "not_executed",
        unknown: ["PR was not created", "CI was not run"],
      };
      expect(apiSample.head.sha).toBe(draftEvidence.comparison.to);
      expect(apiSample.base.sha).not.toBe(draftEvidence.comparison.from);
      expect(draftEvidence.comparison.files).toEqual([reviewPath]);
      expect(draftEvidence.run_id).toBeNull();
      expect(draftEvidence.test_status).toBe("not_executed");
      expect(draftEvidence.unknown).toContain("CI was not run");

      const exercise = read("training/ai-assisted-qa-course/exercises/M08/exercise.md");
      const submissionPath = "training/ai-assisted-qa-course/exercises/M08/submission-template.md";
      const submission = read(submissionPath);
      expect(exercise).toContain("commit単独");
      expect(exercise).toContain("base/head");
      expect(exercise).toContain("Run ID（なければ「未実行」）");
      expect(submission).toContain("PRの実際のbase/head・全差分");
      expect(submission).toContain("仕様/Case ID");
      expect(submission).toContain("M08-to-M09-handoff-v1");
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("M08-04 review evidence, false positives, omissions and abstraction", () => {
  it("binds concrete review scenarios to exercise, submission and quiz", () => {
    const exercise = read("training/ai-assisted-qa-course/exercises/M08/exercise.md");
    const submissionPath = "training/ai-assisted-qa-course/exercises/M08/submission-template.md";
    const submission = read(submissionPath);
    const module = read("docs/curriculum/ai-assisted-qa/modules/M08/README.md");
    const quiz = JSON.parse(read("docs/curriculum/ai-assisted-qa/quizzes/M08.json"));

    expect(exercise).toContain("Run未実行でもCI成功と書く");
    expect(exercise).toContain("仕様IDと実際のRun IDをPR説明に対応付ける");
    expect(exercise).toContain("将来に備えて共通Factory");
    expect(exercise).toContain("変更負荷が実証された場合");
    expect(exercise).toContain("staged diffには公開禁止の");
    expect(submission).toContain("Dの見落としと停止条件");
    expect(module).toContain("指摘された「数」");
    expect(module).toContain("仕様書（BR/AC）");

    const objectives = new Map(quiz.questions.map((question) => [question.id, question]));
    const prQuiz = objectives.get("M08-Q03");
    const reviewQuiz = objectives.get("M08-Q04");
    expect(prQuiz.objective_ids).toContain("M08-03");
    expect(reviewQuiz.objective_ids).toContain("M08-04");
    const prAnswer = prQuiz.options.find((option) => option.value === prQuiz.correct_value);
    const reviewAnswer = reviewQuiz.options.find(
      (option) => option.value === reviewQuiz.correct_value,
    );
    expect(prAnswer.label).toContain("仕様IDとdiff");
    expect(reviewAnswer.label).toContain("現在の重複");
  });

  it("rejects unexecuted CI, missed staged paths and speculative abstractions", () => {
    const cases = [
      {
        scenario: "AI reports success for an unexecuted Run",
        observedRun: null,
        verifiedRun: false,
        safeToClaimCiPassed: false,
      },
      {
        scenario: "AI misses an excluded staged path",
        stagedPaths: [reviewPath, "workspace/M08/private-note.md"],
        allowedPaths: [reviewPath],
        safeToCommit: false,
      },
      {
        scenario: "AI proposes a shared Factory with no demonstrated duplication",
        duplicateSites: 0,
        measuredChangeCost: null,
        approveAbstraction: false,
      },
    ];
    expect(cases[0].observedRun).toBeNull();
    expect(cases[0].verifiedRun).toBe(false);
    expect(cases[0].safeToClaimCiPassed).toBe(false);
    const stageIsSafe = cases[1].stagedPaths.every((file) => cases[1].allowedPaths.includes(file));
    expect(stageIsSafe).toBe(false);
    expect(cases[1].safeToCommit).toBe(false);
    expect(cases[2].duplicateSites).toBe(0);
    expect(cases[2].measuredChangeCost).toBeNull();
    expect(cases[2].approveAbstraction).toBe(false);
  });
});
