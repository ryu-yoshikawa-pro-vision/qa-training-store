# Scenario Shop Phase 3 Cloudflare Backend / API QA 実装計画

## 0. このPlanと現在Branchの位置づけ

この文書は、`qa-training-store` / Scenario Shopへ、**Cloudflare無料枠を前提とした公開Backend/APIテスト対象**を追加するための実装計画である。

現在の`plan/phase3-cloudflare-backend` Branchは**計画文書だけを保存・レビューするDocumentation-only Branch**とする。このBranchではApplication Code、Workflow、Dependency、Cloudflare設定の実装は行わない。

実装は本Planのレビュー完了後、最新`main`から別のFeature Branchを作成して開始する。

本Planの設計基準は以下の順で優先する。

1. QA / テスト自動化教材として学習価値が高いこと
2. Public Repository / Public Test Targetとして安全に運用できること
3. Cloudflare Free Plan内で継続運用できること
4. Current SpecificationのProduct Behaviorを意図せず変えないこと
5. 現在のWeb / Native資産を不要に壊さないこと
6. 過剰設計を避け、ローカルでも再現できること
7. Free quota最適化のために恒久的な設計複雑性を先回りして導入しないこと
8. Cloudflare固有制約を隠蔽せず、教材上の学習境界として明示すること
9. Current parityとPhase 3で新規追加するQA教材Capabilityを混同しないこと
10. Scenario IDの見かけ上の一致よりScenario semanticsの一致を優先すること

---

## 1. Goal

Scenario Shopを、現在のWeb / Native UIテスト教材から、以下を同一Repositoryで学習できるQA Sandboxへ拡張する。

- Web UI Test
- Native UI Test
- HTTP / REST API Test
- Authentication / Authorization Test
- Backend Integration Test
- Database Test
- Error Handling / Negative Test
- State Transition Test
- Transaction / Idempotency Test
- Basic Concurrency / Inventory Conflict Test
- Contract Test
- Migration Test
- CI/CD Test
- Request IDを使った障害調査
- Local環境でのStructured Log / D1調査

Target Architectureは次とする。

```text
                    Public Internet
                         |
          +--------------+--------------+
          |                             |
          v                             v
 Cloudflare Pages                Cloudflare Worker
 Expo Web Static SPA                 REST API
          |                             |
          | HTTPS / JSON               |
          +---------------------------> |
                                        v
                                  Cloudflare D1
                                  SQLite-compatible DB

 Native Expo App
   |
   +-- Phase 3では既存SQLite構成を維持
```

Phase 3完了時点で、WebはBackend/APIを実際に利用する構成へ移行する。

NativeはPhase 2で構築したSQLite / Native local-first学習対象を維持し、Phase 3ではBackend移行対象に含めない。

### 1.1 PublicとLocalの学習範囲を分ける

Public Free環境では、Cloudflare Dashboard / raw Worker logを一般利用者へ公開しない。

```text
Public
- UI / API Functional Test
- Authentication / Authorization
- Contract / Error / State Transition
- Sandbox Isolation
- Request IDを使ったEvidence記録

Local Wrangler
- 上記すべて
- Structured Worker Log
- D1 query / migration / constraint investigation
- Load / Stress / Soak
- Public Free環境で禁止する破壊的検証
```

Public利用者向けにlog閲覧APIは追加しない。

---

## 2. Current Baseline / Problem

現在のScenario ShopはDomain / Application / Repository abstractionを持つが、WebもNativeもClient Runtime内で完結する。

```text
Web
UI -> Application -> Repository -> IndexedDB / Dexie

Native
UI -> Application -> Repository -> SQLite
```

そのため、以下は十分なテスト対象になっていない。

- HTTP request / response
- HTTP status code
- API validation
- CORS / preflight
- Backend authentication / authorization
- Server-side transaction
- API / DB integration
- Network timeout / 5xx / 429
- Idempotency
- Server-side inventory conflict
- API contract drift
- Database migration
- Request ID / server logを使った障害調査

Phase 3ではこの不足をBackend追加によって埋める。

通常のProduction ECを再現すること自体はGoalではない。**QAで観測・再現・自動化しやすいBackend**を作る。

### 2.1 Current Specificationを最優先する

Backend化はProductの新規作り直しではない。

実装時は次の順序で判断する。

```text
Current Normative Spec
        ↓
Current Business Rule / Acceptance Criteria
        ↓
Current Application Capability
        ↓
Current Web route / page usage
        ↓
Backend API Capability
        ↓
HTTP Endpoint / D1 Persistence
```

既存Implementationの都合だけでCurrent Product Behaviorを削らない。

一方、Current Specに含まれないBehaviorを「Backendらしいから」という理由だけでCurrent parity扱いにしない。

既知のCurrent parity対象として最低限以下を落とさない。

- Signup / Login / Logout / Current User
- Guest Cart merge
- Home Catalog
- Product Search / Facet / Detail
- Product Review List
- Address Suggestion
- Cart Price Change Acceptance
- Stateful Checkout
- Payment Retry
- Customer Order / Review Eligibility / Review
- Admin Overview
- Admin Catalog / Inventory / Orders / Reviews / Users

Current ScopeでExcludedなCancel / Return / RefundをPhase 3で勝手に追加しない。

### 2.2 Operation Classification

Traceability Matrixでは各API Operationを次のいずれかへ分類する。

```text
CURRENT_PARITY
PHASE3_QA_EXTENSION
PLATFORM_CONTROL
```

例:

```text
GET /v1/home
  -> CURRENT_PARITY

POST /v1/test/sandboxes
  -> PLATFORM_CONTROL

Idempotency-Key付きOrder作成
  -> PHASE3_QA_EXTENSION
```

Current parityを満たすために不要な便利APIを無制限に追加しない。

---

## 3. Architecture Decision

### 3.1 採用構成

- Frontend Hosting: 現行Cloudflare Pagesを継続
- Backend Runtime: Cloudflare Workers
- Database: Cloudflare D1
- API Style: REST / JSON
- Backend Language: TypeScript
- HTTP Router: Hono
- Validation: Zod
- Database Access: D1 Prepared Statement + SQL
- Migration: Wrangler D1 migrations
- Local Runtime: Wrangler local development + local D1
- Test Runner: 既存Vitest + Cloudflare Workers公式Vitest integration
- HTTP Integration Test: Worker test harness / HTTP boundary
- E2E/API Test: Playwright request APIまたはNode HTTP client
- Contract: OpenAPI 3.1

### 3.2 初期版で採用しないもの

- Prisma
- Drizzle ORM
- PostgreSQL
- Supabase
- Firebase
- Durable Objects
- KVを主要Databaseとして利用
- R2
- Queues
- Workflows
- Microservices
- GraphQL
- Kubernetes
- Docker必須化
- 外部Auth Provider
- Stripe等の実決済
- Event Sourcing
- CQRS

D1を直接扱い、SQL、migration、constraint、query、transaction境界の学習対象を隠さない。

### 3.3 Pages FunctionsではなくStandalone Workerを使う

理由:

- API自体を独立したテスト対象として扱いやすい
- Web build / static hostingとBackend lifecycleを分離できる
- `workers.dev` URLだけでもPublic APIを成立させられる
- Postman / Bruno / REST Assured / pytest等から直接扱いやすい
- `wrangler dev`でBackendだけを起動できる
- 現行PagesをWorkers Static Assetsへ移行する必要がない

Hosting MigrationはPhase 3 Goalに含めない。

### 3.4 Server-side Identity Boundary

WorkerではBrowser `CurrentSessionStore` / `GuestIdentityStore`をCurrent User SSOTとして再利用しない。

```text
HTTP Request
   ↓
Sandbox Middleware
   ↓
Authentication Middleware
   ↓
RequestContext
{
  sandboxId,
  userId | null,
  role | null,
  accountStatus | null,
  requestId
}
   ↓
Operation-specific Authorization / Active Account Guard
   ↓
Backend Application Service
   ↓
D1 Repository / Command
```

AuthenticationとAuthorizationを分離する。

重要:

- Valid Session Tokenからsuspended / withdrawn userを識別できること自体は許容する
- Current Operationがactive accountを要求する場合に、Operation Guardで`ACCOUNT_SUSPENDED` / `ACCOUNT_WITHDRAWN`等を返す
- `suspended-user` / `withdrawn-user` Scenarioのsemanticsを変えない

禁止:

- Worker module-levelにper-user mutable session stateを置く
- Request間でCurrent Userをin-memory共有する
- Browser `CurrentSessionStore`をBackendへそのまま持ち込む

再利用対象は原則pureなDomain Policy / Service / Contractとする。

### 3.5 Existing TransactionRunnerをD1へ機械移植しない

Current Applicationのcallback型`ApplicationTransactionRunner`をD1へ同じ形で持ち込まない。

禁止例:

```text
transactionRunner.run(async () => {
  await repositoryA.update()  # auto-commit
  await repositoryB.insert()  # auto-commit
  await repositoryC.update()  # failure
})
```

Backendのatomic operationは、必要なread / validationを行った後、同一Transactionで確定すべきPrepared Statement群を組み立て、D1 `batch()`等のall-or-nothing境界で実行する。

```text
Read-only / immutable validation
     ↓
Build statements
     ↓
D1 atomic operation
- mutable-state guard / conditional mutation
- mutation A
- mutation B
- history
- state transition
     ↓
Commit or Rollback
```

ここでbatch外へ出してよいread / validationは、request schema、存在確認後もatomic mutationの正当性を左右しないimmutable/reference data、またはatomic boundary内で再検証される前提のpre-readに限る。

**在庫数、optimistic version、現在state、sequence uniqueness等のmutable-state predicateをbatch外のread結果だけで確定してはならない。** これらは同一D1 atomic operation内のguard / conditional mutation / constraint等で評価または再評価し、競合時はSection 3.6のrollbackへ接続する。

Backendではtransaction-oriented Command / Repository APIを設けてよい。

既存Client向けRepository interfaceへD1のatomicityを無理に合わせない。

### 3.6 Guard failureをSQL failureへ変換する

D1 `batch()`へstatementを並べただけでは、optimistic lockや在庫Guardが自動的にrollback条件になるとは限らない。

例えばconditional UPDATEが0 row更新でもSQL statement自体は成功扱いになり得る。

したがってatomic operationでは、**Guard不成立を同一atomic boundary内のSQL failureへ変換し、batch全体をrollbackさせる**ことを必須Contractとする。

対象:

- insufficient stock
- stale expected version
- idempotency conflict
- concurrent sequence conflict
- invalid state transition where mutation race can occur

実装方式はWave A2でD1 / SQLite semanticsを確認して固定する。

候補:

- constraint
- trigger
- assertion用statement
- guardを含むsingle SQL construct
- guarded mutation resultをSQL failureへ昇格する同等方式

DoD:

```text
Guard failure
-> target state unchanged
-> history unchanged
-> dependent aggregate unchanged
-> idempotency state inconsistentなし
```

### 3.7 Transaction Invariant Inventory

Checkoutだけを特別扱いせず、Current `transactionRunner.run(...)`の全call siteをImplementation開始時に棚卸しする。

