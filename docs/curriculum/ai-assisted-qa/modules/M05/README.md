# M05：Node.js・TypeScript・Playwrightの最小基礎

## このモジュールで学ぶこと

- **目的と必要な理由：** テストコードを読んで、決められたテストを安全に実行できるようになります。AIの説明だけでなく、コードと実行結果を自分で確かめるためです。
- **到達点：** 変数・配列・関数などの役割を例から追い、Locator、操作、Assertionを区別し、待機や失敗の最初の確認先を選べます。
- **前提と前章とのつながり：** M04までの期待結果とレビュー判断を、テストコードで確かめます。必要なJavaScript/TypeScriptやNode.js用語はこの章で説明するため、プログラミング経験は不要です。
- **準備するもの：** Codespacesの学習用リポジトリ、package.json、本文で指定するサンプルspecを使います。まず読む順番を練習し、最初から新しいテストを作る必要はありません。

> **任意の補助：** 本文と演習だけで学べます。AIチューターを使わなくても進められます。利用する場合はCodespacesでM05をロードした後に `pnpm course:tutor M05 --model provider/model-id` を実行できます。利用条件を確認して起動し、質問にはToken・API key・個人情報を含めないでください。チューターはM05の公開資料と本人の成果物を読み取り専用で使い、正式評価やファイル変更は行いません。

## 図で全体の流れをつかむ

図の番号を左から追い、各段階で「何を根拠に決めるか」「何を見て確認するか」を本文の説明と結び付けてください。図は要約です。具体的な条件・例外・手順は続く節と演習で確認します。

![テスト実行の経路とコードの読み方](../../assets/figures/M05/01-runner-flow.svg)

*図：各段階がどの入力を受け、何を返すかを追います。*

![テスト実行の経路とコードの読み方：実践の手順](../../assets/figures/M05/02-code-to-assertion.svg)

*図：値を予測してから操作とAssertionを読みます。可視性の確認だけで業務結果を証明できるかも考えます。*

![Playwrightのテスト実行とブラウザー・結果レポートの関係を表す概念図](../../assets/m05-test-execution-flow.png)

*概念図：実行結果は、指定した対象・条件・レポートを確認して解釈します。*

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

上の例を左から追うと、配列の添字は0から始まるので`quantities[2]`は3です。`exceedsLimit(3)`は`3 > 2`を評価し、`true`なので文を表示します。`setup.limit`を3に変えると`3 > 3`は`false`になり、表示されません。数値の代わりに文字列`"3"`を`exceedsLimit`へ渡すと、宣言された引数の型と一致しないため型検査で指摘されます。型の警告を消すだけで期待する業務結果が正しいとは限りません。

`export`は他ファイルへ公開する宣言、`import`はその宣言を利用する入口です。Playwrightの`test`と`expect`はパッケージからimportします。ブラウザ操作は完了まで時間がかかるため、`async`関数で`await`を付けて順番に待ちます。例えばページを開く前に画面のボタンを押すのではなく、`await page.goto(...)`の後で`await ...click()`します。

自分で確認するには、上の配列の先頭を選ぶと`requestedQuantity`がいくつになり、条件が真か偽かを書いてから読み直します。添字3には値がないため`undefined`です。値がないまま数値として使おうとしたら、配列の長さと分岐を確認します。

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

## はじめてのコードを読む順番

1. 実行前に`package.json`の`scripts`で、教材が呼ぶ処理名を探します。`node --version`でNode.jsが使えることも確かめます。環境を作り直したり、依存を勝手に追加したりしません。
2. 例の配列・オブジェクト・関数を一行ずつ読み、`quantities[2]`の値、`3 > 2`の結果、実行される文を紙に書いてから答え合わせします。
3. `page.goto`、Locator、click、`expect`を順番に指で追い、各行がCaseの「対象ページ」「操作」「期待」のどれに当たるかを書きます。
4. 演習のLocatorが見つからないときは、まず画面のアクセシブル名とページが開けているかを確認します。Assertionを消す、固定時間を足す、製品を変更する前に、最初のエラーとCaseの期待へ戻ります。
5. 最後に別のリンク名へ条件を変え、Locatorの変更箇所・実行対象・観測結果を自分で説明します。実行できないときは、型・Locator・Assertion・接続のどの段階で止まったかを記録します。

## 実技と確認

学習者は`workspace/M05/product-link.spec.ts`を読み、商品一覧にあるMugへのリンクをLocatorが選べない失敗を確認します。商品一覧で実際のアクセシブル名を確かめ、Locatorの名前だけを修正して再実行します。Assertionが詳細リンク先まで確認する意味を説明します。弱いAssertionへの置換や製品コードの変更はしません。変更前後の差と結果は`workspace/M05/submission.md`へ記録します。

実行証拠を残すには、M05の指定specを同じコマンドで修正前後に実行します。初回の失敗もreceipt、spec snapshot、JSON reportとともに保存されます。

実行ツールは、そのRunで使った教材版とspecを内部記録へ結び付けます。版が合わない記録は正式評価に使えません。受講者はハッシュ値を計算する必要はありません。実行したspec、結果、画面やレポートが同じRunのものかを確認します。

```bash
pnpm course:run M05 product-link.spec.ts --label before
pnpm course:run M05 product-link.spec.ts --label after
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
| 専用実行 | `course:run`で新課程Configの指定specを動かし、対象workspace、loopback 8082、結果先、同じRunのreportとspecの写しを示す | 旧Training specや別RunのPASSを使う |

修正前後の差分と本人の説明を確認します。AIがコードを書いたことや、コマンドを実行できたことだけでは到達としません。

## 確認クイズ

[M05の確認クイズ](../../quizzes/M05.json)を開いてください。

## 参考

- [新課程Playwright Config](../../../../../playwright.ai-assisted-qa.config.ts)
- [Playwrightの公式ベストプラクティス](https://playwright.dev/docs/best-practices)
- [TypeScriptの基本型](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html)
- [M05の学習項目と到達基準](../../../../plans/2026-10-16_qa-curriculum-ai-agent-redesign_learning-map.md)
