# Plan（計画）

## 0. 依頼概要

- 依頼内容: `main`で繰り返すPowerShellネイティブ終了コード契約テスト失敗と、定期CIのCodex成果物サニタイズ比較基準エラーを共通修正する。
- 背景: 個別PRへ回避策を入れず、`fix/ci-codex-contract-and-sanitization`から`main`向けの専用PRを作る。
- 期待成果: 原因を再現可能なEvidenceで説明し、既存契約を維持する修正と回帰テストを追加し、必須CIまで確認する。

## 1. ゴール / 完了条件

- ゴール: PowerShellの既定実行ファイルfixtureまたは共通実行経路の実原因を特定して修復し、PR・push・schedule・workflow_dispatchで安全に解決したcommit SHAをCodex成果物サニタイザーへ渡す。
- 完了条件（DoD）:
  - 正常・異常終了コード、スカラー戻り値、stdout/stderr、`CODEX_VERIFY_COMMAND`復元を維持する。
  - サニタイザーへ渡る基準は実在するcommit SHAで、空・不正・不存在・Git option風入力はfail-closedになる。
  - 成果物のblob/mode/path検査を維持し、Ubuntu・Windowsで対象テストを実行する。
  - 対象検証、標準gate、Run Artifact、専用branchへのcommit/push、`main`向けPRを完了する。Web CIとMobile App CIは最新PR HEADの結果だけを採用し、mergeしない。

## 2. 現状理解と前提

- 確認済み事実:
  - `git fetch origin`後、`origin/main`と作業branchのHEADは`2a8bcf57ff091e84a8b3bf7b123568e967000d88`で一致し、作業treeはclean。指定branchはローカルに既存し、GitHub上の同名branchとPRは見つかっていない。上書き・reset・削除はしない。
  - Web CI run `43767652826`は`event=schedule`。UbuntuとWindows両方でsanitizer unit testは成功し、`Check committed Codex artifacts`だけが`A safe base ref is required.`で失敗した。
  - 同runのPowerShellは空`EVENT_BEFORE`から`HEAD^`を選ぶ。sanitizerの`inspectCommitted()`は`^[A-Za-z0-9][A-Za-z0-9._/-]*$`を検査し、`^`を拒否する。この直接不整合は確認済み。
  - 同runの`Vitest (contracts)`は`.exe`既定fixtureの期待値0に対して、`RESULT_TYPE=System.Int32`、`RESULT_COUNT=1`、`RESULT_VALUE=1`を返した。既存CIログにNode `spawnSync`診断値はなく、ローカルでの直接起動はsandboxの`EPERM`に阻まれたため、子プロセスのstatusは未確認。環境変数復元は観測済み。失敗はmain上の既存コードで起きている。
  - mainの初回CIではLinux fixtureが`/bin/echo`を一時`verify-default.exe`へcopyし、実行bitを付与していた。共通経路は`Invoke-NativeCommand`経由。L2変更前はVitest suiteがUbuntuのみで、Windows固有fixtureはskipされていた。今回Windows jobにもsuiteを追加し、初回PR HEADではdefault executable経路が成功、別のreport-token assertionが失敗した。
  - 作業環境にはLinux版`pwsh`がなく、Windows PowerShell起動もWSL sandboxのSocket制約で失敗した。したがって実プロセスのexit status、PowerShell内の`$LASTEXITCODE` / `$?`、直接実行と関数経由の差は未確定。fixtureのローカル`spawnSync`観測も`EPERM`を伴うため環境内再現とは扱わない。
  - `scripts/new-run.sh`はCRLFのままのためBash直接実行で`set: pipefail\r`となる。内容を一時streamでLF化しrootを明示してstrict Runを初期化した。tracked script自体は変更しない。
  - global `pnpm 9.10.0`はlockfile checksum不一致でfrozen installできない。RepositoryとCIの指定版`pnpm@10.34.5`を`<TEMP_ROOT>`内のstoreで使用し、frozen installは完了した。依存setupでesbuildとunrs-resolverのinstall scriptが無効化された。
