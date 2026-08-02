# Phase 2 後半計画: 会員購入Flow・Maestro・EAS/CI仕上げ

## 0. 依頼概要

- 依頼内容: Phase 2後半として、前半で完成したNative基盤とSQLiteを利用し、会員購入Flow、注文・Review、Maestro、EAS Build、Native向けCIと運用を完成させる。
- 背景: 認証後の購入FlowとNative自動化・配布を前半へ混ぜると、SQLite/Platform基盤の問題と業務Flowの問題を切り分けにくい。前半の確定契約を利用し、後半で機能完成と品質ゲートを行う。
- 期待成果: Android/iOSでLoginから購入、注文確認、Reviewまで操作でき、EAS Preview Buildと決定的なMaestro主要Flowを再現可能な状態。

## 1. ゴール

前半で確定したPlatform別Root Layout、Native Composition Root、SQLite Customer Repository、Session、Seed/Reset、Deep Link、Storefront、Cartを土台として、会員向け主要Flowを完成させる。

AndroidではMaestro必須Flow、iOSではSimulator上の主要購入Flowを成立させ、EAS Build、Native CI、検証手順まで整備してPhase 2を完了する。

画面数を増やすことではなく、WebとNativeで同じ業務契約と失敗状態を決定的に検証できることを優先する。

## 2. 開始条件

次を満たさない場合、この`/goal`を開始しない。

- Phase 2前半PRが`main`へマージ済みである。
- 最新`main`で前半Gate A〜Gが成功する。
- Android Preview APKを生成・起動できる。
- iOS Simulator Buildを生成・起動できる。
- Android/iOSでGuestの商品探索からCartまで操作できる。
- SQLite Customer Repository Contract Testが成功する。
- 前半のCritical/High不具合が残っていない。
- 前半の確定契約と未確認事項がDocsへ記録されている。
- Maestroを実行できるAndroid環境がある。
- iOS主要Flowを確認できるSimulatorまたは同等環境がある。
- EAS TokenをGitHub Actionsで使用するかが決まっている。
- Native Buildの実行頻度と費用上限が決まっている。

開始条件を満たさない場合、前半の基盤修正を後半へ大量に混ぜない。前半修正が必要なら、先に影響範囲と修正理由を明示して対応する。

## 3. 完了条件（DoD）

### Auth・Account

- Login、Logout、Session復元がAndroid/iOSで動作する。
- `active customer`だけが購入Flowへ進める。
- `suspended`と`withdrawn`のLogin拒否がWebと同じ意味で動作する。
- `operator`と`admin`はNative対象外画面へ遷移し、Logoutだけを利用できる。
- Guest Cartから会員Cartへの統合結果が既存契約と一致する。
- Profileと配送先の表示、追加、編集、削除、Default変更が動作する。
- NativeのKeyboard、Safe Area、Back操作、未保存変更保護が成立する。

### Checkout・Order・Review

- CartからLoginを経て元のCheckout導線へ復帰できる。
- Checkoutの配送先、支払方法、確認、処理中、完了が動作する。
- Payment失敗と同一Orderからの再試行が動作する。
- Cart Version、価格、在庫の再検証が既存契約と一致する。
- App再起動とBackground/Foreground後もSessionとCheckout状態が整合する。
- Order一覧、Order詳細、Payment/Shipment状態表示が動作する。
- delivered Orderに対するReview投稿、編集、削除が動作する。
- Review Flowは専用Seed Scenarioから開始し、Native Adminや任意DB書換えを必要としない。

### Testability・Automation

- Deep LinkからScenario Reset、Clock、Payment Delayを指定できる。
- Maestro Flow同士が前回実行状態へ依存しない。
- Test ID/Accessibility Labelが安定した業務概念へ付与されている。
- Androidで必須Maestro Flowが連続成功する。
- iOS SimulatorでLogin、Checkout成功、Order詳細、Payment失敗からの再試行を確認する。
- iOS Maestroを実行できる場合は主要Flowを実行し、実行できない場合は手動確認結果を記録する。

### Build・CI

