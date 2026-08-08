# スプレッドシートによるテスト分析・設計

## 学習目標

- テスト実装より前に、テスト対象とテスト条件を整理できる。
- Google Sheetsなどのスプレッドシートを使い、案件へ持ち運びやすい形でテスト設計を管理できる。
- 手順書ではなく、テスト条件・期待結果・リスク・自動化判断を管理できる。
- 同値分割、境界値分析、デシジョンテーブル、状態遷移などを使ってテスト条件を体系的に導出できる。
- Test Case IDとTest Layer、Tool、実装を紐付けられる。

## 教材

**このモジュールでは、このリポジトリのScenario Shopをテスト対象として使用します。**

主に次を参照します。

- `/guide`
- `src/seeds/metadata.ts`
- Storefront / Customer / Adminの各画面
- `e2e/web/phase1-required.spec.ts`
- `maestro/`

既存テストコードは、最初の分析・設計が終わるまでは正解として参照しません。

## この文書の位置づけ

この文書は、Part 1で繰り返し利用する**Workbookの使い方とテスト設計技法のReference**です。

実際の学習Lessonでは、`part1/02_scenario-shop-analysis.md` と `part1/03_test-design-and-automation-selection.md` の演習に沿ってこのWorkbookを更新します。

この文書整備ではGoogle Sheets実ファイルやCSVを追加しません。教材提供時には、ここで定義した列をもとに複製可能なWorkbookテンプレートを別途用意します。

## なぜスプレッドシートを使うか

このカリキュラムでは、テスト分析・設計の基本ツールとしてGoogle Sheetsを想定します。

理由は次のとおりです。

- Google Workspace環境で利用しやすい。
- QAだけでなく開発者、PdM、運用担当者も閲覧しやすい。
- 特定のテスト管理製品へ知識を依存させない。
- 別案件へ考え方とフォーマットを持ち運びやすい。
- Filter、Sort、入力規則、条件付き書式など最低限の管理機能を使える。

ただし、スプレッドシート自体を目的にしません。案件規模が大きくなり専用テスト管理ツールが適切になった場合でも、ここで学ぶ分析・設計の考え方は再利用できます。

## 手順を大量に書くことを目的にしない

次のような詳細手順だけを大量に並べる管理方法は、この教材の中心にしません。

```text
1. 商品一覧を開く
2. 商品Aをクリックする
3. サイズMをクリックする
4. カートに追加をクリックする
5. メッセージを確認する
```

自動化へつなげるため、より重要なのは次です。

- 何を確認したいか。
- どんな条件で確認するか。
- どんな初期状態が必要か。
- 何が正しければPassか。
- どの程度重要か。
- 自動化に向くか。

## 推奨Workbook構成

教材では次のSheet構成を基本とします。

### `01_テスト対象分析`

| 項目 | 内容 |
| --- | --- |
| 対象領域 | Storefront / Cart / Checkoutなど |
| 機能 | 商品追加、数量変更など |
| Role | Guest / customer / operator / admin |
| 状態 | 通常、在庫切れ、低在庫など |
| 入力 | 商品、数量、支払方法など |
| 出力 | UI表示、Order状態など |
| 関連データ | Cart、Inventory、Orderなど |
| 依存 | Login、Seed、Test Clockなど |

### `02_リスク分析`

| 項目 | 内容 |
| --- | --- |
| Risk ID | 一意な識別子 |
| 対象 | Cart / Paymentなど |
| 失敗内容 | 何が壊れるか |
| 影響 | User / Businessへの影響 |
| 発生可能性 | High / Medium / Low |
| 重要度 | High / Medium / Low |
| 優先確認 | Yes / No |

### `03_テスト観点`

代表的な観点を整理します。

- 正常系
- 異常系
- 境界値
- 状態遷移
- Role / 権限
- 入力Validation
- Error handling
- Persistence
- Responsive
- Accessibility
- Cross-browser

「観点を列挙して終わり」ではなく、後述する設計技法を使って具体的な条件へ変換します。

### `04_テストケース`

| Column | 例 |
| --- | --- |
| Test Case ID | `CART-001` |
| 対象機能 | Cart追加 |
| Risk ID | `RISK-CART-01` |
| テスト条件 | 在庫あり商品をGuestが追加する |
| 初期状態 | `default` |
| 主操作 | 商品詳細からCart追加 |
| 期待結果 | Cartへ1件追加される |
| 設計技法 | 同値分割 / 境界値 / 状態遷移など |
| 種別 | 正常系 |
| 優先度 | High |
| Regression | Yes |

