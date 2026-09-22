# Issue #130 Native CI workflow責務境界整理 Plan

## 0. 依頼概要

- 対象Issue: #130 `refactor: Native CI workflowの責務境界を整理する`
- 作業branch: `plan/issue-130-native-ci-responsibility-boundary`
- branch作成時の`main`: `2a76df4e7c4efabfc1e50ce4a4b0d88c92ddabd3`
- 再レビュー時の`main`: `8d73289350d45e28b4186c47caa32ad8d4809657`
- `2a76df4`から`8d73289`までの`main`差分はIssue #163のSecurity fallback 3ファイルだけで、Native CI関連fileは変更されていない。
- このPlanではNative CI実装、PR作成、merge、Issue closeを行わない。

## 1. 結論

現在の`main`でもIssue #130の問題は残っているため、Refactorは必要と判断する。

問題は`.github/workflows/native-ci.yml`の行数ではなく、build、Production Bundle Guard、Android runtime、visual capture、Training、iOS接続、final gateという変更理由の異なる責務が同一fileへ集まり、局所修正でも広い範囲を読み直す必要があること。

再レビュー後は次の最小構成を採用する。

1. `.github/workflows/native-ci.yml`はtop-level orchestrationを維持する。
2. Android Automation / Production buildは、job IDを維持したまま新しいReusable Workflowへ委譲する。
3. Production Bundle Guardはjob境界を維持し、APKからHermes `.hbc`を取り出す処理を既存`validate-native-production-bundle.ts`へ寄せる。新しいshell wrapperは作らない。
4. `android-runtime`は親workflowに残し、過去に独立した修正理由を持つEmulator起動、visual profile、visual capture、runtime evidenceだけを責務別scriptへ移す。
5. Automation / Production APK install / launch、Maestro Flow各step、SDK / Maestro setup、launcher stabilizationはworkflowへ残す。step単位の診断性を維持し、今回新しい抽象化を増やしてまで移動する根拠が不足しているため。
6. Native change detectionは通常PRで実行される経路だけを追加対象とし、manual visual専用helperを理由に通常Native CI全体を起動しない。
7. job ID、Artifact名、runner、Action SHA、Automation / Productionの保証意味、Formal / Trainingの境界、visual captureのmanual-only契約、final fail-closed semanticsは変更しない。

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

- 現在のAutomation / Production buildはそれぞれ約200行あり、SDK解決、component install、metadata、prebuild、APK verify、Artifact、evidenceがほぼ同じ。
- 12行程度のGradle commandだけを移しても、build責務の変更面はほとんど狭まらない。
- Issue #130の「理解・変更・検証範囲を限定する」という目的に対する効果が弱い。

#### 案B: Automation / Production job IDを維持し、同じReusable Workflowを2回呼ぶ

採用する。

GitHub ActionsではReusable Workflowをjob単位で呼び出せ、caller jobに`name`、`uses`、`with`、`needs`、`if`等を持たせられる。後続jobはcaller jobを通常の`needs.<job_id>`として扱える。

公式仕様:

- https://docs.github.com/en/actions/reference/workflows-and-actions/reusing-workflow-configurations
- https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/pass-job-outputs

今回のbuild jobから後段へ渡すworkflow outputは不要で、成果物は既存Artifact名で受け渡す。そのため追加する状態伝播契約はinputだけに限定できる。

Repositoryのactive ruleset `main-protection`でrequired status checkとして固定されているのは`validate`のみ。Android build job名はrequired status checkとして固定されていないため、Reusable Workflow化によってbranch protectionのrequired check名を壊す根拠は確認されていない。

新規file:

```text
.github/workflows/native-android-build.yml
```

caller側job IDは維持する。

```text
android-automation-build
android-production-build
```

Reusable Workflowのinputは現在存在する差異だけに限定する。

```text
build_kind: automation | production
artifact_name
artifact_filename
build_evidence_artifact_name
```

`build_kind`以外の将来用inputは追加しない。

Reusable Workflow内で`build_kind`をfail-close検証し、現在の環境変数を設定する。

| build_kind | EXPO_PUBLIC_APP_ENV | EXPO_PUBLIC_BUILD_KIND | EXPO_PUBLIC_TEST_MODE |
|---|---|---|---|
| automation | automation | automation | `"true"` |
| production | production | production | `"false"` |

