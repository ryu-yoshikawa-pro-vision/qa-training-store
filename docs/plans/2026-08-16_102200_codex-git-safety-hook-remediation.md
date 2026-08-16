# Codex Git安全制御 / PreToolUse修復 実装計画

## 0. 依頼概要

- 依頼内容:
  - Codex が通常の Git 作業を安全な範囲で自律実行できるようにする。
  - `git fetch` / safe branch 作成・切替 / explicit `git add` /通常 `git commit` / feature branch への通常 `git push` を実行可能にする。
  - 履歴改ざん、未コミット変更の強制破棄、force push、default branch への直接更新、危険な remote/ref 操作は、Full Access を含む通常利用経路でも共通で禁止する。
  - 現在失敗している可能性が高い `PreToolUse` hook を、installed Codex の actual runtime contract に合わせて修復する。
- 背景:
  - 現在は `.codex/rules/30-destructive-forbidden.rules` と `.codex/hooks/pre_tool_use_policy.*` が `git add` / `git commit` / `git push` を一律禁止しており、通常の前進 Git workflow まで止めている。
  - 一方で残すべき安全境界は「Git mutation 全面禁止」ではなく、「明示的に許可した前進操作以外を deny すること」である。
  - 現在の `PreToolUse` hook は input / output contract と不整合があり、Hook failure 自体を Codex runtime が常に fail-close する保証もないため、PreToolUse 単独を唯一の強制境界にはしない。
- 期待成果:
  - latest remote default branch を起点に feature branch を作り、実装・明示stage・commit・push まで Codex が完走できる。
  - destructive Git operation は execpolicy + PreToolUse + GitHub server-side protection の多層で拒否される。
  - `PreToolUse` が正常に起動・判定・deny できることを contract test と real run で証明する。
  - 未列挙 Git mutation、未知syntax、Hook trust、shell composition 等を実装者がその場で判断しない計画とする。

## 1. ゴール / 完了条件

### ゴール

Codex の Git 操作を **allowlist + deny-by-default** で制御する。

```text
Exact read-only allowlist
  -> allow

Exact Safe Forward Mutation allowlist
  -> context条件を満たす場合のみ allow

それ以外の Git mutation / 未知syntax
  -> deny
```

安全境界は単一機構へ依存しない。

```text
Static high-risk deny     -> execpolicy
Context-sensitive deny    -> PreToolUse
Unsafe Codex launch deny  -> wrapper
Server-side final guard   -> GitHub Ruleset / Branch Protection
```

PreToolUse は semantic guard として使うが、Hook process failure / invalid output / unsupported execution path があり得るため、**PreToolUse 単独を完全な enforcement boundary または唯一の SSOT とみなさない**。

### 完了条件（DoD）

#### Runtime / Hook

- [ ] installed Codex version、Hook trust state、actual PreToolUse input/output behavior を Run Artifact に記録する。
- [ ] `.codex/config.toml` が installed Codex で有効な Hook feature / registration を使用する。
- [ ] canonical Hook runtime は Node.js 1本とする。
- [ ] root cwd / nested cwd / Windows で Hook command path が解決できる。
- [ ] Hook変更後に changed Hook を再reviewし、enabled/trusted state を再確認してから acceptance run を行う。
- [ ] safe case は exit `0` / stdout empty / stderr empty とする。
- [ ] deny case は installed Codex が実際に block と解釈する形式を返す。
- [ ] Hook が payload を受信した後の malformed / unknown safety-sensitive input は blocking result とする。
- [ ] Hook process 自体の起動失敗を安全成功とは扱わず、verification FAIL とする。

#### Safe Git workflow

- [ ] `git fetch origin` が許可される。
- [ ] latest `origin/<resolved-default-branch>` から `git switch --no-track -c <new-branch> origin/<resolved-default-branch>` で feature branch を作成できる。
- [ ] `git switch <existing-feature-branch>` が安全条件を満たす場合に許可される。
- [ ] index に pre-existing staged change が存在する場合、agent-managed add/commit workflow を開始しない。
- [ ] `git add -- <explicit-file>...` は index が空で、各pathがrepo内のliteral file pathである場合のみ許可される。
- [ ] v1では1 commitにつき explicit `git add -- ...` は1回とし、複数回の追加stageを前提にしない。
- [ ] commit前に staged diff を確認し、delete / rename を含む場合はcommitを拒否する。
- [ ] `git commit -m <message>` / 複数 `-m` が feature branch で許可される。
- [ ] `git push origin <current-branch>` が safe push contract を満たす場合に許可される。
- [ ] `git push -u origin <current-branch>` / `git push --set-upstream origin <current-branch>` が safe push contract を満たす場合に許可される。
- [ ] bare `git push` は v1 では許可しない。

#### Common deny

