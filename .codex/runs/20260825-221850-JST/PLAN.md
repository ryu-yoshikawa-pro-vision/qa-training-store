# Plan

## Objective

- （今回の指示を達成する）

## Scope

- In:
- Out:

## Assumptions

- （不明点があれば明示）

## Questions / Ambiguity

- 必ず質問する不透明点:
- 仮定してよい細部:
- 未回答の重要質問:

## Hypotheses

- H1:
- H2:

## Research Plan

- Round 1 Query:
- Round 2 Query:
- Exit Criteria:
  - 主要仮説ごとに支持/反証の根拠がある
  - 未解決論点に次アクションがある

## Approach

- どう進めるか（高レベル手順）
- 標準フロー: `PLAN -> Web検索(不足知識) -> TASKS -> 実行 -> REPORT`

## Definition of Done

- 満たしたら完了とする条件

## Issue #60 追加修正計画

### 目的

既存PR #65の同一branchへ追加commitを行い、Git invocation → argument tokens → repository context → mutation targetの評価単位を完成させる。protected/default branch mutationとprotected branchへのpushの表現差によるbypassを防止し、feature branchの安全な通常操作を維持する。

### In / Out

- In: `.codex/hooks/pre_tool_use_policy.mjs`、`tests/contracts/codex-hook-contract.test.ts`、既存plan、必要最小限のreference／PROJECT_CONTEXT／history／今回のRun Artifact。
- Out: Windows launcherのpolicy二重実装、package／lockfile／dependency、wrapper、branch manager、完全なshell／Git parser、`command git`／`env git`、任意absolute executable、`.git`直接書換え、PR expected-branch state manager。

### 実装契約

- `git`と`git.exe`を同一Git executableとして検出する。
- 1 command内の全Git invocationを独立評価し、同一subcommandの後続invocationも評価する。1件でもDENYならcommand全体をDENYする。
- subcommand以降はquote-aware argument tokenで判定する。quoteはshellが除去するため、quote付き危険optionを通常optionと同一視する。
- 複数`-C`は出現順に累積し、各invocationのeffective repositoryからGitContextを取得する。
- `--git-dir`／`--work-tree`、`-c`／`--config`／`--config-env`、inline `GIT_DIR`／`GIT_WORK_TREE`／`GIT_CONFIG_*`でsemanticsが変わるmutationはfail-closeする。safe read-onlyはblanket denyしない。
- pushは明示的に一意な単一refspecだけをALLOW候補とし、implicit／bulk／matching／wildcard／複数refspec／URL・path remoteだけのpushをfail-closeする。
- fetch refspec、update-ref、worktree add `-B`でprotected local refを変更できる場合はDENYする。

### 検証

- focused contract、全contracts、format、markdown lint、lint、typecheck、verify、diff check、Run Artifact sanitizerを実行する。
- destructive Git commandは実行せず、Hook／`evaluateCommand()`のdecisionのみ確認する。Windows launcher contractは変更なしで再実行する。
- self-reviewでquote、git.exe、implicit push、runtime config／environment、protected fetch／update-ref／worktree、過剰DENY、scopeを確認する。

### 完了条件

- source／tests／docs／Run Artifactが実装事実と一致し、全quality gateがPASSする。
- 指定branch上で通常追加commitを作成し、`git push origin HEAD:fix/codex-git-branch-protection`でPR #65を更新する。
- PR #65がOPEN・非Draft・base `main`・head一致であり、merge／force push／rebase／reset --hard／clean／branch -Dを行わない。

## Risks / Unknowns

- リスクと対策

## Thinking Log

- 思考や判断の理由はここに逐次追記する（作業中に更新）。
- 不明点の整理、選択肢比較、決定理由を簡潔に記録する。
