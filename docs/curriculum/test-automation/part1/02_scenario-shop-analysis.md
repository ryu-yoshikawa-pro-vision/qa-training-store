# Part 1-2: Scenario Shopの探索とテスト対象分析

## 学習目標

- 自動化コードを書く前にテスト対象を調査できる。
- 画面、Role、状態、データ、業務ルール、境界条件を整理できる。
- RiskのImpact、Likelihood、Priorityを、ラベルだけでなく判断理由とともに説明できる。
- `/guide` やSeed Scenarioを、仕様と観察結果を結び付ける補助情報として利用できる。
- 画面単位だけでなくUser Journeyと状態遷移からテスト対象を捉えられる。

## 教材

**このモジュールでは、このリポジトリのScenario Shopを使用します。**

分析の判断基準は [`docs/spec/README.md`](../../../spec/README.md) から辿る正式な仕様です。現在のUI、README、既存Testは探索・実装比較の材料として扱い、未定義の期待動作を教材へ追加しません。

主に次を使います。

- [`docs/spec/product-scope.md`](../../../spec/product-scope.md)
- [`docs/spec/roles-and-permissions.md`](../../../spec/roles-and-permissions.md)
- 対象FeatureのBR / AC
- [`docs/spec/state-and-scenarios.md`](../../../spec/state-and-scenarios.md)
- 必要な節だけの[`docs/07_testability/seed_catalog.md`](../../../07_testability/seed_catalog.md)
- Scenario ShopのWeb画面
- `/guide`
- Storefront / Customer / AdminのRole差分

この段階では、既存E2Eを先に読んで分析結果をコピーしないようにします。

## このLessonのInput / Output

| 項目 | 受講者が確認・実施する内容 |
| --- | --- |
| Input | P1-01で確認したテスト自動化の目的、`docs/spec`の対象Feature、`/guide`、必要なSeed Scenario。仕様のBR / ACは仕様側を正本とし、画面観察は補助情報として扱う |
| Activity | Scenario ShopをRole・State・Dataの組み合わせで操作し、CartとCheckoutの正常・異常・境界を観察する。各Risk候補についてImpact、Likelihood、Priorityを考え、観察した事実と仕様上の判断を分けて記録する |
| Observation | Roleによる表示・操作差、Reset後の初期状態、Cart数量・在庫・Checkout状態の変化、拒否理由と次に進めない条件、Risk評価の根拠になる影響範囲と到達しやすさ |
| Output | 4 CSVへ入れる前の分析メモと、少なくとも`TARGET-CART-101`／`RISK-CART-101`を含む受講者作成の対象・Risk行。Risk行には`impact`、`likelihood`、`priority`とそれぞれの判断理由を残す。編集場所は自由で、完了時は`handoff-root/workbook/`へ集約する。既存CSVへ回答を追記しない |
| Self-check | 「画面一覧だけでなく何を分析したか」「RoleとStateを分ける理由」「どの観察をどのBR / ACへ戻せるか」「Impact、Likelihood、Priorityをなぜその値にしたか」に答え、初期状態・操作・変化・Risk評価の最低要素を含める |
| Completion | CartまたはCheckoutの1つのJourneyを図示し、正常・異常・境界を含む複数のRisk候補を、仕様参照と観察事実を分けて説明できる。少なくとも1つのRiskについて、Impact、Likelihood、Priorityを機械的な計算ではなく理由付きで評価できる。P1-03へ渡す対象・RiskのIDとメモが揃っている |
| Recovery | 理解不足はLesson 1〜6と`docs/spec`へ戻る。画面やTest Controlが使えない場合は環境問題として記録し、期待動作の判断と混ぜない。状態が再現しない場合はSeed ScenarioとReset条件を再確認する |
| Handoff | P1-03の受講者自身へ、対象・RiskのID、分析メモ、参照したBR / AC、Reset／Role／State条件を渡す。P1-03開始時にこれらを読み返せればよい |

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

## Lesson 3.5: Riskの優先度を考える

Riskは「何かが起きるかもしれない」という不確実さだけではなく、起きたときにどんな影響があり、どの程度起こりやすいかを表します。次の3つを別々に考えます。

- **Impact**: そのRiskが起きたとき、誰にどのような不利益が出るかを見ます。金額、在庫、購入処理、利用者の操作継続などへの影響を考えます。
- **Likelihood**: そのRiskへどの程度到達しやすいかを見ます。通常操作で起きるのか、特別な状態や複数の条件が必要なのかを確認します。
- **Priority**: どのRiskから先に確認・対応するかを決めるために付けます。ImpactとLikelihoodを機械的に掛け合わせて答えを出すことが目的ではなく、判断理由を他の人へ説明できることが重要です。

### Cartの例

「購入上限を超えたCartが成立する」というRiskを考えます。

1. **Impact**: 購入者だけでなく、注文金額、在庫数、購入処理の正しさに影響する可能性があります。成立した場合にどの業務が壊れるかを書きます。
2. **Likelihood**: 通常の追加操作で上限を超えられるのか、在庫や特別なSeed Scenarioなどの条件が必要なのかを確認します。
3. **Priority**: 影響の大きさと到達条件を踏まえ、先に確認すべきかを決め、その理由を書きます。例えば「影響は大きいが、上限を超える状態は境界操作で確認するため、`高 / 中 / 高`とする」といった説明は可能です。

