# run.json machine-managed・interactive自動同期計画

## 0. 依頼概要

- 通常のCodex Runにおける`.codex/runs/<run_id>/run.json`をmachine-managed artifactとして統一する。
- `AGENTS.md`等に残る、Agentによるactual Runの`run.json`手動作成・直接編集を許容または示唆するactive instructionを除去する。
- 非対話の`codex-task`だけでなく、interactiveの`codex-safe`でもCodex process終了時に既存`run.json`を自動同期し、通常運用で手編集を不要にする。
- `Stop` Hookは低レベル観測のままとし、Run lifecycleの更新triggerにはしない。

## 1. ゴール / 完了条件

### ゴール

`.codex/runs/<run_id>/run.json`をmachine-managed aggregate manifestとして固定し、interactive Runでも既存の機械経路だけで同期できる状態にする。

### 完了条件（DoD）

- `AGENTS.md`に、actual Runの`run.json`をAgentが通常workflowで直接作成・直接編集しないことが明記されている。
- 新規manifest生成は`scripts/new-run.ps1/sh`を正規経路とする。
- 非対話実行では`codex-task --record-run-manifest`の既存自動更新を維持する。
- interactive実行では、`codex-safe`に`RunId`が指定され、対象Run Directoryと既存`run.json`がある場合だけ、Codex process終了後にcollectorを1回実行して同期する。
- `RunId`未指定時は従来どおり動作し、manifest同期を行わない。
- `RunId`指定時に`.codex/runs/<run_id>/`が存在しない場合は、Run Directoryやlog directoryを作成せずCodex起動前にfailする。
- Run Directoryは存在するが`run.json`がない場合はmanifest-less Runとして許可し、Codexは実行するがmanifest同期はskipする。manifestがない理由は推測しない。
- interactive終了時のcurrent working tree変更を、既存`run.json.changed_files`を失わず累積反映できる。
- collectorの既存report / evaluation summary再集約を同じ同期で利用する。
- interactive process終了や`Stop`だけを根拠に`run.json.status`を`completed`へ変更しない。
- `Stop` / `SubagentStop` Hook、Hook JSONL、Hook configを変更しない。
- Hook→Run correlation、`CODEX_RUN_ID`伝播、active-run registryを追加しない。
- Codex本体が非0終了した場合は、そのexit codeを最終exitとして優先する。
- Codex本体が0終了し、manifest同期だけが失敗した場合はnonzeroで終了する。
- manifest同期のstart / success / skipped / failedを、logging有効時は既存`codex-safe` harness logへ記録する。
- `--no-log` / `-NoLog`でもmanifest同期は実行する。log eventだけ省略し、同期失敗時のstderr warningは維持する。
- `PreflightOnly` / `PrintCommand`等、Codex processを実行しない経路ではmanifest同期を行わない。
- PowerShell / Bashで同じ契約になる。
- manifest schema / template shape、`codex-task`既存writer、evaluation責務を変更しない。
- 関連contract test、Bash / PowerShell verify、Markdown lint、diff checkがPASSする。

## 2. 現状と変更理由

### 現行manifest lifecycle

1. `new-run.ps1/sh`が新規Runの`run.json`を生成できる。
2. `codex-task.ps1/sh`は`--record-run-manifest`指定時に`run.json`を自動更新する。
3. `collect-run-artifacts.py`は既存manifest、run-local report、`evaluation.json`を再集約できる。
4. `codex-safe.ps1/sh`は`RunId`を受け取れるが、Codex process終了後にmanifestを同期しない。
5. 現在の`codex-safe`は、存在しない`RunId`でもlog path生成時に`.codex/runs/<run_id>/logs`を作成できるため、不完全なRun Directoryが生まれる余地がある。
6. collectorは既存`changed_files`を保持するが、interactive終了時のcurrent working tree変更を再取得しない。
7. `Stop` Hookはsession eventをJSONLへ記録するだけで、Run完了やsuccess / failureを推測しない。

### `AGENTS.md`で解消する曖昧表現

少なくとも以下を修正する。

