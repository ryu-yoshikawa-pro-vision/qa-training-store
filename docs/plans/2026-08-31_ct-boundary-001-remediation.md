# CT-BOUNDARY-001 Remediation Implementation Plan

## 0. 依頼概要

- 依頼内容: PR #88 で `CT-BOUNDARY-001 = stop` の原因となっている残7 Requirementをすべてremediationし、PR #78を最終再監査できる状態へ進める。
- 背景:
  - PR #78のCurrent auditでは、`FR-AR-003`だけがcoveredで、`FR-AR-001`、`FR-AR-002`、`FR-AR-004`、`NFR-MA-020`、`NFR-MA-021`、`NFR-MA-022`、`NFR-MA-023`の7件がimplementation gapまたはFormal coverage gapとして残っている。
  - `NFR-MA-020` / `NFR-MA-021` は `docs/plans/2026-08-31_nfr-ma-020-021-decision-investigation.md` に基づいてCurrent implementationとGit historyを調査済みである。
  - Owner decisionとして、`D-020` / `D-021` をLiteralに大規模migrationするのではなく、現在守るべき責務境界を新Decisionで明示してsupersedeする。
  - `NFR-MA-023` のCode / Markdown SSOT policyは `D-026` がCurrent decisionであり、新Decisionは追加しない。
- 期待成果:
  - 残7 RequirementのCurrent Requirement、Decision、Production implementation、Formal evidenceが矛盾なく接続される。
  - 大規模なRHF / Zod migration、CSS Modules migration、`global.css`全面整理を行わずに、実際に守るべきArchitecture boundaryを固定する。
  - PR #88 merge後にPR #78へ最新mainを取り込み、`CT-BOUNDARY-001`をRequirement単位で再監査できる状態にする。

## 1. ゴール / 完了条件

### ゴール

PR #88の中で、以下7 Requirementの実装・文書・Formal evidenceの不足をCurrent contractへ整合する。

- `FR-AR-001`
- `FR-AR-002`
- `FR-AR-004`
- `NFR-MA-020`
- `NFR-MA-021`
- `NFR-MA-022`
- `NFR-MA-023`

### 完了条件（DoD）

- [ ] `FR-AR-001`: CheckoutのImage Manifest Path解決責務がInfrastructure RepositoryからApplication Use Caseへ移り、Presentation Requestには内部contextを要求しない。
- [ ] `FR-AR-001`: `CreateOrderForPaymentRequest` と内部 `CreateOrderForPaymentCommand` の役割が実装上でも分離され、Use CaseがClock / generated ID / Manifest resolved value等の内部contextを補完する。
- [ ] `FR-AR-001`: Web / Native RepositoryがCheckoutのPath解決のためにgenerated image manifestへ直接依存しない。
- [ ] `FR-AR-001`: Checkout表示・注文Snapshot・Payment retry等の既存Product behaviorを維持する。
- [ ] `FR-AR-002`: Build生成TypeScript ModuleがRuntime image manifestの正本であることをpositiveなFormal contractで固定する。
- [ ] `FR-AR-002`: Runtime Fetch / Runtime JSON manifest禁止は既存security checkを再利用し、同じ検査を二重実装しない。
- [ ] `FR-AR-004`: supported reset boundaryが1 Browser Context / 1 PageであることをPlaywright harnessのFormal evidenceで固定する。
- [ ] `FR-AR-004`: 複数Tabのatomic resetを新たに保証・実装しない。
- [ ] `NFR-MA-020`: `D-020` をsupersedeする新Decisionを追加し、RequirementをApplication validation ownership中心のCurrent contractへ更新する。
- [ ] `NFR-MA-020`: RHF / Zod利用件数や特定library採用を固定するためのmigration / testを追加しない。
- [ ] `NFR-MA-021`: `D-021` をsupersedeする新Decisionを追加し、RequirementをWeb / Native platform boundary中心のCurrent contractへ更新する。
- [ ] `NFR-MA-021`: CSS Modules全面移行、`global.css`全面整理、Web componentの機械的`.web.tsx`化を行わない。
- [ ] `NFR-MA-022`: Web complex widgetのReact Aria Components境界を、将来のcustom implementation混入を検出できる狭いStatic Contractで固定する。
- [ ] `NFR-MA-023`: `domain_types.md` / `application_contracts.md`等のSSOT表現を `D-026` へ整合する。
- [ ] `NFR-MA-023`: Code / Markdownの意味比較、Markdown生成、全Markdown横断の曖昧な重複検査を追加しない。
- [ ] Product / Test / Requirement / Decisionの変更は上記7 Requirementを閉じるために必要な範囲だけである。
- [ ] PR #78、`docs/12_quality/requirements_traceability.md`、PR #78のRun Artifactは変更していない。
- [ ] Relevant local validationがすべてPASSしている。
- [ ] PR #88のexact head SHAに対するrequired CIが確認済みである。
- [ ] Requirement単位のself-reviewで残gapがない。

