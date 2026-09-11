# Windows環境のCodex Hook contract timeout解消 計画

## 0. 依頼概要

- 対象: Issue #142「Windows環境でCodex Hook contractがtimeoutする問題を解消する」
- 統合元: Issue #140「test: Windows launcherのcontract testが5秒timeoutになる原因を調査する」
- 背景: PR #133のWindowsローカル検証で`pnpm run test:contracts`を実行すると、`tests/contracts/codex-hook-contract.test.ts`の既存Hook contractがtimeoutする事象が再現した。同じPR HEADのGitHub Actions Web CIではcontract suiteが成功しており、PR #133の教材・validator変更とは分離されたWindowsローカル依存の問題としてIssue #142へ切り出されている。
- 統合方針: Issue #140は同じtest file・Windows launcher経路で具体的な5秒timeoutを観測しているため、原因調査と修正はIssue #142へ統合する。`issue-140-windows-launcher-timeout` branchと#140 Planは履歴参照に限定し、実装・検証・PRは`fix/windows-codex-hook-contract-timeout`へ一本化する。
- 期待成果: Windowsで標準`pnpm run test:contracts`を複数回連続実行してもHook contractが環境依存timeoutで停止せず、既存Hook policy、fail-closed、allow / deny契約を維持した状態にする。

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

## 1. ゴール / 完了条件

### ゴール

WindowsローカルでCodex Hook contractがtimeoutする原因を実測で特定し、Issue #140で確認された5秒timeout 2件を含むWindows Hook contractを、必要最小限の修正で安定して完走できるようにする。

#140と#142で観測されたtimeoutが同一原因であることは事前に仮定しない。3回直列起動の累積、launcher 1回の異常、suite条件、Hook内部Git context取得、fixture処理等が複数同時に影響する可能性も残して切り分ける。

### 完了条件

- Issue #140で確認済みの次の2件について、historical failureと現在の再現結果を区別して記録している。
  - `preserves safe and deny semantics through the Windows launcher from root and nested cwd`: historical `5569ms`
  - `keeps quote, backslash, LF, and CRLF stdin semantics through the launcher`: historical `5071ms`
- #140の2件と#142で観測されたその他のtimeoutが、共通原因か別原因かを根拠付きで説明できる。
- WindowsでIssue #142のtimeoutを再現し、どのtest、subprocess、Git context取得、fixture処理、process lifecycle、またはsuite条件が所要時間へ寄与しているか説明できる。
- Node、pnpm、`powershell.exe`、`pwsh.exe`、`git`のpath / versionと、launcher内部で`Get-Command node`が解決するNode pathを記録している。
- `tests/contracts/codex-hook-contract.test.ts`のpolicy case数、policy ID集合、allow / denyの期待値、fail-closed検証を削減・弱体化していない。
- `.codex/hooks/pre_tool_use_policy.mjs`のHook policy semanticsを変更していない。変更が必要になった場合も、性能改善だけを理由にpolicy判定を緩めず、既存contractを維持する。
- `.codex/hooks/pre_tool_use_policy_windows.ps1`を変更する場合は、stdin / stdout / stderr、Node exit code、timeout時の停止、fail-closedのtransport契約を維持する。
- Windowsで対象Hook contract fileを3回連続で実行して成功する。
- Windowsで`pnpm run test:contracts`を3回連続で実行して成功する。
- `pnpm run verify`が成功する。今回差分と因果のない既存failureが発生した場合は修正範囲へ無条件に追加せず、blockerとして記録し、完了扱いにしない。
- `verify`が`test:contracts`到達前に停止したrunは、Windows launcher testをPASS / FAILへ数えず「未実行」と記録する。
- GitHub Actions Web CIの`Vitest (contracts)`が成功する。
- productionのWindows launcherまたは`.codex/config.toml`を変更した場合は、Repository固有の`scripts/verify.ps1`を実行し、Windows実行経路をCIで継続検証する必要性も判断する。
- timeout値を変更した場合は、変更前の生値、最小値・中央値・最大値、変更後の実測値、設定値と余裕幅の根拠を説明できる。
- `skip`、case削除、Assertion弱体化、fail-closed緩和、無制限または根拠のない過大timeoutで回避していない。
- 一時計測コード、調査用一時ファイル、予期しない生成物が最終差分に残っていない。
- `issue-140-windows-launcher-timeout` branchでは重複実装していない。

## 2. 統合した既知事実

### Issue #140のhistorical failure

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

#140作成時にはPR #139のworking treeで`pnpm run verify`がFAILしていた。一方、PR #139 current head `a7632fad478ac5d28f53849ce950b1d205024f36`の記録ではローカル`pnpm run verify`がPASSしている。historical failureを発生させた未commit working treeと現在のPR headを同一視しない。

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

`13cc542...`から`12fff8e...`の間にはPR #138由来の`sharp` / `pnpm-lock.yaml`変更があるため、historical baseline比較が必要になった場合は各SHA自身のlockfileから依存を構築する。

### Issue #142の既知事実

- PR #133のRun `20260911-232344-JST`では、標準`pnpm run test:contracts`が初回に既存Hook case 1件、bounded retryでは同じcaseに加えて別の既存launcher caseもtimeoutした。
- 診断目的の`--testTimeout=30000`実行は成功している。
- PR #133の対象変更はHook関連ファイルを変更していないため、Windowsローカル側の既存問題として#142へ分離された。
- #140で実測済みの2件とPR #133でtimeoutしたcaseが完全に同一かは現時点では未確定である。

## 3. 現状理解と前提

### contract実行条件

1. 標準contract入口は次である。

   ```text
   test:contracts = vitest run tests/contracts --no-file-parallelism --maxWorkers=1
   ```

   contract suite全体が単一worker・非並列で動くため、同一test内で同期的に起動するNode / PowerShell / Git subprocessの累積時間がtest所要時間へ反映される。

2. `pnpm run test`はunit → integration → repository → component → contractsの順で実行する。`pnpm run verify`はformat / lint / spec / typecheck / security等を通った後に`pnpm run test`を実行する。`verify`は`&&`で連結されているため、前段でFAILした場合は`test:contracts`まで到達しない。

3. 現在のVitestは`4.1.10`である。`vitest.config.ts`にはglobal `testTimeout`設定がなく、`test:contracts`にも`--testTimeout`指定がない。Node.js環境で個別timeoutを明示していないtestはVitest既定の`5000ms`が実効上限になる。

