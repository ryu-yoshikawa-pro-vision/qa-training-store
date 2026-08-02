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

Run開始時にタイムスタンプ付きRun Planと`.codex/runs/<run_id>/`を作成し、本書のGateとDoDをRun Taskへ展開します。

## 1. ゴール

前半で確定した次の契約を土台として、Android/iOSの会員購入FlowとNative自動化・内部Buildを完成させます。

- Platform別Route、Root Layout、Shell
- Application依存方向
- Customer/Admin Repository Capability
- Native Composition Root
- SQLite Customer AdapterとTransaction Runner
- Shared Contract SuiteとNative SQLite Test Harness
- Session/Guest Identity/PBKDF2
- Seed/Reset/Test Clock
- Deep Link Test Control Protocol Version 1
- Native Asset Map
- Storefront/Product/Cart
- CNG/EAS Profile

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
- EAS Build Workflow
- Native CIと運用手順

画面数を増やすことではなく、WebとNativeで同じ業務契約、状態遷移、失敗状態を決定的に検証できることを優先します。

## 2. 開始条件

次を満たさない場合、この`/goal`を開始しません。

- Phase 2前半PRが`main`へマージ済みである。
- 最新`main`で前半Gate A〜Gが成功する。
- Route InventoryとPlatform Route方式が文書化されている。
- Application→Infrastructure直接依存が除去されている。
- Customer/Admin Repository Capability分離が完了している。
- Android Preview APKを生成、インストール、起動できる。
- iOS Simulator Buildを生成、インストール、起動できる。
- Android/iOSでGuestの商品探索からCartまで操作できる。
- Android実SQLite Customer Contract Suiteが成功する。
- iOS実SQLite主要Contract Smokeが成功する。
- Web/Android/iOSのPBKDF2互換Testが成功する。
- Deep Link Reset Protocol Version 1が成功する。
- 前半のCritical/High不具合が残っていない。
- 前半の確定契約と未確認事項がDocsへ記録されている。
- Maestroを実行できるAndroid環境がある。
- iOS主要Flowを確認できるSimulator環境がある。
- EAS TokenをGitHub Actionsで使用するかが決まっている。
- Native Buildの実行頻度と費用上限が決まっている。

開始条件を満たさない場合、前半基盤の大規模修正を後半へ混ぜません。前半の修正が必要なら、理由、影響範囲、修正方法を先に明示します。

## 3. 前半から維持する契約

後半の都合で次を不要に変更しません。

- Route InventoryとPlatform Route Wrapper方式
- Platform別Root LayoutとShell
- Application依存方向
- Customer/Admin Repository Capability
- Native Composition Rootの注入構造
- `NATIVE_DATABASE_SCHEMA_VERSION`
- Customer Repository InterfaceとTransaction境界
- `withExclusiveTransactionAsync`の利用
- Shared Customer Contract Suite
- Native SQLite Test Harness
- Session ID/Guest ID Storage Keyと保存形式
- PBKDF2 Library、Encoded Format、Test Vector
- Native Asset Map形式
- Deep Link Protocol Version 1
- Stable Test ID規約
- CNG方針
- EAS Profile名と役割

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

### 4.1 Auth/Session

- Webと同じ固定AccountでAndroid/iOSからLoginできる。
- Native PBKDF2が既存Seed HashをVerifyする。
- Login、Logout、Session復元がAndroid/iOSで動作する。
- `active customer`だけが購入Flowへ進める。
- `suspended`と`withdrawn`のLogin拒否がWebと同じApplication Errorで動作する。
- `operator`と`admin`はNative対象外画面へ遷移し、Logoutだけを利用できる。
- App再起動後にSessionが復元される。
- Session期限/不正Session時に安全にGuestへ戻る。

### 4.2 Guest Cart統合

- Login前Guest CartをLogin後Customer Cartへ統合できる。
- 完全統合、数量調整、在庫不足、上限超過、除外、価格変更を既存Application契約どおり表示する。
- 統合後のGuest Cart/Guest Identityの扱いが既存契約と一致する。
- Active Checkoutが無効化される条件が既存契約と一致する。
- Cart統合Noticeを一度だけ表示し、再起動後に不正再表示しない。

### 4.3 Account/Address

- Profile表示/編集が動作する。
- 配送先の一覧、追加、編集、削除、Default変更が動作する。
- Validation Messageの意味がWebと一致する。
- Native Keyboard Avoidance、Scroll、Safe Areaが成立する。
- Back操作と未保存変更保護が成立する。
- Address MutationがSQLite Transactionで整合する。

