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

baseline stepはexercise stepより前に通常のfail-fast順序で実行されるため、exercise stepが実行されsuccessしている場合、同一Runのstandalone baseline stepは通過済みである。

次はFailure diagnosis Evidenceであり、C08 successful execution evidenceの代替にしない。

- exercise stepがfailureのRun Artifact
- exercise JUnitを欠くArtifact
- `if: always()`で保存されたlogcat / emulator log / partial Maestro output
- baselineだけ成功したArtifact
- stock exerciseの成功Artifact

Artifact uploadをFailure時に止める変更はしない。`failure artifact exists`と`successful exercise evidence exists`を明示的に区別する。

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
| Learner exercise YAML | `training/maestro/exercises/native-training-exercise.yaml`が存在 | **内容を変更せず**canonical exerciseとして再利用 |
| Learner exercise YAML setup | Current exercise YAMLは`runFlow: ../baseline/native-training-baseline.yaml`を内包 | 維持。exercise command単独実行性を守るため削除しない |
| Learner exercise command | package command / runnerなし | `fix_now` / RA-G4 |
| Serial resolution | `scripts/training/serial-resolution.ts`に共通化済み | 再利用 |
| Maestro invocation | `scripts/training/maestro-invocation.ts`に共通化済み | 再利用 |
| Baseline runner | serial resolution、ADB cleanup、output準備、Maestro invocation、process実行を保持 | shared orchestrationだけTraining専用helperへ抽出 |
| Validator / contract test | Currentは共通cleanup / invocation semanticsを`run-maestro-baseline.ts`内部から直接検証 | shared runnerへ責務移管すると同時にassertionの参照先も`maestro-runner.ts`へ移管 |
| Baseline default output | `output/training/maestro` | **変更しない** |
| Native Training workflow | `pull_request`全体 + `workflow_dispatch`、baselineだけ実行、job表示名もbaseline-only | `fix_now`: Native specialization pathsだけで起動し、起動時はbaseline→exerciseを常に実行。job表示名もgeneric化 |
| Native workflow mode | 現在なし | **追加しない** |
| Training README | Native templateをbaseline-onlyと説明 | baseline→exerciseへ同期し、template / active workflowの役割を明記 |
| P2-6 learner artifact | learner-authored Training Native CI変更をcompletionへ含める | C08正本へ合わせ、learner-authored exercise diff + successful CI exercise Artifact + CI設計判断へ同期 |
| Native failure exercise | READMEのみ | RA-G5 `defer` |

### Contract / Training Copy

| Area | Current state | PR 5 judgment |
| --- | --- | --- |
| Rubric | C07 / C08のlearner-authored Minimum Evidenceとbaseline非代替が既に明記 | 変更しない |
| Curriculum route | Common / Native branch / skip / rejoinはPR 4Aで整備済み | 変更しない |
| Self-study checklist | Command / Artifact / Environment blockをgeneric criteriaとして保持 | 原則変更しない |
| Curriculum validator | Mobile exercise等は検証するがdesktop / native exercise commandは未要求 | new canonical commandとthin/shared runner責務だけ最小追加 |
| Workflow contract | 現行Workflowで使うcommandだけallowlist | raw Web expected-failureをremoveし、実際にWorkflowで使うchecked / Native exerciseだけ許可 |
| Contract test | route、Training/Formal分離、workflow safety、Native cleanup等を既に検証 | 新しい責務配置へ既存assertionを移管し、stable behaviorだけ追加 |
| Training Copy | active workflowをTraining Web / Nativeの2本へ置換 | 維持 |
| Native workflow path role | Source Repositoryでは`training/github-actions/training-native-ci.yml`がtemplate、Training Copyでは`.github/workflows/training-native-ci.yml`がactive workflow | README / P2-6で明示 |

## Master Finding re-check

| Master candidate | Current judgment |
| --- | --- |
| RA-G4 | **残存**。Native learner YAMLはあるがcanonical direct entryとsuccessful exercise artifact生成入口がない。`fix_now`。 |
| RA-G5 | **事実として残存**。ただしC08 Minimum EvidenceにもCommon C09にも専用Native failure Flowは必須ではないため`defer`。 |
| CUR-M5 | Rubric上のbaseline vs learner competency境界は解消済み。Native実行基盤の残差だけPR5-F002で扱う。 |
| CUR-M7 | desktop / native direct entryとNative learner CI Evidence入口の不足が残る。Web CI exercise mode不足はFindingにしない。P2-6のlearner-authored workflow要求はPR5-F004で解消する。 |
| CUR-M10 | PR 4A全面監査は完了済み。新canonical commandと実装事実の縦方向同期だけ扱う。 |
| CUR-L5 | desktop / native exerciseのcanonical next action不足だけPR5-F001 / F002で扱う。 |

## Confirmed Findings

| ID | Severity | Disposition | Primary owner | Problem / impact | Minimum fix | Validation |
| --- | --- | --- | --- | --- | --- | --- |
| PR5-F001 | P2 | `fix_now` | Task 1 | Desktop exercise directoryはあるがcanonical commandがなくC07 next actionが一意でない | `training:web:exercise`を既存Training config / `training-chromium`へ直接接続 | exercisesだけをdesktop Training projectで実行しFormal E2Eを含めない |
| PR5-F002 | P2 | `fix_now` | Task 2 | Native learner YAMLはあるがdirect command / successful exercise Evidence入口がない | exact `training:native:exercise`、2 thin entries、bounded shared runner、別JUnit / output、P1-7 exact runbook | baseline / exercise別command、success判定可能、stock PASS非代替 |
| PR5-F003 | P2 | `fix_now` | Task 3A | manual expected-failure modeがraw failure commandを直接実行しallowlistも広い | checked commandへ置換しraw commandをworkflow allowlistからremove | intended failure + Evidenceならsuccess、unexpected PASS / Evidence欠落ならfailure |
| PR5-F004 | P2 | `fix_now` | Task 3B / Task 4 | Native Training workflowが全PRで起動しbaseline-only。P2-6にlearner-authored workflow変更という余分なCompletion要件が残る | exact paths opt-in、baseline→exercise、generic job label、README / P2-6同期 | Common-onlyで起動せず、Native runでsuccessful exercise Evidenceを判別可能 |
| RA-G5 | P3 | `defer` | Follow-up | executable Native failure Flowなし | PR 5では追加しない | Native failure harnessなしでPR5 DoD成立 |

