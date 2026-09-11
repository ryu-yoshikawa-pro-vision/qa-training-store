# Issue #140 Windows launcher contract test timeout 調査・修正計画

## 0. 依頼概要

- 依頼内容: Issue #140「test: Windows launcherのcontract testが5秒timeoutになる原因を調査する」に対応するため、原因調査から修正・検証までの実装Planを作成する。
- 背景: Windowsローカル環境の`pnpm run verify`で、`test:contracts`内のWindows launcher関連テスト2件がVitest既定の5秒timeoutを超えて失敗することがある。
- PR #139の差分は文書・Run Artifact・運用文書のみで、Product Code、Product Test、Hook、CI workflowは変更していない。Issue作成時点では直接因果は確認されていない。
- 期待成果: PR #139との因果を切り分け、まず1回のlauncher起動時間と1テスト内の3回直列起動の累積時間を比較する。必要な場合だけlauncher内部を詳細計測し、原因に応じた最小修正を選ぶ。

## 1. ゴール / 完了条件

### ゴール

Windows launcherを経由する2件のcontract testが5秒を超える理由を、再現結果と実測値から説明できる状態にする。

最初に次のどちらかを判定する。

1. 1回のlauncher起動は正常範囲だが、1テスト内で3回直列実行する合計時間が5秒を超えている。
2. launcher 1回の起動自体に異常な待機または大きなばらつきがある。

1で説明できる場合はproduction launcherを不要に変更しない。2の場合だけlauncher内部のprocess、I/O、終了待機を詳細に調査する。

timeout延長を先に決めず、原因に対応する最小変更を選ぶ。

### 完了条件

- 対象2件について、標準5秒条件で各10回実行し、PASS/FAIL、min、median、maxを記録している。
- 対象2件がそれぞれ`runWindowsLauncher()`を3回直列実行していることを前提に、1回ごとの実行時間とテスト全体時間を比較している。
- baseline SHA `12fff8eafccef4ab939efec623ac8a8d4f1ac539` とPR #139 head `a7632fad478ac5d28f53849ce950b1d205024f36`の比較条件を記録し、PR #139との差分との因果を整理している。
- launcher 1回の処理時間に異常がある場合は、PowerShell起動、repository root解決、Node解決・起動、stdin転送・close、stdout/stderr回収、`WaitForExit`、終了処理のどこで時間を消費しているか確認している。
- 原因を特定できた場合は、その原因に直接対応する最小修正を選んでいる。特定できない場合は、確認済み事項と未確認点を明示している。
- 修正する場合、対象2件を標準条件で各10回実行して安定してPASSすることを確認している。
- `pnpm run test:contracts`と`pnpm run verify`が標準条件でPASSする。
- timeout変更のみを採用する場合は、実測値・ばらつき・変更値の根拠を記録し、対象範囲を必要最小限にしている。
- safe/deny、quote/backslash、LF/CRLF、cwd、exit code、stdout/stderrの既存contractを変更していない。
- 実測値、原因判定、採用した対策、採用しなかった主要案、未確認点をRun Artifactの`REPORT.md`へ残している。

## 2. 現状理解と前提

### 確認済み

- Issue #140では、Windowsローカルの`pnpm run verify`で次の2件が5秒timeoutを超えたと記録されている。
  - `Windows launcher safe/deny semantics`: 5569ms
  - `quote/backslash/LF/CRLF stdin semantics`: 5071ms
- 同じ2件はtimeoutを30秒にした対象確認では2/2 PASSしている。ただし、この結果だけを根拠にWindows環境依存やtimeout不足と断定しない。
- 現在の正規contract testコマンドは`pnpm run test:contracts`であり、実体は`vitest run tests/contracts --no-file-parallelism --maxWorkers=1`である。
- Vitest設定はrepository rootの`vitest.config.ts`である。`config/vitest.contracts.config.ts`は存在せず、現行設定にrepository固有の`testTimeout`指定はない。
- 対象2件は`tests/contracts/codex-hook-contract.test.ts`に存在する。
- `preserves safe and deny semantics through the Windows launcher from root and nested cwd`は、1つの`it`内で次の3回を直列実行する。
  - root cwd / safe
  - nested cwd / safe
  - nested cwd / deny
