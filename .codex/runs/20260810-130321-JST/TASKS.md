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
- 作業中に発見したタスクはここに追記する（セッション内で増える前提）

## Blocked

- B1 / D1。Official model-backed Runner実行基盤は利用できない。Foundation全体のOfficial Scored Runは未実行であり、未実行をPASS扱いしない。Repair implementation／local validationの完了とは分離する。Blockedは進捗分母へ含めない。

## Latest Iteration

- 2026-08-10 18:14 JST: 最終修正（Forbidden Probe completeness／run_id contract）を実装し、必須validationと`pnpm run verify`をPASSした。Official model-backed Runnerは引き続きBlocked／未実行。
- 2026-08-10 19:39 JST: Trust Boundary残課題4件（Canonical Forbidden Set、実Profile bytes revision再検証、Fresh Session invariant、unmeasured Tool Scope test isolation）を修正し、focused 25 tests／全Contract 24 files・198 tests／`pnpm run verify`をPASSした。Official model-backed Runnerは引き続きBlocked／未実行。
- 2026-08-10 21:29 JST: Skill-first + Harness-backed Architecture correctionを実装し、callback／runtime handoff削除、Contract Fixture rename、Skill routing／Workflow／ADR／Plan／Project Context同期、focused 26 tests、全Contract 24 files・199 tests、`pnpm run verify`をPASSした。Official model-backed Runnerは引き続きBlocked／未実行。
