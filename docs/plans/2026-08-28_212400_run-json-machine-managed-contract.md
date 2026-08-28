# run.json machine-managed・interactive自動同期計画

## 0. 依頼概要

- 依頼内容:
  - 通常のCodex Runにおける`.codex/runs/<run_id>/run.json`をmachine-managed artifactとして統一する。
  - `AGENTS.md`等に残る、Agentによるactual Runの`run.json`手動作成・直接編集を許容または示唆するactive instructionを除去する。
  - 非対話の`codex-task`だけでなく、interactiveの`codex-safe`でもCodex process終了時に既存`run.json`を自動同期し、通常運用で手編集を不要にする。
- 背景:
  - `new-run.ps1/sh`は新規Runの`run.json`を生成できる。
  - `codex-task.ps1/sh`は`--record-run-manifest`経路で`run.json`を自動更新する。
  - `collect-run-artifacts.py`はrun-local report / `evaluation.json`を再集約できるが、interactive終了時のGit変更を`changed_files`へ再取得しない。
  - `codex-safe.ps1/sh`は`RunId`を受け取れるが、process終了時にmanifestを同期しない。
  - `Stop` Hookはsession event観測用であり、Run完了triggerではない。
- 期待成果:
  - 通常workflowの新規生成=`new-run`、非対話更新=`codex-task`、interactive終了時更新=`codex-safe` + collectorという責務を固定する。
  - actual Runの`run.json`をAgentが直接編集しなくてよい通常運用にする。
  - Hook / schema / evaluation責務を広げずに実現する。

## 1. ゴール / 完了条件

- ゴール:
  - `.codex/runs/<run_id>/run.json`をmachine-managed aggregate manifestとして固定し、interactive Runでも既存の機械経路だけで同期できる状態にする。
- 完了条件（DoD）:
  - actual Runの`run.json`をAgentが通常workflowで直接作成・直接編集しない契約が`AGENTS.md`とreference docsで明確になっている。
  - 通常workflowで新規manifestが必要な場合は`new-run.ps1/sh`を正規生成経路とし、非対話更新は既存`codex-task --record-run-manifest`を使用する。collector単体の既存fallback生成能力は変更しない。
  - `codex-safe`は`RunId`指定時、対象Run Directoryが存在しなければlog directory等を作る前にfailする。
  - Run Directoryが存在しても`run.json`がなければmanifest-less RunとしてCodexは実行し、manifest同期だけskipする。
  - existing `run.json`がある場合だけ、interactive Codex process終了後にcollectorを1回実行して同期する。
  - sync時、既存`changed_files`はcleanupせず保持し、今回Gitから新規観測したtracked / untracked pathsだけに`.codex/runs/**`除外を適用して累積反映する。
  - interactive process終了や`Stop`だけを根拠に`status=completed`へ変更しない。
  - Codex nonzero時はCodex exit codeを優先する。Codex zeroかつcollector nonzero時はcollector exit codeを返す。
  - Bash版は`set -euo pipefail`下でもcollector nonzeroを明示的に捕捉し、sync failure log / warning / final exit判定まで継続する。
  - `--no-log` / `-NoLog`でもmanifest同期は実行し、loggingだけ抑止する。
  - PowerShell / Bashで同じ外部契約を満たす。
  - manifest schema / template shape、`codex-task`既存writer、Hook、evaluation責務を変更しない。
  - targeted tests、verify、Markdown lint、diff checkがPASSする。利用不能runtimeは理由を明示してSKIPする。

## 2. 現状理解と前提

### Current understanding

