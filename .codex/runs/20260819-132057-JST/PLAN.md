# Plan

## Objective

- PR #32のレビュー指摘3件を、Simple-firstの範囲で修正する。
- Run IDをcanonicalに整合させ、`d297497e2d2aeb0fa1ff17c48dd0ae7a86e9455a`をCurrent Rebaselineとして実Evidenceで記録する。
- `.artifacts/`のephemeral raw evidenceと、committed Formal Evidenceのdurable referenceを分離する。
- 修正後に指定Validation、Sanitizer、通常commit／pushを完了する。

## Scope

- In:
  - `.codex/runs/20260818-080339-JST/`のrun identityとcanonical self-referenceの修正、REPORT末尾へのCorrection追記。
  - `.codex/runs/20260818-093235-JST/`から080339へのcurrent previous-run reference修正とCorrection追記。
  - `fc9e497817e6c3cff8d89ebd7b37244e759e9484..d297497e2d2aeb0fa1ff17c48dd0ae7a86e9455a`のdelta rebaselineと判断の保存。
  - `docs/experiments/README.md`、ADR-0018、PROJECT_CONTEXT、既存implementation plan、新規historyの最小更新。
  - 本Repair RunのPLAN／TASKS／REPORT／run.json／evaluation.json。
- Out:
  - Application／Native source、Product Specification、Formal Regression、Curriculum本体、Agentic QA Harness／Skill実装。
  - `.github/workflows/**`、`package.json`、`pnpm-lock.yaml`、Codex Hook Policy、Security Hardening実装。
  - 新しいFormal Experiment、Experiment Validator／Registry／Database／Dashboard／Artifact Storage／Workflow。
  - `20260818-080338-JST` Hardening Runの編集、force push、rebase、reset、PR操作。

## Assumptions

- 対象branchは`feat/agentic-qa-knowledge-feedback-loop`、初期HEADは`400685cfe3919ada2a904336030791d5ba4a5ca3`、`origin/main`は`d297497e2d2aeb0fa1ff17c48dd0ae7a86e9455a`である。
- `fc9e497817e6c3cff8d89ebd7b37244e759e9484`はHistorical Original Baselineとして保持し、Current Stateへ上書きしない。
- Formal Experiment Target Revisionは今回設定しない。Formal Experiment、Knowledge、PromotionはそれぞれNOT EXECUTED、none、noneを維持する。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。修正対象、禁止範囲、Validation、Git操作がユーザー指示で固定されている。
- 仮定してよい細部: 新しいPlan／Historyのファイル名はこのRunのJST timestampを使用する。Raw `.artifacts/`はtracked durable evidenceの代替にしない。
- 未回答の重要質問: なし。

## Finding Triage

- P1 Run ID/path collision: `must_fix`。別タスクのHardening RunとIDが衝突し、Run identity／traceabilityを壊すため。
- P2 latest-main rebaseline: `must_fix`。PR DoDのCurrent Foundation evidenceが`d297497...`に接続されていないため。
- P2 durable Evidence contract: `must_fix`。ignored `.artifacts/`だけをcommitted Formal Evidenceにするとfresh cloneで解決不能になるため。

## Hypotheses

- H1: 080339のstructured metadataとself-referenceだけをcanonical IDへ修正し、historical proseは保持すれば、080338 Hardening Runを変更せずcollisionを解消できる。
- H2: 実diffにTest Target／Curriculumの変更がなく、QA Systemだけが#31/#33で更新されていることを記録すれば、GAP-02／Formal Experiment／Knowledge／Promotionの判断は維持できる。
- H3: tracked Run Artifact／Manifest／Summaryを標準durable referenceとし、`.artifacts/`をraw evidenceへ限定すれば、新InfrastructureなしでEvidenceのclone解決性を説明できる。

## Research Plan

- Round 1: Git state、Run identity、既存Reference、`fc9e497..origin/main`の実diffを確認する。
- Round 2: allowed filesだけを修正し、static consistency、全quality gate、Sanitizer、scopeを確認する。
- Exit Criteria:
  - 080338はHardening Runのみ、080339はAgentic QA Runのみでduplicateがない。
  - Original／Current Rebaseline、3領域の結論、GAP判断、Formal Experiment境界がcurrent docsとRun Artifactに接続する。
  - `.artifacts/`を唯一のdurable Formal Evidenceと読める記述が残らない。
  - 指定Validation、diff check、Sanitizerが成功し、remaining deltaがPR操作以外にない。

## Repair Loop Iteration 1

- input_findings: P1、P2 latest-main rebaseline、P2 durable Evidence contract。
- allowed_files: 新Run PLAN/TASKS/REPORT/run.json/evaluation.json、対象080339、093235、指定docsとhistory。
- decision: `continue`（計画・Evidence確認後に修正へ進む）。

## Definition of Done

- Run Directoryと`run.json.run_id`が一致し、080338とのduplicateがない。
- 093235のPrevious Agentic QA Run referenceが080339へ接続している。
- Latest main rebaselineが実diff付きで記録され、Test Target／Curriculum unchanged、QA System updated、GAP-02維持、Formal Experiment NOT EXECUTED、Knowledge／Promotion none、Official Scored GAP-01 BLOCKED／NOT EXECUTEDが明示される。
- `.artifacts/`はephemeral raw evidence、tracked referenceはdurable evidenceという契約がREADME／ADR／PROJECT_CONTEXTで整合する。
- 指定Validation、`git diff --check`、SanitizerがPASSし、Hardening Runと禁止範囲が無変更である。
- 通常commit／pushが成功し、PR操作をせずCIは新HEADの状態として報告する。

## Approach

- `PLAN -> evidence inventory -> bounded repair -> validation -> final sanitize -> commit/push`の順で進める。
- REPORTはappend-onlyとし、過去の080338表記はHistorical Snapshotとして残す。Correctionは全追記・記録完了後にSanitizer前に追加する。