- [ ] Local Protected Branch Set 上のcommit / 直接pushを拒否する。
- [ ] `git reset` / `git rebase` family を拒否する。
- [ ] `git commit --amend` / `-a` / `--all` / `--no-verify` / `--fixup` / `--squash` を拒否する。
- [ ] force / force-with-lease / delete / mirror / tags / arbitrary refspec push を拒否する。
- [ ] `git clean` / `git restore` / `git checkout` / destructive switch / branch delete / remote mutation / direct ref mutation を拒否する。
- [ ] Git global option (`git -C`, `--git-dir`, `--work-tree`, `-c`, `--config-env`) を使ったcontext迂回を v1 では拒否する。
- [ ] shell wrapper / compound command / command substitution / redirection 等で Git mutation allowlist を迂回できない。
- [ ] 未列挙 mutation（`merge`, `cherry-pick`, `revert`, `stash`, `tag`, `worktree`, `submodule` 等）は v1 では deny する。
- [ ] command-based file deletion / remote script execution 等、既存の非Git destructive guard を維持する。
- [ ] `apply_patch` の実operationとしての Delete / Move を拒否し、本文中に同じ文字列が含まれるだけでは拒否しない。

#### Verification / Acceptance

- [ ] `tests/contracts/codex-pre-tool-use-policy.test.ts` で wire / Git grammar / shell lexer / context / false-positive を機械検証する。
- [ ] `scripts/codex-safe.ps1` / `.sh` preflight を新ポリシーへ同期する。
- [ ] `scripts/verify` / `scripts/verify.ps1` から Hook contract test と execpolicy smoke に到達できる。
- [ ] Full Access Acceptance Run は「ユーザーが実際に使用する Full Access 経路」で実行し、その run で観測された `permission_mode` を evidence として記録する。
- [ ] `permission_mode == "bypassPermissions"` を事前前提にしない。実測結果を Full Access mapping として記録する。
- [ ] Full Access 経路でも destructive probe が tool execution 前に block される。
- [ ] destructive real-run は production checkout ではなく temporary clone + local bare remote で行う。
- [ ] deny 後に working tree / local branch SHA / remote ref SHA の sentinel が不変である。
- [ ] Windows で required verification を実行する。
- [ ] macOS / Linux は利用可能環境で cross-platform contract を確認し、未確認なら未確認と明記する。
- [ ] `AGENTS.md` / safety reference / rules README / requirements が実装と一致する。

## 2. 現状理解と前提

### Current understanding

#### 2.1 現在の Git 制御

- `.codex/rules/10-readonly-allow.rules` は `git status` / `git diff` / `git log` / `git show` を allow している。
- `.codex/rules/20-risky-prompt.rules` は `git checkout` / `switch` / `merge` / `rebase` / `tag` を prompt としている。
- `.codex/rules/30-destructive-forbidden.rules` は `git reset --hard` / `git clean -fdx` / force push / `git add` / `git commit` / `git push` / `git rm` 等を forbidden にしている。
- `.codex/rules-auto-net/20-auto-net-risky-forbidden.rules` は non-interactive mode で `checkout` / `switch` / `merge` / `rebase` / `tag` を一律 forbidden としている。
- `.codex/hooks/pre_tool_use_policy.ps1` / `.py` も `git add|commit|push|rm` を一律 block している。

#### 2.2 現在の PreToolUse 設定

`.codex/config.toml` は旧 Hook feature key と `pwsh` 固定の PreToolUse command を持つ。

問題:

1. PowerShell 版と Python 版に safety logic が重複している。
2. Hook command path が cwd 依存で壊れる可能性がある。
3. Hook feature / matcher / input-output contract は installed Codex と再照合が必要である。
4. Current Hook output は safe / deny の wire contract と不整合を起こす可能性がある。
5. Hook implementation / config の変更後は trust state が変化し得るため、acceptance前に再確認が必要である。

#### 2.3 Hook failure / malformed input

初版 contract:

```text
Known safe input
  -> exit 0 / stdout empty / stderr empty

Known deny input
  -> installed runtime compatible blocking result

Malformed / unknown safety-sensitive input
  -> blocking result

Hook executable not found / process crash
  -> runtime側のfail-closeを期待しない
  -> verification FAIL + static execpolicy guardで補完
```

#### 2.4 Full Access の扱い

`permission_mode` の文字列を先に Full Access と決め打ちしない。

```text
ユーザーが実際に選択する Full Access 経路
  -> PreToolUse inputを記録
  -> actual permission_modeを確認
  -> その値をこのinstalled runtimeにおけるFull Access evidenceとして記録
  -> destructive probeがblockされることを確認
```

UI / CLI上のFull Access相当経路と `permission_mode` のmappingが想定と異なっても、Hook発火・実権限・blockが成立すれば実測結果を正本とする。

#### 2.5 Existing `origin` のtrust boundary

v1では `.git/config` に既に設定されている `origin` を **trusted operator configuration** として扱う。