### 4.4 Checkout/Payment

- CartからCheckout開始できる。
- 未Login時にLoginへ誘導し、成功後に元のCheckoutへ復帰する。
- Checkout Sessionのstart/resume/abandonが既存契約と一致する。
- 配送先選択、支払方法選択、注文確認が動作する。
- Payment処理中の二重送信を防止する。
- Cart Version、価格、在庫を注文確定前に再検証する。
- Payment成功でOrder/Order Item/Payment/Inventoryが同一Transactionで整合する。
- Payment失敗後、同一Orderから再試行できる。
- Payment冪等性が維持される。
- App再起動とBackground/Foreground後もSession/Checkout/Payment状態が整合する。
- 高度なCrash Recoveryを実装していない。

### 4.5 Order/Review

- Order一覧とOrder詳細が動作する。
- Order、Payment、Shipmentの状態から既存文言を表示する。
- 商品、価格、画像、配送先Snapshotを利用する。
- delivered Orderの商品だけReview可能である。
- Review投稿、編集、削除が動作する。
- Hidden/Deletedなど既存状態の表示契約を維持する。
- Review Summaryが同一Transactionで更新される。
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
- Production-validationではRoute、Handler、UIを利用できない。
- Arbitrary SQL、任意Entity変更、任意Status変更、Review Eligibility迂回がない。

### 4.7 Test Scenario

各主要Flowは開始状態をSeed名で説明できます。

最低限必要なScenario:

- active customer Login
- suspended Login拒否
- withdrawn Login拒否
- Guest Cart完全統合
- Guest Cart数量調整/除外
- Address CRUD
- Checkout成功
- Payment失敗
- Payment再試行
- Payment処理中/Checkout再開
- Cart Version不一致
- 価格変更
- 在庫変更
- delivered Order + Review未投稿
- Review編集済み
- Order Empty
- Review Empty/対象外

既存Scenarioで不足する場合だけ追加します。WebとNativeで同じScenario IDと意味を維持します。

### 4.8 Native Component Test

React Native Testing Libraryで少なくとも次を検証します。

- Login成功/拒否
- Role対象外画面
- Session Loading/Error
- Guest Cart統合Notice
- Profile/Address Validation
- 未保存変更
- Checkout Step
- Processing/Disabled
- Payment Failure/Retry
- Order Empty/List/Detail
- Review Eligibility/Form/Delete
- Error/Empty/Loading
- Stable Test ID/Accessibility Label

### 4.9 SQLite/Transaction回帰

後半で追加したMutationを実Native Runtimeで検証します。

- Auth Session作成/削除
- Guest Cart統合
- Address Default再割当
- Checkout start/resume/abandon
- Order/Payment/Inventory同時更新
- Payment再試行/冪等性
- Review/Review Summary同時更新
- Transaction Rollback
- Version Conflict

AndroidではShared Customer Contract Suite全件を再実行します。iOSでは少なくとも後半Mutationの主要Contract Smokeを実行します。

### 4.10 Maestro

Android必須Flowが複数回連続成功します。

1. Guestの商品閲覧とCart操作
2. LoginとGuest Cart統合
3. Checkout成功とOrder確認
4. Payment失敗と再試行
5. App再起動後のSession/Checkout復元
6. delivered OrderへのReview投稿

- 各Flowの先頭でDeep Link Resetを実行する。
- `test-runtime-ready`を待ってから操作する。
- 前回Flowの状態へ依存しない。
- 座標Tapを原則使用しない。
- Stable Test ID/Accessibility Labelを利用する。
- 表示文言だけへ過度に依存しない。
- RetryでFlakyを隠さない。
- 同一Flowを最低3回連続実行して安定性を確認する。

### 4.11 iOS主要Flow

iOS Simulatorで次を確認します。

- Login/Logout
- Session復元
- Guest Cart統合
- Profile/Address
- Checkout成功
- Order詳細
- Payment失敗/再試行
- delivered OrderへのReview投稿
- App再起動
- Background/Foreground

iOS Maestroが利用可能なら主要Flowを自動実行します。利用できない場合でも上記の手動実操作確認を必須とします。

### 4.12 Build/CI

