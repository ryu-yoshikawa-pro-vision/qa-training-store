# PR 5 child Plan: Training Baseline / Exercise / Artifact / Completion Evidence

## Status

- 状態: **Plan only / implementation not started**
- base `main`: `a82c9792213e53f03c4309f53758e31dca56a28f`
- 作業branch: `docs/pr5-training-evidence-plan`
- Plan path: `docs/plans/2026-09-05_pr5_training_baseline_exercise_artifact_evidence.md`
- 作業開始時にremote `main`を再確認し、PR #116 merge後の既知SHA `a82c9792213e53f03c4309f53758e31dca56a28f`から進んでいないことを確認した。
- 本PlanではCurrent Repositoryのread-only auditと実装計画だけを行う。Training runner、workflow、package script、test、Curriculum、Rubric、validator、Product、Specの実装変更はまだ開始しない。
- Issue #72はTracking Indexとして扱い、本Plan作成時点では更新しない。Findingや実装手順を第三のSSOTへ複製しない。

## Goal

Master Plan §17のPR 5を実施し、Training harness / environmentの正常性を示すBaselineと、受講者自身が作成したLearner exercise、その実行Artifact、Competency Completion Evidenceを明確に分離する。Web Commonでは受講者がcanonical commandから自分のexerciseを実行・判定でき、Native specializationではC08の`learner-authored Native exercise diff + successful Maestro execution artifact`を生成できるようにする。同時に、Native runtimeをCommon learnerへ暗黙強制せず、Product Formal Regression / Required GateをTraining exerciseから分離したまま維持する。

## Source of truth / audit inputs

本Planは次をCurrent `main`で照合した結果を正本とする。

- `docs/plans/2026-08-24_201800_curriculum_test_strategy_remediation_master.md`
- `docs/plans/2026-09-05_pr4a_curriculum_self_study_remediation.md`
- `docs/curriculum/test-automation/README.md`
- `docs/curriculum/test-automation/00_learning-design.md`
- `docs/curriculum/test-automation/02_competency-rubric.md`
- `docs/curriculum/test-automation/part1/04_playwright-foundations.md`
- `docs/curriculum/test-automation/part1/05_playwright-e2e-practice.md`
- `docs/curriculum/test-automation/part1/06_execution-and-failure-analysis.md`
- `docs/curriculum/test-automation/part1/07_maestro-native-automation.md`
- `docs/curriculum/test-automation/part1/09_part1-capstone.md`
- `docs/curriculum/test-automation/part2/05_playwright-ci.md`
- `docs/curriculum/test-automation/part2/06_native-ci-maestro.md`
- `docs/curriculum/test-automation/part2/08_integration-design-capstone.md`
- `docs/reference/curriculum-self-study-review.md`
- Current Training implementation / workflow / validator / contract test

Master Planや過去FindingのCurrent State記述は、そのまま実装入力にせずCurrent fileへ再照合した。

## Fixed inherited contracts

以下はPR 3 / PR 4Aからの固定契約であり、PR 5で再設計しない。

### Common / Native specialization

- Part 1 Common completion: `C01〜C07 + C09〜C10` bounded Level 2。
- Part 2 / Final Common completion: `C01〜C07 + C09〜C12` bounded Level 2。
- `C08`、Physical Android、Maestro Native automation、Native CIはNative specializationであり、Common completionには要求しない。

### Route

- Part 1 Common: `P1-6 → P1-8 → P1-9`
- Part 1 Native: `P1-6 → P1-7 → P1-8 → P1-9`
- Part 2 Common: `P2-5 → P2-7 → P2-8`
- Part 2 Native: `P2-5 → P2-6 → P2-7 → P2-8`

Training入口の追加によってこのbranch / skip / rejoinを変更しない。

### Evidence boundary

- BaselineはHarness / Environment / Starter assetが正常であることのEvidence。
- Learner exerciseは受講者自身が変更・作成した成果物と実行結果。
- Competency EvidenceはRubricのMinimum Evidenceを満たすlearner-authored成果物。
- C07 Minimum Evidenceは`learner-authored Playwright exercise change + successful Web execution evidence`。
- C08 Minimum Evidenceは`learner-authored Native exercise diff + successful Maestro execution artifact`。
- stock starter / baseline / stock flowのPASSだけではC07 / C08 competency completionにならない。
- 外部提出や新しいlearner-state DBはRequiredではない。既存Training Copy source SHA、Git / PR diff、Run Artifactを利用する。

### Instructor support boundary

Instructor / 運営はEnvironment、Account、Permission、Device、Training Copy、Infrastructure、Toolchainを支援できる。学習内容、回答、成果物品質、Self-check、Completion判定をInstructorの非公開判断へ依存させない。

### Product / Formal Test boundary

- Product Formal Regressionを変更しない。
- Product Required Gateへlearner exerciseを追加しない。
- Android Runtime guarantee / iOS Build-only guaranteeを変更しない。
- Common learnerのPRへNative runtimeをRequired化しない。
- Training Testは`training/`、Formal Web Regressionは`e2e/web/`、Formal Nativeは`maestro/` / Product workflowを正本として分離する。

## Pre-plan Current State audit

### Web

