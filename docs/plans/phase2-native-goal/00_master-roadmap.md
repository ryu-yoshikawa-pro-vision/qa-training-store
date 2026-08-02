# Phase 2 Native購入者版 `/goal` 二分割ロードマップ

## 0. 依頼概要

- 依頼内容: Phase 2のNative対応を二つの実装計画へ分割し、それぞれを`/goal`で最後まで実施できる状態にする。
- 背景: Phase 2全体を一度に実装すると、SQLite、Android/iOS、購入Flow、EAS、Maestroが同一差分へ集中し、レビューと失敗原因の切り分けが困難になる。一方、細かく分けすぎるとPR管理と再開コストが増える。
- 期待成果: Phase 2を前半・後半の二つだけに分け、各計画が独立したブランチ・PR・完了条件を持ち、実装担当が主要な設計判断で迷わないこと。

## 1. Phase 2全体の目的

Web版で確立したDomain、Application Use Case、業務ルール、Seedの意味を再利用し、Android/iOSの購入者向け主要FlowをSQLite上で決定的に動作させる。

最終的に次を成立させる。

- Android/iOSで商品探索、Cart、Login、Account、Checkout、Order、Reviewを操作できる。
- Nativeの状態をSeed、Reset、Test Clock、Payment Delayで再現できる。
- AndroidではMaestroの必須Flowが安定して成功する。
- iOSではSimulator Build、起動、主要購入Flowの実操作確認が完了する。
- EAS Preview Buildを内部検証へ利用できる。
- Production相当BuildではTest Controlを利用できない。
- Web版、Cloudflare Deploy、Playwrightの既存契約を壊さない。

Native化自体を目的化せず、WebとNativeで同じ業務契約を検証できる学習用SUTを作ることを最優先とする。

## 2. 二分割方針

| 順序 | 計画 | 主目的 | 完了時に成立する状態 |
|---:|---|---|---|
| 1 | Phase 2 前半 | Native基盤・SQLite・Guest購入前Flow | Android/iOSで起動し、商品探索からCartまで操作できる |
| 2 | Phase 2 後半 | 会員購入Flow・Maestro・EAS/CI仕上げ | Loginから購入、注文、Reviewまで動作し、自動検証と内部Buildが成立する |

前半を基盤実装だけで終わらせず、商品閲覧とCartまで含める。SQLite、Navigation、Asset、Presentationの統合問題を後半へ持ち越さないためである。

後半は、前半で確定したPlatform境界、Customer向けRepository、Schema、Session、Test Control契約を土台として、会員購入Flowと自動化・配布を完成させる。

## 3. 依存関係

```text
Phase 2 前半
Native基盤・SQLite・Guest購入前Flow
        ↓
前半PRをレビュー・マージ
        ↓
Phase 2 後半
会員購入Flow・Maestro・EAS/CI仕上げ
```

二つの計画は直列で実行する。後半を前半Branchから直接開始せず、前半PRをマージした最新`main`から開始する。

## 4. 実装開始前に固定する外部条件

外部条件が未確定のまま`/goal`を開始しない。仮値を正式識別子として実装し、後から置換する運用は禁止する。

### 前半開始前に必要

- Android package
- iOS bundleIdentifier
- Expo schemeとDeep Link prefix
- Expo AccountとEAS Projectの利用方針
- Android Development/Preview Buildを実行できる権限
- iOS Simulator Buildを実行する方法
- CredentialをAI Agentへ渡さずにBuildする運用
- SecretをRepositoryへ保存しない方針

### 後半開始前に必要

- 前半のAndroid Preview Build成功
- 前半のiOS Simulator Buildと起動確認成功
- Maestroを実行できるAndroid環境
- iOS主要Flowを確認できるSimulatorまたは同等環境
- EAS TokenをGitHub Actionsで使用するかの判断
- Native Buildの実行頻度と費用上限

条件を満たさない場合、該当Goalを開始せず、未確定事項を報告して停止する。

## 5. 固定するアーキテクチャ方針

