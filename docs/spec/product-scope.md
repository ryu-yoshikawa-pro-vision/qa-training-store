# Product Scope

## Current Product

Scenario Shopは、固定SeedとLocal Mockを使って、EC StorefrontとSaaS型管理画面のQAを学習・検証するアプリケーションです。実際の販売、決済、配送、外部API通信は行いません。

## Platforms

### Web

Desktop WebとMobile Webを正規対象とします。Storefront、Customer購入導線、Operator/Admin管理画面を提供します。管理操作はDesktop境界（1024px以上）を前提にし、狭いViewportでは専用Warningを表示します。

### Native

NativeはCustomer向けのGuest Storefront、Cart、Login、Account、Address、Checkout、Payment、Order、Reviewを対象とします。Native AdminとGuest Checkoutは対象外です。AndroidはBuildとRuntime/Maestroを保証範囲とし、iOSはAutomation/Production Simulator Build、Build-time metadata、Production guard、Artifact validationのBuild-only契約とします。

## Included Behavior

- 商品探索、検索、Facet、価格、Sale、在庫、Variation、Review Summary
- Guest/Customer Cart、Login時のCart統合、Checkout、Local Mock Payment
- Order Snapshot、Payment結果、Shipment、Customer Review
- Operator/Adminの商品、Category、Brand、Inventory、Order、Review、User管理
- Seed Reset、固定Clock、決定的Payment Delay、限定されたInspection
- Responsive、Keyboard、Screen Reader、Error/Empty/Loading/Conflict/Not Found表示

## Excluded Behavior

Cancel/Return/Refund、Payment Unknown/Reconciliation、Guest Checkout、Native Admin、Import/Export、Migration Recovery、Coupon、Point、Wishlist、Recommendation、外部Payment/配送APIは、このCurrent Specificationの期待挙動に含めません。

## Canonical Source Boundaries

この文書は意味・対象範囲を定義します。具体的なRouteは `app/`、Role/Status Typeは `src/domain/contracts/`、Seed/Scenarioは `src/seeds/metadata.ts` と `src/seeds/scenarios.ts`、Design Tokenは `src/presentation/design/tokens.ts`、Build/Native Configは `app.config.ts` と `.github/workflows/` を参照してください。
