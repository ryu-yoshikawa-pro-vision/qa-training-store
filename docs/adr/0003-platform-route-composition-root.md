# ADR-0003: Platform別Route Composition RootとNative Customer境界

- Status: Accepted
- Date: 2026-08-02

## Context

既存のExpo Router入口はWeb CSS、Browser Runtime、Dexieへ直結していた。Nativeへ同じ入口を再利用すると、Web専用ImportがNative Bundleへ入り、Customer向けNative基盤へAdmin／Checkout／Paymentの依存が混入する。Phase 2前半では、WebのURL契約とDexie回帰を保ちながら、Guest StorefrontとCartだけをNativeで実行可能にする必要がある。

## Decision

1. `app/_layout.tsx` は `src/presentation/root-layout.tsx` を経由し、Platform ResolverでNative／WebのRoot Layoutを選択する。Web専用の `app/_layout.web.tsx` はCSS、`AppRuntimeProvider`、`AppFrame`を所有する。
2. Native Rootは `NativeAppRuntimeProvider`、`NativeShell`、`Slot`、Test Control Bridgeだけを組み合わせる。Native routeは `*.native.tsx`でWeb routeと同じURLを維持し、前半対象外は安全なplaceholderへ分離する。
3. Application層はDomain Repository Portだけに依存し、Dexie／SQLite／Browser Storageは各Composition RootまたはAdapterで構築する。WebはDexie repository factory、NativeはCustomer専用SQLite repositoryを使用する。
4. Native前半のCapabilityはCatalog、Product、Guest Cart、Session／Guest Identity、Customer SQLiteに限定する。Admin、Checkout、Payment、Order、ReviewのNative persistenceはこのPhaseへ追加しない。
5. NativeのTest ControlはRoot BridgeのDeep Link経路に限定し、Admin Test Control UIをNativeで再利用しない。Production buildではlocal／automation guardがfalseとなる。

## Consequences

- Native BundleからWeb CSS、Dexie、React Aria、Browser Storageを静的検査できる。
- Webの既存route/page/testを維持できる一方、Native側にはroute wrapperとplaceholderが増える。
- 後半でNative Login／Account／Checkoutを追加する際は、Customer Capabilityを拡張し、Route InventoryとADRを更新する必要がある。
- CNGを維持するため、ローカル生成の`android/`／`ios/`はRepository成果物に含めない。

## Non-goals

- EAS Account／Project／Profile／Workflow／Submitの設定。
- Native Admin、Payment、Order、Review、Store公開。
