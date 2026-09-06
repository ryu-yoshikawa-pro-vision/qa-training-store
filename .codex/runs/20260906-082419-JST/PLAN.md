# Plan

## Objective

- PR #124の正本Planに従い、Training Baseline / Learner Exercise / Artifact / Completion Evidenceの境界を実装する。
- Web desktop exerciseとNative exerciseのdirect entry、Native bounded shared runner、expected-failure checked entry、Native specialization opt-in workflow、learner-facing同期、validator / contract test同期を完了する。
- Product behavior、Product Formal workflow、既存のCommon / Native / C07 / C08契約は変更しない。

## Scope

### In

- 正本Plan `docs/plans/2026-09-05_pr5_training_baseline_exercise_artifact_evidence.md` のTask 1〜5。
- PlanのExpected implementation file setに含まれるpackage script、Training runner、Training workflow / contract、指定された6教材。
- Required local/static validation、最終diff確認、commit、対象branchへのnon-force push、PR #124本文の実装状態同期。
- Native Physical AndroidまたはGitHub-hosted Emulatorが利用可能な場合のconditional validation。利用できない場合はPlan指定のEnvironment block。

### Out

- Web / Native workflow mode、新Web runner、generic Training framework / CLI、plugin / class hierarchy、cleanup state machine。
- `training/maestro/exercises/native-training-exercise.yaml` の変更。
- Product code、Product Formal workflow / Required Gate、Normative Specification、Curriculum全面rewrite、Native failure fixture、scoring / learner DB。
- merge、force push、mainへの直接commit / push。

## Current understanding

- Current branchは `docs/pr5-training-evidence-plan`、worktreeは初期確認時clean、HEADは `174be3e`。
- PR #124はOPENでbaseは `main`、remote headはcurrent HEADと一致する。
- PR差分は正本Plan 1ファイルのみで、実装は未開始。
- ユーザー指示のPlan path表記は `pr5-training` だが、tracked fileおよびPR本文の実パスは `pr5_training`。既存ファイルを正本として使用し、renameはしない。
- 正本Planは全文確認済みで、source implementation開始を妨げるblockerはない。Native runtime availabilityだけがconditional unknownである。

## Assumptions

- Plan内の実在するunderscore形式のtracked pathを正本Planとして扱う。
- 既存のrepository convention、既存helper、既存contract test構造を再利用する。
- PR本文はリポジトリのPR言語ルールに従い日本語で更新する。
- GitHub-hosted runtimeがこの作業環境から直接実行できない場合、source/static validationを完了し、Native runtimeはEnvironment blockにする。

## Non-goals

- Planにない設計改善、依存追加、Product変更、Workflow topologyの拡張。
- Native exercise内のbaseline `runFlow`除去、skip flag / mode / conditional追加。
- Validatorとcontract testへの同一package / entry mapping literalの二重固定。

## Impacted areas

- `package.json`
- `scripts/training/run-maestro-baseline.ts`
- `scripts/training/maestro-runner.ts`
- `scripts/training/run-maestro-exercise.ts`
- `training/github-actions/training-ci.yml`
- `training/github-actions/training-native-ci.yml`
- `training/github-actions/README.md`
- `scripts/training/workflow-contract.ts`
- `scripts/validate-curriculum.ts`
- `tests/contracts/training-curriculum.test.ts`
- Plan指定のWeb 4教材、Native 2教材

## Change strategy

1. Current runner、workflow、validator、contract test、対象教材の構造と既存テストを確認する。
2. Task 1としてWeb desktop direct commandと4教材のbounded同期を実装する。
3. Task 2としてCurrent Native baseline cleanup / executionを挙動変更なしで1 bounded helperへ移し、exercise thin entryを追加する。
4. Task 3A / 3BとしてWorkflowのchecked expected-failure、Native exact path opt-in、baseline→exercise、Artifact分離を実装する。
5. Task 4としてNative P1-7とP2-6の指定箇所、およびWeb指定箇所を同期する。
6. Task 5としてvalidator / workflow contract / contract testの責務を分離したまま最小同期する。
7. Required validationを指定順で実行し、失敗時は最初の異常を分類してrepair-loopのbounded手順で修正・再検証する。
8. Native runtimeの可否をpreflightで確認し、可能な場合のみ実行、不可の場合はEnvironment blockをRunへ記録する。
9. Sanitizer、最終diff / DoD確認、commit、non-force push、PR本文更新を行う。

## Validation plan

- `pnpm run typecheck:training`
- `pnpm run training:web:baseline`
- `pnpm run training:web:exercise`
- `pnpm run training:web:mobile:exercise`
- `pnpm run training:web:check-expected-failure`
- `pnpm run validate:curriculum`
- `pnpm run test:contracts`
- `pnpm run format:check`
- `pnpm run lint:markdown`
- `git diff --check`
- Plan指定のworkflow static validation、Training Copy prepare / validate、manual learner criteria、Native Environment blockまたはruntime validation。

## Definition of Done

- 正本PlanのDoD 1〜45を1項目ずつ `DONE` / `BLOCKED` / `NOT APPLICABLE` で最終確認する。
- Required local/static validationが全てPASSする、またはPlan指定の具体的なEnvironment block / stop conditionを記録する。
- 変更scopeがExpected implementation file set内で、explicit no-change asset、Product Formal workflow、Product code、dependencyを保護している。
- commit済み、対象branchへnon-force push済み、PR #124本文が現行実装状態へ更新済み、mergeしていない。

## Risks / Unknowns

- Native local device / emulator / KVM / quotaの可否は環境依存。source defectと混同せず、最初の失敗stageをEnvironment blockへ記録する。
- Current cleanup sequenceの移管でsecond force-stop、pm clear Success確認、pidof status handling、timeout / spawn / exit handlingを変えると回帰する。contract testとdiff reviewで保護する。
- PR本文のremote更新は外部状態変更を伴うため、更新前にbranch、status、tracking、PR headを再確認する。

## Thinking Log

- 2026-09-06 JST: 正本Plan全文、AGENTS.md、PLANS.md、feature-plan手順、PROJECT_CONTEXT、最近のADR / Runを確認した。
- 2026-09-06 JST: 指定Plan pathの表記差異を確認した。tracked PlanとPR本文が一致するunderscore形式を使用し、Plan自体のrenameはしない。
- 2026-09-06 JST: PR #124はPlan-only差分であり、実装開始条件を満たす。Native runtimeはsource/static実装後に可否を判定する。
