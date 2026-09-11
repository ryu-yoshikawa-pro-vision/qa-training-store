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

### 完了条件（DoD）

- WindowsでIssue #142のtimeoutを再現し、どのテスト、subprocess、fixture処理、またはprocess lifecycleが所要時間を支配しているか説明できる。
- `tests/contracts/codex-hook-contract.test.ts`のpolicy case数、allow / denyの期待値、fail-closed検証を削減・弱体化していない。
- `.codex/hooks/pre_tool_use_policy.mjs`のHook policy semanticsを変更していない。変更が必要になった場合は、性能改善だけを理由にpolicy判定を緩めず、既存contractを全て維持する。
- `.codex/hooks/pre_tool_use_policy_windows.ps1`を変更する場合は、stdin / stdout / stderr、Node exit code、timeout時の停止、fail-closedのtransport契約を維持する。
- Windowsで対象Hook contractを3回連続で実行して成功する。
- Windowsで`pnpm run test:contracts`を3回連続で実行して成功する。
- `pnpm run verify`が成功する。Hook以外の既存failureが発生した場合は今回差分との因果関係を切り分け、成功扱いにはしない。
- GitHub Actions Web CIの`Vitest (contracts)`が成功する。
- timeout値を変更した場合は、変更前の実測値、変更後の実測値、設定値と余裕幅の根拠を説明できる。
- `skip`、case削除、Assertion弱体化、fail-closed緩和、無制限または過大なtimeout設定で回避していない。

## 2. 現状理解と前提

### Current understanding

1. 標準contract入口は`package.json`の次のscriptである。

   ```text
   test:contracts = vitest run tests/contracts --no-file-parallelism --maxWorkers=1
   ```

   contract suite全体が単一worker・非並列で動くため、同一test内で同期的に起動するNode / PowerShell / Git subprocessの累積時間がそのままテスト所要時間へ反映される。

2. `tests/contracts/codex-hook-contract.test.ts`では、少なくとも次の同期処理がある。

   - `runNodeHook()`: `spawnSync(process.execPath, [hookPath], ...)`
   - `runWindowsLauncher()`: `spawnSync("powershell.exe", ...)`
   - `runNodeHookWithExplicitContexts()`: policy case群を1つのNode subprocess内で`evaluateCommand()`へ渡す
   - `makeGitFixture()`: temporary directory作成、Hook copy、`git init`
   - `setFixtureBranch()`: `git symbolic-ref`
   - `removeFixture()`: recursive temporary directory削除
   - `runConfiguredWindowsCommand()`: Windows logging Hook contract用の`cmd.exe` / `pwsh.exe`起動

3. representative Hook matrixは、context付きcaseを`runNodeHookWithExplicitContexts()`でまとめて処理する一方、contextなしcaseはcaseごとに`runNodeHook()`を起動している。WindowsではNode起動とHook内部のGit context解決が繰り返されるため、累積時間増加の候補になる。ただし、現時点では原因と確定しない。

4. 現在の`main`では、`executes every common-policy representative from the Hook matrix`のVitest timeoutは`15000ms`である。Issue #142本文の「30秒」と現在の実装は一致していない。

5. timeoutは少なくとも3種類あり、同じ意味ではない。

   - `.codex/config.toml`のPreToolUse Hook timeout: `30秒`
   - `.codex/hooks/pre_tool_use_policy_windows.ps1`がNode Hook終了を待つ内部timeout: `15000ms`
   - `tests/contracts/codex-hook-contract.test.ts`の個別Vitest timeout: `15000ms`または一部`30000ms`

   実装時は、どのtimeoutが発火したかを分けて扱う。

6. PR #133のRun `20260911-232344-JST`では、標準`pnpm run test:contracts`が初回に既存Hook case 1件、bounded retryでは同じcaseに加えて別の既存launcher caseもtimeoutした。一方、診断目的の`--testTimeout=30000`実行は成功している。今回のPR #133 source変更はHook関連ファイルを変更していないため、Issue #142として分離された。

7. `.codex/config.toml`のPreToolUse `timeout = 30`は既存のruntime契約である。`docs/PROJECT_CONTEXT.md`でも、Windows launcherはtransport責務に限定し、PreToolUseの30秒、Bash matcher、Node policy、deny / fail-closeを維持する方針が記録されている。

8. GitHub Actions Web CIのcontract jobは`ubuntu-latest`で実行される。Windows固有の再現確認はローカルWindowsが正本であり、Linux CI成功だけではIssue #142の完了条件を満たさない。

### Assumptions

