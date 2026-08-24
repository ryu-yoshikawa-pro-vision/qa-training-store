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
