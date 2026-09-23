# Report（追記のみ）

## 2026-09-23 10:32 (JST)

- Summary: Issue #132のCurrent Evidenceを再確認し、既存正本だけではDomain → Application type-only dependencyのallow / denyを一意に決められないと判断した。Current `main` `01cd8ab15078d479e821d373445af1e16a469519`から`plan/issue-132-domain-application-type-dependency`を作成し、Plan-onlyの実行計画を保存する。
- Changes: `docs/plans/2026-09-23_103200_issue-132-domain-application-type-dependency.md`と本Runの`PLAN.md` / `TASKS.md` / `REPORT.md`だけを追加する。source、test、ADR、Issue metadataは変更しない。
- Current Evidence:
  - `src/domain/repositories/contracts.ts`は`@/application/contracts`から67型を一括type importし、inlineで`HomeCatalogDto`と`ProductViewer`を参照する。
  - `src/domain/policies/permissions.ts`は`ProductViewer`をApplication contractからtype importする。
  - `@/domain/repositories`のdirect consumerはCurrent検索で18 source file。
  - ADR-0003はApplication → Domain Repository Portを記録する一方、`repository_interfaces.md`はRepositoryがApplication側のRead DTOを使う現行契約を記録する。
  - `tests/contracts/architecture.test.ts`はDomain → Applicationをallow / denyしていない。
  - candidate path起因のruntime cycle、compile failure、反復repairはPhase 6でも確認されていない。
- Decision / Rationale: 既存正本の緊張関係をCodexが独断で解消せず、案A / B / Cをarchitecture ownerへ提示するDecision PointをPlanの必須gateとした。Plan作成時の推奨は、Domain Repository Portを維持し、Repository contractのApplication参照だけをtype-only例外として限定する案A。Domain policyの`ProductViewer`は別責務としてDomain ownership候補とする。
- Validation: GitHub上のCurrent `main`、Issue #132、AGENTS / PLANS / feature-plan Skill、ADR-0003、Repository / Application contract docs、architecture test、candidate source、commit history、Phase 6 reportをread-onlyで確認した。Plan-onlyのためRepository runtime test / CIは実行しない。
- ブロッカー / 残作業: Plan作成タスクとしてはなし。Issue実行時はlatest `main`へrebaselineし、architecture owner Decisionを取得するまでimplementationへ進まない。
- Subagent:
  - Delegation: なし。
  - Result: N/A。
  - 親Agentの判断: N/A。
- Progress: 100% (8/8)

## 2026-09-23 — 全体レビュー反映

- 概要: 初版Planのarchitecture authority確認が不足していたため、Current Repositoryの依存方向を再確認し、Planの前提と実行順を修正した。
- 追加根拠:
  - `docs/CODING_STANDARDS.md §7.1`は`Presentation -> Application -> Domain`、`Infrastructure -> Application Port / Domain Contract`を明示し、DomainからApplicationへの依存を禁止する。
  - `docs/02_architecture/repository_structure.md §4`も「Domainは他Layerへ依存しない」と明示する。
  - `NFR-MA-001`はlayer dependency directionをRelease `Gate`としている。
  - `src/application/ports.ts`には`ProductImageManifestRepository`等のApplication-owned Portが既に存在する。
- Repository mapping:
  - `src/domain/repositories/contracts.ts`の24 interface中、17件がApplication typeをsignatureに使用し、7件はDomain-owned typeだけで閉じる。
  - Current direct consumerはApplication / Infrastructureで、Domain内consumerは確認されていない。
  - `src/domain/policies/permissions.ts`の`canViewerSeeProduct()`は`ProductViewer.userId`を使用せず、公開可否に必要なのはviewerのcustomer判定と`membershipRank`だけ。
- 修正判断:
  - 「allow / denyは未確定」という初版結論を撤回し、Current policyはDomain → Applicationをtype-only含め禁止とした。
  - `repository_interfaces.md`はmethod contractの説明であり、Domain → Application例外のauthorityとは扱わない。
  - Application DTO / query / commandと`ProductViewer`はApplication ownershipを維持する。
  - Application typeを必要とするRepository PortはApplication ownership、Domain-owned typeだけで閉じるRepository ContractはDomain ownershipとする。
  - Domain policyは`ProductViewer`全体ではなく必要最小限のDomain-owned valueを受け取る。
  - §4.16はCurrent状態が維持される場合`refactor_now`とし、source remediation / static contractは別Plan / 実装PRへ切り出す。
- Plan simplification: architecture ownerへA/B/Cを選ばせる必須Decision Gateを削除した。Current architecture自体を変更して例外を新設する場合だけowner Decisionを必要とする。
- Scope: 保存Planと本Run Artifactだけを更新する。Product source、test、ADR、Issue metadata、PR metadataは変更しない。
- Validation: Current `main`はbranch作成時と同じ`01cd8ab15078d479e821d373445af1e16a469519`。GitHub上でCurrent source / normative docs / historyをread-only確認した。runtime test / CIはPlan-onlyのため未実行。
- ブロッカー: なし。
- Progress: 100% (12/12)

