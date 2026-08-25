# Plan

## Objective

- PR #44のレビューで確認されたG7／G9とRun Artifactの整合性だけを修正し、修正後HEADのRequired CIまで確認する。

## Scope

- In: Flow J Test Oracle、checkout SHA contract SSOT、G9 upstream選定記録、Training curriculum snippet、既存Runのevaluation／REPORT correction、今回Run Artifact、必要なvalidation、normal commit／push。
- Out: G8変更、Product code／dependency／Action major upgrade／Agentic QA framework、G1〜G6、PR merge、force push、rebase、amend、destructive reset／clean、review thread操作。

## Assumptions

- PR #44の修正前HEADは`75d06f5`で、既存CIのpass結果は修正後Evidenceに再利用しない。
- Admin Order detailのPageHeader descriptionが注文state表示のUI領域である。
- `pnpm/action-setup`はcurrent `v4`のrevert SHAを維持し、Node 24対応releaseは別upgrade扱いにする。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。
- 仮定してよい細部: 既存PageHeader／cross-role locator patternと既存contract testを再利用する。
- 未回答の重要質問: なし。

## Hypotheses

- H1: Flow Jへ操作前stateとCustomer shipment stateを追加すれば、unexpected stateのfalse-greenを閉じられる。
- H2: checkout refをexport定数へ集約すれば、allowlistと`persist-credentials` contractの更新漏れを構造的に防げる。
- H3: current v4 aliasのofficial SHAとadvisoryを再確認した結果、version upgradeなしで既存pinを正当化できる。
- H4: 既存Runへ末尾Correctionを追記し、evaluationのGit操作記録を修正すれば、append-onlyと実行事実を両立できる。

## Research Plan

- Round 1 Query: repo mapping、PR #44 review、既存Run、G7／G9対象、canonical follow-up先を確認する。
- Round 2 Query: official upstreamのcurrent alias／release／revert history／runtime compatibility／advisoryを確認し、変更前後のFocused／contract／Repository gateを実行する。
- Exit Criteria:
  - H1〜H4の根拠がRun Artifactに記録される。
  - allowed files外のsource変更がない。
  - 修正後HEADのCI状態を確認し、passまたは未完了外部状態を明記する。

## Approach

1. 既存規約、Plan、PR、target source、Run Artifactを確認する。
2. 公式upstream evidenceを確定し、G9判断とsetup-java follow-upを記録する。
3. G7、G9、教材、既存Run Artifactを最小差分で修正する。G8は触らない。
4. 必須validationとsanitizerを実行し、差分をscope監査する。
5. normal commit／push後、修正後HEADのPR checksを確認する。

## Definition of Done

- Flow Jがpaid initial state、exact button、Admin post-state、Customer preparing stateを明示assertする。
- checkout固有contractがallowlistと同一定数を参照し、mutable／invalid contract testsがPASSする。
- curriculumがfull SHA pinを掲載し、SHA policyを説明する。
- `pnpm/action-setup`等のcurrent upstream／advisory evidence、setup-java v4別migrationがRun Artifactにある。
- 既存evaluation／REPORTがcommit／push／PR作成事実と整合し、REPORTはappend-only Correctionで時系列を説明する。
- G8、Product code、依存、major version、frameworkに不要な差分がない。
- 指定validation、sanitizer、JSON parse、修正後HEADのRequired CI確認が完了する。

## Risks / Unknowns

- PageHeader state locatorが曖昧なら注文heading親へscopeする。
- Node24対応版は公式に存在するが、current v4 aliasと異なるため、証拠なくupgradeしない。
- REPORT既存entryは移動せず、末尾Correctionをcanonical chronologyとする。
- CI failure時は同条件の無目的な再試行をせず、原因と次アクションを記録する。

## Thinking Log

- 2026-08-22 21:49 JST: PR #44 review指摘をmust_fix（G7、G9 contract、教材、Run Artifact）とdefer（setup-java v5 migration）へ分類し、G8をallowed scopeから除外した。
- 2026-08-22 21:49 JST: official APIで対象5 Actionのcurrent v4 refとadvisory 0件を確認した。pnpm/action-setupはcurrent v4=`b906aff...`、v4.4.0 Node24=`fc06bc1...`、latest release v6.0.10で、今回のversion upgradeは行わない。