- Hookからremote identityをGitHub API等で再検証しない。
- `git remote add/set-url/remove` はcommon denyとするため、agent自身が `origin` を差し替えてsafe pushを迂回することは許可しない。
- `origin` 自体が誤設定されていた場合の検出はNon-goalとする。

### Assumptions

- Repository workflow は default branch を直接commit/pushせず、latest remote default branch -> feature branch -> push -> PR -> merge を基本とする。
- Local common guard がprotected扱いするbranch setは GitHub Ruleset全体ではなく、`main` / `master` / resolved remote default branch のunionとする。
- Hook runtime は repository ですでに必須の Node.js を canonical runtime とする。
- Human/operatorが agentの `git add` と `git commit` の間に並行してindexを変更するケースは v1 の concurrency guarantee 対象外とする。

### Non-goals

- GitHub APIから全Ruleset / protected branchを取得すること。
- `origin` URLのrepository identity監査基盤を作ること。
- rebase / amend / force push を安全化して許可すること。
- bare `git push` をv1で安全化すること。
- `git pull` / `merge` / `cherry-pick` / `revert` / `stash` / `tag` / `worktree` / `submodule` 等をv1の自律mutationへ含めること。
- shell grammar全体を完全に実装すること。
- persistent session state storeを作ってstage ownershipを追跡すること。
- Codex本体Hook engineのbugをrepository側でmonkey patchすること。
- Product code / Web / Native behaviorを変更すること。

## 3. 質問 / 曖昧性

### 必ず質問する不透明点

現時点で owner decision を必要とする blocker はない。

合意済み:

- safe Git add / commit / feature push は許可する。
- destructive / history rewrite は Full Access でも禁止する。
- PreToolUse 不具合も同じ変更で修正する。
- profile固有ではなく project common policy として扱う。

### 仮定してよい細部

- deny reasonの文言。
- temporary directory名。
- test helper内部名。

### 未回答の重要質問

- なし。

Runtime capability question は Wave 0 / acceptance で実測する。

## 4. 影響範囲

### Entry points

- `.codex/config.toml`
- `.codex/hooks/pre_tool_use_policy.ps1`
- `.codex/hooks/pre_tool_use_policy.py`
- `.codex/hooks/pre_tool_use_policy.mjs`（新規）
- `.codex/rules/*.rules`
- `.codex/rules-auto-net/*.rules`
- `scripts/codex-safe.ps1`
- `scripts/codex-safe.sh`
- `scripts/verify`
- `scripts/verify.ps1`
- `tests/contracts/codex-pre-tool-use-policy.test.ts`（新規）
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
           +-> minimal shell lexer when shell tool
           +-> Git exact allowlist / deny-by-default
           +-> Git context resolution when required
           |
           +-> safe -> exit 0 / no output
           +-> deny -> blocking result

GitHub remote
    +-> Ruleset / Branch Protection as final server-side guard