- `keeps quote, backslash, LF, and CRLF stdin semantics through the launcher`も、1つの`it`内で次の3回を直列実行する。
  - compact JSON
  - LF stdin
  - CRLF stdin
- `runWindowsLauncher()`はNodeから`powershell.exe -NoProfile -ExecutionPolicy Bypass -File .codex/hooks/pre_tool_use_policy_windows.ps1`を直接`spawnSync()`する。この直接経路には`cmd.exe`を含まない。
- `.codex/hooks/pre_tool_use_policy_windows.ps1`はrepository rootを`git rev-parse`で解決し、Node child processを起動し、stdinを転送してcloseし、stdout/stderrを非同期で読みながら最大15秒`WaitForExit`する。
- 実際のCodex `command_windows`は`cmd.exe -> powershell.exe -> pre_tool_use_policy_windows.ps1`の経路だが、今回timeoutした2件の直接経路とは異なる。
- 現行Web CIのVitest実行はUbuntuであり、Windows上の`test:contracts`を継続実行する既存CIは確認できない。通常CI PASSだけをWindows安定化の根拠にはしない。
- 作業ブランチ`issue-140-windows-launcher-timeout`は`main`の`12fff8eafccef4ab939efec623ac8a8d4f1ac539`から作成している。
- PR #139の現在のheadは`a7632fad478ac5d28f53849ce950b1d205024f36`である。

### 前提

- 調査はWindows実環境を主な再現環境とする。
- 実装開始時に`main`とPR #139のheadが更新されていないか確認し、更新されている場合は比較対象SHAを記録し直す。
- 再現時はNode、pnpm、PowerShellのversionと実行PCを記録し、baselineと修正後で同じ環境を使う。
- 5秒timeoutそのものが短すぎる可能性は残すが、先にtimeout値を変更しない。
- 最初の調査対象は`runWindowsLauncher()`1回の所要時間と3回合計時間である。1回の起動に異常が確認できない限り、production launcher内部へ変更を加えない。
- 計測のためのdiagnosticを追加する場合も、stdout/stderr、exit code、payload contractを変えない。一時diagnosticは最終差分から削除することを基本とする。

### 対象外

- PR #139の契約変更内容の再設計。
- 原因未確認のまま5秒から30秒へtimeoutを延長すること。
- 対象テストのskipや除外。
- CI全体のtimeout緩和。
- 原因が確認されていない段階での`.github/workflows/**`変更。
- 無関係なProduct Code、Product Test、Hook、workflowの変更。
- launcherやprocess管理の全面的な抽象化・リファクタリング。
- Windows CI追加をIssue #140の必須成果とすること。

## 3. 調査で確定する点

### 最初に確定する点

- 対象2件の各`runWindowsLauncher()`1回あたりの所要時間。
- 3回の所要時間合計とVitestが報告するテスト全体時間の差。
- 1回あたりの処理時間は安定しているか、特定の呼び出しだけ遅いか。
- safe root、safe nested、deny nestedで差があるか。
- compact、LF、CRLFで差があるか。
- 対象テスト単独、`pnpm run test:contracts`、`pnpm run verify`で時間が変わるか。
- baseline SHAでも標準5秒条件で再現するか。

### 1回のlauncher起動自体が遅い場合だけ確定する点

- PowerShell process起動に時間を使っているか。
- `git rev-parse --show-toplevel`に時間を使っているか。
- `Get-Command node`またはNode child process起動に時間を使っているか。
- stdinのcopy/closeに時間を使っているか。
- stdout/stderrのread完了待ちに時間を使っているか。
- `WaitForExit`またはprocess終了後のcleanupに時間を使っているか。
- Node Hook終了後にPowerShellまたはNode processが残存していないか。

