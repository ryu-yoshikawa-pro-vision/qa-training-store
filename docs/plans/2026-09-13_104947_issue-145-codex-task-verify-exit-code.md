# Issue #145 `codex-task.ps1` verify exit code修正 Plan

## 0. 依頼概要

- 依頼内容: Issue #145を対応するための実装Planを作成し、専用branchへ保存する。今回は実装しない。
- 対象Issue: `https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/issues/145`
- 対象branch: `issue-145-codex-task-verify-exit-code`
- 背景: PR #133のStrict Run確認で、`scripts/codex-task.ps1`の`-VerifyCommand`が出力した複数行の標準出力と`$LASTEXITCODE`がPowerShell関数の戻り値としてまとめて返り、`report.verify_exit_code`が379要素の配列になった。その結果、verify自体は成功していても`verify_failed`として扱われ、`run.json.status`と`validation.status`も失敗になった。
- 期待成果: verifyコマンドの標準出力・標準エラーの可視性を維持しながら、`Invoke-VerifyCommand()`が呼び出し元へ単一の整数exit codeだけを返す。

## 1. ゴール / 完了条件

### ゴール

`scripts/codex-task.ps1`のverify実行経路で、外部コマンドの出力とexit codeを分離する。既存の`Invoke-NativeCommand()`を共通経路として再利用し、verifyの各実行形式へ同じ回避処理を重複させない。

### 完了条件（DoD）

- `Invoke-VerifyCommand()`がverify標準出力を戻り値へ混入させない。
- `report.verify_exit_code`が成功・失敗とも単一の数値になる。
- 実障害と同じcommand text経路で、複数行を標準出力する成功verifyが次を満たす。
  - wrapper process exit codeが`0`
  - `verify_exit_code === 0`
  - `report.status === "ok"`
  - `run.json.status === "completed"`
  - `validation.status === "passed"`
- 実障害と同じcommand text経路で、複数行を標準出力する失敗verifyが次を満たす。
  - wrapper process exit codeが指定した非0整数
  - `verify_exit_code`に同じ非0整数が保持される
  - `report.status === "verify_failed"`
  - `run.json.status === "failed"`
  - `validation.status === "failed"`
- verifyの標準出力・標準エラーが呼び出し元から確認できる状態を維持する。
- `.ps1`、`.cmd`、`.bat`、`.sh`、拡張子で分岐しない実行ファイル、command text経路で同じexit code分離規則を使う。
- 引数なしで実行するdefault経路のため、`Invoke-NativeCommand()`の`CommandArgs`が空配列を明示的に受け付ける。
- command textの失敗fixtureはcommand text自身が`exit 7`し、EncodedCommand経由でも意図した非0exit codeを検証できる。
- manifestを検証する一時fixtureは、`collect-run-artifacts.ps1`、`collect-run-artifacts.py`、`sanitize-codex-artifacts.ps1`、`codex-artifact-sanitizer.ps1`を含み、Git repositoryとして初期化された実行可能な最小構成を持つ。
- manifest付きfull-wrapper testはWindowsで実行し、`powershell.exe`、Python、Gitが利用できる環境で成功・失敗の両方を確認する。
- Windows環境で`.ps1`、`.cmd`、`.bat`、command textのtargeted runtime testを実行し、対象ケースがskipではなくPASSする。
- 新しいwrapper、外部依存関係、Run Artifact schemaを追加しない。
- 回帰テストを既存の`codex-task` contract test体系へ追加する。
- `pnpm run test:contracts`がPASSする。
- `pnpm run verify`がPASSする。
- `git diff --check`がPASSする。
- actual `.codex/runs/<run_id>/run.json`を手編集しない。

## 2. 現状理解と前提

### 現状理解

