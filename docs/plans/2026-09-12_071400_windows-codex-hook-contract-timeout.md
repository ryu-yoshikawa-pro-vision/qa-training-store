# Windows環境のCodex Hook contract timeout解消 計画

## 0. 依頼概要

- 対象: Issue #142「Windows環境でCodex Hook contractがtimeoutする問題を解消する」
- 統合元: Issue #140「test: Windows launcherのcontract testが5秒timeoutになる原因を調査する」
- 背景: PR #133のWindowsローカル検証で`pnpm run test:contracts`を実行すると、`tests/contracts/codex-hook-contract.test.ts`の既存Hook contractがtimeoutする事象が再現した。同じPR HEADのGitHub Actions Web CIではcontract suiteが成功しており、PR #133の教材・validator変更とは分離されたWindowsローカル依存の問題としてIssue #142へ切り出されている。
- 統合方針: Issue #140は同じtest file・Windows launcher経路で既に具体的な5秒timeoutを観測しているため、原因調査と修正はIssue #142へ統合する。`issue-140-windows-launcher-timeout` branchと#140 Planは履歴Evidenceとして参照し、別branchでは実装しない。
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

このPlanでは実装しない。実装開始時は、対象branch HEAD、現在の`main` HEAD、merge base、`main...branch`差分、およびIssue #142作成後に入ったHook関連変更を再確認してから編集する。

## 1. ゴール / 完了条件

### ゴール

WindowsローカルでCodex Hook contractがtimeoutする原因を実測で特定し、Issue #140で確認された5秒timeout 2件を含むWindows Hook contractを、必要最小限の修正で安定して完走できるようにする。

#140と#142で観測されたtimeoutが同一原因であることは事前に仮定しない。共通原因か別原因かをprocess単位の計測で切り分ける。

### 完了条件

- Issue #140で確認済みの次の2件について、現在のWindows環境で再現結果と実時間を記録している。
  - `preserves safe and deny semantics through the Windows launcher from root and nested cwd`
  - `keeps quote, backslash, LF, and CRLF stdin semantics through the launcher`
- #140の2件と#142で観測されたその他のtimeoutが、共通原因か別原因かを根拠付きで説明できる。
- WindowsでIssue #142のtimeoutを再現し、どのtest、subprocess、Git context取得、fixture処理、またはprocess lifecycleが所要時間を支配しているか説明できる。
- `tests/contracts/codex-hook-contract.test.ts`のpolicy case数、policy ID集合、allow / denyの期待値、fail-closed検証を削減・弱体化していない。
- `.codex/hooks/pre_tool_use_policy.mjs`のHook policy semanticsを変更していない。変更が必要になった場合も、性能改善だけを理由にpolicy判定を緩めず、既存contractを維持する。
- `.codex/hooks/pre_tool_use_policy_windows.ps1`を変更する場合は、stdin / stdout / stderr、Node exit code、timeout時の停止、fail-closedのtransport契約を維持する。
- Windowsで対象Hook contract fileを3回連続で実行して成功する。
- Windowsで`pnpm run test:contracts`を3回連続で実行して成功する。
- `pnpm run verify`が成功する。Hook以外の既存failureが発生した場合は今回差分との因果関係を切り分け、成功扱いにはしない。
- GitHub Actions Web CIの`Vitest (contracts)`が成功する。
- productionのWindows launcherまたは`.codex/config.toml`を変更した場合は、Windows実行経路をCIで継続検証する必要性を判断し、必要ならfocused Windows contractを追加する。test-only変更の場合はCI構成を不要に増やさない。
- timeout値を変更した場合は、変更前の実測値、変更後の実測値、設定値と余裕幅の根拠を説明できる。
- `skip`、case削除、Assertion弱体化、fail-closed緩和、無制限または過大なtimeout設定で回避していない。
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

