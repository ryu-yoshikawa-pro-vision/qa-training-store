# Plan

## Objective

- PR #32のCodeRabbit未解決finding 2件に対し、Run Artifactの整合性だけをboundedに修正する。
- Experiment Readiness／Formal Experimentの設計、Product、Specification、Regression、Curriculum、Skill、Harnessは変更しない。

## Scope

- In:
  - `.codex/runs/20260817-222040-JST/TASKS.md`のFormal Experiment表現をReadiness状態へ同期する。
  - `.codex/runs/20260818-080338-JST/run.json`の`changed_files`を最終PR変更ファイルへ同期し、volatileなPR／CI情報を除去する。
  - `.codex/runs/20260818-080338-JST/REPORT.md`末尾へsnapshot扱いのCorrectionを1回追記する。
  - 本RunのPLAN／TASKS／REPORT／run.jsonを更新し、Validation後にSanitizerを最後に実行する。
- Out:
  - Product source、`docs/spec/**`、`e2e/**`、`maestro/**`、`docs/curriculum/**`、`training/**`、`QA_AGENT.md`、`.agents/skills/**`、`scripts/agentic-qa/**`、package／lockfile、CI workflow。
  - Experiment Governance、ADR-0018、Experiment README、新しいExperiment／Validator／Schema／Registry／Database／Dashboard／Framework。
  - GitHub上のPR comment reply／resolve、PR Head／CI stateのRun Artifactへの再同期。

## Assumptions

- 既存のFormal Experiment未実行、Knowledge／Promotion none、Official Scored別GAP-01という結論は維持する。
- `20260818-080338-JST/run.json`の最終PR変更ファイル一覧は、origin/mainとの差分に現れる13ファイルから削除済みEXP YAMLを除いた一覧とする。
- PR Head／CIはGitHubを正本とし、Run Artifactへ固定値として追加しない。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。CodeRabbit findingとユーザー指示で修正範囲が明確である。
- 仮定してよい細部: なし。既存Run schemaと既存Sanitizerを使用する。
- 未回答の重要質問: なし。

## Hypotheses

- H1: 最新Runの`changed_files`を13ファイルへ同期すれば、削除済みEXP YAMLのstale metadataが解消する。
- H2: 旧Run TASKSをReadiness／Acceptance Validationへ同期し、volatile metadataを除去すれば、Run Artifactの意味と実体が一致する。

## Research Plan

- Round 1 Query: 最新PR review／CodeRabbit finding、origin/mainとの差分、対象Run Artifactを確認する。
- Round 2 Query: 修正後のchanged_files、TASKS、REPORT、run.json、禁止範囲、quality gateを確認する。
- Exit Criteria:
  - CodeRabbit 2 findingのmust_fix修正が完了する。
  - Formal Experiment未実行の意味が旧TASKSと既存Report Correctionで一貫する。
  - Sanitizer後にRun Artifactを変更せずcommit／pushできる。

## Approach

- Code Review／Repair LoopのIteration 1として、許可されたRun Artifactだけを修正する。
- TASKS、run.json、REPORT、PLANを確定し、quality gateと`git diff --check`を実行する。
- changed_filesとscopeを最終確認した後、Sanitizerを`-Write -Check`で実行する。
- Sanitizer後はRun Artifactを変更せず、status／diff確認、commit、通常pushを行う。
- 標準フロー: `review triage -> bounded repair -> validation -> changed_files sync -> artifact freeze -> sanitizer -> commit/push`

## Definition of Done

- 旧TASKSがFormal Experiment実行済みと読めない。
- 最新Runの`changed_files`に削除済みEXP YAMLとvolatile PR／CI情報がない。
- REPORT末尾にsnapshot clarificationが1回あり、既存履歴を変更していない。
- latest Runのstatusがcompleted、validation.statusがpassed、primary_failure_categoryがnullである。
- quality gate、`git diff --check`、Sanitizerが成功し、Sanitizer後にRun Artifactを変更していない。

## Risks / Unknowns

- PR Head／CIはpushで変化するため、Run Artifactに最新値を記録し続けると自己参照になる。GitHubを正本とする。
- REPORTはappend-onlyのため、既存09:00／09:05記録は変更せず、Correctionを末尾へ1回だけ追加する。
- 既存warningは今回修正せず、Run Artifactの整合性と混同しない。

## Thinking Log

- 2026-08-18 09:34 JST: CodeRabbitの2 findingをmust_fixへ分類した。修正対象は旧TASKS、最新RunのREPORT／run.json、本Run Artifactに限定する。
- 2026-08-18 09:34 JST: Iteration 1のdecisionは`continue`。Sanitizer後のArtifact編集を禁止する順序を採用する。
