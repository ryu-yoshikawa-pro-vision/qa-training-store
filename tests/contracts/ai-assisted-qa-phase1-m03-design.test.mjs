import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (file) => fs.readFileSync(path.join(process.cwd(), file), "utf8");
describe("M03の4技法・Use Case境界・追跡証拠", () => {
  const lesson = read("docs/curriculum/ai-assisted-qa/modules/M03/README.md");
  const exercise = read("training/ai-assisted-qa-course/exercises/M03/exercise.md");
  const submission = read("training/ai-assisted-qa-course/exercises/M03/submission-template.md");
  const rubric = JSON.parse(read("training/ai-assisted-qa-course/assessment/scoring-tests/M03.json"));

  it("Webのselectを数値自由入力と混同しない", () => {
    expect(lesson).toContain("上限外の値や0を画面から直接選べません");
    expect(lesson).toContain("Use Case/契約テストの操作例");
    expect(exercise).toContain("Web UIで数量0を選択できることは前提にしません");
  });

  it("別条件の4技法と独立したCaseの根拠が揃う", () => {
    for (const id of ["M03-01", "M03-02", "M03-03", "M03-04"]) {
      expect(submission).toContain(`| ${id} `);
      expect(rubric.criteria.some((c) => c.objective_ids.includes(id))).toBe(true);
    }
    expect(exercise).toContain("TR→TCN→CI→Case→BR/AC");
    expect(exercise).toContain("condition_structure(direct)");
    expect(exercise).toContain("verify_runtime_evidence");
    expect(exercise).toContain("モデル/技法runtimeの生成を実行していない場合");
  });
});
