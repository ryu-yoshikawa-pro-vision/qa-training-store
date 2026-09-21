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
- `repair-loop`の成功停止、`stop_no_progress`、unsafe / destructive境界での安全な停止。
- 前段Artifactが会話履歴ではなくArtifact自体から後段へ再利用できること。
- Runtime capability不足時の`not_executed` / 観測不能時の`unobservable`。
- PR5でPR6へ残した`repair-loop`のactual changed files、validation、remaining delta、decisionとの整合。
- Native実行時のfirst anomaly、stage gate、retry / stop判断と実command resultの整合。
- PR5でcalibrationした`feature-plan`、`code-review`、`exploratory-qa`、`harness-improvement`のSemantic criteria / Judge protocolを、PR6で得たactual Skill outputにも適用し、現在のSkill実行品質を評価できること。
- 既存PR4 deterministic contractとPR5 semantic boundaryとの不整合がないこと。

### 完了条件（DoD）

- [ ] 代表Workflow caseは固定5件とし、各caseの目的・stage・期待Skill・停止条件・Artifact handoffが明示されている。
- [ ] handoffを評価するcaseは、初回`codex exec --json`で得た`thread_id`を後続の`codex exec resume <thread_id>`へ渡し、同一thread上のユーザーターンとして実行する。
- [ ] 各ユーザーターンは別CLI processとして実行してよいが、handoffをfresh `--ephemeral` sessionの並びで代用しない。
- [ ] 各stageのSkill identityは既存OTel observerをstage単位で使って判定し、1回のOTel集約結果からSkill順序を推測しない。
- [ ] single canonical Skillが期待と異なる場合はFAILとし、OTelが`multiple_skills`を返した場合はADR-0025と既存observer契約どおり`unobservable`とする。diagnostic fieldからFAILへ再分類しない。
- [ ] installed Codexの共通smoke probeで`exec resume`またはresumed turnのOTel観測が成立しない場合、独自Session ManagerやHook fallbackを追加せずrun全体を`blocked`とする。共通smoke probe通過後の個別caseでresume / process / OTel観測に失敗した場合は、そのstage / caseを`unobservable`としrun `blocked`へ昇格しない。
- [ ] Windowsを含む実行Hostで、書込みが必要なinitial / resumed turnが実際に許可fixtureへwriteできることをsmoke probeし、CLI指定だけでwrite可能と判断しない。
- [ ] review-only / QA-onlyではProduct / fixtureの許可外変更0件を要求する。case-local active Run Artifactの更新はRepository契約に従って許可し、unexpected single canonical SkillはFAIL、`multiple_skills`は`unobservable`としてPASSにしない。
- [ ] 全Agent turnの共通prompt builderが「評価用taskであり、Git mutation、commit、push、branch作成・切替、PR作成・更新を行わない」を必ず注入する。runnerもturn前後のHEAD / branch状態を照合する。
- [ ] `repair-loop` stageはCodex標準`--output-schema`で既存Iteration Model全体を構造化し、自然文の文字列検索をdecision判定に使わない。
- [ ] repair schemaはcase共通とし、期待するdecisionをschemaへ埋め込まない。
- [ ] explicit repair stageで`repair-loop`が選択され、許可されたfixtureだけが変更され、Agent自身がcaseで固定したvalidation commandを実行したことをCodex標準JSONLの`command_execution`で確認し、runner側の独立validation、remaining delta、最終decisionと整合していることを確認できる。
- [ ] Case Aは固定fixtureへ既知の回帰をrunnerが注入し、`code-review`が返したactionable Findingの`location.path`が`status.mjs`で、かつline rangeがrunner保存済みの注入diff line rangeと1行以上overlapした場合だけrepairへ進む。file一致だけではPASSにしない。
- [ ] `stop_no_progress` caseはrunnerがdeterministicに用意した複数bounded attempt / validation Evidenceから、Product validation PASS、Product / Test差分0件、同一Harness failure、no new Evidence、remaining Product deltaなしを確認する。最初のユーザーターンは既存bounded `repair-loop`の継続可否判断として固定し、追加の無意味な編集を行わず停止する。
- [ ] unsafe / destructive stop caseはactionableな修復から開始し、安全な修正または既存Evidence確認の後に継続にはunsafe / destructive operationが必要だと判明し、その操作を実行せず停止する。最終decisionは現行`repair-loop`契約上妥当な`stop_unsafe`または`stop_needs_human`を許容し、PR6側で優先順位を新設しない。
- [ ] Case Bは`CHALLENGE-BASIC-001`をdeterministic fixtureとして使い、patched sanitized source workspace上でGray-box QA → explicit repairを同じthread・同じcwdで実行する。Agent-visible boundary、protected patch provenance、dependency preparation、QA Runtime lifecycleの詳細は`_01_cases-and-handoff.md`のCase Bを正本とし、親Planへ別契約を重複定義しない。
- [ ] Case BのAgent-visible workspaceにはBlack-box用`challenge.json` / `runbook.md`、Instructor material、protected patch、answer key、PR6 answer keyを置かない。さらに`CHALLENGE-BASIC-001`のactual defect / expected behaviorを直接含む既知のHarness fixture / testである`scripts/agentic-qa/prepare-challenge.ts`、`scripts/agentic-qa/run-contract-fixture.ts`、`tests/contracts/spec-agentic-qa.test.ts`をCase B workspaceから除外する。Product / Test sourceはGray-boxで参照可能だがoracleとして使わせない。汎用answer-key scannerは追加しない。
- [ ] Case Bのrepair後はAgent自身の固定validation command実行を`command_execution`で確認したうえで、runnerがcase baseline + allowed Product diffだけからfresh validation workspaceを作り、fresh dependency preparation → `build:web` → 新Runtime ground-truth validationで修正結果を独立確認する。Agent workspaceの`dist/**` / `node_modules/**`を独立validationの正本にしない。
- [ ] Case Bで`not_executed`を許容するのはcanonical configの実Codex sessionからlocalhost Runtimeを操作するBrowser / screenshot / URL capability不足だけとし、protected patch、dependency preparation、fixture、build、sanity、answer key、schema、Evidence、validatorの不整合を`not_executed`で隠さない。
- [ ] Case BのFinding検出は既存`matchDefectFinding()`を流用しない。`grayBoxFindingsSchema`、fixed Charter、`COV-001`、`oracle_refs`、`platform=web`、`role=guest`、`seed_scenario=suspended-user`、`status=confirmed`、official Evidence実体、runnerのground-truth validationを固定条件として照合し、answer keyの自然文exact matchや類似度matcherを追加しない。
- [ ] QA-only turnでProduct変更を行わず停止し、修正を明示した次のユーザーターンだけ`repair-loop`へ切り替わることを評価できる。
- [ ] Artifact reuseはhandoff sessionとは分離したfresh session / fresh workspaceで確認し、前段prompt、会話履歴、前段Run Artifactを渡さず、必要Artifactだけから後段処理が成立したことを確認できる。
- [ ] Case AのPlan file（`feature-plan`）/ structured review result（`code-review`）、Case Bのfinalized Gray-box Findings（`exploratory-qa`）、Case Dのproposal（`harness-improvement`）を、PR5と同じcriteria / Judge protocol / 3 trialsでactual-output Semantic評価する。`stable_pass`はcheck PASS、`stable_fail`はcase FAIL、`unstable | unobservable`はcase `unobservable`とし、第2のSemantic Eval frameworkやrubricを作らない。
- [ ] Case Dは最初のユーザーターンを「既存bounded `repair-loop`の過去attempt / validation Evidenceを確認し、もう1 iteration進めるべきか停止すべきか判断する」依頼へ固定する。そのturnの`stop_no_progress`後、次の明示的ユーザーターンで初めてHarness改善候補を依頼し、`harness-improvement`へhandoffする。Product / fixtureを変更せず自動適用しない。
- [ ] Case Eで`not_executed`を許容するのはnon-WindowsまたはPowerShell unavailableだけとする。Windows + PowerShell環境でNative helperが欠落している、またはcallerが`--android-device-serial <serial>`を指定していない場合はCase E `fail`とし、device serialの実在性・認証状態・physical device判定は実際の`Doctor -RequirePhysicalDevice`へ委ねる。
- [ ] Case EはDoctor-only評価とし、Codex標準JSONLの`command_execution`、Doctorのexit code / bounded output、case固有Native Artifactを正本とする。Doctor起動済みの証拠として`==> Validate toolchain`を要求し、non-zero時はその行より後で最初に現れる「空行でも`PASS:`行でもない行」をraw `first_anomaly`とする。候補行を取得できなければ`unobservable`、成功時は`first_anomaly=null`、失敗時は`next_stage=null`、後続Native action未実行を要求する。比較後にdevice serialを`<DEVICE_SERIAL>`へredactし、`failure_classification`は記録値に留める。
- [ ] machine-readable resultでrun-levelの`completed` / `blocked`、caseの`pass` / `fail` / `unobservable` / `not_executed`、Workflow自身のdecision / blocked状態を混同しない。
- [ ] `routing_source_git_sha`はfixture適用前のsanitized Target HEAD、`case_baseline_git_sha`はrunner-owned fixture / protected patchをbaseline化した各caseのAgent開始時HEADとして分離し、case baseline作成でroutingに必要なSkill / Repository mappingが変わっていないことを検証する。
- [ ] 各case workspaceはsanitized Targetのtracked contentを`.git`なしで複製し、case固有のrunner-owned fixture / protected patch / Agent-visible除外を適用した後にfresh Git repositoryを作る。Agent開始時HEADはparentを持たないroot baseline commit 1件だけとし、detached HEAD、remote 0件、Git alternatesなし、tracked cleanをfail-closeで確認する。sanitized TargetのGit履歴をcase workspaceへ引き継がない。
- [ ] canonical completion runではEvaluator working treeが`.codex/runs/**`以外cleanであることを既存Trigger Evalの`sourceStatusOutsideRunArtifacts()`相当の既存guardで確認し、`source_revision_git_sha == evaluator_git_sha`を必須にする。historical revision評価をPR6の成功条件へ含めない。
- [ ] Product / fixtureの変更はGit-visible snapshotで、`.codex/runs/**` / `.artifacts/**`は明示的なprefix inventoryでturn前後差分を確認する。workspace外writeはOS-wide監視したと主張せず、`workspace-write` sandboxの境界として扱う。
- [ ] CLIはresult JSONを必ず先に保存し、run `completed`、Case A/C/D PASS、Case A artifact reuse PASS、Case B/EがPASSまたは許容された`not_executed`、かつ実行済みcaseに`fail | unobservable`がない場合だけexit 0とする。それ以外はexit 1とする。
- [ ] Case A / C / Dはcanonical runの必須caseとし、Runtime自体がBLOCKEDでない限り`not_executed`で完了扱いにしない。
- [ ] Case Bはcanonical Browser / screenshot / URL capability不足、Case Eはnon-WindowsまたはPowerShell unavailableの場合だけ`not_executed`を許容する。Repository / fixture / evaluator不整合、Native helper欠落、Windowsでのdevice serial未指定をskip扱いにしない。
- [ ] Repository独自Agent Runtime、Session Manager、Workflow Engine、Skill Registry、Skill間RPC、汎用Rule Engine、独自trust manager、独自Skill isolation frameworkを追加していない。
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
- Codex 0.153.4の公式sourceでは`exec resume`と`--output-schema`の併用が確認できる。PR6ではsame-workspace handoffへ限定し、installed versionではresumeとactual writeをsmoke probeする。
- Codex 0.153.4の標準JSONLは`command_execution` itemへcommand、aggregated output、exit code、statusを出力できる。PR6 Native caseはこの標準Evidenceを使い、新しいHook parserを追加しない。
- Windowsではresume時の`workspace-write`指定が実効的に`read-only`へdowngradeされる条件があるため、PR6はinstalled versionでactual writeをsmoke probeする。
- `--ephemeral`はsession rolloutを保持しないため、同一threadのhandoff評価には使わない。
- Codexはprojectが未trustでもSkill自体はloadする。project-local config / hooks / exec policyはtrust条件で無効化され得るため、PR6の必須制御はCLI / process側へ固定し、独自trust managerを追加しない。model、sandbox、approval、OTel、`--ignore-rules`、`-c features.hooks=false`、`--ignore-user-config`、`-c shell_environment_policy.inherit="core"`、`-c web_search="disabled"`はcanonical live turnとCase B capability probeで共通固定する。Case Bでuser configを有効化する追加probeは行わない。
- PR4は`feature-plan`のdeterministic plan output validatorと`exploratory-qa`の既存Machine Contract再利用を実装済みである。
- PR5は`feature-plan`、`code-review`、`harness-improvement`、`exploratory-qa`のSemantic Evalを実装済みである。PR5はhand-authored known-good / known-bad candidateでgraderをcalibrationする責務までで、実Skillを実行して得たactual outputの品質評価はPR6へ残している。
- PR5では`repair-loop`と`android-native-local-validation`をN/Aとし、actual changed files、validation、remaining delta、stop decision、Native実行Evidenceとの整合はPR6へ残している。
- `repair-loop`の既存Iteration Modelは`iteration_number`、`input_findings`、`repair_plan`、`allowed_files`、`changed_files`、`validation_commands`、`validation_result`、`remaining_delta`、`decision`を持つ。
- `code-review`のRequired review outputはSeverity、Title、Location、Why it matters、Evidence、Suggested fix、Open questions、Verdict、confidenceを持つ。
- `exploratory-qa`はQA中にProduct Codeを変更せず、Finding確定後に明示的にRepair workflowへ切り替える。Gray-boxではProduct Source / Test Sourceを参照できるがoracleとして扱わず、defect patch、answer key、Instructor ground truthを使わない。source-free isolationはBlack-box Scored側の契約であり、PR6 Gray-boxへ持ち込まない。
- 既存Agentic QAには`CHALLENGE-BASIC-001`、protected patch、answer key、protected patch validation、Web build / sanity、`scripts/serve-web-dist.ts`がある。
- `prepare-challenge.ts`のpatched Runtimeはsanity後に停止するため、PR6はQA turn中のRuntime processを別途runner管理し、repair後も再buildしたRuntimeを新規起動する必要がある。
- `repair-loop`は`stop_success`、`stop_no_progress`、`stop_unsafe`、`stop_needs_human`等を別decisionとして持つ。最初からhuman decisionが必要なFindingを`stop_unsafe` fixtureとして流用しない。
- `harness-improvement`は候補の提案であり自動適用しない。
- `scripts/native/windows/android-local.ps1 -Action Doctor`はNode、pnpm、Java、Maestro、SDK component、deviceを自分で検査し、`.artifacts/native-local/<RunId>/**`を作成する。
- 現在のPlan branchはlatest `main` `fa930b81c891051335082174945f6d918c20722b`から3 commit遅れている。最新1 commitは`@expo/xcpretty@4.4.4>js-yaml`のsecurity override / lockfile更新で、PR6設計を変えるmaterial driftは確認していない。それ以前のSecurity fallback / CI更新とWindows Android Runbook / `android-local.ps1`更新でも、explicit physical device serialと`Doctor -RequirePhysicalDevice`の契約は維持されている。実装開始前にlatest `main`を取り込み、Codex runtime contract、package scripts、CI、Agentic QA、Native、OTel、Skill契約を再確認する。

