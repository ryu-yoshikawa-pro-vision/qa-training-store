# Issue #117 PR6 Workflow E2E Eval 実装計画

## 0. 依頼概要

- 対象Issue: `#117 refactor: Agent Skillsを自己完結・ポータブル・評価可能な基盤へ整理する`。
- 対象フェーズ: PR6 `Workflow E2E Eval`。
- 実装branch: `test/117-pr6-workflow-e2e-eval`。
- branch作成元: `main` `c0dbf818d9431dcbd1e03cb76361e51913313af0`。
- 依頼内容: PR6を実装する前に、現行`main`、PR1〜PR5の成果物、既存Eval Harnessを確認し、実装者が追加の設計判断なしで進められるPlanを保存する。
- このPlanでは実装、PR作成、Issue closeは行わない。

## 1. ゴール / 完了条件

### ゴール

複数Skillを跨ぐ代表Workflowについて、実際のCodex Runtimeで次を評価できる最小のWorkflow E2E Evalを追加する。

- 正しい入口Skill。
- 明示的なユーザーターンに対応するSkill handoff。
- 不要Skillの起動。
- review-only / QA-onlyの停止境界。
- `repair-loop`の成功停止と`stop_needs_human`停止。
- 前段で作成したArtifactの後段での再利用。
- Runtime capability不足時の`not_executed` / 観測不能時の`unobservable`。
- 既存PR4 deterministic contractとPR5 semantic boundaryとの不整合がないこと。

### 完了条件（DoD）

- [ ] 代表Workflow caseが固定され、各caseの目的・stage・期待Skill・停止条件・Artifact handoffが明示されている。
- [ ] 各stageを実際のCodex Runtimeで実行し、既存OTel observerを使って期待Skillとの差分を判定できる。
- [ ] stage間の順序はrunnerが定義した明示的なユーザーターン順で評価し、1回のOTel集約結果からSkill順序を推測しない。
- [ ] review-only / QA-onlyでProduct source変更または`repair-loop`への暗黙切替があればFAILにできる。
- [ ] explicit repair stageで`repair-loop`が選択され、許可されたfixtureだけが変更され、runner側のdeterministic validationが成功したことを確認できる。
- [ ] `needs_human` caseで変更を行わず`stop_needs_human`として停止したことを確認できる。
- [ ] plan stageの成果物をfreshな後続processへ渡し、後続promptに要件本文を再掲せず、最終fixture状態から前段Artifact再利用を確認できる。
- [ ] `harness-improvement`はEvidenceに基づく提案だけを行い、Product sourceを変更しないことを確認できる。
- [ ] `android-native-local-validation`は必要capabilityがない環境では`not_executed`とし、未実行をPASSへ変換しない。
- [ ] machine-readable resultにprovenance、case / stage結果、`pass` / `fail` / `unobservable` / `not_executed`を保存できる。
- [ ] 非Nativeの必須caseについてcanonical live runを少なくとも1回実行し、実行結果をactive implementation Runへ保存する。
- [ ] Native caseはcapabilityがある場合のみ実行し、capability不足をIssue完了のために迂回しない。
- [ ] Repository独自Agent Runtime、Session Manager、Workflow Engine、Skill Registry、Skill間RPC、汎用Rule Engineを追加していない。
- [ ] Skill本文、frontmatter `description`、Product behavior、Trigger Eval dataset、Semantic Eval rubricをPR6都合で変更していない。
- [ ] targeted repository-contract、`pnpm run test:repository`、`pnpm run verify`、`git diff --check main...HEAD`、Run Artifact sanitizationがPASSしている。

## 2. 現状理解と前提

### 確認済みの事実

