# Issue #140 Windows launcher contract test timeout 調査・修正計画

## 0. 依頼概要

- 対象: Issue #140「test: Windows launcherのcontract testが5秒timeoutになる原因を調査する」
- 背景: Windowsローカルの`pnpm run verify`で、`test:contracts`内のWindows launcher関連テスト2件がVitest既定の5秒timeoutを超えて失敗した記録がある。
- PR #139の現在のheadではローカル`pnpm run verify`がPASSした記録もあるため、Issue作成時の失敗状態と現在のPR headを同一視しない。
- 目的: historical failure、PR #139との因果、1回のlauncher起動時間、3回直列起動の累積、suite全体でのみ悪化する可能性を切り分け、根拠に応じた最小修正または変更なしを選ぶ。

## 1. ゴール / 完了条件

### ゴール

Windows launcherを経由する2件のcontract testが5秒を超えた理由について、再現結果、実測値、コード経路から説明できる範囲を確定する。

対象2テストは別々に評価する。次の要因は排他的な分類ではなく、複数が同時に成立する可能性を許容する。

1. 1回のlauncher起動は安定しているが、1テスト内の3回直列起動の合計で5秒付近または5秒超になる。
2. launcher 1回の起動自体に異常な待機または大きなばらつきがある。
3. focused testでは安定するが、`test:contracts`または`pnpm run verify`でのみ悪化する。
4. historical failureは確認できるが、今回のWindows環境では標準条件で再現しない。

focused test全体の時間だけでは1と2を区別しない。片方だけ異なる要因に該当する場合や、3回累積とsuite条件が同時に影響する場合も、そのまま記録する。

### 完了条件

- Issue #140に記録された5569ms／5071msをhistorical failure evidenceとして扱い、現在の再現結果と区別している。
- PR #139の因果確認用historical baseline `13cc542fa31f372bd4bc932cf7a82b92bcf81a23`、PR #139 head、Issue #140 branch作成時main baseline `12fff8eafccef4ab939efec623ac8a8d4f1ac539`、実装開始時latest mainの関係を記録している。
- historical baselineとIssue branch作成時main baselineを、それぞれ自身のlockfileから依存構築したcleanな状態で比較している。
- 対象2件を一時diagnosticなし・Vitest既定5秒条件で最大10回実行し、実際に実行した全runの生値、PASS/FAIL、min、median、maxを記録している。Repositoryの再試行停止条件に達した場合は、無目的に残り回数を消化していない。
- 同じWindows環境で`pnpm run test:contracts`を最大3回、`pnpm run verify`を最大2回実行し、focused testとの差を修正判断前に確認している。
- historical baselineで再現せずPR #139との因果が未解決の場合だけ、PR #139 current headを同じWindows環境・同じtoolchainで追加計測している。
- focused testで再現した対象について、3回累積とlauncher 1回の異常を区別するために必要な呼び出し単位の計測を行っている。
- focusedでは安定しsuite／`verify`でのみ悪化した対象について、対象file単体、full contracts、実行順、process残存の相関を必要な範囲で切り分けている。
- launcher 1回の異常が確認された場合だけ、PowerShell launcher内部のどこで時間を消費しているか詳細計測している。
- 同じtest fileにある既存Windows launcher testの`30000ms` timeoutについて、現在の保証内容と導入履歴を確認し、今回のtimeout値を決める直接根拠にはしていない。
- 既存GitHub ActionsではWindows launcherの比較時間を取得できるか確認し、取得できない場合はその理由を証跡付きで記録している。
- baseline間に5秒境界の判断へ影響する差が出た場合は、実行順を反転した再確認を行ってからdependency差分等との因果を判断している。
- 修正を行う場合は修正方法に対応した回帰確認を行い、変更なしの場合は非再現または未特定の根拠を残している。
- `.codex/hooks/pre_tool_use_policy_windows.ps1`、`.codex/hooks/pre_tool_use_policy.mjs`、`.codex/config.toml`のいずれかを変更した場合は、Windows向けRepository harness検証として`scripts/verify.ps1`を実行している。
- safe/deny、quote/backslash、LF/CRLF、cwd、exit code、stdout/stderrの既存contractを変更していない。
- source／testの最終状態で`pnpm run test:contracts`と`pnpm run verify`がPASSしている。Issue #140と因果のないfailureで`verify`がPASSしない場合は、Issue #140を完了扱いにせずblockerとして記録している。
- Run Artifact更新後にsanitizerのWrite／Checkを完了し、その最終ファイル状態で`pnpm run lint:markdown`と`git diff --check`がPASSしている。

## 2. 現状理解と前提

### 確認済み

- Issue #140には、Windowsローカルの`pnpm run verify`で次の2件が5秒timeoutを超えた記録がある。
  - `Windows launcher safe/deny semantics`: 5569ms
  - `quote/backslash/LF/CRLF stdin semantics`: 5071ms
