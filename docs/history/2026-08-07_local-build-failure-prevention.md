# ローカルビルド失敗の振り返りと再発防止

## 1. 対象と証跡

2026-08-06〜2026-08-07のローカル品質ゲート、Windows Android Build、実機MaestroのRunを、会話の記憶だけでなく次のRun Artifactと`.artifacts/native-local/`の記録で照合した。

- `.codex/runs/20260806-094328-JST/REPORT.md`
- `.codex/runs/20260807-071118-JST/REPORT.md`
- `.codex/runs/20260807-094024-JST/REPORT.md`
- `.artifacts/native-local/20260807-094024-JST/maestro/runtime-smoke/` の失敗時 `commands.json`／Maestro log／Hierarchy

古いRunで終了コード、Shell Version、完全なBuild失敗ログが保存されていないものは、推測で補わず「未記録」とした。現在の成功Buildログが同じRunIdの`build/`へ残っているため、低容量Buildの最初の生ログは上書きされた可能性があり、Run REPORTの要約を一次証跡として扱う。

## ローカル実行失敗履歴

| No. | 実行日時 | コマンド | 実行環境 | 終了コード | 最初のエラー | 推定原因 | 実施した対応 | 再実行結果 |
|---:|---|---|---|---:|---|---|---|---|
| 1 | 2026-08-06 09:50 JST | `pnpm run native:android:doctor` | Windows PowerShell、Repository root、Version未記録 | 1 | `Validate toolchain`中の`pnpm` invocation失敗 | `CONFIGURATION_FAILURE`：PowerShell wrapperの`$Args`衝突 | wrapperの引数受け渡しとstderr／終了コード保持を修正 | Doctor再実行PASS |
| 2 | 2026-08-06 10:00 JST | `pnpm run native:android:test:control` | Windows実機、PowerShell、Version未記録 | 124 | `Native test runtime listening`がHierarchyで`visible: false` | `TEST_FAILURE`：画面／Accessibilityの可視性契約不一致。Crashやlistener未登録ではない | Safe Area内の単一accessible要素へ修正 | Control PASS |
| 3 | 2026-08-06 午前（時刻未記録） | `pnpm run native:android:build:local` | Windows、Virtual Store切替後、PowerShell Version未記録 | non-zero | CMake／Ninjaの`build.ninja still dirty after 100 tries` | `BUILD_CACHE_FAILURE`：古い`.pnpm-local`／Autolinking参照 | 明示Virtual Storeへ再リンクし、`expo prebuild --clean`後にBuild | Build／APK検査PASS |
| 4 | 2026-08-06 12:29 JST | `native-storefront` formal Flow | Windows実機、Maestro CLI、標準日本語IME条件を含む | 1相当 | `native-product-card-product-basic-shirt`を可視化できない | `TEST_FAILURE`。当時は非同期検索の後勝ちを最有力とし、後の再検証ではformal CLIのIME入力経路差も確認 | 最新検索だけを反映するguard、Flowの安定ID／入力経路分離を検討・修正 | 修正APKのformal Flowを制御IME条件でPASS |
| 5 | 2026-08-06 12:53 JST | `pnpm run native:android:test:boundary` | Windows実機、Maestro CLI、Version未記録 | 未記録 | `out-of-stock`／`low-stock`／`purchase-limit` Flowのoffscreen／text selector失敗 | `TEST_FAILURE`：長い画像と汎用text selectorへの依存 | stable IDと`scrollUntilVisible`へ変更し、各Flowを個別再検証 | 個別PASS、Boundary Suite 5/5 PASS |
| 6 | 2026-08-06 13:11 JST | `native-search.yaml`／formal CLI | Windows実機、標準日本語IMEとLatinIME条件を比較 | non-zero（日本語IME条件） | `inputText: P-0001`が検索欄へ保持されずカード未検出 | `DEVICE_FAILURE`：実機IME／Maestro CLI入力経路差。`TRANSIENT_FAILURE`とは扱わない | 検索を専用Flowへ分離し、制御IME条件で実行後、元IMEを復元 | LatinIME条件1/1 PASS。標準日本語IMEはPASS扱いにしない |
| 7 | 2026-08-06 13:49 JST | `pnpm run format:check` | Windows PowerShell、Repository root、Version未記録 | 1 | generated Android／`.artifacts`等をformat対象として検出 | `CONFIGURATION_FAILURE`：formatter scopeの除外不足 | `.prettierignore`へ生成物を追加し、生成物を一括整形しない規約を追加 | format／`pnpm run verify` PASS |
| 8 | 2026-08-06 13:49 JST | `pnpm run test:integration`／`test:repository`／`test:contracts` | Windows、外部Virtual Store、Package Version未記録 | non-zero | `vitest`を外部Virtual Storeから解決できない | `DEPENDENCY_FAILURE`：isolated layoutとpeer／package解決の不足 | packageExtensionsと正式なisolated install条件を整備 | Integration 91、Repository 28、ContractがPASS |
| 9 | 2026-08-07 07:18 JST | `pnpm run verify`（typecheck段階） | Windows PowerShell、Repository root、Node／pnpm Version未記録 | non-zero | 4 source fileの6件のimplicit-any | `SOURCE_FAILURE`：共有型検査を停止する型注釈不足 | 正本型を確認し、最小の型注釈を追加 | typecheck／verify PASS |
| 10 | 2026-08-07 07:32 JST | `pnpm run test:component:native` | Windows、Jest worker並列、Version未記録 | non-zero | 10 files中2 filesがworker競合で5秒timeout | `ENVIRONMENT_FAILURE`：Jest worker並列実行時のホスト資源競合。timeout延長だけでは原因を隠す | `maxWorkers: 1`へ限定し、単独確認後に正式経路を再実行 | Native Component PASS |
| 11 | 2026-08-07 10:55 JST | `pnpm run native:android:build:local`（1回目） | Windows実機、公式wrapper、システムドライブ空き約28MB | 未記録 | `MergeNativeLibsTask`／`copyReleaseJniLibsProjectOnly`のNative `.so` copy失敗 | `ENVIRONMENT_FAILURE`（既存Run細分類：`SETUP_FAILURE`）：ホスト容量不足 | autolinking／Virtual Storeを確認し、cache／Virtual Store削除は行わず停止 | 容量確保後にBuild成功 |
| 12 | 2026-08-07 10:55 JST | 同じRelease Build（2回目） | 同上、容量不足条件 | 未記録 | 同じNative `.so` copy段階の失敗 | `ENVIRONMENT_FAILURE`：条件不変の再試行で新情報なし | 以後の無目的再試行を止め、ユーザーの容量確保を待った | 容量確保後の条件変更で成功 |
| 13 | 2026-08-07 17:16 JST | `native-storefront`／`native-cart` Runtime Suite | Windows実機、正式Maestro CLI、修正前APK | non-zero | `カートに追加しました`のvisible assertion失敗。Hierarchyには存在するが画面外 | `TEST_FAILURE`：ScrollView画面外要素とMaestro可視性契約の不一致 | `native-cart-add-message`を追加し、`scrollUntilVisible`後にID assert。Cart遷移前も上方向scroll | Runtime 5/5、Persistence個別2/2、Boundary個別3/3、Boundary 5/5 |
| 14 | 2026-08-07（時刻未記録） | `scripts/native/android-local.ps1` | Windows PowerShell、Repository root | 1 | 指定したwrapper pathが存在しない | `CONFIGURATION_FAILURE`：実行コマンドのPath typo | 正式入口 `scripts/native/windows/android-local.ps1`へ修正 | 正式wrapperのout-of-stock Flow PASS |

