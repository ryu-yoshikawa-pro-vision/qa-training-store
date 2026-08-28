# Codex HookによるRunログ自動化・既存観測機能整理プラン

## 0. 依頼概要

- Codex自身に`.codex/runs/<run_id>/REPORT.md`へ細かな行動を逐次記録させる現行運用を見直す。
- Codex Hooksを使い、以下の機械的事実を自動収集する。
  - どのような指示を受けたか。
  - Hookで観測可能な範囲で何を実行したか。
  - Subagentをいつ・どのagent typeで起動し、いつ終了したか。
  - Subagentが最終的に何を返したか。
  - main turnがどの応答で終了したか。
- 「なぜその方針を選んだか」「Subagentへ何を任せ、結果をどう扱ったか」は、逐語的な内部思考ではなく、共有可能なDecision / Rationale / checkpoint要約として`REPORT.md`へ残す。
- `.codex/runs/`は維持するが、`REPORT.md`は機械ログではなく意味のあるcheckpoint記録へ縮小する。
- `run.json`はCodexが手書きせず、既存の`new-run` / wrapper / collectorで機械生成・更新するmanifestとして扱う。
- `evaluation.json`は今回再設計しない。通常Runで既にoptionalな既存挙動を維持する。
- 現在の`.codex/templates/subagent-run.schema.json`および`.codex/runs/<run_id>/subagents/*.json`は、Codex native Subagent実行から自動生成される仕組みがなく、Parent judgementを含む重い構造化記録になっているため、今回の自動収集構成では廃止する。
- Subagentの機械情報はHook JSONLを正本とし、collectorがそこから`run.json.subagents`へ直接集約する。
- `.codex/hooks/observe.ps1` / `observe.sh`が実運用で未使用なら、新しいcanonical Hook loggerへ責務を統合したうえで整理する。

### 背景

- 現在の`AGENTS.md`と`.codex/templates/REPORT.md`では、調査・編集・判断・コマンド実行を含む細かな行動をCodex自身が`REPORT.md`へ記録する契約が残っている。
- `AGENTS.md`ではSubagent使用時も、委譲内容・結果要約・Parentの採用判断をParentが`REPORT.md`へ記録する契約になっている。
- `scripts/codex-task.ps1|sh`にはwrapper lifecycle / validation用JSONLログが既に存在する。
- `.codex/hooks/observe.ps1|sh`には観測用JSONL writerが存在するが、現在のproject-scoped Hook設定から直接利用されていない。
- `scripts/collect-run-artifacts.py`にはHook eventおよびRun-local `subagents/*.json`を`run.json`へ集約する基盤が既にある。
- `.codex/templates/subagent-run.schema.json`には`purpose` / `scope` / `changed_files` / `parent_decision` / `used_in_final_plan`等の主観・意味情報までrequiredで定義されているが、これらをHookだけから正確に自動生成することはできない。
- `scripts/new-run.*`、`codex-safe.*`、`codex-task.*`、現在のproject Hook設定には`subagents/*.json`のproducerが存在しない。
- Codex公式Hookには`UserPromptSubmit` / `PostToolUse` / `SubagentStart` / `SubagentStop` / `Stop`があり、Subagent lifecycleはnative Hookから観測できる。

### 期待成果

- Codexが記録作業のためだけに余計なファイル編集をしなくてよくなる。
- 指示、Tool実行、Subagent lifecycle、turn終了を後から時系列で分析できる。
- Subagentの開始・終了等の機械情報は完全自動で収集され、専用JSON ArtifactをParentが埋める必要がなくなる。
- Subagentへの委任意図・結果・Parentの採否は、TASK完了等のcheckpointで`REPORT.md`へ短くまとめる。
- `REPORT.md`には機械的事実ではなく、重要な判断理由・blocker・Remaining・Subagent利用の意味要約だけを残す。
- Hook log、wrapper log、`REPORT.md`、`run.json`の責務を重複させない。
- 既存の安全性・scope・validation基盤を壊さず、変更範囲を必要最小限に留める。

---

## 1. ゴール / 完了条件

### ゴール

Runの記録責務を以下へ整理する。

1. `PLAN.md` / `TASKS.md`
   - 計画、作業項目、進捗、blocked item。

2. `REPORT.md`
   - 重要なDecision / Rationale。
   - 計画変更。
   - 重要な検証結果。
   - blocker / Remaining。
   - Subagentを利用したcheckpointでは、委任内容・結果要約・Parentの採否を簡潔にまとめる。

