# run.json machine-managed・interactive自動同期計画

## 0. 依頼概要

- 依頼内容:
  - 通常のCodex Runにおける`.codex/runs/<run_id>/run.json`をmachine-managed artifactとして統一する。
  - `AGENTS.md`等に残る、Agentによる`run.json`の手動作成・直接編集を許容または示唆するactive instructionを除去する。
  - 非対話の`codex-task`だけでなく、interactiveの`codex-safe`でもCodex process終了時に既存`run.json`を自動同期し、通常運用で手編集を不要にする。
- 背景:
  - `scripts/new-run.ps1/sh`は`.codex/templates/RUN_MANIFEST.json`から`run.json`を自動生成する。
  - `scripts/codex-task.ps1/sh`は`--record-run-manifest`経路で`run.json`を自動更新する。
  - `scripts/collect-run-artifacts.ps1/sh`はrun-local artifactを再集約して`run.json`を更新する。
  - `scripts/codex-safe.ps1/sh`は`RunId`を受け取れるが、現在はCodex process終了後にmanifestを同期しない。
  - 現collectorはreport / evaluation summaryを再集約できるが、interactive終了時のcurrent working tree変更を`changed_files`へ再取得しない。
  - `AGENTS.md`にはactual Runの`run.json`をAgentが直接作成・更新できるように読める表現が残っている。
- 期待成果:
  - 新規生成は`new-run`、非対話更新は`codex-task`、interactive終了時更新は`codex-safe` + collectorという責務が明確になる。
  - actual Runの`run.json`をAgentが直接編集する通常運用が不要になる。
  - `Stop` HookへRun lifecycleの副作用を持たせず、既存のsession observation責務を維持する。

## 1. ゴール / 完了条件

- ゴール:
  - `.codex/runs/<run_id>/run.json`をmachine-managed aggregate manifestとして固定し、interactive Runでも既存の機械経路だけで同期できる状態にする。
- 完了条件（DoD）:
  - `AGENTS.md`に、actual Runの`run.json`は通常workflowでAgentが直接作成・直接編集しないことが明記されている。
  - 新規Runでmanifestが必要な場合は`scripts/new-run.ps1/sh`が生成する。
  - `codex-task --record-run-manifest`の既存自動更新は維持する。
  - `codex-safe`で`RunId`を指定した場合、Codex process起動前に対象Run Directoryの存在を確認する。
  - `RunId`指定済みで`.codex/runs/<run_id>/`が存在しない場合は、Run Directoryやlog directoryを新規作成せず、Codexを起動する前に失敗する。
  - `RunId`未指定時は従来どおり動作し、manifest同期を行わない。
  - `RunId`指定済みでRun Directoryは存在するが`run.json`が存在しない場合は、lightweight / `NoRunManifest`のRunとしてCodexを実行し、manifestを新規作成せず同期だけ正常skipする。
  - `RunId`指定済みで既存`run.json`がある場合は、Codex process終了後にcollectorを1回実行して自動同期する。
  - interactive終了時のcurrent working tree変更を、既存`changed_files`を失わず累積反映できる。
  - collectorの既存report / evaluation summary再集約を同じ同期で利用する。
  - interactive Codex process終了をRun完了とはみなさず、process exitや`Stop`だけを根拠に`run.json.status`を`completed`へ変更しない。
  - `Stop` / `SubagentStop` Hook、Hook JSONLの責務を変更しない。
  - Hook→Run correlation、`CODEX_RUN_ID`伝播、active-run registryを追加しない。
  - Codex本体が非0終了した場合は、そのexit codeを優先して返す。
  - Codex本体が0終了し、manifest同期だけが失敗した場合は非0終了として同期失敗を表面化する。
  - manifest同期の開始・成功・skip・失敗を既存`codex-safe` harness logへ記録する。
  - collector失敗時は、Codex exit codeの優先順位を維持しつつstderrへ短いwarningを出す。
  - `PreflightOnly` / `PrintCommand`等、Codex processを実行しない経路ではmanifest同期を実行しない。
  - PowerShell / Bashで同じ契約になる。
  - `evaluation.json`のAgent / reviewerによる評価判断の責務は維持する。
  - `lightweight`で`run.json`が任意である契約と、`--no-run-manifest` / `-NoRunManifest`は維持する。
  - 関連contract test、Bash / PowerShell verify、Markdown lint、diff checkがPASSする。

## 2. 現状理解と前提

### Current understanding

#### 現行のmanifest lifecycle

