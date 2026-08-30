# Plan

## Goal

- PR #78のCurrent `CT-BOUNDARY-001`だけを、Requirement本文、Current production implementation、Current Formal Test assertionの順で再監査する。
- 既存Formal evidenceで説明できる範囲だけをTraceabilityへ残し、1件でも不足があればRequirementの意味を縮小せず`stop`へ戻す。
- 新しいTest、Requirement、taxonomy、branch、PRを作らず、Current evidenceに基づく最小差分で修正する。

## Current understanding

- 対象PRは#78、branchは`docs/formal-test-strategy-traceability`、確認済みheadは`ae7848861e806d1420958d57f2e4c2d27fb96775`。
- Current Traceabilityの`CT-BOUNDARY-001`は`FR-AR-001`〜`FR-AR-004`と`NFR-MA-020`〜`NFR-MA-023`を、architecture / image-manifest / transactions / seedsの4 referenceへ接続している。
- 今回はこの4 referenceのsuite名ではなく、各test assertionがRequirementの重要な違反を検出できるかを確認する。
- 前回の22 label集計、`CT-DB-KEY-001`、`CT-CATEGORY-002`、`CP-FORM-001`は今回の監査対象外である。

## Assumptions

- PR #78の現在branchをそのまま使い、別branch・別PRは作らない。
- Requirement本文の正本とCurrent production sourceを先に読み、Formal testが存在してもimplementation gapならcoveredにしない。
- 新しいFormal testが必要なRequirementは、今回test codeを変更せず`stop`とremediation候補として記録する。
- 既存Runの履歴は変更せず、今回の監査結果は新しいactive Runへ記録する。

## Non-goals

- `CT-DB-KEY-001`、`CT-CATEGORY-002`、`CP-FORM-001`その他labelの再設計。
- Production source、Unit / Integration / Contract / Component test、schema、migration、workflow、validator、Requirement本文の変更。
- 新しいtest、helper、ID制度、Traceability taxonomy、SSOT、branch、PRの作成。
- PR #78のmerge、auto-merge、PR #87の変更、外部レビューサービスのfull review / re-review起動。

## Impacted areas

- 通常変更候補は`docs/12_quality/requirements_traceability.md`の`CT-BOUNDARY-001`行だけ。
- Run Artifactは本Runの`PLAN.md`、`TASKS.md`、`REPORT.md`、`run.json`を更新する。
- 必要な場合だけPR本文をCurrent audit結果へ更新する。

## Files to inspect

- `docs/12_quality/requirements_traceability.md`
- PR #78のPlan / Run Artifactとrepository rules
- FR-AR / NFR-MAのRequirement正本文を含むCurrent specification
- Current implementationのRequest / Command、image manifest、Order DTO、Reset、RHF / Zod、StyleSheet / web CSS、React Aria、TypeScript / Enum / Dexie Schemaのseam
- `tests/contracts/architecture.test.ts`
- `tests/contracts/image-manifest.test.ts`
- `tests/contracts/transactions.test.ts`
- `tests/integration/seeds.test.ts`
- Requirementへ直接対応する既存Formal test候補（keyword searchで発見したもの）

## Questions / Ambiguity

- 8 Requirementのうち、Current Formal assertionで全範囲を説明できないIDは監査結果が出るまで未確定とする。
- Current implementationとRequirementが矛盾する場合は`stop`（implementation gap）として記録し、今回のProduction修正は行わない。

## Hypotheses

- H1: `architecture.test.ts`はlayer / dependency境界を検証するが、FR-AR-001のRequest→Command context補完とNFR-MA-020〜023の各実装規約を全てassertしていない可能性がある。
- H2: `image-manifest.test.ts`はBuild生成Manifestの内容を検証しても、FR-AR-002のRuntime Fetch非実行を単独では保証しない可能性がある。
- H3: `seeds.test.ts`はReset後状態を検証しても、FR-AR-004の1 Browser Context / 1 Page制約や複数Tab非保証をFormalに固定していない可能性がある。
- H4: `transactions.test.ts`はFR-AR-003のpublic DTO秘匿と公開versionを直接assertしている可能性がある。

## Research Plan

- Round 1 Query: 正本から8 Requirementの文言を抽出し、Current production implementationの該当seamをRequirementごとに確認する。
- Round 2 Query: 参照中の4 Formal testとkeyword検索で見つかる既存testを、suite名ではなくassertion単位で読み、違反検出力を確認する。
- Exit Criteria:
  - 8 RequirementそれぞれにRequirement要約、implementation evidence、Formal assertion、classification、理由がある。
  - coverage gap / implementation gapをbounded referenceで隠していない。
  - `CT-BOUNDARY-001`の最終classificationと22 label集計をCurrent tableから再計算できる。
  - 修正が必要な場合のscope、validation、PR更新可否が確定している。

## Change strategy

1. branch / PR / Current headと既存Run・Traceabilityをread-only確認する。
2. Requirement → production implementation → Formal test assertionの順に8件を監査する。
3. evidenceが十分なRequirementだけを責務付きreferenceへ接続し、不足があれば`CT-BOUNDARY-001`を`stop`へ戻す。
4. Traceability、REPORT、TASKS、manifestを最小差分でCurrent stateへ同期する。
5. format、markdown lint、spec validation、diff check、Sanitizer、scope、push後exact-head CIを検証する。

## Definition of Done

- 8 Requirementの各判定がCurrent implementationとFormal assertionに基づき、covered / coverage gap / implementation gapのいずれかで説明されている。
- `CT-BOUNDARY-001`のDispositionが実監査結果に一致し、必要な不足Requirement IDと最小remediation seamが記録されている。
- 他label、Requirement本文、Product / Test / workflowを変更していない。
- required local validation、Sanitizer residual 0、scope check、必要なPR / exact-head確認が完了している。

## Risks / Unknowns

- suite名やproduction sourceの存在だけでcoverageと誤認するリスクがある。各assertionが失敗を検出する具体的条件まで確認する。
- Formal gapを隠すためにRequirementを狭く解釈するリスクがある。不足Requirement IDと最小remediation seamをREPORTへ記録する。
- Run Artifact変更後の未sanitized absolute pathや、対象外pathの混入をscope / Sanitizerで検出する。

## Follow-up

- coverage gapが残る場合は、Requirement ID、missing assertion、最小test seam、Production変更要否、別remediationが必要であることをPR / Runへ明記する。
- 全Requirementがcoveredの場合も、各referenceの責務をassertionに即して短く更新し、件数は結果として再集計する。

## Thinking Log

- 2026-08-31 06:54 JST: PR #78の`CT-BOUNDARY-001`だけを対象にした新規repair Runを初期化した。