## 2. 現状理解と前提

### Current understanding

- PR #88 branchは `investigate/nfr-ma-020-021`。branch名は調査開始時の経緯として維持し、今回のためだけに新branch / 新PRを増やさない。
- PR #88は調査専用PRから、残7 Requirementのremediation本体PRへre-scope済みである。
- PR #78はremediation結果を最終監査するTraceability PRとしてOPENのまま維持する。
- PR #78 Current auditの下位22 label集計は `exact-title: 9 / suite-level: 6 / bounded-multi-ref: 6 / stop: 1` であり、唯一のstopが `CT-BOUNDARY-001` である。
- `FR-AR-003` はPR #87でFormal coverage済みのため本Plan対象外である。
- `D-020` は「FormはReact Hook Form、ValidationはZodを使用する」、`D-021` は「Shared UIはReact Native StyleSheet、Web専用Admin/Layoutは`.web.tsx`とCSS Modulesを使用する」という既存Decisionである。
- 調査結果では、D-020 / D-021をsupersedeする後続Decisionは存在しなかったため、無言で書き換えず新DecisionでCurrent policyへ変更する。
- `D-026` は「TypeScript型・Enum・Dexie Schemaのコードを正本とし、Markdownは意味と理由を正本とする」であり、`NFR-MA-023`のCurrent policyである。
- `FR-AR-001` のCurrent implementationでは、Auth / Cart / Admin等のUse Caseはidentity / guest / actor / clock / generated IDを概ねApplicationで解決している一方、Checkout image pathはDexie / Native Repository側でgenerated manifestから解決している。
- `CreateOrderForPaymentCommand` は `now` と `assetPathByAssetId` を持つがCurrent `beginOrder()`から利用されておらず、Request / Command分離がCheckoutで完結していない。
- `CheckoutOrderUseCases.beginOrder()` は現在 `checkouts.getConfirmation()` が返すpath解決済みDTOを利用してOrder Item Snapshotを作成している。
- `StaticManifestRepository` と既存 `ProductImageManifestRepository` portが存在するため、Manifest解決のために新しい汎用Repository abstractionを増やす必要はない。
- `FR-AR-002` はCurrent Productがgenerated TypeScript manifestを使用し、既存security static checkがRuntime Fetch / JSON manifest accessを禁止している。gapはpositive import / Runtime SSOT evidenceである。
- `FR-AR-004` はProduction reset自体はCurrent requirementへ整合しており、`e2e/web/fixtures.ts` がreset前にextra Pageをcloseしている。gapはsupported harness boundaryのFormal evidenceである。
- `NFR-MA-022` はCurrent ProductがReact Aria Componentsを使用しており、custom complex widgetは確認されていない。gapは将来の境界違反を検出するStatic Contractである。
- `NFR-MA-023` はCode側のSSOT実態は成立しているが、`domain_types.md` / `application_contracts.md`にMarkdown自体が型契約の正本であるように読める表現が残る。

### Assumptions

- Productの外部仕様・画面仕様を変更しない。
- DB Schema、Seed identity、URL、公開DTO、既存User-visible messageを変更しない。
- `ProductImageManifestRepository` の既存 `getById` / `listByIds` 等で必要な解決が可能なら、それを再利用する。
- Image path fallbackのCurrent behavior（例: placeholder path）が必要な場合はApplication側で同等に維持する。
- Web / NativeのCheckout結果は同一Application contractを共有し、platformごとに異なるManifest解決ルールを作らない。
- Existing test titleを無理に変更せず、新しいassertionが既存suiteの責務に自然に収まる場合は既存suiteへ追加する。
- Formal evidenceは「fileが存在する」「libraryをimportしている」だけではなく、Requirementの重要な違反を検出できるassertionにする。
- `bounded-multi-ref` がPR #78側で利用可能なため、1 Requirementを1 test fileへ無理に押し込まない。

### Non-goals

- PR #78のTraceability更新。
- `CT-BOUNDARY-001 = covered` の手動変更。
- PR #78のcount再計算。
- `FR-AR-003` の再実装。
- 全Web FormのRHF + Zod化。
- Search / FilterへのRHF + Zod導入。
- Native FormへのRHF + Zod導入。
- CSS Modules導入・全面移行。
- `global.css`の分割・整理。
- Admin route / componentの一括`.web.tsx`化。
- 新しいUI framework / Form framework / styling frameworkの導入。
- Image Manifest generatorの再設計。
- Runtime manifest API / JSON endpointの追加。
- multi-tab atomic resetの実装。
- React Aria Components wrapper frameworkの新設。
- MarkdownからTypeScriptを生成する仕組み、TypeScriptからMarkdownを生成する仕組みの追加。
- 全MarkdownのSSOTをmachine判定する新しい汎用validator frameworkの追加。
- 無関係なlint / formatting / architecture cleanup。

