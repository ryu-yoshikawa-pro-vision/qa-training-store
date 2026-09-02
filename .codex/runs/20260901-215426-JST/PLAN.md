# Plan

## Objective

PR #88のレビュー指摘4件を、既存Remediation PlanのRequirement解釈・scopeを広げずに修正し、現行headで検証可能かつマージ可能な状態へ更新する。

## Scope

### In

- `tests/contracts/architecture.test.ts` のNFR-MA-021 bounded positive evidence追加とNFR-MA-022 RAC named-import判定修正。
- `tests/contracts/native-ci-workflow.test.ts` のNative CI workflow全体exact-count制約削除。
- PR #88本文のCurrent Decision / implementation / completion / validation / exact head同期。
- current Run Artifact（このRunのみ）の更新、検証、Sanitizer。

### Out

- Product code、Requirement、Decision Log、Traceabilityの変更。
- PR #78のbranch / body / head / Run Artifact変更。
- Native dependency scanの複製、AST parser、generic validator、CSS/RHF migration、Playwright変更。
- 新しいPlanの作成、PR作成、workflow追加。

## Assumptions

- ユーザー指定のRemediation Planが設計・Requirement・scope・Stop conditionの正本であり、今回のレビュー指摘はその範囲内のFormal evidence修正である。
- `origin/main` が現branchの祖先であるため、Plan前提を壊すmain取り込みは発生しない。
- PR #88 body更新はユーザーが明示した外部変更として実施する。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。4件の修正方法と対象範囲がユーザー指示で具体化されている。
- 仮定してよい細部: Current sourceのimport形式に合わせた小さなregex/helperの実装位置。
- 未回答の重要質問: なし。

## Hypotheses

- H1: NFR-MA-021の不足はnegative scanの追加ではなく、root stylesheetとnative shared UIの狭いpositive contractで解消できる。
- H2: NFR-MA-022のfalse-passは、RAC importのnamed bindingsと使用widget identifierを対応比較すれば、parserを導入せず解消できる。
- H3: Native CI contractは`Native Static` job block内のgate実行だけを固定すればRequirementを満たす。

## Research Plan

- Round 1 Query: current diff、architecture contract、native CI contract、PR #88 body、最新PR headを確認し、baseline focused validationを実行する。
- Round 2 Query: 最小patch後にfocused/full validation、Run Artifact sanitizer、PR exact-head CIを確認する。
- Exit Criteria:
  - 4 findingすべてに修正と直接のFormal evidenceがある。
  - allowed files外の変更がない。
  - required validationとcurrent exact-head CIがPASSする。
  - PR #78とTraceabilityに変更がない。

## Approach

- repair-loopの1 iterationとして、baseline → 最小修正 → focused validation → full gate → self-review → PR body同期 → commit/push → exact-head CI確認の順で進める。
- 外部CodeRabbitのfull review / rerunは起動しない。ユーザーが明示した4 findingだけを入力findingとする。
- 失敗時は最初の異常、今回diffとの因果関係、baselineとの差を分類し、同一失敗の盲目的再実行をしない。

## Allowed files / expected scope

- `tests/contracts/architecture.test.ts`
- `tests/contracts/native-ci-workflow.test.ts`
- `.codex/runs/20260901-215426-JST/PLAN.md`
- `.codex/runs/20260901-215426-JST/TASKS.md`
- `.codex/runs/20260901-215426-JST/REPORT.md`
- `.codex/runs/20260901-215426-JST/evaluation.json`
- PR #88本文（GitHub外部リソース）

## Definition of Done

- 4つのレビュー指摘を個別に修正し、NFR-MA-021 / NFR-MA-022のscopeを広げていない。
- architecture contractはstylesheet composition root、native shared UIのRN/StyleSheet/tokens接続、RAC named import対応を直接固定する。
- Native CI contractは`Native Static` job blockのgate実行を固定し、workflow全体のexact-countを要求しない。
- `pnpm run verify`、`pnpm run check:native-route-dependencies`、`pnpm run test:e2e:chromium`と指定focused testsがPASSする。
- 最新headに対するWeb CI / Mobile App CIで、reset harnessとnative dependency gateの実行結果を確認する。
- PR #88 bodyがCurrent head・Decision・実装・completion・validationへ同期される。
- commit / push後にbranch、status、PR #88 exact head、PR #78未変更を確認する。
- sanitizer Write / CheckがPASSし、Stop conditionが0件である。

## Risks / Unknowns

- Regexによるnamed import抽出がCurrent sourceの複数行importを誤判定する可能性がある。対象は限定されたRAC import宣言とwidget identifierだけにする。
- CIはpush後に新runを生成するため、古いheadの結果を再利用せず、PR head SHAとの一致を確認する。
- Native Staticログの取得形式はGitHub Actions runごとに異なる可能性がある。job logでgate commandの実行箇所を直接確認する。

## Thinking Log

- 2026-09-01 JST: review findingsを4件すべて`must_fix`へ分類。Product変更やPlan再設計は不要で、既存contract testとPR本文の同期に限定する。
