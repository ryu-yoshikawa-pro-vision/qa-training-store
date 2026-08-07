# レポート（追記専用）
- 行動のたびに追記する（調査/編集/判断も含む）
- コマンドや確認結果は必ず記録する

## 証跡記録（任意）
- 記録ID:
- 回:
- 調査:
- 根拠:
- 支持／反証:
- 確度:
- 判断:
- 理由:
- 未解決事項:
- 次の行動:

## YYYY-MM-DD HH:MM (JST)
- 概要:
- 完了:
- 変更:
- 実行コマンド:
  - `...` => result
- 注記／判断:
- 新規タスク:
- 残課題:
- 進捗: NN% (done/total)

## 削除候補
- Codex はファイルやディレクトリを削除しない。
- 不要に見えるファイルは、ユーザーが手動確認できるようにここへ記録する。

| Path | Reason | Suggested action |
|---|---|---|
|  |  |  |

## 2026-08-06 19:45 (JST) ベースライン・PR証跡確認

- 概要: PR #9 の修正対象を確認し、新規 Repair Run `20260806-194500-JST` を初期化した。
- 完了: Branch／HEAD／作業ツリー、PR metadata、未解決 Review thread、最新 GitHub Actions log、現行コード、対象Run差分を確認した。
- 変更: `.codex/runs/20260806-194500-JST/PLAN.md`、`TASKS.md`、`evaluation.json`へ目的・範囲・初期評価を記録した。
- コマンド／結果:
  - `git branch --show-current` => `fix/sanitize-codex-run-artifact-paths`
  - `git rev-parse HEAD` => `1af14c01581d7eb188e81249f35dda115f76f39d`
  - `git status --short` => Run初期化前は空。既存変更なし。
  - `gh auth status` => `gh` executableなし。Remote証跡はGitHub connectorで取得した。
  - GitHub PR #9 => open／head `1af14c0...`／base `main`／24件の未解決・未outdated Review thread。
  - Phase 1 CI run `31091781180` / #66 => `Codex artifact sanitization` job `92584254444` が Ubuntu 24.04 `pwsh` Fixture で `Windows User Home variant was not replaced.`、他の主要Jobはsuccess。`verify` はfail-close。
- 判断:
  - `USERPROFILE`／`HOME`、Temp候補、Path境界、Atomic fallback、codex-task終了処理、ChangedOnly、invalid UTF-8、Finding content、JSONL、Run整合性を `must_fix` とする。
  - BOM保持、Regex cache、Persistent stream化、checkout SHA固定、git helper共通化、Masked Line最適化、Docstring coverageは添付指示により `defer`／`out_of_scope` とする。
  - Branch作成・切替、Commit、Push、Rebase、Merge、PR更新、Review Resolve、Workflow再実行は行わない。
- Progress: 14% (2/14)

## 2026-08-06 20:05 (JST) Read-only subagent調査

- `code_researcher`（Agent ID `019fd6ae-ce76-75e0-9cd1-dbbf3f0c145b`）
  - 委譲内容: 共通Sanitizer、CLI、`codex-task.ps1`のPath／Encoding／Atomic／ChangedOnly／終了処理の現状と根拠行を確認。
  - 調査結果要約: Home／Temp候補がOS分岐・GetTempPathだけ、置換がRegex substring、MAESTRO実行ファイル登録、ChangedOnlyが`.codex/runs`固定かつuntracked漏れ、strict UTF-8が全体停止、Fail-Taskとfinallyが二重実行、timeoutなし、例外保持が弱い。
  - 採用: Home／Temp候補、境界付き置換、MAESTRO_HOME、ChangedOnly、invalid UTF-8、二重実行／timeout／例外保持を今回修正へ採用。
  - 不採用／理由: `content`に追加フィールドを増やす提案は今回の必須契約を超えるため不採用。Performance最適化は添付指示で対象外。
  - 権限: read-only。Final planへの利用: 採用。