| Area | Current state | PR 5 judgment |
| --- | --- | --- |
| Baseline command | `training:web:baseline`が`training/playwright/baseline`を`training-chromium`で実行する | 維持 |
| Desktop learner exercise command | `training/playwright/exercises/`は存在するが`training:web:exercise`は存在しない | `fix_now` |
| Mobile baseline | `training:web:mobile`がbaselineを`training-mobile-chromium`で実行する | 維持 |
| Mobile learner exercise | `training:web:mobile:exercise`が`training/playwright/exercises`を`training-mobile-chromium`で実行する | 維持 |
| Expected failure | raw command `training:web:expected-failure`と、失敗・Evidenceを機械判定して正常終了する`training:web:check-expected-failure`が存在する | taxonomyは増やさず、learner-facing / CIではcheck commandをcanonicalにする |
| Training config | `playwright.training.config.ts`の`testDir`は`training/playwright`、projectは`training-chromium` / `training-mobile-chromium` | 維持。新project / runnerを作らない |
| Learner exercise asset | `training/playwright/exercises/training-exercise-starter.spec.ts`が存在し、stock状態でもPASSする | starter PASSはcompetencyではないことを維持 |
| Output | `output/training/playwright/test-results`、`output/training/playwright/report`。Trace / Screenshot / Videoはfailure時に保存 | Webは1 invocation単位の既存output rootを維持し、command / spec path / CI Artifact nameでbaselineとexerciseを識別する。output分離のためだけの新runnerは作らない |
| Training Web CI | `training/github-actions/training-ci.yml`はPRでbaseline、manualでbaseline / raw expected-failureのみ。learner exercise modeがない | `fix_now` |
| CI Artifact | `training-web-<run_id>-<attempt>`でmodeを識別できない | `fix_now`: modeをArtifact nameへ含める |

### Native

| Area | Current state | PR 5 judgment |
| --- | --- | --- |
| Baseline command | `training:native:baseline` → `scripts/training/run-maestro-baseline.ts` | 維持 |
| Learner exercise command | `training/maestro/exercises/native-training-exercise.yaml`は存在するがpackage command / runnerがない | `fix_now` / RA-G4 |
| Learner exercise YAML | baseline Flowを`runFlow`し、stockの`assertVisible`だけを持つ | canonical assetとして再利用。stock PASSはC08 completionにしない |
| Serial resolution | `scripts/training/serial-resolution.ts`ですでに共通化済み | 再利用 |
| Maestro invocation | `scripts/training/maestro-invocation.ts`ですでに共通化済み | 再利用 |
| Cleanup | ADB ready check / force-stop / `pm clear` / `pidof`待機が`run-maestro-baseline.ts`内部に約束として存在する | exercise runnerで複製せず、Native Training専用の小さいhelperへ抽出する |
| Baseline output | default `output/training/maestro`、JUnit `training-native-baseline.xml`、flow内Screenshot `training-native-baseline` | baseline / exerciseを同一workflowで実行できるよう`baseline` namespaceへ明確化 |
| Local Native route | Windows Fresh Learnerは`android-local.ps1` + explicit serial + `-RequirePhysicalDevice` + Training baseline。Physical Androidがcanonical | 維持。Native specializationだけのconditional validation |
| Training Native CI | `training-native-ci.yml`は`pull_request`全体と`workflow_dispatch`で起動し、baselineだけ実行する | `fix_now`: specialization opt-in + exercise mode |
| Native CI Artifact | `training-android-<run_id>-<attempt>`、収集先はrunner temp配下。baseline/exercise mode識別なし | `fix_now` |
| Native failure exercise | `training/maestro/failure-exercises/README.md`のみでexecutable Flowなし | Current factはRA-G5と一致。PR 5では`defer` |

### Contract / Training Copy

| Area | Current state | PR 5 judgment |
| --- | --- | --- |
| Rubric | C07 / C08のlearner-authored Minimum Evidenceとbaseline非代替を明記済み | 変更しない |
| Curriculum route | Common / Native branch・skip・rejoinはPR 4Aで明記済み | 変更しない |
| Self-study checklist | Command / Artifact / Environment block、baseline / learner-authored境界をcriteriaとして保持 | 原則変更しない。実装後に事実差が生じた場合だけ最小参照修正 |
| Curriculum validator | `scripts/validate-curriculum.ts`は既存Training script群の存在と`training:web:mobile:exercise` exact contractを確認するが、desktop / native exercise commandは未要求 | new canonical commandだけ最小追加 |
| Workflow contract | `scripts/training/workflow-contract.ts` allowlistはbaseline / raw expected-failure / native baselineまで | new approved repository commandだけ最小追加 |
| Contract test | `tests/contracts/training-curriculum.test.ts`がroute、C08 evidence、Training/Formal分離、workflow安全境界、Native cleanup等を検証 | 既存fileへ必要最小限のassertionを追加。新しいcontract frameworkは作らない |
| Training Copy | `prepare-training-copy.ts`がSource SHAからCopyを作り、active workflowを`training-ci.yml` / `training-native-ci.yml`だけに置換する | 2-workflow構成は維持 |
| Training Copy validation | active workflow allowlist、template一致、workflow contractを検証 | 基本ロジックは維持。新modeのための変更はworkflow contract /既存contract test側を優先 |

## Master Finding re-check

| Master candidate | Current judgment |
| --- | --- |
| RA-G4 | **残存**。Native exercise YAMLはあるがcanonical direct entry / exercise runner / distinct artifact contractがない。PR 5 Primary ownerで`fix_now`。 |
| RA-G5 | **事実として残存**。READMEのみ。ただしC08 Minimum EvidenceにもCommon C09にも専用Native failure Flowは必須ではないため`defer`。 |
| CUR-M5 | Rubric / Curriculum上のbaseline vs learner assessment境界は解消済み。実行基盤側の残差だけPR5-F002 / F004として扱う。 |
| CUR-M7 | **実行基盤側に残存**。desktop / native direct entryとTraining CI learner exercise modeが不足。PR5-F001〜F004へ統合する。 |
| CUR-M10 | PR 4Aの教材監査は完了済み。新canonical commandが存在しないために残る縦方向のcommand / Artifact mismatchだけPR5-F001〜F004で解消する。再度Curriculum全面監査はしない。 |
| CUR-L5 | PR 4Aで一般的な前提・Next actionは整理済み。desktop / native exerciseのcanonical next actionがない残差だけPR5-F001 / F002で解消する。 |

