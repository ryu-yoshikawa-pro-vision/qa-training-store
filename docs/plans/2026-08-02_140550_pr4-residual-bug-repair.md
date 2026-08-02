# PR #4 残存不具合修正計画

## 0. 依頼概要
- 依頼内容: PR #4に残る5件（Admin初期表示、Review状態共通化、Preview全SKU比較、Run Artifact 2件）を修正する。
- 背景: 非同期取得前の暫定Form表示、状態導出の二重管理、Preview E2Eの先頭SKUのみの比較、Run証跡の不整合が残っている。
- 期待成果: 現行契約を維持した最小差分と、対象テスト・全体品質ゲートで再現可能な完了証跡。

## 1. ゴール / 完了条件
- ゴール: 5件を指定範囲内で修正する。
- 完了条件（DoD）:
  - Admin User DetailがDTO取得後のみFormを描画し、初回Role／Rank、未変更Button、Mutation後・ユーザー切替を決定的にする。
  - `CustomerReviewUseCases.getEligibility()`が`deriveCustomerReviewState()`を使用し、5状態とEligibility契約を維持する。
  - F-2が全SKUの変更前後状態を比較し、Preview後のReloadでDB不変を検証する。
  - 指定Run Artifactのstatus、日時、Evidence Selectorを実在記録へ整合させる。
  - 指定テスト、Admin Component 3回連続、全体品質ゲート、指定E2E、JSON・差分監査が成功する。

## 2. 現状理解と前提
- Current understanding:
  - `AdminUserDetailContent`は`regular`／`operator`でStateを初期化し、`useEffect`で取得DTOへ同期している。
  - `CustomerReviewUseCases.getEligibility()`はReview状態を個別に判定し、共通Helperを使っていない。
  - F-2はReload後に最初のCheckboxだけを確認している。
  - `20260802-060347-JST`はReport完了・日時とmanifestのpendingが不整合である。
  - `20260802-085639-JST/evaluation.json`には存在しないEvidence Selectorが2件ある。
- Assumptions:
  - 新規DTO・Libraryは不要で、Formの子Component化と`userId-version` keyで要件を満たす。
  - Eligibilityの理由・Context・Repository AccessはUse Caseに残す。
- Non-goals:
  - 添付の「今回は対応しない項目」
  - Lint Warning 63件の一括解消、無関係なFormat・命名変更、Git操作、削除・rename

## 3. 質問 / 曖昧性
- 必ず質問する不透明点: なし。
- 仮定してよい細部: 既存UIの`null` rank fallbackは`regular`を維持する。
- 未回答の重要質問: なし。

## 4. 影響範囲
- Impacted areas: Admin User Detail Presentation、Customer Review Application、Preview E2E、Run Artifact証跡。
- Files to inspect/change:
  - `src/presentation/pages/review-user-pages.tsx`
  - `tests/component/review-user-pages.test.tsx`
  - `src/application/use-cases/review-user-use-cases.ts`
  - `tests/unit/customer-review-state.test.ts`
  - `tests/integration/review-user-use-cases.test.ts`
  - `e2e/web/ui-ux-improvements.spec.ts`
  - `.codex/runs/20260802-060347-JST/run.json`
  - `.codex/runs/20260802-060347-JST/REPORT.md`
  - `.codex/runs/20260802-085639-JST/evaluation.json`

## 5. 変更方針
- Change strategy:
  1. DTO取得完了・エラー判定を親に残し、取得済み`UserAdminDto`を`userId-version` key付きFormへ渡す。
  2. Form StateをDTOから直接初期化し、Mutation成功時は既存再取得を起動する。
  3. `deriveCustomerReviewState(existing, order.status)`をEligibilityの状態分岐に使用する。
  4. F-2で変更前配列とReload後配列を全件比較する。
  5. 指定されたRun Artifactの不整合箇所だけを修正する。
- 実行タスク:
  - [ ] 1. Admin User Detailの決定的初期化とComponent Test
  - [ ] 2. Review状態Helper適用とUnit／Integration Test
  - [ ] 3. F-2全SKU比較
  - [ ] 4. Run Artifact 2件の整合
  - [ ] 5. 対象・全体検証と最終監査

## 6. 検証方法
- Validation plan:
  - `pnpm run format:check`
  - `pnpm run lint`
  - `pnpm run typecheck`
  - 指定のComponent／Unit／Integration／Playwright test
  - Admin Component Testを3回連続
  - `pnpm run test:contracts`
  - `pnpm run verify`
  - `pnpm run test:e2e:chromium`
  - `pnpm run test:a11y`
  - `pnpm run test:e2e:mobile-boundary`
  - `pnpm run test:e2e:cross-role`
  - JSON parse、`git diff --check`、`git status --short`、`git diff --name-only`
- 成功判定: 指定テストと品質ゲートが成功し、変更ファイルが宣言範囲に限定され、JSONとRun証跡が整合する。

## 7. リスクと未解決論点
- Risks: Async再取得によるForm State残留、E2E Reload直後の未ロード参照、既存Lint warning。
- Open questions: なし。Lint warning 63件は添付指示どおり対象外。

## 8. 成果物
- 変更ファイル: 上記の実装・テスト・E2E・指定Run Artifact、およびRun-local Artifact。
- 付随ドキュメント: 本計画書。

## 9. 備考
- commit、push、merge、rebase、reset、checkout、PR操作、削除・renameは行わない。
