# Codex Git安全制御 / PreToolUse修復 実装計画

## 0. 依頼概要

- 依頼内容:
  - Codex が通常の Git 作業を安全な範囲で自律実行できるようにする。
  - `git add` / 通常 `git commit` / feature branch への通常 `git push` 等は実行可能にする。
  - 履歴改ざん、未コミット変更の強制破棄、force push、default branch への直接更新等は、Full Access を含めて共通で禁止する。
  - 現在失敗している可能性が高い `PreToolUse` hook を、installed Codex の実Runtime contract に合わせて修復する。
- 背景:
  - 現在は `.codex/rules/30-destructive-forbidden.rules` と `.codex/hooks/pre_tool_use_policy.*` が `git add` / `git commit` / `git push` を一律禁止しており、通常の前進 Git workflow まで止めている。
  - 一方で、Full Access 時にも残したい安全境界は「Git mutation 全般の禁止」ではなく、「履歴破壊・作業状態破棄・default branch 直接更新・危険な remote/ref 操作等の禁止」である。
  - 現在の `PreToolUse` hook は input / output contract と不整合があり、さらに Hook failure 自体を Codex runtime が常に fail-close する保証もないため、PreToolUse 単独を唯一の強制境界にはしない。
- 期待成果:
  - 通常の feature branch workflow は Codex が完走できる。
  - Full Access でも destructive Git operation は複数層の common guard で拒否される。
  - `PreToolUse` が正常に起動・判定・deny できることを contract test と real run で証明する。
  - execpolicy / PreToolUse / wrapper / GitHub server-side protection の責務が明確になる。
  - 未列挙の Git mutation を実装者がその場で判断しない、deny-by-default のポリシーになる。

## 1. ゴール / 完了条件

### ゴール

Codex の Git 操作を「mutation かどうか」ではなく、「明示的に許可した安全な前進操作か、それ以外か」で分類する。

初版は **allowlist + deny-by-default** とし、AI が自律実行できる Git mutation を必要最小限に限定する。

```text
Read-only Git command
  -> allow

明示的に定義した Safe Forward Mutation
  -> 条件を満たす場合のみ allow

それ以外の Git mutation
  -> deny
```

安全境界は単一機構へ依存せず、次の多層構成とする。

```text
Static high-risk deny     -> execpolicy
Context-sensitive deny    -> PreToolUse
Unsafe Codex launch deny  -> wrapper
Server-side final guard   -> GitHub Ruleset / Branch Protection
```

PreToolUse は Full Access を含む project-level semantic guard として使うが、Hook process failure / invalid output / unsupported execution path があり得るため、**PreToolUse 単独を完全な enforcement boundary または唯一の SSOT とみなさない**。

### 完了条件（DoD）

- [ ] installed Codex version と actual hook contract を実測し、実装対象versionをRun Artifactへ記録する。
- [ ] `.codex/config.toml` が installed Codex で有効な hook feature / hook registration を使用する。
- [ ] safe PreToolUse case は exit `0` / stdout empty で完了し、invalid output にならない。
- [ ] deny PreToolUse case は installed Codex が実際に block と解釈する形式で返る。
- [ ] Hook が payload を受信した後の malformed / unknown safety-sensitive input は fail-open にせず、blocking result を返す。
- [ ] Hook process 自体の起動失敗は PreToolUse だけでは防げないことを前提に、static high-risk deny が execpolicy に残る。
- [ ] `git add -- <explicit-path>...` が feature branch で許可される。
- [ ] `git commit -m <message>` が feature branch で許可される。
- [ ] `git push origin <current-branch>` が safe push contract を満たす場合に許可される。
- [ ] `git push -u origin <current-branch>` / `git push --set-upstream origin <current-branch>` が safe push contract を満たす場合に許可される。
- [ ] bare `git push` は初版では許可しない。
- [ ] default branch / `main` / `master` 上での通常 commit が共通ポリシーで拒否される。
- [ ] default branch / `main` / `master` への直接 push が共通ポリシーで拒否される。
- [ ] `git reset` family が拒否される。
- [ ] `git rebase` family が拒否される。
- [ ] `git commit --amend` が拒否される。
- [ ] `git push --force` / `-f` / `--force-with-lease` / force refspec が拒否される。
- [ ] `git clean` / destructive restore / checkout / forced branch replacement / branch deletion / remote mutation / direct ref mutation が拒否される。
- [ ] shell wrapper / compound command に埋め込んだ Git mutation で allowlist を迂回できない。
- [ ] 未列挙の Git mutation（例: `cherry-pick`, `revert`, `stash`, `tag`, `worktree`, `submodule` 等）は初版では deny される。
- [ ] command-based file deletion / remote script execution 等、既存の非Git destructive guard が維持される。
- [ ] `apply_patch` の削除 / rename / move guard が、本文文字列の誤検知を起こさず維持される。
- [ ] Hook contract / Git policy / false-positive / malformed input の contract test が追加される。
- [ ] `scripts/codex-safe.ps1` / `.sh` の preflight が新ポリシーへ同期される。
- [ ] `scripts/verify` / `scripts/verify.ps1` が execpolicy と PreToolUse contract の双方を検証する。
- [ ] Normal permission mode の実Runが成功する。
- [ ] Full Access Acceptance Run では Hook input の `permission_mode == "bypassPermissions"` をEvidenceとして確認する。
- [ ] `permission_mode == "bypassPermissions"` の実Runで destructive probe が tool execution 前に deny される。
- [ ] destructive real-run は production checkout ではなく temporary clone + local bare remote で行い、deny 後の sentinel state が不変である。
- [ ] Windows で required verification を実行する。
- [ ] macOS / Linux は利用可能環境で同じ cross-platform contract を確認する。未確認なら未確認と明記する。
- [ ] `AGENTS.md` / safety reference / rules README / requirements の記述が実装と一致する。
- [ ] `bash scripts/verify` と PowerShell 側 verify が利用可能環境で成功する。