```

### Key abstractions

1. Hook wire adapter
   - stdin parsing / blocking output generationのみ。
2. Tool input extractor
   - `tool_name` ごとにexecution payloadだけを取り出す。
3. Minimal shell lexer
   - single direct Git invocationを安全にtokenizeする。shell実行器を再実装しない。
4. Common Git classifier
   - exact read-only / safe mutation allowlist、deny-by-defaultをpure functionで判定する。
5. Git context resolver
   - current branch / default branch / index state / staged diffをread-only Git commandで確認する。
6. Execpolicy static deny
   - Hook failure時にも残すhigh-risk prefix deny。
7. Real-run acceptance harness
   - temporary clone + local bare remoteでactual enforcementを確認する。

### Safe change surface

- Codex development harness / repository safety policyのみ。
- Product code / product tests / application runtimeには触れない。
- Git history migrationは行わない。
- Existing `safe` / `readonly` / `auto-net` profile自体を新profileへ置換しない。

## 5. 変更方針

### Wave 0 — Installed runtime / contract rebaseline

Reference priority:

```text
1. Installed Codex actual runtime behavior
2. Installed versionに対応するofficial OpenAI docs / schema / release contract
3. Current openai/codex main
4. Repository legacy implementation
```

実施:

1. installed Codex versionを記録する。
2. `.codex/config.toml` load状態を確認する。
3. current project Hook discovery / enabled / trust stateを確認する。
4. harmless diagnostic Hookで safe / deny behaviorを確認する。
5. `tool_name` / `tool_input` shapeを shell / apply_patch / edit-write family で記録する。
6. ユーザーが通常使うpermission modeとFull Access経路の `permission_mode` を記録する。
7. matcher aliasを記録する。

Gate:

- project Hookがloadされない -> BLOCKED。
- ユーザーが実際に使うFull Access経路でHookが発火しない -> BLOCKED。
- Full Accessの `permission_mode` が想定と違うこと自体はBLOCKEDにしない。actual mappingを記録する。
- BLOCKEDの場合、Git blanket banを解除して完了扱いにしない。

### Wave 1 — Hook registration / cross-platform runtime を固定

Canonical implementation:

```text
.codex/hooks/pre_tool_use_policy.mjs
```

Hook handler:

- Unix系は `command` を使用する。
- Windowsは current Hook contract の `commandWindows`（`command_windows` aliasではなくcanonical serialized nameを優先）を使用する。
- 両OSとも Hook script path は repository root を解決してから Node.js へ渡す。
- repository root は `git rev-parse --show-toplevel` 相当のread-only解決を使う。
- wrapper経由だけに依存せず、repository subdirectoryからCodexを直接起動した場合もHook pathが解決できる構成にする。

Matcher:

- Wave 0 actual aliasを確認したうえで、v1正本は shell execution と `apply_patch` executionだけを対象とする。
- current runtimeでcanonical aliasが `Bash` / `apply_patch` なら `^(Bash|apply_patch)$` を採用する。
- `Edit` / `Write` aliasが `apply_patch` と同一callへ重複matchする場合は重複Hook実行を避け、canonical tool名側を優先する。
- actual runtimeが異なる場合はWave 0 evidenceに合わせて最小matcherへ修正する。

Gate:

- Windows repo root smoke PASS。
- nested cwd smoke PASS。
- Unix利用可能環境でcommand smoke PASS、未確認なら未確認と記録。

### Wave 2 — Canonical HookをNode.js 1本へ単一化

Safe output:

```text
exit 0
stdout empty
stderr empty
```

Deny output:

- installed runtimeでblockと確認できたcurrent contractのみ使用する。
- schema外fieldを返さない。
- non-empty reason必須。

Malformed / unknown safety-sensitive input:

- Hook内部で検出できた場合はblocking result。
- top-level exceptionをcatchし、可能な限りblocking resultへ変換する。
- executable起動不能はverification FAILとする。

Legacy migration:

1. Node canonical implementation追加。
2. config切替。
3. Hook変更後に再起動し、changed Hookをreview/trustする。
4. contract test / real-run PASS。
5. `.ps1` / `.py` 参照ゼロ確認。
6. 旧Hookをreviewable patchで削除する。削除不能環境ではpolicy-free deprecated shimへ縮退するが、本PR内でruntime参照ゼロを保証する。

### Wave 3 — Tool-specific extraction / apply_patch structural guard

Payload全体のrecursive string scanを廃止する。

#### Shell tool

- `tool_input` のactual command fieldだけを解析する。
- source / Markdown / fixture本文は解析しない。

#### `apply_patch`

actual patch grammarを構造として判定する。

Deny marker:

```text
Top-level hunk: *** Delete File: <path>
Update hunk内:  *** Move to: <path>
```

Allow:

```text
*** Add File:
*** Update File:  （Move toなし）
```

判定ルール:

- patch行頭のoperation markerとして解釈される場合だけdenyする。
- 追加される本文行 `+*** Delete File: example` / `+*** Move to: example` はcontentでありallowする。
- Markdown / sourceへ `git push --force` 等の危険command例を書くことはallowする。
- unknown / malformed patch operation shapeは安全側でdenyする。

必須test:

- actual Delete File -> deny
- actual Update + Move to -> deny
- normal Add / Update -> allow
- added content `+*** Delete File:` -> allow
- added content `+*** Move to:` -> allow

### Wave 4 — Minimal shell lexer / invocation grammar

Safe Git mutationは **single direct Git invocation** のみ許可する。

#### 4.1 Tokenization contract

実装するのは完全shell parserではなく、allowlist判定用のminimal lexerとする。

許可するtoken表現:

- unquoted literal token
- single-quoted literal token
- double-quoted literal token
- quoted commit message内の空白 / `:` / `;` 等は、quote内のliteralとして扱う

v1でdenyするsyntax:

- command separator: `&&`, `||`, `;`, newline
- pipe / redirection: `|`, `>`, `<`, `>>`, `2>`, heredoc等
- command substitution: `$()`, backtick
- variable / parameter expansionを必要とするcommand
- leading environment assignment: `NAME=value git ...`
- shell wrapper: `bash -c`, `sh -lc`, `pwsh -Command`, `powershell -Command`, `cmd /c`
- unmatched quote / invalid escape / unknown tokenization

quote内の `;` 等はseparatorとして扱わないが、command substitution / expansion syntaxはv1ではquote内でもallowしない。

#### 4.2 Git invocation prefix

mutation allowlistに入るcommandは先頭tokenがliteral `git` でなければならない。

次のGit global optionはv1ではdenyする。

```text
git -C
git --git-dir
git --work-tree
git -c
git --config-env
```

理由:

- repository contextを差し替える迂回を閉じる。
- classifierがcurrent repository contextだけを判定すればよい状態にする。

Read-only内部context resolverはHook process側から直接Gitを起動し、user-provided shell stringを再利用しない。

### Wave 5 — Git policy allowlist + deny-by-default

#### 5.1 Exact read-only Git allowlist

Common Hookで禁止しないv1 read-only commandを次へ固定する。

```text
git status
git diff
git log
git show
git rev-parse
git symbolic-ref
git branch --show-current
git branch --list
git remote -v
git remote get-url origin
git diff --cached
git diff --cached --name-status
git diff --cached --quiet
git check-ref-format --branch <name>
```

上記以外のGit commandは、mutationかどうかが曖昧でもv1では自律allowしない。Hook内部context resolverが必要とするread-only commandを追加する場合は同じPR内でtestとallowlistを追加する。

#### 5.2 `fetch`

許可grammar:

```bash
git fetch origin
```

- arbitrary remote deny。
- fetch optionはv1 allowlist外。

#### 5.3 `switch`

許可grammar:

```bash
git switch <existing-feature-branch>
git switch -c <new-branch>
git switch --no-track -c <new-branch> origin/<resolved-default-branch>
```

Standard workflowは3つ目を使用し、latest fetched default branchを起点とする。

制約:

- current working treeにswitch不能なconflictがある場合、Gitに強制optionを追加せず失敗させる。
- `-C`, `--discard-changes`, `--orphan` deny。
- `checkout` family deny。
- `switch -c <new>` はcurrent HEAD起点のみ。
- arbitrary start-point deny。
- `--no-track -c` のstart-pointは `origin/<resolved-default-branch>` と完全一致のみallow。
- new branch名は `git check-ref-format --branch` 相当でvalidであること。
- new/existing branch が Local Protected Branch Set に一致する場合deny。

#### 5.4 `add`

許可grammar:

```bash
git add -- <repo-relative-file> [<repo-relative-file> ...]
```

Precondition:

```text
index must be empty before add
```

Hookは `git diff --cached --quiet` 相当で確認し、pre-existing staged changeが1件でもあればaddをdenyする。

Path contract:

- repo-relative pathのみ。
- absolute path / `..` traversal deny。
- literal pathのみ。pathspec magic / wildcard deny。
- `.` deny。
- directory path deny。v1はexplicit file pathだけ許可。
- 各pathはadd時点で存在するfileであること。tracked deletion pathのstageを許可しない。
- `-A`, `--all`, `-u`, `--update`, `-f`, `--force` deny。
- 1 commitにつきadd invocationは1回を標準workflowとする。indexが非emptyになるため2回目addはdenyされる。

この制約により既存stageの巻き込み、directoryによる広範stage、deleted fileのstageを避ける。

#### 5.5 `commit`

許可grammar:

```bash
git commit -m <message>
git commit -m <subject> -m <body>
```

複数 `-m` は許可するが、その他optionはv1 denyとする。

Commit precondition:

- current branch not in Local Protected Branch Set。
- detached HEAD deny。
- staged changesが存在する。
- `git diff --cached --name-status` に `D` / `R` が含まれない。
- staged diff確認が失敗 / parse不能ならdeny。

Deny:

- `--amend`
- `-a` / `--all`
- `--no-verify`
- `--fixup`
- `--squash`
- path-limited commit
- `-F`, reuse-message, reset-author等のallowlist外option

Human/operatorがaddとcommitの間に並行して追加stageするraceはv1 Non-goalとし、persistent stage ownership stateは導入しない。

#### 5.6 `push`

bare `git push` deny。

許可grammar:

```bash
git push origin <current-branch>
git push -u origin <current-branch>
git push --set-upstream origin <current-branch>
```

Safe push conditions:

```text
remote == origin
argument branch == current local branch
current branch not in Local Protected Branch Set
no custom refspec
no force / force-with-lease
no delete / mirror / prune
no tags publication
no leading + refspec
```

`origin` は既存operator configurationとして信頼し、remote URL identity再検証は行わない。agentによるremote mutationは別途denyする。

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

#### 5.7 Local Protected Branch Set

```text
main
master
resolved repository default branch from local origin metadata
```

Default branch resolver priority:

1. local `refs/remotes/origin/HEAD` / `origin/HEAD` symbolic ref
2. installed environmentで安全に取得できる既存local origin metadata
3. 解決不能なら `main` / `master` のみをprotected setとし、latest-default起点branch作成はBLOCKED

GitHub Rulesetの追加branch discoveryはNon-goal。

#### 5.8 Common forbidden families

Static execpolicy + PreToolUseで、表現可能な範囲を重ねて守る。

History / ref rewrite:

- `git reset` family
- `git rebase` family
- `git commit --amend`
- force / force-with-lease / force refspec
- `git branch -f`
- `git tag -f`
- `git update-ref`
- `git replace`
- `git filter-branch`

Data loss / destructive working tree:

- `git clean`
- `git restore`
- `git checkout`
- destructive switch option
- `git branch -d` / `-D`
- `git stash drop` / `clear`
- `git reflog expire`
- aggressive/destructive gc / prune
- `git rm`

Remote / config mutation:

- `git remote add`
- `git remote set-url`
- `git remote remove`
- `git config` mutation
- arbitrary destination refspec
- branch/tag delete push

Unlisted mutations deny:

- `merge`
- `cherry-pick`
- `revert`
- `stash push/apply/pop`
- tag create/delete
- worktree add/remove
- submodule mutation
- notes mutation
- sparse-checkout mutation
- maintenance mutation

必要なoperationは後続で個別contract + testsを追加してallowlistへ昇格する。

### Wave 6 — execpolicyをlayered safety modelへ同期

原則:

```text
execpolicy
  = Hook failure時にも残すstatic high-risk deny
  + mode-specific prompt/allow

