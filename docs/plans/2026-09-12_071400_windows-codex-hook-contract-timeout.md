# Windows環境のCodex Hook contract timeout解消 計画

## 0. 依頼概要

- 依頼内容: Issue #142「Windows環境でCodex Hook contractがtimeoutする問題を解消する」に対応するため、実装前の調査・修正・検証手順を確定する。
- 背景: PR #133のWindowsローカル検証で`pnpm run test:contracts`を実行すると、`tests/contracts/codex-hook-contract.test.ts`の既存Hook contractがtimeoutする事象が再現した。同じPR HEADのGitHub Actions Web CIではcontract suiteが成功しており、PR #133の教材・validator変更とは分離されたWindowsローカル依存の問題としてIssue #142へ切り出されている。
- 期待成果: Windowsで標準`pnpm run test:contracts`を複数回連続実行してもHook contractが環境依存timeoutで停止せず、既存Hook policy、fail-closed、allow / deny契約を維持した状態にする。

基準:

```text
issue: #142
base branch: main
base SHA: 12fff8eafccef4ab939efec623ac8a8d4f1ac539
plan branch: fix/windows-codex-hook-contract-timeout
```

このPlanでは実装しない。実装開始時は、対象ブランチHEAD、現在の`main` HEAD、merge base、`main...branch`差分、およびIssue #142以降に入ったHook関連変更を再確認してから編集する。

## 1. ゴール / 完了条件

### ゴール

WindowsローカルでCodex Hook contractがtimeoutする原因を実測で特定し、原因に対する必要最小限の修正によって標準contract suiteを安定して完走できるようにする。

### 完了条件

- WindowsでIssue #142のtimeoutを再現し、どのtest、subprocess、Git context取得、fixture処理、またはprocess lifecycleが所要時間を支配しているか説明できる。
- `tests/contracts/codex-hook-contract.test.ts`のpolicy case数、policy ID集合、allow / denyの期待値、fail-closed検証を削減・弱体化していない。
- `.codex/hooks/pre_tool_use_policy.mjs`のHook policy semanticsを変更していない。変更が必要になった場合も、性能改善だけを理由にpolicy判定を緩めず、既存contractを維持する。
- `.codex/hooks/pre_tool_use_policy_windows.ps1`を変更する場合は、stdin / stdout / stderr、Node exit code、timeout時の停止、fail-closedのtransport契約を維持する。
- Windowsで対象Hook contractを3回連続で実行して成功する。
- Windowsで`pnpm run test:contracts`を3回連続で実行して成功する。
- `pnpm run verify`が成功する。Hook以外の既存failureが発生した場合は今回差分との因果関係を切り分け、成功扱いにはしない。
- GitHub Actions Web CIの`Vitest (contracts)`が成功する。
- productionのWindows launcherまたは`.codex/config.toml`を変更した場合は、Windows実行経路をCIでも継続検証できるよう、既存workflowへのfocused Windows contract追加を必要性と保守負荷を確認した上で実施する。test-only変更の場合はCI構成を不要に増やさない。
- timeout値を変更した場合は、変更前の実測値、変更後の実測値、設定値と余裕幅の根拠を説明できる。
- `skip`、case削除、Assertion弱体化、fail-closed緩和、無制限または過大なtimeout設定で回避していない。

## 2. 現状理解と前提

### 現状理解

1. 標準contract入口は`package.json`の次のscriptである。

   ```text
   test:contracts = vitest run tests/contracts --no-file-parallelism --maxWorkers=1
   ```

   contract suite全体が単一worker・非並列で動くため、同一test内で同期的に起動するNode / PowerShell / Git subprocessの累積時間がそのままtest所要時間へ反映される。

2. 現在のVitestは`4.1.10`である。`vitest.config.ts`には`testTimeout`設定がなく、`test:contracts`にも`--testTimeout`指定がない。VitestのNode.js環境でのdefault test timeoutは`5000ms`なので、個別timeoutを明示していないtestは5秒が実効上限になる。

