# Scenario Shop Phase 3 Cloudflare Backend / API QA 実装計画

## 0. このPlanの位置づけ

この文書は、`qa-training-store` / Scenario ShopへCloudflare Workers + D1によるBackend/APIを追加し、Web / Native / API / Database / Contract / CI / Agentic QA / Trainingを同一Repositoryで学習できる状態へ拡張するための実装計画である。

現在の`plan/phase3-cloudflare-backend` BranchはDocumentation-onlyとする。このBranchではApplication Code、Workflow、Dependency、Cloudflare設定の実装は行わない。

本Planは2026-08-16時点のCurrent `main`をrebaseline済みとする。

```text
Current main
40a5042cb758370cbba643ee0341efc0042212a1
```

このBaselineには少なくとも以下が統合済みである。

- Screen Catalog / Visual Specification Foundation
- Test Automation Curriculum / Training Environment
- Official Black-box Scored E2E / Agentic QA Foundation
- Current Phase 1 Web CI / Native CI / iOS Build-only Baseline

実装開始時にはその時点の最新`main`を再確認し、Current Capability / Required Gate / Transaction Invariantを再取得する。

設計原則は以下とする。

1. QA教材として学習価値がある複雑さだけ残す
2. Current Normative SpecificationとCurrent QA Foundationを壊さない
3. Public Repository / Public Test Targetとして安全に運用する
4. Cloudflare Free Plan内で継続運用する
5. Local環境でも再現できる
6. Production-gradeの運用保証を目的化しない
7. 新しい抽象化を増やす前に既存Foundationを拡張する
8. 同じ要件を複数箇所へ重複定義しない

---

## 1. Goal

Scenario Shopを、現在のWeb / Native UI中心の教材から以下まで学習できるQA Sandboxへ拡張する。

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
- Contract / OpenAPI Test
- Migration Test
- CI/CD Test
- Request IDを使った障害調査
- Local Worker / D1調査
- Backend-aware Agentic QA Runtime
- API / Backend QA Curriculum

Target Architectureは次で固定する。

```text
Cloudflare Pages
      |
      v
Cloudflare Worker / REST API
      |
      v
Cloudflare D1
```

WebはPhase 3でBackend API利用へ移行する。

NativeはPhase 2で構築したSQLite / local-first構成を維持し、Phase 3ではBackend移行対象にしない。

### 1.1 Phase 3完了条件

次の3層が揃って初めてPhase 3完了とする。

```text
Product / Runtime
  Backend + D1 + Web API-backed

Quality Foundation
  Current CI / Visual / Training / Agentic QA互換

Learning Delivery
  API / Backend QAをCurrent Curriculumから利用可能
```

実装は3 PRへ分割する。

```text
PR A
Backend Foundation + Current Web API Parity
        ↓
PR B
Web Backend Integration + Current QA Runtime Compatibility
        ↓
PR C
API / Backend QA Curriculum Integration
```

---

## 2. Current Baseline

### 2.1 Product Baseline

Current構成:

```text
Web
UI -> Application -> Repository -> IndexedDB / Dexie

Native
UI -> Application -> Repository -> SQLite
```

Phase 3ではWebに以下を追加する。

- HTTP request / response
- HTTP status code
- API validation
- CORS / preflight
- Backend authentication / authorization
- Server-side transaction
- API / DB integration
- Network timeout / 5xx / 429
- Idempotency
- Inventory conflict
- API contract
- Database migration
- Request ID / server log investigation

通常のProduction ECを再現すること自体はGoalではない。QAで観測・再現・自動化しやすいBackendを作る。

### 2.2 Expected BehaviorのOracle

Expected Product Behaviorは`docs/spec/README.md`のOracle Priorityへ従う。

```text
Current Normative Spec
        ↓
Business Rule / Acceptance Criteria
        ↓
Executable Canonical Source for low-level values
        ↓
Current Application Capability
        ↓
Current Web usage
        ↓
Backend API Capability
        ↓
HTTP Endpoint / D1 Persistence
```

Application、Existing Test、README、Guide、Screenshotだけを上位Oracleへ昇格させない。

### 2.3 Known Current Capability

最低限次のCurrent behaviorを落とさない。

- Signup / Login / Logout / Current User
- Guest Cart merge
- Home Catalog
- Product Search / Facet / Detail
- Category equivalent
- Search Suggestion
- Product Review List
- Address Suggestion
- Cart Get / Add / Quantity / Remove
- Cart Price Change Acceptance
- Stateful Checkout
- Payment Retry
- Customer Order / Review Eligibility / Review
- Admin Overview
- Admin Catalog / Inventory / Orders / Reviews / Users
- Test Clock / Payment fault / Test Control

Implementation開始時にApplication public methods、Presentation usage、Normative Specを再scanする。

### 2.4 Current QA Foundation

Implementation開始時に`package.json`と`.github/workflows/**`を再scanする。

2026-08-16 Baselineでは少なくとも以下をCurrent Foundationとして扱う。