- `scripts/codex-task.ps1`の`Invoke-VerifyCommand()`は、対象がファイルの場合に拡張子ごとに外部コマンドを直接実行し、その直後に`return $LASTEXITCODE`している。
- command textの場合も、`CODEX_VERIFY_COMMAND`へ文字列を格納し、`powershell.exe -NoProfile -EncodedCommand`を直接実行した後に`return $LASTEXITCODE`している。
- PowerShellでは関数内のsuccess outputも関数出力になるため、verifyコマンドが標準出力を生成すると、その出力と`$LASTEXITCODE`が`Invoke-VerifyCommand()`の結果へ混在する。
- 呼び出し側は`$report.verify_exit_code = Invoke-VerifyCommand ...`と直接代入しているため、配列化した結果がそのままreportへ保存される。
- 後続の`$report.verify_exit_code -ne 0`、`Add-ValidationCommand`、`Write-TaskReport`、`Write-RunManifest`は、`verify_exit_code`が単一の整数である前提で動いている。したがって、原因はverify起動とexit code取得の境界にある。
- 同じ`codex-task.ps1`内の`Invoke-NativeCommand()`は、`& $Command @CommandArgs | Out-Host`でsuccess outputをhostへ流した後、`$LASTEXITCODE`だけを返している。
- `Invoke-NativeCommand()`は`PSNativeCommandUseErrorActionPreference`が存在するruntimeでは一時的に`false`へ設定し、非0exitをPowerShell例外として処理するのではなく、exit codeとして呼び出し元へ返す既存契約を持つ。
- 現在の`Invoke-NativeCommand()`の`CommandArgs`は`[Parameter(Mandatory = $true)][string[]]`で、空配列を許可する属性がない。default経路から引数なしで再利用するには、このparameter契約を明示的に補う必要がある。
- `tests/contracts/codex-task-native-command.test.ts`には、`Invoke-NativeCommand()`が標準出力・標準エラーを可視化したまま、成功時`0`・失敗時`7`を`System.Int32`の単一値として返すcontract testがある。
- 同testの既存wrapper testはreportだけでなく、wrapper processの終了値がnative commandのexit codeと一致することも確認している。
- 現在の`createWrapperFixture()`が一時repoへコピーしているのは`codex-task.ps1`と`codex-artifact-sanitizer.ps1`であり、`-RecordRunManifest`を実行するためのcollectorとsanitizer CLIはコピーしていない。
- `Write-RunManifest()`は`-RecordRunManifest`使用時に同じrepo rootの`scripts/collect-run-artifacts.ps1`を必須で呼び出し、そのscriptは`scripts/collect-run-artifacts.py`を実行する。manifestのruntime検証には両ファイルとPython runtimeが必要になる。
- `Write-RunManifest()`はcollector起動に`powershell.exe`を固定使用しているため、manifest付きfull-wrapper testは現在の実装上Windows依存である。
- wrapper終了時の`Invoke-CodexRunArtifactSanitization()`は`scripts/sanitize-codex-artifacts.ps1`を必要とし、正常終了時にsanitizationが失敗するとwrapperの終了値も失敗へ変わる。
- `sanitize-codex-artifacts.ps1`は共有`codex-artifact-sanitizer.ps1`を読み込み、Gitからrepository rootを解決する。したがってmanifest付き一時fixtureはsanitizer CLIを含み、`git init`済みである必要がある。commit作成は不要。
- `package.json`では`test:contracts`が`tests/contracts`全体を直列実行し、`verify`にも`test:contracts`を含む全体検証が組み込まれている。
- Web CIのVitest `contracts` jobは`ubuntu-latest`で実行される。Windows固有の`.ps1`、`.cmd`、`.bat`、command text経路とmanifest付きfull-wrapper testは、このCIだけではruntime検証されない。

### 前提

