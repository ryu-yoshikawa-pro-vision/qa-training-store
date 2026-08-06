# Tasks

## Now
- [x] 1. 現在のBranch／HEAD／変更状態を記録し、指定入口資料とRepair Loopを読む
- [x] 2. PLAN、allowed_files、仮説、完了条件を確定する
- [x] 3. 共通サニタイザーContext／Variant／再帰Value／Residual検査を実装する
- [x] 4. `sanitize-codex-artifacts.ps1` のWrite／Check CLIとAtomic UTF-8置換を実装する
- [x] 5. `codex-task.ps1` のLog／Report／Manifest書込み前処理とRun終了最終ゲートを統合する
- [x] 6. PowerShell Fixture Testを追加し、指定20契約を検証する
- [x] 7. Vitest Contract Testを追加し、CI WorkflowへFixture／Changed Artifact Checkを接続する
- [x] 8. AGENTS／Repair Loop／Project Context／ADRへ運用契約を記録する
- [x] 9. Fixture／Contract／Format／Lint／Typecheck／既存Contract／必要なverifyを実行する
- [x] 10. 過去RunをCheckのみで検査し、今回RunをWrite+Checkで確定する
- [x] 11. REPORT／evaluation／run.jsonを更新し、Git status／diff checkと残課題を報告する

## Discovered
- [x] D1. CIでBaseとの差分を安全に列挙するため、checkout depthと変更ファイル削除時の扱いを確認する
- [x] D2. 既存Runの残存件数・影響Run数・推定移行差分を計測する（既存Runは変更しない）
- 発見タスクはこの節へ追記する。

## Blocked
- なし
