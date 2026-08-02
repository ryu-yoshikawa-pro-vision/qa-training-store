# Phase 2 後半計画: 会員購入Flow・Maestro・EAS/CI仕上げ

## 0. この計画の位置づけ

本書はPhase 2後半を一つの`/goal`で最後まで実施するための詳細実装契約です。

実行時は次を参照します。

1. `AGENTS.md`
2. `PLANS.md`
3. `docs/PROJECT_CONTEXT.md`
4. `docs/adr/`
5. `docs/plans/phase2-native-goal/00_master-roadmap.md`
6. `docs/plans/phase2-native-goal/01_phase2-first-half-native-foundation.md`
7. 前半PRの最終Report、ADR、Run Artifact
8. 本書

Run開始時にRun Planと`.codex/runs/<run_id>/`を作成し、本書のGateとDoDをTaskへ展開します。文書の優先順位とADRによる置換条件はMaster Planに従います。前半ADRは、Master Planの`Accepted`、`Supersedes`、ユーザー承認条件を満たす範囲だけ上位計画を置き換えます。

## 1. ゴール

前半で確定した基盤を変更せず、Android/iOSの会員購入FlowとNative自動化を完成させます。

完成対象:

- Login、Logout、Session復元、Role対象外処理
- Guest Cart統合
- Account、Profile、配送先
- Checkout
- Mock Payment成功、失敗、再試行
- Order一覧、Order詳細
- Review投稿、編集、削除
- Payment Delayを含むTest Control
- Android Maestro必須Flow
- iOS Simulator主要Flow
- 購入系Contract Harness
- `.eas/workflows/phase2-native-purchase.yml`
- Android/iOS最終Production-validation
- Native開発、Build、検証、運用手順

画面数を増やすことではなく、WebとNativeで同じ業務契約、状態遷移、失敗状態を決定的に検証できることを優先します。

## 2. 開始条件

次を満たさない場合、この`/goal`を開始しません。

- Phase 2前半PRが`main`へマージ済みである。
- 最新`main`で前半Gate A〜Gが成功する。
- Route InventoryとPlatform Route方式が文書化されている。
- Application→Infrastructure直接依存が除去されている。
- Customer/Admin Repository CapabilityとTransaction Scope分離が完了している。
- Android/iOSでGuestの商品探索からCartまで操作できる。
- Android実SQLite Customer Contract Suiteが成功する。
- iOS実SQLite主要Contract Smokeが成功する。
- 全Application/Harness ConnectionでForeign Key Enforcementが有効である。
- Harness専用DB/KV隔離とCleanupが成功する。
- Harness前後でApplication DBのDatabase名、Schema Version、Seed Version、既存Seedの既知レコードが変化しない。
- Sentinel専用Table、Domain Entity、Repository、Use Caseが追加されていない。
- Web/Android/iOSのPBKDF2互換Testが成功する。
- `jest-expo`環境のNative Component Testが成功する。
- Vitest/Jestの型境界が分離され、`typecheck:app`と`typecheck:native-tests`が成功する。
- `expo-sqlite/kv-store`のSession/Guest復元が成功する。
- Deep Link Reset Version 1が成功する。
- `.eas/workflows/phase2-native-foundation.yml`または承認済み代替経路が成功する。
- 前半のCritical/High不具合が残っていない。
- Maestroを実行できるAndroid環境がある。
- iOS主要Flowを確認できるSimulator環境がある。
- EAS Workflows利用不能時の代替経路と費用上限が決まっている。

開始条件を満たさない場合、前半基盤の大規模修正を後半へ混在させません。必要な修正を前半修正として扱うか、理由と影響を報告します。

## 3. 前半から維持する契約

後半の都合で次を不要に変更しません。

- Route Inventory、Root Layout、Platform別Shell
- Application依存方向
- Customer/Admin Repository CapabilityとTransaction Scope
- Native Composition Root注入構造
- `NATIVE_DATABASE_SCHEMA_VERSION`
- Customer Repository InterfaceとTransaction境界
- Foreign Key初期化とTable別FK Action
- `withExclusiveTransactionAsync()`とCommit後結果返却
- UI二重送信防止、Reset Mutex、Lock Error変換
- 独自Global Mutation Queueを標準実装しない方針
- Shared Customer Contract Suite
- Harness専用DB/KV、Cleanup、既存Seedレコード確認
- Sentinel専用基盤を追加しない方針
- Session/Guest/Clock/DelayのKV Keyと形式
- PBKDF2 Library、Platform隔離、Encoded Format、Test Vector
- `jest-expo`設定
- `tsconfig.native-tests.json`とVitest/Jestの型境界
- `typecheck:app`、`typecheck:native-tests`、統合`typecheck`
- Native Asset Map形式
- Deep Link Protocol Version 1
- Stable Test ID規約
- CNG方針
- EAS Profile名、Environment、`EXPO_PUBLIC_*` env、Metadata契約
- `.eas/workflows/phase2-native-foundation.yml`