`EXPO_PUBLIC_DEFAULT_SEED=default`は両方で維持する。

caller workflowのworkflow-level `env`はcalled workflowへ自動伝播しないため、Node / pnpm / Husky等のbuildに必要な定数はcalled workflow側へ明示する。callerの暗黙継承を前提にしない。

runner、timeout、setup Action、Gradle memory、x86_64、Expo prebuild、APK verify、Artifact upload、build evidenceの意味を現在と同じにする。

### 4.2 Android Runtime全体のReusable Workflow化

採用しない。

- RuntimeはAutomation / Production buildの個別resultとProduction Bundle Guard resultを使い、成功した経路だけ部分的に実行する。
- Runtimeを子workflowへ移すと、caller resultをinput等で再伝播する必要が生じる。
- `native-ci.yml`上で現在見えている部分診断条件とfinal gateの関係が遠くなる。
- Issue #130の目的に対して追加の状態伝播が増える。

### 4.3 Production Bundle Guard

新しい`android-ci-production-bundle-guard.sh`は作らない。

現在の意味上の正本は`scripts/validate-native-production-bundle.ts`であり、workflow shellはAPKから`.hbc`候補を展開してvalidatorへ渡している。

実装では既存validatorへ次の明示入力を追加する。

```text
--automation-apk-path
--production-apk-path
```

validatorがAPKの存在、通常file、bundle / hbc candidate、temp extraction、Hermes decode対象をfail-closeで解決する。

既存の`--automation-bundle-path` / `--production-bundle-path`はローカル / targeted validation互換性のため維持する。

`production-bundle-guard` job自体、両Artifact download、`needs`、job resultは維持し、job内は既存validator呼び出しを中心にする。

### 4.4 Runtime inline実装

「長いから移す」ではなく、次の両方を満たす処理だけをscriptへ移す。

- workflow orchestrationとは別の変更理由を持つ。
- 移動後、その責務だけを変更・contract testでき、無関係なruntime step本文を編集しなくてよくなる。

今回移すのは4つ。

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
- Automation APK verify / install / launch / startup stability
- Formal Maestro各step
- Training Maestro baseline
- Production APK verify / install / launch
- Production-validation Maestro

launcher stabilizationを残す理由は、現在22行の独立stepとして診断可能であり、今回別helperを増やしても変更範囲削減効果が小さいため。将来同stepへ独立した修正が反復した場合に再評価する。

Automation install / launchは約100行あるが、現在のstep condition、`android_automation_install` outcome、後続Maestro開始条件と強く結びつく。今回の修正履歴から独立helper化の必要性までは確認できないため移さない。

## 5. 実装後の責務

### 5.1 `.github/workflows/native-ci.yml`

次を所有する。

- `pull_request` / `workflow_dispatch`
- visual capture inputs
- workflow-level permissions / concurrency / version定数
- Native change detection
- top-level job graph
- `needs` / `if`
- Android build Reusable Workflowの2 caller job
- Production Bundle Guard jobとArtifact download
- Android Runtimeのstep構成、step ID、step condition
- Artifact upload / download Action
- Formal Maestro / Training / Production-validationの実行順
- `native-ios-ci.yml`呼び出し
- `native-ci / verify`

workflowに残すinline処理は、「stepとして独立表示する診断価値がある」「現在のjob / step conditionと密接」「今回移動しても変更範囲削減効果が小さい」のいずれかを満たすものに限定する。

### 5.2 `.github/workflows/native-android-build.yml`

Android Automation / Production buildの共通owner。

責務:

- checkout / pnpm / Node / Java / Gradle setup
- build kindのfail-close検証
- Automation / Production runtime metadata確認
- Expo prebuild
- Android SDK build component解決 / install / verify
- `:app:assembleRelease`
- Gradle JVM memory / x86_64指定
- APK存在・bundle確認
- 固定filenameへの保存
- APK Artifact upload
- build evidence収集 / upload

責務外:

- Emulator
- Runtime / Maestro
- Production marker policy
- visual capture
- final gate

### 5.3 `scripts/validate-native-production-bundle.ts`

現在のHermes marker policyに加え、Actual APKから検査対象`.hbc`を取り出す責務を持つ。

