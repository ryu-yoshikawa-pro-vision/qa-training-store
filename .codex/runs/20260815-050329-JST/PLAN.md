# Plan

## Objective

- PR #24にRegistry由来のAndroid canonical visual batch capture/apply経路を追加し、push後に固定API34 Actionsで25件を取得・検証・promotionできる状態まで進める。

## Scope

- In: `native-ci.yml`のsingle/all capture、`android-visual-capture.ts`のlist/batch validation/apply、package script、contract tests、必要なRun/plan記録。
- Out: Product UI、Native Capture semantics、Final Gate、startup helper、Git mutation、Actions自動commit、canonical capture前のstatus変更。

## Assumptions

- Remote PR HEADはGitHub APIから取得する。Git CLIは使わない。
- batch artifactは`batch.manifest.json`と`raw/<screen>/<state>/android.png|android.manifest.json`を持つ。
- 実capture成功後、既存materialize scriptでMarkdown referenceを生成する。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。ユーザーがprofile、branch、inputs、DoD、禁止事項を指定済み。
- 仮定してよい細部: single modeは既存の1件artifact互換を保ち、batch modeだけ`requested_mode=all`をapply許可する。
- 未回答の重要質問: なし。

## Hypotheses

- H1: Registryからcase keyを実行時に導出し、同一Emulatorでcaseごとに既存Maestro flowを再起動すれば、YAML重複なしで25件をisolated captureできる。
- H2: batch manifest、既存per-case manifest validator、実APK digest、canonical profileを全件検証してから一時WebPを生成すれば、partial/stale/mixed provenanceのpromotionをfail-closeできる。
- H3: status transitionをpromotion成功後の明示的処理に限定し、asset存在だけではcapturedへ昇格しなければFinal Gateの意味論を維持できる。

## Research Plan

- Round 1 Query: remote PR HEAD/workflowとlocal CLI/registry/testsをread-onlyで比較し、STATE A/B/Cを判定する。
- Round 2 Query: existing single capture flow、materialize、visual validator、Native workflow contractを読み、safe change surfaceとall-or-nothing境界を確定する。
- Exit Criteria:
  - 主要仮説ごとに支持/反証の根拠がある
  - 未解決論点に次アクションがある

## Approach

- remote gateを通過する前にlocal batch infrastructureを実装・testする。workflowはcapture inputが`all`のときだけRegistry listをloopし、APK build/emulator/profile/installは既存jobを一度だけ実行する。applyは全件validation→temporary WebP→canonical/status transitionの順序を持つ。local validation後にHANDOFF A、push後にremote gate→dispatch→watch→download→apply→materialize→final validationを進める。
- 標準フロー: `PLAN -> repo/remote mapping -> TASKS -> 実装 -> local validation -> HANDOFF/Actions -> promotion -> final validation -> REPORT`

## Definition of Done

- State A: batch infrastructure、contracts、local validationが完了し、Final Gateの25 blockedだけがEXPECTED FAILである。
- State B:同一Actions runから25/25 artifact/APKを取得し、source/profile/APK SHA全件一致、all-or-nothing promotion、status/materialization、Final Gate/verify PASSまで完了する。
- State C: push後の最新PR HEADにPhase 1/Native/Final required CI PASSを確認し、merge-readyを判定する。

## Risks / Unknowns

- partial captureのcanonical混入: `complete=true`と全expected/captured set一致を必須化し、invalid時はcanonicalを触らない。
- remoteに未pushのworkflowをdispatch: branch/head/workflow内容をAPIで再確認してからdispatchする。
- API34 runner failure: job/stepの最初の異常を記録し、原因修正が必要ならHANDOFF Aへ戻す。古いartifactを再利用しない。

## Thinking Log

- 思考や判断の理由はここに逐次追記する（作業中に更新）。
- 不明点の整理、選択肢比較、決定理由を簡潔に記録する。

### 2026-08-15 05:03 JST

- GitHub APIでPR #24を確認し、HEAD=`c5082e4d78fe7c99b2e70cb09133f98cf21d7f0f`、対象branchが正しいことを確認した。
- remote workflowはsingle `capture_case_key`のみで、batch list/applyは未実装だったためSTATE Aと判定した。
- 既存の`promoteAndroidVisualCapture`、`materializeVisualReferences`、Maestro capture flowを再利用し、generic DSLを増やさない方針にした。

### 2026-08-15 06:48 JST

- State B dispatchはremote gate通過後に実行できたが、API34 Emulatorのsystem localeが`en_US`のまま残り、profile normalizationでfailした。Emulator起動とAPK buildは成功し、Capture Caseは未実行だったため、個別setup/readyやProduct UIの問題とは扱わない。
- Android公式のlocale設定手順に沿って、`setprop persist.sys.locale ja-JP`とstop/start、boot/locale収束確認をworkflowへ追加した。同じremote SHAでは再実行せず、ユーザーpush後に新SHAでState Bを再開する。

### 2026-08-15 08:20 JST

- Expo Doctorの再確認で、対象は前回CIログと同じ7 packageだけだった。`expo-constants` overrideは既存の依存解決固定として維持し、direct dependencyと`57.0.11`へ同期する最小修正を採用した。
- 更新後の`expo install --check`と`expo-doctor@1.17.6`はPASSし、prebuild、Native bundle/config、route dependency、Native component、contract、typecheck、lintもPASSした。Final GateはAndroid capture未実行のblocked 25だけが残るため、依存修正成功とは分離してEXPECTED FAILのまま扱う。
- 今iterationのdecisionは`stop_needs_human`。新しい依存変更をActions dispatchへ反映するには、ユーザーによるcommit/pushが必要であり、push前のremote captureやartifact混在は行わない。

