# CT-BOUNDARY-001 Remediation Implementation Plan

## 0. 依頼概要

- 依頼内容: PR #88 で `CT-BOUNDARY-001 = stop` の原因となっている残7 Requirementをremediationし、PR #78を最終再監査できる状態へ進める。
- 対象:
  - `FR-AR-001`
  - `FR-AR-002`
  - `FR-AR-004`
  - `NFR-MA-020`
  - `NFR-MA-021`
  - `NFR-MA-022`
  - `NFR-MA-023`
- 背景:
  - PR #78のCurrent auditでは `FR-AR-003` はcoveredだが、上記7件がimplementation gapまたはFormal coverage gapとして残っている。
  - `NFR-MA-020` / `NFR-MA-021` は `docs/plans/2026-08-31_nfr-ma-020-021-decision-investigation.md` でCurrent implementationとGit historyを調査済みである。
  - Owner decisionとして、`D-020` / `D-021` をLiteralに大規模migrationするのではなく、実際に守るべき責務境界を新Decisionで明示してsupersedeする。
  - `NFR-MA-023` は `D-026` がCurrent decisionであり、新Decisionを追加しない。
- このPlanは実装者へ設計判断を委ねる文書ではない。ここで決めた責務、実装境界、Formal evidence、Stop conditionに従って実装する。

## 1. ゴール / 完了条件

### ゴール

残7 Requirementについて、Current Requirement、Decision、Production implementation、Formal evidenceを矛盾なく接続する。

### 完了条件（DoD）

- [ ] `FR-AR-001`: Presentationは `CreateOrderForPaymentRequest` だけを渡し、Application Use Caseが内部 `CreateOrderForPaymentCommand` を組み立てる。
- [ ] `FR-AR-001`: Commandには、この注文作成で実際に使用するCurrent user、Clock、生成Entity ID、Manifest resolved valueをApplicationが補完する。
- [ ] `FR-AR-001`: Order作成処理はCommandへ補完した `userId` / generated IDs / `now` / `assetPathByAssetId` / Request由来fieldを実際に消費する。
- [ ] `FR-AR-001`: Cart / Checkoutのread DTOやRepository責務を、Formal coverageのためだけに広範囲変更しない。
- [ ] `FR-AR-001`: Checkout表示、Order Item Snapshot、Payment retry等の既存Product behaviorとtransaction semanticsを維持する。
- [ ] `FR-AR-002`: Generated TypeScript ManifestがRuntime image manifestのSSOTであることを、既存/追加のbounded evidenceで固定する。
- [ ] `FR-AR-002`: Runtime Fetch / Runtime JSON manifest禁止は既存security checkを再利用し、二重実装しない。
- [ ] `FR-AR-004`: supported reset boundaryが1 Browser Context / 1 PageであることをPlaywright harness evidenceで固定する。
- [ ] `FR-AR-004`: harness evidenceは既存 `test:e2e:chromium` のCI実行経路へ含め、one-shotの手動testにしない。
- [ ] `FR-AR-004`: multi-tab atomic resetを新規実装・保証しない。
- [ ] `NFR-MA-020`: `D-020` をsupersedeする新DecisionとRequirementを、Application / Domain validation ownership中心のCurrent contractへ更新する。
- [ ] `NFR-MA-020`: Formal evidenceは1画面・1Auth例だけで全体を代表させず、複数の独立したmutation boundaryをbounded-multi-refで確認する。
- [ ] `NFR-MA-020`: RHF / Zod利用件数や全Form inventoryを固定するsource scanを追加しない。
- [ ] `NFR-MA-021`: `D-021` をsupersedeする新DecisionとRequirementをWeb / Native platform isolation中心のCurrent contractへ更新する。
- [ ] `NFR-MA-021`: 既存 `check:native-route-dependencies` をFormal gateの正本として再利用し、同じscanを別testへ重複実装しない。
- [ ] `NFR-MA-021`: CSS Modules全面移行、`global.css`全面整理、Web componentの機械的`.web.tsx`化を行わない。
- [ ] `NFR-MA-022`: Current complex widget scopeを Dialog / Combobox / Listbox / Menuへ明示し、「等」に依存しないRequirementへ具体化する。
- [ ] `NFR-MA-022`: 上記Current scopeのcustom implementation混入を狭いStatic Contractで検出する。
- [ ] `NFR-MA-023`: `domain_types.md` / `application_contracts.md` のSSOT表現を `D-026` へ整合する。
- [ ] `NFR-MA-023`: D-026 authorityを固定する最小Formal contractを追加する。
- [ ] `NFR-MA-023`: semantic comparison、全文prose lint、Markdown生成等の新しいgovernance machineryを追加しない。
- [ ] Product / Test / Requirement / Decisionの変更は上記7件を閉じるために必要な範囲だけである。
- [ ] PR #78、`docs/12_quality/requirements_traceability.md`、PR #78のRun Artifactを変更していない。
- [ ] `pnpm run verify` と必要なPlaywright / Native / exact-head CI gateがPASSしている。
- [ ] Requirement単位のself-reviewで残gapがない。

