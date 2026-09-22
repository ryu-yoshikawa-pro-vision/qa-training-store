# Issue #130 Native CI workflow責務境界整理 Plan

## 0. 依頼概要

- 対象Issue: #130 `refactor: Native CI workflowの責務境界を整理する`
- 基準commit: `2a76df4e7c4efabfc1e50ce4a4b0d88c92ddabd3`
- 作業branch: `plan/issue-130-native-ci-responsibility-boundary`
- 依頼内容: 現在の`main`へ対象boundaryを再mappingし、Refactorの必要性を再確認したうえで、実装時に迷わないPlanを保存する。
- このPlanでは実装、PR作成、merge、Issue closeを行わない。

## 1. 結論

現在の`main`でもIssue #130の問題は残っているため、Refactorは必要と判断する。

ただし、`.github/workflows/native-ci.yml`を複数Reusable Workflowへ分割すること自体は採用しない。現在のjob graphは、Android Automation / Production buildの個別結果、Production Bundle Guard、Android Runtimeの部分実行、最終`native-ci / verify`のfail-closed判定を同一workflow上で明示しており、この関係を別workflowへ隠すと状態伝播が複雑になる。

今回の実装では、次の境界を採用する。

1. `.github/workflows/native-ci.yml`はtrigger、change detection、job graph、`needs` / `if`、Artifact upload / download、Maestro Flow単位の実行順、iOS reusable workflow呼び出し、最終fail-closed gateを所有する。
2. 変更頻度が高く、長いinline Bashとしてworkflowへ埋め込まれている処理は、既存の`scripts/native/*.sh`パターンを使って責務別scriptへ移す。
3. 新しい汎用CI framework、Composite Action、独自DSL、汎用step runnerは作らない。
4. job名、Artifact名、runner、Action SHA、Automation / Productionの保証意味、Training / Formal Nativeの境界、visual captureの手動実行契約は変更しない。

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

Phase 6 reportで確認された問題はCurrentでも成立する。

### 3.1 同一workflowへの異なる変更理由の集中

`native-ci.yml`は約2,000行あり、問題は行数そのものではなく、次の異なる責務の実装詳細が同一fileへ集中していること。

- Android Gradle build
- APK Artifact受け渡し
- Production Hermes artifact inspection
- Emulator作成 / boot / package service readiness
- Maestro CLI準備
- Formal Runtime / Boundary Flow
- Training baseline
- Android canonical visual profile / locale provisioning / capture
- Runtime evidence collection
- iOS Gate接続
- final fail-closed verification

### 3.2 修正履歴

Phase 6でEvidenceとして確認済みの主な変更。

- `53ae9d7`: Android Build / Runtime分離
- `8381a80`: Automation / Production build分離
- `bb064ac`: Android canonical visual batch capture
- `41ad95b`: ja-JP locale / capture修正
- `f3ba3e3`: Production Hermes artifact inspection修正
- `9b3a396`: Android Gradle memory修正

変更理由が異なるにもかかわらず、同じ`native-ci.yml`の広い範囲を変更している。

### 3.3 現在新たに確認したchange detectionの不足

`android-runtime`がFormal / Training Maestroの共通runnerとして利用する`scripts/native/android-maestro-run.sh`は、現在の`detect`のNative path listに明示されていない。

今回新しいNative CI helperを追加する場合、この状態のままではhelperだけを変更したPRでNative-specific jobがskipされ得る。

そのため、Refactorと同時にNative CI implementation ownerとなるscriptをchange detectionへ含める必要がある。

ただしWindows local専用`scripts/native/windows/**`まで一括でNative CI対象にしない。

## 4. 採用しない設計

### 4.1 Android job群のReusable Workflow化

今回は採用しない。

理由:

- 現在のRuntimeはAutomation / Production buildの個別resultを参照して部分的に実行する。
- final verifyは各job resultを個別にfail-close判定する。
- 複数jobを子workflowへ隠すと、result / outputの再公開契約が増える。
- Issue #130の目的は責務境界を狭めることであり、新しい状態伝播層を作ることではない。

既存`native-ios-ci.yml`は既に独立したplatform build-only boundaryとして成立しているため維持する。

### 4.2 Composite Actionの新規導入

今回は採用しない。

RepositoryにはNative処理を`scripts/native/**`へ置く既存パターンがあり、今回のinline Bash移動に新しいComposite Action層は不要。