- `Invoke-VerifyCommand()`の各実行形式では、既存のコマンド選択・引数・環境変数復元を維持し、外部コマンド起動だけを`Invoke-NativeCommand()`へ委譲する。
- default経路を同じhelperへ統一するため、`Invoke-NativeCommand()`の`CommandArgs`へ`[AllowEmptyCollection()]`を追加する。helperの処理内容や責務は変更しない。
- verifyの出力可視性は、既存の`Invoke-NativeCommand()` contractと同様に、標準出力・標準エラーを呼び出し元プロセスから確認できることを基準とする。行順序やストリームの内部表現変更は要求しない。
- `.cmd`、`.bat`、`.ps1`、command textのruntime検証はWindowsで行う。`.sh`は`bash`が利用可能な環境で行う。利用できないruntimeの経路は通常のcross-platform contract testではskipしてよいが、Windows固有経路は実装完了前にWindows環境で別途PASSを確認する。
- 拡張子で分岐しない実行ファイル経路も同じ原因を持つため、Issueに明記された4形式とcommand textに加えて修正対象へ含める。
- command textの失敗fixtureでは、EncodedCommand外側からnative child processの終了コード伝播仕様を新たに変更しない。fixtureのcommand text自身に`exit 7`を含め、今回確認したい「verify出力とexit codeの分離」だけを検証する。
- 6つのverify経路すべてにmanifest付きfull-wrapper testを重複させない。各経路はsource contractと対応runtimeでの起動確認を行い、実障害のcommand text経路だけ成功・失敗のfull-wrapper contractでreport、process exit、manifestまで通して確認する。
- manifest付きfull-wrapper fixtureでは、`codex-task.ps1`、`codex-artifact-sanitizer.ps1`、`collect-run-artifacts.ps1`、`collect-run-artifacts.py`、`sanitize-codex-artifacts.ps1`をproduction sourceから一時repoへコピーし、fixture rootで`git init`する。これらのproduction source自体は変更しない。
- manifest付きfull-wrapper testはWindows + `powershell.exe` + Python + Gitが利用可能な環境で実行する。通常のLinux CIではこのtestをskipし、Linux上で実行可能なruntime testとsource contractを確認する。

### 対象外

- PR #133のEvidence validator再修正
- `scripts/validate-curriculum.ts`の変更
- `tests/contracts/training-curriculum.test.ts`の変更
- 教材・Training Copyの変更
- Native CI、Expo dependency、Windows Hook timeoutの対応
- `run.json` schemaの変更
- actual `run.json`の手編集を許可する変更
- verify failureをfail-openにする変更
- `scripts/codex-task.sh`の仕様変更
- `Invoke-NativeCommand()`の処理内容や責務の再設計
- command text内で起動した任意のnative child processの終了コードをEncodedCommand越しに透過伝播させる新仕様
- `Write-RunManifest()`の`powershell.exe`固定起動をcross-platform化する変更
- Windows用の新しいGitHub Actions job追加
- 新しい共通wrapperや外部依存関係の追加

## 3. 質問 / 曖昧性

- 必ず質問する不透明点: なし。Issueに原因、対象経路、期待状態、対象外、検証条件が明記されており、既存実装にも再利用可能な`Invoke-NativeCommand()`がある。
- 仮定してよい細部:
  - runtime testで使用する非0exit codeは、既存contract testと揃えて`7`を使用する。
  - verify fixtureの標準出力は複数行にし、少なくとも1ケースで標準エラーも出して可視性を確認する。
  - 通常のLinux CIでWindows固有runtime testとmanifest付きfull-wrapper testはskipしてよい。ただし、実装完了条件としてWindows環境でtargeted testのPASSを確認する。
  - manifest付きfull-wrapper testはWindows、`powershell.exe`、Python、Gitの全条件が揃う場合だけ実行する。実装完了確認ではこれらが揃うWindows環境を使用し、成功・失敗の両contractをskipせず実行する。
  - 一時repoは`git init`まで行えばよく、fixture用commitやremote設定は作らない。
- 未回答の重要質問: なし。

## 4. 影響範囲

### Entry points

- `scripts/codex-task.ps1`の`-VerifyCommand`
- `Invoke-VerifyCommand()`
- `Invoke-NativeCommand()`の`CommandArgs` parameter contract
- verify成功・失敗後のreport / validation / manifest更新

