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

## 2026-08-13 18:33 JST — PR #25最終review repair

### Iteration record

- `iteration_number`: 3（active Run継続）
- `input_findings`: sdkmanager fallbackの候補選択規則不一致、current PR / CI状態とRun Artifactの古いHEAD記録、`scripts/validate-curriculum.ts`の非null assertion。
- `repair_plan`: 教材と`android-emulator.ps1`のfallback選択を一致させ、非null assertionを明示的な`undefined`検査へ置換し、current PR / CI状態をRun Artifactのcurrent recordへ追記・同期する。
- `allowed_files`: `docs/curriculum/test-automation/part1/07_maestro-native-automation.md`、`scripts/validate-curriculum.ts`、`.codex/runs/20260813-093427-JST/{PLAN,TASKS,REPORT,run,evaluation}`。既修正Workflow / Test / Productは対象外。

### Current PR / CI state

- PR #25 current HEADは`50021adbfca10c7a8db3bcf7f9395c4203d59be8`。GitHub read-only確認で、Phase 1 CI run `31682890216`とNative CI run `31682890504`はいずれも`completed / success`。
- ユーザー提示およびPR current evidenceでは、このHEADでAndroid Runtime / Maestro、Training Maestro baseline、Production-validation APK切替前のTraining baselineもsuccess。今回の修正は教材とvalidatorだけなのでAndroidを再実行していない。
- ただし今回の2 Source変更はこのworktreeで未コミット。50021adのremote Evidenceは今回修正後のFinal Candidate Evidenceへ昇格させず、post-repair commit後の再実行を残す。

### Finding triage and repair

| Finding | 判定 | 対応 |
| --- | --- | --- |
| 教材のsdkmanager fallbackが`Select-Object -First 1`でhelperと不一致 | valid / must_fix | `Get-ChildItem`候補を`Sort-Object FullName`し、`$foundSdkManagers[-1].FullName`を使用。`Write-Output "Using sdkmanager: ..."`を追加。latest direct path、0件error、LASTEXITCODE検査は維持 |
| Current Run Artifactが7c442dの旧CI状態をcurrentとして示す | valid / must_fix | REPORTへ50021ad / Phase 1 / Native CI successを追補し、TASKSのcurrent task表現、run.json warnings / validation、evaluation evidenceを同期。旧記録は削除・改変していない |
| `specReferences.get(specRef)!` | valid / must_fix | `Map.get`結果が`undefined`なら既存validatorと同じ`fail(...)`へ進む明示Runtime checkへ置換。外部値の検証順序とBR / AC照合は維持 |
| 既修正Native順序、Training Trust Boundary、Mobile Exercise、Maestro runner、CSV BOMの再変更 | reject / out of scope | Current HEADで解消済みで、今回の3件に不要なため変更しない |

### Validation

- `pnpm run format:check` => PASS
- `pnpm run lint:markdown` => PASS（0 issues / 248 files）
- `pnpm run validate:curriculum` => PASS（22 required documents、4 workbook files、2 Training projects）
- `pnpm run typecheck` => PASS（app / native-tests / Training）
- `pnpm exec vitest run tests/contracts/training-curriculum.test.ts --no-file-parallelism --maxWorkers=1` => PASS（1 file / 6 tests）
- `pnpm run verify` => PASS（spec、Curriculum、lint 0 errors / 65 warnings、typecheck、security、全test、Web build、spec build）
- `git diff --check` => この追補後に実行する。CRLF warningは許容し、失敗をPASS扱いしない。
- Run Artifact sanitizer Write / Check => この追補後に実行する。未実行状態をPASS扱いしない。

### Remaining delta / decision

- `remaining_delta`: Fresh Learner full journey、post-repair commitのFinal Candidate SHA、post-repair Source Required CI、exact-SHA Training Copy 3 runs、Delivery Readiness、SHA equality。
- `decision`: `stop_success`（今回の3件のlocal repair完了）。Final Delivery pendingは維持する。
- Progress: 90% (19/21)

### 2026-08-13 18:36 JST — 最終Artifact確認

- `git diff --check` => PASS（CRLF warningのみ）。今回のSource変更は教材1ファイル、validator 1ファイル、active Run Artifact 5ファイルに限定され、Product / Workflow / Test sourceの追加変更はない。
- `scripts/sanitize-codex-artifacts.ps1 -Path .codex/runs/20260813-093427-JST -Write -Check` => PASS（5 files、0 replacements、0 residual findings）。
- `run.json` / `evaluation.json` JSON parse、TASKS checkbox計算、`scope` / `scope_ref`不在を確認。current stateは`run.status=partial`、`evaluation.result=partial`、Progress `90% (19/21)`。

### 2026-08-13 18:37 JST — 検証途中の補足

- Source変更直後の最初の`pnpm run validate:curriculum`は、既存validatorが要求する`Get-ChildItem -LiteralPath $cmdlineToolsRoot`連続文字列と教材の改行位置が衝突してfailした。教材のコマンド開始行を整形して同じ選択規則を保ち、再実行はPASSした。
- 最初のad hoc Prettier確認は実ファイル名のPath typoで対象を読まずに終了した。正しい`07_maestro-native-automation.md` Pathで再実行しPASSした。品質Gateの未実行をPASS扱いしていない。

## 2026-08-13 20:22 JST — goal5 最終Source repair

### Scope / delegation

- 今回の対象はP2 2件（sdkmanager fallback回帰Contract、active Run Artifactのstale / self-contradictory current state）に限定した。
- `docs/curriculum/test-automation/part1/07_maestro-native-automation.md`の既修正PowerShell、Native CI順序、Training Trust Boundary、Maestro runner、Mobile Exercise、CSV BOM等は再変更していない。
- Subagentは使用しなかった。Native delegation markerが`No child subagent delegation`であり、今回の狭いvalidator / Run Artifact修正は親Agentだけで照合・実装・検証できるため、結果分散を避けた。

### Current PR state

- repair開始前のPR HEAD: `6ef3f6c8183580ca57192c52b9e37a0bd72eaf00`
- Phase 1 CI #189: success
- Native CI #131: success
- Android Runtime / Maestro: success
- Training Maestro baseline: success（Production-validation APK切替前）
- 上記は今回Source修正前のcommitted HEADに対する履歴Evidenceであり、今回さらにSourceを修正したため、`6ef3f6c`をFinal Candidate SHAとして固定しない。今回repair後のexact-SHA Delivery Evidenceへ流用しない。

### Findings

| Finding | 判定 | 対応 |
| --- | --- | --- |
| sdkmanager fallback selection ruleの回帰Contract不足 | valid / must_fix | `scripts/validate-curriculum.ts`のNative lesson required tokenへ`Sort-Object FullName`、`$foundSdkManagers[-1].FullName`、`Using sdkmanager:`を追加。教材の実装やPowerShell parserは変更していない。 |
| active Run Artifactのstale / self-contradictory current state | valid / must_fix | TASKSのBlockedを「commit不存在」から「今回repair未コミットのためFINAL_CANDIDATE_SHA未固定」へ更新。run.json / evaluation.jsonを6ef3f6cの既存CI successと、repair後gate未成立の時間軸へ同期した。 |

### Review comments not adopted

- **GitHub Action SHA pinning**: approved action setとRepository-wide immutable SHA policyは別責務。Training WorkflowだけpinするとFormal CIとpolicyが分裂するため不採用。
- **run.json `scope_ref`**: Strict scopeはPLAN.mdの`## Scope`で宣言済み。canonical `RUN_MANIFEST.json` schemaに`scope_ref`がないため、今回schema拡張は不採用。
- **Past Run Artifact rewrite**: 過去記録をレビューUI整理目的で再構築せず、REPORTはappend-only、current stateはactive Runへ追記・同期した。
- **未来日付コメント**: 現在は2026-08-13 JSTであり、8/13実行Evidenceを未来日付とは扱わない。該当履歴は変更していない。

### Validation

- `pnpm run format:check` => PASS
- `pnpm run lint:markdown` => PASS（0 issues / 248 files）
- `pnpm run validate:spec` => PASS（3 challenges）
- `pnpm run validate:curriculum` => PASS（22 required documents、4 workbook files、2 Training projects。sdkmanager selection tokenを含む）
- `pnpm run lint` => PASS（0 errors / 65 existing warnings）
- `pnpm run typecheck` => PASS（app / native-tests / Training）
- `pnpm run typecheck:training` => PASS
- `pnpm exec vitest run tests/contracts/training-curriculum.test.ts --no-file-parallelism --maxWorkers=1` => PASS（1 file / 6 tests）
- `pnpm run test:contracts` => 初回は`native-production-module-resolution.test.ts`の1件が5秒timeout（24 files / 207 testsまでPASS）。変更範囲外の既存Native resolution testを単体で確認し、4/4 PASS後に同コマンドを再実行した。
- `pnpm run test:contracts`（再実行）=> PASS（25 files / 208 tests）
- `pnpm run test` => PASS（unit 66、integration 98、repository 33、web component 76、native 47、contracts 208）
- `pnpm run verify` => 初回は5分上限でexit 124。構成要素（image manifest、security、Web/spec build）を個別PASS確認後、十分な上限で再実行しPASS（327.8秒、lint 0 errors / 65 warnings、contracts 25 files / 208 tests、Web/spec build）。
- `git diff --check` => 次のArtifact更新後に実行する。未実行状態をPASS扱いしない。
- Run Artifact sanitizer => 次のREPORT更新後にWrite / Checkを実行する。未実行状態をPASS扱いしない。

### Remaining