3. Hook JSONL
   - `UserPromptSubmit`: どのような指示を受けたか。
   - `PostToolUse`: Hookで観測可能な範囲で、どのToolを実行したか。
   - `SubagentStart`: どのSubagentが開始したか。
   - `SubagentStop`: どのSubagentが終了し、どの最終結果を返したか。
   - `Stop`: main turnが終了した事実と、その時点の最終assistant message。

4. `codex-task` JSONL / report JSON
   - wrapper lifecycle、preflight、scope、schema validation、verify等。

5. `run.json`
   - Hook / wrapper / validation等の機械的事実を集約する自動生成manifest。
   - Subagent summaryもHook eventから直接自動集約する。

6. `evaluation.json`
   - 評価が必要なworkflowだけで利用する既存artifact。
   - 今回のHook導入では再設計しない。

### 廃止する中間Artifact

- `.codex/templates/subagent-run.schema.json`
- `.codex/runs/<run_id>/subagents/*.json`
- `scripts/collect-run-artifacts.py`内の`collect_subagents()`を中心としたSubagent Artifact走査・集約ロジック
- 上記Artifactを前提とするtests / docs / template field

### 完了条件（DoD）

- [ ] 実装時点のCodex CLIで`UserPromptSubmit` / `PostToolUse` / `SubagentStart` / `SubagentStop` / `Stop`のpayload、stdout / exit semantics、Tool coverageを実機確認している。
- [ ] project-local Hookのtrust状態を確認し、Hookが実際に有効な状態でsmoke validationしている。
- [ ] Codexが通常作業の各行動ごとに`REPORT.md`へ追記する契約を廃止している。
- [ ] `REPORT.md`の更新条件を「TASK完了」「blocker / 重要判断 / 計画変更」「Run完了」の3条件に固定している。
- [ ] Subagent start / stopごとにREPORTへ記帳しない。
- [ ] Subagentを使ったTASK完了checkpointでは、必要な場合に委任内容・結果要約・Parentの採否を簡潔に1回まとめる。
- [ ] `UserPromptSubmit`で指示内容のsanitized / bounded copyをJSONLへ記録できる。
- [ ] promptが上限超過した場合、切り詰められたことをログから判別できる。
- [ ] promptに含まれる既知のcredential / token形式はbest-effortでredactし、任意のfree-form secretを完全検出できるとは扱わない。
- [ ] `PostToolUse`で`tool_name` / `tool_use_id`と必要最小限のbounded summaryを記録できる。
- [ ] 全Tool共通の`success / failure`を無理に正規化しない。
- [ ] Hosted `WebSearch`等、Hookで観測できないTool pathが存在することを明記し、「ログにない = 実行していない」と判断しない。
- [ ] `SubagentStart`で`agent_id` / `agent_type` / `turn_id` / model / permission mode等の取得可能な機械情報を記録できる。
- [ ] `SubagentStop`で`agent_id` / `agent_type` / `agent_transcript_path` / `stop_hook_active` / bounded `last_assistant_message`等を記録できる。
- [ ] Subagentの開始・終了は`agent_id`をstable keyとして相関し、時刻や「最新Subagent」等のheuristicで紐付けない。
- [ ] `spawn_agent`等のTool inputから委任内容を安全にbounded summary化できる場合はRaw Hook logへ残すが、Subagentとのcorrelationを無理に構築しない。
- [ ] `parent_decision` / `used_in_final_plan`等の意味判断をHook / run.jsonへ自動生成しない。
- [ ] `.codex/templates/subagent-run.schema.json`と`subagents/*.json`標準Artifactを廃止している。
- [ ] active consumerがある場合は、新構成へ移行してから旧Subagent Artifact契約を削除し、互換レイヤーを常設しない。
- [ ] `scripts/collect-run-artifacts.py`がHookの`SubagentStart` / `SubagentStop`から`run.json.subagents`を直接集約できる。
- [ ] `run.json.subagents.records`はRaw final messageやtranscript本文を複製せず、機械的metadataだけを保持する。
- [ ] `artifact_summary.subagent_run_count`は対象Runのunique `agent_id`数から算出する。
- [ ] `run.json.agents_used`はHookから取得できるunique `agent_type`を機械的に反映する。
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
- [ ] `run.json`ではRaw prompt / Tool payload / last messageを複製せず、event count / log path / Subagent metadata等の集約情報だけを保持する。
- [ ] `codex-safe` / `codex-task`へRun IDを指定した場合だけ、Codex child processとそのHookへ信頼できる`CODEX_RUN_ID`を伝播できる。
- [ ] Run IDなしeventを「最新Run」等へ推測で関連付けない。
- [ ] Run IDなしSubagentはglobal Hook logには残すが、任意のRunへ推測集約しない。
- [ ] `run.json`はCodexが手編集せず、既存の機械生成経路だけで生成・更新される。
- [ ] `evaluation.json`がstandard Runで既にoptionalなら、evaluation関連コード・schema・templateを変更しない。
- [ ] 既存Bash `PreToolUse` safety Hookのblocking behaviorを変更しない。
- [ ] Raw JSONLはGit管理対象外のままである。
- [ ] Product code、ECサイト仕様、カリキュラム本体を変更していない。

