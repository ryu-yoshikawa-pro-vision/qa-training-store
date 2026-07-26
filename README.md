# ECテスト自動化学習アプリ 設計ドキュメント

- Document Version: `v15`
- Seed Version: `10`

## 1. 位置付け

Web・Android・iOSへ拡張可能な、テスト自動化学習用の模擬ECアプリの設計正本です。実際の販売・決済・配送は行いません。

Phase 1は**Web EC＋Playwright**へ限定し、一般的なECとSaaS管理画面で定着している情報設計・操作パターンを取り入れます。見た目の装飾より、商品を探す、比較する、購入する、管理対象を見つけて処理する流れを優先します。

## 2. Phase 1の正式方針

| 項目 | 決定 |
|---|---|
| Frontend | Expo、Expo Router、TypeScript |
| Phase 1 Platform | Desktop/Mobile Web |
| Storefront | Home、商品一覧、検索、カテゴリ、商品詳細を分離 |
| Admin | Side Navigationを持つSaaS型Admin Shell |
| Web DB | IndexedDB + Dexie |
| Payment | 決定的なLocal Mock。成功・明確失敗のみ |
| Web Hosting | Cloudflare Pages 1 Project（Automation用途） |
| Web E2E | Playwright。PRはChromiumを必須 |
| 管理画面 | Desktop Webのみ |
| 購入可能Role | customerのみ |
| Testability | Seed、Reset、Clock、処理Delay |
| 商品画像 | GitHub Repository内の静的Asset Catalogを正本とし、管理UIでは関連付けだけを変更 |
| Native | 共通Domainを維持し、実装・配布・MaestroはPhase 2 |

## 3. 仕様優先順位

1. `13_decisions/decision_log.md`
2. `00_overview/project_scope.md`、`00_overview/implementation_phases.md`
3. `01_requirements/*`
4. `03_domain/*`
5. `04_data/*`
6. `05_ui/*`、`06_flows/*`
7. Testing・Deployment・Operations

競合を発見した場合は実装で推測せず、Decision Logと関連する正本文書を同一変更で修正します。

## 4. 正本の分担

| 内容 | 正本 |
|---|---|
| Scope・Phase | `project_scope.md`、`implementation_phases.md` |
| 正式判断 | `decision_log.md` |
| 機能の必要性 | `functional_requirements.md` |
| 業務計算・制約 | `business_rules.md` |
| 状態 | `state_transitions.md` |
| Entity・DB | `data_model.md`、`domain_types.md`、`application_contracts.md`、`repository_interfaces.md`、`indexeddb_schema.md` |
| 商品画像Asset | `image_asset_catalog.md` |
| Route | `screen_list.md` |
| Page構造・操作 | `page_patterns.md`、`ui_specifications.md` |
| Visual Token | `design_system.md` |
| UI文言・状態名 | `ui_content_dictionary.md` |
| Seed期待値 | `seed_catalog.md` |
| Test方針 | `test_strategy.md`、`e2e_design.md` |

他文書では詳細を重複記載せず、可能な限り正本を参照します。

## 5. ドキュメント一覧

| Directory | 内容 |
|---|---|
| `00_overview` | 目的、Scope、Phase計画 |
| `01_requirements` | 機能・非機能要件とPhase |
| `02_architecture` | Layer、Module、Use Case |
| `03_domain` | Role、業務Rule、状態、Policy |
| `04_data` | 論理・物理Data、Application/DTO契約、Repository、GitHub画像Asset Catalog |
| `05_ui` | Route、Page Pattern、画面仕様、文言、Validation、Wireframe |
| `06_flows` | User/Sequence Flow |
| `07_testability` | Seed、Reset、Clock、Fault |
| `08_testing` | Phase 1 Test戦略・Playwright。Maestroは将来資料 |
| `09_deployment` | Phase 1のCloudflare配信 |
| `10_operations` | CI/CD、Release |
| `11_security` | 疑似SecurityとPrivacy |
| `12_quality` | 受入、Error、Traceability |
| `13_decisions` | 最優先Decision Log |
| `future/phase2` | Phase 2開始時に再設計する非正本資料 |
| `CHANGELOG.md` | 版ごとの変更要約 |

## 6. Phase 1実装順

1. Domain: Price、Permission、商品・Order State
2. Domain Entity/Application DTO契約、IndexedDB Schema、Repository Contract、Seed/Reset/Clock
3. Storefront Shell、Home、商品一覧、検索、商品詳細
4. Auth、Cart、Checkout Session、決定的Payment、Order
5. Admin Shell、Overview、商品・在庫・Order管理
6. Review、User管理、限定Bulk Action
7. Accessibility、Playwright Chromium、Cloudflare Deploy
8. Phase 1完了レビュー後にPhase 2を再設計

## 7. 今回のUI・機能ブラッシュアップ

