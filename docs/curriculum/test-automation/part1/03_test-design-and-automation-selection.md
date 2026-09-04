# Part 1-3: テスト設計と自動化対象選定

## 学習目標

- テスト対象分析からテスト条件へ落とし込める。
- 同値分割、境界値分析、デシジョンテーブル、状態遷移、Role差分をScenario Shopへ適用できる。
- Unit、Integration、Repository Contract、Component、Web E2E、Native E2Eの役割を最低限説明できる。
- すべてをUI E2Eにせず、どの確認をどのテスト層へ置くか考えられる。
- 自動化対象を頻度、Risk、再現性、判定可能性、保守コストから選定できる。
- スプレッドシートのTest Case IDと後続のPlaywright / Maestro実装を紐付ける準備ができる。

## 教材

**このモジュールでは、このリポジトリのScenario Shopを使用します。**

まず [`docs/spec/README.md`](../../../spec/README.md) から対象FeatureのBR / ACを読み、Workbookへ `spec_ref`、`br_ids`、`ac_ids`を記録します。既存TestのAssertionを期待結果のOracleへ逆変換しません。

主にCart、Checkout、Payment、Role制御を題材にし、`src/seeds/metadata.ts` のSeed Scenarioと対応させます。

Workbookの列定義と各設計技法の詳細は `../01_spreadsheet-test-design.md` をReferenceとして使用します。このモジュールでは、技法を知ることではなく、Scenario Shopの仕様・状態へ適用してテストケースへ変換することを中心にします。

## Lesson 1: 分析結果をテスト条件へ変換する

テスト対象分析では「何があるか」を整理しました。ここでは「何をどの条件で確認するか」へ変換します。

例としてCartを考えます。

```text
機能: Cart追加
状態: 在庫あり
Role: Guest
操作: 商品を追加
期待結果: Cartへ追加される
```

この組み合わせがテスト条件になります。

重要なのは、思いついたケースを並べるのではなく、仕様上の入力範囲、状態、Business Rule、Role差分から条件を導出することです。

## Lesson 2: 同値分割と境界値を適用する

Cart数量や購入上限を題材に、入力範囲を同じ結果になるグループへ分けます。

購入上限が5なら、例えば次を考えます。

```text
0以下: 無効
1〜5: 有効
6以上: 無効
```

そのうえで境界付近の代表値として、0、1、5、6などを選びます。

すべての値をUI E2Eへ持ち込むのではなく、下位テストで十分な組み合わせと、実際のUI Journeyとして確認する価値がある境界を分けます。

## Lesson 3: デシジョンテーブルでBusiness Ruleを整理する

購入可否、Login、Role制御など、複数条件の組み合わせで結果が変わるものを表にします。

このとき、「active customerか」のように複数の意味を1条件へまとめすぎないことが重要です。Guest、suspended customer、operator、adminでは拒否理由や期待結果が異なるため、Login、Role、Account状態を分けます。

例:

| Login済み | Role = customer | Account = active | 在庫あり | 上限内 | 期待 |
| --- | --- | --- | --- | --- | --- |
| Yes | Yes | Yes | Yes | Yes | Checkout可能 |
| No | - | - | Yes | Yes | Loginが必要 |
| Yes | No | - | Yes | Yes | Roleにより購入不可 |
| Yes | Yes | No | Yes | Yes | Account状態により拒否 |
| Yes | Yes | Yes | No | Yes | 在庫理由で拒否 |
| Yes | Yes | Yes | Yes | No | 上限理由で拒否 |

`-` は、そのRuleでは結果へ影響しない条件です。

目的は組み合わせを全部E2E化することではありません。Ruleを可視化し、欠けている条件、重複したCase、条件をまとめすぎて隠れている期待結果を見つけます。

## Lesson 4: 状態遷移を設計する

CheckoutやOrderは状態遷移として捉えます。

例:

```text
Cart
↓
Checkout started
↓
Payment processing
├ succeeded → Order paid
└ declined → Payment failed → retry
```

状態遷移から次を考えます。

- 正常な遷移
- Failure遷移
- Retry
- Reload後の復元
- 無効な状態での操作拒否

Happy Pathだけでなく、途中状態からの回復もTest Conditionとして扱います。

## Lesson 5: Roleと権限をMatrix化する

同じ操作でもRoleによって期待結果が変わります。

例:

- GuestはAdminへ入れない。
- customerは購入できる。
- operatorは運用操作を行えるがAdmin固有操作には制約がある。
- adminはUser管理を行えるが最後のAdmin保護がある。