---

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
- `.codex/templates/subagent-run.schema.json`は存在するが、現在の実装にはこれを自動生成するproducerが存在しない。
- 現在のcollectorはRun-local `subagents/*.json`が存在する場合だけ`run.json.subagents` / `subagent_run_count` / `agents_used`等へ集約する。
- 現在の`RUN_MANIFEST.json`の`subagents.summary`は`read_only` / `writable` / `scope_violations` / `used_in_final_plan`等、旧Subagent Artifactの意味情報を前提としているため、新しいHook直接集約に合わせて簡素化が必要である。
- `scripts/new-run.*`は`run.json`の初期manifestを生成できる。
- 現在の`codex-task`ではevaluation template / requireは明示optionであり、標準defaultでは無効になっている。
- 現在の`.codex/templates/REPORT.md`は「行動のたびに追記」「コマンドや確認結果を必ず記録」としている。

### Codex Hookの前提

実装時点の公式仕様を正とするが、計画時点では以下を前提とする。

- 共通入力には`session_id`、`cwd`、`hook_event_name`、`model`等があり、turn-scoped Hookには`turn_id`がある。
- `UserPromptSubmit`は`prompt`を受け取り、plain text stdoutはdeveloper contextとしてCodexへ追加されるため、観測専用Hookではstdoutを空にする。
- `PostToolUse`は`tool_name`、`tool_use_id`、`tool_input`、`tool_response`を受け取る。
- `PostToolUse`はBash、`apply_patch`、MCP、その他多くのlocal function toolを観測できるが、hosted `WebSearch`等は観測対象外であり、一部specialized pathもopt-out可能である。
- `SubagentStart`は`agent_id` / `agent_type` / `turn_id`等を受け取る。
- `SubagentStop`は`agent_id` / `agent_type` / `agent_transcript_path` / `stop_hook_active` / `last_assistant_message`等を受け取る。
- `Stop`は`turn_id` / `stop_hook_active` / `last_assistant_message`を受け取る。停止理由そのものは入力fieldとして提供されない。
- `SubagentStop` / `Stop`はexit 0時にJSON stdoutを期待するため、観測専用loggerはno-op JSONだけを返す。
- `stopReason`はHookからCodexへ返す出力fieldであり、Codexが停止した理由を受け取る入力fieldではない。
- project-local Hookは実行環境でtrustされている必要があるため、設定ファイルを追加しただけで動作すると仮定しない。

### Assumptions

- Node.jsは既存実行基盤なので、cross-platform loggerを1つ置く場合の第一候補とする。
- Run IDなしinteractive eventをRunへ紐付けるためのactive-run registry、DB、daemon、最新Run推測は追加しない。
- Hook実行processへ`CODEX_RUN_ID`等の信頼できる既存Run IDが継承される場合だけ`run_id`を記録する。
- Hook logの目的は分析可能なEvidenceを残すことであり、完全な監査証跡を構築することではない。
- Subagentの結果全文はRaw Hook logに保持し、`run.json`へ複製しない。
- Subagentの委任意図・結果要約・採否はParent agentがcheckpoint時にREPORTへ簡潔にまとめる。
- V1ではlog rotation、外部転送、DB化を行わない。

### Non-goals

- `.codex/runs/`を廃止しない。
- Run管理基盤全体を再設計しない。
- `RUN_MANIFEST.json`へ主観評価fieldを増やさない。
- `evaluation.json`を今回の主目的として再設計しない。
- `PLAN.md` / `TASKS.md`を機械生成へ置き換えない。
- 逐語的な内部思考・private chain-of-thoughtをログへ保存しない。
- 全Toolのinput / responseを無条件保存しない。
- 全Toolの結果を共通statusへ正規化するframeworkを作らない。
- Hookで観測できないhosted / specialized toolを別の疑似Hookで無理に捕捉しない。
- Subagent専用の永続JSON Artifactを新たに作らない。
- Subagentの意味的な採否判断をrun.jsonへ自動生成しない。
- `spawn_agent`とSubagent lifecycleの完全correlation基盤を作らない。
- `PreToolUse` safety policyを再設計しない。
- 外部ログサービス、DB、常駐processを導入しない。
- Product codeやテスト対象機能を変更しない。