- bundle path入力とAPK path入力を混在させない。
- Automation / Productionの両入力を必須にする。
- APK path入力時は各APKから1件以上の`.hbc`を取得できない場合fail-close。
- raw byte marker scanへ戻さない。
- temp directoryはprocess終了後にcleanupする。
- marker判定ロジックは現在の`inspectBundles()`を正本として維持する。

### 5.4 `scripts/native/android-ci-emulator-start.sh`

責務:

- AVD作成
- Emulator起動
- ADB readiness
- `sys.boot_completed`
- package service readiness
- animation scale等のruntime初期化
- 現在`android_emulator_ready` stepが後続へ渡す環境状態の維持

責務外:

- SDK / system image install
- launcher stabilization
- APK install
- Maestro CLI / Flow
- visual profile
- evidence upload

### 5.5 `scripts/native/android-ci-visual-profile.sh`

manual visual capture専用。

- adb root可否の観測
- ja-JP provisioning
- root解除後の非root観測
- settings / package service readiness
- font scale / UI mode / orientation / density設定
- observed profile JSON生成
- `android-visual-capture.ts validate-profile`呼び出し
- `ANDROID_OBSERVED_PROFILE_JSON`の後続step引き渡し

### 5.6 `scripts/native/android-ci-visual-capture.sh`

manual visual capture専用。

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

### 5.7 `scripts/native/android-ci-runtime-evidence.sh`

- 成功時のbounded metadata
- failure時だけのAVD listing / dumpsys / logcat / full emulator log / APK copy等
- JUnit / Maestro artifact集約
- Test Control / Contract Harness signal抽出

`actions/upload-artifact`自体はworkflowへ残す。

### 5.8 `scripts/native/android-maestro-run.sh`

Formal / Training / visual captureの共有startup helperとして維持する。今回意味変更しない。

## 6. change detection

### 6.1 通常PRで追加するpath

`detect`へ次を明示追加する。

```text
.github/workflows/native-android-build.yml
scripts/native/android-maestro-run.sh
scripts/native/android-ci-emulator-start.sh
scripts/native/android-ci-runtime-evidence.sh
```

理由:

- 通常PRのMobile App CIで直接実行される。
- 変更時にNative-specific jobを実際に通す必要がある。
- exact pathで十分で、`scripts/native/**`や`android-ci-*.sh`のwildcardへ広げない。

### 6.2 manual visual専用path

次は通常PRの`native_changed`へは追加しない。

```text
scripts/native/android-ci-visual-profile.sh
scripts/native/android-ci-visual-capture.sh
scripts/spec/android-visual-capture.ts
scripts/spec/android-visual-setup.ts
scripts/spec/visual-registry.ts
```

理由:

- `capture_spec_visuals=true`の`workflow_dispatch`でのみruntime実行される。
- 通常Native CIを起動してもvisual pathはskipされ、変更箇所のruntime validationにならない。
- 通常PRではcontract / typecheck等で静的契約を確認し、visual関連変更時の完了条件としてbranch `workflow_dispatch`の1 case実行を要求する。

このIssueで新しい`visual_changed` outputや専用自動workflowは追加しない。

### 6.3 既存path

`scripts/validate-native-production-bundle.ts`は既に`detect`対象のため維持する。

## 7. Contract test変更

主に`tests/contracts/native-ci-workflow.test.ts`を更新する。

### 7.1 親workflow

- caller job ID `android-automation-build` / `android-production-build`
- 両jobが同じ`native-android-build.yml`を呼ぶこと
- callerの`build_kind` / Artifact名 / filename
- `production-bundle-guard`の`needs`
- RuntimeのAutomation / Production OR条件
- Production Bundle Guard result条件
- Artifact producer / consumer name
- Android Runtime step順
- Formal Maestro / Training / Production-validation順
- `native-ios`
- `verify`のNative変更あり / なしfail-close

### 7.2 Android build Reusable Workflow

新規workflow本文を読み込み、次を固定する。

- `workflow_call`
- 許可するbuild kind
- Automation / Production metadata mapping
- Expo prebuild
- SDK build components
- `assembleRelease`
- `-Xmx4g -XX:MaxMetaspaceSize=1g`
- `-PreactNativeArchitectures=x86_64`
- APK verify
- caller指定Artifact名 / filename利用
- build evidence
- Emulator / Maestroを含まない

### 7.3 Production Bundle Guard

validatorのtargeted testを追加または既存contractへ追加する。

