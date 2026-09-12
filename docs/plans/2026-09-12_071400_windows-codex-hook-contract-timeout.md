# Windows環境のCodex Hook contract timeout解消 計画

## 0. 依頼概要

- 対象: Issue #142「Windows環境でCodex Hook contractがtimeoutする問題を解消する」
- 統合元: Issue #140「test: Windows launcherのcontract testが5秒timeoutになる原因を調査する」
- implementation branch: `fix/windows-codex-hook-contract-timeout`
- #140 reference branch: `issue-140-windows-launcher-timeout`
- Plan作成時 base SHA: `12fff8eafccef4ab939efec623ac8a8d4f1ac539`

Issue #140の調査内容はIssue #142へ統合する。#140 branchと#140 Planは履歴参照に限定し、実装・検証・PRは#142 branchへ一本化する。

このPlanの目的は、Windowsローカルで断続的に発生している`tests/contracts/codex-hook-contract.test.ts`のtimeoutを、既存Hook policy、fail-closed、allow / deny、Windows transport契約を維持したまま解消することである。

調査自体を広げることを目的にしない。まず再現境界を固定し、その後に再現したcaseだけを調べる。既存test構造だけで説明・修正できる場合はそこで終了し、それで閉じられない場合だけproduction Hookやprocess lifecycleへ進む。

このPlanでは実装しない。実装開始時は最新`main`、対象branch HEAD、merge base、`main...branch`差分、Issue #142作成後のHook関連変更を再確認する。

## 1. ゴールと終了条件

### ゴール

Windowsで再現するHook contract timeoutについて、原因を実測で説明し、必要最小限の変更で標準contractを安定して完走できるようにする。

既知のfailureは同じtest fileで発生しているが、次を同一原因とは事前に決めない。

- #140の5秒Windows launcher timeout 2件
- 15秒Hook matrix timeout
- PR #133で記録された、正確なtest名が未確認のその他Hook timeout
- `test:contracts`単体では成功し、`pnpm run verify`内でだけtimeoutする記録

### 実装判断の最上位原則

実装は次の順で判断する。前の段階で原因と修正が閉じた場合、後続段階へ進まない。

1. Windows上でfocused / file / suiteの再現境界を先に固定する。
2. `tests/contracts/codex-hook-contract.test.ts`だけで解消できるか確認する。
3. test-onlyで閉じられない場合だけ、単一のPowerShell / Node subprocessに異常があるか確認する。
4. production側の異常を実測できた場合だけ、該当Hook / configを変更する。
5. 原因と無関係な共通化、framework化、process abstraction、性能最適化は行わない。

### Issue #142を解決済みとする条件

- #140の2件について、現在の再現結果と所要時間を記録している。
- Hook matrixについて、現在の再現結果を記録している。
- PR #102 / #113 / #114 / #127 / #133の既知timeout記録と今回の結果を区別している。
- #140の2件、matrix、今回新たに再現したその他Hook timeoutが共通原因か別原因かを、確認できた範囲で説明できる。共通原因を確認できない場合は無理に統一しない。
- Windows version / build / architecture、Node、pnpm、PowerShell、Gitのversion / pathを記録している。
- Vitest側のNode executableとして`process.execPath`、PowerShell launcher側として`Get-Command node`の解決結果を確認している。
- 修正前にtimeoutを再現した実行経路を、修正後に同じ条件で成功させている。
- Windowsで対象Hook contract fileを3回連続で成功させている。
- Windowsで`pnpm run test:contracts`を3回連続で成功させている。
- `pnpm run test`で再現した場合は、修正後に同じ経路を2回連続で成功させている。
- `pnpm run verify`で再現した場合は、修正後にcontractまで到達する`pnpm run verify`を2回連続で成功させている。
- `verify`で再現しなかった場合でも、source / test / configを変更した場合は最終`pnpm run verify`を1回成功させている。
- GitHub Actions Web CIの`Vitest (contracts)`が成功している。
- Windows専用回帰を既存CIで検出できない場合は、最終原因と修正内容を確定した後にfocused Windows CIの追加要否を判断し、追加しない場合も理由を記録している。
- policy case、assertion、fail-closed、Windows transport契約を弱めていない。
- 一時計測コード、raw timing output、調査用一時ファイルが最終source差分に残っていない。
- #140 branchでは重複実装していない。

### 原因未特定のまま調査を終了する条件

現在の環境で再現せず、修正根拠を作れない場合はsourceを推測変更しない。その場合はIssue #142を解決済みと扱わず、次をRun Artifactへ残す。

- 実行した標準run / 診断runの回数と生値
- 過去failureと現在の非再現の差
- 停止条件により上限未満で終了した理由
- historical baseline比較を実施した場合はその結果
- 未確認点
- 再調査を開始する条件
- sourceを変更しなかった理由

