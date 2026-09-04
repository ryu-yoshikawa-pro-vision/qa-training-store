# codex-task.ps1 native command出力とexit code分離計画

## 0. 依頼概要

- 依頼内容: Issue #101「fix: codex-task.ps1 のnative command出力とexit codeを分離する」を実装し、回帰テスト、検証、commit、push、Pull Request作成まで行う。
- 背景: `Invoke-NativeCommand` のnative stdoutと`return $LASTEXITCODE`がPowerShellのsuccess streamへ混在し、呼び出し側の`codex_exit_code`が`System.Object[]`になる。
- 期待成果: stdout／stderrの可視性とstreaming性を保ったまま、host／docker-sandbox共通のexit code契約とreport保存をscalarな数値へ修正する。

## 1. ゴール / 完了条件

- ゴール: `Invoke-NativeCommand` がnative commandの出力を呼び出し側のsuccess outputから分離し、exit codeだけをscalarな数値として返す。
- 完了条件（DoD）:
  - stdoutあり・exit 0とstdoutあり・non-zeroの両方で、stdout／stderrが可視である。
  - 関数戻り値が`System.Int32`の単一値で、stdout文字列を含まない。
  - 実際の`codex-task.ps1` host経路でreport JSONの`codex_exit_code`が数値になり、成功／失敗判定が維持される。
  - host／docker-sandboxが同じ`Invoke-NativeCommand`を使い、既存の終了処理を維持する。
  - focused test、`scripts/verify.ps1`、contract suite、可能な`pnpm run verify`、`git diff --check`が実行結果付きで記録される。
  - Run ArtifactをsanitizerのWrite／Checkで検証し、指定branchへcommit／pushしてmain向けOPEN・非Draft PRを作成する。

## 2. 現状理解と前提

- Current understanding:
  - 現在のbranchは`fix/codex-task-native-command-output-exit-code`で、開始時working treeはcleanだった。
  - Issue #101はOPENで、対象は`scripts/codex-task.ps1`と必要最小限の回帰テストである。
  - `Invoke-NativeCommand`はhostとdocker-sandboxの両方から呼ばれ、現在は`& $Command @CommandArgs`の後に`return $LASTEXITCODE`を実行している。
  - 修正前の最小再現では、stdout `repro-stdout`と`0`が同じsuccess streamに流れ、代入結果が`System.Object[]`（2要素）になった。
  - `& ... | Out-Host`を使う候補は、stdout／stderrを表示し、exit 0／7の双方で`System.Int32`の単一値を返した。全量bufferingは発生しない方式である。
  - reportはhost／dockerの共通関数の戻り値を`$report.codex_exit_code`へ代入し、その後non-zero判定とJSON書き込みへ渡す。
- Assumptions:
  - deterministicなnative commandを使うcontract testは、利用可能なPowerShell runtimeで実行し、PowerShellがない環境では既存repo方針に従って明示的にskipする。
  - 実Codex CLIや実Docker imageは、deterministic testと静的経路確認で契約を検証できるため使用しない。
  - `Out-Host`へのパイプはPowerShellのhost表示を維持し、success outputだけを消費するため、stderrは既存のerror stream経路に残る。
- Non-goals:
  - PR #100のHook実装、Codex Hook logging、`.codex/hooks/**`、Hook command設定。
  - `scripts/codex-task.sh`、`scripts/codex-safe.ps1`、Codex CLI自体。
  - `Start-Process`等への置換、wrapper全体の再設計、無関係なPowerShell refactor。
  - stdout／stderrの抑制、Codex出力の全量buffering。

## 3. 質問 / 曖昧性

- 必ず質問する不透明点: なし。Issueの期待結果、対象branch、PRのbase、commit messageが指定済み。
- 仮定してよい細部: 回帰テストは既存の`tests/contracts/**`へfocused testを追加し、Windows／UnixのPowerShell executableを環境に応じて選択する。
- 未回答の重要質問: なし。

## 4. 影響範囲

- Impacted areas:
  - PowerShell native commandのsuccess output境界。
  - `codex_exit_code`、`codex_exec_exit`、non-zero終了、report JSON。
  - host／docker-sandboxの共通呼び出し契約。
  - Codex wrapper contract validation。
