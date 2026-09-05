# PR 5 child Plan: Training Baseline / Exercise / Artifact / Completion Evidence

## Status

- 状態: **Plan only / implementation not started**
- base `main`: `a82c9792213e53f03c4309f53758e31dca56a28f`
- 作業branch: `docs/pr5-training-evidence-plan`
- Plan path: `docs/plans/2026-09-05_pr5_training_baseline_exercise_artifact_evidence.md`
- Current Repositoryをread-only auditした結果を基にした実装Planであり、本branchではTraining runner、workflow、package script、test、Curriculum、Product codeの実装は開始しない。
- Issue #72はTracking Indexとして扱い、本PlanのFinding / 実装手順を第三のSSOTとして重複記載しない。

## Goal

Master Plan §17のPR 5を実施し、Training harness / environmentの正常性を示すBaselineと、受講者自身が変更・作成するLearner exercise、その実行Evidence、Competency Completion Evidenceを明確に分離する。

PR 5の最終目的は次の4点に限定する。

1. Web Common learnerが`training:web:exercise`から自分のPlaywright exerciseを一意に実行できる。
2. Native specialization learnerが`training:native:exercise`から自分のMaestro exerciseを一意に実行でき、C08に必要なsuccessful execution artifactを生成できる。
3. Native Training workflowをNative specialization関連変更だけのopt-in executionにし、Common-only PRへNative runtimeを暗黙強制しない。
4. Baseline / stock starter PASSだけではC07 / C08 Completionにならない既存評価契約を維持する。

この目的に不要なWorkflow mode、Artifact taxonomy、generic framework、learner-state DB、scoring engineは追加しない。

## Source of truth / audit inputs

本PlanはCurrent `main`で次を再照合した結果を正本とする。

- `docs/plans/2026-08-24_201800_curriculum_test_strategy_remediation_master.md`
- `docs/plans/2026-09-05_pr4a_curriculum_self_study_remediation.md`
- `package.json`
- `playwright.training.config.ts`
- `training/playwright/**`
- `training/maestro/**`
- `training/github-actions/**`
- `.github/workflows/**`
- `scripts/training/**`
- `scripts/validate-curriculum.ts`
- `tests/contracts/training-curriculum.test.ts`
- `docs/curriculum/test-automation/**`
- `docs/reference/curriculum-self-study-review.md`

Master Planや過去FindingのCurrent Stateはそのまま継承せず、Current fileへ再照合して判断する。

## Fixed inherited contracts

### Common / Native specialization

- Part 1 Common completion: `C01〜C07 + C09〜C10` bounded Level 2。
- Part 2 / Final Common completion: `C01〜C07 + C09〜C12` bounded Level 2。
- `C08`、Physical Android、Maestro Native automation、Native CIはNative specializationであり、Common completionには要求しない。

### Route

- Part 1 Common: `P1-6 → P1-8 → P1-9`
- Part 1 Native: `P1-6 → P1-7 → P1-8 → P1-9`
- Part 2 Common: `P2-5 → P2-7 → P2-8`
- Part 2 Native: `P2-5 → P2-6 → P2-7 → P2-8`

PR 5ではbranch / skip / rejoinを変更しない。

### Evidence boundary

- Baseline = Harness / Environment / Starter assetが正常であることのEvidence。
- Learner exercise = 受講者自身が変更・作成した成果物とその実行結果。
- C07 Minimum Evidence = `learner-authored Playwright exercise change + successful Web execution evidence`。
- C08 Minimum Evidence = `learner-authored Native exercise diff + successful Maestro execution artifact`。
- stock starter / baseline / stock flowのPASS単独ではC07 / C08 competency completionにならない。
- Git / PR diff、Training Copy source SHA、既存Run Artifactを利用し、新しいlearner-state DBやscoring systemを作らない。

### Successful execution evidence vs diagnostic artifact

Artifactの**存在**とsuccessful executionは同義ではない。

Native Training workflowはFailure diagnosisのためArtifact collection / uploadを`if: always()`で維持する。したがってfailure runでもArtifactは生成され得る。

C08でsuccessful Maestro execution artifactとして扱える最低条件は次とする。

**Local Physical Android**

- `pnpm run training:native:exercise`がexit code `0`で終了する。
- 同じattemptのexercise output directoryに`training-native-exercise.xml`が存在する。

**GitHub Training Native CI**

- `training:native:exercise`を実行するstepが実行され、successで終了する。
- 同じworkflow runのuploaded Artifact内に`maestro/exercise/training-native-exercise.xml`が含まれる。

Native Training workflow **全体**のconclusionをC08 successful evidenceの追加必須条件にはしない。exercise成功後のdiagnostic collectionやemulator cleanup等の後処理failureへC08 Completionを不要に結合しないためである。

baseline stepはexercise stepより前に通常のfail-fast順序で実行されるため、exercise stepが実行されsuccessしている場合、同一Runのstandalone baseline stepは通過済みである。別のbaseline-success graderは追加しない。

次はFailure diagnosis Evidenceであり、C08 successful execution evidenceの代替にしない。

- exercise stepがfailureのRun Artifact
- exercise JUnitを欠くArtifact
- `if: always()`で保存されたlogcat / emulator log / partial Maestro output
- baselineだけ成功したArtifact
- stock exerciseの成功Artifact

Artifact uploadをFailure時に止める変更はしない。`failure artifact exists`と`successful exercise evidence exists`を明示的に区別する。

### Canonical Native learner exercise reachability

`training:native:exercise`のcanonical execution entryは次の1ファイルとする。

```text
training/maestro/exercises/native-training-exercise.yaml
```

PR 5実装ではこのYAML自体を変更しない。これはstarter / canonical entryとしてCurrent内容を維持するためである。

LearnerがC08用の成果物を作るTraining Copy上では、次のどちらかに限定する。

1. `native-training-exercise.yaml`を直接extendする。
2. learner-authored subflowを追加し、`native-training-exercise.yaml`から`runFlow`等で到達可能にする。

`training:native:exercise`から到達しないunreferenced sibling YAMLを追加しただけでは、そのファイルのDiffと`training:native:exercise`のsuccessful Artifactが対応しないため、C08 successful execution evidenceとして扱わない。

つまりC08では、**learner-authored Native diffがcanonical `training:native:exercise` execution graphから到達可能であり、その変更を含むexecutionが成功していること**を要求する。

### Instructor support boundary

Instructor / 運営はEnvironment、Account、Permission、Device、Training Copy、Infrastructure、Toolchainを支援できる。

次をInstructorの非公開判断へ依存させない。