## 2. 既知の再発履歴

### Issue #140

Windowsローカルの`pnpm run verify`内`test:contracts`で次の2件がVitest既定の`5000ms`を超えて失敗している。

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

同じ2件を診断目的で`--testTimeout=30000`として実行した確認ではPASSしている。ただし、この結果だけを根拠に恒久timeoutを30秒へ変更しない。

2件はいずれも1 test内で`runWindowsLauncher()`を3回同期実行している。

- root safe / nested safe / nested deny
- compact JSON / LF / CRLF

過去値は5秒境界を約71ms / 569ms超過した値であり、まず「単一launcherの異常」ではなく「3回の正常なprocess起動の合計が5秒境界に近すぎる」可能性を確認する。

### PR #102

- Windowsローカルの`pnpm run verify`でHook matrixが`15000ms` timeoutとなった記録がある。
- 同じPR headのGitHub Actions `Vitest contracts`は成功している。
- Ubuntu CI成功だけではWindowsローカルの再発を否定できない既知事実として扱う。

### PR #113

- `pnpm run test:contracts`: PASS（34 files / 491 passed / 3 skipped）
- `pnpm run verify`: `codex-hook-contract.test.ts`の3件がtimeout
- Hook単体のalternate pool: 129/129 PASS

同一コードでも、focused / contracts単体と`verify`経路で結果が変わり得る記録として扱う。

### PR #114

`executes every common-policy representative from the Hook matrix`が`15000ms` timeoutで失敗した記録がある。

### PR #127

Strict Runでは`pnpm run verify`で次の3件が確認されている。

- Windows launcherの5秒timeout 2件
- `executes every common-policy representative from the Hook matrix`の15秒timeout 1件

その後のfocused再実行ではmatrixはPASSし、Windows launcherの2件は同じ`5000ms` timeoutで再現した。

したがって、5秒launcher系と15秒matrix系を別経路として切り分ける。

### PR #133

- 標準`pnpm run test:contracts`で既存Hook case 1件がtimeoutした。
- bounded retryでは同じcaseに加えて別の既存launcher caseもtimeoutし、Run Artifactには`2 failed`と記録されている。
- 診断目的の`--testTimeout=30000`では成功した。
- PR #133自体はHook関連ファイルを変更していない。
- 保存済み情報だけでは、timeoutした正確なtest名をすべて確定できていない。

PR #133の正確な過去test名を復元すること自体はblockingにしない。今回のfile単体または`test:contracts`で、#140の2件・matrix以外のHook timeoutが再現した場合は、そのtestを今回の追加再現caseとして扱い、同じtest-only → productionの優先順位で切り分ける。

### PR #139との関係

#140作成時のfailureはPR #139の未commit working treeで発生した。一方、PR #139 current headではローカル`pnpm run verify` PASSの記録がある。

少なくとも次のHook関連ファイルにPR #139固有の直接差分は確認されていない。

```text
tests/contracts/codex-hook-contract.test.ts
.codex/hooks/pre_tool_use_policy_windows.ps1
.codex/hooks/pre_tool_use_policy.mjs
vitest.config.ts
```

#140をPR #139固有の回帰とは扱わない。

historical比較が必要な場合に参照するSHA:

```text
PR #139 base: 13cc542fa31f372bd4bc932cf7a82b92bcf81a23
PR #139 current head: a7632fad478ac5d28f53849ce950b1d205024f36
#142 Plan作成時 main: 12fff8eafccef4ab939efec623ac8a8d4f1ac539
```

`13cc542...`から`12fff8e...`の間にはPR #138由来の`sharp` / `pnpm-lock.yaml`変更があるため、historical比較時は各SHA自身のlockfileを使う。

### PR #106 / ADR-0021

Windows configured logging Hookで`5395ms`へ到達した記録は、Windows process起動に数秒かかる既知例としてのみ参照する。

今回の対象はPreToolUse contractであり、logging Hookの性能調査・修正は行わない。

## 3. 現在の実装と最小修正候補

### #140の2件

`runWindowsLauncher()`は次を1回ずつ起動する。

```text
Node test process
  -> powershell.exe
  -> pre_tool_use_policy_windows.ps1
     -> git -C <cwd> rev-parse --show-toplevel
     -> Get-Command node
     -> node pre_tool_use_policy.mjs
```

#140の2件が渡すcommandは次である。

- `git status --short`
- `rm -f sentinel.txt`
- Python command

これらは`getGitCommandContext()`の対象ではない。`git status`はread-only、`rm`とPython commandはGit invocationではない。

したがって、#140の第一候補はproduction Hook最適化ではない。

再現後は6個の`runWindowsLauncher()`呼び出しについて、test helperの外側から見た1回ごとの総時間だけを測る。

