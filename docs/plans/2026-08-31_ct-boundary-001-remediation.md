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
- このPlanは実装者に設計判断を委ねるための文書ではない。ここで決めた責務・境界・Stop conditionに従って実装する。

## 1. ゴール / 完了条件

### ゴール

残7 Requirementについて、Current Requirement、Decision、Production implementation、Formal evidenceを矛盾なく接続する。

### 完了条件（DoD）

- [ ] `FR-AR-001`: Presentationは `CreateOrderForPaymentRequest` だけを渡し、Application Use Caseが内部 `CreateOrderForPaymentCommand` を組み立てる。
- [ ] `FR-AR-001`: Applicationが `now`、既存のgenerated ID、Manifest resolved value等の内部contextを補完し、Order作成処理がそのCommandを実際に消費する。
- [ ] `FR-AR-001`: Cart / Checkoutのread DTOやRepository責務を、Formal coverageのためだけに広範囲変更しない。
- [ ] `FR-AR-001`: Checkout表示、Order Item Snapshot、Payment retry等の既存Product behaviorとtransaction semanticsを維持する。
- [ ] `FR-AR-002`: Build生成TypeScript ModuleがRuntime image manifestのSSOTであることをpositiveなFormal contractで固定する。
- [ ] `FR-AR-002`: Runtime Fetch / Runtime JSON manifest禁止は既存security checkを再利用し、二重実装しない。
- [ ] `FR-AR-004`: supported reset boundaryが1 Browser Context / 1 PageであることをPlaywright harness evidenceで固定する。
- [ ] `FR-AR-004`: harness evidenceは既存 `test:e2e:chromium` のCI実行経路へ含め、one-shotの手動testにしない。
- [ ] `FR-AR-004`: multi-tab atomic resetを新規実装・保証しない。
- [ ] `NFR-MA-020`: `D-020` をsupersedeする新DecisionとRequirementを、Application / Domain validation ownership中心のCurrent contractへ更新する。
- [ ] `NFR-MA-020`: Formal evidenceは1画面・1Auth例だけで全体を代表させず、複数の独立したmutation boundaryをbounded-multi-refで確認する。
- [ ] `NFR-MA-020`: RHF / Zod利用件数や全Form inventoryを固定するsource scanを追加しない。
- [ ] `NFR-MA-021`: `D-021` をsupersedeする新DecisionとRequirementをWeb / Native platform isolation中心のCurrent contractへ更新する。
- [ ] `NFR-MA-021`: Native presentation境界のscan rootと禁止依存を明示し、部分的なentry pointだけの検査で済ませない。
- [ ] `NFR-MA-021`: CSS Modules全面移行、`global.css`全面整理、Web componentの機械的`.web.tsx`化を行わない。
- [ ] `NFR-MA-022`: Current contractで対象とするcomplex widget setを明示し、React Aria Components境界を狭いStatic Contractで固定する。
- [ ] `NFR-MA-023`: `domain_types.md` / `application_contracts.md` 等のSSOT表現を `D-026` へ整合する。
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
- `D-020` は「FormはReact Hook Form、ValidationはZodを使用する」。
- `D-021` は「Shared UIはReact Native StyleSheet、Web専用Admin/Layoutは`.web.tsx`とCSS Modulesを使用する」。
- `D-026` は「実装開始後はTypeScript型・Enum・Dexie Schemaのコードを正本とし、Markdownは意味と理由を正本とする」。
- Current branchのDecision Logは現時点で `D-031` まで存在するが、実装開始前にlatest mainを取り込むため、新Decision IDは固定値として扱わない。
- `FR-AR-001` のCurrent implementationではAuth / Cart等はidentity / actor / clock / generated IDを概ねApplicationで解決している。
- `CreateOrderForPaymentCommand` は `now` と `assetPathByAssetId` を持つが、Current `beginOrder()`では利用されず、Requestから直接transaction処理へ進んでいる。
- `CheckoutOrderUseCases.beginOrder()` は現在 `checkouts.getConfirmation()` が返すpath解決済みDTOを使ってOrder Item Snapshotを作成している。
- generated manifestはCurrent `DexieCartRepository.getCartDto()` のread mappingでも使用され、Checkout confirmationはそのCart DTOを再利用している。したがってManifest path解決をRepositoryから全面撤去するとCart read pathまで巻き込む。
- `FR-AR-001` の主gapは、Checkout read architecture全体ではなく、Requestから内部Commandへのcontext補完とCommand consumptionが実装上成立していない点である。
- `FR-AR-002` はProduct実装自体はgenerated TypeScript manifestを使用し、既存security checkがRuntime Fetch / JSON accessを禁止している。主gapはpositive Runtime SSOT evidenceである。
- `FR-AR-004` はProduction reset自体はCurrent contractへ概ね整合し、`e2e/web/fixtures.ts` がreset前にextra Pageをcloseしている。主gapはsupported harness boundaryのFormal evidenceである。
- Current `test:e2e:chromium` は明示したspecだけを実行するため、新しいharness specを作るだけではCIへ自動で含まれない。
- `NFR-MA-022` はCurrent ProductがReact Aria Componentsを利用しており、custom complex widgetは確認されていない。主gapは将来の境界違反を検出するStatic Contractである。
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
- 新しいUI / Form / styling framework導入。
- FR-AR-001を理由としたCart / Checkout read DTO全面再設計。
- FR-AR-001を理由としたgenerated manifest依存の全Repository一括撤去。
- Image Manifest generator再設計、Runtime manifest API / JSON endpoint追加。
- multi-tab atomic reset実装。
- 新しいPlaywright project / workflow追加。
- React Aria Components wrapper framework新設。
- MarkdownとCodeの自動生成・全文意味比較・全Markdown横断のSSOT validator新設。
- AST parser / ESLint plugin等の新しい解析基盤導入。
- 無関係なrefactor / cleanup。