- 学習内容の理解
- exerciseで何を実装するか
- Recovery
- 成果物品質の最低基準
- Self-check
- Completion判定

### Product / Formal Test boundary

- Product Formal Regressionを変更しない。
- Product Required Gateへlearner exerciseを追加しない。
- `.github/workflows/ci.yml` / `.github/workflows/native-ci.yml` / `.github/workflows/native-ios-ci.yml`へTraining exerciseを混在させない。
- Android Runtime guarantee / iOS Build-only guaranteeを変更しない。
- Common learnerのPRへNative runtimeをRequired化しない。

## Pre-plan Current State audit

### Web

| Area | Current state | PR 5 judgment |
| --- | --- | --- |
| Baseline command | `training:web:baseline`が`training/playwright/baseline`を`training-chromium`で実行 | 維持 |
| Desktop learner exercise | `training/playwright/exercises/`は存在するが`training:web:exercise`は存在しない | `fix_now` |
| Mobile exercise | `training:web:mobile:exercise`が既に存在 | 維持 |
| Expected failure raw | `training:web:expected-failure`が失敗するspecを直接実行 | package scriptは内部/直接調査用として維持可能。Workflow allowlistからは外す |
| Expected failure checked | `training:web:check-expected-failure`がexpected failure + Evidence存在を機械判定 | learner-facing / Training workflowのcanonical entryとして利用 |
| Training config | `training-chromium` / `training-mobile-chromium`が既に存在 | 新project / new Web runnerを作らない |
| Web output | `output/training/playwright`配下 | 既存構造を変更しない |
| Web Training workflow | PRはbaseline、manualはbaseline / raw expected-failure | exercise modeは追加しない。expected-failureだけchecked commandへ同期 |

### Native

| Area | Current state | PR 5 judgment |
| --- | --- | --- |
| Baseline command | `training:native:baseline` → `run-maestro-baseline.ts` | 維持 |
| Learner exercise YAML | `training/maestro/exercises/native-training-exercise.yaml`が存在 | **内容を変更せず**canonical exercise entryとして再利用 |
| Learner exercise reachability | P1-7は`training/maestro/exercises/`配下のlearner Flowとしか案内せず、canonical commandから到達する成果物かが曖昧 | P1-7でcanonical entry / reachable subflow契約を明示 |
| Learner exercise YAML setup | Current exercise YAMLは`runFlow: ../baseline/native-training-baseline.yaml`を内包 | 維持。exercise command単独実行性を守るため削除しない |
| Learner exercise command | package command / runnerなし | `fix_now` / RA-G4 |
| Serial resolution | `scripts/training/serial-resolution.ts`に共通化済み | 再利用 |
| Maestro invocation | `scripts/training/maestro-invocation.ts`に共通化済み | 再利用 |
| Baseline runner | serial resolution、ADB cleanup、output準備、Maestro invocation、process実行を保持 | shared orchestrationだけTraining専用helperへ抽出 |
| Current cleanup | ready → force-stop → pm clear + Success確認 → second force-stop → pidof wait → Maestro invocation | **semanticsを変えずshared runnerへ移管** |
| Validator / contract test | validatorはstatic wiring、contract testはcleanup semantics / orderingを検証 | 同じ責務分離を維持し、二重literal assertionを増やさない |
| Baseline default output | `output/training/maestro` | **変更しない** |
| Native Training workflow | `pull_request`全体 + `workflow_dispatch`、baselineだけ実行、job表示名もbaseline-only | `fix_now`: Native specialization pathsだけで起動し、起動時はbaseline→exerciseを常に実行。job表示名もgeneric化 |
| Native workflow mode | 現在なし | **追加しない** |
| Training README | Native templateをbaseline-onlyと説明 | baseline→exerciseへ同期し、template / active workflowの役割を明記 |
| P2-6 learner artifact | learner-authored Training Native CI変更をcompletionへ含める | C08正本へ合わせ、learner-authored exercise diff + Training Native CIで取得したsuccessful Maestro exercise Artifact + CI設計判断へ同期 |
| Native failure exercise | READMEのみ | RA-G5 `defer` |

### Contract / Training Copy

| Area | Current state | PR 5 judgment |
| --- | --- | --- |
| Rubric | C07 / C08のlearner-authored Minimum Evidenceとbaseline非代替が既に明記 | 変更しない |
| Curriculum route | Common / Native branch / skip / rejoinはPR 4Aで整備済み | 変更しない |
| Self-study checklist | Command / Artifact / Environment blockをgeneric criteriaとして保持 | 変更不要 |
| Curriculum validator | Mobile exercise等は検証するがdesktop / native exercise commandは未要求 | new canonical command / asset / thin entry static wiringだけ最小追加 |
| Workflow contract | 現行Workflowで使うcommandだけallowlist | raw Web expected-failureをremoveし、実際にWorkflowで使うchecked / Native exerciseだけ許可 |
| Contract test | route、Training/Formal分離、workflow safety、Native cleanup等を既に検証 | shared runnerへ既存cleanup assertionを移管し、workflow / evidence stable behaviorだけ追加 |
| Training Copy | active workflowをTraining Web / Nativeの2本へ置換 | 維持。`validate-training-copy.ts`変更不要 |
| Native workflow path role | Source Repositoryでは`training/github-actions/training-native-ci.yml`がtemplate、Training Copyでは`.github/workflows/training-native-ci.yml`がactive workflow | README / P2-6で明示 |

## Confirmed Findings

| ID | Severity | Disposition | Primary owner | Problem / impact | Minimum fix |
| --- | --- | --- | --- | --- | --- |
| PR5-F001 | P2 | `fix_now` | Task 1 | Desktop exercise directoryはあるがcanonical commandがなくC07 next actionが一意でない | `training:web:exercise`を既存Training config / `training-chromium`へ直接接続 |
| PR5-F002 | P2 | `fix_now` | Task 2 / Task 4 | Native learner YAMLはあるがdirect command / successful exercise Evidence入口がなく、learner diffがcanonical executionから到達する保証も弱い | exact `training:native:exercise`、2 thin entries、bounded shared runner、canonical entry reachability、P1-7 runbook |
| PR5-F003 | P2 | `fix_now` | Task 3A | manual expected-failure modeがraw failure commandを直接実行しallowlistも広い | checked commandへ置換しraw commandをworkflow allowlistからremove |
| PR5-F004 | P2 | `fix_now` | Task 3B / Task 4 | Native Training workflowが全PRで起動しbaseline-only。P2-6にlearner-authored workflow変更という余分なCompletion要件が残る | exact paths opt-in、baseline→exercise、generic job label、README / P2-6同期 |
| RA-G5 | P3 | `defer` | Follow-up | executable Native failure Flowなし | PR 5では追加しない |

