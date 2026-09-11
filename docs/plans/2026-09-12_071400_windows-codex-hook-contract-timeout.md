# Windows環境のCodex Hook contract timeout解消 計画

## 0. 依頼概要

- 対象: Issue #142「Windows環境でCodex Hook contractがtimeoutする問題を解消する」
- 統合元: Issue #140「test: Windows launcherのcontract testが5秒timeoutになる原因を調査する」
- 背景: Windowsローカルで`tests/contracts/codex-hook-contract.test.ts`のtimeoutが複数PRで断続的に発生している。Issue #140の5秒timeout 2件だけでなく、15秒のHook matrix timeoutや、`test:contracts`単体では成功して`verify`内だけtimeoutする記録もある。
- 統合方針: Issue #140の調査内容はIssue #142へ統合する。`issue-140-windows-launcher-timeout` branchと#140 Planは履歴参照に限定し、実装・検証・PRは`fix/windows-codex-hook-contract-timeout`へ一本化する。
- 期待成果: Windowsで再現したHook contract timeoutの発生条件と原因を実測で特定し、既存Hook policy、fail-closed、allow / deny、Windows transport契約を維持したまま、同じ実行条件で再発しない状態にする。

基準:

```text
canonical issue: #142
integrated issue: #140
base branch: main
Plan作成時 base SHA: 12fff8eafccef4ab939efec623ac8a8d4f1ac539
implementation branch: fix/windows-codex-hook-contract-timeout
#140 reference branch: issue-140-windows-launcher-timeout
```

このPlanでは実装しない。実装開始時は、対象branch HEAD、最新`main` HEAD、merge base、`main...branch`差分、およびIssue #142作成後に入ったHook関連変更を再確認してから編集する。

## 1. ゴールと完了条件

### ゴール

WindowsローカルでCodex Hook contractがtimeoutする原因を実測で特定し、Issue #140で確認された5秒timeout 2件を含む既存のWindows Hook contract timeoutを、必要最小限の修正で安定して完走できるようにする。

#140、PR #133、過去PRで観測されたtimeoutがすべて同一原因であることは事前に仮定しない。次の要因は複数同時に成立し得るものとして切り分ける。

- 1 test内の複数subprocess起動の累積
- launcher 1回の異常な待機
- Hook内部のGit context取得
- configured Windows経路のshell / Git / PowerShell起動
- fixture作成 / cleanup
- file単体、full contracts、`pnpm run test`、`pnpm run verify`の実行条件差
- Windowsのprocess起動・scheduler・filesystem等のばらつき

### 完了条件

- Issue #140の次の過去値と現在の再現結果を区別して記録している。
  - `preserves safe and deny semantics through the Windows launcher from root and nested cwd`: `5569ms` / 実効timeout `5000ms`
  - `keeps quote, backslash, LF, and CRLF stdin semantics through the launcher`: `5071ms` / 実効timeout `5000ms`
- PR #102 / #113 / #114 / #127の既存timeout記録を再発履歴として整理し、今回の再現条件と照合している。
- #140の2件、Hook matrix timeout、その他launcher timeoutが共通原因か別原因かを、確認できた範囲で説明できる。共通原因を確認できない場合は無理に統一しない。
- Windowsで再現したtimeoutについて、どのtest、subprocess、Git処理、fixture、process lifecycle、またはsuite条件が所要時間へ寄与したか説明できる。
- Node、pnpm、`powershell.exe`、`pwsh.exe`、`git`のpath / versionと、launcher内部で`Get-Command node`が解決するNode pathを記録している。`pwsh.exe`等が存在しない場合はtimeoutではなく環境前提の不足として分離して記録する。
- `tests/contracts/codex-hook-contract.test.ts`のpolicy case数、policy ID集合、allow / deny、malformed input、fail-closed検証を削減・弱体化していない。
- `.codex/hooks/pre_tool_use_policy.mjs`のpolicy semanticsを変更していない。変更が必要な場合も、性能改善だけを理由に判定を緩めていない。
- `.codex/hooks/pre_tool_use_policy_windows.ps1`を変更する場合は、stdin / stdout / stderr、Node exit code、timeout時の停止、fail-closedのtransport契約を維持している。
- 修正前にtimeoutを再現した実行経路を、修正後に同じ条件で再実行して成功している。
- Windowsで対象Hook contract fileを3回連続で実行して成功する。
- Windowsで`pnpm run test:contracts`を3回連続で実行して成功する。
- `pnpm run test`でのみ、または`pnpm run test`でも再現した場合は、修正後に同じ経路を2回連続で実行して成功する。
- `pnpm run verify`でのみ、または`pnpm run verify`でも再現した場合は、修正後にcontractまで到達する`pnpm run verify`を2回連続で実行して成功する。`verify`以外でしか再現しなかった場合でも、最終`pnpm run verify`を1回成功させる。
- `verify`が`test:contracts`到達前に停止したrunは、Windows launcher testをPASS / FAILへ数えず「未実行」と記録する。
- GitHub Actions Web CIの`Vitest (contracts)`が成功する。
- Windowsでしか検出できない回帰を今回修正する場合は、変更ファイルがproductionかtest-onlyかにかかわらず、focused Windows CIを継続検証として追加する必要性を判断し、追加しない場合も理由を記録する。
- timeout値を変更した場合は、変更前の標準計測の生値、最小値・中央値・最大値、変更後の実測値、設定値と余裕幅の根拠を説明できる。
- `skip`、case削除、Assertion弱体化、fail-closed緩和、無制限または根拠のない過大timeoutで回避していない。
- 一時計測コード、調査用一時ファイル、予期しない生成物が最終差分に残っていない。
- `issue-140-windows-launcher-timeout` branchでは重複実装していない。

現在の環境で再現せず修正根拠を作れない場合は、sourceを推測変更しない。その場合は「現在非再現・原因未特定」として調査結果と再調査条件を残し、Issue #142を解決済みとは扱わない。

## 2. 既知の再発履歴

### Issue #140

Issue #140では、Windowsローカルの`pnpm run verify`内`test:contracts`で次の2件がVitest既定の`5000ms`を超えて失敗している。