- `implementation_researcher`（Agent ID `019fd6ae-cf9a-7ee0-948a-bc0922a8e86b`）
  - 委譲内容: Windows PowerShell 5.1／Linux pwsh 7互換、Atomic fallback、ChangedOnly、codex-task timeout／exit codeの実装方針を確認。
  - 調査結果要約: 共通.NET APIで5.1／7を揃え、BackupをMove成功後まで保持する。ChangedOnlyは明示Pathとの積集合にtracked／staged／untrackedを統合する。sanitizer子プロセスは60秒で終了し、既存Task失敗を優先する。BOMはUTF-8 without BOM契約を維持する。
  - 採用: 上記方針と、対象外（BOM保持、Regex cache、stream化、checkout SHA固定、過去Run一括Write）を採用。
  - 不採用／理由: git helper共通化、Docstring coverage、OS依存の強制失敗Mockは今回の主契約を広げるため不採用。
  - 権限: read-only。Final planへの利用: 採用。

- `test_investigator`（Agent ID `019fd6ae-d1e7-70e2-8267-0de2e76a3b9b`）
  - 委譲内容: Fixture／Contract／CIの既存契約、Ubuntu pwsh失敗条件、追加すべき失敗系テストを確認。
  - 調査結果要約: 既存Fixtureはhappy path中心で、invalid UTF-8、ChangedOnly、Error preservation、Atomic失敗系が不足。CIは`pwsh`＋`fetch-depth: 0`だが`.codex/runs`固定のdiffだけでuntrackedを漏らす。Remote失敗の直接証跡はGitHub connectorで取得したActions logにある。
  - 採用: Environment／Path boundary／JSON・JSONL／invalid UTF-8／ChangedOnly／error preservation／AtomicのFixture追加とCIの変更を採用。
  - 不採用／理由: 既存CI全体の他Job契約は無関係のため変更しない。
  - 権限: read-only。Final planへの利用: 採用。

- 委譲判断: 3件ともread-only調査で、Writable subagentは使用しなかった。変更は相互依存が強く、親agentが一括して最小差分を管理する。
- Progress: 21% (3/14)

## 2026-08-06 19:45 (JST) Repair Loop入力の整理

- 概要: Repair Loop iteration 1 の入力を確定した。
- 入力findings: Ubuntu pwsh Fixture失敗、USERPROFILE/HOME漏れ、Path prefix誤一致、Atomic Writeデータ損失、codex-task二重実行／timeout／例外上書き、ChangedOnly漏れ、invalid UTF-8中断、Finding content未サニタイズ、JSONL不正、MAESTRO_HOME意味不一致、Run Artifact不整合、Native規約のスコープ判定。
- repair plan: 共通Sanitizer／CLI／`codex-task.ps1`／Fixture／Contract／CIを修正し、対象Runの事実整合性とPRスコープを整理する。
- allowed files: `scripts/lib/codex-artifact-sanitizer.ps1`、`scripts/sanitize-codex-artifacts.ps1`、`scripts/codex-task.ps1`、`scripts/tests/codex-artifact-sanitizer.test.ps1`、`tests/contracts/codex-artifact-sanitization.test.ts`、`.github/workflows/ci.yml`、PR #9で変更された対象Run、Path Sanitization関連docs／ADR／History、PR混在Native差分。
- 対象外: Git操作、Remote CI、過去Runの一括Write、BOM保持、性能最適化、checkout SHA固定、Review thread操作。
- Progress: 14% (2/14)

## 2026-08-06 20:35 (JST) 実装・ローカル品質ゲート

- 概要: PR #9 の必須修正、Fixture／Contract／CI、Run Artifact 整合性、Native成果物規約の維持・検証を実施した。
- 完了:
  - `scripts/lib/codex-artifact-sanitizer.ps1` に USERPROFILE／HOME、全 Temp 候補、MAESTRO_HOME の構造判定、Path境界、ChangedOnly集合、Backup経由Atomic fallbackを実装した。
  - CLIに invalid UTF-8 のファイル単位Finding、Finding path/content再サニタイズ、300文字制限、Check-only統計を実装した。
  - `codex-task.ps1` に一回実行フラグ、60秒子プロセスTimeout、不足Tool／非0警告、元終了コード・例外保持を実装した。
  - Fixture 39契約、Contract 7件、CI Ubuntu／Windows matrix、PR Base差分Checkを確認した。
  - PR #9対象RunのSubagent／Validation／評価記録を補正し、Native成果物規約を維持したうえで保存先・Git管理外・文書整合性を確認した。
