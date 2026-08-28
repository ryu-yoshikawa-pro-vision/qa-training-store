# Codex HookによるRunログ自動化・既存観測機能整理プラン

## 0. 依頼概要

- Codex自身に`.codex/runs/<run_id>/REPORT.md`へ細かな行動を逐次記録させる現行運用を見直す。
- Codex Hooksを使い、以下の機械的事実を自動収集する。
  - どのような指示を受けたか。
  - Hookで観測可能な範囲で何を実行したか。
  - Subagentをいつ・どのagent typeで起動し、いつ終了したか。
  - Subagentが最終的に何を返したか。
  - main turnがどの応答で終了したか。
- 「なぜその方針を選んだか」は、逐語的な内部思考ではなく、共有可能なDecision / Rationale / 計画変更理由として`REPORT.md`へ残す。
- `.codex/runs/`は維持するが、`REPORT.md`は機械ログではなく意味のあるcheckpoint記録へ縮小する。
- `run.json`はCodexが手書きせず、既存の`new-run` / wrapper / collectorで機械生成・更新するmanifestとして扱う。
- `evaluation.json`は今回再設計しない。通常Runで既にoptionalな既存挙動を維持する。
- Subagentについては、現状の`subagents/*.json`がCodex native機能から自動生成されないことを前提とし、Hookで取得できる機械情報から自動生成する。
- `.codex/hooks/observe.ps1` / `observe.sh`が実運用で未使用なら、新しいcanonical Hook loggerへ責務を統合したうえで整理する。

### 背景

- 現在の`AGENTS.md`と`.codex/templates/REPORT.md`では、調査・編集・判断・コマンド実行を含む細かな行動をCodex自身が`REPORT.md`へ記録する契約が残っている。
- `AGENTS.md`ではSubagent使用時も、委譲内容・結果要約・Parentの採用判断をParentが`REPORT.md`へ記録する契約になっている。
- `scripts/codex-task.ps1|sh`にはwrapper lifecycle / validation用JSONLログが既に存在する。
- `.codex/hooks/observe.ps1|sh`には観測用JSONL writerが存在するが、現在のproject-scoped Hook設定から直接利用されていない。
- `scripts/collect-run-artifacts.py`にはHook eventおよびRun-local `subagents/*.json`を`run.json`へ集約する基盤が既にある。
- `.codex/templates/subagent-run.schema.json`は存在するが、現在の`new-run` / `codex-safe` / `codex-task` / project Hook設定にはSubagent実行からこのJSONを自動生成するproducerが存在しない。
- Codex公式Hookには`UserPromptSubmit` / `PostToolUse` / `SubagentStart` / `SubagentStop` / `Stop`があり、`spawn_agent`はTool Hook対象である。

### 期待成果

- Codexが記録作業のためだけに余計なファイル編集をしなくてよくなる。
- 指示、Tool実行、Subagent lifecycle、turn終了を後から時系列で分析できる。
- Subagentの機械的な実行記録は自動生成され、Parentが毎回REPORTへ転記しなくてよくなる。
- `REPORT.md`には機械的事実ではなく、重要な判断理由・blocker・Remainingだけを残す。
- Hook log、Subagent Artifact、wrapper log、`REPORT.md`、`run.json`の責務を重複させない。
- 既存の安全性・scope・validation基盤を壊さず、変更範囲を必要最小限に留める。

## 1. ゴール / 完了条件

### ゴール

Runの記録責務を以下へ整理する。

1. `PLAN.md` / `TASKS.md`
   - 計画、作業項目、進捗、blocked item。
2. `REPORT.md`
   - 実行中に発生した重要なDecision / Rationale、計画変更、重要な検証結果、blocker、Remaining。
3. Hook JSONL
   - `UserPromptSubmit`: どのような指示を受けたか。
   - `PostToolUse`: Hookで観測可能な範囲で、どのToolを実行したか。
   - `SubagentStart`: どのSubagentが開始したか。
   - `SubagentStop`: どのSubagentが終了し、どの最終結果を返したか。
   - `Stop`: main turnが終了した事実と、その時点の最終assistant message。
4. Subagent Artifact
   - `.codex/runs/<run_id>/subagents/<agent_id>.json`をHookから自動生成・更新する。
   - Hookで確実に観測できる機械情報を正本とする。
   - Parentの採用判断等、Hookだけでは確定できない意味情報を捏造しない。
5. `codex-task` JSONL / report JSON
   - wrapper lifecycle、preflight、scope、schema validation、verify等。
6. `run.json`
   - machine-readable artifactを集約する自動生成manifest。
7. `evaluation.json`
   - 評価が必要なworkflowだけで利用する既存artifact。今回のHook導入では再設計しない。

### 完了条件（DoD）