## Scope

### In scope

- `training:web:exercise` direct entry
- exact `training:native:exercise` direct entry
- Native baseline / exerciseのshared execution logicの最小共通化
- Native baseline / exerciseの別JUnit / output namespace
- Current Native learner exercise YAMLの**無変更再利用**
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
- Native shared runnerへ移る既存cleanup / invocation assertionの参照先移管
- new command / Artifactの事実が変わるlearner-facing箇所だけのbounded同期

### Out of scope

- Web Training workflowへのlearner exercise mode追加
- Native Training workflowへのbaseline / exercise mode追加
- mode付きArtifact naming taxonomy
- Web Playwright output directoryの再設計
- baseline Native direct commandのdefault output変更
- Current `training/maestro/exercises/native-training-exercise.yaml`の内容変更
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
- Pilot実測、継続learner review結果保存
- Phase 6 Refactoring decision

## Simplicity / design constraints

1. Web desktop exerciseはpackage scriptから既存`playwright.training.config.ts` / `training-chromium`へ直接接続する。新Web runnerを作らない。
2. `training:web:mobile:exercise`は変更しない。Desktop / Mobileを1commandへ統合しない。
3. Web Training workflowには`exercise` modeを追加しない。C07 Minimum Evidenceはcanonical direct commandのsuccessful execution evidenceで成立し、CI executionは必須契約ではない。
4. Web expected-failure workflowはmode数 / Artifact名を増やさず、既存modeのcommandだけchecked entryへ置換する。raw package scriptは残してよいがworkflow allowlistからremoveする。
5. Native Training workflowにはmodeを追加しない。specialization opt-inは`pull_request.paths`で実現する。
6. Native workflowが起動したら常に`training:native:baseline`→`training:native:exercise`の順に実行する。manual dispatchも同じ単純な経路を使う。
7. Current learner exercise YAMLの`runFlow: ../baseline/native-training-baseline.yaml`は維持し、**YAML自体を変更しない**。CIではstandalone baselineの後にexercise内でもbaseline Flowがsetupとして再実行されるが、baseline Evidenceの独立性と`training:native:exercise`単独実行性を両立するため意図的に許容する。
8. baseline / exercise Evidenceの識別はJUnit filenameとoutput directoryで行う。Screenshot名の追加taxonomyは作らない。
9. `training:native:baseline`のdirect execution default output `output/training/maestro`は変更しない。
10. Native CIで同一Run内のEvidenceが衝突しないよう、Workflowから`TRAINING_MAESTRO_OUTPUT_DIR`をbaseline / exercise別に与える。
11. Nativeのserial resolutionとMaestro invocationは既存helperを再利用する。
12. baseline / exerciseのentrypointは別fileに残す。ただしADB cleanup、output準備、process起動等の重複実行処理はTraining Native専用の1 helper関数へまとめる。
13. shared helperは2 entrypointの重複除去だけを目的とし、mode parser、plugin、generic framework、抽象classを作らない。
14. `maestro-runner.ts`はflow path / JUnit file name / default output directoryだけを設定として受ける。log labelやmode名など表示目的の設定値を増やさない。
15. `maestro-runner.ts`は実行失敗をthrowし、`run-maestro-baseline.ts` / `run-maestro-exercise.ts`の各entrypointがtop-levelでcatchして`process.exitCode = 1`を設定する。error ownershipをrunnerとentrypointで二重化しない。
16. validator / contract testは実装責務の移動に追従する。共通cleanup / invocation semanticsをthin baseline entryへ残すための逆向き実装はしない。
17. Contract testはstable behaviorだけを固定し、step name、log wording、Curriculum prose、Artifact表示名をfreezeしない。
18. P2-6ではlearnerにTraining workflow YAMLの変更をRequired化しない。learner-authored Native exercise diff、successful CI Artifact、Trigger / Failure stage / Artifact / Cost判断を学習Evidenceとする。
19. P2-6 Completionの文章自体を新しいmachine contractとして固定しない。Rubric C08の正本machine contractとmanual learner validationを使う。
20. Native CIのC08 successful evidenceはexercise step success + same-run exercise JUnit Artifactで判別し、workflow全体conclusionを追加条件にしない。
21. Local retryで新しいattemptを開始する場合は必ず新しい`runId`を使う。同じ`runId`へ別attemptのJUnit / Evidenceを上書き・混在させない。

## Implementation tasks

### Task 1 — Web desktop learner exercise direct entry

**Exact targets**

- `package.json`
- `scripts/validate-curriculum.ts`
- `docs/curriculum/test-automation/part1/04_playwright-foundations.md`
- `docs/curriculum/test-automation/part1/05_playwright-e2e-practice.md`
- `docs/curriculum/test-automation/part1/06_execution-and-failure-analysis.md`
- `docs/curriculum/test-automation/part1/09_part1-capstone.md`

上記4教材はCurrentを再照合した結果、すべてWeb desktop exercise canonical commandとの同期が必要と判断済みである。「必要なら」判断を実装者へ残さない。

**Package command — exact**

`package.json`へ次を追加する。

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

`validate-curriculum.ts`ではcommandの存在だけでなく、上記exact scriptを検証する。

**Learner-facing sync — exact intent**

P1-4:

- learner-authored desktop exerciseのcanonical commandを`pnpm run training:web:exercise`と明示する。
- baseline / mobile baselineとの役割を混同しない。

P1-5:

- desktop learner exerciseは`training:web:exercise`、mobile learner exerciseは既存`training:web:mobile:exercise`という対応を明示する。
- Mobile commandの既存責務は変更しない。