- Fresh Learner full journey
- repair commit後のFinal Candidate SHA固定
- post-repair Source Required CI
- exact-SHA Training Copy Web baseline
- exact-SHA Training Copy Android baseline
- exact-SHA Training Copy expected-failure
- expected-failure Artifact確認
- Delivery Readiness
- final PR HEAD / `FINAL_CANDIDATE_SHA` / Training Copy resolved SHA equality

### Decision / Progress

- `Source repair: complete / Local validation: complete / Source Final Candidate: not frozen / Fresh Learner: pending / Final Delivery Readiness: pending`
- 今回のSource repairについては`stop_success`。ユーザーのcommit / push後に次工程へ引き継ぐ。
- Progress: 90% (19/21)

### 2026-08-13 20:23 JST — Final artifact gate

- `git diff --check` => PASS（CRLFのline-ending warningのみ。whitespace errorなし）。
- `scripts/sanitize-codex-artifacts.ps1 -Path .codex/runs/20260813-093427-JST -Write -Check` => PASS（5 files、0 replacements、0 residual findings）。
- 最終変更範囲は`scripts/validate-curriculum.ts`とactive Runの5標準Artifact（PLAN / TASKS / REPORT / run.json / evaluation.json）のみ。教材、Product、Formal CI、Native runtime sourceは追加変更なし。
- `run.json.status=partial`、`run.json.primary_failure_category=missing_validation`、`evaluation.json.result=partial`を維持。`scope` / `scope_ref`は追加していない。
- Android、Fresh Learner、remote Training Copy、Final Delivery Readinessは今回実行していない。未実行をPASS扱いせず、次工程へ残す。
- Run Artifact追記後の`pnpm run format:check`もPASS（全対象がPrettier準拠）。

## 2026-08-13 21:31 JST — Active Run current-state reconciliation

### Current state

- 最終Source repairはcommit / push済みであることをGitHub read-onlyで確認した。
- 修正Sourceに対するRequired Phase 1 CI success（#192）を確認した。
- 修正Sourceに対するRequired Native CI success（#134）を確認した。
- Android Runtime / Training Maestro baseline success、およびTraining baselineがProduction-validation APK切替前に実行されたことは、既存Run / PR Evidenceとユーザー提示の状態で確認済みである。
- Source implementationとして追加のblocking findingはない。Source correctness gateは完了している。
- Fresh Learner full journeyはpendingである。
- `FINAL_CANDIDATE_SHA`はまだfreezeしない。Fresh Learnerと最終Run Artifact状態の完了後にfreezeする。
- Final Delivery Readinessはpendingである。

### Historical SHA clarification

- `50021ad` / `6ef3f6c`は過去のrepair iterationにおけるEvidenceとして保持する。過去記録はREPORTのappend-only契約に従って変更しない。
- これらの過去SHAをFinal Delivery candidateとして使用しない。current stateには変化後に再び古くなるexact SHAを新規固定せず、durableな状態表現だけを記録する。

### Scope / non-adopted review comments

- 今回の変更はactive Runの`TASKS.md`、`REPORT.md`、`run.json`、`evaluation.json`だけに限定し、Source / Product / Workflow / Test / Curriculumは変更していない。
- Run Artifact英語見出しの全面変更、GitHub Action SHA pinning、`scope` / `scope_ref`追加、過去Runの再構築、2026-08-13未来日付コメントの変更は行わない。Canonical template / Repository-wide policy / append-only契約と矛盾するためである。

### Remaining

- Fresh Learner full journey
- `FINAL_CANDIDATE_SHA` freeze
- exact-SHA Training Copy Web / Android / expected-failure
- expected-failure Artifact確認
- Final Delivery Readiness 3 runs
- final PR HEAD / `FINAL_CANDIDATE_SHA` / Training Copy resolved SHA equality

### Final artifact validation

- JSON parse、TASKS progress再計算、sanitizer、`git diff --check`はArtifact更新後に実行し、結果を次の追補へ記録する。

### 2026-08-13 21:34 JST — Final artifact validation

- `run.json` JSON parse => PASS（`status=partial`、`primary_failure_category=missing_validation`）。
- `evaluation.json` JSON parse => PASS（`result=partial`、`primary_failure_category=missing_validation`）。
- TASKS progress再計算 => PASS（Now + Discovered: 19 / 21、90%。Blockedは分母外）。
- `pnpm run format:check` => PASS（全対象がPrettier準拠）。
- `pnpm run lint:markdown` => PASS（248 files / 0 issues）。ただし設定上`.codex/runs/**`は除外されるため、Run Artifact自体の直接検証EvidenceはJSON parse、Sanitizer、`git diff --check`で取得した。
- `scripts/sanitize-codex-artifacts.ps1 -Path .codex/runs/20260813-093427-JST -Write -Check` => PASS（5 files、0 replacements、0 residual findings）。
- `git diff --check` => PASS（CRLFのline-ending warningのみ、whitespace errorなし）。
- allowed-files check => PASS。変更はactive Runの`TASKS.md`、`REPORT.md`、`run.json`、`evaluation.json`のみ。Source / Product / Workflow / Test / Curriculum変更なし。

### Reconciliation decision

- 「repair未コミット」「post-repair Required CI未完了」はcurrent stateから除去した。
- `run.json.status=partial`、`evaluation.json.result=partial`、`missing_validation`は維持した。残る理由はFresh Learner、FINAL_CANDIDATE_SHA freeze、exact-SHA Training Copy、Final Delivery Readiness、SHA equalityである。
- `stop_success`。今回のRun Artifact reconciliationを完了し、Final Deliveryは次工程へ引き継ぐ。
- Progress: 90% (19/21)

### 2026-08-13 21:36 JST — Final post-append confirmation

- GitHub read-only PR metadata / workflow-runs確認 => PASS。commit / push済み、Phase 1 CI #192 success、Native CI #134 success。current exact SHAは自己参照を避けるためRun Artifactへ追加固定していない。
- `run.json` / `evaluation.json` JSON parse => PASS。
- TASKS progress再計算 => PASS（19 / 21、90%。Blocked除外）。
- `pnpm run format:check` => PASS。
- `pnpm run lint:markdown` => PASS（248 files / 0 issues）。`.codex/runs/**`は除外設定のため、Run Artifact自体の直接検証ではない。
- Sanitizer Write / Check => PASS（5 files、0 residual findings）。
- `git diff --check` => PASS（CRLF warningのみ）。
- allowed-files check => PASS。変更対象はactive Runの4ファイルのみで、Source変更なし。

## 2026-08-14 06:35 JST — Fresh Learner / pre-freeze contract reconciliation

### Final Delivery contract

- Final Delivery EvidenceがRun Artifactへの追記を要求すると、`FINAL_CANDIDATE_SHA` freeze後のREPORT更新がPR HEADを変え、Evidenceを無効化する自己参照ループになることを確認した。
- `docs/plans/2026-08-10_141200_test-automation-curriculum-remediation.md`を最小差分で更新し、Fresh Learner / Source validation / pre-freeze Run Artifact確定 → commit / push → Source Required CI → `FINAL_CANDIDATE_SHA` freeze → exact-SHA Training Copy / 3 runs → SHA equalityの順序へ統一した。
- `FINAL_CANDIDATE_SHA` freeze直前までをActive Runのpre-freeze authoritative recordとし、freeze後はCurrent PR BranchのSource / Plan / Run Artifactを変更しない。freeze後のFinal Delivery RecordはPR #25のGitHub commentをcanonical evidenceとする。
- このRunではGit mutationを行わず、Final Candidate SHAをfreezeしていない。したがってpost-freeze Deliveryを開始しない。

### Fresh Learner environment

- Fresh Copy: `.artifacts/fresh-learner-20260814-051914/`。既存`node_modules`、output、Playwright cache、learner artifactを持ち込まず、`pnpm install --frozen-lockfile --ignore-scripts`後に開始した。
- Fresh CopyのTraining Copy preparation / exact source resolutionはPASS。`training:copy:validate`もTraining active workflow allowlist、manifest SHA、Trust BoundaryをPASSした。
- Source rootの`validate:spec`はPASS。Training Copy上の`validate:curriculum`はFormal `.github/workflows/ci.yml`をactiveから除去するTraining Copy設計とvalidatorのSource-root前提が衝突してfailしたため、Training Copy validator PASSとは分離した。Source rootのCurriculum validationはpre-freeze gateで再確認する。
- Required Curriculum 21文書の存在、learner-facing package entrypoint（Web desktop / mobile baseline / mobile exercise / expected-failure / Native / Copy / validator）を確認した。Instructor Referenceを解答として先読みしていない。

### Fresh Learner results

- Web RuntimeはFresh Copy専用の`http://127.0.0.1:8086`で起動した。
- Training Web desktop baseline: PASS（1/1）。
- Training Web mobile baseline: PASS（1/1）。
- Learner exercise mobile entrypoint: PASS（1/1）。`training/playwright/exercises`を`training-mobile-chromium`で実行した。
- Expected-failure: intentional child failureを確認し、wrapper contractはPASS。今回runでzip / png / webm / html Evidenceを確認した。GitHub Workflow actual conclusionのremote failureは未実行であり、local wrapper PASSをremote Delivery PASSへ読み替えていない。
- Workbook / Spec / Part 1 / Part 2のlearner pathはcanonical Navigation、完了条件、Training境界、Android/iOS保証、Git/CI/Quality Gate記述を本文だけで追跡できることを静的に確認した。
- Android marker `visual-android-released.json`（`android_runtime_released=true` / `next_agent_can_use_android=true`）を確認し、Training AVD `scenario-shop-training-api34`を使用した。
- Android Doctor（明示SDK / Java環境）/ Prepare / Start / AVD identityはPASS。標準Release buildは外側timeout、ABI-aware buildは長いPathで一度failした後、current worktree専用short junctionで`BUILD SUCCESSFUL`。今回生成APKのInstall / SmokeはPASSした。
- `native-test-control`単体は2回ともSystem UIの`isn't responding`ダイアログが前面に残り、`Native test runtime listening`操作を遮断してFAIL。画面背後にアプリとruntime listeningは存在し、Evidence screenshot / UI hierarchy / JUnit / logcatを取得した。これは`DEVICE_FAILURE` / `blocked_environment`として扱い、Training Maestro baseline、Formal Maestro full suite、後続Native flowは実行していない。
- AVDはStopでcleanup済み。Fresh Learner AndroidはPASS扱いせず、Task 13は未完了のままとする。既存PR Source CI / 過去Training Maestro successはFresh Learner Androidの成功に読み替えない。