PreToolUse
  = exact Git grammar / context-sensitive semantic deny
```

実施:

1. `.codex/rules/30-destructive-forbidden.rules` から blanket `git add|commit|push` forbiddenを外す。
2. `git reset`, `git rebase`, obvious force, `git clean`, `git rm`, `git update-ref`, `git replace` 等はstatic forbiddenに残す / 追加する。
3. protected branch / current branch / index / refspecはPreToolUseで判断する。
4. `20-risky-prompt.rules` はsafe presetのapproval UXとして必要なものだけ維持する。
5. auto-netもsafe forward Git operationをblanket forbidしない。ただしallowlist外mutationはcommon Hookまたはauto-net static denyで拒否する。
6. execpolicyとHookで複雑なGit parserを二重実装しない。

### Wave 7 — Contract tests / wrapper preflight

Test正本:

```text
tests/contracts/codex-pre-tool-use-policy.test.ts
```

可能な限りclassifier / lexer / context判断をpure function化し、child processによるwire contract testと分ける。

#### Wire / Hook lifecycle

- safe input -> exit 0 / no output
- deny input -> valid block
- malformed JSON -> block
- missing required input -> block
- top-level handled exception -> block
- changed Hook re-trust後 -> invocation evidenceあり

#### Shell lexer

Allow:

- `git commit -m "fix: user flow"`
- `git add -- "docs/file name.md"`
- quoted message内literal semicolon

Deny:

- `git status && git push origin feature/x`
- `echo ok; git commit -m test`
- newline composition
- `bash -c 'git ...'`
- `pwsh -Command 'git ...'`
- `cmd /c "git ..."`
- pipe / redirect / command substitution / backtick / expansion
- unmatched quote
- `GIT_DIR=x git push ...`
- `git -C .. push ...`
- `git --git-dir=x push ...`
- `git -c x=y push ...`

#### Git allow

- `git fetch origin`
- `git switch feature/x`
- `git switch -c feature/x`
- `git switch --no-track -c feature/x origin/main` when `main` is resolved default
- `git add -- app/file.ts` with empty index
- `git add -- app/a.ts tests/a.test.ts` with empty index
- feature branch commit with safe staged diff
- explicit same-name feature push
- initial upstream push

#### Git context deny

- add when pre-existing staged change exists
- add directory / missing tracked deletion path / absolute path / traversal / wildcard
- second add after index nonempty
- commit on protected branch
- detached HEAD commit
- commit staged diff containing `D` / `R`
- latest-default branch creation when default branch cannot be resolved

#### Git syntax deny

- broad add
- amend / `-a` / `--no-verify`
- bare push
- arbitrary refspec
- force / delete / mirror / tags
- reset / rebase / restore / checkout
- branch delete / remote mutation
- all explicitly unlisted mutations

#### apply_patch

- Delete File marker as operation -> deny
- Update + Move to marker as operation -> deny
- normal Add / Update -> allow
- content line `+*** Delete File:` -> allow
- content line `+*** Move to:` -> allow

#### Wrapper preflight

Static rule正本:

```text
git status -> allow
git reset --hard HEAD -> forbidden
git rebase main -> forbidden
git push --force origin feature/x -> forbidden
git rm file -> forbidden
rm file -> forbidden
```

Context-dependent add/commit/pushはHook testを正本とする。

### Wave 8 — Real-run acceptance

#### 8.1 Disposable environment

Production checkoutでは destructive negative test を実行しない。

```text
Temporary directory
  |- source-clone/
  `- origin.git/
```

