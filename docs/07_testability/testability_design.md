# Test容易性設計

## 1. 方針

Phase 1では、E2Eの前提を決定的にする最小機能だけを製品要件として持ちます。任意DB操作や高度Fault Frameworkは作りません。

## 2. Build

| Build | 用途 | Test Control |
|---|---|---:|
| local | 開発 | ON |
| automation | Cloudflare・Playwright | ON |

Public BuildはPhase 3で必要性を再評価します。

## 3. Web Test API

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

`window.__TEST_API__`はAutomation Buildだけに公開します。書込みはReset、Scenario Seed、Clock、Payment Delay、読取りはMetadataと固定Read-only Inspection DTOに限定します。Inspectionは1件の固定Entity IDを入力し、許可済み項目だけを返します。任意SQL、任意Table、任意Query、任意条件、任意Entity書換え、Script実行、外部Fetchを提供しません。

## 4. Test Control UI

Automation adminだけが利用できます。

- Scenario選択とReset。ResetはDB、CurrentSessionStore、GuestIdentityStoreを消去し、Seed CatalogのGuest IDをGuestIdentityStoreへ設定する
- Clock固定・解除
- Payment Delay
- App/Schema/Seed/Build Version

## 5. Clock・ID

- 業務日時はClock Portを使用する。
- UUIDはSeed以外で通常Generatorを使用する。
- Order Numberの日付もClockのAsia/Tokyoを使用する。

## 6. Animation・待機

- Test時はAnimationを無効化または短縮する。
- Loading、Payment processing、DialogにAccessibleな状態名を付ける。
- Playwrightは固定sleepではなくUI状態を待つ。

## 7. 内部整合性検証

原則としてApplication Integration TestとDexie Contract Testで次を検証します。E2EではUI結果を優先し、必要な場合だけ固定Inspection APIを使用します。

- Payment成功時の在庫1回減算
- Order/Payment/Shipmentの対応
- Review Summary・評価分布
- Cart consumedとCheckout converted
- Bulk Actionの部分成功対象状態
- Product Aggregate保存後のProduct/Variant/Image/INITIAL_STOCK整合
- Guest Cart統合の数量・除外結果
- active Checkout Session最大1件とstartOrResume結果

## 8. Test分離

- TestごとにScenarioを明示してResetする。Reset成功後にPageをReloadし、Metadata取得前にDBとLocal StorageのSession/Guest Identityが同じSeed状態であることを検証する。blockedまたは途中失敗は成功扱いしない。
- Browser Context間でIndexedDBを共有しない。
- 管理操作と顧客操作の連動は、同一Contextで必要な場合を除きSeedで分割する。

## 9. 将来拡張

Phase 2でNative Deep Link Reset、Phase 3でCrash Point、Gateway Ledger、Import/Export、Migration Faultを追加検討します。

## Reset制約

- 対応条件は1 Browser Context・1 Page。
- DB削除がblockedになった場合は`RESET_BLOCKED_BY_OPEN_PAGE`で失敗し、部分成功を成功扱いしない。
- Playwright FixtureはReset前に同一Contextの余分なPageを閉じる。
