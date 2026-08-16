# Codex Git安全制御 / PreToolUse修復 実装計画

## 0. 依頼概要

- 依頼内容:
  - Codex が通常の Git 作業を安全な範囲で自律実行できるようにする。
  - `git add` / 通常 `git commit` / feature branch への通常 `git push` 等は実行可能にする。
  - 履歴改ざん、未コミット変更の強制破棄、force push、protected branch への直接 push 等は、Full Access を含めて共通で禁止する。
  - 現在失敗している可能性が高い `PreToolUse` hook を現行 Codex contract に合わせて修復する。
- 背景:
  - 現在は `.codex/rules/30-destructive-forbidden.rules` と `.codex/hooks/pre_tool_use_policy.*` が `git add` / `git commit` / `git push` を一律禁止しており、通常の前進 Git workflow まで止めている。
  - 一方で、Full Access 時にも残したい安全境界は「Git mutation 全般の禁止」ではなく「履歴破壊・データ消失・protected branch 直接更新等の禁止」である。
  - 現在の `PreToolUse` hook は現行 Codex の input / output contract と不整合があり、安全ガードとして正しく機能していない可能性が高い。
- 期待成果:
  - 通常の feature branch workflow は Codex が完走できる。
  - Full Access でも destructive Git operation は共通 guard で拒否される。
  - `PreToolUse` が現行 Codex で正常に起動・判定・deny できることを contract test と real run で証明する。
  - execpolicy / hook / wrapper / documentation の責務と期待値が一致する。

## 1. ゴール / 完了条件

### ゴール

Codex の Git 操作を「mutation かどうか」ではなく「安全に前進する操作か、履歴・作業状態を破壊し得る操作か」で分類し、通常の branch 作業は自動化しつつ、Full Access を含む全モードで越えてはいけない安全境界を `PreToolUse` によって機械的に強制する。

同時に、現在の `PreToolUse` 実装を現行 Codex hook contract に適合させ、Hook が存在するだけでなく、実際に発火・解釈・deny されることまで検証する。

### 完了条件（DoD）

- [ ] `.codex/config.toml` が現行 hook feature key を使用し、PreToolUse command が Windows / macOS / Linux で利用できる共通 runtime を使う。
- [ ] safe command に対する PreToolUse output が現行 Codex parser で invalid output にならない。
- [ ] deny command に対する PreToolUse output が現行 Codex parser で有効な deny として解釈される。
- [ ] `git add <explicit paths>` が禁止されない。
- [ ] non-protected branch 上の通常 `git commit -m ...` が禁止されない。
- [ ] non-protected current branch から同名の `origin` branch への通常 push / initial upstream push が禁止されない。
- [ ] `git reset --hard` が Full Access を含めて実行前に拒否される。
- [ ] `git rebase` が Full Access を含めて実行前に拒否される。
- [ ] `git commit --amend` が Full Access を含めて実行前に拒否される。
- [ ] `git push --force` / `-f` / `--force-with-lease` が Full Access を含めて実行前に拒否される。
- [ ] protected branch への直接 push が Full Access を含めて実行前に拒否される。
- [ ] current protected branch 上での通常 commit が拒否される。
- [ ] `git clean`、destructive restore / checkout、branch 強制削除、ref 直接操作等が共通 guard で拒否される。
- [ ] 既存の command-based file deletion / remote script execution 等の非 Git destructive guard が維持される。
- [ ] Hook 自体の contract test が追加され、safe / deny / malformed / false-positive ケースを機械検証できる。
- [ ] `scripts/codex-safe.ps1` / `.sh` の execpolicy preflight が新ポリシーへ同期される。
- [ ] `scripts/verify` / `scripts/verify.ps1` が execpolicy と PreToolUse contract の双方を検証する。
- [ ] 通常 permission mode で real-run acceptance が成功する。
- [ ] Full Access 相当の permission mode で destructive operation が実際に block されることを real-run で確認する。確認不能な場合は「Full Access でも保護される」と完了報告しない。
- [ ] `AGENTS.md` / safety reference / rules README / requirements の運用記述が実装と一致する。
- [ ] `bash scripts/verify` と PowerShell 側 verify が利用可能環境で成功する。

