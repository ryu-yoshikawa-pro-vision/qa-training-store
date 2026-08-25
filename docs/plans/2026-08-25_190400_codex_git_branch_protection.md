# Issue #60 実装計画: Codex Git branch protection の PreToolUse 強化

## 1. 目的

既存の `.codex/hooks/pre_tool_use_policy.mjs` を最小差分で拡張し、`git -C <path> <subcommand> ...` の形式でも通常のGit invocationと同じG1〜G10／N1〜N4の安全判定を適用する。特に、`-C` が指すrepositoryのbranch contextを使ってprotected/default branchのmutationを判定し、既存安全ガードの迂回を防ぐ。

## 2. 背景

Issue #60では、`git switch -c ... origin/main` は拒否された一方、`git -C . switch -c ... origin/main` は通過する事象が確認された。Git global optionをsubcommandとして誤認する既存のoperation検出が、同じGit operationの判定差を生んでいる。

## 3. 現状実装

- Git operation検出は `getOperationTail()`／`hasOperation()` の正規表現を共通利用している。
- 現在の検出はshell boundary後の `git <subcommand>` を前提とし、subcommand前のGit global optionを正規化していない。
- context未指定時の `getGitCommandContext(cwd)` は、呼び出し時のcwdを対象にbranch、upstream、remote、`origin/HEAD`を取得する。
- `evaluateCommand(command, suppliedContext, cwd)` は、明示contextがあればそれを使い、なければcontextが必要なGit operationだけ実repositoryから取得する。
- Windows launcherはNode Hookへのstdin／stdout／stderr／exit codeのtransportだけを担当しており、今回の主変更対象ではない。
- Contract testはHookのpolicy matrix、明示context、Windows launcherのroot／nested cwd契約を既に持つ。

## 4. 原因

`getOperationTail()` と `needsGitContext()` が `git` の直後に対象operationがある場合だけ一致するため、`git -C <path> commit` などではoperation検出とcontext取得の両方が行われない。結果として、危険operationのdeny判定およびprotected branch判定を迂回できる。

## 5. 変更対象

### 変更するファイル

- `.codex/hooks/pre_tool_use_policy.mjs`
  - Git invocationのglobal optionとsubcommandを共通解析する。
  - `-C` のeffective repository pathをcontext取得へ渡す。
  - 既存operation評価関数へ正規化済みtailを供給する。
- `tests/contracts/codex-hook-contract.test.ts`
  - `git -C` variantのmatrix同値性を追加する。
  - protected branch／feature branchのeffective repository fixtureを追加する。
  - quoted path、shell chaining、指定されたdeny／allow回帰を確認する。
- `docs/reference/codex-safety-harness.md`
  - Git global optionを挟んでも同一operationのpolicyを迂回できない実装契約を短く追記する。
- `docs/PROJECT_CONTEXT.md`、`docs/history/`
  - living documentの実装理解と変更履歴を同期する。

### 原則変更しないファイル

- `.codex/hooks/pre_tool_use_policy_windows.ps1`
- `.codex/config.toml`
- `package.json`
- `pnpm-lock.yaml`
- `.codex/rules/**`
- `scripts/codex-safe.*`、`scripts/codex-task.*`
- `AGENTS.md`、`docs/reference/git-branch-safety.md`

## 6. 実装方法

1. 既存のshell boundary検出を維持し、`git` invocation単位の小さなtoken解析を追加する。引用符付きtokenを扱い、最低限 `-C <path>`（および同形式の短縮値）を読み飛ばして、最初の実subcommandとoperation argumentsを取得する。完全なGit CLI parserやshell parserは実装しない。
2. `getOperationTail()`／`hasOperation()` と `needsGitContext()` を共通解析結果へ接続し、通常形式と`git -C`形式で既存のoperation evaluatorを共有する。
3. context未指定時は、context対象のGit invocationに`-C`があれば、そのpathを現在の実行cwdから解決して `getGitCommandContext()`へ渡す。明示された`suppliedContext`は既存契約どおりテスト／呼び出し側のcontextとして優先する。
4. `main`／`master`／`origin/HEAD`由来のdefault branch、force push、reset、clean、branch delete、protected branch mutation、recovery operation、feature branchの通常操作の既存semanticsは変更しない。
5. テストでは危険Git commandを実行せず、Hookまたは`evaluateCommand()`の判定だけを検証する。temporary Git fixtureのbranch symbolic-refとread-only context取得だけを使う。

## 7. テスト方法

- 既存 `POLICY_MATRIX` からGit commandを選び、`git`直後へ`-C .`を挿入したvariantの判定が通常形式と一致することをdata-drivenに確認する。
- `git -C .` のprotected branch上commit／merge／cherry-pick、state-changing rebase、protected push、force push、reset、clean、branch deleteをDENYで確認する。
- `status`、`log`、`diff`、`fetch`、`branch --show-current`、`switch main`、feature branch上の通常commit／pushをALLOWで確認する。
- `repo A`から別の`repo B`へ`git -C ...`するfixtureで、BがmainならDENY、Bがfeature branchならALLOWとなることを確認する。
- 空白を含むquoted `-C` pathを確認する。
- `echo ok; git -C . reset --hard HEAD`等のshell chainingをDENYで確認する。
- Windows launcher契約は既存contract testを実行し、launcher本体は変更しない。

## 8. 変更しないもの / 対象外

- PR branch mismatchのstate manager、expected branchの永続管理、branch/worktree manager、独自Git wrapper。
- sandbox、approval、permission model、Codex wrapper、GitHub Ruleset／branch protectionの変更。
- `#63`の未merge変更、依存関係、framework、lockfile、既存のWindows transport実装。
- 実際の`git reset --hard`、`git clean -fd`、`git branch -D`、force push、protected branchへのpush、protected branch上のcommit。

## 9. リスク

- token解析が既存のshell chainingや引用符付き引数を壊す可能性があるため、既存boundaryを保ち、quoted pathとchainingをcontract testで固定する。
- `-C` path解決を誤ると別repositoryのbranch contextを誤判定するため、A/B fixtureでeffective repositoryを検証する。
- global optionを過剰に解析するとGit CLI parser化するため、対象はsubcommand前の小さな正規化に限定する。

## 10. rollback plan

実装commitをrevert可能なcommitとして作成し、必要な場合は実装commitだけをrevertする。Run Artifactの完了記録はdocs-onlyの後続commitへ分離する。作業中は`main`の履歴変更、force push、reset、clean、branch削除を行わない。

## 11. 完了条件

- `git -C <path>` の有無で同一operationのDENY／ALLOW結果が一致する。
- `-C` が指すrepositoryのbranch contextでprotected/default branch判定が行われる。
- Issue #60のDENY／ALLOW、quoted path、shell chaining、Windows launcher契約がcontract testで確認できる。
- 指定されたfocused contract、全contracts、format、lint、typecheck、統一verifyを実行し、結果を記録する。
- 差分をself-reviewし、unrelated change、依存追加、#63変更混入がないことを確認する。
- 指定branchでcommit、明示refspec push、base `main`のOPEN日本語PR作成、PR作成後のbranch／diff／metadata最終確認を完了する。PRはmergeしない。

## 12. Open questions

- なし。Issue本文と既存repository contractで目的、scope、完了判定、検証方法が確定している。
