# Plan（計画）

## Objective（目的）

- Issue #159のWindows logging/Stop launcher contract test timeoutを、現行`origin/main`と実測に基づいて原因特定し、必要最小限の修正・回帰検証・CI確認まで完了する。

## Scope（対象範囲）

- In: 対象2 test、設定済みWindows launcher、必要なHook、関連verify/CI、Run Artifact。
- Out: PreToolUse policy semantics、PR #155範囲、Skill/Trigger Eval、不要な汎用process abstraction、mainへの直接反映・merge・force push・Issue close。

## Assumptions（仮定）

- `HEAD`は固有commitなしで`origin/main`へfast-forward同期済みであり、指定branch上で作業する。
- timeout単純延長を採用する場合も、修正前後の分布と余裕幅をRun Artifactへ記録する。
- 外部要因はprocess境界の実測差が得られた範囲だけを原因または寄与要因と扱う。

## Questions / Ambiguity（質問・曖昧性）

- 必ず質問する不透明点: なし。Issueと完了条件は明示されている。
- 仮定してよい細部: 診断用timing helperの一時追加と計測後の除去。
- 未回答の重要質問: 単一process異常か正常累積か、local/CI差の実測可能な境界。

## Hypotheses（仮説）

- H1: 各launcherは正常終了し、5回/最大24回の同期起動、fixture、cleanupの累積がtest-local timeoutを超える。
- H2: 一部launcherまたはstdin/stdout/stderr/WaitForExit/cleanupに異常な遅延があり、test-only timeoutでは原因が残る。
- H3: loggingとStopは同一のComSpec/PowerShell/Node起動コストを共有するが、Stop固有のfixture/quality Hook処理が別の寄与を持つ。

## Research Plan（調査計画）

- Round 1 Query: Issue本文、現行main、対象コード、ADR、CI、修正前focused/file単体を確認する。
- Round 2 Query: helper外側のlauncher invocation、fixture準備・cleanup、runtime timeout、local/CI環境境界を計測し、H1/H2/H3を判定する。
- Exit Criteria:
  - 主要仮説ごとに支持/反証の根拠がある
  - 未解決論点に次アクションがある
  - 診断用変更が最終差分から除去され、指定ゲートと最新head CIを確認する

## Approach（進め方）

- 依存・環境・修正前結果を固定し、必要最小限の診断計測を一時追加する。
- 原因が累積なら対象testだけを調整し、単一process異常なら測定箇所の共通原因だけを修正する。
- logging JSONL、Stop active/inactive、redaction、fallback、runtime Hook timeoutを回帰確認する。
- 標準フロー: `PLAN -> Issue/Repository確認 -> TASKS -> 実測 -> 修正 -> 検証 -> REPORT -> commit/push/CI確認`

## Definition of Done（完了条件）

- focused/file単体、対象2 file、`scripts/verify.ps1 -HookContracts`、`test:contracts` 3回、`verify`、markdown/text lint、diff checkが必要条件を満たす。
- logging 5 eventとStop fallback最大24 invocationの結果・fixture/cleanup・local/CI差をpayload等の機密を含めず記録する。
- production contractを維持し、一時計測を除去した最小diffをcommitし、最新PR headのWeb CI/Mobile App CI/Windows jobを確認する。

## Risks / Unknowns（リスク・未知点）

- H1/H2を取り違えないため、status/signal/error有無と各durationを分離して測る。
- 設定のEncodedCommandは可読sourceから再生成し、base64を直接手編集しない。
- issue当時のtimeoutが現環境で再現しない場合は、未再現と現在の実測を混同せず、追加修正の要否を evidence で判断する。

## Thinking Log（判断記録）

- 思考や判断の理由はここに逐次追記する（作業中に更新）。
- 不明点の整理、選択肢比較、決定理由を簡潔に記録する。