## 2. 現状理解と前提

### Current understanding

#### 2.1 現在の Git 制御

- `.codex/rules/10-readonly-allow.rules` は `git status` / `git diff` / `git log` / `git show` を allow している。
- `.codex/rules/20-risky-prompt.rules` は `git checkout` / `switch` / `merge` / `rebase` / `tag` を prompt としている。
- `.codex/rules/30-destructive-forbidden.rules` は以下を含む。
  - `git reset --hard`
  - `git clean -fdx`
  - force push
  - `git add` / `git commit` / `git push`
  - `git rm`
- `.codex/rules-auto-net/20-auto-net-risky-forbidden.rules` は非対話 mode で `checkout` / `switch` / `merge` / `rebase` / `tag` を一律 forbidden としている。
- `.codex/hooks/pre_tool_use_policy.ps1` / `.py` も `git add|commit|push|rm` を一律 block している。

#### 2.2 現在の PreToolUse 設定

`.codex/config.toml` は以下の構成を持つ。

- `[features] codex_hooks = true`
- `[[hooks.PreToolUse]]`
- matcher: `Bash|Shell|PowerShell|apply_patch|Edit|Write`
- command: `pwsh ... .codex/hooks/pre_tool_use_policy.ps1`

このため、少なくとも次の問題がある。

1. hook runtime が `pwsh` に固定されており、repository が macOS / Linux でも利用されることと整合しない。
2. PowerShell 版と Python 版の safety logic が重複実装になっている。
3. config の hook feature key は、現行 Codex で使用される `hooks` への migration が必要である。

#### 2.3 現在の Hook output 不整合

現行 PowerShell / Python hook は safe 時に次を返す。

```json
{"decision":"allow"}
```

しかし current `openai/codex` の `PreToolUseCommandOutputWire` では top-level `decision` の wire value は `approve` / `block` であり、`allow` は schema に存在しない。

さらに current Codex parser `parse_pre_tool_use` では legacy `decision: approve` 自体も unsupported output として扱われる。safe case は stdout を空にして exit 0 とするのが最小で、不要な explicit allow decision を返さない方針が安全である。

現在の deny output は `tool` という schema 外 property も返しており、strict schema と不整合である。

current Codex parser で PreToolUse deny として利用可能な形式は、少なくとも以下である。

- legacy `decision: block` + non-empty `reason`
- `hookSpecificOutput.permissionDecision: deny` + non-empty `permissionDecisionReason`

実装では current schema / parser と contract test を固定し、推測で wire format を組み立てない。

#### 2.4 現在の Hook input

current `openai/codex` の PreToolUse input は主要 field として以下を持つ。

- `hook_event_name`
- `permission_mode`
- `tool_name`
- `tool_input`
- `cwd`
- session / turn metadata

一方、現在の hook は payload 全体を再帰走査し、`command` / `cmd` / `args` / `arguments` / `input` / `patch` / `content` / `text` / `script` という名前の文字列を広く正規表現判定している。

この方式では「実行 command」ではなく、文書や編集内容に destructive command の文字列が説明として含まれただけでも false positive になり得る。

#### 2.5 Wrapper / verification

- `scripts/codex-safe.ps1` / `.sh` は project execpolicy rule を読み、起動前 preflight を行う。
- 現在の preflight は `git add . => forbidden` を期待しているため、Git policy 変更時に同期が必要である。
- `docs/reference/codex-safety-harness.md` は PowerShell hook / Python equivalent hook、Git mutation 禁止等を現行仕様として記載している。
- 現在の verification は execpolicy の確認が中心であり、PreToolUse stdin/stdout wire contract と actual Codex real-run enforcement を十分な gate として固定できていない。

### Assumptions