### 実装中の停止条件

- 5つのlogging eventのいずれかが現行CLIでproject-scoped Hookから利用できない場合、wrapperへ疑似Hookを大量実装して補わない。利用可能なeventだけで最小構成を再評価する。
- Hook commandのstdout / exit挙動が公式仕様と実機で異なる場合、現行実機仕様を優先し、観測HookがCodexをsteerしないことを最優先する。
- project-local Hookがtrustされていない場合、trust状態を解決せずに「Hookが動かない」と実装不良判定しない。
- `observe.ps1|sh`に有効なcallerが存在する場合、callerを移行せずに削除しない。
- `subagent-run.schema.json` / `subagents/*.json`にactive consumerがある場合、そのconsumerを新しいHook / run.json構成へ移行してから削除する。旧契約を残すためだけの常設互換レイヤーは追加しない。
- Run IDを信頼できる形で取得できないeventは、Runへ推測で紐付けない。
- prompt / Tool payloadから安全に扱えないfieldは保存対象から外す。
- logging Hookが既存safety Hookへ干渉する場合、safetyを優先してlogging scopeを縮小する。
- `run.json`へ追加しようとする情報がAI判断を必要とする場合、その情報はmanifestへ入れずREPORTへ寄せる。

---

## 3. 影響範囲

### Files to inspect

実装開始時に最低限以下を再確認する。

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
- `scripts/new-run.ps1`
- `scripts/new-run.sh`
- `scripts/codex-safe.ps1`
- `scripts/codex-safe.sh`
- `scripts/codex-task.ps1`
- `scripts/codex-task.sh`
- `scripts/collect-run-artifacts.py`
- `docs/reference/codex-implementation-harness.md`
- `docs/reference/codex-safety-harness.md`
- 関連する`scripts/tests/**`

### Repo-wide search

以下をliteral searchし、producer / consumer / docs / testsに分類する。

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
- `collect_subagents`
- `subagent_run_count`
- `used_in_final_plan`
- `parent_decision`
- `agents_used`
- `run.json`
- `evaluation.json`
- `EvaluationTemplate`
- `RequireEvaluation`

---

## 4. 変更方針

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
- Run-managed workflowでは、Run-local aggregationを行いたい場合はwrapperへ同じRun IDを渡すことをdocsへ明記する。

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
- `spawn_agent`等のdelegation Toolを専用の永続Artifactへ変換しない。
- delegation inputを安全にbounded summary化できる場合はRaw Hook event内へ残す。
- stdoutへdecision / feedback / additionalContextを返さない。

#### `SubagentStart`

- `agent_id` / `agent_type`等、native payloadから取得できる機械情報をRaw Hook eventへ記録する。
- Subagent専用JSON fileは作成しない。
- stdoutへplain text / additionalContextを出さない。

#### `SubagentStop`

- `agent_id` / `agent_type` / `agent_transcript_path` / `stop_hook_active` / sanitized・bounded `last_assistant_message`等をRaw Hook eventへ記録する。
- `SubagentStop`が来たことだけを根拠に「成功」と断定しない。
- `parent_decision` / `used_in_final_plan`を生成しない。
- Subagent専用JSON fileは更新しない。
- exit 0 + 有効なno-op JSON stdoutを返し、Subagent continuationを要求しない。

#### `Stop`

- `stop_hook_active`とsanitized / bounded `last_assistant_message`を保存する。
- truncated flagを保存する。
- `stopReason`を入力から取得しようとしない。
- logger側で停止理由を分類・推測しない。
- exit 0 + 有効なno-op JSON stdoutを返し、main turn continuationを要求しない。

### Phase 3: Subagent Artifactを廃止し、Hook → run.jsonへ直接集約する

#### 廃止方針

- `.codex/templates/subagent-run.schema.json`を削除する。
- `.codex/runs/<run_id>/subagents/*.json`を標準Run Artifactとして扱わない。
- `scripts/collect-run-artifacts.py`の`collect_subagents()`およびSubagent Artifact走査ロジックを削除する。
- Subagent Artifactを生成・検証・参照するtests / docs / template記述を削除または新構成へ移行する。
- active consumerがある場合は、Hook / `run.json.subagents`へconsumerを移行してから旧契約を削除する。
- 旧Artifactを維持するためだけの新producerや互換レイヤーは作らない。