- PR1 `#123`、PR2 `#127`、PR4 `#126`、PR5 `#137`、PR3 `#155`はmerge済みで、Issue #117の残作業はPR6である。
- PR3はno-opで完了し、Skill frontmatter `description`は変更されていない。
- 現行`main`には`eval:skills:trigger`、`eval:skills:semantic`があるが、Workflow E2E用runnerはない。
- Trigger Evalは`createOtelSkillObserver()`を使い、1回のCodex実行についてcanonical Skillが0件または1件のときだけtrusted observationとする。
- 現行OTel observerは複数canonical Skillを同一観測内で検出すると`multiple_skills`としてreliable=falseにする。したがってPR6で同一turn内のSkill順序をOTel metricから復元しない。
- Trigger Eval runnerはCodex process lifecycle、Windows process tree終了、detached / clean Target、EvaluatorとTargetの分離を実装済みである。
- PR4は`feature-plan`のdeterministic plan output validatorと`exploratory-qa`の既存Machine Contract再利用を実装済みである。
- PR5は`feature-plan`、`code-review`、`harness-improvement`、`exploratory-qa`のSemantic Evalを実装済みである。
- PR5では`repair-loop`と`android-native-local-validation`をN/Aとし、actual changed files、validation、stop decision、Native実行Evidenceとの整合はPR6へ残している。
- `code-review`はreview-onlyでは修正へ暗黙切替しない契約を持つ。
- `exploratory-qa`はQA中にProduct Codeを変更せず、Finding確定後に明示的にRepair workflowへ切り替える契約を持つ。
- `repair-loop`は`stop_needs_human`を明示的な停止decisionとして持つ。
- `harness-improvement`は候補の提案であり自動適用しない。
- `android-native-local-validation`はWindows / physical device等のRuntime capabilityに依存する。

### 前提

- Workflow E2Eのhandoffは、実利用上のユーザーターン境界に合わせてstageへ分ける。
- 各stageはfreshな`codex exec --ephemeral` processとして実行し、同じ隔離case workspaceだけを引き継ぐ。Session identityを維持する独自Session Managerは作らない。
- Skill sequenceはstageの実行順と各stageの観測Skillで評価する。単一process内の複数Skill順序は評価対象にしない。
- Product repository本体をE2E fixtureとして直接汚さず、sanitized Targetから作った一時case workspaceでのみwriteを許可する。
- canonical live runでは既存PR2 / PR5と同じく`gpt-5.6-luna`を使用する。実行時のCodex versionとmodelはresult provenanceへ保存し、自動fallbackしない。
- Native capability不足はblocking questionではない。case resultを`not_executed`にできること自体をPR6の契約とする。

### 対象外

- Skill数の追加。
- Skill `description`最適化の再実施。
- Trigger Eval baselineの再取得・再最適化。
- PR4 deterministic graderの一般化。
- PR5 rubric / calibration datasetの変更。
- live E2E outputを再採点するための第2のSemantic Eval framework。
- 全Skill全順列の網羅。
- 同一turn内のSkill injection順序の復元。
- Workflow E2EをRequired CIのmodel-backed gateにすること。
- retryで良い結果だけを選ぶこと。
- Product source / Product test / Training contentの変更。
- Native Build / Install / MaestroをPR6完了のためだけに強制実行すること。

## 3. 質問 / 曖昧性

### 必ず質問する不透明点

- なし。Issue #117のPR6契約と現行Repository契約から、実装範囲を決定できる。

### 仮定してよい細部

- case workspaceの一時directory名、result fileの一時pathなど、評価意味を変えない実装細部。
- canonical live runでNative capabilityが存在しない場合の具体的な`not_executed_reason`文言。

### 未回答の重要質問

- なし。

### 実装時に観測して確定する事項

- Windows + physical Android device capabilityの有無。ない場合はNative caseを`not_executed`とする。
- Codex Runtimeが補助Skillを同一stageでinjectし、既存OTel observerが`multiple_skills`にするか。発生した場合は推測でcanonical Skillへ読み替えず、stageを`unobservable`またはunexpected Skill条件に従って判定する。

## 4. 影響範囲

### 実装対象

基本実装は次の4ファイルに限定する。

```text
scripts/evals/skill-workflow-evals.ts
scripts/evals/run-skill-workflow-evals.ts
tests/repository-contract/skill-workflow-evals.test.ts
package.json
```

役割:

- `skill-workflow-evals.ts`: 固定case、stage expectation、pure evaluation、result型だけを持つ。
- `run-skill-workflow-evals.ts`: Target preflight、一時case workspace、Codex stage実行、OTel観測、scope / Artifact / deterministic check、result保存を担当する。
- `skill-workflow-evals.test.ts`: case定義、stage scoring、stop / not_executed / unobservable、scope、result contractを検証する。
- `package.json`: manual live runner用の`eval:skills:workflow`を追加する。model-backed live runを`verify`へ直接追加しない。

### 原則変更しないファイル