- Android Preview APKを生成できる。
- iOS Simulator Buildを生成できる。
- `development`と`preview`ではTest Controlが有効である。
- `production`ではTest ControlのRoute、Handler、UIを利用できない。
- Native静的検証とTestをPRで実行できる。
- EAS Buildを`workflow_dispatch`から実行できる。
- Android/iOSのBuild結果が分離されている。
- Web CIとCloudflare DeployがNative EAS Build完了待ちにならない。
- SecretやCredentialがRepository、Bundle、Artifact、Logへ露出していない。

### 回帰・文書

- Web版のFormat、Lint、Typecheck、Test、Build、Playwright主要Flowが成功する。
- Android/iOSの主要購入Flowが成立する。
- Critical/Highの既知不具合が残っていない。
- Phase 2の実装、検証、Build、Maestro、運用手順が最新化されている。
- Phase 3へ送る課題が整理されている。

## 4. 対象と対象外

### 対象

- Native Auth/Session UI
- Native対象外Role画面
- Guest Cart統合
- Account、Profile、配送先
- Checkout、Mock Payment、Order、Review
- Native Validation、Keyboard、Safe Area、Back操作、未保存変更保護
- Deep Link Test Controlの完成
- Payment Delay
- Review用Seed Scenario
- React Native Testing LibraryによるNative Component Test
- Maestro主要Flow
- EAS Development/Preview/Production相当Profile
- Android Preview APK
- iOS Simulator Build
- GitHub ActionsのNative静的検証と手動EAS Build入口
- Native開発・Build・検証手順

### 対象外

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

## 5. 前半から維持する契約

後半の都合で次を不要に変更しない。

- Platform別Root LayoutとShell
- Native Composition Rootの注入構造
- SQLite Schema Version
- Customer Repository InterfaceとTransaction境界
- Session ID、Guest ID、Password Hashの保存形式
- Native Asset Map形式
- Deep Link Test Controlの基本形式
- Stable Test ID規約
- EAS Development/Previewの基本Profile

変更が避けられない場合は、実装前に次を記録する。

- 変更が必要な具体的理由
- 前半で予測できなかった根拠
- Web、SQLite、Android、iOS、Testへの影響
- Migrationが不要である根拠、またはPhase 2内で扱える最小対応
- ADRと回帰Test

## 6. 実装方針

### 6.1 Auth・Session

- 固定Accountと既存Auth Use Caseを再利用する。
- active customerだけが購入Flowへ進める。
- suspended/withdrawnのLogin拒否をWebと同じApplication Errorで扱う。
- operator/adminはNative対象外画面へ遷移させ、管理機能を追加しない。
- App再起動後のSession復元を確認する。
- Guest Cart統合は既存Application Use Caseを利用する。
- Cart統合の完全統合、数量調整、除外、Checkout無効化を既存契約どおり表示する。

### 6.2 Account・配送先

- Profile表示・編集をNativeで操作可能にする。
- 配送先の追加、編集、削除、Default変更を実装する。
- Validation Messageの意味をWebと一致させる。
- NativeではKeyboard Avoidance、Scroll、Safe Area、Back操作を確認する。
- 未保存変更保護はNative Navigationへ適合させ、Web DOM Eventを流用しない。

### 6.3 Checkout・Payment

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

次の既存契約を変更しない。

- Cart Version
- 価格・在庫再検証
- Checkout Session start/resume/abandon
- Payment冪等性
- Order/Order Item Snapshot
- 在庫減算
- Payment失敗後の同一Order再試行

二重送信と戻る操作を防ぎつつ、高度なCrash RecoveryはPhase 3へ送る。

### 6.4 Order・Review

- Order一覧と詳細を実装する。
- Order、Payment、Shipmentの既存状態から表示文言を決定する。
- 商品、価格、画像、配送先Snapshotを利用する。
- delivered Orderの商品だけReview可能とする。
- Review投稿、編集、削除、非公開/削除済み状態を既存契約どおり表示する。
- NativeからOrder状態変更やReview管理操作を行わない。

Review Automationは次の固定方式とする。

