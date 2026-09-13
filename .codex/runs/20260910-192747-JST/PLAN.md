# Plan

## Objective

- `.artifacts/trigger-eval-qualification-20260910-r2/positive/`のraw evidenceを直接調査し、absolute readとunsupported compoundの順序・shape・Target内file identityを確定する。
- A/B/C判定を根拠付きで保存し、次の実装Run向けにTarget-aware bounded absolute canonical path recognitionのPlanを作成する。
- 今回はPlan-onlyとし、source、tests、ADR、Qualification、canonicalを変更・実行しない。

## Scope

- In: raw Hook/stdout/stderr/analysis/meta確認、既存selector・preflight・taxonomy確認、新Plan、Plan専用Run Artifact、指定validation、commit/push、PR本文の最小追記。
- Out: selector変更、test変更、ADR変更、query/dataset/Skill/Hook/timeout変更、Qualification再実行、canonical `all`、baseline取得。

## Assumptions

- 対象raw artifactは保存済みのpositive query 1回分であり、今回の調査で再実行しない。
- raw artifact内のmachine固有Target pathは、commit対象のPlan/Run Artifactでは`<TARGET_ROOT>`へsanitizationする。
- `docs/reference/failure-taxonomy.md`とevaluation schemaの既存enumをtaxonomy確認の参照として使用する。欠落している`spec/failure-taxonomy.json`は今回新設・修正しない。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。raw evidence、Target root、A/B/C判定、変更境界が確定した。
- 仮定してよい細部: future implementationのcontext引数は既存helperを最小変更でthreadする。contextなしabsoluteはfail-closeする。
- 未回答の重要質問: なし。future Hostの別shapeは別Planで扱う。

## Hypotheses

- H1: absolute single direct readは、Target root基準のrealpath/file identity確認によりcanonical candidateへ安全にmappingできる。
- H2: absolute readはunsupported compoundより先なので、compound対応を追加せず、candidate後unreliable非上書き契約でpositive blockerを解消できる可能性がある。

## Research Plan

- Round 1: positive raw Hook JSONLをparseし、相関済みPostToolUseを全件時系列化する。
- Round 2: absolute commandとcompound commandを直接確認し、Target root realpath、canonical file identity、current classifier、failure taxonomyを照合する。
- Exit Criteria:
  - H1/H2の支持または反証がraw evidenceで明示される。
  - A/B/C判定、変更対象、拒否境界、future Qualification条件がPlanに記載される。
  - source/tests/ADRに差分がなく、Plan-only validationが完了する。

## Approach

- 保存済みraw evidenceを直接読み、existing exported helperでcurrent classificationを再現する。
- Target rootのrealpath、regular file、reparse point、hash、detached/clean状態をread-only確認する。
- A判定ならcompound対応を計画へ追加せず、Target-aware absolute recognitionのbounded設計だけを記載する。
- PlanとRun Artifactをsanitizeし、evaluation schema、Markdown、Prettier、diff、strict collectorを検証してからcommit/pushする。

## Definition of Done

- `docs/plans/2026-09-10_192747_trigger-eval-positive-blocker-remediation.md`が保存され、raw evidence、30 PostToolUse順序、absolute/compound完全shape、A判定、realpath一致、原因、taxonomy判断、future implementation/Qualification/canonical条件を含む。
- `.codex/runs/20260910-192747-JST/`にPLAN/TASKS/REPORT/run.json/evaluationが保存される。
- Plan-only validationが全PASSし、sanitizer residualが0になる。
- source/tests/ADRに差分がなく、新Planと新Run Artifactだけをcommitしてbranchへnon-force pushする。
- PR #127の既存判定（Negative PASS、Positive FAIL、Environment Qualification FAIL、canonical未実行、8/8未判定、valid baseline未取得）を維持する。

## Risks / Unknowns

- raw evidenceはcurrent selectorの契約外shapeを含むため、Plan-only調査中にそれを新しいtrusted evidenceへ昇格させない。
- `spec/failure-taxonomy.json`の不在と、schema/referenceにcategory enumがある状態の差分は、今回のPlanのtaxonomy判断へ明記するが修正しない。
- future implementationがTarget contextなしabsoluteを許可するとmachine固有hard-code相当になるため、unit/public helperではfail-closeする。

## Thinking Log

- raw evidenceではabsolute readがPostToolUse ordinal 5、最初のunsupported compoundがordinal 7であり、semicolon compoundはordinal 21だった。判定はA。
- Target rootをrealpath化したcanonical `feature-plan/SKILL.md`とabsolute read pathはrealpath・SHA-256とも一致し、regular fileでsymlinkではなかった。
- processはexit 0 / `turn.completed`、Hook correlation/parseもPASSなので、positive blockerは`flaky_or_env_issue`を継承せず、将来のblocker分類は`artifact_contract_gap`が妥当と判断した。
