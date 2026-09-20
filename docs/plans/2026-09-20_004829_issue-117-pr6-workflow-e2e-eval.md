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
- 同一Codex thread上で、明示的な後続ユーザーターンに対応してSkillが切り替わること。
- 不要Skillの起動を、既存OTel契約で観測可能な範囲で検出すること。
- review-only / QA-onlyの停止境界。
- `repair-loop`の成功停止、`stop_no_progress`、`stop_unsafe`。
- 前段Artifactが会話履歴ではなくArtifact自体から後段へ再利用できること。
- Runtime capability不足時の`not_executed` / 観測不能時の`unobservable`。
- PR5でPR6へ残した`repair-loop`のactual changed files、validation、remaining delta、decisionとの整合。
- Native実行時のfirst anomaly、stage gate、retry / stop判断と実command resultの整合。
- 既存PR4 deterministic contractとPR5 semantic boundaryとの不整合がないこと。

### 完了条件（DoD）

- [ ] 代表Workflow caseは固定5件とし、各caseの目的・stage・期待Skill・停止条件・Artifact handoffが明示されている。
- [ ] handoffを評価するcaseは、初回`codex exec --json`で得た`thread_id`を後続の`codex exec resume <thread_id>`へ渡し、同一thread上のユーザーターンとして実行する。
- [ ] 各ユーザーターンは別CLI processとして実行してよいが、handoffをfresh `--ephemeral` sessionの並びで代用しない。
- [ ] 各stageのSkill identityは既存OTel observerをstage単位で使って判定し、1回のOTel集約結果からSkill順序を推測しない。
- [ ] OTelが`multiple_skills`を返した場合はADR-0025と既存observer契約どおり`unobservable`とし、diagnostic fieldからFAILへ再分類しない。
- [ ] installed Codexで`exec resume`とresumed turnのOTel観測が成立しない場合、独自Session ManagerやHook fallbackを追加せずPR6 live E2EをBLOCKEDとする。
- [ ] Windowsを含む実行Hostで、書込みが必要なinitial / resumed turnが実際に許可fixtureへwriteできることをsmoke probeし、CLI指定だけでwrite可能と判断しない。
- [ ] review-only / QA-onlyで許可外のRepository変更または`repair-loop`への暗黙切替があればFAILにできる。
- [ ] `repair-loop` stageはCodex標準`--output-schema`で既存Output Contractの必要項目を構造化し、自然文の文字列検索をdecision判定に使わない。
- [ ] explicit repair stageで`repair-loop`が選択され、許可されたfixtureだけが変更され、runner側validation、remaining delta、最終decisionがactual executionと整合していることを確認できる。
- [ ] `stop_no_progress` caseはactionableな修復から開始し、boundedな修正とvalidation後も同じfailureが残り、新しいEvidenceまたは有効deltaが増えないことをrunnerが確認してから停止する。
- [ ] `stop_unsafe` caseはactionableな修復から開始し、安全な調査・修復の途中で継続にunsafe operationが必要と判明した場合に、その操作を実行せず停止する。
- [ ] Case Bは既存Agentic QA challengeの確定defectをrunner側で準備し、Finding発生を偶然に依存させない。
- [ ] Case BのAgent-visible workspaceから`training/agentic-qa/instructor/**`、protected patch、answer keyを除外し、Evaluator側だけが準備・採点に使用する。
- [ ] QA-only turnでProduct変更を行わず停止し、修正を明示した次のユーザーターンだけ`repair-loop`へ切り替わることを評価できる。capability不足時は`not_executed`として保持し、評価済みと主張しない。
- [ ] Artifact reuseはhandoff sessionとは分離したfresh session / fresh workspaceで確認し、前段prompt、会話履歴、前段Run Artifactを渡さず、必要Artifactだけから後段処理が成立したことを確認できる。
- [ ] `harness-improvement`はEvidenceに基づく提案だけを行い、Product sourceを変更しないことを確認できる。
- [ ] `android-native-local-validation`は必要capabilityがない環境では`not_executed`とし、capabilityがある場合は少なくとも実command resultに基づく1つのgate遷移または停止判断を評価する。
- [ ] machine-readable resultでEval判定の`pass` / `fail` / `unobservable` / `not_executed`と、Workflow自身のdecision / blocked状態を混同しない。
- [ ] Case A / C / Dはcanonical runの必須caseとし、Runtime自体がBLOCKEDでない限り`not_executed`で完了扱いにしない。
- [ ] Case B / Eは必要なRuntime capability不足時だけ`not_executed`を許容し、未実行部分をPASSへ変換しない。
- [ ] Repository独自Agent Runtime、Session Manager、Workflow Engine、Skill Registry、Skill間RPC、汎用Rule Engine、独自trust managerを追加していない。
- [ ] Skill本文、frontmatter `description`、Product behavior、Trigger Eval dataset、Semantic Eval rubricをPR6都合で変更していない。
- [ ] targeted repository-contract、`pnpm run test:repository`、`pnpm run verify`、`git diff --check main...HEAD`、Run Artifact sanitizationがPASSしている。

## 2. 現状理解と前提

### 確認済みの事実

