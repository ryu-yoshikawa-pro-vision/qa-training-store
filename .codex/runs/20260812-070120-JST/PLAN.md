# Plan

## Objective

- PR #20 の Luna Subagent Orchestration を、既存Planと今回の修正指示に沿って実runtimeで再証明する。
- quality_gate_runner の child runtime、dispatcher、Runtime Agent Compliance、changed-files、scope、Source Integrity、Run Artifactを相互に信用できる状態へそろえる。

## Scope

- In:
  - `scripts/collect-run-artifacts.py`、`scripts/codex-local-validation.mjs`、`scripts/codex-task.ps1`、validator／contract tests、Bash／PowerShell verify、evaluation schema、custom agent contract、関連reference docs。
  - `.gitignore` と、今回作成する `.codex/runs/20260812-070120-JST/` のStrict Run Artifact。
  - 必要な場合の最小限の `.codex` 設定確認。ただしpermission／sandboxの変更は承認なしに行わない。
- Out:
  - Application／Product code、独自sandbox、write syscall監視、独自orchestration platform、無関係なRuff／docstring／performance refactor。
  - `git add`、`git commit`、`git push`、`git reset`、`git clean`、branch／PR操作、command-based deletion。

## Assumptions

- `33e2eca` は前回修正を含む既存baselineであり、旧Run `20260811-200537-JST` は履歴として保持する。
- 今回明示された「新しいStrict Run」は既存Runを上書きせず、新規Run `20260812-070120-JST` で実施する。
- quality runnerのchild PATH／writable rootを変更する必要がある場合、L3 permission／sandbox変更に当たるため勝手に実装せず、現在のCodex CLIで安全な解決が可能かを先に確認する。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。既存Plan、設定、CLI、前回Runで必要な契約を確認できる。
- 仮定してよい細部: Run-local generated evidenceは標準Artifactとして保存し、raw global hook logはGit管理対象外にする。
- 未回答の重要質問: quality childが通常のworkspace-write環境でrequired executableとgenerated outputへ到達できるか。

## Hypotheses

- H1: 前回のquality runner失敗はSource実装ではなくchild runtimeのPATH／実行・書込み環境と、runner promptがunderlying commandを直接指定していたことが主因である。
- H2: `expected` ledger、changed-files fingerprint、scope判定をcollectorの観測事実から分離・明示すれば、旧Runの不整合を新Runで再発させず検出できる。
- H3: 現在のCodex CLI更新後は、dispatcher経由のquality runnerを再実行できる可能性がある。ただしPASS evidenceが得られるまで完了扱いにしない。

## Research Plan

- Round 1 Query: 正本docs、前回Run、custom agent／CLI config、collector／dispatcher／verify／schemaの現状を監査する。
- Round 2 Query: 必須修正を最小差分で実装し、contract／focused／local validation、read-only parallel runtime、quality runner、recursion negative、changed-files fixturesで反証する。
- Exit Criteria:
  - 主要仮説ごとに支持／反証の根拠がREPORTとRun Artifactにある。
  - quality runnerの5 actionがdispatcher経由で実行され、全件exit 0または環境blockerが明確に記録される。
  - Runtime Complianceはspawn expected ledgerとhook observedを1:1照合する。
  - dirty／rename／status unavailable／scope／sanitizerの残差が判定可能である。

## Approach

- repair-loopのbounded workflowで、`must_fix`／`should_fix`／`defer`／`reject`をtriageする。
- 実装前に同一Parentからread-only researcher 3種をparallel spawnし、結果を採用判断へ接続する。
- 修正後はdispatcher、Bash／PowerShell、contract、focused、full、quality child、negative recursion、Source Integrity、sanitizerの順で検証する。
- 権限・sandboxを広げる変更が必要になった場合はL3として停止し、人間判断へ戻す。

## Definition of Done

- P1修正と契約テストがPASSする。
- 新Strict Runでexpected／observed、read-only parallel、recursion negative、quality runner required actionsを実証する。
- Source Integrityにunexpected net Source mutationがなく、scope violationの根拠が明確である。
- `LOCAL_IMPLEMENTATION_COMPLETE` は全Local Required Validation／runtime acceptance／Source IntegrityがPASSした場合のみtrue。External Checksが未確認なら`MERGE_READY=false`を維持する。
- Run Artifactのsanitizer Write／Checkで`residual_findings=0`となる。

## Risks / Unknowns

- quality childがCLI sandboxでPython／pnpm／Bash／PowerShellへ到達できない可能性がある。3回同一条件で再試行せず、設定変更が必要ならL3 blockerとして記録する。
- current worktreeはcleanだが、Run Artifact作成自体はgenerated差分となるためSource changed-filesから除外する。
- `.pyc`やglobal raw hook logが既にtrackedの場合、git mutation禁止のため通常コマンドで削除せず、実状態と必要なユーザー操作をREPORTへ記録する。

## Thinking Log

- 2026-08-12 07:01 JST: 旧Runはquality runner未達かつscope_violation=trueのため、旧artifactを手修正せず新Strict Runを作成した。
- 2026-08-12 07:01 JST: まず現行CLIとchild configを監査し、dispatcher経路と実runtimeの到達性を分けて確認する。

## Final Decisions

- 実Runtimeのquality_gate_runnerはdispatcher経由の5 actionを固定順・各1回で実行し、全件exit 0とQUALITY_GATE_RUNNER_PASSを確認した。
- read-only 3役は同一Parentからparallel起動し、SubagentStart/Stop、runtime ID link、changed_files=[]、scope compliantを確認した。child contextのadditional spawn禁止も、nested runtimeが増えないnegative evidenceで確認した。
- timeoutした補助dispatchはappend-only cancelとして残し、hookで観測されたactive expected ledgerから除外した。collectorはignored_cancelled_runtimeとして事実を保持する。
- Source Integrity、scope attribution、Runtime Compliance、Sanitizer Write/CheckはPASS。ただし既存追跡済みpycはbinaryのため削除できず、LOCAL_IMPLEMENTATION_COMPLETE=false、MERGE_READY=falseを維持する。
- 2026-08-12 09:19 JST: ユーザー判断により、現行PR修正を先にコミットし、追跡済みpycの除去と再コミットは後続の別境界で行う。除去完了まではD1、LOCAL_IMPLEMENTATION_COMPLETE、MERGE_READYの未完了判定を維持する。

## Final Reconciliation

- 2026-08-12 09:24 JST: ユーザーが2段階コミットと追跡済みpyc除去を完了した。`git ls-files`上のgenerated artifactは0件、作業ツリーはclean。
- collector strict、contract、orchestration validator、evaluation schema、Sanitizer Write/Checkを再実行し、すべてPASS。D1を完了し、`LOCAL_IMPLEMENTATION_COMPLETE=true`へ更新した。
- External Checksは未確認のため、`MERGE_READY=false`は維持する。
