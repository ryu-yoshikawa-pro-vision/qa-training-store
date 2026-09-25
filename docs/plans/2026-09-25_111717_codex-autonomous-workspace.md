# Codex通常起動を自律実行向けに整理する実装計画

## 0. 目的

Repository / workspace内で `codex` を直接起動する通常運用を正規のinteractive経路にする。

project-scoped Codex設定は次へ変更する。

~~~toml
sandbox_mode = "workspace-write"
approval_policy = "never"

[sandbox_workspace_write]
network_access = true
writable_roots = []
~~~

このbranchではPlan作成だけで終了せず、L3承認後に実装、検証、commit、push、PR、最新PR headの必須CI確認まで進める。

既存の破壊操作ガード、`auto-net` preset、compact後の`AGENTS.md`再注入、Issue #135 / PR #147で整理済みの`AGENTS.md`責務は維持する。

## 1. 確定する契約

### direct `codex`

通常interactive入口はRepository / workspace内からのdirect `codex` とする。

project default:

~~~text
sandbox        = workspace-write
approval       = never
network        = true
~~~

`danger-full-access`、`--full-auto`、`--dangerously-bypass-approvals-and-sandbox` は導入しない。

### `approval_policy = "never"`

OpenAIの現行config contractに従い、top-level approval policyが扱う承認promptは表示せず自動拒否する。

対象:

- sandbox approval
- execpolicy `prompt`
- MCP elicitation
- `request_permissions`
- Skill approval

Apps / MCP tool固有のapproval modeとHook trustは別契約として扱う。

今回「高リスク時だけユーザーへ確認する」運用にはしない。通常作業で必要なoperationはrules側でallow可能にし、高リスクoperationは既存denyまたは`prompt -> neverによる拒否`を維持する。

### 既存の禁止

次は変更しない。

- `rm` / `git rm`
- `git reset --hard`
- `git clean -f`
- force push
- destructive checkout / switch
- infrastructure / cloud delete
- remote script piping
- protected branchの既存安全契約

### `auto-net`

`auto-net` は削除しない。

direct `codex` へ自動適用されるものではなく、wrapperを明示利用した場合のpresetとして現状維持する。

## 2. 現在の不整合と修正方針

### 2.1 Workflow Level

今回の変更はpermission、sandbox network、rules、`codex-safe` / `codex-task` 契約を変更するHarness改善である。

Repository contract:

- `docs/reference/codex-implementation-harness.md`: 安全性・移行・公開契約は`strict`
- `docs/reference/harness-improvement-loop.md`: rules、hooks、runner、`codex-safe`、`codex-task` は`strict`

したがってactive Runは`strict`として扱う。`run.json` / `evaluation.json` が未作成であることを理由に`standard`へ降格しない。

現在のRunはPlan作成時にmanifestなしで開始済みのため、L3実装開始前に同じRun IDを維持したまま既存machine-managed writerでstrict Artifactを補完する。

禁止:

- Agentがactual `run.json`を手書きする
- strict要件回避のためにWorkflow Levelを下げる
- 同一taskのためだけに別Runを作る

### 2.2 direct `codex` とactive Run

現在の`docs/reference/run-artifacts.md`は、active Runに紐づくinteractive実行で`codex-safe -RunId` / `--run-id`を必須としている。

これはdirect `codex`を通常interactive入口にする目的と矛盾するため、今回変更する。

変更後:

- active Runがある状態でもdirect `codex`を正規interactive経路として使用できる。
- direct `codex`とactive Runの対応は、同一会話・同一taskのactive Run、`PLAN.md`、`TASKS.md`、`REPORT.md`で管理する。
- `codex-safe -RunId` はactive Runへ紐づけるための必須入口ではなく、wrapper固有のpreflight、fixed preset、JSONL logging、終了時collectorが必要な場合の補助経路とする。
- actual `run.json` は引き続きmachine-managedとし、direct sessionから手書きしない。
- strict Runでは、既存`codex-task --record-run-manifest` / evaluation tooling / collectorを明示checkpointとして使い、manifestとevaluationを満たす。
- direct `codex`終了をtriggerにする新しいdaemon、Stop Hook集約、manifest writerは追加しない。

`docs/reference/run-artifacts.md` と `docs/reference/codex-implementation-harness.md` を同じ契約へ更新する。

### 2.3 Repositoryの設定契約

`.codex/config.toml` だけ変更すると、次が古い契約のまま残る。

`.codex/requirements.toml`:

- `codex-safe` を優先入口として案内している。
- ordinary mutationでselected wrapper / presetを使うよう指示している。

`codex-project.toml`:

~~~toml
[safety]
default_sandbox_mode = "workspace-write"
network_access_in_workspace_write = false
~~~

今回これらも変更対象にする。