### 4.3 一つの巨大な`android-runtime.sh`へ移動

採用しない。

workflowから別fileへ移すだけでは、Emulator、visual capture、evidence、Formal / Training実行の変更理由が再び同一fileへ集中し、Issue #130を解消しない。

## 5. 実装後の責務

### 5.1 `.github/workflows/native-ci.yml`

次だけを主な責務とする。

- `pull_request` / `workflow_dispatch` entry
- visual capture inputs
- workflow-level permissions / concurrency / shared version定数
- Native change detection
- top-level job names
- `needs` / `if` / timeout / runner
- checkout / setup Action
- Artifact upload / download Actionとartifact name
- Formal Maestro Flow、Training baseline、Production-validation Flowのstep単位の順序と可視性
- `native-ios-ci.yml`呼び出し
- `native-ci / verify`のfail-closed aggregation

複雑なOS操作、bundle extraction、visual capture、evidence収集の実装詳細は持たない。

### 5.2 新規Native CI helper

既存`scripts/native/`直下へ追加し、不要なdirectory hierarchyを増やさない。

#### `scripts/native/android-ci-gradle-release.sh`

責務:

- Currentの`:app:assembleRelease`実行
- Gradle JVM memory / architecture等、build command固有の引数
- Gradle log出力

責務外:

- Expo prebuild
- SDK install
- Artifact upload
- Automation / Production metadata判定
- APK保存名決定

Automation / Production jobの環境変数はworkflow側を正本とし、このscriptにbuild kindのpolicy判断を持たせない。

#### `scripts/native/android-ci-production-bundle-guard.sh`

責務:

- Automation / Production APKの存在確認
- APK内のJavaScript / Hermes candidate抽出
- HBC候補の一時展開
- `validate:native-production-bundle`へ正しい引数を渡す

責務外:

- Artifact download
- Production policy自体の再定義

既存`scripts/validate-native-production-bundle.ts`を判定の正本として維持する。

#### `scripts/native/android-ci-emulator-start.sh`

責務:

- AVD作成
- Emulator起動
- ADB readiness
- `sys.boot_completed`
- package service readiness
- animation scale等のruntime初期化

責務外:

- SDK / system image install
- APK install
- Maestro Flow
- visual profile
- evidence upload

#### `scripts/native/android-ci-visual-profile.sh`

責務:

- manual visual capture時のcanonical Android profile設定
- root利用可否の観測
- ja-JP provisioning
- font scale / UI mode / orientation / density設定
- effective profileのfail-close確認
- 後続captureが利用する観測値の出力

責務外:

- Capture Case選択
- screenshot生成
- canonical asset promotion

#### `scripts/native/android-ci-visual-capture.sh`

責務:

- `capture_case_key`解決
- `android-visual-capture.ts list-cases / describe-case`
- caseごとのsetup / ready条件引き渡し
- Maestro visual capture
- screencap
- manifest / batch manifest生成

責務外:

- canonical repository assetへのpromotion
- profile値の独自決定

#### `scripts/native/android-ci-runtime-evidence.sh`

責務:

- Runtime成功 / 失敗時のbounded evidence収集
- ADB / package / emulator / APK metadata
- JUnit / Maestro artifact集約
- full logcat / dumpsysを失敗時だけ収集するCurrent契約

責務外:

- `actions/upload-artifact`
- Runtime pass / failの意味変更

### 5.3 既存`scripts/native/android-maestro-run.sh`

Formal / Trainingの共通startup helperとして維持し、今回意味変更しない。

## 6. change detection

`detect`へ次を追加する。

```text
scripts/native/android-maestro-run.sh
scripts/native/android-ci-*.sh
```

`scripts/native/**`全体には広げない。

理由:

- Windows local専用script変更だけでGitHub Native CIを起動する必要はない。
- GitHub Native CIが実際に利用するhelperだけを検知対象にする。
- 新規helper追加後、そのhelper単独変更でNative jobがskipされる状態を防ぐ。

Contract testでこのpath契約を固定する。

## 7. Contract test変更

主に`tests/contracts/native-ci-workflow.test.ts`を更新する。

### 7.1 workflowの構成契約

次を継続検証する。

- job名
- `needs`
- `if`
- RuntimeのAutomation / Production OR条件
- Production Bundle Guardとの関係
- artifact name / download path
- Maestro Flow順序
- Training baseline位置
- iOS reusable workflow呼び出し
- final `verify`のNative変更あり / なしのfail-close契約

