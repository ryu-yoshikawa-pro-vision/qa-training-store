# Phase 2 後半計画: 会員購入Flow・Maestro・EAS/CI仕上げ

## 0. 依頼概要

- 依頼内容: Phase 2後半として、前半で完成したNative基盤とSQLiteを利用し、会員購入Flow、注文・Review、Maestro、EAS Build、Native向けCIと運用を完成させる。
- 背景: 認証後の購入FlowとNative自動化・配布を前半へ混ぜると、SQLite/Platform基盤の問題と業務Flowの問題を切り分けにくい。前半の確定契約を利用し、後半で機能完成と品質ゲートを行う。
- 期待成果: Android/iOSでLoginから購入、注文確認、Reviewまで操作でき、EAS Preview BuildとMaestro主要Flowを再現可能な状態。

## 1. ゴール / 完了条件

### ゴール

前半で確定したNative Runtime、SQLite、Session、Seed/Reset、Storefront、Cartを土台として、会員向け主要Flowを完成させる。Android/iOSの内部検証BuildとMaestroによる決定的なNative E2Eを成立させ、Phase 2を完了する。

### 完了条件（DoD）

- 前半のPlatform/Repository契約を不要に変更していない。
- Login、Logout、Session復元、利用停止/退会済みLogin拒否が動作する。
- Profileと配送先管理が動作する。
- CartからLoginを経て会員Cartへ統合できる。
- Checkoutの配送先、支払方法、確認、処理中、完了、失敗、再試行が動作する。
- Order一覧・詳細・状態表示が動作する。
- delivered Orderに対するReview投稿・編集・削除が動作する。
- Seed、Reset、Clock、Payment DelayがNative自動化から利用できる。
- Maestro主要FlowがAndroidで成功する。
- iOS Simulatorまたは利用可能なiOS環境で、合意した主要Flowを検証する。
- Android Preview APKとiOS Simulator/Internal Buildを生成できる。
- Production相当BuildでTest Controlが無効になる。
- Native Build/TestのCIまたは手動起動入口が明確である。
- Web版の既存動作・Web CI・Cloudflare Deploy契約を壊していない。
- Phase 2の実装・検証・運用Docsが最新化されている。
- Phase 3へ送る課題が明確になっている。

## 2. 開始条件

- Phase 2前半PRがmainへマージ済みである。
- 最新mainで前半のAndroid Build、SQLite Contract Test、Guest購入前Flowが成功する。
- 前半最終報告に記載された未確認事項と確定契約を確認している。
- 前半のCritical/High不具合が残っていない。
- Android package、iOS bundleIdentifier、EAS Project、Credential方針について、後半実装に必要な判断が完了している。

開始条件を満たさない場合、後半へ前半修正を大量に混ぜない。前半の修正が必要なら、理由と影響範囲を先に明示する。

## 3. 現状理解と前提

### Current understanding

- Domain/Application/Repository ContractはWebとNativeで共通利用する。
- Native Adminは対象外で、管理操作は引き続きWeb版を使用する。
- Paymentは外部Gatewayを呼ばない決定的なMockである。
- Native E2EはPlaywrightではなくMaestroを使用する。
- Phase 2の配布目的は開発・内部検証であり、Store公開ではない。

### Assumptions

- 前半でNative Bootstrap、SQLite、Session/Crypto基盤、Seed/Reset、Storefront、Cartが完成している。
- 前半のRepository Contractを後半の都合で変更しない。
- MaestroからDeep Linkまたは専用Test Control入口を利用してScenarioを初期化する。
- EAS Development/Preview Buildを主な検証対象とする。
- Production相当ProfileはBuild契約確認までとし、Store提出は行わない。

### Non-goals

- Native Admin
- Store公開、EAS Submit
- Password変更、退会
- Guest Checkout
- Cancel、Return、Refund
- Audit Log
- Payment timeout/unknown、Reconciliation
- Migration Recovery、Crash Point
- Phase 3の障害・運用教材

## 4. 影響範囲

### 主な確認対象

- 前半で追加されたNative Bootstrap/Adapter/SQLite実装
- `app/`のAuth、Account、Checkout、Order、Review Route
- `src/application/use-cases/`
- `src/presentation/pages/`
- `src/presentation/guards/`
- `src/infrastructure/session/`
- `src/infrastructure/payment/`
- `src/seeds/`
- `src/test-controls/`
- `eas.json`
- `app.config.ts`
- Maestro Flow格納先
- GitHub Actions Workflow
- README、PROJECT_CONTEXT、Native運用Docs