- `.codex/requirements.toml`: direct `codex`を通常interactive入口とし、wrapperを補助経路へ変更する。
- `codex-project.toml`: `network_access_in_workspace_write = true` へ同期する。
- `scripts/verify` / `scripts/verify.ps1`: ファイル存在確認だけでなく、新しいcontract値と入口の整合を検証する。

新しいRepository metadata keyは今回追加しない。`approval_policy` の正本は `.codex/config.toml` とする。

### 2.4 `git checkout / switch`

現在の`.codex/rules/20-risky-prompt.rules`は次を同じ`prompt` ruleにまとめている。

~~~text
git checkout
git switch
git merge
git rebase
git tag
~~~

`approval_policy = "never"`では、安全な`git checkout / switch`も自動拒否される。

branch作成・切替は通常開発経路で必要なため、今回は条件付きではなく必須修正とする。

変更方針:

- 通常の`git checkout / switch`をbroad `prompt` ruleから外す。
- `git merge / rebase / tag` は既存`prompt`を維持する。
- `--force`、`--discard-changes`等のdestructive checkout / switchは既存Hook denyを維持する。
- protected branch mutationの既存Hook contractを維持する。
- `curl / wget`、infrastructure / cloud CLI等の他のbroad `prompt`は今回の目的だけでは緩和しない。

network有効化のruntime確認は`gh api --method GET`等、既存prompt ruleに当たらないread-only経路で行う。

### 2.5 subagent

`implementation_worker` と `quality_gate_runner` は `sandbox_mode = "workspace-write"` を明示しているが、network禁止をrole固有contractとして明示していない。

従来network falseだったのはproject defaultの結果であり、現状のverify / docsにも「この2 roleはnetwork falseでなければならない」という契約はない。

したがって今回、根拠なくrole TOMLへ`network_access = false`を追加しない。

実装前後でresolved / effective configは確認するが、判断は次とする。

- read-only roleはread-onlyを維持する。
- workspace-write roleは、既存の明示的なrole contractにnetwork禁止が確認できない限り、project defaultのnetwork trueを継承させる。
- network禁止が必要だと確認できたroleだけ、根拠をREPORTへ記録して個別overrideする。
- developer instructions、write scope、Git mutation禁止、child delegation禁止は変更しない。

## 3. strict Run Artifact

active Run:

~~~text
Run ID: 20260925-111717-JST
Task type: harness-improvement
Workflow level: strict
~~~

現時点では`run.json` / `evaluation.json`が未作成である。これは既知の未完了事項として扱い、source実装より先に補完する。

### machine-managed bootstrap

L3承認後の最初の実行工程で、既存`codex-task`のmachine-managed経路を使い、同じRun IDへ次を作成・更新する。

- `run.json`
- `evaluation.json` template
- explicit scope evidence

使用する既存option:

~~~text
--run-id 20260925-111717-JST
--task-type harness-improvement
--workflow-level strict
--record-run-manifest
--evaluation-template
--allowed-files / --allowed-dirs / --allowed-globs
~~~

bootstrapはsourceを変更しない限定promptで実行する。`run.json`を直接作成・編集しない。

最終commit前には同じRunでevaluationを完了し、machine-managed writer / collectorを通してmanifestを再集約する。

### strict source scope

実装時の許可範囲は次に限定する。

必須候補:

- `.codex/config.toml`
- `.codex/requirements.toml`
- `codex-project.toml`
- `.codex/rules/20-risky-prompt.rules`
- `scripts/codex-safe.ps1`
- `scripts/codex-safe.sh`
- `scripts/codex-task.ps1`
- `scripts/codex-task.sh`
- `scripts/verify`
- `scripts/verify.ps1`
- `docs/reference/codex-safety-harness.md`
- `docs/reference/codex-implementation-harness.md`
- `docs/reference/run-artifacts.md`
- `docs/guides/quickstart.md`
- `MIGRATION.md`
- `docs/PROJECT_CONTEXT.md`
- 対応する`docs/history/` snapshot
- active Run Artifact

条件付き:

- `.codex/agents/implementation_worker.toml`
- `.codex/agents/quality_gate_runner.toml`
- 関連`tests/contracts/**`

上記以外へ変更が必要になった場合は、理由をREPORTへ記録し、scopeを黙って拡張しない。

## 4. 実装手順

### Task 0: L3承認とbaseline

source変更前にユーザーのL3実装承認を確認する。

確認・記録:

- latest `main` / branch head
- PR #182 latest head
- current Codex version
- parent sessionの実効sandbox / approval / network
- configured subagent roleの実効sandbox / approval / network
- wrapper presetのcurrent final args
- Bash / PowerShell verify baseline
- current execpolicy代表case

### Task 1: strict Run bootstrap

同じRun IDを維持し、既存`codex-task`のmachine-managed経路で`run.json` / evaluation template / scope evidenceを作る。

bootstrap完了前にsource設定を変更しない。