## 2. 現状理解と前提

### Current understanding

#### 2.1 現在の Git 制御

- `.codex/rules/10-readonly-allow.rules` は `git status` / `git diff` / `git log` / `git show` を allow している。
- `.codex/rules/20-risky-prompt.rules` は `git checkout` / `switch` / `merge` / `rebase` / `tag` を prompt としている。
- `.codex/rules/30-destructive-forbidden.rules` は `git reset --hard` / `git clean -fdx` / force push / `git add` / `git commit` / `git push` / `git rm` 等を forbidden にしている。
- `.codex/rules-auto-net/20-auto-net-risky-forbidden.rules` は non-interactive mode で `checkout` / `switch` / `merge` / `rebase` / `tag` を一律 forbidden としている。
- `.codex/hooks/pre_tool_use_policy.ps1` / `.py` も `git add|commit|push|rm` を一律 block している。

#### 2.2 現在の PreToolUse 設定

`.codex/config.toml` は現在、旧 hook feature key と `pwsh` 固定の PreToolUse command を持つ。

問題:

1. Hook runtime が `pwsh` に固定されており、repository の cross-platform contract と一致しない。
2. PowerShell 版と Python 版に safety logic が重複している。
3. Hook feature / hook schema は installed Codex と再照合が必要である。
4. Current Hook output は safe / deny の wire contract と不整合を起こす可能性がある。

#### 2.3 Hook output の重要な性質

現行実装は safe 時に explicit allow JSON を返しているが、初版修復では safe result を次に固定する。

```text
exit code: 0
stdout: empty
stderr: empty
```

deny result は installed Codex で有効な block contract を使用する。

また、Codex Hook engine は Hook process failure / invalid JSON を必ず fail-close にするとは限らない。よって:

- static に表現できる high-risk command は execpolicy でも forbidden を維持する。
- Hook が payload を正常に受信した後に parser / policy が異常を検出した場合は blocking result を返す。
- Hook process 自体が起動不能なケースは real-run / verification で検出し、guard 完成扱いにしない。

#### 2.4 Hook input

PreToolUse input の主要 contract は以下を前提とする。

- `hook_event_name`
- `permission_mode`
- `tool_name`
- `tool_input`
- `cwd`
- session / turn metadata

Shell-like tool は実行 command を `tool_input` に持つ。`apply_patch` も実際の patch command を input として受けるため、source本文全体を無差別scanせず、`tool_name` に応じた実行入力だけを解析する。

#### 2.5 Hook failure / malformed input

Hook script内部で JSON parse failure、required field欠落、unexpected safety-sensitive shape を検出した場合は、初版では fail-close とする。

実装 contract:

```text
Known safe input
  -> exit 0 / no output

Known deny input
  -> valid deny output

Malformed / unknown safety-sensitive input
  -> blocking result

Hook executable not found / process crash
  -> runtime側ではfail-closeを期待しない
  -> verification failure + static execpolicy guardで補完
```

#### 2.6 Wrapper / verification

- `scripts/codex-safe.ps1` / `.sh` は project execpolicy rule を読み、起動前 preflight を行う。
- 現在の preflight は `git add . => forbidden` を期待しているため更新が必要である。
- verification は execpolicy の確認が中心で、PreToolUse stdin/stdout contract / actual runtime enforcement を十分なGateとして固定できていない。

### Assumptions

- Repository workflow は `main` / default branch を直接commit/pushせず、feature branch -> push -> PR -> merge を基本とする。
- Local common guard が「protected扱い」するbranch setは GitHub Ruleset全体ではなく、次の **Local Protected Branch Set** とする。
  1. `main`
  2. `master`
  3. local `origin/HEAD` 等から解決できた repository default branch
