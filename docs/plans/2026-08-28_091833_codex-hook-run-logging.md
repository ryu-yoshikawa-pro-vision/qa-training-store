# Codex HookによるRunログ自動化・既存観測機能整理プラン

## 0. 依頼概要

- 依頼内容:
  - Codex自身に`.codex/runs/<run_id>/REPORT.md`へ細かな行動を逐次記録させる現行運用を見直す。
  - 「どのような指示を受けたか」「何を実行したか」「どこで処理を終えたか」を後から分析できる機械ログをCodex Hooksで残す。
  - 「なぜその方針を選んだか」は、逐語的な内部思考ではなく、共有可能なDecision / Rationale / 計画変更理由としてRun Artifactへ残す。
  - `.codex/runs/`は維持するが、`REPORT.md`は機械ログではなく意味のあるcheckpoint記録へ縮小する。
  - `run.json`はCodexが手書きせず、既存の`new-run` / wrapper / collectorで機械生成・更新するmanifestとして扱う。
  - `evaluation.json`は今回再設計しない。通常Runで既にoptionalな既存挙動を維持する。
  - `.codex/hooks/observe.ps1` / `observe.sh`が実運用で未使用なら、新しいcanonical Hook loggerへ責務を統合したうえで整理する。

- 背景:
  - 現在の`AGENTS.md`と`.codex/templates/REPORT.md`では、調査・編集・判断・コマンド実行を含む細かな行動をCodex自身が`REPORT.md`へ記録する契約が残っている。
  - `scripts/codex-task.ps1|sh`にはwrapper lifecycle / validation用JSONLログが既に存在する。
  - `.codex/hooks/observe.ps1|sh`には観測用JSONL writerが存在するが、現在のproject-scoped Hook設定から直接利用されていない。
  - `scripts/collect-run-artifacts.py`にはHook eventを`run.json`へ集約する基盤が既にある。

- 期待成果:
  - Codexが記録作業のためだけに余計なファイル編集をしなくてよくなる。
  - 指示、Tool実行、turn終了、判断理由を後から時系列で分析できる。
  - Hook log、wrapper log、`REPORT.md`、`run.json`へ同じ情報を不要に重複記録しない。
  - 既存の安全性・scope・validation基盤を壊さず、変更範囲を必要最小限に留める。

## 1. ゴール / 完了条件

### ゴール

Runの記録責務を以下へ整理する。

1. `PLAN.md` / `TASKS.md`
   - 計画、作業項目、進捗、blocked item。
2. `REPORT.md`
   - 実行中に発生した重要なDecision / Rationale、計画変更、検証結果、blocker、Remaining。
3. Hook JSONL
   - `UserPromptSubmit`: どのような指示を受けたか。
   - `PostToolUse`: Hookで観測可能な範囲で、どのToolを実行したか。
   - `Stop`: turnが終了した事実と、その時点の最終assistant message。
4. `codex-task` JSONL / report JSON
   - wrapper lifecycle、preflight、scope、schema validation、verify等。
5. `run.json`
   - machine-readable artifactを集約する自動生成manifest。
6. `evaluation.json`
   - 評価が必要なworkflowだけで利用する既存artifact。今回のHook導入では再設計しない。

### 完了条件（DoD）

