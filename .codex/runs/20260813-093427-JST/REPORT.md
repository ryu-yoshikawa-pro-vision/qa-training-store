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