### 変更候補

- Native Auth/Session UI
- Native Account/Profile/Address UI
- Native Checkout/Payment/Order/Review UI
- Native Navigation/Focus/Keyboard/Safe Area補正
- Test Control Deep LinkまたはAutomation入口
- Maestro FlowとHelper
- EAS Profileの完成
- Native Build/Test用CIまたは手動Workflow
- Native開発・検証手順
- Phase 2完了ADR/Docs

## 5. 実装方針

### 5.1 Auth・Session

- 固定Accountと既存Auth Use Caseを再利用する。
- active customerだけが購入Flowへ進める既存契約を維持する。
- operator/adminはNative管理画面へ遷移させず、Native対象外であることを明確に表示または安全なRouteへ戻す。
- suspended/withdrawnのLogin拒否をWebと同じ意味で実装する。
- App再起動後のSession復元を確認する。
- Guest Cartと会員Cartの統合、完全除外、部分調整、Checkout無効化を既存契約どおり処理する。

### 5.2 Account・配送先

- Profile表示・編集をNativeで操作可能にする。
- 配送先の追加、編集、削除、Default変更を実装する。
- 入力Validation、Error Summary相当、Keyboard、Safe Area、Scroll、Back操作をNative向けに確認する。
- 未保存変更保護はNative Navigationに適した方法で実装し、Web実装をそのままコピーしない。

### 5.3 Checkout・Payment

対象Flow:

1. CartからCheckout開始
2. 未Login時のLogin誘導と復帰
3. 配送先選択
4. 支払方法選択
5. 注文確認
6. Payment処理中
7. 注文完了
8. Payment失敗
9. 同一Orderから再試行
10. App再起動時の処理中/再開契約

既存のCart Version、価格・在庫再検証、Checkout Session再開/破棄、Payment冪等性、Order Snapshot、在庫減算を変更しない。

Native UIでは、処理中の二重送信、戻る操作、Background/Foreground復帰を確認する。ただし高度なCrash RecoveryはPhase 3へ送る。

### 5.4 Order・Review

- Order一覧と詳細を実装する。
- Order、Payment、Shipmentの組合せから既存Presentation文言を表示する。
- 商品・価格・画像・配送先Snapshotを利用する。
- delivered Orderの商品だけReview可能とする。
- Review投稿、編集、削除、非公開/削除済み表示を既存Customer DTO契約どおり実装する。
- Nativeから管理操作は行わない。

### 5.5 Native Test Control

- Maestroから決定的なScenarioへResetできる入口を提供する。
- Deep Linkまたは起動引数を第一候補とし、任意DB書換えAPIを追加しない。
- ClockとPayment Delayを設定できる。
- Test Control UIを用意する場合もDevelopment/Previewだけで有効にする。
- Production相当Profileで入口がBundle/Runtimeから無効であることをTestする。

### 5.6 Maestro

主要Flowを絞り、Web E2E全件を機械的に移植しない。

必須候補:

1. Guestの商品閲覧とCart操作
2. LoginとGuest Cart統合
3. Checkout成功とOrder確認
4. Payment失敗と再試行
5. App再起動後のSession/Checkout復元
6. delivered OrderへのReview投稿

必要に応じて、Android/iOS差分をFlow内条件またはPlatform別Flowへ分離する。座標依存を避け、Accessibility Label/Test IDを適切に使用する。

### 5.7 EAS Build・内部配布

推奨Profile:

- `development`: Development Client、Test Control有効
- `preview`: 内部検証、Test Control有効、Android APK、iOS Simulator/Internal
- `production`: Test Control無効、Store提出は行わない

実施内容:

- Android Preview APK生成
- iOS Simulatorまたは合意した内部Build生成
- Build Metadata確認
- CredentialとSecretの管理手順
- Build URL/Artifactの確認方法
- Local BuildとCloud Buildの使い分け

### 5.8 CI

Native BuildはWeb CIへ無条件で毎回追加しない。EAS費用と実行時間を考慮し、次のいずれかを現状に合わせて選択する。

- PRではTypecheck/Unit/ContractとNative静的検証、mainまたは手動でEAS Build
- Native関連Path変更時だけMaestro/Buildを実行
- Scheduledまたはworkflow_dispatchでAndroid/iOS Buildを実行

