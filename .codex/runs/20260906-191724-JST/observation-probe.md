# Observation Probe 記録

## 実施条件

- 実施日: 2026-09-06 JST
- Evaluator: `<EVALUATOR_ROOT>`
- Routing Target: `<ROUTING_TARGET_ROOT>`（remote `main`から作成した独立clone）
- Codex: `codex-cli 0.153.0`
- 実行形式: `codex exec --json --ephemeral --sandbox read-only -C <ROUTING_TARGET_ROOT> -`
- 実行単位: positive / negativeを各1 fresh process、逐次実行
- trust: interactive Codexの通常project trustおよび6 hook trustを成立させた。runnerによるtrust変更、bypass、temporary `CODEX_HOME`は使用していない。

## 初回環境切り分け

trust成立前の初回positiveは、stdout上でSkill readらしき出力があったものの、TargetのHook JSONLが生成されず、Codex child processのGit操作に`dubious ownership`が発生した。この結果はProbe合格には採用しなかった。

通常のinteractive trust workflow後に同じTargetで再実行し、Hook loggerのappend deltaとGit cleanを確認した。これはobservation方式の緩和ではなく、Plan §3.3のenvironment prerequisiteを成立させる切り分けである。

## Positive control

入力はPlan指定どおり次のraw queryだけとした。

```text
$feature-plan を使って、この依頼の実装計画だけを作ってください。
```

確認結果:

- Codex stdout JSONLは`thread.started`、`turn.started`、tool events、`turn.completed`まで到達した。
- Hook logは実行前後snapshotの差分で1つのappend-only JSONL fileに一意に確定した。
- Hook JSONLの`PostToolUse` eventは`tool_name: "Bash"`、`tool_input_preview`はJSON文字列で、実際のread commandは次のshapeだった。

```json
{"command":"Get-Content -Raw .agents/skills/feature-plan/SKILL.md"}
```

- `feature-plan/SKILL.md`のcanonical actual read/openを1件検出した。
- `path mention`やsearch resultだけをactual readと数える根拠はなく、selector対象外とした。
- `truncated: false`を確認した。

## Negative control

入力はPlan指定どおり次のraw queryだけとした。

```text
package.json に記載されている package name だけを確認して答えてください。
```

確認結果:

- Codex stdout JSONLは`thread.started`、`turn.started`、`turn.completed`まで到達した。
- Hook logは実行前後snapshotの差分で1つのappend-only JSONL fileに一意に確定した。
- canonical 6 Skillの`SKILL.md` read commandは0件だった。
- `observed_skills = []`を確定できる条件（trusted terminal、hook correlation、JSON parse、selector成立、Skill read 0件）が成立した。

## Runnerへ引き継ぐselector契約

- 実行前後のTarget `.codex/logs` と `.artifacts/codex-hooks` のpath + byte sizeをsnapshotする。
- append deltaが正確に1つであることを確認し、before-size以降だけを読む。
- `event === "PostToolUse"`、`tool_name === "Bash"`、`truncated === false`、`tool_input_preview`のJSON parse成功、`command`がcanonical pathに対する`Get-Content -Raw .agents/skills/<canonical-skill>/SKILL.md`の実shapeに一致する場合だけactual Skill readとする。
- loose path regex、一般shell parser、query classifier、response本文判定は実装しない。
- Hook correlation / parse / selectorが成立しない場合はSkill read 0件にせず、Plan §7.2のordered decision pipelineに従い`unobservable`とする。

## Boundary SSOT照合

Plan指定の固定boundaryとparticipantsは次のとおりで、datasetはこのmapping以外を使用しない。

- `exploratory-qa-vs-android-native-local-validation`: `exploratory-qa` ↔ `android-native-local-validation`
- `code-review-vs-repair-loop`: `code-review` ↔ `repair-loop`
- `repair-loop-vs-harness-improvement`: `repair-loop` ↔ `harness-improvement`
- `feature-plan-vs-direct-implementation`: `feature-plan` ↔ `null`（canonical siblingなし）

## 判定

Probeは、通常trust成立後にpositive actual Skill readを検出し、negativeでcanonical Skill read 0件を確定できたためPASSとする。初回trust未成立試行は無効evidenceとして扱い、canonical baselineへ混入しない。