- [ ] 実装時点のCodex CLIで`UserPromptSubmit`、`PostToolUse`、`Stop`のpayload、stdout / exit semantics、Tool coverageを実機確認している。
- [ ] Codexが通常作業の各行動ごとに`REPORT.md`へ追記する契約を廃止している。
- [ ] `REPORT.md`の更新条件を「TASK完了」「blocker / 重要判断 / 計画変更」「Run完了」の3条件に固定している。
- [ ] `UserPromptSubmit`で指示内容のsanitized / bounded copyをJSONLへ記録できる。
- [ ] promptが上限超過した場合、切り詰められたことをログから判別できる。
- [ ] promptに含まれる既知のcredential / token形式はbest-effortでredactし、任意のfree-form secretを完全検出できるとは扱わない。
- [ ] `PostToolUse`で`tool_name` / `tool_use_id`と、必要最小限のbounded summaryを記録できる。
- [ ] 全Tool共通の`success / failure`を無理に正規化しない。現在のpayloadから安定して取得できるTool固有result metadataだけを必要時に記録する。
- [ ] Hosted `WebSearch`等、Hookで観測できないTool pathが存在することを明記し、「ログにない = 実行していない」と判断しない。
- [ ] `Stop`で`turn_id` / `stop_hook_active` / bounded `last_assistant_message`を記録できる。
- [ ] `Stop`入力には停止理由が直接渡らない前提とし、loggerが「なぜ止まったか」を推測・捏造しない。
- [ ] 停止理由の分析が必要な場合は、`Stop` event、最終assistant message、`REPORT.md`のBlocker / Remaining、wrapper / validation logを組み合わせて事実ベースで判断できる。
- [ ] `UserPromptSubmit` / `PostToolUse` / `Stop`の共通metadataとして、取得可能な`session_id` / `turn_id` / `model` / `permission_mode`を記録できる。
- [ ] logging HookはCodexの挙動を変更しない観測専用Hookとして実装する。
- [ ] `UserPromptSubmit`は正常時にstdoutへplain textやadditional contextを出さない。
- [ ] `PostToolUse`は正常時にfeedback / decision / additional contextを返さない。
- [ ] `Stop`はexit 0時に有効なno-op JSONをstdoutへ返し、continuationやblockを発生させない。
- [ ] logger内部の記録失敗時も、既存Codex作業を可能な限り止めない。特に`Stop`ではHook failureを避けるため有効なno-op JSONを返す。
- [ ] Hook loggerは原則1実装に統一され、`observe.ps1|sh`と新loggerが重複して残らない。
- [ ] Hook logのcanonical保存先をGit管理外の`.codex/logs/`に統一している。
- [ ] `scripts/collect-run-artifacts.py`がcanonical Hook logを明示的に読み、`run_id`一致eventだけを`run.json`へ集約する。
- [ ] `UserPromptSubmit`を含む新Hook eventがcollectorの認識eventへ反映されている。
- [ ] Run IDなしeventを「最新Run」等へ推測で関連付けない。
- [ ] `run.json`はCodexが手編集せず、既存の機械生成経路だけで生成・更新される。
- [ ] `evaluation.json`がstandard Runで既にoptionalなら、evaluation関連コード・schema・templateを変更しない。
- [ ] 既存Bash `PreToolUse` safety Hookのblocking behaviorを変更しない。
- [ ] Raw JSONLはGit管理対象外のままである。
- [ ] Product code、ECサイト仕様、カリキュラム本体を変更していない。

## 2. 現状理解と前提

### Current understanding

- `.codex/config.toml`では`[features] hooks = true`になっている。
- 現在project configに登録されているHookはBash向け`PreToolUse` safety policyである。
- `.codex/hooks/observe.ps1` / `observe.sh`は観測eventをJSONLへ書く実装を持つが、現在の`.codex/config.toml`から直接呼ばれていない。
- `observe.ps1|sh`は`CODEX_HOOK_*`環境変数を入力契約としており、native Hook stdin payloadを直接扱うcanonical loggerとしてそのまま採用する前提にはしない。
- `.codex/logs/.gitignore`は`*.jsonl`をGit管理対象外にしている。
- repository rootの`.gitignore`では`.codex/observations/`がignoreされている。
- `scripts/codex-task.ps1|sh`はwrapper / validation用machine-readable logを既に持つ。
- `scripts/collect-run-artifacts.py`はHook eventを識別するが、現状は`.codex/observations/hooks.jsonl`とRun-local `logs/*.jsonl`を主に扱うため、canonical保存先を`.codex/logs/`へ変更するならcollector変更が必要である。
- 現在のcollector側Hook event一覧には`UserPromptSubmit`が含まれていないため、新eventを集約するなら更新が必要である。
- `.codex/templates/hook-observation.schema.json`のevent enumにも`UserPromptSubmit`が含まれていないため、既存schemaを継続利用する場合は最小更新が必要である。
- `scripts/new-run.*`は`run.json`の初期manifestを生成できる。
- 現在の`codex-task`ではevaluation template / requireは明示optionであり、標準defaultでは無効になっている。
- 現在の`.codex/templates/REPORT.md`は「行動のたびに追記」「コマンドや確認結果を必ず記録」としている。

### Codex Hookの前提

実装時点の公式仕様を正とするが、計画時点では以下を前提とする。

