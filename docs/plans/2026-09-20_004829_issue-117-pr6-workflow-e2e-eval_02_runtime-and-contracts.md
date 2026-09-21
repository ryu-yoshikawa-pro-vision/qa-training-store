# Issue #117 PR6 Workflow E2E Eval 実装計画 — Runtime・contract

このファイルは[親Plan](2026-09-20_004829_issue-117-pr6-workflow-e2e-eval.md)の一部であり、独立したPlanではない。5.3〜5.9の詳細契約だけを保持する。

## 5. 変更方針

### 5.3 Skill観測

- 各Agent turnごとに新しい`createOtelSkillObserver()`を作る。
- handoff caseでもCLI processはturnごとに終了してよいが、同じ`thread_id`をresumeする。
- Expected Skillが1件の場合、single canonical Skill一致でPASS候補とする。
- Expected Skillが`null`の場合、trusted absenceだけをPASS候補とする。
- single canonical Skillが期待と異なる場合はFAIL。
- `multiple_skills`は既存observer / ADR-0025どおり`unobservable`とする。review-only / QA-onlyでもFAILへ再分類せず、そのturnをPASSにしない。
- `multiple_skills`のdiagnostic `skill_values`、`invoke_type`、`plugin_id`をscoringへ使わない。
- unknown Skill、malformed metric、collector error、timeout等でidentityを安全に確定できない場合も`unobservable`。Hookや`SKILL.md` readをOTel scoring fallbackにしない。
- OTel pointの並び順をhandoff順序として使用しない。
- implementation preflightで、初回turnだけでなく`exec resume`したturnでも既存observerのcontrol / Skill metricが観測できることをsmoke probeする。不成立ならlive handoff評価をBLOCKEDとする。

### 5.4 Targetとanswer-key isolation

Evaluator rootとRouting / Workflow Targetを分離する。PR6 runner自身はTarget Managerを実装しないが、callerが迷わないよう生成手順を固定する。

sanitized Target生成手順:

1. 生成元の`source_revision_git_sha`を40桁SHAで確定する。
2. そのrevisionのtracked contentだけをGit objectからtemporary directoryへexportする。Evaluator checkoutのfilesystem copyやuntracked fileは入力にしない。
3. Agentへ不要な`.agents/skills/*/evals/**`、過去`.codex/runs/**`、過去`docs/plans/**`、`training/agentic-qa/instructor/**`、PR6 evaluator / repository-contract / answer keyを除外する。
4. export先でfresh Git repositoryを作り、個人情報を使わない固定local identityで1 synthetic commitだけ作る。original history / remoteは引き継がない。
5. HEADをdetachedにし、working tree clean、remote 0件を確認する。
6. runnerへ`--target-root`と`--source-revision-git-sha <40 lowercase hex>`を渡す。runnerはfixture適用前のsanitized Target `git rev-parse HEAD`を`routing_source_git_sha`として記録する。`target_git_sha`という重複fieldは作らない。
7. 各case workspaceでrunner-owned fixture / protected patchを適用し、Agent開始前状態をbaseline commitしたHEADを`case_baseline_git_sha`として記録する。case baseline commit作成前後で`.agents/skills/**`、`AGENTS.md`、Repository mapping等のrouting sourceが変わっていないことをhash / diffで確認する。

Targetはcanonical 6 Skill、`AGENTS.md`、Repository adapter、Product / Test source等の通常contextを保持する。Case B Gray-boxでもProduct / Test sourceを物理的に削除せず、oracleとして使わない契約を評価する。

runnerはTarget root、clean / detached、Evaluatorとのrealpath分離、required / forbidden path、remote absenceをfail-close preflightする。`source_revision_git_sha`はsanitized Target生成元、`routing_source_git_sha`はfixture適用前のsanitized Target HEAD、`case_baseline_git_sha`は各caseでAgentが実際に読むbaseline HEADであり意味を混同しない。provenance frameworkは追加しない。

