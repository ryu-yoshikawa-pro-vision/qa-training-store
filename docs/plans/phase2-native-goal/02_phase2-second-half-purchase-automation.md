# Phase 2 後半計画: 会員購入Flow・Maestro・Native CI仕上げ

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

Phase 2後半では、GitHub Actionsを正式Native CI経路とし、Android Emulator RuntimeとiOS Simulator Buildを正式実行範囲とします。iOS Simulator Runtime／Maestro／実`expo-sqlite` Runtimeは正式Gate対象外です。EAS Profile／Workflowは将来用の静的契約として維持しますが、EAS Cloud Build／Workflow／Submitを実行完了条件に含めません。

## 1. ゴール

前半で確定した基盤を不要に変更せず、Android/iOSの会員購入FlowとNative自動化を完成させます。

完成対象:

- Login、Logout、Session復元、Role対象外処理
- Guest Cart統合
- Account、Profile、配送先
- Checkout
- Mock Payment成功、失敗、再試行
- Order一覧、Order詳細
- Review投稿、編集、削除
- Payment Delayを含むTest Control
- 購入系Contract Harness
- Android Emulator上のMaestro必須Flow
- iOS Simulator向けAutomation／Production-validation BuildとBuild-time契約
- GitHub Actions上のAndroid Runtime／iOS Build-only Native CI Gate
- Android Production-validation RuntimeとiOS Production Build guard
- Native開発、Build、検証、運用手順

画面数を増やすことではなく、WebとNativeで同じ業務契約、状態遷移、失敗状態を決定的に検証できることを優先します。

## 2. 開始条件

Phase 2後半は、前半成果が`main`へマージ済みであることを前提に開始します。

開始前に最低限次を確認します。

- Phase 2前半PRが`main`へマージ済みである。
- 最新`main`で前半の静的Gate、Native Component Test、Repository／Contract Testが成功する。
- Route InventoryとPlatform Route方式が文書化されている。
- Application→Infrastructure直接依存が除去されている。
- Customer/Admin Repository CapabilityとTransaction Scope分離が完了している。
- AndroidでGuestの商品探索からCartまで操作できる。
- Android実SQLite Customer Contract Suiteが成功する。
- 全Application/Harness ConnectionでForeign Key Enforcementが有効である。
- Harness専用DB/KV隔離とCleanupが成功する。
- Harness前後でApplication DBのDatabase名、Schema Version、Seed Version、既存Seedの既知レコードが変化しない。
- Sentinel専用Table、Domain Entity、Repository、Use Caseが追加されていない。
- Web/NativeのPBKDF2互換Testが成功する。
- `jest-expo`環境のNative Component Testが成功する。
- Vitest/Jestの型境界が分離され、`typecheck:app`と`typecheck:native-tests`が成功する。
- `expo-sqlite/kv-store`のSession/Guest復元が成功する。
- Deep Link Reset Version 1が成功する。
- 前半のCritical/High不具合が残っていない。

iOS Simulator Build-only CIに関するBaseline成功を除き、上記の前半基盤条件に未達がある場合は、その未達を後半機能実装へ黙って混在させません。前半契約の回帰・未完了として分類し、依存しない確認作業は継続しつつ、当該基盤へ依存する後半実装は保留して理由と影響をRun Artifactへ記録します。

iOS Simulator Runtime／Maestro／実`expo-sqlite` Smokeの成功は、後半Goalの開始条件にも正式DoDにも含めません。後半Runでは現行`.github/workflows/native-ios-ci.yml`のBuild-only契約を確認し、iOS Buildの失敗だけをPhase 2後半のCI修正対象に含めます。

一つのPlatformやJobが失敗しても、依存しないPlatform、Web回帰、静的検証、実装を進められるところまで継続します。ただしPhase 2最終完了時にはAndroid Runtime GateとiOS Build Gateをすべて成功させます。

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
- `.eas/workflows/phase2-native-foundation.yml`を静的契約として扱う方針

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
- Android Emulatorで購入系Harnessを実行できる。iOS向け共通Harness実装は保持するが、iOS Simulator Runtime実行は正式DoDに含めない。
- iOSの実`expo-sqlite` Runtime確認は正式Native CI／Phase 2完了条件の対象外とする。Node側SQLite Testは共有Contractとして維持する。
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
- 後半でNative Testを追加してもWeb/Vitest側の型設定を不要に変更しない。

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

