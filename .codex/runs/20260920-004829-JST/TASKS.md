# Tasks（タスク）

## Now（現在）

- [x] 1. Issue #117とPR1〜PR5の完了状態を確認する。
- [x] 2. 現行`main`のTrigger / Semantic / Deterministic Evalと対象Skill契約を確認する。
- [x] 3. PR6の初期stage方式、代表case、変更範囲、検証方法を確定する。
- [x] 4. `test/117-pr6-workflow-e2e-eval`へcanonical Planとplan-only Run Artifactを保存する。
- [x] 5. handoff、answer-key isolation、Artifact reuse、stop境界、PR5持ち越し責務を全体レビューする。
- [x] 6. fresh session列を廃止し、Codex標準`exec resume <thread_id>`へ修正する。
- [x] 7. fixed 5 caseへ`stop_no_progress` / `stop_unsafe` / QA→repair handoffを統合する。
- [x] 8. OTel `multiple_skills`、repair output schema、Case B/C/D fixture、stage sandbox、Windows actual write probeを統合レビューする。
- [x] 9. 必要と判断した修正だけをcanonical Planとplan-only Run Artifactへ反映する。

## 完了処理の参照先

- 基本Progress: `docs/reference/run-artifacts.md`。
- Plan保存: `PLANS.md`。
- Git branch安全性: `docs/reference/git-branch-safety.md`。

## Discovered（発見事項）

- handoffはCodex標準`exec resume <thread_id>`による同一threadの複数ユーザーターンで評価する。
- Artifact reuseはfresh session / fresh workspaceで別checkにする。
- `multiple_skills`はADR-0025 / 既存observerどおり`unobservable`とする。
- repair decision等は`--output-schema`で構造化し、runner実観測と照合する。
- Case Bは既存`CHALLENGE-BASIC-001` protected patchでdeterministic defectを準備し、`training/agentic-qa/instructor/**`をAgentへ見せない。
- Case C / Dは最初から停止理由を与えず、actionable repairからactual validationを経て`stop_unsafe` / `stop_no_progress`へ到達させる。
- Plan / implementation / repair / QAは必要writeを許可し、review / harnessはread-onlyで足りる。
- Windows resumeではsandbox optionだけでなくactual fixture writeをsmoke probeする。
- 独自trust manager、Workflow Engine、Session Manager、追加caseは不要。
- branchはlatest `main`に対してbehind 1であり、実装開始前に取り込む必要がある。

## Blocked（ブロック中）

- なし。実装開始時のHost capability / fixture contract preflightで不成立なら、その時点でBLOCKEDとする。
