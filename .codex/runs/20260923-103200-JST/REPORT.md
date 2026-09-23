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