## 3. 質問 / 曖昧性

### 必ず質問する不透明点

現時点でblocking questionはない。Owner decisionは以下で確定済みとして実装する。

- `NFR-MA-020`: D-020をLiteral維持せず、Application validation ownershipをCurrent contractにする。
- `NFR-MA-021`: D-021をLiteral維持せず、platform isolationをCurrent contractにする。
- `NFR-MA-023`: D-026を維持し、documentation conflictを修正する。

### 仮定してよい細部

実装者が局所的に決めてよいのは以下だけとする。

- private helper / local variable / focused test titleの命名。
- 既存suite内でassertionを置く最も自然な位置。
- Manifest asset listをMapへ変換する局所helperの置き場所。
- exactなApplication internal DTO名。ただしPresentation Requestとpublic DTOを内部Commandへ流用しない。
- Documentation authority noteの文章表現。ただし意味はD-026と一致させる。

### 未回答の重要質問 / Stop condition

以下が必要になった場合は、その場で実装範囲を広げず停止して報告する。

- `FR-AR-001`対応にDB Schema変更が必要になる。
- `FR-AR-001`対応に公開Presentation Requestへ`now` / actor / asset path map等の内部contextを追加する必要が出る。
- `FR-AR-001`対応にCheckoutのUser-visible behaviorまたは公開Order DTOの意味変更が必要になる。
- Manifest解決のために既存 `ProductImageManifestRepository` では不可能で、複数の新しい汎用port / repository abstractionが必要になる。
- Web / Nativeで別々のManifest解決ロジックを持たないと成立しない。
- `FR-AR-004`をFormal化するためにmulti-tab atomic reset自体を実装しなければならない。
- `NFR-MA-020`のFormal化のためにRHF / Zod利用数のsource scanやForm inventory固定が必要になる。
- `NFR-MA-021`のFormal化のためにCSS Modules導入または大量の`.web.tsx` renameが必要になる。
- `NFR-MA-022`のStatic Contractが大規模allowlistや複雑なAST parserを必要とする。
- `NFR-MA-023`のFormal化が全文意味比較、Code生成、Markdown生成等の新しいSSOT機構を必要とする。
- Current branchへ最新mainを取り込んだ結果、本Planの前提となるRequirement / Decision / implementation seamが変わっている。

## 4. 影響範囲

### Impacted areas

1. Architecture / Requirement documents
2. Checkout Application contract / Use Case
3. Checkout Web / Native Repository mapping
4. Product Image Manifest port接続
5. Contract / Integration / Playwright harness tests
6. SSOT documentation wording

### Files to inspect

実装開始時に最新branchで以下を再確認する。Candidateであり、不要なファイルは変更しない。

#### Decision / Requirement

- `docs/13_decisions/decision_log.md`
- `docs/01_requirements/non_functional_requirements.md`
- `docs/04_data/domain_types.md`
- `docs/04_data/application_contracts.md`
- `docs/PROJECT_CONTEXT.md`（read-only reference）
- relevant ADR / architecture docs（read-only reference。Current decisionと矛盾する後続判断がないことだけ確認）

#### FR-AR-001 Product seam

- `src/application/contracts/orders.ts`
- Checkout confirmationに関係するApplication contract
- `src/application/ports/**` の `ProductImageManifestRepository`
- `src/application/use-cases/checkout-order-use-cases.ts`
- `src/infrastructure/image-assets/static-manifest-repository.ts`
- `src/infrastructure/database/dexie/cart-checkout-repositories.ts`
- `src/infrastructure/database/sqlite/native-customer-application-repositories.ts`
- Web / Native composition rootで `CheckoutOrderUseCases` を組み立てる箇所

#### Formal evidence

- `tests/integration/checkout-order-use-cases.test.ts`
- `tests/contracts/architecture.test.ts`
- `tests/contracts/image-manifest.test.ts`
- `tests/integration/seeds.test.ts`
- `tests/integration/auth-account.test.ts`
- `tests/component/auth-account-pages.test.tsx`
- `tests/unit/normalization-cart-catalog.test.ts`
- `e2e/web/fixtures.ts`
- Playwright harness boundary testを置く既存の最小suite
- `scripts/security-static-check.ts`（FR-AR-002既存negative evidenceとしてread-only確認）

