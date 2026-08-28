# Codex HookによるRunログ自動化・既存観測機能整理プラン

## 0. 目的

Codex自身に`.codex/runs/<run_id>/REPORT.md`へ細かな行動を逐次記録させる現行運用を見直し、機械的に取得できる事実はCodex Hooksで自動収集する。

自動収集する対象は以下とする。

- どのような指示を受けたか。
- Hookで観測可能な範囲で、どのToolを実行したか。
- どのSubagentが開始・終了したか。
- Subagentが最終的に何を返したか。
- main turnがどの応答で終了したか。

一方、以下は機械ログへ無理に押し込まず、共有可能な意味情報として`REPORT.md`へcheckpoint単位で残す。

- なぜその方針を選んだか。
- Subagentへ何を任せたか。
- Subagentの結果をどう解釈したか。
- Parentが採用・一部採用・不採用・保留のどれを選んだか、その理由。
- blocker / Remaining / 重要な検証結果。

主眼は「ログを増やすこと」ではなく、**機械的な記帳を自動化し、AIにしか書けない意味情報だけをAIに書かせること**である。

---

## 1. 最終責務

### `PLAN.md` / `TASKS.md`

- 計画。
- 作業項目。
- 進捗。
- blocked item。

### `REPORT.md`

- 重要なDecision / Rationale。
- 計画変更。
- 重要な検証結果。
- blocker / Remaining。
- 前回checkpoint以降にSubagentを利用した場合のDelegation / Result / Parent decision要約。

### Hook JSONL

- `UserPromptSubmit`: 指示内容。
- `PostToolUse`: Hookで観測可能なTool実行。
- `SubagentStart`: Subagent開始。
- `SubagentStop`: Subagent終了と最終応答。
- `Stop`: main turn終了と最終assistant message。

Raw Hook JSONLは**ローカル詳細Evidence**であり、Git管理しない。

### `codex-task` JSONL / report JSON

- wrapper lifecycle。
- preflight。
- scope validation。
- schema validation。
- verify。
- command execution基盤の結果。

### `run.json`

- durableなmachine-readable snapshot。
- Hook / wrapper / validation等の集約結果。
- Subagentの機械metadata summary。
- Raw prompt、Raw Tool payload、Raw final messageは複製しない。

### `evaluation.json`

- 評価が必要なworkflowだけで利用する既存artifact。
- 今回は再設計しない。

---

## 2. 廃止する構成

今回の新構成では、以下を標準運用から廃止する。

- `.codex/templates/subagent-run.schema.json`
- 新規Runでの`.codex/runs/<run_id>/subagents/*.json`
- `scripts/collect-run-artifacts.py`内の`collect_subagents()`を中心とした旧Subagent Artifact走査・集約ロジック
- 上記Artifactを必須とするtests / docs / template記述

ただし、**過去Runに既に保存されている`subagents/*.json`は削除しない**。

廃止の意味は以下である。

- 新しいRunでは生成しない。
- 新しいcollectorでは正本として使わない。
- template / producer / consumer契約を新構成へ移行する。
- 過去履歴をcleanup目的で削除しない。

旧契約を維持するためだけの新producerや常設互換レイヤーは追加しない。

---

## 3. 完了条件（DoD）

### Hook基本動作

- [ ] 実装時点のCodex CLIで`UserPromptSubmit` / `PostToolUse` / `SubagentStart` / `SubagentStop` / `Stop`のpayload、stdout / exit semantics、Tool coverageを実機確認している。
- [ ] project-local Hookのtrust状態を確認し、Hookが実際に有効な状態でsmoke validationしている。
- [ ] logging Hookは観測専用で、Codexのprompt、Tool result、Subagent context、continuation判断を変更しない。
- [ ] logger内部の記録失敗時も、既存Codex作業を可能な限り止めない。
- [ ] 既存Bash `PreToolUse` safety Hookのblocking behaviorを変更しない。

### REPORT運用

- [ ] 「行動のたびにREPORTへ追記」「全commandをREPORTへ記録」の契約を廃止している。
- [ ] REPORT更新条件を以下の3つに固定している。
  1. TASK完了。
  2. blocker / 重要判断 / 計画変更。
  3. Run完了。
- [ ] Subagent start / stopごとにREPORTを編集しない。
- [ ] 前回checkpoint以降にSubagentを1つ以上利用した場合、次のTASK完了またはRun完了checkpointで`Delegation / Result / Parent decision`を1回だけ記録する。
- [ ] Subagentを使わなかったこと自体は毎回記録しない。
- [ ] private chain-of-thoughtは記録しない。