P1-6:

- 「対象specをTraining Configでraw実行する」というlearner-facing余地をcanonical commandへ置換する。
- Failure分析で自分のTraining Testだけを再実行する場合の標準入口を`training:web:exercise`へ揃える。

P1-9:

- `training-chromium`というproject名だけで実行を表現せず、baseline後のlearner exercise実行を`pnpm run training:web:exercise`として一意にする。
- Common completion契約は変更しない。

上記4教材以外へWeb command同期を広げない。Current factsに新しい直接不整合を実装中に発見した場合だけStop conditionとして再評価する。

stock starter PASSはstarter execution evidenceに過ぎず、C07にはlearner-authored diff + successful execution evidenceが必要であることを既存評価契約のまま維持する。

**Validation**

- `pnpm run training:web:baseline`
- `pnpm run training:web:exercise`
- `pnpm run training:web:mobile:exercise`
- `pnpm run validate:curriculum`
- `pnpm run test:contracts`
- P1-4 / P1-5 / P1-6 / P1-9のcanonical commandが一致

### Task 2 — Native learner exercise direct entry with bounded shared runner

**Exact targets**

- `package.json`
- `scripts/training/run-maestro-baseline.ts`
- new `scripts/training/maestro-runner.ts`
- new `scripts/training/run-maestro-exercise.ts`
- `docs/curriculum/test-automation/part1/07_maestro-native-automation.md`

**Explicit no-change asset**

- `training/maestro/exercises/native-training-exercise.yaml`

Current learner YAMLはcanonicalとしてそのまま使う。PR 5ではScreenshot actionを追加せず、既存`runFlow` / assertionも変更しない。

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

`maestro-runner.ts`の責務はTraining Native Maestro実行の共通処理だけとする。

- output directory resolution / create
- serial resolution call
- existing ADB ready / force-stop / `pm clear` / process-exit wait semantics
- `buildMaestroInvocation` call
- Maestro process spawn
- exit status handling

設定値は次の3つだけにする。

- flow path
- JUnit file name
- default output directory

`maestro-runner.ts`は失敗時にthrowする。`run-maestro-baseline.ts` / `run-maestro-exercise.ts`はtop-levelでcatchし、errorを出力して`process.exitCode = 1`を設定する。

次を作らない。

- success label / mode label設定
- CLI mode parser
- baseline / exercise enum framework
- plugin registry
- class hierarchy
- Product Native runnerとの共通framework

**Baseline entry — thin contract**

- flow: `training/maestro/baseline/native-training-baseline.yaml`
- JUnit: `training-native-baseline.xml`
- default output: `output/training/maestro`
- shared runnerを呼ぶ。
- cleanup / serial / spawn implementationをentrypointへ残さない。

**Exercise entry — thin contract**

- flow: `training/maestro/exercises/native-training-exercise.yaml`
- JUnit: `training-native-exercise.xml`
- default output: `output/training/maestro/exercise`
- shared runnerを呼ぶ。

**Exercise YAML — unchanged contract**

Currentの次のsetupはそのまま維持する。

```yaml
- runFlow: ../baseline/native-training-baseline.yaml
```

理由:

- `training:native:exercise`を単独で実行してもbaseline setupから開始できる。
- local routeでも独立して使える。
- standalone baseline Evidenceとexercise自身のsetup責務を分離できる。
- 重複を消すためのconditional skipや新しいsetup taxonomyを導入するより単純である。

CIでは次の実行になる。

```text
standalone training:native:baseline
  -> independent baseline Evidence
training:native:exercise
  -> exercise YAML内のbaseline Flow setup
  -> learner-authored assertion / action
```

この重複は意図的なcontractであり、「最適化」として削らない。

Evidence識別:

```text
baseline invocation
  output directory: .../baseline
  JUnit: training-native-baseline.xml

exercise invocation
  output directory: .../exercise
  JUnit: training-native-exercise.xml
```

exercise固有Screenshot名は追加しない。

#### P1-7 Physical Android local runbook — exact addition

CurrentのDoctor → Prepare → Build → Install → Smoke → Test Control → baseline → Evidenceの順序は維持し、baselineとEvidenceの間へexerciseを追加する。

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

#### Attempt / retry contract — fixed

`1 runId = 1 baseline → exercise → Evidence attempt`とする。

- 1 attempt内ではbaseline / exercise / Evidenceで`$serial`を変更しない。
- 1 attempt内では`$runId`を変更しない。
- device discoveryをexercise前にやり直さない。
- baseline outputとexercise outputだけを別directoryにする。
- exercise failureでそのattemptはfailureとして扱う。
- **retryとして新しいattemptを開始する場合は必ず新しい`$runId`を採番する。既存`$runId`を再利用しない。**
- 新しいattemptでは、少なくとも`baseline → exercise → Evidence`をその新しい`$runId`で揃える。
- 新しいrunIdのexerciseだけを実行して、旧attemptのbaseline / Evidenceと組み合わせない。
- Doctor / Prepare / Build / Install / Smoke / Test Controlまで再実行する必要があるかは、最初の失敗stageと既存Recoveryに従う。Evidence対応関係を守るためだけに不要な上流処理まで再実行しない。
- Environment block解消後も、learnerは同じexerciseへrejoinする。

Current `android-local.ps1`は`RunId`を`.artifacts/native-local/<runId>`のArtifact rootとして使うため、新attemptごとにnew runIdとする方が古いEvidence混在を避ける最小契約である。

#### Local successful exercise evidence

C08のsuccessful executionとして扱うには、同じattemptで次を両方満たす。

1. `pnpm run training:native:exercise` exit code `0`
2. `.artifacts/native-local/$runId/maestro/training-exercise/training-native-exercise.xml`が存在

JUnitが存在してもcommandがfailureならsuccessful evidenceとしない。command successでもJUnitがない場合はEvidence欠落としてcompletionに使わない。

#### C08 contract

