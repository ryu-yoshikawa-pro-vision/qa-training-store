# Report（追記のみ）

## 2026-09-22 18:23 (JST)

- Summary: Issue #130の現在の構成確認を実施し、Refactorが現在も必要と判定した。最新`main`から`plan/issue-130-native-ci-responsibility-boundary`を作成し、実装前Planを確定した。
- Changes: 保存Planと本Runの`PLAN.md` / `TASKS.md` / `REPORT.md`のみを追加する。Native CI実装、Product code、PR metadataは変更しない。
- 判断 / 理由: job graphをReusable Workflowへ再分割せず、orchestrationは`native-ci.yml`へ維持し、Gradle build command、Hermes guard、Emulator startup、visual profile / capture、runtime evidenceの高変更頻度inline Bashを既存`scripts/native/*.sh`パターンへ分離する。現在のRuntimeはAutomation / Production buildの個別resultを使った部分診断実行を持ち、final verifyで両方をfail-closeするため、jobを子workflowへ隠すと状態伝播が増える。既存`android-maestro-run.sh`がNative change detection対象外であることも確認し、実装Planへ含めた。
- Validation: Issue #130、Phase 6 report、Current `native-ci.yml`、`native-ios-ci.yml`、`native-ci-workflow.test.ts`、`PROJECT_CONTEXT.md`、repair commits `53ae9d7` / `8381a80` / `bb064ac` / `41ad95b` / `f3ba3e3` / `9b3a396`をGitHub上で確認した。Plan-onlyのためRepository runtime test / CIは未実行。
- ブロッカー / 残作業: Plan作成タスクとしてはなし。実装開始時にlatest `main`へrebaselineし、保存Planの順序で実装する。
- Subagent:
  - Delegation: なし。
  - Result: N/A。
  - 親Agentの判断: N/A。
- Progress: 100% (7/7)

## 削除候補

| パス | 理由 | 推奨対応 |
|---|---|---|
| なし | - | - |

## 2026-09-22 — 再レビュー反映

- 概要: 保存PlanをIssue #130の目的から再レビューし、Current Evidenceと具体策の選定根拠を修正した。
- 最新`main`: `8d73289350d45e28b4186c47caa32ad8d4809657`。branch作成時の`2a76df4`以降はIssue #163のSecurity fallback 3ファイルだけが変わっており、Native CI関連fileは不変。
- 追加根拠: PR #133 / `f6727303`でlauncher stabilization、`android-maestro-run.sh`のANR dismissal、iOS build timeout修正が入っており、Phase 6後にも異なるNative CI repairが継続している。
- 設計変更:
  - Gradle commandだけのhelper化を取り下げ、Automation / Productionのjob IDを維持したReusable Workflow方式へ変更。
  - `android-ci-production-bundle-guard.sh`案を取り下げ、Actual APK extractionを既存`validate-native-production-bundle.ts`へ寄せる。
  - runtime helperを6本固定から4本へ削減。
  - launcher stabilization、APK install / launch、Maestro stepはworkflowへ残す理由を明記。
  - change detectionを通常PRとmanual visual pathで分離し、wildcard追加を取り下げ。
  - 新規shellのexecutable bit必須条件を削除。
- 外部仕様確認: Reusable Workflow caller jobで`name` / `uses` / `with` / `needs` / `if`等が利用可能で、caller workflow-level `env`はcalled workflowへ自動伝播しないことをGitHub Docsで確認した。
- Repository設定確認: active ruleset `main-protection`のrequired status checkは`validate`のみ。Android build job名はrequired statusとして固定されていない。
- 検証: Plan-only修正のためRepository runtime test / CIは未実行。GitHub上のIssue、Current workflow、関連script、contract test、PR #133差分、ruleset、GitHub Docsをread-onlyで確認した。
- ブロッカー: なし。実装開始時にlatest `main`へNative CI関連変更が入っていないかだけ再確認する。
- Progress: 100% (12/12)

## 2026-09-22 — 再レビュー2回目反映

- 概要: 再レビューで残った6件を保存Planへ反映した。最新`main`は`8d73289350d45e28b4186c47caa32ad8d4809657`、Plan branchは修正前`8909bac0f3c581ee07e64a9b7fcf6ac7bc2b116a`で、Native CI関連の追加driftはない。
- Android build:
  - Reusable Workflowのexternal inputを`build_kind`だけへ縮小。
  - Artifact名、filename、Evidence Artifact名はcalled workflow内で`build_kind`から決定。
  - Automation / ProductionのABI検証、Save / Verify順、Gradle log、Evidence差異を現行contractとして固定。
  - callerはjob ID / name / needs / if / uses / build_kindだけを持ち、runs-on / timeout / env / stepsはcalled workflowへ移す。
  - `native-android-build.yml`へworkflow-level `concurrency`を追加しない。
