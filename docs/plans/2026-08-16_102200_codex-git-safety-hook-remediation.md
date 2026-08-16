# Codex Full Access 最小安全ガード / PreToolUse 修復計画

## 0. 目的

Codex を Full Access で使うときも、**明確に破壊的な操作だけは repository 共通ポリシーとして拒否する**。

通常の開発作業は止めない。

この Plan の責務は次の2点だけとする。

1. 現在の `PreToolUse` Hook を現行 Codex contract に合わせて正常化する。
2. Full Access でも残すべき最小限の destructive guard を実装・検証する。

通常 Git workflow、stage ownership、完全な shell parser、追加 Hook、独自安全基盤は作らない。

**Primary / Required execution environment は Windows native とする。**

```text
Windows native
├─ Codex
├─ Git for Windows
├─ Node.js
└─ Windows PowerShell (`powershell.exe`)
```

WSL は必須にしない。macOS / Linux 対応は壊さないが、この Plan の Required Acceptance には含めない。

---

## 1. 最終設計

### 1.1 Hook は `PreToolUse` 1種類だけ使う

```text
Hooks framework
└─ PreToolUse
   └─ Bash only
      └─ .codex/hooks/pre_tool_use_policy.mjs
```

追加しないもの:

- `PermissionRequest`
- `PostToolUse`
- `SessionStart` / `SessionEnd`
- `UserPromptSubmit`
- Subagent 系 Hook

今回必要なのは「危険操作を tool 実行前に止めること」だけである。

### 1.2 Matcher は `Bash` だけにする

```toml
[[hooks.PreToolUse]]
matcher = "^Bash$"
```

`Bash` は Hook 上の canonical tool name であり、Windows で Bash / WSL を起動するという意味ではない。

`Shell` / `PowerShell` 等の alias を並べない。

`apply_patch` も matcher から外す。

- command-based deletion と intentional patch edit を分離する。
- `apply_patch` の Add / Update / Delete / Move は通常開発操作として common Hook では止めない。

### 1.3 Canonical Hook は Node.js 1本

```text
.codex/hooks/pre_tool_use_policy.mjs
```

- PowerShell / Python に policy logic を重複させない。
- 現在の `.ps1` / `.py` は runtime 参照を外し、検証後に削除する。
- Node.js は repository の既存 runtime を使い、新Dependencyは追加しない。
- Windows PowerShell は launcher に限定し、安全判定ロジックを持たせない。

### 1.4 Config は Windows `command_windows` を正本にする

```toml
[features]
hooks = true

[[hooks.PreToolUse]]
matcher = "^Bash$"

[[hooks.PreToolUse.hooks]]
type = "command"
command = "..."         # macOS / Linux fallback
command_windows = "powershell.exe -NoProfile -Command \"... resolve repo root ...; node ...pre_tool_use_policy.mjs\""
timeout = 30
```

方針:

- deprecated alias `codex_hooks` は残さない。
- `command_windows` を Windows native の Required path とする。
- `powershell.exe` は repository root 解決と Node Hook 起動だけに使う。
- `pwsh` を必須依存にしない。
- WSL を要求しない。
- repository root / nested subdirectory のどちらからでも Hook を起動できることを Windows で必須確認する。
- macOS / Linux 用 `command` は互換性維持のため残すが、未検証でも Windows Required Acceptance の完了を妨げない。

### 1.5 Windows launcher の I/O / exit code 契約

Windows launcher は policy を持たず、Codex と Node Hook の transport だけを担当する。

必須契約:

```text
Codex hook stdin JSON
      ↓ unchanged
powershell.exe launcher
      ↓ unchanged
Node Hook stdin

Node stdout -> Codex stdout
Node stderr -> Codex stderr
Node exit code -> launcher exit code -> Codex
```

具体的には次を満たす。

- launcher は Hook payload を加工・再構築しない。
- Node process が Codex からの stdin を受け取れること。
- Node の stdout / stderr を抑制・JSON再変換しない。
- Node exit code を `$LASTEXITCODE` 等から取得し、そのまま launcher の exit code にする。
- repository root 解決失敗は non-empty stderr + `exit 2`。
- Node executable / Hook file 解決失敗は non-empty stderr + `exit 2`。
- Node Hook が `exit 2` を返した場合、launcher も `exit 2` を返す。

実装方式は inline PowerShell でも薄い launcher file でもよいが、**安全判定ロジックを PowerShell 側へ複製しない**。

### 1.6 Hook output 契約

Safe:

```text
exit 0
stdout empty
stderr empty
```

Policy deny:

- current Codex の structured `PreToolUse` deny output を正本とする。
- non-empty reason を返す。

Malformed JSON / Hook 内部例外 / launcher safety failure:

```text
exit 2
stderr non-empty
```

Wave 0 で Windows installed runtime が structured deny と `exit 2` の両方を実際に block と扱うことを確認する。

---

## 2. 現状の問題

### 2.1 Hook registration が古い

現在:

```toml
[features]
codex_hooks = true
```

`hooks` へ変更する。

### 2.2 Matcher が広すぎる

現在:

```text
Bash|Shell|PowerShell|apply_patch|Edit|Write
```

今回必要なのは `Bash` だけである。

### 2.3 Hook implementation が二重化している

現在:

- `.codex/hooks/pre_tool_use_policy.ps1`
- `.codex/hooks/pre_tool_use_policy.py`

Node.js 1本へ統一する。

### 2.4 Hook command が `pwsh` + relative path 固定

現在の方式は PowerShell 7 availability と cwd に依存する。

Windows native の正本を `command_windows` + `powershell.exe` launcher + Node Hook にする。

### 2.5 Payload 全体を recursive scan している

現在は `command`, `content`, `text`, `patch` 等を広く走査しているため false positive を作り得る。

新 Hook は `tool_name == "Bash"` の actual command input だけを見る。

### 2.6 Git 通常操作を blanket deny している

現在の Hook / common execpolicy は `git add`, `git commit`, `git push` を包括禁止している。

これは common destructive policy から外す。

### 2.7 `apply_patch` Delete / Move を Hook で止めている

intentional patch edit は通常開発操作として扱い、common Hook から外す。

### 2.8 Hard forbidden に通常操作が混ざっている

`.codex/rules/30-destructive-forbidden.rules` のうち最低限次を見直す。

```text
git add / commit / push blanket forbidden
python -c / python - blanket forbidden
kubectl apply
terraform apply
Invoke-Expression / iex blanket forbidden
```

`Invoke-Expression` 自体を全面禁止する代わりに、remote download を直接 `iex` / `Invoke-Expression` へ pipe する明確な危険形だけを common deny とする。

### 2.9 Wrapper preflight が旧policyを前提にしている

`scripts/codex-safe.ps1` / `.sh` の preflight は現在 `git add` 等の旧decisionを期待している。

common Rules を変更したら wrapper preflight も同じcommit / PRで同期する。

Windows Required Gateでは `scripts/codex-safe.ps1` の decision expectation を必須確認する。

---

## 3. Full Access common deny

### 3.1 原則

**包括的 allowlist は作らない。**

```text
明確な destructive pattern
  -> deny

それ以外
  -> common guard では deny しない
```

通常の mutation を「安全だと証明できるまで禁止する」設計にはしない。

### 3.2 Git — history / ref rewrite

必ず deny:

- `git rebase` family
- `git commit --amend`
- `git push --force`
- `git push -f`
- `git push --force-with-lease`
- force refspec (`+...`)
- `git branch -f`
- `git branch -D`
- `git tag -f`
- `git update-ref`
- `git replace`
- `git filter-branch`

#### `git reset` は destructive form だけ deny

`git reset` family 全体を blanket deny しない。

Allow例:

```text
git reset -- path/to/file
git reset HEAD -- path/to/file
```

これは path-based index unstage として扱う。

Deny例:

```text
git reset --soft HEAD~1
git reset --mixed HEAD~1
git reset --hard HEAD
git reset --merge ...
git reset --keep ...
git reset HEAD~1
```

実装では path-based form と revision / mode form を最小限区別し、Git reset 全構文を再実装しない。

曖昧で安全性を確定できない reset form は destructive form として deny してよいが、明示的な `-- <path>` unstage は block しない。

### 3.3 Git — working data loss

必ず deny:

- `git clean` family
- `git rm`
- `git stash drop`
- `git stash clear`
- working tree を破棄する `git restore`
- `git switch -C`
- `git switch --discard-changes`
- `git reflog expire`
- destructive / aggressive prune

`git restore --staged <path>` のような index-only unstage は allowする。
`--worktree` を伴うもの、または working tree をrestoreする形は denyする。

#### `git checkout` の destructive form

Deny:

```text
git checkout -f ...
git checkout --force ...
git checkout -B ...
git checkout -- path/to/file
git checkout <tree-ish> -- path/to/file
```

通常の branch switch は allow:

```text
git checkout feature/x
git switch feature/x
```

### 3.4 Git — remote destruction

必ず deny:

```text
git push --delete ...
git push -d ...
git push origin :feature/x
git push --prune origin
git push --mirror
```

