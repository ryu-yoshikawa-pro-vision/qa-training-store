# run.json machine-managed・interactive自動同期計画

## 0. 依頼概要

- 依頼内容:
  - 通常のCodex Runにおける`.codex/runs/<run_id>/run.json`をmachine-managed artifactとして統一する。
  - `AGENTS.md`等に残る、Agentによる`run.json`の手動作成・直接編集を許容または示唆するactive instructionを除去する。
  - 非対話の`codex-task`だけでなく、interactiveの`codex-safe`でもCodex process終了時に`run.json`を自動同期し、通常運用で手編集を不要にする。
- 背景:
  - `scripts/new-run.ps1/sh`は`.codex/templates/RUN_MANIFEST.json`から`run.json`を自動生成する。
  - `scripts/codex-task.ps1/sh`は`--record-run-manifest`経路で実行中・失敗時・完了時に`run.json`を更新する。
  - `scripts/collect-run-artifacts.ps1/sh`はrun-local artifactを再集約して`run.json`を更新する。
  - 一方、`scripts/codex-safe.ps1/sh`は`RunId`を受け取れるが、現在はCodex process終了後にmanifestを同期せず終了する。
  - 現collectorはreport / evaluation summaryを再集約できるが、interactive sessionで発生したGit変更を自動で`changed_files`へ取り込まない。
  - `AGENTS.md`にはactual Runの`run.json`をAgentが直接作成・更新できるように読める表現が残っている。
- 期待成果:
  - 新規生成は`new-run`、非対話更新は`codex-task`、interactive終了時更新は`codex-safe` + collectorという責務が明確になる。
  - actual Runの`run.json`をAgentが直接編集する通常運用が不要になる。
  - `Stop` HookへRun lifecycleの副作用を持たせず、既存のsession-scoped observation責務を維持する。

## 1. ゴール / 完了条件

- ゴール:
  - `.codex/runs/<run_id>/run.json`をmachine-managed aggregate manifestとして固定し、interactive Runを含めて既存の機械経路だけで同期できる状態にする。
- 完了条件（DoD）:
  - `AGENTS.md`に、actual Runの`run.json`は通常workflowでAgentが直接作成・直接編集しないことが明記されている。
  - 新規Runでmanifestが必要な場合は`scripts/new-run.ps1/sh`が生成する。
  - `codex-task --record-run-manifest`の既存自動更新は維持する。
  - `codex-safe -RunId <run_id>` / Bash同等指定でinteractive Codex processを実行した場合、process終了後に既存`run.json`を自動同期する。
  - `RunId`未指定時はmanifest同期を行わない。
  - `RunId`指定済みでも`.codex/runs/<run_id>/run.json`が存在しない場合は、新規manifestを作らず正常skipする。
  - `codex-safe`終了時同期では、interactive session中のGit変更を`changed_files`へ累積反映できる。
  - session中にcommitされた変更も、session開始時HEADと終了時HEADの差分から`changed_files`へ反映できる。
  - current working treeの未commit変更も`changed_files`へ反映できる。
  - collectorの既存report / evaluation summary再集約を同じ同期で利用する。
  - interactive Codex process終了をRun完了とはみなさず、`Stop`やprocess exitだけを根拠に`run.json.status`を`completed`へ変更しない。
  - `Stop` Hook、`SubagentStop` Hook、Hook JSONLの責務を変更しない。
  - Hook→Run correlation、`CODEX_RUN_ID`伝播、active-run registryを追加しない。
  - Codex本体が非0終了した場合は、そのexit codeを優先して返す。
  - Codex本体が0終了し、manifest同期だけが失敗した場合は非0終了として同期失敗を表面化する。
  - `PreflightOnly` / `PrintCommand`等、Codex processを実行しない経路ではmanifest同期を実行しない。
  - PowerShell / Bashで同じ契約になる。
  - `evaluation.json`のAgent / reviewerによる評価判断の責務は維持する。
  - `lightweight`で`run.json`が任意である契約と、`--no-run-manifest` / `-NoRunManifest`は維持する。
  - 関連contract test、Bash / PowerShell verify、Markdown lint、diff checkがPASSする。

## 2. 現状理解と前提

### Current understanding

#### 現行のmanifest lifecycle

1. 新規Runでmanifestが必要な場合、`new-run.ps1/sh`が`run.json`を生成する。
2. 非対話実行では`codex-task.ps1/sh`が`--record-run-manifest`指定時に複数checkpointで`run.json`を更新する。
3. `collect-run-artifacts.ps1/sh`は明示実行時にrun-local reportと`evaluation.json`を再集約する。
4. `codex-safe.ps1/sh`は`RunId`をログ配置等に使用するが、Codex process終了後に`run.json`を更新しない。
5. `Stop` Hookはsession eventをJSONLへ記録するだけで、Run完了やsuccess / failureを推測しない。

#### 現collectorの不足

- 既存`run.json`、run-local report、`evaluation.json`は再集約できる。
- `changed_files`は既存manifestの値を保持するだけで、interactive session中のGit変更を再計算しない。
- manifestが存在しない場合、collector単体ではtemplateから新規manifestを作成できるため、`codex-safe`側で「既存manifestがある場合だけ同期する」guardが必要。

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