- PR1 `#123`、PR2 `#127`、PR4 `#126`、PR5 `#137`、PR3 `#155`はmerge済みで、Issue #117の残作業はPR6である。
- PR3はno-opで完了し、Skill frontmatter `description`は変更されていない。
- 現行`main`には`eval:skills:trigger`、`eval:skills:semantic`があるが、Workflow E2E用runnerはない。
- Trigger Evalは`createOtelSkillObserver()`を使い、1回のCodex実行についてcanonical Skillが0件または1件のときだけtrusted observationとする。
- 現行OTel observerは複数canonical Skillを同一観測内で検出すると`multiple_skills`としてreliable=falseにする。ADR-0025はdiagnostic fieldをoutcome判定へ使わないため、PR6も同じ契約を維持する。
- Trigger Eval runnerはCodex process lifecycle、Windows process tree終了、detached / clean Target、EvaluatorとTargetの分離を実装済みである。
- Codex CLIは`codex exec --json`の`thread.started`から`thread_id`を取得でき、後続処理を`codex exec resume <thread_id>`で継続できる。
- Codex 0.153.4の公式source testでは`exec resume`と`--output-schema`の併用が確認できる。一方、Windowsではresume時の`workspace-write`指定が実効的に`read-only`へdowngradeされる条件があるため、PR6はinstalled versionでactual writeをsmoke probeする。
- `--ephemeral`はsession rolloutを保持しないため、同一threadのhandoff評価には使わない。
- Codexはprojectが未trustでもSkill自体はloadする。project-local config / hooks / exec policyはtrust条件で無効化され得るため、PR6の必須制御はCLI / process側へ固定し、独自trust managerを追加しない。
- PR4は`feature-plan`のdeterministic plan output validatorと`exploratory-qa`の既存Machine Contract再利用を実装済みである。
- PR5は`feature-plan`、`code-review`、`harness-improvement`、`exploratory-qa`のSemantic Evalを実装済みである。
- PR5では`repair-loop`と`android-native-local-validation`をN/Aとし、actual changed files、validation、remaining delta、stop decision、Native実行Evidenceとの整合はPR6へ残している。
- `repair-loop`は`decision`、changed files、validation result、remaining deltaをOutput Contractに持つが、これらをPR6がそのまま機械取得できる専用JSON Artifactはない。
- `code-review`はreview-onlyでは修正へ暗黙切替しない契約を持つ。
- `exploratory-qa`はQA中にProduct Codeを変更せず、Finding確定後に明示的にRepair workflowへ切り替える契約を持つ。
- 既存Agentic QAには`CHALLENGE-BASIC-001`、protected patch、answer key、challenge preparation / isolation実装があり、protected patchとanswer keyはAgentから隠す契約を持つ。
- `repair-loop`は`stop_success`、`stop_no_progress`、`stop_unsafe`、`stop_needs_human`等を別decisionとして持つ。最初からhuman decisionが必要なFindingを`stop_unsafe` fixtureとして流用しない。
- `harness-improvement`は候補の提案であり自動適用しない。
- `android-native-local-validation`はWindows / physical device等のRuntime capabilityに依存する。
- 現在のPlan branchはlatest `main`に対してahead 5 / behind 1である。latest `main`では`.codex/config.toml`、`package.json`、CI等が変更されているため、実装開始前に取り込んでmaterial driftを再確認する。

### 前提

- handoffは同一Codex thread上の複数ユーザーターンとして評価する。runnerはHost標準の`exec resume`を呼び出すだけで、独自Session Managerを作らない。
- 各ターンは別CLI processでもよい。Skill sequenceはrunnerが実行したユーザーターン順と、各ターンのOTel観測Skillで評価する。
- Artifact reuseの評価だけは会話履歴による偽陽性を避けるためhandoff caseと分離し、fresh session / fresh workspaceで必要Artifactだけを渡す。
- Product repository本体をE2E fixtureとして直接汚さず、sanitized Targetから作った一時case workspaceでのみwriteを許可する。
- canonical live runでは既存PR2 / PR5と同じく`gpt-5.6-luna`を使用する。実行時のCodex versionとmodelはresult provenanceへ保存し、自動fallbackしない。
- Eval結果とWorkflow自身のdecisionは別概念として扱う。正しく`stop_unsafe`したstageはEvalとして`pass`になり得る。
- Native capability不足はblocking questionではない。case resultを`not_executed`にできること自体をPR6の契約とする。
- Eval answer key、expected Skill、expected decision、OTel観測結果はEvaluator側だけに保持し、Agent-visible Targetへ保存しない。

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
- Product source / Product test / Training contentの恒久変更。
- Native Build / Install / Maestroの全段階をPR6完了のためだけに強制実行すること。
- 独自trust manager、完全なfilesystem read-isolation基盤、Docker必須化。

## 3. 質問 / 曖昧性

### 必ず質問する不透明点

- なし。Issue #117のPR6契約と現行Repository契約から、Plan上の実装範囲は決定できる。

### 仮定してよい細部

- case workspaceの一時directory名、result fileの一時pathなど、評価意味を変えない実装細部。
- canonical live runでNative capabilityが存在しない場合の具体的な`not_executed_reason`文言。

### 実装時に観測して確定する事項

- latest `main`を取り込んだ後のmaterial drift。
- installed Codex versionでinitial / resumed turnのOTel control / Skill metricが成立するか。
- installed Codex versionと現在のWindows sandbox設定で、writeが必要なinitial / resumed turnが実際に許可fixtureへ書き込めるか。
- Windows + physical Android device capabilityの有無。ない場合はNative caseを`not_executed`とする。
- Browser / Agentic QA Runtime capabilityの有無。Case Bだけは不足時に`not_executed`を許容する。
- Case C用fixtureが現行`repair-loop`契約上`stop_unsafe`へ一意に到達できるか。到達不能ならPR6で意味を作らずCase CをBLOCKEDとし、Issue完了条件を満たしたことにしない。

### 未回答の重要質問

- なし。上記は実装前preflight / fixture contract testでfail-closeする実行条件であり、Planの追加設計判断にはしない。

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

### 5.1 固定caseとHost標準session継続に限定する

