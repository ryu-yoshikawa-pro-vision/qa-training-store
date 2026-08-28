# Codex HookによるRunログ自動化・既存観測機能整理プラン

## 0. 依頼概要

- 依頼内容:
  - Codex自身に`.codex/runs/<run_id>/REPORT.md`へ行動のたびに手動追記させている現行運用を見直し、機械的な行動記録をCodex Hooksへ移す。
  - `.codex/runs/`のRun Artifactは維持し、判断・結果・残課題など後から読む価値のある情報に責務を絞る。
  - 既存の`.codex/hooks/observe.ps1` / `observe.sh`が実際に使用されていない場合は、そのまま温存せず整理する。
- 背景:
  - 現在の`AGENTS.md`と`.codex/templates/REPORT.md`では、調査・編集・判断・コマンド実行を含む行動のたびにCodex自身が`REPORT.md`へ追記する契約になっている。
  - 一方で、`scripts/codex-task.ps1|sh`には既にwrapper lifecycle / validation用JSONLログがあり、`.codex/hooks/observe.ps1|sh`にはHook観測イベントを書き出す仕組みも存在する。
  - `scripts/collect-run-artifacts.py`はHookイベントを集約して`run.json.hook_observations`へ反映できるため、既存基盤を整理すれば手動ログの負担を減らせる。
- 期待成果:
  - 機械的な実行Evidenceと、人間・AIが後から読むRun Reportの責務が分離される。
  - Hook、wrapper log、`REPORT.md`の三重記録を避ける。
  - 未使用コード・未使用パス・未使用環境変数を残さない。

## 1. ゴール / 完了条件

- ゴール:
  - Codexの機械的な行動記録を自動化し、`REPORT.md`を「重要な判断・変更・検証結果・残課題」のcheckpoint記録へ縮小する。
  - Hookログ、`codex-task`ログ、Run Artifactの役割を明文化し、同じ情報を複数箇所へ重複記録しない構成にする。

- 完了条件（DoD）:
  - [ ] 現行のログ生成元・利用先をrepo-wideで棚卸しし、`observe.ps1|sh`、`codex-task.*`、`collect-run-artifacts.*`、`run.json`、`REPORT.md`の責務が明文化されている。
  - [ ] 対象Codex CLIで実際に利用可能なHook event、payload、project-scoped configの書式を実機確認してから実装している。
  - [ ] Codexが通常作業の各行動ごとに`REPORT.md`へ手動追記する契約を廃止している。
  - [ ] `REPORT.md`はcheckpoint単位で、Summary / Changes / Decisions / Validation / Remaining / Progressを残す契約になっている。
  - [ ] Hookで取得可能な機械的Evidenceは、Git管理外のJSONLへ自動記録される。
  - [ ] Hookログの正本が1系統に定まり、`observe.ps1|sh`と新しいHook loggerが並存しない。
  - [ ] `scripts/codex-task.ps1|sh`のJSONLはwrapper lifecycle / validation専用のままとし、Tool単位Hookログと責務を重複させない。
  - [ ] `collect-run-artifacts.py`が新しいHookログを正しく集約し、`run.json.artifact_summary.hook_event_count`と`hook_observations`を更新できる。
  - [ ] Run IDを持つ実行ではRun-local logへ紐づけられる。Run IDを安全に解決できない場合に「最新Runへ推測で紐づける」実装をしていない。
  - [ ] Hook loggingの失敗はCodex本作業を原則blockしない。ただし既存の`PreToolUse`安全性Hookのblocking挙動は変更しない。
  - [ ] Hookログへcredential / token / authorization header等を意図せず永続化しない。巨大なtool response全文を保存しない。
  - [ ] JSONLログはGit管理対象外のままである。
  - [ ] Windows / macOS・Linux相当の両経路で、同じHook logger実装を利用できる構成を優先する。
  - [ ] 既存のBash safety policy、sandbox、approval、scope check、evaluation、artifact sanitizationを壊していない。
  - [ ] Product code、ECサイト仕様、カリキュラム本体には変更を入れていない。

