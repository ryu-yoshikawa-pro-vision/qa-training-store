# Codex通常起動を自律実行向けに整理する実装計画

## 0. 目的

このbranchでPlan作成だけで終了せず、設定変更、互換性維持、検証、commit、push、PR、最新PR headのCI確認まで進める。

通常のinteractive利用はRepository / workspace内で `codex` を直接起動する運用とし、project-scoped Codex設定を次へ変更する。

~~~toml
sandbox_mode = "workspace-write"
approval_policy = "never"

[sandbox_workspace_write]
network_access = true
writable_roots = []
~~~

今回の変更では、既存の破壊操作ガード、`auto-net` preset、compact後の`AGENTS.md`再注入、Issue #135 / PR #147で整理済みの`AGENTS.md`責務を維持する。

## 1. 完了条件

- `.codex/config.toml` が `workspace-write / approval never / network enabled` を明示する。
- fresh direct `codex` sessionでproject configが読み込まれ、workspace内の通常編集と代表的なnetwork accessが追加のsandbox承認なしで成功する。
- `approval_policy = "never"` は、top-level approval policyが扱う `sandbox_approval`、execpolicy `prompt`、MCP elicitation、`request_permissions`、Skill approvalをユーザーpromptへ出さず自動拒否する契約として扱う。Apps / MCP tool固有のapproval modeやHook trustは別契約として扱う。
- execpolicyの既存`prompt` ruleは、`never`移行後は「人へ確認する経路」ではなく実質的な非対話拒否になることを文書化・検証する。
- `danger-full-access`、`--full-auto`、`--dangerously-bypass-approvals-and-sandbox`を導入しない。
- `rm`、`git rm`、`git reset --hard`、`git clean -f`、force push、remote script piping等の既存denyを維持する。
- `auto-net` presetと`.codex/rules-auto-net/**`を維持する。
- compact時の `SessionStart(source=compact) -> session_start_context.mjs -> root AGENTS.md` 再注入契約を維持する。
- Issue #135 / PR #147で確定した`AGENTS.md`の責務分離を再実装しない。runtime設定値や個別command policyを`AGENTS.md`へ重複記載しない。
- `codex-safe` / `codex-task` の既存preset semanticsを維持する。
- direct `codex` を通常interactive入口とするが、strict Runでmachine-managed `run.json` のinteractive syncが必要な場合は、既存`codex-safe -RunId`経路を引き続き正規経路とする。今回Run Artifact lifecycle自体は再設計しない。
- `scripts/verify` と `scripts/verify.ps1` が新しいproject defaultと既存preset semanticsを検証してPASSする。
- parent sessionとworkspace-write subagentの実効設定を前後比較し、意図しないnetwork / approval境界の拡大を残さない。
- `docs/PROJECT_CONTEXT.md` を更新する場合は、既存`AGENTS.md`契約どおり対応する`docs/history/` snapshotを追加する。
- 同じbranchで実装をcommit / pushし、PRを作成または更新し、最新PR headの必須CIを確認する。
- mergeはユーザーから明示指示があるまで行わない。

## 2. 現状と確定事項

### project config

mainでは次の状態である。

- `sandbox_mode = "workspace-write"`
- `approval_policy` は未設定
- `sandbox_workspace_write.network_access = false`
- `writable_roots = []`
- `features.hooks = true`

`scripts/verify` と `scripts/verify.ps1` も、approval policy未設定と `network_access = false` をcurrent contractとして検証している。

OpenAIの現行config referenceでは、`approval_policy` は `on-request | never | granular` を取り、`never` は承認promptを表示せず自動拒否する。granularでは `sandbox_approval`、`rules`、`mcp_elicitations`、`request_permissions`、`skill_approval` を個別制御できる。

今回はユーザー要件どおり `never` を採用し、「高リスク時だけ人へ聞く」運用にはしない。

### direct codex とwrapper

実運用の通常interactive入口はdirect `codex` とする。

既存wrapperには独立した役割があるため削除しない。

`codex-safe`:

- safe: `workspace-write / on-request / network false`
- readonly: `read-only / on-request`
- auto-net: `workspace-write / never / network true`
- preflight、引数制限、JSONL log、Run manifest sync

`codex-task`:

- non-interactive `codex exec` 用
- approvalはnever
- safe / readonly / auto-netでsandboxとnetwork契約を切り替える

project defaultをnetwork trueへ変更すると、wrapperが明示overrideしないsafe presetの実効networkもtrueへ変わる。これは今回の目的ではないため、safe presetはwrapper側でnetwork falseを明示する。

### auto-net

`auto-net` はdirect `codex`へ自動適用されない明示presetである。今回削除しない。

