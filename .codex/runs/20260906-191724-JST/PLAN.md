# Run Plan

## 目的

正本Plan `docs/plans/2026-09-06_125922_issue-117-pr2-trigger-eval-baseline.md` に従い、Issue #117 PR2のTrigger Eval baselineを現行branchへ実装し、Observation Probe、deterministic/repository validation、answer-key-free canonical baseline、Run Artifact保存、commit、pushまで完了する。

## スコープ

- In: 12 dataset YAML、deterministic eval logic、side-effect runner、repository-contract test、package scripts、PR2 Run Artifact、canonical baseline。
- Out: Skill description、AGENTS.mdのrouting意味契約、Product code/test、training content、PR2外の評価・runtime・trust管理・retry/parallel framework。

## 前提と確認済み事項

- 現在branchは `refactor/117-pr2-trigger-eval-baseline`、作業ツリーは開始時clean。
- `origin/main`との差分はbehind 0で、実装開始時のrouting/observation関連incoming changeはない。
- PR #127はOPEN、base=`main`、headは対象branch。
- Evaluator rootとRouting Target rootを分離し、Targetはremote `main`から独立cloneする。
- project trust / hook trustは通常手順の環境前提であり、runnerで変更しない。

## 仮説

- H1: current Codex Hostのhook JSONLと`SKILL.md` actual readを、Planのpositive/negative Probeで一意に観測できる。
- H2: Probeで確認したtool/input shapeだけを用いれば、`[]`（観測成立後の0 Skill）と`null`（unobservable）を区別できる。
- H3: 12 datasetと固定4 boundaryの契約を、24件固定ではないdeterministic validator/testで検証できる。

## 実行方針

1. 正本Plan、SSOT、main divergence、branch/PR状態を確認する。
2. 独立Routing Targetをremote cloneとして準備し、通常のtrustを成立させる。
3. runner実装前にmanual Observation Probeを実行し、実際のhook/tool shapeをRun Artifactへ記録する。
4. datasetを作成・全case manual reviewし、deterministic logic、runner、tests、package scriptsを実装する。
5. deterministic/repository validationを通過させ、source implementationだけをcommitして`evaluator_git_sha`を確定する。
6. baseline直前にlatest `main`を再確認し、同じTargetを確定SHAへcheckoutする。必要時のみProbe/validationを再実行する。
7. canonical `all`を1回だけ実行し、8 boundary-side observability、provenance、comparison契約を確認する。
8. Run Artifactをsanitizationし、最終scope/validation後にbaselineとArtifactを別commitしてpushし、PR #127を確認する。

## Definition of Done

- 12 YAML、実装、tests、package scriptsがPlan契約を満たす。
- Observation Probeが成立し、Host-native evidenceでpositive/negativeを区別できる。
- 指定4 validation gatesがPASSする。
- source implementation commitにactive baseline Artifactを含めず、`evaluator_git_sha`を確定できる。
- answer-key-free独立Targetで有効なcanonical `all`を1回だけ取得し、8 sideすべてobservable。
- `[]`/`null`、ordered observation、set-based scoring、comparisonを検証できる。
- Run Artifactをsanitizationし、禁止範囲の変更がないことを確認する。
- 対象branchへnon-force pushし、PR #127のheadが最新commitになる。

## 未解決論点と停止条件

- Probeが通常trust成立後もactual Skill readを安定観測できない場合は、方式を捏造せずblockerとしてRunへ記録する。
- canonical `all`で8 sideのいずれかが全件unobservableの場合はbaseline DoD未達として停止する。
- Evaluator/environment defect以外の理由でcanonical runを引き直さない。

## 判断ログ

- 2026-09-06 19:17 JST: 既存の正本Planを全文確認し、同Planを実装判断のSSOTとした。新規Planの作成や正本Planの変更は行わない。
- 2026-09-06 19:17 JST: `origin/main`は実装branchに対してbehind 0。protected routing/observation filesへのincoming diffは0件。