- Master PlanのEAS Profileが完成している。
- Android Preview APKを生成できる。
- iOS Simulator Preview Buildを生成できる。
- Production-validation Android/iOS Buildを生成できる。
- Development Buildには`expo-dev-client`が含まれる。
- Preview Buildに不要なDeveloper Toolを含めない。
- Production-validationでTest Controlが無効である。
- Pull RequestでNative静的検証とTestを実行できる。
- EAS Buildを`workflow_dispatch`からPlatform/Profile別に実行できる。
- Android/iOS Build結果が分離されている。
- Web CIとCloudflare DeployがNative EAS Build完了待ちにならない。
- Secret/CredentialがRepository、Bundle、Artifact、Logへ露出していない。
- `android/`と`ios/`をCommitしていない。

### 4.13 回帰/文書

- Web Format、Lint、Typecheck、Unit、Integration、Repository、Component、Contract、Build、Playwright主要Flowが成功する。
- Android/iOSの主要購入Flowが成立する。
- Android実SQLite Contract Suiteが成功する。
- iOS実SQLite後半Mutation Smokeが成功する。
- Critical/Highの既知不具合が残っていない。
- Phase 2の設計、実装、Build、Maestro、検証、運用手順が最新化されている。
- Phase 3へ送る課題が整理されている。

## 5. 対象

- Native Auth/Session UI
- Native対象外Role画面
- Guest Cart統合
- Account/Profile/Address
- Checkout/Mock Payment/Order/Review
- Native Validation/Keyboard/Safe Area/Back/未保存変更
- Deep Link Test Control完成
- Payment Delay
- Review用Seed Scenario
- 後半用Test Scenario
- Native Component Test
- Android Maestro必須Flow
- iOS Simulator主要Flow
- EAS Profile完成
- Android Preview APK
- iOS Simulator Build
- Production-validation Build
- GitHub ActionsのNative静的検証と手動EAS Build入口
- Native開発/Build/検証手順

## 6. 対象外

- Native Admin
- Store公開
- EAS Submit
- Store向けAAB/IPA
- Password変更
- 退会
- Guest Checkout
- Cancel/Return/Refund
- Audit Log
- Payment timeout/unknown/Reconciliation
- Migration Recovery/Crash Point/Integrity Check
- App Store/Google Play Release Gate
- Phase 3機能
- `android/`/`ios/`のCommit

## 7. 実装方針

### 7.1 Auth/Session

- 固定Accountと既存Auth Use Caseを再利用する。
- Native PBKDF2 Adapterを作り直さない。
- active customerだけが購入Flowへ進める。
- suspended/withdrawnは既存Application Errorで拒否する。
- operator/adminは対象外画面へ遷移する。
- Session StoreのFormat/Keyを変更しない。
- 不正/期限切れSessionは削除し、Guest状態へ戻す。
- LogoutでSessionを削除し、Cart/Guest Identityは既存契約に従う。

### 7.2 Guest Cart統合

- 既存Application Use Caseを利用する。
- UIで独自Merge Logicを実装しない。
- 完全統合、数量調整、除外、Checkout無効化をDTOどおり表示する。
- One-time NoticeはNative用Portを利用する。
- Notice表示の有無をStorage状態だけで暗黙判断せず、Application結果を正とする。

### 7.3 Account/Address

- Profile/Addressの業務Validationを共有する。
- UI ComponentはNative専用にする。
- Default Address再割当はRepository Transactionへ委譲する。
- Delete後のDefault決定をUIで実装しない。
- Keyboard/Scroll/Back/未保存保護をPlatform APIへ適合させる。

### 7.4 Checkout/Payment

必須Flow:

1. CartからCheckout開始
2. 未Login時のLogin誘導
3. Login後に元のCheckoutへ復帰
4. 配送先選択
5. 支払方法選択
6. 注文確認
7. Payment処理中
8. 注文完了
9. Payment失敗
10. 同一Order再試行
11. Session/Checkout復元
12. Background/Foreground

次を変更しません。

- Cart Version
- 価格/在庫再検証
- Checkout Session start/resume/abandon
- Payment冪等性
- Order/Order Item Snapshot
- 在庫減算
- Payment失敗後の同一Order再試行

UIでは二重Tap、Back、App State変化を扱います。Process Kill途中からの高度なCrash RecoveryはPhase 3です。

### 7.5 Order/Review

- Order/Payment/Shipmentの状態から既存Presentation文言を決める。
- Snapshotを正として表示する。
- NativeからOrder状態変更を行わない。
- deliveredだけReview可能とする。
- Review EligibilityをUIで独自判定しない。
- Review投稿/編集/削除をCustomer Review Use Caseへ委譲する。
- Review Summary更新を同じTransactionで行う。

Review Automation固定方式:

- delivered OrderとReview未投稿Order Itemを持つ専用Seed Scenarioを使用する。
- Deep Link ResetでScenarioを選ぶ。
- SQLite直接更新Helperを作らない。
- 任意DB変更APIを追加しない。
- Review Eligibilityを弱めない。