- valid Automation APK + valid Production APK
- APK内に`.hbc`がない場合fail-close
- Automation / Production crossed inputでfail-close
- Productionへ禁止markerがある場合fail-close
- 既存bundle path入力が引き続き利用可能
- APK pathとbundle pathの曖昧な混在を拒否

`native-ci-workflow.test.ts`ではjobがActual APK pathをvalidatorへ渡し、workflow自身がHermes candidate extractionを持たないことを確認する。

### 7.4 runtime helper

現在workflow本文へ向いているassertionを責務ownerへ移す。

- Emulator start / boot -> `android-ci-emulator-start.sh`
- visual profile -> `android-ci-visual-profile.sh`
- Capture Case / manifest -> `android-ci-visual-capture.sh`
- failure-only diagnostics -> `android-ci-runtime-evidence.sh`

workflow側では正しいstep name / `if` / helper invocation / step ID /順序を確認する。

launcher stabilizationとAPK install / launch assertionはworkflow側へ残す。

### 7.5 再膨張防止

行数上限や独自complexity scoreは追加しない。

移動した責務の主要markerが`native-ci.yml`へ重複して戻っていないことだけ、既存contract testで必要最小限確認する。

## 8. Documentation

更新対象:

- `docs/PROJECT_CONTEXT.md`
  - 親workflow、Android build Reusable Workflow、runtime helper、bundle validatorの責務
  - job / Artifact / final gate semantics不変
- `docs/history/<timestamp>_native-ci-responsibility-boundary.md`
  - Current Evidence
  - Reusable Workflow比較
  - 変更前後の責務
  - 検証結果

既存ADRの品質保証意味は変更しないため、新しいADRは作らない。

## 9. 実行タスク

- [ ] 1. 実装開始時のlatest `main`を確認し、Native CI関連差分があればrebaselineする。
- [ ] 2. 現在のjob ID、Artifact名、Runtime部分実行条件、final verifyをcontract testで先に固定する。
- [ ] 3. `.github/workflows/native-android-build.yml`を追加する。
- [ ] 4. `android-automation-build` / `android-production-build`を別caller jobのままReusable Workflow呼び出しへ変更する。
- [ ] 5. `validate-native-production-bundle.ts`へAPK path入力を追加し、Production Bundle Guardのinline extractionを削除する。
- [ ] 6. `android-ci-emulator-start.sh`を追加し、Emulator起動 / readinessを移す。
- [ ] 7. `android-ci-visual-profile.sh`を追加し、manual profile normalizationを移す。
- [ ] 8. `android-ci-visual-capture.sh`を追加し、manual capture loop / manifest生成を移す。
- [ ] 9. `android-ci-runtime-evidence.sh`を追加し、evidence収集を移す。
- [ ] 10. workflow側のstep名、ID、`if`、Artifact Action、Maestro step粒度、launcher stabilization、APK install / launchを維持する。
- [ ] 11. 通常PR用change detectionへ`native-android-build.yml`、`android-maestro-run.sh`、通常runtime helper 2本をexact pathで追加する。
- [ ] 12. manual visual専用fileは`native_changed`へ加えず、contract + manual dispatchで検証する契約をtest / docsへ反映する。
- [ ] 13. `native-ci-workflow.test.ts`等のassertion ownerをworkflow / Reusable Workflow / validator / helperへ移す。
- [ ] 14. `PROJECT_CONTEXT.md`とhistoryを同期する。
- [ ] 15. local static / focused / full validationを実行する。
- [ ] 16. PR Mobile App CIで通常Native pathとfinal gateを確認する。
- [ ] 17. visual関連変更を含むためbranch `workflow_dispatch`で1 caseを実runtime確認する。
- [ ] 18. Issue #130の成功状態に照らし、各責務のownerと局所変更時の検証範囲をPR本文へ記載できることを確認する。

## 10. 検証計画

### 10.1 YAML / shell / TypeScript

- Reusable Workflowを含むworkflow contract test。
- 新規shell 4本に`bash -n`。
- 新規shellはLFを維持する。
- 実行はworkflowから`bash <path>`で行い、executable bitは要求しない。
- validator変更はtypecheck対象とする。

### 10.2 対象を絞ったtest