技術的に成立しない根拠がない限り、次を既定方針として実装する。変更する場合は理由、代替案、影響をADRへ記録する。

### 5.1 PresentationとRoute

- WebとNativeのRoot LayoutをPlatform別に分離する。
  - `app/_layout.web.tsx`
  - `app/_layout.native.tsx`
- Web ShellとNative Shellを分離する。
- NativeではDOM、CSS、React Aria、Dexie、Browser Test APIへ依存しない。
- Native Adminは作らない。
- Nativeで`operator`または`admin`がLoginした場合は、Native対象外を説明する専用画面を表示し、Logoutだけを提供する。
- Domain、Application、DTO、Validation、表示文言、Platform非依存View Modelは共有してよい。
- Web画面を無理にReact Native Componentへ全面変換しない。
- Platform差分は`.web.tsx`、`.native.tsx`、必要時のみ`.ios.tsx`、`.android.tsx`で表す。

### 5.2 Composition Root

- Web用Composition RootはDexieとBrowser Adapterを使い、既存動作を維持する。
- Native用Composition RootはSQLiteとNative Adapterを使う。
- Native用Composition Rootは購入者機能だけを構築し、Admin Use Caseを組み込まない。
- Application Use CaseがDexie、Browser Storage、Web Cryptoの具体型へ直接依存しない構造にする。

### 5.3 SQLite

- Native永続化は`expo-sqlite`を採用する。
- 最新のTypeScript Repository Contractを正本とする。
- 前半でNative購入者版の最終Flowに必要なRepositoryとSchemaを実装する。
  - User
  - Session
  - Address
  - Catalog/Product Read
  - Cart
  - Checkout Session
  - Order/Order Item
  - Payment
  - Shipment
  - Review/Review Summary
  - Sequence
  - Settings/Test Metadata/Test Inspection
- Admin専用QueryとAdmin専用RepositoryはNative Composition Rootへ追加しない。
- 後半は原則としてSchemaやRepository Interfaceを変更せず、UIと自動化を接続する。
- Migration RecoveryはPhase 3対象とし、Phase 2ではSchema Versionと初期作成だけを扱う。

### 5.4 商品画像

- `assetId`とMetadataはWeb/Nativeで共通利用する。
- Webは既存の公開Pathを利用する。
- NativeはBuild時生成された静的Asset Mapを利用する。
- Native Asset Mapは静的`require`または静的Importで画像をBundleへ含める。
- Runtime文字列をそのまま`require`しない。
- Web ManifestとNative Asset MapのAsset ID集合をContract Testで一致させる。
- PlaceholderもNative Bundleへ静的同梱する。

### 5.5 Test Control

- MaestroのScenario Reset入口はDeep Linkを採用する。
- 任意DB書換えAPIを追加しない。
- Reset、Scenario、Clock、Payment Delayだけを許可する。
- Review Flowはdelivered OrderとReview未投稿Order Itemを持つ専用Seed Scenarioから開始する。
- Production相当ProfileではDeep LinkのTest Control入口とTest Control UIを利用できない。

### 5.6 Native Test

- Domain/Application/Repository/Platform AdapterはVitestで検証する。
- Native ComponentはReact Native Testing Libraryで検証する。
- Navigationと主要業務FlowはMaestroで検証する。
- Android/iOS BundleとBuildは別々に確認する。
- Web Component TestとPlaywrightは既存構成を維持する。

### 5.7 EASとCI

- `development`: Development Client、Test Control有効
- `preview`: 内部検証、Test Control有効、Android APK、iOS Simulator Build
- `production`: Test Control無効、Store提出なし
- PRではNative静的検証、Unit/Application/Repository/Component Testを実行する。
- EAS Buildは`workflow_dispatch`を基本とする。
- Web CIとCloudflare DeployをNative Build完了待ちにしない。
- EAS TokenやCredentialをRepositoryへ保存しない。

## 6. Phase 2の正式対象

### 対象

