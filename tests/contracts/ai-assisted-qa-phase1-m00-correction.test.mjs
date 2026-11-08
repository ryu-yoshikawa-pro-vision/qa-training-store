import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (relativePath) => fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

describe("M00-03の本人による別条件の誤回答訂正", () => {
  it("実AIの採否と架空の誤回答の訂正を別々に提出させる", () => {
    const exercise = read("training/ai-assisted-qa-course/exercises/M00/exercise.md");
    const submission = read("training/ai-assisted-qa-course/exercises/M00/submission-template.md");
    const lesson = read("docs/curriculum/ai-assisted-qa/modules/M00/README.md");
    const rubric = JSON.parse(
      read("training/ai-assisted-qa-course/assessment/scoring-tests/M00.json"),
    );
    const criterion = rubric.criteria.find((entry) => entry.id === "M00-CR-03");

    expect(exercise).toContain("P04 手本にない読取り専用依頼（M00-03）");
    expect(exercise).toContain("架空の誤回答");
    expect(exercise).toContain("ブラウザのタブを閉じればCodespaceも必ず停止");
    expect(exercise).toContain("実AIが正答した場合でも");
    expect(exercise).toContain("架空の誤回答を実AIの出力として記録してはいけません");
    expect(exercise).toContain("本人の訂正文と出典");
    expect(submission).toContain("P04の架空誤回答への本人の訂正文");
    expect(submission).toMatch(/^\| P04 \|.*架空誤回答の訂正/m);
    expect(lesson).toContain("実際のAI応答");
    expect(lesson).toContain("架空の回答例");
    expect(criterion?.objective_ids).toContain("M00-03");
    expect(criterion?.required_evidence.join(" ")).toContain("P04");
  });
});
