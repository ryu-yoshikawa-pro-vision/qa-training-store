# Codex HookによるRunログ自動化・既存観測機能整理プラン

## 0. 依頼概要

- 依頼内容:
  - Codex自身に`.codex/runs/<run_id>/REPORT.md`へ細かな行動を逐次記録させる現行運用を見直し、機械的な実行EvidenceをCodex Hooksと既存wrapperへ移す。
  - `.codex/runs/`は維持するが、長期保存するRun Artifactの責務を整理する。
  - `run.json`はCodexが手書きする成果物ではなく、実行事実から機械生成・更新するRun manifestとする。
  - `evaluation.json`は通常Runの標準成果物から外し、strict workflow、benchmark、harness評価、失敗原因分析など「実行を評価すること」が目的の場合だけ生成する。
  - `.codex/hooks/observe.ps1` / `observe.sh`が実運用で使用されていない場合は、新しいcanonical Hook loggerへ責務を統合したうえで整理する。
- 背景:
  - 現在の`AGENTS.md`と`.codex/templates/REPORT.md`では、調査・編集・判断・コマンド実行を含む行動のたびにCodex自身が`REPORT.md`へ追記する契約になっている。
  - `scripts/codex-task.ps1|sh`にはwrapper lifecycle / validation用JSONLログが既に存在する。
  - `.codex/hooks/observe.ps1|sh`にはHook観測イベントを書き出す実装が存在するが、現在のproject-scoped Hook設定からは直接呼ばれていない。
  - `scripts/collect-run-artifacts.py`はHookイベント、wrapper report、subagent、validation等を`run.json`へ集約する基盤を既に持つ。
  - `evaluation.json`はagent / reviewerによる解釈・評価を記録する設計であり、runnerが機械判定するartifactではない。
- 期待成果:
  - 機械的な実行事実と、人間・AIが後から読む判断・結果が分離される。
  - Hook log、wrapper log、`REPORT.md`、`run.json`へ同じ情報を重複記録しない。
  - Codexが記録作業のためだけに余計なファイル編集を行わなくてよくなる。
  - 未使用コード、未使用path、不要な環境変数契約を残さない。

## 1. ゴール / 完了条件

### ゴール

Runの情報を次の4層へ整理する。

1. `PLAN.md` / `TASKS.md`
   - 計画、作業項目、進捗。
2. `REPORT.md`
   - 重要な変更、判断、検証結果の要約、残課題。
3. Raw JSONL
   - HookによるTool / Turn Evidenceと、`codex-task`によるwrapper / validation Evidence。
4. `run.json`
   - 上記machine-readable artifactを集約した自動生成manifest。

`evaluation.json`は上記の通常Run構成には含めず、評価が必要なworkflowだけの追加artifactとする。

### 完了条件（DoD）

- [ ] 現行のログproducer / consumer / durable artifactをrepo-wideで棚卸しし、責務が明文化されている。
- [ ] 対象Codex CLIで利用可能なHook event、payload、project-scoped config、exit semanticsを実機確認してから実装している。
- [ ] Codexが通常作業の各行動ごとに`REPORT.md`へ追記する契約を廃止している。
- [ ] `REPORT.md`はmeaningful checkpoint単位で、Summary / Changes / Decisions / Validation / Remaining / Progressを残す契約になっている。
- [ ] Hookで取得可能な機械的EvidenceはGit管理外のJSONLへ自動記録される。
- [ ] Hook logging用実装は原則1系統に統一され、`observe.ps1|sh`と新loggerが重複して残らない。
- [ ] `codex-task` JSONLはwrapper lifecycle / preflight / scope / validation / verify等に責務を限定し、Tool単位Hook logと重複させない。
- [ ] `run.json`はCodexが手編集せず、`new-run`とcollector / wrapperにより機械生成・更新される。
- [ ] `run.json`へ、Git状態、changed files、validation、Hook summary、wrapper report等の機械取得可能な事実を集約できる。
- [ ] 同じ事実を`run.json`と`evaluation.json`へ重複保持しない。
- [ ] `evaluation.json`は通常のlightweight / standard Runでは原則生成しない。
- [ ] strict workflow、benchmark、harness improvement、明示的な評価依頼など必要時のみ`evaluation.json`を生成・要求する。
- [ ] `evaluation.json`に機械的事実を手書きせず、評価・解釈とEvidence参照だけを持たせる。
- [ ] Run IDを安全に取得できる場合だけRun-local logへ関連付ける。「最新Run」等のheuristicで誤紐付けしない。
- [ ] Hook logging失敗はCodex本作業を原則blockしない。ただし既存`PreToolUse` safety Hookのblocking behaviorは変更しない。
- [ ] Hook logへcredential / token / authorization header / transcript全文 / 巨大response全文を保存しない。
- [ ] Raw JSONLはGit管理対象外のままである。
- [ ] Windows / macOS・Linuxで同じloggingロジックを利用できる構成を優先する。
- [ ] 既存Bash safety policy、sandbox、approval、scope check、artifact sanitizationを弱めていない。
- [ ] Product code、ECサイト仕様、カリキュラム本体を変更していない。