### 原則変更しないファイル

- `docs/12_quality/requirements_traceability.md`
- PR #78専用Plan / Run Artifact
- workflow YAML（Current commandsで検証可能な限り変更しない）
- `playwright.config.ts`（focused testを既存configで実行可能な限り変更しない）
- DB Schema / migrations
- unrelated Product / Curriculum docs

## 5. 変更方針

### Change strategy

実装は以下の順で行う。Decision / Requirementを先に確定し、その意味に合わせてProduct / Formal evidenceを変更する。Testを先に都合よく書き、後からRequirementを合わせない。

### 実行タスク

#### Task 0: Baseline / scopeを固定する

- [ ] 0-1. `git status --short` で意図しないlocal changeがないことを確認する。
- [ ] 0-2. current branchが `investigate/nfr-ma-020-021` であることを確認する。
- [ ] 0-3. `origin/main` を取得し、branchがmainに対してbehindでないことを確認する。behindなら先にlatest mainを取り込み、本Plan前提を再確認する。
- [ ] 0-4. PR #88、調査Plan、Current `decision_log.md`、Current NFR、PR #78 audit結果を再読する。
- [ ] 0-5. 変更前Relevant testを実行可能な範囲でbaseline確認し、既存失敗を今回の変更と混同しない。

#### Task 1: `NFR-MA-020` / `NFR-MA-021` のCurrent decisionを正式化する

##### 1-A. D-032でD-020をsupersedeする

- [ ] `docs/13_decisions/decision_log.md` に次の意味を持つ新Decisionを追加する。

`D-032` の必須意味:

> D-020をsupersedeする。業務Validation / NormalizationはApplication Use Case / Application contractを正本とする。PresentationはUI上必要な補助Validationを担い、Form state / Runtime Validation libraryは画面特性に応じて選択する。React Hook Form / ZodをSearch / Filter、Native入力を含む全入力へ一律必須としない。

- [ ] 過去のD-020行は履歴として残す。削除・本文置換で履歴を消さない。
- [ ] D-032がD-020をsupersedeすることを本文だけで明確にする。別のDecision status table等は新設しない。

##### 1-B. `NFR-MA-020`をCurrent contractへ更新する

- [ ] `docs/01_requirements/non_functional_requirements.md` の `NFR-MA-020` を、特定library mandatory requirementからvalidation ownership requirementへ変更する。

必須意味:

> 業務Validation / NormalizationはApplication Use Case / Application contractを正本とし、PresentationはUI上必要な補助Validationを担う。Form state / Runtime Validation libraryは画面特性に応じて選択し、特定libraryを全入力へ一律強制しない。

- [ ] RHF / Zodを禁止しない。Auth等のCurrent適用はそのまま維持できる。
- [ ] Search / Filter、選択UI、Native入力を機械的migrationしない。

##### 1-C. D-033でD-021をsupersedeする

- [ ] `docs/13_decisions/decision_log.md` に次の意味を持つ新Decisionを追加する。

`D-033` の必須意味:

> D-021をsupersedeする。Native UIはReact Native primitives / StyleSheet / shared design tokensを使用し、Web DOM / CSS / React Aria Componentsへ依存させない。Web-only CSSはWeb composition rootから取り込む。`.web.tsx` / `.native.tsx` は同一論理モジュールにplatform-specific implementationが必要な境界で使用し、CSS Modulesを一律必須としない。

- [ ] 過去のD-021行は履歴として残す。
- [ ] Current `global.css` を「理想的な最終設計」と認定する文章は追加しない。今回決めるのはplatform boundaryであり、global.css肥大化の評価は別問題とする。

##### 1-D. `NFR-MA-021`をCurrent contractへ更新する

- [ ] `NFR-MA-021` をplatform isolation中心のRequirementへ変更する。

必須意味:

> Native UIはWeb DOM / CSS / React Aria Componentsへ依存せず、React Native primitives / StyleSheet / shared design tokensを使用する。Web-only CSSはWeb composition rootから取り込み、platform-specific implementationが必要な境界では`.web.tsx` / `.native.tsx`を使用する。

- [ ] CSS Modules mandatory wordingを削除する。
- [ ] Web componentを拡張子だけで機械的renameしない。

#### Task 2: `FR-AR-001` — Checkout Image Manifest責務をApplicationへ戻す

##### 2-A. Public Request / internal Command boundaryを維持する

- [ ] `CreateOrderForPaymentRequest` はPresentationから渡す値だけを保持する。`checkoutSessionId` / `checkoutActionVersion`以外のCurrent internal contextをPresentationへ要求しない。
- [ ] `CreateOrderForPaymentCommand` を実際の内部Commandとして使用し、少なくとも `now` と `assetPathByAssetId` をApplication Use Caseが補完する。
- [ ] commandを削除してRequestへ内部contextを混ぜる形では解決しない。