### Main flow

```text
-VerifyCommand
  -> Invoke-VerifyCommand
     -> Invoke-NativeCommand
     -> stdout/stderrはhostへ表示
     -> scalar exit codeだけを返す
  -> report.verify_exit_code
  -> verify_exit log
  -> verify_exit_code != 0 判定
     -> 失敗: report.status=verify_failed
              Add-ValidationCommand(failed)
              Write-TaskReport
              Write-RunManifest(status=failed)
              wrapper process exit=verify_exit_code
     -> 成功: report.status=ok
              Add-ValidationCommand(passed)
              run_status=completed
  -> 最終 Write-TaskReport / Write-RunManifest
  -> wrapper process exit=0
```

### Key abstractions

- `Invoke-VerifyCommand()`: verify command形式の解決と起動を担当する。
- `Invoke-NativeCommand()`: native commandの出力をhostへ流し、単一のexit codeを返す既存の共通境界。今回、0件の`CommandArgs`も明示的に受け付けるようparameter contractだけを補う。
- `Add-ValidationCommand()`: verify結果をvalidation stateへ反映する。
- `Write-TaskReport()`: `verify_exit_code`と`report.status`をreport JSONへ保存する。
- `Write-RunManifest()`: `run_status`と`validation_status`をmachine-managed manifestへ反映する。現在はcollectorを`powershell.exe`で起動する。
- `collect-run-artifacts.ps1` / `collect-run-artifacts.py`: manifest fixtureでproductionと同じmachine-managed更新経路を成立させる。今回の変更対象ではない。
- `sanitize-codex-artifacts.ps1` / `codex-artifact-sanitizer.ps1`: wrapper終了時のRun Artifact sanitizationをfixture上でも成立させる。今回の変更対象ではない。

### Existing tests

- `tests/contracts/codex-task-native-command.test.ts`
  - `Invoke-NativeCommand()`のsource contract
  - 成功・失敗時のscalar exit code
  - 標準出力・標準エラーの可視性
  - wrapper reportへ`codex_exit_code`を単一数値として保存する契約
  - wrapper process exit codeがnative exit codeと一致する契約
- `tests/contracts/codex-run-manifest-contract.test.ts`
  - Run manifest v2の既存契約。今回schema変更はしない。
- `package.json`
  - `test:contracts`
  - `verify`
- `.github/workflows/ci.yml`
  - contract testは`ubuntu-latest`で実行される。Windows固有runtime経路とmanifest付きfull-wrapper testの完了確認は別途必要。

### Safe change surface

変更対象は次の2ファイルに限定する。

- `scripts/codex-task.ps1`
- `tests/contracts/codex-task-native-command.test.ts`

`Invoke-NativeCommand()`の変更は`CommandArgs`へ`[AllowEmptyCollection()]`を付けるparameter contract補完だけとし、実行処理は変更しない。

manifest writer、schema、collector、sanitizer、CI workflow、教材、Training関連コードは変更しない。

### Files to inspect

- `scripts/codex-task.ps1`
- `tests/contracts/codex-task-native-command.test.ts`
- `tests/contracts/codex-run-manifest-contract.test.ts`
- `scripts/collect-run-artifacts.ps1`
- `scripts/collect-run-artifacts.py`
- `scripts/sanitize-codex-artifacts.ps1`
- `scripts/lib/codex-artifact-sanitizer.ps1`
- `.github/workflows/ci.yml`
- `package.json`
- `AGENTS.md`
- `PLANS.md`

### Unknowns

- Windows環境で`bash`が常に利用可能かは保証しない。`.sh` runtime testは`bash`検出結果に従う。
- Linux/macOSでは`codex-task.ps1`内の`.ps1`・command text経路が`powershell.exe`を使用する既存仕様のため、その経路のruntime testはWindowsへ限定する。今回このplatform差は変更対象にしない。
- `Write-RunManifest()`もcollectorを`powershell.exe`で起動するため、manifest付きfull-wrapper testはWindowsへ限定する。今回このplatform差も変更対象にしない。
- Web CIのcontract testはLinuxであり、Windows固有runtime経路とmanifest付きfull-wrapper testを実行しない。この不足はCI変更ではなく、Windows環境でのtargeted testを実装完了条件へ追加して補う。