interactive session終了時の`changed_files`は、既存manifest値を失わず、今回sessionで観測できるGit変更を累積する。

今回sessionで観測する変更は以下のunionとする。

- session開始時HEADからsession終了時HEADまでにcommitされたfile path。
- session終了時点のworking treeでmodified / added / deleted / renamed / untrackedとして観測できるfile path。

除外:

- `.codex/runs/**`自身のgenerated Run Artifact。

既存manifestの`changed_files`は過去session / `codex-task`のRun履歴として保持し、今回sessionの観測結果と重複排除してunionする。

開始時点から既にdirtyだったfileは現行`codex-task`と同様にworking tree observationへ含まれ得る。このタスクではcontent hashベースのsession attributionやclean-git強制は追加しない。

### Assumptions

- `codex-safe`はCodex process起動前にGit HEADを取得できる。
- collectorからrepository Git状態を読み取れる。
- `run.json` schema v2のfield追加は不要で、既存`changed_files`へ同期できる。
- interactive process exitとRun完了は別概念であり、status更新を追加しなくても目的を達成できる。

### Non-goals

- `Stop` / `SubagentStop` Hookからcollectorを実行すること。
- Hook JSONLを`run.json`へ集約すること。
- HookとRunの完全correlation。
- `CODEX_RUN_ID`伝播、active-run registry、DB、daemonの追加。
- schema v3、manifest field追加、v1→v2 migration utilityの追加。
- interactive sessionごとの新しいstructured artifactを追加すること。
- `evaluation.json`の自動評価化・machine-managed化。
- `REPORT.md` / `TASKS.md` / `PLAN.md`のmachine-managed化。
- `run.json`を全workflowで必須化すること。
- `codex-safe`へverify / evaluation gateなど`codex-task`の全機能を移植すること。
- pre-existing dirty fileをcontent hashでsession単位に厳密帰属する仕組み。
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

### 5.2 `codex-safe`終了時同期

PowerShell / Bash双方で以下の順序にする。

1. `RunId`を既存規則でvalidationする。
2. Codex process起動直前にGit HEADを取得する。Git HEAD取得不可の場合は`base_head=null`として継続し、working tree observationだけ可能な形にする。
3. Codex processを通常どおり実行する。
4. Codex exit codeを退避する。
5. `RunId`があり、かつ`.codex/runs/<run_id>/run.json`が存在する場合だけcollector同期を実行する。
6. manifestが存在しない場合は新規作成せずskipし、既存harness logが有効ならskip理由を記録する。
7. collectorへsession開始HEADを渡し、Git changed files refresh + 既存artifact再集約を1回行う。
8. Codex exit codeが非0なら、そのcodeを最終exitとして優先する。
9. Codex exit codeが0かつcollectorが失敗した場合は非0で終了する。
10. 両方成功した場合は0で終了する。

`PreflightOnly` / `PrintCommand`等Codex processを起動しないearly exit経路では同期しない。

### 5.3 collectorの最小拡張

既存collectorへ、interactive終了時にだけ使用する明示optionを追加する。

想定contract:

- `--refresh-git-changed-files`
- `--base-head <sha>`（取得できた場合のみ）

PowerShell / Bash wrapperも同じoptionを渡せるようにする。

`--refresh-git-changed-files`未指定時のcollector挙動は変更しない。

refresh指定時は以下を行う。

- `git status --porcelain=v1 -z --untracked-files=all`相当からcurrent working treeのchanged pathsを取得する。
- `--base-head`があり、現在HEADと比較可能な場合は`base_head..HEAD`のcommitted changed pathsを取得する。
- pathをrepo-relative POSIX形式へ正規化する。
- `.codex/runs/**`を除外する。
- existing `manifest.changed_files` + committed paths + working tree pathsを重複排除して保存する。
- Git observationに失敗した場合はsilentに不完全な成功扱いにせず、collector失敗として呼出元へ返す。

collectorは引き続き以下も再集約する。

- `codex_task_reports`
- `artifact_summary.codex_task_report_count`
- `evaluation_path`
- `artifact_summary.evaluation_present`
- validな`evaluation.json.primary_failure_category`
- validation warnings

interactive process終了だけを根拠に`status`を`completed`へ変更しない。

### 5.4 Hook責務は維持

`.codex/config.toml` / `.codex/hooks/log_event.mjs`は変更しない。

- `Stop`: session event observationのみ。
- `SubagentStop`: subagent event observationのみ。
- Run manifest同期は`codex-safe` process lifecycle側で行う。

### 実行タスク

