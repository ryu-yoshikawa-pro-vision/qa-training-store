# Issue #117 PR2 Trigger Eval 実行環境適格性確認・canonical baseline取得計画

## 0. 依頼概要

- 依頼内容: PR #127の現行source/dataset/selector/timeoutを固定したまま、canonical `all`開始前のEnvironment Qualificationを実行し、Gate通過時だけfresh canonicalを1回実行する。
- 背景: 前回fresh runは24/24 case完了したが、`pass=2`、`false_negative=2`、`unobservable=20`、observable `4/24`、8 boundary-side中`3/8`でvalid baseline未達だった。20件はHost execution timeoutである。
- 期待成果: Gate判定、Probe evidence、canonical実行可否またはvalid/invalid判定、Run Artifact、PR #127本文、commit/push状態を再現可能な形で記録する。

## 1. ゴール / 完了条件

- ゴール: `codex-cli 0.153.4`、専用Target、trust/hook、negative/positive Probe、positive terminal duration `<=240秒`を確認し、条件成立時だけcanonical `all`を最初から1回実行する。
- 完了条件（DoD）:
  - branch/PR/latest main/working tree/Target/Evaluatorのpreflightを確認する。
  - latest `main`のrouting/observation影響を判定し、影響がないことをRunへ記録する。
  - negative Probeを1回、positive Probeを1回だけ実行し、terminal・hook correlation・parse・selector結果・durationを記録する。
  - positive terminal duration `<=240秒`、version固定、Target専用、trust/hook正常の全Gate条件を明示判定する。
  - Gate FAILならcanonicalを実行せず、正式blockerとしてRun/PRへ記録する。
  - Gate PASSならcanonical `all`を24 case、sequential、retryなし、timeout `327秒`、同一Target・同一version・同一datasetで最初から1回だけ実行する。
  - 8 boundary-side全件observableならvalid baseline、未達ならinvalid evidenceとして保存し、追加retry・timeout変更・query/description変更を行わない。
  - 指定validation、sanitizer、Run Artifact commit、明示refspec push、PR本文更新・確認を完了する。

## 2. 現状理解と前提

- Current understanding:
  - current branchは`refactor/117-pr2-trigger-eval-baseline`、PR #127はOPEN/base=`main`である。
  - source HEADは`67e0c54cfd0b52f6d5e028ab1281f5ce5a71849c`、前回Routing Targetは`856a14eb448a6ad6bf9722f623cf0d094b7a7d2a`である。
  - `origin/main`は`d24b23b6a8de95ab281c75cff400081bf3b3d9b2`へ進んだが、前回SHAとの差分はfeature-planの検証script追加のみで、routing/observation対象の変更はない。
  - Evaluatorの固定timeoutは`CASE_TIMEOUT_MS=327_000`、dataset fingerprintは`84456cef0270fe58a41a9df3bcb3a00a33c52566189072c16050ed02d3f66161`である。
  - canonical selector、dataset query、expected_skill、boundary、case ID、Skill description、AGENTS routing意味契約、scoringは変更しない。
- Assumptions:
  - 既存の独立Target `<USER_HOME>/Documents\qa-training-store-pr2-trigger-routing-target-20260906`を再利用する。
  - target更新はrouting影響なしと確認したlatest `origin/main`のdetached SHAへ限定する。
  - Probeの生ログは`.artifacts/`へ保存し、Run Artifactには意味要約と相対参照だけを記録する。
- Non-goals:
  - dataset query、expected label、boundary、Skill description、selector、timeout、scoringの変更。
  - retry/parallel/adaptive timeout/Host abstraction frameworkの追加。
  - 複数canonical結果の選択、旧invalid artifactのvalid baseline昇格、mainへのcommit/push、PR merge。

## 3. 質問 / 曖昧性

- 必ず質問する不透明点: なし。ユーザーがGate閾値、実行条件、停止条件、対象branch、PR反映内容を明示している。
- 仮定してよい細部: Gate evidenceの保存先は既存Runと`.artifacts`、canonical fresh outputは既存invalid artifactを上書きしない新規JSONとする。
- 未回答の重要質問: なし。

## 4. 影響範囲

- Impacted areas:
  - read-only: branch/PR/main/Target/provenance/trust/process状態、Probe、既存validation。
  - Run-only: `.codex/runs/20260908-004640-JST/`のPLAN/TASKS/REPORT/run.json/evaluation、Probe要約、canonical artifact。
  - PR metadata: PR #127本文のEnvironment Qualification、Canonical、Provenance、blockerまたはvalid状態。
- Files to inspect:
  - `docs/plans/2026-09-07_211249_issue-117-pr2-trigger-eval-blocker-remediation.md`
  - `docs/plans/2026-09-06_125922_issue-117-pr2-trigger-eval-baseline.md`
  - `.codex/runs/20260906-191724-JST/REPORT.md`
  - `.codex/runs/20260906-191724-JST/dataset-audit.md`
  - `scripts/evals/run-skill-trigger-evals.ts`
  - `.codex/config.toml`、`.codex/hooks/**`、6 Skillの`SKILL.md`

