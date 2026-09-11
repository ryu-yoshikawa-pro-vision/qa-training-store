# Issue #140 Windows launcher contract test timeout 調査・修正計画

## 0. 依頼概要

- 依頼内容: Issue #140「test: Windows launcherのcontract testが5秒timeoutになる原因を調査する」に対応するため、原因調査から修正・検証までの実装Planを作成する。
- 背景: Windowsローカル環境の`pnpm run verify`で、`test:contracts`内のWindows launcher関連テスト2件がVitest既定の5秒timeoutを超えて失敗した記録がある。
- PR #139の差分は文書・Run Artifact・運用文書であり、現在のPR headではローカル`pnpm run verify`がPASSした記録もある。そのため、Issue作成時の失敗を現在のPR headで常時再現する前提には置かない。
- 期待成果: historical failureと現在の状態を混同せず、PR #139との因果、1回のlauncher起動時間、1テスト内の3回直列起動の累積、suite全体実行時だけの悪化の有無を切り分け、根拠に応じた最小修正を選ぶ。

## 1. ゴール / 完了条件

### ゴール

Windows launcherを経由する2件のcontract testが5秒を超えた理由について、再現結果、実測値、コード経路から説明できる範囲を確定する。

最初の調査では次の4ケースを判定する。

1. 1回のlauncher起動は安定しているが、1テスト内の3回直列起動の合計で5秒付近または5秒超になる。
2. launcher 1回の起動自体に異常な待機または大きなばらつきがある。
3. focused testでは安定するが、`test:contracts`または`pnpm run verify`でのみ悪化する。
4. historical failureは確認できるが、今回の同一Windows環境では標準条件で再現しない。

1の場合はproduction launcherを不要に変更しない。2の場合だけlauncher内部のprocess、I/O、終了待機を詳細調査する。3の場合はsuite負荷・process起動競合・実行順等を切り分ける。4の場合は推測でsourceを変更せず、非再現の証跡と未確認点を残す。

timeout延長を先に決めず、原因または確認できた事実に対応する最小変更を選ぶ。

### 完了条件

- Issue #140に記録された5569ms／5071msをhistorical failure evidenceとして扱い、現在の再現結果と区別している。
- PR #139の因果確認用historical baselineとしてPR base `13cc542fa31f372bd4bc932cf7a82b92bcf81a23`を使用し、PR #139 head `a7632fad478ac5d28f53849ce950b1d205024f36`との関係を整理している。
- Issue #140対応branchの作成元`12fff8eafccef4ab939efec623ac8a8d4f1ac539`は、historical baselineとは分けて実装開始時main baselineとして記録している。
- 対象2件について、source未変更・標準5秒条件で各10回実行し、PASS/FAIL、min、median、maxを記録している。
- 対象2件がそれぞれ`runWindowsLauncher()`を3回直列実行していることを前提に、diagnostic計測では1回ごとの時間と3回合計、Vitestのテスト全体時間を比較している。
- launcher 1回の処理時間に異常がある場合だけ、PowerShell起動後のrepository root解決、Node解決・起動、stdin転送・close、stdout/stderr回収、`WaitForExit`、終了処理のどこで時間を消費しているか確認している。
- focused testでは再現せずsuiteでのみ悪化する場合は、その差が再現する条件を記録し、Product/Hookを推測で変更していない。
- 今回再現しない場合は、非再現を成功した原因特定と扱わず、historical evidence、今回の10回結果、静的差分確認、未確認点を記録している。
- 原因を特定できた場合は、その原因に直接対応する最小修正を選んでいる。特定できない場合は、変更不要も含めて確認済み事項と未確認点を明示している。
- 修正する場合、対象2件を標準条件で各10回実行して安定してPASSすることを確認している。
- `pnpm run test:contracts`、`pnpm run verify`、`git diff --check`が標準条件でPASSする。
- timeout変更のみを採用する場合は、実測値・ばらつき・変更値の根拠を記録し、対象範囲を必要最小限にしている。
- safe/deny、quote/backslash、LF/CRLF、cwd、exit code、stdout/stderrの既存contractを変更していない。
- Run Artifact運用がRepository規約に従い、実測値、原因判定、採用対策、採用しなかった主要案、未確認点をactive Runの`REPORT.md`へ追記している。
- Repositoryへ追加するRun Artifactに対してsanitizerのWrite／Checkを実施している。

