# Codex HookによるRunログ自動化・既存Subagent記録廃止プラン

## 0. 目的

Codex自身に`.codex/runs/<run_id>/REPORT.md`へ細かな行動を逐次記録させる現行運用を見直し、**機械的に取得できる事実はCodex Hooksで自動収集し、AIにしか書けない意味情報だけをREPORTへ残す**。

今回の主目的は次の2点である。

1. 指示、Tool実行、Subagent開始・終了関連event、Stop eventなどの機械的な行動記録をHookへ移し、Codex自身の逐次記帳を減らす。
2. 現在手動記録を前提としているSubagent専用JSON Artifactを、運用だけでなく関連機能まで廃止する。

`run.json`自体の自動生成・自動更新は維持する。ただし、新HookログやSubagent lifecycleを`run.json`へ新規集約する仕組みは追加しない。

新Hookが生成するJSONLはnative Hook payloadの生保存ではなく、必要fieldだけを抽出・redaction・truncationした**session単位のローカル詳細ログ**とする。`.codex/logs/*.jsonl`は従来どおりGit管理しない。

---

## 1. 最終的な責務

### `PLAN.md` / `TASKS.md`

- 計画。
- 作業項目。
- 進捗。
- blocked item。

### `REPORT.md`

checkpoint単位で、AIにしか残せない意味情報を記録する。

- 重要なDecision / Rationale。
- 計画変更。
- 重要な検証結果。
- blocker / Remaining。
- Subagentを利用した場合のDelegation / Result / Parent decision。

全command、全Tool call、Subagent start / stop、native payload、Raw final messageはREPORTへ逐次転記しない。

`REPORT.md`の既存append-only契約は維持する。今回変更するのは**記録頻度と記録内容だけ**であり、過去checkpointを削除・置換・並べ替えない。

### Hook JSONL

以下5eventを自動記録する。

- `UserPromptSubmit`: 受けた指示。
- `PostToolUse`: Hookで観測可能なTool実行。
- `SubagentStart`: SubagentStart eventの観測。
- `SubagentStop`: SubagentStop eventの観測と、その時点のassistant message / `stop_hook_active`。
- `Stop`: Stop eventの観測と、その時点のassistant message / `stop_hook_active`。

`SubagentStop` / `Stop`をlogger単独で「最終終了」と断定しない。他のmatching Hookがcontinuationを要求する可能性があるため、loggerは**eventを観測した事実だけ**を記録する。

保存先:

```text
.codex/logs/hooks-<safe-session-id>.jsonl
```

責務:

- Codex session単位のmachine-readableなローカル詳細ログ。
- 1event = 1 JSON line。
- Git管理しない。
- Run単位ではなくsession単位で保存する。
- 同じCodex session内で複数Runを扱った場合、同一JSONLに複数Runのeventが混在し得る。
- V1ではRun IDを付与せず、Run単位のmachine audit / correlationは提供しない。
- Run単位で長期保存する意味・判断・進捗は`REPORT.md`を正本とする。

native Hook stdin全文は保存しない。

### `codex-task` JSONL / report JSON

既存責務を維持する。

- wrapper lifecycle。
- preflight。
- scope validation。
- schema validation。
- verify。
- command execution基盤の結果。

Hook JSONLとは別責務とし、既存のGit管理方針を変更しない。

### `run.json`

既存のmachine-generated manifestとして維持する。

- `new-run` / `codex-task` / collectorによる自動生成・自動更新を維持する。
- Codexや人間が手編集しない。
- Hook JSONLを新しい入力源として追加しない。
- Subagent lifecycleを`run.json`へ新規集約しない。
- 旧Subagent JSON専用fieldは新規v2 manifestから廃止する。
- 独立active dependencyのない旧Hook observation専用fieldも新規v2 manifestから廃止する。

### `evaluation.json`

- 評価が必要なworkflowだけで利用する既存artifact。
- 今回は再設計しない。

---

## 2. Subagent専用JSON機能の廃止

### 新規Runで廃止するもの

- `.codex/templates/subagent-run.schema.json`
- `.codex/runs/<run_id>/subagents/*.json`を作成・更新する運用
- `scripts/collect-run-artifacts.py`内の`collect_subagents()`
- Run-local `subagents/*.json`の走査 / validation / aggregation
- 旧Subagent JSONを前提とするtests / docs / AGENTS / template記述
- `parent_decision` / `used_in_final_plan` / Subagent `scope` / Subagent `changed_files`等、旧Subagent JSONからだけ生成していたmanifest集約処理

### 過去Run

**過去Runに既に存在する`subagents/*.json`は削除・書換えしない。**

- 新しいRunでは生成しない。
- 新しい標準運用では参照しない。
- 過去Artifactを維持するためだけの新producerやmigration utilityは作らない。

### `run.json`への影響

新規v2 manifestから以下の旧Subagent JSON専用fieldを削除する。

- `subagents`
- `artifact_summary.subagent_run_count`
- `subagents.summary.read_only`
- `subagents.summary.writable`
- `subagents.summary.scope_violations`
- `subagents.summary.used_in_final_plan`

`agents_used`はrepo-wideでproducer / consumerを確認して判断する。

- 旧Subagent JSONとは独立したactive producerが存在する場合は、fieldとそのproducer責務を維持する。
- `collect_subagents()`だけが実質producerである場合は、新規v2 manifestから`agents_used`も削除する。
- 実際にSubagentを使ったのに`agents_used: []`となるような虚偽のmachine-generated fieldは残さない。
- `agents_used`を維持するためだけに新Hookから`run.json`へ集約する仕組みは追加しない。

`collect_subagents()`削除後は以下をSubagent Hookから復元しない。

- `changed_files`: 既存wrapper / git差分等の非Subagent経路を正本とする。
- `safety.scope_violation`: 既存scope validationを正本とする。
- `agents_used`: 独立producerがある場合だけその既存経路を維持する。

### active dependencyの判定

今回明示的に廃止するSubagent legacy stack自身は、削除停止条件となる`active consumer / producer`に数えない。

legacy stackには少なくとも以下を含む。

- `collect_subagents()`
- Run-local `subagents/*.json`のvalidation / aggregation
- `subagent-run.schema.json`
- 旧Subagent JSONだけを前提とするmanifest集約
- 旧Subagent JSONだけを前提とするtests / docs / template記述

