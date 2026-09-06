# PR #123 反映作業 Plan

## Objective

実装済みのPR1差分を、追加実装なしで`refactor/117-pr1-skill-package-portability`へcommit・pushし、PR #123の差分と本文を現行実装へ同期する。

## Source of truth

- 正本Plan: `docs/plans/2026-09-05_164300_issue-117-pr1-skill-package-portability.md`
- 作業対象branch: `refactor/117-pr1-skill-package-portability`
- 対象PR: `ryu-yoshikawa-pro-vision/qa-training-store#123`
- 実装完了Run: `.codex/runs/20260905-195959-JST/`

## Scope

- 現在のworktreeとPR headを読み取り専用で照合する。
- PR1実装差分、必要なRun Artifactのみを明示的にstageする。
- commit、明示refspecによるnon-force push、PR #123の本文更新を行う。
- push後にremote SHA、PR差分、本文を再取得して確認する。

## Prohibited

- 実装、リファクタリング、Plan変更、テスト追加、Validator拡張。
- Trigger Eval、Deterministic/Semantic Output Eval、Workflow E2E Eval、PR2以降の先取り。
- `.codex/agents/**`、dependency、product code、`scripts/agentic-qa/**`、native helperの変更。
- force push、branch切替、reset、clean、merge。

## Commit / PR policy

- commit前にbranch、upstream、staged stat、Plan scope、frontmatter freezeを再確認する。
- commit messageとPR本文はRepository規約に従い日本語で記載する。
- pushは`git push origin HEAD:refactor/117-pr1-skill-package-portability`を使う。

## Assumptions

- 現在の実装済みworktree差分がPR #123へ反映すべき唯一のsourceである。
- push前のremote更新がfast-forward可能で、PRがOPENであることを確認してからpushする。

## Exit criteria

- current branchとPR head branchが一致している。
- stage対象がPR1実装差分と必要なRun Artifactだけである。
- commit／push後のlocal HEAD、remote PR head、PR changed files、PR本文を確認できる。
- Run Artifactをsanitization Write / Check済みである。

## Research Plan

- Round 1: branch、upstream、remote、PR、worktree、正本Plan、実装完了Runを確認する。
- Round 2: commit前stage scope、frontmatter、除外対象、verify後の追加変更を確認する。
- Round 3: push後のPR head、changed files、本文を再取得する。

## Approach

読み取り専用の事前確認、明示的なstage、commit前確認、日本語commit、明示refspec push、PR再取得、本文更新、sanitizationの順に進める。実装ファイルは編集しない。

## Definition of Done

- 指定branchへPR1差分と必要なRun Artifactがcommit・pushされる。
- PR #123のhead SHAとchanged filesが更新され、Planのみではないことを確認できる。
- PR本文が実装済み状態と一致し、`pnpm run verify` PASSとDoDを記載する。
- scope逸脱なし、新規コード変更なし、force pushなし、Run Artifact sanitization PASS。

## Risks / Unknowns

- branch mismatch、remote non-fast-forward、意図しない差分、PR状態変更があればmutationを停止して報告する。

## Thinking Log

- 実装は完了済みのため、今回のRunではGit反映とPR同期だけを扱う。