- `new-run.ps1/sh`は新規Runの`run.json`を生成できる。
- `codex-task.ps1/sh`は`--record-run-manifest`指定時に複数checkpointで`run.json`を更新する。
- `collect-run-artifacts.py`はexisting manifestを読み、run-local report / `evaluation.json`を再集約する。
- collectorは現在existing `changed_files`を保持するだけで、working treeから再計算しない。
- collector単体はmanifest不存在時にtemplateから新規manifestを生成できるため、`codex-safe`側でexisting manifest guardが必要である。
- `codex-safe.ps1/sh`は`RunId`をlog path等に利用するが、現在はprocess終了後にmanifestを同期しない。
- 現在の`codex-safe`は存在しない`RunId`でも`.codex/runs/<run_id>/logs`を作成できる余地がある。
- Bash版`codex-safe.sh`は`set -euo pipefail`を使用し、Codex実行では既にexit codeを明示的に捕捉してから最終exitを決定している。
- `Stop` / `SubagentStop` Hookはsession / subagent eventの観測用で、Run完了やsuccess / failureを推測しない。
- `AGENTS.md`には次の4種類の曖昧表現が残っている。
  1. lightweightのrun artifactを「手動作成してよい」が`run.json`まで含むように読める。
  2. `RUN_MANIFEST.json`からAgentがactual `run.json`を直接作成できるように読める。
  3. 同一Run継続時にAgentが`run.json`を直接更新すると読める。
  4. 「Git操作禁止でもRun Artifactの作成・更新は通常のファイル編集として実施する」が`run.json`まで含むように読める。

### Assumptions

- collectorからrepository rootのGit状態を読み取れる。
- `run.json` schema v2のfield追加なしでexisting `changed_files`へ同期できる。
- interactive process exitとRun完了は別概念であり、status更新を追加しなくても目的を達成できる。
- Windowsの対象実行環境では`powershell.exe`が利用できる。実装前確認で成立しない場合はruntime abstractionを追加せずStop conditionとして再判断する。
- session開始前からdirtyだったfileが終了時working treeに残っている場合、今回の`changed_files` refreshに含まれることを許容する。

### Non-goals

- session開始HEAD / 終了HEADやcommit historyを用いた変更帰属。
- session中commitされたfileの厳密なRun帰属。
- pre-existing dirty fileのsession単位の厳密帰属。
- content hash snapshot / worktree snapshot。
- `Stop` / `SubagentStop` Hookからcollectorを実行すること。
- Hook JSONLを`run.json`へ集約すること。
- HookとRunの完全correlation、`CODEX_RUN_ID`伝播、active-run registry、DB、daemon。
- schema version変更、manifest field追加、v1→v2 migration utility。
- `evaluation.json`の自動評価化・machine-managed化。
- `PLAN.md` / `TASKS.md` / `REPORT.md`のmachine-managed化。
- `run.json`を全workflowで必須化すること。
- `codex-safe`へverify / evaluation gate等`codex-task` full workflowを移植すること。
- contract testのためだけのDocker、shell emulator、cross-platform execution基盤。
- Product code、ECサイト仕様、カリキュラム本体の変更。

## 3. 質問 / 曖昧性

- 必ず質問する不透明点:
  - なし。
- 仮定してよい細部:
  - Git path normalizationはrepository-relative `/` 区切りとする。
  - manifest sync eventは既存`codex-safe` harness logへ記録し、新規artifactは作らない。
- 未回答の重要質問:
  - なし。

### Stop conditions

以下が必要になった場合は本タスクを拡張せず停止し、別taskとして再設計する。

- manifest schema / field変更。
- session HEAD / commit history追跡やsnapshot方式。
- HookからRunIdを解決する仕組み。
- Run correlation基盤 / registry。
- `codex-safe`のfull workflow runner化。
- Windows対象環境で`powershell.exe`が利用できず、新しいruntime detection / abstractionが必要になる場合。
- PowerShell / Bash contract確認のためだけに新しいcross-platform test infrastructureが必要になる場合。

## 4. 影響範囲

### Impacted areas

- Run Artifact運用契約。
- `codex-safe` interactive lifecycle。
- collectorのoptional Git changed files refresh。
- PowerShell collector wrapperのoption pass-through。
- Run manifest contract tests / wrapper lifecycle tests。
- active reference docs / static verify。

### Files to inspect