### Stop conditions

次のいずれかが必要になった場合は、実装を広げず停止して報告する。

- `FR-AR-001` にDB Schema変更が必要。
- 公開Presentation Requestへ `now` / actor / asset path map等の内部context追加が必要。
- CheckoutのUser-visible behaviorまたは公開Order DTOの意味変更が必要。
- `CreateOrderForPaymentCommand` を実際に消費させるためにCheckout / Cartのread DTO、Repository interface、Web / Native read pathを広範囲変更する必要が出る。
- generated manifestをRepositoryから全面撤去しないとFR-AR-001をFormal化できないと判断した場合。勝手に撤去せず停止する。
- DB version / checkout session / cart version等の既存transaction semanticsを崩さないとCommand化が成立しない。
- `FR-AR-004` Formal化のためにmulti-tab atomic reset自体の実装が必要。
- `FR-AR-004` をCIへ含めるために新しいPlaywright project / workflowが必要になる。
- `NFR-MA-020` Formal化のために全Form inventoryやRHF / Zod source countの固定が必要。
- `NFR-MA-021` Formal化のためにCSS Modules導入または大量`.web.tsx` renameが必要。
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
   - `docs/plans/2026-08-31_nfr-ma-020-021-decision-investigation.md`
   - 本Plan
   - PR #78のCurrent audit前提
5. Decision Logの末尾IDを確認し、`D-020` / `D-021` をsupersedeする新Decisionに「次に空いている連番」を割り当てる。
   - 現時点では `D-031` までなので `D-032` / `D-033` が想定される。
   - latest mainで既に使用されていれば上書きせず、次の連番へずらす。
   - Decision Log、Requirement参照、PR本文で同じIDを使う。
6. baselineとして変更対象周辺の既存testを実行し、既存failureがないことを確認する。

### Task 1: NFR-MA-020 / NFR-MA-021のDecisionとRequirementを更新する

#### NFR-MA-020

