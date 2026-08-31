# CT-BOUNDARY-001 Remediation Implementation Plan

## 0. 依頼概要

- PR #88で、PR #78の `CT-BOUNDARY-001 = stop` の原因となっている残7 Requirementをremediationする。
- 対象:
  - `FR-AR-001`
  - `FR-AR-002`
  - `FR-AR-004`
  - `NFR-MA-020`
  - `NFR-MA-021`
  - `NFR-MA-022`
  - `NFR-MA-023`
- `FR-AR-003` はPR #87で対応済みのため対象外。
- PR #78は本PRでは変更しない。本PR merge後にlatest mainを取り込み、Traceabilityを再監査する。
- 実装者へ設計判断を委ねない。このPlanの責務、実装境界、Formal evidence、Stop conditionに従って実装する。

## 1. ゴール / DoD

### ゴール

残7 Requirementについて、Current Requirement、Decision、Production implementation、Formal evidenceを矛盾なく接続する。

### DoD

- [ ] `FR-AR-001`: Presentationは `CreateOrderForPaymentRequest` だけを渡し、Application Use Caseが内部 `CreateOrderForPaymentCommand` を構築する。
- [ ] `FR-AR-001`: Commandへ、この注文作成で実際に使うCurrent user、Clock、generated Entity ID、Manifest resolved valueをApplicationが補完する。
- [ ] `FR-AR-001`: Order作成処理がCommandの内部contextとRequest由来fieldを実際に消費する。
- [ ] `FR-AR-001`: Request → Commandの構築 / context補完 / consumptionを固定する最小structural Formal assertionを必須で追加する。
- [ ] `FR-AR-001`: `docs/04_data/application_contracts.md` の `CreateOrderForPaymentCommand` 例をCurrent Codeと矛盾しない形へ更新する。
- [ ] `FR-AR-001`: Cart / Checkout read DTO / Repository architectureを今回のために全面変更しない。
- [ ] `FR-AR-002`: Generated TypeScript ManifestがRuntime image manifestのSSOTであることをbounded evidenceで固定する。
- [ ] `FR-AR-002`: Runtime Fetch / Runtime JSON manifest禁止は既存security checkを再利用する。
- [ ] `FR-AR-004`: Resetのsupported boundaryが1 Browser Context / 1 PageであることをPlaywright harness evidenceで固定する。
- [ ] `FR-AR-004`: harness specを既存 `test:e2e:chromium` へ含め、CIで継続実行する。
- [ ] `FR-AR-004`: multi-tab atomic resetを新規実装・保証しない。
- [ ] `NFR-MA-020`: `D-020` をsupersedeし、Application / Domain validation ownership中心のCurrent contractへ更新する。
- [ ] `NFR-MA-020`: 複数の独立したApplication mutation boundaryをbounded-multi-refでFormal evidenceとする。
- [ ] `NFR-MA-021`: `D-021` をsupersedeし、Web / Native platform isolation中心のCurrent contractへ更新する。
- [ ] `NFR-MA-021`: 既存 `check:native-route-dependencies` をFormal gateの正本として再利用し、同等scanを増やさない。
- [ ] `NFR-MA-022`: Current complex widget scopeをDialog / Combobox / Listbox / Menuへ具体化し、Formal scan setと一致させる。
- [ ] `NFR-MA-023`: `D-026` を維持し、対象文書のauthority declarationを最小Formal contractで固定する。
- [ ] PR #78、`docs/12_quality/requirements_traceability.md`、PR #78のRun Artifactを変更しない。
- [ ] 無関係なmigration / refactor / validator / frameworkを追加しない。
- [ ] `pnpm run verify`、必要なPlaywright / Native validation、exact-head CIがPASSする。

## 2. Current understanding / Owner decision

### Current understanding

