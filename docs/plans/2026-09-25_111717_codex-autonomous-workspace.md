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

通常のinteractive入口はRepository / workspace内からのdirect `codex` とする。

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

今回「高リスク時だけユーザーへ確認する」運用にはしない。通常作業で必要なoperationはrules側でallow可能にし、高リスクoperationは既存denyまたは `prompt -> neverによる拒否` を維持する。

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

## 2. interactive入口とRun Artifactの責務

### 通常のlightweight / standard

通常のinteractive作業はdirect `codex`を使う。

Run Artifactは引き続き残すが、direct sessionを既存wrapper presetとして偽装しない。

- `PLAN.md`
- `TASKS.md`
- `REPORT.md`

をactive Runとして管理する。

`scripts/new-run.*` を使う場合は、direct `codex` のlightweight / standard Runでは `--no-run-manifest` / `-NoRunManifest` を明示する。

この経路では `run.json` を作らない。

理由:

- 現行`RUN_MANIFEST.json`の `preset` はwrapper presetを表す。
- 現行`safety.network` は `codex-task` / wrapper側のpresetから算出され、direct sessionのproject network設定を観測しない。
- direct `codex`を `preset=safe / network=false` と記録するとmachine evidenceが実行経路と食い違う。
- direct session専用の新しいmanifest schema / writer / presetを今回追加する必要はない。

`scripts/new-run.*` の既定挙動自体は変更しない。wrapper /既存workflowとの互換性を維持し、direct経路だけ明示的に `--no-run-manifest` を使う。

### strict / machine-managed evidenceが必要なRun

strict Runは既存machine-managed経路を維持する。

- interactiveでwrapper evidenceが必要: `codex-safe -RunId` / `--run-id`
- non-interactive: `codex-task --record-run-manifest`
- evaluation: 既存 `evaluation.json` contract
- final aggregation: 既存collector

strict Runでは `run.json` / `evaluation.json` を維持し、Agentがactual `run.json`を直接作成・編集しない。

direct `codex` のproject defaultを確認するfresh E2Eは、strict Run本体のlauncherを置き換えず、独立したruntime validationとして実施する。その結果は `REPORT.md` と `evaluation.json` のevidenceへ記録する。

今回のRun Artifact変更はこの入口分離に限定し、direct session用daemon、Stop Hook集約、新しいmanifest schema / writer / presetを追加しない。

## 3. 今回のactive Run

active Run:

~~~text
Run ID: 20260925-111717-JST
Task type: harness-improvement
Workflow level: strict
~~~

今回の変更はpermission、sandbox network、rules、`codex-safe` / `codex-task` 契約を変更するHarness改善であり、Repository contract上strict対象である。

現時点では `run.json` / `evaluation.json` が未作成である。

L3承認後、source実装より先に同じRun IDを維持して既存machine-managed経路で補完する。

禁止:

- strict要件回避のためにWorkflow Levelを下げる
- Agentがactual `run.json`を手書きする
- 同一taskのためだけに別Runを作る
- direct session用manifest schemaを今回追加する

### strict Artifact bootstrap

既存 `codex-task` のmachine-managed経路を使う。

最低限:

~~~text
--run-id 20260925-111717-JST
--task-type harness-improvement
--workflow-level strict
--record-run-manifest
--evaluation-template
--allowed-files / --allowed-dirs / --allowed-globs
~~~

bootstrapはsourceを変更しない限定promptで行う。

final commit前にはevaluationを完了し、既存writer / collectorでmanifestを再集約する。

## 4. Repository設定の同期

### `.codex/config.toml`

次へ変更する。

~~~toml
sandbox_mode = "workspace-write"
approval_policy = "never"

[sandbox_workspace_write]
network_access = true
writable_roots = []
~~~

Hook、web search、shell environment、agent model等の無関係な設定は変更しない。

### `codex-project.toml`

現在のRepository metadata:

~~~toml
[safety]
default_sandbox_mode = "workspace-write"
network_access_in_workspace_write = false
~~~

を次へ同期する。

~~~toml
[safety]
default_sandbox_mode = "workspace-write"
network_access_in_workspace_write = true
~~~

`approval_policy` 用の新しいmetadata keyは追加しない。正本は `.codex/config.toml` とする。

### `.codex/requirements.toml`

runtime-criticalなproject instructionとして決め打ちしない。

OpenAIの現行仕様では `requirements.toml` はmanaged security requirements用であり、Repository内の `custom_instructions` が通常のproject instructionとして適用されることは公式contractから確認できない。

また現在のRepositoryでは `scripts/verify*` はこのファイルの存在だけを確認しており、`custom_instructions` 内容をruntime contractとして検証していない。