```text
preserves safe and deny semantics through the Windows launcher from root and nested cwd
実行時間: 5569ms
実効timeout: 5000ms
```

```text
keeps quote, backslash, LF, and CRLF stdin semantics through the launcher
実行時間: 5071ms
実効timeout: 5000ms
```

同じ2件を診断目的で`--testTimeout=30000`として確認した際は2件ともPASSしている。ただし、この結果だけを根拠に恒久timeoutを30秒へ変更しない。

#140作成時にはPR #139の未commit working treeで`pnpm run verify`がFAILしていた。一方、PR #139 current head `a7632fad478ac5d28f53849ce950b1d205024f36`の記録ではローカル`pnpm run verify`がPASSしている。過去のfailureを発生させた未commit working treeと現在のPR headを同一視しない。

PR #139のbase / headでは、少なくとも次のHook関連ファイルにlauncher timeoutの直接原因となる差分は確認されていない。

```text
tests/contracts/codex-hook-contract.test.ts
.codex/hooks/pre_tool_use_policy_windows.ps1
.codex/hooks/pre_tool_use_policy.mjs
vitest.config.ts
```

したがって、#140の失敗をPR #139固有の回帰とは扱わない。

因果切り分けが必要な場合に参照するSHA:

```text
PR #139 base: 13cc542fa31f372bd4bc932cf7a82b92bcf81a23
PR #139 current head: a7632fad478ac5d28f53849ce950b1d205024f36
#140 branch作成時 main / #142 Plan作成時 main: 12fff8eafccef4ab939efec623ac8a8d4f1ac539
```

`13cc542...`から`12fff8e...`の間にはPR #138由来の`sharp` / `pnpm-lock.yaml`変更がある。historical baseline比較が必要になった場合は各SHA自身のlockfileから依存を構築する。

### Issue #142 / PR #133

- PR #133のRun `20260911-232344-JST`では、標準`pnpm run test:contracts`が初回に既存Hook case 1件、bounded retryでは同じcaseに加えて別の既存launcher caseもtimeoutした。
- 診断目的の`--testTimeout=30000`実行は成功している。
- PR #133の対象変更はHook関連ファイルを変更していないため、Windowsローカル側の既存問題として#142へ分離された。
- #140で実測済みの2件とPR #133でtimeoutしたcaseが完全に同一かは未確認である。

### PR #102

- Windowsローカルの`pnpm run verify`で`codex-hook-contract.test.ts`のHook matrixが`15000ms` timeoutとなった。
- 同じPR headのGitHub Actionsでは`Vitest contracts`が成功している。
- Windows専用経路を実行しないUbuntu CI成功だけではWindowsローカルの再発を否定できないことを示す既存記録として扱う。

### PR #113

- `pnpm run test:contracts`: PASS（34 files / 491 passed / 3 skipped）。
- `pnpm run verify`: `codex-hook-contract.test.ts`の3件がVitest timeoutとなった。
- Hook単体のalternate poolでは129/129 PASSの記録がある。
- 同一コードでも、focused / contracts単体と`verify`経路で結果が変わり得る既存記録として扱う。

この記録のため、今回の完了判定は`test:contracts`単体の連続成功だけで閉じず、修正前にtimeoutを再現した実行経路でも再確認する。

### PR #114

- Hookと無関係な変更上で、`executes every common-policy representative from the Hook matrix`が既定の`15000ms` timeoutで失敗した記録がある。
- 5秒defaultの2件だけでなく、15秒matrix testも再発対象として調査対象に含める根拠とする。

### PR #127

- PR本文に、`pnpm run verify`で既存Windows launcher契約timeout 3件が再現した記録がある。
- PR #127の変更自体はHook / tracked config / timeoutを変更していないため、直近の再発記録として参照する。
- PR #127はIssue #142の正本ではない。timeoutの正確なtest name、実時間、実行順は実装時にRun Artifactから確認できる範囲で確認する。

### PR #106 / ADR-0021

- Windows configured launcherの既存probeでlogging `Stop`が`5395ms`に到達した記録がある。
- 当時はlogging Hook timeoutを5秒から10秒へ変更している。
- 10秒付近へ継続的に到達する場合は、さらにtimeoutを拡大する前にprocess startup / shell / Git / Node / filesystem等を調査する方針を維持する。
- PreToolUseのruntime timeout `30秒`やWindows launcher内部`15000ms`を、今回のVitest aggregate timeout対策として流用しない。

## 3. 現在の実装とtimeout境界

### contract実行条件

標準contract入口:

```text
test:contracts = vitest run tests/contracts --no-file-parallelism --maxWorkers=1
```

`pnpm run test`はunit → integration → repository → component → contractsの順で実行する。

`pnpm run verify`はformat / Markdown / spec / curriculum / lint / typecheck / security等を通った後に`pnpm run test`を実行する。`&&`で連結されているため、前段でFAILすると`test:contracts`へ到達しない。

現在のVitestは`4.1.10`である。`vitest.config.ts`にはglobal `testTimeout`設定がなく、`test:contracts`にも`--testTimeout`指定がない。個別timeoutを指定していないNode環境のtestは既定の`5000ms`が実効上限になる。

### `codex-hook-contract.test.ts`の主要helper

- `runNodeHook()`: `spawnSync(process.execPath, [hookPath], ...)`
- `runWindowsLauncher()`: `spawnSync("powershell.exe", ...)`
- `runNodeHookWithExplicitContexts()`: context付きpolicy case群を1つのNode subprocess内で`evaluateCommand()`へ渡す
- `makeGitFixture()`: temporary directory作成、launcher / Hook copy、`git init`
- `setFixtureBranch()`: `git symbolic-ref`
- `removeFixture()`: recursive temporary directory削除
- `runConfiguredWindowsCommand()`: configured Windows Hook contract用の`cmd.exe` / `pwsh.exe`起動

representative Hook matrixでは、context付きcaseを`runNodeHookWithExplicitContexts()`でまとめて処理する一方、contextなしcaseはcaseごとに`runNodeHook()`を起動する。Node起動とHook内部Git context解決の反復は累積時間増加の候補だが、実測前に原因と断定しない。

