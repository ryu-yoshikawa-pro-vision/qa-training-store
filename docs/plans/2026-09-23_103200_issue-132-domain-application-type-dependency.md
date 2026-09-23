# Issue #132 Domain → Application type dependency architecture方針確定 Plan

## 0. 依頼概要

- 対象Issue: #132 `investigate: Domain → Application type dependencyのarchitecture方針を確定する`
- 作業branch: `plan/issue-132-domain-application-type-dependency`
- branch作成時の`main`: `01cd8ab15078d479e821d373445af1e16a469519`
- 2026-09-23の再レビュー時点でも`main`は同SHAで、対象architecture / sourceに追加driftはない。
- 今回はPlan作成までとし、type移動、Repository interface移動、architecture contract実装、ADR追加、Issue close、PR作成、mergeは行わない。
- Refactor実装が必要な場合はIssue #132のdecision-only作業へ混在させず、別Plan / 実装PRへ切り出す。

## 1. 結論

Current Repositoryには、Domain → Applicationを禁止する明示的なarchitecture方針が既に存在する。

根拠:

1. `docs/CODING_STANDARDS.md §7.1`
   - `Presentation -> Application -> Domain`
   - `Infrastructure -> Application Port / Domain Contract`
   - 「DomainはApplication、Infrastructure、Presentationへ依存しない」
2. `docs/02_architecture/repository_structure.md §4`
   - 「Domainは他Layerへ依存しない」
3. `docs/01_requirements/non_functional_requirements.md`
   - `NFR-MA-001`は「Presentation、Application、Domain、Infrastructureの依存方向を守る」をRelease `Gate`としている。
4. ADR-0003
   - ApplicationからRepositoryへの依存をDomain Repository Port経由とし、Infrastructure実装をComposition Root / Adapter側へ置く。

したがって、Issue #132の不足Evidenceは「Domain → Applicationを許容するか」ではない。

Currentで解消すべき点は次の3つ。

1. `src/domain/repositories/contracts.ts`と`src/domain/policies/permissions.ts`がCurrent architecture方針に違反してApplication typeへ依存している。
2. `docs/04_data/repository_interfaces.md`がApplication DTO / query / commandをRepository signatureで利用するCurrent contractを説明する一方、Repository contractのownership境界を明示していない。
3. `tests/contracts/architecture.test.ts`がCurrentの「DomainはApplicationへ依存しない」方針を検査していない。

Issue #132ではまず次をCurrent policyとして確定する。

- Domain → Application dependencyはruntime / type-onlyを問わず禁止する。
- Application DTO / query / commandはApplication ownershipを維持する。
- `ProductViewer`はApplication contractに残し、Domain policyへApplication typeを渡さない。

その上で、ADR-0003の「Application層はDomain Repository Portだけに依存する」とApplication contract ownershipをどう両立させるかだけをarchitecture ownerのDecision Pointとする。

Plan上の推奨は、Application typeをsignatureに必要とするRepository PortをApplication ownershipへ移し、Application typeを必要としないDomain Repository ContractをDomainに残す案である。この案を採用する場合、§4.16はCurrent `main`で同じ状態を再確認したうえで`refactor_now`へ再分類し、実際のtype / interface移動とarchitecture contract追加は別Plan / 実装PRで行う。

Domain → Applicationのtype-only例外を新設する案はCurrent `NFR-MA-001` / Coding Standardsを変更するため、Plan上の推奨にはしない。

## 2. Current Repositoryの状態

### 2.1 確認対象

- Issue #132
- `src/domain/repositories/contracts.ts`
- `src/domain/repositories/index.ts`
- `src/domain/policies/permissions.ts`
- `src/application/contracts/**`
- `src/application/contracts/common.ts`
- `src/application/ports.ts`
- `src/application/transactions/contracts.ts`
- `tests/contracts/architecture.test.ts`
- `tests/unit/policies.test.ts`
- Repository contract tests
- `docs/CODING_STANDARDS.md`
- `docs/01_requirements/non_functional_requirements.md`
- `docs/02_architecture/repository_structure.md`
- `docs/02_architecture/system_architecture.md`
- `docs/adr/0003-platform-route-composition-root.md`
- `docs/04_data/repository_interfaces.md`
- `docs/04_data/application_contracts.md`
- `docs/reports/2026-09-06_193114_refactoring_necessity_review.md`

