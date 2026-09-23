# Plan（計画）

## 目的

- Issue #132のarchitecture方針確定に向け、Current Repositoryを再調査し、実装前Planを保存する。
- 既存正本だけで一意に決まらない場合はarchitecture ownerのDecision PointをPlanへ明示する。
- 今回はPlan-onlyとし、type移動、Repository Port移動、ADR追加、architecture contract実装へ進まない。

## 調査対象

- `src/domain/repositories/contracts.ts`
- `src/domain/policies/permissions.ts`
- `src/application/contracts/**`
- `src/application/ports/**`
- `tests/contracts/architecture.test.ts`
- ADR-0003
- `docs/04_data/repository_interfaces.md`
- `docs/04_data/application_contracts.md`
- Phase 6 §4.16のEvidence

## Plan上の判断

- Existing sourcesだけではDomain → Application type-only dependencyのallow / denyは一意に決まらない。
- Plan実行時にarchitecture owner Decisionを必須gateとする。
- Plan作成時の推奨は、Domain Repository Portを維持しつつRepository contractだけtype-only例外を限定許可し、Domain policyからApplicationへの参照は許可しない案。
- `ProductViewer`のcanonical ownerはDomain側を第一候補とするが、実装はDecision後の別Planへ切り出す。