1. lightweightではrun artifactを「手動作成してよい」が`run.json`まで含むように読める表現。
2. `RUN_MANIFEST.json`を元にAgentがactual Runの`run.json`を直接作成できるように読める表現。
3. 同一Run継続時にAgentが`run.json`を直接「更新する」と読める表現。
4. 「Git操作禁止でもRun Artifactの作成・更新は通常のファイル編集として実施する」が`run.json`まで含むように読める表現。

### 直接編集禁止の対象境界

禁止対象は、通常のCodex Run運用における`.codex/runs/<run_id>/run.json`とする。

以下は禁止対象に含めない。

- contract test / temporary directory内の`run.json` fixture。
- `.codex/templates/RUN_MANIFEST.json`自体のmaintenance。
- manifest writer / collectorの実装・テスト。
- manifest機能そのものを変更する専用タスク。

## 3. `changed_files`同期契約

interactive終了時は以下をunionして`run.json.changed_files`へ反映する。

- 既存`run.json.changed_files`。
- process終了時点のcurrent working treeでGitが観測できるtracked change。
- process終了時点のuntracked file。

### Git path取得方法

独自のporcelain status parserは作らず、collectorからrepository rootで以下を実行してpathだけ取得する。

```text
git diff --name-only --relative HEAD --
git ls-files --others --exclude-standard
```

取得結果をnormalizeし、重複排除してexisting `changed_files`とunionする。

### 除外

- `.codex/runs/**`自身のgenerated Run Artifact。

### 失敗時

`--refresh-git-changed-files`指定時に、上記Git commandのいずれかが実行失敗またはnonzero終了した場合はcollector failureとする。古い`changed_files`のまま成功扱いにしない。

### 許容する制約

- session開始時点から既にdirtyだったfileも、終了時working treeに残っていれば含まれ得る。
- session中にcommitされてworking treeから消えた変更は今回追跡しない。
- status種別やsession attribution metadataは保存しない。

## 4. Non-goals / Stop conditions

### Non-goals

- session開始HEAD / 終了HEADを用いたcommit差分追跡。
- session中commitされたfileの厳密なRun帰属。
- pre-existing dirty fileのsession単位の厳密帰属。
- content hash snapshot / worktree snapshot。
- `Stop` / `SubagentStop` Hookからcollectorを実行すること。
- Hook JSONLの`run.json`集約。
- HookとRunの完全correlation。
- `CODEX_RUN_ID`伝播、active-run registry、DB、daemon。
- schema version変更、manifest field追加、v1→v2 migration utility。
- interactive session専用の新しい永続artifact chain。
- `evaluation.json`の自動評価化・machine-managed化。
- `PLAN.md` / `TASKS.md` / `REPORT.md`のmachine-managed化。
- `run.json`の全workflow必須化。
- `codex-safe`へのverify / evaluation gate等、`codex-task` full workflowの移植。
- Product code、ECサイト仕様、カリキュラム本体の変更。

### Stop conditions

以下が必要になった場合は本タスクを拡張せず停止し、別taskとして再設計する。

- manifest schema / field変更が必要。
- session HEAD / commit history追跡が必要。
- snapshot方式が必要。
- HookからRunIdを解決する必要がある。
- Run correlation基盤やregistryが必要。
- `codex-safe`をfull workflow runnerへ拡張する必要がある。

## 5. 変更対象

### 必須変更

- `AGENTS.md`
- `scripts/codex-safe.ps1`
- `scripts/codex-safe.sh`
- `scripts/collect-run-artifacts.py`
- `scripts/collect-run-artifacts.ps1`
- `docs/reference/run-artifacts.md`
- `docs/reference/codex-implementation-harness.md`
- `tests/contracts/codex-run-manifest-contract.test.ts`
- `tests/contracts/codex-safe-run-manifest-sync.test.ts`
- `scripts/verify`
- `scripts/verify.ps1`

### 確認のみ

- `scripts/collect-run-artifacts.sh`
  - 現在`"$python_cmd" "$script_dir/collect-run-artifacts.py" "$@"`で全引数をそのままpass-throughするため、refresh option追加に伴うproduction変更は行わない。
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