空source refspecによるremote ref deleteもdenyする。

### 3.5 Protected branch direct update

repository-local protected set:

```text
main
master
resolved repository default branch
```

Default branch は local `origin/HEAD` 等の read-only metadata から解決する。

Protected branch 上では最低限次を deny:

- `git commit`
- `git merge`
- `git cherry-pick`
- `git revert`
- `git pull`

Protected branch への直接 push も deny:

```text
git push origin main
git push origin HEAD:main
main 上で bare git push
```

multi-ref / implicit push で protected branch を更新し得ることを安全に判定できない場合は、そのpushだけdenyしてよい。

GitHub Ruleset 全体を API で同期する仕組みは作らない。

### 3.6 通常 Git 操作は common guard で blanket deny しない

```text
git add
git commit                  # non-protected branch
git push                    # non-protected destination
git fetch
git pull                    # non-protected branch
git switch
git checkout                # normal branch switch
git merge                   # non-protected branch
git cherry-pick             # non-protected branch
git revert                  # non-protected branch
git stash push/apply/pop
git tag                     # non-force
git worktree
git reset -- <path>         # unstage
git restore --staged <path> # unstage
```

---

## 4. 非Git Full Access common deny

新しい非Gitポリシーは増やさない。

現在の hard deny / Hook deny を **「明確な破壊・削除か」** だけで整理する。

### 4.1 残す

- command-based file deletion (`rm`, `del`, `erase`, `rmdir`, `unlink`, `Remove-Item`)
- `find ... -delete`
- `rsync --delete`
- `robocopy /MIR`
- forced overwrite (`mv -f`, `Move-Item -Force`, `Rename-Item -Force`)
- Docker prune
- `terraform destroy`
- `kubectl delete`
- `helm uninstall`
- `aws s3 rm`
- `az group delete`
- `gcloud projects delete`
- remote script piping to shell / `iex` / `Invoke-Expression`

### 4.2 Full Access common hard deny から外す

- `terraform apply`
- `kubectl apply`
- `python -c`
- `python -`
- standalone `iex` / `Invoke-Expression`
- `apply_patch` Add / Update / Delete / Move

`npm publish` / `unpublish` / `version`、`pip uninstall` 等の既存 external/release/environment policy は今回の中心課題ではないため再設計しない。

---

## 5. execpolicy / PreToolUse / preset の責務

### 5.1 common execpolicy

static に表現できる destructive prefix の正本とする。

例:

```text
git rebase
git clean
git rm
git update-ref
obvious force push
rm / Remove-Item
terraform destroy
kubectl delete
...
```

`git reset` は非破壊的path formを許可する必要があるため、単純な family blanket forbidden にしない。

### 5.2 PreToolUse

次の補完だけ担当する。

1. argument / refspec 内に現れる destructive option
   - `commit --amend`
   - force push variants
   - push delete / prune / mirror / force refspec
   - destructive reset / restore / checkout
2. context-sensitive protected branch判定
3. execpolicyだけでは表しづらい既存 destructive pattern

### 5.3 同じ parser を二重実装しない

- execpolicy は prefix / argv で表現できる範囲。
- PreToolUse は actual Bash command text + repository context の最小判定。
- 完全な shell grammar を再実装しない。
- PreToolUse が観測しない `write_stdin` / arbitrary child process まで完全監視する仕組みは作らない。

### 5.4 preset-specific policyとの境界

今回の正本は **Full Accessでも残す common destructive boundary** である。

次は別policyとして扱い、今回全面再設計しない。

```text
repo_safe 固有の prompt / restriction
repo_auto_net 固有の forbidden / allow
repo_readonly 固有の read-only 制約
```

特に `.codex/rules-auto-net/**` の branch switch / merge / shell wrapper 等の追加制限は、Full Access common policyとは別物である。

ただし次は同期対象:

- 削除する legacy Hook (`.py` / `.ps1`) を参照するcomment / docs。
- common Rules変更によって壊れる wrapper preflight expectation。
- Full Access runtimeへcommon Rules以外のruleが意図せず干渉することがWave 0で実測された場合の最小修正。

**presetを軽くするためだけに `.codex/rules-auto-net/**` を今回まとめて変更しない。**

### 5.5 Full Access Acceptanceはsafe wrapperを正本にしない

`scripts/codex-safe.ps1` は危険なCLI overrideを意図的に拒否するため、Full Access Acceptanceの起動経路には使わない。

Full Access検証は、ユーザーが実際に使用する Full Access route を直接使用する。

wrapper は通常presetのpreflight / regression確認だけに使う。