### timeout境界

現在の`main`では次のtimeoutを別々の契約として扱う。

- Vitest default test timeout: `5000ms`
- `executes every common-policy representative from the Hook matrix`: `15000ms`
- Windows logging launcherの一部test: `15000ms`
- `terminates a hung Node Hook with finite timeout and stderr`: `20000ms`
- current PowerShell shellやconfigured PreToolUseをまとめて確認する一部test: `30000ms`
- `.codex/hooks/pre_tool_use_policy_windows.ps1`のNode Hook待機: `15000ms`
- `.codex/config.toml`のPreToolUse runtime timeout: `30秒`

Issue #142本文にmatrix testを30秒とした記述があっても、実装開始時の現行コードを正本とする。Plan作成時の`main`ではmatrix testは`15000ms`である。

### Windowsで複数processを同期実行する既存test

- `records JSONL through the configured Windows launcher for every logging event`
  - 5 logging eventを順次実行
  - test timeout `15000ms`
- `records JSONL through the configured Windows launcher under the current PowerShell shell`
  - 5 logging eventを順次実行
  - test timeout `30000ms`
- `preserves PreToolUse policy through the configured Windows launcher and both shell wrappers`
  - `cmd` / `pwsh` × root / nested cwd × safe / denyで8回のconfigured commandを同期実行
  - test timeout `30000ms`
- `terminates a hung Node Hook with finite timeout and stderr`
  - launcher内部`15000ms` timeoutを意図的に発火させる
  - test timeout `20000ms`
  - 通常処理の性能値へ混ぜない
- `preserves safe and deny semantics through the Windows launcher from root and nested cwd`
  - launcherをroot safe / nested safe / nested denyの3回同期実行
  - 明示timeoutなし = 実効`5000ms`
  - #140過去値 `5569ms`
- `keeps quote, backslash, LF, and CRLF stdin semantics through the launcher`
  - launcherをcompact JSON / LF / CRLFの3回同期実行
  - 明示timeoutなし = 実効`5000ms`
  - #140過去値 `5071ms`
  - test file上ではconfigured PreToolUse testの直後にあるため、file単体でこのtestだけ悪化する場合は直前testとの相関を確認する
- `maps malformed input to launcher exit 2 with stderr`、`fails closed when repository root or Node Hook resolution fails`、`maps an unexpected Node non-zero exit to launcher exit 2`等も明示timeoutなしのため実効`5000ms`

## 4. Windows PreToolUseの処理経路

### direct launcher経路

`runWindowsLauncher()`は次の経路を使う。

```text
Node test process
  -> powershell.exe -NoProfile -ExecutionPolicy Bypass -File
  -> .codex/hooks/pre_tool_use_policy_windows.ps1
     -> git -C <cwd> rev-parse --show-toplevel
     -> Get-Command node
     -> node .codex/hooks/pre_tool_use_policy.mjs
```

Issue #140の5秒timeout 2件はこのdirect経路である。ここには`cmd.exe`を含まない。

### configured Windows経路

実運用の`.codex/config.toml` `command_windows`は外側の`cmd.exe`でrepository rootを解決してからPowerShell launcherを起動する。

```text
cmd.exe /D /Q /S /C
  -> git rev-parse --show-toplevel
  -> powershell.exe -NoProfile -ExecutionPolicy Bypass -File
     -> pre_tool_use_policy_windows.ps1
        -> git -C <cwd> rev-parse --show-toplevel
        -> Get-Command node
        -> node pre_tool_use_policy.mjs
```

configured経路では、外側`cmd.exe`とPowerShell launcher内でrepository root解決のGit processがそれぞれ存在する。この2回を直ちに不要な重複と判断しないが、configured経路が遅い場合は別々に計測する。

さらにNode HookがGit contextを必要とするcommandを評価すると、`getGitCommandContext()`が追加でGit subprocessを起動する。

```text
configured PreToolUse
  -> cmd.exe startup
  -> outer git rev-parse --show-toplevel
  -> powershell.exe startup
  -> launcher git -C <cwd> rev-parse --show-toplevel
  -> Get-Command node
  -> node startup
  -> pre_tool_use_policy.mjs
     -> 必要なGit commandではgetGitCommandContext()
        -> 最大4 Git subprocess
```

初期調査ではdirect経路とconfigured経路を混同しない。direct経路で再現する問題を、外側`cmd.exe`の存在だけで説明しない。

### Hook内部Git context取得

`pre_tool_use_policy.mjs`の`getGitCommandContext()`は最大4つのGit subprocessを同期実行する。

```text
git symbolic-ref --quiet refs/remotes/origin/HEAD
git remote
git branch --show-current
git rev-parse --abbrev-ref --symbol-full-name @{upstream}
```

各Git commandには`2000ms` timeoutがある。Node startupだけでなく、各Git commandの時間と1 Hook invocationあたりの呼び出し回数も計測対象にする。

## 5. 既存検証の役割

### Windows Vitest contract

`tests/contracts/codex-hook-contract.test.ts`が主に次を検証する。

- payload validation / malformed input
- safe command / structured deny
- G1-G10 / N1-N4 / A1-A17のpolicy semantics
- runtime Git context / `git -C` / repository・cwd境界
- Windows direct launcherのstdin / stdout / stderr / exit code
- configured Windows launcherの`cmd` / `pwsh`、root / nested cwd
- missing root / missing Hook / unexpected Node exit / hung Nodeのfail-closed
- Windows logging launcherのside effect

### `scripts/verify.ps1`

`scripts/verify.ps1`はRepository harness / configのWindows契約確認として使う。現在の確認範囲には、PreToolUse configについて次のような静的契約が含まれる。

- `command_windows`が存在する
- `cmd.exe /D /Q /S /C`を使う
- `for /f`でrootを解決する
- `pre_tool_use_policy_windows.ps1`を参照する
- root解決のstderr抑制を含む

`scripts/verify.ps1`だけでstdin / stdout / stderr / Node exit / launcher内部15秒timeoutのruntime transportを検証済みとは扱わない。runtime transportの主な回帰確認はWindows Vitest contractで行う。