- delivered OrderとReview未投稿Order Itemを持つ専用Seed Scenarioを追加または既存Scenarioから選定する。
- Deep Link ResetでScenarioを選択する。
- SQLite直接更新Helperを作らない。
- 任意DB変更Test APIを追加しない。
- Review Eligibilityを弱めない。

### 6.5 Native Test Control

Deep Linkを唯一の外部Automation入口とする。

許可操作:

- Scenario Reset
- Clock設定/解除
- Payment Delay設定

禁止操作:

- 任意Entity作成・更新
- 任意SQL実行
- 任意Status変更
- Review Eligibilityの迂回

Development/Previewだけで有効にし、Production相当ProfileではRoute、Handler、UIのいずれからも利用できないことをTestする。

### 6.6 Native Component Test

React Native Testing Libraryを使用する。

最低限の対象:

- Login成功/拒否表示
- Role対象外画面
- Guest Cart統合Notice
- Profile/Address Validation
- Checkout StepとButton状態
- Payment Processing/Failure
- Order Empty/List/Detail
- Review EligibilityとForm
- Keyboard/Backに関するPlatform非依存挙動
- Accessibility Label/Test ID

Domain、Application、SQLiteはVitestを継続する。

### 6.7 Maestro

Web Playwright全件を機械的に移植しない。Nativeで学習価値が高く、Platform統合を検証できるFlowへ限定する。

Android必須Flow:

1. Guestの商品閲覧とCart操作
2. LoginとGuest Cart統合
3. Checkout成功とOrder確認
4. Payment失敗と再試行
5. App再起動後のSession/Checkout復元
6. delivered OrderへのReview投稿

原則:

- 各Flowの先頭でDeep Link Resetを実行する。
- 前回Flowの状態へ依存しない。
- 座標Tapを避ける。
- Stable Test IDまたはAccessibility Labelを使用する。
- 表示文言だけへ過度に依存しない。
- RetryでFlakyを隠さない。
- 同じFlowを複数回連続実行して安定性を確認する。

iOSでは利用可能なら同じ主要FlowをMaestroで確認する。Maestroを実行できない場合も、SimulatorでLogin、Checkout成功、Order詳細、Payment失敗からの再試行を手動確認する。

### 6.8 EAS Build

固定Profile:

- `development`: Development Client、Test Control有効
- `preview`: 内部検証、Test Control有効、Android APK、iOS Simulator Build
- `production`: Test Control無効、Store提出なし

実施内容:

- Android Preview APK生成
- iOS Simulator Build生成
- Build Metadata確認
- App Version、Schema Version、Seed Version、Build SHA確認
- CredentialとSecretの管理手順
- Build URL/Artifact確認手順
- Local BuildとEAS Cloud Buildの使い分け
- Production相当ProfileのTest Control無効化検証

### 6.9 CI

Native BuildはWeb CIへ無条件で追加しない。

固定方針:

- Pull Request
  - Format
  - Lint
  - Typecheck
  - Unit/Application/Repository Contract
  - Native Component Test
  - Native Bundle/Config静的検証
  - Web既存CI
- `workflow_dispatch`
  - Android EAS Preview Build
  - iOS EAS Simulator Build
  - 必要に応じたAndroid Maestro
- Web Cloudflare Deploy
  - Native EAS Buildへ依存させない

CIでは次を守る。

- Android/iOS Jobと結果を分ける。
- Build未実行を成功済みと表示しない。
- EAS TokenをRepositoryへ保存しない。
- SecretをLogへ出力しない。
- 外部Build完了待ちにはTimeoutと失敗判定を設定する。
- 同一Branchの不要な重複Buildを抑制する。

## 7. Test Scenario割当

各主要Flowは開始状態をSeed名で説明できるようにする。

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

既存Scenarioで不足する場合だけ追加する。WebとNativeで同じScenario名と意味を維持する。

## 8. 内部品質ゲート

これらは別フェーズや別PRではない。同一`/goal`内で順番に通過する。Gateが失敗している状態で次へ進まない。

