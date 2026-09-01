# Plan

## Objective

- PR #88 (`investigate/nfr-ma-020-021`)で、Remediation Planの対象7 Requirement（`FR-AR-001`、`FR-AR-002`、`FR-AR-004`、`NFR-MA-020`〜`NFR-MA-023`）のCurrent contract・Production implementation・Formal evidenceを接続し、指定validationを通過させてcommit/pushする。

## Scope

- In: `docs/plans/2026-08-31_ct-boundary-001-remediation.md`のTasks 0〜10、同PlanのCandidate files / DoD / validationに限定する。
- Out: PR #78、`docs/12_quality/requirements_traceability.md`、FR-AR-003、RHF/Zod全面migration、CSS Modules全面migration、global.css全面整理、Cart/Checkout read architecture全面再設計、multi-tab reset、新Playwright project/workflow、generic validator/AST基盤、unrelated cleanup。

## Assumptions

- `origin/main`がPlan記載の前提を維持し、branchは指定headを基準に進める。
- Decision Logの次の空き連番を、Task 0で確認したうえで使用する。
- 既存のsource-inspection / Playwright / native dependency gateを再利用し、Planで許容された最小assertionだけを追加する。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。Remediation PlanがRequirement解釈、scope、Stop condition、DoDを定義済み。
- 仮定してよい細部: 既存testの命名・配置・安定したsource markerはrepository conventionに合わせる。
- 未回答の重要質問: なし。Plan前提が崩れた場合はStop conditionに従って停止する。

## Hypotheses

- H1: `CreateOrderForPaymentCommand`の内部context補完・consumptionは、Checkout read boundaryを変更せず局所実装できる。
- H2: NFR-MA-020〜023のFormal evidenceは、既存suite/gateへのbounded assertionとDecision/Requirement/authority文書の整合で成立する。
- H3: PlanのStop conditionに該当する大規模migration、schema変更、multi-tab保証、汎用解析基盤は不要である。

## Research Plan

- Round 1 Query: branch/main同期、必読文書、Decision ID、対象実装・既存Formal gate・baselineを確認する。
- Round 2 Query: Plan順に最小実装し、focused validation、full gate、Requirement単位self-reviewでDoDを確認する。
- Exit Criteria:
  - 7 RequirementそれぞれでRequirement / Decision / Production implementation / Formal evidenceが接続する。
  - PlanのStop conditionが0件で、指定validationとscope確認が完了する。
  - commit/push後のPR #88 headを確認する。

## Approach

- Task 0で最新main・baselineを確定し、Decision/Requirementを先にCurrent contractへ更新する。
- その後FR-AR境界、NFRごとのFormal evidence、文書authorityをPlan順に実装する。
- 各checkpointで差分・scope・validation結果を確認し、失敗は最初の異常と今回差分の因果で分析する。
- 最後にRequirement単位self-review、sanitizer、git status/diff check、commit、明示refspec push、PR head確認を行う。

## Definition of Done

- Remediation PlanのDoDとCompletion条件をすべて満たす。
- `pnpm run verify`、`pnpm run check:native-route-dependencies`、focused Playwright、`pnpm run test:e2e:chromium`、変更影響に応じたNative/Mobile validationがPASSまたはPlanで許容された明示理由を持つ。
- PR #78およびtraceabilityを変更せず、変更scopeがPlan内である。
- commit/push済みで、PR #88のhead SHAを確認できる。

## Risks / Unknowns

- Command化でCurrent checkout transaction semanticsを変えるリスク: 既存transaction順序とread boundaryを維持し、focused integration/structural testで確認する。
- Decision IDの競合: 最新Decision Logを再確認し、空き連番を使用する。
- Full gateの既存failure: baseline・main比較・最初の異常を記録し、Plan外修正や無目的再試行をしない。
- Native/Mobile実機条件が不足する可能性: Plan/Runbookに沿って実行可否と根拠を記録し、Stop conditionと混同しない。

## Thinking Log

- 2026-09-01: 指定branchは`investigate/nfr-ma-020-021`、working treeはclean、PR #88 headは`d6dde3f`。`origin/main`はHEADの祖先で、behindではない。
- 2026-09-01: Remediation Plan 417行を全文確認。既存計画を再設計せず、記載されたscopeとStop conditionを実装基準とする。