### 2026-08-15 09:04 JST

- Run `31850993052`はAPI34 emulator起動、Android APK build、Native Static/Expo Doctorを通過したが、`Normalize Android canonical visual profile`で失敗した。
- 完全ログで`adb shell setprop persist.sys.locale ja-JP`が`Failed to set property`（exit 1）となり、`set -e`によりstop/startと厳格なlocale convergence validationへ到達していないことを確認した。Captureは未実行で、artifact/APKをcanonical入力には使わない。
- 修正方針は現行locale設計を拡張せず、`setprop`の権限拒否だけをbest-effort扱いにすること。`settings put system system_locales ja-JP`、stop/start、boot wait、`persist.sys.locale`/`system_locales`のja-JP検証、profile validatorは維持する。検証失敗時は引き続きfail-closeする。
- local workflow Prettier、Expo Doctor、Native/config、component/contracts、typecheck/lint、structural validationはPASS。Final Gate/verifyはblocked 25 / captured 69/94のみでEXPECTED FAIL。新修正をpush後に新HEADでState Bを最初から再実行する。

### 2026-08-15 09:40 JST

- Run `31852971377`はPR HEAD=`c9d31e7698ac4f10bcabe1a11bb072edfc78dafe`に対して正しくdispatchされたが、`Normalize Android canonical visual profile`で再度停止した。
- 完全ログの第一の補助コマンドは想定どおりbest-effortで越えたが、続く`adb shell stop`が`Must be root`で失敗した。API34 `google_apis`のshell権限に依存するroot-only操作が第二の実原因であり、transient、setup/ready、Product UI failureではない。
- `system_locales`設定、`persist.sys.locale`と`system_locales`の収束確認、API34 canonical profile validatorは維持する。root-onlyの`stop/start`だけをhost-side `adb reboot`へ置換し、boot completion wait後に既存strict validationを実行する方針を採用した。
- localでworkflow contractに`adb reboot`とroot-only stop/start不在を固定し、Prettier、contract、format、native component、typecheck、lint、EAS、production bundle、route、structural specを再検証した。並列負荷時にtimeoutしたbatch contractは単独再実行で6/6、全contractで228/228へ回復した。
- 新しいworkflow修正は未pushのため、現RunのAPK/runtime evidenceは採用せず、同じHEADでのrerunもしない。修正をpush後、新HEADでState Bを最初から実行する。

### 2026-08-15 10:04 JST

- ユーザーpush後のremote gateをGitHub APIで確認したが、PR #24と対象branchのHEADはともに`c9d31e7698ac4f10bcabe1a11bb072edfc78dafe`で、remote workflow SHAも旧内容のままだった。remoteには`adb shell stop/start`が残り、`adb reboot`および実効Configuration観測は未反映だったためdispatchしなかった。
- 要件の「property単独判定禁止」に対応し、local workflowはrootlessな`cmd activity get-config`のresource qualifierから`ja-rJP`／`ja-JP`を検出する`effective_locale`を追加した。`system_locales=ja-JP`と実効Configurationの両方をstrictに要求し、`persist.sys.locale`は診断出力だけに降格した。profile JSONのlocaleは`effective_locale`から生成する。
- AOSP ActivityManager shell commandの`get-config`がdevice Configurationを返すことを一次ソースで確認した。remoteでこの修正が実行され、`locale_effective=ja-JP`の実測が得られるまでcanonical captureへ進めない。
- local validationはworkflow contract 17/17、全contract 228/228、native component 49/49、format、typecheck、lint、structural specをPASS。Final Gate/verifyは現状のAndroid 25 blockedだけでEXPECTED FAIL。

### 2026-08-15 10:35 JST

- Run `31855909379`はPR HEAD=`6cca966ffbc0ef9e565ac0db138bbbe7cdad0db5`に対して正しくdispatchされたが、`Normalize Android canonical visual profile`で失敗した。API34 Emulator起動、Android Automation APK build、production build、Native Staticは成功したが、25件capture前に停止した。
- 失敗Runのruntime evidence（`.artifacts/native-remote/31855909379/dumpsys-activity.txt`）には、非root `dumpsys activity`の`mGlobalConfig`／`CurrentConfiguration`として`[ja_JP]`が記録されている。したがって実機へ切り替える根拠はなく、canonical要件のAPI34 `google_apis` x86_64 `pixel_2` Emulatorを維持する。
- 現remote実装の`cmd activity get-config`解析はこのRunでstrict convergenceを成立させられなかった。`persist.sys.locale`のbest-effort化やlocale判定の緩和は行わず、非rootで実際に読めた`dumpsys activity activities`をeffective Configurationの観測源に変更した。`system_locales=ja-JP`と`effective_locale=ja-JP`の両方を引き続き必須とし、値をテスト前にログへ出す。
- Local validation after repair: Prettier、`native-ci-workflow.test.ts` 17/17、全contract 228/228、typecheck、lint、structural specをPASS。現時点のspec countsはTarget 94、Captured 69、Pending 0、Blocked 25、Canonical 69。
- Decision: 新しいworkflow／contract修正は未pushのため、現RunのAPK/runtime evidenceをcanonical入力にせず、physical deviceでも代替しない。ユーザーpush後に最新SHAでState Bを最初から再実行する。
