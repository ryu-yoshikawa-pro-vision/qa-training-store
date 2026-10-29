# M05 実技：TypeScript specを読んで部分修正

## 入力

Node.js、pnpm、`package.json`、TypeScript、Playwrightの順に用語を確認します。起動中のScenario Shopを使い、Codespaceの再構築や依存追加はしません。入力specは`workspace/M05/product-link.spec.ts`です。Mugの商品リンクを探すLocatorの名前に一箇所だけ誤りがあり、修正前の実行では見つからず失敗します。

## 手順

1. `const`、文字列、配列、オブジェクト、基本型、条件分岐を例で読みます。
2. 関数と戻り値、import/export、`async` / `await`がテストで果たす役割を説明します。
3. Locatorで要素を特定し、Actionで操作し、Assertionで期待結果を確かめる短いspecを読みます。
4. 修正前に次を実行し、別Runとして保存します。終了コードが1で、対象Locatorの失敗が記録されたことを確認してください。

   ```bash
   pnpm course:run M05 product-link.spec.ts --label before
   ```

5. 商品一覧にあるMugの詳細リンクのアクセシブル名を確認し、Locatorの名前だけを修正して次のRunを実行します。Assertionが詳細リンク先を確認していることを説明し、Assertionを弱めてPASSを作らないでください。

   ```bash
   pnpm course:run M05 product-link.spec.ts --label after
   ```

   修正前後のRunは異なる`run_id`とspec SHAを持ち、両方のJSON reportは`workspace/M05/evidence/runs/`に残ります。終了コード0だけでなく、assessmentがreportとspec snapshotを照合します。
6. ConfigのtestDir、8082の専用test server、8081の通常web、6080のPrivate/noVNC、出力先を確認します。

## 提出物

`workspace/M05/submission.md`に修正差分、修正前後の実行コマンドと結果、失敗の分類、testDir/base URL/出力先、表示Assertionが保証する範囲を書きます。`course:run`は固定された新課程Configで指定specを実行し、spec snapshot、Playwright JSON report、report内のattachmentを一意のRun directoryへ保存します。

## 理解ノード別の追加確認

既存の演習で得られた証拠を再利用できます。各理解ノードについて本人の判断・操作・結果を区別し、未実施は未実施として記録してください。

- **K-M05-11**：配列の添字と要素を追い、添字を変えた結果を説明できる
- **K-M05-12**：プロパティ参照・変更の結果を説明し、配列の添字と混同しない
- **K-M05-13**：条件式の真偽から実行経路と結果を説明できる
- **K-M05-14**：引数・戻り値・関数の関係を説明し、短い関数を変更して結果を確認できる
- **K-M05-15**：Role・アクセシブル名から一意のLocatorを選び、実行して確認できる
- **K-M05-16**：型検査の成功と業務正しさを区別し、構文・型・実行・Assertionの失敗を分類できる

### TypeScriptの短いコード演習

Locator修正だけでは、配列・オブジェクト・関数などの理解を確認できません。以下のコードを自分の学習用作業領域で作成し、`pnpm exec tsx`で実行してください。既存の演習specは上書きしません。

```ts
const quantities = [2, 4];
const cart = { quantity: quantities[1] };
function label(quantity: number): string {
  return quantity >= 3 ? "上限を再確認" : "範囲内";
}
console.log(label(cart.quantity));
```

1. 実行前に出力を予測し、実行結果と比較します。
2. `quantities[1]`を`quantities[0]`へ変更した場合の出力を説明し、再実行します。
3. 関数の条件を変更し、引数・戻り値・分岐がどのように変わるか記録します。
4. `export`と`import`で関数を別の学習用ファイルから呼び、同じ結果になるか確認します。
5. 不正な型の引数を与えた場合のTypeScriptの診断と、業務Assertionが検証する対象の違いを説明します。

保存場所、実行コマンド、実行前の予測、変更した箇所、実行結果と予測との差、対応する理解ノードを`workspace/M05/submission.md`の「TypeScript短コード演習の実行・理解の記録」に記載します。未実行を実行済みと記載しないでください。新たな学習用ファイルは指定されたworkspaceだけで扱い、正式なspecや配布テンプレートを無断で変更しません。

## 反復実践 P01〜P06

手本の後、毎回予測・実行・変更・再実行を行い、コード・結果・理由を提出物に記録します。

1. **P01** 配列`[1,3,5]`の添字と`quantity`の変更を実行して結果を比較する（M05-01）。
2. **P02** `overLimit(current,add,limit)`で(2,1,3)、(2,2,3)、(0,3,3)を試し、`>`と`>=`の違いを調べる（M05-01）。
3. **P03** 関数の`import/export`、引数の型不一致、修正後の結果を確認する（M05-01・04）。
4. **P04** `practice-async.mjs`の`await`有無によるPromiseと結果値の違いを実行して比較する（M05-01・04）。
5. **P05** 実画面のrole/nameからLocatorを選び、表示と業務Assertionを区別する（M05-02・03）。
6. **P06** Locatorのbefore/after Runに加え、短コードの構文・型・実行の失敗を各1件調べる（M05-04・05）。

練習用ファイルは`workspace/M05/`内に保存し、既存の`pnpm exec tsx`等を使用します。製品コードとConfigは変更せず、実行していない内容は未実行と記録してください。
