# Codex HookによるRunログ自動化・既存Subagent記録廃止プラン

## 0. 目的

Codex自身に`.codex/runs/<run_id>/REPORT.md`へ細かな行動を逐次記録させる現行運用を見直し、**機械的に取得できる事実はCodex Hooksで自動収集し、AIにしか書けない意味情報だけをREPORTへ残す**。

今回の主目的は次の2点である。

1. 指示、Tool実行、Subagent開始・終了、turn終了などの機械的な行動記録をHookへ移し、Codex自身の逐次記帳を減らす。
2. 現在手動記録を前提としているSubagent専用JSON Artifactを、運用だけでなく関連機能まで廃止する。

`run.json`自体の自動生成・自動更新は維持する。ただし、今回新たにHookログやSubagent情報を`run.json`へ集約する仕組みは追加しない。

---

## 1. 最終的な責務

### `PLAN.md` / `TASKS.md`

- 計画。
- 作業項目。
- 進捗。
- blocked item。

### `REPORT.md`

以下の意味情報だけをcheckpoint単位で残す。

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

Raw Hook JSONLはローカル詳細Evidenceとして扱い、Git管理しない。

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

- `new-run` / wrapper / collectorによる自動生成・自動更新を維持する。
- Codexや人間が手編集しない。
- 今回、Hook JSONLを新しい入力源として追加しない。
- 今回、Subagent lifecycleを`run.json`へ新規集約しない。
- 旧Subagent JSON専用fieldは、新規Run向けtemplate / collectorから廃止する。

### `evaluation.json`

- 評価が必要なworkflowだけで利用する既存artifact。
- 今回は再設計しない。

---

## 2. Subagent専用JSON機能の廃止

### 廃止対象

新規Runについて、以下を廃止する。

- `.codex/templates/subagent-run.schema.json`
- `.codex/runs/<run_id>/subagents/*.json`を作成・更新する運用
- `scripts/collect-run-artifacts.py`内の`collect_subagents()`
- Run-local `subagents/*.json`の走査・validation・集約
- 旧Subagent JSONを前提とするtests
- 旧Subagent JSONを前提とするdocs / AGENTS / template記述
- `parent_decision` / `used_in_final_plan` / Subagent `scope` / Subagent `changed_files`等、旧Subagent JSONからだけ生成していたmanifest集約処理

### 過去Runの扱い

**過去Runに既に存在する`subagents/*.json`は削除・書換えしない。**

今回の「廃止」は以下を意味する。

- 新しいRunでは生成しない。
- 新しい標準運用では参照しない。
- template / producer / consumer / tests / docsから現行機能を削除する。
- 過去履歴はそのまま保持する。
- 過去Artifactを維持するためだけの新producerやmigration utilityは作らない。

### `run.json`への影響

旧Subagent JSON機能を削除するため、新規Run向け`RUN_MANIFEST.json`から旧Subagent専用fieldを整理する。

削除対象候補はrepo-wide consumer確認後に確定するが、少なくとも以下は旧Subagent JSON依存として扱う。

- `subagents`
- `artifact_summary.subagent_run_count`
- `subagents.summary.read_only`
- `subagents.summary.writable`
- `subagents.summary.scope_violations`
- `subagents.summary.used_in_final_plan`

`agents_used`が旧Subagent JSON以外でも利用されている場合はfield自体を削除せず、その既存責務を維持する。旧Subagent JSONだけがproducerである場合は新規Run templateから削除する。

`collect_subagents()`削除後は以下をSubagent Hookから復元しない。

- `changed_files`: 既存wrapper / git差分等、既存の非Subagent経路を正本とする。
- `safety.scope_violation`: 既存scope validationを正本とする。
- `agents_used`: 他producerが存在する場合のみその既存経路を維持する。

### manifest version

Subagent専用field削除がmanifest contract上のbreaking changeになるため、新規Run向けtemplateは`schema_version = 2`とする。

ただし、version migration基盤は作らない。

- 新しいRunはv2 templateから生成する。
- 過去v1 `run.json`は一括migrationしない。
- 過去Runをcleanup目的で書換えない。
- collectorが既存v1 manifestを扱う必要がある場合、旧Subagent sectionを破壊的に削除せず既存値を保持する最小互換だけに留める。
- v1→v2 migration command / converter / registryは作らない。