### GitHub Actions

- Web CIの`Vitest (contracts)`は`ubuntu-latest`で実行される。
- Windows専用testは`process.platform !== "win32"`でlauncher処理を抜けるため、Ubuntu CI成功はWindows launcherの回帰確認にならない。
- 既存のWindows runner jobはCodex artifact sanitizerであり、`test:contracts`は実行していない。

## 6. 対象範囲

### 主な対象

- `tests/contracts/codex-hook-contract.test.ts`
- `.codex/hooks/pre_tool_use_policy_windows.ps1`
- `.codex/hooks/pre_tool_use_policy.mjs`
- `.codex/config.toml`
- `vitest.config.ts`
- `package.json`
- `.github/workflows/ci.yml`
- `scripts/verify.ps1`
- `.codex/runs/<run_id>/`

すべて変更候補という意味ではない。原因に応じて必要最小限のファイルだけを変更する。

### 対象外

- PR #133の教材・Evidence validator変更
- PR #139の機能変更の再設計
- Expo dependency mismatch
- Hook policyのG1-G10 / N1-N4 / A1-A17の意味変更
- 新しいHook framework、benchmark framework、process managerの導入
- Codex Run Artifact基盤、logging Hook基盤、sandbox設計の再設計
- Windowsローカル以外への一般的な性能最適化
- 原因未確認のまま5秒から30秒へtimeoutを延長すること
- 対象testのskip / 除外
- CI全体のtimeout緩和
- launcherやprocess管理の全面的な抽象化・リファクタリング
- test分割だけで実行時間を改善したと扱うこと
- #140用branchでの別実装

## 7. 未確認事項

- PR #133の初回とretryでtimeoutした正確なtest name。
- PR #127でtimeoutした3件の正確なtest name、実時間、実行順。
- 現在の`main`で#140の5569ms / 5071msを再現できるか。
- 現在の`main`でPR #102 / #114の15秒matrix timeoutを再現できるか。
- PR #113と同様に、`test:contracts`単体は安定し`verify`経路だけ悪化するか。
- historical failureを発生させたPR #139の未commit working treeを完全に復元できるか。
- 特定の1 subprocessが遅いのか、複数processの累積でtimeoutを超えるのか。
- direct launcherとconfigured launcherで支配的な遅延箇所が同じか。
- Node startup、PowerShell startup、外側 / launcher内Git root解決、`Get-Command node`、Hook内部Git context、fixture作成 / cleanupのどれが支配的か。
- stdin EOF、stdout / stderr drain、child exit待ちで異常遅延があるか。
- process残存がある場合、対象testが生成したprocessか。
- Windows負荷によるばらつきと、実装側の再現可能な遅延をどこまで分離できるか。

実装開始前にユーザーへ確認が必要なblocking questionはない。確認可能な内容は実測して判断する。

## 8. 実装手順

### 手順1: 状態と環境を固定する

- `fix/windows-codex-hook-contract-timeout`のHEAD、最新`main` HEAD、merge base、`main...branch`差分を記録する。
- `issue-140-windows-launcher-timeout` branchは参照だけに使う。
- 同一会話のactive RunがあればRepository規約に従って再利用し、なければ標準手順でRunを初期化する。actual `run.json`を直接作成・編集しない。
- Issue #142作成後にHook関連変更が`main`へ入っていれば、Planの古い前提を更新する。
- 少なくとも次を記録する。

```powershell
git rev-parse HEAD
Get-Command git | Select-Object -ExpandProperty Source
git --version
node --version
pnpm --version
Get-Command powershell.exe | Select-Object -ExpandProperty Source
powershell.exe -NoProfile -Command '$PSVersionTable.PSVersion.ToString()'
powershell.exe -NoProfile -Command '(Get-Command node).Source'
$pwsh = Get-Command pwsh.exe -ErrorAction SilentlyContinue
if ($null -ne $pwsh) { $pwsh.Source; pwsh.exe --version } else { 'pwsh.exe: not found' }
```

`pwsh.exe`等の必要な実行ファイルが存在しない、またはpath解決に失敗する場合は、そのrunをtimeout再現として数えない。configured `pwsh`経路を検証できない環境前提の不足として記録し、必要な検証が未実行なら完了扱いにしない。

必要な場合だけ`codex --version`も記録する。

### 手順2: Windows関連testと過去failureを棚卸しする

`codex-hook-contract.test.ts`のWindows関連testについて次を一覧化する。

- test name
- Windows専用か
- 明示timeout / 実効timeout
- 主要subprocess数
- direct / configuredのどちらか
- 意図的待機の有無
- 過去にtimeout記録があるか

#140の2件は、一時diagnosticなし・Vitest既定timeout・デフォルトreporterのまま別々にfocused実行する。

```powershell
pnpm exec vitest run tests/contracts/codex-hook-contract.test.ts --no-file-parallelism --maxWorkers=1 -t "preserves safe and deny semantics through the Windows launcher from root and nested cwd"
```

```powershell
pnpm exec vitest run tests/contracts/codex-hook-contract.test.ts --no-file-parallelism --maxWorkers=1 -t "keeps quote, backslash, LF, and CRLF stdin semantics through the launcher"
```

各testは最大10回を上限とする。

- 実行した全runの生値、PASS / FAIL、最小値、中央値、最大値を記録する。
- PASSが続く場合はばらつき確認のため最大10回まで取得してよい。
- 同じtimeout failureが2回連続し、新しい情報が増えない場合は残り回数を消化せず詳細調査へ進む。
- 同じ工程3回失敗、新しい情報なし、仮説なし等のRepository停止条件に達した場合も無目的に再試行しない。
- #140の過去値と現在値を混同しない。

### 手順3: 再現する実行経路を特定する

次の順に確認し、どこから悪化するかを記録する。

1. focused test
2. `codex-hook-contract.test.ts` file単体
3. `pnpm run test:contracts`
4. 必要な場合だけ`pnpm run test`
5. `pnpm run verify`

file単体の標準再現はデフォルトreporterで行う。

```powershell
pnpm exec vitest run tests/contracts/codex-hook-contract.test.ts --no-file-parallelism --maxWorkers=1
```

