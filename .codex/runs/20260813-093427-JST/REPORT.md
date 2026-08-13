# Report (append-only)

## 2026-08-13 14:18 JST — PR #25 review/fix follow-up

### Summary

- CodeRabbit 22件をCurrent code / Repository contract / Planへ再照合し、validな不備を修正、invalidなscope / 未来日付指摘は採用しなかった。
- Native Training baselineをProduction APK切替前へ移動し、Training Workflow Trust Boundary、Maestro checksum、Workbook Traceability、Windows Android fail-closeを実装した。
- Training Web desktop / mobile / expected-failure、Android Training baseline、full test、`pnpm run verify`までローカルPASSした。
- final commit SHA、remote Required CI、exact-SHA Training Copy、Fresh Learner full journeyは未完了であり、100%完了とは扱わない。

### CodeRabbit 22件の再評価

| Finding | 判定 | 対応 |
| --- | --- | --- |
| PLAN / Run artifactの状態が古い | valid | 新active Runへcurrent stateを記録。過去REPORTはappend-onlyで保持 |
| strict run.jsonにscopeが必要 | invalid / out of scope | canonical `.codex/templates/RUN_MANIFEST.json`にscopeがないためschema追加なし |
| Training baselineがProduction APK install後 | valid P0 | `.github/workflows/native-ci.yml`の順序とcontract testを修正 |
| Workbookの8 Sheet説明不足 | valid | 4 canonical CSVと8 conceptual viewsの対応表を追加 |
| Workbook blank rule不足 | valid | README /教材へ段階的入力条件を明記、sampleのNot run evidenceを空欄化 |
| RubricのMaestro flow数曖昧 | valid | 合否は意味あるNative Flow最低1本、2本以上はPractice Volumeへ整理 |
| Desktop / Mobile / Accessibility不一致 | valid | MobileをRequired、Accessibilityを追加観点へ統一 |
| Android_HOME教材不整合 | valid | SDK RootをANDROID_SDK_ROOT→ANDROID_HOMEへ正規化 |
| Android build / baseline / cleanup fail-close不足 | valid | `$LASTEXITCODE`、try/finally、serial解決、Stopを教材へ反映 |
| locator placeholder | valid | Scenario Shop実例のaccessible name `カートに追加`へ修正 |
| capstone Android capability unavailable | valid | blocked_environment / not_completed記録を明示し、完了PASSへ読み替えない |
| legacy capstone link | valid | canonical `./09_part1-capstone.md`へ修正 |
| 2026-08-13 future-date history | invalid | 現在日付が2026-08-13 JSTで実行Evidenceも8/13のため変更なし |
| sdkmanager fallback null | valid | cmdline-tools directory / candidate存在を検査してfail-close |
| expected-failure stale artifact | valid | 実行前にevidence rootを再帰削除し、今回生成Evidenceだけを検査 |
| Windows Maestro path handling | valid | shell不要のspawnとWindows command line quotingを実装、serial / timeout維持 |
| Training Copy regex Trust Boundary | valid | `yaml`構造parseでsteps uses/runを検査、multiline / bracket secrets fixture追加 |
| CRLF permissions検査 | valid | workflow構造validatorへ寄せ、LF固定検査を残さない |
| contract testの実装文字列依存 | valid | Curriculum正本をvalidatorへ寄せ、runner behaviorはbehavior testへ整理 |
| Maestro ZIP checksum | valid | SHA-256固定値とunzip前`sha256sum --check`を追加 |

### 独自追加Finding

- Workbook BR / ACがregex上正しくてもNormative Specificationに存在しないIDをPASSし得たため、既存canonical spec parserを利用してfile単位の実在確認を追加した。
- Workbook 4 CSVのrisk_id / test_case_id参照整合性、重複、ID形式、RFC 4180相当のquoted comma / escaped quote / CRLFをvalidatorとfixtureで検証した。
- Training Workflowのnamed `uses`、multiline `run`、`${{ secrets['TOKEN'] }}`、self-hosted、deploy / Cloudflare境界を構造検査とnegative fixtureで検証した。
- Android helperで単一接続Emulatorがscalarになった場合のPowerShell `.Count`例外を検出し、配列化した。AVD identityを`adb emu avd name`で確認する契約とidempotent cleanupも追加した。

### 主要変更ファイル

- `.github/workflows/native-ci.yml`
- `training/github-actions/training-native-ci.yml`
- `scripts/training/workflow-contract.ts`
- `scripts/training/validate-training-copy.ts`
- `scripts/validate-curriculum.ts`
- `scripts/spec/validate-spec.ts`
- `scripts/training/android-emulator.ps1`
- `scripts/training/run-maestro-baseline.ts`
- `scripts/training/run-expected-failure.ts`
- `tests/contracts/native-ci-workflow.test.ts`
- `tests/contracts/training-curriculum.test.ts`
- `training/workbook/*.csv` / `training/workbook/README.md`
- `docs/curriculum/test-automation/01_spreadsheet-test-design.md`、Rubric、Part 1教材
- `package.json` / `pnpm-lock.yaml`（`yaml@2.9.0` direct devDependencyのみ）