実装時に次を確認する。

- 実際のconsumer / managed distribution経路
- Repository内でこの `custom_instructions` を解釈するtool
- 現在利用しているCodex deploymentでの実効性

確認できない場合:

- `.codex/requirements.toml` は変更しない。
- direct `codex` のruntime contractをこのファイルへ依存させない。
- `scripts/verify*` に `custom_instructions` のliteral assertionを追加しない。

実consumerが確認でき、現在の文言がそのconsumerで実際に使われる場合だけ、同じ変更内でdirect `codex`方針へ同期する。

## 5. wrapper互換性

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

safeでは `sandbox_workspace_write.network_access=false` を明示overrideする。auto-netはtrueを維持する。

`auto-net` preset、`.codex/rules-auto-net/**`、`new-run`のpreset体系は変更しない。

## 6. execpolicy / Hook

### `git switch`

現在の `.codex/rules/20-risky-prompt.rules` は、

~~~text
git checkout
git switch
git merge
git rebase
git tag
~~~

を同じ `prompt` ruleにしている。

`approval_policy = "never"` では通常の `git switch` も自動拒否される。

通常のbranch切替は開発経路で必要であり、既存Hookは通常 `git switch feature/safe` をallowし、`--force`、`--force-create`、`--discard-changes` 等をdenyしている。

そのため今回、`git switch` だけをbroad `prompt` ruleから外す。

検証例:

- `git switch feature/safe` -> promptで止まらない
- `git switch -c feature/new` -> Hook / protected branch contractに反しない範囲で通常操作として扱える
- `git switch -C feature` -> deny
- `git switch --force-create=feature` -> deny
- `git switch --discard-changes feature` -> deny

### `git checkout`

`git checkout` はpromptのまま維持する。

理由:

- branch切替以外にworking tree path復元の意味を持つ。
- 現行Hookは `git checkout -- file`、`-B`、`-f` 等をdenyするが、broad promptを外す必要性はない。
- branch作成・切替は `git switch` で満たせる。

### その他

次は今回緩和しない。

- `git merge / rebase / tag`
- `curl / wget / Invoke-WebRequest` family
- shell wrapper
- infrastructure / cloud CLI
- OS / service / network設定

network有効化のruntime確認は `gh api --method GET` 等、既存prompt ruleに当たらないread-only経路で行う。

## 7. subagent

`implementation_worker` と `quality_gate_runner` は `sandbox_mode = "workspace-write"` を明示しているが、network禁止をrole固有contractとして明示していない。

従来network falseだったのはproject defaultの結果であり、現状のverify / docsにも「この2 roleはnetwork falseでなければならない」というcontractはない。

したがって根拠なくrole TOMLへ `network_access = false` を追加しない。

実装前後でresolved / effective configを確認し、

- read-only roleはread-onlyを維持
- workspace-write roleは、既存の明示的role contractにnetwork禁止がない限りproject defaultのnetwork trueを継承
- network禁止が必要だと確認できたroleだけ、根拠をREPORTへ記録して個別override
- developer instructions、write scope、Git mutation禁止、child delegation禁止は変更しない

とする。

## 8. PR #182との順序

PR #182は現在もPlan-onlyだが、最新Planはinteractive E2Eを `codex-safe.*` 前提としている。

今回のbranchでは通常interactive契約をdirect `codex`へ変更するため、両Planをそのまま実装すると契約が競合する。

順序を次で固定する。

1. このbranchでdirect `codex` の通常interactive契約を確定・実装・検証する。
2. このbranchの契約がmainへ入る前に、PR #182のwrapper前提の実装へ進まない。
3. このbranchがmainへ入った後、PR #182を最新mainへ同期する。
4. PR #182のinteractive MCP E2Eはdirect `codex`を基準へ修正する。
5. `codex-task` のnon-interactive E2EはPR #182の目的に必要なら維持する。
6. `codex-safe` は補助wrapperとして必要な追加検証がある場合だけPR #182で扱う。

このbranchからPR #182のbranch / filesは変更しない。

## 9. 変更対象

### 必須候補

- `.codex/config.toml`
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
- 対応する `docs/history/` snapshot
- active Run Artifact

### 条件付き

- `.codex/requirements.toml`
  - actual consumer / managed distributionで実効性が確認できた場合のみ
- `.codex/agents/implementation_worker.toml`
- `.codex/agents/quality_gate_runner.toml`
  - 明示的なnetwork禁止contractが確認できた場合のみ
- 関連 `tests/contracts/**`
  - 既存verify / testで回帰を検出できない場合のみ