- Repository の通常開発フローは `main` を直接更新せず、feature branch → push → PR → merge を基本とする。
- protected branch 判定は hardcoded repository URL ではなく、local Git metadata から default branch を解決し、解決不能時のみ `main` / `master` を安全側 fallback とする。
- 通常 push として許可する範囲は current local branch と同名の `origin` branch への fast-forward 系 push に限定する。
- `origin` 自体の変更は通常の Coding Agent task では不要であり、remote mutation は共通 guard の禁止対象としてよい。
- Hook runtime は repository ですでに必須の Node.js を利用できる。新しい OS 固有 runtime dependency は追加しない。
- Full Access で hook が実際に発火・enforce されるかは実装前提にせず、real-run acceptance で確認する。

### Non-goals

- GitHub branch protection / Ruleset をこの変更だけで完全に置き換えること。
- force push を安全化して許可すること。
- rebase / amend を AI 向けに許可すること。
- arbitrary remote / arbitrary refspec への push を許可すること。
- Git command 全体を完全に parse する独自 shell parser を構築すること。
- 独自 Git client / Git proxy / Git server を実装すること。
- Codex 本体の hook engine bug を repository 側で monkey patch すること。
- Product code / Web / Native / QA product behavior を変更すること。
- GitHub Actions の branch protection 運用まで同時に再設計すること。

## 3. 質問 / 曖昧性

### 必ず質問する不透明点

現時点では、実装開始を止める未解決の owner decision はない。

ユーザーとの合意済み方針:

- 通常の Git add / commit / push は安全な範囲で許可する。
- 履歴改ざん等は Full Access でも禁止する。
- PreToolUse の不具合も同じ変更で修正する。
- これは profile 固有ではなく共通ルールとして実装する。

### 仮定してよい細部

- Hook canonical implementation の filename。
- test file の配置場所。
- error reason の文言。
- current default branch 解決失敗時の `main` / `master` fallback 実装詳細。

これらは既存 repository convention と validation に従い、局所的に決めてよい。

### 未回答の重要質問

- なし。

ただし Full Access real-run で PreToolUse が発火しない / deny enforcement されないことが判明した場合は implementation blocker とし、repository 側だけで「Full Access 共通 guard 完成」と扱わない。

## 4. 影響範囲

### Entry points

- `.codex/config.toml`
  - project-scoped hook registration / feature activation
- `.codex/hooks/pre_tool_use_policy.*`
  - common destructive-operation guard
- `.codex/rules/*.rules`
  - standard execpolicy
- `.codex/rules-auto-net/*.rules`
  - non-interactive network-enabled execpolicy
- `scripts/codex-safe.ps1`
- `scripts/codex-safe.sh`
  - wrapper / preflight
- `scripts/verify`
- `scripts/verify.ps1`
  - repository verification gate

### Main flow

```text
Codex tool request
    ↓
project hook configuration
    ↓
PreToolUse
    ↓
tool_name / tool_input の実行対象だけを抽出
    ↓
common semantic safety policy
    ├─ safe       → stdout empty / exit 0
    └─ destructive→ valid deny output / exit 0
    ↓
mode-specific approval / sandbox / execpolicy
    ↓
tool execution
```

責務を次のように分離する。

```text
PreToolUse
= Full Access を含めて越えてはいけない共通 safety boundary

execpolicy
= preset / approval mode ごとの allow / prompt / forbidden 制御

wrapper
= unsafe Codex 起動 option の抑止 + execpolicy preflight

GitHub protection
= server-side 最終保護層（今回の主実装対象外）
```

### Key abstractions

1. Hook wire adapter
   - current Codex input / output contract のみに責務を持つ。
2. Tool input extractor
   - `tool_name` ごとに実際に実行対象となる command / patch 等だけを抽出する。
3. Common destructive policy
   - pure function として command / operation を classify する。
4. Git context resolver
   - read-only Git command だけで current branch / protected branch / upstream 等を確認する。
5. Execpolicy smoke contract
   - static prefix rule の期待値を検証する。
6. Real-run acceptance
   - Hook engine 自体の発火 / enforcement を検証する。

### Existing tests / validation

- `scripts/codex-safe.ps1` / `.sh` の preflight
- `codex execpolicy check`
- `scripts/verify` / `scripts/verify.ps1`
- repository contract tests

不足しているもの:

- PreToolUse wire-format unit / contract test
- false-positive test
- Git context dependent deny test
- Full Access real-run enforcement test

### Safe change surface

- Codex development harness / repository policy のみ。
- Product code / product tests / application runtime には触れない。
- Git history を書き換える migration は不要。
- Existing safe / readonly / auto-net profile 自体を新 profile へ置き換えない。

### Unknowns

- Installed Codex CLI version で project hook trust が現在どの状態にあるか。
- Full Access 相当 mode で project PreToolUse が実際に発火・deny enforcement されるか。
- current runtime で shell tool の `tool_input` shape が tool name ごとに具体的にどう渡るか。

これらは Wave 0 / real-run acceptance で実測し、実測できない状態で guard 完成を宣言しない。

### Impacted areas

- Codex project config
- Codex hook implementation
- execpolicy rule set
- wrapper preflight
- verification scripts
- safety documentation
- agent working agreement

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

新規候補:

- `.codex/hooks/pre_tool_use_policy.mjs`
- Hook policy contract test file

実装時に Current Repository を再確認し、不要なファイル変更は増やさない。

## 5. 変更方針

### Change strategy

#### Wave 0 — Current runtime / contract rebaseline

目的:

PreToolUse を「動くはず」で直さず、current installed Codex と current upstream contract の両方を確認する。

実施:

1. installed Codex version を記録する。
2. project config が load されていることを確認する。
3. hook trust / project trust 状態を確認する。
4. current `openai/codex` の PreToolUse input / output schema と parser behavior を確認する。
5. harmless diagnostic hook input を sanitization した形で確認し、実 runtime の `tool_name` / `tool_input` shape を固定する。
6. normal permission mode / Full Access 相当 permission mode の双方で hook が呼ばれるかを確認する。

Gate:

- Full Access で PreToolUse 自体が発火しない場合、repository-local common guard だけで要件を満たせないため Blocked とする。
- その場合、Hook を動いたことにして Git mutation を解禁しない。

#### Wave 1 — Hook registration を現行 contract へ修正

1. `.codex/config.toml` の hook feature key を current key へ移行する。
2. `pwsh` hard dependency を外し、Node.js ベースの cross-platform hook command へ移行する。
3. matcher は必要な tool family に限定しつつ、Git shell execution を取りこぼさない範囲にする。
4. config load / hook invocation の smoke test を追加する。

方針:

- 新 profile は作らない。
- Full Access 用 profile も作らない。
- common hook は profile 外の project-level hook として維持する。

#### Wave 2 — Hook wire adapter / canonical implementation を単一化

1. canonical hook implementation を Node.js 1本へ集約する。
2. safe case:
   - stdout は空
   - exit code 0
   - explicit `decision: allow/approve` を返さない
3. deny case:
   - current Codex が有効に解釈する deny shape のみ返す
   - schema 外 property を返さない
   - non-empty reason を必須にする
4. malformed input:
   - current hook engine behaviorと安全性を踏まえ、fail-open / fail-close の方針を明示的にテストする
   - JSON parse failure を黙って安全判定にしない
5. PowerShell / Python の重複ロジックを廃止する。

重複実装の整理は command-based deletion では行わず、reviewable patch として扱う。

#### Wave 3 — Payload 全探索を廃止し、tool-specific extraction へ変更

現在の recursive `content` / `text` scan をやめる。

実装原則:

- `tool_name` を最初に判定する。
- shell 系 tool は `tool_input` の実 command field のみを見る。
- patch / edit tool は operation type と対象 path / patch metadata だけを見る。
- source code / Markdown content に危険 command の文字列が含まれるだけでは block しない。

必須 false-positive test:

- Markdown に `git push --force is forbidden` と書く編集は許可される。
- Test fixture に destructive command の文字列を書く編集は許可される。
- 実 shell command として同じ文字列を実行する場合だけ block される。

#### Wave 4 — Common Git safety policy を semantic rule へ再設計

##### 許可対象

共通 Hook では次を一律禁止しない。

- `git status`
- `git diff`
- `git log`
- `git show`
- `git fetch`
- safe branch switch / creation
- `git add <explicit paths>`
- non-protected branch 上の通常 commit
- non-protected current branch の通常 push
- initial upstream 設定を伴う同名 branch push

