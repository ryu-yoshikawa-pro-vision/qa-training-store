# Plan

## Objective

- Master Plan の PR 2「Formal Test Strategy / Perspective / Traceability」のchild Planをレビュー結果に基づき簡素化・具体化する。
- PR 2 implementationのWritable scope、Traceability join、code reference形式、Risk mapping形式を実装前に固定する。
- 今回は実装を開始しない。

## Scope

### In

- child Planのレビュー修正。
- Writable scopeの2文書固定。
- Risk mappingへRepresentative Requirement / ACを追加。
- `Test ID Rule`と`UT-*` / `CT-*` / `CP-*` / `WE-*`等の既存labelの監査方針明確化。
- entrypoint-first inventoryへの縮小。
- direct code reference形式の固定。
- Phase 1 Risk 16件を1 Risk = 1 rowへ固定。
- Platform parityの意味をCurrent asymmetric guaranteeとして固定。
- Plan Run Artifactへのレビュー修正Evidence追記。

### Out

- `docs/08_testing/test_strategy.md` / `docs/12_quality/requirements_traceability.md`の実装修正。
- `e2e_design.md`、test、contract、validator、workflow、package、Playwright config、Product、Curriculumの変更。
- PR 2 implementation / PR作成 / merge。

## Fixed decisions

- PR 2の実装Writable scopeは`docs/08_testing/test_strategy.md`と`docs/12_quality/requirements_traceability.md`、新implementation Runだけ。
- Risk mappingは16件をgroup化せず、Representative Requirement / ACを必須joinにする。
- 新しいStable Risk ID、第三のTraceability SSOT、permanent inventoryは作らない。
- WE-COREはMapping IDとして維持し、code referenceは原則`repository-relative file path + exact test title`。
- `CT-*` / `CP-*`等の意味はCurrent evidenceから確認し、新ID制度を設計しない。
- Current Formal Suite確認はentrypoint-firstとし、direct referenceに必要なtest fileだけ追加で読む。
- Platform parityは同一suite実装ではなく、Web / Android / iOSのCurrent guarantee境界を明示する意味とする。
- `e2e_design.md`やcontract / validator変更が必要なら実装中にscope追加せずStopする。

## Questions / Ambiguity

- 現時点でblocking questionなし。
- `CT-*` / `CP-*`等のlabel taxonomyをCurrent evidenceから説明できない場合はimplementation時のStop conditionとする。
- 重要Mappingのrepresentative code referenceが一意でない場合も推測せずStopする。

## Approach

1. child PlanをレビューFinding 7点に沿って修正する。
2. 同じPlan RunのTASKS / REPORTへ修正Evidenceを追記する。
3. Product / Test Strategy本文等へ実装差分がないことを確認する。
4. local plan-only validation / Sanitizerは未実施のまま事実どおり保持し、次のlocal作業で実施する。
5. 再レビューへ引き渡す。

## Definition of Done

- child Planの目的がMaster Plan PR 2から外れていない。
- Writable scopeが2文書へ固定されている。
- Risk → Requirement / AC → technique / perspective → level → suite → gateのjoinが明記されている。
- WE-CORE / lower-test labelのcode referenceルールが固定されている。
- Risk group化や新Risk IDの余地がなくなっている。
- inventory監査がentrypoint-firstへ縮小されている。
- Platform parityの意味がCurrent asymmetric guaranteeとして一意である。
- implementationでscope外変更が必要になった場合のStop conditionが明確である。
- 今回はPlan / Run Artifact以外を変更していない。

## Risks / Unknowns

- GitHub connector上ではlocal `pnpm` validation、`git diff --check`、Sanitizer Write / Checkを実行できないため、PASSとは記録しない。
- Plan修正後もlocal plan-only validationが完了するまではimplementationを開始しない。

## Thinking Log

- 2026-08-28 21:41 JST: 初版child Planを保存した。
- 2026-08-28 21:53 JST: reviewで、RiskとRequirement / ACのjoin不足、Test ID taxonomyの未整理、conditional writable scopeの広さ、inventoryの過剰範囲、direct reference形式の判断残し、Risk group化余地、Platform parityの曖昧さを確認した。
- 2026-08-28 21:53 JST: 上記をPlan修正対象とし、実装対象は2文書へ限定する方針を固定した。