### 7.6 Test Control

固定Protocol:

```text
scenario-shop://test-control/reset?version=1&scenario=<id>&clock=<iso>&paymentDelayMs=<ms>
```

後半でPayment DelayをGatewayへ接続します。

禁止:

- 任意Entity作成/更新
- 任意SQL実行
- 任意Status変更
- Orderを直接deliveredへ変更
- Review Eligibility迂回
- 任意Payment結果注入

Payment結果は定義済みScenario Metadataから決定します。

### 7.7 Stable Test ID

Test IDは次の形式を基本とします。

```text
<domain>-<screen>-<element>
```

例:

```text
auth-login-email
cart-merge-notice
checkout-confirm-submit
payment-processing
payment-retry-submit
order-detail-status
review-form-submit
test-runtime-ready
```

- 配列Indexや表示文言をIDにしない。
- Android/iOSで同じ意味の要素は同じIDにする。
- UI構造変更で不要に変えない。
- ID一覧をDocsへ残す必要はないが、命名規則はADR/Guideへ記載する。

### 7.8 Native Component Test

UIの状態分岐をMaestroだけへ寄せません。

最低限:

- Auth Loading/Success/Error/Role拒否
- Cart Merge結果
- Address Validation/Default
- Checkout Step/Disabled/Processing
- Payment Failure/Retry
- Order Empty/List/Detail
- Review Eligibility/Form/Delete
- App State復帰時のPlatform非依存処理
- Stable Test ID/Accessibility

### 7.9 SQLite後半Mutation Test

Shared Contract Suiteを拡張する場合は、Dexie/SQLite双方へ同じ期待値を適用します。

Native Harnessで最低限実行:

- Login Session作成
- Logout Session削除
- Guest Cart Merge
- Address Default Reassign
- Checkout start/resume/abandon
- Payment成功Transaction
- Payment失敗/再試行
- Idempotency
- Inventory Rollback
- Review Summary Transaction

### 7.10 Maestro

Flowごとに次を記載します。

- 使用Scenario ID
- 起点Route
- 目的
- 主要Assertion
- Reset Link
- Android/iOS差分
- 失敗時Artifact

MaestroでDB内部値を直接検証しません。内部整合性はApplication/Repository Contract Testを正とし、MaestroはUIとPlatform統合を確認します。

### 7.11 EAS Build

固定Profile:

- `development-android`
- `development-ios-simulator`
- `preview-android`
- `preview-ios-simulator`
- `production-validation-android`
- `production-validation-ios-simulator`

確認項目:

- App Version
- Build Kind
- Build SHA
- Web/Native Schema Version
- Seed Version
- Test Control公開条件
- Native Module Link
- Build Artifact取得方法

Store提出Profileは作成しません。

### 7.12 CI

Pull Request:

- Format
- Lint
- Typecheck
- Architecture Dependency Check
- Unit/Application
- Dexie Shared Contract
- SQLite Node-side Test
- Native Component
- Route Dependency Check
- Native Bundle/Config Static Check
- Web既存CI

`workflow_dispatch`:

- Platform選択
- Profile選択
- Android EAS Build
- iOS EAS Build
- Production-validation
- Android Maestro（選択式または専用Workflow）

Workflow要件:

- Android/iOS Result分離
- Timeout
- External Build失敗判定
- Build ID/URL/Commit SHA記録
- Secret Masking
- 同一Branch/Profileの不要な重複実行抑制
- Web Deploy非依存

実Native SQLite Contract Testを完全自動化できない場合は、Development/Preview Buildでの実行手順と結果採取方法を明記します。未実行を成功扱いにしません。

## 8. 内部品質ゲート

Gateは同一`/goal`内の実行制御です。別フェーズや別PRに分けません。

### Gate A: Auth/Session/Cart Merge

完了条件:

- Login/Logout
- PBKDF2 Seed Login
- Session復元
- suspended/withdrawn拒否
- Role対象外
- Guest Cart統合
- Android/iOS Component/実操作
- SQLite Session/Cart Mutation Test

### Gate B: Account/Address

完了条件:

- Profile
- Address CRUD
- Default再割当
- Validation
- Keyboard/Back/未保存
- SQLite Address Transaction Test

### Gate C: Checkout/Payment/Order

完了条件:

- Checkout成功
- Payment処理中
- Payment失敗/再試行
- Order一覧/詳細
- Session/Checkout復元
- Background/Foreground
- Android/iOS実操作
- SQLite Order/Payment/Inventory Transaction Test