#### `run.json.subagents`

collectorが対象RunのRaw Hook eventから直接構築する。

`records`へ残すのは機械的に確定できる情報だけとする。

例:

```json
{
  "subagents": {
    "records": [
      {
        "agent_id": "<agent_id>",
        "agent_type": "code_researcher",
        "model": "<model-or-null>",
        "turn_id": "<turn_id-or-null>",
        "started_at": "<timestamp-or-null>",
        "ended_at": "<timestamp-or-null>",
        "stop_observed": true
      }
    ],
    "summary": {
      "total": 1,
      "started": 1,
      "stopped": 1,
      "incomplete": 0
    }
  }
}
```

- `records`はunique `agent_id`単位で構築する。
- `SubagentStart`のみ存在する場合は`ended_at=null` / `stop_observed=false`とする。
- `SubagentStop`のみ存在する異常・欠損ケースでもeventを捨てず、取得できる情報だけでrecord化する。
- `status=success`等の意味評価は入れない。
- Raw `last_assistant_message`をrun.jsonへコピーしない。
- `agent_transcript_path`はRaw Hook logにのみ残し、run.jsonへコピーしない。
- `parent_decision` / `used_in_final_plan` / `purpose` / `scope` / `changed_files`等の主観・別責務情報はrun.jsonへ入れない。
- `artifact_summary.subagent_run_count`はunique `agent_id`数を使用する。
- `agents_used`はunique `agent_type`から機械的に生成する。

#### `RUN_MANIFEST.json`

現在の旧Subagent Artifact依存fieldをHook直接集約向けに簡素化する。

削除対象:

- `subagents.summary.read_only`
- `subagents.summary.writable`
- `subagents.summary.scope_violations`
- `subagents.summary.used_in_final_plan`

追加・維持候補:

- `subagents.records`
- `subagents.summary.total`
- `subagents.summary.started`
- `subagents.summary.stopped`
- `subagents.summary.incomplete`
- `artifact_summary.subagent_run_count`
- `agents_used`

主観評価fieldは追加しない。

### Phase 4: REPORTを意味要約へ限定する

現行の「行動のたびに追記」を廃止し、更新条件を次の3つに固定する。

1. `TASKS.md`の1タスクを完了したとき。
2. blocker、重要な新規判断、または計画変更が発生したとき。
3. Runを完了するとき。

記録項目は空欄埋めを要求しない。

#### 常時

- Summary
- Progress

#### 該当時のみ

- Changes
- Decision / Rationale
- Validation
- Blocker / Remaining
- Subagents

#### `Subagents`の扱い

TASK完了またはRun完了checkpointまでにSubagentを利用した場合、必要な範囲で各Subagentについて次の意味要約を1回だけ残す。

- Delegation: 何を任せたか / なぜ任せたか。
- Result: 何が返ってきたかの要点。
- Parent decision: 採用 / 一部採用 / 不採用 / 保留と、その理由。

例:

```text
Subagents:
- code_researcher
  - Delegation: Hook実装の既存collector影響範囲を調査。
  - Result: collectorとRUN_MANIFESTのSubagent集約が旧Artifact依存と判明。
  - Parent decision: 採用。Hook直接集約へ変更。
```

- start / stop時刻、agent id、transcript path、Raw final message等はREPORTへ転記しない。
- 同じSubagentについてstart / stopごとにREPORTを編集しない。
- Parent decisionは共有可能な判断理由だけを書き、逐語的な内部思考は書かない。
- Subagentを使わなかったこと自体を毎回REPORTへ記載する義務は設けない。

### Phase 5: Collector / docs / cleanupを整合させる

#### `scripts/collect-run-artifacts.py`

- `.codex/logs/hooks-*.jsonl`を明示的に走査する。
- `UserPromptSubmit`をHook event一覧へ追加する。
- `SubagentStart` / `SubagentStop`をHook event countとして維持する。
- `run_id`が対象Runと一致するeventだけHook summaryへ集約する。
- Run IDなしeventは対象Runへ含めない。
- `codex-task-*.jsonl`をHook logとして誤認しない。
- 旧`.codex/observations/hooks.jsonl`を廃止する場合、legacy fallbackを削除する。
- Raw prompt / Tool input / response / main last message / Subagent final messageをrun.jsonへ複製しない。
- `collect_subagents()`とRun-local `subagents/*.json`走査を削除する。
- `SubagentStart` / `SubagentStop`からunique `agent_id`単位で`run.json.subagents`を構築する。
- malformed / partial lifecycle eventがあってもcollector全体を不必要に失敗させない。