```text
safe root
safe nested
deny nested
compact stdin
LF stdin
CRLF stdin
```

判断では別scenario同士の時間が同程度であることを要求しない。確認するのは次である。

- 各launcher invocationが正常終了する。
- 同じscenarioを繰り返したときに著しい不安定、hang、異常な待機がない。
- 3 invocationの実測合計でtest全体時間の大部分を説明できる。
- 単一invocationだけにproduction異常を疑う待機がない。

この条件を満たし、3回の合計で5秒超過を説明できる場合は、launcher内部へ一時計測を追加しない。対象2 testの明示timeoutだけを最小修正候補とする。

明示timeoutの値は現在の標準計測分布から決める。既存`30000ms`を流用しない。

### Hook matrix

現在のmatrix testでは、`context`付きcaseは既存`runNodeHookWithExplicitContexts()`で1つのNode subprocessへまとめている。一方、`context`なしcaseはcaseごとに`runNodeHook()`を起動し、実Hook entrypointを通している。

この違いは単なる実装詳細ではない。`runNodeHookWithExplicitContexts()`は`evaluateCommand()`を直接呼ぶため、matrix全体をbatch化すると、contextなしcaseが現在通っている`validatePayload()`、`decidePayload()`、CLI stdin / stdout経路を通らなくなる。

そのため、matrix timeoutの修正をbatch化ありきで決めない。

再現後は次を確認する。

1. contextなしcaseの`runNodeHook()`各回が正常で、Node process反復の累積だけで15秒境界へ近づいているか。
2. 現在matrixが担う実Hook entrypointの回帰検出を、他の既存testだけで十分に維持できるか。
3. 実Hook entrypointを維持したままmatrix test固有timeoutを適正化する方が、保証範囲を変えず小さい変更にならないか。
4. batch化しても保証範囲が落ちず、かつ変更理由を説明できる場合に限り、既存`runNodeHookWithExplicitContexts()`の再利用を採用する。

matrix testのpolicy ID集合、allow / deny結果は維持する。

既存の専用testで確認している代表的な契約は少なくとも次である。

- malformed input
- safe command
- structured deny shape
- UTF-8 payload
- runtime Git context
- `git -C`
- Windows launcher transport
- missing root / missing Hook
- unexpected Node exit
- hung Node

ただし、これらが現在matrixの全contextなしrepresentativeに対する実Hook entrypoint検証と完全に同等とは事前に仮定しない。

matrix構造を変更しなくても、各`runNodeHook()`が正常で累積時間だけが問題なら、現在の保証範囲を維持したtest固有timeout調整を最小修正として選べる。

matrix全体をbatch化する場合も、新しいhelper、worker pool、process manager、benchmark utilityは作らない。

### configured Windows経路

実運用のconfigured PreToolUseは次である。

```text
cmd.exe
  -> outer git rev-parse --show-toplevel
  -> powershell.exe
     -> launcher内 git -C <cwd> rev-parse --show-toplevel
     -> Get-Command node
     -> node pre_tool_use_policy.mjs
```

外側とlauncher内でGit root解決が2回あるが、今回それだけを理由に片方を削除しない。

configured経路は、direct launcherやmatrixのtest-only修正で問題が閉じない場合だけ調査する。

## 4. timeout境界

現在の`main`では次を別々の契約として扱う。

- Vitest default test timeout: `5000ms`
- Hook matrix: `15000ms`
- Windows logging launcherの一部test: `15000ms`
- hung Node test: `20000ms`
- configured Windows launcherの一部test: `30000ms`
- PowerShell launcher内部のNode待機: `15000ms`
- `.codex/config.toml` PreToolUse runtime timeout: `30秒`

今回のVitest timeout対策として、launcher内部15秒やruntime 30秒を変更しない。

## 5. 変更対象の優先順位

### 第一候補

```text
tests/contracts/codex-hook-contract.test.ts
```

次で閉じられるかを最初に確認する。

- #140の2 testへ根拠のある明示timeoutを設定する。
- matrixは、現在の実Hook entrypoint検証を維持したtimeout調整と既存batch helper再利用を比較し、保証範囲を落とさない最小変更を選ぶ。
- file単体または`test:contracts`で別のHook timeoutが再現した場合は、そのtestについても同じ優先順位でtest-only修正を先に検討する。

### production異常を実測した場合だけ変更候補

```text
.codex/hooks/pre_tool_use_policy_windows.ps1
.codex/hooks/pre_tool_use_policy.mjs
.codex/config.toml
```

単一launcher / Node invocationの異常待機、I/O待機、process残存、不要なproduction処理を実測できた場合だけ変更する。

### 継続検出が必要と判断した場合