### Task 2: project default

`.codex/config.toml`:

~~~toml
sandbox_mode = "workspace-write"
approval_policy = "never"

[sandbox_workspace_write]
network_access = true
writable_roots = []
~~~

Hook、web search、shell environment、agent model等の無関係な設定は変更しない。

`codex-project.toml`:

~~~toml
[safety]
default_sandbox_mode = "workspace-write"
network_access_in_workspace_write = true
~~~

`.codex/requirements.toml`:

- direct `codex`を通常interactive入口とする。
- `codex-safe`はfixed preset / preflight / logging / manifest syncが必要な場合の補助wrapperとする。
- `codex-task`はnon-interactive runnerのまま維持する。
- destructive command禁止等の既存安全契約は維持する。

### Task 3: wrapper互換性

project defaultがnetwork trueでもwrapperの既存preset semanticsを維持する。

`codex-safe`:

~~~text
safe      = workspace-write / on-request / network false
readonly  = read-only / on-request
auto-net  = workspace-write / never / network true
~~~

`codex-task`:

~~~text
safe      = workspace-write / never / network false
readonly  = read-only / never
auto-net  = workspace-write / never / network true
~~~

safeでは`sandbox_workspace_write.network_access=false`を明示overrideする。auto-netはtrueを維持する。

### Task 4: rules整合

`.codex/rules/20-risky-prompt.rules`を最小変更する。

- `checkout / switch`を`merge / rebase / tag`と分離する。
- 通常`checkout / switch`はbroad prompt対象から外す。
- `merge / rebase / tag`はprompt維持。
- destructive checkout / switchはHook deny維持。
- その他のprompt familyは原則変更しない。

execpolicyとHook contractの両方で回帰を確認する。

### Task 5: subagent実効値

変更後にparent / custom roleのresolved / effective configを確認する。

- read-only roleがread-onlyである。
- workspace-write roleがproject network trueを継承しても、既存role contractと矛盾しないことを確認する。
- 明示的なnetwork禁止契約が見つからない限り、role TOMLへfalse overrideを追加しない。
- 既存scope / Git mutation / delegation禁止を維持する。

### Task 6: Run Artifact契約

`docs/reference/run-artifacts.md`を更新する。

- active Runがあるinteractive taskでもdirect `codex`を正規入口として認める。
- `codex-safe -RunId`をactive Run紐付けの必須条件から外す。
- direct sessionはautomatic manifest syncを提供しないことを明記する。
- strict Runではmachine-managed `codex-task --record-run-manifest` / evaluation / collector checkpointを必須にする。
- `run.json`の直接編集禁止は維持する。
- direct session終了Hookをmanifest writerへ変更しない。

`docs/reference/codex-implementation-harness.md`も同じ入口とcheckpoint契約へ同期する。

### Task 7: current docs

`docs/reference/codex-safety-harness.md`:

- project defaultをworkspace-write / never / network trueへ更新。
- direct `codex`を通常interactive入口とする。
- wrapper / auto-netは補助経路として維持。
- `never`時のexecpolicy promptが自動拒否になることを説明する。

`docs/guides/quickstart.md`:

- 通常interactive起動をdirect `codex`へ変更。
- wrapper / auto-netの明示用途は残す。

`MIGRATION.md`:

- project defaultのnetwork / approval変更を記載する。
- auto-net削除migrationにはしない。

`docs/PROJECT_CONTEXT.md`:

- 標準interactive経路をdirect `codex`へ更新。
- wrapper / auto-net / strict Run checkpointの役割を反映する。

`PROJECT_CONTEXT.md`変更前の内容を、既存命名規則に従って`docs/history/`へ保存する。

`AGENTS.md`にはruntime設定値やwrapper詳細を追加しない。

### Task 8: verify / contract

`scripts/verify` / `scripts/verify.ps1`を同じ意味へ更新する。

確認対象:

- `.codex/config.toml`: workspace-write / approval never / network true
- `codex-project.toml`: `network_access_in_workspace_write = true`
- `.codex/requirements.toml`: direct `codex`が通常interactive入口
- wrapper safe: network false
- wrapper auto-net: network true
- `codex-safe` safe / readonly: on-request
- `codex-safe` auto-net: never
- `codex-task`: never
- `checkout / switch`:通常caseがpromptで止まらない
- destructive checkout / switch: deny
- command-based deletion: deny
- destructive Git / remote script piping / protected branch safety:既存deny維持
- compact Hook / AGENTS契約:未変更

既存contract testで検出できない回帰だけtestを追加・更新する。

### Task 9: fresh direct `codex` runtime

Repository / workspaceからfresh `codex`を直接起動する。

確認:

1. wrapperなしで起動する。
2. project configが読み込まれる。
3. workspace内の通常編集がsandbox approvalなしで進む。
4. `gh api --method GET`等のread-only network operationがsandbox network拒否なしで成功する。
5. build / lint / typecheck / test等の通常作業が進む。
6. 通常の`git switch`がrules承認待ちで止まらない。
7. `merge / rebase / tag`等、残したprompt ruleは`never`契約どおりユーザーpromptを出さず拒否される。
8. destructive operationは実行せず、execpolicy / Hook contractでdenyを確認する。
9. Apps / MCP tool固有approval modeとHook trustは必要な既存機能だけ別契約として確認する。
10. danger-full-accessへfallbackしない。

### Task 10: 最終検証とGitHub lifecycle

少なくとも次を実行する。

~~~text
focused contract test
pnpm run test:hooks
codex execpolicy check の代表case
bash scripts/verify
powershell -ExecutionPolicy Bypass -File scripts/verify.ps1
pnpm run verify
~~~

strict evaluationを完了し、machine-managed writer / collectorでRun manifestを最終集約する。

tracked Run Artifactはfinal commit前に確定する。

commit、normal push、PR作成または更新を行い、最新PR headの`Web CI` / `Mobile App CI`を確認する。

CI failureは既存repair contractに従う。

mergeは実行しない。

## 5. 原則変更しないもの

- `AGENTS.md`
- `.codex/hooks/**`
- `.codex/rules-auto-net/**`
- `.codex/rules/30-destructive-forbidden.rules`
- Product code
- GitHub branch protection / ruleset
- user-level `~/.codex/config.toml`
- credential / token保存方法
- PR #182のMCP waiter実装
- 過去Plan / 過去Run / ADR

`scripts/new-run.*`は、direct `codex`対応のために実際のartifact矛盾が確認された場合のみ変更する。今回の目的だけでpreset体系を増やさない。

## 6. リスクとrollback

### `never`により必要なprompt ruleが拒否される

`checkout / switch`は今回必須修正する。

その他のprompt familyは必要性を確認せず緩和しない。

### network access拡大

project workspace-write内のnetworkはtrueになる。

wrapper safeは明示falseを維持し、subagentは既存role contractに禁止根拠がある場合だけ個別制限する。

### direct `codex` とRun Artifact

launcherとartifact管理を分離する。direct session自体に新しい自動manifest writerを追加せず、既存machine-managed checkpointを再利用する。

### PR #182との競合

実装開始時にPR #182 latest headを再確認する。

先にmergeされた変更をbaselineへ取り込み、古いnetwork false / wrapper-only前提を競合解消で復活させない。

### rollback

問題が発生した場合は今回の差分だけ戻す。

- `.codex/config.toml`: approval policy未設定 / network falseへ戻す。
- `codex-project.toml`: network metadataをfalseへ戻す。
- `.codex/requirements.toml`:旧入口説明へ戻す。
- wrappers: safe network false override追加分を戻す。
- rules: checkout / switch分離差分を戻す。
- docs / verify / history:同じ変更単位で旧契約へ戻す。
- 条件付きsubagent変更があればその差分だけ戻す。

`auto-net`、`AGENTS.md`、compact Hook、user config、credential、GitHub設定はrollback対象にしない。

## 7. 実装順

1. L3実装承認を確認する。
2. latest main / branch / PR #182 / Codex version / baselineを確認する。
3. active Runを既存machine-managed経路でstrictへ補完する。
4. `.codex/config.toml`、`codex-project.toml`、`.codex/requirements.toml`を同期する。
5. wrapper safe / auto-netの既存semanticsを維持する。
6. `checkout / switch` rulesを最小分離する。
7. parent / subagentの実効configを確認する。
8. Run Artifact / implementation / safety referenceをdirect `codex`契約へ同期する。
9. quickstart / MIGRATION / PROJECT_CONTEXT / historyを同期する。
10. Bash / PowerShell verifyと必要なcontract testを更新する。
11. focused test / Hook test / execpolicy / verifyを実行する。
12. fresh direct `codex`でruntime検証する。
13. strict evaluationとRun manifestを最終化する。
14. commit / normal push / PR作成または更新を行う。
15. 最新PR headの必須CIを確認する。
16. mergeは明示指示があるまで行わない。

## 8. 調査根拠

- OpenAI Codex config reference:
  https://developers.openai.com/ja-JP/docs/config-file/config-reference
- `approval_policy = "never"` は承認promptを表示せず自動拒否する。
- granular policyでは`sandbox_approval`、`rules`、`mcp_elicitations`、`request_permissions`、`skill_approval`を個別制御できる。
- Repositoryのstrict契約ではpermission / safety / runner / rules変更はstrict対象。
- 現在のactive Run interactive contractは`codex-safe -RunId`を必須としており、direct `codex`正規化には更新が必要。
- `.codex/requirements.toml`と`codex-project.toml`も現行wrapper / network false契約を保持している。
