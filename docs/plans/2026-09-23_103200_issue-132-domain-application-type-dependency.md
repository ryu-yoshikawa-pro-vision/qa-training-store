# Issue #132 Domain → Application type dependency architecture方針確定 Plan

## 0. 依頼概要

- 対象Issue: #132 `investigate: Domain → Application type dependencyのarchitecture方針を確定する`
- 作業branch: `plan/issue-132-domain-application-type-dependency`
- branch作成時の`main`: `01cd8ab15078d479e821d373445af1e16a469519`
- 今回はPlan作成までとし、type移動、Repository interface移動、architecture contract実装、ADR追加、Issue close、PR作成、mergeは行わない。
- Issue #132の目的どおり、既存正本から一意に決まらないarchitecture policyをCodexだけで確定しない。

## 1. 結論

Current `main`を再確認した結果、既存正本だけではDomain → Applicationのtype-only dependencyを許容するかを一意に決められない。

理由は次のとおり。

1. ADR-0003は「Application層はDomain Repository Portだけに依存する」と明記している。
2. `docs/04_data/repository_interfaces.md`は、RepositoryがDomain Entityまたは明示したRead DTOを返し、DTO・Input・Resultの具体型は`application_contracts.md`を参照する現行契約を記載している。
3. 実装もこの2つを同時に満たす形になっており、Domain Repository Port自体は`src/domain/repositories/contracts.ts`に置かれたまま、method signatureがApplication contractをtype-onlyで参照している。
4. `tests/contracts/architecture.test.ts`はApplication → InfrastructureやNative → Webの禁止方向を検査するが、Domain → Applicationのtype-only edgeは検査していない。
5. Phase 6以降もこのboundary起因のruntime cycle、compile failure、repair再発は確認されていない。

したがって、このIssueの実行時は次の順序を固定する。

1. Current dependency surfaceを有限に再取得する。
2. 既存正本間の緊張関係をDecision Pointへ整理する。
3. architecture ownerへ選択肢・影響・推奨案を提示し、判断を得る。
4. 判断後にarchitecture decisionを正本へ保存し、static contractの要否と§4.16の再分類を確定する。
5. type移動やRepository Port移動が必要な場合は、このIssue内で先行実装せず、別Plan / 実装PRへ切り出す。

## 2. Current repository mapping

### 2.1 Entry points

- Issue #132
- `src/domain/repositories/contracts.ts`
- `src/domain/policies/permissions.ts`
- `src/application/contracts/**`
- `src/application/contracts/common.ts`
- `src/application/ports/**`
- `tests/contracts/architecture.test.ts`
- `tests/unit/policies.test.ts`
- Repository contract tests
- `docs/adr/0003-platform-route-composition-root.md`
- `docs/04_data/repository_interfaces.md`
- `docs/04_data/application_contracts.md`
- `docs/02_architecture/system_architecture.md`
- `docs/reports/2026-09-06_193114_refactoring_necessity_review.md`

### 2.2 Main flow

Currentの主要依存は次。

```text
Application use cases
  -> Domain Repository Port
       -> Application DTO / query / command type  [type-only]
  -> Domain policy
       -> Application ProductViewer               [type-only]

Infrastructure adapters
  -> Domain Repository Port
  -> Application contracts

Presentation
  -> Application services
```

Runtime import cycleは現在確認されていないが、type graphではDomainとApplicationが双方向に参照する。

### 2.3 Current dependency surface

`src/domain/**`から`@/application/**`を参照するCurrent fileは2件。

#### `src/domain/repositories/contracts.ts`

- `@/application/contracts`から67型を一括type importしている。
- 追加でinline type importとして次を参照する。
  - `HomeCatalogDto`
  - `ProductViewer`
- Repository PortのsignatureにはRead DTOだけでなく、query / command / result型も含まれる。
- `@/domain/repositories`の直接consumerはCurrent検索で18 source file確認できる。
  - Application use cases / identity / transaction
  - Dexie adapters
  - SQLite Native adapter

このため、問題を「4箇所の小さなimport修正」として扱わない。4 referenceがtype-onlyであることと、その1 referenceが多数のApplication-owned typeを束ねていることを分けて扱う。

#### `src/domain/policies/permissions.ts`

- `ProductViewer`を`@/application/contracts`からtype importする。
- `canViewerSeeProduct()`がそのtypeを直接使用する。
- `ProductViewer`自体は`guest`またはcustomerの`userId` / `membershipRank`だけで構成され、現在は`src/application/contracts/common.ts`にある。

### 2.4 History

Currentで確認したcandidate pathの主な履歴は次。

