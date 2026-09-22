# Plan（計画）

## Objective（目的）

- Issue #117 / PR #168のPR6として、Planで固定された5 caseのWorkflow E2E Evalを実装する。
- Host標準のCodex `exec` / `exec resume <thread_id>`、既存OTel observer、PR4 deterministic contract、PR5 Semantic Eval、既存Agentic QA / Native helperを再利用し、独自Runtimeを追加しない。

## Scope（対象範囲）

- In:
  - `scripts/evals/skill-workflow-evals.ts`
  - `scripts/evals/run-skill-workflow-evals.ts`
  - `tests/repository-contract/skill-workflow-evals.test.ts`
  - `package.json`
  - Planが条件付きで許可するnarrow export / `QA_AGENT.md`のseed正本参照修正
  - 今回のimplementation Run Artifactとcanonical result
  - PR #168の本文、commit、通常push、Web CI / Mobile App CI確認
- Out:
  - Skill semantics / frontmatter、Product behavior、Trigger dataset、PR5 rubric / trial count、CI workflow
  - Repository独自Agent Runtime、Session Manager、Workflow Engine、Registry、RPC、Target / Dependency / Patch Manager、汎用Rule Engine、Native parser、第二Semantic framework
  - Issue close、PR merge、branch削除

## Assumptions（仮定）

- 指定Plan群が実装仕様の正本であり、Case A〜E、status分類、provenance、Artifact、semantic境界を変更しない。
- `origin/main`を取得済みで、現branchはlatest `origin/main`を既に含む場合はmerge/rebaseしない。
- Case B/Eの外部capability不足は、Planが許容する場合だけ`not_executed`として記録し、fixture / validator / evaluator failureへ拡張しない。

## Questions / Ambiguity（質問・曖昧性）

- 必ず質問する不透明点: なし。Planと現行Repository契約で実装範囲が固定されている。
- 仮定してよい細部: 一時workspace名、temporary path、空きportなど評価意味を変えないもの。
- 未回答の重要質問: なし。

## Hypotheses（仮説）

- H1: 既存Trigger / Semantic / Agentic QA / Native helperをnarrowに再利用すれば、4基本ファイル中心で固定5 caseを表現できる。
- H2: installed Codexのresume / resumed OTel / actual write capabilityがsmoke probeを通れば、canonical live runをPlanのstatus契約どおり実行できる。

## Research Plan（調査計画）

- Round 1: PR #168、Issue #117、branch / latest `main`、指定Plan / Run Artifactを確認する。
- Round 2: 既存Eval runner、OTel、PR4/PR5 helper、Agentic QA contract、Native helper、package scripts、CIを再照合する。
- Exit Criteria:
  - material driftと実装への影響をRun Artifactへ記録する。
  - 既存再利用点、条件付き変更点、未知のHost capabilityを特定する。

## Approach（進め方）

1. latest `main`との差分と既存契約を再確認し、不要なmerge/rebaseをしない。
2. installed Codexの共通smoke probeとCase B capability / Case E preflightを実施する。
3. Planの実行タスク1〜15を上から順に実装し、targeted contractで固定契約を検証する。
4. canonical live Workflow E2Eを1回実行し、result JSONを先に保存する。
5. repository-wide検証、Run Artifact sanitizer、code-review自己レビューを行う。
6. 差分をcommitし、通常push後にPR headとWeb CI / Mobile App CIを確認し、PR本文を現状態へ更新する。

## Definition of Done（完了条件）

- Planの固定5 case、handoff、stop、Artifact reuse、Semantic actual-output、provenance、status分類を実装している。
- targeted repository contract、`pnpm run test:repository`、`pnpm run lint:markdown`、`pnpm run verify`、`git diff --check main...HEAD`、Run Artifact sanitizationを実行し結果を記録する。
- canonical live resultを`.codex/runs/<run_id>/workflow-e2e-result.json`へ保存し、Case A/C/D必須、Case B/Eの許容条件、CLI exitを確認する。
- commit、push、PR #168本文更新、最新headのWeb CI / Mobile App CI確認まで完了する。Issue #117はopenのまま維持する。

## Risks / Unknowns（リスク・未知点）

- Codex resume / resumed OTel / actual writeがHostで成立しない場合はrun `blocked`とし、独自fallbackを作らない。
- Case Bのcanonical Browser / screenshot / URL capabilityが不足する場合だけCase Bを`not_executed`とする。Case Eはnon-Windows / PowerShell unavailableだけを許容する。
- 既存helperとの契約差異が見つかった場合は、Planの意味を変えないnarrow exportまたはRun Artifactへの不整合記録で扱う。

## Thinking Log（判断記録）

- 2026-09-22: 指定Plan 4件とplan-only Run 3件を全文確認した。
- 2026-09-22: `origin/main`のcommitは`fcaf57f69b1beabb60fd0c26905d78985b47a7a4`、HEADはそれを祖先に含むため、不要なmerge/rebaseは行わない。
- 2026-09-22: 実装Runは標準`new-run.ps1`で`20260922-143741-JST`として作成した。