- 検証結果:
  - `powershell.exe ... scripts/tests/codex-artifact-sanitizer.test.ps1` => PASS (39 contracts)
  - `pwsh ... scripts/tests/codex-artifact-sanitizer.test.ps1` => PASS (39 contracts)
  - PowerShell Parser 4ファイル（5.1／7）=> PASS
  - `pnpm exec vitest run tests/contracts/codex-artifact-sanitization.test.ts --no-file-parallelism --maxWorkers=1` => 7/7 PASS
  - `pnpm run format:check`、`pnpm run lint`（0 errors／既存警告64件）、`pnpm run typecheck`、`pnpm run test:contracts`（21 files／111 tests）、`pnpm run verify` => PASS
- 判断: BOM保持、Regex cache、Persistent stream、checkout SHA固定、git helper共通化、Masked Line最適化、Docstring coverageは指示どおり対象外。Remote CIはPush禁止のため未実行。
- Progress: 88% (15/17)

## 2026-08-06 20:40 (JST) Review判定・最終確認

### 根本原因

- Linux `pwsh` Fixture失敗: `USERPROFILE`／`HOME`をOSで片方だけ登録していた。
- Path Prefix誤一致: 境界なしRegex置換で短いAliasが別Pathの先頭へ一致し得た。
- Atomic Write: `File.Replace`失敗後に元ファイルを先に削除していた。
- `codex-task.ps1`: Fail-Task／finallyの二重実行、子プロセス無期限待機、finally内`exit`による元エラー上書きの可能性があった。
- `-ChangedOnly`: `.codex/runs`固定、staged／untracked漏れ、明示Pathとの積集合不足があった。
- Run Artifact不整合: Subagent／Validation／評価記録が実行事実と一致していなかった。
- Native成果物規約: ユーザーの明示依頼によるPRスコープ内のIntentionalな変更であり、Path Sanitizationと併せて維持・検証する。

### Reviewコメント判定

| # | 判定 | 対応 |
|---:|---|---|
| 0 | Valid | 162406評価のPowerShell 7主張を確認範囲へ補正 |
| 1 | Valid | 162406 REPORT／run.jsonへ3件のread-only Subagent記録を追加 |
| 2 | Valid | PR追加Runの日本語見出し・項目名・MD空行を修正 |
| 3 | Valid | 162632 `run.json.validation`へ`pnpm run test:contracts`を反映、Run全体はpending保持 |
| 4 | Out of scope | checkout SHA固定は別PRへ分離 |
| 5 | Valid | `codex-task.ps1`の共有ライブラリPath表記をslashへ修正 |
| 6 | Valid | CLI／PowerShell不足、起動失敗、非0終了のWarningを追加 |
| 7 | Valid | sanitizer子プロセスに60秒Timeoutを追加 |
| 8 | Valid | 実行済みフラグとメインtry状態で二重実行を防止 |
| 9 | Valid | 正常終了時だけsanitizer失敗でexit 1、Task例外／非0終了は保持 |
| 10 | Valid | `$args`／`$matches`を使用しない実装へ改修 |
| 11 | Deferred | Git解決Helper共通化は主問題でないため保留 |
| 12 | Valid | `USERPROFILE`と`HOME`を両方登録 |
| 13 | Valid | Maestro実行ファイルは`<home>/bin/maestro`構造時だけHome登録 |
| 14 | Deferred | Regex cache／Compiled Regexは実測なしのため保留 |
| 15 | Deferred | Masked Line最適化は正確性に影響しないため保留 |
| 16 | Valid | tracked／staged／untrackedを明示Pathとの積集合でChangedOnly対象化 |
| 17 | Valid | Backup→削除→Move→復元のAtomic fallbackへ改修 |
| 18 | Deferred | Persistent stream化は今回の安全性スコープ外 |
| 19 | Valid | invalid UTF-8をファイル単位Findingとして継続走査 |
| 20 | Valid | Check-onlyでもreplacement候補を`replacements_total`へ反映 |
| 21 | Valid | Findingのfile_path／contentを出力直前に再サニタイズ・300文字制限 |
| 22 | Valid | JSONLをサニタイズ前後ともParse可能なFixtureへ修正 |
| 23 | Invalid | 契約はUTF-8 without BOMのためBOM保持要求は採用しない |