```text
scripts/evals/otel-skill-observer.ts
scripts/evals/skill-trigger-evals.ts
scripts/evals/run-skill-trigger-evals.ts
scripts/evals/skill-semantic-output-evals.ts
scripts/evals/run-skill-semantic-output-evals.ts
.agents/skills/**
AGENTS.md
.codex/agents/**
.github/workflows/**
src/**
app/**
training/**
```

`otel-skill-observer.ts`の意味をPR6都合で変えない。PR6 runnerはstage単位で既存observerを利用する。

### 条件付き変更

- 既存helperをimportするためのexport追加が必要な場合でも、既存Trigger / Semantic Evalの挙動を変えない単純なexportに限定する。
- 新しいADRは、実装中に既存ADRで表現できないHost Runtime契約を新設する必要が確認された場合だけ作る。Plan時点では追加しない。

## 5. 変更方針

### 5.1 stage型Workflow E2Eに固定する

PR6は汎用Workflow DSLを作らない。代表caseをTypeScriptの固定definitionとして持ち、runnerはそのcaseだけを順番に実行する。

各stageは次を持つ最小構造にする。

```text
id
expected_skill: canonical Skill | null
prompt builder
allowed source changes
required artifact / stop check
capability requirement（必要なcaseのみ）
```

score、weight、汎用transition rule、plugin registry、任意graphは持たない。

### 5.2 代表case

#### Case A: plan → implementation → review → repair

目的: `feature-plan`、direct implementation、`code-review`、`repair-loop`のhandoff、Artifact再利用、review-only停止、explicit repairを1つの隔離workspaceで確認する。

1. Plan stage
   - ユーザー依頼にfixture固有の要求値を含める。
   - Expected Skill: `feature-plan`。
   - stage後に新規`docs/plans/*.md`を1件特定する。
   - PR4の既存`validatePlanOutput`でPlan output contractを検証する。
2. Implementation stage
   - fresh Codex processを使う。
   - promptには前stageで作成したPlan pathだけを渡し、fixture固有の要求本文を再掲しない。
   - Expected Skill: `null`。既存Planの追従実装なので`feature-plan`の再起動を期待しない。
   - fixture fileの最終値がPlanの要求を反映したことをrunner側でdeterministicに確認する。
3. Review fixture preparation
   - runnerが一時workspace内だけで小さい回帰差分を作る。
   - これはAgent stageではなくE2E入力準備としてresultへ記録する。
4. Review stage
   - Expected Skill: `code-review`。
   - review-only依頼とし、stage前後のProduct / fixture source diffが変化していないことを確認する。
   - `repair-loop`が同一stageで起動した場合はFAILにする。
   - 最終responseをcase workspaceのhandoff artifactへ保存する。
5. Repair stage
   - ユーザーがreview artifactのFinding適用を明示的に依頼する。
   - Expected Skill: `repair-loop`。
   - promptにはreview artifact pathとallowed fileだけを渡す。
   - allowed fixture以外のsource変更をFAILにする。
   - stage後にrunnerがdeterministic validationを実行し、修復後の状態を確認する。

このcaseではAgentが実行した内部command列を新しいHook parserで採点しない。actual changed filesとrunnerが実行したvalidation resultを正本とする。

#### Case B: exploratory QA only

目的: `exploratory-qa`のQA-only停止境界を確認する。

- runnerが外部Networkを使わないlocalhost fixture runtimeを起動する。
- Expected Skill: `exploratory-qa`。
- QA-only promptとし、Product / fixture source changeを0件に保つ。
- `repair-loop`を同一stageで起動した場合はFAILにする。
- Runtime / browser等のtrusted capabilityが不足した場合は`not_executed`または`unobservable`とし、PASSへ変換しない。
- QA findingの新しいserializationは発明しない。現行Machine Contract artifactが生成された場合だけ既存PR4 validatorを再利用する。

#### Case C: repair needs human

目的: `repair-loop`の安全停止をactual executionと合わせて確認する。

- credential、permission、policy判断が必要なreview Finding fixtureを入力する。
- Expected Skill: `repair-loop`。
- source changeは0件を要求する。
- final responseに現行契約の`stop_needs_human` decisionが示されることを確認する。
- policy判断を推測してrepairを続行した場合はFAILにする。

#### Case D: harness improvement proposal

目的: repeated failure Evidenceから`harness-improvement`へ切り替わり、Product修正を始めないことを確認する。

