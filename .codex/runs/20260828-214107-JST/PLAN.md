# Plan

## Objective

- Master PlanのPR 2「Formal Test Strategy / Perspective / Traceability」child Planを、最終レビュー結果に基づき実装開始前の状態へ整える。
- RA-G1 / RA-G3の完了境界を曖昧にせず、実装者が未判定項目を残したまま完了できないPlanを維持する。
- Technique非適用時の推測、Playwright config単位のFormal分類、Current行数の固定契約、PR-wide diffとimplementation deltaの混同を排除する。
- Requirement GroupはCurrent verificationへ追跡し、automationが存在しない箇所へ架空のcode referenceを要求しない。
- Risk表のFormal suite / CI GateはCurrentの最も近い実行単位へ固定する。
- 今回は実装を開始しない。

## Scope

### In

- Functional / Non-functional Requirement Group全既存行のrepresentative Current verification contract。
- Risk mappingのTechnique / Perspective分離と、Technique非適用時の扱い。
- Risk mappingのRepresentative Formal Test / suiteとCI Gateの記載粒度固定。
- 実装開始時点のCurrent下位Traceability代表label全件のDisposition contract。
- Plan作成時点では下位代表labelが22行（§6の18行 + §7後ろの孤立4行）であることをCurrent evidenceとして保持する。
- `playwright.config.ts`内のFormal E2E / Smokeと`ui-review-*`をproject責務で区別するFormal / Training boundary。
- Current SSOT driftのStop conditionをPR 2関連semantic contract変更時へ限定する。
- `IMPLEMENTATION_BASE_SHA`を使い、PR-wide diffとimplementation deltaを分離するscope contract。
- child Planと同じPlan RunのTASKS / REPORTへの最終レビューEvidence反映。

### Out

- `docs/08_testing/test_strategy.md` / `docs/12_quality/requirements_traceability.md`の実装修正。
- `e2e_design.md`、test、contract、validator、workflow、package、Playwright config、Product、Curriculumの変更。
- local plan-only validation / Sanitizer実行。
- PR 2 implementation / PR作成 / merge。

## Fixed decisions

- PR 2の実装Writable scopeは`docs/08_testing/test_strategy.md`と`docs/12_quality/requirements_traceability.md`、新implementation Runだけ。
- Plan-only validation / Sanitizer完了後、実装開始直前のbranch HEADを`IMPLEMENTATION_BASE_SHA`として取得し、新implementation Run Evidenceへ記録する。
- implementation scopeは`IMPLEMENTATION_BASE_SHA...HEAD`で判定し、PR-wide diffに既存child Plan / Plan Runが含まれることをscope violationにしない。
- Requirement Traceabilityは、Requirement Group、WE-CORE 12、実装開始時点のCurrent下位代表label全件の3層すべてを完了対象とする。
- Functional / Non-functional Requirement Groupの全既存行にboundedな`Representative Verification`を持たせる。
- FunctionalはCurrent executable regressionがある場合にfile / suiteへ接続し、Non-functionalはCurrent contractに応じてautomated suite / Benchmark / UI Review / Static Check / Smoke等の実在するverificationへ接続する。codeがないverificationへ架空のcode referenceを作らない。
- Risk mappingは16件をgroup化せず、Requirement / AC、Technique、Perspective、Level、Formal suite、Gateを別フィールドで持つ。
- Representative TechniqueはCurrent evidenceから具体的に説明できる場合だけ記載する。特定Techniqueが主ではないRiskでは`—`または`Not primary`を許容し、Technique非適用だけではStopしない。
- Representative Perspectiveは各Riskで意味のある分類を記載する。
- Representative Formal Test / suiteはstableなsuite / package command / Playwright project等の代表実行単位とし、exact titleを大量複製しない。
- CI GateはRepresentative suiteを実行・要求する最も近いworkflow job / matrix legを記載し、具体的なjob / legがあるRiskを`verify` / `validate`だけで一律に埋めない。
- 下位代表labelは実装開始時点のCurrent全件をDispositionし、`exact-title` / `suite-level` / `stop`のいずれかへ分類する。未判定の放置を許可しない。22行はPlan作成時点のCurrent evidenceであり固定件数の契約にしない。
- Plan作成時点で§7後ろに孤立している4行は、実装時に存在することを再確認したうえで意味を変えず下位代表表へ統合する。
- `playwright.config.ts`はProduct側automation configとして扱い、Formal E2E / Smokeと別責務の`ui-review-*`をconfig単位ではなくproject責務で区別する。`playwright.training.config.ts`はTraining-only Playwright configとする。
- 新しいStable Risk ID、第三のTraceability SSOT、permanent inventoryは作らない。
- Current Formal Suite確認はentrypoint-firstとし、verification / direct referenceに必要なtest fileだけ追加で読む。
- implementation前のCurrent `main`差分は、PR 2判断へ影響するsemantic contract変更時だけStopする。