## 2. 現状理解と前提

### Current understanding

- `.codex/config.toml`では`[features] hooks = true`になっている。
- 現在project configに登録されているHookは、Bash向け`PreToolUse` safety policyであり、`.codex/hooks/pre_tool_use_policy.mjs`またはWindows launcherを実行している。
- `.codex/hooks/observe.ps1`と`.codex/hooks/observe.sh`は存在し、`PreToolUse` / `PostToolUse` / `SubagentStart` / `SubagentStop` / `Stop`等のイベントを共通schemaのJSONLへ出す実装を持つ。
- `observe.ps1|sh`は、`CODEX_HOOK_EVENT`、`CODEX_RUN_ID`等の環境変数を前提としており、現在の`.codex/config.toml`から直接呼ばれていない。
- `observe.ps1|sh`の既定出力先は`.codex/observations/hooks.jsonl`である。
- `.codex/logs/.gitignore`は`*.jsonl`をGit対象外にしている。
- `scripts/codex-task.ps1|sh`には独自の`Write-TaskLog`相当があり、wrapper start、preflight、scope、evaluation、verify等のmachine-readable eventを記録する。
- `scripts/collect-run-artifacts.py`はHook event schemaを認識し、`.codex/observations/hooks.jsonl`とRun-local `logs/*.jsonl`を走査して`run.json`へ集約する。
- `.codex/templates/RUN_MANIFEST.json`には既に`artifact_summary.hook_event_count`と`hook_observations`が定義されている。
- `docs/reference/codex-implementation-harness.md`では、`codex-task`のJSONLをwrapper lifecycle / verify等の記録として定義している。
- 現在の`.codex/templates/REPORT.md`は「行動のたびに追記する」「コマンドや確認結果は必ず記録する」と定義している。

### Assumptions

- リポジトリ外の個人スクリプトやローカル設定から`observe.ps1|sh`が直接呼ばれていないことを前提にしない。実装前にrepo内参照と、確認可能なruntime設定を調査する。
- Codex Hooksのpayloadやevent対応状況はバージョン依存とみなし、既存コードの想定だけで実装しない。
- Node.jsはこのリポジトリの既存実行基盤であり、単一のcross-platform Hook loggerを置く場合の第一候補とする。
- Hookで取れないイベントを補うためだけに、独自daemon、DB、外部サービス、常駐プロセスは追加しない。

### Non-goals

- `.codex/runs/`自体を廃止しない。
- `PLAN.md` / `TASKS.md` / `REPORT.md` / `run.json` / `evaluation.json`のRun Artifact運用全体を作り直さない。
- 既存の`PreToolUse` safety policyを再設計しない。
- Hookを完全な監査証跡・セキュリティ境界として扱わない。
- Codex transcript全文を保存しない。
- Tool input / tool response全文を無条件で保存しない。
- 外部ログサービス、クラウドDB、Slack等へログ送信しない。
- Product code、アプリ機能、テスト自動化カリキュラムの機能変更を行わない。
- このプラン作成時点では実装、PR作成、既存ファイル削除を行わない。

## 3. 質問 / 曖昧性

- 必ず質問する不透明点:
  - 現時点ではなし。既存repo conventionと安全側defaultで実装方針を決められる。
- 仮定してよい細部:
  - Hook loggerのファイル名。
  - JSONL内の非本質的なmetadata key名。
  - テストfixtureの配置場所。
- 未回答の重要質問:
  - なし。

### 実装中に停止して判断を取り直す条件

