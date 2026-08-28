# Codex HookによるRunログ自動化・既存Subagent記録廃止プラン

## 0. 目的

Codex自身に`.codex/runs/<run_id>/REPORT.md`へ細かな行動を逐次記録させる現行運用を見直し、**機械的に取得できる事実はCodex Hooksで自動収集し、AIにしか書けない意味情報だけをREPORTへ残す**。

今回の主目的は次の2点である。

1. 指示、Tool実行、Subagent開始・終了、turn終了などの機械的な行動記録をHookへ移し、Codex自身の逐次記帳を減らす。
2. 現在手動記録を前提としているSubagent専用JSON Artifactを、運用だけでなく関連機能まで廃止する。

`run.json`自体の自動生成・自動更新は維持する。ただし、新HookログやSubagent lifecycleを`run.json`へ新規集約する仕組みは追加しない。

---

## 1. 最終的な責務

### `PLAN.md` / `TASKS.md`

- 計画。
- 作業項目。
- 進捗。
- blocked item。

### `REPORT.md`

checkpoint単位で以下の意味情報だけを残す。

- 重要なDecision / Rationale。
- 計画変更。
- 重要な検証結果。
- blocker / Remaining。
- 前回checkpoint以降にSubagentを利用した場合の以下の要約。
  - Delegation: 何を任せたか / なぜ任せたか。
  - Result: 何が返ってきたかの要点。
  - Parent decision: 採用 / 一部採用 / 不採用 / 保留と、その理由。

全command、全Tool call、Subagent start / stop、Raw final messageはREPORTへ逐次転記しない。

### Hook JSONL

以下5eventを自動記録する。

- `UserPromptSubmit`: 受けた指示。
- `PostToolUse`: Hookで観測可能なTool実行。
- `SubagentStart`: Subagent開始。
- `SubagentStop`: Subagent終了と最終応答。
- `Stop`: main turn終了と最終assistant message。

Raw Hook JSONLは**Codex session単位のローカル詳細Evidence**として扱い、Git管理しない。

- 保存先は`.codex/logs/hooks-<session_id>.jsonl`。
- V1ではRun IDを付与せず、Run単位のmachine auditを提供しない。
- 同じCodex session内で複数Runを扱った場合、同じRaw Hook logへ複数Runのeventが混在し得る。
- Run単位で長期保存する意味情報は`REPORT.md`を正本とする。
- Run correlationが必要になった場合は別タスクで判断し、今回active-run registryや`CODEX_RUN_ID`伝播を追加しない。

### `codex-task` JSONL / report JSON

既存責務を維持する。

- wrapper lifecycle。
- preflight。
- scope validation。
- schema validation。
- verify。
- command execution基盤の結果。

### `run.json`

既存のmachine-generated manifestとして維持する。

- `new-run` / `codex-task` / collectorによる自動生成・自動更新を維持する。
- Codexや人間が手編集しない。
- 新Hook JSONLを新しい入力源として追加しない。
- Subagent lifecycleを`run.json`へ新規集約しない。
- 旧Subagent JSON専用fieldは新規v2 manifestから廃止する。
- active利用のない旧Hook observation専用fieldも新規v2 manifestから廃止する。

### `evaluation.json`

- 評価が必要なworkflowだけで利用する既存artifact。
- 今回は再設計しない。

---

## 2. Subagent専用JSON機能の廃止

### 廃止対象

新規Runについて以下を廃止する。

- `.codex/templates/subagent-run.schema.json`
- `.codex/runs/<run_id>/subagents/*.json`を作成・更新する運用
- `scripts/collect-run-artifacts.py`内の`collect_subagents()`
- Run-local `subagents/*.json`の走査・validation・aggregation
- 旧Subagent JSONを前提とするtests
- 旧Subagent JSONを前提とするdocs / AGENTS / template記述
- `parent_decision` / `used_in_final_plan` / Subagent `scope` / Subagent `changed_files`等、旧Subagent JSONからだけ生成していたmanifest集約処理

### 過去Runの扱い

**過去Runに既に存在する`subagents/*.json`は削除・書換えしない。**

今回の廃止は以下を意味する。

- 新しいRunでは生成しない。
- 新しい標準運用では参照しない。
- template / producer / consumer / tests / docsから現行機能を削除する。
- 過去履歴はそのまま保持する。
- 過去Artifactを維持するためだけの新producerやmigration utilityは作らない。

### `run.json`への影響

