# Plan（PR #127 OTel collection window最終固定Run）

## Objective

- 保存済みExplicit / Implicit / Negative raw probeを直接再解析し、OTel collection windowのprocess close基準、quiet period、hard cap、completion条件、timeout/failure semanticsを正本Planへ固定する。

## Scope

- In:
  - `docs/plans/2026-09-11_092746_trigger-eval-otel-observation-contract.md`
  - 今回のStrict Run Artifact（`PLAN.md`、`TASKS.md`、`REPORT.md`、`evaluation.json`、machine-managed `run.json`）
  - PR #127本文の必要最小限の追記
- Out:
  - `scripts/**`、`tests/**`、`docs/adr/**`、`docs/PROJECT_CONTEXT.md`、`docs/history/**`
  - `.codex/hooks/**`、`.codex/config.toml`、`package.json`、`pnpm-lock.yaml`
  - dataset、query、Skill、AGENTS、Result schema
  - 既存Run、raw probe artifact、probe再実行、Qualification、canonical、baseline、retry、query tuning、rebase、merge、force push

## Assumptions

- `meta.json.finished_at`はprobe wrapperが取得したchild `close`後の時刻であり、`exit_code` / `signal`と組み合わせてrunner-availableなprocess close signalとする。
- `stdout.jsonl`の`turn.completed`はterminal typeの根拠にするが、timestamp fieldがないためcollection起算点にはしない。
- Explicit / Negativeのcompleted evidenceをquiet値の主根拠とし、Implicitはtimeout probeとして正常flush遅延の根拠にしない。
- 既存Result schema 2、OTel primary、Hook非scoring、liveness control、observer-common、`scoreInitialRouting`、`127.0.0.1:0`の既存契約は維持する。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。今回の値・scope・completion条件はユーザー指示とraw evidenceで確定できる。
- 仮定してよい細部: Run Artifactの診断値はraw absolute timestampをResultへ追加せず、Runではprocess closeからの相対msを優先する。
- 未回答の重要質問: なし。

## Hypotheses

- H1: Completed probeでfinal requestがprocess close前（Explicit -44ms、Negative -53ms）であるため、close起算1,000ms quietは実測近接に対して十分なbounded余裕を持つ。
- H2: quietの5倍である5,000ms hard capならrequest resetを許しつつ、断続的exportによる無期限待機とNegative trusted absenceの誤成立を防げる。
- H3: `turn.completed` timestamp欠落をchild `close`へ固定し、close前requestをquiet起算へ再利用しないことで、runner実装者の判断差をなくせる。

## Research Plan

- Round 1 Query: active Run、正本Plan、PR/branch状態、既存runを確認する。
- Round 2 Query: 各raw caseのmeta、stdout JSONL、receiver event、全request bodyを直接parseし、process lifecycle、request時系列、metric summary、body SHA一致を確認する。
- Round 3 Query: Plan内のbounded / quiet / hard cap / late request / timeout表現を検索し、completion algorithm、failure mapping、test、24 cases影響に矛盾がないことを確認する。
- Exit Criteria:
  - Explicit / Negativeのchild closeと最終request差分が計算されている
  - Implicitを正常shutdown根拠から分離している
  - quiet / hard capの具体値、起算点、reset、hard-cap failure、timeout/spawn/bindがPlanに固定されている
  - Plan-only validation、sanitizer、evaluation、strict collector、scope確認がPASSする

## Approach

- rawを再実行せず、保存済みartifactのJSONL/bodyをNode built-in parserでread-only解析する。
- 得られた事実を根拠にPlanだけを最小差分で修正する。
- Run Artifactへ意味のある判断・validationを日本語で記録し、machine-managed `run.json`はcollector経由で更新する。
- PR本文へPlanの値と実装未着手だけを追記し、branch safety確認後にcommit/non-force pushする。

## Definition of Done

- 正本Planにraw timing table、`OTEL_COLLECTION_QUIET_MS = 1,000`、`OTEL_COLLECTION_HARD_CAP_MS = 5,000`、completion algorithm、failure/lifecycle semantics、diagnostic values、tests、24 cases影響がある。
- source/tests/ADR/config/dataset/Skill/既存Run/raw artifactに差分がない。
- Markdown lint、対象Prettier、`git diff --check`、evaluation schema、sanitizer Write/Check、strict collectorがPASSする。
- commit、確認済みbranchへのexplicit non-force push、PR head/local/remote一致、PR OPENを確認する。

## Risks / Unknowns

- `turn.completed`を時刻基準にするとtimestamp欠落を実装者が補完するリスクがあるため、child `close`を唯一のcollection起算点とする。
- quiet完了後のrequestはreceiver close後に観測できないため、将来request不存在を保証せず、観測期間をprocess closeからquiet完了までに限定する。
- hard cap到達をsuccess扱いするとNegative absenceが誤成立するため、`collection_timeout`相当でunobservableへfail-closeする。
- PRはmainとconflictingの可能性があるが、rebase/mergeは今回のscope外である。

## Thinking Log

- 2026-09-11 JST: Explicitは4 request（最終 `00:07:03.198Z`）、child close `00:07:03.242Z`、差分 -44ms。Negativeは1 request（最終 `00:23:31.524Z`）、child close `00:23:31.577Z`、差分 -53ms。両方ともprocess close後requestは0件。
- 2026-09-11 JST: `stdout.jsonl`のExplicit line 70 / Negative line 12に`turn.completed`はあるがtimestampはなく、Implicitはterminal `turn.completed`なし・exit 1。Implicitの約60秒周期requestは正常flush根拠から除外した。
- 2026-09-11 JST: quiet 1,000ms（最大近接53msに対して947ms余裕）、hard cap 5,000ms（quietの5倍）を採用。24 casesの単純待機上限はquiet 24秒、hard cap異常時120秒。