## 2. 現状理解と前提

### 確認済み

- Issue #140には、Windowsローカルの`pnpm run verify`で次の2件が5秒timeoutを超えた記録がある。
  - `Windows launcher safe/deny semantics`: 5569ms
  - `quote/backslash/LF/CRLF stdin semantics`: 5071ms
- 同じ2件はtimeoutを30秒にした対象確認では2/2 PASSしている。ただし、この結果だけを根拠にWindows環境依存やtimeout不足と断定しない。
- Issue #140作成時点では、PR #139のworking treeで`pnpm run verify`がFAILしcommit／pushを停止していた。一方、現在のPR #139 head `a7632fad478ac5d28f53849ce950b1d205024f36`のPR本文にはローカル`pnpm run verify` PASSが記録されている。失敗したworking treeを現在のPR headそのものとして扱わない。
- PR #139のbaseは`13cc542fa31f372bd4bc932cf7a82b92bcf81a23`である。
- PR #139 base／headでは、少なくとも`tests/contracts/codex-hook-contract.test.ts`、`.codex/hooks/pre_tool_use_policy_windows.ps1`、`.codex/hooks/pre_tool_use_policy.mjs`、`package.json`の内容は同一であり、launcher timeoutの直接経路にPR #139固有のsource変更は確認されていない。
- `12fff8eafccef4ab939efec623ac8a8d4f1ac539`はPR #139 baseの後に取り込まれたPR #138のcommitで、`sharp`と`pnpm-lock.yaml`を変更している。Issue #140のhistorical baselineとしてPR #139 baseを置き換えない。
- 現在の正規contract testコマンドは`pnpm run test:contracts`であり、実体は`vitest run tests/contracts --no-file-parallelism --maxWorkers=1`である。
- Vitest設定はrepository rootの`vitest.config.ts`である。現行設定にrepository固有の`testTimeout`指定はない。
- 対象2件は`tests/contracts/codex-hook-contract.test.ts`に存在する。
- `preserves safe and deny semantics through the Windows launcher from root and nested cwd`は1つの`it`内で次の3回を直列実行する。
  - root cwd / safe
  - nested cwd / safe
  - nested cwd / deny
- `keeps quote, backslash, LF, and CRLF stdin semantics through the launcher`も1つの`it`内で次の3回を直列実行する。
  - compact JSON
  - LF stdin
  - CRLF stdin
- `runWindowsLauncher()`はNodeから`powershell.exe -NoProfile -ExecutionPolicy Bypass -File .codex/hooks/pre_tool_use_policy_windows.ps1`を直接`spawnSync()`する。この直接経路には`cmd.exe`を含まない。
- `.codex/hooks/pre_tool_use_policy_windows.ps1`はrepository rootを`git rev-parse`で解決し、`Get-Command node`でNodeを解決してchild processを起動する。stdinを転送してcloseし、stdout/stderrを非同期で読みながら最大15秒`WaitForExit`する。
- 実際のCodex `command_windows`は`cmd.exe -> powershell.exe -> pre_tool_use_policy_windows.ps1`の経路だが、今回timeoutした2件の直接経路とは異なる。
- 現行Web CIのVitest実行はUbuntuであり、Windows上の`test:contracts`を継続実行する既存CIは確認できない。通常CI PASSだけをWindows安定化の根拠にはしない。
- Repositoryでは実装時のRun Artifactを`.codex/runs/<run_id>/`へ保存し、`REPORT.md`はappend-only、actual `run.json`はmachine-managedとする。
- Repositoryへ追加するCodex Run Artifactは完了前に`scripts/sanitize-codex-artifacts.ps1`のWrite／Checkが必要である。

### 比較対象

- historical failureの因果確認用baseline: `13cc542fa31f372bd4bc932cf7a82b92bcf81a23`（PR #139 base）
- PR #139 current head: `a7632fad478ac5d28f53849ce950b1d205024f36`
- Issue #140 branch作成時のmain baseline: `12fff8eafccef4ab939efec623ac8a8d4f1ac539`
- 実装開始時のlatest main: 実装開始時に取得して追加記録する。latest mainが進んでも上記historical baselineは置き換えない。

### 前提

