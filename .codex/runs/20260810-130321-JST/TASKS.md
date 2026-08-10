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

- 作業中に発見したタスクはここに追記する（セッション内で増える前提）

## Blocked

- B1 / D1。Official model-backed Runner実行基盤は利用できない。Foundation全体のOfficial Scored Runは未実行であり、未実行をPASS扱いしない。Repair implementation／local validationの完了とは分離する。Blockedは進捗分母へ含めない。

## Latest Iteration

- 2026-08-10 18:14 JST: 最終修正（Forbidden Probe completeness／run_id contract）を実装し、必須validationと`pnpm run verify`をPASSした。Official model-backed Runnerは引き続きBlocked／未実行。