iOS必須Flow:

1. Guestの商品閲覧とCart操作
2. LoginとGuest Cart統合
3. Checkout成功とOrder確認
4. Payment失敗と再試行
5. App再起動後のSession/Checkout復元
6. delivered OrderへのReview投稿
7. Native Contract Harness購入系Suite
8. Production-validationでTest Control/Harness無効確認

Android固有のSearch IMEや既存Boundary Flowまで、Phase 2後半でiOSへ機械的に複製する必要はありません。主要購入契約の同等性を優先します。

原則:

- Android/iOSで同じ業務Flowを検証できる場合はMaestro YAMLを共用する。
- Platform差が実際に必要な箇所だけ分岐する。
- 各Automation Flowの先頭でDeep Link Resetを実行する。
- 前回Flowの状態へ依存しない。
- 座標Tapを避ける。
- Stable Test IDまたはAccessibility Labelを使う。
- 固定Sleepを安定化手段にしない。
- Retry増加でFlakyを隠さない。
- 必須Flowを連続実行して安定性を確認する。

### 4.9 Build / Native CI / Production-validation

#### 正式CI経路

GitHub ActionsをPhase 2の正式Native CI経路とします。

```text
Detect Native Changes
  ├─ Native Static
  ├─ Production Bundle Guard
  ├─ Android Automation Build ────┐
  ├─ Android Production Build ────┤
  │                               └─ Android Runtime / Maestro
  └─ Native iOS CI
     ├─ iOS Automation Build ─────┐
     ├─ iOS Production Build ─────┤
     └──────────────────────────── iOS Native CI Verify
                ↓
         native-ci / verify
```

必須条件:

- Native変更時はAndroidとiOSを互いに依存させず可能な限り並列で実行する。
- Android失敗時もiOS、iOS失敗時もAndroid、Web、静的検証など独立経路を進められるところまで実行する。
- 最終`native-ci / verify`はfail-closeし、Native変更時にStatic、Production Guard、Android、iOSの必須結果をすべて要求する。
- Native変更がない場合は重いAndroid/iOS JobのSkipを許容する。
- Web CIとCloudflare DeployはNative CI完了待ちにしない。
- SecretやCredentialをRepository、Bundle、Artifact、Logへ露出しない。

#### iOS Simulator Build-only CI

既存`.github/workflows/native-ios-ci.yml`をPhase 2後半のBuild-only正式Native Gateとして運用します。

- GitHub-hosted macOS Runnerを使用する。
- Expo prebuild、CocoaPods、Xcode BuildをCI内で実行する。
- Automation Build／Production-validation Buildはいずれも`iphonesimulator`向けRelease Buildを生成する。
- Automation Build／Production-validation Buildはいずれも`CODE_SIGNING_ALLOWED=NO`とし、Apple署名、Provisioning Profileを要求しない。
- `Release-iphonesimulator`配下の`.app`を検出し、Automation／Productionの固定名ArtifactとしてUploadする。
- Simulator boot／install／launch、Maestro、Contract Harness、Production-validation Runtimeは正式CI責務に含めない。
- iOS WorkflowはNative CIから呼び出せる構成にし、単独の`workflow_dispatch`も必要に応じて維持する。
- Xcode Version、Build結果、`.app`生成状態、Build logをEvidence化する。

#### Production-validation

Android/iOSともAutomation Buildとは別にProduction-validationを確認します。

```text
EXPO_PUBLIC_APP_ENV=production
EXPO_PUBLIC_BUILD_KIND=production
EXPO_PUBLIC_TEST_MODE=false
```

Metadata:

```text
extra.appEnvironment === "production"
extra.buildKind === "production"
extra.testMode === "false"
```

必須条件:

- Android/iOS両方でProduction-validation Buildを生成できる。
- iOS Production-validationも`iphonesimulator`向け・署名なしBuildとし、実機署名経路へ切り替えない。
- Android Production-validation AppをEmulatorで起動でき、Test Control／Harnessが利用不能である。
- iOS Production BuildはmetadataとBuild-time marker guardでAutomation／Harness不在を検証する。
- iOS Simulator上のProduction-validation Runtimeは正式Gate対象外である。
- Automation BuildとProduction-validation BuildのEvidenceを区別する。