- 同じ2件はtimeoutを30秒にした対象確認では2/2 PASSしている。ただし、この結果だけを根拠にtimeout不足と断定しない。
- Issue #140作成時点ではPR #139のworking treeで`pnpm run verify`がFAILしcommit／pushを停止していた。一方、現在のPR #139 head `a7632fad478ac5d28f53849ce950b1d205024f36`のPR本文にはローカル`pnpm run verify` PASSが記録されている。失敗したworking treeを現在のPR headそのものとして扱わない。
- PR #139のbaseは`13cc542fa31f372bd4bc932cf7a82b92bcf81a23`である。
- PR #139 base／headでは、少なくとも`tests/contracts/codex-hook-contract.test.ts`、`.codex/hooks/pre_tool_use_policy_windows.ps1`、`.codex/hooks/pre_tool_use_policy.mjs`、`vitest.config.ts`にlauncher timeoutの直接原因となる差分は確認されていない。
- `12fff8eafccef4ab939efec623ac8a8d4f1ac539`はPR #139 baseの後に取り込まれたPR #138のcommitで、`sharp`と`pnpm-lock.yaml`を変更している。historical baselineとは分ける。
- 正規contract testコマンドは`pnpm run test:contracts`で、実体は`vitest run tests/contracts --no-file-parallelism --maxWorkers=1`である。
- `vitest.config.ts`にはrepository固有の`testTimeout`指定がない。
- 対象2件は`tests/contracts/codex-hook-contract.test.ts`にある。
- `preserves safe and deny semantics through the Windows launcher from root and nested cwd`は1つの`it`内で次を直列実行する。
  - root cwd / safe
  - nested cwd / safe
  - nested cwd / deny
- `keeps quote, backslash, LF, and CRLF stdin semantics through the launcher`も1つの`it`内で次を直列実行する。
  - compact JSON
  - LF stdin
  - CRLF stdin
- 同じtest fileには`preserves PreToolUse policy through the configured Windows launcher and both shell wrappers`があり、PR #106で追加された。このtestは`cmd`／`pwsh`、root／nested cwd、safe／denyを組み合わせてconfigured Windows launcherを複数回起動し、個別に`30000ms` timeoutを指定している。
- PR #106ではPreToolUseのconfig側timeout 30秒を維持しているが、今回の2件とは外部process起動数、shell wrapper、保証内容、実行経路が異なる。既存testの`30000ms`を今回へそのまま流用しない。
- 同じtest fileにはlauncher内部15秒timeoutを確認するhung Node Hook testがあり、test側では`20000ms`を指定している。test固有timeoutを処理経路に応じて設定する既存例ではあるが、今回の正常系timeout値の数値根拠にはしない。
- `runWindowsLauncher()`はNodeから`powershell.exe -NoProfile -ExecutionPolicy Bypass -File .codex/hooks/pre_tool_use_policy_windows.ps1`を直接`spawnSync()`する。この直接経路には`cmd.exe`を含まない。
- `.codex/hooks/pre_tool_use_policy_windows.ps1`はrepository root解決、`Get-Command node`、Node child process起動、stdin転送、stdout/stderr回収、最大15秒の`WaitForExit`を行う。
- 実際のCodex `command_windows`は`cmd.exe -> powershell.exe -> pre_tool_use_policy_windows.ps1`だが、今回timeoutした2件の直接経路とは異なる。
- `scripts/verify.ps1`はCodex harnessのWindows launcher契約を検証するRepository固有の検証であり、`pnpm run verify`には含まれていない。
- 現行Web CIの`Vitest (contracts)`はUbuntuで実行される。対象2件はWindows以外では`process.platform !== "win32"`でlauncher処理を実行しないため、既存CIの成功時間はWindows launcherの比較値にならない。
- Windows runnerを使う既存jobはCodex artifact sanitizerであり、`test:contracts`は実行していない。
- Repositoryでは`.codex/runs/<run_id>/`を正式成果物として保存し、`REPORT.md`はappend-only、actual `run.json`はmachine-managedとする。
- Repositoryの再試行方針では、同一エラー2回連続、同じ工程3回失敗、新しい情報なし、仮説なしの場合は再試行を止めて原因調査へ戻る。
- Repositoryへ追加するCodex Run Artifactは完了前に`scripts/sanitize-codex-artifacts.ps1`のWrite／Checkが必要である。

### 比較対象

- historical failureの因果確認用baseline: `13cc542fa31f372bd4bc932cf7a82b92bcf81a23`（PR #139 base）
- PR #139 current head: `a7632fad478ac5d28f53849ce950b1d205024f36`
- Issue #140 branch作成時main baseline: `12fff8eafccef4ab939efec623ac8a8d4f1ac539`
- 実装開始時latest main: 実装開始時に追加記録する。latest mainが進んでもhistorical baselineは置き換えない。