4. `tests/contracts/codex-hook-contract.test.ts`では少なくとも次の同期処理がある。

   - `runNodeHook()`: `spawnSync(process.execPath, [hookPath], ...)`
   - `runWindowsLauncher()`: `spawnSync("powershell.exe", ...)`
   - `runNodeHookWithExplicitContexts()`: policy case群を1つのNode subprocess内で`evaluateCommand()`へ渡す
   - `makeGitFixture()`: temporary directory作成、Hook copy、`git init`
   - `setFixtureBranch()`: `git symbolic-ref`
   - `removeFixture()`: recursive temporary directory削除
   - `runConfiguredWindowsCommand()`: Windows configured Hook contract用の`cmd.exe` / `pwsh.exe`起動

5. representative Hook matrixは、context付きcaseを`runNodeHookWithExplicitContexts()`でまとめて処理する一方、contextなしcaseはcaseごとに`runNodeHook()`を起動している。Node起動とHook内部Git context解決の反復は累積時間増加の候補だが、現時点では原因と確定しない。

### timeout境界

現在の`main`ではtimeoutが複数層に分かれる。これらを同じtimeoutとして扱わない。

- Vitest default test timeout: `5000ms`
- `executes every common-policy representative from the Hook matrix`: `15000ms`
- Windows logging launcherの一部test: `15000ms`
- `terminates a hung Node Hook with finite timeout and stderr`: `20000ms`
- current PowerShell shellやconfigured PreToolUseをまとめて確認する一部test: `30000ms`
- `.codex/hooks/pre_tool_use_policy_windows.ps1`がNode Hook終了を待つ内部timeout: `15000ms`
- `.codex/config.toml`のPreToolUse Hook runtime timeout: `30秒`

Issue #142作成時の本文にはmatrix testが30秒と記載されていたが、現在の`main`では`15000ms`である。実装開始時の現行コードを正本とする。

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
  - PR #106で追加された既存testであり、#140の2件とはprocess起動数・shell wrapper・保証内容・実行経路が異なるため、`30000ms`を今回のtimeout値として流用しない
- `terminates a hung Node Hook with finite timeout and stderr`
  - launcher内部`15000ms` timeoutを意図的に発火させる契約
  - test timeout `20000ms`
  - 正常でも約15秒の待機を含むため、通常性能の測定値へ混ぜない
- `preserves safe and deny semantics through the Windows launcher from root and nested cwd`
  - launcherをroot safe / nested safe / nested denyの3回同期実行
  - 明示timeoutなし = 実効`5000ms`
  - #140 historical failure: `5569ms`
- `keeps quote, backslash, LF, and CRLF stdin semantics through the launcher`
  - launcherをcompact JSON / LF / CRLFの3回同期実行
  - 明示timeoutなし = 実効`5000ms`
  - #140 historical failure: `5071ms`
  - test file上では`preserves PreToolUse policy through the configured Windows launcher and both shell wrappers`の直後に実行されるため、file単体でこのtestだけ悪化する場合は直前testとの相関を確認する
- `maps malformed input to launcher exit 2 with stderr`、`fails closed when repository root or Node Hook resolution fails`、`maps an unexpected Node non-zero exit to launcher exit 2`等も明示timeoutなしのため実効`5000ms`。

### Windows launcherの実行経路

`runWindowsLauncher()`はNode test helperから次の直接経路を使う。

```text
Node test process
  -> powershell.exe -NoProfile -ExecutionPolicy Bypass -File
  -> .codex/hooks/pre_tool_use_policy_windows.ps1
  -> node
```

この直接経路には`cmd.exe`を含まない。

実運用の`.codex/config.toml` `command_windows`は次の経路であり、#140の2件とは別経路である。

```text
cmd.exe
  -> powershell.exe
  -> pre_tool_use_policy_windows.ps1
  -> node
```

初期調査では#140の直接launcher経路とconfigured経路を混同しない。直接経路で説明できず、実運用wrapperとの比較が必要な場合だけconfigured経路を追加確認する。

`.codex/hooks/pre_tool_use_policy_windows.ps1`はrepository root解決、`Get-Command node`、Node child process起動、stdin転送、stdout / stderr回収、最大15秒の`WaitForExit`を行う。repository root解決では`git rev-parse --show-toplevel`を実行するため、Node / PowerShellだけでなく実際に解決されるGitも再現条件に含める。

### Hook内部Git context取得

`pre_tool_use_policy.mjs`の`getGitCommandContext()`はrepository context取得のため最大4つのGit subprocessを同期実行する。

```text
git symbolic-ref --quiet refs/remotes/origin/HEAD
git remote
git branch --show-current
git rev-parse --abbrev-ref --symbolic-full-name @{upstream}
```

各Git commandには`2000ms` timeoutが設定されている。`evaluateCommand()`は対象Git subcommandに対して、明示contextが渡されていない場合にcontext取得を実行するため、Node startupだけでなくHook内部Git subprocessも計測対象にする。

### 既存設計・CI・Repository規約

- `.codex/config.toml`のPreToolUse `timeout = 30`は既存runtime契約である。
- ADR-0016ではWindows PowerShell launcherをtransport責務に限定し、Node policyを正本とする。
- ADR-0021には、Windows configured launcherの既存probeでlogging `Stop`が`5395ms`に到達した記録がある。10秒付近へ継続的に到達する場合はtimeout拡大よりprocess startup / shell / Git / Node / filesystemを調査する方針である。
- `scripts/verify.ps1`はCodex harnessのWindows launcher契約を確認するRepository固有の検証で、`pnpm run verify`には含まれていない。
- GitHub Actions Web CIの`Vitest (contracts)`は`ubuntu-latest`で実行される。
- Windows専用testは`process.platform !== "win32"`でlauncher処理を抜けるため、Linux CI成功だけではWindows launcherの回帰確認にならない。
- Windows runnerを使う既存jobはCodex artifact sanitizerであり、`test:contracts`は実行していない。
- Repositoryでは`.codex/runs/<run_id>/`を正式なRun Artifactとして扱い、`REPORT.md`はappend-only、actual `run.json`はmachine-managedとする。
- Repositoryの再試行方針では、同一エラー2回連続、同じ工程3回失敗、新しい情報なし、仮説なしの場合は無目的な再試行を止めて原因調査へ戻る。
- Repositoryへ追加するRun Artifactは完了前に`scripts/sanitize-codex-artifacts.ps1`のWrite / Checkが必要である。