- [ ] 実装時点のCodex CLIで`UserPromptSubmit` / `PostToolUse` / `SubagentStart` / `SubagentStop` / `Stop`のpayload、stdout / exit semantics、Tool coverageを実機確認している。
- [ ] project-local Hookのtrust状態を確認し、Hookが実際に有効な状態でsmoke validationしている。
- [ ] Codexが通常作業の各行動ごとに`REPORT.md`へ追記する契約を廃止している。
- [ ] `REPORT.md`の更新条件を「TASK完了」「blocker / 重要判断 / 計画変更」「Run完了」の3条件に固定している。
- [ ] Subagent使用時の委譲内容・実行結果を毎回REPORTへ転記する契約を廃止し、機械情報はHook / Subagent Artifactを正本としている。
- [ ] `UserPromptSubmit`で指示内容のsanitized / bounded copyをJSONLへ記録できる。
- [ ] promptが上限超過した場合、切り詰められたことをログから判別できる。
- [ ] promptに含まれる既知のcredential / token形式はbest-effortでredactし、任意のfree-form secretを完全検出できるとは扱わない。
- [ ] `PostToolUse`で`tool_name` / `tool_use_id`と必要最小限のbounded summaryを記録できる。
- [ ] 全Tool共通の`success / failure`を無理に正規化しない。
- [ ] Hosted `WebSearch`等、Hookで観測できないTool pathが存在することを明記し、「ログにない = 実行していない」と判断しない。
- [ ] `SubagentStart`で`agent_id` / `agent_type` / `turn_id` / model / permission mode等の取得可能な機械情報を記録できる。
- [ ] `SubagentStop`で`agent_id` / `agent_type` / `agent_transcript_path` / `stop_hook_active` / bounded `last_assistant_message`等を記録できる。
- [ ] Run IDが信頼できる場合、`SubagentStart`でRun-local Subagent Artifactを自動作成し、`SubagentStop`で同じArtifactを自動更新できる。
- [ ] Subagent Artifactは`agent_id`を安定キーとして更新し、時刻や「最新Subagent」等のheuristicで関連付けない。
- [ ] `spawn_agent`の`PostToolUse` payloadからstable `agent_id`と割当内容を機械的に関連付けられる場合だけ、Subagent Artifactへbounded assignment summaryを反映する。
- [ ] stable correlationが取れない場合、assignmentを推測で紐付けず、Raw `PostToolUse`とSubagent lifecycleを独立Evidenceとして残す。
- [ ] Subagent Artifactへ`parent_decision` / `used_in_final_plan`等の主観判断を自動で捏造しない。
- [ ] 既存`subagent-run.schema.json`は、機械生成Artifactと矛盾しない最小契約へ整理する。既存の主観fieldを無理に必須のまま維持しない。
- [ ] `scripts/collect-run-artifacts.py`が自動生成されたSubagent Artifactを既存`run.json.subagents` / `subagent_run_count`へ集約できる。
- [ ] `Stop`で`turn_id` / `stop_hook_active` / bounded `last_assistant_message`を記録できる。
- [ ] `Stop`入力には停止理由が直接渡らない前提とし、loggerが「なぜ止まったか」を推測・捏造しない。
- [ ] 停止理由の分析が必要な場合は、`Stop` event、最終assistant message、`REPORT.md`のBlocker / Remaining、wrapper / validation logを組み合わせて事実ベースで判断できる。
- [ ] logging HookはCodexの挙動を変更しない観測専用Hookとして実装する。
- [ ] `UserPromptSubmit` / `PostToolUse` / `SubagentStart`はmodel contextへ追加情報を注入しない。
- [ ] `SubagentStop` / `Stop`は正常時に有効なno-op JSONをstdoutへ返し、continuation / blockを発生させない。
- [ ] logger内部の記録失敗時も、既存Codex作業を可能な限り止めない。
- [ ] Hook loggerは原則1実装に統一され、`observe.ps1|sh`と新loggerが重複して残らない。
- [ ] Hook logのcanonical保存先をGit管理外の`.codex/logs/`に統一している。
- [ ] `scripts/collect-run-artifacts.py`がcanonical Hook logを明示的に読み、`run_id`一致eventだけを`run.json`へ集約する。
- [ ] 5つのlogging eventがcollectorの認識eventへ反映されている。
- [ ] `run.json`ではRaw prompt / Tool payload / last messageを複製せず、event count / log path / Subagent summary等の集約情報だけを保持する。
- [ ] `codex-safe` / `codex-task`へRun IDを指定した場合だけ、Codex child processとそのHookへ信頼できる`CODEX_RUN_ID`を伝播できる。
- [ ] Run IDなしeventを「最新Run」等へ推測で関連付けない。
- [ ] Run IDなしSubagentはglobal Hook logには残すが、Run-local Subagent Artifactを推測生成しない。
- [ ] `run.json`はCodexが手編集せず、既存の機械生成経路だけで生成・更新される。
- [ ] `evaluation.json`がstandard Runで既にoptionalなら、evaluation関連コード・schema・templateを変更しない。
- [ ] 既存Bash `PreToolUse` safety Hookのblocking behaviorを変更しない。
- [ ] Raw JSONLはGit管理対象外のままである。
- [ ] Product code、ECサイト仕様、カリキュラム本体を変更していない。

## 2. 現状理解と前提

### Current understanding

