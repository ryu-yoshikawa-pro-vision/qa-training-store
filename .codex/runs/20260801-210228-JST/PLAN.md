# Plan

## Goal
- `docs/plans/2026-08-01_ui-ux-improvement-implementation-plan.md` と添付指示に定義された Wave 1〜4 の UI/UX、契約、テスト、E2E、Playwright-MCP 実動確認を、既存の Application／Domain 契約と決定的な Scenario を維持したまま実装する。

## Current understanding
- 現在の作業ブランチは `feat/ui-ux-user-journey-improvements` で、作業開始時の製品差分はない。
- 既存コードには Storefront/Admin Shell、固定 Scenario、Test API、Checkout/Cart/Login、商品 Preview の基礎があるが、Source plan が求める Metadata 一元化、ReturnTo、Notice、詳細な Cart Merge DTO、Customer Review DTO、Dirty Navigation などは未実装または部分実装である。
- `PHASE_ONE_SCENARIOS` は配列で定義され、E2E Fixture に `sessionScenarios` の重複定義がある。
- Login UI は成功時に常に `/` へ遷移し、固定 Account 一覧を Login 画面に表示している。
- `ProductPreviewDto` は `statusAfterSave`、Preview 用 Variant 情報、在庫ソースを持たず、Admin Product Editor は明示的な Dirty Navigation 保護を持たない。
- `TestControlService.reset()` は Database/Session/Guest/Clock を扱っており、Notice 保存や画面遷移は現状 UI/API 側にない。

## Assumptions
- 既存 Source plan はユーザーと合意済みの正本として扱い、新しい仕様解釈や外部 Backend は追加しない。
- 既存の Expo Router、React state、sessionStorage、Dexie、Test API を利用し、新しい状態管理／Navigation Library は導入しない。
- 既存の直近 UI 改善で解消済みの視覚・文言変更は重複実装せず、今回の機能要件に必要な箇所だけを変更する。
- 既存の Seed Scenario に必要な Metadata を追加できる場合は Scenario ID と Fixture のハードコードを Metadata から生成する。

## Non-goals
- Git の checkout、commit、push、PR 作成、merge。
- Backend、外部決済、実配送、自動保存、新規状態管理／Navigation Library の追加。
- ユーザーが管理する範囲外差分の整形・削除。
- Test の削除、Skip、期待値の弱体化、原因を隠すための長い待機や無条件 Retry。

## Impacted areas
- 共通 Presentation: AppFrame、Storefront/Admin Shell、Route Guard、Web helper、Dictionary、global CSS。
- Application/Domain: Auth/Cart/Checkout/Review/Account/Admin Product/Admin Operations 契約・Use Case・DTO。
- Seed/Test Control: Scenario Metadata、Seed validation、Test Control UI/Service/API、E2E Fixture。
- Tests/Config: Component/Integration/Contract、Chromium E2E、Cross-role、Accessibility、Mobile boundary、Playwright config/package scripts。

## Files to inspect
- `src/application/contracts/{auth,commerce,catalog,orders,reviews-testing}.ts`
- `src/application/use-cases/{auth,checkout-order,review-user,admin-product,admin-operations,account}-use-cases.ts`
- `src/presentation/{shells,guards,pages,components,hooks,content,styles}`
- `src/seeds/{metadata,scenarios,validation}.ts`
- `src/test-controls/{test-control-service,test-api.web}.ts`
- `e2e/web/{fixtures,phase1-required,accessibility,mobile-boundary,cross-role-lifecycle,ui-review}.spec.ts`
- `tests/{unit,integration,repository-contract,component,contracts}` と `playwright.config.ts`、`package.json`

## Change strategy
1. 既存コード・Test・直近 Run の調査結果を根拠付きで確定し、共通 helper/contract の変更を先に行う。
2. Wave 1 の Focus、ReturnTo、One-time Notice、Reset 境界を実装し、単体・Component・Contract を通す。
3. Wave 2 の Login/Cart/Checkout/Inventory を DTO→Use Case→Presentation→E2E の順で実装する。
4. Wave 3 の Account/Address/Profile/Review/Guide/Home を既存定数・Snapshot と接続する。
5. Wave 4 の Admin Editor/Preview/Shipment/User 制約/Scenario Metadata/Reset を実装する。
6. 必須コマンドと Chromium/Cross-role/Responsive/UI Review を実行し、失敗は bounded に原因修正する。
7. 起動済み環境の所有者を確認してから Playwright-MCP で指定 Flow を確認し、証跡と残課題を Run Artifact に記録する。

## Validation plan
- `pnpm run format:check`, `lint`, `typecheck`, `validate:image-manifest`, `security:check`
- `test:unit`, `test:integration`, `test:repository`, `test:component`, `test:contracts`
- `build:web`, Chromium `--list`、`test:e2e:chromium`、`test:a11y`、`test:e2e:mobile-boundary`、`test:e2e:cross-role`
- 4 Project の `ui-review.spec.ts` と、必要な Cross-role／Payment／Scenario Reset の関連 Suite
- Playwright-MCP の Accessibility Snapshot、画面操作、Viewport、Screenshot、Console/Page Error、主要 Flow A〜J
- 開始時・終了時の `git status`/`git diff --name-only` で範囲外差分を確認する。

## Risks / Unknowns
- 大規模な横断変更で既存 E2E の固定 Scenario・Session・Payment Delay を壊す可能性があるため、各 Wave の関連 Test を先に通す。
- 既存 DTO の利用者が多いため、DTO 拡張は後方互換の optional 追加ではなく、既存 Field を保持する型変更として影響箇所を全検索する。
- Windows 上の Playwright/Metro 実行環境や既存サーバーが実動確認を妨げる可能性がある。所有者確認と代替検証を記録し、MCP 未利用なら完了扱いにしない。
- strict workflow の `evaluation.json` は必須であり、最終検証結果と未完了項目を記録する。

## Open questions
- 現時点で実装を止める必須質問はない。既存コードと Source plan の convention で局所判断し、判断点は REPORT/ADR に記録する。

## Thinking Log
- 2026-08-01 21:02 JST：添付指示を読み、Source plan が保存済みであること、製品差分がないことを確認した。Strict Run を新規作成し、Read-only 調査を3系統へ委譲した。
- 2026-08-01 21:xx JST：現行コードを確認し、共通基盤（ReturnTo/Notice/Focus/Metadata）が後続 Wave の依存順を決めると判断した。

## Completion notes

- 2026-08-01 23:30 JST：Wave 1〜4の実装、関連DTO/Use Case/Presentation、Scenario Metadata/Reset、Guide/Home、E2E/Responsive/UI Reviewを完了した。
- AppFrameをOne-time Noticeの単一所有者、`SCENARIO_METADATA`をScenarioの正本、Customer Review DTOをCustomer表示境界、Product PreviewをDB現在値と未保存Form値の分離境界として採用した。判断は `docs/adr/0001-ui-ux-state-boundaries.md` に記録した。
- Product Previewの初回E2E失敗は、既存編集PreviewへCreate DTOを渡していたことが原因だった。Update DTO変換を追加し、既存SKUのDB現在庫と新規SKUの初期在庫を再確認した。
- CLI/E2EとPlaywright-MCPの実ブラウザで失敗したlocator/metadata不整合を最小修正し、関連Suiteを再実行して成功させた。MCP Flow A〜Jは全て完了し、最後に標準ScenarioとPayment Delay 500msへ復元した。