### 2.2 Current dependency

```text
Application
  -> Domain Repository Contract
       -> Application DTO / query / command type  [type-only]
  -> Domain policy
       -> Application ProductViewer               [type-only]

Infrastructure
  -> Domain Repository Contract
  -> Application contracts
  -> Application ports
```

`import type`のためCurrent codeからruntime cycleは確認されていない。

ただし、Issue #132の対象はruntime cycleではなくcompile-timeのlayer dependency / canonical ownershipである。type-onlyであることはCurrent architecture方針の例外根拠にしない。

### 2.3 `src/domain/repositories/contracts.ts`

Currentでは次を確認済み。

- `@/application/contracts`から67型を一括type importしている。
- inline type importで`HomeCatalogDto`と`ProductViewer`を参照する。
- Repository interfaceは24件。
- うちApplication typeをsignatureで使用するinterfaceは17件。
- Application typeを使用しないinterfaceは7件。
- `@/domain/repositories`の直接consumerは18 source fileで、ApplicationとInfrastructureに存在する。Current検索ではDomain内consumerは確認されていない。

Application typeを使用する17 interface:

- `UserRepository`
- `AddressRepository`
- `StorefrontCatalogQueryRepository`
- `ProductQueryRepository`
- `AdminProductQueryRepository`
- `ProductRepository`
- `CategoryRepository`
- `BrandRepository`
- `ImageAssetCatalogRepository`
- `InventoryRepository`
- `CartRepository`
- `CheckoutSessionRepository`
- `OrderRepository`
- `ReviewRepository`
- `AdminOverviewQueryRepository`
- `TestInspectionRepository`
- `TestMetadataRepository`

Application typeを使用しない7 interface:

- `VersionedRepository`
- `SessionRepository`
- `ReviewSummaryRepository`
- `SequenceRepository`
- `PaymentRepository`
- `ShipmentRepository`
- `SettingsRepository`

この分類はfollow-up Refactorの移動対象候補を決めるためのCurrent Evidenceであり、interface数だけを理由に分割・統合しない。

### 2.4 `src/application/ports.ts`

Current Applicationには既にPort ownershipの実例がある。

- `Clock`
- `IdGenerator`
- `CurrentSessionStore`
- `GuestIdentityStore`
- `CurrentActorResolver`
- `PasswordHasher`
- `PaymentGateway`
- `StaticAddressLookup`
- `ProductImageManifestRepository`

InfrastructureがApplication Portを実装する構造はCurrent Repositoryに既に存在し、`docs/CODING_STANDARDS.md §7.1`の`Infrastructure -> Application Port / Domain Contract`とも一致する。

したがって、Application DTO / query / commandを必要とするPortをApplication ownershipへ置くために、新しいarchitecture frameworkや抽象化方針を導入する必要はない。

### 2.5 `ProductViewer`

Current `ProductViewer`:

```ts
type ProductViewer =
  | { kind: "guest" }
  | { kind: "customer"; userId: string; membershipRank: MembershipRank };
```

Applicationで次に利用される。

- identity resolution
- Catalog query
- Cart / Storefront contract
- Native customer capability
- Repository adapter

一方、Domainの`canViewerSeeProduct()`が実際に利用するのは次だけ。

- `viewer.kind`
- `viewer.membershipRank`

`userId`はDomain policyで利用しない。

また、Domainには既に`MembershipRank`が存在し、`assertUserInvariant()`はcustomerのrankがnon-nullであることを保証する。

このため、`ProductViewer`全体をDomainへ移す必要はない。follow-up Refactorでは`ProductViewer`をApplicationに残し、`canViewerSeeProduct()`へ渡すDomain inputを現在必要な`MembershipRank | null`相当へ縮小する方針を第一候補とする。新しいviewer abstractionは作らない。

## 3. Current authorityの整理

### 3.1 architecture direction

Currentの依存方向は次を正本として扱う。

```text
Presentation -> Application -> Domain
Infrastructure -> Application Port / Domain Contract
```

DomainからApplicationへの逆方向依存は許可しない。

`NFR-MA-001`がRelease Gateであるため、Current policyを維持する限り、既知のDomain → Application依存を「runtime failureがない」という理由だけで`keep_as_is`または`refactor_when_touched`にしない。

### 3.2 ADR-0003

