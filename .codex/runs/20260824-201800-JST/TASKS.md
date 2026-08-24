# Tasks

## Now

- [x] 1. PR #53 の merge と `main` HEAD を確認する
- [x] 2. Repository の planning rule / template / current validation entry を確認する
- [x] 3. `main` から計画用 branch を作成する
- [x] 4. Report Findings を依存関係順に整理した Master Plan を `docs/plans/` に保存する
- [x] 5. Run Artifact を保存し、Plan-only task として完了状態を記録する

## Discovered

- [x] D1. Decision B が Curriculum の Learner Required boundary のみを変更し、Formal Native Product Gate を変更しないガードレールを Master Plan に追加する
- [x] D2. Audit baseline から `main` が進んでいるため、各 child PR の前に Current `main` 再検証 Phase を追加する
- [x] D3. Refactoring candidate は size 単独で実装せず、追加 Evidence に基づく Necessity Review を先行させる
- [ ] D4. Master Plan 内の誤った `docs/08_testing/requirements_traceability.md` / `acceptance_criteria.md` 参照を、実在する `docs/12_quality/` 配下へ修正する
- [ ] D5. Audit / Curriculum の全 Finding を Phase / PR / disposition へ一対一で割り当てる remediation matrix を Master Plan に追加する
- [ ] D6. PR 4 の Test Strategy taxonomy を Test Level / Perspective / Execution・Gate boundary に分離し、異なる軸を layer inventory に混在させない
- [ ] D7. PR 1 の fact repair は E2E 件数や Seed Version の単純な値置換ではなく、volatile duplicate を減らし SSOT を参照する方針へ修正する。CHANGELOG の履歴行は書き換えない
- [ ] D8. PR 2 → PR 3 の中間状態でも Curriculum navigation / specialization boundary / validator が矛盾しない transition contract を明記する
- [ ] D9. Phase 0 の別 child Plan と Pilot を必須実装タスクにする構成を簡素化し、Phase 0 は本 Master Run 内の再検証、Pilot は follow-up として扱う
- [ ] D10. Stable Risk ID と Refactoring evidence の必須項目を再検討し、必要性が未証明の新しい管理契約や主観的指標を増やさない

## Blocked

- なし