### 前提

- Issue #142の目的はWindowsローカルcontractの安定化であり、Codex Hook policy自体の仕様変更ではない。
- Windows Defender等の外部負荷は観測対象に含めるが、外部要因を前提にtimeoutだけを拡大しない。
- 一時的な計測コードやログは原因特定に必要な範囲で使用してよいが、恒久的な大量ログは追加しない。
- 一時diagnosticなしの標準計測と、一時diagnosticありの詳細計測は別データとして扱う。
- diagnosticでは`HookResult`、stdout / stderr、exit code、payload contractを変更しない。
- process残存はprocess名や件数だけで判断せず、対象実行で生成されたPIDと親子関係・生成時刻・CommandLineを可能な範囲で照合する。
- 既存のNode / Git / PowerShellを使って調査し、新規dependencyは追加しない。
- 性能比較はbenchmark frameworkを導入せず、同一条件の複数回実行で確認する。
- #140のhistorical failureを再現できなくても、過去の失敗記録自体を否定しない。
- 計測回数の上限は証拠収集の上限であり、同一failureを無目的に繰り返す回数ではない。

### 対象外

- PR #133の教材・Evidence validator変更
- PR #139の契約変更内容の再設計
- Expo dependency mismatch
- Hook policyのG1-G10 / N1-N4 / A1-A17の意味変更
- 新しいHook framework、benchmark framework、process managerの導入
- Codex Run Artifact基盤、logging Hook基盤、sandbox設計の再設計
- Windowsローカル以外への一般的な性能最適化
- 原因未確認のまま5秒から30秒へtimeoutを延長すること
- 対象testのskip / 除外
- CI全体のtimeout緩和
- 原因が確認されていない段階での`.github/workflows/**`変更
- launcherやprocess管理の全面的な抽象化・リファクタリング
- test分割だけで実行時間を改善したと扱うこと
- #140用branchでの別実装

## 4. リポジトリ構成と処理経路

### 主な対象

- `package.json`
  - `pnpm run test:contracts`
  - `pnpm run test`
  - `pnpm run verify`
- `vitest.config.ts`
  - global `testTimeout`未指定
- `tests/contracts/codex-hook-contract.test.ts`
  - Node Hook contract
  - Windows PreToolUse launcher contract
  - configured Windows logging launcher contract
  - Git fixtureを使うcontext contract
- `.codex/config.toml`
  - PreToolUse `command_windows`
  - runtime timeout `30秒`
- `.codex/hooks/pre_tool_use_policy_windows.ps1`
  - WindowsからNode Hookへstdin / stdout / stderr / exit codeをtransportするlauncher
  - Node Hook待機`15000ms`
- `.codex/hooks/pre_tool_use_policy.mjs`
  - policy matrix、Hook payload処理、Git context解決、policy判定
  - `getGitCommandContext()`内Git command timeout `2000ms`
- `.github/workflows/ci.yml`
  - Ubuntu上の`Vitest (contracts)`
  - Windows上では現在Vitest contractsを実行しない
- `scripts/verify.ps1`
  - Codex harnessのWindows launcher契約確認
- `.codex/runs/<run_id>/`
  - 調査結果・判断・検証結果を残すRun Artifact

### 処理経路

```text
pnpm run test:contracts
  -> Vitest / tests/contracts / single worker
  -> codex-hook-contract.test.ts
     -> Node Hook direct subprocess
        -> pre_tool_use_policy.mjs
        -> 対象Git commandではgetGitCommandContext()
           -> 最大4つのGit subprocess
     -> Windows direct launcher
        -> powershell.exe
        -> pre_tool_use_policy_windows.ps1
        -> git rev-parse --show-toplevel
        -> node
     -> Git fixture作成 / branch設定 / cleanup
     -> configured Windows command contract
        -> cmd.exe または pwsh.exe
        -> Hook launcher / logger
```

### 既存テストが担う契約

- malformed / out-of-contract input: payload validationとfail-closed
- safe command: CLI entrypointのexit 0 / stdout・stderr契約
- structured deny: CLI entrypointの`hookSpecificOutput`
- policy matrix: G1-G10 / N1-N4 / A1-A17の代表caseとallow / deny semantics
- explicit context contract: pure policy evaluation
- `git -C`、複数repository、branch / cwd / environment transition: runtime repository contextとmutation判定
- Windows direct launcher: stdin / stdout / stderr / exit code transport
- configured Windows launcher: `.codex/config.toml`のcommand経路、`cmd` / `pwsh`、root / nested cwd
- malformed / missing root / missing Hook / unexpected Node exit / hung Node: Windows launcherのfail-closedと有限timeout
- Windows logging launcher: logging side effectとStop系fallback

### 変更候補の優先順位

1. `tests/contracts/codex-hook-contract.test.ts`内の重複subprocess起動やfixture setupを、既存契約を維持したまま整理する。
2. subprocess lifecycleに実際の不具合がある場合だけ、`pre_tool_use_policy_windows.ps1`のtransport処理を局所修正する。
3. Hook本体が同一invocation内で不要なGit subprocessを繰り返していることが実測で確認された場合だけ、policy semanticsを変えない範囲で`pre_tool_use_policy.mjs`のcontext取得を整理する。
4. timeout変更は、不要な重複やlifecycle不具合を除いた後でも正常処理が既存閾値を合理的に超えると実測できた場合に限る。

## 5. 未確認事項

- PR #133の初回とretryでtimeoutした正確なtest name。
- PR #133のtimeout対象が#140の2件と同一か、一部だけ同一か、別testか。
- 現在の`main`で#140の5569ms / 5071msを再現できるか。
- historical failureを発生させたPR #139の未commit working treeを完全に復元できるか。
- 特定の1 subprocessが遅いのか、1 test内の複数process起動の累積で実効timeoutを超えるのか。
- Node startup、PowerShell startup、launcher内`git rev-parse`、`Get-Command node`、Hook内部`getGitCommandContext()`、fixture作成 / cleanupのどれが支配的か。
- stdin EOF、stdout / stderr drain、child exit待ちで遅延している経路があるか。
- focusedでは安定し、file単体 / full contracts / `pnpm run test` / `verify`でのみ悪化する条件があるか。
- Windows負荷によるばらつきと、実装側の再現可能な遅延をどこまで分離できるか。

