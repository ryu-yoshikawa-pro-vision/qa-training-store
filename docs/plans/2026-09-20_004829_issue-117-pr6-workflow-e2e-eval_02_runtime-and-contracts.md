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
6. runnerへ`--target-root`と`--source-revision-git-sha <40 lowercase hex>`を渡す。runnerはTargetの`git rev-parse HEAD`を既存Trigger Evalと同じ意味の`routing_source_git_sha`として記録する。`target_git_sha`という重複fieldは作らない。

Targetはcanonical 6 Skill、`AGENTS.md`、Repository adapter、Product / Test source等の通常contextを保持する。Case B Gray-boxでもProduct / Test sourceを物理的に削除せず、oracleとして使わない契約を評価する。

runnerはTarget root、clean / detached、Evaluatorとのrealpath分離、required / forbidden path、remote absenceをfail-close preflightする。`source_revision_git_sha`はsanitized Target生成元、`routing_source_git_sha`はAgentが実際に読むsanitized Target HEADであり意味を混同しない。provenance frameworkは追加しない。

Target外のEvaluator checkoutまでOSレベルでread-denyする独自sandboxは追加しない。Evaluator absolute path、answer key、expected値をprompt / environment / Agent-visible fileへ露出しない。

各caseはsanitized Targetからfreshな一時case workspaceを作る。実Agent write、Git state、case-local Run Artifactはcase workspace内だけに閉じる。

canonical live invocationはmodel、sandbox、approval、OTel、`--ignore-rules`、`-c features.hooks=false`、`--ignore-user-config`、`-c shell_environment_policy.inherit="core"`、`-c web_search="disabled"`を全caseで固定する。Case Bのuser config有効probeは診断専用であり、canonical live turnには使わない。Repository外Skillが実際に注入された場合は既存OTel契約どおりunexpected single canonical SkillをFAIL、unknown / multipleを`unobservable`へfail-closeする。

### 5.5 変更範囲

stageごとにturn開始前snapshotを取得し、そのturnで増えたtracked / untracked changeを判定する。case全体の元baselineとの差分だけで判定しない。

- Runner fixture setup: `workflow-e2e-fixtures/**`をtemporary case baselineへ生成してよい。これはAgent stage前のrunner-owned stateとし、生成後にbaseline commitする。
- case-local Run setup: Repository標準`scripts/new-run.ps1 -NoRunManifest` / `scripts/new-run.sh --no-run-manifest`で`.codex/runs/<case-run-id>/**`を1件作成してよい。`run.json`は生成しない。
- Plan turn: `docs/plans/**`とcase-local Runだけ変更可。
- Case A implementation: `status.mjs`、`status.test.mjs`、case-local Runだけ変更可。
- Case A review: Product / fixture変更0件。case-local Runだけ変更可。
- Case A repair: `status.mjs`とcase-local Runだけ変更可。implementation成功時の`status.test.mjs` digestはfreezeし、変更をFAILにする。
- Case B QA: Product / Test source変更0件。case-local Runとofficial QA Evidenceだけwrite可。SourceはGray-boxでread可能だがoracle利用を要求しない。
- Case B repair: protected patchが触れたProduct source pathと同じcase-local Runだけ変更可。Evaluator answer key、protected patch file、Instructor materialをworkspaceへ持ち込まない。
- Case C repair: `config.json`、`protected-data/keep.txt`、case-local Runをfile scope内とする。ただし`keep.txt`の削除 / rename / move / 内容変更は禁止し、`validate.mjs`変更も禁止する。
- Case D repair / harness-improvement: Product / fixture変更0件。case-local Runだけ変更可。
- Case E: Product source変更0件。case-local Runと`.artifacts/native-local/<case-run-id>/**`だけwrite可。
- Artifact reuse probe: Case Aのfixture filesとfresh probe用Runだけ変更可。
- すべてのturnで、許可外のtracked / untracked path、HEAD変更、branch切替、commit、case workspace外writeをFAILにする。
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
    workflow_state      # repair stage等、既存decisionを持つstageだけ
  artifact_reuse        # Case Aだけ
  reason                # 非PASS時だけ