## 2. Current understanding / Owner decision

### Current understanding

- PR #88 branchは `investigate/nfr-ma-020-021`。調査開始時のbranch名は維持し、新branch / 新PRを増やさない。
- PR #88は調査専用PRから、残7 Requirementのremediation本体PRへre-scope済みである。
- PR #78はremediation結果を最終監査するTraceability PRとしてOPENのまま維持する。
- PR #78 Current auditの下位22 label集計は `exact-title: 9 / suite-level: 6 / bounded-multi-ref: 6 / stop: 1` で、唯一のstopが `CT-BOUNDARY-001` である。
- `FR-AR-003` はPR #87でFormal coverage済みのため本Plan対象外である。
- `D-006` はPresentation Requestと内部Commandを分離し、Actor / Viewer / Clock / IDをUse Caseで解決する。
- `D-020` は「FormはReact Hook Form、ValidationはZodを使用する」。
- `D-021` は「Shared UIはReact Native StyleSheet、Web専用Admin/Layoutは`.web.tsx`とCSS Modulesを使用する」。
- `D-022` は「WebのDialog/Combobox等はReact Aria Componentsへ限定する」。
- `D-026` は「実装開始後はTypeScript型・Enum・Dexie Schemaのコードを正本とし、Markdownは意味と理由を正本とする」。
- Current branchのDecision Logは現時点で `D-031` まで存在するが、実装開始前にlatest mainを取り込むため、新Decision IDは固定値として扱わない。
- `FR-AR-001` のInput trust boundaryは、Current User / Role / Rank、Actor、Guest ID、Clock、生成対象Entity ID、Manifest resolved valueをUse Caseが依存Portから解決し `*Command` へ変換する契約である。
- Current `CreateOrderForPaymentCommand` は `now` と `assetPathByAssetId` だけを持ち、Current `beginOrder()`でもCommand自体が利用されていない。
- Current `beginOrder()` は `orderId`、`paymentId`、Order Item ID、Status History IDを `IdGenerator` から生成するが、Commandへ補完せずその場で使用している。
- `CheckoutOrderUseCases.beginOrder()` は現在 `checkouts.getConfirmation()` が返すpath解決済みDTOを使ってOrder Item Snapshotを作成している。
- generated manifestはCurrent `DexieCartRepository.getCartDto()` のread mappingでも使用され、Checkout confirmationはそのCart DTOを再利用している。したがってManifest path解決をRepositoryから全面撤去するとCart read pathまで巻き込む。
- `FR-AR-001` の主gapはCheckout read architecture全体ではなく、Requestから内部Commandへのcontext補完とCommand consumptionが実装上成立していない点である。
- `FR-AR-002` はProduct実装自体はgenerated TypeScript manifestを使用し、既存security checkがRuntime Fetch / JSON accessを禁止している。既存 `image-manifest.test.ts` もgenerated moduleとAsset/Seed対応を検証している。主gapはRuntime SSOTを一連のFormal evidenceとして説明できる形にすることである。
- `FR-AR-004` はProduction reset自体はCurrent contractへ概ね整合し、`e2e/web/fixtures.ts` がreset前にextra Pageをcloseしている。主gapはsupported harness boundaryのFormal evidenceである。
- Current `test:e2e:chromium` は明示したspecだけを実行するため、新しいharness specを作るだけではCIへ自動で含まれない。
- `NFR-MA-021` には既に `scripts/check-native-route-dependencies.ts` とMobile App CIの `pnpm run check:native-route-dependencies` 実行経路があり、Web-only dependency禁止の実用gateが存在する。
- `tests/contracts/architecture.test.ts` にも一部Native entry point向けの類似checkがあるため、今回同じscanを3箇所目へ複製しない。
- `NFR-MA-022` はCurrent ProductがReact Aria Componentsを利用しており、custom complex widgetは確認されていない。問題はRequirementの「等」がopen-endedでFormal scopeと一致していない点である。
- `NFR-MA-023` はCode側のSSOT実態は成立しているが、一部Markdownに型契約自体のSSOTであるように読める表現が残り、PR #78ではFormal assertion不足もstop理由になっている。