新規v2 manifestから、少なくとも以下の旧Subagent JSON専用fieldを削除する。

- `subagents`
- `artifact_summary.subagent_run_count`
- `subagents.summary.read_only`
- `subagents.summary.writable`
- `subagents.summary.scope_violations`
- `subagents.summary.used_in_final_plan`

`agents_used`はrepo-wide consumer / producer確認後に判断する。

- 旧Subagent JSON以外でも利用されている場合はfieldと既存責務を維持する。
- 旧Subagent JSONだけがproducerである場合は新規v2 manifestから削除する。

`collect_subagents()`削除後は以下をSubagent Hookから復元しない。

- `changed_files`: 既存wrapper / git差分等の非Subagent経路を正本とする。
- `safety.scope_violation`: 既存scope validationを正本とする。
- `agents_used`: 他producerが存在する場合だけ既存経路を維持する。

---

## 3. 旧Hook observation機能の整理

新Hook loggerは`.codex/logs/hooks-<session_id>.jsonl`へ記録し、`run.json`へ集約しない。

旧`.codex/observations/hooks.jsonl`を前提とした観測機能にactive producer / consumerがないことを確認できた場合、以下を同じ旧observer責務として整理する。

### 削除対象候補

- `.codex/hooks/observe.ps1`
- `.codex/hooks/observe.sh`
- 不要になった`CODEX_OBSERVATION_LOG`
- 不要になった`CODEX_HOOK_*`環境変数契約
- `.codex/observations/hooks.jsonl`専用reference
- `scripts/collect-run-artifacts.py`の`collect_hook_observations()`
- collectorの`--hook-log`引数
- collector内の旧観測用`HOOK_EVENTS`定義（他責務がない場合）
- 旧Hook observationからだけ行っていたsafety summary更新
- `.codex/templates/hook-observation.schema.json`（active consumer / validationがない場合）
- 新規v2 manifestの`hook_observations`
- 新規v2 manifestの`artifact_summary.hook_event_count`
- 上記旧observer機能だけを対象とするtests / docs

### 削除しないもの

- `.codex/config.toml`の既存Safety `PreToolUse`
- `.codex/hooks/pre_tool_use_policy.mjs`
- `.codex/hooks/pre_tool_use_policy_windows.ps1`
- Safety Hook本体のblocking behavior
- 旧observer以外の経路で使われているsafety / validation情報

Safety Hookと旧observation logger / aggregationは別責務として扱う。

active caller / consumerが存在する場合は、利用箇所を新構成へ移行できる範囲だけ変更し、未移行のまま削除しない。

---

## 4. Manifest v2

Subagent専用field、およびactive利用のない旧Hook observation fieldを新規Runから削除するため、新規Run向けmanifestは`schema_version = 2`とする。

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
- v2 manifestには削除済みの旧Subagent / 旧Hook observation fieldを新規生成しない。
- collectorのmerge処理、`codex-task.ps1/sh`の既存manifest merge処理の双方で、v1専用fieldをv2 manifestへ再注入しない。
- `codex-task` / collectorによるvalidation、safety、changed files、report、evaluation等の既存非廃止対象の自動更新は維持する。

### 既存v1

- 過去v1 `run.json`を一括migrationしない。
- 過去Runをcleanup目的で書換えない。
- collectorまたは`codex-task`で既存v1 manifestを明示的に処理する必要がある場合、既存v1 fieldを破壊的に削除しない。
- v1を処理しただけでv2へ自動昇格させない。
- v1→v2 migration command / converter / registryを作らない。

### 最小判定

manifest writer / collectorは既存manifestの`schema_version`を確認し、少なくとも以下を守る。

- 新規 / v2 manifest: v2構造だけを生成・更新する。
- 既存v1 manifest: legacy fieldを保持し、今回のcleanupで破壊的に削除しない。

複雑な複数version frameworkは作らない。

---

## 5. Hook V1

### 対象event

`.codex/config.toml`へ、既存Safety `PreToolUse`とは別に以下5eventを接続する。

1. `UserPromptSubmit`
2. `PostToolUse`
3. `SubagentStart`
4. `SubagentStop`
5. `Stop`

既存Safety `PreToolUse`のmatcher / blocking behaviorは変更しない。

### cross-platform起動

5eventすべてで**同じNode logger 1ファイル**を利用する。

