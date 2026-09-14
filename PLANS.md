# リポジトリの計画ライフサイクル

この文書は、リポジトリ固有の計画保存、active Run接続、履歴、完了条件を定義します。一般的なリポジトリ調査、曖昧性の扱い、計画出力の項目、再利用可能なテンプレートは`feature-plan` Skill packageを正本とします。

## リポジトリの計画保存

- 保存先は `docs/plans/` とする。
- filenameは`docs/plans/{yyyy-mm-dd}_{HHMMSS}_{plan_name}.md`とする。
- timestampはJST（`Asia/Tokyo`）を使う。
- 実装へ進む前に、合意したplanをRepositoryへ保存する。
- 再利用可能な計画のひな形は[`feature-plan template`](.agents/skills/feature-plan/assets/plan-template.md)を使う。

## Active Runとの接続

- 実行中のRunでは `.codex/runs/<run_id>/PLAN.md`、`TASKS.md`、`REPORT.md` を作業管理に使う。
- リポジトリ向けの保存計画とRun固有の作業artifactは別物として扱う。
- 同一会話の同一taskはactive Runを再利用し、別taskまたは別会話では新しいRunを作成する。

## ライフサイクルと保持

- 計画は実装前の判断、対象範囲、検証、完了条件を追跡できる状態で保存する。
- 過去の計画を通常のcleanupで削除・置換しない。計画の保持（retention）を優先する。
- 実装中に判明した事実や未完了事項は、正本の計画の意味を変えずRun artifactへ記録する。
