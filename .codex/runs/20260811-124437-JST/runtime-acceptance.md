# Runtime Acceptance 結果

## Wave 4: read-only parallel

- bounded internal runtimeで`code_researcher`、`implementation_researcher`、`test_investigator`を同時起動した。
- 3件は完了またはblockedとして結果を返し、全件`changed_files=[]`、mutationなし、追加spawnなし。
- 直接の`SubagentStart` hook観測は取得できなかったため、model / reasoning effortはconfigured evidenceに限定する。
- CLIの3件parallel attemptはspawn成功後、子の完了joinを取得できずtimeoutした。生ログは`.artifacts/luna-orchestration/wave4-cli-parallel/codex-exec.jsonl`。

## Wave 5: recursive delegation negative

- CLIのexact `code_researcher` childが`.codex/agents/code_researcher.toml`を確認し、`agents.enabled=false`、`features.multi_agent=false`、read-only、追加spawn禁止を報告した。
- `GRANDCHILD_SPAWN_UNAVAILABLE`を返し、grandchildは起動していない。
- primary側の最終マーカー取得はtimeoutしたため、child evidenceは有効、Parent completion markerは未取得として扱う。
- 生ログは`.artifacts/luna-orchestration/wave5-cli-recursion-negative/codex-exec.jsonl`。

## Wave 6: writable capability

- Gate A/Bのworkspace isolation、cwd分離、changed-file attributionをこのrunで直接証明できないため判定は`UNKNOWN`。
- 安全な判断はparallel writeではなくserial fallback。`implementation_worker`をserialで実行し、focused validation契約のみ確認した。
- before snapshotは`.artifacts/luna-orchestration/wave6-serial-fallback/working-tree-snapshot-before.json`。

## Wave 7: quality runner / Source Integrity

- internal multi-agent APIは`quality_gate_runner` roleを公開しておらず、built-in roleへの置換は行わなかった。
- CLIではexact `quality_gate_runner`のspawnは成功したが、Required Validation Setの結果を返す前に上限timeoutした。未実行をPASS扱いしない。
- quality runner前後のsnapshot comparisonは`passed=true`、`additional_source_diff_count=0`、`source_head_changed=false`。
- Parentが同じRequired Validation Setを実行した結果、static / Bash / PowerShellはPASS、`test:contracts`はcold-load timeout後にfocused 4/4とfull 24 files / 201 testsへ回復した。これはquality runner PASSではなく、Parent validation evidenceである。

## Wave 7 follow-up: current CLI / execpolicy repair loop

- `codex-cli 0.147.0`でexact `quality_gate_runner` child spawn自体は成功した。
- Parent-defined Local Required Validation Setは、Planの最小候補を縮めず、次の5件へ固定した。
  1. `python scripts/validate-luna-orchestration.py`
  2. `bash scripts/verify`
  3. `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/verify.ps1`
  4. `pnpm run verify`
  5. `pnpm run test:contracts`
- Repair Loopでは、inner command、`pwsh` basename、absolute `pwsh.exe`、`-NoProfile`、引用符付き`-Command` payloadの順に、5件だけを対象にしたexact repository ruleを検証した。`codex execpolicy check`では各形が`allow`になったが、実child runtimeは外側のWindows execpolicyで1件目をprocess起動前に拒否した。
- 最終bounded attemptは`QUALITY_GATE_RUNNER_INCOMPLETE`。1件目は`BLOCKED before execution`、2〜5件は`NOT_RUN`、`write_attempt=false`。未実行をPASS扱いしない。
- quality runner前後snapshot comparisonは今回のfresh attemptでも`passed=true`、`additional_source_diff_count=0`、`source_head_changed=false`。Source IntegrityはPASSだが、runner validation PASSの代替ではない。
- built-in role、dangerous bypass、hook trust bypass、Validation Set削減は行わず、quality runner completionは未達としてfail-closeする。

## Wave 8: bounded failure / repair interpretation

- `pnpm run test:contracts`の初回cold-load timeoutに対し、focused test 4/4、続くfull rerun 24 files / 201 tests PASSまでをParent主導で実施した。これは既存`flaky_or_env_issue`候補として記録し、Product/Test Sourceの修正は行わなかった。
- quality runner自身が実行前policy blockで止まったため、quality runner FAIL → investigator → worker → runner PASSの完全なreal-run chainは成立していない。Parent validation evidenceをrunner PASSへ補完しない。