- `.codex/rules-auto-net/**`
- `codex-safe / codex-task --preset auto-net`
- `new-run` のpreset契約
- auto-net preflight / verify
- current reference内のauto-net説明

は維持する。

### AGENTS.md / compact

Issue #135 / PR #147で`AGENTS.md`は常駐指示と詳細仕様を分離済みである。

`.codex/config.toml` の `SessionStart` Hookは `source === "compact"` の場合に`session_start_context.mjs`を通じてroot `AGENTS.md`全文を`additionalContext`へ再注入する。

今回この仕組みと`AGENTS.md`の責務を変更しない。

### approval never とrules

現在の `.codex/rules/20-risky-prompt.rules` は、少なくとも次を`prompt`としている。

- `git checkout / switch / merge / rebase / tag`
- `curl / wget / Invoke-WebRequest / Invoke-RestMethod`
- `docker / kubectl / helm / terraform / aws / az / gcloud`
- shell wrapper
- OS / service / network設定

`approval_policy = "never"` 後、これらはユーザーへ承認を求めず拒否される。

今回の方針は次のとおり。

- 既存prompt ruleを全面削除しない。
- high-impact mutationを自律化しない。
- 通常workflowに必要なcommand familyだけ、事前に定義した代表caseとHook回帰を満たす場合に最小限緩和する。
- `rm` / `git rm`等の既存forbiddenは変更しない。

### Run Artifact

現行契約では、interactive `run.json` 更新の正規経路は `codex-safe -RunId` 終了時のcollectorである。

今回direct `codex` を通常入口へ変更しても、このRun Artifact lifecycleを同時に再設計しない。

- lightweight / standardの通常interactive作業は、Workflow Level上`run.json`が必須でない場合はdirect `codex`を使用できる。
- strict Run、または既存`run.json`をinteractive session終了時にmachine-managed syncする必要がある作業では、`codex-safe -RunId`を引き続き使用する。
- direct `codex`用に新しいdaemon、Stop Hook集約、manifest writer、presetを今回追加しない。
- `docs/reference/run-artifacts.md`の既存machine-managed contractは維持する。

現在のPlan作成Runは、実装そのもののstrict runtime evidenceを担わせない。Workflow Levelはstandardとして継続し、Plan / TASKS / REPORTをこのbranchの実装進行に使う。L3安全性は明示承認、rollback、focused contract、Hook、execpolicy、fresh runtime、Repository verifyで担保する。

### subagent

`.codex/agents/*.toml` はroleごとの設定レイヤーであり、project config変更後の実効値を確認する必要がある。

特にworkspace-write role:

- `implementation_worker`
- `quality_gate_runner`

はnetwork設定を個別に持っていない。

実装前後でresolved/effective configを確認し、project default変更によってこれらのnetwork accessがfalseからtrueへ広がる場合は、role側へ `sandbox_workspace_write.network_access = false` を明示して既存境界を維持する。read-only roleはsandbox変更を行わない。

approval policyはproject `never` を継承してよいが、subagentに新たな権限昇格経路を追加しない。

## 3. 対象範囲

### 必須変更候補

- `.codex/config.toml`
- `scripts/codex-safe.ps1`
- `scripts/codex-safe.sh`
- `scripts/codex-task.ps1`
- `scripts/codex-task.sh`
- `scripts/verify`
- `scripts/verify.ps1`
- `docs/reference/codex-safety-harness.md`
- `docs/reference/codex-implementation-harness.md`
- `docs/guides/quickstart.md`
- `MIGRATION.md`
- `docs/PROJECT_CONTEXT.md`
- `docs/history/<timestamp>_project-context-*.md`
- active Run Artifact

### 条件付き変更

- `.codex/rules/20-risky-prompt.rules`
  - normal workflowを`never`により阻害する代表caseを緩和すると決めた場合だけ変更する。
- `.codex/agents/implementation_worker.toml`
- `.codex/agents/quality_gate_runner.toml`
  - resolved configでnetwork境界が拡大する場合だけ明示overrideを追加する。
- 既存contract test
  - 現行verifyで回帰を検出できない場合だけ更新・追加する。

### read-only確認対象

- `AGENTS.md`
- `.codex/hooks/session_start_context.mjs`
- `.codex/hooks/pre_tool_use_policy.mjs`
- `.codex/hooks/pre_tool_use_policy_windows.ps1`
- `.codex/rules/10-readonly-allow.rules`
- `.codex/rules/30-destructive-forbidden.rules`
- `.codex/rules-auto-net/**`
- `scripts/new-run.*`
- `docs/reference/run-artifacts.md`
- `tests/contracts/**`
- `.github/workflows/**`

### 原則変更しない

