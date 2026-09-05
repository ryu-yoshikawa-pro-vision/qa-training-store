# Part 1-2: Scenario Shopの探索とテスト対象分析

## 学習目標

- 自動化コードを書く前にテスト対象を調査できる。
- 画面、Role、状態、データ、業務ルール、境界条件を整理できる。
- `/guide` やSeed Scenarioを、単なる操作補助ではなくテスト分析の情報源として利用できる。
- 画面単位だけでなくUser Journeyと状態遷移からテスト対象を捉えられる。

## 教材

**このモジュールでは、このリポジトリのScenario Shopを使用します。**

分析のOracleは [`docs/spec/README.md`](../../../spec/README.md) から辿るNormative Specificationです。Current UI、README、既存Testは探索・実装比較のEvidenceとして扱い、未定義の期待動作を教材へ追加しません。

主に次を使います。

- Scenario ShopのWeb画面
- `/guide`
- `src/seeds/metadata.ts`
- READMEの機能説明
- Storefront / Customer / AdminのRole差分

この段階では、既存E2Eを先に読んで分析結果をコピーしないようにします。

## Lesson 1: テスト対象を触る

最初にScenario Shopを実際に操作します。

最低限、次を確認します。

### Storefront

- Home
- 商品一覧
- Search
- Category
- 商品詳細
- Cart

### Customer

- Login
- Account
- Address
- Checkout
- Payment
- Order
- Review

### Admin / Operator

- 商品
- 在庫
- 注文
- Review
- User

すべての画面を暗記することが目的ではありません。どの機能がどのRoleと状態に依存するかを把握します。

## Lesson 2: Roleを整理する

Scenario Shopには次のRoleがあります。

- Guest
- customer
- operator
- admin

Roleによってできることが異なるため、同じURLへアクセスした場合でも期待結果が異なる可能性があります。

スプレッドシートへ次を整理します。

| Role | 主な操作 | アクセス制約 | 重要なテスト |
| --- | --- | --- | --- |
| Guest | 商品閲覧、Cart | Account不可 | Cart、Login導線 |
| customer | 購入、Order、Review | Admin不可 | Checkout、Payment |
| operator | 運用画面 | User管理制限 | 在庫、配送 |
| admin | 全管理機能 | 最後のAdmin保護 | User、商品管理 |

## Lesson 3: 状態を整理する

UIテストは画面だけ見ても十分に設計できません。

例えば同じ商品詳細でも、状態によって期待結果が変わります。

- 在庫あり
- 在庫切れ
- 低在庫
- Sale中
- Sale終了
- 購入上限

同じCheckoutでも、次があります。

- 通常
- Cart Version不一致
- 価格変更
- 在庫変更
- Payment成功
- Payment拒否
- Payment処理中

`src/seeds/metadata.ts` のScenarioは、これらの状態を決定的に作るための仕組みとして後から確認します。

## Lesson 4: User Journeyで見る

画面一覧だけでなく、業務の流れとして整理します。

例:

```text
Guest
↓
商品を探す
↓
商品詳細
↓
Cart
↓
Login
↓
Guest Cart統合
↓
Checkout
↓
Payment
↓
Order
↓
Delivery
↓
Review
```

このJourneyから、単画面のテストだけでは見つけにくい連携リスクを考えます。

## Lesson 5: データと状態遷移を見る

Scenario ShopではUI操作によって内部状態が変化します。

例:

- Cart数量が変わる。
- Checkout Sessionが作られる。
- Payment状態が変わる。
- Orderが作られる。
- Inventoryが減る。
- Shipment状態が変わる。
- Review Summaryが変わる。

「ボタンを押せるか」ではなく、「操作後に何が変わるべきか」を分析します。

## Lesson 6: `/guide` とScenario Metadata

`/guide` では固定Account、Role、Scenario、確認画面、安全なReset先などを確認できます。

分析後に `src/seeds/metadata.ts` を読み、次を照合します。

- どんなScenarioが用意されているか。
- 何を確認するためのScenarioか。
- 初期Login状態は何か。
- 推奨Accountは何か。
- どのRouteを確認するか。

ここで「Seed Scenarioは便利なテストデータ」だけではなく、「テスト状態を再現可能にする自動化設計の一部」であることを理解します。

### 既存SSOTへ戻る経路

値をこの教材へ転記せず、判断が必要になったら次の順に参照します。

1. State、Scenario、Clock、Reset、Test Controlの意味: [`docs/spec/state-and-scenarios.md`](../../../spec/state-and-scenarios.md)
2. Scenario ID、初期状態、固定Clockの定義: [`src/seeds/metadata.ts`](../../../../src/seeds/metadata.ts)
3. 郵便番号からの住所候補の扱い: [`docs/05_ui/ui_specifications.md`](../../../05_ui/ui_specifications.md) と [`docs/07_testability/seed_catalog.md`](../../../07_testability/seed_catalog.md)
4. 実際の画面・安全な入口: Scenario Shopの`/guide`とTest Control

教材本文の一覧やサンプル値とSSOTが異なる場合は、SSOTの値を採用し、差異をProduct仕様の変更として扱いません。

## ハンズオン1: Cart分析

Cartについて次を洗い出します。

- Role
- 初期状態
- 入力
- 操作
- 状態変化
- 正常系
- 異常系
- 境界値
- 関連画面

最低限、在庫切れと購入上限を含めます。

## ハンズオン2: Checkout Journey分析

Guestから購入完了までを図にします。

次を明示します。

- Loginが必要になる場所
- Cart統合
- Address
- Payment
- Processing
- Complete / Failed
- Retry

その後、「どこが壊れたら影響が大きいか」を考えます。

## 確認問題

1. 画面一覧だけでE2Eを設計すると何を見落としやすいか。
2. Roleと状態を分けて整理する理由は何か。
3. `out-of-stock` のようなScenarioが自動化へ与える価値は何か。
4. Payment成功だけを確認しても十分でない理由は何か。
5. UI操作後の内部状態を考える必要があるのはなぜか。

## 自己確認

### 回答の最低判定基準

- 画面一覧だけではRole、State、Data、状態遷移、連携Riskを落とすことを説明している。
- RoleとStateを別の軸で整理し、同じURLでもExpectedが変わる例を1つ示している。
- `out-of-stock` を決定的な初期状態へ戻すSeed Scenarioとして説明し、Test Dataを手作業で作り続ける問題と結び付けている。
- Payment成功以外に拒否・processing・Retryまたは在庫 / Cart Versionの状態を挙げ、Journey上の影響を説明している。
- UI操作後に確認する内部状態を1つ挙げ、`docs/spec`のBR / ACまたはState / Scenarioへ参照を戻している。

### Recovery

Role / State / Seedのどれかを説明できない場合は、Lesson 2〜6を再読し、CartまたはCheckoutの1条件を「Role → 初期State → Action → Expected → 変化する内部State」で書き直します。固定値が見つからない場合は上記SSOTへ戻り、参照先が起動できない・権限がない場合だけEnvironment blockとして分けて記録します。

## 完了条件

- Scenario Shopの主要Roleを説明できる。
- 1つ以上のUser Journeyを図示できる。
- CartまたはCheckoutについて正常・異常・境界条件を整理できる。
- Seed Scenarioがテスト自動化へ必要な理由を説明できる。

## 次の行動

[Part 1-3: テスト設計と自動化対象選定](./03_test-design-and-automation-selection.md)へ進み、整理したRiskからTest Caseと適切なTest Layerを選びます。
