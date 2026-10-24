# M05 実技：TypeScript specを読んで部分修正

## 入力

Node.js、pnpm、`package.json`、TypeScript、Playwrightの順に用語を確認します。起動中のScenario Shopを使い、Codespaceの再構築や依存追加はしません。入力specは`workspace/M05/product-link.spec.ts`です。Mugの商品リンクを探すLocatorの名前に一箇所だけ誤りがあり、修正前の実行では見つからず失敗します。

## 手順

1. `const`、文字列、配列、オブジェクト、基本型、条件分岐を例で読みます。
2. 関数と戻り値、import/export、`async` / `await`がテストで果たす役割を説明します。
3. Locatorで要素を特定し、Actionで操作し、Assertionで期待結果を確かめる短いspecを読みます。
4. 最初にspecを実行し、Locatorの失敗行と実際に観測できたことを記録します。
5. 商品一覧にあるMugの詳細リンクのアクセシブル名を確認し、Locatorの名前だけを修正して再実行します。Assertionが詳細リンク先を確認していることを説明し、Assertionを弱めてPASSを作らないでください。
6. ConfigのtestDir、8082の専用test server、8081の通常web、6080のPrivate/noVNC、出力先を確認します。

## 提出物

`workspace/M05/submission.md`に修正差分、修正前後の実行コマンドと結果、失敗の分類、testDir/base URL/出力先、表示Assertionが保証する範囲を書きます。M05の実行は`PLAYWRIGHT_TEST_ROOT=workspace/M05 pnpm run training:ai-assisted-qa:test`です。
