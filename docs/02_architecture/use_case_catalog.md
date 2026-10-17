# ユースケース一覧

## 1. Phase 1

### 認証・アカウント

| Use Case | 主な処理 |
|---|---|
| RegisterUserUseCase | パスワードをハッシュ化し、customer / regular / active の初期状態でユーザーおよびセッションを作成する。ゲストカートが存在する場合は同一トランザクション内で統合する。 |
| LoginUseCase | PBKDF2 によるパスワード照合と active 状態の検証後、customer はセッション作成とゲストカート統合、operator および admin はセッション作成のみを同一トランザクション内で確定する。失敗時はログイン処理全体をロールバックする。 |
| LogoutUseCase | セッションを無効化する。 |
| GetCurrentUserUseCase | セッションを検証し、active なユーザー情報を取得する。 |
| UpdateProfileUseCase | 所有権（本人確認）とバージョンを確認した上で、プロフィールを更新する。 |
| List/Create/Update/DeleteAddressUseCase | 配送先住所は最大5件まで保持。デフォルト住所の削除時は、次のデフォルト住所の再割り当てを同一トランザクション内で実行する。 |
| SuggestAddressByPostalCodeUseCase | 同梱の学習用住所辞書から候補を取得する。一致する候補がない場合は空の結果を返す。 |

### Storefront・Catalog・マスタ

| Use Case | 主な処理 |
|---|---|
| GetHomeCatalogUseCase | Clock から取得した同一時刻と閲覧者（Viewer）条件に基づき、主要カテゴリ、ブランド、新着商品、セール対象商品を取得する。会員ランク案内は現在のユーザー（CurrentUser）と静的ルールに基づいて表示する。 |
| SearchProductSuggestionsUseCase | 閲覧者条件を適用した上で、商品・カテゴリ・ブランドの候補を最大8件取得する。 |
| SearchProductsUseCase | 閲覧者条件、絞り込み（フィルタ）、ファセット件数、ソート順、ページネーションを指定して商品を検索する。 |
| GetProductDetailUseCase | 閲覧条件、SKU、画像情報、端数処理前のレビュー集計（Review Summary）および評価分布を取得し、表示層で平均値を小数第1位に丸める。 |
| SearchAdminProducts/GetProductForAdminUseCase | 管理者向け商品一覧のフィルタ・ソート・ページネーション処理、および商品編集用 DTO を取得する。商品一覧における在庫状態は、active な SKU の合計在庫数に基づいて判定する。 |
| ListProductReviewsUseCase | 公開中（published）のレビューを取得し、ソートおよびページネーションを行う。 |
| CreateProductAggregateUseCase | Clock から現在時刻を1回取得し、Product を draft 状態かつ publishedAt 未設定で生成する。SKU、画像参照、初期在庫履歴、0件状態のレビュー集計を同一時刻・同一トランザクションで作成し、外部からの status 入力は受け付けない。 |
| UpdateProductAggregateUseCase | Clock から現在時刻を1回取得し、Product の編集可能項目、SKU構成、価格、画像参照を同一時刻・同一トランザクションで更新する。status、publishedAt、既存在庫、レビュー集計は更新対象外とする。 |
| PrepareProductDuplicateUseCase | active な SKU 構成、有効な画像参照、商品情報を新規登録フォーム用 DTO に転記する。商品コード（Code）や SKU は空、在庫は 0 に設定し、データベースへの保存は行わない。 |
| PreviewProductUseCase | 未保存のフォーム用 DTO を編集画面内のダイアログ／オーバーレイ表示用 DTO に変換する。データベースへの保存は行わない。 |
| ListImageAssetsUseCase | GitHub で管理されている静的マニフェストから、選択可能な画像アセットの一覧を取得する。 |
| ChangeProductStatusUseCase | 公開条件および状態遷移の妥当性を検証する。初回公開時のみ publishedAt に日時を設定する。 |
| BulkChangeProductStatusUseCase | 選択した商品の公開・非公開ステータスのみを一括で変更する。 |
| DeleteDraftProductUseCase | カート（Cart）、注文（Order）、レビュー（Review）からの参照が存在しない draft 状態の商品集約（Product Aggregate）を、SKU、画像関連情報、初期在庫履歴、0件状態のレビュー集計とともに削除する。アセットの実体データ（Asset Binary）は削除しない。 |
| Create/Update/ReorderCategoryUseCase | 登録処理は active 状態固定で末尾に追加する（既存カテゴリが0件の場合は表示順を10、存在する場合は最大値+10）。更新処理ではカテゴリ名を変更し、並び替え処理（Reorder）では全カテゴリの表示順を10刻みで再採番する。 |
| ChangeCategoryActiveStateUseCase | 有効／無効の状態変更に特化した処理。公開中商品からの参照が存在しないかを同一トランザクション内で検証する。 |
| Create/UpdateBrandUseCase | 登録処理は active 状態固定とし、ブランド名の妥当性および一意性を検証する。表示順は名称順固定とする。 |
| ChangeBrandActiveStateUseCase | 有効／無効の状態変更に特化した処理。公開中商品からの参照の有無と名称の一意性を同一トランザクション内で検証する。 |
| SearchAdminCategories/SearchAdminBrandsUseCase | 各種マスタ一覧の取得において、フィルタ、ソート、ページネーション処理を行う。 |