- PR #88 branchは `investigate/nfr-ma-020-021`。新branch / 新PRを増やさない。
- PR #78 Current auditでは唯一のstopが `CT-BOUNDARY-001`。
- `D-006`: Presentation Requestと内部Commandを分離し、Actor / Viewer / Clock / IDをUse Caseで解決する。
- `D-020`: FormはReact Hook Form、ValidationはZodを使用する。
- `D-021`: Shared UIはReact Native StyleSheet、Web専用Admin/Layoutは `.web.tsx` + CSS Modulesを使用する。
- `D-022`: WebのDialog/Combobox等はReact Aria Componentsへ限定する。
- `D-026`: TypeScript型・Enum・Dexie SchemaはCodeを正本、Markdownは意味と理由を正本とする。
- Decision Logは現時点で `D-031` まで。実装開始前にlatest mainを取り込み、次の空きIDを再確認する。
- `FR-AR-001` のInput trust boundaryは、Current User / Role / Rank、Actor、Guest ID、Clock、生成対象Entity ID、Manifest resolved valueをUse Caseが依存Portから解決し `*Command` へ補完する契約。
- Current `CreateOrderForPaymentCommand` は `now` / `assetPathByAssetId` しか持たず、Current `beginOrder()` でもCommand自体が利用されていない。
- Current `beginOrder()` は `orderId`、`paymentId`、Order Item ID、Status History IDを `IdGenerator` から生成するがCommandへ載せていない。
- `DexieCartRepository.getCartDto()` はgenerated manifestをread mappingで利用し、Checkout confirmationはそのCart DTOを再利用している。Manifest path解決をRepositoryから全面撤去するとCart read pathまで巻き込む。
- `FR-AR-001` の主gapはCheckout read architectureではなく、Request → internal Commandのcontext補完とCommand consumption。
- PR #78が `FR-AR-001` をstopにしている直接理由は「Request → internal Commandのcontext補完を固定するFormal assertion不足」。したがってbehavioral integration testだけでなく、Command構築 / consumptionのstructural assertionを必須にする。
- `FR-AR-002` はProduct実装自体はgenerated TypeScript manifestを利用し、既存security checkがRuntime Fetch / JSON accessを禁止している。主gapはFormal evidenceの接続。
- `FR-AR-004` はfixtureがextra Pageをcloseしてからresetしている。主gapはsupported harness boundaryのFormal evidenceとCI常設。
- `NFR-MA-021` は既存 `scripts/check-native-route-dependencies.ts` とMobile App CI実行経路が存在する。
- `NFR-MA-022` はCurrent ProductがRACを利用しているが、Requirementの「等」がopen-endedでFormal scopeと一致していない。
- `NFR-MA-023` はCode側のSSOT実態は成立しているが、一部Markdown表現とFormal assertionが不足している。

### Owner decision: NFR-MA-020

`D-020` をLiteral維持しない。

> Domain状態・永続状態・業務判断に影響するValidation / Normalizationは、PresentationのValidationだけに依存せずApplicationまたはDomain boundaryで成立させる。PresentationはUX目的の補助Validationを行ってよい。Form state / Runtime Validation libraryは画面特性に応じて選択し、React Hook Form / Zodを全入力へ一律必須としない。

### Owner decision: NFR-MA-021

`D-021` をLiteral維持しない。Current contractはplatform isolationとする。

- Native presentationはReact Native primitives / StyleSheet / shared design tokensを利用する。
- NativeからWeb CSS、React Aria Components、`.web` module、Web DOM / browser storage globalsへ依存しない。
- Web-only stylesheetはWeb composition rootから取り込む。
- `.web.tsx` / `.native.tsx` はplatform-specific implementationが必要な境界で使う。
- CSS Modulesは一律必須としない。
- Enforcementは既存 `check:native-route-dependencies` を正本とする。

### Owner decision: NFR-MA-022

`D-022` の方向性は維持する。ただしCurrent Requirement / Formal enforcement対象を次の4種へ固定する。

- Dialog
- Combobox
- Listbox
- Menu

`NFR-MA-022` から曖昧な「等」を外す。Tabs / Grid / Tree等は今回追加しない。

### Owner decision: NFR-MA-023

`D-026` を維持する。

- TypeScript type / interface / union / enum-equivalent、Dexie schema / version / table定義はCodeがSSOT。
- Markdownは意味・責務・理由・利用上の契約説明を担う。
- Code / Markdownの全文同期や意味比較はmachine化しない。

## 3. Non-goals / Stop conditions

### Non-goals