- baseline PASS ≠ C08 completion
- stock exercise PASS ≠ C08 completion
- successful exercise Artifact alone ≠ C08 completion
- `learner-authored Native exercise diff + successful Maestro execution artifact`のAND条件を維持する

**Validation**

- `pnpm run typecheck:training`
- `training:native:exercise` exact package command
- existing serial conflict fail-close contract維持
- existing cleanup semantics維持
- Native runtime利用可能時のみbaseline / exerciseを同一serial / runIdで実行
- baseline / exercise JUnit / output namespaceが衝突しない
- exercise command単独でbaseline Flow setupから実行できる
- Current exercise YAMLにPR5由来の差分がないことをimplementation diffで確認
- P1-7 runbookが1 runId内でbaseline → exercise → Evidenceの順に一意である
- retryのnew attemptがnew runIdを使用し、旧attemptとEvidenceを混在させない

### Task 3A — Web expected-failure workflow alignment only

**Exact targets**

- `training/github-actions/training-ci.yml`
- `scripts/training/workflow-contract.ts`
- `tests/contracts/training-curriculum.test.ts`

**Change**

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

- manual expected-failure modeのcommandをraw `training:web:expected-failure`から`training:web:check-expected-failure`へ変更する。
- `exercise` modeを追加しない。
- Artifact nameをmode付きへ変更しない。
- PR default baselineを変更しない。
- raw `training:web:expected-failure` package scriptは内部/直接調査用として残してよい。

**Workflow allowlist — exact replacement**

```text
REMOVE:
  pnpm run training:web:expected-failure

ADD:
  pnpm run training:web:check-expected-failure
  pnpm run training:native:exercise
```

`training:web:exercise`はWeb Training workflowで使わないためworkflow allowlistへ追加しない。

**Reason**

expected failureを「Workflowが赤いから意図どおり」と人間判断させず、既存checked runnerのfail-close contractを使う。

- intended failureが発生した
- required Evidenceが生成された
- unexpected PASSならfailure
- Evidence欠落ならfailure

**Validation**

- checked commandがapprovedされている
- raw expected-failure commandがapprovedされていない
- expected-failure modeがraw commandを直接呼ばない
- baseline PR behaviorが変わらない
- Product deploy / secret / Formal E2Eを追加していない

### Task 3B — Native Training workflow specialization opt-in without modes

**Exact targets**

- `training/github-actions/training-native-ci.yml`
- `training/github-actions/README.md`
- `scripts/training/workflow-contract.ts`
- `tests/contracts/training-curriculum.test.ts`

#### Trigger contract — fixed

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

`package.json`を含めない理由: Web / Common側script変更だけでNative Emulatorを起動しないため。Native exercise package command自体はstatic validatorでexactに確認する。

#### Execution contract — fixed

`pull_request` / `workflow_dispatch`のどちらでも一本道を使う。

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

#### Job / step labels — implementation guidance, not machine-frozen contract

Current job表示名`Training Android Maestro baseline`はbaseline-onlyで実態と合わなくなるため、genericな`Training Android Maestro`へ変更する。

stepはbaseline / exerciseを別々に表示する。

```text
Run Training Maestro baseline
Run Training Maestro exercise
```

job / step表示名自体はmachine contractでfreezeしない。目的はGitHub UI上の誤解を避けることだけである。

#### Intentional baseline re-run

`training:native:exercise`のcanonical YAMLがbaseline Flowを`runFlow`するため、Workflow上ではstandalone baseline後にexercise内でもbaseline setupを再実行する。

この重複は次を両立するため意図的に維持する。

- standalone baseline Evidenceを独立して保存
- `training:native:exercise`をCI外でも単独実行
- learner exercise側がbaseline setup contractを自分で保持

重複解消のためにworkflow input、skip flag、runner mode、別setup Flow、conditional YAMLを追加しない。

#### Successful CI exercise evidence — fixed

C08でsuccessful Training Native CI Artifactとして扱う最低条件は次とする。

1. `training:native:exercise` stepが実行されてsuccessである。
2. 同一Runのuploaded Artifact内に`maestro/exercise/training-native-exercise.xml`が存在する。

**Workflow run全体がsuccessであることを追加条件にしない。** exercise成功後のdiagnostic collection / artifact post-processing / emulator cleanup等の後処理failureへC08 Completionを結合しない。

exercise stepへ到達している場合、通常のfail-fast実行順によりstandalone baseline stepは通過済みであるため、別のbaseline-success判定ロジックを追加しない。

次はdiagnostic artifactとして残すがC08 successful evidenceにしない。

- baseline failure後のArtifact
- exercise failure後のArtifact
- exercise JUnitを欠くArtifact
- emulator / SDK / install failure後のArtifact

Artifact collection / uploadの`if: always()`は維持する。

#### README synchronization — required

`training/github-actions/README.md`は必ず変更する。現在のbaseline-only説明を残さない。

最低限次を説明する。

- `training-ci.yml` = Web baseline + explicit expected-failure entry
- `training-native-ci.yml` = Native specialization向けで、対象path変更またはmanual dispatch時にbaseline→exerciseを実行
- Source Repositoryの`training/github-actions/*.yml` = repository-owned template / Reference
- Training Copyの`.github/workflows/*.yml` = `prepare-training-copy.ts`が配置するactive workflow
- Native Training workflowはCommon-only変更では起動しない

READMEを別のTraining architecture documentへ拡張しない。

**Expected contract**

- Common-only PR: Native workflowはtriggerされない
- Native specialization PR: baseline→exerciseを実行
- manual dispatch: baseline→exerciseを実行
- baseline failure: exerciseへ進まない
- baseline success + exercise failure: failure Artifactを残すがCompletionには使わない
- exercise success + valid exercise JUnit Artifact: C08 successful execution evidenceとして利用可能
- exercise後のcleanup等がfailureでも、exercise success + valid Artifact自体を無効化する追加ルールは作らない
- Product `.github/workflows/native-ci.yml`は変更しない