## 5. 変更方針

### 変更方針

1. `Invoke-NativeCommand()`の`CommandArgs`へ`[AllowEmptyCollection()]`を追加し、引数なしのnative commandを既存helperで扱えることを明示する。
   - `Command`、`CommandArgs`以外のparameterは追加しない。
   - `Out-Host`、`PSNativeCommandUseErrorActionPreference`、`$LASTEXITCODE`の処理は変更しない。
   - default verify経路のruntime testで空の`CommandArgs`を実際に渡して確認する。
2. `Invoke-VerifyCommand()`の各外部コマンド起動を確認し、直接`& ...`している箇所を`Invoke-NativeCommand()`経由へ統一する。
   - `.ps1`: 現在の`powershell.exe -ExecutionPolicy Bypass -File <path>`のコマンド・引数を維持する。
   - `.cmd` / `.bat`: 現在の`cmd.exe /d /c <path>`を維持する。
   - `.sh`: `Get-Command bash`による存在確認を維持し、解決済み`bash` pathとverify script pathを共通helperへ渡す。
   - default: 解決済み実行ファイルと空の`CommandArgs`を共通helperへ渡す。
   - command text: `CODEX_VERIFY_COMMAND`、EncodedCommand生成、環境変数の`finally`復元を維持し、`powershell.exe -NoProfile -EncodedCommand <encoded>`の起動だけを共通helperへ委譲する。
3. `Invoke-VerifyCommand()`は各経路で`Invoke-NativeCommand()`が返した単一exit codeだけを返す。出力を捕捉して文字列化したり、`$LASTEXITCODE`を別途再解釈したりしない。
4. `report.verify_exit_code`以降のstatus判定、validation更新、manifest writer、wrapper終了値の制御は変更しない。原因箇所より後段へ配列対策やcastを追加しない。
5. `tests/contracts/codex-task-native-command.test.ts`を拡張し、verify経路のcontractを同じtest体系で確認する。
   - source code contractで`Invoke-VerifyCommand()`の`.ps1`、`.cmd`、`.bat`、`.sh`、default、command textの全外部起動経路が`Invoke-NativeCommand()`を使用することを確認する。
   - `Invoke-NativeCommand()`の`CommandArgs`が空配列を許可するsource contractとruntime contractを確認する。
   - `.ps1`、`.cmd`、`.bat`、`.sh`、default、command textについて、対応runtimeが利用できる環境では少なくとも成功するfixtureを実行し、stdoutを出してもscalar `0`になることを確認する。
   - Windows固有の`.ps1`、`.cmd`、`.bat`、command textはWindowsで実行する。`.sh`は`bash`がある環境で実行する。defaultは実行可能なfixtureをOSに合わせて用意する。
   - 各6経路にmanifest付きfull-wrapper testを重複させない。
6. 実障害と同じcommand text経路で、成功・失敗のfull-wrapper contractを追加する。
   - 成功fixtureは複数行の標準出力を出して`exit 0`する。
   - 失敗fixtureは複数行の標準出力を出し、command text自身が`exit 7`する。EncodedCommand内部のnative child process終了コード伝播は今回の検証対象にしない。
   - 少なくとも一方のfixtureで標準エラーmarkerも出し、wrapper実行結果から可視であることを確認する。
   - 成功時はwrapper process exit `0`、scalar `verify_exit_code=0`、`report.status=ok`、`run.json.status=completed`、`validation.status=passed`を確認する。
   - 失敗時はwrapper process exit `7`、scalar `verify_exit_code=7`、`report.status=verify_failed`、`run.json.status=failed`、`validation.status=failed`を確認する。