#### 変更対象

- `AGENTS.md`
- `scripts/codex-safe.ps1`
- `scripts/codex-safe.sh`
- `scripts/collect-run-artifacts.py`
- `scripts/collect-run-artifacts.ps1`
- `docs/reference/run-artifacts.md`
- `docs/reference/codex-implementation-harness.md`
- `tests/contracts/codex-run-manifest-contract.test.ts`
- `tests/contracts/codex-safe-run-manifest-sync.test.ts`（新規）
- `scripts/verify`
- `scripts/verify.ps1`

#### 確認のみ

- `scripts/collect-run-artifacts.sh`
  - 既に`"$@"`をPythonへpass-throughしているためproduction変更しない。
- `.codex/templates/RUN_MANIFEST.json`
- `scripts/new-run.ps1`
- `scripts/new-run.sh`
- `scripts/codex-task.ps1`
- `scripts/codex-task.sh`
- `.codex/config.toml`
- `.codex/hooks/log_event.mjs`
- `.agents/skills/**`のactive Run Artifact instruction
- `docs/guides/**` / `docs/reference/**`のactive `run.json` guidance

#### 変更しない

- manifest schema / template shape。
- `codex-task`既存manifest lifecycle。
- Hook logger / Hook config / Safety Hook。
- 過去`.codex/runs/**`、過去Plan / history。
- Product code。

## 5. 変更方針

### Change strategy

#### 5.1 machine-managed契約

`AGENTS.md`とreference docsを次の責務へ統一する。

- actual Runの`run.json`はAgentが直接作成・直接編集しない。
- 通常workflowで新規manifestが必要な場合は`new-run`を正規生成経路とする。
- collector単体の既存fallback生成能力は変更しない。ただし`codex-safe`はmanifest-less Runに対してcollectorを呼ばない。
- 非対話更新は`codex-task`が行う。
- interactive更新は`codex-safe -RunId`終了時にcollectorを利用して行う。
- 明示的な再集約はcollectorを使用する。
- `PLAN.md` / `TASKS.md` / `REPORT.md` / `evaluation.json`のAgent-managed責務と区別する。
- test fixtureやmanifest writer / collector自身の実装・テストは直接編集禁止対象に含めない。

#### 5.2 `codex-safe` RunId precondition

PowerShell / Bash双方でlog path生成前に判定する。

- `RunId`なし: 従来動作、manifest syncなし。
- `RunId`あり + Run Directoryなし: Codex起動前にfailし、Run Directory / logsを作らない。
- `RunId`あり + Run Directoryあり + `run.json`なし: Codex実行、process終了後syncはskip。manifest理由は推測しない。
- `RunId`あり + existing `run.json`あり: Codex実行、process終了後sync。
- `PreflightOnly` / `PrintCommand`: Codex processを実行しないためsyncしない。

#### 5.3 collectorのoptional refresh

`collect-run-artifacts.py`へ次のoptionだけを追加する。

```text
--refresh-git-changed-files
```

option未指定時のcollector挙動は変更しない。

refresh指定時はrepository rootで以下を実行する。

```text
git diff --name-only --relative -z HEAD --
git ls-files --others --exclude-standard -z
```

- subprocess outputはbinaryで受け、NUL (`\0`) 分割する。
- path文字列化はPython filesystem decoding（例: `os.fsdecode`）を使用する。
- repository-relative `/` 区切りへnormalizeする。
- `.codex/runs/**`除外は、今回Gitから新規観測したtracked / untracked pathにのみ適用する。
- existing `run.json.changed_files`は削除・cleanup・再分類せず、そのまま保持して新規観測pathとunionし、重複排除する。existing値に`.codex/runs/**`が含まれていても今回のrefreshでは削除しない。
- status種別 / session attribution metadataは追加しない。
- `run.json.status`は変更しない。
- Git command起動失敗またはnonzero終了はcollector failureとする。
- report / evaluation summaryの既存再集約は維持する。

