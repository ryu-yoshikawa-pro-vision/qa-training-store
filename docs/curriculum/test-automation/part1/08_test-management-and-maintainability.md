# Part 1-8: テスト管理と保守性改善

## 学習目標

- 自動テストが増えた運用フェーズで起きる問題を整理できる。
- テストケース、spec、Test Data、Seed Scenario、共通処理の管理方法を考えられる。
- Helper、Page Object Model、Component Object、Fixture、Automation Flow、Seed Scenarioの役割を区別できる。
- POMを必須ルールではなく、保守上の課題を解決する選択肢として判断できる。
- 仕様変更時にRisk、Test Case、自動化実装、Regression分類を同期して更新できる。
- 重複、Flaky、実行時間、不要テスト、責務の混在を改善できる。
- スプレッドシート上のTest Caseとコード上のRegression資産を対応付けて管理できる。

## 教材

**このモジュールでは、このリポジトリの既存Playwright TestをCommonの比較教材として使用します。MaestroはNative specializationを選択した場合の追加Referenceです。**

仕様変更の起点は [`docs/spec/README.md`](../../../spec/README.md) と対象FeatureのBR / ACです。Formal TestとTraining Testの責務を分けたうえで、Risk、Workbook、実装、Regression分類を同期します。

主な参照先:

- `e2e/web/phase1-required.spec.ts`
- `e2e/web/fixtures.ts`
- `e2e/web/ui-ux-improvements.spec.ts`
- `e2e/web/cross-role-lifecycle.spec.ts`
- `maestro/`
- `src/seeds/metadata.ts`
- `playwright.config.ts`

このモジュールへ進む時点で、受講者はP1-6までのCommonを完了し、少なくとも1件のlearner-authored Playwright exerciseを比較材料にできます。Maestro Flowを作成済みであることはCommonの前提にしません。

Part 1-5 / Part 1-6ではTest Harnessとして利用していたResetやEvidence収集について、このモジュールから初めて `e2e/web/fixtures.ts` の内部を読み、Fixtureとしてどの責務を持たせているかを分析します。

### Core / Extension / Reference boundary

- **Common Core**: 実在するPlaywright Testのmaintainability issueを1件選び、Riskと影響を説明し、最小の構造改善案を選ぶ。POM、Helper、Fixture、Automation Flowは必要性を比較して使い分ける。
- **Part 2 bridge**: Test Case、Seed、Regression分類、仕様変更時のlifecycleを棚卸しし、後続のGit / CIで扱う変更単位を準備する。
- **Native Extension / Reference**: MaestroのFlowやNative資産との比較は選択課題。Common completionの必須Evidenceへ昇格させない。
- **Reference**: Pattern catalogやRepositoryの大規模構造は、必要な箇所だけを読む比較材料とし、用語を知っていることや本数を増やすことを完了条件にしない。

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
- 仕様変更後にスプレッドシートと自動テストの内容がずれる。

ここで初めて「テスト資産をどう管理するか」を考えます。

## Lesson 2: テストケース管理

スプレッドシートのTest Case IDと実装を照合します。

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
import type { Page } from "@playwright/test";

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

ここで初めて既存 `scenario` Fixtureの内部を教材として読み、次を確認します。

- Test Data Reset
- Page cleanup
- Metadata確認
- Console Error収集

Part 1前半で利用していた「Seed ScenarioをResetできる」「Console ErrorをEvidenceとして扱える」というTest Harnessの裏側が、どのような責務としてFixtureへ実装されているかを確認します。

Fixtureへ何でも入れると、Testから前提処理が見えなくなるRiskがあります。

「多くのTestに必要な環境・前提」なのか、「そのTestだけの業務操作」なのかを分けます。

## Lesson 8: Automation Flow

複数Pageを跨ぐ業務操作はAutomation Flowとして切り出す選択肢があります。

例:

