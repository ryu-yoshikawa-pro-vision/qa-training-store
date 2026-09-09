# Plan

## Objective

- Issue #117 PR2のobservation / evaluation contract再設計Planを、レビュー指示を反映した実装前の正本として確定する。
- 実装前にselector、initial routing、Result schema、process lifecycle、comparison、Qualification、canonical再実行条件の判断余地をなくす。

## Scope

- In:
  - `docs/plans/2026-09-09_161652_issue-117-pr2-observation-contract-redesign.md`の修正
  - 本Runの`PLAN.md`、`TASKS.md`、`REPORT.md`、machine-managed manifest
  - 必要最小限のPR #127本文のPlan状況追記
- Out:
  - evaluator / runner / selector / scoring / tests / dataset / Hook / Skill descriptionの変更
  - Observation Probe、canonical `all`、case retry、dataset変更、valid baseline取得、PR merge

## Assumptions

- Candidate C（Hybrid observation contract）、PR2=initial routing、PR6=later / multi-Skill、8 boundary-side validity、`CASE_TIMEOUT_MS = 327_000`は維持する。
- 現行Hookは`tool_input_preview`をJSON文字列として保存し、typed canonical pathは提供しない。
- 1 case = 1 child process、sequential、dedicated Target、before / after append deltaという既存correlation経路を再利用する。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。今回のPlanで実装時の主要判断を確定する。
- 仮定してよい細部: 将来Hostが提供するtyped evidenceとPR6のworkflow schemaは今回のscope外とする。
- 未回答の重要質問: なし。現行Hookで取得可能なbounded preview経路だけを対象にする。

## Hypotheses

- H1: first trusted canonical Skill direct readをinitial routing evidence proxyとし、task completion / process lifecycleから分離すれば、positive evidenceを失わずに評価できる。
- H2: absenceはtrusted `turn.completed`、Hook correlation / parse、全対象eventのreliable判定、canonical read 0件を要求すれば、safe no-readとunreliableを混同しない。
- H3: dataset schema 1とResult schema 2を分離し、schema / split / fingerprint / case ID / Codex versionを比較前提にすれば、旧artifactをfail closedで拒否できる。

## Research Plan

- Round 1 Query: current evaluator、Hook logger、dataset、Result / comparison型、validator、fixture、既存Run / PRを確認する。
- Round 2 Query: Planの未確定表現、selector grammar、lifecycle写像、Target再利用条件、PR2 / PR6境界、scope違反を再検査する。
- Exit Criteria:
  - 主要仮説ごとに支持根拠と実装対象fileが記録されている。
  - Candidate Cのdecision table、Result schema 2、summary、comparison、Qualification、canonical preconditionsが確定している。
  - Plan-only validation、sanitizer、scope、branch / PR状態を確認し、実装・Probe・canonical未実行を維持している。

## Approach

- 必須repo docs、最近のADR / Run、current code / Hook / validatorを確認する。
- 既存PlanをCandidate C中心に修正し、selector 3状態、initial-only observation、lifecycle overlay、schema 2、comparison fail-closedを一貫させる。
- literal escaped fence、未確定表現、旧thresholdの混入、後続Skill収集、過剰設計、scope逸脱を検索して修正する。
- Plan / RunをsanitizerとMarkdown / Prettier / diff checkで検証し、PR本文の状態を維持したうえで同一branchへnon-force pushする。

## Definition of Done

- 修正版Planが実装時のobservation / evaluation contractの正本になっている。
- dataset schema 1、Result schema 2、旧Result拒否、process lifecycle summary、Codex version一致、同一Target条件が明記されている。
- 旧terminal Gateを新contractへ継承せず、`CASE_TIMEOUT_MS = 327_000`をsafety capとして維持している。
- source / tests / dataset / Hook / Skill / Product codeを変更せず、Probe・canonical `all`・valid baselineを実行していない。
- Run Artifactが日本語で保存され、sanitizer residual 0、Markdown / Prettier / `git diff --check`がPASSしている。
- PR #127がOPEN、base `main`、対象branch一致、Environment Qualification FAIL・canonical未実行・valid baseline未取得を保持している。

## Risks / Unknowns

- first readはHostのinternal selectionそのものではないため、全記録でinitial routing evidence proxyとだけ表現する。
- safe no-readをunreliableへ、またはunreliableをsafe no-readへ誤分類するとabsence結果を歪めるため、3状態と専用testsを実装DoDに含める。
- 後続Skill chainはPR2へ保存せず、PR6へ明確に境界づける。
- Run manifestはmachine-managed writer / collectorの責務とし、`run.json`を手編集しない。

## Thinking Log

- 2026-09-09 19:55 JST: 前回のPlan修正を再読し、escaped code fence、非Bash Hook event、lifecycleのexit状態、旧terminal数値の混入を追加確認対象とした。
- 2026-09-09 19:56 JST: Candidate Cを維持したまま、positive candidate prefixとtrusted absenceの全対象event reliabilityを分離する方針を確定した。Result schema 2では独自contract markerを追加しない。