##### 共通禁止 — history rewrite

- `git reset --hard`
- `git rebase` family
- `git commit --amend`
- `git push --force`
- `git push -f`
- `git push --force-with-lease`
- force refspec `+...`
- `git tag -f`
- `git update-ref`
- `git replace`
- `git filter-branch`

##### 共通禁止 — data loss / destructive working tree mutation

- `git clean` destructive modes
- `git restore` で working tree change を破棄する操作
- `git checkout -- <path>` 等の file restore mutation
- `git switch -C`
- `git switch --discard-changes`
- `git switch --orphan`
- `git branch -D`
- `git stash drop`
- `git stash clear`
- `git reflog expire`
- destructive prune / aggressive history cleanup
- `git rm` の通常削除

##### 共通禁止 — remote / destination mutation

- protected branch への直接 push
- `git push --delete`
- delete refspec `:<branch>`
- `git push --mirror`
- arbitrary destination refspec `source:other-branch`
- `git remote add`
- `git remote set-url`
- `git remote remove`

##### protected branch 判定

Hardcoded repository URL には依存しない。

優先順位:

1. local `origin/HEAD` 等から current repository default branch を read-only に解決する。
2. 解決不能時は `main` / `master` を fallback protected branch とする。

current branch が protected branch の場合:

- commit を block
- push を block

##### safe push contract

許可対象は原則として次だけに狭める。

```text
current branch = feature/foo
remote = origin
destination = feature/foo
force/delete/mirror/custom refspec なし
```

許可例:

```bash
git push
git push origin feature/foo
git push -u origin feature/foo
```

ただし bare `git push` は upstream が以下を満たす場合のみ許可する。

- remote = `origin`
- upstream branch name = current branch name
- destination is not protected

安全条件を機械的に確認できない push は allow に推測せず deny する。

#### Wave 5 — execpolicy を common semantic guard と整合させる

1. `.codex/rules/30-destructive-forbidden.rules` から `git add` / 通常 `commit` / 通常 `push` の blanket forbidden を外す。
2. prefix だけで安全に表現できる destructive command は common forbidden に残す / 追加する。
3. context が必要な protected branch / refspec 判定は Hook を SSOT にする。
4. `20-risky-prompt.rules` は safe mode の approval UX として必要な範囲だけ維持する。
5. auto-net は approval `never` でも common Hook を通る前提とし、safe forward Git operation まで blanket forbid しない。
6. rebase / destructive checkout / merge 等、今回自動化不要な高リスク family は auto-net で引き続き forbidden にしてよい。

重要:

execpolicy と Hook で同じ複雑な parser logic を二重実装しない。

#### Wave 6 — Wrapper preflight / Hook contract test

Wrapper preflight の期待値を更新する。

旧期待:

```text
git add . => forbidden
```

新期待例:

```text
git status              => allow
git add file            => allow または mode-specific non-forbidden
git commit -m test      => blanket forbidden ではない
git reset --hard HEAD   => forbidden
git rebase main         => forbidden / common deny
git push --force        => forbidden / common deny
```

Hook 単体 contract test は最低限以下を持つ。

##### Wire contract

- valid safe input → exit 0 / stdout empty
- valid deny input → current schema/parser compatible deny JSON
- deny reason empty → test failure
- schema 外 field → test failure
- malformed payload → decided behavior を固定

##### Git policy

- add explicit file → allow
- normal commit on feature branch → allow
- amend → deny
- commit on protected branch → deny
- normal same-name feature push → allow
- initial upstream feature push → allow
- force → deny
- force-with-lease → deny
- delete push → deny
- HEAD:main → deny
- feature:other → deny
- remote set-url → deny
- reset hard → deny
- rebase → deny
- destructive restore → deny
- branch -D → deny

##### False-positive

- Markdown / source content に destructive command 文字列を書く → allow
- コメント / test fixture に `rm` や `git push --force` がある → allow

#### Wave 7 — Full Access real-run acceptance