### 前提

- 調査はWindows実環境を主な再現環境とする。
- baseline比較は同じWindows PC、同じNode／pnpm／PowerShell条件で行う。
- baselineごとにそのSHA自身の`pnpm-lock.yaml`を使って依存を構築する。
- 一時diagnosticなしの標準計測と、一時diagnosticありの詳細計測を別データとして扱う。
- 計測回数は証拠収集の上限であり、同一failureを無目的に繰り返すための回数ではない。
- 5秒timeoutそのものが短すぎる可能性は残すが、先にtimeout値を変更しない。
- diagnosticでは`HookResult`、stdout/stderr、exit code、payload contractを変更しない。一時変更は最終差分から削除する。
- Issue #140は無関係な変更を対象外としているため、最終`verify`でIssue #140と因果のないfailureを検出しても、このIssueの実装範囲へ無条件に追加しない。原因を切り分け、blockerとして記録し、Issue #140を完了扱いにしない。

### 対象外

- PR #139の契約変更内容の再設計。
- 原因未確認のまま5秒から30秒へtimeoutを延長すること。
- 対象テストのskipや除外。
- CI全体のtimeout緩和。
- 原因が確認されていない段階での`.github/workflows/**`変更。
- Issue #140と因果のないProduct Code／Test／Hook／workflow failureの修正。
- launcherやprocess管理の全面的な抽象化・リファクタリング。
- Windows CI追加をIssue #140の必須成果とすること。
- test分割だけで実行時間を改善したと扱うこと。

## 3. 調査で確定する点

### 第一段階で確定する点

- historical baseline、Issue branch作成時main baseline、必要に応じてPR #139 head／latest mainでfocused testの再現性に差があるか。
- focused testの実行した全runの個別所要時間とPASS/FAIL。
- `test:contracts`、`pnpm run verify`で対象2件の挙動がfocused testと変わるか。
- 1回目だけ遅い、数回に1回遅い、徐々に遅くなる等の順序依存があるか。
- historical failureが今回再現しない場合、その事実と未確認点を区別できているか。

第一段階では、focused testで再現した事実だけから「3回累積」か「launcher 1回の異常」かを確定しない。

### focused testで再現した対象だけ確定する点

- safe root、safe nested、deny nested、compact、LF、CRLFのうち該当テストが使う各`runWindowsLauncher()`1回あたりの所要時間。
- 3回合計とVitestが報告するテスト全体時間の差。
- 全呼び出しが同程度で3回累積を説明できるか、特定の呼び出しだけ遅いか。
- 1回の所要時間に大きなばらつきがあるか。

### suite／`verify`でのみ悪化した対象だけ確定する点

- focused test、`codex-hook-contract.test.ts` file単体、`test:contracts`全体のどの段階で悪化するか。
- 対象test直前の実行内容と遅延の相関があるか。
- 対象test実行前後でPowerShell／Node等のprocess残存が増えていないか。
- 一時diagnosticをsuite実行時にも有効にした場合、同じ`runWindowsLauncher()`呼び出しがfocused時より遅くなるか。
- 実行順を変えた場合に遅延が対象testへ固定されるか、直前処理へ追従するか。

相関を確認できない場合は「suite負荷が原因」と断定せず、suite条件でのみ再現する未特定事象として残す。

### launcher 1回の異常がある場合だけ確定する点

- PowerShell起動後の`git rev-parse --show-toplevel`。
- `Get-Command node`とNode child process起動。
- stdin copy／close。
- stdout/stderr read。
- `WaitForExit`とprocess終了後のcleanup。
- Node Hook終了後のPowerShell／Node process残存。

PowerShell processそのものの起動時間はtest helper側から扱う。PowerShell内部instrumentationだけでprocess起動前の時間を測ったことにしない。

### 既存timeout設計について確定する点

- PR #106で追加された`preserves PreToolUse policy through the configured Windows launcher and both shell wrappers`の`30000ms`について、process起動数、shell wrapper、保証内容、実行経路を今回の2件と比較する。
- PR #106の履歴から確認できる事実と、test-level `30000ms`の値そのものに明示的な根拠があるかを分けて記録する。
- 既存`30000ms`は既存パターンの参考情報に限定し、今回のtimeout値を決める直接根拠にはしない。

### 既存CIについて確定する点

- PR #139等の既存`Vitest (contracts)`ログを確認し、実行OSを記録する。
- Ubuntuでは対象2件がWindows launcherを実行しないため、既存CIからWindows launcherの比較時間を取得できないことを記録する。
- Windows runner上で既存`test:contracts`が実行されていないことを確認する。
- 比較値が取得できないことだけを理由にWindows CIを追加しない。

### 未回答の重要事項