- Issue #142の目的はWindowsローカルcontractの安定化であり、Codex Hook policy自体の仕様変更ではない。
- Windows Defender等の外部負荷は計測時の観測対象に含めるが、外部要因を前提にtimeoutだけを拡大する方針は採らない。
- 一時的な計測コードやログは原因特定に必要な範囲で使用してよいが、恒久的な大量ログは追加しない。
- 既存のNode / Git / PowerShellを使って調査し、新規dependencyは追加しない。

### Non-goals

- PR #133の教材・Evidence validator変更
- Expo dependency mismatch
- Hook policyのG1-G10 / N1-N4 / A1-A17の意味変更
- 新しいHook framework、benchmark framework、process managerの導入
- Codex Run Artifact基盤、logging Hook基盤、sandbox設計の再設計
- Windowsローカル以外の性能一般化

## 3. Repository mapping

### Entry points

- `package.json`
  - `pnpm run test:contracts`
  - `pnpm run verify`
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
- `.codex/hooks/pre_tool_use_policy.mjs`
  - policy matrix、Hook payload処理、Git context解決、policy判定
- `.github/workflows/ci.yml`
  - Ubuntu上の`Vitest (contracts)`回帰確認

### Main flow

```text
pnpm run test:contracts
  -> Vitest / tests/contracts / single worker
  -> codex-hook-contract.test.ts
     -> Node Hook direct subprocess
        -> pre_tool_use_policy.mjs
        -> 必要なcaseではGit context解決
     -> Windows launcher subprocess
        -> powershell.exe
        -> pre_tool_use_policy_windows.ps1
        -> Node Hook subprocess
     -> Git fixture作成 / branch設定 / cleanup
     -> configured Windows command contract
        -> cmd.exe または pwsh.exe
        -> Hook launcher / logger
```

### Key abstractions

- `evaluateCommand(command, context)`: policy判定の純粋ロジックに近い境界。明示contextを渡すcontractではGit context取得を伴わない。
- Hook CLI entrypoint: stdin JSONを読み、runtime contextが必要ならGit commandを実行して`evaluateCommand()`へ渡す実運用境界。
- `pre_tool_use_policy_windows.ps1`: policyを持たず、WindowsでNode Hookを起動するtransport境界。
- Git fixture: repository contextが必要なcontractだけで使うテスト境界。

### Existing tests

- malformed inputのfail-closed
- safe commandの無出力
- UTF-8 payload
- structured deny shape
- policy matrix全case
- explicit contextでのGit policy
- `git -C`、複数repository、branch / cwd / environment transition
- Windows configured launcher
- Windows logging launcher
- missing Hook / missing root / nonzero logger等のfail-safe境界

### Safe change surface

優先順位は次のとおりとする。

1. `tests/contracts/codex-hook-contract.test.ts`内の重複subprocess起動やfixture setupを、coverageを維持したまま整理する。
2. subprocess lifecycleに実際の不具合がある場合だけ、`pre_tool_use_policy_windows.ps1`のtransport処理を局所修正する。
3. Hook本体が同一invocation内で不要なGit subprocessを繰り返していることが実測で確認された場合だけ、policy semanticsを変えない範囲で`pre_tool_use_policy.mjs`のcontext取得を整理する。
4. timeout変更は、1〜3で不具合・不要な重複を除いた後でも正常処理が既存閾値を合理的に超えると実測できた場合に限る。

### Unknowns

- 最初にtimeoutする正確なtest nameと、retry時に追加でtimeoutするlauncher test name。
- 15秒超過が特定の1 subprocessによるものか、複数caseの累積か。
- Node startup、PowerShell startup、Hook内部Git command、fixture作成 / cleanupのどれが支配的か。
- single launcher invocationが`15000ms`へ近づいているのか、集約testだけが`15000ms`を超えているのか。
- stdin EOFやstdout / stderr drain待ちでprocess終了が遅延しているか。

## 4. 質問 / 曖昧性

- 必ず質問する不透明点: なし。Issue #142、既存Hook契約、現在の実装から、まず計測して原因別に修正を選ぶ方針まで確定できる。
- 仮定してよい細部: 計測用の一時ログ形式、ローカル計測ファイル名、実装時のhelper名。恒久APIにはしない。
- 未回答の重要質問: なし。原因が複数候補に分かれるため、実装前半の計測結果を分岐条件として扱う。

## 5. 影響範囲

### 変更候補

- `tests/contracts/codex-hook-contract.test.ts`
  - 第一候補。計測結果に応じてsubprocess反復、fixture setup、test timeoutのいずれかを最小修正する。
- `.codex/hooks/pre_tool_use_policy_windows.ps1`
  - PowerShell launcher自体のprocess lifecycle不具合が確認された場合のみ変更する。
- `.codex/hooks/pre_tool_use_policy.mjs`
  - Hook本体の不要なGit subprocess反復が確認され、テストだけではなくruntimeでも無駄がある場合のみ変更する。