- Production Bundle Guard:
  - APK extractionをTypeScript validatorへ移す案を撤回。
  - `scripts/native/android-ci-production-bundle-guard.sh`をActual APK -> temporary `.hbc` -> existing validatorのadapterとして採用。
  - `scripts/validate-native-production-bundle.ts`のCLI / Hermes marker policyは変更しない。
- visual profile:
  - `Check Android adb root capability` / `id: android_adb_root`はworkflowへ残す。
  - `android-ci-visual-profile.sh`は`Normalize Android canonical visual profile`本文だけを所有する。
- 検証:
  - `native_changed=false`は静的contractで維持する。
  - 実装PRのRemote CIは`native_changed=true`経路だけを実測する。
  - 新規shellはProduction Guardを含む5本。
- Validation: Plan-only修正のためRepository runtime test / CIは未実行。Current workflow、contract test、package dependency、Project Context、GitHub Actions仕様を確認してPlanへ反映した。
- ブロッカー: なし。実装開始時にlatest `main`へNative CI関連driftがないかだけ再確認する。
- Progress: 100% (10/10)

## 2026-09-22 — 最終レビュー指摘反映

- 概要: 実装開始前の最終レビューで残った2件を保存Planへ反映した。
- Current: `main`は`01cd8ab15078d479e821d373445af1e16a469519`。前回基準からの1 commitはIssue #163のSecurity fallback 3ファイルだけで、Native CI関連driftはなし。
- helper境界:
  - Production GuardへAutomation / Production APK pathをworkflow `env:`で明示。
  - Emulator helperの必須env、`ANDROID_AVD_HOME` / `EMULATOR_PID`、既存diagnostic fileを固定。
  - Visual Profile helperの`ADB_ROOT_AVAILABLE`入力と`ANDROID_OBSERVED_PROFILE_JSON`出力を固定。
  - Visual Captureの`CAPTURE_CASE_SELECTION`、GitHub run / commit context、生成PNG / manifest / Maestro evidenceを固定。
  - Runtime Evidenceの`NATIVE_ANDROID_JOB_STATUS`を明示し、前段失敗で欠落し得る`ADB` / APK path等はoptionalのままにした。
- Android build Reusable Workflow:
  - Action SHAだけでなくcheckout credential、pnpm / Node / Java setup、Gradle PR cache、APK / Evidence uploadのmissing-file / overwrite / retention設定を維持契約へ追加。
  - `github.event_name` / `github.run_id`を新規inputへ変換しない。
- 検証: Plan-only修正のためRepository runtime test / CIは未実行。Current workflowのinline stepとAction設定をread-onlyで再確認した。
- ブロッカー: なし。latest `main`にNative CI driftが入らなければPlan上の実装開始条件は満たす。
- Progress: 100% (10/10)

## 2026-09-22 — PR #176 最終レビュー修正

- 概要: PR #176の再レビューで確認した2件を修正した。
- CI failure: 初回Web CI run `35725075877` の `Style Quality` で `pnpm run lint:markdown` が失敗した。
  - `MD034/no-bare-urls`: 保存Plan 155行、156行。
  - `MD012/no-multiple-blanks`: 保存Plan末尾。
- 修正:
  - GitHub Docsの2 URLをMarkdown linkへ変更。
  - 保存Plan末尾を1 newlineへ正規化。
  - Reusable Workflow化で複製される `NODE_VERSION=24` / `PNPM_VERSION=10.34.5` / `HUSKY="0"`について、親workflowとcalled workflowの一致をcontract testで比較する契約を追加。
  - version同期のための新規input、Repository `vars`、共通設定fileは追加しない方針を明記。
- 初回CI観測:
  - Mobile App CI run `35725076127`: success。Plan-only差分のためNative-specific jobsはskipされ、`native-ci / verify`のno-change pathがsuccess。
  - Web CI: Markdown lint以外に確認済みのVitest contracts / unit / integration / repository、Code Quality、build jobs等はsuccess。
- Scope: Plan / Run Artifact / PR本文のみ。Native CI実装は未変更。
- Progress: 100% (6/6)