個別test名、実行順、診断用の詳細表示が必要な場合だけ`--reporter=verbose`を追加する。

```powershell
pnpm exec vitest run tests/contracts/codex-hook-contract.test.ts --no-file-parallelism --maxWorkers=1 --reporter=verbose
```

`--reporter=verbose`、一時計測、`--testTimeout=30000`等を付けたrunは診断runとして標準計測と分離し、timeout値や性能判断の基準値には使わない。

修正前の標準`test:contracts`は最大3回、`verify`は最大2回とする。停止条件に達したら上限まで消化しない。

- `test:contracts`では安定し`verify`でのみ悪化する場合だけ`pnpm run test`を中間切り分けに使う。
- `pnpm run test`でも再現する場合は、unit / integration / repository / component等の先行test suiteとの相関を確認する。
- `pnpm run test`では再現せず`verify`で再現する場合は、format / lint / spec / typecheck / security等の前段処理との相関を確認する。
- `verify`がcontract到達前にFAILしたrunはWindows timeout再現回数へ含めない。
- quote / LF / CRLF testだけfile単体で悪化する場合は、直前のconfigured PreToolUse testとの相関を優先して確認する。

### 手順4: 現行コードだけで原因を閉じられない場合にhistorical baselineを比較する

現在の`main`で同等の問題を十分に再現し、現行コード上で原因を説明できる場合は古いSHA比較を必須にしない。

historical baseline比較は、active implementation working treeでは行わない。`fix/windows-codex-hook-contract-timeout`上のPlan、active Run、一時計測コード、未commit変更と混ざらないよう、Git worktree等の隔離した作業ディレクトリを使用する。Git worktreeを利用できない場合も、同じworking treeをSHA間で往復checkoutするのではなく、同等に隔離されたcopyを用意する。

比較対象:

```text
historical baseline: 13cc542fa31f372bd4bc932cf7a82b92bcf81a23
#140 branch作成時 main: 12fff8eafccef4ab939efec623ac8a8d4f1ac539
PR #139 current head: a7632fad478ac5d28f53849ce950b1d205024f36
```

各baselineは同一PC、同一のOS / shell条件で測り、それぞれ自身のlockfileから依存を構築する。baseline間で`node_modules`を共有して結果を比較しない。

```powershell
pnpm install --frozen-lockfile --ignore-scripts
git diff --exit-code -- package.json pnpm-lock.yaml
```

- focused testを先に確認する。
- 必要な場合だけ`test:contracts`、さらに実行条件の因果確認が必要な場合だけ`verify`まで進む。
- baseline間で5秒境界の判断を変える差が出た場合だけ実行順を反転して確認する。
- PR #139 current headでPASSしても、未commit working treeの過去failure自体は否定しない。
- baseline側で作成したraw logや一時diagnosticはactive implementation working treeへ持ち込まない。必要な測定値と判断だけを#142のactive Runへ記録する。

### 手順5: focusedまたはfile単体で再現したtestを呼び出し単位へ分解する

focusedまたはfile単体で再現した場合だけ、一時計測を追加する。

#140の2件で再現した場合は少なくとも次を個別に測る。

- safe root
- safe nested
- deny nested
- compact stdin
- LF stdin
- CRLF stdin

必要に応じて次を測る。

- `runNodeHook()` 1回
- `runNodeHookWithExplicitContexts()` batch
- `runWindowsLauncher()` 1回
- PowerShell process起動
- launcher内`git rev-parse`
- `Get-Command node`
- Node process起動
- `getGitCommandContext()`の各Git commandと呼び出し数
- `git init` / `git symbolic-ref`
- Hook file copy / fixture cleanup
- stdin書き込み完了からchild exitまで
- stdout / stderr read完了待ち

一時計測の値は標準計測と別データとして扱う。`HookResult`、stdout / stderr、exit code、payload contractへ計測値を混ぜない。

### 手順6: suite限定の悪化とprocess残存を確認する

focusedでは安定し、file単体 / full contracts / `pnpm run test` / `verify`でのみ悪化する場合だけ実施する。この経路では手順5のlauncher invocation単位計測を必須にせず、先にsuite境界と先行処理との相関を確認する。

process残存を疑う場合は、まず一時diagnosticで対象launcherのPIDを取得し、そのPIDと子孫processだけを追う。

確認する情報:

- ProcessId
- ParentProcessId
- CreationDate
- Name
- 必要な場合だけCommandLine

マシン上の全`node.exe` / `powershell.exe` / `cmd.exe`の`CommandLine`を先に一括収集しない。別用途processのtoken、URL、ローカルpath、別タスク情報を不要に取得しないためである。

`CommandLine`が必要な場合も対象PID / 子孫PIDへ限定し、生の値をRun Artifactへ残さない。ローカル絶対pathや機密値が含まれる場合はsanitizeする。

process名や件数だけで残存を原因と判断しない。対象実行との親子関係と生成時刻を確認できない場合は「process残存が原因」と断定しない。

### 手順7: launcher内部とconfigured経路を必要な範囲で計測する

#### direct launcher

launcher 1回に異常な待機または大きなばらつきがある場合だけ、`pre_tool_use_policy_windows.ps1`へ一時計測を追加する。

- launcher内`git -C <cwd> rev-parse --show-toplevel`
- `Get-Command node`
- Node child process起動
- stdin copy / close
- stdout / stderr read
- `WaitForExit`
- process終了後cleanup

PowerShell processそのものの起動時間はtest helper側から測る。

#### configured Windows経路

configured経路でのみ悪化する場合は次を分けて測る。

- `cmd.exe` startup
- 外側`git rev-parse --show-toplevel`
- `powershell.exe` startup
- launcher内`git -C <cwd> rev-parse --show-toplevel`
- `Get-Command node`
- Node startup
- Node Hook内部Git context

外側とlauncher内のroot解決が2回ある事実だけで片方を削除しない。既存責務とfail-closedを確認し、実測上の不要な処理と判断できる場合だけ変更候補にする。

### 手順8: 原因に応じて最小修正する

#### test内のsubprocess累積が主因