停止条件にするのは、legacy stack**外**に存在する独立したruntime caller / workflow / consumerが旧Subagent JSONまたはその専用fieldを必要としている場合だけとする。

---

## 3. 旧Hook observation機能の整理

新Hook loggerは`.codex/logs/hooks-<session_id>.jsonl`へ記録し、`run.json`へ集約しない。

旧`.codex/observations/hooks.jsonl`を前提とした観測機能は、legacy stack外に独立したactive dependencyがない場合に削除する。

### legacy stackとして削除する対象

- `.codex/hooks/observe.ps1`
- `.codex/hooks/observe.sh`
- 不要になった`CODEX_OBSERVATION_LOG`
- 不要になった`CODEX_HOOK_*`環境変数契約
- `.codex/observations/hooks.jsonl`専用reference
- `scripts/collect-run-artifacts.py`の`collect_hook_observations()`
- collectorの`--hook-log`引数
- `scripts/collect-run-artifacts.ps1`の`HookLog` parameterと`--hook-log` forwarding
- collector内の旧観測用`HOOK_EVENTS`定義（他責務がない場合）
- 旧Hook observationからだけ行っていたsafety summary更新
- `.codex/templates/hook-observation.schema.json`（独立consumer / validationがない場合）
- 新規v2 manifestの`hook_observations`
- 新規v2 manifestの`artifact_summary.hook_event_count`
- 上記旧observer機能だけを対象とするtests / docs
- `scripts/cleanup-runs.ps1`の`.codex/observations/hooks.jsonl`専用`hook_log` cleanup branch
- `scripts/cleanup-runs.sh`の`.codex/observations/hooks.jsonl`専用`hook_log` cleanup branch

`cleanup-runs.ps1/sh`の`.codex/logs/*.jsonl`に対するgeneric cleanupは維持する。新しい`hooks-<session-id>.jsonl`はこの既存generic cleanupで扱い、新しいrotation / cleanup基盤を追加しない。

`scripts/collect-run-artifacts.sh`は引数をそのままPythonへ転送するだけであり、旧Hook observation専用logicがない限り変更しない。

### active dependencyの判定

今回削除する旧observer legacy stack自身は、削除停止条件となる`active producer / consumer`に数えない。

停止条件にするのは、legacy stack**外**に存在する別script / workflow / runtime caller / consumerが以下のいずれかを必要としている場合だけとする。

- `.codex/observations/hooks.jsonl`
- `--hook-log` / `HookLog`
- 旧Hook observation schema
- `hook_observations`
- `artifact_summary.hook_event_count`
- 旧observerだけが生成しているsafety field

`cleanup-runs.ps1/sh`の旧`.codex/observations/hooks.jsonl`専用cleanupはlegacy stack内部の補助機能であり、独立consumerとは扱わない。

独立dependencyがある場合は、そのdependencyを今回無理に新loggerへmigrationせず、影響するlegacy producer / fieldの削除を見送り、別タスクとする。

### Safety fieldの扱い

旧Hook observation由来のsafety fieldも`agents_used`と同じ原則で扱う。

- 旧observerとは独立したactive producerがあるfieldは、そのproducerとfieldを維持する。
- 旧observerだけがproducerで、legacy stack外のactive consumerもないfieldは、新規v2からfieldごと削除する。
- 旧observerだけがproducerで、legacy stack外のactive consumerがそのfieldを必要としている場合は、そのfield / producerの削除を今回見送り、migrationを別タスクとする。
- fieldを残すためだけに旧observer producer / collectorを温存しない。

### 削除しないもの

- `.codex/config.toml`の既存Safety `PreToolUse`
- `.codex/hooks/pre_tool_use_policy.mjs`
- `.codex/hooks/pre_tool_use_policy_windows.ps1`
- Safety Hook本体のblocking behavior
- 旧observer以外の経路で使われているsafety / validation情報
- `cleanup-runs.ps1/sh`の`.codex/logs/*.jsonl` generic cleanup

Safety Hookと旧observation logger / aggregationは別責務として扱う。

---

## 4. Manifest v2

Subagent専用field、および独立active dependencyのない旧Hook observation fieldを新規Runから削除するため、新規Run向けmanifestは`schema_version = 2`とする。

version migration基盤は作らない。

### 新規v2

以下の**全manifest writer**をv2構造へ揃える。

- `.codex/templates/RUN_MANIFEST.json`
- `scripts/collect-run-artifacts.py`の`default_manifest()` fallback
- `scripts/codex-task.ps1`の`Write-RunManifest`
- `scripts/codex-task.sh`の`write_run_manifest`

要件:

- `scripts/new-run.*`は既存どおりtemplateを使って新規`run.json`を自動生成する。
- `codex-task.ps1/sh`が新規v2 `run.json`を旧v1構造で上書きしない。
- v2 manifestには削除済み旧Subagent fieldを新規生成しない。
- `agents_used`は§2のproducer / consumer確認結果に従う。
- 旧Hook observation / safety fieldは§3の独立producer / consumer確認結果に従う。
- collectorのmerge処理、`codex-task.ps1/sh`の既存manifest merge処理の双方で、削除済みv1専用fieldをv2 manifestへ再注入しない。
- validation、safety、changed files、report、evaluation等の既存非廃止対象の自動更新は維持する。

### 既存v1

v1互換は**legacy dataの保持だけ**を目的とする。

- 過去v1 `run.json`を一括migrationしない。
- 過去Runをcleanup目的で書換えない。
- collectorまたは`codex-task`で既存v1 manifestを明示的に処理する場合、既存legacy fieldの値を破壊的に削除しない。
- v1を処理しただけでv2へ自動昇格させない。
- v1→v2 migration command / converter / registryを作らない。

v1互換のために以下の旧機能を温存しない。

- 過去`subagents/*.json`の再走査 / validation / aggregation
- 旧Hook observationの再収集 / 再集約
- 廃止する旧schema validation
- 廃止するproducer / consumerを`schema_version == 1`分岐の中へ残すこと

つまり、**v1 backward compatibility = existing field value preservation**であり、**legacy feature preservationではない**。

### 最小判定