## 2. 現状理解と前提

### Current understanding

- `.codex/config.toml`では`[features] hooks = true`になっている。
- 現在project configに登録されているHookは、Bash向け`PreToolUse` safety policyである。
- `.codex/hooks/observe.ps1` / `observe.sh`はHook観測eventをJSONLへ出す実装を持つが、現在の`.codex/config.toml`から直接呼ばれていない。
- `observe.ps1|sh`の既定出力先は`.codex/observations/hooks.jsonl`である。
- `.codex/logs/.gitignore`は`*.jsonl`をGit対象外にしている。
- `scripts/codex-task.ps1|sh`はwrapper start、preflight、scope、schema validation、verify、evaluation validation等のmachine-readable eventを独自JSONLへ記録する。
- `scripts/collect-run-artifacts.py`はHook event schemaを認識し、Run-local logs等から`run.json`へsummaryを集約する。
- `.codex/templates/RUN_MANIFEST.json`には`changed_files`、`validation`、`safety`、`artifact_summary`、`hook_observations`、`subagents`等のmachine-readable summaryが既に定義されている。
- `scripts/new-run.*`は`run.json`の初期skeletonを生成できる。
- `.codex/templates/EVALUATION.md`では、`evaluation.json`はagent / reviewerが作成し、runnerは評価結果を自動判断しないと定義されている。
- 現行workflow levelではlightweightはevaluation不要、standardは任意、strictは必須としている。
- 現在の`.codex/templates/REPORT.md`は「行動のたびに追記」「コマンドや確認結果を必ず記録」と定義している。

### Assumptions

- リポジトリ外の個人スクリプトやローカル設定から`observe.ps1|sh`が呼ばれていないとは仮定しない。確認可能な範囲を実装前に調査する。
- Codex Hook仕様はバージョン依存とし、既存`observe.*`の入力契約をそのまま正としない。
- Node.jsは既存実行基盤なので、cross-platform Hook loggerを1つ置く場合の第一候補とする。
- `run.json`へ書ける機械的事実を増やすためだけにdaemon、DB、外部serviceは追加しない。
- `evaluation.json`を廃止するのではなく、通常Runの必須artifactから外す。

### Non-goals

- `.codex/runs/`自体を廃止しない。
- `PLAN.md` / `TASKS.md`を機械生成へ置き換えない。
- `REPORT.md`からDecision / Rationale / Remainingまで削らない。
- 既存`PreToolUse` safety policyを再設計しない。
- Hookを完全な監査証跡・セキュリティ境界として扱わない。
- transcript全文を保存しない。
- Tool input / response全文を無条件保存しない。
- 外部ログサービス、クラウドDB、Slack等へログ送信しない。
- `evaluation.json`の評価内容を単純なscriptで擬似的に自動評価しない。
- Product code、アプリ機能、カリキュラム機能を変更しない。
- このプランでは実装・PR作成・既存ファイル削除を行わない。

## 3. 質問 / 曖昧性

- 必ず質問する不透明点:
  - 現時点ではなし。
- 仮定してよい細部:
  - canonical Hook loggerのファイル名。
  - JSONL内の非本質的metadata key名。
  - targeted test fixtureの配置場所。
- 未回答の重要質問:
  - なし。

### 実装中に停止して判断を取り直す条件

- 現行Codex CLIで必要な`PostToolUse` / `Stop`相当Hookをproject-scoped configから利用できない場合、wrapperを過剰拡張して疑似Hookを実装しない。
- `observe.ps1|sh`に現在も有効なcallerが存在する場合、そのcallerを移行せずに削除しない。
- Hook eventからRun IDを信頼できる形で取得できない場合、「最新Run」「最新timestamp」等で推測しない。
- Hook payloadから機密情報を安全に除外できない場合、保存fieldをさらに縮小する。
- logging Hookが既存safety Hookのmatcher / orderへ干渉する場合、safetyを優先してlogging scopeを縮小する。
- `run.json`のあるfieldが機械的に確定できずAI判断を必要とする場合、そのfieldをmanifestへ追加せず、必要なら`REPORT.md`または`evaluation.json`へ置く。

