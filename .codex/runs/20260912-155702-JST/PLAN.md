# Plan

## Objective

- 前回Runで実装したOTel diagnostic保存を変更せず、`pnpm run verify`の再確認後、開始条件を満たした場合だけunknown Skill対象3ケースを各1回診断し、`skill_values`、`status_values`、`invoke_types`、`plugin_ids`の実値を取得する。

## Scope

- In: 開始状態確認、前回Run照合、strict Run Artifact、`pnpm run verify`、fresh Routing Target、既存datasetからの3ケース単一診断、OTel／process evidence、Run／evaluation／PR／CI記録。
- Out: source、test、Skill、dataset、query、timeout、schema、routing／Hook判定、canonical `all`、Qualification、8/8、valid baseline、alias、merge conflict解消、rebase、force push、PR merge。

## Assumptions

- source implementation SHAは `a8f3b7118e304a18c185a475f2d2cdeae97d4799` に固定されている。
- Routing SHAは `55cb43abb06fa96dd3f283d7ae4a20b6076af5f5` に固定する。
- 診断対象は `exploratory-qa-train-001`、`android-native-local-validation-train-002`、`android-native-local-validation-validation-002` の3件だけである。
- raw evidenceは新規 `.artifacts/trigger-eval-unknown-skill-diagnostic-<run timestamp>/` に保存し、Run Artifactへは必要な要約と相対pathだけを記録する。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。
- 仮定してよい細部: 既存runner／OTel observer helperを読み取り、単一case指定がなければGit管理外の診断scriptを固定して使用する。
- 未回答の重要質問: なし。

## Hypotheses

- H1: 前回停止原因のNative timeoutが再発しなければ、sourceを変更せず3ケースのOTel実値を取得できる。
- H2: unknown Skillの判定原因は、今回保存する実値と `invoke_types`／`plugin_ids`の組み合わせで説明できる可能性がある。

## Research Plan

- Round 1 Query: branch／PR／前回Run／source SHA／変更差分を確認し、`pnpm run verify`を1回実行してruntime開始条件を判定する。
- Round 2 Query: 許可条件のときだけRouting SHAのfresh Target、Codex version、dataset、診断scriptを固定し、対象3ケースを順番に各1回実行する。
- Exit Criteria:
  - verify停止条件または3ケースの診断結果がRun Artifactに記録される。
  - runtime診断を実行した場合、3ケース終了後に停止し、追加のqualification／baseline判定を行わない。

## Approach

1. 新規Runを作成し、開始状態とsource clean条件を記録する。
2. `pnpm run verify`を現在のsourceのまま1回実行する。Native timeoutまたはその他の新規failureなら単独証拠だけを取り、runtimeへ進まない。
3. PASSまたは既知Windows Hook launcher timeout 2件だけの場合に限り、diagnostic evaluator snapshot SHA、fresh Target、canonical Skill、Codex version、dataset query、固定scriptを検証する。
4. 対象3ケースをWindowsの既存実行条件で各1回診断し、raw process／OTel evidenceを新規artifactへ保存する。
5. 実値をRun／evaluation／PRへ反映し、sanitizer／schema／format／lint／diff／collectorを検証してnon-force push、CI状態確認を行う。

## Definition of Done

- `pnpm run verify`の分岐と停止／継続判断がRun Artifactに記録されている。
- 継続時は対象3ケースが各1回だけ実行され、指定OTel／process evidenceと実値がraw artifactから確認できる。
- source／test／dataset／query／timeout／schema／routingは不変で、canonical／Qualification／valid baseline／mergeは未実行・未取得のままである。
- Run Artifact、evaluation、PR本文、push、CI最終状態が同期され、local絶対pathやraw telemetryがtracked artifactへ混入していない。

## Risks / Unknowns

- `pnpm run verify`で前回と同じNative timeoutまたは新しいfailureが出た場合、runtime診断を開始しない。
- 対象caseのprocess timeoutはcase固有結果として保存するが、receiver bind／spawn／script／Target／versionの共通failureは即時停止する。
- 一度実行したcaseはretryしない。推測で実値を補完しない。

## Thinking Log

- 2026-09-12 15:57 JST: 前回Runは `8781a2fe...` で完了し、source implementation SHAは `a8f3b711...`。今回は新規Runを作り、前回Runへ追記しない。
- 2026-09-12 15:57 JST: `pnpm run verify`の結果をruntime開始条件の唯一の分岐にし、Native timeoutや新規failureをPASSへ読み替えない。
- 2026-09-12 16:14 JST: fresh Target preflightはPASSしたが、Git管理外の固定diagnostic scriptがCJS実行条件でtop-level `await`変換失敗した。ユーザー指定の共通診断基盤failureとしてscriptを修正せず、case未実行で停止する。
