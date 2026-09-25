# Codex通常起動を自律実行向けに整理する計画

## 0. 依頼概要

- Repository / workspaceで codex だけを実行する通常のinteractive起動を正規経路にする。
- project-scoped Codex設定を sandbox_mode = "workspace-write"、approval_policy = "never"、sandbox_workspace_write.network_access = true に変更する。
- 現在使っていない auto-net presetと、そのためだけに存在するrules / wrapper分岐 /文書 / verify契約を整理する。
- AGENTS.md を実際の運用に合わせて簡潔にし、通常起動・安全境界・詳細文書の責務を整理する。

背景:

- 実運用ではRepository内で codex を直接起動しており、codex-safe / auto-net を通常入口として使っていない。
- 現在の .codex/config.toml は workspace-write だが network_access = false で、project configには approval_policy を置かない契約になっている。
- scripts/verify / scripts/verify.ps1 も「approval policyをproject configへ置かない」「network disabled」「auto-net preflight」を固定しているため、設定値だけを変更すると標準verifyが失敗する。

期待成果:

- 通常の codex 起動だけで、workspace内の編集、テスト、依存解決、read-onlyなGitHub / HTTPアクセス等の通常作業を承認待ちなしで進められる。
- danger-full-access へ広げず、workspace-writeのfilesystem境界とRepository固有の破壊操作ガードを維持する。
- auto-net を通常運用から削除し、設定・rules・wrapper・文書・verifyの意味を一致させる。

## 1. ゴール / 完了条件

### ゴール

trusted projectでRepository内から codex を起動したとき、project-scoped .codex/config.toml が通常運用の正本として機能する。

通常interactive Codexの既定値を次に統一する。

~~~toml
sandbox_mode = "workspace-write"
approval_policy = "never"

[sandbox_workspace_write]
network_access = true
writable_roots = []
~~~

通常の開発操作を承認待ちで止めない。一方、force push、破壊的Git操作、command-based delete、protected branchへの危険なmutation、remote script piping等の既存の明確な禁止は維持する。

### 完了条件

- .codex/config.toml に approval_policy = "never" と network_access = true が明示される。
- fresh interactive sessionをRepository / workspaceで codex だけで起動し、通常のworkspace編集と外部network readが追加承認なしで実行できる。
- danger-full-access、--full-auto、--dangerously-bypass-approvals-and-sandbox は導入しない。
- .codex/rules/20-risky-prompt.rules を approval_policy = "never" 前提で監査し、通常作業を不要に止める prompt ruleを残さない。
- destructive / irreversible / protected-branch操作は、既存の .codex/hooks/pre_tool_use_policy.mjs と .codex/rules/30-destructive-forbidden.rules の保護を弱めない。
- active source / config / wrapper / current docsから auto-net preset依存を除去する。
- 過去のRun Artifact、過去Plan、ADR、historyは履歴として書き換えない。
- scripts/verify と scripts/verify.ps1 が新しい契約を検証し、両方PASSする。
- Hook contract test / execpolicy baselineがPASSする。
- AGENTS.md とCodex関連referenceが通常の codex 起動を正規interactive入口として説明する。
- mergeはユーザーから明示指示があるまで行わない。

## 2. 現状理解と前提

### 現在のproject config

現在の .codex/config.toml は次を持つ。

- sandbox_mode = "workspace-write"
- web_search = "cached"
- approval_policy は未設定
- sandbox_workspace_write.network_access = false
- writable_roots = []
- Hooks / custom agentsはproject configから有効化される。

OpenAIの現行Codex config referenceでは、approval_policy = "never"、sandbox_mode = "workspace-write"、sandbox_workspace_write.network_access = true は有効な設定である。trusted projectではproject .codex/config.toml がユーザー設定等より優先される。

公式ドキュメントはinteractive用途では一般に on-request を推奨しているが、今回はユーザーが通常起動でも自律的に動かすことを明示しているため、Repositoryの意図として never を選ぶ。

### 現在の auto-net 依存

current sourceで auto-net は少なくとも次に存在する。