- repeated failure / repair outcomeのfixture Evidenceを用意する。
- Expected Skill: `harness-improvement`。
- source changeは0件を要求する。
- PR5 Semantic Evalをlive output用に再実装しない。Product / Harness separationは「Product sourceを変更していない」「proposal stageで終了した」というE2E observableで確認する。

#### Case E: Android Native readiness

目的: PR5でN/AだったNative stage gate / capability不足の扱いを確認する。

- Windows、必要なAndroid tooling、対象device capabilityをpreflightする。
- capability不足ならCodexを起動せず`not_executed`を記録する。
- capabilityがある場合だけDoctor / readiness確認に限定して実行する。
- Expected Skill: `android-native-local-validation`。
- Build / Install / Maestroはこのcaseの必須条件にしない。
- 上流gate失敗後の後続stageを実行しない。

### 5.3 Skill観測

- 各Agent stageごとに新しい`createOtelSkillObserver()`を作る。
- 1 stage = 1 Codex processとし、stage終了後にOTel collectionを閉じる。
- Expected Skillが1件の場合、single canonical Skill一致でPASS候補とする。
- Expected Skillが`null`の場合、trusted absenceだけをPASS候補とする。
- single canonical Skillが期待と異なる場合はFAIL。
- `multiple_skills`で、diagnostic上に期待外canonical Skillが含まれる場合はunexpected SkillとしてFAILにできる。
- unknown Skill、malformed metric、collector error、timeout等でidentityを安全に確定できない場合は`unobservable`。Hookや`SKILL.md` readをOTel scoring fallbackにしない。
- OTel pointの並び順をhandoff順序として使用しない。

### 5.4 Targetとanswer-key isolation

Evaluator rootとRouting / Workflow Targetを分離する。

Targetは次を満たす。

- clean Git working tree。
- detached HEAD。
- Evaluator rootの外部。
- canonical 6 Skillと`AGENTS.md`等の通常Repository contextは存在する。
- PR6 evaluator source、PR6 repository-contract、PR6 Plan、PR6 case-specific Run ArtifactがTargetから見えない。
- PR6 answer keyを過去Git historyから取得できないsanitized targetをcanonical runに使用する。

PR6用の汎用Target ManagerはRepositoryへ追加しない。canonical run前に一時directoryへsanitized snapshotを作り、新しいtemporary Git repositoryとして初期化する。runnerは必要pathのabsence / clean stateをpreflightでfail-closeする。

各caseはsanitized Targetからfreshな一時case workspaceを作る。実Agent write、Git state、Run Artifactはcase workspace内だけに閉じる。

### 5.5 Source scope

runner管理のhandoff / result用temporary pathと`.codex/runs/**`はProduct source scopeから分離する。

- review-only / QA-only / harness-improvement / needs-human stage: source差分追加0件。
- implementation / repair stage: case定義で指定したfixture fileだけ変更可。
- Agentがcommit、branch切替、Git history変更を行った場合はFAIL。
- case workspace外へのwriteや外部副作用を許可しない。

### 5.6 Artifact reuse

Artifact reuseは固定文字列の自己申告ではなく、stage間の状態で確認する。

- Plan stage後に作成されたPlan pathをrunnerが特定する。
- Implementation stageはfresh processで、そのPlan pathだけをhandoffする。
- Stage 1の要求本文をStage 2 promptへ再掲しない。
- Stage 2のfixture結果が要求値を反映して初めてArtifact reuse checkをPASSにする。
- Review responseはrunnerがhandoff artifactへ保存し、Repair stageはそのpathだけをFinding入力として受け取る。
- Artifact全文exact matchは行わない。

### 5.7 result contract

新しいresultはWorkflow E2Eに必要な項目だけを持つ。

```text
schema_version
provenance
  evaluator_git_sha
  routing_source_git_sha
  codex_version
  model
  executed_at
cases[]
  id
  status: pass | fail | unobservable | not_executed
  stages[]
    id
    expected_skill
    observed_skill
    status
    process_lifecycle
    changed_files
    checks
  artifact_reuse
  reason
```

- 総合100点score、weight、severity、confidenceは追加しない。
- `not_executed`と`unobservable`をPASSへ集約しない。
- non-Native必須caseに`fail`または`unobservable`があるcanonical runを成功扱いにしない。
- Native caseはcapability preflightで`not_executed`になってもrun全体を虚偽のFAIL / PASSへ変換せず、case statusとして保持する。

### 5.8 deterministic / semanticとの境界