### 指示・Toolログ

- [ ] `UserPromptSubmit`でsanitized / bounded prompt copyとtruncated flagを記録できる。
- [ ] 既知credential / token形式をbest-effortでredactする。
- [ ] 任意のfree-form secretを完全検出できるとは扱わない。
- [ ] `PostToolUse`で`tool_name` / `tool_use_id`と必要最小限のbounded summaryを記録できる。
- [ ] `tool_input` / `tool_response`全文を保存しない。
- [ ] 全Tool共通の`success / failure`を無理に正規化しない。
- [ ] hosted `WebSearch`等、Hookで観測できないTool pathが存在することを明記する。
- [ ] delegation Toolを固定名称前提で実装しない。実機で得られる`tool_name`をgeneric `PostToolUse`として扱う。
- [ ] delegation inputを安全にbounded summary化できる場合だけRaw Hook eventへ残し、Subagent lifecycleとの完全correlation基盤は作らない。

### Subagentログ・集約

- [ ] `SubagentStart`で取得可能な`agent_id` / `agent_type` / `turn_id` / model / permission mode等をRaw Hook logへ記録できる。
- [ ] `SubagentStop`で取得可能な`agent_id` / `agent_type` / `agent_transcript_path` / `stop_hook_active` / bounded `last_assistant_message`等をRaw Hook logへ記録できる。
- [ ] Subagent start / stopは`agent_id`をstable keyとして相関し、時刻や「最新Subagent」等のheuristicを使わない。
- [ ] collectorはHookからunique `agent_id`単位で`run.json.subagents.records`を構築する。
- [ ] `started_at`は対象agentの最初の`SubagentStart` timestampとする。
- [ ] `ended_at`は対象agentの最後の`SubagentStop` timestampとする。
- [ ] `stop_observed`は1件以上の`SubagentStop`が存在する場合だけtrueとする。
- [ ] `incomplete`はStartまたはStopのどちらか一方が欠けるunique agent record数とする。
- [ ] 重複Hook eventを別Subagentとして二重計上しない。
- [ ] `SubagentStop`だけを根拠にsuccess / failureを推測しない。
- [ ] `last_assistant_message` / `agent_transcript_path`全文を`run.json`へ複製しない。
- [ ] `parent_decision` / `used_in_final_plan`等の意味判断をHook / `run.json`へ自動生成しない。
- [ ] `artifact_summary.subagent_run_count`は対象Runのunique `agent_id`数とする。
- [ ] `agents_used`はHookから取得できるunique `agent_type`を反映する。

### Run ID

- [ ] Run-managed executionは**1 Codex process/session = 1 Run ID**を原則とする。
- [ ] `codex-safe` / `codex-task`へRun IDを指定した場合だけ、Codex child processとそのHookへ`CODEX_RUN_ID`を伝播する。
- [ ] Run ID未指定時は最新Run等を推測しない。
- [ ] 同じinteractive Codex process内で別Runへ切り替えない。
- [ ] 別Runを開始する場合は現在のCodex process/sessionを終了し、新しいRun IDでwrapperから再起動する。
- [ ] wrapper終了後に親processの環境変数を元へ戻す。
- [ ] Run IDなしeventはglobal Hook logへ残してよいが、任意のRunへ推測集約しない。

### `run.json` durability

- [ ] Raw Hook JSONLはlocal-only詳細Evidence、`run.json`はdurable snapshotとして責務を明記している。
- [ ] canonical Hook sourceが存在する場合のみ、そのsourceからHook / Subagent summaryを再集約する。
- [ ] 既存`run.json`にHook / Subagent summaryが存在し、canonical Hook sourceが失われている場合、collectorは既存summaryを空値で上書きしない。
- [ ] 上記ケースではwarningを残し、既存snapshotを保持する。
- [ ] 新規RunでHook sourceも既存summaryもない場合は初期空summaryのままでよい。
- [ ] `run.json`へRaw prompt / Tool payload / main final message / Subagent final messageをコピーしない。
- [ ] Codexや人間が`run.json`を手編集しない。

### Manifest schema

