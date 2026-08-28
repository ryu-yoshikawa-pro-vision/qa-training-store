# E2E設計

## 1. Playwright Project

| Project | Gate | 用途 |
|---|---:|---|
| `chromium` | `e2e-chromium` の `required` leg | `pnpm run test:e2e:chromium`の対象 |
| `mobile-chromium` | `mobile-boundary` leg／PR外のExtended E2E | 360px StorefrontとMobile Boundary |
| `cross-role-chromium` | `e2e-chromium` の `cross-role` leg | Cross-role Lifecycle |
| `deployed-smoke` | Production Smoke | Cloudflare配信確認 |
| `firefox-smoke` / `webkit-smoke` | Cross-browser Smoke（週次／`workflow_dispatch`） | 互換性確認 |

`pnpm run test:e2e:chromium`は`e2e-chromium` matrixの`required` leg commandで、`e2e/web/phase1-required.spec.ts`と`e2e/web/ui-ux-improvements.spec.ts`を`chromium` projectで実行します。PRのWeb E2E coverage全体は`required`、`accessibility`、`mobile-boundary`、`cross-role`、`training-web-baseline`からなる`e2e-chromium` matrixであり、このcommandだけを唯一のRequired Gateとは扱いません。`ui-review-*` projectはUI Review用の別責務です。

## 2. Phase 1 Web業務Flow mapping（WE-CORE 12件）

以下の12件はRequirement / business-flow mappingであり、Current executable test declarationが12個あることを示すものではありません。

1. Guestの商品検索・Filter・商品詳細・Cart追加
2. Guest Cartの数量変更・削除・上限拒否
3. LoginとGuest Cart統合結果
4. customerのCheckout・TEST-SUCCESS購入
5. 明確なPayment失敗・Order詳細から再試行
6. 価格変更・在庫変更・会員ランク変更によるCheckout再確認
7. Order一覧・詳細・処理中Route再読込
8. delivered商品のReview投稿・編集
9. 管理者の商品Aggregate登録・Preview・公開
10. 管理者の商品編集・SKU/画像関連変更・非公開・draft削除制約
11. 在庫調整・Order準備開始・発送・配送完了
12. User停止・Login拒否・最後のadmin保護

各Flowは複数の見た目確認を詰め込まず、業務結果と主要Page Patternだけを確認します。Filter全組合せ、文字数境界、状態遷移の細部、Facet計算、Bulk各失敗理由はUnit/Application/Component/Repository Contractへ下げます。

## 3. Cross-role Lifecycle

admin商品登録・公開 → customer購入 → admin発送・配送完了 → customer Review投稿の長大Lifecycleは、WE-CORE 12件のmappingとは分離します。

- PR: `e2e-chromium` matrixの`cross-role` legで、`pnpm run test:e2e:cross-role`を`cross-role-chromium` projectで実行する。
- `e2e-chromium` matrixの全legが成功したことをWeb CIの`verify`で確認する。
- Lifecycle失敗時は各Role区間のTraceを保存する。

## 4. Locator・Component Object

Role、Accessible Name、Labelを優先します。`testID`は同一Role/Nameで一意化できない業務要素だけに使用します。Search Combobox、Filter Bar、Product Gallery、Cart Item、Price Summary、Checkout Step、Admin Shell、Resource Index、Save Bar、Order Timelineを業務単位で共通化し、AssertionをObject内へ隠しすぎません。

## 5. 待機・再試行

固定sleepは禁止します。URL、Button状態、Loading消失、Combobox option、Order状態を待ちます。Payment processing再読込は同じAttemptを再開し、既に完了済みなら既存結果へ遷移することを確認します。Playwright Retryにより同じ業務操作を再送しないよう、Test単位のSeed Resetを前提とします。

## 6. Inspection Assertion

Home新着への在庫切れ商品包含、管理商品一覧のactive SKU合計在庫Filter、Review平均の保存精度はApplication Integration/Repository Contract Testで検証し、必須E2Eを増やしません。

内部整合性の正本はApplication Integration/Dexie Contract Testです。E2Eからは固定Read-only Inspection APIだけを使い、Payment成功時の在庫減算回数、Cart/Checkout状態、Order/Payment/Shipment整合、Review Summaryに限定します。任意DB Queryを提供しません。

## 7. Artifact

失敗時にTrace、Screenshot、必要なVideo、Console、Scenario、Clock、Payment Delay、App/Schema/Seed/Build Versionを保存します。

## 8. Deployed Smoke

Cloudflare Automation URLでBuild Metadata、代表画像の正常表示と個別画像読込失敗時のPlaceholder、Reset/default Seed、Home、検索、Login、TEST-SUCCESS購入、注文詳細、Admin Overviewを確認します。Manifest全体の不整合はBuild Gateで検出するため、Runtime Recovery E2Eは作成しません。

## 9. Native CIとの境界

Web Phase 1のPlaywright GateとNative CI / Maestroは別のCurrent contractとして扱います。

- Native変更時のAndroidはBuild + Runtime / MaestroをRequiredとします。
- Native変更時のiOSはBuild-only（Automation BuildとProduction-validation Build）をRequiredとします。
- iOSのSimulator Runtime / Maestro PASSはCurrent contractで保証しません。
- iOSのstandalone `workflow_dispatch`は手動Build-only入口として維持されます。Native変更時はtop-level `native-ci`がiOS reusable workflowを呼び、`native-ci / verify`がiOS成功を要求します。

追加のNative / Maestro FlowをWeb Phase 1のPlaywright Gateへ統合する設計は、後続の検討範囲です。
