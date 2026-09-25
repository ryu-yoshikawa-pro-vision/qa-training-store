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

direct `codex` では「高リスク時だけその場でユーザーへ確認する」運用にはしない。

- 通常作業で必要なoperationは、既存Hookとrulesで安全性を確認したうえでprompt不要にする。
- 高影響operationは既存denyまたはexecpolicy `prompt`を維持し、direct `never`では実行しない。
- ユーザーが高影響operationを明示的に依頼し、Repository契約上実行可能な場合でも、direct `never`の拒否を迂回しない。
- local例外操作（local branch delete、merge / rebase recovery等）は、既存`codex-safe safe`の`on-request`承認が成立することを条件に使う。network sandbox昇格は条件にしない。
- network例外操作（高影響GitHub CLI operation等）は、project default変更後も`codex-safe safe`で「execpolicy承認 + network sandbox昇格」が実runtimeで成立することを先に検証する。
- network例外操作では上記runtime検証が成功した場合だけ`codex-safe safe`を使う。
- network昇格runtime検証が失敗した場合はnetwork例外操作の承認経路だけをblockerとして報告し、local例外操作までblockしない。新preset、danger-full-access、approval bypass、network常時有効の承認wrapperを今回追加しない。
- normal direct workflowが拒否されたことだけを理由にwrapperへ自動fallbackしない。

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

direct `codex` へ自動適用されるものではなく、wrapperを明示利用した場合のpresetとして維持する。

現行wrapperは`auto-net`のpreflightでcommon `.codex/rules/20-risky-prompt.rules`を除外し、`.codex/rules-auto-net/*.rules`を追加して`codex execpolicy check`を実行する。

一方、actual Codex sessionへ`--rules`は渡していない。Repositoryが前提にするCodex 0.147.0ではproject config layerの`.codex/rules/*.rules`がruntime policyとして自動ロードされ、`.codex/rules-auto-net/*.rules`は自動ロードされない。

したがって責務を次で固定する。

- actual runtime policyの正本: `.codex/rules/*.rules`
- `.codex/rules-auto-net/*.rules`: 現行wrapperのpreflight専用overlay
- `--ignore-rules`やpreset-specific runtime loaderは今回追加しない

今回common `.codex/rules/20-risky-prompt.rules`へ追加するlocal branch deleteと高影響GitHub CLI operationは、actual auto-net sessionでもcommon ruleとして読み込まれる。auto-netは`approval_policy=never`なので、これらの`prompt`はruntimeでrejectされる。

`.codex/rules-auto-net/20-auto-net-risky-forbidden.rules`には同じ高影響operationをforbiddenとしてmirrorし、preflight時点でもreject期待値を確認する。ただし、これをruntime enforcementとは扱わない。

既存`.codex/rules-auto-net/10-auto-net-allow.rules`のread-only `git branch` allowと、`30-auto-net-forbidden.rules`の既存preflight契約は維持する。

なお現行auto-netには、preflight overlayでallowされてもactual runtimeではcommon promptに一致して`never`でrejectされるcommandが存在する可能性がある。この既存preflight/runtime差は実装前baselineで確認し、今回の目的に必要な安全境界以外は別課題として記録する。

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

`run.json.safety.network` は、既存machine-managed writer / `codex-task` reportが観測したexecution pathのnetwork利用を表す。strict task内で別途実施するfresh direct `codex` validationまで集約した「task全体でnetworkを使ったか」の値とは扱わない。

実装前に既存consumerを確認し、`safety.network` をtask全体の通信有無として解釈するvalidator / evaluatorが存在しないことを確認する。現在確認済みのconsumerは `docs/reference/run-artifacts.md`、`scripts/codex-task.sh`、`scripts/codex-task.ps1`、`scripts/collect-run-artifacts.py` であり、direct sessionを観測する経路はない。

今回のRun Artifact変更はこの入口分離と意味の明確化に限定し、direct session用daemon、Stop Hook集約、新しいmanifest schema / writer / presetを追加しない。

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

現在のRepository metadataはwrapper preset中心の表現を含み、通常interactiveをdirect `codex`へ変更した後の契約を十分に表せない。

network metadataは次へ同期する。

