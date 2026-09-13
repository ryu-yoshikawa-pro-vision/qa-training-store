# Tasks

## Now

- 実行順に並べ、完了したtaskだけをチェックする。
- [x] 1. branch / upstream / PR / Issue / main差分 / 作業ツリー / Planを確認する。
- [x] 2. Plan指定の正本資料と変更前測定を確認し、strict Runを初期化する。
- [x] 3. 変更対象、非対象、責務分離、検証順序、停止条件をRun PLANへ確定する。
- [x] 4. `run-artifacts.md`へProgress基本計算を移し、CI連動を重複させない。
- [x] 5. `codex-implementation-harness.md`へfile-changing task / PR / CI lifecycleを移す。
- [x] 6. `repair-loop.md`のRepository固有Shared quality-gate policyを現行意味へ合わせる。
- [x] 7. root `AGENTS.md`を常駐契約・routing・条件付きreference入口へ整理する。
- [x] 8. `.codex/templates/TASKS.md`の旧root詳細依存をreference導線へ置き換える。
- [x] 9. `scripts/verify` / `scripts/verify.ps1`を共通の移管後契約へ更新する。
- [x] 10. 指定ローカル検証、参照整合、scope、差分、サイズ・無条件読み込み量を確認する。
- [x] 11. Run Artifactをfinal commit前状態へ更新し、schema / sanitizer / clean treeを確認する。

## Commit後の完了処理

- branch safetyを確認して対象branchへcommit / pushする。
- PR #147の最新headを確認する。
- 最新headに対する`Web CI` / `Mobile App CI`を確認する。
- 必要なPR本文更新を行う。

## Discovered

- [x] 14. 品質ゲートで判明したPlanのMarkdown違反、移管後の既存assertion不整合、Windows Hook contractのtimeoutを最小修正し、関連検証を再実行する。
- [x] 15. PR #147レビュー指摘3件を修正し、標準検証と最新headの必須CI確認まで完了する。

## Blocked

- なし。