## Confirmed Findings

Findingを増やすこと自体を目的にせず、PR 5 Objectiveへ直接必要なCurrent gapだけを残す。

| ID | Severity | Disposition | Primary owner | Exact target | Current state | Problem / impact | Minimum fix | Related contract | Validation | State |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| PR5-F001 | P2 | `fix_now` | Task 1 — Web learner entry | `package.json#scripts`, `scripts/validate-curriculum.ts`, learner-facing Web command sections | Desktop exercise directoryはあるが`training:web:exercise`がない | Common C07 learnerがraw Playwright commandを組み立てる必要があり、Command / Completion Evidenceが一意でない | existing Training config / `training-chromium`を直接使うpackage commandを1つ追加し、validator /必要最小限の教材参照を同期する | Master PR5 Web changes / C07 / CUR-M7 / CUR-M10 / CUR-L5 | commandが`training/playwright/exercises`だけを`training-chromium`で実行し、Formal E2Eを含めない | pending |
| PR5-F002 | P2 | `fix_now` | Task 2 — Native learner entry | `package.json#scripts`, `scripts/training/run-maestro-baseline.ts`, new explicit exercise runner, `training/maestro/exercises/native-training-exercise.yaml` | learner YAMLはあるがbaseline以外のdirect entry / JUnit / exercise Artifact契約がない | C08のsuccessful Maestro artifactをlearnerがcanonicalに生成できない。baseline PASSとexercise結果を混同しやすい | `training:native:exercise`、explicit exercise runner、既存serial / invocation reuse、非trivial cleanupのみshared helper化、baseline/exercise output / JUnit / screenshotを識別する | RA-G4 / CUR-M5 / CUR-M7 / C08 | baselineとexerciseが別command・flow・JUnit・evidence namespaceで実行でき、stock PASSだけではC08 completionにならない | pending |
| PR5-F003 | P2 | `fix_now` | Task 3A — Web Training workflow | `training/github-actions/training-ci.yml`, `scripts/training/workflow-contract.ts`, `tests/contracts/training-curriculum.test.ts` | workflowはbaseline / raw expected-failureだけでlearner exerciseを実行できず、Artifact名にmodeがない | P2-5のlearner-authored Web CI EvidenceとCurrent workflowが一致しない。expected failureもraw red runとcontract successを区別しにくい | manual `exercise` modeを追加し、expected-failureは`training:web:check-expected-failure`をcanonicalにし、Artifact名へmodeを付与する。PR defaultはbaselineのまま | CUR-M7 / CUR-M10 / P2-5 / self-study checklist | manual exerciseがlearner specだけを実行し、expected-failure contractが期待どおり成功し、Artifact modeを識別できる | pending |
| PR5-F004 | P2 | `fix_now` | Task 3B — Native Training workflow | `training/github-actions/training-native-ci.yml`, `scripts/training/workflow-contract.ts`, `tests/contracts/training-curriculum.test.ts` | Native Training workflowが全PRで起動しbaselineだけ実行する | Native specializationを選択しないCommon learnerにもNative runtimeが暗黙実行され得る。P2-6のlearner Flow CI Evidenceも生成できない | `workflow_dispatch`を維持しbaseline / exercise modeを追加。`pull_request.paths`をNative specialization asset / runner / active workflowへ限定し、PR時はexercise evidenceを生成する。broad `training/**` / Curriculum docsをtriggerにしない | Master PR5 Native changes / specialization opt-in / RA-G4 / CUR-M7 / P2-6 | Common-only changeでNative workflowがtriggerされず、Native exercise changeではbaselineとexercise evidenceを区別して取得できる | pending |
| RA-G5 | P3 | `defer` | Follow-up — continuous learner review | `training/maestro/failure-exercises/README.md` | executable Native failure Flowはない | 現時点ではC08 Minimum Evidenceを阻害せず、C09 Common failure analysisはWeb expected-failure / learner failureで成立する | PR 5では新failure Flow / runner / commandを追加しない。将来のlearner reviewでNative専用failure exerciseが不可欠とEvidenceで確認された場合だけ再検討する | Master RA-G5 / C08 / C09 / P1-6 / P2-6 | PR5 DoDがNative failure harnessなしで成立し、P1-7 / P2-6 completionに未公開failure Flowを要求しない | pending |

## Scope

### In scope

- Training Web / Native baselineとlearner exerciseのcanonical実行入口
- learner exercise result / Artifactの識別
- Web expected-failureの既存contractをlearner-facingに一意化
- Native exerciseのserial resolution / cleanup / Maestro invocation reuse
- Training Web workflowのmanual learner exercise Evidence
- Training Native workflowのspecialization opt-inとlearner exercise Evidence
- Training workflow allowlist / Curriculum validator /既存contract testの最小同期
- command / Artifactの事実が変わる箇所だけのboundedなlearner-facing参照更新
- `docs/reference/curriculum-self-study-review.md`とのmanual cross-check

### Out of scope

- Product behavior / Seed / Test Control / Normative Specification変更
- Product Formal Regression / Product Required Gate / `.github/workflows/ci.yml` / `.github/workflows/native-ci.yml` / `.github/workflows/native-ios-ci.yml`のlearner exercise化
- Formal Test Strategy再設計
- Competency集合、C07 / C08 Minimum Evidence、Common / Native routeの再設計
- Curriculum全面rewrite、Rubric再採点設計、Instructor grading
- executable Native failure exercise追加（RA-G5 defer）
- scoring engine、learner-state DB、AI grader、LMS、Evidence DB、Finding DB
- generic Training framework、plugin system、baseline / exercise差を隠す巨大wrapper
- Pilot実測、所要時間評価、継続learner reviewの実施結果保存
- Phase 6 Refactoring decision