1. 新規Runでmanifestが必要な場合、`new-run.ps1/sh`が`run.json`を生成する。
2. 非対話実行では`codex-task.ps1/sh`が`--record-run-manifest`指定時に`run.json`を更新する。
3. `collect-run-artifacts.ps1/sh`は明示実行時にrun-local reportと`evaluation.json`を再集約する。
4. `codex-safe.ps1/sh`は`RunId`をログ配置等に使用するが、Codex process終了後に`run.json`を更新しない。
5. 現在の`codex-safe`は`RunId`指定時にRun Directoryが存在しなくても`.codex/runs/<run_id>/logs`を作成できるため、誤ったRunIdから不完全なRun Directoryが生まれる余地がある。
6. `Stop` Hookはsession eventをJSONLへ記録するだけで、Run完了やsuccess / failureを推測しない。

#### 現collectorの不足

- 既存`run.json`、run-local report、`evaluation.json`は再集約できる。
- `changed_files`は既存manifestの値を保持するだけで、interactive終了時のcurrent working tree変更を再取得しない。
- manifestが存在しない場合、collector単体ではtemplateから新規manifestを作成できるため、`codex-safe`側で「existing manifestがある場合だけcollectorを呼ぶ」guardが必要。

#### `AGENTS.md`で解消する曖昧表現

少なくとも以下を修正対象とする。

1. lightweightではrun artifactを「手動作成してよい」が`run.json`まで含むように読める表現。
2. `RUN_MANIFEST.json`を元にAgentがactual Runの`run.json`を直接作成できるように読める表現。
3. 同一Run継続時にAgentが`run.json`を直接「更新する」と読める表現。
4. 「Git操作禁止でもRun Artifactの作成・更新は通常のファイル編集として実施する」が`run.json`まで含むように読める表現。

### 対象境界

「Agentが直接作成・直接編集しない」の対象は、通常のCodex Run運用における`.codex/runs/<run_id>/run.json`とする。

以下は禁止対象に含めない。

- contract test / temporary directory内の`run.json` fixture。
- `.codex/templates/RUN_MANIFEST.json`自体のmaintenance。
- manifest writer / collectorの実装・テスト。
- manifest機能そのものを変更する専用タスク。

### `changed_files`の同期契約

interactive終了時は、以下をunionして`changed_files`へ反映する。

- 既存`run.json.changed_files`。
- process終了時点のcurrent working treeでGitが観測できる変更file path。

current working treeの取得対象は、少なくとも以下を含む。

- tracked fileのmodified / staged / deleted / renamed等。
- untracked file。

除外:

- `.codex/runs/**`自身のgenerated Run Artifact。

実装はfile path取得だけを目的とし、status種別の保存やsession attributionは行わない。

Git path取得は新しい複雑なporcelain parserを作らず、既存Git commandのname-only出力を組み合わせる等、最小の方法を優先する。

開始時点から既にdirtyだったfileも終了時working treeに残っていれば含まれ得る。これは許容する。

### Assumptions

- collectorからrepository Git状態を読み取れる。
- `run.json` schema v2のfield追加は不要で、既存`changed_files`へ同期できる。
- interactive process exitとRun完了は別概念であり、status更新を追加しなくても目的を達成できる。
- session中にcommitされてworking treeから消えた変更の厳密追跡は、今回の目的には不要である。

### Non-goals

- session開始HEAD / 終了HEADを用いたcommit差分追跡。
- session中commitされたfileを厳密に`changed_files`へ帰属すること。
- pre-existing dirty fileをsession単位に厳密帰属すること。
- content hash snapshotやworking tree全体snapshotの追加。
- `Stop` / `SubagentStop` Hookからcollectorを実行すること。
- Hook JSONLを`run.json`へ集約すること。
- HookとRunの完全correlation。
- `CODEX_RUN_ID`伝播、active-run registry、DB、daemonの追加。
- schema v3、manifest field追加、v1→v2 migration utilityの追加。
- interactive session専用の新しいstructured artifactを追加すること。
- `evaluation.json`の自動評価化・machine-managed化。
- `REPORT.md` / `TASKS.md` / `PLAN.md`のmachine-managed化。
- `run.json`を全workflowで必須化すること。
- `codex-safe`へverify / evaluation gateなど`codex-task`の全機能を移植すること。
- Product code、ECサイト仕様、カリキュラム本体の変更。

## 3. 質問 / 曖昧性

- 必ず質問する不透明点: なし。
- 未回答の重要質問: なし。
- 下記Stop conditionに該当した場合のみ実装を停止し、scopeを拡大せず再判断する。