```text
Style / Specification
- format check
- markdown lint
- validate:spec
- validate:spec-visuals:final
- validate:curriculum

Code Quality
- lint
- typecheck
- image manifest validation
- security check

Test
- unit
- integration
- repository
- component
- contracts

Build
- automation web build
- production web build
- specification site build

Web Runtime
- required Chromium E2E
- accessibility
- mobile boundary
- cross-role
- Training Web baseline
- UI Review 4 viewports
- production smoke

Agentic QA
- deterministic preparation verification

Native
- Current Android required guarantee
- Current iOS build-only guarantee
```

Phase 3独自GateがPASSしてもCurrent Foundationを壊していれば完了ではない。

---

## 3. Canonical Contracts

このSectionをPhase 3実装の正本とする。

CI、Wave、DoDでは同じ要件を再定義せず、必要なContract IDを参照する。

### C01. Architecture

- Cloudflare Pagesを継続
- Standalone Cloudflare Worker
- Cloudflare D1
- REST / JSON
- TypeScript
- Hono
- Zod
- D1 Prepared Statement + SQL
- Wrangler migrations
- Vitest + Workers公式integration
- OpenAPI 3.1

初期版では以下を採用しない。

- Prisma / Drizzle
- PostgreSQL
- Supabase / Firebase
- Durable Objects
- KVを主要DBとして利用
- R2 / Queues / Workflows
- Microservices
- GraphQL
- Docker必須化
- 外部Auth Provider
- real payment
- Event Sourcing / CQRS

D1を直接扱い、SQL / migration / constraint / transactionを教材として見せる。

### C02. Schema / OpenAPI SSOT

Request/response validation、TypeScript type、OpenAPI schemaを独立して三重管理しない。

実装時に最小のintegration方法を1つ選び、schema definitionを可能な限りSSOT化する。

新しいSchema Frameworkを追加する場合は、Zod/OpenAPIの二重定義を減らすことが目的でなければ導入しない。

### C03. Operation Classification / Traceability

各API Operationを次のいずれかへ分類する。

```text
CURRENT_PARITY
PHASE3_QA_EXTENSION
PLATFORM_CONTROL
```

Traceability Matrixの最低列:

```text
Operation
Classification
Normative Spec / BR / AC
Application public method
Current Web usage
Screen ID / Route where applicable
Current Transaction invariant where applicable
API endpoint
Auth requirement
Sandbox scope
Test layer
```

Screen Catalogはmigration coverageのSupporting Indexとして使い、Expected BehaviorのOracleにはしない。

### C04. Public / Local Scope

Public:

- UI / API Functional
- AuthN / AuthZ
- Contract / Error / State Transition
- Sandbox Isolation
- Request ID
- Public-safe Scenario

Local:

- Public範囲すべて
- Structured Worker Log
- D1 migration / constraint investigation
- Transaction / rollback investigation
- Local-only fault injection
- Load / Stress / Soak
- Publicで禁止する破壊的検証

Public向けlog閲覧APIは追加しない。

### C05. Sandbox Dataset / Isolation

初期PhaseではSandboxごとにFull Datasetを持つ。

Overlay方式は採用しない。

Business tableは原則Sandbox-scopedとし、PK/FK/UNIQUE/JOINへ`sandbox_id`を含める。

例:

```text
PRIMARY KEY (sandbox_id, id)
FOREIGN KEY (sandbox_id, product_id)
UNIQUE (sandbox_id, normalized_email)
```

主要Indexはquery patternを確認したうえで`sandbox_id` leadingを基本とする。

同一logical IDを2 Sandboxへ配置するintegration testでcross-sandbox leakを検出する。

### C06. Sandbox Lifecycle

Sandbox lifecycleは明示state machineを作らず、原則`expires_at`で判定する。

```text
rowなし
-> 404

rowあり && now <= expires_at
-> usable

rowあり && now > expires_at
-> 410

cleanup後
-> 404
```

`creating` / `active` / `expired tombstone`のstate columnを初期Phaseでは持たない。

Createはsingle atomic boundaryで完了させ、half-seeded Sandboxを外部公開しない。

Default TTLは24hをPlanning Baselineとし、実測で必要なら短縮する。

Cleanupはexpired Sandboxをbounded件数でhard deleteする。

### C07. Sandbox Create

```text
POST /v1/test/sandboxes
```

CreateへIdempotency-Keyを要求しない。

理由:

- Sandboxは一時的なQA環境でありBusiness side effectではない
- Exactly-once級のRecoveryは教材価値に対して複雑すぎる
- Business IdempotencyはOrder / Paymentで学習できる

Create response loss時は新しいSandboxを再作成する。

```text
Sandbox A commit
↓
response loss
↓
ClientはAを利用しない
↓
Sandbox BをCreate
↓
AはTTL cleanup
```

Raw Sandbox TokenはCreate response時だけ返し、D1にはSHA-256 digestだけ保存する。

到達不能Sandboxのcleanupを完全保証するためのToken rotation / operational idempotency / recovery associationは実装しない。

