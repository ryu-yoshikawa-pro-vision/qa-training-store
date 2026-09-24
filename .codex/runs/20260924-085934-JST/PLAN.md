# Plan（計画）

## Objective（目的）

- Common smokeで、`workspace-write`による実file編集とCodex標準`command_execution`を別操作として検証し、新しいEvaluator revisionをcanonical live Workflow E2Eで1回評価する。

## Scope（対象範囲）

- In:
  - `scripts/evals/run-skill-workflow-evals.ts`
  - `tests/repository-contract/skill-workflow-evals.test.ts`
  - 今回のRun Artifact
  - 指定された検証、implementation commit / push、最新head CI、fresh Target準備、manual detach待ち、canonical run、結果sanitization、Artifact-only commit / push、PR本文・CI更新。
- Out:
  - canonical Plan、result schema、fixed 5 case、12 predicateの成功条件。
  - Host command policy、Hook / G10、sandbox、approval、config、model、OTel契約の変更。
  - `git status --short`拒否時の別command fallback、canonical retry、Target-8再利用。

## Assumptions（仮定）

- PR開始headは`98b7bd00980a9661bb6e1345c8fe975e586f2b56`で、remote/local一致、PR OPEN、worktree clean、`origin/main`へのbehind 0。
- 前回resultではresume、same-thread、OTel、structured schemaが成立し、Node command policy refusalでwriteとcommand_executionが両方未成立だった。
- 今回はfile editing toolでwriteを、`git status --short`でread-only command_executionを独立して試す。安全なread-only commandがHost policyに拒否されたら環境blockerとして停止する。

## Questions / Ambiguity（質問・曖昧性）

- 必ず質問する不透明点: なし。ユーザーが実装範囲、失敗時の停止条件、canonical 1回制約を指定済み。
- 仮定してよい細部: 既存prompt/test styleに合わせた最小helper名と文言。
- 未回答の重要質問: なし。

## Hypotheses（仮説）

- H1: file editing toolによる`smoke.txt`更新は、shell command拒否と独立して実測できる。
- H2: `git status --short`はread-only commandとして標準`command_execution`に現れる。拒否された場合はHost環境がPlan要件を満たせない。

## Research Plan（調査計画）

- Round 1 Query: PR/head/CI、直近Run result、Plan、対象helper / call site / testsを再確認する。
- Round 2 Query: 変更差分とfocused/repository validationを確認し、canonical前にfresh Targetと全preflightを整える。
- Exit Criteria:
  - 実装差分が指定2ファイル内で、12 predicateと既存runner controlsが維持される。
  - deterministic gatesが成功し、新Evaluator SHAのCIが必要checkを通る。
  - fresh Targetのmanual detach以外のpreflightを完了する。
  - canonical runnerを固定SHAで1回だけ起動し、Host拒否またはPlan上の成功条件に沿って結果を確定する。

## Approach（進め方）

- Run Artifactを作成し、現行状態と前回failure evidenceを記録する。
- actual write promptをfile editing toolへ、command_execution promptを`git status --short`へ分離し、既存`commandRan()`と実file読取で別々に判定する。
- focused test、Repository test、markdown/text quality、verify、diff check、self-review、Artifact sanitizerを実行する。
- 修正とRun Artifactをcommit/pushし、最新Evaluator headのCIを確認する。
- 新Evaluator SHAのtracked Git objectからfresh sanitized sibling Targetを作り、detached以外のpreflight後にユーザーへmanual detachを依頼する。
- detach後にread-only final preflight、Android physical device確認、canonical runnerを1回実行する。
- resultを正本としてsanitizationし、Artifact-only commit/push、PR本文更新、最新head CI確認を行う。

## Definition of Done（完了条件）

- 指定された回帰testとRepository検証が実測PASSし、self-reviewで範囲逸脱がない。
- implementation commit後の最新headで必須CIが成功する。
- 新Evaluator SHAからTargetを作成し、ユーザーmanual detach後に全preflightを通過する。
- canonical runは新Evaluator SHAで1回だけ実行する。`git status --short`がHost policyに拒否された場合は、別commandを試さず環境blockerとしてresultを記録する。
- runner result、sanitized Run Artifact、Artifact-only commit/push、PR本文、最新head CIを確定する。
- canonical成功の宣言は`run_status=completed`かつPlanの全条件を満たす場合だけ行う。

## Risks / Unknowns（リスク・未知点）

- Host policyがsafe read-only Git commandも拒否する可能性がある。その場合は診断を保存しcanonical retryやcommand置換を行わない。
- Codexがfile editing toolを使用しない場合、write predicateはfalseのままとなる。command成功で補完しない。

## Thinking Log（判断記録）

- 2026-09-24: canonical Planは変更せず、前回のNode command refusalを根拠に、file editingとread-only commandを分離する限定修正を行う。
