# Plan

## Objective
- GitHub Actions の検証並列化、Build Artifact 共有、Playwright Prebuilt Dist、Cloudflare デプロイゲートを実装する。
- PR #6 修正として、Workflow 契約テストを新構造へ追従させ、`verify` と最終 `validate` の fail-closed ゲートを成立させる。
- 初回確認では別作業のテスト修正が main に未反映だったが、ユーザーが続行を明示したため CI/CD 構造の実装を進めた。今回の修正ではユーザーが契約テスト変更を明示的に許可した。

## Scope
- In: `.github/workflows/ci.yml`、`tests/contracts/ci-workflow.test.ts`、CI/CD ADR、`PROJECT_CONTEXT.md` と履歴、計画、active Run Artifact、重複 Run `20260802-171344-JST` の終了状態。
- Out: `playwright.config.ts` の追加変更、アプリケーションコード、`tests/component/review-user-pages.test.tsx`、E2E テスト本体、package／依存変更、Workflow 分割、Composite Action／Container、新規 Rollback、Git 操作、GitHub／Cloudflare 管理画面操作。

## Assumptions
- 添付指示の Job 名、Matrix、Artifact 名、イベント条件、Secret 名を既定仕様として採用する。
- UI Review の Artifact path は既存の出力規約を調査して Project 単位に絞る。
- ユーザーによる明示的な続行許可がある場合、main 未反映の事実を記録した上で CI/CD 構造だけを進める。

## Questions / Ambiguity
- 必ず質問する不透明点: なし（添付指示で実装条件は明確）。
- 仮定してよい細部: 既存 Workflow／Playwright の構造と命名規則に従う。
- 未回答の重要質問: テスト修正の main 反映 Commit と、その Commit の既存 CI 成功 Run。

## Hypotheses
- H1: 開始条件未達。現在の HEAD は `fix/2026-08-02` で、main ではない。
- H2: 現在の main の既存 CI 成功は、ローカルのファイル確認だけでは確認できない。

## Research Plan
- Round 1 Query: 現行 Workflow、Playwright、package Script、直近 Run、ブランチ参照、既存 ADR／Context を確認する。
- Round 2 Query: read-only subagent で開始条件、既存 CI 成功可否、変更予定範囲を独立確認する。
- Exit Criteria:
  - 主要仮説ごとに支持／反証の根拠がある。
  - 開始条件未達なら実装せず、Run を blocked として次アクションを明示する。

## Approach
- 現在の branch／main 参照と直近 Run を確認し、初回ゲート未達の事実を記録する。
- ユーザーの続行許可を受け、Artifact 共有型 Workflow／Playwright Prebuilt Dist を実装する。
- PR #6 の validation failure を must_fix として、`verify`（検証集約）→ `deploy-preview`（Preview URL Smoke）→ `validate`（最終 Required Check）へ依存グラフを修正する。
- Job単位の文字列 Helperを持つ契約テストで、依存関係、fail-closed結果判定、Artifact同一性、再Build禁止、URL検証順、Secret明示失敗を固定する。
- 重複 Run は削除せず `superseded` 状態と追記ログで終了し、ADR／Context／計画／Run Artifactを実装へ同期する。
- 標準フロー: `PLAN -> TASKS -> 前提確認 -> 修正 -> targeted validation -> full validation -> REPORT`

## Definition of Done
- PR #6 の新しい Workflow 契約テストが成功し、`verify` と最終 `validate` の責務が分離される。
- PR では Preview デプロイ／Smoke の失敗・Skipを最終 `validate` が失敗として集約し、main Pushでは Preview Skipを許可して `validate` 成功後にProductionへ進む。
- Artifact Upload／Download、デプロイ前URL検証、再Build禁止、Secret明示失敗、文書同期、重複Run終了状態を検証する。
- GitHub Actions 実Runnerでしか確認できない項目は未検証として明記し、GitHub／Git mutationは行わない。

## Risks / Unknowns
- `always()` のJobでも依存結果を判定しないと上流失敗がSkipに隠れるため、`verify`／最終 `validate` の結果比較を契約テストで固定する。
- GitHub 上の実Runner、Artifact、Cloudflare Deploy、Required Check はこの環境だけでは未確認。Push／GitHub操作を行わず、未検証項目として記録する。

## Repair Iteration 1 (PR #6)

