# Plan

## Objective
- 過去のローカル Build／Test／Maestro／品質ゲートの失敗を時系列・分類・根本／派生エラーとして整理し、同一条件の無目的な再実行を防ぐ preflight、仮説、停止条件、証跡保存を正本文書とRun Artifactへ反映する。

## Scope
- In: 既存Run／`.artifacts`／関連文書の調査、失敗履歴と成功条件の整理、Native Runbook／Skill／PROJECT_CONTEXT／reference／history／current Runの更新、文書・JSON・sanitizer検証。
- Out: Android Build、Install、Maestro、Remote CIの無目的な再実行、Git mutation、safety runner／wrapperの自動実装。

## Assumptions
- 既存Run `20260806-094328-JST`、`20260807-071118-JST`、`20260807-094024-JST` と関連 `.artifacts` を主要な事実証跡とする。
- ユーザー分類は実行履歴、repo taxonomyはevaluation candidateに使い分ける。

## Questions / Ambiguity
- 必ず質問する不透明点: なし。添付指示と既存証跡から文書化を進められる。
- 仮定してよい細部: READMEは導線のみ、Runbook／Skillを手順の正本とする。
- 未回答の重要質問: Remote CIの修正後結果、runnerのattemptログ上書き修正の承認。

## Hypotheses
- H1: 反復失敗の一部は、容量・Virtual Store・IME・画面可視性・並列実行など、コード以外の条件を実行前に固定・観測できていなかったことが原因である。
- H2: 同じRunIdや後続工程の実行により、失敗の比較可能性と一次エラーの追跡性が低下した。attempt単位のログ規約とfail-fastが必要である。

## Research Plan
- Round 1 Query: 過去RunのREPORT／evaluation／`.artifacts`、Native Runbook、Skill、wrapperを照合し、失敗表と成功条件を作る。
- Round 2 Query: 文書へ反映後、相互矛盾、未検証事項、絶対Path、JSON／sanitizer状態を確認する。
- Exit Criteria:
  - 主要仮説ごとに支持/反証の根拠がある
  - 未解決論点に次アクションがある

## Approach
- 失敗履歴を根拠付きで整理し、正本RunbookとSkillへ実行前チェック・仮説・停止・証跡規則を追加する。Build／Maestroは再実行せず、文書・JSON・sanitizerのみ検証する。
- 標準フロー: `PLAN -> repo logs/docs/subagents -> TASKS -> docs/Run更新 -> validation -> REPORT`

## Definition of Done
- 主要失敗の時系列表、分類、根本／派生エラー、無効／有効な試行、成功条件、CI差異が記録されている。
- 次回のpreflight、仮説テンプレート、一変数原則、停止条件、完全ログ保存、attempt識別がRunbook／Skillへ反映されている。
- 現在RunのTASKS／REPORT／evaluation、文書、JSON、sanitizerが整合し、Remote CI未確認を明示している。

## Risks / Unknowns
- runnerのログ上書き、Remote CI未確認、次回実機環境の変化。今回のRunでは文書規約とcandidate記録に留め、runner実装やRemote実行は行わない。

## Thinking Log
- 2026-08-07: 添付指示を読み、同一条件のBuild／Install／Test／Maestro再実行は行わず、過去Runと生ログから再発防止を文書化する方針を決定。
- 2026-08-07: Native Runbookを手順の正本、Skillをエージェント入口、READMEを導線、PROJECT_CONTEXT／historyを共通前提・履歴とする。runner変更はStrict candidateへ分離。