- `src/domain/repositories/contracts.ts`
  - `8900637`: Phase 1初期architecture
  - `7f7e48e`: Native Foundation
  - `778b6f6`: Native CI / Cart / checkout関連修正
- `src/domain/policies/permissions.ts`
  - `8900637`: Phase 1初期architecture
- `tests/contracts/architecture.test.ts`
  - `08510e3`: 2026-09-02のcontract整合修正が最新の主要変更

Issue作成後にcandidate boundaryの意味を変える変更は確認していない。実行開始時にはlatest `main`へrebaselineする。

## 3. 既存正本の緊張関係

### 3.1 ADR-0003

ADR-0003は次を決定済みとする。

- Application層はDomain Repository Portだけに依存する。
- Dexie / SQLite等のInfrastructure実装はComposition Root / Adapter側へ置く。

これはRepository PortのownershipをDomainに置く方向を支持する。

### 3.2 Repository Interface正本

`docs/04_data/repository_interfaces.md`は次を記録する。

- RepositoryはDomain Entityまたは明示Read DTOを返す。
- DTO・Input・Resultの具体型は`application_contracts.md`を参照する。
- Repository / Adapter固有ExceptionはUse Case境界でApplicationErrorへ変換する。

これはRepository contractがApplication-owned DTO等をsignatureで利用するCurrent設計を説明している。

### 3.3 Application contract正本

`docs/04_data/application_contracts.md`はApplication / DTO contractの意味・責務を説明し、実装TypeScriptをSSOTとしている。

したがって、Repository PortをDomainに置きながらApplication-owned contractをtype-onlyで利用するCurrent構造は、偶発的な1 importではなくRepository contract全体の設計と結び付いている。

### 3.4 Current static contract

`tests/contracts/architecture.test.ts`は以下を保護する。

- Application → Infrastructure / Dexie禁止
- Native entry point → Web-only dependency禁止
- Web-only style / widget等の各boundary

一方、Domain → Applicationについてallow / denyのどちらも明示していない。

## 4. Decision Point

architecture ownerへは最低限、次の3案を提示する。判断前にtype移動やRepository Port移動を行わない。

| 案 | 方針 | 主な利点 | 主な欠点 |
| --- | --- | --- | --- |
| A | Domain Repository Portは現位置を維持し、`src/domain/repositories/contracts.ts`だけApplication contractへのtype-only参照を明示的な例外として許可する。Domain policyからApplicationへの参照は許可せず、`ProductViewer`はDomain側ownership候補とする。 | ADR-0003とCurrent repository contractをほぼ維持でき、18 consumerを広く移動しない。runtime依存を増やさず、例外をstatic contractで限定できる。 | Domain / Applicationのtype graph双方向性はRepository Portに限って残る。Application contract変更がDomain fileへ波及する構造も残る。 |
| B | Application contractをsignatureに使うRepository Port自体をApplication ownershipへ移す。DomainはApplicationを参照しない。 | dependency directionが一方向になり、Domain independenceが明確になる。既存`src/application/ports/**`とも概念上揃えやすい。 | 18 direct consumerとadapter / transaction contract / docs / ADRへ広い移行が必要。Current failureがない状態では変更量が大きい。ADR-0003のdecision更新が必要。 |
| C | Repository PortをDomainに維持し、参照中のDTO / query / commandをDomain ownershipへ移す。 | Domain Repository PortからApplication参照を消せる。 | Admin query、Application command、DTO等までDomainへ流入しやすく、Domain責務を広げる。Application contractのownershipを崩すため変更範囲も大きい。 |

### 4.1 Plan作成時点の推奨案

**案Aを第一候補としてarchitecture ownerへ提示する。**

理由:

- runtime failure / cycle / candidate起因repairがない。
- ADR-0003の「Domain Repository Port」を維持できる。
- `repository_interfaces.md`がApplication Read DTOを利用するCurrent責務を既に説明している。
- 18 direct consumerを移す案Bより変更blast radiusが小さい。
- Application-centric DTO / commandをDomainへ移す案Cより責務を保ちやすい。
- 例外を「Domain全体」ではなく`src/domain/repositories/contracts.ts`のtype-only参照へ限定し、static contractで拡大を防げる。

ただし、これはPlan作成時の推奨でありarchitecture decisionではない。architecture ownerの承認前に採用扱いしない。

### 4.2 `ProductViewer`の扱い

案Aを採用する場合でも、`src/domain/policies/permissions.ts`からApplication typeを参照する必要性はRepository Portとは別に判断する。

Plan作成時点では、`ProductViewer`はDomain policyが直接意味を使用し、構成要素もDomain conceptだけであるため、Domain側をcanonical ownerとする案を推奨する。