### Findings / source decision

- Source correctness上の新規blocking defectは確認していない。今回のAndroid停止原因はSystem UI / AVD状態であり、Product Business Logic、Formal Regression、Training sourceを変更しない。
- Fresh LearnerはWeb部分PASS、Android capabilityはblocked_environment。Required Journeyの完了へ読み替えない。Recoveryの実施（AVD Stop / Start、APK再Install / Smoke）は記録したが、同じSystem UI ANRが再現したため無目的な再試行を停止した。
- Subagentは使用しなかった。AGENTS.mdのNative delegation markerが`No child subagent delegation`で、今回のpre-freeze Artifact整合と実Runtime結果は親Agentが直接照合できたため、結果の分散を避けた。

### Current state / remaining

- Source correctness gate、修正Sourceに対するRequired Phase 1 / Native CI success、Fresh Web learner pathは確認済み。
- Fresh Learner full journeyはAndroid `blocked_environment`のため未完了。Task 13はunchecked、Task 14もunchecked。Progress: 90% (19/21)。
- `run.json.status=partial` / `evaluation.json.result=partial`、primary failure categoryは`missing_validation`を維持し、Android環境停止は追加の`environment_failure`として記録する。
- Fresh Learnerとpre-freeze Run Artifactを完了してcommit / pushし、post-change Required CIが成功するまで`FINAL_CANDIDATE_SHA`はfreezeしない。
- その後にexact-SHA Training Copy Web / Android / expected-failure、remote Delivery Readiness、external Final Delivery Record、SHA equalityを実施する。今回の未コミットpre-freeze変更後にFinal Deliveryを実行していない。

### Final pre-freeze artifact checks

- `pnpm run format:check` => PASS。
- `run.json` / `evaluation.json` JSON parse => PASS。
- TASKS checkbox再計算（Now + Discovered、Blocked除外）=> PASS（19/21、90%）。
- `git diff --check` => PASS（CRLF warningのみ、whitespace errorなし）。
- `scripts/sanitize-codex-artifacts.ps1 -Path .codex/runs/20260813-093427-JST -Write -Check` => PASS（5 files、0 replacements、0 residual findings）。
- Allowed-files check => PASS。今回の変更はPlanとActive Runの標準Artifact 4ファイルのみ。Source / Product / Workflow / Test / Curriculum implementationは変更していない。

### Handoff state

- `PRE_FREEZE_REPAIR_COMPLETE`: YES（Plan contract、Fresh Web validation、Run Artifact更新、local gates完了）。
- `FRESH_LEARNER`: PENDING（Web部分PASS、AndroidはSystem UI ANRの`blocked_environment`）。
- `SOURCE_REQUIRED_CI`: PASS for the last committed Source revision; post-pre-freeze-change CIは未実行。
- `FINAL_CANDIDATE_SHA`: NOT_FROZEN。
- `TRAINING_COPY` / `WEB_BASELINE` / `ANDROID_BASELINE` / `EXPECTED_FAILURE` / `TRUST_BOUNDARY` / `SHA_EQUALITY`: PENDING for the final candidate。
- `FINAL_DELIVERY_RECORD`: PENDING。freeze後のPR commentは作成していない。
- `UNRESOLVED_REQUIRED_BLOCKERS`: Fresh Android capability 1件、Final Delivery一式。未実行を0件・PASSへ読み替えていない。
- Stop condition: `USER_COMMIT_REQUIRED`へ進む前にFresh Learner Androidのenvironment blockerを解消する必要がある。Source repairへ戻る根拠はない。ユーザーが環境を回復して再実行するか、Plan契約に従うAndroid capability unavailable記録を承認した後、Fresh Learner完了 → pre-freeze Artifact確定 → user commit / push → Required CI → SHA freezeへ進む。

## 2026-08-14 07:30 JST — Fresh Learner Android recovery / pre-freeze handoff

### Fresh Learner completion

- Fresh CopyでのTraining Copy preparation / validation、Workbook / Spec / Part 1 / Part 2 learner path確認、Web desktop baseline、Web mobile baseline、learner exercise mobile、expected-failure evidenceはPASS済みである。
- 標準Training AVDではSystem UI `isn't responding`が再現したため、AVDのStop cleanupまで実施し、同じ失敗を無目的に反復しなかった。
- Android capabilityを理由なくskipしないため、認証済み物理端末へFresh Learner用arm64-v8a Release APKをInstallした。初回Test時点は端末が`Asleep`かつKeyguard表示中（`mInputRestricted=true`）だったため、これは端末状態の失敗として分類した。
- ADBの起床・解除後、`native-test-control`単体Flowは1/1 PASS、続く`pnpm run training:native:baseline`は1/1 PASSした。証跡は`.artifacts/native-local/20260814-android-fresh-learner-physical-unlocked/`配下に保存した。
- Androidの標準AVD障害は履歴として保持するが、物理端末でBuild / Install / Smoke / Test Control / Training Maestro baselineを独立確認できたため、Fresh Learner full journeyはPASSと判定する。Product、Formal Regression、Training Sourceは変更していない。

### Pre-freeze state

- Task 13を完了し、Task 14は未完了のまま維持した。ProgressはNow + Discoveredのcheckbox実数に基づき`Progress: 95% (20/21)`へ更新した。
- Source correctness、既存の修正Sourceに対するRequired Phase 1 / Native CI、Fresh Learner、pre-freeze Run Artifact更新は完了した。
- 今回のPlan / Run Artifact変更はGit mutation禁止のため未commitである。したがってpost-change Required CIは未実行、`FINAL_CANDIDATE_SHA`は未freezeのままとする。ユーザーのcommit / pushと修正後Required CI成功後にのみSHAをfreezeする。
- `run.json.status=partial`、`evaluation.json.result=partial`、`primary_failure_category=missing_validation`は維持する。残るのはFinal Candidate freeze、exact-SHA Training Copy Web / Android / expected-failure、remote Delivery Readiness、外部Final Delivery Record、SHA equalityである。

### Validation / decision

- Android recovery command `scripts/native/windows/android-local.ps1 -Action Test ... -RunId 20260814-android-fresh-learner-physical-unlocked` => PASS（native-test-control 1/1）。
- `QA_TRAINING_ANDROID_SERIAL=354955112942476 pnpm run training:native:baseline` => PASS（Training Maestro baseline 1/1）。
- Fresh LearnerのWeb / Android実行結果を、過去PRのAndroid / Native CI EvidenceやFormal Regression結果へ読み替えていない。
- Fresh Learner => PASS。Source blocker => 0。Final Delivery Readiness => PENDING。
- Handoff state: `PRE_FREEZE_REPAIR_COMPLETE=YES`、`FRESH_LEARNER_COMPLETE=YES`、`FINAL_CANDIDATE_SHA=NOT_FROZEN`、`USER_COMMIT_REQUIRED`。
- Subagentは今回も使用していない。AGENTS.mdの`No child subagent delegation`と、既存Fresh / Android Evidenceを親Agentが直接照合できる範囲であることを理由とする。

## 2026-08-14 07:45 JST — Pre-freeze validation final confirmation

- `pnpm run format:check` => PASS。
- `pnpm run lint:markdown` => PASS（248 files / 0 issues。設定上`.codex/runs/**`は除外されるため、Run Artifactの直接検証ではない）。
- `pnpm run validate:spec` => PASS（3 challenges）。
- `pnpm run validate:curriculum` => PASS（22 required documents、4 workbook files、training-chromium / training-mobile-chromium）。
- `pnpm run lint` => PASS（0 errors / 65 existing warnings）。
- `pnpm run typecheck` => PASS（app / native-tests / Training）。
- `pnpm run typecheck:training` => PASS。
- `pnpm run test:contracts` => PASS（25 files / 208 tests）。
- `pnpm run test` => PASS（unit 66、integration 98、repository 33、web component 76、native 47、contracts 208）。
- `pnpm run verify` => PASS（299.4 seconds。format、markdown、spec、curriculum、lint、typecheck、image manifest、security、full test、Web build、spec buildを含む）。
- 既存Lint warning 65件とNative component testの`act(...)` console warningは失敗ではなく、今回変更範囲外の既存warningとして扱った。
- Run ArtifactのJSON parse、TASKS progress再計算、`git diff --check`、Sanitizer Write / Checkは、REPORT追記後に再実行して次の追補へ結果を記録する。未実行をPASS扱いしない。

### Final handoff

- Fresh Learner full journey: PASS。Web desktop / mobile / learner exercise / expected-failure、Workbook / Spec / Part 1 / Part 2 learner path、Android physical device Test Control / Training Maestro baselineを確認した。
- Task 13: complete。Task 14: pending。Progress: 95% (20/21)。
- `FINAL_CANDIDATE_SHA`: NOT_FROZEN。今回のRun Artifact / Plan変更は未commitであり、Git mutation禁止を守っている。ユーザーのcommit / pushとpost-change Required CI成功後にのみfreezeする。
- Final Delivery Readiness: PENDING。exact-SHA Training Copy、remote Web / Android / expected-failure、external PR Final Delivery Record、SHA equalityは未実行である。