- 約5.1〜5.6秒が3回の正常なprocess起動の累積なのか、1回の異常待機を含むのかは未確定。
- 2件のtestが同じ要因で遅延しているかは未確定。
- historical failureを発生させた未commit working treeを完全に復元できるかは未確認である。
- timeout変更、test分割、launcher修正、変更なしのどれが必要かは計測完了まで決めない。

## 4. 影響範囲

### 最初に確認するファイル

- `tests/contracts/codex-hook-contract.test.ts`
- `.codex/hooks/pre_tool_use_policy_windows.ps1`
- `.codex/hooks/pre_tool_use_policy.mjs`
- `vitest.config.ts`
- `package.json`
- `pnpm-lock.yaml`
- `.codex/config.toml`
- `.github/workflows/ci.yml`
- `scripts/verify.ps1`
- `AGENTS.md`
- `PLANS.md`

### 原因次第で変更候補になるファイル

- test構造／test固有timeout: `tests/contracts/codex-hook-contract.test.ts`
- launcher内部の不要な待機: `.codex/hooks/pre_tool_use_policy_windows.ps1`
- Node Hook自体の具体的な遅延: `.codex/hooks/pre_tool_use_policy.mjs`
- repository全体の`vitest.config.ts`変更は、他のcontract testにも同じ根拠がある場合だけ検討する。
- `.github/workflows/ci.yml`は原因・必要性を確認せず変更しない。
- active Runの`PLAN.md`、`TASKS.md`、`REPORT.md`はRepository規約に従って更新する。actual `run.json`を直接編集しない。

## 5. 実行手順

- [ ] 1. 同一会話のactive Runがあれば再利用する。なければRepository標準手順でRunを初期化する。actual `run.json`を直接作成・編集しない。
- [ ] 2. historical baseline、PR #139 head、Issue branch作成時main baseline、latest main SHAを記録する。
- [ ] 3. Node、pnpm、`powershell.exe`の解決path／version、`powershell.exe`内で`Get-Command node`が解決するNode path、実行PCを記録する。
- [ ] 4. PR #139 base／headについて、対象test、Windows launcher、Node Hook、Vitest設定、package／lockfile等のtimeout経路に差分がないか再確認する。現在のPR headのローカル`pnpm run verify` PASSもhistorical failureと分けて記録する。
- [ ] 5. PR #106で追加された既存`30000ms` Windows launcher testについて、今回の2件とのprocess起動数・経路・保証内容の違いを記録する。既存30秒を今回のtimeout値として直接採用しない。
- [ ] 6. PR #139の既存`Vitest (contracts)` Actionsログを確認し、Ubuntuでは対象2件がlauncherを実行しないためWindows比較値にならないこと、既存Windows jobでは`test:contracts`を実行していないことを記録する。
- [ ] 7. historical baseline `13cc542...`をcleanな別worktree等で用意し、そのSHAのlockfileを使って依存を準備する。

```powershell
pnpm install --frozen-lockfile --ignore-scripts
git diff --exit-code -- package.json pnpm-lock.yaml
```

- [ ] 8. historical baselineで対象2件を一時diagnosticなし・Vitest既定5秒条件のまま、それぞれ最大10回実行する。PASSが続く場合はばらつき把握のため最大10回まで取得する。同一timeout failureが2回連続し新しい情報が増えない場合は残り回数を消化しない。
- [ ] 9. historical baselineで`pnpm run test:contracts`を最大3回、`pnpm run verify`を最大2回実行する。同一failureが2回連続し新しい情報が増えない場合は再試行を止め、focusedとの差と最初の異常を調査する。
- [ ] 10. Issue branch作成時main baseline `12fff8e...`をcleanな状態で用意し、そのSHAのlockfileから依存を準備する。手順7と同じ`pnpm install`／lockfile差分確認を行う。
- [ ] 11. `12fff8e...`でもfocused最大10回、`test:contracts`最大3回、`verify`最大2回を同じ停止条件で計測する。
- [ ] 12. `13cc542...`と`12fff8e...`で、一方だけ5秒timeoutを繰り返す、または5秒境界の判断を変える差を観測した場合だけ、実行順を`12fff8e... -> 13cc542...`へ反転して再確認する。順序を反転しても差が残ることを確認するまで、PR #138以降のdependency差分を原因と断定しない。
- [ ] 13. historical baselineで今回のfailureを再現せず、PR #139との因果が静的差分だけでは閉じない場合だけ、PR #139 current head `a7632fa...`をcleanな別worktree等で用意する。そのhead自身のlockfileで依存を準備し、focused、`test:contracts`、必要なら`verify`を同じ上限・停止条件で比較する。
- [ ] 14. latest mainが`12fff8e...`から進んでおり、timeout経路または依存に関連変更がある場合だけ、latest mainでも同じ比較を追加する。
- [ ] 15. source未変更計測から、対象2テストを別々に次の状態へ整理する。
  - focusedでも5秒timeoutまたは5秒境界付近の遅延を再現する。
  - focusedは安定するがsuite／`verify`でのみ悪化する。
  - historical failureはあるが今回再現しない。
