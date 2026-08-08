# Part 1-4: Playwright基礎

## 学習目標

- Playwrightの役割と基本構造を理解できる。
- `test`、`page`、Locator、Action、Assertionの関係を説明できる。
- Scenario Shopを対象に、最小のWeb UIテストを自分で書ける。
- `getByRole`、`getByLabel`、`getByText`、Test IDなどのLocatorを目的に応じて選べる。
- 固定待機ではなくPlaywrightのAuto-waitを基本として使える。
- テストが失敗した際に、Syntax Errorとテスト失敗を区別できる。

## 教材

**このモジュールでは、このリポジトリのScenario Shop Webアプリを使用します。**

主に次を参照します。

- `playwright.config.ts`
- `e2e/web/`
- Scenario Shopの商品一覧・商品詳細・Cart

既存の `phase1-required.spec.ts` は最初の演習後に比較対象として読みます。

## 演習コードの扱い

このカリキュラムでは、受講者が最初から既存 `phase1-required.spec.ts` や他の正式Regressionへ追記することを前提にしません。

教材提供時には、受講者用Playwright Testを既存Regressionから分離して保存・実行できるTraining境界を用意します。

例えば次のような概念上の分離を想定しますが、具体的なPath、Project名、Script名は教材実装時にRepositoryの最新構成へ合わせて確定します。

```text
既存Regression
└ e2e/web/...

Training用
└ 受講者専用spec領域
```

現行 `playwright.config.ts` と `package.json` は既存Suiteを実行するための設定です。この文書整備だけでTraining用ProjectやScriptを追加したものとは扱いません。

受講者は、用意されたTraining実行入口で自分のTestを実行し、演習完了後に既存Regressionと比較します。

## Lesson 1: Playwrightとは

PlaywrightはBrowserを操作し、Web UIを自動テストするためのFrameworkです。

基本構造は次です。

```ts
import { test, expect } from "@playwright/test";

test("商品詳細を表示できる", async ({ page }) => {
  await page.goto("/products/product-basic-shirt");
  await expect(page.getByRole("heading", { name: "ベーシックTシャツ" })).toBeVisible();
});
```

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

優先候補として次を学びます。

1. Role
2. Label
3. Text
4. Test ID
5. CSS Selectorなど

例:

```ts
page.getByRole("button", { name: "カートに追加" });
page.getByLabel("数量");
```

CSS ClassやDOM構造へ強く依存するLocatorは、見た目のRefactorで壊れやすくなる可能性があります。

ただし、Roleが常に唯一の正解というわけではありません。Nativeとの共通識別や動的要素ではstable Test IDが有効な場合もあります。

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
- Scenario Resetがあるのはなぜか。
- 自分のテストと比べて何が不足しているか。

この段階では既存コードを完全に模倣する必要はありません。

## Lesson 7: Playwright Configを読む

`playwright.config.ts` を読み、次を確認します。

- `testDir`
- `timeout`
- `expect.timeout`
- `retries`
- `reporter`
- `trace`
- `screenshot`
- `video`
- `projects`

設定値を暗記するのではなく、「なぜこのRepositoryではその設定が必要か」を考えます。

さらに、現行Projectの `testMatch` やPackage Scriptが既存Suiteを対象としていることを確認し、Training用実行境界を正式Regressionから分ける理由を理解します。

## ハンズオン1: 商品詳細

Test ID `PRODUCT-001` を想定し、商品詳細表示を確認するテストを書きます。

## ハンズオン2: Cart追加

Test ID `CART-001` を想定し、Variation選択からCart追加までを書きます。

## ハンズオン3: Locator改善

意図的に不安定なCSS Selectorで書いたLocatorを、Role / Label / Test IDなどへ改善します。

## 確認問題

1. ActionとAssertionの違いは何か。
2. LocatorをCSS Classだけに依存するとどんなRiskがあるか。
3. `waitForTimeout`を基本戦略にしない理由は何か。
4. `toBeVisible`は何を保証し、何を保証しないか。
5. Playwright Configの`retries`を増やせばFlaky問題は解決するか。
6. Training用specと正式Regressionを分離する理由は何か。

## 完了条件

- Scenario Shopを対象にPlaywright Testを2本以上書いている。
- Role / Labelを使ったLocatorを利用している。
- 固定待機に頼らずAssertionで状態を待てる。
- Training用実行境界と既存Regressionの役割を説明できる。
- 自分のコードと既存E2Eの違いを3点以上説明できる。
