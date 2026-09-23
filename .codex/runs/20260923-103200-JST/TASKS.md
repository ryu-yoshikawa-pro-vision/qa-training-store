# Tasks（タスク）

## 完了

- [x] 1. Issue #132とPhase 6 §4.16の不足Evidenceを確認する。
- [x] 2. Current `main`とcandidate pathの履歴を確認する。
- [x] 3. Domain → ApplicationのCurrent edgeとtype-only性を確認する。
- [x] 4. ADR-0003、Repository Interface正本、Application Contract正本、architecture testを比較する。
- [x] 5. Repository Port consumerの影響範囲を確認する。
- [x] 6. 初版PlanとRun Artifactを作成する。
- [x] 7. 全体レビューで`CODING_STANDARDS.md §7.1`、`repository_structure.md §4`、`NFR-MA-001`の見落としを確認する。
- [x] 8. `src/application/ports.ts`の既存Application Port patternを確認する。
- [x] 9. Repository interface 24件をApplication type利用17件 / Domain-only 7件へ分類する。
- [x] 10. `ProductViewer`のCurrent responsibilityとDomain policyの実利用fieldを確認する。
- [x] 11. Domain → Applicationのallow / denyをowner Decision対象から外し、Current policyとしてPlanへ反映する。
- [x] 12. Repository Port ownershipだけをarchitecture owner Decisionとして残し、案A / Bと推奨案を整理する。
- [x] 13. §4.16の再分類、follow-up Refactor、static contractの実装順をPlanへ反映する。
- [x] 14. 17 / 7分類をownership決定から切り離し、24 interfaceを責務 / consumerで再評価する方針へ修正する。
- [x] 15. `NFR-MA-010`をDecision Pointへ追加し、案BのGate変更リスクを明記する。
- [x] 16. Domain → Application例外をRepository Port ownershipのDecision候補から外し、Issue #132の対象外とする。
- [x] 17. `ProductViewer`変換主体をCurrent callerのInfrastructure adapterへ修正する。
- [x] 18. static contractのimport形とrelative path検査を具体化する。
- [x] 19. decision-only / follow-up Refactorの検証commandをRepository標準へ整理する。
- [x] 20. 17 interfaceを一律の再配置対象から外し、維持 / 移動 / 削除の整理対象へ修正する。
- [x] 21. 未使用候補の`ImageAssetCatalogRepository` / `TestInspectionRepository` / `TestMetadataRepository`をfollow-upの削除確認対象へ追加する。
- [x] 22. static contractをDomain → Application全面禁止へ統一し、re-export構文を検査対象へ追加する。
- [x] 23. 案CをDecision候補から外し、Repository Port ownershipのDecisionを案A / Bへ限定する。
- [x] 24. Task 3のCurrent violation再確認をTask 6と同じimport / re-export surfaceへ揃える。
- [x] 25. `src/application/**` bare specifierとliteral `require()`をCurrent violation / static contractへ追加する。
- [x] 26. follow-up Refactor Planを共通 / 案A / 案Bへ分岐し、18 direct consumerを固定更新対象からimpact inventoryへ修正する。
- [x] 27. §4.16の`refactor_now`をPhase 6 durable reportへfollow-up resolutionとして記録する手順を追加する。
- [x] 28. 案A / BとADR-0003 Decision 3の扱いを1対1に固定し、独立Decisionをなくす。
- [x] 29. follow-up Refactor Plan作成を§4.16 durable report更新より先へ移す。
- [x] 30. architecture scannerのsynthetic source / table-driven self-testをPlanへ追加する。
- [x] 31. decision-only検証へ`pnpm run format:check`を追加する。
- [x] 32. 案B選択時の`NFR-MA-010`更新を必須化し、第二のDecisionをなくす。
- [x] 33. `export type * from` / `export type * as <name> from`をstatic contractとscanner self-testへ明示する。
- [x] 34. Task 1のrebaseline対象へ`tsconfig.json`の`baseUrl` / `paths`を追加する。
- [x] 35. 案Bの`NFR-MA-010`を「変更またはsupersede」ではなくCurrent requirementの必須更新へ固定する。
- [x] 36. Run `PLAN.md`に残った旧「可能性」「判断」表現をCurrent方針へ同期する。

## ブロック中

- なし。

## 次工程

- Planレビュー完了後にIssue #132のdecision-only作業を実施し、Repository Port ownershipのDecisionを取得する。
- Product source / testのRefactorはIssue #132のdecision確定後、別Plan / 実装PRで行う。
