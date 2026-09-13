# Environment Qualification Probe 記録

## 実施条件

- 実施日: 2026-09-08 JST
- OS: Microsoft Windows 10 Home 10.0.19045 / 64-bit
- Evaluator: `<EVALUATOR_ROOT>`
- Routing Target: `<ROUTING_TARGET_ROOT>`（Evaluatorとは別directory、別Git common-dir、alternatesなし）
- Routing source SHA: `d24b23b6a8de95ab281c75cff400081bf3b3d9b2`
- Evaluator source SHA: `67e0c54cfd0b52f6d5e028ab1281f5ce5a71849c`
- Codex: `codex-cli 0.153.4`
- Dataset fingerprint: `84456cef0270fe58a41a9df3bcb3a00a33c52566189072c16050ed02d3f66161`
- 実行形式: `codex exec --json --ephemeral --sandbox read-only -C <ROUTING_TARGET_ROOT> -`
- Target: detached、clean、6 canonical `SKILL.md` readable、Trigger Eval datasetなし
- trust/hook: Targetの`.codex/config.toml`で`[features] hooks = true`、ProbeでHook append delta/correlation/parseを確認。trust bypassは使用していない。
- 他Codex process: `<ROUTING_TARGET_ROOT>`をcommand lineに含むCodex processなし。

## Negative control

入力:

```text
package.json に記載されている package name だけを確認して答えてください。
```

- raw evidence: `.artifacts/qualification-20260908/negative/summary.json`
- selector analysis: `.artifacts/qualification-20260908/negative/analysis.json`
- spawn requested: `2026-09-08 01:18:10.243 JST`
- first stdout / JSON: `01:18:11.303 JST`
- `turn.started`: `01:18:11.390 JST`
- first canonical Skill read: なし
- terminal: `01:19:09.338 JST`、`turn.completed`
- process exit: `01:19:11.050 JST`、code 0
- process close: `01:19:11.061 JST`、code 0
- terminal duration: `59.1266秒`
- Hook: changed path 1、correlation PASS、parse PASS、`PostToolUse` 1件
- runner selector: `observed_skills=[]`
- 判定: PASS

## Positive control

入力:

```text
$feature-plan を使って、この依頼の実装計画だけを作ってください。
```

- raw evidence: `.artifacts/qualification-20260908/positive/summary.json`
- selector analysis: `.artifacts/qualification-20260908/positive/analysis.json`
- spawn requested: `2026-09-08 01:21:40.639 JST`
- first stdout / JSON: `01:21:41.542 JST`
- `turn.started`: `01:21:41.601 JST`
- first actual `feature-plan/SKILL.md` read: `01:23:53.879 JST`
- actual command: `Get-Content -LiteralPath '.agents\\skills\\feature-plan\\SKILL.md' -Raw`
- terminal: `2026-09-08 01:27:48.326 JST`、`turn.completed`
- process exit: `01:27:48.622 JST`、code 0
- process close: `01:27:48.633 JST`、code 0
- terminal duration: `367.7009秒`
- Hook: changed path 1、correlation PASS、parse PASS、`PostToolUse` 52件
- runner selector: `observed_skills=[]`（actual readは確認できたが、現行4 accepted shapesには一致しない）
- 判定: FAIL（Gate閾値`240秒`超過、かつselector観測不成立）

## Gate判定

- version固定: PASS（negative/positiveとも`codex-cli 0.153.4`）
- Target固定/dedicated/clean: PASS
- trust/hook: PASS（Hook correlation/parse）
- negative control: PASS
- positive terminal `<=240秒`: FAIL（`367.7009秒`）
- positive selector observation: FAIL（actual command shapeは現行selector対象外）
- Environment Qualification: **FAIL**
- canonical `all`: **未実行**

## Decision

Gate FAILのためcanonicalを開始しない。source/dataset/selector/timeoutは変更せず、追加Probe、case retry、unobservable retry、timeout変更、別canonical runも行わない。現行HostではPR2のcanonical開始前提（240秒以内のpositive実行とselector observation）を満たさない正式blockerとしてRunとPRへ記録する。