- `iteration_number`: 1
- `input_findings`: 旧 `tests/contracts/ci-workflow.test.ts` の5件失敗、`validate` が検証集約と最終ゲートを兼務、`PR Gate` が上流失敗時に Skip される、重複 Run `20260802-171344-JST` が pending。
- Triage: `must_fix`＝Workflow依存グラフ、最終validate fail-closed、契約テスト更新、文書同期、重複Run終了。`should_fix`＝契約テストの過度な文字列固定回避。`defer`＝GitHub実Runner／Cloudflare実デプロイ確認。`reject`／`needs_human`＝なし。
- `allowed_files`: `.github/workflows/ci.yml`, `tests/contracts/ci-workflow.test.ts`, `docs/adr/0002-ci-artifact-pipeline.md`, `docs/PROJECT_CONTEXT.md`, `docs/plans/2026-08-02_170105_github-actions-artifact-ci.md`, `.codex/runs/20260802-170105-JST/*`, `.codex/runs/20260802-171344-JST/*`。
- `expected_changed_files`: `.github/workflows/ci.yml`, `tests/contracts/ci-workflow.test.ts`, 指定CI/CD文書、active Run、重複Run。
- `max_iterations`: 1。今回の修正と必須検証を1 iterationとして扱い、同じfailure categoryの無制限再試行はしない。

## Thinking Log
- 2026-08-02 17:01 JST: 添付指示を読み、作業開始条件を最優先のゲートとして設定した。
- 2026-08-02 17:02 JST: 現行 Workflow、Playwright、package Script、serve script、Context、ADR、直近 Run を確認した。
- 2026-08-02 17:03 JST: `.git/HEAD` 相当の参照は `fix/2026-08-02`、local main／origin-main 参照は別 hash であり、現在 main 上ではないことを確認した。Git mutation は実行していない。
- 2026-08-02 17:04 JST: 3件の read-only subagent に開始条件と既存 CI 構造の確認を委譲した。実装 worker は開始ゲート未達のため起動しない。
- 2026-08-02 17:06 JST: ユーザーが続行を明示したため、開始ゲートを上書きし、テスト／アプリコードを変更せず CI/CD 構造の実装へ進む判断を採用した。
- 2026-08-02 17:39 JST: 構造監査、Build、Prebuilt／従来 Smoke、主要 Chromium 系 E2E、静的検証を完了した。既存 CI 契約テスト5件は新構造と旧期待値が衝突するため、テスト変更禁止の条件下で blocked と判定した。
- 2026-08-02 17:45 JST: ユーザー要望により、同一会話セッション内では active run を再利用し、既存 Run Artifact へ追記する運用を `AGENTS.md` に追加する。今回も新規 Run は作成せず、本 Run へ追記する。

## Repair Iteration 2（PR #6 追加修正）

- `iteration_number`: 2
- `input_findings`: GitHub Actions Run `30741740232` で `verify=success`、`deploy-preview=skipped`、`validate=failure`、`deploy-production=skipped`。原因は `deploy-preview` の Job-level `always()` 欠如による依存 Skip の伝播であり、修正後の外部成功 Run は未確認。
- Triage: `must_fix`＝Preview／Production の Skip 伝播防止、上流成功条件、Secret scope、全 Checkout 保護、契約テスト、fork 方針、Run 状態。`should_fix`＝UI Review stage 再利用、Preview branch 文字検証、指定 Run Artifact の Markdown 修正。`defer`＝GitHubへのPush／手動再実行なしで実際の Actions 成功を確認すること。`reject`／`needs_human`＝なし。
- `allowed_files`: `.github/workflows/ci.yml`, `tests/contracts/ci-workflow.test.ts`, `docs/adr/0002-ci-artifact-pipeline.md`, `docs/PROJECT_CONTEXT.md`, `docs/plans/2026-08-02_170105_github-actions-artifact-ci.md`, `.codex/runs/20260802-170105-JST/*`, `.codex/runs/20260802-171344-JST/*`, `.codex/runs/20260802-163908-JST/{PLAN.md,TASKS.md,REPORT.md}`。
- `expected_changed_files`: 上記 Workflow、契約テスト、CI/CD 文書、指定 Run Artifact、および同一会話の Active Run。
- `max_iterations`: 2。追加修正をこの iteration に限定し、外部成功 Runがない状態で `complete` へ戻さない。
- `repair_plan`: Job-level `always()` と直接依存 Job の `success` 条件を Preview／Productionへ追加し、Cloudflare Secretを認証 Step／Action Inputへ限定する。全 Checkoutへ `persist-credentials: false`、Preview branch検証、UI Review path再利用、契約テスト、fork方針、Run失敗証跡を同期する。
