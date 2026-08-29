# Plan

## Objective

- PR #79 の指定ブランチ上で、既存のExpo SDK lineに対するcompatible dependency mismatchを安全条件付きで検知・修正PR化する最小Workflowと、その重要契約を保護する専用Contract testをPlan SSOTどおり実装する。

## Scope

- In:
  - `.github/workflows/expo-dependency-maintenance.yml`
  - `tests/contracts/expo-dependency-maintenance-workflow.test.ts`
  - Strict Run Artifact（このRunの`PLAN.md`、`TASKS.md`、`REPORT.md`、`run.json`、`evaluation.json`）
- Out:
  - `package.json`、`pnpm-lock.yaml`
  - 既存CI Workflow、アプリケーションコード、既存Native Contract test
  - 現在発生しているdependency mismatchの修正
  - commit、push、merge、新規branch／PR作成
  - Planにない汎用化、retry、polling、notification、auto-merge、認証方式追加

## Assumptions

- `docs/plans/2026-08-29_061400_expo_dependency_maintenance.md` を実装仕様・処理順・安全条件・停止条件・ValidationのSSOTとする。
- PR #79 はOPENで、baseは`main`、headは`chore/expo-dependency-maintenance`。現在のbranchと一致している。
- 実装開始時の`main`／`origin/main`は`12afd144cc81fb63a3c6d3a0edcee1eb6ed2317a`、Node.jsは`v24.12.0`、pnpmは`9.10.0`である。
- 既存CIで使用中のAction pinはPlan記載値と一致しているため、そのSHAを再利用する。
- GitHub Actionsのbranch push／PR作成policyはローカルValidationでは完全確認できず、merge後の初回運用確認へ引き継ぐ。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。対象、DoD、停止条件、変更禁止範囲はユーザー指示とPlanで確定している。
- 仮定してよい細部: 既存Contract testのVitest／文字列ベース形式、PrettierのYAML／TypeScript形式に従う。
- 未回答の重要質問: なし。GitHub上の実運用permissionはmerge後のFollow-upとして記録する。

## Hypotheses

- H1: 既存CIのAction pin、Node／pnpm設定、repositoryの文字列Contract test形式を再利用すれば、アプリ側・既存CI側の変更なしにWorkflow契約を実装できる。
- H2: `needs_fix`分岐、major.minor guard、tracked／untracked allowlist、duplicate PR guardをContract markerで検査すれば、Planの主要な安全境界を過度にfragileにせず固定できる。

## Research Plan

- Round 1 Query: 必須docs、Plan全文、最近のADR、最近のRun、PR #79、branch／main、Node／pnpm、既存CIのAction pin、既存Contract testを確認する。
- Round 2 Query: 実装後に変更差分、禁止ファイル混入、format／lint／typecheck／Contract test、可能な通常CI相当の結果を確認する。
- Exit Criteria:
  - H1／H2を既存Repositoryの根拠と実Validationで確認できる。
  - Planで指定された全Validationを実行し、FAIL時は今回の差分に起因する最小修正と再検証を行う。
  - `main`との差分が実装対象とRun Artifactに限定され、禁止ファイルに変更がない。

## Approach

1. Plan SSOTどおりtrigger、main固定、permission、concurrency、duplicate PR guardをWorkflowへ実装する。
2. frozen install、dependency major.minor capture、`expo_check`の`if`＋`GITHUB_OUTPUT`、no-op／update path guardを実装する。
3. fix後のmajor.minor guard、validation、tracked／untracked final allowlistをcommit直前に実装する。
4. run id／attempt付きbranch、bot commit、GITHUB_TOKENのみのpush、main baseのOPEN PR作成を実装する。
5. 既存Styleに合わせた文字列ベースContract testを追加する。
6. 指定Validation、通常CIの実行可能範囲、差分／scope／Sanitizerを確認する。

## Definition of Done

- Planの全Contract markerと安全条件を満たすWorkflowと専用Contract testが存在する。
- 指定された4つのValidationがPASSする（または今回差分と無関係な失敗は根拠付きで停止条件として記録する）。
- 既存CI、アプリケーション、dependency version、lockfile、現在のmismatchを変更していない。
- commit／push／mergeを行わず、PR #79の指定branch上に変更を残す。
- Run Artifactを日本語で更新し、Sanitizer Write／CheckをPASSさせ、Strict用`evaluation.json`を保存する。

## Risks / Unknowns

- GitHub Actionsの実permission、PR Workflow approval-required挙動、schedule実行はローカルでは再現できない。merge後の初回`workflow_dispatch`確認へ分離する。
- WorkflowのYAML構造は新規追加であるため、Contract testはPlan指定の重要markerに絞り、shell全文・step名・PR body細部・step位置を固定しない。
- `pnpm install --frozen-lockfile`やExpo CLIの実行は依存・network状況に左右される。実行前に現在のRun／差分／環境条件を確認し、失敗時は最初の異常を分類する。

## Thinking Log

- 2026-08-29 07:21 JST: Plan全文475行、既存CI、既存Contract test、PR #79、branch、main、Node／pnpm、Action pinを確認した。Planに明確な誤りは見当たらず、独自仕様を追加しない。
- 2026-08-29 07:21 JST: 現在のExpo dependency mismatchはPlanの対象外であるため、mechanism実装では修正しない。変更面はWorkflowと専用Contract testに限定する。
- 2026-08-29 07:36 JST: 通常CIのMarkdown lintでPlan本文の空行／末尾改行だけがFAILしたため、意味を変えない最小修正をPlan自身へ適用し、`lint:markdown`を再実行してPASSした。

## Continuation: existing PR #79 contract repair

### Objective

- 既存PR #79の同一branch上で、Repository固有の`expo-constants` override同期とtop-level permissionsの厳密なContract testだけを追加する。

### Scope

- In:
  - `docs/plans/2026-08-29_061400_expo_dependency_maintenance.md`
  - `.github/workflows/expo-dependency-maintenance.yml`
  - `tests/contracts/expo-dependency-maintenance-workflow.test.ts`
  - `.codex/runs/20260829-072110-JST/*`
- Out:
  - `package.json`、`pnpm-lock.yaml`、既存CI、アプリケーションコード、既存Native Contract test
  - dependency mismatchそのものの修正、generic override同期、追加dependency／semver library

### Change strategy

1. `expo install --fix`直後、major.minor guard前のupdate pathに、`pnpm.overrides.expo-constants`が存在する場合だけ`dependencies.expo-constants`へ同期するNode inline stepを追加する。
2. direct dependencyが存在しない／有効なstringでない場合は失敗させ、他のoverrideは変更しない契約を維持する。
3. 既存文字列ベースContract testでtop-level permissionsを`contents: write`／`pull-requests: write`の2項目に限定し、同期処理の対象・guard・順序を検査する。
4. 指定Validation、scope、Sanitizer、branch safetyを確認してから既存PR branchへcommit／pushし、PR #79の反映だけを確認する。

### Validation plan

- `pnpm run format:check`
- `pnpm run lint`
- `pnpm run typecheck`
- `pnpm run test:contracts`
- `pnpm run lint:markdown`
- `git diff --check`
- `main`との差分、禁止ファイル、PR #79 head／state、CI開始状態