3. `tests/contracts/codex-hook-contract.test.ts`では、少なくとも次の同期処理がある。

   - `runNodeHook()`: `spawnSync(process.execPath, [hookPath], ...)`
   - `runWindowsLauncher()`: `spawnSync("powershell.exe", ...)`
   - `runNodeHookWithExplicitContexts()`: policy case群を1つのNode subprocess内で`evaluateCommand()`へ渡す
   - `makeGitFixture()`: temporary directory作成、Hook copy、`git init`
   - `setFixtureBranch()`: `git symbolic-ref`
   - `removeFixture()`: recursive temporary directory削除
   - `runConfiguredWindowsCommand()`: Windows configured Hook contract用の`cmd.exe` / `pwsh.exe`起動

4. representative Hook matrixは、context付きcaseを`runNodeHookWithExplicitContexts()`でまとめて処理する一方、contextなしcaseはcaseごとに`runNodeHook()`を起動している。WindowsではNode起動とHook内部のGit context解決が繰り返されるため、累積時間増加の候補になる。ただし、現時点では原因と確定しない。

5. 現在の`main`では、`executes every common-policy representative from the Hook matrix`のVitest timeoutは`15000ms`である。Issue #142本文の「30秒」と現在の実装は一致していない。

6. timeoutは少なくとも次の境界に分かれる。これらを同じtimeoutとして扱わない。

   - Vitest default test timeout: `5000ms`
   - `executes every common-policy representative from the Hook matrix`: `15000ms`
   - Windows logging launcherの一部test: `15000ms`
   - `terminates a hung Node Hook with finite timeout and stderr`: `20000ms`
   - current PowerShell shellやconfigured PreToolUseをまとめて確認する一部test: `30000ms`
   - `.codex/hooks/pre_tool_use_policy_windows.ps1`がNode Hook終了を待つ内部timeout: `15000ms`
   - `.codex/config.toml`のPreToolUse Hook runtime timeout: `30秒`

7. Windows専用testには、1 test内で複数processを同期実行するものがある。

   - `records JSONL through the configured Windows launcher for every logging event`: 5 logging eventを順次実行し、test timeoutは`15000ms`。
   - `records JSONL through the configured Windows launcher under the current PowerShell shell`: 5 logging eventを順次実行し、test timeoutは`30000ms`。
   - `preserves PreToolUse policy through the configured Windows launcher and both shell wrappers`: `cmd` / `pwsh` × root / nested cwd × safe / denyで8回のconfigured commandを同期実行し、test timeoutは`30000ms`。
   - `terminates a hung Node Hook with finite timeout and stderr`: launcher内部の`15000ms` timeoutを意図的に発火させる契約で、test timeoutは`20000ms`。正常でも約15秒の待機を含むため、他の性能問題と混同しない。
   - `preserves safe and deny semantics through the Windows launcher from root and nested cwd`、`keeps quote, backslash, LF, and CRLF stdin semantics through the launcher`、`maps malformed input to launcher exit 2 with stderr`、`fails closed when repository root or Node Hook resolution fails`、`maps an unexpected Node non-zero exit to launcher exit 2`等は個別timeoutを明示していないため、現状はVitest defaultの`5000ms`が実効上限になる。

8. Hook本体の`getGitCommandContext()`は、repository context取得のために最大4つのGit subprocessを同期実行する。

   - `git symbolic-ref --quiet refs/remotes/origin/HEAD`
   - `git remote`
   - `git branch --show-current`
   - `git rev-parse --abbrev-ref --symbolic-full-name @{upstream}`

   各Git commandには`2000ms` timeoutが設定されている。`evaluateCommand()`は対象Git subcommandに対して、明示contextが渡されていない場合にこのcontext取得を実行するため、Node process startupだけでなくHook内部Git processの起動回数も計測対象にする。

9. PR #133のRun `20260911-232344-JST`では、標準`pnpm run test:contracts`が初回に既存Hook case 1件、bounded retryでは同じcaseに加えて別の既存launcher caseもtimeoutした。一方、診断目的の`--testTimeout=30000`実行は成功している。今回のPR #133 source変更はHook関連ファイルを変更していないため、Issue #142として分離された。

10. `.codex/config.toml`のPreToolUse `timeout = 30`は既存のruntime契約である。`docs/PROJECT_CONTEXT.md`、ADR-0016、ADR-0021でも、Windows launcherはtransport責務に限定し、Bash matcher、Node policy、deny / fail-closeを維持する方針が記録されている。

