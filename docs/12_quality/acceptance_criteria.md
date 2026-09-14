# Phase 1受入基準

## 1. 基盤

- Expo WebがDomain/Application/Repository境界を守って動作する。
- WebはDexie Repository Contractを通過する。
- boolean/nullをIndexedDB Index Keyへ使わず、isDefaultKey/isActiveKey/optionScopeKeyへの投影がContract Testを通過する。
- Domain Entity/Enumが`domain_types.md`、Core DTO/Input/Result/Error型が`application_contracts.md`と一致する。
- Storefront CatalogとAdmin全一覧QueryがSearch/Filter/Sort/PageをRepositoryで実行し、同順位時の最終Keyが契約どおりである。
- UIからDexieを直接呼ばない。
- Storefront ShellとAdmin Shellが分離される。
- 未使用のRefund、Gateway Ledger、Import/Recovery TableがPhase 1 Schemaに存在しない。

## 2. Auth・Permission

- guest/customerが`/cart`を閲覧・変更でき、Checkoutはactive customerだけ利用できる。operator/adminのCart利用は拒否される。
- operator/adminの購入RouteとUse Caseが拒否される。
- Rank、Account Status、Ownership、最後のadmin保護がUse Caseで強制される。
- activeなcustomer/operator/adminがLoginでき、customerだけGuest Cart統合を行い、operator/adminはSessionだけを作成する。operator/adminのStorefront閲覧条件はguest相当である。
- suspended/withdrawn AccountがLoginできない。
- Profile取得DTOが電話番号と`actionVersion`を返し、更新後にも新しい`actionVersion`を返す。
- 最初の配送先が自動Defaultとなり、更新だけでDefault 0件にならず、別住所のDefault指定とDefault削除時のcreatedAt/id順後継選択が同一Txで決定的に行われる。
- Login/RegisterはCurrentSessionStore設定成功後だけDB Txを開始する。customerはSession作成とGuest Cart統合、operator/adminはSession作成だけを単一Txで行う。Tx失敗時はpointerをclearし、Sessionを作らずGuest Cartを保持する。
- Password HashがPBKDF2の固定Formatで生成・照合され、平文がDB/Logへ残らない。

## 3. Home・Search・Catalog

- Home、全商品、検索結果、Category別一覧が別Routeとして動作する。
- Search Suggestionが最大8件、Keyboard操作、Enter検索、Escape閉鎖に対応し、古いRequest結果が新しい入力を上書きしない。商品候補は商品詳細、Category候補はCategory一覧、Brand候補はBrand Filter適用済み検索結果、候補外EnterはKeyword検索へ遷移する。
- Viewer条件適用後のtotal/page/facetが正しい。
- Category Facetが1階層Categoryの表示名と件数を返し、Viewer条件適用後の商品件数と一致する。
- Home Catalog DTOがViewer条件適用済みのCategory/Brand表示名・商品件数、新着最大8件、Sale最大8件を返し、件数0のNavigation項目を除外し、新着は初回publishedAt順で再公開により移動しない。在庫切れの公開商品も商品Sectionへ含み、購入不可状態を表示する。
- Home、Navigation、商品検索・候補・詳細、管理商品一覧・詳細のSale判定がTest Clockの固定時刻と一致し、Repositoryが実時計を直接参照しない。
- Applied Filterの個別解除・全解除とMobileまとめ適用が動作する。
- Sort同順位がproductCodeで安定する。
- 詳細から戻った際にQuery、Page、Scroll位置が復元される。
- Category/Brand参照中の無効化を拒否する。Category一覧・Facet・Navigationは1階層Categoryとして同じ件数を表示する。
- Category/Brandの通常編集ではisActiveを変更できず、専用状態変更Use Caseでだけ有効/無効を切り替える。作成時はactiveとする。
- Category/Brand/Variationの重複判定が共通Normalization Keyへ集約され、Web内の全登録・更新経路で同じ結果になる。
- 商品Aggregateの作成・更新・削除が定義したTransactionと参照Ruleに従い、作成時に0件Review Summary、更新Txに必要なINITIAL_STOCK履歴、削除時に0件Review Summaryの削除を含む。商品更新Txは既存Review Summaryを変更しない。
- 商品AggregateのCreate/UpdateでClockを1回だけ取得し、Product、SKU、画像関連、INITIAL_STOCK履歴へ同一時刻を保存する。Create時は0件Review Summaryにも同じ時刻を使用し、Update時は既存Review Summaryを変更しない。
- draftを含む商品Aggregateがactive SKUを1件以上保持し、Variationなしはactive SKUちょうど1件、Variationありは1件以上である。管理一覧の最小・最大価格がnullにならない。
- 商品Aggregate作成は必ずdraft・publishedAt未設定となり、Aggregate更新でstatus/publishedAtを変更できず、状態変更Use Caseだけが公開状態と初回publishedAtを更新する。
- 商品状態Actionはdraft→published、published→unpublished/discontinued、unpublished→published/discontinuedだけを許可し、discontinuedは終端である。未保存編集と状態変更を同時実行しない。
- Product Code/SKUの変更可否とPrimary画像自動割当が業務Ruleどおり動作する。
- productCode/SKUの小文字・全角入力が正規化され、正規化後重複を拒否し、DB・画面・検索で同じ大文字値を使用する。
- 商品複製操作はDBを変更せず、新規登録Formへactive SKU/画像と商品情報を転記し、Code/SKU空・初期在庫0とする。保存後は通常の商品作成契約が適用される。
- 新規SKUはactive固定で追加され、保存済みSKUの価格変更・無効化・条件付き削除が動作し、`INITIAL_STOCK`以外の在庫履歴があるSKUは削除できず、既存在庫を商品編集から変更できない。
- GitHub画像Assetを選択・関連解除・Primary変更・並べ替えでき、画像0件はdraftだけ、1件以上はPrimaryちょうど1件、同一assetId重複不可である。BrowserからGitHubへ書き込まない。Release済みAssetは物理削除せず、既存inactive関連は維持できるが再関連付けできない。
- 商品詳細でGallery、価格階層、Variation、送料条件、Review分布が正しい。
- Review SummaryはpublishedCount=0でratingAverage=0、それ以外はratingTotal / publishedCountを未丸め保存し、表示だけ小数第1位へ丸め、評価Sort・Filterは未丸め値を使用する。
- Variation 12件/13件でButton/Select境界が正しい。

