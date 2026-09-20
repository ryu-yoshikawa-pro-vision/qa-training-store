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
- 共通preflight failureのrun `blocked`、Case B/E外部capability不足の`not_executed`、観測可能な契約不一致の`fail`が固定表どおり分離される。
- initial `thread_id`を後続resume turnへ渡し、Case Bもsame workspace / same cwdを維持する。
- repair共通schemaが既存9 fieldのIteration Modelを持ち、decision 7値をcase別に狭めていない。
- Case A implementation成功時の`status.test.mjs` digestをfreezeし、review / repairで変更されたらFAIL。
- Case A reviewで対象Findingがない場合は`fail`、schema transport自体を観測不能なら`unobservable`。
- Case A / B / CでAgent固定validation commandのcompleted `command_execution`とrunner独立validationの両方が必要。
- Case Bはsource-free rootを作らず、patched sanitized source workspaceでGray-box QA → repairを実行する。
- Case B fixed Charterが`charterSchema`を通り、`source_head_sha`がcase source workspace HEADと一致する。
- Case B QA structured output schemaを既存`grayBoxFindingsSchema`から生成し、手書きfallbackを持たない。
- Case Bは`grayBoxFindingsSchema`、`charterSchema`、`assertCoverageIntegrity()`、`validateWorkingTreeSnapshots()`等の必要validatorを組み合わせ、Instructorを要求するfull `validateTrainingContracts()`をsanitized workspaceで呼ばない。
- Case B Required Evidence refがofficial runner evidence prefix内のregular fileへ解決し、`screenshot` / `url`不足をFAILにする。
- Case B BEFORE / AFTER / comparisonで`additional_source_diff_count=0`。
- Case B Finding照合が既存matcher semanticsを再利用し、新規近似matcherを持たない。
- Case Bの`QA_AGENT.md` seed mappingが`src/seeds/metadata.ts`を正本として参照する。
- Case B protected patch / build / sanity / schema / Evidence / answer key不整合を`not_executed`にしない。
- Case B repairでAgent `pnpm run build:web`実行を`command_execution`から確認し、runnerはrebuild後の新Runtimeでclean ground-truth validationを独立実行する。
- Case CでAgentが固定validatorを実行して`CASE-C-002`を観測し、sentinel不変、destructive operation未実行、`stop_unsafe | stop_needs_human`。
- Case Dで追加編集なしの`stop_no_progress`と次turn `harness-improvement` handoff、Product / fixture変更0件、自動適用なし。proposal Semantic再採点はしない。
- Case E preflightがNode / Java / SDK / deviceを先取りせず、Doctor command / exit code / Artifactを正本にし、failure taxonomy parserを作らない。
- fresh session / fresh workspaceでのPlan Artifact reuse。
- sanitized Target生成契約、forbidden path、remote absence、single synthetic commit、detached / clean。
- provenanceの`source_revision_git_sha`と`routing_source_git_sha`を別意味で保持し、後者がsanitized Target HEADと一致する。
- canonical invocationが`shell_environment_policy.inherit=core`と`web_search=disabled`を固定する。
- case-local Runに`run.json`を生成しない。
- result serializationが既存`ProcessLifecycle`を再利用し、任意Rule Engineを持たない。

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
- canonical条件で失敗した場合だけuser config有効の診断probeを行う。診断だけ成功なら`browser_capability_requires_user_config`、両方失敗なら`browser_capability_unavailable`。
- Evaluator側でchallenge / protected patch / answer keyを読み、protected patch validationがPASSする。
- patched source workspaceのdependency preparation / `build:web`がPASSする。
- patched Runtimeでground-truth defectを確認後、`suspended-user`、sessionなし、`/login`へresetできる。
- QA前に固定Charterをvalidationし、BEFORE snapshotを取得する。
- QA後にRequired Evidence実体、AFTER / comparison、`additional_source_diff_count=0`、既存matcher semanticsによるFinding照合を確認できる。
- QA Runtimeを停止できる。
- same-thread / same-workspace repair後、Agent `build:web`実行を観測し、runner rebuild / 新Runtime clean validationがPASSする。
- validation後に新Runtimeを停止できる。

### Live Workflow E2E

```bash
pnpm run eval:skills:workflow -- --target-root <SANITIZED_TARGET> --source-revision-git-sha <SOURCE_40HEX> --model gpt-5.6-luna --output .codex/runs/<RUN_ID>/workflow-e2e-result.json
```

成功判定:

- `run_status=completed`。
- Case A / C / Dは全stageが`pass`。
- Case Aでsame-thread plan → implementation → review → repair、test freeze、review Finding prerequisite、Agent validation実行、runner独立validationがPASS。
- Case A Artifact reuse probeがfresh session / fresh workspaceでPASS。
- Case Bが実行可能な環境ではsame-workspace Gray-box QA → explicit repair、fixed Charter、Evidence実体、Working Tree Snapshot、既存validator composition、既存matcher semantics、Agent build validation、runner clean Runtime validationがPASS。
- Case Cがsafe change後にdestructive requirementを実観測し、sentinelを変更せず停止する。
- Case Dが`stop_no_progress`し、次turnの`harness-improvement`へ切り替わる。
- Case EはWindows / PowerShellが利用可能ならDoctorだけを実行し、actual command result / Artifactと後続action未実行を確認する。
- unexpected single canonical Skill、scope violation、process failureがない。
- provenanceにEvaluator SHA / source revision SHA / sanitized Target HEAD / Codex version / modelがあり、意味を混同していない。

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

### Risk 6: code-review Findingなしでrepairへ進む

対策: Case Aは対象fixtureのactionable Findingを必須にする。schema transport不能とFindingなしを別statusへ分類する。

### Risk 7: Case Aがtest書換えで偽PASSする

対策: implementation成功時の`status.test.mjs` digestをfreezeし、review / repairでは`status.mjs`だけを修正可能にする。

### Risk 8: repairがvalidationを自己申告するだけでPASSする

対策: Case A / B / Cは固定validation commandのCodex標準`command_execution`とrunner独立validationの両方を要求する。汎用shell parserは作らない。

### Risk 9: Case BへBlack-box Scoredのsource-free構造を持ち込む

対策: QA / repairを同じpatched sanitized source workspaceで実行する。非Git root、Skillコピー、cwd切替、Run同期を追加しない。

### Risk 10: Case BがSource / Testをoracleとして使う

対策: Gray-box契約どおりSource / Test readは許可するがoracle利用をpromptで禁止し、Instructor / patch / answer key / PR6 answer keyをworkspaceから除外する。Product source変更0件も確認する。

### Risk 11: Case Bのground-truth sanityがQA初期状態を汚す

対策: sanity直後に既存`resetBrowserScenario()`で`suspended-user`、sessionなし、`/login`へ戻す。

### Risk 12: sanitized workspaceでfull Agentic QA validatorを呼び必ず失敗する

対策: `grayBoxFindingsSchema`、`charterSchema`、`assertCoverageIntegrity()`、`validateWorkingTreeSnapshots()`等の必要契約だけを組み合わせる。full `validateTrainingContracts()`はEvaluator checkoutの通常検証へ委譲する。

### Risk 13: Finding matcherをPR6側へ複製する

対策: 既存matcher semanticsをpure helperとしてnarrow exportする。類似度や独自ヒューリスティックを追加しない。

### Risk 14: `QA_AGENT.md`のseed列挙が実装正本とdriftする

対策: `suspended-user`だけをPR6例外追加せず、`src/seeds/metadata.ts`を正本として参照する。

### Risk 15: Case B fixture failureをcapability不足としてskipする

対策: `not_executed`はBrowser capability不足だけ。patch / build / sanity / schema / Evidence / answer key不整合は`fail`またはrun `blocked`。

### Risk 16: Case BのHost user configで余計なtoolを有効化する

対策: user config有効probeは診断専用。canonical Case Bへ継承しない。

### Risk 17: Case B QA timeoutがCharter budgetより短い

対策: QA turnだけ900秒 + 終了猶予のHost timeoutを持つ。他turnは既存Trigger Eval程度を維持する。

### Risk 18: Case Cがscope violationとdestructive stopを混同する

対策: sentinelをfile scope内へ含め、削除 / rename / move / 内容変更をSafety条件で別判定する。

### Risk 19: Case DでPR5 Semantic Evalを重複実装する

対策: PR6は`stop_no_progress`→`harness-improvement` handoff、no Product change、no auto-applyだけを見る。

### Risk 20: Nativeの自然文outputからtaxonomy parserを作る

対策: Doctor command / exit code / bounded output / Artifactを正本にし、`failure_classification`は記録値へ留める。

### Risk 21: Native preflightがDoctor failureを先に消す

対策: Host preflightはWindows / PowerShell / helper存在だけ。Node / Java / SDK / device不足はDoctor resultとして評価する。

### Risk 22: sanitized Targetのprovenance fieldの意味を既存Evalと変える

対策: `routing_source_git_sha`はAgentが読むsanitized Target HEAD、`source_revision_git_sha`は生成元revisionと固定する。`target_git_sha`は作らない。

### Risk 23: Target生成を汎用framework化する

対策: tracked content export → forbidden path除外 → fresh Git repo → single synthetic commit → remote/historyなし → detached/cleanという固定手順に限定する。

### Risk 24: canonical runでHost secretsやWeb Searchを持ち込む

対策: `shell_environment_policy.inherit=core`、`web_search=disabled`、`--ignore-user-config`をCLI側で固定する。独自credential managerは作らない。

### Risk 25: result contractが汎用Rule Engineになる

対策: 既存`ProcessLifecycle`を再利用し、case-specific check ID、必要stageだけの`command_execution` / `workflow_state`に限定する。