実装開始前にユーザーへ確認が必要なblocking questionはない。確認可能な内容は実測して判断する。

## 6. 実装手順

### 手順1: 実装開始時の状態と環境を固定する

- [ ] `fix/windows-codex-hook-contract-timeout`のHEAD、最新`main` HEAD、merge base、`main...branch`差分を記録する。
- [ ] `issue-140-windows-launcher-timeout` branchは実装対象にせず、#140 Planとhistorical evidenceの参照だけに使う。
- [ ] 同一会話のactive RunがあればRepository規約に従って再利用し、なければ標準手順でRunを初期化する。actual `run.json`を直接作成・編集しない。
- [ ] 実装開始後にHook関連変更が`main`へ入っていれば内容を確認し、古いPlan前提をそのまま使わない。
- [ ] 計測環境として少なくとも次を記録する。

```powershell
git rev-parse HEAD
Get-Command git | Select-Object -ExpandProperty Source
git --version
node --version
pnpm --version
Get-Command powershell.exe | Select-Object -ExpandProperty Source
powershell.exe -NoProfile -Command '$PSVersionTable.PSVersion.ToString()'
powershell.exe -NoProfile -Command '(Get-Command node).Source'
Get-Command pwsh.exe | Select-Object -ExpandProperty Source
pwsh.exe --version
```

必要なら`codex --version`も記録する。

### 手順2: #140のhistorical failureを現在の条件で確認する

まず次の2件を別々に、一時diagnosticなし・Vitest既定timeoutのままfocused実行する。

```powershell
pnpm exec vitest run tests/contracts/codex-hook-contract.test.ts --no-file-parallelism --maxWorkers=1 -t "preserves safe and deny semantics through the Windows launcher from root and nested cwd"
```

```powershell
pnpm exec vitest run tests/contracts/codex-hook-contract.test.ts --no-file-parallelism --maxWorkers=1 -t "keeps quote, backslash, LF, and CRLF stdin semantics through the launcher"
```

- [ ] #140 historical値 `5569ms` / `5071ms`と現在値を区別して記録する。
- [ ] 各testは最大10回を上限とし、実際に実行した全runの生値、PASS / FAIL、最小値、中央値、最大値を記録する。
- [ ] PASSが続く場合はばらつき把握のため最大10回まで取得してよい。
- [ ] 同じtimeout failureが2回連続し、新しい情報が増えない場合は残り回数を消化せず詳細調査へ進む。
- [ ] 同じ工程3回失敗、新しい情報なし、仮説なし等、Repositoryの再試行停止条件に達した場合も無目的に再試行しない。
- [ ] timeout確認のためだけに恒久コードを変更しない。

### 手順3: #142全体のfailureとsuite条件を確認する

- [ ] `tests/contracts/codex-hook-contract.test.ts`内のWindows関連testを一覧化し、各testについてtest name、Windows専用か、明示timeout、実効timeout、主要process数、意図的待機の有無を記録する。
- [ ] default `5000ms`、matrix `15000ms`、logging `15000ms` / `30000ms`、hung Node `20000ms`、launcher内部`15000ms`、Codex runtime `30秒`を別境界として扱う。
- [ ] 対象file単体をverbose実行してtimeoutするtest nameと実時間を記録する。

```powershell
pnpm exec vitest run tests/contracts/codex-hook-contract.test.ts --no-file-parallelism --maxWorkers=1 --reporter=verbose
```

- [ ] 標準`pnpm run test:contracts`を修正判断前に最大3回実行する。再試行停止条件に達した場合は上限まで消化しない。
- [ ] `pnpm run verify`を修正判断前に最大2回実行し、対象Windows testまで到達したかを各runで記録する。
- [ ] `verify`が`test:contracts`到達前にFAILした場合、対象testは「未実行」とし、launcher timeout再現回数へ含めない。最初にFAILした工程を別に記録する。
- [ ] `test:contracts`では安定し`verify`でのみ対象testが悪化する場合だけ、`pnpm run test`を中間切り分けとして実行する。
  - `pnpm run test`でも再現する: unit / integration / repository / component等の先行test suite実行との相関を確認する。
  - `pnpm run test`では再現しない: `verify`内の`pnpm run test`より前のformat / lint / spec / typecheck / security等との相関を確認する。
- [ ] `--testTimeout=30000`は診断用比較としてのみ使用し、恒久修正の結論にはしない。
- [ ] #140の2件と#142のその他timeoutが同じ条件で悪化するかを確認する。
- [ ] file単体でquote / LF / CRLF testだけ悪化する場合は、直前の`preserves PreToolUse policy through the configured Windows launcher and both shell wrappers`との相関を優先して確認する。

### 手順4: historical baseline比較が必要か判断する

現在の`main`で#140の2件または同等のlauncher問題が十分に再現し、原因を現行コード上で説明できる場合は、古いSHA比較を必須にしない。

現在の`main`で#140のhistorical failureを再現できず、PR #139との因果が未解決の場合だけ、次の比較を行う。

- historical baseline `13cc542fa31f372bd4bc932cf7a82b92bcf81a23`
- #140 branch作成時main baseline `12fff8eafccef4ab939efec623ac8a8d4f1ac539`
- 必要な場合のみPR #139 current head `a7632fad478ac5d28f53849ce950b1d205024f36`
- latest mainが`12fff8e...`から進み、timeout経路または依存に関連変更がある場合のみlatest main

baseline比較では同じWindows PC・同じtoolchain条件を使い、各SHA自身のlockfileから依存を構築する。

```powershell
pnpm install --frozen-lockfile --ignore-scripts
git diff --exit-code -- package.json pnpm-lock.yaml
```

- [ ] 各baselineでfocused testを先に確認する。
- [ ] 必要な場合だけ`test:contracts`、さらにhistorical failureが`verify`条件に依存する可能性が残る場合だけ`verify`まで確認する。
- [ ] baseline間で一方だけ5秒timeoutを繰り返す、または5秒境界の判断を変える差が出た場合だけ、実行順を反転して再確認する。
- [ ] 順序を反転しても差が残ることを確認するまで、PR #138以降のdependency / lockfile差分を原因と断定しない。
- [ ] PR #139 current headでPASSしても、historical failureを発生させた未commit working treeのfailure自体は否定しない。