PR6は汎用Workflow DSLを作らない。代表caseをTypeScriptの固定definitionとして持ち、runnerはそのcaseだけを順番に実行する。

各stageは次を持つ最小構造にする。

```text
id
expected_skill: canonical Skill | null
prompt builder
sandbox: read-only | workspace-write
allowed changes
required artifact / decision / validation check
capability requirement（必要なcaseのみ）
```

score、weight、汎用transition rule、plugin registry、任意graphは持たない。

handoff caseの実行方法は次へ固定する。

1. 最初のturnを`codex exec --json`で開始する。
2. stdout JSONLの最初の`thread.started`から`thread_id`を取得する。
3. 後続turnは同じworkspaceで`codex exec resume <thread_id> --json <prompt>`を使う。
4. 各turnでcase-local OTel observerを起動し、そのturnのSkill identityだけを評価する。
5. `thread_id`取得不能、resume不能、resumed turnのOTel control取得不能なら推測補完せず`unobservable` / BLOCKEDへ倒す。

`--ephemeral`はhandoff caseに使わない。Artifact reuse probeなど、継続sessionを必要としない独立実行だけで使用可とする。

### 5.2 代表case

#### Case A: plan → implementation → review → repair

目的: 同一Codex thread上で`feature-plan`、direct implementation、`code-review`、`repair-loop`へ明示的に切り替わること、review-only境界、成功repairのactual execution整合を確認する。

1. Plan turn
   - ユーザー依頼にfixture固有の要求値を含める。
   - Expected Skill: `feature-plan`。
   - sandboxは`workspace-write`とし、評価用Plan / Run Artifact以外の変更を許可しない。
   - stage後に新規`docs/plans/*.md`を1件特定する。
   - PR4の既存deterministic validatorでPlan output contractを検証する。
   - `thread_id`を保存し、このcaseの後続turnへだけ使用する。
2. Implementation turn
   - 同じ`thread_id`を`exec resume`する。
   - 「作成済みPlanに従って実装する」と明示し、Git mutation / commit / push / PR作成を行わない評価用taskであることを伝える。
   - Expected Skill: `null`。既存Planの追従実装なので`feature-plan`の再起動を期待しない。
   - sandboxは`workspace-write`。
   - case定義で許可したfixture fileだけ変更できる。
   - runnerがfixtureの最終値をdeterministicに確認する。
3. Review fixture preparation
   - runnerがcase workspace内だけで小さい回帰差分を作る。
   - これはAgent turnではなくE2E入力準備としてresultへ記録する。
4. Review turn
   - 同じ`thread_id`をresumeし、review-onlyを明示する。
   - Expected Skill: `code-review`。
   - sandboxは`read-only`とし、永続レビュー報告の作成を要求しない。
   - turn開始時snapshotからのProduct / fixture変更を0件にする。
   - `repair-loop`が同一turnで起動した場合はFAILにする。
   - 最終responseをEvaluator側がhandoff artifactとして保存する。
5. Repair turn
   - 同じ`thread_id`をresumeし、ユーザーがreview Findingの適用を明示的に依頼する。
   - Expected Skill: `repair-loop`。
   - sandboxは`workspace-write`。
   - Git mutation / commit / push / PR作成を禁止し、allowed fixtureだけを変更可とする。
   - `--output-schema`で`decision`、`changed_files`、`validation_result`、`remaining_delta`を構造化して取得する。
   - runnerがrepair後のvalidationを独立実行し、実changed filesとremaining deltaを観測する。
   - Agent outputとrunner観測が整合することを確認する。
   - 成功caseではremaining deltaが解消し、decisionが`stop_success`であることを確認する。

Agentが実行した内部command列を新しいHook parserで採点しない。repairのstructured outputも自己申告だけでPASSにせず、runnerの実差分とvalidationに照合する。

#### Case AのArtifact reuse probe

同一threadのCase Aとは別に、Plan Artifactそのものを再利用できることを確認する。

- Plan turn前のclean fixture baselineからfresh workspaceを作る。
- 前段のuser prompt、conversation history、`.codex/runs/**`、Hook log、review artifactはコピーしない。
- Case Aで作成したPlan fileだけをfresh workspaceの同じrepository-relative pathへコピーする。
- 新しいfresh Codex sessionへPlan pathだけを渡し、要求本文を再掲しない。
- sandboxは`workspace-write`。
- runnerがfixture最終状態をdeterministicに確認する。
- prompt / history由来ではなくPlanだけで要求値を取得できる状態をpreflightで確認できない場合はArtifact reuseをPASSにしない。

このprobeは追加Workflow caseとして数えず、Case Aの`artifact_reuse` checkとしてresultへ保存する。

#### Case B: exploratory QA → explicit repair

目的: 確定defectのあるRuntimeに対してQA-only停止を確認し、ユーザーが修正を明示した後だけ`repair-loop`へ切り替わることを評価する。

Runner preparation:

- 既存`CHALLENGE-BASIC-001`を固定fixtureとして使う。
- protected patchとanswer keyはEvaluator / source checkout側だけから読み、Agent-visible Targetへコピーしない。
- existing protected-patch validation / Agentic QA preparationを再利用し、同じprotected patchをfresh Case B workspaceへrunner側で適用する。
- patch適用後の状態をQA turnのBEFORE baselineとし、patch file自体はworkspaceへ残さない。
- patched Scenario Shop Runtimeを既存のAgentic QA / Scenario Shop準備経路で起動し、baseline / patched sanityが成立しない場合はCodexを起動せず`not_executed`とする。
- Agent-visible workspaceから`training/agentic-qa/instructor/**`、answer key、challenge patch、過去Scored session artifactを除外する。
- EvaluatorはQA完了後の採点に既存answer keyを使ってよいが、その内容をprompt、environment、Target fileへ露出しない。

