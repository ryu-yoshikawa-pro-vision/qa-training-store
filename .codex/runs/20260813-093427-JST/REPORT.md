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

## 2026-08-13 17:02 JST — PR #25追加レビュー repair追補

### Summary

- PR #25の追加レビューをCurrent code、Repository contract、Plan #18へ照合し、追加で有効だったTrust Boundary、Learner Mobile Exercise、Maestro entrypoint、教材sdkmanager fallback、CSV BOMの不足だけを最小差分で修正した。
- 既存のNative Training baseline順序は修正済みであることを確認し、今回再設計していない。Product Business Logic、Formal Regression期待値、Android / iOS保証、Formal Maestro flowは変更していない。
- 変更後のlocal quality gates、focused / full contracts、full test、verify、Training Web 4モード、Android Training baseline 1/1とcleanupを確認した。
- 今回のSource変更により、7c442d3のremote CI結果はFinal Candidate Evidenceではない。修正commit、Fresh Learner full journey、final remote Delivery Readinessは未完了のまま保持する。

### Subagent

- Subagentは使用しなかった。AGENTS.mdのNative delegation markerが`No child subagent delegation`であり、今回のrepairは対象ファイル・negative fixture・local validationが明確だったため、親Agentでreview照合、実装、失敗解釈、採否判断を完結した。別worktreeへの調査・変更は行っていない。

### 追加レビューFindingの判定と対応

| Finding | 判定 | 対応 |
| --- | --- | --- |
| `jobs.*.runs-on`を文字列検索ではなく構造検証する | valid | `workflow-contract.ts`で`ubuntu-24.04`の明示allowlistへ構造照合し、self-hosted / 配列 / expression / 任意runnerを拒否。negative fixture追加 |
| checkoutの`persist-credentials: false`を構造検証する | valid | `actions/checkout@v4`の全stepで`with`のboolean falseを要求。省略 / true fixtureを追加 |
| `pnpm dlx`等のalternate package execution入口を拒否する | valid | `pnpm dlx`、`npm exec` / `npm x`、`yarn dlx`、`bunx`をcommand candidateとして検出し拒否。正当な`adb`等のshell setupはallowlist化していない |
| `curl | bash`等のremote script pipeを拒否する | valid | curl / wgetからbash / sh / zshへのpipeだけをfail-close。通常のcurl download→checksumはPASS |
| Training current workflowの構造検証とnegative behavior test | valid | `training-ci.yml` / `training-native-ci.yml`のcurrent sourceをPASS確認し、unknown action、unapproved command、secret bracket notation等をFAIL確認 |
| Learner ExerciseのMobile実行入口不足 | valid | `training:web:mobile:exercise`を追加し、`training/playwright/exercises` + `training-mobile-chromium`へ接続。Formal E2Eは実行しない |
| `run-maestro-baseline.ts`のmain-module silent-success | valid | pure `maestro-invocation.ts`を追加し、runnerは常に`main()`を呼ぶ構造へ変更。Windowsのspace path / serial / timeout契約を維持 |
| sdkmanager教材がhelperのfallbackと不一致 | valid | ANDROID_SDK_ROOT→ANDROID_HOME、latest優先、cmdline-tools再帰fallback、0件error、取得後install、LASTEXITCODE確認を教材へ追加 |
| CSV parserのUTF-8 BOM | valid | parser入口で先頭BOMだけを除去し、quoted field / escaped quote / CRLF処理は維持。BOM fixture追加 |
| 既存P0のTraining baseline順序を再修正する | already fixed | 7c442d3で解消済みの順序を維持。今回変更なし |
| 既存approved Actionをcommit SHAへ固定する | invalid / out of scope | 今回だけTraining WorkflowへSupply Chain Policyを分裂させない。`@v4` approved action setを維持 |
| `run.json` / `RUN_MANIFEST.json`へ`scope` / `scope_ref`を追加する | not adopted | StrictのScopeはactive `PLAN.md`のScopeで満たす。canonical manifest schemaにfieldがないためschema / new-run / validatorは変更しない |
| 2026-08-13 historyを未来日付として修正する | invalid | 現在日時は2026-08-13 JSTで、実Android Evidenceも同日。既存historyは変更しない |

### Run / PR state

- PR #25の確認済みHEADは`7c442d31a31f669ca55aad8fcca2c915ffcf03aa`。このHEADではPhase 1 CI / Native CIが成功済みだったが、今回さらにSourceを変更したため、旧remote EvidenceをFinal Candidateとして再利用しない。
- `run.json`のschema、`agents_used: []`、`status: partial`、`primary_failure_category: missing_validation`は維持。`scope` / `scope_ref`は追加していない。
- Android local validationは、Build invocationの外側timeoutとGradle `BUILD SUCCESSFUL`、APK independent verification、install、smoke、Training Maestro、cleanupを分離して記録した。今回のrunner-only repairではProduct/APKを再buildせず、既存Automation APKの独立検査後にTraining baselineを実行した。