- launcher 1回が正常で、複数回の合計だけがtimeoutを超える場合、production launcher不具合とは扱わない。
- pure policy semanticsは既存`runNodeHookWithExplicitContexts()`相当のbatch評価を再利用できるか確認する。
- payload validation、CLI entrypoint、structured deny、runtime Git context、`git -C`、Windows transport、missing root / Hook、unexpected Node exit、hung Node等の実process契約を残す。
- 実process境界testまでpure `evaluateCommand()`へ置き換えない。
- test分割は、各caseに独立したtimeout境界を持たせる意味があり、保証範囲を維持できる場合だけ行う。単なる5秒回避には使わない。

#### PowerShell launcher / process lifecycleが主因

- stdin EOF、redirect stream、`WaitForExit`、timeout後Kill、cleanup等の具体的な異常を確認した箇所だけ修正する。
- launcherへpolicy判定を移さない。
- exit code `0` / `2`、stderr伝播、timeout時fail-closedを維持する。
- hung Node testの15秒待機をtest高速化目的で短縮しない。

#### Hook内部Git context取得が主因

- 遅いGit commandと呼び出し回数を特定する。
- 同一Hook invocation内で同じrepository contextを不要に再取得している場合だけ再利用を検討する。
- `git -C`、複数repository、cwd transitionを跨いでcontextを共有しない。
- testだけの重複ならproduction Hookを変更しない。

#### fixture反復が主因

- 同じ意味のfixture setupを安全に共有できるtestだけを対象にする。
- branch state、remote、filesystem stateがtest間で漏れる場合は共有しない。
- 新しいfixture frameworkは作らず、既存helperの局所再利用を優先する。

#### 実装異常がなくtest固有timeoutだけが短い

次のすべてを満たす場合だけ対象test固有timeoutを変更する。

- launcher内部に不要な待機がない。
- 直列起動を1つのcontractとして維持する合理性がある。
- 一時diagnosticなし、デフォルトreporterの標準計測で既存timeout超過が通常のばらつきとして確認できる。
- 変更対象を該当testへ限定できる。
- 変更前の生値、最小値・中央値・最大値から新しい値と余裕幅を説明できる。
- 同じfileの既存`30000ms`を根拠なく流用していない。

`.codex/config.toml`のruntime 30秒やlauncher内部15秒を、Vitest aggregate timeoutの都合だけで変更しない。

#### 現在は再現せず変更根拠がない

- sourceを推測変更しない。
- 過去failureと現在の非再現を区別して記録する。
- historical baseline比較でも原因を確定できない場合は未特定として残す。
- 「Windowsだから遅い」「cold cacheだから」「5秒が短い」だけを修正根拠にしない。
- この分岐はIssue解決ではなく調査終了である。Issue #142は解決済みと扱わず、再調査条件と未確認点をRun Artifactへ残す。

### 手順9: 回帰テストとCIを決める

- 原因修正を検出できる既存contractがあれば重複testを増やさない。
- process lifecycle不具合を修正した場合だけ、そのfailureを直接検出できる回帰testを追加する。
- 性能の絶対値を厳密にassertするbenchmark testは追加しない。
- policy ID集合、malformed input、allow / deny、quote / backslash、LF / CRLF、cwd、exit code、stdout / stderr、Windows launcherの既存契約を維持する。
- `.codex/hooks/pre_tool_use_policy_windows.ps1`、`.codex/hooks/pre_tool_use_policy.mjs`、`.codex/config.toml`のいずれかを変更した場合は、Repository harness / config確認として次を実行する。

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/verify.ps1
```

Windows CI追加の判断は変更ファイルの種類ではなく、今回修正する回帰を継続的に検出できるかで決める。

focused Windows CIを追加する方向:

- 修正対象の回帰がWindowsでしか実行・検出できない。
- 既存Ubuntu `Vitest (contracts)`では実処理がskipされる。
- 過去PRで複数回再発しており、ローカル手動確認だけでは再発を見逃す可能性が高い。
- focusedなtestだけで維持コストを過度に増やさず検出できる。

追加しない方向:

- Windows固有の回帰を自動検出できる別の既存jobが確認できる。
- 原因がWindows runtime経路ではなく、OS非依存のtest構造だけで既存Ubuntu CIが同じ回帰を検出できる。
- Windows CI追加の維持コストに対し、今回の再発防止効果を説明できない。

production変更だから自動的にWindows CIを追加する、test-only変更だから自動的に追加しない、という判断にはしない。

### 手順10: 一時計測とRun Artifactを整理する

- 一時計測用ログ、temporary script、raw timing outputを最終source差分から除外する。
- 将来の診断にも必要な小さなhelperだけが残る場合は、現在のtest責務から必要性を説明できるものに限定する。
- 新規dependency、benchmark framework、設定切替を追加しない。
- active Runの`TASKS.md`を更新する。
- `REPORT.md`へ過去記録、今回の全runの値、停止理由、原因判定、修正内容、採用しなかった主要案、未確認点、blocker、検証結果をappend-onlyで追記する。
- actual `run.json`はmachine-managed経路に任せ、直接編集しない。
- Repositoryへ追加するRun ArtifactへsanitizerのWrite / Checkを実行する。

```powershell
./scripts/sanitize-codex-artifacts.ps1 -Path ".codex/runs/<run_id>" -Write
./scripts/sanitize-codex-artifacts.ps1 -Path ".codex/runs/<run_id>" -Check
```

sanitizer後の最終状態で`pnpm run lint:markdown`、`git diff --check`、`git status --short`を確認する。

## 9. 修正後の検証

ここを修正後検証の正本とする。§1の完了条件、§12の成果物、§13の実装順序では、この節の個別commandを重複定義しない。

### 常に実行するWindows検証

対象Hook contract fileを3回連続で実行する。

```powershell
pnpm exec vitest run tests/contracts/codex-hook-contract.test.ts --no-file-parallelism --maxWorkers=1
pnpm exec vitest run tests/contracts/codex-hook-contract.test.ts --no-file-parallelism --maxWorkers=1
pnpm exec vitest run tests/contracts/codex-hook-contract.test.ts --no-file-parallelism --maxWorkers=1
```

標準contractを3回連続で実行する。

```powershell
pnpm run test:contracts
pnpm run test:contracts
pnpm run test:contracts
```

各runで少なくとも次を記録する。

- file / suite全体所要時間
- 修正対象testの所要時間
- #140の2件の所要時間
- matrix testの所要時間
- timeout / hanging subprocessの有無
- policy case失敗数

### 修正前に再現した経路を再実行する

focusedで再現した場合:

- 修正対象focused testを3回連続で成功させる。

`pnpm run test`で再現した場合:

```powershell
pnpm run test
pnpm run test
```

2回とも成功することを確認する。

`pnpm run verify`で再現した場合:

```powershell
pnpm run verify
pnpm run verify
```

2回ともcontractまで到達して成功することを確認する。前段failureでcontractが未実行のrunは連続成功へ数えない。

`verify`で再現しなかった場合でも、source / test / configを変更した場合は最終標準検証として`pnpm run verify`を1回成功させる。

現在非再現でsource変更なしの調査終了となった場合は、実行済みの標準経路と未達検証を記録し、修正後検証を実施したとは表現しない。

### Repository固有検証

Hook / configを変更した場合:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/verify.ps1
```

