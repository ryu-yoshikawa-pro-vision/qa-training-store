# レビューWorkflow

## 既存validatorが参照する固定section名

次の英語名は既存validatorとの互換性のため保持します。本文では対応する日本語見出しを使用します。

`diff triage`、`Diff classification`、`High-risk areas`、`Potential missing tests`、`Open questions`、`Failure modes`、`Report file generation policy`

## 使う場面

- `/review`
- ユーザーからのレビュー依頼
- 実装完了前の自己レビュー

## 使わない場面

- 実装前の設計相談
- 要件整理やタスク分解が主目的のとき
- 差分がなく、単にコード説明だけが必要なとき

## Phase 1: diffの仕分け

### Goal（目的）

- 差分のどこに本当の危険があるかを仕分けし、深掘り対象を絞る。

### Diffの分類

- 仕様変更
- バグ修正
- リファクタリング
- テスト変更
- 設定変更
- 依存更新
- ドキュメント変更

### 高リスク領域

- auth / permission
- persistence / migration
- async ordering
- contract change
- exception handling
- cache / state
- feature flag branches

依頼された変更に関係する場合は、performanceとdeveloper experienceもレビュー観点に含めます。

### 深いレビューが必要なもの

- correctness high risk
- security high risk
- regression high risk
- test gap risk

### 不足する可能性があるテスト

- failure paths
- boundary values
- permission differences
- flag on/off
- call-site contract changes

## Phase 2: 深いレビュー

### 正しさ

- 条件分岐の抜け
- null / undefined / empty の扱い漏れ
- 境界値の破綻
- 非同期処理の順序問題
- 例外時の契約不一致
- 変更前後で戻り値や副作用が変わっていないか

### セキュリティ

- 権限チェックの抜け
- 機密情報の露出
- 入力検証不足
- インジェクションや XSS / CSRF 相当経路
- 安全でないログ出力

### 動作回帰

- 既存フローの前提を壊していないか
- 呼び出し元の期待契約が変わっていないか
- feature flag の ON/OFF 両方で成立するか
- cache や state の整合性が保たれるか

### テスト不足

- 変更内容に対して必要なテストが足りているか
- 失敗系、境界値、権限差分が未検証ではないか
- 既存テストの意図が変更で崩れていないか

### 保守性

- 責務混在
- 副作用の散乱
- 不自然な抽象化
- 将来の修正を難しくする暗黙ルール

## 出力ルール

- findings-first で返す。
- severity 順に並べる。
- 各 finding に根拠、影響、ファイル参照を付ける。
- `Suggested fix` は方向性を短く示す。
- 好みだけの指摘や根拠の弱い推測は finding にしない。
- 根拠が弱い論点は `Open questions` に回す。
- 問題がない場合も残余リスクと未実施検証を明記する。
- review-onlyでは、supplied Repository review persistence policyが要求しない限りdurable report fileを作らない。

## 必須のレビュー出力（Required review output）

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

通常のレビュー出力はfindingsです。findingsがないレビューでも、残るリスクと未検証領域を記載します。永続的なレポートは明示的な依頼またはRepository review persistence policyが求める場合だけ作成し、具体的な保存先は外部のRepository inputから取得します。このpackage workflowには含めません。

## レポートファイルの作成方針

- Allowed: ユーザーが「レポートとして保存」「調査レポートを作成」など保存を明示した場合、計画 DoD に report file が明記されている場合、複数ソース調査・監査・検証結果を後で参照する durable artifact として残す必要がある場合。
- Not allowed: review-only、plan-only、status update、軽い確認、通常の evidence command 結果、run progress 記録、チャットで完結する評価。
- レビューのみと計画のみでは、提供されたRepository policyが求めない限り永続的なレポートファイルを作成しません。
- 具体的な保存先、命名、retention、active Run reportの扱いはRepository review persistence policyから供給する。
- 判断に迷う場合は report file を作らず、チャット返答とactive Run reportに留める。

## 失敗モード

- triage を飛ばして変更量だけで優先順位を決める
- 差分起因でない既存問題を findings に混ぜる
- 好みベースのコメントで findings を埋める
- `Why it matters` や `Evidence` が弱く、修正の必要性が伝わらない
- 未確認事項を finding にして confidence を偽装する
- review-onlyで不要なdurable report fileを作る