## 6. 実装方針

### 6.1 machine-managed契約

`AGENTS.md`とreference docsで以下を統一する。

- actual Runの`run.json`はAgentが直接作成・直接編集しない。
- 新規manifestは`new-run`で生成する。
- 非対話更新は`codex-task`が行う。
- interactive更新は`codex-safe -RunId`終了時の自動同期で行う。
- 明示的な再集約が必要な場合はcollectorを使う。
- `PLAN.md` / `TASKS.md` / `REPORT.md` / `evaluation.json`のAgent-managed責務と区別する。

### 6.2 `codex-safe` RunId precondition

PowerShell / Bash双方で、log path生成前にRun Directoryを確認する。

- `RunId`なし:
  - 従来どおり実行。
  - manifest syncなし。
- `RunId`あり + `.codex/runs/<run_id>/`なし:
  - Codex起動前にfail。
  - Run Directory / logs directoryを作成しない。
- `RunId`あり + Run Directoryあり + `run.json`なし:
  - manifest-less RunとしてCodexを実行。
  - process終了後のmanifest syncはskip。
  - manifestがない理由は推測しない。
- `RunId`あり + Run Directoryあり + `run.json`あり:
  - Codexを実行。
  - process終了後にmanifest sync。

`PreflightOnly` / `PrintCommand`はCodex processを実行しないためmanifest syncしない。

### 6.3 collector拡張

`collect-run-artifacts.py`へopt-in optionを1つ追加する。

```text
--refresh-git-changed-files
```

- option未指定時のcollector挙動は変更しない。
- option指定時だけGit pathを再取得する。
- existing `changed_files`とunionする。
- `.codex/runs/**`を除外する。
- `run.json.status`は変更しない。
- report / evaluation summaryの既存再集約はそのまま行う。
- Git取得失敗はcollector failureとする。

### 6.4 collector wrapper

#### Bash

`scripts/collect-run-artifacts.sh`は既に`"$@"`をPythonへpass-throughしているため変更しない。

#### PowerShell

`scripts/collect-run-artifacts.ps1`へ`[switch]$RefreshGitChangedFiles`を追加し、指定時にPythonへ`--refresh-git-changed-files`を渡す。

既存CLI動作は維持する。

### 6.5 `codex-safe`終了時同期

PowerShell / Bash双方で以下の順序にする。

1. Codex processを通常どおり実行する。
2. Codex exit codeを退避する。
3. existing `run.json`がない場合はmanifest syncをskipする。
4. existing `run.json`がある場合はmanifest syncを開始する。
5. logging有効時は`manifest_sync_start`を既存harness logへ記録する。
6. collectorを`refresh-git-changed-files`付きで1回実行する。
7. success / failureを取得する。
8. logging有効時は`manifest_sync_success`または`manifest_sync_failed`を記録する。
9. failure時はstderrへ短いwarningを出す。
10. Codex exit codeが非0なら、そのcodeを最終exitとして返す。
11. Codex exit codeが0かつcollector failureならnonzeroを返す。
12. collector successまたは正常skipならCodex exit codeを返す。

manifestなしでskipする場合、logging有効時は`manifest_sync_skipped`と理由を記録する。

`--no-log` / `-NoLog`ではmanifest sync自体は省略しない。log eventだけ出さない。

### 6.6 PowerShell collector呼び出し方式

`codex-safe.ps1`から`scripts/collect-run-artifacts.ps1`を同一PowerShell process内でdot-source / direct script invocationしない。

現collector wrapperはfailure時に`exit $LASTEXITCODE`するため、親`codex-safe.ps1`がCodex exit codeとcollector exit codeの優先順位を判断できるよう、collectorはchild processとして起動する。

Windowsでは以下の既存前提を利用する。

```text
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/collect-run-artifacts.ps1 -RunId <run_id> -RefreshGitChangedFiles
```

child processのexit codeを`codex-safe.ps1`側で取得し、最終exitを決定する。

collector wrapper自体の`exit`契約は今回変更しない。

## 7. 実行タスク