```text
.github/workflows/ci.yml
```

最終原因と修正内容を確定した後、Windows固有回帰をCIで継続検出する価値と維持コストを比較して追加要否を決める。

追加する場合も、フル`pnpm run verify`ではなく対象contract fileだけをWindowsで実行するfocused jobを第一候補とする。

### 原則として確認対象のみ

```text
vitest.config.ts
package.json
scripts/verify.ps1
```

今回の原因がこれらにあると確認できない限り変更しない。

### Run Artifact

```text
.codex/runs/<run_id>/
```

Repository規約に従って記録する。実装Runは原則`strict`とする。

## 6. 対象外

- Hook policyのG1-G10 / N1-N4 / A1-A17の意味変更
- PR #133の教材・Evidence validator変更
- PR #139の機能変更の再設計
- Expo dependency mismatch
- logging Hookの性能改善
- 新しいHook framework
- benchmark framework / dependency
- process manager
- launcher全体の抽象化・リファクタリング
- Git context cacheの一般化
- 原因未確認の30秒timeout化
- test skip / case削減 / assertion弱体化
- fail-closed緩和
- CI全体のWindows化
- #140 branchでの別実装

## 7. 実装手順

### 手順1: strict Runと環境を固定する

このIssueはPreToolUse安全Hookとfail-closed契約を変更候補に含むため、実装Runは原則`strict`とする。

同一タスクのactive `strict` Runがあれば再利用できる。なければRepository標準手順で新しい`strict` Runを作成する。actual `run.json`を直接編集しない。

開始時に少なくとも次を記録する。

```powershell
git branch --show-current
git status --short
git rev-parse HEAD
git rev-parse main
git merge-base main HEAD
Get-Command git | Select-Object -ExpandProperty Source
git --version
node --version
node -p "process.execPath"
pnpm --version
Get-Command powershell.exe | Select-Object -ExpandProperty Source
powershell.exe -NoProfile -Command '$PSVersionTable.PSVersion.ToString()'
powershell.exe -NoProfile -Command '(Get-Command node).Source'
[System.Environment]::OSVersion.VersionString
$env:PROCESSOR_ARCHITECTURE
$pwsh = Get-Command pwsh.exe -ErrorAction SilentlyContinue
if ($null -ne $pwsh) { $pwsh.Source; pwsh.exe --version } else { 'pwsh.exe: not found' }
```

`main`がremote最新状態を示す保証がない場合は、Repository規約に従って最新`main` / merge baseを確認する。

開始時に予期しないsource / test / config変更がある場合は、そのまま標準性能計測へ進まない。

`pwsh.exe`等の必要実行ファイルが存在しない場合は、timeoutとして数えず環境前提不足として記録する。

### 手順2: focused baselineを先に確認する

一時計測なし、デフォルトreporter、現行の個別timeout条件のまま次をfocused実行する。

#140の2件:

```powershell
pnpm exec vitest run tests/contracts/codex-hook-contract.test.ts --no-file-parallelism --maxWorkers=1 -t "preserves safe and deny semantics through the Windows launcher from root and nested cwd"
```

```powershell
pnpm exec vitest run tests/contracts/codex-hook-contract.test.ts --no-file-parallelism --maxWorkers=1 -t "keeps quote, backslash, LF, and CRLF stdin semantics through the launcher"
```

Hook matrix:

```powershell
pnpm exec vitest run tests/contracts/codex-hook-contract.test.ts --no-file-parallelism --maxWorkers=1 -t "executes every common-policy representative from the Hook matrix"
```

最初は各2〜3回で十分とする。PASSが続き分布確認が必要な場合のみ最大10回まで増やしてよい。

同じtimeoutが2回連続し新情報が増えない場合は、上限まで消化しない。

この時点ではlauncher内部やHook内部へ計測コードを入れない。

### 手順3: file / suiteの再現境界を固定する

focused baselineの後、次の順に標準条件を確認する。

1. `codex-hook-contract.test.ts` file単体
2. `pnpm run test:contracts`
3. 必要な場合だけ`pnpm run test`
4. `pnpm run verify`

file単体:

```powershell
pnpm exec vitest run tests/contracts/codex-hook-contract.test.ts --no-file-parallelism --maxWorkers=1
```

個別test名や実行順の確認が必要な場合だけ`--reporter=verbose`を診断runとして使う。

`--reporter=verbose`、一時計測、`--testTimeout=30000`を付けたrunは性能判断の基準値に使わない。

- `test:contracts`では安定し`verify`でのみ悪化する場合だけ`pnpm run test`を中間切り分けに使う。
- `verify`がcontract到達前にFAILしたrunはWindows timeoutのPASS / FAILへ数えない。
- file単体または`test:contracts`で、#140の2件・matrix以外のHook timeoutが再現した場合は、そのtest名、timeout値、実行時間、focusedでの再現有無を記録し、今回の追加再現caseとして扱う。
- PR #133の過去test名を完全復元できなくても、現在再現したcaseを優先して調査する。

