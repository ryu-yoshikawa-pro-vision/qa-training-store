# Issue #192: Codex Git操作のrepository判定とPreToolUseの安全性を修正するPlan

## 0. 依頼概要

- 対象: [Issue #192](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/issues/192)
- 作業branch: `issue-192-codex-git-workdir-guard`（Issue #193と共用。両Issueを同一ブランチ・同一PRで実装する）
- 参考実装: [qa-workflow-skills のCodex Hook](https://github.com/ryu-yoshikawa-pro-vision/qa-workflow-skills/blob/main/.codex/hooks/pre_tool_use_policy.mjs)、[対応するテスト](https://github.com/ryu-yoshikawa-pro-vision/qa-workflow-skills/blob/main/tests/codex/test_codex_hooks.py)、[安全境界の説明](https://github.com/ryu-yoshikawa-pro-vision/qa-workflow-skills/blob/main/docs/reference/codex-safety-harness.md)
- 本変更はPlanのみ。Hook・設定・テストの実装、PR作成、mergeは別作業とする。
- ユーザーの通常運用はCodexの「Full Access」または「Approve for me」をその時の作業に応じて使い分ける前提とする。同時に1つの権限モードとみなさない。

## 両Issue共通の実装・検証方針

- 同じブランチで#192と#193を実装し、**PRは1件**にまとめる。実装用の別ブランチ・別PRを作成しない。
- #193の詳細は[Issue #193のPlan](./2026-10-17_104100_issue-193-portable-artifact-sanitizer.md)を参照する。両Planは同じブランチの実装計画であり、独立した実装・mergeを前提としない。
- 作業順序: (1) #192のHook/Git safety境界とテスト修正、(2) #193のsanitizer既存fixture固定とNode正本への移植、(3) PowerShell/Bash wrapperとCIの統一、(4) **両Issueを合わせた回帰検証と1件のPRでレビュー**。
- 共通する変更が出た場合は、既存の`AGENTS.md`、`.codex/config.toml`、`docs/reference/codex-safety-harness.md`等の正本を1回の変更で整合させる。別の正本や重複ルールを作らない。
- #192のFull Access／Approve for meにおけるHookの拒否が、#193のRun Artifact sanitizationを迂回する理由になってはならない。各責務のテストを独立して維持し、統合後に両方を検証する。
- 実装時の各変更はレビューできる単位でcommitを分けてよいが、最終的なbranch、PR、CI成功判定は共通とする。PRを作るまでは、このPlan保存のみで止める。

## 1. ゴールと完了条件

Codex PreToolUseが`payload.cwd`を実行対象のrepositoryだと誤認し、`exec_command.workdir`により別repositoryでGit mutationが実行される経路を塞ぐ。通常のfeature branch操作とread-only Gitは不要に妨げず、protected branch/refの禁止と既存のexecpolicyを維持する。あわせて、Approve for meで通常のfeature branchへの`git push`が不要な承認・拒否を受けないか検証する。危険なpushの拒否を保つことを前提とし、承認機能全体を無効にする変更はしない。

実装完了条件:
1. State-changing Git invocationは、コマンド自身の検証済みliteral absolute rootにより実行対象を固定したものだけがG10評価へ進む。`payload.cwd`やtool-level `workdir`だけを根拠にALLOWしない。
2. 指定rootがHookを配置したこのcheckoutのcanonical Git worktree rootと一致しない、または決定できない場合は拒否する。移動失敗後にmutationが続く形式は拒否する。
3. `git -C`、`--git-dir`、`--work-tree`、`GIT_DIR`／`GIT_WORK_TREE`等のrepository上書きによるmutationと、曖昧なwrapper／dynamic shell expansionは拒否する。read-only Gitの現行許可は維持する。
4. Protected branch/refへのcommit、push、ref更新、削除等を拒否する。feature branch上の通常`git add`、`git commit`、`git push`等は既存の許可契約を満たす。通常pushは明示した単一の非保護ref以外にtagやsubmoduleが暗黙にpushされないことも確認する。`main`から非保護feature branchへの安全な`git switch`／`switch -c`は必要範囲で許可し、それ以外のmutationは拒否する。
5. `execpolicy`の既存`prompt`／`forbidden`を実command形式で検証する。ただし安全な通常pushを一律に`prompt`へ送るルールは追加しない。他の高影響操作に対する既存承認・禁止ルールは維持する。Hookの拒否をAuto-review承認で上書きできるものと解釈しない。
6. Approve for meでは、対象repositoryの安全な通常pushがHookやrepository-local execpolicyによって不要に拒否・承認要求されないことを検証する。Full Accessでは同じHookの危険操作拒否を維持する。sandbox／実効的な承認設定による拒否は別原因として切り分け、承認を無効化して回避しない。
7. Windows／POSIXの既存テスト、`pnpm run test:hooks`、`pnpm run test:contracts`、`pnpm run verify`、関係するGitHub Actionsが最終HEADで成功する。未実施の実runtime検証は成功と報告しない。
8. Codex CLI 0.160.0で標準搭載されたcompact後の`AGENTS.md`復元を前提に、重複する`SessionStart(source=compact)`独自再注入を廃止する。Hook定義／source／専用テスト／安全ハーネス文書の参照を整合させ、他の`PreToolUse`／`PostToolUse`／`Stop`等は維持する。0.160.0より前や別版への互換性は実runtime確認の対象として区別する。
9. CLI 0.160.0の設定スキーマに合致することを確認する。既存`[agents] max_threads = 4`等の互換性問題は最小修正し、並列数・既存Role・model選択を無関係に変更しない。Direct／Code Modeの実Tool経路別にHook到達・制限を評価する。

## 2. 現状と確認済みの問題

- `.codex/hooks/pre_tool_use_policy.mjs` の `decidePayload()` は `payload.cwd` を `evaluateCommand()` へ渡す。
- `evaluateCommand()` はGit呼び出しごとに `getGitCommandContext(getEffectiveGitCwd(invocation, cwd))` を呼ぶ。現状は`git -C`を含むstate-changing commandも許可可能。
- `evaluateCompoundContextTransition()` はGit mutationの前に`cd`等がある場合に一律拒否する。新たな安全なcanonical root固定形式との両立が必要。
- `tests/contracts/codex-hook-contract.test.ts` には`git -C`をfeature branchで許可するケース、複数Git invocation、Windows launcher、protected branch/ref等の多数の既存ケースがある。既存契約を無批判に新しい方針へ合わせて削らない。
- `.codex/config.toml` の現時点のRepository defaultは `sandbox_mode = "workspace-write"` / `approval_policy = "never"`。Full Access／Approve for meのいずれかが常に有効になっているわけではない。
- 現行`.codex/rules/20-risky-prompt.rules`には`git push`を一律に`prompt`へ送るルールがない。`.codex/rules/30-destructive-forbidden.rules`は一部のforce push・削除・mirror等を`forbidden`にし、Hookの`evaluateGitPush()`はG7（force）、G8（削除・mirror）、G10（宛先不明・protected ref）等を判定する。両者が全ての構文を網羅するとは前提にせず、#192のroot固定後も実コマンド形式で確認する。
- 現行`parsePushArguments()`は`--follow-tags`を許可optionに含む。一方Gitは`push.followTags=true`でも注釈付きtagを追加pushし、`push.recurseSubmodules=on-demand`等でsubmoduleのpushが発生し得る。明示refspecが1件という構文検査だけでは実際の更新対象を1件に固定できない（[git-push](https://git-scm.com/docs/git-push)、[git-config](https://git-scm.com/docs/git-config)）。
- 現状でApprove for meの通常pushが拒否される原因は未確定。他repositoryに明示ruleがない場合の成功だけでHook・execpolicy・sandboxのどれが原因かは断定しない。
- [Codex upstream #32360](https://github.com/openai/codex/issues/32360) はBash PreToolUseにtool-level `workdir`が含まれない問題を扱う。実装時は対象Codex versionと実payloadを改めて確認する。
- 現行`.codex/config.toml`には`SessionStart`の`^compact# Issue #192: Codex Git操作のrepository判定とPreToolUseの安全性を修正するPlan

## 0. 依頼概要

- 対象: [Issue #192](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/issues/192)
- 作業branch: `issue-192-codex-git-workdir-guard`（Issue #193と共用。両Issueを同一ブランチ・同一PRで実装する）
- 参考実装: [qa-workflow-skills のCodex Hook](https://github.com/ryu-yoshikawa-pro-vision/qa-workflow-skills/blob/main/.codex/hooks/pre_tool_use_policy.mjs)、[対応するテスト](https://github.com/ryu-yoshikawa-pro-vision/qa-workflow-skills/blob/main/tests/codex/test_codex_hooks.py)、[安全境界の説明](https://github.com/ryu-yoshikawa-pro-vision/qa-workflow-skills/blob/main/docs/reference/codex-safety-harness.md)
- 本変更はPlanのみ。Hook・設定・テストの実装、PR作成、mergeは別作業とする。
- ユーザーの通常運用はCodexの「Full Access」または「Approve for me」をその時の作業に応じて使い分ける前提とする。同時に1つの権限モードとみなさない。

## 両Issue共通の実装・検証方針

- 同じブランチで#192と#193を実装し、**PRは1件**にまとめる。実装用の別ブランチ・別PRを作成しない。
- #193の詳細は[Issue #193のPlan](./2026-10-17_104100_issue-193-portable-artifact-sanitizer.md)を参照する。両Planは同じブランチの実装計画であり、独立した実装・mergeを前提としない。
- 作業順序: (1) #192のHook/Git safety境界とテスト修正、(2) #193のsanitizer既存fixture固定とNode正本への移植、(3) PowerShell/Bash wrapperとCIの統一、(4) **両Issueを合わせた回帰検証と1件のPRでレビュー**。
- 共通する変更が出た場合は、既存の`AGENTS.md`、`.codex/config.toml`、`docs/reference/codex-safety-harness.md`等の正本を1回の変更で整合させる。別の正本や重複ルールを作らない。
- #192のFull Access／Approve for meにおけるHookの拒否が、#193のRun Artifact sanitizationを迂回する理由になってはならない。各責務のテストを独立して維持し、統合後に両方を検証する。
- 実装時の各変更はレビューできる単位でcommitを分けてよいが、最終的なbranch、PR、CI成功判定は共通とする。PRを作るまでは、このPlan保存のみで止める。

## 1. ゴールと完了条件

Codex PreToolUseが`payload.cwd`を実行対象のrepositoryだと誤認し、`exec_command.workdir`により別repositoryでGit mutationが実行される経路を塞ぐ。通常のfeature branch操作とread-only Gitは不要に妨げず、protected branch/refの禁止と既存のexecpolicyを維持する。あわせて、Approve for meで通常のfeature branchへの`git push`が不要な承認・拒否を受けないか検証する。危険なpushの拒否を保つことを前提とし、承認機能全体を無効にする変更はしない。

実装完了条件:
1. State-changing Git invocationは、コマンド自身の検証済みliteral absolute rootにより実行対象を固定したものだけがG10評価へ進む。`payload.cwd`やtool-level `workdir`だけを根拠にALLOWしない。
2. 指定rootがHookを配置したこのcheckoutのcanonical Git worktree rootと一致しない、または決定できない場合は拒否する。移動失敗後にmutationが続く形式は拒否する。
3. `git -C`、`--git-dir`、`--work-tree`、`GIT_DIR`／`GIT_WORK_TREE`等のrepository上書きによるmutationと、曖昧なwrapper／dynamic shell expansionは拒否する。read-only Gitの現行許可は維持する。
4. Protected branch/refへのcommit、push、ref更新、削除等を拒否する。feature branch上の通常`git add`、`git commit`、`git push`等は既存の許可契約を満たす。通常pushは明示した単一の非保護ref以外にtagやsubmoduleが暗黙にpushされないことも確認する。`main`から非保護feature branchへの安全な`git switch`／`switch -c`は必要範囲で許可し、それ以外のmutationは拒否する。
5. `execpolicy`の既存`prompt`／`forbidden`を実command形式で検証する。ただし安全な通常pushを一律に`prompt`へ送るルールは追加しない。他の高影響操作に対する既存承認・禁止ルールは維持する。Hookの拒否をAuto-review承認で上書きできるものと解釈しない。
6. Approve for meでは、対象repositoryの安全な通常pushがHookやrepository-local execpolicyによって不要に拒否・承認要求されないことを検証する。Full Accessでは同じHookの危険操作拒否を維持する。sandbox／実効的な承認設定による拒否は別原因として切り分け、承認を無効化して回避しない。
7. Windows／POSIXの既存テスト、`pnpm run test:hooks`、`pnpm run test:contracts`、`pnpm run verify`、関係するGitHub Actionsが最終HEADで成功する。未実施の実runtime検証は成功と報告しない。
8. Codex CLI 0.160.0で標準搭載されたcompact後の`AGENTS.md`復元を前提に、重複する`SessionStart(source=compact)`独自再注入を廃止する。Hook定義／source／専用テスト／安全ハーネス文書の参照を整合させ、他の`PreToolUse`／`PostToolUse`／`Stop`等は維持する。0.160.0より前や別版への互換性は実runtime確認の対象として区別する。
9. CLI 0.160.0の設定スキーマに合致することを確認する。既存`[agents] max_threads = 4`等の互換性問題は最小修正し、並列数・既存Role・model選択を無関係に変更しない。Direct／Code Modeの実Tool経路別にHook到達・制限を評価する。

## 2. 現状と確認済みの問題

- `.codex/hooks/pre_tool_use_policy.mjs` の `decidePayload()` は `payload.cwd` を `evaluateCommand()` へ渡す。
- `evaluateCommand()` はGit呼び出しごとに `getGitCommandContext(getEffectiveGitCwd(invocation, cwd))` を呼ぶ。現状は`git -C`を含むstate-changing commandも許可可能。
- `evaluateCompoundContextTransition()` はGit mutationの前に`cd`等がある場合に一律拒否する。新たな安全なcanonical root固定形式との両立が必要。
- `tests/contracts/codex-hook-contract.test.ts` には`git -C`をfeature branchで許可するケース、複数Git invocation、Windows launcher、protected branch/ref等の多数の既存ケースがある。既存契約を無批判に新しい方針へ合わせて削らない。
- `.codex/config.toml` の現時点のRepository defaultは `sandbox_mode = "workspace-write"` / `approval_policy = "never"`。Full Access／Approve for meのいずれかが常に有効になっているわけではない。
- 現行`.codex/rules/20-risky-prompt.rules`には`git push`を一律に`prompt`へ送るルールがない。`.codex/rules/30-destructive-forbidden.rules`は一部のforce push・削除・mirror等を`forbidden`にし、Hookの`evaluateGitPush()`はG7（force）、G8（削除・mirror）、G10（宛先不明・protected ref）等を判定する。両者が全ての構文を網羅するとは前提にせず、#192のroot固定後も実コマンド形式で確認する。
- 現行`parsePushArguments()`は`--follow-tags`を許可optionに含む。一方Gitは`push.followTags=true`でも注釈付きtagを追加pushし、`push.recurseSubmodules=on-demand`等でsubmoduleのpushが発生し得る。明示refspecが1件という構文検査だけでは実際の更新対象を1件に固定できない（[git-push](https://git-scm.com/docs/git-push)、[git-config](https://git-scm.com/docs/git-config)）。
- 現状でApprove for meの通常pushが拒否される原因は未確定。他repositoryに明示ruleがない場合の成功だけでHook・execpolicy・sandboxのどれが原因かは断定しない。
 matcher（`additionalContextLimit = 4096`）があり、`.codex/hooks/session_start_context.mjs`はroot `AGENTS.md`全文を`hookSpecificOutput.additionalContext`へ再注入する。`tests/contracts/codex-hook-contract.test.ts`はこの旧動作を専用contractとして要求し、`docs/reference/codex-safety-harness.md`も旧動作を記載している。これは0.147系で導入された経緯があるが、0.160.0の標準機能と重複する。
- Codex CLI 0.160.0では`session/world_state.rs`が読み込んだ`AGENTS.md`を`AgentsMdState`に登録する。`compact.rs`の手動／ターン前compactは次の通常ターンで初期コンテキストを再投入し、ターン途中compactは置換した履歴へ初期コンテキストを挿入する。`core/tests/suite/compact.rs`には再投入の検証がある（[WorldState](https://github.com/openai/codex/blob/rust-v0.160.0/codex-rs/core/src/session/world_state.rs)、[compact](https://github.com/openai/codex/blob/rust-v0.160.0/codex-rs/core/src/compact.rs)、[tests](https://github.com/openai/codex/blob/rust-v0.160.0/codex-rs/core/tests/suite/compact.rs)）。この確認は**0.160.0のソース／テストに基づく**もので、現在利用中のCLIでcompactを実行した証拠ではない。
- Codex 0.160.0の`core/config.schema.json`では`agents.max_concurrent_threads_per_session`を定義するが`agents.max_threads`は定義しない。現行設定は`max_threads = 4`を使うため、0.160.0での設定読み込み互換性を検証する必要がある（[schema](https://github.com/openai/codex/blob/rust-v0.160.0/codex-rs/core/config.schema.json)）。`max_depth`と`default_subagent_model`／`default_subagent_reasoning_effort`は同版のスキーマに存在するため、一律削除しない。

## 3. 権限モードと安全境界

- Full Access: `sandbox_mode = "danger-full-access"` と `approval_policy = "never"` に相当する。サンドボックスやユーザー承認が代替防御になると仮定しない。
- Approve for me: 通常 `sandbox_mode = "workspace-write"`、`approval_policy = "on-request"`、`approvals_reviewer = "auto_review"` に相当する。別agentが承認してもPreToolUseの拒否は緩めない。
- 両方のモードで同じHook判定を使う。`execpolicy check`のargv分類と、実runtimeのHook dispatch／承認動作は別の検証項目とする。
- 権限設定のRepository default変更は本Issueの本質ではない。現行default／wrapper／実効的なUI overrideをまず確認し、変更が必要な場合のみ具体的な差分・rollbackを示してL3承認を得る。テストの都合でdefaultを黙ってFull Accessへ切り替えない。
- PreToolUseは主にBash matcherの誤操作防止であり、Full Accessで任意スクリプト・他ツール・外部プロセスからのGit操作を完全に隔離するセキュリティ境界ではない。保証対象と未カバー経路を文書化する。
- Codex 0.160.0ではDirectな`exec_command`と、Code Modeの外側`exec`／内側の`tools.exec_command()`でHook経路が異なる。`qa-workflow-skills`の検証方針に倣い、Directとnested `tools.exec_command()`で`PreToolUse`が発火するか確認する。外側のCode Mode `exec`がBash `PreToolUse`を必ず経由するとは扱わず、raw JavaScript、`write_stdin`、他ツールへの一般的な防護まで保証しない。CLI版・tool mode・payloadを記録する。

### 通常pushと承認の扱い

- 承認負荷を減らす対象は「非保護feature branchから、宛先を明示した単一の非保護branch/refへの通常push」。例は`git push origin feature/safe`、`git push -u origin feature/safe`、`git push origin HEAD:refs/heads/feature/safe`。実際の実行時には#192で定義するcanonical root固定を必須とする。Git設定や引数が追加のtag／submoduleを暗黙にpushする場合、これらの例でも無条件に許可しない。
- `git push`全体を無条件に許可するルールや、全Git操作を承認不要にする設定は追加しない。現在の`20-risky-prompt.rules`に通常pushの一律`prompt`がないため、根拠なく新しい`allow`／`prompt`を追加しない。実効的な他のruleが通常pushへ一致した場合に限り、その一致元と安全性を調べて最小限の修正を検討する。
- 強制push（`--force`、`-f`、`--force-with-lease`、短縮optionとの結合、refspec先頭`+`）、ref削除（`--delete`、空宛先）、`--mirror`／一括push、protected refへの直接push、宛先未確定・複数refspec・未知optionは、既存G7／G8／G10とexecpolicyによる拒否を維持する。さらに`--follow-tags`、`push.followTags`、`push.recurseSubmodules`等により追加pushが起きる構成は通常pushの自動許可対象外とする。通常pushを通すためにこれらの拒否を緩めない。
- execpolicyのrule判定、PreToolUseのALLOW／deny、sandbox権限、Auto-reviewの承認結果を区別する。ルールに一致しないことは、サンドボックスから自動的に実行許可されることを意味しない。`approvals_reviewer`、`approval_policy`、Full Accessへの切替をpush成功のために変更しない。
- `git commit`やその他の操作の承認ルールは、実際に問題が確認できない限り変更しない。User指示に基づくpushの実行権限・作業範囲は従来どおり必要とする。

## 4. 実装判断を固定する

### 対象rootの決定

1. 信頼できる比較元はこのHookを所有するcheckoutのGit worktree root。Hook source位置と現在のGit worktree情報を使用し、実行対象rootを`payload.cwd`のみから推定しない。
2. POSIXではリテラル絶対パスへの単一`cd -- "<canonical-root>" && git <subcommand> ...`だけを、既存のshell解析で検証可能な形に限定して認める。
3. Windows PowerShellでは単一`Set-Location -LiteralPath "<canonical-root>" -ErrorAction Stop`の直後にbare `git`／`git.exe`を実行する形を対象とする。`Set-Location`失敗時に後続Gitが実行されないことをPowerShell実行テストで証明し、成立しない区切り方は許可しない。
4. 実行先rootが異なる、相対root、変数展開・command substitution、複数cwd移動、mutation前の別command、Git環境やbranch変更を挟む場合は拒否する。
5. `git -C`、Git global overrideを含むmutationは常に拒否する。既存のread-only Gitの許可は維持する。`git.exe`等の既存対応は失わない。
6. 既存shell tokenizer／Git invocation解析／G1〜G10／protected-refロジックを利用する。`qa-workflow-skills`の600行規模のHookをそのままコピーして二重実装にしない。既存G1〜G9の拒否を弱めない。
7. 一つのコマンド文字列内で複数Git mutationやmutation前のGit context変更がある場合は拒否する。読み取り操作への一般的な複合commandは既存契約と比較して過剰に制限しない。

### protected branchからの切替

`qa-workflow-skills`の例外条件を参考に、既存`main`等の保護branchを変更せず、実在する非保護branchへの`git switch <name>`または新しい非保護branchの`git switch -c <name>`だけを許可候補とする。`--discard-changes`、`--force`、`--detach`、曖昧なbranch名は対象外とする。認可判定はコマンドから固定したrepositoryで行う。

### 通常pushを通すための実装条件

- `evaluateGitPush()`、`parsePushArguments()`、`getPushDestination()`および既存G7／G8／G10を再利用する。新たな承認フレームワークや別のpush parserは作らない。
- root固定形式を導入する際、`git push`の通常形がHookからexecpolicyへ進み、危険なpushはexecpolicyの`forbidden`だけに依存せずHookでも拒否されるようにする。正規形のシェル区切りがexecpolicyのbare Git segmentと一致することを確認する。
- `--no-verify`等の既存許可optionと、push先やrefのGit設定に依存する形式は、許可を拡張する前に実際の副作用と既存契約を確認する。必要性が確認できない形式を自動許可対象へ追加しない。
- 特に`push.followTags`（明示`--follow-tags`を含む）、`push.recurseSubmodules`／`submodule.recurse`、remoteのmirror設定で、単一refspec以外の更新が起きないことを確認する。許可できない場合はG10で拒否し、Git設定を暗黙に書き換えない。`--no-follow-tags`／`--no-recurse-submodules`等のGit公式の無効化指定で安全な形式を提供する場合は、その引数を既存parserで必要な範囲だけ認識し、優先順位と実動作をfixtureで検証する。汎用Git設定parserは追加しない。

### Codex CLI 0.160.0の標準機能を利用する範囲

- `qa-workflow-skills`の現行ハーネスと0.160.0の実装を比較し、**compact後のroot `AGENTS.md`再注入はCodex標準機能へ委ねる**。`.codex/config.toml`の`[[hooks.SessionStart]]`（`^compact# Issue #192: Codex Git操作のrepository判定とPreToolUseの安全性を修正するPlan

## 0. 依頼概要

- 対象: [Issue #192](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/issues/192)
- 作業branch: `issue-192-codex-git-workdir-guard`（Issue #193と共用。両Issueを同一ブランチ・同一PRで実装する）
- 参考実装: [qa-workflow-skills のCodex Hook](https://github.com/ryu-yoshikawa-pro-vision/qa-workflow-skills/blob/main/.codex/hooks/pre_tool_use_policy.mjs)、[対応するテスト](https://github.com/ryu-yoshikawa-pro-vision/qa-workflow-skills/blob/main/tests/codex/test_codex_hooks.py)、[安全境界の説明](https://github.com/ryu-yoshikawa-pro-vision/qa-workflow-skills/blob/main/docs/reference/codex-safety-harness.md)
- 本変更はPlanのみ。Hook・設定・テストの実装、PR作成、mergeは別作業とする。
- ユーザーの通常運用はCodexの「Full Access」または「Approve for me」をその時の作業に応じて使い分ける前提とする。同時に1つの権限モードとみなさない。

## 両Issue共通の実装・検証方針

- 同じブランチで#192と#193を実装し、**PRは1件**にまとめる。実装用の別ブランチ・別PRを作成しない。
- #193の詳細は[Issue #193のPlan](./2026-10-17_104100_issue-193-portable-artifact-sanitizer.md)を参照する。両Planは同じブランチの実装計画であり、独立した実装・mergeを前提としない。
- 作業順序: (1) #192のHook/Git safety境界とテスト修正、(2) #193のsanitizer既存fixture固定とNode正本への移植、(3) PowerShell/Bash wrapperとCIの統一、(4) **両Issueを合わせた回帰検証と1件のPRでレビュー**。
- 共通する変更が出た場合は、既存の`AGENTS.md`、`.codex/config.toml`、`docs/reference/codex-safety-harness.md`等の正本を1回の変更で整合させる。別の正本や重複ルールを作らない。
- #192のFull Access／Approve for meにおけるHookの拒否が、#193のRun Artifact sanitizationを迂回する理由になってはならない。各責務のテストを独立して維持し、統合後に両方を検証する。
- 実装時の各変更はレビューできる単位でcommitを分けてよいが、最終的なbranch、PR、CI成功判定は共通とする。PRを作るまでは、このPlan保存のみで止める。

## 1. ゴールと完了条件

Codex PreToolUseが`payload.cwd`を実行対象のrepositoryだと誤認し、`exec_command.workdir`により別repositoryでGit mutationが実行される経路を塞ぐ。通常のfeature branch操作とread-only Gitは不要に妨げず、protected branch/refの禁止と既存のexecpolicyを維持する。あわせて、Approve for meで通常のfeature branchへの`git push`が不要な承認・拒否を受けないか検証する。危険なpushの拒否を保つことを前提とし、承認機能全体を無効にする変更はしない。

実装完了条件:
1. State-changing Git invocationは、コマンド自身の検証済みliteral absolute rootにより実行対象を固定したものだけがG10評価へ進む。`payload.cwd`やtool-level `workdir`だけを根拠にALLOWしない。
2. 指定rootがHookを配置したこのcheckoutのcanonical Git worktree rootと一致しない、または決定できない場合は拒否する。移動失敗後にmutationが続く形式は拒否する。
3. `git -C`、`--git-dir`、`--work-tree`、`GIT_DIR`／`GIT_WORK_TREE`等のrepository上書きによるmutationと、曖昧なwrapper／dynamic shell expansionは拒否する。read-only Gitの現行許可は維持する。
4. Protected branch/refへのcommit、push、ref更新、削除等を拒否する。feature branch上の通常`git add`、`git commit`、`git push`等は既存の許可契約を満たす。通常pushは明示した単一の非保護ref以外にtagやsubmoduleが暗黙にpushされないことも確認する。`main`から非保護feature branchへの安全な`git switch`／`switch -c`は必要範囲で許可し、それ以外のmutationは拒否する。
5. `execpolicy`の既存`prompt`／`forbidden`を実command形式で検証する。ただし安全な通常pushを一律に`prompt`へ送るルールは追加しない。他の高影響操作に対する既存承認・禁止ルールは維持する。Hookの拒否をAuto-review承認で上書きできるものと解釈しない。
6. Approve for meでは、対象repositoryの安全な通常pushがHookやrepository-local execpolicyによって不要に拒否・承認要求されないことを検証する。Full Accessでは同じHookの危険操作拒否を維持する。sandbox／実効的な承認設定による拒否は別原因として切り分け、承認を無効化して回避しない。
7. Windows／POSIXの既存テスト、`pnpm run test:hooks`、`pnpm run test:contracts`、`pnpm run verify`、関係するGitHub Actionsが最終HEADで成功する。未実施の実runtime検証は成功と報告しない。
8. Codex CLI 0.160.0で標準搭載されたcompact後の`AGENTS.md`復元を前提に、重複する`SessionStart(source=compact)`独自再注入を廃止する。Hook定義／source／専用テスト／安全ハーネス文書の参照を整合させ、他の`PreToolUse`／`PostToolUse`／`Stop`等は維持する。0.160.0より前や別版への互換性は実runtime確認の対象として区別する。
9. CLI 0.160.0の設定スキーマに合致することを確認する。既存`[agents] max_threads = 4`等の互換性問題は最小修正し、並列数・既存Role・model選択を無関係に変更しない。Direct／Code Modeの実Tool経路別にHook到達・制限を評価する。

## 2. 現状と確認済みの問題

- `.codex/hooks/pre_tool_use_policy.mjs` の `decidePayload()` は `payload.cwd` を `evaluateCommand()` へ渡す。
- `evaluateCommand()` はGit呼び出しごとに `getGitCommandContext(getEffectiveGitCwd(invocation, cwd))` を呼ぶ。現状は`git -C`を含むstate-changing commandも許可可能。
- `evaluateCompoundContextTransition()` はGit mutationの前に`cd`等がある場合に一律拒否する。新たな安全なcanonical root固定形式との両立が必要。
- `tests/contracts/codex-hook-contract.test.ts` には`git -C`をfeature branchで許可するケース、複数Git invocation、Windows launcher、protected branch/ref等の多数の既存ケースがある。既存契約を無批判に新しい方針へ合わせて削らない。
- `.codex/config.toml` の現時点のRepository defaultは `sandbox_mode = "workspace-write"` / `approval_policy = "never"`。Full Access／Approve for meのいずれかが常に有効になっているわけではない。
- 現行`.codex/rules/20-risky-prompt.rules`には`git push`を一律に`prompt`へ送るルールがない。`.codex/rules/30-destructive-forbidden.rules`は一部のforce push・削除・mirror等を`forbidden`にし、Hookの`evaluateGitPush()`はG7（force）、G8（削除・mirror）、G10（宛先不明・protected ref）等を判定する。両者が全ての構文を網羅するとは前提にせず、#192のroot固定後も実コマンド形式で確認する。
- 現行`parsePushArguments()`は`--follow-tags`を許可optionに含む。一方Gitは`push.followTags=true`でも注釈付きtagを追加pushし、`push.recurseSubmodules=on-demand`等でsubmoduleのpushが発生し得る。明示refspecが1件という構文検査だけでは実際の更新対象を1件に固定できない（[git-push](https://git-scm.com/docs/git-push)、[git-config](https://git-scm.com/docs/git-config)）。
- 現状でApprove for meの通常pushが拒否される原因は未確定。他repositoryに明示ruleがない場合の成功だけでHook・execpolicy・sandboxのどれが原因かは断定しない。
- [Codex upstream #32360](https://github.com/openai/codex/issues/32360) はBash PreToolUseにtool-level `workdir`が含まれない問題を扱う。実装時は対象Codex versionと実payloadを改めて確認する。
- 現行`.codex/config.toml`には`SessionStart`の`^compact# Issue #192: Codex Git操作のrepository判定とPreToolUseの安全性を修正するPlan

## 0. 依頼概要

- 対象: [Issue #192](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/issues/192)
- 作業branch: `issue-192-codex-git-workdir-guard`（Issue #193と共用。両Issueを同一ブランチ・同一PRで実装する）
- 参考実装: [qa-workflow-skills のCodex Hook](https://github.com/ryu-yoshikawa-pro-vision/qa-workflow-skills/blob/main/.codex/hooks/pre_tool_use_policy.mjs)、[対応するテスト](https://github.com/ryu-yoshikawa-pro-vision/qa-workflow-skills/blob/main/tests/codex/test_codex_hooks.py)、[安全境界の説明](https://github.com/ryu-yoshikawa-pro-vision/qa-workflow-skills/blob/main/docs/reference/codex-safety-harness.md)
- 本変更はPlanのみ。Hook・設定・テストの実装、PR作成、mergeは別作業とする。
- ユーザーの通常運用はCodexの「Full Access」または「Approve for me」をその時の作業に応じて使い分ける前提とする。同時に1つの権限モードとみなさない。

## 両Issue共通の実装・検証方針

- 同じブランチで#192と#193を実装し、**PRは1件**にまとめる。実装用の別ブランチ・別PRを作成しない。
- #193の詳細は[Issue #193のPlan](./2026-10-17_104100_issue-193-portable-artifact-sanitizer.md)を参照する。両Planは同じブランチの実装計画であり、独立した実装・mergeを前提としない。
- 作業順序: (1) #192のHook/Git safety境界とテスト修正、(2) #193のsanitizer既存fixture固定とNode正本への移植、(3) PowerShell/Bash wrapperとCIの統一、(4) **両Issueを合わせた回帰検証と1件のPRでレビュー**。
- 共通する変更が出た場合は、既存の`AGENTS.md`、`.codex/config.toml`、`docs/reference/codex-safety-harness.md`等の正本を1回の変更で整合させる。別の正本や重複ルールを作らない。
- #192のFull Access／Approve for meにおけるHookの拒否が、#193のRun Artifact sanitizationを迂回する理由になってはならない。各責務のテストを独立して維持し、統合後に両方を検証する。
- 実装時の各変更はレビューできる単位でcommitを分けてよいが、最終的なbranch、PR、CI成功判定は共通とする。PRを作るまでは、このPlan保存のみで止める。

## 1. ゴールと完了条件

Codex PreToolUseが`payload.cwd`を実行対象のrepositoryだと誤認し、`exec_command.workdir`により別repositoryでGit mutationが実行される経路を塞ぐ。通常のfeature branch操作とread-only Gitは不要に妨げず、protected branch/refの禁止と既存のexecpolicyを維持する。あわせて、Approve for meで通常のfeature branchへの`git push`が不要な承認・拒否を受けないか検証する。危険なpushの拒否を保つことを前提とし、承認機能全体を無効にする変更はしない。

実装完了条件:
1. State-changing Git invocationは、コマンド自身の検証済みliteral absolute rootにより実行対象を固定したものだけがG10評価へ進む。`payload.cwd`やtool-level `workdir`だけを根拠にALLOWしない。
2. 指定rootがHookを配置したこのcheckoutのcanonical Git worktree rootと一致しない、または決定できない場合は拒否する。移動失敗後にmutationが続く形式は拒否する。
3. `git -C`、`--git-dir`、`--work-tree`、`GIT_DIR`／`GIT_WORK_TREE`等のrepository上書きによるmutationと、曖昧なwrapper／dynamic shell expansionは拒否する。read-only Gitの現行許可は維持する。
4. Protected branch/refへのcommit、push、ref更新、削除等を拒否する。feature branch上の通常`git add`、`git commit`、`git push`等は既存の許可契約を満たす。通常pushは明示した単一の非保護ref以外にtagやsubmoduleが暗黙にpushされないことも確認する。`main`から非保護feature branchへの安全な`git switch`／`switch -c`は必要範囲で許可し、それ以外のmutationは拒否する。
5. `execpolicy`の既存`prompt`／`forbidden`を実command形式で検証する。ただし安全な通常pushを一律に`prompt`へ送るルールは追加しない。他の高影響操作に対する既存承認・禁止ルールは維持する。Hookの拒否をAuto-review承認で上書きできるものと解釈しない。
6. Approve for meでは、対象repositoryの安全な通常pushがHookやrepository-local execpolicyによって不要に拒否・承認要求されないことを検証する。Full Accessでは同じHookの危険操作拒否を維持する。sandbox／実効的な承認設定による拒否は別原因として切り分け、承認を無効化して回避しない。
7. Windows／POSIXの既存テスト、`pnpm run test:hooks`、`pnpm run test:contracts`、`pnpm run verify`、関係するGitHub Actionsが最終HEADで成功する。未実施の実runtime検証は成功と報告しない。
8. Codex CLI 0.160.0で標準搭載されたcompact後の`AGENTS.md`復元を前提に、重複する`SessionStart(source=compact)`独自再注入を廃止する。Hook定義／source／専用テスト／安全ハーネス文書の参照を整合させ、他の`PreToolUse`／`PostToolUse`／`Stop`等は維持する。0.160.0より前や別版への互換性は実runtime確認の対象として区別する。
9. CLI 0.160.0の設定スキーマに合致することを確認する。既存`[agents] max_threads = 4`等の互換性問題は最小修正し、並列数・既存Role・model選択を無関係に変更しない。Direct／Code Modeの実Tool経路別にHook到達・制限を評価する。

## 2. 現状と確認済みの問題

- `.codex/hooks/pre_tool_use_policy.mjs` の `decidePayload()` は `payload.cwd` を `evaluateCommand()` へ渡す。
- `evaluateCommand()` はGit呼び出しごとに `getGitCommandContext(getEffectiveGitCwd(invocation, cwd))` を呼ぶ。現状は`git -C`を含むstate-changing commandも許可可能。
- `evaluateCompoundContextTransition()` はGit mutationの前に`cd`等がある場合に一律拒否する。新たな安全なcanonical root固定形式との両立が必要。
- `tests/contracts/codex-hook-contract.test.ts` には`git -C`をfeature branchで許可するケース、複数Git invocation、Windows launcher、protected branch/ref等の多数の既存ケースがある。既存契約を無批判に新しい方針へ合わせて削らない。
- `.codex/config.toml` の現時点のRepository defaultは `sandbox_mode = "workspace-write"` / `approval_policy = "never"`。Full Access／Approve for meのいずれかが常に有効になっているわけではない。
- 現行`.codex/rules/20-risky-prompt.rules`には`git push`を一律に`prompt`へ送るルールがない。`.codex/rules/30-destructive-forbidden.rules`は一部のforce push・削除・mirror等を`forbidden`にし、Hookの`evaluateGitPush()`はG7（force）、G8（削除・mirror）、G10（宛先不明・protected ref）等を判定する。両者が全ての構文を網羅するとは前提にせず、#192のroot固定後も実コマンド形式で確認する。
- 現行`parsePushArguments()`は`--follow-tags`を許可optionに含む。一方Gitは`push.followTags=true`でも注釈付きtagを追加pushし、`push.recurseSubmodules=on-demand`等でsubmoduleのpushが発生し得る。明示refspecが1件という構文検査だけでは実際の更新対象を1件に固定できない（[git-push](https://git-scm.com/docs/git-push)、[git-config](https://git-scm.com/docs/git-config)）。
- 現状でApprove for meの通常pushが拒否される原因は未確定。他repositoryに明示ruleがない場合の成功だけでHook・execpolicy・sandboxのどれが原因かは断定しない。
 matcher（`additionalContextLimit = 4096`）があり、`.codex/hooks/session_start_context.mjs`はroot `AGENTS.md`全文を`hookSpecificOutput.additionalContext`へ再注入する。`tests/contracts/codex-hook-contract.test.ts`はこの旧動作を専用contractとして要求し、`docs/reference/codex-safety-harness.md`も旧動作を記載している。これは0.147系で導入された経緯があるが、0.160.0の標準機能と重複する。
- Codex CLI 0.160.0では`session/world_state.rs`が読み込んだ`AGENTS.md`を`AgentsMdState`に登録する。`compact.rs`の手動／ターン前compactは次の通常ターンで初期コンテキストを再投入し、ターン途中compactは置換した履歴へ初期コンテキストを挿入する。`core/tests/suite/compact.rs`には再投入の検証がある（[WorldState](https://github.com/openai/codex/blob/rust-v0.160.0/codex-rs/core/src/session/world_state.rs)、[compact](https://github.com/openai/codex/blob/rust-v0.160.0/codex-rs/core/src/compact.rs)、[tests](https://github.com/openai/codex/blob/rust-v0.160.0/codex-rs/core/tests/suite/compact.rs)）。この確認は**0.160.0のソース／テストに基づく**もので、現在利用中のCLIでcompactを実行した証拠ではない。
- Codex 0.160.0の`core/config.schema.json`では`agents.max_concurrent_threads_per_session`を定義するが`agents.max_threads`は定義しない。現行設定は`max_threads = 4`を使うため、0.160.0での設定読み込み互換性を検証する必要がある（[schema](https://github.com/openai/codex/blob/rust-v0.160.0/codex-rs/core/config.schema.json)）。`max_depth`と`default_subagent_model`／`default_subagent_reasoning_effort`は同版のスキーマに存在するため、一律削除しない。

## 3. 権限モードと安全境界

- Full Access: `sandbox_mode = "danger-full-access"` と `approval_policy = "never"` に相当する。サンドボックスやユーザー承認が代替防御になると仮定しない。
- Approve for me: 通常 `sandbox_mode = "workspace-write"`、`approval_policy = "on-request"`、`approvals_reviewer = "auto_review"` に相当する。別agentが承認してもPreToolUseの拒否は緩めない。
- 両方のモードで同じHook判定を使う。`execpolicy check`のargv分類と、実runtimeのHook dispatch／承認動作は別の検証項目とする。
- 権限設定のRepository default変更は本Issueの本質ではない。現行default／wrapper／実効的なUI overrideをまず確認し、変更が必要な場合のみ具体的な差分・rollbackを示してL3承認を得る。テストの都合でdefaultを黙ってFull Accessへ切り替えない。
- PreToolUseは主にBash matcherの誤操作防止であり、Full Accessで任意スクリプト・他ツール・外部プロセスからのGit操作を完全に隔離するセキュリティ境界ではない。保証対象と未カバー経路を文書化する。
- Codex 0.160.0ではDirectな`exec_command`と、Code Modeの外側`exec`／内側の`tools.exec_command()`でHook経路が異なる。`qa-workflow-skills`の検証方針に倣い、Directとnested `tools.exec_command()`で`PreToolUse`が発火するか確認する。外側のCode Mode `exec`がBash `PreToolUse`を必ず経由するとは扱わず、raw JavaScript、`write_stdin`、他ツールへの一般的な防護まで保証しない。CLI版・tool mode・payloadを記録する。

### 通常pushと承認の扱い

- 承認負荷を減らす対象は「非保護feature branchから、宛先を明示した単一の非保護branch/refへの通常push」。例は`git push origin feature/safe`、`git push -u origin feature/safe`、`git push origin HEAD:refs/heads/feature/safe`。実際の実行時には#192で定義するcanonical root固定を必須とする。Git設定や引数が追加のtag／submoduleを暗黙にpushする場合、これらの例でも無条件に許可しない。
- `git push`全体を無条件に許可するルールや、全Git操作を承認不要にする設定は追加しない。現在の`20-risky-prompt.rules`に通常pushの一律`prompt`がないため、根拠なく新しい`allow`／`prompt`を追加しない。実効的な他のruleが通常pushへ一致した場合に限り、その一致元と安全性を調べて最小限の修正を検討する。
- 強制push（`--force`、`-f`、`--force-with-lease`、短縮optionとの結合、refspec先頭`+`）、ref削除（`--delete`、空宛先）、`--mirror`／一括push、protected refへの直接push、宛先未確定・複数refspec・未知optionは、既存G7／G8／G10とexecpolicyによる拒否を維持する。さらに`--follow-tags`、`push.followTags`、`push.recurseSubmodules`等により追加pushが起きる構成は通常pushの自動許可対象外とする。通常pushを通すためにこれらの拒否を緩めない。
- execpolicyのrule判定、PreToolUseのALLOW／deny、sandbox権限、Auto-reviewの承認結果を区別する。ルールに一致しないことは、サンドボックスから自動的に実行許可されることを意味しない。`approvals_reviewer`、`approval_policy`、Full Accessへの切替をpush成功のために変更しない。
- `git commit`やその他の操作の承認ルールは、実際に問題が確認できない限り変更しない。User指示に基づくpushの実行権限・作業範囲は従来どおり必要とする。

## 4. 実装判断を固定する

### 対象rootの決定

1. 信頼できる比較元はこのHookを所有するcheckoutのGit worktree root。Hook source位置と現在のGit worktree情報を使用し、実行対象rootを`payload.cwd`のみから推定しない。
2. POSIXではリテラル絶対パスへの単一`cd -- "<canonical-root>" && git <subcommand> ...`だけを、既存のshell解析で検証可能な形に限定して認める。
3. Windows PowerShellでは単一`Set-Location -LiteralPath "<canonical-root>" -ErrorAction Stop`の直後にbare `git`／`git.exe`を実行する形を対象とする。`Set-Location`失敗時に後続Gitが実行されないことをPowerShell実行テストで証明し、成立しない区切り方は許可しない。
4. 実行先rootが異なる、相対root、変数展開・command substitution、複数cwd移動、mutation前の別command、Git環境やbranch変更を挟む場合は拒否する。
5. `git -C`、Git global overrideを含むmutationは常に拒否する。既存のread-only Gitの許可は維持する。`git.exe`等の既存対応は失わない。
6. 既存shell tokenizer／Git invocation解析／G1〜G10／protected-refロジックを利用する。`qa-workflow-skills`の600行規模のHookをそのままコピーして二重実装にしない。既存G1〜G9の拒否を弱めない。
7. 一つのコマンド文字列内で複数Git mutationやmutation前のGit context変更がある場合は拒否する。読み取り操作への一般的な複合commandは既存契約と比較して過剰に制限しない。

### protected branchからの切替

`qa-workflow-skills`の例外条件を参考に、既存`main`等の保護branchを変更せず、実在する非保護branchへの`git switch <name>`または新しい非保護branchの`git switch -c <name>`だけを許可候補とする。`--discard-changes`、`--force`、`--detach`、曖昧なbranch名は対象外とする。認可判定はコマンドから固定したrepositoryで行う。

### 通常pushを通すための実装条件

- `evaluateGitPush()`、`parsePushArguments()`、`getPushDestination()`および既存G7／G8／G10を再利用する。新たな承認フレームワークや別のpush parserは作らない。
- root固定形式を導入する際、`git push`の通常形がHookからexecpolicyへ進み、危険なpushはexecpolicyの`forbidden`だけに依存せずHookでも拒否されるようにする。正規形のシェル区切りがexecpolicyのbare Git segmentと一致することを確認する。
- `--no-verify`等の既存許可optionと、push先やrefのGit設定に依存する形式は、許可を拡張する前に実際の副作用と既存契約を確認する。必要性が確認できない形式を自動許可対象へ追加しない。
- 特に`push.followTags`（明示`--follow-tags`を含む）、`push.recurseSubmodules`／`submodule.recurse`、remoteのmirror設定で、単一refspec以外の更新が起きないことを確認する。許可できない場合はG10で拒否し、Git設定を暗黙に書き換えない。`--no-follow-tags`／`--no-recurse-submodules`等のGit公式の無効化指定で安全な形式を提供する場合は、その引数を既存parserで必要な範囲だけ認識し、優先順位と実動作をfixtureで検証する。汎用Git設定parserは追加しない。

）と専用launcher定義を削除し、`.codex/hooks/session_start_context.mjs`は他の参照がないことを確認したうえで削除する。専用contract testと現行文書を更新し、過去のRun Artifactや歴史的Planを書き換えない。
- Codexの`AGENTS.md`探索はrootからcurrent directoryに適用される階層を対象とする。rootファイルを独自Hookで再注入する方式はnested instructionsやhost側の標準復元と競合し得るため採用しない。`AGENTS.md`本文、Run Artifact lifecycle、既存の必要時参照先は維持し、compact直後の追加一律全文再読込・`compact_prompt`上書き・`additionalContextLimit`代替設定を作らない。
- 利用中のCLI版と実効configを確認し、0.160.0での設定スキーマ不整合が確認されたら`agents.max_threads = 4`を`agents.max_concurrent_threads_per_session = 4`へ置き換える。他の`[agents]`値は当該CLIで非互換と確認されたものだけを最小変更する。版が異なる場合は公式仕様・実効設定を改めて照合する。`multi_agent`／`unified_exec`／`approvals_reviewer`などを比較先と同じにするためだけに一括移植しない。
- compact自動／手動・root／nested探索は、対応するCodex 0.160.0実装・テストを根拠として設計する。実環境で安全に再現可能なら最小のread-only runtime smokeを実施する。compactを強制できない、内部model inputが確認できない場合はruntime未検証と記録し、標準復元そのものを独自Hookで代替しない。

## 5. 変更対象と手順

想定変更対象:
- `.codex/hooks/pre_tool_use_policy.mjs`
- `.codex/config.toml`（compact専用SessionStart定義の整理。0.160.0と非互換な設定が確認された場合の最小修正）
- `.codex/hooks/session_start_context.mjs`（使用箇所確認後、重複するcompact専用実装を削除）
- `tests/contracts/codex-hook-contract.test.ts`（Git safetyに加えてcompact専用Hookの期待値を変更）
- 必要に応じて`.codex/rules/*.rules`およびexecpolicy contract tests
- `docs/reference/codex-safety-harness.md`、`docs/reference/git-branch-safety.md`、`.codex/rules/README.md`等の実際の契約を所有する文書
- 起動wrapperは実効設定検証で必要性が確定した場合のみ変更

実行順序:
- [ ] 現在の`main`、issue、Codex version、Hook／config／rules／wrapper／Windows launcher／関連テストを再確認する。`qa-workflow-skills`の参考実装との差分を確認する。0.160.0を使用する場合は`agents.max_threads`の設定互換性をCodex本体のschema／起動検証で確認する。
- [ ] 現行HookのGit operation分類（read-only／mutation、subcommand、global options、push/ref、compound shell）と既存テストの期待値を整理する。#192で意図的に変更する`git -C`の許可期待値を区別する。
- [ ] canonical root固定の許可形式をPOSIXとPowerShellで確定し、特にcwd移動失敗時のfail-closedを小さなテストで確認する。
- [ ] G10のcontext選択と`evaluateCompoundContextTransition()`を最小変更し、既存の他の拒否条件と合わせる。一般用途の新規shell parser／抽象化を追加しない。
- [ ] feature branch許可、protected branch/ref禁止、複数mutation拒否、`git -C` mutation拒否、PowerShell launcher、実効権限モードの回帰テストを更新する。通常pushのpositive caseとforce／削除／protected ref／宛先不明のnegative caseを同じfixtureで対比する。注釈付きtagと`push.followTags=true`を持つlocal remote fixtureを用い、1 refspecでもtagが追加される経路を再現する。必要に応じてsubmodule／mirror設定も同様に確認する。
- [ ] `codex execpolicy check`では、通常pushがrepository-localの一律`prompt`／`forbidden`に該当しないこと、既存の高影響操作の`prompt`と危険操作の`forbidden`が維持されることを確認する。コマンド文字列の分割を伴う実execpolicy挙動は単純なargv checkだけで合格扱いしない。
- [ ] compact後の`AGENTS.md`復元をCodex標準機能へ委譲し、`SessionStart`登録・独自root全文再注入・launcher・専用contractを除去する。既存の他Hook・root/nested `AGENTS.md`探索とRun契約は維持する。0.160.0のcompact unit/integration testを参照し、CLI実機で未確認の範囲は明示する。
- [ ] 0.160.0向けの設定互換性contractを追加／更新する。`max_threads`が非対応なら`max_concurrent_threads_per_session = 4`へ変更し、現在のcustom agent・model選択・並列数を維持する。設定変更後はHook trustの状態を再確認する。
- [ ] 対象Codex版でHook登録と実効設定を確認し、Approve for me／Full Access、Direct `exec_command`／Code Mode内nested `tools.exec_command()`の適用可能な経路別smokeを実施する。外側Code Mode `exec`と`write_stdin`に対するBash Hookの保証範囲を別記する。GitHubへの実pushはテストのために行わず、一時的なlocal bare repositoryをremoteとする明示的な通常pushで、feature branchからの成功、Hook拒否なし、不要なexecpolicy承認要求なし、危険pushがHookで拒否されることを確認する。sandboxまたはAuto-reviewでの追加承認・拒否があれば原因を区別して記録し、未達をPASSにしない。CLI versionやruntimeが利用できなければ未検証と明示する。
- [ ] 安全境界の保証／制限、Codex起動手順、root固定するGit操作例を既存文書に同期する。
- [ ] focused tests→Repository標準`verify`→Windows/Ubuntuの関連CIを確認する。未検証項目は理由付きで区別する。

## 6. 検証表

| 条件 | 期待 |
| --- | --- |
| session cwd=A、実際のtool workdir=B、裸の`git commit` | Hook deny。Aのfeature branchを根拠にALLOWしない |
| 同じくcommand内でroot=Aへ安全な絶対path移動＋裸Git、実commandが確実にAへ移る | Aのbranch／refで評価 |
| root=Bまたはrelative/dynamic rootへ移動＋mutation | Hook deny |
| cwd移動失敗、二重移動、git実行前の別command／environment変更 | Hook deny、実Git未実行 |
| `git -C`／`--git-dir`／`GIT_WORK_TREE`でmutation | Hook deny |
| feature branchへのcommit、非保護refへの通常push | G10で不必要に拒否しない。通常pushはrepository-localの一律`prompt`／`forbidden`に該当しない。commitの既存承認分類は維持する |
| canonical root固定＋`git push origin feature/safe`／`git push -u origin feature/safe`／`git push origin HEAD:refs/heads/feature/safe` | Hook許可は追加tag／submodule送信のない設定・引数に限る。local bare remoteで実動作を検証 |
| `--follow-tags`または`push.followTags=true`、送信対象になる注釈付きtagあり | 明示refspecが1件でもtagが追加されるため通常push扱いしない。`--no-follow-tags`等による抑止は別のpositive fixtureで検証 |
| `push.recurseSubmodules=on-demand`等でsubmoduleの追加pushが有効／mirror設定 | 追加更新が発生する設定で無条件ALLOWしない。明示的な抑止指定またはG10 denyの契約を検証 |
| `git push --force`／`-f`／`--force-with-lease`／`+feature:feature`、短縮option結合 | G7 deny。execpolicyの既存`forbidden`も回帰確認 |
| `git push --delete`／空宛先、`--mirror`／`--all`／`--tags`、複数refspec／宛先省略／未知option | G8またはG10 deny。宛先を確定できない形式を通常push扱いしない |
| protected branchでのcommit、protected refへのpush／update | Hook deny |
| 安全な非保護branchへの`switch`／`switch -c` | 許可候補。高影響操作はexecpolicyと整合 |
| 読み取りGit、Gitの内部cache更新のみを伴う読み取り | 不必要に一律禁止しない |
| `rebase`、`reset --hard`等の既存`prompt`／`forbidden` family | bare Git segmentが現行ruleに一致。Hookと両者を混同しない |
| Full Access／Approve for meそれぞれの実効モード | Hook denyが維持。Approve for meでは一時local bare remoteへの通常pushが不要なrepository-local rule promptなしに成功することを検証。sandbox／Auto-review／Git自身の失敗は分離し、未実施は未検証とする |
| compact後の`AGENTS.md`指示保持（0.160.0のsource／既存テスト） | 標準のworld state復元を利用。重複`SessionStart`なし、他Hook不変。実CLIでの自動compact再現は未実施なら未検証と明記 |
| root／nestedの`AGENTS.md`と旧`SessionStart`登録・テスト | root／nested探索と既存`AGENTS.md`は維持。compact専用追加コンテキストと専用テスト期待値は除去 |
| CLI 0.160.0設定互換性と実行モード | `max_threads`等の非対応設定で起動しない問題を残さず、Direct／Code Mode nested ToolのHookを別々に評価。外側Code Mode／`write_stdin`は保証外と明記 |

## 7. リスク・対象外・rollback

- Parserに許可例外を広げると別のshell表現が抜け道になり得る。未知のmutation形式はdenyし、正常系は狭い形式で提供する。
- Windows PowerShellの`;`と`-ErrorAction Stop`が十分なfail-closed保証になるとは断定しない。失敗時の実行停止を検証する。
- 既存`git -C`許可契約を変更するため、関連Contractは期待値の変更理由を記録する。read-onlyまで全面禁止にしない。
- 既存の`approval_policy = "never"`／wrapper presetを別Issueの要求なく一括変更しない。Default変更が必要なら影響とrollbackを別途明示する。
- 既存`SessionStart`は過去に独自fail-closed契約を提供したが、0.160.0の標準復元と重複する。廃止時はconfig・専用contract・参照文書をまとめて整合させ、ほかのHookやCodex text quality gateを削除しない。CLI版が0.160.0以外の場合は互換性を実確認し、未検証を復元済みと報告しない。
- 0.160.0のconfig schema不一致はGit safety修正の起動確認を妨げる可能性がある。`max_threads`の互換性修正を許すが、モデルの勝手な変更、サブエージェント構成の全面移植、機能フラグの一括切替はしない。
- 通常pushを一律`prompt`へ送るルールの追加は避けるが、承認削減を理由に`forbidden`やG7／G8／G10を削除しない。危険pushを見逃す回帰が出た場合は通常pushの承認削減より先に安全性を修正する。
- Gitの設定による暗黙のtag／submodule送信を見逃すと、引数上1件の通常pushでも追加refが更新される。安全性を確認できない構成を自動許可して対応しない。
- Full AccessでHookは万能な隔離機構ではない。agent自身や任意shellによる全ての迂回を技術的に禁止したとは記載しない。
- 失敗時はHookと対応Contractを最後の成功commitへ戻す（force push／branch削除は行わない）。運用設定を変更した場合のみ、その具体的な設定を元へ戻す。
- 対象外: Codex本体のupstream修正、任意shellの一般解析器、#193のsanitizer、別repositoryのHarness全体移植。

## 8. Planの完了と引き継ぎ

本Planの保存とbranch作成は実装・受入を意味しない。実装者はこのPlanに沿ってCodex対象versionの公式仕様を確認し、確認した差分のみ実装する。ローカル／CI／実runtimeの結果と失敗・未検証範囲を混同せず、既存のRun Artifact／review契約に従って保存する。PR作成・merge・Issue closeは本Plan作成作業の範囲外。