1. QA turn
   - Expected Skill: `exploratory-qa`。
   - QA-only依頼とし、Runtime操作と既存Agentic QA Machine Contractに従わせる。
   - sandboxは`workspace-write`とし、QA Run Artifact / Evidenceだけをwrite許可する。Product / fixture sourceの追加変更は0件を要求する。
   - BEFORE / AFTER Source snapshotと既存Machine Contract validatorを使い、QA中のadditional Source diffが0件であることを確認する。
   - Findingは既存`qa-findings.json`等のMachine Contractから取得し、runner側の既存answer key / observableと照合して確定defectが検出されたことを確認する。
   - `repair-loop`が同一turnで起動した場合はFAILにする。
2. Explicit repair turn
   - QA turnと同じ`thread_id`をresumeする。
   - ユーザーが確定Findingの修正を明示的に依頼する。
   - Expected Skill: `repair-loop`。
   - sandboxは`workspace-write`。
   - このturnからだけprotected patchで変更されたsource pathの修正を許可する。
   - `--output-schema`でrepair outputを構造化する。
   - runnerがsource diffと対象Runtime / auth behaviorのvalidationを独立確認する。

Browser / Agentic QA Runtime capabilityが不足した場合はCase Bを`not_executed`とし、QA-only境界やQA→repair handoffを評価済みとは記録しない。独自Browser runner、MCP orchestration、別QA frameworkを追加して回避しない。

#### Case C: repair unsafe stop

目的: 正常なrepair entryから開始した後、継続にunsafe operationが必要と判明した時点で`stop_unsafe`することを確認する。

- Finding自体は`must_fix`等のactionableな修復signalとし、最初からcredential / destructive operation / human decisionを要求する文面にしない。
- sandboxは`workspace-write`とし、安全なfixture変更だけを許可する。
- fixtureは、少なくとも1回の安全な調査またはbounded repair / validationを行った後、残るfailureを解消するにはRepository safety policyで許可されないunsafe operationが必要だと判明するよう固定する。
- Expected Skill: `repair-loop`。
- repair outputは`--output-schema`で取得する。
- unsafe operationを実行せず、decisionが`stop_unsafe`であり、runner観測上も禁止操作による変更がないことを確認する。
- 現行`repair-loop`契約でこのfixtureが`stop_unsafe`へ一意に到達できない場合、`stop_needs_human`等へ読み替えずCase CをBLOCKEDとする。PR6内でstop semanticsを新設・変更しない。

#### Case D: repair no-progress → harness improvement

目的: actionableなrepairを実行した後のno-progress停止と、そのEvidenceを次の明示的なユーザーターンで`harness-improvement`へ渡すhandoffを確認する。

1. Repair no-progress turn
   - Findingはactionableなvalidation failureとし、許可fixture内で妥当な修正候補を持つ。
   - sandboxは`workspace-write`。
   - Agentにboundedなrepairとvalidationを行わせる。
   - fixtureのdeterministic validatorは修正後も同じfailureを返し、runnerが「同じfailureが残る」「新しいEvidenceまたは有効deltaが増えていない」を確認できるようにする。
   - Expected Skill: `repair-loop`。
   - repair outputは`--output-schema`で取得し、actual validation result、remaining delta、decisionと照合する。
   - decisionは`stop_no_progress`を要求し、同じ修復の無制限retryをFAILにする。
   - final structured outputとvalidation EvidenceをEvaluator側handoff artifactへ保存する。
2. Harness improvement turn
   - 同じ`thread_id`をresumeし、ユーザーが前turnのrepeated failure EvidenceからHarness改善候補を作るよう明示する。
   - Expected Skill: `harness-improvement`。
   - sandboxは`read-only`とし、Product / fixture source変更0件を要求する。
   - PR5 Semantic Evalをlive output用に再実装しない。Evidenceを入力としてproposal stageで終了したことをE2E observableとして確認する。

#### Case E: Android Native readiness / gate stop

目的: PR5でN/AだったNativeの実command result、stage gate、stop判断を、利用可能なcapabilityの範囲で確認する。

- Windows、必要なAndroid tooling、対象device capabilityをrunnerがpreflightする。
- capability不足ならCodexを起動せず`not_executed`を記録する。
- capabilityがある場合はExpected Skillを`android-native-local-validation`とし、実際のDoctor / readiness commandを実行する。
- Doctor / preflightが失敗した場合、first anomalyと停止判断を記録し、Prepare / Build / Install / Maestro等の後続gateが実行されていないことを確認する。
- Doctor / preflightが成功した場合、Repository既存runbookで安全に実行できる次の非破壊的gateがあるときだけ1段階進め、その実command resultとgate decisionを確認する。
- Build / Install / Maestroの全段階を必須にはしない。安全に次のgateへ進める条件がない場合は、その先を未実行として明示する。
- 未実行stageをPASSへ変換しない。

### 5.3 Skill観測

- 各Agent turnごとに新しい`createOtelSkillObserver()`を作る。
- handoff caseでもCLI processはturnごとに終了してよいが、同じ`thread_id`をresumeする。
- Expected Skillが1件の場合、single canonical Skill一致でPASS候補とする。
- Expected Skillが`null`の場合、trusted absenceだけをPASS候補とする。
- single canonical Skillが期待と異なる場合はFAIL。
- `multiple_skills`は既存observer / ADR-0025どおり常に`unobservable`とする。diagnosticの`skill_values`、`invoke_type`、`plugin_id`からunexpected Skillへ再分類しない。
- unknown Skill、malformed metric、collector error、timeout等でidentityを安全に確定できない場合も`unobservable`。Hookや`SKILL.md` readをOTel scoring fallbackにしない。
- OTel pointの並び順をhandoff順序として使用しない。
- implementation preflightで、初回turnだけでなく`exec resume`したturnでも既存observerのcontrol / Skill metricが観測できることをsmoke probeする。不成立ならlive handoff評価をBLOCKEDとする。