ADR-0003はPhase 2 Native導入時に、ApplicationからRepositoryへDomain Repository Portを利用することを決定した。

今回のRefactorでApplication-specificなRepository / Query PortをApplication ownershipへ移す場合は、ADR-0003の「Domain Repository Portだけ」という記述との関係を明確化する必要がある。

historical ADR本文をCurrent都合で書き換えない。Issue #132実行時に次available ADRを確認し、新しいADRで次を明記する。

- Domain → Application dependencyは禁止する。
- Domain Repository ContractはDomain-owned typeだけをsignatureに使う。
- Application DTO / query / commandをsignatureに必要とするPortはApplication ownershipとする。
- InfrastructureはApplication PortまたはDomain Contractを実装する。
- ADR-0003のRepository ownership記述をこの範囲でclarify / supersedeする。

Plan作成時点の次available番号はADR-0027だが、実行時に再確認する。

### 3.3 `repository_interfaces.md`

`docs/04_data/repository_interfaces.md`はRepository methodの意味とApplication DTO / query / command利用を説明するCurrent contractとして有効である。

ただし、この文書はDomain → Application dependencyを許可するarchitecture authorityとして扱わない。

follow-up RefactorでPort ownershipが変わる場合、interface名とmethod contractは可能な限り維持し、ownership説明だけをCurrent architectureへ合わせる。

### 3.4 D-026

D-026はTypeScript型を型定義のSSOTとし、Markdownを意味・責務・理由の説明責務とする。

Current codeにDomain → Application type importが存在する事実は、architecture上その依存方向を許可済みである根拠にはしない。

### 3.5 architecture contract

`tests/contracts/architecture.test.ts`はCurrent architecture policyの一部を検査するが、Domain → Applicationは禁止していない。

これは「policyが存在しない」Evidenceではなく、`NFR-MA-001`とCoding Standardsに対するFormal enforcement gapとして扱う。

## 4. Canonical ownershipとDecision Point

### 4.1 Application DTO / query / command

`src/application/contracts/**`にある次の種類はApplication ownershipを維持する。

- Request / Command
- Query
- DTO
- Result
- Application inspection / metadata contract

Domain Repository Contractへ移して依存方向を解消しない。

理由:

- `application_contracts.md`が意味・責務をApplication contractとして定義している。
- Presentation / Use Case / Adapter間のApplication boundaryで利用される。
- Admin / Test inspection等をDomainへ移すとDomain responsibilityを不必要に広げる。

### 4.2 Repository Port ownershipのDecision Point

allow / deny自体はCurrent policyから決まるが、Repository Portのcanonical ownerはADR-0003とCurrent Application contractの両方を満たす形を選ぶ必要がある。

architecture ownerへ次の3案を提示する。

| 案 | 方針 | 影響 | Plan上の評価 |
| --- | --- | --- | --- |
| A | Application typeをsignatureに使用する17 interfaceをApplication ownershipへ移し、Domain-owned typeだけで閉じる7 interfaceをDomainへ残す。必要ならADR-0003のRepository ownership記述を新ADRでclarify / supersedeする。 | 既存Application contractを維持できる。Current direct consumerはApplication / Infrastructureで、Domain consumer向け互換layerは不要。17 interfaceのimport更新が必要。 | **推奨**。Current Coding Standardsの`Infrastructure -> Application Port / Domain Contract`を既存patternとして再利用でき、DTOをDomainへ移さない。 |
| B | Repository PortはすべてDomain ownershipを維持し、Application DTO / query / commandを直接使わないDomain-owned repository input / outputへ置き換え、Application boundaryでmappingする。 | ADR-0003のRepository ownershipは維持できるが、現在67個あるApplication type参照に対応する新しいDomain-side contract / mappingが広く必要になる。 | 非推奨。依存方向を直すためにDomain contractとmappingを大量追加する可能性が高い。 |
| C | `src/domain/repositories/contracts.ts`だけApplication contractへのtype-only依存を例外として許可する。 | Current code変更は最小だが、`NFR-MA-001`、Coding Standards、Repository Structureの依存方向を変更し、例外をstatic contractへ組み込む必要がある。 | 非推奨。Current architecture方針自体を変更する。 |

Decision前に行わないこと:

- Repository interface移動
- Domain-side代替DTO / Command追加
- type-only例外のstatic contract追加
- ADR-0003をCurrent都合で直接書き換える
- §4.16の最終再分類