### Validation

- `pnpm run format:check` => PASS
- `pnpm run lint:markdown` => PASS（0 issues / 248 files）
- `pnpm run validate:spec` => PASS（3 challenges）
- `pnpm run validate:curriculum` => PASS（22 required documents、4 workbook files、2 Training projects）
- `pnpm run lint` => PASS（0 errors、既存warning 65件）
- `pnpm run typecheck` => PASS
- `pnpm run typecheck:training` => PASS
- focused contracts (`training-curriculum.test.ts`, `native-ci-workflow.test.ts`) => PASS（2 files / 18 tests）
- `pnpm run test:contracts` => PASS（25 files / 208 tests）
- `pnpm run test` => PASS（unit 66、integration 98、repository 33、web component 76、native Jest 47、contracts 208）
- `pnpm run verify` => PASS
- `pnpm run training:copy:validate` => FAIL-CLOSED（current rootのworkflow allowlistがTraining Copy専用でないため。exact-SHA Training Copy PASSとは扱わない）
- `PLAYWRIGHT_BASE_URL=http://127.0.0.1:8082 pnpm run training:web:baseline` => PASS（desktop 1/1）
- `PLAYWRIGHT_BASE_URL=http://127.0.0.1:8082 pnpm run training:web:mobile` => PASS（mobile baseline 1/1）
- `PLAYWRIGHT_BASE_URL=http://127.0.0.1:8082 pnpm run training:web:mobile:exercise` => PASS（learner exercise 1/1）
- `PLAYWRIGHT_BASE_URL=http://127.0.0.1:8082 pnpm run training:web:check-expected-failure` => PASS（intentional child non-zero、今回runの`.zip` / `.png` / `.webm` / HTML evidence確認）
- Android release marker => `android_runtime_released=true` / `next_agent_can_use_android=true`を確認。statusはblockedだが独立利用許可のため実行し、Visual threadは停止・resetしていない。
- Android Doctor初回（SDK env未設定）=> FAIL-CLOSED。明示的SDK env設定後のDoctor => PASS。Training AVD `scenario-shop-training-api34` / API34 / x86_64のStart => PASS。
- 既存Automation APKの独立検査 => PASS、Install => PASS、Smoke => PASS、focused Training Maestro baseline => PASS（1/1）、StopとADB cleanup => PASS。APK rebuild / Formal Maestro全件は今回実行していない。
- `git diff --check` => PASS（CRLF warningのみ）
- Run Artifact sanitizer Write / Check => この追補の最後に実行予定。未実行状態をPASSとは扱わない。

### Remaining blockers

- Fresh checkout / Fresh Training CopyからのFresh Learner full journey（Workbook、desktop、mobile、expected-failure、Android、capstone、Training Copy、Part 2、CI設計）は未完了。
- 修正後commitによるFinal Candidate SHAが未取得。7c442d3のPhase 1 / Native CI結果は今回修正前のEvidence。
- 修正後のSource Required CI / Native CI、exact-SHA Training Copy Web / Android / expected-failure、Delivery Readiness 3 runs、前後SHA equalityは未実行。
- したがって状態は`Local repair complete / Final Delivery pending`であり、100%完了・Merge Readyとは扱わない。

### Progress

Progress: 90% (18/20)

### 2026-08-13 17:05 JST — Run Artifact Sanitizer追補

- `scripts/sanitize-codex-artifacts.ps1 -Path .codex/runs/20260813-093427-JST -Write -Check` => PASS（5 files、0 replacements、0 residual findings）。
- 直前のValidation節で「実行予定」と記録したSanitizerは、この追補により実行済みへ更新された。既存のREPORT履歴は削除・並べ替え・改変していない。
- `run.json` / `evaluation.json`のJSON parse => PASS。`run.json`は`status=partial`を維持し、`scope` / `scope_ref`は存在しない。`evaluation.json`は`result=partial`を維持した。

### 2026-08-13 17:08 JST — 最終軽量再確認

- 最終fixture整形後のfocused contracts => PASS（2 files / 18 tests）。
- `pnpm run format:check` => PASS。`pnpm run validate:curriculum` => PASS（22 / 4 / 2 projects）。
- `git diff --check` => PASS（CRLF warningのみ）。この追補後もSource CI / remote Delivery Readinessの未完了状態は変わらない。