### `05_自動化候補`

| Column | 内容 |
| --- | --- |
| Test Case ID | テストケースとの紐付け |
| Test Layer | Unit / Integration / Repository Contract / Component / Web E2E / Native E2E |
| 自動化 | Yes / No / Later |
| Tool候補 | Vitest / Jest / Playwright / Maestroなど |
| 理由 | 頻度、再現性、重要度など |
| 実行頻度 | PR / main / Nightly / Manual候補 |
| 備考 | 自動化上の制約 |

Test Layerは「どの層でRiskを確認するか」、Tool候補は「その層をどのFramework / Toolで実行するか」を表します。例えばUnitをTool名として記録せず、UnitをTest Layer、VitestなどをTool候補として分けます。

Part 1では実行頻度は参考情報として扱い、PR / main / Nightlyの本格設計はPart 2で学びます。

### `06_自動化対応表`

| Column | 内容 |
| --- | --- |
| Test Case ID | `CART-001` |
| Test Layer | Unit / Integration / Repository Contract / Component / Web E2E / Native E2E |
| Platform | Shared / Web / Android / iOS |
| Tool | Vitest / Jest / Playwright / Maestro / Other |
| 実装 | spec / test / YAML path |
| Status | Not Started / Automated / Needs Fix |
| 備考 | 実装差分、制約など |

`05_自動化候補`で選んだTest LayerとTool候補を、実装後もTest Case ID単位で追跡できるようにします。UI E2Eだけでなく、下位層へ配置したCaseも対応関係を失わないことが目的です。

### `07_実行結果`

学習用の簡易実行記録として使用します。

- 実行日
- Test Case ID
- Platform
- Result
- Failure分類
- Evidence
- Issue / Memo

CI導入後はGitHub Actionsが実行履歴の主要な正本になります。スプレッドシートへすべてのCI実行を手作業で転記する運用は推奨しません。

### `08_改善管理`

- Flaky
- Locator変更頻発
- 重複処理
- Test Data依存
- 実行時間
- 不要テスト
- Regression分類見直し

など、運用フェーズの改善項目を管理します。

## テスト条件を導出する技法

### 1. 同値分割

同じ挙動になると考えられる入力や状態をグループ化し、代表値を選びます。

Cartの数量上限が5だと仮定した場合の例:

| Partition | 条件 | 代表値 |
| --- | --- | --- |
| 無効 | 0以下 | 0 |
| 有効 | 1から5 | 3 |
| 無効 | 6以上 | 6 |

「1、2、3、4、5を全部同じE2Eで試す」のではなく、同じ振る舞いをする範囲を考えます。

### 2. 境界値分析

不具合は境界付近で起きやすいため、同値クラスの端を重点的に確認します。

購入上限5なら、例えば次を検討します。

- 0
- 1
- 5
- 6

実際にどこまでUI E2Eへ置くかはRiskと下位テストのCoverageを見て決めます。

### 3. デシジョンテーブル

複数条件の組み合わせで結果が変わる場合に使います。

条件をまとめすぎるとRuleの違いが見えなくなるため、購入可否では「Login済みか」「Roleがcustomerか」「Accountがactiveか」のように独立した条件を分けます。

例:

| Login済み | Role = customer | Account = active | 在庫あり | 購入上限内 | 期待 |
| --- | --- | --- | --- | --- | --- |
| Yes | Yes | Yes | Yes | Yes | Checkout可能 |
| No | - | - | Yes | Yes | Loginが必要 |
| Yes | No | - | Yes | Yes | Roleにより購入不可 |
| Yes | Yes | No | Yes | Yes | Account状態により拒否 |
| Yes | Yes | Yes | No | Yes | 在庫理由で拒否 |
| Yes | Yes | Yes | Yes | No | 上限理由で拒否 |

`-` は、そのRuleでは結果へ影響しない条件を表します。

Guest、suspended customer、operator、adminを単に「active customerではない」と一括りにせず、**拒否理由や期待結果が異なる条件は分離して整理する**ことが重要です。

組み合わせを機械的に全部E2E化するのではなく、Business RuleとRiskを理解するために使います。

### 4. 状態遷移テスト

Checkout、Payment、Order、Shipmentなどは状態遷移として整理します。

```text
Payment processing
├ succeeded → Order paid
└ declined → Payment failed → retry → succeeded
```

確認するのは「状態」だけではありません。

- 許可される遷移
- 拒否される遷移
- Retry可能な状態
- Reload / Restart後に維持される状態

を考えます。

