# Plan（計画）

## Objective（目的）

親Codexは要件・計画・指示・採否・最終判断を担い、調査・実装・検証の実作業を既存childへ原則委任する。

## Scope（対象範囲）

- In: `AGENTS.md`、`.codex/agents/implementation_researcher.toml`、実装ハーネス、Codex契約テスト、計画・Run記録。
- Out: permission / sandbox / Hook / wrapper、モデル設定、追加エージェント、Product code、CI workflow、マージ。

## Assumptions（仮定）

- 既存5ロールとParentによるGit/Run管理を維持する。
- ブランチ作業の明示依頼をL2変更の承認とみなす。

## Questions / Ambiguity（質問・曖昧性）

- 必ず質問する不透明点: なし。
- 仮定してよい細部: 委任不能時は親が無断で代行しない。
- 未回答の重要質問: なし。

## Hypotheses（仮説）

- H1: 既存ロールのみで今回の委任方針を表現できる。
- H2: 親子の正本と契約テストの修正で新しいオーケストレーターを作らずに済む。

## Research Plan（調査計画）

- Round 1 Query: `AGENTS.md`、Codex設定、既存agent、実装ハーネス、PR #22。
- Round 2 Query: Git安全規約、Run lifecycle、契約テスト。
- Exit Criteria: 変更箇所と安全境界を確定する。

## Approach（進め方）

1. `docs/plans/2026-11-17_203720_codex-parent-delegation.md`を保存する。
2. 委任方針、調査ロール、ハーネスを修正する。
3. 契約テスト、差分確認、PRと必須CI確認を行う。

## Definition of Done（完了条件）

- 委任規則を明文化し、静的契約で検証できる。
- 既存の安全権限とロールを維持する。
- 最新PR headのWeb CIとMobile App CIを確認する。

## Risks / Unknowns（リスク・未知点）

- 静的テストだけでは実際のCodex Runtimeの委任は保証できない。
- GitHub接続からローカルコマンドやCodex CLIを実行できないため、CIと別途ランタイム検証が必要。

## Thinking Log（判断記録）

- PR #22がNative delegationを採用しているため、新しいlauncherや監査機構は追加しない。
