# Codex HookによるRunログ自動化・既存観測機能整理プラン

## 0. 依頼概要

- 依頼内容:
  - Codex自身に`.codex/runs/<run_id>/REPORT.md`へ細かな行動を逐次記録させる現行運用を見直す。
  - 「どのような指示を受けたか」「何を実行したか」「どこで・なぜ止まったか」を後から分析できる機械ログをCodex Hooksで残す。
  - 「何を考えてその方針を選んだか」は、逐語的な内部思考ではなく、外部化できるDecision / Rationale / 計画変更理由としてRun Artifactへ残す。
  - `.codex/runs/`は維持するが、`REPORT.md`は機械ログではなく意味のあるcheckpoint記録へ縮小する。
  - `run.json`はCodexが手書きせず、既存の`new-run` / wrapper / collectorで機械生成・更新するmanifestとして扱う。
  - `evaluation.json`は今回新たに再設計しない。現在の通常Runで既にoptionalなら、そのまま維持する。
  - `.codex/hooks/observe.ps1` / `observe.sh`が実運用で未使用なら、canonical Hook loggerへ責務を統合したうえで整理する。

- 背景:
  - 現在の`AGENTS.md`と`.codex/templates/REPORT.md`では、調査・編集・判断・コマンド実行を含む行動のたびにCodex自身が`REPORT.md`へ追記する契約になっている。
  - `scripts/codex-task.ps1|sh`にはwrapper lifecycle / validation用JSONLログが既に存在する。
  - `.codex/hooks/observe.ps1|sh`には観測用JSONL writerが存在するが、現在のproject-scoped Hook設定から直接利用されていない。
  - `scripts/collect-run-artifacts.py`にはHook eventを`run.json`へ集約する基盤が既にある。

- 期待成果:
  - Codexが記録作業のためだけに余計なファイル編集をしなくてよくなる。
  - 指示、実行、停止、判断理由を後から時系列で追跡できる。
  - Hook log、wrapper log、`REPORT.md`、`run.json`へ同じ情報を重複記録しない。
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
   - `PostToolUse`: 何を実行したか、結果はどうだったか。
   - `Stop`: どこで処理を終えたか、終了時の情報、取得可能なら停止理由。
4. `codex-task` JSONL / report JSON
   - wrapper lifecycle、preflight、scope、schema validation、verify等。
5. `run.json`
   - 上記machine-readable artifactを集約した自動生成manifest。
6. `evaluation.json`
   - 評価が必要なworkflowだけで利用する既存artifact。今回のHook導入のためには再設計しない。

### 完了条件（DoD）

- [ ] 対象Codex CLIで`UserPromptSubmit`、`PostToolUse`、`Stop`相当Hookの利用可否、payload、exit semanticsを実機確認している。
- [ ] Codexが通常作業の各行動ごとに`REPORT.md`へ追記する契約を廃止している。
- [ ] `REPORT.md`の更新条件が明確に固定されている。
- [ ] `UserPromptSubmit`で受けた指示を、機密情報を除外し長さを制限した形でJSONLへ記録できる。
- [ ] `PostToolUse`でTool実行のmachine-readable EvidenceをJSONLへ記録できる。
- [ ] `Stop`でturnの終了を記録し、Hook payloadで取得できる終了情報を保存できる。
- [ ] 明示的なstop reasonがHook payloadに存在しない場合、loggerが停止理由を推測・捏造しない。
- [ ] 停止理由やblockerが意味情報として必要な場合は、`REPORT.md`のcheckpointにRemaining / Blockerとして残せる。
- [ ] Hook loggerは原則1実装に統一され、`observe.ps1|sh`と新loggerが重複して残らない。
- [ ] `codex-task` JSONLはwrapper / validation専用のままとし、Hook logと責務を重複させない。
- [ ] `run.json`はCodexが手編集せず、既存の機械生成経路だけで生成・更新される。
- [ ] Run IDを持つHook eventだけを`run.json`へ集約する。Run IDなしeventを「最新Run」等へ推測で関連付けない。
- [ ] `evaluation.json`がstandard Runで既にoptionalなら、evaluation関連コード・schema・templateを変更しない。
- [ ] Hook logging failureはCodex本作業を原則blockしない。ただし既存`PreToolUse` safety Hookのblocking behaviorは変更しない。
- [ ] Hook logへcredential / token / authorization header / transcript全文 / 巨大Tool response全文を保存しない。
- [ ] Raw JSONLはGit管理対象外のままである。
- [ ] Product code、ECサイト仕様、カリキュラム本体を変更していない。

