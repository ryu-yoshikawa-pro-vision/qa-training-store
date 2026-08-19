# Plan

## Objective

- PR #32の完了済みRun `20260819-132057-JST`について、Git履歴と整合しないChronology／Sanitizer Evidenceをappend-only Correctionで明示する。
- 新しいExperiment、Rebaseline、Product変更は行わない。

## Scope

- In:
  - `.codex/runs/20260819-132057-JST/REPORT.md`末尾へのCorrection追加
  - この新しいRepair RunのPLAN／TASKS／REPORT／run.json／evaluation.json
  - 指定されたGit Evidence、Validation、Sanitizer、通常commit／pushの記録
- Out:
  - 過去Entryの削除・時刻推定・書き換え
  - `docs/`、Application／Native／Spec／Curriculum、Workflow、Package、Hook、Security Hardening、Experiment／Rebaseline設計
  - PR操作、CI rerun、review操作、merge

## Assumptions

- 作業開始時点で対象branchとremote feature branchは同じHEADで、working treeはcleanである。
- 正確な各commandのwall-clock timeは既存Git Evidenceから復元できないため、Correctionでは推定時刻を作成しない。
- Sanitizer後は対象Run Artifactへ追記せず、Sanitizer結果はコマンド終了結果と最終報告をCanonicalな作業Evidenceとする。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。目的、対象、DoD、禁止操作が明確である。
- 仮定してよい細部: Correction headingは実行時の現在JST分を使う。過去Entryの時刻は変更しない。
- 未回答の重要質問: なし。

## Hypotheses

- H1: `70f374b`は13:58:40 JSTに作成され、14:05／14:15／14:20のEntryを既にtreeへ含むため、当該headingは正確なwall-clock timestampではない。
- H2: `449cf75`はその後REPORT／TASKSを変更するため、「Sanitizer後はRun Artifactを変更しない」は最終履歴全体には適用できない。ただし、既存のGitHub Actions sanitization PASSの事実は別のprovenanceとして維持できる。

## Research Plan

- Round 1 Query: repository rules、branch／HEAD、remote、対象Runの現状を確認する。
- Round 2 Query: `70f374b`／`449cf75`のmetadata、REPORT tree、Run Artifact diffを照合する。
- Exit Criteria:
  - 主要仮説ごとにGit Evidenceがある
  - Correction対象がold REPORT末尾だけで確定する
  - Validation、Sanitizer、Git結果、CI pendingをRunへ記録できる

## Approach

- 新しいrepair runを初期化する。
- 指定commitの時刻とtreeを再確認し、findingを`must_fix`として確定する。
- 旧REPORTへCorrectionを一度だけappendする。
- Run ArtifactへValidation／Sanitizer予定／Git操作結果を記録し、最後に対象RunをSanitizeする。
- 通常commit／push後はCIをread-onlyで確認し、Run Artifactへ再追記しない。
- 標準フロー: `PLAN -> TASKS -> 実行 -> REPORT -> Sanitizer -> Git`

## Definition of Done

- 14:05／14:15／14:20の既存Entryを改変せず、timestamp誤記と確定可能なexecution orderをCorrectionとして末尾へ追加する。
- `449cf75`による後続変更と、final sanitization provenanceをCorrectionに明記する。
- 変更がold REPORTと新Repair Run Artifactだけである。
- `format:check`、`lint:markdown`、`git diff --check`、必要な`verify`、SanitizerがPASSする。
- force／rebase／reset／amend／PR操作なしで通常commit／pushを完了する。

## Risks / Unknowns

- 過去Entryを修正するとappend-onlyとHistorical Evidenceを壊すため、末尾appendだけにする。
- Sanitizer後の自己参照追記を再発させないため、最終Sanitizer前にRun Artifactの記録を完了する。
- push後CIは新HEADでpendingになり得るため、結果をRunへ再追記せず、最終報告で残事項として扱う。

## Thinking Log

- 2026-08-19 15:34 JST: `70f374b`の13:58:40 JSTとREPORT treeを照合し、14時台の3 headingがcommitより後の正確なwall-clock timeとして成立しないことを確認した。
- 2026-08-19 15:34 JST: `449cf75`の14:00:23 JSTでREPORT／TASKSに追記が入っているため、既存14:20 Entryの「変更なし」は最終履歴全体へは適用しないと判断した。
- 2026-08-19 15:34 JST: 追加のdocs／code変更はfindingと無関係なので、old REPORTと新Run Artifactに限定する。