- GitHub Rulesetで追加保護されている `release/*` 等の取得・同期は今回のNon-goalとし、server-side protectionの責務とする。
- Hook runtime は repository で既に必須の Node.js を canonical runtime とする。
- Full Access protection は推測せず、`permission_mode == "bypassPermissions"` のactual input evidenceで成立判定する。

### Non-goals

- GitHub Ruleset / Branch Protection を repository-local Hook で置き換えること。
- GitHub APIから全protected branch rulesetを取得すること。
- rebase / amend / force push を安全化して許可すること。
- bare `git push` を初版で安全化すること。
- `git pull` / `merge` / `cherry-pick` / `revert` / `stash` / `tag` / `worktree` / `submodule` 等を初版の自律mutationへ含めること。
- arbitrary remote / arbitrary refspec push を許可すること。
- shell command 全体を完全に解釈する独自shell parserを構築すること。
- Codex本体のHook engine bugをrepository側でmonkey patchすること。
- Product code / Web / Native behaviorを変更すること。

## 3. 質問 / 曖昧性

### 必ず質問する不透明点

現時点で owner decision を必要とする blocker はない。

合意済み:

- safe Git add / commit / feature push は許可する。
- history rewrite / destructive operation は Full Access でも禁止する。
- PreToolUse の不具合も同じ変更で修正する。
- profile 固有ではなく project common policy として扱う。

### 仮定してよい細部

- deny reason の具体文言。
- temporary directory 名。
- test helper の内部関数名。

### 未回答の重要質問

- なし。

Runtime capability question は owner question とせず Wave 0 で実測する。

## 4. 影響範囲

### Entry points

- `.codex/config.toml`
- `.codex/hooks/pre_tool_use_policy.ps1`
- `.codex/hooks/pre_tool_use_policy.py`
- 新 canonical Node Hook
- `.codex/rules/*.rules`
- `.codex/rules-auto-net/*.rules`
- `scripts/codex-safe.ps1`
- `scripts/codex-safe.sh`
- `scripts/verify`
- `scripts/verify.ps1`
- `tests/contracts/`
- `AGENTS.md`
- `.codex/rules/README.md`
- `.codex/requirements.toml`
- `docs/reference/codex-safety-harness.md`

### Main flow

```text
Codex tool request
    |
    +-> execpolicy static check
    |      +-> known high-risk prefix -> forbidden
    |
    +-> PreToolUse
           |
           +-> tool_name / tool_input extraction
           +-> common semantic policy
           +-> Git context resolution when required
           |
           +-> safe -> exit 0 / stdout empty
           +-> deny -> blocking result

GitHub remote
    +-> Ruleset / Branch Protection as final server-side guard
```

### Key abstractions

1. Hook wire adapter
   - stdin parsing / output building のみを担当する。
2. Tool input extractor
   - `tool_name` ごとに execution payload だけを取り出す。
3. Common command classifier
   - pure function として allow / deny / context-required を返す。
4. Git context resolver
   - current branch / Local Protected Branch Set 等を read-only Git command で解決する。
5. Safe Git grammar
   - add / commit / push / switch / fetch の許可構文を明示する。
6. Execpolicy static deny
   - Hook failure時にも残す high-risk prefix deny。
7. Real-run acceptance harness
   - temporary clone + local bare remote で actual enforcement を確認する。

### Safe change surface

- Codex development harness / repository safety policy のみ。
- Product code / product tests / application runtime には触れない。
- Git history migration は行わない。
- Existing `safe` / `readonly` / `auto-net` profile 自体を新profileへ置換しない。

### Files to inspect / expected change candidates

必須候補:

- `.codex/config.toml`
- `.codex/hooks/pre_tool_use_policy.ps1`
- `.codex/hooks/pre_tool_use_policy.py`
- `.codex/rules/10-readonly-allow.rules`
- `.codex/rules/20-risky-prompt.rules`
- `.codex/rules/30-destructive-forbidden.rules`
- `.codex/rules-auto-net/20-auto-net-risky-forbidden.rules`
- `.codex/rules-auto-net/30-auto-net-forbidden.rules`
- `.codex/rules/README.md`
- `scripts/codex-safe.ps1`
- `scripts/codex-safe.sh`
- `scripts/verify`
- `scripts/verify.ps1`
- `docs/reference/codex-safety-harness.md`
- `AGENTS.md`
- `.codex/requirements.toml`

新規想定:

- `.codex/hooks/pre_tool_use_policy.mjs`
- `tests/contracts/codex-pre-tool-use-policy.test.ts`

## 5. 変更方針

### Wave 0 — Installed runtime / contract rebaseline

目的:

`openai/codex main` をそのまま実装仕様とせず、実際に使用する installed Codex を最優先で固定する。