- 現行Codex CLIで必要な`PostToolUse` / `Stop`相当Hookがproject-scoped configから利用できない場合、wrapperを過剰拡張して疑似Hookを作らない。現行の手動REPORT運用を維持し、blockerを報告して停止する。
- `observe.ps1|sh`に現在も有効なcallerが存在した場合、そのcallerを移行せずに削除しない。
- Hook eventからRun IDを信頼できる形で解決できない場合、「直近作成Run」「最新timestamp」等のheuristicでRunへ紐づけない。
- Hook payloadを保存するとcredential等の秘匿値を安全に除外できない場合、保存フィールドを削減し、full payload保存を採用しない。
- 既存`PreToolUse` safety policyと新しいlogging Hookのmatcher/orderが干渉する場合、安全制御を優先し、logging側を縮小する。

## 4. 影響範囲

### Impacted areas

- Codex project config
- Codex Hook logger
- Run Artifact aggregation
- Run Report運用ルール
- Codex実装ハーネスのドキュメント
- Hook logger / collectorのtargeted test

### Files to inspect

実装開始時に最低限、以下を再確認する。

- `AGENTS.md`
- `.codex/config.toml`
- `.codex/requirements.toml`
- `.codex/hooks/observe.ps1`
- `.codex/hooks/observe.sh`
- `.codex/hooks/pre_tool_use_policy.mjs`
- `.codex/hooks/pre_tool_use_policy_windows.ps1`
- `.codex/templates/REPORT.md`
- `.codex/templates/RUN_MANIFEST.json`
- `.codex/logs/.gitignore`
- `scripts/codex-safe.ps1`
- `scripts/codex-safe.sh`
- `scripts/codex-task.ps1`
- `scripts/codex-task.sh`
- `scripts/collect-run-artifacts.py`
- `scripts/collect-run-artifacts.ps1`
- `scripts/collect-run-artifacts.sh`
- `docs/reference/codex-implementation-harness.md`
- `docs/reference/codex-safety-harness.md`
- `scripts/tests/`配下の既存harness test

### 実装前repo-wide参照確認

以下をliteral searchし、producer / consumer / documentationの3分類にする。

- `observe.ps1`
- `observe.sh`
- `CODEX_OBSERVATION_LOG`
- `CODEX_HOOK_EVENT`
- `CODEX_HOOK_SOURCE`
- `CODEX_HOOK_TOOL_NAME`
- `.codex/observations`
- `hooks.jsonl`
- `hook_observations`
- `hook_event_count`
- `Write-TaskLog`

## 5. 変更方針

### Change strategy

#### Phase 1: ログ責務を先に固定する

実装前に以下を正本として明文化する。

1. `codex-task` JSONL
   - wrapper lifecycle
   - preflight
   - scope validation
   - schema validation
   - verify
   - evaluation / run harnessの成否
2. Codex Hook JSONL
   - Codexが実際に実行した、Hookで取得可能なTool / Turn単位の機械的Evidence
3. `REPORT.md`
   - 重要な変更
   - 設計・仕様判断
   - 検証結果の要約
   - 発見課題
   - 残タスク
   - Progress
4. `run.json`
   - 上記成果物の索引・件数・status summary

同じcommandや結果をHookログと`REPORT.md`へ機械的に二重転記しない。

#### Phase 2: `observe.ps1|sh`の利用実態を判定する

- repo内callerを完全に確認する。
- `.codex/config.toml`以外のwrapper / scripts / docsからの参照も確認する。
- `collect-run-artifacts.py`はconsumerであり、`observe.ps1|sh`のproducer利用を証明するものではない点を区別する。

判定ルール:

- callerなし、native Hookにも未接続:
  - `observe.ps1` / `observe.sh`はdead producerとして削除対象とする。
  - `.codex/observations/hooks.jsonl`専用fallbackや、不要になった環境変数契約も同時に整理する。
- callerあり:
  - callerを新しいcanonical loggerへ移行できるか確認する。
  - 移行完了後に旧scriptを削除する。
  - callerを安全に移行できない場合は旧scriptを残し、その理由をdocumentする。

旧scriptだけ削除し、`collect-run-artifacts.py`等へdead pathを残す状態は禁止する。

#### Phase 3: canonical Hook loggerを1実装へ統一する