Role × 操作のMatrixを作り、すべての組み合わせではなく、権限境界とBusiness Impactが大きい組み合わせを選びます。

## Lesson 6: Test Scenario / User Journeyを設計する

複数画面を跨ぐ重要なBusiness Flowは、単画面Testとは別にTest Scenario / User Journeyとして考えます。

例:

```text
Guestで商品追加
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
```

個々のValidationを全て1本へ詰め込むのではなく、「複数機能の連携が成立すること」を確認するJourneyとして設計します。

ここでいうTest Scenario / User Journeyは、`default` や `out-of-stock` のようなSeed Scenarioとは別の概念です。

## Lesson 7: テスト層の役割を理解する

自動化対象を選ぶ前に、このRepositoryで使われている主なテスト層の役割を最低限整理します。

ここで厳密なテスト分類理論を暗記することは目的にしません。**「このRiskをどの層で確認すると、速く、安定し、原因を特定しやすいか」**を判断するための共通語彙として扱います。

| Test Layer | 主に確認するもの | Scenario Shopでの例 | 特徴 |
| --- | --- | --- | --- |
| Unit | 小さな関数・Business Logic | 価格、割引、数量上限などの計算Rule | 速く、条件を細かく試しやすい |
| Integration | 複数Moduleや処理の連携 | Checkout処理、PaymentとOrder状態の連携 | UI全体を通さず連携Riskを確認しやすい |
| Repository Contract | Data Access実装が共通契約を満たすこと | Repositoryの保存・取得・更新契約 | Storage実装差による破綻を検出する |
| Component | UI Component単位の表示・操作 | Form、Product Card、Native Componentなど | Browser全体のJourneyより狭くUI挙動を確認できる |
| Web E2E | Browser上のUser Journeyと機能連携 | Guest Cart統合、Login、Checkout | 実利用に近いが実行CostとFailure要因が増える |
| Native E2E | Nativeアプリ上のUser Journey | MaestroによるCart操作、Persistence | OS / Emulator / Native UI固有Riskを確認できる |

このRepositoryにはContract Testもあります。Contract Testは、APIやWorkflowなど「満たすべき契約・構造」が崩れていないことを確認する考え方であり、対象によって意味が異なります。ここではRepository固有の実装名を暗記するより、**何の契約を保証しているTestか**を読むことを重視します。

### どの層へ置くか考える

例えば購入上限が5というRuleを確認するとします。

細かな入力値 `0 / 1 / 2 / 3 / 4 / 5 / 6` をすべてBrowser E2Eで確認する必要はありません。

```text
Business Ruleそのもの
→ Unitなどで細かく確認

Cart UIで上限超過時に正しく拒否される代表条件
→ Web E2E

Native固有UIでも同じRuleが正しくUserへ伝わることが重要
→ 必要な代表条件だけNative E2E
```

一方、Guest CartがLogin後にCustomer Cartへ正しく統合され、そのままCheckoutへ進めることは複数機能の連携Riskなので、Web E2Eで確認する価値があります。

重要なのは、**UnitがE2Eより優れている、E2Eが最も本番に近いから全部E2Eにする、といった序列で考えないこと**です。

選択時には次を見ます。

- 検出したいRisk
- 必要な実環境の範囲
- 実行速度
- 再現性
- Failure原因の特定しやすさ
- 下位層ですでに十分確認できているか
- Browser / Nativeを通すことで追加で確認できる価値

## Lesson 8: テストピラミッドを機械的に使わない

テスト層を理解しても、「上位Testを必ず少なくする」といった図の形をそのままルールにはしません。

Scenario ShopのRiskに対して、最も適切な層を選びます。

例えば価格計算の細かな組み合わせはUnit Testが向きます。一方、Guest Cart統合からCheckoutへ進めることはE2Eで確認する価値があります。

重要なのは「E2E本数を増やす」「ピラミッドの形へ合わせる」ことではなく、「どの層で確認すると最も速く、安定し、意味があるか」を考えることです。

## Lesson 9: 自動化対象選定

各テストケースについて次を評価します。

- 実行頻度
- Business Risk
- Regression価値
- 初期状態の再現性
- Pass / Fail判定の明確さ
- 自動化実装コスト
- 保守コスト
- 実行時間
- どのテスト層で確認するのが適切か
- UI E2Eで確認する追加価値があるか

### 例

| Test | 判断 | 理由 |
| --- | --- | --- |
| Login成功 | 自動化 | 高頻度、再現可能、判定明確 |
| Checkout成功 | 自動化 | Business CriticalなRegression |
| 在庫切れ | 自動化 | Seed Scenarioで安定再現可能 |
| UIの好み | 原則手動併用 | 完全な機械判定が難しい |
| 一度限りの試作画面 | 状況次第 | 保守コストを回収できない可能性 |