11. ADR-0021には、Windows configured launcherの既存probeでlogging `Stop`が`5395ms`に到達した記録がある。Windowsではprocess startup、shell / Git / Node起動、filesystem I/O、scheduler / Defender等でばらつきが発生し得るため、1回だけの計測でtimeout根拠を決めない。

12. GitHub Actions Web CIの`Vitest (contracts)`は`ubuntu-latest`で実行される。Windows専用testは`process.platform !== "win32"`で処理を抜けるため、Linux CI成功だけではWindows実行経路の回帰確認にならない。

### 前提

- Issue #142の目的はWindowsローカルcontractの安定化であり、Codex Hook policy自体の仕様変更ではない。
- Windows Defender等の外部負荷は計測時の観測対象に含めるが、外部要因を前提にtimeoutだけを拡大する方針は採らない。
- 一時的な計測コードやログは原因特定に必要な範囲で使用してよいが、恒久的な大量ログは追加しない。
- 既存のNode / Git / PowerShellを使って調査し、新規dependencyは追加しない。
- 性能比較はbenchmark frameworkを導入せず、同一条件の複数回実行で確認する。

### 対象外

- PR #133の教材・Evidence validator変更
- Expo dependency mismatch
- Hook policyのG1-G10 / N1-N4 / A1-A17の意味変更
- 新しいHook framework、benchmark framework、process managerの導入
- Codex Run Artifact基盤、logging Hook基盤、sandbox設計の再設計
- Windowsローカル以外への一般的な性能最適化

## 3. リポジトリ構成

### 入口

- `package.json`
  - `pnpm run test:contracts`
  - `pnpm run verify`
  - Vitest `4.1.10`
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
  - Ubuntu上の`Vitest (contracts)`回帰確認
  - Windows上では現在Codex artifact sanitizerだけが実行され、Vitest contractsは実行されない

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

### 主要な境界

- `evaluateCommand(command, context)`: policy判定の純粋ロジックに近い境界。明示contextを渡すcontractではruntime Git context取得を伴わない。
- Hook CLI entrypoint: stdin JSONを読み、runtime contextが必要ならGit commandを実行して`evaluateCommand()`へ渡す実運用境界。
- `getGitCommandContext()`: runtime repository contextを得るためのGit subprocess境界。
- `pre_tool_use_policy_windows.ps1`: policyを持たず、WindowsでNode Hookを起動するtransport境界。
- Git fixture: repository contextが必要なcontractだけで使うテスト境界。

### 既存テストが担う契約

- malformed / out-of-contract input: payload validationとfail-closed
- safe command: CLI entrypointのexit 0 / stdout・stderr空
- structured deny: CLI entrypointの`hookSpecificOutput`
- policy matrix: G1-G10 / N1-N4 / A1-A17の代表caseとallow / deny semantics
- explicit context contract: pure policy evaluation
- `git -C`、複数repository、branch / cwd / environment transition: runtime repository contextとmutation判定
- Windows direct launcher: stdin / stdout / stderr / exit code transport
- configured Windows launcher: `.codex/config.toml`のcommand経路、`cmd` / `pwsh`、root / nested cwd
- malformed / missing root / missing Hook / unexpected Node exit / hung Node: Windows launcherのfail-closedと有限timeout
- Windows logging launcher: logging side effectとStop系fallback

### 変更候補の優先順位

1. `tests/contracts/codex-hook-contract.test.ts`内の重複subprocess起動やfixture setupを、上記契約を維持したまま整理する。
2. subprocess lifecycleに実際の不具合がある場合だけ、`pre_tool_use_policy_windows.ps1`のtransport処理を局所修正する。
3. Hook本体が同一invocation内で不要なGit subprocessを繰り返していることが実測で確認された場合だけ、policy semanticsを変えない範囲で`pre_tool_use_policy.mjs`のcontext取得を整理する。
4. timeout変更は、不要な重複やlifecycle不具合を除いた後でも正常処理が既存閾値を合理的に超えると実測できた場合に限る。

### 未確認事項