### Cart・Checkout

| Use Case | 主な処理 |
|---|---|
| GetCartUseCase | 最新の価格、在庫状況、公開状態、ユーザー権限を再検証し、送料無料までの不足金額を計算する。 |
| AddCartItemUseCase | セッションまたはゲスト識別子（Guest Identity）からカートの所有者（owner）を特定し、有効なカート（active Cart）の取得または作成、既存明細への数量加算または新規明細作成、上限数検証、親カートのバージョン更新を同一トランザクション内で実行する。初回追加時にはカートのバージョンを要求しない。 |
| UpdateCartItemQuantityUseCase | カート明細を指定された絶対数量に変更する。数量が0の場合は削除処理へ委譲し、親カートのバージョン更新を同一トランザクション内で行う。 |
| RemoveCartItemUseCase | カート明細の削除と親カートのバージョン更新を同一トランザクション内で実行する。 |
| MergeGuestCartUseCase | 会員のカートを基準としてゲストカートの内容を合算し、上限超過分や購入不可となった明細を除外した上で、その結果を同一トランザクション内で確定する。 |
| AcceptCartPriceChangesUseCase | カート内商品の最新価格変動を承認し、親カートの更新日時（updatedAt）およびバージョンの更新を同一トランザクション内で実行する。 |
| StartCheckoutUseCase | 購入者（customer）およびカートの状態を検証する。同一カートかつ同一バージョンであれば既存のセッションを再開し、異なる active 状態のセッションが存在する場合はそれを破棄（abandoned）した後に新規セッションを作成する。 |
| SetCheckoutAddressUseCase | 配送先情報をスナップショットとして保存する。 |
| SetCheckoutPaymentMethodUseCase | テスト用の決済方法情報を保存する。 |
| GetCheckoutConfirmationUseCase | カートのバージョン、商品価格、在庫状況を再検証する。 |
| ExpireCheckoutSessionsUseCase | アプリケーション起動時、チェックアウトガード通過時、およびチェックアウト開始（StartCheckout）時に、作成から24時間を超過したセッションを期限切れ（expired）に変更する。 |

### Payment・Order

| Use Case | 主な処理 |
|---|---|
| CreateOrderForPaymentUseCase | トランザクション内で現在価格、在庫、カートおよびチェックアウトのバージョンを再検証し、差異がなければ注文（Order）、注文明細（Items）、決済（Payment）レコードを作成してカートを使用済み（consumed）に変更し、日次採番を行う。 |
| ProcessPaymentUseCase | データベーストランザクション外でローカルのモック決済処理を呼び出す。 |
| FinalizePaymentResultUseCase | 決済ゲートウェイからの結果受領後に Clock から現在時刻を1回取得し、成功時は在庫の減算と paid への更新、失敗時は payment_failed への更新を行う。この同一時刻を決済情報（Payment）および履歴（History）へ保存する。 |
| ResumeProcessingPaymentUseCase | 決済が完了済みの場合は既存の結果を返し、処理中（processing）の場合は orderId と所有権を検証した上で同一のアテンプトキー（Attempt Key）を用いて再実行する。競合（Conflict）が発生した場合は最新結果を再取得する。 |
| RetryPaymentUseCase | 決済失敗（failed）となった注文に対してのみ、新たな試行（Attempt）レコードを作成する。 |
| ListMyOrders/GetOrderDetailUseCase | 購入者（customer）本人の注文一覧、およびスナップショットを含む注文詳細を取得する。 |
| GetAdminOrderDetailUseCase | 管理者権限を確認した上で、注文スナップショットと顧客概要を取得する。 |
| SearchAdminOrdersUseCase | 注文番号、顧客情報、ステータス、注文期間、合計金額を指定して管理者向け注文一覧を検索する。 |
| StartOrderPreparationUseCase | 注文ステータスを paid から preparing（準備中）へ更新し、pending 状態の配送（Shipment）レコードを作成する。 |
| ShipOrderUseCase | 注文（Order）および配送（Shipment）のステータスを同時に shipped（発送済み）へ更新する。 |
| CompleteDeliveryUseCase | 注文（Order）および配送（Shipment）のステータスを同時に delivered（配達完了）へ更新する。 |