Reference priority:

```text
1. Installed Codex actual runtime behavior
2. Installed versionに対応するofficial schema / docs / release contract
3. Current openai/codex main
4. Repository legacy implementation
```

実施:

1. `codex --version` 等でinstalled versionを記録する。
2. `.codex/config.toml` がloadされていることを確認する。
3. project hook trust / hook enabled state を確認する。
4. installed runtime の PreToolUse safe / deny behaviorを harmless diagnostic hook で確認する。
5. `tool_name` / `tool_input` shape を以下で記録する。
   - shell command
   - `apply_patch`
   - file edit/write path（該当toolが存在する場合）
6. `permission_mode` をNormal modeとFull Access modeで記録する。
7. Full Access Acceptance Run は `permission_mode == "bypassPermissions"` が観測できた場合だけ成立とする。

Gate:

- project Hook がloadされない -> BLOCKED。
- Full Access runでHookが発火しない -> BLOCKED。
- Full Access相当と称したrunで `permission_mode != "bypassPermissions"` -> Full Access evidenceとして無効。
- BLOCKEDの場合、Git blanket banを解除して完了扱いにしない。

### Wave 1 — Hook registration / runtime を修復

1. installed versionが受理する current hook feature key へ更新する。
2. canonical runtimeをNode.jsへ統一する。
3. Hook commandは repository root からの起動を正本とする。
4. Existing wrappers が repository root を解決してからCodexを起動することを確認する。
5. repository subdirectoryから直接Codexを起動した場合もHook command pathが解決できるか実測する。
6. nested cwdで解決できない場合、実装者判断で放置せず次のGateに従う。
   - cross-platformでrepository rootを解決できるlauncherへ変更する、または
   - direct nested-cwd起動をunsupportedとして検出・拒否する。
7. matcherは broad content scan を目的にせず、shell / patch / edit execution familyだけを対象とする。
8. actual matcher alias は Wave 0 evidence に合わせて固定する。

Gate:

- Windows / repo root でHook smoke PASS。
- nested cwdをsupportedとする場合は nested cwd smoke PASS。

### Wave 2 — Canonical Hook を Node.js 1本へ単一化

Canonical implementation:

```text
.codex/hooks/pre_tool_use_policy.mjs
```

Policy logicを `.ps1` / `.py` に残さない。

Safe output:

```text
exit 0
stdout empty
stderr empty
```

Deny output:

- installed Codex がblockと解釈する current contractのみ使用する。
- schema外fieldを返さない。
- non-empty reason必須。

Malformed / unknown safety-sensitive input:

- Hook script内で検出できた場合は blocking result。
- top-level例外もcatchし、可能な限りblocking resultとして終了する。
- Hook executable自体が起動不能なケースはexecpolicy / verificationで検知する。

Legacy implementation migration:

1. Node canonical implementationを追加する。
2. configをNode implementationへ切り替える。
3. contract test / real-run PASSを確認する。
4. `.ps1` / `.py` の参照がゼロであることを検索確認する。
5. 旧Hookファイルは今回の明示scopeとしてreviewable patchで削除する。
6. 削除を repository policy が許可しない実行環境では、policy logicを持たないdeprecated shimへ縮退し、follow-upではなく本PR内で参照ゼロを保証する。

### Wave 3 — Tool-specific extraction

Payload全体のrecursive string scanを廃止する。

#### Shell tool

- 実行command fieldだけを解析する。
- source / Markdown / fixture本文を解析しない。

#### `apply_patch`

- `tool_input` 内の実patch commandだけを解析する。
- 以下のoperation markerを削除 / rename / move判定へ使用する。
  - `*** Delete File:`
  - rename / move equivalent marker
  - `deleted file mode`
  - current actual patch grammarで確認できたdelete/rename marker
- patch本文に `git push --force` 等の文字列が含まれるだけではdenyしない。

#### Edit / Write

- 通常のcontent editは許可する。
- file deletion / rename semanticsを持つtool input shapeが実Runtimeで存在する場合だけ専用extractorを実装する。
- unknown safety-sensitive shapeはallow推測せずdenyする。

必須 false-positive test:

- Markdownに `git push --force is forbidden` と書く -> allow。
- Test fixtureに `rm -rf` を文字列として保存 -> allow。
- apply_patch本文に危険command例を書く -> allow。
- shell実行commandとして同じ文字列を実行 -> deny。

### Wave 4 — Git policy を allowlist + deny-by-default へ変更

#### 4.1 基本原則

Git mutationは次のallowlistに入るものだけ許可する。

**未列挙の Git mutation はすべて deny。**

これにより実装者は `cherry-pick` / `revert` / `stash` 等を個別判断しない。

#### 4.2 Read-only Git

少なくとも次はCommon Hookで禁止しない。