~~~toml
[safety]
default_sandbox_mode = "workspace-write"
network_access_in_workspace_write = true
~~~

同じ `[safety]` の `apply_patch_*` metadataも、direct workspace-writeと既存wrapper presetの両方を表すように更新する。新しいkeyは追加しない。

consumerが現在のliteral valueへ依存していないことを実装前に確認したうえで、意味を次へ揃える。

- file edit / create:
  - direct workspace-write、safe、auto-netでは許可
  - readonlyでは禁止
- delete:
  - readonly / auto-netでは禁止
  - direct workspace-write / safeでも `AGENTS.md` とSafety referenceに従い、明示された対象とレビュー可能な理由なしには実行しない
- rename / move:
  - readonly / auto-netでは禁止
  - direct workspace-write / safeでも必要性、影響、migration理由の確認なしには実行しない

`[workflow_levels.standard].run_manifest = "recommended"` は維持する。

direct standard Runでは現行manifestがdirect sessionを正確に表現できないため、通常interactive経路の明示的な例外として `--no-run-manifest` / `-NoRunManifest` を選ぶ。standard全体のevidence契約を `optional` へ弱めない。

`strict.run_manifest = "required"` は維持する。

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

`auto-net` presetと`new-run`のpreset体系は変更しない。`.codex/rules-auto-net/20-auto-net-risky-forbidden.rules`はpreflight overlayとして高影響operationのreject期待値をmirrorする。actual runtime enforcementの正本はcommon `.codex/rules/*.rules`とする。

`codex-safe safe` の `on-request` は、direct `never`で意図的に拒否している例外操作をユーザーが明示的に依頼した場合の承認経路としても維持する。通常作業の自動fallbackには使わない。

## 6. execpolicy / Git / GitHub CLI

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

### `git checkout / merge / rebase / tag`

次は `prompt` を維持する。

- `git checkout`
- `git merge`
- `git rebase`
- `git tag`

理由:

- `git checkout` はbranch切替以外にworking tree path復元の意味を持つ。
- branch作成・切替は `git switch` で満たせる。
- merge / rebase / tagは通常作業で無承認実行する必要がない。
- `codex-safe safe` では従来どおり `on-request` で明示承認できる。

既存Hookは `git rebase --abort` / `git merge --abort` と `--quit` をrecoveryとして扱うが、common execpolicyのbroad `prompt` がより厳しいため、direct `never`ではこれらも実行しない。

recoveryが必要な場合は、direct session内でpolicyを迂回せず、`codex-safe safe` の `on-request` 経路へ切り替える。この例外はrecovery時だけであり、通常interactive入口をwrapperへ戻すものではない。

### local branch削除

ユーザーの明示指示なしでbranch削除を行わない既存契約をdirect `never`でも維持する。

`.codex/rules/20-risky-prompt.rules` に次を追加する。

- `git branch -d <branch>`
- `git branch --delete <branch>`

direct `never`では拒否する。明示依頼がある場合は、networkを必要としないlocal例外操作として`codex-safe safe`の`on-request`承認経路を使用できる。network sandbox昇格の成功は条件にしない。

execpolicyはprefix matchなので、`-d` / `--delete`の基本形だけでなく、既存Hookが解釈する複合short optionやoption順序違いも検証対象にする。

少なくとも次をpromptとして固定する。

- `git branch -d old-feature`
- `git branch --delete old-feature`
- `git branch -vd old-feature`
- `git branch -dv old-feature`
- `git branch -v -d old-feature`

force deleteの `git branch -D` / `-f` は既存forbidden / Hook denyを維持し、承認経路へ昇格させない。remote branch deleteの既存denyも維持する。

### GitHub CLIの高影響操作

networkをproject defaultで有効にするため、これまでnetwork sandboxが追加防御になっていたGitHub上の高影響操作へexecpolicyの`prompt`を追加する。

このruleは通常CLI経路での誤実行を減らすdefense-in-depthであり、GitHub writeを技術的に完全遮断するtrust boundaryとは扱わない。networkと利用可能なcredentialを持つshellから別command / code pathで外部APIへ到達できる可能性があるため、Repositoryの人間承認契約をmachine-enforced hard guaranteeと表現しない。

