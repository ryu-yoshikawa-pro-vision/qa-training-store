# Run Plan

- Run ID: 20260925-111717-JST
- Task type: harness-improvement
- Workflow level: strict
- Branch: plan/codex-autonomous-workspace
- Base: main@c42082ba62cbca87f675b336d06885719d21b50e

## 目的

通常interactiveをdirect `codex`へ変更し、project defaultをworkspace-write / approval never / network trueへ揃える。

Run Artifactは新しいdirect用manifest modelを追加せず、通常のlightweight / standardとstrictを分離する。

正本Plan:

- docs/plans/2026-09-25_111717_codex-autonomous-workspace.md

## 確定方針

- direct `codex`: workspace-write / approval never / network true
- 通常lightweight / standard interactiveはdirect `codex`を使い、Run初期化時は`--no-run-manifest`でPLAN / TASKS / REPORTだけを管理する。
- strict / machine-managed evidenceが必要なRunは既存`codex-safe -RunId` / `codex-task --record-run-manifest`経路を維持する。
- 今回のactive Runはstrict。L3承認後、source変更前に既存machine-managed writerで同じRun IDへrun.json / evaluation template / scopeを補完する。
- fresh direct `codex`はproject defaultのexternal runtime validationとして別途実行し、その結果をREPORT / evaluationへ記録する。direct session用run.jsonは作らない。
- `run.json.safety.network` はmachine-managed execution pathのnetwork利用を表し、external direct validationまで集約する値とは扱わない。consumer確認は`docs/reference/run-artifacts.md`、Bash / PowerShell両`codex-task`、collectorを対象にする。
- `codex-project.toml`はnetwork trueとdirect workspace-writeのapply_patch契約へ同期する。standard manifestはrecommendedを維持し、direct standardだけ`--no-run-manifest`を明示例外として使う。
- `.codex/requirements.toml`はactual consumer / managed distributionで実効性を確認できた場合だけ変更する。
- `git switch`だけをbroad prompt ruleから外す。
- `git checkout / merge / rebase / tag`はprompt維持する。
- `git branch -d / --delete`はpromptとし、複合short option / option順序違いも検証する。`git branch -D / -f`とremote branch deleteは既存denyを維持する。
- merge / rebase recoveryとlocal branch deleteはlocal例外操作として扱い、`codex-safe safe`のon-request approval成立だけを条件にする。network昇格は条件にしない。
- 明示依頼された高影響network operationで`codex-safe safe`を使うのは、safe wrapperのapproval + network昇格runtime検証が成功した場合だけとする。失敗時はnetwork例外操作だけをblockerとし、新presetを追加しない。
- generic `gh api` と高影響GitHub CLI operationをpromptに置き、direct neverでは拒否する。ただしこのruleはdefense-in-depthであり、credentialを持つ任意code pathのhard boundaryとは扱わない。通常のPR create / edit / checksはblanket blockしない。
- auto-netのpreflightはcommon risky prompt ruleを除外するため、local branch deleteとgeneric `gh api` / 高影響GitHub CLI operationを`.codex/rules-auto-net/20-auto-net-risky-forbidden.rules`へforbiddenとしてmirrorする。
- actual auto-net runtimeはproject `.codex/rules/*.rules`を読み込み、`.codex/rules-auto-net/**`は自動ロードされない。専用rulesをruntime enforcementとは扱わない。
- preflight overlayとactual runtimeのdecision差を副作用のない代表commandで記録し、既存差分があれば今回runtime loaderを新設せず別課題とする。
- `.codex/rules/README.md`をdirect never / prompt semanticsとauto-net preflight overlayの責務へ同期する。
- auto-net preset自体は削除しない。
- rm / git rm等の既存denyを変更しない。
- workspace-write subagentへnetwork falseを新設しない。既存role contractに禁止根拠がある場合だけ個別overrideする。
- AGENTS.mdとcompact再注入Hookを変更しない。
- PR #182はこのbranchの通常interactive契約確定後に最新mainへ同期し、interactive E2Eをdirect `codex`基準へ修正する。
- mergeは明示指示があるまで行わない。

