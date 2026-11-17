import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (relative) => fs.readFileSync(path.join(process.cwd(), relative), "utf8");
const materials = read("training/ai-assisted-qa-course/exercises/M07/failure-cases.md");
const lesson = read("training/ai-assisted-qa-course/exercises/M07/exercise.md");
const submission = read("training/ai-assisted-qa-course/exercises/M07/submission-template.md");
const config = read("playwright.ai-assisted-qa.config.ts");
const diagnostic = read("workspace/M07/failure-assertion.spec.ts");
const before = read("workspace/M07/repaired-assertion.spec.ts");
const referenceFailure = read(
  "training/ai-assisted-qa-course/assessment/playwright/M07/expected-failure/intentional-assertion.spec.ts",
);
const referenceAfter = read(
  "training/ai-assisted-qa-course/assessment/playwright/M07/repaired/repaired-assertion.spec.ts",
);

describe("M07-02/04：診断素材と修正対象の実行境界", () => {
  it("診断素材Aは実行できる誤Assertionで、商品・Reset・失敗識別子が固定される", () => {
    for (const spec of [diagnostic, referenceFailure]) {
      expect(spec).toContain('resetScenario(page, "default")');
      expect(spec).toContain('page.goto("/products/product-mug")');
      expect(spec).toContain('page.goto("/cart")');
      expect(spec).toContain('name: "存在しない商品"');
      expect(spec).toContain("M07_INTENTIONAL_ASSERTION_FAILURE");
      expect(spec).toContain(".toBeVisible()");
    }
    expect(materials).toContain("A：誤ったAssertion（実行可能）");
    expect(lesson).toContain("pnpm course:run M07 failure-assertion.spec.ts --label main");
    expect(lesson).toContain("このRunは修正対象のbefore Runとは別の診断記録");
  });

  it("通常OpenCodeは本人の診断→限定したヒント→本人の再実行→復習の順を守る", () => {
    expect(lesson).toContain("### OpenCodeの段階ヒントと失敗後の復習");
    expect(lesson).toContain("本人が先にAの失敗行");
    expect(lesson).toContain("次に確かめる証拠を一つ提案する");
    expect(lesson).toContain("コードや完成答案は書かない");
    expect(lesson).toContain("本人が実際に変更・再実行した別Run");
    expect(lesson).toContain("AIが提案したAssertionの削除");
    expect(lesson).toContain("本人の独立した診断");
    expect(lesson).toContain("Secret・認証状態・個人情報を含めず");
    expect(lesson).toContain("pnpm course:tutor M07 --model provider/model-id");
    expect(lesson).toContain("pnpm course:assess M07");
  });

  it("B/Cは合成ログであり実Trace/実Runの証拠にしない", () => {
    expect(materials).toContain("B：Reset条件の不一致（説明用ログ）");
    expect(materials).toContain("C：遅延仮説（説明用ログ）");
    expect(materials).toContain("reset requested scenario=default");
    expect(materials).toContain("retry changed result");
    expect(materials).toContain("B/Cは合成ログ");
    expect(submission).toContain("| B | 合成 |");
    expect(submission).toContain("| C | 合成 |");
    expect(submission).toContain("Trace / Screenshot / logが示すこと・示さないこと");
  });

  it("M07の失敗証拠は専用Configの条件付きTrace/画像と別Runで保存する", () => {
    expect(config).toContain('trace: "retain-on-failure"');
    expect(config).toContain('screenshot: "only-on-failure"');
    expect(config).toContain(
      '["json", { outputFile: path.join(outputRoot, "playwright-result.json") }]',
    );
    expect(lesson).toContain("pnpm course:run M07 repaired-assertion.spec.ts --label before");
    expect(lesson).toContain("pnpm course:run M07 repaired-assertion.spec.ts --label after");
    expect(lesson).toContain("同じ配布`source_sha`");
    expect(submission).toContain("保守演習の変更前後の別Run");
  });

  it("修正対象のbeforeはTODOによる失敗、参考afterは商品と数量1の業務Assertion", () => {
    expect(before).toContain('resetScenario(page, "default")');
    expect(before).toContain('page.goto("/cart")');
    expect(before).toContain('throw new Error("TODO: before Runの証拠に基づき');
    expect(before).not.toContain('name: "存在しない商品"');
    expect(referenceAfter).toContain('resetScenario(page, "default")');
    expect(referenceAfter).toContain('name: "セラミックマグ", exact: true');
    expect(referenceAfter).toContain('getByLabel("数量")).toHaveValue("1")');
    expect(referenceAfter).not.toContain('name: "存在しない商品"');
    expect(referenceAfter).not.toContain("TODO:");
    expect(materials).toContain("Aの失敗と修正対象のbefore/afterを同一Runとして扱わない");
  });
});
