# Plan（計画）

## 目的

- Issue #132のPlanレビューで見つかったarchitecture authorityの見落としを修正する。
- Current Repositoryの明示方針に基づき、Domain → Application type-only dependencyの扱いとcanonical ownershipを確定できるPlanへ更新する。
- 今回はPlan-onlyとし、Product source、test、ADR、Issue metadataは変更しない。

## 追加確認

- `docs/CODING_STANDARDS.md §7.1`
- `docs/02_architecture/repository_structure.md §4`
- `docs/01_requirements/non_functional_requirements.md`の`NFR-MA-001`
- ADR-0003
- `src/application/ports.ts`
- `src/domain/repositories/contracts.ts`のinterface単位のApplication type利用
- `src/domain/policies/permissions.ts`で`ProductViewer`から実際に使うfield
- `@/domain/repositories`のCurrent consumer

## 修正後の判断

- Current architectureはDomain → Applicationをtype-onlyを含め禁止している。
- Current codeと一部Repository contract説明がarchitecture ruleへ整合していない。
- Application DTO / query / commandと`ProductViewer`はApplication ownershipを維持する。
- Repository Port ownershipはADR-0003との整合が必要なため、案A / Bをarchitecture ownerへ提示するDecision Pointとして残す。
- Plan上の推奨は、Repository Portのownerを責務とconsumerで決める案A。17 interfaceはCurrent違反を直接持つ最低限の整理対象とし、維持 / 移動 / 削除を確認する。残る7 interfaceもDomain ownershipと自動確定しない。
- `canViewerSeeProduct()`はApplication `ProductViewer`へ依存せず、必要最小限のDomain-owned valueを受け取る。
- 案A / BでCurrent policyを維持する場合、§4.16は`refactor_now`とし、実装は別Plan / PRへ切り出す。

## 再レビュー反映

- `NFR-MA-010`をRepository ownership Decisionの制約へ追加した。
- 17 / 7分類はownershipの結論ではなくCurrent違反のEvidenceとして扱う。
- 案Bは`NFR-MA-010`変更またはsupersedeの可能性を伴うと明記した。
- Domain → Application例外はCurrent policy変更になるため、Repository Port ownershipのDecision候補から外した。
- `ProductViewer`からDomain policy inputへの変換主体をCurrent callerであるInfrastructure adapterへ修正した。
- static contractは通常import、`import type`、TypeScript import type query、runtime dynamic import、relative pathを具体的に検査する。
- decision-only検証へ`pnpm run lint:text`を追加し、follow-up実装はfocused test後に`pnpm run verify`を標準gateとして実行する。

## 最終レビュー反映

- `ImageAssetCatalogRepository`、`TestInspectionRepository`、`TestMetadataRepository`はCurrent sourceで定義以外のconsumer / implementationが確認できないため、17 interfaceを一律に移動せず、維持 / 移動 / 削除を確認する方針へ修正した。
- import系に加えて`export ... from`、`export type ... from`、`export * from`をstatic architecture contractとCurrent violation再確認の両方へ追加した。
- static architecture contractはDomain → Applicationのimport / re-exportを例外なく禁止する。

## 最終整合修正

- Domain → Application禁止はCurrent policyとして既に確定しているため、type-only例外案をarchitecture ownerのDecision候補から外した。
- Repository Port ownershipのDecision Pointは案A / Bの2案に限定した。
- §4.16は案A / Bのどちらでも`refactor_now`へ再分類する。
- Task 3のCurrent violation再確認をTask 6と同じdependency surfaceへ揃え、side-effect import、re-export、alias / relative pathを含めた。

## 実装分岐・完了証跡の修正

- `tsconfig.json`の`baseUrl: "."`を考慮し、`@/application/**`とrelative pathだけでなく`src/application/**`のbare specifierをCurrent violation再確認とstatic contractの対象へ追加した。
- Current Repositoryでliteral `require()`が使用されるため、literal `require("...")`もDomain → Application禁止contractへ追加した。computed specifier解析までは広げない。
- follow-up Refactor Planを共通 / 案A / 案Bへ分岐した。18 direct consumerはimpact inventoryとして扱い、全18件を固定更新しない。
- 案BではDomain-owned repository input / output、Application boundary mapping、`NFR-MA-010`変更 / supersede判断を明示した。
- §4.16の最終`refactor_now`はPhase 6 durable reportへfollow-up resolutionとして追記し、元の`needs_more_evidence`は履歴として保持する。
- Planは1つのarchitecture Decisionとfollow-up分岐を扱うため、ファイル分割は行わない。
