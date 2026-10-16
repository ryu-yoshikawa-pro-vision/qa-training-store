# 要件トレーサビリティ

## 1. 方針

フェーズ1（Phase 1）では、要件グループ（Requirement Group）単位でユースケース、データ、画面、テストスイート、代表検証を追跡します。個別の要件1件ごとに巨大なマトリクスを作成することはしません。トレーサビリティは、「要件グループ → 現在の代表検証」「WE-COREマッピング → 代表E2Eコード」「現在の下位トレーサビリティ代表ラベル → 代表下位コード／スイート」の3層構造とし、本ドキュメント内で完結させます。

## 2. グループマトリクス

| 要件 | ユースケース | データ | 画面 | テストスイート | 代表検証 |
|---|---|---|---|---|---|
| FR-AU-* | Auth/Account/AddressLookup | users, sessions, addresses, static postal map | login/signup/account | auth-role-address | `tests/integration/auth-account.test.ts` — auth and account application integration; `tests/component/auth-account-pages.test.tsx` — auth and account pages |
| FR-PR-* | Home/Search/Catalog/ProductAggregate/ImageAssets/Master | products, variants, product_images, static manifest, categories, brands, summaries | home/products/search/category/detail/admin catalog | storefront-discovery-product-management | `tests/repository-contract/storefront-catalog.test.ts` — storefront catalog repository contract; `tests/integration/catalog-use-cases.test.ts` — catalog application integration |
| FR-CA-* | Cart | carts, cart_items, Local Storage guestId | product/cart/login | cart-crud-merge-validation | `tests/integration/cart-use-cases.test.ts` — cart application integration; `tests/repository-contract/cart-mutations.test.ts` — cart mutation repository contract |
| FR-MO-* | PriceCalculator | variants, order snapshots | product/cart/confirm/order | price-rank-shipping | `tests/unit/pricing.test.ts` — pricing policy |
| FR-ST-* | Inventory | variants, histories | product/cart/admin inventory | stock-boundary | `tests/integration/admin-operations-use-cases.test.ts` — admin inventory, order, and shipment integration |
| FR-CH-* | Checkout | checkout_sessions | checkout routes | checkout-form-navigation | `tests/integration/checkout-order-use-cases.test.ts` — checkout and customer order application integration; `tests/component/checkout-order-pages.test.tsx` — checkout and order pages |
| FR-PY-* | Payment | payments, orders, inventory | processing/failed/order detail | payment-success-failure-retry | `tests/integration/checkout-order-use-cases.test.ts` — checkout and customer order application integration |
| FR-OR-* | Order/Shipment | orders, histories, shipments | orders/admin order | order-lifecycle-self-service | `tests/integration/admin-operations-use-cases.test.ts` — admin inventory, order, and shipment integration; `tests/component/checkout-order-pages.test.tsx` — checkout and order pages |
| FR-RV-* | Review | reviews, histories, summaries | review/product/admin review | review-eligibility-summary | `tests/integration/review-user-use-cases.test.ts` — review and user administration integration; `tests/unit/reviews.test.ts` — review summary |
| FR-AD-* | Administration/UI | main entities, admin overview read model | admin routes/legal | admin-shell-resource-pattern | `tests/integration/admin-product-use-cases.test.ts` — admin product aggregate application integration; `tests/integration/admin-master-use-cases.test.ts` — admin overview and master application integration |
| FR-TC-* | Test Control | settings/all | test-control | reset-seed-clock | `tests/contracts/test-api.test.ts` — web test API build boundary; `tests/component/review-user-pages.test.tsx` — review, user, and test-control pages |

## 3. 非機能グループ