これは評価値の正解を暗記する例ではありません。自分が観察したCartまたはCheckoutのRiskについて、誰にどの影響があり、どの条件で起き、なぜそのPriorityで確認するのかを説明してください。

状態と期待結果を仕様から整理した後、`docs/spec/state-and-scenarios.md` と `docs/07_testability/seed_catalog.md` の必要な節でScenarioの目的と初期状態を確認します。続けて`/guide`で現在の画面・入口・観察状態を確認します。このLessonではTypeScript実装を読みません。

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

## Lesson 6: `/guide` とScenarioの照合

`/guide` では固定Account、Role、Scenario、確認画面、安全なReset先などを確認できます。

仕様と状態を分析した後に`docs/spec/state-and-scenarios.md`と`docs/07_testability/seed_catalog.md`の必要な節を読み、`/guide`で現在の画面を観察して、次を人間向け資料として整理します。

- Scenarioの目的は何か。
- 初期状態は何か。
- 初期Login状態は何か。
- 推奨Accountは何か。
- どのRouteを確認するか。
- Reset先はどこか。

ここで「Seed Scenarioは便利なテストデータ」だけではなく、「テスト状態を再現可能にする自動化設計の一部」であることを理解します。具体的なScenario ID、seed value、固定Clockなど、実行可能なソースにある値は、このLessonでは確認しません。Playwright実装へ進んだ後に必要な値だけを実行可能なソースで確認します。

### 既存SSOTへ戻る経路

値をこの教材へ転記せず、P1-2では次の順に人間向け資料を参照します。

1. State、Scenario、Clock、Reset、Test Controlの意味: [`docs/spec/state-and-scenarios.md`](../../../spec/state-and-scenarios.md)
2. Scenarioの目的、初期状態、初期Login状態、推奨Account、確認Route、Reset先: [`docs/07_testability/seed_catalog.md`](../../../07_testability/seed_catalog.md) の必要な節
3. 郵便番号からの住所候補の扱い: [`docs/05_ui/ui_specifications.md`](../../../05_ui/ui_specifications.md)
4. 実際の画面・安全な入口: Scenario Shopの`/guide`とTest Control
5. 具体的な実装上のIDは、Playwright実装へ進んだ後に実行可能なソースで確認します。

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

分析を終えたら、受講者自身の作業表へ次の2つの識別子を作ります。`TARGET-CART-101`は調査対象、`RISK-CART-101`はその対象で起こる影響の大きいRiskです。既存の`TARGET-CART-001`や`RISK-CART-001`を上書き・完成答案としてコピーせず、自分が観察した条件と、根拠にしたSpec / BR / ACを記録します。後続のP1-3では、このRiskだけに限定せず、少なくとも別のRiskも追加してTest Caseへ分解します。

`RISK-CART-101`には、Impact、Likelihood、Priorityのラベルと、それぞれの理由を記録します。値を決められない場合は、影響を受ける利用者・業務、通常操作での到達条件、追加で確認したい情報を書いてから評価します。

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
6. ImpactとLikelihoodを別々に考えるのはなぜか。
7. Priorityを単純な計算結果として埋めてはいけないのはなぜか。

## 自己確認

### 回答の最低判定基準

- 画面一覧だけではRole、State、Data、状態遷移、連携Riskを落とすことを説明している。
- RoleとStateを別の軸で整理し、同じURLでもExpectedが変わる例を1つ示している。
- `out-of-stock` を決定的な初期状態へ戻すSeed Scenarioとして説明し、Test Dataを手作業で作り続ける問題と結び付けている。
- Payment成功以外に拒否・processing・Retryまたは在庫 / Cart Versionの状態を挙げ、Journey上の影響を説明している。
- UI操作後に確認する内部状態を1つ挙げ、`docs/spec`のBR / ACまたはState / Scenarioへ参照を戻している。
- 「購入上限を超えたCartが成立する」など1つのRiskについて、Impact、Likelihood、Priorityを、影響範囲・到達条件・確認順の理由とともに説明している。単純な掛け算だけを根拠にしていない。

### Recovery

Role / State / Seedのどれかを説明できない場合は、Lesson 2〜6を再読し、CartまたはCheckoutの1条件を「Role → 初期State → Action → Expected → 変化する内部State」で書き直します。固定値が見つからない場合は上記SSOTへ戻り、参照先が起動できない・権限がない場合だけ環境上の問題として分けて記録します。

## 完了条件

- Scenario Shopの主要Roleを説明できる。
- 1つ以上のUser Journeyを図示できる。
- CartまたはCheckoutについて正常・異常・境界条件を整理できる。
- 少なくとも1つのRiskについて、Impact、Likelihood、Priorityと判断理由を記録できる。
- Seed Scenarioがテスト自動化へ必要な理由を説明できる。

## 次の行動

[Part 1-3: テスト設計と自動化対象選定](./03_test-design-and-automation-selection.md)へ進み、整理したRiskからTest Caseと適切なTest Layerを選びます。