#### 5.4 collector wrapper

- Bash `collect-run-artifacts.sh`は変更しない。
- PowerShell `collect-run-artifacts.ps1`へ`[switch]$RefreshGitChangedFiles`を追加し、指定時だけPythonへ`--refresh-git-changed-files`を渡す。
- collector wrapper自体の既存exit契約は変更しない。

#### 5.5 `codex-safe`終了時sync / exit semantics

Codex process終了後に次の順序で処理する。

1. Codex exit codeを保存する。
2. existing `run.json`がなければsync skip。
3. existing `run.json`があればcollectorをrefresh付きで1回実行する。
4. logging有効時は`manifest_sync_start` / `manifest_sync_success` / `manifest_sync_skipped` / `manifest_sync_failed`を既存harness logへ記録する。
5. sync failure時はstderrへ短いwarningを出す。
6. `--no-log` / `-NoLog`でもsync自体は実行する。
7. Codex exit codeが非0ならCodex exit codeを返す。
8. Codex exit codeが0かつcollector exit codeが非0ならcollector exit codeを返す。
9. collector child process自体を起動できなければcollector failure=`1`として扱う。
10. successまたは正常skipならCodex exit codeを返す。

collector wrapperの呼び出しpathはcurrent working directoryに依存させず、`codex-safe`が解決済みのrepository rootからabsolute pathを構築する。

- PowerShell:
  - `$collectorPath = Join-Path $repoRoot "scripts\\collect-run-artifacts.ps1"`のようにabsolute pathを作る。
  - `collect-run-artifacts.ps1`を同一process内でdirect invocation / dot-sourceせず、child processとして起動する。

```text
powershell.exe -NoProfile -ExecutionPolicy Bypass -File <absolute-repo-root>\scripts\collect-run-artifacts.ps1 -RunId <run_id> -RefreshGitChangedFiles
```

- Bash:
  - `bash "$repo_root/scripts/collect-run-artifacts.sh"`でabsolute pathのwrapperを明示的にBash実行する。
  - `codex-safe.sh`は`set -euo pipefail`のため、collectorは裸のcommandとして実行せず`if ...; then/else`内で実行し、nonzeroでもwrapperを即時終了させず`collector_exit`へ保存する。

```bash
if bash "$repo_root/scripts/collect-run-artifacts.sh" --run-id "$run_id" --refresh-git-changed-files; then
  collector_exit=0
else
  collector_exit=$?
fi
```

collector failure後も`manifest_sync_failed`、stderr warning、Codex / collector exit codeの優先順位判定まで必ず継続する。collector failure捕捉だけを目的に新しいhelperや例外基盤は追加しない。

これにより、`codex-safe`をrepository配下のサブディレクトリから起動した場合でもcollector path解決をcurrent working directoryへ依存させず、PowerShell / Bash双方でcollector failureを親wrapperが評価できる状態を維持する。

### 実行タスク

- [ ] 1. active instruction、`codex-safe` / `codex-task` / collector、既存contract testを確認し、Plan前提との差異がないことを確認する。
- [ ] 2. `AGENTS.md`の4種類の曖昧表現を最小差分で修正する。
- [ ] 3. `codex-safe.ps1/sh`へRun Directory preconditionを追加する。
- [ ] 4. `collect-run-artifacts.py`へoptional working tree refreshを追加する。
- [ ] 5. `collect-run-artifacts.ps1`へrefresh option pass-throughを追加する。Bash collector wrapperは変更しない。
- [ ] 6. `codex-safe.ps1/sh`へexisting manifestだけを対象とする終了時sync、absolute collector path解決、collector failure捕捉、logging、warning、exit semanticsを実装する。
- [ ] 7. `run-artifacts.md` / `codex-implementation-harness.md`を実装済みlifecycleと一致させる。
- [ ] 8. collector / `codex-safe` contract testを追加・更新する。
- [ ] 9. Bash / PowerShell verifyへ必要最小限のpositive checkを追加する。
- [ ] 10. targeted tests、利用可能なverify、Markdown lint、`git diff --check`を実行し、Non-goalへscopeが広がっていないことを確認する。