---

## 6. 実装 Wave

### Wave 0 — installed runtime確認（Windows Required）

Windows native で実装前に次を実測する。

- Codex version
- project Hook discovery / trust
- `[features].hooks`
- `PreToolUse` matcher `Bash`
- actual `tool_input.command`
- `command_windows` が使用されること
- root cwd / nested cwd の双方から Hook 起動
- launcher stdin pass-through
- launcher stdout / stderr pass-through
- Node exit code `2` -> launcher exit code `2` -> Codex block
- structured deny behavior
- actual Full Access routeでHook発火
- actual `permission_mode`
- Full Accessでcommon execpolicy `forbidden` が有効か
- Full Accessにsafe / auto-net固有ruleが意図せず干渉しないか

重要:

- Full Access と特定 `permission_mode` を事前に同一視しない。
- Full Accessでexecpolicyが有効なら static denyはRulesを正本とする。
- Full Accessでexecpolicyが無効なら同じ最小 static deny set をPreToolUse側にも保持する。
- この確認前に `git add/commit/push` blanket denyを解除しない。
- WSL / macOS / LinuxをWave 0 Gateにしない。

### Wave 1 — Hook runtime修復

- `[features].hooks = true`
- matcher `^Bash$`
- Node canonical Hook追加
- Windows `command_windows` 正本化
- launcher I/O / exit-code contract実装
- root / nested cwd Windows smoke
- macOS / Linux fallback `command` は互換性維持
- `.ps1` / `.py` runtime参照削除
- `/hooks` でchanged Hookをreview / trust

### Wave 2 — minimal destructive policy

- destructive Git deny
- path-based reset / staged restoreはallow
- destructive checkout / restore / resetだけdeny
- protected branch direct-update deny
- remote delete variants deny
-既存の明確な非Git destructive denyのみ移植
- `apply_patch` guard削除

### Wave 3 — execpolicy / wrapper同期

`.codex/rules/30-destructive-forbidden.rules` を common hard-deny 方針へ合わせる。

削除:

```text
git add / commit / push blanket forbidden
python -c / python - blanket forbidden
terraform apply forbidden
kubectl apply forbidden
standalone iex / Invoke-Expression forbidden
```

維持 / 強化:

- 明確な destructive prefix
- history rewrite
- force push
- command-based deletion
- infrastructure / cloud deletion

同時に:

- `scripts/codex-safe.ps1` preflight expectationを新Rulesへ同期する。
- bash wrapperに同じpreflight contractがある場合はそちらも同期する。
- Windows PowerShell wrapper preflightをRequired verificationとする。
- `.codex/rules-auto-net/**` はpreset固有policyとして原則維持する。
- legacy `.py` Hook参照commentはNode Hook参照へ更新する。

### Wave 4 — contract tests / verify（Windows Required）

正本:

```text
tests/contracts/codex-pre-tool-use-policy.test.ts
```

#### Allow

```text
git add file.ts
git commit -m test                  # feature branch
git push                            # feature branch
git push origin feature/x
git fetch origin
git switch feature/x
git checkout feature/x
git merge feature/y                 # feature branch
git cherry-pick <sha>               # feature branch
git revert <sha>                    # feature branch
git stash push
git tag v1.0.0
git worktree add ...
git reset -- file.ts
git reset HEAD -- file.ts
git restore --staged file.ts
python -c "print('ok')"
terraform apply ...
kubectl apply ...
```

#### Deny

```text
git reset --hard HEAD
git reset --soft HEAD~1
git reset --mixed HEAD~1
git reset HEAD~1
git rebase main
git commit --amend
git push --force origin feature/x
git push --force-with-lease origin feature/x
git push origin +feature/x
git clean -fd
git rm file.ts
git branch -D feature/x
git stash clear
git checkout -f feature/x
git checkout -B feature/x main
git checkout -- file.ts
git checkout HEAD -- file.ts
git restore file.ts
git restore --staged --worktree file.ts
git push origin --delete feature/x
git push origin :feature/x
git push --prune origin
git push --mirror
git push origin main
main 上の git commit
main 上の git merge
Remove-Item file.txt
terraform destroy
kubectl delete pod x
```

#### False positive

- source / Markdown / fixtureに `git push --force` と書くだけ -> allow
- `apply_patch` Add / Update / Delete / Move -> Hook対象外

#### Windows launcher