- Unix系: `command`からNode loggerを起動する。
- Windows: `command_windows`から同じNode loggerを起動する。
- Windows用にlogging logicをPowerShellへ再実装しない。
- path解決・quotingは既存`.codex/config.toml`のSafety Hookのcross-platform構成を参考にし、Windows / Unix双方でrepo内loggerを確実に起動できる形にする。
- 実装後はWindowsとUnix系の双方で最低限Hook起動をsmokeする。実際の主要運用環境であるWindowsのsmokeを必須とする。

### canonical logger

- cross-platform loggerを1つだけ実装する。
- Node `.mjs`を使用する。
- native Hook stdin payloadを直接処理する。
- PowerShell / shellで同じloggingロジックを二重実装しない。
- Raw eventは`.codex/logs/hooks-<session_id>.jsonl`へ1event=1JSON lineでappendする。
- session idはsafe filename化する。
- `.codex/logs/*.jsonl`はGit管理外を維持する。
- 1eventは1回のappend operationで書き込み、並列Hook実行時にpartial lineを作らない。
- 通常時はstdoutへdebug出力しない。
- logger内部エラーは最小診断に留め、可能な限りCodex本作業を止めない。
- V1ではrotation、DB、外部送信、active-run registryを実装しない。

### 共通方針

- 取得できるからという理由だけでfieldを増やさない。
- Raw payload全文を保存しない。
- text系fieldは共通helperでredaction / truncationする。
- 既知credential / token形式はbest-effortでredactする。
- 任意のfree-form secretを完全検出できるとは扱わない。
- transcript本文は解析しない。
- private chain-of-thoughtは保存しない。
- Tool別parserやAI要約処理を作らない。

### `UserPromptSubmit`

最低限記録する。

- event
- timestamp
- session_id
- turn_id（取得できる場合）
- sanitized / bounded prompt
- truncated flag

動作:

- 正常時はstdoutへ何も出さない。
- promptへdeveloper contextを追加しない。

### `PostToolUse`

最低限記録する。

- event
- timestamp
- session_id
- turn_id（取得できる場合）
- tool_name
- tool_use_id
- sanitized / bounded `tool_input_preview`
- truncated flag

`tool_input_preview`は以下だけで生成する。

1. `tool_input`をgenericにJSON serializationする。
2. 共通secret redactionを適用する。
3. 固定文字数でtruncateする。

動作:

- Tool別にcommand / path / delegation等を解析してsummary化しない。
- `tool_input` / `tool_response`全文を保存しない。
- Tool resultのsummary engineを作らない。
- 全Tool共通`success / failure`を作らない。
- delegation Toolを固定名称前提で特別実装しない。
- 実機で得られる`tool_name`をgeneric `PostToolUse`として扱う。
- hosted `WebSearch`等、Hookで観測できないTool pathがあることを明記する。
- 正常時はstdoutへ何も出さない。

### `SubagentStart`

最低限記録する。

- event
- timestamp
- session_id
- turn_id（取得できる場合）
- agent_id
- agent_type

動作:

- Subagent専用JSON fileを作らない。
- REPORTをこのeventのたびに編集しない。
- 正常時はstdoutへ何も出さず、Subagent contextへ情報を注入しない。

### `SubagentStop`

最低限記録する。

- event
- timestamp
- session_id
- turn_id（取得できる場合）
- agent_id
- agent_type
- sanitized / bounded last_assistant_message
- truncated flag

動作:

- Subagent専用JSON fileを作らない・更新しない。
- `SubagentStop`だけを根拠にsuccess / failureを推測しない。
- `parent_decision` / `used_in_final_plan`を生成しない。
- agent transcript本文を解析しない。
- 実装時点のCodex CLIで有効なno-op JSONを確認し、空objectが有効なら正常時stdoutは`{}`に固定する。
- continuation / blockを要求するfieldを返さない。

### `Stop`

最低限記録する。

- event
- timestamp
- session_id
- turn_id（取得できる場合）
- sanitized / bounded last_assistant_message
- truncated flag

動作:

- 停止理由を推測しない。
- `stopReason`を入力fieldとして読もうとしない。
- 実装時点のCodex CLIで有効なno-op JSONを確認し、空objectが有効なら正常時stdoutは`{}`に固定する。
- continuation / blockを要求するfieldを返さない。

---

## 6. REPORT運用変更

現行の「行動のたびに追記」「commandや確認結果を必ず記録」を廃止する。

### 更新条件

REPORTを更新するのは以下だけとする。

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

---

## 7. `run.json`運用

### 維持すること