---

## 3. Hook V1

### 対象event

`.codex/config.toml`へ、既存Safety `PreToolUse`とは別に以下5eventを接続する。

1. `UserPromptSubmit`
2. `PostToolUse`
3. `SubagentStart`
4. `SubagentStop`
5. `Stop`

既存Bash `PreToolUse` safety Hookのmatcher / blocking behaviorは変更しない。

### canonical logger

- cross-platform loggerを1つだけ実装する。
- Node `.mjs`を第一候補とする。
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

### `UserPromptSubmit`

最低限記録する。

- event
- timestamp
- session_id
- turn_id（取得できる場合）
- sanitized / bounded prompt
- truncated flag

動作:

- stdoutへplain text / additional contextを出さない。
- promptへdeveloper contextを追加しない。

### `PostToolUse`

最低限記録する。

- event
- timestamp
- session_id
- turn_id（取得できる場合）
- tool_name
- tool_use_id
- sanitized / bounded tool input summary

動作:

- `tool_input` / `tool_response`全文を保存しない。
- Tool resultの万能summary engineを作らない。
- 全Tool共通`success / failure`を作らない。
- delegation Toolを`spawn_agent`等の固定名称前提で特別実装しない。
- 実機で得られる`tool_name`をgeneric `PostToolUse`として扱う。
- hosted `WebSearch`等、Hookで観測できないTool pathがあることを明記する。
- stdoutへdecision / feedback / additional contextを返さない。

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
- stdoutからSubagent contextへ情報を注入しない。

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
- 正常時はCodexをcontinue / blockしない有効なno-op outputだけを返す。

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
- 正常時はmain turnをcontinue / blockしない有効なno-op outputだけを返す。

---

## 4. REPORT運用変更

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

## 5. `run.json`運用

### 維持すること

- `run.json`はmachine-generated manifestのまま維持する。
- `scripts/new-run.*`による初期生成を維持する。
- `codex-task` / collector等による既存の自動更新を維持する。
- Codexや人間による手編集を要求しない。
- validation / report / safety等、Subagent専用JSONと無関係な既存機能を壊さない。

### 今回やらないこと

- Hook JSONLを`run.json`へ新規集約しない。
- `SubagentStart` / `SubagentStop`から`run.json.subagents`を新規生成しない。
- `CODEX_RUN_ID`伝播を新設しない。
- `1 Codex process = 1 Run`という新しい運用制約を導入しない。
- active-run registryを作らない。
- HookとRunを完全correlationする基盤を作らない。

これにより、ログ自動化のためだけに既存Run運用やwrapperを広範囲に変更しない。

---

## 6. 既存観測機能の整理

### `observe.ps1|sh`

repo-wide caller確認後に判断する。

callerなし:

- 新logger導入後に`.codex/hooks/observe.ps1` / `observe.sh`を削除する。
- 不要になった`CODEX_HOOK_*`環境変数契約を削除する。
- `.codex/observations/hooks.jsonl`専用のdead referenceを整理する。

callerあり:

- callerを新canonical loggerへ移行する。
- 移行後に旧scriptを削除する。
- callerを安全に移行できない場合だけ残し、理由をdocumentする。

### `hook-observation.schema.json`

- active consumer / validationがある場合だけ、新loggerとの整合に必要な最小変更を行う。
- active consumerがなく旧observer専用のdead schemaである場合は削除候補とする。
- schemaを維持するためだけに新loggerを複雑化しない。

---

## 7. 実装前のrepo-wide確認

最低限以下をliteral searchし、producer / consumer / docs / testsに分類する。

- `subagent-run.schema.json`
- `subagents/`
- `collect_subagents`
- `subagent_run_count`
- `used_in_final_plan`
- `parent_decision`
- `agents_used`
- `scope_violations`
- `observe.ps1`
- `observe.sh`
- `CODEX_OBSERVATION_LOG`
- `CODEX_HOOK_EVENT`
- `.codex/observations`
- `hook-observation.schema.json`
- `run.json`
- `evaluation.json`

停止条件:

- 旧Subagent JSONにactive consumerがある場合、そのconsumerを新運用へ移行せずに削除しない。
- `agents_used`等が旧Subagent JSON以外でも利用されている場合、その別責務は削除しない。
- logging Hookが既存Safety Hookへ干渉する場合、safetyを優先してlogging scopeを縮小する。
- Hook仕様が実機と計画で異なる場合、現行Codex CLIの実機仕様を優先する。
- project-local Hookが未trustの場合、trust未設定をlogger不良と誤判定しない。

---

## 8. 実行タスク

- [ ] 1. 現行Codex CLIで5eventのinput / stdout / exit semantics、Tool coverage、Hook trust状態を実機確認する。
- [ ] 2. repo-wide searchで旧Subagent JSON、observe scripts、hook schema、manifest、docs、testsのproducer / consumerを確定する。
- [ ] 3. canonical Node Hook loggerを1つ実装し、5eventをsanitized / bounded JSONLへ記録する。
- [ ] 4. `.codex/config.toml`へ5eventを接続し、既存Safety `PreToolUse`を維持する。
- [ ] 5. `AGENTS.md` / `.codex/templates/REPORT.md`をcheckpoint型へ変更し、逐次行動記録を廃止する。
- [ ] 6. Subagent利用時はcheckpointで`Delegation / Result / Parent decision`だけをまとめる契約へ変更する。
- [ ] 7. `.codex/templates/subagent-run.schema.json`を削除する。
- [ ] 8. `collect_subagents()`とRun-local `subagents/*.json`のvalidation / aggregation機能を削除する。
- [ ] 9. 旧Subagent JSON専用のmanifest field / tests / docsを新規Run向け構成から削除する。
- [ ] 10. 新規Run向け`RUN_MANIFEST.json`をschema v2へ更新し、旧Subagent JSON専用fieldを削除する。過去v1 Runは一括migrationしない。
- [ ] 11. `collect_subagents()`削除による`changed_files` / `safety.scope_violation` / `agents_used`への副作用を解消し、既存の非Subagent正本を維持する。
- [ ] 12. caller移行後、未使用`observe.ps1|sh` / 旧環境変数 / dead referenceを整理する。
- [ ] 13. `docs/reference/codex-implementation-harness.md`等、必要なdocsを新しい責務へ合わせる。
- [ ] 14. targeted tests / smoke validationを実施する。

---

## 9. 検証方法

### A. Hook lifecycle

同一sessionで確認する。

1. `UserPromptSubmit`が記録される。
2. Hook対象Toolを1回以上実行し、`PostToolUse`が記録される。
3. Subagentを1回以上起動し、`SubagentStart`が記録される。
4. Subagent終了時に`SubagentStop`が記録される。
5. main turn終了時に`Stop`が記録される。
6. `session_id` / `turn_id` / `agent_id`等、取得できるstable idからRaw log上で時系列を追える。

### B. Hook非干渉性

- project-local Hookをtrustした状態でsmokeする。
- `UserPromptSubmit`がadditional contextを注入しない。
- `PostToolUse`がdecision / feedbackを返さない。
- `SubagentStart`がSubagent contextを変更しない。
- `SubagentStop` / `Stop`がcontinuation / blockを発生させない。
- logger内部エラーでCodex本作業を不必要に停止しない。
- stdout debug printがない。

### C. Redaction / truncation

- promptの上限超過でtruncateされ、その事実が分かる。
- Tool input summaryの上限超過でtruncateされる。
- Subagent / main final messageの上限超過でtruncateされる。
- 代表的なAPI key / token / Authorization形式をredactできる。
- 任意のfree-form secret完全検出をテスト要件にしない。

### D. 並行書き込み

複数Toolまたは複数Subagentを並行実行できるsmokeで確認する。

- 1event = 1 complete JSON lineになっている。
- 全行がJSONとしてparseできる。
- partial / concatenated lineがない。
- 問題が確認されない限りlock service / DB / daemonを追加しない。

### E. REPORT

Subagentを利用するTASKで確認する。

- start / stopのたびにREPORTを編集していない。
- 次のTASK完了またはRun完了checkpointで1回だけ要約している。
- Delegation / Result / Parent decisionが確認できる。
- Raw Hook情報をREPORTへ複製していない。
- private chain-of-thoughtを記録していない。

### F. 旧Subagent JSON機能廃止