- `.codex/config.toml`では`[features] hooks = true`になっている。
- 現在project configに登録されているHookはBash向け`PreToolUse` safety policyのみである。
- `.codex/hooks/observe.ps1` / `observe.sh`は観測eventをJSONLへ書く実装を持つが、現在の`.codex/config.toml`から直接呼ばれていない。
- `observe.ps1|sh`は`CODEX_HOOK_*`環境変数を入力契約としており、native Hook stdin payloadを直接扱うcanonical loggerとしてそのまま採用する前提にはしない。
- `.codex/logs/.gitignore`は`*.jsonl`をGit管理対象外にしている。
- `scripts/codex-task.ps1|sh`はwrapper / validation用machine-readable logを既に持つ。
- `scripts/codex-safe.ps1|sh` / `codex-task.ps1|sh`はRun ID parameterを持つが、現状はHook向け`CODEX_RUN_ID`をCodex child processへ明示伝播していない。
- `scripts/collect-run-artifacts.py`はHook eventを識別するが、現状は`.codex/observations/hooks.jsonl`とRun-local `logs/*.jsonl`を主に扱うため、canonical保存先を`.codex/logs/`へ変更するならcollector変更が必要である。
- collector側Hook event一覧には`PostToolUse` / `Stop` / `SubagentStart` / `SubagentStop`等が含まれるが、`UserPromptSubmit`は含まれていない。
- `.codex/templates/hook-observation.schema.json`にも`UserPromptSubmit`は含まれていない。
- `.codex/templates/subagent-run.schema.json`には`role` / `purpose` / `mode` / `status` / `summary` / `parent_decision` / `used_in_final_plan`等が定義され、全項目がrequiredになっている。
- 既存Subagent schemaはParent judgementを含むため、そのままではHookだけから100%機械生成できない。
- `scripts/collect-run-artifacts.py`はRun-local `subagents/*.json`を読むconsumerであり、Subagent JSONを生成するproducerではない。
- `scripts/new-run.*`もSubagent JSONを生成しない。
- Codex native Subagentはthread / transcript / resultを管理するが、任意のrepo-local `.codex/runs/<run_id>/subagents/*.json`を自動生成する仕様ではない。
- `AGENTS.md`では現状、Subagent使用時の委譲内容・要約・Parent採用判断をParentがREPORTへ記録する運用になっている。
- 現在の`codex-task`ではevaluation template / requireは明示optionであり、標準defaultでは無効になっている。
- 現在の`.codex/templates/REPORT.md`は「行動のたびに追記」「コマンドや確認結果を必ず記録」としている。

### Codex Hookの前提

実装時点の公式仕様を正とするが、計画時点では以下を前提とする。

- 共通入力には`session_id`、`cwd`、`hook_event_name`、`model`等があり、turn-scoped hookには`turn_id`がある。
- `UserPromptSubmit`は`prompt`を受け取る。
- `PostToolUse`は`tool_name` / `tool_use_id` / `tool_input` / `tool_response`を受け取る。
- `spawn_agent`は`PostToolUse`対象のlocal function toolであり、`Agent` matcherでも扱える。
- `SubagentStart`は`turn_id` / `agent_id` / `agent_type` / `permission_mode`を受け取る。
- Subagent hookの`session_id`はparent session idである。
- `SubagentStop`は`turn_id` / `agent_id` / `agent_type` / `agent_transcript_path` / `stop_hook_active` / `last_assistant_message`を受け取る。
- `Stop`は`turn_id` / `stop_hook_active` / `last_assistant_message`を受け取る。停止理由そのものは入力fieldとして提供されない。
- transcript pathは利用可能でもformatがstable interfaceではないため、V1の情報抽出元としてtranscript本文をparseしない。
- `PostToolUse`は多くのlocal function toolを観測できるが、hosted `WebSearch`等は観測対象外であり、一部specialized pathもopt-out可能である。
- `SubagentStart`のplain stdoutはSubagent developer contextへ追加されるため、観測専用Hookは追加contextを出さない。
- `SubagentStop` / `Stop`はexit 0時に有効なJSON stdoutを返し、観測専用Hookではcontinuationを要求しない。
- project-local Hookは実行環境でtrustされている必要があるため、設定ファイルを追加しただけで動作すると仮定しない。

### Assumptions

- Node.jsは既存実行基盤なので、cross-platform loggerを1つ置く場合の第一候補とする。
- Run-managed実行では`codex-safe` / `codex-task`の既存Run ID parameterを利用し、その値だけをHook correlationへ使用する。
- raw `codex`直接起動やRun ID省略時は、global Hook logだけを残し、Run-local artifactへ推測で関連付けない。
- Hook logの目的は分析可能なEvidenceを残すことであり、完全な監査証跡を構築することではない。
- Subagent Artifactは「Hookで観測できた機械情報」と「Parentによる意味判断」を区別する。機械生成時に意味判断を補完しない。
- V1ではlog rotation、外部転送、DB化を行わない。

### Non-goals