### 手順5: focusedで再現したtestの所要時間を呼び出し単位へ分解する

focusedで再現したtestだけ、3回累積とlauncher 1回の異常を区別するために一時diagnosticを追加する。

#140の2件では少なくとも次を個別に測る。

- safe root
- safe nested
- deny nested
- compact stdin
- LF stdin
- CRLF stdin

さらに必要に応じて次を分ける。

- `runNodeHook()` 1回
- `runNodeHookWithExplicitContexts()`のbatch
- `getGitCommandContext()`の各Git command
- 1 Hook invocationあたりのGit subprocess数
- `runWindowsLauncher()` 1回
- `powershell.exe`空起動相当とlauncher実行の差
- `git init` / `git symbolic-ref` / Hook file copy / `fs.rmSync`
- stdinを書き終えた後からchild process exitまで
- stdout / stderr read完了待ち

- [ ] diagnosticありの値は標準計測と別データとして扱う。
- [ ] `HookResult`やlauncher stdout / stderrへ計測値を混ぜない。
- [ ] 該当する各呼び出しについて必要な範囲で複数回の生値、最小値、中央値、最大値を記録する。
- [ ] 3回合計とVitestのtest全体時間も比較する。
- [ ] 全呼び出しが同程度で累積を説明できるか、特定呼び出しだけ遅いかを区別する。
- [ ] 意図的なhung testは通常launcher性能の測定値へ混ぜない。

### 手順6: suiteでのみ悪化する場合を切り分ける

focusedでは安定し、file単体 / full contracts / `pnpm run test` / `verify`のいずれかでのみ悪化する場合だけ実施する。

- [ ] focused → `codex-hook-contract.test.ts` file単体 → full `test:contracts`の順で悪化し始める境界を確認する。
- [ ] `test:contracts`では安定し`verify`でのみ悪化する場合は手順3の`pnpm run test`切り分けを使う。
- [ ] quote / LF / CRLF testだけfile単体で悪化する場合は、直前のconfigured Windows launcher testの実行有無・順序を変えた際に遅延が追従するか確認する。
- [ ] 対象test直前の実行内容と遅延に相関があるか確認する。
- [ ] process残存を疑う場合、process名や件数だけで判断しない。対象launcher由来のPID、ParentProcessId、CreationDate、CommandLineを照合する。

必要な場合の確認例:

```powershell
Get-CimInstance Win32_Process |
  Where-Object { $_.Name -in @("powershell.exe", "pwsh.exe", "cmd.exe", "node.exe") } |
  Select-Object ProcessId, ParentProcessId, CreationDate, Name, CommandLine
```

可能なら一時diagnosticでlauncher PIDを記録し、対象実行で生成されたprocessと子processだけを追う。既存の別用途Node / PowerShellを原因候補へ含めない。

相関を確認できない場合は「suite負荷が原因」と断定せず、suite条件でのみ再現する未特定事象として残す。

### 手順7: launcher 1回の異常がある場合だけPowerShell内部を詳細計測する

launcher 1回に異常な待機または大きなばらつきが確認された場合だけ、`.codex/hooks/pre_tool_use_policy_windows.ps1`内部へ一時計測を追加して次を区別する。

- repository root解決の`git rev-parse --show-toplevel`
- `Get-Command node`
- Node child process起動
- stdin copy / close
- stdout / stderr read
- `WaitForExit`
- process終了後cleanup

PowerShell processそのものの起動時間はtest helper側から測る。PowerShell内部instrumentationだけでprocess起動前の時間を測ったことにしない。

### 手順8: 原因に応じて最小修正する

#### 同一test内のsubprocess累積が主因の場合

- launcher 1回は正常でも3回合計が5秒を超える場合、単一launcher不具合とは扱わない。
- policy matrixの全caseとexpected allow / denyを維持する。
- pure policy semanticsを確認するcaseは、既存`runNodeHookWithExplicitContexts()`相当のbatch評価を再利用できるか確認する。
- batch化前にpayload validation、CLI entrypoint、structured deny、runtime Git context、`git -C`、Windows transport、missing root / Hook、unexpected Node exit、hung Node等の実process契約が別testで残ることを対応付ける。
- 実process境界testまでpure `evaluateCommand()`呼び出しへ置き換えない。
- test分割は外部processの総実行時間を減らさない。safe root / safe nested / deny nested、またはcompact / LF / CRLFを独立contractとして扱えること、個別timeout境界に意味があることを説明できる場合だけ検討する。単なる5秒回避では採用しない。

#### PowerShell launcherまたはprocess lifecycleが主因の場合

- stdin `CopyTo()`、stdin close、stdout / stderr async read、`WaitForExit()`、timeout後Killの順序を実測と照合する。
- EOFが届かない、redirect stream待ち、child exit待ち等の具体的な不具合が確認できた箇所だけ修正する。
- launcherへpolicy判定を移さない。
- exit code `0` / `2`、stderr伝播、timeout時fail-closedを維持する。
- hung Node testの15秒待機はproduction launcherの有限timeout契約なので、test高速化目的で短縮しない。

#### Hook内部Git context取得が主因の場合

- `getGitCommandContext()`内のどのGit commandが遅いかを特定する。
- 同一Hook invocationで同じrepository contextを不要に再取得している場合だけ、安全に再利用できるか検討する。
- `git -C`、複数repository、cwd transitionを跨いでcontextを共有しない。
- Git command失敗時のfail-closed判断を弱めない。
- testだけの重複でruntimeでは重複していない場合、production Hookへ最適化を入れない。

#### fixture反復が主因の場合

- 同じ意味のfixture setupを安全に共有できるtestだけを特定する。
- branch state、remote、filesystem stateがtest間で漏れる場合は共有しない。
- fixture共有より、不要な`git init` / copyの重複を局所的に減らせる既存helper再利用を優先する。

#### 実装側の異常がなくtest固有timeoutだけが短い場合

次のすべてを満たす場合だけ対象test固有timeoutの変更を検討する。