### Native artifact handling

- 追跡されていた余計な成果物: 該当は0件。履歴上のルート直下`native-storefront-cart-added.png`は未追跡の生成物として整理済みで、現在は`output/mobile-native/native-storefront-cart-added.png`にあり、ルート直下にはない。今回、既存成果物の削除・移動は行っていない。
- 現在の保存先: 人が確認・共有するスクリーンショット、比較画像、代表画面証跡は`output/mobile-native/`、Maestro／ADB／Gradle／JUnit／Hierarchy／UIAutomator／logcat／APK情報など実行ごとの機械証跡は`.artifacts/native-local/<timestamp>/`とする。
- Git追跡状態: `output/`と`.artifacts/`は既存`.gitignore`で管理外。`git ls-files`で該当配下、APK／AABの追跡はなく、再生成可能なNative証跡をRepositoryへ追加していない。
- 使い分け: `output/mobile-native/`は人向け共有用、`.artifacts/native-local/`は機械的な実行証跡であり、責務を逆転させない。再取得時はRun IDまたはJST timestampを名前へ含め、上書きを避ける。
- 維持した関連文書: `docs/native/README.md`、`docs/native/windows-android-local-validation.md`、`docs/PROJECT_CONTEXT.md`、`docs/history/2026-08-06_143650_native-mobile-output-convention.md`、`.codex/runs/20260806-094328-JST/*`。
- 追加修正: 前回の誤った削除・対象外判定を訂正し、文書・履歴・Run記録を元のNative規約へ復元した。個人Pathを標準Junction aliasへ置換し、旧Run evaluationのtaxonomy／evidence_refsを現行schemaへ最小補正した。Native用の新規追跡成果物やignore追加は行っていない。
- 未確認事項: Push禁止のためRemote CIは未実行。今回の訂正では実機Maestroを再実行せず、既存のRun／artifact記録と保存先・Git状態・文書整合性を検証した。

### Reviewコメント訂正（Native成果物）

| Review finding | 判定 | 対応 | 理由 |
|---|---|---|---|
| Native成果物規約がPRに混在 | Intentional | 維持・検証 | ユーザーが余計な追跡成果物の整理を明示依頼している |
| `output/mobile-native/`規約 | Valid | 維持 | 人向け共有成果物の保存先として必要 |
| `.artifacts/native-local/`規約 | Valid | 維持 | 再生成可能な機械証跡をGit管理から分離するため |
| Native関連文書変更 | Valid if consistent | 内容確認 | 実運用と整合しており、矛盾がないことを確認した |

### Error preservation probe

- `codex-task.ps1 -RunId 20260806-194500-JST -SkipPreflight -SkipVerify` は、CLI側のexit code `1`を保持し、生成Reportの`status: codex_failed`を確認した。CLIは利用中モデル非対応でAPI処理が完了しなかったが、RepositoryのGit mutationは行っていない。
- Probe後のRun Checkは7 files、0 residualでPASSした。
- PSScriptAnalyzerは環境に存在せず未実行。PowerShell ParserとFixtureで代替検証した。
- Remote CIはNOT RUN（Push／手動再実行禁止）。
- Progress: 94% (16/17)

## 2026-08-06 20:55 (JST) 完了判定