| 要件 | 設計 | 代表検証 |
|---|---|---|
| NFR-PE-* | 検索／ファセット、画像、UI／リポジトリ設計 | many-productsベンチマークの記録・リグレッション比較（リリースゲートに固定時間を設けない） |
| NFR-RL-* | トランザクション、バージョン、UI状態復元 | `tests/repository-contract/repositories.test.ts` — Dexie repository contracts; `tests/integration/checkout-order-use-cases.test.ts` — checkout and customer order application integration; `e2e/web/phase1-required.spec.ts` — order and persistence recovery flow |
| NFR-CP-* | レスポンシブ | `e2e/web/mobile-boundary.spec.ts` — responsive / mobile boundary verification |
| NFR-MA-* | レイヤー、インターフェース、コンテンツ辞書 | `tests/contracts/architecture.test.ts` — architecture boundary verification; static quality checks |
| NFR-TS-* | シード／リセット／クロック／成果物 | `tests/contracts/test-api.test.ts` — web test API build boundary; `e2e/web/fixtures.ts` — deterministic scenario reset fixture |
| NFR-AX-* | UI／デザインシステム／ページパターン | `e2e/web/accessibility.spec.ts` — Accessibility smoke; `tests/component/presentation-foundation.test.tsx` — presentation accessibility components |
| NFR-UX-* | ストアフロント／管理画面パターン、コンテンツ | `e2e/web/ui-ux-improvements.spec.ts` — UI/UX E2E flows A-J; `e2e/web/ui-review.spec.ts` — screenshot UI review |
| NFR-SC-* | 認可、マスキング、テストAPI | `tests/unit/policies.test.ts` — permission policies; `tests/unit/password-hasher.test.ts` — password hashing contract; `tests/contracts/test-api.test.ts` — Test API exposure boundary |
| NFR-OP-* | Cloudflare、バージョン | `e2e/web/smoke.spec.ts` — public storefront smoke; deployed smoke verification |

## 4. テストID／マッピングラベルの分類体系（Taxonomy）

本ドキュメントにおける命名規則は、今回新たにID体系を策定するためのものではなく、既存ドキュメントで使用されているテストラベルやマッピングラベルの意味を明確に区別・整理するための説明です。`WE-*` という接頭辞（プレフィックス）単体では、実行可能なテストID（executable test ID）を意味するわけではありません。現在のテストコードでは、これらのラベルをテストタイトル内に埋め込んでいないため、コードへの参照はリポジトリ相対パスと正確なテストタイトル（exact test title）、または明確なスイートレベルの参照情報（suite-level reference）によって示します。

- 実行可能／検証用の名前空間（Executable / verification namespace）として文書化されている形式：単体テスト（Unit）=`UT-<domain>-NNN`、リポジトリ契約テスト（Repository）=`RC-dexie-NNN`、Web E2E=`WE-<flow>-NNN`、アクセシビリティ（Accessibility）=`AX-<screen>-NNN`、UXパターン=`UX-<pattern>-NNN`、ベンチマーク=`BM-<target>-NNN`。
- `WE-CORE-001`〜`WE-CORE-012` は実行可能な個別テストIDではなく、要件および業務フローに対応するマッピング用ID（Requirement / business-flow Mapping ID）です。表中のマッピングを、現行の実行可能テストの件数やテストタイトルへそのまま読み替えることはしません。
- 現行のテストタイトルには `WE-CORE-*` のIDを埋め込んでいません。`WE-CORE-*` が参照している先は、マッピングにおける代表的なE2Eコードであり、実行可能テストIDの一覧ではありません。
- 第6章（§6）に記載されている `UT-*`、`CT-*`、`CP-*`、`WE-TEST-INSP-*` などは、コード側に正式なIDが存在することを前提としない、既存ドキュメント由来の下位トレーサビリティ代表ラベルです。`CT-*` や `CP-*` が存在することを理由に、新たなID体系の導入、テストコードへのラベル埋め込み、テスト名のリネームなどを行うことはありません。
- 本ドキュメントで説明するラベルの接頭辞と、実際のコードやスイートの種別分類（単体テスト、契約テスト、コンポーネントテスト、E2Eテストなど）は必ずしも一致しません。正確な分類は、現行のテストファイルおよびワークフロー定義に基づいて確認します。

## 5. Phase 1 Web E2E対応