- [ ] 1. active `run.json` instruction、`codex-safe` / `codex-task` / collector、既存contract testを確認し、Plan記載と現行実装が一致することを確認する。
- [ ] 2. `AGENTS.md`の4種類の曖昧表現を最小差分で修正し、`new-run` / `codex-task` / `codex-safe` / collectorの責務を明記する。
- [ ] 3. `codex-safe.ps1/sh`へRunId指定時のRun Directory preconditionを追加する。log path生成より前に判定し、存在しないRunIdでは何も作成しない。
- [ ] 4. `collect-run-artifacts.py`へ`--refresh-git-changed-files`を追加し、指定時だけcurrent working tree pathsを取得してexisting `changed_files`へunionする。
- [ ] 5. `collect-run-artifacts.ps1`へrefresh optionのpass-throughを追加する。`collect-run-artifacts.sh`は変更しない。
- [ ] 6. `codex-safe.ps1/sh`へexisting manifestだけを対象とする終了時sync、sync log、stderr warning、exit code優先順位を実装する。PowerShellはcollectorをchild process実行する。
- [ ] 7. `docs/reference/run-artifacts.md` / `docs/reference/codex-implementation-harness.md`を実装済みlifecycleと一致させる。`Stop` Hookがmanifest更新triggerではないことも明記する。
- [ ] 8. `tests/contracts/codex-run-manifest-contract.test.ts`をcollector refreshのcontract用に拡張し、`tests/contracts/codex-safe-run-manifest-sync.test.ts`を追加してwrapper lifecycleを固定する。
- [ ] 9. `scripts/verify` / `scripts/verify.ps1`へmachine-managed契約の最小positive checkを追加する。一般語を禁止する脆いnegative checkは追加しない。
- [ ] 10. targeted contract tests、Bash / PowerShell verify、Markdown lint、`git diff --check`を実行し、Hook / schema / Product codeへscopeが広がっていないことを確認する。

## 8. 検証方法

### 8.1 collector contract

`tests/contracts/codex-run-manifest-contract.test.ts`を拡張する。

確認項目:

- refresh option未指定では従来挙動を維持する。
- refresh指定時、existing `changed_files`を保持する。
- tracked changeを追加できる。
- untracked fileを追加できる。
- 重複排除する。
- `.codex/runs/**`を追加しない。
- `run.json.status`を変更しない。
- Git command failure時はcollector failureになる。
- v1 manifestを自動v2 migrationしない既存contractを維持する。

テストはtemporary Git repositoryまたは既存テストfixture方式を使用し、production codeへtest-only modeを追加しない。

### 8.2 `codex-safe` contract

`tests/contracts/codex-safe-run-manifest-sync.test.ts`を追加する。

既存のshim / temporary directory方式を使い、production codeへtest-only modeやtest-only output pathを追加しない。

確認項目:

- RunId未指定: 従来動作、manifest syncなし。
- RunIdあり + Run Directoryなし: Codex起動前fail、Run Directory / logsを作成しない。
- RunIdあり + Run Directoryあり + manifestなし: Codex実行、manifest sync正常skip、manifest新規作成なし。
- RunIdあり + existing manifestあり: Codex終了後にcollectorを1回呼ぶ。
- Codex nonzero + collector success: Codex exit codeを返す。
- Codex nonzero + collector failure: Codex exit codeを優先し、warning / logへsync failureを残す。
- Codex zero + collector failure: nonzeroを返す。
- `PreflightOnly` / `PrintCommand`: collectorを呼ばない。
- logging有効時: start / success / skipped / failedをharness logで確認できる。
- `--no-log` / `-NoLog`: log eventは作らないがmanifest syncは実行する。
- PowerShell / Bashで同じcontractを満たす。

### 8.3 Static verification

`scripts/verify` / `scripts/verify.ps1`で最低限以下を確認する。

- `AGENTS.md`にactual Runの`run.json` machine-managed契約がある。
- reference docsに`codex-safe` interactive終了時syncが記載されている。
- `Stop` HookをRun manifest update triggerとして説明していない。

Hook logger内容を今回のverify変更で再定義しない。

### 8.4 Manual smoke