## Simplicity / design constraints

1. Web desktop exerciseは新runnerを作らず、既存`playwright.training.config.ts`と`training-chromium`へpackage scriptを直結する。
2. `training:web:mobile:exercise`は現行構造を維持し、DesktopとMobileを1commandへ統合しない。
3. WebのPlaywright output rootは既存`output/training/playwright`を維持する。baseline / exerciseは1 invocation内で混在しないため、spec pathとmode付きCI Artifact nameを識別子とする。output directory分離のためだけにlifecycle-aware configやWeb wrapperを新設しない。
4. Nativeは同一workflow内でbaselineとexerciseを連続実行し得るため、`output/training/maestro/baseline`と`output/training/maestro/exercise`、別JUnit名、別Screenshot名で明示的に分ける。
5. Nativeの`serial-resolution.ts`と`maestro-invocation.ts`は既存helperをそのまま再利用する。
6. `run-maestro-baseline.ts`内部のADB cleanupは長く、exercise runnerへ複製するとdriftしやすいため、その処理だけを小さいNative Training helperへ抽出する。baseline / exercise runner自体は別fileのexplicit entryとして残し、flow / JUnit / label差を隠さない。
7. Training workflow contractは既存allowlistへ必要なcommandだけ追加する。新validator frameworkは作らない。
8. Contract testは`tests/contracts/training-curriculum.test.ts`へ集約し、新しいtest infrastructureを作らない。
9. stock starter / stock Native FlowのPASSを機械的なCompetency PASSへ昇格させない。Diff + Run Evidenceの組み合わせを既存Git / PR / Artifactから確認する。

## Implementation tasks

> 以下は実装PRで行うTaskであり、本Plan作成branchではまだ変更しない。

### Task 1 — Web desktop learner exercise direct entry

**Exact targets**

- `package.json`
- `scripts/validate-curriculum.ts`
- `docs/curriculum/test-automation/part1/04_playwright-foundations.md`
- `docs/curriculum/test-automation/part1/05_playwright-e2e-practice.md`（command参照が必要な箇所だけ）
- `docs/curriculum/test-automation/part1/06_execution-and-failure-analysis.md`

**Current state**

`training/playwright/exercises/`と`training-chromium`は存在するが、desktop learner exerciseのcanonical package commandがない。P1-4 / P1-6ではbaselineまたは「target specをTraining Configで実行」となっており、learnerがraw commandを組み立てる余地がある。

**Change**

- `package.json`へ次の意味を持つ`training:web:exercise`を追加する。
  - target: `training/playwright/exercises`
  - config: `playwright.training.config.ts`
  - project: `training-chromium`
- `training:web:mobile:exercise`は変更しない。
- `scripts/validate-curriculum.ts`で`training:web:exercise`の存在だけでなく、上記target / projectへ接続するexact contractを検証する。
- P1 learner-facing materialは、raw Playwright invocationの代わりに`pnpm run training:web:exercise`をcanonical next actionとして示す。
- stock starter PASSはHarness / starter execution evidenceに過ぎず、C07はlearner-authored diff + successful execution evidenceが必要であることをcommand説明の近傍で維持する。

**Reason**

Common C07 learnerが実装者知識なしで一意なcommandを選べるようにする。新runnerを追加せず、既存Training projectをそのまま利用する。

**Expected contract**

- `training:web:baseline` = harness / environment check
- `training:web:exercise` = Desktop learner-authored Web exercise execution
- `training:web:mobile:exercise` = Mobile Web learner exercise execution
- どのcommandもFormal `e2e/web/**`を実行しない

**Validation**

- `pnpm run training:web:baseline`
- `pnpm run training:web:exercise`（post-change）
- `pnpm run training:web:mobile:exercise`
- `pnpm run validate:curriculum`
- `pnpm run test:contracts`

### Task 2 — Native learner exercise direct entry and distinct evidence

**Exact targets**

- `package.json`
- `scripts/training/run-maestro-baseline.ts`
- new bounded helper: `scripts/training/android-app-cleanup.ts`
- new explicit runner: `scripts/training/run-maestro-exercise.ts`
- `training/maestro/exercises/native-training-exercise.yaml`
- `docs/curriculum/test-automation/part1/07_maestro-native-automation.md`

**Current state**

Native exercise YAMLは存在するがdirect entryがなく、baseline runnerだけがserial resolution / cleanup / Maestro invocation / JUnitを実行する。serial resolutionとMaestro invocationは既にshared helperだが、cleanupだけbaseline runner内部に残っている。

**Change**

- `run-maestro-baseline.ts`のADB cleanup処理をsemantics-preservingに`android-app-cleanup.ts`へ移す。
  - package ID、device ready、force-stop、`pm clear`、process exit waitの挙動を変更しない。
  - Product Native helperへ移さずTraining namespace内だけで共有する。
- baseline runnerは既存`serial-resolution.ts` / `maestro-invocation.ts` / new cleanup helperを使い、default evidence rootを`output/training/maestro/baseline`、JUnitを`training-native-baseline.xml`として明示する。
- `run-maestro-exercise.ts`を追加し、同じ3 helperを使う一方、次をexplicit constantとして持つ。
  - flow: `training/maestro/exercises/native-training-exercise.yaml`
  - default evidence root: `output/training/maestro/exercise`
  - JUnit: `training-native-exercise.xml`
  - success label: learner exerciseであることが分かる文言