最低成果物:

```text
Current Transaction Label
Call Site
守るInvariant
Current all-or-nothing / partial-success semantics
D1 Command / HTTP orchestration
Guard
Rollback Test
```

最低対象:

- Login / Signup + Guest Cart Merge + Session作成
- Product Aggregate create/update/status/delete
- Category / Brand mutation protection
- Inventory adjustment + Inventory History
- Checkout start / order creation / payment finalization / retry
- Order + Shipment + Order History
- Review + Review History + Review Summary
- User role/status + Session invalidation + Checkout invalidation
- Last Admin protection
- Order Number Sequence

PR AでこのInventoryが未完成の状態を完了扱いにしない。

---

## 4. Cloudflare Free Plan Constraint

2026-08-15時点のCloudflare公式DocumentationをImplementation Baselineとする。

Implementation開始時にも再確認し、上限変更があれば数値を更新する。

### 4.1 Workers Free

- 100,000 requests / day
- CPU time: 10 ms / HTTP request
- Memory: 128 MB
- Subrequests: 50 / request
- Simultaneous outgoing connections: 6 / request
- Worker compressed size: 3 MB
- Worker startup time: 1 second
- Cron Triggers: 5 / account

Reference:

- [Workers limits](https://developers.cloudflare.com/workers/platform/limits/)
- [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/)

### 4.2 D1 Free

- 10 databases / account
- 500 MB / database
- 5 GB total storage / account
- 5 million rows read / day
- 100,000 rows written / day
- 50 D1 queries / Worker invocation
- 100 bound parameters / query
- Time Travel: 7 days

Reference:

- [D1 limits](https://developers.cloudflare.com/d1/platform/limits/)
- [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/)

### 4.3 Pages Free

- 500 builds / month
- 20,000 files / site
- Static asset requests are free and unlimited
- Pages Functionsを使う場合はWorkers quotaの影響を受ける

Reference:

- [Pages limits](https://developers.cloudflare.com/pages/platform/limits/)
- [Pages Functions pricing](https://developers.cloudflare.com/pages/functions/pricing/)

### 4.4 Free Planで特に重要な制約

1. Workers 100,000 requests/day
2. Workers 10 ms CPU/request
3. D1 100,000 rows written/day
4. D1 50 queries/Worker invocation
5. D1 100 bound parameters/query
6. Worker bundle / startup制約
7. 同一D1のthroughput共有

Free quota節約を理由に、Current Product Behaviorを複雑なOverlayへ作り替えない。

---

## 5. D1 Query / Statement Budget Policy

### 5.1 N+1を禁止する

Backend Repositoryでは、itemごとのSELECTループを避け、set-based query / bulk fetchを使う。

### 5.2 Unbounded D1 fan-outを禁止する

```text
Promise.all(100 D1 queries)
```

のようなfan-outを許可しない。

set-based query / bounded sequenceを優先する。

### 5.3 Query CountをTestする

最低対象:

- Sandbox create(default)
- Sandbox reset(default)
- Product list / facet
- Product detail
- Home Catalog
- Product Review List
- Cart detail
- Cart merge
- Cart price change acceptance
- Checkout confirmation
- Order creation
- Payment finalize
- Review eligibility
- Admin overview
- Admin product detail
- Admin order detail
- Review summary

**50-query GateはRepositoryやBusiness Handlerだけではなく、1 HTTP Worker invocation全体で計測する。**

```text
HTTP invocation start
  ↓
Sandbox Token digest lookup
  ↓
User Session Token lookup / actor resolution（必要な場合）
  ↓
Authorization / active-account guard
  ↓
Business Operation
  ↓
Response
```

Middleware / Identity解決 / Business queryを合算したTOTALを正本とする。

DoD:

- 1 invocation全体で50 D1 queryを超えない
- 正常系が上限ぎりぎりにならない
- N+1をPerformance smellとしてCI / Reviewで検知する
- Query Budget instrumentationがMiddlewareを除外しない

### 5.4 Seed / Resetは1 row = 1 statementにしない

Seed Adapterは、D1のparameter / statement上限を守りながら、以下のいずれかまたは組み合わせを使う。

- bounded multi-row INSERT
- set-based INSERT
- prepared statementsをまとめたbounded batch
- DB側templateからの`INSERT ... SELECT`相当

方式はWave A2で実Datasetを使って決定する。

---

## 6. Scenario Classification / Exposure Policy

Current Scenarioの**semantics parity**とPublic Free提供範囲を分離する。

### 6.1 3分類する

```text
A. Backend-portable
   Backend/D1へ移行してもScenarioの意味を維持できる

B. Platform-specific
   Browser IndexedDB / Native SQLite / UI runtime等に固有

C. Public-safe Backend Scenario
   AのうちPublic Free環境で公開可能
```

Traceability MatrixへScenario classificationも記録する。

### 6.2 Local Backend

Local Wrangler / local D1では、Backend-portable Current Scenarioを再現する。

Current Web / Native platform-specific Scenarioは、それぞれ既存platform側で維持する。

### 6.3 Platform-specific Scenario

`storage-write-failure`はClient Storage書込失敗を確認するScenarioであり、Backend D1 write failureと同義ではない。

同じScenario IDをD1故障へ読み替えない。

Backend-specific faultが必要なら別Capabilityとして追加する。

### 6.4 Public Scenario Eligibility

Public Free環境では**Public Scenario Allowlist**だけを作成 / Reset可能にする。

Public Scenarioは次の条件をすべて満たすこと。

```text
Backend-portable
AND public learning valueあり
AND Createがsingle atomic D1 boundary内に収まる
AND Resetがsingle atomic D1 boundary内に収まる
AND <= 50 D1 queries / invocation
AND <= 100 bound parameters / query
AND actual rows_writtenがFree quotaに対して合理的
AND Abuse surfaceを不必要に増やさない
```

**Public Create / Resetではmulti-stage half-seed protocolを採用しない。**

Public Scenarioがsingle atomic boundaryへ収まらない場合、そのScenarioはLocal-onlyとする。

### 6.5 `many-products`は初期Public提供しない

Current `many-products`はHeavy ScenarioであるためPublic対象外とする。

```text
Local Backend
many-products = Backend-portableならsupported

Public Backend
many-products = rejected / unsupported
```

Public APIで要求された場合:

```text
422 SCENARIO_NOT_AVAILABLE_PUBLICLY
```

### 6.6 Scenario Metadata

最低限以下を取得可能にする。

```text
scenario id
classification
supported on backend local
supported publicly
seed version
purpose
initial actor
```

README / API Guide / Web Guideでも、

```text
Public available
Local backend only
Platform-specific
```

を見分けられるようにする。

---

## 7. Public QA Sandbox Model

Public Test Targetでは全利用者で1つのmutable datasetを共有しない。

各利用者 / Browser / automation runへEphemeral Sandboxを発行する。

### 7.1 Business DataはSandbox Scoped

Current Product Behaviorへ影響するBusiness Dataを原則Sandbox単位で持つ。

```text
Sandbox Owned
- categories
- brands
- products
- variants
- product_images
- review_summaries
- users
- sessions
- addresses
- inventory histories
- carts / cart items
- checkout sessions
- orders / order items / histories
- sequences
- payments
- shipments
- reviews / review histories
- test controls
- business idempotency records
```

Operational:

- Sandbox Create idempotency records
- cleanup / tombstone metadata

Globalでよいもの:

- static image asset manifest
- build metadata
- supported seed definitions
- API schema / OpenAPI

Global Catalog Overlayは初期採用しない。

### 7.2 Sandbox Creation Contract

Public Sandbox Createはresponse loss後も重複Sandboxを作らずrecoverできるよう、`Idempotency-Key`を必須にする。

```http
POST /v1/test/sandboxes
Content-Type: application/json
Idempotency-Key: create_xxx

{
  "scenario": "default"
}
```

`scenario`省略時は`default`。

Response例:

```json
{
  "sandboxId": "sbx_xxx",
  "sandboxToken": "sbxt_xxx",
  "expiresAt": "2026-08-16T07:00:00Z",
  "seedVersion": 12,
  "scenario": "default",
  "initialAuth": {
    "kind": "guest"
  }
}
```

User初期Sessionを持つScenario例:

```json
{
  "sandboxId": "sbx_xxx",
  "sandboxToken": "sbxt_xxx",
  "expiresAt": "2026-08-16T07:00:00Z",
  "seedVersion": 12,
  "scenario": "gold-member",
  "initialAuth": {
    "kind": "user",
    "sessionToken": "ses_xxx",
    "userId": "user-customer-gold"
  }
}
```

Contract:

- Default TTL: 24 hours
- `sandboxToken`のRaw値はToken発行 / recovery responseでのみ返す
- User `sessionToken`もCreate / Reset / recovery時のToken発行responseでのみRaw値を返す
- DBにはToken plaintextを保存せずdigestを保存
- Token digest contractはSection 9.2を正本とする
- ID / token生成はWeb Cryptoを使う
- Public Scenario Createはsingle atomic boundaryで完了する
- Responseを返せない中間状態をPublic active Sandboxとして残さない
- Create Idempotency RecordにはRaw Tokenを保存しない
- Create Idempotency Recordは最低限`operation_id`, `idempotency_key`, `payload_hash`, `sandbox_id`, status / timestampsを持ち、Sandbox Createと同じatomic boundaryで関連付ける
- same key + same normalized payloadはduplicate Sandboxを作らない
- same key + different payloadは`409 IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD`
- missing keyは`400 IDEMPOTENCY_KEY_REQUIRED`

#### 7.2.1 Create Response Loss Recovery

Sandbox Createがcommit済みなのにresponseだけ失われた場合、Clientは**同じ`Idempotency-Key`と同じpayload**で再試行する。

Retry時に既存active Sandboxへ紐づくCreate Idempotency Recordが見つかった場合:

```text
existing sandboxを再利用
↓
fresh Sandbox Tokenを生成
↓
existing sandbox_token_digestをatomicにrotate
↓
initial user scenarioならfresh User Session Tokenも生成し、initial session digestをrotate
↓
旧digestをinvalidate
↓
same sandboxId + fresh Raw Tokenをresponseで返す
```

これによりRaw TokenをDBへ保存せず、到達不能なactive Sandboxやduplicate Sandboxを残さない。

- recovery responseで返すRaw Tokenもresponse時だけ存在させる
- Token rotateはSandbox business datasetを再seedしない
- idempotency recordが指すSandboxがexpired / hard-deletedの場合は新Sandboxを暗黙生成せず、`409 IDEMPOTENCY_RESULT_EXPIRED`等のstable errorを返し、新しいCreate keyでの明示再作成を要求する
- Create Idempotency Recordのretentionは少なくとも対応Sandboxのactive TTLをcoverする

必須Test:

```text
POST create with key K
-> DB commit
-> responseを意図的に破棄
-> same K + same payloadでretry
-> Sandboxは1件のみ
-> same sandboxId
-> fresh sandboxTokenを取得可能
-> fresh tokenだけが有効
-> initial user scenarioではfresh sessionTokenも取得可能
```

### 7.3 Scenario Initial Auth Semantics

Current Scenarioの`initialSession`をBackendでもsemantics parityとして維持する。

Seed Definitionに固定Raw Tokenを持たせない。

```text
Scenario Dataset
  -> initial actorを指定
  -> Workerがfresh Session Tokenを生成
  -> D1へdigestのみ保存
  -> Raw TokenをCreate/Reset responseのinitialAuthで1回だけ返す
```

Guest Scenario:

```text
initialAuth.kind = guest
```

Customer / Operator / Admin / Suspended / Withdrawn等のSession Scenario:

```text
initialAuth.kind = user
fresh Raw Session Tokenを返す
```

Suspended / Withdrawn userのValid Session自体は復元できるが、active accountを要求するBusiness OperationはCurrent Behaviorどおり拒否する。

### 7.4 Browser Sandbox Bootstrap

```text
Browser start
  ↓
Stored valid sandbox exists?
  ├─ Yes -> reuse
  └─ No  -> pending Create Idempotency-Keyあり?
             ├─ Yes -> same keyでCreate retry
             └─ No  -> new Create Idempotency-Keyを生成・保存してPOST /v1/test/sandboxes
                       ↓
                     success response
                       ↓
                     store sandboxId/token/expiry
                     apply initialAuth
                     clear pending Create key
```

必須:

- Reloadだけで新規Sandboxを作らない
- TTL内Sandboxを再利用する
- expiredなら新規作成する
- Create requestの結果がambiguousな間はpending Create Idempotency-Keyを保持し、別keyで重複Createしない
- logoutでSandbox自体を破棄しない
- **Backend identity / Backend persistenceに関するBrowser Storage**にはSandbox TokenとUser Session Tokenを保存する
- response-loss recovery用のpending Idempotency-Key / request metadataはnon-secret control metadataとして保存してよい
- one-time notice、UI preference等のPresentation固有Storageまで禁止・削除する意味ではない

### 7.5 Sandbox Context Transport

Guest request:

```http
X-Sandbox-Token: sbxt_xxx
```

Logged-in request:

```http
X-Sandbox-Token: sbxt_xxx
Authorization: Bearer ses_xxx
```

Session record自身も`sandbox_id`を持つ。

Logged-in requestでは必ず、

```text
Sandbox Token sandbox_id == Session sandbox_id
```

を検証する。

### 7.6 Guest Identity

1 SandboxにつきdeterministicなGuest Identityを1つ持つ設計を初期標準とする。

Guest CartはSandbox Contextに紐づく。

Login / Signup成功時はCurrent BRどおりGuest CartをCustomer Cartへmergeする。

複数Guest Actorを1 Sandbox内で同時管理するCapabilityは初期Non-goalとする。

Guest CheckoutはPhase 3 Current parityへ追加しない。

### 7.7 Cross-Sandbox Semantics

- Cross-Sandbox Resource: 404
- 同一Sandbox内のPermission不足: 403
- Sandbox expiry済みTombstone保持中: 410 `SANDBOX_EXPIRED`
- 存在しないSandbox: 404
- Sandbox Token不正 / 欠落: 401系Contract

### 7.8 Expiry Tombstone

```text
active
  ↓ TTL expiry
expired tombstone
  - business child data delete
  - minimal sandbox metadataだけ保持
  - APIは410 SANDBOX_EXPIRED
  ↓ tombstone retention expiry
hard delete
  - APIは404
```

Tombstone retentionは短期間かつboundedにする。

### 7.9 Reset Contract

```http
POST /v1/test/sandboxes/{sandboxId}/reset
X-Sandbox-Token: sbxt_xxx
Content-Type: application/json

{
  "scenario": "payment-declined"
}
```

Reset ResponseはSandbox metadataと**fresh `initialAuth`**を返す。

Reset時:

```text
old user sessions invalidate
↓
single atomic dataset replacement
↓
Scenario initial actor用fresh session token digest作成
↓
commit
↓
Raw fresh session tokenをresponseで1回だけ返す
```

Browser `window.__TEST_API__.reset()` thin wrapperはBackend Reset開始前に旧local session tokenを消さない。

```text
resetPending = true
↓
old local session tokenを一時保持
↓
Backend Reset
↓
成功response + initialAuth受領
↓
userならnew session tokenへreplace
Guestならuser session tokenをclear
↓
Current one-time notice storage等をCurrent Behaviorどおりclear
↓
resetPending = false
```

Network errorがBackend commit前に発生した場合は`resetPending`を解除して旧tokenをそのまま利用できる。

Backend commit後にresponseだけ失われた場合は旧User Session TokenはBackend上無効になり得るが、Sandbox Tokenは保持されているためResetを再実行してfresh `initialAuth`を取得する。response deliveryがambiguousな間に旧User Session Tokenを破棄して回復経路を狭めない。

Reset response喪失時はSandbox TokenでResetを再実行し、fresh initialAuthを再発行できること。

必須Test:

- request送信前 / commit前network failure -> old local session token維持
- commit後response loss -> Sandbox Tokenでreset retry -> fresh initialAuth取得
- success response受領後だけold local session tokenをreplace / clear

### 7.10 Cleanup

Cloudflare Cron Triggerを1本使用する。

- active → expired tombstone
- expired tombstone → hard delete
- failed operational record cleanup
- expired Create Idempotency Record cleanup
- 1回の処理件数をbounded
- cleanup failureでAPI全体を止めない
- cleanup rows writtenを計測
- 1 runあたりD1 query count / CPU / processed sandbox countを計測

Public Createがsingle atomicであるため、Public用multi-stage `creating` lifecycleは初期版では不要とする。

Local-onlyの補助処理で一時状態が必要になってもPublic Contractへ露出しない。

---

## 8. Sandbox-scoped Relational Integrity / Read Isolation

### 8.1 Primary Key

Sandbox Owned tableでは原則:

```sql
PRIMARY KEY (sandbox_id, id)
```

固定Seed IDを複数Sandboxで保持できること。

### 8.2 Foreign Key

```sql
FOREIGN KEY (sandbox_id, product_id)
REFERENCES products (sandbox_id, id)
```

DB constraint自体でCross-Sandbox relationを作れないようにする。

### 8.3 UNIQUE / Idempotency Scope

最低候補:

```text
users:       UNIQUE(sandbox_id, normalized_email)
products:    UNIQUE(sandbox_id, product_code)
variants:    UNIQUE(sandbox_id, sku)
business_idempotency:
             UNIQUE(sandbox_id, actor_id, operation_id, idempotency_key)
sandbox_create_idempotency:
             UNIQUE(operation_id, idempotency_key)
```

Business idempotencyの`actor_id`は**NOT NULL**とする。

- Current authenticated Customer/Admin等のBusiness mutationでは`actor_id = user_id`
- 将来Guest/System operationへidempotencyを適用する場合も、nullable `user_id`へ逃がさずdeterministicなnon-null actor scopeを割り当てる
- SQLiteのNULLを含むUNIQUEへdeduplicationを依存させない
- Phase 3ではGuest Checkoutを新設しないため、Guest Order idempotencyをCurrent parity要件にはしない

Sandbox CreateはSandbox生成前のPlatform operationであるため、Business idempotency tableへ無理に押し込まずOperational Create Idempotencyとして分離する。

### 8.4 Index

Read / filterで使うIndexは原則`sandbox_id`をleading scopeに含める。

```text
(sandbox_id, user_id)
(sandbox_id, product_id)
(sandbox_id, status)
(sandbox_id, updated_at)
```

actual query plan / rows readを確認して必要なIndexだけ追加する。

### 8.5 SQL JOINもSandbox Scopeを必須にする

Composite FKはWrite integrityを守るが、Read isolationを自動的に保証しない。

禁止:

```sql
JOIN products p
  ON p.id = v.product_id
WHERE v.sandbox_id = ?
```

必須:

```sql
JOIN products p
  ON p.sandbox_id = v.sandbox_id
 AND p.id = v.product_id
WHERE v.sandbox_id = ?
```

Sandbox-owned table間のJOIN / subquery / EXISTS / aggregateは、logical keyだけでなく`sandbox_id`を同じscopeとして明示する。

Repository Review Checklistへ追加する。

### 8.6 Read Isolation Test

同一Logical IDにSandboxごとで異なる値を持たせるfixtureを用意する。

```text
Sandbox A / product-basic-shirt / name=A
Sandbox B / product-basic-shirt / name=B
```

最低対象:

- Product detail
- Cart
- Checkout
- Order
- Review
- Admin detail

でCross-Sandbox値が混入しないことをIntegration Testする。

Cross-Sandbox 404 Testだけで完了扱いにしない。

### 8.7 Index costもFree quotaへ含める

PK / UNIQUE / Index更新によるwrite amplificationを含め、**final schema + final index構成でD1が返す実`rows_written` metadata**をFree Quota Gateの正本とする。

対象:

- Sandbox create
- Reset
- Business mutation
- expiry cleanup
- tombstone hard delete
- Create Idempotency record cleanup

---

## 9. Authentication / Authorization

### 9.1 Tokenを分離する

#### Sandbox Token

用途:

- Sandbox Business API scope
- reset
- failure injection
- test clock
- inspection
- sandbox delete

#### User Session Token

用途:

- Customer / Operator / Admin API

いずれもDBにはdigestのみ保存する。

### 9.2 Capability Token Generation / Digest Contract

Sandbox Token / User Session Tokenは、人間が覚えるPasswordとは性質が異なるため、PasswordHasher / PBKDF2へ流さない。

初期標準:

```text
Password
  -> Current PBKDF2
  -> slow password KDF

Sandbox Token / User Session Token
  -> cryptographically secure random >= 256 bits
  -> token prefixを付けてexternal representation化
  -> SHA-256 digest
  -> D1にはdigestだけ保存
```

実装Contract:

- random byte生成はWeb Cryptoの暗号学的乱数を使う
- digestはWeb Crypto `SHA-256`相当のfast digestを使う
- Sandbox/User TokenにPassword用PBKDF2を使用しない
- Raw TokenをDBへ保存しない
- Raw Tokenをstructured log / error / tracingへ出さない
- Token digestをAPI responseへ返さない
- Raw Sandbox TokenはSandbox Create / response-loss recovery等のToken発行response時だけ返す
- Raw User Session TokenはLogin / Signup / Scenario Create / Reset / recovery等、Token発行Operationのresponse時だけ返す
- Token rotate時は旧digestをinvalidateする
- Token prefix自体を認証Secretとはみなさず、十分なrandom部分を必須にする

理由はFree CPU最適化だけではない。Passwordは低entropy入力へのoffline guessing耐性が必要だが、Server生成Capability Tokenは十分なentropyを持たせ、fast digestによるlookupを行う。

HMAC等の追加Secret管理はPhase 3初期版では導入せず、必要性が実証された場合に別Decisionとする。

### 9.3 Login / Signup

```text
POST /v1/auth/signup
POST /v1/auth/login
POST /v1/auth/logout
GET  /v1/me
```

Current Behavior:

- invalid credential
- suspended / withdrawn login拒否
- logout / revoked session
- role boundary
- Signup validation
- Login / Signup時Guest Cart merge

### 9.4 Session Lifetime

Current Session entity / Authentication Specには独立したSession TTLが定義されていないため、Phase 3初期版では**Session expiryをCurrent parityとして追加しない**。

User Sessionは最低限次で無効化される。

```text
logout
account status / role mutationでCurrent Behavior上無効化される場合
sandbox reset
sandbox expiry
sandbox delete
sandbox create recoveryでinitial session tokenをrotateした場合
```

独立User Session TTLは別Decisionとする。

### 9.5 Password Hash Hard Decision Gate

Current PBKDF2の強度を勝手に変更しない。

LocalだけでFree CPU Gateの合否を断定しない。

Implementation Gate:

```text
1. Local workerd
   - functional PBKDF2 test
   - CPU profile

2. Cloudflare observable temporary deployment
   - dedicated temporary Worker / temporary environmentへ実deploy
   - Observability / Workers Logsを有効化
   - representative login/signup requestを複数回実行
   - invocation CPU time / outcomeを取得
   - outcome != exceededCpu
   - representative CPU usageがFree 10ms limitへ継続的に収まることを確認
   - Gate終了後にtemporary Workerを削除
```

**Workers Logsを取得できないVersioned Preview URL等をPBKDF2 CPU Gateの正本にしない。**

Preview URL / temporary versionは、当時の仕様で可能な範囲のupload / startup / runtime compatibility確認には使ってよい。

PBKDF2 CPU Gateの合否は、CPU/outcomeを実際に観測できるCloudflare deployed runtimeを正本とする。

Production D1をPBKDF2 Gateのために触る必要はない。専用の最小fixture / temporary bindingで成立させる。

FAIL時:

```text
実装停止
↓
Plan / Architecture Decisionを再実施
```

禁止:

- iterationを黙って下げる
- plain SHA hashへ置換
- plaintext保存
- 「教材だから」でsecurity propertyを無断で弱める

### 9.6 Cookieを初期採用しない

Bearer Token方式とする。

CSRF学習は別Phase。

---

## 10. Current Spec → Backend API Capability Mapping

### 10.1 Parity Inventory Source

実装開始時に次をすべて棚卸しする。

```text
docs/spec/** Normative BR / AC
src/application/create-application-services.ts
各Application Use Caseのpublic method
Current transactionRunner.run(...) call sites
Web route / pageから実際に利用しているApplication capability
Current Test Control
Current Scenario metadata / semantics
```

`docs/spec`だけでAPI棚卸しを終えない。

### 10.2 Platform

```text
GET /v1/health
GET /v1/version
GET /v1/openapi.json
GET /v1/scenarios
```

### 10.3 Sandbox / Test Control

```text
POST   /v1/test/sandboxes
POST   /v1/test/sandboxes/:sandboxId/reset
DELETE /v1/test/sandboxes/:sandboxId
GET    /v1/test/sandboxes/:sandboxId/metadata
PUT    /v1/test/sandboxes/:sandboxId/clock
PUT    /v1/test/sandboxes/:sandboxId/faults/payment
GET    /v1/test/sandboxes/:sandboxId/inspect/orders/:orderId
GET    /v1/test/sandboxes/:sandboxId/inspect/variants/:variantId
GET    /v1/test/sandboxes/:sandboxId/inspect/review-summaries/:productId
```

### 10.4 Test Control Parity

Current Test APIの最低Capabilityを維持する。

```text
reset
setClock
setPaymentDelay
getMetadata
inspectOrder
inspectVariant
inspectReviewSummary
```

`setPaymentDelay(milliseconds)`は`faults/payment` ContractのCurrent-parity subsetとして表現する。

Public Test ControlではFree環境の共有資源を守るため、初期上限を次で固定する。

```text
PUBLIC_MAX_PAYMENT_DELAY_MS = 5000
0 <= paymentDelayMs <= 5000
```

- Publicで`5000`を超える値は`422 PAYMENT_DELAY_OUT_OF_RANGE`
- `payment.slow` presetもPublicではこの上限以内のdelayだけを使用する
- 5秒を超える長時間delay教材はLocal-only
- Public上限はImplementation開始時にFree環境実測で再確認できるが、無制限へ緩和しない
- Payment DelayをDB transaction内に保持しない

Metadata最低項目:

```text
appVersion
schemaVersion
seedVersion
buildSha
scenario
scenarioMetadata
clock
paymentDelayMs
classification / public exposure
```

Backend追加の500/503等Faultは`PHASE3_QA_EXTENSION`とする。

### 10.5 Authentication / Account

最低:

```text
POST   /v1/auth/signup
POST   /v1/auth/login
POST   /v1/auth/logout
GET    /v1/me
PATCH  /v1/me/profile
GET    /v1/me/addresses
POST   /v1/me/addresses
PATCH  /v1/me/addresses/:addressId
DELETE /v1/me/addresses/:addressId
GET    /v1/address-suggestions?postalCode=...
```

### 10.6 Storefront / Catalog

```text
GET /v1/home
GET /v1/categories
GET /v1/brands
GET /v1/products
GET /v1/products/:productId
GET /v1/products/:productId/reviews
GET /v1/search/suggestions
```

### 10.7 Cart

```text
GET    /v1/cart
POST   /v1/cart/items
PATCH  /v1/cart/items/:itemId
DELETE /v1/cart/items/:itemId
POST   /v1/cart/price-changes/accept
```

Currentに存在しないCart全削除APIは初期追加しない。

### 10.8 Checkout / Payment

```text
POST /v1/checkout/sessions
GET  /v1/checkout/sessions/active
PUT  /v1/checkout/sessions/:checkoutSessionId/address
PUT  /v1/checkout/sessions/:checkoutSessionId/payment
GET  /v1/checkout/sessions/:checkoutSessionId/confirmation
POST /v1/checkout/sessions/:checkoutSessionId/orders
POST /v1/orders/:orderId/payment/resume
POST /v1/orders/:orderId/payment/retry
```

Current Checkoutをsingle endpointへ単純化しない。

#### 10.8.1 Checkout Write Request Contract

重複submit / response lossでOrderやPayment Attemptを重複させないため、以下をOpenAPI request contractとして固定する。

| Operation | `checkoutActionVersion` | `Idempotency-Key` | Duplicate semantics |
|---|---|---|---|
| `POST /v1/checkout/sessions/:checkoutSessionId/orders` | **required** in request body | **required** | same key + same payloadは同一Order結果を返す |
| `POST /v1/orders/:orderId/payment/resume` | Current parityで要求されない限り追加しない | **required** | same key + same payloadで同じresume実行を再利用 |
| `POST /v1/orders/:orderId/payment/retry` | Current parityで要求されない限り追加しない | **required** | same keyでは同一retry Payment Attemptを再利用。新しいretry actionは新しいkeyを要求 |

Common Contract:

- Business idempotency scopeは`(sandbox_id, actor_id, operation_id, idempotency_key)`
- `actor_id`はnon-null
- same key + same normalized payload -> stored / existing operation resultを返す
- same key + different payload -> `409 IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD`
- required key欠落 -> `400 IDEMPOTENCY_KEY_REQUIRED`
- `checkoutActionVersion` mismatch / stale action -> Current semanticsに合わせたstable 409系errorへ固定する
- duplicate submitでOrderを新規作成しない
- retry endpointでsame keyを再送しても新しいPayment Attemptを追加しない

Mock Payment Gatewayもduplicate HTTP deliveryで副作用を二重実行しない。

初期標準:

```text
idempotency operation record / payment attemptを確定
  ↓
Mock Payment GatewayへpaymentAttemptId + operation idempotency identityを渡す
  ↓
同一Payment Attemptのgateway side effectはat-most-once相当で扱う
  ↓
finalize result
```

契約テストでは、same key + same payloadのduplicate submit / resume / retryでMock Payment Gateway invocation countが増えないことを確認する。

### 10.9 Customer Orders

```text
GET /v1/orders
GET /v1/orders/:orderId
```

Order Snapshot、Payment、Shipment、TimelineをCurrent Specどおり返す。

### 10.10 Customer Reviews

```text
GET    /v1/order-items/:orderItemId/review-eligibility
POST   /v1/reviews
PATCH  /v1/reviews/:reviewId
DELETE /v1/reviews/:reviewId
```

Customer自身のReview取得で追加Endpointが必要とParity Inventoryで判明した場合だけ追加する。

### 10.11 Admin Overview

```text
GET /v1/admin/overview
```

### 10.12 Admin Catalog

Current Capability:

- Category search/create/update/active/reorder
- Brand search/create/update/active
- Product search/detail/create/update
- Product preview
- Product status
- Draft delete
- Duplicate source
- Bulk status UI orchestration
- Image asset search

### 10.13 Admin Inventory

- search / filter / sort
- detail / history
- manual adjustment with expected version

### 10.14 Admin Orders

- search / detail
- paid -> preparing
- preparing -> shipped
- shipped -> delivered

### 10.15 Admin Reviews

- search / detail
- published / hidden transition
- bulk visibility UI orchestration

### 10.16 Admin Users

- search / detail
- Customer rank
- Operator/Admin role
- active/suspended
- last admin protection
- self-destructive change protection
- withdrawn mutation rejection
- Session / Checkout invalidation effect

### 10.17 Bulk Operation Transport Policy

Current Product / Review Bulk操作は最大50件とpartial failure semanticsを持つ。

D1 Freeの50 query/invocationへ50 targetsを1 Worker invocationで押し込まない。

初期標準:

```text
Admin UI
  ↓ selected targets <= 50
API Client orchestration
  ↓
independent single-target HTTP mutations
  ↓
results aggregate
```

例:

```text
PATCH product A status
PATCH product B status
PATCH product C status
...
```

Reviewも同様。

各単一mutationはBackend側でBusiness Rule / transactionを保証する。

Bulk全体を1 DB transactionにしない。

Current partial-success semanticsを維持する。

Web側はunbounded concurrencyにせず、bounded concurrency / sequenceで実行する。

### 10.18 API Parity Gate

Traceability Matrix:

```text
Feature
Classification
Current BR / AC
Current Application Capability
Current Web Usage
API Operation ID
HTTP Method / Path
Backend Service / Command
Integration Test
```

Missing `CURRENT_PARITY` Operationがある状態でPR Aを完了扱いにしない。

---

## 11. HTTP Contract

### 11.1 Status Code

最低:

- 200
- 201
- 204
- 400
- 401
- 403
- 404
- 409
- 410
- 422
- 429
- 500
- 503

Operation単位にOpenAPIで固定する。

### 11.2 Error Envelope

Application Error Envelopeでは`retryable`をmachine-readable fieldとして固定する。

```json
{
  "error": {
    "code": "INVENTORY_CONFLICT",
    "message": "Requested quantity is not available.",
    "requestId": "req_xxx",
    "retryable": false,
    "details": {}
  }
}
```

Stable error codeと`retryable`をAutomation Contractとする。

`retryable=true`は「payloadやIdempotency-Keyを変えてblind retryしてよい」という意味ではない。Operation contractに従って同じlogical requestを安全に再送可能であることを示す補助情報とする。

### 11.3 Platform Error

Cloudflare Platform自身が返すquota / hosting errorはApplication Error Envelopeと分離してDocument化する。

### 11.4 D1 Transient Error Mapping / Retry

例:

```json
{
  "error": {
    "code": "DATABASE_TEMPORARILY_UNAVAILABLE",
    "message": "Database is temporarily unavailable.",
    "requestId": "req_xxx",
    "retryable": true,
    "details": {}
  }
}
```

HTTP statusは503。

方針:

- read-only queryでplatform/runtimeが安全にretryする範囲は許容
- write mutationをApplication側でblind retryしない
- Idempotency contractを持つwrite mutationは**same payload + same `Idempotency-Key`**でのみretryする
- Idempotency contractを持たないwriteで結果がambiguousな場合、`retryable=true`を安易に返さない
- Clientは`retryable`だけでなくOperation-specific contractも確認する

### 11.5 Request ID

全Requestへ**Server側でCanonical Request ID**を付与する。

初期Header名:

```http
X-Request-Id: req_xxx
```

- Response header
- Error JSON
- structured log

で同じ値を追跡できるようにする。

ClientからCanonical `X-Request-Id`を上書きさせない。

Client correlation ID教材が将来必要なら、`X-Correlation-Id`等を別Contractとして追加する。

### 11.6 OpenAPI

OpenAPI 3.1を公開する。

Runtime schemaとのdriftをCIで防ぐ。

Checkout write request body / required header / idempotency / error envelopeの`retryable`もOpenAPIへ含める。

---

## 12. Checkout / Payment Transaction Model

Backend化によってCurrent Checkout Behaviorを単純化しない。

```text
Transaction A
  Validate session / cart / price
  Create Order(pending_payment)
  Create Payment(processing)
  Create histories
  Convert Checkout Session
  Consume Cart

        ↓

Mock Payment
success / declined / error / slow

        ↓

Transaction B-success
  Revalidate inventory
  Atomic inventory decrement
  Inventory history
  Payment succeeded
  Order paid
  Shipment create/update
  Order history

or

Transaction B-failure
  Payment failed
  Order payment_failed
  Order history
  Inventory unchanged
```

Transaction A / BはD1 atomic boundaryで実装する。

DB transaction中にPayment Delayを入れない。

Mutable stateについてはSection 3.5 / 3.6を適用し、Transaction前のpre-readだけを競合判定の正本にしない。

### 12.1 Inventory Conflict

stock=1へ2 Actorが競合した場合、成功は1件のみ。

最終decrementはconditional updateだけで完了扱いにせず、Section 3.6のGuard failure Contractを満たす。

### 12.2 Order Number Sequence / Timezone

Current Order NumberのBusiness Calendarを維持する。

```text
Persistence timestamp
= ISO-8601 UTC

Order number local date / business calendar
= Asia/Tokyo
```

Cloudflare execution location / runtime timezoneへ依存しない。

Concurrency Test:

```text
same sandbox
same Asia/Tokyo local date
concurrent two orders
→ distinct orderNumber
→ sequence skip/duplicate/inconsistent historyなし
```

### 12.3 Atomic Rollback Tests

最低:

- insufficient inventory
- stale order version
- stale inventory version
- idempotency conflict
- sequence conflict / duplicate order number prevention

でpartial commitがないことを確認する。

---

## 13. Idempotency

### 13.1 Business Mutation Idempotency

最低Contract:

- scope = `sandbox_id + actor_id + operation_id + idempotency_key`
- `actor_id`はNOT NULL
- same scope + key + normalized payload -> same logical result
- same scope + key + different payload -> 409
- concurrent duplicate -> logical mutation 1件
- expiry明示
- Sandbox Reset対象
- DB UNIQUEでもSandbox / actor / operation scopeを保証する

Current Order creation / payment resume / payment retryはSection 10.8.1のOperation-specific contractを正本とする。

Phase 3ではGuest Checkoutを追加しない。将来Guest/Systemのidempotent Business Mutationを追加する場合はnullable `user_id`ではなくnon-null actor scopeを付与する。

### 13.2 Platform Create Idempotency

Sandbox CreateはSandbox生成前のPlatform operationなのでBusiness Mutation Idempotencyと分離する。

- scope = `operation_id + idempotency_key`
- payload hashを保存
- same key + same payload -> existing Sandboxをrecover
- same key + different payload -> 409
- Raw Tokenは保存しない
- response loss recoveryはSection 7.2.1のToken rotate contractを使う

---

## 14. Deterministic Failure Injection

初期:

```text
payment.success
payment.declined
payment.error-500
payment.unavailable-503
payment.slow
```

Current `setPaymentDelay(milliseconds)`を維持する。

PublicではSection 10.4の`PUBLIC_MAX_PAYMENT_DELAY_MS = 5000`を強制する。

- 5秒超は422
- 長時間delayはLocal-only
- Public `payment.slow`も5秒以内
- Client timeout / abort後もDB transactionが開いたままにならない
- allowed delay中にClientがtimeout / abortした場合のOrder / Payment stateをinspectでき、Current resume/retry flowで回復可能であることをTestする

必要ならdeterministic 429を実Rate Limiterと分離して追加できる。

任意SQL / arbitrary status / arbitrary sleep / arbitrary crashは提供しない。

---

## 15. Test Clock

Sandbox単位のlogical clockを持つ。

Business Logicは直接`Date.now()`へ依存しない。

```text
Business logical clock
= sandbox test clock

Persistence/system timestamp where required
= UTC

Business calendar / order number date
= Asia/Tokyo

Sandbox TTL / tombstone / cleanup
= real time
```

---

## 16. Web Migration Strategy

PR BでWebをAPI-backedへ移行する。

### 16.1 Authority

Backend移行後、WebではServerをauthoritativeとする。

- auth
- account
- address
- catalog
- cart
- checkout
- payment
- order
- inventory
- review
- admin全般

Browser側でServer transactionを再実装しない。

### 16.2 Client Boundary

```text
Presentation
 -> Backend API Client
 -> HTTP
 -> Worker
 -> D1
```

### 16.3 Dexie

Web Backend移行完了後、DexieをProduction persistenceとして残さない。

Platform-specific Dexie failure教材が必要な場合はlocal/test-only adapterとしてCurrent semanticsを維持する。

### 16.4 `window.__TEST_API__`

残す場合はBackend Test Controlのthin wrapperへ変更する。

ResetではSection 7.9の`resetPending` / `initialAuth` contractに従い、成功response受領前に旧local User Session Tokenを消さない。

Production Web UIへ新規Test APIを露出しない。

### 16.5 Native

Phase 3ではNative SQLiteを維持する。

---

## 17. API Base URL / CORS

### 17.1 API Base URL

```text
EXPO_PUBLIC_API_BASE_URL
```

Environment:

```text
local      -> local Worker URL
preview    -> production Worker URL（PR B initial strategy）
production -> production Worker URL
```

API URLをPresentationへ直書きしない。

### 17.2 CORS

初期Public APIはCookie credentialを使わないため、原則:

```http
Access-Control-Allow-Origin: *
```

許可対象Request Header:

- Content-Type
- Authorization
- X-Sandbox-Token
- Idempotency-Key

Canonical `X-Request-Id`はServer生成のResponse Headerであり、初期版ではClientからの上書きを許可しない。

Browser JSからRequest IDをEvidenceとして読めるよう、Responseには最低次を付与する。

```http
Access-Control-Expose-Headers: X-Request-Id
```

### 17.3 Preflight Contract

```text
OPTIONS /v1/*
```

で最低限:

```http
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: ...
Access-Control-Allow-Headers: Content-Type, Authorization, X-Sandbox-Token, Idempotency-Key
Access-Control-Expose-Headers: X-Request-Id
```

CORS middlewareは正常responseだけでなくApplication error responseにも適用する。

最低検証:

```text
OPTIONS preflight -> allowed
actual request -> success
Browser JavaScript -> X-Request-Idを読める
401/403/404/409/422/500/503 -> CORS headerあり
```

CORSをSecurity Boundaryとはみなさない。

---

## 18. Local Development

Docker必須化しない。

基本Flow:

```text
pnpm install
pnpm backend:migrate:local
pnpm backend:seed:local
pnpm backend:dev
pnpm web
```

Fresh cloneからREADMEだけでAPIを起動できることをDoDにする。

Wranglerはpackage.json / lockfileでpinする。

Rate Limiting Bindingを使う場合、Implementation時点のCloudflare最低要件を満たすこと。2026-08-15時点ではWrangler 4.36.0以上が必要である。

---

## 19. Repository Structure

大規模Monorepo化しない。

```text
app/
src/
backend/
  src/
    index.ts
    app.ts
    env.ts
    context/
    middleware/
    routes/
    application/
    repositories/
    commands/
    services/
    test-control/
    contracts/
  migrations/
  tests/
  wrangler.jsonc

docs/
  api/
  plans/
```

BackendからPresentation / browser-specific / native-specific adapterへ依存しない。

---

## 20. D1 Schema / Ownership / Migration Policy

### 20.1 Table Ownership Matrix

全tableを、

- Global Static
- Sandbox Owned
- Operational

へ分類し、未分類を許可しない。

Create Idempotency RecordはOperationalへ分類する。

### 20.2 Constraint

- FK
- UNIQUE
- NOT NULL
- CHECK
- optimistic version

を可能な範囲でDBでも保証する。

Idempotency actor scopeのNOT NULLもDB constraintで保証する。

### 20.3 Migration

Wrangler D1 migrationをGit管理する。

Dashboard手作業だけでProduction Schemaを変えない。

### 20.4 Expand / Contract

```text
Expand migration
  ↓
Worker deploy
  ↓
Stabilize
  ↓
Later Contract migration
```

Worker rollbackとD1 rollbackを同一視しない。

### 20.5 Seed SSOT

Current `src/seeds/**`とのparityを維持し、Backend用Seed SSOTを別手書きしない。

Platform-specific ScenarioをBackendへ意味変更して複製しない。

---

## 21. Abuse Protection / Free Plan Protection

### 21.1 Worker Rate Limiting

Rate LimitingはAbuse mitigationとして使うが、Workers日次request quota自体を完全防御するものと誤認しない。

Free Quota Measurement後、少なくとも次を別bucketとして検討する。

```text
Sandbox Create
Sandbox Reset
Auth
Business Mutation
Read
```

特にCreate / Resetは通常Readより厳しくする。

### 21.2 Bounded Payload / Delay

- body size
- string length
- array length
- pagination
- bulk size
- idempotency key length / format
- Public payment delay <= 5000 ms

を制限する。

### 21.3 Active Sandbox Ceiling

Hard ceiling到達時は新規Sandbox作成を503等で拒否し、既存Sandbox利用を優先する。

### 21.4 Public Free Availability

best-effort availabilityとする。

### 21.5 Shared D1 Throughput Boundary

Sandbox Isolationはdata isolationでありthroughput isolationではない。

初期Phaseでsharding / Durable Objects等を導入しない。

### 21.6 Public禁止事項

- Load
- Stress
- Soak
- DoS-like
- aggressive fuzzing
- destructive security test
- Public delay上限を回避する長時間request保持

はLocalだけで実施する。

### 21.7 Synthetic Test Data Only

Public Sandboxへ実データ / 秘密情報を投入しないようREADME / API Guideへ明示する。

禁止例:

- 実名
- 実住所
- 実電話番号
- 実メールアドレス
- 他サービスで再利用しているPassword
- API key
- access token
- secret

Sandbox hard deleteを「あらゆるbackup / recovery historyから即時物理消去」と説明しない。

Cloudflare D1 Time Travel等のPlatform recovery機能があるため、**Synthetic Test Data Only**をPublic利用前提とする。

---

## 22. Observability

### 22.1 Server側

最低:

- structured log
- request ID
- operation ID
- status
- latency
- error code
- retryable flag where applicable
- D1 query count（dev/test）
- D1 rows read / rows written（measurement path）

Raw Token / token digest / password / password hash / Authorization header / X-Sandbox-Tokenをlogしない。

Create Idempotency-Key等もそのままlogせず、必要ならhash / truncated fingerprint等のnon-secret correlation表現を使う。

### 22.2 Public Learner

Public教材では、

- request ID
- error response
- reproducible Sandbox Scenario

をEvidenceとして扱う。

### 22.3 Local Learner

Local WranglerではStructured Log / D1 failureを含むinvestigationを教材化できる。

### 22.4 Remote Runtime Gate Observability

PBKDF2 CPU Gateの正本は、**Workers Logs / invocation metricsを取得可能なtemporary deployed Worker / temporary environment**とする。

最低確認:

- representative login/signup invocation
- CPU time
- outcome
- `exceededCpu`相当の失敗有無
- actual Worker startup成功

Workers Logsを取得できないPreview URL / versionだけをCPU Gateの正本にしない。

Preview URL等は、upload / startup / runtime compatibilityの補助確認としてのみ利用してよい。

Tail Worker等のPaid-only機能を必須化しない。

---

## 23. Environment Strategy

### 23.1 Local

```text
Expo local
Worker local
D1 local
```

Required Testの主対象。

### 23.2 Remote Compatibility Gate

PR A Wave A1で最小限のCloudflare実Runtime検証を行う。

目的:

- PBKDF2 CPU Gate
- actual Worker upload/startup
- compressed bundle
- Cloudflare Runtime固有差分

PBKDF2 CPU Gateでは、Observability / Workers Logsを取得可能な**dedicated temporary deployed Worker / temporary environment**を使う。

```text
temporary Worker deploy
  ↓
observability enabled
  ↓
representative signup/login
  ↓
CPU time / outcome確認
  ↓
Gate結果記録
  ↓
temporary Worker削除
```

Workers Logsを取得できないVersioned Preview URLをCPU Gateの正本にはしない。

本格的なPR D1 Preview環境を初期導入する必要はない。

### 23.3 Production

```text
Pages production
Worker production
D1 production
```

Public Test Target。

### 23.4 PR A

WebはまだDexie。

Backend機能TestはLocal Worker / Local D1を主とし、Wave A1/A10でRemote Compatibility Gateを追加する。

PR A merge後、Production Backend APIを先に公開する。

### 23.5 PR B Preview

Pages PreviewからProduction WorkerへFresh Sandboxを作って接続する。

PR BでBackend breaking changeを同時に入れない。

### 23.6 Future Backend Preview

必要になった場合だけWorkers Versioned Preview URL + Preview D1等を個別Planで判断する。

---

## 24. CI / CD

### 24.1 PR A Required CI / Gates

1. Backend lint / typecheck
2. Wrangler config validation
3. Worker bundle dry-run / compressed size validation
4. fresh local D1 migration
5. Scenario classification validation
6. Backend-portable Scenario parity smoke
7. Public Scenario Allowlist validation
8. Public Scenario single-atomic Create/Reset validation
9. Unit
10. Repository Integration
11. API Integration
12. OpenAPI Contract
13. Spec / Application / Web Usage -> API Traceability
14. Transaction Invariant Inventory validation
15. Composite PK / FK / UNIQUE Sandbox isolation test
16. SQL JOIN Read Isolation test
17. Cross-Sandbox 404
18. Authorization
19. Signup / Login / Session invalidation
20. Scenario initialAuth / fresh session token
21. Capability Token random/digest persistence test
22. Sandbox Create response-loss idempotency / token-rotation recovery
23. Reset local-token ordering / response-loss recovery
24. Business idempotency actor NOT NULL constraint
25. Guest Cart merge
26. Home Catalog
27. Product Review List
28. Address Suggestion
29. Cart Price Change Acceptance
30. Review Eligibility
31. Admin Overview
32. Checkout state flow
33. Checkout write OpenAPI request / header contract
34. Duplicate checkout submit returns same Order
35. Duplicate resume/retry does not duplicate Payment Attempt / gateway call
36. Payment success/failure/retry
37. D1 atomic batch rollback
38. Mutable-state guard evaluated inside atomic operation
39. Guard failure rollback
40. Idempotency
41. Inventory conflict
42. Order Number Sequence concurrency
43. Review / Review Summary atomicity
44. User / Session / Checkout invalidation atomicity
45. Admin Catalog / Inventory / Orders / Reviews / Users
46. Bulk independent mutation partial-success semantics
47. Failure Injection / Payment Delay parity
48. Public payment delay <= 5000 ms / over-limit 422
49. Payment timeout / abort recovery
50. Test Clock / Asia-Tokyo business date
51. Error Envelope `retryable` contract
52. CORS preflight / error CORS / exposed Request ID
53. Invocation-total Query budget
54. Sandbox Create / Reset statement budget
55. Final-schema rows read/write budget
56. Cleanup budget measurement
57. PBKDF2 local profile
58. Cloudflare observable temporary deployment PBKDF2 CPU Gate
59. Cloudflare actual Worker upload/startup Gate
60. Existing Web regression
61. Native regression required by current policy

### 24.2 Worker Bundle / Startup Gate

Local/CI:

```text
wrangler deploy --dry-run等
-> compressed bundle size
```

Remote:

```text
temporary deployed Worker / environment
-> actual upload success
-> actual startup success
-> no startup limit failure
```

CPU Gateと同じtemporary deploymentを再利用してよい。

Gate終了後はtemporary Worker / environmentをcleanupする。

### 24.3 PR A Production Deploy

```text
Required CI / Decision Gates PASS
  ↓
D1 Expand Migration
  ↓
Worker deploy
  ↓
API smoke with Public-safe fresh Sandbox
  ↓
API parity smoke
```

### 24.4 PR B Required CI

1. Existing code quality
2. Web API client unit
3. Local Worker + local D1
4. Browser -> Worker -> D1 E2E
5. Cross-role
6. Auth / initialAuth Reset
7. Sandbox Create response-loss recovery through persisted pending key
8. Reset failure / response-loss token handling
9. Home / Catalog / Product Review List
10. Address Suggestion
11. Cart Price Change Acceptance
12. Checkout / Payment
13. Checkout duplicate-submit / idempotency E2E
14. Review Eligibility / Review
15. Admin Overview / Admin E2E
16. Bulk partial-success E2E
17. CORS preflight through Browser origin
18. Browserから`X-Request-Id`参照
19. Accessibility
20. Mobile Web boundary
21. Browser smoke
22. Production-build smoke
23. Native regression
24. Dexie production guard
25. duplicate server business orchestration guard
26. `EXPO_PUBLIC_API_BASE_URL` validation
27. Guide Scenario classification display

### 24.5 PR B Remote Preview

Production BackendのFresh Sandboxを使う。

可能なら終了時deleteし、失敗時はTTL cleanupへ任せる。

---

## 25. Test Strategy

### 25.1 Unit

- validation
- domain policy
- error mapping / retryable semantics
- clock
- timezone/business date
- permission
- idempotency semantics
- Scenario classification
- capability token generation / digest
- payment delay bound

### 25.2 Repository / Command Integration

- CRUD
- composite PK
- sandbox-scoped UNIQUE / FK
- sandbox-aware JOIN
- CHECK
- optimistic version
- atomic batch rollback
- mutable-state guard inside atomic boundary
- guard failure rollback
- query filtering
- conditional inventory
- history atomicity
- sequence uniqueness
- token digest persistence / lookup
- token rotation
- non-null business idempotency actor
- Sandbox Create operational idempotency

### 25.3 API Integration

- request / response schema
- status
- auth
- authorization
- sandbox scope
- CORS / preflight
- exposed Request ID
- error / retryable
- request ID
- state transition
- idempotency
- checkout required headers / bodies
- fault injection
- Public payment delay bound
- transient DB error mapping
- initialAuth
- Raw Token non-leakage
- Create response loss recovery
- Reset response loss recovery

### 25.4 Scenario

BackendではBackend-portable Current Scenarioを対象にする。

Platform-specific Scenarioは既存platform側で維持する。

PublicではAllowlist only。

### 25.5 Public Create / Reset

```text
for every Public Scenario:
create with Idempotency-Key
-> single atomic boundary
-> deterministic state
-> valid initialAuth
-> token digest only persisted
-> Create idempotency record atomically associated
-> <= 50 D1 queries including middleware/runtime identity lookup
-> bind limit PASS

create response loss
-> same key retry
-> duplicate Sandboxなし
-> same sandboxId
-> fresh token rotate/recovery

mutate
reset
-> single atomic boundary
-> old user sessions invalid
-> fresh initialAuth
-> deterministic restore
-> query/bind/write budget PASS

reset pre-commit failure
-> old browser user token retained

reset post-commit response loss
-> Sandbox Token retryでfresh initialAuth回復
```

### 25.6 Expiry

```text
active
-> expiry
-> 410 during tombstone
-> child data unavailable
-> tombstone expiry
-> 404
```

### 25.7 Concurrency / Atomicity

- stock=1 two checkout
- duplicate business idempotency sequential / concurrent
- stale version
- mutable-state predicateをatomic boundary外のpre-readだけで確定しない
- conditional update 0-row時に後続mutationがcommitされない
- two simultaneous order number allocations are unique
- Review / Summary partial commitなし
- User access mutation / Session invalidation partial commitなし

### 25.8 Checkout Idempotency

- Order submit same key + same payload -> same Order
- same key + different payload -> 409
- missing required key -> 400
- same retry key -> same Payment Attempt
- new retry action + new key -> new Payment Attempt
- duplicate submit / resume / retryでMock Payment Gateway callが二重化しない

### 25.9 Bulk

Product / Reviewの最大50件選択を、boundedなindependent HTTP mutationへ分解し、Current partial-success resultを再現する。

### 25.10 Public Delay / Timeout

- `0`, `5000` boundary PASS
- `5001` -> 422
- `payment.slow` <= 5000
- longer delay Local-only
- allowed delay中のClient timeout / abortでDB transactionを保持しない
- timeout / abort後のOrder / Payment状態をinspectし、resume/retryで回復可能

### 25.11 Public Smoke

Publicでは軽量Smokeのみ。

---

## 26. Free Quota Measurement Gate

論理Seed object数ではなく、final schema / final indexでD1が返す実測metadataを正本とする。

```text
Public Scenario Metrics
- each public create: actual rows written
- each public reset: actual rows written
- Create idempotency / token rotation: actual rows written
- cleanup: actual rows written
- tombstone hard delete: actual rows written

Local Heavy Scenario Metrics
- many-products actual rows written
- Public対象外であること

Route Metrics
- invocation-total D1 queries
- rows read
- rows written
- representative CPU where measurable

Operational Metrics
- cleanup D1 queries / CPU / processed sandbox count
- Worker compressed bundle size
- Remote Cloudflare CPU outcome
- Worker startup outcome

Estimated Daily Capacity
- public sandbox creations/day
- create recovery retries/day
- resets/day
- learner sessions/day
```

Hard Gate:

- Middleware / Identity / Business処理を含む1 invocation全体で50 D1 queries以内
- 100 bound parameters/query以内
- final index込みactual `rows_written`でPublic write quotaへ運用余裕
- Public Create recoveryを含めてもFree quotaへ合理的な余裕
- Workers Free CPU representative route
- Current PBKDF2 Remote CPU Gate PASS
- Worker Free bundle / startup PASS

---

## 27. Implementation Waves

Backend追加とWeb移行は2 Implementation PRに分割する。

### PR A — Backend Foundation + Current Web API Parity

#### Wave A1: Baseline / Decision Gates

- Hono / Wrangler Skeleton
- Request Context
- OpenAPI方式
- Local Worker / D1
- Current Capability Inventory
- Current Transaction Invariant Inventory
- Scenario Classification Inventory
- PBKDF2 local profile
- Cloudflare observable temporary deployment PBKDF2 CPU Gate
- Worker bundle / startup Gate

**PBKDF2 GateがFAILなら後続Auth実装へ進まない。**

#### Wave A2: D1 Schema / Sandbox Foundation

- Table Ownership Matrix
- Composite PK / FK / UNIQUE / Index
- sandbox-aware JOIN Contract
- migration
- D1 atomic Command pattern
- mutable-state guard inside atomic boundary
- Guard failure -> SQL failure pattern
- Seed adapter
- Backend-portable Scenario parity
- Platform-specific Scenario exclusion
- Public Scenario Allowlist
- Public single-atomic eligibility
- Capability Token >=256-bit random + SHA-256 digest utility
- initialAuth Token generation
- Business idempotency non-null actor scope
- Sandbox Create operational idempotency
- Create response-loss Token rotate recovery
- Reset old-session invalidation / Browser token ordering contract
- tombstone
- cleanup budget

#### Wave A3: Auth / Account

- signup / login / logout
- Request authentication vs active-account authorization separation
- Session TTLをCurrent parityとして新設しない
- Guest Identity / merge
- profile / address
- Address Suggestion

#### Wave A4: Storefront / Cart

- Home Catalog
- search / facet / pagination
- Product Review List
- cart
- Cart Price Change Acceptance

#### Wave A5: Checkout / Payment / Orders

- stateful checkout
- Transaction A/B via D1 atomic batch
- Checkout write OpenAPI request contract
- checkoutActionVersion semantics
- required Idempotency-Key
- duplicate gateway-call suppression
- payment retry
- inventory conflict
- idempotency
- Order Number Sequence / Asia-Tokyo date

#### Wave A6: Reviews

- Review Eligibility
- Customer / Admin
- Review Summary atomicity

#### Wave A7: Admin Parity

- Admin Overview
- Catalog
- Inventory
- Orders
- Users
- Bulk independent mutation transport

#### Wave A8: QA Control

- Clock
- Payment Delay
- Public max 5000 ms
- Local-only long delay
- extended payment faults
- inspection
- Metadata parity

#### Wave A9: Public Hardening

- CORS / exposed Request ID
- route-class rate limit
- payload / delay bound
- active ceiling
- no-secret logs
- Synthetic Test Data Only docs
- invocation-total query / CPU / quota metrics

#### Wave A10: Contract / Docs / Final Gate

- OpenAPI
- Traceability Matrix
- Transaction Invariant Matrix
- Public/Local Scenario guide
- usage / prohibited tests
- quota limits
- response-loss recovery documentation
- retryable error semantics
- Remote Cloudflare compatibility rerun
- final regression

### PR B — Web Backend Integration

#### Wave B1: API Client / Sandbox Bootstrap

- `EXPO_PUBLIC_API_BASE_URL`
- Sandbox create/reuse/expiry
- persisted pending Create Idempotency-Key
- Create response-loss recovery
- initialAuth token handling
- Reset `resetPending` token replacement
- Browser CORS / preflight / exposed Request ID

#### Wave B2: Storefront / Auth / Account / Cart

- Home Catalog
- Product Review List
- Address Suggestion
- Cart Price Change Acceptance

#### Wave B3: Checkout / Order / Review

- Checkout required Idempotency-Key handling
- duplicate submit/retry recovery
- Review Eligibility含む

#### Wave B4: Admin

- Overview
- Bulk independent mutation orchestration

#### Wave B5: Test Control / Dexie Removal

- Backend thin wrapper
- Production persistenceからDexieを外す
- Platform-specific Dexie failure教材を残す場合はlocal/test-only境界へ隔離

#### Wave B6: Full Regression / Public Preview

- Guide Scenario classification表示
- Public Preview smoke

---

## 28. Expected File Impact

### PR A

```text
backend/**
package.json
pnpm-lock.yaml
vitest / tsconfig / eslint config
.github/workflows/ci.yml
README.md
docs/api/**
docs/spec/**
docs/PROJECT_CONTEXT.md
src/domain/**   # pure shared changes only if required
src/seeds/**    # seed SSOT sharing/refactor / classification metadata if required
```

### PR B

```text
src/application/**
src/infrastructure/**
src/bootstrap/**
src/presentation/**
src/test-controls/**
src/seeds/metadata.ts      # Guide classification表示に必要なら
app/**
e2e/**
tests/**
README.md
docs/spec/**
docs/PROJECT_CONTEXT.md
package.json
.github/workflows/ci.yml
```

---

## 29. Definition of Done

### 29.1 Backend

- Standalone Worker + D1
- Free Plan前提を実測
- Fresh local setup
- Migration reproducible
- Ownership Matrix
- Composite Sandbox relational integrity
- Sandbox-aware JOIN isolation
- Existing TransactionRunnerをD1へ偽装移植していない
- Transaction Invariant Inventory完成
- Atomic mutationがD1 batch境界で保証される
- mutable-state predicateをatomic boundary内でguard / revalidateしている
- Guard failureがrollbackへ変換される
- Backend-portable Current Scenario parity
- Platform-specific Scenarioを意味変更してBackendへ移植していない
- Public Scenario Allowlist
- 全Public Scenario Create/Resetがsingle atomic boundary
- `many-products` Public対象外
- No half-seeded Public Sandbox
- Sandbox Create response-loss recoveryでduplicate Sandboxなし
- Sandbox Create recoveryでRaw TokenをDB保存せずfresh Token rotate可能
- Expiry tombstone contract
- Auth / Role
- AuthenticationとActive Account Guardが分離されている
- Scenario initialAuth parity
- Sandbox/User Session Tokenは>=256-bit random + SHA-256 digest、Password PBKDF2と分離
- Raw TokenはToken発行response時のみ、DBはdigestのみ
- Raw Token / digestをlogしない
- Session TTLをCurrent parityとして勝手に追加していない
- Reset成功response前にBrowser旧Session Tokenを削除しない
- PBKDF2 Remote CPU Gate PASS
- Guest Cart merge
- Home Catalog
- Product Review List
- Address Suggestion
- Cart Price Change Acceptance
- Stateful Checkout
- Checkout write OpenAPI request contract
- checkoutActionVersion / Idempotency-Key semantics固定
- Business idempotency actor NOT NULL
- duplicate checkout / retryでPayment Gateway side effect重複なし
- Inventory Conflict
- Order Number concurrency
- Review Eligibility
- Reviews / Review Summary atomicity
- Admin Overview / Catalog / Inventory / Orders / Reviews / Users
- Bulk partial-success semantics
- Public Payment Delay <= 5000 ms
- OpenAPI
- Error Envelope `retryable` machine-readable contract
- CORS preflight
- BrowserからCanonical `X-Request-Id`参照可能
- D1 transient error mapping
- Worker bundle / startup Gate PASS

### 29.2 API Parity

- Spec + Application public methods + Web usageのTraceability Matrix
- Current Transaction全call siteのInvariant Matrix
- Operation classificationがある
- Missing CURRENT_PARITY Operationなし
- Current Excluded Behavior追加なし

### 29.3 QA

- Unit PASS
- D1 Integration PASS
- Sandbox relational integrity PASS
- SQL JOIN isolation PASS
- Atomic rollback PASS
- Mutable-state guard placement PASS
- Guard failure rollback PASS
- API PASS
- Contract PASS
- Checkout write request/header contract PASS
- CORS preflight / Request ID exposure PASS
- Scenario classification PASS
- Sandbox isolation PASS
- Create / Reset budget PASS
- Create response-loss recovery PASS
- Reset token-order / response-loss recovery PASS
- initialAuth PASS
- Capability Token digest / rotation / non-leakage PASS
- Business idempotency non-null actor PASS
- Auth PASS
- Checkout PASS
- Duplicate submit / payment gateway at-most-once contract PASS
- Concurrency PASS
- Bulk partial-success PASS
- Failure Injection PASS
- Public Payment Delay bound PASS
- Timeout / abort recovery PASS
- Error retryable contract PASS
- Invocation-total Query Budget PASS
- Free Quota Gate PASS
- Remote CPU Gate PASS
- Bundle / startup Gate PASS

### 29.4 Web

- Web authoritative persistence = Backend/D1
- Production IndexedDB dependencyなし
- Browser -> Worker -> D1 E2E
- `EXPO_PUBLIC_API_BASE_URL`で接続
- Browser preflightが通る
- Browserから`X-Request-Id`を取得できる
- Create response loss時にpending Idempotency-Keyでsame Sandboxをrecoverできる
- Reset中は旧Session Tokenを保持し、成功後だけreplace / clearする
- Reset後のinitialAuthがCurrent Scenarioどおり復元される
- Backend identity用StorageとPresentation固有Storageの責務が分離されている
- Current Web expected behavior維持
- GuideでPublic / Local / Platform-specific Scenarioを識別可能
- Native unaffected

### 29.5 Public Operation

- Public / Local / Platform-specific Scenario差をDocument化
- Public禁止事項
- Synthetic Test Data Only
- best-effort availability
- load/stressはLocal
- payment delay > 5000 msはLocal-only
- final index込みactual quota measurement
- shared D1 throughput limitationをDocument化
- cleanup operational budgetを計測

---

## 30. Risks / Decision Gates

### Risk 1: Workers CPU / PBKDF2

Current AuthがFree CPUと両立しない可能性。

Gate:

- Local profile
- Workers Logsを取得可能なtemporary deployed WorkerでRemote Cloudflare invocation CPU/outcome確認

Workers Logsを取得できないPreview URLだけでGateをPASSさせない。

FAIL時は設計判断へ戻る。Securityを黙って弱めない。

### Risk 2: Capability Token CPU / Secret handling drift

Sandbox/User Session TokenへPassword用PBKDF2を誤用すると、全Business RequestのCPUを不必要に消費する。

Gate:

- >=256-bit cryptographically secure random token
- SHA-256 digest persistence
- PasswordHasher / PBKDF2と分離
- Raw Token / digestのlog禁止
- Raw Token DB保存禁止

### Risk 3: Sandbox Create response loss / unreachable Sandbox

Create commit後にresponseだけ失われると、Raw Tokenを取得できずactive Sandboxが到達不能になる危険。

Gate:

- required Create Idempotency-Key
- operation + key + payload hash + sandbox associationをatomic保存
- same key retryでduplicate Sandbox禁止
- Raw Tokenを保存せずToken digestをrotateしてfresh Raw Tokenをresponse
- initial User Session Tokenも必要ならrotate
- commit後response-drop test

### Risk 4: Reset browser token ordering

Reset前にBrowserが旧User Session Tokenを削除すると、pre-commit network failureでBackend Sessionは有効なのにClientだけ認証情報を失う。

Gate:

- `resetPending`中は旧token保持
- success response後だけreplace / clear
- post-commit response lossはSandbox Tokenでretry

### Risk 5: D1 write quota

Full Sandbox Seed / Reset / Cleanup / Index / Idempotency write amplification。

Gate:

- final schema + final indexのactual rows_written
- Public-safe Scenarioだけ公開

### Risk 6: D1 query / bind limit

Business RouteだけでなくSandbox Create / ResetもHard Gate。

Middleware / Identity queryを含むinvocation TOTALで計測する。

### Risk 7: Relational scope / Read isolation bug

Fixed Seed IDがSandbox間で重複する。

Gate:

- Composite PK / FK / UNIQUE
- sandbox-aware JOIN
- same logical ID / different value isolation test

### Risk 8: Nullable idempotency actor

SQLite UNIQUEへnullable user_idを含めると、同一Keyのduplicate rowを許容し得る。

Gate:

- Business idempotency `actor_id NOT NULL`
- Platform Create Idempotencyを別scopeへ分離
- Guest Checkoutを無断追加しない

### Risk 9: Fake transaction / false guard success / TOCTOU

Gate:

- Backend Command + D1 atomic batch
- mutable-state predicateはatomic boundary内でguard / revalidate
- Guard failureをSQL failureへ変換
- Transaction Invariant Inventory
- partial commit tests

### Risk 10: Scenario Initial Session drift

Backend Bearer Token化でCurrent `initialSession`を再現できなくなる危険。

Gate:

- Create/Reset initialAuth Contract
- Raw fresh token response only
- digest persistence
- suspended/withdrawn semantics test

### Risk 11: Checkout duplicate delivery

Order / payment writeのrequired headers/bodyが曖昧だとduplicate submitやnetwork retryでOrder / Payment Attempt / Mock Gateway side effectが重複する危険。

Gate:

- Operation-specific OpenAPI request contract
- required Idempotency-Key
- checkoutActionVersionの適用範囲固定
- same key / same payload replay
- same key / different payload 409
- gateway invocation de-dup test

### Risk 12: Public Payment Delay Abuse

Public `setPaymentDelay`が無制限だと共有Workerの長時間requestを作れる。

Gate:

- Public max 5000 ms
- 5001以上は422
- long delayはLocal-only
- timeout / abort recovery test

### Risk 13: Retryable error drift

503説明とError Envelopeが不一致だとClientが安全なretry判断をできない。

Gate:

- Error Envelopeに`retryable`必須
- write mutationはsame Idempotency-Key contractと併用
- blind retry禁止

### Risk 14: Bulk D1 budget overflow

Current最大50件を1 Worker requestで処理するとFree query budgetを超える危険。

Gate:

- independent single-target HTTP mutation orchestration
- bounded concurrency
- Current partial-success semantics

### Risk 15: Public Abuse

best-effort availability + route-class rate limit + bounded operation。

### Risk 16: Shared D1 throughput

Data isolationはあってもthroughput isolationはない。

初期Phaseでは受容し、shardingはしない。

### Risk 17: Spec / API drift

SpecだけでなくApplication public methods / Web usageまで棚卸し。

### Risk 18: Scenario semantic drift

Client Storage failure等をBackend failureへ同じIDで読み替える危険。

### Risk 19: Checkout / Order Sequence drift

Transaction A / BとAsia/Tokyo order number semanticsを固定。

### Risk 20: Migration rollback mismatch

Expand / Contract。

### Risk 21: CORS Browser-only failure

OPTIONS Contract + Error response CORS + `Access-Control-Expose-Headers: X-Request-Id` + Browser-origin CI。

### Risk 22: Worker bundle / startup

Dry-runだけでなくCloudflare actual upload/startupをGateにする。

### Risk 23: D1 transient failure retry misuse

write blind retry禁止 + Operation-specific Idempotency-Keyで再試行。

### Risk 24: Public personal data retention misunderstanding

Synthetic Test Data Onlyを明示し、Sandbox deleteをbackup即時消去と説明しない。

### Risk 25: Browser Storage responsibility drift

Backend Token storage制約を、one-time notice / UI preference等のPresentation固有Storageまで禁止する規約と誤読しない。

### Risk 26: Backend目的化

QA学習目的を説明できないInfrastructureは追加しない。

---

## 31. Non-goals

- Native Backend migration
- PostgreSQL-specific isolation / deadlock
- Microservices
- Queue / webhook
- real payment
- OAuth
- CSRF教材
- Production-grade Security Training全般
- Public Load / Stress
- arbitrary fault injection
- Cancel / Return / Refund
- Guest Checkout
- UI全面再設計
- Public log閲覧API
- Initial D1 sharding
- Current parityではない独立User Session TTLの無断追加
- Platform-specific Scenarioを同じIDでBackend failureへ意味変更
- Bulk全体を1巨大D1 transactionへ押し込むこと
- Public multi-stage half-seed protocol
- Capability TokenへPassword用PBKDF2を適用すること
- Browser Presentation固有Storageを一律禁止すること
- Publicで5秒超の任意Payment Delayを許可すること

---

## 32. Phase 3後に個別Planで判断するもの

- Native API integration
- API version migration exercise
- DB migration challenge
- Contract breaking challenge
- Security curriculum
- Performance curriculum
- Queue / webhook
- eventual consistency
- richer observability
- multi-guest actor
- Guest Checkout
- PostgreSQL別教材
- Public lightweight large-catalog Scenario
- D1 sharding（必要性が実証された場合のみ）
- independent User Session TTL教材
- Backend-specific database fault Scenario
- Dedicated Preview D1
- Client correlation ID教材
- Capability Token HMAC化（必要性が実証された場合のみ）

---

## 33. Implementation Stop Conditions

以下のいずれかが発生した場合、AIエージェントは「一部だけ実装して完了」とせず、**後続依存部分を止めてDecision Gateとして報告**する。

ただし依存しない検証・ドキュメント整理・他Wave準備は継続してよい。

Stop Conditions:

```text
PBKDF2 Remote CPU Gate FAIL
Worker Free bundle/startup Gate FAIL
Public default Create/Resetがsingle atomic boundaryへ収まらない
Sandbox Create response-loss recoveryをRaw Token保存なしで成立させられない
Current Transaction InvariantをD1で保証できない
Mutable-state concurrency guardをD1 atomic boundaryで保証できない
Current Checkout duplicate semanticsをIdempotency contractで維持できない
Current parityとCloudflare Free constraintが直接矛盾する
D1 actual quota measurementでPublic運用余裕が成立しない
```

禁止:

- Securityを黙って弱める
- Current Behaviorを黙って削る
- Public Scenarioのatomicityを黙って緩める
- Paid Plan前提へ黙って切り替える
- Capability TokenへPBKDF2を誤用する
- response-loss対策としてRaw Capability TokenをDB保存する
- nullable actorでIdempotency UNIQUEを成立させたことにする
- Checkout writeのIdempotency-Keyを黙ってoptionalにする
- Public Payment Delay上限を黙って外す
- Overengineeringで制約を隠す

---

## 34. Recommended Final Direction

Phase 3 Infrastructureは次で固定する。

```text
Cloudflare Pages
      |
      v
Cloudflare Worker / REST API
      |
      v
Cloudflare D1
```

設計中心はCloudflareそのものではなく、**Current Scenario Shopを決定的に隔離されたQA Sandboxへ変換すること**である。

初期標準:

```text
Sandbox-scoped Business Dataset
Composite Sandbox Relational Integrity
Sandbox-aware SQL JOIN
Backend-portable Scenario Parity
Platform-specific Scenario Preservation
Public Scenario Allowlist
Public Single-Atomic Create / Reset
Sandbox Create Idempotency-Key
Create Response-Loss Token Rotation Recovery
Reset Pending / Post-success Token Replacement
Sandbox Capability Token
Fresh Scenario InitialAuth Token
>=256-bit Random Capability Token
SHA-256 Capability Token Digest
Password PBKDF2 / Capability Token Digest Separation
User Session Token Digest Persistence
Authentication / Active Account Guard Separation
Business Idempotency Non-null Actor Scope
Deterministic Reset
Expiry Tombstone
Test Clock
UTC Persistence + Asia/Tokyo Business Calendar
Controlled Failure Injection
Public Payment Delay <= 5000 ms
Stable Error Code
Machine-readable Retryable Error
Server-generated Canonical Request ID
CORS Exposed Request ID
Stateful Checkout
Checkout Action Version Contract
Checkout Required Idempotency-Key
Mock Payment Gateway Duplicate Suppression
D1 Atomic Command / Batch
Mutable-state Guard Inside Atomic Boundary
Transaction Invariant Inventory
Guard Failure Rollback
Inventory Conflict
Order Number Concurrency
Bulk Independent Mutation Orchestration
OpenAPI
CORS Preflight
Invocation-total Query / Bind Budget
Actual D1 rows_written Measurement
Observable Temporary Worker Remote CPU Gate
Worker Bundle / Startup Gate
Synthetic Test Data Only
```

実装順序:

```text
PR A
Backend + D1 + Current Web API Parity
        ↓ merge / Public API deploy

PR B
Web -> Published Backend API
```

PR AでAPI parity、Transaction Invariant、Public Sandbox atomicity、response-loss recovery、Capability Token Contract、Checkout write Idempotency Contract、Remote CPU Gateを完成させずPR Bへ進まない。

Free quotaのために複雑なOverlayへ先回りしない一方、Public Free運用へ収まらないScenario / operationはLocalへ明確に分離する。

Current security propertyとWorkers Free CPUが両立しない場合は、実装者が勝手に弱めずDecision Gateへ戻す。

D1 atomicityは`batch()`を使った事実だけで完了扱いにせず、mutable-state Guard、Guard failure、Current aggregate invariantが実際にrollbackへつながることまで検証する。

Create / Reset / Checkoutのnetwork response lossは「再送すれば何とかなる」と曖昧にせず、Idempotency / Token rotation / Browser token orderingをContractとして固定する。

これによりScenario Shopを、Frontend / Backend / Database / Web / Native / API / CIを横断してQAを学習できるPublic Test Targetへ拡張する。
