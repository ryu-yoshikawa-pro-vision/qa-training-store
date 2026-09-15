# Review Workflow（レビューWorkflow）

## 使う場面

- `/review`
- ユーザーからのレビュー依頼
- 実装完了前の自己レビュー

## Do not use（使わない場面）

- 実装前の設計相談
- 要件整理やタスク分解が主目的のとき
- 差分がなく、単にコード説明だけが必要なとき

## Phase 1: diff triage（差分の仕分け）

### Goal（目的）

- 差分のどこに本当の危険があるかを仕分けし、深掘り対象を絞る。

### Diff classification（差分の分類）

- 仕様変更
- バグ修正
- リファクタリング
- テスト変更
- 設定変更
- 依存更新
- ドキュメント変更

### High-risk areas（高リスク領域）

- 認証／権限
- 永続化／移行
- 非同期処理の順序
- 契約変更
- 例外処理
- キャッシュ／状態
- feature flagの分岐

依頼された変更に関係する場合は、性能と開発者体験もレビュー観点に含めます。

### What needs deep review（深いレビューが必要なもの）

- 正しさの高リスク
- セキュリティの高リスク
- 回帰の高リスク
- テスト不足のリスク

### Potential missing tests（不足する可能性があるテスト）

- 失敗経路
- 境界値
- 権限差分
- flagのON／OFF
- 呼び出し元の契約変更

## Phase 2: deep review（深いレビュー）

### correctness（正しさ）

- 条件分岐の抜け
- null / undefined / empty の扱い漏れ
- 境界値の破綻
- 非同期処理の順序問題
- 例外時の契約不一致
- 変更前後で戻り値や副作用が変わっていないか

### security（セキュリティ）

- 権限チェックの抜け
- 機密情報の露出
- 入力検証不足
- インジェクションや XSS / CSRF 相当経路
- 安全でないログ出力

### behavioral regression（動作回帰）

- 既存フローの前提を壊していないか
- 呼び出し元の期待契約が変わっていないか
- feature flag の ON/OFF 両方で成立するか
- cache や state の整合性が保たれるか

### missing tests（テスト不足）

- 変更内容に対して必要なテストが足りているか
- 失敗系、境界値、権限差分が未検証ではないか
- 既存テストの意図が変更で崩れていないか

### maintainability（保守性）

- 責務混在
- 副作用の散乱
- 不自然な抽象化
- 将来の修正を難しくする暗黙ルール

## 出力ルール

- findings-first（指摘を先に示す形式）で返す。
- severityの高い順に並べる。
- 各 finding に根拠、影響、ファイル参照を付ける。
- `Suggested fix` は方向性を短く示す。
- 好みだけの指摘や根拠の弱い推測は finding にしない。
- 根拠が弱い論点は `Open questions` に回す。
- 問題がない場合も残余リスクと未実施検証を明記する。
- review-onlyでは、リポジトリから提供されるレビュー結果保存方針が要求しない限り、永続的なレポートファイルを作らない。

## Required review output（必須のレビュー出力）

各findingには次の項目を使い、通常の出力をレビュー可能な状態に保ちます。

- Severity
- Title
- Location
- Why it matters
- Evidence
- Suggested fix
- Open questions
- Verdict
- confidence

通常のレビュー出力はfindingsです。findingsがないレビューでも、残るリスクと未検証領域を記載します。永続的なレポートは明示的な依頼またはRepositoryの`Review persistence policy`が求める場合だけ作成し、具体的な保存先はRepositoryから提供される情報から取得します。このSkillのWorkflowには含めません。

## Report file generation policy（レポートファイルの作成方針）

- 許可: ユーザーが「レポートとして保存」「調査レポートを作成」など保存を明示した場合、計画 DoD にレポートファイルが明記されている場合、複数ソース調査・監査・検証結果を後で参照する永続的な成果物として残す必要がある場合。
- 許可しない: review-only、plan-only、状態更新、軽い確認、通常の証跡取得コマンドの結果、Runの進捗記録、チャットで完結する評価。
- レビューのみと計画のみでは、提供されたRepository policyが求めない限り永続的なレポートファイルを作成しません。
- 具体的な保存先、命名、保持期間、active Runのレポートの扱いはRepositoryの`Review persistence policy`から提供されます。
- 判断に迷う場合はレポートファイルを作らず、チャット返答とactive Runのレポートに留める。

## Failure modes（失敗モード）

- triage を飛ばして変更量だけで優先順位を決める
- 差分起因でない既存問題を findings に混ぜる
- 好みベースのコメントで findings を埋める
- `Why it matters` や `Evidence` が弱く、修正の必要性が伝わらない
- 未確認事項を finding にして confidence を偽装する
- review-onlyで不要な永続的なレポートファイルを作る
