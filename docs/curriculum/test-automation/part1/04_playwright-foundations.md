# Part 1-4: Playwright基礎

## 演習コマンドを読むための最低限

Playwrightを実行する前に、次のCLI / Node.jsの用語だけ確認します。一般的なCLI講座ではなく、Scenario Shopの演習を起動するための準備です。

- **ターミナル**: コマンドを入力して実行する画面です。
- **現在のディレクトリ**: コマンドを実行しているFolderです。相対Pathはここを起点に解決されます。
- **File / Directory**: `training/playwright/exercises`のように、Fileをまとめる場所をDirectoryと呼びます。
- **Node.js**: TypeScriptやPlaywrightを実行するRuntimeです。
- **Package Manager / pnpm**: DependencyをInstallし、`package.json`のScriptを実行するToolです。
- **`package.json` / `scripts`**: RepositoryのDependencyと、名前付きコマンドを定義するFile / 項目です。

演習では、RepositoryのRoot Directoryで次を実行します。

```bash
pnpm install
pnpm run training:web:baseline
```

`pnpm install`はDependencyを取得し、`pnpm run <script>`は`package.json`の`scripts`にある名前付きコマンドを実行します。成功したかどうかだけでなく、失敗時はError MessageのFile、行、Error Type、Expected / Receivedを確認します。`PLAYWRIGHT_BASE_URL`のようなEnvironment Variableは、Test対象の入口を指定する値です。

この段階の開始Gateは、Desktopの`training:web:baseline`が動くことです。Mobile Webの`training:web:mobile`は、P1-5でViewportとMobile Projectを学んだ後に確認します。

## 学習目標

- Playwrightを読み書きするために必要なJavaScript / TypeScriptの最小構文を理解できる。
- Playwrightの役割と基本構造を理解できる。
- `test`、`page`、Locator、Action、Assertionの関係を説明できる。
- Scenario Shopを対象に、最小のWeb UIテストを自分で書ける。
- `getByRole`、`getByLabel`、`getByText`、UI Test IDなどのLocatorを目的に応じて選べる。
- 固定待機ではなくPlaywrightのAuto-waitを基本として使える。
- テストが失敗した際に、Syntax Errorとテスト失敗を区別できる。

## 教材

**このモジュールでは、このリポジトリのScenario Shop Webアプリを使用します。**

主に次を参照します。

- [`docs/spec/features/cart.md`](../../../spec/features/cart.md)のBR / AC
- `playwright.training.config.ts`
- `training/playwright/baseline/`
- `training/playwright/exercises/`
- Scenario Shopの商品一覧・商品詳細・Cart

Formal `playwright.config.ts` と `e2e/web/phase1-required.spec.ts` は、演習後に設計を比較するためのFormal Regression教材です。

## このLessonのInput / Output

| 項目 | 受講者が確認・実施する内容 |
| --- | --- |
| Input | P1-3で作ったCaseの一覧と、P1-5で実装するCaseの条件・前提・期待結果。`TC-PRODUCT-001`や単純なCart追加は、構文を練習するために提供する別のSampleであり、P1-5のLearner Caseの完成答案ではない |
| Activity | JavaScript / TypeScriptの最小構文を読み、`test`、`page`、Locator、Action、Assertionの役割を小さな商品・Cart練習へ置き換える。Baselineを実行してTraining境界とErrorの読み方を確認する |
| Observation | Actionの後に画面がどう変わるか、Locatorがどの意味を対象にしているか、Assertionが何を保証するか、Syntax／Type／Runtime／Assertion Failureのどこで止まったか |
| Output | 自分で説明できる最小Test、Locator選択理由のメモ、P1-5へ渡すCase IDと実装方針。編集場所は自由で、受講者コードは完了時に`handoff-root/code/`へRepository相対Pathで集約する |
| Self-check | `import`、`async`／`await`、`page`、Locator、Assertionの役割を自分のコードで説明し、固定待機を避ける理由とTraining／Formalの境界を含める |
| Completion | Scenario Shopを対象に、starterをそのままPASS扱いせず、意味のあるLearner Testを1本以上書いて、P1-3のCaseをP1-5で実装するための条件とAssertion方針を説明できる。Test本数は単独条件にしない |
| Recovery | 構文・型の問題は該当Lesson 0へ戻り、実行中のFailureはRuntime、期待不一致はAssertionとして分類する。Browser／Base URL問題は環境として記録し、既存Formal Testへ直接追記して解決しない |
| Handoff | P1-5へ実装対象CaseのID、条件、前提、期待結果、Reset方法、Locator／Assertionの仮説を渡す。P1-5開始時にP1-3の複数Caseが残っていることを確認する |

