# PR #133 複数モデルレビュー指摘の再確認・限定修復計画

## 0. 依頼概要

- 依頼内容: PR #133の複数モデルレビュー指摘を、現在のHEAD、正本Plan、実装、教材、contract test、GitHub Actions証跡で再確認し、成立した指摘だけを修正する。
- 背景: レビュー結果には共通指摘、単独指摘、判定が割れた指摘が混在している。レビュー文をそのまま仕様にせず、再現性と既存契約を確認する必要がある。
- 期待成果: 指摘ごとの`reproduced/fixed/deferred/rejected/unverified`判定、必要な局所修正、回帰検証、Run Artifact・PR本文の同期。

## 1. ゴール / 完了条件

- ゴール: 現行PRの学習導線、validator、Native CI補助、Run評価の実態を確認し、正当な修正だけをbounded repairとして完了する。
- 完了条件（DoD）:
  - 14項目すべてを証拠付きで再確認し、判定と理由をRun REPORTへ記録する。
  - 成立した指摘だけが許可範囲の最小差分として修正され、対応するcontract / local / remote検証がPASSする。
  - `run.json`を手編集せず、evaluationとmachine-managed Evidenceの追跡性を既存経路で確認する。
  - Training Copy、Sanitizer、PR HEAD、Remote CI、worktree状態を最終確認し、日本語のPR本文へ同期する。

## 2. 現状理解と前提

- Current understanding:
  - 現在のbranchは`refactor/test-automation-curriculum-learning-experience`、PR #133はopen、HEADは`28b1525d6368ce89c3b4eaf4ccc291fbfde41dc7`。
  - `origin/main`は`13cc542fa31f372bd4bc932cf7a82b92bcf81a23`へ進んでいる。merge-baseは`55cb43abb06fa96dd3f283d7ae4a20b6076af5f5`であり、競合・依存関係を調べて必要性を判断するまで自動rebase / mergeは行わない。
  - 前回のPR修正で、starter自由度、Evidence境界、Canonical 3値、Native限定修復、iOS timeout、Run評価記録などが既に入っている。今回それらを前提に実際の不足だけを再判定する。
- Assumptions:
  - ユーザー指示は対象branchへのnon-force push、必要な局所修正、PR本文更新を許可している。
  - 既存のvalidator、YAML解析、Run collector、Training Copy経路を再利用し、新しいgrader、schema、framework、dependencyは追加しない。
- Non-goals:
  - `src/**`、Product Behavior、BR / AC、Seed Scenarioの意味、Workbook schema、Playwright Training全体、Training Copy方式、Maestro Flowの意味、iOS Build-only保証、runner / Xcode / CocoaPods / cache、新規grader / schema / framework / dependency。
  - CodeRabbit等の外部Full Review / 再レビュー、merge、PR close、branch削除、force push。

## 3. 質問 / 曖昧性

- 必ず質問する不透明点: なし。ユーザーがbounded scope、判定基準、禁止事項、検証条件を具体的に指定している。
- 仮定してよい細部: 既存構造契約で表現できる場合のfixture形式、Run REPORTのcheckpoint時刻、責務単位のcommit分割。
- 未回答の重要質問: なし。実経路で証拠が得られない項目は`unverified`または`rejected/deferred`として記録する。

## 4. 影響範囲

- Impacted areas:
  - Android Native workflow/helperとcontract test
  - curriculum validator、Training Workflow contract、Workbook、P1/P2教材・rubric
  - Run Artifact / evaluation / history / Plan / PR metadata
- Files to inspect:
  - `.github/workflows/native-ci.yml`, `.github/workflows/native-ios-ci.yml`
  - `scripts/native/android-maestro-run.sh`, `scripts/validate-curriculum.ts`, `scripts/training/workflow-contract.ts`
  - `tests/contracts/native-ci-workflow.test.ts`, `tests/contracts/training-curriculum.test.ts`
  - `training/workbook/04_execution-improvement.csv`, `training/workbook/README.md`, `training/github-actions/training-ci.yml`, `training/playwright/diagnostic-exercises/diagnostic-cart.spec.ts`
  - `docs/curriculum/test-automation/README.md`, P1-1/P1-2/P1-3/P1-4/P1-6/P1-8/P1-9、rubric、P2-5/P2-8、正本Plan、iOS history / REPORT
  - `docs/reference/run-artifacts.md`, `scripts/codex-task.ps1`, `scripts/collect-run-artifacts.ps1`, `scripts/collect-run-artifacts.py`, target Run Artifact、関連CIログ

## 5. 変更方針