- 調査はWindows実環境を主な再現環境とする。
- 実装開始時にPR #139 headとlatest mainを再確認する。headが進んでいる場合は新SHAを追加記録するが、Issue作成時の比較対象を消さない。
- 再現時はNode、pnpm、実際に`runWindowsLauncher()`が起動する`powershell.exe`のpath／version、launcherから解決されるNode path、実行PCを記録し、baselineと修正後で同じ環境を使う。
- source未変更の標準5秒baseline計測と、一時diagnosticを入れた詳細計測を別データとして扱う。
- 5秒timeoutそのものが短すぎる可能性は残すが、先にtimeout値を変更しない。
- 最初の調査対象は`runWindowsLauncher()`1回の所要時間と3回合計時間である。1回の起動に異常が確認できない限り、production launcher内部へ変更を加えない。
- 計測のためのdiagnosticでは`HookResult`、stdout/stderr、exit code、payload contractを変更しない。一時diagnosticは最終差分から削除する。

### 対象外

- PR #139の契約変更内容の再設計。
- 原因未確認のまま5秒から30秒へtimeoutを延長すること。
- 対象テストのskipや除外。
- CI全体のtimeout緩和。
- 原因が確認されていない段階での`.github/workflows/**`変更。
- 無関係なProduct Code、Product Test、Hook、workflowの変更。
- launcherやprocess管理の全面的な抽象化・リファクタリング。
- Windows CI追加をIssue #140の必須成果とすること。
- test分割だけで実行時間を改善したと扱うこと。

## 3. 調査で確定する点

### 最初に確定する点

- historical baseline `13cc542...`で対象2件が標準5秒条件で再現するか。
- Issue branch作成時main baseline `12fff8e...`および実装開始時latest mainで挙動に差があるか。差がある場合はPR #138以降の変更を追加要因として分離する。
- 対象2件をsource未変更状態で各10回実行したPASS/FAIL、min、median、max。
- diagnostic計測時の各`runWindowsLauncher()`1回あたりの所要時間。
- 3回の所要時間合計とVitestが報告するテスト全体時間の差。
- 1回あたりの処理時間は安定しているか、特定の呼び出しだけ遅いか。
- safe root、safe nested、deny nestedで差があるか。
- compact、LF、CRLFで差があるか。
- 対象テスト単独、`pnpm run test:contracts`、`pnpm run verify`で時間が変わるか。
- 今回の10回で再現しない場合、historical failureと非再現結果を分けて説明できているか。

### 1回のlauncher起動自体が遅い場合だけ確定する点

- PowerShell process起動後、`git rev-parse --show-toplevel`に時間を使っているか。
- `Get-Command node`またはNode child process起動に時間を使っているか。
- stdinのcopy/closeに時間を使っているか。
- stdout/stderrのread完了待ちに時間を使っているか。
- `WaitForExit`またはprocess終了後のcleanupに時間を使っているか。
- Node Hook終了後にPowerShellまたはNode processが残存していないか。

PowerShell processそのものの起動時間はtest helper側で`spawnSync()`全体時間との差から扱う。PowerShell内部instrumentationだけで「process起動前」の時間を測定したことにしない。

### focused testでは安定しsuiteでのみ悪化する場合だけ確定する点

- `test:contracts`で同じ対象2件が遅くなる再現性があるか。
- `pnpm run verify`でのみ遅くなる場合、直前suite／processの残存や実行順との相関があるか。
- warm/cold等の説明を証跡なしで原因として採用していないか。

### 直接経路で説明できない場合だけ確認する点

- `.codex/config.toml`の`command_windows`で使用する`cmd.exe -> powershell.exe`経路でも同種の遅延があるか。
- cmd quotingやshell wrapperが追加遅延の原因になっていないか。

### 未回答の重要事項

- Issue作成時点の約5.1〜5.6秒が、3回の正常なprocess起動の累積なのか、1回の異常待機を含むのかは未確定。
- historical failureを発生させた未commit working treeを完全に復元できるかは未確認であり、現在のPR #139 headをその失敗状態として扱わない。
- GitHub-hosted Windows runnerでの同一テスト時間は未確認。
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
- `AGENTS.md`
- `PLANS.md`

### 原因次第で変更候補になるファイル