### Task 4 — Learner-facing command / Artifact alignment

#### Required Web learner-facing sync

次の4ファイルはCurrent確認済みのため**Required**とする。

- `docs/curriculum/test-automation/part1/04_playwright-foundations.md`
- `docs/curriculum/test-automation/part1/05_playwright-e2e-practice.md`
- `docs/curriculum/test-automation/part1/06_execution-and-failure-analysis.md`
- `docs/curriculum/test-automation/part1/09_part1-capstone.md`

Task 1のexact intentだけを反映し、教材全面rewriteはしない。

#### Required Native learner-facing sync

- `docs/curriculum/test-automation/part1/07_maestro-native-automation.md`
- `docs/curriculum/test-automation/part2/06_native-ci-maestro.md`

#### No planned change unless Current facts unexpectedly diverge

- `docs/curriculum/test-automation/README.md`
- `docs/curriculum/test-automation/00_learning-design.md`
- `docs/curriculum/test-automation/02_competency-rubric.md`
- `docs/curriculum/test-automation/part2/05_playwright-ci.md`
- `docs/curriculum/test-automation/part2/08_integration-design-capstone.md`
- `docs/reference/curriculum-self-study-review.md`

P2-5は既にlearner-facing expected-failure commandとして`training:web:check-expected-failure`を扱うため教材変更しない。

#### General required alignment

- Web: baseline → desktop exercise → mobile exerciseを一意に辿れる。
- Web expected failure: checked contract PASSとunexpected failureを区別できる。
- Native P1-7: specialization gate → same serial / same runId → baseline → exercise → Evidenceを一意に辿れる。
- Native P1-7: `1 runId = 1 attempt`とretry時のbaseline / exercise / Evidence対応を誤解しない。
- Native P1-7: retryとして新attemptを開始する場合はnew runIdを使い、旧attemptを上書きしない。
- Native learnerがsuccessful Artifactとfailure diagnostic Artifactを区別できる。
- Common routeではNative commandを要求しない。

#### P2-6 bounded rewrite — exact locations

P2-6は全面rewriteしない。旧「learnerがTraining Native workflowを変更してCompletionする」前提が残る次の8箇所だけを同期する。

1. `## 教材` の主な参照先
   - `scripts/training/run-maestro-exercise.ts`を追加する。
   - source template / Training Copy active workflowの役割を明記する。

2. `## Training Native Workflowの前提`
   - prepared workflowをlearnerが再設計する前提を置かない。
   - workflow起動時にbaseline→exerciseを実行することを明記する。
   - baseline / exercise / Failure Artifactの役割を分ける。

3. `Training baselineは...`から始まるCompletion説明段落
   - learner-authored bounded Native CI変更をRequiredから削除する。
   - `learner-authored Native exercise diff + successful CI exercise Artifact + CI設計判断`へ置換する。

4. `## ハンズオン1: Android MaestroをTraining CIで実行する`
   - learnerがFlowをworkflowへ追加する演習にしない。
   - prepared Training Native workflowをNative specialization changeまたはmanual dispatchで実行し、baseline→exerciseとArtifactを確認する演習へ変更する。
   - workflow YAML編集をRequired actionにしない。

5. `## ハンズオン3: 現在のAndroid Native CI構成を図にする` 内の比較文
   - `自分の1Job構成`という旧learner-authored workflow前提を削除する。
   - `prepared Training Native Workflowの1Job構成`または同義の表現へ置換し、現在のFormal Native CIとの比較目的だけを残す。

6. `## 自己確認`
   - 「自分が作成したboundedなNative CI変更」を要求しない。
   - exercise diff、successful CI Artifact、Trigger / Failure stage / Artifact / Cost判断へ置換する。

7. `### Recovery`
   - baselineしかない場合にworkflow diffへ戻る記述を削除する。
   - failure stageを切り分け、Environment block解消後は同じlearner exerciseへrejoinする。
   - failure Artifactはdiagnosis用でsuccessful Completion evidenceではないことを明記する。

8. `## 完了条件`
   - bounded Training Native CI変更作成をRequiredから削除する。
   - learner-authored Native exercise diff + successful Training Native CI ArtifactをRequiredにする。
   - Trigger / Failure / Artifact / Costの設計判断を残す。

上記以外のLesson 1〜11、Android/iOS comparison、Failure分析、Cost議論、Build/Runtime分離、iOS ReferenceはPR5で全面rewriteしない。

P2-6 Completion wordingはCurriculum proseとしてmanual cross-checkする。新しいliteral contract testは追加しない。

### Task 5 — Contract / validator synchronization

**Exact targets**

- `scripts/validate-curriculum.ts`
- `scripts/training/workflow-contract.ts`
- `tests/contracts/training-curriculum.test.ts`

#### validate-curriculum — command contracts

追加 / 更新するstable contract:

- `training:web:exercise` exact = `playwright test training/playwright/exercises --config=playwright.training.config.ts --project=training-chromium`
- `training:native:exercise` exact = `tsx scripts/training/run-maestro-exercise.ts`
- existing `training:web:mobile:exercise` exact contract維持

#### validate-curriculum — Native runner responsibility migration

Required Training assetsへ最低限次を追加する。

- `scripts/training/maestro-runner.ts`
- `scripts/training/run-maestro-exercise.ts`

検査責務を次へ移す。

```text
maestro-runner.ts
  - TRAINING_MAESTRO_OUTPUT_DIR
  - resolveTrainingAndroidSerial
  - existing ADB ready / force-stop / pm clear / pidof wait semantics
  - buildMaestroInvocation
  - process timeout / spawn / exit handling

run-maestro-baseline.ts
  - baseline flow
  - training-native-baseline.xml
  - default output = output/training/maestro
  - shared runner invocation
  - top-level catch / process.exitCode = 1

run-maestro-exercise.ts
  - exercise flow
  - training-native-exercise.xml
  - default output = output/training/maestro/exercise
  - shared runner invocation
  - top-level catch / process.exitCode = 1
```