- [ ] 1. `run.json`関連active instruction、`codex-safe` / `codex-task` / collector、既存contract testを確認し、現行責務と変更surfaceを確定する。
- [ ] 2. `AGENTS.md`の4種類の曖昧表現を修正し、`new-run` / `codex-task` / `codex-safe` / collectorの責務を明記する。
- [ ] 3. collectorにopt-inのGit changed files refreshを追加し、existing `changed_files`へsession観測結果を累積できるようにする。default collector挙動は維持する。
- [ ] 4. `collect-run-artifacts.ps1/sh`へ新optionのpass-throughを追加する。
- [ ] 5. `codex-safe.ps1/sh`でCodex process開始HEADを取得し、process終了後に「RunIdあり + existing run.jsonあり」の場合だけcollectorを1回呼ぶ。exit code優先順位とskip条件を実装する。
- [ ] 6. `docs/reference/run-artifacts.md` / `docs/reference/codex-implementation-harness.md`を実装済みlifecycleと一致させる。HookがRun完了triggerではないことも明記する。
- [ ] 7. 既存contract testと`scripts/verify` / `scripts/verify.ps1`を必要最小限更新し、PowerShell / Bash parity、skip、changed_files refresh、exit semantics、machine-managed instructionを固定する。
- [ ] 8. targeted tests、Bash / PowerShell verify、Markdown lint、diff checkを実行し、Hook / schema / Product codeへscopeが広がっていないことを最終確認する。

### Stop conditions

以下が必要になった場合は実装を止め、本Planへ無理に追加しない。

- `run.json` schema field追加・schema version変更が必要。
- `Stop` HookからRunIdを解決する仕組みが必要。
- `CODEX_RUN_ID`伝播、active-run registry、session→Run correlation基盤が必要。
- interactive session専用の新しい永続artifact chainが必要。
- Git changed files同期のためにcontent hash snapshotやworktree全体snapshotが必要。
- `codex-safe`を`codex-task`同等のfull workflow runnerへ拡張する必要がある。

この場合は別taskとして再設計する。

## 6. 検証方法

### Contract tests

既存の関連contract testへ、少なくとも以下を追加する。新しいtest frameworkは作らない。

#### collector

- refresh option未指定では従来挙動を維持する。
- refresh指定時、existing `changed_files`を保持したままGit観測pathを追加・重複排除する。
- `.codex/runs/**`を`changed_files`へ追加しない。
- base HEADから現在HEADまでのcommitted changeを取得できる。
- current working treeのmodified / untracked等を取得できる。
- v1 manifestを自動v2 migrationしない既存contractを維持する。

#### `codex-safe`

- RunId未指定: manifest syncを呼ばない。
- RunIdあり + `run.json`なし: manifestを作成せず正常skip。
- RunIdあり + `run.json`あり: Codex process終了後にcollectorを1回呼ぶ。
- Codex nonzero + collector success: Codex exit codeを返す。
- Codex nonzero + collector failure: Codex exit codeを優先する。
- Codex zero + collector failure: nonzeroを返す。
- PreflightOnly / PrintCommand: collectorを呼ばない。
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

1. `new-run`でmanifestありRunを作る。
2. `codex-safe -RunId`相当で最小interactive sessionを実行する。
3. session中に安全な小変更を行う。
4. process終了後、Agentが`run.json`を直接編集せず`changed_files`が同期されていることを確認する。
5. `run.json.status`がprocess exitだけを理由に誤って`completed`へ変更されていないことを確認する。
6. manifestなしRunでは終了時に`run.json`が新規作成されないことを確認する。

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
- interactive `codex-safe`終了時にexisting manifestだけが自動同期される。
- manifest不要Runを勝手にmanifest化しない。
- interactive sessionのcommitted + working tree changesを`changed_files`へ累積反映できる。
- collectorのdefault挙動とv1/v2 compatibilityを壊していない。
- Codex / collectorのexit semanticsが明確でtestされている。
- `Stop` HookをRun完了triggerにしていない。
- Hook / schema / evaluation責務を変更していない。
- PowerShell / Bashの契約が一致している。
- 関連tests / verify / Markdown / diff checkがPASSしている。

## 7. リスクと対策

### Risk 1: `Stop`とRun完了を混同する

- 対策: Hookは変更せず、`codex-safe` process終了時のartifact syncとして扱う。`status=completed`は設定しない。

### Risk 2: manifest不要Runまで自動生成する

- 対策: `codex-safe`側でexisting `.codex/runs/<run_id>/run.json`を必須条件にする。なければskipする。

### Risk 3: session中のcommit後にworking treeがcleanになり変更を失う

- 対策: session開始HEADを保持し、終了HEADとの差分もcollectorへ反映する。

### Risk 4: 過去sessionの`changed_files`を失う

- 対策: refreshはreplaceではなくexisting値とのunionにする。

### Risk 5: 自動同期失敗が見逃され、再び手編集運用へ戻る

- 対策: Codex成功時のcollector failureはnonzero終了にする。Codex自体が失敗している場合は元exit codeを優先する。

### Risk 6: scopeがRun lifecycle基盤の再設計へ広がる

- 対策: registry / correlation / schema変更 / Hook副作用 / new artifact chainは明示Non-goal・Stop conditionとする。

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

- 今回の目的は単なるinstruction修正ではなく、interactive Runにも既存machine-managed思想を適用し、actual `run.json`を手編集しなくてよい運用を完成させることである。
- `Stop` Hookは低レベル観測のまま維持し、Run manifest更新triggerにはしない。
- 将来、sessionごとの厳密な変更帰属やpre-existing dirty除外が必要になった場合は、別のartifact attribution課題として扱う。