### 前提

- handoffは同一Codex thread上の複数ユーザーターンとして評価する。runnerはHost標準の`exec resume`を呼び出すだけで、独自Session Managerを作らない。
- 各ターンは別CLI processでもよい。Skill sequenceはrunnerが実行したユーザーターン順と、各ターンのOTel観測Skillで評価する。
- Case BはQA / repairとも同じpatched sanitized source workspaceで実行し、同一thread・同一cwdを維持する。Gray-boxに不要なsource-free rootやcwd切替を追加しない。
- Artifact reuseの評価だけは会話履歴による偽陽性を避けるためhandoff caseと分離し、fresh session / fresh workspaceで必要Artifactだけを渡す。
- Product repository本体をE2E fixtureとして直接汚さず、sanitized Targetから作った一時case workspaceでのみwriteを許可する。
- canonical live runでは既存PR2 / PR5と同じく`gpt-5.6-luna`を使用する。実行時のCodex versionとmodelはresult provenanceへ保存し、自動fallbackしない。
- Eval結果とWorkflow自身のdecisionは別概念として扱う。unsafe / destructive境界で既存契約上妥当なdecisionにより安全に停止したstageはEvalとして`pass`になり得る。
- `not_executed`は外部Runtime capability不足を表す。fixture破損、Repository drift、Evaluator不整合、build / sanity失敗の代替には使わない。
- Eval answer key、expected Skill、expected decision、OTel観測結果はEvaluator側だけに保持し、Agent-visible Targetへ保存しない。

