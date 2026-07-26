# Use Case一覧

## 1. Phase 1

### 認証・アカウント

| Use Case | 主な処理 |
|---|---|
| RegisterUserUseCase | Password Hash、customer/regular/active作成、Session作成、Guest Cartがあれば同一Txで統合 |
| LoginUseCase | PBKDF2照合とactive状態検証後、customerはSession作成＋Guest Cart統合、operator/adminはSession作成のみを同一Txで確定。失敗時はLogin全体をRollback |
| LogoutUseCase | Session無効化 |
| GetCurrentUserUseCase | Session検証、active User取得 |
| UpdateProfileUseCase | Ownership・version確認、Profile更新 |
| List/Create/Update/DeleteAddressUseCase | 最大5件。Default削除時は次Default再割当を同一Txで実行 |
| SuggestAddressByPostalCodeUseCase | 同梱した学習用住所辞書から候補取得。未一致は空結果 |

### Storefront・Catalog・Master

| Use Case | 主な処理 |
|---|---|
| GetHomeCatalogUseCase | Clockの同一時刻とViewer条件で主要Category・Brand、新着、Saleを取得。Rank案内はCurrentUserと静的Ruleから表示 |
| SearchProductSuggestionsUseCase | 商品・Category・Brand候補をViewer条件付きで最大8件取得 |
| SearchProductsUseCase | Viewer条件、Filter、Facet件数、Sort、Page |
| GetProductDetailUseCase | 閲覧条件、SKU、Image、未丸めReview Summary・分布を取得し、表示層で平均を小数第1位へ丸める |
| SearchAdminProducts/GetProductForAdminUseCase | Admin商品一覧のFilter/Sort/Pageと商品編集DTOを取得。商品一覧の在庫状態はactive SKU合計在庫で判定 |
| ListProductReviewsUseCase | published ReviewをSort・Page |
| CreateProductAggregateUseCase | Clockを1回取得し、Productをdraft・publishedAt未設定で生成。SKU、画像参照、初期在庫履歴、0件Review Summaryを同一時刻・同一Txで作成し、status入力は受け取らない |
| UpdateProductAggregateUseCase | Clockを1回取得し、Productの編集可能項目、SKU構成・価格・画像参照を同一時刻・同一Txで更新。status・publishedAt・既存在庫・Review Summaryは更新対象外 |
| PrepareProductDuplicateUseCase | active SKU構成・active画像・商品情報を新規登録Form DTOへ転記。Code/SKU空、在庫0。DBへ保存しない |
| PreviewProductUseCase | 未保存Form DTOを編集画面内Dialog/Overlay用DTOへ変換しDBへ保存しない |
| ListImageAssetsUseCase | GitHub管理の静的Manifestから選択可能画像Assetを取得 |
| ChangeProductStatusUseCase | 公開条件・状態遷移検証。初回公開時だけpublishedAtを設定 |
| BulkChangeProductStatusUseCase | 選択商品の公開/非公開だけを一括変更 |
| DeleteDraftProductUseCase | Cart/Order/Review参照のないdraft AggregateをSKU・画像関連・初期在庫履歴・0件Review Summaryとともに削除。Asset Binaryは削除しない |
| Create/Update/ReorderCategoryUseCase | Createはactive固定で末尾へ追加（0件時10、既存時max+10）。Updateは名称、Reorderは全Categoryを10刻みで再採番 |
| ChangeCategoryActiveStateUseCase | 状態変更専用。公開商品参照を同一Transactionで検証 |
| Create/UpdateBrandUseCase | Createはactive固定。名称・一意性を検証。表示順は名称順固定 |
| ChangeBrandActiveStateUseCase | 状態変更専用。公開商品参照と名称一意性を検証 |
| SearchAdminCategories/SearchAdminBrandsUseCase | Master一覧のFilter/Sort/Pageを取得 |

### Cart・Checkout

| Use Case | 主な処理 |
|---|---|
| GetCartUseCase | 最新価格・在庫・公開・権限を再検証、送料無料不足額を計算 |
| AddCartItemUseCase | Session/Guest Identityからownerを解決し、active Cartの取得または作成、既存明細加算または新規作成、上限検証、親Cart version更新を同一Txで行う。初回追加にCart Versionを要求しない |
| UpdateCartItemQuantityUseCase | Cart明細を絶対数量へ変更。0は削除へ委譲し、親Cart versionを同一Txで更新 |
| RemoveCartItemUseCase | 明細削除と親Cart version更新を同一Txで行う |
| MergeGuestCartUseCase | 会員Cart基準で合算、上限超過分と購入不可明細を除外し、結果を同一Txで確定 |
| AcceptCartPriceChangesUseCase | 最新価格承認と親CartのupdatedAt/version更新を同一Txで行う |
| StartCheckoutUseCase | customer・Cart検証。同一Cart/VersionはSession再開、異なるactive Sessionはabandoned後に新規作成 |
| SetCheckoutAddressUseCase | 配送先Snapshot保存 |
| SetCheckoutPaymentMethodUseCase | Test支払方法保存 |
| GetCheckoutConfirmationUseCase | Cart version、価格、在庫再検証 |
| ExpireCheckoutSessionsUseCase | App起動、Checkout Guard、StartCheckout時に24時間超過をexpiredへ変更 |