## 4. 影響範囲

### Impacted areas

- Codex project config
- Hook logger
- Run manifest生成・集約
- Run Report運用
- evaluation artifact運用
- Codex harness documentation
- Hook / collector / workflow-levelのtargeted test

### Files to inspect

実装開始時に最低限以下を再確認する。

- `AGENTS.md`
- `.codex/config.toml`
- `.codex/requirements.toml`
- `.codex/hooks/observe.ps1`
- `.codex/hooks/observe.sh`
- `.codex/hooks/pre_tool_use_policy.mjs`
- `.codex/hooks/pre_tool_use_policy_windows.ps1`
- `.codex/templates/REPORT.md`
- `.codex/templates/RUN_MANIFEST.json`
- `.codex/templates/EVALUATION.md`
- `.codex/templates/evaluation.schema.json`
- `.codex/logs/.gitignore`
- `scripts/new-run.ps1`
- `scripts/new-run.sh`
- `scripts/codex-safe.ps1`
- `scripts/codex-safe.sh`
- `scripts/codex-task.ps1`
- `scripts/codex-task.sh`
- `scripts/collect-run-artifacts.py`
- `scripts/collect-run-artifacts.ps1`
- `scripts/collect-run-artifacts.sh`
- `docs/reference/codex-implementation-harness.md`
- `docs/reference/codex-safety-harness.md`
- `scripts/tests/**`

### 実装前repo-wide参照確認

以下をliteral searchし、producer / consumer / documentationに分類する。

- `observe.ps1`
- `observe.sh`
- `CODEX_OBSERVATION_LOG`
- `CODEX_HOOK_EVENT`
- `CODEX_HOOK_SOURCE`
- `.codex/observations`
- `hooks.jsonl`
- `hook_observations`
- `hook_event_count`
- `Write-TaskLog`
- `run.json`
- `RecordRunManifest`
- `record-run-manifest`
- `evaluation.json`
- `EvaluationTemplate`
- `RequireEvaluation`
- `require-evaluation`

## 5. 変更方針

### Phase 1: Artifact責務を固定する

最終的な責務を以下に固定する。

#### `PLAN.md`

- 実装方針
- 判断基準
- scope
- validation plan

#### `TASKS.md`

- 実行タスク
- discovered tasks
- progress
- blocked items

#### `REPORT.md`

- 重要な変更
- Decision / Rationale
- 検証結果の要約
- blocker / 発見課題
- Remaining
- Progress

Tool実行の逐次記録や全commandの転記は行わない。

#### Hook JSONL

- Hookで取得可能なTool / Turn単位の機械的Evidence
- Git管理外

#### `codex-task` JSONL / report JSON

- wrapper lifecycle
- preflight
- scope validation
- output/schema validation
- verify
- harnessの実行成否

#### `run.json`

- machine-generated Run manifest
- Git / wrapper / Hook / collectorから取得できる事実だけを保持
- Codexによる手編集は禁止
- Raw log全文を複製せず、path / count / status / changed files等のsummaryを保持

#### `evaluation.json`

- 通常Runでは作らない
- strict / benchmark / harness evaluation / failure analysis / 明示的評価時だけ作る
- 実行事実を再記録せず、result、failure interpretation、ratings、findings、improvement candidates、Evidence参照等の「評価」だけを保持

### Phase 2: `run.json`を完全機械生成へ寄せる

- `new-run`は初期manifestを生成する。
- `codex-task` / collectorがRun終了時または必要なcheckpointでmanifestを更新する。
- 次の情報は可能な限り自動取得する。
  - run_id
  - task_type / workflow_level / preset / runtime
  - repo / branch / base branch
  - changed files
  - validation status / commands / warnings
  - safety summary
  - Hook log path / event count
  - codex-task report path / count
  - subagent summary
  - evaluationの有無とpath
  - run status
- `REPORT.md`やAI回答をparseしてmanifestを埋めない。
- AIによる主観判断を`run.json`へ入れない。
- `collect-run-artifacts.*`をcanonicalな再集約経路として維持し、同じfieldを複数scriptが競合更新しないよう責務を確認する。

