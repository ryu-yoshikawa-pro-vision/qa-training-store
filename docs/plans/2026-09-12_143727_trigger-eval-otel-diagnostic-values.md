# Trigger Eval OTel diagnostic実値保存・3ケース診断計画

## Goal

PR #127の`unknown_skill`原因を特定するため、OTel `codex.skill.injected`の解析済み`skill`／`status`実値を診断情報へ安全に保存し、前回artifactで正確に特定した3ケースを各1回だけ診断実行する。

## Current understanding

- 対象branchは`refactor/117-pr2-trigger-eval-baseline`で、開始時HEADは`0cc881bb0ab66ef87e32e01bea4e3c4b87be0772`、worktreeはclean、PR #127はOPEN／base `main`／mergeable `CONFLICTING`である。
- 前回canonical OTel diagnosticの`unknown_skill`対象は、`exploratory-qa-train-001`、`android-native-local-validation-train-002`、`android-native-local-validation-validation-002`である。いずれも`skill_point_count=1`かつ`reliable=false`で、前回保存値には`skill`／`status`実値がない。
- `scripts/evals/otel-skill-observer.ts`は`parseMetric()`で文字列の`skill`／`status`を`OtelSkillPoint`へ解析済みであり、`uniqueSorted()`も既存である。現在のdiagnosticは`metric_names`、`invoke_types`、`plugin_ids`だけを保存している。
- routing判定はobserverの`reliable`、`initial_skill`、`observed_skills`とevaluatorのResult schema 2が所有し、診断項目はrouting identityへ使わない契約である。

## Assumptions

- `skill_values`と`status_values`は、malformed pointを除く`parseMetric()`成功済み`OtelSkillPoint`だけから作る。
- 値は`uniqueSorted()`で重複除去・昇順化し、raw OTLP payloadや未使用attributeは保存しない。
- 個別診断は既存runnerのOTel observer／evaluator helperとWindows shell quote契約を再利用し、診断用script・raw stdout/stderrはGit管理外`.artifacts`へ置く。
- timeoutを変更せず、各ケースは同じfresh Targetで1回だけ実行する。

## Non-goals

- `unknown_skill`、`skill_metric_invalid`、`multiple_skills`、`reliable`、`initial_skill`、`observed_skills`、Result schema 2の判定変更。
- canonical all、Negative／Positive Qualification、valid baseline再判定、Skill alias／Skill／query／dataset／timeout／scoring変更。
- merge conflict解消、PR merge、diagnostic結果を見た追加source修正。

## Impacted areas

- `scripts/evals/otel-skill-observer.ts`: diagnostic型と生成値のみを追加する。
- `tests/repository-contract/otel-skill-observer.test.ts`: canonical／unknown／status error／重複／複数値と非変更routing契約を検証する。
- `.codex/runs/20260912-143452-JST/`: strict Run Artifact、evaluation、診断結果、検証記録。
- `.artifacts/trigger-eval-diagnostic-20260912-03/`: Git管理外の対象3ケースのraw／redacted runtime evidence。

## Files to inspect

- `scripts/evals/otel-skill-observer.ts`
- `tests/repository-contract/otel-skill-observer.test.ts`
- `scripts/evals/run-skill-trigger-evals.ts`
- `scripts/evals/skill-trigger-evals.ts`
- `.agents/skills/*/evals/trigger/{train,validation}.yaml`
- 前回Run `.codex/runs/20260912-110511-JST/` とcanonical `.artifacts/trigger-eval-qualification-20260912-02/`
- `docs/adr/0023-trigger-eval-selector-and-query-execution-contract.md`
- `docs/adr/0024-trigger-eval-otel-observation-contract.md`

## Change strategy

1. 本Runとrepository planを保存し、前回artifactとdatasetから対象case IDを固定する。
2. observerのdiagnosticへ`skill_values`／`status_values`を追加し、routing分岐へ触れず、回帰テストを追加する。
3. focused tests、repository contract、format、lint、typecheck、Skill／dataset validation、`git diff --check`、`pnpm run verify`を指定順で実施する。今回差分の新規failureがあれば診断実行を停止する。
4. source/testのみをcommitし、commit SHAをEvaluator source SHAとして固定する。
5. Routing SHA `55cb43abb06fa96dd3f283d7ae4a20b6076af5f5`からfresh detached Targetを作り、clean／non-shallow／Git分離／alternatesなし／6 Skill readable／dataset不存在を確認する。
6. 固定queryを変更せず、対象3ケースを各1回だけ実行し、case lifecycle、unobservable、診断値、routing fieldsをredacted summaryへ保存する。3ケース取得後に停止する。
7. Run Artifact、PR #127本文、evaluation、sanitizerを更新し、branch一致を再確認してnon-force pushする。CI状態は最終確認するが、merge／conflict解消は行わない。

## Validation plan

- focused: `pnpm exec vitest run tests/repository-contract/otel-skill-observer.test.ts --no-file-parallelism --maxWorkers=1`
- repository contract: `pnpm run test:repository`
- format: `pnpm run format:check`（既存scriptを確認して実行）
- lint / typecheck: `pnpm run lint`, `pnpm run typecheck`
- Skill validation: `pnpm run validate:skills`
- Trigger Eval dataset validation: `pnpm run eval:skills:trigger:validate`
- diff: `git diff --check`
- full gate: `pnpm run verify`
- Run Artifact: evaluation schema、strict collector、sanitizer Write／Check、branch／remote／PR parity
- runtime: fixed Evaluator SHAとRouting SHA、Target preflight、3 case各1回、raw evidenceとredacted summaryの件数整合

## Definition of Done

- source/test commit後の固定Evaluator SHAでTarget preflightが全条件PASSする。
- 3ケースが各1回のみ実行され、各summaryに`case_id`、`process_lifecycle`、`unobservable_reason`、`skill_values`、`status_values`、`invoke_types`、`plugin_ids`、`initial_skill`、`observed_skills`がある。
- routing判定とResult schema 2に差分がない。
- 指定validationの結果、既知Windows Hook launcher timeout以外の今回差分failureがない。新規failureならruntime未実行・Runをblockedとして記録する。
- Run ArtifactとPR本文が日本語で更新され、sanitizer PASS、non-force push、CI最終状態確認が完了する。

## Risks

- `pnpm run verify`が既知timeout以外で失敗する可能性がある。最初の異常を分類し、新規failureなら診断を開始しない。
- 対象caseがtimeoutしてもretryしない。3ケースそれぞれの実行回数をartifactで確認し、追加実行は次Runへ送る。
- 実値はSkill／status文字列だけに限定し、query、環境、credential、absolute path、raw payloadをdiagnostic／Run Artifactへ転記しない。
- PR/CI状態は外部状態として変化し得るため、push前後にbranch・head・worktree・checksを再確認する。

## Open questions

- なし。対象case ID、Routing SHA、禁止事項、完了条件、保存項目はユーザー指示と既存artifactで確定している。

## Follow-up notes

- 3ケースの実値を取得した時点で本Runを終了し、実値を根拠にsource追加修正やqualification再実行を同一Runで行わない。