## 2. 現状理解と前提

### Current understanding

- `.codex/config.toml`では`[features] hooks = true`になっている。
- 現在project configに登録されているHookはBash向け`PreToolUse` safety policyである。
- `.codex/hooks/observe.ps1` / `observe.sh`は観測eventをJSONLへ書く実装を持つが、現在の`.codex/config.toml`から直接呼ばれていない。
- `observe.ps1|sh`は`CODEX_HOOK_*`環境変数を入力契約としており、native Hook stdin payloadを直接扱う現在のcanonical loggerとして採用する前提にはしない。
- `.codex/logs/.gitignore`は`*.jsonl`をGit管理対象外にしている。
- `scripts/codex-task.ps1|sh`はwrapper / validation用のmachine-readable logを既に持つ。
- `scripts/collect-run-artifacts.py`はHook eventを識別し、Run IDが一致するeventを`run.json`へ集約できる基盤を持つ。
- `scripts/new-run.*`は`run.json`の初期manifestを生成できる。
- 現在の`codex-task`ではevaluation template / requireは明示optionであり、標準defaultでは無効になっている。
- 現在の`.codex/templates/REPORT.md`は「行動のたびに追記」「コマンドや確認結果を必ず記録」としている。

### Assumptions

- Codex Hook仕様はCLI version依存とし、実装前の実機確認結果を正とする。
- Node.jsは既存実行基盤なので、cross-platform loggerを1つ置く場合の第一候補とする。
- Run IDなしinteractive eventをRunへ紐付けるためのactive-run registry、DB、daemon、最新Run推測などは追加しない。
- Hook logの目的は分析可能なEvidenceを残すことであり、完全な監査証跡を構築することではない。

### Non-goals

- `.codex/runs/`を廃止しない。
- Run管理基盤全体を再設計しない。
- `RUN_MANIFEST.json`へ新しい主観評価fieldを増やさない。
- `evaluation.json`を今回の主目的として再設計しない。
- `PLAN.md` / `TASKS.md`を機械生成へ置き換えない。
- 逐語的な内部思考・private chain-of-thoughtをログへ保存しない。
- 全Toolのinput / responseを無条件保存しない。
- `PreToolUse` safety policyを再設計しない。
- 外部ログサービス、DB、常駐processを導入しない。
- Product codeやテスト対象機能を変更しない。

## 3. 質問 / 曖昧性

- 必ず質問する不透明点:
  - 現時点ではなし。
- 仮定してよい細部:
  - canonical Hook loggerのファイル名。
  - JSONLの非本質的metadata key名。
  - targeted test fixtureの配置場所。
- 未回答の重要質問:
  - なし。

### 実装中の停止条件

- `UserPromptSubmit` / `PostToolUse` / `Stop`のうち必要eventが現行CLIでproject-scoped Hookから利用できない場合、wrapperへ疑似Hookを大量実装して補わない。利用できるeventだけで最小構成を再評価する。
- `observe.ps1|sh`に有効なcallerが存在する場合、callerを移行せずに削除しない。
- Run IDを信頼できる形で取得できないeventは、Runへ推測で紐付けない。
- Hook payloadからsecretを安全に除外できないfieldは保存対象から外す。
- logging Hookが既存safety Hookへ干渉する場合、safetyを優先してlogging scopeを縮小する。
- `run.json`へ追加しようとする情報がAI判断を必要とする場合、その情報はmanifestへ入れない。

## 4. 影響範囲

### Impacted areas

