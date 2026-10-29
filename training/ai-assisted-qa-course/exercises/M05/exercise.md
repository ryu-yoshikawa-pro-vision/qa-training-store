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

## 反復実践：違う入力・違う失敗を自分で直す（P01〜P06）

既存の短コードの添字変更と`product-link.spec.ts`のLocator修正は**一度だけ行う基礎実習**として残します。以下は新しい入力・誤りと、その修正の前後を独立して確かめる課題です。新規練習ファイルは`workspace/M05/`内だけへ保存し、現行Shop・配布Config・固定specは変更しません。各課題で「予測→実際の出力→修正後の出力」を残します。

1. **P01 配列と参照の違い（M05-01）**：`const items = [{qty:1},{qty:2}]; const first = items[0]; first.qty = 4;`を学習用スクリプトで実行します。`items[0].qty`と`items[1].qty`の出力を予測し、次に`const copy = {...items[0]}; copy.qty = 5;`を追加して、元の値が変わるか検証します。**証拠**：2回の出力と参照/コピーの説明。
2. **P02 境界と関数をテストする（M05-01）**：`canAdd(current:number,add:number,stock:number,limit:number)`を作り、合計が`min(stock,limit,99)`以下なら許可する関数を実装します。**仮想データ**(1,1,3,5)、(2,2,3,5)、(0,3,3,5)、(2,0,3,5)を実行し、追加0と数量0への更新を混同しないようにします。**証拠**：入力→予測→出力→修正した分岐。
3. **P03 失敗の種類を見分ける（M05-04）**：P02の学習用コピーに、閉じ括弧不足（構文）、文字列をnumberに渡す（型）、定義していない変数を参照する（実行時）のいずれかを**別々に**作ります。型は`pnpm exec tsc --noEmit`など教材で利用できる型検査経路を確認し、`tsx`実行だけでは型検査にならないことを説明します。**証拠**：各診断の実メッセージと修正前後。
4. **P04 非同期の実際の順序（M05-01・04）**：`Promise.resolve("ready")`を返す関数を作り、戻り値そのものを記録した場合と`await`後の値を記録した場合を実行します。さらに待機を入れない場合でも処理順序をどう説明できるか、自分で予測します。**証拠**：実際の表示順・Promiseか値か・修正理由。
5. **P05 新しいLocator候補を比較（M05-02・03）**：実ShopのCart画面で数量selectと削除buttonを調べ、role/name・label・表示文字列のどれを使うか比較します。削除は**実行せず**、一意性と対象商品への範囲指定を考えて、安全なAssertion案を作ります。既定のMugリンクLocatorとは別の操作対象を選びます。**証拠**：選んだLocator・曖昧な候補・業務Assertion。
6. **P06 AIからの弱い修正を棄却（M05-02〜05）**：架空AI案「商品詳細へのリンクが見つからないので`expect`を削除し、クリックだけ成功すればPASS」と、架空案「`waitForTimeout(5000)`を追加」を、既存のbefore/after Runと比較します。どちらが不適切で、どういう観測が必要か説明します。**証拠**：不採用理由、保つべきAssertion、実RunのSHA。

**完了確認**：P01〜P04は実行した新規スクリプトの出力を残し、P05/P06は既存Locator修正の再掲ではなく別の要素・別の判断を記録します。練習用短コードの出力をPlaywrightの`course:run`と混同しません。


### 固定Skillと本人の判断

固定Skillの`e2e-test-inspection`を使える場合は、P05のLocator候補と実画面・失敗Runを入力して検査し、修正の必要性を本人が判断します。`e2e-test-implementation`に変更案を依頼するときは`workspace/M05/product-link.spec.ts`以外の書込みを禁止し、差分・前後のRunで検証します。起動していないSkillやAIの自己申告を実行証拠に含めません。