- Change strategy:
  1. 新Runを用意し、開始時のbranch / PR / main / 差分 / 現在のChecksを記録する。
  2. 指摘ごとに実装、教材、validator、contract、Run / CI証跡を読み、再現fixtureまたは既存ログで成立性を判定する。
  3. 成立した指摘だけを、宣言したallowed scope内で最小修正する。修正前に対象ファイルと最小検証を確定する。
  4. 局所検証、標準verify、Training Copy、必要なNative / Remote CIを実行し、失敗時は最初の異常を調査してbounded loopを止める条件を守る。
  5. Run REPORTへ各判定と意味情報をappend-onlyで追記し、evaluationは既存schema / machine-managed経路へ接続する。
- 実行タスク:
  - [ ] 1. 開始状態、正本Plan、最近のRun、PR / main / CIを確認し、Runへcheckpointを記録する。
  - [ ] 2. Android helperのstandalone call contractを再現し、必要なら修正する。
  - [ ] 3. Pixel Launcher package確認のbroken pipeをログとworkflowで再現確認し、必要なら修正する。
  - [ ] 4. Evidence説明文によるlocal path境界回避を再現し、必要なら修正する。
  - [ ] 5. C09のWorkbook、diagnostic、P1-6、rubric、P1-9の学習経路を照合する。
  - [ ] 6. C12のPlan / rubric / P2-5 / P2-8 / Training WorkflowのEvidence接続を照合する。
  - [ ] 7. Training Workflow contractのexercise step単位保証を再現し、必要なら修正する。
  - [ ] 8. P1-8旧シート名、P1-4以前のExecutable Source参照、ja-JP ANR経路を実経路で判定する。
  - [ ] 9. iOS timeout原因のhistory / REPORTを証拠の強さへ訂正し、PlanのNative限定修復例外を確認する。
  - [ ] 10. Run collector / manifest / evaluationのcanonical Evidence追跡性を検証する。
  - [ ] 11. 判定一覧、変更scope、未確認事項、PR説明方針をRunへ記録する。
  - [ ] 12. focused contract、validator、shell / YAML、local標準検証を実行する。
  - [ ] 13. 最終SHAでTraining Copy、Sanitizer、必要なNative / Remote CIを確認する。
  - [ ] 14. PR本文、Run Artifact、PROJECT_CONTEXT / history / Planを最終同期する。
  - [ ] 15. branch safety、commit / non-force push、同一HEAD checks、clean worktreeを確認し完了する。

## 6. 検証方法

- Validation plan:
  - 指摘別fixture: helper call削除・順序移動、package取得成功 / 不存在 / 取得失敗、Evidence negative / positive、exercise step条件移動。
  - `pnpm run validate:curriculum`、`pnpm run typecheck:training`、`pnpm run test:contracts`、`pnpm run verify`、`git diff --check`。
  - Native変更時は`bash -n`とNative contract、Remote Mobile App CIを実行する。教材 / workflow変更時はcommit済みSHAでTraining Copyをprepare / validateする。
  - `scripts/sanitize-codex-artifacts.ps1`のWrite / Checkと、evaluation schema / Evidence refのpath・selector・実行事実照合を行う。
- 成功判定:
  - 変更した契約の現在fixtureがPASSし、指定された反例がFAILする。
  - local標準gate、Training Copy、Sanitizer、必要なRemote gateがPASSする。
  - 14項目の判定が証拠と一致し、未確認事項を成功として扱わない。

## 7. リスクと未解決論点

- Risks:
  - `origin/main`の進行により差分が古くなる可能性がある。mainとの差分と対象ファイルの依存を確認し、必要性がなければrebaseしない。
  - Native runtime証拠は環境依存である。推測によるhelper変更を避け、既存Remoteログを優先し、実証不能な項目は未確認とする。
  - Run `run.json`はmachine-managedであり、直接編集しない。既存collectorが提供する範囲を超える場合は、差分と理由を明記し、schema変更へ拡張しない。
- Open questions:
  - Pixel Launcher broken pipeが現行ログで再現するか。
  - ja-JP UI hierarchyのローカライズ非依存属性を実環境で取得できるか。
  - main進行分がPR対象へ競合または検証依存を持つか。

## 8. 成果物

- 変更ファイル: 再現した指摘に必要な既存validator、contract、workflow/helper、教材、Run / history / Planの最小範囲。
- 付随ドキュメント: `.codex/runs/20260911-075512-JST/`のPLAN / TASKS / REPORT / 必要なevaluation、PR本文。durable reportは作成しない。

## 9. 備考

- 各指摘は`must_fix`、`should_fix`、`defer`、`reject`、`needs_human`のいずれかへ分類し、`needs_human`が生じた場合はrepair loopを停止する。
- Planの元の設計判断は書き換えず、実装中の限定例外だけを末尾へ追記する。