7. manifest付きfull-wrapper fixtureを既存の`createWrapperFixture()`相当の構造へ追加する。
   - `scripts/codex-task.ps1`
   - `scripts/lib/codex-artifact-sanitizer.ps1`
   - `scripts/collect-run-artifacts.ps1`
   - `scripts/collect-run-artifacts.py`
   - `scripts/sanitize-codex-artifacts.ps1`
   をproduction sourceから一時repoへコピーする。
   - fixture rootで`git init`し、sanitizerがrepository rootを解決できる状態にする。fixture用commitやremoteは作らない。
   - test fixture内で`codex-task.ps1 -RecordRunManifest -RunId <test-run-id>`を実行し、生成された`run.json`を読み取る。
   - `run.json`、collector、sanitizer sourceをtest codeから書き換えない。
   - actual repository Runの`run.json`は編集しない。
8. manifest付きfull-wrapper testはWindows + `powershell.exe` + Python + Gitが利用可能な場合だけ実行する。
   - 通常のLinux CIではskipしてよい。
   - 実装完了時は条件が揃うWindows環境で成功・失敗の2ケースがskipされずPASSすることを確認する。
   - このために`Write-RunManifest()`、collector、GitHub Actions workflowを変更しない。
9. Windows環境でtargeted contract testを実行し、`.ps1`、`.cmd`、`.bat`、command textのruntime testとmanifest付きfull-wrapper testがskipされずPASSすることを実装完了条件として確認する。
   - Linux CIのPASSだけをWindows固有経路の検証完了とは扱わない。
   - 今回はWindows用GitHub Actions jobを追加しない。
10. 新しいtest helper file、wrapper、dependencyは追加しない。既存fixtureと`spawnSync`、`fs`、`os`、`path`を再利用する。

### 実行タスク

- [ ] 1. `Invoke-NativeCommand()`の`CommandArgs`へ`[AllowEmptyCollection()]`を追加し、0引数呼び出しを明示的に許可する。
- [ ] 2. `Invoke-VerifyCommand()`の`.ps1`、`.cmd`、`.bat`、`.sh`、default、command textの全起動経路を`Invoke-NativeCommand()`経由へ変更する。
- [ ] 3. command text経路の`CODEX_VERIFY_COMMAND`設定・復元とEncodedCommand生成が変更前と同じであることを確認する。
- [ ] 4. 6経路すべての共通helper利用をsource contractで確認する。
- [ ] 5. 対応runtime上で6経路それぞれの成功fixtureを実行し、stdoutがあってもscalar `0`になることを確認する。
- [ ] 6. default経路で空の`CommandArgs`を実際に渡し、scalar exit codeが返ることをruntime testで確認する。
- [ ] 7. command text経路の成功full-wrapper fixtureを追加し、wrapper process exit `0`、report、validation、manifestの成功状態を確認する。
- [ ] 8. command text経路の失敗full-wrapper fixtureを追加し、command text自身を`exit 7`させ、wrapper process exit `7`、report、validation、manifestの失敗状態を確認する。
- [ ] 9. verify標準出力・標準エラーmarkerがwrapperの出力から確認できることを検証する。
- [ ] 10. manifest付きfixtureへ`collect-run-artifacts.ps1`、`collect-run-artifacts.py`、`sanitize-codex-artifacts.ps1`、`codex-artifact-sanitizer.ps1`を含める。
- [ ] 11. manifest付きfixture rootを`git init`し、sanitizerのrepository root解決を成立させる。
- [ ] 12. Windows + `powershell.exe` + Python + Git環境でmanifest付きfull-wrapper成功・失敗testがskipされずPASSすることを確認する。
- [ ] 13. Windows環境で`.ps1`、`.cmd`、`.bat`、command textのtargeted runtime testがskipされずPASSすることを確認する。
- [ ] 14. `.sh`は`bash`が利用可能な環境でruntime testを実行する。
- [ ] 15. targeted contract test、`pnpm run test:contracts`、`pnpm run verify`、`git diff --check`を実行する。

