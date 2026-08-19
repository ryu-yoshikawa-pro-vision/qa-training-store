# PR #32 Post-merge Rebaseline / Run Artifact Repair 計画

## 0. 依頼概要

- 依頼内容: PR #32のRun Artifact collision、latest-main rebaseline不足、durable Evidence契約の3 findingを修正する。
- 背景: PR #32の旧RunがmainのPublic Repository Hardening Runと同じ内部IDを使用し、旧`fc9e497` baselineがCurrent Stateとして読める。また、ignored `.artifacts/`がFormal Evidenceの唯一の参照になり得る。
- 期待成果: 080339のcanonical identity、`d297497`へのdelta rebaseline、tracked durable Evidenceとephemeral raw artifactの責務分離、全Validation、通常push。

## 1. ゴール / 完了条件

- ゴール: 既存Run／Git／Markdownだけで3 findingを最小修正し、PR #31/#33のmain変更を保護する。
- 完了条件（DoD）:
  - 080338はHardening、080339はAgentic QAとして一意で、Directoryと`run.json.run_id`が一致する。
  - Original baseline `fc9e497817e6c3cff8d89ebd7b37244e759e9484`とCurrent Rebaseline `d297497e2d2aeb0fa1ff17c48dd0ae7a86e9455a`を区別して記録する。
  - Test Target／Curriculumはunchanged、QA Systemは#31/#33を含む状態へ更新、GAP-02判断は維持する。
  - Formal Experiment Target Revisionは設定せず、Formal Experiment／Knowledge／PromotionはNOT EXECUTED／none／noneとする。
  - `.artifacts/`はephemeral raw evidence、committed recordはtracked durable referenceを標準とする。
  - 指定Validation、Sanitizer、通常commit／pushが成功する。

## 2. 現状理解と前提

- Current understanding: `origin/main`は`d297497...`で、`fc9e497..origin/main`は#31 Public Repository Hardeningと#33 Codex Hook Contract Test修正。Product／Spec／Curriculum／Training／Formal Regression本体のdeltaはない。
- Assumptions: 既存のGAP-02（Readiness／operating contract）はDocumentation／ADRで解消できる。Official Scored GAP-01はHost-trusted Evidence不足のBLOCKED／NOT EXECUTEDを維持する。
- Non-goals: 新Experiment、Validator、Artifact Server、DB、Registry、Workflow、Product／Native／Spec／Curriculum／Harness／Skill実装、PR操作。

## 3. 質問 / 曖昧性

- 必ず質問する不透明点: なし。ユーザー指示でscope、DoD、禁止操作が固定されている。
- 仮定してよい細部: 新規Plan／HistoryはRun timestampのJST名を使い、raw artifactのdigest／取得条件は必要ならtracked Run Artifactへ記録する。
- 未回答の重要質問: なし。

## 4. 影響範囲

- Impacted areas: Run Artifact identity、Experiment Evidence convention、Living Documentation、post-merge baseline evidence。
- Files to inspect: `docs/experiments/README.md`、ADR-0018、PROJECT_CONTEXT、既存implementation plan、対象Run、main delta。

## 5. 変更方針

- まず実diffと既存Runを確認し、Hardening Runを保護する。
- 次にRun ID／Referenceを局所修正し、Historical entryは保持する。
- README／ADR／Current docsへdurable Evidence境界を反映し、new historyへCurrent Stateを記録する。
- 最後に指定Validation、static consistency、Sanitizer、scope確認、commit／pushを行う。

## 6. 検証方法

- `pnpm run format:check`
- `pnpm run lint:markdown`
- spec／visual／curriculum／Agentic QA preparation／lint／typecheck／security／test／build／verify一式
- Run ID duplicate、Evidence contract、baseline SHAのstatic check
- `git diff --check`、`git diff --name-only origin/main...HEAD`
- `scripts/sanitize-codex-artifacts.ps1 -Path ... -Write -Check`

## 7. リスクと未解決論点

- Historical baselineをCurrent baselineへ誤変換しない。
- mainの080338 Hardening Runと#31/#33の内容を変更・巻き戻ししない。
- `.artifacts/`を追跡対象へ変更せず、Formal Evidenceの解決可能性だけをtracked referenceで担保する。
- CI完了、PR再レビュー、PR本文同期、CodeRabbit full reviewはこの作業のRemainingとする。

## 8. 成果物

- 対象Runのidentity／reference correction、new Repair Run、README／ADR／PROJECT_CONTEXT／history／implementation planの更新。
- Formal Experiment YAML、Knowledge Record、Promotion Artifactは作成しない。