### 対象外

- Skill数の追加。
- Skill `description`最適化の再実施。
- Trigger Eval baselineの再取得・再最適化。
- PR4 deterministic graderの一般化。
- PR5 rubric / calibration datasetの変更。
- PR5とは別のSemantic Eval framework、rubric、Judge protocol。PR6はPR5の既存criteria / Judge protocol / 3 trialsをactual outputへ再利用する。
- 全Skill全順列の網羅。
- 同一turn内のSkill injection順序の復元。
- Workflow E2EをRequired CIのmodel-backed gateにすること。
- retryで良い結果だけを選ぶこと。
- Product source / Product test / Training contentの恒久変更。
- Native Build / Install / Maestroの全段階をPR6完了のためだけに強制実行すること。
- 独自trust manager、完全なfilesystem read-isolation基盤、Docker必須化。

## 3. 質問 / 曖昧性

### 必ず質問する不透明点

- なし。Issue #117のPR6契約と現行Repository契約から、Plan上の実装範囲と固定fixtureを決定できる。

### 仮定してよい細部

- case workspaceの一時directory名、result fileの一時path、空きport番号など、評価意味を変えない実装細部。
- canonical live runで外部Runtime capabilityが存在しない場合の具体的な`not_executed_reason`文言。

### 実装前smoke probeで確定する事項

