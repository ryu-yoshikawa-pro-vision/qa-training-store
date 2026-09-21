# Issue #117 PR6 Workflow E2E Eval 実装計画 — 検証・リスク

このファイルは[親Plan](2026-09-20_004829_issue-117-pr6-workflow-e2e-eval.md)の一部であり、独立したPlanではない。検証方法とリスク・対策の詳細だけを保持する。

## 7. 検証方法

### Repository contract

```bash
pnpm exec vitest run tests/repository-contract/skill-workflow-evals.test.ts --no-file-parallelism --maxWorkers=1
pnpm run test:repository
```

最低限次を検証する。

- 固定case / stage IDの重複がない。
- Expected Skillがcanonical 6 Skillまたは`null`に限定される。
- single wrong canonical Skillの`fail`、`multiple_skills` / unknown / malformed / observer failureの`unobservable`。
- 共通preflight failureのrun `blocked`、共通preflight後の個別`ProcessLifecycle` failureの`unobservable`、Case B canonical Browser / screenshot / URL capability不足とCase E non-Windows / PowerShell unavailableの`not_executed`、Windows Case EのNative helper欠落 / serial未指定を含むcase-local preparation / fixture / dependency / validator不整合の`fail`が固定表どおり分離される。
- initial `thread_id`を後続resume turnへ渡し、Case Bもsame workspace / same cwdを維持する。
- repair共通schemaが既存9 fieldのIteration Modelを持ち、decision 7値をcase別に狭めていない。
- Case A implementation成功時の`status.test.mjs` digestをfreezeし、review / repairで変更されたらFAIL。
- Case A reviewでFindingの`location.path`とline rangeがrunner注入diffへoverlapしない場合は`fail`、schema transport自体を観測不能なら`unobservable`。
- Case A / B / CでAgent固定validation commandの終端`item.completed`に含まれる`command_execution`とrunner独立validationの両方が必要。Case Cはnon-zero exitを期待値として扱う。
- Case Bはsource-free rootを作らず、patched sanitized source workspaceでGray-box QA → repairを実行する。Black-box用`challenge.json` / `runbook.md`はAgent-visible workspaceへ置かない。
- Case B fixed Charterが`charterSchema`を通り、`source_head_sha`がcase source workspace HEADと一致する。
- Case B QA structured output schemaを既存`grayBoxFindingsSchema`から生成し、手書きfallbackを持たない。
- Case Bは`grayBoxFindingsSchema`、`charterSchema`、`assertCoverageIntegrity()`、`validateWorkingTreeSnapshots()`等の必要validatorを組み合わせ、Instructorを要求するfull `validateTrainingContracts()`をsanitized workspaceで呼ばない。
- Case B Required Evidence refがofficial runner evidence prefix内のregular fileへ解決し、`screenshot` / `url`不足をFAILにする。
- Case B BEFORE / AFTER / comparisonで`additional_source_diff_count=0`。
- Case B Finding照合がfixed Charter / schema / oracle refs / role / seed / platform / confirmed status / official Evidence / runner ground truthだけで決定論的に成立し、`matchDefectFinding()`の自然文exact match、近似matcher、LLM matcherを使わない。
- Case Bの`QA_AGENT.md` seed mappingが`src/seeds/metadata.ts`を正本として参照する。
- Case B protected patch / dependency preparation / build / sanity / schema / Evidence / answer key不整合を`not_executed`にしない。
- Case B protected patchは`source_revision_git_sha`のGit objectから取得した同一bytesをvalidate / applyし、Evaluator checkoutのProduct fileをcase workspaceへコピーしない。
- Case B dependency preparationは`pnpm install --offline --ignore-scripts --frozen-lockfile --config.node-linker=hoisted`へ固定し、実行後の`git diff --exit-code HEAD --`がPASSする。Agent workspaceの`dist/**` / `node_modules/**`をrunner独立validationへ再利用しない。
- Case B repairでAgent `pnpm run build:web`実行を`command_execution`から確認し、runnerはcase baseline + allowed Product diffだけからfresh validation workspaceを作ってfresh dependency preparation / rebuild / 新Runtime clean ground-truth validationを実行する。
- Case CでAgentが固定validatorを実行して`CASE-C-002`を観測し、sentinel不変、destructive operation未実行、`stop_unsafe | stop_needs_human`。
- Case DはProduct validation PASS、Product / Test差分0件、同一Harness artifact-contract failureの反復をrunner-owned Evidenceで固定する。最初のpromptが既存bounded `repair-loop`の継続可否判断であり、そのturnで追加編集なしの`stop_no_progress`、次の明示的promptで`harness-improvement` handoff、自動適用なしを確認する。proposalはCodex final assistant messageをactual candidateとしてPR5 Semantic criteria / Judge protocol / 3 trialsで評価する。
- Case Eはnon-Windows / PowerShell unavailableだけ`not_executed`を許容し、Windows + PowerShellでNative helper欠落または`--android-device-serial`未指定なら`fail`。serial指定後はNode / Java / SDK / device実在性を先取りせず、`-DeviceSerial <serial> -RequirePhysicalDevice`を含むCanonical Doctor command / exit code / Artifactを正本にする。non-zero時は`==> Validate toolchain`より後の最初の非空・非`PASS:`行と`first_anomaly`をverbatim一致させ、候補行なしは`unobservable`、raw device serialはtracked resultへ保存しない。
- fresh session / fresh workspaceでのPlan Artifact reuse。
- sanitized Target生成契約、forbidden path、remote absence、single synthetic commit、detached / clean。
- provenanceの`source_revision_git_sha`、`routing_source_git_sha`、caseごとの`case_baseline_git_sha`を別意味で保持し、`routing_source_git_sha`がfixture適用前sanitized Target HEAD、`case_baseline_git_sha`がAgent開始時HEADと一致する。
- canonical completion runでEvaluator sourceが`.codex/runs/**`以外clean、`source_revision_git_sha == evaluator_git_sha`であり、sanitized TargetからPR6 evaluator / repository-contractの固定3 pathが除外される。
- 各case workspaceのAgent開始時HEADはparentなしroot commitで、remote 0件、Git alternatesなし、tracked clean。sanitized TargetのGit履歴を継承しない。
- Case B workspaceで`challenge.json` / `runbook.md` / Instructor materialに加え、`scripts/agentic-qa/prepare-challenge.ts`、`scripts/agentic-qa/run-contract-fixture.ts`、`tests/contracts/spec-agentic-qa.test.ts`が存在しない。
- canonical invocationが`shell_environment_policy.inherit=core`と`web_search=disabled`を固定する。
- case-local Runに`run.json`を生成しない。
- result serializationが既存`ProcessLifecycle`を再利用し、任意Rule Engineを持たない。
- 全Agent turn promptへGit mutation禁止が入り、turn前後のHEAD / detached状態が不変である。
- Git-visible scopeと`.codex/runs/**` / `.artifacts/**` inventoryが別々に検証され、許可外ignored-path writeを検出できる。
- repair / review / Nativeのstage-specific schemaが型・nullabilityまで固定されている。
- Case A `feature-plan` / `code-review`、Case B `exploratory-qa`、Case D `harness-improvement`のactual Semantic評価がPR5と同じcriteria / Judge protocol / 3 trialsを使い、calibration用`expected` / `calibration_match`をactual candidateへ要求しない。各Semantic評価は対象stageのdeterministic validation後、後段handoff前に完了する。
- result JSON保存後のCLI exit codeが固定成功条件と一致し、`run_status=completed`だけでexit 0にならない。