## 4. 影響範囲

### 必須変更候補

- `AGENTS.md`
- `scripts/codex-safe.ps1`
- `scripts/codex-safe.sh`
- `scripts/collect-run-artifacts.py`
- `scripts/collect-run-artifacts.ps1`
- `scripts/collect-run-artifacts.sh`
- `docs/reference/run-artifacts.md`
- `docs/reference/codex-implementation-harness.md`
- 関連する既存contract test
- `scripts/verify`
- `scripts/verify.ps1`

### 確認のみ

- `.codex/templates/RUN_MANIFEST.json`
- `scripts/new-run.ps1`
- `scripts/new-run.sh`
- `scripts/codex-task.ps1`
- `scripts/codex-task.sh`
- `.codex/config.toml`
- `.codex/hooks/log_event.mjs`
- `.agents/skills/**`のactive Run Artifact instruction
- `docs/guides/**` / `docs/reference/**`のactive `run.json` guidance

### 原則変更しない

- manifest schema / template shape。
- `codex-task`の既存writer logic。
- Hook logger / Hook config / Safety Hook。
- `.codex/runs/**`の過去Run。
- 過去Plan / history。
- Product code。

## 5. 変更方針

### 5.1 machine-managed契約をinstructionへ反映

`AGENTS.md`では以下を明確化する。

- actual Runの`run.json`はAgentが直接作成・直接編集しない。
- manifestが必要な新規Runは`new-run`を使用する。
- 非対話実行では`codex-task`が更新する。
- interactive実行では`codex-safe -RunId`終了時の自動同期を使用する。
- 手動再集約が必要な場合はcollectorを使用する。
- `PLAN.md` / `TASKS.md` / `REPORT.md` / `evaluation.json`のAgent-managed責務と区別する。

### 5.2 `codex-safe`のRunId precondition

PowerShell / Bash双方で、`RunId`指定時はログ保存先を作る前に対象Run Directoryを確認する。

- `RunId`なし:
  - 従来どおり実行する。
  - manifest同期なし。
- `RunId`あり + `.codex/runs/<run_id>/`なし:
  - invalid runとしてCodex起動前にfailする。
  - Run Directory / logs directoryを新規作成しない。
  - `new-run`を使う正規初期化経路を維持する。
- `RunId`あり + Run Directoryあり + `run.json`なし:
  - lightweight / `NoRunManifest`のRunとして許可する。
  - Codexは実行する。
  - process終了後のmanifest同期はskipする。
- `RunId`あり + Run Directoryあり + `run.json`あり:
  - Codexを実行する。
  - process終了後にmanifest同期を行う。

`PreflightOnly` / `PrintCommand`等、Codex processを起動しないearly exit経路ではmanifest同期しない。

### 5.3 `codex-safe`終了時同期

PowerShell / Bash双方で以下の順序にする。

1. Codex processを通常どおり実行する。
2. Codex exit codeを退避する。
3. existing `run.json`がある場合だけ`manifest_sync_start`をharness logへ記録する。
4. collectorを`Git changed files refresh`付きで1回実行する。
5. 成功時は`manifest_sync_success`を記録する。
6. manifestなしで同期対象外の場合は`manifest_sync_skipped`と理由を記録する。
7. collector失敗時は`manifest_sync_failed`を記録し、stderrへ短いwarningを出す。
8. Codex exit codeが非0なら、そのcodeを最終exitとして優先する。
9. Codex exit codeが0かつcollectorが失敗した場合は非0で終了する。
10. 両方成功、またはmanifest同期が正常skipの場合はCodex exit codeを返す。

新しいmanifest-sync専用artifactは作成しない。既存`codex-safe` harness logを使う。

### 5.4 collectorの最小拡張

既存collectorへ、interactive終了時にだけ使用する明示optionを1つ追加する。

想定contract:

- `--refresh-git-changed-files`

PowerShell / Bash wrapperも同じoptionをpass-throughできるようにする。

`--refresh-git-changed-files`未指定時のcollector挙動は変更しない。

refresh指定時は以下を行う。

- current working treeのchanged file pathをGitから取得する。
- tracked changesとuntracked filesを取得する。
- `.codex/runs/**`を除外する。
- existing `run.json.changed_files`と重複排除してunionする。
- status種別やsession metadataは追加しない。
- `run.json.status`は変更しない。

Git取得方法はfile path取得に必要な最小commandとし、独自の複雑なstatus parserを追加しない。