この結果はRepository harness / config契約の確認として記録し、Windows Vitest transport検証の代替にはしない。

### その他の最終確認

source / test / configを変更した場合は次を確認する。

```powershell
pnpm run format:check
pnpm run lint
pnpm run typecheck
pnpm run lint:markdown
git diff --check
git status --short
```

`pnpm run verify`で既に実行される項目との重複は、局所確認と最終確認の目的がある範囲だけ許容する。

### GitHub Actions

- Web CIの`Vitest (contracts)`成功を確認する。
- Ubuntuの時間をWindows性能値として使わない。
- focused Windows CIを追加した場合は、その`windows-latest` jobを必須検証に含める。
- Windows CIを追加しなかった場合は、今回の回帰をどう継続検出するか、または自動検出を追加しない理由をRun Artifactへ記録する。

### timeout変更時

- 変更前・変更後を同一環境、同一command、同一test、デフォルトreporterで比較する。
- default 5秒、test固有15 / 20 / 30秒、launcher内部15秒、Codex runtime 30秒のどれを変更したか明記する。
- 値を変更しなかったtimeoutも、変更不要と判断した根拠を記録する。
- test固有timeoutを変更した場合、旧5秒境界でPASSすることを完了条件にしない。新しい通常コマンドで安定し、変更前の標準計測分布から新しい設定値を説明できることを確認する。
- failure後に値をさらに広げて回避しない。
- hung Node testは通常性能の測定値から除外する。

## 10. 判断基準

ここを修正方針の分岐条件の正本とする。

### production launcherを変更しない条件

次を満たす場合はproduction launcherを変更しない。

- 1回の`runWindowsLauncher()`に異常な待機がない。
- 対象実行由来のprocess残存やI/O待機異常の証拠がない。
- 複数回累積、suite条件、test固有timeout、または非再現で説明できる。

### test分割を検討できる条件

- safe root / safe nested / deny nested、またはcompact / LF / CRLFを独立したcontractとして扱える。
- 各caseへ個別timeout境界を適用する意味を説明できる。
- 既存assertionと保証範囲を維持できる。
- 分割しても外部process総実行時間は減らないことを認識している。
- 単なるtimeout回避ではない。

### test固有timeoutを変更できる条件

- launcher内部に不要な待機がない。
- 直列起動を1つのcontractとして維持する合理性がある。
- デフォルトreporterの標準計測で既存timeout超過が通常のばらつきとして確認できる。
- 変更対象を該当testへ限定できる。
- 変更前の実測分布から値と余裕幅を説明できる。

### launcherを変更できる条件

次のいずれかを実測で確認した場合に限る。

- 1回のPowerShell起動またはlauncher処理に不要な待機がある。
- launcher内Git root解決やNode解決に不要な遅延がある。
- stdin EOF、stdout / stderr drain、`WaitForExit`、cleanupで異常待機がある。
- 対象launcher由来のchild processがNode Hook完了後も残り、test終了を遅らせている。

性能改善だけを理由に安全性、fail-closed、exit code、stdout / stderr contractを弱めない。

### Hook本体を変更できる条件

- production Hook本体で実際に不要な重複処理があることを実測できる。
- testだけの重複ではない。
- repository / cwd / `git -C`境界を跨いだcontext共有を発生させない。
- fail-closedとpolicy semanticsを維持できる。

### suite条件の問題として扱う条件

- focusedでは安定するが、file単体、full contracts、`pnpm run test`、`verify`のいずれかで再現性を持って悪化する。
- `test:contracts`では再現せず`verify`だけで再現する場合は`pnpm run test`で境界を分ける。
- process残存を根拠にする場合は対象実行由来のPID / 親PID / 生成時刻で確認する。
- 相関を確認できない場合は「suite負荷が原因」と断定しない。

### source変更せず調査を終了する条件

次のいずれかに該当し、変更根拠を作れない場合はsourceを変更しない。

- 過去failureはあるが、今回のfocused / suite / 必要なbaseline比較で再現しない。
- 実行条件差を比較しても安定した差が出ない。
- launcher内部の異常待機を示す証拠がない。
- PR #139との直接因果を示すsource / 設定 / 実測差分がない。

この場合はIssue #142を解決済みとは扱わない。Run Artifactへ少なくとも次を残す。

- 実行した標準runと診断runの回数・生値
- 停止条件により上限未満で終了した場合の理由
- 過去failureと現在の非再現の差
- 未確認点
- 再調査を開始する条件
- sourceを変更しなかった理由

### 無関係な最終検証failure

- 最初の異常を確認し、Issue #142との因果を判定する。
- Issue #142に起因する、または正しい検証に必要な範囲なら最小修正する。
- 因果がないと確認できたfailureはこのIssueでsource修正しない。
- 必須検証がPASSしていない場合は完了扱いにせず、blockerと未達検証をRun Artifactへ記録する。

## 11. リスク

