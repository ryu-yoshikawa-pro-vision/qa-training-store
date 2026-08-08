# Part 1-3: テスト設計と自動化対象選定

## 学習目標

- テスト対象分析からテスト条件へ落とし込める。
- 同値分割、境界値分析、デシジョンテーブル、状態遷移、Role差分をScenario Shopへ適用できる。
- すべてをUI E2Eにせず、どの確認をどのテスト層へ置くか考えられる。
- 自動化対象を頻度、Risk、再現性、判定可能性、保守コストから選定できる。
- スプレッドシートのTest Case IDと後続のPlaywright / Maestro実装を紐付ける準備ができる。

## 教材

**このモジュールでは、このリポジトリのScenario Shopを使用します。**

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

## Lesson 7: テストピラミッドを機械的に使わない

このRepositoryにはUnit、Integration、Repository Contract、Component、E2Eがあります。

すべてをPlaywrightへ寄せるのではなく、確認したいRiskに対して最も適切な層を考えます。

例えば価格計算の細かな組み合わせはUnit Testが向きます。一方、Guest Cart統合からCheckoutへ進めることはE2Eで確認する価値があります。

重要なのは「E2E本数を増やす」ことではなく、「どの層で確認すると最も速く、安定し、意味があるか」を考えることです。

## Lesson 8: 自動化対象選定

各テストケースについて次を評価します。

- 実行頻度
- Business Risk
- Regression価値
- 初期状態の再現性
- Pass / Fail判定の明確さ
- 自動化実装コスト
- 保守コスト
- 実行時間
- UI E2Eで確認する必要性

### 例

| Test | 判断 | 理由 |
| --- | --- | --- |
| Login成功 | 自動化 | 高頻度、再現可能、判定明確 |
| Checkout成功 | 自動化 | Business CriticalなRegression |
| 在庫切れ | 自動化 | Seedで安定再現可能 |
| UIの好み | 原則手動併用 | 完全な機械判定が難しい |
| 一度限りの試作画面 | 状況次第 | 保守コストを回収できない可能性 |

## Lesson 9: WebとNativeの対象を分ける

同じBusiness FlowでもWebとNativeで実行環境が異なります。

Part 1後半ではPlaywrightとMaestroを使いますが、この段階では次を考えます。

- Webだけで保証すればよいものは何か。
- Native固有UIとして確認すべきものは何か。
- 同じ業務契約を両Platformで確認すべきものは何か。

すべてのケースをWeb / Android / iOSへ機械的に複製しないことも重要です。

## ハンズオン1: Cartのテスト条件を体系的に導出する

スプレッドシートへ最低10件作成します。

必須:

- 同値分割を1つ以上
- 境界値を1つ以上
- 状態差分を1つ以上
- Role差分を1つ以上
- User Journeyを1つ以上

最低限、正常追加、削除、在庫切れ、低在庫または購入上限、Guest Cart統合を含めます。

各Caseには、Test Case IDだけでなく「どのRisk / 設計技法から導出したか」を記録します。

## ハンズオン2: Checkout / Paymentの状態遷移

Payment成功・拒否・再試行を含む状態遷移図を作成します。

その後、どこをUI E2Eで自動化し、どこを下位テストへ委ねるか決めます。

## ハンズオン3: Role / Account状態を分離したデシジョン整理

購入可否または管理操作を1つ選び、最低限次を独立条件として整理します。

- Login状態
- Role
- Account状態
- 対象データの状態

「customerではない」「activeではない」のように異なる拒否理由を1条件へ潰さず、期待結果が異なるRuleを分けます。

## ハンズオン4: 自動化対象選定

設計したケースについて、`Yes / No / Later` を判断し、必ず理由を書きます。

「重要だから全部Yes」ではなく、テスト層や実行コストも考えます。

## 確認問題

1. 同値分割と境界値分析を組み合わせる理由は何か。
2. デシジョンテーブルはどんな仕様で有効か。
3. Login、Role、Account状態を1つの条件へまとめると何を見落としやすいか。
4. 正常系だけをE2EにするとどんなRiskが残るか。
5. UI E2Eへ置かなくてもよいテストの例を挙げる。
6. 自動化可能でも自動化しない判断があるのはなぜか。
7. Web / Android / iOSへ同じケースをすべて複製しない方がよい理由は何か。

## 完了条件

- 10件以上のテストケースをスプレッドシートへ設計している。
- 同値分割、境界値、デシジョンテーブル、状態遷移のうち3技法以上を適用している。
- 正常、異常、Role、User Journeyの観点が含まれている。
- デシジョンテーブルで複数条件を適切に分離し、異なる拒否理由を説明できる。
- 各ケースのRisk / 設計根拠、自動化判断、理由を記録している。
- 少なくとも1件についてUI E2Eではなく別テスト層を選ぶ理由を説明できる。