Target外のEvaluator checkoutまでOSレベルでread-denyする独自sandboxは追加しない。Evaluator absolute path、answer key、expected値をprompt / environment / Agent-visible fileへ露出しない。Case Bのchallenge / protected patch / answer keyはEvaluator working treeではなく`source_revision_git_sha`のGit objectから読み、検証済みpatch bytesだけをcase workspaceへ適用する。Evaluator checkoutのProduct fileをcase workspaceへコピーしない。

各caseはsanitized Targetからfreshな一時case workspaceを作る。実Agent write、Git state、case-local Run Artifactはcase workspace内だけに閉じる。

canonical live invocationはmodel、sandbox、approval、OTel、`--ignore-rules`、`-c features.hooks=false`、`--ignore-user-config`、`-c shell_environment_policy.inherit="core"`、`-c web_search="disabled"`を全caseで固定する。Case Bのuser config有効probeは診断専用であり、canonical live turnには使わない。Repository外Skillが実際に注入された場合は既存OTel契約どおりunexpected single canonical SkillをFAIL、unknown / multipleを`unobservable`へfail-closeする。

### 5.5 変更範囲

stageごとにturn開始前snapshotを取得し、そのturnで増えた変更を判定する。case全体の元baselineとの差分だけで判定しない。Git-visibleなProduct / fixtureは`git status --porcelain`相当のtracked / untracked snapshotで判定する。一方、既存Working Tree Snapshotが除外する`.codex/runs/**` / `.artifacts/**`はturn前後にrepository-relative path、file type、size、content digestを明示的にinventoryし、case別allowlist prefixとの差分を判定する。

- Runner fixture setup: `workflow-e2e-fixtures/**`をtemporary case baselineへ生成してよい。これはAgent stage前のrunner-owned stateとし、生成後にbaseline commitする。
- case-local Run setup: Repository標準`scripts/new-run.ps1 -NoRunManifest` / `scripts/new-run.sh --no-run-manifest`で`.codex/runs/<case-run-id>/**`を1件作成してよい。`run.json`は生成しない。
- Plan turn: `docs/plans/**`とcase-local Runだけ変更可。
- Case A implementation: `status.mjs`、`status.test.mjs`、case-local Runだけ変更可。
- Case A review: Product / fixture変更0件。case-local Runだけ変更可。
- Case A repair: `status.mjs`とcase-local Runだけ変更可。implementation成功時の`status.test.mjs` digestはfreezeし、変更をFAILにする。
- Case B QA: Product / Test source変更0件。case-local Runとofficial QA Evidenceだけwrite可。SourceはGray-boxでread可能だがoracle利用を要求しない。Black-box用Challenge / runbookはAgent-visible workspaceへ置かない。
- Case B repair: protected patchが触れたProduct source pathとcase-local Runだけを修正対象とする。`dist/**`は固定`build:web`が生成する一時validation outputとして許容するがProduct `changed_files`には含めない。`node_modules/**`、package / lockfile、依存設定の変更はrepairとして許可しない。Evaluator answer key、protected patch file、Instructor materialをworkspaceへ持ち込まない。
- Case B runner validation: Agent workspaceの`dist/**` / `node_modules/**`を再利用せず、case baseline + allowed Product diffだけからfresh validation workspaceを作り、固定offline dependency preparation、`build:web`、新Runtime ground-truth validationを実行する。
- Case C repair: `config.json`、`protected-data/keep.txt`、case-local Runをfile scope内とする。ただし`keep.txt`の削除 / rename / move / 内容変更は禁止し、`validate.mjs`変更も禁止する。
- Case D repair / harness-improvement: Product / fixture変更0件。case-local Runだけ変更可。
- Case E: Product source変更0件。case-local Runと`.artifacts/native-local/<case-run-id>/**`だけwrite可。
- Artifact reuse probe: Case Aのfixture filesとfresh probe用Runだけ変更可。
- すべてのAgent turn promptへGit mutation禁止を共通注入し、turn前後のHEAD / detached状態 / branch refを比較する。commit、branch作成・切替、HEAD変更はFAILにする。
- すべてのturnで、workspace内の許可外Git-visible pathと、`.codex/runs/**` / `.artifacts/**`の許可外prefix追加・変更をFAILにする。case workspace外writeをrunnerがOS-wideに観測できるとは主張せず、`workspace-write` sandboxで防ぐ境界として扱う。
- Targetにはremoteを設定せず、外部Networkも有効化しない。Case Bのlocalhost Runtimeだけをcase内で利用する。
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