### C08. Sandbox Reset

ResetはSandbox Tokenを使い、Public-safe Scenarioをsingle atomic boundaryでdeterministicに復元する。

Reset成功時:

- old user sessions invalid
- fresh initialAuth token
- deterministic dataset
- test clock / fault state reset

BrowserはReset request前に旧User Session Tokenを消さない。

```text
resetPending
-> request
-> success response
-> fresh token replace / old clear
```

pre-commit network failureでは旧tokenを維持する。

post-commit response lossではSandbox TokenでResetを再実行してfresh initialAuthを取得する。

Resetはdeterministic operationとしてretry可能にするが、専用Idempotency-Keyは導入しない。

### C09. One Fresh Sandbox per Independent Execution

原則:

```text
one independent test execution context
-> one fresh Sandbox
```

対象:

- Formal E2E
- Training Web baseline
- UI Review
- Agentic QA preparation/runtime
- Production/Preview smoke

同一test lifecycle内で意図的にState共有するcaseは同じSandboxを使ってよい。

D1 Databaseをsuiteごとに分ける必要はない。

### C10. Scenario Classification

Scenarioを次へ分類する。

- Backend-portable
- Platform-specific
- Public-safe

`storage-write-failure`等のClient storage固有ScenarioをD1 failureへ読み替えない。

`many-products`は初期Public対象外とする。

Scenario metadataで最低限以下を返す。

```text
scenarioId
seedVersion
backendSupport
publicAvailability
platformSpecific
purpose
initialAuth kind
```

### C11. Authentication / Authorization

Worker側Current UserはBrowser Session Storeを再利用せず、RequestContextから解決する。

```text
Sandbox middleware
↓
Authentication
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
```

AuthenticationとAuthorizationを分離する。

suspended / withdrawn userはValid Tokenからidentityを解決できてもよいが、Current operationのactive-account guardで拒否する。

### C12. Password / Capability Token

PasswordはCurrent security propertyを維持する。

Planning Baseline:

```text
PBKDF2
SHA-256
210000 iterations
16-byte salt
32-byte hash
```

Sandbox Token / User Session TokenにはPassword PBKDF2を使わない。

```text
>=256-bit cryptographically secure random token
DB = SHA-256 digest only
Raw token = issuance response only
```

Raw token / digest / Authorization / passwordをlogしない。

### C13. PBKDF2 Free CPU Gate

Workers FreeのCPU上限とCurrent PBKDF2が両立するか実測する。

必須:

1. Local profile
2. temporary deployed Worker
3. Workers Logs / invocation metricsでrepresentative signup/loginを確認
4. `cpu_time_ms` / outcome / exceededCpuを確認

FAIL時:

- iterationsを勝手に下げない
- plaintext / fast hashへ置換しない
- Auth依存作業を止める
- Architecture Decisionとして報告する

Preview URLだけをCPU Gate正本にしない。

### C14. Business Idempotency

IdempotencyはBusiness side effectがあるwriteへ限定する。

最低対象:

- Order creation
- Payment resume
- Payment retry

Contract:

```text
same key + same non-null actor + same operation + same payload
-> same result replay

same key + same actor + same operation + different payload
-> 409

missing required key
-> 400
```

Business idempotencyのactorはnon-nullとする。

Guest CheckoutはCurrent Non-goalなので追加しない。

Mock Payment Gateway callもduplicate retryで二重化させない。

### C15. Stateful Checkout

Backend化でCheckoutを単発`POST /orders`へ単純化しない。

Current state transitionをAPIへ写像する。

最低Capability:

```text
checkout session start/read
address update
payment method update
confirm / order creation
payment resume
payment retry
```

Order creationにはCurrent `checkoutActionVersion`相当の競合検出を維持する。

### C16. D1 Transaction / Mutable Guard

Current callback型TransactionRunnerをD1へ機械移植しない。

batch外へ出してよいのは以下に限定する。

- request schema validation
- immutable/reference read
- atomic boundary内で再検証する前提のpre-read

在庫、version、current state、sequence uniqueness等のmutable predicateは同じatomic operation内でguard/revalidateする。

`UPDATE ... WHERE ...`が0 rowでもSQL errorとは限らない。

0-row conditional UPDATEをrollback signalとして誤認しない。

Guard failureがaggregate全体を拒否すべき場合、same atomic boundaryでstatement failure等へ変換してall-or-nothingを保証する。

### C17. Transaction Invariant Inventory

PR AでCurrent `transactionRunner.run(...)`全call siteを棚卸しする。

最低列:

```text
Current Transaction Label
Call Site
Invariant
Current all-or-nothing / partial-success semantics
D1 Command / HTTP orchestration
Mutable Guard
Rollback Test
```

最低対象:

- Login / Signup + Guest Cart Merge + Session
- Product aggregate mutation
- Inventory + Inventory History
- Checkout / Order / Payment
- Order + Shipment + Order History
- Review + History + Summary
- User role/status + Session invalidation
- Last Admin protection
- Order Number Sequence