- Codex project config
- Hook logger
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
- `.codex/logs/.gitignore`
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
5. 以下の責務を固定する。

- `UserPromptSubmit`:
  - 指示内容のsanitized / bounded copyを記録する。
  - prompt全文を無制限保存しない。
- `PostToolUse`:
  - Tool名、turn / tool use identifier、success / failure相当、必要最小限のTool summaryを記録する。
  - Toolごとの万能summary engineは作らない。必要なToolだけallowlist方式で扱う。
- `Stop`:
  - turn終了、turn ID、取得可能な最終応答情報、Hook payloadに明示される停止情報を記録する。
  - explicit stop reasonがない場合にlogger側で理由を推測しない。
- `REPORT.md`:
  - 指示の再掲や全Tool実行一覧は書かない。
  - 実装中に発生したDecision / Rationale / 計画変更、重要な検証結果、blocker、Remainingを残す。
- `codex-task` log:
  - wrapper / preflight / scope / validation / verify。
- `run.json`:
  - 機械的事実だけを集約するmanifest。

### Phase 2: 最小Hook loggingを実装する

- canonical cross-platform Hook loggerを1つだけ用意する。
- 原則Node `.mjs`を第一候補とし、PowerShell / shellで同じloggingロジックを二重実装しない。
- `.codex/config.toml`へ以下のlogging Hookを接続する。
  - `UserPromptSubmit`
  - `PostToolUse`
  - `Stop`
- 既存Bash safety `PreToolUse`は変更しない。
- loggerはnative Hook stdin payloadを直接処理する。
- 保存fieldはwhitelist方式にする。
- prompt / final message / Tool summary等の文字列は固定上限を設け、超過時はtruncatedであることを記録する。
- secret-like fieldは保存しない。
- Hook logger failureは原則non-blockingにする。
- V1ではHook logの保存先をGit管理外の`.codex/logs/`配下へ統一し、不要な保存rootを増やさない。
- eventにRun IDが含まれる、または信頼できる既存経路からRun IDを渡せる場合だけ`run_id`を記録する。
- Run IDなしeventも分析用Raw logとして残すが、`run.json`へは集約しない。

#### `observe.ps1|sh`整理

- callerなし:
  - 新logger導入後に`observe.ps1` / `observe.sh`を削除する。
  - `.codex/observations/hooks.jsonl`専用fallbackと不要になった`CODEX_HOOK_*`契約を整理する。
- callerあり:
  - callerをcanonical loggerへ移行する。
  - 移行完了後に旧scriptを削除する。
  - 移行できない場合だけ残し、その理由をdocumentする。

### Phase 3: Run Artifact運用を簡素化する

#### `REPORT.md`

現行の「行動のたびに追記」を廃止し、更新条件を次の3つに固定する。

1. `TASKS.md`の1タスクを完了したとき。
2. blocker、重要な新規判断、または計画変更が発生したとき。
3. Runを完了するとき。

各checkpointは最低限以下を持つ。

- Summary
- Changes
- Decision / Rationale（新しい判断が発生した場合のみ）
- Validation
- Blocker / Remaining
- Progress

全command、全Tool call、全promptはREPORTへ重複転記しない。

#### `run.json`

- Codexの手編集対象から外す。
- 既存`new-run` / wrapper / `collect-run-artifacts`で不足なく生成できるなら、それらの実装は変更しない。
- 新Hook eventを集約するために必要な最小変更だけ`collect-run-artifacts.py`へ入れる。
- Run ID一致eventだけ集約する。
- global Raw log内のRun IDなしeventはmanifestへ入れない。

#### `evaluation.json`

- standard Runで既にoptionalならコード、schema、templateは変更しない。
- 今回の変更によってevaluation生成を新たに必須化しない。
- strict / 明示的評価workflowの既存挙動を壊さないことだけ確認する。

### Phase 4: 検証とドキュメント整合

- `AGENTS.md`と`.codex/templates/REPORT.md`を新しいcheckpoint契約へ合わせる。
- `docs/reference/codex-implementation-harness.md`へHook log / wrapper log / REPORT / run.jsonの責務を明記する。
- `observe.*`を削除した場合のみ、関連docs / collector fallbackを整理する。
- evaluation関連ファイルは、実装変更が不要なら変更しない。