- `run.json`はmachine-generated manifestのまま維持する。
- `scripts/new-run.*`による初期生成を維持する。
- `scripts/codex-task.ps1/sh` / collector等による既存の非廃止対象の自動更新を維持する。
- Codexや人間による手編集を要求しない。
- validation / report / safety / changed files / evaluation等、今回の廃止対象と無関係な既存機能を壊さない。

### 今回やらないこと

- 新Hook JSONLを`run.json`へ新規集約しない。
- `SubagentStart` / `SubagentStop`から`run.json.subagents`を新規生成しない。
- `CODEX_RUN_ID`伝播を新設しない。
- `1 Codex process = 1 Run`という新しい運用制約を導入しない。
- active-run registryを作らない。
- HookとRunを完全correlationする基盤を作らない。

これにより、ログ自動化のためだけに既存Run運用を広範囲に変更しない。

---

## 8. 実装前のrepo-wide確認

最低限以下をliteral searchし、producer / consumer / docs / testsに分類する。

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
- `hook_observations`
- `hook_event_count`
- `SafetyBlocked`
- `ObservationError`

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
- `run.json`
- `evaluation.json`

停止条件:

- 旧Subagent JSONにactive consumerがある場合、そのconsumerを新運用へ移行せずに削除しない。
- 旧Hook observationにactive producer / consumerがある場合、その利用を確認せずに関連field / collector機能を削除しない。
- `agents_used`等が旧Subagent JSON以外でも利用されている場合、その別責務は削除しない。
- Hook observation由来のsafety情報に別のactive正本がない場合、safety情報を失う削除は行わず、最小移行方法を決める。
- manifest writerのどれかがv1構造をhard-codeしている場合、v2へ揃えずに完了扱いにしない。
- logging Hookが既存Safety Hookへ干渉する場合、safetyを優先してlogging scopeを縮小する。
- Hook仕様が実機と計画で異なる場合、現行Codex CLIの実機仕様を優先する。
- project-local Hookが未trustの場合、trust未設定をlogger不良と誤判定しない。
- Windowsで`command_windows`からloggerを起動できない場合、Windows Hook動作を未検証のまま完了扱いにしない。

---

## 9. 実行タスク

- [ ] 1. 現行Codex CLIで5eventのinput / stdout / exit semantics、Tool coverage、Hook trust状態を実機確認する。
- [ ] 2. repo-wide searchで旧Subagent JSON、旧Hook observation、全manifest writer、docs、testsのproducer / consumerを確定する。
- [ ] 3. canonical Node Hook loggerを1つ実装し、5eventをsanitized / bounded JSONLへ記録する。
- [ ] 4. `.codex/config.toml`へ5eventを接続し、Unix `command` / Windows `command_windows`の双方から同じNode loggerを起動する。既存Safety `PreToolUse`は維持する。
- [ ] 5. `AGENTS.md` / `.codex/templates/REPORT.md`をcheckpoint型へ変更し、逐次行動記録を廃止する。
- [ ] 6. Subagent利用時はcheckpointで`Delegation / Result / Parent decision`だけをまとめる契約へ変更する。
- [ ] 7. `.codex/templates/subagent-run.schema.json`を削除する。
- [ ] 8. `collect_subagents()`とRun-local `subagents/*.json`のvalidation / aggregation機能を削除する。
- [ ] 9. 旧Subagent JSON専用のmanifest field / tests / docsを新規Run向け構成から削除する。
- [ ] 10. 旧Hook observationにactive利用がなければ、`observe.ps1|sh`、旧環境変数契約、`collect_hook_observations()`、`--hook-log`、旧Hook manifest field、関連schema / tests / docsを削除する。
- [ ] 11. 新規Run向け`RUN_MANIFEST.json`、collectorの`default_manifest()`、`codex-task.ps1`の`Write-RunManifest`、`codex-task.sh`の`write_run_manifest`をschema v2へ揃える。
- [ ] 12. collectorおよび`codex-task.ps1/sh`のmerge処理でv1専用fieldを新規v2 manifestへ再注入しないようにし、既存v1を処理する場合はlegacy fieldを破壊的に削除しない。
- [ ] 13. 旧Subagent / 旧Hook observation削除による`changed_files` / `safety.scope_violation` / `agents_used` / validation / evaluationへの副作用を確認し、既存の非廃止対象の正本を維持する。
- [ ] 14. `docs/reference/codex-implementation-harness.md`等、必要なdocsを新しい責務へ合わせる。
- [ ] 15. targeted testsとUnix / Windows双方のHook smokeを実施する。