実際のtype移動はarchitecture decision確定後に別Plan / 実装PRへ切り出す。互換用re-export等を入れるかもその実装Planでconsumerを再確認して決める。

## 5. 実行タスク

### Task 1: latest mainへrebaseline

1. 実行開始時の`origin/main` SHAを記録する。
2. 次のpathについてbranch作成時SHAからの差分を確認する。
   - `src/domain/repositories/**`
   - `src/domain/policies/**`
   - `src/application/contracts/**`
   - `src/application/ports/**`
   - `tests/contracts/architecture.test.ts`
   - `docs/adr/**`
   - `docs/04_data/repository_interfaces.md`
   - `docs/04_data/application_contracts.md`
3. relevant driftがあればDecision Matrixだけ再評価し、Issue全体の再監査へ広げない。

### Task 2: finite dependency inventoryを確定

次だけを取得する。

- `src/domain/**` → `@/application/**`の全edge
- 各edgeがruntime importかtype-onlyか
- Application typeごとの責務分類
  - Domain concept
  - Application request / command
  - Application query
  - Read DTO / result
  - Test inspection
- `@/domain/repositories`の直接consumer
- behaviorを守る既存unit / integration / repository contract

generic dependency graph、AST framework、恒久scannerは追加しない。

### Task 3: normative sourceを突き合わせる

最低限次を同じDecision Matrixで比較する。

- ADR-0003
- `repository_interfaces.md`
- `application_contracts.md`
- `system_architecture.md`
- Current TypeScript code
- Current architecture contract

確認する問い:

1. Domain Repository Portのownershipは維持必須か。
2. Repository PortがApplication-owned DTO / query / commandをtype-onlyで参照する例外を許容するか。
3. `ProductViewer`のcanonical ownerはDomain / Applicationのどちらか。
4. 許容するedgeをstatic contractでどこまで限定するか。

### Task 4: architecture owner Decision

次を1つのDecision Pointとして提示する。

- 案A / B / C
- Current Repository上の根拠
- dependency direction
- canonical type ownership
- 既存consumerへの影響
- migration量
- static contract
- ADRへの影響
- §4.16の再分類候補
- 推奨案と理由

architecture ownerの回答前は以下を行わない。

- type移動
- Repository interface移動
- re-export追加
- architecture testの新規禁止規則
- ADRでpolicyを確定
- `refactor_now`等への最終再分類

### Task 5: decisionを永続化

architecture ownerの判断後、必要な最小範囲でdecisionを保存する。

原則としてhistorical ADR-0003本文を書き換えて現在の判断へ見せ替えない。新しいarchitecture decisionが必要なら、実装開始時の次available ADR番号を使って新規ADRを追加し、ADR-0003との関係を明記する。Plan作成時点では次番号はADR-0027。

必要に応じて更新候補:

- `docs/adr/0027-*.md` または実装時のnext available ADR
- `docs/04_data/repository_interfaces.md`
- `docs/04_data/application_contracts.md`
- `docs/02_architecture/system_architecture.md`
- `docs/PROJECT_CONTEXT.md`はproject理解が実際に変わる場合だけ更新する

同じruleを複数文書へ重複して正本化しない。

### Task 6: static architecture contractの要否を確定

選択したarchitecture方針に応じてcontractを決める。

#### 案Aの場合

追加するなら、既存`tests/contracts/architecture.test.ts`へ小さいsource-scan testを追加する。

守る内容:

- `src/domain/**`から`@/application/**`への依存は原則禁止。
- 例外は`src/domain/repositories/contracts.ts`から`@/application/contracts`へのtype-only参照だけ。
- runtime importは禁止。
- `@/application/errors`や`@/application/ports`等、許可していないApplication moduleへの参照は禁止。
- `src/domain/policies/**`には例外を設けない。

TypeScript AST parser等の新規dependencyは追加せず、既存architecture testのsource scan方式で十分かを先に確認する。

#### 案B / Cの場合

Domain → Applicationを全面禁止するcontractを候補とする。Current sourceが違反する間は、migration実装とcontract導入の順序を別Planで決める。

### Task 7: §4.16を再分類

architecture decisionとCurrent codeの適合状態から、次のいずれかへ変更する。

- `keep_as_is`
- `refactor_when_touched`
- `refactor_now`

判定ルール:

- 採用policyへCurrent codeが適合し、追加migration不要なら`keep_as_is`。
- policy上は変更が必要だが、Current failureがなく次回関連変更まで延期可能とownerが判断するなら`refactor_when_touched`。
- policy上の不整合を現在解消する必要があるとownerが判断するなら`refactor_now`。

分類名を先に決めてarchitecture decisionを逆算しない。