- PR #133の初回とretryでtimeoutした正確なtest name。
- 5秒default timeoutで失敗したtestと、15秒 / 20秒 / 30秒の明示timeoutで失敗したtestの対応関係。
- 特定の1 subprocessが遅いのか、1 test内の複数process起動の累積で実効timeoutを超えるのか。
- Node startup、PowerShell startup、`getGitCommandContext()`内Git command、fixture作成 / cleanupのどれが支配的か。
- stdin EOF、stdout / stderr drain、child exit待ちで遅延している経路があるか。
- Windows負荷によるばらつきと、実装側の再現可能な遅延をどこまで分離できるか。

## 4. 質問 / 曖昧性

- 実装開始前にユーザーへ確認が必要な不透明点: なし。Issue #142、既存Hook契約、現在の実装から、まず計測して原因に応じて修正を選ぶ方針まで確定できる。
- 仮定してよい細部: 計測用の一時ログ形式、ローカル計測ファイル名、実装時のhelper名。恒久APIにはしない。
- 原因は未確定であり、実装前半の計測結果を根拠に変更対象を決める。

## 5. 影響範囲

### 変更候補

- `tests/contracts/codex-hook-contract.test.ts`
  - 第一候補。計測結果に応じてsubprocess反復、fixture setup、test timeoutのいずれかを最小修正する。
- `.codex/hooks/pre_tool_use_policy_windows.ps1`
  - PowerShell launcher自体のprocess lifecycle不具合が確認された場合のみ変更する。
- `.codex/hooks/pre_tool_use_policy.mjs`
  - Hook本体の不要なGit subprocess反復が確認され、testだけではなくruntimeでも無駄がある場合のみ変更する。
- `.github/workflows/ci.yml`
  - productionのWindows launcherまたは`.codex/config.toml`を変更した場合のみ、focused Windows contractをCIで継続実行する必要があるか確認し、必要なら追加する。test-only変更なら原則変更しない。
- `.codex/config.toml`
  - 原則として変更しない。runtime PreToolUseの30秒契約は既存仕様として維持する。runtime timeout自体の変更が必要と実測で示された場合は、Issue目的と既存ADRとの整合を再確認する。
- `docs/PROJECT_CONTEXT.md` / `docs/history/**` / `docs/adr/**`
  - Hook runtime契約、Windows launcher設計、CI上の恒久契約を変更した場合のみ更新する。test-only修正なら不要。

### 確認のみ

- `package.json`
- `vitest.config.ts`
- ADR-0016 / ADR-0021
- PR #133 Run `20260911-232344-JST`
- Hook関連の直近Run Artifact

## 6. 実装手順

### 手順1: Windowsでfailureと実効timeoutを固定する

- [ ] 実装開始時点のbranch HEAD、`main` HEAD、merge base、Hook関連差分を確認する。
- [ ] 計測環境として少なくとも次を記録する。
  - Windows version
  - `node --version`
  - `pnpm --version`
  - `git --version`
  - `powershell.exe` version
  - `pwsh.exe --version`
  - 必要なら`codex --version`
- [ ] `tests/contracts/codex-hook-contract.test.ts`内のWindows関連testを一覧化し、各testについて次を記録する。
  - test name
  - Windows専用か共通か
  - 明示timeoutの有無
  - 実効timeout（未指定なら`5000ms`）
  - 1 test内で同期起動する主要process数
  - 意図的な待機を含むか
- [ ] 特に次を別々の境界として扱う。
  - default `5000ms`のtest
  - matrix `15000ms`
  - loggingの`15000ms` / `30000ms`
  - configured PreToolUse `30000ms`
  - hung Node `20000ms`とlauncher内部`15000ms`
  - Codex runtime `30秒`
- [ ] 対象file単体をverbose実行してtimeoutするtest nameと実時間を記録する。

  ```powershell
  pnpm exec vitest run tests/contracts/codex-hook-contract.test.ts --no-file-parallelism --maxWorkers=1 --reporter=verbose
  ```

- [ ] 標準`pnpm run test:contracts`を1回実行し、対象file単体と同じfailureか確認する。
- [ ] `--testTimeout=30000`は原因確認用の比較としてのみ使用し、恒久修正の結論にはしない。
- [ ] 再現しない場合は無目的な連続retryをせず、Issue再現時との差として負荷、shell、Node / pnpm / Git / PowerShell versionを確認する。

### 手順2: 所要時間を分解する

恒久的な大量ログは追加せず、一時計測またはVitest出力で次を分けて測る。

