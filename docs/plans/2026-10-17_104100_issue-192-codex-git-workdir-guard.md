# Codexハーネス改善Plan：Git操作の安全性と0.160.0対応

## 目的

CodexがGitの変更系コマンドを実行する際、Hookの判定対象と実際の操作対象が異なる問題を防ぐ。既存の危険操作の拒否を維持しつつ、非保護branchでの通常操作を妨げない。

併せて、Codex CLI 0.160.0で不要になった独自の`AGENTS.md`再注入と、確認された設定の非互換を整理する。

- 背景：[Issue #192](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/issues/192)。Issue本文は経緯として参照し、実装は本Planの範囲と完了条件に従う。
- 実装branch：`issue-192-codex-git-workdir-guard`。[サニタイザーPlan](./2026-10-17_104100_issue-193-portable-artifact-sanitizer.md)と共用し、実装PRは1件にまとめる。
- 今回はPlanの更新のみ。コード変更・実行テスト・PR作成・mergeは対象外。

## 現状

- `.codex/hooks/pre_tool_use_policy.mjs`の`decidePayload()`は`payload.cwd`をGitの操作対象判定に使用する。Codex 0.160.0のBash `PreToolUse`では`exec_command.workdir`を受け取れないため、別repositoryを誤って許可し得る。実事故は未確認。
- `evaluateCompoundContextTransition()`はcwd変更後のGit mutationを拒否する。安全なroot固定形式だけ例外として扱う必要がある。
- 既存のG7／G8／G10と`.codex/rules/*.rules`は危険なGit操作を制限している。`git push`全体をpromptにするルールは現時点で存在しない。
- `.codex/config.toml`は`SessionStart(source=compact)`の独自Hookを登録し、`agents.max_threads = 4`を使用する。
- Codex 0.160.0では`AGENTS.md`がworld stateで管理され、compact後の初期コンテキスト復元が実装されている。また、同版のconfig schemaには`agents.max_concurrent_threads_per_session`があり、`agents.max_threads`は定義されていない。

## 実装方針

### 1. Git操作の対象を固定する

- 既存のGit parser、`getGitCommandContext()`、`evaluateCompoundContextTransition()`、G1〜G10を再利用する。Gitやshellの汎用解析器は作らない。
- state-changing Git commandは、**Hookを所有するcheckoutのcanonical worktree root**と、コマンド内で明示された**literal absolute path**が一致すると確認できる場合のみ判定を続ける。
- POSIXでは`cd -- "<absolute-root>" && git <subcommand> ...`を基本形とする。PowerShellでは`Set-Location -LiteralPath "<absolute-root>"`の成功が確認できた場合だけ、直後のbare `git`／`git.exe`を認める。cwd変更に失敗した後にGitが実行されないことを実行テストで確認する。
- 裸の変更系Git、別root、相対path、展開を伴うpath、複数のcwd移動、間に別commandを挟む形式、`git -C`／`--git-dir`／`--work-tree`／`GIT_DIR`／`GIT_WORK_TREE`による対象変更は拒否する。
- 保護branch/refの既存拒否を維持する。保護branchから安全な非保護branchへの`git switch`／`git switch -c`のみ、既存契約に従って例外とする。read-only Gitの利用は不必要に制限しない。

### 2. 通常pushを妨げず危険操作を拒否する

- 宛先を明示した単一の非保護branch/refへの通常pushを許可候補とする。force push、削除、mirror、一括push、曖昧な宛先、保護refへのpushはG7／G8／G10とexecpolicyの拒否を維持する。
- `--follow-tags`や`push.followTags=true`、`push.recurseSubmodules`、remote mirror設定などで明示ref以外の更新が生じ得る場合は、通常pushとして無条件に許可しない。必要な設定・オプションだけ既存parserで確認する。安全性を確認できない場合は拒否し、Git設定を勝手に変更しない。
- `git push`を一律に`allow`または`prompt`とする新ルールは追加しない。Approve for meで実際に問題が発生した場合は、Hook／execpolicy／sandbox／Auto-reviewのどこで拒否されたかを切り分ける。
- Hookは通常のCodexツール呼出しに対する制御であり、任意の外部プロセスやすべてのMCP操作を保護するものではない。

### 3. Codex標準機能と設定を利用する

- `AGENTS.md`のcompact後復元はCodex標準に委ねる。`.codex/config.toml`のcompact専用`SessionStart`設定、専用launcher、`additionalContextLimit`、`.codex/hooks/session_start_context.mjs`は参照を確認して撤去する。ほかのHookは維持する。
- rootおよびnested `AGENTS.md`の標準探索を維持し、再注入用の新しいHookや`compact_prompt`上書きを作らない。利用中CLIで未確認の挙動は未検証と記録する。
- 0.160.0で非対応が確認された`agents.max_threads = 4`は、並列数を変えず`agents.max_concurrent_threads_per_session = 4`へ置き換える。既存のRole、model、approval設定、その他のfeature flagは不必要に変更しない。

根拠：[Codex 0.160.0 compact](https://github.com/openai/codex/blob/rust-v0.160.0/codex-rs/core/src/compact.rs)、[world state](https://github.com/openai/codex/blob/rust-v0.160.0/codex-rs/core/src/session/world_state.rs)、[config schema](https://github.com/openai/codex/blob/rust-v0.160.0/codex-rs/core/config.schema.json)。

## 変更対象

- `.codex/hooks/pre_tool_use_policy.mjs`：Git context判定の修正。
- `.codex/config.toml`、`.codex/hooks/session_start_context.mjs`：compact用重複処理と設定互換性の整理。
- `tests/contracts/codex-hook-contract.test.ts`：Git安全性とcompact専用Hookの契約を更新。
- `docs/reference/codex-safety-harness.md`、`docs/reference/git-branch-safety.md`など：変更した運用契約のみ同期。
- `.codex/rules/*.rules`、起動wrapper：具体的な不整合が確認された場合のみ変更。

## 実装と検証

1. 最新コードと実際のCodex CLI version、関連Hook／Rule／testを確認する。保護branch判定、Gitのオプション、PowerShell launcherの既存契約を把握する。
2. root固定のPOSIX／PowerShell形式を小さな実行テストで確認し、失敗時にGitが動かないことを証明してからG10を修正する。
3. feature／protected branch、`git -C`、通常push／危険push、cwd不一致を回帰テストに含める。注釈付きtagを持つ**一時local bare remote**で`push.followTags`の副作用も検証する。検証のためにGitHubへpushしない。
4. compact専用Hookと関連テスト・文書を整理する。Codex 0.160.0のschemaと実効設定を照合し、必要な項目だけ修正する。Hook定義を変更した場合はtrust状態を再確認する。
5. `pnpm run test:hooks`、`pnpm run test:contracts`、`pnpm run verify`、関連CIを実行する。可能ならFull Access／Approve for me、Direct `exec_command`／Code Modeのnested `tools.exec_command()`でHook適用を確認する。

## 完了条件

| 検証 | 期待 |
| --- | --- |
| session cwdとtool workdirが異なる変更系Git | コマンド内の安全なroot固定がなければ拒否 |
| canonical root固定＋bare Git | 指定rootで判定。cwd移動失敗後はGitを実行しない |
| 保護branch/ref、force push、削除、一括push | 既存の危険操作拒否が維持される |
| 通常の非保護branch操作 | 不必要な拒否や新しい一律promptがない |
| 暗黙のtag／submodule push | 追加更新が起きる形式を無条件に許可しない |
| compactと`AGENTS.md` | 重複`SessionStart`がなく、ほかのHookに回帰がない |
| Codex 0.160.0設定 | 読み込み可能で、既存の並列数・Role・model設定を維持 |

テスト／CIが成功し、安全上の未解決問題がないことを完了条件とする。実CLIのcompact、承認UI、各tool modeなど実行できない検証は**未検証**と明記し、静的テストだけで実runtime確認済みと報告しない。

## 対象外

他リポジトリのハーネス全体移植、Git／shell汎用parser、新しい承認管理基盤、独自compact復元、既存のRole全面変更は行わない。実装や回帰で問題が起きた場合は当該変更を戻し、force push、branch削除、merge、Issue closeはしない。