- `.codex/runs/`を廃止しない。
- Run管理基盤全体を再設計しない。
- `RUN_MANIFEST.json`へ新しい主観評価fieldを増やさない。
- `evaluation.json`を今回の主目的として再設計しない。
- `PLAN.md` / `TASKS.md`を機械生成へ置き換えない。
- 逐語的な内部思考・private chain-of-thoughtをログへ保存しない。
- 全Toolのinput / responseを無条件保存しない。
- 全Toolの結果を共通statusへ正規化するframeworkを作らない。
- Hookで観測できないhosted / specialized toolを別の疑似Hookで無理に捕捉しない。
- Subagent transcript本文をparseして独自解析する仕組みを作らない。
- agent assignmentを時刻近接や「最後に起動したagent」等でheuristic correlationしない。
- `parent_decision` / `used_in_final_plan`をloggerが推測しない。
- `PreToolUse` safety policyを再設計しない。
- 外部ログサービス、DB、常駐processを導入しない。
- Product codeやテスト対象機能を変更しない。

## 3. 実装中の停止条件

- 5つのlogging eventのいずれかが現行CLIでproject-scoped Hookから利用できない場合、wrapperへ疑似Hookを大量実装して補わない。利用可能なeventだけで最小構成を再評価する。
- Hook commandのstdout / exit挙動が公式仕様と実機で異なる場合、実機仕様を優先し、観測HookがCodexをsteerしないことを最優先する。
- project-local Hookがtrustされていない場合、trust状態を解決せずに実装不良判定しない。
- `observe.ps1|sh`に有効なcallerが存在する場合、callerを移行せずに削除しない。
- Run IDを信頼できる形で取得できないeventは、Runへ推測で紐付けない。
- `spawn_agent`のTool responseからstable `agent_id`を取得できない場合、assignment summaryとSubagent lifecycleをheuristicで紐付けない。
- prompt / Tool payloadから安全に扱えないfieldは保存対象から外す。
- logging Hookが既存safety Hookへ干渉する場合、safetyを優先してlogging scopeを縮小する。
- 既存Subagent schemaを機械生成へ合わせる際、既存active consumerを壊すことが判明した場合はschemaを破壊的に変更せず、machine observation用schemaを分離する。
- `run.json`へ追加しようとする情報がAI判断を必要とする場合、その情報はmanifestへ入れない。

## 4. 影響範囲

### Files to inspect / change candidates

- `AGENTS.md`
- `.codex/config.toml`
- `.codex/hooks/observe.ps1`
- `.codex/hooks/observe.sh`
- `.codex/hooks/pre_tool_use_policy.mjs`
- `.codex/hooks/pre_tool_use_policy_windows.ps1`
- `.codex/templates/REPORT.md`
- `.codex/templates/RUN_MANIFEST.json`
- `.codex/templates/hook-observation.schema.json`
- `.codex/templates/subagent-run.schema.json`
- `.codex/logs/.gitignore`
- `.gitignore`
- `scripts/codex-safe.ps1`
- `scripts/codex-safe.sh`
- `scripts/codex-task.ps1`
- `scripts/codex-task.sh`
- `scripts/collect-run-artifacts.py`
- `docs/reference/codex-implementation-harness.md`
- `docs/reference/codex-safety-harness.md`
- 関連する`scripts/tests/**`

### 実装前repo-wide参照確認

以下をliteral searchし、producer / consumer / documentationに分類する。

- `observe.ps1`
- `observe.sh`
- `CODEX_OBSERVATION_LOG`
- `CODEX_HOOK_EVENT`
- `CODEX_RUN_ID`
- `.codex/observations`
- `hooks.jsonl`
- `hook_observations`
- `hook_event_count`
- `UserPromptSubmit`
- `SubagentStart`
- `SubagentStop`
- `subagent-run.schema.json`
- `subagents/`
- `parent_decision`
- `used_in_final_plan`
- `Write-TaskLog`
- `run.json`
- `evaluation.json`
- `EvaluationTemplate`
- `RequireEvaluation`

## 5. 変更方針

### Phase 1: Hook責務とRun correlationを固定する

#### Hook V1

`.codex/config.toml`へ、既存Safety `PreToolUse`とは別に以下5eventを接続する。

- `UserPromptSubmit`
- `PostToolUse`
- `SubagentStart`
- `SubagentStop`
- `Stop`

既存Bash `PreToolUse` safety Hookのmatcher / blocking behaviorは変更しない。

#### Run ID伝播

- `codex-safe.ps1|sh` / `codex-task.ps1|sh`にRun IDが指定された場合、Codex child processの実行中だけ`CODEX_RUN_ID=<run_id>`を環境へ設定する。
- Codex終了後は親processの元の環境変数値を復元する。
- Run ID未指定時は`CODEX_RUN_ID`を新規推測しない。
- `new-run`の「最新Run」を自動探索して環境へ設定する仕組みは作らない。
- Run-managed workflowのdocsでは、Run-local Hook / Subagent Artifactを残したい場合はwrapperへ同じRun IDを渡すことを明記する。

### Phase 2: canonical Hook loggerを1つ実装する

- cross-platform loggerは原則Node `.mjs`を1つだけ用意する。
- native Hook stdin payloadを直接処理する。
- Raw eventは`.codex/logs/hooks-<session_id>.jsonl`へ1event=1JSON lineでappendする。
- session idはsafe filename化する。
- Raw JSONLはGit管理外とする。
- 1eventのappendは1回のfile append operationで完結させ、複数Subagent並列時にpartial lineを作らない。
- loggerは通常時にstdoutへdebug logを出さない。
- logger内部エラーはstderr等の最小診断に留め、可能な限りCodex本作業を止めない。
- V1ではrotation、DB、外部送信を実装しない。