- [ ] 新構成の`RUN_MANIFEST.json`は`schema_version = 2`とする。
- [ ] v2では旧Subagent Artifact依存fieldを廃止し、Hook直接集約用の最小Subagent構造にする。
- [ ] 既存v1 Runをcollector再実行だけで勝手にv2構造へ書き換えない。
- [ ] v1 Runを扱う場合はv1の既存Subagent sectionを保持し、明示migrationなしで破壊的変更しない。
- [ ] 新規Runはv2 templateから生成する。

### 旧Subagent Artifact削除の副作用

- [ ] `collect_subagents()`削除後も`agents_used`の情報源をHook `agent_type`へ置き換えている。
- [ ] `changed_files`はSubagent lifecycle Hookから復元せず、既存wrapper / git差分収集を正本とする。
- [ ] `safety.scope_violation`はSubagent lifecycle Hookから推測せず、既存scope validationを正本とする。
- [ ] 旧`subagents/*.json`の`changed_files` / `scope`を前提にした処理が残っていない。

### その他

- [ ] `evaluation.json`がstandard Runで既にoptionalなら、evaluation関連コード・schema・templateを変更しない。
- [ ] Raw JSONLはGit管理対象外のままである。
- [ ] Product code、ECサイト仕様、カリキュラム本体を変更していない。

---

## 4. 現状理解

- `.codex/config.toml`では`[features] hooks = true`になっている。
- 現在project configに登録されているHookはBash向け`PreToolUse` safety policyのみである。
- `.codex/hooks/observe.ps1` / `observe.sh`は観測用JSONL writerを持つが、現在の`.codex/config.toml`から直接呼ばれていない。
- `observe.ps1|sh`は`CODEX_HOOK_*`環境変数を入力契約としており、native Hook stdinを扱うcanonical loggerとしてそのまま使う前提にはしない。
- `.codex/logs/.gitignore`は`*.jsonl`をGit管理対象外にしている。
- `scripts/codex-safe.ps1|sh` / `codex-task.ps1|sh`はRun ID parameterを持つが、Hook向け`CODEX_RUN_ID`をCodex child processへ明示伝播していない。
- `scripts/collect-run-artifacts.py`は現在、`.codex/observations/hooks.jsonl`とRun-local `logs/*.jsonl`を主にHook sourceとして扱う。
- collectorのHook event一覧には`SubagentStart` / `SubagentStop`等があるが、`UserPromptSubmit`がない。
- `.codex/templates/hook-observation.schema.json`にも`UserPromptSubmit`がない。
- `.codex/templates/subagent-run.schema.json`は存在するが、現在の実装に自動producerは存在しない。
- `collect_subagents()`は旧Subagent Artifactから`run.json.subagents`だけでなく、`agents_used`、`changed_files`、`safety.scope_violation`へ影響している。
- 現行`RUN_MANIFEST.json`は`schema_version = 1`で、Subagent summaryに`read_only` / `writable` / `scope_violations` / `used_in_final_plan`等を持つ。
- 現行`AGENTS.md`では同じ会話session内でも別タスクなら新Runを作成できる。
- 現行`AGENTS.md`では`.codex/runs/<run_id>/run.json`等をdurableな標準Run Artifactとして扱う一方、再生成可能な生ログは長期保存対象外としている。
- 現行`.codex/templates/REPORT.md`は「行動のたびに追記」「コマンドや確認結果は必ず記録」としている。

---

## 5. Hook仕様前提

実装時点の公式仕様と実機結果を正とする。

### 共通

取得可能なeventでは以下を記録する。

- event
- timestamp
- session_id
- turn_id
- model
- permission_mode
- run_id（有効な`CODEX_RUN_ID`がある場合のみ）

### `UserPromptSubmit`

- `prompt`を受け取る。
- plain text stdoutはdeveloper contextとして追加されるため、観測専用loggerはstdoutへplain text / additional contextを出さない。

### `PostToolUse`

- `tool_name` / `tool_use_id` / `tool_input` / `tool_response`を受け取る。
- Bash / apply_patch / MCP / local function tool等を観測できる。
- hosted `WebSearch`等は観測対象外になり得る。
- delegation Toolは実機で得られる`tool_name`をgenericに扱い、名称固定の専用parserを作らない。

### `SubagentStart`

- `agent_id` / `agent_type` / `turn_id`等を受け取る。
- Raw eventへ機械情報だけ記録する。
- additional contextを注入しない。

### `SubagentStop`

- `agent_id` / `agent_type` / `agent_transcript_path` / `stop_hook_active` / `last_assistant_message`等を受け取る。
- success / failureを独自推測しない。
- 有効なno-op JSONだけをstdoutへ返し、Subagent continuationを要求しない。