#140はPR #139の検証中に作成された。PR #139の差分は文書・Run Artifact中心であり、少なくとも次のHook関連ファイルにtimeoutの直接原因となる変更は確認されていない。

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
#142 Plan作成時 main: 12fff8eafccef4ab939efec623ac8a8d4f1ac539
```

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

2. 現在のVitestは`4.1.10`である。`vitest.config.ts`にはglobal `testTimeout`設定がなく、`test:contracts`にも`--testTimeout`指定がない。Node.js環境で個別timeoutを明示していないtestはVitest既定の`5000ms`が実効上限になる。

3. `tests/contracts/codex-hook-contract.test.ts`では少なくとも次の同期処理がある。

   - `runNodeHook()`: `spawnSync(process.execPath, [hookPath], ...)`
   - `runWindowsLauncher()`: `spawnSync("powershell.exe", ...)`
   - `runNodeHookWithExplicitContexts()`: policy case群を1つのNode subprocess内で`evaluateCommand()`へ渡す
   - `makeGitFixture()`: temporary directory作成、Hook copy、`git init`
   - `setFixtureBranch()`: `git symbolic-ref`
   - `removeFixture()`: recursive temporary directory削除
   - `runConfiguredWindowsCommand()`: Windows configured Hook contract用の`cmd.exe` / `pwsh.exe`起動

4. representative Hook matrixは、context付きcaseを`runNodeHookWithExplicitContexts()`でまとめて処理する一方、contextなしcaseはcaseごとに`runNodeHook()`を起動している。Node起動とHook内部Git context解決の反復は累積時間増加の候補だが、現時点では原因と確定しない。

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
- `terminates a hung Node Hook with finite timeout and stderr`
  - launcher内部`15000ms` timeoutを意図的に発火させる契約
  - test timeout `20000ms`
  - 正常でも約15秒の待機を含むため、通常性能の測定値へ混ぜない
- `preserves safe and deny semantics through the Windows launcher from root and nested cwd`
  - launcherを3回同期実行
  - 明示timeoutなし = 実効`5000ms`
  - #140 historical failure: `5569ms`
- `keeps quote, backslash, LF, and CRLF stdin semantics through the launcher`
  - launcherを3回同期実行
  - 明示timeoutなし = 実効`5000ms`
  - #140 historical failure: `5071ms`
- `maps malformed input to launcher exit 2 with stderr`、`fails closed when repository root or Node Hook resolution fails`、`maps an unexpected Node non-zero exit to launcher exit 2`等も明示timeoutなしのため実効`5000ms`。

### Hook内部Git context取得

`getGitCommandContext()`はrepository context取得のため最大4つのGit subprocessを同期実行する。

```text
git symbolic-ref --quiet refs/remotes/origin/HEAD
git remote
git branch --show-current
git rev-parse --abbrev-ref --symbolic-full-name @{upstream}
```

各Git commandには`2000ms` timeoutが設定されている。`evaluateCommand()`は対象Git subcommandに対して、明示contextが渡されていない場合にcontext取得を実行するため、Node startupだけでなくHook内部Git subprocessも計測対象にする。

### 既存設計・CI

- `.codex/config.toml`のPreToolUse `timeout = 30`は既存runtime契約である。
- ADR-0016ではWindows PowerShell launcherをtransport責務に限定し、Node policyを正本とする。
- ADR-0021には、Windows configured launcherの既存probeでlogging `Stop`が`5395ms`に到達した記録がある。10秒付近へ継続的に到達する場合はtimeout拡大よりprocess startup / shell / Git / Node / filesystemを調査する方針である。
- GitHub Actions Web CIの`Vitest (contracts)`は`ubuntu-latest`で実行される。
- Windows専用testは`process.platform !== "win32"`でlauncher処理を抜けるため、Linux CI成功だけではWindows launcherの回帰確認にならない。
- Windows runnerを使う既存jobはCodex artifact sanitizerであり、`test:contracts`は実行していない。

### 前提

- Issue #142の目的はWindowsローカルcontractの安定化であり、Codex Hook policy自体の仕様変更ではない。
- Windows Defender等の外部負荷は観測対象に含めるが、外部要因を前提にtimeoutだけを拡大しない。
- 一時的な計測コードやログは原因特定に必要な範囲で使用してよいが、恒久的な大量ログは追加しない。
- 既存のNode / Git / PowerShellを使って調査し、新規dependencyは追加しない。
- 性能比較はbenchmark frameworkを導入せず、同一条件の複数回実行で確認する。
- #140のhistorical failureを再現できなくても、過去の失敗記録自体を否定しない。

### 対象外

- PR #133の教材・Evidence validator変更
- PR #139の文書変更
- Expo dependency mismatch
- Hook policyのG1-G10 / N1-N4 / A1-A17の意味変更
- 新しいHook framework、benchmark framework、process managerの導入
- Codex Run Artifact基盤、logging Hook基盤、sandbox設計の再設計
- Windowsローカル以外への一般的な性能最適化
- #140用branchでの別実装

## 4. リポジトリ構成と処理経路

### 主な対象

- `package.json`
  - `pnpm run test:contracts`
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

### 処理経路

```text
pnpm run test:contracts
  -> Vitest / tests/contracts / single worker
  -> codex-hook-contract.test.ts
     -> Node Hook direct subprocess
        -> pre_tool_use_policy.mjs
        -> 対象Git commandではgetGitCommandContext()
           -> 最大4つのGit subprocess
     -> Windows launcher subprocess
        -> powershell.exe
        -> pre_tool_use_policy_windows.ps1
        -> Node Hook subprocess
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
- 特定の1 subprocessが遅いのか、1 test内の複数process起動の累積で実効timeoutを超えるのか。
- Node startup、PowerShell startup、`getGitCommandContext()`内Git command、fixture作成 / cleanupのどれが支配的か。
- stdin EOF、stdout / stderr drain、child exit待ちで遅延している経路があるか。
- Windows負荷によるばらつきと、実装側の再現可能な遅延をどこまで分離できるか。