変更が避けられない場合は、Master Planの条件を満たすADRをコード変更前に作成し、理由、影響、Schema/FK/Storage変更の有無、回帰Testを記録します。変更が広範囲なら後半Goalを継続せず、前半修正として扱うかを報告します。

## 4. 完了条件（DoD）

### 4.1 Auth / Session

- Webと同じ固定AccountでAndroid/iOSからLoginできる。
- Native PBKDF2が既存Seed HashをVerifyする。
- Login、Logout、Session復元が動作する。
- `active customer`だけが購入Flowへ進める。
- `suspended`と`withdrawn`を既存Application Errorで拒否する。
- `operator`と`admin`はNative対象外画面へ遷移し、Logoutだけを利用できる。
- App再起動後にKV StoreからSessionを復元する。
- 不正Sessionを削除し、安全にGuestへ戻す。

### 4.2 Guest Cart統合

- Login前Guest CartをCustomer Cartへ統合できる。
- 数量調整、在庫不足、上限超過、除外、価格変更を既存契約どおり表示する。
- 統合後のGuest Cart/Guest Identityの扱いが既存契約と一致する。
- Active Checkout無効化条件が既存契約と一致する。
- Cart統合Noticeを一度だけ表示する。
- Customer Transaction Scopeだけで統合処理を実行する。

### 4.3 Account / Address

- Profile表示、編集が動作する。
- 配送先の一覧、追加、編集、削除、Default変更が動作する。
- Validation Messageの意味がWebと一致する。
- Keyboard、Scroll、Safe Area、Back操作が成立する。
- 未保存変更保護が成立する。
- Address Transaction、Foreign Key、Default制約が実SQLiteで成功する。

### 4.4 Checkout / Payment

- CartからCheckoutを開始できる。
- 未Login時にLoginへ誘導し、成功後にCheckoutへ復帰する。
- Checkout Sessionのstart/resume/abandonが既存契約と一致する。
- 配送先、支払方法、注文確認を操作できる。
- UIでPaymentの二重送信を防止する。
- Cart Version、価格、在庫を注文確定前に再検証する。
- Payment成功でOrder、Order Item、Payment、Inventoryが整合する。
- Payment失敗後、同一Orderから再試行できる。
- Payment冪等性を維持する。
- Transaction結果はCommit成功後だけUIへ返る。
- Lock ErrorをApplication Errorとして扱い、非冪等処理を自動Retryしない。
- 独自Mutation Queueなしで安定動作することを実Native Testで確認する。
- 同時Mutationによる再現可能な失敗が確認された場合だけ、対象Scopeを限定した最小の直列化を追加する。
- App再起動とBackground/Foreground後もSession、Checkout、Payment状態が整合する。
- 高度なCrash Recoveryは実装しない。

### 4.5 Order / Review

- Order一覧とOrder詳細が動作する。
- Order、Payment、Shipmentの状態から既存文言を表示する。
- 商品、価格、画像、配送先Snapshotを利用する。
- delivered Orderの商品だけReview可能である。
- Review投稿、編集、削除が動作する。
- Hidden/Deletedなど既存状態の表示契約を維持する。
- Review Summaryを同一Customer Transactionで更新する。
- Review Flowを専用Seed Scenarioから開始できる。
- Native Adminや任意DB書換えを必要としない。

### 4.6 Test Control / Harness

- Deep Link Protocol Version 1を維持する。
- Scenario Reset、Clock、Payment Delayを指定できる。
- `paymentDelayMs`は0〜30,000msだけ許可する。
- Resetと購入処理が不正に並行しない。
- Ready/Error SignalをMaestroから判定できる。
- Arbitrary SQL、任意Entity/Status変更、Review Eligibility迂回がない。
- Harnessは定義済みContract Suiteだけを専用DB/KVで実行する。
- Harness Cleanupと既存SeedレコードによるApplication DB不変確認が成功する。
- 確認用レコードのための専用Table、Entity、Repository、Use Caseがない。
- Production-validationでTest ControlとHarnessを利用できない。

