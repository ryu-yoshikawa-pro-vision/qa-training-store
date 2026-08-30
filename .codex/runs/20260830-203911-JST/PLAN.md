# Implementation Plan

## Objective

PR #87の保存済みPlanに従い、PR #78を止めているFormal coverage不足だけをCurrent contractへ最小差分で補完する。

## Scope

- In:
  - コード変更前の4 label read-only pre-audit。
  - `FR-PR-041` / `FR-PR-055` / `FR-AR-003`のplanned remediationを、必要な場合だけ既存test fileへ実装。
  - Current implementation evidence、Formal evidence、disposition、PR #78 handoffをRun REPORTへ記録。
  - Plan指定のchanged suite、共通validation、scope、Codex artifact Sanitizer。
- Out:
  - Product / Application / Infrastructure / Presentation source。
  - PR #78、Traceability docs、既存Plan、DB schema / migration、integration test。
  - 新test file / helper / framework、retry / sleep / spy / source assertion / production hook。
  - merge、PR #78の直接更新、不要なfull regression。

## Assumptions

- Current working tree・branchの内容をPlan作成時の調査より優先する。
- `PR #78`のreference / taxonomy不足はFormal coverage gapと分離し、Currentの最小suite setで説明可能ならhandoffへ回す。
- Run Artifactは `20260830-203911-JST` を継続利用し、`run.json`はmachine-managed経路だけで更新する。

## Hypotheses

- H1: `CT-DB-KEY-001`の未充足がある場合、既存Repository Contract testのCategory / Brand / Variation assertionだけで閉じられる。
- H2: `CT-CATEGORY-002`の未充足がある場合、既存Repository seamのexact-title 1 testで閉じられる。
- H3: `CT-BOUNDARY-001`の`FR-AR-003`未充足がある場合、既存Order contract testにProduction-consistent History 1件とpublic DTO assertionだけを追加すれば閉じられる。
- H4: 上記以外のFormal gapまたはRequirementとCurrent implementationの矛盾があれば、実装を先行せずSTOPする。

## Research Plan

- Round 1: Current requirements、implementation、既存Formal test、PR #78のmappingを4 label / Requirement単位で照合する。
- Round 2: Planned remediationの必要性、既存test構造での最小seam、変更対象とvalidationを確定する。
- Exit Criteria:
  - 4 labelについてTraceability mapping gap、planned remediation、予定外Formal gap / implementation gapを区別できる。
  - STOP条件の有無と各RequirementのdispositionがRun REPORTにある。
  - 実装後の変更pathがPlanの許可範囲に収まり、validationが完了する。

## Approach

1. `AGENTS.md`、`PLANS.md`、対象Plan、Current rules / test conventions、Run Artifact contractを読む。
2. branch / PR / working treeを確認し、Current sourceと4 labelをread-only監査する。
3. STOP条件がなければ、Plan記載のfixture・seam・assertionをそのまま最小実装する。
4. 変更scopeに応じたsuiteと共通validationを実行し、失敗時だけrepair-loopのbounded手順へ切り替える。
5. Run REPORTをappend-onlyで確定し、PR #78 handoffを記録する。

## Definition of Done

- 4 labelのpre-auditをコード変更前に完了し、STOP=0またはSTOP理由を記録する。
- planned remediation以外のFormal gap / implementation gapを残さない。
- test code変更がある場合、Plan指定のchanged suite、typecheck、lint、format、markdown、diff、scope、SanitizerがPASSする。
- Product sourceおよび禁止対象の変更がなく、変更pathがPlanのPlanned writable files内にある。
- 4 labelのCurrent evidence / dispositionとPR #78へのrepresentative handoffがRun REPORTに揃う。

## Risks / Unknowns

- normalized duplicateが既存testで既に直接coveredなら、重複実装せずno-opとする。
- concurrencyがCurrent fake-indexeddbで決定的でなければ、retry / sleep / spyを追加せずSTOPする。
- validation failureは原因・上流異常・scopeを確認し、安全な最小repair以外へ広げない。

## Thinking Log

- 2026-08-30 JST: PR #87のhead branchとPlanを確認し、Current branchを作業の正本とした。
- 2026-08-30 JST: 既存active Runはこのtaskに紐づいていないため、新規Run `20260830-203911-JST`を作成した。