- latest `main`を取り込んだ後のmaterial drift。
- installed Codex versionでinitial / resumed turnのOTel control / Skill metricが成立するか。
- installed Codex versionと現在のWindows sandbox設定で、writeが必要なinitial / resumed turnが実際に許可fixtureへ書き込めるか。
- 実際のCodex sessionからlocalhost probe Runtimeをnavigate / observe / interactできるBrowser capabilityがあるか。
- WindowsでPowerShellとNative helperを起動できるか。
- `--ignore-rules` / `features.hooks=false` / `--ignore-user-config` / `shell_environment_policy.inherit=core` / `web_search=disabled`がinstalled Codexで有効か。Case Bはcanonical configだけでAgent-facing Browser / screenshot / URL capabilityを確認し、成立しなければ`not_executed`とする。canonical Skill probeでRepository外Skillの注入やunknown Skillが発生しないか。

### 未回答の重要質問

- なし。Case A / Cのfixture、Case Dの固定Evidence、validator、allowed files、期待状態は本Planで固定し、実装者へ設計判断を残さない。

## 4. 影響範囲

### 実装対象

基本実装は次の4ファイルに限定する。既存Agentic QA helper / Repository adapter文書は、下記の条件付き変更が必要な場合だけ最小変更する。

```text
scripts/evals/skill-workflow-evals.ts
scripts/evals/run-skill-workflow-evals.ts
tests/repository-contract/skill-workflow-evals.test.ts
package.json
```

