# Phase 2 前半計画: Native基盤・SQLite・Guest購入前Flow

## 0. 依頼概要

- 依頼内容: Phase 2前半として、Android/iOS共通のNative基盤、SQLite永続化、Guestの商品探索からCartまでを実装する。
- 背景: 基盤だけを先に作って画面統合を後回しにすると、Navigation、Asset、Repository、Presentationの不整合が後半で発覚する。前半で購入前のVertical Sliceまで成立させる。
- 期待成果: Android/iOSでアプリが起動し、固定Seedの商品を検索・閲覧してCartへ追加・変更・削除でき、後半がSchemaやPlatform境界を原則変更せず開始できる状態。

## 1. ゴール

最新Web実装のDomain、Application Use Case、業務ルール、DTO、Validation、Seedの意味を再利用し、Native用Composition Root、Platform Adapter、SQLite Adapterを実装する。

Android/iOSでGuestがHome、商品一覧、検索、Category、商品詳細、Cartを操作できる状態まで完成させる。

Native画面の完成だけを目的にせず、WebとNativeで同じApplication結果を確認でき、SeedとResetで決定的に再現できる学習用SUTを作る。

## 2. 開始条件

次を満たさない場合、この`/goal`を開始しない。仮値を正式値として実装し、後で置換する運用は禁止する。

- Phase 1のWeb CIとCloudflare Deployが安定している。
- Android packageが確定している。
- iOS bundleIdentifierが確定している。
- Expo schemeとDeep Link prefixが確定している。
- Expo AccountとEAS Projectの利用方針が確定している。
- Android Development/Preview Buildを実行できる。
- iOS Simulator Buildを実行する方法が決まっている。
- SecretとCredentialをRepositoryへ保存しない運用が決まっている。

開始時にExpo SDK、Expo Router、`expo-sqlite`、EAS CLIの最新公式仕様を確認する。既定方針を変更する必要がある場合だけ、技術的根拠と影響をADRへ記録する。

## 3. 完了条件（DoD）

### Architecture

- `app/_layout.web.tsx`と`app/_layout.native.tsx`にRoot Layoutが分離されている。
- Web ShellとNative Shellが分離されている。
- Native BundleがCSS、DOM、React Aria、Dexie、Browser Test API、`*.web.ts`へ依存していない。
- Web用Composition RootとNative用Composition Rootが分離されている。
- Native Composition Rootは購入者機能だけを構築し、Admin Use Caseを組み込まない。
- Application Use CaseがDexie、Browser Storage、Web Cryptoの具体型へ直接依存しない。
- Nativeで`operator`または`admin`がLogin状態になった場合の対象外画面とLogout経路が定義されている。

### SQLite

- Native購入者版の最終Flowに必要なCustomer Repositoryが前半で実装されている。
- SQLite Schema、Mapper、Transaction Runnerが最新Repository Contractを満たす。
- User、Session、Address、Catalog/Product、Cart、Checkout、Order、Payment、Shipment、Review、Sequence、Settings、Test Metadata/Inspectionの保存契約が実装されている。
- Admin専用QueryとAdmin専用RepositoryをNative Composition Rootへ組み込んでいない。
- Transaction Commit/Rollback、Unique制約、Version Conflict、Sort、Page、Facet、Snapshotが検証されている。
- 後半でSchemaとRepository Interfaceを原則変更せず利用できる。

### Testability

- 既存Scenarioの意味を維持してNative SQLiteへSeedできる。
- Reset時にDatabase、Session、Guest Identity、Clockが決定的に初期化される。
- Test ControlはDeep LinkからReset、Scenario、Clockを指定できる。
- 任意DB書換えAPIが追加されていない。
- Production相当ProfileでTest Controlを利用できない構造がある。

### Guest購入前Flow

- Android/iOSでHome、商品一覧、検索、Category、商品詳細、Cartが動作する。
- Search、Filter、Sort、Variation選択、Cart追加、数量変更、明細削除が動作する。
- Empty、Not Found、在庫切れ、購入上限、価格変更などの主要状態を決定的に再現できる。
- 商品画像とPlaceholderがNative Bundleから表示される。
- Web ManifestとNative Asset MapのAsset ID集合が一致する。
- App再起動後もGuest IdentityとCartが保持される。

### Build・検証

- Android Preview APKを生成できる。
- Androidで起動、Home、検索または商品一覧、商品詳細、Cart追加・変更・削除を確認している。
- iOS Simulator Buildを生成できる。
- iOS Simulatorで起動、Home、商品一覧または検索、商品詳細、Cart追加を確認している。
- Native Component Testが成功する。
- SQLite Repository Contract Testが成功する。
- Web版の既存Test、Web Build、Playwright主要Flowが成功する。
- Critical/Highの既知不具合が残っていない。

