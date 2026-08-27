# Report (append-only)

## 2026-08-24 20:18 (JST)

- Summary:
  - PR #53 の merge を確認し、merge 後 `main` から Master Plan 用 branch を作成した。
  - Report Findings を一括修正せず、Fact Drift → Decision / Competency → Curriculum → Test Strategy / Traceability → Training Evidence → Refactoring Review の順に分離した。
- Completed:
  - PR #53 merge 確認。
  - `main` HEAD 確認。
  - Plan template / planning rule / package validation entry の確認。
  - branch `plan/curriculum-test-strategy-remediation-master` 作成。
  - `docs/plans/2026-08-24_201800_curriculum_test_strategy_remediation_master.md` 保存。
- Changes:
  - Master Plan では Decision B を前提とし、Native specialization 化が Curriculum Learner Required boundary のみに作用することを明示した。
  - Refactoring は追加 Evidence による Necessity Review 後に限定した。
- Commands / Evidence:
  - GitHub PR #53 => merged at 2026-08-24 20:17 JST。
  - `main` => `74834bf9ac859db5d9aec1f34bd8c6337f4698c8`。
  - `docs/plans/TEMPLATE.md` => Repository planning template を確認。
  - `package.json` => `lint:markdown` / `validate:curriculum` / `test:contracts` / Training validation entry を確認。
- Notes/Decisions:
  - Decision B: 共通卒業像は entry-level の汎用 Test Automation Engineer。
  - C08 / Physical Android / Native CI / Native Capstone は specialization。
  - Product Formal Native Regression / Android Runtime / iOS Build-only Gate は変更対象外。
  - 各 child PR 開始時に Current `main` で Finding を再検証する。
- Validation:
  - Plan-only task のため Product / Test suite は未実行。
  - GitHub connector 経由の作成であり、local `sanitize-codex-artifacts.ps1` / markdownlint は未実行。
  - 作成内容には local absolute path / credential / secret を含めていない。
- Remaining:
  - なし。次工程は Phase 0 child Plan の作成。
- Progress: 100% (8/8)

## 2026-08-24 20:38 (JST)

- Summary:
  - Master Plan を review workflow に従って再レビューした。
  - 方向性、Decision B のガードレール、Fact → Contract → Curriculum → Strategy → Training → Refactoring の順序は妥当。
  - 実装開始前に修正すべき具体的な不足と過剰設計候補を確認した。
- Completed:
  - `CODE_REVIEW.md` / code-review skill / review workflow / Coding Standards を確認。
  - Master Plan 全文を分割取得して review。
  - Current curriculum validator / training contract test / Rubric / Test Strategy / E2E Design / Seed SSOT / CHANGELOG / docs directory を照合。
  - Audit / Curriculum durable report の Finding と Master Plan の coverage を照合。
- Findings:
  - High: `docs/08_testing/requirements_traceability.md` / `acceptance_criteria.md` は実在せず、正しい path は `docs/12_quality/` 配下。
  - High: 全 Finding を child PR / disposition へ一対一で割り当てる matrix がなく、Native failure exercise、Legacy Capstone mismatch、CUR-L1 などが実装時に落ちる余地がある。
  - Medium: PR 4 が Test Level、Perspective、Training boundary、Platform guarantee、CI Gate を単一 layer inventory に混在させている。
  - Medium: PR 1 が E2E 件数や Seed Version を単純更新すると同種 drift を再発させる。volatile duplicate は可能な限り SSOT 参照へ寄せ、CHANGELOG の過去 entry は書き換えない。
  - Medium: PR 2 → PR 3 の中間状態で Rubric / navigation / Native specialization / validator が一貫する transition contract が不足。
  - Medium: Phase 0 専用 child Plan は Master Plan と重複しやすく、Pilot は repository remediation の main execution task から follow-up へ外せる。
  - Low/Medium: Stable Risk ID を必須解決策として先に固定せず、最小 Traceability に必要な場合だけ採用する。Refactoring の cognitive cost は補助 Evidence とし必須測定にしない。
- Evidence:
  - `docs/08_testing/` は `e2e_design.md` / `test_strategy.md` のみ。
  - `docs/12_quality/` に `requirements_traceability.md` / `acceptance_criteria.md` が存在。
  - `src/config/versions.ts` の `SEED_VERSION = 11` に対し `seed_catalog.md` は9、`CHANGELOG.md` v15 は履歴として10を記録。
  - Current validator は22文書をRequired assetとして存在確認し、Native Lesson / physical routeのtokenも検証している。
  - Current `test_strategy.md` の Test Level table は Test Level中心であり、追加するPerspective / Platform / Gateは別軸として表現した方が明確。
- Decision:
  - Verdict: Changes required before implementation。
  - Master Plan 本体は review-only のためこの時点では変更しない。
  - 修正項目を TASKS.md の D4〜D10 として記録した。
- Remaining:
  - D4〜D10 を Master Plan に反映して再レビューする。
- Progress: 53% (8/15)

## 2026-08-24 20:46 (JST)

