# Scenario Shop Phase 3 Cloudflare Backend / API QA 実装計画

## 0. このPlanと現在Branchの位置づけ

この文書は、`qa-training-store` / Scenario Shopへ、**Cloudflare無料枠を前提とした公開Backend/APIテスト対象**を追加し、Web / Native / API / Database / Contract / CI / Agentic QA / Trainingを同一Repositoryで学習できる状態へ拡張するための実装計画である。

現在の`plan/phase3-cloudflare-backend` Branchは**計画文書だけを保存・レビューするDocumentation-only Branch**とする。このBranchではApplication Code、Workflow、Dependency、Cloudflare設定の実装は行わない。

本Planは2026-08-16時点のCurrent `main`を再baseline済みとする。

```text
Current main
40a5042cb758370cbba643ee0341efc0042212a1
```

このBaselineには、少なくとも次のFoundationがすでに統合されている。

- Screen Catalog / Visual Specification Foundation
- Test Automation Curriculum / Training Environment
- Official Black-box Scored E2E / Agentic QA Foundation
- Current Phase 1 Web CI / Native CI / iOS Build-only Baseline

実装は本Planのレビュー完了後、**その時点の最新`main`から別のFeature Branchを作成して開始する**。実装開始時に`main`が進んでいた場合は、Section 2のCurrent Foundation Inventoryを再取得し、本Planの固定SHAを実装開始点へ機械的に使い回さない。

本Planの設計基準は以下の順で優先する。

1. QA / テスト自動化教材として学習価値が高いこと
2. Current Normative SpecificationとCurrent QA Foundationを壊さないこと
3. Public Repository / Public Test Targetとして安全に運用できること
4. Cloudflare Free Plan内で継続運用できること
5. 現在のWeb / Native / Visual / Curriculum / Agentic QA資産を不要に壊さないこと
6. 過剰設計を避け、ローカルでも再現できること
7. Free quota最適化のために恒久的な設計複雑性を先回りして導入しないこと
8. Cloudflare固有制約を隠蔽せず、教材上の学習境界として明示すること
9. Current parityとPhase 3で新規追加するQA教材Capabilityを混同しないこと
10. Scenario IDの見かけ上の一致よりScenario semanticsの一致を優先すること
11. Existing Required Gateを「Backendとは無関係」として省略しないこと
12. Agentic QA / Curriculumを後付けのDocumentation扱いにせず、Phase 3の実行互換性へ含めること

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
- Agentic QAによるBackend-aware Runtime探索
- Curriculum / TrainingによるAPI・Backend QA学習

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
- Public-safe Scenarioによる軽量な再現

Local Wrangler
- 上記すべて
- Structured Worker Log
- D1 query / migration / constraint investigation
- Transaction / rollback investigation
- Local-only fault injection
- Load / Stress / Soak
- Public Free環境で禁止する破壊的検証
```

Public利用者向けにlog閲覧APIは追加しない。

### 1.2 Phase 3完了条件はTest Targetだけではない

Phase 3はBackendを追加して終了ではない。

次の3層が揃って初めて完了とする。

```text
Product / Runtime
  Backend + D1 + Web API-backed

Quality Foundation
  Existing Required CI / Visual / Training / Agentic QA互換

Learning Delivery
  API / Backend QAをCurrent Curriculum / Trainingから利用可能
```

そのため、実装は3 PRへ分割する。

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

PR Cを省略する場合はPhase 3のGoalを「API / Backend QA Test Target Foundation」に明示的に狭める必要がある。本Planでは**Curriculumまで接続してPhase 3を完了する方針**を採用する。

---

## 2. Current Baseline / Foundation Inventory

### 2.1 Product Baseline

Current Scenario ShopはDomain / Application / Repository abstractionを持つが、WebもNativeもClient Runtime内で完結する。

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

### 2.2 Current Specificationを最優先する

Backend化はProductの新規作り直しではない。

Expected Product Behaviorは`docs/spec/README.md`のOracle Priorityへ従う。

```text
Current Normative Spec
        ↓
Current Business Rule / Acceptance Criteria
        ↓
Executable Canonical Source for low-level values
        ↓
Current Application Capability
        ↓
Current Web route / page usage
        ↓
Backend API Capability
        ↓
HTTP Endpoint / D1 Persistence
```

Application、Existing Test、README、Guide、ScreenshotだけをExpected Product Behaviorの上位Oracleへ昇格させない。

Current ScopeでExcludedなCancel / Return / Refund等をPhase 3で勝手に追加しない。

### 2.3 Known Current Capability Inventory

既知のCurrent parity対象として最低限以下を落とさない。

- Signup / Login / Logout / Current User
- Guest Cart merge
- Home Catalog
- Product Search / Facet / Detail
- Category name/detail equivalent
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
- Test Clock / Payment fault / Test Control相当のQA Control

Implementation開始時にApplication public methods、Presentation usage、Normative Specを再scanし、上記だけを固定一覧として使わない。

### 2.4 Screen Catalog / Visual Baseline

Current `docs/spec/screen-catalog.md`はScreen IDとRoute、Platform、Primary Specificationを結ぶSupporting Indexであり、Expected Product Behaviorの第二SSOTではない。

Current Catalog Universeは次をBaselineとする。

```text
Product     31
Supporting   4
Boundary     2
Test-only    1
Total       38
```

Visual SpecificationはCanonical ScreenshotをNon-normative Referenceとして扱う。

Phase 3ではScreen Catalogを**Web migrationの取りこぼし検出用Traceability**へ利用してよいが、API設計のOracleへ昇格させない。

### 2.5 Curriculum / Training Baseline

Current Repositoryには正式なTest Automation CurriculumとTraining Environmentが存在する。

Current保証を維持する。

```text
Web
Formal RegressionとTraining baselineを分離
training-chromium / training-mobile-chromium

Android
Build + Runtime E2E
Training MaestroはCurrent Formal Native Runtimeを再利用