- `package.json`へ`training:native:exercise`を追加する。
- exercise YAMLの最後にexercise固有Screenshot（例: `training-native-exercise`）を追加し、baseline Flow内のScreenshotと区別する。
- P1-7のPhysical Android手順ではbaseline成功後に、別の`TRAINING_MAESTRO_OUTPUT_DIR`（同一`runId`配下の`training-exercise`）で`pnpm run training:native:exercise`を実行する。
- C08 completionはrunnerのPASSだけでなく、learner-authored YAML diffとsuccessful exercise Artifactの両方を指す。

**Reason**

RA-G4を最小変更で解消する。cleanupの非trivialな重複だけを避け、baseline / exerciseのflowやJUnitをgeneric mode runnerで隠さない。

**Expected contract**

- baseline command failure = Native harness / environment / runner側をまず疑う入口
- exercise command failure = Environment blockを先に切り分けた上でlearner exercise / assertion failureを分析
- baseline Artifact ≠ C08 completion
- exercise Artifact alone ≠ C08 completion。Git / PR diffも必要

**Validation**

- TypeScript gateでshared helperと2 runnerが型検証される
- Native runtime環境がある場合だけbaseline / exerciseを同じserialで実行
- baseline / exerciseのJUnit filename、output namespace、Screenshot名が衝突しない
- serial conflict / cleanup fail-closedの既存contract testが維持される

### Task 3A — Web Training workflow exercise / expected-failure evidence

**Exact targets**

- `training/github-actions/training-ci.yml`
- `training/github-actions/README.md`
- `scripts/training/workflow-contract.ts`

**Current state**

`workflow_dispatch.mode`はbaseline / expected-failureだけで、learner exerciseをCI実行できない。expected-failure modeはraw failure commandを直接実行するため、意図した失敗とunexpected workflow failureの意味が分かれにくい。Artifact名もmode非依存。

**Change**

- `workflow_dispatch.mode`へ`exercise`を追加する。
- PR defaultは従来どおりbaselineとし、learner exerciseをProduct / Common Required Gateへ昇格させない。
- manual exercise modeは`pnpm run training:web:exercise`だけをlearner exercise entryとして実行する。
- manual expected-failure modeは`pnpm run training:web:check-expected-failure`を実行し、「failureが発生し必要Evidenceが存在する」ことを成功contractとして判定する。raw `training:web:expected-failure`は内部/直接調査用として残してよい。
- uploaded Artifact nameへ`baseline` / `exercise` / `expected-failure`のmodeを含める。
- `workflow-contract.ts`のapproved repository commandへ`training:web:exercise`と`training:web:check-expected-failure`だけを追加する。
- READMEは3 modeと各責務を短く同期する。

**Reason**

P2-5のTraining CI exercise / Failure Artifactを実装事実と一致させ、expected failureを「赤いworkflowだから成功」と人間判断させない。

**Expected contract**

- baseline mode = harness evidence
- exercise mode = learner exercise execution evidence
- expected-failure mode = intentional failure + required Artifactが揃った場合にcontract PASS
- Product Deploy / Secret / Formal E2Eは引き続き禁止

**Validation**

- Training workflow structural contract
- manual/static cross-checkで各modeが意図したpackage commandだけを実行
- Artifact nameがmodeを識別
- `training:web:check-expected-failure`がunexpected PASS / missing Artifactをfail-close

### Task 3B — Native Training workflow specialization opt-in

**Exact targets**

- `training/github-actions/training-native-ci.yml`
- `training/github-actions/README.md`
- `scripts/training/workflow-contract.ts`

**Current state**

Training Copyへ配置されるNative workflowは`pull_request`を無条件triggerにし、baselineだけ実行する。これはMaster Planの`specialization opt-in`と一致せず、P2-6のlearner-authored FlowをCIで実行する入口もない。

**Change**

- `workflow_dispatch`を維持し、input `mode`を`baseline` / `exercise`の2値にする。
- `pull_request`はNative specializationに直接関係するpathだけへ限定する。最低限のcandidateは次とし、実装時にGitHub Actions path filterとして有効な最小集合へ確定する。
  - `training/maestro/**`
  - `scripts/training/run-maestro-baseline.ts`
  - `scripts/training/run-maestro-exercise.ts`
  - `scripts/training/android-app-cleanup.ts`
  - `scripts/training/maestro-invocation.ts`
  - `scripts/training/serial-resolution.ts`
  - `.github/workflows/training-native-ci.yml`（Training Copy上のactive workflow）
  - `training/github-actions/training-native-ci.yml`
- broad `training/**`、Curriculum docs、Web learner asset、Product Formal workflowをtriggerへ入れない。
- manual baselineはbaselineのみ。manual exerciseまたはNative specialization PRでは同じEmulator上でbaselineをEnvironment/Harness確認として実行した後、`training:native:exercise`を実行する。
- baseline / exercise runnerが別output namespaceへ書き、collectorは`output/training/maestro`全体を保存する。
- uploaded Artifact nameへ`baseline` / `exercise` modeを含める。PRでinputがない場合は`exercise`として扱う。

**Reason**

Common PRへNative runtimeを逆流させず、Nativeを選択したlearnerにはCI上のsuccessful Maestro Artifactを生成できる入口を提供する。

**Expected contract**

- Common-only PR: Native Training workflowはtriggerされない
- Native specialization PR: baseline + learner exercise evidenceを同一Run内で区別できる
- manual baseline: environment / harnessだけ確認できる
- manual exercise: C08用successful execution artifactを生成できる。ただしlearner-authored diffは別Evidenceとして必要
- Product `.github/workflows/native-ci.yml`は変更しない

**Validation**