- [ ] 16. focusedで再現した対象だけ、3回累積かlauncher 1回の異常かを区別するため`runWindowsLauncher()` test helperへ一時diagnosticを追加する。`HookResult`やlauncher stdout/stderrへ計測値を混ぜない。
- [ ] 17. diagnosticを使う場合、該当testの各launcher呼び出しについて最大10回分の生値、min、median、maxを記録し、3回合計とテスト全体時間を比較する。同一failureが続き新しい情報が増えない場合はRepositoryの停止条件に従う。
- [ ] 18. focusedは安定するがsuite／`verify`でのみ悪化する対象について、まず`codex-hook-contract.test.ts` file単体を実行し、focusedとの差を確認する。次にfull `test:contracts`との差を確認し、悪化がfile内かcontracts全体かを絞る。
- [ ] 19. 手順18でsuite条件との相関が残る場合だけ、対象test直前の実行内容、実行順、対象test前後のPowerShell／Node等のprocess残存を確認する。必要なら一時diagnosticをsuite実行時にも有効にしてfocused時と比較する。実行順を変えて遅延が対象testへ固定されるか、直前処理へ追従するかを確認する。
- [ ] 20. 手順15〜19の結果から、対象2テストごとに成立する要因を記録する。複数要因が同時に成立する場合は1つへ丸めない。
- [ ] 21. launcher 1回の異常が確認された場合だけPowerShell launcher内部へ一時計測を追加し、repo root解決、Node解決、Node起動、stdin copy／close、stdout/stderr read、`WaitForExit`、process終了を区別する。
- [ ] 22. launcher内部調査が必要な場合だけprocess treeと終了状態を確認し、Node Hook完了後にPowerShellまたはNodeが残存していないか確認する。
- [ ] 23. 直接`powershell.exe`経路で説明できず、実運用shell wrapperとの比較が必要な場合だけ`.codex/config.toml`の`cmd.exe -> powershell.exe`経路を追加確認する。
- [ ] 24. 判断基準に従い、共通原因がある場合は共通原因を優先して、最小修正または変更なしを選ぶ。2件で要因が異なる場合は無理に同じ修正へ統一しない。
- [ ] 25. 一時diagnosticをすべて削除し、最終sourceへ計測専用変更を残さない。
- [ ] 26. 修正方法に対応した回帰確認を行う。
  - launcher修正: 最終sourceをVitest既定5秒条件で対象2件それぞれ最大10回確認する。failureが出た時点で「安定PASS」とせず原因調査へ戻る。
  - test分割: 分割後のsafe root / safe nested / deny nested / compact / LF / CRLF全caseを確認し、各caseの5秒境界と既存保証範囲を確認する。
  - test固有timeout変更: 変更後の通常コマンドで対象testを最大10回確認し、変更前の5秒条件で得た実測値とtimeout値の根拠を残す。修正後に5秒PASSを要求しない。failureが出た場合は値をさらに広げて回避しない。
  - 変更なし: historical evidence、今回の計測結果、非再現または未特定の根拠を記録する。
- [ ] 27. `.codex/hooks/pre_tool_use_policy_windows.ps1`、`.codex/hooks/pre_tool_use_policy.mjs`、`.codex/config.toml`のいずれかを変更した場合だけ、`powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/verify.ps1`を実行する。test構造／test timeoutだけの変更では必須にしない。
- [ ] 28. source／testの最終状態で`pnpm run test:contracts`と`pnpm run verify`を実行する。failureが出た場合は最初の異常とIssue #140の変更との因果を確認する。
- [ ] 29. 最終`verify`のfailureがIssue #140の変更に起因する、またはIssue #140を正しく検証するために必要な範囲なら最小修正して再実行する。Issue #140と因果のないfailureと確認できた場合は、このIssueの修正範囲へ追加せずblockerとしてRun Artifactへ記録し、`verify`未達のためIssue #140を完了扱いにしない。
- [ ] 30. active Runの`TASKS.md`を更新し、`REPORT.md`へ調査結果、各runの計測値、原因判定、修正内容、採用しなかった主要案、未確認点、blocker、検証結果をappend-onlyで追記する。
- [ ] 31. Repositoryへ追加するRun Artifactにsanitizerの`-Write`、続けて`-Check`を実行し、未サニタイズのローカル絶対pathを残さない。
- [ ] 32. sanitizer後の最終ファイル状態で`pnpm run lint:markdown`と`git diff --check`を実行する。Run ArtifactまたはPlanを修正した場合はsanitizer `-Check`とこの2コマンドを再実行する。最終検証結果を記録するためだけに`REPORT.md`を再編集して検証済み状態を崩さない。

## 6. 検証方法

### 実行環境

各baselineで次を記録する。

