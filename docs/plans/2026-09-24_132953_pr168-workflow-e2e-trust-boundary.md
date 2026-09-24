# PR #168 Workflow E2E trust boundary 修正計画

## Goal / Definition of Done

- Case B dependency preparation後のtracked diffをGit exit statusでfail-close確認する。
- Workflow preflightで既存Trigger Target isolation guardを再利用し、remoteなし・parentless root・reachable commit 1件・provenance一致・forbidden pathなしを確認する。
- Workflow resultの出力先をEvaluatorの`.codex/runs/**`に限定する。
- Run Artifact外のGit renameをsource status guardが見逃さない。
- blocked provenanceでactual Evaluator SHA、requested source SHA、verified routing SHAを分離する。
- 最終成功判定でstage statusと定義済みstage IDを照合する。
- canonical PlanのWindows / 非Windows commandへ`--routing-source-git-sha`を加える。
- 指定focused / repository-wide validation、sanitizer、self-review後にsource commit / pushし、PR最新head CIを確認する。
- fresh Targetを新Evaluator commitのtracked objectから作り、必要な手動detach後にcanonical Workflow E2Eを1回だけ実行する。Host / sandbox policyは変更しない。

## Current understanding and assumptions

- 開始PR headは`9786ba4854e9cf5b6ca4b37c609d5447feec2ea5`、branchは`test/117-pr6-workflow-e2e-eval`、PR #168はOPEN / mergeable。
- 作業ツリーはclean。PR base refは`2f5353b63414ace7278155d525e0e2cf074d630b`。`origin/main`は`9cef8501c2b19e1764892b0c17ee50318fa90b97`でPR branchより1 commit先行している。追加commitはIssue #132の文書 / Run Artifactのみ。
- PR headはレビュー時点のSHAから進んでおらず、指定コードとPlanの差分はない。
- 直近canonical runはCodex / Host Runtime capability blockerを実測している。今回は信頼境界、provenance、success gateとPlan commandを修正する。Host policy / sandboxを回避しない。
- canonical run前の新Target作成とmanual detach、外側workspace root確認が必要になる可能性がある。

## Non-goals

- Skill semantics、fixed Case A-E、status分類、result schema version、Semantic Eval、Product behavior、Host policy、sandbox、Hook、user configの変更。
- canonical retry、同一Evaluator SHAの再実行、dangerous bypass、merge、force push、branch削除。

## Impacted areas

- Runner: `scripts/evals/run-skill-workflow-evals.ts`, `scripts/evals/run-skill-trigger-evals.ts`, `scripts/evals/skill-workflow-evals.ts`
- Contracts: `tests/repository-contract/skill-workflow-evals.test.ts`, `tests/repository-contract/skill-trigger-evals.test.ts`
- Canonical invocation docs: `docs/plans/2026-09-20_004829_issue-117-pr6-workflow-e2e-eval_03_validation-and-risks.md`
- Required Run Artifact for this task.

## Change strategy

1. `git diff --exit-code HEAD --`のstatus 0 / 1 / otherを区別する小helperを追加し、実Git fixtureでno-diff、tracked diff、Git failureを固定する。
2. Workflow preflightから既存`assertTargetPreflight()`を呼び、追加のremote / parentless / single-commit / routing / source / forbidden / output checksを行う。
3. 出力pathをresolve / relative comparisonで`.codex/runs/**`へ制限し、不正pathではresultを別pathへ書かない。
4. Trigger source statusを`--no-renames -z`で読み、NUL entryごとにstatus列とpathを保持してRun Artifact外変更を検出する。
5. blocked resultのactual / requested / verified provenanceを分離する。preflight前のrouting SHAはnullにする。
6. case statusとstage status、stage ID prefixを総合成功gateで照合し、allowed B/E partial not-executed contractを保持する。
7. canonical Plan command例だけへrouting SHA optionを追加する。
8. focused test、repository test、verify、diff check、Run sanitizer、self-review後にsource commit / pushし、CIを確認する。
9. 新Evaluator commitからfresh sanitized Targetを作成する。manual detachが必要なら停止してユーザーへ依頼し、同じSHAでcanonical runは1回だけ実施する。
10. canonical結果を正本としてRun Artifact-only commit / push、PR本文更新、最新head CI確認を行う。

## Validation plan

- Focused:
  - `corepack pnpm exec vitest run tests/repository-contract/skill-workflow-evals.test.ts tests/repository-contract/skill-trigger-evals.test.ts --no-file-parallelism --maxWorkers=1`
- Repository: `corepack pnpm run test:repository`, `corepack pnpm run verify`, `git diff --check`。
- Run Artifact: `scripts/sanitize-codex-artifacts.ps1 -Path <RUN> -Write -Check`; residual 0。
- Implementation PR head: Web CI、Mobile App CI、Code Quality、CodeQL、その他必須check。
- Target: sanitized content、forbidden 0、canonical skills 6/6、fresh parentless synthetic root commit 1件、detached / clean / remote 0 / alternatesなし。
- Canonical: 新Evaluator SHAでrunner 1回。preflight blockerまたはcommon smoke blockerを含む実測resultを保存し、同SHAをretryしない。

## Risks / stop conditions

- `origin/main`はPR baseより先行しているが、GitHub上のPRはmergeable。PR branchを無断でrebase / resetしない。
- Host workspace rootがTarget親を含まない場合やmanual detachが必要な場合は、手動操作を依頼して停止する。
- Host Runtimeが必要capabilityを満たさなくてもpolicy / sandboxを変更せず、canonical resultを正本にする。
- Target isolation、出力path境界、検証、sanitizerのいずれかに失敗した場合、canonical runnerは開始しない。
- canonical runner起動後は結果によらず再実行しない。

## Open questions

- なし。修正範囲、成功条件、停止条件はユーザー指示で確定している。