### 7.2 helperの責務契約

テストから新規scriptを読み込み、現在workflow本文に対して行っている意味検証を責務ownerへ移す。

例:

- Gradle build command / memory設定 -> `android-ci-gradle-release.sh`
- Hermes candidate抽出 -> `android-ci-production-bundle-guard.sh`
- AVD / boot / package readiness -> `android-ci-emulator-start.sh`
- locale / density / root fallback -> `android-ci-visual-profile.sh`
- Capture Case / manifest -> `android-ci-visual-capture.sh`
- failure-only full diagnostics -> `android-ci-runtime-evidence.sh`

同時に、workflow側が各helperを正しいstep / `if`条件で呼ぶことを検証する。

### 7.3 再膨張防止

新しい行数上限や独自complexity scoreは追加しない。

代わりに、移動した責務の主要markerが`native-ci.yml`へ重複して戻っていないことを、既存contract testの範囲で必要最小限確認する。

## 8. Documentation

責務変更はProject Contextへ反映する。

実装時に次を更新する。

- `docs/PROJECT_CONTEXT.md`
  - `native-ci.yml`がorchestration ownerであること
  - Native CI helperが複雑なOS / capture / artifact inspection implementationを所有すること
  - job / artifact / final gate semanticsは維持したこと
- `docs/history/<timestamp>_native-ci-responsibility-boundary.md`
  - 変更前後のownership
  - 採用しなかったReusable Workflow / Composite Action案
  - 互換性 / 検証結果

既存ADRが保証するAndroid / iOSの品質意味は変更しないため、新しいADRは作らない。

## 9. 実行タスク

- [ ] 1. 実装開始時点の最新`main`を取り込み、`native-ci.yml`、関連test、`PROJECT_CONTEXT.md`にこのPlanを無効化する変更がないか再確認する。
- [ ] 2. `tests/contracts/native-ci-workflow.test.ts`へ、現行job graph / artifact / final gateを固定する回帰contractを先に追加・整理する。
- [ ] 3. `scripts/native/android-ci-gradle-release.sh`を追加し、Gradle build commandだけを移す。
- [ ] 4. `scripts/native/android-ci-production-bundle-guard.sh`を追加し、HBC抽出とvalidator呼び出しを移す。
- [ ] 5. `scripts/native/android-ci-emulator-start.sh`を追加し、AVD / boot / package readinessを移す。
- [ ] 6. `scripts/native/android-ci-visual-profile.sh`と`android-ci-visual-capture.sh`を追加し、manual captureのprofileとcapture責務を分離する。
- [ ] 7. `scripts/native/android-ci-runtime-evidence.sh`を追加し、runtime evidence収集を移す。
- [ ] 8. `native-ci.yml`を各helper呼び出しへ置き換える。step名、`if`、job graph、Artifact Action、Maestro Flowのstep粒度は維持する。
- [ ] 9. `detect`へ`android-maestro-run.sh`と`android-ci-*.sh`を追加する。
- [ ] 10. Contract testのassertion ownerをworkflow / helperへ分け、重複実装を検出できる状態にする。
- [ ] 11. `docs/PROJECT_CONTEXT.md`とhistoryを実装後ownershipへ同期する。
- [ ] 12. focused test、shell syntax、full contract、repository標準verifyを実行する。
- [ ] 13. PR CIでMobile App CIの通常Native pathとfinal gateを確認する。
- [ ] 14. manual dispatchでvisual capture pathを1 caseだけ実行し、profile / capture / artifact / final gateを確認する。
- [ ] 15. Issue #130の完了条件に照らし、局所変更時のownerと検証範囲をPR本文で説明できることを確認する。

## 10. 検証計画

### 10.1 静的確認

新規shellすべてに対して`bash -n`を実行する。

対象:

```text
scripts/native/android-ci-gradle-release.sh
scripts/native/android-ci-production-bundle-guard.sh
scripts/native/android-ci-emulator-start.sh
scripts/native/android-ci-visual-profile.sh
scripts/native/android-ci-visual-capture.sh
scripts/native/android-ci-runtime-evidence.sh
```

新規scriptはLF、実行可能file modeを維持する。

### 10.2 対象を絞ったcontract test

```bash
pnpm exec vitest run   tests/contracts/native-ci-workflow.test.ts   tests/contracts/ci-workflow.test.ts   tests/contracts/native-test-control-maestro.test.ts   --no-file-parallelism   --maxWorkers=1   --testTimeout=30000
```