##### 2-B. Checkout confirmationのraw dataとUI DTO責務を分離する

- [ ] Checkout Repositoryがgenerated manifestを直接読まなくても、Applicationがpathを解決できる形へRepository outputを調整する。
- [ ] Repository boundaryでは、Checkout計算に必要なDB dataと画像の `assetId` / `altText` 等を返し、generated manifest由来のpathはApplicationで付与する。
- [ ] Public `CheckoutConfirmationDto` にpathが必要なら、Application Use CaseがRepository raw result + `ProductImageManifestRepository` の結果を合成してCurrent DTOを返す。
- [ ] path解決のためにPresentationへManifestを渡さない。
- [ ] Web / Nativeで同じApplication path resolutionを使用する。

##### 2-C. Existing Manifest portを再利用する

- [ ] `ProductImageManifestRepository` の `getById` / `listByIds` 等、Current APIで一意に解決できる場合はそのまま使用する。
- [ ] unique assetIdをまとめて解決し、必要ならApplication内で `Record<string, string>` / Mapを作る。
- [ ] missing assetのCurrent fallback / Error contractを調べ、現在のUI / order snapshot behaviorを変えない。
- [ ] Manifest lookupのためだけの新generic repository、service locator、global singletonを追加しない。

##### 2-D. `CheckoutOrderUseCases`を正しい責務へ変更する

- [ ] `getConfirmation()` でApplicationがManifest pathを解決してpublic DTOへmappingする。
- [ ] `beginOrder()` でApplicationがClockとManifest resolved path mapを補完し、内部Commandとして注文作成処理へ渡す。
- [ ] Order Itemの `primaryImagePathSnapshot` はRepositoryが先に解決したpathではなく、Use Caseが補完した `assetPathByAssetId` から取得する。
- [ ] generated ID生成、Clock取得、current user解決等のCurrent Application責務は維持する。
- [ ] Transactionの原子性、Cart Version、Checkout Action Version、Payment idempotencyを壊さない。

##### 2-E. InfrastructureからCheckout path resolutionを除去する

- [ ] Dexie Checkout confirmation pathで `productImageManifest` を直接参照しない。
- [ ] Native Checkout confirmation pathでもgenerated manifestを直接参照しない。
- [ ] Storefront / Product / non-Checkout用途のManifest参照はFR-AR-001の目的に直接関係しない限り触らない。
- [ ] `StaticManifestRepository` はgenerated moduleを読むInfrastructure adapterとして維持する。

##### 2-F. FR-AR-001 Formal evidence

- [ ] `tests/integration/checkout-order-use-cases.test.ts` を中心に、Presentation相当のRequestだけでUse Caseを呼び出し、Manifest portからpathを解決してCurrent public confirmation / Order Item Snapshotへ反映することを検証する。
- [ ] test dependencyのManifest Repositoryを差し替え、Repository raw dataがpathを持たなくてもUse Caseが期待pathを補完することをassertする。
- [ ] `now` / path mapをcaller Requestへ要求しないことを型 / call形状で維持する。
- [ ] missing assetのCurrent contractがfallbackならfallback、ErrorならErrorを既存仕様どおりassertする。
- [ ] Web / Native Repositoryにgenerated manifest path resolutionが戻る回帰を、必要最小限のarchitecture source contractで検出できるなら既存 `architecture.test.ts` に追加する。広いsource snapshotは作らない。

#### Task 3: `FR-AR-002` — generated Manifest Runtime SSOTをFormal化する

- [ ] `src/generated/product-image-manifest.ts` がRuntime manifestのcanonical generated moduleであるCurrent implementationを維持する。
- [ ] `StaticManifestRepository` がcanonical generated moduleをimportするpositive assertionを既存 `tests/contracts/image-manifest.test.ts` または責務上自然な既存contract suiteへ追加する。
- [ ] Runtime consumerが `product-image-manifest.json` 等の別Runtime SSOTを参照しないことを確認する。
- [ ] Runtime Fetch / XHR / WebSocket / EventSource禁止は既存 `scripts/security-static-check.ts` のassertionをFormal evidenceとして再利用する。
- [ ] `security-static-check.ts` と同一regex / scanをVitest側へコピーしない。
- [ ] Product behavior、generator、manifest formatを変更しない。

#### Task 4: `FR-AR-004` — 1 Context / 1 Page Reset boundaryをFormal化する