### Phase 3: evaluation運用を必要時限定へ変更する

workflow policyを以下へ整理する。

| workflow level / purpose | evaluation.json |
| --- | --- |
| lightweight | 作成しない |
| standard | 原則作成しない |
| strict | 必須 |
| benchmark / harness improvement | 必須または明示要求 |
| failure analysis | 必要な場合のみ |
| ユーザー明示評価依頼 | 作成可能 |

- `standard`で現在template生成やrequireを暗黙要求している経路があれば外す。
- `--evaluation-template` / `--require-evaluation`は評価が必要なworkflowだけで使用する。
- `scope_control`、`safety_compliance`等の機械判定可能な事実をevaluationへ複製しない。評価時は`run.json`やlogsをEvidence参照する。
- `evaluation.json`のschema / docsは、評価専用artifactであることが分かるよう整合させる。
- evaluationを外した通常Runでも`run.json.status` / validation / safety summaryだけで実行状態を確認できるようにする。

### Phase 4: `observe.ps1|sh`の利用実態を判定する

- repo内callerを完全に確認する。
- config、wrapper、scripts、docs、collectorの参照を区別する。
- `collect-run-artifacts.py`が旧schemaを読めることは、`observe.*`が実際に呼ばれている証拠とはみなさない。

判定ルール:

- callerなし、native Hookにも未接続:
  - `observe.ps1` / `observe.sh`をdead producerとして整理対象にする。
  - `.codex/observations/hooks.jsonl`専用fallback、不要な`CODEX_HOOK_*`契約も整理する。
- callerあり:
  - canonical loggerへ移行する。
  - caller移行後に旧scriptを削除する。
  - 安全に移行できなければ残し、残す理由をdocumentする。

旧scriptだけ削除してcollector / docsへdead pathを残すことは禁止する。

### Phase 5: canonical Hook loggerを1実装へ統一する

- Windows / macOS・Linuxで同等ロジックを別実装しない。
- 原則1つのNode `.mjs` loggerを第一候補とする。
- native Hook payloadをstdinから受け取り、必要fieldだけwhitelistで保存する。
- logging目的の最小eventは実機確認後の`PostToolUse`と`Stop`相当を優先する。
- logging用`PreToolUse`を不要に増やさず、既存Bash safety `PreToolUse`を維持する。
- Hook logger failureは原則exit successとして本作業を止めない。

### Phase 6: Hook log schemaと保存先を最小化する

最低限の候補field:

- schema version
- timestamp
- event
- run_id（安全に取得できる場合）
- session / turn ID（payloadに存在する場合）
- tool name
- bounded operation / target summary
- success / failure相当状態
- logger metadata

保存しないもの:

- transcript全文
- tool response全文
- 巨大patch全文
- credential / token / authorization header
- 不要な環境変数dump
- 再生成可能な大容量出力

保存先:

- 信頼できるRun IDあり: `.codex/runs/<run_id>/logs/`
- Run IDなし: `.codex/logs/`
- raw JSONLはGit管理外
- `.codex/observations/`を継続する必然性がなくなれば廃止する

### Phase 7: Collectorをcanonical log / manifestへ合わせる

- 新Hook logger schemaを認識する。
- 対象Run IDのeventだけを集約する。
- `artifact_summary.hook_event_count`、`hook_observations`等を更新する。
- wrapper JSONLをHook eventと誤認しない。
- 旧`.codex/observations/hooks.jsonl`廃止時はfallbackも削除する。
- evaluationなしの通常Runを正常状態として扱う。
- strictでevaluation必須の場合のみ、missing / invalidをfailureとして扱う。

### Phase 8: REPORT契約とドキュメントを整理する

`AGENTS.md`と`.codex/templates/REPORT.md`から以下を外す。

- 行動のたびにREPORTへ追記する要求
- 全commandを逐一転記する要求

代わりに以下を定義する。

- meaningful checkpointごとに追記する。
- Summary / Changes / Decisions / Validation / Remaining / Progressを残す。
- command / Tool単位EvidenceはHook / harness logを正本にする。
- 重要な失敗、blocker、仕様判断はREPORTへ残す。
- lightweightは最終1blockでもよい。

以下のdocsも実装と一致させる。

- `docs/reference/codex-implementation-harness.md`
- 必要に応じて`docs/reference/codex-safety-harness.md`
- `.codex/requirements.toml`
- evaluation関連template / docs

### 実行タスク