## 2026-09-23 — Decision Point再点検

- 概要: 全体レビュー反映後のPlanを再点検し、Domain → Application禁止とRepository Port ownershipを分離した。
- 判断: `NFR-MA-001` / Coding Standards / Repository StructureからDomain → Application禁止はCurrent policyとして確定できる。一方、ADR-0003はApplicationがDomain Repository Portへ依存すると明示しており、Application typeを使う17 Repository interfaceのowner変更は新しいarchitecture decisionを伴う。
- 修正:
  - allow / deny自体をarchitecture ownerへ質問する構造には戻していない。
  - Repository Port ownershipだけをDecision Pointとし、案A / B / Cを整理した。
  - 案AはApplication typeを使う17 interfaceをApplication ownership、Domain-only 7 interfaceをDomain ownershipとする。Plan上の推奨は案A。
  - 案BはDomain ownership維持のためDomain-side contract / mappingを追加する案、案Cはtype-only例外をCurrent policyへ追加する案として比較対象に残した。
  - §4.16の`refactor_now`はCurrent policyを維持する案A / B採用時のclassificationとした。
- Scope: Plan / current Run Artifactだけを修正。Product source、test、ADR、Issue / PR metadataは変更していない。
- ブロッカー: Repository Port ownershipのarchitecture owner Decision 1件。Plan作成自体のブロッカーはなし。
- Progress: 100% (13/13)

## 2026-09-23 — 再レビュー反映

- 概要: 最新PlanをIssue #132、Current Repository、Repository consumer、NFRと再照合し、ownership判断とfollow-up実装の曖昧さを修正した。
- 修正:
  - 17 / 7分類をcanonical ownershipの決定基準から外した。17 interfaceはDomain → Application違反を直接持つ最低限の再配置対象候補、7 interfaceはCurrent違反を直接持たない確認対象とし、24 interfaceすべてを責務 / consumerで再評価する。
  - `NFR-MA-010`をDecision Pointの制約へ追加した。Domain-owned代替contractへ置換する案Bは、このGateの変更またはsupersedeが必要になる可能性を明記した。
  - 案Cを比較対象に残す一方、対象外は「architecture owner DecisionなしでのDomain → Application例外新設」へ修正した。
  - `canViewerSeeProduct()`のCurrent callerはDexie / SQLite等のInfrastructureであるため、`ProductViewer`からDomain policy inputへの変換主体をInfrastructure adapterへ修正した。
  - static contractは通常import、`import type`、TypeScriptの`import("...").Type` type query、runtime dynamic import、relative path解決を検査対象として具体化した。
  - decision-only検証へ`pnpm run lint:text`を追加した。follow-up実装はfocused test後に`pnpm run verify`と`git diff --check`を実行し、verify内のtest / typecheckを理由なく重複実行しない。
- Scope: Plan / current Run Artifactだけを修正。Product source、test、ADR、Issue / PR metadataは変更していない。
- ブロッカー: Repository Port ownershipのarchitecture owner Decision 1件。Plan作成自体のブロッカーはなし。
- Progress: 100% (19/19)

## 2026-09-23 — 最終レビュー修正

- 概要: 実装開始前の最終レビューで残った2点を修正した。
- 未使用contract:
  - Current検索では`ImageAssetCatalogRepository`、`TestInspectionRepository`、`TestMetadataRepository`は`src/domain/repositories/contracts.ts`の定義以外にsource consumer / implementationが確認できない。
  - `ImageAssetCatalogRepository`相当の実利用経路にはApplication-owned `ProductImageManifestRepository`が存在する。
  - Test Inspection / Metadataの実処理は`TestControlService`が直接担っている。
  - このため17 interfaceを「最低限の再配置対象」とせず、維持 / 移動 / 削除を判断する整理対象へ変更した。
- static contract:
  - 案A / BはDomain → Applicationのimport / re-exportを全面禁止する。
  - 案Cは`src/domain/repositories/contracts.ts`から`@/application/contracts`へのtype-only参照だけを限定許可する。
  - 通常import、`import type`、TypeScript import type query、runtime dynamic import、side-effect importに加え、`export ... from`、`export type ... from`、`export * from`とrelative path解決を検査する。
  - 案Cでもre-export、runtime import、他Application module参照は許可しない。
- Scope: Plan / current Run Artifactだけを修正。Product source、test、ADR、Issue / PR metadataは変更していない。
- ブロッカー: Repository Port ownershipのarchitecture owner Decision 1件。Plan作成自体のブロッカーはなし。
- Progress: 100% (22/22)

## 2026-09-23 — 最終整合修正