iOS
Build-only
Runtime / Simulator / Maestro PASSとして扱わない
```

Training TestとFormal Regressionの境界をPhase 3で混ぜない。

### 2.6 Agentic QA Baseline

Current Agentic QA Foundationは次を前提とする。

- Primary QA ExecutorはCoding Agent + Exploratory QA Skill
- Repository HarnessはPreparation / Validation / Isolation / Artifact Integrity / Evaluation / Scoringを担当
- HarnessがCoding Agentをlaunch / wrap / retry / orchestrateしない
- Normal / Gray-boxはSource Working Tree readonly
- Black-box ScoredはSource-free Prepared Targetとtrusted Host Capabilityを要求
- Official ScoredはFresh Coding Agent Session、trusted identity、Tool Isolation、Actual Tool Scopeが無い場合BLOCKED
- Required CoverageはModeごとのSSOTから変更しない

Phase 3 Backend化でこのOwnership Boundaryを崩さない。

### 2.7 Current Required Quality Foundation

Implementation開始時に`package.json`と`.github/workflows/**`を再scanし、Current Required GateをInventory化する。

2026-08-16 Baselineでは少なくとも次をCurrent Foundationとして扱う。

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
- UI Review desktop
- UI Review tablet
- UI Review mobile
- UI Review small-mobile
- production smoke

Agentic QA
- deterministic preparation verification

Native
- Current Android required build/runtime/Maestro guarantees
- Current iOS build-only guarantee
```

Phase 3独自GateがPASSしても、Current Foundation Gateを壊していれば完了ではない。

### 2.8 Foundation Baseline Gate

PR A/B/Cの各開始点で、可能なCurrent Foundation GateをBaseline実行する。

原則:

```text
Before Phase 3 change
Current Foundation PASS or known pre-existing failure recorded
        ↓
Phase 3 implementation
        ↓
Same Foundation rerun
        ↓
New failure = Phase 3 regression until disproven
```

長時間Native Gate等を毎Waveで全実行する必要はない。PR Required Gate / Final GateとしてCurrent Policyに従う。

---

## 3. Operation Classification / Traceability

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

### 3.1 Required Traceability Matrix

最低列:

```text
Operation
Classification
Normative Spec / BR / AC
Application public method
Presentation / Current Web usage
Screen ID / Route where applicable
Current Transaction invariant where applicable
API endpoint
Auth requirement
Sandbox scope
Test layer
```

Screen IDはSupporting traceabilityであり、Expected BehaviorのOracleではない。

### 3.2 Screen to API Capability Mapping

Product Screenについて、Current UIがBackend APIへ移行できることを確認する。

例:

```text
SCREEN-STOREFRONT-HOME
-> Home Catalog capability

SCREEN-STOREFRONT-CART
-> Cart read/mutation + price change acceptance

SCREEN-CHECKOUT-*
-> Checkout session/state/payment/order operations

SCREEN-REVIEWS-EDITOR
-> Review eligibility + mutation

SCREEN-ADMIN-*
-> Admin capability mapping
```

Supporting / Legal ScreenはAPI `N/A`を許容する。

Boundary ScreenはHTTP Error / Authorization Boundaryとの対応を確認する。

Test-only Screenは`PLATFORM_CONTROL`へ分類する。

---

## 4. Architecture Decision

### 4.1 採用構成

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

### 4.2 初期版で採用しないもの

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

### 4.3 Pages FunctionsではなくStandalone Workerを使う

理由:

- API自体を独立したテスト対象として扱いやすい
- Web build / static hostingとBackend lifecycleを分離できる
- `workers.dev` URLだけでもPublic APIを成立させられる
- 外部API Clientから直接扱いやすい
- `wrangler dev`でBackendだけを起動できる
- 現行PagesをWorkers Static Assetsへ移行する必要がない

Hosting MigrationはPhase 3 Goalに含めない。

### 4.4 Server-side Identity Boundary

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
- Current Operationがactive accountを要求する場合に、Operation GuardでCurrent semanticsのerrorを返す
- `suspended-user` / `withdrawn-user` Scenarioのsemanticsを変えない

禁止:

- Worker module-levelにper-user mutable session stateを置く
- Request間でCurrent Userをin-memory共有する
- Browser `CurrentSessionStore`をBackendへそのまま持ち込む

再利用対象は原則pureなDomain Policy / Service / Contractとする。

---

## 5. Cloudflare Free Plan Constraint

2026-08-15に確認したCloudflare公式DocumentationをPlanning Baselineとする。

Implementation開始時に再確認し、変更があれば実測Gateと文書を更新する。

### 5.1 Workers Free Planning Baseline

- 100,000 requests / day
- CPU time: 10 ms / HTTP request
- Memory: 128 MB
- Subrequests: 50 / request
- Simultaneous outgoing connections: 6 / request
- Worker compressed size: 3 MB
- Worker startup time: 1 second
- Cron Triggers: 5 / account

Reference:

- <https://developers.cloudflare.com/workers/platform/limits/>
- <https://developers.cloudflare.com/workers/platform/pricing/>

### 5.2 D1 Free Planning Baseline

- 10 databases / account
- 500 MB / database
- 5 GB total storage / account
- 5 million rows read / day
- 100,000 rows written / day
- 50 D1 queries / Worker invocation
- 100 bound parameters / query
- Time Travel: 7 days

Reference:

- <https://developers.cloudflare.com/d1/platform/limits/>
- <https://developers.cloudflare.com/d1/platform/pricing/>

### 5.3 Pages Free Planning Baseline

- 500 builds / month
- 20,000 files / site
- Static asset requests are free and unlimited
- Pages Functionsを使う場合はWorkers quotaの影響を受ける

Reference:

- <https://developers.cloudflare.com/pages/platform/limits/>
- <https://developers.cloudflare.com/pages/functions/pricing/>

### 5.4 Free Planで特に重要な制約

1. Workers request/day
2. Workers CPU/request
3. D1 rows written/day
4. D1 queries/invocation
5. D1 bound parameters/query
6. Worker bundle / startup
7. simultaneous outgoing connection
8. shared D1 throughput

Free quota節約を理由にCurrent Product Behaviorを複雑なOverlayへ作り替えない。

---

## 6. D1 Query / Statement Budget Policy

### 6.1 N+1を禁止する

Backend RepositoryではitemごとのSELECTループを避け、set-based query / bulk fetchを使う。

### 6.2 Unbounded D1 fan-outを禁止する

```text
Promise.all(100 D1 queries)
```

のようなfan-outを許可しない。

set-based query / bounded sequenceを優先する。

D1 connection上限を理由に専用Semaphoreを先回りして追加しない。まずArchitectureでfan-outを避ける。

### 6.3 Invocation Totalを計測する

Business Repositoryだけでなく次を含む1 Worker invocation全体で計測する。

```text
Sandbox identity
Authentication
Authorization
Business queries
Idempotency
Audit/history where applicable
Response shaping
```

### 6.4 Query Count Test対象

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
- Payment retry
- Review eligibility
- Admin overview
- Admin product detail
- Bulk mutation single target
- Cleanup run

### 6.5 Bound Parameter Policy

大量Seed / bulk mutationで100 bind/queryを超えないようにする。

必要ならstatementをbounded chunkへ分けるが、Public Sandbox Create/Resetのatomicityを壊してはならない。

---

## 7. Scenario Classification

Current Scenarioを一律Backendへ移植しない。

### 7.1 Backend-portable Current Scenario

Current semanticsをBackend/D1でも表現できるScenario。

例:

- default
- empty-catalog
- many-products
- out-of-stock
- low-stock
- sale-active
- expired-sale
- membership/rank
- suspended/withdrawn
- cart invalid items
- payment state
- order/review state
- admin state

### 7.2 Platform-specific Current Scenario

Client/Platform固有障害を再現するScenario。

例:

```text
storage-write-failure
```

これはBrowser IndexedDB / client storage failureの意味を持つため、同じScenario IDをD1 write failureへ読み替えない。

PR BでDexie production persistenceを外した後、この教材を維持する場合はlocal/test-onlyのPlatform-specific境界へ隔離する。

Backend固有D1 failure教材が必要なら別Scenario / fault capabilityとして後続PhaseまたはPR Cで明示する。

### 7.3 Public-safe Backend Scenario

Backend-portable Scenarioのうち、次を満たすものだけPublicへ許可する。

- Create/Resetがsingle atomic boundaryで完結
- D1 query/bind limit内
- actual rows_writtenに運用余裕
- abuse riskが低い
- payload / delay boundを設定可能
- deterministic

`many-products`はLocal-onlyを初期標準とする。

### 7.4 Scenario Metadata

`GET /v1/scenarios`または同等metadataで最低限次を返す。

```text
scenarioId
seedVersion
backendSupport
publicAvailability
platformSpecific
purpose
initialAuth kind
```

Guide / TrainingはこのmetadataとCurrent static metadataを一貫させる。

---

## 8. Public Sandbox Architecture

### 8.1 Isolation Unit

Public Test TargetはBrowser / automation executionごとにSandboxを持つ。

```text
Sandbox
- sandbox_id
- scenario_id
- lifecycle
- expires_at
- test clock
- fault controls
- business dataset
- guest identity
- sessions
- operational idempotency
```

Business tableは原則Sandbox-scopedとする。

### 8.2 Full Sandbox Dataset

初期PhaseではOverlay方式を採用せず、SandboxごとにPublic-safe business datasetを持つ。

理由:

- isolationを理解しやすい
- resetがdeterministic
- SQL JOIN / FK / UNIQUEを学習できる
- Current Scenario semanticsを保持しやすい

### 8.3 Lifecycle

```text
creating
  ↓
active
  ↓
expired tombstone
  ↓
hard delete
```

- Active: normal operation
- Expired tombstone: 410
- Hard delete後: 404

Sandbox hard deleteをCloudflare recovery historyからの即時完全消去と説明しない。

### 8.4 Default TTL

初期標準は24h。

Public Free運用の測定結果で短縮する場合はDocumentする。

### 8.5 One Deterministic Guest per Sandbox

Phase 3初期は1 Sandbox = 1 deterministic guest identityとする。

multi-guest actorはNon-goal。

### 8.6 Capability Token

Sandbox TokenとUser Session Tokenを分離する。

```text
X-Sandbox-Token
  -> Sandbox capability

Authorization: Bearer <user-session-token>
  -> User identity
```

Cross-Sandbox resourceは404。

Same Sandboxでpermission不足は403。

### 8.7 Sandbox Create

```text
POST /v1/test/sandboxes
Idempotency-Key: required
```

default Scenarioを指定可能。

CreateはPublic-safe Scenarioについてsingle atomic boundaryで完結させる。

`creating` stateを50-query limit回避のmulti-request half-seed protocolに使わない。

### 8.8 Create Response-loss Recovery

問題:

```text
DB commit成功
↓
Raw Sandbox Token response前にconnection loss
↓
ClientがSandboxへ到達不能
```

Contract:

- Create Idempotency-Key必須
- operation + key + payload hash + sandbox associationをatomic保存
- same key + same payload retryでduplicate Sandboxを作らない
- Raw TokenをDB保存しない
- retry時にCapability Token digestをrotateしfresh Raw Tokenを返せる
- initial User Session Tokenも必要なら同様にfresh発行
- same key + different payloadは409

### 8.9 Reset

ResetはSandbox Tokenを使用し、Public-safe Scenarioについてsingle atomic boundaryでdatasetを復元する。

Reset成功時:

- old user sessions invalid
- fresh initialAuth token
- deterministic dataset
- scenario/clock/fault state reset

BrowserはReset request前に旧User Session Tokenを消さない。

```text
resetPending
-> request
-> success response
-> fresh token replace / old clear
```

pre-commit network failureなら旧tokenを維持する。

post-commit response lossならSandbox TokenでResetをretryしてfresh initialAuthを回復する。

### 8.10 Test Execution Sandbox Rule

Backend移行後、原則次を共有Sandboxで並列実行しない。

```text
Formal E2E
Training Web baseline
UI Review
Agentic QA preparation / runtime
Production/Preview smoke
```

基本Rule:

```text
one independent test execution context
-> one fresh Sandbox
```

同一test suite内のCross-role lifecycle等、State共有が意図されたcaseは同一Sandbox内で実施してよい。

D1 Database自体は共有してよい。必要なのはSandbox IDによるdata isolationであり、test suiteごとのD1作成ではない。

終了時deleteはbest effort。失敗時はTTL cleanupへ任せる。

---

## 9. Relational Integrity / D1 Schema

### 9.1 Composite Sandbox Key

Sandbox-owned Entityは原則次を使う。

```text
PRIMARY KEY (sandbox_id, id)
```

Foreign KeyもSandbox IDを含める。

```text
FOREIGN KEY (sandbox_id, product_id)
REFERENCES products (sandbox_id, id)
```

### 9.2 Sandbox-scoped UNIQUE

例:

- `(sandbox_id, normalized_email)`
- `(sandbox_id, product_code)`
- `(sandbox_id, sku)`
- `(sandbox_id, order_number)`
- `(sandbox_id, actor_id, operation, idempotency_key)`

### 9.3 Index

主要Indexは原則`sandbox_id`をleading keyにする。

必要なquery patternを確認してから追加し、index write amplificationをactual D1 metadataで測定する。

### 9.4 JOIN Isolation

Readでも必ずSandbox scopeをJOIN conditionへ含める。

同一logical IDを2 Sandboxへ置き、値を変えたintegration testでcross-sandbox leakを検出する。

### 9.5 Table Ownership Matrix

PR Aで次を成果物化する。

```text
Table
Sandbox-owned?
Primary Key
Foreign Key
Unique Constraint
Read Scope
Write Owner
Reset Behavior
Cleanup Behavior
```

---

## 10. Authentication / Authorization / Token Security

### 10.1 Password

Current security propertyを維持する。

Planning Baseline:

```text
PBKDF2
SHA-256
210000 iterations
16-byte salt
32-byte hash
```

Implementation開始時にCurrent PasswordHasherを再確認する。

### 10.2 Workers Free CPU Decision Gate

Workers Free 10ms CPUとCurrent PBKDF2が両立しない可能性がある。

必須:

1. Local profile
2. Cloudflare temporary deployed Worker
3. Observability / Workers Logs等でrepresentative signup/login CPU確認
4. Current strengthのままPASSするか判定

FAIL時:

- iterationsを勝手に下げない
- plaintext/fast hashへ置換しない
- Auth依存WaveをDecision Gateとして止める
- Auth非依存のschema/docs/test準備は継続してよい
- PR Aを完了扱いにしない

### 10.3 Capability Token

Sandbox Token / User Session TokenへPassword PBKDF2を使わない。

初期標準:

```text
>=256-bit cryptographically secure random token
DB persistence = SHA-256 digest only
Raw token = issuance response only
```

Raw Token / digestをlogしない。

### 10.4 Session TTL

Current parityとして独立User Session TTLを新設しない。

Phase 3では少なくとも次でinvalidationする。

- logout
- account/role/status change where Current requires
- Sandbox Reset
- Sandbox expiry

Public Sandbox TTLがPublic session lifetimeの上界となる。

Session TTL教材を追加するならNew Phase 3 BehaviorとしてNormative Spec changeを別Decisionで行う。

### 10.5 Initial Auth

Current Scenario `initialSession`をBackend Bearer Token環境でも再現する。

Create/Reset responseは必要な場合だけfresh initialAuthを返す。

Raw Session Tokenはresponse時だけ返し、DBはdigestのみ。

### 10.6 Guest Cart Merge

Signup/Login + Guest Cart merge + Session creationのCurrent transaction invariantを保持する。

---

## 11. API Surface

PathはOpenAPI確定時に最終固定する。Capability欠落を先に防ぐ。

### 11.1 Platform

```text
GET /v1/health
GET /v1/version
GET /v1/openapi.json
GET /v1/scenarios
```

### 11.2 Sandbox / QA Control

```text
POST   /v1/test/sandboxes
GET    /v1/test/sandboxes/current
POST   /v1/test/sandboxes/current/reset
DELETE /v1/test/sandboxes/current

PUT    /v1/test/clock
PUT    /v1/test/payment-delay
PUT    /v1/test/payment-fault

GET    /v1/test/inspect/orders
GET    /v1/test/inspect/variants
GET    /v1/test/inspect/review-summary
```

Public controlはallowlist / boundされた操作だけ提供する。

### 11.3 Auth / Account

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

### 11.4 Storefront

```text
GET /v1/home
GET /v1/categories
GET /v1/categories/:categoryId
GET /v1/brands
GET /v1/products
GET /v1/products/:productId
GET /v1/products/:productId/reviews
GET /v1/search-suggestions
```

Current filters / facet / pagination / pageSize contractをTraceability Matrixで固定する。

### 11.5 Cart

```text
GET    /v1/cart
POST   /v1/cart/items
PATCH  /v1/cart/items/:itemId
DELETE /v1/cart/items/:itemId
POST   /v1/cart/price-changes/accept
```

### 11.6 Checkout / Payment

Current stateful checkoutをtransportへ写像する。

例:

```text
POST /v1/checkout/sessions
GET  /v1/checkout/sessions/active
PUT  /v1/checkout/sessions/:id/address
PUT  /v1/checkout/sessions/:id/payment
POST /v1/checkout/sessions/:id/confirm
POST /v1/checkout/sessions/:id/payment/resume
POST /v1/checkout/sessions/:id/payment/retry
```

Actual routeはOpenAPIでCurrent call semanticsへ合わせて確定する。

### 11.7 Orders

```text
GET /v1/orders
GET /v1/orders/:orderId
```

### 11.8 Customer Review

```text
GET    /v1/order-items/:orderItemId/review-eligibility
POST   /v1/reviews
PATCH  /v1/reviews/:reviewId
DELETE /v1/reviews/:reviewId
```

Current UIが使っていないgeneric customer review list/detailを便利APIとして無断追加しない。

### 11.9 Admin

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

BulkはCurrent partial-success semanticsを保持する。

---

## 12. Transaction Model

### 12.1 Existing TransactionRunnerを機械移植しない

Current callback型`ApplicationTransactionRunner`をD1へ同じ形で持ち込まない。

禁止例:

```text
transactionRunner.run(async () => {
  await repositoryA.update() // auto-commit
  await repositoryB.insert() // auto-commit
  await repositoryC.update() // failure
})
```

Backend atomic operationは、必要なread / validation後にPrepared Statement群を組み立て、D1 `batch()`等のall-or-nothing境界で実行する。

### 12.2 Atomic Boundary外Read

batch外へ出してよいのは以下に限定する。

- request schema validation
- immutable/reference data
- atomic boundary内で再検証される前提のpre-read

在庫、version、current state、sequence uniqueness等のmutable-state predicateをpre-readだけで確定しない。

### 12.3 Guard Failure Contract

D1 `batch()`にstatementを並べただけでは不十分。

特に、

```text
UPDATE ... WHERE stock >= ? AND version = ?
```

が0 row更新してもSQL errorとは限らない。

**0-row conditional UPDATEをrollback signalとして扱ってはいけない。**

Guard不成立がaggregate全体を拒否すべき場合、同一atomic boundary内でstatement failureへ変換するか、single safe SQL / constraint / trigger等でall-or-nothingを保証する。

Post-commit後にaffected rowsを見てerrorを返すだけでは不十分。

### 12.4 Guard対象

- insufficient stock
- stale expected version
- invalid mutable state transition
- sequence conflict
- idempotency conflict where mutation must abort
- last-admin protection where concurrent mutation can violate invariant

### 12.5 Guard Failure DoD

```text
Guard failure
-> inventory unchanged
-> history unchanged
-> order unchanged
-> payment unchanged
-> shipment unchanged
-> review summary unchanged where applicable
-> idempotency state inconsistentなし
```

### 12.6 Transaction Invariant Inventory

Current `transactionRunner.run(...)`全call siteをPR A Wave A1で棚卸しする。

最低成果物:

```text
Current Transaction Label
Call Site
Normative / Application invariant
Current all-or-nothing / partial-success semantics
D1 Command / HTTP orchestration
Mutable Guard
Rollback Test
```

最低対象:

- Login / Signup + Guest Cart Merge + Session
- Product aggregate create/update/status/delete
- Category / Brand mutation protection
- Inventory adjustment + Inventory History
- Checkout start / order creation / payment finalization / retry
- Order + Shipment + Order History
- Review + Review History + Review Summary
- User role/status + Session invalidation + Checkout invalidation
- Last Admin protection
- Order Number Sequence

PR AでInventory未完成のまま完了扱いにしない。

---

## 13. Checkout / Payment / Idempotency

### 13.1 Stateful Checkoutを維持する

Backend化でCheckoutを単発`POST /orders`へ単純化しない。

Current state transitionをTraceabilityしてAPIへ写像する。

### 13.2 Business Idempotency

Order creation / payment mutation等、network retryでduplicate side effectが危険なwriteにはOperation-specific `Idempotency-Key`を要求する。

Contract:

```text
same key + same actor + same operation + same payload
-> same result replay

same key + same actor + same operation + different payload
-> 409
```

### 13.3 Nullable Actor禁止

Business idempotency scopeにnullable `user_id`を使わない。

Guest CheckoutはCurrent Non-goalなので無断追加しない。

### 13.4 Payment Gateway Side Effect

Mock Payment Gateway callもduplicate retryで二重化させない。

確認:

- duplicate order submit
- duplicate resume
- duplicate retry
- response-loss retry

### 13.5 Inventory Conflict

stock=1へ2 concurrent checkoutを行い、成功は最大1つにする。

loser側はstable conflict errorを返し、partial mutationを残さない。

### 13.6 Order Number

Asia/Tokyo business dateをCurrent semanticsとして維持し、concurrent allocationでもuniqueにする。

### 13.7 Public Payment Delay

Public maxは初期5000ms。

```text
0     PASS
5000  PASS
5001  422
```

長時間delayはLocal-only。

delay待機中にDB transactionを保持しない。

---

## 14. Time / Clock

### 14.1 Persistence

UTCで保存する。

### 14.2 Business Calendar

Current business semanticsでAsia/Tokyoを使用する箇所は維持する。

### 14.3 Test Clock

Sandboxごとにdeterministic Test Clockを持つ。

- sale expiry
- business date
- order number
- scenario state

等をCurrent behaviorと整合させる。

Worker global mutable clockを使わない。

---

## 15. Error Contract

### 15.1 Stable Error Envelope

最低:

```json
{
  "error": {
    "code": "STABLE_CODE",
    "messageKey": "optional.current.message.key",
    "retryable": false,
    "requestId": "..."
  }
}
```

Actual shapeはOpenAPIで固定する。

### 15.2 HTTP Mapping

Current Application Errorの意味をHTTP statusへ写像する。

例:

- validation -> 400 / 422をoperation contractで固定
- unauthenticated -> 401
- forbidden -> 403
- cross-sandbox resource -> 404
- expired sandbox -> 410
- optimistic/inventory/idempotency payload conflict -> 409
- rate limit -> 429
- temporary DB unavailable -> 503 + retryable true

### 15.3 D1 Transient Failure

read-only retryはPlatformの挙動を前提にしてもよいが、Application側で無制限retryしない。

writeはblind retryしない。

safe retryが必要なwriteはsame Idempotency-Key contractと組み合わせる。

known temporary D1 errorはstable 503へmapする。

---

## 16. CORS / Browser Contract

Pages SPAとStandalone Workerはcross-originを初期構成とする。

### 16.1 Required CORS

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

`Access-Control-Max-Age`はbounded値を設定してよい。

### 16.2 Error Response CORS

401/403/404/409/410/422/429/500/503でもCORS headersを付け、Browserがmachine-readable errorを読めるようにする。

### 16.3 Request ID

Server-generated `X-Request-Id`をCanonical correlation IDとする。

Client supplied request IDをCanonical IDへ無条件採用しない。

---

## 17. Web Migration Strategy

PR BでWebをAPI-backedへ移行する。

### 17.1 Authority

Backend移行後、WebではServerをauthoritativeとする。

```text
Before
Web UI -> Application -> Dexie

After
Web UI -> Application/API Client -> Worker -> D1
```

PresentationへAPI URLを直書きしない。

### 17.2 Environment

```text
local
-> local Worker + local D1

preview
-> production Worker initial strategy + fresh Sandbox

production
-> production Worker + production D1
```

`EXPO_PUBLIC_API_BASE_URL`等で明示する。

### 17.3 Dexie

Production authoritative persistenceからDexieを外す。

ただし、以下まで一律禁止しない。

- presentation-only preference
- one-time notice
- non-authoritative UI state
- Platform-specific storage failure training if explicitly isolated

Backend identity token storageとPresentation local storageの責務を分離する。

### 17.4 Browser Bootstrap

PR Bは少なくとも次を扱う。

- Sandbox create/reuse/expiry
- pending Create Idempotency-Key
- Create response-loss recovery
- Sandbox Token storage
- initialAuth token handling
- Reset pending token ordering
- expired Sandbox recovery

### 17.5 Duplicate Orchestration禁止

Current Business LogicをBrowserとServerへ二重実装しない。

Browserはvalidation UXやtransport orchestrationを持てるが、authoritative invariantはServerへ寄せる。

---

## 18. Current QA Runtime Compatibility

Backend必須化後、Static Web artifactだけではCurrent Required Runtimeを再現できない。

PR BではCurrent QA FoundationをBackend-aware化する。

### 18.1 Formal Playwright

Local Formal E2Eは以下をdeterministically起動する。

```text
Web dist
Local Worker
Local D1
Fresh Sandbox
```

Formal TestのfixtureがScenario reset / auth tokenをBackend Contract経由で扱えるようにする。

### 18.2 Training Web

Current `playwright.training.config.ts`のFormal Runtimeとのport分離を維持する。

Training Web baselineもBackendが必要になるため、Training専用Web runtimeとFresh Sandboxを準備する。

TrainingがFormal Sandboxを共有しない。

### 18.3 UI Review

UI Review desktop/tablet/mobile/small-mobileもfresh deterministic Sandboxでcaptureする。

同時実行でstate collisionしない。

### 18.4 Production Smoke

Production build smokeでもBackend dependencyを明示し、単に`index.html`がserveできるだけをProduct smoke PASSとしない。

### 18.5 Native

NativeはPhase 3 Backend migration対象外。

Current Native SQLite regressionはそのまま維持する。

Web Backend化のためにNative Repository/Applicationを不用意に壊さない。

---

## 19. Agentic QA Backend-aware Runtime Contract

これはPR Bの必須Compatibility Scopeとする。

### 19.1 Current Problem

Current Official Black-box preparationはSource-free Web Prepared Targetを作り、trusted HostがRuntime URLへhandoffする。

PR B後はFrontend artifactだけではScenario Shop runtimeが成立しない。

必要Runtime:

```text
Prepared Web artifact
+
Backend Worker runtime
+
D1 state
+
Fresh Sandbox
```

### 19.2 Prepared Target Identity

Backendが変わったらOfficial Target Identityも変わらなければならない。

少なくともtrusted runtime identityへ次をbindする。

```text
frontend_artifact_sha256
backend_artifact_sha256 or immutable Worker version identity
backend_api_origin
schema_version
seed_version
runtime_variant_id
```

Remote Production Workerを使う場合も、mutable aliasだけでBenchmark Identityを成立させない。Immutable deployment/version identityをtrusted receiptへ含める。

### 19.3 Runtime Origins

Backend-aware Webでは正当なRuntime Originが最低2つになる。

```text
Web origin
API origin
```

Prepared Target `allowed_origins` / Host-trusted resource boundaryへAPI Originを含める。

ただしAllowed Originを広く`*`へするのではなく、actual prepared runtimeへ必要なoriginだけをtrusted inputとして固定する。

### 19.4 Source-free Boundary

Black-box RunnerへBackend Sourceを渡さない。

Runner-visible:

- learner-safe specification
- challenge/runbook
- scored skill
- prepared runtime URL
- runtime-visible API behavior where tool scope permits

Runner-hidden:

- backend source
- D1 schema source where forbidden by challenge/tool profile
- answer key
- instructor patch
- secret/token digest
- internal log not allowed by profile

### 19.5 Deterministic Preparation

Repository-side preparationは必要に応じて次をdeterministically準備する。

```text
Disposable source
↓
Baseline Web build
↓
Backend local build/runtime
↓
Fresh local D1 migration
↓
Fresh Sandbox / Initial State
↓
Baseline sanity
↓
Patch apply
↓
Patched Web/backend build as touched scope requires
↓
Fresh deterministic Initial State
↓
Prepared Target artifact/hash
↓
Source cleanup
↓
Trusted Host handoff
```

Challenge patchがFrontendだけを触る場合、Backend SourceをRunner artifactへ含める必要はない。

Backendを触るScored Challengeを将来追加する場合は別Benchmark contractで設計する。

### 19.6 Harness Ownershipを維持する

Backend lifecycleが増えても、Repository HarnessがCoding Agentを起動・wrap・retry・orchestrateしない。

Runtime preparation / readinessはSupporting Harness、Agent session ownershipはHostのまま。

### 19.7 Initial State Bootstrap

Current `scored_initial_state_deterministic_reset_sanity`相当をBackend Sandbox Resetへ接続する。

最低確認:

- requested Scenario
- fresh Sandbox
- expected initialAuth
- reset determinism
- Web readiness
- API readiness

### 19.8 Agentic QA Required Gate

PR B Final Gateで最低:

- Current deterministic preparation test PASS
- backend-aware Prepared Target hash/identity test
- allowed origin / API origin validation
- source-free artifact validation
- fresh Sandbox initial-state test
- resource boundary negative probe contract

Official model-backed Scored RunはHost Capabilityが提供できる場合だけ実施する。Host不足をRepository側で偽PASSへしない。

---

## 20. Screen Catalog / Visual Specification Compatibility

### 20.1 Screen Catalogの役割

Screen CatalogはWeb migrationのcoverage indexとして利用する。

各Product Screenについて、Current UIを成立させるBackend CapabilityがTraceability Matrixに存在することを検証する。

### 20.2 Canonical Screenshot

Datasource変更だけを理由にCanonical Screenshotを再生成・更新しない。

```text
Dexie -> API
```

がVisible Behaviorを変えないなら、既存Canonical Referenceを維持する。

### 20.3 New Visible State

Network化によって新しいExpected Visible Stateを追加する場合は、Current change processへ従う。

```text
Normative Spec
↓
BR / AC
↓
Risk / Test Design
↓
Implementation
↓
Screen Contract / Visual Registry where required
↓
Canonical Visual Reference
```

例:

- API loading
- retry
- temporary backend unavailable
- expired Sandbox user-facing recovery

これらを「Backendでは普通」として無断追加しない。

### 20.4 Final Visual Gate

PR Bで`validate:spec-visuals:final`とCurrent UI ReviewをRequired Foundationとして維持する。

---

## 21. Curriculum / Training Integration

PR CでPhase 3 Test Targetを正式Curriculumへ接続する。

### 21.1 方針

Current Competency IDを必要以上に増やさない。

まず既存Competencyを拡張する。

特に:

```text
C05 Test Layer Selection
-> API / Backend Integration / DB Contractを含める

C09 Failure Analysis
-> Request ID / HTTP / Worker / D1 evidenceを含める

C12 Continuous Execution Design
-> API contract / migration / backend gateを含める
```

必要性が実証されるまでC13以降を追加しない。

### 21.2 Curriculum Topics

最低限次を学習可能にする。

1. HTTP request / response / status
2. API validation / negative test
3. AuthN / AuthZ
4. OpenAPI / Contract Test
5. Sandbox / deterministic reset
6. D1 schema / FK / UNIQUE / CHECK
7. Migration
8. Transaction / rollback
9. Idempotency
10. Inventory conflict / basic concurrency
11. Retryable vs non-retryable error
12. Request ID / local log investigation
13. Free quota / CI design

### 21.3 Local-first Training

Curriculum hands-onはCloudflare account必須にしない。

```text
Local Wrangler
+
Local D1
+
Training Web/API Client
```

を標準とする。

Public Workerはdemonstration / optional targetとして利用できるが、受講者へCloudflare secretを配布しない。

### 21.4 Training Assets

必要に応じて次を追加する。

```text
training/api/**
training/backend/**
docs/curriculum/test-automation/**
scripts/training/**
```

Playwright Request API、Node HTTP Client、Vitest integration等からCurrent learning goalに最小のものを選ぶ。

新たな外部APIテストツールを必須Dependencyにしない。

### 21.5 Training / Formal Separation

Training exerciseがFormal RegressionやProduction Workflowへ意図せず混入しないCurrent boundaryを維持する。

Training Copyのleast-privilege / no-production-secret policyも維持する。

### 21.6 Curriculum Validation

PR Cは`validate:curriculum`を更新し、Navigation / Rubric / Training Entry / Script / Workflow Templateの整合をfail-closeで確認する。

---

## 22. Public Operation Hardening

### 22.1 Route-class Rate Limit

最低クラス:

```text
Sandbox Create
Sandbox Reset
Auth
Business Mutation
Read
```

Create/Resetを通常Readより厳しくする。

Cloudflare Freeで追加Serviceが必要になる複雑なRate Limiterを先回りして導入しない。

### 22.2 Bounded Input

- body size
- string length
- array length
- pagination
- bulk size
- idempotency key length / format
- Public payment delay

をboundする。

### 22.3 Active Sandbox Ceiling

Hard ceiling到達時は新規Sandbox作成を503等で拒否し、既存Sandbox利用を優先する。

### 22.4 Public Availability

best-effort availabilityとする。

SLAを約束しない。

### 22.5 Public禁止事項

Public環境で禁止:

- Load
- Stress
- Soak
- DoS-like
- aggressive fuzzing
- destructive security test
- rate limit bypass
- long-held request abuse
- real personal data / secret投入

これらはLocalで行う。

### 22.6 Synthetic Test Data Only

Public Sandboxへ実データ / 秘密情報を投入しない。

禁止例:

- 実名
- 実住所
- 実電話
- 実メール
- 他Serviceで再利用するpassword
- API key
- access token
- secret

README / API Guide / Curriculumへ明示する。

---

## 23. Cleanup

### 23.1 Cron

Expired Sandbox cleanupにCronを使ってよい。

### 23.2 Bounded Cleanup

1回のCron invocationで次をboundする。

- processed sandbox count
- D1 query count
- rows_written
- Worker CPU

大量Sandboxを1回で全削除するloopを作らない。

### 23.3 Tombstone

Active child dataset削除後も一定期間Sandbox tombstoneを残し410 semanticsを提供する。

その後hard deleteして404へ移行する。

---

## 24. Observability

### 24.1 Server

最低:

- structured log
- request ID
- operation ID
- status
- latency
- stable error code
- retryable
- D1 query count in dev/test
- D1 rows read/write measurement path

禁止:

- Raw Sandbox Token
- token digest
- Raw User Session Token
- Authorization header
- password
- password hash
- X-Sandbox-Token

Create Idempotency-KeyもRaw logしない。必要ならnon-secret fingerprintへ変換する。

### 24.2 Public Learner

Publicでは、

- request ID
- HTTP status
- error code
- reproducible Sandbox Scenario

をEvidenceにする。

### 24.3 Local Learner

Localでは、

- structured Worker log
- D1 error
- migration
- constraint
- request ID correlation

を学習可能にする。

### 24.4 Remote CPU Gate

PBKDF2 CPU GateはObservabilityを取得可能なtemporary deployed Workerで確認する。

Workers Logsを取得できないPreview URLだけをCPU Gate正本にしない。

---

## 25. Environment Strategy

### 25.1 Local

```text
Expo Web local/static dist
Worker local
D1 local
Fresh Sandbox per execution context
```

Required functional/integration testの主対象。

### 25.2 Remote Compatibility Gate

PR A Wave A1/A10で最小限のCloudflare Runtime検証を行う。

目的:

- PBKDF2 CPU
- actual Worker upload/startup
- compressed bundle
- Runtime固有差分

本格的なper-PR D1 Preview環境は初期導入しない。

### 25.3 Production

```text
Pages production
Worker production
D1 production
```

Public Test Target。

### 25.4 PR B Preview

初期戦略:

```text
Pages Preview
-> production Worker
-> fresh Public-safe Sandbox
```

PR BでBackend breaking changeを同時に入れないことが前提。

必要性が出た場合だけDedicated Preview Worker/D1を別Planで判断する。

---

## 26. Worker Bundle / Startup Gate

### 26.1 Local/CI

`wrangler deploy --dry-run`等でcompressed bundle sizeを計測する。

Free platform limitを超えたらFAIL。

### 26.2 Remote

CPU Gateと同じtemporary deploymentを再利用してよい。

- actual upload success
- actual startup success
- startup limit failureなし

終了後temporary Workerをcleanupする。

---

## 27. Free Quota Measurement Gate

論理Seed object数ではなく、**final schema / final indexでD1が返すactual metadata**を正本とする。

Index maintenanceによるwrite amplificationとDELETEを含める。

### 27.1 Public Scenario Metrics

- each public create actual rows written
- each public reset actual rows written
- Create idempotency / token rotation actual rows written
- representative mutations actual rows written
- active -> expired cleanup
- tombstone hard delete

### 27.2 Route Metrics

- invocation-total D1 queries
- rows read
- rows written
- representative CPU where measurable

### 27.3 Operational Metrics

- cleanup queries / CPU / processed Sandbox
- Worker compressed bundle
- Worker startup outcome
- Remote PBKDF2 CPU

### 27.4 Estimated Daily Capacity

- sandbox creations/day
- recovery retries/day
- resets/day
- learner sessions/day

### 27.5 Hard Gate

- 1 invocation total <= D1 query limit
- bound params <= limit
- actual rows_writtenでPublic daily write quotaに合理的余裕
- Workers Free representative CPU
- Current PBKDF2 Remote CPU PASS
- Worker bundle/startup PASS

Free quotaを100%使い切るcapacityを目標にしない。

---

## 28. CI / CD Strategy

### 28.1 Current Foundation First

PR A/B/CはCurrent Required Gateを置き換えず、その上へPhase 3 Gateを追加する。

`.github/workflows/ci.yml`のCurrent jobsを不要に統合・削除しない。

### 28.2 PR A Required Gate

最低:

1. Current applicable Foundation Gate
2. Backend lint/typecheck
3. Wrangler config validation
4. Worker bundle dry-run / compressed size
5. fresh local D1 migration
6. Scenario classification
7. Backend-portable Scenario parity smoke
8. Public Scenario Allowlist
9. Public Create/Reset single-atomic validation
10. Backend Unit
11. D1 Repository/Command Integration
12. API Integration
13. OpenAPI Contract
14. Spec/Application/Web/Screen -> API Traceability
15. Transaction Invariant Inventory validation
16. Composite Sandbox PK/FK/UNIQUE
17. sandbox-aware JOIN isolation
18. Cross-Sandbox 404
19. AuthN/AuthZ
20. Signup/Login/current session invalidation
21. initialAuth
22. Capability Token digest/non-leakage
23. Create response-loss recovery
24. Reset token-order/recovery
25. Guest Cart merge
26. Home Catalog
27. Category equivalent
28. Product Review List
29. Address Suggestion
30. Cart Price Change Acceptance
31. Review Eligibility
32. Checkout state flow
33. Checkout write Idempotency contract
34. duplicate submit same Order
35. duplicate retry no duplicate gateway call
36. Payment failure/retry
37. D1 atomic rollback
38. mutable-state guard inside atomic operation
39. 0-row guard failure rollback
40. inventory conflict
41. order number concurrency
42. review summary atomicity
43. user/session/checkout invalidation atomicity
44. Admin parity
45. Bulk partial-success semantics
46. fault/payment delay parity
47. Public delay bound
48. timeout/abort recovery
49. Test Clock / Asia-Tokyo business date
50. Error Envelope / retryable
51. CORS OPTIONS / error CORS / exposed Request ID
52. invocation-total query budget
53. Create/Reset statement/bind budget
54. final-index rows read/write budget
55. cleanup budget
56. PBKDF2 local profile
57. observable Cloudflare PBKDF2 Gate
58. actual Worker upload/startup Gate
59. Existing Web regression
60. Current Native regression required by policy

### 28.3 PR A Deploy

```text
Required Gates PASS
↓
D1 migration
↓
Worker deploy
↓
Public-safe fresh Sandbox
↓
API smoke
↓
API parity smoke
```

### 28.4 PR B Required Gate

最低:

1. Current Foundation Gate
2. Web API client unit
3. local Worker + local D1
4. browser -> Worker -> D1 E2E
5. fresh Sandbox per independent suite
6. cross-role
7. auth / initialAuth reset
8. Create response-loss recovery
9. Reset failure/response-loss token handling
10. Home/Catalog/Product Review
11. Address Suggestion
12. Cart Price Change Acceptance
13. Checkout/Payment
14. duplicate submit/idempotency E2E
15. Review Eligibility/Review
16. Admin E2E
17. Bulk partial-success
18. Browser CORS preflight
19. Browser X-Request-Id visibility
20. Accessibility
21. Mobile Web boundary
22. Production-build smoke
23. Dexie production guard
24. duplicate server business orchestration guard
25. API base URL validation
26. Guide Public/Local/Platform-specific display
27. UI Review 4 viewports backend-aware
28. Final Visual Specification gate
29. Training Web baseline backend-aware
30. Agentic QA deterministic preparation backend-aware
31. Prepared Target backend identity binding
32. Allowed origin / API origin validation
33. Source-free artifact validation
34. Current Native regression

### 28.5 PR C Required Gate

最低:

1. Current Foundation Gate
2. validate:curriculum
3. Training typecheck
4. API/Backend Training baseline
5. no-production-secret boundary
6. Training Copy validation
7. Formal Regression非混入
8. Curriculum navigation/rubric consistency
9. Local Wrangler/D1 hands-on reproducibility
10. Final documentation links

---

## 29. Test Strategy

### 29.1 Unit

- validation
- domain policy
- permission
- error mapping
- retryable semantics
- clock
- timezone
- idempotency semantics
- scenario classification
- token generation/digest
- payment delay bound

### 29.2 Repository / Command Integration

- CRUD
- composite PK/FK
- sandbox-scoped UNIQUE
- sandbox-aware JOIN
- CHECK
- optimistic version
- atomic rollback
- mutable-state guard inside atomic boundary
- conditional update zero-row rollback
- inventory/history
- sequence uniqueness
- token digest/rotation
- business idempotency actor not-null
- Create operational idempotency

### 29.3 API Integration

- schema
- status
- auth
- authorization
- sandbox scope
- CORS
- Request ID
- error/retryable
- state transition
- idempotency
- fault injection
- initialAuth
- token non-leakage
- response-loss recovery

### 29.4 Scenario

- Backend-portable Current Scenario parity
- Platform-specific exclusion preserved
- Public allowlist only

### 29.5 Public Create / Reset

For every Public Scenario:

```text
create with Idempotency-Key
-> atomic
-> deterministic
-> initialAuth valid
-> digest only persisted
-> query/bind budget PASS

response loss
-> same key retry
-> no duplicate Sandbox
-> same sandboxId
-> fresh token recovery

mutate
reset
-> atomic restore
-> old sessions invalid
-> fresh initialAuth
-> budget PASS
```

### 29.6 Expiry

```text
active
-> expired
-> 410 tombstone
-> hard delete
-> 404
```

### 29.7 Concurrency / Atomicity

- stock=1 two checkout
- duplicate idempotency sequential/concurrent
- stale version
- mutable predicate not pre-read-only
- conditional update 0-row no partial commit
- order number uniqueness
- review summary no partial commit
- user/session invalidation no partial commit

### 29.8 Bulk

Current max selectionを1巨大D1 transactionへ押し込まない。

bounded independent HTTP mutationへ分解し、Current partial-success resultを再現する。

### 29.9 Visual / Runtime

- backend-aware formal E2E
- backend-aware Training
- backend-aware UI Review
- Current visual final gate
- Agentic QA prepared runtime

---

## 30. Implementation Waves

### PR A — Backend Foundation + Current Web API Parity

#### Wave A0: Current Foundation Rebaseline

- latest main SHA固定
- Current Required Gate inventory
- Current Capability inventory
- Screen/API traceability seed
- Transaction Invariant inventory seed
- Scenario classification seed
- Current Foundation baseline result記録

#### Wave A1: Backend Skeleton / Decision Gates

- Hono / Wrangler skeleton
- RequestContext
- OpenAPI方式
- Local Worker/D1
- PBKDF2 local profile
- observable temporary Worker CPU Gate
- Worker bundle/startup Gate

PBKDF2 FAILならAuth-dependent workを止めるが、独立作業は継続する。

#### Wave A2: D1 Schema / Sandbox

- Table Ownership Matrix
- Composite PK/FK/UNIQUE/Index
- sandbox-aware JOIN
- migration
- atomic Command pattern
- guard failure pattern
- Seed adapter
- Scenario classification
- Public allowlist
- capability token digest
- Create/Reset idempotency/recovery
- tombstone/cleanup

#### Wave A3: Auth / Account

- signup/login/logout/me
- active-account guard
- guest merge
- profile/address
- Address Suggestion
- no independent Current-parity Session TTL

#### Wave A4: Storefront / Cart

- Home
- search/facet/pagination
- category equivalent
- Product Review List
- Cart
- price change acceptance

#### Wave A5: Checkout / Payment / Orders

- stateful checkout
- atomic mutations
- required idempotency
- gateway side-effect suppression
- retry
- inventory conflict
- order number concurrency

#### Wave A6: Reviews

- Review Eligibility
- create/update/delete
- Admin Review
- Review Summary atomicity

#### Wave A7: Admin

- Overview
- Catalog
- Inventory
- Orders
- Reviews
- Users
- Bulk partial-success transport

#### Wave A8: QA Control

- Clock
- Payment Delay
- Payment Fault
- Inspect endpoints
- metadata parity

#### Wave A9: Public Hardening

- CORS
- Request ID
- rate limit policy
- payload bounds
- active ceiling
- no-secret logs
- Synthetic Test Data Only
- quota metrics

#### Wave A10: Contract / Remote / Final

- OpenAPI
- Traceability Matrix complete
- Transaction Invariant Matrix complete
- Scenario guide
- remote CPU/runtime rerun
- current Foundation regression
- production deploy/smoke

### PR B — Web Backend Integration + Current QA Runtime Compatibility

#### Wave B0: Current Foundation Baseline

- Current Web/Training/UI Review/Agentic preparation baseline
- visual final gate baseline

#### Wave B1: API Client / Sandbox Bootstrap

- API base URL
- Sandbox create/reuse/expiry
- pending Create key
- initialAuth
- resetPending
- CORS/Request ID

#### Wave B2: Storefront / Auth / Account / Cart

- Current capability migration
- no duplicate business logic

#### Wave B3: Checkout / Order / Review

- required Idempotency-Key
- network retry/recovery
- Review Eligibility

#### Wave B4: Admin

- Overview
- Bulk orchestration

#### Wave B5: Test Control / Dexie Boundary

- thin backend control wrapper
- production Dexie persistence removal
- platform-specific storage exercise isolation

#### Wave B6: Formal / Training / UI Review Runtime

- one fresh Sandbox per independent execution
- Formal fixtures backend-aware
- Training runtime backend-aware
- UI Review backend-aware
- production smoke backend-aware

#### Wave B7: Agentic QA Prepared Runtime

- backend runtime identity
- frontend/backend artifact binding
- schema/seed binding
- API origin allowed origin
- local D1/sandbox bootstrap
- source-free validation
- initial state deterministic reset
- Current harness ownership維持

#### Wave B8: Visual / Guide / Final

- Guide Scenario classification
- no unnecessary canonical screenshot churn
- visual final gate
- Current Foundation full regression
- preview smoke

### PR C — API / Backend QA Curriculum Integration

#### Wave C1: Learning Design

- existing Competency mapping
- API/Backend QA outcomes
- local-first policy
- no Cloudflare account requirement

#### Wave C2: Curriculum Content

- HTTP/API
- AuthN/AuthZ
- Contract
- D1/migration
- transaction/idempotency/concurrency
- Request ID investigation

#### Wave C3: Training Assets

- API exercises
- backend exercises where required
- local Wrangler/D1 bootstrap
- expected failure exercise

#### Wave C4: CI / Validation

- Training baseline
- curriculum validator
- Training Copy safety
- no production secret

#### Wave C5: Final Delivery

- navigation
- rubric consistency
- instructor references
- current Foundation regression

---

## 31. Expected File Impact

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
src/domain/**   # pure shared change only if required
src/seeds/**    # seed SSOT / classification only if required
```

### PR B

```text
src/application/**
src/infrastructure/**
src/bootstrap/**
src/presentation/**
src/test-controls/**
src/seeds/metadata.ts
app/**
e2e/**
playwright.config.ts
playwright.training.config.ts
training/playwright/** if runtime bootstrap changes are required
scripts/agentic-qa/**
tests/runtime/**
tests/**
README.md
docs/spec/**
docs/reference/**
docs/PROJECT_CONTEXT.md
package.json
.github/workflows/ci.yml
```

### PR C

```text
docs/curriculum/test-automation/**
training/api/**
training/backend/** if needed
training/playwright/** if API-linked exercises need it
scripts/training/**
scripts/validate-curriculum.ts
playwright.training.config.ts if required
.github/workflows/** training template/current training gate only if required
README.md
docs/PROJECT_CONTEXT.md
package.json
```

変更不要な領域を広げない。

---

## 32. Definition of Done

### 32.1 Current Foundation

- latest implementation baseがCurrent main
- Current Required Gate Inventory完成
- Current Foundationに新規Regressionなし
- `validate:spec` PASS
- `validate:spec-visuals:final` PASS
- `validate:curriculum` PASS where applicable
- Current Security Gate PASS
- Current Formal Web regression PASS
- Current Training baseline PASS
- Current Agentic QA deterministic preparation PASS
- Current Native policy PASS

### 32.2 Backend

- Standalone Worker + D1
- Free Plan constraints revalidated
- Fresh local setup
- Migration reproducible
- Ownership Matrix
- Composite Sandbox relational integrity
- sandbox-aware JOIN
- Backend-portable Scenario parity
- Platform-specific Scenario semantic preservation
- Public Allowlist
- Public Create/Reset single atomic
- no half-seeded Public Sandbox
- Create response-loss recovery
- Reset token ordering/recovery
- expiry tombstone
- Auth/Role
- initialAuth parity
- capability token digest-only persistence
- no token log
- Current password security property preserved
- PBKDF2 Remote CPU Gate PASS
- Current API parity
- Stateful Checkout
- Idempotency
- duplicate gateway side effectなし
- Inventory conflict
- Order number concurrency
- Review Summary atomicity
- Admin parity
- Bulk partial-success
- CORS preflight
- stable Request ID
- OpenAPI
- Worker bundle/startup Gate PASS

### 32.3 Transaction

- Current Transaction Invariant Inventory完成
- callback TransactionRunnerをD1へ偽装移植していない
- mutable predicateをatomic boundary内でguard/revalidate
- conditional update 0-rowをsuccess rollback signalと誤認していない
- Guard failureがsame atomic boundaryでrollback
- partial commit test PASS

### 32.4 Web

- Web authoritative persistence = Worker/D1
- production business persistenceからDexie除去
- API base URL configuration
- browser -> Worker -> D1 E2E
- cross-origin CORS PASS
- Request ID Browser可視
- response-loss recovery
- Reset token ordering
- initialAuth parity
- Current expected behavior維持
- Guide Scenario availability表示
- Native unaffected

### 32.5 Visual

- Screen CatalogをSupporting coverageとして利用
- Product Screen -> Backend capability mappingに欠落なし
- datasource変更だけでcanonical screenshotを不用意に更新していない
- Visible behavior changeはSpec-first
- UI Review 4 viewports PASS
- Final Visual Gate PASS

### 32.6 Agentic QA

- Prepared WebだけでなくBackend-aware Runtimeとして成立
- frontend artifact identity固定
- backend immutable identity固定
- API origin固定
- schema/seed version固定
- fresh Sandbox initial state
- deterministic reset sanity
- source-free boundary維持
- Backend SourceをBlack-box Runnerへ漏らさない
- Host vs Repository Harness ownership維持
- allowed originsへ必要なWeb/API originだけを含む
- deterministic preparation contract PASS

### 32.7 Curriculum

- API/Backend QA learning outcomesがCurrent Curriculumへ接続
- C05/C09/C12等既存Competencyと整合
- Local-first hands-on
- Cloudflare account/secret必須でない
- Formal/Training分離
- API/Backend Training baseline PASS
- curriculum validator PASS

### 32.8 Public Operation

- Synthetic Test Data Only
- Public禁止事項Document化
- best-effort availability
- Public payment delay bound
- actual final-index quota measurement
- cleanup budget計測
- load/stressはLocal-only

---

## 33. Risks / Decision Gates

### Risk 1: Workers CPU / PBKDF2

Current password securityとWorkers Free CPUが両立しない可能性。

Gate:

- local profile
- observable temporary deployment
- actual CPU/outcome

FAIL時はSecurityを黙って弱めない。

### Risk 2: Current Foundation regression

Backend独自testはPASSしてもVisual/Training/Agentic QA/Nativeが壊れる可能性。

Gate:

- Current Foundation Inventory
- PRごとのFoundation Final Gate

### Risk 3: Agentic QA Target identity drift

Frontend artifactが同じでもBackend deploymentが違えばRuntime behaviorが変わる。

Gate:

- backend immutable identityをPrepared Target/trusted receiptへbind
- API origin/schema/seedも固定

### Risk 4: Agentic QA Source-free boundary leak

Backend起動のためにSourceをRunner-visible artifactへ混ぜる危険。

Gate:

- Web artifactとtrusted runtime identityを分離
- source-free artifact validation
- resource boundary negative probe

### Risk 5: Training runtime collision

Formal/Training/UI Review/Agentic QAが同Sandboxを共有すると並列CIでstateが衝突する。

Gate:

- one independent execution context = one fresh Sandbox

### Risk 6: Curriculum scope creep

Backend追加を理由に大規模な新Curriculum体系を作る危険。

Gate:

- existing Competencyを先に拡張
-新IDは必要性が実証された場合のみ

### Risk 7: D1 write quota

Seed/Reset/Cleanup/Index/Idempotency write amplification。

Gate:

- final schema/index actual rows_written
- Public-safe only

### Risk 8: D1 query/bind

Middleware + business + idempotencyの合計が上限を超える。

Gate:

- invocation total measurement

### Risk 9: Relational isolation bug

Fixed Seed IDがSandbox間で重複する。

Gate:

- Composite PK/FK
- sandbox-aware JOIN
- same logical ID isolation test

### Risk 10: Fake transaction / false guard success

`batch()`利用だけでatomicity完了と誤認する危険。

Gate:

- 0-row conditional update contract
- guard failure -> same-boundary failure
- partial commit test

### Risk 11: Create response loss

Raw Token取得前にresponseを失う危険。

Gate:

- required Create Idempotency-Key
- token digest rotation recovery
- raw token DB保存禁止

### Risk 12: Reset browser token ordering

pre-commit failureでClientだけtokenを失う危険。

Gate:

- resetPending
- success後replace

### Risk 13: Checkout duplicate delivery

Order/Payment side effect重複。

Gate:

- required operation-specific Idempotency-Key
- gateway side-effect de-dup

### Risk 14: Public abuse

Gate:

- bounded input
- route-class policy
- active ceiling
- Public prohibition

### Risk 15: Visual spec churn

Datasource migrationをUI changeと誤認しScreenshot大量更新する危険。

Gate:

- visible behavior change only
- Spec-first

### Risk 16: Shared D1 throughput

Sandbox isolationはthroughput isolationではない。

初期Phaseでは受容し、shardingしない。

### Risk 17: Backend目的化

Infrastructure追加が学習目的を上回る危険。

Gate:

- QA learning valueを説明できないServiceは追加しない

---

## 34. Non-goals

- Native Backend migration
- PostgreSQL-specific isolation/deadlock
- Microservices
- Queue / webhook
- real payment
- OAuth
- Production-grade Security Curriculum全般
- Public Load / Stress / Soak
- arbitrary Public fault injection
- Cancel / Return / Refund
- Guest Checkout
- UI全面再設計
- Public log閲覧API
- Initial D1 sharding
- Current parityではない独立User Session TTLの無断追加
- Platform-specific Scenarioを同じIDでBackend failureへ意味変更
- Bulk全体を1巨大D1 transactionへ押し込む
- Public multi-stage half-seed protocol
- Capability TokenへPassword PBKDF2適用
- Presentation local storageの一律禁止
- Publicで5秒超の任意Payment Delay
- Repository独自Agent Session Manager / LLM wrapper
- Agentic QA HarnessによるCoding Agent orchestration
- Cloudflare accountをCurriculum必須条件にすること
- Datasource変更だけを理由にCanonical Screenshotを全再生成すること

---

## 35. Phase 3後に個別Planで判断するもの

- Native API integration
- API version migration exercise
- richer DB migration challenge
- Contract breaking challenge
- dedicated Security curriculum
- Performance curriculum
- Queue / webhook
- eventual consistency
- richer observability
- multi-guest actor
- Guest Checkout
- PostgreSQL別教材
- Public lightweight large-catalog Scenario
- D1 sharding
- independent User Session TTL教材
- Backend-specific database fault Scenario
- Dedicated Preview D1
- Client correlation ID教材
- Capability Token HMAC化
- Backend-changing Official Scored Challenge

---

## 36. Implementation Stop Conditions

以下のいずれかが発生した場合、AIエージェントは一部だけ実装して完了扱いにせず、**依存する後続だけを止めてDecision Gateとして報告**する。

依存しない検証・ドキュメント・他Wave準備は継続してよい。

```text
PBKDF2 Remote CPU Gate FAIL
Worker Free bundle/startup Gate FAIL
Public default Create/Resetがsingle atomic boundaryへ収まらない
Sandbox Create response-loss recoveryをRaw Token保存なしで成立させられない
Current Transaction InvariantをD1で保証できない
Mutable-state guardをsame atomic boundaryで保証できない
Current Checkout duplicate semanticsをIdempotency Contractで維持できない
Current parityとCloudflare Free constraintが直接矛盾する
D1 actual quota measurementでPublic運用余裕が成立しない
Current Required FoundationにPhase 3起因Regressionが残る
Backend-aware Agentic QA Prepared Runtime identityをtrustedに固定できない
Black-box Source-free boundaryをBackend化後も維持できない
Training/Formal Sandbox isolationをCurrent CI内で成立させられない
```

禁止:

- Securityを黙って弱める
- Current Behaviorを黙って削る
- Public atomicityを黙って緩める
- Paid Plan前提へ黙って切り替える
- Raw Capability TokenをDB保存する
- nullable actorでBusiness Idempotencyを成立させたことにする
- Idempotency-Keyを黙ってoptionalにする
- Agentic QAのHost proofをRepository側で偽装する
- Backend SourceをBlack-box Runnerへ漏らす
- Existing Required Gateを削ってPhase 3 CIを軽くする
- Curriculum validatorを無効化して教材差分を通す
- Canonical ScreenshotをObserved Behaviorへ合わせてSpecを逆転させる
- Overengineeringで制約を隠す

---

## 37. Recommended Final Direction

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

ただし設計中心はCloudflareそのものではない。

中心は、**Current Scenario ShopとCurrent QA Foundationを、決定的に隔離されたBackend-aware QA Sandboxへ拡張すること**である。

実装順序:

```text
Current main / Foundation rebaseline
        ↓
PR A
Backend + D1 + Current Web API Parity
        ↓
PR B
Web -> Backend
+ Formal / Training / Visual / Agentic QA Runtime Compatibility
        ↓
PR C
API / Backend QA Curriculum Integration
        ↓
Phase 3 Complete
```

Phase 3の初期標準:

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
Required Checkout Idempotency-Key
Mock Payment Gateway Duplicate Suppression
D1 Atomic Command / Batch
Mutable-state Guard Inside Atomic Boundary
0-row Conditional Update Is Not Rollback Signal
Guard Failure Rollback
Transaction Invariant Inventory
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
One Fresh Sandbox Per Independent QA Execution
Current Visual Specification Compatibility
Current Training Compatibility
Backend-aware Agentic QA Prepared Runtime Identity
Local-first API / Backend QA Curriculum
```

PR AでAPI parity、Transaction Invariant、Public Sandbox atomicity、response-loss recovery、Capability Token Contract、Checkout Idempotency、Remote CPU Gateを完成させずPR Bへ進まない。

PR BでWebだけ動かして完了とせず、Formal E2E、Training、UI Review、Visual Final Gate、Agentic QA deterministic preparationがBackend-aware runtimeで成立するところまで完了する。

PR Cでは新しいTraining Frameworkを作るのではなく、Current CurriculumへAPI / Backend QAを最小限の追加で接続する。

Current FoundationのどこかがPhase 3によって壊れた場合、そのGateを削除・弱体化するのではなくPhase 3実装側を修正する。

これによりScenario Shopを、Frontend / Backend / Database / Web / Native / API / CI / Visual Specification / Agentic QA / Curriculumを横断してQAを学習できるPublic Test Targetへ拡張する。