## Scope

### In scope

- `training:web:exercise` direct entry
- exact `training:native:exercise` direct entry
- Native canonical learner exercise reachabilityのlearner-facing明確化
- Native baseline / exerciseのshared execution logicの最小共通化
- Current cleanup semanticsのそのままの移管
- Native baseline / exerciseの別JUnit / output namespace
- Current Native learner exercise YAMLの**PR5無変更再利用**
- P1-7 local Physical Androidでbaseline後にexerciseを同一serial / runIdで実行するexact learner-facing手順
- `1 runId = 1 baseline→exercise→Evidence attempt`というEvidence対応契約
- retryで新attemptへ入る場合の**new attempt = new runId**契約
- successful execution evidenceとfailure diagnostic Artifactの区別
- Web expected-failure workflowを既存checked commandへ接続
- workflow command allowlistをleast-privilege化
- Native Training workflowのspecialization opt-in
- Native workflow起動時のbaseline→exercise連続実行
- Native workflowのbaseline-only job表示名をgeneric化
- Training workflow READMEをcurrent execution / template roleへ同期
- P2-6の旧learner-authored workflow前提を有限heading / paragraphで同期
- validator / workflow contract / existing contract testの最小同期
- new command / Artifactの事実が変わるlearner-facing箇所だけのbounded同期

### Out of scope

- Web Training workflowへのlearner exercise mode追加
- Native Training workflowへのbaseline / exercise mode追加
- mode付きArtifact naming taxonomy
- Web Playwright output directoryの再設計
- baseline Native direct commandのdefault output変更
- Current `training/maestro/exercises/native-training-exercise.yaml`のPR5実装時変更
- exercise固有Screenshot追加
- exercise内`runFlow`を消すためのsetup Flow再分割 / conditional skip / runner mode
- Product behavior / Seed / Test Control / Normative Specification変更
- Product Formal Regression / Product Required Gate変更
- Competency集合、C07 / C08 Minimum Evidence、Common / Native routeの再設計
- Curriculum全面rewrite
- Instructor grading
- executable Native failure exercise追加
- scoring engine、learner-state DB、AI grader、LMS、Evidence DB、Finding DB
- generic Training framework / plugin system / multi-purpose CLI
- cleanup state machine / cleanup abstraction再設計
- Pilot実測、継続learner review結果保存
- Phase 6 Refactoring decision

## Simplicity / design constraints

1. Web desktop exerciseはpackage scriptから既存`playwright.training.config.ts` / `training-chromium`へ直接接続する。新Web runnerを作らない。
2. `training:web:mobile:exercise`は変更しない。Desktop / Mobileを1commandへ統合しない。
3. Web Training workflowには`exercise` modeを追加しない。C07 Minimum Evidenceはcanonical direct commandのsuccessful execution evidenceで成立し、CI executionは必須契約ではない。
4. Web expected-failure workflowはmode数 / Artifact名を増やさず、既存modeのcommandだけchecked entryへ置換する。
5. Native Training workflowにはmodeを追加しない。specialization opt-inは`pull_request.paths`で実現する。
6. Native workflowが起動したら常に`training:native:baseline`→`training:native:exercise`の順に実行する。manual dispatchも同じ一本道を使う。
7. Current learner exercise YAMLの`runFlow: ../baseline/native-training-baseline.yaml`は維持し、PR5ではYAML自体を変更しない。
8. baseline / exercise Evidenceの識別はJUnit filenameとoutput directoryで行う。Screenshot名の追加taxonomyは作らない。
9. `training:native:baseline`のdirect execution default output `output/training/maestro`は変更しない。
10. Native CIで同一Run内のEvidenceが衝突しないよう、Workflowから`TRAINING_MAESTRO_OUTPUT_DIR`をbaseline / exercise別に与える。
11. Nativeのserial resolutionとMaestro invocationは既存helperを再利用する。
12. baseline / exerciseのentrypointは別fileに残す。ただしADB cleanup、output準備、process起動等の重複実行処理はTraining Native専用の1 helper関数へまとめる。
13. shared helperは2 entrypointの重複除去だけを目的とし、mode parser、plugin、generic framework、抽象classを作らない。
14. `maestro-runner.ts`はflow path / JUnit file name / default output directoryだけを設定として受ける。log labelやmode名など表示目的の設定値を増やさない。
15. `maestro-runner.ts`は実行失敗をthrowし、各entrypointがtop-levelでcatchして`process.exitCode = 1`を設定する。
16. cleanupはCurrent behaviorをそのまま移し、簡素化を理由にsecond force-stopや`pm clear` Success確認を落とさない。
17. validatorは存在・package mapping・static wiringのSSOT、contract testはcleanup semantics / ordering・workflow behavior・evidence boundaryのSSOTとする。
18. 同じpackage mapping / entry mapping literalをvalidatorとcontract testの両方へ重複固定しない。
19. P2-6ではlearnerにTraining workflow YAMLの変更をRequired化しない。
20. Native CIのC08 successful evidenceはexercise step success + same-run exercise JUnit Artifactで判別し、workflow全体conclusionを追加条件にしない。
21. Local retryで新しいattemptを開始する場合は必ず新しい`runId`を使う。
22. C08のlearner-authored diffはcanonical `training:native:exercise` execution graphから到達可能でなければならない。

## Implementation tasks

### Task 1 — Web desktop learner exercise direct entry

**Exact targets**

- `package.json`
- `scripts/validate-curriculum.ts`
- `docs/curriculum/test-automation/part1/04_playwright-foundations.md`
- `docs/curriculum/test-automation/part1/05_playwright-e2e-practice.md`
- `docs/curriculum/test-automation/part1/06_execution-and-failure-analysis.md`
- `docs/curriculum/test-automation/part1/09_part1-capstone.md`

**Package command — exact**

```json
"training:web:exercise": "playwright test training/playwright/exercises --config=playwright.training.config.ts --project=training-chromium"
```

意味:

```text
target  = training/playwright/exercises
config  = playwright.training.config.ts
project = training-chromium
```

制約:

- `training:web:mobile:exercise`を変更しない。
- `playwright.training.config.ts`を変更しない。
- `e2e/web/**`を含めない。
- new Web runnerを作らない。
- Web Training workflowへexercise modeを追加しない。

`validate-curriculum.ts`ではcommandの存在だけでなく上記exact scriptを検証する。このpackage mappingはvalidatorをSSOTとし、contract testへ同じliteralを追加しない。