#### 共通metadata

取得可能なeventでは以下を記録する。

- event
- timestamp
- session_id
- turn_id
- model
- permission_mode
- run_id（`CODEX_RUN_ID`が妥当な場合のみ）

#### `UserPromptSubmit`

- sanitized / bounded prompt copyを保存する。
- truncated flagを保存する。
- 既知secret patternをbest-effort redactionする。
- transcript本文は読まない。
- stdoutへplain text / additionalContextを出さない。

#### `PostToolUse`

- `tool_name` / `tool_use_id`を保存する。
- sanitized / bounded input summaryを保存する。
- 必要なToolだけ、安定取得できるbounded result metadataを保存する。
- `tool_input` / `tool_response`全文は保存しない。
- 全Tool共通`success / failure`を作らない。
- Tool別の万能summary engineを作らない。
- hosted / specialized toolを完全捕捉できるとは扱わない。
- `spawn_agent`は通常のTool eventとして必ずRaw logへ残す。
- `spawn_agent`のtool inputから割当内容を安全にbounded summary化できる場合は、そのsummaryを残す。
- `spawn_agent`のtool responseからstable `agent_id`を取得できることを実機確認できた場合だけ、対応するSubagent Artifactへassignment summaryを反映する。
- stable `agent_id`が取れなければcorrelationしない。
- stdoutへdecision / feedback / additionalContextを返さない。

#### `SubagentStart`

- `agent_id` / `agent_type`を保存する。
- Run IDがある場合、`.codex/runs/<run_id>/subagents/<safe-agent-id>.json`を新規作成または初期化する。
- Artifactには少なくとも以下の機械情報を保存する。
  - parent_run_id
  - subagent_run_id / agent_id
  - parent session_id
  - turn_id
  - agent_type
  - model
  - permission_mode
  - started_at
  - status=`running`
  - source=`codex_hooks`
- stdoutへplain text / additionalContextを出さない。

#### `SubagentStop`

- `agent_id`をキーに同じSubagent Artifactを更新する。
- 以下を更新する。
  - ended_at
  - status（Hookから確定できる範囲の中立的な値）
  - agent_type
  - agent_transcript_path
  - stop_hook_active
  - sanitized / bounded last_assistant_message
  - truncated flag
- `SubagentStop`が来たことだけを根拠に「成功」と断定しない。schema上は`stopped`等、機械的事実を表す値を利用できるようにする。
- `parent_decision` / `used_in_final_plan`を生成しない。
- exit 0 + 有効なno-op JSON stdoutを返し、Subagent continuationを要求しない。

#### `Stop`

- `stop_hook_active`とsanitized / bounded `last_assistant_message`を保存する。
- truncated flagを保存する。
- `stopReason`を入力から取得しようとしない。
- logger側で停止理由を分類・推測しない。
- exit 0 + 有効なno-op JSON stdoutを返し、main turn continuationを要求しない。

### Phase 3: Subagent Artifact契約を機械生成可能にする

#### 原則

- 現在の`subagent-run.schema.json`はParent judgementを含む全field必須契約であり、そのままではHookから正確に自動生成できない。
- 自動生成のために未知情報を空文字・false・accepted等で埋めない。
- 主観情報と機械情報の区別をschemaで維持する。

#### 第一候補

repo内consumer確認で破壊的影響がない場合、既存`subagent-run.schema.json`を最小整理する。

- 機械的に取得できるfieldをrequiredとする。
- `parent_decision` / `used_in_final_plan` / scope判断 / changed files等、Hookだけでは確定できないfieldはoptionalまたはnullableにする。
- `status`に、成功判定を含まない中立的な終了状態を追加する。
- assignment summaryはstable correlationできる場合だけoptional fieldとして保持する。
- `schema_version`を上げる必要がある場合は互換性を明示し、collectorを両version対応にする。

#### fallback

既存schemaにactive consumerがあり、上記変更が破壊的になる場合だけ、machine observation用schema / artifactを分離する。

- このfallbackは互換性問題が確認された場合だけ採用する。
- 最初から二重schemaを作らない。

### Phase 4: Collector / REPORT / docsを最小修正する

#### `scripts/collect-run-artifacts.py`

- `.codex/logs/hooks-*.jsonl`を明示的に走査する。
- `UserPromptSubmit`をHook event一覧へ追加する。
- `SubagentStart` / `SubagentStop`をHook event countとして維持する。
- `run_id`が対象Runと一致するeventだけHook summaryへ集約する。
- Run IDなしeventは対象Runへ含めない。
- `codex-task-*.jsonl`をHook logとして誤認しない。
- 旧`.codex/observations/hooks.jsonl`を廃止する場合、legacy fallbackを削除する。
- `run.json`にはRaw prompt / Tool input / response / last messageを複製しない。
- 自動生成された`subagents/*.json`を既存`collect_subagents()`で集約できるよう、必要最小限だけcollectorを調整する。
- `subagent_run_count`はArtifact数を正本とし、Hook event countから再計算しない。