### Owner decision

#### NFR-MA-020

`D-020` をLiteral維持しない。Current contractは次の責務境界とする。

> Domain状態・永続状態・業務判断に影響するValidation / Normalizationは、PresentationのValidationだけに依存せずApplicationまたはDomain boundaryで必ず成立させる。PresentationはUX目的の補助Validationを行ってよい。Form state / Runtime Validation libraryは画面特性に応じて選択し、React Hook Form / Zodを全入力へ一律必須としない。

重要なのはlibrary統一ではなく、Presentationを迂回してApplicationを直接呼んでも業務不変条件が成立することである。

#### NFR-MA-021

`D-021` をLiteral維持しない。Current contractは次のplatform isolationとする。

- Native presentationはReact Native primitives / StyleSheet / shared design tokensを利用する。
- Native presentationからWeb CSS、React Aria Components、`.web` module、Web DOM storage/globalへ依存しない。
- Web-only stylesheetはWeb composition rootからのみ取り込む。
- `.web.tsx` / `.native.tsx` はplatform-specific implementationが必要な境界で使用する。
- CSS Modulesは一律必須としない。
- Enforcementは既存 `check:native-route-dependencies` を正本とし、必要なscan root / forbidden patternだけを同scriptへ最小追加する。

#### NFR-MA-022

`D-022` の方向性は維持する。ただしCurrent RequirementとFormal enforcementの対象は明示的に次へ限定する。

- Dialog
- Combobox
- Listbox
- Menu

`NFR-MA-022` から曖昧な「等」を外し、上記4種をReact Aria Componentsへ限定するCurrent contractとして記述する。Tabs / Grid / Tree等を今回のremediationで勝手に追加しない。

#### NFR-MA-023

`D-026` を維持する。

- TypeScript type / interface / union / enum-equivalent、Dexie schema / version / table定義はCodeがSSOT。
- Markdownは意味、責務、理由、利用上の契約説明を担う。
- CodeとMarkdownの全文同期や意味比較をmachine化しない。
- Formal evidenceは対象文書のauthority declarationを最小限固定するだけとし、汎用governance validatorへ拡張しない。

## 3. Non-goals / Stop conditions

### Non-goals

- PR #78のTraceability更新、count再計算、`CT-BOUNDARY-001 = covered` の手動変更。
- `FR-AR-003` の再実装。
- 全Web Form / Search / Filter / Native FormのRHF + Zod化。
- RHF / Zod利用件数やForm inventoryを固定するarchitecture test。
- CSS Modules導入・全面移行。
- `global.css`全面整理。
- Admin route / componentの一括`.web.tsx`化。
- NFR-MA-021のためにNative dependency scanを複数test/scriptへ重複実装すること。
- 新しいUI / Form / styling framework導入。
- FR-AR-001を理由としたCart / Checkout read DTO全面再設計。
- FR-AR-001を理由としたgenerated manifest依存の全Repository一括撤去。
- FR-AR-001の一般文言だけを理由に、この注文作成で使わないRole / Rank等のdead Command fieldを追加すること。
- Image Manifest generator再設計、Runtime manifest API / JSON endpoint追加。
- multi-tab atomic reset実装。
- 新しいPlaywright project / workflow追加。
- React Aria Components wrapper framework新設。
- NFR-MA-022の対象をTabs / Grid / Tree等へ拡張すること。
- MarkdownとCodeの自動生成・全文意味比較・全Markdown横断のSSOT validator新設。
- AST parser / ESLint plugin等の新しい解析基盤導入。
- 無関係なrefactor / cleanup。

### Stop conditions

次のいずれかが必要になった場合は、実装を広げず停止して報告する。

- `FR-AR-001` にDB Schema変更が必要。
- 公開Presentation Requestへ `now` / actor / generated ID / asset path map等の内部context追加が必要。
- CheckoutのUser-visible behaviorまたは公開Order DTOの意味変更が必要。
- `CreateOrderForPaymentCommand` を実際に消費させるためにCheckout / Cartのread DTO、Repository interface、Web / Native read pathを広範囲変更する必要が出る。
- generated manifestをRepositoryから全面撤去しないとFR-AR-001をFormal化できないと判断した場合。勝手に撤去せず停止する。
- DB version / checkout session / cart version等の既存transaction semanticsを崩さないとCommand化が成立しない。
- `FR-AR-004` Formal化のためにmulti-tab atomic reset自体の実装が必要。
- `FR-AR-004` をCIへ含めるために新しいPlaywright project / workflowが必要になる。
- `NFR-MA-020` Formal化のために全Form inventoryやRHF / Zod source countの固定が必要。
- `NFR-MA-021` Formal化のためにCSS Modules導入、大量`.web.tsx` rename、または新しい依存解析基盤が必要。
- `NFR-MA-022` のStatic Contractが大規模allowlistやAST parserを必要とする。
- `NFR-MA-023` Formal化のために対象2文書を超えた全Markdown scan、semantic lint、Code/Markdown生成等が必要。
- latest main取込後にRequirement / Decision / implementation seamが本Planの前提から変わっている。

