# Codex通常起動を自律実行向けに整理する実装計画

## 0. 依頼概要

このbranchでPlan作成だけで終了せず、設定変更、互換性維持、検証、commit、push、PR、最新PR headのCI確認まで進める。

通常のinteractive利用はRepository / workspace内で codex を直接起動する運用とし、project-scoped Codex設定を次へ変更する。

~~~toml
sandbox_mode = "workspace-write"
approval_policy = "never"

[sandbox_workspace_write]
network_access = true
writable_roots = []
~~~

今回の変更では、既存の破壊操作ガード、auto-net preset、compact後のAGENTS.md再注入、Issue #135 / PR #147で整理済みのAGENTS.md責務を維持する。

## 1. ゴール / 完了条件

### ゴール

- direct codex の通常interactive sessionで、workspace内の通常作業と必要なnetwork accessを追加のsandbox承認待ちなしで進められる。
- danger-full-accessへ広げず、workspace-writeのfilesystem境界を維持する。
- direct codex の既定値を変えても、codex-safe / codex-task の既存preset semanticsを壊さない。
- Repositoryの安全境界や常駐指示を今回の目的以上に変更しない。

### 完了条件

- .codex/config.toml が workspace-write / approval never / network enabled を明示する。
- fresh direct codex sessionでproject configが読み込まれ、workspace内の通常編集と代表的なnetwork readが追加のsandbox承認なしで成功する。
- approval_policy = "never" の対象は通常のshell / workspace操作とし、MCP、apps、Skill approval、Hook trust等の別契約まで無効化した扱いにしない。
- danger-full-access、--full-auto、--dangerously-bypass-approvals-and-sandboxを導入しない。
- rm、git rm、git reset --hard、git clean -f、force push、remote script piping等の既存denyを維持する。
- auto-net presetと .codex/rules-auto-net/** を維持する。
- compact時の SessionStart(source=compact) -> session_start_context.mjs -> root AGENTS.md再注入契約を維持する。
- Issue #135 / PR #147で確定したAGENTS.mdの責務分離を再実装しない。runtime設定値や個別command policyをAGENTS.mdへ重複記載しない。
- codex-safe safe / readonly / auto-net、codex-task safe / readonly / auto-net の既存の安全上の意味を維持する。
- scripts/verify と scripts/verify.ps1 が新しいproject defaultと既存preset semanticsを検証してPASSする。
- 関連contract test、Hook test、execpolicy check、Repository標準verifyがPASSする。
- 同じbranchで実装をcommit / pushし、PRを作成または更新し、最新PR headの必須CIを確認する。
- mergeはユーザーから明示指示があるまで行わない。

## 2. 現状と確定事項

### project config

mainでは次の状態である。

- sandbox_mode = "workspace-write"
- approval_policy は未設定
- sandbox_workspace_write.network_access = false
- writable_roots = []
- features.hooks = true

scripts/verify と scripts/verify.ps1 も、approval_policy未設定と network_access = false をcurrent contractとして検証している。

### direct codex とwrapperの違い

実運用のinteractive入口は direct codex である。

一方、wrapperには現在も独立した役割がある。

codex-safe:

- safe: workspace-write / on-request / 現在の実効networkはfalse
- readonly: read-only / on-request
- auto-net: workspace-write / never / network true
- preflight、引数制限、JSONL log、Run manifest syncを提供する

codex-task:

- non-interactive codex exec用
- approvalはnever
- safe / readonly / auto-netでsandboxとnetwork契約を切り替える

project defaultをnetwork trueへ変更すると、wrapperが明示overrideしないsafe presetの実効networkがtrueへ変わる。この変更は今回の目的ではないため、wrapper側で既存semanticsを維持する。

### auto-net

auto-netはdirect codexでは自動適用されない。明示presetとしてのみ使われる。

今回のproject default変更を理由にauto-netを削除しない。次を維持する。

- .codex/rules-auto-net/**
- codex-safe / codex-taskの auto-net preset
- new-runのpreset契約
- auto-net preflight / verify
- current reference内のauto-net説明

必要な文書変更は、direct codexの新しい既定値との関係を追記・修正する範囲に限定する。

### AGENTS.md とcompact再注入

Issue #135 / PR #147でAGENTS.mdは常駐指示と詳細仕様を分離済みである。

mainのAGENTS.mdは71行で、scripts/verify* が次を含むroot契約を明示検証している。

- scope / user instruction
- high-level Skill routing
- command-based deletion等の高レベル安全契約
- file-changing task入口
- Progress / 報告契約
- native delegation
- L1 / L2 / L3

.codex/config.toml には次のHookがある。

- hooks.SessionStart
- matcher = "^compact$"
- session_start_context.mjs
- additionalContextLimit = 4096

session_start_context.mjs は source === "compact" の場合にroot AGENTS.mdを読み、additionalContextとして再注入する。

今回この仕組みを変更しない。AGENTS.mdを再度大規模整理せず、今回のruntime設定値も追加しない。

### rules / Hook

現在の共通rulesでは一部command familyが prompt である。approval_policy = "never" との組み合わせで、通常workflowに必要な操作が停止する可能性がある。

ただし、今回の目的だけを理由に prompt rulesを全面再設計しない。

既存Hookは次を明示denyしている。

- destructive Git operation
- command-based deletion
- infrastructure / cloud deletion
- remote script piping

既存Hookでは通常のfeature branch上のgit add / commit / push / switch等を許可するcaseも持つ。

rules変更が必要な場合は、fresh runtimeで実際に通常workflowを阻害したruleだけを対象にする。外部副作用の大きいcommand familyを自律化するための緩和は行わない。

## 3. 対象範囲

### 実装対象

- .codex/config.toml
- scripts/codex-safe.ps1
- scripts/codex-safe.sh
- scripts/codex-task.ps1
- scripts/codex-task.sh
- scripts/verify
- scripts/verify.ps1
- direct codex / wrapperの既定値説明を持つcurrent docs
  - docs/reference/codex-safety-harness.md
  - docs/reference/codex-implementation-harness.md
  - docs/guides/quickstart.md
  - MIGRATION.md
  - docs/PROJECT_CONTEXT.md
- .codex/rules/20-risky-prompt.rules は条件付き。実runtimeで通常workflowを阻害することが確認された場合だけ最小変更する。
- 関連contract testは既存testで不足する場合だけ追加・更新する。

### read-only確認対象

- AGENTS.md
- .codex/hooks/session_start_context.mjs
- .codex/hooks/pre_tool_use_policy.mjs
- .codex/hooks/pre_tool_use_policy_windows.ps1
- .codex/rules/10-readonly-allow.rules
- .codex/rules/30-destructive-forbidden.rules
- .codex/rules-auto-net/**
- scripts/new-run.ps1
- scripts/new-run.sh
- tests/contracts/**
- .github/workflows/**
- docs/reference/git-branch-safety.md
- docs/reference/run-artifacts.md

### 原則変更しない

- AGENTS.md
- .codex/hooks/**
- .codex/rules-auto-net/**
- .codex/rules/30-destructive-forbidden.rules
- scripts/new-run.*
- 過去Run Artifact
- 過去Plan
- docs/adr/**
- docs/history/**
- Product code
- GitHub branch protection / ruleset
- user-level ~/.codex/config.toml
- credential / token保存方法
- PR #182のMCP waiter実装

AGENTS.mdに今回の設定と直接矛盾する記述が新たに見つかった場合だけ、その1点を最小修正する。runtime設定値の複製や#135の再整理は行わない。

## 4. 実装方針

### Task 0: L3 gateとbaseline

今回の変更は project approval / sandbox network / wrapper behaviorを変更するためL3として扱う。

実装開始前にユーザーの明示承認を確認し、次を記録する。

- latest main / branch head
- PR #182 latest head
- current Codex version
- .codex/config.toml
- wrapper presetのcurrent command line
- Bash / PowerShell verify baseline

rollbackは今回変更したconfig / wrapper / verify / current docsだけを戻す。

### Task 1: direct codexのproject defaultを変更

.codex/config.tomlへ次を設定する。

~~~toml
sandbox_mode = "workspace-write"
approval_policy = "never"

[sandbox_workspace_write]
network_access = true
writable_roots = []
~~~

次は維持する。

- web_search
- allow_login_shell
- shell_environment_policy
- features.hooks
- agents
- Hook definitions
- その他今回と無関係な設定

### Task 2: wrapperの既存semanticsを維持

project defaultがnetwork trueになってもwrapperの既存意味を変えない。

codex-safe:

- safe: workspace-write / on-request / network false
- readonly: read-only / on-request
- auto-net: workspace-write / never / network true

codex-task:

- safe: workspace-write / never / network false
- readonly: read-only / never
- auto-net: workspace-write / never / network true

safe presetはproject defaultを継承させず、workspace-write時に network_access=false を明示overrideする。

auto-netは現状どおり network_access=true を明示overrideする。

readonlyではworkspace-write専用network設定を新たに増やさず、既存read-only contractを維持する。

Bash / PowerShellを同じ意味に揃える。

### Task 3: rulesは必要時だけ最小変更

config / wrapper変更後に、代表的な通常workflowをexecpolicy / fresh runtimeで確認する。

対象例:

- workspace内編集
- git status / diff
- feature branch上の通常git add / commit / push
- branch switchが実際の通常workflowで必要な場合の通常switch
- build / lint / typecheck / test
- package managerの通常操作
- read-onlyなGitHub API / network read

既存 prompt ruleが上記を実際に阻害する場合だけ、そのruleを分割または縮小する。

次は今回の自律化対象にしない。

- infrastructure / cloud write
- service / OS設定変更
- destructive operation
- remote script execution
- force / rewrite系Git operation

rm / git rm等の削除禁止は変更しない。

### Task 4: current docsを同期

文書は新しい正本を増やさず、現在の責務を維持して更新する。

codex-safety-harness:

- project defaultを workspace-write / approval never / network trueへ更新する。
- direct codex が通常interactive入口であることを明記する。
- codex-safeは補助wrapperとして既存preset semanticsを記載する。
- auto-netは維持する。

codex-implementation-harness:

- direct codexを通常interactive入口として扱う。
- codex-safe / codex-taskの既存用途は維持する。
- auto-net sectionは削除せず、direct defaultとの違いを明確にする。

quickstart:

- 通常interactive起動を codex とする。
- auto-netはwrapper利用時の明示presetとして残す。

MIGRATION:

- 「project defaultではnetwork / approval neverを適用しない」という古い説明を更新する。
- auto-net削除migrationにはしない。

PROJECT_CONTEXT:

- 標準interactive経路をdirect codexへ更新する。
- wrapper / auto-netの存在自体は維持する。

AGENTS.md:

- 原則変更しない。
- runtime設定値、auto-net詳細、個別command listを追加しない。

### Task 5: verify / contractを更新

scripts/verify と scripts/verify.ps1 を同じ意味へ更新する。

project config:

- sandbox_mode = "workspace-write"
- approval_policy = "never"
- network_access = true

wrapper:

- safeがnetwork falseを明示維持する
- auto-netがnetwork trueを維持する
- codex-safe safe / readonlyがon-requestを維持する
- codex-safe auto-netがneverを維持する
- codex-taskが既存どおりneverを維持する
- auto-net preflightを維持する

安全契約:

- command-based deletion
- destructive Git operation
- remote script piping
- protected branch safety

上記の既存denyに回帰がないことを確認する。

compact:

- SessionStart compact Hookと session_start_context.mjs を変更していないことを確認する。
- AGENTS.mdの#135契約を今回の変更で崩していないことを既存assertionで確認する。

### Task 6: fresh direct codexで実runtime検証

既存sessionではなく、Repository / workspaceからfresh interactive Codexを通常どおり起動する。

~~~text
codex
~~~

確認する。

1. wrapperなしで起動する。
2. project .codex/config.toml が読み込まれる。
3. workspace内の通常編集が追加のsandbox承認なしで実行できる。
4. read-onlyな外部network accessが追加のsandbox承認なしで成功する。
5. build / test等の通常作業が今回の設定変更によって停止しない。
6. MCP / apps / Hook trust等の別approval contractを、approval_policy = "never" の成功条件へ混同しない。
7. destructive operationは実行せず、execpolicy / Hook contractでdenyを確認する。
8. direct codexで問題が出ても、danger-full-accessへfallbackしない。

必要ならcompactを発生させるruntime検証ではなく、既存SessionStart contract test / verifyで再注入契約の不変を確認する。今回Hook自体を変更しないため、compact再注入の新規E2Eは必須にしない。

### Task 7: Repository標準検証とGitHub lifecycle

変更内容に応じて少なくとも次を実行する。

- focused contract test
- pnpm run test:hooks
- codex execpolicy checkの代表case
- bash scripts/verify
- PowerShell scripts/verify.ps1
- pnpm run verify

Run Artifactを実装結果へ更新してからcommitする。

ユーザーがGit操作を禁止していないため、実装完了時は同じbranchで通常pushし、PRを作成または更新する。

最新PR headのWeb CI / Mobile App CIを確認する。

CI failureは既存repair contractに従う。

mergeは実行しない。

## 5. 検証観点

### direct codex

- workspace-writeである。
- approval policyがneverである。
- workspace-write networkがtrueである。
- normal workspace operationでsandbox approval待ちが発生しない。

### wrapper互換性

- safeがnetwork falseのまま。
- auto-netがnetwork trueのまま。
- safe / readonly / auto-netのapproval意味が変更前と一致する。
- new-runのpreset contractを変更しない。

### safety

- rm / git rmは禁止のまま。
- force pushは禁止のまま。
- hard reset / forced cleanは禁止のまま。
- remote script pipingは禁止のまま。
- external high-impact mutationを今回の変更で新たに許可しない。

### AGENTS / compact

- AGENTS.mdへruntime設定をコピーしない。
- Issue #135 / PR #147で整理済みのroot契約を維持する。
- compact時のroot AGENTS.md再注入Hookを変更しない。
- AGENTS.mdを短くすること自体を今回の追加目的にしない。

## 6. リスク

### project default変更でwrapper safeまでnetwork有効になる

対策:

- safe presetからnetwork falseを明示overrideする。
- Bash / PowerShell / codex-taskで同じ契約を検証する。

### approval neverとprompt rulesの組み合わせ

通常workflowに必要なcommandが拒否される可能性がある。

対策:

- broad rules redesignを先に行わない。
- fresh runtimeで阻害を確認したruleだけ変更する。
- external high-impact mutationは自律化しない。

### AGENTS.mdの再肥大化

compactのたびにroot AGENTS.mdが再注入される。

対策:

- runtime設定値やwrapper詳細をAGENTS.mdへ追加しない。
- #135で確定した責務分離を維持する。

### PR #182との競合

PR #182も .codex/config.toml、implementation harness、verifyを変更予定である。

対策:

- 実装開始時にPR #182 latest headを再確認する。
- 先にmergeされた変更をbaselineとして取り込む。
- PR #182側でも最終的なinteractive実runtime gateはdirect codexを基準にする。
- 古い workspace-write / network false / wrapper-only前提を競合解消で復活させない。

## 7. rollback

問題が発生した場合は今回の差分だけ戻す。

- .codex/config.toml
  - approval_policyを未設定へ戻す。
  - network_access = falseへ戻す。
- wrappers
  - 今回追加したsafe network falseの明示overrideだけ戻す。
- verify / docs
  - 同じcommitの変更前契約へ戻す。
- 条件付きでrulesを変更した場合
  - そのrule差分だけ戻す。

次はrollback対象外とする。

- auto-net
- .codex/rules-auto-net/**
- AGENTS.mdの#135契約
- compact Hook
- user-level config
- credential
- GitHub設定
- 過去Run / Plan / ADR / history

## 8. 実装順

1. L3実装承認を確認する。
2. latest main / branch / PR #182 / Codex version / baseline verifyを確認する。
3. .codex/config.tomlを変更する。
4. wrapperのsafe / auto-net network semanticsを明示して互換性を維持する。
5. Bash / PowerShell verifyと必要な既存contract testを更新する。
6. current docsを同期する。
7. focused test / Hook test / execpolicy / verifyを実行する。
8. fresh direct codexでruntime検証する。
9. 通常workflowを阻害するprompt ruleが実在した場合だけ最小修正して再検証する。
10. Run Artifactを実装結果へ更新する。
11. commit / normal push / PR作成または更新を行う。
12. 最新PR headの必須CIを確認する。
13. mergeは明示指示があるまで行わない。

## 9. 変更予定ファイル

必須候補:

- .codex/config.toml
- scripts/codex-safe.ps1
- scripts/codex-safe.sh
- scripts/codex-task.ps1
- scripts/codex-task.sh
- scripts/verify
- scripts/verify.ps1
- docs/reference/codex-safety-harness.md
- docs/reference/codex-implementation-harness.md
- docs/guides/quickstart.md
- MIGRATION.md
- docs/PROJECT_CONTEXT.md
- active Run Artifact

条件付き:

- .codex/rules/20-risky-prompt.rules
- 既存contract test

原則変更しない:

- AGENTS.md
- .codex/hooks/**
- .codex/rules-auto-net/**
- .codex/rules/30-destructive-forbidden.rules
- scripts/new-run.*

## 10. 調査根拠

- OpenAI Codex config reference:
  https://developers.openai.com/ja-JP/docs/config-file/config-reference
- main: c42082ba62cbca87f675b336d06885719d21b50e
- Issue #135 / PR #147でAGENTS.mdの常駐指示と詳細運用仕様を分離済み。
- mainのSessionStart compact Hookはroot AGENTS.mdを additionalContext として再注入する。
- mainのauto-netは明示presetとして独立しており、direct codexへ自動適用されない。
