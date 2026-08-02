# Phase 2 前半計画: Native基盤・SQLite・Guest購入前Flow

## 0. 依頼概要

- 依頼内容: Phase 2前半として、Android/iOS共通のNative基盤、SQLite永続化、Guestの商品探索からCartまでを実装する。
- 背景: 基盤だけを先に作って画面統合を後回しにすると、Navigation、Asset、Repository、Responsive UIの不整合が後半で発覚する。前半で購入前のVertical Sliceまで成立させる。
- 期待成果: Android/iOSでアプリが起動し、固定Seedの商品を検索・閲覧してCartへ追加・変更・削除できる状態。

## 1. ゴール / 完了条件

### ゴール

最新Web実装のDomain/Application/Repository契約を再利用し、Native用Platform AdapterとSQLite Adapterを実装する。Android/iOSでGuestがHome、商品一覧、検索、商品詳細、Cartを操作できる状態まで完成させる。

### 完了条件（DoD）

- Native対象とWeb専用対象の境界が最新コードに基づいて確定している。
- Native Adminが含まれていない。
- Android/iOS用Application Service生成経路がある。
- SQLite Adapterが前半Flowで必要なRepository Contractを満たす。
- Seed、Reset、Test ClockがNative上で動作する。
- Native Session/Guest Identityの保存基盤がある。
- Home、商品一覧、検索、Category、商品詳細、CartがAndroid/iOS向けに動作する。
- 商品画像がNative Buildへ含まれ、Placeholderを含む表示契約が維持される。
- Cart数量境界、在庫切れ、価格表示、会員価格表示前のGuest契約がWebと一致する。
- AndroidでDevelopmentまたはPreview Buildを生成できる。
- iOSでSimulator Buildを生成できる設定がある。実行環境がある場合は起動確認まで行う。
- Web版の既存テストとWeb Buildが成功する。
- 後半が前半の契約を変更せず開始できる。

## 2. 現状理解と前提

### Current understanding

- Phase 1はWeb、IndexedDB/Dexie、Playwright、Cloudflare Pagesを正本としている。
- `docs/future/phase2`は参考資料であり、最新Repository Contractに合わせて再設計する必要がある。
- Domain/Application層は再利用対象だが、Presentation、Storage、Session、Navigation、Test ControlはPlatform差分がある。
- Native管理画面は作らない。
- Native E2Eの本格実装は後半で行う。

### Assumptions

- Expo Routerを継続利用する。
- Native永続化は`expo-sqlite`を第一候補とし、開始時に最新Expo SDKとの互換性を確認する。
- 商品画像はリポジトリ同梱Assetを利用し、NativeからGitHub APIへ接続しない。
- Backend Serverや実決済は追加しない。
- Android/iOS間でDomain/Application契約を分岐させない。

### Non-goals

- Login UIと会員Sessionの完成
- Profile、配送先管理
- Checkout、Payment、Order、Review
- Maestro本格Flow
- Native CI完成
- Store公開
- Native Admin
- Phase 3機能

## 3. 最初に確定する事項

実装開始時に、次を最新コードと公式資料で確認・確定する。

- Expo SDK、React Native、Expo RouterのNative対応状況
- `expo-sqlite`のAPIとTransaction仕様
- Android最低API Level
- iOS最低Version
- Android package、iOS bundleIdentifier、Scheme、Deep Link
- EAS Projectの有無とCredential管理方針
- Native対象Route
- Web専用Module一覧
- Platform別File命名規則（`.web.ts`、`.native.ts`、`.ios.ts`、`.android.ts`）
- SQLiteへ必要なRepository Contract
- Product Image AssetのNative解決方法
- Test ClockとResetのNative入口

識別子やCredentialがユーザー判断を必要とする場合は、仮値をProduction識別子として確定しない。コード上のPlaceholderと未完了事項を明示する。

## 4. 影響範囲

### 主な確認対象

