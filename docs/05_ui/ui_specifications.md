# UI詳細仕様

Page構造は`page_patterns.md`、表示文言は`ui_content_dictionary.md`を正本とします。

## 1. 共通状態

全Data画面に必要な範囲でLoading、Empty、Success、Validation Error、Operation Error、Conflict、Not Found、Forbiddenを定義します。すべての画面へ一律に不要な状態を増やしません。

- Headerに小さなTest Mode Badgeを表示する。
- 実取引なし・実在情報禁止はLogin、Signup、Cart、Checkoutで目立つNoticeとして再掲する。
- 重要な結果はToastだけでなく画面内へ残す。
- 送信中はButtonをdisabled/loadingにし、二重操作を防ぐ。
- UIは日本語辞書を参照し、`payment_failed`などの内部値を露出しない。

## 2. Home

- Hero、主要Category、新着商品、Sale商品、会員Rank案内。
- HeroのPrimary Actionは全商品一覧へ移動する。
- Categoryは最大6件、商品Sectionは各最大8件。
- Sale商品0件では空Sectionを表示しない。
- 商品Cardは画像、Brand、商品名、価格、Sale/会員表示、評価、在庫状態を表示する。

## 3. 商品一覧・検索・Category

- 結果Title、結果件数、Search、Category、Brand、価格帯、在庫、Sale、最低評価、Sort、Page。
- 適用済み条件をChipで表示し、個別解除と全解除を提供する。
- DesktopはFilter Sidebar即時反映、MobileはBottom Sheetでまとめて反映する。
- Filter候補に件数を表示する。
- 0件時は検索語変更、Filter解除、全商品、主要Categoryへの導線を表示する。
- 詳細画面から戻った場合、条件、Page、Scroll位置を復元する。
- Search Suggestionは商品、Category、Brandを最大8件表示する。商品は`/products/[productId]`、Categoryは`/categories/[categoryId]`、Brandは`/search?brand=[brandId]`、候補外Enterは`/search?q=...`へ遷移する。Request Sequence IDまたはAbortControllerで最新入力の結果だけを表示し、Route離脱時は結果を破棄する。

## 4. 商品詳細

- Breadcrumb、Brand、商品名、Rating Link、Gallery、説明、Variation、価格、会員価格、在庫、送料条件、数量、Cart追加、Review分布・一覧。
- GalleryはThumbnail、Main Image、拡大Dialogを持つ。
- Sale価格は通常価格を取消線表示し、値引率をTextで表示する。
- 会員価格が適用される場合は適用Rankと値引額を表示する。
- Variationは12件以下Button、13件以上Select。
- 在庫0は「在庫切れ」として選択不能またはCTA disabledにし、在庫1～5は「残りN点」の低在庫表示を行う。
- Mobileは価格・在庫・Cart追加をSticky Barへ表示する。
- Reviewは新着、評価が高い順、評価が低い順でSortする。

## 5. Login・Signup・Account

### Login

- Email、Password、Login Button、固定Account案内。
- suspended/withdrawnを通常認証失敗と区別して表示する。
- Login後にGuest Cart統合結果を表示する。
- Checkoutから遷移した場合、Loginが必要な理由と戻り先を表示する。

### Signup

- Email、Password、確認Password、表示名、学習用注意確認。
- 静的Policy Linkを表示するが、Version付き同意履歴は保存しない。

### Profile・Address

- Profileは表示名、電話番号。取得DTOの`actionVersion`を非表示で保持し、更新Requestへ渡す。
- Addressは一覧、追加、編集、削除、Default変更。最大5件。Default削除後にAddressが残る場合、createdAt昇順・id昇順の先頭を新Defaultにする。
- 郵便番号が学習用辞書に一致した場合だけ住所候補を提示する。自動確定しない。

## 6. Cart

- 明細ごとに商品画像、商品名、Variation、単価、数量、在庫状態、小計、削除。数量変更が上限を超えた場合は保存せず元の数量を維持する。
- 価格変更時は旧価格と新価格を表示し、確認Buttonを設ける。
- 購入不可明細は理由と削除Buttonを表示する。
- Summaryに商品小計、会員割引、送料、合計、送料無料不足額を表示する。
- Desktop SummaryはSticky、MobileはItem一覧後と必要に応じてSticky CTAを使用する。

## 7. Checkout

### 配送先

- 保存済みAddress選択と新規入力。
- Formは1列。必須/任意、電話番号の利用目的を表示する。
- 建物名は任意の展開Sectionとし、入力済みなら展開状態を維持する。
- 選択内容をSnapshotへ保存する。

### 支払方法