- `.codex/templates/subagent-run.schema.json`が削除されている。
- 新規Runで`subagents/*.json`が生成されない。
- `collect_subagents()`が削除されている。
- 旧Subagent JSONをvalidation / aggregationするコードが残っていない。
- tests / docs / templatesに新規Subagent JSON作成を要求する記述が残っていない。
- 過去Runに既存の`subagents/*.json`は削除・変更していない。

### G. `run.json`

- `new-run`で新規`run.json`が自動生成される。
- wrapper / collectorによる既存の非Subagent自動更新が動作する。
- 新規v2 manifestに旧Subagent JSON専用fieldが残っていない。
- Hook JSONLを`run.json`へ新規集約していない。
- `CODEX_RUN_ID`伝播等の新規Run correlation基盤を追加していない。
- 過去v1 Runを一括migrationしていない。
- `collect_subagents()`削除後も、Subagentと無関係な`changed_files` / safety / validation等を壊していない。

### H. Cleanup / safety

- 既存Bash `PreToolUse` safety policyが引き続き動く。
- `.codex/logs/*.jsonl`が`git status`へ出ない。
- `observe.*`を削除する場合、dead callerを残していない。
- Product code、ECサイト仕様、カリキュラム本体に差分がない。
- standard Runでevaluationなしでも既存どおり成功する。

---

## 10. 変更対象

### 確定変更候補

- `.codex/config.toml`
- canonical Hook logger 1ファイル
- `AGENTS.md`
- `.codex/templates/REPORT.md`
- `.codex/templates/RUN_MANIFEST.json`
- `.codex/templates/subagent-run.schema.json`（削除）
- `scripts/collect-run-artifacts.py`
- `docs/reference/codex-implementation-harness.md`
- 旧Subagent JSON / Hook loggerに関係するtargeted tests

### caller確認後に整理

- `.codex/hooks/observe.ps1`
- `.codex/hooks/observe.sh`
- `.codex/templates/hook-observation.schema.json`
- `.codex/observations/`向けdead reference
- 不要になった`CODEX_HOOK_*`環境変数契約
- 関連docs / tests

### 原則変更しない

- `scripts/codex-safe.ps1`
- `scripts/codex-safe.sh`
- `scripts/codex-task.ps1`
- `scripts/codex-task.sh`
- `scripts/new-run.ps1`
- `scripts/new-run.sh`
- `.codex/templates/EVALUATION.md`
- `.codex/templates/evaluation.schema.json`
- Product code
- ECサイト仕様 / カリキュラム本体
- 過去Run配下の既存`subagents/*.json`

既存挙動が今回の廃止対象に直接依存していることが確認された場合だけ、原則変更しないファイルを必要最小限で変更する。

---

## 11. Non-goals

- Hook logを`run.json`へ新規集約しない。
- Subagent情報を`run.json`へ新規集約しない。
- HookとRunの完全correlation基盤を作らない。
- `CODEX_RUN_ID`伝播を追加しない。
- `1 Codex process = 1 Run`制約を導入しない。
- active-run registryを作らない。
- Subagent専用Structured Artifactを別形式で再発明しない。
- manifest migration utilityを作らない。
- 全Toolのresult parserを作らない。
- hosted / specialized Toolを疑似Hookで捕捉しない。
- Raw Hook logをGit管理しない。
- private chain-of-thoughtを保存しない。
- `evaluation.json`を再設計しない。
- Run管理基盤全体を再設計しない。

---

## 12. 成功判定

以下をすべて満たせば完了とする。

- Codexが全行動をREPORTへ逐次記帳しなくても、Hookから指示・Tool実行・Subagent lifecycle・turn終了を確認できる。
- Subagentを使った場合、REPORTから「何を任せたか」「結果は何だったか」「Parentがどう判断したか」を確認できる。
- 新規RunではSubagent専用JSONを作成・更新・validation・aggregationする機能が残っていない。
- 過去RunのSubagent JSONはそのまま保持されている。
- `run.json`は従来どおり自動生成・自動更新されるが、Hookログの新しい二重集約先にはなっていない。
- Hook / REPORT / run.json / wrapper logの責務が重複していない。
- 既存Safety Hook、validation、evaluation、Product codeを壊していない。
- 今回の目的のためにDB、daemon、Run correlation基盤、migration framework等の追加基盤を導入していない。