- `AGENTS.md`
- `.codex/hooks/**`
- `.codex/rules-auto-net/**`
- `.codex/rules/30-destructive-forbidden.rules`
- `scripts/new-run.*`
- `docs/reference/run-artifacts.md`
- 過去Run Artifact
- 過去Plan
- `docs/adr/**`
- Product code
- GitHub branch protection / ruleset
- user-level `~/.codex/config.toml`
- credential / token保存方法
- PR #182のMCP waiter実装

## 4. 実装手順

### Task 0: L3 gateとbaseline

実装開始前にユーザーの明示承認を確認する。

記録する。

- latest main / branch head
- PR #182 latest head
- current Codex version
- parent sessionの実効sandbox / approval / network
- configured subagent roleの実効sandbox / approval / network
- wrapper presetのcurrent final args
- Bash / PowerShell verify baseline

### Task 1: project default

`.codex/config.toml`へ次を設定する。

~~~toml
sandbox_mode = "workspace-write"
approval_policy = "never"

[sandbox_workspace_write]
network_access = true
writable_roots = []
~~~

Hook、agents、web_search、shell environment等の無関係な設定は変更しない。

### Task 2: wrapper互換性

project defaultがnetwork trueでも既存preset semanticsを維持する。

`codex-safe`:

- safe: workspace-write / on-request / network false
- readonly: read-only / on-request
- auto-net: workspace-write / never / network true

`codex-task`:

- safe: workspace-write / never / network false
- readonly: read-only / never
- auto-net: workspace-write / never / network true

safe presetでは `sandbox_workspace_write.network_access=false` を明示overrideする。auto-netはtrueを維持する。

### Task 3: approval never / rulesの整合

実装前baselineと変更後configで、少なくとも次をexecpolicyで確認する。

- allowのまま維持するもの:
  - `git status`
  - `git diff`
  - feature branch上の通常`git add / commit / push`
  - build / lint / typecheck / test
  - package managerの通常操作
- 既存prompt:
  - `git switch`
  - plain network read
  - infrastructure / cloud CLI
  - shell wrapper
- forbidden:
  - `rm`
  - `git rm`
  - hard reset / forced clean / force push
  - infrastructure / cloud delete
  - remote script piping

`never`ではprompt ruleがユーザー承認へ進まないことを成功条件に含める。

通常運用で必要な `git switch` 等が実際に阻害される場合は、そのcommand familyだけprompt ruleを分割・縮小する。plain network readについては `gh api GET` やpackage registry access等、既存prompt ruleに当たらない代表経路でもnetwork trueを検証できるため、`curl` familyを自動的に緩和しない。

infrastructure / cloud write、service / OS変更、remote shell wrapperは今回の自律化対象にしない。

### Task 4: subagent境界

parentと各configured roleのresolved/effective configを比較する。

- read-only roleはread-onlyのまま。
- `implementation_worker` / `quality_gate_runner` がproject network trueを継承して既存のnetwork false境界を失う場合だけ、role TOMLへnetwork falseを明示する。
- roleごとのdeveloper instructions、write scope、Git mutation禁止を変更しない。
- subagentへdanger-full-accessや追加writable rootを与えない。

### Task 5: current docs

`codex-safety-harness.md`:

- project defaultをworkspace-write / never / network trueへ更新。
- direct `codex`を通常interactive入口として記載。
- wrapper presetとauto-netは維持。
- `never`でprompt ruleが自動拒否になることを明記。

`codex-implementation-harness.md`:

- direct `codex`を通常interactive入口へ変更。
- strict Run / manifest syncが必要なinteractive workは`codex-safe -RunId`を使う例外を明記。
- `codex-task`、auto-netの既存用途を維持。

`quickstart.md`:

- 通常interactiveはdirect `codex`。
- wrapper / auto-netは明示用途として残す。

`MIGRATION.md`:

- project defaultがnetwork true / neverへ変わることを記載。
- auto-net削除migrationにはしない。

`PROJECT_CONTEXT.md`:

- 標準interactive経路をdirect `codex`へ更新。
- wrapper / auto-net / strict Runの例外を維持。

`PROJECT_CONTEXT.md`を変更するため、変更前状態を既存命名規則に従って`docs/history/<timestamp>_project-context-*.md`へ保存する。

`AGENTS.md`と`run-artifacts.md`は原則変更しない。

### Task 6: verify / contract

Bash / PowerShellを同じ意味へ更新する。

project config:

- workspace-write
- approval never
- network true

wrapper:

- safe network false
- auto-net network true
- codex-safe safe / readonly = on-request
- codex-safe auto-net = never
- codex-task = never
- auto-net preflight維持

safety:

- command-based deletion
- destructive Git
- remote script piping
- protected branch

subagent:

- resolved/effective network境界の期待値を、既存verifyで表現可能なら追加する。
- runtime固有で静的verifyできない場合はfocused runtime evidenceとしてREPORTへ残す。