## 6. 検証方法

### 検証手順

1. 変更対象testのtargeted実行

```text
pnpm exec vitest run tests/contracts/codex-task-native-command.test.ts --no-file-parallelism --maxWorkers=1
```

Windows環境ではこのcommandを必ず実行し、次を確認する。

- `.ps1`、`.cmd`、`.bat`、command textのruntime testがskipされずPASSする。
- PythonとGitも利用可能な環境では、manifest付きfull-wrapperの成功・失敗testもskipされずPASSする。

2. contract test全体

```text
pnpm run test:contracts
```

3. repository標準検証

```text
pnpm run verify
```

4. diff整合性

```text
git diff --check
```

### 自動テストで確認する値

command textの成功full-wrapper:

```text
result.status === 0
typeof report.verify_exit_code === "number"
Array.isArray(report.verify_exit_code) === false
report.verify_exit_code === 0
report.status === "ok"
run.json.status === "completed"
run.json.validation.status === "passed"
```

command textの失敗full-wrapper:

```text
result.status === 7
typeof report.verify_exit_code === "number"
Array.isArray(report.verify_exit_code) === false
report.verify_exit_code === 7
report.status === "verify_failed"
run.json.status === "failed"
run.json.validation.status === "failed"
```

`Invoke-NativeCommand()`の0引数contract:

```text
CommandArgsへ空配列を渡せる
戻り値の型がSystem.Int32
戻り値の要素数が1
stdout/stderrが戻り値へ混入しない
```

各verify起動経路のruntime contract:

```text
.ps1 / .cmd / .bat / .sh / default / command text
対応runtimeがある環境ではfixtureがexit 0する
複数行stdoutを出しても戻り値はscalar 0
source code contractでは全経路がInvoke-NativeCommandを使用する
```

command text失敗fixture:

```text
command text自身が複数行を出力する
command text自身がexit 7する
report.verify_exit_code === 7
wrapper process exit code === 7
```

出力可視性:

```text
stdoutにverify fixtureの複数行markerが含まれる
stderrを出すfixtureではstderr markerも確認できる
```

manifest付きfull-wrapper fixture:

```text
実行環境はWindows + powershell.exe + Python + Git
一時repoにscripts/codex-task.ps1が存在する
一時repoにscripts/lib/codex-artifact-sanitizer.ps1が存在する
一時repoにscripts/collect-run-artifacts.ps1が存在する
一時repoにscripts/collect-run-artifacts.pyが存在する
一時repoにscripts/sanitize-codex-artifacts.ps1が存在する
fixture rootをgit initしている
-RecordRunManifest経由でrun.jsonを生成する
test codeがrun.jsonを直接生成・手編集しない
```

### 成功判定

- Issue #145の成功・失敗contractを自動テストで再現できる。
- 修正前なら複数行stdoutでscalar contractが崩れ、修正後は成功・失敗とも単一整数になる回帰テストになっている。
- default経路を含め、全verify起動経路が同じ`Invoke-NativeCommand()` contractを使う。
- 対応runtime上で各verify起動経路の成功fixtureがscalar `0`を返す。
- 実障害のcommand text経路では成功・失敗のfull-wrapper testがあり、reportだけでなくwrapper process exit、validation、manifestまで確認している。
- command textの非0fixtureは`exit 7`を明示し、今回対象外のchild process exit code伝播仕様へ検証範囲を広げていない。
- manifest testはcollectorとsanitizerを含み、Git repositoryとして初期化された一時fixture上でproductionと同じmachine-managed経路を使用する。
- Windows + `powershell.exe` + Python + Git環境でmanifest付きfull-wrapper成功・失敗testがskipされずPASSしている。
- Windows環境で`.ps1`、`.cmd`、`.bat`、command textのtargeted runtime testがskipされずPASSしている。
- Linux CIのcontract testでは、利用可能なruntime経路とsource code contractがPASSしている。
- 既存の`Invoke-NativeCommand()`の出力可視性・scalar exit code contractを壊していない。
- manifest schemaや既存validation構造に差分がない。
- targeted contract test、`pnpm run test:contracts`、`pnpm run verify`、`git diff --check`がすべてPASSする。