- workflow contract testでapproved runner / action / no secret / no deployを維持
- contract testで`pull_request.paths`がbroad `training/**` / Curriculum docsを含まないことを確認
- static YAML parse / Training Copy validation
- GitHub-hosted Native runtimeは利用可能時にexercise modeをconditional確認

### Task 4 — Learner-facing command / Artifact alignment

**Exact targets: bounded update only**

- `docs/curriculum/test-automation/part1/04_playwright-foundations.md`
- `docs/curriculum/test-automation/part1/05_playwright-e2e-practice.md`（必要なcommand位置だけ）
- `docs/curriculum/test-automation/part1/06_execution-and-failure-analysis.md`
- `docs/curriculum/test-automation/part1/07_maestro-native-automation.md`
- `docs/curriculum/test-automation/part1/09_part1-capstone.md`（Capstone実行入口の最小同期だけ）
- `docs/curriculum/test-automation/part2/05_playwright-ci.md`
- `docs/curriculum/test-automation/part2/06_native-ci-maestro.md`

**No planned change unless Current facts unexpectedly diverge**

- `docs/curriculum/test-automation/README.md`
- `docs/curriculum/test-automation/00_learning_design.md`
- `docs/curriculum/test-automation/02_competency-rubric.md`
- `docs/curriculum/test-automation/part2/08_integration-design-capstone.md`
- `docs/reference/curriculum-self-study-review.md`

**Change**

- Web baseline / desktop exercise / mobile exercise / expected-failureのcanonical commandを該当Lessonの実行箇所だけへ同期する。
- Native baseline / exercise、Physical Android local evidence path、Training Native CI exercise modeをP1-7 / P2-6へ同期する。
- success、expected failure、unexpected failure、Environment blockの戻り先を既存Failure taxonomyの範囲で区別する。
- baseline / stock PASSとlearner-authored completionを混同しない既存文言を維持する。
- self-study checklistは現在すでにcommand / Artifact / Environment blockをgeneric criteriaとして表現しているため、事実差がなければ変更しない。

**Reason**

PR 4Aで成立したself-study flowへCurrent Training commandを接続するためであり、教材の再監査・全面rewriteではない。

**Validation**

Learner-facing materialだけを読み、次を辿れること。

1. Web baseline → desktop exercise → mobile exercise
2. expected failure → expected-failure contract PASS / unexpected failureの区別
3. Native specialization開始Gate → baseline → learner exercise → diff + successful Artifact
4. Environment block → Instructor / Toolchain support →同じExerciseへrejoin
5. Common routeではNative commandを要求されない

### Task 5 — Contract / validator synchronization

**Exact targets**

- `scripts/validate-curriculum.ts`
- `scripts/training/workflow-contract.ts`
- `tests/contracts/training-curriculum.test.ts`

**Current state**

既存validator / contract testはTraining project、Mobile exercise、Common/Native route、baseline、Training Copy security、Native cleanupを十分に検証している。新command / workflow modeだけが未契約。

**Change**

- `validate-curriculum.ts`へ`training:web:exercise`と`training:native:exercise`のrequired script contractを追加する。
- `workflow-contract.ts`へworkflowで実際に使うnew canonical commandだけをallowlistする。
- `training-curriculum.test.ts`へ最低限次を追加する。
  - desktop learner exercise commandが`training/playwright/exercises` + `training-chromium`
  - Native exercise command / flow / distinct JUnit / evidence path contract
  - Web workflowのmanual exercise / checked expected-failure mode
  - Native workflowのspecialization path filterとexercise mode
  - Training/Formal root分離が維持される
  - C08 baseline non-substitutionを維持する
- prose wordingそのものを大量freezeするassertionは追加しない。

**Reason**

新しい実装契約のdriftだけを機械防止し、教材文章やlearner scoreをvalidatorへ持ち込まない。

**Validation**

- `pnpm run validate:curriculum`
- `pnpm run test:contracts`
- Training Copy validation / workflow structural contract

## RA-G5 disposition

**Disposition: `defer`**

Currentでは`training/maestro/failure-exercises/README.md`だけがあり、executable Native failure Flowは存在しない。このCurrent fact自体はRA-G5と一致する。

ただし、PR 5で新しいfailure harnessを追加する根拠は不足している。

- C08 Minimum Evidenceは`learner-authored Native exercise diff + successful Maestro execution artifact`であり、Native failure Flowを要求しない。
- C09はCommon competencyで、P1-6のWeb expected-failure / learner failureからmeaningful diagnosis + cause / action / re-run Evidenceを作れる。
- P2-6のNative Failure hands-onは「意図的または実際のFailure」を分析する契約で、専用failure assetを必須としていない。
- executable failure Flowを追加すると、新しいrunner / Artifact contract / maintenance surfaceを増やす一方、PR 5 DoDに直接必要なEvidenceは増えない。

したがってPR 5ではREADMEを実装へ昇格させず、new Native failure commandも追加しない。継続learner reviewで「Native固有failureを再現可能な教材として持たないとP2-6の自己学習Completionが成立しない」というEvidenceが得られた場合だけfollow-upで再評価する。

## Validation plan

### A. Local required validation

実装後、Native実機を必要としない範囲はRequiredとする。

```bash
pnpm run typecheck:training
pnpm run training:web:baseline
pnpm run training:web:exercise
pnpm run training:web:mobile:exercise
pnpm run training:web:check-expected-failure
pnpm run validate:curriculum
pnpm run test:contracts
pnpm run format:check
pnpm run lint:markdown
git diff --check
```

Plan作成時点で`training:web:exercise`は未実装なので、これは**expected post-change validation**である。

`training:native:exercise`もPlan作成時点では未実装だが、TypeScript / static contractはNative deviceなしで検証する。

