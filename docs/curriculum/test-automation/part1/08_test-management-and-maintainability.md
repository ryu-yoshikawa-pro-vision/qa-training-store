# Part 1-8: テスト管理と保守性改善

## 学習目標

- 自動テストが増えた運用フェーズで起きる問題を整理できる。
- テストケース、spec、Test Data、Scenario、共通処理の管理方法を考えられる。
- Helper、Page Object Model、Component Object、Fixture、Flow、Scenarioの役割を区別できる。
- POMを必須ルールではなく、保守上の課題を解決する選択肢として判断できる。
- 重複、Flaky、実行時間、不要テスト、責務の混在を改善できる。
- スプレッドシート上のTest Caseとコード上のRegression資産を対応付けて管理できる。

## 教材

**このモジュールでは、このリポジトリの既存Playwright / Maestroテストを使用します。**

主な参照先:

- `e2e/web/phase1-required.spec.ts`
- `e2e/web/fixtures.ts`
- `e2e/web/ui-ux-improvements.spec.ts`
- `e2e/web/cross-role-lifecycle.spec.ts`
- `maestro/`
- `src/seeds/metadata.ts`
- `playwright.config.ts`

このモジュールへ進む時点で、受講者自身も複数のPlaywright TestとMaestro Flowを作成済みであることを前提とします。

## Lesson 1: 運用フェーズで当たる壁

テストが数本の間は、1ファイルへ直接書いても大きな問題になりません。

しかし本数が増えると、次の問題が現れます。

- Login処理が何度も重複する。
- 商品選択やCheckout操作が何度も重複する。
- Locator変更で多くのテストを直す必要がある。
- Test Dataの作り方がテストごとに異なる。
- どのspecに何があるか分かりにくくなる。
- 同じ目的のテストが重複する。
- RegressionとSmokeの境界が曖昧になる。
- Flakyなテストが放置される。
- 実行時間が増える。
- 削除してよいテストか判断しづらい。

ここで初めて「テスト資産をどう管理するか」を考えます。

## Lesson 2: テストケース管理

スプレッドシートのTest IDと実装を照合します。

確認すること:

- 未自動化なのにAutomated扱いになっていないか。
- 同じRiskを複数E2Eが重複して確認していないか。
- 仕様変更で不要になったCaseが残っていないか。
- Regressionとして継続価値があるか。
- Web / Android / iOSの対応関係が分かるか。

テスト管理は「本数を増やすこと」ではなく、必要な保証を維持することです。

## Lesson 3: specの分け方

ファイル分割は画面名だけで機械的に決めません。

候補:

- Feature単位
- User Journey単位
- Role単位
- Test Type単位

Scenario Shopの既存 `phase1-required.spec.ts`、`accessibility.spec.ts`、`mobile-boundary.spec.ts`、`cross-role-lifecycle.spec.ts` を比較し、なぜ分かれているか考えます。

## Lesson 4: Helper

小さく独立した共通操作ならHelperで十分な場合があります。

既存 `fixtures.ts` の `login` や `addDefaultAddress` を題材にします。

Helperの利点:

- 単純
- 導入コストが低い
- 呼び出しが分かりやすい

Risk:

- Helperが増えすぎると責務が分からなくなる。
- UI要素、業務Flow、Test Data準備が同じHelperへ混在しやすい。

## Lesson 5: Page Object Model

POMはPageごとのUI操作やLocatorをまとめる方法の一つです。

例:

```ts
class ProductPage {
  constructor(private readonly page: Page) {}

  async selectSize(name: string) {
    await this.page.getByRole("button", { name }).click();
  }

  async addToCart() {
    await this.page.getByRole("button", { name: "カートに追加" }).click();
  }
}
```

POMが有効になりやすい条件:

- 同じPage操作を多くのテストで再利用する。
- Locator変更を局所化したい。
- Pageの操作語彙を明確にしたい。

POMが不要または過剰になりやすい条件:

- 再利用がほとんどない。
- TestよりObjectの抽象化の方が複雑になる。
- AssertionやBusiness Flowまで何でもPage Objectへ詰め込む。

## Lesson 6: Component Object

Header、Navigation、Modal、Product Cardなど、Pageを跨いで再利用されるUIはComponent Objectとして扱う選択肢があります。

Page Objectだけで全UIを表現しようとすると、Page間で共通Componentが重複する可能性があります。

