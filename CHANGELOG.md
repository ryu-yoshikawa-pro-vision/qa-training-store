# Change Log

## v15

- Home新着商品期待値に公開中の在庫切れ商品を追加し、最大8件の表示Ruleと一致
- 管理商品一覧の在庫状態Filterをactive SKUの合計在庫で判定する方式へ統一
- Review平均値を未丸めで保存し、表示だけ小数第1位へ丸め、Sort・Filterも未丸め値を使用
- Seed Versionを10へ更新

## v14

- 低在庫を在庫1～5、在庫切れを0、在庫ありを1以上として要件・Filter・Overview・Test境界を統一。
- Cart変更ではCheckout Sessionを即時更新せず、Cart Version不一致をRoute Guard・確認・注文確定で検出し、次回Checkout開始時に旧Sessionをabandonedへ変更する契約へ統一。
- Runtime Manifest Recoveryを削除し、Manifest不整合はBuild失敗、個別画像読込失敗だけをPlaceholder表示する方針へ統一。
- CI/CD文書の固定Seed Versionを削除し、Build Metadataの`SEED_VERSION`をRelease Artifactの正本として参照する方式へ変更。

## v13

- `empty-catalog`で商品参照Dataをすべて削除し、User・Category・Brand・基盤Metadataだけを保持する参照整合Scenarioへ修正。
- `cart-with-invalid-items`からPhase 1対象外の欠損Variantを削除し、価格変更・非公開・在庫不足・無効SKUで構成。
- Search Suggestionの種別別遷移先を商品詳細、Category一覧、Brand Filter適用済み検索結果へ固定。
- Test APIを許可済み書込み操作と固定Read-only Inspectionへ分離。
- Review Summaryは商品作成時に0件行を作成し、商品更新では変更せず、Review変更時だけ再集計する契約へ統一。
- Seed Versionを9へ更新。

## v12

- 商品Aggregate作成・更新でUse CaseがClockを1回読み、Product、SKU、画像関連、INITIAL_STOCK履歴へ同一時刻を使用。商品作成時だけ0件Review Summaryにも同じ時刻を使用。
- 初回Cart追加から`cartExpectedVersion`を除外し、User/Guestのactive Cart取得または作成、既存明細加算または新規明細作成を同一Transactionで実行。
- 新規Categoryは0件時10、既存時`max(sortOrder)+10`として末尾追加し、最大値取得と作成を同一Transactionで実行。
- 重複していたFR-CA-003～008の行を削除。

## v11

- 会員割引を有効単価ごとの単価割引へ統一し、単価割引・明細割引をOrder ItemへSnapshot保存。
- customer停止時のSession無効化・active Checkout abandoned・Cart保持を全正本で統一。
- `build:web`へ画像Manifest生成・検証を組み込み、CloudflareとCIのBuild Commandを統一。
- Payment Gatewayの結果から処理日時を除外し、Application ClockをPayment・Order履歴時刻の唯一の正本へ変更。

## v10

- active customer/operator/adminのLogin分岐を確定し、管理RoleではGuest Cartを変更しない契約へ修正。
- CurrentUser、Checkout確認、Order詳細へPresentation用Action Versionを追加し、各操作Requestへ受け渡す契約を確定。
- Review Eligibilityへ既存Review編集Dataを追加。
- Home・Navigation・商品検索/候補/詳細・管理商品QueryへTest Clock時刻を伝播。
- 注文作成Transaction内の価格再検証と`PRICE_CHANGED` Rollbackを追加。
- User Access、画像Snapshot、Reset、Category Flow、ER図の旧記述を修正。
- 重複していた機能要件IDを解消。

## v09

- Presentation Requestと内部Commandを分離し、Actor・Viewer・Clock・IDをUse Case内部で解決する契約へ変更。
- 商品画像ManifestをBuild時生成TypeScript Moduleへ変更し、Runtime FetchとCache障害分岐を削除。
- Order画像SnapshotはAsset Path Mapと商品画像関係のAlt Textから生成する方式へ変更。
- UI向けOrder DTOからGateway Key、Repository Version、内部Actor IDを除外。
- Resetを1 Browser Context・1 Page限定の非原子的手順として明確化。
- Storefront検索NormalizationをTrim・NFKC・小文字化・空白統一へ固定。
- ProductEdit DTOとAsset Picker Queryを分離し、Asset一覧をPage化。
- Categoryを1階層へ簡略化し、Brandの手動並べ替えを廃止。
- IndexedDBの住所SnapshotをTyped Objectへ変更。
- React Hook Form、Zod、React Aria Components、StyleSheet/CSS Modulesの役割を固定。
- Cross-role Lifecycleをmain/週次へ移動。
- Review Create/Update/Delete Requestを分離。
- Decision Logを高影響判断へ縮小。

設計正本の履歴を要約します。詳細仕様は各正本文書を参照してください。

## v08

- Product Aggregate経由のstatus変更を禁止し、作成時draft固定・状態変更専用Use Caseへ統一
- 商品作成・削除Transactionへ0件Review Summaryの作成・削除を追加
- 商品複製を即時保存から非永続の新規Form事前入力へ簡素化
- Category検索・無効化の子孫規則を確定し、子のないRootをCategoryとして扱う
- 商品参照中Rootへの子Category追加・移動を禁止
- Category/Brandの状態変更を通常編集から分離し、専用Use Caseへ統一
- Cart Item新規IDの生成責務をUse Caseへ固定
- Storefront Variant DTOから不要なisActiveを削除し、Reorder契約を一本化
- 既存画面に対応するSearch Suggestion、Review、Cart、Admin一覧、在庫、OrderのApplication契約を補完
- customer用Order QueryとReview公開状態変更・Eligibility DTOを追加し、権限境界を明確化
- draft商品にもactive SKUを必須化し、Preview最小Validation、注文詳細金額・配送先DTO、在庫調整Commandを確定
- 配送先Default、Test ResetのGuest Identity、Category/Brand並べ替えScope、Bulk選択範囲を決定的に固定
- Test Control Use Caseと管理注文詳細の顧客概要DTOを追加し、必須画面のApplication契約を完結
- 新規SKUをactive固定とし、状態変更を保存済みSKUのUpdate契約へ限定

- Home／Storefront Catalog、Admin一覧、Checkout、Bulk ActionのDTO・Use Case契約を補完
- Cart価格Snapshotの意味を「Sale適用後・会員割引前」へ固定
- 商品の初回publishedAtと決定的な新着順を追加し、Seed Versionを8へ更新
- 会員ランク変更時にactive Checkoutを破棄する規則を追加
- Payment処理再開を冪等化
- 共通Port、Application Error、Email正規化、入力上限定数を確定
- Phase 1必須E2Eを12本へ整理
- Native／SQLite資料を`future/phase2`へ分離
- v05～v07の個別修正サマリーを本ファイルへ統合

## v07

- Domain Entity・DTO・Repository・Transaction・PBKDF2・Order画像SnapshotをTypeScript契約化
- Dexie Indexのboolean/null問題を解消

## v06

- Guest Cart Route、Cart Version、Payment処理中Route、Cross-Repository Transaction、GitHub画像append-only運用を確定

## v05

- Product Aggregate、SKU・画像・在庫境界、Cart統合、Checkout再開、GitHub静的画像Asset Catalogを具体化
