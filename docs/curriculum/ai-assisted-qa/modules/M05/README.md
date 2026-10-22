# M05：Node.js・TypeScript・Playwrightの最小基礎

## このモジュールで学ぶこと

学習用リポジトリにあるNode.jsとpnpmを使って、短いTypeScriptとPlaywrightのspecを読み、説明し、一箇所を修正して再実行します。開発環境全体の再構築や高度なTypeScriptは学習範囲に含みません。

## 実行の流れ

1. **Node.js**はJavaScriptを実行する環境です。`node --version`で実際のバージョンを確認します。
2. **pnpm**はこのリポジトリのコマンドを起動します。どのscriptを実行するかは`package.json`で確認します。
3. **TypeScript**の変数、配列、オブジェクト、条件分岐、関数、基本型、`import`/`export`、`async`/`await`を短いコードで読みます。
4. **Playwright**のLocator、Action、AssertionをCaseの前提・操作・期待結果に対応させます。
5. 指定された1つの新課程specを実行し、Config、対象サーバー、ログ、結果保存先を確認します。

Node.jsはブラウザ内のJavaScriptとは異なり、ターミナルやPlaywright runnerなどブラウザ外のプログラムを実行します。`package.json`の`scripts`は実行可能なコマンド、`dependencies`と`devDependencies`は必要なパッケージです。`pnpm install`は依存を導入し、`pnpm run <script>`は登録された処理を起動します。教材をコピーする`pnpm course:load M05`とテストを走らせるコマンドは別の目的です。

## コードを読む

最初は短い値と関数で読み方を練習します。配列は複数の値、objectは名前付きのプロパティをまとめます。条件分岐は条件によって処理を変え、関数は名前付きの処理を再利用します。

```ts
const quantities: number[] = [1, 2, 3];
const setup = { limit: 2 };
function exceedsLimit(value: number): boolean {
  return value > setup.limit;
}
const requestedQuantity = quantities[2];
if (requestedQuantity !== undefined && exceedsLimit(requestedQuantity)) {
  console.log("上限を超える");
}
```

配列の位置に値があるとは限らないため、取り出した値が`undefined`でないことを確かめてから関数へ渡します。`import`/`export`はファイル間で値や関数を共有します。TypeScriptの型は値の形を確認する手がかりですが、実行時の結果を保証しません。構文エラーはコードの形、型エラーは宣言と値の不一致、実行時エラーは処理中の失敗、Assertion失敗は期待結果との不一致です。値を1つ変えて条件がどう変化するかを説明してから実行します。

```ts
import { expect, test } from "@playwright/test";

test("商品一覧への導線を確認する", async ({ page }) => {
  await page.goto("/products");
  const productLinks = page.locator('a[href^="/products/"]');
  await expect(productLinks.first()).toBeVisible();
});
```

- `test(...)`は1つのテストを登録します。
- `async`関数内の`await`は、ページ操作やAssertionの完了を待ちます。
- `page.locator(...)`は画面上の要素を見つけるLocatorです。
- `toBeVisible()`はその要素の表示を確認します。商品一覧が仕様どおりの内容を含むことまで保証するAssertionではありません。

このコードはLocatorとAssertionの読み方を示す教材例です。受講者のCaseに必要な業務上の期待結果を満たす完成specではありません。表示確認だけで業務動作を検証したと判断しないでください。

## 待機と失敗の読み分け

PlaywrightのWeb-first Assertionは、条件が満たされるまで設定範囲で再試行します。固定時間待機を足す前に、Locatorが正しいか、操作が完了したか、期待結果が正しいかをログと画面で確認します。

失敗は少なくとも次のように分けて調べます。

| 症状 | 最初に確認するもの |
| --- | --- |
| TypeScriptの型・構文エラー | 対象行、型、括弧、import、実行script |
| Locator/Actionの失敗 | 対象ページ、Locatorの一意性、操作可能状態 |
| Assertion失敗 | Caseの期待結果と画面で観測した事実 |
| 接続・起動失敗 | ConfigのURL、対象サーバー、実行環境 |

## 実技と確認

学習者は`workspace/M05/product-link.spec.ts`を読み、商品一覧にあるMugへのリンクをLocatorが選べない失敗を確認します。商品一覧で実際のアクセシブル名を確かめ、Locatorの名前だけを修正して再実行します。Assertionが詳細リンク先まで確認する意味を説明します。弱いAssertionへの置換や製品コードの変更はしません。変更前後の差と結果は`workspace/M05/submission.md`へ記録します。

M05は次の専用コマンドで実行します。

```bash
PLAYWRIGHT_TEST_ROOT=workspace/M05 pnpm run training:ai-assisted-qa:test
```

Phase 2では新課程の専用Configを使い、テスト対象は`workspace/M05`、`workspace/M06`または`workspace/M07`だけです。通常Webの8081、Training専用テストサーバーの8082、PrivateのnoVNC 6080を混同しません。

本人が別の短いコードでも変数、関数、`await`、型、実行scriptを説明でき、変更後の実行証拠を示せれば次へ進めます。

## 評価基準

| 観点 | 到達を示す証拠 | 到達しない例 |
| --- | --- | --- |
| 実行経路 | `package.json`から指定script、Node.js、pnpmの役割を追って説明する | コマンドを暗記して対象や結果先を説明できない |
| TypeScriptの基礎 | 別の短いコードで変数、配列、object、関数、型、import/export、async/awaitを説明し、一箇所を安全に修正する | 例を写しただけで変更箇所や型を説明できない |
| LocatorとAssertion | Caseに合うLocatorを選び、可視性確認が業務動作まで保証しない範囲を説明する | Locatorが見つかったことを業務結果の証拠とする |
| 待機と診断 | エラーの種類に応じて確認箇所を選び、固定時間待機を根拠なしに追加しない | タイムアウトへ固定待機だけを足す |
| 専用実行 | 新課程Configで指定された1 specを動かし、対象workspace、loopback 8082、結果先と同じ実行の証拠を示す | 旧Training specや別RunのPASSを使う |

修正前後の差分と本人の説明を確認します。AIがコードを書いたことや、コマンドを実行できたことだけでは到達としません。

## 確認クイズ

[M05の確認クイズ](../../quizzes/M05.json)を開いてください。

## 参考

- [PlaywrightのTraining Config](../../../../../playwright.training.config.ts)
- [Playwrightの公式ベストプラクティス](https://playwright.dev/docs/best-practices)
- [TypeScriptの基本型](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html)
- [M05の学習項目と到達基準](../../../../plans/2026-10-16_qa-curriculum-ai-agent-redesign_learning-map.md)
