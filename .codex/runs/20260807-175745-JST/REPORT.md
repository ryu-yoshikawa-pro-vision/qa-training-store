# Report (append-only)
- 行動のたびに追記する（調査/編集/判断も含む）
- コマンドや確認結果は必ず記録する

## Evidence Record (optional)
- Record ID:
- Round:
- Query:
- Source:
- Supports/Refutes:
- Confidence:
- Decision:
- Rationale:
- Open Issues:
- Next Action:

## YYYY-MM-DD HH:MM (JST)
- Summary:
- Completed:
- Changes:
- Commands:
  - `...` => result
- Notes/Decisions:
- New tasks:
- Remaining:
- Progress: NN% (done/total)

## Deletion candidates
- Codex はファイルやディレクトリを削除しない。
- 不要に見えるファイルは、ユーザーが手動確認できるようにここへ記録する。

| Path | Reason | Suggested action |
|---|---|---|
|  |  |  |

## 2026-08-07 18:10 (JST) — 既存失敗の照合と再発防止方針

- Summary: 添付指示を読み、既存Run、関連Native機械証跡、Native Runbook、Skill、wrapper、Repair／Harness referenceを照合した。今回のRunではAndroid Build／Install／Maestro／Remote CIを再実行しない。
- Completed: 主要な失敗を14件、時系列・分類・根本／派生エラー・対応・再実行結果へ整理し、`docs/history/2026-08-07_local-build-failure-prevention.md`へ保存した。実行前preflight、仮説、停止、attempt別ログ保存をRunbook／Skill／PROJECT_CONTEXTへ反映した。
- Subagents: `code_researcher`、`test_investigator`、`implementation_researcher`をread-onlyで使用した。前者はRunbook／README／wrapperの既存ゲートと不足、test investigatorは過去Run／artifactの失敗表、implementation researcherは正本文書の配置とStrict候補の分離を調査した。全員編集なし。結果を採用し、runnerの自動変更は別候補へ分離した。

## ローカルビルド失敗の振り返り

### 発生した失敗

- 2026-08-06のPowerShell wrapper引数衝突、Native Status可視性、Virtual Store由来の古いCMake／Ninja参照、formal Maestroの検索カード未検出、Boundaryのoffscreen selector、format scope、isolated dependency解決が発生した。
- 2026-08-07にはtypecheckのimplicit-any、Native Jest worker競合、システムドライブ空き約28MBでのNative `.so` copy失敗、画面外のCart追加成功メッセージ可視性失敗、実機IME入力経路差、wrapper path typoが発生した。
- 詳細な時系列表は[`docs/history/2026-08-07_local-build-failure-prevention.md`](../../docs/history/2026-08-07_local-build-failure-prevention.md)の`## ローカル実行失敗履歴`にある。終了コードやShell Versionが保存されていない過去項目は未記録とした。

### 原因分類

- `ENVIRONMENT_FAILURE`: ホスト空き容量不足。
- `DEPENDENCY_FAILURE`: isolated Virtual Storeでのvitest／Jest依存解決。
- `CONFIGURATION_FAILURE`: wrapper引数衝突、formatter除外不足、wrapper path typo。
- `SOURCE_FAILURE`: 6件のimplicit-any。
- `BUILD_CACHE_FAILURE`: `.pnpm-local`／Autolinkingの古い参照。
- `DEVICE_FAILURE`: 実機IME／Maestro CLI入力経路差。
- `TEST_FAILURE`: Native Status、商品カード／Boundary selector、画面外Cartメッセージ。
- `TRANSIENT_FAILURE`: Native Jest worker競合。外部障害の証拠がない項目をこの分類へ寄せていない。
- `UNKNOWN`: 終了コード・完全ログ不足の項目は、原因が確定していない部分を未記録として残した。

### 根本原因

- 失敗の原因は単一ではなく、環境容量、依存解決、生成状態、入力経路、UI可視性、テスト資源、型契約に分かれていた。
- 一部の実行では、Build前の環境確認、前回失敗の比較、attempt単位のログ分離が不足していた。同一RunIdでBuildログを再利用したため、低容量失敗の生ログが現在の成功ログで上書きされた可能性がある。
- `BUILD FAILED`、APK不存在、Install失敗、Maestro停止は根本原因ではなく、上流失敗からの派生エラーとして分離した。

### 無効だった試行

- 条件・コード・設定を変えない同一Build／Flowの再実行。
- 空き容量不足のままのBuild、Cache削除やDaemon停止だけの反復、古いAutolinking確認前の`gradlew clean`。
- timeout／retry延長、固定Sleep、Assertion削除、Flow skip、CI Allow failureによる成功扱い。
- 検索IMEの失敗を主要Runtimeへ戻すこと、MCP成功だけでformal CLI成功と扱うこと。

### 有効だった試行

- 失敗時の最初の異常とHierarchy／Screenshot／logcat／JUnitを突合し、wrapper修正、依存再リンク、`expo prebuild --clean`、安定ID／scroll、入力Flow分離、型注釈、worker設定を一つずつ検証した。
- 容量確保後に正式wrapperでBuild／APK／Install／Smoke／Controlを再確認し、修正APKでRuntime 5/5、Persistence個別2/2、Boundary個別3/3、Boundary 5/5と`pnpm run verify` exit 0を確認した。

### 成功条件

