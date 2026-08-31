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

- [ ] `FR-AR-001`: CheckoutのImage Manifest Path解決責務がInfrastructure RepositoryからApplicationへ移り、Presentation Requestに内部contextを要求しない。
- [ ] `FR-AR-001`: Requestと内部Commandが実装上でも分離され、Clock / generated ID / Manifest resolved value等をApplicationが補完する。
- [ ] `FR-AR-001`: Web / Native RepositoryがCheckout path解決のためにgenerated image manifestへ直接依存しない。
- [ ] `FR-AR-001`: Checkout表示、Order Item Snapshot、Payment retry等の既存Product behaviorを維持する。
- [ ] `FR-AR-002`: Build生成TypeScript ModuleがRuntime image manifestのSSOTであることをpositiveなFormal contractで固定する。
- [ ] `FR-AR-002`: Runtime Fetch / Runtime JSON manifest禁止は既存security checkを再利用し、二重実装しない。
- [ ] `FR-AR-004`: supported reset boundaryが1 Browser Context / 1 PageであることをPlaywright harness evidenceで固定する。
- [ ] `FR-AR-004`: multi-tab atomic resetを新規実装・保証しない。
- [ ] `NFR-MA-020`: `D-020` をsupersedeする新DecisionとRequirementを、Application / Domain validation ownership中心のCurrent contractへ更新する。
- [ ] `NFR-MA-020`: Formal evidenceは1画面・1Auth例だけで全体を代表させず、複数の独立したmutation boundaryをbounded-multi-refで確認する。
- [ ] `NFR-MA-020`: RHF / Zod利用件数や全Form inventoryを固定するsource scanを追加しない。
- [ ] `NFR-MA-021`: `D-021` をsupersedeする新DecisionとRequirementをWeb / Native platform isolation中心のCurrent contractへ更新する。
- [ ] `NFR-MA-021`: Native presentation境界のscan rootと禁止依存を明示し、部分的なentry pointだけの検査で済ませない。
- [ ] `NFR-MA-021`: CSS Modules全面移行、`global.css`全面整理、Web componentの機械的`.web.tsx`化を行わない。
- [ ] `NFR-MA-022`: Current contractで対象とするcomplex widget setを明示し、React Aria Components境界を狭いStatic Contractで固定する。
- [ ] `NFR-MA-023`: `domain_types.md` / `application_contracts.md` 等のSSOT表現を `D-026` へ整合する。
- [ ] `NFR-MA-023`: prose substring test、意味比較、Markdown生成等の新しいgovernance machineryを原則追加しない。
- [ ] Product / Test / Requirement / Decisionの変更は上記7件を閉じるために必要な範囲だけである。
- [ ] PR #78、`docs/12_quality/requirements_traceability.md`、PR #78のRun Artifactを変更していない。
- [ ] `pnpm run verify` と追加の必要なPlaywright / Native / exact-head CI gateがPASSしている。
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
- `FR-AR-001` のCurrent implementationではAuth / Cart等はidentity / actor / clock / generated IDを概ねApplicationで解決している一方、Checkout image pathはRepository側でgenerated manifestから解決している。
- `CreateOrderForPaymentCommand` は `now` と `assetPathByAssetId` を持つが、Current `beginOrder()`では十分に活用されていない。
- `CheckoutOrderUseCases.beginOrder()` は現在 `checkouts.getConfirmation()` のpath解決済みDTOを使ってOrder Item Snapshotを作成している。
- `StaticManifestRepository` と既存 `ProductImageManifestRepository` portが存在するため、Manifest解決用の新generic Repositoryは不要である。
- `FR-AR-002` はProduct実装自体はgenerated TypeScript manifestを使用し、既存security checkがRuntime Fetch / JSON accessを禁止している。主gapはpositive Runtime SSOT evidenceである。
- `FR-AR-004` はProduction reset自体はCurrent contractへ概ね整合し、`e2e/web/fixtures.ts` がreset前にextra Pageをcloseしている。主gapはsupported harness boundaryのFormal evidenceである。
- `NFR-MA-022` はCurrent ProductがReact Aria Componentsを利用しており、custom complex widgetは確認されていない。主gapは将来の境界違反を検出するStatic Contractである。
- `NFR-MA-023` はCode側のSSOT実態は成立しているが、一部Markdownに型契約自体のSSOTであるように読める表現が残る。

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
- Image Manifest generator再設計、Runtime manifest API / JSON endpoint追加。
- multi-tab atomic reset実装。
- React Aria Components wrapper framework新設。
- MarkdownとCodeの自動生成・全文意味比較・全Markdown横断のSSOT validator新設。
- AST parser / ESLint plugin等の新しい解析基盤導入。
- 無関係なrefactor / cleanup。