- Summary:
  - Review finding D4〜D10 を Master Plan へ反映した。
  - 設計思想は維持し、誤参照・Finding tracking・taxonomy・SSOT・PR transition・Plan 階層・Refactoring criteria を簡素化・具体化した。
- Completed:
  - `requirements_traceability.md` / `acceptance_criteria.md` の path を `docs/12_quality/` へ修正。
  - Audit / Curriculum Finding を追跡する Remediation Matrix を Master Plan 内へ追加。
  - Phase 0 は別 child Plan を作らず、Remediation Matrix の Current `main` 再検証で完了する構成へ変更。
  - PR 1 に volatile fact / executable SSOT / Seed SSOT / CHANGELOG history の扱いを明記。
  - PR 2 に Native canonical asset と common graduation Required を分離する transition contract を追加。
  - PR 4 を Test Level / Test Perspective / Execution・Platform・CI Gate の3軸へ整理。
  - Stable Risk ID は必要な場合だけ導入する方針へ変更。
  - Native failure exercise は対称性だけで実装せず、Minimum Evidence に必要な場合だけ最小実装する方針へ変更。
  - Refactoring の中核 Evidence を churn / defect・repair / blast radius / test protection・boundary へ限定し、cognitive cost は補助 Evidence に変更。
  - Pilot は Repository remediation の必須タスクから Follow-up へ移動。
- Decisions:
  - Finding の状態管理は Master Plan の Remediation Matrix を唯一の追跡表とし、新しい管理 DB / spreadsheet は作らない。
  - PR 1〜5 は各 PR 単体で正本の矛盾を残さず green にできる scope とする。
  - Historical CHANGELOG entry は Current version へ書き換えない。
  - Legacy P1 Capstone は Required navigation へ漏れていなければ修正しない方向を第一候補とする。
- Validation:
  - Plan / Run Artifact の文書変更のみ。Product / Test / Workflow は未変更。
  - GitHub connector 経由の更新のため local markdownlint / sanitizer は未実行。
  - 変更対象は Master Plan と既存 Run Artifact のみ。
- Remaining:
  - Master Plan の再レビュー。
- Progress: 100% (15/15)

## 2026-08-24 21:08 (JST)

- Summary:
  - 修正版 Master Plan を review workflow で再度徹底レビューした。
  - 前回 D4〜D10 は概ね解消されたが、Matrix 運用と実行順序に新たな実装時 ambiguity / over-serialization を確認した。
- Completed:
  - `AGENTS.md`、修正版 Master Plan 全文、Current Native Training runner / exercise YAML / Training Native workflow を照合。
  - Remediation Matrix、DoD、各 PR Exit criteria、execution order、Refactoring dependency を相互確認。
- Findings:
  - High: DoD は `fix` Finding の担当 PR / Phase が一意であることを要求する一方、Matrix は `PR 2 / PR 3`、`PR 2 / PR 5` 等の複数 Owner を持ち、完了責任が一意でない。
  - High: Remediation Matrix を唯一の正本として PR 完了ごとに更新する設計だが、Master Plan 自身を main へ先に publish / merge する gate と、child branch の base / Matrix update rule が未定義。
  - Medium: PR #53 の Next step は Test Strategy / Test Perspective Review だが、Current order は Decision / Competency と Curriculum depth を先に進め、Formal Strategy を後置している。C05 / C12 等の再作業余地がある。
  - Medium: RA-G4 は direct Native learner exercise entry / Artifact boundary を `fix` としているが、PR 5 は direct entry 追加を「必要な場合だけ」と残している。Current package は `training:native:baseline` のみ、runner は baseline YAML / output name を hardcode、exercise YAML は存在するが canonical command がない。
  - Medium: Refactoring Necessity Review は churn / failure / blast radius 等を根拠にする review-only phaseであり、Training Evidence 完了まで待つ依存は不要。Formal Test Strategy 確定後に並行可能。
  - Low/Medium: PR order table、実行タスク、優先順位が同じ順序情報を重複保持しており、今後の reorder で Plan 内 drift を起こしやすい。
- Evidence:
  - Master Plan DoD: `fix` Finding は担当 PR / Phase が一意とする。
  - Matrix: CUR-H1 / M2 / M3 / M5 / M7 / M8 等は複数 Owner、RA-L1 は Phase 0 / PR 3。
  - `scripts/training/run-maestro-baseline.ts` は `native-training-baseline.yaml` と `training-native-baseline.xml` を固定。
  - `training/maestro/exercises/native-training-exercise.yaml` は存在するが、Current package / workflow は baseline のみを canonical 実行入口として持つ。
  - `training/github-actions/training-native-ci.yml` は `pnpm run training:native:baseline` のみを実行する。
- Decision:
  - Verdict: Changes required before implementation。
  - Master Plan 本体は review-only のため変更せず、D11〜D16 を TASKS.md に追加した。
- Remaining:
  - D11〜D16 を Master Plan に反映し、再レビューする。
- Progress: 71% (15/21)