**Learner-facing sync — required**

P1-4:

- desktop learner exerciseのcanonical commandを`pnpm run training:web:exercise`と明示する。

P1-5:

- desktop learner exercise = `training:web:exercise`、mobile learner exercise = `training:web:mobile:exercise`を明示する。

P1-6:

- 対象specをTraining Configでraw実行する余地をcanonical commandへ置換する。

P1-9:

- baseline後のlearner exercise実行を`pnpm run training:web:exercise`として一意にする。

上記4教材以外へWeb command同期を広げない。

### Task 2 — Native learner exercise direct entry with bounded shared runner

**Exact targets**

- `package.json`
- `scripts/training/run-maestro-baseline.ts`
- new `scripts/training/maestro-runner.ts`
- new `scripts/training/run-maestro-exercise.ts`
- `docs/curriculum/test-automation/part1/07_maestro-native-automation.md`

**Explicit no-change asset**

- `training/maestro/exercises/native-training-exercise.yaml`

PR5実装ではCurrent YAMLをcanonical starter / entryとしてそのまま使う。Screenshot action、既存`runFlow`、starter assertionを変更しない。

**Package command — exact**

```json
"training:native:exercise": "tsx scripts/training/run-maestro-exercise.ts"
```

別alias、mode引数、generic Native CLIは作らない。

**Architecture — fixed**

```text
serial-resolution.ts         existing / unchanged unless required
maestro-invocation.ts        existing / unchanged unless required
maestro-runner.ts            new / bounded shared orchestration
run-maestro-baseline.ts      explicit thin baseline entry
run-maestro-exercise.ts      explicit thin exercise entry
```

#### Shared runner responsibilities

`maestro-runner.ts`の責務はTraining Native Maestro実行の共通処理だけとする。

- output directory resolution / create
- serial resolution call
- Current ADB cleanup semantics
- `buildMaestroInvocation` call
- Maestro process spawn
- timeout / exit status handling

設定値は次の3つだけにする。

- flow path
- JUnit file name
- default output directory

#### Current cleanup semantics — exact preservation

共通化はrefactorであり、cleanup behavior変更ではない。Current `run-maestro-baseline.ts`の次のsequenceをそのまま`maestro-runner.ts`へ移す。

```text
1. assertDeviceReady(serial)
2. adb shell am force-stop <PACKAGE_ID>
3. adb shell pm clear <PACKAGE_ID>
4. pm clear result status == 0 かつ outputにSuccessを確認
5. adb shell am force-stop <PACKAGE_ID>  # second force-stop
6. pidofでprocess exitをwait
7. buildMaestroInvocation
8. Maestro process spawn
```

次も維持する。

- ADB command timeout
- process exit timeout / polling
- offline / unauthorized / errorのfail-close semantics
- `pidof` status `0` / `1`のCurrent handling
- Maestro timeout `300_000`
- spawn error / non-zero exitをfailureとしてthrow

cleanupを新しいstate machineや別frameworkへ抽象化しない。

#### Baseline entry — thin contract

- flow: `training/maestro/baseline/native-training-baseline.yaml`
- JUnit: `training-native-baseline.xml`
- default output: `output/training/maestro`
- shared runnerを呼ぶ。
- cleanup / serial / spawn implementationをentrypointへ残さない。

#### Exercise entry — thin contract

- flow: `training/maestro/exercises/native-training-exercise.yaml`
- JUnit: `training-native-exercise.xml`
- default output: `output/training/maestro/exercise`
- shared runnerを呼ぶ。

各entrypointはtop-levelでcatchし、errorを出力して`process.exitCode = 1`を設定する。

#### Exercise YAML — unchanged setup contract

Currentの次のsetupを維持する。

```yaml
- runFlow: ../baseline/native-training-baseline.yaml
```

CIでは意図的に次となる。

```text
standalone training:native:baseline
  -> independent baseline Evidence
training:native:exercise
  -> exercise YAML内のbaseline Flow setup
  -> learner-authored assertion / subflow
```

重複解消のためにworkflow input、skip flag、runner mode、別setup Flow、conditional YAMLを追加しない。

#### P1-7 canonical learner exercise contract — required

P1-7では、Native learner exerciseのcanonical entryを次と明示する。

```text
training/maestro/exercises/native-training-exercise.yaml
```

Learnerは、Training Copy上で次のどちらかを行う。

- canonical entry自体を直接extendする。
- learner-authored subflowを追加し、canonical entryからそのsubflowへ到達する。

`training:native:exercise`から到達しない別YAMLを作っただけではC08 successful execution evidenceにしない。

Self-check / Completionでは、learner-authored diffとsuccessful execution Artifactが同じcanonical execution graphを指すことを確認できるようにする。

#### P1-7 Physical Android local runbook — exact addition

CurrentのDoctor → Prepare → Build → Install → Smoke → Test Control → baseline → Evidenceの順序を維持し、baselineとEvidenceの間へexerciseを追加する。

```powershell
$env:QA_TRAINING_ANDROID_SERIAL = $serial
$env:TARGET_SERIAL = $serial
$env:ANDROID_SERIAL = $serial

$env:TRAINING_MAESTRO_OUTPUT_DIR = Join-Path (Get-Location) ".artifacts\native-local\$runId\maestro\training-baseline"
pnpm run training:native:baseline

$env:TRAINING_MAESTRO_OUTPUT_DIR = Join-Path (Get-Location) ".artifacts\native-local\$runId\maestro\training-exercise"
pnpm run training:native:exercise

& .\scripts\native\windows\android-local.ps1 `
  -Action Evidence `
  -DeviceSerial $serial `
  -RequirePhysicalDevice `
  -RunId $runId
```

#### Attempt / retry contract

`1 runId = 1 baseline → exercise → Evidence attempt`とする。

- 1 attempt内ではbaseline / exercise / Evidenceで`$serial`を変更しない。
- 1 attempt内では`$runId`を変更しない。
- device discoveryをexercise前にやり直さない。
- baseline outputとexercise outputだけを別directoryにする。
- exercise failureでそのattemptはfailureとする。
- retryとして新しいattemptを開始する場合は必ず新しい`$runId`を採番する。
- 新しいattemptでは、少なくともbaseline → exercise → Evidenceをそのnew runIdで揃える。
- 新しいrunIdのexerciseだけを実行して旧attemptのbaseline / Evidenceと組み合わせない。
- Doctor / Prepare / Build / Install / Smoke / Test Controlの再実行要否は最初のfailure stageと既存Recoveryに従う。

#### Local successful exercise evidence

同じattemptで次を両方満たす。

