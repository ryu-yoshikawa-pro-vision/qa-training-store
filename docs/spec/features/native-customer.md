# Native Customer

## Purpose / Scope

Native CustomerがWebと共有するProduct Behaviorを、SQLite/Native KVとNative Shellで提供する契約を定義します。Native Admin、Guest Checkout、iOS物理端末Runtimeは対象外です。

## Business Rules

### BR-NATIVE-001 — Native Customerは共有Application契約に従う

Login、Account、Cart、Checkout、Payment、Order、Reviewの意味、Role、State、Error、SnapshotをWebと共有し、Native専用の簡略業務Ruleを作りません。

### BR-NATIVE-002 — Native RuntimeとProduction Capabilityを分離する

Automation/DevelopmentだけがTest Control、Harness、Automation Bridgeを持ち、Production Buildはそれらを公開・Importしません。Native SQLite Mutationはexclusive transactionとFK checkを守ります。

## UI / Behavior Contract

Androidは標準Native Runtime対象で、Maestroはユーザー操作、Observation、Evidence、Atomic Findingへ接続します。iOSは独立BuildとBuild-time guard/artifactを検証し、Simulator Runtime/Maestroは正式Gateにしません。

## Acceptance Criteria

### Criteria

#### AC-NATIVE-001 — Web共有契約をNativeで維持する

Related BR: `BR-NATIVE-001`

Native Customerの購入・Order・ReviewとRole/State/Failureが共有Application契約と一致し、Admin capabilityが混入しません。

#### AC-NATIVE-002 — AutomationとProductionを隔離する

Related BR: `BR-NATIVE-002`

Automation BuildでTest Control/Harnessが到達でき、Production BundleではMarker、Module、画面、Serviceが存在しません。Android RuntimeとiOS Build-onlyの保証範囲が混同されません。

## Executable Canonical Sources

- `src/bootstrap/native-runtime.ts`
- `src/infrastructure/database/sqlite/`
- `src/seeds/metadata.ts`
- `src/test-controls/`
- `.github/workflows/native-ci.yml`
- `.github/workflows/native-ios-ci.yml`
