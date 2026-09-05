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

この目的のために必要でないWorkflow mode、Artifact taxonomy、generic framework、learner-state DB、scoring engineは追加しない。

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
| Expected failure raw | `training:web:expected-failure`が失敗するspecを直接実行 | 内部/直接調査用として維持可能 |
| Expected failure checked | `training:web:check-expected-failure`がexpected failure + Evidence存在を機械判定 | learner-facing / Training workflowのcanonical entryとして利用 |
| Training config | `training-chromium` / `training-mobile-chromium`が既に存在 | 新project / new Web runnerを作らない |
| Web output | `output/training/playwright`配下 | 既存構造を変更しない |
| Web Training workflow | PRはbaseline、manualはbaseline / raw expected-failure | exercise modeは追加しない。expected-failureだけchecked commandへ同期 |

### Native

| Area | Current state | PR 5 judgment |
| --- | --- | --- |
| Baseline command | `training:native:baseline` → `run-maestro-baseline.ts` | 維持 |
| Learner exercise YAML | `training/maestro/exercises/native-training-exercise.yaml`が存在 | canonical exerciseとして再利用 |
| Learner exercise command | package command / runnerなし | `fix_now` / RA-G4 |
| Serial resolution | `scripts/training/serial-resolution.ts`に共通化済み | 再利用 |
| Maestro invocation | `scripts/training/maestro-invocation.ts`に共通化済み | 再利用 |
| Baseline runner | serial resolution、ADB cleanup、output準備、Maestro invocation、process実行を保持 | shared orchestrationだけTraining専用helperへ抽出 |
| Baseline default output | `output/training/maestro` | **変更しない**。既存利用者のdefault contractを維持 |
| Native Training workflow | `pull_request`全体 + `workflow_dispatch`、baselineだけ実行 | `fix_now`: Native specialization pathsだけで起動し、起動時はbaseline→exerciseを常に実行 |
| Native workflow mode | 現在なし | **追加しない**。不要な分岐を増やさない |
| Native failure exercise | READMEのみ | RA-G5 `defer` |

### Contract / Training Copy

| Area | Current state | PR 5 judgment |
| --- | --- | --- |
| Rubric | C07 / C08のlearner-authored Minimum Evidenceとbaseline非代替が既に明記 | 変更しない |
| Curriculum route | Common / Native branch / skip / rejoinはPR 4Aで整備済み | 変更しない |
| Self-study checklist | Command / Artifact / Environment blockをgeneric criteriaとして保持 | 原則変更しない |
| Curriculum validator | Mobile exercise等は検証するがdesktop / native exercise commandは未要求 | new canonical commandだけ最小追加 |
| Workflow contract | 現行Workflowで使うcommandだけallowlist | 実際にWorkflowで新しく使うcommandだけ追加 |
| Contract test | route、Training/Formal分離、workflow safety、Native cleanup等を既に検証 | 新しい実装契約だけ既存fileへ追加 |
| Training Copy | active workflowをTraining Web / Nativeの2本へ置換 | 維持 |

## Master Finding re-check

| Master candidate | Current judgment |
| --- | --- |
| RA-G4 | **残存**。Native learner YAMLはあるがcanonical direct entryとsuccessful exercise artifact生成入口がない。`fix_now`。 |
| RA-G5 | **事実として残存**。ただしC08 Minimum EvidenceにもCommon C09にも専用Native failure Flowは必須ではないため`defer`。 |
| CUR-M5 | Rubric上のbaseline vs learner competency境界は解消済み。Native実行基盤の残差だけPR5-F002で扱う。 |
| CUR-M7 | desktop / native direct entryとNative learner CI Evidence入口の不足が残る。Web CI exercise mode不足はFindingにしない。 |
| CUR-M10 | PR 4A全面監査は完了済み。新canonical commandと実装事実の縦方向同期だけ扱う。 |
| CUR-L5 | desktop / native exerciseのcanonical next action不足だけPR5-F001 / F002で扱う。 |

## Confirmed Findings