## 2026-08-14 07:45 JST — Artifact final checks

- `run.json` JSON parse => PASS（`status=partial`、`primary_failure_category=missing_validation`）。
- `evaluation.json` JSON parse => PASS（`result=partial`、`primary_failure_category=missing_validation`）。
- TASKS progress再計算 => PASS（Now + Discovered: 20 / 21、95%。Blockedは分母外）。
- `scripts/sanitize-codex-artifacts.ps1 -Path .codex/runs/20260813-093427-JST -Write -Check` => PASS（5 files、0 replacements、0 residual findings）。
- `git diff --check` => PASS（whitespace errorなし。CRLFのline-ending warningのみ）。
- `pnpm run format:check` => PASS。
- `git status --short` / `git diff --name-only` => PASS。変更はPlanとActive Runの標準Artifact 5 filesのみ。Source / Product / Workflow / Test / Curriculum implementationの追加変更はない。

### Final stop decision

- `PRE_FREEZE_REPAIR_COMPLETE`: YES。
- `FRESH_LEARNER`: PASS。
- `FINAL_CANDIDATE_SHA`: NOT_FROZEN。
- `FINAL_DELIVERY_READINESS`: PENDING。
- `FINAL_STATE`: `USER_COMMIT_REQUIRED`。ここで停止し、ユーザーがこのpre-freeze変更をcommit / pushした後、修正後Required CIがGreenになったrevisionをFINAL_CANDIDATE_SHAとして固定する。

## 2026-08-14 07:48 JST — Final Run Artifact synchronization

- `run.json` / `evaluation.json` JSON parse => PASS。`partial` / `missing_validation`を維持した。
- TASKS progress再計算 => PASS（20/21、95%。Task 13のみ今回完了、Task 14は未完了）。
- `pnpm run format:check` => PASS（Run Artifact最終追記後）。
- `git diff --check` => PASS、Sanitizer Write / Check => PASS（5 files、0 replacements、0 residual findings）。
- Current変更範囲はPlanとActive Run Artifactのみ。Git mutationは行っていない。
- 最終状態は`PRE_FREEZE_REPAIR_COMPLETE=YES`、`FRESH_LEARNER=PASS`、`FINAL_CANDIDATE_SHA=NOT_FROZEN`、`FINAL_DELIVERY_READINESS=PENDING`、`USER_COMMIT_REQUIRED`である。

### Pre-freeze validation results

- `pnpm run format:check` => PASS。
- `pnpm run lint:markdown` 初回はPlanのDelivery手順番号 / list indentation 17件でFAIL。Planの同一手順を連番と短い箇条書きへ整形後、再実行 => PASS（248 files / 0 issues）。
- `pnpm run validate:spec` => PASS（3 challenges）。
- `pnpm run validate:curriculum` => PASS（22 required documents、4 workbook files、2 Training projects）。
- `pnpm run lint` 初回はFresh learner temporary Copyが`.artifacts`配下に残り、コピー内のFormal `e2e`とPlaywright trace JSをESLintが収集したためFAIL。Source / Repository lintの問題ではない。Fresh evidenceをworktree外へ分離後の`pnpm run verify`内`pnpm run lint` => PASS（0 errors / 65 warnings、warningsは既存）。
- `pnpm run lint -- --ignore-pattern .artifacts/**` => PASS（0 errors / 65 warnings）。これは一時Evidence混入を除外した切り分け結果であり、最終的にはFresh Copyをworktreeから分離して通常の`pnpm run verify`内lintをPASSさせた。
- `pnpm run typecheck` => PASS（app / native-tests / Training）。
- `pnpm run typecheck:training` => PASS。
- `pnpm exec vitest run tests/contracts/native-production-module-resolution.test.ts --no-file-parallelism --maxWorkers=1 --testTimeout=30000` => PASS（4/4）。
- `pnpm run test:contracts` 初回はFresh Copy内testを拾い、native-sqlite parse errorと既存native module resolution 5秒timeoutでFAIL。Fresh Copyを分離し、既存timeoutは30秒focusedで4/4 PASS確認後に再実行 => PASS（25 files / 208 tests）。
- `pnpm run test` => PASS（unit 66、integration 98、repository 33、web component 76、native 47、contracts 208）。
- `pnpm run verify` => PASS（355.8秒、format / markdown / spec / curriculum / lint 0 errors / typecheck / image / security / full test / Web build / spec build）。
- Androidの最後のSystem UI Wait回復確認は、起動直後はdialog absentだったがUI bridgeが一度nullを返し、Install / Smoke後の`native-test-control`は再びSystem UI `isn't responding` dialogでFAIL。新情報なしの同一環境再試行を止め、Training AVD Stop => PASS。Training Maestro baselineはFresh Learnerの成功として未実行のまま。

### Pre-freeze state

- Fresh Web learner pathはPASS、Fresh Android capabilityは`blocked_environment`。Task 13は完了扱いにしないため、Progress: 90% (19/21)。
- Source correctness、local static / contract / full test / verify、既存PR Required Phase 1 / Native CI Evidenceは確認済みだが、Fresh Learner full journeyが未完了なのでpre-freeze authoritative recordは未確定。
- `FINAL_CANDIDATE_SHA`、exact-SHA Training Copy、remote Web / Android / expected-failure 3 runs、Final Delivery Record、SHA equalityは未実行。GitHub PR commentやCurrent PR Branchへpost-freeze Evidenceを書き込んでいない。

## 2026-08-14 11:53 JST — User-directed physical-device-only supplemental verification

- ユーザー指示により、進行中だったCanonical Emulator Startを停止し、この時点以後エミュレータを起動・検証に使用しない方針へ切り替えた。割り込み後に残っていた`emulator-5554`は検証目的ではなく停止・cleanupだけを行い、最終`adb devices`は実機`354955112942476`のみとなった。`emulator.exe` / qemuプロセスも残っていない。
- Canonical AVDの再検証は実施していない。したがって、過去に観測したSystem UI `isn't responding`、native-test-control failure、物理端末 recovery PASSの履歴を変更せず、物理端末結果をCanonical AVD PASSへ読み替えない。TASKSのTask 13は未完了へ訂正し、Progressは`19/21 = 90%`とした。
- 既知の根本原因分類は、SystemUIのANR dialogとcurrent focused windowを伴うAVD runtime / host resource stability問題（stale state、boot後UI readiness、GPU/headless条件を含む環境側候補）であり、Application failureとは分離している。ただし、ユーザー指示によりCanonical AVDを再実行できないため、最終的な単一原因の確定およびCanonical修正後の再現性確認は未成立である。
- 現worktreeで既に行ったSource変更は、`scripts/training/android-emulator.ps1`の有限UI安定待ち（bootanim、package、SystemUI PID安定、uiautomator hierarchy、ANR dialog不在）追加と起動GPU条件の変更、`scripts/validate-curriculum.ts`の対応contract追加である。これはAVD観測Evidenceに基づく未commitの最小修正候補だが、Canonical AVDでの修正後PASSは未確認である。Product Sourceは変更していない。

### Physical supplemental run

- Device: `354955112942476`（実機、DoctorでAPI 30、ABI `arm64-v8a,armeabi-v7a,armeabi`）。Canonical AVD identityではない。
- Run: `.artifacts/native-local/20260814-physical-supplemental-1145/`。
- arm64-v8a Release APK build / integrity: PASS。`build/apk-info.txt`にAPK size、SHA-256、ABIを保存した。
- Install: PASS。Smoke: PASS。`native-test-control`: PASS（1/1、JUnitあり）。Training Maestro baseline: PASS（1/1、JUnitあり）。
- Evidence: `evidence/screen.png`、`evidence/uiautomator.xml`、`evidence/maestro-hierarchy.txt`、`evidence/logcat.txt`、`evidence/activities.txt`。補助証跡でありCanonical PASS根拠ではない。
- Cleanup: 実機上の`com.ryuyoshikawa.scenarioshop`を`am force-stop`し、PIDおよびactivity matchが空であることを確認した。最終接続確認は実機のみ。

### Current handoff decision

- Fresh Learner Web / workbook / specification / Part 1 / Part 2 pathは既存EvidenceどおりPASS。Androidは物理端末の補助検証のみPASS、Canonical AVD Fresh Learnerは未成立である。
- `run.json.status=partial`、`evaluation.json.result=partial`、`primary_failure_category=missing_validation`を維持する。Final Delivery remote runsは開始していない。
- `FINAL_CANDIDATE_SHA`は未freeze。Git mutation（add / commit / push / merge / rebase / tag / branch操作）は実施していない。Source変更を含むため、Canonical検証を再開できるまでpost-change Required CIを実行していない。

### Physical-only handoff validation

- `run.json` / `evaluation.json` JSON parse => PASS。状態はそれぞれ`partial / missing_validation`を維持した。
- PowerShell parser（`scripts/training/android-emulator.ps1`）=> PASS（parse error 0）。
- `TASKS.md` checkbox再計算 => PASS（19/21、90%。Task 13 / Task 14は未完了、Discovered / Blockedの扱いはAGENTS.mdどおり）。
- `pnpm run format:check` => PASS（初回は`validate-curriculum.ts`のPrettier差分のみFAILしたため、同ファイルをformatterで整形後に再実行）。
- `pnpm run lint:markdown` => PASS（248 files / 0 issues。設定上`.codex/runs/**`は除外される）。
- `pnpm run validate:spec` => PASS（3 challenges）。
- `pnpm run validate:curriculum` => PASS（22 required documents、4 workbook files、training-chromium / training-mobile-chromium）。
- `pnpm run lint` => PASS（0 errors / 65 existing warnings）。
- `pnpm run typecheck` => PASS（app / native-tests / Training）。
- focused curriculum contract => PASS（1 file / 6 tests）。
- `pnpm run test:contracts` => PASS（25 files / 208 tests）。
- `pnpm run verify` => PASS（format、markdown、spec、curriculum、lint、typecheck、image manifest、security、full test、Web build、spec build）。既存の65 lint warningsとNative testの`act(...)` console warningは失敗ではない。
- `git diff --check` => PASS（whitespace errorなし。CRLF warningのみ）。
- `scripts/sanitize-codex-artifacts.ps1 -Path .codex/runs/20260813-093427-JST -Write -Check` => PASS（5 files、0 replacements、0 residual findings）。
- 最終runtime確認 => `adb devices`は実機`354955112942476`のみ、emulator / qemu process countは0。エミュレータは追加起動していない。

