# State and Scenarios

## State Transitions

期待する主要遷移は次のとおりです。

| Aggregate | Allowed transitions |
|---|---|
| Product | draft → published; published → unpublished/discontinued; unpublished → published/discontinued |
| Account | active ↔ suspended |
| Checkout | active → converted/abandoned/expired |
| Order | pending_payment → payment_failed/paid → preparing → shipped → delivered; payment_failed → pending_payment |
| Shipment | pending → shipped → delivered |
| Review | published ↔ hidden; published/hidden → deleted |
| Cart | active → consumed/abandoned |

状態の飛越し、逆戻り、終端状態からの変更は許可しません。`discontinued`、`delivered`、`deleted`、`converted`、`expired`、`abandoned`は終端です。

## Scenario Control

固定Scenarioは `src/seeds/metadata.ts` の `SCENARIO_METADATA` と `src/seeds/scenarios.ts` の変換処理を正本とします。代表的な用途は `default`、`empty-catalog`、`out-of-stock`、`low-stock`、`regular-member`、`cart-with-invalid-items`、`payment-declined`、`checkout-resume`、`reviewable-orders`です。

ResetはDatabase、Session、Guest Identity、Clock、Payment Delayを指定状態へ戻します。UI Test ControlだけがReset後のNoticeと安全な画面遷移を所有し、Test API ResetはReset結果とMetadataを返すだけです。

## Error and Boundary States

ApplicationはLoading、Empty、Error、Conflict、Not Foundを区別します。価格、公開状態、Rank、在庫、Cart VersionはCart表示、Checkout開始、確認、Order作成の境界で再検証します。Payment processing中は再試行とCancelを許可しません。

## Native Boundary

Native Customer Scenarioは `NATIVE_CUSTOMER_SCENARIOS` に限定します。NativeはWebとApplicationの意味を共有しますが、Storage/Runtime AdapterはSQLite/Native KVを使用します。Production BuildではTest Control、Harness、Automation Bridgeを利用できません。

## Canonical Sources

State Typeは `src/domain/contracts/entities.ts`、遷移Policyは `src/domain/policies/state-transitions.ts`、Reset Protocolは `src/test-controls/`、Native Scenario Allowlistは `src/seeds/metadata.ts`、Web Test Controlは `src/test-controls/` と `e2e/fixtures/`を参照してください。
