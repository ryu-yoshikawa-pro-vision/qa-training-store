# Part 1-9: 総合演習

## 学習目標

Part 1で学んだ内容を、1つの課題に対して最初から最後まで適用します。

受講者は、Scenario Shopの対象機能について次を自力で進めます。

1. テスト対象を調査する。
2. スプレッドシートで分析・設計する。
3. 自動化対象を選定する。
4. PlaywrightとMaestroで実装する。
5. テストを実行する。
6. Failureを分析する。
7. 必要に応じてコードを改善する。
8. テスト資産を整理する。

## 教材

**この総合演習では、このリポジトリのScenario Shopだけを使用します。**

既存のPlaywright / Maestroコードは、最初の設計と実装を終えるまで正解としてコピーしません。最後に比較教材として使用します。

## 標準課題: Cart機能

標準課題はCart機能とします。

Cartを標準にする理由は、現在のScenario ShopでWebとNativeの両方に実装があり、Part 1で学んだ内容を同じBusiness Domainで最後までつなげられるためです。

対象例:

- 商品のCart追加
- Variation選択
- 数量変更
- 商品削除
- Empty State
- 在庫切れ
- 低在庫
- 購入上限
- Guest状態
- Nativeでの再起動・Persistence
- Web / Nativeの表示・操作差分

CartからLogin以降へ進むGuest Cart統合は、現在のNative実装範囲や教材実装時点の状態に応じて発展課題として扱います。

### 発展課題

Web側でより複雑な業務状態を扱いたい場合は、次を発展課題として利用できます。

- Checkout / Payment
- Review
- Inventory
- Cross-role Lifecycle

ただしPart 1標準課題では、WebとNativeで同一のBusiness対象を比較できることを優先します。

## Phase 1: テスト対象分析

最初にアプリを操作し、次を整理します。

- 関連画面
- Role
- 初期状態
- 関連データ
- 状態遷移
- 正常系
- 異常系
- 境界値
- 重要なRisk
- Web / Native共通条件
- Platform固有条件

既存テストコードはまだ見ません。

## Phase 2: スプレッドシート設計

次のSheetを更新します。

- `01_テスト対象分析`
- `02_リスク分析`
- `03_テスト観点`
- `04_テストケース`
- `05_自動化候補`

最低10件のテスト条件を作成します。

最低限、同値分割、境界値、状態差分のいずれかを明示的に使い、Riskと設計根拠を記録します。

ケース数よりも、Riskと条件の対応を重視します。

## Phase 3: 自動化対象選定

すべてをUI E2Eにしません。

各ケースについて次を判断します。

- Playwright
- Maestro
- Web / Native両方
- 下位テストが適切
- 手動確認を残す
- 今回は自動化しない

判断理由を記録します。

特に「同じBusiness RuleだからWebとNativeへ全件複製する」という判断を避け、Platform固有Riskと共通Regressionを分けます。

## Phase 4: Playwright実装

Training用実行境界で最低3件をPlaywrightへ実装します。

必須条件:

- 正常系だけにしない。
- Test Case IDとテスト設計を対応付ける。
- 意味のあるLocatorとAssertionを使う。
- 固定待機を基本戦略にしない。
- 必要な場合はSeed Scenario / Resetを使用する。

## Phase 5: Maestro実装

Android Emulator上で最低2件をMaestroへ実装します。

必須条件:

- Playwrightでも確認した共通Business条件を1件以上含む。
- Native固有の操作または状態確認を1件以上含む。
- Stable UI Test IDを利用する。
- 必要に応じてTest Control / Deep Linkを利用する。

その後、WebとNativeで次を比較します。

- Test Conditionは共通か。
- 操作はどこが異なるか。
- Assertionは同じ意味か。
- Nativeだけで必要な準備は何か。

## Phase 6: Failure分析

最低1回は意図的または実際のFailureを分析します。

次を記録します。

- Failure内容
- 分類
- Evidence
- 原因仮説
- 確認結果
- 修正

PlaywrightとMaestroでEvidenceの種類が違うことも比較します。

## Phase 7: テスト管理

実装後、コードを棚卸しします。

確認項目:

- 重複処理
- Locator / UI Test IDの重複
- Test Data Setup重複
- 長すぎるTest
- Assertionが分かりにくい箇所
- Flaky Risk
- spec / Maestro Flow配置
- Naming
- Web / Nativeで不要に重複しているCase

必要ならHelper、POM、Component Object、Fixture、Automation Flow、Seed Scenarioを使って改善します。

ただし、抽象化すること自体を目的にしません。

## Phase 8: 既存Repositoryとの比較

最後にScenario Shopの既存実装を読みます。

比較するもの:

- Cartを確認する既存Playwright Test
- 既存Fixture
- 既存Seed Scenario
- `maestro/native-cart.yaml`
- Cartに関連する他のNative Flow

次をレポートします。

1. 自分の設計の良い点
2. 既存実装の良い点
3. 自分の実装で不足していた点
4. Web / Nativeで共通化できる考え方
5. Platformごとに分けるべき部分
6. 既存実装をそのまま採用しない方がよい点があるか
7. 改善するならどうするか

## 提出物

- テスト対象分析
- リスク分析
- テスト観点
- テストケース
- 自動化対象選定
- Playwright Test
- Maestro Flow
- Web / Native比較
- Failure分析メモ
- テスト管理・改善記録
- 既存Repositoryとの比較結果

## 評価観点

### 分析

- 画面一覧だけでなく状態・Role・Riskを見ているか。
- Web / Nativeで共通するBusiness RuleとPlatform固有Riskを分けているか。

### 設計

- 正常系だけに偏っていないか。
- 境界・異常・状態遷移が必要に応じて含まれているか。
- テスト技法からCaseを導出しているか。

### 自動化判断

- 何でもE2Eにしていないか。
- Web / Nativeへ機械的に全件複製していないか。
- 自動化しない判断にも理由があるか。

### Playwright / Maestro

- 安定した要素識別を使っているか。
- 初期状態が再現可能か。
- Assertionがテスト目的と一致しているか。

### Failure分析

- RetryやTimeout延長だけで終わっていないか。
- Evidenceから原因を調べているか。

### テスト管理

- 共通化しすぎていないか。
- 問題に応じてHelper / POM / Fixture / Automation Flowなどを選んでいるか。

## 完了条件

受講者が次を自分の言葉で説明できることをPart 1完了条件とします。

- 何をテストしたか。
- なぜそのテストが必要か。
- どのテスト設計技法からCaseを導出したか。
- なぜ自動化したか、またはしなかったか。
- なぜPlaywright / Maestroを選んだか。
- Web / Nativeのどこを共通化し、どこを分けたか。
- どのように初期状態を再現したか。
- Failure時に何を確認したか。
- テストが増えたとき何を改善したか。

Part 1完了時点では、GitやGitHub、CIを使わなくてもこの一連の活動を実施できる状態を目指します。