- 共通入力には`session_id`、`cwd`、`hook_event_name`、`model`等があり、turn-scoped hookには`turn_id`がある。
- `UserPromptSubmit`は`prompt`を受け取り、plain text stdoutはdeveloper contextとしてCodexへ追加されるため、観測専用Hookではstdoutを空にする。
- `PostToolUse`は`tool_name`、`tool_use_id`、`tool_input`、`tool_response`を受け取る。
- `PostToolUse`はBash、`apply_patch`、MCP、その他多くのlocal function toolを観測できるが、hosted `WebSearch`等は観測対象外であり、一部specialized pathもopt-out可能である。
- `Stop`は`turn_id`、`stop_hook_active`、`last_assistant_message`を受け取る。停止理由そのものは入力fieldとして提供されない。
- `Stop`はexit 0時にJSON stdoutを期待するため、観測専用loggerはno-op JSONだけを返す。
- `stopReason`はHookからCodexへ返す出力fieldであり、Codexが停止した理由を受け取る入力fieldではない。

### Assumptions

- Node.jsは既存実行基盤なので、cross-platform loggerを1つ置く場合の第一候補とする。
- Run IDなしinteractive eventをRunへ紐付けるためのactive-run registry、DB、daemon、最新Run推測は追加しない。
- Hook実行processへ`CODEX_RUN_ID`等の信頼できる既存Run IDが継承される場合だけ`run_id`を記録する。継承されない場合はnullとする。
- Hook logの目的は分析可能なEvidenceを残すことであり、完全な監査証跡を構築することではない。
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
- `PreToolUse` safety policyを再設計しない。
- 外部ログサービス、DB、常駐processを導入しない。
- Product codeやテスト対象機能を変更しない。

## 3. 質問 / 曖昧性

- 必ず質問する不透明点:
  - 現時点ではなし。
- 仮定してよい細部:
  - canonical Hook loggerのファイル名。
  - JSONLの非本質的metadata key名。
  - prompt / message / Tool summaryの固定上限値。1か所の定数として管理し、テスト可能にする。
  - targeted test fixtureの配置場所。
- 未回答の重要質問:
  - なし。

### 実装中の停止条件

- `UserPromptSubmit` / `PostToolUse` / `Stop`のいずれかが現行CLIでproject-scoped Hookから利用できない場合、wrapperへ疑似Hookを大量実装して補わない。利用可能なeventだけで最小構成を再評価する。
- Hook commandのstdout / exit挙動が現行公式仕様と実機で異なる場合、現行実機仕様を優先し、観測HookがCodexをsteerしないことを最優先する。
- `observe.ps1|sh`に有効なcallerが存在する場合、callerを移行せずに削除しない。
- Run IDを信頼できる形で取得できないeventは、Runへ推測で紐付けない。
- prompt / Tool payloadから安全に扱えないfieldは保存対象から外す。
- logging Hookが既存safety Hookへ干渉する場合、safetyを優先してlogging scopeを縮小する。
- `run.json`へ追加しようとする情報がAI判断を必要とする場合、その情報はmanifestへ入れない。

## 4. 影響範囲

### Impacted areas

- Codex project config
- Hook logger
- Hook observation schema
- Hook log aggregation
- Run Report運用ルール
- Codex harness documentation
- targeted tests

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
- `.codex/logs/.gitignore`
- `.gitignore`
- `scripts/new-run.ps1`
- `scripts/new-run.sh`
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
- `.codex/observations`
- `hooks.jsonl`
- `hook-observations`
- `hook_observations`
- `hook_event_count`
- `Write-TaskLog`
- `run.json`
- `evaluation.json`
- `EvaluationTemplate`
- `RequireEvaluation`

## 5. 変更方針

### Phase 1: 現状確認と責務固定

1. 現行Codex CLIのHook仕様を実機確認する。
2. `observe.ps1|sh`のcallerを確認する。
3. `run.json`が既に機械生成・更新できる範囲を確認する。
4. standard Runで`evaluation.json`が既にoptionalであることを確認する。
5. Hook eventの責務を以下へ固定する。

#### `UserPromptSubmit`

- 記録する:
  - event / timestamp
  - session_id / turn_id
  - model / permission_mode
  - run_id（信頼できる値がある場合のみ）
  - sanitized / bounded prompt copy
  - truncated flag
