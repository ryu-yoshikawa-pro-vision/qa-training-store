# M05 開始サンプル：コードを読む

Node.jsはJavaScript実行環境、pnpmはpackage.jsonに定義されたscriptや依存を扱う道具です。TypeScriptは値の型を注釈でき、Playwrightはブラウザーを操作して期待結果を確認します。

`workspace/M05/product-link.spec.ts`を開き、`test`、`page.goto`、Locator、Assertionを順に確認します。この公開練習specには、Mugの商品リンクを見つけられないLocatorが一つあります。失敗前のコードと結果を記録し、商品一覧のリンク名を調べてLocatorの名前だけを修正してください。Assertionを削除・弱化したり、Scenario Shopを変更したりしません。

修正差分と実行結果を`workspace/M05/submission.md`へ記録します。実行は指定されたコマンドだけにし、依存の再インストールやCodespace再構築は行いません。
