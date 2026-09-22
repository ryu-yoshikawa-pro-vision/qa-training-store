# Issue #130 Native CI workflow責務境界整理 Plan

## 0. 依頼概要

- 対象Issue: #130 `refactor: Native CI workflowの責務境界を整理する`
- 作業branch: `plan/issue-130-native-ci-responsibility-boundary`
- branch作成時の`main`: `2a76df4e7c4efabfc1e50ce4a4b0d88c92ddabd3`
- 今回修正時の`main`: `01cd8ab15078d479e821d373445af1e16a469519`
- 前回基準`8d73289350d45e28b4186c47caa32ad8d4809657`から現在`main`までの1 commitはIssue #163のSecurity fallback 3ファイルだけを変更し、Native CI関連fileは変更していない。
- branch作成時の`main`から現在`main`までの差分もIssue #163のSecurity fallbackに限定され、Issue #130のCurrent mappingは変わっていない。
- このPlanではNative CI実装、PR作成、merge、Issue closeを行わない。

## 1. 結論

現在の`main`でもIssue #130の問題は残っているため、Refactorは必要と判断する。

問題は`.github/workflows/native-ci.yml`の行数ではなく、build、Production Bundle Guard、Android runtime、visual capture、Training、iOS接続、final gateという変更理由の異なる責務が同一fileへ集まり、局所修正でも広い範囲を読み直す必要があること。

再レビュー後は次の構成を採用する。

1. `.github/workflows/native-ci.yml`はtop-level orchestrationを維持する。
2. Android Automation / Production buildはjob IDを維持したまま、新しい`.github/workflows/native-android-build.yml`へ委譲する。callerから渡すinputは`build_kind`だけとし、Artifact名、filename、Evidence Artifact名はcalled workflow内で`build_kind`から一意に決定する。
3. Android buildの現在の非対称な検証・Evidence契約は今回統一しない。Automation / Productionそれぞれの現行動作を明示して維持する。
4. `native-android-build.yml`にはworkflow-level `concurrency`を追加しない。親`Mobile App CI`の既存`concurrency`を維持し、Automation / Productionの同時buildを相互cancelさせない。
5. Production Bundle Guardはjob境界と既存`scripts/validate-native-production-bundle.ts`の責務を維持し、Actual APKから`.hbc`を展開してvalidatorへ渡す処理だけを`scripts/native/android-ci-production-bundle-guard.sh`へ移す。
6. `android-runtime`は親workflowに残し、Emulator起動、visual profile normalization、visual capture、runtime evidenceだけを責務別scriptへ移す。`Check Android adb root capability`は現在の独立stepとしてworkflowへ残す。
7. Automation / Production APK install / launch、Maestro Flow各step、SDK / Maestro setup、launcher stabilizationはworkflowへ残す。
8. Native change detectionは通常PRで実行される経路だけを追加対象とし、manual visual専用helperを理由に通常Native CI全体を起動しない。
9. job ID、Artifact名、runner、Action SHA、Automation / Productionの保証意味、Formal / Trainingの境界、visual captureのmanual-only契約、final fail-closed semanticsは変更しない。

## 2. 現状の構成

### 2.1 入口

主な入口は`.github/workflows/native-ci.yml`で、workflow名は`Mobile App CI`。

現在の主なjobは次のとおり。

- `detect`
- `native-static`
- `android-automation-build`
- `android-production-build`
- `production-bundle-guard`
- `android-runtime`
- `native-ios`
- `verify`

`native-ios`は既に`.github/workflows/native-ios-ci.yml`をReusable Workflowとして呼び出している。

### 2.2 現在の処理経路

```text
detect
├─ native-static
├─ android-automation-build
├─ android-production-build
│    └─ production-bundle-guard
│
├─ android-runtime
│    ├─ Android Emulator / runtime setup
│    ├─ Automation APK
│    ├─ Formal Maestro flows
│    ├─ Training Maestro baseline
│    ├─ optional canonical visual capture
│    ├─ Production-validation APK
│    └─ runtime evidence
│
└─ native-ios -> .github/workflows/native-ios-ci.yml

all results
└─ verify (native-ci / verify)
```

`android-runtime`は次の依存を持つ。

```yaml
needs:
  [detect, android-automation-build, android-production-build, production-bundle-guard]
```

RuntimeはAutomation / Production buildの少なくとも一方が成功していれば診断実行可能な条件を保持する。一方、最終`verify`はNative変更ありの場合、両build、Production Bundle Guard、Android Runtime、iOSをすべて`success`必須とする。

この「途中では可能な範囲を実行し、最終gateでは全保証をfail-closeする」意味は変更しない。

### 2.3 既存の保護

主な保護は次。

- `tests/contracts/native-ci-workflow.test.ts`
- `tests/contracts/ci-workflow.test.ts`
- `tests/contracts/native-test-control-maestro.test.ts`
- `scripts/native/android-maestro-run.sh`
- `scripts/validate-native-production-bundle.ts`
- `.github/workflows/native-ios-ci.yml`
- `docs/PROJECT_CONTEXT.md`

## 3. 現在の根拠とRefactor要否

### 3.1 Phase 6までの修正履歴

Phase 6で確認済みの主な修正。

- `53ae9d7`: Android Build / Runtime分離
- `8381a80`: Automation / Production build分離
- `bb064ac`: Android canonical visual batch capture
- `41ad95b`: ja-JP locale / capture修正
- `f3ba3e3`: Production Hermes artifact inspection修正
- `9b3a396`: Android Gradle memory修正

異なるfailure / repairが同じ`native-ci.yml`へ反復している。

### 3.2 Phase 6後の追加根拠

PR #133 / merge commit `f6727303da97f3b4b81777472a305ed5c3860410`でもNative CI周辺へ追加修正が入った。

- `native-ci.yml`
  - `Stabilize Android launcher before APK launch`を追加。
  - Pixel Launcher package一覧をfail-closeで取得・正規化し、存在時だけforce-stopするruntime環境修正。
- `scripts/native/android-maestro-run.sh`
  - `Pixel Launcher isn't responding`をUI hierarchyから検出し、最大3回のbounded dismissalを追加。