- `git status`
- `git diff`
- `git log`
- `git show`
- `git rev-parse`
- `git branch --show-current`
- `git branch --list`
- `git remote -v`
- context resolverが内部的に使用するread-only command

#### 4.3 Safe Forward Mutation — `fetch`

許可:

```bash
git fetch origin
```

初版では arbitrary remote fetch を自律許可しない。

#### 4.4 Safe Forward Mutation — `switch`

許可:

```bash
git switch <existing-branch>
git switch -c <new-branch>
```

制約:

- `-C` 禁止。
- `--discard-changes` 禁止。
- `--orphan` 禁止。
- `checkout` familyは初版ではdeny。
- `switch -c` はcurrent HEADからのbranch作成だけをv1 allowとし、任意start-point指定はdeny。
- `new-branch` が Local Protected Branch Set に一致する場合はdeny。

#### 4.5 Safe Forward Mutation — `add`

許可grammar:

```bash
git add -- <repo-relative-path> [<repo-relative-path> ...]
```

許可しない:

- `git add .`
- `git add -A`
- `git add --all`
- `git add -u`
- `git add --update`
- `git add -f`
- `git add --force`
- pathspec magic / wildcard を使う broad stage

Path contract:

- pathはrepo root配下。
- literal explicit pathのみ。
- file / directoryのどちらでもよいが、`.` でrepository全体を示す形は禁止する。
- commit前に `git diff --cached` をvalidation workflowへ含める。

#### 4.6 Safe Forward Mutation — `commit`

許可grammar:

```bash
git commit -m <message>
git commit -m <subject> -m <body>
```

許可しない:

- `--amend`
- `-a` / `--all`
- `--no-verify`
- `--fixup`
- `--squash`
- path-limited commit
- reuse / reset-author 等、初版allowlist外option

Context condition:

- current branch が Local Protected Branch Set -> deny。
- detached HEAD -> deny。

#### 4.7 Safe Forward Mutation — `push`

bare `git push` は初版ではdenyする。

許可grammarは次だけ。

```bash
git push origin <current-branch>
git push -u origin <current-branch>
git push --set-upstream origin <current-branch>
```

Safe push conditions:

```text
remote == origin
source branch == current local branch
destination branch == current local branch
current branch not in Local Protected Branch Set
no custom refspec
no force
no force-with-lease
no delete
no mirror
no prune
no tags publication
no leading + refspec
```

拒否例:

```bash
git push
git push origin HEAD:main
git push origin feature:other
git push origin +feature
git push --force origin feature
git push --force-with-lease origin feature
git push --delete origin feature
git push origin :feature
git push --mirror
git push --tags
```

#### 4.8 Local Protected Branch Set

Local common guardで保護するbranchは次のunion。

```text
main
master
resolved repository default branch from local origin metadata
```

これはGitHub Rulesetの全branchを意味しない。

追加Ruleset対象branchはserver-side responsibilityとし、GitHub API fetchを今回のHookへ追加しない。

#### 4.9 共通禁止 — history / ref rewrite

Static execpolicy + PreToolUse の双方で、表現可能な範囲を重ねて守る。

- `git reset` family 全体
- `git rebase` family 全体
- `git commit --amend`
- `git push --force`
- `git push -f`
- `git push --force-with-lease`
- force refspec
- `git branch -f`
- `git tag -f`
- `git update-ref`
- `git replace`
- `git filter-branch`

#### 4.10 共通禁止 — data loss / destructive working tree

- `git clean` family
- `git restore` family
- `git checkout` family
- `git switch -C`
- `git switch --discard-changes`
- `git switch --orphan`
- `git branch -d`
- `git branch -D`
- `git stash drop`
- `git stash clear`
- `git reflog expire`
- aggressive/destructive `git gc` / prune
- `git rm`

#### 4.11 共通禁止 — remote / repository config mutation

- `git remote add`
- `git remote set-url`
- `git remote remove`
- `git config` mutation
- arbitrary destination refspec
- branch/tag delete push

#### 4.12 未列挙 mutation の扱い

初版では以下を含め **deny**。

- `git merge`
- `git cherry-pick`
- `git revert`
- `git stash push/apply/pop`
- `git tag` create/delete
- `git worktree add/remove`
- `git submodule` mutation
- `git notes` mutation
- `git sparse-checkout` mutation
- `git maintenance` mutation

必要になったoperationは後続で個別contract + testsを追加してallowlistへ昇格する。

### Wave 5 — Shell composition / wrapper bypass を閉じる

Safe Git mutationとして許可するのは **single direct Git invocation** のみ。

許可例:

```bash
git add -- app/file.ts
git commit -m "fix: example"
git push origin feature/example
```

Git mutationを含む次の形はcommon deny:

```bash
bash -c 'git ...'
sh -lc 'git ...'
pwsh -Command 'git ...'
powershell -Command 'git ...'
cmd /c "git ..."
git ... && ...
git ... ; ...
git ... | ...
<command> && git ...
```

理由:

- shell grammar全体を独自parseしない。
- allowlisted mutationの判定対象を一意にする。
- Full Accessでwrapper経由の迂回を許さない。

Read-only command compositionの扱いはexisting mode-specific execpolicyに任せるが、destructive patternは既存common guardを維持する。

### Wave 6 — execpolicy を layered safety model へ同期

原則:

```text
execpolicy
  = Hook failure時にも残す static high-risk deny
  + mode-specific prompt/allow

PreToolUse
  = context-sensitive semantic deny
  + allowlisted Git mutation grammar
```

実施:

1. `.codex/rules/30-destructive-forbidden.rules` から blanket `git add|commit|push` forbidden を外す。
2. 次はexecpolicy forbiddenに残す / 追加する。
   - `git reset`
   - `git rebase`
   - obvious force push
   - `git clean`
   - `git rm`
   - `git update-ref`
   - `git replace`
   - その他prefixで安全に表現できるhigh-risk operation
3. protected branch / current branch / safe refspec はHookで判断する。
4. `20-risky-prompt.rules` は safe preset のapproval UXとして必要なものだけ維持する。
5. auto-netもsafe forward Git operationをblanket forbidしないが、allowlist外mutationは共通Hookまたはauto-net static denyで拒否する。
6. execpolicyとHookで複雑なGit grammar parserを二重実装しない。

### Wave 7 — Contract tests / wrapper preflight

新規test正本:

```text
tests/contracts/codex-pre-tool-use-policy.test.ts
```

可能な限りpolicy classifierをpure function化し、Node child processによるstdin/stdout contract testとpure policy testを分ける。

#### Wire contract

- safe input -> exit 0 / stdout empty
- deny input -> valid blocking contract
- deny reason empty -> test failure
- malformed JSON -> blocking behavior
- missing `tool_name` / `tool_input` -> blocking behavior
- unknown safety-sensitive shell input -> blocking behavior

#### Git allow

- `git fetch origin`
- `git switch feature/x`
- `git switch -c feature/x`
- `git add -- app/file.ts`
- `git add -- app/a.ts tests/a.test.ts`
- feature branch `git commit -m test`
- feature branch `git commit -m subject -m body`
- `git push origin <current-branch>`
- `git push -u origin <current-branch>`
- `git push --set-upstream origin <current-branch>`

#### Git deny

- `git add .`
- `git add -A`
- `git commit -a -m test`
- `git commit --amend`
- `git commit --no-verify -m test`
- default branch commit
- detached HEAD commit
- bare `git push`
- `git push origin HEAD:main`
- `git push origin feature:other`
- force / force-with-lease / delete / mirror / tags
- `git reset --soft`
- `git reset --mixed`
- `git reset --hard`
- `git rebase`
- `git restore`
- `git checkout`
- `git branch -D`
- `git remote set-url`
- `git cherry-pick`
- `git revert`
- `git stash pop`
- `git tag v1`
- `git worktree add ...`

#### Shell bypass deny

- `bash -c 'git push --force ...'`
- `pwsh -Command 'git reset --hard ...'`
- `cmd /c "git rebase main"`
- `git status && git push origin feature/x`
- `echo ok; git commit -m test`

#### False-positive

- Markdown contentに destructive command文字列 -> allow
- source/test fixture contentに destructive command文字列 -> allow
- apply_patch本文の説明文に destructive command文字列 -> allow
- actual delete/rename patch -> deny

#### Wrapper preflight

旧:

```text
git add . -> forbidden
```

新:

```text
git status -> allow
git reset --hard HEAD -> forbidden
git rebase main -> forbidden
git push --force origin feature/x -> forbidden
```

Context-dependent safe add/commit/pushはexecpolicyだけで完全判定しないため、Hook contract testで正本化する。

### Wave 8 — Real-run acceptance

#### 8.1 Test environment

Production checkoutではdestructive negative testを実行しない。

毎回次を作る。

```text
Temporary directory
  |- source-clone/       # disposable working clone
  `- origin.git/         # local bare remote