### 実行タスク

- [ ] 1. 現行Codex CLIで`UserPromptSubmit` / `PostToolUse` / `Stop`のpayloadと挙動を実機確認する。
- [ ] 2. `observe.*`、旧Hook環境変数、collector、run/evaluation関連の参照を棚卸しする。
- [ ] 3. canonical Hook loggerを1つ実装し、prompt / Tool / Stop情報をsanitized・bounded JSONLとして記録する。
- [ ] 4. `.codex/config.toml`へ3eventを接続し、既存safety Hookを維持する。
- [ ] 5. `collect-run-artifacts.py`を必要な場合だけ新Hook schemaへ合わせ、Run ID一致eventだけ集約する。
- [ ] 6. caller移行後、未使用`observe.ps1|sh`と旧fallback / 契約を整理する。
- [ ] 7. `AGENTS.md` / `.codex/templates/REPORT.md`を3条件のcheckpoint型へ変更し、`run.json`手編集を禁止する。
- [ ] 8. implementation harness docsを新責務へ合わせる。evaluationは既にoptionalなら変更しない。
- [ ] 9. targeted test / smoke validationを実行し、raw JSONLがGit tracking対象外であることを確認する。

## 6. 検証方法

### A. Hook lifecycle確認

同一session / turnで最低限以下を確認する。

1. `UserPromptSubmit`が記録される。
2. 1回以上のTool実行後に`PostToolUse`が記録される。
3. turn終了時に`Stop`が記録される。
4. session / turn identifierで指示→実行→停止を時系列に追える。

### B. 指示ログ確認

- promptが分析可能な形で記録される。
- promptが上限超過した場合はtruncateされ、その事実が分かる。
- secret-like dataをそのまま保存しない。
- REPORTへprompt全文を二重保存しない。

### C. Tool実行ログ確認

- `PostToolUse`でTool名とidentifierを記録できる。
- success / failure相当を取得可能なpayloadから記録できる。
- Tool response全文や巨大patchを保存しない。
- 未対応Toolのために複雑なsummary実装を追加せず、最低限のeventとして記録できる。

### D. Stop分析確認

- `Stop` eventが必ず記録される。
- Hook payloadで取得できる最終応答情報をboundedに記録できる。
- payloadに明示的stop reasonがある場合は保存する。
- explicit reasonがない場合は`unknown` / `not_provided`等として扱い、loggerが推測しない。
- blockerやRemainingが実際の停止理由として重要な場合、Runのcheckpoint REPORTから確認できる。

### E. `run.json`確認

- `new-run`だけで初期manifestを生成できる既存挙動を維持する。
- Codexが`run.json`を手編集しなくてもmanifestが更新できる。
- Run ID一致Hook eventはcollectorでsummaryへ反映できる。
- Run IDなしeventはglobal Raw logに残るが、どのRunかを推測してmanifestへ入れない。
- `REPORT.md`自然言語をparseしてmanifestを作らない。

### F. evaluation回帰確認

- standard Runでevaluationなしでも既存どおり成功できることを確認する。
- 既に満たしている場合、evaluation関連実装・schema・templateには差分を入れない。
- strict / 明示require経路を変更した場合に限り、その回帰確認を追加する。

### G. `observe.*` / dead code確認

- 削除前にrepo内callerを確認する。
- callerがなければ削除後の旧path、旧環境変数、`.codex/observations`参照が不要な範囲で0件になることを確認する。
- collector / docsへdead fallbackを残さない。

### H. REPORT運用smoke

- Tool実行ごとにREPORTを編集しない。
- REPORT更新は以下だけで発生する。
  - TASK完了
  - blocker / 重要判断 / 計画変更
  - Run完了
- Decision / Rationaleには逐語的な内部思考ではなく、実装判断として共有可能な理由だけを記録する。

### I. Safety / Git tracking

