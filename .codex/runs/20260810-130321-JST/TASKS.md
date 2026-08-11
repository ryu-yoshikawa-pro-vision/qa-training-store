# Tasks

## Now

- 実行順に並べる（上から順に処理）
- [x] 1. PLANを確定する
- [x] 2. PR本文・添付指示・CodeRabbit現行コメント・repo docsを突合する
- [x] 3. P0 contract / isolation / Preparation / Runner / Evaluatorを修正する
- [x] 4. P1/P2 Benchmark / Snapshot / Spec / CLI / Challenge / 文書を修正する
- [x] 5. fail-close契約テストと3 Challenge Preparationを実行する
- [x] 6. 全Validation、scope監査、Run Artifact追記、Sanitizer、完了判定を行う

## Discovered

- [x] 7. Skill-first ArchitectureとAGENTS／QA入口を同期する
- [x] 8. Preparation callback／runtime handoffを削除し、Contract Fixtureをrenameする
- [x] 9. ADR／Plan／Workflow／Curriculum／Project Contextを責務境界へ同期する
- [x] 10. Architecture correctionの全Validation、scope監査、Sanitizer、完了判定を行う
- [x] 11. Skill-first実行可能性、pnpm依存トポロジー、既存charter budget、Benchmark Revision境界を修正する
- [x] 12. 修正後のPreparation、focused／全Contract、必須品質ゲート、scope監査、Run Artifact Sanitizerを実行する
- [x] 13. Expo SDK 57のpatch依存をCI要求へ揃え、lockfileと`expo-doctor`を再検証する
- [ ] 14. 全品質ゲート／テスト、範囲外Failure調査、文書、scope監査、Run Artifact Sanitizerを完了する
- [x] 15. PR #16 Phase 1 CIのContract／Runtime Preparation分離、Required Chromium接続、検証、Run Artifact追記を完了する
- 作業中に発見したタスクはここに追記する（セッション内で増える前提）

## Blocked

- B1 / D1。Official model-backed Runner実行基盤は利用できない。Foundation全体のOfficial Scored Runは未実行であり、未実行をPASS扱いしない。Repair implementation／local validationの完了とは分離する。Blockedは進捗分母へ含めない。

## Latest Iteration

- 2026-08-10 18:14 JST: 最終修正（Forbidden Probe completeness／run_id contract）を実装し、必須validationと`pnpm run verify`をPASSした。Official model-backed Runnerは引き続きBlocked／未実行。
- 2026-08-10 19:39 JST: Trust Boundary残課題4件（Canonical Forbidden Set、実Profile bytes revision再検証、Fresh Session invariant、unmeasured Tool Scope test isolation）を修正し、focused 25 tests／全Contract 24 files・198 tests／`pnpm run verify`をPASSした。Official model-backed Runnerは引き続きBlocked／未実行。
- 2026-08-10 21:29 JST: Skill-first + Harness-backed Architecture correctionを実装し、callback／runtime handoff削除、Contract Fixture rename、Skill routing／Workflow／ADR／Plan／Project Context同期、focused 26 tests、全Contract 24 files・199 tests、`pnpm run verify`をPASSした。Official model-backed Runnerは引き続きBlocked／未実行。
- 2026-08-10 23:13 JST: 最新PR #16指示のCI／実行可能性修正（root `node_modules` junction、`--preserve-symlinks-main`、Normal／Gray charter bootstrap、`exploration_budget`、BEFORE／AFTER snapshot順、Runner Profile除外）を実装し、focused 29 tests、全Contract 24 files・202 tests、`pnpm run verify`（exit 0）をPASSした。Official model-backed Scored E2Eは引き続き`BLOCKED / DEFERRED / NOT EXECUTED`。
- 2026-08-11 06:14 JST: Expo DoctorのCI failureを再現し、Expo SDK 57の7件のpatch依存と`expo-constants` overrideを更新、lockfileを再生成した。`pnpm exec expo install --check`はPASSし、npm warningを抑えたCI相当の`expo-doctor`は17/17 PASSした。範囲外Failureも調査・記録する完了報告契約を`docs/PROJECT_CONTEXT.md`と`docs/history/`へ追記した。全品質ゲート／テストの再実行は継続中。
- 2026-08-11 07:08 JST: `pnpm run verify`のNative Jest／Contract Preparation timeoutを調査し、対象単独・全Suiteの再検証でPASS。Native static、CI相当Web E2E、UI Review、extended E2E、production artifact smokeもPASS。RunbookのDoctor／preflightはPASSし、ローカルNative Build／実機Flowを継続する。
- Progress: 93% (13/14)
- 2026-08-11 08:12 JST: 最終状態で`pnpm run verify`を再実行しexit 0（605.4秒）。Contract 24 files／202 tests、Native Jest 12 suites／47 tests、Web build 2297 modules、Spec build 21 pages、lint 0 errors／65 warnings。Agentic QA contract、Native route、EAS configもPASS。Expo Doctor CI相当17/17 PASS、Android Build／Install／Smoke／Gate 1／Runtime 5/5／Boundary 5/5／Search（LatinIME制御下）もPASSした。追加Review Flowはbaseline selectorで2回、限定修正2回を検証したがPASSせず、Maestro可視判定境界として停止・記録した。現時点ではReview Flowを含む全物理端末FlowのPASSを確認できていないため、task 14は未完了のまま保持する。
- Progress: 93% (13/14)
- 2026-08-11 10:08 JST: PR #16 Phase 1 CI修正として、実Preparation testをContract Suiteから`tests/runtime/agentic-qa-preparation.test.ts`へ分離し、専用scriptを追加、既存Required Chromium E2Eのinstall直後へ接続した。BrowserなしContract 24 files／201 testsと最終`pnpm run verify`はPASS。Runtime専用testはChromium起動後の`No routes found`／`__TEST_API__` timeoutがWindows disposable Expo Router resolutionで再現したため、`prepareChallenge`本体へは変更を広げず残差として記録した。
- Progress: 93% (14/15)