#### `REPORT.md`

現行の「行動のたびに追記」を廃止し、更新条件を次の3つに固定する。

1. `TASKS.md`の1タスクを完了したとき。
2. blocker、重要な新規判断、または計画変更が発生したとき。
3. Runを完了するとき。

記録項目は空欄埋めを要求しない。

- 常時:
  - Summary
  - Progress
- 該当時のみ:
  - Changes
  - Decision / Rationale
  - Validation
  - Blocker / Remaining
- Run完了時:
  - Validation結果
  - Remainingの有無
  - 最終Progress

以下はREPORTへ重複転記しない。

- prompt全文
- 全Tool call
- main final message全文
- Subagent start / stopの機械情報
- Subagent final message全文

Subagentを使ったこと自体はREPORT記載必須にしない。ただし、Subagent結果の採否が重要な設計判断になった場合は、そのDecision / RationaleだけREPORTへ残す。

#### `run.json`

- Codexの手編集対象から外す。
- 既存`new-run` / wrapper / collectorで不足なく生成できる部分は変更しない。
- Hook / Subagent Artifact集約に必要な最小変更だけ行う。
- REPORT自然言語をparseしてmanifestを埋めない。

#### `evaluation.json`

- standard Runで既にoptionalならコード、schema、templateは変更しない。
- 今回の変更によってevaluation生成を新たに必須化しない。
- strict / 明示的評価workflowの既存挙動を壊さないことだけ確認する。

#### `AGENTS.md` / docs

- `AGENTS.md`から「各行動をREPORTへ記録する」契約を外す。
- Subagent使用時に委譲内容・結果要約を毎回REPORTへ手動転記する契約を外す。
- Parentにしか判断できない採否・重要なDecisionだけ、必要時にREPORTへ残す契約へ変更する。
- `run.json`をgenerated manifestとして明記する。
- `docs/reference/codex-implementation-harness.md`へHook log / Subagent Artifact / wrapper log / REPORT / run.jsonの責務を明記する。
- Run-local Hook / Subagent Artifactを残すRun-managed executionではwrapperへRun IDを渡すことを明記する。
- Tool Hookは完全な監査ログではないことを明記する。
- `Stop`は停止理由そのものを直接提供するeventではないことを明記する。
- project-local Hookのtrust確認手順を必要最小限で記載する。

### `observe.ps1|sh`整理

- callerなし:
  - 新logger導入後に`observe.ps1` / `observe.sh`を削除する。
  - `.codex/observations/hooks.jsonl`専用fallbackと不要になった`CODEX_HOOK_*`契約を整理する。
- callerあり:
  - callerをcanonical loggerへ移行する。
  - 移行完了後に旧scriptを削除する。
  - 安全に移行できない場合だけ残し、その理由をdocumentする。

## 6. 実行タスク

- [ ] 1. 現行Codex CLIで5eventのinput / stdout / exit semantics、Tool coverage、Hook trust状態を実機確認する。
- [ ] 2. repo-wide searchで`observe.*`、Subagent schema、Subagent Artifact、Hook schema、collector、Run ID関連のproducer / consumer / docsを確定する。
- [ ] 3. `codex-safe.ps1|sh` / `codex-task.ps1|sh`で、明示Run IDだけをCodex child / Hookへ安全に伝播する。
- [ ] 4. canonical Hook loggerを1つ実装し、共通metadata、prompt、Tool、Subagent lifecycle、Stop情報をsanitized / bounded JSONLとして記録する。
- [ ] 5. `SubagentStart` / `SubagentStop`からRun-local Subagent Artifactを自動生成・更新する。
- [ ] 6. `spawn_agent` PostToolUseでstable agent correlationが実機確認できる場合だけ、assignment summaryをSubagent Artifactへ反映する。
- [ ] 7. 既存Subagent schemaを機械生成可能な最小契約へ整理する。互換性問題がある場合だけmachine observation schemaを分離する。
- [ ] 8. `.codex/config.toml`へ5eventを接続し、既存Safety Hookを維持する。
- [ ] 9. active consumerがある場合だけ`hook-observation.schema.json`をV1 event / metadataへ最小修正する。
- [ ] 10. `collect-run-artifacts.py`をcanonical Hook logと自動生成Subagent Artifactへ対応させる。
- [ ] 11. caller移行後、未使用`observe.ps1|sh`と旧`.codex/observations` fallback / 旧環境変数契約を整理する。
- [ ] 12. `AGENTS.md` / `.codex/templates/REPORT.md`をcheckpoint型へ変更し、Subagent機械情報の手動REPORT転記を廃止する。
- [ ] 13. implementation harness docsを新責務へ合わせる。evaluationは既にoptionalなら変更しない。
- [ ] 14. targeted test / smoke validationを実行し、Raw JSONLがGit tracking対象外であることを確認する。

## 7. 検証方法

### A. Hook lifecycle

同一session / turnで最低限以下を確認する。

1. `UserPromptSubmit`が記録される。
2. Hookで観測可能なToolを1回以上実行し、`PostToolUse`が記録される。
3. Subagentを1回以上起動し、`SubagentStart`が記録される。
4. Subagent終了時に`SubagentStop`が記録される。
5. main turn終了時に`Stop`が記録される。
6. `session_id` / `turn_id` / `agent_id`で追跡可能なeventを正しく相関できる。

