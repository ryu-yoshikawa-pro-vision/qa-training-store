# Phase 2 後半計画: 会員購入Flow・Maestro・EAS/CI仕上げ

## 0. この計画の位置づけ

本書はPhase 2後半を一つの`/goal`で最後まで実施するための詳細な実装契約です。

実行時は次を必ず参照します。

1. `AGENTS.md`
2. `PLANS.md`
3. `docs/PROJECT_CONTEXT.md`
4. `docs/adr/`
5. `docs/plans/phase2-native-goal/00_master-roadmap.md`
6. `docs/plans/phase2-native-goal/01_phase2-first-half-native-foundation.md`
7. 前半PRの最終Report、ADR、Run Artifact
8. 本書

Run開始時にタイムスタンプ付きRun Planと`.codex/runs/<run_id>/`を作成し、本書のGateとDoDをRun Taskへ展開します。矛盾時はMaster Plan、前半で確定したADR、本書の順に優先します。

## 1. ゴール

前半で確定した次の契約を土台として、Android/iOSの会員購入FlowとNative自動化・内部Buildを完成させます。

- `app/_layout.tsx`をNative標準RootとするRoute構成
- `app/_layout.web.tsx`をWeb専用Rootとする構成
- Platform別Shell/Screen Module
- Application依存方向
- Customer/Admin Repository Capability
- Customer/Admin Transaction Scope
- Native Composition Root
- SQLite Customer AdapterとTransaction Runner
- Shared Contract SuiteとNative SQLite Test Harness
- Session/Guest Identity/PBKDF2
- Seed/Reset/Test Clock
- Deep Link Test Control Protocol Version 1
- Native Asset Map
- Storefront/Product/Cart
- CNG/EAS Profile
- EAS Workflowsまたは承認済み代替実行経路

完成対象:

- Login、Logout、Session復元
- Role対象外処理
- Guest Cart統合
- Account/Profile/Address
- Checkout
- Mock Payment成功/失敗/再試行
- Order一覧/詳細
- Review投稿/編集/削除
- Payment Delayを含むTest Control
- Android Maestro必須Flow
- iOS Simulator主要Flow
- Native Build/Test EAS Workflows
- Native開発・検証・運用手順

画面数を増やすことではなく、WebとNativeで同じ業務契約、状態遷移、失敗状態を決定的に検証できることを優先します。

## 2. 開始条件

次を満たさない場合、この`/goal`を開始しません。

- Phase 2前半PRが`main`へマージ済みである。
- 最新`main`で前半Gate A〜Gが成功する。
- Route InventoryとPlatform Route方式が文書化されている。
- Native標準Rootが`app/_layout.tsx`、Web Rootが`app/_layout.web.tsx`である。
- Application→Infrastructure直接依存が除去されている。
- Customer/Admin Repository Capability分離が完了している。
- Customer/Admin Transaction Scope分離が完了している。
- Android Preview APKを生成、インストール、起動できる。
- iOS Simulator Buildを生成、インストール、起動できる。
- Android/iOSでGuestの商品探索からCartまで操作できる。
- Android実SQLite Customer Contract Suiteが成功する。
- iOS実SQLite主要Contract Smokeが成功する。
- Web/Android/iOSのPBKDF2互換Testが成功する。
- Native CryptoがWeb Bundleから隔離されている。
- Deep Link Reset Protocol Version 1が成功する。
- Native Contract Harnessの実行経路が成立している。
- 前半のCritical/High不具合が残っていない。
- 前半の確定契約と未確認事項がDocsへ記録されている。
- Maestroを実行できるAndroid環境がある。
- iOS主要Flowを確認できるSimulator環境がある。
- EAS WorkflowsをNative CIの第一経路として利用できるかが確認されている。
- EAS Workflows利用不能時の代替経路が明示されている。
- Native Buildの実行頻度と費用上限が決まっている。