Inventory未完成でPR A完了扱いにしない。

### C18. Concurrency

最低限以下を検証する。

- stock=1へ2 concurrent checkout -> success最大1
- stale expected version
- duplicate Idempotency-Key sequential/concurrent
- order number uniqueness
- no partial inventory/history/payment mutation

PostgreSQL固有deadlock/isolation教材はNon-goal。

### C19. Bulk

Current bulk partial-success semanticsを維持する。

大量targetを1巨大D1 transactionへ押し込まない。

Client/Application側でboundedなsingle-target HTTP mutationへ分けて結果を集約する。

### C20. Test Clock / Time

PersistenceはUTC。

Current business semanticsでAsia/Tokyoを使う箇所は維持する。

Sandboxごとにdeterministic Test Clockを持つ。

Worker global mutable clockは使わない。

### C21. Public Fault Control

Public fault controlはbounded allowlistだけ提供する。

Public payment delay:

```text
0 <= delayMs <= 5000
5001+ -> 422
```

長いdelayや破壊的faultはLocal-only。

Delay待機中にDB transactionを保持しない。

### C22. Error / Request ID

Stable Error Envelope:

```json
{
  "error": {
    "code": "STABLE_CODE",
    "messageKey": "optional.key",
    "retryable": false,
    "requestId": "..."
  }
}
```

HTTP mapping例:

- validation -> 400 / 422
- unauthenticated -> 401
- forbidden -> 403
- cross-sandbox -> 404
- expired sandbox -> 410
- conflict -> 409
- rate limit -> 429
- temporary DB unavailable -> 503 + retryable true

writeをblind retryしない。

retryable writeはsame Idempotency-Key contractと組み合わせる。

Server-generated `X-Request-Id`をCanonical IDとする。

### C23. CORS

Pages SPAとStandalone Workerはcross-originを初期構成とする。

最低:

```text
OPTIONS /v1/*
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: explicit allowlist
Access-Control-Allow-Headers:
  Content-Type
  Authorization
  X-Sandbox-Token
  Idempotency-Key
Access-Control-Allow-Credentials: false
Access-Control-Expose-Headers:
  X-Request-Id
```

Error responseにもCORS headerを付ける。

### C24. Rate Limiting

初期Phaseは2 tierだけにする。

```text
Sensitive
- Sandbox Create
- Sandbox Reset
- Signup / Login

Normal
- その他
```

Cloudflare側の標準機能を優先し、D1 counter等の独自Rate Limiterを先回りして作らない。

必要性が実測されるまで細かいroute classを増やさない。

### C25. Bounded Input / Public Safety

Public APIでは最低限以下をboundする。

- body size
- string length
- array length
- pagination
- bulk size
- idempotency key length
- payment delay

Publicへ実データ / secretを投入しない。

禁止例:

- 実名 / 実住所 / 実電話
- 実メール
- 他Serviceで使うpassword
- API key / access token / secret

PublicではLoad / Stress / Soak / aggressive fuzzing / destructive security testを禁止する。

### C26. D1 Query / Bind Budget

D1 query countはBusiness Repositoryだけでなく1 Worker invocation全体で計測する。

含むもの:

- Sandbox identity
- Authentication / Authorization
- Business queries
- Idempotency
- history/audit where applicable
- response shaping

Test/dev adapterまたは共通instrumentationで、integration test中の全requestについてPlatform limit超過をfailさせる。

個別に重点計測する高コストrouteは以下へ絞る。

- Sandbox Create
- Sandbox Reset
- Home
- Checkout / Order creation
- Admin Overview
- Cleanup

大量のRoute別query-count testを手書きしない。

Bound paramsもPlatform limitを超えないことを共通Gateで確認する。

### C27. D1 Write Quota Measurement

論理object数ではなくfinal schema / final indexでD1 actual metadataを測る。

最低:

- Public Sandbox Create
- Public Reset
- representative mutation
- cleanup

Index write amplificationを含める。

Free quotaを100%使い切るcapacityを目標にしない。

### C28. Cleanup

Cronでexpired Sandboxをbounded件数hard deleteしてよい。

1 invocationで以下をboundする。

- processed sandbox count
- query count
- rows_written
- CPU

全expired Sandboxを1 requestで掃除するloopを作らない。

### C29. Web Authority / Dexie

PR B後、Web business persistenceはWorker/D1をauthoritativeとする。

```text
Before
Web UI -> Application -> Dexie

After
Web UI -> Application/API Client -> Worker -> D1
```

PresentationへAPI URLを直書きしない。

Dexieをproduction business persistenceから外す。

ただしpresentation-only preference / one-time notice等のnon-authoritative local stateは禁止しない。

### C30. Build-time API Origin

`EXPO_PUBLIC_*`はbuild-time inputとして扱う。

Current CIの「automation Webを1回buildしてArtifact化し、複数Jobで再利用する」構造を維持する。

Canonical Automation API Origin:

```text
http://127.0.0.1:8787
```

```text
EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:8787
        ↓
build:web once
        ↓
web-dist-automation
```

Formal / Training / UI Review / Agentic QA等のRequired consumerは同じartifactを使い、各Runner上でLocal Worker `:8787` + Local D1 + Fresh Sandboxを準備する。

consumer JobごとにWebを再buildしない。

Guard:

```text
automation artifact
-> production Worker originなし
-> canonical local API originあり

production artifact
-> production Worker originあり
-> localhost API originなし
```

### C31. Current QA Runtime Compatibility

PR BではCurrent QA FoundationをBackend-aware化する。

最低:

- Formal Playwright
- accessibility
- mobile boundary
- cross-role
- Training Web baseline
- UI Review 4 viewports
- production smoke
- Agentic QA deterministic preparation

各independent executionはFresh Sandboxを使う。

Nativeは既存SQLite構成を維持する。

### C32. Agentic QA Existing Identity Extension

Phase 3専用のRuntime Identity Frameworkを新規作成しない。

#23で導入済みのtrusted receipt / identityへ必要なBackend情報を追加するだけとする。

最低追加情報:

```text
frontend_artifact_sha256
backend artifact/version identity
backend_api_origin
schema_version
seed_version
runtime_variant_id
```

Canonical local Prepared Runtime:

```text
Prepared frontend artifact
  built for http://127.0.0.1:8787
+
Pinned backend identity
+
Local Worker :8787
+
Fresh local D1
+
Fresh Sandbox
```

Backend SourceをBlack-box Runnerへ渡さない。

HarnessはAgentをlaunch / wrap / retry / orchestrateしない。

Remote WorkerをOfficial Scored Runtimeへ追加する場合は別runtime variant / 別frontend artifactとして扱う。

### C33. Screen / Visual Compatibility

Screen CatalogはWeb migration coverageへ利用するがOracleにはしない。

Datasource変更だけを理由にCanonical Screenshotを再生成しない。

新しいVisible Stateを正式Behaviorへ追加する場合はSpec-firstで更新する。

```text
Normative Spec
↓
BR / AC
↓
Implementation
↓
Screen Contract / Visual Registry where required
↓
Canonical Visual Reference
```

### C34. Curriculum Integration

PR CでCurrent CurriculumへAPI / Backend QAを接続する。

既存Competencyを優先して拡張する。

特に:

```text
C05 Test Layer Selection
C09 Failure Analysis
C12 Continuous Execution Design
```

必要性が実証されるまで新Competency IDを増やさない。

最低Topic:

- HTTP / status / validation
- AuthN / AuthZ
- OpenAPI / Contract
- Sandbox / reset
- D1 schema / migration
- Transaction / rollback
- Idempotency
- Concurrency
- Request ID investigation
- Free quota / CI design

Hands-onはLocal Wrangler + Local D1を標準とし、Cloudflare account / secretを必須にしない。

TrainingとFormal Regressionを混ぜない。

---

## 4. API Capability

PathはOpenAPI確定時に最終固定する。

### 4.1 Platform / Sandbox

```text
GET /v1/health
GET /v1/version
GET /v1/openapi.json
GET /v1/scenarios

POST   /v1/test/sandboxes
GET    /v1/test/sandboxes/current
POST   /v1/test/sandboxes/current/reset
DELETE /v1/test/sandboxes/current

PUT /v1/test/clock
PUT /v1/test/payment-delay
PUT /v1/test/payment-fault

GET /v1/test/inspect/orders
GET /v1/test/inspect/variants
GET /v1/test/inspect/review-summary
```

### 4.2 Auth / Account

```text
POST /v1/auth/signup
POST /v1/auth/login
POST /v1/auth/logout
GET  /v1/auth/me

GET   /v1/account/profile
PATCH /v1/account/profile

GET    /v1/account/addresses
POST   /v1/account/addresses
PATCH  /v1/account/addresses/:addressId
DELETE /v1/account/addresses/:addressId

GET /v1/address-suggestions
```

### 4.3 Storefront / Cart

```text
GET /v1/home
GET /v1/categories
GET /v1/categories/:categoryId
GET /v1/brands
GET /v1/products
GET /v1/products/:productId
GET /v1/products/:productId/reviews
GET /v1/search-suggestions

GET    /v1/cart
POST   /v1/cart/items
PATCH  /v1/cart/items/:itemId
DELETE /v1/cart/items/:itemId
POST   /v1/cart/price-changes/accept
```

### 4.4 Checkout / Orders / Review

Current stateful checkout semanticsをOpenAPIへ固定する。

最低Capability:

```text
checkout session start/read
address update
payment update
order create/confirm
payment resume/retry
orders list/detail
review eligibility
review create/update/delete
```

Order create / payment resume / retryはC14を適用する。

### 4.5 Admin

最低Capability:

```text
Admin Overview
Product list/detail/create/update/status/delete
Category list/create/update/reorder equivalent
Brand list/create/update
Inventory list/adjust/history
Order list/detail/status/shipment
Review list/update visibility
User list/detail/role/status
```