## 4. Price・Stock・Cart

- regular/gold/platinumの価格・送料がSeed期待値と一致する。
- 送料無料不足額と達成表示が正しい。
- 価格・在庫・公開・権限・Cart versionを再検証する。
- Payment成功時だけ在庫が1回減算され、失敗時は変わらない。
- Login/Register、商品Aggregate・公開状態・Category/Brand無効化、在庫調整、User Access、Order作成、Payment確定、Shipment、Review集計の複数Repository更新がApplicationTransactionRunnerで単一Txとなる。
- Cartの追加、数量変更、上限超過拒否、明細削除が正しく、各変更で親Cart versionが1回増加する。
- 新規Guest/customerが商品詳細からCart Versionなしで最初の商品を追加でき、active Cart取得または作成と明細追加が同一Transactionで完了する。
- Guest Cart統合が会員Cart基準、許容上限、購入不可除外Ruleに従い、SKU単位結果が画面内へ残る。
- 複数SKU商品の価格幅、価格Filter、SortがViewer価格Ruleと一致する。
- 管理商品一覧の在庫Filterはactive SKU合計在庫で判定し、0=在庫切れ、1～5=低在庫、1以上=在庫ありとなる。SKU単位の混在状態により商品判定が変わらない。
- Cart ItemのunitEffectivePriceAtAddがSale適用後・会員割引前で、Cart表示と注文確定時に現在RankからSKU単価単位で割引を再計算する。単価割引はfloorし、Order.discountAmountが全Order Item.lineDiscountAmountの合計と一致する。
- Cart画面はCartDtoだけで商品名、画像、追加時/現在価格、最大数量、明細問題を表示できる。

## 5. Checkout

- Userごとのactive Checkout Sessionが最大1件で、同一Cart/Versionは復元する。Cart変更時はSessionを即時更新せず、Route Guard・確認・注文確定でVersion不一致を検出してCartへ戻し、次回Checkout開始時に旧Sessionをabandonedへ変更する。App起動・Route Guard・Checkout開始時に24時間期限切れを判定する。
- 会員ランク変更時はactive Checkoutが同一Txでabandonedとなり、Cartを保持して新ランクで再確認できる。
- address/payment/confirmの直接URLは不足段階へ戻る。processing/complete/failedはorderId、所有権、Order/Payment状態を検証する。
- Formは1列、必須/任意と電話番号の用途を表示する。
- 郵便番号候補はSeed辞書一致時だけ提示し、利用者が適用を選択できる。
- Error SummaryへFocusし、Field Linkが動作する。
- Desktop Sticky SummaryとMobile折りたたみSummaryが操作可能である。
- 注文確定Buttonに合計金額が表示され、CheckoutConfirmationDtoの`checkoutActionVersion`で注文確定Requestを構築できる。
- 注文作成Tx内でCart Itemの追加時単価と現在単価を再比較し、価格差異時はOrder/Paymentを作らずCartへ戻す。
- Order作成時にCartがconsumed、Checkoutがconvertedになる。
- 二重Submitで複数Orderを作らない。