共通cleanup tokenを`run-maestro-baseline.ts`へ残すことをvalidator都合で要求しない。

#### workflow-contract — exact command set change

- REMOVE `pnpm run training:web:expected-failure`
- ADD `pnpm run training:web:check-expected-failure`
- ADD `pnpm run training:native:exercise`
- `pnpm run training:web:exercise`はworkflowで使わないため追加しない

その他の既存approved command / action / runner boundaryは変更しない。

#### training-curriculum.test.ts — existing assertion migration

新しいgeneric test suiteを増やさず、既存testの責務を更新する。

Machine contractとして最低限次を検証する。

1. desktop exercise command exact target / config / project
2. Native exercise package command exact entry
3. `maestro-runner.ts`がcurrent cleanup semanticsを保持
4. cleanup ordering（force-stop → pm clear → process exit wait）
5. cleanupがMaestro invocationより前
6. baseline entryのflow / JUnit / default output / shared runner接続
7. exercise entryのflow / JUnit / default output / shared runner接続
8. Native exercise YAMLがbaseline `runFlow` setupを持ち、単独exercise contractを維持
9. Web workflow expected-failure modeがchecked commandを使う
10. workflow contractがraw expected-failure commandを許可しない
11. Web workflowにlearner `exercise` modeがない
12. Native workflow `pull_request.paths` exact set
13. Native workflowにmode inputがない
14. Native workflowがbaseline→exerciseを実行
15. Native workflowがbaseline / exercise output directoryを分離
16. Product Formal workflowにlearner exercise commandがない
17. C08 baseline non-substitution contractを維持

Machine contractにしないもの:

- job / step display nameのliteral
- README prose全文
- P2-6 Completion prose全文
- P2-6 heading単位の全文一致
- `native-training-exercise.yaml`がPR5以前と全文一致すること
- exercise YAMLにScreenshotが存在しないこと
- Artifact表示名
- Workflow全体conclusionをC08 successful evidenceとして固定すること
- log wording

`native-training-exercise.yaml`のPR5無変更はimplementation diff reviewで確認する。

successful CI exercise evidenceはruntime / learner-facing contractとして`exercise step success + same-run exercise JUnit Artifact`を使い、これを自動graderへ発展させない。

## RA-G5 disposition

**Disposition: `defer`**

Currentでは`training/maestro/failure-exercises/README.md`だけがあり、executable Native failure Flowは存在しない。

PR 5では追加しない。

理由:

- C08 Minimum Evidenceはsuccessful Native exercise artifact + learner diffであり、failure Flowを要求しない。
- C09はCommon competencyで、Web expected-failure / learner failureからmeaningful diagnosis evidenceを作れる。
- P2-6は意図的または実際のNative failureを分析でき、専用fixtureを必須としていない。
- failure Flowを実装するとflow / command / runner / evidence / docs / contractのmaintenance surfaceが増える。
- PR 5のGoal / DoDに必要なEvidenceは増えない。

Native固有failure assetが自己学習Completionに不可欠というlearner review Evidenceが得られた場合だけfollow-upで再評価する。

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

Native deviceを必要としないTypeScript / static contractはRequired。

### B. Implementation diff validation

実装PRのdiffで最低限次を確認する。

- `training/maestro/exercises/native-training-exercise.yaml`にPR5由来の変更がない。
- Product Formal workflowsに変更がない。
- Web exercise CI mode / Native mode / new generic frameworkがない。
- Web教材変更がP1-4 / P1-5 / P1-6 / P1-9のcanonical command同期に限定されている。
- P2-6変更が上記8箇所中心のbounded syncであり、教材全面rewriteになっていない。

### C. CI / workflow static validation

- Web workflow expected-failureがchecked commandを使用
- workflow allowlistにraw `training:web:expected-failure`が残っていない
- Native workflow `pull_request.paths` exact set
- Native workflowにmode input / mode conditionalがない
- Native workflowがbaseline→exerciseの順に実行
- baseline / exercise output directoryを分離
- exercise内baseline setupをskipする追加mode / flag / conditionalがない
- Artifact collection / uploadはFailure時も残る
- Training Copy prepare / validate PASS
- workflow safety boundary PASS
- Product Formal workflowにTraining learner exerciseを追加していない

P2-6 Completion proseはManual learner validationで確認する。

### D. Conditional Native runtime validation

Physical AndroidまたはGitHub-hosted Emulatorが利用可能な場合だけ実施する。

**Local Physical Android**

1. existing Doctor / Prepare / Build / Install / Smoke / Test Controlを実施。
2. explicit serialをTraining serial envへ揃える。
3. same `$runId`でbaselineを実行。
4. same serial / runIdでexerciseを実行。
5. exercise内部でbaseline Flow setupが再実行されることを確認。
6. baseline / exerciseのJUnit / output directoryを区別できることを確認。
7. exercise exit `0` + exercise JUnit存在をsuccessful local executionとして確認。
8. learner-authored diffがsuccessful exercise Evidenceとは別に存在することを確認。
9. exercise後にexisting Evidence Actionを同じserial / runIdで実行。
10. retryする場合はnew attempt = new runIdとし、そのnew runIdでbaseline→exercise→Evidenceを揃える。
11. 旧attemptのrunIdを再利用せず、Evidenceを上書き・混在させない。

Local direct baselineのdefault outputが従来`output/training/maestro`のままであることも確認する。

**GitHub Training Native CI**

- Native specialization path changeでworkflowが起動。
- Common-only path changeでは起動しない。
- workflow起動時にstandalone baseline→exerciseが実行される。
- exercise内baseline Flow setupの再実行を許容し、skip最適化がない。
- `output/training/maestro/baseline`と`.../exercise`をArtifact内で区別できる。
- successful exercise stepのsame-run Artifactにexercise JUnitが存在する。
- exercise failure runでもdiagnostic Artifactが保存されるが、successful Completion evidenceとして扱わない。
- exercise success後のcleanup / diagnostic後処理failureが発生した場合でも、exercise step success + valid exercise JUnit ArtifactというC08 Evidence条件自体を追加ロジックで無効化しない。