### 4.7 Native Component Test / TypeScript型境界

`jest-expo`とReact Native Testing Libraryで最低限次を検証する。

- Login成功/拒否表示
- Role対象外画面
- Guest Cart統合Notice
- Profile/Address Validation
- Checkout StepとButton状態
- Payment Processing/Failure
- Order Empty/List/Detail
- Review EligibilityとForm
- Back/未保存変更ロジック
- Accessibility Label/Test ID

追加条件:

- Native TestでDOM/jsdomを使わず、SQLite/PBKDF2の実Native検証をComponent Testで代替しない。
- Root `tsconfig.json`と`tsconfig.native-tests.json`の型境界を維持する。
- VitestとJestのGlobal型を同じTypeScript Programへ混在させない。
- `typecheck:app`と`typecheck:native-tests`が成功する。
- 後半でNative Testを追加してもWeb/Vitest側の型設定を変更しない。

### 4.8 Maestro

Android必須Flow:

1. Guestの商品閲覧とCart操作
2. LoginとGuest Cart統合
3. Checkout成功とOrder確認
4. Payment失敗と再試行
5. App再起動後のSession/Checkout復元
6. delivered OrderへのReview投稿
7. Native Contract Harness購入系Suite
8. Production-validationでTest Control/Harness無効確認

原則:

- 各Flowの先頭でDeep Link Resetを実行する。
- 前回Flowの状態へ依存しない。
- 座標Tapを避ける。
- Stable Test IDまたはAccessibility Labelを使う。
- RetryでFlakyを隠さない。
- 必須Flowを連続実行して安定性を確認する。

iOSでは次を確認する。

- Login
- Checkout成功
- Order詳細
- Payment失敗からの再試行
- Contract Harness主要Smoke
- Production-validation無効確認

### 4.9 Build / EAS / CI

Master PlanのEAS Profile、Environment、`EXPO_PUBLIC_*` envを維持する。

- Preview Build/Maestro Jobは`environment: preview`を使う。
- Production-validation Jobは`environment: production`を使う。
- Android Preview APKを生成できる。
- iOS Preview Simulator Buildを生成できる。
- `.eas/workflows/phase2-native-purchase.yml`からAndroid/iOS BuildとMaestroを実行できる。
- Build成果物を後続Maestro Jobへ渡す。
- Android/iOSのBuild/Test結果を分離する。
- Android/iOS両方で最終Production-validationを実行する。
- Production-validation Metadataが次と一致する。

```text
extra.appEnvironment === "production"
extra.buildKind === "production"
extra.testMode === "false"
```

- Production-validationでTest Control/Harnessを利用できない。
- `typecheck:app`と`typecheck:native-tests`が成功する。
- Web CIとCloudflare DeployがNative Workflow完了待ちにならない。
- SecretやCredentialをRepository、Bundle、Artifact、Logへ露出しない。

### 4.10 回帰 / 文書

- WebのFormat、Lint、Typecheck、Test、Build、Playwright主要Flowが成功する。
- Android/iOSの主要購入Flowが成立する。
- Critical/Highの既知不具合が残っていない。
- Native開発、Build、Maestro、検証、運用手順を最新化している。
- Phase 3へ送る課題を整理している。

## 5. 対象

- Native Auth/Session UIとRole対象外画面
- Guest Cart統合
- Account、Profile、配送先
- Checkout、Mock Payment、Order、Review
- Native Validation、Keyboard、Safe Area、Back操作、未保存変更保護
- Deep Link Test Controlの完成とPayment Delay
- Review用Seed Scenario
- Native Component Test拡充
- Android/iOS Maestro主要Flow
- 専用DB/KVを使う購入系Contract Harness
- EAS Profile完成と`.eas/workflows/phase2-native-purchase.yml`
- Android Preview APK、iOS Preview Simulator Build
- Native開発、Build、検証手順

## 6. 対象外

- Native Admin、Store公開、EAS Submit
- Password変更、退会、Guest Checkout
- Cancel、Return、Refund、Audit Log
- Payment timeout/unknown、Reconciliation
- Migration Recovery、Crash Point、Integrity Check
- App Store/Google Play Release Gate
- Phase 3機能
- 新しいStorage、独自Test Framework、全DB Fingerprint基盤
- Sentinel専用Table、Entity、Repository、Use Case
- 再現可能な必要性がない独自Mutation Queue

