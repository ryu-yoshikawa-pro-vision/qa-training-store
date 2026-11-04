import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");
const lesson = read("docs/curriculum/ai-assisted-qa/modules/M05/README.md");
const exercise = read("training/ai-assisted-qa-course/exercises/M05/exercise.md");
const submission = read("training/ai-assisted-qa-course/exercises/M05/submission-template.md");
const starter = read("workspace/M05/product-link.spec.ts");
const reference = read(
  "training/ai-assisted-qa-course/assessment/playwright/M05/product-link.spec.ts",
);
const runs = [];

afterEach(() => {
  for (const directory of runs.splice(0)) fs.rmSync(directory, { recursive: true, force: true });
});

function exampleAfter(markdown, heading, language) {
  const section = markdown.split(heading);
  expect(section).toHaveLength(2);
  const opening = ["```", language, "\n"].join("");
  const start = section[1].indexOf(opening);
  expect(start, heading).toBeGreaterThanOrEqual(0);
  const rest = section[1].slice(start + opening.length);
  const end = rest.indexOf("\n```");
  expect(end, heading).toBeGreaterThanOrEqual(0);
  return rest.slice(0, end);
}

function runNode(script) {
  return spawnSync(process.execPath, ["--input-type=module", "--eval", script], {
    cwd: root,
    encoding: "utf8",
    timeout: 10_000,
  });
}

describe("M05-01：教材コードの動作とspec変更の境界", () => {
  it("教材の関数・async・awaitサンプルの期待出力をNode.jsで実行確認する", () => {
    const cases = [
      {
        heading: "#### 実習A：関数を呼び出して結果の流れを追う",
        expected: ["false", "true"],
      },
      {
        heading: "#### 実習B：非同期処理の実行順序を確認する",
        expected: [
          "1. 処理を開始します",
          "2. データを準備しました",
          "3. すべての処理が終了しました",
        ],
      },
      {
        heading: "### 6.3 実験：`await`を忘れたとき、なぜ判断が間違うのか",
        expected: [
          "awaitなしの値はPromise（引換券）か: true",
          "誤った判断: 購入できる",
          "awaitありの判定値: false",
          "正しい判断: 購入できない",
        ],
      },
    ];
    for (const { heading, expected } of cases) {
      const script = exampleAfter(lesson, heading, "js");
      const result = runNode(script);
      expect(result.status, heading + "\n" + result.stderr).toBe(0);
      expect(result.stdout.trim().split("\n")).toEqual(expected);
    }
  });

  const linuxIt = process.platform === "linux" ? it : it.skip;
  linuxIt("課題のTypeScript短コードをtsxで実行し、添字の変更で分岐が変わる", () => {
    const script = exampleAfter(exercise, "### TypeScriptの短いコード演習", "ts");
    expect(script).toContain("quantities[1]");
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "course-m05-foundations-"));
    runs.push(directory);
    const file = path.join(directory, "practice.ts");
    function run() {
      return spawnSync("pnpm", ["exec", "tsx", file], {
        cwd: root,
        encoding: "utf8",
        timeout: 30_000,
      });
    }
    fs.writeFileSync(file, script);
    const before = run();
    expect(before.status, before.stderr).toBe(0);
    expect(before.stdout.trim()).toBe("上限を再確認");
    fs.writeFileSync(file, script.replace("quantities[1]", "quantities[0]"));
    const after = run();
    expect(after.status, after.stderr).toBe(0);
    expect(after.stdout.trim()).toBe("範囲内");
  });

  it("M05の開始specはLocatorの一箇所だけが誤り、参考specは同じhref Assertionを維持する", () => {
    const wrong = 'name: "セラミックマク", exact: true';
    const correct = 'name: "セラミックマグ", exact: true';
    expect(starter.split(wrong)).toHaveLength(2);
    expect(starter).toContain('await page.goto("/products")');
    expect(starter).toContain(
      'await expect(mugLink).toHaveAttribute("href", "/products/product-mug")',
    );
    expect(reference).toContain(correct);
    expect(reference).toContain(
      'await expect(mugLink).toHaveAttribute("href", "/products/product-mug")',
    );
    expect(starter.replace(wrong, correct)).toContain(correct);
    expect(exercise).toContain("pnpm course:run M05 product-link.spec.ts --label before");
    expect(exercise).toContain("pnpm course:run M05 product-link.spec.ts --label after");
    expect(exercise).toContain("spec SHA");
    expect(submission).toContain("修正前/修正後の実行コマンド・Run結果");
    expect(submission).toContain("一箇所の修正差分");
  });
});