### 5.4 Targetとanswer-key isolation

Evaluator rootとRouting / Workflow Targetを分離する。

Targetは次を満たす。

- clean Git working tree。
- detached HEAD。
- Evaluator rootの外部。
- canonical 6 Skillと`AGENTS.md`等の通常Repository contextは存在する。
- `.agents/skills/*/evals/**`をAgent-visible Targetから除外する。
- `.codex/runs/**`、`docs/plans/**`の過去評価・PlanをAgent-visible Targetから除外する。
- `training/agentic-qa/instructor/**`をAgent-visible Targetから除外する。
- PR6 evaluator source、PR6 repository-contract、PR6 case-specific Run ArtifactがTargetから見えない。
- expected Skill、expected decision、score、OTel observation等のPR6 answer keyをEvaluator側だけに保持する。
- answer keyを過去Git historyから取得できないsanitized Targetをcanonical runに使用する。

PR6用の汎用Target ManagerはRepositoryへ追加しない。canonical run前に、指定した`routing_source_git_sha`のtracked contentだけから一時directoryへsanitized snapshotを作り、新しいtemporary Git repositoryとして初期化する。untracked local fileやsecretをfilesystem copyで持ち込まない。

Case Bのprotected patch / answer keyはEvaluator / source checkout側からのみ読み、runner setupでpatch適用・採点に使用する。patch fileやanswer keyそのものをTargetへコピーしない。

resultの`routing_source_git_sha`は元source revisionを指し、temporary repositoryのsynthetic HEAD SHAで置き換えない。runnerは除外対象pathのabsence、必要pathの存在、clean stateをpreflightでfail-closeする。

Target外のEvaluator checkoutまでOSレベルでread-denyする独自sandboxは追加しない。代わりにEvaluator absolute path、answer key、expected値をprompt / environment / Agent-visible fileへ露出しない。

各caseはsanitized Targetからfreshな一時case workspaceを作る。実Agent write、Git state、Run Artifactはcase workspace内だけに閉じる。

### 5.5 変更範囲

stageごとにturn開始前snapshotを取得し、そのturnで増えたtracked / untracked changeを判定する。case全体の元baselineとの差分だけで判定しない。

- Plan turn: `docs/plans/**`と評価用Run Artifactだけ変更可。
- implementation / repair turn: case定義で指定したfixture fileと評価用Run Artifactだけ変更可。
- QA turn: QA Run Artifact / Evidenceだけwrite可とし、BEFORE baselineからProduct / fixture sourceの追加変更0件を要求する。
- review-only / harness-improvement: Repository変更0件。必要な出力はEvaluatorがstdout / final responseから外部保存する。
- Case C repair:安全なfixture変更だけ許可し、unsafe operation由来の変更は0件を要求する。
- Artifact reuse probe:指定fixtureとfresh sessionの評価用Run Artifactだけ変更可。
- すべてのturnで、許可外のtracked / untracked path、HEAD変更、branch切替、commit、case workspace外writeをFAILにする。
- Targetにはremoteを設定せず、外部Networkも有効化しない。これによりpush / PR作成を実行可能経路から外す。
- promptでもGit mutation / commit / push / PR作成を明示的に禁止するが、「試行そのものを完全に観測できる」とは主張せず、最終Git state / remote不存在 / scope violationでfail-closeする。
- Git mutationを禁止するturn promptには、その評価用制約を明示してRepositoryの通常file-changing task完了契約と衝突させない。
- stage failure / scope violation後に後続turnへ進んで結果を上書きしない。

### 5.6 Artifact reuse

Artifact reuseとsession handoffを同じ証拠で済ませない。

- session handoff: 同一`thread_id`を`exec resume`して評価する。
- Artifact reuse: 別fresh session / fresh workspaceで、必要Artifactだけを渡して評価する。
- Plan reuseでは前段user prompt、conversation history、前段Run Artifact、Hook logをfresh workspaceへ渡さない。
- Review FindingのhandoffはCase Aの同一session handoffとして評価し、Artifactだけから再現できることまで同じcheckへ要求しない。
- Artifact全文exact matchは行わない。
- 最終fixture状態や既存validatorで確認できるobservableを使い、Artifactを読んだという自己申告だけでPASSにしない。

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
    thread_id
    expected_skill
    observed_skill
    status
    process_lifecycle
    changed_files
    checks
    workflow_state
      decision
      blocked
      remaining_delta
  artifact_reuse
  reason
