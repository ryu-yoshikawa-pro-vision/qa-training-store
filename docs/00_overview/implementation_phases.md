# 実装Phase計画

## 1. 方針

設計全体を一括実装しません。学習価値と依存関係に基づき、各Phaseの完了条件を満たしてから次へ進みます。将来Phaseの仕様は方向性だけを保持し、Phase開始時に詳細を再レビューします。`future/phase2`配下は参考資料でありPhase 1の正本ではありません。

## 2. Phase 1: 洗練されたWeb ECとPlaywright

### 目的

一般的なECの商品探索・購入と、SaaS型Adminの一覧・詳細・編集を安定して自動化できる状態を作ります。

### 必須範囲

1. Domain基盤: Money、Price、Permission、商品・Order状態
2. IndexedDB Repositoryと固定Seed
3. Storefront Shell、Home、検索、商品一覧、カテゴリ、商品詳細
4. Cart、Checkout、決定的Payment、Order履歴
5. Admin Shell、Overview、商品Aggregate・GitHub画像Asset参照・在庫・Order・Review・User管理
6. Accessibility、Playwright Chromium、Cloudflare Automation環境

### 完了条件

- Home、検索候補、Filter、Sort、Pagination、商品詳細、Cart、購入を自動化できる。
- 正常購入、明確なPayment失敗・再試行、Rank別価格、在庫不足、権限、管理Order処理を自動化できる。
- Admin Overviewから対象一覧・詳細へ遷移し、商品本体・SKU・画像参照の追加変更削除を含む主要管理操作を完了できる。
- Guest Cart統合、Cart数量境界、Checkout Session再開・破棄が決定的に動作する。
- Seed/Reset/ClockによりTest前提が決定的である。
- Critical/Highの既知不具合がない。
- `08_testing/e2e_design.md`のPhase 1必須12 Flowが安定し、その他の組合せは下位Testで検証されている。

## 3. Phase 2: NativeとEC業務拡張

### 候補範囲

- SQLite Adapter、Android/iOS購入者画面、Maestro
- Password変更、退会
- Guest Checkoutの学習価値を再評価
- 決定的なCancel、Return、全額Refund
- 簡易Audit Log
- Firefox/WebKitと主要Accessibility検証の拡充

### 開始条件

Phase 1のRepository Interface、Page Pattern、業務ルールが安定し、Web E2Eの保守負荷が把握できていること。

## 4. Phase 3: 高度な障害・運用教材

### 候補範囲

- 独立Mock Gateway台帳
- Payment timeout/unknown、Finalize失敗、Reconciliation
- Crash Point、Migration Recovery
- Import/Export、Integrity Check
- Public Demo分離、Visual、性能計測、iOS Release Gate
- Version付き規約同意履歴
- Wishlist、Recommendation、Coupon、Pointは具体的な教材要件がある場合だけ検討

### 開始条件

高度機能が具体的な学習カリキュラムまたはTest課題として必要になったことを確認すること。単に実ECへ近づけるためだけには追加しません。

## 5. Scope変更Rule

- Phase 1へ項目を追加する場合、商品探索・購入判断・管理効率・Accessibilityのどれを改善するか説明する。
- 見た目だけの装飾、行動履歴Personalization、分析ChartはPhase 1へ追加しない。
- 将来Phaseの詳細実装をPhase 1コードへ先回りして作らない。
- Interfaceは将来拡張を妨げない範囲で設計するが、未使用の抽象化やTableを追加しない。