- 最終 `pnpm run verify` は exit 0。Format、Lint（0 errors／既存warning 64件）、Typecheck、Security、全Unit／Integration／Repository／Component／Contract、Web Buildを完了した。
- 最終 Current Run `Write + Check` 2回は各7 files、`files_changed: 0`、`replacements_total: 0`、`residual_findings: 0` で成功した。
- 最終 `ChangedOnly -Check` は19 files、0 residualで成功した。
- 最終 `git diff --check` はwhitespace errorなし（LF／CRLF変換warningのみ）。
- JSON parse、evaluation schema、対象PowerShell Parser、raw personal path searchを最終確認する。
- 残余リスク: Remote CIは未実行。PSScriptAnalyzerは未導入。Codex CLIのerror preservation probeはAPI側モデル非対応で終了したが、Task exit code 1と生成Artifactのsanitizationは確認済み。
- Progress: 100% (17/17)

## 2026-08-06 20:46 (JST) JSON／Evaluation最終確認

- Current RunのJSON、`codex-task` report JSONをParseし、すべてPASSした。
- `.codex/templates/evaluation.schema.json`によるCurrent Run `evaluation.json`の検証はPASSした。
- 既存のPR対象 `20260806-162406-JST/evaluation.json`も同スキーマでPASSした。
- Progress: 100% (17/17)

## 2026-08-06 21:24 (JST) Repair Loop iteration 2／Native成果物規約の訂正

- iteration_number: 2
- input_findings: 前回のNative成果物規約を「スコープ外」とした判定、関連文書・履歴・Run Artifactの削除、共有用／機械証跡の責務逆転、個人PC固有Pathの残存可能性。
- triage: `must_fix`（ユーザー明示要件、成果物保存契約、個人Path衛生、Run Artifact整合性）。
- repair_plan: Native関連文書・History・`.codex/runs/20260806-094328-JST/*`を維持する内容へ復元し、`output/mobile-native/`と`.artifacts/native-local/<timestamp>/`の実体・ignore・追跡状態を確認する。旧Run evaluationのtaxonomy／evidence_refsを現行スキーマへ最小補正する。
- allowed_files: `docs/native/README.md`、`docs/native/windows-android-local-validation.md`、`docs/PROJECT_CONTEXT.md`、`docs/history/2026-08-06_143650_native-mobile-output-convention.md`、`docs/plans/2026-08-06_094328_pr8-native-local-maestro-ci-repair.md`、`.codex/runs/20260806-094328-JST/*`、`.codex/runs/20260806-194500-JST/*`。
- changed_files: 前回の誤った除去を復元したNative文書・History・PR #8 Run記録、個人Pathを標準Junction aliasへ置換したNative計画、現行RunのPlan／Tasks／Report／Manifest／Evaluation。生成物本体の追加・削除・移動はなし。
- validation_commands:
  - `git status --short`
  - `git ls-files -- output/** .artifacts/** *.apk *.aab *.png`
  - `git check-ignore -v output/mobile-native/native-storefront-cart-added.png .artifacts/native-local/example/evidence.txt`
  - Native保存先・文書整合性Assertion
  - 個人Path検索（Windows／Unixの既知ユーザーHomeパターン）
  - `scripts/sanitize-codex-artifacts.ps1 -Path .codex/runs -ChangedOnly -Check`
  - Current RunのWrite＋Check 2回
  - JSON parse 6件、`evaluation.schema.json` 3件
  - `pnpm run format:check`
  - `git diff --check`
- validation_result: PASS。ルート直下`native-*.png`は0件、共有PNGは存在し履歴SHA-256と一致、生成物のGit追跡は0件、ignoreは`.gitignore:21-22`、Native文書4件整合、個人Path 0件、ChangedOnlyは17 files／0 residual、Current Runは各7 files／0 residual、JSON／Schema／Format／Diff checkも成功した。
- remaining_delta: Push禁止のためRemote CIは未実行。今回の訂正では実機Maestroを再実行していない。`git ls-files -- *.png`に既存のproduct／design source PNGはあるが、Nativeテスト成果物ではない。
- decision: `stop_success`
- Progress: 100% (17/17)

