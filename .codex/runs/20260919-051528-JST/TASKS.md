# Tasks（タスク）

## Now（現在）

- [x] 1. Issue #163、現行Plan、PR #58、pnpm `v9.10.0`、OpenCode `v1.18.31`、Renovate設定を再確認する。
- [x] 2. 最終レビュー指摘をPlanのDoD、変更方針、実行タスク、検証、リスクへ反映する。
- [x] 3. Repository契約に従って今回taskのRun Artifactを作成する。
- [x] 4. 変更範囲と残存する旧設計の記述を確認し、PlanとRun Artifactだけをcommit可能な状態にする。

## Discovered（発見事項）

- package selector付き`pnpm why` / `pnpm list <package>`ではなく、package selectorなしの`pnpm list --json --depth Infinity`をdependency pathの正本にできる。
- PR #58では同じ`brace-expansion`に対して2件のparent-scoped overrideが必要だったため、overrideを1 selectorに限定すると既知事例を処理できない。

## Blocked（ブロック中）

- なし。
