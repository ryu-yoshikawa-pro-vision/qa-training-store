# Tasks

## Now

- 実行順に並べる（上から順に処理）
- [x] 1. Repository rule、feature-plan skill、Master Plan、PR #75 merge状態を確認する
- [x] 2. Issue #72とCurrent `main` baselineを確認する
- [x] 3. Issue #72をPR 1 Merged / PR 2 child Plan状態へ更新する
- [x] 4. 最新baselineから`docs/formal-test-strategy-traceability` branchを作成する
- [x] 5. Current Formal Suite / Web・Cross-browser・Native workflow / Training boundaryをrepo mappingする
- [x] 6. RA-G1 / RA-G3 / RA-G6とPR 1 follow-up verificationをchild Planへ具体化する
- [x] 7. child Planと今回Run Artifactの保存内容を確定し、single plan commitへ含める
- [ ] 8. local plan-only validation / Sanitizerを実施してPlan reviewへ引き渡す

## Discovered

- [x] D1. Risk mappingへ`Representative Requirement / AC`を追加し、Master Planのend-to-end traceを成立させる
- [x] D2. `Test ID Rule`と`UT-*` / `CT-*` / `CP-*` / `WE-*`等の既存label taxonomyをimplementation前audit対象として明示する
- [x] D3. PR 2 implementationのWritable scopeを`test_strategy.md` / `requirements_traceability.md` + implementation Runへ固定する
- [x] D4. Current Formal Suite Inventoryをentrypoint-firstへ縮小し、参照するtest fileだけ追加確認する
- [x] D5. direct code reference形式を原則`repository-relative file path + exact test title`へ固定する
- [x] D6. Phase 1 Risk 16件をgroup化せず1 Risk = 1 row、新Stable Risk IDなしへ固定する
- [x] D7. Platform parityをWeb / Android / iOSのCurrent asymmetric guarantee説明へ限定する

## Blocked

- B1. local plan-only validation / SanitizerはGitHub connector上では未実施。次のlocal作業で実施する。