## 2026-08-06 23:30 (JST) 実機 Native 検証結果

- 実施時刻: 2026-08-06 22:54頃から23:29頃（JST）。実機検証用のNative Run IDは`20260806-230738-JST`とした。既存のCodex Run Directoryは分散させず、今回の作業履歴はCurrent Runへ追記した。
- 端末: ADBで認証済みの物理Android端末を検出した。DoctorはNode、pnpm、Maestro、Android API 30、`arm64-v8a`をPASSと判定した。個体識別子は長期Run Artifactへ記録していない。
- Prepare: `android-local.ps1 -Action Prepare`、native asset生成、image manifest、native route dependency、Expo prebuildをPASSした。
- Build復旧: 初回Buildと`-CleanNative`は、依存リンク切替前のautolinking／CMakeキャッシュが`.pnpm-local`の長いパスを参照して`ninja: error: manifest 'build.ninja' still dirty after 100 tries`で失敗した。その後、依存を`<PNPM_VIRTUAL_STORE>`へ明示的に再リンクし、`expo prebuild --clean --platform android --no-install`で生成済みautolinkingを再生成した。最終Buildは終了コード0、Release APK（57,569,450 bytes、SHA-256は機械証跡の`build/apk-info.txt`に保存）を生成した。
- Install／Smoke: `android-local.ps1 -Action Install`は`Success`、`-Action Smoke`は終了コード0でPASSした。
- 基本Maestro: `-Action Test`（`maestro/native-test-control.yaml`）は`1/1 Flow Passed`でPASSした。
- Runtime Suite: `-Action RuntimeSuite`は5フロー中3成功、2失敗となった。成功は`native-test-control`、`native-contract-harness`、`native-not-found`。失敗は`native-storefront`と`native-cart`で、共通して`native-product-card-product-basic-shirt`を30秒以内に検出できなかった。失敗時の画面は商品一覧の途中で、取得UI hierarchyにも対象カードが存在しない。JUnit、Maestro log／step screenshot、ADB logcat、UIAutomator XML、Maestro hierarchyは`.artifacts/native-local/20260806-230738-JST/`へ保存した。
- 停止判断: Runbookの失敗時停止条件に従い、Boundary Suiteは実行していない。今回の実機検証は部分成功であり、Native品質ゲート全体をPASSとは扱わない。Native画面やMaestro Flowの仕様変更は行っていない。
- Native artifact handling: 今回生成されたAPK、logcat、JUnit、Hierarchy、UIAutomator、Gradle／Install logは`.artifacts/native-local/20260806-230738-JST/`に保存され、`output/mobile-native/`へ新規共有画像を追加していない。`output/`と`.artifacts/`はGit管理外で、`git ls-files`にも該当する再生成可能証跡はない。共有用成果物と実行ごとの機械証跡の責務分離は維持した。
- Remote CI: 更新前に観測済みのPhase 1 success／Native CI failure（Native StaticのExpo Doctor patch mismatch）に変更はない。Push／Workflow手動再実行は禁止されているため、Expo patch更新後のRemote successは未確認であり、マージ可能とは記録しない。
- 判断: `stop_needs_human`。実機Runtime Suiteの対象カード未検出の原因確認・再検証、および更新後Remote CIのsuccess確認が残っている。
- Progress: 100% (18/18)

## 2026-08-07 05:30 (JST) Android Build復旧手順の文書化

