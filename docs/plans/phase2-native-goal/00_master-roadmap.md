# Phase 2 Native購入者版 `/goal` 二分割ロードマップ

## 0. 依頼概要

- 依頼内容: Phase 2のNative対応を二つの実装計画へ分割し、それぞれを`/goal`で最後まで実施できる状態にする。
- 背景: Phase 2全体を一度に実装すると、SQLite、Android/iOS、購入Flow、EAS、Maestroが同一差分へ集中し、レビューと失敗原因の切り分けが困難になる。一方、細かく分けすぎるとPR管理と再開コストが増える。
- 期待成果: Phase 2を前半・後半の二つだけに分け、各計画が独立したブランチ・PR・完了条件を持つこと。

## 1. Phase 2全体のゴール

Web版のDomain/Application契約を再利用し、Android/iOSの購入者向け主要FlowをSQLite上で動作させ、EAS Preview BuildとMaestroによる主要Flow検証まで成立させる。

Phase 2ではNative Admin、Store公開、高度障害シナリオ、返品・返金などを実装しない。

## 2. 二分割方針

| 順序 | 計画 | 主目的 | 完了時に成立する状態 |
|---:|---|---|---|
| 1 | Phase 2 前半 | Native基盤・SQLite・Guest購入前Flow | Android/iOSで起動し、商品探索からCartまで操作できる |
| 2 | Phase 2 後半 | 会員購入Flow・Maestro・EAS/CI仕上げ | Loginから購入、注文、Reviewまで動作し、自動検証と内部Buildが成立する |

前半を基盤実装だけで終わらせず、商品閲覧とCartまで含める。これにより、SQLite、Navigation、Asset、Responsive UIの統合問題を後半へ持ち越さない。

後半では、前半で確立したPlatform基盤を変更せず、認証後の業務Flowと自動化・配布を完成させる。

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

## 4. Phase 2の正式対象

### 対象

- 最新コードを基準にしたNative Scopeと共通契約の再確認
- Android/iOS向けPlatform Bootstrap
- SQLite AdapterとRepository Contract Test
- Native Session、Guest Identity、Password Hash、Navigation、Deep Link
- Seed、Reset、Test Clock、Test Control
- Storefront、商品検索、商品詳細、Cart
- Login、Account、配送先
- Checkout、模擬Payment、Order、Review
- EAS Development/Preview Build
- Android APK
- iOS Simulator Buildまたは合意した内部検証Build
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

## 5. 共通実施原則

1. 各計画は一つの`/goal`として、計画、実装、検証、自己レビュー、文書更新まで完了する。
2. 前半と後半は別ブランチ・別PRにする。
3. 前半完了時に後半へ自動で進まず、ユーザーへ結果を報告して停止する。
4. 後半開始時は最新`main`と前半PRの最終状態を再調査する。
5. テスト失敗をskip、Assertion弱体化、Retry増加、`continue-on-error`で隠さない。
6. AndroidとiOSについて、Build、起動、操作、E2Eの確認状況を個別に記録する。
7. 外部CredentialやmacOS環境不足により未確認の項目を成功扱いにしない。
8. Web版のDomain/Application契約を不要に変更しない。
9. Phase 3の機能を先取りしない。
10. Nativeのためだけに未使用の抽象化を増やさない。

## 6. ブランチ・PR境界

### Phase 2 前半

- 推奨ブランチ: `feat/phase2-native-foundation-storefront`
- PR範囲: Scope再確認、Platform基盤、SQLite、Seed/Reset、Storefront、商品、Cart、最小Native Build

### Phase 2 後半

- 推奨ブランチ: `feat/phase2-native-purchase-automation`
- PR範囲: Auth、Account、Checkout、Order、Review、Maestro、EAS、CI、最終Docs

1つのPRへ前半と後半を混在させない。

## 7. Phase 2全体の完了条件

- AndroidとiOSで購入者向け主要画面が起動可能。
- SQLite Adapterが最新Repository Contractを満たす。
- Seed、Reset、ClockがNativeで決定的に動作する。
- 商品探索、Cart、Login、Account、Checkout、Order、Reviewの主要Flowが成立する。
- Native Adminが含まれていない。
- Android Preview APKを生成できる。
- iOS Simulatorまたは合意した内部検証Buildを生成できる。
- Maestroの選定した主要Flowが成功する。
- Production相当ProfileではTest Controlが無効。
- Web版の既存動作とWeb CIを壊していない。
- 実行できなかったiOS実機確認などを明示している。
- Phase 3へ送る課題が整理されている。

## 8. 計画書

- [Phase 2 前半: Native基盤・SQLite・Guest購入前Flow](./01_phase2-first-half-native-foundation.md)
- [Phase 2 後半: 会員購入Flow・Maestro・EAS/CI仕上げ](./02_phase2-second-half-purchase-automation.md)