BulkはC19を適用する。

---

## 5. Cloudflare Free Planning Baseline

Implementation開始時に公式Documentationを再確認する。

### 5.1 Workers Free

Planning Baseline:

- 100,000 requests/day
- 10 ms CPU / HTTP request
- 128 MB memory
- 50 subrequests/request
- 6 simultaneous outgoing connections
- 3 MB compressed Worker
- 1 second startup

Reference:

- [Workers limits](https://developers.cloudflare.com/workers/platform/limits/)
- [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/)

### 5.2 D1 Free

Planning Baseline:

- 10 databases/account
- 500 MB/database
- 5 GB total storage
- 5 million rows read/day
- 100,000 rows written/day
- 50 D1 queries/Worker invocation
- 100 bound parameters/query
- 7-day Time Travel

Reference:

- [D1 limits](https://developers.cloudflare.com/d1/platform/limits/)
- [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/)

### 5.3 Pages Free

Planning Baseline:

- 500 builds/month
- 20,000 files/site
- Static asset requests are free/unlimited

Reference:

- [Pages limits](https://developers.cloudflare.com/pages/platform/limits/)
- [Pages Functions pricing](https://developers.cloudflare.com/pages/functions/pricing/)

### 5.4 Hard Gate

最低確認:

- PBKDF2 representative CPU
- Worker bundle/startup
- D1 query/bind
- final-index rows read/write
- Public Create/Reset atomicity
- cleanup budget

Free quota節約のためにProduct Behaviorを複雑なOverlayへ作り替えない。

---

## 6. CI Strategy

Current Foundation Gateを置き換えず、その上へPhase 3 Gateを追加する。

### 6.1 PR A Required Gate

最低:

- Current applicable Foundation
- Backend lint/typecheck
- Worker bundle dry-run
- fresh local D1 migration
- C03 Traceability
- C05 Sandbox relational isolation
- C10 Scenario classification/public allowlist
- C11 AuthN/AuthZ
- C12 token security
- C13 PBKDF2 remote CPU
- C14 Business Idempotency
- C15 Stateful Checkout
- C16 D1 transaction/guard
- C17 Transaction Invariant Inventory
- C18 concurrency
- C19 bulk semantics
- C20 time/clock
- C21 public fault bound
- C22 error/request ID
- C23 CORS
- C24 rate limit policy
- C25 input/public safety
- C26 query/bind instrumentation
- C27 write quota measurement
- C28 cleanup
- OpenAPI Contract
- Current API parity
- Current Web/Native regression required by policy

### 6.2 PR A Deploy

```text
Required Gate PASS
↓
D1 migration
↓
Worker deploy
↓
Public-safe fresh Sandbox
↓
API smoke / parity smoke
```

### 6.3 PR B Required Gate

最低:

- Current Foundation
- C29 Web authority/Dexie
- C30 build-time API origin
- C31 Current QA runtime compatibility
- C32 Agentic QA identity extension
- C33 Screen/Visual compatibility
- Browser -> Worker -> D1 E2E
- Fresh Sandbox per independent suite
- Auth / initialAuth / Reset
- Storefront / Cart / Checkout / Review / Admin
- Browser CORS / Request ID
- production-build smoke
- Current Native regression

### 6.4 PR C Required Gate

最低:

- Current Foundation
- C34 Curriculum Integration
- `validate:curriculum`
- Training typecheck
- API/Backend Training baseline
- Training Copy / no-production-secret
- Formal Regression非混入
- Local Wrangler/D1 hands-on reproducibility

---

## 7. Implementation Waves

### PR A — Backend Foundation + Current Web API Parity

#### Wave A0: Rebaseline

- latest main SHA
- Current Required Gate inventory
- Current Capability inventory
- C03 Traceability seed
- C17 Transaction Invariant inventory seed
- Scenario classification seed

#### Wave A1: Skeleton / Feasibility

- C01 Architecture
- C02 Schema/OpenAPI SSOT
- Local Worker/D1
- C13 PBKDF2 CPU Gate
- bundle/startup Gate

PBKDF2 FAILならAuth-dependent workだけ止める。

#### Wave A2: D1 / Sandbox

- C05 Sandbox relational model
- C06 expires_at lifecycle
- C07 simple Sandbox Create
- C08 Reset
- C09 execution isolation
- C10 Scenario classification
- C25 Public safety
- C28 Cleanup

#### Wave A3: Auth / Account

- C11
- C12
- signup/login/logout/me
- guest cart merge
- profile/address
- Address Suggestion

#### Wave A4: Storefront / Cart

- Home
- search/facet/pagination
- category equivalent
- Product Review List
- Cart
- price change acceptance

#### Wave A5: Checkout / Payment / Orders

- C14
- C15
- C16
- C17
- C18
- stateful checkout/payment/order

#### Wave A6: Reviews / Admin

- Review Eligibility
- Review mutation/summary
- Admin parity
- C19 Bulk

#### Wave A7: QA Control / Hardening

- C20 Clock
- C21 Payment fault/delay
- inspect endpoints
- C22 Error/Request ID
- C23 CORS
- C24 Rate Limit
- C26 query/bind instrumentation
- C27 write quota

#### Wave A8: Contract / Final

- OpenAPI
- C03 Traceability complete
- C17 Inventory complete
- remote CPU/runtime rerun
- Current Foundation regression
- production deploy/smoke

### PR B — Web Backend Integration + Current QA Runtime Compatibility

#### Wave B0: Current Baseline

- Current Web/Training/UI Review/Agentic preparation baseline
- current `build-automation -> web-dist-automation -> consumer` topology確認

#### Wave B1: API Client / Bootstrap

- C29
- C30
- Sandbox create/reuse/expiry
- initialAuth
- resetPending
- CORS/Request ID

Create response loss時は新Sandboxを作り直し、旧Sandbox回復を試みない。

#### Wave B2: Product Migration

- Auth / Account
- Storefront / Cart
- Checkout / Order / Review
- Admin
- Test Control

BrowserへServer business logicを二重実装しない。

#### Wave B3: QA Runtime

- C09
- C31
- Formal fixtures backend-aware
- Training backend-aware
- UI Review backend-aware
- production smoke backend-aware

#### Wave B4: Agentic QA / Visual / Final

- C32
- C33
- deterministic preparation
- source-free validation
- Current Foundation full regression

### PR C — API / Backend QA Curriculum Integration

#### Wave C1: Learning Design

- C34 existing Competency mapping
- local-first policy

#### Wave C2: Curriculum / Exercises

- HTTP/API
- AuthN/AuthZ
- Contract
- D1/migration
- transaction/idempotency/concurrency
- Request ID investigation

#### Wave C3: Validation

- Training baseline
- curriculum validator
- Training Copy safety
- Current Foundation regression

---

## 8. Definition of Done

Phase 3完了時に次が満たされること。

### Product / Backend

- C01〜C28の該当Contractが実装済み
- Current Web Capability parity
- OpenAPI
- Worker/D1 local setup reproducible
- PBKDF2 Remote CPU Gate PASS
- Public Sandbox deterministic isolation
- Createはsimple retry-by-recreate方式
- Resetはatomic/deterministic
- Order/Payment Business Idempotency PASS
- D1 transaction/guard/concurrency PASS
- Free quota measurement PASS

### Web / QA Foundation

- C29〜C33実装済み
- Web authoritative persistence = Worker/D1
- production business persistenceからDexie除去
- prebuilt automation artifact reuse維持
- Current Formal / Training / UI Review / Agentic preparation PASS
- Final Visual Gate PASS
- Native unaffected

### Curriculum

- C34実装済み
- API/Backend QA outcomesがCurrent Curriculumへ接続
- Local-first hands-on
- Cloudflare account/secret不要
- Training/Formal分離
- `validate:curriculum` PASS

---

## 9. Risks / Decision Gates

### R1. PBKDF2 CPU

Current Password securityとWorkers Free CPUが両立しない可能性。

-> C13で実測し、FAIL時はSecurityを弱めずDecision Gateへ戻る。

### R2. D1 atomicity

`batch()`利用だけでrollbackが保証されたと誤認する可能性。

-> C16/C17でmutable guardとrollbackを固定する。

### R3. Sandbox isolation

Fixed Seed IDやJOINでcross-sandbox leakする可能性。

-> C05でComposite PK/FK/JOIN testを必須にする。

### R4. Public quota / abuse

Seed/Reset/Cleanup/IndexでFree quotaを消費する可能性。

-> C24〜C28でsimple/boundedな運用にする。

### R5. Create response loss

到達不能Sandboxが一時的に残る可能性。

-> Recovery protocolは作らずC07のrecreate + TTL cleanupを採用する。

これは初期Phaseで受容する運用上のtrade-offであり、Business data lossではない。

### R6. Current QA Foundation regression

Backend独自testはPASSしてもVisual/Training/Agentic QA/Nativeが壊れる可能性。

-> PR A/B/CのCurrent Foundation Gateを維持する。

### R7. Agentic QA過剰拡張

Backend対応を理由に新Identity Frameworkを作る危険。

-> C32で既存#23 identity/receiptの拡張だけに制限する。

### R8. Plan / Contract drift

同じ要件をGate/Wave/DoD/Riskで複製すると不整合が生じる。

-> Section 3 Canonical Contractsを正本とし、後続SectionはContract IDを参照する。

---

## 10. Stop Conditions

以下の場合、依存する後続だけを止めてDecision Gateとして報告する。

```text
PBKDF2 Remote CPU Gate FAIL
Worker Free bundle/startup Gate FAIL
Public default Create/Resetがsingle atomic boundaryへ収まらない
Current Transaction InvariantをD1で保証できない
Mutable-state guardをsame atomic boundaryで保証できない
Current Checkout duplicate semanticsをBusiness Idempotencyで維持できない
Current parityとCloudflare Free constraintが直接矛盾する
D1 actual quota measurementでPublic運用余裕が成立しない
Current Required FoundationにPhase 3起因Regressionが残る
Backend-aware Agentic QA trusted identityを既存Foundation拡張で成立させられない
Black-box Source-free boundaryを維持できない
Current prebuilt automation artifact reuseとdeterministic local API originを両立できない
```

禁止:

- Securityを黙って弱める
- Current Behaviorを黙って削る
- Paid Plan前提へ黙って切り替える
- Raw Capability TokenをDB保存する
- Sandbox CreateへExactly-once recovery infrastructureを追加する
- Business Idempotency-Keyをoptionalにする
- Existing Required Gateを削る
- Backend専用Agent Session Manager / Runtime Identity Frameworkを新設する
- consumerごとにautomation Webを再buildする
- runtime envだけでbuild済みAPI Originを差し替えたことにする
- Canonical ScreenshotをObserved Behaviorへ合わせてSpecを逆転させる
- Free quota最適化のためにOverlay/sharding等を先回りして導入する

---

## 11. Non-goals

- Native Backend migration
- Guest Checkout
- Cancel / Return / Refund
- PostgreSQL-specific deadlock/isolation教材
- Microservices
- Queue / webhook
- real payment
- OAuth
- Production-grade Security Curriculum全般
- Public Load / Stress / Soak
- arbitrary Public fault injection
- Initial D1 sharding
- Dedicated Preview D1
- multi-guest actor
- independent User Session TTL教材
- Backend-specific database fault ScenarioのPublic公開
- Capability Token HMAC化
- Sandbox Create Idempotency / token rotation recovery
- Sandbox explicit lifecycle state machine
- custom D1-backed rate limiter
- Agentic QA専用の新Runtime Identity Framework
- Datasource変更だけを理由にCanonical Screenshotを全再生成すること

---

## 12. Phase 3後に必要性を見て判断するもの

- Native API integration
- richer DB migration challenge
- Contract breaking challenge
- dedicated Security curriculum
- Performance curriculum
- Queue / webhook
- eventual consistency
- richer observability
- Guest Checkout
- multi-guest actor
- PostgreSQL別教材
- Public lightweight large-catalog Scenario
- D1 sharding
- independent User Session TTL
- Backend-specific database fault Scenario
- Dedicated Preview D1
- Client correlation ID教材
- Capability Token HMAC
- Backend-changing Official Scored Challenge
- Immutable Remote Workerを使う別Official Scored Runtime Variant
- Sandbox Create recoveryが実運用上必要と判明した場合の専用Plan

---

## 13. Recommended Final Direction

Phase 3の中心はCloudflare自体ではない。

中心は、**Current Scenario ShopとCurrent QA Foundationを、シンプルで決定的に隔離されたBackend-aware QA Sandboxへ拡張すること**である。

初期標準:

```text
Cloudflare Pages
Cloudflare Worker / REST API
Cloudflare D1
Full Sandbox Dataset
Composite Sandbox Relational Integrity
expires_at based Sandbox Lifecycle
Simple Sandbox Create / retry-by-recreate
Deterministic Reset
Sandbox Capability Token
User Session Token
Password PBKDF2 / Capability Token Digest Separation
Current Auth / Active Account Guard
Business Idempotency only for Order/Payment
Stateful Checkout
D1 Atomic Command
Mutable-state Guard Inside Atomic Boundary
Transaction Invariant Inventory
Inventory Conflict
Order Number Concurrency
Bulk Partial-success Orchestration
Test Clock
UTC Persistence + Asia/Tokyo Business Calendar
Bounded Public Fault Control
Stable Error / Request ID
CORS
Two-tier Rate Limit
Common D1 Query/Bind Instrumentation
Actual rows_written Measurement
Bounded Cleanup
OpenAPI
Build-time Canonical Automation API Origin
Prebuilt Automation Artifact Reuse
Current Visual / Training / Agentic QA Compatibility
Existing Agentic QA Identity Extension Only
Local-first API / Backend QA Curriculum
```

実装順序:

```text
Current main rebaseline
        ↓
PR A
Backend + D1 + Current Web API Parity
        ↓
PR B
Web -> Backend
+ Current QA Runtime Compatibility
        ↓
PR C
API / Backend QA Curriculum Integration
        ↓
Phase 3 Complete
```

PR AではAPI parity、D1 transaction、Business Idempotency、Public Sandbox atomicity、PBKDF2 Remote CPU Gateまで完成させる。

PR BではWebだけ動かして終わらせず、Current Formal / Training / UI Review / Agentic QA RuntimeをBackend-awareにする。

PR Cでは新しいTraining Frameworkを作らず、Current Curriculumへ最小限の追加でAPI / Backend QAを接続する。

Current FoundationのどこかがPhase 3によって壊れた場合、そのGateを削除するのではなくPhase 3実装側を修正する。