### Environment block

Native runtimeが利用できない場合はsource defectと断定しない。最低限次を記録する。

- validation name
- attempted command / workflow
- environment: Local Physical Android / GitHub-hosted runner
- first failed environment stage
- Android SDK / ADB / serial / device / emulator / Maestro / KVM / quotaの該当状態
- source validationとして完了した項目
- runtime未確認項目
- 再開条件

次を区別する。

- source / type / contract failure
- learner exercise / assertion failure
- runner failure
- SDK / ADB / device / emulator / Maestro failure
- GitHub-hosted runner infrastructure / quota failure

## Manual learner validation

`docs/reference/curriculum-self-study-review.md`をcriteriaとして使い、個別learner review結果をRepositoryへ保存しない。

最低限確認する。

- baselineとlearner exerciseの目的を区別できる。
- Web learnerが`training:web:exercise`を一意に選べる。
- Mobile exerciseは既存commandのまま辿れる。
- expected failureはchecked contract PASSとunexpected failureを区別できる。
- stock starter / baseline PASSだけではC07 / C08 Completionにならない。
- P1-7で`1 runId = 1 attempt`のbaseline→exercise→Evidenceを教材だけで実行できる。
- retry時のnew attemptがnew runIdであり、別runIdのbaseline / exercise / Evidenceを混在させない。
- Native exercise内のbaseline Flow再実行がsetup目的であり、standalone baseline Evidenceとは別責務だと理解できる。
- successful exercise Artifactとfailure diagnostic Artifactを区別できる。
- CIではexercise step success + same-run exercise JUnit Artifactがsuccessful execution evidenceであり、workflow全体conclusionへ不要に依存しないことを説明できる。
- Environment failure時の切り分けとrejoin先が分かる。
- Common learnerへPhysical Android / Native runtimeを要求していない。
- Native learnerが`training:native:exercise`を実行し、successful artifactとGit / PR diffを組み合わせてC08 Evidenceを説明できる。
- P2-6でTraining workflow YAMLを変更しなくても、Native exercise diff / CI Artifact / Trigger・Failure・Artifact・Cost判断からcompletionを自己確認できる。
- Source templateとTraining Copy active workflowの役割を区別できる。
- Instructorの非公開判断なしにCompletion Evidenceを自己確認できる。

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
- exercise内baseline Flow再実行を消すためにmode / skip flag / setup taxonomyが必要。
- Native exercise Evidence分離のために新Screenshot taxonomyが必要。
- successful Artifact判定のためにgrader / state DBが必要になる。
- Native environment制約をsource保証弱体化で回避する必要がある。
- learner exerciseをProduct Formal Regressionへ混在させないと成立しない。

## Definition of Done

PR 5は次がすべて満たされた時点で有限に完了する。

1. `training:web:baseline`と`training:web:exercise`が別commandである。
2. `training:web:exercise`がexactに`training/playwright/exercises` + `playwright.training.config.ts` + `training-chromium`へ接続されている。
3. `training:web:mobile:exercise`の既存責務を維持する。
4. P1-4 / P1-5 / P1-6 / P1-9が`training:web:exercise`をdesktop learner exerciseのcanonical commandとして一貫して案内する。
5. Web expected-failure workflowが`training:web:check-expected-failure`を使用し、unexpected PASS / missing Evidenceをfail-closeする。
6. workflow allowlistからraw `training:web:expected-failure`をremoveし、checked commandだけをWorkflow用に許可している。
7. Web Training workflowへlearner exercise modeを追加していない。
8. `training:native:exercise`がexactに`tsx scripts/training/run-maestro-exercise.ts`へ接続されている。
9. `training:native:baseline`と`training:native:exercise`が別commandである。
10. Native baseline direct commandの既存default output `output/training/maestro`を維持する。
11. Native baseline / exerciseの重複execution logicをbounded `maestro-runner.ts`へ共通化し、2つのexplicit thin entrypointを維持する。
12. `maestro-runner.ts`のconfig surfaceがflow path / JUnit file / default output directoryだけである。
13. runnerがfailureをthrowし、各entrypointがtop-levelでcatchして`process.exitCode = 1`を設定する。
14. validator / contract testの共通cleanup / invocation assertionが`maestro-runner.ts`へ移管されている。
15. Native baseline / exerciseがJUnit / Workflow output namespaceで識別できる。
16. Current Native exercise YAMLはPR5で変更せず、baseline `runFlow` setupと単独実行性を維持する。
17. Native CIでstandalone baseline後にexercise内baseline setupが再実行されることを意図的に許容し、重複回避用mode / flag / conditionalを追加していない。
18. P1-7 local pathが`1 runId = 1 baseline → exercise → Evidence attempt`で一意である。
19. retryとして新attemptを開始する場合はnew runIdを使い、旧attemptのEvidenceを上書き・混在させない。
20. Local successful exercise Evidenceが`exercise command exit 0 + same-attempt exercise JUnit存在`で判別できる。
21. Native Training CI successful exercise Evidenceが`exercise step success + same-run exercise JUnit Artifact`で判別できる。
22. Native Training CI successful evidenceへWorkflow全体conclusionを追加必須条件としていない。
23. Failure時Artifact uploadを維持し、diagnostic Artifactをsuccessful Completion evidenceと混同しない。
24. C08 completionがlearner-authored Native diff + successful exercise Artifactの両方を要求し、baseline / stock PASSだけで成立しない。
25. Native Training workflowはexact `pull_request.paths`によるspecialization opt-inである。
26. Native Training workflowにmode input / mode conditionalがなく、起動時は常にbaseline→exerciseを実行する。
27. Native workflowのjob表示がbaseline-onlyの誤解を生まないgeneric表記へ更新されている。
28. `training/github-actions/README.md`がbaseline→exercise、template / active workflow、Native opt-inをCurrentとして説明する。
29. Common-only PRへNative runtimeを無条件要求しない。
30. P2-6の指定8箇所からlearner-authored workflow YAML変更のRequired要件が除去され、exercise diff + successful CI Artifact + Trigger / Failure / Artifact / Cost判断へ揃っている。
31. P2-6のハンズオン3が`自分の1Job構成`という旧workflow-edit前提を残していない。
32. P2-6 prose全文を新しいmachine contractとしてfreezeしていない。
33. Product Formal Web / Native workflowへlearner exerciseを追加していない。
34. validator / workflow contract / existing contract testがnew stable code / workflow contractを機械検証する。
35. `native-training-exercise.yaml`無変更はimplementation diff reviewで確認し、negative permanent testを追加していない。
36. Learner-facing command / Artifact参照が実装事実と一致し、PR 4A self-study contractと矛盾しない。
37. RA-G5を`defer`し、Native failure harnessを追加していない。
38. scoring engine、learner DB、AI grader、generic Training frameworkを追加していない。
39. Required local/static validationがPASSする。
40. Native runtime未実施の場合はEnvironment blockとして明示し、source PASSとruntime unknownを混同しない。