- 保存前に既知secret patternをbest-effort redactionする。
- 任意のfree-form secretを完全検出できるとは扱わない。
- transcriptは読まない。
- stdoutへplain text / additionalContextを出さない。

#### `PostToolUse`

- 記録する:
  - event / timestamp
  - session_id / turn_id
  - model / permission_mode
  - run_id（信頼できる値がある場合のみ）
  - tool_name / tool_use_id
  - sanitized / bounded input summary
  - 必要なToolだけ、安定取得できるbounded response / result metadata
- `tool_input` / `tool_response`全文を保存しない。
- 全Tool共通`success / failure`fieldを作らない。
- Tool別の万能summary engineを作らない。
- 未対応Toolでもevent自体は記録できる形を優先する。
- hosted / specialized toolを完全捕捉できるとは扱わない。
- stdoutへdecision / feedback / additionalContextを返さない。

#### `Stop`

- 記録する:
  - event / timestamp
  - session_id / turn_id
  - model / permission_mode
  - run_id（信頼できる値がある場合のみ）
  - stop_hook_active
  - sanitized / bounded last_assistant_message
  - truncated flag
- 「なぜ停止したか」を表す入力fieldは存在しない前提とする。
- `stopReason`を入力から取得しようとしない。
- logger側で停止理由を分類・推測しない。
- 正常時もlogger内部エラー時も、可能な限りexit 0 + 有効なno-op JSON stdoutを返し、Codexのturnをcontinue / blockしない。

#### `REPORT.md`

- 指示全文、全Tool実行一覧、最終assistant messageを重複転記しない。
- 共有可能なDecision / Rationale、計画変更、重要な検証結果、blocker、Remainingだけを残す。
- 内部の逐語的思考は記録しない。

#### `codex-task` log

- wrapper / preflight / scope / schema validation / verify等の実行基盤情報を担当する。
- Tool単位Hook logへ寄せない。

#### `run.json`

- 機械的事実だけを集約するmanifestとする。
- Hook Raw payloadやREPORT本文を複製しない。

### Phase 2: 最小Hook loggingを実装する

- canonical cross-platform Hook loggerを1つだけ用意する。
- 原則Node `.mjs`を第一候補とし、PowerShell / shellで同じloggingロジックを二重実装しない。
- `.codex/config.toml`へ以下3eventを接続する。
  - `UserPromptSubmit`
  - `PostToolUse`
  - `Stop`
- 既存Bash safety `PreToolUse`は変更しない。
- loggerはnative Hook stdin payloadを直接処理する。
- V1ではHook logの保存先を`.codex/logs/`へ統一する。
- session単位で追いやすくし、並行sessionの書き込み競合を避けるため、原則`.codex/logs/hooks-<session_id>.jsonl`のようなsession単位fileを使用する。実際のsafe filename化は実装で行う。
- すべてのeventを1行1JSONでappendする。
- Raw JSONLはGit管理外とする。
- eventにRun IDが含まれる、またはHook processへ信頼できる既存`CODEX_RUN_ID`が継承される場合だけ`run_id`を記録する。
- Run IDなしeventも分析用Raw logとして残すが、`run.json`へは集約しない。
- prompt / final message / Tool summaryは固定上限を設け、超過時はtruncated flagを記録する。
- redactionとtruncateは共通helperで行い、eventごとに別実装しない。
- loggerの通常処理ではstdoutへdebug logを出さない。
- `UserPromptSubmit` / `PostToolUse`は観測結果をCodex contextへ注入しない。
- `Stop`はno-op JSON以外を返さない。
- V1ではrotation、DB、外部送信を実装しない。

#### 既存`hook-observation.schema.json`

- 既存schemaを継続利用する場合のみ、V1 loggerが出力するeventを表現できる最小変更を行う。
- 少なくとも`UserPromptSubmit`をevent enumへ追加する。
- session / turn / model / permission / Hook-specific dataは、既存schemaを大きく作り直さず表現できる範囲で追加する。
- schema v2への全面刷新は行わない。
- 既存schemaをlogger validationに利用していないことが確認された場合でも、dead schemaとして残すのではなく、利用実態を確認して必要性を判断する。

#### `observe.ps1|sh`整理

- callerなし:
  - 新logger導入後に`observe.ps1` / `observe.sh`を削除する。
  - `.codex/observations/hooks.jsonl`専用fallbackと不要になった`CODEX_HOOK_*`契約を整理する。