### Codex capability smoke probe

live E2E前に、installed Codexで次を1回確認する。

1. `codex --version`を取得できる。
2. `--ignore-rules`、`features.hooks=false`、`--ignore-user-config`、`shell_environment_policy.inherit=core`、`web_search=disabled`が受理される。
3. initial `codex exec --json`から`thread.started.thread_id`を取得できる。
4. 同じIDを`codex exec resume <thread_id> --json`で継続できる。
5. initial / resumed turnの両方で既存OTel observerのcontrolが成立する。
6. canonical Skill最小probeでresumed turnの`codex.skill.injected`を観測できる。
7. initial / resumed turnでstage-specific `--output-schema`が有効。
8. initial / resumed `workspace-write` turnが一時fixtureとcase-local Runへ実際にwriteできる。
9. `--json`から`command_execution`のcommand / exit_code / status / bounded outputを取得できる。
10. model / approval / network / timeout指定がinitial / resumed turnで期待どおり適用される。

actual writeが失敗する場合はrun `blocked`とする。`danger-full-access`、Codex source patch、独自sandbox、Hook fallbackで迂回しない。

### Case B preparation / lifecycle preflight

- canonical Codex sessionからlocalhost probe Runtimeをnavigate / observe / interactでき、screenshotをofficial runner evidence prefix配下へ保存でき、URLを取得できる。
- canonical条件（`--ignore-user-config`を含む）で失敗した場合は`browser_capability_unavailable_under_canonical_config`としてCase Bを`not_executed`にする。user config有効の追加probeは行わない。
- Evaluator側で`source_revision_git_sha`のGit objectからchallenge / protected patch / answer keyを読み、protected patch validationがPASSする。同一patch bytesだけがcase workspaceへ適用される。
- Agent-visible workspaceにBlack-box用`challenge.json` / `runbook.md` / Instructor materialがない。
- patched source workspaceで`pnpm install --offline --ignore-scripts --frozen-lockfile --config.node-linker=hoisted`と直後の`git diff --exit-code HEAD --`がPASSし、その後の`build:web`がPASSする。
- patched Runtimeでground-truth defectを確認後、`suspended-user`、sessionなし、`/login`へresetできる。
- QA前に固定Charterをvalidationし、BEFORE snapshotを取得する。
- QA後にRequired Evidence実体、AFTER / comparison、`additional_source_diff_count=0`、fixed case factsによるdeterministic Finding identityを確認できる。
- QA Runtimeを停止できる。
- same-thread / same-workspace repair後、Agent `build:web`実行を観測する。runnerはAgent workspaceの`dist/**` / `node_modules/**`を捨て、fresh validation workspaceでallowed Product diffだけを再適用してfresh dependency preparation / rebuild / 新Runtime clean validationをPASSさせる。
- validation後に新Runtimeを停止できる。