- Windows / macOS・Linuxで別々の同等ロジックを持たない。
- 原則として1つのNode `.mjs` loggerを第一候補とする。
- native Codex Hook payloadをstdinから直接受け取る。既存`observe.ps1|sh`のような多数の`CODEX_HOOK_*`環境変数shimを新規標準にしない。
- project configから同じloggerを呼び出せる構成にする。
- 最小eventとして、実機確認した`PostToolUse`と`Stop`相当を優先する。
- logging目的だけで`PreToolUse`を二重登録しない。既存Bash safety policyの責務を維持する。
- native Hookのevent名・payloadが実機で異なる場合は実機仕様に合わせ、現行`HOOK_EVENTS`定義を盲目的に踏襲しない。

#### Phase 4: ログschemaと保存先を最小化する

Hook JSONLは後続集約に必要な最小情報だけを持つ。

最低候補:

- schema version
- timestamp
- event
- run_id（利用可能な場合）
- session / turn identifier（Hook payloadに存在する場合）
- tool name
- operation / target / bounded summary
- success / failure相当の状態
- logger metadata

保存しないもの:

- transcript全文
- tool response全文
- 巨大patch全文
- credential / token / authorization header
- 再生成可能な大容量出力

保存先:

- `CODEX_RUN_ID`等の信頼できるRun IDがある場合は`.codex/runs/<run_id>/logs/`配下を優先する。
- Run IDがないinteractive sessionは`.codex/logs/`配下へ保存する。
- `.codex/logs/*.jsonl`とRun-local raw logsはGitへcommitしない。
- `.codex/observations/`を継続する必然性がなくなれば廃止し、log rootを増やさない。

#### Phase 5: `collect-run-artifacts.py`をcanonical logへ合わせる

- 新loggerのevent schemaを認識する。
- Run-local `logs/*.jsonl`から対象Run IDのeventだけを集約する。
- `artifact_summary.hook_event_count`を正しく更新する。
- `hook_observations.log_paths` / `event_counts` / error count等を維持する。
- 旧`.codex/observations/hooks.jsonl`を廃止する場合、そのfallbackも削除する。
- `codex-task` JSONLが同じdirectoryにあってもHook eventと誤認しないことを確認する。

#### Phase 6: `REPORT.md`契約をcheckpoint型へ変更する

`AGENTS.md`と`.codex/templates/REPORT.md`から以下を外す。

- 行動のたびにREPORTへ追記する要求
- 全commandをREPORTへ逐一転記する要求

代わりに以下を定義する。

- meaningful checkpointごとに追記する。
- `REPORT.md`には最低限、Summary / Changes / Decisions / Validation / Remaining / Progressを残す。
- command/tool単位の機械的EvidenceはHook / harness logを正本とし、必要な結果だけREPORTへ要約する。
- 重要な失敗、blocker、仕様判断はREPORTへ残す。
- lightweight workflowでは既存ガイド通り最終1ブロックでもよい。
- Hookが利用できない実行経路では、必要なEvidenceが消えないよう既存harness reportを利用する。

#### Phase 7: ドキュメント整合性を更新する

最低限以下を更新する。

- `AGENTS.md`
- `.codex/templates/REPORT.md`
- `docs/reference/codex-implementation-harness.md`

必要に応じて:

- `.codex/requirements.toml`
- `docs/reference/codex-safety-harness.md`
- repository layout資料

説明内容は以下を一致させる。

- Raw Hook logはGit管理外
- `codex-task` logとの役割差
- REPORTはsemantic checkpoint
- run.jsonはaggregate summary
- Hook failureは原則non-blocking
- safety Hookは別責務でblocking可能

### 実行タスク