- callerあり:
  - callerをcanonical loggerへ移行する。
  - 移行完了後に旧scriptを削除する。
  - 安全に移行できない場合だけ残し、その理由をdocumentする。

### Phase 3: CollectorとRun Artifact運用を最小修正する

#### `scripts/collect-run-artifacts.py`

canonical保存先を`.codex/logs/`にするため、collector変更は本計画の確定対象とする。

- `.codex/logs/hooks-*.jsonl`を明示的に走査する。
- Hook observationとして識別できるeventだけを読む。
- `UserPromptSubmit`をHook event一覧へ追加する。
- `run_id`が対象Runと一致するeventだけ集約する。
- Run IDなしeventは件数へ含めない。
- `codex-task-*.jsonl`をHook logとして誤認しない。
- 旧`.codex/observations/hooks.jsonl`を廃止する場合、legacy fallbackを削除する。
- `run.json`にはRaw prompt / Tool input / response / last messageを複製せず、log path / event count / error summary等の既存summaryだけを残す。

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

全command、全Tool call、全promptはREPORTへ重複転記しない。

#### `run.json`

- Codexの手編集対象から外す。
- 既存`new-run` / wrapper / collectorで不足なく生成できる部分は変更しない。
- Hook集約に必要な最小変更だけ行う。
- REPORT自然言語をparseしてmanifestを埋めない。

#### `evaluation.json`

- standard Runで既にoptionalならコード、schema、templateは変更しない。
- 今回の変更によってevaluation生成を新たに必須化しない。
- strict / 明示的評価workflowの既存挙動を壊さないことだけ確認する。

### Phase 4: 検証とドキュメント整合

- `AGENTS.md`と`.codex/templates/REPORT.md`を新しいcheckpoint契約へ合わせる。
- `AGENTS.md`からCodexによる`run.json`手編集を要求する記述を外し、generated manifestとして扱うことを明記する。
- `docs/reference/codex-implementation-harness.md`へHook log / wrapper log / REPORT / run.jsonの責務を明記する。
- Tool Hookは完全な監査ログではなく、hosted tool等を捕捉できない場合があることを明記する。
- `Stop`はturn終了と最終messageを観測するeventであり、停止理由そのものを直接提供するeventではないことを明記する。
- `observe.*`を削除した場合は関連docs / collector fallbackを整理する。
- evaluation関連ファイルは実装変更が不要なら変更しない。

### 実行タスク

- [ ] 1. 現行Codex CLIで`UserPromptSubmit` / `PostToolUse` / `Stop`のinput、stdout / exit semantics、Tool coverageを実機確認する。
- [ ] 2. `observe.*`、旧Hook環境変数、`.codex/observations`、hook schema、collector、run/evaluation関連の参照を棚卸しする。
- [ ] 3. canonical Hook loggerを1つ実装し、共通metadata、prompt、Tool、Stop情報をsanitized / bounded JSONLとして記録する。
- [ ] 4. loggerを観測専用にし、`UserPromptSubmit` / `PostToolUse`ではCodexへcontext / feedbackを返さず、`Stop`では有効なno-op JSONだけを返す。
- [ ] 5. `.codex/config.toml`へ3eventを接続し、既存safety Hookを維持する。
- [ ] 6. 既存`hook-observation.schema.json`を継続利用する場合、`UserPromptSubmit`と必要なmetadataを表現できる最小変更を行う。
- [ ] 7. `collect-run-artifacts.py`を`.codex/logs/hooks-*.jsonl`へ対応させ、Run ID一致eventだけ集約する。
- [ ] 8. caller移行後、未使用`observe.ps1|sh`と旧`.codex/observations` fallback / 旧環境変数契約を整理する。
- [ ] 9. `AGENTS.md` / `.codex/templates/REPORT.md`を3条件のcheckpoint型へ変更し、`run.json`手編集を禁止する。
- [ ] 10. implementation harness docsを新責務へ合わせる。evaluationは既にoptionalなら変更しない。
- [ ] 11. targeted test / smoke validationを実行し、Raw JSONLがGit tracking対象外であることを確認する。

## 6. 検証方法

### A. Hook lifecycle / correlation

同一session / turnで最低限以下を確認する。