案Aを採用した場合のfollow-up Refactor原則:

1. Application typeをsignatureに使用する17 interfaceはApplication ownershipへ移す候補とする。
2. Application typeを使用しない7 interfaceはDomain ownershipを維持する。
3. interfaceを分割すること自体を目的にしない。
4. Application ownershipへinterface単位で移せる場合は、method単位の細分化よりinterface単位の移動を優先する。
5. Domain codeからRepository interfaceを直接利用するCurrent consumerは確認されていないため、Domain consumerのための互換layerを先回りして追加しない。
6. re-exportは既存consumerを段階移行する明確な必要がある場合だけ使用し、恒久互換層として残さない。
7. exact file配置とexport構成はfollow-up implementation PlanでCurrent import graphを再確認して決める。既存`src/application/ports.ts`を再利用できるかを最初に検討し、責務が過密になる場合だけApplication配下の専用moduleを追加する。

### 4.3 `ProductViewer`

canonical ownerはApplicationのままとする。

Domain policyはApplication `ProductViewer`へ依存せず、公開可否に必要なDomain-owned情報だけを受け取る。

第一候補:

```text
Application / Adapter
  ProductViewer
  -> viewerがcustomerならmembershipRank
  -> guest / management-as-guestならnull
  -> Domain canViewerSeeProduct(...)
```

Domain側へ新しいviewer typeを作ることは必須としない。

この方針により、`userId`やApplication identity semanticsをDomainへ移さずにCurrent policyを維持できる。

## 5. Issue #132の実行タスク

### Task 1: latest `main`へrebaseline

実行開始時に`origin/main` SHAを記録し、branch作成時SHAから次を確認する。

- `src/domain/repositories/**`
- `src/domain/policies/**`
- `src/application/contracts/**`
- `src/application/ports.ts`
- `src/application/transactions/**`
- `tests/contracts/architecture.test.ts`
- `docs/CODING_STANDARDS.md`
- `docs/01_requirements/non_functional_requirements.md`
- `docs/02_architecture/**`
- `docs/adr/**`
- `docs/04_data/repository_interfaces.md`
- `docs/04_data/application_contracts.md`

Current authorityまたはdependency surfaceにmaterial driftがあれば該当箇所だけ再評価する。Repository全体の再監査へ広げない。

### Task 2: Current policyを確定する

次を同じdecision recordへ接続する。

- `NFR-MA-001`
- `CODING_STANDARDS.md §7.1`
- `repository_structure.md §4`
- ADR-0003
- D-026
- Current TypeScript
- Current architecture contract

Current `main`がPlan作成時と同じ意味を維持していれば、Domain → Application dependencyはtype-onlyを含め禁止と確定する。

新しいallow / deny Decisionをarchitecture ownerへ質問しない。

### Task 3: Current violation surfaceを有限に確定する

次だけを再取得する。

- `src/domain/**`から`src/application/**`へのimport edge
- static import / `import type` / dynamic `import()`
- `src/domain/repositories/contracts.ts`のinterface単位のApplication type利用
- `src/domain/policies/permissions.ts`の`ProductViewer`利用
- `@/domain/repositories`の直接consumer
- `canViewerSeeProduct()`の直接caller
- behaviorを守るunit / integration / repository contract

generic dependency graph、AST framework、恒久scannerは追加しない。

### Task 4: architecture owner Decisionを確定する

Current Evidenceを添えて§4.2の案A / B / Cを提示する。

Decision Pointで確定するもの:

- Repository Portのcanonical owner
- ADR-0003のRepository ownership記述を維持 / clarify / supersedeするか
- Current architecture方針に例外を追加するか
- §4.16の最終classification

Current policy上、Application DTO / query / commandと`ProductViewer`のownerはApplicationとする。ここはRepository Port ownership Decisionと混同しない。

Plan上は案Aを推奨するが、architecture ownerの回答前にRepository interface移動へ進まない。

### Task 5: architecture decisionを永続化する

Current policyを新設するのではなく、既存policyとRepository ownershipの解釈を接続する。

architecture ownerのDecision後、実行時のnext available ADRで次を記録する。

- Context: Current Domain → Application type-only dependency
- Current authority: Domain → Application禁止
- 選択したRepository Port ownership rule
- Application DTO / query / command ownership
- `ProductViewer` ownershipとDomain policy input boundary
- ADR-0003との関係
- Consequences: follow-up Refactorとarchitecture contract