- `app.config.ts`
- `package.json`
- `app/`
- `src/application/`
- `src/domain/`
- `src/infrastructure/database/dexie/`
- `src/infrastructure/session/`
- `src/bootstrap/`
- `src/presentation/`
- `src/seeds/`
- `src/test-controls/`
- `tests/repository-contract/`
- `tests/integration/`
- `docs/future/phase2/`

### 変更候補

- Native BootstrapとPlatform Adapter
- SQLite Database、Mapper、Repository、Transaction Runner
- Native Session/Guest Identity Store
- Native Password/Crypto AdapterのContractまたは最低限の基盤
- Native Image Asset Repository
- Native Test Control Service入口
- Storefront/Cartの共有Presentation修正またはNative Adapter
- EAS設定の最小構成
- Native用Test
- ADR、PROJECT_CONTEXT、Phase 2文書

既存のWeb Adapterを無理に共通化し、可読性やWeb安定性を落とさない。Platform差分が明確な箇所はPlatform別Fileを使用する。

## 5. 実装方針

### 5.1 Scope・契約の再確認

- `docs/future/phase2`をそのまま実装せず、最新TypeScript型、Repository Interface、Dexie Schema、Use Caseを正として差分を洗い出す。
- Nativeで再利用できるDomain/Applicationと、Platform Adapterが必要な箇所を一覧化する。
- Repository ContractをSQLite向けに勝手に変更しない。
- Nativeのためだけに未使用のPortを増やさない。
- 重要判断をADRへ記録する。

### 5.2 Native Runtime

- Android/iOSからApplication Servicesを生成できるBootstrapを追加する。
- Browser専用の`window`、`document`、IndexedDB、sessionStorage、localStorage依存をNative経路から除外する。
- Guest Identity、Session、Clock、ID Generator、Password/Crypto、Reload相当、Deep Link、NoticeのPlatform境界を整理する。
- 前半でLogin UIは完成させないが、後半で契約変更せず利用できる最低限のSession/Crypto基盤を用意する。
- Nativeで未対応のRouteへ誤って遷移しないRoute Guardを実装する。

### 5.3 SQLite Adapter

- 最新Repository ContractからSQLite Schemaを再設計する。
- `docs/future/phase2/sqlite_schema.md`は参考に留め、現行契約と一致しない箇所を修正する。
- Transaction、Unique制約、Sort、Page、Facet、Version Conflict、SnapshotをWebと同じ意味で実装する。
- boolean、Date、JSON、Enum変換をMapperへ閉じ込める。
- Schema Versionの最小管理は行うが、Migration Recoveryは実装しない。
- DexieとSQLiteで共通Contract Testを可能な範囲で共有する。

### 5.4 Seed・Reset・Clock

- 既存Scenario Metadataを再利用し、Native向けに別の意味を持つSeedを作らない。
- SQLite Databaseを決定的に初期化できる。
- Reset時にSession、Guest Identity、Clockを期待どおり更新する。
- Native UIまたはDeep Linkから呼び出すTest Controlの契約を定義する。
- Production相当BuildではTest Controlを無効化できる構造を維持する。

### 5.5 Guest購入前Flow

対象画面:

- Home
- 商品一覧
- 検索
- Category一覧
- 商品詳細
- Cart
- Not Found/利用不能時の最低限の状態表示

対象操作:

- 商品探索
- Search/Filter/SortのNative利用可能範囲
- 商品画像、価格、Sale、在庫、Variation表示
- Variation選択
- Cart追加
- 数量変更
- 明細削除
- 在庫不足・購入上限の表示
- Empty Cartから商品探索へ戻る

Web専用Admin LayoutやReact Aria依存をNativeへ持ち込まない。WebとNativeで完全に同じ見た目にするのではなく、同じ業務契約と自然なNative操作を優先する。

### 5.6 最小Build