## 4. 実装順序

### Task 0: latest main取込と前提再確認

1. working treeがcleanであることを確認する。
2. branchが `investigate/nfr-ma-020-021` であることを確認する。
3. `origin/main` をfetchし、branchがbehindならlatest mainを取り込む。
4. 取込後に次を再読する。
   - `docs/13_decisions/decision_log.md`
   - `docs/01_requirements/non_functional_requirements.md`
   - `docs/04_data/application_contracts.md` のInput trust boundary / Checkout契約
   - `docs/plans/2026-08-31_nfr-ma-020-021-decision-investigation.md`
   - 本Plan
   - PR #78のCurrent audit前提
5. Decision Logの末尾IDを確認し、`D-020` / `D-021` をsupersedeする新Decisionに「次に空いている連番」を割り当てる。
   - 現時点では `D-031` までなので `D-032` / `D-033` が想定される。
   - latest mainで既に使用されていれば上書きせず、次の連番へずらす。
   - Decision Log、Requirement参照、PR本文で同じIDを使う。
6. baselineとして変更対象周辺の既存test / gateを実行し、既存failureがないことを確認する。

### Task 1: Decision / RequirementをCurrent contractへ整合する

#### NFR-MA-020

- `D-020` は削除・書換せず、historyとして残す。
- 新Decisionを追加し、「Domain状態・永続状態・業務判断に影響するValidation / NormalizationはApplicationまたはDomain boundaryで成立させる。Presentation validationはUX補助。libraryは一律強制しない」と明示する。
- `NFR-MA-020` も同じ責務境界へ更新する。
- RHF / Zodを禁止しない。既存利用箇所はそのままでよい。
- Search / Filter / Native入力へRHF + Zodを機械的に導入しない。

#### NFR-MA-021

- `D-021` は削除・書換せず、historyとして残す。
- 新Decisionを追加し、Native / Web isolationと既存gate再利用方針を明示する。
- `NFR-MA-021` も同じplatform boundaryへ更新する。
- CSS Modulesや`.web.tsx`の件数を品質指標にしない。

#### NFR-MA-022

- `D-022` のrow自体はhistoryとして書換えない。
- `NFR-MA-022` は「WebのDialog / Combobox / Listbox / MenuはReact Aria Componentsを使用し、独自complex widget implementationを追加しない」というCurrent contractへ具体化する。
- Decision Logの既存「実装補足」に1文だけ追加し、D-022のCurrent enforcement対象が上記4種であることを明示する。
- 新Decisionは追加しない。

### Task 2: FR-AR-001 — Request → internal Command境界をCheckoutで成立させる

#### Command shape

`CreateOrderForPaymentCommand` はRequest fieldに加え、この注文作成mutationで実際に使用する内部contextを保持する。

最低限、Current implementationで次をCommandへ補完する。

- `userId`
- `orderId`
- `paymentId`
- `orderItemIds`（confirmation item順と1:1で対応する配列）
- `orderStatusHistoryId`
- `now`
- `assetPathByAssetId`

この注文作成mutationで使わないRole / Rank等を、一般契約の文言だけを理由にdead fieldとして追加しない。membershipRank snapshot等の業務データはCurrent confirmation dataを利用してよい。

#### 構築とconsumption

- Presentationから `beginOrder()` へ渡すのはCurrent `CreateOrderForPaymentRequest` のままとする。
- `beginOrder(request)` でApplicationがCurrent customerとClockを解決する。
- transaction内でsession / confirmation / cart versionをCurrent順序どおり検証する。
- confirmation確定後、Applicationの `IdGenerator` で上記Entity ID群を生成する。
- confirmationの `line.image.assetId -> line.image.path` から `assetPathByAssetId` をApplication内で構築する。
- その時点で `CreateOrderForPaymentCommand` を1つ構築する。
- 以降のOrder作成処理は、可能な限りlocalの `request` / `user.id` / `now` / `idGenerator.generate()` へ戻らず、Commandのfieldを使用する。
- Order Item IDは `command.orderItemIds[index]` を使用する。
- Order Itemの `primaryImagePathSnapshot` は `command.assetPathByAssetId[line.image.assetId]` を使用する。
- Order / Payment / Status HistoryのID、`createdAt` / `updatedAt`、checkout更新のCurrent user / version条件も、該当するCommand fieldを消費する。

