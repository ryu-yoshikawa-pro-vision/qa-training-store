import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (relative) => fs.readFileSync(path.join(process.cwd(), relative), "utf8");
const before = read(
  "training/ai-assisted-qa-course/assessment/playwright/M07/maintenance-before/cart.spec.ts",
);
const after = read(
  "training/ai-assisted-qa-course/assessment/playwright/M07/maintenance-after/cart.spec.ts",
);
const exercise = read("training/ai-assisted-qa-course/exercises/M07/exercise.md");
const handoff = read("training/ai-assisted-qa-course/exercises/M07/handoff-template.md");
const submission = read("training/ai-assisted-qa-course/exercises/M07/submission-template.md");

/** 参考specのトップレベルのtest宣言だけを抽出する。 */
function testNames(source) {
  return [...source.matchAll(/^test\("([^"]+)", async /gm)].map((match) => match[1]);
}

describe("M07-05：保守前後の公開参考specと証拠契約", () => {
  it("保守前は独立した2testで、それぞれResetと数量Assertionを持つ", () => {
    expect(testNames(before)).toEqual(["追加したマグは数量1", "数量を2へ変更できる"]);
    expect(before.match(/resetScenario\(page, "default"\)/g)).toHaveLength(2);
    expect(before).toContain('getByLabel("数量")).toHaveValue("1")');
    expect(before).toContain('getByLabel("数量")).toHaveValue("2")');
    expect(before).toContain('selectOption("2")');
  });

  it("保守後は3testで、test単位Resetと小さなPage Objectを共有する", () => {
    expect(testNames(after)).toEqual([
      "追加したマグは数量1",
      "数量を2へ変更できる",
      "数量2への変更はカートを開き直しても維持される",
    ]);
    expect(after).toContain("class CartPage");
    expect(after).toContain("base.extend<{ cart: CartPage }>");
    expect(after).toContain('resetScenario(page, "default")');
    expect(after).toContain("await runWithCart(new CartPage(page))");
    expect(after).toContain('name: "カートに追加", exact: true');
    expect(after).toContain('getByLabel("数量")).toHaveValue("1")');
    expect(after).toContain('getByLabel("数量")).toHaveValue("2")');
    expect(after).toContain('selectOption("2")');
  });

  it("3件目はCart外への移動と再入場が必要で、reloadだけを受入条件としない", () => {
    expect(exercise).toContain("Cart以外のページへ移動");
    expect(exercise).toContain("単にCartページを`reload()`するだけでは");
    expect(submission).toContain("同一ページの`reload()`だけでは不可");
    expect(handoff).toContain("別ページへ移動しCartを開き直す");
    // 参考specの実際の3件目がこの契約を満たすかは#217の変更を
    // #199へ統合したHEADで再確認する。現#215の参考specを合格扱いしない。
  });

  it("before/afterを別Runで照合し、test件数・spec SHAと業務Assertionを残す", () => {
    expect(exercise).toContain("pnpm course:run M07 maintenance.spec.ts --label before");
    expect(exercise).toContain("pnpm course:run M07 maintenance.spec.ts --label after");
    expect(exercise).toContain("before`は2件PASS、`after`は3件以上PASS");
    expect(exercise).toContain("before/afterで異なるspec SHA");
    expect(handoff).toContain("保守変更前（既存2件）");
    expect(handoff).toContain("保守変更後（独立3件以上）");
    expect(handoff).toContain("`source_sha`・`spec_sha256`");
    expect(submission).toContain("before2/after3以上のRunとspec SHA");
  });
});