ここまでで再現したcaseと再現境界を確定してから、以下の原因別調査へ進む。後続手順からこの手順へ戻る前提にしない。

### 手順4: #140は1 launcherごとの総時間だけ測る

#140の2件がfocusedまたはfile単体で再現した場合だけ実施する。

6個の`runWindowsLauncher()`呼び出しについて、test helper側から総時間だけ一時計測する。

- safe root
- safe nested
- deny nested
- compact stdin
- LF stdin
- CRLF stdin

判断基準:

- 各launcher invocationが正常終了する。
- 同じscenarioを複数回確認したとき、著しい不安定、hang、異常な待機がない。
- 3 invocationの実測合計とtest自身の処理で5秒超過を説明できる。
- 単一invocationだけにproduction異常を疑う待機がない。

別scenario同士の時間が同程度であることは条件にしない。safeとdeny、rootとnested等は処理内容が異なるため、scenario間の差だけでproduction異常と判断しない。

上記を満たす場合は原因を「aggregate test timeoutが実process数に対して短い」と判断し、次へ進まない。

- PowerShell script内部への詳細計測
- launcher内Git root最適化
- `Get-Command node`最適化
- Node Hook変更
- process残存調査

対象2 testへの明示timeout設定を第一候補として手順7へ進む。

同一scenarioの反復で異常なばらつき、hang、単一invocationだけで説明できない待機がある場合だけ手順6のproduction調査へ進む。

### 手順5: Hook matrixの最小修正を選ぶ

15秒matrix timeoutがfocused / file / suiteのいずれかで再現した場合だけ実施する。

まず現在のmatrix実行構造と各`runNodeHook()`の所要時間を確認する。

- `context`付きcase: `runNodeHookWithExplicitContexts()`でbatch
- `context`なしcase: caseごとに`runNodeHook()`で実Hook entrypointを通る

最初に確認すること:

- 各`runNodeHook()`は単体で異常なく完了するか。
- Node process反復の累積だけで15秒境界へ近づくか。
- matrix testが現在持つ実Hook entrypoint検証を、他の既存testでどこまで維持しているか。

修正候補は次の2つを比較する。

#### 候補A: 現在の実Hook entrypoint検証を維持してtest固有timeoutを調整する

採用条件:

- 各`runNodeHook()`に異常がない。
- 累積process時間だけで15秒超過を説明できる。
- 現在のmatrix構造を維持する方が保証範囲を明確に保てる。
- 標準計測分布からtimeout値と余裕幅を説明できる。

#### 候補B: 既存`runNodeHookWithExplicitContexts()`でmatrix全体をbatch評価する

採用条件:

- contextなしcaseが現在通っている実Hook entrypointの回帰検出を、他の既存testで十分維持できると確認できる。
- policy ID集合、allow / deny結果、runtime Git context契約を維持できる。
- 単なる速度優先ではなく、matrix testの責務をpolicy semanticsへ限定してよい根拠がある。
- 新しいhelperを追加せず既存helperだけで実装できる。

どちらも要求を満たす場合は、保証範囲を変えない候補Aを優先する。

batch化で既存contractの保証範囲を狭める可能性が残る場合は採用しない。

### 手順6: test-onlyで閉じられない場合だけproductionを調べる

次のいずれかが確認できた場合だけ実施する。

- #140で同一scenarioの単一`runWindowsLauncher()`に異常な遅延・hang・不安定がある。
- matrixのtest固有timeout調整でも保証範囲を保って解決できず、batch化も適切でない。
- #140 / matrix以外に再現したHook timeoutをtest構造だけで説明できない。
- focusedでは安定するがsuiteでのみ悪化し、process lifecycleとの相関がある。
- configured経路だけで再現する。

#### direct launcherで単一processが遅い場合

必要な箇所だけ測る。

- `powershell.exe` startup
- launcher内`git -C <cwd> rev-parse --show-toplevel`
- `Get-Command node`
- Node child process startup
- stdin copy / close
- stdout / stderr read
- `WaitForExit`
- process終了後cleanup

#### matrixのruntime Git contextが遅い場合

必要な場合だけ測る。

- `getGitCommandContext()`呼び出し数
- `git symbolic-ref --quiet refs/remotes/origin/HEAD`
- `git remote`
- `git branch --show-current`
- `git rev-parse --abbrev-ref --symbolic-full-name @{upstream}`

#140の2件ではこの経路を調べない。

#### suite限定で悪化する場合

対象実行由来のPID / ParentProcessId / CreationDateだけで相関を確認する。