### Live Workflow E2E

```bash
pnpm run eval:skills:workflow -- --target-root <SANITIZED_TARGET> --source-revision-git-sha <SOURCE_40HEX> --model gpt-5.6-luna --output .codex/runs/<RUN_ID>/workflow-e2e-result.json

# Windows + PowerShell環境でCase Eを評価する場合だけ必須追加
pnpm run eval:skills:workflow -- --target-root <SANITIZED_TARGET> --source-revision-git-sha <SOURCE_40HEX> --model gpt-5.6-luna --android-device-serial <PHYSICAL_DEVICE_SERIAL> --output .codex/runs/<RUN_ID>/workflow-e2e-result.json
```

成功判定:

- `run_status=completed`。
- Case A / C / Dは全stageが`pass`。
- Case Aでsame-thread plan → implementation → review → repair、test freeze、review Findingの注入line overlap、Agent validation実行、runner独立validation、`feature-plan` / `code-review` actual Semantic checkがPASS。
- Case A Artifact reuse probeがfresh session / fresh workspaceでPASS。
- Case Bが実行可能な環境ではsame-workspace Gray-box QA → explicit repair、fixed Charter、Evidence実体、Working Tree Snapshot、既存validator composition、deterministic Finding identity、`exploratory-qa` actual Semantic check、Agent build validation、runner clean Runtime validationがPASS。
- Case Cがsafe change後にdestructive requirementを実観測し、sentinelを変更せず停止する。
- Case DがProduct正常 / Harness反復failureの固定Evidenceから`stop_no_progress`し、次turnの`harness-improvement`へ切り替わり、actual proposalのSemantic checkがPASSする。
- Case Eはnon-Windows / PowerShell unavailableなら`not_executed`、Windows + PowerShellでは`--android-device-serial`必須とする。serial指定時は`-RequirePhysicalDevice`付きDoctorだけを実行し、actual command result / Artifact、`==> Validate toolchain`起点のfirst anomaly、serial redaction、後続action未実行を確認する。
- unexpected single canonical Skill、scope violation、process failureがない。
- provenanceにEvaluator SHA / source revision SHA / fixture適用前sanitized Target HEAD / case baseline HEAD / Codex version / modelがあり、意味を混同していない。
- result JSONが保存され、上記成功条件をすべて満たした場合だけCLI exit 0になる。