### B. CI / static workflow validation

- `tests/contracts/training-curriculum.test.ts`のTraining workflow contract
- `scripts/training/workflow-contract.ts`によるYAML safety boundary
- `training:copy:prepare` / `training:copy:validate`を既存contract testが使う経路
- Web Training workflow mode / Artifact nameのstatic contract
- Native `pull_request.paths`がspecialization opt-inであるstatic contract
- Product Formal workflowにlearner exercise commandが追加されていないことのcontract確認

GitHub Actions実RunはRepository / quota / runner availabilityに依存するため、source validationと区別する。

### C. Conditional Native runtime validation

次はPhysical AndroidまたはGitHub-hosted Android Emulator環境が利用可能な場合だけ実施する。

**Local Physical Android**

1. P1-7のexisting Doctor / Prepare / Build / Install / Smoke / Test Controlを実行する。
2. explicit serialを3つのTraining serial envへ揃える。
3. `training:native:baseline`をbaseline evidence namespaceで実行する。
4. 同じserial / runIdで`training:native:exercise`をexercise evidence namespaceへ実行する。
5. baseline / exercise JUnit、Screenshot、output directoryが区別されることを確認する。
6. learner-authored Native diffが別Evidenceとして確認できることを確認する。

**GitHub Training Native CI**

- manual `baseline` modeがbaselineだけを生成する。
- manual `exercise`またはNative specialization PRがbaseline + exercise evidenceを識別可能に生成する。
- Common-only PRでNative workflowがtriggerされない。

### Environment block record

Native runtimeが実行できない場合はsource defectと断定せず、最低限次を記録する。

- validation name
- attempted command / workflow mode
- environment: Local Physical Android / GitHub-hosted runner
- Android SDK / ADB / serial / device status / Maestro / KVM等、最初に失敗したenvironment stage
- source validationとして完了した項目
- runtime未確認の項目
- 再開条件

以下を分離する。

- source / type / contract failure
- learner exercise / assertion failure
- runner failure
- Android SDK / ADB / device / emulator / Maestro failure
- GitHub-hosted runner infrastructure / quota failure

## Manual learner validation

実装後、`docs/reference/curriculum-self-study-review.md`を入力に、criteria-onlyで次をmanual cross-checkする。個別learner結果をRepositoryへ保存しない。

- baseline commandとlearner exercise commandを見分けられる。
- Web learnerが`training:web:exercise`を一意に選べる。
- Mobile learner exerciseが既存`training:web:mobile:exercise`のまま辿れる。
- expected failureを「意図どおりfailure + evidence contract PASS」とunexpected failureから区別できる。
- output / workflow Artifactから自分のexercise resultを識別できる。
- stock starter / baseline PASSだけではC07 / C08 Completionにならないと判断できる。
- Environment failure時に最初の確認箇所と再開先が分かる。
- Common routeだけを進むLearnerへPhysical Android / Native runtimeを要求しない。
- Native specializationを選択したLearnerは`training:native:exercise`からsuccessful Maestro Artifactを生成でき、Git / PR diffと組み合わせてC08 Evidenceを説明できる。
- Instructorの非公開判断なしにCompletion Evidenceを自己確認できる。

## Stop conditions

次に該当した場合は推測で実装せず、その依存Task / Findingだけを止める。

- Product behavior変更が必要になる。
- Normative Specification clarificationが必要になる。
- PR 3 / PR 4AのCommon / Native / Evidence contractと矛盾する。
- C07 / C08 Minimum Evidenceそのものを変更する必要がある。
- Product Formal Required Gateの再設計が必要になる。
- Native specialization opt-inのためにCommon workflowへ複雑な分岐を追加する必要がある。
- `training:web:exercise`に新Web runner / frameworkが必要になる。
- Native environment制約をsource変更や保証弱体化で無理に回避する必要がある。
- C08判定に新DB / scoring / learner-state管理が必要になる。
- learner exerciseをProduct Formal Regressionへ混在させないと成立しない。

## Definition of Done

PR 5実装は次がすべて満たされた時点で有限に完了する。

1. `training:web:baseline`と`training:web:exercise`が別commandであり、desktop exerciseが`training/playwright/exercises` + `training-chromium`だけを実行する。
2. `training:web:mobile:exercise`の既存責務が維持される。
3. Web expected-failureのlearner-facing contractが`training:web:check-expected-failure`で成功 / expected failure / missing evidenceを機械区別できる。
4. `training:native:baseline`と`training:native:exercise`が別commandである。
5. Native baseline / exerciseがexisting serial resolution / Maestro invocationと同一cleanup contractを再利用し、flow / JUnit / Screenshot / output namespaceを区別できる。
6. C08 completionはlearner-authored Native diff + successful exercise Artifactの両方を要求し、baseline / stock PASSだけで成立しない。
7. Web Training workflowはmanual learner exercise modeを持ち、mode付きArtifactを生成する。PR default baselineは維持する。
8. Native Training workflowはspecialization opt-inで、Common-only PRへ無条件triggerしない。
9. Native workflowのexercise mode / Native specialization PRでbaselineとexercise Evidenceを識別できる。
10. Product Formal Web / Native workflowへlearner exerciseが追加されていない。
11. `validate:curriculum`、Training workflow contract、既存contract testがnew command / workflow境界を機械検証する。
12. Learner-facing command / Artifact参照が実装事実と一致し、PR 4Aのself-study checklistと矛盾しない。
13. Common completionにNative runtime / Physical Androidを要求していない。
14. RA-G5は本Planの`defer`根拠を維持し、専用Native failure harnessをPR 5へ追加していない。
15. scoring engine、learner DB、AI grader、new generic Training frameworkを追加していない。
16. Required local validationがPASSし、Native runtime未実施の場合はEnvironment blockとして明示される。

