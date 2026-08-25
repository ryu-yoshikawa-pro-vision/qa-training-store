# Git branch safety 復旧計画

## Objective

PR #58の5コミットを内容を失わずに保護・確認し、正しいPR branchへ保持したまま、Codexのbranch mismatchによるmain向けcommit/push事故を恒久ルールとして文書化する。

## Current understanding

- current branch: `fix/dependabot-brace-expansion-r2-metadata-evaluation`
- current/remote PR head: `f735e665c2becdcb72f8e349265a95017d40fb00`
- `origin/main` / GitHub main: `74834bf9ac859db5d9aec1f34bd8c6337f4698c8`
- 5コミットは `fe0d58c` から `f735e66` までで、PR #58の既存履歴。
- `rescue/pr58-branch-recovery` は作成済みで5コミットを参照する。
- current local branchのupstream表示は `origin/main` であり、安全上是正が必要。

## Goal / Assumptions / Non-goals

### Goal

- 5コミットを救出ブランチで保護し、PR branchの既存履歴を失わず、remote mainへ変更を入れずに文書変更をPR branchへpushする。

### Assumptions

- GitHub PRの `headRefName` を作業対象branchの正本とする。
- main非包含が確認できるため、main修復やforce pushは不要。
- rescue branchは保持し、remoteへpushしない。

### Non-goals

- PR #58 merge、依存/source/test/workflow変更、hook/Actions/branch管理スクリプトの新規実装、nanoid等の次Issue対応。

## Hypotheses

- H1: 5コミットは誤ってmainへpushされたのではなく、ローカルbranchのupstreamが誤って `origin/main` だっただけで、PR remote branchには既に正しく存在する。
- H2: PR branchとrescue branchは同一履歴のためCASE Aであり、cherry-pick/resetなしで安全に確定できる。

## Scope

- Allowed: `AGENTS.md`、`docs/reference/git-branch-safety.md`、今回Run Artifact、durable plan。
- Forbidden: `package.json`、`pnpm-lock.yaml`、source、test、workflow、remote main、rescue branch削除。

## Approach

1. branch/remote/PRを無変更確認する。
2. current HEADをrescue branchで保護する。
3. 5コミットの内容、main非包含、PR branch ancestryを確認する。
4. local upstreamをPR remote branchへ是正する。
5. AGENTS.mdと詳細referenceへbranch safetyを文書化する。
6. diff check、sanitizer、明示stage、commit直前/ push直前branch invariant、explicit refspec pushを行う。
7. push後のPR/main/rescue状態を確認し、PR branchで終了する。

## Validation plan

- `git status --short`
- `git branch --show-current`
- `git branch -vv`
- `git log --oneline --decorate --graph`
- `git diff --check` / `git diff`
- `git merge-base --is-ancestor`
- `gh pr view 58 --json headRefName,headRefOid,state`
- `git rev-parse HEAD`, PR remote branch, `origin/main`
- artifact sanitizer Write/Check
- dependency files are unchanged from current PR state

## Definition of Done

- 5コミット特定・rescue保護・main非汚染確認。
- PR branchで5コミットがすべて参照でき、既存履歴を失っていない。
- AGENTS.mdと詳細referenceにcommit/push前のbranch invariant、PR head一致、main保護、rescue手順、force禁止がある。
- explicit refspecでPR branchへpushし、remote mainへpushしていない。
- rescue branchを保持し、PR #58をmergeせず、最終branchがPR branchである。

## Risks / Stop conditions

- remote mainに誤コミットが見つかった場合は自動修復せず停止して報告する。
- ancestryがCASE A/Bどちらにも安全に分類できない場合、cherry-pickやresetを行わず停止する。
- dependency/source/workflow差分が発生した場合はcommitせず停止する。

## Thinking Log

- 2026-08-25 08:31 JST: 初期状態を確認。5コミットは `origin/main` の後続だが、GitHub mainには含まれていない。
- 2026-08-25 08:32 JST: rescue branchを作成し、5コミットの参照を確認。PR remote branchとrescue branchは同一 `f735e66` でCASE A。