- Files to inspect:
  - `scripts/codex-task.ps1`
  - `tests/contracts/**`
  - `scripts/verify.ps1`
  - `package.json`
  - `.github/workflows/ci.yml`
  - `docs/reference/codex-implementation-harness.md`
  - `docs/reference/run-artifacts.md`

## 5. 変更方針

- Change strategy:
  1. `Invoke-NativeCommand`内部のnative invocationを`Out-Host`へ接続し、stdoutをuser-visibleなhost出力として消費する。続く`$LASTEXITCODE`のreturn、`PSNativeCommandUseErrorActionPreference`の復元、関数の引数・呼び出し側は維持する。
  2. production functionを実際に読み込んだdeterministic PowerShell probeでexit 0／non-zero、stdout／stderr可視性、戻り値型・値・混入なしを検証する。
  3. 実際の`codex-task.ps1`を一時fixtureで実行し、fake native Codex commandのstdout／stderrとexit codeをhost経路へ渡してreport JSONの数値型と成功／失敗状態を検証する。docker側は同じ関数の静的経路を確認する。
  4. focused testからfull contract／verifyへ順に実行し、失敗時は最初の異常を調査して最小修正後に関連gateを再実行する。
  5. 差分とnon-goalをself-reviewし、Run Artifactをsanitizeしてからbranch safetyを再確認し、commit／明示refspec push／日本語PR作成・確認を行う。
- 実行タスク:
  - [ ] 1. `Invoke-NativeCommand`の最小実装を修正する。
  - [ ] 2. stdout／stderr visibility、scalar exit code、exit 0／non-zero、report contractの回帰テストを追加する。
  - [ ] 3. focused testとPowerShell wrapper validationを実行する。
  - [ ] 4. contract suite、repository verify、diff／scope／sanitizerを確認する。
  - [ ] 5. self-review、commit、push、PR作成と最終確認を行う。

## 6. 検証方法

- Validation plan:
  - 修正前後のPowerShell最小再現結果を比較し、修正前の`System.Object[]`原因と修正後の`System.Int32`を確認する。
  - `pnpm exec vitest run tests/contracts/codex-task-native-command.test.ts --no-file-parallelism --maxWorkers=1`を実行する。
  - `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/verify.ps1`を実行する。
  - `pnpm run test:contracts`を実行する。
  - 可能なら`pnpm run verify`を実行し、`git diff --check`も確認する。
  - `scripts/sanitize-codex-artifacts.ps1 -Write`と`-Check`をRun Artifactへ実行し、residual 0を確認する。
- 成功判定:
  - focused testで両exit caseとreport contractがPASSし、stderr／stdoutのmarkerが各streamで確認できる。
  - wrapper／contract／repository gateがPASSする。実行不能なgateはSKIPとして理由と結果を記録し、PASS扱いしない。
  - 最終PRのbaseが`main`、headが指定branch、stateがOPEN、Draftでなく、本文に`Closes #101`と実測Root Cause／Validation／Non-goalsがある。

## 7. リスクと未解決論点

- Risks:
  - `Out-Host`の採用でstderrやstreamingが変わる可能性があるため、Windows PowerShellとPowerShell Coreでnative stdout／stderrを個別に観測する。
  - PowerShell runtimeがない環境ではdynamic testを実行できないため、static contractとSKIP理由を分離して報告する。
  - Run ArtifactにOS固有の絶対pathが残る可能性があるため、完了前にsanitizerのWrite／Checkを行う。
  - 実Docker／実Codexを使わないため、docker実行そのものではなく共有関数・静的経路で契約を確認する。
- Open questions: なし。

## 8. 成果物

- 変更ファイル:
  - `scripts/codex-task.ps1`
  - `tests/contracts/codex-task-native-command.test.ts`
  - `.codex/runs/20260904-204300-JST/` の標準Run Artifact
- 付随ドキュメント:
  - 本計画書。Issue #101の範囲でPROJECT_CONTEXT／ADRの追加変更は、既存の設計判断を変えないため不要と判断する。

## 9. 備考

- 2026-09-04 JST: 修正前最小再現で`System.Object[]`を実測し、IssueのStop conditionには該当しないことを確認した。
