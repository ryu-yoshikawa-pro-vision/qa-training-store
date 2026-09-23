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

Plan上の推奨は、Repository PortのownerをCurrent signatureだけで決めず、責務とconsumerから判断する案である。CurrentでApplication typeをsignatureに使用する17 interfaceはDomain → Application違反を直接作っているため最低限の整理対象とする。整理時は各interfaceを維持 / 移動 / 削除のいずれかで判断し、移動を前提にしない。一方、Application typeを使用しない7 interfaceもDomain ownershipと自動確定せず、Domain behavior contractとして残す理由があるかをfollow-up Planで再確認する。この案を採用する場合、§4.16はCurrent `main`で同じ状態を再確認したうえで`refactor_now`へ再分類し、実際のtype / interface移動とarchitecture contract追加は別Plan / 実装PRで行う。

Domain → Applicationのtype-only例外はCurrent `NFR-MA-001` / Coding Standards / Repository Structureを変更する新しいarchitecture policyになるため、Issue #132のRepository Port ownership Decisionには含めない。

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

この17 / 7分類はCurrent違反の直接原因を特定するためのEvidenceであり、canonical ownershipの決定基準にはしない。17 interfaceはDomain → Application依存を直接持つ最低限の整理対象である。整理時は維持 / 移動 / 削除をCurrent consumerと責務から判断する。Current検索では`ImageAssetCatalogRepository`、`TestInspectionRepository`、`TestMetadataRepository`は定義以外のsource consumer / implementationが確認できない。`ImageAssetCatalogRepository`相当の実利用経路にはApplication-owned `ProductImageManifestRepository`が既に存在し、Test Inspection / Metadataの実処理は`TestControlService`が担っているため、これらはfollow-up Planで削除候補として確認する。7 interfaceはCurrent違反を直接作っていないが、Application / Infrastructureから利用されるものがあるため、Domain ownershipを自動確定せず、責務とconsumerから再評価する。interface数だけを理由に分割・統合しない。

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

また、`NFR-MA-010`は「Phase 1 Core Use CaseとRepositoryが`application_contracts.md`のDTO / Input / Result / Error型に従う」をGateとしている。案AではこのGateを維持する。案BはRepository PortからApplication DTO / query / command参照を除去するためCurrent `NFR-MA-010`とは両立せず、案Bを選んだ時点で`NFR-MA-010`の文言を新しいRepository ownership ruleへ合わせて更新することを必須とする。更新するか否かを第二のarchitecture Decisionにはしない。

### 3.2 ADR-0003

ADR-0003はPhase 2 Native導入時に、ApplicationからRepositoryへDomain Repository Portを利用することを決定した。

今回のRepository Port ownership Decisionでは、案A / Bの選択とADR-0003 Decision 3の扱いを別々のDecisionにしない。

- 案Aを選ぶ場合:
  - Application-specificなRepository / Query PortをApplication ownershipへ置けるようにする。
  - new ADRでADR-0003 Decision 3の「Application層はDomain Repository Portだけに依存する」というRepository Port ownership部分を明示的にsupersedeする。
  - `Supersedes`には`docs/adr/0003-platform-route-composition-root.md#Decision`のDecision 3に対する限定置換であることを書く。
  - ADR-0003のPlatform Composition Root、Dexie / SQLite Adapter分離等、今回と無関係なDecisionは維持する。
- 案Bを選ぶ場合:
  - Repository PortはDomain ownershipを維持するため、ADR-0003 Decision 3を維持する。
  - Application contractとのmappingと、案Bに伴い`NFR-MA-010`の文言を新しいRepository ownership ruleへ更新することをnew ADRへ記録する。

historical ADR本文をCurrent都合で書き換えない。Issue #132実行時にnext available ADRを確認する。

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

architecture ownerへ次の2案を提示する。Decisionは案A / Bの選択1件だけとし、ADR-0003の扱いは選択した案から決定論的に導く。

