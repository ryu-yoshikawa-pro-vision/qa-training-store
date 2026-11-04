import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (name) => fs.readFileSync(path.join(process.cwd(), name), "utf8");
const starter = read("training/ai-assisted-qa-course/inputs/M06/new-case.spec.ts");
const removal = read(
  "training/ai-assisted-qa-course/assessment/playwright/M06/remove-item.spec.ts",
);
const update = read(
  "training/ai-assisted-qa-course/assessment/playwright/M06/quantity-update.spec.ts",
);
const cart = read("src/presentation/pages/cart-page.tsx");
const exercise = read("training/ai-assisted-qa-course/exercises/M06/exercise.md");
const submission = read("training/ai-assisted-qa-course/exercises/M06/submission-template.md");

describe("M06-01：削除004と数量更新005は別Case・別業務Assertion", () => {
  it("未完成入力は004のみで、005は学習者が別testとして追加する", () => {
    expect(starter.match(/test\("/g)).toHaveLength(1);
    expect(starter).toContain("CASE-CART-004");
    expect(starter).not.toContain("CASE-CART-005");
    expect(starter).toContain('throw new Error("TODO: CASE-CART-004を実装する")');
    expect(exercise).toContain("CASE-CART-005");
    expect(exercise).toContain("別のtest");
  });

  it("公開参考の削除Caseは削除前の数量1と削除後の空状態を確認する", () => {
    expect(removal.match(/test\("/g)).toHaveLength(1);
    expect(removal).toContain('resetScenario(page, "default")');
    expect(removal).toContain('page.goto("/products/product-mug")');
    expect(removal).toContain('getByLabel("数量")).toHaveValue("1")');
    expect(removal).toContain('getByRole("button", { name: "削除", exact: true }).click()');
    expect(removal).toContain(
      'getByRole("heading", { name: "セラミックマグ", exact: true })).toHaveCount(0)',
    );
    expect(removal).toContain('getByText("カートは空です", { exact: true })).toBeVisible()');
  });

  it("公開参考の数量Caseはselectの1→2と再読込後の2を直接検証する", () => {
    expect(update.match(/test\("/g)).toHaveLength(1);
    expect(update).toContain("CASE-CART-005");
    expect(update).toContain('resetScenario(page, "default")');
    expect(update).toContain('getByLabel("数量")).toHaveValue("1")');
    expect(update).toContain('getByLabel("数量").selectOption("2")');
    expect(update.match(/getByLabel\("数量"\)\)\.toHaveValue\("2"\)/g)).toHaveLength(2);
    expect(update).toContain("await page.reload()");
    expect(update).not.toContain('name: "削除"');
  });

  it("製品Web UIの数量は1以上のselectであり、削除は独立したbutton経路", () => {
    expect(cart).toMatch(/<label>\s*数量\s*<select/);
    expect(cart).toContain("(_, index) => index + 1");
    expect(cart).toContain("cartUseCases.updateQuantity({");
    expect(cart).toContain("cartUseCases.removeItem({");
    expect(cart).toContain("<button");
    expect(exercise).toContain("Web UIから数量0へ変更できるというE2Eは作りません");
  });

  it("course:runの4 outcomeと未実行を、終了コード・report・receiptで区別する", () => {
    const runner = read("scripts/training/ai-assisted-qa-run-evidence.mjs");
    expect(runner).toContain('const outcome = environmentFailure');
    for (const status of ['"passed"', '"failed"', '"blocked"', '"ungradable"']) {
      expect(runner).toContain(status);
    }
    expect(runner).toContain("exit_code: exitCode");
    expect(runner).toContain("source_sha: sourceSha");
    expect(runner).toContain("spec_sha256: sourceSha256");
    expect(runner).toContain("report_sha256:");
    expect(runner).toContain("tests: extracted.tests");

    expect(exercise).toContain("**終了コード・outcome・未実行の区別**");
    expect(exercise).toContain("receiptがない場合に架空のRun ID");
    expect(exercise).toContain("別spec/古いRun/004・005の片方だけなら成功にしません");
    expect(submission).toContain("PASS/FAIL/BLOCKED/未実行/判定不能");
    expect(submission).toContain("receipt未生成の未実行と`ungradable`");
  });

  it("初回と再実行の両方で004・005の結果・spec SHAを個別に照合する提出契約", () => {
    expect(exercise).toContain("pnpm course:run M06 new-case.spec.ts --label initial");
    expect(exercise).toContain("pnpm course:run M06 new-case.spec.ts --label repeat");
    expect(exercise).toContain("両Caseのtest名");
    expect(exercise).toContain("spec-snapshot.ts");
    expect(submission).toContain("CASE-CART-004/005の**各test名**");
    expect(submission).toContain("CASE-CART-004");
    expect(submission).toContain("CASE-CART-005");
  });
});