---

## 10. 検証方法

### A. Hook lifecycle

同一sessionで確認する。

1. `UserPromptSubmit`が記録される。
2. Hook対象Toolを1回以上実行し、`PostToolUse`が記録される。
3. Subagentを1回以上起動し、`SubagentStart`が記録される。
4. Subagent終了時に`SubagentStop`が記録される。
5. main turn終了時に`Stop`が記録される。
6. `session_id` / `turn_id` / `agent_id`等、取得できるstable idからRaw log上で時系列を追える。

### B. Cross-platform Hook起動

- Unix系で5eventのloggerが起動する。
- Windowsで5eventのloggerが`command_windows`経由で起動する。
- Windows / Unix系とも同じNode loggerファイルを利用している。
- Windows用PowerShellにlogging logicを二重実装していない。
- Windowsで最低限`UserPromptSubmit` / `PostToolUse` / `SubagentStart` / `SubagentStop` / `Stop`の5eventをsmokeする。
- path quoting / repo root解決の失敗でWindowsだけHookがskip / failureになっていない。

### C. Session scope

- Raw Hook logが`.codex/logs/hooks-<session_id>.jsonl`へ出力される。
- 同一session内の複数turnが同じlogへ記録される。
- 同一session内で複数Runを扱った場合、Run単位に自動分離されないことを仕様として確認する。
- Run単位のmachine correlationをV1要件にしない。
- Run単位の意味情報はREPORTから確認できる。

### D. Hook非干渉性

- project-local Hookをtrustした状態でsmokeする。
- `UserPromptSubmit`の正常時stdoutが空で、additional contextを注入しない。
- `PostToolUse`の正常時stdoutが空で、decision / feedbackを返さない。
- `SubagentStart`の正常時stdoutが空で、Subagent contextを変更しない。
- `SubagentStop` / `Stop`は実機確認済みの有効なno-op JSONだけを返し、continuation / blockを発生させない。
- 空objectが有効な場合は`{}`だけを返す。
- logger内部エラーでCodex本作業を不必要に停止しない。
- stdout debug printがない。

### E. Redaction / truncation

- promptの上限超過でtruncateされ、その事実が分かる。
- `tool_input_preview`の上限超過でtruncateされる。
- Subagent / main final messageの上限超過でtruncateされる。
- 代表的なAPI key / token / Authorization形式をredactできる。
- 任意のfree-form secret完全検出をテスト要件にしない。
- `tool_input_preview`生成にTool別parser / AI要約処理が存在しない。

### F. 並行書き込み

複数Toolまたは複数Subagentを並行実行できるsmokeで確認する。

- 1event = 1 complete JSON lineになっている。
- 全行がJSONとしてparseできる。
- partial / concatenated lineがない。
- 問題が確認されない限りlock service / DB / daemonを追加しない。

### G. REPORT

Subagentを利用するTASKで確認する。

- start / stopのたびにREPORTを編集していない。
- 次のTASK完了またはRun完了checkpointで1回だけ要約している。
- Delegation / Result / Parent decisionが確認できる。
- Raw Hook情報をREPORTへ複製していない。
- private chain-of-thoughtを記録していない。

### H. 旧Subagent JSON機能廃止

- `.codex/templates/subagent-run.schema.json`が削除されている。
- 新規Runで`subagents/*.json`が生成されない。
- `collect_subagents()`が削除されている。
- 旧Subagent JSONをvalidation / aggregationするコードが残っていない。
- tests / docs / templatesに新規Subagent JSON作成を要求する記述が残っていない。
- 過去Runに既存の`subagents/*.json`は削除・変更していない。

### I. 旧Hook observation機能廃止

active利用がないことを確認できた場合に以下を検証する。

- `observe.ps1|sh`が削除されている。
- `.codex/observations/hooks.jsonl`を前提とするactive code pathが残っていない。
- `collect_hook_observations()` / `--hook-log`等の旧collector機能が残っていない。
- 新規v2 manifestに`hook_observations`が残っていない。
- 新規v2 manifestに`artifact_summary.hook_event_count`が残っていない。
- 旧Hook observationを削除しても既存Safety `PreToolUse`が引き続き動く。
- safety / validationの必要情報が失われていない。

### J. `run.json` / manifest v2