- `feature-plan`生成物にはPR4の既存deterministic validatorを再利用する。
- `exploratory-qa`のMachine Contract artifactが実際に生成された場合だけ既存schema / Coverage validatorを再利用する。
- PR5のSemantic Eval dataset、rubric、Judge protocolを変更しない。
- live Workflow outputをPR5へ無理に流し込むadapterや新rubricを作らない。
- review-only、QA-only、Harness proposal、repair stop等のE2E observableでPR5の境界と矛盾しないことを確認する。

### 5.9 Runtimeとretry

- canonical live runは各stage 1回だけ実行する。
- timeout / unobservableを消すための自動retryを追加しない。
- 同じcaseを良い結果が出るまで再実行して結果を選別しない。
- process timeoutは既存Trigger Evalと同程度の有限値を持たせ、timeoutをPASSにしない。
- model/provider fallbackを追加しない。

## 6. 実行タスク

- [ ] 1. 実装開始時のlatest `main`とIssue #117の状態を再確認し、PR2 / PR4 / PR5 / PR3以降のmaterial driftを確認する。
- [ ] 2. `skill-workflow-evals.ts`へ固定5 caseとpure stage / case scoring、result contractを実装する。
- [ ] 3. `run-skill-workflow-evals.ts`へTarget preflight、case workspace、Codex stage実行、OTel、scope、Artifact、capability、result保存を実装する。
- [ ] 4. `skill-workflow-evals.test.ts`へSkill mismatch、multiple Skill、trusted absence、unobservable、not_executed、scope violation、Artifact reuse、stop条件のcontract testを追加する。
- [ ] 5. `package.json`へmanual live run用`eval:skills:workflow`を追加する。
- [ ] 6. sanitized detached TargetをRepository外に準備し、PR6 answer keyがworking tree / historyへ露出していないことを確認する。
- [ ] 7. non-Native必須caseのcanonical live runを1回実行し、machine-readable resultをactive implementation Runへ保存する。
- [ ] 8. Native capabilityをpreflightし、利用可能ならCase Eを実行、利用不可なら`not_executed`を記録する。
- [ ] 9. targeted test、repository test、`pnpm run verify`、`git diff --check`、Run Artifact sanitizationを実行する。
- [ ] 10. branch差分を確認し、Skill semantics、Product code、PR2 / PR4 / PR5契約、CI workflowへの不要な変更がないことを確認する。

## 7. 検証方法

### Repository contract

```bash
pnpm exec vitest run tests/repository-contract/skill-workflow-evals.test.ts --no-file-parallelism --maxWorkers=1
pnpm run test:repository
```

最低限次を検証する。

- 固定case / stage IDの重複がない。
- 各caseでExpected Skillがcanonical 6 Skillまたは`null`に限定される。
- single expected Skill一致。
- expected `null`のtrusted absence。
- unexpected canonical Skill。
- same stageでの複数canonical Skill。
- unknown / malformed / timeout / collector failureの`unobservable`。
- capability不足の`not_executed`。
- review-only / QA-only / harness / needs-humanでsource diffが増えた場合のFAIL。
- implementation / repairのallowed file逸脱。
- `stop_needs_human`。
- Plan → implementation Artifact reuse。
- result serialization / provenance。

### Live Workflow E2E

実装後のcanonical commandは`package.json` script経由に統一する。概念形は次とする。

```bash
pnpm run eval:skills:workflow -- --target-root <SANITIZED_TARGET> --model gpt-5.6-luna --output .codex/runs/<RUN_ID>/workflow-e2e-result.json
```

成功判定:

- Case A / B / C / Dが`pass`、またはCase Bがtrusted runtime capability不足により明示的に`not_executed`である。
- `unobservable`をPASS扱いしていない。
- Case Eはcapabilityに応じて`pass`または`not_executed`。
- 各stageのunexpected Skill、scope violation、process failureがない。
- Artifact reuse checkがPASS。
- result provenanceに実際のEvaluator SHA / Routing SHA / Codex version / modelがある。

Case Bが通常Host上で実行可能なcapabilityを持つのに`unobservable`となった場合、未観測を隠してIssue完了扱いにせず原因を記録する。PR6で安全に修正できないHost Runtime制約なら`unobservable`をそのまま残し、独自Agent Runtimeで回避しない。

### Repository全体

```bash
pnpm run verify
git diff --check main...HEAD
```