開始条件を満たさない場合、前半基盤の大規模修正を後半へ混ぜません。前半の修正が必要なら、理由、影響範囲、修正方法を先に明示します。

## 3. 前半から維持する契約

後半の都合で次を不要に変更しません。

- Route InventoryとPlatform Route Wrapper方式
- `app/_layout.tsx` / `app/_layout.web.tsx`
- Platform別Shell
- Application依存方向
- Customer/Admin Repository Capability
- Customer/Admin Transaction Scope
- Native Composition Rootの注入構造
- `NATIVE_DATABASE_SCHEMA_VERSION`
- Customer Repository InterfaceとTransaction境界
- `withExclusiveTransactionAsync`の利用
- Transaction Callback結果をCommit後だけ返す契約
- Shared Customer Contract Suite
- Native SQLite Test Harness
- Session ID/Guest ID Storage Keyと保存形式
- PBKDF2 Library、Platform隔離、Encoded Format、Test Vector
- Native Asset Map形式
- Deep Link Protocol Version 1
- Stable Test ID規約
- CNG方針
- EAS Profile名と役割
- EAS Workflowsまたは承認済み代替実行経路

変更が避けられない場合は、実装前に次を記録します。

- 変更が必要な具体的理由
- 前半で予測できなかった根拠
- Web、SQLite、Android、iOS、Testへの影響
- Schema変更の有無
- Migrationが不要である根拠、またはPhase 2内で許容できる最小対応
- ADR
- 回帰Test

前半契約の変更が広範囲になる場合は、後半Goalを継続せず、前半修正として扱うかをユーザーへ報告します。

## 4. 完了条件（DoD）

### 4.1 Auth / Session

- Webと同じ固定AccountでAndroid/iOSからLoginできる。
- Native PBKDF2が既存Seed HashをVerifyする。
- Login、Logout、Session復元がAndroid/iOSで動作する。
- `active customer`だけが購入Flowへ進める。
- `suspended`と`withdrawn`のLogin拒否がWebと同じApplication Errorで動作する。
- `operator`と`admin`はNative対象外画面へ遷移し、Logoutだけを利用できる。
- App再起動後にSessionが復元される。
- Session期限/不正Session時に安全にGuestへ戻る。
- Native CryptoをWeb Entry PointへImportしていない。

### 4.2 Guest Cart統合

- Login前Guest CartをLogin後Customer Cartへ統合できる。
- 完全統合、数量調整、在庫不足、上限超過、除外、価格変更を既存Application契約どおり表示する。
- 統合後のGuest Cart/Guest Identityの扱いが既存契約と一致する。
- Active Checkoutが無効化される条件が既存契約と一致する。
- Cart統合Noticeを一度だけ表示し、再起動後に不正再表示しない。
- `login-and-merge-cart`と`merge-guest-cart`がCustomer Transaction Scopeだけで実行される。

### 4.3 Account / Address

- Profile表示/編集が動作する。
- 配送先の一覧、追加、編集、削除、Default変更が動作する。
- Validation Messageの意味がWebと一致する。
- Native Keyboard Avoidance、Scroll、Safe Areaが成立する。
- Back操作と未保存変更保護が成立する。
- Address MutationがSQLite Transactionで整合する。

### 4.4 Checkout / Payment

- CartからCheckout開始できる。
- 未Login時にLoginへ誘導し、成功後に元のCheckoutへ復帰する。
- Checkout Sessionのstart/resume/abandonが既存契約と一致する。
- 配送先選択、支払方法選択、注文確認が動作する。
- Payment処理中の二重送信を防止する。
- Cart Version、価格、在庫を注文確定前に再検証する。
- Payment成功でOrder/Order Item/Payment/InventoryがCustomer Transaction Scope内で整合する。
- Payment失敗後、同一Orderから再試行できる。
- Payment冪等性が維持される。
- Transaction Callback結果がCommit成功後だけUIへ返る。
- App再起動とBackground/Foreground後もSession/Checkout/Payment状態が整合する。
- 高度なCrash Recoveryを実装していない。