- PR #78のTraceability更新、count再計算、`CT-BOUNDARY-001 = covered` の手動変更。
- `FR-AR-003` の再実装。
- RHF + Zod全面migration / 全Form inventory固定。
- CSS Modules全面migration / `global.css`全面整理 / `.web.tsx`機械的rename。
- Native dependency scanの二重・三重実装。
- Cart / Checkout read DTO / Repository architectureの全面再設計。
- Repositoryからgenerated manifest依存を一括撤去すること。
- FR-AR-001の一般文言だけを理由に、この注文作成で使わないRole / Rank等をCommandへ追加すること。
- Image Manifest generator再設計、Runtime manifest API / JSON endpoint追加。
- multi-tab atomic reset実装。
- 新しいPlaywright project / workflow追加。
- RAC wrapper framework新設。
- NFR-MA-022をTabs / Grid / Tree等へ拡張すること。
- Code / Markdown生成、全文意味比較、全Markdown横断SSOT validator。
- AST parser / ESLint plugin等の新しい解析基盤。
- 無関係なcleanup / directory再編。

### Stop conditions

次のいずれかが必要になったら、勝手にscopeを広げず停止して報告する。

- `FR-AR-001` にDB Schema変更が必要。
- Presentation Requestへ `userId` / `now` / generated ID / asset path map等の内部context追加が必要。
- CheckoutのUser-visible behaviorまたは公開Order DTOの意味変更が必要。
- Command consumptionのためにCheckout / Cart read DTO、Repository interface、Web / Native read pathを広範囲変更する必要がある。
- generated manifestをRepositoryから全面撤去しないとFR-AR-001を成立させられない。
- DB version / checkout session / cart version等のtransaction semanticsを崩さないとCommand化できない。
- FR-AR-001のstructural assertionにAST parser / generic source-analysis frameworkが必要になる。
- `FR-AR-004` のためにmulti-tab atomic reset、新Playwright project、新workflowが必要。
- `NFR-MA-020` のために全Form inventoryやRHF / Zod source count固定が必要。
- `NFR-MA-021` のためにCSS Modules導入、大量rename、新しい依存解析基盤が必要。
- `NFR-MA-022` のStatic Contractが大規模allowlistやAST parserを必要とする。
- `NFR-MA-023` のために対象2文書を超えた全Markdown scan、semantic lint、Code/Markdown生成が必要。
- latest main取込後にRequirement / Decision / implementation seamが本Plan前提から変わっている。

## 4. 実装順序

### Task 0: latest main取込とbaseline

1. working treeがcleanで、branchが `investigate/nfr-ma-020-021` であることを確認する。
2. `origin/main` をfetchし、behindならlatest mainを取り込む。
3. 次を再読する。
   - `docs/13_decisions/decision_log.md`
   - `docs/01_requirements/functional_requirements.md`
   - `docs/01_requirements/non_functional_requirements.md`
   - `docs/04_data/application_contracts.md`
   - `docs/plans/2026-08-31_nfr-ma-020-021-decision-investigation.md`
   - 本Plan
   - PR #78 Current audit
4. Decision Log末尾を確認し、`D-020` / `D-021` のsuperseding decisionへ次の空き連番を割り当てる。
   - mainが `D-031` のままなら `D-032` / `D-033` 想定。
   - 使用済みなら次の連番へずらす。
5. 変更対象周辺の既存test / gateをbaseline実行する。

### Task 1: Decision / RequirementをCurrent contractへ更新する

#### NFR-MA-020

- `D-020` はhistoryとして残す。
- 新Decisionを追加し、Application / Domain validation ownershipを明示する。
- `NFR-MA-020` を同じ責務境界へ更新する。
- RHF / Zodを禁止しないが、Search / Filter / Native入力へ機械導入しない。

#### NFR-MA-021

- `D-021` はhistoryとして残す。
- 新Decisionを追加し、Native / Web isolationと既存gate再利用方針を明示する。
- `NFR-MA-021` を同じplatform boundaryへ更新する。
- CSS Modulesや `.web.tsx` の件数を品質指標にしない。

#### NFR-MA-022

- `D-022` row自体はhistoryとして書換えない。
- `NFR-MA-022` を「WebのDialog / Combobox / Listbox / MenuはReact Aria Componentsを使用し、独自complex widget implementationを追加しない」へ具体化する。
- Decision Logの実装補足に、D-022のCurrent enforcement対象が上記4種であることを1文だけ追加する。
- 新Decisionは追加しない。

### Task 2: FR-AR-001 — Request → internal Command境界

#### 2.1 Command shape