- repository rootからHook発火 -> PASS
- repository subdirectoryからHook発火 -> PASS
- `command_windows` -> `powershell.exe` -> Node Hook -> PASS
- stdin payloadがNodeまで同値で届く -> PASS
- Node safe: stdout/stderr empty + exit 0 -> PASS
- Node structured denyがそのままCodexへ届く -> PASS
- Node `exit 2` + stderr -> launcher `exit 2` -> Codex block -> PASS
- root解決失敗 / Node起動失敗を成功扱いしない -> PASS
- `pwsh`なしでRequired path成立 -> PASS
- WSLなしでRequired verification完結 -> PASS

#### Wrapper preflight

Windowsで:

- `scripts/codex-safe.ps1 -PreflightOnly` が新Rules expectationでPASS。
- `git add` 等の旧blanket-forbidden expectationが残っていない。
- destructive command expectationは引き続きforbidden。

### Wave 5 — actual acceptance（Windows Required）

Production checkoutでdestructive probeを実行しない。

Windows native上のTemporary clone + local bare remoteで確認する。

#### Normal preset / wrapper regression

- wrapper preflight PASS
- normal repository workが既存preset contractどおり動く
- preset固有制約は今回のcommon policyと混同しない

#### Full Access

`scripts/codex-safe.ps1` ではなく**actual Full Access route**で起動する。

確認:

- actual `permission_mode`記録
- Hook invocation evidence
- normal Git operation succeeds
- path-based unstage succeeds
- protected branch direct update blocked
- destructive reset / checkout / force push / remote delete blocked
- static Rulesが有効か記録
- denyがtool実行前に効く
- deny後にlocal / remote sentinelが変化していない

Windows Required AcceptanceがPASSすればplatform gateを満たす。

macOS / Linuxは利用可能ならsmokeを行うが、未実施をBLOCKED / FAILとしない。

### Wave 6 — docs同期

必要な範囲だけ更新する。

- `AGENTS.md`
- `docs/reference/codex-safety-harness.md`
- `.codex/rules/README.md`
- `.codex/requirements.toml`
- auto-net rule comment等のlegacy Hook参照

Windows nativeがPrimary / Required、macOS / Linuxはbest-effort compatibilityであることを同期する。

---

## 7. Non-goals

今回やらないこと:

- Hook種類の追加
- `PermissionRequest` / `PostToolUse`導入
- `apply_patch`監視
- Git全体のallowlist
- unknown Git mutation一律deny
- stage ownership管理
- clean working tree強制
- safe Git workflow設計
- merge / cherry-pick / revert / stash / tag / worktreeの包括禁止
- shell / REPL全面禁止
- complete shell parser
- `write_stdin` workaround基盤
- arbitrary child process監視
- GitHub Ruleset同期
- remote URL監査
- preset全体の再設計
- 新しい安全platform
- npm / package release policy全体の再設計
- WSL必須化
- macOS / LinuxをRequired Acceptanceにすること

---

## 8. 完了条件

次をすべて満たしたら完了とする。

```text
PreToolUse only
+
Bash matcher only
+
Node Hook policy 1本
+
canonical hooks feature key
+
Windows command_windows path PASS
+
launcher stdin/stdout/stderr/exit-code contract PASS
+
Windows root / nested cwd invocation PASS
+
Windows Full Access Hook invocation PASS
+
Windows native onlyでRequired verification完結
+
normal Git operations are not common blanket blocked
+
path-based git reset / restore --staged are not blocked
+
destructive reset / checkout / restore are blocked
+
force push / remote delete / prune / mirror are blocked
+
protected/default branch direct update blocked
+
python -c / terraform apply / kubectl apply are not Full Access common hard-blocked
+
normal apply_patch is not Hook-blocked
+
clear existing non-Git destructive operations blocked
+
PowerShell wrapper preflight synced
+
Full Access Acceptance does not rely on safe wrapper
+
preset-specific policy boundary documented
+
no complete custom shell parser
+
contract tests PASS
+
Windows wrapper regression PASS
+
Windows Full Access acceptance PASS
+
docs / rules / Hook behavior一致
```

macOS / Linux smokeはoptional evidenceとし、未実施でも完了可能とする。

この Plan の基準は一つだけである。

> **Full Access を実質的な制限モードへ戻さず、取り返しのつきにくい破壊だけを最小限止める。**

---

## 9. 実装時の参照優先順位

1. installed Codex actual behavior on Windows native
2. OpenAI Codex Hooks official documentation
3. OpenAI Codex Config Reference
4. OpenAI Codex Rules official documentation
5. Git official documentation for destructive / non-destructive command semantics
6. repository existing policy / implementation

Current upstreamの仕様とinstalled Windows runtimeが食い違う場合は、実測結果を記録してPlanを更新してから進める。