- 新規 / v2 manifest: v2構造だけを生成・更新する。
- 既存v1 manifest: existing legacy field valueを保持し、今回のcleanupで破壊的に削除しない。
- 複雑な複数version frameworkは作らない。

---

## 5. Hook V1

### 対象event

`.codex/config.toml`へ、既存Safety `PreToolUse`とは別に以下5eventを接続する。

1. `UserPromptSubmit`
2. `PostToolUse`
3. `SubagentStart`
4. `SubagentStop`
5. `Stop`

Logging Hookは各eventのsupported occurrenceをすべて記録する。

- Logging Hookではmatcherを原則省略する。
- 既存Safety `PreToolUse`だけは現在の`matcher = "^Bash$"`を維持する。
- Logging HookへSafety HookのBash限定matcherを流用しない。
- hosted / specialized Tool等、Codex Hook自体で観測できない経路を疑似的に補完しない。

### canonical logger

canonical loggerは以下に固定する。

```text
.codex/hooks/log_event.mjs
```

logging logicはこの1ファイルだけに実装する。PowerShell / shellへ同じlogging logicを二重実装しない。

### cross-platform起動とevent固定引数

5eventすべてで同じNode loggerを利用し、**config側からexpected event名を固定CLI引数として渡す**。

loggerの**起動path自体もrepository root基準で解決する**。相対`.codex/hooks/log_event.mjs`をsession `cwd`から直接解決してはならない。

概念形:

```text
Unix:
node "$(git rev-parse --show-toplevel)/.codex/hooks/log_event.mjs" UserPromptSubmit
node "$(git rev-parse --show-toplevel)/.codex/hooks/log_event.mjs" PostToolUse
...

Windows:
既存Safety Hookのcommand_windowsと同じrepository-root解決方式で
<repo-root>\.codex\hooks\log_event.mjs <EventName>
```

要件:

- Unix系: `command`は`git rev-parse --show-toplevel`等、既存Safety Hookと同等の方法でrepo rootを解決してから`.codex/hooks/log_event.mjs <EventName>`を起動する。
- Windows: `command_windows`も既存Safety Hookと同じrepository-root解決方式を使い、session `cwd`に依存せず同じ`.codex/hooks/log_event.mjs <EventName>`を起動する。
- `command` / `command_windows`で相対`.codex/hooks/log_event.mjs`を直接実行しない。
- path quotingは空白を含むrepository pathでも動くことを前提にする。
- 5つのLogging Hookはすべて`timeout = 5`秒とする。
- Safety `PreToolUse`の既存timeout / matcher / blocking behaviorは変更しない。
- Windowsでは5eventを実機smokeする。
- Unix系では同じloggerを起動できることと代表eventを最低1件smokeする。

CLI引数のevent名は**stdout契約を決定する正本**とする。native payloadの`hook_event_name`は正常payloadの整合確認と記録に利用する。

- payloadの`hook_event_name`がexpected eventと一致する正常系では記録する。
- malformed JSONやevent mismatchではログを書かず、stderrへ最小診断を出す。
- malformed JSONやevent mismatchでもlogging HookはCodex本作業をblockせず、expected eventに対応するstdout契約を守ってexit 0する。

これにより、payload parse前にevent別stdout契約を確定できる。

### 保存先

Hook JSONLは以下へ1event = 1 JSON lineでappendする。

```text
.codex/logs/hooks-<safe-session-id>.jsonl
```

- session idはsafe filename化する。
- `.codex/logs/*.jsonl`は既存どおりGit管理外を維持する。
- 1eventは1回のappend operationで書き込む。
- 通常時はstdoutへdebug出力しない。
- V1ではrotation、DB、外部送信、active-run registryを実装しない。

保存先は`process.cwd()`やnative payloadの`cwd`を基準にしない。

- `.codex/hooks/log_event.mjs`自身の`import.meta.url`から`.codex/hooks/`を解決し、その親`.codex/`配下の`logs/`を保存先とする。
- repositoryのsubdirectoryからCodexを開始してもrepository root配下の`.codex/logs/`へ記録する。
- 保存先解決のためだけにlogger内部で毎event `git rev-parse`等のsubprocessを追加しない。repo-root解決はconfig側の起動pathだけに使う。

### sanitization / bounded log

保存前に以下を行う。

1. 必要fieldだけnative payloadから取得する。
2. text値にbest-effort secret redactionを適用する。
3. `TEXT_PREVIEW_MAX_CHARS = 2000`を共通上限としてtruncateする。
4. sanitization後の値だけJSONLへappendする。

共通仕様:

- logger observation timestampは`new Date().toISOString()`相当のUTC ISO 8601。
- `prompt` / `tool_input_preview` / `last_assistant_message`は同じ2000文字上限。
- native payload全文を保存しない。
- transcript本文 / transcript pathを保存しない。
- credential / token / Authorization等の代表形式をbest-effortでredactする。
- arbitrary free-form secretの完全検出は保証しない。
- private chain-of-thoughtを保存しない。
- Tool別parserやAI要約処理を作らない。
- Git管理しないため、Hook JSONL専用のcommit前secret scannerやdurable schema管理は追加しない。

### failure-safe / stdout

loggingはbest-effortとし、Codex本作業をprimaryとする。

- directory作成、JSON parse、event整合確認、sanitization、append等のlogging処理に失敗してもCodex本作業をblockしない。
- logger内部errorはstderrへ最小診断を出してよい。
- logging Hookはexit 0とする。
- logger hang時もconfig側の5秒timeoutで長時間停止させない。

expected eventごとのstdoutは、正常時・logging失敗時・malformed payload時とも以下に固定する。

- `UserPromptSubmit`: stdoutなし
- `PostToolUse`: stdoutなし
- `SubagentStart`: stdoutなし
- `SubagentStop`: `{}`
- `Stop`: `{}`

`SubagentStop` / `Stop`ではcontinuation / blockを要求するfieldを返さない。

### `UserPromptSubmit`

最低限記録する。

- event
- logger observation timestamp
- session_id
- turn_id（取得できる場合）
- sanitized / bounded prompt
- truncated flag

### `PostToolUse`

最低限記録する。

- event
- logger observation timestamp
- session_id
- turn_id（取得できる場合）
- tool_name
- tool_use_id
- sanitized / bounded `tool_input_preview`
- truncated flag

`tool_input_preview`は以下だけで生成する。