- `D-020` は削除・書換せず、historyとして残す。
- 新Decisionを追加し、「Domain状態・永続状態・業務判断に影響するValidation / NormalizationはApplicationまたはDomain boundaryで成立させる。Presentation validationはUX補助。libraryは一律強制しない」と明示する。
- `NFR-MA-020` も同じ責務境界へ更新する。
- RHF / Zodを禁止しない。既存利用箇所はそのままでよい。
- Search / Filter / Native入力へRHF + Zodを機械的に導入しない。

#### NFR-MA-021

- `D-021` は削除・書換せず、historyとして残す。
- 新Decisionを追加し、Native / Web isolationを明示する。
- `NFR-MA-021` も同じplatform boundaryへ更新する。
- CSS Modulesや`.web.tsx`の件数を品質指標にしない。

### Task 2: FR-AR-001 — Request → internal Command境界をCheckoutで成立させる

#### 実装原則

- Presentationから `beginOrder()` へ渡すのはCurrent `CreateOrderForPaymentRequest` のままとする。
- `beginOrder(request)` 内でApplicationがCurrent User、Clock、generated ID等の既存内部contextを解決するCurrent責務を維持する。
- `checkouts.getConfirmation()` から得られるCurrent path-resolved confirmation dataを利用し、Applicationが `assetPathByAssetId` を組み立てる。
- Applicationは `CreateOrderForPaymentCommand` を明示的に構築する。
- Commandを作るだけで終わらせず、その後のOrder作成処理が `command.checkoutSessionId`、`command.checkoutActionVersion`、`command.now`、`command.assetPathByAssetId` を実際に使用する。
- Order Itemの `primaryImagePathSnapshot` は `command.assetPathByAssetId` から取得する。
- generated IDsは引き続きApplicationの `IdGenerator` から生成し、Presentationへ要求しない。

#### 変更しないread boundary

- Current `DexieCartRepository.getCartDto()` のManifest path解決は、このRequirementだけを理由に移動しない。
- Current `CheckoutSessionRepository.getConfirmation()` のpublic DTO形状を、このRequirementだけを理由にraw DTOへ分割しない。
- `getConfirmation()` のWeb / Native表示経路を、このRequirementだけを理由に再設計しない。
- `ProductImageManifestRepository` をCheckout Use Caseへ新規注入することを前提にしない。
- Cart / Checkout read architectureの全面整理は別論点とし、今回のstop解消へ混ぜない。

#### transaction semantics

- cart version、checkout session/version/status、order/payment作成等の既存 `create-order` transaction semanticsを維持する。
- confirmation取得、cart version確認、inventory/product確認、order/payment writeの既存順序を、不必要にtransaction外へ移動しない。
- Commandは既存transaction内で取得済みのconfirmation valueから構築してよい。外部async portをtransactionへ新規持ち込まない。

#### Formal evidence

- `tests/integration/checkout-order-use-cases.test.ts` を中心に、Presentation Requestへ `now` / asset path map / generated IDを要求せず注文作成できることを確認する。
- Order Item SnapshotのpathがCurrent confirmationのassetIdに対応したApplication-generated `assetPathByAssetId` 経由で保存されることを確認する。
- Source contractが必要な場合も、`CreateOrderForPaymentCommand` がUse Case内で構築・消費されることを固定する狭いassertionに限定する。
- Repositoryからgenerated manifest importを全面禁止するassertionは追加しない。

### Task 3: FR-AR-002 — Generated Manifest Runtime SSOTをFormal化する

- Product / generator / formatは原則変更しない。
- `StaticManifestRepository` がcanonical generated TypeScript moduleをRuntime sourceとして利用していることをpositiveにassertする。
- Runtime Fetch / XHR / WebSocket / EventSource / runtime JSON manifest禁止は既存security checkを再利用する。
- 同じ禁止regex scanをVitestへ複製しない。
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

### Task 6: NFR-MA-021 — Native / Web platform isolationをFormal化する

既存 `tests/contracts/architecture.test.ts` を拡張する。

#### Native scan root

少なくとも次を対象にする。