- .codex/rules-auto-net/*.rules
- .codex/rules/README.md
- scripts/codex-safe.ps1
- scripts/codex-safe.sh
- scripts/codex-task.ps1
- scripts/codex-task.sh
- scripts/new-run.ps1
- scripts/new-run.sh
- scripts/verify.ps1
- scripts/verify
- docs/reference/codex-safety-harness.md
- docs/reference/codex-implementation-harness.md
- docs/guides/quickstart.md
- MIGRATION.md
- docs/PROJECT_CONTEXT.md

GitHub code searchでは .github/workflows/** に auto-net 参照は確認されなかった。過去Plan / Run Artifact / ADR / historyにも auto-net が残るが、これらは履歴として変更対象外とする。

### 現在のrulesとの衝突

.codex/rules/20-risky-prompt.rules は次のような広いcommand familyを prompt にしている。

- git checkout / switch / merge / rebase / tag
- curl / wget / Invoke-WebRequest / Invoke-RestMethod
- docker / kubectl / helm / terraform / aws / az / gcloud
- shell wrapper系
- OS / service / network設定系

approval_policy = "never" では、承認が必要な操作をユーザーpromptで解決する運用はできない。configだけを変更せず、通常作業として自律実行するcommandと、引き続き停止させる高リスクcommandをrules側で分ける必要がある。

.codex/hooks/pre_tool_use_policy.mjs はFull Access共通ポリシーの正本として、force push、protected branch mutation、危険なGit操作、remote script piping等を既に判定している。このHookは削除・弱体化しない。

### 前提

- 主要なinteractive利用経路はRepository / workspace内からの codex 直接起動。
- codex-safe は通常入口ではなく、明示的に制限を強めたい場合の補助wrapperとして残せる。
- codex-task は非対話workflow用であり、interactive通常起動とは責務を分ける。
- auto-net の削除はnetworkを禁止する変更ではなく、通常project configでnetworkを有効化した結果として専用presetが不要になるための整理である。
- GitHub credential、user-level ~/.codex/config.toml、OpenAIアカウント設定は変更しない。

### 対象外

- danger-full-access をRepository既定にすること。
- user-level Codex configの変更。
- GitHub branch protection / ruleset変更。
- HookのGit safety Matrixそのものの再設計。
- Product code変更。
- PR #182のMCP waiter実装。このPlanとは別branch / 別変更として扱う。
- 過去Run / 過去Plan / ADR / historyの文言修正。

## 3. 質問 / 曖昧性

- 必ず質問する不透明点: なし。
- 実装前の必須確認:
  - approval_policy、sandbox / network behavior、wrapper behavior、rules behaviorの変更は AGENTS.md のL3に該当する。
  - このPlan作成依頼はPlan作成の承認であり、L3実装の明示承認とは分ける。実装開始時にユーザー承認を確認する。
- 仮定してよい細部:
  - codex-safe と codex-task の auto-net optionはcurrent executable callsiteがないことを再確認してから削除する。
  - safe / readonly 名称は互換性のため維持し、今回の目的だけでwrapper全体を削除・renameしない。
- 未回答の重要質問: なし。

## 4. 影響範囲

### 変更予定

- .codex/config.toml
- .codex/rules/10-readonly-allow.rules
- .codex/rules/20-risky-prompt.rules
- .codex/rules/README.md
- .codex/rules-auto-net/*.rules
- scripts/codex-safe.ps1 / .sh
- scripts/codex-task.ps1 / .sh
- scripts/new-run.ps1 / .sh
- scripts/verify.ps1 / scripts/verify
- AGENTS.md
- docs/reference/codex-safety-harness.md
- docs/reference/codex-implementation-harness.md
- docs/guides/quickstart.md
- MIGRATION.md
- docs/PROJECT_CONTEXT.md
- 関連contract test。既存testで十分なら新規test fileは増やさない。

.codex/rules/30-destructive-forbidden.rules は原則変更しない。検証追加に必要な最小変更だけ許容する。

### read-only確認

- .codex/hooks/pre_tool_use_policy.mjs
- .codex/hooks/pre_tool_use_policy_windows.ps1
- tests/contracts/**
- .github/workflows/**
- docs/reference/git-branch-safety.md
- docs/reference/run-artifacts.md

### 変更しない履歴

- .codex/runs/** の過去Run
- docs/plans/** の過去Plan
- docs/adr/**
- docs/history/**

今回新規作成するPlan / Run Artifactは除く。

## 5. 変更方針

### Task 0: L3承認とbaselineを確定する

1. 実装開始前に、project approval policy、workspace network、wrapper / rules behavior変更がL3であることを提示し明示承認を得る。
2. 実装直前の main / 対象branch head、Codex version、current config、verify baselineを記録する。
3. current source / workflowで auto-net の実行callsiteがないことを再検索する。
4. 過去Run / Plan / ADR / historyの参照は削除対象に含めない。

### Task 1: 通常 codex 起動のproject defaultを変更する

.codex/config.toml を次の意味へ更新する。

~~~toml
sandbox_mode = "workspace-write"
approval_policy = "never"

[sandbox_workspace_write]
network_access = true
writable_roots = []
~~~

維持する設定:

- web_search = "cached"
- allow_login_shell = false
- shell_environment_policy
- Hooks
- custom agents
- その他今回と無関係な設定

追加しないもの:

- danger-full-access
- user固有path
- PAT / token
- user-level config変更
- approval回避用の別wrapper

### Task 2: approval_policy = "never" とrulesを整合させる

.codex/rules/20-risky-prompt.rules を全件監査する。

判断基準:

- 通常のRepository開発・調査に必要で、workspace-write / Hook境界内で安全に実行できるread / build / test / package取得 / network readは、不要な prompt で止めない。
- command family全体を広く prompt にせず、外部副作用やhost変更を伴うoperationだけに対象を絞る。
- never で停止させたい操作は、人がprompt解除することを前提にしない。既存Hookまたは forbidden で意図が明確になる方を優先する。
- force push、git reset --hard、git clean -f、command-based delete、cloud resource delete、terraform destroy、remote script piping等の既存禁止は維持する。
- git checkout / switch のように通常のbranch作業で必要な操作を、family単位の prompt のためだけに不必要に停止させない。ただしprotected branch / context-sensitive mutationは既存Hookの判定を維持する。
- curl / wget / Invoke-WebRequest / Invoke-RestMethod の単純なnetwork readを一律promptにはしない。remote script pipingはHookで拒否する。
- docker / kubectl / terraform / cloud CLIはread-only operationと外部mutationを分ける。現在のRepositoryで実際に必要なoperationを優先し、将来用の網羅的policy engineは作らない。

.codex/rules/10-readonly-allow.rules は、prompt縮小に必要な範囲だけ補う。重複allowを大量に追加しない。

### Task 3: auto-net presetを削除する

current executable callsiteがないことを再確認後、次を実施する。

- .codex/rules-auto-net/** を削除する。
- scripts/codex-safe.* のpresetから auto-net を削除する。
- scripts/codex-task.* のpresetから auto-net と network_access=true の特別overrideを削除する。
- scripts/new-run.* のpreset validation / helpから auto-net を削除する。
- safe / readonly は互換性のため残す。
- network accessの正本はproject .codex/config.toml に一本化する。

codex-safe 自体は削除しない。Run manifest syncやpreflight等の既存責務があり、普段使っていないことだけを理由にwrapper全体を削除すると範囲が広がるためである。

### Task 4: interactive入口とwrapperの責務を整理する

通常interactiveの正規起動:

~~~text
cd <repository>
codex
~~~

- project configをそのまま使用する。
- workspace-write。
- approval never。
- network enabled。
- project Hooks / rulesを適用する。

codex-safe:

- 通常起動の必須wrapperとは書かない。
- preflight / fixed approval behavior / JSONL logging / Run manifest syncが必要な場合の補助wrapperとして残す。
- safe / readonly の2 presetだけを残す。

codex-task:

- non-interactive codex exec 用という既存責務を維持する。
- interactive通常運用の正本にはしない。
- auto-net 分岐を削除し、network availabilityをproject configと矛盾させない。

### Task 5: AGENTS.md を整理する

AGENTS.md は次に絞る。

- ユーザー指示 / scope /破壊操作 /外部副作用等のRepository-wide不変条件。
- Skill / workflow routing。
- Run Artifact、implementation harness、Safety referenceへの参照。
- file-changing taskのcommit / push / PR / CI lifecycleへの参照。
- Git / validation / delegation / L1-L3 governance。

追加・明確化:

- 通常interactive入口はRepository / workspace内の codex 直接起動。
- 通常のin-scope作業は、project configの workspace-write + approval never + network enabled を前提に自律実行する。
- 承認promptが出ないことと、明示指示が必要な操作を勝手に実行してよいことを分ける。merge、force push、branch削除、release / tag作成・削除、明示されていない破壊操作等は既存のユーザー承認境界を維持する。
- 詳細なpreset / Hook implementation / verify literalを AGENTS.md へ重複させない。

### Task 6: current docsを同期する

- docs/reference/codex-safety-harness.md
  - direct codex を通常interactive入口へ変更。
  - config defaultをworkspace-write / never / network enabledへ更新。
  - auto-net section / table /例を削除。
- docs/reference/codex-implementation-harness.md
  - 推奨フローを direct codex / optional codex-safe / non-interactive codex-task に整理。
  - auto-net preset説明を削除。
- docs/guides/quickstart.md
  - 通常interactiveは codex とする。
  - mode表から auto-net を除く。
- MIGRATION.md
  - auto-net preset移行手順をcurrent contractから削除し、direct workspace-write autonomous defaultへの移行注意へ置換する。
- docs/PROJECT_CONTEXT.md
  - current architectureとして残っている auto-net contract記述だけを更新する。
- .codex/rules/README.md
  - rules-auto-net参照を削除し、common rules + Hookの関係をcurrent behaviorへ合わせる。

過去ADR / Plan / Run / historyは更新しない。

### Task 7: verify / contractを新契約へ更新する

scripts/verify と scripts/verify.ps1 のcurrent contractを変更する。

必須確認:

- sandbox_mode = "workspace-write"。
- approval_policy = "never"。
- network_access = true。
- repo_auto_net等の別profileを追加していない。
- auto-net wrapper preflightを実行しない。
- active wrapper / new-run help / current docsが削除済みpresetを要求しない。
- destructive forbidden baselineは維持。
- normal git add / feature branch commit / push等、既存Hookが許容している正常経路を新しいprompt rulesで再び塞がない。
- Hook contractは既存testを優先して再利用する。

新規testは、既存verify / contract testで今回の回帰を検出できない場合だけ追加する。

### Task 8: fresh codex runtimeで実運用を確認する

設定変更後は既存sessionを証拠にせず、Repository / workspaceからfresh interactive Codexを通常どおり起動する。

~~~text
codex
~~~

確認項目:

1. wrapperを介さずsessionが起動する。
2. project config / Hooksが読み込まれる。
3. workspace内の通常編集が追加承認なしで進む。
4. external network readが追加承認なしで成功する。
5. build / test / package取得等、今回自律化対象にした代表操作が不要なapproval promptで止まらない。
6. destructive operationは実行せず、codex execpolicy check / Hook contractで既存denyを確認する。
7. user-level configやcredentialを変更していない。

実runtimeで通常操作が prompt ruleにより停止した場合は、原因ruleを特定してTask 2へ戻る。制約を外すために danger-full-access へ切り替えない。

## 6. 検証方法

### 静的 / contract

- bash scripts/verify
- powershell -ExecutionPolicy Bypass -File scripts/verify.ps1
- pnpm run test:hooks
- Repositoryに既存の関連contract testがあれば実行する。
- current source / current docsで不要な auto-net 参照が0件であることを確認する。過去Run / Plan / ADR / historyは履歴参照として許容する。

### execpolicy

少なくとも次を codex execpolicy check で確認する。

自律実行対象:

- git status
- 通常のnetwork read
- Repositoryで日常的に使うbuild / test / package manager operation

deny維持:

- git reset --hard HEAD~1
- git clean -fd
- git push --force
- command-based file delete
- terraform destroy
- remote script pipingはHook contractで確認する。

実際の破壊操作は実行しない。

### fresh runtime

- trusted project。
- Repository / workspace内。
- wrapperなしの codex。
- 追加承認promptなしで通常の編集・network read・検証が完了する。
- Hook変更がある場合は既存trust契約に従って /hooks を確認する。Hook definitionを変更しない場合は無条件の再trustを要求しない。

## 7. リスクと未解決論点

### interactiveで approval_policy = "never" を使う

OpenAIの一般推奨はinteractiveでは on-request である。今回はユーザーが自律性を優先して明示的に never を選ぶ。

対策:

- filesystemは workspace-write のままにし、danger-full-access へ広げない。
- destructive operationはHook / forbidden rules / AGENTSの明示指示境界で維持する。
- networkを有効にしてもcredentialを新規保存・展開しない。

### prompt rulesが通常作業を停止させる

never と既存broad prompt ruleの組み合わせでは、自律化したいread-only / network operationまで止まる可能性がある。

対策:

- config変更とrules監査を同じ変更として扱う。
- family単位のbroad promptを必要なoperation単位へ縮める。
- 実runtimeで代表操作を確認する。

### network accessの拡大

workspace内commandから外部networkへ到達可能になる。

対策:

- remote script pipingや明確な危険操作のHook denyを維持する。
- secret / token値をtracked configへ追加しない。
- cloud resource mutation等を「networkが使えるから許可」と解釈しない。

### auto-net削除でwrapper互換性が変わる

外部利用者が --preset auto-net を使っている場合はbreaking changeになる。

現時点のRepository検索ではGitHub Actionsからの利用は確認されていないが、Repository外の利用は証明できない。

対策:

- 実装前にcurrent source / docsのcallsiteを再確認する。
- MIGRATION.md に削除と新しい通常起動方法を明記する。
- safe / readonly は維持し、wrapper全体の削除・renameは行わない。

### PR #182との競合

PR #182も .codex/config.toml とHarnessを変更予定であり、後からmergeすると競合・契約上書きが起こり得る。

対策:

- このPlanはmainから別branchで作る。
- 実装順序を決める時点でPR #182 latest headを再確認する。
- 先にmergeされた側をbaselineにして、古いsandbox / approval / network契約を復活させない。
- PR #182のMCP waiter検証は、最終的に通常 codex 起動を基準にする。

## 8. rollback plan

L3変更のrollbackは今回の差分だけに限定する。

- .codex/config.toml
  - approval_policy = "never" を削除。
  - network_access = false へ戻す。
  - sandbox_mode = "workspace-write" は現状と同じため維持。
- .codex/rules/**
  - 今回変更したprompt / allow差分を変更前へ戻す。
- .codex/rules-auto-net/**
  - 削除した場合は同commitの直前状態を復元する。
- wrapper / new-run / verify
  - auto-net preset削除と新config契約の差分だけ戻す。
- docs / AGENTS
  - 実装前の通常入口 / preset記述へ戻す。
- user-level config、credential、GitHub設定、過去Run / Plan / ADR / historyはrollback対象にしない。

rollbackで danger-full-access や別の承認回避策を導入しない。

## 9. 成果物

実装時の変更候補:

- .codex/config.toml
- .codex/rules/10-readonly-allow.rules
- .codex/rules/20-risky-prompt.rules
- .codex/rules/README.md
- .codex/rules-auto-net/** の削除
- scripts/codex-safe.ps1 / .sh
- scripts/codex-task.ps1 / .sh
- scripts/new-run.ps1 / .sh
- scripts/verify.ps1 / scripts/verify
- AGENTS.md
- docs/reference/codex-safety-harness.md
- docs/reference/codex-implementation-harness.md
- docs/guides/quickstart.md
- MIGRATION.md
- docs/PROJECT_CONTEXT.md
- 必要な既存contract test

今回のPlan作成成果物:

- docs/plans/2026-09-25_111717_codex-autonomous-workspace.md
- .codex/runs/20260925-111717-JST/PLAN.md
- .codex/runs/20260925-111717-JST/TASKS.md
- .codex/runs/20260925-111717-JST/REPORT.md

## 10. 実装順

1. L3実装承認を確認する。
2. latest main / PR #182 / current Codex仕様を再確認する。
3. auto-net current executable callsiteがないことを再確認する。
4. .codex/config.toml とrulesを同時に更新する。
5. auto-net preset / rules / wrapper分岐を削除する。
6. AGENTS.md とcurrent reference / quickstart / migration / project contextを同期する。
7. Bash / PowerShell verify契約を更新する。
8. focused contract / Hook / execpolicy testを実行する。
9. fresh codex interactive sessionでworkspace write / network / no-approval behaviorを確認する。
10. Run Artifactを更新し、commit / push / PRを作成する。
11. 最新PR headの必須CIを確認する。
12. mergeは明示指示があるまで行わない。

## 11. 調査根拠

- OpenAI Codex config reference:
  https://developers.openai.com/ja-JP/docs/config-file/config-reference
- 2026-09-25時点のRepository main: c42082ba62cbca87f675b336d06885719d21b50e
- GitHub code searchで auto-net はactive source / current docsと過去artifactに存在するが、.github/workflows/** の参照は0件。
