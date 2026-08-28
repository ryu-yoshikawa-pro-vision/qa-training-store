# Plan

## Objective

- Master PlanのPR 2「Formal Test Strategy / Perspective / Traceability」child Planを、2回目レビュー結果に基づき最終調整する。
- RA-G1 / RA-G3の完了境界を曖昧にせず、実装者が未判定項目を残したまま完了できないPlanへ修正する。
- 今回は実装を開始しない。

## Scope

### In

- Functional / Non-functional Requirement Group全既存行のrepresentative regression contract追加。
- Risk mappingのTechnique / Perspective分離。
- 下位Traceability代表label 22行全件のDisposition contract追加。
- §7後ろの孤立4行を実装対象として明示。
- Current SSOT driftのStop conditionをPR 2関連semantic contract変更時へ限定。
- child Planと同じPlan RunのTASKS / REPORTへの修正Evidence反映。

### Out

- `docs/08_testing/test_strategy.md` / `docs/12_quality/requirements_traceability.md`の実装修正。
- `e2e_design.md`、test、contract、validator、workflow、package、Playwright config、Product、Curriculumの変更。
- local plan-only validation / Sanitizer実行。
- PR 2 implementation / PR作成 / merge。

## Fixed decisions

- PR 2の実装Writable scopeは`docs/08_testing/test_strategy.md`と`docs/12_quality/requirements_traceability.md`、新implementation Runだけ。
- Requirement Traceabilityは、Requirement Group、WE-CORE 12、下位代表labelの3層すべてを完了対象とする。
- Functional / Non-functional Requirement Groupの全既存行にboundedなrepresentative regression referenceを持たせる。
- Risk mappingは16件をgroup化せず、Requirement / AC、Technique、Perspective、Level、Formal suite、Gateを別フィールドで持つ。
- 下位代表labelは現在22行を全件Dispositionし、`exact-title` / `suite-level` / `stop`のいずれかへ分類する。未判定の放置を許可しない。
- §7後ろの孤立4行は意味を変えず下位代表表へ統合する。
- 新しいStable Risk ID、第三のTraceability SSOT、permanent inventoryは作らない。
- Current Formal Suite確認はentrypoint-firstとし、direct referenceに必要なtest fileだけ追加で読む。
- implementation前のCurrent `main`差分は、PR 2判断へ影響するsemantic contract変更時だけStopする。

## Questions / Ambiguity

- 現時点でblocking questionなし。
- Requirement Groupの重要行、下位代表label、Risk TechniqueをCurrent evidenceから合理的に説明できない場合はimplementation時のStop conditionとする。
- 新ID制度、Test codeへのID埋込み、追加Traceability SSOTを回避して解消できない場合もStopする。

## Approach

1. child Planを2回目レビューFinding 4点に沿って修正する。
2. 同じPlan RunのTASKS / REPORTへ修正Evidenceを追記する。
3. Product / Test Strategy本文等へ実装差分がないことを確認する。
4. local plan-only validation / Sanitizerは未実施のまま事実どおり保持する。
5. Plan review反映後のlocal validation / Sanitizerをimplementation開始前gateとして残す。

## Definition of Done

- Requirement Group / WE-CORE / 下位22行の3層すべてに完了境界がある。
- Risk mappingでTechniqueとPerspectiveが分離されている。
- 下位22行に未判定を残さないDisposition ruleがある。
- §7後ろの孤立4行が実装対象から漏れない。
- unrelatedなmain変更だけで不要にStopしない。
- Writable scopeは2文書 + implementation Runのまま維持される。
- 今回はPlan / Run Artifact以外を変更していない。
- local plan-only validation / Sanitizerは未実施であることを明記している。

## Risks / Unknowns

- GitHub connector上ではlocal `pnpm` validation、`git diff --check`、Sanitizer Write / Checkを実行できないため、PASSとは記録しない。
- Plan修正後もlocal plan-only validation / Sanitizerが完了するまではimplementationを開始しない。

## Thinking Log

- 2026-08-28 21:41 JST: 初版child Planを保存した。
- 2026-08-28 21:53 JST: 1回目レビューの7 Findingを反映し、Writable scope・Risk join・taxonomy監査・entrypoint-first inventory・direct reference・Risk row・platform parityを固定した。
- 2026-08-29 06:05 JST: 2回目レビューで、Requirement Groupからregressionへのdirect reference不足、Technique / Perspective混在、下位22行の部分対応余地、Current SSOT drift時のStop条件過剰を確認した。
- 2026-08-29 06:05 JST: 上記4点をchild Plan修正対象とし、RA-G1 / RA-G3を未判定のまま完了できない契約へ固定した。