### `Stop`

- `turn_id` / `stop_hook_active` / `last_assistant_message`を受け取る。
- 停止理由そのものは入力fieldとして提供されない。
- `stopReason`はHook出力fieldであり、入力停止理由として扱わない。
- 有効なno-op JSONだけをstdoutへ返し、main turn continuationを要求しない。

---

## 6. Non-goals

- `.codex/runs/`を廃止しない。
- Run管理基盤全体を再設計しない。
- active-run registry、DB、daemon、最新Run推測を作らない。
- Raw Hook JSONLをGitへ長期保存しない。
- 全Toolの完全監査ログを作らない。
- 全Toolのinput / response全文を保存しない。
- 全Toolの結果を共通statusへ正規化するframeworkを作らない。
- hosted / specialized toolを疑似Hookで無理に捕捉しない。
- delegation ToolとSubagent lifecycleの完全correlation基盤を作らない。
- Subagent専用の新しい永続JSON Artifactを作らない。
- Subagentの意味的な採否を`run.json`へ入れない。
- REPORT自然言語をparseして`run.json`を埋めない。
- `PreToolUse` safety policyを再設計しない。
- `evaluation.json`を今回の主目的として変更しない。
- Product codeやテスト対象機能を変更しない。

---

## 7. 実装中の停止条件

- 5つのlogging eventのいずれかが現行CLIでproject-scoped Hookから利用できない場合、wrapperへ疑似Hookを大量実装しない。利用可能なeventだけで最小構成を再評価する。
- Hook stdout / exit semanticsが公式仕様と実機で異なる場合、実機挙動を優先し、観測HookがCodexをsteerしないことを最優先する。
- project-local Hookがtrustされていない場合、trust問題を解消せずにlogger不良と判定しない。
- `observe.ps1|sh`に有効callerが存在する場合、callerを移行せずに削除しない。
- 旧Subagent Artifactにactive consumerがある場合、consumerを新構成へ移行してからtemplate / collector契約を削除する。
- 過去Run内の既存`subagents/*.json`は削除しない。
- Run IDを信頼できる形で取得できないeventを任意のRunへ紐付けない。
- 同一interactive Codex process内で新Runへの切替が必要になった場合、active-run切替機構を作らず、processを終了して新Run IDで再起動する。
- canonical Hook sourceが失われている既存Runをcollector再実行する場合、既存Hook / Subagent snapshotを空で上書きしない。
- v1 manifestを明示migrationなしでv2へ自動変換しない。
- prompt / Tool payloadから安全に扱えないfieldは保存対象から外す。
- logging Hookが既存safety Hookへ干渉する場合、safetyを優先してlogging scopeを縮小する。
- `run.json`へ追加したい情報がAI判断を必要とする場合、その情報はREPORTへ寄せる。

---

## 8. 影響範囲

### 実装開始時に確認するファイル

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

### Repo-wide literal search

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
- `scope_violation`
- `changed_files`
- `schema_version`
- `run.json`
- `evaluation.json`
- `EvaluationTemplate`
- `RequireEvaluation`

---

## 9. 実装方針

### Phase 1: 現行仕様・consumerを確定する

1. 現行Codex CLIで5eventのpayload / stdout / exit semantics / trustを実機確認する。
2. 旧`observe.*`のcallerを確認する。
3. `subagent-run.schema.json` / `subagents/*.json`のactive consumerを確認する。
4. `collect_subagents()`が現在担っている`subagents` / `agents_used` / `changed_files` / `scope_violation`責務を洗い出す。
5. `run.json` v1を読むconsumerを確認する。
6. standard Runでevaluationがoptionalであることを確認する。

### Phase 2: Run ID契約を固定する

- `codex-safe.ps1|sh` / `codex-task.ps1|sh`にRun IDが指定された場合、Codex child process実行中だけ`CODEX_RUN_ID=<run_id>`を設定する。
- Codex終了後は元の環境変数値を復元する。
- Run ID未指定時は何も推測しない。
- docs / `AGENTS.md`へ**1 Codex process/session = 1 Run ID**を明記する。
- 同一sessionで別タスクを新Runへ分離する必要がある場合、現在のCodex processを終了し、新Run IDでwrapperを再起動する。
- `new-run`の最新directory探索等は実装しない。

### Phase 3: canonical Hook loggerを1つ実装する

