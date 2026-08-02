# GitHub Actions 並列化・Artifact 経由デプロイ計画

## 0. 依頼概要

- 依頼内容: 既存の単一 `validate` 中心の GitHub Actions を、検証・Build・Artifact・デプロイゲートを分離した構成へ再編する。
- 背景: 現行 Workflow は静的検証、Vitest、Build、Playwright、デプロイ前検証を一つの Job で直列実行し、デプロイ Job でも Build を再実行している。
- 期待成果: Automation／Production の Build を各1回だけ生成し、Artifact を後続検証・デプロイへ渡す。内部の検証集約は `verify`、既存 Required Check の最終ゲートは `validate` とし、PR は Preview Smoke 後、main Push は最終 `validate` 成功後にのみ次段へ進む。

## 1. ゴール / 完了条件

- ゴール: `.github/workflows/ci.yml` と `playwright.config.ts` を中心に、指定された Job／Matrix／Artifact／Concurrency／デプロイゲートを実装する。
- 完了条件:
  - `quality`、`vitest`、`build-automation`、`build-production`、`e2e-chromium`、`ui-review`、`production-smoke`、条件付き `extended-e2e`、内部集約 `verify`、Preview 後の最終 `validate`、Production デプロイ Job が要件どおり接続される。
  - Playwright は `PLAYWRIGHT_USE_PREBUILT_DIST=true` のとき Build を再実行せず `dist/` を配信し、未指定時のローカル従来動作を維持する。
  - 必須ローカル検証と Workflow 構造確認を実行し、GitHub 上でのみ確認できる項目を明記する。
  - ADR、`PROJECT_CONTEXT.md`、変更前履歴、新規 Run Artifact が保存される。
- 開始ゲート: 現在別作業中のテスト修正が main に反映され、main の既存 CI が成功していることを確認してから実装へ進む。初回確認では未達だったが、ユーザーが「続けて対応して大丈夫」と明示したため、テスト修正を変更せず CI/CD 構造だけを進める。

## 2. 現状理解と前提

- Current understanding:
  - 現在の `.github/workflows/ci.yml` は Quality、5種類の Vitest、Automation／Production Build、Chromium E2E、UI Review、Production Smoke、条件付き Extended E2E を独立実行し、`verify` が結果を集約する。
  - PR の `deploy-preview` は `verify` と `build-automation` の成功後に Artifact をデプロイし、公開 URL Smoke Test の結果を最終 `validate` が `always()` で判定する。main Push では `deploy-preview` を Skip として最終 `validate` が許可し、Production はその成功後に開始する。
  - `playwright.config.ts` は `DEPLOYED_BASE_URL` 未指定時に常に `pnpm run build:web && pnpm exec tsx scripts/serve-web-dist.ts` を Web Server Command として使用する。
  - `package.json` には指定された Quality、Vitest、Playwright、Build、Smoke の Script が存在する。
  - 現在の作業先は `fix/2026-08-02`。直近 Run `20260802-163908-JST` は Component Test 修正を記録しており、今回の開始条件である main 反映済み状態を確認できない。
  - `docs/adr/` の既存命名は連番 ADR で、現在は `0001-ui-ux-state-boundaries.md` が最新である。
  - `tests/contracts/ci-workflow.test.ts` は Job 単位の Helper で、Job 依存関係、fail-closed の結果判定、Artifact 同一性、再 Build 禁止、URL Smoke、Secret 明示失敗を検証する。
- Assumptions:
  - ユーザーの PR #6 修正指示に従い、変更対象を Workflow、契約テスト、計画・ADR・Context・履歴・Run に限定する。Playwright、アプリケーション、E2E本体、package／lockfileは変更しない。
  - Workflow の共通 Setup は指定どおり各 Job に明示し、Anchor／Composite Action は追加しない。
  - Cloudflare Secret の存在確認はデプロイ対象 Job 内で明示的に失敗させ、PR 以外の schedule／workflow_dispatch はデプロイ Job を Skip する。
- Non-goals:
  - アプリケーション機能、E2E テスト本体、Playwright の追加変更。
  - package／依存関係変更、Retry 増加、Workflow 分割、Composite Action／Container 新設。
  - Cloudflare／GitHub 管理画面設定、GitHub への Push、Git mutation、自動 Rollback。

## 3. 質問 / 曖昧性

- 必ず質問する不透明点: なし。添付指示で対象、イベント、Job、Artifact 名、検証条件が指定されている。
- 仮定してよい細部: 既存の Playwright 出力規約を調査した上で、UI Review Artifact は各 Matrix Project の生成ディレクトリだけを指定する。
- 未回答の重要質問:
  - テスト修正が main に反映された Commit と、main の既存 CI 成功 Run は未確認だが、ユーザーの続行許可により今回の実装を進める。