## 4. 対象と対象外

### 対象

- Platform別Root Layout、Shell、Composition Root
- Native Bootstrap
- Native Session、Guest Identity、Password Hash、ID、Clock、Notice、Reload相当
- `expo-sqlite` Adapter
- Customer Repository一式
- Seed、Reset、Test Clock、Deep Link Test Control
- Native商品Asset Map
- Home、商品一覧、検索、Category、商品詳細、Cart
- React Native Testing LibraryによるNative Component Test
- Android Preview APK
- iOS Simulator Build
- 前半に必要なEAS Development/Preview設定
- ADR、PROJECT_CONTEXT、Native設計・検証文書

### 対象外

- Login UIの完成
- Account、Profile、配送先UI
- Checkout、Payment、Order、Review UI
- Maestro本格Flow
- Native CI完成
- Native Admin
- Store公開、EAS Submit
- Password変更、退会、Guest Checkout
- Cancel、Return、Refund
- Migration Recovery、Crash Point、Phase 3機能

## 5. 固定アーキテクチャ

### 5.1 Root LayoutとShell

- Web Root Layoutは既存CSS、Web Runtime、Web Shellを利用する。
- Native Root LayoutはNative Runtime、Safe Area、Native Shellを利用する。
- Native ShellはReact Native Componentだけで構築する。
- Native Root LayoutからWeb CSSをImportしない。
- NativeでAdmin Routeを表示しない。
- Web RouteのURL契約は維持する。

Native Route構成は、既存RouteへPlatform別Fileを置く方式を基本とする。Route Groupを追加する場合は、URLやDeep Linkの重複を避ける必要性をADRへ記録する。

### 5.2 Composition Root

現在のApplication Service生成から次を分離する。

- Database/Repository
- Transaction Runner
- CurrentSessionStore
- GuestIdentityStore
- PasswordHasher
- Clock
- IdGenerator
- PaymentGateway
- AddressLookup
- Product Image Manifest/Asset Resolver

Web用Composition RootはDexieとBrowser Adapterを注入する。Native用Composition RootはSQLiteとNative Adapterを注入する。

Native Composition Rootでは次だけを生成する。

- Auth
- Account
- Catalog
- Cart
- Checkout/Order
- Customer Review

Admin系Use Caseは生成しない。

### 5.3 SQLite実装範囲

前半で次を実装し、後半へ先送りしない。

- UserRepository
- SessionRepository
- AddressRepository
- StorefrontCatalogQueryRepository
- ProductQueryRepository
- ProductRepositoryのCustomer Flowで必要なRead
- InventoryRepositoryのCustomer Flowで必要なRead/更新
- CartRepository
- CheckoutSessionRepository
- OrderRepository
- SequenceRepository
- PaymentRepository
- ShipmentRepository
- ReviewRepository
- ReviewSummaryRepository
- SettingsRepository
- TestMetadataRepository
- TestInspectionRepository

Admin専用Search、Overview、商品編集、在庫調整、User管理用QueryはNative対象外とする。

SQLite Schemaは最新TypeScript Contractから設計し、`docs/future/phase2/sqlite_schema.md`は参考資料としてのみ使用する。

### 5.4 Native SessionとSecurity Adapter

- Session IDとGuest IDはNative向け永続Storageへ保存する。
- Password Hashの既存Seed互換性を維持する。
- WebとNativeで同じ固定AccountへLoginできる形式にする。
- Production Securityを提供するものではないという学習用制約を維持する。
- Secretや実在する認証情報をBundleへ含めない。

前半ではLogin UIを作らないが、後半でAdapterとContractを作り直さない状態まで実装・Testする。

### 5.5 Native商品画像

- Build ScriptでNative Asset Mapを生成する。
- `assetId`ごとに静的`require`または静的Importを生成する。
- Web公開PathをNative Image Sourceとして使用しない。
- Product/Order SnapshotのPathとNative表示用Sourceを分離する。
- PlaceholderをNative Asset Mapへ含める。
- Web ManifestとNative Asset Mapの不一致をBuild/Test失敗にする。

### 5.6 Test Control

- Deep Linkを唯一の外部Automation入口とする。
- Reset、Scenario、Clockだけを前半で扱う。
- Deep Link処理はDevelopment/Previewだけで有効にする。
- Production相当BuildではRoute、Handler、UIのいずれからも利用できないことをTestする。
- Reset後にRoot NavigationとRuntimeを安全に再初期化する。

## 6. Guest購入前Flow

### 対象画面

- Home
- 商品一覧
- 検索
- Category一覧
- 商品詳細
- Cart
- Native対象外画面
- Not Found

### 必須操作

