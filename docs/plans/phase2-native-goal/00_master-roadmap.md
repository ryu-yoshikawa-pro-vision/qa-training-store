# Phase 2 Native購入者版 `/goal` 統括ロードマップ

## 0. 依頼概要

- 依頼内容: Phase 2のNative対応を、一つの巨大な変更ではなく、フェーズ別・PR別に分割して最後まで実施できる計画へ整理する。
- 背景: 現行Phase 2にはSQLite、Android/iOS、Maestro、EAS Build、業務機能拡張が混在しており、そのまま一括実装すると契約競合、巨大差分、検証不足が起きやすい。
- 期待成果: 一つの統括`/goal`方針を維持しつつ、各フェーズを独立した計画・PR・品質ゲートとして完了できる状態。

## 1. ゴール

Web版のDomain/Application契約を再利用し、Android/iOSの購入者向け主要FlowをSQLite上で動作させ、EAS Preview BuildとMaestroの主要Flowまで成立させる。

Phase 2ではNative Admin、App Store公開、高度障害シナリオ、返品・返金などを実装しない。

## 2. 実施原則

1. `/goal`はPhase 2全体の目的・制約・終了条件を管理する。
2. 実装はフェーズごとの計画に従い、前フェーズの完了条件を満たすまで次へ進まない。
3. 各フェーズは原則として別ブランチ・別PRにする。
4. 各PR境界で一度停止し、検証結果、未完了事項、次フェーズ開始条件を報告する。
5. ユーザーがPRをマージした後、最新`main`から次フェーズを再開する。
6. テスト失敗をskip、Assertion弱体化、Retry増加、`continue-on-error`で隠さない。
7. AndroidとiOSを一括で「確認済み」と扱わず、Build・起動・操作・E2Eを別々に記録する。
8. 外部CredentialやmacOS環境が不足しても、未確認項目を成功扱いにしない。
9. Phase 3の実装を先取りしない。調査・論点記録だけが必要な場合は別計画へ切り出す。

## 3. Phase 2の正式対象

### 対象

- 最新コードを基準にしたNative Scopeと共通契約の再確定
- Android/iOS向けPlatform Bootstrap
- Native Session、Guest Identity、Password Hash、Navigation、Deep Link
- SQLite AdapterとRepository Contract Test
- Seed、Reset、Test Clock、Test Control
- 購入者向けStorefront、Cart、Auth、Account、Checkout、Order、Review
- EAS Development/Preview Build
- Android APK
- iOS Simulator Buildまたは実行可能な内部検証Build
- Maestro主要Flow
- Native向けCI/運用手順

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

## 4. フェーズ一覧

| 順序 | フェーズ | 主目的 | PRの主な成果 |
|---:|---|---|---|
| 1 | Phase 2A | Scope・共通契約確定 | Native対象、Port、境界、ADR、実装計画 |
| 2 | Phase 2B | Native Runtime基盤 | Platform Bootstrap、Session、Deep Link、最小起動 |
| 3 | Phase 2C | SQLite Adapter | Schema、Repository、Transaction、Seed/Reset、Contract Test |
| 4 | Phase 2D | Storefront・商品・Cart | Guestの商品探索からCartまで |
| 5 | Phase 2E | Auth・Account | Login、Session、Profile、配送先 |
| 6 | Phase 2F | Checkout・Order・Review | 購入、決済、注文、Review |
| 7 | Phase 2G | EAS・Maestro・CI | Build、内部配布、Native E2E、運用入口 |
| 8 | Phase 2H | 最終回帰・引継ぎ | Android/iOS総合確認、Docs、残課題確定 |

## 5. 依存関係

```text
Phase 2A
  ↓
Phase 2B
  ↓
Phase 2C
  ↓
Phase 2D
  ↓
Phase 2E
  ↓
Phase 2F
  ↓
Phase 2G
  ↓
Phase 2H
```

Phase 2Bと2Cは技術的には一部並行可能だが、初回実装では直列にする。Platform PortとApplication Service生成契約を2Bで安定させてからSQLiteへ進むことで、BootstrapとRepositoryの二重修正を避ける。

## 6. ブランチ・PR運用

推奨ブランチ:

- `feat/phase2a-native-scope-contracts`
- `feat/phase2b-native-runtime`
- `feat/phase2c-sqlite-adapter`
- `feat/phase2d-native-storefront-cart`
- `feat/phase2e-native-auth-account`
- `feat/phase2f-native-checkout-orders-reviews`
- `feat/phase2g-eas-maestro-ci`
- `docs/phase2h-native-finalization`

各フェーズで次を守る。

- 最新`main`から開始する。
- 前フェーズの未マージBranchを基準にしない。
- 1つのPRへ次フェーズを混ぜない。
- PR本文に対象、対象外、検証、外部未確認事項を記載する。
- Run Artifact、ADR、PROJECT_CONTEXTをリポジトリ規約に従って更新する。

## 7. `/goal`の停止・再開契約

各フェーズで次の順序を実行する。

1. 最新コードとDocsを調査する。
2. 対象フェーズの計画を現状に合わせて補正する。
3. 実装する。
4. 自動テストと可能な実機/Simulator確認を行う。
5. 自己レビューを行い、Critical/Highを解消する。
6. Run Artifactと関連Docsを更新する。
7. 次フェーズを実装せず停止する。
8. ユーザーへPR作成に必要な情報と次フェーズ開始条件を報告する。

再開時は、前回Runの未完了作業をそのまま続けず、マージ後の最新`main`を再調査する。

## 8. Phase 2全体の完了条件

- AndroidとiOSで購入者向け主要画面が起動可能。
- SQLite Adapterが最新Repository Contractを満たす。
- Seed、Reset、ClockがNativeで決定的に動作する。
- Storefront、Cart、Login、Account、Checkout、Order、Reviewの主要Flowが成立する。
- Native Adminが含まれていない。
- Android Preview APKを生成できる。
- iOS Simulatorまたは合意した内部検証Buildを生成できる。
- Maestroの選定した主要Flowが成功する。
- Production相当ProfileではTest Controlが無効。
- Web版の既存動作とWeb CIを壊していない。
- 実行できなかったiOS実機確認などを明示している。
- Phase 3へ送る課題が整理されている。

## 9. 各計画書

- [Phase 2A: Scope・共通契約](./01_phase2a-scope-and-contracts.md)
- [Phase 2B: Native Runtime基盤](./02_phase2b-native-runtime.md)
- [Phase 2C: SQLite Adapter](./03_phase2c-sqlite-adapter.md)
- [Phase 2D: Storefront・商品・Cart](./04_phase2d-storefront-cart.md)
- [Phase 2E: Auth・Account](./05_phase2e-auth-account.md)
- [Phase 2F: Checkout・Order・Review](./06_phase2f-checkout-order-review.md)
- [Phase 2G: EAS・Maestro・CI](./07_phase2g-eas-maestro-ci.md)
- [Phase 2H: 最終回帰・引継ぎ](./08_phase2h-final-validation.md)
