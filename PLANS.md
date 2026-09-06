# Repository Planning Lifecycle

この文書は、Repository固有のplan保存、active Run接続、履歴、完了条件を定義します。genericなrepo mapping、ambiguity handling、plan output field、再利用可能Templateは `feature-plan` Skill packageを正本とします。

## Repository plan storage

- 保存先は `docs/plans/` とする。
- filenameは `docs/plans/{yyyy-mm-dd}_{HHMMSS}_{plan_name}.md` とする。
- timestampはJST（`Asia/Tokyo`）を使う。
- 実装へ進む前に、合意したplanをRepositoryへ保存する。
- reusableなplan skeletonは [`feature-plan template`](.agents/skills/feature-plan/assets/plan-template.md) を使う。

## Active Run connection

- 実行中のRunでは `.codex/runs/<run_id>/PLAN.md`、`TASKS.md`、`REPORT.md` を作業管理に使う。
- Repository向けの保存planとRun-localのworking artifactは別物として扱う。
- 同一会話の同一taskはactive Runを再利用し、別taskまたは別会話では新しいRunを作成する。

## Lifecycle and retention

- planはimplementation前の判断、scope、validation、completion criteriaを追跡できる状態で保存する。
- 過去のplanを通常cleanupで削除・置換しない。
- 実装中に判明した事実や未完了事項は、正本planの意味を変えずRun artifactへ記録する。