必要な説明文書だけを同期する。

候補:

- next available ADR
- `docs/04_data/repository_interfaces.md`
- `docs/02_architecture/system_architecture.md`
- `docs/02_architecture/repository_structure.md`は既存ruleを変更する必要がある場合だけ更新
- `docs/04_data/application_contracts.md`は`ProductViewer`等のApplication ownership説明が不足する場合だけ更新
- `docs/PROJECT_CONTEXT.md`はRepository-wideのCurrent architecture理解が実際に変わる場合だけ更新

同じruleを複数Markdownへ重複して正本化しない。

### Task 6: architecture contract仕様を確定する

follow-up Refactorと同じ実装PRで追加するstatic contractを次で固定する。

- `src/domain/**`から`src/application/**`へのimportを禁止する。
- `import type`も禁止対象。
- dynamic `import()`のtype referenceも禁止対象。
- Application moduleごとのallowlistを作らない。
- Repository contractだけの例外を作らない。
- 新しいAST dependencyは追加しない。
- 既存`tests/contracts/architecture.test.ts`のsource scan patternを再利用する。
- relative importでApplicationへ到達する経路も検出対象とする。

Current sourceが違反している間にfailするcontractだけをdecision-only PRへ先行投入しない。source remediationと同じfollow-up implementation PRで追加する。

### Task 7: §4.16を再分類する

architecture owner Decisionに基づき最終classificationを確定する。

案Aまたは案BでCurrentのDomain → Application禁止を維持する場合は、§4.16を`refactor_now`へ再分類する。

理由:

- `NFR-MA-001`はGate。
- Coding StandardsとRepository StructureがDomain → Applicationを明示禁止している。
- Current codeはその方向へtype-only dependencyを持つ。
- Formal enforcementも不足している。

runtime failureがないことは`refactor_when_touched`へ落とす理由にしない。

案Cでtype-only例外を新しいCurrent policyとして採用する場合は、policy変更とstatic contractを先に明文化した上でclassificationを再評価する。

### Task 8: follow-up Refactor Planを作成する

Issue #132のdecision-only作業でProduct codeを変更しない。

別Planには最低限次を入れる。

1. Application typeを使用する17 Repository interfaceの移動先
2. Domainに残す7 Repository Contract
3. `src/domain/repositories/index.ts` / Application export構成
4. 18 direct consumerのimport更新
5. `src/application/transactions/contracts.ts`のRepository import更新
6. Dexie / SQLite adapterのimplements / import更新
7. `canViewerSeeProduct()`から`ProductViewer` dependencyを除去
8. Application callerで`ProductViewer`からDomain policy inputへ変換する処理
9. `repository_interfaces.md`等の説明同期
10. Domain → Application禁止contract
11. focused testとRepository標準validation
12. compatibility re-exportが本当に必要かの確認

大規模なtype rename、DTO移動、generic Port frameworkは含めない。

## 6. Issue #132 decision-only作業の検証

Issue #132自体でsource / testを変更しない場合:

```bash
pnpm run lint:markdown
git diff --check
```

必要に応じて文章品質gateをCurrent Repository手順で実行する。

確認項目:

- ADRと既存architecture文書が矛盾していない。
- Domain → Application禁止が明示されている。
- Application DTO / query / commandのcanonical ownerが変わっていない。
- `ProductViewer` ownershipとDomain policy boundaryが明示されている。
- §4.16の再分類根拠が`NFR-MA-001`とCurrent codeへ追跡できる。
- follow-up Refactorのscopeが具体化されている。
- Product code / test / dependencyを変更していない。

## 7. follow-up Refactorで必要な検証

実装Planでは変更範囲を再確認した上で、最低限次を含める。

```bash
pnpm run typecheck
pnpm run test:unit
pnpm run test:integration
pnpm run test:repository
pnpm run test:contracts
pnpm run verify
git diff --check
```

追加でfocused test:

- `tests/unit/policies.test.ts`
- `tests/contracts/architecture.test.ts`
- Repository Port移動の影響を受けるrepository contract
- Catalog / Cart / Checkout等、`canViewerSeeProduct()` callerを変更した経路

test数を増やすことを目的にせず、既存testで同じ回帰を検出できる場合は再利用する。

## 8. Issue #132の完了条件