#### `AGENTS.md`

- 「各行動をREPORTへ記録する」契約を外す。
- Subagent使用時に委譲内容・結果要約・Parent採用判断をstart / stop単位で逐次記録する運用にはしない。
- TASK完了 / Run完了checkpointで、Subagent利用があった場合に意味要約をまとめる契約へ変更する。
- `run.json`をgenerated manifestとして明記する。

#### docs

- `docs/reference/codex-implementation-harness.md`へHook log / wrapper log / REPORT / run.jsonの責務を明記する。
- Subagent専用Artifactは廃止し、Hook raw evidence + run.json machine summary + REPORT semantic summaryを正式運用とする。
- Run-local aggregationを必要とするRun-managed executionではwrapperへRun IDを渡すことを明記する。
- Tool Hookは完全な監査ログではないことを明記する。
- `Stop`は停止理由そのものを直接提供するeventではないことを明記する。
- project-local Hookのtrust確認手順を必要最小限で記載する。

#### `observe.ps1|sh`整理

- callerなし:
  - 新logger導入後に`observe.ps1` / `observe.sh`を削除する。
  - `.codex/observations/hooks.jsonl`専用fallbackと不要になった`CODEX_HOOK_*`契約を整理する。
- callerあり:
  - callerをcanonical loggerへ移行する。
  - 移行完了後に旧scriptを削除する。
  - 安全に移行できない場合だけ残し、その理由をdocumentする。

#### `evaluation.json`

- standard Runで既にoptionalならコード、schema、templateは変更しない。
- 今回の変更によってevaluation生成を新たに必須化しない。
- strict / 明示的評価workflowの既存挙動を壊さないことだけ確認する。

---

## 5. 実行タスク

- [ ] 1. 現行Codex CLIで5eventのinput / stdout / exit semantics、Tool coverage、Hook trust状態を実機確認する。
- [ ] 2. repo-wide searchで`observe.*`、Subagent schema / Artifact、Hook schema、collector、RUN_MANIFEST、Run ID関連のproducer / consumer / docs / testsを確定する。
- [ ] 3. `subagent-run.schema.json` / `subagents/*.json`のactive consumerを新しいHook / run.json構成へ移行する方針を確定する。
- [ ] 4. `codex-safe.ps1|sh` / `codex-task.ps1|sh`で、明示Run IDだけをCodex child / Hookへ安全に伝播する。
- [ ] 5. canonical Hook loggerを1つ実装し、共通metadata、prompt、Tool、Subagent lifecycle、Stop情報をsanitized / bounded JSONLとして記録する。
- [ ] 6. `.codex/config.toml`へ5eventを接続し、既存Safety Hookを維持する。
- [ ] 7. active consumerがある場合だけ`hook-observation.schema.json`をV1 event / metadataへ最小修正する。
- [ ] 8. `collect-run-artifacts.py`をcanonical Hook logへ対応させ、Subagent eventをunique `agent_id`単位で`run.json.subagents`へ直接集約する。
- [ ] 9. `RUN_MANIFEST.json`のSubagent sectionを機械情報だけの最小構造へ変更する。
- [ ] 10. `.codex/templates/subagent-run.schema.json`、`collect_subagents()`、Run-local `subagents/*.json`前提のtests / docsを削除する。
- [ ] 11. caller移行後、未使用`observe.ps1|sh`と旧`.codex/observations` fallback / 旧環境変数契約を整理する。
- [ ] 12. `AGENTS.md` / `.codex/templates/REPORT.md`をcheckpoint型へ変更し、Subagent利用はcheckpoint時の意味要約だけにする。
- [ ] 13. implementation harness docsを新責務へ合わせる。evaluationは既にoptionalなら変更しない。
- [ ] 14. targeted test / smoke validationを実行し、Raw JSONLがGit tracking対象外であることを確認する。

---

## 6. 検証方法

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

### E. Subagent Hook / run.json直接集約

Run IDありのwrapper経由でSubagentを1回以上起動して確認する。

