# Codex親エージェントの実作業委任方針

## 0. 依頼概要

- 依頼内容: 親Codexは要件解釈・計画・指示・採否・最終判断を担い、調査・実装・検証の実作業を既存のネイティブサブエージェントへ委任する。
- 背景: `AGENTS.md` 第7章と実装ハーネスでは親の判断責任と5つのロールは定義されているが、調査が任意委任であり、実装前調査の説明には親による直接編集が残る。
- 期待成果: 現行の5ロールを再利用し、直接実作業を原則禁止する運用契約と回帰テストを追加する。

## 1. ゴール / 完了条件

- ゴール: 親が実作業を原則として委任し、実行できない場合の扱いと例外を明確にする。
- 完了条件（DoD）: 委任の原則、ロール、失敗時の扱い、親の最終確認・Git/Run責任を正本へ明記し、静的契約テストで退行を検出する。ブランチに反映してPRを作成し、必須CIの結果を確認する。

## 2. 現状理解と前提

- 現状理解: `.codex/agents/`には調査3件、実装1件、検証1件があり、`docs/reference/codex-implementation-harness.md`の「サブエージェントの実装フロー」でNative delegationを定義済み。PR #22は独自orchestrationを採用していない。
- 前提: ユーザーの「OK.ブランチを切って対応」は今回のL2 workflow文書変更の承認とみなす。親による結果の読み取りと差分確認、Git mutation、Run Artifact管理、最終報告は既存規約に従い親が保持する。
- 対象外: サンドボックス・承認ポリシー・Hook・ラッパー・Codexモデルの設定変更、追加エージェント、実アプリケーション変更、独自オーケストレーター、PRのマージ。

## 3. 質問 / 曖昧性

- 必ず質問する不透明点: なし。既存のRole・安全境界を維持する範囲で実現可能。
- 仮定してよい細部: 運用上の例外（childの起動不可、実行権限なし、作業境界不明）は親がユーザーへ報告し、密かに親の直接作業へ切り替えない。
- 未回答の重要質問: なし。

## 4. 影響範囲

- 影響範囲: Codexの親・子の指示ルーティングと、契約検証。
- 確認対象ファイル: `AGENTS.md`、`.codex/config.toml`、`.codex/agents/*.toml`、`docs/reference/codex-implementation-harness.md`、`tests/contracts/codex-autonomous-workspace.test.ts`、`scripts/verify*`、`docs/reference/run-artifacts.md`。

## 5. 変更方針

- 変更方針: 起動と権限はCodex標準機能に任せ、既存の親子運用規則のみ補強する。追加ハーネスや別の正本は作らない。
- 実行タスク:
  - [ ] 1. `AGENTS.md`に実作業の原則委任と例外の取り扱いを追加する。
  - [ ] 2. `implementation_researcher`の説明と実装ハーネスの任意委任表現を修正する。
  - [ ] 3. 既存契約テストを追加し、静的チェック・PRのCIを確認する。

## 6. 検証方法

- 検証計画: 変更ファイルの構文・整合性、`pnpm exec vitest run tests/contracts/codex-autonomous-workspace.test.ts`、`bash scripts/verify`、PowerShell版verify、`pnpm run verify`、Run Artifact sanitizer、差分・ブランチ確認、最新PR headのWeb CIとMobile App CI。
- 成功判定: 契約テストPASS、既存安全ルールの無変更、最新PR headの両必須CI成功。ランタイム検証ができない場合は未実施として記録する。

## 7. リスクと未解決論点

- リスク: 子の起動不能時に親が黙って作業すると要求を満たさないため、停止・報告を規定する。親による安全性の最終確認とGit/Run所有は削らない。
- 未解決の質問: Codex CLIの実セッションでの委任動作は、この接続からは直接確認できない。リポジトリの静的テストとGitHub CIを確認する。

## 8. 成果物

- 変更ファイル: `AGENTS.md`、`.codex/agents/implementation_researcher.toml`、`docs/reference/codex-implementation-harness.md`、`tests/contracts/codex-autonomous-workspace.test.ts`。
- 付随ドキュメント: 本計画、active RunのPLAN/TASKS/REPORT。

## 9. 備考

- L2: ユーザーの実装依頼を承認根拠とする。L3の権限変更は行わない。
- Rollback: 本ブランチの差分のみをPRから戻す。mainには直接変更しない。