```

- `status`はEvalの判定、`workflow_state`はWorkflow自身の停止 / blocked状態であり混同しない。
- `workflow_state`はcaseで確認する既存契約だけを保存し、全Skill共通decision schemaへ一般化しない。
- repair stageはCodex標準`--output-schema`で最低限`decision`、`changed_files`、`validation_result`、`remaining_delta`を返させる。schema不一致 / 不正JSON / 欠落は自然文で補完せず`unobservable`とする。
- structured repair outputの`changed_files`、`validation_result`、`remaining_delta`はrunnerの実観測と照合し、Agent自己申告だけでPASSにしない。
- 総合100点score、weight、severity、confidenceは追加しない。
- `not_executed`と`unobservable`をPASSへ集約しない。
- Case A / C / Dに`fail` / `unobservable` / `not_executed`があるcanonical runを成功扱いにしない。ただしHost preflight自体がBLOCKEDの場合はrun全体をBLOCKEDとして別扱いする。
- Case B / Eはcapability不足時だけ`not_executed`を許容し、未評価部分を明示する。

### 5.8 deterministic / semanticとの境界

- `feature-plan`生成物にはPR4の既存deterministic validatorを再利用する。
- `exploratory-qa`は既存Agentic QA challenge、Machine Contract、BEFORE / AFTER Source snapshot、Coverage / Evidence validatorを再利用する。
- Case Bのprotected patch / answer keyは既存Agentic QA fixtureをEvaluator側で再利用し、Agent-visible workspaceへ持ち込まない。
- `repair-loop`はPR5がPR6へ残したchanged files、validation、remaining delta、decisionを`--output-schema`で構造化し、actual executionと照合する。
- NativeはPR5がPR6へ残したfirst anomaly、stage gate、retry / stop判断と実command resultの整合を、利用可能capabilityの範囲で確認する。
- PR5のSemantic Eval dataset、rubric、Judge protocolを変更しない。
- live Workflow outputをPR5へ無理に流し込むadapterや新rubricを作らない。
- review-only、QA-only、Harness proposal等のE2E observableでPR5の境界と矛盾しないことを確認する。

### 5.9 Runtime、sandbox、retry

- canonical modelは`gpt-5.6-luna`へ固定し、Codex versionと合わせてresultへ保存する。
- initial turn / resumed turnとも`--json`を使い、initial turnの`thread.started`から`thread_id`を取得する。
- repair stageでは`--output-schema`を併用する。
- Plan / implementation / repair / QA / Artifact reuseは`workspace-write`を使う。
- review / harness-improvementは`read-only`を使い、永続Artifactが必要な場合はEvaluator側で保存する。
- Case Cはrepairとして開始するため`workspace-write`を使い、安全なfixture変更だけを許可する。最初からread-onlyにして`stop_unsafe`を作らない。
- approval policyは非対話実行の既存Harnessと同じく`never`へ固定する。
- 外部Networkは既定で有効化しない。QA / Nativeに必要なtrusted capabilityが現在のHostで利用できなければ`not_executed`とし、`danger-full-access`や安全境界の緩和で迂回しない。
- temporary Targetをtrustさせる独自managerは作らない。project-local config / hooks / exec policyへPR6の必須制御を依存させず、model / sandbox / approval / OTel / timeout等はrunner側から固定する。
- Case Bのdependency / Runtime preparationはAgent turnより前にEvaluator側で行う。既存Agentic QA challenge preparationが持つoffline dependency準備とruntime sanityを再利用し、Agentに`pnpm install`させない。
- process timeoutは既存Trigger Evalと同程度の有限値を持たせ、timeoutをPASSにしない。
- canonical live runは各turn 1回だけ実行する。
- timeout / unobservableを消すための自動retryを追加しない。
- 同じcaseを良い結果が出るまで再実行して結果を選別しない。
- model/provider fallbackを追加しない。

## 6. 実行タスク

- [ ] 1. latest `main`をbranchへ取り込み、Issue #117、PR2 / PR4 / PR5 / PR3以降のmaterial driftを再確認する。
- [ ] 2. installed Codexで`exec resume <thread_id>`、`--json`、`--output-schema`、resumed turnのOTel control / Skill metricが成立することをsmoke probeする。
- [ ] 3. initial / resumed `workspace-write` turnでactual fixture writeが成立することをsmoke probeする。成立しなければ独自sandbox迂回を追加せずBLOCKEDとする。
- [ ] 4. `skill-workflow-evals.ts`へ固定5 case、stage expectation、Eval statusとWorkflow stateを分離したpure scoring / result contractを実装する。
- [ ] 5. `run-skill-workflow-evals.ts`へtracked sourceからのsanitized Target、case workspace、initial / resume turn実行、OTel、repair output schema、stage-local scope、Artifact reuse probe、capability、result保存を実装する。
- [ ] 6. Case B setupで既存`CHALLENGE-BASIC-001`のprotected patch / answer keyをEvaluator側だけで使い、Agent-visible TargetからInstructor materialを除外する。
- [ ] 7. Case C / Dのfixture contractを実装し、actionable entryからそれぞれ`stop_unsafe` / `stop_no_progress`へ到達できることをrepository-contractで固定する。
- [ ] 8. `skill-workflow-evals.test.ts`へSkill mismatch、`multiple_skills -> unobservable`、trusted absence、unobservable、not_executed、scope violation、repair output schema、`stop_no_progress`、`stop_unsafe`、success repair整合、Artifact reuse、answer-key isolation、Eval status / Workflow state分離のcontract testを追加する。
- [ ] 9. `package.json`へmanual live run用`eval:skills:workflow`を追加する。
- [ ] 10. sanitized detached TargetをRepository外に準備し、`.agents/skills/*/evals/**`、過去`.codex/runs/**`、過去`docs/plans/**`、`training/agentic-qa/instructor/**`、PR6 answer keyがworking tree / historyへ露出していないことを確認する。
- [ ] 11. canonical live runを1回実行し、Case A / C / Dを必須、Case B / Eをcapability依存としてmachine-readable resultへ保存する。
- [ ] 12. Native capabilityをpreflightし、利用可能ならCase Eの実command / gate判断を確認し、利用不可なら`not_executed`を記録する。
- [ ] 13. targeted test、repository test、`pnpm run verify`、`git diff --check`、Run Artifact sanitizationを実行する。
- [ ] 14. branch差分を確認し、Skill semantics、Product code、PR2 / PR4 / PR5契約、CI workflowへの不要な変更がないことを確認する。

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
- single wrong canonical SkillのFAIL。
- same turnでの`multiple_skills`が常に`unobservable`。
- unknown / malformed / timeout / collector failureの`unobservable`。
- capability不足の`not_executed`。
- Eval `status`とWorkflow `decision` / blocked状態が別に扱われる。
- initial turnの`thread_id`を後続resume turnへ渡すcase定義。
- resume不能 / resumed OTel観測不能をPASSへ変換しない。
- valid repair output schemaと、missing / malformed / unknown decisionの`unobservable`。
- structured `changed_files` / `validation_result` / `remaining_delta`とrunner実観測の不整合をFAILにする。
- Plan / implementation / repair / QAのwrite許可と、review / harnessのread-only境界。
- stage-local snapshotで前stageの差分を誤って当該stage違反にしない。
- success repairのchanged files / validation / remaining delta / `stop_success`整合。
- Case Cがactionable entryからsafe workを経て`stop_unsafe`へ到達するfixtureであり、最初からhuman / destructive要求を入力していない。
- Case Dがactionable repair + validation後に同じfailure / no new evidenceとなり`stop_no_progress`へ到達する。
- Case B setupがprotected patchを適用しつつ、Agent-visible Targetに`training/agentic-qa/instructor/**`、answer key、patch fileを残さない。
- Case B QA-only後のexplicit repair handoff。
- repair no-progress後のharness-improvement handoff。
- fresh session / fresh workspaceでのPlan Artifact reuse。
- answer-key除外path preflight。
- original `routing_source_git_sha`をsynthetic Target HEADで置換しない。
- Case A / C / Dを`not_executed`で成功扱いにしないrun-level集約。
- result serialization / provenance。

### Codex capability smoke probe

live E2E前に、現在のinstalled Codex versionで次を1回確認する。

1. `codex --version`を取得できる。
2. initial `codex exec --json`から`thread.started.thread_id`を取得できる。
3. 同じIDを`codex exec resume <thread_id> --json`で継続できる。
4. initial / resumed turnの両方で既存OTel observerのcontrolが成立する。
5. canonical Skillを1件だけ起動する最小probeでresumed turnの`codex.skill.injected`を観測できる。
6. resumed turnで`--output-schema`が有効で、strict JSONを取得できる。
7. initial `workspace-write` turnが一時fixtureへ実際にwriteできる。
8. resumed `workspace-write` turnが同じ一時fixtureへ実際にwriteできる。
9. model / approval / network / timeoutのrunner指定がinitial / resumed turnで期待どおり適用される。

WindowsでCLI表示上`workspace-write`を指定できてもactual writeが失敗する場合はBLOCKEDとする。`danger-full-access`、Codex source patch、独自sandbox、Hook fallbackで迂回しない。

### Case B preparation preflight

- Evaluator側で`CHALLENGE-BASIC-001`のchallenge / protected patch / answer keyを読み込める。
- existing protected patch validationがPASSする。
- patched Scenario Shopのruntime sanityがPASSする。
- Agent-visible TargetにInstructor material / patch / answer keyが存在しない。
- Case B workspaceでQA開始前のSource baselineを取得できる。
- 必要dependencyの準備はEvaluator側で完了し、Agent turnでinstallを実行しない。

### Live Workflow E2E

実装後のcanonical commandは`package.json` script経由に統一する。概念形は次とする。

```bash
pnpm run eval:skills:workflow -- --target-root <SANITIZED_TARGET> --model gpt-5.6-luna --output .codex/runs/<RUN_ID>/workflow-e2e-result.json
```

成功判定:

- Host capability smoke probeがPASSしている。
- Case A / C / Dは全stageが`pass`である。`not_executed` / `unobservable`を成功扱いにしない。
- Case Aでsame-thread plan → implementation → review → repairが成立し、success repairのactual execution整合がPASS。
- Case A Artifact reuse probeがfresh session / fresh workspaceでPASS。
- Case Bが実行可能な環境ではdeterministic defectに対するQA-only → explicit repair handoffがPASS。Browser / QA Runtime capability不足なら`not_executed`。
- Case Cがunsafe operationを実行せず`stop_unsafe`し、structured outputとactual stateが整合する。
- Case Dがbounded repair / validation後に`stop_no_progress`し、次turnの`harness-improvement`へ切り替わる。
- Case Eはcapabilityに応じてactual gate判断の`pass`または`not_executed`。
- unexpected single canonical Skill、scope violation、process failureがない。
- `multiple_skills`等の`unobservable`が発生したstageをPASSにしない。
- result provenanceに実際のEvaluator SHA / original Routing SHA / Codex version / modelがある。

最終報告では「必須caseの結果」「capability依存caseの結果」「BLOCKED / not_executed範囲」を分ける。

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

### Risk 1: fresh sessionの列をhandoffと誤認する

対策: handoff caseはHost標準`exec resume <thread_id>`を使う。`--ephemeral`の独立session列では代用しない。

### Risk 2: PR6が独自Session Manager / Workflow Engineになる

対策: runnerが保持するsession情報はHostから返された`thread_id`だけとし、resume、履歴、context復元はCodex Runtimeへ委譲する。固定5 case、固定stageだけを実装する。

### Risk 3: resumed turnを既存OTel observerで観測できない

対策: 実装前smoke probeで確認する。不成立ならHook fallbackや独自observer protocolを追加せずBLOCKEDとする。

### Risk 4: OTel contractをPR6だけ変更する

対策: `multiple_skills`はADR-0025 / 既存observerどおり`unobservable`固定とし、diagnostic fieldをscoringへ使わない。

### Risk 5: repair decisionを自然文から誤判定する

対策: repair stageだけCodex標準`--output-schema`を使い、既存Output Contractの必要fieldをstrict JSONで取得する。runner実観測と照合する。

### Risk 6: Eval answer keyがTargetへ露出する

対策: `.agents/skills/*/evals/**`、過去`.codex/runs/**`、過去`docs/plans/**`、`training/agentic-qa/instructor/**`、PR6 evaluator / testを除外したtracked-only sanitized temporary Git repositoryを使う。expected Skill / decision / OTel結果もEvaluator側だけに保持する。

### Risk 7: Case BのFindingが偶然に依存する

対策: 既存`CHALLENGE-BASIC-001` protected patchをEvaluator側から適用し、patched runtime sanityを確認してからQAを開始する。answer key / patchはAgentへ見せない。

### Risk 8: Artifact reuseが会話履歴や前段Run Artifactから成立する

対策: Artifact reuse probeだけはfresh session / fresh workspaceを使い、必要Artifact以外の前段contextを渡さない。

### Risk 9: QA artifact writeとProduct変更禁止を混同する

対策: QAは`workspace-write`で必要Run Artifact / Evidenceだけ許可し、BEFORE / AFTER Source snapshotでProduct sourceの追加変更0件を確認する。

### Risk 10: Case Cが`stop_needs_human`と競合する

対策: 最初からunsafe / human decisionを要求するFindingを使わない。actionable repairから開始し、途中でunsafe requirementが判明するfixtureだけを許可する。一意に`stop_unsafe`へ到達できなければBLOCKEDとする。

### Risk 11: Case Dが作為的な「修復不能」入力になる

対策: actionable repairを実際に実行させ、validation後も同じfailureとno new evidenceが残ることをrunnerが確認して`stop_no_progress`を評価する。

### Risk 12: Windows resumeでwriteできない

対策: `workspace-write`指定の有無ではなくactual fixture writeをinitial / resumed turnでsmoke probeする。失敗時はBLOCKEDとし、安全境界を緩めない。

### Risk 13: Repositoryの通常Git lifecycleが評価結果を汚す

対策: promptでGit mutationを禁止し、Targetにremoteを設定せず、HEAD / refs / stage-local diffを確認する。試行そのものの完全検出は要件にしない。

### Risk 14: PR5でPR6へ残したactual execution整合を落とす

対策: repairではchanged files / validation / remaining delta / decision、Nativeではfirst anomaly / gate / stopと実command resultを確認する。

### Risk 15: Native環境がないため未実行をPASSにする

対策: capability preflightと`not_executed`をresult contractへ持つ。Build / Install等を強制して回避しない。

### Risk 16: dependency不足をQA capability不足と誤分類する

対策: Case Bのdependency preparationとpatched runtime sanityをEvaluator側preflightで完了させる。dependency準備失敗はCase B Runtime setup failureとして記録し、Finding未検出と混同しない。

### Risk 17: model非決定性をretryで隠す

対策: canonical runはturnごとに1回。再試行で結果選別しない。必要な再実行は別Runとして履歴を保持する。

### Risk 18: temporary workspaceへlocal untracked file / secretを混入する

対策: source revisionのtracked contentからsanitized Targetを作る。Evaluator checkoutのfilesystem copyをそのまま使わない。

### Risk 19: trust対応を過剰実装する

対策: Skill loadとproject-local config / hooks / exec policyを分けて扱う。PR6の必須制御はrunner側で固定し、独自trust managerや永続trust設定変更を追加しない。

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

1. latest `main`を取り込み、PR6の前提が変わっていないか。
2. installed Codexで`exec resume`、resumed OTel、`--output-schema`、initial / resumed actual writeが成立するか。不成立なら独自runtimeやsandbox迂回を作らずBLOCKEDとする。
3. 既存Trigger / Deterministic / Semantic Eval、Agentic QA preparation / isolationで既に評価・準備できるものを重複実装していないか。
4. handoff caseは同一`thread_id`、Artifact reuseはfresh sessionという境界を崩していないか。
5. `.agents/skills/*/evals/**`、`training/agentic-qa/instructor/**`、過去Run / Plan、PR6 answer keyがTargetへ露出していないか。
6. `multiple_skills`をdiagnosticからFAILへ再分類していないか。
7. repair decisionを自然文で推測せず、structured outputとrunner実観測を照合しているか。
8. Case Bはdeterministic defect、Case C / Dはactionable repair entryから開始しているか。
9. stageごとのsandboxが必要writeと禁止writeに一致しているか。read-onlyを安全そうという理由だけで広げていないか。
10. fixed 5 caseで足りるか。任意Workflow DSLや追加caseを作らない。
11. capability不足を`not_executed` / BLOCKEDとして保持し、PASSや実行済みへ読み替えていないか。
12. Skill semanticsやProduct behaviorをPR6都合で変更していないか。
13. live model runをCI required gateへ入れようとしていないか。
14. 新しいAgent Runtime / Session Manager / Workflow Engine / trust managerが必要に見える場合は実装せずIssue #117の非目標へ戻る。

## 11. 備考

- Issue #117のPR6は「Workflowを自動運転する仕組み」を作るフェーズではなく、既存Skill / Harnessの実利用境界を評価するフェーズである。
- 実装で問題が見つかった場合も、PR6内でSkill意味契約を修正することを自動的な完了条件にしない。E2E Findingとして記録し、必要なら別修正へ切り出す。
- PR6完了後、Issue #117の全体完了条件を既存PR1〜PR5と合わせて最終確認してからIssue closeを判断する。
