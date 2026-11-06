import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (file) => fs.readFileSync(path.join(process.cwd(), file), "utf8");

describe("M02の数量境界・Seed/Reset・本人の判断", () => {
  it("Web UIでは上限外数量を直接選べず、契約テスト入力と区別する", () => {
    const lesson = read("docs/curriculum/ai-assisted-qa/modules/M02/README.md");
    expect(lesson).toContain("有効上限3の状態で4を直接選ぶ操作はできません");
    expect(lesson).toContain("Use Case/契約テストで指定する境界入力");
  });

  it("独立した初期状態、未実証のSeed、Riskと未決質問を提出できる", () => {
    const exercise = read("training/ai-assisted-qa-course/exercises/M02/exercise.md");
    const template = read("training/ai-assisted-qa-course/exercises/M02/submission-template.md");
    const requiredPhrases = [
      "それぞれ独立した初期状態2",
      "論理用の仮データ",
      "架空の追加情報",
      "P06 Resetによる保証",
    ];
    for (const phrase of requiredPhrases) {
      expect(exercise).toContain(phrase);
    }
    for (const id of ["P01", "P02", "P03", "P04", "P05", "P06"]) {
      expect(template).toContain(`| ${id} |`);
    }
  });
});
