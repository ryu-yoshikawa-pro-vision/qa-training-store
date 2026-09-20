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

Evaluator rootとRouting / Workflow Targetを分離する。

sanitized Targetの生成責務はPR6 runnerへ持たせない。既存Trigger Evalと同じくcallerが指定source revisionのtracked contentからRepository外へsanitized Targetを準備し、PR6 runnerは`--target-root`と必須の`--routing-source-git-sha <40 lowercase hex>`を受け取ってfail-close preflightする。

Targetは次を満たす。

- clean Git working tree。
- detached HEAD。
- Evaluator rootの外部。
- canonical 6 Skillと`AGENTS.md`等の通常Repository contextは存在する。
- `.agents/skills/*/evals/**`をAgent-visible Targetから除外する。
- `.codex/runs/**`、`docs/plans/**`の過去評価・PlanをAgent-visible Targetから除外する。
- `training/agentic-qa/instructor/**`をAgent-visible Targetから除外する。
- PR6 evaluator source、PR6 repository-contract、PR6 case-specific answer keyがTargetから見えない。
- expected Skill、expected decision、score、OTel observation等のPR6 answer keyをEvaluator側だけに保持する。
- answer keyを過去Git historyから取得できないsanitized Targetをcanonical runに使用する。

runnerはTarget root、clean / detached、Evaluatorとのrealpath分離、required / forbidden path、remote absenceをpreflightする。`routing_source_git_sha`はcallerから渡された元source revision、`target_git_sha`はsanitized Targetで`git rev-parse HEAD`したsynthetic revisionとして別々に記録する。両者を同一SHAと仮定しない。Target生成用の汎用Managerやprovenance frameworkは追加しない。

Case Bのsource-free QA rootはsanitized Targetからcase専用に作り、前述の固定allowlistだけをコピーする。routingを強制しないためcanonical 6 Skillすべてを残し、Product / Test source、Instructor material、protected patch、answer keyを除外する。

resultの`routing_source_git_sha`は元source revisionを指し、temporary repositoryやcase baselineのsynthetic HEAD SHAで置き換えない。

Target外のEvaluator checkoutまでOSレベルでread-denyする独自sandboxは追加しない。代わりにEvaluator absolute path、answer key、expected値をprompt / environment / Agent-visible fileへ露出しない。

各caseはsanitized Targetからfreshな一時case workspaceを作る。実Agent write、Git state、case-local Run Artifactはcase workspace内だけに閉じる。

canonical live invocationはmodel、sandbox、approval、OTel、`--ignore-rules`、`-c features.hooks=false`、`--ignore-user-config`を全caseで固定する。Case Bのuser config有効probeは診断専用であり、canonical live turnには使わない。Repository外Skillが実際に注入された場合は既存OTel契約どおりunexpected single canonical SkillをFAIL、unknown / multipleを`unobservable`へfail-closeし、そのためだけに独自Skill Registryやloaderを作らない。

### 5.5 変更範囲

stageごとにturn開始前snapshotを取得し、そのturnで増えたtracked / untracked changeを判定する。case全体の元baselineとの差分だけで判定しない。

- Runner fixture setup: `workflow-e2e-fixtures/**`をtemporary case baselineへ生成してよい。これはAgent stage前のrunner-owned stateとし、original `routing_source_git_sha`を書き換えない。
- case-local Run setup: Repository標準`scripts/new-run.ps1 -NoRunManifest` / `scripts/new-run.sh --no-run-manifest`で`.codex/runs/<case-run-id>/**`を1件作成してよい。`run.json`は生成せず、同一caseの全turnで必要Artifactだけを再利用する。
- Plan turn: `docs/plans/**`とcase-local Runだけ変更可。
- Case A implementation / repair: `workflow-e2e-fixtures/case-a/status.mjs`、`status.test.mjs`、case-local Runだけ変更可。
- Case A review: Product / fixture変更0件。case-local Runだけ変更可。
- Case B QA: QA Evidenceとcase-local Runだけwrite可。Product Source / Test Source自体をAgent-visible rootへ置かない。
- Case B repair: protected patchが触れたProduct source pathと同じcase-local Runだけ変更可。Evaluator answer keyやprotected patch fileをsource workspaceへ持ち込まない。
- Case C repair: `config.json`、`protected-data/keep.txt`、case-local Runをfile scope内とする。ただし`keep.txt`の削除 / rename / moveと内容変更は安全性・sentinel不変条件により禁止し、`validate.mjs`変更も禁止する。
- Case D repair / harness-improvement: Product / fixture変更0件。case-local Runだけ変更可。
- Case E: Product source変更0件。case-local Runと`.artifacts/native-local/<case-run-id>/**`だけwrite可。
- Artifact reuse probe: Case Aのfixture filesとfresh probe用Runだけ変更可。
- すべてのturnで、許可外のtracked / untracked path、HEAD変更、branch切替、commit、case workspace外writeをFAILにする。
- Targetにはremoteを設定せず、外部Networkも有効化しない。Case Bのlocalhost Runtimeだけをcase内で利用する。
- promptでもGit mutation / commit / push / PR作成を明示的に禁止するが、「試行そのものを完全に観測できる」とは主張せず、最終Git state / remote不存在 / scope violationでfail-closeする。
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
run_status: completed | blocked
provenance
  evaluator_git_sha
  routing_source_git_sha
  target_git_sha
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
    command_execution
    changed_files
    checks
    workflow_state
      decision
      blocked
      remaining_delta
  artifact_reuse
  reason
