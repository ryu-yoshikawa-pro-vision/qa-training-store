# Plan: PR #20 Subagent Orchestration 基盤の仕上げ

## Objective

- Parent config の model / reasoning effort を唯一の正本にし、validator、dispatcher、collector、verify、contract test を固定値非依存へ移行する。
- 実Runtimeで read-only 3並列と quality gate runner 5アクションを確認し、Run Artifact と sanitizer を完了する。

## Scope

- In: `.codex/config.toml`を参照する orchestration scripts、run manifest template、関連docs、generic script rename、Strict Run artifacts。
- Out: application source、git add/commit/push、PR操作、外部CIの実行・判定。

## Assumptions / Decisions

- agent TOMLの現在値は明示的な契約値として残す。
- runtimeの reasoning effort はhookで観測できない場合があるため、未観測を違反にしない。ただし観測された値はdispatch ledgerの期待値と比較する。
- 既存25ファイルの機械的Prettier差分は今回の対象外で、既存変更として保持する。

## Hypotheses

- H1: model / effort を `.codex/config.toml` から読むことで、将来の値変更時にvalidatorとdispatcherが追随する。
- H2: dispatch ledgerの expected 値とruntime hookの observed 値を比較すれば、agent identityの取り違えを固定文字列なしで検出できる。
- H3: generic validator / contract test と移行fixtureにより、現在値以外のmodel / effortでも契約が維持される。

## Approach

1. repo docs、ADR、直近Run、添付指示を確認し、対象と非対象を確定する。
2. config SSOT、generic scripts、ledger、collector、verify、docsを最小差分で更新する。
3. Strict Runで3つのread-only investigatorを実Runtime並列実行し、品質ゲート用runnerを5 dispatcher actionで実行する。
4. focused / cross-platform / full validation、collector、source integrity、schema、sanitizerを実行する。

## Definition of Done

- validator / contract test / local validation / Bash / PowerShell / full verifyがPASS。
- read-only 3並列とquality gate 5 actionがRun-local evidence付きでPASS。
- collectorが期待3・観測3、missing/unexpected/violation 0、scope violation falseを示す。
- future model / effort migration fixtureがPASSし、tracked generated artifactと未sanitized絶対パスがない。
- `LOCAL_IMPLEMENTATION_COMPLETE=true`、`MERGE_READY=false`（外部CI保留）を記録する。

## Risks / Unknowns

- Codex hookでは reasoning effort が観測されない可能性がある。observed=falseを記録し、modelとdispatch identityは厳格比較する。
- quality gateのfull verifyは時間を要するため、同一条件の無目的な再実行はしない。
- CLI wrapperがRun artifactを更新する場合も、source mutationがないことを前後差分で確認する。

## Thinking Log

- 2026-08-12 09:53 JST: Strict Run `20260812-095333-JST`を初期化。
- 2026-08-12 10:29 JST: read-only 3並列が全件completed、scope compliant、changed_files=[]で完了。
- 2026-08-12 10:32 JST: expected ledgerとruntime agent IDを3件リンクし、strict collectorのruntime complianceをPASS化。
- 2026-08-12 10:53 JST: quality_gate_runnerを1件だけspawnし、5 actionを指定順・各1回・exit 0で完了。marker `QUALITY_GATE_RUNNER_PASS`を確認。
- 2026-08-12 11:04 JST: strict collectorを再集計し、expected=4、observed=4、missing/unexpected/violations=0、scope=false、warnings=0を確認。
- 2026-08-12 11:11 JST: evaluation schema、Bash / PowerShell、contract、full verify、Source Integrityの最終結果をRunへ反映。external checks pendingのためMERGE_READY=false。