- Homeから商品一覧・Category・商品詳細へ移動
- キーワード検索
- Nativeで成立するFilterとSort
- 商品画像、通常価格、Sale、在庫、Review Summaryの表示
- Variation選択
- Cart追加
- 数量変更
- 明細削除
- 在庫不足と購入上限の表示
- Empty Cartから商品探索へ戻る
- App再起動後のCart復元

Webと同じ見た目を再現することを目的にしない。同じ業務結果、理解しやすさ、Touch操作、Safe Area、Keyboard、Back操作を優先する。

## 7. Test方針

### Vitest

- Domain/Application既存Test
- Platform Port/Adapter Test
- SQLite Mapper Test
- SQLite Repository Contract Test
- Transaction Commit/Rollback
- Seed/Reset/Clock Test
- Asset Map Contract Test
- Production Test Control無効化Test

### Native Component

React Native Testing Libraryを使用し、少なくとも次を検証する。

- Loading/Error/Empty
- Search入力と結果表示
- Product DetailのVariation選択
- Cart数量変更と削除
- Disabled/Processing状態
- Native対象外画面
- Accessibility Label/Test ID

### 手動・Build Smoke

AndroidとiOSを別々に記録する。

- Build
- Install/起動
- Home
- 商品探索
- 商品詳細
- Cart
- Reset
- App再起動後の保持

## 8. 内部品質ゲート

これらは別フェーズや別PRではない。同一`/goal`内で順番に通過する。Gateが失敗している状態で次へ進まない。

| Gate | 到達条件 |
|---|---|
| A: Native Bundle | Platform別Root Layoutと最小Native ShellがAndroid/iOS向けにBundleできる |
| B: Platform契約 | Composition Root、Session、Guest Identity、Password Hash、Clock、IDのTestが成功する |
| C: SQLite | Customer Repository Contract、Transaction、Seed、ResetのTestが成功する |
| D: Asset/Test Control | Native Asset Map、Deep Link Reset、Production無効化が成功する |
| E: Android Vertical Slice | HomeからCartまでAndroidで操作できる |
| F: iOS Vertical Slice | HomeからCart追加までiOS Simulatorで操作できる |
| G: 回帰 | Web Test、Web Build、Playwrightと全Native Testが成功する |

各Gate終了時にRun Artifactへ次を記録する。

- 実施内容
- 成功した検証
- 失敗と修正
- 未確認事項
- 次Gateへ進める根拠

## 9. 実施順序

1. 最新コード、Docs、公式仕様の調査
2. 外部開始条件の確認
3. Native対象ModuleとWeb専用依存の一覧化
4. ADRと詳細計画の確定
5. Gate A: Root Layout、Native Shell、最小Bundle
6. Gate B: Composition RootとPlatform Adapter
7. Gate C: SQLite Schema、Repository、Transaction、Seed/Reset
8. Gate D: Native Asset MapとDeep Link Test Control
9. Native Home、商品一覧、検索、Category、商品詳細
10. Native Cart
11. Native Component Test
12. Gate E: Android BuildとVertical Slice
13. Gate F: iOS BuildとVertical Slice
14. Gate G: Web/Native総合回帰
15. 自己レビューとCritical/High修正
16. Docs、ADR、Run Artifact、後半開始条件の更新
17. 停止してユーザーへ報告

## 10. 後半へ引き渡す確定契約

前半の最終報告とDocsへ次を明記する。

- Platform別Root LayoutとShell
- Native Composition Rootの注入契約
- SQLite Schema Version
- Customer Repositoryの実装状況
- Session/Guest Identity/Password Hashの保存形式
- Deep Link Test Control形式
- Native Asset Map形式
- Stable Test ID規約
- Android/iOS Build Profile
- 後半で原則変更してはいけない契約
- 未確認事項と残課題

## 11. 成果物

- Platform境界とComposition RootのADR
- Platform別Root LayoutとShell
- Native Bootstrap
- SQLite Customer Adapter一式
- Customer Repository Contract Test
- Native Session/Guest Identity/Password Hash Adapter
- Seed/Reset/Clock/Deep Link Test Control
- Native Asset Map生成処理とContract Test
- Native Storefront、Product、Cart
- Native Component Test
- Android Preview APK
- iOS Simulator Build
- EAS Development/Preview初期設定
- 更新済みREADME/PROJECT_CONTEXT/Native手順
- 履歴文書とRun Artifact
- 後半開始条件と確定契約一覧

## 12. 停止条件

前半DoDとGate A〜Gを満たしても、Login UI、Account、Checkout、Order、Review、Maestro、最終CIへ進まない。

最終報告で次を区別して記録し、停止する。

- Android Build・起動・操作結果
- iOS Build・起動・操作結果
- SQLite Contract Test結果
- Native Component Test結果
- Web回帰結果
- 未確認事項
- 後半を開始できるか
- 後半で変更してはいけない確定契約
