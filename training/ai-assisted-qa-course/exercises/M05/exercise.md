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
3. **P03 失敗の種類を見分ける（M05-04）**：P02の学習用コピーに、閉じ括弧不足（構文）、文字列をnumberに渡す（型）、定義していない変数を参照する（実行時）のいずれかを**別々に**作ります。型エラー用の独立したファイル`workspace/M05/p03-type-error.ts`を作り、`pnpm exec tsc --ignoreConfig --noEmit --strict --skipLibCheck --target ES2022 --module NodeNext --moduleResolution NodeNext workspace/M05/p03-type-error.ts`で**対象ファイルを明示して**検査します。TypeScript 6.0.3の`--ignoreConfig`はルートの`tsconfig.json`を読み込まず、指定ファイルを検査するために必要です（省略すると`TS5112`になります）。ルートの`pnpm exec tsc --noEmit`だけでは`tsconfig.json`の`include`に`workspace/**`がなく、この練習ファイルを検査した証拠になりません。`tsx`実行だけでも型検査になりません。誤った型を渡した時の非0終了と診断、修正後の0終了を別々に保存し、構文・実行時エラーのファイルは混ぜません。**証拠**：各診断の実メッセージと修正前後。
4. **P04 非同期の実際の順序（M05-01・04）**：`Promise.resolve("ready")`を返す関数を作り、戻り値そのものを記録した場合と`await`後の値を記録した場合を実行します。さらに待機を入れない場合でも処理順序をどう説明できるか、自分で予測します。**証拠**：実際の表示順・Promiseか値か・修正理由。
5. **P05 新しいLocator候補を比較（M05-02・03）**：`default`のguest Cartは初期状態で空なので、公開商品`product-mug`と`product-low-stock`を実Shopの画面から各1点追加して2明細を用意します。Cartの数量selectと削除buttonについてrole/name・label・表示文字列の候補を比較し、**Cart全体では各2件となる曖昧さ**を実行で確認します。商品名リンクを含む明細へ範囲を絞り、数量selectと削除buttonがそれぞれ1件であること、対象数量が1であることをread-only Assertionで確認します。**削除は実行しません**。同じ商品名で複数SKUがある場合は商品名だけでは一意にならないため、SKU等の追加条件を検討します。既定のMugリンク修正とは別の操作対象を扱います。**証拠**：初期化・2商品の追加、全体と明細内のLocator件数、範囲指定の根拠、数量Assertion、削除未実行、実Run/SHA。
   **P05の実Run証拠（正式評価で必須）**：学習者が`workspace/M05/p05-cart-locator.spec.ts`へP05専用のPlaywright specを作成し、2明細の準備、一意のLocator、数量Assertion、削除ボタンを押していないことを検証します。基礎演習の`product-link.spec.ts`は変更しません。

   ```bash
   pnpm course:run M05 p05-cart-locator.spec.ts --label main
   ```

   `course:run`が保存する異なるRun ID、`run-evidence.json`、spec snapshot、JSON report、`source_sha`、tests 1件以上のPASSを照合してください。Playwrightを直接実行した結果だけでは正式採点の証拠になりません。固定SHAが異なる、receiptやreportがない、0件・skip・別spec・重複した必須条件のRunは未達とします。

6. **P06 AIからの弱い修正を棄却（M05-02〜05）**：架空AI案「商品詳細へのリンクが見つからないので`expect`を削除し、クリックだけ成功すればPASS」と、架空案「`waitForTimeout(5000)`を追加」を、既存のbefore/after Runと比較します。どちらが不適切で、どういう観測が必要か説明します。**証拠**：不採用理由、保つべきAssertion、実RunのSHA。

### P05/P06：表示・業務結果・保存の保証範囲（M05-03）

P05で2商品の追加を確認したら、次の判断を**別々**に書いてください。完成見本の実行結果を本人の実Runに換算せず、Resetした対象Browser Contextと同じRunに紐付けます。

- 追加ボタンの可視性・クリック成功：Cartの数量や保存はまだ未確認。
- 追加通知の表示：通知の発生は確認できても、商品・SKU・数量が一致した証拠ではない。
- Cartの2明細を確認し、対象Mugの明細へscopeした数量`select`が`1`：**その画面時点**の表示内容は確認。別のSKUを誤検証していないか、商品名リンクと明細件数を照合する。
- 再読み込み後に同じ明細と数量を再確認する場合：同じBrowser Contextで画面上の状態が保持されたことは確認できるが、IndexedDBの`carts`/`cart_items`を直接読んだ証拠や、外部DB・注文テーブルへの保存証拠ではない。直接保存状態を調べていない場合は未確認とする。
- P06の架空AI案のように、`expect`を削ってクリックだけでPASSにしたり、追加通知を残しただけで保存成功と報告する案は棄却する。

Cart明細の検証は**削除操作を行わず**read-onlyにします。直接DB確認が必要なら対象の識別子、Browser Context、データ保護範囲を事前に決めて実施し、P05の必須項目ではない直接DB検査を実施したことにしません。どのAssertionがどの保証範囲を持つかを提出欄へ記録してください。

