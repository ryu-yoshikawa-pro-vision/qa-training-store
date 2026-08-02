# Project Context

## 目的

- このリポジトリで Codex を使うときの運用前提、重要な制約、主要ディレクトリを共有する。

## 運用の要点

- `AGENTS.md` の読込順と run 運用を必ず守る。
- 計画依頼では `docs/plans/TEMPLATE.md` をベースに計画書を作る。
- `docs/reports/` は durable な調査・監査・検証結果だけに使う。review-only、plan-only、status update、軽い確認、通常の evidence command 結果、run progress 記録では作らない。
- run の進捗と実行ログは `.codex/runs/<run_id>/REPORT.md` と `.codex/runs/<run_id>/logs/` に残す。
- プロジェクト配下の読み書きは通常承認なしでよいが、shell / PowerShell / git command によるファイル削除は禁止する。意図した差分としての `apply_patch` は許可する。
- read-only 調査 subagent は調査結果だけを返し、編集・作成・削除を行わない。
- `implementation_worker` は親 agent が承認した小さく限定された実装だけを担当し、対象ファイル以外の編集、削除、rename、git mutation を行わない。
- 重要な意思決定は `docs/adr/` に記録する。
- `docs/PROJECT_CONTEXT.md` 自体は living document として更新し、履歴は `docs/history/` に残す。

## ディレクトリ構成

- `.codex/templates/`: PLAN / TASKS / REPORT の run テンプレート
- `.codex/agents/`: project-scoped custom agents
- `.codex/rules/`: execpolicy ルール
- `.agents/skills/`: repo-local の planning / review workflow と references
- `docs/plans/`: ユーザー向け計画書
- `docs/reports/`: durable な調査・監査・検証レポート
- `docs/reference/`: operator / maintainer 向け補助資料
- `scripts/`: `codex-safe` / `codex-task` / `codex-sandbox` と verify
- `codex-project.toml`: template 適用後の project metadata

## UI デザイン基準

- Storefront と customer 画面は、白／暖色系 Off White、Dark Navy `#111827`、限定的な Gold `#C6A15B` を基調とし、商品画像と情報階層を主役にする。
- 本文色は `#111827`、補足色は原則 `#475569`、Border は `#E2E8F0` とし、Gold の文字色は WCAG AA を満たす `#7A5B22` を使う。
- 最大 Content Width は 1,280px、Spacing は 8px Grid、Button／Touch Target は原則44px以上、CardはBorder中心でShadowを限定する。
- Responsive境界は Mobile 767px以下、Tablet 768〜1023px、Desktop 1024px以上を基本とする。管理操作は既存契約どおり1024px以上に限定し、小画面では専用Warningを表示する。
- Visual Reviewの標準ViewportはDesktop 1440×1000、Tablet 1024×900、Mobile 390×844とし、Storefront／customerの主要FlowはSmall Mobile 320×700でも横overflow、44px touch target、Page End到達性を検証する。
- 共通の視覚実装は `src/presentation/design/tokens.ts`、`src/presentation/styles/global.css`、Storefront／Admin shell、共有Componentへ集約し、Domain、Use Case、Seed、Route、権限制御から分離する。
- 同一条件のVisual Reviewは `e2e/web/ui-review.spec.ts` と `ui-review-*` Playwright projectで取得し、`output/ui-review/<stage>/<viewport>/` に保存する。

## UI/UX改善実装後の状態（2026-08-01）

- WebのOne-time Noticeは `src/presentation/shells/app-frame.tsx` が単一のStateと消費Pathを所有し、Storefront/Admin Shellは表示だけを担当する。Cart統合、Checkout再開・置換、Scenario ResetのNoticeは `sessionStorage` の検証済みUnionを介して伝播し、Reloadでは再表示しない。
- Loginの内部Return先は `src/presentation/browser/return-to.web.ts` のCustomer向けAllowlistに限定する。Checkoutの各実ContentとPayment Processing/Complete/Failedは `use-route-heading-focus` で `h1` にFocusする。
- Scenarioの正本は `src/seeds/metadata.ts` の `SCENARIO_METADATA` / `PHASE_ONE_SCENARIOS` であり、Seedの初期Session、安全な戻り先、Guide表示、E2E収集可否を同じ定義から導出する。Test Control UIのResetだけがNotice保存と安全Pathへの遷移を行い、Test API ResetはDB/Session/ClockのResetとMetadata返却に限定する。
- Customer注文画面のReview表示はAdmin向けOrder Item DTOから分離したCustomer DTOを使い、購入時Snapshotに基づく `未投稿`、`公開中`、`非公開`、`削除済み（再投稿不可）` を表示する。Admin User Detailは自分自身のRole/状態変更と退会済みUserのMutationをUI上でも説明付きで拒否する。
- Admin Product Previewは保存前のForm値と既存DBの現在庫を分けて表示し、新規SKUだけ初期在庫を表示する。Product EditorはDirty状態をBreadcrumb/Sidebar/同一Origin遷移で共通確認し、PreviewはDBへ書き込まない。Shipment mutation後は最新Order/Shipmentを再取得して同時更新を表示する。
- `/guide` は固定Account、Role、Rank Benefit、Scenario Metadata、注意事項の学習入口であり、HomeはSession Role別CTAと公開商品0件の単一Empty Stateを持つ。Customer Account Navigationは390px/320pxで3列Gridを維持し、管理操作は従来どおり1024px以上の境界を維持する。
- UI/UXの回帰入口は `e2e/web/ui-ux-improvements.spec.ts` のFlow A〜J（Chromium 10 tests）で、Phase 1と合わせて `test:e2e:chromium` に収集する。Cross-role、Accessibility、Mobile boundary、4 viewport UI Reviewも既存CIスクリプトへ接続している。