- [ ] 1. 現行Codex CLI versionとproject Hook supportを確認し、利用可能event / input schema / timeout / exit code semanticsを確定する。
- [ ] 2. `observe.ps1|sh`、`CODEX_HOOK_*`、`.codex/observations`、Hook schemaのrepo-wide参照を棚卸しする。
- [ ] 3. `codex-task` JSONL、Hook JSONL、`REPORT.md`、`run.json`の責務境界をコードとdocsへ反映できる形で確定する。
- [ ] 4. canonical cross-platform Hook loggerを1つ実装する。既存scriptを再利用するより単一Node実装が単純ならそちらへ統一する。
- [ ] 5. `.codex/config.toml`へ必要最小限のlogging Hookを追加し、既存Bash safety `PreToolUse`を変更しない。
- [ ] 6. Run IDあり / なしのlog pathを実装し、推測ベースのRun紐付けを禁止する。
- [ ] 7. event payloadの保存フィールドをwhitelist方式で制限し、機密情報・巨大responseを保存しない。
- [ ] 8. `collect-run-artifacts.py`をcanonical Hook logへ合わせる。
- [ ] 9. `observe.ps1|sh`が不要になったことを再確認し、callerとcollectorの移行完了後に両方削除する。不要環境変数・`.codex/observations`参照も同時に削除する。
- [ ] 10. `AGENTS.md`と`.codex/templates/REPORT.md`をcheckpoint型の記録契約へ変更する。
- [ ] 11. `docs/reference/codex-implementation-harness.md`等の責務説明を実装と一致させる。
- [ ] 12. Hook logger / collectorのtargeted testを追加または既存testへ統合する。
- [ ] 13. manual interactiveと`codex-task`の両経路でsmoke validationを行う。
- [ ] 14. `git status`でraw JSONLがtracking対象になっていないこと、変更ファイルが本計画のscope内だけであることを確認する。

## 6. 検証方法

### Validation plan

#### A. 参照・dead code確認

- repo-wide literal searchで、削除予定の`observe.ps1|sh`を参照するcallerが0件であることを確認する。
- 削除後、`CODEX_OBSERVATION_LOG` / `CODEX_HOOK_EVENT`等の旧契約が不要なら参照0件にする。
- `.codex/observations/hooks.jsonl`を廃止する場合、collector/docs/configにpathが残っていないことを確認する。

#### B. Hook logger unit / fixture test

少なくとも以下をfixture入力で確認する。

- supported Tool eventを1行JSONLへ記録できる。
- Stop eventを記録できる。
- Run IDありならRun-local pathを選ぶ。
- Run IDなしならglobal `.codex/logs/`を選ぶ。
- malformed / unknown payloadでCodex本作業をblockしない。
- 巨大response全文を保存しない。
- secret相当fieldをそのまま保存しない。
- Windows path / POSIX pathで壊れない。

Node loggerを採用する場合、追加依存を増やさず`node:test`等の標準機能を優先する。

#### C. Collector test

fixture Hook JSONLをRun Directoryへ置き、`collect-run-artifacts.py`を実行して以下を確認する。

- `hook_event_count`が期待件数になる。
- `hook_observations.event_counts`がevent別に集約される。
- 別Run IDのeventを数えない。
- 同じdirectoryに`codex-task` JSONLがあってもHook eventとして誤集約しない。
- malformed JSONLは既存契約通りwarning / ignoreされ、集約全体を不必要に壊さない。

#### D. Safety regression

- 既存のBash `PreToolUse` safety policyが引き続き実行される。
- logging Hook失敗がsafety Hookの判定を上書きしない。
- forbidden commandに対する既存blocking behaviorを維持する。
- sandbox / approval / network policyを変更していない。

#### E. REPORT運用smoke

harmlessな作業で確認する。

1. Runを初期化する。
2. Codexにread-only確認または小さな検証を実行させる。
3. Tool eventが自動JSONLへ残る。
4. Codexが各Tool executionごとに`REPORT.md`を編集しなくてもEvidenceが残る。
5. 作業checkpointでのみ`REPORT.md`に意味のあるSummary / Validation / Remainingが記録される。
6. `collect-run-artifacts`実行後、`run.json`からHook logの存在と件数を確認できる。