### B. Hook trust / 非干渉性

- project-local Hookがtrustされていることを確認してからsmokeする。
- trust未設定によるskipとlogger実装不良を混同しない。
- `UserPromptSubmit` / `SubagentStart`がadditional contextを注入しない。
- `PostToolUse`がdecision / feedback / continuationを返さない。
- `SubagentStop` / `Stop`が有効なno-op JSONを返し、continuationを発生させない。
- logger内部で記録に失敗しても、可能な限りCodex本作業を継続する。
- stdout debug printがない。

### C. 指示ログ

- promptが分析可能なsanitized / bounded copyとして記録される。
- 上限超過時にtruncateされ、その事実が分かる。
- 代表的なAPI key / token / Authorization形式をfixtureでredactできる。
- 任意のfree-form secret完全検出をテスト要件にしない。
- transcript全文を読まない・保存しない。

### D. Tool実行ログ

- `tool_name` / `tool_use_id`を記録できる。
- input / response全文を保存しない。
- allowlist対象Toolだけ必要最小限のsummaryを記録する。
- 未対応Toolでもevent自体は壊れず記録できる。
- 全Tool共通statusを作る複雑なparserが存在しない。
- hosted `WebSearch`がPostToolUse対象外でもlogger failureと判定しない。

### E. Subagent自動生成

Run IDありのwrapper経由でSubagentを1回以上起動して確認する。

- `SubagentStart`で`.codex/runs/<run_id>/subagents/<agent_id>.json`が自動作成される。
- start時点でagent id / type / started_at / parent run / session / turn等が残る。
- `SubagentStop`で同じfileが自動更新される。
- ended_at / final message / transcript path / stop_hook_active等が残る。
- `SubagentStop`だけでsuccessを断定していない。
- `parent_decision` / `used_in_final_plan`を架空値で埋めていない。
- 複数Subagentを並列実行してもagent idごとのArtifactが混同されない。
- assignment correlationが利用できる場合はagent idとassignment summaryが一致する。
- stable correlationが利用できない場合は誤ったassignmentを紐付けない。
- `collect-run-artifacts.py`実行後、`run.json.subagents` / `subagent_run_count`へ正しく集約される。

### F. Run ID correlation

- `codex-safe --run-id` / `codex-task --run-id`相当の経路でHookに同じRun IDが伝播する。
- wrapper終了後に親processの環境変数を汚染しない。
- Run IDなしでraw Codexを起動した場合、global Hook logには記録される。
- Run IDなしeventからRun-local Subagent Artifactを生成しない。
- 「最新Run」推測が存在しない。

### G. Stop分析

- `Stop` eventが通常turn終了時に記録される。
- `stop_hook_active`とbounded `last_assistant_message`を記録できる。
- `stopReason`を入力fieldとして読もうとしていない。
- loggerが停止理由を推測するfieldを生成しない。
- blocker / RemainingがあるケースではREPORTから理由を確認できる。
- validation / wrapper failureがあるケースでは`codex-task` logから事実を確認できる。

### H. Collector / `run.json`

- 5eventのevent countが集約される。
- 対象Run IDと一致するeventだけを数える。
- Run IDなしeventを対象Runへ含めない。
- `codex-task-*.jsonl`をHook logとして誤認しない。
- malformed lineで集約全体を壊さない。
- `run.json`へRaw prompt / Tool payload / final message全文をコピーしない。
- `subagent_run_count`はSubagent Artifact数から算出し、Hook event countと二重加算しない。
- Codexが`run.json`を手編集しなくてもmanifestを維持できる。

### I. REPORT運用

- Tool実行ごとにREPORTを編集しない。
- Subagent start / stopごとにREPORTを編集しない。
- REPORT更新は以下だけで発生する。
  - TASK完了
  - blocker / 重要判断 / 計画変更
  - Run完了
- Subagent結果の採否が重要な判断になった場合だけ、そのDecision / RationaleをREPORTへ残す。
- Run完了時はValidationとRemainingの有無を確認できる。

### J. Safety / Git tracking

- 既存Bash `PreToolUse` safety policyが引き続き動く。
- logging Hook failureがsafety判定を上書きしない。
- sandbox / approval / network policyを変更していない。
- `.codex/logs/*.jsonl`が`git status`へ出ない。
- Product codeに差分がない。

### K. evaluation回帰

- standard Runでevaluationなしでも既存どおり成功できる。
- 既に満たしている場合、evaluation関連実装・schema・templateには差分を入れない。

## 8. 成功判定