- 概要: 再レビューで残ったPlan内部の矛盾2点を修正した。
- Decision Point:
  - Domain → Application禁止は`NFR-MA-001`、Coding Standards、Repository StructureからCurrent policyとして確定済みであり、新しいallow / deny Decisionは行わない。
  - type-only例外案はCurrent policyを変更する新しいarchitecture decisionになるため、Issue #132のRepository Port ownership Decision候補から外した。
  - architecture ownerへ提示するRepository Port ownershipは案A / Bの2案に限定した。
  - §4.16は案A / Bのどちらでも`refactor_now`へ再分類する。
- Current violation再確認:
  - Task 3をstatic contractと同じdependency surfaceへ揃えた。
  - 通常import、`import type`、side-effect import、TypeScript import type query、runtime dynamic import、`export ... from`、`export type ... from`、`export * from`、alias / relative pathを確認対象とした。
- static contract:
  - `src/domain/**`から`src/application/**`へのimport / re-exportを例外なく禁止する。
  - Application module別allowlistやRepository contract例外は作らない。
- Scope: Plan / current Run Artifactだけを修正。Product source、test、ADR、Issue / PR metadataは変更していない。
- ブロッカー: Repository Port ownershipのarchitecture owner Decision 1件。Plan作成自体のブロッカーはなし。
- Progress: 100% (24/24)

## 2026-09-23 — 実装分岐・完了証跡の修正

- 概要: 最終レビューで確認した3点をPlanへ反映した。
- static contract:
  - `tsconfig.json`の`baseUrl: "."`により`src/application/**`のbare specifierが解決可能なため、`@/application/**`、relative pathと並ぶ禁止経路へ追加した。
  - Current Repositoryではliteral `require()`が使用されるため、literal `require("...")`も検査対象へ追加した。
  - computed `require(variable)`や汎用module resolverの実装までは広げない。
- follow-up Refactor:
  - Task 8を共通 / 案A / 案Bへ分けた。
  - 18 direct consumerはimpact inventoryとして再取得し、実際にsignature / export pathが変わるconsumerだけを変更する。
  - 案Aでは移動したPortだけexport / importを更新する。
  - 案BではDomain-owned repository input / output、Application boundary mapping、`NFR-MA-010`変更 / supersede判断を実装Planへ含める。
- §4.16:
  - Phase 6 durable report `docs/reports/2026-09-06_193114_refactoring_necessity_review.md`の元の`needs_more_evidence`を履歴として保持する。
  - Issue #132のfollow-up resolutionとして`refactor_now`、選択した案、new ADR、follow-up Refactor Planへの参照を追記する。
  - closed済みIssue #72 / PR #128の過去のPhase 6結果は書き換えない。
- ファイル分割: 行わない。Current Planは1件のarchitecture Decisionとそのfollow-up分岐を一続きで参照する方が実装時の判断を減らせる。
- Scope: Plan / current Run Artifactだけを修正。Product source、test、ADR、Issue / PR metadataは変更していない。
- ブロッカー: Repository Port ownershipのarchitecture owner Decision 1件。Plan作成自体のブロッカーはなし。
- Progress: 100% (27/27)

## 2026-09-23 — 最終実行順・検証修正

- 概要: 再レビューで残った4点をPlanへ反映した。
- ADR-0003:
  - architecture ownerのDecisionはRepository Port ownershipの案A / B 1件だけとした。
  - 案Aを選ぶ場合はnew ADRの`Supersedes`でADR-0003 Decision 3のRepository Port ownership部分を限定的に置き換える。
  - 案Bを選ぶ場合はADR-0003 Decision 3を維持する。
  - ADRの扱いを案A / Bとは別の選択肢にしない。
- 実行順:
  - follow-up Refactor Plan作成を先に行い、その保存先確定後に§4.16を`refactor_now`へ再分類してPhase 6 durable reportへ追記する。
  - durable reportは実在するnew ADRとfollow-up Refactor Planを参照する。
- static contract:
  - Current sourceの違反0件だけではscanner実装の正しさを証明できないため、`tests/contracts/architecture.test.ts`内でsynthetic sourceを使うtable-driven self-testを追加する。
  - static import / type import / side-effect import / type query / dynamic import / re-export / literal `require()`、`@/application/**` / `src/application/**` / relative path、許可例を最低限検証する。
  - fixture framework、AST dependency、汎用dependency scannerは追加しない。
- 検証:
  - decision-only作業へ`pnpm run format:check`を追加し、`lint:markdown` / `lint:text` / `git diff --check`と合わせて実行する。
- ファイル分割: 行わない。DecisionからADR、follow-up Plan、再分類まで同一Planで順序を追える方が実行時の判断が少ない。
- Scope: Plan / current Run Artifactだけを修正。Product source、test、ADR、Issue / PR metadataは変更していない。
- ブロッカー: Repository Port ownershipのarchitecture owner Decision 1件。Plan作成自体のブロッカーはなし。
- Progress: 100% (31/31)