## 7. 実装順序と内部品質ゲート

### Gate A: Auth / Session / Cart統合

完了条件:

- Login、拒否、Session復元、Role対象外、Guest Cart統合がAndroid/iOSで成立する。
- PBKDF2互換とKV復元/削除契約を維持する。
- Customer Transaction ScopeだけでCart統合が動作する。
- Native Component Testが`jest-expo`環境で成功する。
- `typecheck:app`と`typecheck:native-tests`が成功する。

### Gate B: Account / Address

完了条件:

- ProfileとAddress CRUDが成立する。
- Validation、Back、未保存変更保護が成立する。
- Address Transaction、Foreign Key、Default制約が実SQLiteで成功する。

### Gate C: Purchase

完了条件:

- Checkout成功、Payment失敗/再試行、Order一覧/詳細が成立する。
- UI二重送信防止、Commit後結果返却、冪等性が成立する。
- Lock ErrorがApplication Errorへ変換され、非冪等処理を自動Retryしない。
- 独自Mutation Queueなしで購入系Contract Suiteが安定する。
- 購入系Contract Suiteが専用DB/KVで成功する。
- 既存SeedレコードによるApplication DB不変確認が成功する。
- Sentinel専用基盤が追加されていない。

### Gate D: Review

完了条件:

- 専用SeedからReview投稿/編集/削除が成立する。
- Review Summary TransactionとForeign Keyが成功する。

### Gate E: Automation

完了条件:

- Deep Link ResetとAndroid Maestro必須Flowが連続成功する。
- Native Contract HarnessがMaestroから成功する。
- Harness Cleanupと既存Seedレコード確認が成功する。
- iOS主要FlowがMaestroまたは承認済み代替経路で成功する。

### Gate F: Build / Production-validation

完了条件:

- EAS Profile、Environment、Workflowが成立する。
- Android/iOS Build結果を分離して記録する。
- Production-validation Metadataが`"production" / "production" / "false"`である。
- Android/iOSでTest Control/Harness無効化を確認する。
- `typecheck:app`と`typecheck:native-tests`が成功する。
- GitHub ActionsとCloudflare DeployがNative Workflowに依存しない。

### Gate G: 最終回帰

完了条件:

- Android/iOS主要Flow、全Native Test、Web Test/Build/Playwrightが成功する。
- Vitest/Jest型境界、Foreign Key、Harness隔離、KV契約が維持される。
- Critical/Highが残っていない。

各Gate終了時に、使用Scenario、検証結果、失敗と修正、Android/iOS差分、Workflow/Build ID、未確認事項、次Gateへ進める根拠をRun Artifactへ記録します。

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

既存Scenarioで不足する場合だけ追加し、WebとNativeで同じ名前と意味を維持します。

## 9. 成果物

- Native Auth/Session/Role対象外UI
- Native Account/Profile/Address UI
- Native Checkout/Payment/Order/Review UI
- Review用Seed Scenario
- Native Component Test
- Deep Link Test ControlとPayment Delay
- 専用DB/KVを使う購入系Contract Harness
- Android/iOS Maestro主要Flow
- `.eas/workflows/phase2-native-purchase.yml`
- Android Preview APK、iOS Preview Simulator Build
- Native開発、Build、検証手順
- Phase 2完了ADR
- 更新済みREADME/PROJECT_CONTEXT
- History、Run Artifact、Phase 3課題一覧

## 10. Phase 2最終完了判定

### コード上の完了

- 共通Domain/Application契約
- Customer Repository/Transaction Scope
- SQLite Customer AdapterとForeign Key初期化
- Native購入者Flow
- Native KV Storage
- `jest-expo` Native Component Test
- Vitest/JestのTypeScript型境界
- Maestro Flow
- EAS Workflows
- Test Control/Harness
- Docs

### 実環境での完了

- Android Build、起動、主要操作、Maestro、実SQLite Harness
- iOS Simulator Build、起動、商品探索、Cart、Login、Checkout、Order、Payment再試行、Contract Smoke
- Harness DB/KV隔離、Cleanup、既存Seedレコード確認
- Android/iOS Production-validation Metadataと無効確認

実行していない項目をPASSとしません。iOS実環境検証が不足する場合、Phase 2を完全完了とせず「コード完了・iOS検証未完了」と記録します。

Phase 2完了後もPhase 3へ自動で進みません。最終報告でPhase 3候補、優先度、依存関係を提示して停止します。