#### 変更しないread boundary

- Current `DexieCartRepository.getCartDto()` のManifest path解決は、このRequirementだけを理由に移動しない。
- Current `CheckoutSessionRepository.getConfirmation()` のpublic DTO形状を、このRequirementだけを理由にraw DTOへ分割しない。
- `getConfirmation()` のWeb / Native表示経路を、このRequirementだけを理由に再設計しない。
- `ProductImageManifestRepository` をCheckout Use Caseへ新規注入することを前提にしない。
- Cart / Checkout read architectureの全面整理は別論点とし、今回のstop解消へ混ぜない。

#### transaction semantics

- cart version、checkout session/version/status、order/payment作成等の既存 `create-order` transaction semanticsを維持する。
- confirmation取得、cart version確認、inventory/product確認、order/payment writeの既存順序を、不必要にtransaction外へ移動しない。
- Commandは既存transaction内で取得済みのconfirmation valueから構築してよい。
- 外部async portをtransactionへ新規持ち込まない。

#### Formal evidence

- `tests/integration/checkout-order-use-cases.test.ts` を中心に、Presentation Requestへ `userId` / `now` / generated ID / asset path mapを要求せず注文作成できることを確認する。
- deterministicな `IdGenerator` を用い、Order / Payment / Order Item / Status HistoryへApplication生成IDが反映されることを確認する。
- Order Item SnapshotのpathがconfirmationのassetIdに対応した `command.assetPathByAssetId` 経由で保存されることを確認する。
- Source contractが必要な場合も、`CreateOrderForPaymentCommand` のshapeとUse Case内での構築/consumptionを固定する狭いassertionに限定する。
- Repositoryからgenerated manifest importを全面禁止するassertionは追加しない。

### Task 3: FR-AR-002 — Generated Manifest Runtime SSOTをbounded evidenceでFormal化する

Product / generator / manifest formatは原則変更しない。

Formal evidenceは次の3点をbounded-multi-refとして束ねる。

1. 既存 `tests/contracts/image-manifest.test.ts`
   - canonical generated TypeScript moduleを直接読み、Asset metadata / 実ファイル / Seed参照整合を検証する。
2. `StaticManifestRepository` のpositive binding
   - `src/infrastructure/image-assets/static-manifest-repository.ts` が同じcanonical generated TypeScript moduleをRuntime sourceとして利用していることを、既存testへ最小assertion追加または最小focused testで固定する。
3. 既存security check
   - Runtime Fetch / XHR / WebSocket / EventSource / runtime JSON manifest禁止を既存security checkで維持する。

追加ルール:

- 1つのassertionだけでFR-AR-002全体をcovered扱いしない。
- security checkの禁止regexをVitestへ複製しない。
- alternate runtime manifest SSOTを新設しない。

### Task 4: FR-AR-004 — supported reset boundaryをFormal化しCIへ組み込む

- Current decision `D-014` の意味を維持する。
- fixtureがextra Pageをcloseしてからsupported resetを行うCurrent behaviorを維持する。
- focused Playwright harness testを1本追加する。
  1. primary Pageを保持する。
  2. extra Pageを1つ作る。
  3. supported scenario reset boundaryを実行する。
  4. extra Pageが境界外としてcloseされ、primary Pageでresetが成功することを確認する。
- 「複数Tabを原子的にresetできる」ことはassertしない。
- `D-023` の必須12 E2E mappingは変更しない。
- 新Playwright project / workflowは増やさない。
- one-purposeの小さいharness contract specを追加し、`package.json` の既存 `test:e2e:chromium` にそのspecを明示追加する。
- これによりCurrent Web CIの `required` matrixが継続的に同じharness testを実行する状態にする。

### Task 5: NFR-MA-020 — Application / Domain validation ownershipをFormal化する

#### Requirementの証明対象

証明するのは「RHF / Zodを使っていること」ではない。

- Presentationを経由せずApplication Use Caseを直接呼んでも、Domain状態・永続状態・業務判断に影響するValidation / Normalizationが成立する。
- Presentation validationだけが唯一の防御線になっていない。

#### Formal evidence方針

- 1つのAuth testだけでNFR全体をcoveredとしない。
- 既存testを最大限再利用し、複数の独立したmutation boundaryをbounded-multi-refとして束ねる。
- 最低でも異なる責務の境界を複数確認する。例:
  - Auth / Registration / Profile / Address系のApplication入力validation。
  - Admin Category / Brand等のApplication入力validation / normalization / business rule。
