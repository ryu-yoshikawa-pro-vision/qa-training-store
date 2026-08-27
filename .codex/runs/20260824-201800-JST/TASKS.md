# Tasks

## Now

- [x] 1. PR #53 の merge と `main` HEAD を確認する
- [x] 2. Repository の planning rule / template / current validation entry を確認する
- [x] 3. `main` から計画用 branch を作成する
- [x] 4. Report Findings を依存関係順に整理した Master Plan を `docs/plans/` に保存する
- [x] 5. Master Plan を、前提・実施内容・Validation・停止条件だけで理解できる実行用文書へ整理する
- [x] 6. Step 0 として RA-M7 の Current State（`scripts/validate-curriculum.ts` required path と contract testのdirect literal）を確認し、canonicalであることとsource／test変更不要を確定してRun Artifactを実状態へ更新する
- [x] 7. `validate:curriculum` / `test:contracts` / `typecheck` / format / markdown / Sanitizer Write・Check を実行し、結果を Run Artifact へ記録する
- [x] 8. 最終 diff を確認し、Step 0 scope 内で既存PR #61の次工程へ進める状態を確定する
- [x] 9. 既存の PR #61 を Master Plan publication PR として確認する（再作成しない）
- [x] 10. validated headのCI / review / mergeability / scopeを確認して結果をRun Artifactへ記録し、Task 10と`run.json.status`を完了状態へ更新してfinalization commitを作成・pushした後、finalization headのCI / review / mergeabilityをGitHub metadataで確認する（CI結果を書き戻すための追加commitは作成しない）

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
- [x] D17. RA-M7 を別 hotfix branch / Run に分けず Master Plan branch でCurrent State確認と必要時のみ最小修正を行う
- [x] D18. active Run Artifact の古い TASKS / Remaining / Scope を最新実行方針へ整合する
- [x] D19. PR 5 に Desktop learner exercise の canonical `training:web:exercise` を追加する
- [x] D20. PR 3 で P1-7 / P1-9 / P2-6 / P2-8 の Required / specialization boundary wording だけ同期し、depth調整は PR 4 に残す
- [x] D21. Master Plan の canonical Learning Design path を `00_learning-design.md` へ統一する
- [x] D22. Step 0 未実施の間は active Run を未完了として追跡する
- [x] D23. Phase 6 freshness check で Current `main` の関連 consumer / dependency / reference surface の増減を再確認する
- [x] D24. Phase 6 decision-only PR は scope が変わらない限り本 Master Plan を直接使用する
- [x] D25. Master Plan と Run `PLAN.md` から review history / hypothesis / thinking log を除き、実施事項だけで理解できる構成へ整理する
- [x] D26. Step 0 を RA-M7 Current State確認（mismatch時のみ最小修正）+ local validation + Sanitizer + PR-ready確認までに限定し、PR作成 / GitHub CI / mergeを後続工程へ分離する
- [x] D27. Run manifest は `task_type: plan` を維持し、最終 status は Repository convention の `complete` を使用する
- [x] D28. Remediation Matrix を live status tracker ではなく Planned disposition / Primary owner の実行割当表へ限定する
- [x] D29. validated headの結果記録後にRun Artifactをfinalizeしてstatus completeへ更新し、finalization headのCI / review / mergeabilityはGitHub PRをSSOTとして確認し、結果記録だけの再commitを作らない契約へ変更する
- [x] D30. RA-L1 は Phase 0 で影響を判定し、修正が必要な場合だけ PR 4 scope へ追加する契約を明記する
- [x] D31. Master Plan に Assumptions / Safe change surface / Unknowns を追加し、Current understanding と推測・未確定事項を分離する
- [x] D32. PR 4 に reviewability / semantic safety に基づく PR 4A / PR 4B 分割条件を追加する
- [x] D33. PR 4 child Plan に Terminology Decision Table を必須化し、日本語 / 英語の判断差を局所的に固定する
- [x] D34. Final Fresh Learner Review を新規 Agent / Session優先の fresh context で実施し、結果を final-validation Run Artifact に記録する契約を追加する
- [x] D35. Fresh Learner Review の P0 / P1 は latest `main` から bounded repair し、Fresh context で再実行する修正フローを追加する
- [x] D36. RA-M8 の learner-facing canonical grammar を `training/workbook/README.md`、executable contract を validator に寄せ、bounded contract check と非canonical例検索を追加する
- [x] D37. Master Plan全体のLearning Design canonical pathを`00_learning-design.md`へ再統一し、RA-M7のRepository Audit FindingとCurrent Stateを区別する
- [x] D38. `docs/spec/**` の実変更は軽微でも必ずPR 4Bへ分離し、PR 4AではSpec監査だけを行う契約へ単純化する
- [x] D39. `docs/spec/**` のMarkdown / text contract全件を監査対象へ拡張し、Glossary / Template / Product Scope等の非Feature文書も含める
- [x] D40. Terminology Decision Tableから抽出した安定ルールを既存Curriculum正本と`docs/spec/glossary.md` / 必要なtemplateへ最小反映する再発防止契約を追加する
- [x] D41. PR 4BはPR 4A merge後の最新`main`から作成する順序へ固定し、stacked PRを使わない
- [x] D42. PR 5 merge後にFinal Fresh Learner Review専用の新規read-only Runを作り、P0/P1修正を別bounded repair Run / branchへ分離する
- [x] D43. 自己学習の定義を「Instructor完全排除」ではなく、環境・権限・端末・Toolchain支援は許容し、学習内容・演習・自己確認・学習上のRecovery・完了判定をlearner-facingで完結させる契約へ固定する
- [x] D44. PR 3でRubric / Minimum EvidenceをLearnerの自己確認とInstructorの必要時評価で共通利用し、非公開採点基準をRequired completionから排除する
- [x] D45. PR 4AのRequired Curriculum監査へSelf-study completenessを追加し、Instructor ReferenceにしかないRequired learning contentをlearner-facingへ戻す契約を追加する
- [x] D46. PR 5 / Final Fresh Learner Reviewで機械確認できる結果のself-checkと、Environment / Toolchain supportとlearning-content supportの切り分けを検証する
- [x] D47. `Repository-required curriculum asset` と `Learner Required path` を分離し、Instructor ReferenceをRepository-required support assetだがLearner Required pathではないと固定する
- [x] D48. Final Fresh Learner ReviewのTarget learner profileを、手動テスト経験は許容・プログラミング / Playwright / Maestro / Git / CIの未説明知識は前提にしない条件へ固定する
- [x] D49. Fresh Learner ReviewでCommon Core Required exerciseがEnvironment blockにより未実行なら、P0/P1が0件でも`PASS`にせず`not_validated`とする結果契約を追加する
- [x] D50. Self-checkをgenericな参照先提示ではなく、回答・成果物の充足をLearner自身が合理的に判定できる具体性へ引き上げ、知識問題・設計問題・Spec参照の最低条件を明記する

## After Run

- Master Plan publication PR の merge は、Run 完了後にユーザーの明示承認を受けて実施する。
- merge 後は GitHub PR を merge 状態の正本とし、Run Artifact を追加更新しない。
- `main` への反映確認後、最新 `main` から PR 1 を開始する。

## Blocked

- なし

Progress: 100% (60/60)