## Deletion candidates

なし。

## 2026-08-24 22:31 (JST)

- Summary:
  - 最新 Master Plan と Repository rule / active Run Artifact / Training Web contract を再確認し、残っていた3 finding を bounded repair で反映した。
  - RA-M7 の separate hotfix branch / Run を廃止し、Master Plan branch の同一PRへ最小CI unblockerを統合する方針へ簡素化した。
  - active Run Artifact の古い未完了状態を最新 Master Plan へ整合させ、PR 5 に Web Desktop learner exercise の canonical command を追加した。
- Input Findings:
  - must_fix: RA-M7 separate hotfix branch が active Run reuse contract と衝突し、運用を複雑化する。
  - must_fix: `TASKS.md` の D11〜D16 と `REPORT.md` Remaining が Master Plan の現状より古い。
  - should_fix: PR 5 の Web / Native 共通契約に Desktop learner exercise の canonical `training:web:exercise` がない。
- Repair Plan / Allowed Files:
  - `docs/plans/2026-08-24_201800_curriculum_test_strategy_remediation_master.md`
  - `.codex/runs/20260824-201800-JST/PLAN.md`
  - `.codex/runs/20260824-201800-JST/TASKS.md`
  - `.codex/runs/20260824-201800-JST/REPORT.md`
  - Product / Curriculum / Training implementation は変更しない。
- Completed:
  - Master Plan の Step 0 を `Master Plan + RA-M7 CI unblocker PR` へ一本化し、別 branch / 別 Run / 先行 hotfix PR を削除した。
  - RA-M7 Primary owner を `Master Plan + RA-M7 CI unblocker PR` へ変更した。
  - Step 0 に active Run Artifact の意味上整合を Sanitizer より前に実施する手順を追加した。
  - Step 0 Validation に `validate:curriculum` / `test:contracts` / `typecheck` / format / markdown / Sanitizer / required CI を統合した。
  - PR 5 に `training:web:exercise` を `training/playwright/exercises` + `training-chromium` の canonical Desktop learner command として追加した。
  - stock Web exercise PASS を competency evidence とみなさず、Web Training CI への learner exercise Required化は C07 Minimum Evidence 上必要な場合だけとした。
  - D11〜D16 を完了へ更新し、D17〜D19 を追加・完了した。
  - Run `PLAN.md` の Scope / Approach / DoD / Risks を最新 Master Plan と整合させた。
- Validation:
  - この repair iteration は planning / Run Artifact の文書修正のみ。
  - `scripts/validate-curriculum.ts` の RA-M7 実修正はまだ実施していない。Master Plan の Step 0 で同一PRへ追加する。
  - `pnpm run validate:curriculum` / `test:contracts` / `typecheck` / `format:check` / `lint:markdown` / Sanitizer Write・Check はまだ未実行。
  - GitHub connector 上の文書更新のみ確認した。
- Remaining:
  - 設計修正の残差はなし。
  - merge readiness の次工程は、Step 0 の RA-M7 required path 最小修正 → Run Artifact Sanitizerを含むValidation → required CI → PR作成・merge。
- Decision:
  - repair loop decision: `stop_success`。
  - これ以上の設計追加は行わず、次は merge readiness / Step 0 execution へ移る。
- Progress: 100% (24/24)

## 2026-08-25 07:02 (JST)

- Summary:
  - 「本当に問題ないか」の再レビューで、前回の `stop_success` 判定後にも5件の実装時矛盾が残っていたことを確認し、Master Plan / active Run Artifact を再修正した。
  - PR 3でDecision Bを正本化した直後にNative Required wordingが残る中間矛盾を解消するため、P1-7 / P1-9 / P2-6 / P2-8のRequired境界だけをPR 3へ移した。
  - active RunはStep 0未実施のため再度pending状態に戻し、Phase 6はcurrent `main`でcaller / dependencyを再発見するfreshness契約へ補強した。
- Input Findings:
  - must_fix: PR 3でRubric等をspecialization化しても、P1-7 / P1-9 / P2-6 / P2-8がNative RequiredのままだとPR 4まで正本が矛盾する。
  - must_fix: Master Planの変更対象pathに実在しない `00_learning_design.md` が残っている。
  - must_fix: `TASKS.md` / `run.json`がcompleted / 100%なのに同じRunでStep 0を続ける契約になっている。
  - should_fix: Phase 6 freshness checkが初回に特定した関連pathだけでは後から追加された新規callerを見落とす。
  - should_fix: Phase 6 decision-only PRで追加child Planが必要かどうかが曖昧。
