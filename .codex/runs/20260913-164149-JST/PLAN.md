# Plan

## Objective

- 指定Plan `docs/plans/2026-09-13_104947_issue-145-codex-task-verify-exit-code.md` を正本として、`codex-task.ps1` のverify起動時に標準出力とexit codeが混在する問題を原因箇所で修正する。
- 実装後、Windows固有runtimeとmanifest付きfull-wrapperを含む指定検証を通し、commit・push・PR #148更新・最新headの必須CI確認まで完了する。

## Scope

- In:
  - `scripts/codex-task.ps1` の `Invoke-NativeCommand()` への `[AllowEmptyCollection()]` 追加。
  - `Invoke-VerifyCommand()` の `.ps1`、`.cmd`、`.bat`、`.sh`、default、command textの外部起動を既存helperへ統一。
  - `tests/contracts/codex-task-native-command.test.ts` のsource/runtime/full-wrapper contract拡張。既存fixtureと`runWrapper()`を優先してパラメータ化する。
  - Windows + `powershell.exe` + Python + Gitでのmanifest付きsuccess/failure、および対応runtimeの全経路確認。
  - Run Artifact、ローカル検証、commit、明示refspec push、PR本文、Web CI/Mobile App CI確認。
- Out:
  - `report.verify_exit_code`以降のcast・配列対策、collector、sanitizer、manifest schema、CI workflow、training関連コードの変更。
  - `codex-task.sh`、preflight、`Write-RunManifest()`のcross-platform化、新しいproduction wrapper/test utility/dependency。
  - command text内のnative child process終了コード伝播仕様の追加。
  - merge/close/force push/branch削除。

## Assumptions

- 現在branchは指定branchで、最新`origin/main`をすでにmerge済み。最新main fetch後に対象差分へ影響する追加変更がないことを確認する。
- test用固定RunIdは `20990101-000000-JST` とし、full-wrapperでは `-SkipPreflight` を指定し、`-SkipVerify` は指定しない。
- manifest fixtureはproduction sourceのcollector/sanitizer関連4ファイルをコピーし、rootを`git init`する。fixture用commit/remoteは作らない。
- Windows固有経路が実行できない環境ではskipを許容するが、今回の完了判定では利用可能なWindows環境でskipされずPASSすることを確認する。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。ユーザー指示と正本Planに対象、非対象、検証、完了条件が明記されている。
- 仮定してよい細部: verify fixtureの非0終了値はPlanどおり`7`とする。
- 未回答の重要質問: なし。

## Hypotheses

- H1: verify各経路を既存`Invoke-NativeCommand()`へ委譲すれば、`Out-Host`により出力を可視化したまま戻り値を単一`System.Int32`へできる。
- H2: command textのsuccess/failureをfake Codex成功`0`、verify自身`0`/`7`、manifest付きfixtureで実行すれば、後段status/validation/manifestとwrapper process exitの回帰を再現できる。

## Research Plan

- Round 1 Query: 入口資料、最近のADR、最近Run、Plan、branch/PR状態、最新`origin/main`との差分を確認する。
- Round 2 Query: `codex-task.ps1`の対象関数、既存contract test、manifest writer/collector/sanitizerのfixture前提、Windows runtime可用性を確認する。
- Exit Criteria:
  - H1/H2を対象source、targeted test、full-wrapper testで支持できる。
  - 変更ファイルが正本Planの2ファイルと標準Run Artifactに限定される。
  - targeted contract、全contract、`verify`、`git diff --check`、Windows固有検証、push後必須CIが完了する。

## Approach

1. 最新mainをfetchし、branch/PR/HEAD/merge baseと作業差分を再確認する。
2. Planどおりproductionを最小変更し、後段status処理には触れない。
3. 既存test file内でhelper/fixtureをパラメータ化し、全verify経路のsource/runtime contractとcommand text full-wrapper success/failureを追加する。
4. targeted → contract全体 → repository verify → diff/scope → sanitizerの順で検証する。失敗時は最初の異常を分類して最小修正後に関連ゲートを再実行する。
5. Run Artifactをfinal commit前状態へ更新してsanitizer確認後、branch safetyを再確認し、commit・明示refspec push・PR本文更新・最新head CI確認を行う。

## Definition of Done

- `Invoke-VerifyCommand()`の全6経路が`Invoke-NativeCommand()`経由で、stdout/stderrの可視性とscalar exit codeを保つ。
- command text full-wrapper success/failureが、`verify_exit_code`、report status、wrapper exit、manifest status/validationをPlan値どおり満たす。
- Windows固有の`.ps1`/`.cmd`/`.bat`/command text runtimeとmanifest付きfull-wrapper 2ケースがskipされずPASSし、`.sh`/defaultも利用可能runtimeで確認できる。
- 指定ローカル検証、Run Artifact sanitizer、commit/push、PR #148 OPEN維持、最新headの`Web CI`/`Mobile App CI` success確認、PR本文へのCI結果記録が完了する。

## Risks / Unknowns

- `Write-RunManifest()`が`powershell.exe`固定のためmanifest testはWindows依存。cross-platform化せずWindows条件で検証する。
- PowerShellの`PSNativeCommandUseErrorActionPreference`境界がverify非0を例外化しないことをsuccess/failure runtimeで確認する。
- full-wrapper fixtureのcollector/sanitizer不足、`git init`不足、無効RunIdはverify原因と無関係な失敗を作るため、Planのfixture構成を固定する。
- push後CI failure時は、最新headのfirst anomalyを調査し、必要なら新commitを作って再確認する。merge/force pushは行わない。

## Thinking Log

- 2026-09-13 16:41 JST: strict implementation Run `20260913-164149-JST` を正規scriptで初期化した。指定branchでworking treeはclean、PR #148はOPENだった。
- 2026-09-13 16:42 JST: `git fetch origin main`後も`origin/main=b7499a6`。branchは現行mainに対して5 commit ahead/0 behindで、対象差分は指定Plan追加のみだった。
- 2026-09-13 16:44 JST: Windowsで`powershell.exe`、`pwsh`、Python、Git、bash、Node、pnpmを確認。変更前targeted contractは3 tests PASSだった。