- `TEST-SUCCESS`、`TEST-DECLINED`、`TEST-INSUFFICIENT`、`TEST-AUTH-FAILED`をRadioで選択する。
- 実Card情報を入力しない注意を表示する。

### 注文確認

- 商品、配送先、Rank、割引、送料、合計、模擬取引注意を表示する。
- Cart version、価格、在庫を再検証する。`checkoutActionVersion`を非表示で保持し、注文確定Requestへ渡す。
- 注文確定Buttonは「注文を確定する（¥x,xxx）」とし、一度だけ実行できる。
- Desktopは右側Sticky Summary、Mobileは折りたたみSummary。

### 処理中

- 注文番号と「支払いを処理しています」を表示する。
- 画面離脱警告を出すが、再起動時は注文詳細で同じAttemptを再開できる。
- Cancel・再試行Buttonを表示しない。

### 結果

- 成功: 注文番号、合計、配送先概要、注文詳細Link、商品一覧Link。
- 失敗: Error種別、在庫は減っていないこと、注文詳細から再試行できる案内。

## 8. 注文一覧・詳細

### 顧客

- 一覧: 代表商品画像、注文番号、日時、合計、状態、詳細Link。状態Filterと新しい順Sort。
- 詳細: 「現在の状態」「次に行われること」「利用者ができること」、Snapshot、Payment Attempt、Timeline、Shipment。
- `payment_failed`だけ再支払いButtonを表示し、Order詳細の`orderActionVersion`をRequestへ渡す。
- `processing?orderId=...`はOrder所有権、Order pending_payment、最新Payment processingを検証して状態確認または再開処理を行い、再支払いButtonを表示しない。
- `delivered`のeligible ItemへReview CTAを表示する。

### 管理

- 注文番号、注文日時、顧客Email・表示名、商品Snapshot、金額内訳、配送先Snapshot、Payment、Shipment、Timelineを表示する。
- `paid`: 「発送準備を開始」Button。各状態変更はOrder詳細の`orderActionVersion`を使用し、成功後DTOの新Versionへ更新する。
- `preparing`: 配送会社・追跡番号入力と「発送する」Button。
- `shipped`: 「配送完了にする」Button。
- そのほかは状態に応じて操作不可理由を表示する。

## 9. Review

- deliveredのeligible明細だけ投稿Linkを表示する。
- Formは評価1～5のRadio Group、任意Title、必須本文最大1,000文字。既存Reviewがある場合は評価・Title・本文を初期表示し、取得したVersionで更新する。
- 管理一覧はpublished/hidden/deleted Filter、非公開・再公開を提供する。Phase 1では状態変更理由を入力せず、状態履歴のreasonTextはnullとする。
- 商品詳細では平均、件数、1～5別分布、Sort、Pageを表示する。平均は保存済み未丸め値を小数第1位へ丸めて表示する。

## 10. Admin Shell・Overview

- Side Navigation、Breadcrumb、Page Header、Main Contentを共通化する。
- Overviewに発送準備待ち件数、低在庫SKU件数、非公開Review件数、最近の注文、Quick Actionを表示する。低在庫SKU件数はactive SKUの在庫1～5だけを数え、在庫0は含めない。
- 売上、Conversion、前年対比、Chartは表示しない。

## 11. 管理一覧

- Title、Primary Action、Search、Filter、Sort、適用Filter、Table、Pagination。
- Filterで0件とData自体が0件のEmpty Stateを分ける。
- 商品一覧の在庫Filterはactive SKUの合計在庫を商品単位で判定し、0を在庫切れ、1～5を低在庫、1以上を在庫ありとする。SKU単位の状態は在庫一覧で確認する。
- 商品一覧は公開/非公開、Review一覧は非公開/再公開だけBulk Actionを提供する。
- Bulk結果は成功・失敗件数と対象Linkを画面内へ表示する。

## 12. 管理詳細・編集

### 商品

- Main: 基本情報、説明、Variation/SKU、価格、在庫参照、GitHub画像Asset関連。既存SKUの在庫は読取専用とし「在庫を調整」Linkを表示する。
- Aside: 公開状態、Category、Brand、会員制限、更新情報。
- 未保存変更がある間だけContextual Save Barを表示する。
- Preview、保存、破棄、未保存離脱警告を提供する。Previewは未保存Form Dataを使用し、独立Routeへ遷移せず編集画面内のDialog/Overlayで開く。商品名、Category、Brand、active SKU 1件以上などdraft保存に必要な最小Validationを満たすまでPreviewを無効化し、Close後は元のFormとFocusを保持する。
- 既存商品では「複製」Buttonを提供し、新規登録Formへ遷移してactive SKU/画像と商品情報を事前入力する。遷移時点ではDBを変更せず、商品Code/SKUは未入力、初期在庫は0とする。
- SKUは追加、価格・上限変更、無効化、条件付き削除ができる。新規SKUだけ初期在庫を入力できる。Product Code/SKUが変更不可になった場合は読取専用表示と理由を示す。
- draft商品のDanger Zoneに削除Buttonを置き、削除可否と削除対象を確認Dialogへ表示する。
- 状態ActionはState Machineに合わせる。draftは「公開」、publishedは「非公開」「販売終了」、unpublishedは「再公開」「販売終了」、discontinuedは読取専用とし復元Actionを表示しない。状態変更は未保存Formの保存とは別操作で、未保存変更がある場合は先に保存または破棄を要求する。