1. `tool_input`をgenericにJSON serializationする。
2. 共通sanitizationを適用する。
3. 共通2000文字上限でtruncateする。

以下は行わない。

- Tool別にcommand / path / delegation等を解析してsummary化
- `tool_input` / `tool_response`全文保存
- Tool result summary engine
- generic `success / failure`推定
- delegation Tool固定名称の特別実装
- hosted `WebSearch`等の疑似捕捉

### `SubagentStart`

最低限記録する。

- event
- logger observation timestamp
- session_id
- turn_id（取得できる場合）
- agent_id
- agent_type

Subagent専用JSON fileは作らず、REPORTもeventごとに編集しない。

### `SubagentStop`

最低限記録する。

- event
- logger observation timestamp
- session_id
- turn_id（取得できる場合）
- agent_id
- agent_type
- sanitized / bounded last_assistant_message
- stop_hook_active
- truncated flag

以下は行わない。

- Subagent専用JSON file作成 / 更新
- `SubagentStop`だけを根拠にsuccess / failure推定
- `SubagentStop`だけを根拠に「これが最終終了」と推定
- `parent_decision` / `used_in_final_plan`生成
- agent transcript本文 / transcript path保存

`stop_hook_active`はnative payloadの値をそのままbooleanとして保存し、最終終了判定には変換しない。stdoutは`{}`とする。

### `Stop`

最低限記録する。

- event
- logger observation timestamp
- session_id
- turn_id（取得できる場合）
- sanitized / bounded last_assistant_message
- stop_hook_active
- truncated flag

停止理由や最終終了を推測せず、存在しない`stopReason`を入力fieldとして読もうとしない。`stop_hook_active`はnative payloadの値をそのままbooleanとして保存する。stdoutは`{}`とする。

---

## 6. REPORT運用変更

現行の「行動のたびに追記」「commandや確認結果を必ず記録」を廃止する。

### append-only契約

既存の`REPORT.md` append-only契約は維持する。

- 過去checkpointを削除しない。
- 過去checkpointを置換しない。
- 過去checkpointを並べ替えない。
- Summary / Progressを更新する場合も、既存記録を書換えるのではなく新しいcheckpointとして追記する。

今回変更するのは記録頻度と内容だけである。

### 更新条件

REPORTへ新checkpointを追記するのは以下だけとする。

1. `TASKS.md`の1タスクを完了したとき。
2. blocker / 重要判断 / 計画変更が発生したとき。
3. Runを完了するとき。

### 記録項目

常時:

- Summary
- Progress

該当時のみ:

- Changes
- Decision / Rationale
- Validation
- Blocker / Remaining
- Subagents

空欄を埋めるためだけの項目は書かない。

### Subagent要約

前回checkpoint以降にSubagentを1つ以上利用した場合、次のTASK完了またはRun完了checkpointで、各Subagentについて必要な意味情報を**1回だけ**記録する。

```text
Subagents:
- code_researcher
  - Delegation: Hook実装の既存機能への影響を調査。
  - Result: 旧Subagent JSON依存箇所を確認。
  - Parent decision: 採用。該当機能を今回削除する。
```

REPORTへ以下を転記しない。

- agent id
- start / stop timestamp
- transcript path
- Raw final message全文
- 全Tool call
- 全prompt

Subagentを使わなかったこと自体は毎回記録しない。

既存REPORT templateにある今回と無関係なSafety用section（例: `Deletion candidates`）は削除しない。

---

## 7. `run.json`運用

### 維持すること

- `run.json`はmachine-generated manifestのまま維持する。
- `scripts/new-run.*`による初期生成を維持する。
- `scripts/codex-task.ps1/sh` / collector等による既存の非廃止対象の自動更新を維持する。
- Codexや人間による手編集を要求しない。
- validation / report / safety / changed files / evaluation等、今回の廃止対象と無関係な既存機能を壊さない。

### 今回やらないこと

- Hook JSONLを`run.json`へ新規集約しない。
- `SubagentStart` / `SubagentStop`から`run.json.subagents`を新規生成しない。
- `agents_used`を維持するためだけにHook→`run.json`集約を追加しない。
- `CODEX_RUN_ID`伝播を新設しない。
- `1 Codex process = 1 Run`という新しい運用制約を導入しない。
- active-run registryを作らない。
- HookとRunを完全correlationする基盤を作らない。

session単位のローカル詳細ログで今回の目的を満たすため、Run correlationは追加しない。

---

## 8. 実装前のrepo-wide確認

最低限以下をliteral searchし、legacy stack内部か、legacy stack外の独立producer / consumer / callerか、docs / testsかに分類する。

### Subagent旧機能

- `subagent-run.schema.json`
- `subagents/`
- `collect_subagents`
- `subagent_run_count`
- `used_in_final_plan`
- `parent_decision`
- `agents_used`
- `scope_violations`

### 旧Hook observation

- `observe.ps1`
- `observe.sh`
- `CODEX_OBSERVATION_LOG`
- `CODEX_HOOK_EVENT`
- `.codex/observations`
- `hook-observation.schema.json`
- `collect_hook_observations`
- `--hook-log`
- `HookLog`
- `hook_observations`
- `hook_event_count`
- `SafetyBlocked`
- `ObservationError`
- `delete_attempt_blocked`
- `git_mutation_attempt_blocked`
- `cleanup-runs.ps1`
- `cleanup-runs.sh`
- `hook_log`

### Hook log / config

- `.codex/logs/.gitignore`
- `.codex/logs`
- `hooks-*.jsonl`
- `log_event.mjs`
- `hooks.UserPromptSubmit`
- `hooks.PostToolUse`
- `hooks.SubagentStart`
- `hooks.SubagentStop`
- `hooks.Stop`
- `matcher`
- `timeout`
- `command_windows`
- `hook_event_name`
- `stop_hook_active`
- `git rev-parse --show-toplevel`

### Manifest / writer

- `schema_version`
- `RUN_MANIFEST.json`
- `default_manifest`
- `merge_manifests`
- `Write-RunManifest`
- `write_run_manifest`
- `artifact_summary`
- `hook_observations`
- `subagents`
- `agents_used`
- `run.json`
- `evaluation.json`

### tests