| 案 | 方針 | ADR-0003 Decision 3 | 影響 | Plan上の評価 |
| --- | --- | --- | --- | --- |
| A | Repository Portのownerを責務とconsumerで決める。Application / Infrastructureだけから利用され、Application contractを境界として使うPortはApplication ownershipを第一候補とする。Domain behavior contractとして残す理由があるPortだけDomain ownershipを維持する。17 interfaceは最低限の整理対象として維持 / 移動 / 削除を確認し、7 interfaceもownerを再評価する。 | new ADRでRepository Port ownership部分を明示的にsupersedeする。 | Application contractを維持したままCurrent Coding Standardsの`Infrastructure -> Application Port / Domain Contract`を使える。CurrentでDomain consumerは確認されていないため、互換layerを先回りして作る必要はない。移動数は17件に固定せず、責務確認後に確定する。 | **推奨**。Current signatureではなく責務とconsumerを基準にでき、Application DTOをDomainへ移さない。 |
| B | Repository PortはDomain ownershipを維持し、Application DTO / query / commandを直接使わないDomain-owned repository input / outputへ置き換え、Application boundaryでmappingする。 | 維持する。 | ADR-0003のRepository ownershipは維持できるが、現在67個あるApplication type参照に対応するDomain-side contract / mappingが広く必要になる。さらにCurrent `NFR-MA-010`とは両立しないため、同Gateの文言を新しいRepository ownership ruleへ合わせて更新する。 | 非推奨。依存方向を直すためにDomain contractとmappingを増やし、Current Gateの更新も必須になる。 |

検討したがDecision候補に含めない案:

- `src/domain/repositories/contracts.ts`だけApplication contractへのtype-only依存を例外化する案。これは`NFR-MA-001`、Coding Standards、Repository Structureで既に確定しているDomain → Application禁止を変更する新しいarchitecture policyになるため、Issue #132のRepository Port ownership Decisionには含めない。

Decision前に行わないこと:

- Repository interface移動
- Domain-side代替DTO / Command追加
- Domain → Application例外の追加
- ADR-0003をCurrent都合で直接書き換える
- §4.16の最終再分類

案Aを採用した場合のfollow-up Refactor原則:

1. 24 interfaceすべてについて、責務、Application / Domainのconsumer、transaction境界、返却 / 入力contractを確認してcanonical ownerを決める。
2. Application typeをsignatureに使用する17 interfaceはDomain → Application違反を直接持つため、最低限の整理対象とする。各interfaceはCurrent consumerと責務を確認し、維持 / 移動 / 削除を決める。
3. `ImageAssetCatalogRepository`、`TestInspectionRepository`、`TestMetadataRepository`はCurrent sourceで定義以外のconsumer / implementationが確認できないため、別moduleへ移す前に削除可否を確認する。
4. Application typeを使用しない7 interfaceはCurrent違反を直接持たないが、Domain ownershipを自動確定しない。Domain behavior contractとして残す理由があるかを個別に確認する。
5. interfaceを分割すること自体を目的にしない。interface単位でownershipを決められる場合はmethod単位の細分化を行わない。
6. Domain codeからRepository interfaceを直接利用するCurrent consumerは確認されていないため、Domain consumerのための互換layerを先回りして追加しない。
7. re-exportは既存consumerを段階移行する明確な必要がある場合だけ使用し、恒久互換層として残さない。
8. exact file配置とexport構成はfollow-up implementation PlanでCurrent import graphを再確認して決める。既存`src/application/ports.ts`を再利用できるかを最初に検討し、責務が過密になる場合だけApplication配下の専用moduleを追加する。

### 4.3 `ProductViewer`

canonical ownerはApplicationのままとする。

Domain policyはApplication `ProductViewer`へ依存せず、公開可否に必要なDomain-owned情報だけを受け取る。

第一候補:

```text
Infrastructure adapter / Current caller
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
- `tsconfig.json`の`baseUrl` / `paths`
- `docs/CODING_STANDARDS.md`
- `docs/01_requirements/non_functional_requirements.md`
- `docs/02_architecture/**`
- `docs/adr/**`
- `docs/04_data/repository_interfaces.md`
- `docs/04_data/application_contracts.md`

Current authorityまたはdependency surfaceにmaterial driftがあれば該当箇所だけ再評価する。`tsconfig.json`の`baseUrl` / `paths`が変わっていた場合は、Task 3 / Task 6のmodule specifier判定をCurrent設定へ合わせる。Repository全体の再監査や汎用module resolver実装へ広げない。

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

- `src/domain/**`から`src/application/**`へのimport / re-export / literal `require()` edge
- 通常のstatic import / `import type ... from "..."` / side-effect import / TypeScriptの`import("...").Type` type query / runtime dynamic `import("...")`
- `export ... from "..."` / `export type ... from "..."` / `export type * from "..."` / `export type * as <name> from "..."` / `export * from "..."`
- literal `require("...")`
- module specifierは次の3経路を確認する。
  - `@/application/**`
  - `baseUrl: "."`で解決可能な`src/application/**`
  - relative path。各Domain source fileから解決した到達先が`src/application/**`か確認する。
- computed `require(variable)`や汎用module resolution解析は追加しない。Current Repositoryで確認できるliteral specifierを対象にする。
- `src/domain/repositories/contracts.ts`のinterface単位のApplication type利用
- `src/domain/policies/permissions.ts`の`ProductViewer`利用
- `@/domain/repositories`の直接consumer
- `canViewerSeeProduct()`の直接caller
- behaviorを守るunit / integration / repository contract

generic dependency graph、AST framework、恒久scannerは追加しない。

### Task 4: architecture owner Decisionを確定する

Current Evidenceを添えて§4.2の案A / Bを提示し、Repository Port ownershipを1件のDecisionとして確定する。

選択結果からADR-0003 Decision 3の扱いを決定論的に導く。

- 案A: Repository Port ownership部分をnew ADRで明示的にsupersedeする。
- 案B: ADR-0003 Decision 3を維持する。

Current policy上、Domain → Applicationは禁止であり、Application DTO / query / commandと`ProductViewer`のownerはApplicationとする。ここはRepository Port ownership Decisionと混同しない。

Plan上は案Aを推奨するが、architecture ownerの回答前にRepository interface移動へ進まない。

### Task 5: architecture decisionを永続化する

Current policyを新設するのではなく、既存policyとRepository ownershipの解釈を接続する。

architecture ownerのDecision後、実行時のnext available ADRで次を記録する。

- Context: Current Domain → Application type-only dependency
- Current authority: Domain → Application禁止
- 選択したRepository Port ownership rule
- Application DTO / query / command ownership
- `ProductViewer` ownershipとDomain policy input boundary
- Consequences: follow-up Refactorとarchitecture contract

ADR-0003との関係は選択した案に応じて固定する。

- 案A:
  - new ADRの`Supersedes`へ`docs/adr/0003-platform-route-composition-root.md#Decision` Decision 3のRepository Port ownership部分を明記する。
  - ADR-0003本文は書き換えない。
  - supersede範囲をRepository Port ownershipへ限定し、Platform Composition Root等の他Decisionを変更しない。
- 案B:
  - ADR-0003 Decision 3を維持すると明記し、`Supersedes`対象にはしない。
  - Application boundary mappingと、案Bに伴い`NFR-MA-010`の文言を新しいRepository ownership ruleへ更新することを記録する。

必要な説明文書だけを同期する。

候補:

- next available ADR
- `docs/04_data/repository_interfaces.md`
- `docs/02_architecture/system_architecture.md`
- `docs/02_architecture/repository_structure.md`は既存ruleを変更する必要がある場合だけ更新
- `docs/04_data/application_contracts.md`は`ProductViewer`等のApplication ownership説明が不足する場合だけ更新
- 案Bを選んだ場合は`NFR-MA-010`の更新内容を`docs/01_requirements/non_functional_requirements.md`へ必ず反映
- `docs/PROJECT_CONTEXT.md`はRepository-wideのCurrent architecture理解が実際に変わる場合だけ更新

同じruleを複数Markdownへ重複して正本化しない。

### Task 6: architecture contract仕様を確定する

follow-up Refactorと同じ実装PRで追加するstatic contractを次で固定する。

- `src/domain/**`から`src/application/**`へ到達するimport / re-export / literal `require()`を全面禁止する。
- 少なくとも次のspecifier形を検査する。
  - 通常の`import ... from "..."`
  - `import type ... from "..."`
  - side-effect import
  - TypeScriptの`import("...").Type` type query
  - runtime dynamic `import("...")`
  - `export ... from "..."`
  - `export type ... from "..."`
  - `export type * from "..."`
  - `export type * as <name> from "..."`
  - `export * from "..."`
  - literal `require("...")`
- module specifierは次の3経路を禁止する。
  - `@/application/**`
  - `baseUrl: "."`で解決可能な`src/application/**`
  - relative path。各Domain source fileの位置から解決し、到達先が`src/application/**`なら禁止する。
- computed `require(variable)`、computed dynamic import、完全なTypeScript module resolverまでは実装しない。Current Repositoryで使用されるliteral specifierをsource scanで検査する。
- Application moduleごとのallowlistを作らない。
- Repository contractだけの例外を作らない。
- 新しいAST dependencyは追加せず、既存`tests/contracts/architecture.test.ts`のsource scan方式へ小さいspecifier検査を追加する。
- 完全なTypeScript parserや汎用dependency scannerは作らない。

scanner自体の検出能力も同じ`tests/contracts/architecture.test.ts`で固定する。

- source textとsource file pathを受け取り、Domain → Applicationへ到達するliteral specifierを判定できる小さいhelperへ検査処理を閉じ込める。
- table-driven testで、少なくとも次を検証する。
  - 禁止構文family: static import / `import type` / side-effect import / type query / dynamic import / re-export / literal `require()`。re-exportには`export type * from`と`export type * as <name> from`をそれぞれ明示的に含める。
  - 禁止path family: `@/application/**` / `src/application/**` / Domain fileから解決すると`src/application/**`へ到達するrelative path
  - 許可例: Domain → Domain、Domain内relative importなどApplicationへ到達しないspecifier
- Current sourceの違反件数が0になったことだけをscannerの正しさの証拠にしない。
- fixture directoryや新しいtest frameworkは作らず、既存architecture contract内のsynthetic source文字列で検証する。

Current sourceが違反している間にfailするcontractだけをdecision-only PRへ先行投入しない。source remediationと同じfollow-up implementation PRで追加する。

### Task 7: follow-up Refactor Planを作成する

Issue #132のdecision-only作業でProduct codeを変更しない。

別Planは選択した案A / Bを明示し、共通作業と案別作業を分ける。

共通:

1. latest `main`で24 Repository interface、Current consumer、transaction境界を再確認する。
2. Domain → Application違反を直接持つ17 interfaceについて、選択したownership ruleに従い維持 / 移動 / 削除を確定する。
3. `ImageAssetCatalogRepository`、`TestInspectionRepository`、`TestMetadataRepository`は移動前に未使用確認を行い、不要なら削除する。
4. Current違反を直接持たない7 interfaceも、選択したownership ruleへ照らしてownerを確認する。
5. 18 direct consumerはCurrent impact inventoryとして再取得し、実際にsignature / export pathが変わるconsumerだけを変更する。18件すべてを更新対象に固定しない。
6. `canViewerSeeProduct()`からApplication `ProductViewer` dependencyを除去する。
7. Current callerであるDexie / SQLite等のInfrastructure adapterで、`ProductViewer`からDomain policyへ渡す`MembershipRank | null`相当の値を導出する。
8. 選択したownership ruleへ`repository_interfaces.md`等の説明を同期する。
9. Domain → Application禁止のarchitecture contractとscanner self-testをsource remediationと同じPRで追加する。
10. focused test後にRepository標準validationを実行する。

案Aを選んだ場合:

1. Application ownershipと確定したRepository PortだけをApplication配下へ移す。17件一括移動を前提にしない。
2. 移動したPortのexport pathを確定し、Application Use Case / `src/application/transactions/contracts.ts` / Dexie / SQLite等のうち影響を受けるimportだけを更新する。
3. Domain behavior contractとして残すPortはDomain-owned typeだけで閉じることを確認する。
4. compatibility re-exportは既存consumerを段階移行する具体的必要がある場合だけ使い、不要なら追加しない。

案Bを選んだ場合:

1. Domain ownershipを維持するRepository PortからApplication DTO / query / command参照を除去し、必要なDomain-owned repository input / output contractを定義する。
2. Application boundaryでApplication contractとDomain-owned repository contractを変換する。67参照を機械的に複製せず、実際に残るRepository methodごとに必要なcontractだけを追加する。
3. Application Use Case / transaction / Infrastructure adapterのうちsignature変更の影響を受ける経路へmappingを追加する。import pathが変わらないconsumerを理由なく編集しない。
4. Current `NFR-MA-010`は案Bと両立しないため、文言を新しいRepository ownership ruleへ合わせて更新する。具体的な文言はnew ADRと同じ意味になるように確定し、更新要否を再Decisionしない。
5. Application DTO / query / command自体はApplication ownershipに維持し、Domainへ移さない。

大規模なtype rename、DTO移動、generic Port frameworkは含めない。

### Task 8: §4.16を再分類する

Task 7でfollow-up Refactor Planの保存先を確定した後、§4.16を`refactor_now`へ再分類する。Repository Port ownershipの案A / Bのどちらを選んでもCurrentのDomain → Application禁止は維持するため、classificationは同じである。

理由:

- `NFR-MA-001`はGate。
- Coding StandardsとRepository StructureがDomain → Applicationを明示禁止している。
- Current codeはその方向へtype-only dependencyを持つ。
- Formal enforcementも不足している。

runtime failureがないことは`refactor_when_touched`へ落とす理由にしない。

再分類結果はPhase 6のdurable reportである`docs/reports/2026-09-06_193114_refactoring_necessity_review.md`へfollow-up resolutionとして追記する。

- 既存の§4.16 `needs_more_evidence`はPhase 6時点の履歴として書き換えない。
- §4.16節へ`Issue #132 follow-up resolution`を追記し、最終classification `refactor_now`、Issue #132、選択した案A / B、new ADR、Task 7で作成したfollow-up Refactor Planを参照できるようにする。
- closed済みTracking Issue #72やPR #128の過去のPhase 6結果は書き換えない。

## 6. Issue #132 decision-only作業の検証

Issue #132自体でsource / testを変更しない場合:

```bash
pnpm run format:check
pnpm run lint:markdown
pnpm run lint:text
git diff --check
```

Repository全体の既存文章も含めた検査が必要になった場合だけ`pnpm run lint:text:all`を追加する。

確認項目:

- ADRと既存architecture文書が矛盾していない。
- Domain → Application禁止が明示されている。
- Application DTO / query / commandのcanonical ownerが変わっていない。
- `ProductViewer` ownershipとDomain policy boundaryが明示されている。
- §4.16の再分類根拠が`NFR-MA-001`とCurrent codeへ追跡できる。
- follow-up Refactorのscopeが具体化されている。
- Product code / test / dependencyを変更していない。

## 7. follow-up Refactorで必要な検証

実装Planでは変更範囲を再確認し、まず次のfocused testを実行する。

- `tests/unit/policies.test.ts`
- `tests/contracts/architecture.test.ts`（Current sourceの境界検査 + synthetic sourceによるscanner self-test）
- ownership変更の影響を受けるrepository contract
- Dexie / SQLite等、`canViewerSeeProduct()`のCurrent callerを変更した経路

focused testがPASSした後、Repository標準gateとして次を実行する。

```bash
pnpm run verify
git diff --check
```

`pnpm run verify`に含まれるtypecheck / unit / integration / repository contract / contractsを同じ理由で個別に重複実行しない。失敗箇所の切り分けやfocused確認が必要な場合だけ個別commandを使う。

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
- §4.16が`needs_more_evidence`から`refactor_now`へ再分類され、Phase 6 durable reportへfollow-up resolutionとして追記されている。元の`needs_more_evidence`は履歴として保持されている。
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

### 17 / 7分類をownership判断へそのまま使う

Application type利用の有無はCurrent違反の検出には使えるが、Repository Portの責務そのものを決めない。

対策:

- 24 interfaceすべてで責務とconsumerを確認する。
- 17 interfaceは最低限の整理対象として扱い、維持 / 移動 / 削除を確認する。
- `ImageAssetCatalogRepository`、`TestInspectionRepository`、`TestMetadataRepository`は未使用contractとして削除可否を先に確認する。
- 7 interfaceもDomain behavior contractとして残す具体的理由があるか確認する。
- interfaceの分割は、単一interface内でownerが分かれる具体的な責務がある場合だけ行う。

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

### static contract scannerがCurrent sourceだけでfalse greenになる

source remediation後は違反が0件になるため、scannerが一部構文を検出できなくてもCurrent sourceだけでは気付けない。

対策:

- `architecture.test.ts`内でsynthetic sourceを使うtable-driven testを追加する。
- 禁止構文family、3種類のpath family、許可例をhelperへ直接通す。
- 新しいfixture frameworkやAST dependencyは追加しない。

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

- ADR-0003のDomain Repository Port方針とApplication contract ownershipをどう両立させるか。§4.2の案A / Bから判断する。

Domain → ApplicationをCurrent policyとして禁止していること自体は未解決事項ではない。

Plan上の推奨は案A。

実行開始時にlatest `main`へmaterial driftがあった場合だけ、影響したauthority / dependency surfaceを再確認してからDecision Pointを提示する。