- `SubagentStart` / `SubagentStop`がRaw Hook JSONLへ記録される。
- Subagent専用JSON fileが生成されない。
- collector実行後、unique `agent_id`単位で`run.json.subagents.records`が生成される。
- start / stop双方があるagentは`started_at` / `ended_at` / `stop_observed=true`になる。
- startだけのagentは`ended_at=null` / `stop_observed=false`で残る。
- stopだけの欠損ケースもeventを捨てず、取得可能情報だけでrecord化する。
- `last_assistant_message` / `agent_transcript_path`をrun.jsonへコピーしない。
- `artifact_summary.subagent_run_count`がunique agent数と一致する。
- `agents_used`がunique agent typeと一致する。
- 複数Subagentを並列実行してもagent idが混同されない。

### F. REPORT Subagent要約

Subagentを使うTASKを1つ実行し、TASK完了checkpointで確認する。

- start / stopごとにREPORTを編集していない。
- checkpointでSubagent利用をまとめて1回記録している。
- 各Subagentについて必要な範囲でDelegation / Result / Parent decisionが確認できる。
- agent id、時刻、transcript path、Raw final message等の機械情報をREPORTへ複製していない。
- Parent decisionには共有可能な判断理由だけを記録し、private chain-of-thoughtを記録していない。

### G. Run ID correlation

- `codex-safe --run-id` / `codex-task --run-id`相当の経路でHookに同じRun IDが伝播する。
- wrapper終了後に親processの環境変数を汚染しない。
- Run IDなしでraw Codexを起動した場合、global Hook logには記録される。
- Run IDなしeventを任意のRunへ集約しない。
- 「最新Run」推測が存在しない。

### H. Stop分析

- `Stop` eventが通常turn終了時に記録される。
- `stop_hook_active`とbounded `last_assistant_message`を記録できる。
- `stopReason`を入力fieldとして読もうとしていない。
- loggerが停止理由を推測するfieldを生成しない。
- blocker / RemainingがあるケースではREPORTから理由を確認できる。
- validation / wrapper failureがあるケースでは`codex-task` logから事実を確認できる。

### I. Collector / `run.json`

- 5eventのevent countが集約される。
- 対象Run IDと一致するeventだけを数える。
- Run IDなしeventを対象Runへ含めない。
- `codex-task-*.jsonl`をHook logとして誤認しない。
- malformed lineで集約全体を壊さない。
- `run.json`へRaw prompt / Tool payload / main final message / Subagent final message全文をコピーしない。
- 旧`subagents/*.json`が存在しなくてもSubagent summaryを生成できる。
- Codexが`run.json`を手編集しなくてもmanifestを維持できる。

### J. 旧Subagent Artifact廃止

- `.codex/templates/subagent-run.schema.json`が削除されている。
- `collect_subagents()`とRun-local `subagents/*.json`走査が削除されている。
- docs / tests / templatesに旧Artifact必須の記述が残っていない。
- 旧Artifactを生成する新しいproducerを追加していない。
- active consumerがある場合は新構成へ移行済みである。

### K. Safety / Git tracking

- 既存Bash `PreToolUse` safety policyが引き続き動く。
- logging Hook failureがsafety判定を上書きしない。
- sandbox / approval / network policyを変更していない。
- `.codex/logs/*.jsonl`が`git status`へ出ない。
- Product codeに差分がない。

### L. evaluation回帰

- standard Runでevaluationなしでも既存どおり成功できる。
- 既に満たしている場合、evaluation関連実装・schema・templateには差分を入れない。

---

## 7. 成功判定

- Raw Hook logから「どの指示で」「Hookで観測可能な範囲でどのToolを使い」「どのSubagentを起動し」「どの応答でturnを終えたか」を追える。
- `run.json.subagents`から、Subagentのagent type、開始・終了、未完了の機械的状態を確認できる。
- Subagent専用JSON ArtifactをCodex自身が作成・更新する必要がない。
- `REPORT.md`から、Subagentへ何を任せ、結果をどう受け取り、Parentがどう判断したかをcheckpoint単位で確認できる。
- `REPORT.md`から「なぜその方針を選んだか」「何がblockerだったか」を追える。
- Stop eventだけから停止理由を断定せず、Stop / REPORT / wrapper logを組み合わせて事実ベースで分析できる。
- Codexが細かな記帳をしなくても必要なEvidenceが残る。
- Hook logger自身がCodexのprompt、Tool result、Subagent context、turn継続判断へ介入しない。
- `run.json`はCodex手編集なしで維持できる。
- standard Runで不要なevaluation変更を行っていない。
- Hook / wrapper / REPORT / run.json間に同じ情報の不要な多重記録がない。
- logging追加で既存safety behaviorが弱くなっていない。