- `tests/contracts/codex-hook-contract.test.ts`
- 旧Subagent JSONの生成・validation・aggregationを前提とするtests
- 旧Hook observation / HookLogを前提とするtests
- manifest v1 fieldを固定期待するtests

### 停止条件

- 今回明示的に廃止するlegacy stack内部のproducer / consumer / callerは停止理由にしない。
- `cleanup-runs.ps1/sh`の旧`.codex/observations/hooks.jsonl`専用cleanupはlegacy stack内部として扱い、停止理由にしない。
- legacy stack外に旧Subagent JSONまたはその専用fieldを必要とする独立active dependencyがある場合、そのdependencyを移行せずに影響する機能を削除しない。
- `agents_used`に旧Subagent JSONとは独立したactive producer / consumerがある場合、その責務を削除しない。
- `agents_used`の独立producerがない場合、虚偽の空fieldを新規v2へ残さない。
- legacy stack外に旧Hook observationまたはその専用fieldを必要とする独立active dependencyがある場合、そのdependencyを今回migrationせず、影響するlegacy producer / fieldの削除を見送る。
- 旧observerだけがproducerのsafety fieldについて、legacy stack外のactive consumerがなければfieldをv2から削除し、field維持のためだけに旧collectorを温存しない。
- 旧observerだけがproducerのsafety fieldをlegacy stack外のactive consumerが必要としている場合、そのfield / producer削除を今回見送り、migrationを別タスクとする。
- manifest writerのどれかがv1構造をhard-codeしている場合、v2へ揃えずに完了扱いにしない。
- v1互換のために`collect_subagents()` / `collect_hook_observations()`等の廃止機能をversion分岐内へ残さない。
- logging Hookが既存Safety Hookへ干渉する場合、safetyを優先してlogging scopeを縮小する。
- Hook仕様が実機と計画で異なる場合、現行Codex CLIの実機仕様を優先する。
- `command` / `command_windows`がsession `cwd`依存の相対`.codex/hooks/log_event.mjs`を実行する場合は完了扱いにしない。
- repository subdirectoryから起動してもrepo-root基準でloggerを起動できない場合は完了扱いにしない。
- Windowsで`command_windows`からrepo-root基準の`.codex/hooks/log_event.mjs <EventName>`を起動できない場合、Windows Hook動作を未検証のまま完了扱いにしない。
- Hook JSONLがGit管理対象になっている場合は、既存方針どおりignoreへ戻してから完了する。
- Logging HookにSafety用のBash限定matcherが誤って設定されている場合は完了扱いにしない。
- Logging Hookのtimeoutが未設定または長すぎる場合は完了扱いにしない。
- loggerが`cwd`依存で別階層の`.codex/logs`へ出力する場合は完了扱いにしない。
- malformed payload時にexpected event別stdout契約を守れない場合は完了扱いにしない。
- `SubagentStop` / `Stop`をlogger側で最終終了と推定している場合は完了扱いにしない。

---

## 9. 実行タスク

- [ ] 1. 現行Codex CLIで5eventのinput / stdout / exit semantics、Tool coverage、`SubagentStop` / `Stop`の`stop_hook_active`を実機確認する。
- [ ] 2. repo-wide searchで旧Subagent JSON、`agents_used`、旧Hook observation、旧observer由来safety field、`HookLog`、`cleanup-runs.ps1/sh`、全manifest writer、docs、testsを確認し、legacy stack内部とlegacy stack外の独立dependencyを切り分ける。
- [ ] 3. `.codex/hooks/log_event.mjs`をcanonical Node Hook loggerとして実装する。expected event名をCLI引数で受け、5eventをsanitized / bounded JSONLへ記録し、malformed payloadやlogging失敗時もevent別stdout契約を守る。`SubagentStop` / `Stop`では`stop_hook_active`を保存し、最終終了を推定しない。
- [ ] 4. `.codex/config.toml`へ5eventを接続する。Logging Hookではmatcherを省略する。Unix `command` / Windows `command_windows`の双方で既存Safety Hookと同等のrepo-root解決を行い、そこから`.codex/hooks/log_event.mjs <EventName>`を起動する。相対`.codex/hooks/log_event.mjs`をsession `cwd`から直接実行しない。5eventすべて`timeout = 5`とする。既存Safety `PreToolUse`は変更しない。
- [ ] 5. `.codex/logs/*.jsonl`が既存どおりGit管理外であることを確認する。Hook JSONL専用のGit追跡例外は追加しない。
- [ ] 6. `AGENTS.md` / `.codex/templates/REPORT.md`を新責務へ変更する。逐次行動記録を廃止しつつ、REPORTのappend-only契約は維持する。
- [ ] 7. Subagent利用時はcheckpointで`Delegation / Result / Parent decision`だけをまとめる契約へ変更する。
- [ ] 8. `.codex/templates/subagent-run.schema.json`を削除する。
- [ ] 9. `collect_subagents()`とRun-local `subagents/*.json`のvalidation / aggregation機能を削除する。legacy stack内部の存在を削除停止理由にしない。
- [ ] 10. 旧Subagent JSON専用のmanifest field / tests / docsを新規Run向け構成から削除する。`agents_used`は独立producerが存在する場合だけ維持し、存在しなければv2から削除する。
- [ ] 11. 旧Hook observationについて、legacy stack外に独立dependencyがなければ`observe.ps1|sh`、旧環境変数契約、`collect_hook_observations()`、`--hook-log`、`scripts/collect-run-artifacts.ps1`の`HookLog`契約、旧Hook manifest field、関連schema / tests / docsを削除する。
- [ ] 12. 旧observer廃止時は`cleanup-runs.ps1/sh`の`.codex/observations/hooks.jsonl`専用cleanup branchを削除する。一方、`.codex/logs/*.jsonl`のgeneric cleanupは維持し、新Hook JSONLの既存cleanup経路として利用する。
- [ ] 13. 旧observer由来safety fieldをproducer / consumer単位で確認し、独立producerがあるfieldは維持、旧observerだけがproducerかつ独立consumerがないfieldはv2から削除する。field維持のためだけに旧observerを温存しない。
- [ ] 14. 新規Run向け`RUN_MANIFEST.json`、collectorの`default_manifest()`、`codex-task.ps1`の`Write-RunManifest`、`codex-task.sh`の`write_run_manifest`をschema v2へ揃える。
- [ ] 15. collectorおよび`codex-task.ps1/sh`のmerge処理で削除済みv1 fieldを新規v2 manifestへ再注入しないようにする。既存v1はlegacy field valueだけを保持し、旧Subagent / 旧Hook observation機能をv1用に温存しない。
- [ ] 16. 旧Subagent / 旧Hook observation削除による`changed_files` / `safety.scope_violation` / validation / evaluationへの副作用を確認する。
- [ ] 17. `tests/contracts/codex-hook-contract.test.ts`を更新し、Safety HookとLogging Hookのmatcher / timeout / repo-root command契約、新loggerのstdout / `stop_hook_active` / sanitization / truncation / malformed payload contractを明示的に検証する。loggerを書き込ませるtestは各testでunique synthetic session IDを使い、対象JSONLがtest開始前に存在しないことを保証し、`afterEach`または`finally`でそのtestが作成したJSONLだけを削除する。新しいtest frameworkやtest-only output path機能は作らない。
- [ ] 18. `docs/reference/codex-implementation-harness.md`等、必要なdocsを新しい責務へ合わせる。
- [ ] 19. `.codex/config.toml`と`.codex/hooks/log_event.mjs`の最終内容が確定した後にproject-local Hookを再確認・trustする。trust前のskipをlogger不良と誤判定しない。
- [ ] 20. targeted tests、Windows full Hook smoke、Unix代表Hook smokeを実施する。