### 原則変更しない

- `AGENTS.md`
- `.codex/hooks/**`
- `.codex/rules-auto-net/**`
- `.codex/rules/30-destructive-forbidden.rules`
- `scripts/new-run.*`
- `.codex/templates/RUN_MANIFEST.json`
- Product code
- GitHub branch protection / ruleset
- user-level `~/.codex/config.toml`
- credential / token保存方法
- PR #182のbranch / files
- 過去Plan / 過去Run / ADR

## 10. 実装手順

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
- `.codex/requirements.toml` の実consumer有無

### Task 1: strict Run bootstrap

同じRun IDを維持し、既存 `codex-task` のmachine-managed経路で `run.json` / evaluation template / scope evidenceを作る。

bootstrap完了前にsource設定を変更しない。

### Task 2: project default / metadata

- `.codex/config.toml` を workspace-write / approval never / network trueへ変更
- `codex-project.toml` のnetwork metadataをtrueへ同期
- `.codex/requirements.toml` はTask 0のconsumer確認結果に従う

### Task 3: wrapper互換性

- `codex-safe safe`: network falseを明示
- `codex-safe auto-net`: network trueを維持
- `codex-task safe`: network falseを明示
- `codex-task auto-net`: network trueを維持
- Bash / PowerShellを同じ意味にする

### Task 4: `git switch` rules

`.codex/rules/20-risky-prompt.rules` で `git switch` を既存broad promptから分離する。

`git checkout / merge / rebase / tag` はprompt維持。

Hook contractでdestructive switchがdenyのままであることを確認する。

### Task 5: subagent実効値

parent / configured roleのresolved / effective configを前後比較する。

根拠がない限りworkspace-write roleへnetwork falseを追加しない。

### Task 6: Run Artifact / Harness契約

`docs/reference/run-artifacts.md` と `docs/reference/codex-implementation-harness.md` を次へ同期する。

- lightweight / standardの通常interactiveはdirect `codex`
- direct `codex` のRun初期化では `new-run --no-run-manifest`
- strict / machine-managed evidenceが必要なRunは既存wrapper / codex-task経路
- `run.json`の直接編集は禁止のまま
- direct session用manifest schema / writerは追加しない
- strict task内のfresh direct E2Eは独立validationとしてREPORT / evaluationへ記録する

### Task 7: current docs

`docs/reference/codex-safety-harness.md`:

- project defaultをworkspace-write / never / network trueへ更新
- direct `codex`を通常interactive入口として記載
- wrapper / auto-netは補助経路として維持
- `never`時のexecpolicy promptが自動拒否になることを説明

`docs/guides/quickstart.md`:

- 通常interactive起動をdirect `codex`へ変更
- lightweight / standard Runはmanifestなしの初期化例を示す
- strict / wrapper / auto-netの用途を分離

`MIGRATION.md`:

- project defaultのnetwork / approval変更を記載
- auto-net削除migrationにはしない

`docs/PROJECT_CONTEXT.md`:

- 標準interactive経路をdirect `codex`へ更新
- strict Runは既存machine-managed経路を維持することを反映

`PROJECT_CONTEXT.md`変更前の内容を既存命名規則で `docs/history/` へ保存する。

`AGENTS.md`にはruntime設定値やwrapper詳細を追加しない。

### Task 8: verify / contract

`scripts/verify` / `scripts/verify.ps1`を同じ意味へ更新する。

確認対象:

- `.codex/config.toml`: workspace-write / approval never / network true
- `codex-project.toml`: `network_access_in_workspace_write = true`
- wrapper safe: network false
- wrapper auto-net: network true
- `codex-safe` safe / readonly: on-request
- `codex-safe` auto-net: never
- `codex-task`: never
- `git switch`:通常caseがpromptで止まらない
- `git checkout / merge / rebase / tag`:prompt維持
- destructive switch:deny
- command-based deletion:deny
- destructive Git / remote script piping / protected branch safety:既存deny維持
- compact Hook / AGENTS契約:未変更
- direct lightweight / standard docsが `--no-run-manifest` を要求する
- strict docsが既存machine-managed evidence経路を維持する

`.codex/requirements.toml` の `custom_instructions` はactual consumerが確認できた場合だけ内容を検証する。consumer未確認ならliteral assertionを追加しない。

既存contract testで検出できない回帰だけtestを追加・更新する。

### Task 9: fresh direct `codex` runtime

Repository / workspaceからfresh `codex`を直接起動する。

このfresh sessionは今回のstrict implementation sessionの代替ではなく、project defaultのE2E validationである。

確認:

