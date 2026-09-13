# Plan

## Objective

- 現行PR2 source/dataset/selector/timeoutを変更せず、canonical `all`開始前のEnvironment Qualificationを実施する。
- Gate通過時だけfresh canonicalを最初から1回実行し、8/8 boundary-side observableならvalid baseline、未達なら正式blockerとして保存・報告する。

## Scope

- In:
  - branch/PR/latest main/Target/Evaluator provenance、Codex version、process、trust/hook、Probe、validationの確認。
  - negative/positive Probe各1回、positive terminal duration `<=240秒`のGate判定。
  - Gate通過時のcanonical `all` 1回、Run Artifact/evaluation/PR本文/commit/push。
- Out:
  - query、expected_skill、boundary、case ID、Skill description、AGENTS routing意味、selector、timeout、scoringの変更。
  - case retry、unobservable retry、parallel runner、adaptive timeout、Host framework、新規clone manager。

## Assumptions

- 既存Target `<USER_HOME>/Documents\qa-training-store-pr2-trigger-routing-target-20260906`を再利用する。
- `origin/main=d24b23b6a8de95ab281c75cff400081bf3b3d9b2`の追加差分はfeature-plan検証scriptのみで、routing/observation影響なしと確認済みである。
- 現行固定値はCodex `0.153.4`、timeout `327_000ms`、dataset fingerprint `84456cef0270fe58a41a9df3bcb3a00a33c52566189072c16050ed02d3f66161`である。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。Gate閾値、Probe query、canonical条件、停止条件が明示されている。
- 仮定してよい細部: Probe生ログは`.artifacts/`、Runには要約と相対参照を保存する。
- 未回答の重要質問: なし。

## Hypotheses

- H1: latest main差分はrouting/observationへ影響せず、既存Targetをlatest SHAへ更新して継続できる。
- H2: negative Probeはterminal完了・Skill read 0・hook correlation/parse PASSになる。
- H3: positive Probeはfeature-plan readを検出し、terminal duration `<=240秒`を満たす、またはGate FAILとなる。
- H4: Gate PASS時のcanonical結果は全24 case完了し、8/8 side観測可否を明確に判定できる。

## Research Plan

- Round 1 Query: branch/PR/latest main差分、既存Plan/Run、Evaluator/Target、process/trust/hook条件を確認する。
- Round 2 Query: version固定下でnegative/positive Probeを各1回実行し、Gate判定に必要なduration/selector/correlationを確認する。
- Round 3 Query: Gate PASS時のみcanonical `all`を1回実行し、結果・provenance・coverageを判定する。
- Exit Criteria:
  - latest main影響、Target専用性、trust/hook、process、version、Probeの支持/反証根拠がある。
  - Gate FAILならcanonical未実行を記録し、Gate PASSなら一回限りのcanonical結果を記録する。
  - valid/invalidまたは正式blockerの次アクションをRun/PRへ記録する。

## Approach

- どう進めるか:
  1. Plan/TASKSを確定し、指定branch/PR/latest main/旧invalid artifactを固定する。
  2. routing影響なしを確認後、既存Targetをlatest routing SHAへdetached checkoutする。
  3. 他Codex process/session、trust/hook、Target clean/dedicated/answer-key-freeを確認する。
  4. `codex-cli 0.153.4`をProbe前後で確認し、negative→positiveを各1回だけ実行する。
  5. positive `<=240秒`を含む全Gate条件を判定し、FAILならcanonicalを開始しない。
  6. PASS時のみbackground方式でcanonical `all`を1回実行し、全24 case終了後にcoverageを判定する。
  7. validation、sanitizer、evaluation、PR本文、commit/pushを完了する。
- 標準フロー: `PLAN -> repo mapping -> TASKS -> Environment Qualification -> conditional canonical -> validation -> REPORT/PR`

## Definition of Done

- `codex-cli 0.153.4`、Target、routing source、dataset fingerprint、trust/hook、process条件を記録する。
- negative/positive Probeのterminal・hook・selector evidenceとdurationを記録する。
- Gate FAILならcanonical `executed: no`、正式blocker、PR本文更新、Run commit/pushまで完了する。
- Gate PASSならcanonical 24/24、8/8判定、provenance、evaluation、sanitizer、PR本文、commit/pushまで完了する。
- 旧invalid artifactを変更・昇格せず、source/dataset/selector/timeoutを固定する。

## Risks / Unknowns

- positive Probeが`240秒`を超える場合は、canonicalを開始せずHost execution latency blockerとして停止する。
- latest main差分にrouting/observation影響が見つかった場合は、Target更新後のProbe/validation再確認までcanonicalを禁止する。
- canonicalが外部sessionで中断した場合はpartial結果を採用せず、ユーザー指定の停止条件を適用する。

## Thinking Log

- 2026-09-08 00:46 JST: `origin/main`は前回の`856a14e`から`d24b23b`へ進んだが、差分はfeature-plan検証scriptのみでrouting/observation影響なしと判定した。
- 2026-09-08 00:46 JST: 前回Runのfresh resultはinvalid evidenceとして保持し、今回Runへ結果を混在させない。
- 2026-09-08 01:28 JST: negativeは59.1266秒でPASSしたが、positiveは367.7009秒で240秒Gateを超過し、actual read shapeも現行selector対象外だった。Gate FAILとしてcanonicalを開始しない。