```powershell
git rev-parse HEAD
node --version
pnpm --version
Get-Command powershell.exe | Select-Object -ExpandProperty Source
powershell.exe -NoProfile -Command '$PSVersionTable.PSVersion.ToString()'
powershell.exe -NoProfile -Command '(Get-Command node).Source'
```

### focused test

```powershell
pnpm exec vitest run tests/contracts/codex-hook-contract.test.ts --no-file-parallelism --maxWorkers=1 -t "preserves safe and deny semantics through the Windows launcher from root and nested cwd"
```

```powershell
pnpm exec vitest run tests/contracts/codex-hook-contract.test.ts --no-file-parallelism --maxWorkers=1 -t "keeps quote, backslash, LF, and CRLF stdin semantics through the launcher"
```

### test file単体

suite限定の悪化を切り分ける場合に使用する。

```powershell
pnpm exec vitest run tests/contracts/codex-hook-contract.test.ts --no-file-parallelism --maxWorkers=1
```

### 繰り返し実行の停止条件

- focused testは最大10回。PASSが続く場合はばらつき把握のため最大10回まで取得する。
- 同じtimeout failureが2回連続し、新しい情報が増えない場合は残り回数を消化せずdiagnosticまたは原因調査へ進む。
- `test:contracts`は最大3回、`verify`は最大2回。同じfailureが2回連続した場合は無目的な再試行を止める。
- 終了した時点までの全runを保存し、実行していない回数をPASS扱いしない。

### 生値の記録

min／median／maxだけでなく、順番を保った各runの値も残す。

| run | safe/deny | 結果 | quote/LF/CRLF | 結果 |
| ---: | ---: | --- | ---: | --- |
| 1 | - | - | - | - |
| 2 | - | - | - | - |
| 3 | - | - | - | - |
| 4 | - | - | - | - |
| 5 | - | - | - | - |
| 6 | - | - | - | - |
| 7 | - | - | - | - |
| 8 | - | - | - | - |
| 9 | - | - | - | - |
| 10 | - | - | - | - |

要約は実際に実行した回数で残す。

| 対象 | 実行回数 | PASS | FAIL | min | median | max | 停止理由 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| safe/deny test全体 | - | - | - | - | - | - | - |
| quote/LF/CRLF test全体 | - | - | - | - | - | - | - |

### suite比較

修正判断前に実行する。

```powershell
pnpm run test:contracts
pnpm run verify
```

- `test:contracts`: 各baselineで最大3回。
- `verify`: 各baselineで最大2回。
- 対象2件の所要時間とPASS／FAILを可能な範囲で記録する。
- `verify`全体の総時間だけを原因とは扱わない。

### diagnostic計測

focusedで再現した場合、またはsuite実行時だけ呼び出し単位の差を確認する必要がある場合に、一時diagnosticをtest helperへ追加する。

| 対象 | 実行したrunの生値 | min | median | max |
| --- | --- | ---: | ---: | ---: |
| safe root | - | - | - | - |
| safe nested | - | - | - | - |
| deny nested | - | - | - | - |
| compact stdin | - | - | - | - |
| LF stdin | - | - | - | - |
| CRLF stdin | - | - | - | - |

3回合計とVitestのテスト全体時間も記録する。focusedとsuiteで同じdiagnosticを使った場合でも、結果は別データとして保存する。

### baseline差分の再確認

`13cc542...`と`12fff8e...`で、一方だけtimeoutを繰り返す、または5秒境界の判断を変える差が出た場合だけ、実行順を反転して再確認する。

- 最初: `13cc542... -> 12fff8e...`
- 再確認: `12fff8e... -> 13cc542...`
- 順序を反転しても差が残らなければ、dependency／lockfile差分を原因と断定しない。

### PR #139 headの追加比較

historical baselineでfailureを再現せず、PR #139との因果が未解決の場合だけ実施する。

- PR #139 current head自身のlockfileで依存を構築する。
- focusedを先に確認する。
- focusedだけで因果を閉じられない場合に`test:contracts`を確認する。
- historical failureが`pnpm run verify`でのみ発生した可能性が残る場合に限り`verify`まで確認する。
- current headでPASSしても、Issue作成時の未commit working treeで発生したhistorical failure自体は否定しない。

### 最終回帰確認

修正方法ごとに次を満たす。

- launcher修正: 対象2件を既定5秒条件で安定してPASSできることを確認する。
- test分割: safe root / safe nested / deny nested / compact / LF / CRLFの全caseで既存assertionを維持し、各caseの既定5秒境界で安定する。
- test固有timeout変更: 変更後の通常コマンドで安定し、timeout値を変更前の生値／max／ばらつきから説明できる。
- 変更なし: sourceを推測変更しておらず、非再現または未特定の根拠がRun Artifactに残っている。
- すべてのケースで、一時diagnosticは最終差分に残さない。
- Hook／configを変更した場合は`scripts/verify.ps1`がPASSする。
- source／testの最終状態で`pnpm run test:contracts`、`pnpm run verify`がPASSする。
- Run Artifact確定後、sanitizer `-Write`／`-Check`、`pnpm run lint:markdown`、`git diff --check`がPASSする。
- Issue #140と因果のないfailureにより`verify`がPASSしない場合は完了扱いにせず、blockerとして記録する。