## Questions / Ambiguity

- 現時点でblocking questionなし。
- Requirement GroupのいずれかをCurrent verificationへ合理的に接続できず、新Test / 新Gateを追加しないとTraceabilityが成立しない場合はimplementation時のStop conditionとする。
- Current下位代表labelをCurrent evidenceから合理的にcode / suiteへ接続できない場合はStopする。
- RiskをRepresentative Requirement / AC、Representative Formal Test / suite、CI Gateへ合理的に接続できない場合、またはRA-G3全体としてTechnique / Perspectiveとの関係をCurrent evidenceから説明できない場合はStopする。
- Techniqueを特定できないことだけではStopしない。
- 新ID制度、Test codeへのID埋込み、追加Traceability SSOTを回避して解消できない場合もStopする。

## Approach

1. child Planの最新レビューFinding 3点を反映する。
2. Scope checkをPR-wide diffではなく`IMPLEMENTATION_BASE_SHA...HEAD`へ変更する。
3. Requirement GroupをCurrent verificationへ追跡する契約へ修正し、Non-functional Groupへ架空のcode referenceを要求しない。
4. Risk表のFormal suite / CI GateをCurrentの最も近い実行単位へ固定する。
5. child PlanとPlan Run Artifactを同期する。
6. Product / Test Strategy本文等へ実装差分がないことを確認する。
7. local plan-only validation / Sanitizerは未実施のまま事実どおり保持する。
8. Plan review反映後のlocal validation / Sanitizerをimplementation開始前gateとして残す。

## Definition of Done

- `IMPLEMENTATION_BASE_SHA`によるimplementation delta scope contractが定義され、PR-wide Plan差分との混同がない。
- Requirement Group / WE-CORE / 実装開始時点のCurrent下位代表label全件の3層すべてに完了境界がある。
- Requirement GroupはCurrent verificationへ接続し、automationがないverificationへ架空のcode referenceを作らない。
- Risk mappingでTechniqueとPerspectiveが分離され、Technique非適用時に推測の値を発明しない。
- Risk表のRepresentative Formal Test / suiteとCI Gateの粒度が固定され、aggregate gateだけで情報を潰さない。
- Current下位代表label全件に未判定を残さないDisposition ruleがある。
- 22行という件数を永続的な契約にしていない。
- `playwright.config.ts`内の`ui-review-*`をFormal Regressionへ誤分類しない契約がある。
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
- 2026-08-29 06:05 JST: 2回目レビューで、Requirement Groupからregressionへのdirect reference不足、Technique / Perspective混在、下位22行の部分対応余地、Current SSOT drift時のStop条件過剰を確認し、child Planへ反映した。
- 2026-08-29 06:18 JST: 最終内容レビューで、Technique必須化の過剰、`playwright.config.ts = Formal`の単純化、下位22行の固定件数契約を確認し、child Planを修正した。
- 2026-08-29 06:23 JST: 最新child Planに合わせてPlan Run Artifactを同期した。local plan-only validation / Sanitizerは未実施のまま保持する。
- 2026-08-29 06:34 JST: 再レビューで、PR-wide diffとimplementation scopeの混同、全NFR Groupへのcode reference強制、Risk表のsuite / Gate粒度未固定を確認し、child PlanとPlan Runへ反映した。