- Completed:
  - Master Planのcanonical変更対象pathを `00_learning-design.md` へ統一し、underscore表記はCurrent validator mismatchの説明に限定した。
  - PR 3へP1-7 / P1-9 / P2-6 / P2-8のRequired / specialization boundaryとcompletion wordingの最小同期を追加した。
  - PR 4はPR 3の境界を再設計せず、Lesson depth / Core / Extension / Reference整理だけを担当する契約へ変更した。
  - Phase 6でPR作成前・merge直前にcurrent `main`のdirect caller / dependency discoveryを再実行し、集合が増減したcandidateだけ再評価する契約を追加した。
  - Phase 6 decision-only PRは本Master Planを直接使用し、inventory / Evidence criteria / output scopeが変わる場合だけ別Planへ切り出すことを明記した。
  - `TASKS.md`へStep 0 implementation / Validation / required CIの未完了taskを追加し、review finding D20〜D24を完了記録した。
  - `PLAN.md`を最新Master Planへ合わせ、Step 0開始時の`run.json`更新契約を追加した。
  - `run.json.status`を`pending`へ戻し、Step 0未実施であることをwarningへ明記した。
- Validation:
  - 今回はplanning / Run Artifactの修正のみであり、Product / Curriculum / Training実装コードは変更していない。
  - `scripts/validate-curriculum.ts` のRA-M7実修正はまだ未実施。
  - `pnpm run validate:curriculum` / `test:contracts` / `typecheck` / `format:check` / `lint:markdown` / Sanitizer Write・Check / Repository required CI はまだ未実行。
- Remaining:
  - Step 0: RA-M7 required pathの最小実修正。
  - Step 0 ValidationとSanitizer Write・Check。
  - Repository required CI / PR diff確認とmerge readiness確定。
- Decision:
  - Master Plan review / repair自体は完了したが、active Run全体は未完了。Step 0完了まで`stop_success` / `completed`へ戻さない。
- Progress: 91% (29/32)

## 2026-08-25 07:27 (JST)

- Summary:
  - Master Plan と active Run `PLAN.md` を、過去のレビュー経緯や思考過程ではなく、実装者が単独で読んで実行できる内容へ整理した。
  - Step 0 を RA-M7 最小修正 + local validation + Sanitizer + PR-ready 確認までに限定し、PR作成 / GitHub CI / review / merge を後続工程へ分離した。
  - Run manifest の metadata を Repository convention に合わせた。
- Completed:
  - Master Plan を Goal / Current facts / Fixed decisions / Scope / Matrix / Execution order / 各PRの Actions / Validation / Stop conditions / DoD の構成へ全面整理した。
  - Master Plan から review history、hypothesis、thinking log、会話依存の説明を除去した。
  - Run `PLAN.md` を Step 0 の実行手順だけで理解できる内容へ書き直した。
  - `TASKS.md` で Step 0 と Master Plan publication PR の工程を分離した。
  - `run.json.task_type` を `plan` に修正し、Step 0開始時にも変更しない契約へ統一した。
  - 最終 status は Repository convention の `complete` を使用することを明記した。
- Validation:
  - 今回は Plan / Run Artifact の文書修正のみ。
  - RA-M7 の実コード修正と local validation はまだ未実施。
  - `pnpm run validate:curriculum` / `test:contracts` / `typecheck` / `format:check` / `lint:markdown` / Sanitizer Write・Check は未実行。
- Remaining:
  - Step 0: RA-M7 required path の最小修正。
  - Step 0 local validation / Sanitizer / PR-ready diff確認。
  - Master Plan publication PR 作成 / PR CI / review / merge。
- Progress: 84% (32/38)

## 2026-08-25 08:31 (JST)

- Summary:
  - 最新レビューで残った3点だけを修正し、Master Plan と active Run の状態管理を簡素化した。
  - Remediation Matrix を live status tracker から実行割当表へ変更した。
  - active Run の完了境界を Master Plan publication PR の merge-ready 時点へ変更した。
- Completed:
  - Matrix は Planned disposition / Primary owner / Follow-up verification だけを定義し、進捗・resolved状態を保持しない契約へ変更した。
  - 各 PR / Phase の実際の対応結果は child Plan / PR / Phase 6 durable report / Run Artifact で記録する方針へ統一した。
  - Phase 0 は Finding の存否と owner 妥当性の再確認に限定し、後続 owner で Evidence が必要な Finding を Phase 0 だけで最終判断しないよう修正した。
  - RA-L1 の Primary owner を PR 4 とし、Phase 0 では Required navigation / completion への影響だけ判定する契約に変更した。
  - Run は final PR head の CI / review が green で merge-ready になった時点で `complete` とし、merge 後に Run Artifact を追加更新しない契約へ変更した。
  - Master Plan publication PR の merge は Run 完了後にユーザーの明示承認を受けて実施し、merge状態は GitHub PR を正本とするよう明記した。
  - D28〜D30 を追加・完了し、Now task は merge-ready までに限定した。
- Validation:
  - 今回は Master Plan / Run Artifact の文書修正のみ。
  - Product / Curriculum / Training implementation は変更していない。
  - RA-M7 の実コード修正、local validation、Sanitizer、PR CI はまだ未実施。
- Remaining:
  - Step 0: RA-M7 required path の最小修正。
  - local validation / Sanitizer / PR-ready diff確認。
  - Master Plan publication PR 作成 / final head CI / review / merge-ready確認。
