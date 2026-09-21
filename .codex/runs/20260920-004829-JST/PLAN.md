# Plan（計画）

## 目的

- Issue #117 PR6 Workflow E2E Evalのcanonical Planへ、ここまでの全体レビューを統合した実装前修正を反映する。
- 目的達成を阻む契約不整合を直しつつ、特にCase Bの不要なsource-free構造を削って実装を単純化する。
- このRunではEvaluator実装、latest `main`取り込み、Issue更新 / closeは行わない。最終全体レビューで実装結果を変えると再確認できた5件だけをPlanへ反映し、実装細部だった指摘は追加しない。

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
- sanitized Targetの生成手順とprovenanceを固定し、canonical completion runでは`source_revision_git_sha == evaluator_git_sha`、`routing_source_git_sha`をfixture適用前Target HEAD、`case_baseline_git_sha`を各caseのparentなしroot baseline HEADとする。
- canonical completion runはcommit済みEvaluator自身を評価対象とし、Evaluator sourceを`.codex/runs/**`以外clean、`source_revision_git_sha == evaluator_git_sha`へ固定する。Agent-visible TargetからPR6 evaluator / repository-contractの固定pathを除外する。
- 各case workspaceはsanitized Targetの`.git`を引き継がず、case固有runner state適用後にparentなしroot baseline commitを1件だけ作る。remote / alternates / parentなし / cleanをpreflightする。
- Case BはBlack-box file / Instructor materialだけでなく、確認済みのchallenge-specific ground truthを含む`prepare-challenge.ts`、`run-contract-fixture.ts`、`spec-agentic-qa.test.ts`もAgent-visible workspaceから除外する。汎用answer-key scannerは作らない。
- canonical invocationへ`shell_environment_policy.inherit=core`と`web_search=disabled`を追加する。
- Case Eはnon-Windows / PowerShell unavailableだけ`not_executed`を許容し、WindowsではNative helperと`--android-device-serial`を必須にする。`-RequirePhysicalDevice`付きCanonical Doctorのbounded outputは`==> Validate toolchain`を起点に最初の非空・非`PASS:`行だけをraw `first_anomaly`として照合し、raw device serialはtracked resultへ保存しない。
- status分類を一意にし、共通Runtime blockerだけrun `blocked`、共通probe通過後の個別process / resume / OTel failureは`unobservable`、case-local preparation / fixture / dependency / validator不整合は`fail`とする。`not_executed`はCase B canonical Browser / screenshot / URL capability不足とCase E non-Windows / PowerShell unavailableだけに限定する。
- Case A `feature-plan` / `code-review`、Case B `exploratory-qa`、Case D `harness-improvement`のactual outputをPR5 Semantic criteria / Judge protocol / 3 trialsで評価する。actual candidateはcalibration用`expected` / `calibration_match`を使わず、対象stageのdeterministic validation後・後段handoff前に評価する。第2のSemantic frameworkは作らない。
- result contractは既存`ProcessLifecycle`と固定case checkだけへ限定し、汎用Rule Engineへ広げない。
- 全Agent turnのGit mutation禁止を共通promptへ固定し、runnerでHEAD / detached状態を照合する。
- Git-visible scopeと`.codex/runs/**` / `.artifacts/**` inventoryを分け、ignored pathへの許可外writeを検出する。
- repair / review / Nativeのstage-specific schemaを型・nullabilityまで固定する。
- Case A review Findingはrunner注入diff line rangeとのoverlapを必須にする。
- Case Eは標準PowerShell invocationを使い、Doctor non-zero時の`first_anomaly`は`==> Validate toolchain`より後の最初の非空・非`PASS:`行とのverbatim一致だけを確認する。
- result JSON保存後、固定成功条件を満たす場合だけCLI exit 0とする。

- Case BはBlack-box用Challenge / runbook、Instructor material、challenge-specific ground truthを含む既知Harness fixture / testをAgentへ露出せず、canonical `source_revision_git_sha`のGit objectから取得したchallenge / patch / answer keyをEvaluatorだけが使用する。検証済みpatch bytesだけを`.git`なしのcase workspaceへ適用し、その後にparentなしroot baseline commitを作る。Evaluator checkoutのProduct fileをコピーしない。
- Case B dependency preparationは`pnpm install --offline --ignore-scripts --frozen-lockfile --config.node-linker=hoisted`へ固定し、直後のtracked diff 0件を必須にする。platform別fallbackやDependency Managerを作らない。
- Case DはProduct fixtureを削除し、Product正常 / Harness反復failureを示すrunner-owned Evidenceだけを使う。最初のturnは既存bounded `repair-loop`の継続可否判断、次の明示的turnだけを`harness-improvement`依頼へ固定する。
- 親PlanのDoDは結果と境界だけを保持し、Case B / D / Eの実装詳細は3詳細Planを正本にして重複契約を増やさない。

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