```text
Purchase Automation Flow
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

Page ObjectはUI操作を表し、Automation Flowは複数Pageを跨ぐ業務操作を表す、と分離できます。

ここでいうAutomation Flowは、MaestroのYAMLファイルを指すMaestro Flowとは別の概念です。

ただし、小規模なケースではHelperだけで十分な場合もあります。

## Lesson 9: Seed Scenario / Test Data

Seed ScenarioはUI操作の共通化ではなく、テスト開始状態の管理です。

`src/seeds/metadata.ts` は、Scenario Shopで利用するSeed Scenarioの名称、用途、推奨Account、初期Session、関連Routeなどを定義する**Scenario Metadataの正本**として機能します。

実際の在庫、Cart、Orderなどのテストデータ生成・Reset処理そのものを、このMetadataファイルだけが定義しているわけではありません。Seed Scenario全体を理解するときは、Metadataと実際のSeed / Reset処理を合わせて確認します。

次を分離して考えます。

- POM: どう操作するか
- Fixture: どんな実行環境を提供するか
- Automation Flow: どんな業務操作を進めるか
- Seed Scenario: どんな状態から開始するか
- Test: 何を保証するか

## Lesson 10: 仕様変更とテスト資産のライフサイクル

運用では、テストを追加するだけでなく、仕様変更に合わせて既存資産を更新・廃止する必要があります。

基本の流れは次です。

```text
仕様変更
↓
影響するRiskを特定
↓
Test Caseを追加 / 修正 / 廃止
↓
自動化対象を再評価
↓
Playwright / Maestro / 下位テストへの変更を特定
↓
Regression分類を見直す
↓
不要になったTestを削除または履歴化
↓
Product変更後にTestを実装・実行して整合を確認
```

例えば「Cartの購入上限が5から3へ変更される」と仮定します。

この場合、単にPlaywrightの期待値を `5` から `3` へ変えるだけでは不十分です。

確認するもの:

- 上限に関係するRiskは変わるか。
- 同値分割はどう変わるか。
- 境界値は `2 / 3 / 4` などへ変わるか。
- 既存Test Case IDは同じ目的のままか。
- 新しいCaseが必要か。
- Web / Native両方へ影響するか。
- Unit / Integration Testにも変更が必要か。
- Regression / Smoke分類を変える必要があるか。

**仕様、テスト設計、自動化コードを別々に更新しない**ことを学びます。

ただし、このモジュールで扱う「購入上限5から3」は**影響分析のための仮想仕様変更**です。現在のScenario ShopのProduct仕様は変更しません。そのため、変更後仕様を前提にPlaywrightやMaestroを実際に書き換えてPassさせることは、このハンズオンの完了条件にしません。

教材実装時に「購入上限3へ変更済み」の専用演習Branchなどを別途用意した場合は、発展演習としてProduct変更とTest変更を実際に同期させて実行できます。

## Lesson 11: Assertionの置き場所

AssertionをPage Objectへ隠しすぎると、Testが何を保証しているか分かりにくくなる場合があります。

原則としてTest Caseの目的となるAssertionはTestから読み取れることを重視します。

一方、ComponentのReady状態など、操作成立のための内部確認はObject側へ置く選択肢もあります。

## Lesson 12: Naming / Test Case ID / Tag

テスト本数が増えたら検索・選択しやすさも重要です。

検討対象:

- Test Case ID
- Feature名
- Role
- Smoke / Regression
- Platform
- Tag

UI要素を特定するUI Test ID / `testId` はTest Case IDとは別に管理します。

Tagを大量に追加し、誰も意味を管理できなくなる状態は避けます。

## Lesson 13: Flaky Test管理

Flakyを「たまに落ちるからRetryでよい」と扱いません。

改善候補:

- Locator見直し
- 状態待機
- Seed Scenario Reset
- Test間依存除去
- 並列競合の解消
- 不要な外部依存除去

Flakyが継続する場合は、Regression Gateへ残すRiskも判断します。

## Lesson 14: 実行時間とTest Suite

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

自分が作成したPlaywright Testから、保守上の問題を1件選びます。重複、責務混在、Locator変更影響、Test Data Setupなど、実際に困る理由を説明できるものを対象にします。

## ハンズオン2: 解決方法を選ぶ

選んだ問題について、次のどれを使うか判断します。

- そのまま残す
- Helper
- POM
- Component Object
- Fixture
- Automation Flow

選択理由を書き、問題より大きい抽象化を持ち込まないことを確認します。

## ハンズオン3: 最小のリファクタリング

選んだ問題を解消する最小の共通化・構造改善を1件実装します。

POMを使うこと自体を完了条件にはしません。Helperや局所修正の方が小さく適切なら、その理由を説明できれば構いません。

### Part 2 bridge / Reference practice（任意）

以下のハンズオン4〜6は、Part 2へ進むための影響分析やRegression管理の比較材料です。Common completionの必須Evidenceにはしません。

## ハンズオン4: Seed Scenario整理

自分のTest Data Setupを既存Seed Scenarioと比較し、重複したUI SetupをSeed Scenario Resetへ置き換えられないか検討します。

`src/seeds/metadata.ts` だけでなく、実際にReset後の状態を生成する処理も確認し、Metadataと実データ生成の責務を区別します。

## ハンズオン5: 仮想仕様変更の影響を追跡する

「Cartの購入上限が5から3へ変更される」と仮定し、**実装を変更する前のImpact Analysis**として次を更新・整理します。

1. Risk
2. 同値分割 / 境界値
3. 影響するTest Case
4. 自動化対象
5. 変更が必要になるPlaywright / Maestro / 下位テスト
6. Regression分類
7. 不要になるCase / 新たに必要になるCase

Product実装は現在の購入上限5のままとし、変更後仕様向けのTest Codeを実際にPassさせることは求めません。

提出するのは、例えば次のような変更計画です。

| 対象 | 現在 | 仮想変更後 | 必要な対応 |
| --- | --- | --- | --- |
| 境界値 | 4 / 5 / 6 | 2 / 3 / 4 | Test Case更新 |
| Playwright | 上限5を確認 | 上限3を確認予定 | Product変更後にTest更新 |
| Maestro | 上限5のFlow | 上限3のFlow候補 | Native仕様反映後に更新 |
| Unit Test | 現行Rule | 新Rule | Business Rule変更と同時に更新 |

変更前後で、どの成果物へどの変更が必要になるかを説明します。

専用の仕様変更済み演習Branchが教材として用意された場合のみ、発展として実際のProduct / Test変更と再実行まで行います。

## ハンズオン6: Regression棚卸し

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
4. Automation FlowとPage Objectの責務をどう分けられるか。
5. Seed ScenarioとFixtureは同じものか。
6. `src/seeds/metadata.ts` だけをSeed Scenarioの全状態の定義と見なしてはいけない理由は何か。
7. 仕様変更時にTest Codeだけを修正すると何がずれる可能性があるか。
8. Product仕様がまだ変わっていない段階で、将来仕様向けTestを無理にPassさせるべきでないのはなぜか。
9. テストを削除する判断が必要になるのはなぜか。

## 自己確認とRecovery

自分のPlaywright Testから1件を選び、問題の影響、最小改善、改善後に守るRiskを説明します。POM / Helper / Fixture / Automation Flowの名称を使うだけでなく、なぜその責務へ置くかを説明できることを確認します。

Fixture内部やNative比較で止まった場合は、まずCommon Coreの問題へ戻り、必要な差分だけを読む範囲へ絞ります。Lifecycle / Regression棚卸しはPart 2 bridge / Referenceであり、Common completionを止めません。次はPart 1-9のCommon capstoneまたはPart 2-1へ進みます。

## 完了条件

- learner-authored Playwright Testの実在する保守問題を1件特定し、その影響と守るべきRiskを説明できる。
- 問題に対して必要最小限の改善方法を選び、その理由を説明できる。
- 最小の共通化・構造改善を1件実装し、元の期待結果・Assertion・Evidenceを弱めていないことを確認できる。
- Maestro / Native比較、Pattern catalog、仮想仕様変更、Regression棚卸しを実施しなくてもCommon completionが成立する。