1. wrapperなしで起動する。
2. project configが読み込まれる。
3. workspace内の通常編集がsandbox approvalなしで進む。
4. `gh api --method GET` 等のread-only network operationがsandbox network拒否なしで成功する。
5. build / lint / typecheck / test等の通常作業が進む。
6. 通常の `git switch` がrules承認待ちで止まらない。
7. `git checkout / merge / rebase / tag` 等、残したprompt ruleは `never` 契約どおりユーザーpromptを出さず拒否される。
8. destructive operationは実行せず、execpolicy / Hook contractでdenyを確認する。
9. Apps / MCP tool固有approval modeとHook trustは必要な既存機能だけ別契約として確認する。
10. danger-full-accessへfallbackしない。

結果は `REPORT.md` と `evaluation.json` のevidenceへ記録する。direct session用 `run.json` は作らない。

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

strict evaluationを完了し、既存machine-managed writer / collectorでactive Run manifestを最終集約する。

tracked Run Artifactはfinal commit前に確定する。

commit、normal push、PR作成または更新を行い、最新PR headの `Web CI` / `Mobile App CI` を確認する。

CI failureは既存repair contractに従う。

mergeは実行しない。

## 11. リスクとrollback

### `never` により必要なprompt ruleが拒否される

通常branch切替に必要な `git switch` だけ今回緩和する。

`git checkout` とその他のprompt familyは維持する。

### network access拡大

project workspace-write内のnetworkはtrueになる。

wrapper safeは明示falseを維持する。

subagentは既存role contractに禁止根拠がある場合だけ個別制限する。

### Run Artifact

direct `codex`用のmanifest modelを今回追加しない。

通常lightweight / standardはmanifestなし、strictは既存machine-managed evidenceとすることで、既存 `preset` / `safety.network` の意味を壊さない。

### `.codex/requirements.toml`

公式contractと実consumerを確認せず、通常project instructionとして扱わない。

### PR #182

今回の契約確定前にwrapper前提のinteractive MCP実装へ進めない。

### rollback

問題が発生した場合は今回の差分だけ戻す。

- `.codex/config.toml`: approval policy未設定 / network falseへ戻す
- `codex-project.toml`: network metadataをfalseへ戻す
- wrappers: safe network false override追加分を戻す
- rules: `git switch`分離差分を戻す
- docs / verify / history:同じ変更単位で旧契約へ戻す
- 条件付きで`.codex/requirements.toml` / subagentを変更した場合はその差分だけ戻す

`auto-net`、`AGENTS.md`、compact Hook、user config、credential、GitHub設定はrollback対象にしない。

## 12. 実装順

1. L3実装承認を確認する。
2. latest main / branch / PR #182 / Codex version / baseline / requirements consumerを確認する。
3. active Runを既存machine-managed経路でstrictへ補完する。
4. `.codex/config.toml` と `codex-project.toml` を同期する。
5. wrapper safe / auto-netの既存semanticsを維持する。
6. `git switch`だけをbroad prompt ruleから分離する。
7. parent / subagentの実効configを確認する。
8. Run Artifact / implementation / safety referenceを通常direct・strict machine-managedの2経路へ同期する。
9. quickstart / MIGRATION / PROJECT_CONTEXT / historyを同期する。
10. requirements consumerが実在する場合だけ`.codex/requirements.toml`を同期する。
11. Bash / PowerShell verifyと必要なcontract testを更新する。
12. focused test / Hook test / execpolicy / verifyを実行する。
13. fresh direct `codex`でproject defaultをE2E検証する。
14. strict evaluationとactive Run manifestを最終化する。
15. commit / normal push / PR作成または更新を行う。
16. 最新PR headの必須CIを確認する。
17. mergeは明示指示があるまで行わない。

## 13. 調査根拠

- OpenAI Codex config reference:
  https://developers.openai.com/ja-JP/docs/config-file/config-reference
- `approval_policy = "never"` は承認promptを表示せず自動拒否する。
- `requirements.toml` はmanaged security requirements用であり、project `.codex/config.toml` とは責務が異なる。
- Repositoryのstrict契約ではpermission / safety / runner / rules変更はstrict対象。
- 現行 `run.json` の `preset` / `safety.network` はwrapper / codex-taskのexecution metadataであり、direct `codex`のproject network設定を観測しない。
- 現行Hookは通常 `git switch` をallowし、destructive switchをdenyする一方、`git checkout` はpath restoreにも使えるためprompt維持が安全である。
- PR #182 latest Planはinteractive MCP E2Eをwrapper前提としているため、今回の通常interactive契約確定後に同期が必要である。
