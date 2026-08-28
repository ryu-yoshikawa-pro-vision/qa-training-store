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
- [ ] 8. Plan review反映後にlocal plan-only validation / Sanitizerを実施し、implementation開始前gateを完了する

## Discovered

- [x] D1. Risk mappingへ`Representative Requirement / AC`を追加し、Master Planのend-to-end traceを成立させる
- [x] D2. `Test ID Rule`と`UT-*` / `CT-*` / `CP-*` / `WE-*`等の既存label taxonomyをimplementation前audit対象として明示する
- [x] D3. PR 2 implementationのWritable scopeを`test_strategy.md` / `requirements_traceability.md` + implementation Runへ固定する
- [x] D4. Current Formal Suite Inventoryをentrypoint-firstへ縮小し、参照するtest fileだけ追加確認する
- [x] D5. direct code reference形式を原則`repository-relative file path + exact test title`へ固定する
- [x] D6. Phase 1 Risk 16件をgroup化せず1 Risk = 1 row、新Stable Risk IDなしへ固定する
- [x] D7. Platform parityをWeb / Android / iOSのCurrent asymmetric guarantee説明へ限定する
- [x] D8. Functional / Non-functional Requirement Groupの全既存行へrepresentative regression direct referenceを要求する
- [x] D9. Risk mappingの`Representative Technique`と`Representative Perspective`を別列へ分離する
- [x] D10. 実装開始時点のCurrent下位Traceability代表label全件をDispositionし、Plan作成時点の22行はCurrent evidenceとしてのみ扱う契約へする
- [x] D11. Current `main` driftのStop条件をPR 2判断へ影響するsemantic contract変更時へ限定する
- [x] D12. Representative Techniqueを全Risk必須から外し、非適用時の`—` / `Not primary`を許容して推測でのTechnique追加を禁止する
- [x] D13. `playwright.config.ts`をFormal単位で分類せず、Formal E2E / Smokeと`ui-review-*`をproject責務で区別する
- [x] D14. 下位Traceabilityの「22行」を固定契約から外し、implementation開始時点のCurrent全行を完了対象とする

## Blocked

- B1. local plan-only validation / SanitizerはGitHub connector上では未実施。implementation開始前にlocal環境で実施する。