---

## 8. リスク

- Codex CLI Hook仕様がversionによって変わる可能性がある。
- project-local Hookがtrustされていない場合、設定が正しくてもHookが実行されない。
- `UserPromptSubmit`には機密情報が含まれる可能性があり、best-effort redactionでは任意のfree-form secretを完全には除去できない。
- Tool input / responseには機密情報や大容量データが含まれる可能性があるため、全文保存を避ける必要がある。
- Tool Hookにはhosted `WebSearch`等の非対象pathがあるため、完全な行動監査ログにはならない。
- `Stop` payloadだけでは「なぜ停止したか」は分からない。
- `SubagentStop`だけでは成功 / 失敗を必ずしも判定できないため、run.jsonでsuccess / failureを推測しない。
- `spawn_agent`等のdelegation ToolとSubagent lifecycleを完全にcorrelationできないversionがある可能性がある。V1では完全correlationを要求しない。
- 複数Subagentが並列実行されるため、session JSONLへのappendは1event=1回のappend operationで破損しないことを検証する必要がある。
- 旧Subagent Artifactにactive consumerがある場合、削除前に新構成へ移行する必要がある。
- `CODEX_RUN_ID`伝播はwrapper経由Runだけに限定し、raw Codexへactive-run推測を導入しない。
- `observe.ps1|sh`がproject config外から利用されている可能性がある。
- REPORTを軽量化しすぎるとDecision / RationaleやSubagent利用の意味が失われるため、checkpoint要約は維持する必要がある。

---

## 9. 成果物

### 確定変更候補

- `.codex/config.toml`
- `AGENTS.md`
- `.codex/templates/REPORT.md`
- `.codex/templates/RUN_MANIFEST.json`
- canonical Hook logger 1ファイル
- `scripts/codex-safe.ps1`
- `scripts/codex-safe.sh`
- `scripts/codex-task.ps1`
- `scripts/codex-task.sh`
- `scripts/collect-run-artifacts.py`
- `docs/reference/codex-implementation-harness.md`
- 関連するtargeted tests

### 廃止候補

- `.codex/templates/subagent-run.schema.json`
- Run-local `subagents/*.json`前提のtests / docs
- `scripts/collect-run-artifacts.py`内の`collect_subagents()`と旧Subagent Artifact集約ロジック
- `.codex/hooks/observe.ps1`
- `.codex/hooks/observe.sh`
- `.codex/observations/`向け旧collector fallback
- 不要になった`CODEX_HOOK_*`環境変数契約

`observe.*`関連はcaller確認後に削除する。

### 利用実態確認後、必要な場合だけ変更

- `.codex/templates/hook-observation.schema.json`
- `.codex/logs/.gitignore`
- `.gitignore`
- `docs/reference/codex-safety-harness.md`

### 原則変更しない

- `.codex/templates/EVALUATION.md`
- `.codex/templates/evaluation.schema.json`
- `scripts/new-run.ps1`
- `scripts/new-run.sh`

既存挙動が本計画の完了条件を満たさない場合だけ、原則変更しないファイルを必要最小限で変更する。

---

## 10. 備考

- 主眼は「ログを増やすこと」ではなく、「機械的に取得できる事実は自動収集し、AIにしか書けない意味情報だけREPORTへ残すこと」である。
- Hook V1は`UserPromptSubmit` / `PostToolUse` / `SubagentStart` / `SubagentStop` / `Stop`の5eventに限定する。
- Subagentについては、専用Structured Artifactを維持しない。
- Subagentの機械情報はHook JSONLをRaw Evidenceとし、`run.json.subagents`へ直接自動集約する。
- Subagentの委任意図・結果要約・Parentの採否はTASK完了またはRun完了checkpointでREPORTへ簡潔にまとめる。
- `run.json`へ主観判断を入れない。
- `Stop`は停止理由を取得するHookではなく、turn終了と最終assistant messageを観測するHookとして扱う。
- `run.json`はmachine-generated manifestとして残すが、Codexや人間が直接メンテナンスする文書として扱わない。
- `evaluation.json`は今回の主目的ではない。既存のoptional運用が成立しているなら変更しない。
- `observe.ps1|sh`はconfig未参照だけを理由に即削除せず、caller確認後に整理する。
- private chain-of-thoughtは保存対象にせず、共有可能なDecision / Rationaleとして意味情報だけを残す。
- Hook追加後に`Hook log + wrapper log + REPORT + run.json`へ同じ情報が不要に複製される設計は完了条件未達とする。