`WE-CORE-001`〜`WE-CORE-012` は、要件および業務フローに対応するマッピング（Requirement / business-flow mapping）です。現在CIで必須実行対象となっているテスト（必須leg）は `pnpm run test:e2e:chromium` であり、`chromium` プロジェクトとして `e2e/web/phase1-required.spec.ts` および `e2e/web/ui-ux-improvements.spec.ts` を実行します。プルリクエスト（PR）におけるE2Eカバレッジ全体は、`required`、`accessibility`、`mobile-boundary`、`cross-role`、`training-web-baseline` で構成される `e2e-chromium` マトリクスとして管理します。要件の全組み合わせを網羅的にE2Eへ展開するのではなく、各業務フローにおいて代表的な実行結果を検証します。

| WE-COREマッピングID | 主な要件 | フロー | 現在の代表E2Eコード |
|---|---|---|---|
| WE-CORE-001 | FR-PR-001～027/044～052、NFR-AX-006 | ゲストによる商品検索・フィルター・商品詳細閲覧・カート追加 | `e2e/web/phase1-required.spec.ts` — `01 Guestの商品検索・Filter・商品詳細・Cart追加` |
| WE-CORE-002 | FR-CA-001～006/011～017 | ゲストカートの数量変更・削除・上限超過拒否 | `e2e/web/phase1-required.spec.ts` — `02 Guest Cartの数量変更・削除・上限拒否` |
| WE-CORE-003 | FR-AU-001/004/011、FR-CA-007 | ログインとゲストカートの統合 | `e2e/web/phase1-required.spec.ts` — `03 LoginとGuest Cart統合結果` |
| WE-CORE-004 | FR-AU-006/010/016、FR-CH-001～014、FR-PY-001～007 | 配送先指定を含む会員（customer）の購入成功 | `e2e/web/phase1-required.spec.ts` — `04 customerのCheckout・TEST-SUCCESS購入` |
| WE-CORE-005 | FR-PY-007～013 | 決済失敗・再試行・冪等な再開 | `e2e/web/phase1-required.spec.ts` — `05 明確なPayment失敗・Order詳細から再試行` |
| WE-CORE-006 | FR-CA-005/006、FR-CH-006/015、FR-AU-014 | 価格・在庫・会員ランク変更時のチェックアウト再確認 | `e2e/web/phase1-required.spec.ts` — `06 価格・在庫・Rank変更でCheckout再確認` |
| WE-CORE-007 | FR-OR-001～004/011/012、FR-CH-017/018 | 注文一覧・詳細・処理中画面のリロード | `e2e/web/phase1-required.spec.ts` — `07 Order一覧・詳細・処理中Route再読込` |
| WE-CORE-008 | FR-RV-001～008 | 配達完了商品のレビュー投稿・編集 | `e2e/web/phase1-required.spec.ts` — `08 delivered商品のReview投稿・編集` |
| WE-CORE-009 | FR-PR-009/028～055、FR-AD-010 | 管理者による商品集約（Aggregate）登録・プレビュー・公開 | `e2e/web/phase1-required.spec.ts` — `09 管理者の商品Aggregate登録・Preview・公開` |
| WE-CORE-010 | FR-PR-009～016/028～043/046～055、FR-AD-011/015 | 商品編集・SKU画像変更・非公開化・下書き削除制約 | `e2e/web/phase1-required.spec.ts` — `10 商品編集・SKU画像変更・非公開・draft削除制約` |
| WE-CORE-011 | FR-ST-006～009、FR-OR-005～007 | 在庫調整・注文準備開始・発送・配送完了 | `e2e/web/phase1-required.spec.ts` — `11 在庫調整・Order準備開始・発送・配送完了` |
| WE-CORE-012 | FR-AU-005/007/008/012/015、FR-AD-002 | ユーザーアカウント停止・ログイン拒否・最後の管理者保護 | `e2e/web/phase1-required.spec.ts` — `12 User停止・Login拒否・最後のadmin保護` |

## 6. 下位トレーサビリティの代表ラベル

実装開始時点における現行（Current）の下位トレーサビリティ代表ラベルを全件監査します。計画（Plan）作成時点で存在していた22行（第6章の18行および第7章末尾の孤立した4行）は件数を永久に固定する取り決めではありませんが、実装開始時点に存在する以下のラベルはすべて対応方針（Disposition）を定めて整理します。