## 7. リスクと未解決論点

### リスク

- `Invoke-NativeCommand()`へ統一すると、PowerShell 7系では`PSNativeCommandUseErrorActionPreference`を一時的に`false`へする既存挙動がverifyにも適用される。これは非0exitを例外化せず`verify_failed`判定へ渡す現在の期待と整合するが、成功・失敗runtime testで確認する。
- default経路では空の`CommandArgs`を渡すため、`[AllowEmptyCollection()]`でparameter bindingを明示的に許可する。この変更は0引数native commandの既存helper利用に必要な範囲へ限定する。
- `-RecordRunManifest`のfixtureはcollector、sanitizer CLI、Python、Gitを必要とする。必要ファイルや`git init`を省くとverify結果とは無関係なfixture不備で失敗するため、fixture構成をPlanどおり固定する。
- `Write-RunManifest()`はcollectorを`powershell.exe`で起動するため、manifest付きfull-wrapper testはLinux CIで実行できない。今回はmanifest writerをcross-platform化せず、Windows環境でのtargeted testを完了条件とする。
- Web CIのcontract testはLinuxで実行されるため、Windows固有runtime経路はCIだけでは保証できない。今回はCI workflowを広げず、Windows環境でのtargeted testを完了条件とする。
- command text経路でnative child processの終了コードをそのままEncodedCommand processの終了コードへ伝播させることは今回の要件ではない。失敗fixtureはcommand text自身の`exit 7`で検証境界を固定する。
- platformごとに利用可能なscript runtimeが異なる。runtime testだけに依存すると未実行経路が残るため、全分岐が共通helperを使うsource code contractも維持する。
- 6経路すべてへ成功・失敗・manifestの組み合わせを重複させると、Issue #145に対してテスト量が過剰になる。各経路の起動契約と、実障害経路のend-to-end contractを分けて確認する。
- 出力を`Out-Host`へ流すことでsuccess outputは関数の戻り値から除外される。標準エラーの可視性は既存helper contractに加えてverify fixtureでも確認する。

### 未解決論点

- 実装開始を妨げる未解決事項はない。

## 8. 成果物

### 変更ファイル

実装時の予定:

- `scripts/codex-task.ps1`
- `tests/contracts/codex-task-native-command.test.ts`

### 参照するが変更しないファイル

- `scripts/collect-run-artifacts.ps1`
- `scripts/collect-run-artifacts.py`
- `scripts/sanitize-codex-artifacts.ps1`
- `scripts/lib/codex-artifact-sanitizer.ps1`
- `.github/workflows/ci.yml`
- `tests/contracts/codex-run-manifest-contract.test.ts`

### 付随ドキュメント

- このPlan以外の設計文書、ADR、schema更新は不要。

## 9. 備考

- branchは`main`から作成する。
- Plan作成時に確認した`main`の最新commitは`f6727303da97f3b4b81777472a305ed5c3860410`。
- Issueの症状は後段status判定の欠陥ではなく、PowerShell関数のoutput streamとexit codeを分離していないverify起動境界にある。実装では後段へcastや配列判定を追加せず、原因箇所で修正する。
- `Invoke-NativeCommand()`への変更は、default経路を再利用可能にする`[AllowEmptyCollection()]`の追加だけとする。
- manifest付きfixtureへcollectorとsanitizerをコピーし`git init`することはtest fixtureの実行前提を満たすためであり、productionのcollectorやsanitizer sourceを変更する理由にはしない。
- manifest付きfull-wrapper検証とWindows固有runtime検証は必須だが、Issue #145のために`Write-RunManifest()`やGitHub Actionsをcross-platform化しない。
- 今回はPlan修正までとし、実装、PR作成、mergeは行わない。