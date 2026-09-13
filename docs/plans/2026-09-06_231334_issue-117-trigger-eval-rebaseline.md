# PR #127 Trigger Eval timeout前提再検証・baseline再取得計画

## 0. 依頼概要

- 依頼内容: current Codex Hostのpositive control実時間を120秒timeoutなしで1回測定し、PR2のtimeout前提を再評価する。必要な場合だけ正本PlanとEvaluatorの固定timeoutを最小修正し、valid canonical `all` baselineまで取得する。
- 背景: 前回のdiagnosticではrunner lifecycle defectではなく、120秒以内にterminal eventへ到達しないHost execution latency（Case B）を確認した。120秒がPR2の目的に由来する要件ではないため、運用timeoutとして妥当性を再検証する。
- 期待成果: terminal duration、selected timeout、margin、rationaleをRun Artifactと正本Planへ保存し、validation後にcanonical `all`を最初から1回だけ実行する。

## 1. ゴール / 完了条件

- ゴール: routing/scoring contractを変更せず、現行Hostの通常executionを途中切断しない固定timeoutでTrigger Eval baselineを再取得する。
- 完了条件（DoD）:
  - [ ] 前回の未push調査記録をsanitization・scope確認後にcommit/pushする。
  - [ ] positive controlを診断用外側safety limit付きで1回実行し、spawn、first stdout、turn.started、first Skill read、terminal、exit、closeを記録する。
  - [ ] 120秒が通常Host executionを途中切断する値であることを、今回のterminal durationで確認する。
  - [ ] selected timeoutを一度決定し、marginとrationaleを正本Plan/Run Artifactへ記録する。外側safety limitをEvaluator timeoutへ流用しない。
  - [ ] 正本Planへtimeout値、変更理由、measurement、hang検出契約、unobservable、retry禁止を追記する。
  - [ ] `CASE_TIMEOUT_MS`だけを必要最小限変更し、routing/scoring、selector、hook correlation、process lifecycle、datasetを変更しない。
  - [ ] 指定validationとObservation ProbeをPASSしたsource implementation commitを作成する。
  - [ ] latest `main`/routing sourceをcanonical直前に再確認し、必要ならProbe/validationを再実行する。
  - [ ] canonical `all`を最初から1回実行し、8 boundary-side全てがobservableであるvalid baselineを取得する。
  - [ ] baseline/Run Artifactをsanitizationしてcommit/pushし、PR #127のheadを確認する。

## 2. 現状理解と前提

- Current understanding:
  - 現在のEvaluatorは`CASE_TIMEOUT_MS = 120_000`で、terminal eventをclose後に確定するが、前回diagnosticではpositive controlが120秒以前にterminalへ到達せず、timeout時点で`codex.exe`が稼働していた。
  - 前回のaccepted manual Probeはpositive/negativeともtrusted terminalへ到達し、positiveのHook activity spanは約4分05秒だった。ただしterminalの正確なstdout受信時刻は今回の測定で確定する。
  - canonical baselineは24 case全件timeoutで、valid baselineとしては採用していない。canonical `all`の再実行は今回の測定・修正・validationが完了するまで行わない。
  - 未pushの前回調査記録は破棄せず、今回のcommitへ含める。
- Assumptions:
  - 同じ独立Routing Target、通常trust/hook state、同じCodex version、同じrunner launch shapeを使う。
  - diagnostic outer safety limitは600秒（10分）とする。これは一回限りのdiagnostic process safetyであり、Evaluatorのcase timeoutやcanonical runの新timeoutではない。前回観測した約4分05秒のHook activityを収容しつつ、無制限hangを避けるためである。
  - timeout marginはmeasurement後に`max(60秒, terminal durationの25%)`とし、selected timeoutは`terminal duration + margin`を秒単位へ切り上げた固定値とする。測定値、margin、最終値を実測後に記録し、以後は固定値として扱う。
- Non-goals:
  - canonical dataset、case retry、unobservable-only retry、positive queryの複数回実行。
  - query、dataset、Skill description、`AGENTS.md`、routing/scoring contract、selector、hook correlationの変更。
  - adaptive timeout、statistical framework、retry framework、process manager、Host runtimeの再実装。
  - 外側safety limitをcanonical evaluator timeoutとして採用すること。

## 3. 質問 / 曖昧性

- 必ず質問する不透明点: なし。測定control、single execution、safety limit、変更対象、validation、canonical実行順序が指定されている。
- 仮定してよい細部: `max(60秒, 25%)`のmargin規則は、一回の実測に対して余裕を持たせつつ固定timeoutを小さく保つための診断後決定規則とする。最終値は測定後にのみ確定する。
- 未回答の重要質問: なし。

