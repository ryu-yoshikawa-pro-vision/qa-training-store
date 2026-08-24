# Plan

## Objective

- PR #53 で `main` に確定した Repository Audit / Curriculum Validity Review の Findings を段階的に解消する Master Plan を作成する。
- Decision B（共通卒業像は汎用 Test Automation Engineer、Native は specialization）を前提とする。
- Review findings を反映し、Master Plan と active Run Artifact の実行境界を一致させる。
- Master Plan review 完了後も同じ active Run を Step 0 まで継続し、RA-M7 の最小CI unblocker・Validation・required CI を追跡する。

## Scope

- In:
  - マージ後 `main` の確認
  - 計画用 branch の作成
  - durable Master Plan の作成・修正
  - Findings の依存関係と子 PR 境界の定義
  - RA-M7 を別 branch / 別 Run に分離せず、Master Plan branch の同一PRで最小CI unblockerとして扱う実行契約の確定
  - PR 3でDecision Bを正本化した直後にRequired / specializationの中間矛盾を残さないtransition contract
  - Web Desktop learner exercise の canonical command `training:web:exercise` を PR 5 契約へ追加
  - Phase 6 の current `main` caller / dependency rediscovery と merge直前 freshness contract
  - active Run Artifact の最新 Master Plan への意味上の整合
  - Step 0 の実装・Validation・required CI を未完了taskとして継続追跡
- Out:
  - PR 1〜5 の実装
  - Refactoring 実装
  - PR 作成
  - この planning repair turn での `scripts/validate-curriculum.ts` の実変更・Validation実行

## Assumptions

- Decision B はユーザー承認済み。
- Native specialization 化は Curriculum の Learner Required boundary のみであり、Formal Native Regression / CI Gate は維持する。
- 技術的負債候補は size 単独で Refactor 対象にしない。
- RA-M7 は1ファイルで変更点が明確な軽微修正であり、新しい専用Plan / Run / branchを増やさず、Master Plan branch の同一PRで扱える。
- PR 3ではLessonの深さを再設計せず、P1-7 / P1-9 / P2-6 / P2-8のRequired / specialization境界だけを同期する。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。
- 仮定してよい細部: ADR 番号、子 branch 名、Traceability Matrix の最終配置。
- 未回答の重要質問: Refactoring 候補の優先度と Pilot 実測値は後続 Phase で解決する。

## Hypotheses

- H1: Fact drift と design change を分離すると、各 PR の reviewability と rollback safety が上がる。
- H2: Formal Test Strategy を Competency / Curriculum depth より先に確定すると、C05 / C12 等の再作業を減らせる。
- H3: Refactoring を Formal Strategy 確定後に並行調査し、current `main` で direct caller / dependency discovery を再実行して merge直前 freshness check を要求することで、size-driven / stale-evidence refactor を防げる。
- H4: RA-M7 のためだけに別branch / 別Runを増やさず、Master Plan branchの同一PRへ最小修正を同居させる方が、CI循環とRun Artifact分散の両方を避けられる。
- H5: Decision B の境界 wording を PR 3 で必要最小限Lessonへ反映し、深さ調整を PR 4 に残すことで、中間矛盾を作らずPR責務も維持できる。

## Research Plan

- Round 1 Query:
  - PR #53 の merge 状態と `main` HEAD を確認する。
  - Repository の Plan template / planning rule を確認する。
  - Report Findings と current validation entry を再確認する。
- Round 2 Query:
  - ADR / Curriculum / Test Strategy / Training / Refactoring の変更境界を整理する。
  - Current CI / validator / Training Web・Native entrypoint / Run Artifact 契約を照合する。
- Round 3 Query:
  - Current Native Lesson / Capstone のRequired wordingとPR 3 transitionを照合する。
  - Phase 6で新規callerを見落とさないfreshness boundaryを確認する。
- Exit Criteria:
  - 主要 Findings が子 PR 単位へ分類されている。
  - Decision B の影響境界が明示されている。
  - PR 3単体でもRequired / specialization正本が矛盾しない。
  - Validation と stop condition が定義されている。
  - Master Plan と Run Artifact の実行順・残差が一致している。

## Approach