- launcher内部に不要な待機を確認できない。
- 複数回直列起動を1つのcontractとして維持する合理性がある。
- 一時diagnosticなしの標準計測で既存timeout超過が通常のばらつきとして確認できる。
- 変更対象を該当testへ限定できる。
- timeout値を変更前の生値、最大値、ばらつきから説明できる。
- 既存`30000ms` testは比較済みだが、その値を流用していない。

`.codex/config.toml`のruntime 30秒やlauncher内部15秒を、Vitest aggregate timeoutの都合だけで変更しない。

#### 現在は再現せず変更根拠がない場合

- sourceを推測変更しない。
- historical failureと現在の非再現を区別して記録する。
- historical baseline比較でも原因を確定できない場合は未特定として残す。
- 「Windowsだから遅い」「cold cacheだから」「5秒が短い」という説明だけを修正根拠にしない。

### 手順9: 回帰テストとCIを整える

- [ ] 原因修正を検出できる既存contractがある場合は重複testを増やさず、そのcontractを維持する。
- [ ] process lifecycle不具合を修正した場合だけ、そのfailureを直接再現できる回帰testを追加する。
- [ ] 性能の絶対値を厳密にassertする新規benchmark testは追加しない。
- [ ] policy ID集合、malformed input、allow / deny、quote / backslash、LF / CRLF、cwd、exit code、stdout / stderr、Windows launcherの既存契約を維持する。
- [ ] test構造またはtest固有timeoutだけを変更し、production Windows経路を変更しない場合は、新しいWindows CI jobを原則追加しない。
- [ ] `.codex/hooks/pre_tool_use_policy_windows.ps1`、`.codex/hooks/pre_tool_use_policy.mjs`、`.codex/config.toml`のいずれかを変更した場合はRepository固有検証として次を実行する。

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/verify.ps1
```

- [ ] production Windows経路を変更した場合は、`.github/workflows/ci.yml`でfocused contractを`windows-latest`実行する必要性を確認する。
- [ ] Linux `Vitest (contracts)`成功をWindows launcher検証の代替にしない。

### 手順10: 一時計測とRun Artifactを整理する

- [ ] 一時計測用ログ、temporary script、raw timing outputを最終source差分から除外する。
- [ ] 将来の診断にも必要な小さなhelperだけが残る場合は、現在のtest責務から必要性を説明できるものに限定する。
- [ ] 新規dependency、benchmark framework、設定切替は追加しない。
- [ ] active Runの`TASKS.md`を更新する。
- [ ] `REPORT.md`へhistorical evidence、実行した全runの値、停止理由、原因判定、修正内容、採用しなかった主要案、未確認点、blocker、検証結果をappend-onlyで追記する。
- [ ] actual `run.json`はmachine-managed経路に任せ、直接編集しない。
- [ ] Repositoryへ追加するRun ArtifactへsanitizerのWrite / Checkを実行する。

```powershell
./scripts/sanitize-codex-artifacts.ps1 -Path ".codex/runs/<run_id>" -Write
./scripts/sanitize-codex-artifacts.ps1 -Path ".codex/runs/<run_id>" -Check
```

- [ ] sanitizer後の最終ファイル状態で`pnpm run lint:markdown`と`git diff --check`を実行する。
- [ ] sanitizer後にRun Artifactを修正した場合は`-Check`、`pnpm run lint:markdown`、`git diff --check`を再実行する。
- [ ] 最終検証結果を記録するためだけに`REPORT.md`を再編集して、検証済み状態を崩さない。
- [ ] `git status --short`でtracked / untrackedの最終状態を確認し、一時diagnostic、予期しない生成物、無関係な変更が残っていれば完了しない。

## 7. 検証方法

### #140統合対象のfocused計測

修正前は各test最大10回を上限に、生値、PASS / FAIL、最小値、中央値、最大値を記録する。再試行停止条件に達したら上限まで消化しない。

```powershell
pnpm exec vitest run tests/contracts/codex-hook-contract.test.ts --no-file-parallelism --maxWorkers=1 -t "preserves safe and deny semantics through the Windows launcher from root and nested cwd"
```

```powershell
pnpm exec vitest run tests/contracts/codex-hook-contract.test.ts --no-file-parallelism --maxWorkers=1 -t "keeps quote, backslash, LF, and CRLF stdin semantics through the launcher"
```

### Windows対象file検証

修正後、対象fileを連続3回実行する。

```powershell
pnpm exec vitest run tests/contracts/codex-hook-contract.test.ts --no-file-parallelism --maxWorkers=1
pnpm exec vitest run tests/contracts/codex-hook-contract.test.ts --no-file-parallelism --maxWorkers=1
pnpm exec vitest run tests/contracts/codex-hook-contract.test.ts --no-file-parallelism --maxWorkers=1
```

各回で記録する。

- file全体所要時間
- 修正対象testの所要時間
- #140の2件の所要時間
- timeout / hanging subprocessの有無
- policy case数と失敗数
- Windows launcherのsafe / deny / malformed / fail-closed / hung契約の結果

### Windows標準contract検証

```powershell
pnpm run test:contracts
pnpm run test:contracts
pnpm run test:contracts
```

3回とも成功することを安定性判定とする。1回だけ成功した状態では完了扱いにしない。

### リポジトリ標準検証

```powershell
pnpm run format:check
pnpm run lint
pnpm run typecheck
pnpm run test:contracts
pnpm run verify
pnpm run lint:markdown
git diff --check
git status --short
```

`verify`内で既に実行される項目との重複は、途中の局所確認と最終確認として許容する。

### Hook / config変更時

`.codex/hooks/pre_tool_use_policy_windows.ps1`、`.codex/hooks/pre_tool_use_policy.mjs`、`.codex/config.toml`のいずれかを変更した場合だけ次を追加する。

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/verify.ps1
```

### GitHub Actions

- Web CIの`Vitest (contracts)`が成功することを確認する。
- UbuntuではWindows launcher処理が実行されないため、CIのtest時間をWindows性能比較値として使わない。
- production Windows経路を変更してfocused Windows CIを追加した場合は、その`windows-latest` jobも成功することを確認する。

### timeout変更時の追加確認