1. `pnpm run training:native:exercise` exit code `0`
2. `.artifacts/native-local/$runId/maestro/training-exercise/training-native-exercise.xml`が存在

C08 completionはさらにlearner-authored reachable diffを必要とする。

### Task 3A — Web expected-failure workflow alignment only

**Exact targets**

- `training/github-actions/training-ci.yml`
- `scripts/training/workflow-contract.ts`
- `tests/contracts/training-curriculum.test.ts`

現在のworkflow structureを維持する。

```text
pull_request
  -> baseline
workflow_dispatch baseline
  -> baseline
workflow_dispatch expected-failure
  -> checked expected-failure
```

変更は次だけ。

- manual expected-failure modeをraw `training:web:expected-failure`から`training:web:check-expected-failure`へ変更する。
- `exercise` modeを追加しない。
- Artifact nameをmode付きへ変更しない。
- PR default baselineを変更しない。
- raw package scriptは内部/直接調査用として残す。

**Workflow allowlist — exact replacement**

```text
REMOVE:
  pnpm run training:web:expected-failure

ADD:
  pnpm run training:web:check-expected-failure
  pnpm run training:native:exercise
```

`pnpm run training:web:exercise`はworkflowで使わないためallowlistへ追加しない。

### Task 3B — Native Training workflow specialization opt-in without modes

**Exact targets**

- `training/github-actions/training-native-ci.yml`
- `training/github-actions/README.md`
- `scripts/training/workflow-contract.ts`
- `tests/contracts/training-curriculum.test.ts`

#### Trigger contract — exact

`workflow_dispatch`は維持し、input modeは追加しない。

Training Copy上のactive workflowの`pull_request.paths`は次のexact setとする。

```yaml
pull_request:
  paths:
    - "training/maestro/**"
    - "scripts/training/run-maestro-baseline.ts"
    - "scripts/training/run-maestro-exercise.ts"
    - "scripts/training/maestro-runner.ts"
    - "scripts/training/maestro-invocation.ts"
    - "scripts/training/serial-resolution.ts"
    - ".github/workflows/training-native-ci.yml"
```

意図的に含めない。

- broad `training/**`
- `docs/**`
- `package.json`
- Web Training files
- Product Formal workflow
- repository-owned template pathそのものをactive Training CopyのPR filterへ追加すること

`package.json`を含めない理由はWeb / Common側script変更だけでNative Emulatorを起動しないため。Native exercise package commandはstatic validatorでexactに確認する。

#### Execution contract — exact

```text
Environment / APK / Emulator setup
  -> training:native:baseline
  -> training:native:exercise
  -> collect output/training/maestro
  -> upload one Training Native artifact
```

Workflow step env:

```text
baseline:
  TRAINING_MAESTRO_OUTPUT_DIR=output/training/maestro/baseline
exercise:
  TRAINING_MAESTRO_OUTPUT_DIR=output/training/maestro/exercise
```

collectorは`output/training/maestro`全体を保存する。

Artifact表示名は既存形式を維持してよい。baseline / exerciseの識別責務はdirectory / JUnitに持たせる。

Current job表示名`Training Android Maestro baseline`は実態と合わなくなるため、genericな`Training Android Maestro`へ変更する。stepはbaseline / exerciseを別々に表示する。job / step表示literalはmachine contractでfreezeしない。

#### Successful CI exercise evidence

C08で**Training Native CIで取得したsuccessful Maestro exercise Artifact**として扱う最低条件:

1. `training:native:exercise` stepが実行されsuccessである。
2. 同一Runのuploaded Artifact内に`maestro/exercise/training-native-exercise.xml`が存在する。

Workflow run全体successを追加条件にしない。

Failure時のArtifact collection / upload `if: always()`は維持する。

#### README synchronization — required

`training/github-actions/README.md`は必ず変更し、最低限次を説明する。

- `training-ci.yml` = Web baseline + explicit expected-failure entry
- `training-native-ci.yml` = Native specialization向けで、対象path変更またはmanual dispatch時にbaseline→exerciseを実行
- Source Repositoryの`training/github-actions/*.yml` = repository-owned template / Reference
- Training Copyの`.github/workflows/*.yml` = active workflow
- Common-only変更ではNative Training workflowは起動しない

READMEを別のTraining architecture documentへ拡張しない。

### Task 4 — Learner-facing command / Artifact alignment

#### Required Web sync

次の4ファイルだけをRequiredとする。

- `docs/curriculum/test-automation/part1/04_playwright-foundations.md`
- `docs/curriculum/test-automation/part1/05_playwright-e2e-practice.md`
- `docs/curriculum/test-automation/part1/06_execution-and-failure-analysis.md`
- `docs/curriculum/test-automation/part1/09_part1-capstone.md`

#### Required Native sync

- `docs/curriculum/test-automation/part1/07_maestro-native-automation.md`
- `docs/curriculum/test-automation/part2/06_native-ci-maestro.md`

P1-7では必ず次を同期する。

- canonical exercise entry = `training/maestro/exercises/native-training-exercise.yaml`
- direct extendまたはreachable subflowというlearner-authored成果物の作り方
- unreferenced sibling YAMLだけではC08 Evidenceにならないこと
- same serial / same runId baseline → exercise → Evidence
- retry = new attempt = new runId
- local successful evidence = exercise exit 0 + same-attempt exercise JUnit

#### P2-6 bounded rewrite — exact 8 locations

P2-6は全面rewriteしない。次の8箇所だけを同期する。

1. `## 教材`
   - `run-maestro-exercise.ts`を追加。
   - source template / Training Copy active workflowを区別。
2. `## Training Native Workflowの前提`
   - prepared workflow前提。
   - baseline→exercise。
   - baseline / exercise / Failure Artifactを区別。
3. `Training baselineは...`のCompletion説明段落
   - learner-authored bounded Native CI変更をRequiredから削除。
   - `learner-authored Native exercise diff + Training Native CIで取得したsuccessful Maestro exercise Artifact + CI設計判断`へ置換。
4. `## ハンズオン1`
   - workflow YAML編集をRequiredにせず、prepared workflowをNative changeまたはmanual dispatchで実行。
5. `## ハンズオン3`比較文
   - `自分の1Job構成`を`prepared Training Native Workflowの1Job構成`等へ置換。
6. `## 自己確認`
   - workflow diffではなくexercise diff、successful Maestro exercise Artifact、Trigger / Failure stage / Artifact / Cost判断へ置換。
7. `### Recovery`
   - workflow diffへ戻る旧前提を削除。
   - failure Artifactはdiagnosis用でCompletion代替ではない。