## 2026-08-14 17:09 JST — Windows Local Physical Device Canonical契約変更後のcurrent-tree検証

### 方針と原因分類

- ユーザー指示により、Windows Local Fresh Learner / Part 1 NativeのCanonicalをUSB接続されたPhysical Android Deviceへ変更した。Android Emulator / AVDはLocalの完了条件から外し、GitHub Native CIだけがAPI 34 / `google_apis` / `x86_64` Emulator、Formal Maestro、Training Maestro baselineを保証する責務分離とした。iOS Build-onlyは変更していない。
- 旧Local AVDで観測されたSystem UI `isn't responding`は、旧契約下の履歴として保持する環境側Findingであり、今回のGoalでは修復・再調査しない。今回のCurrent blockerはAVDではなく、Source / Curriculum / validator / contract変更が未commitでexact committed snapshotとpost-change Required CIが未確認であることと分類する。
- Source上の必要修正は、既存Windows helperへ明示的な`-RequirePhysicalDevice`を追加し、serial文字列だけに依存せずADB status、`ro.kernel.qemu` / `ro.boot.qemu`、`app.config.ts`の`minSdkVersion`、ABI、package service、awake、unlockedを有限・fail-closeで確認することだった。明示`-DeviceSerial`分岐でもphysical checkを必ず通るよう回帰修正した。
- 最初のPrepareは、既存の既定Repository Aliasが別リポジトリを指しているためhelperの安全なJunction検査でfail-closeした。既存Aliasは変更せず、現在worktreeだけを指す検証済みの短縮Aliasを明示して再実行した。これはHost Path前提の環境差分であり、Application / Android runtime failureではない。

### 変更範囲

- `scripts/native/windows/android-local.ps1`: Physical Canonicalのopt-in fail-close判定、Repository minimum APIのSource of Truth読取、明示serial適用。
- `scripts/training/android-emulator.ps1`: Local専用で参照消滅を確認した未検証AVD helperを削除。GitHub Native CIのshell Emulator実装は削除していない。
- `scripts/validate-curriculum.ts` / `tests/contracts/training-curriculum.test.ts`: Local Physical Device contractとCI Emulator contractの分離、旧AVD実装文字列固定の除去、CI API34 / image / serial / baseline / cleanupの保護。
- `docs/curriculum/test-automation/00_learning-design.md`、`part1/07_maestro-native-automation.md`、`part1/09_part1-capstone.md`、`part1/10_part1-capstone.md`: USB debugging、ADB authorization、`adb devices -l`、awake / unlocked、Physical DeviceのBuild / Install / Smoke / Test Control / Training baseline / EvidenceをCanonical化。
- `docs/curriculum/test-automation/part2/04_ci-github-actions.md`、`part2/06_native-ci-maestro.md`、`training/github-actions/README.md`: Windows Local PhysicalとGitHub Native CI Emulatorの責務を明示。
- `docs/native/windows-android-local-validation.md`、remediation Plan、`docs/PROJECT_CONTEXT.md`、history / new plan: Runbook、要件、living documentationを更新。
- `.github/workflows/native-ci.yml` と `training/github-actions/training-native-ci.yml`のCI Emulator実装は変更していない。

### 新契約でのPhysical Android current-tree実行

- Device: serial `354955112942476`、ADB status `device`、Android API 30、ABI `arm64-v8a,armeabi-v7a,armeabi`。API 30は最低対応APIとして固定せず、`app.config.ts`の`minSdkVersion`と照合した。
- Physical判定: `ro.kernel.qemu` / `ro.boot.qemu`はEmulator値でなく、package serviceは`found`、端末はawake / unlocked、ホストemulator processは0。
- `android-local.ps1 -Action Doctor -DeviceSerial ... -RequirePhysicalDevice`: PASS。
- `Prepare`: 検証済みworktree Junction指定でPASS。依存関係、Native asset、image manifest、route dependency、Expo prebuildを完了。
- `Build -Architecture Auto`: PASS。Device ABI `arm64-v8a`向けRelease APKを生成。`.artifacts/native-local/20260814-physical-canonical-contract-1633/build/apk-info.txt`で57,777,006 bytes、SHA-256、ABIを保存し、bundle 1件、arm64-v8a native library 27件、他ABI 0件を確認。
- `Install`: PASS。`pm path`でpackage installedを確認。
- `Smoke`: PASS。Launch後のapp process確認とfatal startup log scanを完了。
- `Test -Flow maestro/native-test-control.yaml`: PASS、JUnit `tests=1 failures=0`。
- `QA_TRAINING_ANDROID_SERIAL`、`ANDROID_SERIAL`、`TARGET_SERIAL`を同じserialへ固定した`pnpm run training:native:baseline`: PASS、1/1、JUnit `tests=1 failures=0`。
- `Evidence`: `.artifacts/native-local/20260814-physical-canonical-contract-1633/evidence/`へ`screen.png`、`uiautomator.xml`、`maestro-hierarchy.txt`、`logcat.txt`、`activities.txt`を保存。PNG signature、UI hierarchy parse、hierarchy非空を確認した。
- Cleanup: `am force-stop com.ryuyoshikawa.scenarioshop`後にapp PIDなし、ADBは対象Physical Deviceのみ、host emulator process 0を確認し、`cleanup.txt`へ保存した。今回の検証でAVDは起動・使用していない。

### ValidationとFresh Learner判定

- PowerShell parse、`pnpm run format:check`、`pnpm run lint:markdown`（250 files / 0 issues）、`pnpm run validate:spec`、`pnpm run validate:curriculum`、`pnpm run lint`（0 errors / 65 existing warnings）、`pnpm run typecheck`、focused curriculum contract（7/7）、`pnpm run test:contracts`（25 files / 209 tests）、`pnpm run verify`（406.5 seconds）をPASSした。
- Current-treeのWindows Local Physical Android Journeyは、要求されたDoctor → Prepare → Build → APK integrity → Install → Smoke → Test Control → Training Maestro baseline → Evidence → cleanupを一続きにPASSした。
- ただしSource / Docs / Tests / Run Artifactは未commitであるため、これはImplementation Verificationであり、exact committed snapshotのFresh Learner PASSへは繰り上げない。Task 13は未チェック、Task 14も未チェック、Progressは`90% (19/21)`を維持する。
- `run.json`は`status=partial` / `primary_failure_category=missing_validation`、`evaluation.json`は`result=partial` / `primary_failure_category=missing_validation`を維持する。FINAL_CANDIDATE_SHAはfreezeせず、Final Delivery remote runsも開始していない。ユーザーのcommit / push後にexact committed snapshotのPhysical Fresh LearnerとRequired Phase 1 / Native CIを確認する。

## 2026-08-14 17:14 JST — Active Run Artifact final checks

- `run.json` / `evaluation.json` JSON parse => PASS。`partial` / `missing_validation`を維持した。
- `TASKS.md` checkbox再計算 => PASS。Now + Discoveredのcheckboxは21件、完了19件、Blocked除外、Progressは`90% (19/21)`。Task 13 / Task 14は未完了。
- `git diff --check` => PASS。whitespace errorなし（CRLF warningのみ）。
- `scripts/sanitize-codex-artifacts.ps1 -Path .codex/runs/20260813-093427-JST -Write -Check` => PASS（5 files、0 replacements、0 residual findings）。
- `pnpm run format:check`、`pnpm run lint:markdown`をRun Artifact追記後にも再実行し、PASSを確認した。`lint:markdown`は設定上`.codex/runs/**`を除外するためRun Artifactの直接Markdown検証ではない。
- Git mutation（add / commit / push / merge / rebase / tag / branch操作）は実施していない。Final Delivery remote runs、FINAL_CANDIDATE_SHA freeze、PR更新も実施していない。

## 2026-08-14 18:30 JST — Phase A serial / Local contract repair

### PR read-only state

- GitHub APIをread-onlyで取得し、PR #25は`open`、current HEADはユーザー提示どおり`f1694055e40d798c8ff9759f85ebae92577caa2f`、baseは`cef7aa97640fb7ffbe5db9d977b154083398cffb`、mergeable stateは`clean`であることを確認した。
- 同じHEADのActionsをread-onlyで確認し、Phase 1 CI #200（success）とNative CI #142（success）を確認した。これは既存HEADの履歴であり、今回のdirty worktree修正後CI PASSへ読み替えていない。

### Required repair