- [ ] `runNodeHook()` 1回の所要時間
  - safe payload
  - deny payload
  - Git contextが必要なpayload
  - `cwd=repoRoot`とtemporary Git fixture
- [ ] `runNodeHookWithExplicitContexts()`で同じcase群をまとめた場合の所要時間
- [ ] `getGitCommandContext()`相当のcontext取得で実行される4つのGit commandを個別に測る。
- [ ] 1 Hook invocationあたり、実際に何個のGit subprocessが起動するか確認する。
- [ ] `runWindowsLauncher()` 1回の所要時間
- [ ] `powershell.exe`空起動相当とlauncher実行の差
- [ ] configured Windows commandの`cmd.exe`経由と`pwsh.exe`経由の所要時間
- [ ] `git init` / `git symbolic-ref` / Hook file copy / `fs.rmSync`の所要時間
- [ ] stdinを書き終えた後からchild process exitまでの時間
- [ ] stdout / stderrのasync read完了待ちが所要時間へ影響していないか確認する。
- [ ] 意図的なhung testは、launcher内部15秒timeoutが機能しているかを確認する対象であり、通常launcher性能の測定値へ混ぜない。

### 手順3: ばらつきを確認する

- [ ] 単発値で判断せず、対象境界は原則としてwarm-up後に同一条件で3回以上測定する。
- [ ] 各計測は少なくとも個々の値と最小値・中央値・最大値を記録する。統計処理用dependencyは追加しない。
- [ ] cold startだけが大きい場合と、毎回遅い場合を分ける。
- [ ] Windows Defender、scheduler、他process負荷等の影響が疑われる場合は観測事実として記録する。Defender無効化等を恒久対策にはしない。
- [ ] 同一test内の複数subprocessの合計だけがtimeoutを超える場合は、単一processの不具合として扱わない。

### 手順4: 原因に対して最小修正する

#### matrixや同一test内のsubprocess反復が主因の場合

- [ ] policy matrixの全caseとexpected allow / denyは維持する。
- [ ] pure policy semanticsを確認するcaseは、既存`runNodeHookWithExplicitContexts()`相当の1 subprocess内batch評価を再利用できるか検討する。
- [ ] batch化前に、次の実経路契約が別testで維持されることを対応付けて確認する。
  - payload validation / malformed input
  - safe CLI entrypoint
  - structured deny CLI entrypoint
  - runtime Git context取得
  - `git -C` / protected branch /複数repository
  - Windows stdin / stdout / stderr / exit code transport
  - missing root / missing Hook / unexpected Node exit
  - hung Nodeの有限timeout
- [ ] 上記実経路testをpure `evaluateCommand()`呼び出しへ置き換えない。
- [ ] coverage削減ではなく、同一責務を何十回もOS processとして繰り返している部分だけを減らす。

判断基準:

- G1-G10 / N1-N4 / A1-A17のpolicy ID集合とallow / deny期待値が残ること。
- runtime context取得が必要な契約までpure evaluationへ置き換えないこと。
- Node CLI entrypointとWindows launcherの代表的な実経路が残ること。
- Windows以外でpolicy semanticsが変わらないこと。

#### PowerShell launcherまたはprocess lifecycleが主因の場合

- [ ] `pre_tool_use_policy_windows.ps1`のstdin `CopyTo()`、stdin close、stdout / stderr async read、`WaitForExit()`、timeout後Killの順序を実測と照合する。
- [ ] EOFが届かない、redirect stream待ち、child exit待ち等の具体的な不具合が確認できた箇所だけを修正する。
- [ ] launcherへpolicy判定を移さない。
- [ ] exit code `0` / `2`、stderr伝播、timeout時fail-closedを維持する。
- [ ] hung Node testの15秒待機はproduction launcherの有限timeout契約である。単にtestを高速化する目的でこの値を短縮しない。

#### Hook内部Git context取得が主因の場合

- [ ] `getGitCommandContext()`内のどのGit commandが遅いかを特定する。
- [ ] 同一Hook invocationで同じrepository contextを不要に再取得している場合だけ、invocation内で安全に再利用できるか検討する。
- [ ] repositoryが変わる`git -C`、複数repository、cwd transitionを跨いでcontextを共有しない。
- [ ] Git command失敗時のfail-closed判断を弱めない。
- [ ] testだけの重複でありruntimeでは重複していない場合、production Hookへ最適化を入れない。