- `app.config.ts`へAndroid/iOSの必要設定を追加する。
- `eas.json`を追加する場合はDevelopment/Previewの最小Profileに限定する。
- Android DevelopmentまたはPreview Buildを生成する。
- iOS Simulator Build設定を追加し、利用可能な環境でBuild/起動確認する。
- Production Store配布、EAS Submit、Store Credential設定は行わない。

## 6. 実施順序

1. 最新コード・Docs・公式仕様の調査
2. Native Scope、識別子、Platform境界の確定
3. ADRと実装計画の補正
4. Native BootstrapとPlatform Adapter
5. SQLite Schema・Repository・Transaction
6. Repository Contract Test
7. Seed・Reset・Clock・Test Control基盤
8. Native AssetとNavigation
9. Home・商品一覧・検索・商品詳細
10. Cart
11. Android Build・起動・実操作確認
12. iOS Build・起動・実操作確認（利用可能範囲）
13. Web/Native回帰
14. 自己レビューとCritical/High修正
15. Docs、Run Artifact、後半開始条件の更新
16. 停止してユーザーへ報告

この順序は内部作業順であり、別フェーズや別PRへ細分化しない。

## 7. 検証方法

### 共通検証

- Format
- Lint
- Typecheck
- Unit Test
- Application Integration Test
- Repository Contract Test
- Component Test
- Web Production Build
- 既存Web Playwright主要Flow

### SQLite検証

- Database作成と再作成
- Seed投入
- Reset
- Transaction Commit/Rollback
- Unique制約
- Version Conflict
- Search/Sort/Page/Facet
- Cart操作
- Product/Variant/Image Read Model
- Web/DexieとのContract一致

### Native検証

Android:

- Build成功
- 起動成功
- Home表示
- 商品探索
- 商品詳細
- Cart追加・変更・削除
- Reset後の再現性
- App再起動後の保存状態

iOS:

- Simulator Build成功
- 起動確認可能なら同じ主要Flowを確認
- 実行環境がない場合はBuild結果と未確認範囲を明記

### 後方互換

- Web Bootstrapが従来どおりDexieを使用する。
- Cloudflare用Web Buildが成功する。
- Playwright Test APIの公開条件を変えない。
- Web Session/Notice/Navigationを壊さない。

## 8. リスクと対応

| リスク | 対応 |
|---|---|
| SQLite初期案と最新契約の不一致 | 最新TypeScript契約から再設計する |
| Web専用UI依存がNative Buildを壊す | Platform別FileとNative Route境界を明確化する |
| 基盤だけ完成し実画面で使えない | 前半で商品探索とCartまでVertical Sliceを通す |
| Androidだけで設計が固定される | iOS Build設定とPlatform差分を同じPRで確認する |
| iOS実行環境がない | Buildと実操作を分けて報告し、未確認を明示する |
| Web回帰 | Web CIと主要Playwrightを必須にする |
| 抽象化過多 | 実際にWeb/Native双方で必要な境界だけ追加する |
| 後半でSession契約を作り直す | 前半でSession/Crypto PortとAdapter基盤を確定する |

## 9. 成果物

- Native ScopeとPlatform境界のADR
- Native Bootstrap
- SQLite Adapter
- Shared/Platform Repository Contract Test
- Native Session/Guest Identity基盤
- Seed/Reset/Clock/Test Control基盤
- Native Storefront・Product・Cart
- Android/iOS最小Build設定
- EAS Development/Previewの初期設定
- 更新済み`docs/PROJECT_CONTEXT.md`
- 履歴文書
- Run Artifact
- 後半の開始条件と残課題

## 10. 完了時の停止条件

前半の完了条件を満たしても、Login、Checkout、Order、Review、Maestro、最終CIへ進まない。

最終報告で次を明記して停止する。

- AndroidのBuild・起動・操作結果
- iOSのBuild・起動・操作結果
- SQLite Contract Test結果
- Web回帰結果
- 未確認事項
- 後半を開始できるか
- 後半で変更してはいけない確定契約