次をすべて満たした時点でIssue #132を完了候補とする。

- latest `main`でCurrent authorityとDomain → Application edgeを再確認している。
- Domain → Application dependencyはtype-onlyを含め禁止と確定している。
- `NFR-MA-001` / Coding Standards / Repository Structure / ADR-0003 / D-026の関係を説明できる。
- `repository_interfaces.md`のCurrent contract説明をDomain → Application許可根拠として扱っていない。
- Application DTO / query / commandのcanonical ownerがApplicationである。
- `ProductViewer`のcanonical ownerがApplicationである。
- Domain policyからApplication `ProductViewer` dependencyを除去する方針が確定している。
- Repository Portのownership ruleが確定している。
- static architecture contractの検査仕様が確定している。
- Repository Port ownershipについてarchitecture ownerのDecisionが記録されている。
- Current policyを維持する場合は§4.16が`needs_more_evidence`から`refactor_now`へ再分類されている。例外を新設する場合はそのpolicyとclassificationの根拠が記録されている。
- 必要なADR / normative documentationへdecisionが永続化されている。
- Refactor実装は別Plan / 実装PRへ切り出されている。
- Product behavior、Database schema、Native / Web featureを変更していない。
- generic dependency graph、AST framework、新規dependencyを追加していない。

## 9. リスクと対策

### Current codeをarchitecture authorityと誤認する

D-026は型定義のSSOTを定める。Current import directionそのものを正しいarchitecture policyとする決定ではない。

対策:

- layer directionは`NFR-MA-001`、Coding Standards、Repository Structure、ADRから判断する。
- Current codeは適合性確認対象として扱う。

### `repository_interfaces.md`をDomain ownershipの根拠にする

同文書はRepository method contractとApplication DTO利用を説明するが、Domain → Application例外を明示しない。

対策:

- method contractとmodule ownershipを分ける。
- follow-up Refactorでもmethod semanticsは不要に変更しない。

### Repository Portを細かく分割しすぎる

17 interfaceにはApplication type利用があるが、全methodを細分化する必要はない。

対策:

- interface単位でApplication ownershipへ移せる場合はその方を優先する。
- Domain consumer等の具体的理由がある場合だけ分割する。

### Application DTOをDomainへ移して依存を消す

依存方向だけを合わせるためにAdmin DTO、Query、Command、Inspection contractをDomainへ流入させるとDomain responsibilityが広がる。

対策:

- Application contractはApplicationに残す。
- Port側のownershipを合わせる。

### `ProductViewer`全体をDomainへ移す

Domain policyは`userId`を利用しない。

対策:

- `ProductViewer`をApplicationに維持する。
- Domainへ渡す値を現在必要なrank情報へ縮小する。
- 新しいviewer hierarchyやshared abstractionを作らない。

### static contractをsource修正より先に追加する

Current sourceは既に違反しているためdecision-only PRでcontractを追加すると意図的にCIを失敗させる。

対策:

- contract仕様だけIssue #132で確定する。
- source remediationと同じfollow-up PRでcontractを追加する。

## 10. ロールバック

Issue #132のdecision-only変更はdocumentationだけで、Database、migration、external stateを変更しない。

follow-up Refactorもtype / interface ownershipとimport directionが中心であり、Product behaviorを変えない。実装Planでrollback単位を定義し、問題があればRefactor commitをrevertできる構成にする。

## 11. 対象外

- Domain / Application全面再設計
- Domain → Application例外の新設
- Application DTO / query / commandのDomain移動
- Repository interfaceの機能的再設計
- Repository method semantics変更
- Product behavior変更
- Dexie / SQLite schema変更
- Native / Web feature変更
- generic dependency graph / scanner導入
- AST framework導入
- 新規dependency導入
- 全Portの一括rename
- 将来用互換layer
- Issue #130 / #117 / #163の進行中作業

## 12. 未解決事項

Issue #132の実行時にarchitecture ownerへ確認するDecision Pointは1件。

- ADR-0003のDomain Repository Port方針とApplication contract ownershipをどう両立させるか。§4.2の案A / B / Cから判断する。

Domain → ApplicationをCurrent policyとして禁止していること自体は未解決事項ではない。

Plan上の推奨は案A。

実行開始時にlatest `main`へmaterial driftがあった場合だけ、影響したauthority / dependency surfaceを再確認してからDecision Pointを提示する。