- 3回直列実行のテスト構造またはtest helper側が原因の場合: `tests/contracts/codex-hook-contract.test.ts`
- launcher内部の不要な待機・I/O・process終了処理が原因の場合: `.codex/hooks/pre_tool_use_policy_windows.ps1`
- Node Hook自体が原因の場合: `.codex/hooks/pre_tool_use_policy.mjs`
- 5秒がテスト内容に対して不適切と実測で確認できた場合: 原則として`tests/contracts/codex-hook-contract.test.ts`の対象テストに限定してtimeoutを設定する。repository全体の`vitest.config.ts`変更は、他のcontract testにも同じ根拠がある場合だけ検討する。
- `.github/workflows/ci.yml`は原因・必要性を確認せず変更しない。Windowsでの継続検証追加が必要と判断した場合も、Issue #140の修正と同じPRへ入れる必要があるかを先に判断する。
- active Runの`PLAN.md`、`TASKS.md`、`REPORT.md`はRepository規約に従って更新する。actual `run.json`を直接編集しない。

## 5. 変更方針

### 方針

次の順序を固定する。

1. historical baselineと実装開始時baselineを分けて固定する。
2. source未変更の標準5秒条件で対象2件の再現性を確認する。
3. 必要な場合だけtest helperへ一時diagnosticを入れ、各`runWindowsLauncher()`1回の時間と3回合計を測る。
4. 「3回累積」「1回の異常」「suite時だけ悪化」「今回非再現」のどれかへ分類する。
5. 1回の異常を確認した場合だけlauncher内部を詳細計測する。
6. 原因または確認できた事実に応じて最小修正、または変更なしを選ぶ。
7. 一時diagnosticを削除する。
8. 同じsource未変更条件で修正後を比較する。
9. full contract、`pnpm run verify`、Repository必須のRun Artifact検証で回帰確認する。

### 実行タスク

- [ ] 1. Repository規約に従い、同一会話のactive Runがあれば再利用する。なければRepository標準手順でRunを初期化する。actual `run.json`を直接作成・編集しない。
- [ ] 2. 実装開始時にhistorical baseline `13cc542fa31f372bd4bc932cf7a82b92bcf81a23`、PR #139 head、Issue branch作成時main baseline `12fff8eafccef4ab939efec623ac8a8d4f1ac539`、latest main SHAを記録する。
- [ ] 3. Node、pnpm、`powershell.exe`の解決path／version、`powershell.exe`内で`Get-Command node`が解決するNode path、実行PCを記録する。
- [ ] 4. PR #139 base／headについて、対象test、Windows launcher、Node Hook、Vitest設定、package／lockfile等のtimeout経路に差分がないか再確認する。現在のPR headがPASSしている事実も記録し、historical failureと区別する。
- [ ] 5. historical baseline `13cc542...`を別worktreeまたは同等のcleanな状態で用意し、対象2件をsource未変更・標準5秒条件のまま各10回実行する。
- [ ] 6. Issue branch作成時main baseline `12fff8e...`でも同じ10回計測を行う。historical baselineとの差がある場合はPR #138以降の変更を追加要因として切り分ける。
- [ ] 7. 実装開始時latest mainが`12fff8e...`から進んでおり、timeout経路または依存に関連変更がある場合だけ、latest mainでも同じfocused計測を追加する。
- [ ] 8. source未変更計測で再現した場合、`runWindowsLauncher()` test helperへ一時diagnosticを追加し、各呼び出しの開始・終了時刻を取得する。`HookResult`やlauncher stdout/stderrへ計測値を混ぜない。
- [ ] 9. safe root / safe nested / deny nested、およびcompact / LF / CRLFの各呼び出しについて、diagnosticありの10回分のmin、median、maxを記録し、3回合計とテスト全体時間を比較する。diagnosticありの値を標準5秒baselineの値と混同しない。
- [ ] 10. 次の基準で第一段階を分類する。
  - 各launcher起動が安定し、3回合計で5秒付近または5秒超を説明できる: test構造またはtest固有timeoutの妥当性を判断し、production launcher変更へ進まない。
  - 特定のlauncher起動だけ大きく遅い、または1回の時間に大きなばらつきがある: launcher内部の詳細計測へ進む。
  - focused testは安定するが`test:contracts`または`verify`でのみ悪化する: suite負荷・process起動競合・実行順等の切り分けへ進む。
  - historical failureはあるが今回の10回では再現しない: sourceを推測修正せず、非再現結果と未確認点を記録する。