- #140、PR #133、PR #102 / #113 / #114 / #127のfailureを、同じtest fileという理由だけで単一原因へまとめると別の遅延経路を見落とす。
- 逆に#140の2件だけへ調査を限定すると、15秒matrix timeoutや`verify`限定の再発条件を見落とす。
- historical failureの未commit working treeを完全に復元できない可能性がある。
- historical baselineをactive implementation working treeで比較すると、branch state、active Run、一時計測コード、依存状態が混ざる。baseline比較は隔離した作業ディレクトリで行う。
- baseline比較にはlockfile差分と実行順の影響が混ざる可能性があるため、各baselineの依存を分離し、必要な場合だけ実行順を反転する。
- Windowsのprocess起動時間にはばらつきがあるため、生値と実行順を捨てない。
- `--reporter=verbose`や一時diagnostic自体がtimingへ影響するため、標準計測と分離する。
- `pwsh.exe`等の環境前提不足をtimeoutとして数えると原因を誤る。実行ファイル不存在・path解決失敗は別failureとして扱う。
- pure policy evaluationへ寄せすぎると、実Hook entrypoint、Git context、Windows transportの回帰検出力を落とす。
- hung Node testの15秒はproduction finite timeout契約であり、通常遅延と誤認して短縮しない。
- `getGitCommandContext()`は最大4 Git subprocessを起動するため、Node startupだけの計測では不十分である。
- configured Windows経路には外側とlauncher内のGit root解決がある。片方を削る場合は責務とfail-closedを確認する必要がある。
- process調査でマシン上の全processの`CommandLine`を収集すると、別タスクの情報や機密値を不要に取得する可能性がある。対象PID / 子孫PIDへ限定する。
- PowerShell launcherの変更はstdin / stdout / stderr / exit codeを壊す可能性があるため、process lifecycleの事実なしに変更しない。
- `verify`は前段工程で停止し得るため、`verify` FAILだけではWindows launcher testの再現を意味しない。
- Ubuntu CIはWindows専用contractの実処理を行わないため、Linux Greenだけでは再発防止を証明できない。
- Windows CIを無条件に追加すると実行時間・保守負荷を増やす。再発防止効果を説明できるfocused jobだけを検討する。
- #140 branchと#142 branchで並行実装すると同じtest / launcherへ競合変更を作る可能性が高い。

## 12. 成果物

### 必須

- #140、PR #133、PR #102 / #113 / #114 / #127の既知timeout記録と今回の再現結果の整理
- Node、pnpm、PowerShell、Git、launcherが解決するNode pathを含む再現条件。必要な実行ファイルが存在しない場合はその事実と未実行経路
- 修正前focused / file / contracts / 必要なsuite経路の標準計測の生値と停止理由
- 原因判定、または現在非再現・原因未特定という判断とその根拠
- Windows CI追加要否と判断根拠
- active Run `REPORT.md`の原因判定、採用対策、採用しなかった主要案、未確認点、検証結果
- Run Artifact sanitizer Write / Check
- sanitizer後の`pnpm run lint:markdown`、`git diff --check`、`git status --short`

### 条件付き

- focusedまたはfile単体で再現した場合: launcher invocation、PowerShell、Git context、fixture等の呼び出し単位の計測結果
- suite限定で再現した場合: suite境界、先行処理、対象PID / 子孫process等の相関結果
- 現行コードで原因を閉じられない場合: 隔離した作業ディレクトリでのhistorical baseline比較
- 5秒境界の判断に影響する差がある場合: 実行順反転の比較結果
- historical baselineでも因果を閉じられない場合: PR #139 current head比較
- source / test / configを変更した場合: 原因に対する必要最小限の変更と§9の修正後検証結果
- timeoutを再現した場合: 修正前にtimeoutした同じ実行経路での修正後成功記録
- Hook / config変更時: `scripts/verify.ps1`結果
- process lifecycleに新しい恒久契約を追加した場合: そのfailureを直接検出する回帰test
- Windows専用回帰を継続検出する価値がある場合: focused Windows CI
- Hook runtime契約を変更した場合のみ: `docs/PROJECT_CONTEXT.md`と対応する`docs/history/**` / ADR

現在非再現でsource変更なしとなった場合は、「修正後成功記録」や「原因箇所の呼び出し単位計測」を必須成果物にしない。代わりに、実行済みの再現試行、診断試行、停止理由、未確認点、再調査条件を必須とする。

### 参照のみ

- Issue #140
- `issue-140-windows-launcher-timeout`
- `docs/plans/2026-09-12_004031_issue-140-windows-launcher-timeout.md`
- PR #102
- PR #106
- PR #113
- PR #114
- PR #127
- PR #133
- PR #139

### 作成しないもの

- Issue #142専用の新規framework
- 恒久benchmark utility / dependency
- 新規process manager
- #140 branch上の重複実装

## 13. 実装時の順序

1. branch、最新`main`、merge base、Hook関連差分、環境情報を固定し、必要な実行ファイルの有無を確認する。
2. 過去timeout記録と現在のWindows関連test一覧を対応付ける。
3. #140の2件を既定5秒・デフォルトreporterでfocused計測する。
4. file単体 → full contracts → 必要な場合`pnpm run test` → `verify`の順で再現境界を特定する。
5. 現行コードで原因を閉じられない場合だけ、隔離した作業ディレクトリでhistorical baseline比較へ進む。
6. focused / file単体で再現した場合は呼び出し単位へ分解し、suite限定の場合は先にsuite境界とprocess相関を調べる。
7. configured経路が対象なら外側Git root解決とlauncher内Git root解決を分けて測る。
8. §10の判断基準に従い、原因が確認できた範囲だけ必要最小限の変更を選ぶ。現在非再現で根拠がない場合はsourceを変更しない。
9. 一時計測を削除し、source / test / configを変更した場合は§9の修正後検証を実施する。
10. Windowsでしか検出できない回帰かを基準にfocused Windows CI追加要否を決める。
11. Run Artifact sanitizer、最終diff / status、必要なGitHub Actions結果を確認する。

先にtimeout値を大きくする、caseを削る、skipする、policyを弱める、hung testのproduction timeoutをtest都合で短縮する対応は行わない。