- cross-platform実装は原則Node `.mjs`を1つだけ用意する。
- native Hook stdin payloadを直接処理する。
- Raw eventは`.codex/logs/hooks-<safe-session-id>.jsonl`へ1event=1JSON lineでappendする。
- 1eventは1回のappend operationで完結させる。
- prompt / final message / Tool summaryは固定上限を設ける。
- redaction / truncateは共通helperへまとめる。
- 通常時にstdoutへdebug logを出さない。
- logger内部エラーは最小診断に留め、本作業を可能な限り継続させる。
- V1ではrotation / DB / 外部送信を実装しない。

#### `UserPromptSubmit`

- sanitized / bounded prompt copy。
- truncated flag。
- best-effort known-secret redaction。
- transcriptは読まない。
- contextを注入しない。

#### `PostToolUse`

- `tool_name` / `tool_use_id`。
- sanitized / bounded input summary。
- 必要なToolだけstableなbounded result metadata。
- input / response全文は保存しない。
- universal status parserを作らない。
- delegation Toolを名称固定で特別扱いしない。

#### `SubagentStart`

- `agent_id` / `agent_type` / common metadataをRaw Hook eventへ記録する。
- 専用Artifactは作らない。

#### `SubagentStop`

- `agent_id` / `agent_type` / `agent_transcript_path` / `stop_hook_active` / sanitized・bounded `last_assistant_message`をRaw Hook eventへ記録する。
- success / failureを推測しない。
- no-op JSON以外をstdoutへ返さない。

#### `Stop`

- `stop_hook_active` / sanitized・bounded `last_assistant_message`を記録する。
- stop reasonを推測しない。
- no-op JSON以外をstdoutへ返さない。

### Phase 4: Hook → `run.json`直接集約へ移行する

#### Hook source

- `.codex/logs/hooks-*.jsonl`をcanonical sourceとする。
- 対象Run IDと一致するeventだけ集約する。
- Run IDなしeventは対象Runへ含めない。
- `codex-task-*.jsonl`をHook sourceとして誤認しない。

#### Hook summary

- `UserPromptSubmit`を認識eventへ追加する。
- 5eventのevent countを集約する。
- Raw payloadをmanifestへコピーしない。

#### Subagent summary

unique `agent_id`単位でrecordを構築する。