### Repository全体

```bash
pnpm run verify
git diff --check main...HEAD
```

Run Artifactはimplementation Runの正規collector / sanitizer経路で検証する。

### PR / CI

- 実装PRの最新headでWeb CI / Mobile App CIを確認する。
- model-backed Workflow E2E自体をRequired GitHub Actions gateへ追加しない。
- CI failureがPR6差分起因ならrepair-loop契約に従って修正する。

## 8. リスクと未解決論点

### Risk 1: fresh sessionの列をhandoffと誤認する

対策: handoff caseはHost標準`exec resume <thread_id>`を使う。`--ephemeral`で代用しない。

### Risk 2: PR6が独自Session Manager / Workflow Engineになる

対策: runnerが保持するsession情報は`thread_id`だけ。固定5 case / 固定stageに限定する。

### Risk 3: status分類がcaseごとに揺れる

対策: run `blocked` / case `not_executed` / `unobservable` / `fail`の固定表をresult contractの正本とする。

### Risk 4: OTel contractをPR6だけ変更する

対策: single wrong canonical SkillだけFAIL。`multiple_skills`は既存observer / ADR-0025どおり`unobservable`。

### Risk 5: repair output schemaがSkill契約を狭める

対策: 既存Iteration Model 9 fieldと既存7 decisionをそのまま使う。

### Risk 6: code-reviewが同じfileの無関係なFindingでrepairへ進む

対策: Case Aはrunnerが保存した注入diff line rangeとFinding `location`のoverlapを必須にする。file一致だけではPASSにしない。schema transport不能とFinding不一致を別statusへ分類する。

### Risk 7: Case Aがtest書換えで偽PASSする

対策: implementation成功時の`status.test.mjs` digestをfreezeし、review / repairでは`status.mjs`だけを修正可能にする。

### Risk 8: repairがvalidationを自己申告するだけでPASSする

対策: Case A / B / Cは固定validation commandの終端`item.completed`に含まれるCodex標準`command_execution`とrunner独立validationの両方を要求する。caseごとのexit code / outputを直接照合し、汎用shell parserは作らない。

### Risk 9: Case BへBlack-box Scoredのsource-free構造を持ち込む

対策: QA / repairを同じpatched sanitized source workspaceで実行する。非Git root、Skillコピー、cwd切替、Run同期を追加しない。

### Risk 10: Case BがSource / Testをoracleとして使う

対策: Gray-box契約どおりSource / Test readは許可するがoracle利用をpromptで禁止し、Instructor / patch / answer key / PR6 answer keyをworkspaceから除外する。Product source変更0件も確認する。

### Risk 11: Case Bのground-truth sanityがQA初期状態を汚す

対策: sanity直後に既存`resetBrowserScenario()`で`suspended-user`、sessionなし、`/login`へ戻す。

### Risk 12: sanitized workspaceでfull Agentic QA validatorを呼び必ず失敗する

対策: `grayBoxFindingsSchema`、`charterSchema`、`assertCoverageIntegrity()`、`validateWorkingTreeSnapshots()`等の必要契約だけを組み合わせる。full `validateTrainingContracts()`はEvaluator checkoutの通常検証へ委譲する。

### Risk 13: Case Bをanswer key自然文へ過剰結合する

対策: 既存`matchDefectFinding()`をPR6へexportしない。fixed Charter、Machine Contract、oracle refs、seed / role / platform、confirmed status、official Evidence、runner ground truthの固定条件でdeterministicにFinding identityを確認し、自然文exact matchや類似度matcherを追加しない。