- 変更前・変更後で同一環境、同一command、同一対象testの実時間を比較する。
- default 5秒、test固有15秒 / 20秒 / 30秒、launcher内部15秒、Codex runtime 30秒のどれを変更したか明記する。
- 値を変更しなかったtimeoutについても、変更不要と判断した根拠を説明する。
- test固有timeoutを変更した場合、修正後に旧5秒境界でPASSすることは完了条件にしない。新しい通常コマンドで安定し、設定値を変更前の実測分布から説明できることを確認する。
- failureが出た場合に値をさらに広げて回避しない。
- hung Node testのように意図的な待機を含むtestは通常処理の性能値と分ける。

### Run Artifact確認

```powershell
./scripts/sanitize-codex-artifacts.ps1 -Path ".codex/runs/<run_id>" -Write
./scripts/sanitize-codex-artifacts.ps1 -Path ".codex/runs/<run_id>" -Check
pnpm run lint:markdown
git diff --check
git status --short
```

Run Artifactを変更した場合はsanitizer後の状態を正本として再確認する。

## 8. 判断基準

### 原因の扱い

- #140の2testは別々に評価する。
- 3回累積、launcher 1回の異常、suite条件、Hook内部Git context等は排他的とは扱わない。
- 複数要因が成立する場合はそれぞれの証跡と寄与範囲を記録する。
- #140の2件と#142のその他timeoutに共通原因が確認できる場合は、症状ごとの個別回避より共通原因の最小修正を優先する。
- 共通原因を確認できない場合は無理に同じ修正へ統一しない。

### production launcherを変更しない条件

次を満たす場合はproduction launcherを変更しない。

- 1回の`runWindowsLauncher()`に異常な待機を確認できない。
- 対象実行由来のprocess残存やI/O待機の異常を示す証跡がない。
- 3回累積、suite条件、test固有timeout、または非再現で説明可能である。

### test分割を検討できる条件

次のすべてを満たす場合だけ検討する。

- safe root / safe nested / deny nested、またはcompact / LF / CRLFを独立したcontractとして扱える。
- 各caseへ個別のtimeout境界を適用する意味を説明できる。
- 既存assertionと保証範囲を維持できる。
- 分割しても外部processの総実行時間は減らないことを認識している。
- 単に5秒timeoutを回避するためだけの分割ではない。

### test固有timeoutを変更できる条件

次のすべてを満たす場合だけ検討する。

- launcher内部に不要な待機を確認できない。
- 直列起動を1つのcontractとして維持する合理性がある。
- 一時diagnosticなしの標準計測で既存timeout超過が通常のばらつきとして確認できる。
- 変更対象を該当testへ限定できる。
- timeout値を変更前の生値、最大値、ばらつきから説明できる。
- 同じtest fileの既存`30000ms`は参考情報として比較済みだが、値を流用していない。

### launcherを変更する条件

次のいずれかを実測で確認した場合に限る。

- 1回のPowerShell起動またはlauncher処理に不要な待機がある。
- launcher内`git rev-parse`やNode解決に実測上の不要な遅延がある。
- stdin EOF、stdout / stderr drain、`WaitForExit`、cleanupで異常待機がある。
- 対象launcher実行から生成されたchild processがNode Hook完了後も残り、test終了を遅らせている。

性能改善だけを理由に安全性、fail-closed、exit code、stdout / stderr contractを弱めない。

### Hook本体を変更する条件

- `getGitCommandContext()`等、production Hook本体で実際に不要な重複処理があり、testだけの重複ではないことを実測で確認している。
- repository / cwd / `git -C`境界を跨いだ誤ったcontext共有を発生させない。
- fail-closedとpolicy semanticsを維持できる。

### suite条件の問題として扱う条件

- focusedでは安定するが、file単体またはfull `test:contracts` / `pnpm run test` / `verify`で再現性を持って悪化する。
- `test:contracts`では再現せず`verify`だけで再現する場合は`pnpm run test`で先行test suiteと`verify`前工程を分ける。
- quote / LF / CRLF testだけfile単体で悪化する場合は、直前のconfigured Windows launcher testとの相関を優先して確認する。
- process残存を根拠にする場合は、PID / 親PID / 生成時刻 / CommandLineから対象実行由来であることを確認する。
- 相関を確認できない場合は「suite負荷が原因」と断定しない。
- 「cold cache」「Windowsが遅い」等を証跡なしで原因として採用しない。

### historical baseline / PR #139 headを追加計測する条件

- 現在の`main`でhistorical failureを再現できず、PR #139との因果を現行コードだけで閉じられない場合だけhistorical baseline比較を行う。
- historical baselineで同じfailureが再現した場合、PR #139固有変更は必要条件ではないためPR #139 head追加計測を必須にしない。
- historical baselineで再現せず、PR #139 base / headの静的差分だけでも因果を閉じられない場合だけcurrent headを追加計測する。

### 変更なしで終了できる条件

次のいずれかに該当し、変更根拠を作れない場合はsourceを変更しない。

- historical failureは確認できるが、今回のfocused / suite / 必要なbaseline比較で再現しない。
- focused / suite比較でも安定した差を再現できない。
- launcher内部の異常待機を示す証跡がない。
- PR #139との直接因果を示すsource / 設定 / 実測差分がない。

実行回数が停止条件により上限未満でも、実行回数と停止理由を明記する。

### 最終品質ゲートで無関係なfailureが出た場合

- 最初の異常を確認し、Issue #142の差分または検証経路との因果を判定する。
- Issue #142に起因する場合、またはIssue #142を正しく検証するために必要な範囲なら最小修正する。
- Issue #142と因果のないfailureと確認できた場合、このIssueではそのsourceを修正しない。
- `pnpm run verify`がPASSしていないため完了扱いにせず、blocker、未実行 / 未達検証、次の対応をRun Artifactと最終報告へ記録する。

## 9. リスク