### Task 8: Refactorが必要な場合だけ別Planへ切り出す

別Planには少なくとも次を含める。

- exact type / interface移動対象
- import consumer一覧
- compatibility / re-exportの有無
- ADR / docs同期
- architecture contract導入順
- focused tests
- repository-wide validation
- migrationを小さく分割できるか

Issue #132の調査Planへ大規模type移動を混ぜない。

## 6. Validation plan

### 6.1 調査・decision保存だけの場合

- Current dependency inventoryとDecision Matrixが一致している。
- ADR / docs間でownershipとdependency directionが矛盾していない。
- Markdown lint対象に新しいbare URLやformat違反がない。
- `git diff --check`がPASSする。

### 6.2 architecture contractを同じPRで追加する場合

最低限:

```bash
pnpm exec vitest run tests/contracts/architecture.test.ts --no-file-parallelism --maxWorkers=1
pnpm run test:contracts
pnpm run verify
git diff --check
```

### 6.3 type / port移動が必要な場合

このPlanでは実施しない。別Planで対象use case / repository contract / Native / Dexieへのfocused validationを追加する。

## 7. 完了条件

Issue #132の対応は、次をすべて満たした時点で完了候補とする。

- latest `main`でDomain → Application edgeを再取得している。
- runtime importとtype-only edgeを区別している。
- Repository PortのApplication contract参照を単純なimport数だけで評価していない。
- ADR-0003、Repository Interface正本、Application Contract正本、Current code、architecture testの関係を説明できる。
- 既存正本だけで一意に決まらない場合、architecture ownerが案A / B / C等から明示判断している。
- Domain → Application type-only dependencyのallow / deny ruleが明文化されている。
- `ProductViewer`のcanonical ownerが決まっている。
- Repository Read DTO / query / commandのcanonical ownerが決まっている。
- static architecture contractの要否と、必要なら検査範囲が決まっている。
- §4.16が`needs_more_evidence`以外へ再分類されている。
- 新しいarchitecture decisionが必要ならADR等へ永続化している。
- Refactorが必要な場合は別Plan / 実装PRへ切り出しており、このIssueの調査と混在させていない。
- runtime Product behaviorを変更していない。
- generic dependency graph / architecture framework /新規dependencyを追加していない。

## 8. リスクと対策

### import数だけで小さい問題と誤認する

`contracts.ts`の1つのtype import blockが多数のApplication contractを束ねる。reference数ではなくownershipとconsumer blast radiusで判断する。

### 一般的なClean ArchitectureをRepository規約へ持ち込む

既存ADR / docs / codeを先に比較し、一般論はDecision Pointの補足に留める。外部一般論だけで案Bを自動採用しない。

### 案Aの例外がDomain全体へ拡大する

例外を採用する場合は`src/domain/repositories/contracts.ts` + `@/application/contracts` + type-onlyへ限定し、static contractで拡張を検知する。

### 案Bで移行範囲を過小評価する

Currentで`@/domain/repositories`のdirect consumerが18 source fileある。Repository Port移動を選ぶ場合は別Planでconsumerを再取得し、一括renameや広域re-exportを無計画に行わない。

### 案CでApplication semanticsをDomainへ流し込む

DTO / query / commandを型重複だけでDomainへ移さない。各typeの責務からcanonical ownerを判断する。

### `ProductViewer`とRepository DTOを同じ結論にまとめる

Domain policyが直接使う`ProductViewer`と、Application use case向けのRead DTO / query / commandは責務が異なる。個別にownerを決める。

## 9. ロールバック

今回のPlan作成自体はdocumentation-only。

Issue実行時にADR / docs / contract testだけを変更する場合もDatabase、migration、external state変更はない。architecture decisionを誤って保存した場合は対象PRをmergeせず修正する。

type / Repository Port移動は別Plan / 実装PRとし、そこでrollback単位を定義する。

## 10. 対象外

- Domain / Application全面再設計
- Clean Architecture framework導入
- Repository interface全体の書き換え
- generic dependency graph / scanner導入
- type-only importをruntime failureとして扱うこと
- Product behavior変更
- Dexie / SQLite schema変更
- Native / Web feature変更
- architecture owner未承認での新policy制定
- decision前のtype移動
- decision前のRepository Port移動
- Issue #130 / #117 / #163の進行中作業を混在させること

## 11. 未解決事項

実装開始を止める未解決事項は1件。

- **architecture owner Decision:** 案A / B / Cのどのdependency direction / ownershipをRepository policyとして採用するか。

このDecisionはIssue実行時にCurrent Evidenceと推奨案を提示して取得する。Plan作成段階では案Aを推奨するが、承認済みdecisionとして扱わない。