#### EASの扱い

- `eas.json`と既存EAS WorkflowのProfile／Environment mappingを静的契約として維持する。
- `development`は`local/local/true`、`preview`は`automation/automation/true`、`production-validation`は`production/production/false`の`EXPO_PUBLIC_*`契約を維持する。
- `pnpm run validate:eas:config`を維持する。
- `.eas/workflows/phase2-native-purchase.yml`をPhase 2後半の必須成果物にしない。
- EAS Cloud Build、EAS Workflow、EAS Submitを実行しない。
- EAS Cloud Run ID／Build IDを完了条件にしない。

### 4.10 回帰 / 文書

- WebのFormat、Markdownlint、Lint、Typecheck、Test、Build、Playwright主要Flowが成功する。
- Android/iOSの主要購入Flowが成立する。
- Native CI Contract Testが新しいAndroid/iOS Gate構成を固定する。
- Critical/Highの既知不具合が残っていない。
- Native開発、Build、Maestro、CI、Production-validation、検証手順を最新化している。
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
- `.github/workflows/native-ci.yml`のAndroid/iOS正式Gate化
- `.github/workflows/native-ios-ci.yml`のReusable／正式Gate化
- Native CI Contract Test更新
- Android Automation／Production-validation Build
- iOS Automation／Production-validation Simulator Build
- Native開発、Build、CI、検証手順
- EAS静的契約の維持

## 6. 対象外

- Native Admin
- Store公開、EAS Submit
- EAS Cloud Build／EAS Workflowの実行
- iOS物理端末をDoDにすること
- iOS署名、Provisioning Profile、IPA、TestFlight、App Store
- Self-hosted Mac、Device Farm
- Password変更、退会、Guest Checkout
- Cancel、Return、Refund、Audit Log
- Payment timeout/unknown、Reconciliation
- Migration Recovery、Crash Point、Integrity Check
- App Store/Google Play Release Gate
- Phase 3機能
- 新しいStorage、独自Test Framework、全DB Fingerprint基盤
- Sentinel専用Table、Entity、Repository、Use Case
- 再現可能な必要性がない独自Mutation Queue
- 実測前の複雑なDerivedData／Pods／Simulator Cache最適化

## 7. 実装順序と内部品質ゲート

### Gate A: Baseline / Auth / Session / Cart統合

完了条件:

- 最新`main`の前半静的／Native Test Baselineを確認する。
- 現行iOS Simulator Build-only Workflowを構成確認し、Build／metadata／Artifact失敗時は原因を分類する。
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

### Gate E: Android Automation／共通Flow

完了条件:

- Deep Link ResetとAndroid Maestro必須Flowが連続成功する。
- AndroidでNative Contract Harness購入系Suiteが成功する。
- 共通Maestro YAMLとiOS conditional handlerはソース互換性のため維持するが、iOS Runtime PASSはこのGateの完了条件にしない。
- Harness Cleanupと既存Seedレコード確認が成功する。
- Android/iOSで共用可能なFlowは同じYAMLを使用し、不要なPlatform重複を作らない。

### Gate F: Native CI / Production-validation

完了条件:

- GitHub Actionsを正式Native CI経路としてAndroid/iOSを独立実行できる。
- `.github/workflows/native-ios-ci.yml`がNative CIから呼び出せ、単独実行も可能な構成になっている。
- Native変更時の最終`native-ci / verify`がStatic、Production Guard、Android、iOSをfail-closeで集約する。
- Android/iOS Automation Build結果を分離して記録する。
- Android/iOS Production-validation Metadataが`"production" / "production" / "false"`である。
- iOS Production-validationはSimulator向け署名なしBuildとして実行し、Apple署名を要求しない。
- Android Production-validation RuntimeでTest Control/Harness無効化を確認し、iOSはBuild-time guardでmarker不在を確認する。
- `typecheck:app`と`typecheck:native-tests`が成功する。
- Web CIとCloudflare DeployがNative Workflowに依存しない。
- EAS Profile／Workflowは静的検証のみで、Cloud実行を要求しない。