### P03・P04・P06：失敗と自動待機を比較する（M05-04）

M05教本の「Web-first assertion・Actionの自動待機と失敗の区別」を参照し、**実際に実行したコマンドと結果**を対応付けます。以下のファイルは本人が`workspace/M05/`に作る学習用コピーであり、配布済みの`product-link.spec.ts`を上書きしません。

1. **構文**：`p03-syntax-error.mjs`へ閉じ括弧不足を一つだけ作り、`node --check workspace/M05/p03-syntax-error.mjs`の最初のエラーと非0終了を記録します。閉じ括弧を直して同じコマンドを再実行します。テストが始まる前のエラーを「業務FAIL」にしません。
2. **型**：P03の`p03-type-error.ts`を`pnpm exec tsc --ignoreConfig --noEmit --strict --skipLibCheck --target ES2022 --module NodeNext --moduleResolution NodeNext workspace/M05/p03-type-error.ts`で検査します。文字列を`number`に渡す誤りと修正後を別々に確認します。`tsx`で動いたことは型検査の成功を意味しません。
3. **実行時**：`p03-runtime-error.mjs`で存在しない値のプロパティを参照する例を一つ作り、`node workspace/M05/p03-runtime-error.mjs`の`TypeError`や行番号を記録して修正します。環境や入力が異なれば例外名も確認し、想定だけで埋めません。
4. **非同期と自動待機**：P04の`Promise.resolve("ready")`を`await`する前後の値をNode.jsで比較し、Playwrightの`locator.click()`が操作可能状態を待つ仕組み、`await expect(locator).toHaveText(...)`が期待値を再試行する仕組みとの**違い**を自分で説明します。NodeのPromise実験はPlaywright実行を証明しません。
5. **Locator・Assertion**：`product-link.spec.ts`のbefore/afterで「対象リンクの名前が違うため見つからない」実行結果と、リンク先hrefのAssertionを比較します。P05の2明細では`getByRole("button", { name: "削除", exact: true })`が全体で2件になることを**read-onlyの`toHaveCount(2)`で確認**します。一意な要素を必要とする操作は商品明細へscopeし、検証目的で削除ボタンをクリックしません。
6. **根拠のない固定待機**：失敗時に`page.waitForTimeout(5000)`を追加しても、Locator名の誤り、重複、業務Assertionの期待値誤りを解決しないことを、実際の失敗メッセージと対比して説明します。不要な固定待機やAssertion削除でPASSを作りません。

終了コードは**各コマンド直後**に`echo $?`で読み、診断の最初の行、ファイル、修正前後、Playwrightなら別`run_id`・`spec_sha256`・reportを提出欄へ記載してください。ここでの構文・型・実行時の独立コードを通しても、M05の専用8082実ChromiumやCart業務AssertionがPASSしたことにはなりません。

### P05の新規specを専用Configで実行する

P05で本人が作成する`workspace/M05/p05-cart-locator.spec.ts`は、初期配布の`product-link.spec.ts`とは別の練習ファイルです。本PR #215の追跡版`course:run`が受け付けるM05のspecは`product-link.spec.ts`のみであり、P05の新規spec名は拒否されます。一方、#199の最新base側ではP05も許可対象（`p05-cart-locator.spec.ts`）に追加されています。**統合採用HEADで実際に利用できる入口を確認してください。拒否をPlaywright成功と扱わず、直接実行のJSON/終了コードを`course:run`のreceiptとして読み替えないでください。P05の受入は使用した実行経路ごとの証拠で判定します。**

P05では本人のspecが存在することを確認し、以下のとおり**新課程専用Config**でそのspecだけを直接実行します。まず`pnpm course:load M05`で教材をロードし、実Shopの画面で実際のRole/Name/Labelと削除ボタン数を確認してから自分でテストを書きます。完成見本を丸写しにして学習達成としません。

`workspace/M05/p05-cart-locator.spec.ts`は本人が新規作成します。共通Resetは`workspace/M05`からの相対パスで読み込みます。以下は未完成の入口だけで、正解LocatorやAssertionは含みません。**TODOエラーを削除しただけでは実技達成になりません。** 商品の追加と2明細の業務Assertionを自分で実装します。

```ts
import { test } from "@playwright/test";
import { resetScenario } from "../../training/playwright/support/reset-scenario";

test("M05 P05: 2明細の数量と削除操作対象を識別する", async ({ page }) => {
  await resetScenario(page, "default");
  // TODO: 公開商品2件をCartへ追加し、数量と削除操作対象を明細ごとに確認する
  throw new Error("TODO: P05のLocatorと業務Assertionが未実装です");
});
```