- Native ScopeとPlatform境界の確定
- Platform別Root Layout、Shell、Composition Root
- Android/iOS向けNative Bootstrap
- SQLite AdapterとRepository Contract Test
- Native Session、Guest Identity、Password Hash、Navigation、Deep Link
- Seed、Reset、Test Clock、Payment Delay、Test Control
- Storefront、商品検索、商品詳細、Cart
- Login、Account、配送先
- Checkout、模擬Payment、Order、Review
- Native Component Test
- EAS Development/Preview Build
- Android Preview APK
- iOS Simulator Build
- Maestro主要Flow
- Native向けCIと運用手順

### 対象外

- Native Admin
- App Store/Google Play公開
- Password変更、退会
- Guest Checkout
- Cancel、Return、Refund
- Audit Log
- Payment timeout/unknown、Reconciliation
- Migration Recovery、Crash Point、Integrity Check
- Public Demo分離
- Visual Regressionの本格導入
- Phase 3機能

## 7. 共通実施原則

1. 各計画は一つの`/goal`として、計画、実装、検証、自己レビュー、文書更新まで完了する。
2. 前半と後半は別ブランチ・別PRにする。
3. 計画内の内部Gateを順番に通過し、未解決のCritical/Highがある状態で次のGateへ進まない。
4. 前半完了時に後半へ自動で進まず、結果を報告して停止する。
5. 後半開始時は最新`main`と前半PRの最終状態を再調査する。
6. テスト失敗をskip、Assertion弱体化、Retry増加、`continue-on-error`で隠さない。
7. AndroidとiOSについて、Build、起動、操作、E2Eの結果を個別に記録する。
8. 実施していない検証をPASSと記録しない。
9. Web版のDomain/Application契約をNative UI都合で変更しない。
10. Nativeのためだけに未使用の抽象化を増やさない。
11. 各主要Flowは使用するSeed Scenarioを説明できる状態にする。
12. Maestro Flowは前回実行結果へ依存させない。
13. Test IDは画面位置や表示文言ではなく、安定した業務概念へ付与する。
14. Phase 3の機能を先取りしない。

## 8. ブランチ・PR境界

### Phase 2 前半

- 推奨ブランチ: `feat/phase2-native-foundation-storefront`
- PR範囲: Platform境界、Composition Root、SQLite、Seed/Reset、Native Asset、Storefront、商品、Cart、Android/iOS Preview Build

### Phase 2 後半

- 推奨ブランチ: `feat/phase2-native-purchase-automation`
- PR範囲: Auth、Account、Checkout、Order、Review、Deep Link Test Control、Maestro、EAS、CI、最終Docs

一つのPRへ前半と後半を混在させない。内部GateはPR分割ではなく、同一Goal内の停止・検証点として扱う。

## 9. Phase 2全体の完了条件

- AndroidとiOSで購入者向け主要画面が起動する。
- SQLite AdapterがNative購入者版に必要な最新Repository Contractを満たす。
- Seed、Reset、Clock、Payment DelayがNativeで決定的に動作する。
- 商品探索、Cart、Login、Account、Checkout、Order、Reviewの主要Flowが成立する。
- Review Flowを専用Seed Scenarioから再現できる。
- Android Preview APKを生成し、起動・主要操作を確認できる。
- iOS Simulator Buildを生成し、起動・商品探索・Cart・Login・Checkout成功・Order詳細を確認できる。
- AndroidでMaestro必須Flowが成功する。
- iOS Maestroを実行できない場合も、Simulatorで合意した主要Flowを手動確認する。
- Production相当ProfileではTest Controlが無効である。
- Native Adminが含まれていない。
- Web版の既存動作、Web CI、Cloudflare Deploy契約を壊していない。
- 実行できなかった検証がある場合、Phase 2を完全完了とせず、コード完了と実環境検証未完了を分けて報告する。
- Phase 3へ送る課題が整理されている。

## 10. 計画書

- [Phase 2 前半: Native基盤・SQLite・Guest購入前Flow](./01_phase2-first-half-native-foundation.md)
- [Phase 2 後半: 会員購入Flow・Maestro・EAS/CI仕上げ](./02_phase2-second-half-purchase-automation.md)