#### fixture反復が主因の場合

- [ ] 同じ意味のfixture setupを安全に共有できるtestだけを特定する。
- [ ] branch state、remote、filesystem stateがtest間で漏れる場合は共有しない。
- [ ] fixture共有より、不要な`git init` / copyの重複を局所的に減らせる既存helper再利用を優先する。

#### 実装側の不具合がなくtestの実効timeoutだけが短い場合

- [ ] まず5秒default timeoutで失敗しているのか、15秒 / 20秒 / 30秒の明示timeoutで失敗しているのかを確定する。
- [ ] 単一subprocessの正常範囲と、1 test内の複数subprocess累積時間を分けて記録する。
- [ ] 正常実行が既存実効timeoutを複数回超えることを確認した場合だけ、対象test単位のtimeout調整を検討する。
- [ ] timeoutは実測最大値だけでなく複数回の分布を確認し、boundedな余裕を加えた値にする。
- [ ] `0`、無制限、根拠のない大幅な値は使わない。
- [ ] `.codex/config.toml`のruntime 30秒を、Vitest test timeoutの都合だけで変更しない。
- [ ] `.codex/hooks/pre_tool_use_policy_windows.ps1`内部の15秒を、Vitest aggregate timeoutの都合だけで変更しない。

### 手順5: 回帰テストとCIを整える

- [ ] 原因修正を検出できる既存contractがある場合は重複testを増やさず、そのcontractを維持する。
- [ ] process lifecycle不具合を修正した場合だけ、そのfailureを直接再現できる回帰testを追加する。
- [ ] 性能の絶対値を厳密にassertする新規benchmark testは追加しない。Windows負荷でflakyになるため、機能contractと根拠付きtimeoutで検出する。
- [ ] case count、policy ID集合、malformed input、allow / deny、Windows launcherの契約を引き続きassertする。
- [ ] `tests/contracts/codex-hook-contract.test.ts`だけのtest構造またはtest timeout変更で、production Windows経路を変更しない場合は、新しいWindows CI jobを追加しない。
- [ ] `.codex/hooks/pre_tool_use_policy_windows.ps1`または`.codex/config.toml`のWindows production経路を変更した場合は、`.github/workflows/ci.yml`でfocused contractを`windows-latest`実行する構成を追加できるか確認する。追加する場合もcontract全体を重複実行する必要はなく、今回のWindows経路を継続検出できる最小範囲にする。

### 手順6: 計測コードを整理する

- [ ] 一時計測用ログ、temporary script、raw timing outputはcommit対象から除外する。
- [ ] 将来の診断にも必要な小さなhelperだけが残る場合は、現在のtest責務から必要性を説明できるものに限定する。
- [ ] 新規dependency、benchmark framework、設定切替は追加しない。

## 7. 検証方法

### Windows対象テスト検証

修正後、まず対象fileを連続3回実行する。

```powershell
pnpm exec vitest run tests/contracts/codex-hook-contract.test.ts --no-file-parallelism --maxWorkers=1
pnpm exec vitest run tests/contracts/codex-hook-contract.test.ts --no-file-parallelism --maxWorkers=1
pnpm exec vitest run tests/contracts/codex-hook-contract.test.ts --no-file-parallelism --maxWorkers=1
```

各回で次を記録する。

- file全体所要時間
- 修正対象testの所要時間
- timeout / hanging subprocessの有無
- policy case数と失敗数
- Windows launcherのsafe / deny / malformed / fail-closed / hung契約の結果

### Windows標準contract検証

```powershell
pnpm run test:contracts
pnpm run test:contracts
pnpm run test:contracts
```

3回とも成功することをIssue #142の安定性判定とする。1回だけ成功した状態では完了扱いにしない。

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

### GitHub Actions

- Web CIの`Vitest (contracts)`が成功することを確認する。
- Linux CI成功はWindows安定性の代替にはしない。Windowsローカル連続実行と両方を完了条件とする。
- productionのWindows launcherまたは`.codex/config.toml`を変更してfocused Windows CIを追加した場合は、その`windows-latest` jobも成功することを確認する。

### timeout変更時の追加確認