- Progress: 88% (35/40)

## 2026-08-26 13:20 (JST)

- Summary:
  - 2026-08-26 の Master Plan 再レビューで残った6 finding を bounded repair した。
  - 既存の PR 1〜5 / Phase 6 構造と Decision B は維持し、実装境界・レビュー可能性・Fresh Learner検証の曖昧さだけを解消した。
- Input Findings:
  - should_fix: PR 4 が Curriculum structure / terminology / Specification editorial を単一巨大diffへ集約し得る。
  - should_fix: Repository planning rule が要求する Assumptions / Safe change surface / Unknowns が Master Plan で明示されていない。
  - should_fix: 日本語 / 英語統一の判断が実装者ごとに揺れ得る。
  - should_fix: Final Fresh Learner Review が既存設計知識で補完される可能性があり、fresh context と結果記録先が未定義。
  - should_fix: Fresh Learner Review で P0 / P1 が見つかった場合、merge済みPRへ戻れないのに repair flow が曖昧。
  - should_fix: RA-M8 の一回修正後に Test Case ID grammar drift が再発し得る。
- Repair Plan / Allowed Files:
  - `docs/plans/2026-08-24_201800_curriculum_test_strategy_remediation_master.md`
  - `.codex/runs/20260824-201800-JST/PLAN.md`
  - `.codex/runs/20260824-201800-JST/TASKS.md`
  - `.codex/runs/20260824-201800-JST/REPORT.md`
  - `.codex/runs/20260824-201800-JST/run.json`
  - Product / Curriculum / Training implementation、RA-M7実コードは今回変更しない。
- Completed:
  - Master Plan の Current understanding 配下へ Assumptions / Safe change surface / Unknowns を追加した。
  - PR 4 に Pre-change audit 後の split rule を追加し、必要な場合だけ PR 4A（Curriculum）/ PR 4B（semantics-preserving Specification editorial）へ分割する契約にした。
  - PR 4 child Plan に実際に揺れている用語だけの Terminology Decision Table を追加し、新しい permanent glossary は作らない方針にした。
  - RA-M8 は `training/workbook/README.md` を learner-facing grammar、validator を executable contract として揃え、bounded contract check と非canonical例検索を追加した。
  - Final Fresh Learner Review は新規 Agent / Session を優先する fresh context で README から開始し、final-validation Run の `REPORT.md` へ結果を記録する契約にした。
  - Fresh Learner Review の P0 / P1 は latest `main` から bounded repair branch で修正し、merge後に fresh context で README から再実行する契約にした。
  - 同じ blocker の反復や新しいEvidenceなしの再試行は `docs/reference/repair-loop.md` の停止条件へ接続した。
  - `PLAN.md` / `TASKS.md` を今回の repair と整合させた。
- Validation:
  - 今回は Master Plan / Run Artifact の planning文書だけを変更した。
  - RA-M7 の実コード修正と `validate:curriculum` / `test:contracts` / `typecheck` / `format:check` / `lint:markdown` / Sanitizer Write・Check はまだ未実施。
  - Step 0 未完了のため active Run status は `pending` を維持する。
- Remaining:
  - Step 0: RA-M7 required path の最小実修正。
  - Step 0 local validation / Sanitizer / PR-ready diff確認。
  - Master Plan publication PR 作成 / final head CI / review / merge-ready確認。
- Decision:
  - review finding repair は完了。active Run全体は未完了のため `stop_success` / `complete` にはしない。
- Progress: 89% (41/46)

## 2026-08-26 14:07 (JST)

- Summary:
  - 最新の徹底レビューで確認した6 findingを、既存Master Planの構造を維持したまま修正した。
  - canonical path、Specification audit / edit境界、用語ルールの再発防止、PR 4A→4B順序、Final Fresh Learner Review Run境界を具体化した。
- Input Findings:
  - must_fix: canonical Learning Designは`00_learning-design.md`なのに、Master PlanのCurrent understanding / Candidate filesで`00_learning_design.md`が再登場していた。
  - should_fix: PR 4Aで軽微な`docs/spec/**`変更を許す一方、PR 4A validationに`validate:spec`がなく、Specification変更境界が不整合だった。
  - should_fix: Specification auditがCurriculumから直接参照するFeature spec中心で、Glossary / Product Scope / Role / State / UI-UX / Template等が漏れていた。
  - should_fix: Terminology Decision Tableが一時判断だけで終わり、将来の表記揺れ再発防止ルールが既存正本へ残らない。
  - should_fix: PR 4A / PR 4Bに分割した場合のbranch順序が未定義だった。
  - should_fix: Final Fresh Learner Review用のRun生成・read-only責務・repair Run境界が未定義だった。