### 4.5 Order / Review

- Order一覧とOrder詳細が動作する。
- Order、Payment、Shipmentの状態から既存文言を表示する。
- 商品、価格、画像、配送先Snapshotを利用する。
- delivered Orderの商品だけReview可能である。
- Review投稿、編集、削除が動作する。
- Hidden/Deletedなど既存状態の表示契約を維持する。
- Review Summaryが同一Customer Transactionで更新される。
- Review Flowは専用Seed Scenarioから開始できる。
- Native Adminや任意DB書換えを必要としない。

### 4.6 Test Control

- Master PlanのDeep Link Protocol Version 1を維持する。
- Scenario Reset、Clock、Payment Delayを指定できる。
- `paymentDelayMs`は0〜30,000msだけ許可される。
- Reset処理と購入処理が不正に並行しない。
- Reset中の二重Requestが明示的に拒否される。
- Ready/Error SignalがMaestroから判定できる。
- Development/Previewだけで有効である。
- Production-validationではDeep Linkを受理しない。
- Production-validationではTest Control ServiceがComposition Rootへ登録されない。
- Production-validationではUI/Handlerへ到達できない。
- Production-validationで試行した場合、安全なNot FoundまたはDisabledになる。
- Arbitrary SQL、任意Entity変更、任意Status変更、Review Eligibility迂回がない。

### 4.7 Native Contract Harness

- HarnessはTest Controlと別責務である。
- Harnessは定義済みContract Suiteだけを実行する。
- MaestroからDevelopment-only画面を操作して起動できる。
- Arbitrary SQL、任意Entity変更、任意Status変更を許可しない。
- 購入系Mutationを追加した後の実SQLite Contractが成功する。
- Production-validationではHarnessを利用できない。

### 4.8 Native Component Test

React Native Testing Libraryで最低限次を検証します。

- Login成功/拒否表示
- Role対象外画面
- Guest Cart統合Notice
- Profile/Address Validation
- Checkout StepとButton状態
- Payment Processing/Failure
- Order Empty/List/Detail
- Review EligibilityとForm
- Platform非依存のBack/未保存変更ロジック
- Accessibility Label/Test ID

### 4.9 Maestro

Android必須Flow:

1. Guestの商品閲覧とCart操作
2. LoginとGuest Cart統合
3. Checkout成功とOrder確認
4. Payment失敗と再試行
5. App再起動後のSession/Checkout復元
6. delivered OrderへのReview投稿
7. Native Contract Harness実行
8. Production-validationでTest Control/Harness無効確認

原則:

- 各Flowの先頭でDeep Link Resetを実行する。
- 前回Flowの状態へ依存しない。
- 座標Tapを避ける。
- Stable Test IDまたはAccessibility Labelを使用する。
- RetryでFlakyを隠さない。
- 同じFlowを複数回連続実行して安定性を確認する。

iOSではEAS Workflowsまたは承認済み代替経路で次を確認します。

- Login
- Checkout成功
- Order詳細
- Payment失敗からの再試行
- Contract Harness主要Smoke
- Production-validation無効確認

### 4.10 Build / CI

- Android Preview APKを生成できる。
- iOS Simulator Buildを生成できる。
- Development/PreviewでTest Controlが有効である。
- Production-validationでTest Control/Harnessを実行できない。
- GitHub ActionsでNode/Web検証を実行できる。
- `.eas/workflows/`からAndroid/iOS BuildとMaestroを実行できる。
- Build成果物が後続Maestro Jobへ渡される。
- Android/iOSのBuild/Test結果が分離されている。
- Web CIとCloudflare DeployがNative Workflow完了待ちにならない。
- SecretやCredentialがRepository、Bundle、Artifact、Logへ露出していない。
- EAS Workflows利用不能時は承認済み代替経路の結果を記録する。

### 4.11 回帰 / 文書