## 6. 検証方法

### Validation plan

#### collector contract

`tests/contracts/codex-run-manifest-contract.test.ts`を拡張する。

- option未指定時の従来挙動。
- existing `changed_files`保持。
- existing `changed_files`に`.codex/runs/**`が含まれていてもcleanupせず保持する。
- tracked / untracked path追加。
- 新規Git観測pathの`.codex/runs/**`は追加しない。
- 日本語・空白を含むpathをactual repository-relative pathで保持。
- 重複排除。
- `run.json.status`非変更。
- Git command failure時のcollector failure。
- v1を自動v2 migrationしない既存contract維持。

actual repositoryのworking treeはテスト用に汚さない。temporary Git repositoryまたは既存の安全なfixture方式を使用し、production codeへtest-only optionを追加しない。

#### `codex-safe` contract

`tests/contracts/codex-safe-run-manifest-sync.test.ts`を追加する。

- RunId未指定: syncなし。
- RunIdあり + Run Directoryなし: Codex起動前fail、directory非作成。
- Run Directoryあり + manifestなし: Codex実行、sync skip、manifest非作成。
- existing manifestあり: process終了後collector 1回。
- repository配下のサブディレクトリをcurrent working directoryとして`codex-safe`を起動しても、absolute collector pathでsyncできる。
- Bash collector nonzero時、`set -e`で途中終了せず`manifest_sync_failed` / warning / final exit判定まで到達する。
- Codex nonzero + collector success/failure: Codex exit code優先。
- Codex zero + collector failure: collector exit code。
- collector child process起動失敗: Codex zeroなら1、Codex nonzeroならCodex exit code。
- `PreflightOnly` / `PrintCommand`: syncなし。
- logging有効時のsync event。
- `--no-log` / `-NoLog`でもsync実行。

runtime依存caseは利用可能shellだけ実行する。

- Bash contractはBash利用可能環境で実行。
- PowerShell contractはPowerShell / Windows利用可能環境で実行。
- runtimeが利用できないcaseは理由を明示してSKIPする。
- 利用不能shell再現だけのDocker / emulator / runtime追加は行わない。
- production codeへtest-only hook / output pathを追加しない。

#### Static verification

`scripts/verify` / `scripts/verify.ps1`へ脆くならない範囲のpositive checkだけ追加する。

- `AGENTS.md`のactual Run `run.json` machine-managed契約。
- reference docsのinteractive終了時sync。
- `Stop` Hookをmanifest更新triggerとして説明していないこと。
- Bash / PowerShell双方のRun Directory precondition / existing manifest guard / sync経路。

一般語を禁止するnegative checkやHook logger契約の再定義は行わない。

#### Manual smoke / repository validation

- 存在しないRunIdでCodex起動前failし、Run Directoryを作らない。
- manifestありRunでinteractive終了後に`changed_files`を同期する。
- repository配下のサブディレクトリから起動してもcollector syncできる。
- Bashでcollector failureが発生してもsync failureの記録・warning・final exit判定まで継続する。
- process exitだけで`status=completed`へ変えない。
- manifest-less Runで`run.json`を生成しない。
- `--no-log` / `-NoLog`でもsyncする。
- `pnpm run lint:markdown`。
- `git diff --check`。
- repository標準の利用可能なBash / PowerShell verify。
- targeted contract tests。必要な場合のみcontract suite全体。

利用不能runtime / Codex実機はSKIP理由を明示し、未実行をPASSと記録しない。

### 成功判定