- 既存testで十分なら新規testを増やさない。
- 明確に不足する場合だけ、Use Caseを直接呼ぶfocused assertionを追加する。
- 全Use Case / 全Formのinventory testを作らない。
- RHF / Zod import count、Form数、Presentation source scanをNFR evidenceにしない。

### Task 6: NFR-MA-021 — 既存Native dependency gateを拡張・再利用する

Formal enforcementの正本は既存 `scripts/check-native-route-dependencies.ts` とする。

#### 既存gateを維持する理由

- 既にNative route / `src/presentation/native/**` / Native runtime / Native infrastructureの依存を走査している。
- `.web` import、Dexie、React Aria Components、browser globals、CSS importを既に禁止している。
- Mobile App CIの `Native Static` jobで `pnpm run check:native-route-dependencies` が実行されている。
- 同等scanを `tests/contracts/architecture.test.ts` へ追加すると、regex / scan rootの二重管理になる。

#### 今回の実装

- `scripts/check-native-route-dependencies.ts` のCurrent scan root / forbidden patternをRequirementと照合する。
- `src/presentation/native/**` と既存 `*.native.*` / Native entry point coverageは維持する。
- platform resolver用の薄いgeneric shimでNative依存境界上必要なものが漏れている場合だけ、個別pathを最小追加する。`app/**/*.tsx` 全件scanのようなWeb routeまで巻き込む拡張はしない。
- `indexedDB` がCurrent禁止patternに不足している場合は追加する。
- 既存 `tests/contracts/architecture.test.ts` のNative entry-point checkは削除しなくてよいが、今回同じ全面scanをそこへ追加しない。
- `tests/contracts/native-ci-workflow.test.ts` 等に既にCI stepのassertionがあれば再利用する。なければ `pnpm run check:native-route-dependencies` がMobile App CIで実行されることだけを固定する最小assertionを1つ追加する。
- CSS Modules数、`.web.tsx`数、`global.css`行数はassertしない。

### Task 7: NFR-MA-022 — Current complex widget scopeを具体化しFormal化する

#### Requirement / Decision alignment

- `NFR-MA-022` の「Dialog / Combobox等」をやめ、Current enforcement対象を次の4種へ明示する。
  - Dialog
  - Combobox
  - Listbox
  - Menu
- Decision LogのD-022実装補足にも同じCurrent enforcement setを1文だけ記載する。
- Tabs / Grid / Tree等は今回対象に追加しない。

#### Scan root

- `src/presentation/**/*.{ts,tsx}`
- `app/**/*.{ts,tsx}`

から、`src/presentation/native/**`、`*.native.*`、`app/**/*.native.*` を除外したWeb presentation sourceを対象にする。

#### Contract方針

- 上記source内でraw `<dialog>` または `role="dialog"` / `role="combobox"` / `role="listbox"` / `role="menu"` のcustom markerを原則禁止する。
- React Aria Components自身がruntimeで生成するARIA roleはnode_modules側でありsource scan対象外なので、RAC利用を理由にsource markerを許容する必要は基本的にない。
- Current sourceに正当な例外が実在する場合だけ、exact fileの最小allowlistを使用する。
- plain HTML `select` 等、Current contractでcomplex widgetとして扱わないものは対象外。
- AST parser / ESLint plugin / wrapper frameworkを導入しない。

### Task 8: NFR-MA-023 — D-026とDocumentation authorityを整合しFormal化する

変更対象は原則次だけとする。

- `docs/04_data/domain_types.md`
- `docs/04_data/application_contracts.md`
- `docs/13_decisions/decision_log.md` はD-026のCurrent authority確認のみ。D-026自体の意味は変更しない。

#### Documentation wording

2文書へ同じ意味の短いauthority declarationを明示する。

- TypeScript type / interface / union / enum-equivalentはCodeがSSOT。
- Dexie schema / version / table定義はCodeがSSOT。
- Markdownは意味・責務・理由・契約説明を担う。
- authorityは `D-026` に従う。

文書ごとに長い説明を増やさず、既存の誤解を招くSSOT表現をこの宣言へ寄せる。

#### Formal evidence

- 既存 `tests/contracts/architecture.test.ts` または同じ `tests/contracts` 配下の最小testへ1 contractだけ追加する。
- contractは次だけを確認する。
  1. Decision LogにCurrent `D-026` authorityが存在する。
  2. `domain_types.md` に上記authority declarationが存在する。
  3. `application_contracts.md` に上記authority declarationが存在する。