### Gate D: Review

完了条件:

- 専用Seed
- Review Eligibility
- 投稿/編集/削除
- Review Summary
- Android/iOS実操作
- SQLite Review Transaction Test

### Gate E: Automation

完了条件:

- Deep Link Payment Delay完成
- Scenario割当完成
- Stable Test ID完成
- Android Maestro 6 Flow成功
- 各Flow最低3回連続成功
- iOS主要Flow手動またはMaestro成功

### Gate F: Build/CI

完了条件:

- 6 EAS Profile完成
- Android Preview Build
- iOS Simulator Preview Build
- Production-validation Android/iOS
- Test Control無効化
- `workflow_dispatch`
- Secret非露出
- Web Deploy非依存

### Gate G: 最終回帰

完了条件:

- Android全主要Flow
- Android実SQLite Contract Suite
- Android Maestro
- iOS全必須手動Flow
- iOS SQLite後半Mutation Smoke
- 全Native Test
- Web全Test/Build/Playwright
- `android/`/`ios/`未Commit
- Critical/High解消

各Gate終了時にRun Artifactへ次を記録します。

- 使用Scenario
- 実施内容
- 成功した検証
- 失敗と修正
- Android/iOS差分
- SQLite内部検証
- 未確認事項
- 次Gateへ進める根拠

## 9. 実施順序

1. 最新`main`と前半成果の再調査
2. 開始条件と前半確定契約の確認
3. Run初期化とTask展開
4. 後半Scenario割当とTest ID方針確認
5. Gate A
6. Gate B
7. Gate C
8. Gate D
9. Native Component Test拡充
10. Deep Link Payment Delay完成
11. Gate E
12. Gate F
13. Gate G
14. 自己レビュー
15. Critical/High修正と再検証
16. Docs、ADR、PROJECT_CONTEXT、History、Run Artifact更新
17. Phase 3課題整理
18. Phase 2完了判定
19. 停止してユーザーへ報告

## 10. 検証コマンド/入口の整備

実装完了時に、次を`package.json`またはDocsから一意に実行できる状態にします。実際のScript名は既存命名へ合わせます。

- Web全検証
- Native Typecheck/Component
- Dexie Shared Contract
- SQLite Node-side Test
- Native Android Bundle/Build
- Native iOS Simulator Build
- Android Maestro
- EAS Manual Build Workflow
- Native SQLite Harness起動

個別コマンドが複雑な場合は、Repository Scriptへまとめます。手順書だけに長いCommand列を残しません。

## 11. 成果物

- Native Auth/Session/Role対象外UI
- Guest Cart統合UI
- Native Account/Profile/Address UI
- Native Checkout/Payment/Order/Review UI
- 後半Seed Scenario
- Native Component Test
- SQLite後半Mutation Contract Test
- Deep Link Payment Delay
- Android Maestro必須Flow
- iOS主要Flow検証記録
- 完成したEAS Profile
- Android Preview APK
- iOS Simulator Build
- Production-validation Build
- Native静的検証と手動EAS Build Workflow
- Native開発/Build/検証手順
- Phase 2完了ADR
- 更新済みREADME/PROJECT_CONTEXT
- HistoryとRun Artifact
- Phase 3へ送る課題一覧

## 12. Phase 2最終完了判定

次を分けて報告します。

### コード上の完了

- Platform/Route Architecture
- Application依存方向
- Customer Repository Capability
- SQLite Customer Adapter
- Native購入者Flow
- PBKDF2互換
- Native Component Test
- Shared/Native Contract Test
- Maestro Flow
- EAS/CI設定
- Test Control
- Docs

### 実環境での完了

- Android Preview Build
- Android起動/主要操作
- Android実SQLite Contract Suite
- Android Maestro 6 Flow
- iOS Simulator Build
- iOS起動/商品探索/Cart
- iOS Login/Account
- iOS Checkout成功/Order詳細
- iOS Payment失敗/再試行
- iOS Review
- iOS SQLite後半Mutation Smoke
- Production-validation Build
- Test Control無効化

実行していない項目をPASSにしません。iOSまたは実SQLite検証が不足する場合、Phase 2を完全完了とせず、次のように分けます。

```text
コード完了
Android検証完了/未完了
iOS検証完了/未完了
Native SQLite検証完了/未完了
EAS/CI検証完了/未完了
```

Phase 2完了後もPhase 3へ自動で進みません。最終報告でPhase 3候補、優先度、依存関係を提示して停止します。
