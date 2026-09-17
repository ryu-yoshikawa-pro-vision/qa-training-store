# Plan（計画）

## Objective（目的）

- PR #164 の対象branchへ、Plan `docs/plans/2026-09-18_003800_issue-162-husky-local-quality-gate.md` に従って Husky 9.1.7 のローカル `pre-commit` 品質ゲートを実装し、実際の commit 経路・contract・標準ゲート・PR CIまで確認して push する。

## Scope（対象範囲）

- In: `package.json`、`pnpm-lock.yaml`、`.husky/pre-commit`、3つの通常install workflow、関連contract test、実装に必要なRun Artifact。
- Out: `pnpm run verify` のHook化、`lint-staged`、独自wrapper/runner、既存品質scriptの変更、EAS設定変更（Husky起因の問題が確認されない場合）、Issue対象外の自動化。

## Assumptions（仮定）

- 対象branch、PR head、base `main`、既存作業ツリーは確認済みで一致している。
- 候補3 scriptの実測で明確なcommit阻害は確認されなかったため、Plan記載の3本を指定順で採用する。
- GitHub Actionsの通常install経路だけを workflow-level `HUSKY: "0"` で無効化し、`--ignore-scripts` 経路は維持する。

## Questions / Ambiguity（質問・曖昧性）

- 必ず質問する不透明点: なし。
- 仮定してよい細部: Hookは `pnpm run` 3行のみ、Husky 9.1.7、workflow-level `HUSKY: "0"`。
- 未回答の重要質問: なし。CI failureが発生した場合は原因を確認し、repair-loopへ切り替える。

## Hypotheses（仮説）

- H1: 通常の `pnpm install --frozen-lockfile` 後に `prepare: husky` がHook pathを設定できる。
- H2: `pre-commit` の非0終了が実際の `git commit` を停止し、正常時はcommitを許可する。
- H3: 通常installを使う3 workflowで `HUSKY=0` を設定すれば、CI/automation commitへHookを持ち込まない。

## Research Plan（調査計画）

- Round 1 Query: Issue/PR/Plan、branch差分、package/lock/workflow/contract/EASの現状を確認する。
- Round 2 Query: 候補scriptの複数回実測後、最小差分で実装し、contract・標準gate・一時clone commit・PR CIを確認する。
- Exit Criteria:
  - 主要仮説ごとに支持/反証の根拠がある
  - 未解決論点に次アクションがある

## Approach（進め方）

- どう進めるか（高レベル手順）: 現状確認 → 候補script実測 → Husky/Hook/workflow/contract実装 → diff確認 → 通常installとHook実動作を一時cloneで確認 → 関連contract/標準gate/verify → commit/push → 最新PR CI確認。
- 標準フロー: `PLAN -> TASKS -> 実行 -> REPORT`

## Definition of Done（完了条件）

- Planの対象ファイルだけが変更される。
- Husky依存、`prepare: husky`、指定順の3本のHook、3 workflowの `HUSKY: "0"`、関連contract testが実装される。
- 通常install、正常/異常の実commit経路、関連contract、標準品質gate、`pnpm run verify`、最新PR #164の必須CIがPASSする。
- 対象branchへcommit/pushし、PR #164をOPENのまま維持する。

## Risks / Unknowns（リスク・未知点）

- lintを含むHook実行は約45秒。Planにない閾値で削減せず、今回の実測値を報告する。
- workflowの通常installへHUSKY無効化漏れがあるとautomation commitへHookが割り込むため、workflow contractで固定する。
- PR CIはpush後の最新headだけを採用し、queued/in-progressを成功扱いしない。

## Thinking Log（判断記録）

- 2026-09-18: Issue/PR/Planとbranchを確認。Plan後の対象branch差分はPlanのみで、現状理解と一致した。
- 2026-09-18: 候補3本を3回ずつ、連続実行を3回測定。全てPASSし、連続45.04–45.60秒だった。Planの秒数閾値は追加せず、明確な阻害とは判定し3本採用とした。