### Stop conditions

次のいずれかが必要になった場合は、実装を広げず停止して報告する。

- `FR-AR-001` にDB Schema変更が必要。
- 公開Presentation Requestへ `now` / actor / asset path map等の内部context追加が必要。
- CheckoutのUser-visible behaviorまたは公開Order DTOの意味変更が必要。
- Manifest解決のために既存 `ProductImageManifestRepository` では不足し、複数の新generic port / repository abstractionが必要。
- Web / Native別々のManifest解決ルールが必要。
- `ProductImageManifestRepository` を `ApplicationTransactionRunner` callback内から呼ぶことで、Dexie transaction lifetimeへ非transactional async workを持ち込み得る。
- DB version / checkout session / cart version等の既存transaction semanticsを崩さないとManifest移動が成立しない。
- `FR-AR-004` Formal化のためにmulti-tab atomic reset自体の実装が必要。
- `NFR-MA-020` Formal化のために全Form inventoryやRHF / Zod source countの固定が必要。
- `NFR-MA-021` Formal化のためにCSS Modules導入または大量`.web.tsx` renameが必要。
- `NFR-MA-022` のStatic Contractが大規模allowlistやAST parserを必要とする。
- `NFR-MA-023` Formal化のためにprose semantic lint、Code/Markdown生成等が必要。
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

### Task 2: FR-AR-001 — Checkout Manifest Path責務をApplicationへ戻す

#### 実装原則

- Presentationから受ける `CreateOrderForPaymentRequest` にはユーザー入力・画面contextだけを保持する。
- `now`、generated ID、Manifest resolved value等はApplicationが内部Commandへ補完する。
- 既存 `CreateOrderForPaymentCommand` と既存 `ProductImageManifestRepository` を優先して再利用する。
- Manifest path resolutionをWeb / Dexie / Native Repositoryへ残さない。
- Web / Nativeで同じApplication mappingを共有する。

#### Repository / DTO boundary

- Checkout RepositoryはDB由来のconfirmation dataを返す。
- DB由来dataには `assetId` / alt text等の永続化・参照に必要な値を含めてよいが、generated manifestから解決したruntime pathをRepository責務にしない。
- ApplicationがManifest Repositoryの結果とraw confirmation dataを結合してpublic `CheckoutConfirmationDto` を構築する。
- `getConfirmation()` と `beginOrder()` が別々のpath解決ロジックを持たないよう、必要ならApplication内の小さいprivate/local mapping helperを共有する。
- 新しい汎用mapper framework / service abstractionは作らない。

#### beginOrder / transaction sequencing

- cart version、checkout session/version/status、order/payment作成等の既存DB transaction semanticsを維持する。
- Manifestはimmutable runtime dataだが、`ProductImageManifestRepository` 呼出をtransaction callback内へ安易に入れない。
- Manifest lookupがnon-Dexie async workとなりtransaction lifetime riskを生む可能性がある場合はStop conditionとする。
- transaction外でManifestを解決する場合も、DB snapshot / version検証と矛盾しない順序を保つ。
- Order Itemの `primaryImagePathSnapshot` はApplicationが解決したManifest mapから作る。
- current fallback / missing asset behaviorを維持する。

#### Formal evidence

- `CheckoutOrderUseCases` のintegration testを中心に、Presentation Requestにpath mapを渡さず、ApplicationがManifestを解決してconfirmation / order snapshotへ反映することを確認する。
- Web / Native repositoryからgenerated manifest direct dependencyが除かれたことは必要に応じて狭いarchitecture assertionで固定する。
- implementation detailを大量のsource-string testで固定しない。

