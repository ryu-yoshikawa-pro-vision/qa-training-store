# State and Scenarios

## State Transitions

想定している主な状態遷移は次のとおりです。

| Aggregate | Allowed transitions |
|---|---|
| Product | draft → published; published → unpublished/discontinued; unpublished → published/discontinued |
| Account | active ↔ suspended |
| Checkout | active → converted/abandoned/expired |
| Order | pending_payment → payment_failed; pending_payment → paid; payment_failed → pending_payment; paid → preparing; preparing → shipped; shipped → delivered |
| Shipment | pending → shipped → delivered |
| Review | published ↔ hidden; published/hidden → deleted |
| Cart | active → consumed/abandoned |

状態の飛び越しや逆戻り、終端状態からの変更は許可しません。`discontinued`、`delivered`、`deleted`、`converted`、`expired`、`abandoned` は終端状態です。

## Scenario Control

固定シナリオは `src/seeds/metadata.ts` の `SCENARIO_METADATA` および `src/seeds/scenarios.ts` における変換処理を正本とします。主なシナリオには、`default`、`empty-catalog`、`out-of-stock`、`low-stock`、`regular-member`、`cart-with-invalid-items`、`payment-declined`、`checkout-resume`、`reviewable-orders` があります。

リセット処理では、データベース、セッション、ゲスト識別子（Guest Identity）、クロック、支払い遅延（Payment Delay）を指定された状態へ戻します。リセット完了の通知表示および安全な画面遷移の制御はUIテストコントロールのみが担当し、テストAPIのリセット処理（Test API Reset）はリセット結果とメタデータを返却するのみにとどめます。

## Error and Boundary States

アプリケーションでは、Loading（読み込み中）、Empty（データなし）、Error（エラー）、Conflict（競合）、Not Found（未検出）の各状態を明確に区別します。価格、公開状態、会員ランク、在庫、カートのバージョンは、カート表示、チェックアウト開始、注文確認、注文作成の各境界で再検証します。決済処理中（Payment processing中）は、再試行およびキャンセルを許可しません。

## Native Boundary

ネイティブアプリ向けの顧客シナリオ（Native Customer Scenario）は、`NATIVE_CUSTOMER_SCENARIOS` に定義された範囲に限定します。ネイティブ環境はWeb環境とアプリケーション層の仕様・セマンティクスを共有しますが、ストレージおよびランタイムのアダプターにはSQLiteやNative KVを使用します。本番ビルド（Production Build）では、テストコントロール、ハーネス、自動化ブリッジ（Automation Bridge）は利用できません。

## Canonical Sources

状態型（State Type）の定義は `src/domain/contracts/entities.ts`、遷移ポリシーは `src/domain/policies/state-transitions.ts`、リセットプロトコルは `src/test-controls/`、ネイティブシナリオの許可リスト（Allowlist）は `src/seeds/metadata.ts`、Web向けテストコントロールは `src/test-controls/` および `e2e/web/fixtures.ts` を参照してください。

## Screen Contracts

### SCREEN-TEST-CONTROL — Admin Test Control

Screen Catalog: [Screen Catalog](./screen-catalog.md)

#### Functions

- Webの自動テスト（Automation Web）からシナリオ、クロック、決済遅延、シードリセットを操作する。
- テスト専用の操作画面（Test-only surface）であり、プロダクト本来の振る舞いを示すビジュアル仕様（Canonical Visual）の対象には含めない。

#### Important UI States

| State slug | Type | Audience / Role | Condition / Scenario | Expected UI | Visual requirement | Required platforms | Visual detail | Related Oracle |
|---|---|---|---|---|---|---|---|---|
| `default` | baseline | `admin` | `default` | テストコントロールの操作項目と実行結果を表示する。 | `not-applicable` | `-` | `reason: Test-only operational surfaceでありCanonical Visualの対象外` | [State and Scenarios](./state-and-scenarios.md#scenario-control) |

#### Visual References

##### `default`
（該当なし：Test-only operational surfaceのため対象外）