## Lesson 10: WebとNativeの対象を分ける

同じBusiness FlowでもWebとNativeで実行環境が異なります。

Part 1後半ではPlaywrightとMaestroを使いますが、この段階では次を考えます。

- Webだけで保証すればよいものは何か。
- Native固有UIとして確認すべきものは何か。
- 同じ業務契約を両Platformで確認すべきものは何か。

すべてのケースをWeb / Android / iOSへ機械的に複製しないことも重要です。

## ハンズオン1: Cartのテスト条件を体系的に導出する

Practice Volumeの目安として10件程度のTest Caseを設計します。ただし、件数自体を完了条件にはしません。

Risk / Specificationに応じて、同値分割、境界値、状態差分、Role差分、User Journeyから必要な観点・techniqueを選びます。すべてのtechniqueを使うこと自体は目的にしません。

最低限、代表的な正常・異常または境界、Roleまたは状態差分、User Journeyを含め、各CaseにTest Case IDだけでなく「どのRisk / 設計techniqueから導出したか」を記録します。

## ハンズオン2: Checkout / Paymentの状態遷移

Payment成功・拒否・再試行を含む状態遷移図を作成します。

その後、どこをUI E2Eで自動化し、どこをUnit / Integrationなどの下位テストへ委ねるか決めます。

選んだテスト層について、「その層で何を保証し、UI E2Eで何を追加確認するか」を記録します。

## ハンズオン3: Role / Account状態を分離したデシジョン整理

購入可否または管理操作を1つ選び、最低限次を独立条件として整理します。

- Login状態
- Role
- Account状態
- 対象データの状態

「customerではない」「activeではない」のように異なる拒否理由を1条件へ潰さず、期待結果が異なるRuleを分けます。

## ハンズオン4: 自動化対象とテスト層を選定する

設計したケースについて、`Yes / No / Later` を判断し、必ず理由を書きます。

自動化するCaseは、さらにどのテスト層で確認するかを選びます。

少なくとも1件はUI E2E以外の層を選び、次を説明します。

- なぜその層が適切か。
- UI E2Eへ同じ条件を重複して持たせる必要があるか。
- E2Eで追加確認するとしたら何を確認するか。

「重要だから全部E2E」「高速だから全部Unit」のどちらにも寄せず、Riskと確認範囲から判断します。

## 確認問題

1. 同値分割と境界値分析を組み合わせる理由は何か。
2. デシジョンテーブルはどんな仕様で有効か。
3. Login、Role、Account状態を1つの条件へまとめると何を見落としやすいか。
4. Unit TestとWeb E2Eでは、同じBusiness Ruleを確認するとき何が異なるか。
5. Component TestとE2Eを使い分ける観点は何か。
6. 正常系だけをE2EにするとどんなRiskが残るか。
7. UI E2Eへ置かなくてもよいテストの例を挙げる。
8. 自動化可能でも自動化しない判断があるのはなぜか。
9. Web / Android / iOSへ同じケースをすべて複製しない方がよい理由は何か。

## 自己確認とRecovery

代表的な1件について、BR / AC、Risk、条件分離、Test Layer / Tool、自動化判断、理由がつながっていることを確認します。複数Case・複数techniqueを使うことはPractice Volumeとして役立ちますが、数を満たすこと自体を設計の完了条件にはしません。

条件を分けた理由を説明できない場合は、Lesson 2〜6へ戻り、異なるExpected Behaviorを生む条件を分離します。Layerの選定で迷う場合は、Lesson 7〜10へ戻り、Risk、確認範囲、実行Costを比較します。次はPart 1-4で、選んだWeb automation caseを最小コードへ落とします。

## 完了条件

- 代表的なTest Caseについて、BR / AC、Risk、選択した設計technique、期待結果のつながりを説明できる。
- 使用した設計techniqueをRisk / Specificationに応じて選んだ理由を説明でき、使わなかったtechniqueを件数合わせのために追加していない。
- 正常系に加え、異常または境界、Roleまたは状態差分、User Journeyの代表的なRiskをTest Caseへ落とし込める。
- Unit、Integration、Repository Contract、Component、Web E2E、Native E2Eの主な違いを説明できる。
- 各ケースのRisk / 設計根拠、自動化判断、理由を記録している。
- 少なくとも1件についてUI E2Eではなく別テスト層を選び、その層で何を保証するか説明できる。