- `new-run`で新規v2 `run.json`が自動生成される。
- templateが利用できないcollector fallbackでもv2構造を生成する。
- `codex-task.ps1`から`Write-RunManifest`を実行しても新規v2 manifestをv1構造へ戻さない。
- `codex-task.sh`から`write_run_manifest`を実行しても新規v2 manifestをv1構造へ戻さない。
- wrapper / collectorによる既存の非廃止対象の自動更新が動作する。
- 新規v2 manifestに旧Subagent JSON専用fieldが残っていない。
- active利用がなかった旧Hook observation fieldも新規v2 manifestに残っていない。
- 新Hook JSONLを`run.json`へ新規集約していない。
- `CODEX_RUN_ID`伝播等の新規Run correlation基盤を追加していない。
- collector / `codex-task.ps1/sh`のmergeでv1専用fieldがv2へ再注入されない。
- 過去v1 Runを一括migrationしていない。
- 既存v1 manifestを処理する場合にlegacy fieldを破壊的に削除していない。
- 旧Subagent / 旧Hook observation削除後も、`changed_files` / safety / validation / evaluation等の非廃止対象を壊していない。

### K. Cleanup / safety

- 既存Safety `PreToolUse` policyが引き続き動く。
- `.codex/logs/*.jsonl`が`git status`へ出ない。
- dead callerを残していない。
- Product code、ECサイト仕様、カリキュラム本体に差分がない。
- standard Runでevaluationなしでも既存どおり成功する。

---

## 11. 変更対象

### 確定変更候補

- `.codex/config.toml`
- canonical Hook logger 1ファイル
- `AGENTS.md`
- `.codex/templates/REPORT.md`
- `.codex/templates/RUN_MANIFEST.json`
- `.codex/templates/subagent-run.schema.json`（削除）
- `scripts/collect-run-artifacts.py`
- `scripts/codex-task.ps1`
- `scripts/codex-task.sh`
- `docs/reference/codex-implementation-harness.md`
- 旧Subagent JSON / Hook logger / manifest v2に関係するtargeted tests

### active利用確認後に整理

- `.codex/hooks/observe.ps1`
- `.codex/hooks/observe.sh`
- `.codex/templates/hook-observation.schema.json`
- `.codex/observations/`向けdead reference
- 不要になった`CODEX_HOOK_*`環境変数契約
- 旧Hook observation専用のcollector / manifest field
- 関連docs / tests

### 原則変更しない

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

- 新Hook logを`run.json`へ新規集約しない。
- Subagent情報を`run.json`へ新規集約しない。
- HookとRunの完全correlation基盤を作らない。
- `CODEX_RUN_ID`伝播を追加しない。
- `1 Codex process = 1 Run`制約を導入しない。
- active-run registryを作らない。
- Subagent専用Structured Artifactを別形式で再発明しない。
- manifest migration utilityを作らない。
- 全Toolのresult parserを作らない。
- Tool別input parser / summary engineを作らない。
- hosted / specialized Toolを疑似Hookで捕捉しない。
- Raw Hook logをGit管理しない。
- private chain-of-thoughtを保存しない。
- `evaluation.json`を再設計しない。
- Run管理基盤全体を再設計しない。

---

## 13. 成功判定

以下をすべて満たせば完了とする。

- Codexが全行動をREPORTへ逐次記帳しなくても、Hookから指示・Tool実行・Subagent lifecycle・turn終了を確認できる。
- Raw Hook logがsession-scoped Evidenceであり、Run-scoped auditではないことが明確である。
- Windows / Unix系の双方で同じNode loggerから5eventを記録できる。
- Subagentを使った場合、REPORTから「何を任せたか」「結果は何だったか」「Parentがどう判断したか」を確認できる。
- 新規RunではSubagent専用JSONを作成・更新・validation・aggregationする機能が残っていない。
- 過去RunのSubagent JSONはそのまま保持されている。
- active利用のない旧Hook observation機能がcollector / manifest / scripts / schemaに中途半端に残っていない。
- `run.json`は従来どおり自動生成・自動更新されるが、新Hookログの二重集約先にはなっていない。
- 新規Runはv2 manifestを利用し、`new-run` / `codex-task.ps1/sh` / collectorのどの経路でもv1構造へ戻らない。
- 過去v1 Runを自動migrationしていない。
- Hook / REPORT / run.json / wrapper logの責務が重複していない。
- 既存Safety Hook、validation、evaluation、Product codeを壊していない。
- 今回の目的のためにDB、daemon、Run correlation基盤、migration framework、Tool別parser等の追加基盤を導入していない。