- Web版のFormat、Lint、Typecheck、Test、Build、Playwright主要Flowが成功する。
- Android/iOSの主要購入Flowが成立する。
- Critical/Highの既知不具合が残っていない。
- Phase 2の実装、検証、Build、Maestro、運用手順が最新化されている。
- Phase 3へ送る課題が整理されている。

## 5. 対象

- Native Auth/Session UI
- Native対象外Role画面
- Guest Cart統合
- Account、Profile、配送先
- Checkout、Mock Payment、Order、Review
- Native Validation、Keyboard、Safe Area、Back操作、未保存変更保護
- Deep Link Test Controlの完成
- Payment Delay
- Review用Seed Scenario
- Native Component Test
- Android/iOS Maestro主要Flow
- Native Contract Harnessの購入系回帰
- EAS Development/Preview/Production-validation Profile
- Native Build/Test EAS Workflows
- Android Preview APK
- iOS Simulator Build
- GitHub ActionsのNode/Web検証
- Native開発・Build・検証手順

## 6. 対象外

- Native Admin
- Store公開、EAS Submit
- Password変更、退会
- Guest Checkout
- Cancel、Return、Refund
- Audit Log
- Payment timeout/unknown、Reconciliation
- Migration Recovery、Crash Point、Integrity Check
- App Store/Google Play Release Gate
- Phase 3機能

## 7. 実装方針

### 7.1 Auth / Session

- 固定Accountと既存Auth Use Caseを再利用する。
- active customerだけが購入Flowへ進める。
- suspended/withdrawnのLogin拒否を既存Application Errorで扱う。
- operator/adminはNative対象外画面へ遷移させる。
- App再起動後のSession復元を確認する。
- Guest Cart統合は既存Application Use CaseとCustomer Transaction Scopeを利用する。
- Web PBKDF2を変更しない。
- Native PBKDF2はPlatform別Moduleからだけ利用する。

### 7.2 Account / 配送先

- Profile表示・編集をNativeで操作可能にする。
- 配送先の追加、編集、削除、Default変更を実装する。
- Validation Messageの意味をWebと一致させる。
- Keyboard Avoidance、Scroll、Safe Area、Back操作を確認する。
- 未保存変更保護はNative Navigationへ適合させる。

### 7.3 Checkout / Payment

必須Flow:

1. CartからCheckout開始
2. 未Login時のLogin誘導
3. Login成功後に元のCheckoutへ復帰
4. 配送先選択
5. 支払方法選択
6. 注文確認
7. Payment処理中
8. 注文完了
9. Payment失敗
10. 同一Orderから再試行
11. App再起動時のSession/Checkout復元
12. Background/Foreground復帰

維持する契約:

- Cart Version
- 価格・在庫再検証
- Checkout Session start/resume/abandon
- Payment冪等性
- Order/Order Item Snapshot
- 在庫減算
- Payment失敗後の同一Order再試行
- Customer Transaction Scope
- Commit成功後だけ結果を返すRunner契約

### 7.4 Order / Review

- Order一覧と詳細を実装する。
- Order、Payment、Shipmentの既存状態から文言を決定する。
- 商品、価格、画像、配送先Snapshotを利用する。
- delivered Orderの商品だけReview可能とする。
- Review投稿、編集、削除、非公開/削除済み状態を表示する。
- NativeからOrder状態変更やReview管理操作を行わない。

Review Automation:

- delivered OrderとReview未投稿Order Itemを持つ専用Seed Scenarioを利用する。
- Deep Link ResetでScenarioを選択する。
- SQLite直接更新Helperを作らない。
- Review Eligibilityを弱めない。

### 7.5 Test Control / Harness

Test Controlは業務状態変更、Harnessは定義済みContract Test実行として分離します。

Test Control許可操作:

- Scenario Reset
- Clock設定/解除
- Payment Delay設定

Harness許可操作:

- 定義済みContract Suite実行
- 結果表示