#### F. Git tracking確認

- `.codex/logs/*.jsonl`が`git status`へ出ない。
- Run-local raw logsも長期保存対象の標準Run Artifactと混同してcommitされないことを確認する。必要ならignore ruleをRun-local pathにも明示する。
- `REPORT.md`等のdurable artifactだけが必要に応じてGit管理される。

#### G. Repository validation

変更内容に応じてtargeted validationを先に行う。

- Markdown lint
- Hook logger test
- collector test
- safety harnessの既存targeted test
- config loading / Codex Hook smoke

その後、リポジトリで定義されている通常のharness verificationを実行する。
Product codeへ変更がないため、Hook/doc変更と無関係なE2Eを追加要件として増やさない。ただし既存`verify`が標準ゲートとして実行する項目は、その契約に従う。

### 成功判定

- 手動REPORT更新回数を減らしても、機械的Evidenceとsemantic reportの両方が欠落しない。
- Hook / wrapper / REPORT間で同じ情報の三重記録が発生しない。
- `observe.ps1|sh`を削除する場合、dead referenceが残らない。
- HookログがRun Manifestへ正しく集約される。
- logging追加によって既存safety behaviorが弱くならない。
- 実装者がログを残すためだけに余計なCodex編集を行う必要がない。

## 7. リスクと未解決論点

### Risks

- Codex CLIのHook仕様が現在の`observe.ps1|sh`想定と異なり、単純な配線では動かない可能性がある。
- `observe.ps1|sh`はproject configから未使用でも、外部wrapperから利用されている可能性がある。
- Hook payloadをそのまま保存するとsecretや不要な大容量データを残す可能性がある。
- Run IDなしinteractive sessionを無理にRunへ紐づけると誤った監査記録になる。
- `collect-run-artifacts.py`はRun-local `logs/*.jsonl`を広く走査するため、event schemaを雑にするとwrapper logを誤分類する可能性がある。
- REPORTを軽量化しすぎると「なぜそうしたか」という意味情報が失われる。削るのは機械的Evidenceであり、Decision / Rationaleまで削らない。
- Windows / shell別にloggerを二重実装すると、現在の`observe.ps1|sh`と同じ保守重複を再発させる。

### Open questions

- なし。実装時のCLI実機確認結果によって計画の技術的細部だけを局所調整する。

## 8. 成果物

### 変更ファイル（想定）

確定変更候補:

- `.codex/config.toml`
- `AGENTS.md`
- `.codex/templates/REPORT.md`
- `scripts/collect-run-artifacts.py`
- `docs/reference/codex-implementation-harness.md`

整理・置換候補:

- `.codex/hooks/observe.ps1`
- `.codex/hooks/observe.sh`
- 新しいcanonical Hook logger 1ファイル（必要な場合）

実装結果により変更する可能性があるもの:

- `.codex/requirements.toml`
- `.codex/templates/RUN_MANIFEST.json`
- `.codex/logs/.gitignore`
- `scripts/collect-run-artifacts.ps1`
- `scripts/collect-run-artifacts.sh`
- `docs/reference/codex-safety-harness.md`
- `scripts/tests/**`

### 付随ドキュメント

- 本プラン以外に新しい`docs/reports/`は作成しない。
- 実装時の通常進捗はRun-local `REPORT.md`へcheckpoint単位で残す。

## 9. 備考

- 今回の主眼は「ログを増やすこと」ではなく「ログ責務を減らして整理すること」である。
- `observe.ps1|sh`は、単に現在configから呼ばれていないという理由だけで即削除しない。producer / consumer / callerを確認し、新canonical loggerへ責務を移した後で削除する。
- 実装時にHookを追加した結果、`codex-task log + Hook log + REPORT`へ同じcommand/resultが三重保存される設計になった場合は、完了条件未達とする。
- raw logは長期的な正式成果物ではなく、Run Artifactを裏付けるmachine-readable Evidenceとして扱う。