- `src/presentation/native/**/*.{ts,tsx}`
- `src/presentation/**/*.native.{ts,tsx}`
- `app/**/*.native.{ts,tsx}`
- `src/bootstrap/native-runtime.ts`

重複fileはdedupeしてよい。

#### Nativeで禁止する依存

- Web stylesheet import（`global.css` を含む `.css` / Web-only CSS）。
- `react-aria-components`。
- `.web` module import。
- Web DOM / browser storage globals: `window`, `document`, `localStorage`, `sessionStorage`, `indexedDB`。
- 既存architecture contractで禁止しているDexie直接依存は維持する。

「Web DOM専用module」のような曖昧な文字列判定は追加しない。上記の具体的pattern / import boundaryを検査する。

#### Web-only CSS

- Web-only stylesheetがNative composition rootへ流入しないことを固定する。
- Current `root-layout.web` 等のWeb composition rootからのimportは許容する。
- CSS Modules数、`.web.tsx`数、`global.css`行数はassertしない。

### Task 7: NFR-MA-022 — React Aria Components complex widget boundaryをFormal化する

#### Current remediationで固定するwidget set

custom implementation検出対象は今回次に限定する。

- raw `<dialog>`
- `role="dialog"`
- `role="combobox"`
- `role="listbox"`
- `role="menu"`

Current Requirementの「Dialog / Combobox等」を無制限に広げず、Tabs / Grid / Tree等を今回勝手に追加しない。

#### Scan root

- `src/presentation/**/*.{ts,tsx}`
- `app/**/*.{ts,tsx}`

から、`src/presentation/native/**`、`*.native.*`、`app/**/*.native.*` を除外したWeb presentation sourceを対象にする。

#### Contract方針

- 上記source内でraw `<dialog>` または対象 `role=` markerを原則禁止し、custom complex widget混入を検出する。
- RAC自身がruntimeで生成するARIA roleはnode_modules側でありsource scan対象外なので、RAC利用を理由にmarkerを許容する必要は基本的にない。
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

### Task 10: 関連cleanupだけ行う

- FR-AR-001対応で不要になったlocal variable、dead helper、未使用import等は同じ変更に直接関係するものだけ削除する。
- Cart / Checkout read repositoryのmanifest importは今回のCommand境界変更だけを理由に削除しない。
- incidental refactor、命名統一、directory再編等は行わない。

## 5. Candidate files

実装開始時にlatest branchで再確認し、必要なものだけ変更する。

### Decision / Requirement

- `docs/13_decisions/decision_log.md`
- `docs/01_requirements/non_functional_requirements.md`

### FR-AR-001 / FR-AR-002

- `src/application/contracts/orders.ts`
- `src/application/use-cases/checkout-order-use-cases.ts`
- `tests/integration/checkout-order-use-cases.test.ts`
- `src/infrastructure/image-assets/static-manifest-repository.ts`
- existing manifest/security contract tests

FR-AR-001では、原則としてCheckout / Cart Repository interfaceやWeb / Native composition rootを変更候補にしない。必要になった場合はStop conditionを先に評価する。

### FR-AR-004

- `e2e/web/fixtures.ts`
- one-purpose Playwright harness contract spec
- `package.json` の既存 `test:e2e:chromium` script

### NFR-MA-020 / 021 / 022 / 023

- existing Application integration tests
- `tests/contracts/architecture.test.ts`
- `docs/04_data/domain_types.md`
- `docs/04_data/application_contracts.md`

### 変更しない成果物

- `docs/12_quality/requirements_traceability.md`
- PR #78本文 / branch / Run Artifact

## 6. Validation plan

重複した個別command列挙ではなく、既存の総合gateを正本として使う。

### Focused validation

各Task実装直後に、変更箇所へ最も近いunit / integration / contract testを実行する。

特に:

- FR-AR-001 Checkout Application integration test
- FR-AR-002 manifest / security relevant validation
- NFR-MA-020 selected Application mutation boundary tests
- NFR-MA-021 / 022 / 023 architecture contract test
- FR-AR-004 focused Playwright harness test