- PR #225の初回HEAD `1bf198f5c3e29794d5a6886705ce2da52a7613b9` のCIにより、以下を追加確認した。
  - Ubuntuの診断ではfixtureの実行bitがあり、Node直接起動とbash直接起動の両方が`status=1`、`signal=null`、`error=null`を返した。PowerShell直接起動、`Invoke-NativeCommand`、`Invoke-VerifyCommand`も整数1を保持し、`CODEX_VERIFY_COMMAND`は復元された。従って共通wrapperのスカラー変換ではなく、コピーした`/bin/echo` fixtureがCI上で1を返すことが最初の失敗原因。stderr本文は絶対path等を避けるため診断出力でredactされ、multi-call binaryのargv0依存など、そのfixtureが1を返す具体的なOS実装理由は未確定。
  - Windowsではdefault executableの終了コード契約は成功した。追加CI stepが検出したwrapper-report assertionはfixtureが一時directory内にあるため出力tokenが`<TEMP_ROOT>`となる実測と、`<REPO_ROOT>`のみを期待するテストの不整合だった。両方の固定tokenを許容し、fixture絶対pathが残らないことを維持する。
  - Ubuntu/Windowsのsanitizer PowerShell testは、fixtureがUSERPROFILEとして登録したhome pathに対して`<local-path-redacted>`だけを要求するassertionで失敗。Node実体検査でも登録済みpathが`<USER_HOME>`に置換されたfindingを再現。`<USER_HOME>`または`<local-path-redacted>`を許容し、実path/user情報の不在とexit 1を検証する。
- 前提:
  - 修正は指定branchだけに行う。既存PR #221〜#224、製品コード、他PR内容、repository設定は変更しない。
  - sanitizerの厳格なbase-ref検証、Git tree/blobの実体検査、絶対path検知は維持する。
  - `.github/workflows/ci.yml`の実行手順を変更する場合はAGENTS.md §8のL2に該当する。ユーザーからevent base SHA解決とWindows native-command test追加の明示承認を受領済み。
- 対象外: PR固有のExpo依存更新、security fallback、Dependabot、Scenario Shop製品修正、認証・permission・sandbox・approval・wrapper動作、merge、force push、repository設定変更。

## 3. 質問 / 曖昧性

- 承認済み: ユーザーはL2 workflow変更（イベント別比較元を`git rev-parse --verify --end-of-options`でcommit SHAへ解決する変更、およびWindows jobへのnative-command contract step追加）を明示承認した。
- 比較元の扱い: PRは`origin/<base_ref>`、pushは実在する`event.before` SHAを使い、pushの空・zero SHAはfail-closedにする。schedule/workflow_dispatchは`HEAD^1`を候補とし、すべて実在commit SHAへ解決してからsanitizerへ渡す。
- 未回答の重要質問: なし。

## 4. 影響範囲

- 影響範囲: `codex-task` PowerShell native-command契約、Codex artifact sanitizerのCI比較基準選択とイベント契約。
- 確認対象ファイル:
  - `tests/contracts/codex-task-native-command.test.ts`
  - `scripts/codex-task.ps1`
  - `.github/workflows/ci.yml`（L2承認後のみ）
  - `tests/contracts/ci-workflow.test.ts`
  - `tests/contracts/codex-artifact-sanitization.test.ts`
  - `scripts/lib/codex-artifact-sanitizer.mjs`
  - `scripts/sanitize-codex-artifacts.mjs`
  - `scripts/tests/codex-artifact-sanitizer.test.ps1`
  - 必要なRepository Planと`.codex/runs/20261117-000515-JST/**`

## 5. 変更方針

- 変更方針:
  1. PowerShell失敗をOS適合fixture、実行可能bit、Node `spawnSync`の`status/signal/error/stdout/stderr`、PowerShell直接起動、共通関数経由、`$LASTEXITCODE` / `$?`で切り分ける。原因がfixtureならfixtureのみ、実装なら共通経路の呼び出し元を確認してから最小修正する。
  2. 承認済みworkflowでイベントごとの候補比較基準を検証し、実在commitへの解決後にSHA形式も確認してsanitizerへ渡す。不足履歴、不正event/base、不存在commitは非0終了にする。sanitizer側の検証は緩和しない。
  3. schedule相当を含むPR/push/schedule/workflow_dispatchの有効・無効入力テストを追加する。Windows CIでもPowerShell native-command suiteを実行し、OS別の`.ps1` / `.cmd` / `.bat` / `.sh` / executable / command-text経路を確認する。
  4. ユーザー指定の対象テストと全標準gateを実行し、差分とRun Artifactを確認する。
  5. 承認済みの専用branchへcommit/pushし、`main`向けPRを作る。CI待機はRepository標準waiterを探して使う。利用できない場合はagent pollingへ置換せず未確認として停止する。
- 実行タスク:
  - [x] PowerShell native failureを実runnerで診断し、fixture自身の終了コード1と共通wrapperの正常なscalar伝播を切り分ける。
  - [x] Sanitizerの全event基準決定をSHA解決へ修正する（L2承認後）。
  - [ ] 必要な回帰テストを追加し、Ubuntu / Windowsの対象経路を検証する。
  - [ ] 指定gate、Run Artifact sanitization、diff scopeを検証する。
  - [ ] 修正を専用branchへpushし、PRと新しいheadのWeb / Mobile CIを確認する。