```bash
pnpm exec vitest run \
  tests/contracts/native-ci-workflow.test.ts \
  tests/contracts/native-test-control-maestro.test.ts \
  --no-file-parallelism \
  --maxWorkers=1 \
  --testTimeout=30000
```

Production Bundle Guardのtargeted test fileを新設した場合は同じ実行へ加える。

### 10.3 validatorの直接確認

既存bundle path modeを維持して確認する。

```text
Automation bundle + Production bundle => PASS
crossed bundle input => FAIL
```

追加APK modeをfixture / targeted testで確認する。

```text
valid Automation APK + valid Production APK => PASS
missing HBC => FAIL
crossed APK / forbidden Production marker => FAIL
mixed APK path + bundle path => FAIL
```

### 10.4 Repository標準検証

```bash
pnpm run test:contracts
pnpm run verify
git diff --check
```

Run ArtifactはRepository契約に従いsanitizationする。

### 10.5 Remote CI

PR最新headで次を確認する。

- Web CI: success
- Mobile App CI: success
- `android-automation-build`: success
- `android-production-build`: success
- `production-bundle-guard`: success
- `android-runtime`: success
- `native-ios`: success
- `native-ci / verify`: success
- Artifact名 / filenameが現在と同じ
- Training baselineが実行される
- Native変更なし時のskip契約が維持される

caller job IDと最終`needs.<job>.result`が現在の意味を維持していることを実runでも確認する。

### 10.6 manual visual path

branchを指定して次を実行する。

```text
capture_spec_visuals = true
capture_case_key = SCREEN-STOREFRONT-HOME/default/android
```

確認項目:

- adb root capability観測
- canonical profile normalization
- non-root effective profile確認
- 1 case capture
- raw PNG / per-case manifest / batch manifest
- visual Artifact upload
- canonical assetを自動変更しない
- `native-ci / verify` success

全case captureは今回要求しない。

## 11. 完了条件

- Current EvidenceにPhase 6後のPR #133修正まで含まれている。
- `android-automation-build` / `android-production-build`のjob IDと個別resultが維持されている。
- Android build実装のownerが`native-android-build.yml`へ集約され、親workflowでbuild手順を重複保持していない。
- Production Bundle GuardのHermes extraction ownerが既存validatorへ集約され、新しい薄いshell wrapperを追加していない。
- Emulator start、visual profile、visual capture、runtime evidenceのownerを一意に説明できる。
- launcher stabilization、APK install / launch、Formal / Training / Production-validation stepをworkflowへ残す理由を説明できる。
- Artifact名、filename、upload / download経路が不変。
- Runtimeの部分診断条件が不変。
- final fail-closed semanticsが不変。
- manual visual-only変更を通常Native CI起動だけで「検証済み」と誤認しない。
- `android-maestro-run.sh`等の通常runtime helper変更でNative CIがskipされない。
- focused test、validator test、`test:contracts`、`verify`、`bash -n`、`git diff --check`がPASS。
- PR Mobile App CIがPASS。
- manual visual 1 caseがPASS。
- Product behaviorを変更していない。
- Composite Action、独自CI DSL、汎用runner、将来用inputを追加していない。

## 12. リスクと対策

### Reusable Workflow化で環境変数が暗黙に失われる

caller workflowの`env`はcalled workflowへ自動伝播しない。

対策:

- called workflowで必要なversion定数を明示する。
- build差異は`workflow_call` inputからfail-closeで設定する。
- callerの暗黙`env`継承を前提にしない。
- Artifact以外のcross-workflow stateは追加しない。

### caller jobの意味が変わる

対策:

- job IDを変更しない。
- `needs` / `if`をcallerへ維持する。
- final verifyは現在の`needs.android-automation-build.result` / `needs.android-production-build.result`を維持する。
- Remote CIでjob resultとArtifactを確認する。
- active rulesetのrequired status `validate`を変更しない。

### helper移動で`GITHUB_ENV` / `GITHUB_OUTPUT`が変わる

対策:

- 後続stepが読む既存変数名を変更しない。
- helper内だけの値と後続stepへ渡す値を分ける。
- 新しいJSON state file等を導入しない。

### visual helperは通常PRでruntime実行されない

対策:

- `native_changed`へ無意味に追加しない。
- contract testでstatic wiringを固定する。
- 今回の変更ではbranch manual dispatch 1 caseを完了条件にする。

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

