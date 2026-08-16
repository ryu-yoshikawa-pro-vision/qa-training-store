# Codex Full Access 最小安全ガード / PreToolUse 修復計画

## 0. 目的

Codex を Full Access で使うときも、**通常開発を妨げず、取り返しのつきにくい破壊操作だけを repository 共通ポリシーとして拒否する**。

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

```text
Codex hook stdin JSON
      ↓ semantic-preserving pass-through
powershell.exe launcher
      ↓
Node Hook stdin

Node stdout -> Codex stdout
Node stderr -> Codex stderr
```

exit code は次のとおり扱う。

- Node `0` -> launcher `0`
- Node `2` -> launcher `2`
- Node の予期しない non-zero (`1`, `3` など) -> launcher が non-empty stderr を保証して `2` に正規化
- repository root 解決失敗 -> non-empty stderr + `exit 2`
- Node executable / Hook file 解決失敗 -> non-empty stderr + `exit 2`

PowerShell 側へ安全判定ロジックを複製しない。

### 1.6 PreToolUse input schema

Node Hook が JSON parse と schema validation の責任を持つ。

Required input:

```text
tool_name == "Bash"
tool_input is object
tool_input.command is string
```

次はすべて fail-close とする。

- malformed JSON
- `{}`
- `tool_name` 欠落 / `null` / `Bash` 以外
- `tool_input` 欠落 / `null` / object 以外
- `tool_input.command` 欠落 / `null` / string 以外

挙動:

```text
stdout empty
stderr non-empty
exit 2
```

Payload 全体の recursive scan は行わない。policy 判定対象は `tool_input.command` のみとする。

### 1.7 Hook output 契約

| Case | stdout | stderr | exit | Expected Codex verdict |
| --- | --- | --- | --- | --- |
| Safe | empty | empty | `0` | tool continues |
| Policy deny | structured `PreToolUse` deny JSON | empty | `0` | tool blocked |
| Invalid JSON / schema | empty | non-empty | `2` | tool blocked |
| Hook internal error | empty | non-empty | `2` | tool blocked |
| Launcher failure | empty | non-empty | `2` | tool blocked |
| Unexpected Node non-zero | empty or Node stderr | non-empty ensured by launcher | normalized to `2` | tool blocked |