## strict Artifactの現在状態

ユーザーの明示指示をこのPlanのL3実装承認として確認し、source変更前に同じRun IDを既存 codex-task writerでbootstrapした。

- run.json: schema v2、strict、preset=safe、runtime=host、status=completed、validation.status=skipped、safety.network=false、scope_violation=false、changed_files=[]、codex_task_report_count=1。
- evaluation.json: 既存templateを作成済み。result=not_evaluatedで、最終評価は未実施。
- scope: --allowed-files / --allowed-dirs / --allowed-globsをwriterへ渡した。source scopeはこのRunのREPORTに記録する。
- bootstrap時点でsource変更なし。Task 0 baselineとTask 1 bootstrapの結果はREPORTへ追記済み。

次のgateはTask 2のproject default / metadata変更。その後、Task 3以降を順に進める。

## 2026-09-26 execution status

- Task 2からTask 8の実装と指定検証を完了した。条件付き`.codex/requirements.toml` / subagent role変更は、実効consumer / role contractが確認できなかったため行わなかった。
- Task 9はpartial。fresh direct `codex`の通常workspace write、direct neverによるGitHub CLI prompt拒否、auto-net preflightとactual runtimeの差は確認した。shared `.git` metadata sandbox拒否、GitHub network接続 / credential制約、interactive PTY不在によりdirect git switch / network / safe on-request approvalとnetwork昇格は未完了。
- Task 10のfocused test、Hook test、execpolicy representative cases、Bash / PowerShell verify、`pnpm run verify`は完了。evaluationはpartialでschema-validとした。
- 次は既存writer / collectorでevaluationとRun manifestを最終集約し、commit、normal push、PR #184本文更新、最新head CIを確認する。mergeは行わない。
- Plan全体は未完了扱いとし、interactive approval / direct network・Git metadata runtimeの未達をREPORTへ記録する。

## 2026-09-26 final aggregation status

- Evaluation JSONはASCII Unicode escapesへ修復し、Python schema validatorとWindows PowerShell JSON parserで有効性を確認した。
- 最終strict writer report reports/codex-task-20260926-101700.report.jsonはCodex exit 0、git diff --check exit 0、evaluation validation passed。
- run.jsonは既存writer / collectorが出力した。最新task statusはcompletedだが、validation.status=blockedとsafety.scope_violation=trueには先行writerの評価parse failure / scope引数binding誤りの履歴が保持される。actual manifestを手編集して履歴を消さない。
- Task 9のinteractive approval、network sandbox昇格、direct network / Git metadata runtimeは未達。auto-net preflight/runtime差は別のL3候補へdeferした。Planはpartialであり、commit / push / PR更新 / CI確認も継続する。

## 2026-09-26 precommit artifact checkpoint

- final sanitizer Write / Checkは24 files scan、0 replacements、0 residual findingsでPASS。
- existing collector `collect-run-artifacts.ps1 -RunId 20260925-111717-JST -RefreshGitChangedFiles -Strict`はexit 0。
- 最終run.json: status=completed、validation.status=blocked、safety.scope_violation=true、evaluation present、6 reports。blocked / scope flagは過去の同一Run内finalizer記録を保持するためであり、最新strict writer reportは成功。Run manifestは手編集していない。
- 過去のevaluation validation failure evidenceにはWindows PowerShell 5.1 ANSI decode由来の日本語mojibakeが残る。evaluation.json自体は修復・検証済みだが、actual run.jsonの履歴evidenceは直接編集せずblockerとして保持する。
- evaluation schema / PowerShell JSON parse / git diff --checkはPASS。interactive approvalとdirect runtimeの未達を含め、Plan outcomeはpartial。次はcommit、normal push、PR更新、latest-head CI。