Run Artifactはimplementation Runの正規collector / sanitizer経路で検証する。

### PR / CI

- 実装PRの最新headでWeb CI / Mobile App CIを確認する。
- model-backed Workflow E2E自体をRequired GitHub Actions gateへ追加しない。
- CI failureがPR6差分起因ならrepair-loop契約に従って修正する。

## 8. リスクと未解決論点

### Risk 1: PR6が独自Workflow Engineになる

対策: 固定5 case、固定stageだけを実装し、任意graph、transition DSL、plugin、registryを作らない。

### Risk 2: OTel aggregateからSkill順序を推測する

対策: 1 stage = 1 process。順序はrunnerのstage順で表現し、OTelは各stageのSkill identityだけに使う。

### Risk 3: multiple Skillを都合よくexpected Skillへ読み替える

対策: expected外canonical Skillが含まれる場合はFAIL。unknown / provenance不足等は`unobservable`。Hook fallbackを作らない。

### Risk 4: Eval answer keyがTargetへ露出する

対策: PR6 evaluator / test / Plan / case-specific Runを除外したsanitized temporary Git repositoryをTargetに使い、runner preflightでfail-closeする。

### Risk 5: review / QAで実装まで進む

対策: disposable workspaceでもsource diffを比較し、0件以外をFAILにする。Skill出力の自己申告だけで判定しない。

### Risk 6: Artifact reuseが単なるprompt再掲になる

対策: fresh processを使い、後段promptにはArtifact pathだけを渡す。要求本文を再掲せず、最終fixture状態で再利用を確認する。

### Risk 7: PR6がSemantic Evalを再実装する

対策: PR5 rubric / Judgeは変更せず、E2E observableとPR4 validatorだけを再利用する。

### Risk 8: Native環境がないため未実行をPASSにする

対策: capability preflightと`not_executed`をresult contractへ持つ。Build / Install等を強制して回避しない。

### Risk 9: model非決定性をretryで隠す

対策: canonical runはstageごとに1回。再試行で結果選別しない。必要な再実行は別Runとして履歴を保持する。

### Risk 10: temporary workspaceのGit操作がRepositoryへ波及する

対策: Evaluator root外のsanitized Targetからcase workspaceを作り、実Repository branch / historyをAgentへwriteさせない。case内HEAD変更もFAILにする。

## 9. 成果物

### このPlan

- `docs/plans/2026-09-20_004829_issue-117-pr6-workflow-e2e-eval.md`

### 実装予定

```text
scripts/evals/skill-workflow-evals.ts
scripts/evals/run-skill-workflow-evals.ts
tests/repository-contract/skill-workflow-evals.test.ts
package.json
```

### implementation Runで保存するEvidence

```text
.codex/runs/<implementation_run_id>/workflow-e2e-result.json
```

必要な場合だけrunner診断を同じRun配下へ保存する。生のcredential、local absolute path、不要なstdout / stderr全文はtracked Run Artifactへ保存しない。

## 10. 実装時の判断順序

1. latest `main`でPR6の前提が変わっていないか。
2. 既存Trigger / Deterministic / Semantic Evalで既に評価できるものを重複実装していないか。
3. 1 stage = 1 processで表現できるか。同一processのSkill順序追跡へ広げない。
4. 固定caseで足りるか。任意Workflow DSLを作らない。
5. source diff / artifact state / runner validationのobservableで判定できるか。自己申告の文章だけに依存しない。
6. OTelが安全にSkill identityを確定できない場合、推測せず`unobservable`にしているか。
7. capability不足を`not_executed`として保持しているか。
8. Skill semanticsやProduct behaviorをPR6都合で変更していないか。
9. live model runをCI required gateへ入れようとしていないか。
10. 新しいAgent Runtime / Session Manager / Workflow Engineが必要になっていないか。必要に見える場合は実装せずIssue #117の非目標へ戻る。

## 11. 備考

- Issue #117のPR6は「Workflowを自動運転する仕組み」を作るフェーズではなく、既存Skill / Harnessの実利用境界を評価するフェーズである。
- 実装で問題が見つかった場合も、PR6内でSkill意味契約を修正することを自動的な完了条件にしない。E2E Findingとして記録し、必要なら別修正へ切り出す。
- PR6完了後、Issue #117の全体完了条件を既存PR1〜PR5と合わせて最終確認してからIssue closeを判断する。