`CreateOrderForPaymentCommand` はRequest fieldに加え、この注文作成mutationで実際に使う内部contextを保持する。

最低限:

- `userId`
- `orderId`
- `paymentId`
- `orderItemIds`（confirmation item順と1:1）
- `orderStatusHistoryId`
- `now`
- `assetPathByAssetId`

Role / Rank等、このmutationで使わないfieldは追加しない。

#### 2.2 構築とconsumption

- Presentation → `beginOrder()` はCurrent `CreateOrderForPaymentRequest` のまま。
- `beginOrder(request)` でApplicationがCurrent customerとClockを解決する。
- transaction内でsession / confirmation / cart versionをCurrent順序どおり検証する。
- confirmation確定後、Application `IdGenerator` で必要なEntity ID群を生成する。
- confirmationの `line.image.assetId -> line.image.path` から `assetPathByAssetId` をApplication内で構築する。
- `CreateOrderForPaymentCommand` を1つ構築する。
- 以降のOrder作成処理はlocal `request` / `user.id` / `now` / `idGenerator.generate()` へ戻らず、対応するCommand fieldを使う。
- Order Item IDは `command.orderItemIds[index]` を使う。
- `primaryImagePathSnapshot` は `command.assetPathByAssetId[line.image.assetId]` を使う。
- Order / Payment / Status History ID、`createdAt` / `updatedAt`、Current user / version条件も対応するCommand fieldを使う。

#### 2.3 Documentation alignment

- `src/application/contracts/orders.ts` のCommand shape変更と同時に、`docs/04_data/application_contracts.md` の `CreateOrderForPaymentCommand` 例を同じCurrent shapeへ更新する。
- これはMarkdownを型SSOTへ戻すためではない。D-026に従いCodeを型のSSOTとしたまま、既知の古い契約例を放置しないための整合である。
- Input trust boundaryの説明も、今回のCommand shapeと矛盾しないことを確認する。

#### 2.4 変更しないread boundary

- `DexieCartRepository.getCartDto()` のManifest path解決を移動しない。
- `CheckoutSessionRepository.getConfirmation()` をraw DTOへ分割しない。
- Web / Nativeの `getConfirmation()` 表示経路を再設計しない。
- `ProductImageManifestRepository` をCheckout Use Caseへ新規注入する前提にしない。

#### 2.5 Formal evidence — 必須

Behavioral integration testに加え、PR #78のstop理由を直接閉じる最小structural Formal assertionを必須で追加する。

必須証明対象:

1. `CreateOrderForPaymentCommand` が今回定義した内部context fieldを持つ。
2. `CheckoutOrderUseCases.beginOrder()` がRequestからそのCommandを構築する。
3. Order / Payment / OrderItem / Status Historyの作成処理がCommand fieldを実際に参照する。
4. Presentation Requestへ内部contextを追加していない。

実装方法:

- 既存 `tests/contracts` のsource-inspection styleへ合わせた小さいcontract test、または同等の既存contractへの最小assertion追加とする。
- source文字列の安定したboundary markerだけを対象にする。
- AST parser / ESLint plugin / generic source-analysis frameworkは導入しない。
- 「Command型が存在する」だけのassertionでは不十分。構築とconsumptionまで固定する。

Behavioral evidence:

- `tests/integration/checkout-order-use-cases.test.ts` でPresentation Requestに内部contextを要求せず注文作成できることを確認する。
- deterministic `IdGenerator` でOrder / Payment / Order Item / Status HistoryへApplication生成IDが反映されることを確認する。
- Order Item Snapshot pathがCommandのasset map経由で保存されることを確認する。

### Task 3: FR-AR-002 — Generated Manifest Runtime SSOT

Product / generator / manifest formatは原則変更しない。

Formal evidenceは次の3点をbounded-multi-refとして扱う。

1. 既存 `tests/contracts/image-manifest.test.ts`
   - canonical generated TypeScript module、Asset metadata、実ファイル、Seed参照整合。
2. `StaticManifestRepository` positive binding
   - 同じgenerated TypeScript moduleをRuntime sourceとして使うことを最小assertionで固定。
3. 既存security check
   - Runtime Fetch / XHR / WebSocket / EventSource / runtime JSON manifest禁止。

禁止事項:

- 1 assertionだけでFR-AR-002全体をcovered扱いしない。
- security check regexをVitestへ複製しない。
- alternate runtime manifest SSOTを新設しない。

### Task 4: FR-AR-004 — Reset boundaryをFormal化しCIへ載せる

- `D-014` の意味を維持する。
- fixtureがextra Pageをcloseしてからsupported resetするCurrent behaviorを使う。
- one-purpose Playwright harness specを1本追加する。
  1. primary Pageを保持。
  2. extra Pageを1つ作成。
  3. 既存 `scenario` fixtureのsupported resetを実行。
  4. extra Pageがcloseされ、primary Pageでresetが成功したことを確認。
- multi-tab atomic resetはassertしない。
- `D-023` の必須12 E2E mappingは変更しない。
- 新project / workflowは作らない。
- `package.json` の既存 `test:e2e:chromium` にharness specを明示追加する。

### Task 5: NFR-MA-020 — Validation ownership Formal evidence

証明対象:

- Presentationを経由せずApplication Use Caseを直接呼んでも、Domain状態・永続状態・業務判断に影響するValidation / Normalizationが成立する。

方針:

- 既存testを最大限再利用する。
- Auth 1例だけではなく、少なくとも異なる責務の複数mutation boundaryをbounded-multi-refとして束ねる。
  - Auth / Registration / Profile / Address系。
  - Admin Category / Brand等。
- 既存testで十分なら新規testを増やさない。
- 不足する場合だけfocused assertionを追加する。
- 全Use Case / 全Form inventory、RHF / Zod import countは作らない。

### Task 6: NFR-MA-021 — 既存Native dependency gateを再利用する

Formal enforcementの正本は `scripts/check-native-route-dependencies.ts`。

- Current scan root / forbidden patternをRequirementと照合する。
- `src/presentation/native/**`、既存 `*.native.*`、Native entry point coverageを維持する。
- platform resolver用の薄いgeneric shimで必要なものが漏れている場合だけ個別pathを最小追加する。
- `app/**/*.tsx` 全件scanのようにWeb routeまで巻き込まない。
- `indexedDB` が禁止patternに不足していれば追加する。
- `tests/contracts/architecture.test.ts` へ同じ全面scanを追加しない。
- Mobile App CIで `pnpm run check:native-route-dependencies` が実行される既存stepを利用する。
- CI stepのassertionが既存contractにあれば再利用し、なければその実行だけを固定する最小assertionを追加する。

### Task 7: NFR-MA-022 — Current widget setをFormal化する

Scan対象:

- `src/presentation/**/*.{ts,tsx}`
- `app/**/*.{ts,tsx}`
- ただし `src/presentation/native/**`、`*.native.*`、`app/**/*.native.*` は除外。

原則禁止marker:

- raw `<dialog>`
- `role="dialog"`
- `role="combobox"`
- `role="listbox"`
- `role="menu"`

方針:

- RAC runtimeが生成するroleはsource scan対象外なので許容markerは不要。
- Current sourceに正当な例外が実在する場合だけexact fileの最小allowlist。
- plain HTML `select` 等は対象外。
- AST parser / ESLint plugin / wrapper frameworkは導入しない。

### Task 8: NFR-MA-023 — D-026とDocumentation authority

原則変更対象:

- `docs/04_data/domain_types.md`
- `docs/04_data/application_contracts.md`
- `docs/13_decisions/decision_log.md` はD-026確認のみ。

2文書へ短いstable authority declarationを置く。

- TypeScript type / interface / union / enum-equivalentはCodeがSSOT。
- Dexie schema / version / table定義はCodeがSSOT。
- Markdownは意味・責務・理由・契約説明を担う。
- authorityは `D-026` に従う。

Formal contractは次だけ確認する。

1. Decision LogにCurrent `D-026` authorityがある。
2. `domain_types.md` にstable declarationがある。
3. `application_contracts.md` にstable declarationがある。

全Markdown scan、semantic comparison、型一覧比較、Code/Markdown生成はしない。

### Task 9: Requirement単位で再監査する

7 Requirementそれぞれについて次を確認する。

1. Current Requirement
2. Current Decision
3. Production implementation
4. Formal assertion / evidence

特に:

- `FR-AR-001`: Commandのshapeだけでなく、構築 / context補完 / consumptionをstructural assertionで固定できている。
- `FR-AR-001`: `application_contracts.md` のCommand例がCurrent Codeと矛盾していない。
- `FR-AR-002`: generated module integrity + Runtime binding + no-fetchを説明できる。
- `NFR-MA-021`: Native dependency enforcementの正本が1つで、CI継続実行される。
- `NFR-MA-022`: Requirementに「等」が残らずFormal scan setと一致する。

不足があればPR #88のremediation gapとして扱い、PR #78を操作してcovered扱いにしない。

### Task 10: 関連cleanupのみ

- FR-AR-001対応で不要になったlocal variable / unused import等、直接関係するものだけ削除する。
- Cart / Checkout Repositoryのmanifest importはCommand変更だけを理由に削除しない。
- Native dependency scan helper / regexを別testへコピーしない。
- incidental refactor、命名統一、directory再編をしない。

## 5. Candidate files

### Decision / Requirement

- `docs/13_decisions/decision_log.md`
- `docs/01_requirements/non_functional_requirements.md`

### FR-AR-001

- `src/application/contracts/orders.ts`
- `src/application/use-cases/checkout-order-use-cases.ts`
- `docs/04_data/application_contracts.md`
- `tests/integration/checkout-order-use-cases.test.ts`
- `tests/contracts/architecture.test.ts` または既存source-inspection contract（最小structural assertion追加先）

### FR-AR-002

- `tests/contracts/image-manifest.test.ts`
- `src/infrastructure/image-assets/static-manifest-repository.ts`
- StaticManifestRepositoryの既存repository/contract test（存在すれば再利用）
- existing security validation

### FR-AR-004

- `e2e/web/fixtures.ts`（原則Product変更不要）
- one-purpose Playwright harness contract spec
- `package.json`

### NFR-MA-020

- existing Application integration tests

### NFR-MA-021

- `scripts/check-native-route-dependencies.ts`
- `.github/workflows/native-ci.yml` は原則変更せず既存stepを利用
- `tests/contracts/native-ci-workflow.test.ts` は必要な場合のみ最小assertion追加

### NFR-MA-022 / 023

- `tests/contracts/architecture.test.ts`
- `docs/04_data/domain_types.md`
- `docs/04_data/application_contracts.md`

### 変更しない成果物

- `docs/12_quality/requirements_traceability.md`
- PR #78本文 / branch / Run Artifact

## 6. Validation plan

### Focused validation

- FR-AR-001 Checkout Application integration test
- FR-AR-001 structural source contract
- FR-AR-002 image manifest contract + StaticManifestRepository relevant test + existing security validation
- NFR-MA-020 selected Application mutation boundary tests
- NFR-MA-021 `pnpm run check:native-route-dependencies` + CI workflow contract
- NFR-MA-022 / 023 architecture contract test
- FR-AR-004 focused Playwright harness test

### Full local gate

1. `pnpm run verify`
2. `pnpm run check:native-route-dependencies`
3. FR-AR-004 focused Playwright harness test
4. `pnpm run test:e2e:chromium`
5. 変更影響に応じたrequired Native / Mobile validation

`pnpm run verify` が既存のFormat / Markdown / spec / curriculum / lint / typecheck / manifest / security / Vitest suites / Web build / spec buildを束ねるため、同じcommandを重複列挙しない。

### PR gate

- PR #88のexact head SHAを取得する。
- exact head SHAに対するrequired CIを確認する。
- Web CI required Chromium E2EでFR-AR-004 harness spec実行を確認する。
- Mobile App CI Native Staticで `check:native-route-dependencies` 実行を確認する。
- headが動いた場合は旧SHAの結果を流用しない。
- failureを無関係扱いするのはmain由来・外部要因をlogで説明できる場合だけ。

## 7. Review checklist

### Scope

- [ ] PR #88の残7 Requirementだけに変更を限定した。
- [ ] PR #78を変更していない。
- [ ] RHF/Zod全面migrationをしていない。
- [ ] CSS Modules / `.web.tsx`全面migrationをしていない。
- [ ] Cart / Checkout read architectureを全面変更していない。
- [ ] Native dependency scanを重複実装していない。
- [ ] 無関係refactorを含まない。

### Decision / Requirement

