# Codex Full Access 最小安全ガード / PreToolUse 修復計画

## 0. 目的

Codex を Full Access で使うときも、**通常開発を妨げず、Codex が通常の操作として実行し得る明確な破壊操作だけを repository 共通ガードで拒否する**。

この Plan の責務は次の2点だけとする。

1. 現在の `PreToolUse` Hook を現行 Codex contract に合わせて正常化する。
2. Full Access でも残す最小 destructive guard を、1つの policy と最小限のテストで実装する。

このガードは adversarial bypass を完全に防ぐ security boundary ではない。Git CLI 全体の解析、shell parser、子process監視、GitHub Ruleset同期などは行わない。

Primary / Required execution environment は **Windows native** とする。

```text
Windows native
├─ Codex
├─ Git for Windows
├─ Node.js
└─ Windows PowerShell (powershell.exe)
```

WSL は必須にしない。macOS / Linux は壊さない範囲の best-effort compatibility とする。

---

## 1. 最終アーキテクチャ

### 1.1 Hook は `PreToolUse` / `Bash` だけ

```text
PreToolUse
└─ Bash
   └─ .codex/hooks/pre_tool_use_policy.mjs
```

追加しないもの:

- `PermissionRequest`
- `PostToolUse`
- Session / Prompt / Subagent 系 Hook
- `apply_patch` Hook

`apply_patch` の Add / Update / Delete / Move は通常の編集操作として common guard では止めない。

### 1.2 Policy は Node.js 1本を正本にする

Canonical implementation:

```text
.codex/hooks/pre_tool_use_policy.mjs
```

- PowerShell / Python に policy logic を複製しない。
- 現在の `.ps1` / `.py` Hook は runtime 参照を外し、移行確認後に削除する。
- 新Dependencyは追加しない。
- PowerShell は Windows launcher のみ担当する。

**Full Access common policy の SSOT は Node Hook とする。**

`.codex/rules/**` は、明確な static destructive prefix を追加で止められる場合だけ defense-in-depth として残す。Node Hook と異なる policy を別途設計しない。

### 1.3 Windows config

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

- deprecated `codex_hooks` は使わない。
- Windows Required path は `command_windows` + `powershell.exe` + Node Hook。
- `pwsh` / WSL を必須にしない。
- repository root / nested cwd のどちらからでも動作させる。

### 1.4 Launcher contract

PowerShell launcher は transport だけを担当する。

```text
Codex stdin JSON
    ↓
powershell.exe
    ↓
Node Hook stdin
```

必須挙動:

| Node / launcher状態 | launcher結果 |
| --- | --- |
| Node `0` | `0` |
| Node `2` | `2` |
| Node unexpected non-zero | stderrを保証して `2` |
| repository root解決失敗 | stderr + `2` |
| Node / Hook file解決失敗 | stderr + `2` |

stdout / stderr は意味内容を維持する。byte-level同一性は要求しない。

### 1.5 Hook input / output contract

Required input:

```text
tool_name == "Bash"
tool_input is object
tool_input.command is string
```

malformed JSON、必須field欠落、`null`、型不正、想定外 `tool_name` はすべて:

```text
stdout empty
stderr non-empty
exit 2
```

Policy deny の正本:

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "<non-empty reason>"
  }
}
```

Safe は `exit 0` + stdout/stderr empty とする。

Timeout の挙動は installed runtime で1回だけ実測する。timeoutを安全境界には使わず、production Hookは短時間同期処理に限定する。

---

## 2. 今回直す現状問題

- `[features].codex_hooks` を canonical `hooks` へ変更する。
- matcher を `Bash|Shell|PowerShell|apply_patch|Edit|Write` から `^Bash$` へ絞る。
- `.ps1` / `.py` の二重 policy を Node 1本へ統一する。
- `pwsh` + relative path 固定を Windows `command_windows` へ変更する。
- payload 全体の recursive scan をやめ、`tool_input.command` だけを見る。
- common policy の `git add` / `git commit` / `git push` blanket deny を外す。
- `apply_patch` Delete / Move の common block を外す。
- `python -c`, `terraform apply`, `kubectl apply` 等の通常操作を Full Access common hard deny から外す。
- wrapper preflight / verify / docs に残る旧Hook前提を同期する。

---

## 3. Full Access Common Policy Matrix

**このSectionだけを policy 正本とする。**

実装、contract test、Full Access acceptance はこのMatrixを参照し、同じcommand一覧を別Sectionへ複製しない。

### 3.1 基本原則

```text
明確な destructive pattern
  -> deny