- 既存Bash `PreToolUse` safety policyが引き続き動く。
- logging Hook failureがsafety判定を上書きしない。
- sandbox / approval / network policyを変更していない。
- `.codex/logs/*.jsonl`が`git status`へ出ない。
- Product codeに差分がない。

### 成功判定

- 「どの指示で」「どのToolを使い」「どの結果になり」「どこで停止したか」をRaw logから追える。
- 「なぜその方針を選んだか」はREPORTのDecision / Rationaleから追える。
- explicit stop reasonが取れない場合でも、Stop eventと最終応答情報、REPORTのBlocker / Remainingから事実ベースで分析でき、loggerが理由を捏造しない。
- Codexが細かな記帳をしなくても必要なEvidenceが残る。
- `run.json`はCodex手編集なしで維持できる。
- standard Runで不要なevaluation変更を行っていない。
- Hook / wrapper / REPORT / manifest間に同じ情報の不要な多重記録がない。
- logging追加で既存safety behaviorが弱くなっていない。

## 7. リスクと未解決論点

### Risks

- Codex CLIのHook payloadがversionによって異なる可能性がある。
- `UserPromptSubmit`に機密情報が含まれる可能性があるため、保存field / redaction / length capを誤ると情報漏えいリスクになる。
- Stop payloadだけでは「なぜ停止したか」が明示されない可能性がある。取得できない理由をloggerが推測しないことが重要。
- `observe.ps1|sh`がproject config外から利用されている可能性がある。
- global Hook logが増大する可能性があるが、V1ではrotation / DB等を導入せず、必要性が確認された場合だけ別タスクで扱う。
- REPORTを軽量化しすぎるとDecision / Rationaleが失われるため、機械ログと意味情報の境界を維持する必要がある。

### Open questions

- なし。Hook payloadの実機確認結果によってfield名や取得可能情報だけを局所調整する。

## 8. 成果物

### 変更ファイル（想定）

確定変更候補:

- `.codex/config.toml`
- `AGENTS.md`
- `.codex/templates/REPORT.md`
- canonical Hook logger 1ファイル
- `docs/reference/codex-implementation-harness.md`

実装確認後、必要な場合だけ変更:

- `scripts/collect-run-artifacts.py`
- `.codex/templates/RUN_MANIFEST.json`
- `.codex/logs/.gitignore`
- `docs/reference/codex-safety-harness.md`
- 関連する`scripts/tests/**`

整理候補:

- `.codex/hooks/observe.ps1`
- `.codex/hooks/observe.sh`

原則変更しない:

- `.codex/templates/EVALUATION.md`
- `.codex/templates/evaluation.schema.json`
- `scripts/new-run.ps1`
- `scripts/new-run.sh`
- `scripts/codex-task.ps1`
- `scripts/codex-task.sh`

既存挙動が本計画の完了条件を満たさないことが確認された場合だけ、上記「原則変更しない」ファイルを最小範囲で変更する。

### 付随ドキュメント

- 本プラン以外に新しい`docs/reports/`は作成しない。
- 実装時の通常進捗はRun-local `REPORT.md`へcheckpoint単位で残す。

## 9. 備考

- 主眼は「ログを増やすこと」ではなく、「Codex自身の機械的な記帳を自動化し、後から分析可能な情報だけを適切な場所に残すこと」である。
- Hook V1は`UserPromptSubmit` / `PostToolUse` / `Stop`に限定する。それ以外のHook eventは具体的な分析要件が出るまで追加しない。
- `run.json`はmachine-generated manifestとして残すが、Codexや人間が直接メンテナンスする文書として扱わない。
- `evaluation.json`は今回の主目的ではない。既存のoptional運用が成立しているなら変更しない。
- `observe.ps1|sh`はconfig未参照だけを理由に即削除せず、caller確認後に整理する。
- private chain-of-thoughtは保存対象にせず、共有可能なDecision / Rationaleとして意味情報だけを残す。
- Hook追加後に`codex-task log + Hook log + REPORT + run.json`へ同じcommand/resultが複製される設計は完了条件未達とする。