### 直接経路で説明できない場合だけ確認する点

- `.codex/config.toml`の`command_windows`で使用する`cmd.exe -> powershell.exe`経路でも同種の遅延があるか。
- cmd quotingやshell wrapperが追加遅延の原因になっていないか。

### 未回答の重要事項

- Issue作成時点の約5.1〜5.6秒が、3回の正常なprocess起動の累積なのか、1回の異常待機を含むのかは未確定。
- GitHub-hosted Windows runnerでの同一テスト時間は未確認。
- timeout変更、テスト分割、launcher修正のどれが必要かは計測完了まで決めない。

## 4. 影響範囲

### 最初に確認するファイル

- `tests/contracts/codex-hook-contract.test.ts`
- `.codex/hooks/pre_tool_use_policy_windows.ps1`
- `.codex/hooks/pre_tool_use_policy.mjs`
- `vitest.config.ts`
- `package.json`
- `.codex/config.toml`
- `.github/workflows/ci.yml`

### 原因次第で変更候補になるファイル

- 3回直列実行のテスト構造またはtest helper側が原因の場合: `tests/contracts/codex-hook-contract.test.ts`
- launcher内部の不要な待機・I/O・process終了処理が原因の場合: `.codex/hooks/pre_tool_use_policy_windows.ps1`
- Node Hook自体が原因の場合: `.codex/hooks/pre_tool_use_policy.mjs`
- 5秒がテスト内容に対して不適切と実測で確認できた場合: 原則として`tests/contracts/codex-hook-contract.test.ts`の対象テストに限定してtimeoutを設定する。repository全体の`vitest.config.ts`変更は、他のcontract testにも同じ根拠がある場合だけ検討する。
- `.github/workflows/ci.yml`は原因・必要性を確認せず変更しない。Windowsでの継続検証追加が必要と判断した場合も、Issue #140の修正と同じPRへ入れる必要があるかを先に判断する。

## 5. 変更方針

### 方針

次の順序を固定する。

1. baseline条件を固定する。
2. 対象2件を標準5秒条件で再現する。
3. 各`runWindowsLauncher()`1回の時間と3回合計を計測する。
4. 3回の正常な起動コストだけで説明できるか判定する。
5. 説明できない場合だけlauncher内部を詳細計測する。
6. 原因に応じて最小修正を選ぶ。
7. 同じ測定条件で修正後を比較する。
8. full contractと`pnpm run verify`で回帰確認する。

### 実行タスク

- [ ] 1. 実装開始時の`main` SHA、PR #139 head SHA、Node、pnpm、PowerShell version、実行PCを記録する。
- [ ] 2. baselineとしてbranch point `12fff8eafccef4ab939efec623ac8a8d4f1ac539`を別worktreeまたは同等のcleanな状態で用意する。最新`main`に関連変更が入っている場合は、その差分を確認して比較対象を更新する。
- [ ] 3. baselineで対象2件をそれぞれ標準5秒条件のまま10回実行し、各runのPASS/FAILとテスト全体時間を記録する。
- [ ] 4. `runWindowsLauncher()`に一時的な計測を追加し、各呼び出しの開始・終了時刻を取得する。まずPowerShell内部にはinstrumentationを入れず、Node test helper側から1回ごとの所要時間を測る。
- [ ] 5. safe root / safe nested / deny nested、およびcompact / LF / CRLFの各呼び出しについて、10回分のmin、median、maxを記録する。
- [ ] 6. 3回の実測時間の合計とVitestのテスト全体時間を比較する。
- [ ] 7. 次の基準で第一段階の原因を判定する。
  - 各launcher起動が安定しており、3回合計が5秒付近または5秒超になる: テスト構造またはテスト固有timeoutの問題として扱い、production launcher変更へ進まない。
  - 特定のlauncher起動だけ大きく遅い、または1回の時間に大きなばらつきがある: launcher内部の詳細計測へ進む。
  - 単独実行では安定するが`test:contracts`または`verify`でのみ悪化する: suite負荷・process起動競合・環境要因の切り分けへ進む。