これは必須 Gate とする。

Disposable branch / disposable file を用い、実際の Codex runtime で次を確認する。

1. safe file edit が実行できる。
2. `git add` が common Hook で block されない。
3. feature branch の通常 commit が common Hook で block されない。
4. destructive command probe を実行しようとすると tool execution 前に deny される。
5. Full Access 相当 permission mode でも同じ destructive probe が deny される。
6. deny 後に target repository state が変化していない。

Probe は実害が出ない disposable target / intentionally invalid target を使い、実 repository history を危険に晒さない。

Full Access で Hook が発火しない場合:

- Git blanket forbidden を単純に解除しない。
- blocker として記録する。
- Codex runtime / trusted policy 側の追加境界が必要かを別判断にする。

#### Wave 8 — Documentation / governance sync

更新対象:

- `AGENTS.md`
- `docs/reference/codex-safety-harness.md`
- `.codex/rules/README.md`
- `.codex/requirements.toml`
- 必要なら `docs/PROJECT_CONTEXT.md`

明文化する内容:

- safe forward Git workflow は許可される。
- protected branch / destructive history mutation は Full Access でも禁止する。
- execpolicy / PreToolUse / wrapper の責務分離。
- Hook unavailable / unsupported runtime を safe と誤認しない。
- Full Access は「何でも実行してよい」の意味ではなく、project common guard は残る。

### 実行タスク

- [ ] 1. Current Codex version / hook trust / Full Access hook invocation を実測する。
- [ ] 2. current upstream hook schema / parser と repository config の差分を確定する。
- [ ] 3. `.codex/config.toml` を current hook feature / cross-platform command へ移行する。
- [ ] 4. canonical PreToolUse implementation を単一化する。
- [ ] 5. safe output / deny output を current wire contract へ修正する。
- [ ] 6. tool-specific input extraction を実装し recursive content scan を廃止する。
- [ ] 7. common destructive Git policy を実装する。
- [ ] 8. protected branch / safe push context check を実装する。
- [ ] 9. execpolicy blanket Git mutation ban を安全に緩和する。
- [ ] 10. auto-net rules を新 common guard と整合させる。
- [ ] 11. wrapper preflight を更新する。
- [ ] 12. PreToolUse contract / policy tests を追加する。
- [ ] 13. verification entry point へ Hook tests を統合する。
- [ ] 14. normal permission real-run を行う。
- [ ] 15. Full Access real-run destructive negative test を行う。
- [ ] 16. Windows で verification / real-run を確認する。
- [ ] 17. macOS / Linux 互換性を利用可能環境で確認する。
- [ ] 18. safety docs / AGENTS / requirements を同期する。
- [ ] 19. final diff / required validation を実行する。

## 6. 検証方法

### Validation plan

#### A. Static / config validation

- TOML parse
- current Codex hook feature key の確認
- hook command の cross-platform dependency 確認
- duplicate policy implementation が残っていないことの確認

#### B. Execpolicy

代表 command を `codex execpolicy check` で検証する。

最低限:

```text
git status
git diff
git add file
git commit -m test
git reset --hard HEAD
git rebase main
git push --force
git rm file
rm file
```

static prefix で判断できない protected branch 等は execpolicy test ではなく Hook test へ寄せる。

#### C. Hook contract test

- stdin fixture → stdout / exit code
- current schema compatible output
- current parser behavior と一致
- false positive がない
- Git context fixture / temporary repository による protected/current/upstream 判定

Temporary Git repository を使う場合も destructive test target は disposable directory に限定する。

#### D. Wrapper

- `scripts/codex-safe.ps1 -PreflightOnly`
- `bash scripts/codex-safe.sh --preflight-only`
- safe / readonly / auto-net preset の期待 decision

#### E. Repository verification

- `bash scripts/verify`
- PowerShell verify
- applicable lint / contract tests
- `git diff --check`

#### F. Real-run acceptance

Normal mode:

- safe tool operation 発火
- Hook safe path
- destructive negative probe deny

Full Access 相当 mode:

- Hook invocation を観測
- destructive negative probe deny
- deny 後に state unchanged