強い外部権限分離が必要ならcredential broker、権限を絞った専用tool、agent環境外のcredential管理等が別設計として必要になるが、今回は追加しない。

新しいHook parserや別のpolicy engineは追加せず、既存 `.codex/rules/20-risky-prompt.rules` を使う。

少なくとも次を `prompt` にする。

- `gh api ...`
  - generic API writeの迂回経路を残さないため、methodにかかわらずfamily全体を対象にする
- `gh pr merge ...`
- `gh pr close ...`
- `gh issue close ...`
- `gh release create ...`
- `gh release delete ...`
- `gh repo delete ...`

direct `never`ではこれらを拒否する。

ユーザーが対象operationを明示的に依頼し、Repository契約上実行可能な場合でも、network例外操作で`codex-safe safe`を使えるのはTask 3のruntime検証でapproval + network昇格が成立した場合だけとする。成立しない場合はnetwork例外操作の承認経路をblockerとして扱い、今回のscopeで新しい承認presetを追加しない。

次の通常workflowは上記ruleで一括blockしない。

- `gh pr create`
- `gh pr edit`
- `gh pr checks`
- `gh pr view`
- `gh issue create`
- `gh issue edit`
- read-onlyな専用 `gh` subcommand

generic `gh api` はdirect modeでは使用しない。

### その他

次は今回緩和しない。

- `curl / wget / Invoke-WebRequest` family
- shell wrapper
- infrastructure / cloud CLI
- OS / service / network設定

network有効化のruntime確認はgeneric `gh api` を使わず、`git ls-remote <remote> HEAD` 等のread-only network operationを使う。

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
- `.codex/rules/README.md`
- `.codex/rules-auto-net/20-auto-net-risky-forbidden.rules`
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
  - rules / metadata / wrapper / Run Artifactの既存testで今回の回帰を検出できない場合のみ

### 原則変更しない

- `AGENTS.md`
- `.codex/hooks/**`
- `.codex/rules-auto-net/10-auto-net-allow.rules`
- `.codex/rules-auto-net/30-auto-net-forbidden.rules`
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
- `codex-project.toml` の `apply_patch_*` / `run_manifest` literal consumer有無
- `run.json.safety.network` のconsumerがmachine-managed execution path以外を前提にしていないこと

### Task 1: strict Run bootstrap

同じRun IDを維持し、既存 `codex-task` のmachine-managed経路で `run.json` / evaluation template / scope evidenceを作る。

bootstrap完了前にsource設定を変更しない。

### Task 2: project default / metadata

- `.codex/config.toml` を workspace-write / approval never / network trueへ変更
- `codex-project.toml`
  - network metadataをtrueへ同期
  - `apply_patch_*` metadataをdirect workspace-write + wrapper契約へ同期
  - standard `run_manifest=recommended` を維持
  - strict `run_manifest=required` を維持
- `.codex/requirements.toml` はTask 0のconsumer確認結果に従う

### Task 3: wrapper互換性

- `codex-safe safe`: network falseを明示
- `codex-safe auto-net`: network trueを維持
- `codex-task safe`: network falseを明示
- `codex-task auto-net`: network trueを維持
- Bash / PowerShellを同じ意味にする
- `codex-safe safe` の `on-request` をlocal / network例外操作の明示承認経路として維持する
- local例外操作ではon-request承認のみを条件とし、network昇格を要求しない
- network例外操作ではproject default変更後、safe wrapperから副作用のないread-only network operationを使い、execpolicy承認とnetwork sandbox昇格を経て通信できるか実runtimeで確認する
- network昇格検証が失敗した場合は高影響network operationの承認経路だけを未成立blockerとして扱い、local例外操作はblockしない。新presetを追加しない

### Task 4: execpolicy

`.codex/rules/20-risky-prompt.rules` を最小変更する。

- `git switch`だけを既存broad Git promptから外す
- `git checkout / merge / rebase / tag` はprompt維持
- `git branch -d / --delete` をpromptへ追加する
- `git branch -vd / -dv / -v -d` 等、既存Hookが解釈する複合short option / option順序違いもpromptになることを検証する
- `git branch -D / -f` とremote branch deleteの既存denyは維持する
- `gh api` familyをprompt
- `gh pr merge / close` をprompt
- `gh issue close` をprompt
- `gh release create / delete` をprompt
- `gh repo delete` をprompt
- `.codex/rules-auto-net/20-auto-net-risky-forbidden.rules` へ、local branch deleteと上記高影響GitHub CLI operationの同等forbiddenをpreflight mirrorとして追加する