## Expected implementation file set

実装時に変更を想定するfinite candidateは次。Current再確認で不要と分かったfileは変更しない。

### Runtime / command

- `package.json`
- `scripts/training/run-maestro-baseline.ts`
- `scripts/training/android-app-cleanup.ts`（new / small shared helper）
- `scripts/training/run-maestro-exercise.ts`（new / explicit exercise entry）
- `training/maestro/exercises/native-training-exercise.yaml`

### Training workflow / contract

- `training/github-actions/training-ci.yml`
- `training/github-actions/training-native-ci.yml`
- `training/github-actions/README.md`
- `scripts/training/workflow-contract.ts`
- `scripts/validate-curriculum.ts`
- `tests/contracts/training-curriculum.test.ts`

### Bounded learner-facing synchronization

- `docs/curriculum/test-automation/part1/04_playwright-foundations.md`
- `docs/curriculum/test-automation/part1/05_playwright-e2e-practice.md`（必要な場合のみ）
- `docs/curriculum/test-automation/part1/06_execution-and-failure-analysis.md`
- `docs/curriculum/test-automation/part1/07_maestro-native-automation.md`
- `docs/curriculum/test-automation/part1/09_part1-capstone.md`（必要な場合のみ）
- `docs/curriculum/test-automation/part2/05_playwright-ci.md`
- `docs/curriculum/test-automation/part2/06_native-ci-maestro.md`

`playwright.training.config.ts`はCurrent project / output contractを再利用できるため、現時点では変更予定に含めない。Web output分離のためだけに設定分岐を増やさない。

## Follow-up boundary

PR 5完了後も次は別owner / 継続活動とする。

- `docs/reference/curriculum-self-study-review.md`を使った継続learner reviewの実施
- Pilot完走率、所要時間、支援回数、runner costの実測
- RA-G5の再検討は、継続learner reviewでNative専用failure assetが自己学習Completionに不可欠と確認された場合だけ
- Phase 6 Refactoring candidateのnecessity review
- Product behavior / Specification clarification / Formal Test Strategy変更
- Security専門教材、Advanced / multi-platform delivery、Preview / Production

継続learner reviewの実施回数・PASS・個別結果保存はPR 5 DoDに含めない。

## Plan self-review

commit前に本PlanをPR 5 Objective、Current Repository、PR 3 / PR 4A fixed contractへ再照合した。

### Purpose / scope review

- Training Evidenceの問題だけへ限定し、Product / Spec / Formal Test Strategyへ拡張していない。
- Common / Native route、C07 / C08 Evidence contractを再設計していない。
- PR 4Aで完了したCurriculum全面監査をやり直さず、新command事実へ必要なbounded同期だけを対象にした。

### Simplicity reviewで修正した点

- Web outputをbaseline / exercise別directoryへ強制するための新runner / lifecycle-aware config案は採用しない。既存Playwright output root、別command、別spec path、mode付きCI Artifactで十分なため削除した。
- Native baseline / exerciseを1つのgeneric mode runnerへまとめる案は採用しない。flow / JUnit差を隠さず、2つのexplicit runner + 非trivial cleanupだけのsmall helperに限定した。
- Native `pull_request` trigger候補からbroad `training/**`やCurriculum docsを除外し、specialization asset / runner / active workflowだけへ限定した。
- Web / Native learner exerciseをProduct Formal Required Gateへ追加する案は含めていない。
- Self-study checklist / Rubricの再設計をscopeから外し、Current criteriaがgenericに成立する限りno-changeとした。

### Evidence review

- stock Web starterもstock Native exerciseもCurrentでPASS可能なため、command PASS単独をCompetency EvidenceにしないことをTask / DoDへ明記した。
- C08はdiff + successful exercise ArtifactのAND条件を維持した。
- Native baseline / exerciseを同一CI Runで実行してもJUnit / output namespace / Screenshotを識別できる設計にした。

### RA-G5 review

専用Native failure executable FlowはC08にもCommon C09にも必須でないため、Master Planの第一候補どおり`defer`とした。「教材としてあると良い」だけでは実装しない。

### Validation review

- Local required、CI/static、conditional Native runtimeを分離した。
- Native runtime未確認をsource defectと扱わないEnvironment blockを定義した。
- Common DoDへPhysical Android / Native CI successを入れていない。

### Implementation readiness review

- 各Taskをexact target、current state、change、reason、expected contract、validationまで落とした。
- 実装者に大きなarchitecture判断を残していない。
- 一方、Native workflowの`pull_request.paths`はGitHub Actionsの実際のactive Training Copy pathへ照合して最小集合を確定する必要があるため、candidateを有限列挙し、broad pattern禁止を固定した。

Self-review結論: **PR 5 Objectiveへ必要な変更だけにboundedで、実装開始可能。実装はまだ開始しない。**

## Unresolved blockers / unknowns

Plan作成時点でPR 5実装を開始できないblockerはない。

実装時にconditional確認が必要なunknownは次だけ。

1. GitHub-hosted Android runner / KVM / quotaが実Run時に利用可能か。利用不可ならEnvironment blockでありsource defectとはしない。
2. Local Physical Androidが実装者環境で利用可能か。利用不可でもCommon DoDをブロックしない。
3. Native `pull_request.paths`の最終literalは、Training Copyでactiveになる`.github/workflows/training-native-ci.yml`とrepository-owned templateの両方をCurrent copy生成結果へ照合して確定する。broad `training/**` / Curriculum triggerは許可しない。

これら以外のProduct / Spec / PR 3 / PR 4A contract矛盾を発見した場合はStop conditionに従う。