---

## 10. 検証方法

### A. Hook lifecycle

同一sessionで確認する。

1. `UserPromptSubmit`が記録される。
2. Hook対象Toolを1回以上実行し、`PostToolUse`が記録される。
3. Subagentを1回以上起動し、`SubagentStart`が記録される。
4. `SubagentStop` eventを観測したときに`SubagentStop`が記録され、`stop_hook_active`がnative payloadどおり保存される。
5. `Stop` eventを観測したときに`Stop`が記録され、`stop_hook_active`がnative payloadどおり保存される。
6. `SubagentStop` / `Stop`の記録だけから「最終終了」と推定していない。
7. `session_id` / `turn_id` / `agent_id`等、取得できるstable idからHook JSONL上で時系列を追える。
8. Hookで観測可能なnon-Bash Toolを代表1件実行し、Logging HookがBash限定になっていないことを確認する。

### B. Session scope / Git非管理 / 保存先

- `.codex/logs/hooks-<safe-session-id>.jsonl`へ出力される。
- 同一session内の複数turnが同じlogへ記録される。
- 同一session内で複数Runを扱ってもRun単位に自動分離されない。
- `hooks-*.jsonl`が`git status`へ出ない。
- repositoryのsubdirectoryから開始しても、config側がrepo rootを解決して`.codex/hooks/log_event.mjs`自体を正しく起動できる。
- logger起動後の保存先も`.codex/hooks/log_event.mjs`自身の配置位置を基準にrepository root配下の`.codex/logs/`へ記録される。

### C. Cross-platform Hook起動 / timeout / trust

Windows:

- `command_windows`が既存Safety Hookと同じrepository-root解決方式を使い、subdirectory起動でも`.codex/hooks/log_event.mjs <EventName>`を起動する。
- 5eventすべてを実機smokeする。
- repository pathに空白があってもpath quotingに失敗しない。

Unix系:

- `command`がrepo rootを解決して同じloggerを起動できる。
- repositoryのsubdirectoryから起動した代表eventを最低1件smokeする。
- Windows用PowerShellにlogging logicを二重実装していない。

共通:

- 5つのLogging Hookすべてに`timeout = 5`が設定されている。
- 最終config / logger変更後にproject-local Hookをtrustした状態でsmokeする。
- trust前にHookがskipされる事象をlogger不良として扱わない。

### D. Hook非干渉 / failure-safe

正常payload、append失敗、malformed JSON、event mismatchを対象に確認する。

- `UserPromptSubmit`: stdout空、exit 0。
- `PostToolUse`: stdout空、exit 0。
- `SubagentStart`: stdout空、exit 0。
- `SubagentStop`: stdout`{}`、exit 0。
- `Stop`: stdout`{}`、exit 0。
- malformed JSONでもexpected event CLI引数から正しいstdout契約を返す。
- event mismatchではログを書かず、Codex本作業をblockしない。
- `SubagentStop` / `Stop`がcontinuation / blockを要求しない。
- logger hang試験または等価確認で5秒timeoutが効く。
- stdout debug printがない。

### E. Sanitization / truncation

- native Hook stdin全文がfileへ保存されていない。
- logger observation timestampがUTC ISO 8601形式である。
- prompt / `tool_input_preview` / Subagent final / main finalが2000文字を超えた場合にtruncateされ、その事実が分かる。
- 代表的なAPI key / token / Authorization形式をredactできる。
- arbitrary free-form secret完全検出を要件にしない。
- `tool_input_preview`生成にTool別parser / AI要約処理が存在しない。
- transcript本文 / transcript pathがHook JSONLへ保存されない。
- `SubagentStop` / `Stop`の`stop_hook_active`はnative payloadのbooleanをそのまま保存し、別の終了状態へ変換していない。

### F. 並行書き込み

複数Toolまたは複数Subagentを並行実行できるsmokeで確認する。

- 1event = 1 complete JSON line。
- 全行がJSONとしてparseできる。
- partial / concatenated lineがない。
- 問題が確認されない限りlock service / DB / daemonを追加しない。

### G. REPORT

- start / stopのたびにREPORTを編集していない。
- TASK完了、重要判断、blocker、Run完了のcheckpointだけ追記される。
- 新checkpoint追加後も過去checkpointが削除・置換・並べ替えされていない。
- Summary / Progressも過去記録を上書きせず新checkpointとして追記される。
- Subagent利用時にDelegation / Result / Parent decisionが確認できる。
- Hook JSONLのmachine factをREPORTへ重複転記していない。
- private chain-of-thoughtを記録していない。
- 今回と無関係なSafety用sectionを削除していない。

### H. 旧Subagent JSON機能廃止