### Task 3: FR-AR-002 — Generated Manifest Runtime SSOTをFormal化する

- Product / generator / formatは原則変更しない。
- `StaticManifestRepository` がcanonical generated TypeScript moduleをRuntime sourceとして利用していることをpositiveにassertする。
- Runtime Fetch / XHR / WebSocket / EventSource / runtime JSON manifest禁止は既存security checkを再利用する。
- 同じ禁止regex scanをVitestへ複製しない。
- alternate runtime manifest SSOTを新設しない。

### Task 4: FR-AR-004 — supported reset boundaryをFormal化する

- Current decision `D-014` の意味を維持する。
- fixtureがextra Pageをcloseしてからsupported resetを行うCurrent behaviorを維持する。
- focused Playwright harness testを1本追加する。
  1. primary Pageを保持する。
  2. extra Pageを1つ作る。
  3. supported reset helper / fixture boundaryを実行する。
  4. extra Pageが境界外として整理され、primary Pageでresetが成功することを確認する。
- 「複数Tabを原子的にresetできる」ことはassertしない。
- `D-023` の必須12 E2E mappingは変更しない。
- 新Playwright project / config / workflowを増やさない。
- 適切な既存suiteがない場合のみ、one-purposeの小さいharness contract specを追加する。

### Task 5: NFR-MA-020 — Application / Domain validation ownershipをFormal化する

#### Requirementの証明対象

証明するのは「RHF / Zodを使っていること」ではない。

- Presentationを経由せずApplication Use Caseを直接呼んでも、Domain状態・永続状態・業務判断に影響するValidation / Normalizationが成立する。
- Presentation validationだけが唯一の防御線になっていない。

#### Formal evidence方針

- 1つのAuth testだけでNFR全体をcoveredとしない。
- 既存testを最大限再利用し、複数の独立したmutation boundaryをbounded-multi-refとして束ねる。
- 最低でも異なる責務の境界を複数確認する。例:
  - Auth / Account系のApplication入力validation。
  - Profile / Address / Admin / Checkout等から、既にApplication / Domain側でinvalid inputやnormalizationを確認している独立したmutation boundaryを1つ以上。
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

少なくとも次をcustom implementation検出対象とする。

- raw `<dialog>`
- `role="dialog"`
- `role="combobox"`
- `role="listbox"`
- `role="menu"`

Current Requirementの「Dialog / Combobox等」を無制限に広げず、Tabs / Grid / Tree等を今回勝手に追加しない。

#### Contract方針

- Web presentation sourceを狭くscanし、上記complex widget markerを独自実装しているfileを検出する。
- React Aria Componentsを使うCurrent implementationは許容する。
- plain HTML `select` 等、Current contractでcomplex widgetとして扱わないものは対象外。
- runtimeでRAC自身が出力するARIA roleをsource-level custom implementationと混同しない。
- allowlistが必要でもCurrent既存例だけの最小限にする。
- AST parser / ESLint plugin / wrapper frameworkを導入しない。

### Task 8: NFR-MA-023 — D-026とDocumentation authorityを整合する

- `docs/04_data/domain_types.md`
- `docs/04_data/application_contracts.md`
- その他、今回確認したD-026と直接競合する表現だけ

を必要最小限で修正する。

明示する内容:

- TypeScript type / interface / union / enum-equivalentはCodeがSSOT。
- Dexie schema / version / table定義はCodeがSSOT。
- Markdownは意味・責務・理由・契約説明を担う。
- MarkdownがCode上の型定義そのものを上書きしない。

#### Formal evidence

- デフォルトは `D-026` + doc wording修正 + 既存Markdown/spec validationで閉じる。
- `tests/contracts/architecture.test.ts` に「D-026という文字列がある」「特定文言がある」だけのprose substring testを追加しない。
- 全Markdownの「正本」禁止、意味比較、semantic lintを追加しない。
- 既存Formal evidence framework上どうしてもmachine-readable evidenceが必須で、PR #78のbounded-multi-refでも閉じられない場合だけStopして報告する。勝手にprose validatorを新設しない。

### Task 9: Requirement単位で再監査する

実装後、PR #88内で次の4点を7 Requirementそれぞれについて確認する。