新 Hook が出力する deny の正本は次とする。

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "<non-empty reason>"
  }
}
```

legacy `{"decision":"block","reason":"..."}` は新 Hook からは出力しない。ただし installed runtime の移行互換確認として Wave 0 で一度だけ block として扱われることを確認する。

`exit 2 + stderr` も installed runtime 上で実際に block になることを Wave 0 で確認する。

### 1.8 Timeout は安全境界として決め打ちしない

Hook timeout 時の Codex の実挙動は installed runtime で確認する。

- Wave 0 で人工的な timeout を1回発生させ、actual verdict を記録する。
- timeout が tool continuation になる runtime であっても、完全な enforcement boundary を追加実装しない。
- 代わりに production Hook 自体を短時間・同期処理に限定し、通常ケースが timeout しないことを Required Acceptance とする。
- timeout に依存して destructive operation を止める設計にはしない。

---

## 2. 現状の問題

### 2.1 Hook registration が古い

現在の `[features].codex_hooks` は `hooks` へ変更する。

### 2.2 Matcher が広すぎる

現在の `Bash|Shell|PowerShell|apply_patch|Edit|Write` を `^Bash$` へ絞る。

### 2.3 Hook implementation が二重化している

現在の `.ps1` / `.py` policy を Node.js 1本へ統一する。

### 2.4 Hook command が `pwsh` + relative path 固定

Windows native の正本を `command_windows` + `powershell.exe` launcher + Node Hook にする。

### 2.5 Payload 全体を recursive scan している

documentation / source / fixture に危険command文字列を書いただけで false positive になり得るため廃止する。

### 2.6 Git 通常操作を blanket deny している

common Hook / execpolicy から `git add`, `git commit`, `git push` の包括禁止を外す。

### 2.7 `apply_patch` Delete / Move を common Hook で止めている

intentional patch edit は通常開発操作として common Hook 対象外にする。

### 2.8 Hard forbidden に通常操作が混ざっている

Full Access common hard deny から最低限次を外す。

```text
git add / commit / push blanket forbidden
python -c / python - blanket forbidden
kubectl apply
terraform apply
standalone Invoke-Expression / iex
```

remote download を直接 shell / `iex` へ pipe する形は引き続き deny する。

### 2.9 Wrapper / verify が旧policyを前提にしている

次を同じ実装PRで同期する。

- `scripts/codex-safe.ps1` preflight
- `scripts/codex-safe.sh` preflight
- `scripts/verify.ps1` template contract
- `scripts/verify` template contract
- legacy `.py` / `.ps1` Hook を必須ファイルとして参照する tests / docs / comments

Node 一本化後に旧 Hook file を Required Path として残さない。

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

通常 mutation を「安全だと証明できるまで禁止する」設計にはしない。

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

Allow:

```text
git reset -- path/to/file
git reset HEAD -- path/to/file
```

Deny:

```text
git reset --soft HEAD~1
git reset --mixed HEAD~1
git reset --hard HEAD
git reset --merge HEAD~1
git reset --keep HEAD~1
git reset HEAD~1
```

明示的な `-- <path>` unstage は block しない。

### 3.3 Git — working data loss

必ず deny:

- `git clean` family
- `git rm`
- `git stash drop`
- `git stash clear`
- working tree を変更する `git restore`
- `git switch -C`
- `git switch --discard-changes`
- `git reflog expire`
- `git prune`
- `git gc --prune=now`
- `git gc --prune=all`

Allow:

```text
git restore --staged <path>
```

Deny:

```text
git restore <path>
git restore --worktree <path>
git restore --staged --worktree <path>
```

#### destructive checkout

Deny:

```text
git checkout -f ...
git checkout --force ...
git checkout -B ...
git checkout -- path/to/file
git checkout <tree-ish> -- path/to/file
```

通常 branch switch は allow:

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

Protected set は repository local metadata のみで決める。

常時 protected:

```text
main
master
```

追加 protected:

- local `refs/remotes/origin/HEAD` が `refs/remotes/origin/<branch>` へ一意に解決できる場合、その `<branch>`

意図的に行わないこと:

- network access による remote default branch問い合わせ
- stale metadata の自動判定 / 更新
- 全remoteのdefault branch同期

`origin/HEAD` がない / 壊れている / 解決不能なら、`main` / `master` だけを protected set とする。

Detached HEAD は protected branch 自体を直接進めないため、それだけを理由に `git commit` を blanket deny しない。

Protected branch 上では最低限次を deny:

- `git commit`
- `git merge`
- `git cherry-pick`
- `git revert`
- `git pull`
- `git am`

Protected branch への直接 push も deny:

```text
git push origin main
git push origin HEAD:main
```

Bare / implicit push は、current branch と configured upstream / push destination から非protected destinationを確定できる場合だけ allowする。

multi-ref push は、いずれかのdestinationがprotected、またはdestinationを安全に解決できない場合、そのpush全体をdenyする。

### 3.6 Protected branch guarantee の境界

context-sensitive protected branch 判定は、**current working repository で直接実行される認識可能な Git command** を保証対象とする。

次を blanket deny する仕組みは作らない。

- `cd` / `pushd`
- `git -C`
- shell wrapper invocation
- compound command 全般
- arbitrary child process

これらは protected-branch context guarantee の範囲外であることを documentation に明記する。

一方、static destructive command は execpolicy / Hook の認識可能範囲で引き続きdenyする。

完全な shell parser を作ってこの境界を埋めない。

### 3.7 通常 Git 操作は common guard で blanket deny しない

```text
git add
git commit                  # non-protected branch
git push                    # resolved non-protected destination
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

現在のdenyのうち、明確な破壊・削除だけ残す。

必ず deny:

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

Full Access common hard deny から外す:

- `terraform apply`
- `kubectl apply`
- `python -c`
- `python -`
- standalone `iex` / `Invoke-Expression`
- `apply_patch` Add / Update / Delete / Move

`npm publish` / `unpublish` / `version`、`pip uninstall` 等の既存 external/release/environment policy は今回再設計しない。

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
rm / Remove-Item
terraform destroy
kubectl delete
...
```

非破壊path formを許可する必要があるcommandをfamily blanket forbiddenにしない。

### 5.2 PreToolUse

次の補完だけ担当する。

1. argument / refspec 内に現れる destructive option
   - `commit --amend`
   - force push variants
   - push delete / prune / mirror / force refspec
   - destructive reset / restore / checkout
2. context-sensitive protected branch判定
3. execpolicyだけでは表しづらい既存 destructive pattern
4. Hook input schema validation

### 5.3 同じ parser を二重実装しない

- execpolicy は prefix / argv で表現できる範囲。
- PreToolUse は actual Bash command text + repository context の最小判定。
- 完全な shell grammar を再実装しない。
- `write_stdin` / arbitrary child process まで完全監視する仕組みは作らない。

Hooks は guardrail であり、完全な sandbox / enforcement boundary とは扱わない。

### 5.4 preset-specific policyとの境界

今回の正本は **Full Accessでも残す common destructive boundary** である。

次は別policyとして扱い、今回全面再設計しない。

```text
repo_safe 固有の prompt / restriction
repo_auto_net 固有の forbidden / allow
repo_readonly 固有の read-only 制約
```

`.codex/rules-auto-net/**` の追加制限は、Full Access common policyとは別物として原則維持する。

ただし、legacy Hook参照、common Rules変更で壊れるwrapper preflight、verify contractは同期する。

### 5.5 Full Access Acceptanceはsafe wrapperを正本にしない

`scripts/codex-safe.ps1` は危険CLI overrideを意図的に拒否するため、Full Access Acceptanceには使わない。

Full Access検証は、ユーザーが実際に使用する Full Access route を直接使用する。

---

## 6. 実装 Wave

### Wave 0 — installed runtime確認（Windows Required）

実装前に Windows native で次を実測する。

- Codex version
- project Hook discovery / trust
- `[features].hooks`
- `PreToolUse` matcher `Bash`
- actual `tool_input.command`
- `command_windows` が使用されること
- root cwd / nested cwd の双方から Hook 起動
- safe: exit `0` + empty output -> continue
- structured deny -> block
- legacy `decision:block` -> blockするかの移行互換確認
- exit `2` + stderr -> block
- artificial timeout -> actual Codex verdictを記録
- actual Full Access routeでHook発火
- actual `permission_mode`
- Full Accessでcommon execpolicy `forbidden` が有効か
- Full Accessにsafe / auto-net固有ruleが意図せず干渉しないか

重要:

- Full Access と特定 `permission_mode` を事前に同一視しない。
- Full Accessでexecpolicyが有効なら static denyはRulesを正本とする。
- Full Accessでexecpolicyが無効なら、必要なstatic denyをPreToolUse側でも保持する。
- Hookがdisabled / untrustedでactual Full Access routeから発火しない状態は Acceptance FAIL とする。
- `execpolicy無効 + Hook無効`を別安全層で救済するfallback基盤は作らない。
- この確認前に `git add/commit/push` blanket denyを解除しない。

### Wave 1 — Hook runtime修復

- `[features].hooks = true`
- matcher `^Bash$`
- Node canonical Hook追加
- Windows `command_windows` 正本化
- launcher I/O / exit-code normalization実装
- Hook input schema validation実装
- root / nested cwd Windows smoke
- macOS / Linux fallback `command` は互換性維持
- `.ps1` / `.py` runtime参照削除
- `/hooks` でchanged Hookをreview / trust

### Wave 2 — minimal destructive policy

- destructive Git deny
- path-based reset / staged restoreはallow
- destructive checkout / restore / resetだけdeny
- protected branch direct-update deny
- protected branch上の `git am` deny
- remote delete variants deny
- 既存の明確な非Git destructive denyのみ移植
- `apply_patch` guard削除

### Wave 3 — execpolicy / wrapper / verify同期

`.codex/rules/30-destructive-forbidden.rules` を common hard-deny 方針へ合わせる。

同時に:

- `scripts/codex-safe.ps1` preflight expectation更新
- `scripts/codex-safe.sh` preflight expectation更新
- `scripts/verify.ps1` の Required Hook pathを `.mjs` へ更新
- `scripts/verify` の Required Hook pathを `.mjs` へ更新
- legacy `.py` / `.ps1` Hook参照comment / docs更新
- `.codex/rules-auto-net/**` はpreset固有policyとして原則維持

### Wave 4 — contract tests / verify（Windows Required）

正本:

```text
tests/contracts/codex-pre-tool-use-policy.test.ts
```

#### Input schema

すべて stderr non-empty + exit `2`:

```text
malformed JSON
{}
tool_name missing
tool_name = null
tool_name = Edit
tool_input missing
tool_input = null
tool_input = []
command missing
command = null
command = []
command = 123
```

#### Output contract fixtures

```text
safe                     -> exit 0 / stdout empty / stderr empty
structured deny          -> exit 0 / canonical deny JSON / block
internal error            -> exit 2 / stderr non-empty / block
unexpected Node exit 1    -> launcher exit 2 / stderr non-empty / block
unexpected Node exit 3    -> launcher exit 2 / stderr non-empty / block
root resolution failure   -> exit 2 / stderr non-empty / block
Node resolution failure   -> exit 2 / stderr non-empty / block
```

人工timeoutは runtime observation test とし、verdictを記録する。production Hookの通常fixtureはすべてtimeout未満で完了することを必須とする。

#### Allow

```text
git add file.ts
git commit -m test                  # feature branch
git push                            # resolved feature branch destination
git push origin feature/x
git fetch origin
git switch feature/x
git checkout feature/x
git merge feature/y                 # feature branch
git cherry-pick <sha>               # feature branch
git revert <sha>                    # feature branch
git stash push
git stash apply
git stash pop
git tag v1.0.0
git worktree add ...
git reset -- file.ts
git reset HEAD -- file.ts
git restore --staged file.ts
python -c "print('ok')"
terraform apply ...
kubectl apply ...
```

#### Git deny — policy宣言と1:1で対応

```text
git rebase main
git commit --amend
git push --force origin feature/x
git push -f origin feature/x
git push --force-with-lease origin feature/x
git push origin +feature/x
git branch -f feature/x HEAD~1
git branch -D feature/x
git tag -f v1 HEAD~1
git update-ref refs/heads/feature/x HEAD~1
git replace <old> <new>
git filter-branch ...

git reset --soft HEAD~1
git reset --mixed HEAD~1
git reset --hard HEAD
git reset --merge HEAD~1
git reset --keep HEAD~1
git reset HEAD~1

git clean -fd
git rm file.ts
git stash drop
git stash clear
git restore file.ts
git restore --worktree file.ts
git restore --staged --worktree file.ts
git switch -C feature/x main
git switch --discard-changes feature/x
git reflog expire --expire=now --all
git prune
git gc --prune=now
git gc --prune=all

git checkout -f feature/x
git checkout --force feature/x
git checkout -B feature/x main
git checkout -- file.ts
git checkout HEAD -- file.ts

git push origin --delete feature/x
git push origin -d feature/x
git push origin :feature/x
git push --prune origin
git push --mirror
```

#### Protected branch deny

Temporary repositoryでprotected branch上から:

```text
git commit
git merge
git cherry-pick
git revert
git pull
git am
git push origin main
git push origin HEAD:main
bare / implicit push whose destination resolves to protected branch
multi-ref push containing protected branch
multi-ref / implicit push whose destination cannot be safely resolved
```

追加ケース:

- `origin/HEAD -> origin/trunk` の場合 `trunk`をprotectedとしてdeny
- `origin/HEAD`なし -> `main` / `master`保護だけで動作
- broken `origin/HEAD` -> `main` / `master`保護だけで動作
- detached HEAD -> detachedであることだけを理由にcommitをdenyしない

#### 非Git deny

各宣言に最低1ケース:

```text
rm file.txt
del file.txt
Remove-Item file.txt
find . -name '*.tmp' -delete
rsync --delete ...
robocopy source dest /MIR
mv -f source dest
Move-Item -Force source dest
docker system prune
terraform destroy
kubectl delete pod x
helm uninstall x
aws s3 rm s3://bucket/key
az group delete --name x
gcloud projects delete x
curl ... | bash
irm ... | iex
```

#### False positive

- source / Markdown / fixtureに `git push --force` と書くだけ -> allow
- `apply_patch` Add / Update / Delete / Move -> Hook対象外

#### Windows launcher

Required:

- repository rootからHook発火
- repository subdirectoryからHook発火
- `command_windows` -> `powershell.exe` -> Node Hook
- repository pathに空白 / Unicode / `&` / `(` `)` を含めても起動
- stdin command stringにUTF-8文字、CRLF/LF、quote、backslashを含めてもNodeでJSON parse後の値が一致
- stdout/stderrの**意味内容**が保持されること（byte-level一致は要求しない）
- Node safe -> exit 0
- Node structured deny -> Codex block
- Node exit 2 -> launcher exit 2 -> Codex block
- Node exit 1 / 3 -> launcher exit 2へ正規化 -> Codex block
- root解決失敗 / Node起動失敗 -> stderr non-empty + exit 2
- `pwsh`なしでRequired path成立
- WSLなしでRequired verification完結

#### Wrapper / verify regression

Windowsで:

- `scripts/codex-safe.ps1 -PreflightOnly` PASS
- `git add` 等の旧blanket-forbidden expectationが残っていない
- destructive command expectationはforbiddenのまま
- `scripts/verify.ps1` が Node HookをRequired Pathとして検証
- legacy `.py` / `.ps1` Hook削除後もverifyがPASS

利用可能ならbash側も同じpreflight / template contractを確認する。

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
- Hook trusted / enabled
- normal Git operation succeeds
- path-based unstage succeeds
- protected branch direct update blocked
- destructive reset / checkout / force push / remote delete blocked
- static Rulesが有効か記録
- denyがtool実行前に効く
- deny後にlocal / remote sentinelが変化していない
- production Hookの通常ケースがtimeoutしない

Hookが発火しない、untrusted、またはRequired deny vectorを止められない場合はAcceptance FAILとする。

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
- `cd` / `git -C` / compound command / shell wrapperのblanket deny
- complete shell parser
- `write_stdin` workaround基盤
- arbitrary child process監視
- execpolicy / Hook両無効を救済する第三のfallback enforcement
- GitHub Ruleset同期
- networkによるdefault branch同期 / stale metadata判定
- remote URL監査
- preset全体の再設計
- stdout/stderrのbyte-level transport保証
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
strict Bash input schema validation
+
malformed/schema-invalid payload fail-close
+
canonical structured deny output
+
unexpected Node non-zero -> exit 2 normalization
+
Windows command_windows path PASS
+
Windows semantic stdin/stdout/stderr transport PASS
+
Windows special path / payload PASS
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
all declared Git deny vectors have contract tests
+
protected branch git am blocked
+
protected/default branch resolution scope documented and tested
+
force push / remote delete / prune / mirror blocked
+
all declared non-Git common deny vectors have contract coverage
+
python -c / terraform apply / kubectl apply are not Full Access common hard-blocked
+
normal apply_patch is not Hook-blocked
+
PowerShell wrapper preflight synced
+
verify scripts require Node Hook, not legacy .py/.ps1 Hooks
+
Full Access Acceptance does not rely on safe wrapper
+
preset-specific policy boundary documented
+
no complete custom shell parser
+
no blanket compound-command restriction
+
timeout runtime behavior recorded; production Hook stays below timeout
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