## Lesson 7: Fixture

Fixtureはテスト実行環境や前提状態を提供するために使えます。

既存 `scenario` Fixtureを教材にし、次を確認します。

- Test Data Reset
- Page cleanup
- Metadata確認
- Console Error収集

Fixtureへ何でも入れると、Testから前提処理が見えなくなるRiskがあります。

「多くのTestに必要な環境・前提」なのか、「そのTestだけの業務操作」なのかを分けます。

## Lesson 8: Flow

複数Pageを跨ぐ業務操作はFlowとして切り出す選択肢があります。

例:

```text
Purchase Flow
Login
↓
Cart
↓
Address
↓
Payment
↓
Confirm
```

Page ObjectはUI操作を表し、Flowは複数Pageを跨ぐ業務操作を表す、と分離できます。

ただし、小規模なケースではHelperだけで十分な場合もあります。

## Lesson 9: Scenario / Test Data

ScenarioはUI操作の共通化ではなく、テスト開始状態の管理です。

Scenario Shopでは `src/seeds/metadata.ts` が状態の正本として機能します。

次を分離して考えます。

- POM: どう操作するか
- Fixture: どんな実行環境を提供するか
- Flow: どんな業務操作を進めるか
- Scenario: どんな状態から開始するか
- Test: 何を保証するか

## Lesson 10: Assertionの置き場所

AssertionをPage Objectへ隠しすぎると、Testが何を保証しているか分かりにくくなる場合があります。

原則としてTest Caseの目的となるAssertionはTestから読み取れることを重視します。

一方、ComponentのReady状態など、操作成立のための内部確認はObject側へ置く選択肢もあります。

## Lesson 11: Naming / Test ID / Tag

テスト本数が増えたら検索・選択しやすさも重要です。

検討対象:

- Test ID
- Feature名
- Role
- Smoke / Regression
- Platform
- Tag

ただしTagを大量に追加し、誰も意味を管理できなくなる状態は避けます。

## Lesson 12: Flaky Test管理

Flakyを「たまに落ちるからRetryでよい」と扱いません。

改善候補:

- Locator見直し
- 状態待機
- Scenario Reset
- Test間依存除去
- 並列競合の解消
- 不要な外部依存除去

Flakyが継続する場合は、Regression Gateへ残すRiskも判断します。

## Lesson 13: 実行時間とTest Suite

テストが増えると実行時間が伸びます。

ここではまだCI設計へ深入りせず、ローカルTest Suiteとして次を考えます。

- Smoke
- Required Regression
- Extended Regression
- Accessibility
- Mobile
- Native

Part 2でこれらをPR / main / Nightlyへ配置します。

## ハンズオン1: 重複を探す

自分が作成したPlaywright Testから、重複しているLogin、商品操作、Cart操作などを洗い出します。

## ハンズオン2: 解決方法を選ぶ

各重複について次のどれを使うか判断します。

- そのまま残す
- Helper
- POM
- Component Object
- Fixture
- Flow

必ず選択理由を書きます。

## ハンズオン3: リファクタリング

最低1つのPage Objectまたは同等の共通化を実装します。

ただし、POMを使うこと自体を完了条件にはしません。Helperの方が適切と判断した場合、その理由を説明できれば構いません。

## ハンズオン4: Scenario整理

自分のTest Data Setupを既存Scenarioと比較し、重複したUI SetupをScenario Resetへ置き換えられないか検討します。

## ハンズオン5: Regression棚卸し

スプレッドシートの `06_自動化対応表` と `08_改善管理` を更新します。

最低限次を分類します。

- 継続必須
- 重複
- 改善必要
- 削除候補
- Flaky

## 確認問題

1. POMを最初から必須にしない理由は何か。
2. HelperとPOMはどう使い分けるか。
3. Fixtureへ業務操作を大量に隠すと何が問題になるか。
4. FlowとPage Objectの責務をどう分けられるか。
5. ScenarioとFixtureは同じものか。
6. テストを削除する判断が必要になるのはなぜか。

## 完了条件

- 自分のテスト資産の保守上の問題を3件以上洗い出している。
- 各問題について解決方法を選び、理由を説明している。
- 少なくとも1件の共通化・構造改善を実装している。
- Test IDと自動化実装の対応を更新している。
- Flaky、重複、不要テスト、実行時間の観点でRegression資産を棚卸ししている。
