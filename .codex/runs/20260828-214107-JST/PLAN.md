# Plan

## Goal

- Master PlanのPR 2「Formal Test Strategy / Perspective / Traceability」child Planを実装開始前の完成状態へ整える。
- Repository標準の`docs/plans/TEMPLATE.md`構造へ合わせ、同じ契約の重複記載を減らす。
- RA-G1 / RA-G3 / RA-G6の完了境界を明確にしつつ、存在しないautomationや不要な管理構造を追加しない。

## Impacted areas

### In

- child PlanのRepository標準Template構造への再編。
- Functional / Non-functional Requirement Groupの`Representative Verification`実装方法の固定。
- `test_strategy.md`を全面rewriteせず必要箇所だけ最小修正する契約の追加。
- `IMPLEMENTATION_BASE_SHA`、Risk mapping、Current下位label Disposition等の既存契約の維持。
- TASKS / REPORTへの最新review結果の同期。

## Non-goals

- `docs/08_testing/test_strategy.md` / `docs/12_quality/requirements_traceability.md`の実装修正。
- test、contract、validator、workflow、package、Playwright config、Product、Curriculumの変更。
- local plan-only validation / Sanitizer実行。
- PR 2 implementation / PR作成 / merge。

## Current understanding

- PR 2の実装Writable scopeは`docs/08_testing/test_strategy.md`、`docs/12_quality/requirements_traceability.md`、新implementation Runだけ。
- Plan-only validation / Sanitizer完了後、実装開始直前のbranch HEADを`IMPLEMENTATION_BASE_SHA`として記録し、implementation scopeは`IMPLEMENTATION_BASE_SHA...HEAD`で判定する。
- Requirement TraceabilityはRequirement Group、WE-CORE 12、実装開始時点のCurrent下位代表label全件の3層を完了対象とする。
- Functional Group Matrixは既存`Test Suite`列を維持し、その右へ`Representative Verification`を1列追加する。
- Non-functional Groupは既存`検証`列を`Representative Verification`として再利用し、新しい第4列を追加しない。
- Risk mappingは16件をgroup化せず、Requirement / AC、Technique、Perspective、Level、Formal suite、Gateを別フィールドで持つ。
- Techniqueは説明できる場合だけ記載し、非適用なら`—` / `Not primary`を許容する。
- Current下位代表labelは実装開始時点の全件を`exact-title` / `suite-level` / `stop`へDispositionする。22行はPlan作成時点のEvidenceに限定する。
- `playwright.config.ts`内のFormal E2E / Smokeと`ui-review-*`はproject責務で区別する。

## Assumptions

- Current automationがないverificationへ架空のcode referenceを作らない。
- Formal suiteはstableな代表実行単位、CI Gateは最も近いworkflow job / matrix legとする。
- `test_strategy.md`はCurrentで正しいPhase 1 Risk、Unit重点、Repository Contract重点、Data方針、Accessibility、UX、性能等を原則維持し、3軸・Risk mapping・接続説明に必要な最小修正だけ行う。全面rewriteしない。
- 新Stable Risk ID、第三Traceability SSOT、permanent inventoryは作らない。

## Files to inspect

- `docs/08_testing/test_strategy.md`
- `docs/12_quality/requirements_traceability.md`
- test、contract、validator、workflow、package、Playwright config、Product、Curriculum。

## Open questions

- 現時点でblocking questionなし。
- Requirement Group / Current下位label / Risk mappingをCurrent evidenceから合理的に接続できない場合は実装時Stop conditionとする。
- 新Test / 新Gate / 新ID制度 / Test codeへのID埋込み / 追加Traceability SSOTが必要になる場合はStopする。
- PR 3〜5のPrimary owner領域へ踏み込む必要がある場合はStopする。

## Change strategy

1. child Planを`docs/plans/TEMPLATE.md`準拠の責務へ再配置し、重複を削る。
2. Functionalは1列追加、NFRは既存`検証`列再利用と固定する。
3. `test_strategy.md`全面rewrite禁止を明示する。
4. 既存のscope / Traceability / Risk / Formal-Training / Native契約を維持する。
5. TASKS / REPORTへ今回review結果を同期する。
6. Product / Test Strategy本文等へ実装差分がないことを確認する。
7. local plan-only validation / Sanitizerは未実施のまま保持する。

## Validation

- child PlanがRepository標準TemplateのGoal / Current understanding / Assumptions / Non-goals / Impacted areas / Files to inspect / Change strategy / Validation / Risks / Open questions / Follow-upを明示している。
- Functional / NFRの`Representative Verification`実装方法が一意で、NFRに重複列を追加しない。
- `test_strategy.md`の全面rewriteを禁止し、Currentで正しい説明を維持する契約がある。
- `IMPLEMENTATION_BASE_SHA`によるimplementation delta scope契約が維持されている。
- Risk mapping / Current下位label / Formal-Training / platform guaranteeの既存契約が維持されている。
- 今回はPlan / Run Artifact以外を変更していない。
- local plan-only validation / Sanitizerは未実施であることを維持している。

## Risks

- GitHub connector上ではlocal `pnpm` validation、`git diff --check`、Sanitizer Write / Checkを実行できないため、PASSとは記録しない。
- Plan修正後もlocal plan-only validation / Sanitizer完了まではimplementationを開始しない。

## Follow-up

- 今回は実装を開始しない。

## Thinking Log

- 2026-08-28 21:41 JST: 初版child Planを保存した。
- 2026-08-28 21:53 JST: 1回目レビューの7 Findingを反映した。
- 2026-08-29 06:05 JST: Requirement Group / Risk mapping / 下位label / semantic driftの4 Findingを反映した。
- 2026-08-29 06:18 JST: Technique必須化、Formal分類、22行固定契約の3 Findingを反映した。
- 2026-08-29 06:23 JST: Plan Run Artifactを最新child Planへ同期した。
- 2026-08-29 06:34 JST: implementation delta、NFR verification、Risk suite / Gate粒度の3 Findingを反映した。
- 2026-08-29 06:42 JST: child PlanをRepository標準Template構造へ整理し、Functional / NFRの列扱いと`test_strategy.md`最小変更方針を固定した。