compact:

- SessionStart compact Hookと`session_start_context.mjs`が未変更であることを確認する。
- 既存AGENTS contract assertionを維持する。

### Task 7: fresh direct codex runtime

Repository / workspaceからfresh `codex`を起動する。

確認する。

1. wrapperなしで起動する。
2. project configが読み込まれる。
3. workspace内の通常編集がsandbox approvalなしで進む。
4. `gh api --method GET` 等のread-only network operationがsandbox network拒否なしで成功する。
5. build / test等の通常作業が進む。
6. execpolicy promptに当たる代表commandは、`never`契約どおりユーザーpromptを出さず拒否される。
7. apps / MCP tool固有approval modeとHook trustはtop-level `never` と別契約として動作することを、必要な既存機能だけ確認する。
8. destructive operationは実行せず、execpolicy / Hook contractでdenyを確認する。
9. danger-full-accessへfallbackしない。

### Task 8: Repository標準検証とGitHub lifecycle

少なくとも次を実行する。

- focused contract test
- `pnpm run test:hooks`
- `codex execpolicy check` の代表case
- `bash scripts/verify`
- `powershell -ExecutionPolicy Bypass -File scripts/verify.ps1`
- `pnpm run verify`

Run Artifactをfinal commit前状態へ更新する。

通常pushし、PRを作成または更新する。

最新PR headの`Web CI` / `Mobile App CI`を確認する。failure時は既存repair contractに従う。

mergeは実行しない。

## 5. リスクと対策

### neverによりprompt ruleが承認不能になる

これは今回選択する仕様である。

通常workflowに必要なcommandだけを証拠付きで最小緩和し、高リスクfamilyはpromptのまま非対話拒否として維持する。

### project network trueがwrapper / subagentへ伝播する

wrapper safeはfalseを明示overrideする。

subagentはresolved/effective configを比較し、既存境界が広がる場合だけrole TOMLでfalseを明示する。

### direct codexとRun Artifact

Run lifecycleの再設計は今回行わない。

standard以下でmanifest不要なinteractive workはdirect `codex`、strict Runやmanifest syncが必要なinteractive workは既存`codex-safe -RunId`を使う。

### AGENTS.mdの再肥大化

runtime設定値やwrapper詳細を`AGENTS.md`へ追加しない。#135の責務分離を維持する。

### PR #182との競合

実装開始時にlatest headを再確認し、先にmergeされた側をbaselineへ取り込む。古いnetwork false / wrapper-only前提を競合解消で復活させない。

## 6. rollback

問題が発生した場合は今回の差分だけ戻す。

- `.codex/config.toml`
  - `approval_policy`を未設定へ戻す。
  - `network_access = false`へ戻す。
- wrappers
  - safeのnetwork false明示override追加分を戻す。
- rules
  - 条件付きで変更したprompt ruleだけ戻す。
- subagent
  - 条件付きで追加したnetwork false overrideだけ戻す。
- docs / verify / history
  - 同じ変更単位で旧契約へ戻す。

`auto-net`、`AGENTS.md`、compact Hook、user config、credential、GitHub設定、過去Run / Plan / ADRはrollback対象にしない。

## 7. 実装順

1. L3実装承認を確認する。
2. latest main / branch / PR #182 / Codex version / parent・subagent resolved config / baseline verifyを確認する。
3. `.codex/config.toml`を変更する。
4. wrapper safeのnetwork false overrideを追加し、auto-netを維持する。
5. parent / subagentの実効設定を再確認し、必要な場合だけworkspace-write roleへnetwork false overrideを追加する。
6. approval never / execpolicyの代表caseを確認し、必要なnormal workflow ruleだけ最小修正する。
7. Bash / PowerShell verifyと必要な既存contract testを更新する。
8. current docsと`PROJECT_CONTEXT.md` historyを同期する。
9. focused test / Hook test / execpolicy / verifyを実行する。
10. fresh direct `codex`でruntime検証する。
11. Run Artifactをfinal commit前状態へ更新する。
12. commit / normal push / PR作成または更新を行う。
13. 最新PR headの必須CIを確認する。
14. mergeは明示指示があるまで行わない。

## 8. 調査根拠

- OpenAI Codex config reference:
  https://developers.openai.com/ja-JP/docs/config-file/config-reference
- `approval_policy = "never"` はtop-level approval categoriesのpromptを自動拒否し、granular policyはcategories単位のprompt許可に使う。
- `agents.<name>.config_file` はrole用TOML設定レイヤーであるため、project default変更後の実効値を確認する。
- Issue #135 / PR #147で`AGENTS.md`の常駐指示と詳細運用仕様を分離済み。
- current Run Artifact契約ではinteractive manifest syncは`codex-safe -RunId`が正規経路。
