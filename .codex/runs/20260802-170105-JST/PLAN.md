# Plan

## Objective
- GitHub Actions の検証並列化、Build Artifact 共有、Playwright Prebuilt Dist、Cloudflare デプロイゲートを実装する。
- 初回確認では別作業のテスト修正が main に未反映だったが、ユーザーが続行を明示したため、テスト修正を変更せず CI/CD 構造の実装を進める。

## Scope
- In: `.github/workflows/ci.yml`、`playwright.config.ts`、実装前計画、CI/CD ADR、`PROJECT_CONTEXT.md` と履歴、今回の Run Artifact。
- Out: テスト修正、アプリケーションコード、package／依存変更、Workflow 分割、Composite Action／Container、新規 Rollback、Git 操作、GitHub／Cloudflare 管理画面操作。

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
- ユーザーの続行許可を受け、`docs/plans/2026-08-02_170105_github-actions-artifact-ci.md` に保存した手順で Workflow／Playwright を実装する。
- 実装後に文書、構造、静的検証、可能な E2E を実行し、既存契約テストとの衝突はテスト変更なしで切り分ける。
- 標準フロー: `PLAN -> TASKS -> 前提確認 -> 実装 -> 検証 -> REPORT`

## Definition of Done
- 今回の Run: ユーザーの続行許可を踏まえ、CI/CD 構造を実装・検証し、未検証の GitHub 上項目を記録する。
- 実装再開時: 添付指示の CI／Playwright／文書 DoD と、ローカル／GitHub で確認可能な検証結果をすべて満たす。

## Risks / Unknowns
- main 未反映のテスト修正を前提に CI 構造を変更すると、別作業の失敗と今回の変更を切り分けにくい。テスト／アプリコードを変更せず、失敗を分類して記録する。
- GitHub 上の既存 CI 成功、Artifact、Deploy はこの環境だけでは未確認。Push／Git 操作を行わず、ユーザー側の main 反映後に再開する。

## Thinking Log
- 2026-08-02 17:01 JST: 添付指示を読み、作業開始条件を最優先のゲートとして設定した。
- 2026-08-02 17:02 JST: 現行 Workflow、Playwright、package Script、serve script、Context、ADR、直近 Run を確認した。
- 2026-08-02 17:03 JST: `.git/HEAD` 相当の参照は `fix/2026-08-02`、local main／origin-main 参照は別 hash であり、現在 main 上ではないことを確認した。Git mutation は実行していない。
- 2026-08-02 17:04 JST: 3件の read-only subagent に開始条件と既存 CI 構造の確認を委譲した。実装 worker は開始ゲート未達のため起動しない。
- 2026-08-02 17:06 JST: ユーザーが続行を明示したため、開始ゲートを上書きし、テスト／アプリコードを変更せず CI/CD 構造の実装へ進む判断を採用した。
- 2026-08-02 17:39 JST: 構造監査、Build、Prebuilt／従来 Smoke、主要 Chromium 系 E2E、静的検証を完了した。既存 CI 契約テスト5件は新構造と旧期待値が衝突するため、テスト変更禁止の条件下で blocked と判定した。
- 2026-08-02 17:45 JST: ユーザー要望により、同一会話セッション内では active run を再利用し、既存 Run Artifact へ追記する運用を `AGENTS.md` に追加する。今回も新規 Run は作成せず、本 Run へ追記する。