| ID | Severity | Disposition | Primary owner | Exact target | Current state | Problem / impact | Minimum fix | Related contract | Validation | State |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| PR5-F001 | P2 | `fix_now` | Task 1 — Web learner entry | `package.json`, `scripts/validate-curriculum.ts`, learner-facing Web sections | Desktop exercise directoryはあるが`training:web:exercise`がない | C07 learnerがraw Playwright invocationを組み立てる必要があり、canonical next actionが一意でない | existing Training config / `training-chromium`を直接使うpackage commandを1つ追加し、必要な教材だけ同期 | Master PR5 Web / C07 / CUR-M7 / CUR-M10 / CUR-L5 | exercisesだけをdesktop Training projectで実行しFormal E2Eを含めない | pending |
| PR5-F002 | P2 | `fix_now` | Task 2 — Native learner entry | `package.json`, `run-maestro-baseline.ts`, new Training Maestro shared runner, new exercise entry, learner YAML | learner YAMLはあるがdirect command / explicit exercise run Evidence契約がない | C08 learnerがcanonicalにsuccessful Maestro artifactを生成できない | `training:native:exercise`、2つのexplicit entrypoint、bounded shared execution helper、別JUnit / Screenshot / workflow output namespaceを追加 | RA-G4 / CUR-M5 / CUR-M7 / C08 | baseline / exerciseを別commandで実行でき、stock PASS単独でC08が成立しない | pending |
| PR5-F003 | P2 | `fix_now` | Task 3A — Web expected-failure workflow alignment | `training/github-actions/training-ci.yml`, `scripts/training/workflow-contract.ts` | manual expected-failure modeがraw failure commandを直接実行 | workflowが赤いこと自体を成功と人間解釈しやすく、existing checked contractを利用していない | existing mode数は増やさず、expected-failure modeの実行commandだけ`training:web:check-expected-failure`へ変更 | Master learner self-check / P2-5 | expected failure + Evidenceならworkflow success、unexpected PASS / missing Evidenceならfailure | pending |
| PR5-F004 | P2 | `fix_now` | Task 3B — Native specialization workflow | `training/github-actions/training-native-ci.yml`, workflow contract / contract test | Native Training workflowが全PRで起動しbaselineしか実行しない | Common-only learnerにもNative runtimeが暗黙実行され得て、Native learner C08 artifactも作れない | exact `pull_request.paths`でspecialization opt-in化し、workflow起動時は常にbaseline→exerciseを実行して両Evidenceを保存 | Master PR5 Native / specialization opt-in / RA-G4 / P2-6 | Common-only changeで起動せず、Native changeでbaseline + exerciseが同一Run内に残る | pending |
| RA-G5 | P3 | `defer` | Follow-up — learner review | `training/maestro/failure-exercises/README.md` | executable Native failure Flowなし | 現時点ではC08 / C09 completionを阻害しない | PR 5ではfailure Flow / runner / commandを追加しない | Master RA-G5 / C08 / C09 | Native failure harnessなしでPR5 DoDが成立 | pending |

## Scope

### In scope

- `training:web:exercise` direct entry
- `training:native:exercise` direct entry
- Native baseline / exerciseのshared execution logicの最小共通化
- Native exercise固有JUnit / Screenshot / workflow evidence namespace
- Web expected-failure workflowを既存checked commandへ接続
- Native Training workflowのspecialization opt-in
- Native workflow起動時のbaseline→exercise連続実行
- validator / workflow contract / existing contract testの最小同期
- command / Artifactの実装事実が変わるlearner-facing箇所だけのbounded同期

### Out of scope