- `.codex/config.toml`
  - 原則として変更しない。runtime PreToolUseの30秒契約は既存仕様として維持する。実測からruntime timeout自体の変更が必要と判断した場合は、Issue目的との整合を再確認して別判断とする。
- `docs/PROJECT_CONTEXT.md` / `docs/history/**`
  - Hook runtime契約やWindows launcher設計判断を変更した場合のみ更新する。test-only修正なら不要。

### 確認のみ

- `package.json`
- `.github/workflows/ci.yml`
- PR #133 Run `20260911-232344-JST`
- Hook関連の直近ADR / Run Artifact

## 6. 変更方針

### Phase 1: Windowsでfailureを固定する

- [ ] `main`相当のbranch HEADで、対象file単体をverbose実行してtimeoutするtest nameと実時間を記録する。

  ```powershell
  pnpm exec vitest run tests/contracts/codex-hook-contract.test.ts --no-file-parallelism --maxWorkers=1 --reporter=verbose
  ```

- [ ] 標準`pnpm run test:contracts`を1回実行し、対象file単体と同じfailureか確認する。
- [ ] 再現しない場合は無目的な連続retryをせず、Issueで再現した条件に近いWindowsローカル負荷・shell・Node / pnpm versionを確認する。
- [ ] `--testTimeout=30000`は原因確認用の比較としてのみ使用し、恒久修正の結論にはしない。

### Phase 2: 所要時間を分解する

恒久的な大量ログは追加せず、一時的な計測またはVitest出力で次を分けて測る。

- [ ] `runNodeHook()` 1回の所要時間
  - safe payload
  - deny payload
  - Git contextが必要なpayload
  - `cwd=repoRoot`とtemporary Git fixture
- [ ] `runNodeHookWithExplicitContexts()`で同じcase群をまとめた場合の所要時間
- [ ] `runWindowsLauncher()` 1回の所要時間
- [ ] `powershell.exe`空起動相当とlauncher実行の差
- [ ] `git init` / `git symbolic-ref` / Hook file copy / `fs.rmSync`の所要時間
- [ ] configured Windows commandの`cmd.exe`経由と`pwsh.exe`経由の所要時間
- [ ] stdinを書き終えた後からchild process exitまでの時間

最低限、次の分類ができる状態まで計測する。

```text
A. 特定caseまたは特定subprocess単体が異常に遅い
B. 1回ごとは正常だが、同期subprocess反復の累積でtest timeoutを超える
C. fixture作成 / cleanupが支配的
D. stdin / stdout / stderr / child exitのlifecycle待ちが発生する
E. 外部負荷によるばらつきだけが大きく、実装側の重複や待機不具合を確認できない
```

### Phase 3: 原因別に最小修正する

#### B: matrix内のsubprocess反復が主因の場合

- [ ] policy matrixの全caseとexpected allow / denyは維持する。
- [ ] pure policy semanticsを確認できるcaseは、既存`runNodeHookWithExplicitContexts()`相当の1 subprocess内batch評価を再利用できるか検討する。
- [ ] Hook CLI entrypoint、stdin parsing、runtime Git context取得、structured deny / fail-closedは別の既存contractで実経路を維持する。
- [ ] coverage削減ではなく、同一責務を何十回もOS processとして繰り返している部分だけを減らす。

判断基準:

- 全policy IDとallow / deny期待値が残ること。
- runtime context取得が必要な契約までpure evaluationへ置き換えないこと。
- Windows以外でも意味が変わらないこと。

#### A / D: PowerShell launcherまたはprocess lifecycleが主因の場合

- [ ] `pre_tool_use_policy_windows.ps1`の`CopyTo()`、stdin close、stdout / stderr async read、`WaitForExit()`、timeout後Killの順序を実測と照合する。
- [ ] EOFが届かない、redirect stream待ち、child exit待ちなど具体的な不具合が確認できた箇所だけを修正する。
- [ ] launcherへpolicy判定を移さない。
- [ ] exit code `0` / `2`、stderr伝播、timeout時fail-closedを維持する。

#### C: fixture反復が主因の場合

- [ ] 同じ意味のfixture setupを安全に共有できるtestだけを特定する。
- [ ] branch stateやfilesystem stateがtest間で漏れる場合は共有しない。
- [ ] fixture共有より、不要な`git init` / copyの重複を局所的に減らせる既存helper再利用を優先する。

#### E: 実装側の欠陥がなくtest aggregate timeoutだけが短い場合