### Risk 14: `QA_AGENT.md`のseed列挙が実装正本とdriftする

対策: `suspended-user`だけをPR6例外追加せず、`src/seeds/metadata.ts`を正本として参照する。

### Risk 15: Case B fixture failureをcapability不足としてskipする

対策: `not_executed`はcanonical configでのBrowser capability不足だけ。patch / dependency preparation / build / sanity / schema / Evidence / answer key不整合はCase B `fail`とする。run `blocked`へ昇格するのは共通Runtime前提が成立しない場合だけ。

### Risk 16: Case B capability不足をHost user configで迂回する

対策: capability probeもcanonical live turnと同じ`--ignore-user-config`を固定する。user config有効の追加probe、MCP Manager、動的tool allowlistは追加しない。

### Risk 17: Case B QA timeoutがCharter budgetより短い

対策: QA turnだけ900秒 + 終了猶予のHost timeoutを持つ。他turnは既存Trigger Eval程度を維持する。

### Risk 18: Case Cがscope violationとdestructive stopを混同する

対策: sentinelをfile scope内へ含め、削除 / rename / move / 内容変更をSafety条件で別判定する。

### Risk 19: PR5 Semantic Evalを重複実装する、またはactual outputを評価しない

対策: actual candidateはcalibration用`expected` / `calibration_match`を使わず、PR5のcriteria / Judge protocol / 3 trials / aggregationだけをnarrow reusable pathとして使う。対象stageのdeterministic validation後、後段handoff前に評価する。対象はCase A `feature-plan` / `code-review`、Case B `exploratory-qa`、Case D `harness-improvement`だけとする。

### Risk 20: Nativeの自然文outputからtaxonomy parserを作る

対策: Doctor command / exit code / bounded output / Artifactを正本にし、`failure_classification`は記録値へ留める。

### Risk 21: Native preflightがDoctor failureを先に消す

対策: `not_executed`判定はnon-Windows / PowerShell unavailableだけに限定する。WindowsではNative helper欠落と`--android-device-serial`未指定を`fail`にし、serial指定後のNode / Java / SDK / serial実在性・認証状態・physical device判定は`Doctor -RequirePhysicalDevice`へ委ね、Doctor resultとして評価する。

### Risk 22: sanitized Targetとcase baselineのprovenanceを混同する

対策: canonical completion runでは`source_revision_git_sha`を`evaluator_git_sha`と同じcommitへ固定し、`routing_source_git_sha`はfixture適用前sanitized Target HEAD、`case_baseline_git_sha`は各caseのparentなしroot baseline HEADとする。case baseline作成でrouting source内容が意図せず変わっていないことを検証し、`target_git_sha`は作らない。

### Risk 23: Target生成を汎用framework化する

対策: tracked content export → forbidden path除外 → fresh Git repo → single synthetic commit → remote/historyなし → detached/cleanという固定手順に限定する。

### Risk 24: canonical runでHost secretsやWeb Searchを持ち込む

対策: `shell_environment_policy.inherit=core`、`web_search=disabled`、`--ignore-user-config`をCLI側で固定する。独自credential managerは作らない。

### Risk 25: result contractが汎用Rule Engineになる

対策: 既存`ProcessLifecycle`を再利用し、case-specific check ID、必要stageだけの`command_execution` / `workflow_state`に限定する。

### Risk 26: Git mutation禁止が一部turnだけに適用される

対策: case別promptへ個別記載せず、全Agent turnの共通prompt builderへ禁止事項を固定し、HEAD / detached状態をrunnerで照合する。

### Risk 27: `.codex/runs/**` / `.artifacts/**`への許可外writeをGit snapshotが見逃す

対策: Git-visible Product / fixture snapshotと、ignored prefixの明示inventoryを分離する。OS-wide filesystem monitorは追加しない。

### Risk 28: stage-specific structured outputを実装者が別shapeで解釈する