- Web Training workflowへのlearner exercise mode追加
- Native Training workflowへのbaseline / exercise mode追加
- mode付きArtifact naming taxonomy
- Web Playwright output directoryの再設計
- baseline Native direct commandのdefault output変更
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
3. Web Training workflowには`exercise` modeを追加しない。C07 Minimum Evidenceはlocal canonical commandのsuccessful execution evidenceで成立し、CI executionは必須契約ではない。
4. Web expected-failure workflowはmode数 / Artifact名を増やさず、既存modeのcommandだけchecked entryへ置換する。
5. Native Training workflowにはmodeを追加しない。specialization opt-inは`pull_request.paths`で実現する。
6. Native workflowが起動したら常に`training:native:baseline`→`training:native:exercise`の順に実行する。manual dispatchも同じ単純な経路を使う。
7. `training:native:baseline`のdirect execution default output `output/training/maestro`は変更しない。
8. Native CIで同一Run内のEvidenceが衝突しないよう、Workflowから`TRAINING_MAESTRO_OUTPUT_DIR`をbaseline / exercise別に与える。
9. Nativeのserial resolutionとMaestro invocationは既存helperを再利用する。
10. baseline / exerciseのentrypointは別fileに残す。ただしADB cleanup、output準備、process起動、exit handling等の重複実行処理はTraining Native専用の1 helper関数へまとめる。
11. shared helperは2 entrypointの重複除去だけを目的とし、mode parser、plugin、generic framework、抽象classを作らない。
12. Contract testはstable behaviorだけを固定し、step name、log wording、prose、Artifact表示名をfreezeしない。

## Implementation tasks

### Task 1 — Web desktop learner exercise direct entry

**Exact targets**

- `package.json`
- `scripts/validate-curriculum.ts`
- `docs/curriculum/test-automation/part1/04_playwright-foundations.md`
- `docs/curriculum/test-automation/part1/05_playwright-e2e-practice.md`（必要なcommand位置だけ）
- `docs/curriculum/test-automation/part1/06_execution-and-failure-analysis.md`
- `docs/curriculum/test-automation/part1/09_part1-capstone.md`（Current記述にraw invocationが残る場合だけ）

**Change**

`package.json`へ次の意味を持つcommandを追加する。

```text
training:web:exercise
  target  = training/playwright/exercises
  config  = playwright.training.config.ts
  project = training-chromium
```

制約:

- `training:web:mobile:exercise`を変更しない。
- `playwright.training.config.ts`を変更しない。
- `e2e/web/**`を含めない。
- new Web runnerを作らない。

`validate-curriculum.ts`ではcommandの存在だけでなく、target / config / projectのexact contractを検証する。

Learner-facing materialではraw Playwright invocationを組み立てさせず、desktop exerciseのcanonical next actionを`pnpm run training:web:exercise`へ統一する。

stock starter PASSはstarter execution evidenceに過ぎず、C07にはlearner-authored diff + successful execution evidenceが必要であることを既存評価契約のまま維持する。

**Validation**

- `pnpm run training:web:baseline`
- `pnpm run training:web:exercise`
- `pnpm run training:web:mobile:exercise`
- `pnpm run validate:curriculum`
- `pnpm run test:contracts`

### Task 2 — Native learner exercise direct entry with bounded shared runner

**Exact targets**

- `package.json`
- `scripts/training/run-maestro-baseline.ts`
- new `scripts/training/maestro-runner.ts`
- new `scripts/training/run-maestro-exercise.ts`
- `training/maestro/exercises/native-training-exercise.yaml`
- `docs/curriculum/test-automation/part1/07_maestro-native-automation.md`

**Architecture — fixed**

次の構造にする。

```text
serial-resolution.ts         existing / unchanged unless required
maestro-invocation.ts        existing / unchanged unless required
maestro-runner.ts            new / bounded shared orchestration
run-maestro-baseline.ts      explicit baseline entry
run-maestro-exercise.ts      explicit exercise entry
```

`maestro-runner.ts`の責務はTraining Native Maestro実行の共通処理だけとする。

- output directory resolution / create
- serial resolution call
- existing ADB ready / force-stop / `pm clear` / process-exit wait semantics
- `buildMaestroInvocation` call
- Maestro process spawn
- exit code handling
- success / failure return handling

許可する設定値は最低限次だけ。

- flow path
- JUnit file name
- default output directory
- success label

次を作らない。

- CLI mode parser
- baseline / exercise enum framework
- plugin registry
- class hierarchy
- Product Native runnerとの共通framework

**Baseline entry**

- existing baseline flowを指定する。
- JUnit `training-native-baseline.xml`を維持する。
- direct commandのdefault outputは**現在どおり**`output/training/maestro`を維持する。
- cleanup semanticsを変更しない。

**Exercise entry**

