# Codex Full Access 共通Git安全制御 / PreToolUse修復 実装計画

## 0. 目的

Codex を Full Access で使用しても、**明確に危険なGit操作だけはproject共通ポリシーとして拒否する**。

通常のGit作業まで制限しない。

このPlanで扱うのは次の2点だけ。

1. 現在の `PreToolUse` Hook を installed Codex の actual runtime contract に合わせて正常動作させる。
2. Full Accessでも残すべき destructive / history-rewrite 系の共通denyを実装・検証する。

## 1. ゴール

### 許可するもの

危険なoptionや対象でない限り、通常のGit操作は原則として制限しない。

例:

```text
git add
git commit
git push <feature-branch>
git fetch
git switch / checkout
git merge
git cherry-pick
git revert
git stash
git tag
git worktree
```

これらを包括的allowlistで管理しない。

### Full Accessでも拒否するもの

共通denyは、明確に次のいずれかへ該当する操作に限定する。

1. 履歴を書き換える操作
2. 作業中データを強制破棄する操作
3. force push / ref強制更新
4. default/protected branchへの直接更新
5. destructiveなremote/ref/repository操作

## 2. 完了条件

### Hook runtime

- [ ] installed Codex versionを記録する。
- [ ] project `PreToolUse` Hookがloadされる。
- [ ] Hook変更後のtrust / enabled stateを確認する。
- [ ] root cwd / nested cwd / WindowsでHook commandが解決できる。
- [ ] safe caseは `exit 0 / stdout empty / stderr empty` で継続する。
- [ ] deny caseはinstalled runtimeが実際にblockと解釈する形式を返す。
- [ ] malformed input等、Hook内部で検知した安全判定不能ケースはblockする。
- [ ] Hook起動失敗は成功扱いせずverification failureとする。

### Full Access common deny

最低限、次を拒否する。

#### History rewrite / ref rewrite

- [ ] `git reset` family
- [ ] `git rebase` family
- [ ] `git commit --amend`
- [ ] `git push --force`
- [ ] `git push -f`
- [ ] `git push --force-with-lease`
- [ ] force refspec（先頭 `+` 等）
- [ ] `git branch -f`
- [ ] `git tag -f`
- [ ] `git update-ref`
- [ ] `git replace`
- [ ] `git filter-branch`

#### Working tree / data destruction

- [ ] `git clean` family
- [ ] destructive `git restore`（例: working tree変更の破棄）
- [ ] destructive `git checkout`（例:強制破棄系option）
- [ ] `git switch -C`
- [ ] `git switch --discard-changes`
- [ ] local branch削除 (`git branch -d` / `-D`)
- [ ] `git rm`
- [ ] `git stash drop`
- [ ] `git stash clear`
- [ ] `git reflog expire`
- [ ] destructive prune / gc

#### Remote / protected branch

- [ ] default/protected branch上での直接commitを拒否する。
- [ ] default/protected branchへの直接pushを拒否する。
- [ ] pushによるremote branch/tag削除を拒否する。
- [ ] `git push --mirror`
- [ ] destructive remote mutation (`remote remove`, `set-url` 等)

### 通常Git操作の回帰確認

次が common guard によって一律禁止されていないことを確認する。

- [ ] `git add`
- [ ] 通常 `git commit`
- [ ] feature branchへの通常 `git push`
- [ ] `git fetch`
- [ ] 通常branch切替
- [ ] `git merge`
- [ ] `git cherry-pick`
- [ ] `git revert`
- [ ] `git stash`
- [ ] 通常tag操作
- [ ] `git worktree`

ただし、各commandに上記common denyへ該当する危険optionが付く場合は拒否する。

## 3. Safety boundary

### Required local layers

```text
execpolicy
  -> 明確なhigh-risk commandをstatic deny

PreToolUse
  -> protected/default branch等、contextが必要なdeny
  -> static ruleだけでは表現しにくいdangerous option判定

wrapper / verify
  -> unsafe overrideやHook不成立を検知
```

### GitHub Ruleset / Branch Protection

