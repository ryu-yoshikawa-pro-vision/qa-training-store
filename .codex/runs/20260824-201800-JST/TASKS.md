# Tasks

## Now

- [x] 1. PR #53 の merge と `main` HEAD を確認する
- [x] 2. Repository の planning rule / template / current validation entry を確認する
- [x] 3. `main` から計画用 branch を作成する
- [x] 4. Report Findings を依存関係順に整理した Master Plan を `docs/plans/` に保存する
- [x] 5. Run Artifact を保存し、Master Plan review / repair を完了する
- [ ] 6. Step 0 として RA-M7 の `scripts/validate-curriculum.ts` required path を最小修正し、Matrix / Run Artifact を実状態へ更新する
- [ ] 7. `validate:curriculum` / `test:contracts` / `typecheck` / format / markdown / Sanitizer Write・Check を実行し、結果を Run Artifact へ記録する
- [ ] 8. Repository required CI と PR diff を確認し、Master Plan + RA-M7 CI unblocker PR の merge readiness を確定する

## Discovered

- [x] D1. Decision B が Curriculum の Learner Required boundary のみを変更し、Formal Native Product Gate を変更しないガードレールを Master Plan に追加する
- [x] D2. Audit baseline から `main` が進んでいるため、各 child PR の前に Current `main` 再検証 Phase を追加する
- [x] D3. Refactoring candidate は size 単独で実装せず、追加 Evidence に基づく Necessity Review を先行させる
- [x] D4. Master Plan 内の誤った `docs/08_testing/requirements_traceability.md` / `acceptance_criteria.md` 参照を、実在する `docs/12_quality/` 配下へ修正する
- [x] D5. Audit / Curriculum の全 Finding を Phase / PR / disposition へ一対一で割り当てる Remediation Matrix を Master Plan に追加する
- [x] D6. Test Strategy taxonomy を Test Level / Perspective / Execution・Platform・CI Gate に分離し、異なる軸を layer inventory に混在させない
- [x] D7. PR 1 の fact repair は E2E 件数や Seed Version の単純な値置換ではなく、volatile duplicate を減らし SSOT を参照する方針へ修正する。CHANGELOG の履歴行は書き換えない
- [x] D8. Competency / Curriculum の中間状態でも navigation / specialization boundary / validator が矛盾しない transition contract を明記する
- [x] D9. Phase 0 の別 child Plan と Pilot を必須実装タスクにする構成を簡素化し、Phase 0 は Master Plan 内 Matrix の再検証、Pilot は follow-up として扱う
- [x] D10. Stable Risk ID と Refactoring evidence の必須項目を再検討し、必要性が未証明の新しい管理契約や主観的指標を増やさない
- [x] D11. Remediation Matrix の `fix` Finding は Primary Owner を1つに固定し、複数 PR が関与する場合は Verification / Follow-up を分離して DoD の一意 owner 契約と一致させる
- [x] D12. Master Plan を Phase 0 / child PR の正本として使うため、Master Plan publication gate と、各 child branch の base / Matrix update ルールを明記する
- [x] D13. PR #53 の次工程と依存関係に合わせ、Test Strategy / Traceability を Curriculum depth 変更より先に実施する順序へ再整理し、不要な手戻りを避ける
- [x] D14. RA-G4 の canonical Native learner exercise entry を明示し、既存 serial / cleanup / Maestro invocation を重複実装せず再利用する最小方針を PR 5 に固定する
- [x] D15. Refactoring Necessity Review の依存を PR 1〜5 全完了から外し、Formal Test Strategy が確定した後に Training Evidence と並行可能な review-only phase として扱う
- [x] D16. PR order / 実行タスク / 優先順位の重複表現を減らし、実行順序の正本を1つに寄せて Plan 内 drift を防ぐ
- [x] D17. RA-M7 の separate hotfix branch / Run を廃止し、Master Plan branch の同一PRへ required path の最小CI unblockerを統合して、CI循環と active Run 分散を同時に避ける
- [x] D18. active Run Artifact の古い TASKS / Remaining / Scope を最新 Master Plan と意味上整合させ、REPORT は append-only で review / repair 結果を追記する
- [x] D19. PR 5 の Web / Native 共通契約に Desktop learner exercise の canonical `training:web:exercise` を追加し、Mobile command・stock exercise・CI competency gate の境界を明確にする
- [x] D20. PR 3 で Decision B を正本化した直後に Required / specialization の中間矛盾を残さないよう、P1-7 / P1-9 / P2-6 / P2-8 の境界 wording だけ PR 3 へ移し、深さ・構造調整は PR 4 に残す
- [x] D21. Master Plan の変更対象 path に残る `00_learning_design.md` 誤表記を canonical `00_learning-design.md` へ統一し、validator の現状誤りを説明する literal だけ underscore を残す
- [x] D22. active Run を `completed` / 100% のまま Step 0 継続する矛盾を解消し、Step 0 実装・Validation・CI を未完了 task として追跡する
- [x] D23. Phase 6 freshness check で既存関連pathの変更だけでなく、current `main` で direct caller / dependency discovery を再実行し、新規callerの増減も検出する
- [x] D24. Phase 6 decision-only PR は本 Master Plan を直接使用し、scope が変わらない限り追加 child Plan を作らないことを明記する

## Blocked

- なし

Progress: 91% (29/32)