## 2. 根本原因と派生エラー

- 根本原因は一つではない。環境・依存解決・生成状態・入力経路・UI可視性・テスト資源・コード型の異なるFailureが、同じ「Build／Maestroが失敗した」という見た目で連続していた。
- `BUILD FAILED`、`Task failed with an exception`、終了コード1、APK不存在、Install失敗、Maestro起動失敗は、前段の原因から派生した結果として記録する。APKがない状態でInstall／Maestroを続けない。
- `TRANSIENT_FAILURE`は外部障害を証拠で確認できる場合だけ使う。worker競合やMCP server状態は、再現条件と新しい情報がない限り、単なる「たまたま」とは扱わない。

## 3. 無効だった試行

- 原因確認前の同一Build／同一Flow再実行。
- 容量不足のままのBuild再試行。
- `gradlew clean`／`-CleanNative`を古いAutolinking参照の確認より先に行うこと。
- Timeout延長、固定Sleep、Assertion削除、Flow skip、CI Allow failureだけでPASS扱いにすること。
- Native Jestのworker競合をtimeout増加だけで隠すこと。
- 検索IMEの失敗を主要Runtimeへ戻して分母へ混ぜること。
- Build／Maestroの失敗ログを同一RunIdの出力先へ再利用し、比較可能性を失わせること。

## 4. 有効だった試行と確立した成功条件

- Build前にtoolchain、SDK、ADB、容量、APK／appId／Profileを確認し、Virtual Storeと生成Autolinkingの古い参照を検査した。
- 古い参照がある場合だけ、明示Virtual Storeへの依存再リンクと`expo prebuild --clean`を行った。
- 実行ごとの正式wrapper、固有attempt／出力先、完全ログ、失敗時Hierarchy／Screenshot／logcat／JUnitを使った。
- UIはstable testIDと`scrollUntilVisible`を使い、入力は主要FlowのDeep Linkと検索専用Flow／制御IMEへ分離した。
- 変更後は同じ正式入口を同じ対象Flowへ戻し、単体PASS後だけSuiteへ進めた。
- 成功ベースラインは、preflight PASS、Release APK生成、APK／ABI確認、Install、Smoke、Control、Runtime 5/5、Boundary 5/5、検索専用Flowの制御IME条件PASS、`pnpm run verify` exit 0である。Remote CIの修正後結果は未確認である。

## 5. 次回の事前確認と停止規則

1. 直近Run、失敗ログ、変更差分、Shell／Version／環境変数、APK、成功条件を読む。
2. `node --version`、`pnpm --version`、`java -version`、`javac -version`、`adb version`、`adb devices`、環境変数、`Get-Command`、空き容量、`android\gradlew.bat --version`を実行する。
3. 実行目的と仮説を記録し、一回の検証で変更する条件を一つに限定する。
4. attempt-idを新しくし、完全ログを`.artifacts/native-local/<attempt-id>/`へ保存する。
5. 最初のエラーを分類し、上流失敗後の後続工程を止める。
6. 同一エラー2回連続、同じ工程3回失敗、最初のエラー不変、新しいログなし、環境未把握、APKなし、仮説なしの場合は再試行せず、調査へ戻る。

この手順の正本は[`docs/native/windows-android-local-validation.md`](../native/windows-android-local-validation.md) 5.1.1、エージェント入口は[`android-native-local-validation` Skill](../../.agents/skills/android-native-local-validation/SKILL.md)とする。