- [ ] 11. launcher内部調査が必要と判定した場合だけ、PowerShell launcherへ一時的な計測を追加する。PowerShell起動後から、repo root解決、Node解決、Node起動、stdin copy/close、stdout/stderr read、`WaitForExit`、process終了までを区別する。
- [ ] 12. launcher内部調査が必要な場合だけ、process treeと終了状態を確認し、Node Hook完了後にPowerShellまたはNodeが残存していないか確認する。
- [ ] 13. focused testで説明できず、実運用shell wrapperとの比較が必要な場合だけ、`.codex/config.toml`のconfigured `cmd.exe -> powershell.exe`経路を追加確認する。
- [ ] 14. 原因に応じて修正対象を決める。
  - 3回の正常な起動コストが主要因で、safe root / safe nested / deny nested等を独立したcontractとして扱う方が自然であり、各ケースを個別の5秒境界で評価する意味を説明できる: test分割または`it.each`化を検討する。
  - test分割は外部processの総実行時間を減らさず、各caseへtimeout境界を分ける変更である。単に5秒failureを消す目的だけでは採用しない。
  - 3回直列起動を1つのcontractとして維持する合理性があり、正常な3回起動だけで5秒超が通常範囲: 対象テスト固有timeoutを検討する。値は標準計測とdiagnostic計測の実測max・ばらつきから決め、30秒を既定値として採用しない。
  - launcherの不要な待機が原因: `.codex/hooks/pre_tool_use_policy_windows.ps1`を最小修正する。
  - Node Hookが原因: `.codex/hooks/pre_tool_use_policy.mjs`の具体的な遅延原因を最小修正する。
  - suite負荷・環境要因が主因: 再現条件を固定し、原因が特定できないProduct/Hook変更を行わない。
  - 今回非再現または原因を一意に特定できない: 変更なしを許容し、確認済み証跡、否定できた仮説、残る未確認点を記録する。
- [ ] 15. 一時diagnosticをすべて削除し、通常のstdout/stderr、exit code、payload contractへ影響がないことを確認する。
- [ ] 16. 修正した場合は対象2件をsource未変更・標準5秒条件で各10回実行し、修正前と同じ形式でmin、median、max、PASS/FAILを記録する。変更なしの場合も最終状態の再現結果を記録する。
- [ ] 17. `pnpm run test:contracts`、`pnpm run verify`、`git diff --check`を実行する。
- [ ] 18. active Runの`TASKS.md`を更新し、`REPORT.md`へ調査結果、原因判定、修正内容、採用しなかった主要案、未確認点、検証結果をappend-onlyで追記する。
- [ ] 19. Repositoryへ追加するRun Artifactに対して`scripts/sanitize-codex-artifacts.ps1`の`-Write`、続けて`-Check`を実行し、未サニタイズのローカル絶対pathを残さない。

## 6. 検証方法

### 比較条件と実行環境

historical baselineと実装開始時baselineを別々に記録する。

```powershell
git rev-parse HEAD
node --version
pnpm --version
Get-Command powershell.exe | Select-Object -ExpandProperty Source
powershell.exe -NoProfile -Command '$PSVersionTable.PSVersion.ToString()'
powershell.exe -NoProfile -Command '(Get-Command node).Source'
```

`$PSVersionTable.PSVersion`を現在のshellだけで記録して終わらせず、`runWindowsLauncher()`が実際に起動する`powershell.exe`のversionを記録する。

### source未変更のbaseline／focused test

対象ファイルだけを実行する。

```powershell
pnpm exec vitest run tests/contracts/codex-hook-contract.test.ts --no-file-parallelism --maxWorkers=1
```

対象1件ずつ実行する。

```powershell
pnpm exec vitest run tests/contracts/codex-hook-contract.test.ts --no-file-parallelism --maxWorkers=1 -t "preserves safe and deny semantics through the Windows launcher from root and nested cwd"
```

```powershell
pnpm exec vitest run tests/contracts/codex-hook-contract.test.ts --no-file-parallelism --maxWorkers=1 -t "keeps quote, backslash, LF, and CRLF stdin semantics through the launcher"
```

対象2件は標準5秒条件のまま各10回実行する。この10回は一時diagnosticを入れる前、またはdiagnosticを完全に除去した状態で行う。

### diagnostic計測

source未変更計測で原因説明に必要な場合だけ、一時diagnosticをtest helperへ追加する。

