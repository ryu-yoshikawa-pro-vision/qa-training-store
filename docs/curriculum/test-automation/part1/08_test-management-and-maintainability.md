# Part 1-8: テスト管理と保守性改善

## 学習目標

- 自動テストが増えた運用フェーズで起きる問題を整理できる。
- テストケース、spec、Test Data、Seed Scenario、共通処理の管理方法を考えられる。
- Helper、Page Object Model、Component Object、Fixture、Seed Scenarioなどの役割を区別できる。
- POMを必須ルールではなく、保守上の課題を解決する選択肢として判断できる。
- 仕様変更時にRisk、Test Case、自動化実装、Regression分類を同期して更新できる。
- 重複、Flaky、実行時間、不要テスト、責務の混在を改善できる。
- スプレッドシート上のTest Caseとコード上のRegression資産を対応付けて管理できる。

## 教材

**このモジュールでは、このリポジトリの既存Playwright / Maestroテストを使用します。**

仕様変更の起点は [`docs/spec/README.md`](../../../spec/README.md) と対象FeatureのBR / ACです。Formal TestとTraining Testの責務を分けたうえで、Risk、Workbook、実装、Regression分類を同期します。

主な参照先:

- `e2e/web/phase1-required.spec.ts`
- `e2e/web/fixtures.ts`
- `e2e/web/ui-ux-improvements.spec.ts`
- `e2e/web/cross-role-lifecycle.spec.ts`
- `maestro/`
- `src/seeds/metadata.ts`
- `playwright.config.ts`

共通経路では、受講者自身が複数のPlaywright Testを作成済みであることを前提とします。Maestro Flowの作成経験はモバイルアプリ自動化の選択課程を選ぶ場合の前提であり、Playwrightのみで進む共通課程の修了には要求しません。自分のTestに実在する保守上の問題が見つからない場合は、教材が用意した決定的なC10演習を使います。

Part 1-5 / Part 1-6ではTest Harnessとして利用していたResetや実行記録の収集について、このモジュールから初めて `e2e/web/fixtures.ts` の内部を読み、Fixtureとしてどの責務を持たせているかを分析します。

## このLessonのInput / Output

| 項目 | 受講者が確認・実施する内容 |
| --- | --- |
| Input | P1-5の複数の受講者Playwright Test、P1-6のFailure分析・Execution Receipt・Evidence、P1-7を選択した場合のNative成果物、仕様変更のBR / AC。作成済みのResetとTest Case対応を確認してから保守性を分析する。実在する問題がない場合は提供元の`training/playwright/maintenance-exercises/c10-locator-maintenance.spec.ts`を、Learner Caseとは別の`TC-CART-900`演習として受け取る |
| Activity | 重複、責務の混在、Flaky、実行時間、Test Data、spec構成を観察し、Helper／POM／Component Object／Fixture／Seed Scenarioのどれが問題を解くか比較する。実在する問題がなければ、決定的なC10演習を受講者用`training/playwright/exercises/`へコピーし、`TC-CART-900`として同じTest目的を保った最小改善と別runを行う。仮想仕様変更の影響範囲を追跡する |
| Observation | 同じ変更で直す箇所、Failureを隠す共通化、Test Caseとコードの対応、Reset／Fixtureの責務、改善前後の差分と再実行結果。決定的演習では、同じLocator式が複数箇所にあることと、変数へ切り出してもTest目的が変わらないことを確認する |
| Output | `Improvement Target`、問題、なぜ問題か、`Action`、改善内容、再実行結果、影響を受けるTest Case／Pathを記録する。`Before Digest`／`After Digest`は受講者が計算・転記せず、RunnerがExecution Receiptへ記録する。編集場所は自由で、`04_execution-improvement.csv`やコードを完了時に`handoff-root/`へ集約する |
| Self-check | POM等を採用する理由と採用しない理由、Fixture／Resetの責務、仕様変更からRisk→Case→コード→Regressionを追跡する方法を説明する。決定的演習を使った場合は、問題、改善を選んだ理由、実コードの差分、別run、Test目的を維持した確認を順に示す |
| Completion | 少なくとも1つの実在する保守上の問題を特定するか、問題が見つからない場合は決定的なC10演習を使い、原因・影響を記録したうえで最小改善を実装し、`c10-improved`として別のExecution ReceiptとEvidenceを残す。設計だけではC10完了としない。Native成果物は選択時だけ追加し、baselineだけを成果としない |
| Recovery | 問題が見つからない場合は、まずP1-5／P1-6のコードと記録を確認し、それでも保守問題がなければ決定的なC10演習へ進む。実行できない場合は環境問題として記録し、保守判断と分ける |
| Handoff | P1-9へ改善前後のコードPath、Case ID（提供演習の場合は`TC-CART-900`）、差分、再実行結果、`04_execution-improvement.csv`のContextを渡す。選択課程ではNative成果物も別枠で渡す |

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