8. `## 完了条件`
   - bounded Training Native CI変更作成をRequiredから削除。
   - learner-authored Native exercise diff + Training Native CIで取得したsuccessful Maestro exercise ArtifactをRequiredにする。

上記以外のLesson 1〜11、Android/iOS comparison、Failure分析、Cost議論、Build/Runtime分離、iOS Referenceは全面rewriteしない。

### Task 5 — Contract / validator synchronization

**Exact targets**

- `scripts/validate-curriculum.ts`
- `scripts/training/workflow-contract.ts`
- `tests/contracts/training-curriculum.test.ts`

#### Ownership rule — fixed

同じstable contractを複数箇所へliteralで重複固定しない。

**`validate-curriculum.ts` owns:**

- required Training asset existence
- `training:web:exercise` exact package mapping
- `training:native:exercise` exact package mapping
- existing `training:web:mobile:exercise` exact mapping
- `maestro-runner.ts`のminimum static wiring
- baseline entryのflow / JUnit / default output / shared runner接続
- exercise entryのflow / JUnit / default output / shared runner接続

**`training-curriculum.test.ts` owns:**

- shared runnerのCurrent cleanup semantics
- cleanup exact ordering
- cleanupがMaestro invocationより前であること
- Native exercise YAMLのbaseline `runFlow` setup
- Web checked expected-failure workflow contract
- raw expected-failure commandがworkflow allowlistにないこと
- Web workflowにlearner exercise modeがないこと
- Native workflow exact paths
- Native workflowにmodeがないこと
- Native workflow baseline→exercise ordering
- baseline / exercise output directory separation
- Product Formal workflowにlearner exercise commandがないこと
- C08 baseline / stock non-substitution

既存contract testは`validateCurriculum(process.cwd())`を実行するため、validatorが所有するpackage mapping / entry mappingをcontract testへ同じliteralで再度assertしない。

#### `validate-curriculum.ts` static wiring

Required Training assetsへ追加:

- `scripts/training/maestro-runner.ts`
- `scripts/training/run-maestro-exercise.ts`

`maestro-runner.ts`では最低限次の存在・接続を確認する。

- `TRAINING_MAESTRO_OUTPUT_DIR`
- `resolveTrainingAndroidSerial`
- `buildMaestroInvocation`
- timeout / spawn / exit handlingの存在

cleanupの細かな順序をvalidatorへ重複実装しない。順序・semantic regressionはcontract testが所有する。

baseline / exercise entryでは各flow / JUnit / default output / shared runner接続をstatic contractとして確認する。

#### Contract test cleanup contract — exact

既存`keeps Training Native startup deterministic without clearState race`相当のtestをshared runnerへ向ける。

最低限次を順序込みで確認する。

```text
assertDeviceReady
< first force-stop
< pm clear
< pm clear Success validation
< second force-stop
< waitForProcessExit
< buildMaestroInvocation
```

新しいgeneric cleanup test frameworkを作らず、既存testを責務移管する。

#### Workflow contract allowlist

- REMOVE `pnpm run training:web:expected-failure`
- ADD `pnpm run training:web:check-expected-failure`
- ADD `pnpm run training:native:exercise`
- `pnpm run training:web:exercise`は追加しない

その他のapproved command / action / runner boundaryは変更しない。

## RA-G5 disposition

**Disposition: `defer`**

PR 5ではexecutable Native failure Flowを追加しない。

理由:

- C08 Minimum Evidenceはsuccessful Native exercise artifact + learner diffでありfailure Flowを要求しない。
- C09はCommon competencyで、Web expected-failure / learner failureからdiagnosis Evidenceを作れる。
- P2-6は実際または意図的なNative failureを分析できる。
- failure Flowを追加するとflow / command / runner / evidence / docs / contractのmaintenance surfaceが増える。

Native failure assetが自己学習Completionに不可欠というlearner review Evidenceが得られた場合だけfollow-upで再評価する。

## Validation plan

### A. Required local / static validation

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

### B. Implementation diff validation

- `training/maestro/exercises/native-training-exercise.yaml`にPR5由来の変更がない。
- Product Formal workflowsに変更がない。
- Web exercise CI mode / Native mode / new generic frameworkがない。
- Web教材変更がP1-4 / P1-5 / P1-6 / P1-9へ限定されている。
- P2-6変更が指定8箇所中心のbounded syncである。
- package mapping / entry mappingをvalidatorとcontract testで二重literal固定していない。
- cleanup semanticsをshared runnerへ移す際にsecond force-stop / pm clear Success確認を落としていない。
- P1-7がcanonical Native exercise reachabilityを明示している。

### C. CI / workflow static validation

- Web workflow expected-failureがchecked commandを使用。
- workflow allowlistにraw expected-failureが残っていない。
- Native workflow `pull_request.paths` exact set。
- Native workflowにmode input / conditionalがない。
- baseline→exerciseの順に実行。
- baseline / exercise output directoryを分離。
- exercise内baseline setupをskipする追加mode / flag / conditionalがない。
- Artifact collection / uploadはFailure時も残る。
- Training Copy prepare / validate PASS。
- Product Formal workflowにTraining learner exerciseを追加していない。

### D. Conditional Native runtime validation

Physical AndroidまたはGitHub-hosted Emulatorが利用可能な場合だけ実施する。

**Local Physical Android**

1. existing Doctor / Prepare / Build / Install / Smoke / Test Controlを実施。
2. explicit serialをTraining serial envへ揃える。
3. same `$runId`でbaseline。
4. same serial / runIdでexercise。
5. exercise内部でbaseline Flow setupが再実行されることを確認。
6. baseline / exercise JUnit / output directoryを区別。
7. exercise exit `0` + exercise JUnit存在を確認。
8. learner-authored diffがcanonical exercise execution graphから到達可能であることを確認。
9. Evidence Actionをsame serial / runIdで実行。
10. retryはnew attempt = new runIdでbaseline→exercise→Evidenceを揃える。

**GitHub Training Native CI**

- Native specialization path changeでworkflowが起動。
- Common-only path changeでは起動しない。
- standalone baseline→exerciseが実行される。
- exercise内baseline Flow setupの再実行を許容。
- Artifact内でbaseline / exerciseを区別できる。
- successful exercise stepのsame-run Artifactにexercise JUnitが存在。
- failure runでもdiagnostic Artifactは残るがCompletionには使わない。
- exercise成功後のcleanup failure等でsuccessful Maestro exercise Evidence自体を無効化する追加ロジックがない。

### Environment block

Native runtimeが利用できない場合はsource defectと断定せず、最低限次を記録する。

