# Plan（計画）

## Objective（目的）

- （今回の指示を達成する）

## Scope（対象範囲）

- In: PowerShell native-command診断と必要な契約修正、CI sanitizer base-ref解決、関連回帰test、Run Artifact。
- Out: 個別PR回避策、製品コード、dependency/fallback/Dependabot、repository設定、permission/sandbox/approval/wrapper変更、merge。

## Assumptions（仮定）

- 作業branchはmainと同じHEADでclean。remote同名branch/PRはない。
- sanitizerのbase-ref検証とGit object/path実体検査を維持する。

## Questions / Ambiguity（質問・曖昧性）

- 必ず質問する不透明点: workflow変更はAGENTS.md §8 L2承認が必要。
- 仮定してよい細部: PRはorigin/base branch、pushは実在するevent.before SHAを使い、pushのempty/zeroはfail-closedにする。schedule/dispatchはfirst parentを候補とし、SHA解決後に渡す。
- 未回答の重要質問: なし。ユーザーからL2変更の明示承認を受領済み。

## Hypotheses（仮説）

- H1: Linux fixtureまたはPowerShell native invocationのどちらかが不一致の原因。helperかfixtureかは診断結果で決める。
- H2: scheduleはworkflowがHEAD^を選択し、sanitizer regexが^を拒否する。

## Research Plan（調査計画）

- Round 1 Query: current main code/testと対象CI logsを確認する。
- Round 2 Query: PowerShell直接実行とhelper/verify経路、全event base SHA解決を検証する。
- Exit Criteria:
  - 主要仮説ごとに支持/反証の根拠がある
  - 未解決論点に次アクションがある

## Approach（進め方）

- PowerShell失敗はstatus/signal/error/stdout/stderr、fixture mode、LASTEXITCODE/successで分類してから最小修正する。
- sanitizer workflowはPR/push/schedule/workflow_dispatch候補をrev-parse --verify --end-of-optionsで解決し、40/64 hex commit SHAだけを渡す。不正・不存在・履歴不足は失敗させる。
- event matrix regressionとWindows focused contractを加え、指定testとRepository gatesを実行後、Run Artifactをfinal commit状態にして専用branchへcommit/pushする。
- CI waiterが利用不能の場合はpollingせず未確認blockerとする。
- 標準フロー: PLAN -> TASKS -> 調査/実装 -> 検証 -> REPORT

## Definition of Done（完了条件）

- 正常/異常exit code、scalar、stdout/stderr、環境変数復元を維持する。
- 4 eventで実在commit SHAをsanitizerへ渡し、無効入力・比較不能はfail-closed。Git object/path検査は維持する。
- 対象test/標準gate成功、commit/push/PR作成、最新PR HEADのWeb CIとMobile App CIを確認する。mergeしない。

## Risks / Unknowns（リスク・未知点）

- PowerShell runtimeがlocal sandboxで利用できず、子process status未確定。CIへdiagnosticsを追加して確認する。
- workflow履歴が不足する場合はsanitizationを成功扱いしない。
- CI waiterは現在のtool一覧に見つかっていない。

## Thinking Log（判断記録）

- 思考や判断の理由はここに逐次追記する（作業中に更新）。
- 不明点の整理、選択肢比較、決定理由を簡潔に記録する。
- 2026-11-17 JST: ユーザーがL2変更2点（event base SHA resolutionとWindows focused native-command test）を明示承認。L3変更は行わない。
- 2026-11-17 JST: schedule/dispatchでは空EVENT_BEFOREやzero SHAに依存せずHEAD^1を候補にする。pushの空/zero beforeは比較範囲を推測せず失敗させる。