### Gate G: 最終回帰

完了条件:

- Android主要Flow、全Native Test、Web Test/Build/Playwrightが成功する。
- GitHub Actionsの正式Native Gateが最新Headで成功する。
- Vitest/Jest型境界、Foreign Key、Harness隔離、KV契約が維持される。
- Critical/Highが残っていない。
- 実行できなかった項目をPASS扱いしていない。

各Gate終了時に、使用Scenario、検証結果、失敗と修正、Android/iOS差分、Workflow Run／Artifact、未確認事項、次Gateへ進める根拠をRun Artifactへ記録します。

一つのGate内でPlatform固有の検証が失敗しても、独立して進められる他Platform／静的／Web作業は進めます。Gate完了判定自体は必要条件が揃うまで保留します。

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
- Android Maestro主要Flowと共通Flow定義
- Android Emulator正式CI
- iOS Simulator Build-only正式CI
- Android Production-validation Runtime／iOS Production Build guard
- Native CI Contract Test
- Platform別JUnit／Maestro／Build Evidence
- Native開発、Build、CI、検証手順
- Phase 2完了ADR
- 更新済みREADME/PROJECT_CONTEXT
- History、Run Artifact、Phase 3課題一覧

EAS Cloud Build／Workflow成果物、iOS署名済みIPA、TestFlight／App Store成果物はPhase 2成果物に含めません。

## 10. Phase 2最終完了判定

### コード上の完了

- 共通Domain/Application契約
- Customer Repository/Transaction Scope
- SQLite Customer AdapterとForeign Key初期化
- Native購入者Flow
- Native KV Storage
- `jest-expo` Native Component Test
- Vitest/JestのTypeScript型境界
- Android/iOS共用可能なMaestro Flow
- Test Control/Harness
- GitHub Actions Native CI契約
- Production-validation契約
- Docs

### 実環境での完了

- Android GitHub Actions Build、Emulator起動、主要操作、Maestro、実SQLite Harness
- iOS GitHub Actions Simulator向けAutomation／Production Build、Build metadata、Production guard、`.app` Artifact validation
- Android Harness DB/KV隔離、Cleanup、既存Seedレコード確認
- Android Production-validation RuntimeとiOS Production Build-time guard
- 最新Headの`native-ci / verify`成功

実行していない項目をPASSとしません。iOS Simulator Runtime／Maestro／実`expo-sqlite` Harnessは正式Gate対象外ですが、iOS Buildまたは修正HeadのRemote Native CIを実行していない場合は、その未確認範囲を明記します。

物理iPhone、iOS実機署名、Provisioning Profile、IPA、TestFlight、App Store、Self-hosted Mac、EAS Cloud Build／Workflow／SubmitはPhase 2最終完了判定に含めません。

Phase 2完了後もPhase 3へ自動で進みません。最終報告でPhase 3候補、優先度、依存関係を提示して停止します。

## 11. 現行Runの判定（2026-08-09）

- コード、Unit／Integration／Repository／Web／Native Component／Contract、Typecheck、Lint、Security、Web Build、Native Production Bundle Guard、Workflow Contract、Android現行ソースの実機検証は完了した。
- Androidでは購入系Maestro、Payment retry、Session／Checkout restart、Review、Runtime／Boundary、Production validationを実行済みである。
- iOS Simulator Buildのローカル実行と、GitHub-hosted Remote Native CI／最新Headの`native-ci / verify`は、Windows・未push条件のため未実施である。iOS Runtime／Maestro／実`expo-sqlite` Harnessは正式Gate対象外であり、未実行をPASSに繰り上げない。
- 次の実行では、`native-ios-ci.yml`のAutomation／Production Build、Build-time metadata／Production guard、`.app` Artifact、親WorkflowのAndroid／iOS Build独立結果、最終`native-ci / verify`を同一Headで確認する。

## 12. Phase 3／後続課題