### Run Artifact確認

```powershell
./scripts/sanitize-codex-artifacts.ps1 -Path ".codex/runs/<run_id>" -Write
./scripts/sanitize-codex-artifacts.ps1 -Path ".codex/runs/<run_id>" -Check
```

- `TASKS.md`: 実行済み／未完了タスクを更新する。
- `REPORT.md`: checkpointごとにappend-onlyで意味情報を追記する。
- actual `run.json`: machine-managed経路に任せる。
- sanitizer後にRun Artifactを変更した場合は、`-Check`、`pnpm run lint:markdown`、`git diff --check`を再実行する。

### CI確認

- PR #139等の既存`Vitest (contracts)`ログのOSを確認する。
- Ubuntuでは対象2件がWindows launcherを実行しないため、CIのtest file時間をWindows launcher性能の比較値として使わない。
- Windows runner上の既存jobに`test:contracts`がないことを確認する。
- Windowsでの継続検証が必要と判断した場合でも、Issue #140と同じPRへCI変更を入れるかは原因調査後に別判断する。

## 7. 判断基準

### 要因の扱い

- 対象2テストを別々に評価する。
- 3回累積、launcher 1回の異常、suite条件は排他的とは扱わない。
- 複数要因が成立する場合は、それぞれの証跡と寄与範囲を記録する。
- 2件に共通原因が確認できる場合は、症状ごとの個別回避より共通原因の最小修正を優先する。

### production launcherを変更しない条件

- 1回の`runWindowsLauncher()`に異常な待機を確認できない。
- process残存やI/O待機の異常を示す証跡がない。
- 3回累積、suite条件、または非再現で説明可能である。

### test分割を採用できる条件

次のすべてを満たす場合だけ検討する。

- safe root / safe nested / deny nested、またはcompact / LF / CRLFを独立したcontractとして扱える。
- 各caseへ個別の5秒timeout境界を適用する意味を説明できる。
- 既存assertionと保証範囲を維持できる。
- 分割しても外部processの総実行時間は減らないことを認識している。
- 単に5秒timeoutを回避するためだけの分割ではない。

### test固有timeoutを変更できる条件

次のすべてを満たす場合だけ検討する。

- launcher内部に不要な待機を確認できない。
- 3回直列起動を1つのcontractとして維持する合理性がある。
- 一時diagnosticなしの標準計測で5秒超が通常のばらつきとして確認できる。
- 変更対象を該当testへ限定できる。
- timeout値を変更前の生値、max、ばらつきから説明できる。
- 同じtest fileの既存`30000ms`は参考情報として比較済みだが、値を流用していない。

Issue調査時に一時確認した30秒と既存testの30秒は、どちらも今回のtimeout値を自動的に30秒とする根拠にはしない。

### launcherを変更する条件

次のいずれかを実測で確認した場合に限る。

- 1回のPowerShell起動またはlauncher処理に不要な待機がある。
- `git rev-parse`やNode解決の重複処理が実測上の遅延原因である。
- stdin EOF、stdout/stderr drain、`WaitForExit`、cleanupで異常待機がある。
- Node Hook完了後もchild processが残り、テスト終了を遅らせている。

性能改善だけを理由に安全性、fail-closed、exit code、stdout/stderr contractを弱めない。

### suite条件の問題として扱う条件

- focusedでは安定するが、test file単体またはfull `test:contracts`／`verify`で再現性を持って悪化する。
- file単体、full contracts、実行順、process残存、同一diagnosticのfocused／suite差を必要な範囲で確認する。
- 相関を確認できない場合は「suite負荷が原因」と断定せず、suite条件でのみ再現する未特定事象として扱う。
- 「cold cache」「Windowsが遅い」等を証跡なしで原因として採用しない。

### PR #139 headを追加計測する条件

- historical baselineで今回のfailureを再現しない。
- PR #139 base／headの静的差分だけではhistorical failureとの因果を閉じられない。

この場合だけcurrent headを同じWindows環境・同じtoolchainで比較する。historical baselineで同じfailureが再現した場合は、PR #139固有変更が必要条件ではないためhead追加計測を必須にしない。

### 変更なしで終了できる条件

次のいずれかに該当し、変更の根拠を作れない場合はsource変更を行わない。

- historical failureは確認できるが、historical baselineを含む今回のfocused／suite比較で再現しない。
- focused／suite比較でも安定した差を再現できない。
- launcher内部の異常待機を示す証跡がない。
- PR #139との直接因果を示すsource／設定／実測差分がない。

