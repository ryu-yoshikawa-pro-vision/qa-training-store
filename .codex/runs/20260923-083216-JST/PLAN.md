# Plan（計画）

## Objective（目的）

- PR #168の最終レビューで確認された2件だけを修正し、Plan準拠を動作テストで証明する。

## Scope（対象範囲）

- In: `scripts/evals/run-skill-workflow-evals.ts`のstage単位Git snapshot差分、Case B current-run official Evidence境界、repository contract behavior tests、今回Run Artifact、PR本文。
- Out: fixed 5 case、status分類、Runtime smoke、Skill/Product semantics、CI workflow、Hook設定・契約。

## Assumptions（仮定）

- 既存implementation Runは完了済み履歴として保持し、今回のreview repairは新Runへ記録する。

## Questions / Ambiguity（質問・曖昧性）

- 必ず質問する不透明点: なし。2件の要件と許可範囲は明確。
- 仮定してよい細部: snapshot fingerprintの実装詳細は既存runnerへ最小に収める。
- 未回答の重要質問: なし。

## Hypotheses（仮説）

- H1: Git-visible scope false positiveはturn前後のpath状態 fingerprint差分で除ける。
- H2: Case B Evidence許可rootをcurrent run prefixに限定すれば別run/evidence外参照を拒否できる。

## Research Plan（調査計画）

- Round 1 Query: PR head/main/branch/diff、4 Plan、前回result、runner/testの確認。
- Round 2 Query: 変更後のbehavior test、repository-wide gate、canonical provenanceとCI確認。
- Exit Criteria:
  - 主要仮説ごとに支持/反証の根拠がある
  - 未解決論点に次アクションがある

## Approach（進め方）

- Scope snapshotとCase B path boundaryだけを変更し、実Git repositoryとtemp Evidence treeで挙動をテストする。
- 標準フロー: `PLAN -> Web検索(不足知識) -> TASKS -> 実行 -> REPORT`

## Definition of Done（完了条件）

- dirty unchangedは除外、dirty再変更・clean変更・untracked追加変更・削除は検出。Case A相当でPlan dirty + status.mjsのみ変更ならstatus.mjsだけを返す。
- Case Bはcurrent `<run_id>/runner/output/evidence/**`内のregular fileだけ許可し、別run/evidence外/missing/directory/traversalを拒否する。URL same-origin判定を維持する。
- 指定検証、sanitization、diagnose:hooks、commit/push、PR本文更新、最新headのWeb/Mobile CIを終える。canonical provenance更新が必要ならHost Git safety gateが許す場合だけ1回実行し、拒否時は未実行を記録する。PR/Issueはmerge/closeしない。

## Risks / Unknowns（リスク・未知点）

- Host Runtime共通smokeが再度blockedなら従来分類で保存し、決定的回帰testを今回2件の直接evidenceにする。
- Hook baseline stateがmissingでもHook設定や契約を変更せず、指定診断結果を記録する。

## Thinking Log（判断記録）

- 2026-09-23: previous implementation Runは履歴として保持し、このreview repair専用のstrict Runを作成した。
- 2026-09-23: 一時sanitized TargetのGit setupは共通PreToolUse G10に2回拒否された。Hook変更や回避はせず、canonical live runは未実行として記録する。