- [ ] 1. 現行Codex CLIのHook supportを実機確認する。
- [ ] 2. Hook / wrapper / run manifest / evaluation関連のrepo-wide参照を棚卸しする。
- [ ] 3. `PLAN` / `TASKS` / `REPORT` / Hook JSONL / wrapper JSONL / `run.json` / `evaluation.json`の責務境界を確定する。
- [ ] 4. `run.json`をCodex手編集対象から外し、`new-run` + collector / wrapperによる機械生成・更新へ統一する。
- [ ] 5. standard workflowの`evaluation.json`を原則不要にし、strict / 評価目的workflowだけで生成・requireするよう契約を整理する。
- [ ] 6. `observe.ps1|sh`と旧`CODEX_HOOK_*`契約の実利用を確認する。
- [ ] 7. canonical cross-platform Hook loggerを1つ実装する。
- [ ] 8. `.codex/config.toml`へ必要最小限のlogging Hookを追加し、既存safety Hookを変更しない。
- [ ] 9. Hook payload保存fieldをwhitelistし、secret / huge responseを保存しない。
- [ ] 10. Run IDあり / なしのlog pathを実装し、heuristicなRun紐付けを禁止する。
- [ ] 11. `collect-run-artifacts.py`をcanonical Hook logとevaluation optional policyへ合わせる。
- [ ] 12. 移行完了後、不要な`observe.ps1|sh`、`.codex/observations` fallback、旧環境変数契約を整理する。
- [ ] 13. `AGENTS.md` / `.codex/templates/REPORT.md`をcheckpoint型へ変更する。
- [ ] 14. implementation harness / evaluation関連docsを新責務へ合わせる。
- [ ] 15. Hook logger / collector / run manifest / evaluation optional behaviorのtargeted testを追加または既存testへ統合する。
- [ ] 16. manual interactive / standard `codex-task` / strict evaluation-requiredの3経路でsmoke validationする。
- [ ] 17. raw JSONLがGit tracking対象外で、変更scopeが本計画内だけであることを確認する。

## 6. 検証方法

### A. `run.json`機械生成確認

- `new-run`だけでvalidな初期`run.json`が作成される。
- Codex自身が`run.json`を編集しなくても、collector / wrapper後に次が反映される。
  - branch
  - changed files
  - validation
  - safety summary
  - Hook event count / paths
  - wrapper report paths
  - status
- 同じ入力artifactから再集約したとき、意味のない差分が発生しない。
- `REPORT.md`本文の自然言語をparseしなくてもmanifestを完成できる。

### B. evaluation optional確認

- lightweight: evaluationなしで成功できる。
- standard: evaluationなしで成功できる。
- strict: evaluation missingを正しくfailureとして扱う。
- evaluationありの場合、schema validationと`run.json.evaluation_path`の連携が動く。
- evaluationなしの場合、`evaluation_path = null`等の正常なsummaryとして扱える。
- machine factをevaluationへ重複コピーすることを必須にしない。

### C. dead code / reference確認

- `observe.ps1|sh`削除前にcallerを確認する。
- 削除後、旧path / 旧環境変数 / `.codex/observations`参照が不要なら0件にする。
- collector / docs / configへdead referenceを残さない。

### D. Hook logger targeted test

fixture入力で最低限確認する。

- supported Tool eventを1行JSONLへ記録できる。
- Stop eventを記録できる。
- Run IDありならRun-local pathを選ぶ。
- Run IDなしならglobal `.codex/logs/`を選ぶ。
- malformed / unknown payloadでCodex本作業をblockしない。
- huge response全文を保存しない。
- secret相当fieldをそのまま保存しない。
- Windows / POSIX pathで壊れない。

追加依存を増やさず、Node loggerなら`node:test`等の標準機能を優先する。

### E. Collector test

fixture Hook JSONLを使い以下を確認する。

- `hook_event_count`が期待件数になる。
- event別countが正しい。
- 別Run IDを集約しない。
- wrapper JSONLをHook eventと誤認しない。
- malformed JSONLで集約全体を不必要に壊さない。
- evaluationなしのstandard Runをwarning / failureにしない。
- strictでevaluation必須の場合だけmissingをfailureにする。

### F. Safety regression

- 既存Bash `PreToolUse` safety policyが引き続き動く。
- logging Hook failureがsafety判定を上書きしない。
- forbidden commandへの既存blocking behaviorを維持する。
- sandbox / approval / network policyを変更していない。