最低限、次を区別する。

| 対象 | 回数 | min | median | max |
| --- | ---: | ---: | ---: | ---: |
| safe root | 10 | - | - | - |
| safe nested | 10 | - | - | - |
| deny nested | 10 | - | - | - |
| compact stdin | 10 | - | - | - |
| LF stdin | 10 | - | - | - |
| CRLF stdin | 10 | - | - | - |

3回の実測合計とVitestのテスト全体時間も記録する。diagnostic自体がtimingへ影響し得るため、この値を標準baselineのPASS/FAIL判定値として使わない。

### 標準5秒条件の修正前後比較

| 対象 | 状態 | 回数 | PASS | FAIL | min | median | max |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| safe/deny test全体 | 修正前 | 10 | - | - | - | - | - |
| quote/LF/CRLF test全体 | 修正前 | 10 | - | - | - | - | - |
| safe/deny test全体 | 修正後または最終状態 | 10 | - | - | - | - | - |
| quote/LF/CRLF test全体 | 修正後または最終状態 | 10 | - | - | - | - | - |

### suite比較

```powershell
pnpm run test:contracts
pnpm run verify
git diff --check
```

focused testとの差がある場合は、その差を記録する。`verify`全体が遅いこと自体を原因とは扱わない。

### Run Artifact確認

active Runへ今回の意味情報を残す。

- `TASKS.md`: 実行済み・未完了タスクをRepository規約に従って更新する。
- `REPORT.md`: checkpointごとにappend-onlyで調査結果、判断、検証、未確認点を追記する。
- actual `run.json`: machine-managed経路に任せ、直接編集しない。

Repositoryへ追加するRun Artifactに対して、対象Run Directoryを指定してsanitizerを実行する。

```powershell
./scripts/sanitize-codex-artifacts.ps1 -Path ".codex/runs/<run_id>" -Write
./scripts/sanitize-codex-artifacts.ps1 -Path ".codex/runs/<run_id>" -Check
```

### 回帰確認

- safe rootがallowのままである。
- safe nestedがallowのままである。
- deny nestedがdenyのままである。
- quote/backslashを含むcommandが既存結果を維持する。
- compact、LF、CRLF stdinが同じ結果を維持する。
- root cwdとnested cwdの双方で結果が変わらない。
- stdout/stderrとexit codeのcontractが変わらない。
- 一時diagnostic出力や一時計測用source変更が最終差分に残っていない。
- process残存を原因として修正した場合は、修正後に残存がないことを確認する。
- 修正対象外のcontract testに新しい失敗がない。
- test分割を採用した場合、既存assertionと保証範囲を失っておらず、総process実行時間の短縮と誤って説明していない。

### CI確認

- 現行Web CIのVitest実行はUbuntuなので、通常CI PASSだけをWindows安定化の根拠にしない。
- CI変更がない場合も、通常の必須CI結果は確認する。
- Windowsでの継続検証が必要と判断した場合は、Issue #140の修正PRに含めるか別Issueへ分けるかを、原因調査結果から判断する。

## 7. 判断基準

### production launcherを変更しない条件

次のすべてを満たす場合、launcherの性能修正は行わない。

- 1回の`runWindowsLauncher()`に異常な待機を確認できない。
- safe/denyやstdin形式による不自然な偏りがない。
- 3回の実測合計で5秒付近または5秒超を説明できる、または今回再現せずlauncher異常を示す証跡がない。
- process残存やI/O待機の異常を示す証跡がない。

### test分割を採用できる条件

次のすべてを満たす場合だけ検討する。

- safe root / safe nested / deny nested、またはcompact / LF / CRLFを独立したcontractとして扱える。
- 各caseへ個別の5秒timeout境界を適用することが、contractの意味として説明できる。
- 既存assertionと保証範囲を維持できる。
- 分割しても外部processの総実行時間は減らないことを認識している。
- 単に5秒timeoutを回避するためだけの分割ではない。

### test timeoutを変更できる条件

次のすべてを満たす場合だけ検討する。

- launcher内部に不要な待機を確認できない。
- 3回直列起動を1つのcontractとして維持する合理性がある。
- source未変更の標準計測で5秒超が通常のばらつきとして確認できる。
- 変更対象を該当テストへ限定できる。
- timeout値を実測maxとばらつきから説明できる。