- [ ] `e2e/web/fixtures.ts` のscenario resetがextra Pageを閉じ、fixtureのprimary PageだけでTest API resetを実施するCurrent behaviorを維持する。
- [ ] 既存D-014とTestability docsの「1 Browser Context / 1 Pageがsupported boundary、複数Tab atomicity非保証」という意味を変更しない。
- [ ] Playwright harness上でextra Pageが存在する状態を作り、supported reset helperを実行した後にprimary Pageだけが残りresetが成功することを1 focused testで検証する。
- [ ] このtestは「複数Tabの状態を原子的にresetできる」ことを期待しない。Harnessがunsupported stateをsupported 1 Page stateへ正規化してからresetすることを検証する。
- [ ] D-023のPhase 1必須E2E 12本のMappingを壊さない場所へ置く。既存required 12本へ新しいWE-CORE mappingを追加しない。
- [ ] 新しいPlaywright project / config / workflow jobは追加しない。Current config / commandで実行可能な既存suiteへ置く。
- [ ] 適切な既存非WE-CORE suiteがない場合だけ、1 purpose / 1 testの小さいharness contract specを追加する。

#### Task 5: `NFR-MA-020` — Application validation ownershipをFormal evidenceへ接続する

- [ ] RHF / Zod利用状況を検査するsource testは追加しない。
- [ ] Existing `tests/integration/auth-account.test.ts` のApplication boundary input limit / error assertionが、Presentation libraryから独立して業務Validationを成立させる代表Evidenceとして十分か確認する。
- [ ] Existing normalization unit / integration testがNormalization responsibilityをApplication / shared service側で検証していることを確認する。
- [ ] 新NFR-MA-020の重要部分を既存assertionで説明できない場合だけ、既存Integration suiteへ1 focused assertionを追加する。
- [ ] focused assertionはUse CaseをPresentationなしで直接呼び、invalid input / normalizationがApplication側で処理されることを検証する。
- [ ] 「すべてのUse Caseを列挙する」「すべてのFormを固定inventory化する」testは作らない。

#### Task 6: `NFR-MA-021` — Web / Native platform boundaryをFormal化する

- [ ] Existing `tests/contracts/architecture.test.ts` のNative Web-only dependency禁止assertionをCurrent NFR-MA-021へ整合させる。
- [ ] Native presentationから以下への依存を禁止するCurrent boundaryを直接検出する。
  - Web CSS import
  - `react-aria-components`
  - Web DOM専用module
- [ ] Web-only stylesheetがNative composition rootへ入らないことを検証する。
- [ ] `root-layout.web.tsx` 等のWeb composition rootからWeb CSSを取り込むCurrent構成を壊さない。
- [ ] CSS Modulesファイル数、`.web.tsx`ファイル数、`global.css`行数を固定するassertionは追加しない。
- [ ] Current shared design token importを壊す変更は行わない。
- [ ] Architecture Contractのために全TSX AST parserや新lint pluginを導入しない。Current contract testの既存source inspection patternで十分な範囲に限定する。

#### Task 7: `NFR-MA-022` — React Aria complex widget boundaryをFormal化する

- [ ] Current Web complex widget実装（Search Combobox、Confirm Dialog、Product / Admin Dialog等）が `react-aria-components` を使用することを確認する。
- [ ] plain HTML `select` 等、complex custom widgetではないnative elementを禁止しない。
- [ ] `tests/contracts/architecture.test.ts` のCurrent source inspection patternへ、Web presentation内のcustom complex widget混入を検出する狭いassertionを追加する。
- [ ] 少なくとも `role="dialog"` / `role="combobox"` / `role="listbox"` / `role="menu"` 等のcustom ARIA widget markerを、React Aria Componentsを使わず独自実装する回帰を検出対象にする。
- [ ] React Aria Component自体が生成するRuntime roleをsource上で誤検出しない。
- [ ] allowlistはCurrentの明確な例外がある場合だけ最小件数にする。将来の違反を隠す大規模allowlistは作らない。
- [ ] AST parser、新eslint plugin、wrapper frameworkを追加しない。

#### Task 8: `NFR-MA-023` — D-026とMarkdown authorityを整合する

##### 8-A. Documentation conflictを修正する

- [ ] `docs/04_data/domain_types.md` の「Domain Entity / Enum型の正本」がMarkdown自身であるように読める表現を修正する。
- [ ] `docs/04_data/application_contracts.md` の「TypeScript実装契約の正本」がMarkdown自身であるように読める表現を修正する。
- [ ] 必要な箇所に `D-026` を明示的に参照し、次のauthorityを揃える。
  - TypeScript type / interface / union / Enum相当: CodeがSSOT
  - Dexie Schema / version / table definition: CodeがSSOT
  - Markdown: 意味、責務、理由、利用者が理解すべきcontract説明