- actual Runの`run.json`直接作成・編集を促すactive instructionが残っていない。
- new-run / codex-task / codex-safe / collectorの責務が一貫している。
- 通常workflowの新規manifest生成は`new-run`を正規経路とし、collectorの既存fallback生成能力は壊していない。
- 不正RunIdで不完全なRun Directoryを作らない。
- existing manifestだけがinteractive終了時に自動同期される。
- collector path解決がcurrent working directoryに依存しない。
- Bashの`set -euo pipefail`下でもcollector failureを捕捉し、sync failure handlingとexit code優先順位を維持できる。
- existing `changed_files`をcleanupせず保持し、新規Git観測pathだけに`.codex/runs/**`除外を適用できる。
- tracked / untracked / 日本語・空白pathを`changed_files`へ安全に累積できる。
- collector default挙動とv1/v2 compatibilityを壊していない。
- Codex / collector exit semanticsがPowerShell / Bashで一致する。
- `--no-log`がsyncを無効化しない。
- `Stop` Hook、schema、evaluation責務を変更していない。
- 新しいruntime / correlation / attribution基盤を導入していない。
- 実行したtests / verify / lint / diff checkがPASSし、未実行項目はSKIP理由がある。

## 7. リスクと未解決論点

### Risks

- `Stop`とRun完了を混同する。
  - 対策: Hookは変更せず、syncは`codex-safe` process lifecycle側だけで行う。
- 誤RunIdで不完全なRun Directoryを作る。
  - 対策: log path生成前にexisting Run Directoryを必須確認する。
- manifest-less Runを勝手にmanifest化する。
  - 対策: existing `run.json`がある場合だけcollectorを呼ぶ。collector単体の既存fallback生成能力は変更しない。
- collector pathがcurrent working directoryに依存してsyncできない。
  - 対策: repository rootからabsolute collector pathを構築し、サブディレクトリ起動contractで固定する。
- Bashの`set -e`でcollector nonzero時にwrapperが途中終了する。
  - 対策: collectorを`if ...; then/else`内で実行してexit codeを捕捉し、failure log / warning / final exit判定まで継続する。
- `changed_files` refreshの除外処理でexisting値までcleanupしてしまう。
  - 対策: `.codex/runs/**`除外は新規Git観測pathだけに適用し、existing `changed_files`はそのまま保持してunionする。
- `changed_files`を失う / Git path quotingで壊す。
  - 対策: existing値とのunion、`-z` binary output、NUL分割、filesystem decodingを使用する。
- Git refresh失敗を成功扱いする。
  - 対策: refresh時のGit command failureをcollector failureにする。
- PowerShell collectorの`exit`で親wrapperが終了する。
  - 対策: collectorをchild process実行し、親でexit codeを評価する。
- logging設定とsync責務が混ざる。
  - 対策: NoLogはlog eventだけ抑止し、syncは継続する。
- testのためにscopeが広がる。
  - 対策: 利用可能runtimeのみ実行し、追加test infrastructureを作らない。

### Open questions

- なし。
- Assumptions / Stop conditionsが崩れた場合だけ本Planを止めて再判断する。

## 8. 成果物

- 変更ファイル:
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
- 付随ドキュメント:
  - 本Planのみ。
- 変更しないもの:
  - `scripts/collect-run-artifacts.sh`
  - `.codex/config.toml`
  - `.codex/hooks/log_event.mjs`
  - manifest schema / template shape
  - `codex-task`既存manifest lifecycle
  - collector単体の既存manifest fallback生成能力
  - Product code
  - 過去Run / 過去Plan / history

## 9. 備考

### Follow-up notes

- 今回の目的は、interactive Runにも既存machine-managed思想を適用し、actual `run.json`の手編集を不要にすることである。
- 通常workflowの新規manifest生成は`new-run`を正規経路とするが、collector単体の既存fallback生成能力そのものは今回変更しない。
- `Stop` Hookは低レベル観測のまま維持し、Run manifest更新triggerにはしない。
- session中commitまで含む厳密な変更帰属が将来必要になった場合は、本件へ追加せずRun-level attributionの別taskとして扱う。
- 本Planの実装でAssumptions / Stop conditionsが成立する限り、registry / correlation / schema変更等へscopeを広げない。