## 6. 検証方法

- 検証計画:
  - `corepack pnpm@10.34.5 install --frozen-lockfile --store-dir .pnpm-store`
  - `pnpm exec vitest run tests/contracts/codex-task-native-command.test.ts --no-file-parallelism --maxWorkers=1 --testTimeout=30000`
  - `pnpm run test:contracts`
  - `./scripts/tests/codex-artifact-sanitizer.test.ps1`
  - `pnpm run format:check:strict`、`pnpm run lint`、`pnpm run typecheck`、`bash scripts/verify`、`pnpm run verify`、`git diff --check`
  - CI: `Vitest (contracts)`、Ubuntu/Windows sanitizer、verify、validate、Mobile App CI。schedule相当の比較選択をテストし、実際の定期runを起動していない場合は未実施として記録する。
- 成功判定: 各入力で実際に比較対象commitを確定してsanitizerがGit objectを検査し、無効入力または比較不能時は非0終了する。最新PR HEADのWeb CIとMobile App CIのみを完了証拠にする。

## 7. リスクと未解決論点

- リスク: workflow変更は承認済みL2範囲に限定する。PowerShell原因が未確定のまま共通関数を変更するとhost/docker共通経路へ影響する。sandboxでは実PowerShell起動が制約される。
- CI待機: Repository標準の`wait_for_required_ci`はPR #225の初回HEADに一度使用済み。Web CIは失敗、Mobile App CIは成功。修正commitのpush後に新しいHEADで同じ標準waiterを使用する。

## 8. 成果物

- 変更ファイル: 原因と承認に応じた上記対象ファイルのみ。
- 付随ドキュメント: 本Plan、strict Runの`PLAN.md` / `TASKS.md` / append-only `REPORT.md`。`run.json`はcollector経由で更新する。

## 9. 備考

- 調査開始時のmain/branch HEAD: `2a8bcf57ff091e84a8b3bf7b123568e967000d88`。
- Run ID: `20261117-000515-JST`。
- L2承認を受領したためworkflow修正を実施する。PowerShell診断は原因を切り分けるまで継続する。

## 10. PR #225 レビュー修復計画（2026-11-17）

- 指摘: PRイベントの候補`origin/<base>`は短縮参照名であり、`refs/tags/origin/<base>`が同時に存在すると、`git rev-parse`がリモート追跡ブランチではなくタグを解決し得る。
- 仕様確認: Git公式`gitrevisions`は曖昧な短縮名の解決順で`refs/tags/<name>`を`refs/remotes/<name>`より先に列挙する。sanitizer jobは固定版`actions/checkout` v5.0.0を`fetch-depth: 0`で実行し、checkout公式READMEはこの設定が全branchとtagを取得すると説明している。したがってCI上で衝突fixtureの状態は成立し得る。
- 調査根拠: 一時Git repositoryで`refs/remotes/origin/main`をCommit A、`refs/tags/origin/main`をCommit Bへ設定したところ、短縮名はB、`refs/remotes/origin/main`はAへ解決した。危険な成果物を含むBをHEADにすると、Bを比較元にした実サニタイザーはexit 0、Aを比較元にすると成果物を検出してexit 1となった。タグだけのfixtureでは短縮名が解決し、完全修飾したremote-tracking refは解決に失敗した。
- L2承認: 既存の明示承認は、同じworkflow内で全イベント候補を実在commit SHAへfail-closed解決する処理を対象としている。今回の変更はその承認範囲内でPR候補を完全修飾し、イベント処理構造・権限・実行stepは追加変更しない。
- 許可ファイル: `.github/workflows/ci.yml`、`scripts/tests/codex-artifact-sanitizer.test.ps1`、必要時のみ`tests/contracts/codex-artifact-sanitization.test.ts`、このPlan、既存Run Artifact。
- 実装: `origin/<base>`を`refs/remotes/origin/<base>`へ変更し、既存の空値・branch-format・rev-parse・commit SHA検証とfail-closed動作を保つ。実workflowから抽出する既存PowerShell fixtureに、同名タグ衝突でunsafe artifactが実際に拒否されるケース、remote-tracking branchなしで同名タグのみが存在しても拒否されるケースを追加する。
- 検証: PowerShell sanitizer suiteとfocused Vitest、既存の標準gateを実行する。PowerShellがローカルで利用できない場合は未実施として記録し、最新PR HEADのUbuntu/Windows CI結果で補完する。PR #225のみ更新し、main・他PR・repository設定は変更せず、mergeしない。