禁止操作:

- 任意Entity作成・更新
- 任意SQL実行
- 任意Status変更
- Review Eligibility迂回

### 7.6 Native Component Test

Domain/Application/SQLiteはVitestとNative Harnessを継続し、UIはReact Native Testing Libraryで検証します。

### 7.7 Maestro

Web Playwright全件を機械的に移植しません。Nativeで学習価値が高く、Platform統合を検証できるFlowへ限定します。

### 7.8 EAS Profile

Master Planの6 Profileを維持します。

- development-android
- development-ios-simulator
- preview-android
- preview-ios-simulator
- production-validation-android
- production-validation-ios-simulator

Store提出用Profileは作りません。

### 7.9 GitHub Actions

Pull Requestで実行:

- Format
- Lint
- Typecheck
- Unit/Application Test
- Architecture/Capability/Transaction Scope Test
- Dexie Contract
- SQLite Node側Test
- Native Component Test
- Native Route/Dependency Static Check
- Web既存CI

Cloudflare DeployはNative Workflowへ依存させません。

### 7.10 EAS Workflows

`.eas/workflows/phase2-native-purchase.yml`をNative Build/Testの正本とします。

Workflow構成例:

```text
build_android_preview
  -> maestro_android_purchase
  -> maestro_android_contract_harness

build_ios_preview_simulator
  -> maestro_ios_purchase
  -> maestro_ios_contract_smoke

build_android_production_validation
  -> maestro_android_test_control_disabled

build_ios_production_validation
  -> maestro_ios_test_control_disabled
```

必須条件:

- Build成果物を後続Jobへ渡す。
- Android EmulatorとiOS Simulatorの結果を分ける。
- Native Contract HarnessをBuild後に実行する。
- Production-validationでTest Control/Harnessが無効であることを実行確認する。
- Workflow URLとBuild IDをRun Artifactへ記録する。
- 同一Branchの不要な重複実行を抑制する。

EAS Maestro Jobが利用不能の場合は、開始時に承認された代替環境で同等確認を行います。未実行をPASSにしません。

## 8. Test Scenario割当

最低限必要なScenario:

- active customerのLogin
- suspended/withdrawnのLogin拒否
- Guest Cart統合
- Checkout成功
- Payment失敗
- Payment処理中/Checkout再開
- Cart Version不一致
- delivered Order＋Review未投稿
- Order/Review Empty

既存Scenarioで不足する場合だけ追加します。WebとNativeで同じScenario名と意味を維持します。

## 9. 内部品質ゲート

### Gate A: Auth

- Login、拒否、Session復元、Role対象外、Guest Cart統合がAndroid/iOSで成立する。
- PBKDF2互換とWeb隔離が維持される。
- Customer Transaction ScopeだけでCart統合が動作する。

### Gate B: Account

- ProfileとAddress CRUD、Validation、Back/未保存変更保護が成立する。
- Address Transactionが実SQLiteで成功する。

### Gate C: Purchase

- Checkout成功、Payment失敗/再試行、Order一覧/詳細が成立する。
- Customer Transaction Scope、Commit後結果返却、冪等性が成立する。
- 実SQLite Contract Harnessの購入系Suiteが成功する。

### Gate D: Review

- 専用SeedからReview投稿/編集/削除が成立する。
- Review Summary Transactionが成功する。

### Gate E: Automation

- Deep Link ResetとAndroid Maestro必須Flowが連続成功する。
- Native Contract HarnessがMaestroから成功する。
- iOS主要FlowがMaestroまたは承認済み代替経路で成功する。

### Gate F: Build / CI

- EAS ProfileとEAS Workflowsが成立する。
- Android/iOS Build結果が分離される。
- Production-validationでTest Control/Harness無効化が実行確認される。
- GitHub ActionsとCloudflare DeployがNative Workflowに依存しない。

### Gate G: 最終回帰