Setup順を固定する。

1. current repositoryからtemporary source cloneを作る。
2. local bare `origin.git` を作る。
3. source cloneの`origin`をlocal bare remoteへ向ける。
4. baseline default branch (`main`相当) をbare remoteへseed pushする。
5. `origin/HEAD` をbaseline default branchへ設定 / fetch metadataを成立させる。
6. bare remote default branch SHAをsentinelとして記録する。
7. `git fetch origin` を実施する。
8. `git switch --no-track -c feature/hook-acceptance origin/<default>` でfeature branchを作る。
9. feature baselineをbare remoteへseedする場合はそのSHAも記録する。
10. dirty tracked file / local branch SHA / remote ref SHAをprobe別sentinelとして記録する。

#### 8.2 Normal mode

確認:

1. Hook invocation evidenceあり。
2. safe edit成功。
3. index emptyを確認。
4. explicit add成功。
5. staged diff確認成功。
6. feature commit成功。
7. explicit feature push成功。
8. destructive probeはdeny。

#### 8.3 Full Access mode

成立条件:

- ユーザーが実際に使用するFull Access経路で起動する。
- PreToolUse inputからactual `permission_mode` を記録する。
- approval/sandbox制約がFull Access相当であることをrun evidenceで確認する。
- `permission_mode` の値自体は事前固定しない。

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