- preflightでToolchain／SDK／ADB／容量／APK／appId／Profile／CI差異が把握されていること。
- 正式wrapperでRelease APKを生成し、APK／ABIを確認後にInstall、Smoke、Control、単体Flow、Runtime、Boundaryの順で進むこと。
- 検索専用Flowは制御IME条件で実行し、主要Runtime／BoundaryはDeep LinkでIMEへ依存させないこと。
- 実行ごとに一意なattempt-idと完全ログを持ち、Remote CI未確認をPASSと記録しないこと。

### 再発防止策

- Runbook 5.1.1とNative Skillに、指定preflight、仮説テンプレート、一変数原則、ユーザー分類、根本／派生エラー、停止条件を追加した。
- `.artifacts/native-local/<attempt-id>/`への完全ログ保存と、Run Artifactへ要約・相対参照だけを残す規約を追加した。同一RunIdで失敗証跡を上書きしない。
- 反復失敗、preflight不足、attempt別ログ上書きはHarness candidateへ記録し、runner／safety変更を今回の文書修正へ混在させない。
- 品質ゲートの範囲外に見えるエラーも、Baseline／差分／共有依存／環境との因果を確認し、現在の変更に影響する場合は最小修正と関連ゲート再実行を行う既存方針を維持する。

### 次回実行時の事前確認

1. 直近Run、失敗ログ、変更差分、Shell、Version、環境変数、APK、成功条件を読む。
2. `node --version`、`pnpm --version`、`java -version`、`javac -version`、`adb version`、`adb devices`、環境変数、`Get-Command`、`Get-PSDrive -Name C`、`android\gradlew.bat --version`を同一Shellで実行する。
3. 目的・仮説・一つの変更条件・成功条件・失敗時の次情報を記録する。
4. 同一エラー2回連続、同じ工程3回失敗、最初のエラー不変、新しいログなし、APKなし、仮説なしなら再実行せず、調査へ戻る。

### エージェント自身の進め方の評価

- 改善点: 以前の実行では、環境容量・Virtual Store・IME・可視性の確認をBuild／Flowの前に固定せず、同じ入口を複数条件で実行し、後から原因を分離する場面があった。RunId再利用によるログ上書きリスクも残った。
- 反映した行動規則: 以後は新規実行前に履歴と差分を読み、preflightと仮説を先に記録し、上流失敗で停止し、一回の検証で変更する条件を限定する。無目的な再試行はしない。
- 判定: 文書・Run Artifactの再発防止は今回の範囲で完了候補。runnerの自動preflight／attempt隔離とRemote CIの修正後結果は未完了として別管理する。

### Evidence

- `Get-Content`／`Select-String`で過去3 RunのREPORTと関連artifactを照合した。
- `docs/native/windows-android-local-validation.md`、`.agents/skills/android-native-local-validation/SKILL.md`、`docs/native/README.md`、`docs/PROJECT_CONTEXT.md`、`docs/reference/repair-loop.md`、`docs/reference/harness-improvement-loop.md`へ文書変更を行った。
- 今回はAndroid Build／Install／Maestro／Remote CIを実行していない。後続の文書・JSON・差分・Sanitizer検証を行う。
- Progress: 3/6 (50%)

## 2026-08-07 18:20 (JST) — 文書・JSON・差分検証

- `ConvertFrom-Json`で`run.json`と`evaluation.json`を読み込み => PASS。
- `rg`でpreflight、仮説、ユーザー分類、attempt-id、失敗履歴、harness candidateを確認 => PASS。
- 個人PC固有の絶対Path（`<USER_HOME>`等）を対象文書／現在Runから検索 => 該当なし。
- `git diff --check`（対象変更）=> exit 0。CRLF変換に関するGit warningのみで、whitespace errorはなし。
- `pnpm exec prettier --check`（対象13ファイル）=> PASS。
- 最初のPrettier確認はPowerShell配列が1つの連結引数として渡り、`No files matching the pattern`で失敗した。ファイルを明示列挙して同じ確認を再実行し、PASSした。これは文書検証コマンドの引数渡し失敗であり、Android Build／Test失敗ではない。
- 既存Run Sanitizer: `scripts/sanitize-codex-artifacts.ps1 -Path .codex/runs/20260807-175745-JST -Write -Check` => `files_scanned: 5`、`files_changed: 0`、`residual_findings: 0`。
- Progress: 5/6 (83%)

## 2026-08-07 18:25 (JST) — 完了判定

- 最終Sanitizerは、直前のREPORT追記に含まれていたユーザーPath表記を`<USER_HOME>`へ置換し、`files_scanned: 5`、`files_changed: 1`、`replacements_total: 1`、`residual_findings: 0`となった。これは意味を変えない安全性修正である。
- その後のJSON再読込、対象文書のPrettier、絶対Path検索、`git diff --check`はPASSした。
- 文書化・Run Artifact・評価・Sanitizerの今回タスクは完了。低容量Buildの完全な初回生ログは同一RunIdの後続成功ログで上書きされた可能性があり、復元できないため、履歴では未記録／REPORT要約を根拠として明示した。
- 未確認: Remote CIの修正後Run、runnerへの自動容量preflight／attempt隔離実装。これらは今回のスコープ外であり、evaluationのproposed candidateとして残した。
- Progress: 6/6 (100%)