### 5. Role / 権限Matrix

Roleによって操作可否が変わる場合、Role × 操作を表にします。

| 操作 | Guest | customer | operator | admin |
| --- | --- | --- | --- | --- |
| 商品閲覧 | Yes | Yes | Yes | Yes |
| 購入 | No | Yes | No | No |
| 在庫運用 | No | No | Yes | Yes |
| User管理 | No | No | 制限あり | Yes |

すべての組み合わせをテストするのではなく、権限境界や影響が大きい差分を選びます。

### 6. Scenario / Use-case Test

複数画面を跨ぐBusiness Flowは、単画面テストとは別にTest Scenario / User Journeyとして考えます。

例:

```text
Guestで商品追加
→ Login
→ Guest Cart統合
→ Checkout
→ Payment
→ Order確認
```

Business上重要な連携Riskを確認するために利用します。

ここでいうTest Scenario / User Journeyは、Scenario Shopを特定の初期状態へResetするSeed Scenarioとは別の概念です。

### 発展: 組み合わせ削減

多くの条件がある場合、Pairwiseなどで組み合わせを減らす考え方があります。

ただしPart 1の必須技法にはしません。まず同値分割、境界値、デシジョンテーブル、状態遷移を使いこなせることを優先します。

## 演習1: Cartを分析する

Scenario ShopのCartについて、コードを見る前に実際の画面を操作します。

最低限次を確認します。

- Guestで追加できる。
- 数量を変更できる。
- 削除できる。
- Empty Stateがある。
- 在庫切れがある。
- 低在庫がある。
- 購入上限がある。
- Login時にGuest Cart統合がある。

その後、`01_テスト対象分析`、`02_リスク分析`、`03_テスト観点`を作成します。

## 演習2: テストケースへ落とす

例として次のようなケースを作ります。

| Test Case ID | 条件 | 初期状態 | 設計根拠 | 期待結果 |
| --- | --- | --- | --- | --- |
| CART-001 | 在庫あり商品を追加 | default | 正常系 | Cartへ追加される |
| CART-002 | 在庫切れ商品を追加 | out-of-stock | 状態分割 | 追加できない |
| CART-003 | 購入上限を超える | default | 境界値 | 上限超過が拒否される |
| CART-004 | 商品を削除 | default | 状態遷移 | Empty Stateになる |

ケース数を増やすことより、なぜその条件が必要かを説明できることを重視します。

## 演習3: 自動化対象を選ぶ

各ケースについて、次の観点から自動化可否を判断します。

- 繰り返し実行するか。
- 結果が機械的に判定できるか。
- 初期状態を再現できるか。
- 重要なRegressionか。
- 実行時間と保守コストに見合うか。
- UI E2Eで確認する価値があるか。
- より下位のテストで十分ではないか。

## トレーサビリティ

テストコードには可能な範囲でTest Case IDを対応付けます。

例:

```ts
// CART-002

test("在庫切れ商品はカートへ追加できない", async ({ page }) => {
  // ...
});
```

Test Case IDをコードへ埋め込む方式、Test titleへ含める方式、Annotationを使う方式などは案件によって選択できます。

一方、UI要素を特定するUI Test ID / `testId` は別の識別子です。Test Case IDと混同しません。

重要なのは、スプレッドシートの設計と自動化コードの関係を追えることです。

## 確認問題

1. 詳細な操作手順を書きすぎると、自動化設計でどんな問題が起きるか。
2. 同値分割と境界値分析はどう違うか。
3. 複数のBusiness Ruleが組み合わさるとき、デシジョンテーブルが有効なのはなぜか。
4. Login、Role、Account状態を1条件へまとめるとどんなRuleを見落としやすいか。
5. `out-of-stock` Seed Scenarioはどのテスト条件を安定して再現するために使えるか。
6. 重要なテストでも自動化しない判断があり得るのはなぜか。
7. UI E2EではなくUnit / Integration Testへ寄せるべき条件は何か。
8. Test Case IDとコードを紐付けるメリットは何か。

## 完了条件

- Scenario Shopの1機能以上についてテスト対象分析を作成している。
- リスクとテスト観点を整理している。
- 同値分割、境界値、デシジョンテーブル、状態遷移のうち3技法以上をScenario Shopへ適用している。
- 5件以上のテストケースを作成している。
- 複数条件のRuleをデシジョンテーブルで分離して説明できる。
- 各ケースについて自動化可否と理由を書いている。
- 少なくとも1件についてPlaywrightまたはMaestroへ落とす前提を説明できる。