## 演習コードの扱い

Desktop learner exerciseの互換commandは `pnpm run training:web:exercise` です。実行事実を評価へ渡すときのReceipt付き入口はP1-6で扱う `training:web:exercise:with-receipt` です。

このカリキュラムでは、受講者が最初から既存 `phase1-required.spec.ts` や他の正式Regressionへ追記することを前提にしません。

受講者用Playwright Testは、実装済みのTraining境界へ保存・実行します。具体的なPath、Project、Scriptは現在のリポジトリで固定されています。

```text
既存Regression
└ e2e/web/...

Training用
├ training/playwright/baseline/
├ training/playwright/exercises/
└ training/playwright/failure-exercises/
```

`playwright.config.ts` はFormal Regression専用です。Trainingは `playwright.training.config.ts` の `training-chromium` / `training-mobile-chromium`だけを使います。Training specを `e2e/web/`へ追加してはいけません。

### 最初のLearner specを作る場所

Starterの`training/playwright/exercises/training-exercise-starter.spec.ts`は、Resetとページ遷移の構造を読むための足場です。P1-3で作ったCaseを実装するときは、Starterを完成答案に書き換えず、`training/playwright/exercises/<自分のCaseを表す名前>.spec.ts`という新しいFileを作ります。Test titleまたは既存annotation／metadataへ自分のTest Case IDを残し、`03_automation-mapping.csv`の`implementation_path`へ同じRepository相対Pathを記録します。

実装の順番は、`resetScenario` → 対象画面を開く → 操作する → 期待結果をAssertionする、です。最初の実行は `pnpm run training:web:exercise -- --project=training-chromium` で行い、Browser未InstallやBase URL不通ならコードのFailureと混同せず、P1-4の開始環境を直します。実行結果を正式な学習記録へ渡す方法はP1-6のReceipt付きcommandで扱います。

受講者は `PLAYWRIGHT_BASE_URL` をこのworktreeのRuntimeへ設定し、`pnpm run training:web:baseline`でDesktopの基準確認を行います。未指定時のfallbackは `127.0.0.1:8082`で、8081 / 8083を再利用しません。Mobile Webの基準確認と`training:web:mobile`はP1-5で扱います。

## Lesson 0: Playwrightを書くためのJavaScript / TypeScript最小知識

このカリキュラムでは、JavaScript / TypeScript全体を先に学習することを求めません。

PlaywrightのTestを読み書きするために必要な範囲から学び、必要になった構文をその都度追加します。

### 変数と文字列

```ts
const productName = "対象商品の表示名";
```

`const` は、後から別の値へ代入しない変数を宣言します。

### ObjectとProperty

```ts
const user = {
  email: "regular@example.com",
  role: "customer",
};
```

PlaywrightのOptionやTest DataではObjectを頻繁に使います。

### `async` / `await`

Browser操作は完了まで時間がかかるため、Playwrightでは非同期処理を扱います。

```ts
await page.goto("/products");
await page.getByRole("button", { name: "対象操作" }).click();
```

最初はPromiseの内部実装を理解する必要はありません。

**「Browser操作の完了を待ってから次へ進めるために `await` を付ける」**ところから理解します。

### `import`

```ts
import { test, expect } from "@playwright/test";
```

別Moduleが提供している機能を現在のFileで利用します。

### `{ page }` の意味

```ts
test("商品を確認する", async ({ page }) => {
  // ...
});
```