## 6. Payment・Order

- Gateway呼出し中にApp DB Txを保持しない。
- TEST-SUCCESS候補後、在庫が十分な場合だけPayment succeeded、Order paid、在庫減算、Historyが1回だけ確定する。
- 最終在庫不足ではPayment/Orderがfailedとなり、在庫とHistoryが変わらない。
- 明確失敗でPayment failed、Order payment_failed、在庫不変となる。
- payment_failed Orderから、OrderDetailDtoの`orderActionVersion`を使用して新Attemptで再Paymentできる。
- processing中は再試行・Cancelできず、`/checkout/processing?orderId=...`再読込後に同じAttemptを再開できる。完了済みPayment結果はGatewayを再実行せず既存結果を返す。
- Payment Gatewayは時刻を返さず、結果受領後にApplication Clockから取得した同一時刻がPayment processedAtとOrder/Payment Historyへ保存される。
- 注文完了画面に注文番号、合計、配送先概要、次のActionが表示される。
- 注文詳細に注文日時、商品、SKU有効単価、単価割引、明細小計・割引・合計、商品小計、会員割引、送料、合計、会員ランクSnapshot、配送先Snapshot、Payment、Shipment、現在状態、次に行われること、利用可能Action、Timelineが表示される。
- admin注文詳細に顧客Email・表示名と注文Snapshotが表示される。
- `paid → preparing`をAdminOrderDetailDtoの`orderActionVersion`でStartOrderPreparationUseCaseへ渡して実行でき、更新後DTOの新Versionで続けて発送・配送完了操作を行える。
- Order/ShipmentがApplicationTransactionRunnerの同一Txでshipped/deliveredになり、途中失敗で片方だけ更新されない。
- 日次Order Numberが重複しない。

## 7. Review

- deliveredの本人Order Item 1件につき1件だけ投稿でき、論理削除後も再投稿できない。
- 星評価をKeyboardで選択できる。
- ReviewEligibilityDtoが既存Reviewの評価・Title・本文・Status・Versionを返し、published/hidden Reviewを初期表示して編集できる。
- Review作成・編集・削除・非公開・再公開でSummaryと評価分布が同時更新される。
- publishedだけ商品表示へ集計される。

## 8. Admin UX

- Admin Side Navigation、Breadcrumb、Page Headerが全管理画面で一貫する。
- Overviewに発送準備待ち、低在庫、非公開Review、最近の注文、Quick Actionが表示される。低在庫はactive SKUの在庫1～5だけを数え、在庫0は在庫切れとして除外する。
- 管理一覧がSearch、Filter、Sort、Applied Filter、Table、Paginationの共通構造を持つ。
- Data 0件とFilter 0件のEmpty Stateが異なる。
- Bulk Actionは商品公開/非公開、Review非公開/再公開だけに限定される。
- Bulk Actionは現在ページの選択行だけを最大50件まで対象とし、検索結果全件選択を提供せず、結果が成功/失敗件数として表示される。
- 商品編集で未保存時だけContextual Save Barが表示され、未保存Previewを編集画面内Dialog/Overlayで確認し、保存・破棄・離脱確認が動作する。Previewはdraft保存の最小Validationを満たす場合だけ実行でき、画像0件ではPlaceholderを表示する。
- Rankはcustomer内、Roleはoperator/admin間、Statusはactive/suspended間だけ変更でき、理由入力を要求せず、最後のadmin・自己変更保護と全Session無効化が動作する。customer停止時はactive Checkoutを破棄してCartを保持する。withdrawnとcustomer Roleは読取専用である。
- Category/Imageの並べ替えをDragなしでも完了できる。Categoryは全件を並べ替えModeで表示し、orderedIds不足を拒否して10刻みで再採番する。Brandは名称順固定である。
- 新規Categoryは0件時sortOrder=10、既存時max(sortOrder)+10で末尾へ追加され、最大値取得と保存が同一Transactionで行われる。