- Completed:
  - Master Plan全体のcanonical Learning Design pathを`docs/curriculum/test-automation/00_learning-design.md`へ再統一し、underscore表記はRA-M7のbroken validator literalだけに限定した。
  - `docs/spec/**`のMarkdown / text contract全件をPR 4Aのaudit対象へ拡張し、binary / image assetは内容監査対象外とした。
  - `docs/spec/**`に実変更が1件でも必要な場合は、軽微さに関係なくPR 4Bへ分離する単純な契約へ変更した。
  - PR 4BはPR 4A merge後の最新`main`から作成し、stacked PRを使わない順序へ固定した。
  - Terminology Decision Tableから将来も安定する最小ルールだけをCurriculum既存正本へ残し、Spec側は既存`docs/spec/glossary.md`と必要な`_templates/**`を利用する契約を追加した。
  - Final Fresh Learner ReviewはPR 5 merge後の最新`main`から専用の新規read-only Runを作り、P0/P1修正は別bounded repair Run / branchで実施する契約へ変更した。
  - TASKSへD37〜D42を追加し、今回のrepairを完了記録した。
- Validation:
  - 今回はMaster Plan / Run Artifactのplanning文書だけを変更した。
  - RA-M7の実コード修正、`validate:curriculum` / `test:contracts` / `typecheck` / `format:check` / `lint:markdown` / Sanitizer Write・Checkはまだ未実施。
  - Step 0未完了のためactive Run statusは`pending`を維持する。
- Remaining:
  - Step 0: RA-M7 required pathの最小実修正。
  - Step 0 local validation / Sanitizer / PR-ready diff確認。
  - Master Plan publication PRのfinal head CI / review / merge-ready確認。
- Decision:
  - review finding repairは完了。active Run全体は未完了のため`complete`にはしない。
- Progress: 90% (47/52)

## 2026-08-26 14:21 (JST)

- Summary:
  - Curriculumを受講者が自己学習できる品質にする前提をMaster Planへ反映した。
  - 自己学習をInstructor完全排除とは定義せず、環境・端末・アカウント・権限・演習Repository・Infrastructure / Toolchain支援は許容し、学習内容・演習・自己確認・学習上のRecovery・完了判定はlearner-facing materialで完結させる境界を固定した。
- Input Findings:
  - must_fix: Master Planの評価契約に`InstructorがC01〜C12を直接採点`する前提があり、Learner自身のself-check契約が弱かった。
  - must_fix: `03_instructor-reference.md`にFacilitation / 問い返し / Recovery観点があり、Required learning contentとの責務境界が未定義だった。
  - should_fix: Required Lessonの確認問題・設計演習に、Learner自身が正誤・十分性を確認する方法を必須化していなかった。
  - clarification: Instructor / 運営による環境準備やToolchain障害支援は許容し、排除対象にしない。
- Completed:
  - Goal / Assumptions / Fixed decisions / Non-goalsへself-study品質の境界を追加した。
  - `CUR-H5`としてInstructor依存のRequired learning content / self-check / learning Recoveryを、`CUR-M12`としてLearner self-checkとInstructor evaluationのEvidence契約不整合をMatrixへ追加した。
  - PR 3を、LearnerがRubric / Minimum Evidenceで自己確認でき、Instructorが必要な場合に同じ公開Evidenceで評価する契約へ修正した。
  - PR 4Aへ`Self-study completeness`監査を追加し、開始条件、演習、自己確認、Recovery、完了条件、次の行動をlearner-facing materialで確認する契約にした。
  - Instructor Referenceは削除せず、環境支援 / Facilitation / Troubleshooting / 最終フィードバックの補助に限定し、Required learning contentの唯一の正本にしない方針を明記した。
  - PR 5ではcommand / validator / Artifactで機械確認できる結果をLearnerが自己確認できる契約を追加し、新しいscoring engine / AI graderは作らない方針を維持した。
  - Final Fresh Learner ReviewでEnvironment / Toolchain supportとlearning-content supportを分離し、後者がRequired pathで必要ならP1 Findingとして扱うよう修正した。
  - TASKSへD43〜D46を追加し、Run `PLAN.md`を同じ境界へ整合した。
- Validation:
  - 今回はMaster Plan / Run Artifactのplanning文書だけを変更した。
  - Curriculum本体、Instructor Reference本体、Rubric本体、Training implementation、RA-M7実コードは変更していない。
  - `validate:curriculum` / `test:contracts` / `typecheck` / `format:check` / `lint:markdown` / Sanitizer Write・Checkはまだ未実行。
  - Step 0未完了のためactive Run statusは`pending`を維持する。
- Remaining:
  - Step 0: RA-M7 required pathの最小実修正。
  - Step 0 local validation / Sanitizer / PR-ready diff確認。
  - Master Plan publication PRのfinal head CI / review / merge-ready確認。
- Decision:
  - 自己学習品質の定義は、環境運用まで自己完結させる過剰設計を避けつつ、学習内容をInstructorの追加説明に依存させない境界で確定した。
- Progress: 91% (51/56)

## 2026-08-26 15:01 (JST)

- Summary:
  - 自己学習品質を再レビューし、残っていた4 findingをMaster Planへ反映した。
  - 新しい管理レイヤーは増やさず、Requiredの意味、Fresh Learnerの前提、Environment block時の結果、Self-checkの具体性だけを締めた。
