# Codex Full Access 最小安全ガード / PreToolUse 修復計画

## 0. 目的

Codex を Full Access で使うときも、**明確に破壊的な操作だけは repository 共通ポリシーとして拒否する**。

通常の開発作業は止めない。

この Plan の責務は次の2点だけとする。

1. 現在の `PreToolUse` Hook を現行 Codex contract に合わせて正常化する。
2. Full Access でも残すべき最小限の destructive guard を実装・検証する。

通常 Git workflow、stage ownership、shell parser、追加 Hook、独自安全基盤は作らない。

---

## 1. 最終設計

### 1.1 Hook は1種類だけ使う

使用する lifecycle Hook は **`PreToolUse` のみ**とする。

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

理由:

- 今回必要なのは「危険操作を tool 実行前に止めること」だけである。
- `PermissionRequest` は approval が発生する場合の Hook であり、Full Access 共通ガードの正本にしない。
- `PostToolUse` は side effect 発生後なので破壊防止には使わない。

### 1.2 Matcher は `Bash` だけにする

現行 Codex では shell / unified exec は Hook 上 `Bash` として扱われる。

よって matcher は次を正本とする。

```toml
[[hooks.PreToolUse]]
matcher = "^Bash$"
```

`Shell` / `PowerShell` 等の非 canonical alias を並べない。

`apply_patch` も今回の matcher から外す。

理由:

- repository の既存方針では command-based deletion と意図的な patch edit を分離している。
- `apply_patch` の通常 Add / Update / Delete / Move は開発作業として許可する。
- Full Access の通常リファクタリングまで Hook で妨げない。

### 1.3 Canonical Hook は Node.js 1本

```text
.codex/hooks/pre_tool_use_policy.mjs
```

- PowerShell / Python に policy logic を重複させない。
- 現在の `.ps1` / `.py` は config 参照を外し、検証後に削除する。
- Node.js は repository の既存 runtime を使い、新Dependencyは追加しない。

### 1.4 Config は現行 canonical keyへ寄せる

```toml
[features]
hooks = true
```

deprecated alias `codex_hooks` は残さない。

Hook command は repository root を解決して script を呼ぶ。

- macOS / Linux: `command`
- Windows: `command_windows` または installed runtime が受理する canonical Windows field

current working directory が repository subdirectory でも起動できることを確認する。

### 1.5 Hook の出力は最小化する

Safe:

```text
exit 0
stdout empty
stderr empty
```

Deny:

- 現行 Codex の structured `PreToolUse` deny output を正本とする。
- non-empty reason を返す。

Malformed JSON / Hook 内部例外:

- exit code `2` + stderr reason で block する。

Wave 0 で installed runtime が両形式を実際に block と扱うことを確認する。

---

## 2. 現状の問題

### 2.1 Hook 設定が古い

現在:

```toml
[features]
codex_hooks = true
```

`codex_hooks` は deprecated alias なので `hooks` へ変更する。

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

ほぼ同じ policy が2箇所に存在し、drift risk がある。

Node.js 1本へ統一する。

### 2.4 Hook command が `pwsh` + relative path 固定

現在:

```text
pwsh ... -File .codex/hooks/pre_tool_use_policy.ps1
```

これは `pwsh` availability と cwd に依存する。

repository root 解決型の command へ変更する。

### 2.5 Payload 全体を recursive scan している

現在は `command`, `content`, `text`, `patch` 等を広く再帰走査している。

そのため documentation / source / fixture に危険 command 文字列を書いただけでも false positive になり得る。

新 Hook は `tool_name == "Bash"` の `tool_input.command` だけを見る。

### 2.6 Git 通常操作を一律禁止している

現在の Hook / execpolicy は `git add`, `git commit`, `git push` を blanket deny している。

これは解除する。

### 2.7 `apply_patch` の Delete / Move block は今回削除する

intentional patch edit は通常開発操作として扱う。

command-based deletion と patch edit を同一視しない。

### 2.8 Hard forbidden に通常操作が混ざっている

現在の `.codex/rules/30-destructive-forbidden.rules` には、Full Access 共通 hard deny としては広すぎる項目がある。

最低限次を見直す。

```text
git add / commit / push blanket forbidden
python -c / python - blanket forbidden
kubectl apply
terraform apply
Invoke-Expression / iex blanket forbidden
```