## Wave 7 standard-wrapper revalidation: exact completion and Source Integrity

- CLI更新後の標準 `scripts/codex-task.ps1` 経路で、Parentは`quality_gate_runner`だけを1件spawnした。wrapper preflightはPASSし、実行ヘッダーは`codex-cli 0.147.0`、`gpt-5.6-luna`、`reasoning effort: max`、`workspace-write`だった。
- 子エージェントはParent-defined Local Required Validation Setを指定順・各1回で5件すべて実行し、`Progress: 100% (5/5)`と`QUALITY_GATE_RUNNER_INCOMPLETE`を返した。
  - #1 `python scripts/validate-luna-orchestration.py`: PASS / exit 0
  - #2 `bash scripts/verify`: TIMEOUT / exit 124 / 出力なし
  - #3 `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/verify.ps1`: PASS / exit 0
  - #4 `pnpm run verify`: FAIL / exit 1、`format:check`の既存25ファイル問題
  - #5 `pnpm run test:contracts`: PASS / exit 0、24 files / 201 tests
- `write_attempt`は観測されず、childの`changed_files=[]`。未実行をPASS扱いせず、#2 timeoutと#4 failureのためquality runner PASSとは判定しない。
- 親wrapperの終了コード配列化バグを、native stdoutを`1>$null`へ限定的に捨てて`[int]$LASTEXITCODE`を返す修正で解消した。wrapper reportは`codex_exit_code: 0`、`status: verify_skipped`として正常なJSONになった。
- 既存`working-tree-snapshot.ts`を再利用したbefore/after比較は`passed=true`、`additional_source_diff_count=0`、`source_head_changed=false`。quality runner中のnet Source mutationは検出されなかった。
- `SubagentStart` hook eventは今回も取得できず、agent idとreasoning effortのruntime直接観測はunknown / configured evidenceに限定する。

## Wave 7 timeout-extended revalidation: required set completion

- 前回の#2 timeoutは、親側の同一`bash scripts/verify`がexit 0（約28秒）で、標準wrapperのchild shell tool上限が約14秒だったため、検証スクリプトのFAILではなくtool timeoutと分類した。quality runner TOMLとParent promptへ、コマンド文字列を変更しない300秒以上のper-command timeout指示を追加した。
- 新しい標準wrapper attempt `.artifacts/luna-orchestration/wave7-quality-runner-wrapper-1615/`で、exact `quality_gate_runner`を1件だけspawnし、5件を指定順・各1回で実行した。実行ヘッダーは`codex-cli 0.147.0`、`gpt-5.6-luna`、`reasoning effort: max`、`workspace-write`だった。
  - #1 `python scripts/validate-luna-orchestration.py`: PASS / exit 0
  - #2 `bash scripts/verify`: PASS / exit 0、PASS=3 / FAIL=0 / SKIP=2
  - #3 `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/verify.ps1`: PASS / exit 0、PASS=4 / FAIL=0 / SKIP=0
  - #4 `pnpm run verify`: FAIL / exit 1、既存25ファイルの`format:check`問題。今回追加の`spec/failure-taxonomy.json`は個別Prettier check PASS。
  - #5 `pnpm run test:contracts`: PASS / exit 0、24 files / 201 tests
- runnerは`Progress: 100% (5/5)`と`QUALITY_GATE_RUNNER_INCOMPLETE`を返した。#4のbaseline failureが残るため、5件完了をquality runner PASSへ補完しない。
- `.artifacts/luna-orchestration/wave7-quality-runner-wrapper-1615/working-tree-snapshot-comparison.json`は`passed=true`、`additional_source_diff_count=0`、`source_head_changed=false`。Source IntegrityはPASS、write attemptは観測なし、SubagentStart hookは引き続きunknownである。

## Wave 10: trusted hook runtime acceptance

- project-local hookを対話CLIの`/hooks`でtrustした後、標準safe wrapperから実際の`code_researcher`を1件spawnした。危険なhook trust bypassは使用していない。
- `.artifacts/luna-orchestration/wave10-hook-trust-1649/hooks.jsonl`に、同一Agent IDの`SubagentStart`／`SubagentStop`を各1件取得した。
- 両イベントの実測値は`agent_type=code_researcher`、`model=gpt-5.6-luna`、`agent_id=019fefcb-928f-76a3-81df-6f2b47181483`。Run manifestの`runtime_agent_compliance.status=pass`、`violations=[]`へ集約した。
- D3のruntime identity/model evidenceは達成。quality runner #4の既存format baseline failureとfull `pnpm run verify`未完了は別のcompletion blockerとして残す。

