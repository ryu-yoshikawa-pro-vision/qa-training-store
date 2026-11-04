import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
const read = (p) => fs.readFileSync(path.join(process.cwd(), p), "utf8");
describe("M04四層のレビュー・引継ぎ契約", () => {
  const lesson = read("docs/curriculum/ai-assisted-qa/modules/M04/README.md");
  const exercise = read("training/ai-assisted-qa-course/exercises/M04/exercise.md");
  const template = read("training/ai-assisted-qa-course/exercises/M04/submission-template.md");
  it("4層と現実のCart実装を区別", () => {
    expect(exercise).toContain("4層それぞれの検証可能性");
    expect(template).toContain("Unit/Integration/Component/Web E2Eの4層別");
    expect(lesson).toContain("Use CaseからDexie/IndexedDBへの保存と再取得");
    expect(lesson).not.toContain("カート更新APIに対して");
  });
  it("M06引継ぎに本人の新Caseと出典を要求", () => {
    expect(exercise).toContain("既存の固定3件と削除Case以外");
    expect(exercise).toContain("実行可能な別候補を再選定");
    expect(exercise).toContain("Case ID、BR/AC");
    expect(template).toContain("| P06 |");
    expect(lesson).toContain("Scenario Shopとは別の架空のシステム");
  });
});