### 22文書 / Curriculum

- `validate:curriculum`は22 required documents、4 canonical Workbook CSV、`training-chromium` / `training-mobile-chromium`をPASS。
- C01〜C12、Level 0〜3、Instructor Reference、Part 1 / Part 2 navigation、Android Build + Runtime / iOS Build-only記述を維持。
- Agentic QA文書はRequired 22文書へ混入させず、canonical Part 1 capstone linkのみ修正。

### Validation

- `pnpm run format:check` => PASS
- `pnpm run lint:markdown` => PASS（0 issues）
- `pnpm run validate:spec` => PASS
- `pnpm run validate:curriculum` => PASS（22 / 4 / 2 projects）
- `pnpm run lint` => PASS（0 errors、既存warning 65件）
- `pnpm run typecheck` / `pnpm run typecheck:training` => PASS
- focused Native / Curriculum contracts => PASS（17 tests）
- `pnpm run test:contracts` => PASS（25 files / 207 tests）
- `pnpm run test` => PASS（unit 66、integration 98、repository 33、web component 76、native Jest 47、contracts 207）
- `pnpm run verify` => PASS（security、全test、Web build、spec buildを含む）
- `git diff --check` => PASS（CRLF warningのみ）
- `pnpm run training:copy:validate` => FAIL-CLOSED（rootがTraining Copyではなくactive workflow allowlist不一致。exact-SHA Copy PASSとは扱わない）

### Training Web

- `PLAYWRIGHT_BASE_URL=http://127.0.0.1:8082 pnpm run training:web:baseline` => PASS（desktop 1/1）
- `PLAYWRIGHT_BASE_URL=http://127.0.0.1:8082 pnpm run training:web:mobile` => PASS（mobile 1/1）
- `PLAYWRIGHT_BASE_URL=http://127.0.0.1:8082 pnpm run training:web:check-expected-failure` => wrapper PASS。内部intentional testはnon-zero、今回runのtrace `.zip`、screenshot `.png`、video `.webm`、HTML reportを確認。
- Training runtimeはこのworktreeのdedicated `127.0.0.1:8082`を使用し、8081 / 8083を再利用していない。

### Android / marker / cleanup

- Marker: `QA_STORE_COORD_DIR`配下 `visual-android-released.json`を再確認。`status=blocked`だが `android_runtime_released=true` / `next_agent_can_use_android=true` のため独立検証を開始した。Visual threadは停止・resetしていない。
- Training Doctor初回はemulator component不足でfail-close。既存SDKへemulator / API34 google_apis x86_64を導入後、Doctor / Prepare / StartをPASS。
- Training AVD: `scenario-shop-training-api34`、API34、x86_64、single serial `emulator-5554`、package service readyを確認。
- current worktree専用短縮Junctionとshort virtual storeでAutomation Release APKをBuild。Gradle logは`BUILD SUCCESSFUL`、APKは1 JS bundle / 27 x86_64 libraries、59,319,797 bytes、SHA-256は`.artifacts/native-local/20260813-133500-curriculum-review-android-training-shortpath/build/apk-info-after-timeout.txt`へ保存。
- Install => PASS、Smoke => PASS、Training Maestro baseline => PASS（`native-training-baseline` 1/1）。Formal `maestro/` Flowは実行していない。
- Evidence: `.artifacts/native-local/20260813-133500-curriculum-review-android-training-shortpath/evidence/`にscreen、UI hierarchy、Maestro hierarchy、logcat、activitiesを保存。
- cleanup: Training emulator停止済み。idempotent Stopを再確認し、ADBには物理端末のみ残った。Android Runtimeを占有していない。

### Remaining blockers / CI

- 修正後commitがないため、現uncommitted worktreeをFinal Candidate SHAとして扱わない。
- 修正後のSource Required Phase 1 / Native CI remote Runは未実行。旧PR #25 /旧HEADのEvidenceを最終Evidenceへ流用しない。
- exact-SHA Training Copy Web baseline、Android baseline、expected-failure actual conclusion=failure、3 remote Delivery Readiness runs、Delivery前後SHA equalityは未実行。
- Fresh checkout / Fresh Training CopyからのLearner READMEのみを使うfull journeyは未完了。個別local PASSから完走PASSへ読み替えない。
- iOS RuntimeはRequiredへ昇格していない。Current iOS保証はBuild-only。

### Progress

Progress: 86% (12/14)

## Deletion candidates

- Codexはファイルやディレクトリを削除しない。
- 今回の`.artifacts/native-local/`、`output/`、生成`android/`、short-path junctionは再生成可能な実行環境成果物であり、Repository source diffへ追加しない。必要なcleanupはRunbookのruntime Stopで実施済み。
