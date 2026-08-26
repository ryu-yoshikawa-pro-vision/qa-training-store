# Tasks

## Now

- [x] 1. PR #53 の merge と `main` HEAD を確認する
- [x] 2. Repository の planning rule / template / current validation entry を確認する
- [x] 3. `main` から計画用 branch を作成する
- [x] 4. Report Findings を依存関係順に整理した Master Plan を `docs/plans/` に保存する
- [x] 5. Master Plan を、前提・実施内容・Validation・停止条件だけで理解できる実行用文書へ整理する
- [ ] 6. Step 0 として RA-M7 の `scripts/validate-curriculum.ts` required path を最小修正し、Run Artifact を実状態へ更新する
- [ ] 7. `validate:curriculum` / `test:contracts` / `typecheck` / format / markdown / Sanitizer Write・Check を実行し、結果を Run Artifact へ記録する
- [ ] 8. 最終 diff を確認し、Step 0 scope 内で PR 作成可能な状態を確定する
- [ ] 9. Master Plan publication PR を作成する
- [ ] 10. PR-triggered CI / review / bounded repair を完了し、final PR head で Run Artifact を最終化して merge-ready を確認する

## Discovered

- [x] D1. Decision B が Curriculum の Learner Required boundary のみを変更し、Formal Native Product Gate を変更しないガードレールを Master Plan に追加する
- [x] D2. Audit baseline から `main` が進んでいるため、各 child PR の前に Current `main` 再検証 Phase を追加する
- [x] D3. Refactoring candidate は size 単独で Refactor 対象にせず、追加 Evidence に基づく Necessity Review を先行させる
- [x] D4. Master Plan 内の誤った `docs/08_testing/requirements_traceability.md` / `acceptance_criteria.md` 参照を、実在する `docs/12_quality/` 配下へ修正する
- [x] D5. Audit / Curriculum の全 Finding を Phase / PR / disposition へ一対一で割り当てる Remediation Matrix を Master Plan に追加する
- [x] D6. Test Strategy taxonomy を Test Level / Perspective / Execution・Platform・CI Gate に分離する
- [x] D7. PR 1 の fact repair を値の単純置換ではなく SSOT 参照を優先する方針へ修正し、Historical CHANGELOG を書き換えない
- [x] D8. Competency / Curriculum の中間状態でも Required / specialization boundary が矛盾しない transition contract を明記する
- [x] D9. Phase 0 の別 child Plan と Pilot の必須化を外し、Phase 0 は Current `main` 再検証、Pilot は follow-up とする
- [x] D10. Stable Risk ID と Refactoring evidence の必須項目を必要最小限へ限定する
- [x] D11. Remediation Matrix の `fix` Finding は Primary owner を1つに固定し、Follow-up verification と分離する
- [x] D12. Master Plan publication gate と child branch の base / Matrix update rule を明記する
- [x] D13. Formal Test Strategy / Traceability を Curriculum depth 変更より先に実施する順序へ整理する
- [x] D14. Native learner exercise の canonical entry を PR 5 に固定し、既存 runner / serial / cleanup / Maestro invocation を再利用する
- [x] D15. Refactoring Necessity Review を PR 2 merge 後に PR 3〜5 と並行可能にする
- [x] D16. PR order / 実行順序の重複表現を減らし、単一の execution order に寄せる
- [x] D17. RA-M7 を別 hotfix branch / Run に分けず Master Plan branch で最小修正する
- [x] D18. active Run Artifact の古い TASKS / Remaining / Scope を最新実行方針へ整合する
- [x] D19. PR 5 に Desktop learner exercise の canonical `training:web:exercise` を追加する
- [x] D20. PR 3 で P1-7 / P1-9 / P2-6 / P2-8 の Required / specialization boundary wording だけ同期し、depth調整は PR 4 に残す
- [x] D21. Master Plan の canonical Learning Design path を `00_learning-design.md` へ統一する
- [x] D22. Step 0 未実施の間は active Run を未完了として追跡する
- [x] D23. Phase 6 freshness check で Current `main` の関連 consumer / dependency / reference surface の増減を再確認する
- [x] D24. Phase 6 decision-only PR は scope が変わらない限り本 Master Plan を直接使用する
- [x] D25. Master Plan と Run `PLAN.md` から review history / hypothesis / thinking log を除き、実施事項だけで理解できる構成へ整理する
- [x] D26. Step 0 を RA-M7 最小修正 + local validation + Sanitizer + PR-ready 確認までに限定し、PR作成 / GitHub CI / merge を後続工程へ分離する
- [x] D27. Run manifest は `task_type: plan` を維持し、最終 status は Repository convention の `complete` を使用する
- [x] D28. Remediation Matrix を live status tracker ではなく Planned disposition / Primary owner の実行割当表へ限定する
- [x] D29. active Run は Master Plan publication PR の final head が merge-ready になった時点で完了し、merge 後に Run Artifact を追加更新しない契約へ変更する
- [x] D30. RA-L1 は Phase 0 で影響を判定し、修正が必要な場合だけ PR 4 scope へ追加する契約を明記する
- [x] D31. Master Plan に Assumptions / Safe change surface / Unknowns を追加し、Current understanding と推測・未確定事項を分離する
- [x] D32. PR 4 に reviewability / semantic safety に基づく PR 4A / PR 4B 分割条件を追加する
- [x] D33. PR 4 child Plan に Terminology Decision Table を必須化し、日本語 / 英語の判断差を局所的に固定する
- [x] D34. Final Fresh Learner Review を新規 Agent / Session優先の fresh context で実施し、結果を final-validation Run Artifact に記録する契約を追加する
- [x] D35. Fresh Learner Review の P0 / P1 は latest `main` から bounded repair し、Fresh context で再実行する修正フローを追加する
- [x] D36. RA-M8 の learner-facing canonical grammar を `training/workbook/README.md`、executable contract を validator に寄せ、bounded contract check と非canonical例検索を追加する
- [x] D37. Master Plan 全体の Learning Design canonical path を `00_learning-design.md` に再統一し、underscore表記をRA-M7のbroken validator literalだけに限定する
- [x] D38. `docs/spec/**` の実変更は軽微でも必ずPR 4Bへ分離し、PR 4AではSpec監査だけを行う契約へ単純化する
- [x] D39. `docs/spec/**` のMarkdown / text contract全件を監査対象へ拡張し、Glossary / Template / Product Scope等の非Feature文書も含める
- [x] D40. Terminology Decision Tableから抽出した安定ルールを既存Curriculum正本と`docs/spec/glossary.md` / 必要なtemplateへ最小反映する再発防止契約を追加する
- [x] D41. PR 4BはPR 4A merge後の最新`main`から作成する順序へ固定し、stacked PRを使わない
- [x] D42. PR 5 merge後にFinal Fresh Learner Review専用の新規read-only Runを作り、P0/P1修正を別bounded repair Run / branchへ分離する

## After Run

- Master Plan publication PR の merge は、Run 完了後にユーザーの明示承認を受けて実施する。
- merge 後は GitHub PR を merge 状態の正本とし、Run Artifact を追加更新しない。
- `main` への反映確認後、最新 `main` から PR 1 を開始する。

## Blocked

- なし

Progress: 90% (47/52)