- 変更前・変更後で同一環境、同一command、同一対象testの実時間を比較する。
- default 5秒、test固有15秒 / 20秒 / 30秒、launcher内部15秒、Codex runtime 30秒のどれを変更したかを明記する。
- 値を変更しなかったtimeoutについても、変更不要と判断した根拠を説明する。
- hung Node testのように意図的な待機を含むtestは、通常処理の性能値と分けて記録する。

## 8. リスクと未解決論点

### リスク

- testを速くする目的でpure policy evaluationへ寄せすぎると、実Hook entrypointやGit context取得の回帰検出力を落とす可能性がある。policy matrixとCLI / runtime / transport契約を分けて維持する。
- 明示timeoutなしのWindows testは5秒defaultで動く。15秒 / 30秒のtestだけを見て調整すると、別の実効timeoutを見落とす。
- hung Node testはproduction launcher内部15秒timeoutを意図的に検証する。これを通常の遅延と誤認するとsecurity / fail-closed契約を不必要に変更する可能性がある。
- `getGitCommandContext()`は最大4つのGit subprocessを起動する。Node startupだけを計測するとruntime側の律速を見落とす可能性がある。
- PowerShell launcherへ性能最適化を入れると、stdin / stdout / stderr / exit codeのtransportを壊す可能性がある。process lifecycleの事実が確認できない限り変更しない。
- fixture共有はtest isolationを壊す可能性がある。共有後にbranch / remote / filesystem状態が残るなら採用しない。
- Windows負荷による時間ばらつきを固定値だけで吸収すると再発原因が残る。複数回計測してからtimeout変更を判断する。
- GitHub ActionsのVitest contractsはUbuntuのみで、Windows専用testを実行しない。production Windows経路を変更した場合にLinux CI成功だけで回帰なしと判断しない。
- Issue本文のmatrix 30秒記載と現在の`main`の15秒に差がある。実装開始時の現行値を正本とする。

### 未解決論点

実装開始前のblocking questionはない。計測結果から、test内process反復、launcher lifecycle、Hook内部Git context取得、fixture、実効test timeout、外部負荷のどこへ変更が必要かを判断し、採用理由をRun Artifactへ記録する。

## 9. 成果物

### 必須

- 原因に対する必要最小限のsource / contract変更
- Windowsの修正前・修正後の計測要約
- 使用した環境versionと、Windows関連testの実効timeout一覧
- Windows対象file 3回連続成功の記録
- Windows `pnpm run test:contracts` 3回連続成功の記録
- GitHub Actions Web CI contract成功の記録

### 条件付き

- productionのWindows launcher / configを変更した場合のfocused Windows CI
- Hook runtime契約を変更した場合のみ`docs/PROJECT_CONTEXT.md`と対応する`docs/history/**` / ADR
- process lifecycleに新しい恒久契約を追加した場合のみ関連contract test

### 作成しないもの

- Issue #142専用の新規framework
- 不要なbenchmark utility
- plan-only段階の`docs/reports/`調査レポート
- 性能計測専用の恒久dependency

## 10. 実装時の判断順序

1. 現行branch / main / Hook関連差分を再確認する。
2. Windows環境versionと、Windows関連testの実効timeout・process起動構造を固定する。
3. Windowsで標準failureを再現し、timeoutしたtest名と実時間を確認する。
4. Node startup、PowerShell startup、`getGitCommandContext()`内Git、fixture、stdin / stdout / stderr、child exit待ちへ時間を分解する。
5. 同一条件で複数回計測し、単発の外れ値と再現する遅延を分ける。
6. test内の重複processだけが原因なら、production Hookを変更せずtest構造を整理する。
7. process lifecycle不具合ならlauncherだけを修正する。
8. runtime Hook本体のGit context取得に実際の重複がある場合だけ、repository境界を維持して局所修正する。
9. 不要な重複やlifecycle不具合を除いても正常実行が実効test timeoutを超える場合だけ、根拠付きで対象test timeoutを調整する。
10. production Windows経路を変更した場合だけ、focused Windows CIを追加する必要性を確認する。
11. Windows対象file 3回、標準contract 3回、`verify`、GitHub Actionsで回帰確認する。

この順序から外れて、先にtimeout値を大きくする、caseを削る、skipする、policyを弱める、hung testのproduction timeoutをtest都合で短縮する対応は行わない。