- [ ] Markdown内にillustrative code snippetがある場合、それを削除する必要はない。ただし「このsnippet自体が実装型の正本」と読めないようにする。
- [ ] Codeとの差分を1行ずつMarkdownへコピーして同期する方向へ広げない。

##### 8-B. Narrow governance contractを追加する

- [ ] 新しい汎用validator scriptは原則作らず、既存 `tests/contracts/architecture.test.ts` 等の最も近いcontract suiteへ狭いgovernance assertionを追加する。
- [ ] `decision_log.md` に `D-026` が存在し、対象2文書がD-026 / Code SSOT authorityへ明示的に従うことをassertする。
- [ ] 対象は少なくとも `domain_types.md` / `application_contracts.md` の既知conflictへ限定する。
- [ ] 全Markdownから「正本」という単語を禁止しない。他domainでMarkdownが正本の文書まで壊さない。
- [ ] TypeScript codeとMarkdown proseのsemantic equalityをmachine比較しない。

#### Task 9: Requirement単位の再監査をPR #88内で実施する

実装完了後、PR #78を編集する前にPR #88 branch上で7 Requirementを次の順に再監査する。

1. Current Requirement / Decision
2. Production implementation
3. Formal assertion / automated evidence
4. Gapの有無

- [ ] `FR-AR-001`: Request→Command context補完とManifest path ownershipがApplicationにある。
- [ ] `FR-AR-002`: generated TypeScript Runtime SSOT + no-runtime-fetchが自動検証される。
- [ ] `FR-AR-004`: 1 Context / 1 Page supported harness boundaryが検証される。
- [ ] `NFR-MA-020`: Application validation ownershipがRequirementとEvidenceで一致する。
- [ ] `NFR-MA-021`: Native / Web isolationがRequirementとArchitecture Contractで一致する。
- [ ] `NFR-MA-022`: React Aria complex widget boundaryがStatic Contractで一致する。
- [ ] `NFR-MA-023`: D-026、対象Markdown、governance assertionが一致する。
- [ ] 1件でも説明できない場合は「PR #78でどう見せるか」を調整せず、このPR #88のremediation gapとして扱う。

#### Task 10: Scope cleanup

- [ ] 未使用になった `CreateOrderForPaymentCommand` は今回実利用する。別の未使用型を増やさない。
- [ ] Manifest責務移動で不要になったCheckout-specific import / helperだけを削除する。
- [ ] unrelated dead code、global.css、Form code、docs driftをついでに直さない。
- [ ] `git diff --stat` / `git diff --name-only` で本PlanのImpacted areas外の変更を確認する。

## 6. 検証方法

### Validation plan

実装後、fast / focused validationからfull required validationへ進む。失敗時は最初のroot causeを修正してから次へ進む。

#### A. Documentation / formatting

```bash
pnpm run format:check
pnpm run lint:markdown
pnpm run validate:spec
git diff --check
```

#### B. Static / code quality

```bash
pnpm run lint
pnpm run typecheck
pnpm run validate:image-manifest
pnpm run security:check
```

#### C. Formal suites

```bash
pnpm run test:contracts
pnpm run test:integration
```

- FR-AR-001のfocused Checkout Integrationはfull integration前に単独実行してよい。
- NFR-MA-021 / 022 / 023のfocused Architecture Contractはfull contracts前に単独実行してよい。

#### D. Web / Playwright

- FR-AR-004のfocused harness testを単独実行する。
- その後Current repository commandでChromium required E2Eを実行する。

```bash
pnpm run test:e2e:chromium
```

- D-023の12本Mappingを変更していないことを確認する。

#### E. Build

```bash
pnpm run build:web
```

- Native repository / composition rootへFR-AR-001の変更が及ぶため、package.jsonに定義済みのCurrent Native test / validation commandを確認し、該当commandを実行する。
- command名を推測して新しく作らない。PR上のMobile App CI required checksも必ず確認する。

#### F. CI

- push後のPR #88 head SHAを記録する。
- そのexact head SHAに対するWeb CI / Mobile App CIを確認する。
- required checkがfailureの場合はログを確認する。
- failureを「無関係」として無視してよいのは、mainでも再現するか外部要因であることをログ / Current main runで説明できる場合だけとする。

### 成功判定

- Relevant local validationがすべてexit 0。
- Markdown / Spec / Architecture contractがCurrent Requirement / Decisionと矛盾しない。
- CheckoutのWeb / Native behaviorに既存回帰がない。
- `security:check`がRuntime Fetch / JSON manifest禁止を維持する。
- FR-AR-004 testがmulti-tab atomic resetを要求せずsupported boundaryだけを検証する。
- PR #88 required CIがexact headで成功する。
- final diffにPR #78 / Traceability変更がない。