- `.codex/templates/subagent-run.schema.json`が削除されている。
- 新規Runで`subagents/*.json`が生成されない。
- `collect_subagents()`が削除されている。
- 旧Subagent JSONをvalidation / aggregationするコードが残っていない。
- v1処理時にも旧Subagent JSONを再走査・再集約しない。
- legacy stack内部を「active consumer」として削除停止理由にしていない。
- 過去Runに既存の`subagents/*.json`は削除・変更していない。

### I. 旧Hook observation / cleanup

legacy stack外に独立dependencyがない場合:

- `observe.ps1|sh`が削除されている。
- `.codex/observations/hooks.jsonl`を前提とするactive code pathが残っていない。
- `collect_hook_observations()` / `--hook-log` / `HookLog`が残っていない。
- `cleanup-runs.ps1/sh`から`.codex/observations/hooks.jsonl`専用cleanup branchが削除されている。
- `cleanup-runs.ps1/sh`の`.codex/logs/*.jsonl` generic cleanupは維持され、新しいHook JSONLを候補として扱える。
- v1処理時にも旧Hook observationを再収集・再集約しない。
- 新規v2 manifestに旧observer専用fieldが残っていない。
- 旧Hook observation削除後も既存Safety `PreToolUse`が動く。

legacy stack外に独立dependencyがある場合:

- 独立dependencyを今回無理に新loggerへmigrationしていない。
- 独立dependencyが必要とするproducer / fieldだけ削除を見送っている。
- unrelated legacy stackまで温存していない。

### J. Safety field整理

- 独立active producerがあるsafety fieldは正しい値を維持できる。
- 旧observerだけがproducerで独立consumerがないsafety fieldは新規v2から削除される。
- 独立consumerが必要とするfieldは今回破壊せずmigrationを別タスクとする。
- field維持のためだけに`collect_hook_observations()`等を残していない。
- 既存Safety `PreToolUse`のblocking behaviorは維持される。

### K. `run.json` / manifest v2

- `new-run`で新規v2 `run.json`が自動生成される。
- templateが利用できないcollector fallbackでもv2構造を生成する。
- `codex-task.ps1` / `codex-task.sh`から更新してもv2 manifestをv1構造へ戻さない。
- 新規v2 manifestに旧Subagent JSON専用fieldが残っていない。
- `agents_used`は独立producerがない場合v2から削除される。
- §3で削除対象と判断した旧observer / safety fieldがv2へ再注入されない。
- Hook JSONLを`run.json`へ新規集約していない。
- `CODEX_RUN_ID`伝播等のRun correlation基盤を追加していない。
- 既存v1はlegacy field valueを保持するだけで、旧機能を再実行しない。
- 過去v1 Runを一括migrationしていない。
- `changed_files` / safety / validation / evaluation等の非廃止対象を壊していない。

### L. `tests/contracts/codex-hook-contract.test.ts`

既存contract testを拡張し、少なくとも以下を自動検証する。

- 既存Safety `PreToolUse`は`matcher = "^Bash$"`を維持する。
- 5つのLogging HookにはBash限定matcherを設定しない。
- 5つのLogging Hookはすべて`timeout = 5`。
- `command` / `command_windows`がrepository rootを解決して同じ`.codex/hooks/log_event.mjs`と正しいexpected event名を使用する。
- repository subdirectoryを`cwd`にしてもlogger起動に成功する。
- loggerの正常payload時stdout契約。
- malformed payload時stdout契約。
- event mismatch時にログを書かない。
- `SubagentStop` / `Stop`で`stop_hook_active`をそのまま保存する。
- sanitization / truncation。
- logger起動後の保存先がrepository root配下の`.codex/logs/`である。
- 既存Safety Hookのdeny / allow contractが回帰していない。

config全体に`matcher = "^Bash$"`が1つ存在することだけを確認する曖昧なassertionではなく、Safety HookとLogging Hookの設定を区別して検証する。

loggerを書き込ませるcontract testは以下で隔離する。

- 各testで衝突しないunique synthetic `session_id`を生成する。
- test開始前に対応する`.codex/logs/hooks-<safe-session-id>.jsonl`が存在しないことを保証する。
- test終了時に`afterEach`または`finally`で、そのtestが生成した対象JSONLだけを削除する。
- 他sessionのHook JSONLや通常運用logは削除しない。
- loggerへtest-only output pathやtest専用modeを追加しない。

新しいtest frameworkは追加しない。

### M. Cleanup / safety

- 既存Safety `PreToolUse` policyが引き続き動く。
- Product code、ECサイト仕様、カリキュラム本体に差分がない。
- standard Runでevaluationなしでも既存どおり成功する。
- native/raw Hook payloadを保存する別fileを新設していない。
- Hook JSONLをGit管理するためだけのscope / clean-git例外やcommit前validationを追加していない。

---

## 11. 変更対象

### 確定変更候補

- `.codex/config.toml`
- `.codex/hooks/log_event.mjs`（新規canonical Hook logger）
- `AGENTS.md`
- `.codex/templates/REPORT.md`
- `.codex/templates/RUN_MANIFEST.json`
- `.codex/templates/subagent-run.schema.json`（削除）
- `scripts/collect-run-artifacts.py`
- `scripts/codex-task.ps1`
- `scripts/codex-task.sh`
- `tests/contracts/codex-hook-contract.test.ts`
- `docs/reference/codex-implementation-harness.md`
- 旧Subagent JSON / Hook observation / manifest v2に関係するtargeted tests

`.codex/logs/.gitignore`は原則変更しない。現状の`*.jsonl` ignoreを維持する。

### legacy stack外に独立dependencyがない場合だけ整理

- `.codex/hooks/observe.ps1`
- `.codex/hooks/observe.sh`
- `.codex/templates/hook-observation.schema.json`
- `.codex/observations/`向けdead reference
- `scripts/collect-run-artifacts.ps1`の`HookLog` parameter / forwarding
- `scripts/cleanup-runs.ps1`の旧`.codex/observations/hooks.jsonl`専用branch
- `scripts/cleanup-runs.sh`の旧`.codex/observations/hooks.jsonl`専用branch
- 不要になった`CODEX_HOOK_*`環境変数契約
- 旧Hook observation専用のcollector / manifest field
- 旧observerだけがproducerで独立consumerのないsafety field
- 関連docs / tests

### 原則変更しない