```

- `run_status`はHost smoke probeやsession continuation等のrun共通前提が成立せずcanonical run自体を評価できない場合だけ`blocked`にする。
- `status`はcase / stageのEval判定、`workflow_state`はWorkflow自身の停止 / blocked状態であり混同しない。
- `workflow_state`はcaseで確認する既存契約だけを保存し、全Skill共通decision schemaへ一般化しない。
- repair stageの共通`--output-schema`は既存Iteration Modelをそのまま表現する。

```text
iterations[]
  iteration_number
  input_findings
  repair_plan
  allowed_files
  changed_files
  validation_commands
  validation_result
  remaining_delta
  decision
```

- repair decisionは既存7値すべてをschema上許可し、Case A/C/Dの期待decisionをAgentへ教えない。
- schema不一致 / 不正JSON / 必須field欠落は自然文で補完せず`unobservable`とする。
- structured repair outputの`changed_files`、`validation_commands`、`validation_result`、`remaining_delta`はrunnerの実観測と照合し、Agent自己申告だけでPASSにしない。
- code-review stageは既存Required review outputに対応するstage-specific structured resultを使うが、PR5 Semantic Evalを再実装しない。
- Native stageはDoctor-onlyのstage-specific structured outputを保存し、`doctor_result`、`first_anomaly`、既存failure taxonomy、`next_stage`、`unexecuted_stages`をCodex標準JSONLのNative helper `command_execution`とcase固有Artifactへ照合する。全command履歴の独自意味解析へ広げない。
- 総合100点score、weight、severity、confidence集約は追加しない。
- `not_executed`と`unobservable`をPASSへ集約しない。
- Case A / C / Dに`fail` / `unobservable` / `not_executed`があるcanonical runを成功扱いにしない。
- Case B / Eは外部capability不足時だけ`not_executed`を許容する。fixture / setup / evaluator failureは`fail`または`blocked`。

### 5.8 deterministic / semanticとの境界

- `feature-plan`生成物にはPR4の既存deterministic validatorを再利用する。
- Case A reviewはcode-reviewのRequired review outputをstructured化してFindingの存在とLocationを確認するだけとし、PR5 Semantic Judgeを再実装しない。
- `exploratory-qa`は既存Agentic QA challenge、Machine Contract、Coverage / Evidence validator、protected patch validation、source-free isolationの考え方を再利用する。
- Case BはOfficial Black-box Scored Runnerそのものを再現しない。`CHALLENGE-BASIC-001`をdeterministic fixtureとして使い、Workflow E2EはGray-box契約で実行する。
- Case Bのdependency preparation / `build:web` / ground-truth sanity / `scripts/serve-web-dist.ts`は既存経路を再利用する。必要なnarrow exportは挙動変更なしに限定し、同じhelperをPR6へ複製しない。
- `repair-loop`はPR5がPR6へ残したchanged files、validation、remaining delta、decisionを共通Iteration schemaで構造化し、actual executionと照合する。
- NativeはPR5がPR6へ残したfirst anomaly、stage gate、retry / stop判断と実command resultの整合を、Codex標準`command_execution`と既存`android-local.ps1` action境界で確認する。
- PR5のSemantic Eval dataset、rubric、Judge protocolを変更しない。
- live Workflow outputをPR5へ無理に流し込むadapterや新rubricを作らない。

### 5.9 Runtime、sandbox、retry

- canonical modelは`gpt-5.6-luna`へ固定し、Codex versionと合わせてresultへ保存する。
- initial turn / resumed turnとも`--json`を使い、initial turnの`thread.started`から`thread_id`を取得する。
- canonical live turnではmodel、sandbox、approval、OTel、`--ignore-rules`、`-c features.hooks=false`、`--ignore-user-config`を全caseで固定する。Case Bでuser config有効probeを行っても、それは診断Evidenceに限定し、live turnへ継承しない。Repository / user Hookをscoring fallbackやcompletion controlに使わない。
- repair stageでは共通Iteration `--output-schema`を使う。
- Case A review stageではcode-review Required review output用のstage-specific `--output-schema`を使う。
- Case E Native stageではDoctor-only structured output用のstage-specific `--output-schema`を使う。
- Plan / implementation / review / repair / QA / harness-improvement / Artifact reuse / Native Doctorは`workspace-write`を使い、stageごとのProduct / fixture許可pathとcase-local Run pathをscope checkする。
- review / QA / harness-improvementの停止境界はsandboxのread-only性ではなく、Product / fixture変更0件とSkill / output / handoff結果で評価する。
- Case B resumeではcwdをsource-free QA rootからpatched source workspaceへ切り替える。共通resumeはrun preflight、Case B固有cwd切替はCase B capabilityとして分けて扱う。
- approval policyは非対話実行の既存Harnessと同じく`never`へ固定する。
- 外部Networkは既定で有効化しない。Case Bのlocalhost Runtimeだけを利用する。
- temporary Targetをtrustさせる独自managerは作らない。
- Case Bのdependency / build / Runtime processはAgent turnより前後にEvaluator側で管理し、Agentへ依存Installやserver lifecycleを任せない。
- process timeoutは既存Trigger Evalと同程度の有限値を持たせ、timeoutをPASSにしない。
- canonical live runは各turn 1回だけ実行する。
- timeout / unobservableを消すための自動retryを追加しない。
- 同じcaseを良い結果が出るまで再実行して結果を選別しない。
- model/provider fallbackを追加しない。