- `native-ios-ci.yml`
  - iOS Automation / Production-validation build timeoutを40分から60分へ変更。
- `tests/contracts/native-ci-workflow.test.ts`
  - launcher stabilization / cleanupのfail-closed順序を回帰契約化。

Phase 6後にもruntime環境とiOS build運用の異なる修正理由がNative CI boundaryへ入っているため、Issue #130の問題は現在も成立する。

### 3.3 change detectionの既存gap

現在の`detect`は、通常Android Runtimeが直接利用する`scripts/native/android-maestro-run.sh`を監視していない。

manual visual pathが直接利用する`scripts/spec/android-visual-capture.ts`も監視していない。ただしvisual captureは通常PRでは実行されないため、これを単純に`native_changed`へ加えても変更したmanual path自体のruntime検証にはならない。

そのため通常PR経路とmanual visual経路は分けて扱う。

## 4. 設計案の比較

### 4.1 Android build

#### 案A: Gradle commandだけをshell helperへ移す

採用しない。

- 現在のAutomation / Production buildはそれぞれ約200行あり、SDK解決、component install、metadata、prebuild、APK verify、Artifact、evidenceが大きく重複している。
- Gradle commandだけを移してもbuild責務の変更面はほとんど狭まらない。

#### 案B: Automation / Production job IDを維持し、同じReusable Workflowを2回呼ぶ

採用する。

GitHub ActionsではReusable Workflowをjob単位で呼び出せ、caller jobに`name`、`uses`、`with`、`needs`、`if`等を持たせられる。後続jobはcaller jobを`needs.<job_id>`として参照できる。

公式仕様:

- [GitHub Docs: Reusing workflow configurations](https://docs.github.com/en/actions/reference/workflows-and-actions/reusing-workflow-configurations)
- [GitHub Docs: Workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax)

新規file:

```text
.github/workflows/native-android-build.yml
```

親workflowのcallerは次の形を基準とする。

```yaml
android-automation-build:
  name: Android Automation Build
  needs: detect
  if: needs.detect.outputs.native_changed == 'true' || github.event_name == 'workflow_dispatch'
  uses: ./.github/workflows/native-android-build.yml
  with:
    build_kind: automation

android-production-build:
  name: Android Production-validation Build
  needs: detect
  if: needs.detect.outputs.native_changed == 'true' || github.event_name == 'workflow_dispatch'
  uses: ./.github/workflows/native-android-build.yml
  with:
    build_kind: production
```

caller job IDは変更しない。

```text
android-automation-build
android-production-build
```

Reusable Workflowのinputは`build_kind`だけにする。

```yaml
on:
  workflow_call:
    inputs:
      build_kind:
        required: true
        type: string
```

`build_kind`はworkflow先頭で`automation` / `production`以外をfail-closeする。Artifact名、保存filename、Evidence Artifact名をcaller inputにしない。

理由:

- `build_kind=automation`なのにProduction Artifact名を渡すような矛盾した入力状態を作らない。
- Artifact provenanceを`build_kind`から一意に決める。
- 現在変化しない値を設定化しない。

called workflow内の対応表は次で固定する。

| `build_kind` | `EXPO_PUBLIC_APP_ENV` | `EXPO_PUBLIC_BUILD_KIND` | `EXPO_PUBLIC_TEST_MODE` | APK Artifact | 保存filename | Evidence Artifact |
|---|---|---|---|---|---|---|
| `automation` | `automation` | `automation` | `"true"` | `native-android-apk-${{ github.run_id }}` | `native-automation.apk` | `native-android-build-evidence-${{ github.run_id }}` |
| `production` | `production` | `production` | `"false"` | `native-android-production-apk-${{ github.run_id }}` | `native-production-validation.apk` | `native-android-production-build-evidence-${{ github.run_id }}` |

`EXPO_PUBLIC_DEFAULT_SEED=default`と`ANDROID_COMPILE_API_LEVEL="36"`は両方で維持する。

caller workflowのworkflow-level `env`はcalled workflowへ自動伝播しないため、`NODE_VERSION`、`PNPM_VERSION`、`HUSKY`等、buildで必要な定数はcalled workflow側へ明示する。

この3値はRefactor前は親workflowの同じ`env`をAndroid buildも参照していたため、Refactor後も親workflowとcalled workflowで値を一致させる。

| 定数 | 現在値 | 更新契約 |
|---|---|---|
| `NODE_VERSION` | `24` | 親`native-ci.yml`と`native-android-build.yml`を同じ変更で更新する |
| `PNPM_VERSION` | `10.34.5` | 親`native-ci.yml`と`native-android-build.yml`を同じ変更で更新する |
| `HUSKY` | `"0"` | 親`native-ci.yml`と`native-android-build.yml`を同じ変更で更新する |

`tests/contracts/native-ci-workflow.test.ts`で親workflowとcalled workflowの3値が一致することを比較する。version共有のために新しいworkflow input、Repository `vars`、共通設定fileは追加しない。

callerに現在ある`runs-on`、`timeout-minutes`、`env`、`steps`はReusable Workflow caller jobには残さず、called workflow内部のbuild jobが所有する。

`.github/workflows/native-android-build.yml`にはworkflow-level `concurrency`を追加しない。親`.github/workflows/native-ci.yml`の既存`concurrency`だけを維持する。Automation / Productionは同じReusable Workflowを並行して呼ぶため、called workflow側で同一concurrency groupを持たせると片方をcancelし得る。

相対path `./.github/workflows/native-android-build.yml`で呼び、別refやcommit SHA inputは追加しない。

#### Automation / Productionの現行差分

共通化を理由に次の差異を統一しない。

| 項目 | Automation | Production | 今回の扱い |
|---|---|---|---|
| metadata期待値 | `automation / automation / true` | `production / production / false` | 維持 |
| Gradle log | `gradle-assemble-release.log` | `gradle-assemble-production-release.log` | 維持 |
| APK検証順 | Build → Verify original APK → Save | Build → Save → Verify saved APK | 維持 |
| bundle存在確認 | あり | あり | 維持 |
| ABI検証 | x86_64必須、arm64-v8a / armeabi-v7a / x86禁止 | 現在は同等のABI禁止検証なし | 追加・統一しない |
| 成功時Gradle Evidence | 末尾200行 | 現在のProduction log copy | 維持 |
| 失敗時Automation APK Evidence | 生成済みならEvidenceへcopy | 同等copyなし | 維持 |
| Evidence directory / filename | `native-build-evidence`系 | `native-production-build-evidence`系 | 維持 |

これらの非対称性が妥当かを改善することはIssue #130の対象外。今回のRefactorでは現在の保証を変えずにownerだけを移す。

#### Reusable Workflowへ移すAction設定

ActionはSHAだけでなく、現在の安全性・cache・Artifact契約に関わる`with`設定も維持する。

| Action | 維持する設定 |
|---|---|
| `actions/checkout` | 現在の固定SHA、`persist-credentials: false` |
| `pnpm/action-setup` | 現在の固定SHA、`version: ${{ env.PNPM_VERSION }}` |
| `actions/setup-node` | 現在の固定SHA、`node-version: ${{ env.NODE_VERSION }}`、`cache: pnpm` |
| `actions/setup-java` | 現在の固定SHA、`distribution: temurin`、`java-version: "17"` |
| `gradle/actions/setup-gradle` | 現在の固定SHA、`cache-read-only: ${{ github.event_name == 'pull_request' }}` |
| APK `actions/upload-artifact` | 現在の固定SHA、build kindごとのArtifact名 / path、`if-no-files-found: error`、`overwrite: true`、`retention-days: 3` |
| Evidence `actions/upload-artifact` | 現在の固定SHA、`if: always()`、build kindごとのArtifact名 / path、`if-no-files-found: warn`、`retention-days: 7` |

`github.event_name`と`github.run_id`はcalled workflowでもcaller workflowのcontextを利用する。これらを新しいinputへ変換しない。

今回のRefactorでAction version、cache policy、credential persistence、Artifact retention / overwrite / missing-file policyを変更しない。

### 4.2 Android Runtime全体のReusable Workflow化

採用しない。

- RuntimeはAutomation / Production buildの個別resultとProduction Bundle Guard resultを使い、成功した経路だけ部分的に実行する。
- Runtimeを子workflowへ移すとcaller resultを別入力へ再伝播する必要が生じる。
- 現在見えている部分診断条件とfinal gateの関係が遠くなる。

### 4.3 Production Bundle Guard

`scripts/validate-native-production-bundle.ts`へAPK展開責務を追加しない。

現在の責務境界を維持する。

```text
Production Bundle Guard job
  -> Artifact download
  -> scripts/native/android-ci-production-bundle-guard.sh
       -> Actual APKの存在 / size確認
       -> unzipでbundle / hbc candidate列挙
       -> temporary .hbcへ展開
       -> --automation-bundle-path / --production-bundle-pathを構築
       -> pnpm run validate:native-production-bundle

scripts/validate-native-production-bundle.ts
  -> .hbcをHermes disassemble
  -> Automation marker presence
  -> Production marker absence
```

`android-ci-production-bundle-guard.sh`はCI Artifact形式と既存validator入力形式を接続するadapterとして扱う。Production marker policyは持たない。

既存validatorのCLI契約`--automation-bundle-path` / `--production-bundle-path`は変更しない。新しいZIP dependencyやAPK path modeは追加しない。

### 4.4 Runtime inline実装

「長いから移す」ではなく、workflow orchestrationとは別の変更理由を持ち、移動によって局所変更範囲が狭まる処理だけをscriptへ移す。

Runtimeで追加するhelperは4つ。

```text
scripts/native/android-ci-emulator-start.sh
scripts/native/android-ci-visual-profile.sh
scripts/native/android-ci-visual-capture.sh
scripts/native/android-ci-runtime-evidence.sh
```

次はworkflowへ残す。

- Android SDK / system image setup
- `Inspect emulator binary`
- `Stabilize Android launcher before APK launch`
- Maestro CLI setup
- `Check Android adb root capability`
- Automation APK verify / install / launch / startup stability
- Formal Maestro各step
- Training Maestro baseline
- Production APK verify / install / launch
- Production-validation Maestro

`Check Android adb root capability`は現在`id: android_adb_root`を持ち、後続`android_profile_normalize`の`if`条件と`ADB_ROOT_AVAILABLE`を作る独立stepである。ここはworkflowへ残す。

`android-ci-visual-profile.sh`へ移すのは現在の`Normalize Android canonical visual profile` step本文だけとする。helperは`ADB_ROOT_AVAILABLE`を入力として利用し、root利用時のlocale provisioning、unroot、effective profile観測、profile JSON生成、`validate-profile`を担当する。

launcher stabilizationも独立stepとして診断可能で、今回さらにhelperを増やす効果が小さいためworkflowへ残す。

Automation install / launchは現在のstep condition、`android_automation_install` outcome、後続Maestro開始条件と強く結びつくため今回移さない。

## 5. 実装後の責務

### 5.1 `.github/workflows/native-ci.yml`

次を所有する。

- `pull_request` / `workflow_dispatch`
- visual capture inputs
- workflow-level permissions / concurrency / shared version定数
- Native change detection
- top-level job graph
- Android build Reusable Workflowの2 caller job ID / `name` / `needs` / `if` / `build_kind`
- Production Bundle Guard jobとArtifact download
- Android Runtimeのstep構成、step ID、step condition
- `Check Android adb root capability`
- Artifact upload / download Action
- Formal Maestro / Training / Production-validationの実行順
- `native-ios-ci.yml`呼び出し
- `native-ci / verify`

### 5.2 `.github/workflows/native-android-build.yml`

Android Automation / Production build実装の共通owner。

責務:

- `workflow_call`とrequired `build_kind`
- `build_kind`のfail-close検証
- `build_kind`から環境変数、Artifact名、保存filename、Evidence Artifact名を一意に決定
- `runs-on: ubuntu-24.04`
- `timeout-minutes: 40`
- checkout / pnpm / Node / Java / Gradle setup
- Automation / Production runtime metadata確認
- Expo prebuild
- Android SDK build component解決 / install / verify
- `:app:assembleRelease`
- Gradle JVM memory / x86_64指定
- build kindごとの現在のAPK verify順序とABI検証差異
- 固定filenameへの保存
- APK Artifact upload
- build kindごとの現在のEvidence収集 / upload

責務外:

- workflow-level `concurrency`
- Emulator
- Runtime / Maestro
- Production marker policy
- visual capture
- final gate

### 5.3 `scripts/native/android-ci-production-bundle-guard.sh`

Production Bundle GuardのActual APKからvalidator入力までのI/O adapter。

- Automation / Production APKの存在・size確認
- `unzip -Z1`で`assets/.*\.(bundle|hbc)`候補を列挙
- candidateが0件ならfail-close
- `unzip -p`でtemporary `.hbc`へ展開
- 各出力が非空であることを確認
- 既存`--automation-bundle-path` / `--production-bundle-path`配列を構築
- `pnpm run validate:native-production-bundle`を実行

責務外:

- Artifact download
- Hermes marker policy
- raw byte marker scan
- 新しいZIP dependency

### 5.4 `scripts/validate-native-production-bundle.ts`

現行の責務を維持する。

- `.hbc` pathを受け取る。
- 固定`hermes-compiler`でdecodeする。
- Automationで必要markerがすべて存在することをfail-close確認する。
- Productionで禁止markerが存在しないことをfail-close確認する。
- 引数なし時の既存Expo export modeを維持する。

APK path input、ZIP展開、temp directory lifecycleは追加しない。

### 5.5 `scripts/native/android-ci-emulator-start.sh`

- AVD作成
- Emulator起動
- ADB readiness
- `sys.boot_completed`
- package service readiness
- animation scale等のruntime初期化
- 現在`android_emulator_ready` stepが後続へ渡す状態を維持

SDK / system image install、launcher stabilization、APK install、Maestro、visual profile、evidence uploadは持たない。

### 5.6 `scripts/native/android-ci-visual-profile.sh`

現在の`Normalize Android canonical visual profile` step本文だけを所有するmanual visual helper。

- workflowで取得済みの`ADB_ROOT_AVAILABLE`を利用
- root利用時のja-JP provisioning
- 必要なunrootと非root観測
- boot / package / settings service readiness
- font scale / UI mode / orientation / density設定
- effective locale / orientation等のfail-close確認
- observed profile JSON生成
- `android-visual-capture.ts validate-profile`呼び出し
- `ANDROID_OBSERVED_PROFILE_JSON`の後続step引き渡し

`adb root` capabilityの判定自体はworkflowの`android_adb_root` stepへ残す。

### 5.7 `scripts/native/android-ci-visual-capture.sh`

- `capture_case_key`のsingle / all解決
- `list-cases` / `describe-case`
- Capture Case metadata検証
- setup / ready / role等のMaestro env構築
- `android-maestro-run.sh`呼び出し
- screencap
- per-case manifest
- batch manifest
- partial failure時のfail-close

canonical assetへのpromotionは行わない。

### 5.8 `scripts/native/android-ci-runtime-evidence.sh`

- 成功時のbounded metadata
- failure時だけのAVD listing / dumpsys / logcat / full emulator log / APK copy等
- JUnit / Maestro artifact集約
- Test Control / Contract Harness signal抽出

`actions/upload-artifact`はworkflowへ残す。

### 5.9 `scripts/native/android-maestro-run.sh`

Formal / Training / visual captureの共有startup helperとして維持し、今回意味変更しない。

### 5.10 shell helperの入出力契約

新しい設定objectや共通CLI frameworkは作らず、現在inline stepで使っている環境変数とGitHub runner環境をそのまま境界にする。

必須値はhelper冒頭で空値をfail-closeする。`if: always()`で動くEvidence helperだけは、前段失敗で存在しない可能性がある値をoptionalとして扱う。

#### `android-ci-production-bundle-guard.sh`

workflowから明示する環境変数:

```yaml
env:
  AUTOMATION_APK_PATH: ${{ runner.temp }}/native-bundle-guard/automation/native-automation.apk
  PRODUCTION_APK_PATH: ${{ runner.temp }}/native-bundle-guard/production/native-production-validation.apk
```

必須:

- `AUTOMATION_APK_PATH`
- `PRODUCTION_APK_PATH`
- `RUNNER_TEMP`

後続stepへ永続化する`GITHUB_ENV` / `GITHUB_OUTPUT`はない。

生成物:

- `$RUNNER_TEMP/native-bundle-guard/automation-hbc/bundle-*.hbc`
- `$RUNNER_TEMP/native-bundle-guard/production-hbc/bundle-*.hbc`

helperの成否をProduction Bundle Guard jobの成否として扱う。

#### `android-ci-emulator-start.sh`

必須:

- `ADB`
- `AVDMANAGER`
- `EMULATOR`
- `ANDROID_API_LEVEL`
- `RUNNER_TEMP`
- `GITHUB_ENV`

`HOME` / `ANDROID_PREFS_ROOT`は現在どおり診断表示に利用するが、未設定でもhelper開始自体を拒否しない。

`GITHUB_ENV`へ維持する値:

- `ANDROID_AVD_HOME`
- `EMULATOR_PID`

生成する既存diagnostic file:

- `$RUNNER_TEMP/avd-files.txt`
- `$RUNNER_TEMP/avd-list.txt`
- `$RUNNER_TEMP/emulator-pid.txt`
- `$RUNNER_TEMP/emulator.log`

`id: android_emulator_ready`はworkflow step側へ残し、helperのexit codeをそのstep outcomeとして使う。

#### `android-ci-visual-profile.sh`

必須:

- `ADB`
- `MAESTRO_BIN`
- `ADB_ROOT_AVAILABLE`
- `RUNNER_TEMP`
- `GITHUB_WORKSPACE`
- `GITHUB_ENV`

`ADB_ROOT_AVAILABLE`は直前の`android_adb_root` stepが`GITHUB_ENV`へ書いた値を利用する。

`GITHUB_ENV`へ維持する値:

- `ANDROID_OBSERVED_PROFILE_JSON=$RUNNER_TEMP/android-observed-profile.json`

生成・更新する既存file:

- `$RUNNER_TEMP/android-observed-profile.json`
- `$RUNNER_TEMP/native-runtime-evidence/adb-root.txt`への観測結果追記
- root不可時の`$RUNNER_TEMP/locale-provisioning/**`

`id: android_profile_normalize`と現在の`if`条件はworkflow step側へ残す。

#### `android-ci-visual-capture.sh`

workflow stepで次を明示的に渡す。

```yaml
env:
  CAPTURE_CASE_SELECTION: ${{ inputs.capture_case_key }}
```

必須:

- `CAPTURE_CASE_SELECTION`
- `ADB`
- `MAESTRO_BIN`
- `APK_PATH`
- `ANDROID_OBSERVED_PROFILE_JSON`
- `RUNNER_TEMP`
- `GITHUB_WORKSPACE`
- `GITHUB_SHA`
- `GITHUB_RUN_ID`

`android-maestro-run.sh`は同じ環境から`ADB` / `MAESTRO_BIN`を継承する。helper専用の追加CLI引数へ変換しない。

生成物:

- `$RUNNER_TEMP/spec-visuals/raw/**/android.png`
- per-case `android.manifest.json`
- `$RUNNER_TEMP/spec-visuals/batch.manifest.json`
- `$RUNNER_TEMP/android-capture-case-*.json` / `.log`
- `$RUNNER_TEMP/maestro-artifacts/visual-capture/**`
- `$RUNNER_TEMP/maestro-visual-capture-*.xml`

`GITHUB_ENV` / `GITHUB_OUTPUT`へ新しいstateは追加しない。

#### `android-ci-runtime-evidence.sh`

workflow stepで次を維持する。

```yaml
env:
  NATIVE_ANDROID_JOB_STATUS: ${{ job.status }}
```

必須:

- `NATIVE_ANDROID_JOB_STATUS`
- `RUNNER_TEMP`

前段失敗時に未設定・未生成でも動作を継続するoptional入力:

- `ADB`
- `ANDROID_AVD_HOME`
- `ANDROID_PREFS_ROOT`
- `HOME`
- `APK_PATH`
- `PRODUCTION_APK_PATH`
- `EMULATOR_PID`および既存の`$RUNNER_TEMP` diagnostic files

Evidence helperは`if: always()`で動くため、optional入力の欠落をhelper自体の初期化失敗に変えない。現在と同じstatus fileを`$RUNNER_TEMP/native-runtime-evidence`へ書く。

後続stepへ永続化する`GITHUB_ENV` / `GITHUB_OUTPUT`はない。`actions/upload-artifact`はworkflow側へ残す。

## 6. change detection

### 6.1 通常PRで追加するpath

`detect`へ次を明示追加する。

```text
.github/workflows/native-android-build.yml
scripts/native/android-maestro-run.sh
scripts/native/android-ci-production-bundle-guard.sh
scripts/native/android-ci-emulator-start.sh
scripts/native/android-ci-runtime-evidence.sh
```

理由:

- 通常PRのMobile App CIで直接実行される。
- 変更時にNative-specific jobを実際に通す必要がある。
- exact pathで十分で、`scripts/native/**`や`android-ci-*.sh`のwildcardへ広げない。

### 6.2 manual visual専用path

次は通常PRの`native_changed`へ追加しない。

```text
scripts/native/android-ci-visual-profile.sh
scripts/native/android-ci-visual-capture.sh
scripts/spec/android-visual-capture.ts
scripts/spec/android-visual-setup.ts
scripts/spec/visual-registry.ts
```

理由:

- `capture_spec_visuals=true`の`workflow_dispatch`でのみruntime実行される。
- 通常Native CIを起動してもvisual pathはskipされ、変更箇所のruntime validationにはならない。
- 通常PRではcontract / typecheck等で静的契約を確認し、今回の実装ではbranch `workflow_dispatch`の1 case実行を完了条件にする。

このIssueで新しい`visual_changed` outputや専用自動workflowは追加しない。

### 6.3 既存path

`scripts/validate-native-production-bundle.ts`は既に`detect`対象であり、今回CLI契約を変更しない。

## 7. Contract test変更

主に`tests/contracts/native-ci-workflow.test.ts`を更新する。

### 7.1 親workflow

- caller job ID `android-automation-build` / `android-production-build`
- 両jobが同じ`native-android-build.yml`を呼ぶこと
- callerが渡すinputは`build_kind`だけであること
- Automationは`build_kind: automation`、Productionは`build_kind: production`
- callerに`runs-on` / `timeout-minutes` / build `steps`を重複保持しないこと
- `production-bundle-guard`の`needs`
- RuntimeのAutomation / Production OR条件
- Production Bundle Guard result条件
- Artifact consumer name / path
- Android Runtime step順
- `android_adb_root`と`android_profile_normalize`の既存step境界
- Formal Maestro / Training / Production-validation順
- `native-ios`
- `verify`のNative変更あり / なしfail-close

### 7.2 Android build Reusable Workflow

新規workflow本文を読み込み、次を固定する。

- `workflow_call.inputs.build_kind`だけを受け取ること
- `build_kind`のfail-close検証
- Artifact名 / filename / Evidence Artifact名を外部inputにしないこと
- `automation` / `production`ごとのmetadata mapping
- `EXPO_PUBLIC_DEFAULT_SEED=default`
- `ANDROID_COMPILE_API_LEVEL="36"`
- `runs-on: ubuntu-24.04`
- `timeout-minutes: 40`
- workflow-level `concurrency`を持たないこと
- called workflowの`NODE_VERSION` / `PNPM_VERSION` / `HUSKY`が親workflowの同名値と一致すること
- checkoutの`persist-credentials: false`
- pnpm setupの`version: ${{ env.PNPM_VERSION }}`
- Node setupの`node-version: ${{ env.NODE_VERSION }}` / `cache: pnpm`
- Java setupの`distribution: temurin` / `java-version: "17"`
- Gradle setupの`cache-read-only: ${{ github.event_name == 'pull_request' }}`
- Expo prebuild
- SDK build components
- `assembleRelease`
- `-Xmx4g -XX:MaxMetaspaceSize=1g`
- `-PreactNativeArchitectures=x86_64`
- Automation / ProductionのArtifact名と保存filename
- APK uploadの`if-no-files-found: error` / `overwrite: true` / `retention-days: 3`
- Evidence uploadの`if: always()` / `if-no-files-found: warn` / `retention-days: 7`
- Automationだけが持つ現在のABI allow / deny検証
- Automation / Productionの現在のSave / Verify順序
- build kindごとのGradle log名とEvidence差異
- Emulator / Maestroを含まないこと

### 7.3 Production Bundle Guard

`android-ci-production-bundle-guard.sh`を読み込み、次を固定する。

- Actual APKの存在 / size確認
- `unzip -Z1`によるcandidate列挙
- candidate 0件でfail-close
- `unzip -p`によるtemporary `.hbc`展開
- `--automation-bundle-path` / `--production-bundle-path`構築
- `pnpm run validate:native-production-bundle`呼び出し
- raw marker scanを持たないこと

`native-ci-workflow.test.ts`ではProduction Bundle Guard jobが両Artifactをdownloadし、このhelperを呼ぶことを確認する。

既存`validate-native-production-bundle.ts`のHermes decode / marker contractは維持し、APK path mode用の新規testは追加しない。

### 7.4 runtime helper

現在workflow本文へ向いているassertionを責務ownerへ移す。

- Emulator start / boot -> `android-ci-emulator-start.sh`
- profile normalization -> `android-ci-visual-profile.sh`
- Capture Case / manifest -> `android-ci-visual-capture.sh`
- failure-only diagnostics -> `android-ci-runtime-evidence.sh`

`Check Android adb root capability`のcontractはworkflow側へ残す。`android_profile_normalize`の`if`が`steps.android_adb_root.outcome == 'success'`を維持し、helperが`ADB_ROOT_AVAILABLE`を利用することを確認する。

helper境界について次も固定する。

- Production Guard stepが`AUTOMATION_APK_PATH` / `PRODUCTION_APK_PATH`を明示的に渡す。
- Emulator helperが`ANDROID_AVD_HOME` / `EMULATOR_PID`を`GITHUB_ENV`へ維持する。
- Visual capture stepが`CAPTURE_CASE_SELECTION: ${{ inputs.capture_case_key }}`を維持する。
- Visual profile helperが`ANDROID_OBSERVED_PROFILE_JSON`を`GITHUB_ENV`へ維持する。
- Runtime Evidence stepが`NATIVE_ANDROID_JOB_STATUS: ${{ job.status }}`を維持する。
- Runtime Evidence helperは`ADB` / APK path等のoptional値が未設定でもEvidence生成を継続する。

launcher stabilizationとAPK install / launch assertionもworkflow側へ残す。

### 7.5 no-change contract

`native_changed=false`時にNative各jobが`skipped`であり、`verify`が成功扱いする契約は静的contract testで維持する。

今回の実装PRはNative関連file自身を変更するため、PR Remote CIでno-change pathを実測することは完了条件にしない。

### 7.6 再膨張防止

行数上限や独自complexity scoreは追加しない。

移動した責務の主要markerが`native-ci.yml`へ重複して戻っていないことだけ、既存contract testで必要最小限確認する。

## 8. Documentation

更新対象:

- `docs/PROJECT_CONTEXT.md`
  - 親workflowとAndroid build Reusable Workflowの責務
  - Production Bundle Guard helperがActual APK -> `.hbc` adapterであり、validatorがHermes policy ownerであること
  - Runtime helperと`android_adb_root` stepの責務
  - job / Artifact / final gate semantics不変
- `docs/history/<timestamp>_native-ci-responsibility-boundary.md`
  - Current Evidence
  - Reusable Workflow比較
  - Automation / Production buildの維持する非対称契約
  - 変更前後の責務
  - 検証結果

既存ADRの品質保証意味は変更しないため、新しいADRは作らない。

## 9. 実行タスク

- [ ] 1. 実装開始時のlatest `main`を確認し、Native CI関連差分があればrebaselineする。
- [ ] 2. 現在のjob ID、Artifact名、Automation / Productionの非対称contract、Runtime部分実行条件、no-change skip、final verifyをcontract testで先に固定する。
- [ ] 3. `.github/workflows/native-android-build.yml`を追加し、required inputを`build_kind`だけにする。
- [ ] 4. called workflow内で`build_kind`から環境変数、Artifact名、filename、Evidence名を一意に決定し、workflow-level `concurrency`は追加しない。
- [ ] 5. called workflowへ`NODE_VERSION=24` / `PNPM_VERSION=10.34.5` / `HUSKY="0"`を明示し、親workflowとの一致をcontract testで固定する。
- [ ] 6. checkout、pnpm、Node、Java、Gradle cache、APK / Evidence uploadの既存Action SHAと重要な`with` / `if`設定をそのまま移す。
- [ ] 6. `android-automation-build` / `android-production-build`を別caller jobのままReusable Workflow呼び出しへ変更する。
- [ ] 8. Automation / Productionの既存ABI検証、Save / Verify順序、Gradle log、Evidence差異を維持する。
- [ ] 9. `scripts/native/android-ci-production-bundle-guard.sh`を追加し、workflowからAutomation / Production APK pathを明示的に渡す。既存validatorのCLI / policyは変更しない。
- [ ] 10. `android-ci-emulator-start.sh`を追加し、Emulator起動 / readinessを移す。`ANDROID_AVD_HOME` / `EMULATOR_PID`の`GITHUB_ENV`契約と既存diagnostic fileを維持する。
- [ ] 11. `Check Android adb root capability`はworkflowへ残し、`android-ci-visual-profile.sh`へNormalize本文だけを移す。`ADB_ROOT_AVAILABLE`入力と`ANDROID_OBSERVED_PROFILE_JSON`出力を維持する。
- [ ] 12. `android-ci-visual-capture.sh`を追加し、`CAPTURE_CASE_SELECTION`をworkflow envから受けてmanual capture loop / manifest生成を移す。
- [ ] 13. `android-ci-runtime-evidence.sh`を追加し、`NATIVE_ANDROID_JOB_STATUS`を明示的に渡す。前段失敗時のoptional env欠落を許容したままEvidence収集を移す。
- [ ] 14. workflow側のstep名、ID、`if`、Artifact Action、Maestro step粒度、launcher stabilization、APK install / launchを維持する。
- [ ] 15. 通常PR用change detectionへ`native-android-build.yml`、`android-maestro-run.sh`、Production Guard helper、通常runtime helper 2本をexact pathで追加する。
- [ ] 16. manual visual専用fileは`native_changed`へ加えず、contract + manual dispatchで検証する。
- [ ] 17. `native-ci-workflow.test.ts`等のassertion ownerをworkflow / Reusable Workflow / helperへ移し、Action設定とhelper入出力契約を固定する。
- [ ] 18. `PROJECT_CONTEXT.md`とhistoryを同期する。
- [ ] 19. local static / focused / full validationを実行する。
- [ ] 20. PR Mobile App CIで`native_changed=true`の通常Native pathとfinal gateを確認する。
- [ ] 21. branch `workflow_dispatch`でvisual 1 caseを実runtime確認する。
- [ ] 22. Issue #130の成功状態に照らし、各責務のownerと局所変更時の検証範囲をPR本文へ記載できることを確認する。

## 10. 検証計画

### 10.1 YAML / shell

- Reusable Workflowを含むworkflow contract test。
- 新規shell 5本に`bash -n`。
- 新規shellはLFを維持する。
- 実行はworkflowから`bash <path>`で行い、executable bitは要求しない。
- 各helperの必須環境変数は冒頭でfail-closeする。
- Runtime Evidence helperのoptional環境変数は前段失敗時に未設定でも処理を継続する。

対象:

```text
scripts/native/android-ci-production-bundle-guard.sh
scripts/native/android-ci-emulator-start.sh
scripts/native/android-ci-visual-profile.sh
scripts/native/android-ci-visual-capture.sh
scripts/native/android-ci-runtime-evidence.sh
```

### 10.2 対象を絞ったcontract test

```bash
pnpm exec vitest run \
  tests/contracts/native-ci-workflow.test.ts \
  tests/contracts/native-test-control-maestro.test.ts \
  --no-file-parallelism \
  --maxWorkers=1 \
  --testTimeout=30000
```

確認対象:

- 親caller job ID / `needs` / `if` / `build_kind`
- called workflowの`build_kind` fail-closeとArtifact mapping
- 親workflowとcalled workflowの`NODE_VERSION` / `PNPM_VERSION` / `HUSKY`一致
- Automation / Productionの現行非対称contract
- checkout / pnpm / Node / Java / Gradle setupの既存Action SHAと重要な`with`設定
- APK / Evidence uploadのmissing-file / overwrite / retention設定
- Production Guard helperへのAPK path env
- Emulator helperの`ANDROID_AVD_HOME` / `EMULATOR_PID`出力
- `android_adb_root` -> `android_profile_normalize`境界
- Visual profile helperの`ANDROID_OBSERVED_PROFILE_JSON`出力
- Visual capture stepの`CAPTURE_CASE_SELECTION` env
- Runtime Evidence stepの`NATIVE_ANDROID_JOB_STATUS` envとoptional input欠落時の継続契約
- no-change skip contract
- final verify

### 10.3 Production Bundle Guard

既存validatorの直接確認は現行CLIのまま維持する。

```text
Automation bundle + Production bundle => PASS
crossed bundle input => FAIL
Production禁止marker => FAIL
```

新規Production Guard helperはcontract testと`bash -n`で、明示されたActual APK path -> temporary `.hbc` -> existing validatorの接続を確認する。APK path用のvalidator APIは追加しない。

### 10.4 Repository標準検証

```bash
pnpm run test:contracts
pnpm run verify
git diff --check
```

Run ArtifactはRepository契約に従いsanitizationする。

### 10.5 Remote CI

今回のPRではNative関連file自身が変更されるため、`native_changed=true`の経路だけを実runで確認する。

- Web CI: success
- Mobile App CI: success
- `android-automation-build`: success
- `android-production-build`: success
- `production-bundle-guard`: success
- `android-runtime`: success
- `native-ios`: success
- `native-ci / verify`: success
- Automation / Production Artifact名とfilenameが現在と同じ
- Training baselineが実行される
- caller job IDを通じて最終`needs.<job>.result`が現在の意味を維持する

`native_changed=false`のskip契約は同じPRでは実測できないため、§7.5の静的contract testで確認する。

### 10.6 manual visual path

branchを指定して次を実行する。

```text
capture_spec_visuals = true
capture_case_key = SCREEN-STOREFRONT-HOME/default/android
```

確認項目:

- `android_adb_root` step成功
- `ADB_ROOT_AVAILABLE`をprofile helperが利用
- `ANDROID_OBSERVED_PROFILE_JSON`が後続capture helperへ渡る
- `CAPTURE_CASE_SELECTION`が指定case keyと一致する
- canonical profile normalization
- non-root effective profile確認
- 1 case capture
- raw PNG / per-case manifest / batch manifest
- visual Artifact upload
- canonical assetを自動変更しない
- `native-ci / verify` success

全case captureは今回要求しない。

## 11. 完了条件

- Current EvidenceにPhase 6後のPR #133修正まで含まれ、今回修正時の`main` `01cd8ab15078d479e821d373445af1e16a469519`までNative CI関連driftがないことを確認している。
- `android-automation-build` / `android-production-build`のjob IDと個別resultが維持されている。
- Android build Reusable Workflowの外部inputが`build_kind`だけで、Artifact名 / filename / Evidence名は内部で一意に決まる。
- `native-android-build.yml`がworkflow-level `concurrency`を持たず、Automation / Productionを相互cancelしない。
- Android build実装のownerが`native-android-build.yml`へ集約され、親workflowでbuild手順を重複保持していない。
- 親workflowとcalled workflowの`NODE_VERSION` / `PNPM_VERSION` / `HUSKY`が一致し、version更新時の同期をcontract testで検出できる。
- checkoutのcredential設定、Gradle PR cache、Node / Java setup、APK / Evidence Artifactのfailure / overwrite / retention契約を変更していない。
- Automation / Productionの現在のABI検証、Save / Verify順、Gradle log、Evidence差異を変更していない。
- Production Bundle GuardのAPK extraction ownerが`android-ci-production-bundle-guard.sh`で、Hermes marker policy ownerが既存`validate-native-production-bundle.ts`のまま。
- validatorへAPK path modeや新規ZIP dependencyを追加していない。
- 5本のshell helperについて必須入力、optional入力、`GITHUB_ENV`出力、生成fileがPlan §5.10の契約と一致する。
- Runtime Evidence helperは前段失敗で`ADB` / APK path等が未設定でもEvidence生成を継続する。
- `Check Android adb root capability`の独立step / ID / outcome dependencyを維持している。
- launcher stabilization、APK install / launch、Formal / Training / Production-validation stepをworkflowへ残している。
- Artifact名、filename、upload / download経路が不変。
- Runtimeの部分診断条件が不変。
- final fail-closed semanticsが不変。
- no-change skip semanticsをcontract testで維持している。
- `android-maestro-run.sh`等の通常runtime helper変更でNative CIがskipされない。
- focused test、既存validator test、`test:contracts`、`verify`、`bash -n`、`git diff --check`がPASS。
- PR Mobile App CIの`native_changed=true`経路がPASS。
- manual visual 1 caseがPASS。
- Product behaviorを変更していない。
- Composite Action、独自CI DSL、汎用runner、将来用input、新規dependencyを追加していない。

## 12. リスクと対策

### Reusable Workflow化でcaller / calledの責務が曖昧になる

対策:

- callerはjob ID、`name`、`needs`、`if`、`uses`、`build_kind`だけを持つ。
- `runs-on`、`timeout-minutes`、build用`env`、`steps`はcalled workflowへ置く。
- Artifact名等をcaller inputにしない。

### 親workflowとcalled workflowのtoolchain versionがずれる

対策:

- `NODE_VERSION` / `PNPM_VERSION` / `HUSKY`は両workflowへ現在値を明示する。
- `native-ci-workflow.test.ts`で同名値を比較し、不一致をfail-closeする。
- version更新は両workflowを同じ変更で更新する。
- この同期のためだけに新しいinput、Repository `vars`、共通設定fileを追加しない。

### Action移動時にsecurity / cache / Artifact設定を落とす

対策:

- 固定SHAだけでなく§4.1のAction設定表をcontractとして移す。
- `persist-credentials: false`、Gradle `cache-read-only`、Node cache、Java 17、Artifactのmissing-file / overwrite / retentionをtestで固定する。
- version更新やcache policy変更を今回へ混在させない。

### Reusable Workflowの`concurrency`で片方のbuildをcancelする

対策:

- `native-android-build.yml`にはworkflow-level `concurrency`を追加しない。
- 親`native-ci.yml`の既存`concurrency`だけを維持する。
- contract testでcalled workflowに`concurrency:`がないことを確認する。

### Automation / Productionの非対称契約を共通化時に消す

対策:

- §4.1の差分表を実装契約とする。
- ABI検証、Save / Verify順、Gradle log、Evidence差異をcontract testで固定する。
- 今回それらを統一する変更は行わない。

### shell helper化で暗黙の環境変数・生成fileを失う

対策:

- §5.10をhelper境界の正本とする。
- Production Guard / Visual Capture / Runtime Evidenceのworkflow `env:`を明示する。
- Emulator / Visual Profileが現在`GITHUB_ENV`へ書く値を維持する。
- helper冒頭で必須値をfail-closeする。
- Evidence helperだけは前段失敗で欠落し得る値をoptionalとして扱う。

### Production Bundle Guardでvalidator責務を広げる

対策:

- APK extractionはshell adapterへ置く。
- `validate-native-production-bundle.ts`の入力とHermes policyを変更しない。
- 新規ZIP dependencyを追加しない。

### visual helper移動でstep境界が変わる

対策:

- `android_adb_root`はworkflowへ残す。
- `android-ci-visual-profile.sh`はNormalize step本文だけを持つ。
- `ADB_ROOT_AVAILABLE`と`steps.android_adb_root.outcome`の既存接続を維持する。

### visual helperは通常PRでruntime実行されない

対策:

- `native_changed`へ無意味に追加しない。
- contract testでstatic wiringを固定する。
- branch manual dispatch 1 caseを完了条件にする。

### no-change pathを今回のPRで実測できない

対策:

- `native_changed=false`のskip semanticsは静的contract testで固定する。
- Remote CIは`native_changed=true`経路の確認に限定する。

## 13. ロールバック

Database、migration、external state変更はない。

問題が発生した場合は、このRefactor commit群をrevertしてinline実装へ戻せる。Artifact名、job名、workflow entryを変更しないため、ロールバック時に外部migrationは不要。

## 14. 対象外

- Native CI全体の作り直し
- Android / iOS保証レベル変更
- iOS Runtime / Simulator / Maestro追加
- Maestro Flow内容変更
- Gradle / Expo / Maestro / Action version更新
- runner変更
- timeout tuning
- Self-hosted runner
- Native job並列度変更
- Product code変更
- Windows local validationのRefactor
- Composite Action導入
- 全`scripts/native/**`をNative change detectionへ追加
- visual専用change detection workflowの新設
- 新規dependency導入

## 15. 未解決事項

実装開始を止める未解決事項はない。

実装開始時にlatest `main`のNative CI関連fileへ変更が入っていた場合は、このPlanをそのまま適用せず、変更箇所だけrebaselineする。
