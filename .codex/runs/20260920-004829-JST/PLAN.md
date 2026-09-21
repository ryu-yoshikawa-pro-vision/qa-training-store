# Plan（計画）

## 目的

- Issue #117 PR6 Workflow E2E Evalのcanonical Planへ、ここまでの全体レビューを統合した実装前修正を反映する。
- 目的達成を阻む契約不整合を直しつつ、特にCase Bの不要なsource-free構造を削って実装を単純化する。
- このRunではEvaluator実装、latest `main`取り込み、Issue更新 / closeは行わない。ここまでの統合レビューで確定した5つの実装境界だけをPlanへ反映する。

## 対象範囲

- canonical Plan親ファイル。
- `_01_cases-and-handoff.md`。
- `_02_runtime-and-contracts.md`。
- `_03_validation-and-risks.md`。
- plan-only Run Artifact。
- PR #168本文のPlan-only状態更新。

## 統合して反映する修正

- Case Bをpatched sanitized source workspace上のsame-thread / same-cwd Gray-box QA → repairへ簡素化し、source-free root、非Git起動、Skill / Referenceコピー、cwd切替、Run同期を削除する。
- Case Bのfinal validationはInstructorを必要とするfull `validateTrainingContracts()`を使わず、既存Gray-box contract validatorだけを組み合わせる。
- Case B Finding照合は既存`matchDefectFinding()`を流用せず、fixed Charter / Machine Contract / oracle refs / seed / role / platform / confirmed status / official Evidence / runner ground truthの固定条件で決定論的に行う。`QA_AGENT.md`のseed mappingは`src/seeds/metadata.ts`を正本へ寄せる。
- Case Aはimplementation成功時のtest digestをfreezeし、repairでtest書換えによる偽PASSを防ぐ。
- Case A / B / CのrepairでAgent自身の固定validation command実行をCodex標準`command_execution`から確認し、runner独立validationと分離する。Case Bのrunner独立validationはAgent workspaceの`dist/**` / `node_modules/**`を再利用せずfresh validation workspaceで行う。
- sanitized Targetの生成手順とprovenanceを固定し、`source_revision_git_sha`を生成元revision、`routing_source_git_sha`をfixture適用前Target HEAD、`case_baseline_git_sha`をAgent開始時HEADとする。
- canonical invocationへ`shell_environment_policy.inherit=core`と`web_search=disabled`を追加する。
- Case Eはphysical device serial + `-RequirePhysicalDevice`を含むCanonical Doctor actual command / exit code / Artifactを正本とし、first terminating failureだけDoctor専用固定規則で確認する。raw device serialはtracked resultへ保存しない。
- status分類を一意にし、共通Runtime blockerだけrun `blocked`、個別process failureは`unobservable`、case-local preparation / fixture / dependency / validator不整合は`fail`、固定外部capability不足だけ`not_executed`とする。
- Case A `feature-plan` / `code-review`、Case B `exploratory-qa`、Case D `harness-improvement`のactual outputをPR5 Semantic criteria / Judge protocol / 3 trialsで評価する。actual candidateはcalibration用`expected` / `calibration_match`を使わず、対象stageのdeterministic validation後・後段handoff前に評価する。第2のSemantic frameworkは作らない。
- result contractは既存`ProcessLifecycle`と固定case checkだけへ限定し、汎用Rule Engineへ広げない。
- 全Agent turnのGit mutation禁止を共通promptへ固定し、runnerでHEAD / detached状態を照合する。
- Git-visible scopeと`.codex/runs/**` / `.artifacts/**` inventoryを分け、ignored pathへの許可外writeを検出する。
- repair / review / Nativeのstage-specific schemaを型・nullabilityまで固定する。
- Case A review Findingはrunner注入diff line rangeとのoverlapを必須にする。
- Case Eは標準PowerShell invocationを使い、`first_anomaly`はbounded output内のverbatim evidenceだけを確認する。
- result JSON保存後、固定成功条件を満たす場合だけCLI exit 0とする。

- Case BはBlack-box用Challenge / runbookをAgentへ露出せず、`source_revision_git_sha`のGit objectから取得したchallenge / patch / answer keyをEvaluatorだけが使用する。検証済みpatch bytesだけをcase workspaceへ適用し、Evaluator checkoutのProduct fileをコピーしない。
- Case B dependency preparationは固定offline installへ一本化し、platform別fallbackやDependency Managerを作らない。
- Case DはProduct fixtureを削除し、Product正常 / Harness反復failureを示すrunner-owned Evidenceだけで`stop_no_progress → harness-improvement`を評価する。

## 文書構成

- 現行の親Plan + 3詳細ファイルで責務が収まるため追加分割しない。
- `_01`: fixed case / handoff。
- `_02`: Target / scope / result / Runtime contract。
- `_03`: validation / risk。
- Plan Runの3ファイルも分割しない。

## 完了条件

- 統合レビューで確定した修正がcanonical Planへ反映されている。
- 旧source-free / cwd切替 / `target_git_sha`契約が残っていない。
- Case A無関係Finding / test書換え、Case B answer-key文言依存、repair validation自己申告、ignored-path scope見逃し、Semantic actual-output未評価、Case E parser過剰実装、CLI false-successの経路がPlan上で閉じている。
- 新しいAgent Runtime / Session Manager / Workflow Engine / Target Manager / MCP Manager / Rule Engineを追加していない。
- PR6 Evaluator実装はまだ開始していない。
