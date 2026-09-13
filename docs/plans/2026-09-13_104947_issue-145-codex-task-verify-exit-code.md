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
- 複数行を標準出力する成功verifyで次を満たす。
  - `verify_exit_code === 0`
  - `report.status === "ok"`
  - `run.json.status === "completed"`
  - `validation.status === "passed"`
- 複数行を標準出力する失敗verifyで次を満たす。
  - `verify_exit_code`に指定した非0の整数が保持される。
  - `report.status === "verify_failed"`
  - `run.json.status === "failed"`
  - `validation.status === "failed"`
- verifyの標準出力・標準エラーが呼び出し元から確認できる状態を維持する。
- `.ps1`、`.cmd`、`.bat`、`.sh`、拡張子で分岐しない実行ファイル、command text経路で同じexit code分離規則を使う。
- 新しいwrapper、依存関係、Run Artifact schemaを追加しない。
- 回帰テストを既存の`codex-task` contract test体系へ追加する。
- `pnpm run test:contracts`がPASSする。
- `pnpm run verify`がPASSする。
- `git diff --check`がPASSする。
- actual `.codex/runs/<run_id>/run.json`を手編集しない。

## 2. 現状理解と前提

### Current understanding

- `scripts/codex-task.ps1`の`Invoke-VerifyCommand()`は、対象がファイルの場合に拡張子ごとに外部コマンドを直接実行し、その直後に`return $LASTEXITCODE`している。
- command textの場合も、`CODEX_VERIFY_COMMAND`へ文字列を格納し、`powershell.exe -NoProfile -EncodedCommand`を直接実行した後に`return $LASTEXITCODE`している。
- PowerShellでは関数内のsuccess outputも関数出力になるため、verifyコマンドが標準出力を生成すると、その出力と`$LASTEXITCODE`が`Invoke-VerifyCommand()`の結果へ混在する。
- 呼び出し側は`$report.verify_exit_code = Invoke-VerifyCommand ...`と直接代入しているため、配列化した結果がそのままreportへ保存される。
- 後続の`$report.verify_exit_code -ne 0`、`Add-ValidationCommand`、`Write-TaskReport`、`Write-RunManifest`は、`verify_exit_code`が単一の整数である前提で動いている。したがって、原因はverify起動とexit code取得の境界にある。
- 同じ`codex-task.ps1`内の`Invoke-NativeCommand()`は、`& $Command @CommandArgs | Out-Host`でsuccess outputをhostへ流した後、`$LASTEXITCODE`だけを返している。
- `Invoke-NativeCommand()`は`PSNativeCommandUseErrorActionPreference`が存在するruntimeでは一時的に`false`へ設定し、非0exitをPowerShell例外として処理するのではなく、exit codeとして呼び出し元へ返す既存契約を持つ。
- `tests/contracts/codex-task-native-command.test.ts`には、`Invoke-NativeCommand()`が標準出力・標準エラーを可視化したまま、成功時`0`・失敗時`7`を`System.Int32`の単一値として返すcontract testがある。
- `package.json`では`test:contracts`が`tests/contracts`全体を直列実行し、`verify`にも`test:contracts`を含む全体検証が組み込まれている。

### Assumptions

- `Invoke-VerifyCommand()`の各実行形式で必要なのは、既存のコマンド選択・引数・環境変数復元を維持したまま、外部コマンド起動だけを`Invoke-NativeCommand()`へ委譲することとする。
- verifyの出力可視性は、既存の`Invoke-NativeCommand()` contractと同様に、標準出力・標準エラーを呼び出し元プロセスから確認できることを基準とする。行順序やストリームの内部表現変更は要求しない。
- `.cmd`、`.bat`、command textのruntime検証はWindowsで行う。`.sh`は`bash`が利用可能な環境で行う。利用できないruntimeの経路はsource contractで共通helper利用を確認し、runtime testは既存test方針に合わせてskipする。
- 拡張子で分岐しない実行ファイル経路も同じ原因を持つため、Issueに明記された4形式とcommand textに加えて修正対象へ含める。

### Non-goals

- PR #133のEvidence validator再修正
- `scripts/validate-curriculum.ts`の変更
- `tests/contracts/training-curriculum.test.ts`の変更
- 教材・Training Copyの変更
- Native CI、Expo dependency、Windows Hook timeoutの対応
- `run.json` schemaの変更
- actual `run.json`の手編集を許可する変更
- verify failureをfail-openにする変更
- `scripts/codex-task.sh`の仕様変更
- `Invoke-NativeCommand()`自体の再設計
- 新しい共通wrapperや外部依存関係の追加

## 3. 質問 / 曖昧性