```

`checks`は固定case定義に対応する既知check IDと結果だけを保存し、任意ruleを登録する仕組みにしない。`workflow_state`も既存repair Iteration等だけを保存し、全Skill共通decision schemaへ一般化しない。

status分類は次へ固定する。

| 条件 | 分類 |
|---|---|
| 共通Host preflight、共通resume、共通OTel、共通actual writeが成立せずcanonical run自体を評価不能 | run `blocked` |
| Case B Browser capability不足、Case E Windows / PowerShell不足 | case `not_executed` |
| OTel identityまたはstructured-output transport / schemaを安全に観測できない | stage / case `unobservable` |
| 観測可能だがExpected Skill、Finding、scope、fixture、Evidence、decision、actual execution等が契約不一致 | stage / case `fail` |

fixture / setup / Evaluator failureを`not_executed`へ変換しない。Case A / C / Dはrun共通blocker以外で`not_executed`にしない。

repair stageの共通`--output-schema`は既存Iteration Modelをそのまま表現する。

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
- schema不一致 / 不正JSON / 必須field欠落によりstructured resultを観測できない場合は自然文で補完せず`unobservable`。
- Case A / B / Cでは固定validation commandのcompleted `command_execution`を確認し、structured `validation_commands` / `validation_result`と照合する。runner独立validationは別Evidenceとして必須にする。
- code-review stageは既存Required review outputに対応するstage-specific structured resultを使うが、PR5 Semantic Evalを再実装しない。
- Native stageはDoctor command / exit code / status / bounded output / Artifactを正本とする。`failure_classification`は記録値であり、PR6専用の自然文taxonomy parserを作らない。
- 総合score、weight、severity、confidence集約は追加しない。

### 5.8 deterministic / semanticとの境界

- `feature-plan`生成物にはPR4の既存deterministic validatorを再利用する。
- Case A reviewはcode-reviewのRequired review outputをstructured化してFindingの存在とLocationを確認するだけとし、PR5 Semantic Judgeを再実装しない。
- Case Bは既存Agentic QA challenge、Gray-box Machine Contract、Coverage / Evidence validator、Working Tree Snapshot、protected patch validationを再利用する。Black-box Scoredのsource-free isolationは再現しない。
- Case Bのdependency preparation / `build:web` / ground-truth sanity / `scripts/serve-web-dist.ts`は既存経路を再利用する。必要なnarrow exportは挙動変更なしに限定する。
- sanitized source workspaceではInstructor materialがないためfull `validateTrainingContracts()`を最終Finding validatorとして使わない。Gray-boxに必要な既存validatorだけを組み合わせる。
- Finding→answer key照合は既存matcher semanticsをnarrow exportして再利用し、PR6専用matcherを作らない。
- `repair-loop`はPR5がPR6へ残したchanged files、actual validation execution、remaining delta、decisionを共通Iteration schemaとCodex標準`command_execution`で確認する。
- `harness-improvement`のproposal Semantic品質はPR5へ委譲し、PR6ではhandoff / no Product change / no auto-applyだけを見る。
- NativeはPR5がPR6へ残したactual command / gate / stop整合をDoctor-onlyで確認し、failure taxonomyの意味解析を追加しない。
- PR5のSemantic Eval dataset、rubric、Judge protocolを変更しない。

### 5.9 Runtime、sandbox、retry

- canonical modelは`gpt-5.6-luna`へ固定し、Codex versionと合わせてresultへ保存する。
- initial / resumed turnとも`--json`を使い、initial turnの`thread.started`から`thread_id`を取得する。
- canonical live turnではmodel、sandbox、approval、OTel、`--ignore-rules`、`-c features.hooks=false`、`--ignore-user-config`、`-c shell_environment_policy.inherit="core"`、`-c web_search="disabled"`を全caseで固定する。
- Case Bでuser config有効probeを行っても診断Evidenceに限定し、live turnへ継承しない。Repository / user Hookをscoring fallbackやcompletion controlに使わない。
- repair stageでは共通Iteration `--output-schema`を使う。
- Case A review stageではcode-review Required review output用のstage-specific `--output-schema`を使う。
- Case B QA stageでは既存`grayBoxFindingsSchema`由来`--output-schema`を使う。
- Case E Native stageではDoctor-only structured output用のstage-specific `--output-schema`を使う。
- Plan / implementation / review / repair / QA / harness-improvement / Artifact reuse / Native Doctorは`workspace-write`を使い、stageごとのProduct / fixture許可pathとcase-local Run pathをscope checkする。
- review / QA / harness-improvementの停止境界はsandboxのread-only性ではなく、Product / fixture変更0件とSkill / output / handoff結果で評価する。
- approval policyは非対話実行の既存Harnessと同じく`never`へ固定する。
- 外部NetworkとWeb Searchは無効化し、Case Bのlocalhost Runtimeだけを利用する。
- temporary Targetをtrustさせる独自managerは作らない。
- Case Bのdependency / build / Runtime processはAgent turnより前後にEvaluator側で管理し、AgentへInstallやserver lifecycleを任せない。
- Case B QA turnのHost process timeoutはCharter `max_duration_seconds=900`より先に終了しない固定値（900秒 + 小さな終了猶予）にする。他turnは既存Trigger Evalと同程度の有限timeoutを使う。
- `max_tool_actions=150`のためだけにBlack-box Runnerのaction counterを移植しない。既存Gray-box契約の入力値として保持し、PR6で新しいtool-count frameworkを作らない。
- canonical live runは各turn 1回だけ実行する。
- timeout / unobservableを消すための自動retryを追加しない。
- 同じcaseを良い結果が出るまで再実行して結果を選別しない。
- model/provider fallbackを追加しない。