```

Setup:

1. current repositoryからtemporary cloneを作る。
2. local bare remoteを作る。
3. temporary cloneの`origin`をlocal bare remoteへ向ける。
4. `main`相当branchと`feature/hook-acceptance`を作る。
5. dirty tracked file / current commit SHA / branch name / bare remote ref SHAをsentinelとして記録する。

#### 8.2 Normal mode

確認:

1. Hook invocation evidenceあり。
2. safe edit成功。
3. explicit `git add -- <path>` がblockされない。
4. feature commitがblockされない。
5. explicit feature pushがblockされない。
6. destructive probeはdeny。

#### 8.3 Full Access mode

成立条件:

```text
PreToolUse input permission_mode == "bypassPermissions"
```

これが観測できないrunはFull Access証明に使わない。

Negative probe例:

- `git reset --hard <known-commit>`
- `git push --force origin feature/hook-acceptance`
- `git push origin HEAD:main`

各probeで確認:

```text
Hook status == blocked
command side effect == 0
working tree sentinel == unchanged（該当probe）
local branch SHA == unchanged（該当probe）
remote ref SHA == unchanged（push probe）
```

Hookが発火しない / failed onlyでcommandが実行される / stateが変化する場合:

- FAIL / BLOCKED。
- Git blanket banを解除したまま完了扱いにしない。
- repository-local common guardだけでは要件未達として報告する。

### Wave 9 — Verification integration

`scripts/verify` / `scripts/verify.ps1` へ最低限次を統合する。

- Hook source existence
- Hook config registration
- Node Hook contract tests
- execpolicy smoke
- Bash / PowerShell wrapper preflight
- repository contract test

Required local verification:

```text
pnpm run format:check
pnpm run lint:markdown
pnpm run lint
pnpm run typecheck
pnpm run test:contracts
bash scripts/verify
PowerShell scripts/verify.ps1
git diff --check
```

既存verifyが上記を包含する場合は重複実行を減らしてよいが、Hook contract testが最終verifyから到達可能であることは必須。

### Wave 10 — Documentation / governance sync

更新:

- `AGENTS.md`
- `docs/reference/codex-safety-harness.md`
- `.codex/rules/README.md`
- `.codex/requirements.toml`
- 必要な場合のみ `docs/PROJECT_CONTEXT.md`

明文化:

- safe forward Git workflowのexact allowlist。
- 未列挙Git mutationはdeny。
- default branch local commit / direct pushは禁止。
- bare pushはv1 deny。
- shell composition内のGit mutationは禁止。
- execpolicy / PreToolUse / wrapper / GitHub protectionの責務分離。
- PreToolUse failureを安全成功と扱わない。
- Full Access evidenceは `permission_mode == "bypassPermissions"` を必要とする。
- Full Accessはproject common policy無効を意味しない。

### 実行タスク

- [ ] 1. Installed Codex version / trust / hook stateを記録する。
- [ ] 2. Actual PreToolUse shell / patch input shapeを記録する。
- [ ] 3. Normal / Full Accessでpermission modeを記録する。
- [ ] 4. Hook config / runtimeをcurrent installed contractへ移行する。
- [ ] 5. Node canonical Hookを追加する。
- [ ] 6. safe / deny / malformed wire behaviorを実装する。
- [ ] 7. tool-specific extractionを実装する。
- [ ] 8. Git allowlist / deny-by-default classifierを実装する。
- [ ] 9. Local Protected Branch Set resolverを実装する。
- [ ] 10. exact add grammarを実装する。
- [ ] 11. exact commit grammarを実装する。
- [ ] 12. exact push grammarを実装する。
- [ ] 13. shell composition bypassを拒否する。
- [ ] 14. static execpolicy high-risk denyを更新する。
- [ ] 15. auto-net rulesを整合させる。
- [ ] 16. Hook contract testsを追加する。
- [ ] 17. wrapper preflightを更新する。
- [ ] 18. verify entry pointへ統合する。
- [ ] 19. temporary clone + bare remote acceptance harnessを準備する。
- [ ] 20. Normal real-runを実行する。
- [ ] 21. `bypassPermissions` Full Access real-runを実行する。
- [ ] 22. Windows required verificationを実行する。
- [ ] 23. 利用可能ならmacOS / Linux verificationを実行する。
- [ ] 24. legacy PS1/Python hook参照をゼロにする。
- [ ] 25. safety docs / AGENTS / requirementsを同期する。
- [ ] 26. final diff / required validationを実行する。

## 6. 検証方法

### A. Installed runtime / config

- Codex version evidence
- project Hook discovery
- trust state
- matcher discovery
- Normal / `bypassPermissions` invocation evidence

### B. Static execpolicy

最低限:

```text
git status
git reset --soft HEAD~1
git reset --hard HEAD
git rebase main
git push --force origin feature/x
git rm file
rm file
```

Static ruleだけでcontext-sensitive safe pushを証明しない。

### C. Hook contract

- fixture stdin -> stdout / stderr / exit code
- exact allowlist / deny matrix
- malformed / missing field
- false-positive
- temporary repo context

### D. Wrapper

- `scripts/codex-safe.ps1 -PreflightOnly`
- `bash scripts/codex-safe.sh --preflight-only`
- safe / readonly / auto-net preset

### E. Repository verification

- formatting
- Markdown lint
- lint
- typecheck
- contract tests
- verify entry points
- `git diff --check`

### F. Real-run

Normal:

```text
Hook invoked
+ safe Git forward operation succeeds
+ destructive probe denied
```

Full Access:

```text
permission_mode == bypassPermissions
+ Hook invoked
+ destructive probe blocked
+ sentinel state unchanged
```

### 成功判定

次をすべて満たした場合のみ完了。

```text
Installed runtime contract fixed
+
Hook registration valid
+
Hook wire contract valid
+
Static high-risk execpolicy deny retained
+
Safe Git exact allowlist works
+
Unknown Git mutation deny-by-default works
+
Default branch mutation denied
+
Shell bypass denied
+
False-positive tests PASS
+
Normal real-run PASS
+
Full Access bypassPermissions real-run PASS
+
Disposable repo sentinel unchanged after deny
+
Wrapper / verify / docs parity PASS
```

## 7. リスクと未解決論点

### R1. PreToolUse は完全な enforcement boundary ではない

対策:

- Static high-risk denyをexecpolicyへ残す。
- Real-runでHook invocation / blockを検証する。
- GitHub server-side guardを最終層として維持する。

### R2. Hook failureがtool executionを止めない

対策:

- Hook script内のhandled failureはblocking resultへ変換する。
- Hook process startup failureはverificationでFAILにする。
- reset / rebase / obvious force 等はexecpolicyでもdenyする。

### R3. Git grammarの抜け道

対策:

- allowlist方式。
- bare push禁止。
- single direct Git invocationのみ許可。
- unknown option / syntax / mutationはdeny。

### R4. False positive

対策:

- recursive content scanを削除。
- execution payloadだけ解析。
- Markdown / fixture / patch本文のnegative regression test。

### R5. Local Protected Branch Set と GitHub Ruleset の差

対策:

- local guardの定義を `main` / `master` / resolved default branch に限定して明文化。
- Additional server-side protected branch discoveryはNon-goal。

### R6. Node Hook path / cwd

対策:

- root / nested cwdをWave 0-1で実測。
- supportedとする起動形態は必ずsmoke test化。
- path resolutionが不安定な状態でcross-platform完了扱いしない。

### R7. Legacy Hook drift

対策:

- canonical policyをNode 1本へ限定。
- `.ps1` / `.py` 参照ゼロを機械確認。

### R8. Full Access証明の取り違え

対策:

- `permission_mode == "bypassPermissions"` をFull Access Evidence必須条件にする。

### Open questions

実装開始を止める owner question はない。

Runtimeで次が成立しない場合はBlocker:

- project Hook discovery
- Full Access `bypassPermissions` Hook invocation
- blocking enforcement

## 8. 成果物

### 変更ファイル

Expected:

- `.codex/config.toml`
- `.codex/hooks/pre_tool_use_policy.mjs`
- legacy `.ps1` / `.py` hookの削除またはpolicy-free deprecated shim
- `.codex/rules/*.rules`
- 必要な `.codex/rules-auto-net/*.rules`
- `scripts/codex-safe.ps1`
- `scripts/codex-safe.sh`
- `scripts/verify`
- `scripts/verify.ps1`
- `tests/contracts/codex-pre-tool-use-policy.test.ts`
- `AGENTS.md`
- `.codex/rules/README.md`
- `.codex/requirements.toml`
- `docs/reference/codex-safety-harness.md`
- 必要な場合のみ `docs/PROJECT_CONTEXT.md`

### 付随成果物

- 本計画書
- Run Artifact
- Normal / Full Access acceptance evidence

`docs/reports/` はこのPlanだけでは作成しない。

## 9. 備考

### 設計原則

```text
Full Access
!= project common safety policy 無効
```

ただし同時に、

```text
PreToolUse
!= 完全な単独 enforcement boundary
```

である。

安全性は複数層で成立させる。

```text
execpolicy static deny
+ PreToolUse semantic deny
+ wrapper launch guard
+ GitHub server-side protection
```

Gitについては、

```text
安全性
!= Git mutation 全面禁止
```

としつつ、初版でCodexへ渡すmutation権限は明示allowlistに限定する。

### v1 Safe Git workflow

初版の標準フローを次に固定する。

```text
git status
-> git switch -c feature/...
-> implementation
-> validation
-> git diff
-> git add -- <explicit paths>
-> git diff --cached
-> git commit -m "..."
-> git push -u origin <current-feature-branch>
-> PR
```

同期 / merge / rebase / cherry-pick 等はこのv1 workflowへ含めない。

### Upstream contract reference

実装時の優先順位は次とする。

1. installed Codex actual behavior
2. installed versionに対応するofficial OpenAI documentation / schema
3. current `openai/codex` implementation
4. repository legacy comments / implementation

`openai/codex` のcurrent `main` だけを見て installed runtime behavior を推測しない。