- #140と#142が同じtest fileで発生していることだけを理由に、すべて同一原因と断定すると別の遅延経路を見落とす。
- historical failureを発生させた未commit working treeを完全に復元できない可能性がある。現在のPR #139 headでPASSしてもhistorical failureを否定しない。
- `13cc542...`から`12fff8e...`の間にはdependency / lockfile変更があるため、baseline比較が必要な場合は各SHA自身のlockfileから依存を構築する。
- baseline比較には実行順の影響が混ざる可能性があるため、5秒境界の判断に影響する差が出た場合だけ順序反転で再確認する。
- Windowsのprocess起動時間にはばらつきがあるため、個別runの順序と生値を捨てない。
- 一時diagnostic自体がtimingへ影響する可能性があるため、標準計測と分離する。
- testを速くする目的でpure policy evaluationへ寄せすぎると、実Hook entrypointやGit context取得の回帰検出力を落とす可能性がある。
- 明示timeoutなしのWindows testは5秒defaultで動く。15秒 / 30秒testだけを見て調整すると#140と同種の失敗を見落とす。
- hung Node testはproduction launcher内部15秒timeoutを意図的に検証する。通常の遅延と誤認して短縮しない。
- `getGitCommandContext()`は最大4つのGit subprocessを起動する。Node startupだけを計測するとruntime側の律速を見落とす可能性がある。
- PowerShell launcherへ性能最適化を入れるとstdin / stdout / stderr / exit codeのtransportを壊す可能性がある。process lifecycleの事実が確認できない限り変更しない。
- Windows PCには別用途のNode / PowerShellが存在し得るため、process名や件数だけで残存判定すると誤認する。
- quote / LF / CRLF testの直前にはconfigured Windows launcher testがあり、file単体でquote側だけ遅い場合は先行testとの相関を確認する必要がある。
- test分割は総process実行時間を減らさず、timeout境界を分離する変更である。
- suite限定の悪化は明確な相関を確認できなければ原因未特定のまま残る可能性がある。
- `verify`は前段工程で停止し得るため、`verify` FAILだけではWindows launcher testの再現を意味しない。
- GitHub ActionsのVitest contractsはUbuntuのみで、Windows専用testを実行しない。
- `cmd.exe`は実運用経路には含まれるが、#140で失敗した2件の直接経路には含まれない。初期調査へ混ぜない。
- Run Artifact sanitizer `-Write`はtracked fileを変更し得るため、sanitizer後の最終Markdown lint / `git diff --check`を省略しない。
- `git diff --check`だけでは予期しないchanged / untracked fileを検出できないため、最終`git status --short`を省略しない。
- #140 branchと#142 branchで並行実装すると同じtest / launcherへ競合する変更を作る可能性が高い。実装先は#142 branchへ一本化する。

## 10. 成果物

### 必須

- #140のhistorical failureと現在の再現結果の比較
- #140の2件と#142のその他timeoutの関係整理
- Node、pnpm、PowerShell、Git、launcherから解決されるNode pathを含む再現条件
- focused testで実行した全runの生値、PASS / FAIL、最小値、中央値、最大値、停止理由
- `test:contracts` / 必要な場合の`pnpm run test` / `verify`のsuite比較結果
- `verify`が対象testまで到達しなかった場合の最初のFAIL工程と「未実行」の記録
- 必要な場合のlauncher呼び出し単位・PowerShell内部・Git contextの計測結果
- 原因に対する必要最小限のsource / contract変更。変更根拠がない場合はsource変更なし
- Windowsの修正前・修正後の計測要約
- Windows対象file 3回連続成功の記録
- Windows `pnpm run test:contracts` 3回連続成功の記録
- `pnpm run verify`成功の記録
- GitHub Actions Web CI contract成功の記録
- active Run `REPORT.md`へappend-onlyで残した原因判定、採用対策、採用しなかった主要案、未確認点、検証結果
- Run Artifact sanitizer Write / Check、sanitizer後の`pnpm run lint:markdown` / `git diff --check`結果
- `git status --short`による最終変更範囲確認

### 条件付き

- 現在の`main`でhistorical failureを再現できず因果確認が必要な場合のbaseline比較
- baseline間に5秒境界へ影響する差があった場合の実行順反転結果
- historical baselineで因果を閉じられない場合のPR #139 current head比較
- production Hook / launcher / configを変更した場合の`scripts/verify.ps1`
- production Windows経路を変更した場合のfocused Windows CI
- Hook runtime契約を変更した場合のみ`docs/PROJECT_CONTEXT.md`と対応する`docs/history/**` / ADR
- process lifecycleに新しい恒久契約を追加した場合のみ関連contract test

### 参照のみ

- Issue #140
- `issue-140-windows-launcher-timeout`
- `docs/plans/2026-09-12_004031_issue-140-windows-launcher-timeout.md`
- PR #139
- PR #106

### 作成しないもの

- Issue #142専用の新規framework
- 不要なbenchmark utility
- 性能計測専用の恒久dependency
- #140 branch上の重複実装

## 11. 実装時の判断順序

1. #142 branch、最新`main`、Hook関連差分を再確認する。
2. #140 branchは履歴参照だけにし、実装先を#142 branchへ固定する。
3. active RunとRepository規約を確認し、環境path / versionを記録する。
4. #140の2件を既定5秒条件でfocused実行し、最大10回の上限と停止条件に従ってhistorical値との差を確認する。
5. 対象file、標準contract、`verify`で#142全体のfailureとsuite条件を確認する。必要な場合だけ`pnpm run test`を挟む。
6. #140の2件とその他timeoutが共通原因か別原因かを切り分ける。
7. focusedで再現したtestは各launcher invocationへ時間を分解する。
8. suiteでのみ悪化する場合はfile単体、full contracts、`pnpm run test`、実行順、対象実行由来processを必要な範囲で確認する。
9. launcher 1回に異常がある場合だけPowerShell内部を詳細計測する。
10. 現行`main`で原因を閉じられない場合だけhistorical baseline比較へ進む。
11. test内の重複processだけが原因ならproduction Hookを変更せずtest構造を整理する。
12. process lifecycle不具合ならlauncherだけを修正する。
13. runtime Hook本体のGit context取得に実際の重複がある場合だけ、repository境界を維持して局所修正する。
14. 不要な重複やlifecycle不具合を除いても正常実行が実効test timeoutを超える場合だけ、根拠付きで対象test timeoutを調整する。
15. production Hook / launcher / configを変更した場合は`scripts/verify.ps1`を実行し、Windows CI追加の必要性を判断する。
16. 一時diagnosticを削除し、Run Artifactを更新・sanitizeする。
17. Windows対象file 3回、標準contract 3回、`verify`、必要なRepository固有検証、GitHub Actionsで回帰確認する。
18. `pnpm run lint:markdown`、`git diff --check`、`git status --short`で最終差分を確認する。

この順序から外れて、先にtimeout値を大きくする、caseを削る、skipする、policyを弱める、hung testのproduction timeoutをtest都合で短縮する対応は行わない。