1. `UserPromptSubmit`が記録される。
2. Hookで観測可能なToolを1回以上実行し、`PostToolUse`が記録される。
3. turn終了時に`Stop`が記録される。
4. `session_id` / `turn_id`で指示 → Tool実行 → turn終了を時系列に追える。
5. `model` / `permission_mode`も各eventから確認できる。

### B. Hookの非干渉性

- `UserPromptSubmit` loggerがplain stdoutやadditionalContextを返さず、promptへdeveloper contextを追加しない。
- `PostToolUse` loggerがdecision / feedback / `continue:false`を返さず、Tool結果を置き換えない。
- `Stop` loggerがexit 0 + 有効なno-op JSONを返し、turn continuationを発生させない。
- logger内部でJSONL書き込みに失敗しても、可能な限りCodex本作業を継続する。
- stdout debug printがない。

### C. 指示ログ

- promptが分析可能なsanitized / bounded copyとして記録される。
- 上限超過時にtruncateされ、その事実が分かる。
- 代表的なAPI key / token / Authorization形式をfixtureでredactできる。
- 任意のfree-form secret完全検出をテスト要件にしない。
- transcript全文を読まない・保存しない。
- REPORTへprompt全文を二重保存しない。

### D. Tool実行ログ

- `PostToolUse`で`tool_name` / `tool_use_id`を記録できる。
- input / response全文を保存しない。
- allowlist対象Toolでは必要最小限のsummaryを記録できる。
- 未対応ToolでもHook eventそのものは壊れず記録できる。
- 全Tool共通statusを作るための複雑なparserが存在しない。
- Bash等で安定したresult metadataが実機payloadから確認できた場合だけ、そのTool用の最小metadataを追加する。
- hosted `WebSearch`を実行してもPostToolUseが来ない可能性を前提とし、それをlogger failureと判定しない。

### E. Stop分析

- `Stop` eventが通常turn終了時に記録される。
- `stop_hook_active`とbounded `last_assistant_message`を記録できる。
- `stopReason`を入力fieldとして読もうとしていない。
- loggerが停止理由を推測するfieldを生成しない。
- blocker / RemainingがあるケースではREPORTから理由を確認できる。
- validation / wrapper failureがあるケースでは`codex-task` logから事実を確認できる。
- process異常終了等で`Stop`自体が残らないケースを「理由不明」として扱え、架空のstop reasonを生成しない。

### F. Collector / `run.json`

fixture Hook JSONLを`.codex/logs/hooks-*.jsonl`へ置いて確認する。

- `UserPromptSubmit` / `PostToolUse` / `Stop`のevent countが集約される。
- 対象Run IDと一致するeventだけを数える。
- Run IDなしeventを対象Runへ含めない。
- 別Run IDを含めない。
- `codex-task-*.jsonl`をHook logとして誤認しない。
- malformed lineで集約全体を不必要に壊さない。
- `run.json`へRaw prompt / Tool payload / last message全文をコピーしない。
- Codexが`run.json`を手編集しなくてもmanifestを維持できる。

### G. evaluation回帰

- standard Runでevaluationなしでも既存どおり成功できることを確認する。
- 既に満たしている場合、evaluation関連実装・schema・templateには差分を入れない。
- strict / 明示require経路を今回変更していなければ、既存targeted test以上の追加変更を行わない。

### H. `observe.*` / dead code

- 削除前にrepo内callerを確認する。
- callerがなければ、新logger導入後に`observe.ps1|sh`を削除する。
- 旧`.codex/observations/hooks.jsonl`、旧環境変数契約、collector legacy fallbackを不要な範囲で削除する。
- dead referenceをdocs / scriptsへ残さない。

### I. REPORT運用

- Tool実行ごとにREPORTを編集しない。
- REPORT更新は以下だけで発生する。
  - TASK完了
  - blocker / 重要判断 / 計画変更
  - Run完了
- TASK完了checkpointで空の`Validation` / `Blocker`等を書かせない。
- Decision / Rationaleには逐語的な内部思考ではなく、実装判断として共有可能な理由だけを記録する。
- Run完了時はValidationとRemainingの有無を確認できる。

### J. Safety / Git tracking