実装開始前にユーザーへ確認が必要なblocking questionはない。確認可能な内容は計測して判断する。

## 6. 実装手順

### 手順1: 実装開始時の状態を固定する

- [ ] `fix/windows-codex-hook-contract-timeout`のHEAD、最新`main` HEAD、merge base、`main...branch`差分を記録する。
- [ ] `issue-140-windows-launcher-timeout` branchは実装対象にせず、#140 Planとhistorical evidenceの参照だけに使う。
- [ ] 実装開始後にHook関連変更が`main`へ入っていれば内容を確認し、古いPlan前提をそのまま使わない。
- [ ] 計測環境として少なくとも次を記録する。
  - Windows version
  - `node --version`
  - `pnpm --version`
  - `git --version`
  - Windows PowerShell version
  - `pwsh.exe --version`
  - 必要なら`codex --version`

### 手順2: #140のhistorical failureを現在の条件で確認する

まず次の2件を別々に既定timeout条件でfocused実行する。

```powershell
pnpm exec vitest run tests/contracts/codex-hook-contract.test.ts --no-file-parallelism --maxWorkers=1 -t "preserves safe and deny semantics through the Windows launcher from root and nested cwd"
```

```powershell
pnpm exec vitest run tests/contracts/codex-hook-contract.test.ts --no-file-parallelism --maxWorkers=1 -t "keeps quote, backslash, LF, and CRLF stdin semantics through the launcher"
```

- [ ] #140 historical値 `5569ms` / `5071ms`と現在値を区別して記録する。
- [ ] focused testは単発で結論を出さず、正常にPASSする場合は原則3回以上実行してばらつきを見る。
- [ ] 同じtimeout failureが2回連続し、新しい情報が増えない場合は無目的に再試行せず詳細計測へ進む。
- [ ] timeout確認のためだけに恒久コードを変更しない。

現在の`main`で2件とも安定して再現しない場合のみ、historical failureの因果確認に必要な範囲でPR #139 base `13cc542fa31f372bd4bc932cf7a82b92bcf81a23`との比較を検討する。

baseline比較を行う場合:

- 同じWindows PC、同じNode / pnpm / PowerShell条件で比較する。
- 各SHA自身の`pnpm-lock.yaml`から依存を構築する。
- 一方だけ5秒境界を超える差が出た場合は、実行順を反転して再確認してからdependency差分等との因果を判断する。

### 手順3: #142全体のfailureと実効timeoutを固定する

- [ ] `tests/contracts/codex-hook-contract.test.ts`内のWindows関連testを一覧化し、各testについて次を記録する。
  - test name
  - Windows専用か共通か
  - 明示timeoutの有無
  - 実効timeout（未指定なら`5000ms`）
  - 1 test内で同期起動する主要process数
  - 意図的な待機を含むか
- [ ] default `5000ms`、matrix `15000ms`、logging `15000ms` / `30000ms`、hung Node `20000ms`、launcher内部`15000ms`、Codex runtime `30秒`を別境界として扱う。
- [ ] 対象file単体をverbose実行してtimeoutするtest nameと実時間を記録する。

  ```powershell
  pnpm exec vitest run tests/contracts/codex-hook-contract.test.ts --no-file-parallelism --maxWorkers=1 --reporter=verbose
  ```