GitHub Ruleset / Branch Protectionは存在する場合の追加防御として扱う。

- このPlanのlocal safety成立条件には数えない。
- Ruleset作成・同期は今回のscope外。
- server-side protectionがあってもlocal guardの代替にはしない。

### PreToolUseの限界

PreToolUse単独を完全なenforcement boundaryとはみなさない。

Hookが観測できない実行経路まで完全監視する仕組みは今回作らない。

そのため、shell / REPL / script実行をFull Accessで包括的に禁止することもしない。

## 4. Protected branch の定義

repository-local common guardでは次をprotected扱いする。

```text
main
master
resolved repository default branch
```

Default branchはlocal `origin/HEAD` 等のread-only metadataから解決する。

解決不能時は最低限 `main` / `master` を保護する。

GitHub Rulesetで追加保護されているbranchを動的取得する仕組みは追加しない。

## 5. Hook修復方針

### 5.1 Installed runtimeを正本にする

実装時の優先順位:

```text
1. installed Codex actual behavior
2. installed versionに対応するofficial OpenAI docs / schema
3. current openai/codex implementation
4. repository legacy implementation
```

Wave 0で次を実測する。

- installed Codex version
- project Hook discovery / trust
- actual `PreToolUse` matcher alias
- shell / apply_patch のactual `tool_input`
- safe output contract
- deny output contract
- Full Access経路でもHookが発火するか
- Full Access経路で観測されるactual `permission_mode`

`permission_mode` の値は事前に固定しない。

### 5.2 Node.jsへ単一化

Canonical implementation:

```text
.codex/hooks/pre_tool_use_policy.mjs
```

- PowerShell / Pythonへpolicy logicを重複させない。
- `.ps1` / `.py` のruntime参照をなくす。
- 旧ファイルは参照ゼロ確認後に削除する。

### 5.3 Tool inputだけを見る

Payload全体をrecursive scanしない。

- shell tool -> actual command fieldだけ解析
- `apply_patch` -> actual patch operationだけ解析
- Markdown / source / fixture本文の危険command文字列はblockしない

`apply_patch` では actual Delete / Move operationだけをdeny対象とし、本文中の同文字列を誤検知しない。

## 6. Git deny policy

### 6.1 基本原則

**allowlist + unknown deny方式にはしない。**

通常Git操作は原則通し、明示したdangerous patternだけをdenyする。

```text
matches common destructive deny
  -> deny

otherwise
  -> Hook common policyではdenyしない
```

### 6.2 Context-sensitive deny

次だけGit context resolverを使う。

- current branchがprotected/default branchか
- push destinationがprotected/default branchか

resolverはHook内部から固定argvのread-only Git commandで実行し、user-provided shell stringを再利用しない。

### 6.3 Shell composition

危険操作をwrapperへ埋め込むだけで回避できないようにする。

最低限、shell commandとして受け取った実行文字列内にcommon deny対象Git commandが含まれる場合はblockする。

ただし、完全なshell parserを作らない。

通常のshell / REPL / one-shot script自体をFull Accessで包括禁止しない。

## 7. execpolicy同期

`.codex/rules/30-destructive-forbidden.rules` から次のblanket forbiddenを外す。

```text
git add
git commit
git push
```

代わりに、staticに表現できる明確なhigh-risk操作だけをforbiddenとして残す / 追加する。

例:

```text
git reset
git rebase
git clean
git rm
git update-ref
git replace
obvious force push
```

protected branchやcurrent branchのようなcontext-sensitive判定はPreToolUseへ寄せる。

safe / auto-net等のpreset役割は今回変更しない。

## 8. テスト

正本:

```text
tests/contracts/codex-pre-tool-use-policy.test.ts
```

### Hook contract

- safe input -> continue
- policy deny -> block
- malformed input -> block
- Hook process失敗をverificationで検知
- Hook変更後のtrust / invocation確認

### Must deny

最低限:

```text
git reset --hard HEAD~1
git reset --soft HEAD~1
git rebase main
git commit --amend -m test
git push --force origin feature/x
git push --force-with-lease origin feature/x
git push origin +feature/x
git clean -fd
git rm file.txt
git branch -D feature/x
git update-ref ...
git remote set-url origin ...
protected/default branch commit
protected/default branch push
```

### Must not blanket deny

最低限:

```text
git add file.txt
git commit -m test
git push origin feature/x
git fetch origin
git switch feature/x
git merge feature/y
git cherry-pick <sha>
git revert <sha>
git stash push
git tag v1.0.0
git worktree add ...
```

### False positive

- Markdownに `git push --force` と記載 -> file edit自体はallow
- test fixtureへdestructive command文字列を保存 -> allow
- normal `apply_patch` Add / Update -> allow
- actual `apply_patch` Delete / Move -> deny

## 9. Real-run acceptance

Production checkoutでdestructive probeを実行しない。

temporary clone + local bare remoteをtest harness側で準備する。

candidate Codex session外でfixtureを構築する。

確認:

### Normal mode

- Hook invocationあり
- `git add` 成功
- 通常commit成功
- feature branch通常push成功
- destructive probeはblock

### Full Access

- ユーザーが実際に使用するFull Access経路で起動
- actual `permission_mode` を記録
- Hook invocationあり
- 通常Git操作成功
- destructive Git probeがtool execution前にblock
- local / remote sentinel stateが不変

Full AccessでHookが発火しない、またはdenyしても実行される場合はBLOCKEDとする。

## 10. 実装Wave

### Wave 0 — Runtime contract確認

- installed Codex version
- Hook discovery / trust
- matcher / input / output contract
- Full Access Hook invocation

このGateが通るまではblanket `git add/commit/push` forbiddenを解除しない。

### Wave 1 — Hook runtime修復

- `.codex/config.toml` をinstalled runtimeへ合わせる
- Node canonical Hook追加
- Windows / nested cwd起動確認
- legacy Hook logic除去

### Wave 2 — Common destructive deny実装

- history rewrite
- force push / forced ref update
- destructive working tree操作
- protected/default branch direct update
- destructive remote/ref操作

通常Git操作のallowlistは作らない。

### Wave 3 — execpolicy同期

- blanket `git add/commit/push`禁止解除
- static high-risk deny維持
- mode-specific rulesとの矛盾除去

### Wave 4 — Tests / verify

- Hook contract tests
- common deny tests
- normal Git regression tests
- false-positive tests
- wrapper / verify同期

### Wave 5 — Real-run

- disposable repositoryでNormal run
- disposable repositoryでactual Full Access run
- destructive operationがblockされることを確認

### Wave 6 — Docs同期

- `AGENTS.md`
- `docs/reference/codex-safety-harness.md`
- `.codex/rules/README.md`
- `.codex/requirements.toml`

実装内容と一致する範囲だけ更新する。

## 11. Non-goals

今回やらないこと:

- 通常Git workflowの設計
- Git commandの包括的allowlist
- unknown Git mutationの一律deny
- clean working tree強制
- stage ownership管理
- `git add`対象path制限
- 1 commit / 1 add制限
- merge / cherry-pick / revert / stash / tag / worktreeの包括禁止
- shell / REPLの包括禁止
- safe / auto-net presetの再設計
- GitHub Ruleset自動同期
- remote URL監査基盤
- 完全shell parser
- arbitrary child processの完全監視

## 12. 最終成功判定

次をすべて満たした場合のみ完了。

```text
PreToolUseがinstalled Codexで正常動作
+
Full Access経路でもHook発火
+
通常 add / commit / feature push がcommon guardで止まらない
+
明確なdestructive/history-rewrite Git操作だけblock
+
default/protected branch直接更新block
+
execpolicyのblanket add/commit/push禁止解除
+
static high-risk deny維持
+
contract tests PASS
+
Normal real-run PASS
+
Full Access destructive probe PASS
+
既存safety docsと実装が一致
```

このPlanの目的は、**Full Accessを実質的に制限モードへ戻すことではなく、Full Accessでも越えてはいけない最小限の破壊的境界だけを残すこと**である。