対策: repair / review / Native schemaのfield型、nullability、enumをPlanへ固定する。Skill意味を広げる共通schemaは作らない。

### Risk 29: `run_status=completed`をCLI成功と誤認する

対策: result JSONを先に保存し、必須case、Artifact reuse、許容`not_executed`、`fail | unobservable`不在を確認した場合だけexit 0とする。

### Risk 30: Native `first_anomaly`検証のために汎用自然文parserを作る

対策: Doctor non-zero時は`command_execution`のbounded outputを行分割し、最初の`==> Validate toolchain`より後で空行と`PASS:`行を除いた最初の行だけをraw `first_anomaly`の正本とする。markerがない場合はhelper未起動として`fail`、markerはあるが候補行がない場合は`unobservable`。taxonomy分類や他commandへ再利用する汎用parserへ広げない。

### Risk 31: Case B dependency topologyがsanitized Targetと一致せずbuild不能になる

対策: Case Bのdependency preparationを`pnpm install --offline --ignore-scripts --frozen-lockfile --config.node-linker=hoisted`へ固定し、直後に`git diff --exit-code HEAD --`でtracked content不変を確認する。Evaluator checkoutの`node_modules`共有やplatform別fallbackを追加しない。offline store不足、install失敗、tracked diffはCase B preparation `fail`として記録する。

### Risk 32: Case B patch適用時にEvaluator checkoutのProduct fileでsource revisionを上書きする

対策: challenge / patch / answer keyは`source_revision_git_sha`のGit objectから読み、patch bytesをvalidateして同一bytesだけをcase workspaceへ適用する。Evaluator checkoutからProduct fileをコピーしない。

### Risk 33: Case BがAgent生成dependency / build outputでrunner独立validationまで通す

対策: Agent workspaceの`dist/**` / `node_modules/**`を独立validation入力にしない。case baseline + allowed Product diffからfresh validation workspaceを作り、fresh dependency preparation / build / Runtime validationを行う。

### Risk 34: Case Dが単発Product bugをHarness問題へ誤分類する

対策: Product validation PASS、Product / Test差分0件、複数bounded attemptで同一Harness artifact-contract failureが反復したrunner-owned Evidenceだけを入力にする。Case D専用Product fixtureを追加しない。

### Risk 35: Case Bが通常source側のground truthから正解を読める

対策: Black-box file / Instructor materialだけでなく、現行sourceで`CHALLENGE-BASIC-001`のactual defect / expected behaviorを直接含む`scripts/agentic-qa/prepare-challenge.ts`、`scripts/agentic-qa/run-contract-fixture.ts`、`tests/contracts/spec-agentic-qa.test.ts`をCase BのAgent-visible workspaceから除外する。runtime汎用scannerは作らず、latest `main`取り込み時のmaterial drift確認でexplicit denylistを再確認する。

### Risk 36: case baselineの親commitからrunner-owned patch / 除外前sourceを復元できる

対策: すべてのcase workspaceはsanitized Targetのtracked contentを`.git`なしで複製し、case固有runner state適用後にfresh Git repositoryを作る。Agent開始時HEADはparentなしroot commit 1件だけとし、remote / alternates / parentがないことをpreflightする。sanitized Targetのsynthetic commitをparentとして継承しない。

### Risk 37: canonical runが別revisionまたはdirty Evaluatorを評価してPASSする

対策: canonical completion runでは既存Trigger Evalと同じEvaluator source clean guardを使い、`.codex/runs/**`以外のsource changeを拒否する。`source_revision_git_sha == evaluator_git_sha`を必須とし、そのcommitのGit objectからsanitized Targetを生成する。historical revision評価はPR6の成功条件に含めない。Agent-visible TargetからPR6 evaluator / repository-contractの固定pathも除外する。

### Risk 38: Native device serialがtracked Run Artifactへ残る

対策: raw command / bounded outputは評価中だけ保持し、tracked resultへ保存する前にcaller serialを`<DEVICE_SERIAL>`へ置換する。既存Run Artifact sanitizerは引き続きabsolute path等のcompletion gateとして実行する。