通常開発 / recovery / inspection
  -> common guard では deny しない
```

未知のGit mutationを一律denyしない。

### 3.2 Git deny

| ID | 対象 | 代表例 | 理由 |
| --- | --- | --- | --- |
| G1 | HEAD / historyを書き換える reset | `git reset --hard HEAD`, `git reset HEAD~1` | local history / working tree破壊 |
| G2 | state-changing rebase | `git rebase main`, `git rebase --continue` | history rewrite |
| G3 | amend | `git commit --amend` | history rewrite |
| G4 | destructive clean / rm | `git clean -fd`, `git rm file` | working data削除 |
| G5 | destructive restore / checkout / switch | `git restore file`, `git checkout -- file`, `git checkout -f ...`, `git switch -C ...`, `git switch --discard-changes ...` | working data破棄 / branch reset |
| G6 | stash削除 | `git stash drop`, `git stash clear` | recovery data削除 |
| G7 | force push | `git push --force`, `git push -f`, `git push --force-with-lease`, push `+refspec` | remote history rewrite |
| G8 | remote ref削除 | `git push --delete`, `git push origin :branch`, `git push --prune`, `git push --mirror` | remote data削除 |
| G9 | force branch / tag rewrite | `git branch -f`, `git branch -D`, `git tag -f` | ref rewrite / deletion |
| G10 | protected branch direct update | protected branch上の `commit`, `merge`, `cherry-pick`, `revert`, `pull`, `am`; protected destinationへのpush | default branch事故防止 |

#### G1 resetの例外

次は unstage なので allow:

```text
git reset -- path/to/file
git reset HEAD -- path/to/file
git restore --staged path/to/file
```

#### G2 / G10 recoveryの例外

明示的な recovery / inspection は common guard で止めない。

代表例:

```text
git rebase --abort
git rebase --quit
git merge --abort
git cherry-pick --abort
git revert --abort
git am --abort
git am --show-current-patch
```

個々のGit subcommandの全optionをpolicy engineとして再実装しない。

### 3.3 Protected branch

Protected set:

```text
main
master
+ local origin/HEAD から一意に解決できた default branch
```

`origin/HEAD` がない / 壊れている / 解決不能なら `main` / `master` だけを保護する。

最低限止めるもの:

```text
protected branch上の state-changing commit系操作
protected branch宛の明示push
bare pushでdestinationがprotectedと解決できる場合
```

remote default branchをnetwork問い合わせで同期したり、stale metadataを判定したりしない。

### 3.4 Git allow representative

次の通常操作は common guard で blanket deny しない。

```text
git status / diff / log
git add
git commit                  # non-protected branch
git push                    # resolved non-protected destination
git fetch
git pull                    # non-protected branch
git switch / checkout       # normal branch switch
git merge                   # non-protected branch
git cherry-pick             # non-protected branch
git revert                  # non-protected branch
git stash push/apply/pop
git tag                     # non-force
git worktree add            # normal form
path-based unstage
explicit abort / quit / read-only inspection
```

### 3.5 非Git common deny

既存policyのうち、明確な削除 / 破壊だけを維持する。新しいカテゴリは増やさない。

| ID | 対象 | 代表例 |
| --- | --- | --- |
| N1 | command-based file deletion | `rm`, `del`, `erase`, `rmdir`, `unlink`, `Remove-Item`, `find ... -delete` |
| N2 | destructive sync / forced overwrite | `rsync --delete`, `robocopy /MIR`, `mv -f`, `Move-Item -Force`, `Rename-Item -Force` |
| N3 | infrastructure / cloud deletion | Docker prune, `terraform destroy`, `kubectl delete`, `helm uninstall`, `aws s3 rm`, `az group delete`, `gcloud projects delete` |
| N4 | remote script direct execution | downloadをshell / `iex` / `Invoke-Expression`へ直接pipe |

Full Access common hard denyから外す代表例:

```text
python -c
python -
terraform apply
kubectl apply
standalone iex / Invoke-Expression
apply_patch Add / Update / Delete / Move
```

`npm publish` / `unpublish` / `version`、`pip uninstall` 等の既存 external / release / environment policy はこのPlanでは再設計しない。

### 3.6 保証しないもの

このPlanは accidental destruction を減らす guardrail であり、敵対的なguard回避まで保証しない。

保証対象外:

- `git -C` / `--git-dir` / aliases 等を使った迂回パターンの網羅
- Git plumbing command 全般
- `update-ref`, `replace`, `filter-branch`, reflog / gc / prune 等の特殊操作を完全列挙すること
- 特殊 fetch refspec によるlocal ref更新の完全解析
- shell wrapper / compound command / `cd` / `pushd` の完全context追跡
- `write_stdin` / arbitrary child process
- arbitrary shell grammar parsing

これらを追い始めた場合は、このPlanの目的から外れていると判断する。

---

## 4. Rules / Hook / preset の責務

### Node PreToolUse Hook

**Full Access common policy の唯一の正本。**

- Section 3 Matrixを判定する。
- protected branchの最小context判定を行う。
- schema validationとdeny outputを担当する。

### `.codex/rules/**`

unambiguousなstatic destructive prefixを簡単に表せる場合だけ、defense-in-depthとして残す。

- Node Hookより広い禁止を追加しない。
- safe sub-formと衝突するfamily blanket ruleを置かない。
- Full Accessでexecpolicyが無効でも、Node HookがMatrixを止めればAcceptance可能とする。

### preset-specific policy

次は別policyであり、このPlanでは再設計しない。

```text
repo_safe
repo_auto_net
repo_readonly
.codex/rules-auto-net/**
```

common Rules変更でwrapper preflightが壊れる部分だけ同期する。

Full Access acceptanceは `scripts/codex-safe.ps1` を使わず、ユーザーが実際に使う Full Access routeで実施する。

---

## 5. 実装手順 — 4段階

### Phase 0 — Windows Runtime Gate

実装前にWindows nativeで次だけ確認する。

- installed Codex version
- project Hook discovery / trust
- `[features].hooks`
- matcher `Bash`
- actual `tool_input.command`
- `command_windows`使用
- root / nested cwdからHook起動
- safe `exit 0` -> continue
- structured deny -> block
- `exit 2 + stderr` -> block
- artificial timeoutのactual verdictを記録
- actual Full Access routeでもHookが発火する
- Full Accessでexecpolicy Rulesが有効かは記録するが、policy SSOTにはしない

HookがFull Access routeで発火しない / trustできない場合はGate FAILとする。

### Phase 1 — Hook / config / policy実装

- `[features].hooks = true`
- matcher `^Bash$`
- Node Hook追加
- Windows launcher実装
- schema validation / output contract実装
- Section 3 Matrix実装
- `.ps1` / `.py` runtime参照削除
- `.codex/rules/30-destructive-forbidden.rules` をMatrixと矛盾しない最小static denyへ整理
- common `git add/commit/push`, `python -c`, `terraform apply`, `kubectl apply`等の不要blanket denyを削除
- `apply_patch` guard削除
- `scripts/codex-safe.ps1/.sh` preflight同期
- `scripts/verify.ps1` / `scripts/verify` のRequired Hook pathを `.mjs` へ変更

### Phase 2 — Contract tests + Windows Full Access Acceptance

Contract testsは **Section 3 Matrixをdata-drivenに参照**する。

必須:

1. Input contract
   - malformed JSON
   - missing / null / wrong type
   - unexpected `tool_name`
2. Output contract
   - safe
   - structured deny
   - internal error `exit 2`
   - unexpected Node non-zero -> launcher `2`
3. Matrix
   - G1-G10 各1つ以上のdeny representative
   - N1-N4 各1つ以上のdeny representative
   - allow representativeとして通常 `add/commit/push/fetch/switch`、path-based unstage、recoveryを確認
4. Windows launcher
   - root / nested cwd
   - 空白 / Unicodeを含むrepo path
   - quote / backslash / CRLF/LFを含むstdinのsemantic preservation
   - root / Node解決失敗 -> stderr + `2`
5. wrapper / verify regression
   - Windows preflight PASS
   - legacy Hook削除後にverify PASS

Full Access real-runはTemporary clone + local bare remoteを使用し、Matrix全件を再実行しない。

代表Acceptance:

```text
ALLOW: git add / feature commit / feature push / path unstage
DENY : reset --hard / rebase / force push / protected branch commit / rm
```

確認:

- actual Full Access routeでHook trusted / enabled
- denyがtool実行前に効く
- deny後にlocal / remote sentinelが変化していない
- production Hookがtimeoutしない

### Phase 3 — Docs / cleanup

必要な範囲だけ同期する。

- `AGENTS.md`
- `docs/reference/codex-safety-harness.md`
- `.codex/rules/README.md`
- `.codex/requirements.toml`
- legacy Hook参照comment

通常のin-scope mutationにapproval必須と読める古い表現があれば、Full Access common policyと矛盾しないよう整理する。

---

## 6. Non-goals

今回やらないこと:

- Hook種類追加
- `apply_patch`監視
- Git全体のallowlist / denylist
- Git CLI parserの実装
- Git global option / alias / plumbingの網羅
- Git workflow全体の設計
- stage ownership / clean working tree強制
- compound command全面禁止
- shell parser
- `write_stdin` workaround
- child process監視
- execpolicy / Hook両無効を救済する第三のenforcement layer
- GitHub Ruleset同期
- remote default branchのnetwork同期 / stale判定
- preset全体の再設計
- stdout/stderr byte-level保証
- 新しい安全platform
- WSL必須化
- macOS / Linux Required Acceptance

---

## 7. 完了条件

次をすべて満たしたら完了とする。

```text
PreToolUse / Bash only
+
Node Hook 1本がFull Access common policy SSOT
+
Windows command_windows path PASS
+
malformed/schema-invalid fail-close
+
structured deny PASS
+
unexpected Node non-zero -> exit 2
+
Section 3 Matrix contract tests PASS
+
normal Git operations are not blanket blocked
+
path-based unstage / explicit recovery are not blocked
+
protected branch core update blocked
+
non-Git destructive representative blocked
+
apply_patch normal edits are not Hook-blocked
+
wrapper / verify synced
+
Windows Full Access representative acceptance PASS
+
docs / Rules / Hook behavior一致
+
no Git parser / shell parser / new safety platform
```

macOS / Linux smokeはoptionalとし、未実施でも完了可能とする。

このPlanの判断基準は一つだけである。

> **Full Accessを実質的な制限モードへ戻さず、通常運用で起こり得る取り返しのつきにくい破壊だけを、理解しやすい小さなguardで止める。**

---

## 8. 実装時の参照優先順位

1. installed Codex actual behavior on Windows native
2. OpenAI Codex Hooks official documentation
3. OpenAI Codex Config Reference
4. OpenAI Codex Rules official documentation
5. Git official documentation
6. repository existing policy / implementation

installed runtimeとupstream docsが食い違う場合だけ、実測結果を記録してPlanを更新する。