```json
{
  "subagents": {
    "records": [
      {
        "agent_id": "<agent_id>",
        "agent_type": "<agent_type-or-null>",
        "model": "<model-or-null>",
        "turn_id": "<turn_id-or-null>",
        "started_at": "<first-start-timestamp-or-null>",
        "ended_at": "<last-stop-timestamp-or-null>",
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

集約規則:

- 最初の`SubagentStart`を`started_at`に使う。
- 最後の`SubagentStop`を`ended_at`に使う。
- Startだけなら`ended_at = null`、`stop_observed = false`。
- Stopだけでもrecordを捨てず、`started_at = null`として残す。
- `incomplete`はStart / Stopの片方が欠けるunique agent数。
- duplicate eventは別agentとして数えない。
- `last_assistant_message` / `agent_transcript_path`はrun.jsonへコピーしない。
- `agents_used`はunique `agent_type`から生成する。
- `artifact_summary.subagent_run_count`はunique `agent_id`数とする。

#### Raw sourceが失われた場合

- existing `run.json`に非空の`hook_observations` / `subagents`があり、canonical Hook sourceが存在しない場合は既存snapshotを保持する。
- 空summaryで上書きしない。
- `validation.warnings`等へ`hook_source_unavailable`相当のwarningを追加する。
- fresh Runでsourceも既存summaryもない場合は初期空summaryのままとする。
- Raw JSONLの存在を長期保存前提にしない。

### Phase 5: `RUN_MANIFEST.json` v2へ移行する

新規Run用templateを`schema_version = 2`へ変更する。

v2のSubagent summaryは以下へ簡素化する。

- `subagents.records`
- `subagents.summary.total`
- `subagents.summary.started`
- `subagents.summary.stopped`
- `subagents.summary.incomplete`
- `artifact_summary.subagent_run_count`
- `agents_used`

削除する旧summary:

- `read_only`
- `writable`
- `scope_violations`
- `used_in_final_plan`

v1 Runの扱い:

- collectorは`schema_version`を確認する。
- 既存v1 manifestを単なる再集約でv2へ書き換えない。
- v1の既存Subagent sectionは明示migrationなしでは保持する。
- 今回v1→v2の一括migration utilityは作らない。
- 新規Runだけv2 templateを使う。

### Phase 6: `collect_subagents()`廃止の副作用を分離する

旧`collect_subagents()`が担っていた情報は以下の正本へ移す。

- `run.json.subagents` → Hook lifecycle aggregation。
- `agents_used` → Hook `agent_type`。
- `changed_files` → 既存wrapper / git差分収集。
- `safety.scope_violation` → 既存scope validation。

Subagent Hookから`changed_files` / `scope_violation`を推測しない。

active consumer移行後に以下を削除する。

- `.codex/templates/subagent-run.schema.json`
- `collect_subagents()`。
- Run-local `subagents/*.json`を走査するcollector処理。
- 新規Runで旧Artifactを要求するtests / docs。

過去Run内の旧Artifactは残す。

### Phase 7: REPORTをcheckpoint要約へ変更する

REPORT更新条件は以下だけとする。

1. TASK完了。
2. blocker / 重要判断 / 計画変更。
3. Run完了。

常時項目:

- Summary。
- Progress。

該当時のみ:

- Changes。
- Decision / Rationale。
- Validation。
- Blocker / Remaining。
- Subagents。

Subagent要約ルール:

- 前回checkpoint以降にSubagentを利用した場合、次のTASK完了またはRun完了checkpointで1回記録する。
- 各Subagentについて必要な範囲で以下を書く。
  - Delegation: 何を任せたか / なぜ任せたか。
  - Result: 返却内容の要点。
  - Parent decision: 採用 / 一部採用 / 不採用 / 保留と理由。
- agent id、時刻、transcript path、Raw final message等はREPORTへ書かない。
- start / stopごとにREPORTを編集しない。
- 同じ意味情報を複数checkpointへ重複転記しない。

### Phase 8: cleanup / docs整合

#### `AGENTS.md`

- 各行動ごとのREPORT記録を廃止する。
- 1 Codex process/session = 1 Run IDを明記する。
- 別Run開始時はCodex process再起動を要求する。
- `run.json`をgenerated durable snapshotとして扱う。
- Subagentはcheckpoint semantic summaryのみREPORTへ残す。

#### `docs/reference/codex-implementation-harness.md`

- Hook raw log / wrapper log / REPORT / run.jsonの責務を明記する。
- Raw Hook logはlocal-only、run.json / REPORTはdurableであることを明記する。
- Run-managed executionはwrapperへRun IDを渡す。
- Tool Hookは完全監査ログではない。
- Stopは停止理由そのものを直接提供しない。
- Hook trust確認手順を必要最小限で記載する。

#### `observe.ps1|sh`

callerなし:

- canonical logger導入後に削除する。
- `.codex/observations/hooks.jsonl` fallbackと不要な`CODEX_HOOK_*`契約を整理する。

callerあり:

- callerをcanonical loggerへ移行する。
- 移行後に旧scriptを削除する。
- 安全に移行できない場合だけ理由をdocumentして残す。

#### `evaluation.json`

- standard Runでoptionalな既存挙動を維持する。
- 今回の変更で必須化しない。

---

## 10. 実行タスク

- [ ] 1. 現行Codex CLIで5eventのinput / stdout / exit semantics、Tool coverage、Hook trust状態を確認する。
- [ ] 2. repo-wide searchで旧Hook / Subagent Artifact / manifest v1 / collector / docs / testsのproducerとconsumerを確定する。
- [ ] 3. 旧`collect_subagents()`の`agents_used` / `changed_files` / `scope_violation`副作用の移行先を既存コード上で確定する。
- [ ] 4. `codex-safe.ps1|sh` / `codex-task.ps1|sh`へ明示Run IDの`CODEX_RUN_ID`伝播とrestoreを実装する。
- [ ] 5. `AGENTS.md`へ1 process/session = 1 Run契約を反映する。
- [ ] 6. canonical Hook loggerを1つ実装し、5eventをsanitized / bounded JSONLへ記録する。
- [ ] 7. `.codex/config.toml`へ5eventを接続し、既存Safety Hookを維持する。
- [ ] 8. active consumerがある場合だけ`hook-observation.schema.json`をV1 event / metadataへ最小修正する。
- [ ] 9. `collect-run-artifacts.py`をcanonical Hook sourceへ対応させ、Subagent eventをunique `agent_id`単位で集約する。
- [ ] 10. collectorへ「Raw Hook source不在時は既存durable snapshotを空で上書きしない」guardを追加する。
- [ ] 11. `RUN_MANIFEST.json`をv2へ変更し、新規Runだけv2で生成する。
- [ ] 12. v1 Runを自動v2 migrationしないguard / regression testを追加する。
- [ ] 13. `agents_used`はHook、`changed_files`は既存差分収集、`scope_violation`は既存scope validationへ責務を分離する。
- [ ] 14. active consumer移行後、`subagent-run.schema.json` / `collect_subagents()` / 新規Run向け旧Artifact tests / docsを削除する。過去Run Artifactは削除しない。
- [ ] 15. `AGENTS.md` / `.codex/templates/REPORT.md`をcheckpoint型へ変更し、Subagent semantic summaryの必須条件を固定する。
- [ ] 16. implementation harness docsを新責務・保存寿命・Run切替契約へ合わせる。
- [ ] 17. caller移行後、未使用`observe.ps1|sh`と旧`.codex/observations` fallback / 旧環境変数契約を整理する。
- [ ] 18. targeted tests / smoke validationを実行する。

---

## 11. 検証方法

### A. Hook lifecycle

同一session / turnで確認する。

1. `UserPromptSubmit`が記録される。
2. Hook対象Toolで`PostToolUse`が記録される。
3. Subagent起動で`SubagentStart`が記録される。
4. Subagent終了で`SubagentStop`が記録される。
5. main turn終了で`Stop`が記録される。
6. `session_id` / `turn_id` / `agent_id`で追跡可能なeventを相関できる。

### B. Hook非干渉性

- trust確認後にsmokeする。
- `UserPromptSubmit` / `SubagentStart`はcontextを注入しない。
- `PostToolUse`はdecision / feedback / continuationを返さない。
- `SubagentStop` / `Stop`は有効なno-op JSONだけを返す。
- logger failureでも可能な限り本作業を継続する。
- stdout debug printがない。

### C. Prompt / Tool安全性

- promptがbounded / sanitizedされる。
- truncate flagが残る。
- 代表的credential fixtureをredactできる。
- Tool input / response全文を保存しない。
- unknown Toolでもevent logging自体は壊れない。
- hosted Tool非捕捉をlogger failureと判定しない。

### D. Subagent集約

fixtureおよび実機で以下を確認する。

- Start + Stop → 1 record、first start / last stop。
- Start only → incomplete。
- Stop only → incomplete。
- duplicate Start / Stop → unique agent数は増えない。
- 複数agent並列 → agent_idが混同されない。
- Raw final message / transcript pathはrun.jsonへ入らない。
- `agents_used`はunique agent type。
- `subagent_run_count`はunique agent id。

### E. REPORT Subagent要約

- start / stopごとにREPORTを編集しない。
- 前回checkpoint以降にSubagent利用があれば、次checkpointで1回だけDelegation / Result / Parent decisionを記録する。
- 機械metadataをREPORTへ重複転記しない。
- private chain-of-thoughtを記録しない。

### F. Run ID切替

- Run Aでwrapper起動し、Hook eventがAへ集約される。
- 同じprocess内でRun Bへ切り替える機構が存在しない。
- Run BはRun A process終了後、新しいwrapper processで開始する。
- BのeventがAへ混入しない。
- wrapper終了後に親process環境変数を汚染しない。
- raw Codex / Run IDなしeventを任意Runへ推測集約しない。

### G. Raw source消失耐性

1. Hook sourceありでcollectorを実行し、run.jsonへHook / Subagent snapshotを生成する。
2. fixture Hook sourceを削除または利用不可にする。
3. collectorを再実行する。
4. 既存Hook / Subagent snapshotが空で上書きされないことを確認する。
5. source unavailable warningが残ることを確認する。

### H. Manifest v1 / v2

- 新規Runはschema v2で生成される。
- v2のSubagent summaryは`total / started / stopped / incomplete`のみを使う。
- 既存v1 fixtureをcollectorへ渡しても、明示migrationなしでv2構造へ破壊的変換されない。
- v1の既存Subagent sectionを保持できる。

### I. `collect_subagents()`削除回帰

- `agents_used`がHook agent typeから維持される。
- `changed_files`が既存差分収集から維持される。
- `safety.scope_violation`が既存scope validationから維持される。
- Subagent Hookからscope violationを推測していない。

### J. 旧Subagent Artifact廃止

- template schemaが新規運用から削除される。
- `collect_subagents()`が削除される。
- 新規Run向けdocs / testsに旧Artifact必須記述がない。
- 過去Run内の既存`subagents/*.json`を削除していない。
- 旧契約維持だけのproducer / compatibility layerを追加していない。

### K. Stop分析

- `Stop` / `SubagentStop`からstop reasonを捏造しない。
- blockerはREPORT、validation failureはwrapper log等、対応するEvidenceから確認する。
- Stop eventがない異常終了を理由不明として扱う。

### L. Safety / Git tracking

- 既存Bash Safety Hookが維持される。
- sandbox / approval / network policyに不要な差分がない。
- `.codex/logs/*.jsonl`がGit trackingされない。
- Product codeに差分がない。

### M. evaluation回帰

- standard Runでevaluationなしでも成功する。
- 既存挙動が満たされていればevaluation関連ファイルを変更しない。

---

## 12. 成功判定

- Raw Hook logから、ローカル環境では「指示 → Tool実行 → Subagent lifecycle → turn終了」の詳細を追える。
- `run.json`から、Raw Hook logが失われても既に集約済みのdurable machine snapshotを確認できる。
- `REPORT.md`から、重要な判断理由とSubagentの委任・結果・Parent decisionをcheckpoint単位で確認できる。
- Subagent専用Structured Artifactを新規生成する必要がない。
- Codexが細かな機械記帳をしなくても必要なEvidenceが残る。
- Run A / Run BのHook eventが混在しない。
- 旧v1 Runを再集約しただけで破壊しない。
- `collect_subagents()`廃止によって`changed_files` / `scope_violation`等の既存責務を失わない。
- Hook / wrapper / REPORT / run.json間に同じ情報の不要な多重記録がない。
- logging追加で既存safety behaviorが弱くなっていない。

---

## 13. リスク

- Codex CLI Hook仕様がversionによって変わる可能性がある。
- project-local Hookがtrustされていない場合、設定が正しくてもHookが実行されない。
- `UserPromptSubmit`には機密情報が含まれる可能性がある。
- Tool input / responseには機密情報や大容量データが含まれる可能性がある。
- Tool Hookは完全監査ログではない。
- Raw Hook JSONLはGit管理外なので、削除後は詳細時系列を復元できない。durableなのは`run.json` snapshotとREPORT意味要約である。
- `SubagentStop`だけでは成功 / 失敗を確定できない。
- delegation ToolとSubagent lifecycleの完全correlationはV1では保証しない。
- 複数Subagentが並列実行されるため、JSONL append破損をsmokeで確認する必要がある。
- 旧Subagent Artifactにactive consumerがある場合、削除前に移行が必要である。
- v1 / v2 manifestを混在させるため、collectorのversion guardが必要である。
- REPORTを軽量化しすぎるとDecision / Rationaleが失われるため、checkpoint意味要約は省略しない。

---

## 14. 成果物

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
- 関連targeted tests

### 廃止候補

- `.codex/templates/subagent-run.schema.json`
- 新規Run向け`subagents/*.json`前提のtests / docs
- `scripts/collect-run-artifacts.py`内の`collect_subagents()`と旧Subagent Artifact集約ロジック
- `.codex/hooks/observe.ps1`
- `.codex/hooks/observe.sh`
- `.codex/observations/`向け旧collector fallback
- 不要になった`CODEX_HOOK_*`環境変数契約

`observe.*`関連はcaller確認後に削除する。
過去Run内の既存`subagents/*.json`は削除しない。

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

既存挙動が本計画の完了条件を満たさない場合だけ必要最小限で変更する。

---

## 15. 備考

- Hook V1は`UserPromptSubmit` / `PostToolUse` / `SubagentStart` / `SubagentStop` / `Stop`の5eventに限定する。
- Raw Hook JSONLはlocal-only詳細Evidence、`run.json`はdurable machine snapshot、`REPORT.md`はdurable semantic summaryである。
- 1 Codex process/sessionに複数Run IDを持たせない。
- Subagent専用Structured Artifactは新規Runでは維持しない。
- `run.json`へ主観判断を入れない。
- `Stop`は停止理由を取得するHookとして扱わない。
- `run.json`はgenerated artifactであり、Codexや人間の手編集対象にしない。
- `evaluation.json`は今回の主目的ではない。
- private chain-of-thoughtは保存しない。
- Hook追加後に`Hook log + wrapper log + REPORT + run.json`へ同じ情報が不要に複製される設計は完了条件未達とする。