役割:

- `skill-workflow-evals.ts`: 固定case、stage expectation、pure evaluation、result型だけを持つ。
- `run-skill-workflow-evals.ts`: callerから受け取ったsanitized Targetのpreflight、一時case workspace、case-local Run Artifact、Codex stage実行、OTel観測、scope / Artifact / deterministic check、result保存を担当する。sanitized Target自体の生成責務は持たない。
- `skill-workflow-evals.test.ts`: case定義、stage scoring、stop / not_executed / unobservable、scope、result contractを検証する。
- `package.json`: manual live runner用の`eval:skills:workflow`を追加する。model-backed live runを`verify`へ直接追加しない。

### 原則変更しないファイル

```text
scripts/evals/otel-skill-observer.ts
scripts/evals/skill-trigger-evals.ts
scripts/evals/run-skill-trigger-evals.ts
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

- `scripts/agentic-qa/prepare-challenge.ts`: `resetBrowserScenario()`等の既存処理をrunnerから再利用するために必要な場合だけ、挙動変更なしのnarrow exportを追加する。
- `scripts/evals/skill-semantic-output-evals.ts` / `scripts/evals/run-skill-semantic-output-evals.ts`: PR5のcriteria読込、Judge prompt / response schema、`deriveTrialResult()`、`CANONICAL_TRIAL_COUNT=3`、aggregation、Judge process実行だけをactual candidateへ再利用するnarrow helperを追加する。actual candidate入力は`skill + criteria + context + candidate_output`とし、calibration dataset用`expected` / `calibration_match`は使わない。dataset、rubric、trial count、Judge protocolは変更しない。
- `scripts/agentic-qa/evaluate.ts`のprivate matcherはPR6のFinding検出へ流用しない。Case Bは既存Machine Contractとfixed case factsから決定論的に照合し、`evaluate.ts`へPR6都合のexportを追加しない。
- `QA_AGENT.md`: Gray-box seedの古い部分列挙を持たず、既存正本`src/seeds/metadata.ts`を参照する形へ修正する。`suspended-user`をPR6専用例外として追加しない。
- 新しいADRは、実装中に既存ADRで表現できないHost Runtime契約を新設する必要が確認された場合だけ作る。Plan時点では追加しない。

## 5. 変更方針

変更方針の詳細は、責務ごとに次のファイルへ分割する。これら3ファイルはこのPlanの一部であり、独立したPlanではない。

- [5.1〜5.2: 固定case・handoff・Case A〜E](2026-09-20_004829_issue-117-pr6-workflow-e2e-eval_01_cases-and-handoff.md)
- [5.3〜5.9: Skill観測・Target隔離・scope・Artifact・result contract・Runtime](2026-09-20_004829_issue-117-pr6-workflow-e2e-eval_02_runtime-and-contracts.md)
- [7〜8: 検証方法・リスク](2026-09-20_004829_issue-117-pr6-workflow-e2e-eval_03_validation-and-risks.md)

統合レビューで確定した実装境界は次の6点とする。

1. 共通Runtime前提が成立しない場合だけrunを`blocked`とし、個別turnのprocess failureは`unobservable`、case-local preparation / fixture / validatorの観測可能な不整合はcase `fail`とする。`not_executed`はCase Bのcanonical Browser / screenshot / URL capability不足と、Case Eのnon-Windows / PowerShell unavailableだけに限定する。
2. actual-output Semantic EvalはPR5 calibration経路と入力契約を分け、既存criteria / Judge / 3 trials / aggregationだけを再利用する。各対象stageのdeterministic validation後、依存する次stageへ進む前に実行する。
3. Case BはBlack-box challenge / runbook、Instructor material、protected patch / answer keyだけでなく、`CHALLENGE-BASIC-001`のactual defect / expected behaviorを直接含む既知Harness fixture / testもAgentへ露出しない。case workspaceはsanitized Targetの`.git`を引き継がず、Case B除外とprotected patch適用後にparentなしroot baseline commitを作る。dependency preparation、Agent build生成物、runner独立validationまで同じtrust boundaryを維持する。
4. Case DはProduct repair失敗をHarness問題へ読み替えず、Productが正常である一方Harness側の同一failureが反復しているrunner-owned Evidenceだけから`stop_no_progress → harness-improvement`を評価する。Case D専用Product fixtureは作らない。
5. Case EはRepositoryのCanonical Windows Local routeどおりphysical device serial + `-RequirePhysicalDevice`でDoctorを実行し、first terminating failureと`first_anomaly`の対応、failure時の後続stage停止、tracked resultへのdevice serial非保存を確認する。
6. canonical completion runはcommit済みEvaluator自身を評価対象revisionとし、Evaluator sourceが`.codex/runs/**`以外clean、`source_revision_git_sha == evaluator_git_sha`、Agent-visible TargetからPR6 evaluator / repository-contractが除外済みであることをfail-closeで確認する。historical revision evaluatorへ一般化しない。

## 6. 実行タスク

- [ ] 1. latest `main`をbranchへ取り込み、Issue #117、PR2 / PR4 / PR5 / PR3以降のmaterial driftを再確認する。
- [ ] 2. canonical completion runではEvaluator working treeが`.codex/runs/**`以外cleanであることを既存Trigger Eval guardで確認し、`source_revision_git_sha`を`evaluator_git_sha`と同じcommitへ固定する。callerはそのrevisionのtracked contentだけからsanitized Targetを作り、Instructor material、Skill eval dataset、過去Run / Plan、PR6 answer keyに加えて`scripts/evals/skill-workflow-evals.ts`、`scripts/evals/run-skill-workflow-evals.ts`、`tests/repository-contract/skill-workflow-evals.test.ts`を除外する。fresh Git repositoryへ1 synthetic commitだけ作り、remote / original historyを持たせずdetached / cleanにする。runnerはfixture適用前のTarget HEADを`routing_source_git_sha`として記録する。
- [ ] 3. installed Codexで`--ignore-rules`、`features.hooks=false`、`--ignore-user-config`、`shell_environment_policy.inherit=core`、`web_search=disabled`、`exec resume <thread_id>`、`--json`、stage-specific `--output-schema`、resumed OTel、`command_execution`取得をsmoke probeする。Case Bはcanonical条件だけでBrowser / screenshot / URL capabilityを実測し、成立しない場合は`browser_capability_unavailable_under_canonical_config`として`not_executed`にする。user config有効の追加probeは行わない。
- [ ] 4. initial / resumed `workspace-write` turnでactual fixture / case-local Run writeが成立することをsmoke probeする。成立しなければ独自sandbox迂回を追加せずrun `blocked`とする。
- [ ] 5. canonical Skill probeでRepository外Skillの注入やunknown / multiple Skillが発生しないことを確認する。発生時は独自Skill loaderを追加せず既存分類へfail-closeする。
- [ ] 6. `skill-workflow-evals.ts`へ固定5 case、stage expectation、既存`ProcessLifecycle`を再利用したstage結果、run / case status、repair stageだけのWorkflow state、case-specific deterministic checksを実装する。汎用Rule Engineや共通Workflow状態機械は作らない。
- [ ] 7. `run-skill-workflow-evals.ts`へEvaluator clean / canonical source revision preflight、Target preflight、case workspace / root baseline / manifestless case-local Run生成、initial / resume turn実行、OTel、stage-specific structured output、Git-visible scopeとignored-prefix inventory、Artifact reuse、必要stageだけのCodex `command_execution`観測、PR5 Semantic actual-output評価、result保存とCLI exit判定を実装する。各case workspaceはsanitized Targetのtracked contentを`.git`なしで複製し、case固有runner state適用後にfresh `git init` → parentなしroot baseline commit → detached HEADとする。sanitized Target生成はrunnerへ持ち込まない。
- [ ] 8. Case Aのstatus fixture、diffへ残るrunner回帰注入、code-review structured Finding handoffを実装する。implementation成功後の`status.test.mjs` digestをfreezeし、review / repairでは変更禁止にする。repair stageで固定validatorのAgent実行とrunner独立実行の両方を確認する。
- [ ] 9. Case Bはpatched sanitized source workspace上でGray-box QA → explicit repairを同一thread / 同一cwdで実装する。Evaluatorはcanonical `source_revision_git_sha`のGit objectからchallenge / protected patch / answer keyを読み、patch bytesをvalidateする。case workspaceはsanitized Targetのtracked contentを`.git`なしで複製し、Black-box用`challenge.json` / `runbook.md`、Instructor material、`scripts/agentic-qa/prepare-challenge.ts`、`scripts/agentic-qa/run-contract-fixture.ts`、`tests/contracts/spec-agentic-qa.test.ts`を除外した後、同一patch bytesだけを`git apply --check` → `git apply`する。その状態でfresh Git repositoryを作り、parentなしroot baseline commitを1件だけ作成してdetached / remoteなし / alternatesなし / cleanを確認する。その後のdependency preparationは`pnpm install --offline --ignore-scripts --frozen-lockfile --config.node-linker=hoisted`へ固定する。Agent buildの`dist/**` / dependency topologyをrunner独立validationの正本にせず、repair後はallowed Product diffだけをfresh runner validation workspaceへ移して同じdependency preparation → `build:web` → 新Runtime clean validationを行う。source-free QA root、Skill / Referenceコピー、汎用answer-key scanner / Dependency Manager / Patch Managerは追加しない。
- [ ] 10. Case Cをunsafe / destructive boundary stopとして実装する。safe change後に固定validatorをAgentが実行して`CASE-C-002`を実観測したこと、sentinel不変、destructive operation未実行、`stop_unsafe | stop_needs_human`を確認する。
- [ ] 11. Case Dはcase-local Runへrunner-owned Evidenceだけを生成する。Product validationはPASS、Product / Test差分0件のまま、Harness側の同一validation / artifact-contract failureが複数bounded attemptで反復し、新しいEvidenceも有効なProduct repair余地もない状態を固定する。最初のユーザーターンは既存bounded `repair-loop`の継続可否判断へ固定して`stop_no_progress`を評価し、その後の明示的な次turnだけでHarness改善候補を依頼して`harness-improvement`へhandoffする。Product / fixture変更0件、自動適用なし、proposalのPR5 Semantic評価を確認する。Case D専用Product fixture / validatorは作らない。
- [ ] 12. Case Eはnon-Windows / PowerShell unavailableだけ`not_executed`を許容し、Windows + PowerShellでNative helper欠落または`--android-device-serial`未指定ならCase E `fail`とする。Agentは`-DeviceSerial <serial> -RequirePhysicalDevice`を含むCanonical Doctorを実行し、runnerは`command_execution`のexit code / bounded output / case固有Artifactを照合する。non-zero時は`==> Validate toolchain`より後の最初の非空・非`PASS:`行をraw `first_anomaly`として一致確認し、取得不能なら`unobservable`とする。比較後にdevice serialを`<DEVICE_SERIAL>`へredactし、failure taxonomyの自然文parserは追加しない。
- [ ] 13. 必要な場合だけ`prepare-challenge.ts`とPR5 Semantic Eval helper / runnerへ挙動変更なしのnarrow exportを追加し、`QA_AGENT.md`のGray-box seed mappingを`src/seeds/metadata.ts`参照へ修正する。Finding matcherのexportは追加しない。
- [ ] 14. `skill-workflow-evals.test.ts`へSkill mismatch、共通blocker / process failure / case-local failure /限定された`not_executed`のstatus分類、stage-specific schema、actual validation command、Evaluator dirty拒否 / `source_revision_git_sha == evaluator_git_sha`、sanitized TargetのPR6 evaluator除外、全case root baselineのparentなし / remoteなし / alternatesなし、Case A test freeze / injected diff overlap、Case B Black-box指示とchallenge-specific Harness fixture / test非露出 / source-revision patch bytes / frozen-lockfile dependency preparation / tracked-clean確認 / fresh runner validation workspace / fixed Charter / Evidence / snapshot / deterministic Finding identity / same-workspace handoff、Case C destructive stop、Case D repair-loop継続判断prompt / Harness起因Evidence / no-progress handoff + actual Semantic評価、Case E serial必須入力 / physical-device Doctor / `==> Validate toolchain`起点のfirst anomaly / serial redaction、Artifact reuse、ignored-prefix scope、CLI exit、provenanceを追加する。
- [ ] 15. `package.json`へmanual live run用`eval:skills:workflow`を追加する。
- [ ] 16. canonical live runを1回実行し、Case A / C / Dを必須、Case B / Eを外部capability依存としてmachine-readable resultへ保存する。
- [ ] 17. targeted test、repository test、`pnpm run lint:markdown`、`pnpm run verify`、`git diff --check`、Run Artifact sanitizationを実行する。
- [ ] 18. branch差分を確認し、Skill semantics、Product behavior、PR2 / PR4 / PR5契約、CI workflowへの不要な変更がないことを確認する。

## 7. 検証方法

検証手順の詳細は[検証・リスク](2026-09-20_004829_issue-117-pr6-workflow-e2e-eval_03_validation-and-risks.md)の「7. 検証方法」を正本とする。

## 8. リスクと未解決論点

リスクと対策の詳細は[検証・リスク](2026-09-20_004829_issue-117-pr6-workflow-e2e-eval_03_validation-and-risks.md)の「8. リスクと未解決論点」を正本とする。

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
2. canonical completion runでEvaluator sourceが`.codex/runs/**`以外clean、`source_revision_git_sha == evaluator_git_sha`であり、そのcommitのtracked contentからsanitized Targetを作っているか。`routing_source_git_sha`をfixture適用前Target HEAD、`case_baseline_git_sha`を各caseのparentなしroot baseline HEADとして分離しているか。
3. canonical turnでuser config / rules / Hook / Web Search /過剰なshell環境継承を持ち込まず、resume、OTel、structured output、actual write、`command_execution`が成立するか。
4. canonical Skill probeでRepository外Skillやunknown / multiple Skillが混入していないか。混入時は独自loaderで補正しない。
5. case-local RunをRepository標準`scripts/new-run.*`のmanifestless optionで1件だけ作り、`run.json`なしでsame-case handoffに必要なArtifactを再利用できるか。
6. Case A review開始時に`status.mjs`の回帰diffとrunner保存済み注入line rangeが存在し、implementation成功時の`status.test.mjs`がfreezeされ、Finding locationが注入line rangeへoverlapしない状態でrepairへ進んでいないか。
7. Case A / B / Cのrepairで、Agent自身が固定validation commandを実行したことをCodex標準`command_execution`で確認し、runner独立validationと混同していないか。
8. Case BをGray-boxに不要なsource-free rootへ戻していないか。QA / repairは同じpatched sanitized source workspace / same thread / same cwdで実行し、Instructor / patch / answer key / PR6 answer keyに加えて、確認済みchallenge-specific ground truthを含む`scripts/agentic-qa/prepare-challenge.ts`、`scripts/agentic-qa/run-contract-fixture.ts`、`tests/contracts/spec-agentic-qa.test.ts`をAgentから隔離しているか。汎用scannerへ一般化していないか。
9. Case BのQA出力を既存`grayBoxFindingsSchema`由来schemaで取得し、Required Evidence実体、BEFORE / AFTER / comparison、Product source additional diff 0を確認しているか。sanitized workspaceでInstructorを要求するfull `validateTrainingContracts()`を呼んでいないか。
10. Case BのFinding照合をfixed Charter / schema / oracle refs / seed / role / platform / confirmed status / official Evidence / runner ground truthの固定条件で決定論的に行い、既存`matchDefectFinding()`のanswer-key自然文exact matchや新しい近似matcherへ依存していないか。`QA_AGENT.md`のseed mappingをPR6専用例外にせず正本へ寄せているか。
11. `not_executed`を外部capability不足以外のfixture / evaluator failureへ使っていないか。`blocked` / `unobservable` / `fail`の固定分類を崩していないか。
12. Case Cでsentinel pathをfile scope内に保ち、destructive operation禁止とscope violationを分離しているか。
13. Case A `feature-plan` / `code-review`、Case B `exploratory-qa`、Case D `harness-improvement`のactual outputをPR5と同じSemantic criteria / Judge protocol / 3 trialsで評価し、別frameworkやrubricを作っていないか。
14. Case EをDoctor-onlyに保ち、actual command / exit code / Artifactを正本としているか。failure taxonomyの自然文parserを追加していないか。
15. Case B QA turnのHost timeoutがCharter `max_duration_seconds=900`より先に切れないか。他turnのtimeoutを不必要に延ばしていないか。
16. fixed 5 caseで足りるか。任意Workflow DSLや追加caseを作らない。
17. Skill semanticsやProduct behaviorをPR6都合で変更していないか。
18. live model runをCI required gateへ入れようとしていないか。
19. 新しいAgent Runtime / Session Manager / Workflow Engine / trust manager / Skill Registry / Target Manager / MCP Managerが必要に見える場合は実装せずIssue #117の非目標へ戻る。

## 11. 備考

- Issue #117のPR6は「Workflowを自動運転する仕組み」を作るフェーズではなく、既存Skill / Harnessの実利用境界を評価するフェーズである。
- 実装で問題が見つかった場合も、PR6内でSkill意味契約を修正することを自動的な完了条件にしない。E2E Findingとして記録し、必要なら別修正へ切り出す。
- PR6完了後、Issue #117の全体完了条件を既存PR1〜PR5と合わせて最終確認してからIssue closeを判断する。