collectorの既存再集約対象は維持する。

- `codex_task_reports`
- `artifact_summary.codex_task_report_count`
- `evaluation_path`
- `artifact_summary.evaluation_present`
- validな`evaluation.json.primary_failure_category`
- validation warnings

### 5.5 Hook責務は維持

`.codex/config.toml` / `.codex/hooks/log_event.mjs`は変更しない。

- `Stop`: session event observationのみ。
- `SubagentStop`: subagent event observationのみ。
- Run manifest同期は`codex-safe` process lifecycle側で行う。

### 実行タスク

- [ ] 1. `run.json`関連active instruction、`codex-safe` / `codex-task` / collector、既存contract testを確認し、変更surfaceを確定する。
- [ ] 2. `AGENTS.md`の4種類の曖昧表現を修正し、`new-run` / `codex-task` / `codex-safe` / collectorの責務を明記する。
- [ ] 3. `codex-safe.ps1/sh`へRunId指定時のRun Directory存在preconditionを追加し、不正RunIdで不完全なRun Directoryを作らないようにする。
- [ ] 4. collectorにopt-inのcurrent working tree changed files refreshを追加し、existing `changed_files`へ累積できるようにする。default collector挙動は維持する。
- [ ] 5. `collect-run-artifacts.ps1/sh`へrefresh optionのpass-throughを追加する。
- [ ] 6. `codex-safe.ps1/sh`でprocess終了後にexisting `run.json`がある場合だけcollectorを1回呼び、exit code優先順位とmanifest sync logを実装する。
- [ ] 7. `docs/reference/run-artifacts.md` / `docs/reference/codex-implementation-harness.md`、既存contract test、`scripts/verify` / `scripts/verify.ps1`を必要最小限更新する。
- [ ] 8. targeted tests、Bash / PowerShell verify、Markdown lint、diff checkを実行し、Hook / schema / Product codeへscopeが広がっていないことを最終確認する。

### Stop conditions

以下が必要になった場合は実装を止め、本Planへ無理に追加しない。

- `run.json` schema field追加・schema version変更が必要。
- session開始HEAD / commit history追跡が必要。
- content hash snapshotやworktree snapshotが必要。
- `Stop` HookからRunIdを解決する仕組みが必要。
- `CODEX_RUN_ID`伝播、active-run registry、session→Run correlation基盤が必要。
- interactive session専用の新しい永続artifact chainが必要。
- `codex-safe`を`codex-task`同等のfull workflow runnerへ拡張する必要がある。

この場合は別taskとして再設計する。

## 6. 検証方法

### Contract tests

既存の関連contract testへ必要最小限追加する。新しいtest frameworkは作らない。

#### collector

- refresh option未指定では従来挙動を維持する。
- refresh指定時、existing `changed_files`を保持したままcurrent working treeのpathを追加・重複排除する。
- tracked changeとuntracked fileを取得できる。
- `.codex/runs/**`を`changed_files`へ追加しない。
- `run.json.status`を変更しない。
- v1 manifestを自動v2 migrationしない既存contractを維持する。

#### `codex-safe`

- RunId未指定: 従来動作、manifest syncなし。
- RunIdあり + Run Directoryなし: Codex起動前にfailし、Run Directory / logsを作成しない。
- RunIdあり + Run Directoryあり + `run.json`なし: Codex実行後、manifestを作成せず正常skip。
- RunIdあり + existing `run.json`あり: Codex process終了後にcollectorを1回呼ぶ。
- Codex nonzero + collector success: Codex exit codeを返す。
- Codex nonzero + collector failure: Codex exit codeを優先し、sync failureをlog / warningへ残す。
- Codex zero + collector failure: nonzeroを返す。
- PreflightOnly / PrintCommand: collectorを呼ばない。
- manifest syncのstart / success / skipped / failedが既存harness logで確認できる。
- PowerShell / Bashで同じ契約を満たす。

テストのためにproduction codeへtest-only modeやtest-only output pathを追加しない。既存のshim / fixture方式があれば再利用する。

### Static verification

- `scripts/verify`
- `scripts/verify.ps1`

最低限確認する。

- `AGENTS.md`にactual Runの`run.json` machine-managed契約がある。
- `codex-safe` interactive終了時同期がreference docsに記載されている。
- `Stop` HookをRun manifest update triggerとして説明していない。
- Hook config / loggerの既存契約が維持されている。

脆い一般語negative checkは追加しない。

### Manual smoke