Hook変更後のtrust確認:

1. Hook/config変更後にCodex sessionを再起動する。
2. Hook一覧 / review UI またはinstalled runtimeが提供する同等手段でchanged Hookを確認する。
3. enabled/trusted stateを記録する。
4. その後にNormal / Full Access acceptanceを実行する。

Failure:

- Hookが発火しない。
- Hook failedのみでcommandが実行される。
- destructive probeでstateが変化する。

いずれかの場合は FAIL / BLOCKED とし、Git blanket banを解除した状態で完了扱いにしない。

### Wave 9 — Verification integration

`scripts/verify` / `scripts/verify.ps1` へ最低限次を統合する。

- Hook source existence
- Hook config registration
- Node Hook contract tests
- minimal shell lexer tests
- Git context tests
- apply_patch structural tests
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

既存verifyが包含する場合は重複実行を減らしてよいが、Hook contract testが最終verifyから到達可能であることは必須。

### Wave 10 — Documentation / governance sync

更新:

- `AGENTS.md`
- `docs/reference/codex-safety-harness.md`
- `.codex/rules/README.md`
- `.codex/requirements.toml`
- 必要な場合のみ `docs/PROJECT_CONTEXT.md`

明文化:

- exact read-only / safe mutation allowlist。
- latest remote default branch起点の標準branch作成方法。
- pre-existing staged changeがある場合はagent-managed commit workflowを開始しない。
- default branch local commit / direct push禁止。
- bare push禁止。
- shell composition / Git global optionによるcontext迂回禁止。
- unlisted mutation deny-by-default。
- execpolicy / PreToolUse / wrapper / GitHub protectionの責務分離。
- PreToolUse failureを安全成功と扱わない。
- Full Accessのpermission mode mappingはactual run evidenceを正本とする。
- existing `origin` はtrusted operator configurationとして扱い、agentによるremote mutationは禁止する。

### 実行タスク

- [ ] 1. Installed Codex version / Hook discovery / trustを記録する。
- [ ] 2. Actual shell / apply_patch input shapeとmatcher aliasを記録する。
- [ ] 3. Normal / Full Access経路のactual permission modeを記録する。
- [ ] 4. Hook config / cross-platform launcherをinstalled contractへ移行する。
- [ ] 5. Node canonical Hookを追加する。
- [ ] 6. Hook変更後のre-trust flowを確認する。
- [ ] 7. safe / deny / malformed wire behaviorを実装する。
- [ ] 8. apply_patch structural extractorを実装する。
- [ ] 9. minimal shell lexerを実装する。
- [ ] 10. Git global option / shell composition bypassを拒否する。
- [ ] 11. exact read-only allowlistを実装する。
- [ ] 12. latest default branch起点のsafe switch contractを実装する。
- [ ] 13. empty-index precondition付きexact add grammarを実装する。
- [ ] 14. staged D/R guard付きexact commit grammarを実装する。
- [ ] 15. exact push grammarを実装する。
- [ ] 16. Local Protected Branch Set resolverを実装する。
- [ ] 17. unlisted mutation deny-by-defaultを実装する。
- [ ] 18. static execpolicy high-risk denyを更新する。
- [ ] 19. auto-net rulesを整合させる。
- [ ] 20. Hook contract / lexer / context / patch testsを追加する。
- [ ] 21. wrapper preflightを更新する。
- [ ] 22. verify entry pointへ統合する。
- [ ] 23. seeded temporary clone + bare remote acceptance harnessを準備する。
- [ ] 24. Normal real-runを実行する。
- [ ] 25. actual Full Access経路real-runを実行する。
- [ ] 26. Windows required verificationを実行する。
- [ ] 27. 利用可能ならmacOS / Linux verificationを実行する。
- [ ] 28. legacy PS1/Python Hook参照をゼロにする。
- [ ] 29. safety docs / AGENTS / requirementsを同期する。
- [ ] 30. final diff / required validationを実行する。

## 6. 検証方法

### A. Installed runtime / Hook lifecycle

- Codex version evidence
- Hook discovery / enabled / trust state
- changed Hook re-trust evidence
- matcher discovery
- Normal / actual Full Access permission mode evidence
- root / nested cwd / Windows invocation

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