`CommandLine`は必要な対象PID / 子孫PIDだけ取得し、生値をRun Artifactへ残さない。

マシン上の全`node.exe` / `powershell.exe` / `cmd.exe`の`CommandLine`を一括収集しない。

#### configured経路だけ遅い場合

次を分けて測る。

- `cmd.exe` startup
- outer `git rev-parse --show-toplevel`
- `powershell.exe` startup
- launcher内`git -C <cwd> rev-parse --show-toplevel`
- `Get-Command node`
- Node startup
- context-sensitive Git commandの場合だけHook内部Git context

外側とlauncher内のGit root解決が2回ある事実だけで削除しない。

### 手順7: 原因に応じて最小修正する

#### A. #140の3 launcher累積だけが原因

第一候補:

- 対象2 testへ根拠のある明示timeoutを設定する。

条件:

- 各`runWindowsLauncher()`が正常終了する。
- 同一scenarioの反復に異常なばらつきやhangがない。
- 3回の合計で5秒境界超過を説明できる。
- 直列3回を1 contractとして維持する意味がある。
- timeout値を現在の標準計測分布から説明できる。

この場合、production Hookは変更しない。

単なる回避として30秒へ広げない。

#### B. matrixのNode process反復が主因

まず現在の実Hook entrypoint保証を維持したtest固有timeout調整を検討する。

batch化は、手順5の条件を満たす場合だけ既存`runNodeHookWithExplicitContexts()`を再利用する。

どちらの場合もproduction Hookは変更しない。

#### C. その他のHook timeoutがtest構造だけで説明できる

#140 / matrix以外のcaseでも、複数subprocessの正常な累積やtest固有timeoutで説明できる場合は、そのtestだけを局所修正する。

既存の保証範囲を維持し、他testやglobal timeoutへ設定を広げない。

#### D. 単一launcher / Hookにproduction異常がある

実測で異常を確認した箇所だけ修正する。

- stdin EOF
- stdout / stderr drain
- `WaitForExit`
- timeout後Kill
- child process残存
- 不要なproduction Git / Node解決

launcherへpolicy判定を移さない。exit code `0` / `2`、stderr伝播、fail-closedを維持する。

#### E. Hook内部Git context取得がproduction原因

production invocation内で同じrepository contextを不要に再取得していることを実測した場合だけ再利用を検討する。

repository / cwd / `git -C`境界を跨いだcacheや一般化は行わない。

#### F. 現在非再現

sourceを推測変更しない。Issueは未解決のまま調査結果を残す。

### 手順8: historical baselineは最後の手段とする

現在の`main`で再現し、test-onlyまたはproductionの現在コードから原因を説明できる場合はhistorical SHA比較を行わない。

現行コードだけでは因果を閉じられない場合のみ、隔離したGit working treeで比較する。

使用できる例:

```text
git worktree add --detach <path> <sha>
独立Git clone + 対象SHA checkout
```

単純なファイルcopyは使わない。launcherがGit metadataを必要とするためである。

各baselineは自身のlockfileから依存を構築し、`node_modules`を共有しない。

```powershell
pnpm install --frozen-lockfile --ignore-scripts
git diff --exit-code -- package.json pnpm-lock.yaml
git rev-parse --show-toplevel
git status --short
```

比較対象:

```text
13cc542fa31f372bd4bc932cf7a82b92bcf81a23
12fff8eafccef4ab939efec623ac8a8d4f1ac539
a7632fad478ac5d28f53849ce950b1d205024f36
```

必要な測定値と判断だけを#142 active Runへ記録する。baseline側のraw logや一時計測コードは持ち込まない。

## 8. Windows CI

現時点のWeb CI `Vitest (contracts)`はUbuntuであり、Windows専用launcher処理を実行しない。既存Windows runnerはCodex artifact sanitizerで、`test:contracts`を実行していない。

ただし、Windows CI追加を実装前から前提にしない。

最終原因と修正内容を確定した後、次を確認する。

- 今回の回帰がWindowsでしか実行・検出できないか。
- 既存Ubuntu CIまたは別の既存jobで同じ回帰を十分検出できるか。
- 複数PRでの再発履歴に対して、Windows CI追加が手動確認より明確な再発防止効果を持つか。
- focused jobの維持コストが効果に見合うか。

追加する場合はフル`pnpm run verify`ではなく、まず次だけを実行するfocused jobを候補とする。

```text
tests/contracts/codex-hook-contract.test.ts
```

最終修正がtest-onlyであってもWindows固有回帰を既存CIで検出できないなら追加候補になり得る。一方、最終原因がOS非依存でUbuntu CIが同じ回帰を十分検出できるなら追加しない。

追加・非追加のどちらでも、Run Artifactへ判断根拠を残す。