- `main` HEAD を確定する。
- `plan/curriculum-test-strategy-remediation-master` を作成する。
- `docs/plans/2026-08-24_201800_curriculum_test_strategy_remediation_master.md` を保存・review findingに合わせて更新する。
- Master Plan merge前のStep 0は、同branch / 同PRで次を扱う契約とする。
  - active Run Artifact の意味上の整合
  - RA-M7 required path の最小CI unblocker
  - `validate:curriculum` / `test:contracts` / `typecheck` / format / markdown / Sanitizer / required CI
- Step 0開始時に `run.json` を実状態へ更新し、`task_type` / `changed_files` / `validation` / `status` を今回の実行と一致させる。
- PR 1〜5 の実装は行わず、各 Phase 開始前に child Plan を作る。
- PR 3ではREADME / Learning Design / Rubric / Instructor Reference / Validatorに加え、P1-7 / P1-9 / P2-6 / P2-8のRequired / specialization boundaryだけを同期する。Lesson depth / Core・Extension・Reference整理はPR 4へ残す。
- PR 5 では `training:web:exercise` と `training:native:exercise` の直接入口を、既存Training runner/configを再利用する最小構成で扱う。
- Phase 6 decision-only PRは本Master Planを直接使用し、調査scopeが変わらない限り追加child Planを作らない。

## Definition of Done

### Master Plan review / repair

- Master Plan が `docs/plans/` に保存されている。
- Run Artifact が保存され、最新 Master Plan と矛盾していない。
- branch / base SHA / Plan path が確認できる。
- Plan が Current drift、Curriculum、Strategy、Training、Refactoring を分離している。
- Remediation Matrix の Primary owner / follow-up / execution order が一貫している。
- RA-M7 の separate hotfix branch を不要にし、同一PRの最小CI unblockerとしてStep 0に統合している。
- PR 3単体でDecision BのRequired / specialization境界がREADME / Learning Design / Rubric / Instructor Reference / Validator /対象Lesson間で矛盾しない契約になっている。
- canonical Curriculum pathの変更対象表記は `00_learning-design.md` に統一され、underscore表記はCurrent validator mismatchの説明にのみ残る。
- Phase 6 の caller / dependency rediscovery と freshness check が decision-only PR作成前とmerge直前の両方に定義されている。
- PR 5 に Web Desktop learner exercise の canonical `training:web:exercise` 契約がある。
- Phase 6 decision-only PRで追加child Planを作る条件が明確である。

### Step 0 completion

- `TASKS.md` の Step 0 task が完了している。
- RA-M7 required path の最小修正が入っている。
- `run.json` が実変更・Validation・statusと一致している。
- Planで要求した local Validation / Sanitizer / Repository required CI がPASSしている、または安全上の停止条件が具体的根拠付きで記録されている。
- Master Plan + RA-M7 CI unblocker PR の merge readiness が確定している。

## Risks / Unknowns

- Audit baseline 後に `main` が進んでいるため、各 Finding は実装前に Current `main` で再検証する。
- Curriculum Optional 化と Product Quality Gate の変更を混同しない。
- RA-M7 の実修正は Step 0 で path literal の最小変更に限定し、semantic / cleanup へ広げない。
- Run Artifact の履歴は削除・並べ替えず、TASKS更新とREPORT appendで最新状態へ合わせる。
- Phase 6では初回に把握した関連pathだけを固定せず、current `main` でcaller / dependency discoveryを再実行して新規callerの追加・削除を検出する。

## Thinking Log

- 一括修正 PR は scope と判断理由が混ざるため採用しない。
- Decision B は Curriculum の卒業要件を軽量化するが、Formal Native Product guarantee は維持する。
- Traceability は Markdown Matrix と既存 validator / contract test を優先し、新管理基盤は作らない。
- Refactoring は `refactor_now` と判断できた候補のみ別 Plan に切り出す。
- RA-M7 は別 hotfix PR にすると active Run が branch 間で分散するため、Master Plan branch の同一PRに統合する方針へ簡素化した。
- `training:web:exercise` は既存 `playwright.training.config.ts` と `training/playwright/exercises` を直接使う package command とし、新 runner は作らない。
- PR 3でLesson本体の全面調整を行うとPR 4と責務が重なるため、PR 3はRequired / specialization境界だけに限定する。
- Phase 6 decision-only PRは本Master Planだけで実装判断可能なため、scopeが変わらない限り追加Planを作らない。