## 5. 変更方針

- Change strategy:
  - source/datasetを変更せず、まず最新main影響とGit/PR状態を確定する。
  - 既存Targetをlatest routing source SHAへ更新し、containment、common-dir、alternates、clean、dataset不存在、6 Skill readable、trust/hook、他Codex sessionなしを確認する。
  - `codex --version`をProbe前後で固定確認し、negative→positiveの順で各1回実行する。同一selector logicで観測結果を評価する。
  - positive terminal durationが`240秒`を超える、Probe失敗、Target/trust異常、version driftのいずれかならcanonicalを開始せず正式blockerとして停止する。
  - Gate通過時のみcanonical `all`をbackground方式で最初から1回実行し、全24 case終了後にsummary/provenance/8-side coverageを判定する。
  - invalidまたはvalidの結果をRun Artifactへ保存し、sanitizerとschema/validationを通してからRunをcommit/pushし、PR本文を現行状態へ更新する。
- 実行タスク:
  - [ ] 1. Run Plan/TASKSを確定し、branch/PR/latest main/Target/旧invalid artifactを記録する。
  - [ ] 2. 最新main差分とCodex version、Evaluator/Target provenanceを確認する。
  - [ ] 3. Targetをlatest routing SHAへ更新し、専用性・clean・trust/hook・process条件を確認する。
  - [ ] 4. negative/positive Probeを各1回実行し、durationとselector/hook evidenceを保存する。
  - [ ] 5. Environment Qualification Gateを判定する。FAILならcanonicalを開始しない。
  - [ ] 6. Gate PASS時のみcanonical `all`を1回実行し、validity/provenance/coverageを判定する。
  - [ ] 7. validation、evaluation、sanitization、PR本文、commit/pushを完了する。

## 6. 検証方法

- Validation plan:
  - `git status --short`、branch、PR、`origin/main`、source/Target SHAを確認する。
  - `codex --version`をProbe前、Probe後、canonical直前に確認し、すべて`codex-cli 0.153.4`で一致させる。
  - negative query `package.json に記載されている package name だけを確認して答えてください。`を1回実行し、terminal完了、observed_skills=`[]`、hook correlation/parse PASSを確認する。
  - positive query `$feature-plan を使って、この依頼の実装計画だけを作ってください。`を1回実行し、terminal完了、feature-plan actual read、selector検出、hook correlation/parse PASS、terminal duration `<=240秒`を確認する。
  - `pnpm run eval:skills:trigger:validate`、`pnpm run test:repository`、`pnpm run validate:skills`、`pnpm run verify`を実行する。source変更がない場合も結果を記録する。
  - evaluation schema、Run Artifact sanitizer Write/Check、`git diff --check`、PR head/body、working treeを確認する。
- 成功判定:
  - Gate PASSかFAILを全条件付きで判定し、FAILならcanonical `executed: no`を証明する。
  - Gate PASS後のcanonicalは24/24 case完了し、8/8 side observableならvalid、それ以外はinvalid evidenceとして停止する。

## 7. リスクと未解決論点

- Risks:
  - Host latencyが`240秒`閾値を超え、canonicalを開始できない可能性がある。→ Gate FAILとして保存し、追加Probeやcanonicalを行わない。
  - latest main更新がrouting/observationへ影響する可能性がある。→ 影響時はTarget更新・Probe再確認を経るまでcanonicalを禁止する。
  - Codex process競合やTarget trust/hook不成立でProbeが誤判定される可能性がある。→ process、trust、hook、correlation、parseをGateの独立条件として確認する。
  - long-running canonicalが外部sessionで中断する可能性がある。→ canonicalはGate通過後のみbackground方式で開始し、partial resultを採用しない。
- Open questions: なし。Gate結果に応じてvalid baseline取得または正式blockerを選択する。

## 8. 成果物

- 変更ファイル:
  - `.codex/runs/20260908-004640-JST/PLAN.md`
  - `.codex/runs/20260908-004640-JST/TASKS.md`
  - `.codex/runs/20260908-004640-JST/REPORT.md`
  - `.codex/runs/20260908-004640-JST/run.json`
  - Gate PASS時のみfresh canonical artifact/evaluation、またはGate FAIL記録。
- 付随ドキュメント:
  - 本計画書
  - PR #127本文
  - `.artifacts/`配下の生ログ（Git管理外）

## 9. 備考

- 旧`.codex/runs/20260906-191724-JST/trigger-eval-baseline.json`と`trigger-eval-baseline-remediation.json`はhistory/evidenceとして保持し、current valid baselineへ昇格させない。
- canonical実行を開始した場合、結果がinvalidでも追加retryせず、現行HostでPR2 DoDを満たせない設計blockerとして停止する。