- `scripts/training/serial-resolution.ts`を追加し、`QA_TRAINING_ANDROID_SERIAL`、`TARGET_SERIAL`、`ANDROID_SERIAL`の非空値を全比較するpure resolverを実装した。複数値が異なる場合は具体的な環境変数名を含むErrorでfail-closeし、全値が同じ場合は候補順、1値だけの場合はその値、全空の場合は既存Maestro invocation契約どおり`undefined`を返す。
- `scripts/training/run-maestro-baseline.ts`は上記resolverを使用する。CIの`TARGET_SERIAL`単独設定は従来どおり有効であり、Physical Localで異なる古いserialが残る場合は暗黙選択しない。
- `tests/contracts/training-curriculum.test.ts`へbehavior testを追加し、QA-only、TARGET-only、ANDROID-only、全値同一、QA/TARGET conflict、TARGET/ANDROID conflict、全空の7ケースを確認した。focused結果は8 tests / 8 passedである。resolverの実装文字列をassertするテストは追加していない。
- `scripts/validate-curriculum.ts`は新しいpure helperの存在をTraining asset contractへ接続した。既存のLocal Physical routeとCI Emulator routeの分離テストは維持し、CI Workflowは変更していない。
- `docs/curriculum/test-automation/part1/07_maestro-native-automation.md`と`docs/native/windows-android-local-validation.md`へ、Canonical Local runの`$runId`を一度だけ定義し、Doctor / Prepareを含む全Native helper Action、3つのserial環境変数、`TRAINING_MAESTRO_OUTPUT_DIR`、Evidenceを同一Runへ揃える手順を追加した。Training Maestro outputは`.artifacts/native-local/<run-id>/maestro/training-baseline/`配下である。
- `docs/native/windows-android-local-validation.md`の固定`minSdk | 24`行を削除し、Android minimum APIは`app.config.ts`の`minSdkVersion`のみをSource of Truthとして残した。API 30を最低値へ固定していない。
- 統合Remediation PlanのCurriculum Matrix、Wave 6、Wave 8、Wave 10、§14.3、リスク／Current factのLocal記述から旧Local AVD必須契約を除去した。LocalはPhysical Device（explicit serial、`device`、authorization、awake、unlocked、supported API、ABI Auto、package service、Doctor / Prepare / Build / APK integrity / Install / Smoke / Test Control / Training baseline / Evidence / cleanup）とし、API34 / `google_apis` / `x86_64` / `pixel_2` / AVD create / Emulator bootはGitHub Native CIの契約として残した。
- `.github/workflows/native-ci.yml`と`training/github-actions/training-native-ci.yml`には差分がなく、CIのAPI34 / `google_apis` / `x86_64` Emulator、Formal Maestro、Training baseline、cleanup契約を維持している。iOS Build-onlyも変更していない。

### Validation

- 初回`pnpm run format:check`は新規helper / testのPrettier差分でFAILしたため、対象2ファイルのみPrettier整形後に再実行しPASSした。
- 初回`pnpm run lint:markdown`は新Plan節と実行タスクの間のMD032 1件でFAILしたため、空行を追加して再実行しPASS（250 files / 0 issues）した。Run Artifactは設定上lint対象外である。
- `pnpm run validate:spec` => PASS（3 challenges）。
- `pnpm run validate:curriculum` => PASS（22 required documents、4 workbook files、2 Training projects）。
- `pnpm run lint` => PASS（0 errors / 65 warnings。warningsは既存）。
- `pnpm run typecheck` / `pnpm run typecheck:training` => PASS。
- `pnpm exec vitest run tests/contracts/training-curriculum.test.ts --no-file-parallelism --maxWorkers=1` => PASS（8/8）。
- `pnpm run test:contracts`初回は既知の`native-production-module-resolution` 1件が5秒timeout（24 files / 209 passed）したが、同テストの30秒focused実行は4/4 PASSし、full再実行は25 files / 210 tests PASSとなった。今回の変更に起因する失敗は確認されていない。
- `pnpm run verify` => PASS（326.6 seconds。format、markdown、spec、curriculum、lint 0 errors / 65 warnings、typecheck、image、security、full test、Web build、spec buildを含む）。Full testのcontractsは25 files / 210 tests PASS。
- Phase AではADB、Maestro runtime、Android Build / Install、AVD / Emulatorを新規実行していない。既存のPhysical current-tree Evidence（Run ID `20260814-physical-canonical-contract-1633`）は履歴として保持し、新しいserial resolver / docs repairの実行証跡へ流用していない。

### Current decision

- Current-treeの新契約Physical Android runは既存EvidenceでDoctor / Prepare / Build with ABI Auto / APK integrity / Install / Smoke / Test Control 1/1 / Training Maestro 1/1 / Evidence / cleanupまでPASSしているが、今回のPhase A修正を含むworktreeは未commitである。exact committed snapshot Fresh Learnerはpendingとする。
- Task 13はunchecked、Task 14はunchecked、Progressは`90% (19/21)`を維持する。
- `run.json`は`status=partial` / `primary_failure_category=missing_validation`、`evaluation.json`は`result=partial` / `primary_failure_category=missing_validation`を維持する。FINAL_CANDIDATE_SHAは未freeze、Final Deliveryは未開始である。
- 次はユーザーがこの修正をcommit / pushした後、新exact PR HEADでFresh Training Copy + Physical Device Fresh Learnerを再実行し、そのHEADのRequired Phase 1 / Native CI successを確認する。Phase BとFinal Deliveryは今回開始しない。

## 2026-08-14 18:36 JST — Phase A self-review

- Diff triageでは、変更領域をTraining serial resolution、Local curriculum / runbook、統合Plan、validator contract、Active Run Artifactへ限定した。Product Business Logic、Formal Maestro expectation、Native CI Workflow、iOS Build-onlyには差分がない。
- Correctness: serial候補の優先順はQA → TARGET → ANDROIDで固定し、異なる非空値は暗黙選択せずthrow、全空は既存の自動選択可能な`undefined`を維持する。Pure helperの7 behavior caseとfocused 8/8で確認した。
- Regression: Training CIの`TARGET_SERIAL`単独経路は維持し、CIのAPI34 / `google_apis` / `x86_64` Emulator / Formal Maestro / Training baseline contractは既存Workflowとvalidatorで保持している。
- Evidence identity: Local教材とRunbookは同一`$runId`、同一serial、同一`TRAINING_MAESTRO_OUTPUT_DIR`を指定するため、Native helperとTraining baselineが別端末／別Runへ逸れる経路を残していない。
- No P1 / P2 finding。残余は今回の修正をcommit / pushした後のexact committed Fresh Learner、post-change Required CI、Final Delivery Readinessのみであり、Phase AのSource blockerは0件と判定する。

## 2026-08-14 19:22 JST — Phase B exact committed Fresh Learner完了

### Exact source / Fresh Training Copy

- GitHub PR #25の最新HEADとローカルHEADは`8e559880f13e33cd6b939eefafc174b5e3675fb4`で一致した。これを`SOURCE_CANDIDATE_SHA`として使用した。
- `training:copy:prepare`はこのfull SHAを解決し、Fresh Training Copyの`sourceSha`、`resolvedSourceSha`、detached `HEAD`を同一値へ揃えた。Fresh targetには実行前の`node_modules`、`output`、`.artifacts`がなく、`pnpm install --frozen-lockfile`を新規実行した。
- `training:copy:validate`はPASS。active workflowはTraining用2件だけで、Formal / Production workflowはCopyのarchiveへ分離された。
- Fresh Copyで`pnpm run validate:spec`はPASSし、Workbook 4件、Part 1 / Part 2のlearner document path checkは10件中10件存在を確認した。Copy後の`pnpm run validate:curriculum`は、Training Copyが意図的にFormal `.github/workflows/ci.yml`をactiveから外すため、その前提不足をfail-closeしたもの。これはTraining Copy contractの失敗ではなく、Copy専用の`training:copy:validate` PASSとsource側Curriculum validation PASSで分離した。

### Fresh Learner Web

- Dedicated Web runtime（`PLAYWRIGHT_BASE_URL=http://127.0.0.1:8182`、prebuilt `dist`）で次をすべてPASSした。
  - `pnpm run build:web`
  - `pnpm run training:web:baseline`: 1/1
  - `pnpm run training:web:mobile`: 1/1
  - `pnpm run training:web:mobile:exercise`: 1/1
  - `pnpm run training:web:check-expected-failure`: wrapper PASS、意図したchild failure、fresh screenshot / video / trace evidence PASS
- Web Evidenceは`<FRESH_TRAINING_COPY>/output/training/playwright/`配下にあり、既存worktreeのPlaywright outputを使用していない。

### Fresh Learner Physical Android