この例の`class`はPage Objectの型を定義し、`constructor`はPageを受け取って初期化します。`private readonly page`はそのPageをインスタンスのPropertyとして保持する書き方です。ここでの構文はPOMを選んだ場合に必要な範囲だけ確認し、POMの採用自体を修了条件にはしません。

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

Part 1前半で利用していた「Seed ScenarioをResetできる」「Console Errorを実行記録として扱える」というTest Harnessの裏側が、どのような責務としてFixtureへ実装されているかを確認します。

Fixtureへ何でも入れると、Testから前提処理が見えなくなるRiskがあります。

「多くのTestに必要な環境・前提」なのか、「そのTestだけの業務操作」なのかを分けます。

### このLessonで読む`fixtures.ts`の範囲

対象は`e2e/web/fixtures.ts`の次の流れに限定します。File全体のTypeScriptを理解したり、Fixture frameworkを実装したりする必要はありません。

1. `scenario` FixtureがTestへ何を提供するか。
2. Test開始時にScenario Resetを呼び、決めた初期状態を作る箇所。
3. Console Errorと`pageerror`などのPage Errorを収集する箇所。
4. Test終了時に収集結果を確認・記録する箇所。

`type`、`interface`、generic、callback、`base.extend<Fixtures>`などの構文の詳細理解は今回不要です。受講者は「Fixtureが何を提供し、Resetとエラー収集をいつ行い、Test終了時に何を確認するか」を、呼び出し元のTestと対応付けて説明できれば十分です。

## Lesson 8: 複数画面の共通操作を切り出す場合

複数Pageを跨ぐ業務操作は、共通操作として切り出す選択肢があります。

例:

```text
Purchaseの共通操作
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

Page ObjectはUI操作を表し、共通操作は複数Pageを跨ぐ業務操作を表す、と分離できます。

これはMaestroのYAMLファイルを指すMaestro Flowとは別の概念です。

ただし、小規模なケースではHelperだけで十分な場合もあります。

## Lesson 9: Seed Scenario / Test Data

Seed ScenarioはUI操作の共通化ではなく、テスト開始状態の管理です。

`src/seeds/metadata.ts` は、Scenario Shopで利用するSeed Scenarioの名称、用途、推奨Account、初期Session、関連Routeなどを定義する**Scenario Metadataの正本**として機能します。

実際の在庫、Cart、Orderなどのテストデータ生成・Reset処理そのものを、このMetadataファイルだけが定義しているわけではありません。Seed Scenario全体を理解するときは、Metadataと実際のSeed / Reset処理を合わせて確認します。

次を分離して考えます。

- POM: どう操作するか
- Fixture: どんな実行環境を提供するか
- 共通操作: どんな業務操作をまとめるか
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

## Lesson 14: 実行時間とTest Suite（発展課題・参考比較）

テストが増えると実行時間が伸びます。

ここではまだCI設計へ深入りせず、ローカルTest Suiteとして次を考えます。

- Smoke
- 必須Regression
- Extended Regression
- Accessibility
- Mobile
- Native（モバイルアプリ自動化の選択課程・発展課題）

これらをPR / main / Nightlyへ配置する設計はPart 2の参考比較です。このLessonの共通課程の修了にNative実行やCI設定を要求しません。

## ハンズオン1: 重複を探す

自分が作成したPlaywright Testから、重複しているLogin、商品操作、Cart操作などを洗い出します。

## ハンズオン2: 解決方法を選ぶ

各重複について次のどれを使うか判断します。

- そのまま残す
- Helper
- POM
- Component Object
- Fixture
- 複数画面の共通操作

必ず選択理由を書きます。

## ハンズオン3: リファクタリング

実在する保守問題に対して、Helper、POM、Component Object、Fixture、共通操作、または現状維持のいずれかを選び、最小の改善または選択理由を記録します。

POMを使うこと自体を完了条件にはしません。Helperの方が適切と判断した場合、その理由を説明できれば構いません。

## 決定的なC10演習: 同じLocatorの重複を小さく改善する

P1-5で作成したTestを読み、実在する保守上の問題を1件見つけた場合は、まずその問題を使います。適切に作れていて現状維持が正しい場合だけ、次の教材演習へ進みます。C10を完了するためだけに、自分の良いコードへ不要なPOMやHelperを追加しません。

### Input

教材が配布する [`c10-locator-maintenance.spec.ts`](../../../../training/playwright/maintenance-exercises/c10-locator-maintenance.spec.ts)、正式な製品Risk／Test Caseを参照できるP1-3のWorkbook、`04_execution-improvement.csv`です。配布Fileは問題を含む練習素材であり、完成答案ではありません。Product Code、Formal Regression、`e2e/`は変更しません。Locator重複はTest Codeの保守問題であり、新しい製品Riskを追加する理由にはしません。

### Activity

1. まだ使っていなければ、教材Fileを自分のExerciseへコピーします。正式なReceipt実行では、Repository相対Pathを保ったまま`<handoff-root>/code/`へ置きます。既存のP1-5コードを別Directoryで編集していた場合も、実行前にこのcode配下へ集約します。

   ```bash
   mkdir -p <handoff-root>/code/training/playwright/exercises <handoff-root>/code/training/playwright/support
   cp training/playwright/maintenance-exercises/c10-locator-maintenance.spec.ts <handoff-root>/code/training/playwright/exercises/c10-cart-900.spec.ts
   ```

   PowerShellの場合は次を使います。

   ```powershell
   New-Item -ItemType Directory -Force <handoff-root>/code/training/playwright/exercises, <handoff-root>/code/training/playwright/support | Out-Null
   Copy-Item training/playwright/maintenance-exercises/c10-locator-maintenance.spec.ts <handoff-root>/code/training/playwright/exercises/c10-cart-900.spec.ts
   ```

   決定的な教材演習として使う場合、コピー先のTest title／metadataは提供された`TC-CART-900`を使います。この提供演習は製品の`TARGET`／`RISK`や既存のLearner Caseへ結び付けず、`01_target-risk.csv`／`02_test-cases.csv`へ製品Riskを追加しません。`04_execution-improvement.csv`では`TC-CART-900`の前後Contextを記録し、実在のLearner Caseを保守する経路とは分けます。

   ```text
   TC-CART-900,c10-before,Not run,,,,
   TC-CART-900,c10-improved,Not run,,,,
   ```

   実在するLearner Caseの保守を選ぶ場合だけ、そのCaseのTest title、Workbookの既存Risk／Case、実装Path、Evidenceを同じIDへ結びます。提供素材の`TC-CART-900`経路を、別のLearner Caseの代用にはしません。

2. 変更前に、Repository rootで次の正式入口を1回実行します。`<handoff-root>`は自分の作業成果物を集約するDirectoryへ置き換えます。`--suite`とTest Caseは変えず、`--project`、`--root`、`--run-context`だけを自分の環境に合わせます。

   ```bash
   pnpm run training:web:exercise:with-receipt -- --suite exercise --project training-chromium --root <handoff-root> --run-context c10-before
   ```

   `c10-before`のReceiptとEvidenceで、対象CaseがPassしたこと、実装Pathがコピー先であること、改善前のコードとLearner-owned codeのDigest mapがRunnerによって記録されたことを確認します。

3. コピーしたTestを読み、同じ`getByRole("heading", { name: "すべての商品" })`が2つのAssertionへ繰り返し書かれていることを確認します。ここでの問題は、将来Locatorを変更するときに同じ修正を複数箇所へ行う必要があることです。Test目的やAssertionの強さが問題なのではありません。

4. `<handoff-root>/code/training/playwright/exercises/`内のコピーだけを最小限修正します。例えばLocatorを`const productsHeading = ...`へ1回だけ切り出し、2つのAssertionがその変数を使うようにします。POMを作る必要はなく、Assertionを削除・弱体化したり、Product Codeを変更したりしません。

5. 同じTest Case、同じコードPathで、別のContextを指定して再実行します。

   ```bash
   pnpm run training:web:exercise:with-receipt -- --suite exercise --project training-chromium --root <handoff-root> --run-context c10-improved
   ```

   改善後のReceiptがPassし、`c10-before`とは同じCase ID・同じコードPathで、別のEvidenceを持ち、対象PathのDigestがRunnerによって変化として記録され、改善後の時刻が改善前より後で、Test Caseの目的が維持されていることを確認します。`c10-before`はRetry Failureを含まないclean Passでなければなりません。initialのEvidenceを上書きしたり、同じRunを修正後の結果として再利用したり、別Case・別PathのReceiptで置き換えたりしません。

### Output

`04_execution-improvement.csv`へ、少なくとも同じCaseの`c10-before`と`c10-improved`を記録します。Evidenceは実際に生成されたReceipt、Report、Screenshot、Traceなど後から追えるものを指定します。`c10-improved`には、問題、原因または保守上の懸念、選んだAction、改善内容を自分の言葉で記録します。さらに既存の`improvement`欄へ、実際に変更したLearner-owned codeのPathを記録します。前後DigestはRunnerがReceiptの`code_digests`へ記録し、受講者は計算・転記しません。これにより、spec自身ではなくHelper／POM等だけを改善した場合も対象を機械確認できます。

```text
Improvement Target: training/playwright/support/cart-helper.ts
Problem: 同じLocator変更を複数箇所へ反映する必要がある
Why: Locator変更時の保守漏れが起きやすい
Action: Helperへ責務を分離する
Improvement: Helperを追加し、再実行がPassした
```

`Improvement Target`は`training/playwright/`配下のLearner-owned codeだけを指定します。提供済みの`support/reset-scenario.ts`や`maintenance-exercises/`は対象にせず、前後Digestの比較はReceiptに任せます。

```text
TC-CART-900,c10-before,Pass,<改善前の実Evidence>,,,,
TC-CART-900,c10-improved,Pass,<改善後の別Evidence>,Maintainability,<同じLocatorの変更箇所が増える>,<Locatorを変数へ切り出す>,Improvement Target: training/playwright/exercises/c10-cart-900.spec.ts; Problem: 同じLocator変更を複数箇所へ反映する必要がある; Why: 保守漏れが起きやすい; Action: Locatorを変数へ切り出す; Improvement: 再実行がPassした
```

上の値は記入形式の例です。存在しないPath、Receipt、原因を作らず、実行結果に合わせて置き換えます。実在する保守問題を使った場合は、対象Caseと改善前後の実Diffが分かるように同じ項目を記録します。

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

## ハンズオン6: Regression棚卸し（Practice Volume / 任意）

追加演習として、Workbookの `03_automation-mapping.csv` と `04_execution-improvement.csv` を更新します。

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
4. 複数画面の共通操作とPage Objectの責務をどう分けられるか。
5. Seed ScenarioとFixtureは同じものか。
6. `src/seeds/metadata.ts` だけをSeed Scenarioの全状態の定義と見なしてはいけない理由は何か。
7. 仕様変更時にTest Codeだけを修正すると何がずれる可能性があるか。
8. Product仕様がまだ変わっていない段階で、将来仕様向けTestを無理にPassさせるべきでないのはなぜか。
9. テストを削除する判断が必要になるのはなぜか。

## 自己確認

次を自分の変更Diff、Test Case、または短い説明で確認できれば、このモジュールの判断を説明できます。

- 実在するPlaywright保守問題を1件、重複・Flaky・責務混在・実行時間などの観察事実から説明できる。
- 実在する問題がない場合は、決定的なC10演習の同じLocator重複を問題として説明できる。
- その問題に対してHelper、POM、Component Object、Fixture、共通操作、現状維持のいずれを選び、選択理由と副作用を説明できる。
- 最小改善のDiffがTest Caseの目的、Locator / Assertion、Test Data依存、既存Regressionとの関係を壊していないことを確認できる。
- `e2e/web/fixtures.ts`では、Fixtureの提供物、Scenario Reset、Console / Page Error収集、Test終了時の確認だけをTestの呼び出しと対応付けて説明できる。未学習のTypeScript構文の説明は不要である。
- C10では改善前と`c10-improved`を別Runとして残し、同じCaseのPass、別Evidence、実コードの変更Digest、目的維持を確認できる。
- 仮想仕様変更では、Productを変更せず、Risk → Test Case → 自動化対象 → Regression分類の影響計画だけを作成している。
- Native / Maestro / CIの比較は発展課題または参考資料であり、Playwrightのみで進む共通課程の修了に混ぜていない。

### Recovery

保守問題の原因が分からない場合は、まず対象Testの目的、Failureの再現条件、Test Data / Seed、Locator / Assertion、既存Regressionとの重複を1つずつ確認します。実行環境が原因なら環境上の問題として記録し、設計上の未理解なら問題の最小再現とTest Caseへ戻ります。仮想仕様変更で迷った場合は、ProductやTest Codeを変更せず、現行Specを基準に影響先と未実装境界を整理します。

## 完了条件

- 実在するPlaywright保守問題を1件以上診断するか、実在する問題がない場合は決定的なC10演習を使い、原因・影響を説明したうえで、最小の改善を1件実装している。改善前と`c10-improved`の別Run、別Evidence、実コード変更、Test目的を維持した確認が揃っていることを求める。追加の棚卸しは練習量の目安として推奨するが、件数だけでは修了としない。
- 各問題について解決方法を選び、理由を説明している。
- Test Case IDと自動化実装の対応を更新している。
- 仮想仕様変更についてRisk、Test Case、自動化実装、Regression分類の影響を追跡し、変更計画を作成している。
- 仮想仕様変更ではProduct未変更のまま将来仕様向けTestをPassさせることを完了条件にしていない。

## 次の行動

Part 1の共通課程を続ける場合は [P1-9: 総合演習](09_part1-capstone.md) へ進みます。Native / CIの追加比較は必要な受講者だけが発展課題・参考資料として行い、共通経路の完了やP1-9への移行を止めません。