- `scripts/collect-run-artifacts.sh`（旧Hook observation専用logicが見つかった場合のみ必要最小限で変更）
- `scripts/cleanup-runs.ps1/sh`の`.codex/logs/*.jsonl` generic cleanup
- `scripts/codex-safe.ps1`
- `scripts/codex-safe.sh`
- `scripts/new-run.ps1`
- `scripts/new-run.sh`
- `.codex/templates/EVALUATION.md`
- `.codex/templates/evaluation.schema.json`
- Product code
- ECサイト仕様 / カリキュラム本体
- 過去Run配下の既存`subagents/*.json`

既存挙動が今回の廃止対象に直接依存していることが確認された場合だけ、原則変更しないファイルを必要最小限で変更する。

---

## 12. Non-goals

- Hook JSONLを`run.json`へ新規集約しない。
- HookとRunの完全correlation基盤を作らない。
- `CODEX_RUN_ID`伝播を追加しない。
- `1 Codex process = 1 Run`制約を導入しない。
- active-run registryを作らない。
- Subagent専用Structured Artifactを別形式で再発明しない。
- `agents_used`を残すためだけに新しいSubagent集約経路を作らない。
- safety fieldを残すためだけに旧Hook observation集約を温存しない。
- v1 compatibilityのために旧Subagent / 旧Hook observation機能を温存しない。
- legacy stack外の独立dependencyを今回の都合だけで新loggerへmigrationしない。
- manifest migration utilityを作らない。
- 全Toolのresult parserを作らない。
- Tool別input parser / summary engineを作らない。
- hosted / specialized Toolを疑似Hookで捕捉しない。
- native Hook stdin payload全文を保存しない。
- Hook JSONLをGit管理しない。
- Hook JSONLの長期保存基盤を今回追加しない。
- Hook JSONL専用のcommit前secret scannerやGit履歴管理を追加しない。
- 新しいlog rotation / cleanup serviceを作らない。
- REPORTのappend-only契約を廃止しない。
- 新しいtest frameworkを作らない。
- Hook test専用のoutput path / modeをloggerへ追加しない。
- `SubagentStop` / `Stop`から最終終了状態を推論しない。
- private chain-of-thoughtを保存しない。
- `evaluation.json`を再設計しない。
- Run管理基盤全体を再設計しない。

---

## 13. 成功判定

以下をすべて満たせば完了とする。

- Codexが全行動をREPORTへ逐次記帳しなくても、ローカルHook JSONLから指示・Tool実行・Subagent lifecycle event・Stop eventを確認できる。
- `SubagentStop` / `Stop`はevent観測として記録され、logger単独で最終終了と断定していない。
- `SubagentStop` / `Stop`の`stop_hook_active`をnative payloadどおり確認できる。
- Hook JSONLはsession-scopedであり、Run-scoped auditではないことが明確である。
- Hook JSONLは`.codex/logs/*.jsonl`の既存方針どおりGit管理されない。
- 同一session内で複数Runが混在し得ることを許容し、Run correlation基盤を追加していない。
- native Hook payload全文を保存していない。
- canonical loggerが`.codex/hooks/log_event.mjs`に固定され、Windows / Unixとも同じ実装を使用している。
- 5eventがconfigからexpected event名をCLI引数として受け、malformed payload時でもevent別stdout契約を守れる。
- `command` / `command_windows`がrepository rootを解決してloggerを起動し、session `cwd`に依存した相対path実行をしていない。
- Logging Hookはsupported occurrence全体を対象とし、Safety HookのBash限定matcherを流用していない。
- Logging Hookは5秒timeoutで、logger障害によりCodex本作業を長時間停止しない。
- repositoryのsubdirectoryから開始してもloggerを起動でき、正しい`.codex/logs/`へ記録される。
- 最終Hook定義をtrustした後に、Windowsでは5event、Unix系では同じNode loggerの起動と代表eventを確認できる。
- `UserPromptSubmit` / `PostToolUse` / `SubagentStart`はstdoutなし、`SubagentStop` / `Stop`は`{}`で非干渉に終了する。
- logging失敗だけを理由にCodex処理がblockされない。
- REPORTはcheckpoint型になっているが、既存append-only契約を維持し過去checkpointを書換えていない。
- Subagentを使った場合、REPORTから「何を任せたか」「結果は何だったか」「Parentがどう判断したか」を確認できる。
- 新規RunではSubagent専用JSONを作成・更新・validation・aggregationする機能が残っていない。
- 過去RunのSubagent JSONはそのまま保持されている。
- legacy stack内部のproducer / consumer自身を削除停止理由にしていない。
- `agents_used`は独立producerがない場合に新規v2から削除され、虚偽の空fieldを残していない。
- legacy stack外に独立dependencyがない旧Hook observation機能を安全に削除し、`HookLog`契約も残していない。
- `cleanup-runs.ps1/sh`から旧`.codex/observations/hooks.jsonl`専用cleanupだけを削除し、`.codex/logs/*.jsonl` generic cleanupは維持している。
- 旧observerだけがproducerで独立consumerのないsafety fieldをv2から削除し、field維持のためだけにlegacy producerを温存していない。
- legacy stack外に独立dependencyがある場合は、そのdependencyを無理にmigrationせず影響範囲だけ削除を見送っている。
- 既存v1はlegacy field valueだけを保持し、旧Subagent / 旧Hook observation機能をv1用に温存していない。
- `run.json`は従来どおり自動生成・自動更新されるが、Hook JSONLの二重集約先にはなっていない。
- 新規Runはv2 manifestを利用し、`new-run` / `codex-task.ps1/sh` / collectorのどの経路でもv1構造へ戻らない。
- 過去v1 Runを自動migrationしていない。
- `tests/contracts/codex-hook-contract.test.ts`がSafety HookとLogging Hookを区別し、matcher / timeout / repo-root command / stdout / `stop_hook_active` / malformed payload / sanitization / truncation contractを検証している。
- loggerのcontract testがunique session IDと対象JSONLの後片付けにより、過去test runや通常運用logへ依存・干渉しない。
- Hook JSONL / REPORT / run.json / wrapper logの責務が重複していない。
- 既存Safety Hook、validation、evaluation、Product codeを壊していない。
- 今回の目的のためにGit tracking例外、scope / clean-git例外、DB、daemon、Run correlation基盤、migration framework、Tool別parser、新規cleanup service、新規test framework等の追加基盤を導入していない。
