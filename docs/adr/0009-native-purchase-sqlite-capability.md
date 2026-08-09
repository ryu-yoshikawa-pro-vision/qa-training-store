# ADR-0009: Native購入者CapabilityとSQLite契約の後半拡張

- Status: Accepted
- Date: 2026-08-08
- Approved-by: user `/goal` request for Phase 2後半
- Supersedes (Phase 2後半の範囲のみ):
  - `docs/adr/0003-platform-route-composition-root.md#Decision` 4のNative Capability範囲
  - `docs/adr/0004-native-sqlite-transaction-test-strategy.md#Decision` 1のStorefront／Cart限定範囲

## Context

Phase 2前半では、NativeをGuest Storefront／Cartへ限定し、`expo-sqlite` SchemaもCatalog／Cart中心にした。Phase 2後半では、同じNative Customer Composition RootへLogin、Account、Checkout、Payment、Order、Reviewを追加する必要がある。一方、Web/Application側には既存Use Case、Repository Contract、Transaction Scope、Seed Datasetがあり、Native UI都合でApplication契約を分岐させるべきではない。

## Decision

1. NativeはAdmin Capabilityを生成せず、Customer向けAuth／Account／Cart／Checkout／Order／Reviewに必要なRepository CapabilityだけをComposition Rootで注入する。Web Dexie、DOM、CSS、Browser StorageはNative依存へ入れない。
2. Native SQLiteへ、既存Domain Entityのうち購入者Flowに必要な`user_addresses`、`inventory_histories`、`checkout_sessions`、`orders`、`order_items`、`daily_sequences`、`order_status_histories`、`payments`、`shipments`、`reviews`、`review_status_histories`を追加する。既存Tableを含む全Foreign Keyを有効化し、`foreign_key_check`を開設・Seed後・Harnessで確認する。
3. Shared Application Repository Contractを実装するNative Adapterは、非冪等Mutationを`withExclusiveTransactionAsync()`で囲み、業務結果をcommit完了後に返す。SQLite lockは既存Application Error契約へ変換し、非冪等Mutationへの自動RetryやGlobal Mutation Queueは追加しない。
4. Seedは既存`SeedDataset`とScenarioの意味を再利用し、追加Schema Versionを更新してDevelopment／Automation DBを一貫したexclusive transactionで再作成する。Migration Recovery、任意SQL、Sentinel Tableは作らない。
5. Native Component TestはUI状態と契約境界を検証し、PBKDF2、FK、transaction、Harness隔離、注文／決済／Reviewの永続化はNodeの共有ContractとAndroid／iOSの実`expo-sqlite` Harnessで別々に検証する。Node Testを実Runtimeの代替にしない。

## Consequences

- Native UIはWebと同じApplicationのError、Validation、DTO、Cart Merge、Checkout Version、Payment Idempotency、Review Eligibilityを利用できる。
- SQLite Schema／Seed／Mapper／Repositoryの変更範囲は広がるが、Web契約をNative専用に歪めずに済む。
- 前半DBの既存生成物はDevelopment／Automationで再Seedされる。既存DBの本番Migration RecoveryはPhase 2対象外として明記する。
- Harnessは購入系Tableを含む専用Database／KV namespaceを使い、Application DB／KVを変更しない。

## Rejected alternatives

- Native UI専用の簡易注文／決済Use Case: WebとNativeの業務契約が分岐し、Cart Version／Idempotency／Review Summaryを二重管理するため不採用。
- NativeへDexieを持ち込む: Platform Dependency ContractとProduction Bundle Guardに反するため不採用。
- Harness専用のSentinel Entity／全DB Fingerprint: 既存Harnessの必要範囲を超え、Application状態の意味を壊すため不採用。