CI設計では次を守る。

- Web CIとCloudflare Deployを不必要に待たせない。
- EAS TokenなどをRepositoryへ保存しない。
- Build未実行を成功済みと誤表示しない。
- Android/iOS結果を分離する。
- EASの外部非同期Build完了待ちをWorkflowで扱う場合、Timeoutと失敗判定を明確にする。

## 6. 実施順序

1. 最新mainと前半成果の再調査
2. 後半Scopeと前半確定契約の確認
3. Auth/Session/Cart統合
4. Account/Profile/Address
5. Checkout/Payment
6. Order
7. Review
8. Test Control/Deep Link
9. Android Maestro主要Flow
10. iOS Maestroまたは同等実操作確認
11. EAS Development/Preview/Production相当Profile確認
12. Native CI/手動Workflow
13. Android/iOS総合回帰
14. Web総合回帰
15. 自己レビューとCritical/High修正
16. Docs、ADR、Run Artifact更新
17. Phase 2完了判定

この順序は一つの後半計画内の作業順であり、別フェーズや別PRへ細分化しない。

## 7. 検証方法

### Application/Repository

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

Android/iOSで次を確認する。

- Login/Logout
- Keyboard、Scroll、Safe Area
- Back操作
- Session復元
- Guest Cart統合Notice
- Checkout各Step
- Processing中の二重操作防止
- Payment失敗からの再試行
- Order一覧/詳細
- Review投稿/編集/削除
- App再起動とForeground復帰
- Error/Empty/Loading状態

### Maestro

- Scenario Resetから開始できる。
- Flow同士が前回状態へ依存しない。
- Test ID/Accessibility Labelが安定している。
- Android必須Flowが連続成功する。
- iOSは実行可能環境で主要Flowを確認し、未実行項目を明示する。

### Build

- Development Build
- Android Preview APK
- iOS Simulator/Internal Build
- Production相当Build設定
- Test ControlのProfile別公開条件
- Build Metadata
- Secret非混入

### Web回帰

- Format/Lint/Typecheck
- Unit/Integration/Repository/Component/Contract
- Web Build
- Playwright主要Flow
- Cloudflare用Production Build契約
- Test API公開条件

## 8. リスクと対応

| リスク | 対応 |
|---|---|
| 後半で前半基盤を大きく変更 | 前半確定契約を開始時に明文化し、変更時は理由と影響を記録する |
| Native UI実装がWeb仕様を変える | Domain/Application契約を正本とし、PresentationだけPlatform適応する |
| Maestroが座標・文言へ過度依存 | Test ID/Accessibility LabelとScenario Resetを使う |
| EAS Build費用・時間増大 | PR必須範囲を絞り、main/手動/Path条件を使う |
| iOS確認不足 | Build、起動、操作、Maestroを別々に記録する |
| Background復帰でPayment不整合 | 既存冪等性を利用し、高度Crash RecoveryはPhase 3へ送る |
| Native CIがWeb Deployを阻害 | Workflow/Job依存を分離する |
| Scope拡大 | Password変更、退会、Guest Checkout、返品・返金を追加しない |

## 9. 成果物

- Native Auth/Session/Account UI
- Native Checkout/Payment/Order/Review UI
- Native Test Control/Deep Link
- Maestro主要Flow
- EAS Build Profile完成
- Android APKとiOS検証Build
- Native CIまたは手動実行Workflow
- Native開発・Build・検証手順
- Phase 2完了ADR
- 更新済みREADME/PROJECT_CONTEXT
- 履歴文書
- Run Artifact
- Phase 3へ送る課題一覧

## 10. Phase 2最終完了判定

次を区別して報告する。

### コード上の完了

- Android/iOS共通コード
- SQLite
- 購入者Flow
- Maestro Flow
- EAS/CI設定
- Test
- Docs

### 実環境での完了

- Android Build
- Android起動・操作
- Android Maestro
- iOS Build
- iOS起動・操作
- iOS Maestroまたは合意した代替確認
- 内部配布確認

実行していない項目をPASSとしない。外部環境不足で残った項目は、Phase 2の未完了または明示的に合意された運用上の残課題として記録する。

Phase 2完了後も、Phase 3実装へ自動で進まない。最終報告でPhase 3候補と優先度を提示して停止する。