利用可能な代表環境で以下を確認する。

1. 存在しないRunIdでCodex起動前にfailし、Run Directoryが作られない。
2. `new-run`でmanifestありRunを作る。
3. `codex-safe -RunId`相当で最小interactive sessionを実行し、安全な未commit変更を作る。
4. process終了後、Agentが`run.json`を直接編集せず`changed_files`が同期されている。
5. `run.json.status`がprocess exitだけを理由に`completed`へ変わっていない。
6. manifest-less Runでは`run.json`が新規作成されない。
7. `--no-log` / `-NoLog`でもmanifest syncされる。

環境上BashまたはCodex実機が使えない場合はSKIP理由を明記し、未実行をPASSと記録しない。

### 8.5 Repository validation

- 変更したcontract test。
- repository標準のBash / PowerShell verify。
- `pnpm run lint:markdown`。
- `git diff --check`。
- 必要に応じてcontract suite全体。

## 9. 成功判定

以下をすべて満たせば完了とする。

- actual Runの`run.json`をAgentが通常workflowで直接作成・編集するactive instructionが残っていない。
- new-run / codex-task / codex-safe / collectorの責務が一貫している。
- 不正RunIdで不完全なRun Directoryを作らない。
- interactive `codex-safe`終了時にexisting manifestだけが自動同期される。
- manifest-less Runを勝手にmanifest化しない。
- current working treeのtracked / untracked changesを`changed_files`へ累積反映できる。
- session HEAD / commit attributionを追加していない。
- collector default挙動とv1/v2 compatibilityを壊していない。
- Codex / collectorのexit semanticsがPowerShell / Bash双方で固定されている。
- `--no-log`がmanifest syncを無効化しない。
- `Stop` HookをRun完了triggerにしていない。
- Hook / schema / evaluation責務を変更していない。
- 関連tests / verify / Markdown / diff checkがPASSしている。

## 10. リスクと対策

### Risk 1: `Stop`とRun完了を混同する

- 対策: Hookは変更せず、manifest syncは`codex-safe` process lifecycle側だけで行う。`status=completed`は設定しない。

### Risk 2: 誤RunIdで不完全なRun Directoryを作る

- 対策: log path生成前にexisting Run Directoryを確認し、なければfailする。

### Risk 3: manifest-less Runを勝手にmanifest化する

- 対策: existing `run.json`がある場合だけcollectorを呼ぶ。

### Risk 4: 過去の`changed_files`を失う

- 対策: refreshはreplaceではなくexisting値とのunionにする。

### Risk 5: Git refresh失敗を成功扱いする

- 対策: refresh指定時のGit command failureはcollector failureにする。

### Risk 6: PowerShell collectorの`exit`が親wrapperを終了させる

- 対策: `codex-safe.ps1`からcollectorをchild processで実行し、exit codeを親で評価する。

### Risk 7: logging設定とsync責務が混ざる

- 対策: `--no-log` / `-NoLog`はlog eventだけを抑止し、manifest syncは継続する。

### Risk 8: scopeがRun lifecycle再設計へ広がる

- 対策: HEAD tracking / registry / correlation / schema変更 / Hook副作用 / new artifact chainをNon-goal・Stop conditionとして維持する。

## 11. 成果物

### 想定変更ファイル

- `AGENTS.md`
- `scripts/codex-safe.ps1`
- `scripts/codex-safe.sh`
- `scripts/collect-run-artifacts.py`
- `scripts/collect-run-artifacts.ps1`
- `docs/reference/run-artifacts.md`
- `docs/reference/codex-implementation-harness.md`
- `tests/contracts/codex-run-manifest-contract.test.ts`
- `tests/contracts/codex-safe-run-manifest-sync.test.ts`
- `scripts/verify`
- `scripts/verify.ps1`
- 本Plan

### 変更しないもの

- `scripts/collect-run-artifacts.sh`
- `.codex/config.toml`
- `.codex/hooks/log_event.mjs`
- manifest schema / template shape
- `codex-task`の既存manifest lifecycle
- Product code
- 過去Run / 過去Plan / history