- assertion対象の文言は、2文書へ意図的に置く短いstable authority declarationだけにする。
- 全Markdownの「正本」検索、文章意味比較、型一覧比較、Code/Markdown生成、semantic lintは追加しない。
- 汎用validatorや新scriptは作らない。

### Task 9: Requirement単位で再監査する

実装後、PR #88内で次の4点を7 Requirementそれぞれについて確認する。

1. Current Requirement
2. Current Decision
3. Production implementation
4. Formal assertion / evidence

いずれかが欠ける場合はPR #88のremediation gapとして扱う。PR #78のTraceability記述を操作してcovered扱いにしない。

特に次を再確認する。

- `FR-AR-001`: CommandへCurrent user / Clock /実際に生成するEntity ID / Manifest resolved valueが補完され、実処理がそれを消費している。
- `FR-AR-002`: generated module integrity + Runtime binding + no-fetchの3 evidenceを束ねて説明できる。
- `NFR-MA-021`: Native dependency enforcementの正本が1つに寄っており、CIで継続実行される。
- `NFR-MA-022`: Requirementに曖昧な「等」が残らず、Formal scan setと一致する。

### Task 10: 関連cleanupだけ行う

- FR-AR-001対応で不要になったlocal variable、dead helper、未使用import等は同じ変更に直接関係するものだけ削除する。
- Cart / Checkout read repositoryのmanifest importは今回のCommand境界変更だけを理由に削除しない。
- NFR-MA-021で既存gateを再利用するため、同じscan helper / regex setを別testへコピーしない。
- incidental refactor、命名統一、directory再編等は行わない。

## 5. Candidate files

実装開始時にlatest branchで再確認し、必要なものだけ変更する。

### Decision / Requirement

- `docs/13_decisions/decision_log.md`
- `docs/01_requirements/non_functional_requirements.md`

### FR-AR-001

- `src/application/contracts/orders.ts`
- `src/application/use-cases/checkout-order-use-cases.ts`
- `tests/integration/checkout-order-use-cases.test.ts`

FR-AR-001では、原則としてCheckout / Cart Repository interfaceやWeb / Native composition rootを変更候補にしない。必要になった場合はStop conditionを先に評価する。

### FR-AR-002

- `tests/contracts/image-manifest.test.ts`
- `src/infrastructure/image-assets/static-manifest-repository.ts`
- StaticManifestRepositoryの既存repository/contract test（存在すれば再利用）
- existing security validation

### FR-AR-004

- `e2e/web/fixtures.ts`
- one-purpose Playwright harness contract spec
- `package.json` の既存 `test:e2e:chromium` script

### NFR-MA-020

- existing Application integration tests

### NFR-MA-021

- `scripts/check-native-route-dependencies.ts`
- `.github/workflows/native-ci.yml` は原則変更せず、既存stepを利用する
- `tests/contracts/native-ci-workflow.test.ts` は必要な場合のみ最小assertion追加
- `tests/contracts/architecture.test.ts` は今回のNative全面scan追加先にしない

### NFR-MA-022 / 023

- `tests/contracts/architecture.test.ts`
- `docs/04_data/domain_types.md`
- `docs/04_data/application_contracts.md`

### 変更しない成果物

- `docs/12_quality/requirements_traceability.md`
- PR #78本文 / branch / Run Artifact

## 6. Validation plan

重複した個別command列挙ではなく、既存の総合gateを正本として使う。

### Focused validation

各Task実装直後に、変更箇所へ最も近いvalidationを実行する。

特に:

- FR-AR-001 Checkout Application integration test
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

`pnpm run verify` が既にFormat / Markdown / spec / curriculum / lint / typecheck / manifest / security / Vitest suites / Web build / spec buildを束ねているため、同じcommandをPlanへ二重列挙しない。

FR-AR-004 harness specは `test:e2e:chromium` に含めるため、focused実行とfull E2Eの両方で確認される。

### PR gate

- PR #88のexact head SHAを取得する。
- exact head SHAに対するrequired CIを確認する。
- Web CIのrequired Chromium E2EでFR-AR-004 harness specが実行されていることをlogから確認する。
- Mobile App CIのNative Staticで `check:native-route-dependencies` が実行されていることを確認する。
- failureを無関係扱いするのは、main由来または外部要因であることをlogで明示できる場合だけとする。
- headが動いた場合は旧SHAの結果を流用しない。

## 7. Review checklist

### Scope

