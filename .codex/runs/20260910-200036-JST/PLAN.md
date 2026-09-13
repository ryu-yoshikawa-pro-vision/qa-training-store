# PR #133 レビュー指摘修正計画

## Objective

PR #133のレビューで確認された5件の不整合を、既存の正本PlanとProduct境界を維持したまま修正する。

## Scope

- In:
  - `scripts/validate-curriculum.ts` のstarter判定とWorkbook Evidence参照検証
  - `tests/contracts/training-curriculum.test.ts` のstarter、automation_decision、Evidence回帰ケース
  - `docs/curriculum/test-automation/part1/03_test-design-and-automation-selection.md`
  - `training/workbook/README.md`
  - `docs/curriculum/test-automation/01_spreadsheet-test-design.md`
  - `docs/adr/0023-test-automation-curriculum-learning-experience.md`
  - `docs/history/2026-09-09_171800_pr133-test-automation-curriculum-learning-experience.md`
  - `docs/PROJECT_CONTEXT.md`、今回Runの日本語Artifact、PR #133本文
  - `.codex/runs/20260909-161425-JST/run.json` の履歴上のmachine-generated版への復元
- Out:
  - `src/**`、BR / AC、Seed Scenario、Maestro Flowの業務上の意味
  - Native CI / Android launcher / iOS timeoutの既存修復、Expo dependency、`pnpm-lock.yaml`
  - 新しいgrader、schema、marker、URI framework、dependency、Run管理基盤

## Assumptions

- 受講者が編集するstarterをvalidatorが配布時の内容へ固定する必要はない。未編集starterの構造は、必須ファイルと実行経路の契約で担保し、learner-authored assertionを自動採点しない。
- `implementation_path`は既存どおり実在するRepository内Path、`evidence`は実行時参照として存在確認なしで扱う。
- target `run.json`は履歴で確認できる直前のmachine-generated版を、その内容のまま復元する。今回RunのManifestは正規writer / collectorが新しい観測を生成しない限り直接編集しない。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。ユーザー指示、正本Plan、Repository契約で範囲が確定している。
- 仮定してよい細部: 条件表のYes / Noはautomation_decisionではないため、条件値として残す。automation_decisionを説明する文章だけをCanonical 3値へ揃える。
- 未回答の重要質問: なし。

## Hypotheses

- H1: starterの`.first()` / `toBeVisible()`禁止とstarter内の`resetScenario`要求を外せば、受講者の正当な編集をvalidate:curriculumが拒否しなくなる。
- H2: Evidence専用の小さな安全性検証で、絶対Path、drive-relative、`file:`、親相対Traversalを拒否しつつURL、Artifact名、相対参照、未生成Artifactを許可できる。
- H3: 教材のCanonical 3値、Run Manifestの履歴上のmachine-managed状態、PR/ADR/履歴の変更範囲を同時に整合させれば、レビューの5件を追加のProduct変更なしに解消できる。

## Research Plan

- Round 1 Query: validator、契約テスト、教材、Run collector / schema、PR差分を確認する。
- Round 2 Query: 変更後の局所テスト、標準verify、Training Copy、GitHub ActionsとPR headを同一SHAで確認する。
- Exit Criteria:
  - H1〜H3それぞれにテストまたは履歴・契約の根拠がある。
  - 全変更が宣言したscope内にあり、Product / Native境界を越えない。
  - local / Training Copy / remote gateとPR本文、Run REPORTの説明が一致する。

## Approach

1. 現在のbranch、PR、main、Run履歴と関連契約を確認する。
2. Run Artifactの履歴版を復元し、validator・教材・契約テストを最小差分で修正する。
3. ADR、history、PROJECT_CONTEXT、Run REPORTへ変更範囲と根拠を追記する。
4. 局所検証、`verify`、Training Copy、scope / sanitizer確認を順に実行する。
5. branch safetyを再確認してcommit / non-force pushし、新headのRemote CIとPR本文を同期する。

## Definition of Done

- 通常のPlaywright assertionをvalidatorが禁止しない。
- `Automate` / `Later` / `Do not automate`が教材、CSV、validator、契約テストで一致する。
- Evidenceの危険なローカル参照を拒否し、安全な参照を許可する。
- target Run Manifestが履歴上のmachine-generated状態へ戻り、今回Runへ訂正をappend-onlyで記録する。
- PR/ADR/history/PROJECT_CONTEXTが実際のPlaywright教材、Training Workflow、公開docs Smokeの変更とProduct境界を正しく説明する。
- `pnpm run validate:curriculum`、`pnpm run typecheck:training`、`pnpm run test:contracts`、`pnpm run verify`、Training Copy、`git diff --check`、Sanitizer、Remote CIが成功し、PR #133 headとworktreeを確認する。

## Risks / Unknowns

- validatorをgraderへ拡張すると学習者の自由な実装を再び制約するため、既存の構造契約と安全性検証だけに留める。
- Evidenceを`path.resolve()`するとURLや実行時Artifactを誤ってFile扱いするため、Evidence専用判定ではURLを解決しない。
- 過去RunのManifestやREPORTの意味を上書きしない。履歴上の誤った手書きManifestだけをmachine-generated版へ戻し、判断は新しいREPORTへ追記する。

## Thinking Log

- 2026-09-10 JST: review findingはactionableでscopeが明確なため、repair-loopの1 bounded iterationとして開始した。External full review / re-reviewは起動しない。