## 9. 修正後の検証

### source / test / configを変更した場合に常に実行

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
- #140の2件の所要時間
- matrix testの所要時間
- 今回新たに再現したその他Hook timeout testの所要時間
- timeout / hanging subprocessの有無
- policy case失敗数

### 修正前に再現した経路

focusedで再現したtestは3回連続成功を確認する。

`pnpm run test`で再現した場合:

```powershell
pnpm run test
pnpm run test
```

`pnpm run verify`で再現した場合:

```powershell
pnpm run verify
pnpm run verify
```

前段failureでcontractが未実行のrunは成功回数へ数えない。

`verify`で再現しなかった場合でも、source / test / configを変更した場合は最終`pnpm run verify`を1回成功させる。

### Hook / configを変更した場合

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/verify.ps1
```

このrepositoryはconsumer repositoryのため`-StrictHarness`は付けない。

`scripts/verify.ps1`はRepository harness / config契約確認であり、Windows Vitest transport検証の代替にはしない。

### Run Artifact sanitizer後の最終確認

Run Artifactへ記録を反映してsanitizer Write / Checkを実行した後は、次だけを再確認する。

```powershell
pnpm run lint:markdown
git diff --check
git status --short
```

`pnpm run verify`には`format:check`、`lint:markdown`、`lint`、`typecheck`等が既に含まれる。sanitizer後にTypeScript source / testを変更していない限り、`format:check`、`lint`、`typecheck`を重ねて再実行しない。

sanitizer後にsource / test / configを追加修正した場合は、その変更に必要なfocused検証と`pnpm run verify`へ戻る。

### GitHub Actions

- Web CI `Vitest (contracts)`成功を確認する。
- focused Windows CIを追加した場合は、そのjob成功を必須とする。
- Ubuntuの所要時間をWindows性能値として使わない。

### timeoutを変更した場合

- 修正前・修正後を同一環境、同一command、同一test、デフォルトreporterで比較する。
- 変更前の生値、最小値・中央値・最大値を残す。
- 値と余裕幅を標準計測から説明する。
- 既存30秒testやruntime 30秒を根拠なく流用しない。
- failure後にさらにtimeoutを広げて回避しない。

## 10. 判断基準

### test-onlyで終了する条件

次のいずれかで問題を説明・解消できる場合はproduction Hookを変更しない。

- #140の2件が3回の正常なlauncher起動の累積だけで5秒を超える。
- matrixが現在の実Hook entrypoint保証を維持したtest固有timeout調整で安定する。
- matrixのbatch化が既存保証を落とさず、既存helperだけで安定化できる。
- その他のHook timeoutがtest内の正常なsubprocess累積またはtest固有timeoutで説明できる。
- production processに異常な待機、I/O異常、process残存の証拠がない。

### production launcherを変更できる条件

次のいずれかを単一launcher単位で実測した場合に限る。

- PowerShell / launcher処理に不要な待機がある。
- launcher内Git root解決やNode解決に異常な遅延がある。
- stdin EOF、stdout / stderr drain、`WaitForExit`、cleanupに異常がある。
- launcher由来child processがNode Hook完了後も残る。

### Hook本体を変更できる条件

- production Hook本体で不要な重複処理が実測できる。
- testだけの反復ではない。
- fail-closedとpolicy semanticsを維持できる。
- repository / cwd / `git -C`境界を跨いだ共有を発生させない。

#140の2件だけを根拠にHook内部Git contextを変更しない。#140では`getGitCommandContext()`が実行されない。

### source変更せず調査終了する条件

- 現在のfocused / file / suiteで再現しない。
- 必要なbaseline比較でも安定した差が出ない。
- production異常の証拠がない。

この場合はIssue #142を解決済みとせず、§1の記録を残す。

### 無関係なfailure

Issue #142との因果を確認できないfailureはこのIssueでsource修正しない。

必須検証が未達ならIssue解決済みとせず、blockerとして記録する。

## 11. リスク

- 5秒launcher系と15秒matrix系を同一原因へまとめると、不要なproduction変更へ広がる。
- PR #133の正確な過去test名の復元を必須にすると、現在再現できる問題より履歴探索へ時間を使う可能性がある。
- 逆に#140とmatrixだけへ固定すると、今回のfile / suiteで再現するその他Hook timeoutを取りこぼす可能性がある。
- #140の2件に`getGitCommandContext()`が関与すると誤認すると、実行されていない処理を最適化してしまう。
- 3 launcherの累積で説明できるのにlauncher内部を細分化すると、調査・変更範囲を不必要に広げる。
- safe / deny、root / nested等の別scenarioの時間差だけでproduction異常と判断すると、正常な処理差を原因と誤認する。
- matrix全体をbatch化すると、contextなしcaseが現在通っている実Hook entrypoint検証を失う可能性がある。
- matrixの実Hook entrypoint保証を維持できるなら、test固有timeout調整の方がbatch化より小さい変更になり得る。
- configured経路の二重Git root解決は今回の原因と確認するまで変更しない。
- historical baselineを早く実施すると、現在コードだけで閉じられる問題に不要な調査コストを使う。
- `--reporter=verbose`や一時計測自体がtimingへ影響するため標準計測と分離する。
- `pwsh.exe`等の環境不足をtimeoutへ混ぜない。
- `process.execPath`とPowerShell側Node pathが異なる場合は再現条件を分けて記録する。
- process調査で全processの`CommandLine`を収集しない。
- timeout延長だけでpolicy case、assertion、fail-closedの回帰を見落とさない。
- Windows CIを実装前から前提化すると、最終原因がOS非依存だった場合に不要なCI負荷を増やす。
- Windows CIを追加する場合もフル`verify`ではなくfocused contractを優先する。
- `pnpm run verify`後に同じ`format:check` / `lint` / `typecheck`を無条件に再実行すると、検証品質を増やさず実行時間だけ増える。

## 12. 成果物

### 必須

- 既知timeout履歴と今回の再現結果
- Windows / Node / pnpm / PowerShell / Git環境情報
- 開始時branch / HEAD / merge base / working tree状態
- focused baselineとfile / suiteの再現境界
- #140が再現した場合のlauncher総時間
- matrix timeoutが再現した場合の実行構造と保証範囲の確認結果
- その他Hook timeoutが再現した場合のtest名、timeout、focused / suite再現結果
- 原因判定、または現在非再現・原因未特定という判断
- 採用した最小修正と、production変更を避けた場合はその根拠
- Windows CI追加要否と根拠
- 修正後検証結果
- Run Artifact sanitizer Write / Check
- sanitizer後の`pnpm run lint:markdown` / `git diff --check` / `git status --short`

### 条件付き

- #140で単一launcher異常がある場合のみ: launcher内部計測
- matrixでtest固有timeout調整とbatch化の判断が必要な場合のみ: 実Hook entrypoint保証の比較結果
- matrixをtest-onlyで閉じられない場合のみ: Hook内部Git context計測
- その他Hook timeoutをtest-onlyで閉じられない場合のみ: 該当実行経路のprocess単位計測
- suite限定で再現する場合のみ: 対象PID / 子孫processとの相関確認
- configured経路だけ悪化する場合のみ: outer Git / PowerShell / inner Git等の分解
- 現行コードで原因を閉じられない場合のみ: historical baseline比較
- production Hook / config変更時のみ: `scripts/verify.ps1`
- Windows CI追加時: focused Windows job結果
- Hook runtime契約変更時のみ: `docs/PROJECT_CONTEXT.md`と必要なhistory / ADR

### 作成しないもの

- 新規benchmark framework
- 新規process manager
- 新規汎用batch framework
- Git context汎用cache
- #140 branch上の重複実装

## 13. 実装時の順序

1. `strict` Run、branch、最新`main`、merge base、working tree、Windows / Node / PowerShell / Git環境を固定する。
2. #140の2件とmatrixを現行timeout・デフォルトreporterでfocused実行する。
3. file単体 → `test:contracts` → 必要な場合`pnpm run test` → `verify`の順で再現境界を確定し、その他Hook timeoutもここで拾う。
4. 再現した#140だけ、6個の`runWindowsLauncher()`総時間を測る。
5. 同一scenarioに異常がなく、3回の正常なlauncher累積で説明できれば、対象2 testの明示timeoutだけを第一候補にする。production内部調査へ進まない。
6. matrixが再現した場合だけ、各`runNodeHook()`の時間と現在の実Hook entrypoint保証を確認する。
7. matrixは、保証範囲を維持したtest固有timeout調整と既存batch helper再利用を比較し、小さいだけでなく既存contractを保てる方を選ぶ。
8. #140 / matrix以外のHook timeoutが再現した場合は、そのtestを同じtest-only優先で切り分ける。
9. test-onlyで説明できない異常がある場合だけ、単一launcher / Hook / suite process / configured経路を必要な範囲で調べる。
10. 現行コードで因果を閉じられない場合だけhistorical baselineへ進む。
11. 原因に対する必要最小限の変更だけ実装する。
12. 最終原因と修正内容を確定した後、Windows CIの再発防止効果と維持コストを比較して追加要否を決める。
13. 一時計測を除去し、§9の検証、Run Artifact sanitizer、sanitizer後の最小確認を実施する。

先に30秒timeoutへ広げる、caseを削る、skipする、policyを弱める、production Hookを一般最適化する対応は行わない。