- AVD / Emulatorは起動・使用していない。`adb devices -l`はPhysical Device `354955112942476`（status=`device`）のみで、host emulator processは0だった。
- Shared Run IDは`20260814-phaseB-185135`。Native helper全Action、Training Maestro、Evidenceを同じRun ID、同じserialへ固定した。
- Device identity: API `30`、ABI `arm64-v8a,armeabi-v7a,armeabi`、Auto選択ABI `arm64-v8a`、`ro.kernel.qemu` / `ro.boot.qemu`はEmulator値でなく、`sys.boot_completed=1`、package service=`found`、package installed、awake、keyguard=`false`を確認した。API 30は最低対応値へ固定せず、repositoryの`app.config.ts` `minSdkVersion`との比較で判定した。
- `Doctor`: PASS。
- `Prepare`: PASS。Fresh Copyの依存、Native asset、image manifest、route dependency、Expo prebuildを生成した。
- 最初のBuildは、local `.pnpm` pathの`prefab_command.bat` CreateProcess error 2で失敗した。これはFresh CopyのVirtual Storeが短縮設定になっていなかった環境／Build setup failureであり、Source failureやDevice failureではない。`Install`以降はこの失敗後に開始していない。
- Runbook 4.3の有限fallbackとして、Fresh Copy内で`pnpm install --frozen-lockfile --virtual-store-dir=<PNPM_VIRTUAL_STORE>`を一度実行し、`expo prebuild --clean --platform android --no-install`で生成状態を更新した。その変更条件だけで同じserial / ABI / Run IDのBuildを再実行し、`BUILD SUCCESSFUL`を確認した。
- Final `Build -Architecture Auto`: PASS。APK `57,776,965` bytes、SHA-256 `1863D846DEE9C992A7B4D6192BB64C9D5CF544A3A08EACC491C0242C1236692F`、JS bundleあり、`arm64-v8a` native library 27件、`x86_64` library 0件。
- `Install`: PASS。`pm path`で`com.ryuyoshikawa.scenarioshop`を確認した。
- `Smoke`: PASS。Launcher起動後のapp processとfatal startup log absenceを確認した。
- `Test Control`: `maestro/native-test-control.yaml` 1/1 PASS。JUnitのdeviceは`354955112942476`。
- Training Maestro baseline: `pnpm run training:native:baseline` 1/1 PASS。`QA_TRAINING_ANDROID_SERIAL`、`TARGET_SERIAL`、`ANDROID_SERIAL`を同一serialへ設定し、outputを`<FRESH_TRAINING_COPY>/.artifacts/native-local/20260814-phaseB-185135/maestro/training-baseline/`へ出力した。JUnitのdeviceは同一serial、tests=`1`、failures=`0`。
- `Evidence`: `<FRESH_TRAINING_COPY>/.artifacts/native-local/20260814-phaseB-185135/evidence/`へ`screen.png`、`uiautomator.xml`、`maestro-hierarchy.txt`、`logcat.txt`、`activities.txt`を保存した。Native Test Control JUnitとTraining baseline JUnitも同じRun配下にある。
- `cleanup`: `am force-stop com.ryuyoshikawa.scenarioshop`後にapp PIDなし、ADBは対象Physical Device 1台、host emulator process 0を確認した。

### Exact-head CIとFresh Learner判定

- GitHub Actionsをread-onlyで再確認し、同じ`SOURCE_CANDIDATE_SHA`のPhase 1 CI #201とNative CI #143がともに`success`となった。Native CIのAPI34 / `google_apis` / `x86_64` Emulator、Formal Maestro、Training baseline保証は維持されている。
- Fresh WebとFresh Physical Androidが同じexact committed sourceで一続きにPASSしたため、Task 13を完了へ同期する。Phase BのFresh Learnerにおけるcurrent blockerは解消した。
- Final Delivery Readinessは未実施。Task 14は未完了、`FINAL_CANDIDATE_SHA`は未freeze、Final Delivery remote runsは未開始である。次はこのTask 13更新を含むRun Artifactをユーザーがcommit / pushし、その新exact HEADのRequired CIを確認した後、別フェーズでpre-freeze / Final Deliveryへ進む。

## 2026-08-14 18:48 JST — Phase B開始前のexact HEAD確認とpreflight

- GitHub PR #25をread-onlyで再取得し、`SOURCE_CANDIDATE_SHA`を`8e559880f13e33cd6b939eefafc174b5e3675fb4`として確定した。ローカル`HEAD`も同一SHAで、Phase Aの変更を含むworktreeはこの時点でcleanだった。
- 同SHAのGitHub Actionsは、Phase 1 CI #201とNative CI #143が`in_progress`であることを確認した。完了前の状態をPASSへ読み替えず、結果は後で再確認する。
- Fresh Training Copyはこのexact SHAから専用のdisposable targetへ作成し、既存worktreeの`node_modules`、Playwright output、Native artifactをFresh Learner Evidenceへ流用しない。Training CopyのGit clone / detached checkoutは、PR branchを変更しない専用target内だけで行う。
- `adb devices -l`はPhysical Deviceの`354955112942476`一台（status=`device`）だけを返し、emulator serialは存在しない。AVD / Emulatorは起動・使用しない。
- Skillのpreflightに従い、Fresh Copy作成・依存準備・Web dedicated runtime・Physical Android runtimeを別々に確認する。AndroidのBuild / Install / Test / MaestroはFresh Copyと同一Run ID、同一explicit serialで実行し、最初の失敗で後続を進めない。

### Fresh Copy準備の初回失敗

- `pnpm run training:copy:prepare -- --source-sha 8e559880f13e33cd6b939eefafc174b5e3675fb4 --target <DISPOSABLE_TARGET>` は、準備スクリプトがtargetのドライブ直下親を再帰作成しようとしてWindowsの`EPERM`になった。clone、checkout、依存準備、Runtimeは開始されていない。
- 原因はFresh Copy targetをドライブ直下へ置いたことによる準備スクリプトのtarget-parent条件であり、Source / Android / Device failureではない。既存targetを削除せず、親ディレクトリを持つ新しい短いdisposable targetへ一度だけ切り替える。

### Exact Fresh Training Copy確定

- `<FRESH_TRAINING_COPY>`をtargetとして、`training:copy:prepare`を再実行した。manifestの`sourceSha`、`resolvedSourceSha`、Copyのdetached `HEAD`はすべて`8e559880f13e33cd6b939eefafc174b5e3675fb4`で一致した。
- 新Copyでは`pnpm install --frozen-lockfile`を実行し、node_modulesを新規作成した。既存worktreeの依存関係は流用していない。
- `training:copy:validate -- --root <FRESH_TRAINING_COPY>`はPASSし、active workflowはTraining用2件、Production workflowはarchive済みであることを確認した。新Copyには実行前の`output` / `.artifacts`は存在しない。
- Phase Bの共有Run IDは`20260814-phaseB-185135`とする。Fresh Webの専用runtimeと、後続Physical AndroidのNative helper / Training Maestro / Evidenceは、それぞれこのRunの相対証跡へ保存する。

### Exact Fresh Physical Android — Build初回失敗

- Doctor、Prepare、Build直前preflightはPASSした。対象はserial `354955112942476`、ADB `device`、API 30、ABI候補`arm64-v8a,armeabi-v7a,armeabi`、Run ID `20260814-phaseB-185135`であり、emulator processは0だった。
- `android-local.ps1 -Action Build -Architecture Auto -RequirePhysicalDevice`は、Autoで`arm64-v8a`を選択した後、`:react-native-nitro-modules:configureCMakeRelWithDebInfo[arm64-v8a]`でFAILした。Install、Smoke、Test、Training Maestro、Evidenceは上流Build失敗のため実行していない。
- 最初の異常は、Gradleが`<FRESH_TRAINING_COPY>\\node_modules\\.pnpm\\...\\prefab_command.bat`を起動できずCreateProcess error 2になったこと。`cmdline-tools;latest`の`latest-2`不整合warningも出たが、失敗taskの直接原因とは分離して扱う。
- 原因仮説は、Fresh CopyのPrepare後にVirtual Storeが`<PNPM_VIRTUAL_STORE>`へ移らず、長いlocal `.pnpm` pathからCMake commandを生成したこと。次は`.modules.yaml`、pnpm config、生成batの存在を確認し、必要ならrunbook記載どおり短縮Virtual Storeを明示する一度限りの切り分けを行う。SourceやAPK、Device failureとはまだ分類しない。

### Build失敗の切り分け結果

- Fresh Copyの`node_modules/.modules.yaml`は`virtualStoreDir: <FRESH_TRAINING_COPY>\\node_modules\\.pnpm`、`virtualStoreDirMaxLength: 120`で、helperが設定する標準短縮Virtual Storeになっていなかった。
- 同じShellで短縮Virtual Storeを設定した`pnpm config list`は`virtual-store-dir=<PNPM_VIRTUAL_STORE>`、`virtual-store-dir-max-length=20`を返すため、pnpm設定値の読み取り自体は成功している。生成された`prefab_command.bat`は存在するが、パス長288文字のlocal `.pnpm`経路から起動されていた。
- したがって次の切り分けは、Runbook 4.3の手動fallbackに限定し、Fresh Copy内で短縮Virtual Storeを明示した`pnpm install --frozen-lockfile`を一度実行してから、同じABI / serial / Run IDでBuildを再実行する。APKが未生成のためInstall以降はまだ開始しない。

## 2026-08-14 19:28 JST — Phase B最終reconciliation

- 実行順序の最終事実は、`SOURCE_CANDIDATE_SHA=8e559880f13e33cd6b939eefafc174b5e3675fb4`のFresh Training Copy準備・validate・新規install、Dedicated Web（desktop / mobile / exercise / expected-failure）、Physical Android Doctor → Prepare → 短縮Virtual Store切り分け後のAuto Build → APK integrity → Install → Smoke → Test Control 1/1 → Training Maestro baseline 1/1 → Evidence → cleanupである。AVD / Emulatorは一度も使用していない。
- Physical Evidence identityはserial `354955112942476`、API 30、Auto ABI `arm64-v8a`、Run ID `20260814-phaseB-185135`であり、Native helperとTraining Maestro outputを同一Runへ紐付けた。cleanup後のapp PIDは空、ADBはPhysical Deviceのみ、host emulator processは0だった。
- Exact SHAのPhase 1 CI #201 / Native CI #143はsuccess。Task 13は`[x]`、Task 14は`[ ]`、Progressは`95% (20/21)`。`run.json` / `evaluation.json`はFinal Delivery未完了のため`partial` / `missing_validation`を維持し、FINAL_CANDIDATE_SHAは未freezeである。
- 本追補はREPORT append-onlyの最終current-state記録であり、過去のAVD ANR、旧Physical補助証跡、Phase A記録は削除・改変していない。今回のPhase B実行でSource blockerは0件、残りはRun Artifactのユーザーcommit / push後の新exact-head Required CIとFinal Delivery Readinessだけである。

## 2026-08-14 19:30 JST — Phase B Run Artifact最終検証

