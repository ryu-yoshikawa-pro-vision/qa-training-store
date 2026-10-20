# 状態とシナリオ

## 状態遷移

想定している主な状態遷移は次のとおりです。

| 集約 | 許可される遷移 |
|---|---|
| Product | draft → published; published → unpublished/discontinued; unpublished → published/discontinued |
| Account | active ↔ suspended |
| Checkout | active → converted/abandoned/expired |
| Order | pending_payment → payment_failed; pending_payment → paid; payment_failed → pending_payment; paid → preparing; preparing → shipped; shipped → delivered |
| Shipment | pending → shipped → delivered |
| Review | published ↔ hidden; published/hidden → deleted |
| Cart | active → consumed/abandoned |

状態の飛び越しや逆戻り、終端状態からの変更は許可しません。`discontinued`、`delivered`、`deleted`、`converted`、`expired`、`abandoned` は終端状態です。

## シナリオ制御

固定シナリオは `src/seeds/metadata.ts` の `SCENARIO_METADATA` および `src/seeds/scenarios.ts` における変換処理を正本とします。主なシナリオには、`default`、`empty-catalog`、`out-of-stock`、`low-stock`、`regular-member`、`cart-with-invalid-items`、`payment-declined`、`checkout-resume`、`reviewable-orders` があります。

リセット処理では、データベース、セッション、ゲスト識別子、クロック、決済遅延を指定された状態へ戻します。リセット完了の通知表示および安全な画面遷移の制御はUIテストコントロールのみが担当し、テストAPIのリセット処理はリセット結果とメタデータを返却するのみにとどめます。

## エラー状態と境界状態

アプリケーションでは、読み込み中、データなし、エラー、競合、未検出の各状態を明確に区別します。価格、公開状態、会員ランク、在庫、カートのバージョンは、カート表示、チェックアウト開始、注文確認、注文作成の各境界で再検証します。決済処理中は、再試行およびキャンセルを許可しません。

## ネイティブ境界

ネイティブアプリ向けの顧客シナリオは、`NATIVE_CUSTOMER_SCENARIOS` に定義された範囲に限定します。ネイティブ環境はWeb環境とアプリケーション層の仕様・セマンティクスを共有しますが、ストレージおよびランタイムのアダプターにはSQLiteやNative KVを使用します。本番ビルドでは、テストコントロール、ハーネス、自動化ブリッジは利用できません。

## 正本ソース

状態型の定義は `src/domain/contracts/entities.ts`、遷移ポリシーは `src/domain/policies/state-transitions.ts`、リセットプロトコルは `src/test-controls/`、ネイティブシナリオの許可リストは `src/seeds/metadata.ts`、Web向けテストコントロールは `src/test-controls/` および `e2e/web/fixtures.ts` を参照してください。

## 画面契約

### SCREEN-TEST-CONTROL — 管理者テストコントロール

画面カタログ: [画面カタログ](./screen-catalog.md)

#### 機能一覧

- Webの自動テスト（Automation Web）からシナリオ、クロック、決済遅延、シードリセットを操作する。
- テスト専用の操作画面であり、プロダクト本来の振る舞いを示すビジュアル仕様の対象には含めない。

#### 主要なUI状態

| 状態スラグ | 種別 | 対象者・ロール | 条件・シナリオ | 期待されるUI | 視覚要件 | 必須プラットフォーム | 視覚詳細 | 関連オラクル |
|---|---|---|---|---|---|---|---|---|
| `default` | baseline | `admin` | `default` | テストコントロールの操作項目と実行結果を表示する。 | `not-applicable` | `-` | `reason: テスト専用の操作画面であり、正本の画面リファレンスの対象外` | [状態とシナリオ](./state-and-scenarios.md#シナリオ制御) |

#### 画面リファレンス

##### `default`

（該当なし：テスト専用の操作画面のため対象外）