- Raw Hook logから「どの指示で」「Hookで観測可能な範囲でどのToolを使い」「どのSubagentを起動し」「どの応答でturnを終えたか」を追える。
- Run-local Subagent ArtifactがCodex自身のREPORT記帳なしで自動生成・更新される。
- Subagent Artifactからagent type、開始・終了、最終結果等の機械的事実を確認できる。
- assignmentがstable correlation可能な場合は、何を割り振ったかも同じArtifactから確認できる。
- stable correlation不可の場合でも誤った紐付けを行わず、Raw Tool eventとlifecycleを独立して確認できる。
- `REPORT.md`から「なぜその方針を選んだか」「何がblockerだったか」を追える。
- Stop eventだけから停止理由を断定せず、Stop / REPORT / wrapper logを組み合わせて事実ベースで分析できる。
- Codexが細かな記帳やSubagent実行情報の転記をしなくても必要なEvidenceが残る。
- Hook logger自身がCodexのprompt、Tool result、Subagent context、turn継続判断へ介入しない。
- `run.json`はCodex手編集なしで維持できる。
- standard Runで不要なevaluation変更を行っていない。
- Hook / wrapper / REPORT / Subagent Artifact / manifest間に同じ情報の不要な多重記録がない。
- logging追加で既存safety behaviorが弱くなっていない。

## 9. リスク

- Codex CLI Hook仕様がversionによって変わる可能性がある。
- project-local Hookがtrustされていない場合、設定が正しくてもHookが実行されない。
- `UserPromptSubmit`には機密情報が含まれる可能性があり、best-effort redactionでは任意のfree-form secretを完全には除去できない。
- Tool input / responseには機密情報や大容量データが含まれる可能性があるため、全文保存を避ける必要がある。
- Tool Hookにはhosted `WebSearch`等の非対象pathがあるため、完全な行動監査ログにはならない。
- `Stop` payloadだけでは「なぜ停止したか」は分からない。
- `SubagentStop`だけでは成功 / 失敗を必ずしも判定できないため、statusを過剰解釈しない必要がある。
- `spawn_agent` PostToolUseのmodel-facing outputからstable agent idを取得できないversionでは、assignmentとlifecycleを完全correlationできない可能性がある。
- 複数Subagentが並列実行されるため、session JSONLへのappendは1event=1atomic appendを前提に検証する必要がある。
- 既存Subagent schemaを変更するとactive consumerへ影響する可能性があるため、consumer確認前に破壊的変更しない。
- `CODEX_RUN_ID`伝播はwrapper経由Runだけに限定し、raw Codexへactive-run推測を導入しない。
- `observe.ps1|sh`がproject config外から利用されている可能性がある。
- REPORTを軽量化しすぎるとDecision / Rationaleが失われるため、機械ログと意味情報の境界を維持する必要がある。

## 10. 成果物

### 確定変更候補

- `.codex/config.toml`
- `AGENTS.md`
- `.codex/templates/REPORT.md`
- canonical Hook logger 1ファイル
- `.codex/templates/subagent-run.schema.json`（consumer確認のうえ、機械生成可能な最小契約へ整理）
- `scripts/codex-safe.ps1`
- `scripts/codex-safe.sh`
- `scripts/codex-task.ps1`
- `scripts/codex-task.sh`
- `scripts/collect-run-artifacts.py`
- `docs/reference/codex-implementation-harness.md`

### 利用実態確認後、必要な場合だけ変更

- `.codex/templates/hook-observation.schema.json`
- `.codex/templates/RUN_MANIFEST.json`
- `.codex/logs/.gitignore`
- `.gitignore`
- `docs/reference/codex-safety-harness.md`
- 関連する`scripts/tests/**`
- machine Subagent observation用の別schema / path（既存schemaを安全に変更できない場合のみ）

### 整理候補

- `.codex/hooks/observe.ps1`
- `.codex/hooks/observe.sh`
- `.codex/observations/`向け旧collector fallback
- 不要になった`CODEX_HOOK_*`環境変数契約

### 原則変更しない

- `.codex/templates/EVALUATION.md`
- `.codex/templates/evaluation.schema.json`
- `scripts/new-run.ps1`
- `scripts/new-run.sh`

既存挙動が本計画の完了条件を満たさないことが確認された場合だけ、「原則変更しない」ファイルを必要最小限で変更する。

## 11. 備考

- 主眼は「ログを増やすこと」ではなく、「Codex自身の機械的な記帳を自動化し、後から分析可能な情報だけを適切な場所に残すこと」である。
- Hook V1は`UserPromptSubmit` / `PostToolUse` / `SubagentStart` / `SubagentStop` / `Stop`の5eventに限定する。
- Subagentは既存の未使用schema / collector基盤を活かしつつ、Hookから機械情報を自動生成する。
- Parentしか判断できない`parent_decision`等は自動生成せず、重要な判断がある場合だけREPORTへDecision / Rationaleとして残す。
- `Stop`は停止理由を取得するHookではなく、turn終了と最終assistant messageを観測するHookとして扱う。
- `run.json`はmachine-generated manifestとして残すが、Codexや人間が直接メンテナンスする文書として扱わない。
- `evaluation.json`は今回の主目的ではない。既存のoptional運用が成立しているなら変更しない。
- `observe.ps1|sh`はconfig未参照だけを理由に即削除せず、caller確認後に整理する。
- private chain-of-thoughtは保存対象にせず、共有可能なDecision / Rationaleとして意味情報だけを残す。
- Hook追加後に`codex-task log + Hook log + REPORT + Subagent Artifact + run.json`へ同じ情報が複製される設計は完了条件未達とする。