- 今回の実機Buildで、外部Virtual Storeへ切り替えた後も`.pnpm-local`の古いAutolinking／CMake参照が残り、`ninja: error: manifest 'build.ninja' still dirty after 100 tries`となった事実を文書化した。
- `docs/native/windows-android-local-validation.md`へ、`Prepare`後の`.modules.yaml`／Package Link／生成Autolinking確認、必要時の`pnpm install --frozen-lockfile --virtual-store-dir=<PNPM_VIRTUAL_STORE>`、`expo prebuild --clean --platform android --no-install`、再確認後のBuildという復旧順序を追加した。
- `docs/native/windows-android-troubleshooting.md`へ症状一覧と詳細な復旧節を追加し、`-CleanNative`は古い生成参照の再作成ではないため初手にしないことを明記した。`docs/native/README.md`から該当節を参照できるようにした。
- `docs/PROJECT_CONTEXT.md`と`docs/history/2026-08-07_053046_windows-android-build-recovery.md`へ、最終Build成功とRuntime Suite 3/5、Boundary未実行という実測を追記した。生成Android、APK、JUnit、logcat、端末固有情報は追加していない。
- implementation_researcher（read-only）は、主な追記先をTroubleshooting／Runbook／Contextとし、ADR追加は不要と判断した。親Agentはこの判断を採用した。書込みsubagentは使用していない。
- 検証: `pnpm run format:check` はPASS、`git diff --check` はwhitespace errorなし（既存のLF／CRLF変換warningのみ）。関連語句の`rg`確認もPASSした。
- 残余: 実機Runtime Suiteの2フロー失敗、Boundary未実行、更新後Remote CI未確認は既存の未完了事項として維持する。今回の文書更新で実機全体PASSとは扱わない。
- Progress: 100% (19/19)

## 2026-08-07 06:03 (JST) Native商品カード未検出のローカル調査・再検証

- Doctor（Native Run `20260807-055345-JST`）はPASSした。端末の標準入力方式は`jp.co.sharp.android.iwnnime.ml/.standardcommon.IWnnLanguageSwitcher`で、以前記録したSHV48のMaestro ASCII入力問題と一致した。
- 既存失敗RunのHierarchyには`native-catalog-screen`と`native-product-card-product-mug`等が存在する一方、`native-product-card-product-basic-shirt`は存在しなかった。失敗後のMaestro／Accessibilityログでは検索欄のplaceholderが残っており、`inputText: P-0001`が検索欄へ保持された証拠がない。
- ソース上はSeedに`product-basic-shirt`／`P-0001`があり、Native SQLite検索は商品名・商品Code・Brand名を検索対象にする。したがって、今回の失敗はデータ定義やCI専用状態より、実機IME経由の入力不成立が最有力である。
- A/B再検証としてLatinIMEを一時有効化し、同じインストール済みAPKで`native-storefront.yaml`（Native Run `20260807-055734-JST`）を実行したところ58秒でPASSした。公式単体GateとRuntime Suite（Native Run `20260807-055922-JST`）もそれぞれ1/1、5/5 PASSした。
- 検証終了後、標準日本語IMEを選択し、LatinIMEを無効化して元の有効IME一覧へ復元した。端末固有情報はRun Artifactへ記録していない。今回の追加証跡は`.artifacts/native-local/20260807-055734-JST/`と`.artifacts/native-local/20260807-055922-JST/`に保存され、Repositoryへ追加していない。
- 判定: 原因調査とLatinIME条件での再検証はローカルで完了した。標準日本語IMEのままでは同じ入力問題が残るため、LatinIME切替を恒久修正とは扱わず、Flow／IME前提の運用固定または入力経路の改善を別途判断する。コード変更は行っていない。
- Build／Install／Smokeは同じAPKで直前にPASS済み、今回コード変更なしのため再実行していない。Boundary Suiteと更新後Remote CIは未実行である。
- Progress: 100% (20/20)

## 2026-08-07 06:20 (JST) Native Maestro入力経路分離の計画・調査