30秒はIssue調査時の確認値であり、そのまま採用しない。

### launcherを変更する条件

次のいずれかを根拠付きで確認した場合に限る。

- 1回のPowerShell起動またはlauncher処理に不要な待機がある。
- `git rev-parse`やNode解決に不要な重複処理があり、それが実測上の遅延原因である。
- stdin EOF、stdout/stderr drain、`WaitForExit`、cleanupのいずれかで異常待機がある。
- Node Hook完了後もchild processが残り、テスト終了を遅らせている。

性能改善だけを理由に安全性、fail-closed、exit code、stdout/stderr contractを弱めない。

### 変更なしで終了できる条件

次のいずれかに該当し、変更の根拠を作れない場合はsource変更を行わない。

- historical failureは確認できるが、historical baselineを含む今回の10回計測で再現しない。
- focused／suite比較でも安定した差を再現できない。
- launcher内部の異常待機を示す証跡がない。
- PR #139との直接因果を示すsource／設定差分がない。

この場合もIssue #140の完了条件に従い、再現条件、実施した比較、否定できた仮説、残る未確認点をRun Artifactへ記録する。

## 8. リスクと未解決論点

- historical failureを発生させた未commit working treeを完全に復元できない可能性がある。現在のPR #139 headでPASSしてもhistorical failureを否定しない。
- `13cc542...`から`12fff8e...`の間にはPR #138によるdependency／lockfile変更があるため、両者を同一baselineとして扱わない。
- Windowsのprocess起動時間にはばらつきがあるため、1〜2回の結果で通常値と異常値を判断しない。
- 一時diagnosticそのものがtimingへ影響する可能性がある。標準5秒baselineとdiagnostic値を分ける。
- PowerShell launcher内部には15秒のchild process timeoutがある。外側のVitest timeoutだけを延ばすと内部の異常待機を隠す可能性がある。
- Vitestの5秒timeoutはテスト全体へ適用されるため、3回の同期process起動を1つの`it`へまとめた構造自体が主要因の可能性がある。
- test分割は総process実行時間を減らさず、timeout境界を分離する変更である。性能修正として扱わない。
- GitHub Actionsの通常VitestはWindows実行ではないため、CIの成功時間をローカルWindowsの基準値として使わない。
- `cmd.exe`は実運用の`command_windows`には含まれるが、今回失敗した2件の`runWindowsLauncher()`直接経路には含まれない。初期調査へ混ぜない。
- Run Artifactへ実行PCのローカルpath等を記録する場合、sanitizer前提で扱い、生の絶対pathを完了成果物へ残さない。

## 9. 成果物

- 原因調査結果を反映した最小限の実装・テスト変更。変更根拠がない場合はsource変更なし。
- historical baseline `13cc542...`、Issue branch作成時main baseline `12fff8e...`、実装開始時latest main、PR #139 headの関係を整理した調査結果。
- source未変更・標準5秒条件での対象2件各10回の結果。
- 必要な場合のみ、6種類のlauncher呼び出し単位のdiagnostic計測結果。
- Node、pnpm、実際に起動した`powershell.exe`のpath／version、launcherから解決されるNode pathを含む再現条件。
- 原因判定または非再現判定と、その判定を支える実測・コード経路。
- timeoutを変更する場合は、その値を決めた実測結果と判断根拠。
- test分割を採用する場合は、独立したcontractとして分割できる根拠と、総実行時間短縮ではなくtimeout境界分離であることの説明。
- active Runの`REPORT.md`に、確認済み事項、原因、採用対策、採用しなかった主要案、未確認点、検証結果をappend-onlyで記録する。
- Run Artifact sanitizer Write／Checkの結果。

## 10. 備考

- このPlanでは原因を事前に決めない。
- 「Windowsだから遅い」「cold cacheだから」「5秒が短い」という説明だけでは修正根拠にしない。
- historical failureと現在の再現結果を混同しない。
- historical baselineは最新mainが進んでも置き換えない。
- 標準5秒baselineと一時diagnostic計測を混ぜない。
- 実装判断の正本は「実行タスク」と「判断基準」とし、同じ判断を別セクションで独自に再定義しない。
- Issue #140の完了条件に従い、原因を完全に特定できない場合や今回非再現の場合でも、確認できた範囲と未確認点を明示して次の判断へ繋げる。