- 必ず質問する不透明点: なし。Issueに原因、対象経路、期待状態、対象外、検証条件が明記されており、既存実装にも再利用可能な`Invoke-NativeCommand()`がある。
- 仮定してよい細部:
  - runtime testで使用する非0exit codeは、既存contract testと揃えて`7`を使用する。
  - verify fixtureの標準出力は複数行にし、少なくとも1ケースで標準エラーも出して可視性を確認する。
  - OSやruntimeがない経路は`skipIf`等の既存方針でskipし、source-level contractを残す。
- 未回答の重要質問: なし。

## 4. 影響範囲

### Entry points

- `scripts/codex-task.ps1`の`-VerifyCommand`
- `Invoke-VerifyCommand()`
- verify成功・失敗後のreport / validation / manifest更新

### Main flow

```text
-VerifyCommand
  -> Invoke-VerifyCommand
  -> report.verify_exit_code
  -> verify_exit log
  -> verify_exit_code != 0 判定
     -> 失敗: report.status=verify_failed
              Add-ValidationCommand(failed)
              Write-TaskReport
              Write-RunManifest(status=failed)
     -> 成功: report.status=ok
              Add-ValidationCommand(passed)
              run_status=completed
  -> 最終 Write-TaskReport / Write-RunManifest
```

### Key abstractions

- `Invoke-VerifyCommand()`: verify command形式の解決と起動を担当する。
- `Invoke-NativeCommand()`: native commandの出力をhostへ流し、単一のexit codeを返す既存の共通境界。
- `Add-ValidationCommand()`: verify結果をvalidation stateへ反映する。
- `Write-TaskReport()`: `verify_exit_code`と`report.status`をreport JSONへ保存する。
- `Write-RunManifest()`: `run_status`と`validation_status`をmachine-managed manifestへ反映する。

### Existing tests

- `tests/contracts/codex-task-native-command.test.ts`
  - `Invoke-NativeCommand()`のsource contract
  - 成功・失敗時のscalar exit code
  - 標準出力・標準エラーの可視性
  - wrapper reportへ`codex_exit_code`を単一数値として保存する契約
- `tests/contracts/codex-run-manifest-contract.test.ts`
  - Run manifest v2の既存契約。今回schema変更はしない。
- `package.json`
  - `test:contracts`
  - `verify`

### Safe change surface

変更対象は次の2ファイルに限定する。

- `scripts/codex-task.ps1`
- `tests/contracts/codex-task-native-command.test.ts`

manifest writer、schema、collector、教材、Training関連コードは変更しない。

### Files to inspect

- `scripts/codex-task.ps1`
- `tests/contracts/codex-task-native-command.test.ts`
- `tests/contracts/codex-run-manifest-contract.test.ts`
- `package.json`
- `AGENTS.md`
- `PLANS.md`

### Unknowns

- Windows CIで`bash`が常に利用可能かは保証しない。`.sh` runtime testは`bash`検出結果に従う。
- Linux/macOSでは`codex-task.ps1`内の`.ps1`・command text経路が`powershell.exe`を使用する既存仕様のため、その経路のruntime testはWindowsへ限定する。今回このplatform差は変更対象にしない。

## 5. 変更方針

### Change strategy

1. `Invoke-VerifyCommand()`の各外部コマンド起動を確認し、直接`& ...`している箇所を`Invoke-NativeCommand()`経由へ統一する。
   - `.ps1`: 現在の`powershell.exe -ExecutionPolicy Bypass -File <path>`のコマンド・引数を維持する。
   - `.cmd` / `.bat`: 現在の`cmd.exe /d /c <path>`を維持する。
   - `.sh`: `Get-Command bash`による存在確認を維持し、解決済み`bash` pathとverify script pathを共通helperへ渡す。
   - default: 解決済み実行ファイルを引数なしで共通helperへ渡す。
   - command text: `CODEX_VERIFY_COMMAND`、EncodedCommand生成、環境変数の`finally`復元を維持し、`powershell.exe -NoProfile -EncodedCommand <encoded>`の起動だけを共通helperへ委譲する。
2. `Invoke-VerifyCommand()`は各経路で`Invoke-NativeCommand()`が返した単一exit codeだけを返す。出力を捕捉して文字列化したり、`$LASTEXITCODE`を別途再解釈したりしない。
3. `Invoke-NativeCommand()`、`report.verify_exit_code`以降のstatus判定、manifest writerは変更しない。原因箇所より後段へ配列対策やcastを追加しない。
4. `tests/contracts/codex-task-native-command.test.ts`を拡張し、verify経路のcontractを同じtest体系で確認する。
   - source-level contractで`Invoke-VerifyCommand()`の全外部起動経路が`Invoke-NativeCommand()`を使用することを確認する。
   - 複数行の標準出力を出してexit 0するverify fixtureを実行し、scalar `0`、`report.status=ok`、`run.json.status=completed`、`validation.status=passed`を確認する。
   - 複数行の標準出力を出してexit 7するverify fixtureを実行し、scalar `7`、`report.status=verify_failed`、`run.json.status=failed`、`validation.status=failed`を確認する。
   - 少なくとも1ケースで標準エラーmarkerも出し、wrapper実行結果から可視であることを確認する。
   - `.ps1`、`.cmd`、`.bat`、`.sh`、default、command textの各経路を、利用可能なruntime上でfixture実行する。runtimeがない経路はskipし、source-level contractで共通helper利用を検証する。
   - manifestはtest fixture内で`codex-task.ps1 -RecordRunManifest -RunId <test-run-id>`に生成させ、test codeから結果を読み取る。actual repository Runの`run.json`は編集しない。