### C. Hook contract / policy

- stdin -> stdout / stderr / exit code
- minimal shell lexer
- exact read-only / mutation allowlist
- empty-index add precondition
- staged diff commit guard
- default branch resolution
- safe push context
- malformed / missing field
- apply_patch structural parsing
- false-positive

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
+ latest remote default branch起点でfeature branch作成
+ empty-index explicit add
+ safe staged diff
+ commit
+ explicit feature push
+ destructive probe denied
```

Full Access:

```text
actual Full Access route confirmed
+ observed permission_mode recorded
+ Hook invoked
+ destructive probe blocked
+ sentinel state unchanged
```

### 成功判定

次をすべて満たした場合のみ完了。

```text
Installed runtime contract fixed
+
Hook registration / trust valid
+
Root / nested cwd / Windows Hook invocation valid
+
Hook wire contract valid
+
Static high-risk execpolicy deny retained
+
Minimal shell lexer bypass tests PASS
+
Exact Git allowlist works
+
Latest origin default branch workflow works
+
Pre-existing staged change guard works
+
Staged delete/rename commit guard works
+
Unknown Git mutation deny-by-default works
+
Default branch mutation denied
+
apply_patch structural guard works without false-positive
+
Normal real-run PASS
+
Actual Full Access real-run PASS
+
Disposable repo sentinel unchanged after deny
+
Wrapper / verify / docs parity PASS
```

## 7. リスクと未解決論点

### R1. PreToolUseは完全なenforcement boundaryではない

対策:

- static high-risk denyをexecpolicyへ残す。
- real-runでHook invocation / blockを検証する。
- GitHub server-side guardを最終層として維持する。

### R2. Hook failureがtool executionを止めない

対策:

- handled failureはblocking resultへ変換する。
- startup failureはverification FAIL。
- reset / rebase / obvious force等はexecpolicyでもdeny。

### R3. Shell lexer / Git grammarの抜け道

対策:

- exact allowlist。
- single direct Git invocationのみ。
- global option / shell composition / expansion deny。
- unknown tokenization deny。

### R4. Existing staged changeの巻き込み

対策:

- add前index emptyを必須化。
- v1は1 add invocation / commit。
- commit前にstaged diffを検査。
- human concurrent stageはNon-goalとして明示。

### R5. Latest default branchからbranchを作れない

対策:

- `fetch origin` 後、`git switch --no-track -c <new> origin/<resolved-default>` をexact allowlistへ入れる。
- default branch解決不能なら標準workflowをBLOCKEDにする。

### R6. apply_patch false positive / false negative

対策:

- substringではなくoperation marker構造で判定。
- actual Delete / Move と added contentのfixtureを分ける。

### R7. Hook path / trust

対策:

- repository root解決型commandをUnix / Windows双方で使う。
- nested cwd smokeを必須化。
- Hook変更後にre-trustしてからacceptanceを行う。

### R8. Full Access mapping取り違え

対策:

- `permission_mode` を事前固定しない。
- ユーザーが実際に使用するFull Access経路でactual valueを記録する。
- actual権限状態 + Hook blockの両方をevidenceにする。

### R9. `origin` 誤設定

対策:

- v1ではexisting `origin` をtrusted operator configと定義する。
- agentによるremote mutationをdenyする。
- remote identity監査はNon-goalとしてscopeを膨らませない。

### Open questions

owner decisionとしてのblocking questionはない。

Runtimeで次が成立しない場合はBlocker:

- project Hook discovery / trust
- root / nested cwd / required OSでHook invocation
- actual Full Access経路でHook invocation
- blocking enforcement
- resolved default branch metadata

## 8. 成果物

### 変更ファイル

Expected:

- `.codex/config.toml`
- `.codex/hooks/pre_tool_use_policy.mjs`
- legacy `.ps1` / `.py` Hookの削除またはpolicy-free deprecated shim
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

ただし、

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

としつつ、v1でCodexへ渡すmutation権限はexact allowlistに限定する。

### v1 Safe Git workflow

標準フローを次へ固定する。

```text
git status
-> index empty確認
-> git fetch origin
-> default branch解決
-> git switch --no-track -c feature/... origin/<default>
-> implementation
-> validation
-> git diff
-> git add -- <explicit file paths in one invocation>
-> git diff --cached --name-status
-> git diff --cached
-> git commit -m "..."
-> git push -u origin <current-feature-branch>
-> PR
```

同期 / merge / rebase / cherry-pick等はこのv1 workflowへ含めない。

### Upstream contract reference

実装時の優先順位:

1. installed Codex actual behavior
2. installed versionに対応するofficial OpenAI documentation / schema
3. current `openai/codex` implementation
4. repository legacy comments / implementation

`openai/codex` current `main` だけを見て installed runtime behavior を推測しない。
