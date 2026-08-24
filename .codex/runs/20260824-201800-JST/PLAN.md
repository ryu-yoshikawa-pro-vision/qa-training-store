# Plan

## Objective

- PR #53 で `main` に確定した Repository Audit / Curriculum Validity Review の Findings を段階的に解消する Master Plan を作成する。
- Decision B（共通卒業像は汎用 Test Automation Engineer、Native は specialization）を前提とする。

## Scope

- In:
  - マージ後 `main` の確認
  - 計画用 branch の作成
  - durable Master Plan の作成
  - Findings の依存関係と子 PR 境界の定義
- Out:
  - Curriculum / Test Strategy / Product / CI の実装修正
  - Refactoring 実装
  - PR 作成

## Assumptions

- Decision B はユーザー承認済み。
- Native specialization 化は Curriculum の Learner Required boundary のみであり、Formal Native Regression / CI Gate は維持する。
- 技術的負債候補は size 単独で Refactor 対象にしない。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。
- 仮定してよい細部: ADR 番号、子 branch 名、Traceability Matrix の最終配置。
- 未回答の重要質問: Refactoring 候補の優先度と Pilot 実測値は後続 Phase で解決する。

## Hypotheses

- H1: Fact drift と design change を分離すると、各 PR の reviewability と rollback safety が上がる。
- H2: Competency / Minimum Evidence を Lesson 修正より先に確定すると、Curriculum の再作業を減らせる。
- H3: Refactoring を最後に回し追加 Evidence を要求することで、size-driven refactor を防げる。

## Research Plan

- Round 1 Query:
  - PR #53 の merge 状態と `main` HEAD を確認する。
  - Repository の Plan template / planning rule を確認する。
  - Report Findings と current validation entry を再確認する。
- Round 2 Query:
  - ADR / Curriculum / Test Strategy / Training / Refactoring の変更境界を整理する。
- Exit Criteria:
  - 主要 Findings が子 PR 単位へ分類されている。
  - Decision B の影響境界が明示されている。
  - Validation と stop condition が定義されている。

## Approach

- `main` HEAD を確定する。
- `plan/curriculum-test-strategy-remediation-master` を作成する。
- `docs/plans/2026-08-24_201800_curriculum_test_strategy_remediation_master.md` を保存する。
- 実装は行わず、各 Phase 開始前に child Plan を作る前提にする。

## Definition of Done

- Master Plan が `docs/plans/` に保存されている。
- Run Artifact が保存されている。
- branch / base SHA / Plan path が確認できる。
- Plan が Current drift、Curriculum、Strategy、Training、Refactoring を分離している。

## Risks / Unknowns

- Audit baseline 後に `main` が進んでいるため、各 Finding は実装前に Current `main` で再検証する。
- Curriculum Optional 化と Product Quality Gate の変更を混同しない。

## Thinking Log

- 一括修正 PR は scope と判断理由が混ざるため採用しない。
- Decision B は Curriculum の卒業要件を軽量化するが、Formal Native Product guarantee は維持する。
- Traceability は Markdown Matrix と既存 validator / contract test を優先し、新管理基盤は作らない。
- Refactoring は `refactor_now` と判断できた候補のみ別 Plan に切り出す。