## 8.1 Cross-role Scenario

- 同一Browser Contextでadminが商品を登録・公開し、customerが検索・Cart変更・購入できる。
- adminが当該Orderを配送完了へ進め、customerがReviewを投稿できる。
- operator/admin切替時にSession/Navigation/Permissionが正しく更新され、IndexedDBの業務Dataは保持される。

## 9. Testability

- Seed Catalogの固定ID・金額・Cart統合・Checkout・Image Asset期待と実Dataが一致する。
- ResetがDB、Current Session、Guest Identityを初期化し、指定Seedを投入してSeed Guest IDをLocal Storageへ再設定する。
- ClockとPayment Delayを固定・解除できる。
- Test APIの書込みがReset、Scenario Seed、Clock、Payment Delayに限定され、読取りがMetadataと固定Read-only Inspection DTOに限定される。任意Table、任意Query、任意条件、任意書換え、Script実行、外部Fetchを提供しない。

## 10. UI・Accessibility

- 主要画面に必要なLoading/Empty/Error/Conflict/Not Foundが定義される。
- UI表示名がContent Dictionaryと一致し、内部状態値を露出しない。
- Web主要購入FlowをKeyboardで完了できる。
- Search Combobox、Rating Radio Group、Error Summary、Dialog、Filter SheetがKeyboard/Screen Reader操作可能である。
- Errorを色だけで表現せず、Label/Roleを付ける。
- 360pxのStorefrontで2列商品Gridと主要CTAが操作可能である。
- 1024px以上の管理画面が操作可能である。

## 11. Automation・Deployment

- Unit、Application Integration、Dexie Contractが成功する。
- `e2e-chromium` matrixの全legが成功する。`required` legは`pnpm run test:e2e:chromium`で`e2e/web/phase1-required.spec.ts`と`e2e/web/ui-ux-improvements.spec.ts`を`chromium` projectで実行し、`e2e_design.md`のWE-CORE-001〜WE-CORE-012はbusiness-flow mappingとして追跡する。
- `pnpm run build:web`が画像Manifest生成・検証を必ず実行し、Image Manifest検証、Release済みAsset append-only検証、GitHub Token非混入Checkが成功する。Cloudflareも同じCommandを使用する。
- Cloudflare Production Deploy後のSmokeが成功する。
- E2E失敗ArtifactへScenario、Clock、Delay、Versionを含める。

## 12. Documentation

- Requirement GroupとTest SuiteのTraceabilityが更新される。
- Phase 1の未確定事項がDecision Logに残っていない。
- 実装と正本文書の状態名、Error Code、Route、UI表示辞書が一致する。
- `domain_types.md`、`application_contracts.md`、`repository_interfaces.md`のTypeScript契約がSemantic Compileできる。
- Dexie Schemaでboolean/nullをIndex Keyとして使用せず、DomainとPersistence ProjectionのContract Testが通る。
- 注文作成ではBuild生成画像CatalogからPathをTransaction開始前に解決し、Transaction内で現在のPrimary assetIdと照合してAlt TextをSnapshotする。
- Native/SQLiteのCurrent CI contractとWeb Phase 1受入基準の境界が明示される。Native変更時の保証はAndroid Build + Runtime、iOS Build-onlyとし、iOS Runtime / Simulator / Maestro PASSは保証しない。

## 13. Web Phase 1対象外

Web Phase 1受入基準へNative Runtime / Maestro Flowを統合しません。Native変更時のNative CIは別contractとしてAndroid Build + Runtime、iOS Build-onlyを検証します。iOS Runtime / Simulator / Maestro PASSは保証しません。Guest Checkout、Cancel/Return/Refund、Payment Unknown/Reconciliation、Import/Export、Migration Recovery、Public Demo分離、Wishlist、Recommendation、Coupon、Point、売上Chartは受入基準へ含めません。

## 実装境界Gate

- Presentation RequestにCurrent User/Role/Rank、Actor、Guest ID、Clock、生成ID、Manifest解決値が含まれない。
- Build生成Manifest ModuleだけをRuntimeで使用し、Runtime Fetchが発生しない。
- Order詳細DTOにGateway Key、Repository Version、内部Actor IDが含まれない。
- Resetは1 Page条件で成功し、DB delete blocked時は明示的に失敗する。