- [ ] 8. 第一段階でlauncher内部調査が必要と判定した場合だけ、PowerShell launcherへ一時的な計測を追加する。PowerShell起動後から、repo root解決、Node解決、Node起動、stdin copy/close、stdout/stderr read、`WaitForExit`、process終了までを区別する。
- [ ] 9. launcher内部調査が必要な場合だけ、process treeと終了状態を確認し、Node Hook完了後にPowerShellまたはNodeが残存していないか確認する。
- [ ] 10. 直接`powershell.exe`を起動する対象2件で説明できない場合だけ、`.codex/config.toml`のconfigured `cmd.exe -> powershell.exe`経路を追加確認する。
- [ ] 11. 原因に応じて修正対象を決める。
  - 3回直列実行というテスト構造が原因: contractを変えない範囲でテスト分割または`it.each`化を検討する。各テストが何を保証するかを維持し、単にtimeout回避のためにassertionを削らない。
  - テスト構造を維持する合理性があり、正常な3回起動だけで5秒を超える: 対象テスト固有timeoutを検討する。値は10回の実測maxとばらつきから決め、30秒を既定値として採用しない。
  - launcherの不要な待機が原因: `.codex/hooks/pre_tool_use_policy_windows.ps1`を最小修正する。
  - Node Hookが原因: `.codex/hooks/pre_tool_use_policy.mjs`の具体的な遅延原因を最小修正する。
  - suite負荷または環境要因が主因: 再現条件を固定し、Product/Hookを推測で変更しない。
  - 原因を一意に特定できない: 推測で修正せず、確認済み証跡、否定できた仮説、残る未確認点を記録する。
- [ ] 12. 一時diagnosticを削除し、通常のstdout/stderr、exit code、payload contractへ影響がないことを確認する。
- [ ] 13. 修正後、対象2件を標準条件で各10回実行し、修正前と同じ形式でmin、median、max、PASS/FAILを記録する。
- [ ] 14. `pnpm run test:contracts`と`pnpm run verify`を標準条件で実行する。
- [ ] 15. 調査結果、原因判定、修正内容、採用しなかった主要案、未確認点、検証結果をRun Artifactの`REPORT.md`へ記録する。

## 6. 検証方法

### baselineとfocused test

実装開始時に、比較対象SHAを記録する。

```powershell
git rev-parse HEAD
node --version
pnpm --version
$PSVersionTable.PSVersion
```

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

対象2件は標準5秒条件のまま各10回実行する。単発PASSでは安定化と判定しない。

### 計測結果

修正前後で、最低限次を同じ形式で記録する。

| 対象 | 回数 | PASS | FAIL | min | median | max |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| safe root | 10 | - | - | - | - | - |
| safe nested | 10 | - | - | - | - | - |
| deny nested | 10 | - | - | - | - | - |
| compact stdin | 10 | - | - | - | - | - |
| LF stdin | 10 | - | - | - | - | - |
| CRLF stdin | 10 | - | - | - | - | - |
| safe/deny test全体 | 10 | - | - | - | - | - |
| quote/LF/CRLF test全体 | 10 | - | - | - | - | - |

単発の最大値だけで原因を決めず、各1回の時間、3回合計、テスト全体時間の関係を見る。

### suite比較

```powershell
pnpm run test:contracts
pnpm run verify
```

focused testとの差がある場合は、その差を記録する。`verify`全体が遅いこと自体を原因とは扱わない。

### 回帰確認

- safe rootがallowのままである。
- safe nestedがallowのままである。
- deny nestedがdenyのままである。
- quote/backslashを含むcommandが既存結果を維持する。
- compact、LF、CRLF stdinが同じ結果を維持する。
- root cwdとnested cwdの双方で結果が変わらない。
- stdout/stderrとexit codeのcontractが変わらない。
- 一時diagnostic出力が最終差分に残っていない。
- process残存を原因として修正した場合は、修正後に残存がないことを確認する。
- 修正対象外のcontract testに新しい失敗がない。