## 4. 影響範囲

- Impacted areas:
  - GitHub Actions の Job graph、Matrix、Artifact Upload／Download、Concurrency、Cloudflare デプロイゲート。
  - Playwright のローカル Web Server 起動条件。
  - CI/CD 設計文書と Project Context。
- Files to inspect:
  - `.github/workflows/ci.yml`
  - `playwright.config.ts`
  - `package.json`
  - `scripts/serve-web-dist.ts`
  - `e2e/web/ui-review.spec.ts` と出力先を決める既存 helper／fixture
  - `AGENTS.md`、`docs/PROJECT_CONTEXT.md`、`PLANS.md`、`docs/adr/`、`.codex/runs/`

## 5. 変更方針

- Change strategy:
  1. Playwright に厳密な `PLAYWRIGHT_USE_PREBUILT_DIST === "true"` 判定を追加し、`webServer.command` だけを切り替える。
  2. Workflow に workflow-level env／Concurrency を設定し、Quality、Vitest Matrix、Automation／Production Build、Automation Artifact を使う E2E／UI Review、Production Artifact の Local Smoke、条件付き Extended E2E を追加する。
  3. 上流検証の `verify` を `always()` で結果集約し、PR では `skipped` の Extended E2E を許可する。テストや Build は再実行しない。
  4. Preview／Production の各デプロイ Job で Artifact を Download し、Secret 不足は明示エラー、Deployment URL 検証と Smoke Test を同一 Job で行う。PR の最終 `validate` は `verify` と `deploy-preview` の結果を `always()` で fail-closed に判定し、別の `pr-gate` Job は置かない。
  5. 変更前 `PROJECT_CONTEXT.md` を `docs/history/` に保存し、ADR と Context を更新する。Run Artifact に判断・検証・未検証項目を追記する。

## 6. 検証方法

- Validation plan:
  - YAML Syntax、Job ID 重複、`needs` 循環、Matrix Script／Artifact 名、イベント条件、再 Build 不在、Project 名統一を静的に確認する。
  - `pnpm run format:check`
  - `pnpm run lint`
  - `pnpm run typecheck`
  - `pnpm run validate:image-manifest`
  - `pnpm run security:check`
  - `pnpm run test`
  - Automation／Production の `pnpm run build:web` 相当を実行し、`dist/index.html` を確認する。
  - Prebuilt Dist と従来の Playwright Local Server の両方で `pnpm run test:smoke` を確認する。
  - 可能な範囲で Chromium、Accessibility、Mobile Boundary、Cross-role E2E を実行する。
- 成功判定:
  - ローカルで実行可能な必須コマンドが成功する。既存 baseline failure は原因と scope を切り分けて Run Report に残す。
  - GitHub Actions でしか確認できる Artifact／Deploy／Concurrency／Status Check は未検証として明記する。

## 7. リスクと未解決論点

- Risks:
  - `verify` と最終 `validate` の `always()`、および skipped Job の扱いを誤ると、失敗を見逃すか PR を不必要に失敗させる。Job result を明示比較する。
  - UI Review の出力ディレクトリを広く指定すると Matrix Artifact が重複・混入するため、既存出力規約を確認して Project 単位に絞る。
  - Artifact Download 後に `dist` の階層が変わると静的サーバーが `index.html` を見つけられないため、Upload／Download の path を対にする。
  - Cloudflare Secret の欠落を Job-level condition で Skip しないよう、デプロイ Job 内の明示チェックを使う。
- Open questions:
  - テスト修正が main にマージ済みか、既存 main CI が成功済みかは未確認。ユーザーの続行許可により構造変更を先行する。

## 8. 成果物

- 変更ファイル:
  - `.github/workflows/ci.yml`、`tests/contracts/ci-workflow.test.ts` を変更する。既存の `playwright.config.ts` の Prebuilt Dist 対応は維持する。
  - 必要な既存 ADR 採番に従う ADR、`docs/PROJECT_CONTEXT.md`、`docs/history/` を更新する。
- 付随ドキュメント:
  - 本計画書
  - `.codex/runs/20260802-170105-JST/` の標準 Run Artifact

## 9. 備考

- Git 操作、ファイル削除、移動、rename、GitHub への Push は行わない。
- 初回の開始条件確認後、ユーザーの明示許可により実装・検証フェーズへ進む。テスト修正の未反映状態は Run Report に残す。
- 初回実装後判定: CI/CD 構造、Prebuilt Dist、Build、主要 E2E は確認できたが、旧 Workflow 契約テスト5件が失敗した。PR #6 修正で契約テストを新構造へ更新し、`verify`／最終 `validate` の fail-closed 構成へ修正する。