1. Current Requirement
2. Current Decision
3. Production implementation
4. Formal assertion / evidence

いずれかが欠ける場合はPR #88のremediation gapとして扱う。PR #78のTraceability記述を操作してcovered扱いにしない。

### Task 10: 関連cleanupだけ行う

- FR-AR-001対応で不要になったmanifest import、dead mapping、未使用helper等は同じ責務移動に直接関係するものだけ削除する。
- incidental refactor、命名統一、directory再編等は行わない。

## 5. Candidate files

実装開始時にlatest branchで再確認し、必要なものだけ変更する。

### Decision / Requirement

- `docs/13_decisions/decision_log.md`
- `docs/01_requirements/non_functional_requirements.md`

### FR-AR-001 / FR-AR-002

- `src/application/contracts/orders.ts`
- `src/application/use-cases/checkout-order-use-cases.ts`
- Checkout Repository / port implementations
- `ProductImageManifestRepository` port
- `StaticManifestRepository`
- Web / Native composition root
- relevant integration / contract tests
- existing manifest/security validation

### FR-AR-004

- `e2e/web/fixtures.ts`
- focused Playwright harness contract spec

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
- NFR-MA-021 / 022 architecture contract test
- FR-AR-004 focused Playwright harness test

### Full local gate

1. `pnpm run verify`
2. FR-AR-004 focused Playwright harness test
3. `pnpm run test:e2e:chromium`
4. 変更影響に応じたNative validation / repositoryでrequiredなMobile App CI相当確認

`pnpm run verify` が既にFormat / Markdown / spec / curriculum / lint / typecheck / manifest / security / Vitest suites / Web build / spec buildを束ねているため、同じcommandをPlanへ二重列挙しない。

### PR gate

- PR #88のexact head SHAを取得する。
- exact head SHAに対するrequired CIを確認する。
- failureを無関係扱いするのは、main由来または外部要因であることをlogで明示できる場合だけとする。
- headが動いた場合は旧SHAの結果を流用しない。

## 7. Review checklist

### Scope

- [ ] PR #88の残7 Requirementだけに変更を限定した。
- [ ] PR #78を変更していない。
- [ ] literal RHF/Zod migrationをしていない。
- [ ] literal CSS Modules/.web migrationをしていない。
- [ ] 無関係refactorを含まない。

### Decision / Requirement

- [ ] latest main取込後の次の空きDecision IDを使った。
- [ ] `D-020` / `D-021` を削除せずsupersedeした。
- [ ] NFR-MA-020はlibrary requirementではなく業務validation ownershipを表す。
- [ ] NFR-MA-021はfile-count requirementではなくplatform isolationを表す。
- [ ] NFR-MA-023はD-026を維持する。

### FR-AR-001

- [ ] Presentation Requestへ内部contextを追加していない。
- [ ] Manifest path resolutionはApplication責務になった。
- [ ] Web / Native Repositoryにgenerated manifest direct dependencyが残っていない。
- [ ] transaction lifetime / version semanticsを崩していない。
- [ ] confirmationとorder snapshotでpath resolution ruleが分岐していない。

### Formal evidence

- [ ] NFR-MA-020をAuth 1例だけで全体coveredにしていない。
- [ ] NFR-MA-020は複数の独立したApplication mutation boundaryをbounded-multi-refで説明できる。
- [ ] NFR-MA-021はNative presentation全体の明示scan rootを持つ。
- [ ] NFR-MA-022は今回固定するcomplex widget setが明示されている。
- [ ] NFR-MA-023のためだけにbrittle prose validatorを追加していない。
- [ ] Formal gapだけを埋める箇所でProductを不要に変更していない。

### Validation

- [ ] focused validation PASS
- [ ] `pnpm run verify` PASS
- [ ] focused FR-AR-004 Playwright PASS
- [ ] `pnpm run test:e2e:chromium` PASS
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
- `NFR-MA-023`は`D-026`をCurrent authorityとして扱う。
- 追加の汎用framework、migration、validatorは作らない。
- Stop conditionに触れたら実装者判断で範囲を広げず報告する。
- PR #78はこのPRでは触らない。
