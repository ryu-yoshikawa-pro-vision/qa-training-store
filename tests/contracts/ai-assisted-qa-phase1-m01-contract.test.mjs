import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), "utf8");

describe("M01の正式Cart仕様とテスト層", () => {
  const lesson = read("docs/curriculum/ai-assisted-qa/modules/M01/README.md");
  const exercise = read("training/ai-assisted-qa-course/exercises/M01/exercise.md");
  const submission = read("training/ai-assisted-qa-course/exercises/M01/submission-template.md");
  const rubric = JSON.parse(
    read("training/ai-assisted-qa-course/assessment/scoring-tests/M01.json"),
  );

  it("数量selectの制約とUse Case契約を区別する", () => {
    expect(lesson).toContain("独立したバックエンドAPIサーバーがありません");
    expect(lesson).toContain("Web画面の`select`では上限外の`4`を選択できない");
    expect(lesson).toContain("CartUseCases.updateQuantity");
    expect(lesson).toContain("Dexie");
    expect(lesson).not.toContain("カートAPIに数量変更リクエスト");
    expect(lesson).not.toContain("注文APIに対して");
  });

  it("P05に4層の別条件・提出証拠を要求する", () => {
    for (const layer of ["Unit", "Integration", "Component", "Web E2E"]) {
      expect(exercise).toContain(layer);
      expect(submission).toContain(layer);
    }
    expect(exercise).toContain("**4層それぞれ**");
    expect(exercise).toContain("検出できる欠陥と検出できない欠陥");
    expect(lesson).toContain("**観点D**：**Componentテスト**");
    const criterion = rubric.criteria.find((c) => c.id === "M01-CR-04");
    expect(criterion?.pass_conditions.join(" ")).toContain("Component");
  });
});
