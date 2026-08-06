# ADR-0004: Native SQLite TransactionとContract Test Strategy

- Status: Accepted
- Date: 2026-08-02

## Context

Native Customer dataは`expo-sqlite`で保持し、Cart mutationは同一SQLite transaction内でVersion、在庫、数量、Cart更新を確定する必要がある。Node/VitestではNative moduleを完全には実行できず、SQLite lockやFK enforcementの誤差をテストで隠すと実Nativeでの失敗を見逃す。

## Decision

1. Native databaseは`scenario-shop-native-v1.db`を使用し、open時に`PRAGMA foreign_keys = ON`、WAL、`foreign_key_check`を確認する。SchemaはCustomer storefront／cartに限定し、Admin／Order／Payment／Review persistenceを持たない。
2. 非冪等Cart mutationは`runNativeExclusiveTransaction`から`withExclusiveTransactionAsync`を呼び、callbackの返却値をcommit後に返す。callback未完了はエラー、`database is locked`はretry可能なApplication Errorへ変換する。独自Global Mutation Queueと無条件Retryは追加しない。
3. Contract Testは純粋なSchema／Mapper／Transaction fakeでNode検証し、Dexie adapterとNative customer adapterは同じCustomer contract suiteを共有する。Native実機では同じSuiteを専用DB／KV namespaceで実行し、close、delete、KV key removalを`finally`で行う。
4. Harnessはruntime UUIDから専用DB名とKV prefixを作り、Application DB／Session／Guest IDへ汚染しない。cleanup失敗は成功扱いにせず、work失敗とcleanup失敗を分けてsignalする。
5. Nodeテストの成功はAndroid／iOSの実SQLite Smokeの代替とはみなさない。実Native Buildが利用可能な環境でSchema、FK、PBKDF2、KV、Cart、Harness Cleanupを追加確認する。

## Consequences

- SQLite contractの大部分をNodeで高速に回帰できる。
- Native moduleの実装差、lock、再起動復元は実機／Simulator検証まで未確定として残る。
- DB schema version、seed version、image manifest versionは`src/config/versions.ts`で管理し、Expo configの公開metadataにも反映する。