`page` はPlaywright Testが用意するBrowser Pageです。

`{ page }` はObjectから `page` Propertyを取り出すDestructuringです。最初は「TestがBrowser操作用のPageを受け取っている」と理解できれば十分です。

### アロー関数とコールバック

`test`の第2引数へ渡す`async ({ page }) => { ... }`は、テストが実行されたときに呼び出されるコールバックです。関数名を別に付けず、処理をその場へ書けます。

```ts
test("商品を確認する", async ({ page }) => {
  await page.goto("/products");
});
```

まずは「`test`へ、テスト本体を後で実行する関数を渡している」と理解すれば十分です。配列、条件分岐、汎用関数、型注釈などは、それらを使うLessonで必要な範囲だけ扱います。

### Error Messageを読む

コードが動かなかった場合は、まず次を区別します。

- Syntax / Type Error: コード自体を解釈・型確認できない。
- Runtime Error: 実行中の処理が失敗した。
- Playwright Assertion Failure: 実際の状態が期待結果と一致しなかった。

エラー全文を読まずに書き直すのではなく、File、Line、Error Type、Expected / Receivedを確認する習慣を付けます。

## Lesson 1: Playwrightとは

PlaywrightはBrowserを操作し、Web UIを自動テストするためのFrameworkです。

基本構造は次です。

```ts
import { test, expect } from "@playwright/test";

const productName = "対象商品の表示名";

test("商品詳細を表示できる", async ({ page }) => {
  await page.goto("/products/<product-id>");
  await expect(page.getByRole("heading", { name: productName })).toBeVisible();
});
```

このSnippetの具体的な商品ID、表示名、操作名は期待挙動の定義ではありません。実装前に正式な仕様と対象Scenarioを確認し、Workbookへ対応付けます。

このコードには次の要素があります。

- Test Case
- Browser Page
- Navigation
- Locator
- Assertion

## Lesson 2: ActionとAssertion

Actionは操作です。

例:

- `goto`
- `click`
- `fill`
- `check`
- `selectOption`

Assertionは期待結果の確認です。

例:

- `toBeVisible`
- `toHaveText`
- `toContainText`
- `toHaveURL`
- `toBeDisabled`

テストコードでは、操作したことではなく「何が正しければPassか」を明確にします。

## Lesson 3: Locator

Locatorは壊れにくさと意味の分かりやすさを重視します。

候補は固定順位で暗記せず、対象の意味と安定性から選びます。ユーザーが認識するRole、Label、Text、明示されたUI Test IDを確認し、CSS Selectorなどはより意味のある契約がない場合に使います。

例:

```ts
page.getByRole("button", { name: "対象操作" });
page.getByLabel("数量");
```

CSS ClassやDOM構造へ強く依存するLocatorは、見た目のRefactorで壊れやすくなる可能性があります。

ただし、Roleが常に唯一の正解というわけではありません。Nativeとの共通識別や動的要素ではstable UI Test IDが有効な場合もあります。

## Lesson 4: Auto-wait

PlaywrightはLocator ActionやAssertionで必要な状態を待機します。

そのため、次のような固定待機を基本戦略にしません。

```ts
await page.waitForTimeout(3000);
```

代わりに、意味のある状態を待ちます。

```ts
await expect(page.getByRole("status")).toContainText("カートへ追加しました");
```

学習者は「待つ秒数」ではなく「何の状態になれば次へ進めるか」を考えます。

## Lesson 5: 最初のテストを書く

Training用specへ次を自分で実装します。

1. 商品詳細を開く。
2. 商品名を確認する。
3. Variationを選択する。
4. Cartへ追加する。
5. 成功メッセージを確認する。

最初はHelperやPOMを作りません。1つのspec内へ素直に書きます。

## Lesson 6: 既存コードと比較する

自分のテスト完成後、`e2e/web/phase1-required.spec.ts` のGuest商品操作を確認します。

比較観点:

- Locatorは何を使っているか。
- Assertionはどこにあるか。
- 画像読み込みも確認しているのはなぜか。
- Seed Scenario Resetがあるのはなぜか。
- 自分のテストと比べて何が不足しているか。