確認:

- normal `git switch` はpromptで止まらない
- destructive switchはHook deny
- merge / rebase recoveryはdirect `never`ではreject、network昇格とは独立したlocal例外操作としてsafe wrapperのon-request approval対象
- local `git branch -d / --delete` はdirect `never`でreject、force / remote deleteは既存deny
- direct modeでgeneric `gh api` と高影響 `gh` operationがrejectされる
- normal PR create / edit / checksは今回追加ruleでblockされない
- auto-net preflight overlayではlocal branch deleteとgeneric `gh api` / 高影響`gh` operationがforbidden
- auto-net preflight overlayではread-only `git branch --show-current` 等の既存allowを維持する
- actual auto-net runtimeではproject common `.codex/rules/*.rules`が読み込まれ、今回追加するbranch delete / 高影響`gh` promptが`approval_policy=never`によりrejectされる
- preflight overlayでallowされる代表commandとactual auto-net runtimeのdecision差をbaselineとして確認し、既存差分があれば別課題として記録する

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
- `run.json.safety.network` はmachine-managed runner/reportのnetwork利用を要約し、別途実施するdirect runtime validationまでは表さない
- strict task内のfresh direct E2Eは外部runtime validation evidenceとしてREPORT / evaluationへ記録する

### Task 7: current docs

`docs/reference/codex-safety-harness.md`:

- project defaultをworkspace-write / never / network trueへ更新
- direct `codex`を通常interactive入口として記載
- wrapper / auto-netは補助経路として維持
- `never`時のexecpolicy promptが自動拒否になることを説明
- 高影響GitHub CLI operationとrecoveryの明示承認経路を説明
- direct workspace-writeの`apply_patch`契約をsafe相当の既存安全条件へ揃える

`docs/guides/quickstart.md`:

- 通常interactive起動をdirect `codex`へ変更
- lightweight / standard Runはmanifestなしの初期化例を示す
- strict / wrapper / auto-netの用途を分離

`MIGRATION.md`:

- project defaultのnetwork / approval変更を記載
- auto-net削除migrationにはしない
- direct modeではhigh-impact `gh` operationとGit recoveryがprompt ruleにより拒否され、必要時だけsafe wrapperへ切り替えることを記載

`docs/PROJECT_CONTEXT.md`:

- 標準interactive経路をdirect `codex`へ更新
- strict Runは既存machine-managed経路を維持することを反映

`PROJECT_CONTEXT.md`変更前の内容を既存命名規則で `docs/history/` へ保存する。

`AGENTS.md`にはruntime設定値やwrapper詳細を追加しない。

### Task 8: verify / contract

`scripts/verify` / `scripts/verify.ps1`を同じ意味へ更新する。

確認対象:

- `.codex/config.toml`: workspace-write / approval never / network true
- `codex-project.toml`
  - `network_access_in_workspace_write = true`
  - direct workspace-writeを含む`apply_patch_*`契約
  - standard manifest recommended / strict required
  - direct standardの `--no-run-manifest` は通常interactive経路の明示例外
- wrapper safe: network false
- wrapper auto-net: network true
- `codex-safe` safe / readonly: on-request
- `codex-safe` auto-net: never
- `codex-task`: never
- `git switch`:通常caseがpromptで止まらない
- `git checkout / merge / rebase / tag`:prompt維持
- destructive switch:deny
- local `git branch -d / --delete` と複合short option / option順序違い:prompt
- `git branch -D / -f` とremote branch delete:既存deny
- high-impact `gh` operation / generic `gh api`:prompt
- normal `gh pr create / edit / checks`:今回の追加ruleに一致しない
- auto-net preflight overlayのlocal branch delete / generic `gh api` / high-impact `gh` operation:forbidden
- auto-net preflight overlayのread-only branch inspection:既存allow維持
- actual auto-net runtime: common `.codex/rules/*.rules`を読み込み、今回追加した高影響promptは`never`でreject
- preflight-only `.codex/rules-auto-net/**`をruntime enforcementとは表現しない
- GitHub CLI prompt / preflight mirrorはdefense-in-depthであり、credentialを持つ任意code pathのhard boundaryとは扱わない
- command-based deletion:deny
- destructive Git / remote script piping / protected branch safety:既存deny維持
- compact Hook / AGENTS契約:未変更
- direct lightweight / standard docsが `--no-run-manifest` を要求する
- strict docsが既存machine-managed evidence経路を維持する
- `run.json.safety.network` とexternal direct E2Eの責務分離