新しいresultはWorkflow E2Eに必要な項目だけを持ち、既存Evalの`ProcessLifecycle`を再利用する。

```text
schema_version
run_status: completed | blocked
provenance
  evaluator_git_sha
  source_revision_git_sha
  routing_source_git_sha
  codex_version
  model
  executed_at
cases[]
  id
  case_baseline_git_sha
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
    command_execution   # actual commandが評価対象のstageだけ
    semantic_evaluation # PR5 Semantic actual-output評価対象stageだけ
    workflow_state      # repair stage等、既存decisionを持つstageだけ
  artifact_reuse        # Case Aだけ
  reason                # 非PASS時だけ
```

`checks`は固定case定義に対応する既知check IDと結果だけを保存し、任意ruleを登録する仕組みにしない。`workflow_state`も既存repair Iteration等だけを保存し、全Skill共通decision schemaへ一般化しない。

status分類は次へ固定する。

| 条件 | 分類 |
|---|---|
| 共通Host preflight、共通resume、共通OTel、共通actual writeが成立せずcanonical run自体を安全に開始・継続できない | run `blocked` |
| Case B Browser capabilityがcanonical configで利用不可、Case E Windows / PowerShell / caller physical-device serial入力が利用不可 | case `not_executed` |
| 共通preflight通過後の個別turnで`turn_failed` / `timed_out` / `spawn_failed` / `signaled` / `unknown`、OTel identity、structured-output transportを安全に観測できない | stage / case `unobservable` |
| case-local preparation / fixture / validator / dependency preparationが実行できたが契約不一致、またはExpected Skill、Finding、scope、Evidence、decision、actual executionが観測可能な状態で不一致 | stage / case `fail` |

case-local `fail`ではそのcaseの後続stageを停止するが、runner / common Runtimeが健全なら後続の独立caseは継続する。case-local setup / Evaluator failureを`not_executed`やrun `blocked`へ曖昧に昇格させない。Case A / C / Dはrun共通blocker以外で`not_executed`にしない。

repair stageの共通`--output-schema`は既存Iteration Modelの意味を変えない最小projectionへ固定する。

```text
iterations: array<object>
  iteration_number: integer >= 1
  input_findings: string[]
  repair_plan: string
  allowed_files: string[]
  changed_files: string[]
  validation_commands: string[]
  validation_result: string
  remaining_delta: string[]
  decision: continue | stop_success | stop_no_progress | stop_scope_violation | stop_unsafe | stop_max_iterations | stop_needs_human
```

全fieldをrequiredとし、未知fieldを許可しない。`remaining_delta=[]`は残差なし、`changed_files=[]`は変更なしとして扱う。Case別の期待decisionはschemaへ埋め込まない。