- [ ] 標準`pnpm run test:contracts`を実行し、対象file単体と同じfailureか確認する。
- [ ] 必要なら`pnpm run verify`まで確認し、focused / file単体 / full contracts / verifyのどこで悪化するか分ける。
- [ ] `--testTimeout=30000`は診断用比較としてのみ使用し、恒久修正の結論にはしない。
- [ ] #140の2件と#142のその他timeoutが同じ条件で悪化するかを確認する。

### 手順4: 所要時間をprocess単位へ分解する

恒久的な大量ログは追加せず、一時計測または既存出力で次を分けて測る。

- [ ] `runNodeHook()` 1回の所要時間
  - safe payload
  - deny payload
  - Git contextが必要なpayload
  - `cwd=repoRoot`とtemporary Git fixture
- [ ] `runNodeHookWithExplicitContexts()`で同じcase群をまとめた場合の所要時間
- [ ] `getGitCommandContext()`相当の4つのGit commandを個別に測る。
- [ ] 1 Hook invocationあたり実際に何個のGit subprocessが起動するか確認する。
- [ ] `runWindowsLauncher()` 1回の所要時間
- [ ] #140の各3回launcher testについて、3回合計だけでなく各launcher invocationの時間を測る。
- [ ] `powershell.exe`空起動相当とlauncher実行の差
- [ ] configured Windows commandの`cmd.exe`経由と`pwsh.exe`経由の所要時間
- [ ] `git init` / `git symbolic-ref` / Hook file copy / `fs.rmSync`の所要時間
- [ ] stdinを書き終えた後からchild process exitまでの時間
- [ ] stdout / stderrのasync read完了待ちが所要時間へ影響していないか確認する。
- [ ] 意図的なhung testは通常launcher性能の測定値へ混ぜない。

計測は原則としてwarm-up後に同一条件で3回以上行い、個々の値と最小値・中央値・最大値を記録する。統計処理用dependencyは追加しない。

### 手順5: 原因分類と修正判断

#### A. 1 test内のsubprocess累積が主因

#140の2件のようにlauncher 1回は正常でも3回合計が5秒を超える場合、単一launcher不具合とは扱わない。

- policy matrixの全caseとexpected allow / denyを維持する。
- pure policy semanticsを確認するcaseは、既存`runNodeHookWithExplicitContexts()`相当のbatch評価を再利用できるか確認する。
- batch化前に次の実経路契約が別testで維持されることを対応付ける。
  - payload validation / malformed input
  - safe CLI entrypoint
  - structured deny CLI entrypoint
  - runtime Git context取得
  - `git -C` / protected branch /複数repository
  - Windows stdin / stdout / stderr / exit code transport
  - missing root / missing Hook / unexpected Node exit
  - hung Nodeの有限timeout
- 実経路testまでpure `evaluateCommand()`呼び出しへ置き換えない。
- 単に5秒timeoutを回避するためだけにtest分割しない。分割する場合は各caseが独立contractとして意味を持つことを説明する。

#### B. PowerShell launcherまたはprocess lifecycleが主因

- `pre_tool_use_policy_windows.ps1`のstdin `CopyTo()`、stdin close、stdout / stderr async read、`WaitForExit()`、timeout後Killの順序を実測と照合する。
- EOFが届かない、redirect stream待ち、child exit待ち等の具体的な不具合が確認できた箇所だけ修正する。
- launcherへpolicy判定を移さない。
- exit code `0` / `2`、stderr伝播、timeout時fail-closedを維持する。
- hung Node testの15秒待機はproduction launcherの有限timeout契約なので、test高速化目的で短縮しない。

#### C. Hook内部Git context取得が主因

- `getGitCommandContext()`内のどのGit commandが遅いかを特定する。
- 同一Hook invocationで同じrepository contextを不要に再取得している場合だけ、安全に再利用できるか検討する。
- `git -C`、複数repository、cwd transitionを跨いでcontextを共有しない。
- Git command失敗時のfail-closed判断を弱めない。
- testだけの重複でruntimeでは重複していない場合、production Hookへ最適化を入れない。

#### D. fixture反復が主因