## Wave 11: approved format baseline and bounded quality-runner repair

- ユーザーの明示承認に基づき、既存25ファイルだけを機械的にPrettier整形した。25件の個別checkと全体`prettier --list-different`はPASSした。
- 親の`pnpm run verify`はexit 0で全工程を完了した。これはquality runner PASSの代替ではなく、Parent validation evidenceとして扱う。
- exact `quality_gate_runner`は同じ5コマンドを指定順・各1回で2回実行した。両回とも#1 validator、#2 Bash verify、#3 PowerShell verify、#5 contract test（24 files / 201 tests）はPASSしたが、#4 `pnpm run verify`内の`native-production-module-resolution.test.ts`が5000msでtimeoutし、`QUALITY_GATE_RUNNER_INCOMPLETE`となった。
- bounded repairでfocused 4/4、full contract 24 files / 201 testsをPASSしたが、同じquality runner timeoutが再現したため、同一エラーの追加再試行は停止した。test codeは変更していない。
- before／after snapshot comparisonは`passed=true`、`additional_source_diff_count=0`、`source_head_changed=false`。quality runnerによるSource mutationはない。
- Runtime identity/modelは、hook trust後のwave10およびwave11-1722 raw hook logで`SubagentStart`／`SubagentStop`を確認済みであり、allowlist role、`gpt-5.6-luna`、同一Agent IDを満たす。wave11 repairのhook raw fileはcollector引数誤りで上書きされたため、runtime evidenceには使用しない。
- quality runner PASS未達のため、`LOCAL_IMPLEMENTATION_COMPLETE=false`、`MERGE_READY=false`を維持する。Failure Taxonomyの主分類は`flaky_or_env_issue`とする。

## Wave 12: bounded Vitest timeout repair and final quality runner PASS

- `implementation_worker`へ対象を`vitest.config.ts`だけに限定して委譲し、`testTimeout: 15_000`とMetro cold-load理由コメントだけを追加した。Product Code、Test Source、package scripts、Required Validation Setは変更していない。
- `.artifacts/luna-orchestration/wave12-vitest-timeout-repair-1818/focused-contracts.log` => `24 files / 201 tests PASS`。repair前後のscope比較は追加差分1件で、宣言済み許可ファイル`vitest.config.ts`だけだった。
- trusted/generated output（`dist`、`output/spec-site`、`.artifacts`、cache、build output）は既存Source Integrity semanticsの除外対象としてrunner入力へ明記した。検証中の生成物出力を禁止されたSource writeとして扱わない。
- `.artifacts/luna-orchestration/wave12-quality-runner-generated-output-1848/codex-output.txt`のexact `quality_gate_runner`は次を指定順・各1回で実行し、全exit 0、`write_attempt=false`、`QUALITY_GATE_RUNNER_PASS`を返した。
  1. `python scripts/validate-luna-orchestration.py`
  2. `bash scripts/verify`（exit 0、内部SKIP 2件は未検証項目として報告）
  3. `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/verify.ps1`
  4. `pnpm run verify`
  5. `pnpm run test:contracts`（24 files / 201 tests）
- `.artifacts/luna-orchestration/wave12-quality-runner-generated-output-1848/working-tree-snapshot-comparison.json` => `passed=true`、`additional_source_diff_count=0`、`source_head_changed=false`。trusted generated output以外のnet Source mutationはない。
- hook logは`SubagentStart`／`SubagentStop`各1件、同一Agent ID、`agent_type=quality_gate_runner`、`model=gpt-5.6-luna`。collector後のRuntime Agent Complianceは`pass`、allowlist違反なし。
- outer shell ceilingは900秒で終了コード124となったが、wrapper reportは`codex_exit_code=0`、codex task logは正常終了、子出力はPASS markerを確定している。これはwrapper-boundary warningとして保持し、5コマンドのvalidation failureには分類しない。
- Local completionは`LOCAL_IMPLEMENTATION_COMPLETE=true`。PR #19の外部status/workflowが空で、current working tree diffも未pushのため`MERGE_READY=false`を維持する。
