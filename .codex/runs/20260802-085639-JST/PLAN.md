# Plan

## Goal
PR #4の追加修正指示について、現行コードで有効な実害・型契約・アクセシビリティ・CI検証不足を最小差分で修正し、指定自動テストとPlaywright-MCP実動確認を完了する。

## Current understanding
- Branchは `feat/ui-ux-user-journey-improvements`、Baseは `main`。新しいBranch、commit、push、PR操作は行わない。
- `.github/workflows/ci.yml` のCross-role lifecycleは現在PRイベントでskipされる条件付きStepである。
- 未配達Reviewのcontext spread、CustomerReviewStateの重複判定、Dirty Navigation Dialog、Preview reviewSummary、route allowlist、Customer order detailのfallback cast、Scenario dataset検証、送料閾値、ConfirmDialogのPromise返却を現行コードで再確認する。
- Run Artifactは正式成果物であり、ユーザーが指定した絶対Path・時系列・changed_files契約の問題を履歴を失わない形で修正する。

## Assumptions
- 既存Application／Domain公開契約を保ち、Review状態導出だけを既存境界内の小さな純粋関数へ集約する。
- Dialogは既存 `react-aria-components` の依存と `ConfirmDialog` の設計を使い、外部Link等の既存Navigation判定は変更しない。
- Metadataの詳細Routeは一覧Routeを使い、単独遷移不能なPathは共通Presentation helperで文字列表示に留める。
- Runの `changed_files` はchange-scope policyに従い、そのRunのsource変更（repo-relative POSIX path）を示す。`.codex/runs/`生成物はsource changed_filesへ混ぜない。

## Non-goals
- 新機能、大規模リファクタリング、新規Library追加、固定待機・Retryによるテスト隠蔽。
- Playwright `@/` alias、`default` metadata、Guideの固定学習アカウント、docstring coverage 0%への変更。
- Git mutation、Review Thread解決、外部PR更新、無関係な整形。

## Impacted areas
- CI: `.github/workflows/ci.yml`
- Review/Checkout/Preview: `src/application/use-cases/*`, `src/presentation/pages/*`
- Presentation route/notice: `src/presentation/components/one-time-notice.tsx`, `src/presentation/pages/guide-page.tsx`, route helper
- Scenario/Test contract: `src/seeds/*`, `tests/unit/*`, component/integration tests
- Run/Living docs: `scripts/new-run.ps1`, `.codex/templates/RUN_MANIFEST.json`, `.codex/runs/<target>/*`, `docs/PROJECT_CONTEXT.md`, `docs/adr/0001-ui-ux-state-boundaries.md`, `docs/history/*`, `docs/plans/*`

## Files to inspect / allowed source scope
- `.github/workflows/ci.yml`
- `src/application/use-cases/review-user-use-cases.ts`
- `src/application/use-cases/checkout-order-use-cases.ts`
- `src/application/use-cases/admin-product-use-cases.ts`
- `src/presentation/pages/admin-product-pages.tsx`
- `src/presentation/pages/checkout-order-pages.tsx`
- `src/presentation/pages/product-detail-page.tsx`
- `src/presentation/pages/review-user-pages.tsx`
- `src/presentation/pages/guide-page.tsx`
- `src/presentation/components/one-time-notice.tsx`
- `src/presentation/components/*` route helper if needed
- `src/seeds/metadata.ts`, `src/seeds/scenarios.ts`
- Existing related `tests/**` and `e2e/web/**` only
- Run/document files explicitly required by the attached instruction

## Change strategy
1. Triage each finding against current code and delegated read-only evidence; record `must_fix` / `should_fix` / `reject` / `defer`.
2. Repair application contracts first: review eligibility/state helper, Preview summary mapping, direct customer order service, shared route allowlist, price constant.
3. Repair presentation/CI behavior: accessible controlled dirty dialog, metadata/notice routes, aggregate wording, async Confirm callbacks, PR Cross-role Step.
4. Add regression tests at the narrowest existing layer: integration/unit for pure/use-case contracts, component/E2E for focus and rendered route/notice behavior, dataset seed validation.
5. Repair Run Artifact generator and required historical documents without deleting history; normalize paths and make REPORT chronological.
6. Validate in bounded iterations. On the first failure, fix the root cause and rerun the smallest relevant check before the full required suite; stop on repeated category, scope violation, unsafe action, or ambiguity.
7. Run full required automation, four UI Review projects, then Playwright-MCP flows and final git/document audit.

## Validation plan
- `pnpm run format:check`, `lint`, `typecheck`, `validate:image-manifest`, `security:check`
- `test:unit`, `test:integration`, `test:repository`, `test:component`, `test:contracts`, `build:web`
- Chromium list, `test:e2e:chromium`, `test:a11y`, `test:e2e:mobile-boundary`, `test:e2e:cross-role`
- Four `ui-review-*` projects with `UI_REVIEW_STAGE=pr4-review-fix`
- `git diff --check`, absolute-path scan, JSON parse, run artifact collector/strict audit where applicable
- Playwright-MCP: Dirty Navigation Dialog, undelivered Review URL, Preview summary/DB preservation, Guide/Reset route links, Cart merge Notice, three independent Cross-role flows; Console/Page errors must be zero.

## Definition of Done
- All valid mandatory findings are fixed with regression evidence; non-applicable/already-resolved comments are classified with reasons.
- PR CI runs Cross-role lifecycle on pull_request and the dedicated command passes.
- Required automation, UI Review, MCP verification, document audit, and final source-scope audit pass.
- Final default Scenario/payment delay is restored; no commit/push/PR/thread mutation occurred.

## Risks / Unknowns
- Existing test mocks may not yet satisfy the direct `getMyCustomerOrder` contract; adjust mocks only within existing test files.
- react-aria dialog API and existing dirty-navigation event flow must be integrated without breaking Browser Back or external-link exceptions.
- Historical Run reports may contain many absolute-path references; only explicitly requested anonymization/contract corrections will be applied, with no deletion.

## Thinking Log
- 2026-08-02 08:56 JST: New strict repair Run `20260802-085639-JST` initialized. Initial source worktree was clean and branch/base matched the instruction.
- 2026-08-02 08:56 JST: `.github/workflows/ci.yml` confirmed Cross-role Step is gated by `github.event_name != 'pull_request'`; this is `must_fix`.
- 2026-08-02 08:56 JST: Previous PR #4 Run is retained as history; new work uses a new Run per repository policy.
- 2026-08-02 09:12 JST: Read-only調査3件を統合。Review spread、Preview summary、送料直値、route helper重複、CI条件、Dataset直接検証、Confirm Promise call site、Run collectorの外部Path fallbackをmust_fix候補に確定した。
- 2026-08-02 09:12 JST: Playwright alias、`default` metadata、固定学習アカウント、docstring coverageは既存契約／今回の非目標により変更しない。