### Payment・Order

| Use Case | 主な処理 |
|---|---|
| CreateOrderForPaymentUseCase | Tx内で現在価格・在庫・Cart/Checkout Versionを再検証し、差異がなければOrder/Items/Payment作成、Cart consumed、日次採番 |
| ProcessPaymentUseCase | DB外Local Mock呼出し |
| FinalizePaymentResultUseCase | Gateway結果受領後にClock時刻を1回取得し、成功なら在庫減算・paid、失敗ならpayment_failed。同一時刻をPayment/Historyへ保存 |
| ResumeProcessingPaymentUseCase | 完了済みなら既存結果を返し、processingならorderId・所有権を検証して同じAttempt Keyで再実行。Conflict後は最新結果を再取得 |
| RetryPaymentUseCase | failedだけ新Attempt作成 |
| ListMyOrders/GetOrderDetailUseCase | customer本人の注文一覧・Snapshot詳細を取得 |
| GetAdminOrderDetailUseCase | 管理権限確認後、注文Snapshotと顧客概要を取得 |
| SearchAdminOrdersUseCase | 注文番号、顧客、状態、期間、合計で管理一覧を検索 |
| StartOrderPreparationUseCase | paid→preparing、Shipment pending作成 |
| ShipOrderUseCase | Order/Shipmentをshippedへ同時更新 |
| CompleteDeliveryUseCase | Order/Shipmentをdeliveredへ同時更新 |

### Review・Administration

| Use Case | 主な処理 |
|---|---|
| GetReviewEligibilityUseCase | Ownership・delivered・重複確認 |
| Create/Update/DeleteReviewUseCase | ReviewとSummary・評価分布を同時更新 |
| SearchAdminReviewsUseCase | 全状態のReviewをFilter・Sort・Pageで検索 |
| ChangeReviewVisibilityUseCase | published/hidden変更とHistory・Summaryを同時更新 |
| BulkChangeReviewVisibilityUseCase | 選択Reviewの非公開/再公開だけを一括変更 |
| GetAdminOverviewUseCase | 準備待ち、低在庫、非公開Review、最近のOrderを取得 |
| List/AdjustInventoriesUseCase | 在庫変更・履歴 |
| List/GetUsersForAdminUseCase | User検索・詳細 |
| ChangeMembershipRankUseCase | customerのRank変更とactive Checkout abandonedを同一Txで実行。Cartは保持 |
| ChangeOperatorAdminRoleUseCase | operator/admin間だけ変更し、最後のadmin・自己変更を保護して全Session無効化 |
| ChangeAccountSuspensionUseCase | active/suspended間だけ変更し、最後のadmin・自己停止を保護して全Session無効化。customer停止時はactive Checkoutもabandoned |

### Test Control

| Use Case | 主な処理 |
|---|---|
| ResetDatabaseUseCase | App DB、Current Session、Guest Identityを削除し、指定SeedとSeed Guest IDを再設定 |
| LoadSeedUseCase | 固定Scenario投入 |
| SetTestClockUseCase | Clock固定・解除 |
| SetPaymentDelayUseCase | Local Mock Delay設定 |
| GetTestMetadataUseCase | App/Schema/Seed/Clock取得 |
| InspectOrder/Variant/ReviewSummaryUseCase | Automation Build限定の固定Read-only DTO取得 |

## 2. Phase 2で追加

- ChangePasswordUseCase、WithdrawAccountUseCase
- Guest Checkoutは学習価値を再評価して追加判断
- CancelOrderUseCase、Request/DecideCancellationUseCase
- Request/Decide/ReceiveReturnUseCase
- Request/ProcessRefundUseCase
- Native Test ControlとSQLite Adapter
- ListAuditLogsUseCase

## 3. Phase 3で追加検討

- ReconcilePaymentUseCase、Gateway Ledger関連
- Export/ImportDatabaseUseCase
- ValidateDatabaseIntegrityUseCase
- RetryMigrationUseCase
- Recommendation、Coupon、Pointは明確な教材要件がある場合だけ追加
