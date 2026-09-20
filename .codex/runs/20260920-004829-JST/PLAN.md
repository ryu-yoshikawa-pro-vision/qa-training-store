# Plan（計画）

## 目的

- Issue #117 PR6 Workflow E2E Evalのcanonical Planへ、ここまでの全体レビューを統合した実装前修正を反映する。
- 目的達成を阻む契約不整合を直しつつ、特にCase Bの不要なsource-free構造を削って実装を単純化する。
- このRunではEvaluator実装、latest `main`取り込み、Issue更新 / closeは行わない。

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
- Case B Finding照合は既存matcher semanticsをnarrow exportして再利用し、`QA_AGENT.md`のseed mappingは`src/seeds/metadata.ts`を正本へ寄せる。
- Case Aはimplementation成功時のtest digestをfreezeし、repairでtest書換えによる偽PASSを防ぐ。
- Case A / B / CのrepairでAgent自身の固定validation command実行をCodex標準`command_execution`から確認し、runner独立validationと分離する。
- sanitized Targetの生成手順とprovenanceを固定し、`routing_source_git_sha`をTarget HEAD、`source_revision_git_sha`を生成元revisionとする。
- canonical invocationへ`shell_environment_policy.inherit=core`と`web_search=disabled`を追加する。
- Case EはDoctor actual command / exit code / Artifactを正本とし、failure taxonomy parserを作らない。
- status分類とCase B timeoutを一意にする。
- Case Dの`harness-improvement` Semantic品質をPR6で再採点しない。
- result contractは既存`ProcessLifecycle`と固定case checkだけへ限定し、汎用Rule Engineへ広げない。

## 文書構成

- 現行の親Plan + 3詳細ファイルで責務が収まるため追加分割しない。
- `_01`: fixed case / handoff。
- `_02`: Target / scope / result / Runtime contract。
- `_03`: validation / risk。
- Plan Runの3ファイルも分割しない。

## 完了条件

- 統合レビューで確定した修正がcanonical Planへ反映されている。
- 旧source-free / cwd切替 / `target_git_sha`契約が残っていない。
- Case A偽PASS、Case B validator不成立、repair validation自己申告、Case E parser過剰実装の経路がPlan上で閉じている。
- 新しいAgent Runtime / Session Manager / Workflow Engine / Target Manager / MCP Manager / Rule Engineを追加していない。
- PR6 Evaluator実装はまだ開始していない。