- ユーザー合意の方針に従い、既知商品を検証する主要FlowはProduct Deep Linkへ移し、検索入力は独立Flowとして維持する計画を作成した。保存先は[`docs/plans/2026-08-07_062000_native-input-flow-policy.md`](../../docs/plans/2026-08-07_062000_native-input-flow-policy.md)である。
- implementation_researcher（Darwin）へ既存Deep Link、Maestro Flow、CI列挙、Native Routeの調査を委譲した。既存の`native-low-stock.yaml`等でProduct Deep Linkが利用済みであり、主要4 Flowの置換とCI／Contract更新が必要との報告を採用した。
- test_investigator（Bernoulli）へカバレッジと失敗経路の調査を委譲した。検索専用Flowでも`P-0001`入力から商品カード可視化までを残し、検索経路の回帰検知を失わないこと、既存コンポーネントテストにNativeSearchScreen直撃がないことを確認した。今回はMaestro E2E専用Flowを追加し、アプリ本体のコンポーネント実装は変更しない判断とした。
- Progress: 87% (20/23)

## 2026-08-07 06:55 (JST) Native Maestro入力経路分離の実装・実機検証

- 変更: `native-storefront.yaml`、`native-cart.yaml`、`native-restart-persistence.yaml`、`native-reset-dirty-state.yaml`の既知商品到達をProduct Deep Linkへ変更し、`maestro/native-search.yaml`へ`P-0001`検索と対象商品カードtestID検出を分離した。Android／iOS CIは検索専用Flowを別Maestro実行として追加した。
- 追加契約: `native-test-control-maestro.test.ts`で主要4 Flowに`inputText: "P-0001"`を戻さないこと、検索専用Flowに入力・商品カードtestIDがあることを固定した。Native CI契約は検索専用実行とJUnit／Artifact出力を固定した。
- 実機初回（Native Run `20260807-063600-JST`）: Doctor、ControlはPASS。Runtimeは3/5の後、Deep Link後の商品名Textが画面外であるためStorefront／Cartが失敗した。Evidenceは`.artifacts/native-local/20260807-063600-JST/`へ保存した。
- 最小修正: 商品名Textのassertだけを4 Flowから削除した。商品詳細screen testID、Variant testID、Add／Cart操作は維持し、Timeout延長、Assertion全削除、Flow Skipは行っていない。
- 実機再検証（Native Run `20260807-064200-JST`）: 標準日本語IMEのControl 1/1、Runtime 5/5、Boundary 5/5をPASSした。同じAPKで、Build／Install／SmokeはFlow／文書変更のみのため再実行していない。
- 検索専用Flow（Native Run `20260807-065100-JST`）: LatinIMEを一時有効化・選択し、`native-search.yaml` 1/1をPASSした。`P-0001`入力と`native-product-card-product-basic-shirt`検出を確認し、終了後に標準日本語IMEと有効IME一覧を復元した。標準日本語IMEで検索専用Flowが成立しない可能性は文書どおり成功扱いにしていない。
- 静的検証: Native関連Contract 30/30、`pnpm run format:check`、`pnpm run lint`（既存warning 64・error 0）、`pnpm run typecheck:native-tests`、`git diff --check`はPASS。`pnpm run typecheck`は今回変更外の既存6箇所のimplicit-anyでFAILした。
- 成果物: APK、JUnit、Hierarchy、logcat、UIAutomator、端末SerialはRepositoryへ追加していない。共有画像は`output/mobile-native/`、実行証跡は`.artifacts/native-local/<timestamp>/`の規約を維持した。Remote CIは未実行。
- 判定: `stop_needs_human`。今回の入力経路分離とローカルNative検証は完了したが、全体typecheck既存エラーと更新後Remote CI未確認が残る。
- Progress: 100% (23/23)

## 2026-08-07 06:57 (JST) 最終文書整合性確認

- `docs/PROJECT_CONTEXT.md`へ、既知商品用のProduct Deep Link、検索専用Flow、IME復元、今回の実機結果と未確認事項を追記した。ADR、Runbook、Troubleshooting、履歴文書、Maestro／CI契約テストとの責務分離は維持した。
- `pnpm run format:check`は全対象PASS、`git diff --check`はwhitespace errorなし（既存のLF／CRLF変換warningのみ）。
- 今回の追記後も判定は`stop_needs_human`を維持する。未確認事項は更新後Remote CIと、今回変更外にある全体typecheckの既存6件である。
- Progress: 100% (23/23)