`.codex/requirements.toml` の `custom_instructions` はactual consumerが確認できた場合だけ内容を検証する。consumer未確認ならliteral assertionを追加しない。

既存contract testで検出できない回帰だけtestを追加・更新する。

### Task 9: fresh direct `codex` runtime

Repository / workspaceからfresh `codex`を直接起動する。

このfresh sessionは今回のstrict implementation sessionの代替ではなく、project defaultの外部runtime validationである。

確認:

1. wrapperなしで起動する。
2. project configが読み込まれる。
3. workspace内の通常編集がsandbox approvalなしで進む。
4. `git ls-remote <remote> HEAD` 等のread-only network operationがsandbox network拒否なしで成功する。
5. local例外操作について、fresh `codex-safe safe` sessionで副作用のないprompt対象commandを使い、on-request承認が成立することを確認する。network sandbox昇格は要求しない。
6. network例外操作について、別のfresh `codex-safe safe` sessionで副作用のないread-only network operationを実行し、execpolicy承認とnetwork sandbox昇格の後に通信できるか確認する。成功した場合だけ、明示依頼された高影響network operationの承認経路としてsafe wrapperを採用する。失敗した場合はnetwork例外操作だけをblockerとして記録する。
7. build / lint / typecheck / test等の通常作業が進む。
8. 通常の `git switch` がrules承認待ちで止まらない。
9. `git checkout / merge / rebase / tag`、`git branch -d / --delete`と複合short option / option順序違い、generic `gh api`、high-impact `gh` operationは `never` 契約どおりユーザーpromptを出さず拒否される。
10. `git branch -D / -f`、remote branch delete、その他destructive operationは実行せず、execpolicy / Hook contractでdenyを確認する。
11. auto-net preflight overlayでlocal branch delete、generic `gh api`、high-impact `gh` operationがforbiddenとなり、read-only branch inspectionはallowのままであることをexecpolicyで確認する。
12. actual auto-net sessionではcommon project rulesが読み込まれることを、副作用のないrepresentative commandで確認する。common promptに一致するcommandが`never`でrejectされることと、preflight overlayのdecisionとの差をREPORTへ記録する。実外部変更は行わない。
13. normal `gh pr create / edit / checks` 等が今回追加したhigh-impact ruleで誤ってblockされないことをexecpolicyで確認する。実外部変更を伴うcommand自体はE2E目的だけでは実行しない。
14. Apps / MCP tool固有approval modeとHook trustは必要な既存機能だけ別契約として確認する。
15. danger-full-accessへfallbackしない。

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

`git checkout / merge / rebase / tag` はpromptを維持する。

merge / rebase recoveryが必要な場合はdirect `never`で迂回せず、safe wrapperの `on-request` を使う。

### network access拡大とGitHub外部副作用

project workspace-write内のnetworkはtrueになる。

generic `gh api` と明示的な高影響 `gh` operationをpromptに置き、direct `never`では拒否する。これは通常CLI経路のdefense-in-depthであり、networkとcredentialを持つshellからの全GitHub writeを技術的に封鎖するものではない。

通常のPR作成・更新・確認経路までblanket blockしない。強いcredential分離は今回のscopeへ追加しない。

auto-netのpreflightはcommon risky prompt ruleを除外するため、同じ高影響operationをauto-net専用rulesでforbiddenとしてmirrorする。ただしactual runtimeはcommon project rulesを読み込むため、auto-net専用rulesをruntime enforcementとは扱わない。

既存auto-netでpreflightとactual runtimeのdecisionが異なるcommandが確認された場合は、今回の目的に必要な安全境界だけを維持し、preset-specific runtime loader等へscopeを広げず別課題として記録する。