- [ ] 1 subprocessの正常上限とaggregate testの実測分布を分けて記録する。
- [ ] 既存の`15秒`を超える正常実行が複数回再現し、30秒診断で安定する場合だけ、対象test単位のtimeout調整を検討する。
- [ ] timeoutは実測上限にbounded marginを加えた値とし、`0`、無制限、極端に大きい値は使わない。
- [ ] `.codex/config.toml`のruntime 30秒を、Vitest aggregate timeoutの都合だけで変更しない。
- [ ] `.codex/hooks/pre_tool_use_policy_windows.ps1`内部の15秒を、aggregate test timeoutと混同して変更しない。

### Phase 4: 回帰テストを整える

- [ ] 原因修正を検出できる既存contractがある場合は重複テストを増やさず、そのcontractを維持する。
- [ ] process lifecycle不具合を修正した場合だけ、そのfailureを直接再現できる回帰testを追加する。
- [ ] 性能の絶対値を厳密にassertする新規benchmark testは追加しない。CI / Windows負荷でflakyになるため、機能contractとbounded timeoutで検出する。
- [ ] case count、policy ID集合、malformed input、allow / deny、Windows launcherの契約を引き続きassertする。

### Phase 5: 計測コードを整理する

- [ ] 一時計測用ログ、temporary script、raw timing outputはcommit対象から除外する。
- [ ] 将来の診断にも必要な小さなhelperだけが残る場合は、現在のtest責務から必要性を説明できるものに限定する。
- [ ] 新規dependency、benchmark framework、設定切替は追加しない。

## 7. 検証方法

### Windows focused validation

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

### Windows standard contract validation

```powershell
pnpm run test:contracts
pnpm run test:contracts
pnpm run test:contracts
```

3回とも成功することをIssue #142の安定性判定とする。1回だけ成功した状態では完了扱いにしない。

### Repository標準検証

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
- Linux CI成功はWindows安定性の代替にはしない。Windows連続実行と両方を完了条件とする。

### timeout変更時の追加確認

- 変更前・変更後で同一条件の実時間を比較する。
- test timeout、launcher内部timeout、Codex runtime timeoutのどれを変更したかを明記する。
- 値を変更しなかったtimeoutについても、なぜ変更不要だったかを説明する。

## 8. リスクと未解決論点

### Risks

- testを速くする目的でpure policy evaluationへ寄せすぎると、実Hook entrypointやGit context取得の回帰検出力を落とす可能性がある。policy matrix coverageとtransport / runtime context contractを分けて維持する。
- PowerShell launcherへ性能最適化を入れると、stdin / stdout / stderr / exit codeのtransportを壊す可能性がある。process lifecycleの事実が確認できない限り変更しない。
- fixture共有はtest isolationを壊す可能性がある。共有後にbranch / remote / filesystem状態が残るなら採用しない。
- Windows負荷による時間ばらつきを固定値だけで吸収すると再発原因が残る。timeout変更は最後の選択肢とする。
- Issue本文の30秒記載と現在の`main`の15秒に差があるため、古い前提のまま実装すると誤った箇所を変更する。実装開始時に現行値を再確認する。

### Open questions

実装開始前のblocking questionはない。Phase 2の計測結果に応じてA〜Eのどの分岐を採るか決定し、採用理由をRun Artifactへ記録する。

## 9. 成果物

### 必須

- 原因に対する必要最小限のsource / contract変更
- Windowsの修正前・修正後の計測要約
- Windows focused test 3回連続成功の記録
- Windows `pnpm run test:contracts` 3回連続成功の記録
- GitHub Actions Web CI contract成功の記録

### 条件付き

- Hook runtime契約を変更した場合のみ`docs/PROJECT_CONTEXT.md`と対応する`docs/history/**`
- process lifecycleに新しい恒久契約を追加した場合のみ関連contract test

### 作成しないもの

- Issue #142専用の新規framework
- 不要なbenchmark utility
- plan-only段階の`docs/reports/`調査レポート

## 10. 実装時の判断順序

1. 現行branch / main / Hook関連差分を再確認する。
2. Windowsで標準failureを再現する。
3. timeoutしたtest名と実時間を固定する。
4. Node / PowerShell / Git / fixture / EOF・exit待ちへ時間を分解する。
5. A〜Eの原因分類を決める。
6. test構造で解消できるならproduction Hookを変更しない。
7. transport不具合ならlauncherだけを修正する。
8. runtime Hook本体の重複が原因ならpolicy semanticsを維持して局所修正する。
9. 不要な重複やlifecycle不具合を除いても正常実行が閾値を超える場合だけ、根拠付きでtest timeoutを調整する。
10. Windows連続実行、標準contract、`verify`、GitHub Actionsで回帰確認する。

この順序から外れて、先にtimeout値を大きくする、caseを削る、skipする、policyを弱める対応は行わない。