- `exact-title`: 単一の既存テストタイトル（existing test title）によって、対象ラベルの責務を代表できる。
- `suite-level`: 単一のテストファイル／スイート全体によって、対象ラベルの責務を代表できる。
- `bounded-multi-ref`: 既存（legacy）ラベルが複数の独立した要件や検証観点を含んでおり、現在の正式な検証記録が複数のスイートに合理的に分散している場合に、必要最小限の複数参照を明示してカバー範囲を定義する。
- `stop`: 上記のいずれの方法によっても、要件の一部が現行の正式な検証記録でカバーされていることを説明できない。

現行のコードでは下表のラベル自体をテストタイトルに埋め込んでいないため、これらのラベルを実行可能なテストIDとしては扱わず、実在するテストコードやスイートへの参照として関連付けます。

| 下位トレーサビリティラベル | 要件 | 判定（Disposition） | 現在のコード／スイート | 主な確認内容 |
|---|---|---|---|---|
| UT-CATALOG-001 | FR-PR-002～005/018/034/044～055 | suite-level | `tests/repository-contract/storefront-catalog.test.ts` — storefront catalog repository contract | 閲覧者向け価格、ファセット、ソート順の同値タイブレーク、新着順、在庫切れ公開商品のHome表示包含 |
| CT-PRODUCT-002 | FR-PR-054 | exact-title | `tests/integration/admin-product-use-cases.test.ts` — `creates a draft aggregate, zero summary, and INITIAL_STOCK in one clock` | 商品集約（Aggregate）内における同一クロックでの時刻伝播 |
| UT-PRICE-001 | FR-MO-*、FR-CA-015 | suite-level | `tests/unit/pricing.test.ts` — pricing policy | セール適用後・会員割引前のスナップショット、SKU単価ごとの切り捨て（floor）、明細割引合計 |
| CT-DB-KEY-001 | NFR-RL-011、FR-PR-041/050 | bounded-multi-ref | `tests/repository-contract/repositories.test.ts` — `enforces unique keys and persistence projection consistency`（NFR-RL-011、FR-PR-041のCategory / Brand / Variation normalized duplicate rejectionとKey projection / persistence consistency）；`tests/unit/normalization-cart-catalog.test.ts` — `uses the shared NFKC, case, and whitespace rules`（FR-PR-041のTrim / Unicode NFKC / case / whitespace normalization）；`tests/unit/normalization-cart-catalog.test.ts` — `projects active and inactive option scope keys deterministically`（FR-PR-041のVariation scope projection）；`tests/integration/admin-product-use-cases.test.ts` — `normalizes productCode and SKU across create/update and rejects normalized duplicates`（FR-PR-050のproductCode / SKU normalization・validation・case-insensitive uniqueness） | Dexieにおけるboolean/nullキーの投影、名称・商品コード/SKUの正規化、重複制約 |
| CT-TX-001 | FR-AU-011/012/014、FR-ST-009、FR-PY-012 | bounded-multi-ref | `tests/integration/auth-account.test.ts` — LoginとGuest Cart統合・失敗時Rollback; `tests/integration/review-user-use-cases.test.ts` — Rank変更とUser Accessの複合状態更新; `tests/integration/admin-operations-use-cases.test.ts` — 在庫調整と在庫履歴のRollback; `tests/contracts/transactions.test.ts` — ApplicationTransactionRunnerのRollback / commit contract | ログイン、会員ランク変更、ユーザーアクセス制御、在庫履歴のロールバック |
| CT-ADMIN-Q-001 | FR-AD-003/014/016、NFR-MA-011 | suite-level | `tests/integration/admin-operations-use-cases.test.ts` — admin inventory, order, and shipment integration | 管理画面の全一覧クエリにおけるページネーション・フィルター・ソート、商品在庫フィルターにおける有効SKU合計判定 |
| CT-CATEGORY-001 | FR-PR-035/047～049 | suite-level | `tests/integration/admin-master-use-cases.test.ts` — admin overview and master application integration | 単一階層カテゴリー、手動表示順、公開商品参照中の無効化拒否、ブランド名の五十音／名称順固定 |
| CT-CATEGORY-002 | FR-PR-055 | exact-title | `tests/repository-contract/repositories.test.ts` — `creates the first category at ten and serializes concurrent appends` | 新規カテゴリーの末尾sortOrder決定と同一トランザクション内作成 |
| CT-CART-ID-001 | FR-CA-017 | suite-level | `tests/integration/cart-use-cases.test.ts` — cart application integration | 新規itemIdの生成と既存itemIdの維持 |
| CT-CART-002 | FR-CA-018 | exact-title | `tests/repository-contract/cart-mutations.test.ts` — `atomically creates the first cart/item and increments the parent once` | 初回カート追加時の所有者（owner）解決、有効カートの取得／作成、バージョン管理不要の原子的加算 |
| CT-AUTH-001 | NFR-SC-008、FR-AU-001/005/013 | bounded-multi-ref | `tests/integration/auth-account.test.ts` — Email正規化、active / suspended / withdrawn Login、保存済みPassword照合; `tests/unit/password-hasher.test.ts` — PBKDF2 format / verifyとdeterministic Seed Hash contract | メールアドレス正規化、PBKDF2、シードハッシュ、ログイン認証照合 |
| CT-ORDER-SNAP-001 | FR-MO-006 | exact-title | `tests/integration/checkout-order-use-cases.test.ts` — `creates consistent snapshots and decrements stock exactly once after success` | 注文商品画像および注文金額のスナップショット保存 |
| CT-PAY-IDEMP-001 | FR-PY-010/013、NFR-RL-012 | suite-level | `tests/integration/checkout-order-use-cases.test.ts` — checkout and customer order application integration | 決済再開・競合発生時の完了結果返却 |
| UT-REVIEW-SUM-001 | FR-PR-017、FR-RV-006/007 | bounded-multi-ref | `tests/unit/reviews.test.ts` — 未丸め平均、表示丸め、rating distribution delta; `tests/repository-contract/storefront-catalog.test.ts` — Review平均によるSort / Filter境界; `tests/contracts/transactions.test.ts` — ReviewとSummaryのRollback | レビュー平均値の未丸め保存、表示用の丸め処理、ソート・フィルター境界値の判定 |
| CP-FORM-001 | NFR-AX-001/007、NFR-MA-012 | bounded-multi-ref | `tests/component/presentation-foundation.test.tsx` — `focuses an error summary and links each message to its field`（NFR-AX-001 / NFR-AX-007のError relationship、Error Summary focus、Summary linkから対象fieldへの移動）；`tests/unit/normalization-cart-catalog.test.ts` — `uses the shared NFKC, case, and whitespace rules`（NFR-MA-012のEmail normalizationを含むshared normalization）；`tests/integration/auth-account.test.ts` — `enforces shared input limits at Registration and Profile application boundaries`（NFR-MA-012のshared input limitsとApplication ErrorのVALIDATION / fieldErrors contract）；`tests/component/auth-account-pages.test.tsx` — `uses shared Signup limits for controls and rejects an over-limit display name`（NFR-MA-012のshared INPUT_LIMITS、signup control maxlength、over-limit rejection） | 共通入力上限、エラーサマリー、フィールドエラー（fieldErrors） |
| WE-TEST-INSP-001 | FR-TC-008、NFR-TS-007 | exact-title | `tests/integration/seeds.test.ts` — `limits mutable controls and returns fixed inspection DTOs` | 固定の読み取り専用インスペクションDTOのみの公開 |
| CT-ADDRESS-001 | FR-AU-006/010/016 | exact-title | `tests/integration/auth-account.test.ts` — `keeps exactly one default address and deterministically reassigns it` | 初回デフォルト設定、デフォルト住所の切り替え、削除時の後継住所の決定的な選択 |
| CT-RESET-001 | FR-TC-001/006/009 | exact-title | `tests/integration/seeds.test.ts` — `resets the database and restores only the seed identities` | データベース、セッション、ゲストIDおよびシードゲストIDの一連のリセット手順による決定的な初期化 |
| CT-BOUNDARY-001 | FR-AR-001～004、NFR-MA-020～023 | bounded-multi-ref | **FR-AR-001:** `tests/contracts/architecture.test.ts` — `keeps Checkout Presentation Request separate from the internal Command`; `tests/integration/checkout-order-use-cases.test.ts` — `creates consistent snapshots and decrements stock exactly once after success`。**FR-AR-002:** `tests/contracts/image-manifest.test.ts` — `contains every seed reference as a local WebP under the size limit`; `binds StaticManifestRepository to the generated TypeScript module`; `pnpm run security:check` — `scripts/security-static-check.ts` runtime no-fetch gate。**FR-AR-003:** `tests/contracts/transactions.test.ts` — `keeps order, payment, shipment, and histories consistent`。**FR-AR-004:** `e2e/web/reset-boundary.spec.ts` — `resets one Browser Context while preserving the primary Page`; `package.json` — `test:e2e:chromium`への組込み。**NFR-MA-020:** `tests/integration/auth-account.test.ts` — `rejects overlong login credentials at the Application boundary`、`enforces shared input limits at Registration and Profile application boundaries`、`enforces shared address field limits at the Application boundary`; `tests/integration/checkout-order-use-cases.test.ts` — `revalidates checkout address text limits at the Application boundary`; `tests/integration/admin-master-use-cases.test.ts` — `enforces canonical Category and Brand name limits`; `tests/integration/admin-product-use-cases.test.ts` — `normalizes productCode and SKU across create/update and rejects normalized duplicates`。**NFR-MA-021:** `tests/contracts/architecture.test.ts` — `keeps Native entry points free of Web-only dependencies`、`keeps Web-only styles at the Web composition root`、`connects shared Native presentation to React Native primitives and shared tokens`; `tests/contracts/native-ci-workflow.test.ts` — `runs the Native platform-boundary enforcement gate in Native CI`; `pnpm run check:native-route-dependencies`。**NFR-MA-022:** `tests/contracts/architecture.test.ts` — `limits Web complex widgets to the four React Aria Components scope`。**NFR-MA-023:** `tests/contracts/architecture.test.ts` — `keeps D-026 Code authority and Markdown explanation responsibilities explicit`。 | リクエスト／コマンドの生成と消費の分離、マニフェストの整合性・バインド・no-fetch制約、注文DTOの射影、リセット境界、D-032バリデーション境界、D-033プラットフォーム分離、React Aria Components（RAC）の名前付きインポート、D-026コード権威の明確化 |
| CT-ACTION-VERSION-001 | FR-AU-006、FR-CH-020、FR-PY-008、FR-OR-005～007、FR-RV-004 | bounded-multi-ref | `tests/component/auth-account-pages.test.tsx` — Profileのhidden actionVersion; `tests/integration/checkout-order-use-cases.test.ts` — Checkout / Payment retryのversion受け渡し; `tests/integration/admin-operations-use-cases.test.ts` — Order / Shipment action versionとConflict; `tests/integration/review-user-use-cases.test.ts` — ReviewのexpectedVersion受け渡し | プロフィール／チェックアウト／注文／レビューにおけるアクションバージョン（actionVersion）の受け渡しと競合制御 |
| CT-CLOCK-CATALOG-001 | FR-PR-053 | exact-title | `tests/integration/catalog-use-cases.test.ts` — `uses the half-open sale end from Test Clock` | テストクロック（Test Clock）によるカタログ表示およびセール終了（半開区間）の判定 |
| CT-ORDER-PRICE-001 | FR-CH-020 | exact-title | `tests/integration/checkout-order-use-cases.test.ts` — `does not create an order when price or rank revalidation fails` | 注文作成トランザクションにおける価格・会員ランクの再検証失敗とロールバック |

第6章（§6）に記載した現行の下位トレーサビリティ代表ラベル（全22行）の再集計結果は、`exact-title`: 9件、`suite-level`: 6件、`bounded-multi-ref`: 7件、`stop`: 0件（合計22件）です。

## 7. 更新ルール

- 要件グループ（Requirement Group）を追加または変更した場合は、少なくとも1つのテストレベル（Test Level）へ割り当てること。
- E2Eテストを新規に追加する場合は、既存の12の業務フロー（Flow）へ統合できない妥当な理由を説明すること。
- 内部整合性の担保や網羅的な条件の組み合わせ検証を過度にE2Eへ持ち込まず、単体テスト（Unit）、アプリケーション統合テスト（Application）、契約テスト（Contract）での検証を優先すること。