Hook invocation / block が観測できない場合は FAIL / BLOCKED。

### 成功判定

次をすべて満たした場合のみ完了。

```text
Hook registration valid
+
Hook wire contract valid
+
Safe Git forward operation not blanket-blocked
+
Destructive Git operation denied
+
Protected branch direct mutation denied
+
False-positive regression test PASS
+
Normal real-run PASS
+
Full Access real-run deny PASS
+
Wrapper / execpolicy / docs parity PASS
```

Unit / contract test だけでは Full Access protection の証明にしない。

## 7. リスクと未解決論点

### Risks

#### R1. Hook が Full Access で bypass される

最重要リスク。

対策:

- 実装前提にせず Wave 0 / Wave 7 で real-run 証明する。
- FAIL なら Git blanket ban を解除した状態で完了扱いにしない。

#### R2. Safe push parser の抜け道

refspec / option order / short option / `--` 等で destination 判定を誤る可能性がある。

対策:

- allowlist 方式で safe shape を狭く定義する。
- 理解できない push syntax は deny する。
- shell 全文の万能 parser は作らない。

#### R3. False positive

content scan を残すと document / test code 内の危険文字列まで block する。

対策:

- tool-specific input extraction。
- false-positive regression test を必須化。

#### R4. PowerShell / Python / Node の多重実装

policy drift が再発する。

対策:

- canonical implementation を1本にする。
- wrapper は policy logic を再実装しない。

#### R5. execpolicy と Hook の責務重複

同じ command が mode により矛盾する可能性がある。

対策:

- semantic destructive policy は Hook。
- static mode policy は execpolicy。
- preflight / tests で parity を固定する。

#### R6. protected branch metadata がない clone

`origin/HEAD` がない場合がある。

対策:

- local metadata 解決を優先。
- `main` / `master` fallback。
- 解決不能状態で push を広く許可しない。

#### R7. Hook failure を allow と誤認する

Hook process crash / invalid JSON が command allow に見える可能性がある。

対策:

- contract test。
- real-run acceptance。
- Hook unavailable 状態を docs で明示。
- failure behavior を current Codex runtime で確認する。

### Open questions

- Full Access 相当 permission mode で project PreToolUse が現在の installed Codex により強制されるか。
- current shell tools の runtime `tool_input` shape が upstream generic schemaだけで十分に安定しているか。

これらは owner decision ではなく runtime capability question なので、Wave 0 で解決する。

## 8. 成果物

### 変更ファイル

実装時の expected set:

- `.codex/config.toml`
- `.codex/hooks/pre_tool_use_policy.*`
- `.codex/rules/*.rules`
- 必要な `.codex/rules-auto-net/*.rules`
- `scripts/codex-safe.ps1`
- `scripts/codex-safe.sh`
- `scripts/verify`
- `scripts/verify.ps1`
- Hook contract test
- `AGENTS.md`
- `.codex/rules/README.md`
- `.codex/requirements.toml`
- `docs/reference/codex-safety-harness.md`
- 必要な場合のみ `docs/PROJECT_CONTEXT.md`

### 付随ドキュメント

- 本計画書
- 実装時の Run Artifact
- Full Access real-run の必要な要約 evidence

`docs/reports/` はこの計画だけでは生成しない。durable report が別途必要になった場合のみ repository policy に従う。

## 9. 備考

### 設計原則

今回の変更では、次の境界を崩さない。

```text
Full Access
≠ project safety policy 無効
```

目標は Full Access を弱めることではなく、Full Access でも維持するべき最小かつ本質的な安全境界を正しく定義することである。

同時に、次も成立させる。

```text
安全性
≠ Git mutation 全面禁止
```

通常の feature branch workflow は前進操作として許可し、既存履歴・作業状態・protected branch を破壊し得る操作だけを共通で止める。

### Upstream contract reference

実装時は current `openai/codex` の以下を primary reference とする。

- PreToolUse command input schema
- PreToolUse command output schema
- hook output parser
- upstream hook tests

Repository 内の古いコメントや旧実装より current upstream contract と actual installed runtime evidence を優先する。
