# Git branch safety 復旧・恒久ルール計画

## 1. Goal

PR #58に関係する5コミットを内容を失わずに保護・確認し、正しいPR branchへ残したまま、Codexが作業対象branchを外れてcommit/pushする事故を防ぐ恒久的なGit branch safetyルールを文書化する。

## 2. Current understanding

- 現在branchは `fix/dependabot-brace-expansion-r2-metadata-evaluation`、HEADは `f735e665c2becdcb72f8e349265a95017d40fb00`。
- `origin/main` とGitHub上のmainは `74834bf9ac859db5d9aec1f34bd8c6337f4698c8`。
- `origin/main..HEAD` の5コミットは `fe0d58c`、`d930a5b`、`0de5aed`、`7a20fde`、`f735e66` で、PR #58のR2実装・CI記録である。
- 5コミットは `origin/main` のancestorではなく、remote PR branchは `f735e66` を指している。
- rescue branch `rescue/pr58-branch-recovery` を作成済みで、5コミットをすべて参照している。
- ローカルPR branchのupstream表示が `origin/main` になっているため、今後のpush先誤認を防ぐために正しいPR remote branchへ是正する。

## 3. Assumptions

- PR #58のhead branch名はGitHub APIの `headRefName` を正本とする。
- remote mainへ5コミットが入っていない場合はmainの修復を行わない。
- 文書変更は `AGENTS.md`、`docs/reference/git-branch-safety.md`、今回Run Artifact、必要なplanに限定する。
- rescue branchは今回削除せず、remoteへpushしない。

## 4. Non-goals

- PR #58のmerge。
- `package.json`、`pnpm-lock.yaml`、source、test、workflow、依存関係の変更。
- force push、remote mainの履歴書き換え、rescue branch削除。
- Git hook、Actions、branch管理スクリプトの新規実装。
- nanoid、image-size、uuid remediation。

## 5. Impacted areas

- `AGENTS.md`: protected/default branchとcommit/push直前のbranch invariantを追加する。
- `docs/reference/git-branch-safety.md`: branch mismatch時のrescue、CASE A/B、remote確認、禁止操作を詳細化する。
- `.codex/runs/20260825-083157-JST/`: 調査・判断・検証を日本語で保存する。
- `docs/plans/2026-08-25_083157_git-branch-safety-recovery.md`: durableな計画を保存する。

## 6. Files to inspect

- `AGENTS.md`
- `docs/PROJECT_CONTEXT.md`
- `docs/adr/0016-codex-pretooluse-node-policy.md`
- `docs/reference/codex-safety-harness.md`
- `.codex/rules/README.md`
- `.codex/runs/20260824-202628-JST/`
- `docs/reference/repair-loop.md`

## 7. Change strategy

1. 現在のbranch、履歴、remote main、PR headを無変更で確認する。
2. 現在HEADを `rescue/pr58-branch-recovery` で保護し、5コミットの内容・parent・main非包含を確認する。
3. PR branchとrescue branchのancestryを確認する。今回の同一HEADではCASE Aとして既存PR branchを維持し、不要なcherry-pickやresetを行わない。
4. ローカルPR branchのupstreamをPR remote branchへ合わせる。pushは最後まで明示refspecを使う。
5. `AGENTS.md`に短い必須ルールを追加し、詳細手順を `docs/reference/git-branch-safety.md` に分離する。
6. 対象ファイルを明示stageし、commit直前・push直前のbranch invariantを再確認してcommit/pushする。
7. push後にPR head、remote main、local branch、rescue参照を確認し、PRはmergeせずPR branchで終了する。

## 8. Validation plan

- `git status --short`
- `git branch --show-current`
- `git branch -vv`
- `git log --oneline --decorate --graph`
- `git diff --check`
- `git diff` と変更対象確認
- `git merge-base --is-ancestor` によるmain非包含・PR branch継続確認
- `gh pr view 58 --json headRefName,headRefOid,state`
- `git rev-parse HEAD` と `git rev-parse origin/fix/dependabot-brace-expansion-r2-metadata-evaluation`
- `git rev-parse origin/main`
- `scripts/sanitize-codex-artifacts.ps1 -Write` / `-Check`
- 既存の依存差分が不変であることを `git diff origin/main...HEAD -- package.json pnpm-lock.yaml` で確認する。

## 9. Risks

- upstreamが `origin/main` のままだと、bare pushがmain向けに誤解釈されるため、push前に設定を是正・検証する。
- 5コミットが既にremote PR branchにあるため、二重cherry-pickは重複履歴を作る。ancestry確認後は移動操作を省略する。
- mainに誤コミットが存在する場合は自動修復せず停止する。今回の確認でmainは汚染されていない。

## 10. Open questions

- なし。PR head、remote main、5コミットの範囲、復旧ケースはGitHub/Gitの実データで確定済み。

## 11. Follow-up notes

- rescue branchはPR #58の正常性をユーザーが確認するまで保持する。
- PR #58のmerge後にDependabot Alert #2/#3/#4のFixed確認が必要だが、今回の作業では実施しない。

## 12. Evidence

- `origin/main..HEAD` は5コミット。
- 最初のコミット `fe0d58c` に対する `git merge-base --is-ancestor fe0d58c origin/main` はexit 1。
- GitHub PR #58の `headRefName` は `fix/dependabot-brace-expansion-r2-metadata-evaluation`、headは `f735e66`。