- Android/iOS主要Flow、全Native Test、Web Test/Build/Playwrightが成功する。
- Critical/Highが残っていない。

各Gate終了時に、使用Scenario、実施内容、成功した検証、失敗と修正、Android/iOS差分、Workflow/Build ID、未確認事項、次Gateへ進める根拠を記録します。

## 10. 実施順序

1. 最新`main`と前半成果の再調査
2. 開始条件と前半確定契約の確認
3. Run初期化とScenario割当
4. Gate A
5. Gate B
6. Gate C
7. Gate D
8. Native Component Test拡充
9. Deep Link Test ControlとPayment Delay完成
10. Native Contract Harness購入系Suite拡充
11. EAS Workflow整備
12. Gate E
13. Gate F
14. Gate G
15. 自己レビューとCritical/High修正
16. Docs、ADR、PROJECT_CONTEXT、History、Run Artifact、Phase 3課題更新
17. Phase 2完了判定
18. 停止してユーザーへ報告

## 11. 検証方法

### Application / SQLite

- Auth成功・拒否
- Guest Cart統合
- Session復元
- Profile/Address CRUD
- Checkout start/resume/abandon
- Cart Version Conflict
- 価格・在庫再検証
- Payment成功/失敗/再試行/冪等性
- Order/Shipment状態
- Review Eligibility/Summary
- SQLite Transaction Rollback
- Transaction Callback結果とCommit失敗

### Native UI

- Login/Logout
- Role対象外
- Keyboard、Scroll、Safe Area
- Back操作と未保存変更
- Session復元
- Guest Cart統合Notice
- Checkout各Step
- Processing中の二重操作防止
- Payment失敗からの再試行
- Order一覧/詳細
- Review投稿/編集/削除
- App再起動とForeground復帰
- Error/Empty/Loading

### Build / Security

- Development Build
- Android Preview APK
- iOS Simulator Build
- Production-validation Build
- Test Control/Harness公開条件
- Build Metadata
- Secret/Credential非混入
- Native CryptoのWeb非混入

### Web回帰

- Format/Lint/Typecheck
- Unit/Integration/Repository/Component/Contract
- Web Build
- Playwright主要Flow
- Cloudflare用Production Build契約
- Web Test API公開条件

## 12. 成果物

- Native Auth/Session/Role対象外UI
- Native Account/Profile/Address UI
- Native Checkout/Payment/Order/Review UI
- Review用Seed Scenario
- Native Component Test
- Deep Link Test ControlとPayment Delay
- Native Contract Harness購入系Suite
- Android/iOS Maestro主要Flow
- EAS Build Profile完成
- `.eas/workflows/phase2-native-purchase.yml`
- Android Preview APK
- iOS Simulator Build
- GitHub ActionsのNode/Web検証
- Native開発・Build・検証手順
- Phase 2完了ADR
- 更新済みREADME/PROJECT_CONTEXT
- HistoryとRun Artifact
- Phase 3へ送る課題一覧

## 13. Phase 2最終完了判定

### コード上の完了

- Android/iOS共通Domain/Application契約
- Customer Repository/Transaction Scope
- SQLite Customer Adapter
- Native購入者Flow
- Native Component Test
- Maestro Flow
- EAS Workflows
- Test Control/Harness
- Docs

### 実環境での完了

- Android Build
- Android起動・主要操作
- Android Maestro
- Android実SQLite Contract Harness
- iOS Simulator Build
- iOS起動・商品探索・Cart
- iOS Login・Checkout成功・Order詳細
- iOS Payment失敗・再試行
- iOS Contract Smoke
- Production-validation無効確認

実行していない項目をPASSとしません。EAS Workflows利用不能時は承認済み代替経路の結果を記録します。iOS実環境検証が不足する場合、Phase 2を完全完了とせず「コード完了・iOS検証未完了」と記録します。

Phase 2完了後もPhase 3へ自動で進みません。最終報告でPhase 3候補、優先度、依存関係を提示して停止します。