- Input Findings:
  - should_fix: Validator上存在必須のcurriculum assetと、受講者が修了のために必ず辿るLearner Required pathが同じRequired表現で混同されていた。
  - should_fix: Fresh Learner Reviewが過去の修正経緯を知らないことは定義されていたが、対象者の知識レベルが未定義で、経験者が未説明知識を補完できた。
  - should_fix: Environment / Toolchain blockでRequired exerciseを未実行のままでも、P0 / P1が0件ならPASSできる余地があった。
  - should_fix: Self-checkがRubric / Spec / Referenceへのgeneric linkだけでも成立し得て、Learnerが自分の回答・成果物の充足を判定できない余地があった。
- Completed:
  - `Repository-required curriculum asset` と `Learner Required path` を定義し、`03_instructor-reference.md`はRepository-required support assetだがLearner Required pathではないと固定した。
  - PR 3でREADME / Learning Design / Validatorの役割を分離し、受講者必修navigationとInstructor支援資料を明確にする契約を追加した。
  - PR 4Aの監査対象をLearner Required pathとsupport asset境界へ整理し、Matrixに`CUR-H6` / `CUR-M13` / `CUR-M14`を追加した。
  - Self-checkはLearnerが学習目標の充足を合理的に判定できる具体性を必須とし、知識問題、設計問題、Specification参照の最低条件を明記した。
  - Final Fresh Learner ReviewにTarget learner profileを追加し、手動テスト経験は許容する一方、プログラミング / Playwright / Maestro / Git / CIの未説明知識を前提にしないよう固定した。
  - Final Fresh Learner Reviewに`PASS` / `FAIL` / `not_validated`の結果区分を追加し、Common Core Required exerciseがEnvironment blockで未実行ならPASSにしない契約へ変更した。
  - Native specialization等の任意pathは全体結果と分離して`validated` / `not_validated`を記録するようにした。
  - TASKSへD47〜D50を追加し、Run `PLAN.md` / `run.json`を同じ契約へ整合した。
- Validation:
  - 今回はMaster Plan / Run Artifactのplanning文書だけを変更した。
  - Curriculum本体、Instructor Reference本体、Rubric本体、Training implementation、RA-M7実コードは変更していない。
  - `validate:curriculum` / `test:contracts` / `typecheck` / `format:check` / `lint:markdown` / Sanitizer Write・Checkはまだ未実行。
  - Step 0未完了のためactive Run statusは`pending`を維持する。
- Remaining:
  - Step 0: RA-M7 required pathの最小実修正。
  - Step 0 local validation / Sanitizer / PR-ready diff確認。
  - Master Plan publication PRのfinal head CI / review / merge-ready確認。
- Decision:
  - 自己学習品質の判定基準は、環境支援を許容しつつ未検証をPASSにせず、対象受講者の知識レベルと自己確認の具体性まで含む形で確定した。
- Progress: 92% (55/60)

## 2026-08-27 08:33 (JST)

- Summary:
  - 最新 `main` 取り込み後の PR #61（`plan/curriculum-test-strategy-remediation-master`）で Step 0 の Current State を確認した。
  - RA-M7 の filename mismatch は現行 branch には残っておらず、`scripts/validate-curriculum.ts` は既に canonical filename を要求していたため、no-op diff を作らず既存状態を採用した。
- Current State / Search:
  - `docs/curriculum/test-automation/00_learning-design.md` は存在し、underscore 形式の Curriculum file は存在しない。
  - `scripts/validate-curriculum.ts:10` は `00_learning-design.md` を要求している。Git blame と文字列履歴でも、validator の初期実装時から hyphen 形式だった。
  - `tests/contracts/training-curriculum.test.ts` は `validateCurriculum(process.cwd())` を通じて契約を検証しており、`00_learning_design.md` の direct wrong literal は存在しない。
  - `rg -n --hidden --glob '!.git/**' '00_learning_design\\.md|00_learning-design\\.md' .` で確認した underscore 形式は、Master Plan / 過去 Run Report の mismatch 説明に限られ、consumer code の参照ではなかった。
- Changes:
  - `scripts/validate-curriculum.ts`: 変更なし。既に `00_learning-design.md` が canonical だったため。
  - `tests/contracts/training-curriculum.test.ts`: 変更なし。direct wrong literal が存在しなかったため。
  - Active Run の `PLAN.md` / `TASKS.md` / `REPORT.md` / `run.json` を実状態と local validation 結果へ更新した。
- Validation:
  - `pnpm run validate:curriculum` — PASS（22 required documents、4 workbook files、training-chromium / training-mobile-chromium）。
  - `pnpm run test:contracts` — PASS（30 files、428 tests）。
  - `pnpm run typecheck` — PASS。
  - `pnpm run format:check` — PASS。
  - `pnpm run lint:markdown` — PASS（338 files、0 issues）。
  - 実行環境: Node `v24.12.0`、pnpm `9.10.0`（`packageManager: pnpm@9.10.0`）。