### Category・Brand

- Categoryは一覧、追加、編集、並べ替え、有効/無効を提供する。Brandは一覧、追加、編集、有効/無効を提供する。作成時はactive固定とし、Categoryは末尾へ追加（0件時10、既存時max+10）、通常編集と状態変更を別Actionにする。
- Categoryの並べ替えModeではFilter・Paginationを解除して全Categoryを表示し、Dragと上下Buttonを提供する。保存時はorderedIdsが全Category IDと一致することを検証し、sortOrderを10刻みで再採番する。Brandは名称順固定で並べ替えModeを持たない。
- 公開商品参照中は無効化Buttonをdisabledにせず、実行時に対象件数と解消方法を含むErrorを表示する。

## 13. 在庫

- SKU、商品名、現在庫、在庫状態、更新日時を表示する。在庫状態は0を「在庫切れ」、1～5を「低在庫」、6以上を通常表示とする。
- 調整量と理由を入力し、変更前後を確認Dialogへ表示する。

## 14. User管理

- adminだけ利用可能。
- Email、Role、Rank、Statusで検索する。
- Rankはcustomer内、Roleはoperator/admin間、Statusはactive/suspended間だけ変更でき、最後のadmin・自己変更保護Errorを表示する。withdrawnとcustomer Roleは読取専用。Phase 1では変更理由を入力しない。
- 詳細Audit閲覧はPhase 2以降。

## 14.1 管理一覧の固定条件

| Resource | Search | Filter | Sort |
|---|---|---|---|
| 商品 | 商品名、商品Code、SKU | 状態、Category、Brand、会員Rank、在庫有無 | 更新日、商品名、最小価格 |
| Category | 名称 | active | 表示順、名称 |
| Brand | 名称 | active | 名称、更新日 |
| 在庫 | 商品名、SKU | 低在庫（1～5）、在庫0、在庫あり（1以上）、active | 在庫昇順、更新日 |
| 注文 | 注文番号、顧客Email | 状態、注文日 | 新しい順、古い順、合計 |
| User | Email、表示名 | Role、Rank、Status | 登録日、更新日 |
| Review | 商品名、投稿者 | 状態、評価 | 新着、評価高、評価低 |

Category/Brand Filterは複数選択時に同一Facet内ORとします。Bulk Actionは現在ページで選択した最大50件だけを対象とし、検索結果全件選択は提供しません。対象ごとに独立Transactionで処理し、成功・失敗を個別表示します。

## 15. Test Control

- Seed選択、Reset、Clock固定/解除、Payment Delay設定、Version表示。
- 実行前に確認Dialogを表示する。
- 任意Data編集、Import/Export、任意Faultは提供しない。

## 16. 画像

- GitHub管理のAsset Catalogからactive画像を検索・選択する。Local File Uploadと外部URL入力は提供しない。
- 既存関連のinactive Assetは「廃止済み」と表示して維持できるが、解除後は再選択できない。
- Product関連付けは最大3枚。最初の画像は自動Primary、Primary解除時は先頭へ自動再割当する。Primary選択、関連解除、順序変更、Alt Text必須。
- inactive Assetは新規候補に出さないが、既存関連では「現在は選択対象外」と表示して継続表示する。
- 読込失敗時はPlaceholderとTextを表示する。
- 並べ替えはDragと上下Buttonを提供する。
- 新しい画像を追加する手順として「GitHub Repositoryへ画像を追加して再デプロイしてください」という管理者向けHelpを表示する。

## 実装基盤

- Form管理はReact Hook Form、Schema ValidationはZodを使用する。
- Shared Storefront UIはReact Native ComponentとStyleSheetを基本とする。
- Admin TableやWeb固有Layoutは`.web.tsx`とCSS Modulesを使用し、Tableはsemantic HTMLで実装する。
- Dialog、Popover、Comboboxなど複雑なWeb WidgetはReact Aria Componentsへ限定し、独自Headless実装を増やさない。