| Gate | 到達条件 |
|---|---|
| A: Auth | Login、拒否、Session復元、Role対象外、Guest Cart統合がAndroid/iOSで成立する |
| B: Account | ProfileとAddress CRUD、Validation、Back/未保存変更保護が成立する |
| C: Purchase | Checkout成功、Payment失敗/再試行、Order一覧/詳細が成立する |
| D: Review | 専用SeedからReview投稿/編集/削除が成立する |
| E: Automation | Deep Link ResetとAndroid Maestro必須Flowが連続成功する |
| F: Build/CI | EAS Profile、Android/iOS Build、Production Test Control無効化、手動Workflowが成立する |
| G: 最終回帰 | Android/iOS主要Flow、全Native Test、Web Test/Build/Playwrightが成功する |

各Gate終了時にRun Artifactへ次を記録する。

- 使用Scenario
- 実施内容
- 成功した検証
- 失敗と修正
- Android/iOS差分
- 未確認事項
- 次Gateへ進める根拠

## 9. 実施順序

1. 最新`main`と前半成果の再調査
2. 開始条件と前半確定契約の確認
3. 後半詳細計画とScenario割当の確定
4. Gate A: Auth、Session、Role対象外、Guest Cart統合
5. Gate B: Account、Profile、Address
6. Gate C: Checkout、Payment、Order
7. Gate D: Reviewと専用Seed
8. Native Component Test拡充
9. Deep Link Test ControlとPayment Delay完成
10. Gate E: Android Maestro必須Flow
11. iOS主要FlowのMaestroまたは手動確認
12. Gate F: EAS Profile、Android/iOS Build、Native手動Workflow
13. Gate G: Android/iOS/Web総合回帰
14. 自己レビューとCritical/High修正
15. Docs、ADR、Run Artifact、Phase 3課題更新
16. Phase 2完了判定
17. 停止してユーザーへ報告

## 10. 検証方法

### Application/SQLite

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

### Native UI

Android/iOSで確認する。

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

### Maestro

- Deep Link Resetから開始する。
- Flow同士が前回状態へ依存しない。
- Stable Test ID/Accessibility Labelを使用する。
- Android必須Flowが連続成功する。
- Flaky時にRetryだけで解決しない。

### Build/Security

- Development Build
- Android Preview APK
- iOS Simulator Build
- Production相当Build設定
- Profile別Test Control公開条件
- Build Metadata
- Secret/Credential非混入

### Web回帰

- Format/Lint/Typecheck
- Unit/Integration/Repository/Component/Contract
- Web Build
- Playwright主要Flow
- Cloudflare用Production Build契約
- Web Test API公開条件

## 11. 成果物

- Native Auth/Session/Role対象外UI
- Native Account/Profile/Address UI
- Native Checkout/Payment/Order/Review UI
- Review用Seed Scenario
- Native Component Test
- Deep Link Test ControlとPayment Delay
- Android Maestro必須Flow
- EAS Build Profile完成
- Android Preview APK
- iOS Simulator Build
- Native静的検証と手動EAS Build Workflow
- Native開発・Build・検証手順
- Phase 2完了ADR
- 更新済みREADME/PROJECT_CONTEXT
- 履歴文書とRun Artifact
- Phase 3へ送る課題一覧

## 12. Phase 2最終完了判定

次を分けて報告する。

### コード上の完了

- Android/iOS共通Domain/Application契約
- SQLite Customer Adapter
- Native購入者Flow
- Native Component Test
- Maestro Flow
- EAS/CI設定
- Test Control
- Docs

### 実環境での完了

- Android Build
- Android起動・主要操作
- Android Maestro
- iOS Simulator Build
- iOS起動・商品探索・Cart
- iOS Login・Checkout成功・Order詳細
- iOS Payment失敗・再試行
- 内部Build確認

実行していない項目をPASSとしない。iOS実環境検証が不足する場合、Phase 2を完全完了とせず「コード完了・iOS検証未完了」と記録する。

Phase 2完了後もPhase 3へ自動で進まない。最終報告でPhase 3候補、優先度、依存関係を提示して停止する。