- Scope:
  - RA-M7 以外の remediation、Curriculum semantic change、Curriculum file rename、validator refactor、contract test追加、Product behavior、Formal Test、Product CI、dependency更新は実施していない。
  - PR #61 は既存のため、PR作成・close・merge・pushを行っていない。Git は read-only 確認のみ実行した。
- Remaining:
  - Run Artifact 更新後の Sanitizer Write / Check と最終 `format:check` / `lint:markdown` を実行する。
  - このローカル Run Artifact 更新を反映した final PR head の CI / review確認、必要時の bounded repair、Run Artifact finalization、merge-ready確認は未完了であり、`run.json.status` は `pending` のままにする。
- Progress: 98% (59/60)

## 2026-08-27 08:37 (JST)

- Validation:
  - Run Artifact更新後の `pnpm run format:check` — PASS（全ファイルが Prettier code style に一致）。
  - Run Artifact更新後の `pnpm run lint:markdown` — PASS（338 files、0 issues）。
  - 最終 `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/sanitize-codex-artifacts.ps1 -Path .codex/runs/20260824-201800-JST -Check` — PASS（4 files scanned、0 residual findings）。
- Remaining:
  - 上記 local gate と Sanitizer は完了した。今回の未push Run Artifact更新を含む final PR head の CI / review確認、必要時の bounded repair、Run Artifactのfinal head最終化、merge-ready確認は未完了であるため、`run.json.status` は `pending` のままにする。
- Progress: 98% (59/60)

## 2026-08-27 08:36 (JST)

- Summary:
  - Active Run の更新後に Codex Run Artifact Sanitizer を実行し、Run Artifact の path sanitization 状態を確認した。
- Validation:
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/sanitize-codex-artifacts.ps1 -Path .codex/runs/20260824-201800-JST -Write` — PASS（4 files scanned、0 changed、0 residual findings）。
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/sanitize-codex-artifacts.ps1 -Path .codex/runs/20260824-201800-JST -Check` — PASS（4 files scanned、0 residual findings）。
  - Run Artifact更新後の最終 `pnpm run format:check`、`pnpm run lint:markdown`、Sanitizer Check はこの記録後に実行する。
- Remaining:
  - final PR head の CI / review確認、必要時の bounded repair、Run Artifact の final head 最終化、merge-ready確認は未完了であり、`run.json.status` は `pending` のままにする。
- Progress: 98% (59/60)

## 2026-08-27 08:39 (JST)

- Validation:
  - 最終確認 `pnpm run format:check` — PASS。
  - 最終確認 `pnpm run lint:markdown` — PASS（338 files、0 issues）。
  - 最終確認 `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/sanitize-codex-artifacts.ps1 -Path .codex/runs/20260824-201800-JST -Check` — PASS（4 files scanned、0 residual findings）。
- Decision:
  - 最終確認後は追加のファイル修正を行わない。RA-M7のconsumer codeは既にcanonicalだったため、source / contract test diffはない。
- Remaining:
  - 未push Run Artifact更新を含む final PR head の CI / review確認、必要時の bounded repair、Run Artifactのfinal head最終化、merge-ready確認。これらが未完了のため `run.json.status` は `pending` のままとする。
- Progress: 98% (59/60)

## 2026-08-27 08:42 (JST)

- Changes:
  - Master Plan の Current understanding と Step 0 action に残っていた、現行実装と矛盾する underscore filename の説明を canonical hyphen filename へ訂正した。
  - 過去の Report entry は append-only 契約に従い変更していない。
- Scope:
  - 変更は既存 Master Plan の事実記述2箇所に限定した。Curriculum、validator構造、contract test、Product behavior、Formal Test、Product CIは変更していない。
- Validation:
  - Master Plan変更後の `pnpm run format:check`、`pnpm run lint:markdown`、Sanitizer Check はこの記録後に最終実行する。
- Remaining:
  - 未push Run Artifact更新を含む final PR head の CI / review確認、必要時の bounded repair、Run Artifactのfinal head最終化、merge-ready確認。`run.json.status` は `pending` のままとする。
- Progress: 98% (59/60)

## 2026-08-27 08:59 (JST)

- Validation:
  - Master Plan訂正後の最終 `pnpm run format:check` — PASS。
  - Master Plan訂正後の最終 `pnpm run lint:markdown` — PASS（338 files、0 issues）。
  - Master Plan訂正後の最終 `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/sanitize-codex-artifacts.ps1 -Path .codex/runs/20260824-201800-JST -Check` — PASS（4 files scanned、0 residual findings）。
- Decision:
  - 最終確認後は追加のファイル修正を行わない。RA-M7 consumer codeは既にcanonicalであり、contract testにも誤 literalはない。
- Remaining:
  - 未push Run Artifact更新を含む final PR head の CI / review確認、必要時の bounded repair、Run Artifactのfinal head最終化、merge-ready確認。未完了のため `run.json.status` は `pending` のままとする。
- Progress: 98% (59/60)