- 同じ意味のfixture setupを安全に共有できるtestだけを特定する。
- branch state、remote、filesystem stateがtest間で漏れる場合は共有しない。
- fixture共有より、不要な`git init` / copyの重複を局所的に減らせる既存helper再利用を優先する。

#### E. 実装側の不具合がなくtest timeoutだけが短い

- 5秒default、15秒、20秒、30秒のどのtest timeoutで失敗しているかを確定する。
- 単一subprocessの正常範囲と、1 test内の複数subprocess累積時間を分けて記録する。
- 正常実行が既存実効timeoutを複数回超えることを確認した場合だけ、対象test単位のtimeout調整を検討する。
- timeout値は複数回の実測分布からboundedな余裕を持つ値にする。
- `0`、無制限、根拠のない大幅な値は使わない。
- `.codex/config.toml`のruntime 30秒やlauncher内部15秒を、Vitest aggregate timeoutの都合だけで変更しない。

#### F. focusedでは安定しsuiteでのみ悪化する

- test file単体、full `test:contracts`、`verify`の実行条件を比較する。
- 実行順、process残存、同一diagnosticのfocused / suite差を必要な範囲で確認する。
- 相関が確認できない場合は「suite負荷が原因」と断定しない。

#### G. 現在は再現しない

- sourceを推測変更しない。
- #140 historical failureと現在の非再現を区別して記録する。
- historical baseline比較でも原因を確定できない場合は、未特定のまま不要な変更を入れない。

### 手順6: 回帰テストとCIを整える

- [ ] 原因修正を検出できる既存contractがある場合は重複testを増やさず、そのcontractを維持する。
- [ ] process lifecycle不具合を修正した場合だけ、そのfailureを直接再現できる回帰testを追加する。
- [ ] 性能の絶対値を厳密にassertする新規benchmark testは追加しない。
- [ ] policy ID集合、malformed input、allow / deny、Windows launcherの契約を引き続きassertする。
- [ ] test構造またはtest固有timeoutだけを変更し、production Windows経路を変更しない場合は、新しいWindows CI jobを原則追加しない。
- [ ] `.codex/hooks/pre_tool_use_policy_windows.ps1`または`.codex/config.toml`のproduction Windows経路を変更した場合は、`.github/workflows/ci.yml`でfocused contractを`windows-latest`実行する必要性を確認する。
- [ ] Linux `Vitest (contracts)`成功をWindows launcher検証の代替にしない。

### 手順7: 一時計測を整理する

- [ ] 一時計測用ログ、temporary script、raw timing outputはcommit対象から除外する。
- [ ] 将来の診断にも必要な小さなhelperだけが残る場合は、現在のtest責務から必要性を説明できるものに限定する。
- [ ] 新規dependency、benchmark framework、設定切替は追加しない。

## 7. 検証方法

### #140統合対象のfocused確認

修正後、少なくとも次の2件を既定条件で確認する。

```powershell
pnpm exec vitest run tests/contracts/codex-hook-contract.test.ts --no-file-parallelism --maxWorkers=1 -t "preserves safe and deny semantics through the Windows launcher from root and nested cwd"
```

```powershell
pnpm exec vitest run tests/contracts/codex-hook-contract.test.ts --no-file-parallelism --maxWorkers=1 -t "keeps quote, backslash, LF, and CRLF stdin semantics through the launcher"
```

### Windows対象file検証