### Review・管理

| Use Case | 主な処理 |
|---|---|
| GetReviewEligibilityUseCase | 商品の購入履歴（所有権）、配達完了（delivered）状態、および既存レビューとの重複を確認し、レビュー投稿資格を判定する。 |
| Create/Update/DeleteReviewUseCase | レビューの登録・更新・削除と、対象商品のレビュー集計（Summary）および評価分布の更新を同時に行う。 |
| SearchAdminReviewsUseCase | 全ての公開状態のレビューを対象に、フィルタ、ソート、ページネーションを指定して管理者向けに検索する。 |
| ChangeReviewVisibilityUseCase | レビューの公開（published）／非公開（hidden）を切り替え、変更履歴（History）の記録とレビュー集計（Summary）の再計算を同時に更新する。 |
| BulkChangeReviewVisibilityUseCase | 選択したレビューの非公開または再公開の表示状態のみを一括で変更する。 |
| GetAdminOverviewUseCase | 発送準備待ちの注文、在庫僅少商品、非公開レビュー、直近の注文一覧を取得する。 |
| List/AdjustInventoriesUseCase | 在庫数量の変更および在庫履歴の取得を行う。 |
| List/GetUsersForAdminUseCase | 管理者向けにユーザー情報の検索および詳細取得を行う。 |
| ChangeMembershipRankUseCase | 購入者（customer）の会員ランク変更と、進行中のチェックアウトセッションの破棄（abandoned）を同一トランザクション内で実行する。カート内の商品は保持する。 |
| ChangeOperatorAdminRoleUseCase | ロール変更を operator と admin の間のみに限定し、最後の管理者（admin）の保護および自己権限変更の防止措置を施した上で、対象ユーザーの全セッションを無効化する。 |
| ChangeAccountSuspensionUseCase | アカウント状態を active と suspended の間のみで切り替え、最後の管理者（admin）の保護および自己停止の防止措置を施した上で、全セッションを無効化する。customer を停止した場合は、進行中のチェックアウトセッションも破棄（abandoned）する。 |

### Test Control

| Use Case | 主な処理 |
|---|---|
| ResetDatabaseUseCase | アプリケーションデータベース、現在のセッション、ゲスト識別子（Guest Identity）を削除し、指定されたシードデータおよびシード用ゲストIDを再設定する。 |
| LoadSeedUseCase | 固定のテスト用シナリオデータを投入する。 |
| SetTestClockUseCase | テスト用の仮想時刻（Clock）の固定および解除を行う。 |
| SetPaymentDelayUseCase | ローカルモック決済処理の応答遅延時間（Delay）を設定する。 |
| GetTestMetadataUseCase | アプリケーション環境、スキーマバージョン、投入済みシード、テスト用仮想時刻のメタデータを取得する。 |
| InspectOrder/Variant/ReviewSummaryUseCase | 自動テストビルド（Automation Build）限定で、注文、バリアント、レビュー集計の検証用読み取り専用 DTO を取得する。 |

## 2. Phase 2で追加

- ChangePasswordUseCase、WithdrawAccountUseCase
- ゲスト購入（Guest Checkout）は学習上の価値を再評価した上で導入可否を判断
- CancelOrderUseCase、Request/DecideCancellationUseCase
- Request/Decide/ReceiveReturnUseCase
- Request/ProcessRefundUseCase
- ネイティブ向けテスト制御（Native Test Control）と SQLite アダプター
- ListAuditLogsUseCase

## 3. Phase 3で追加検討

- ReconcilePaymentUseCase、決済ゲートウェイ台帳（Gateway Ledger）関連
- Export/ImportDatabaseUseCase
- ValidateDatabaseIntegrityUseCase
- RetryMigrationUseCase
- レコメンド（Recommendation）、クーポン（Coupon）、ポイント（Point）は明確な教材要件がある場合のみ追加を検討