- 既存Bash `PreToolUse` safety policyが引き続き動く。
- logging Hook failureがsafety判定を上書きしない。
- sandbox / approval / network policyを変更していない。
- `.codex/logs/*.jsonl`が`git status`へ出ない。
- Product codeに差分がない。

### 成功判定

- Raw Hook logから「どの指示で」「Hookで観測可能な範囲でどのToolを使い」「どの応答でturnを終えたか」を追える。
- `REPORT.md`から「なぜその方針を選んだか」「何がblockerだったか」を追える。
- Stop eventだけから停止理由を断定せず、Stop / REPORT / wrapper logを組み合わせて事実ベースで分析できる。
- Codexが細かな記帳をしなくても必要なEvidenceが残る。
- Hook logger自身がCodexのprompt、Tool result、turn継続判断へ介入しない。
- `run.json`はCodex手編集なしで維持できる。
- standard Runで不要なevaluation変更を行っていない。
- Hook / wrapper / REPORT / manifest間に同じ情報の不要な多重記録がない。
- logging追加で既存safety behaviorが弱くなっていない。

## 7. リスクと未解決論点

### Risks

- Codex CLI Hook仕様がversionによって変わる可能性がある。
- `UserPromptSubmit`には機密情報が含まれる可能性があり、best-effort redactionでは任意のfree-form secretを完全には除去できない。
- Tool input / responseには機密情報や大容量データが含まれる可能性があるため、全文保存を避ける必要がある。
- Tool Hookにはhosted `WebSearch`等の非対象pathがあるため、完全な行動監査ログにはならない。
- `Stop` payloadだけでは「なぜ停止したか」は分からない。停止理由を分析する場合はREPORT / validation / wrapper evidenceが必要になる。
- `Stop` Hookのstdout契約を誤るとHook failureになり得るため、観測専用no-op JSONを保証する必要がある。
- `observe.ps1|sh`がproject config外から利用されている可能性がある。
- global Hook logが増大する可能性があるが、V1ではrotation / DBを導入せず、必要性が確認された場合だけ別タスクで扱う。
- REPORTを軽量化しすぎるとDecision / Rationaleが失われるため、機械ログと意味情報の境界を維持する必要がある。

### Open questions

- なし。Hook payloadやRun ID環境変数継承の実機確認結果によって、field名や取得可能情報だけを局所調整する。

## 8. 成果物

### 確定変更候補

- `.codex/config.toml`
- `AGENTS.md`
- `.codex/templates/REPORT.md`
- canonical Hook logger 1ファイル
- `scripts/collect-run-artifacts.py`
- `docs/reference/codex-implementation-harness.md`

### 利用実態確認後、必要な場合だけ変更

- `.codex/templates/hook-observation.schema.json`
- `.codex/templates/RUN_MANIFEST.json`
- `.codex/logs/.gitignore`
- `.gitignore`
- `docs/reference/codex-safety-harness.md`
- 関連する`scripts/tests/**`

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
- `scripts/codex-task.ps1`
- `scripts/codex-task.sh`

既存挙動が本計画の完了条件を満たさないことが確認された場合だけ、上記「原則変更しない」ファイルを必要最小限で変更する。

### 付随ドキュメント

- 本プラン以外に新しい`docs/reports/`は作成しない。
- 実装時の通常進捗はRun-local `REPORT.md`へcheckpoint単位で残す。

## 9. 備考

- 主眼は「ログを増やすこと」ではなく、「Codex自身の機械的な記帳を自動化し、後から分析可能な情報だけを適切な場所に残すこと」である。
- Hook V1は`UserPromptSubmit` / `PostToolUse` / `Stop`に限定する。それ以外のHook eventは具体的な分析要件が出るまで追加しない。
- `Stop`は停止理由を取得するHookではなく、turn終了と最終assistant messageを観測するHookとして扱う。
- `run.json`はmachine-generated manifestとして残すが、Codexや人間が直接メンテナンスする文書として扱わない。
- `evaluation.json`は今回の主目的ではない。既存のoptional運用が成立しているなら変更しない。
- `observe.ps1|sh`はconfig未参照だけを理由に即削除せず、caller確認後に整理する。
- private chain-of-thoughtは保存対象にせず、共有可能なDecision / Rationaleとして意味情報だけを残す。
- Hook追加後に`codex-task log + Hook log + REPORT + run.json`へ同じcommand/resultが複製される設計は完了条件未達とする。