- flow: `training/maestro/exercises/native-training-exercise.yaml`
- JUnit: `training-native-exercise.xml`
- default outputは`output/training/maestro/exercise`とする。
- package script `training:native:exercise`からこのentrypointを実行する。

**Exercise YAML**

Current learner YAMLをcanonicalとして維持し、exercise固有Screenshot `training-native-exercise`を最後に追加する。

baseline flow内Screenshot `training-native-baseline`と別名にし、同一RunのEvidenceから識別できるようにする。

**C08 contract**

- baseline PASS ≠ C08 completion
- stock exercise PASS ≠ C08 completion
- successful exercise Artifact alone ≠ C08 completion
- `learner-authored Native exercise diff + successful Maestro execution artifact`のAND条件を維持する

**Validation**

- `pnpm run typecheck:training`
- existing serial conflict fail-close contract維持
- existing cleanup semantics維持
- Native runtime利用可能時のみbaseline / exerciseを同一serialで実行
- baseline / exercise JUnit / Screenshot / Workflow output namespaceが衝突しない

### Task 3A — Web expected-failure workflow alignment only

**Exact targets**

- `training/github-actions/training-ci.yml`
- `training/github-actions/README.md`（Current説明と差が出る場合だけ）
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

**Reason**

expected failureを「Workflowが赤いから意図どおり」と人間判断させず、既存runnerが持つ以下のfail-close contractをそのまま利用する。

- intended failureが発生した
- required Evidenceが生成された
- unexpected PASSならfailure
- Evidence欠落ならfailure

Web learner exerciseをCI modeへ追加することはC07 Minimum Evidenceに必須ではないため行わない。

**Validation**

- workflow contractでchecked commandがapprovedされている
- expected-failure modeがraw commandを直接呼ばない
- baseline PR behaviorが変わらない
- Product deploy / secret / Formal E2Eを追加していない

### Task 3B — Native Training workflow specialization opt-in without modes

**Exact targets**

- `training/github-actions/training-native-ci.yml`
- `training/github-actions/README.md`
- `scripts/training/workflow-contract.ts`
- `tests/contracts/training-curriculum.test.ts`

**Trigger contract — fixed**

`workflow_dispatch`は維持し、input modeは追加しない。

`pull_request.paths`はTraining Copy上のactive workflowで次のexact setとする。

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

- `training/**`
- `docs/**`
- `package.json`
- Web Training files
- Product Formal workflow
- repository-owned template pathそのものをactive Training CopyのPR filterへ追加すること

`package.json`を含めない理由: Web / Common側script変更だけでNative Emulatorを起動しないため。Training CopyのlearnerがNative specialization exerciseを変更する中心pathは`training/maestro/**`であり、runner変更も上記exact pathsで拾う。

**Execution contract — fixed**

Workflowが`pull_request` / `workflow_dispatch`のどちらで起動しても、同じ一本道を使う。

```text
Environment / APK / Emulator setup
  -> training:native:baseline
  -> training:native:exercise
  -> collect output/training/maestro
  -> upload one Training Native artifact
```

mode分岐を作らない。

同一Run内ではWorkflow step envでoutputを分離する。

```text
baseline:
  TRAINING_MAESTRO_OUTPUT_DIR=output/training/maestro/baseline

exercise:
  TRAINING_MAESTRO_OUTPUT_DIR=output/training/maestro/exercise
```

collectorは`output/training/maestro`全体を保存する。

Artifactの表示名は既存形式を維持してよい。baseline / exerciseの識別責務は内部のdirectory / JUnit / Screenshotに持たせ、Artifact name taxonomyを増やさない。

**Expected contract**

- Common-only PR: Native workflowはtriggerされない
- Native specialization PR: baseline→exerciseを実行
- manual dispatch: baseline→exerciseを実行
- baseline failure: exerciseへ進まず、environment / harness issueを先に切り分けられる
- baseline success + exercise failure: learner exercise / assertion側の分析へ進める
- Product `.github/workflows/native-ci.yml`は変更しない

**Validation**