| 優先度 | 課題 | 依存関係／開始条件 |
|---|---|---|
| High | Payment timeout／unknown、再conciliation、キャンセル・返品・返金、Audit Log | Backend／決済状態機械と運用契約を先に確定する |
| High | Native AdminとCustomer以外の管理操作 | Admin Capability、Role／権限境界、監査要件を別計画で定義する |
| Medium | Password変更、退会、Guest Checkout、Orderの追加ライフサイクル | Phase 2 Customer購入契約の拡張方針とData retentionを確定する |
| Medium | Migration Recovery、Crash Point、Integrity Check、DB復旧 | Store公開前の永続化・障害復旧方針とテスト環境を用意する |
| Low | Public Demo分離、Visual Regression本格導入、Release／Store運用 | デザイン基準、公開環境、署名・配布責務を別途承認する |

物理端末署名、IPA、TestFlight／App Store、EAS Cloud実行はPhase 2の完了条件にも、この一覧の実装済み成果にも含めない。必要になった時点で、別のRelease／Distribution計画として扱う。

## 13. 2026-08-08 現行ソースPostfix検証

- `maestro/native-purchase.yaml`はGuest状態で商品を追加し、Cart数量1を確認してからLoginし、既存会員Cartとの統合後数量2を確認する導線へ修正した。Android実機でCheckout成功まで1/1を確認した。
- Native ShellはAppStateが`active`へ戻った時にAuth Sessionを再読込し、Login後Checkout fallbackは既知のCheckout状態ErrorだけをGuest／Home fallbackとして扱う。Unexpected Storage Errorは画面へ返す。Profile初期化失敗はloading固定ではなくRetry可能なError Stateへ変更した。
- Native Detectは`src/presentation/return-to.ts`と、Native Runtimeが参照するnormalizer／static address lookup／Mock Payment Gatewayを監視対象へ追加した。
- iOS Workflowは`ios-automation-build`／`ios-production-build`でAutomation／Productionのunsigned Release Simulator Appを独立生成し、Runtimeが成功した各Artifactを受け取る。各Runtime Metadataを`expo config --json`で`automation / automation / true`または`production / production / false`として検査する。WindowsではiOS実RuntimeとRemote CIは未確認のため、Gate E／F／Gの最終判定はpendingである。

## 14. 2026-08-09 最終回帰と現行Production

- `pnpm run test`、Typecheck、Lint、Security、Route／EAS／Image validation、Web BuildはPASSした。Native Componentは33 tests、Contractは154 testsである。
- `PLAYWRIGHT_USE_PREBUILT_DIST=true pnpm run test:e2e`はChromium 27/27 PASSした。
- 現行ソースのAndroid Production APKは短縮Workspace条件でBuild、marker guard、Install／Smoke、`native-production-validation.yaml` 1/1をPASSした。iOS Simulator、実`expo-sqlite` Harness、Remote `native-ci / verify`はWindows／未push条件で未実行のため、Phase 2 final DoDはpendingである。

## 15. 2026-08-09 最終自己レビュー追補

- SQLite mapper／Customer Application Repositoryの外部値をRuntime parserへ統一し、列欠落、不正Enum、不正数値をfail-closeする境界を固定した。Native Transaction RunnerはCustomer Scope allowlistとfail-closed Admin placeholderを使い、型アサーションによるCapability境界の迂回を除去した。
- Native Purchase画面の残存型アサーションを除去した。Unit 65、Integration 95、Repository 31、Web Component 76、Native Component 38、Contract 158、Typecheck、focused Repository Contract 13件はPASSした。
- iOS Workflow／Native CIの静的契約は、Build／Runtime Artifact分離、unsigned Release Simulator、主要購入Flow、実`expo-sqlite` Harness経路、Production-validation、Evidence、Native変更なし時Skip、final fail-closeを満たす。WindowsではiOS実Runtime、Remote Android／iOS CI、最新Headの`native-ci / verify`が未実行で、Phase 2 final DoDはpendingとする。

## 16. 2026-08-09 Quality Gate追補

- 既存BaselineのPhase 1 CI Workflow／ContractをPrettierで意味変更なしに整形し、`pnpm run format:check`と現行`pnpm run verify`をPASSへ更新した。
- `pnpm run verify`はLint 0 errors／63 warnings、全Test、Security、Image Manifest、Web export 2294 modulesをPASSした。残る未達はWindowsで実行できないiOS実Runtimeと、未push条件のRemote Native CIである。