5. 新しいtest helper file、wrapper、dependencyは追加しない。既存fixtureと`spawnSync`、`fs`、`os`、`path`を再利用する。

### 実行タスク

- [ ] 1. `Invoke-VerifyCommand()`の`.ps1`、`.cmd`、`.bat`、`.sh`、default、command textの全起動経路を`Invoke-NativeCommand()`経由へ変更する。
- [ ] 2. command text経路の`CODEX_VERIFY_COMMAND`設定・復元とEncodedCommand生成が変更前と同じであることを確認する。
- [ ] 3. verify成功fixtureを追加し、複数行出力でも`verify_exit_code`が単一の`0`になることを自動検証する。
- [ ] 4. verify失敗fixtureを追加し、複数行出力でも指定した非0exit codeが単一値で保持されることを自動検証する。
- [ ] 5. report、validation、manifestの成功・失敗statusを同じruntime contract testで確認する。
- [ ] 6. verify標準出力・標準エラーmarkerがwrapperの出力から確認できることを検証する。
- [ ] 7. 対応runtime上で`.ps1`、`.cmd`、`.bat`、`.sh`、default、command text経路を確認する。
- [ ] 8. targeted contract test、`pnpm run test:contracts`、`pnpm run verify`、`git diff --check`を実行する。

## 6. 検証方法

### Validation plan

1. 変更対象testのtargeted実行

```text
pnpm exec vitest run tests/contracts/codex-task-native-command.test.ts --no-file-parallelism --maxWorkers=1
```

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

成功verify:

```text
typeof report.verify_exit_code === "number"
Array.isArray(report.verify_exit_code) === false
report.verify_exit_code === 0
report.status === "ok"
run.json.status === "completed"
run.json.validation.status === "passed"
```

失敗verify:

```text
typeof report.verify_exit_code === "number"
Array.isArray(report.verify_exit_code) === false
report.verify_exit_code === 7
report.status === "verify_failed"
run.json.status === "failed"
run.json.validation.status === "failed"
```

出力可視性:

```text
stdoutにverify fixtureの複数行markerが含まれる
stderrを出すfixtureではstderr markerも確認できる
```

### 成功判定

- Issue #145の成功・失敗contractを自動テストで再現できる。
- 修正前なら複数行stdoutでscalar contractが崩れ、修正後は成功・失敗とも単一整数になる回帰テストになっている。
- 既存の`Invoke-NativeCommand()` contractを壊していない。
- manifest schemaや既存validation構造に差分がない。
- 上記4つの検証コマンドがすべてPASSする。

## 7. リスクと未解決論点

### Risks

- `Invoke-NativeCommand()`へ統一すると、PowerShell 7系では`PSNativeCommandUseErrorActionPreference`を一時的に`false`へする既存挙動がverifyにも適用される。これは非0exitを例外化せず`verify_failed`判定へ渡す現在の期待と整合するが、成功・失敗runtime testで確認する。
- default経路は引数なしで共通helperを呼ぶため、空の`CommandArgs`が既存parameter bindingで問題なく扱えることをtargeted testで確認する。問題がある場合も新しいwrapperは作らず、既存helperの呼び出し方だけで解決する。
- platformごとに利用可能なscript runtimeが異なる。runtime testだけに依存すると未実行経路が残るため、全分岐が共通helperを使うsource-level contractも維持する。
- 出力を`Out-Host`へ流すことでsuccess outputは関数の戻り値から除外される。標準エラーの可視性は既存helper contractに加えてverify fixtureでも確認する。

### Open questions

- 実装開始を妨げる未解決事項はない。

## 8. 成果物

### 変更ファイル

実装時の予定:

- `scripts/codex-task.ps1`
- `tests/contracts/codex-task-native-command.test.ts`

### 付随ドキュメント

- このPlan以外の設計文書、ADR、schema更新は不要。

## 9. 備考

- branchは`main`から作成する。
- Plan作成時に確認した`main`の最新commitは`f6727303da97f3b4b81777472a305ed5c3860410`。
- Issueの症状は後段status判定の欠陥ではなく、PowerShell関数のoutput streamとexit codeを分離していないverify起動境界にある。実装では後段へcastや配列判定を追加せず、原因箇所で修正する。
- 今回はPlan保存までとし、実装、PR作成、mergeは行わない。