### G. REPORT運用smoke

1. Runを初期化する。
2. harmlessな作業を実施する。
3. Tool eventが自動JSONLへ残る。
4. 各Tool executionごとに`REPORT.md`を編集しなくてもEvidenceが残る。
5. meaningful checkpointでのみ`REPORT.md`へSummary / Decisions / Validation / Remainingを残す。
6. collector後の`run.json`からRunのmachine summaryを確認できる。

### H. Git tracking / repository validation

- `.codex/logs/*.jsonl`とRun-local raw logsが`git status`へ出ない。
- durable artifactとraw logを混同してcommitしない。
- Markdown lint
- Hook logger test
- collector / run manifest test
- evaluation optional / strict required test
- safety harness targeted test
- config loading / Hook smoke

Product codeへ変更がないため、本変更と無関係なE2Eを追加要件にはしない。既存`verify`が標準ゲートとして実行する項目はその契約に従う。

### 成功判定

- Codexが細かな記帳をしなくても必要なmachine Evidenceが残る。
- `REPORT.md`はsemantic checkpointに限定される。
- `run.json`はCodexの手編集なしで生成・更新できる。
- standard Runで不要な`evaluation.json`を作成しない。
- strict / 評価目的Runでは必要なevaluationを維持できる。
- Hook / wrapper / REPORT / manifest間に同じ情報の三重記録がない。
- 未使用`observe.*`を整理する場合にdead referenceが残らない。
- logging追加で既存safety behaviorが弱くならない。

## 7. リスクと未解決論点

### Risks

- Codex CLI Hook仕様が旧`observe.*`想定と異なり、単純な配線では動かない可能性がある。
- `observe.ps1|sh`がproject config外から利用されている可能性がある。
- Hook payloadを広く保存するとsecret / 大容量データを残す危険がある。
- Run IDなしsessionを無理にRunへ紐づけると誤ったmanifestになる。
- `run.json`の責務を広げすぎると、再びAI評価とmachine factが混ざる。
- evaluationを通常Runから外す際、既存strict / harness evaluation経路まで誤って弱める可能性がある。
- `collect-run-artifacts.py`が複数種JSONLを走査するため、event判別が曖昧だとwrapper logを誤集約する可能性がある。
- REPORTを軽量化しすぎてDecision / Rationaleまで失わないようにする必要がある。

### Open questions

- なし。CLI実機確認で技術的細部が異なる場合だけ局所調整する。

## 8. 成果物

### 変更ファイル（想定）

確定変更候補:

- `.codex/config.toml`
- `AGENTS.md`
- `.codex/templates/REPORT.md`
- `scripts/collect-run-artifacts.py`
- `docs/reference/codex-implementation-harness.md`

run manifest / evaluation整理で変更候補:

- `.codex/templates/RUN_MANIFEST.json`
- `.codex/templates/EVALUATION.md`
- `.codex/templates/evaluation.schema.json`
- `scripts/new-run.ps1`
- `scripts/new-run.sh`
- `scripts/codex-task.ps1`
- `scripts/codex-task.sh`

整理・置換候補:

- `.codex/hooks/observe.ps1`
- `.codex/hooks/observe.sh`
- canonical Hook logger 1ファイル

実装結果により変更する可能性があるもの:

- `.codex/requirements.toml`
- `.codex/logs/.gitignore`
- `scripts/collect-run-artifacts.ps1`
- `scripts/collect-run-artifacts.sh`
- `docs/reference/codex-safety-harness.md`
- `scripts/tests/**`

### 付随ドキュメント

- 本プラン以外に新しい`docs/reports/`は作成しない。
- 実装時の通常進捗はRun-local `REPORT.md`へcheckpoint単位で残す。

## 9. 備考

- 主眼は「ログを増やすこと」ではなく「記録責務を減らして整理すること」である。
- `run.json`はdurableなmachine-readable manifestとして残すが、人間やCodexが直接メンテナンスする文書として扱わない。
- `evaluation.json`は通常Runの標準成果物ではなく、評価workflow専用artifactとして扱う。
- `observe.ps1|sh`はconfigから未参照という理由だけで即削除せず、producer / caller / consumerを確認してから整理する。
- Hook追加後に`codex-task log + Hook log + REPORT + run.json`へ同じcommand/resultが複製される設計は完了条件未達とする。
- Raw logは長期保存する正式成果物ではなく、Run Artifactを裏付けるmachine-readable Evidenceとして扱う。