## 4. 影響範囲

- Impacted areas:
  - 読み取り: 正本Plan、前回Run、`run-skill-trigger-evals.ts`、Observation Probe、Target/trust/hook状態。
  - 条件付き変更: 正本Planのtimeout前提、`CASE_TIMEOUT_MS`、active Run Artifact。
  - 保存: source commit、canonical baseline、Run Artifact、PR branch。
- Files to inspect:
  - `docs/plans/2026-09-06_125922_issue-117-pr2-trigger-eval-baseline.md`
  - `scripts/evals/run-skill-trigger-evals.ts`
  - `.codex/runs/20260906-191724-JST/observation-probe.md`
  - `.codex/runs/20260906-191724-JST/REPORT.md`
  - `.codex/runs/20260906-191724-JST/TASKS.md`
  - `.codex/runs/20260906-191724-JST/trigger-eval-baseline.json`

## 5. 変更方針

- Change strategy:
  1. 未push記録、branch、PR、source scope、現在のtimeoutを確認する。
  2. positive controlをrunner launch shapeで1回だけ起動し、600秒外側safety limitでterminalまで観測する。terminal到達後はexit/closeも取得する。
  3. measurement結果から120秒の妥当性を判定し、正本Planへ根拠を追記する。
  4. 必要な場合だけ`CASE_TIMEOUT_MS`をselected fixed timeoutへ変更する。
  5. deterministic/repository/Skill/full validationとmanual Observation Probeを実行する。
  6. source implementationをcommitし、evaluator SHAを確定する。
  7. latest `main`とrouting sourceを再確認し、canonical `all`を最初から1回実行する。
  8. 8-side coverage、provenance、sanitization、scopeを確認し、baseline/Run Artifactをcommit/pushする。
- 実行タスク:
  - [ ] 1. 未push調査記録を確認し、sanitization/scope/commit準備をする。
  - [ ] 2. positive controlのterminal-duration measurementを1回実施する。
  - [ ] 3. timeout前提を判定し、正本PlanとRunへ記録する。
  - [ ] 4. 必要な場合だけ`CASE_TIMEOUT_MS`を最小修正する。
  - [ ] 5. 指定validationとObservation Probeを実行する。
  - [ ] 6. source/evaluator commitとSHAを確定する。
  - [ ] 7. latest main/routing sourceを再確認する。
  - [ ] 8. canonical `all`を1回実行しvalidityを判定する。
  - [ ] 9. baseline/Run Artifactをsanitization、commit、pushしPRを確認する。

## 6. 検証方法

- Validation plan:
  - diagnostic: raw positive queryをHostへ渡し、stdout JSONLをincremental観測する。outer safety limit到達時は全runを無効化し、terminal duration未確定として扱う。
  - source: `pnpm run eval:skills:trigger:validate`、`pnpm run test:repository`、`pnpm run validate:skills`、`pnpm run verify`、manual Observation Probe。
  - canonical: `all`を最初から一回だけ実行し、8 boundary-sideのobservable coverage、outcome、provenanceを確認する。
- 成功判定:
  - terminal durationがfiniteに確定し、selected timeoutがその値より後ろである。
  - source validationとProbeがPASSする。
  - canonical `all`で8 side全てに最低1 observable caseがあり、baselineがvalidである。

## 7. リスクと未解決論点

- Risks:
  - positive controlが600秒でもterminalへ到達しない場合、timeout値を推測で変更せず、Host/environment blockerとして停止する。
  - Host executionが測定ごとに大きく変動しても、retryや統計処理を追加せず、今回の一回の測定契約に従う。
  - Plan/Evaluator修正後にrouting/observation関連のmain変更が入っていた場合、canonical run前にProbe/validationをやり直す。
  - canonicalでEvaluator/environment defectが判明した場合は、無効化理由をRunへ記録し、source修正後に最初から一回だけやり直す。
- Open questions:
  - terminal duration、first Skill read時刻、selected timeout、8-side coverageは測定・canonical実行後に確定する。

## 8. 成果物

- 変更ファイル:
  - 条件付き: 正本Plan、`scripts/evals/run-skill-trigger-evals.ts`、active Run Artifact、canonical result。
- 付随ドキュメント:
  - 本計画、前回調査記録、measurement summary、source/baseline commit。

## 9. 備考

- timeoutはrouting性能指標ではなく、finite hang検出のためのEvaluator運用値として扱う。
- timeout時のordered observation/scoring contract（unobservable、`[]`/`null`、retry禁止）は変更しない。
