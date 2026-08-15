# Android Canonical Visual Batch Capture Infrastructure

## 背景

PR #24のNative CIは、`capture_spec_visuals=true`で1回のworkflow runにつき1つのAndroid Capture Caseだけを取得していた。Android canonical 25件を同一API34環境で取得し、全件のprovenanceを検証してからFinal Visual Gateへ反映する実行経路が不足していた。

## State Aで追加したもの

- `scripts/spec/android-visual-capture.ts`にRegistry由来の`list-cases`、batch manifest validation、全件preflight、temporary WebP staging、rollback付きbatch promotionを追加した。
- `.github/workflows/native-ci.yml`に`capture_case_key=all`を追加し、1 APK build・1 Emulator・1 profile normalization・1 installの同一runtimeで、Registry順にcaseごとのreset/setup/route/role/ready/screenshot/manifestを実行する経路を追加した。
- partial failureは`complete=false`とfailed caseをartifactへ残し、workflowをfailureにし、batch applyは拒否する。case keyやcanonical output pathはYAML/artifactで複製・指定せずRegistryから導出する。
- `apply:android-spec-visuals`とcontract testsを追加した。single-case CLIは維持した。

## Status / 次段階

- Android execution stateは実capture前のため`blocked`のまま。asset存在だけでは`captured`へ遷移しない。
- 次はユーザーが変更をPR branchへcommit/pushした後、remote workflow gateを再確認し、固定API34 canonical profileでActions dispatchする。
- 25/25 artifact、source SHA、同一run APK SHA-256、profile、raw PNG、per-case manifestを検証してからpromotion・status transition・Markdown materializationを行う。
- State Aのlocal validationではFinal Visual Gateがblocked 25 / captured 69/94を理由に失敗するのは期待どおりであり、canonical screenshotは未取得・未promotionである。

## State B capture attempt: profile normalization repair

- Run `31841614738`（workflow_dispatch、source SHA `bb064ac2efe79828fd2f5e95f929e92a63bc92b0`）では、Android Emulatorの起動とAPK buildは成功したが、`Normalize Android canonical visual profile`が`persist.sys.locale`の`en_US`残留でfailした。capture case実行前のためvisual artifactは生成されていない。
- Android公式のEmulator locale手順に合わせ、workflowのprofile normalizationへ`setprop persist.sys.locale ja-JP; stop; sleep 5; start`とboot完了待ちを追加し、locale property/settingsの短い収束確認を入れた。これはcanonical profile検証のfail-closeを維持する最小修正で、Capture retryやready assertionの弱体化ではない。
- 同じremote SHAでの再実行は修正を反映しないため行わない。local修正を次のPR HEADへpush後、new source SHAでbatch captureを再実行する。