### 10.3 Repository標準検証

```bash
pnpm run test:contracts
pnpm run verify
git diff --check
```

Run ArtifactはRepository契約に従いsanitizationを実行する。

### 10.4 Remote CI

PR最新headで少なくとも次を確認する。

- Web CI: success
- Mobile App CI: success
- `native-ci / verify`: success
- Native変更ありのためNative-specific jobが実行され、意図せずskipされていない
- Android Automation / Production APK artifactが従来名で生成される
- Android RuntimeがAutomation / Productionを実行する
- Training Maestro baselineが実行される
- iOS Build-only gateが維持される

### 10.5 optional visual pathの実runtime確認

PR branchを指定した`workflow_dispatch`で次を実行する。

```text
capture_spec_visuals = true
capture_case_key = SCREEN-STOREFRONT-HOME/default/android
```

確認項目:

- canonical profile normalization成功
- root / rootless fallbackのどちらでも既存fail-close条件を満たす
- 1 caseのcapture成功
- visual artifact / manifest生成成功
- repository canonical assetを自動変更しない
- `native-ci / verify`成功

全case captureは今回のRefactor検証には要求しない。

## 11. 完了条件

次をすべて満たしたらIssue #130の実装完了候補とする。

- 現在のjob graphと保証意味を維持している。
- `native-ci.yml`がorchestration責務を中心とし、Gradle build command、Hermes extraction、Emulator startup、visual profile / capture、runtime evidenceの詳細実装を直接所有していない。
- 各移動責務の責務を持つfileを一意に説明できる。
- Android build、Hermes guard、visual capture、runtime evidenceの局所修正で、無関係なfinal gateや他責務の実装本文を編集する必要がない。
- Artifact名、download / upload経路、Automation / Production保証が不変。
- Formal MaestroとTraining baselineの実行意味が不変。
- Android Runtimeの部分診断実行条件とfinal verifyのfail-close条件が不変。
- Native CI helper変更でNative-specific CIが起動する。
- focused contract、`test:contracts`、`verify`、shell syntax、`git diff --check`がPASS。
- PR Mobile App CIがPASS。
- visual capture 1 caseのmanual dispatchがPASS。
- Product code / Product behaviorの変更がない。
- 新しいReusable Workflow階層、Composite Action framework、独自CI DSLを追加していない。

## 12. リスクと対策

### helper移動で環境変数の伝播方法が変わる

対策:

- workflow step間で必要な値は現在どおり`$GITHUB_ENV` / `$GITHUB_OUTPUT`を使う。
- script process内だけで必要な値と後続stepへ渡す値を区別する。
- helper化を理由に新しいJSON state fileや独自manifestを作らない。

### step粒度を失って診断性が下がる

対策:

- Formal / Training Maestro Flow、Artifact Action、主要setupのstep名はworkflowへ残す。
- 一つのscriptへ複数の独立責務をまとめない。
- scriptは標準出力 / 標準エラーとexit codeでfail-closeする。

### visual captureはPR通常実行で通らない

対策:

- static contractと`bash -n`だけで完了にしない。
- branch manual dispatchで1 caseを実runtime確認する。

### path detection漏れでNative CIがskipする

対策:

- GitHub Native CIが直接利用する`android-maestro-run.sh`と`android-ci-*.sh`を明示的にdetect対象へ追加する。
- contract testでpathを固定する。

## 13. ロールバック

Database、migration、external state変更はない。

問題が発生した場合は、このRefactor commit群をrevertしてinline実装へ戻せる。Artifact名、job名、workflow entryを変更しないため、ロールバック時に外部migrationは不要。

## 14. 対象外

- Native CI全体の再設計
- Android / iOS保証レベル変更
- iOS Runtime / Simulator / Maestro追加
- Maestro Flow内容の改善
- Gradle / Expo / Maestro / Action version更新
- runner変更
- timeout tuning
- Self-hosted runner
- Native jobの並列度変更
- Product code変更
- Windows local validationのRefactor
- 全`scripts/native/**`をNative change detectionへ追加すること
- 新規dependency導入

## 15. 未解決事項

実装開始を止める未解決事項はない。

実装時点でlatest `main`がjob graph、Artifact契約、Native保証意味を変更していた場合だけ、このPlanをそのまま適用せずrebaselineする。