- `pull_request.paths` exact contract
- broad `training/**` / `docs/**`がない
- workflow内にbaseline commandとexercise commandがこの順で存在
- no mode input / no mode conditional
- no secret / deploy / self-hosted / write permission追加
- Training Copy prepare / validateが継続PASS
- Native runtimeは利用可能時だけ実Run確認

### Task 4 — Learner-facing command / Artifact alignment

**Expected change candidates only**

- `docs/curriculum/test-automation/part1/04_playwright-foundations.md`
- `docs/curriculum/test-automation/part1/05_playwright-e2e-practice.md`（必要なcommand位置だけ）
- `docs/curriculum/test-automation/part1/06_execution-and-failure-analysis.md`
- `docs/curriculum/test-automation/part1/07_maestro-native-automation.md`
- `docs/curriculum/test-automation/part1/09_part1-capstone.md`（Current記述に不一致がある場合だけ）
- `docs/curriculum/test-automation/part2/06_native-ci-maestro.md`

**No planned change unless Current facts unexpectedly diverge**

- `docs/curriculum/test-automation/README.md`
- `docs/curriculum/test-automation/00_learning-design.md`
- `docs/curriculum/test-automation/02_competency-rubric.md`
- `docs/curriculum/test-automation/part2/05_playwright-ci.md`
- `docs/curriculum/test-automation/part2/08_integration-design-capstone.md`
- `docs/reference/curriculum-self-study-review.md`

P2-5は既にlearner-facing expected-failure commandとして`training:web:check-expected-failure`を扱うため、workflow実装をそれへ合わせるだけなら教材変更しない。

**Required alignment**

- Web: baseline → desktop exercise → mobile exerciseを一意に辿れる。
- Web expected failure: checked contract PASSとunexpected failureを区別できる。
- Native: specialization gate → baseline → learner exercise → diff + successful Artifactを一意に辿れる。
- Environment block後は同じexerciseへrejoinできる。
- Common routeではNative commandを要求しない。
- Native CIはmode選択ではなく「workflow起動時にbaseline→exercise」であることをP2-6へ同期する。

教材を再監査・全面rewriteしない。新しいcommand / workflow事実で不一致が生じる箇所だけ変更する。

### Task 5 — Contract / validator synchronization

**Exact targets**

- `scripts/validate-curriculum.ts`
- `scripts/training/workflow-contract.ts`
- `tests/contracts/training-curriculum.test.ts`

**validate-curriculum**

追加するstable contract:

- `training:web:exercise`が存在
- target = `training/playwright/exercises`
- config = `playwright.training.config.ts`
- project = `training-chromium`
- `training:native:exercise`が存在

既存Mobile exercise contractは維持する。

**workflow-contract**

approved commandは実際にWorkflowが使うものだけ追加する。

- `training:web:check-expected-failure`
- `training:native:exercise`

`training:web:exercise`はWeb workflowへ追加しないため、workflow allowlistへ追加する必要がなければ追加しない。Curriculum validator側でcommand contractを検証する。

**training-curriculum.test.ts**

最低限、次だけ追加 / 更新する。

1. desktop exercise command exact target / project
2. Native exercise commandがexplicit exercise entryへ接続
3. baseline / exerciseのflow / JUnit / evidence namingが識別可能
4. Web workflow expected-failure modeがchecked commandを使う
5. Web workflowにlearner `exercise` modeを追加していない
6. Native workflow `pull_request.paths`が上記exact set
7. Native workflowにmode inputがない
8. Native workflowがbaseline→exerciseを実行
9. Product Formal workflowにlearner exercise commandが追加されていない
10. C08 baseline non-substitution contractを維持

次はfreezeしない。

- step表示名
- log文言
- Artifact表示名
- Curriculum prose全文
- YAMLの無関係な順序

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

`training:web:exercise` / `training:native:exercise`はPlan時点では未実装。上記はpost-change contract。

Native deviceを必要としないTypeScript / static contractはRequired。

### B. CI / workflow static validation

- Web workflow expected-failureがchecked commandを使用
- Web workflowにexercise modeを追加していない
- Native workflow `pull_request.paths` exact set
- Native workflowにmode input / mode conditionalがない
- Native workflowがbaseline→exerciseの順に実行
- Training Copy prepare / validate PASS
- workflow safety boundary PASS
- Product Formal workflowにTraining learner exerciseを追加していない