実行回数が停止条件により上限未満でも、そのこと自体を変更根拠不足の隠蔽に使わず、実行回数と停止理由を明記する。

### 最終品質ゲートで無関係なfailureが出た場合

- 最初の異常を確認し、Issue #140の差分または検証経路との因果を判定する。
- Issue #140に起因する場合、またはIssue #140を正しく検証するために必要な範囲なら最小修正する。
- Issue #140と因果のないfailureと確認できた場合、このIssueではそのsourceを修正しない。
- `pnpm run verify`がPASSしていないためIssue #140を完了扱いにせず、blocker、未実行／未達検証、次の対応をRun Artifactと最終報告へ記録する。

## 8. リスクと未解決論点

- historical failureを発生させた未commit working treeを完全に復元できない可能性がある。現在のPR #139 headでPASSしてもhistorical failureを否定しない。
- 2件のtestが同じ要因で失敗したとは限らず、複数要因が同時に成立する可能性がある。
- `13cc542...`から`12fff8e...`の間にはdependency／lockfile変更があるため、各SHA自身のlockfileから依存を構築する。
- baseline比較には実行順の影響が混ざる可能性があるため、5秒境界の判断に影響する差が出た場合だけ順序反転で再確認する。
- Windowsのprocess起動時間にはばらつきがあるため、個別runの順序と生値を捨てない。
- 固定回数を消化することを目的にせず、Repositoryの再試行停止条件に従う。
- 一時diagnostic自体がtimingへ影響する可能性があるため、標準計測と分離する。
- PowerShell launcher内部には15秒のchild process timeoutがあり、外側のVitest timeoutだけを延ばすと異常待機を隠す可能性がある。
- 同じtest fileには`30000ms` timeoutを持つ別のWindows launcher testがあるが、経路・保証内容が異なるため既存値をそのまま今回へ適用しない。
- test分割は総process実行時間を減らさず、timeout境界を分離する変更である。
- suite限定の悪化は、明確な相関を確認できなければ原因未特定のまま残る可能性がある。
- 既存GitHub Actionsの`Vitest (contracts)`はUbuntuのため、今回のWindows launcher性能比較には利用できない。
- `cmd.exe`は実運用経路には含まれるが、今回失敗した2件の直接経路には含まれない。初期調査へ混ぜない。
- Run Artifactのsanitizer `-Write`はtracked fileを変更し得るため、sanitizer後の最終Markdown lint／`git diff --check`を省略しない。
- Run Artifactへローカルpath等を記録する場合はsanitizer前提で扱う。

## 9. 成果物

- 原因調査結果を反映した最小限の実装・test変更。変更根拠がない場合はsource変更なし。
- historical baseline、Issue branch作成時main baseline、必要な場合のPR #139 head、latest mainの関係を整理した調査結果。
- focused testの実行した全runの生値、PASS/FAIL、min、median、max、停止理由。
- `test:contracts`／`verify`のsuite比較結果と実行回数、停止理由。
- focusedで再現した対象のlauncher呼び出し単位のdiagnostic計測結果。
- suite／`verify`でのみ悪化した対象のfile単体／full contracts／実行順／process残存の切り分け結果。
- 対象2テストごとの要因判定。複数要因が成立する場合はそれぞれ記録する。
- baseline間に5秒境界へ影響する差があった場合の実行順反転結果。
- PR #106で追加された既存`30000ms` timeout testの保証内容、導入履歴、今回への適用可否を整理した結果。
- Node、pnpm、実際に起動した`powershell.exe`のpath／version、launcherから解決されるNode pathを含む再現条件。
- 既存GitHub ActionsではWindows launcher比較値を取得できるか確認した結果。
- Hook／configを変更した場合の`scripts/verify.ps1`結果。
- 修正方法に応じた最終回帰確認結果。
- 最終品質ゲートにblockerがある場合、その因果判定と未達検証。
- active Runの`REPORT.md`へappend-onlyで残した原因判定、採用対策、採用しなかった主要案、未確認点、検証結果。
- Run Artifact sanitizer Write／Checkと、sanitizer後の`pnpm run lint:markdown`／`git diff --check`結果。

## 10. 備考

- 原因を事前に決めない。
- 「Windowsだから遅い」「cold cacheだから」「5秒が短い」という説明だけでは修正根拠にしない。
- 対象2テストを同じ原因へ無理にまとめない。
- 複数要因が同時に成立する可能性を残す。
- historical failureと現在の再現結果を混同しない。
- historical baselineはlatest mainが進んでも置き換えない。
- 標準計測と一時diagnostic計測を混ぜない。
- 計測回数の上限と、Repositoryの再試行停止条件を混同しない。
- 実装判断の正本は「実行手順」と「判断基準」とする。
- 原因を完全に特定できない場合や今回非再現の場合でも、確認できた範囲と未確認点を明示して終了できる。