## 7. リスクと未解決論点

### Risks

1. **FR-AR-001の責務移動がDTO再設計へ膨らむ**
   - 対策: Public DTOは維持し、Repository raw resultとApplication mappingの最小分離に限定する。
2. **Manifest lookupをTransaction外へ移すことでSnapshot consistencyを崩す**
   - 対策: DB entity / version確認はCurrent transaction内で維持し、Manifestはbuild-generated immutable runtime catalogとして扱う。path解決時点でCart / Checkout concurrency contractを弱めない。
3. **Webだけ直してNativeが別挙動になる**
   - 対策: Manifest path resolutionはApplication共通Use Caseへ集約し、platform Repositoryごとの実装を作らない。
4. **NFR-MA-020を弱めすぎる**
   - 対策: 「library自由化」だけではなく、業務Validation / NormalizationのApplication ownershipをRequirementとして明示する。
5. **NFR-MA-021を現状追認だけのRequirementにする**
   - 対策: `global.css`利用を目的にせず、NativeへWeb DOM / CSS / React Ariaを入れないplatform boundaryをGateとして固定する。
6. **NFR-MA-022 static scanが脆くなる**
   - 対策: complex widget markerだけに限定し、AST frameworkや大規模allowlistを導入しない。
7. **NFR-MA-023 validatorが文章lint化する**
   - 対策: D-026と既知2文書のauthority relationだけを検証し、全Markdown proseを規制しない。
8. **Formal testを増やしてstopを形式的に消すだけになる**
   - 対策: Requirement → implementation → assertionの順で再監査し、実装gapはProduction側で解消してからFormal化する。

### Open questions

- Blocking open questionなし。
- FR-AR-001のRepository raw confirmation型のexact naming / placementは実装者裁量だが、ApplicationがManifest pathを最終解決する責務は変更不可。
- FR-AR-004 focused testのexact fileはCurrent Playwright configを確認して決める。ただし新Project / Workflow追加は禁止。

## 8. 成果物

### 変更ファイル（想定）

確定変更候補:

- `docs/13_decisions/decision_log.md`
- `docs/01_requirements/non_functional_requirements.md`
- `docs/04_data/domain_types.md`
- `docs/04_data/application_contracts.md`
- `src/application/contracts/orders.ts` またはCheckout raw/public DTO責務を持つ既存contract file
- `src/application/use-cases/checkout-order-use-cases.ts`
- `src/infrastructure/database/dexie/cart-checkout-repositories.ts`
- `src/infrastructure/database/sqlite/native-customer-application-repositories.ts`
- `tests/integration/checkout-order-use-cases.test.ts`
- `tests/contracts/image-manifest.test.ts`
- `tests/contracts/architecture.test.ts`
- FR-AR-004 focused Playwright harness test file

条件付き変更候補:

- `src/application/ports/**`（既存Manifest port APIで不足する場合のみ。新generic abstractionは禁止）
- Web / Native composition root（Checkout Use Caseへ既存Manifest Repositoryを注入するために必要な場合）
- Existing Application integration test（NFR-MA-020の新Requirementを既存assertionで説明できない場合だけ）

### 付随ドキュメント

- 本Plan: `docs/plans/2026-08-31_ct-boundary-001-remediation.md`
- 調査経緯: `docs/plans/2026-08-31_nfr-ma-020-021-decision-investigation.md`

### 変更しない成果物

- `docs/12_quality/requirements_traceability.md`
- PR #78本文 / branch / Run Artifact

## 9. 備考

### 実装完了後のPR #78 handoff

PR #88がmergeされた後だけ、PR #78側で以下を行う。

1. 最新mainをPR #78へ取り込む。
2. `CT-BOUNDARY-001` の7 RequirementをCurrent Requirement → production implementation → Formal assertionの順で再監査する。
3. 7件すべてに実Evidenceがある場合だけ `stop = 0` へ更新する。
4. 下位22 label countを再計算する。
5. PR #78本文 / Current headを更新する。
6. PR #78 exact head CIを確認する。
7. 最終review後にPR #78をmergeする。

### 実装者への最重要ルール

- stopを消すこと自体を目的にしない。
- Requirementの意味を狭めてEvidenceへ合わせない。
- Current implementationへ合わせるだけの無言のRequirement変更をしない。
- Product gapはProductで直し、Formal gapだけをTestで直す。
- `D-020` / `D-021` は削除せず、D-032 / D-033で明示的にsupersedeする。
- `NFR-MA-023`はD-026を正として扱う。
- PR #78はこのPRでは触らない。