PowerShell / Bashで可能な環境について代表確認する。

1. 存在しないRunIdを指定し、Codex起動前に失敗してRun Directoryが作られないことを確認する。
2. `new-run`でmanifestありRunを作る。
3. `codex-safe -RunId`相当で最小interactive sessionを実行する。
4. session中に安全な未commit変更を作る。
5. process終了後、Agentが`run.json`を直接編集せず`changed_files`が同期されていることを確認する。
6. `run.json.status`がprocess exitだけを理由に`completed`へ変更されていないことを確認する。
7. Run Directoryあり・manifestなしのRunでは、終了時に`run.json`が新規作成されないことを確認する。

環境上BashまたはCodex実機が使えない場合はSKIP理由を明記し、contract testと利用可能な代表経路で補完する。未実行をPASSと記録しない。

### Docs / repository validation

- `pnpm run lint:markdown`
- `git diff --check`
- repository標準のBash / PowerShell verify
- 変更したcontract test
- 必要に応じてcontract suite全体

### 成功判定

以下をすべて満たせば完了とする。

- actual Runの`run.json`をAgentが通常workflowで直接作成・編集するinstructionが残っていない。
- new-run / codex-task / codex-safe / collectorの責務が一貫している。
- 不正なRunIdで不完全なRun Directoryを作らない。
- interactive `codex-safe`終了時にexisting manifestだけが自動同期される。
- manifest不要Runを勝手にmanifest化しない。
- current working tree changesを`changed_files`へ累積反映できる。
- session開始HEADやcommit history trackingを追加していない。
- collectorのdefault挙動とv1/v2 compatibilityを壊していない。
- Codex / collectorのexit semanticsとmanifest sync logが明確でtestされている。
- `Stop` HookをRun完了triggerにしていない。
- Hook / schema / evaluation責務を変更していない。
- PowerShell / Bashの契約が一致している。
- 関連tests / verify / Markdown / diff checkがPASSしている。

## 7. リスクと対策

### Risk 1: `Stop`とRun完了を混同する

- 対策: Hookは変更せず、`codex-safe` process終了時のartifact syncとして扱う。`status=completed`は設定しない。

### Risk 2: 誤ったRunIdで不完全なRun Directoryを作る

- 対策: `RunId`指定時はlog directory作成前にexisting Run Directoryを必須確認し、存在しなければCodex起動前にfailする。

### Risk 3: manifest不要Runまで自動生成する

- 対策: `codex-safe`側でexisting `run.json`を同期条件にする。Run Directoryは存在してもmanifestがなければskipする。

### Risk 4: 過去の`changed_files`を失う

- 対策: refreshはreplaceではなくexisting値とのunionにする。

### Risk 5: session中commitの変更がworking treeから消える

- 対策: 今回は追跡対象外とする。必要になった場合はRun-level change attributionを別taskとして設計する。

### Risk 6: 自動同期失敗が見逃され、手編集運用へ戻る

- 対策: manifest syncのstart / success / skipped / failedを既存harness logへ記録する。Codex成功時のcollector failureはnonzero、Codex失敗時は元exit codeを優先しつつwarningを残す。

### Risk 7: scopeがRun lifecycle基盤の再設計へ広がる

- 対策: HEAD tracking / registry / correlation / schema変更 / Hook副作用 / new artifact chainは明示Non-goal・Stop conditionとする。

## 8. 成果物

### 想定変更ファイル

- `AGENTS.md`
- `scripts/codex-safe.ps1`
- `scripts/codex-safe.sh`
- `scripts/collect-run-artifacts.py`
- `scripts/collect-run-artifacts.ps1`
- `scripts/collect-run-artifacts.sh`
- `docs/reference/run-artifacts.md`
- `docs/reference/codex-implementation-harness.md`
- 関連する既存contract test
- `scripts/verify`
- `scripts/verify.ps1`
- 本Plan

### 変更しないもの

- `.codex/config.toml`
- `.codex/hooks/log_event.mjs`
- manifest schema / template shape
- `codex-task`の既存manifest lifecycle
- Product code
- 過去Run / 過去Plan / history

## 9. Follow-up notes

- 今回の目的は、interactive Runにもmachine-managed思想を適用し、actual `run.json`を手編集しなくてよい通常運用を完成させることである。
- `Stop` Hookは低レベル観測のまま維持し、Run manifest更新triggerにはしない。
- session中commitまで含む厳密な変更帰属が必要になった場合は、本件へ追加せず別のRun-level attribution課題として扱う。