- [ ] PR #88の残7 Requirementだけに変更を限定した。
- [ ] PR #78を変更していない。
- [ ] literal RHF/Zod migrationをしていない。
- [ ] literal CSS Modules/.web migrationをしていない。
- [ ] FR-AR-001のためにCart / Checkout read architectureを全面変更していない。
- [ ] NFR-MA-021のdependency scanを複数箇所へ重複実装していない。
- [ ] 無関係refactorを含まない。

### Decision / Requirement

- [ ] latest main取込後の次の空きDecision IDを使った。
- [ ] `D-020` / `D-021` を削除せずsupersedeした。
- [ ] NFR-MA-020はlibrary requirementではなく業務validation ownershipを表す。
- [ ] NFR-MA-021はfile-count requirementではなくplatform isolationを表す。
- [ ] NFR-MA-022はDialog / Combobox / Listbox / MenuへCurrent scopeが明示されている。
- [ ] NFR-MA-023はD-026を維持する。

### FR-AR-001

- [ ] Presentation Requestへ内部contextを追加していない。
- [ ] `CreateOrderForPaymentCommand` にこのmutationで実際に使う `userId` / generated IDs / `now` / `assetPathByAssetId` が補完される。
- [ ] Order作成処理がCommandの内部contextとRequest由来fieldを実際に消費している。
- [ ] Order Item ID / Status History IDもCommand経由で使用している。
- [ ] Order Item Snapshot pathはCommandのasset map経由で決定している。
- [ ] unused role/rank等のdead Command fieldを追加していない。
- [ ] Cart / Checkout read DTO / Repositoryを不要に分割していない。
- [ ] transaction / version semanticsを崩していない。

### Formal evidence

- [ ] FR-AR-002はgenerated module integrity / Runtime binding / no-fetchの3 evidenceで説明できる。
- [ ] NFR-MA-020をAuth 1例だけで全体coveredにしていない。
- [ ] NFR-MA-020は複数の独立したApplication mutation boundaryをbounded-multi-refで説明できる。
- [ ] NFR-MA-021の正本enforcementは既存native dependency scriptであり、同等scanをarchitecture testへ複製していない。
- [ ] NFR-MA-021のgateがMobile App CIで継続実行される。
- [ ] NFR-MA-022はRequirementのCurrent widget setとStatic Contract対象が一致する。
- [ ] NFR-MA-023はD-026 + 2文書のstable authority declarationを最小Formal contractで固定している。
- [ ] NFR-MA-023のために汎用prose validator / semantic lintを追加していない。
- [ ] FR-AR-004 harness testが既存 `test:e2e:chromium` に含まれている。
- [ ] Formal gapだけを埋める箇所でProductを不要に変更していない。

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

PR #88がmergeされた後だけPR #78側で行う。

1. PR #78へlatest mainを取り込む。
2. `CT-BOUNDARY-001` の7 RequirementをCurrent Requirement → Decision → Production implementation → Formal evidenceの順で再監査する。
3. 7件すべてに実Evidenceがある場合だけ `stop = 0` と判断する。
4. 下位22 label countを再計算する。
5. PR #78本文 / current headを更新する。
6. PR #78 exact head CIを確認する。
7. 最終review後にmergeする。

## 9. 実装者への最重要ルール

- stopを消すこと自体を目的にしない。
- RequirementをEvidenceへ合わせて都合よく狭めない。
- Current implementationに合わせるだけの無言のRequirement変更をしない。
- Product gapはProductで直し、Formal gapだけならTest / Contractで直す。
- `D-020` / `D-021` はhistoryとして残し、latest main時点の次の空きDecision IDで明示的にsupersedeする。
- FR-AR-001はRequest → internal Commandの実装gapを閉じ、Current user / generated Entity IDs / Clock / Manifest resolved valueのうち実処理で使う内部contextをCommandへ載せて消費する。
- FR-AR-001をCart / Checkout read architecture全面整理へ広げない。
- FR-AR-002は1 assertionではなく、generated module integrity / Runtime binding / no-fetchをbounded evidenceとして扱う。
- FR-AR-004のFormal evidenceは既存CI経路へ必ず載せる。
- NFR-MA-021は既存native dependency scriptを正本として再利用し、同等scanを複製しない。
- NFR-MA-022は曖昧な「等」を残さず、Current 4 widget setだけをFormal化する。
- `NFR-MA-023`は`D-026`をCurrent authorityとして扱い、対象2文書のstable declarationだけを最小Formal contractで固定する。
- 追加の汎用framework、migration、validatorは作らない。
- Stop conditionに触れたら実装者判断で範囲を広げず報告する。
- PR #78はこのPRでは触らない。