- [ ] latest main取込後の次の空きDecision IDを使った。
- [ ] `D-020` / `D-021` を削除せずsupersedeした。
- [ ] NFR-MA-020がvalidation ownershipを表す。
- [ ] NFR-MA-021がplatform isolationを表す。
- [ ] NFR-MA-022のscopeがDialog / Combobox / Listbox / Menuへ固定されている。
- [ ] NFR-MA-023はD-026を維持する。

### FR-AR-001

- [ ] Presentation Requestへ内部contextを追加していない。
- [ ] Commandへ `userId` / generated IDs / `now` / `assetPathByAssetId` を補完している。
- [ ] Order作成処理がCommand fieldを実際に消費している。
- [ ] Order Item ID / Status History IDもCommand経由で使う。
- [ ] Snapshot pathはCommandのasset map経由。
- [ ] unused Role / Rank等のdead fieldを追加していない。
- [ ] `application_contracts.md` のCommand例がCurrent Codeと矛盾していない。
- [ ] Cart / Checkout read DTO / Repositoryを不要に分割していない。
- [ ] transaction / version semanticsを崩していない。

### Formal evidence

- [ ] FR-AR-001にCommand shape / construction / consumptionの最小structural assertionが存在する。
- [ ] FR-AR-001をbehavioral testだけでcovered扱いしていない。
- [ ] FR-AR-002はgenerated module integrity / Runtime binding / no-fetchの3 evidenceで説明できる。
- [ ] NFR-MA-020は複数の独立したApplication mutation boundaryで説明できる。
- [ ] NFR-MA-021の正本enforcementは既存native dependency scriptである。
- [ ] NFR-MA-021 gateがMobile App CIで継続実行される。
- [ ] NFR-MA-022のRequirement scopeとStatic Contract対象が一致する。
- [ ] NFR-MA-023はD-026 + 2文書のstable authority declarationを最小Formal contractで固定する。
- [ ] FR-AR-004 harness testが既存 `test:e2e:chromium` に含まれる。

### Validation

- [ ] focused validation PASS
- [ ] `pnpm run verify` PASS
- [ ] `pnpm run check:native-route-dependencies` PASS
- [ ] focused FR-AR-004 Playwright PASS
- [ ] `pnpm run test:e2e:chromium` PASS
- [ ] Web CI required E2Eでharness spec実行確認
- [ ] Mobile App CI Native Staticでnative dependency gate実行確認
- [ ] required Native / Mobile validation PASS
- [ ] exact-head CI PASSまたは説明可能な外部/main由来failureのみ

## 8. PR #78 handoff

PR #88 merge後だけ実施する。

1. PR #78へlatest mainを取り込む。
2. `CT-BOUNDARY-001` の7 RequirementをCurrent Requirement → Decision → Production implementation → Formal evidenceで再監査する。
3. 7件すべてに実Evidenceがある場合だけ `stop = 0` とする。
4. 下位22 label countを再計算する。
5. PR #78本文 / current headを更新する。
6. PR #78 exact-head CIを確認する。
7. 最終review後にmergeする。

## 9. 実装者への最重要ルール

- stopを消すこと自体を目的にしない。
- RequirementをEvidenceへ合わせて都合よく狭めない。
- Current implementationに合わせるだけの無言のRequirement変更をしない。
- Product gapはProductで直し、Formal gapだけならTest / Contractで直す。
- `D-020` / `D-021` はhistoryとして残し、latest main時点の次の空きDecision IDでsupersedeする。
- FR-AR-001はCommandを作るだけでは完了しない。内部contextを補完し、実処理がCommandを消費し、その構築 / consumptionをFormal assertionで固定する。
- FR-AR-001で `application_contracts.md` の既知の古いCommand例を残さない。
- FR-AR-001をCart / Checkout read architecture整理へ広げない。
- FR-AR-002は1 assertionではなく3つのbounded evidenceとして扱う。
- FR-AR-004 evidenceは既存CI経路へ載せる。
- NFR-MA-021は既存native dependency scriptを正本として再利用する。
- NFR-MA-022はCurrent 4 widget setだけをFormal化する。
- NFR-MA-023はD-026をCurrent authorityとして扱い、対象2文書だけを最小Formal contractで固定する。
- 追加の汎用framework、migration、validatorは作らない。
- Stop conditionに触れたら実装者判断でscopeを広げず報告する。
- PR #78はこのPRでは触らない。