- repair decisionは既存7値すべてをschema上許可し、Case A/C/Dの期待decisionをAgentへ教えない。
- schema不一致 / 不正JSON / 必須field欠落によりstructured resultを観測できない場合は自然文で補完せず`unobservable`。
- Case A / B / Cでは固定validation commandの終端`item.completed`に含まれる`command_execution`を確認し、caseごとの期待exit code / outputとstructured `validation_commands` / `validation_result`を照合する。Case Cの意図的non-zeroを`status=completed`へ正規化しない。runner独立validationは別Evidenceとして必須にする。
- code-review stageは`findings[]`の`severity/title/location/why_it_matters/evidence/suggested_fix/open_questions/verdict/confidence`と、`residual_risks[]` / `unvalidated_areas[]`を持つstage-specific strict schemaを使う。`location`は`path:string`、`line_start:integer|null`、`line_end:integer|null`とし、Case Aのactionable Findingではline rangeを必須にする。
- Native stageは`doctor_result: pass|fail`、`first_anomaly:string|null`、既存9値+`null`の`failure_classification`、既存後続stage+`null`の`next_stage`、`unexecuted_stages:string[]`を持つstrict schemaとする。Doctor command / exit code / bounded output / Artifactを正本とし、`failure_classification`は記録値であり、PR6専用の自然文taxonomy parserを作らない。
- 総合score、weight、severity、confidence集約は追加しない。

### 5.8 deterministic / semanticとの境界

- `feature-plan`生成物にはPR4の既存deterministic validatorを再利用する。
- PR5 Semantic Evalはcalibration dataset用APIをactual candidateへそのまま流用しない。actual-output用narrow helperは`skill + criteria + context + candidate_output`だけを受け取り、既存criteria読込、Judge prompt / response schema、Judge process、`deriveTrialResult()`、`CANONICAL_TRIAL_COUNT=3`、aggregationを再利用する。
- calibration datasetの`expected`、`calibration_match`、known-good / known-bad outcomeはactual-output評価へ渡さない。dataset、criteria、rubric、Judge protocol、trial countは変更しない。
- actual Semantic対象はCase A `feature-plan` Plan file、Case A `code-review` structured result、Case B finalized `exploratory-qa` Gray-box Findings、Case D `harness-improvement` proposalの4つに限定する。
- candidateは各actual Artifact / structured result / final assistant messageをUTF-8 textへ直列化して渡す。Case D proposalだけはCodex final assistant messageのtextを正本とし、取得不能時にrunnerが内容を推測再構成しない。
- Semantic evaluationは対象stageのdeterministic / schema / Evidence validationが通った直後、依存する次stageへ進む前に実行する。`stable_fail`または`unstable | unobservable`のstageから後続handoffしない。
- Judge contextは対象ごとに次へ固定する。
  - Case A `feature-plan`: 固定要求、fixture baseline facts、allowed scope、validation facts。
  - Case A `code-review`: actual injected diff text / line range、frozen test fact、runner validator failure。
  - Case B `exploratory-qa`: 固定Charter、`BR-AUTH-001` / `AC-AUTH-001`のNormative Spec本文、validated Coverage / screenshot / URL、runner-observed Runtime facts。
  - Case D `harness-improvement`: Product validation PASS、Product / Test差分0件、複数bounded attemptで反復したHarness artifact-contract failure、no new Evidence。
- expected Skill、expected decision、answer key、protected patch、正解Finding文言はJudge contextへ渡さない。
- 3 trialのaggregateが`stable_pass`ならSemantic check PASS、`stable_fail`ならcase FAIL、`unstable | unobservable`ならcase `unobservable`とする。
- Case Bは既存Agentic QAのschema / Coverage / Working Tree Snapshot / reset / ground-truth adapterだけを必要範囲で再利用する。Black-box Scoredのsource-free isolation、Challenge runbook、preparation lifecycle全体は再利用しない。
- Case B Finding identityは`grayBoxFindingsSchema`、fixed Charter / Coverage、oracle refs、role / seed / platform、confirmed status、official Evidence、runner ground truthの固定条件で決定論的に確認する。`matchDefectFinding()`のanswer-key自然文exact match、類似度matcher、LLM matcherは使わない。
- `repair-loop`はPR5がPR6へ残したchanged files、actual validation execution、remaining delta、decisionを共通Iteration schemaとCodex標準`command_execution`で確認する。
- `harness-improvement`はhandoff / no Product change / no auto-applyに加え、actual proposalを上記PR5 Semantic pathで評価する。
- NativeはPR5がPR6へ残したactual command / gate / stop整合をDoctor-onlyで確認し、failure taxonomyの意味解析を追加しない。
- actual-output評価のための第2framework、追加rubric、Skill別の別Judgeは作らない。