local例外操作のsafe wrapper承認経路はon-request approvalだけを確認する。明示依頼された高影響network operationのsafe wrapper承認経路はapproval + network昇格がruntimeで成立することを確認してから採用し、成立しなければnetwork例外操作だけをblockerとする。

### `codex-project.toml`

networkだけでなく、通常入口変更により意味が変わる `apply_patch_*` を同期する。

standard `run_manifest=recommended` は維持し、direct standardのmanifestなし運用は明示例外として文書化する。

literal consumerが存在する場合は先に互換性を確認する。

### Run Artifact

direct `codex`用のmanifest modelを今回追加しない。

通常lightweight / standardはmanifestなし、strictは既存machine-managed evidenceとする。

`run.json.safety.network` はmachine-managed execution pathの観測値であり、同じtaskで別途行うexternal direct E2Eまで表す値ではないことを明示する。

### `.codex/requirements.toml`

公式contractと実consumerを確認せず、通常project instructionとして扱わない。

### PR #182

今回の契約確定前にwrapper前提のinteractive MCP実装へ進めない。

### rollback

問題が発生した場合は今回の差分だけ戻す。

- `.codex/config.toml`: approval policy未設定 / network falseへ戻す
- `codex-project.toml`: network / apply_patch / standard manifest metadataを旧値へ戻す
- wrappers: safe network false override追加分を戻す
- rules:
  - `git switch`分離差分を戻す
  - GitHub CLI high-impact prompt ruleを戻す
  - `.codex/rules-auto-net/20-auto-net-risky-forbidden.rules` のpreflight mirror差分を戻す
- docs / verify / history:同じ変更単位で旧契約へ戻す
- 条件付きで`.codex/requirements.toml` / subagentを変更した場合はその差分だけ戻す

`auto-net` preset自体、`AGENTS.md`、compact Hook、user config、credential、GitHub設定はrollback対象にしない。auto-net専用ruleの今回差分だけはrollback対象とする。

## 12. 実装順

1. L3実装承認を確認する。
2. latest main / branch / PR #182 / Codex version / baseline / requirements consumer / metadata consumer / `safety.network` consumerを確認する。
3. active Runを既存machine-managed経路でstrictへ補完する。
4. `.codex/config.toml` と `codex-project.toml` を同期する。
5. wrapper safe / auto-netの既存semanticsを維持する。
6. `git switch`分離、local branch delete prompt（複合short option / option順序違いを含む）、GitHub CLI high-impact prompt ruleをcommon rulesへ追加し、auto-net専用rulesにはpreflight mirrorとして同等forbiddenを同期して`.codex/rules/README.md`を更新する。
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

- [OpenAI Codex config reference](https://developers.openai.com/ja-JP/docs/config-file/config-reference)
- [OpenAI Codex execpolicy](https://github.com/openai/codex/blob/main/codex-rs/execpolicy/README.md)
- `approval_policy = "never"` はexecpolicy `prompt`を承認表示ではなく拒否として扱う。
- execpolicyで複数ruleが一致する場合は `forbidden > prompt > allow` の最も厳しいdecisionが有効になる。
- `requirements.toml` はmanaged security requirements用であり、project `.codex/config.toml` とは責務が異なる。
- Repositoryのstrict契約ではpermission / safety / runner / rules変更はstrict対象。
- 現行 `run.json` の `preset` / `safety.network` はwrapper / codex-taskのexecution metadataであり、direct `codex`のproject network設定を観測しない。
- 現行Hookは通常 `git switch` をallowし、destructive switchをdenyする。
- 現行Hookは `git rebase --abort` / `git merge --abort` をrecoveryとしてallowするが、common execpolicy promptはdirect `never`でより厳しく拒否するため、recovery時はsafe wrapperのapproval経路を使う。
- Codex 0.147.0のruntimeは各config layerの`rules/*.rules`を自動ロードする。現行wrapperの`rules-auto-net`はpreflightの`codex execpolicy check --rules`にだけ使われ、actual sessionへは渡されない。
- PR #182 latest Planはinteractive MCP E2Eをwrapper前提としているため、今回の通常interactive契約確定後に同期が必要である。