```bash
p05_spec=workspace/M05/p05-cart-locator.spec.ts
test -f "$p05_spec" && test ! -L "$p05_spec" || {
  echo "本人のP05 specがありません、またはsymlinkです: $p05_spec"; exit 1;
}
mkdir -p workspace/M05/evidence
p05_output="$(mktemp -d workspace/M05/evidence/p05-direct-XXXXXX)" || exit 1
cp -- "$p05_spec" "$p05_output/spec-snapshot.ts" || exit 1
p05_before_sha="$(sha256sum "$p05_output/spec-snapshot.ts" | cut -d ' ' -f 1)"
p05_current_sha="$(sha256sum "$p05_spec" | cut -d ' ' -f 1)"
test "$p05_before_sha" = "$p05_current_sha" || {
  echo "実行前にspecが変更されました。再取得してください"; exit 1;
}
p05_exit=0
PLAYWRIGHT_TEST_ROOT=workspace/M05 \
  AI_QA_OUTPUT_ROOT="$p05_output" \
  pnpm exec playwright test p05-cart-locator.spec.ts \
    --config=playwright.ai-assisted-qa.config.ts \
    --project=ai-assisted-qa-chromium --retries=0 \
    > "$p05_output/console.log" 2>&1 || p05_exit=$?
p05_after_sha="$(sha256sum "$p05_spec" | cut -d ' ' -f 1)"
cat "$p05_output/console.log"
printf 'exit_code=%s\noutput_root=%s\nspec_sha256=%s\n' \
  "$p05_exit" "$p05_output" "$p05_before_sha"
test "$p05_before_sha" = "$p05_after_sha" || {
  echo "実行中にspecが変更されました。この結果は採用できません"; exit 1;
}
test -s "$p05_output/playwright-result.json" && \
  test ! -L "$p05_output/playwright-result.json" || {
    echo "Playwright JSON reportがありません、または不正です"; exit 1;
  }
test "$p05_exit" -eq 0 || {
  echo "Playwrightが非0で終了したためP05は未達です"; exit 1;
}
node - "$p05_output/playwright-result.json" "$p05_spec" <<'NODE'
const fs = require("node:fs");
const path = require("node:path");
const report = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const targetSpec = path.resolve(process.argv[3]);
const expectedRoot = path.dirname(targetSpec);
const reportRoot = report.config?.rootDir;
if (typeof reportRoot !== "string" || path.resolve(reportRoot) !== expectedRoot) {
  throw new Error("Playwright JSON reportのrootDirが対象specのディレクトリと一致しません");
}
const tests = [];
function visit(suite) {
  for (const spec of suite.specs ?? []) {
    // Playwright JSON reporter serializes spec.file relative to config.rootDir.
    if (typeof spec.file !== "string" || path.resolve(reportRoot, spec.file) !== targetSpec) {
      throw new Error("別のspecがreportへ混入しました: " + String(spec.file));
    }
    for (const test of spec.tests ?? []) {
      tests.push({
        title: spec.title,
        expected: test.expectedStatus,
        actual: test.results?.at(-1)?.status,
      });
    }
  }
  for (const child of suite.suites ?? []) visit(child);
}
for (const suite of report.suites ?? []) visit(suite);
if (tests.length === 0 || tests.some((test) => test.actual !== "passed" || test.expected !== "passed")) {
  throw new Error("P05の対象testが0件、未実行、またはPASS以外です: " + JSON.stringify(tests));
}
console.log("P05対象test件数=" + tests.length + "、全件PASS");
NODE
```

`$p05_output/spec-snapshot.ts`は実行前に保存した本人specのコピーです。実行直前と直後のspec SHA-256がそのコピーと一致することを確認します。不一致なら、そのJSON reportを該当specの成功証拠として採用しません。`$p05_output/playwright-result.json`の対象test名・件数・結果、実行前後の画面、必要なTrace/画像、spec SHA-256、終了コードを提出欄へ記録します。Playwrightの終了コードが非0、reportがない、対象testが一致しない場合はPASS扱いしません。成功した場合でも、これは`course:run`が生成する`run-evidence.json`（Run ID、`source_sha`等）とは**別の直接実行**です。後で正式なRunが必要な項目の代用にせず、受入側では取得方法の違いを明示します。

**完了確認**：P01〜P04は実行した新規スクリプトの出力を残し、P05/P06は既存Locator修正の再掲ではなく別の要素・別の判断を記録します。練習用短コードの出力をPlaywrightの`course:run`と混同しません。

### 固定Skillと本人の判断

固定Skillの`e2e-test-inspection`を使える場合は、P05のLocator候補と実画面・失敗Runを入力して検査し、修正の必要性を本人が判断します。`e2e-test-implementation`に変更案を依頼するときは、既存Locatorの課題では`workspace/M05/product-link.spec.ts`だけ、P05の新規Cart明細課題では`workspace/M05/p05-cart-locator.spec.ts`だけを編集対象に指定します。両方の依頼で他方のspec・製品コード・Configの変更を禁止し、提案を本人が実画面と仕様で確認した後、実行結果と差分を検証します。起動していないSkillやAIの自己申告を実行証拠に含めません。