## Expected implementation file set

### Runtime / command

- `package.json`
- `scripts/training/run-maestro-baseline.ts`
- `scripts/training/maestro-runner.ts`（new / bounded shared orchestration）
- `scripts/training/run-maestro-exercise.ts`（new / explicit exercise entry）

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

現時点では変更予定に含めない。

- `playwright.training.config.ts`
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

継続reviewの回数・PASS・個別結果保存はPR 5 DoDに含めない。

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
8. Contract assertionはstable behaviorだけへ限定する。
9. P2-6からlearner-authored workflow YAML変更のRequired要件を外す。
10. Native exercise内baseline再実行を意図的な重複として維持し、skip flag / setup再分割を作らない。
11. P1-7 local runbookをsame serial / same runId / baseline→exercise→Evidenceで固定する。
12. shared runner configをflow / JUnit / default outputの3値へ限定する。
13. Native exercise YAMLを変更しない。
14. `training:native:exercise`をexact package contract化する。
15. Native cleanup assertionの参照先をshared runnerへ移管する。
16. Workflow allowlistを実行実態へ縮小する。
17. P2-6 proseのliteral machine contractを追加しない。
18. successful CI evidenceからWorkflow全体successという余分な条件を削除し、exercise step success + exercise JUnit Artifactへ限定する。
19. Web教材の変更対象をP1-4 / P1-5 / P1-6 / P1-9へ確定し、実装者へ不要な候補判断を残さない。
20. P2-6の旧workflow-edit前提を8箇所へ有限化し、ハンズオン3の`自分の1Job構成`も同期対象に含める。
21. retryはnew attempt = new runIdとしてEvidence provenanceを単純化する。

### Over-engineering guard

実装PRで次が出てきた場合はPlan逸脱として削る。

- Web exercise CI mode
- Native baseline / exercise mode selector
- Native exercise内baselineをskipするflag / conditional
- baseline setup専用の新taxonomy / framework
- exercise固有Screenshot taxonomy
- mode-specific artifact naming framework
- Playwright output router
- generic Training CLI
- runner class hierarchy
- plugin system
- validator/testを通すためだけにthin baseline entryへcleanup implementationを残すこと
- learner-state / scoring persistence
- Native failure fixture without new evidence
- learner-authored workflow YAML変更をP2-6 completionへ再導入すること
- P2-6 Completion prose全文のliteral machine assertion
- Workflow全体conclusionをC08 successful evidenceへ再追加すること
- retry attempt管理用の新DB / manifest / state machine

### Implementation readiness

実装者に残す判断は、通常のコードstyleや既存記述に合わせる局所判断だけとする。

次はPlanで固定済み。

- Web exercise exact package command
- Web learner-facing変更対象4ファイル
- Web workflowで追加しないもの
- expected-failure workflow canonical command
- raw / checked expected-failureのworkflow allowlist disposition
- Native exercise exact package command
- Native shared runnerの責務範囲 / config surface / error ownership
- validator / contract testのshared runnerへのassertion移管先
- baseline default output維持
- exercise flow / JUnit / default output
- Native exercise YAML無変更
- exercise YAML内baseline setup維持と意図的なCI再実行
- P1-7 same serial / same runId local sequence
- new attempt = new runId retry契約
- Local successful evidence条件
- Native workflow exact PR paths
- Native workflow execution sequence
- Native CI successful evidence = exercise step success + same-run exercise JUnit Artifact
- Workflow全体conclusionをsuccessful evidenceへ要求しないこと
- P2-6 learner artifact / completion boundary
- P2-6 bounded sync 8箇所
- Source template / Training Copy active workflowの役割
- validator / contract testの固定対象
- RA-G5 defer

Self-review結論: **PR 5 Objectiveを満たすための実装面積は十分に縮小されている。これ以上runner / workflow / Evidence構造を削ると、重複実装またはlearner-facing ambiguityを増やす。Current learner YAMLを無変更で再利用し、Web direct command、Native thin entries + bounded runner、Native opt-in workflow、既存Artifactを使う構成が最小である。実装開始可能だが、本branchでは実装しない。**

## Unresolved blockers / unknowns

Plan作成時点でsource implementation開始を妨げるblockerはない。

conditional unknownは次だけ。

1. GitHub-hosted Android runner / KVM / quotaが実Run時に利用可能か。利用不可ならEnvironment blockでありsource defectではない。
2. Local Physical Androidが実装者環境で利用可能か。利用不可でもCommon completion / source static validationをblockしない。

Native `pull_request.paths`、P1-7 local sequence、retry runId contract、successful Artifact判定、P2-6 learner artifact boundary、Native shared runnerのvalidator/test移管先、workflow allowlist dispositionは本Planで固定したため、実装時の未決事項として残さない。

Product / Spec / PR 3 / PR 4A contract矛盾を新たに発見した場合だけStop conditionに従う。