GitHub Actions actual runはquota / runner availabilityとsource validationを分離する。

### C. Conditional Native runtime validation

Physical AndroidまたはGitHub-hosted Emulatorが利用可能な場合だけ実施する。

**Local Physical Android**

1. existing Doctor / Prepare / Build / Install / Smoke / Test Controlを実施。
2. explicit serialをTraining serial envへ揃える。
3. baselineを実行。
4. 同じserialでexerciseを実行。
5. baseline / exerciseのJUnit / Screenshotを区別できることを確認。
6. learner-authored diffがsuccessful exercise Evidenceとは別に存在することを確認。

Local direct baselineのdefault outputが従来`output/training/maestro`のままであることも確認する。

**GitHub Training Native CI**

- Native specialization path changeでworkflowが起動。
- Common-only path changeでは起動しない。
- workflow起動時にbaseline→exerciseが実行される。
- `output/training/maestro/baseline`と`.../exercise`がArtifact内で区別できる。
- baseline / exercise JUnit / Screenshotを区別できる。

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
- Environment failure時の切り分けとrejoin先が分かる。
- Common learnerへPhysical Android / Native runtimeを要求していない。
- Native learnerが`training:native:exercise`を実行し、successful artifactとGit / PR diffを組み合わせてC08 Evidenceを説明できる。
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
- Native environment制約をsource保証弱体化で回避する必要がある。
- C08判定にDB / scoring / learner-state管理が必要。
- learner exerciseをProduct Formal Regressionへ混在させないと成立しない。

## Definition of Done

PR 5は次がすべて満たされた時点で有限に完了する。

1. `training:web:baseline`と`training:web:exercise`が別commandである。
2. `training:web:exercise`が`training/playwright/exercises` + `training-chromium`だけを実行する。
3. `training:web:mobile:exercise`の既存責務を維持する。
4. Web expected-failure workflowが`training:web:check-expected-failure`を使用し、unexpected PASS / missing Evidenceをfail-closeする。
5. Web Training workflowへlearner exercise modeを追加していない。
6. `training:native:baseline`と`training:native:exercise`が別commandである。
7. Native baseline direct commandの既存default output `output/training/maestro`を維持する。
8. Native baseline / exerciseの重複execution logicをbounded `maestro-runner.ts`へ共通化し、2つのexplicit entrypointを維持する。
9. Native baseline / exerciseがflow / JUnit / Screenshot / Workflow output namespaceで識別できる。
10. C08 completionがlearner-authored Native diff + successful exercise Artifactの両方を要求し、baseline / stock PASSだけで成立しない。
11. Native Training workflowはexact `pull_request.paths`によるspecialization opt-inである。
12. Native Training workflowにmode input / mode conditionalがなく、起動時は常にbaseline→exerciseを実行する。
13. Common-only PRへNative runtimeを無条件要求しない。
14. Product Formal Web / Native workflowへlearner exerciseを追加していない。
15. validator / workflow contract / existing contract testがnew stable contractを機械検証する。
16. Learner-facing command / Artifact参照が実装事実と一致し、PR 4A self-study contractと矛盾しない。
17. RA-G5を`defer`し、Native failure harnessを追加していない。
18. scoring engine、learner DB、AI grader、generic Training frameworkを追加していない。
19. Required local/static validationがPASSする。
20. Native runtime未実施の場合はEnvironment blockとして明示し、source PASSとruntime unknownを混同しない。

## Expected implementation file set

### Runtime / command

- `package.json`
- `scripts/training/run-maestro-baseline.ts`
- `scripts/training/maestro-runner.ts`（new / bounded shared orchestration）
- `scripts/training/run-maestro-exercise.ts`（new / explicit exercise entry）
- `training/maestro/exercises/native-training-exercise.yaml`

### Training workflow / contract

- `training/github-actions/training-ci.yml`
- `training/github-actions/training-native-ci.yml`
- `training/github-actions/README.md`（必要な記述だけ）
- `scripts/training/workflow-contract.ts`
- `scripts/validate-curriculum.ts`
- `tests/contracts/training-curriculum.test.ts`