- Home、全商品、検索結果、カテゴリ一覧を別Routeへ分離
- Search Suggestion、適用Filter、Rating/Sale Filter、Mobile Filterを追加
- 商品詳細へGallery、価格階層、Variation Button、送料案内、Review分布を追加
- Checkoutへ1列Form、Sticky/折りたたみSummary、金額入りCTAを追加
- StorefrontとAdminのLayoutを分離
- Admin Overview、Resource Index、Resource Details、Contextual Save Barを標準化
- UI表示文言とStatus表示を日本語辞書へ集約
- Drag操作の代替、Search Combobox、Error Summary FocusなどAccessibilityを具体化
- 商品Aggregate、SKU・画像の追加変更削除、Cart統合、Checkout再開の境界条件を確定
- 商品画像はGitHub Repository内の静的Asset Catalogを正本とし、Release済みAssetはappend-onlyで物理削除しない
- Guest Cart Route、Cart Version、Payment処理中Route、Transaction境界を実行時契約まで具体化
- Cross-Repository更新はApplicationTransactionRunnerへ統一
- `/cart`をGuest対応し、Cart VersionとPayment処理中Routeの復元契約を確定
- Wishlist、Recommendation、Coupon、Point、売上Chartは追加しない



## 8.5 v15 Freeze最終補正

- Home新着期待値へ公開中の在庫切れ商品を含め、Storefront表示RuleとSeed期待値を一致
- 管理商品一覧の在庫Filterをactive SKU合計在庫で判定する方式へ固定
- Review平均は`ratingTotal / publishedCount`を未丸めで保存し、表示時だけ小数第1位へ丸める方式へ統一
- Review平均期待値変更に伴いSeed Versionを10へ更新

## 8.4 v14 Freeze前最終整合修正

- 低在庫を在庫1～5、在庫切れを0、在庫ありを1以上としてFilter・Overview・要件で統一
- Cart変更時はCart Versionだけを更新し、既存Checkoutは次回のRoute Guard・確認・注文確定で不一致を検出する方式へ統一
- Runtime Manifest Recoveryを廃止し、Manifest不整合はBuild失敗、個別画像読込失敗はPlaceholder表示へ限定
- CI/CD文書のSeed Version重複記載を廃止し、Build Metadataの`SEED_VERSION`参照へ統一

## 8.3 v13最終整合修正

- `empty-catalog`を参照整合性のある完全な空Catalog Scenarioへ修正し、欠損Variant ScenarioをPhase 1対象外として削除
- Search Suggestionの種別ごとの遷移先を商品詳細、Category一覧、Brand絞り込みへ固定
- Test APIを許可済み書込み操作と固定Read-only Inspectionへ明確に分離
- 0件Review Summaryは商品作成・削除時だけ扱い、通常の商品更新では変更しない契約へ統一

## 8.2 v12実装開始前の最終契約修正

- 商品Aggregate作成・更新CommandへApplication Clockの単一時刻を追加
- 初回Cart追加ではCart VersionをPresentationへ要求せず、active Cart取得・作成と明細加算を同一Transactionで実行
- 新規Categoryは既存最大sortOrderの末尾へ10刻みで追加
- 機能要件に残っていたCart要件の重複行を削除

## 8.1 v11最終整合修正

- 会員割引をSKU単価単位で切り捨て、明細割引合計を注文割引額とする規則へ統一
- customer停止時にSession無効化とactive Checkout abandonedを同一Transactionで処理
- Cloudflare Buildを`pnpm run build:web`へ統一し、画像Manifest生成・検証を必須化
- Payment処理日時をApplicationのClockへ一本化し、Mock Gatewayから時刻を除外

## 8. v08実装準備・正本整理

- Home、Category、Brandを取得するStorefront Catalog Query/DTOを追加
- Admin商品・在庫・Order・Review一覧のFilter/Sort/List DTOを画面仕様へ一致
- Cart価格SnapshotをSale適用後・会員割引前の単価へ固定
- 会員ランク変更時にactive Checkout Sessionをabandonedへ変更
- Payment processing再開を同一Attemptで冪等化
- Checkout各段階、注文確認、商品Preview、限定Bulk、Category/Brand管理のUse Case契約を追加
- Clock、ID、Session、Guest Identity、Email Normalizer、Application Errorを共通Portとして確定
- 入力上限を共有定数として正本化
- Phase 1必須Playwright E2Eを12本へ整理
- SQLite・Native資料を`future/phase2`へ移動し、Phase 1正本から分離
- 過去の修正サマリーを`CHANGELOG.md`へ統合
## 9. v09 信頼境界・画像・正本簡素化

- Presentation RequestとApplication内部Commandを型で分離しました。
- 商品画像ManifestをRuntime FetchせずBuild生成ModuleとしてBundleへ含めます。
- Categoryを1階層へ簡略化し、Brandは名称順固定として手動並べ替えを廃止しました。
- IndexedDBの住所SnapshotをTyped Objectで保存します。
- Decision Logを高影響判断だけへ縮小し、実装開始後はTypeScriptコードを契約の正本とします。
- Resetは1 Browser Context・1 Pageを対応条件とし、複数Tab原子性を保証しません。
## 10. v10 実装接続契約の最終補正

- active customer/operator/adminのLogin分岐を確定し、管理RoleはSession作成だけを行います。
- Profile、Checkout、Order、Review編集でUIが必要なAction Versionと既存DataをDTOへ追加しました。
- Catalog系QueryへTest Clock時刻を明示的に伝播します。
- 注文作成Transaction内で価格を再検証し、差異時はOrderを作成しません。
- Sequence、ER図、Category Flow、Reset手順の旧記述を正本へ合わせました。