- validation name
- attempted command / workflow
- environment: Local Physical Android / GitHub-hosted runner
- first failed environment stage
- Android SDK / ADB / serial / device / emulator / Maestro / KVM / quotaの該当状態
- source validationとして完了した項目
- runtime未確認項目
- 再開条件

## Manual learner validation

`docs/reference/curriculum-self-study-review.md`をcriteriaとして使い、個別learner review結果をRepositoryへ保存しない。

最低限確認する。

- baselineとlearner exerciseの目的を区別できる。
- Web learnerが`training:web:exercise`を一意に選べる。
- Mobile exerciseは既存commandのまま辿れる。
- expected failureはchecked contract PASSとunexpected failureを区別できる。
- stock starter / baseline PASSだけではC07 / C08 Completionにならない。
- Native learnerがcanonical `native-training-exercise.yaml`を直接extendするか、そこからreachableなsubflowを作ることを理解できる。
- `training:native:exercise`から到達しないYAMLのDiffだけではC08 Evidenceにならないと判断できる。
- P1-7で`1 runId = 1 attempt`のbaseline→exercise→Evidenceを教材だけで実行できる。
- retry時のnew attemptがnew runIdである。
- Native exercise内のbaseline Flow再実行がsetup目的であることを理解できる。
- successful exercise Artifactとfailure diagnostic Artifactを区別できる。
- CIではexercise step success + same-run exercise JUnit Artifactがsuccessful execution evidenceであり、workflow全体conclusionへ不要に依存しないことを説明できる。
- Common learnerへPhysical Android / Native runtimeを要求していない。
- P2-6でworkflow YAMLを変更しなくても、Native exercise diff / successful Maestro exercise Artifact / Trigger・Failure・Artifact・Cost判断からcompletionを自己確認できる。
- Source templateとTraining Copy active workflowの役割を区別できる。

## Stop conditions

次の場合は推測でscopeを広げず、該当Taskだけ止める。

- Product behavior変更が必要。
- Normative Specification clarificationが必要。
- PR 3 / PR 4AのCommon / Native / Evidence contractと矛盾。
- C07 / C08 Minimum Evidence自体の変更が必要。
- Product Formal Required Gate再設計が必要。
- Web exerciseのために新runner / config architectureが必要。
- Native specialization opt-inのためにCommon workflowへ複雑な分岐が必要。
- Native runner共通化にgeneric frameworkが必要。
- cleanup semantics維持のために新state machine / frameworkが必要。
- exercise内baseline Flow再実行を消すためにmode / skip flag / setup taxonomyが必要。
- Native exercise Evidence分離のために新Screenshot taxonomyが必要。
- successful Artifact判定のためにgrader / state DBが必要になる。
- learner exerciseをProduct Formal Regressionへ混在させないと成立しない。

## Definition of Done

PR 5は次がすべて満たされた時点で有限に完了する。

1. `training:web:baseline`と`training:web:exercise`が別commandである。
2. `training:web:exercise`がexactに`training/playwright/exercises` + `playwright.training.config.ts` + `training-chromium`へ接続されている。
3. `training:web:mobile:exercise`の既存責務を維持する。
4. P1-4 / P1-5 / P1-6 / P1-9がdesktop learner exerciseのcanonical commandを一貫して案内する。
5. Web expected-failure workflowが`training:web:check-expected-failure`を使用する。
6. workflow allowlistからraw expected-failure commandが除去されている。
7. Web Training workflowへlearner exercise modeを追加していない。
8. `training:native:exercise`がexactに`tsx scripts/training/run-maestro-exercise.ts`へ接続されている。
9. `training:native:baseline`と`training:native:exercise`が別commandである。
10. Native baseline direct default output `output/training/maestro`を維持する。
11. Native重複execution logicをbounded `maestro-runner.ts`へ共通化している。
12. shared runner config surfaceがflow / JUnit / default outputの3値だけである。
13. Current cleanup sequenceをsecond force-stop / pm clear Success確認を含めて維持する。
14. cleanupがMaestro invocationより前である。
15. runnerがfailureをthrowし、entrypointがtop-level catch / `process.exitCode = 1`を持つ。
16. baseline / exercise entryがそれぞれ正しいflow / JUnit / default outputへ接続されている。
17. Current Native exercise YAMLはPR5で変更していない。
18. Native exercise YAMLがbaseline `runFlow` setupを維持し、standalone execution可能である。
19. P1-7が`native-training-exercise.yaml`をcanonical learner exercise entryとして明示する。
20. learner-authored Native diffがcanonical `training:native:exercise` execution graphから到達可能である。
21. unreferenced sibling YAMLのDiffだけをC08 successful evidenceとして扱わない。
22. Native CIでstandalone baseline後のexercise内baseline再実行を意図的に許容し、skip mode等を追加していない。
23. P1-7 local pathが`1 runId = 1 baseline → exercise → Evidence attempt`で一意である。
24. retryのnew attemptがnew runIdを使う。
25. Local successful exercise Evidenceが`exit 0 + same-attempt exercise JUnit`で判別できる。
26. Native Training CI successful exercise Evidenceが`exercise step success + same-run exercise JUnit Artifact`で判別できる。
27. Workflow全体conclusionをC08 successful evidenceの追加条件にしていない。
28. Failure時Artifact uploadを維持し、diagnostic ArtifactをCompletionと混同しない。
29. C08 completionがreachable learner-authored Native diff + successful Maestro exercise Artifactの両方を要求する。
30. Native Training workflowはexact `pull_request.paths`によるspecialization opt-inである。
31. Native Training workflowにmode input / conditionalがなく、起動時は常にbaseline→exerciseである。
32. Native workflowのjob表示がbaseline-onlyの誤解を生まないgeneric表記である。
33. `training/github-actions/README.md`がbaseline→exercise、template / active workflow、Native opt-inを説明する。
34. Common-only PRへNative runtimeを無条件要求しない。
35. P2-6の指定8箇所からlearner-authored workflow YAML変更のRequired要件が除去されている。
36. P2-6のハンズオン3が`自分の1Job構成`という旧前提を残していない。
37. Product Formal Web / Native workflowへlearner exerciseを追加していない。
38. package mapping / entry mappingは`validate-curriculum.ts`をSSOTとし、contract testへduplicate literal assertionを追加していない。
39. cleanup semantics / orderingはcontract testが所有し、validatorへduplicate ordering assertionを追加していない。
40. validator / workflow contract / existing contract testが各自のstable contractだけを機械検証する。
41. `native-training-exercise.yaml`PR5無変更はimplementation diff reviewで確認し、全文snapshot等のnegative permanent testを追加していない。
42. RA-G5を`defer`しNative failure harnessを追加していない。
43. scoring engine、learner DB、AI grader、generic Training frameworkを追加していない。
44. Required local/static validationがPASSする。
45. Native runtime未実施の場合はEnvironment blockとして明示する。