### Bounded learner-facing synchronization

- `docs/curriculum/test-automation/part1/04_playwright-foundations.md`
- `docs/curriculum/test-automation/part1/05_playwright-e2e-practice.md`（必要な場合のみ）
- `docs/curriculum/test-automation/part1/06_execution-and-failure-analysis.md`
- `docs/curriculum/test-automation/part1/07_maestro-native-automation.md`
- `docs/curriculum/test-automation/part1/09_part1-capstone.md`（必要な場合のみ）
- `docs/curriculum/test-automation/part2/06_native-ci-maestro.md`

現時点では変更予定に含めない。

- `playwright.training.config.ts`
- `docs/curriculum/test-automation/README.md`
- `docs/curriculum/test-automation/00_learning-design.md`
- `docs/curriculum/test-automation/02_competency-rubric.md`
- `docs/curriculum/test-automation/part2/05_playwright-ci.md`
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

## Plan self-review after simplification

### Purpose / scope

- PR 5 ObjectiveをBaseline / Exercise / Evidence / Native opt-inへ限定した。
- Product / Spec / Formal Test Strategyへscopeを広げていない。
- PR 3 / PR 4AのCommon / Native / C07 / C08契約を再設計していない。
- Curriculum全面監査をやり直さない。

### Simplicity changes applied

1. **Web workflow exercise modeを削除した。** C07 Minimum EvidenceにCI runは必須ではなく、`training:web:exercise` direct entryでGoalを満たす。
2. **Native workflow modeを削除した。** specialization opt-inはpaths filter、workflow内部はbaseline→exerciseの一本道にした。
3. **mode付きArtifact名を削除した。** Nativeはdirectory / JUnit / Screenshot、Webは1 invocation / existing artifactで十分識別できる。
4. **Native baseline direct default output変更を削除した。** 既存`output/training/maestro`を維持し、CIだけenv overrideで分離する。
5. **Native helper境界を整理した。** cleanupだけを別helperにせず、2 runnerで重複するTraining Maestro orchestrationを1 bounded functionへまとめる。
6. **Native `pull_request.paths`をPlan上でexactに固定した。** 実装者へarchitecture判断を残さない。
7. **P2-5をplanned Curriculum changeから外した。** Current learner-facing commandが既にchecked expected-failureであるためWorkflowを教材へ合わせる。
8. **Contract assertionをstable behaviorだけへ限定した。** step name / Artifact display name / proseをfreezeしない。

### Over-engineering guard

実装PRで次が出てきた場合はPlan逸脱として削る。

- Web exercise CI mode
- Native baseline / exercise mode selector
- mode-specific artifact naming framework
- Playwright output router
- generic Training CLI
- runner class hierarchy
- plugin system
- learner-state / scoring persistence
- Native failure fixture without new evidence

### Implementation readiness

実装者に残す判断は、通常のコード配置や既存styleに合わせる局所判断だけとする。

次はPlanで固定済み。

- Web exercise command target / config / project
- Web workflowで追加しないもの
- expected-failure workflow canonical command
- Native shared runnerの責務範囲
- baseline default output維持
- exercise flow / JUnit / Screenshot
- Native workflow exact PR paths
- Native workflow execution sequence
- validator / contract testの固定対象
- Curriculum変更候補 / no-change候補
- RA-G5 defer

Self-review結論: **PR 5 Objectiveを満たすための実装面積を縮小しつつ、実装者が再設計しなくてよい具体性を維持した。実装開始可能だが、本branchでは実装しない。**

## Unresolved blockers / unknowns

Plan作成時点でsource implementation開始を妨げるblockerはない。

conditional unknownは次だけ。

1. GitHub-hosted Android runner / KVM / quotaが実Run時に利用可能か。利用不可ならEnvironment blockでありsource defectではない。
2. Local Physical Androidが実装者環境で利用可能か。利用不可でもCommon completion / source static validationをblockしない。

Native `pull_request.paths`は本Planでexact setを固定したため、実装時の未決事項として残さない。

Product / Spec / PR 3 / PR 4A contract矛盾を新たに発見した場合だけStop conditionに従う。