- `run.json` / `evaluation.json` JSON parseはPASS。`run.json.status` / `evaluation.json.result`は`partial`、両方の`primary_failure_category`は`missing_validation`を維持した。
- TASKS checkbox recountは21件中20件完了、`Progress: 95% (20/21)`。Task 13はchecked、Task 14はuncheckedである。
- `pnpm run format:check`、`pnpm run lint:markdown`、`git diff --check`はPASS。`lint:markdown`は設定上`.codex/runs/**`を除外している。
- `scripts/sanitize-codex-artifacts.ps1 -Path .codex/runs/20260813-093427-JST -Write -Check`はPASS（5 files、0 replacements、0 residual findings）。
- GitHub PR #25 latest HEADは`8e559880f13e33cd6b939eefafc174b5e3675fb4`、Phase 1 CI #201 / Native CI #143はsuccess。Run Artifact追補はまだcommit / pushしていないため、Final Delivery前の新exact-head Required CIは次段階で実施する。

## 2026-08-14 19:56 JST — Run Artifact push後のexact-head Required CI待機

- GitHub PR #25をread-onlyで再取得し、ユーザーがRun ArtifactのTask 13 reconciliationをpush済みであることを確認した。現在のPR HEADは`86ee40a23a18a5c7bb1b9917be626c598fb46103`で、ローカルHEADと一致し、worktreeはcleanである。
- このHEADのPhase 1 CI #202は`queued`、Native CI #144は`in_progress`。未完了のCIをPASSへ読み替えず、このexact HEADの両Required CI successを待つ。
- `FINAL_CANDIDATE_SHA`はまだfreezeしない。Final Delivery remote runsもまだ開始しない。CI結果確定後にpre-freeze判定を更新する。

## 2026-08-14 20:31 JST — exact-head Required CI結果とDelivery経路確認

- GitHub PR #25のcurrent HEADは`86ee40a23a18a5c7bb1b9917be626c598fb46103`で、ローカルHEADと一致する。
- 同一SHAのPhase 1 CI #202（Run ID `31794035175`）とNative CI #144（Run ID `31794035473`）は、read-only取得でともに`completed / success`を確認した。Native CIの`Android Runtime / Maestro`ではAPI 34 Emulator、Formal Maestro、`Run Training Maestro baseline`、Production-validationがsuccessで、Runtime evidence artifactも生成されている。
- Source Repositoryのactive workflowはPhase 1 CI、Generate pnpm lockfile、Native CI、Native iOS CIであり、Training Workflow template（`training-ci.yml` / `training-native-ci.yml`）はSource Repositoryのactive workflowではない。Repository、環境変数、関連設定からInstructor管理のGitHub Training Copy repository / branchを特定できなかった。
- したがって、Final Delivery Readinessに必須のTraining Copy上のWeb baseline、Android baseline、Web expected-failureの3 remote runは、現時点では実行対象が存在せず開始できない。Source Required CI、既存Local Physical Android evidence、Native CI Emulator runをFinal Delivery 3 runの代替にはしない。
- `FINAL_CANDIDATE_SHA`はfreezeしていない。Final Deliveryは未開始、Task 14は未完了のまま維持する。`run.json` / `evaluation.json`の`partial` / `missing_validation`も、remote Training Copy Delivery未実施という現在状態と整合する。

## 2026-08-14 21:06 JST — Owner scope decisionによるRequired DoD再定義

- Owner Decisionにより、PR #25のRequired Definition of Doneを「Required Curriculum、Workbook / Training assets、Formal / Training境界、Curriculum validator、Training Playwright desktop / mobile、learner exercise、expected-failure lifecycle、Windows Local Physical AndroidのTraining Maestro baseline、GitHub Native CI API34 EmulatorのTraining baseline、`pnpm run verify`、Current PR HEADのPhase 1 / Native CI、Critical / High Source findingの解消」へ再定義した。
- Instructor管理のremote Training Copy repository作成・publish、remote Web / Android / expected-failureの3 runs、`FINAL_CANDIDATE_SHA` freeze、Delivery start / end PR HEAD equality、Training Copy resolved SHA equality、Final Delivery Recordは、Future operational validation / optional instructor validationへdeferする。これらを今回のRequired DoD、Merge blocker、Task、Progress denominator、failureへ含めない。
- 既存のTraining Copy prepare / validate機能は、安全な教材Copyを作成・検証するRequired Assetとして維持する。Windows Local Physical Android Canonical、GitHub Native CI API34 / `google_apis` / `x86_64` Emulator、Formal / Training境界、iOS Build-only保証、既存Source implementationは変更しない。
- 過去のFinal Delivery計画、remote未実施、AVD System UI ANR、旧Physical Device補助証跡は削除・改変せず、今回のcurrent-state reconciliationをこの追補として記録した。`docs/adr/0013-curriculum-pr-required-dod-scope.md`と`docs/history/2026-08-14_210220_curriculum-required-dod-scope.md`にもOwner Decisionを記録した。
- `TASKS.md`ではTask 14を`Deferred by Owner Decision / not required for PR #25`へ移し、Required task 20件を分母として`Progress: 100% (20/20)`へ再計算した。Task 13はchecked、Task 14はdeferredであり、Blockedはなし。`FINAL_CANDIDATE_SHA`はfreezeしていない。Final Deliveryは意図的に開始していない。
- `run.json` / `evaluation.json`ではremote Training Copy repository不存在・remote 3 runs未実施をcurrent failure / blockerから除外した。今回の追補は未commitのため、次のユーザーcommit / push後に新exact HEADのPhase 1 CI / Native CIを確認することだけをcurrent missing validationとして残す。86ee40aのPhase 1 CI #202 / Native CI #144 successは、今回の追補前の既存Evidenceとして扱い、追補後のCI PASSとは主張しない。

### Repair-loop iteration record

- iteration_number: 1
- input finding: Owner Decisionにより、remote Training Copy DeliveryをPR #25 Required DoDから除外し、旧Task 14 / `missing_validation` current stateを再評価する必要が生じた。
- repair plan: Source implementationとCI保証を変更せず、統合Plan、ADR、Project Context、Active RunのPLAN / TASKS / REPORT / run.json / evaluation.jsonへRequired / Optional境界を同期する。Task 14はDeferredとしてProgress分母から除外し、履歴はappend-onlyで保持する。
- allowed files: `docs/plans/2026-08-10_141200_test-automation-curriculum-remediation.md`、`docs/adr/0013-curriculum-pr-required-dod-scope.md`、`docs/history/2026-08-14_210220_curriculum-required-dod-scope.md`、`docs/PROJECT_CONTEXT.md`、`.codex/runs/20260813-093427-JST/{PLAN,TASKS,REPORT,run,evaluation}`。
- changed files: 上記allowed files。既存Source implementation、Formal / Training workflow、CI Emulator契約は変更なし。
- validation plan: JSON parse / evaluation schema、TASKS recount、format:check、lint:markdown、validate:spec、validate:curriculum、lint、typecheck、typecheck:training、focused / full contracts、verify、git diff --check、Run Artifact sanitizer、stale current-contract search。
- result: static / local validationを実行し、Required DoDとFuture operational validationの境界を同期する。次exact-head Required CIはユーザーcommit / push後に実行する。
- remaining_delta: Future operational validationとしてのremote Training Copy Deliveryのみ。これはPR #25のRequired blockerではない。
- decision: stop_success（今回のOwner scope repairは完了。Final Deliveryは開始しない。）

## 2026-08-14 21:33 JST — Owner scope変更後の最終validation

- `pnpm run format:check`: PASS。
- `pnpm run lint:markdown`: PASS（252 files、0 issues。`.codex/runs/**`は設定上除外）。
- `pnpm run validate:spec`: PASS（3 challenges）。
- `pnpm run validate:curriculum`: PASS（22 required documents、4 workbook files、training-chromium / training-mobile-chromium）。
- `pnpm run lint`: PASS（0 errors / 65 warnings。warningsは既存）。
- `pnpm run typecheck`: PASS。`pnpm run typecheck:training`: PASS。
- focused `tests/contracts/training-curriculum.test.ts`: PASS（8/8）。
- `pnpm run test:contracts`: 初回は`native-production-module-resolution`の既知のVitest既定5秒timeoutで24/25 files・209/210 testsまで進んでFAIL。`--testTimeout=30000`のfocused 4/4 PASS後に全体を再実行し、25/25 files・210/210 testsでPASS。
- `pnpm run verify`: PASS（最終実行311.2秒、全test、security、Web build、Spec buildを含む。lintは0 errors / 65 warnings）。
- `run.json` / `evaluation.json`: JSON parse PASS。Evaluation schema shape validation PASS。Task recountはRequired checked 20、Required unchecked 0、Task 14 Deferred、`Progress: 100% (20/20)`。
- Repository-wide stale reference確認では、current normativeなDelivery記述をOptional / Futureへ統一し、Part 2教材とInstructor Referenceにも「将来の任意Operational validation」を明示した。GitHub Native CIのAPI34 / `google_apis` / `x86_64` Emulator契約は残っている。
- `git diff --check`: PASS（CRLFのwarningのみ）。`scripts/sanitize-codex-artifacts.ps1 -Path .codex/runs/20260813-093427-JST -Write -Check`: PASS（5 files、0 residual findings）。
- 変更したのはDoD / Plan / ADR / Project Context / curriculum wording / Active Run Artifactのみで、既存Source implementation、Training Copy prepare / validate、Formal / Training workflow、CI Emulator、iOS Build-only保証は変更していない。
- Current PR HEAD `86ee40a23a18a5c7bb1b9917be626c598fb46103`のPhase 1 CI #202 / Native CI #144はsuccessだが、今回の未commit scope追補を含むCIではない。ユーザーのcommit / push後に新exact HEADのPhase 1 / Native CIを確認する。remote Training Copy Delivery未実施はcurrent failure / blockerではない。
