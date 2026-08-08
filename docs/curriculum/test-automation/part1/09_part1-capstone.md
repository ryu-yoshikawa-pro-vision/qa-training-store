# Part 1-9: 総合演習

## 学習目標

Part 1で学んだ内容を、1つの課題に対して最初から最後まで適用します。

受講者は、Scenario Shopの対象機能について次を自力で進めます。

1. テスト対象を調査する。
2. スプレッドシートで分析・設計する。
3. 自動化対象を選定する。
4. PlaywrightまたはMaestroで実装する。
5. テストを実行する。
6. Failureを分析する。
7. 必要に応じてコードを改善する。
8. テスト資産を整理する。

## 教材

**この総合演習では、このリポジトリのScenario Shopだけを使用します。**

既存のPlaywright / Maestroコードは、最初の設計と実装を終えるまで正解としてコピーしません。最後に比較教材として使用します。

## 推奨課題

標準課題はReview機能とします。

対象例:

- delivered Orderの商品だけReview可能
- Review投稿
- Review編集
- Review削除
- Hidden / Deleted状態
- Review Summary
- Customer / Admin間の状態差

講師判断でCart、Checkout、Payment、Inventoryなどへ変更しても構いません。ただし同じScenario Shopを使用します。

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

既存テストコードはまだ見ません。

## Phase 2: スプレッドシート設計

次のSheetを更新します。

- `01_テスト対象分析`
- `02_リスク分析`
- `03_テスト観点`
- `04_テストケース`
- `05_自動化候補`

最低10件のテスト条件を作成します。

ケース数よりも、Riskと条件の対応を重視します。

## Phase 3: 自動化対象選定

すべてをUI E2Eにしません。

各ケースについて次を判断します。

- Playwright
- Maestro
- 下位テストが適切
- 手動確認を残す
- 今回は自動化しない

判断理由を記録します。

## Phase 4: Playwright実装

最低3件をPlaywrightで実装します。

必須条件:

- Scenario / Resetを使用する。
- 正常系だけにしない。
- Test IDとテスト設計を対応付ける。
- 意味のあるLocatorとAssertionを使う。
- 固定待機を基本戦略にしない。

## Phase 5: Maestro実装

Nativeにも価値があるケースを最低1件選び、Maestroへ実装します。

Nativeで確認する価値がないと判断した場合は、その理由を説明し、代わりに別のScenario Shop Native Flowを1件実装します。

## Phase 6: Failure分析

最低1回は意図的または実際のFailureを分析します。

次を記録します。

- Failure内容
- 分類
- Evidence
- 原因仮説
- 確認結果
- 修正

## Phase 7: テスト管理

実装後、コードを棚卸しします。

確認項目:

- 重複処理
- Locator重複
- Test Data Setup重複
- 長すぎるTest
- Assertionが分かりにくい箇所
- Flaky Risk
- spec配置
- Naming

必要ならHelper、POM、Component Object、Fixture、Flow、Scenarioを使って改善します。

ただし、抽象化すること自体を目的にしません。

## Phase 8: 既存Repositoryとの比較

最後にScenario Shopの既存実装を読みます。

比較するもの:

- 同じ機能を確認する既存Playwright Test
- 既存Fixture
- 既存Scenario
- 既存Maestro Flow

次をレポートします。

1. 自分の設計の良い点
2. 既存実装の良い点
3. 自分の実装で不足していた点
4. 既存実装をそのまま採用しない方がよい点があるか
5. 改善するならどうするか

## 提出物

- テスト対象分析
- リスク分析
- テスト観点
- テストケース
- 自動化対象選定
- Playwright Test
- Maestro Flow
- Failure分析メモ
- テスト管理・改善記録
- 既存Repositoryとの比較結果

## 評価観点

### 分析

- 画面一覧だけでなく状態・Role・Riskを見ているか。

### 設計

- 正常系だけに偏っていないか。
- 境界・異常・状態遷移が必要に応じて含まれているか。

### 自動化判断

- 何でもE2Eにしていないか。
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
- 問題に応じてHelper / POM / Fixture / Flowなどを選んでいるか。

## 完了条件

受講者が次を自分の言葉で説明できることをPart 1完了条件とします。

- 何をテストしたか。
- なぜそのテストが必要か。
- なぜ自動化したか、またはしなかったか。
- なぜPlaywright / Maestroを選んだか。
- どのように初期状態を再現したか。
- Failure時に何を確認したか。
- テストが増えたとき何を改善したか。

Part 1完了時点では、GitやGitHub、CIを使わなくてもこの一連の活動を実施できる状態を目指します。