対象fileを連続3回実行する。

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
git diff --check
```

`verify`内で既に実行される項目との重複は、途中の局所確認と最終確認として許容する。

### Windows launcher / config変更時

Repository固有のWindows harness検証が存在する場合は、既存手順に従って実行する。少なくとも`scripts/verify.ps1`の対象契約を確認し、変更経路を検証できる場合は実行する。

### GitHub Actions

- Web CIの`Vitest (contracts)`が成功することを確認する。
- Linux CI成功はWindows安定性の代替にはしない。
- production Windows経路を変更してfocused Windows CIを追加した場合は、その`windows-latest` jobも成功することを確認する。

### timeout変更時の追加確認

- 変更前・変更後で同一環境、同一command、同一対象testの実時間を比較する。
- default 5秒、test固有15秒 / 20秒 / 30秒、launcher内部15秒、Codex runtime 30秒のどれを変更したか明記する。
- 値を変更しなかったtimeoutについても、変更不要と判断した根拠を説明する。
- hung Node testのように意図的な待機を含むtestは、通常処理の性能値と分けて記録する。

## 8. リスク

- #140と#142が同じtest fileで発生していることだけを理由に、すべて同一原因と断定すると別の遅延経路を見落とす。
- testを速くする目的でpure policy evaluationへ寄せすぎると、実Hook entrypointやGit context取得の回帰検出力を落とす可能性がある。
- 明示timeoutなしのWindows testは5秒defaultで動く。15秒 / 30秒のtestだけを見て調整すると、#140と同種の失敗を見落とす。
- hung Node testはproduction launcher内部15秒timeoutを意図的に検証する。通常の遅延と誤認して短縮しない。
- `getGitCommandContext()`は最大4つのGit subprocessを起動する。Node startupだけを計測するとruntime側の律速を見落とす可能性がある。
- PowerShell launcherへ性能最適化を入れるとstdin / stdout / stderr / exit codeのtransportを壊す可能性がある。process lifecycleの事実が確認できない限り変更しない。
- fixture共有はtest isolationを壊す可能性がある。
- Windows負荷による時間ばらつきを固定値だけで吸収すると再発原因が残る。
- GitHub ActionsのVitest contractsはUbuntuのみで、Windows専用testを実行しない。production Windows経路を変更した場合にLinux CI成功だけで回帰なしと判断しない。
- #140 branchと#142 branchで並行実装すると同じtest / launcherへ競合する変更を作る可能性が高い。実装先は#142 branchへ一本化する。

## 9. 成果物

### 必須

- #140のhistorical failureと現在の再現結果の比較
- #140の2件と#142のその他timeoutの関係整理
- 原因に対する必要最小限のsource / contract変更
- Windowsの修正前・修正後の計測要約
- 使用した環境versionとWindows関連testの実効timeout一覧
- Windows対象file 3回連続成功の記録
- Windows `pnpm run test:contracts` 3回連続成功の記録
- `pnpm run verify`成功の記録
- GitHub Actions Web CI contract成功の記録

### 条件付き

- productionのWindows launcher / configを変更した場合のfocused Windows CI
- Hook runtime契約を変更した場合のみ`docs/PROJECT_CONTEXT.md`と対応する`docs/history/**` / ADR
- process lifecycleに新しい恒久契約を追加した場合のみ関連contract test
- 現在の`main`で#140 failureを再現できず因果確認が必要な場合のみhistorical baseline比較

### 参照のみ

- Issue #140
- `issue-140-windows-launcher-timeout`
- `docs/plans/2026-09-12_004031_issue-140-windows-launcher-timeout.md`
- PR #139

### 作成しないもの

- Issue #142専用の新規framework
- 不要なbenchmark utility
- 性能計測専用の恒久dependency
- #140 branch上の重複実装

## 10. 実装時の判断順序

1. #142 branch、最新`main`、Hook関連差分を再確認する。
2. #140 branchは履歴参照だけにし、実装先を#142 branchへ固定する。
3. Windows環境versionと各Windows関連testの実効timeout・process起動構造を固定する。
4. #140の2件を既定5秒条件でfocused実行し、historical値との差を確認する。
5. 対象file、標準contract、必要なら`verify`で#142全体のfailureを確認する。
6. #140の2件とその他timeoutが共通原因か別原因かを切り分ける。
7. Node startup、PowerShell startup、`getGitCommandContext()`内Git、fixture、stdin / stdout / stderr、child exit待ちへ時間を分解する。
8. 同一条件で複数回計測し、単発の外れ値と再現する遅延を分ける。
9. test内の重複processだけが原因ならproduction Hookを変更せずtest構造を整理する。
10. process lifecycle不具合ならlauncherだけを修正する。
11. runtime Hook本体のGit context取得に実際の重複がある場合だけ、repository境界を維持して局所修正する。
12. 不要な重複やlifecycle不具合を除いても正常実行が実効test timeoutを超える場合だけ、根拠付きで対象test timeoutを調整する。
13. production Windows経路を変更した場合だけ、focused Windows CI追加の必要性を判断する。
14. Windows対象file 3回、標準contract 3回、`verify`、GitHub Actionsで回帰確認する。

この順序から外れて、先にtimeout値を大きくする、caseを削る、skipする、policyを弱める、hung testのproduction timeoutをtest都合で短縮する対応は行わない。