### Full local gate

1. `pnpm run verify`
2. FR-AR-004 focused Playwright harness test
3. `pnpm run test:e2e:chromium`
4. 変更影響に応じたNative validation / repositoryでrequiredなMobile App CI相当確認

`pnpm run verify` が既にFormat / Markdown / spec / curriculum / lint / typecheck / manifest / security / Vitest suites / Web build / spec buildを束ねているため、同じcommandをPlanへ二重列挙しない。

FR-AR-004 harness specは `test:e2e:chromium` に含めるため、focused実行とfull E2Eの両方で確認される。

### PR gate

- PR #88のexact head SHAを取得する。
- exact head SHAに対するrequired CIを確認する。
- Web CIのrequired Chromium E2EでFR-AR-004 harness specが実行されていることをlogから確認する。
- failureを無関係扱いするのは、main由来または外部要因であることをlogで明示できる場合だけとする。
- headが動いた場合は旧SHAの結果を流用しない。

## 7. Review checklist

### Scope

- [ ] PR #88の残7 Requirementだけに変更を限定した。
- [ ] PR #78を変更していない。
- [ ] literal RHF/Zod migrationをしていない。
- [ ] literal CSS Modules/.web migrationをしていない。
- [ ] FR-AR-001のためにCart / Checkout read architectureを全面変更していない。
- [ ] 無関係refactorを含まない。

### Decision / Requirement

- [ ] latest main取込後の次の空きDecision IDを使った。
- [ ] `D-020` / `D-021` を削除せずsupersedeした。
- [ ] NFR-MA-020はlibrary requirementではなく業務validation ownershipを表す。
- [ ] NFR-MA-021はfile-count requirementではなくplatform isolationを表す。
- [ ] NFR-MA-023はD-026を維持する。

### FR-AR-001

- [ ] Presentation Requestへ内部contextを追加していない。
- [ ] `CreateOrderForPaymentCommand` をApplicationが構築している。
- [ ] Order作成処理がCommandの `now` / `assetPathByAssetId` / Request由来fieldを実際に消費している。
- [ ] Order Item Snapshot pathはCommandのasset map経由で決定している。
- [ ] Cart / Checkout read DTO / Repositoryを不要に分割していない。
- [ ] transaction / version semanticsを崩していない。

### Formal evidence

- [ ] NFR-MA-020をAuth 1例だけで全体coveredにしていない。
- [ ] NFR-MA-020は複数の独立したApplication mutation boundaryをbounded-multi-refで説明できる。
- [ ] NFR-MA-021はNative presentation全体の明示scan rootを持つ。
- [ ] NFR-MA-022は今回固定するWeb scan rootとcomplex widget setが明示されている。
- [ ] NFR-MA-023はD-026 + 2文書のstable authority declarationを最小Formal contractで固定している。
- [ ] NFR-MA-023のために汎用prose validator / semantic lintを追加していない。
- [ ] FR-AR-004 harness testが既存 `test:e2e:chromium` に含まれている。
- [ ] Formal gapだけを埋める箇所でProductを不要に変更していない。

### Validation

- [ ] focused validation PASS
- [ ] `pnpm run verify` PASS
- [ ] focused FR-AR-004 Playwright PASS
- [ ] `pnpm run test:e2e:chromium` PASS
- [ ] Web CI required E2Eでharness spec実行確認
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
- FR-AR-001はRequest → internal Commandの実装gapを閉じる。Cart / Checkout read architecture全面整理へ広げない。
- FR-AR-004のFormal evidenceは既存CI経路へ必ず載せる。
- `NFR-MA-023`は`D-026`をCurrent authorityとして扱い、対象2文書のstable declarationだけを最小Formal contractで固定する。
- 追加の汎用framework、migration、validatorは作らない。
- Stop conditionに触れたら実装者判断で範囲を広げず報告する。
- PR #78はこのPRでは触らない。