`Invoke-Expression` 自体を全面禁止する代わりに、remote download を直接 `iex` / `Invoke-Expression` へ pipe する明確な危険形だけを common deny とする。

---

## 3. Full Access common deny

### 3.1 原則

**allowlist は作らない。**

```text
明確な destructive pattern
  -> deny

それ以外
  -> common guard では deny しない
```

通常の mutation を「安全だと証明できるまで禁止する」設計にはしない。

### 3.2 Git — 必ず deny

#### History / ref rewrite

- `git reset` family
- `git rebase` family
- `git commit --amend`
- `git push --force`
- `git push -f`
- `git push --force-with-lease`
- push の force refspec (`+...`)
- `git branch -f`
- `git branch -D`
- `git tag -f`
- `git update-ref`
- `git replace`
- `git filter-branch`

#### Working data loss

- `git clean` family
- `git rm`
- `git stash drop`
- `git stash clear`
- working tree を破棄する `git restore`
- path を破棄する `git checkout -- ...`
- `git switch -C`
- `git switch --discard-changes`
- `git reflog expire`
- destructive / aggressive prune

通常の `git checkout <branch>` / `git switch <branch>` は許可する。

#### Remote destruction

- push による remote branch / tag delete
- `git push --mirror`

### 3.3 Protected branch — direct update を deny

repository-local protected set:

```text
main
master
resolved repository default branch
```

Default branch は local `origin/HEAD` 等の read-only metadata から解決する。

Protected branch では、直接 history を進める操作を拒否する。

最低対象:

- `git commit`
- `git merge`
- `git cherry-pick`
- `git revert`
- `git pull`

また protected branch への直接 push を拒否する。

例:

```text
git push origin main                 -> deny
git push origin HEAD:main            -> deny
main 上で bare git push              -> deny
feature branch の通常 git push       -> allow
```

GitHub Ruleset 全体を API で同期する仕組みは作らない。

### 3.4 通常 Git 操作は許可

common guard では次を一律禁止しない。

```text
git add
git commit                  # non-protected branch
git push                    # non-protected destination
git fetch
git pull                    # non-protected branch
git switch
git checkout                # branch switch
git merge                   # non-protected branch
git cherry-pick             # non-protected branch
git revert                  # non-protected branch
git stash push/apply/pop
git tag                     # non-force
git worktree
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

### 4.2 Full Access hard deny から外す

通常の変更・実行そのものは hard deny しない。

- `terraform apply`
- `kubectl apply`
- `python -c`
- `python -`
- standalone `iex` / `Invoke-Expression`
- `apply_patch` Add / Update / Delete / Move

`npm publish` / `unpublish` / `version`、`pip uninstall` 等の既存 external/release/environment policy は今回の中心課題ではないため、挙動を変更しない。

---

## 5. execpolicy と PreToolUse の責務

### 5.1 execpolicy

static に表現できる destructive prefix の正本とする。

例:

```text
git reset
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

現行 Rules は単純な shell chain を分割して各 command に適用できるため、custom shell parser は作らない。

### 5.2 PreToolUse

次の補完だけ担当する。

1. argument 内に現れる destructive option
   - `commit --amend`
   - force push variants
   - push delete / mirror / force refspec
   - destructive restore / checkout 等
2. context-sensitive protected branch 判定
3. execpolicy だけでは表しづらい既存 destructive pattern

### 5.3 同じ parser を二重実装しない

- execpolicy は prefix / command argv 判定
- PreToolUse は Bash command text + repository context の最小判定

完全な shell grammar を再実装しない。

PreToolUse が観測しない path や `write_stdin` 等まで完全に監視する仕組みも作らない。

Hooks は guardrail であり完全な sandbox ではない、という前提を documentation に残す。

---

## 6. 実装 Wave

### Wave 0 — installed runtime確認

実装前に次だけ実測する。

- Codex version
- project Hook discovery / trust
- `features.hooks`
- `PreToolUse` matcher `Bash`
- `tool_input.command`
- safe output behavior
- structured deny behavior
- exit `2` deny behavior
- actual Full Access 経路で Hook が発火すること
- actual `permission_mode`
- Full Access で execpolicy `forbidden` が有効か

重要:

- Full Access と特定 `permission_mode` を事前に同一視しない。
- Full Access で execpolicy が有効なら static deny は Rules を正本とする。
- Full Access で execpolicy が無効なら、同じ最小 static deny set を PreToolUse 側にも保持する。
- この確認前に `git add/commit/push` blanket deny を解除しない。

### Wave 1 — Hook runtime修復

- `[features].hooks = true`
- matcher `^Bash$`
- Node canonical Hook追加
- root-resolved `command`
- Windows command override
- `.ps1` / `.py` runtime参照削除
- `/hooks` で changed Hook を review / trust

### Wave 2 — minimal destructive policy

- Git destructive deny
- protected branch direct-update deny
- 既存の明確な非Git destructive denyのみ移植
- `apply_patch` guard削除

### Wave 3 — execpolicy同期

`.codex/rules/30-destructive-forbidden.rules` を Full Access common hard-deny 方針へ合わせる。

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

Hook と Rules で同じ複雑な parser を二重実装しない。

### Wave 4 — tests / verify

Contract test正本:

```text
tests/contracts/codex-pre-tool-use-policy.test.ts
```

最低限:

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
python -c "print('ok')"
terraform apply ...
kubectl apply ...
```

#### Deny

```text
git reset --hard HEAD
git reset --soft HEAD~1
git rebase main
git commit --amend
git push --force origin feature/x
git push --force-with-lease origin feature/x
git push origin +feature/x
git clean -fd
git rm file.ts
git branch -D feature/x
git stash clear
git push origin --delete feature/x
git push --mirror
git push origin main
main 上の git commit
main 上の git merge
rm file.txt
terraform destroy
kubectl delete pod x
```

#### False positive

- source / Markdown / fixture に `git push --force` と書くだけ -> allow
- `apply_patch` normal Add / Update / Delete / Move -> Hook対象外

### Wave 5 — actual acceptance

Production checkout で destructive probe を実行しない。

Temporary clone + local bare remote で確認する。

Normal / Full Access 双方で:

- Hook invocation evidence
- normal Git operation succeeds
- protected branch direct update blocked
- destructive operation blocked

Full Access ではさらに:

- actual `permission_mode` を記録
- static Rules が有効かを記録
- Hook deny が tool 実行前に効くことを確認
- deny 後に local / remote sentinel が変化していないことを確認

### Wave 6 — docs同期

必要な範囲だけ更新する。

- `AGENTS.md`
- `docs/reference/codex-safety-harness.md`
- `.codex/rules/README.md`
- `.codex/requirements.toml`

---

## 7. Non-goals

今回やらないこと:

- Hook種類の追加
- `PermissionRequest` / `PostToolUse`導入
- `apply_patch`監視
- Git allowlist
- unknown Git mutation一律deny
- stage ownership管理
- clean working tree強制
- safe Git workflow設計
- bare push禁止
- merge / cherry-pick / revert / stash / tag / worktreeの包括禁止
- shell / REPL全面禁止
- custom shell parser
- `write_stdin` workaround基盤
- arbitrary child process監視
- GitHub Ruleset同期
- remote URL監査
- preset再設計
- 新しい安全platform
- npm / package release policy全体の再設計

---

## 8. 完了条件

次をすべて満たしたら完了とする。

```text
PreToolUse only
+
Bash matcher only
+
Node Hook 1本
+
canonical hooks feature key
+
root / nested cwd / Windows invocation PASS
+
Full Access でも Hook invocation PASS
+
normal Git operations are not blanket blocked
+
python -c / terraform apply / kubectl apply are not Full Access hard-blocked
+
normal apply_patch is not Hook-blocked
+
clear destructive Git operations blocked
+
protected/default branch direct update blocked
+
clear existing non-Git destructive operations blocked
+
no custom shell parser
+
contract tests PASS
+
Normal acceptance PASS
+
Full Access acceptance PASS
+
docs / rules / Hook behavior一致
```

この Plan の基準は一つだけである。

> **Full Access を実質的な制限モードへ戻さず、取り返しのつきにくい破壊だけを最小限止める。**

---

## 9. 実装時の参照優先順位

1. installed Codex actual behavior
2. OpenAI Codex Hooks official documentation
3. OpenAI Codex Config Reference
4. OpenAI Codex Rules official documentation
5. repository existing policy / implementation

Current upstream の仕様と installed runtime が食い違う場合は、実測結果を記録して Plan を更新してから進める。