## PR #4レビュー修正後の状態（2026-08-02）

- Scenario ResetはDatabase Resetの成否とNotice保存を分離する。Reset成功後のNotice保存失敗はReset失敗として表示せず、必ずMetadataのsafeResetPathへハード遷移する。ConfirmDialogは非同期Confirm中の再実行を防止する。
- Product Previewは削除予定を除いたeffective VariantをForm値から組み立て、有効SKU・必須入力・Main Imageを公開可否判定へ含める。Previewは永続化せず、既存SKUのDB現在庫と未保存Form状態を別表示する。
- Shipmentの表示ラベルはOrder StatusとShipment Statusの組合せをPresentationの共通mappingで変換し、Admin／Customerで同じ文言を使う。Login後Checkout fallbackは想定された3つの状態Errorだけを対象とし、Storage／予期しないErrorは握り潰さない。
- Cart統合の`adjustedItemCount`は部分調整だけを数え、完全除外は`fullyExcludedItemCount`だけで数える。Guideは利用者向け分類とラベルを表示し、内部Property名やDB用語を露出させない。

## PR #4追加修正後の状態（2026-08-02）

- Test Control UIのResetだけがNotice保存とsafeResetPathへの画面遷移を所有し、Test API ResetはUI Notice／UI遷移を行わず、DB・Session・ClockのResetとMetadata返却だけを行う。
- GuideとReset NoticeのRoute表示は`src/presentation/routing/guide-routes.ts`のlinkable-route allowlistを共有する。`/orders`と`/admin/reviews`などの静的Routeはリンク化し、動的な`/reviews`、決済結果Route、外部／Protocol-relative／親相対Pathは文字列表示に留める。
- Customer Review状態の5値（`NOT_ELIGIBLE`、`NOT_POSTED`、`PUBLISHED`、`HIDDEN`、`DELETED`）は`deriveCustomerReviewState`で導出する。未配達のReview Eligibilityは商品・Variation・Option・注文番号・注文日時のSnapshotを保持し、Read処理でDBを変更しない。
- Admin Product Previewの`reviewSummary`は既存商品のDB集計を全項目DTOへ明示変換し、新規Previewは全項目0とする。Customer注文詳細は`getMyCustomerOrder`を直接利用し、送料表示は`FREE_SHIPPING_THRESHOLD`を正本とする。
- CIのCross-role lifecycleはPRでも専用Playwright projectのまま実行する。Scenario DatasetのGuest／非Guest Session整合と、非同期ConfirmDialogのPromise返却をUnit／Component／Contractで検証する。
- Dirty NavigationはReact AriaのModal／DialogとExpo Routerの`usePreventRemove`を組み合わせ、戻る操作の履歴状態を復元してから確認する。破棄後は保存中の遷移ガードを解除して元の遷移Actionを遅延Dispatchし、保存中は確認を出さない。

## CI/CD構成（2026-08-02）

- Quality、Vitest、Build、Playwright 検証は独立 Job／Matrix として実行し、独立した検証を可能な範囲で並列化する。上流検証を集約する内部 Job ID は `verify` とし、既存 Required Check 互換性のため最終 Job ID `validate` を維持する。
- Automation／Production の `dist/` はそれぞれ一度だけ Build し、`web-dist-automation`／`web-dist-production` Artifact として後続の E2E、Smoke、デプロイ Job へ共有する。
- Playwright は `PLAYWRIGHT_USE_PREBUILT_DIST=true` のとき Download 済みの `dist/` を静的サーバーで配信し、Job 内の `build:web` 再実行を抑止する。環境変数が未指定の場合はローカルの従来どおり Build 後に配信する。
- PR は `verify`、Automation Artifact による Preview デプロイ、固有 Preview URL の Smoke Test を順に通過した後、最終 `validate` を成功させる。`deploy-preview` は Job-level `always()` と `verify`／`build-automation` の成功条件を併用するため、PRで `extended-e2e` が意図的に Skip されても条件評価され、上流失敗時は実行しない。Preview デプロイまたは Smoke が失敗・Skip した場合、`validate` は `always()` の結果判定で失敗する。main Push では `deploy-preview` を Skip として扱い、Preview Skip が伝播しない `deploy-production` の Job-level `always()`＋`validate`／`build-production` 成功条件により、最終 `validate` 成功後に Production デプロイと公開 URL Smoke Test を行う。
- Production デプロイは `cloudflare-production` の Job concurrency により同時実行しない。Cloudflare Secret 不足はデプロイ対象 Job 内の認証確認 Stepで明示的に失敗させ、認証情報はその確認 StepとWrangler Action Inputに限定する。全 Checkout は `persist-credentials: false` とする。UI Review Artifact は `UI_REVIEW_STAGE` をUpload pathへ再利用し、Preview branch名は許可文字を検証する。
- forkリポジトリからのPull Requestは、Cloudflare Preview用Secretを利用できず、必須のPreviewデプロイおよび公開URL Smokeを実行できないため、現在のCI/CD運用ではサポート対象外とする。同一リポジトリ内の通常PRでSecretが不足する場合は明示的に失敗し、fork PRを通すためにPreview必須条件を弱めたり `pull_request_target` を追加したりしない。

## メモ

- この文書はプロジェクト固有の実態に合わせて上書きしてよい。
- 標準経路は host 上の `codex-safe` / `codex-task --run-id <run_id>`。Docker sandbox は experimental かつ opt-in。
