# テスト容易性設計

## 1. 方針

フェーズ1（Phase 1）では、E2Eテストの前提条件を決定論的に整える最小限の機能のみを製品要件として定義します。任意のデータベース操作や高度な障害注入フレームワーク（Fault Framework）は作成しません。

## 2. ビルド

| ビルド | 用途 | テストコントロール |
|---|---|---:|
| local | 開発 | ON |
| automation | Cloudflare・Playwright | ON |

パブリックビルド（Public Build）の必要性については、フェーズ3で改めて再評価します。

## 3. WebテストAPI

```typescript
interface TestApi {
  reset(input: { scenario: string }): Promise<TestMetadata>;
  setClock(iso: string | null): Promise<TestMetadata>;
  setPaymentDelay(milliseconds: number): Promise<TestMetadata>;
  getMetadata(): Promise<TestMetadata>;
  inspectOrder(orderId: string): Promise<OrderInspection>;
  inspectVariant(variantId: string): Promise<VariantInspection>;
  inspectReviewSummary(productId: string): Promise<ReviewSummaryInspection>;
}
```

`window.__TEST_API__` はオートメーションビルド（Automation Build）限定で公開します。書き込み操作はリセット（Reset）、シナリオシード（Scenario Seed）、クロック（Clock）、決済遅延（Payment Delay）に限定し、読み取り操作はメタデータ（Metadata）および固定の読み取り専用インスペクションDTO（Read-only Inspection DTO）のみに制限します。インスペクション（Inspection）は1件の固定エンティティIDを入力として受け取り、事前に許可された項目のみを返します。任意のSQL実行、テーブル操作、クエリ発行、条件指定、エンティティの書き換え、スクリプト実行、外部フェッチ（Fetch）などの機能は提供しません。

## 4. テストコントロールUI

オートメーション管理者（Automation admin）のみが利用可能です。

- シナリオの選択とリセット：リセット実行時はデータベース、CurrentSessionStore、GuestIdentityStoreを消去し、シードカタログ（Seed Catalog）に定義されたゲストIDをGuestIdentityStoreへ設定する
- クロック（日時）の固定・解除
- 決済遅延（Payment Delay）の設定
- アプリケーション／スキーマ／シード／ビルドの各バージョン情報の表示

## 5. クロック・ID

- 業務日時の取得にはClock Portを使用する。
- UUIDの生成には、シードデータを除き通常のジェネレーター（Generator）を使用する。
- 注文番号（Order Number）に含まれる日付部分にも、Clockから取得したAsia/Tokyoタイムゾーンの日時を使用する。

## 6. アニメーション・待機

- テスト実行時はアニメーションを無効化または短縮する。
- ローディング中、決済処理中（Payment processing）、ダイアログにはアクセシブルな状態名を付与する。
- Playwrightによるテストでは、固定時間のスリープ（sleep）ではなく、UIの状態変化を待機する。

## 7. 内部整合性の検証

原則として、アプリケーション結合テスト（Application Integration Test）およびDexie契約テスト（Dexie Contract Test）で以下の内容を検証します。E2EテストではUIの表示結果の確認を優先し、必要な場合に限って固定のインスペクションAPIを使用します。

- 決済（Payment）成功時における在庫の1回減算
- 注文（Order）／決済（Payment）／配送（Shipment）の対応関係
- レビューサマリー（Review Summary）および評価分布
- カートの消費（Cart consumed）とチェックアウト完了（Checkout converted）
- 一括操作（Bulk Action）における部分成功時の対象状態
- 商品集約（Product Aggregate）保存後における商品（Product）／バリアント（Variant）／画像（Image）／初期在庫（INITIAL_STOCK）の整合性
- ゲストカート統合時における数量の計算結果および除外結果
- アクティブなチェックアウトセッション（active Checkout Session）が最大1件であること、および startOrResume の実行結果

## 8. テストの分離

- テストケースごとにシナリオを明示してリセットを実行する。リセット成功後はページをリロードし、メタデータ取得前にデータベースとローカルストレージ（Local Storage）上のセッション情報およびゲスト識別情報（Guest Identity）が同一のシード状態であることを検証する。ブロック（blocked）状態や処理の途中失敗は成功とみなさない。
- ブラウザコンテキスト（Browser Context）間でIndexedDBを共有しない。
- 管理者操作と顧客操作が連動するテストは、同一コンテキストでの実行が必須となるケースを除き、シードデータを用いて分割する。

## 9. 将来の拡張

フェーズ2でネイティブアプリ向けディープリンクリセット（Native Deep Link Reset）、フェーズ3でクラッシュポイント（Crash Point）、決済ゲートウェイ台帳（Gateway Ledger）、インポート／エクスポート機能、マイグレーション障害注入（Migration Fault）の追加を検討します。

## リセット制約

- 動作保証条件は1ブラウザコンテキスト（Browser Context）・1ページとする。
- データベースの削除がブロック（blocked）された場合は `RESET_BLOCKED_BY_OPEN_PAGE` エラーとして失敗させ、部分的な成功を成功とはみなさない。
- Playwrightのフィクスチャ（Fixture）は、リセット処理を実行する前に同一コンテキスト内の余分なページを閉じる。