この段階では既存コードを完全に模倣する必要はありません。

## Lesson 7: Playwright Configを読む（P1-6への導入）

`playwright.config.ts` を読み、次を確認します。

- `testDir`
- `timeout`
- `expect.timeout`
- `retries`
- `projects`

設定値を暗記するのではなく、「なぜこのリポジトリではその設定が必要か」を考えます。`reporter`、`trace`、`screenshot`、`video`は、実行結果と失敗時の記録を扱うP1-6で詳しく確認します。

さらに、現行Projectの `testMatch` やPackage Scriptが既存Suiteを対象としていることを確認し、Training用実行境界を正式Regressionから分ける理由を理解します。

## ハンズオン1: TypeScript最小コードを読む

短いPlaywright Testを使い、次を指し示せるようにします。

- `import`
- `test`
- `async`
- `await`
- `page`
- Locator
- Assertion

構文を暗記するのではなく、それぞれがテストのどの役割を担うか説明します。

## ハンズオン2: 商品詳細

Test Case ID `TC-PRODUCT-001` を想定し、商品詳細表示を確認するテストを書きます。

## ハンズオン3: Cart追加

Workbookの代表Caseとは別の導入練習として、Variation選択からCart追加までを書きます。ここでは`TC-CART-001` / `TC-CART-002`を付けず、PlaywrightのActionとAssertionの読み書きに集中します。

## ハンズオン4: Locator改善

意図的に不安定なCSS Selectorで書いたLocatorを、Role / Label / UI Test IDなどへ改善します。

## 確認問題

1. `async` / `await` はPlaywrightで何のために使うか。
2. `{ page }` は何を受け取っているか。
3. ActionとAssertionの違いは何か。
4. LocatorをCSS Classだけに依存するとどんなRiskがあるか。
5. `waitForTimeout`を基本戦略にしない理由は何か。
6. `toBeVisible`は何を保証し、何を保証しないか。
7. Playwright Configの`retries`を増やせばFlaky問題は解決するか。
8. Training用specと正式Regressionを分離する理由は何か。

## 自己確認

### 回答の最低判定基準

- `async` / `await`をBrowser操作の完了待ち、`{ page }`をTestが受け取るBrowser Pageとして説明している。
- ActionとAssertionを「操作」と「何が正しければPassか」に分け、`toBeVisible`が対象の可視性だけを保証することを説明している。
- Locatorの選択理由に、Role / Label / UI Test IDなど対象の意味と、CSS構造依存の保守Riskを含めている。
- `waitForTimeout`ではなく意味のある状態を待つ理由を説明し、固定待機を使わない1例を書ける。
- `retries`が根本原因の修正ではないこと、Syntax / Type、Runtime、AssertionのFailureを区別している。
- Training specとFormal Regressionを分離する理由として、実行範囲と既存Suiteの品質境界を説明している。

### Recovery

構文が読めない場合は該当するLesson 0の小節へ戻り、`import` → `test` → `page` → Locator → Assertionの役割を指差し確認します。Testが起動しない場合はSyntax / Type Error、実行中の失敗はRuntime、期待不一致はAssertionとしてエラー全文を分類し、Browser / Base URLの問題は環境上の問題として分けます。

## 完了条件

- Playwright Test内の `import`、`async`、`await`、`page`、Locator、Assertionの役割を説明できる。
- Scenario Shopを対象に、意味のあるlearner-authored Playwright TestをTraining境界へ書いている。
- 対象の意味に合うRole / Label / UI Test IDなどのLocatorを利用している。
- 固定待機に頼らずAssertionで状態を待てる。
- Training用実行境界と既存Regressionの役割を説明できる。
- 自分のコードと既存E2Eの違いを3点以上説明できる。

練習量の目安として2本以上のTestを書いてもよいが、本数だけでは修了としません。

## 次の行動

[Part 1-5: Playwright E2E実践](./05_playwright-e2e-practice.md)へ進み、設計したCart CaseをReset可能なTraining E2Eへ接続します。