### 5.9 Runtime、sandbox、retry

- canonical modelは`gpt-5.6-luna`へ固定し、Codex versionと合わせてresultへ保存する。
- initial / resumed turnとも`--json`を使い、initial turnの`thread.started`から`thread_id`を取得する。
- canonical live turnではmodel、sandbox、approval、OTel、`--ignore-rules`、`-c features.hooks=false`、`--ignore-user-config`、`-c shell_environment_policy.inherit="core"`、`-c web_search="disabled"`を全caseで固定する。
- Case Bもcanonical live turnと同じ`--ignore-user-config`条件だけでBrowser capabilityをprobeする。user config有効の追加診断probeは行わない。Repository / user Hookをscoring fallbackやcompletion controlに使わない。
- repair stageでは共通Iteration `--output-schema`を使う。
- Case A review stageではcode-review Required review output用のstage-specific `--output-schema`を使う。
- Case B QA stageでは既存`grayBoxFindingsSchema`由来`--output-schema`を使う。
- Case E Native stageではDoctor-only structured output用のstage-specific `--output-schema`を使い、固定commandは`powershell -NoProfile -ExecutionPolicy Bypass -File scripts/native/windows/android-local.ps1 -Action Doctor -DeviceSerial <physical-device-serial> -RequirePhysicalDevice -RunId <case-run-id>`とする。raw serialは評価中だけ保持し、tracked resultでは`<DEVICE_SERIAL>`へ置換する。
- Plan / implementation / review / repair / QA / harness-improvement / Artifact reuse / Native Doctorは`workspace-write`を使い、stageごとのProduct / fixture許可pathとcase-local Run pathをscope checkする。
- review / QA / harness-improvementの停止境界はsandboxのread-only性ではなく、Product / fixture変更0件とSkill / output / handoff結果で評価する。
- approval policyは非対話実行の既存Harnessと同じく`never`へ固定する。
- 外部NetworkとWeb Searchは無効化し、Case Bのlocalhost Runtimeだけを利用する。
- temporary Targetをtrustさせる独自managerは作らない。
- Case Bのdependency preparation / initial build / Runtime processはEvaluator側で管理する。dependency preparationはcase workspaceとfresh runner validation workspaceの両方で`pnpm install --offline --ignore-scripts --config.node-linker=hoisted`へ固定し、platform別fallbackやEvaluator checkoutの`node_modules`共有を追加しない。AgentへInstallやserver lifecycleを任せない。
- Case B QA turnのHost process timeoutはCharter `max_duration_seconds=900`より先に終了しない固定値（900秒 + 小さな終了猶予）にする。他turnは既存Trigger Evalと同程度の有限timeoutを使う。
- `max_tool_actions=150`のためだけにBlack-box Runnerのaction counterを移植しない。既存Gray-box契約の入力値として保持し、PR6で新しいtool-count frameworkを作らない。
- canonical live runは各turn 1回だけ実行する。
- timeout / unobservableを消すための自動retryを追加しない。
- 同じcaseを良い結果が出るまで再実行して結果を選別しない。
- model/provider fallbackを追加しない。
- runnerはresult JSONをstatusに関係なく先に書き出す。その後、run `completed`、Case A/C/D PASS、Case A `artifact_reuse` PASS、Case B/EがPASSまたは許可された`not_executed`、実行済みcaseに`fail | unobservable`なしの場合だけprocess exit 0とし、それ以外はexit 1とする。`run_status=completed`だけではCLI成功にしない。