### CI確認

- 現行Web CIのVitest実行はUbuntuなので、通常CI PASSだけをWindows安定化の根拠にしない。
- CI変更がない場合も、通常の必須CI結果は確認する。
- Windowsでの継続検証が必要と判断した場合は、Issue #140の修正PRに含めるか別Issueへ分けるかを、原因調査結果から判断する。

## 7. 判断基準

### production launcherを変更しない条件

次のすべてを満たす場合、launcherの性能修正は行わない。

- 1回の`runWindowsLauncher()`に異常な待機を確認できない。
- safe/denyやstdin形式による不自然な偏りがない。
- 3回の実測合計で5秒付近または5秒超を説明できる。
- process残存やI/O待機の異常を示す証跡がない。

この場合はテスト分割または対象テスト固有timeoutを比較し、contractを維持できる最小変更を選ぶ。

### test timeoutを変更できる条件

次のすべてを満たす場合だけ検討する。

- launcher内部に不要な待機を確認できない。
- 3回直列起動がcontract上必要、またはテスト分割より現行構造を維持する合理性がある。
- 10回の実測で5秒超が通常のばらつきとして確認できる。
- 変更対象を該当テストへ限定できる。
- timeout値を実測maxとばらつきから説明できる。

30秒はIssue調査時の確認値であり、そのまま採用しない。

### launcherを変更する条件

次のいずれかを根拠付きで確認した場合に限る。

- 1回のPowerShell起動に不要な待機がある。
- `git rev-parse`やNode解決に不要な重複処理がある。
- stdin EOF、stdout/stderr drain、`WaitForExit`、cleanupのいずれかで異常待機がある。
- Node Hook完了後もchild processが残り、テスト終了を遅らせている。

性能改善だけを理由に安全性、fail-closed、exit code、stdout/stderr contractを弱めない。

## 8. リスクと未解決論点

- Windowsのprocess起動時間にはばらつきがあるため、1〜2回の結果で通常値と異常値を判断しない。
- 一時diagnosticそのものがtimingへ影響する可能性がある。まずNode test helper側だけで測り、PowerShell内部instrumentationは必要な場合だけ追加する。
- PowerShell launcher内部には15秒のchild process timeoutがある。外側のVitest timeoutだけを延ばすと内部の異常待機を隠す可能性がある。
- Vitestの5秒timeoutはテスト全体へ適用されるため、3回の同期process起動を1つの`it`へまとめた構造自体が主要因の可能性がある。
- PR #139との因果はbaseline比較前に仮定しない。
- GitHub Actionsの通常VitestはWindows実行ではないため、CIの成功時間をローカルWindowsの基準値として使わない。
- `cmd.exe`は実運用の`command_windows`には含まれるが、今回失敗した2件の`runWindowsLauncher()`直接経路には含まれない。初期調査へ混ぜない。

## 9. 成果物

- 原因調査結果を反映した最小限の実装・テスト変更。変更不要と判断した場合は調査結果のみ。
- 修正前後の対象2件各10回と、6種類のlauncher呼び出し単位の計測結果。
- baseline SHA、PR #139 head SHA、Node、pnpm、PowerShell versionを含む再現条件。
- 原因判定と、その判定を支える実測・コード経路。
- timeoutを変更する場合は、その値を決めた実測結果と判断根拠。
- Run Artifactの`REPORT.md`に、確認済み事項、原因、採用対策、採用しなかった主要案、未確認点、検証結果を記録する。

## 10. 備考

- このPlanでは原因を事前に決めない。
- 「Windowsだから遅い」「5秒が短い」という説明だけでは修正根拠にしない。
- まず1回のlauncher起動時間と3回合計を測り、詳細調査を必要な場合だけ行う。
- Issue #140の完了条件に従い、原因を完全に特定できない場合でも、確認できた範囲と未確認点を明示して次の判断へ繋げる。