## Expected implementation file set

### Runtime / command

- `package.json`
- `scripts/training/run-maestro-baseline.ts`
- `scripts/training/maestro-runner.ts`（new）
- `scripts/training/run-maestro-exercise.ts`（new）

### Explicit no-change runtime asset

- `training/maestro/exercises/native-training-exercise.yaml`

### Training workflow / contract

- `training/github-actions/training-ci.yml`
- `training/github-actions/training-native-ci.yml`
- `training/github-actions/README.md`
- `scripts/training/workflow-contract.ts`
- `scripts/validate-curriculum.ts`
- `tests/contracts/training-curriculum.test.ts`

### Bounded learner-facing synchronization — required

- `docs/curriculum/test-automation/part1/04_playwright-foundations.md`
- `docs/curriculum/test-automation/part1/05_playwright-e2e-practice.md`
- `docs/curriculum/test-automation/part1/06_execution-and-failure-analysis.md`
- `docs/curriculum/test-automation/part1/07_maestro-native-automation.md`
- `docs/curriculum/test-automation/part1/09_part1-capstone.md`
- `docs/curriculum/test-automation/part2/06_native-ci-maestro.md`

### No planned change

- `playwright.training.config.ts`
- `scripts/training/validate-training-copy.ts`
- `docs/curriculum/test-automation/README.md`
- `docs/curriculum/test-automation/00_learning-design.md`
- `docs/curriculum/test-automation/02_competency-rubric.md`
- `docs/curriculum/test-automation/part2/05_playwright-ci.md`
- `docs/curriculum/test-automation/part2/08_integration-design-capstone.md`
- `docs/reference/curriculum-self-study-review.md`
- Product Formal workflows

## Follow-up boundary

PR 5後も次は別活動とする。

- 継続learner review
- Pilot完走率 / 所要時間 / 支援回数 / runner cost実測
- learner review Evidenceに基づくRA-G5再検討
- Phase 6 Refactoring necessity review
- Product behavior / Specification clarification / Formal Test Strategy変更
- Advanced / multi-platform / Preview / Production教材

## Plan self-review after final simplification

### Purpose / scope

- PR 5 ObjectiveをBaseline / Exercise / Evidence / Native opt-inへ限定した。
- Product / Spec / Formal Test Strategyへscopeを広げていない。
- PR 3 / PR 4AのCommon / Native / C07 / C08契約を再設計していない。
- Curriculum全面監査をやり直さない。

### Simplicity decisions retained

1. Web workflow exercise modeを作らない。
2. Native workflow modeを作らない。
3. mode付きArtifact名を作らない。
4. Native baseline direct default outputを変更しない。
5. Native helperは2 entrypointの重複execution logicだけを1 bounded runnerへまとめる。
6. Native `pull_request.paths`をexactに固定する。
7. P2-5を変更しない。
8. Native exercise内baseline再実行を意図的な重複として維持する。
9. Native exercise YAMLをPR5では変更しない。
10. cleanup behaviorを再設計せずCurrent sequenceをそのまま移す。
11. package / entry mapping static contractはvalidatorへ集約する。
12. cleanup semantics / orderingはcontract testへ集約する。
13. P2-6 proseのliteral machine contractを追加しない。
14. successful CI evidenceからWorkflow全体successという余分な条件を外す。
15. Web教材変更対象をP1-4 / P1-5 / P1-6 / P1-9へ固定する。
16. P2-6の旧workflow-edit前提を8箇所へ有限化する。
17. retryはnew attempt = new runIdとする。
18. canonical Native learner exercise reachabilityを教材契約だけで明確にし、directory runnerやgeneric discoveryを追加しない。

### Over-engineering guard

実装PRで次が出てきた場合はPlan逸脱として削る。

- Web exercise CI mode
- Native baseline / exercise mode selector
- Native exercise内baselineをskipするflag / conditional
- baseline setup専用taxonomy / framework
- exercise固有Screenshot taxonomy
- mode-specific artifact naming framework
- generic Training CLI
- runner class hierarchy / plugin system
- cleanup state machine / generic Android cleanup framework
- package / entry mappingのduplicate literal contract test
- validatorへのcleanup exact-order duplicate assertion
- learner-state / scoring persistence
- Native failure fixture without new evidence
- learner-authored workflow YAML変更をP2-6 completionへ再導入すること
- P2-6 Completion prose全文のliteral machine assertion
- Workflow全体conclusionをC08 successful evidenceへ再追加すること
- retry attempt管理用DB / manifest / state machine
- `training:native:exercise`用のdirectory discovery / multi-flow generic runner

### Implementation readiness

実装時に固定済みの主要判断:

- Web exercise exact command / 4教材
- Web workflowでexercise modeを追加しない
- expected-failure checked command / allowlist disposition
- Native exercise exact command
- canonical Native learner entry / reachable subflow contract
- shared runner責務 / config surface / error ownership
- Current cleanup exact sequence incl. second force-stop
- validator / contract test ownership boundary
- baseline default output
- exercise flow / JUnit / default output
- exercise YAML PR5無変更 / baseline runFlow維持
- same serial / same runId local sequence
- new attempt = new runId
- Local / CI successful evidence条件
- Native workflow exact paths / baseline→exercise
- Workflow全体conclusionをC08へ要求しない
- P2-6 learner artifact / bounded sync 8箇所
- Source template / Training Copy active workflowの役割
- RA-G5 defer

Self-review結論: **PR 5 Objectiveを満たす実装面積は十分に縮小されている。Native learner成果物はcanonical executionからreachableとすることでDiffと実行Evidenceを一意に対応させる。Native runnerはCurrent cleanup behaviorを変えずにshared runnerへ移し、validator / contract testは責務を分けて重複固定しない。これ以上runner / workflow / Evidence構造を削ると重複実装またはlearner-facing ambiguityを増やすため、実装開始可能である。**

## Unresolved blockers / unknowns

source implementation開始を妨げるblockerはない。

conditional unknownは次だけ。

1. GitHub-hosted Android runner / KVM / quotaが実Run時に利用可能か。
2. Local Physical Androidが実装者環境で利用可能か。

これらはEnvironment blockであり、source/static implementationをblockしない。

Product / Spec / PR 3 / PR 4A contract矛盾を新たに発見した場合だけStop conditionに従う。
